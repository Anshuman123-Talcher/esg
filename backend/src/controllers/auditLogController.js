const prisma = require('../config/prisma');

class AuditLogController {
  async getLogs(req, res, next) {
    try {
      let where = {};
      if (req.user.role === 'SUB_ADMIN') {
        where = { subsidiaryId: req.user.subsidiaryId };
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      return res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditLogController();
