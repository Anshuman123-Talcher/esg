/**
 * What-If Simulator Service
 * MEIL ESG Control Tower Decision Engine
 * 
 * Provides transparent, data-driven scenario simulation against approved project baselines:
 * 1. Diesel to Solar PV
 * 2. Diesel to Grid Electricity (Electrification)
 * 3. Fly-Ash Blended Cement Substitution
 */

const prisma = require('../config/prisma');
const emissionService = require('./emissionCalculationService');

class WhatIfSimulationService {
  /**
   * Fetch approved baseline metrics for a project
   */
  async getProjectBaseline(projectId, reportingYear = 'FY 2025-26') {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        subsidiary: true,
        emissions: { where: { reportingYear } },
        fuelRecords: { where: { reportingYear } },
        electricityRecs: { where: { reportingYear } }
      }
    });

    if (!project) {
      throw new Error(`Project '${projectId}' not found.`);
    }

    // Aggregate baseline Scope 1 from emissions table or default project estimate
    const scope1Recs = project.emissions.filter(e => e.scope === 'Scope 1');
    const scope2Recs = project.emissions.filter(e => e.scope === 'Scope 2');

    let totalDieselL = project.fuelRecords
      .filter(f => f.fuelType.toLowerCase().includes('diesel'))
      .reduce((sum, f) => sum + f.quantity, 0);

    let scope1Mt = scope1Recs.reduce((sum, e) => sum + e.calculatedCo2eMt, 0);
    let scope2Mt = scope2Recs.reduce((sum, e) => sum + e.calculatedCo2eMt, 0);

    // If project has no explicit fuel records, calculate from Scope 1 or realistic project scale
    if (totalDieselL === 0 && scope1Mt > 0) {
      totalDieselL = Math.round((scope1Mt * 1000) / 2.68);
    } else if (totalDieselL === 0) {
      totalDieselL = 500000; // 500k L baseline default for demo project scale
      scope1Mt = parseFloat(((totalDieselL * 2.68) / 1000).toFixed(2));
    }

    const dieselRateInr = 92.50; // Current commercial diesel price per litre
    const dieselAnnualCostInr = Math.round(totalDieselL * dieselRateInr);

    let totalElectricityKwh = project.electricityRecs.reduce((sum, e) => sum + e.kwhConsumed, 0);
    if (totalElectricityKwh === 0 && scope2Mt > 0) {
      totalElectricityKwh = Math.round((scope2Mt * 1000) / 0.716);
    } else if (totalElectricityKwh === 0) {
      totalElectricityKwh = 1200000; // 1.2M kWh default
      scope2Mt = parseFloat(((totalElectricityKwh * 0.716) / 1000).toFixed(2));
    }

    const gridTariffInr = 8.50; // Commercial HT industrial electricity tariff
    const electricityAnnualCostInr = Math.round(totalElectricityKwh * gridTariffInr);

    return {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      subsidiaryId: project.subsidiaryId,
      subsidiaryName: project.subsidiary.name,
      reportingYear,
      baseline: {
        dieselUsageL: totalDieselL,
        dieselRateInr,
        dieselCostInr: dieselAnnualCostInr,
        gridElectricityKwh: totalElectricityKwh,
        gridTariffInr,
        gridCostInr: electricityAnnualCostInr,
        scope1EmissionsMt: scope1Mt,
        scope2EmissionsMt: scope2Mt,
        totalEmissionsMt: parseFloat((scope1Mt + scope2Mt).toFixed(2)),
        cementConsumptionMt: 45000, // Standard infrastructure project baseline
        currentFlyAshSharePct: 20.0
      }
    };
  }

  /**
   * SCENARIO 1: Diesel to Solar Replacement
   */
  async simulateDieselToSolar(projectId, inputs = {}) {
    const { replacementPercentage = 30, solarCapexPerKwp = 45000, reportingYear = 'FY 2025-26' } = inputs;
    const baseObj = await this.getProjectBaseline(projectId, reportingYear);
    const b = baseObj.baseline;

    const pct = Math.min(Math.max(Number(replacementPercentage), 1), 100);
    const replacedDieselL = Math.round(b.dieselUsageL * (pct / 100.0));
    const remainingDieselL = b.dieselUsageL - replacedDieselL;

    // Energy equivalence: 1 L diesel generator yields ~3.3 kWh net electricity
    const solarKwhRequired = Math.round(replacedDieselL * 3.3);

    // Solar PV sizing: 1 kWp in southern/central India produces ~1,500 kWh/year
    const solarKwpRequired = Math.round(solarKwhRequired / 1500);
    const estimatedCapexInr = solarKwpRequired * solarCapexPerKwp;
    const annualSolarOpexInr = Math.round(estimatedCapexInr * 0.015); // 1.5% O&M

    // Emission calculations
    const dieselFactor = 2.68; // kg CO2e / L
    const solarFactor = 0.041; // kg CO2e / kWh lifecycle

    const newScope1Mt = parseFloat(((remainingDieselL * dieselFactor) / 1000).toFixed(2));
    const newSolarScope2Mt = parseFloat(((solarKwhRequired * solarFactor) / 1000).toFixed(2));
    const newTotalEmissionsMt = parseFloat((newScope1Mt + newSolarScope2Mt + b.scope2EmissionsMt).toFixed(2));

    const emissionReductionMt = parseFloat((b.totalEmissionsMt - newTotalEmissionsMt).toFixed(2));
    const percentEmissionReduction = parseFloat(((emissionReductionMt / b.totalEmissionsMt) * 100).toFixed(1));

    // Cost calculations
    const annualFuelSavedInr = Math.round(replacedDieselL * b.dieselRateInr);
    const netAnnualCostSavingsInr = annualFuelSavedInr - annualSolarOpexInr;
    const paybackPeriodYears = parseFloat((estimatedCapexInr / Math.max(netAnnualCostSavingsInr, 1)).toFixed(1));

    return {
      scenarioType: 'DIESEL_TO_SOLAR',
      title: `${baseObj.projectName} — ${pct}% Diesel to Solar PV`,
      projectId: baseObj.projectId,
      projectName: baseObj.projectName,
      subsidiaryId: baseObj.subsidiaryId,
      reportingYear,
      inputs: {
        replacementPercentage: pct,
        solarCapexPerKwp,
        dieselRateInr: b.dieselRateInr
      },
      baseline: {
        dieselL: b.dieselUsageL,
        scope1Mt: b.scope1EmissionsMt,
        scope2Mt: b.scope2EmissionsMt,
        totalEmissionsMt: b.totalEmissionsMt,
        annualEnergyCostInr: b.dieselCostInr + b.gridCostInr
      },
      whatIf: {
        remainingDieselL,
        replacedDieselL,
        solarKwhGenerated: solarKwhRequired,
        solarCapacityKwp: solarKwpRequired,
        newScope1Mt,
        newScope2Mt: parseFloat((b.scope2EmissionsMt + newSolarScope2Mt).toFixed(2)),
        newTotalEmissionsMt,
        newAnnualCostInr: Math.round(remainingDieselL * b.dieselRateInr + annualSolarOpexInr + b.gridCostInr)
      },
      impact: {
        emissionReductionMt,
        percentEmissionReduction,
        annualFuelCostSavedInr: annualFuelSavedInr,
        netAnnualCostSavingsInr,
        estimatedCapexInr,
        paybackPeriodYears
      },
      assumptions: [
        '1 Litre diesel produces ~3.3 kWh effective electrical energy in industrial gensets.',
        'Captive Solar PV generates ~1,500 kWh per kWp installed annually in India.',
        'Solar lifecycle emission factor is 0.041 kg CO2e / kWh (NREL baseline).',
        'Commercial diesel cost pegged at INR 92.50 per Litre.'
      ]
    };
  }

  /**
   * SCENARIO 2: Diesel to Grid Electrification
   */
  async simulateDieselToGrid(projectId, inputs = {}) {
    const { replacementPercentage = 50, gridTariffInr = 8.50, reportingYear = 'FY 2025-26' } = inputs;
    const baseObj = await this.getProjectBaseline(projectId, reportingYear);
    const b = baseObj.baseline;

    const pct = Math.min(Math.max(Number(replacementPercentage), 1), 100);
    const replacedDieselL = Math.round(b.dieselUsageL * (pct / 100.0));
    const remainingDieselL = b.dieselUsageL - replacedDieselL;

    // Direct grid electric motors have higher efficiency than diesel engines (~3.0 kWh per litre equivalent)
    const addedGridKwh = Math.round(replacedDieselL * 3.0);

    const dieselFactor = 2.68; // Scope 1
    const gridFactor = 0.716;  // Scope 2 (CEA baseline)

    // Scope 1 drops drastically
    const newScope1Mt = parseFloat(((remainingDieselL * dieselFactor) / 1000).toFixed(2));
    const scope1ReductionMt = parseFloat((b.scope1EmissionsMt - newScope1Mt).toFixed(2));

    // Scope 2 increases due to grid draw
    const addedScope2Mt = parseFloat(((addedGridKwh * gridFactor) / 1000).toFixed(2));
    const newScope2Mt = parseFloat((b.scope2EmissionsMt + addedScope2Mt).toFixed(2));

    const newTotalEmissionsMt = parseFloat((newScope1Mt + newScope2Mt).toFixed(2));
    const netEmissionReductionMt = parseFloat((b.totalEmissionsMt - newTotalEmissionsMt).toFixed(2));
    const percentEmissionChange = parseFloat(((netEmissionReductionMt / b.totalEmissionsMt) * 100).toFixed(1));

    // Cost change: Diesel saved vs Grid tariff paid
    const dieselSavingsInr = Math.round(replacedDieselL * b.dieselRateInr);
    const addedElectricityCostInr = Math.round(addedGridKwh * gridTariffInr);
    const netAnnualSavingsInr = dieselSavingsInr - addedElectricityCostInr;

    return {
      scenarioType: 'DIESEL_TO_GRID',
      title: `${baseObj.projectName} — ${pct}% Grid Electrification`,
      projectId: baseObj.projectId,
      projectName: baseObj.projectName,
      subsidiaryId: baseObj.subsidiaryId,
      reportingYear,
      inputs: {
        replacementPercentage: pct,
        gridTariffInr
      },
      baseline: {
        dieselL: b.dieselUsageL,
        scope1Mt: b.scope1EmissionsMt,
        scope2Mt: b.scope2EmissionsMt,
        totalEmissionsMt: b.totalEmissionsMt,
        annualCostInr: b.dieselCostInr + b.gridCostInr
      },
      whatIf: {
        remainingDieselL,
        addedGridKwh,
        newScope1Mt,
        newScope2Mt,
        newTotalEmissionsMt,
        newAnnualCostInr: Math.round(remainingDieselL * b.dieselRateInr + (b.gridElectricityKwh + addedGridKwh) * gridTariffInr)
      },
      impact: {
        scope1ReductionMt,
        scope2IncreaseMt: addedScope2Mt,
        netEmissionReductionMt,
        percentEmissionChange,
        dieselSavingsInr,
        addedElectricityCostInr,
        netAnnualSavingsInr
      },
      assumptions: [
        'Electric equipment efficiency is ~3.0 kWh per Litre diesel equivalent.',
        'Grid emissions calculated via Central Electricity Authority (CEA) Baseline v19 (0.716 kg CO2e/kWh).',
        'Scope 1 decreases directly on-site while Scope 2 reflects regional grid generation.'
      ]
    };
  }

  /**
   * SCENARIO 3: Fly-Ash Blended Cement Substitution
   */
  async simulateFlyAshCement(projectId, inputs = {}) {
    const { targetFlyAshPct = 45.0, totalCementTonnes = 45000, reportingYear = 'FY 2025-26' } = inputs;
    const baseObj = await this.getProjectBaseline(projectId, reportingYear);

    const baselineFlyAshPct = 20.0;
    const opcFactor = 0.860; // MT CO2e / Tonne OPC
    const ppcFactor = 0.585; // MT CO2e / Tonne PPC (Fly-ash blend)

    const tonnes = Number(totalCementTonnes) || 45000;
    const proposedPct = Math.min(Math.max(Number(targetFlyAshPct), 10), 65);

    // Baseline calculation
    const baselinePpcTonnes = (tonnes * baselineFlyAshPct) / 100.0;
    const baselineOpcTonnes = tonnes - baselinePpcTonnes;
    const baselineEmissionsMt = parseFloat((baselineOpcTonnes * opcFactor + baselinePpcTonnes * ppcFactor).toFixed(2));

    // Proposed calculation
    const proposedPpcTonnes = (tonnes * proposedPct) / 100.0;
    const proposedOpcTonnes = tonnes - proposedPpcTonnes;
    const proposedEmissionsMt = parseFloat((proposedOpcTonnes * opcFactor + proposedPpcTonnes * ppcFactor).toFixed(2));

    const emissionReductionMt = parseFloat((baselineEmissionsMt - proposedEmissionsMt).toFixed(2));
    const percentReduction = parseFloat(((emissionReductionMt / baselineEmissionsMt) * 100).toFixed(1));

    // Cost: PPC is typically INR 300 to 500 cheaper per Tonne than OPC
    const costSavingsPerTonne = 380;
    const additionalPpcTonnes = proposedPpcTonnes - baselinePpcTonnes;
    const netMaterialSavingsInr = Math.round(additionalPpcTonnes * costSavingsPerTonne);

    return {
      scenarioType: 'FLY_ASH_CEMENT',
      title: `${baseObj.projectName} — ${proposedPct}% Fly-Ash Cement Blend`,
      projectId: baseObj.projectId,
      projectName: baseObj.projectName,
      subsidiaryId: baseObj.subsidiaryId,
      reportingYear,
      inputs: {
        targetFlyAshPct: proposedPct,
        totalCementTonnes: tonnes
      },
      baseline: {
        totalCementTonnes: tonnes,
        flyAshSharePct: baselineFlyAshPct,
        opcTonnes: baselineOpcTonnes,
        ppcTonnes: baselinePpcTonnes,
        materialEmissionsMt: baselineEmissionsMt
      },
      whatIf: {
        totalCementTonnes: tonnes,
        flyAshSharePct: proposedPct,
        opcTonnes: proposedOpcTonnes,
        ppcTonnes: proposedPpcTonnes,
        newMaterialEmissionsMt: proposedEmissionsMt
      },
      impact: {
        emissionReductionMt,
        percentReduction,
        netMaterialSavingsInr
      },
      assumptions: [
        'Ordinary Portland Cement (OPC 53) factor: 0.860 MT CO2e / Tonne (GCCA Carbon Protocol).',
        'Portland Pozzolana Cement (PPC 35% Fly Ash) factor: 0.585 MT CO2e / Tonne (BEE Baseline).',
        'PPC provides ~INR 380/Tonne direct procurement saving over OPC in Indian construction markets.'
      ]
    };
  }

  /**
   * Save a simulation record to PostgreSQL database
   */
  async saveSimulation(simulationData, user) {
    const saved = await prisma.whatIfSimulation.create({
      data: {
        title: simulationData.title,
        scenarioType: simulationData.scenarioType,
        subsidiaryId: simulationData.subsidiaryId,
        projectId: simulationData.projectId,
        reportingYear: simulationData.reportingYear || 'FY 2025-26',
        baselineData: simulationData.baseline,
        scenarioInputs: simulationData.inputs,
        resultsData: simulationData.impact,
        createdById: user ? user.id : null,
        createdByName: user ? user.name : 'Central Admin'
      }
    });

    return saved;
  }

  /**
   * Get simulation history
   */
  async getSimulationHistory(subsidiaryId = null) {
    const where = subsidiaryId && subsidiaryId !== 'all' ? { subsidiaryId } : {};
    return await prisma.whatIfSimulation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { subsidiary: true, project: true }
    });
  }
}

module.exports = new WhatIfSimulationService();
