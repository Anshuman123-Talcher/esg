const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const ocrService = require('../services/ocrService');
const emissionService = require('../services/emissionCalculationService');
const storageService = require('../services/storageService');

class SnapToBrsrController {
  /**
   * Upload Document & Run OCR/AI Extraction (Operational Only, Requirement 11 & 21)
   * Collision-safe storage with unique Evidence ID and duplicate detection
   */
  async uploadAndExtract(req, res, next) {
    try {
      // 1. Role Authorization Check: Disallow Executive Admin
      if (req.user.role === 'MAIN_ADMIN') {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Scan-to-BRSR document ingestion is reserved for operational / subsidiary personnel.'
        });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a valid document or photo.' });
      }

      const { projectId, reportingYear = 'FY 2025-26', submissionId, category } = req.body;
      let effectiveSubId = req.user.subsidiaryId;
      let projectName = 'Strategic Project Site';

      // 2. Project Ownership & Existence Validation
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          if (fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
          }
          return res.status(404).json({ success: false, message: `Project '${projectId}' was not found.` });
        }

        if (req.user.role === 'SUB_ADMIN' && project.subsidiaryId !== req.user.subsidiaryId) {
          if (fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
          }
          return res.status(403).json({
            success: false,
            message: `Project ownership violation: Project '${projectId}' belongs to another subsidiary.`
          });
        }

        effectiveSubId = project.subsidiaryId;
        projectName = project.name;
      }

      if (!effectiveSubId) {
        effectiveSubId = 'sub-3';
      }

      // 3. Find or link active submission if applicable
      let targetSubmissionId = submissionId || null;
      if (!targetSubmissionId) {
        const activeSubm = await prisma.submission.findFirst({
          where: {
            subsidiaryId: effectiveSubId,
            reportingYear: reportingYear
          },
          orderBy: { lastUpdated: 'desc' }
        });
        if (activeSubm) {
          targetSubmissionId = activeSubm.id;
        }
      }

      // 4. Generate unique Evidence ID and move file to collision-safe storage
      const evidenceId = storageService.generateEvidenceId();
      const storedFile = await storageService.storeEvidenceFile(req.file.path, {
        originalName: req.file.originalname,
        companyId: 'main-meil',
        subsidiaryId: effectiveSubId,
        projectId: projectId || 'general',
        reportingYear,
        submissionId: targetSubmissionId || 'unlinked',
        evidenceId
      });

      // 5. Check for exact duplicate document using SHA-256 hash
      const duplicateInfo = await storageService.checkDuplicate(storedFile.fileHash);

      // 6. Run OCR Service Adapter (Gemini Vision or Local Document Engine)
      const extractionResult = await ocrService.processDocument(
        storedFile.absolutePath,
        storedFile.originalName,
        req.file.mimetype,
        {
          projectId,
          projectName,
          subsidiaryId: effectiveSubId,
          reportingYear
        }
      );

      // Derive ESG category, BRSR principle, scope, and metric
      const docCategory = category || extractionResult.extraction.documentType || 'Fuel Receipt';
      const esgCat = extractionResult.brsrMapping?.esgCategory || 'Energy & Emissions';
      const brsrPrinc = extractionResult.brsrMapping?.principle || 'Principle 6';
      const scopeVal = extractionResult.emissions?.scope || 'Scope 1';
      const supportedMetric = `${extractionResult.extraction.quantity || ''} ${extractionResult.extraction.unit || ''} ${extractionResult.extraction.fuelType || ''}`.trim();
      const supportedEmission = extractionResult.emissions?.calculatedCo2eMt ? Number(extractionResult.emissions.calculatedCo2eMt) : null;

      // 7. Create Evidence Document record in PostgreSQL
      const evidenceDoc = await prisma.evidenceDocument.create({
        data: {
          id: evidenceId,
          filename: storedFile.filename,
          originalName: storedFile.originalName,
          mimeType: req.file.mimetype,
          fileSize: storedFile.fileSize,
          filePath: storedFile.filePath,
          fileHash: storedFile.fileHash,
          uploadedBy: req.user.name,
          uploaderId: req.user.id,
          uploaderRole: req.user.role,
          subsidiaryId: effectiveSubId,
          projectId: projectId || null,
          submissionId: targetSubmissionId,
          reportingYear,
          category: docCategory,
          esgCategory: esgCat,
          brsrPrinciple: brsrPrinc,
          scope: scopeVal,
          supportedMetric: supportedMetric || null,
          supportedEmission: supportedEmission,
          ocrStatus: 'COMPLETED',
          ocrConfidence: Number(extractionResult.extraction.overallConfidence) || 92.5,
          verificationStatus: 'Unverified',
          reviewStatus: 'Pending Review',
          isDuplicate: !!duplicateInfo,
          duplicateOfId: duplicateInfo ? duplicateInfo.existingEvidenceId : null,
          version: 1
        }
      });

      // 8. Save OCR Extraction Record
      const ocrRecord = await prisma.ocrExtraction.create({
        data: {
          evidenceId: evidenceDoc.id,
          documentType: extractionResult.extraction.documentType,
          rawText: extractionResult.extraction.rawExtractedSummary,
          extractedJson: extractionResult.extraction,
          confidenceScore: extractionResult.extraction.overallConfidence,
          provider: extractionResult.provider,
          status: 'COMPLETED'
        }
      });

      // Save individual fields for audit & human correction tracking
      const fieldEntries = Object.entries(extractionResult.extraction).filter(([k, v]) => typeof v !== 'object');
      for (const [k, v] of fieldEntries) {
        const conf = extractionResult.extraction.fieldConfidences?.[k] || extractionResult.extraction.overallConfidence;
        await prisma.extractedField.create({
          data: {
            extractionId: ocrRecord.id,
            fieldName: k,
            fieldValue: String(v),
            confidence: Number(conf) || 90.0,
            unit: k === 'quantity' ? extractionResult.extraction.unit : null,
            mappedEsgField: extractionResult.brsrMapping?.esgCategory || null
          }
        });
      }

      // 9. Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: effectiveSubId,
          action: 'SNAP_TO_BRSR_UPLOAD',
          entity: 'EvidenceDocument',
          entityId: evidenceDoc.id,
          details: `Uploaded evidence '${storedFile.originalName}' (ID: ${evidenceDoc.id}, Hash: ${storedFile.fileHash.slice(0, 8)}...). OCR Confidence: ${extractionResult.extraction.overallConfidence}%.${duplicateInfo ? ' [FLAGGED AS POSSIBLE DUPLICATE]' : ''}`
        }
      });

      return res.json({
        success: true,
        message: duplicateInfo
          ? 'Document analyzed successfully. Note: Possible duplicate evidence detected with existing file.'
          : 'Document uploaded and analyzed successfully.',
        data: {
          evidenceId: evidenceDoc.id,
          extractionId: ocrRecord.id,
          file: {
            evidenceId: evidenceDoc.id,
            filename: evidenceDoc.filename,
            originalName: evidenceDoc.originalName,
            fileSize: evidenceDoc.fileSize,
            fileHash: evidenceDoc.fileHash,
            url: `/api/evidence/${evidenceDoc.id}/file` // Secure authenticated endpoint
          },
          duplicateWarning: duplicateInfo ? {
            detected: true,
            message: 'Possible duplicate evidence detected with identical content hash.',
            existingEvidenceId: duplicateInfo.existingEvidenceId,
            existingFileName: duplicateInfo.originalName,
            existingUploadedBy: duplicateInfo.uploadedBy,
            existingSubsidiary: duplicateInfo.subsidiaryName,
            existingProject: duplicateInfo.projectName,
            existingUploadDate: duplicateInfo.uploadDate,
            newEvidenceId: evidenceDoc.id
          } : null,
          provider: extractionResult.provider,
          extractedData: extractionResult.extraction,
          validation: extractionResult.validation,
          brsrMapping: extractionResult.brsrMapping,
          calculatedEmissions: extractionResult.emissions
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Save Human-Corrected Extracted Data into Official Project / ESG Records
   */
  async saveRecord(req, res, next) {
    try {
      if (req.user.role === 'MAIN_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Scan-to-BRSR data confirmation is reserved for operational personnel.'
        });
      }

      const {
        evidenceId,
        projectId,
        reportingYear = 'FY 2025-26',
        fuelType,
        quantity,
        unit,
        invoiceDate,
        vendor,
        totalCostInr,
        submissionId
      } = req.body;

      let effectiveSubId = req.user.subsidiaryId;

      // 1. Validate Project Ownership
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(404).json({ success: false, message: `Project '${projectId}' not found.` });
        }
        if (req.user.role === 'SUB_ADMIN' && project.subsidiaryId !== req.user.subsidiaryId) {
          return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another subsidiary.' });
        }
        effectiveSubId = project.subsidiaryId;
      }

      // 2. Validate Evidence Ownership
      let evidenceDoc = null;
      if (evidenceId) {
        evidenceDoc = await prisma.evidenceDocument.findUnique({ where: { id: evidenceId } });
        if (!evidenceDoc) {
          return res.status(404).json({ success: false, message: `Evidence document '${evidenceId}' not found.` });
        }
        if (req.user.role === 'SUB_ADMIN' && evidenceDoc.subsidiaryId !== req.user.subsidiaryId) {
          return res.status(403).json({ success: false, message: 'Access denied: Evidence document belongs to another subsidiary.' });
        }
      }

      // 3. Calculate Scope 1 / Scope 2 based on finalized verified data
      const isElectricity = fuelType.toLowerCase().includes('elec') || unit.toLowerCase() === 'kwh';

      let emissionResult = null;
      if (isElectricity) {
        emissionResult = await emissionService.calculateScope2({
          energySource: fuelType,
          consumption: quantity,
          unit,
          subsidiaryId: effectiveSubId,
          projectId,
          reportingYear,
          evidenceId
        });

        if (projectId) {
          await prisma.electricityRecord.create({
            data: {
              subsidiaryId: effectiveSubId,
              projectId,
              reportingYear,
              kwhConsumed: emissionResult.standardQuantityKwh,
              gridProvider: vendor,
              costInr: Number(totalCostInr) || null,
              evidenceId
            }
          });
        }
      } else {
        emissionResult = await emissionService.calculateScope1({
          fuelType,
          quantity,
          unit,
          subsidiaryId: effectiveSubId,
          projectId,
          reportingYear,
          evidenceId
        });

        if (projectId) {
          await prisma.fuelRecord.create({
            data: {
              subsidiaryId: effectiveSubId,
              projectId,
              reportingYear,
              fuelType,
              quantity: Number(quantity),
              unit,
              costInr: Number(totalCostInr) || null,
              supplier: vendor,
              invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
              evidenceId
            }
          });
        }
      }

      // 4. Create Emission Record in DB
      let createdEmission = null;
      if (projectId) {
        createdEmission = await prisma.emissionRecord.create({
          data: {
            subsidiaryId: effectiveSubId,
            projectId,
            reportingYear,
            scope: emissionResult.scope,
            categoryName: emissionResult.category,
            activityValue: Number(quantity),
            activityUnit: unit,
            factorId: emissionResult.factorId && !emissionResult.factorId.startsWith('default') ? emissionResult.factorId : null,
            emissionFactorVal: emissionResult.emissionFactor,
            factorSource: emissionResult.factorSource,
            calculatedCo2eKg: emissionResult.calculatedCo2eKg,
            calculatedCo2eMt: emissionResult.calculatedCo2eMt,
            evidenceId
          }
        });
      }

      // 5. Link evidence to submission if available
      let targetSubmId = submissionId || (evidenceDoc ? evidenceDoc.submissionId : null);
      if (!targetSubmId) {
        const activeSubm = await prisma.submission.findFirst({
          where: { subsidiaryId: effectiveSubId, reportingYear },
          orderBy: { lastUpdated: 'desc' }
        });
        if (activeSubm) {
          targetSubmId = activeSubm.id;
        }
      }

      // 6. Update Evidence Document verification and linkage
      if (evidenceId) {
        await prisma.evidenceDocument.update({
          where: { id: evidenceId },
          data: {
            verificationStatus: 'Verified',
            reviewStatus: 'Pending Review',
            projectId: projectId || null,
            submissionId: targetSubmId,
            category: fuelType || evidenceDoc?.category,
            esgCategory: isElectricity ? 'Energy - Electricity' : 'Energy - Fuel',
            brsrPrinciple: 'Principle 6',
            scope: emissionResult.scope,
            supportedMetric: `${quantity} ${unit} ${fuelType}`,
            supportedEmission: Number(emissionResult.calculatedCo2eMt) || null
          }
        });
      }

      // 7. Audit Log
      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: effectiveSubId,
          action: 'SNAP_TO_BRSR_CONFIRM',
          entity: 'EmissionRecord',
          entityId: createdEmission ? createdEmission.id : evidenceId,
          details: `Confirmed and mapped Snap-to-BRSR record: ${quantity} ${unit} ${fuelType} -> ${emissionResult.calculatedCo2eMt} MT CO2e (${emissionResult.scope}). Evidence ID: ${evidenceId}.`
        }
      });

      return res.json({
        success: true,
        message: 'Record saved, evidence linked, and emissions computed successfully.',
        data: {
          emissionRecord: createdEmission,
          calculatedEmissions: emissionResult,
          evidenceId,
          submissionId: targetSubmId
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get evidence list for current user's subsidiary (Snap-to-BRSR register view)
   */
  async getMyEvidence(req, res, next) {
    try {
      const { year = 'FY 2025-26' } = req.query;
      let where = { reportingYear: year };

      if (req.user.role === 'SUB_ADMIN') {
        where.subsidiaryId = req.user.subsidiaryId;
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
}

module.exports = new SnapToBrsrController();
