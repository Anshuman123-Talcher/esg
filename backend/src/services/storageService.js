const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { UPLOAD_DIR } = require('../config/env');

class StorageService {
  /**
   * Generate a globally unique, collision-proof Evidence ID
   * Example: EV-8F31C2A7-0104
   */
  generateEvidenceId() {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timeComponent = Date.now().toString().slice(-4);
    return `EV-${randomHex}-${timeComponent}`;
  }

  /**
   * Compute cryptographic SHA-256 hash of a file for exact duplicate detection
   */
  async computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', err => reject(err));
    });
  }

  /**
   * Check if a document with identical SHA-256 hash already exists in PostgreSQL
   * Returns existing document details if duplicate detected, else null
   */
  async checkDuplicate(fileHash, excludeId = null) {
    if (!fileHash) return null;

    const existing = await prisma.evidenceDocument.findFirst({
      where: {
        fileHash,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      include: {
        subsidiary: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, name: true, code: true } }
      }
    });

    if (!existing) return null;

    return {
      isDuplicate: true,
      existingEvidenceId: existing.id,
      originalName: existing.originalName,
      uploadedBy: existing.uploadedBy,
      uploaderId: existing.uploaderId,
      subsidiaryName: existing.subsidiary?.name || 'Subsidiary',
      subsidiaryId: existing.subsidiaryId,
      projectName: existing.project?.name || 'General Project',
      projectId: existing.projectId,
      uploadDate: existing.createdAt ? existing.createdAt.toISOString() : null,
      reportingYear: existing.reportingYear,
      category: existing.category,
      ocrStatus: existing.ocrStatus
    };
  }

  /**
   * Move uploaded temp file into a hierarchical, collision-safe storage directory:
   * /uploads/company/{companyId}/subsidiary/{subsidiaryId}/project/{projectId}/year/{reportingYear}/submission/{submissionId}/evidence/{evidenceId}/{originalFilename}
   */
  async storeEvidenceFile(tempFilePath, {
    originalName,
    companyId = 'main-meil',
    subsidiaryId = 'sub-general',
    projectId = 'general',
    reportingYear = 'FY_2025-26',
    submissionId = 'unlinked',
    evidenceId
  }) {
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Temporary file not found at ${tempFilePath}`);
    }

    const cleanReportingYear = String(reportingYear).replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanCompanyId = String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanSubId = String(subsidiaryId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanProjId = String(projectId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanSubmId = String(submissionId || 'unlinked').replace(/[^a-zA-Z0-9_-]/g, '_');

    // Safe original filename preservation
    const ext = path.extname(originalName) || '';
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const safeFilename = `${base}${ext}`;

    // Target folder structure
    const targetDir = path.resolve(
      UPLOAD_DIR,
      'company',
      cleanCompanyId,
      'subsidiary',
      cleanSubId,
      'project',
      cleanProjId,
      'year',
      cleanReportingYear,
      'submission',
      cleanSubmId,
      'evidence',
      evidenceId
    );

    fs.mkdirSync(targetDir, { recursive: true });

    const targetFilePath = path.join(targetDir, safeFilename);

    // Compute hash before move
    const fileHash = await this.computeFileHash(tempFilePath);
    const stats = fs.statSync(tempFilePath);

    // Move file from temp to final destination
    try {
      fs.renameSync(tempFilePath, targetFilePath);
    } catch (err) {
      // Fallback to copy and unlink (e.g., cross-device)
      fs.copyFileSync(tempFilePath, targetFilePath);
      try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
    }

    // Calculate relative path for database storage (normalized with forward slashes)
    const relativePath = path.relative(path.resolve(__dirname, '../../'), targetFilePath).replace(/\\/g, '/');

    return {
      evidenceId,
      filename: safeFilename,
      originalName,
      filePath: relativePath,
      absolutePath: targetFilePath,
      fileHash,
      fileSize: stats.size
    };
  }

  /**
   * Safely resolve physical file path with path traversal protection
   */
  resolvePhysicalPath(storedPath, fallbackFilename = null) {
    if (!storedPath && !fallbackFilename) return null;

    const baseDir = path.resolve(__dirname, '../../');
    const uploadBase = path.resolve(UPLOAD_DIR);

    // Attempt 1: storedPath relative to project root
    if (storedPath) {
      const candidate1 = path.resolve(baseDir, storedPath);
      if (candidate1.startsWith(baseDir) && fs.existsSync(candidate1)) {
        return candidate1;
      }
    }

    // Attempt 2: storedPath relative to UPLOAD_DIR
    if (storedPath) {
      const candidate2 = path.resolve(uploadBase, storedPath);
      if (candidate2.startsWith(uploadBase) && fs.existsSync(candidate2)) {
        return candidate2;
      }
    }

    // Attempt 3: legacy flat file in UPLOAD_DIR
    if (fallbackFilename) {
      const candidate3 = path.resolve(uploadBase, path.basename(fallbackFilename));
      if (candidate3.startsWith(uploadBase) && fs.existsSync(candidate3)) {
        return candidate3;
      }
    }

    // Attempt 4: basename of storedPath in UPLOAD_DIR
    if (storedPath) {
      const candidate4 = path.resolve(uploadBase, path.basename(storedPath));
      if (candidate4.startsWith(uploadBase) && fs.existsSync(candidate4)) {
        return candidate4;
      }
    }

    return null;
  }
}

module.exports = new StorageService();
