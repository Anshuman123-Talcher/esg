/**
 * Centralized Enterprise API Error Handling Middleware (Requirement 20)
 * Sanitizes errors in production to prevent leaking database internals, stack traces,
 * SQL queries, environment paths, or secrets.
 */

function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Server-side logging with timestamp
  console.error(`[${new Date().toISOString()}] [API ERROR] ${req.method} ${req.originalUrl}:`, err.stack || err.message || err);

  // 1. Zod Validation Error
  if (err.name === 'ZodError' || err.errors) {
    return res.status(400).json({
      success: false,
      message: err.errors?.[0]?.message || 'Invalid request parameters.',
      errors: isDev ? err.errors : undefined
    });
  }

  // 2. Multer Upload Error
  if (err.name === 'MulterError') {
    let message = 'File upload failed.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum allowed limit of 10MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field in upload request.';
    }
    return res.status(400).json({ success: false, message, code: err.code });
  }

  // 3. Prisma Known Request Errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    let statusCode = 400;
    let safeMessage = 'Database operation error.';

    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        safeMessage = 'A record with this unique identifier or code already exists.';
        break;
      case 'P2025':
        statusCode = 404;
        safeMessage = 'The requested database record was not found.';
        break;
      case 'P2003':
        statusCode = 400;
        safeMessage = 'Foreign key constraint violation: Related entity does not exist.';
        break;
      default:
        safeMessage = isDev ? err.message : 'Database query could not be completed.';
    }

    return res.status(statusCode).json({
      success: false,
      message: safeMessage,
      code: err.code
    });
  }

  // 4. Prisma Validation Error
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      success: false,
      message: isDev ? err.message : 'Invalid database input parameters provided.'
    });
  }

  // 5. JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Session token expired. Please sign in again.' : 'Invalid session token.'
    });
  }

  // 6. Generic / Internal Errors
  const statusCode = err.statusCode || 500;
  const message = isDev
    ? (err.message || 'Internal Enterprise Server Error')
    : (statusCode === 500 ? 'An unexpected server error occurred. Please contact system administrator.' : err.message);

  return res.status(statusCode).json({
    success: false,
    message,
    ...(isDev ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
