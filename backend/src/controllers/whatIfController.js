const whatIfService = require('../services/whatIfService');
const prisma = require('../config/prisma');

class WhatIfController {
  async simulate(req, res, next) {
    try {
      const { scenarioType = 'DIESEL_TO_SOLAR', projectId, inputs = {} } = req.body;

      if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project selection is required for simulation.' });
      }

      // Check project ownership
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && project.subsidiaryId !== req.user.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another subsidiary.' });
      }

      let result;
      switch (scenarioType) {
        case 'DIESEL_TO_SOLAR':
          result = await whatIfService.simulateDieselToSolar(projectId, inputs);
          break;
        case 'DIESEL_TO_GRID':
          result = await whatIfService.simulateDieselToGrid(projectId, inputs);
          break;
        case 'FLY_ASH_CEMENT':
          result = await whatIfService.simulateFlyAshCement(projectId, inputs);
          break;
        default:
          result = await whatIfService.simulateDieselToSolar(projectId, inputs);
      }

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const simulationData = req.body;

      // Authoritative subsidiary derivation
      const effectiveSubId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (simulationData.subsidiaryId || req.user.subsidiaryId);
      simulationData.subsidiaryId = effectiveSubId;

      if (simulationData.projectId) {
        const project = await prisma.project.findUnique({ where: { id: simulationData.projectId } });
        if (!project || (req.user.role === 'SUB_ADMIN' && project.subsidiaryId !== req.user.subsidiaryId)) {
          return res.status(403).json({ success: false, message: 'Invalid project or subsidiary access violation.' });
        }
      }

      const saved = await whatIfService.saveSimulation(simulationData, req.user);

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: effectiveSubId,
          action: 'SIMULATION',
          entity: 'WhatIfSimulation',
          entityId: saved.id,
          details: `Saved scenario simulation: '${simulationData.title}'. Projected reduction: ${simulationData.impact?.emissionReductionMt || 0} MT CO2e.`
        }
      });

      return res.status(201).json({ success: true, data: saved, message: 'Simulation scenario saved to database.' });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req, res, next) {
    try {
      const { subsidiaryId } = req.query;
      const subId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : subsidiaryId;

      const history = await whatIfService.getSimulationHistory(subId);
      return res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const simulation = await prisma.whatIfSimulation.findUnique({
        where: { id },
        include: { subsidiary: true, project: true }
      });

      if (!simulation) {
        return res.status(404).json({ success: false, message: 'Simulation record not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && simulation.subsidiaryId !== req.user.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: Simulation belongs to another subsidiary.' });
      }

      return res.json({ success: true, data: simulation });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WhatIfController();
