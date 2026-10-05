/**
 * Server-Side Role-Based Access Control
 * Strictly enforces application roles & authorization gates:
 * 1. MAIN_ADMIN (Executive Administration / Oversight)
 * 2. SUB_ADMIN / OPERATIONAL ROLES (Subsidiary, Business Unit, Site Operations)
 */

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires role authorization [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
}

const requireMainAdmin = requireRole(['MAIN_ADMIN']);
const requireSubAdmin = requireRole(['SUB_ADMIN']);
const requireAnyAdmin = requireRole(['MAIN_ADMIN', 'SUB_ADMIN']);

/**
 * Scan-to-BRSR is an operational ingestion module reserved for subsidiary/operational users.
 * Main Admins are strictly prohibited from invoking Scan-to-BRSR ingestion endpoints directly.
 */
const requireOperationalRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role === 'MAIN_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Scan-to-BRSR document ingestion is reserved for operational / subsidiary personnel.'
    });
  }

  if (['SUB_ADMIN', 'EMPLOYEE', 'BU_USER', 'BUSINESS_UNIT_USER'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: `Forbidden: Current role '${req.user.role}' is not authorized for Scan-to-BRSR.`
  });
};

module.exports = {
  requireRole,
  requireMainAdmin,
  requireSubAdmin,
  requireAnyAdmin,
  requireOperationalRole
};
