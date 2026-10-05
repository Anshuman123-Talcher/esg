const prisma = require('../config/prisma');

class SdgController {
  async getSdgs(req, res, next) {
    try {
      const sdgs = await prisma.sdgTarget.findMany({
        orderBy: { id: 'asc' }
      });
      return res.json({ success: true, data: sdgs });
    } catch (err) {
      next(err);
    }
  }

  async getContributions(req, res, next) {
    try {
      const { year = 'FY 2025-26', subsidiaryId, sdgNumber, status } = req.query;

      let where = { reportingYear: year };

      if (req.user.role === 'SUB_ADMIN') {
        where.subsidiaryId = req.user.subsidiaryId;
      } else if (subsidiaryId && subsidiaryId !== 'all') {
        where.subsidiaryId = subsidiaryId;
      }

      if (sdgNumber && sdgNumber !== 'all') {
        where.sdgNumber = Number(sdgNumber);
      }

      if (status && status !== 'all') {
        where.status = status;
      }

      const contributions = await prisma.sdgContribution.findMany({
        where,
        include: {
          subsidiary: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, name: true, code: true } },
          sdg: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ success: true, data: contributions });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Save SDG Contribution (Requirement 12: No blind upsert, strictly verify ownership)
   */
  async saveContribution(req, res, next) {
    try {
      const {
        id,
        subsidiaryId,
        projectId,
        sdgNumber,
        reportingYear = 'FY 2025-26',
        initiativeName,
        description,
        kpi,
        baseline = 0.0,
        currentValue = 0.0,
        targetValue = 100.0,
        progressPct = 0.0,
        unit,
        evidenceId
      } = req.body;

      if (id) {
        // 1. Retrieve existing record first
        const existing = await prisma.sdgContribution.findUnique({
          where: { id }
        });

        if (!existing) {
          return res.status(404).json({ success: false, message: 'SDG contribution record not found.' });
        }

        // 2. Strict ownership verification
        if (req.user.role === 'SUB_ADMIN' && existing.subsidiaryId !== req.user.subsidiaryId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You cannot modify SDG contributions belonging to another subsidiary.'
          });
        }

        // 3. Project relationship verification if updating project
        if (projectId && projectId !== existing.projectId) {
          const project = await prisma.project.findUnique({ where: { id: projectId } });
          if (!project || project.subsidiaryId !== existing.subsidiaryId) {
            return res.status(400).json({
              success: false,
              message: 'Invalid project: Specified project does not belong to your subsidiary.'
            });
          }
        }

        // 4. Whitelisted update (disallows tampering with subsidiaryId, status, or approvals)
        const updated = await prisma.sdgContribution.update({
          where: { id },
          data: {
            sdgNumber: sdgNumber ? Number(sdgNumber) : existing.sdgNumber,
            initiativeName: initiativeName || existing.initiativeName,
            description: description || existing.description,
            kpi: kpi || existing.kpi,
            baseline: baseline !== undefined ? Number(baseline) : existing.baseline,
            currentValue: currentValue !== undefined ? Number(currentValue) : existing.currentValue,
            targetValue: targetValue !== undefined ? Number(targetValue) : existing.targetValue,
            progressPct: progressPct !== undefined ? Number(progressPct) : existing.progressPct,
            unit: unit !== undefined ? unit : existing.unit,
            projectId: projectId !== undefined ? projectId : existing.projectId,
            evidenceId: evidenceId !== undefined ? evidenceId : existing.evidenceId,
            submittedBy: req.user.name
          }
        });

        await prisma.auditLog.create({
          data: {
            actor: req.user.name,
            role: req.user.role,
            userId: req.user.id,
            subsidiaryId: existing.subsidiaryId,
            action: 'UPDATE',
            entity: 'SdgContribution',
            entityId: id,
            details: `Updated SDG ${updated.sdgNumber} contribution: "${updated.initiativeName}"`
          }
        });

        return res.json({ success: true, data: updated, message: 'SDG Contribution updated successfully.' });
      }

      // Create new record
      const effectiveSubId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (subsidiaryId || req.user.subsidiaryId);
      if (!effectiveSubId) {
        return res.status(400).json({ success: false, message: 'Subsidiary ID is required.' });
      }

      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.subsidiaryId !== effectiveSubId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid project: Specified project does not belong to your subsidiary.'
          });
        }
      }

      const created = await prisma.sdgContribution.create({
        data: {
          subsidiaryId: effectiveSubId,
          projectId: projectId || null,
          sdgNumber: Number(sdgNumber),
          reportingYear,
          initiativeName,
          description,
          kpi,
          baseline: Number(baseline) || 0.0,
          currentValue: Number(currentValue) || 0.0,
          targetValue: Number(targetValue) || 100.0,
          progressPct: Number(progressPct) || 0.0,
          unit: unit || '',
          evidenceId: evidenceId || null,
          status: 'Draft',
          submittedBy: req.user.name
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: effectiveSubId,
          action: 'CREATE',
          entity: 'SdgContribution',
          entityId: created.id,
          details: `Registered new SDG ${created.sdgNumber} contribution: "${created.initiativeName}"`
        }
      });

      return res.status(201).json({ success: true, data: created, message: 'SDG Contribution saved.' });
    } catch (err) {
      next(err);
    }
  }

  async approveContribution(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Admin can approve SDG contributions.' });
      }

      const { id } = req.params;
      const { remarks = 'Approved by Central ESG Committee.' } = req.body;

      const existing = await prisma.sdgContribution.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'SDG contribution record not found.' });
      }

      const record = await prisma.sdgContribution.update({
        where: { id },
        data: {
          status: 'Approved',
          reviewedBy: req.user.name,
          approvalDate: new Date(),
          reviewerNotes: remarks
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: existing.subsidiaryId,
          action: 'APPROVE',
          entity: 'SdgContribution',
          entityId: id,
          details: `Approved SDG ${existing.sdgNumber} contribution "${existing.initiativeName}"`
        }
      });

      return res.json({ success: true, data: record, message: 'SDG Contribution approved.' });
    } catch (err) {
      next(err);
    }
  }

  async requestCorrectionContribution(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Admin can request corrections.' });
      }

      const { id } = req.params;
      const { comment } = req.body;

      const existing = await prisma.sdgContribution.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'SDG contribution record not found.' });
      }

      const record = await prisma.sdgContribution.update({
        where: { id },
        data: {
          status: 'Correction_Required',
          reviewedBy: req.user.name,
          reviewerNotes: comment
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: existing.subsidiaryId,
          action: 'REQUEST_CORRECTION',
          entity: 'SdgContribution',
          entityId: id,
          details: `Requested correction for SDG ${existing.sdgNumber} contribution: "${comment}"`
        }
      });

      return res.json({ success: true, data: record, message: 'Correction requested on SDG Contribution.' });
    } catch (err) {
      next(err);
    }
  }

  async rejectContribution(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Admin can reject SDG contributions.' });
      }

      const { id } = req.params;
      const { reason } = req.body;

      const existing = await prisma.sdgContribution.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'SDG contribution record not found.' });
      }

      const record = await prisma.sdgContribution.update({
        where: { id },
        data: {
          status: 'Rejected',
          reviewedBy: req.user.name,
          reviewerNotes: reason
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: existing.subsidiaryId,
          action: 'REJECT',
          entity: 'SdgContribution',
          entityId: id,
          details: `Rejected SDG ${existing.sdgNumber} contribution: "${reason}"`
        }
      });

      return res.json({ success: true, data: record, message: 'SDG Contribution rejected.' });
    } catch (err) {
      next(err);
    }
  }

  async deleteContribution(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await prisma.sdgContribution.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'SDG contribution record not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && existing.subsidiaryId !== req.user.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      await prisma.sdgContribution.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: existing.subsidiaryId,
          action: 'DELETE',
          entity: 'SdgContribution',
          entityId: id,
          details: `Deleted SDG ${existing.sdgNumber} contribution "${existing.initiativeName}"`
        }
      });

      return res.json({ success: true, message: 'SDG contribution deleted.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SdgController();
