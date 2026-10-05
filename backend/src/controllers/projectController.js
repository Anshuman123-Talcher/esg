const prisma = require('../config/prisma');

class ProjectController {
  async getProjects(req, res, next) {
    try {
      const { subsidiaryId, buId, scope, status, year = 'FY 2025-26' } = req.query;

      let where = { reportingYear: year };

      // Role check: Sub-Admin strictly locked to their subsidiary
      if (req.user.role === 'SUB_ADMIN') {
        where.subsidiaryId = req.user.subsidiaryId;
      } else if (subsidiaryId && subsidiaryId !== 'all') {
        where.subsidiaryId = subsidiaryId;
      }

      if (buId && buId !== 'all') {
        where.buId = buId;
      }

      if (scope === 'domestic') {
        where.isInternational = false;
      } else if (scope === 'international') {
        where.isInternational = true;
      }

      if (status && status !== 'all') {
        where.submissionStatus = status;
      }

      const projects = await prisma.project.findMany({
        where,
        include: {
          subsidiary: { select: { id: true, name: true, code: true } },
          businessUnit: { select: { id: true, name: true, code: true } },
          emissions: { where: { reportingYear: year } }
        },
        orderBy: { name: 'asc' }
      });

      return res.json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  }

  async getProjectById(req, res, next) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          subsidiary: true,
          businessUnit: true,
          emissions: true,
          fuelRecords: true,
          electricityRecs: true,
          evidenceDocs: true
        }
      });

      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== project.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: You cannot view projects of another subsidiary.' });
      }

      return res.json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  async createProject(req, res, next) {
    try {
      const {
        id,
        name,
        code,
        buId,
        subsidiaryId,
        country = 'India',
        state,
        city,
        location,
        latitude = 17.3850,
        longitude = 78.4867,
        projectType = 'Infrastructure',
        reportingYear = 'FY 2025-26',
        isInternational = false,
        client,
        valueCr
      } = req.body;

      // 1. Authoritative subsidiary derivation (never trust client for Sub-Admin)
      const effectiveSubId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (subsidiaryId || req.user.subsidiaryId);

      if (!effectiveSubId) {
        return res.status(400).json({ success: false, message: 'Subsidiary ID is required to register a project.' });
      }

      // 2. Validate Project <-> Business Unit relationship (Requirement 10)
      const businessUnit = await prisma.businessUnit.findUnique({
        where: { id: buId }
      });

      if (!businessUnit) {
        return res.status(400).json({
          success: false,
          message: `Business Unit '${buId}' does not exist.`
        });
      }

      if (businessUnit.subsidiaryId !== effectiveSubId) {
        return res.status(400).json({
          success: false,
          message: `Cross-entity violation: Business Unit '${buId}' belongs to subsidiary '${businessUnit.subsidiaryId}', not project's target subsidiary '${effectiveSubId}'.`
        });
      }

      // 3. Create project with explicit whitelisted fields
      const projectId = id || `proj-${Date.now().toString(36)}`;
      const created = await prisma.project.create({
        data: {
          id: projectId,
          subsidiaryId: effectiveSubId,
          buId,
          name,
          code,
          country,
          state,
          city,
          location,
          latitude: Number(latitude) || 17.3850,
          longitude: Number(longitude) || 78.4867,
          projectType,
          reportingYear,
          isInternational: Boolean(isInternational),
          client,
          valueCr: valueCr !== undefined ? Number(valueCr) : null
        },
        include: { subsidiary: true, businessUnit: true }
      });

      // 4. Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: created.subsidiaryId,
          action: 'CREATE',
          entity: 'Project',
          entityId: created.id,
          details: `Registered new project ${created.name} (${created.code}) under BU ${businessUnit.name}`
        }
      });

      return res.status(201).json({ success: true, data: created, message: 'Project registered successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async updateProject(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await prisma.project.findUnique({ where: { id } });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      // Verify subsidiary ownership
      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== existing.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: You cannot edit projects from another subsidiary.' });
      }

      const {
        name,
        code,
        buId,
        country,
        state,
        city,
        location,
        latitude,
        longitude,
        projectType,
        projectStatus,
        reportingYear,
        isInternational,
        safetyIncidents,
        client,
        valueCr
      } = req.body;

      // 1. If buId is being updated, validate Project <-> BU relationship (Requirement 10)
      if (buId && buId !== existing.buId) {
        const newBu = await prisma.businessUnit.findUnique({ where: { id: buId } });
        if (!newBu) {
          return res.status(400).json({ success: false, message: `Target Business Unit '${buId}' does not exist.` });
        }
        if (newBu.subsidiaryId !== existing.subsidiaryId) {
          return res.status(400).json({
            success: false,
            message: `Cross-entity violation: Target Business Unit '${buId}' belongs to subsidiary '${newBu.subsidiaryId}', not project subsidiary '${existing.subsidiaryId}'.`
          });
        }
      }

      // 2. Explicit field whitelisting (Prevents ownership / subsidiary / approval tampering)
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (buId !== undefined) updateData.buId = buId;
      if (country !== undefined) updateData.country = country;
      if (state !== undefined) updateData.state = state;
      if (city !== undefined) updateData.city = city;
      if (location !== undefined) updateData.location = location;
      if (latitude !== undefined) updateData.latitude = Number(latitude);
      if (longitude !== undefined) updateData.longitude = Number(longitude);
      if (projectType !== undefined) updateData.projectType = projectType;
      if (projectStatus !== undefined) updateData.projectStatus = projectStatus;
      if (reportingYear !== undefined) updateData.reportingYear = reportingYear;
      if (isInternational !== undefined) updateData.isInternational = Boolean(isInternational);
      if (safetyIncidents !== undefined) updateData.safetyIncidents = Number(safetyIncidents);
      if (client !== undefined) updateData.client = client;
      if (valueCr !== undefined) updateData.valueCr = Number(valueCr);

      const updated = await prisma.project.update({
        where: { id },
        data: updateData,
        include: { subsidiary: true, businessUnit: true }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: existing.subsidiaryId,
          action: 'UPDATE',
          entity: 'Project',
          entityId: id,
          details: `Updated project properties for ${updated.name} (${updated.code})`
        }
      });

      return res.json({ success: true, data: updated, message: 'Project updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async deleteProject(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await prisma.project.findUnique({ where: { id } });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== existing.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: You cannot delete projects belonging to another subsidiary.' });
      }

      await prisma.project.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: existing.subsidiaryId,
          action: 'DELETE',
          entity: 'Project',
          entityId: id,
          details: `Deleted project ${existing.name} (${existing.code})`
        }
      });

      return res.json({ success: true, message: 'Project deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectController();
