/**
 * Server-Side Subsidiary Isolation Middleware
 * Strictly prohibits a Sub-Company Admin from querying, reading, updating, or deleting
 * records belonging to any subsidiary other than their assigned entity!
 */

const prisma = require('../config/prisma');

function enforceSubsidiaryScope(options = {}) {
  const { targetParam = 'subsidiaryId', checkProject = false, checkSubmission = false } = options;

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // MAIN_ADMIN has group-wide access
    if (req.user.role === 'MAIN_ADMIN') {
      return next();
    }

    const assignedSubId = req.user.subsidiaryId;
    if (!assignedSubId) {
      return res.status(403).json({
        success: false,
        message: 'Sub-Company Admin has no assigned subsidiary binding.'
      });
    }

    // 1. Direct subsidiaryId check from params, body, or query
    const requestedSubId = req.params[targetParam] || req.body[targetParam] || req.query[targetParam];
    if (requestedSubId && requestedSubId !== 'all' && requestedSubId !== assignedSubId) {
      return res.status(403).json({
        success: false,
        message: `Cross-entity access violation: You are authorized only for subsidiary '${assignedSubId}'. Access to '${requestedSubId}' is prohibited.`
      });
    }

    // 2. Project Ownership Check
    if (checkProject) {
      const projectId = req.params.projectId || req.params.id || req.body.projectId;
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { subsidiaryId: true }
        });
        if (project && project.subsidiaryId !== assignedSubId) {
          return res.status(403).json({
            success: false,
            message: `Project access violation: Project '${projectId}' belongs to subsidiary '${project.subsidiaryId}', not your assigned subsidiary.`
          });
        }
      }
    }

    // 3. Submission Ownership Check
    if (checkSubmission) {
      const submissionId = req.params.submissionId || req.params.id || req.body.submissionId;
      if (submissionId) {
        const submission = await prisma.submission.findUnique({
          where: { id: submissionId },
          select: { subsidiaryId: true }
        });
        if (submission && submission.subsidiaryId !== assignedSubId) {
          return res.status(403).json({
            success: false,
            message: `Submission access violation: Submission '${submissionId}' belongs to another subsidiary.`
          });
        }
      }
    }

    // Automatically enforce query scoping for Sub-Admin
    if (req.query && (!req.query[targetParam] || req.query[targetParam] === 'all')) {
      req.query[targetParam] = assignedSubId;
    }
    if (req.body && !req.body[targetParam]) {
      req.body[targetParam] = assignedSubId;
    }

    next();
  };
}

module.exports = {
  enforceSubsidiaryScope
};
