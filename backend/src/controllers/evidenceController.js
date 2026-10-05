const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const storageService = require('../services/storageService');
const { UPLOAD_DIR } = require('../config/env');

class EvidenceController {
  /**
   * Get Evidence Document Metadata (Authenticated & Scope-Checked)
   * GET /api/evidence/:id
   */
  async getEvidence(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await prisma.evidenceDocument.findUnique({
        where: { id },
        include: {
          subsidiary: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, name: true, code: true } },
          submission: { select: { id: true, status: true, reportingYear: true } },
          extractions: {
            include: {
              extractedFields: true
            },
            orderBy: { createdAt: 'desc' }
          },
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Evidence document not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== doc.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: You cannot view evidence from another subsidiary.' });
      }

      // Check if duplicate of another document or if other documents duplicate this
      let duplicateDoc = null;
      if (doc.fileHash) {
        duplicateDoc = await prisma.evidenceDocument.findFirst({
          where: {
            fileHash: doc.fileHash,
            id: { not: doc.id }
          },
          select: {
            id: true,
            originalName: true,
            uploadedBy: true,
            subsidiaryId: true,
            createdAt: true,
            subsidiary: { select: { name: true } }
          }
        });
      }

      return res.json({
        success: true,
        data: {
          ...doc,
          duplicateMatch: duplicateDoc
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List Evidence Documents (Authoritative & Subsidiary Scoped)
   * GET /api/evidence
   */
  async listEvidence(req, res, next) {
    try {
      const { subsidiaryId, projectId, submissionId, year = 'FY 2025-26', reviewStatus } = req.query;

      let where = {};

      if (year && year !== 'all') {
        where.reportingYear = year;
      }

      // Strictly lock Sub-Admin to their own subsidiary
      if (req.user.role === 'SUB_ADMIN') {
        where.subsidiaryId = req.user.subsidiaryId;
      } else if (subsidiaryId && subsidiaryId !== 'all') {
        where.subsidiaryId = subsidiaryId;
      }

      if (projectId && projectId !== 'all') {
        where.projectId = projectId;
      }

      if (submissionId && submissionId !== 'all') {
        where.submissionId = submissionId;
      }

      if (reviewStatus && reviewStatus !== 'all') {
        where.reviewStatus = reviewStatus;
      }

      const docs = await prisma.evidenceDocument.findMany({
        where,
        include: {
          subsidiary: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, name: true, code: true } },
          submission: { select: { id: true, status: true, reportingYear: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ success: true, data: docs });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all Evidence Documents linked to a specific Submission
   * GET /api/submissions/:id/evidence
   */
  async getSubmissionEvidence(req, res, next) {
    try {
      const { id } = req.params;

      const submission = await prisma.submission.findUnique({
        where: { id },
        include: { subsidiary: true }
      });

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== submission.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: Access restricted to authorized subsidiary.' });
      }

      // Fetch evidence directly linked to submission, or matching subsidiary + reportingYear
      const docs = await prisma.evidenceDocument.findMany({
        where: {
          OR: [
            { submissionId: id },
            {
              subsidiaryId: submission.subsidiaryId,
              reportingYear: submission.reportingYear
            }
          ]
        },
        include: {
          subsidiary: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, name: true, code: true } },
          extractions: {
            include: {
              extractedFields: true
            },
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        submissionId: id,
        count: docs.length,
        data: docs
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Authenticated Evidence File Stream (Requirement 8, 14, 15)
   * GET /api/evidence/:id/file
   * Supports ?download=true for force download, otherwise inline preview
   */
  async getFile(req, res, next) {
    try {
      const { id } = req.params;
      const isDownload = req.query.download === 'true' || req.query.download === '1';

      const doc = await prisma.evidenceDocument.findUnique({
        where: { id }
      });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Evidence document not found.' });
      }

      // Check subsidiary authorization
      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== doc.subsidiaryId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view or download evidence from another subsidiary.'
        });
      }

      // Resolve physical file path safely
      const fullPath = storageService.resolvePhysicalPath(doc.filePath, doc.filename);

      if (!fullPath || !fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, message: 'Physical evidence file missing on server storage.' });
      }

      // Audit Log for evidence access
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: doc.subsidiaryId,
          action: isDownload ? 'DOWNLOAD_EVIDENCE' : 'VIEW_EVIDENCE',
          entity: 'EvidenceDocument',
          entityId: doc.id,
          details: `${isDownload ? 'Downloaded' : 'Viewed'} evidence file '${doc.originalName}' (ID: ${doc.id})`
        }
      });

      const disposition = isDownload ? 'attachment' : 'inline';
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.originalName)}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=3600');

      const readStream = fs.createReadStream(fullPath);
      readStream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Main Company Admin Reviews Evidence Document
   * POST /api/evidence/:id/review
   */
  async reviewEvidence(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden: Only Main Company Admin has authority to review evidence.' });
      }

      const { id } = req.params;
      const { reviewStatus, comments = '' } = req.body;

      const validStatuses = ['Approved', 'Correction Required', 'Rejected'];
      if (!validStatuses.includes(reviewStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid review status '${reviewStatus}'. Allowed: ${validStatuses.join(', ')}`
        });
      }

      if ((reviewStatus === 'Correction Required' || reviewStatus === 'Rejected') && (!comments || !comments.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Reviewer comments explaining the reason are mandatory when requesting correction or rejecting evidence.'
        });
      }

      const doc = await prisma.evidenceDocument.findUnique({
        where: { id },
        include: { subsidiary: true }
      });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Evidence document not found.' });
      }

      const now = new Date();
      const updated = await prisma.evidenceDocument.update({
        where: { id },
        data: {
          reviewStatus,
          reviewedBy: req.user.name,
          reviewedAt: now,
          reviewComments: comments,
          verificationStatus: reviewStatus === 'Approved' ? 'Verified' : (reviewStatus === 'Rejected' ? 'Rejected' : 'Unverified')
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: doc.subsidiaryId,
          action: 'REVIEW_EVIDENCE',
          entity: 'EvidenceDocument',
          entityId: id,
          details: `Main Admin reviewed evidence '${doc.originalName}' -> ${reviewStatus}. Comment: "${comments}"`
        }
      });

      // Notification to Sub-Company Admin
      let notifType = 'info';
      let title = `Evidence Review: ${reviewStatus}`;
      if (reviewStatus === 'Approved') {
        notifType = 'success';
        title = `Evidence Approved: ${doc.originalName}`;
      } else if (reviewStatus === 'Correction Required') {
        notifType = 'warning';
        title = `Correction Required: ${doc.originalName}`;
      } else {
        notifType = 'danger';
        title = `Evidence Rejected: ${doc.originalName}`;
      }

      await prisma.notification.create({
        data: {
          roleTarget: 'SUB_ADMIN',
          subsidiaryId: doc.subsidiaryId,
          title,
          message: `${req.user.name} reviewed evidence '${doc.originalName}' (ID: ${id}): ${reviewStatus}. Remarks: "${comments}"`,
          type: notifType,
          linkUrl: 'snapToBrsr'
        }
      });

      return res.json({
        success: true,
        message: `Evidence document status updated to '${reviewStatus}'.`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Link Evidence Document to ESG Submission and Metrics
   * POST /api/evidence/:id/link
   */
  async linkEvidence(req, res, next) {
    try {
      const { id } = req.params;
      const {
        submissionId,
        projectId,
        category,
        esgCategory,
        brsrPrinciple,
        scope,
        supportedMetric,
        supportedEmission
      } = req.body;

      const doc = await prisma.evidenceDocument.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Evidence document not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== doc.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot modify evidence from another subsidiary.' });
      }

      const updated = await prisma.evidenceDocument.update({
        where: { id },
        data: {
          ...(submissionId !== undefined ? { submissionId } : {}),
          ...(projectId !== undefined ? { projectId } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(esgCategory !== undefined ? { esgCategory } : {}),
          ...(brsrPrinciple !== undefined ? { brsrPrinciple } : {}),
          ...(scope !== undefined ? { scope } : {}),
          ...(supportedMetric !== undefined ? { supportedMetric } : {}),
          ...(supportedEmission !== undefined ? { supportedEmission: Number(supportedEmission) || null } : {})
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: doc.subsidiaryId,
          action: 'LINK_EVIDENCE',
          entity: 'EvidenceDocument',
          entityId: id,
          details: `Linked evidence '${doc.originalName}' to submission ${submissionId || 'None'}. Scope: ${scope || doc.scope}`
        }
      });

      return res.json({
        success: true,
        message: 'Evidence document linked successfully.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload Corrected Evidence Document Version (Requirement 18)
   * POST /api/evidence/:id/version
   */
  async uploadVersion(req, res, next) {
    try {
      const { id } = req.params;
      const { changeReason = 'Correction uploaded by Sub-Company Admin' } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload the corrected evidence document.' });
      }

      const doc = await prisma.evidenceDocument.findUnique({
        where: { id },
        include: { subsidiary: true }
      });

      if (!doc) {
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }
        return res.status(404).json({ success: false, message: 'Evidence document not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== doc.subsidiaryId) {
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }
        return res.status(403).json({ success: false, message: 'Access denied: Cannot update evidence for another subsidiary.' });
      }

      // 1. Archive current version in EvidenceVersion table
      await prisma.evidenceVersion.create({
        data: {
          evidenceId: doc.id,
          versionNumber: doc.version,
          filename: doc.filename,
          originalName: doc.originalName,
          filePath: doc.filePath,
          fileHash: doc.fileHash,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          uploadedBy: doc.uploadedBy,
          uploaderId: doc.uploaderId,
          changeReason
        }
      });

      // 2. Store new file version in collision-safe directory
      const storedFile = await storageService.storeEvidenceFile(req.file.path, {
        originalName: req.file.originalname,
        companyId: 'main-meil',
        subsidiaryId: doc.subsidiaryId,
        projectId: doc.projectId || 'general',
        reportingYear: doc.reportingYear,
        submissionId: doc.submissionId || 'unlinked',
        evidenceId: `${doc.id}-v${doc.version + 1}`
      });

      // 3. Update main EvidenceDocument record
      const nextVersion = doc.version + 1;
      const updated = await prisma.evidenceDocument.update({
        where: { id },
        data: {
          filename: storedFile.filename,
          originalName: storedFile.originalName,
          filePath: storedFile.filePath,
          fileHash: storedFile.fileHash,
          fileSize: storedFile.fileSize,
          mimeType: req.file.mimetype,
          version: nextVersion,
          reviewStatus: 'Pending Review',
          verificationStatus: 'Verified',
          reviewComments: null, // Reset previous correction comment
          reviewedBy: null,
          reviewedAt: null,
          updatedAt: new Date()
        }
      });

      // 4. Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: doc.subsidiaryId,
          action: 'EVIDENCE_VERSION_UPLOAD',
          entity: 'EvidenceDocument',
          entityId: id,
          details: `Uploaded Version ${nextVersion} for evidence '${doc.originalName}'. Reason: "${changeReason}"`
        }
      });

      // 5. Notify Main Admin
      await prisma.notification.create({
        data: {
          roleTarget: 'MAIN_ADMIN',
          title: `Revised Evidence Uploaded: ${doc.originalName}`,
          message: `${req.user.name} uploaded revised Version ${nextVersion} for ${doc.originalName} (ID: ${id}) from ${doc.subsidiary?.name || 'Subsidiary'}.`,
          type: 'info',
          linkUrl: 'submissions'
        }
      });

      return res.json({
        success: true,
        message: `Version ${nextVersion} uploaded successfully and queued for review.`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete Evidence Document
   */
  async deleteEvidence(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await prisma.evidenceDocument.findUnique({ where: { id } });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Evidence document not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== doc.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      // Remove record from database
      await prisma.evidenceDocument.delete({ where: { id } });

      // Clean up physical file if it exists
      const fullPath = storageService.resolvePhysicalPath(doc.filePath, doc.filename);
      if (fullPath && fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) { /* ignore cleanup error */ }
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: doc.subsidiaryId,
          action: 'DELETE_EVIDENCE',
          entity: 'EvidenceDocument',
          entityId: id,
          details: `Deleted evidence document '${doc.originalName}' (ID: ${id})`
        }
      });

      return res.json({ success: true, message: 'Evidence document deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EvidenceController();
