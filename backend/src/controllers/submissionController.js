const prisma = require('../config/prisma');
const consolidationService = require('../services/consolidationService');

/**
 * Normalizes a submission record for consistent frontend display
 * across all views, tables, and KPI metric counters.
 */
function formatSubmission(s) {
  if (!s) return null;

  const normStatus = s.status === 'Correction_Required'
    ? 'Correction Required'
    : (s.status === 'Under_Review' ? 'Under Review' : s.status);

  const buName = s.project?.businessUnit?.name
    || (s.subsidiary?.businessUnits && s.subsidiary.businessUnits[0]?.name)
    || 'All Operational Units';

  return {
    id: s.id,
    subsidiaryId: s.subsidiaryId,
    subsidiaryName: s.subsidiary?.name || s.subsidiaryName || 'Subsidiary',
    subsidiaryCode: s.subsidiary?.code || '',
    businessUnit: buName,
    businessUnitId: s.project?.buId || (s.subsidiary?.businessUnits && s.subsidiary.businessUnits[0]?.id) || null,
    reportingYear: s.reportingYear,
    year: s.reportingYear, // Alias for frontend backward compatibility
    reportType: s.reportType || 'Integrated ESG & BRSR Report',
    status: normStatus,
    rawStatus: s.status,
    submittedBy: s.submittedBy || 'Sub-Company Admin',
    submissionDate: s.submissionDate ? s.submissionDate.toISOString().slice(0, 10) : null,
    submittedAt: s.submissionDate ? s.submissionDate.toISOString().slice(0, 16).replace('T', ' ') : null,
    reviewedBy: s.reviewedBy,
    approvalDate: s.approvalDate ? s.approvalDate.toISOString().slice(0, 10) : null,
    reviewerNotes: s.reviewerNotes,
    esgScore: s.esgScore,
    brsrScore: s.brsrScore,
    lastUpdated: s.lastUpdated ? s.lastUpdated.toISOString().slice(0, 16).replace('T', ' ') : 'Just now',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    subsidiary: s.subsidiary,
    project: s.project,
    reviewerComments: s.reviewerComments || [],
    history: s.history || []
  };
}

class SubmissionController {
  /**
   * GET /api/submissions
   * Role-aware retrieval:
   * - MAIN_ADMIN: Sees submissions across ALL subsidiaries (unless filtered by query)
   * - SUB_ADMIN: Strictly scoped to their authenticated subsidiary
   */
  async getSubmissions(req, res, next) {
    try {
      const { year, subsidiaryId, status } = req.query;

      let where = {};

      // Filter by reporting year if specified and not 'all'
      if (year && year !== 'all') {
        where.reportingYear = year;
      }

      // Role-aware subsidiary scoping
      if (req.user.role === 'SUB_ADMIN') {
        where.subsidiaryId = req.user.subsidiaryId;
      } else if (subsidiaryId && subsidiaryId !== 'all') {
        where.subsidiaryId = subsidiaryId;
      }
      // Note: for MAIN_ADMIN when subsidiaryId is omitted or 'all',
      // where.subsidiaryId is NOT set, retrieving all subsidiaries!

      // Filter by status if specified and not 'all'
      if (status && status !== 'all') {
        if (status === 'pending' || status === 'Pending Review' || status === 'Submitted') {
          where.status = { in: ['Submitted', 'Under_Review'] };
        } else if (status === 'Correction Required' || status === 'Correction_Required') {
          where.status = 'Correction_Required';
        } else if (status === 'Under Review' || status === 'Under_Review') {
          where.status = 'Under_Review';
        } else {
          where.status = status;
        }
      }

      const submissions = await prisma.submission.findMany({
        where,
        include: {
          subsidiary: {
            include: {
              businessUnits: true
            }
          },
          project: {
            include: {
              businessUnit: true
            }
          },
          reviewerComments: { orderBy: { createdAt: 'desc' } },
          history: { orderBy: { changedAt: 'desc' } }
        },
        orderBy: { lastUpdated: 'desc' }
      });

      const formatted = submissions.map(formatSubmission);
      return res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/submissions/:id
   */
  async getSubmissionById(req, res, next) {
    try {
      const { id } = req.params;

      const submission = await prisma.submission.findUnique({
        where: { id },
        include: {
          subsidiary: {
            include: {
              businessUnits: true
            }
          },
          project: {
            include: {
              businessUnit: true
            }
          },
          history: { orderBy: { changedAt: 'desc' } },
          reviewerComments: { orderBy: { createdAt: 'desc' } }
        }
      });

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission record not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== submission.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Forbidden: Access restricted to assigned subsidiary.' });
      }

      return res.json({ success: true, data: formatSubmission(submission) });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/submissions/draft
   * Sub-Company Admin saves local draft to backend PostgreSQL
   */
  async saveDraft(req, res, next) {
    try {
      const { subsidiaryId, year = 'FY 2025-26', reportType = 'Integrated ESG & BRSR Report', esgScore = 70, brsrScore = 65 } = req.body;

      // Authoritative subsidiary: Never trust client-supplied ID for SUB_ADMIN
      const effectiveSubId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (subsidiaryId || 'sub-1');

      let submission = await prisma.submission.findFirst({
        where: { subsidiaryId: effectiveSubId, reportingYear: year },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      if (!submission) {
        const count = await prisma.submission.count();
        const yearSuffix = year.replace(/[^0-9]/g, '').slice(-4) || new Date().getFullYear();
        const id = `SUBM-${yearSuffix}-${String(count + 1).padStart(3, '0')}`;

        submission = await prisma.submission.create({
          data: {
            id,
            subsidiaryId: effectiveSubId,
            reportingYear: year,
            reportType,
            status: 'Draft',
            submittedBy: req.user.name,
            esgScore: Number(esgScore) || 70,
            brsrScore: Number(brsrScore) || 65
          },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });
      } else if (submission.status !== 'Approved' && submission.status !== 'Submitted') {
        submission = await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: 'Draft',
            lastUpdated: new Date()
          },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });
      }

      return res.json({ success: true, data: formatSubmission(submission), message: 'Draft saved successfully in PostgreSQL.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/submissions/submit OR POST /api/submissions/:id/submit
   * Sub-Company Admin Submits ESG Data for Central MEIL Executive Review.
   * Creates or updates the PostgreSQL record with status = 'Submitted'.
   * Creates SubmissionHistory, AuditLog, and Notification for Main Admin.
   */
  async submitForReview(req, res, next) {
    try {
      const { id } = req.params;
      const { year = 'FY 2025-26', reportType = 'Integrated ESG & BRSR Report', notes, esgScore, brsrScore } = req.body;

      // Authoritative subsidiary: Never trust client-supplied subsidiaryId for SUB_ADMIN
      const effectiveSubId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (req.body.subsidiaryId || 'sub-1');

      let submission = null;

      // 1. If an ID was supplied, check if that submission exists
      if (id) {
        submission = await prisma.submission.findUnique({
          where: { id },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });

        if (submission && req.user.role === 'SUB_ADMIN' && submission.subsidiaryId !== req.user.subsidiaryId) {
          return res.status(403).json({ success: false, message: 'Forbidden: Cannot submit for another subsidiary.' });
        }
      }

      // 2. If not found by ID, look up by (subsidiaryId, reportingYear)
      if (!submission) {
        submission = await prisma.submission.findFirst({
          where: { subsidiaryId: effectiveSubId, reportingYear: year },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });
      }

      const previousStatus = submission ? submission.status : 'Draft';
      const now = new Date();

      // 3. Create or update the Submission record in PostgreSQL
      if (!submission) {
        const count = await prisma.submission.count();
        const yearSuffix = year.replace(/[^0-9]/g, '').slice(-4) || now.getFullYear();
        const newId = (id && id.startsWith('SUBM-')) ? id : `SUBM-${yearSuffix}-${String(count + 1).padStart(3, '0')}`;

        submission = await prisma.submission.create({
          data: {
            id: newId,
            subsidiaryId: effectiveSubId,
            reportingYear: year,
            reportType,
            status: 'Submitted',
            submittedBy: req.user.name,
            submissionDate: now,
            lastUpdated: now,
            esgScore: Number(esgScore) || 85.0,
            brsrScore: Number(brsrScore) || 80.0
          },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });
      } else {
        submission = await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: 'Submitted',
            submittedBy: req.user.name,
            submissionDate: now,
            lastUpdated: now,
            ...(esgScore !== undefined ? { esgScore: Number(esgScore) } : {}),
            ...(brsrScore !== undefined ? { brsrScore: Number(brsrScore) } : {})
          },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });
      }

      // 4. Create immutable SubmissionHistory entry
      await prisma.submissionHistory.create({
        data: {
          submissionId: submission.id,
          previousStatus: previousStatus,
          newStatus: 'Submitted',
          changedBy: req.user.name,
          changeNotes: notes || 'Submitted for Central MEIL Executive Admin review.'
        }
      });

      // 5. Create AuditLog
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: effectiveSubId,
          action: 'SUBMIT',
          entity: 'Submission',
          entityId: submission.id,
          details: `Forwarded submission ${submission.id} to Central MEIL Executive Admin for review.`
        }
      });

      // 6. Notification for Main Admins
      const subName = submission.subsidiary?.name || 'Subsidiary';
      await prisma.notification.create({
        data: {
          roleTarget: 'MAIN_ADMIN',
          title: 'New ESG Submission Received',
          message: `New ESG submission received from ${subName} (${submission.reportingYear}) by ${req.user.name}.`,
          type: 'info',
          linkUrl: 'submissions'
        }
      });

      return res.json({
        success: true,
        data: formatSubmission(submission),
        message: `Submission ${submission.id} successfully recorded in PostgreSQL and forwarded for central review.`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/submissions/:id/approve
   * Main Company Admin Approves Submission
   * Only approved records roll into consolidated reporting!
   */
  async approveSubmission(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin has authority to approve submissions.' });
      }

      const { id } = req.params;
      const { notes = 'Verified and approved by Central MEIL ESG Committee.' } = req.body;

      const submission = await prisma.submission.findUnique({
        where: { id },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found in PostgreSQL.' });
      }

      const now = new Date();
      const updated = await prisma.submission.update({
        where: { id },
        data: {
          status: 'Approved',
          reviewedBy: req.user.name,
          approvalDate: now,
          reviewerNotes: notes,
          lastUpdated: now
        },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      // History
      await prisma.submissionHistory.create({
        data: {
          submissionId: id,
          previousStatus: submission.status,
          newStatus: 'Approved',
          changedBy: req.user.name,
          changeNotes: notes
        }
      });

      // Add Reviewer Comment
      await prisma.reviewerComment.create({
        data: {
          submissionId: id,
          authorId: req.user.id,
          authorName: req.user.name,
          commentText: notes,
          statusTag: 'Approved'
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: submission.subsidiaryId,
          action: 'APPROVE',
          entity: 'Submission',
          entityId: id,
          details: `Approved filing ${id}. Data consolidated into MEIL Group metrics.`
        }
      });

      // Notify Subsidiary Admin
      await prisma.notification.create({
        data: {
          roleTarget: 'SUB_ADMIN',
          subsidiaryId: submission.subsidiaryId,
          title: 'Submission Approved! ✅',
          message: `Your ${submission.reportingYear} sustainability submission has been approved by Central Admin.`,
          type: 'success',
          linkUrl: 'submissions'
        }
      });

      // Trigger automatic consolidation rollup update
      try {
        await consolidationService.runConsolidation(submission.reportingYear, req.user.name);
      } catch (consErr) {
        console.warn('[Consolidation] Automatic rollup notice:', consErr.message);
      }

      return res.json({
        success: true,
        data: formatSubmission(updated),
        message: `Submission ${id} approved in PostgreSQL and rolled into consolidated metrics.`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/submissions/:id/request-correction
   * Main Company Admin Requests Correction
   */
  async requestCorrection(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can request corrections.' });
      }

      const { id } = req.params;
      const { comment } = req.body;

      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Reviewer comment detailing required corrections is mandatory.' });
      }

      const submission = await prisma.submission.findUnique({
        where: { id },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found in PostgreSQL.' });
      }

      const now = new Date();
      const updated = await prisma.submission.update({
        where: { id },
        data: {
          status: 'Correction_Required',
          reviewedBy: req.user.name,
          reviewerNotes: comment,
          lastUpdated: now
        },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      // History
      await prisma.submissionHistory.create({
        data: {
          submissionId: id,
          previousStatus: submission.status,
          newStatus: 'Correction_Required',
          changedBy: req.user.name,
          changeNotes: comment
        }
      });

      // Reviewer Comment
      await prisma.reviewerComment.create({
        data: {
          submissionId: id,
          authorId: req.user.id,
          authorName: req.user.name,
          commentText: comment,
          statusTag: 'Correction Required'
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: submission.subsidiaryId,
          action: 'CORRECTION_REQUESTED',
          entity: 'Submission',
          entityId: id,
          details: `Requested revision on filing ${id}: "${comment}"`
        }
      });

      // Notification for Subsidiary Admin
      await prisma.notification.create({
        data: {
          roleTarget: 'SUB_ADMIN',
          subsidiaryId: submission.subsidiaryId,
          title: 'Correction Required on Submission ⚠️',
          message: `Central Admin requested corrections on ${submission.reportingYear} filing: "${comment}"`,
          type: 'warning',
          linkUrl: 'submissions'
        }
      });

      return res.json({
        success: true,
        data: formatSubmission(updated),
        message: `Correction requested for submission ${id} in PostgreSQL.`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/submissions/:id/reject
   * Main Company Admin Rejects Submission
   */
  async rejectSubmission(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can reject filings.' });
      }

      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Specific rejection justification is mandatory.' });
      }

      const submission = await prisma.submission.findUnique({
        where: { id },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found in PostgreSQL.' });
      }

      const now = new Date();
      const updated = await prisma.submission.update({
        where: { id },
        data: {
          status: 'Rejected',
          reviewedBy: req.user.name,
          reviewerNotes: reason,
          lastUpdated: now
        },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      await prisma.submissionHistory.create({
        data: {
          submissionId: id,
          previousStatus: submission.status,
          newStatus: 'Rejected',
          changedBy: req.user.name,
          changeNotes: reason
        }
      });

      await prisma.reviewerComment.create({
        data: {
          submissionId: id,
          authorId: req.user.id,
          authorName: req.user.name,
          commentText: reason,
          statusTag: 'Rejected'
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: submission.subsidiaryId,
          action: 'REJECT',
          entity: 'Submission',
          entityId: id,
          details: `Rejected submission ${id}. Reason: "${reason}"`
        }
      });

      await prisma.notification.create({
        data: {
          roleTarget: 'SUB_ADMIN',
          subsidiaryId: submission.subsidiaryId,
          title: 'Submission Rejected ❌',
          message: `Filing ${id} was rejected: "${reason}"`,
          type: 'danger',
          linkUrl: 'submissions'
        }
      });

      return res.json({
        success: true,
        data: formatSubmission(updated),
        message: `Submission ${id} rejected in PostgreSQL. Excluded from consolidated reporting.`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/submissions/:id/resubmit OR POST /api/submissions/resubmit
   * Sub-Company Admin Resubmits Corrected Data
   */
  async resubmit(req, res, next) {
    try {
      const { id } = req.params;
      const { year = 'FY 2025-26', reportType = 'Integrated ESG & BRSR Report', notes, esgScore, brsrScore } = req.body;

      const effectiveSubId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (req.body.subsidiaryId || 'sub-1');

      let submission = null;
      if (id) {
        submission = await prisma.submission.findUnique({
          where: { id },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });

        if (submission && req.user.role === 'SUB_ADMIN' && submission.subsidiaryId !== req.user.subsidiaryId) {
          return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
        }
      }

      if (!submission) {
        submission = await prisma.submission.findFirst({
          where: { subsidiaryId: effectiveSubId, reportingYear: year },
          include: {
            subsidiary: { include: { businessUnits: true } },
            project: { include: { businessUnit: true } }
          }
        });
      }

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission record to resubmit was not found in PostgreSQL.' });
      }

      const previousStatus = submission.status;
      const now = new Date();

      const updated = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: 'Submitted',
          submittedBy: req.user.name,
          submissionDate: now,
          lastUpdated: now,
          ...(esgScore !== undefined ? { esgScore: Number(esgScore) } : {}),
          ...(brsrScore !== undefined ? { brsrScore: Number(brsrScore) } : {})
        },
        include: {
          subsidiary: { include: { businessUnits: true } },
          project: { include: { businessUnit: true } }
        }
      });

      await prisma.submissionHistory.create({
        data: {
          submissionId: submission.id,
          previousStatus: previousStatus,
          newStatus: 'Submitted',
          changedBy: req.user.name,
          changeNotes: notes || 'Resubmitted after addressing reviewer remarks.'
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: submission.subsidiaryId,
          action: 'RESUBMIT',
          entity: 'Submission',
          entityId: submission.id,
          details: `Resubmitted revised filing ${submission.id}.`
        }
      });

      const subName = submission.subsidiary?.name || 'Subsidiary';
      await prisma.notification.create({
        data: {
          roleTarget: 'MAIN_ADMIN',
          title: 'Revised Submission Received',
          message: `${req.user.name} resubmitted ${subName} (${submission.reportingYear}) with requested corrections.`,
          type: 'info',
          linkUrl: 'submissions'
        }
      });

      return res.json({
        success: true,
        data: formatSubmission(updated),
        message: `Submission ${submission.id} resubmitted in PostgreSQL for verification.`
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SubmissionController();
