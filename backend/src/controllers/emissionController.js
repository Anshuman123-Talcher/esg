const prisma = require('../config/prisma');
const emissionService = require('../services/emissionCalculationService');

class EmissionController {
  async getFactors(req, res, next) {
    try {
      const { category } = req.query;
      const where = category ? { category: { contains: category, mode: 'insensitive' } } : {};

      const factors = await prisma.emissionFactor.findMany({
        where,
        orderBy: [{ category: 'asc' }, { fuelType: 'asc' }]
      });

      return res.json({ success: true, data: factors });
    } catch (err) {
      next(err);
    }
  }

  async calculate(req, res, next) {
    try {
      const { scope = 'Scope 1', ...params } = req.body;

      let result;
      if (scope === 'Scope 1') {
        result = await emissionService.calculateScope1(params);
      } else if (scope === 'Scope 2') {
        result = await emissionService.calculateScope2(params);
      } else {
        result = await emissionService.calculateScope3(params);
      }

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createFactor(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can configure emission factors.' });
      }

      const created = await prisma.emissionFactor.create({ data: req.body });
      return res.status(201).json({ success: true, data: created, message: 'Emission factor registered.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EmissionController();
