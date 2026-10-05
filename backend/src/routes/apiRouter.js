const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const { requireMainAdmin, requireSubAdmin, requireAnyAdmin, requireOperationalRole } = require('../middleware/rbac');
const { enforceSubsidiaryScope } = require('../middleware/subsidiaryScope');
const { upload, validateMagicBytes } = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  loginSchema,
  createUserSchema,
  updateUserAccessSchema,
  createSubsidiarySchema,
  updateSubsidiarySchema,
  createBusinessUnitSchema,
  updateBusinessUnitSchema,
  createProjectSchema,
  updateProjectSchema,
  saveDraftSubmissionSchema,
  approveSubmissionSchema,
  requestCorrectionSubmissionSchema,
  rejectSubmissionSchema,
  saveSdgContributionSchema,
  saveSnapRecordSchema,
  simulateWhatIfSchema,
  saveWhatIfSchema,
  generateReportSchema
} = require('../validators/schemas');

// Controllers
const authController = require('../controllers/authController');
const companyController = require('../controllers/companyController');
const projectController = require('../controllers/projectController');
const submissionController = require('../controllers/submissionController');
const snapToBrsrController = require('../controllers/snapToBrsrController');
const controlTowerController = require('../controllers/controlTowerController');
const whatIfController = require('../controllers/whatIfController');
const emissionController = require('../controllers/emissionController');
const sdgController = require('../controllers/sdgController');
const evidenceController = require('../controllers/evidenceController');
const reportController = require('../controllers/reportController');
const notificationController = require('../controllers/notificationController');
const auditLogController = require('../controllers/auditLogController');
const consolidationService = require('../services/consolidationService');

// 1. AUTH ROUTES
router.post('/auth/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.get('/auth/me', authenticateToken, (req, res, next) => authController.me(req, res, next));
router.post('/auth/logout', authenticateToken, (req, res, next) => authController.logout(req, res, next));

// 2. COMPANY & SUBSIDIARIES & BUSINESS UNITS
router.get('/company', authenticateToken, (req, res, next) => companyController.getMainCompany(req, res, next));
router.patch('/company', authenticateToken, requireMainAdmin, (req, res, next) => companyController.updateMainCompany(req, res, next));

router.get('/subsidiaries', authenticateToken, (req, res, next) => companyController.getSubsidiaries(req, res, next));
router.post('/subsidiaries', authenticateToken, requireMainAdmin, validate(createSubsidiarySchema), (req, res, next) => companyController.createSubsidiary(req, res, next));
router.get('/subsidiaries/:id', authenticateToken, enforceSubsidiaryScope({ targetParam: 'id' }), (req, res, next) => companyController.getSubsidiaryById(req, res, next));
router.patch('/subsidiaries/:id', authenticateToken, enforceSubsidiaryScope({ targetParam: 'id' }), validate(updateSubsidiarySchema), (req, res, next) => companyController.updateSubsidiary(req, res, next));

router.get('/business-units', authenticateToken, (req, res, next) => companyController.getBusinessUnits(req, res, next));
router.post('/business-units', authenticateToken, validate(createBusinessUnitSchema), (req, res, next) => companyController.createBusinessUnit(req, res, next));
router.patch('/business-units/:id', authenticateToken, validate(updateBusinessUnitSchema), (req, res, next) => companyController.updateBusinessUnit(req, res, next));

// User Management (Admin only)
router.get('/users', authenticateToken, requireMainAdmin, (req, res, next) => companyController.getUsers(req, res, next));
router.post('/users', authenticateToken, requireMainAdmin, validate(createUserSchema), (req, res, next) => companyController.createUser(req, res, next));
router.patch('/users/:id/access', authenticateToken, requireMainAdmin, validate(updateUserAccessSchema), (req, res, next) => companyController.updateUserAccess(req, res, next));
router.delete('/users/:id', authenticateToken, requireMainAdmin, (req, res, next) => companyController.deleteUser(req, res, next));

// 3. PROJECTS
router.get('/projects', authenticateToken, (req, res, next) => projectController.getProjects(req, res, next));
router.post('/projects', authenticateToken, validate(createProjectSchema), (req, res, next) => projectController.createProject(req, res, next));
router.get('/projects/:id', authenticateToken, enforceSubsidiaryScope({ checkProject: true }), (req, res, next) => projectController.getProjectById(req, res, next));
router.patch('/projects/:id', authenticateToken, enforceSubsidiaryScope({ checkProject: true }), validate(updateProjectSchema), (req, res, next) => projectController.updateProject(req, res, next));
router.delete('/projects/:id', authenticateToken, enforceSubsidiaryScope({ checkProject: true }), (req, res, next) => projectController.deleteProject(req, res, next));

// 4. SUBMISSIONS & WORKFLOW
router.get('/submissions', authenticateToken, (req, res, next) => submissionController.getSubmissions(req, res, next));
router.get('/submissions/pending-review', authenticateToken, requireMainAdmin, (req, res, next) => {
  req.query.status = 'Submitted';
  return submissionController.getSubmissions(req, res, next);
});
router.post('/submissions/draft', authenticateToken, validate(saveDraftSubmissionSchema), (req, res, next) => submissionController.saveDraft(req, res, next));
router.post('/submissions/submit', authenticateToken, (req, res, next) => submissionController.submitForReview(req, res, next));
router.post('/submissions/resubmit', authenticateToken, (req, res, next) => submissionController.resubmit(req, res, next));
router.get('/submissions/:id', authenticateToken, enforceSubsidiaryScope({ checkSubmission: true }), (req, res, next) => submissionController.getSubmissionById(req, res, next));
router.get('/submissions/:id/evidence', authenticateToken, (req, res, next) => evidenceController.getSubmissionEvidence(req, res, next));
router.post('/submissions/:id/submit', authenticateToken, (req, res, next) => submissionController.submitForReview(req, res, next));
router.post('/submissions/:id/approve', authenticateToken, requireMainAdmin, validate(approveSubmissionSchema), (req, res, next) => submissionController.approveSubmission(req, res, next));
router.post('/submissions/:id/request-correction', authenticateToken, requireMainAdmin, validate(requestCorrectionSubmissionSchema), (req, res, next) => submissionController.requestCorrection(req, res, next));
router.post('/submissions/:id/reject', authenticateToken, requireMainAdmin, validate(rejectSubmissionSchema), (req, res, next) => submissionController.rejectSubmission(req, res, next));
router.post('/submissions/:id/resubmit', authenticateToken, (req, res, next) => submissionController.resubmit(req, res, next));

// 5. SNAP-TO-BRSR / SCAN-TO-BRSR (Requirement 21: Restricted to operational roles, forbidden for MAIN_ADMIN)
router.get('/snap-to-brsr/my-evidence', authenticateToken, (req, res, next) => snapToBrsrController.getMyEvidence(req, res, next));
router.post(
  '/snap-to-brsr/upload',
  authenticateToken,
  requireOperationalRole,
  upload.single('document'),
  validateMagicBytes,
  (req, res, next) => snapToBrsrController.uploadAndExtract(req, res, next)
);
router.post(
  '/snap-to-brsr/save',
  authenticateToken,
  requireOperationalRole,
  validate(saveSnapRecordSchema),
  (req, res, next) => snapToBrsrController.saveRecord(req, res, next)
);

// 6. ESG CONTROL TOWER & WHAT-IF SIMULATOR
router.get('/control-tower/summary', authenticateToken, (req, res, next) => controlTowerController.getSummary(req, res, next));
router.get('/control-tower/hierarchy', authenticateToken, (req, res, next) => controlTowerController.getHierarchy(req, res, next));
router.get('/control-tower/map', authenticateToken, (req, res, next) => controlTowerController.getMapData(req, res, next));
router.get('/control-tower/hotspots', authenticateToken, (req, res, next) => controlTowerController.getHotspots(req, res, next));

router.post('/what-if/simulate', authenticateToken, validate(simulateWhatIfSchema), (req, res, next) => whatIfController.simulate(req, res, next));
router.post('/what-if/save', authenticateToken, validate(saveWhatIfSchema), (req, res, next) => whatIfController.save(req, res, next));
router.get('/what-if/history', authenticateToken, (req, res, next) => whatIfController.getHistory(req, res, next));
router.get('/what-if/:id', authenticateToken, (req, res, next) => whatIfController.getById(req, res, next));

// 7. EMISSIONS & FACTORS
router.get('/emissions/factors', authenticateToken, (req, res, next) => emissionController.getFactors(req, res, next));
router.post('/emissions/factors', authenticateToken, requireMainAdmin, (req, res, next) => emissionController.createFactor(req, res, next));
router.post('/emissions/calculate', authenticateToken, (req, res, next) => emissionController.calculate(req, res, next));

// 8. UN SDGS
router.get('/sdgs', authenticateToken, (req, res, next) => sdgController.getSdgs(req, res, next));
router.get('/sdg-contributions', authenticateToken, (req, res, next) => sdgController.getContributions(req, res, next));
router.post('/sdg-contributions', authenticateToken, validate(saveSdgContributionSchema), (req, res, next) => sdgController.saveContribution(req, res, next));
router.delete('/sdg-contributions/:id', authenticateToken, (req, res, next) => sdgController.deleteContribution(req, res, next));
router.post('/sdg-contributions/:id/approve', authenticateToken, requireMainAdmin, (req, res, next) => sdgController.approveContribution(req, res, next));
router.post('/sdg-contributions/:id/request-correction', authenticateToken, requireMainAdmin, (req, res, next) => sdgController.requestCorrectionContribution(req, res, next));
router.post('/sdg-contributions/:id/reject', authenticateToken, requireMainAdmin, (req, res, next) => sdgController.rejectContribution(req, res, next));

// 9. EVIDENCE DOCUMENTS (Secure authenticated streaming, review, versioning & deletion)
router.get('/evidence', authenticateToken, (req, res, next) => evidenceController.listEvidence(req, res, next));
router.get('/evidence/:id', authenticateToken, (req, res, next) => evidenceController.getEvidence(req, res, next));
router.get('/evidence/:id/file', authenticateToken, (req, res, next) => evidenceController.getFile(req, res, next));
router.post('/evidence/:id/review', authenticateToken, requireMainAdmin, (req, res, next) => evidenceController.reviewEvidence(req, res, next));
router.post('/evidence/:id/link', authenticateToken, (req, res, next) => evidenceController.linkEvidence(req, res, next));
router.post(
  '/evidence/:id/version',
  authenticateToken,
  requireOperationalRole,
  upload.single('document'),
  validateMagicBytes,
  (req, res, next) => evidenceController.uploadVersion(req, res, next)
);
router.delete('/evidence/:id', authenticateToken, (req, res, next) => evidenceController.deleteEvidence(req, res, next));

// 10. CONSOLIDATION
router.get('/consolidation/latest', authenticateToken, async (req, res, next) => {
  try {
    const { year = 'FY 2025-26' } = req.query;
    const latest = await consolidationService.getLatestConsolidation(year);
    return res.json({ success: true, data: latest });
  } catch (err) {
    next(err);
  }
});
router.post('/consolidation/run', authenticateToken, requireMainAdmin, async (req, res, next) => {
  try {
    const { year = 'FY 2025-26' } = req.body;
    const run = await consolidationService.runConsolidation(year, req.user.name);
    return res.json({ success: true, data: run, message: 'Consolidation rollup executed successfully.' });
  } catch (err) {
    next(err);
  }
});

// 11. REPORTS
router.get('/reports', authenticateToken, (req, res, next) => reportController.getReports(req, res, next));
router.post('/reports/generate', authenticateToken, validate(generateReportSchema), (req, res, next) => reportController.generateReport(req, res, next));

// 12. NOTIFICATIONS
router.get('/notifications', authenticateToken, (req, res, next) => notificationController.getNotifications(req, res, next));
router.patch('/notifications/:id/read', authenticateToken, (req, res, next) => notificationController.markAsRead(req, res, next));
router.post('/notifications/read-all', authenticateToken, (req, res, next) => notificationController.markAllRead(req, res, next));

// 13. AUDIT LOGS
router.get('/audit-logs', authenticateToken, (req, res, next) => auditLogController.getLogs(req, res, next));

module.exports = router;
