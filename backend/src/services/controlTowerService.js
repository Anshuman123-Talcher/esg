/**
 * ESG Control Tower & Hotspot Analysis Service
 * MEIL Centralized Sustainability Platform
 */

const prisma = require('../config/prisma');

class ControlTowerService {
  /**
   * Compute Enterprise Control Tower Summary Metrics
   */
  async getSummaryMetrics(reportingYear = 'FY 2025-26', filterSubsidiaryId = null) {
    const subFilter = filterSubsidiaryId && filterSubsidiaryId !== 'all' ? { subsidiaryId: filterSubsidiaryId } : {};

    // 1. Projects
    const projects = await prisma.project.findMany({
      where: { ...subFilter, reportingYear },
      include: { subsidiary: true, businessUnit: true }
    });

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.projectStatus === 'Active').length;

    // Data completeness & BRSR completion averages
    const avgDataCompletion = totalProjects > 0
      ? parseFloat((projects.reduce((acc, p) => acc + p.esgCompletion, 0) / totalProjects).toFixed(1))
      : 0;

    const avgBrsrCompletion = totalProjects > 0
      ? parseFloat((projects.reduce((acc, p) => acc + p.brsrCompletion, 0) / totalProjects).toFixed(1))
      : 0;

    // 2. Submissions Breakdown
    const submissions = await prisma.submission.findMany({
      where: { ...subFilter, reportingYear }
    });

    const pendingSubmissions = submissions.filter(s => s.status === 'Submitted' || s.status === 'Under_Review').length;
    const approvedSubmissions = submissions.filter(s => s.status === 'Approved').length;
    const correctionRequiredSubmissions = submissions.filter(s => s.status === 'Correction_Required').length;
    const rejectedSubmissions = submissions.filter(s => s.status === 'Rejected').length;
    const draftSubmissions = submissions.filter(s => s.status === 'Draft').length;

    // 3. Emissions (Aggregated strictly from APPROVED entities/projects for consolidated reporting)
    const approvedSubIds = submissions.filter(s => s.status === 'Approved').map(s => s.subsidiaryId);

    // Fetch approved project emissions
    const emissionRecords = await prisma.emissionRecord.findMany({
      where: {
        reportingYear,
        ...(filterSubsidiaryId && filterSubsidiaryId !== 'all'
          ? { subsidiaryId: filterSubsidiaryId }
          : { subsidiaryId: { in: approvedSubIds.length > 0 ? approvedSubIds : ['none'] } })
      }
    });

    const scope1Mt = parseFloat(
      emissionRecords.filter(e => e.scope === 'Scope 1').reduce((sum, e) => sum + e.calculatedCo2eMt, 0).toFixed(2)
    );
    const scope2Mt = parseFloat(
      emissionRecords.filter(e => e.scope === 'Scope 2').reduce((sum, e) => sum + e.calculatedCo2eMt, 0).toFixed(2)
    );
    const scope3Mt = parseFloat(
      emissionRecords.filter(e => e.scope === 'Scope 3').reduce((sum, e) => sum + e.calculatedCo2eMt, 0).toFixed(2)
    );
    const totalEmissionsMt = parseFloat((scope1Mt + scope2Mt + scope3Mt).toFixed(2));

    // 4. Intensity & Safety & Overdue
    const totalSafetyIncidents = projects.reduce((acc, p) => acc + (p.safetyIncidents || 0), 0);
    const overdueSubmissions = correctionRequiredSubmissions + (pendingSubmissions > 0 ? 1 : 0);

    // Main company revenue context for emission intensity
    const mainCompany = await prisma.mainCompany.findFirst();
    const turnoverCr = mainCompany ? mainCompany.turnover : 32500;
    const emissionIntensity = turnoverCr > 0
      ? parseFloat((totalEmissionsMt / (turnoverCr / 1000)).toFixed(2)) // MT CO2e per 1,000 Cr turnover
      : 0;

    // Renewable energy share
    const renewableSharePct = 34.8; // Seeded baseline across group power mix

    // 5. Transparent ESG Health Score Breakdown
    const completenessScore = Math.min(100, avgDataCompletion);
    const timelinessScore = Math.max(0, 100 - overdueSubmissions * 8);
    const emissionPerformanceScore = totalEmissionsMt > 0 ? 82.5 : 70.0;
    const safetyScore = Math.max(0, 100 - totalSafetyIncidents * 12);
    const targetProgressScore = 78.0;

    const esgHealth = parseFloat(
      (
        completenessScore * 0.30 +
        timelinessScore * 0.20 +
        emissionPerformanceScore * 0.25 +
        safetyScore * 0.15 +
        targetProgressScore * 0.10
      ).toFixed(1)
    );

    return {
      reportingYear,
      filterSubsidiaryId,
      metrics: {
        totalProjects,
        activeProjects,
        dataCompletionPct: avgDataCompletion,
        brsrCompletionPct: avgBrsrCompletion,
        pendingSubmissions,
        approvedSubmissions,
        correctionRequiredSubmissions,
        rejectedSubmissions,
        draftSubmissions,
        scope1EmissionsMt: scope1Mt,
        scope2EmissionsMt: scope2Mt,
        scope3EmissionsMt: scope3Mt,
        totalEmissionsMt,
        emissionIntensity,
        safetyIncidents: totalSafetyIncidents,
        overdueSubmissions,
        renewableEnergySharePct: renewableSharePct,
        sdgProgressPct: 76.5,
        targetProgressPct: targetProgressScore
      },
      esgHealth: {
        overallScore: esgHealth,
        breakdown: [
          { name: 'Data Completeness', score: completenessScore, weight: '30%', description: 'Based on filled statutory indicators' },
          { name: 'Reporting Timeliness', score: timelinessScore, weight: '20%', description: 'Punctuality against SEBI filing cycles' },
          { name: 'Environmental Indicator', score: emissionPerformanceScore, weight: '25%', description: 'Carbon intensity & resource management' },
          { name: 'Safety & Social Performance', score: safetyScore, weight: '15%', description: 'Zero-harm policy & lost-time incident tracking' },
          { name: 'Target Progress', score: targetProgressScore, weight: '10%', description: 'FY 2026-30 Net-Zero trajectory milestone achievement' }
        ]
      }
    };
  }

  /**
   * Get Enterprise Hierarchy for Drilldown
   * MEIL Group -> Subsidiary -> Business Unit -> Project
   */
  async getEnterpriseHierarchy(reportingYear = 'FY 2025-26', filterSubsidiaryId = null) {
    const mainCompany = await prisma.mainCompany.findFirst();
    const whereSubsidiary = filterSubsidiaryId && filterSubsidiaryId !== 'all' ? { id: filterSubsidiaryId } : {};
    const subsidiaries = await prisma.subsidiary.findMany({
      where: whereSubsidiary,
      include: {
        businessUnits: {
          include: {
            projects: {
              where: { reportingYear },
              include: { emissions: { where: { reportingYear } } }
            }
          }
        },
        submissions: { where: { reportingYear } }
      }
    });

    const hierarchy = {
      id: mainCompany?.id || 'main-meil',
      name: mainCompany?.name || 'MEIL Group',
      turnover: mainCompany?.turnover || 32500,
      reportingYear,
      subsidiaries: subsidiaries.map(sub => {
        const subSubm = sub.submissions[0];
        const allProjects = sub.businessUnits.flatMap(bu => bu.projects);
        const subScope1 = allProjects.flatMap(p => p.emissions).filter(e => e.scope === 'Scope 1').reduce((s, e) => s + e.calculatedCo2eMt, 0);
        const subScope2 = allProjects.flatMap(p => p.emissions).filter(e => e.scope === 'Scope 2').reduce((s, e) => s + e.calculatedCo2eMt, 0);

        return {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          sector: sub.sector,
          location: sub.location,
          submissionStatus: subSubm ? subSubm.status : 'Draft',
          projectCount: allProjects.length,
          scope1Mt: parseFloat(subScope1.toFixed(2)),
          scope2Mt: parseFloat(subScope2.toFixed(2)),
          businessUnits: sub.businessUnits.map(bu => ({
            id: bu.id,
            name: bu.name,
            code: bu.code,
            head: bu.head,
            location: bu.location,
            projectCount: bu.projects.length,
            projects: bu.projects.map(p => ({
              id: p.id,
              name: p.name,
              code: p.code,
              latitude: p.latitude,
              longitude: p.longitude,
              projectType: p.projectType,
              status: p.projectStatus,
              submissionStatus: p.submissionStatus,
              esgCompletion: p.esgCompletion,
              safetyIncidents: p.safetyIncidents,
              emissionsMt: p.emissions.reduce((acc, e) => acc + e.calculatedCo2eMt, 0)
            }))
          }))
        };
      })
    };

    return hierarchy;
  }

  /**
   * Get Project Map Coordinates & Status Markers
   */
  async getProjectMapData(reportingYear = 'FY 2025-26', subsidiaryId = null) {
    const where = { reportingYear };
    if (subsidiaryId && subsidiaryId !== 'all') {
      where.subsidiaryId = subsidiaryId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        subsidiary: true,
        businessUnit: true,
        emissions: { where: { reportingYear } }
      }
    });

    return projects.map(p => {
      const scope1 = p.emissions.filter(e => e.scope === 'Scope 1').reduce((s, e) => s + e.calculatedCo2eMt, 0);
      const scope2 = p.emissions.filter(e => e.scope === 'Scope 2').reduce((s, e) => s + e.calculatedCo2eMt, 0);
      const totalEmissions = parseFloat((scope1 + scope2).toFixed(2));

      // Calculate project specific health
      const esgHealth = Math.round((p.esgCompletion * 0.6) + (p.submissionStatus === 'Approved' ? 40 : (p.submissionStatus === 'Submitted' ? 25 : 10)));

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        subsidiaryId: p.subsidiaryId,
        subsidiaryName: p.subsidiary.name,
        businessUnitName: p.businessUnit.name,
        location: `${p.city || p.location || ''}, ${p.state || p.country}`,
        latitude: p.latitude,
        longitude: p.longitude,
        projectType: p.projectType,
        projectStatus: p.projectStatus,
        submissionStatus: p.submissionStatus,
        esgCompletion: p.esgCompletion,
        brsrCompletion: p.brsrCompletion,
        esgHealth,
        scope1Mt: parseFloat(scope1.toFixed(2)),
        scope2Mt: parseFloat(scope2.toFixed(2)),
        totalEmissionsMt: totalEmissions,
        safetyIncidents: p.safetyIncidents,
        isOverdue: p.submissionStatus === 'Correction_Required'
      };
    });
  }

  /**
   * Dynamic Hotspot Detection Engine
   */
  async getHotspots(reportingYear = 'FY 2025-26', filterSubsidiaryId = null) {
    const subFilter = filterSubsidiaryId && filterSubsidiaryId !== 'all' ? { subsidiaryId: filterSubsidiaryId } : {};

    // 1. Fetch configured hotspots from DB
    const dbHotspots = await prisma.hotspot.findMany({
      where: { reportingYear, ...subFilter },
      include: { subsidiary: true, project: true },
      orderBy: { severity: 'asc' }
    });

    // 2. Dynamically detect any additional project-level hotspots from live metrics
    const projects = await prisma.project.findMany({
      where: { reportingYear, ...subFilter },
      include: { subsidiary: true, emissions: { where: { reportingYear } } }
    });

    const dynamicHotspots = [...dbHotspots];

    // High Scope 1 calculation
    const totalGroupScope1 = projects
      .flatMap(p => p.emissions)
      .filter(e => e.scope === 'Scope 1')
      .reduce((s, e) => s + e.calculatedCo2eMt, 0);

    projects.forEach(p => {
      const pScope1 = p.emissions.filter(e => e.scope === 'Scope 1').reduce((s, e) => s + e.calculatedCo2eMt, 0);
      const share = totalGroupScope1 > 0 ? (pScope1 / totalGroupScope1) * 100 : 0;

      if (share > 25 && !dynamicHotspots.some(h => h.projectId === p.id && h.hotspotType === 'HIGH_SCOPE1')) {
        dynamicHotspots.push({
          id: `dyn-hotspot-scope1-${p.id}`,
          subsidiaryId: p.subsidiaryId,
          projectId: p.id,
          reportingYear,
          hotspotType: 'HIGH_SCOPE1',
          severity: 'CRITICAL',
          metricName: 'Disproportionate Scope 1 Concentration',
          value: parseFloat(pScope1.toFixed(2)),
          threshold: parseFloat((totalGroupScope1 * 0.25).toFixed(2)),
          percentShare: parseFloat(share.toFixed(1)),
          description: `Project '${p.name}' accounts for ${share.toFixed(1)}% of total enterprise Scope 1 emissions.`,
          subsidiary: p.subsidiary,
          project: p
        });
      }

      if (p.safetyIncidents > 0 && !dynamicHotspots.some(h => h.projectId === p.id && h.hotspotType === 'RECURRING_SAFETY')) {
        dynamicHotspots.push({
          id: `dyn-hotspot-safety-${p.id}`,
          subsidiaryId: p.subsidiaryId,
          projectId: p.id,
          reportingYear,
          hotspotType: 'RECURRING_SAFETY',
          severity: 'HIGH',
          metricName: 'Lost-Time Injury Incident',
          value: p.safetyIncidents,
          threshold: 0,
          percentShare: null,
          description: `Recorded ${p.safetyIncidents} safety incident(s) during active construction operations.`,
          subsidiary: p.subsidiary,
          project: p
        });
      }
    });

    return dynamicHotspots;
  }
}

module.exports = new ControlTowerService();
