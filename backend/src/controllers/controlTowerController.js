const controlTowerService = require('../services/controlTowerService');

class ControlTowerController {
  async getSummary(req, res, next) {
    try {
      const { year = 'FY 2025-26', subsidiaryId } = req.query;
      const subId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : subsidiaryId;

      const summary = await controlTowerService.getSummaryMetrics(year, subId);
      return res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async getHierarchy(req, res, next) {
    try {
      const { year = 'FY 2025-26', subsidiaryId } = req.query;
      const subId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : subsidiaryId;

      const hierarchy = await controlTowerService.getEnterpriseHierarchy(year, subId);
      return res.json({ success: true, data: hierarchy });
    } catch (err) {
      next(err);
    }
  }

  async getMapData(req, res, next) {
    try {
      const { year = 'FY 2025-26', subsidiaryId } = req.query;
      const subId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : subsidiaryId;

      const mapData = await controlTowerService.getProjectMapData(year, subId);
      return res.json({ success: true, data: mapData });
    } catch (err) {
      next(err);
    }
  }

  async getHotspots(req, res, next) {
    try {
      const { year = 'FY 2025-26', subsidiaryId } = req.query;
      const subId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : subsidiaryId;

      const hotspots = await controlTowerService.getHotspots(year, subId);
      return res.json({ success: true, data: hotspots });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ControlTowerController();
