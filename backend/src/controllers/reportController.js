const prisma = require('../config/prisma');
const consolidationService = require('../services/consolidationService');

class ReportController {
  async getReports(req, res, next) {
    try {
      const { subsidiaryId, year = 'FY 2025-26' } = req.query;
      let where = { reportingYear: year };

      if (req.user.role === 'SUB_ADMIN') {
        where.subsidiaryId = req.user.subsidiaryId;
      } else if (subsidiaryId && subsidiaryId !== 'all') {
        where.subsidiaryId = subsidiaryId;
      }

      const reports = await prisma.reportRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  async generateReport(req, res, next) {
    try {
      const { reportType, title, subsidiaryId, reportingYear = 'FY 2025-26', format = 'PDF' } = req.body;

      // Ensure consolidated reports only use approved data
      let consolidationData = null;
      if (reportType === 'CONSOLIDATED_ESG' || reportType === 'BRSR_EXECUTIVE') {
        consolidationData = await consolidationService.getLatestConsolidation(reportingYear);
      }

      const record = await prisma.reportRecord.create({
        data: {
          reportType: reportType || 'CONSOLIDATED_ESG',
          title: title || `Consolidated ESG & BRSR Statutory Report (${reportingYear})`,
          subsidiaryId: req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (subsidiaryId || null),
          reportingYear,
          format,
          generatedBy: req.user.name,
          status: 'READY'
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          action: 'EXPORT',
          entity: 'ReportRecord',
          entityId: record.id,
          details: `Generated ${format} report: ${record.title}`
        }
      });

      return res.status(201).json({
        success: true,
        data: record,
        consolidationSnapshot: consolidationData?.snapshotData || null,
        message: 'Report generated successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
