const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { UPLOAD_DIR } = require('../config/env');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Strict mapping of allowed file extensions to MIME types
const MIME_EXTENSION_MAP = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'application/csv': ['.csv'],
  'text/plain': ['.csv'] // some clients send csv as text/plain
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate secure randomized server-side filename (prevents traversal and collisions)
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = rawExt.match(/^\.[a-z0-9]+$/) ? rawExt : '.bin';
    const randomName = `ev_${crypto.randomBytes(16).toString('hex')}_${Date.now()}${safeExt}`;
    cb(null, randomName);
  }
});

const fileFilter = (req, file, cb) => {
  const mime = file.mimetype.toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedExts = MIME_EXTENSION_MAP[mime];
  if (!allowedExts || !allowedExts.includes(ext)) {
    return cb(new Error(`Invalid file type or mismatched extension. Allowed: PDF, JPG, PNG, WEBP, XLSX, CSV.`), false);
  }

  // Prevent executable extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi', '.com', '.ps1', '.php', '.jsp'];
  if (dangerousExtensions.includes(ext)) {
    return cb(new Error('Executable or script files are strictly prohibited.'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB maximum
  },
  fileFilter
});

/**
 * Validate magic bytes / file signature after upload (Express Middleware)
 */
function validateMagicBytes(req, res, next) {
  if (!req.file) return next();
  try {
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    let isValid = true;
    if (mimeType === 'application/pdf') {
      // PDF starts with %PDF- (0x25, 0x50, 0x44, 0x46)
      isValid = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    } else if (mimeType === 'image/png') {
      // PNG starts with 0x89 0x50 0x4E 0x47
      isValid = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    } else if (mimeType === 'image/jpeg') {
      // JPEG starts with 0xFF 0xD8 0xFF
      isValid = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    } else if (mimeType === 'image/webp') {
      // WEBP starts with RIFF and bytes 8..11 WEBP
      isValid = buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // XLSX starts with PK (0x50 0x4B)
      isValid = buffer[0] === 0x50 && buffer[1] === 0x4B;
    }

    if (!isValid) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(400).json({
        success: false,
        message: 'Security validation failed: File content does not match its claimed MIME type.'
      });
    }
    next();
  } catch (err) {
    console.warn('[MagicBytes] Error validating signature:', err.message);
    next();
  }
}

module.exports = {
  upload,
  validateMagicBytes
};
