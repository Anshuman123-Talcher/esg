/**
 * Dynamic Consolidation Engine
 * MEIL Centralized ESG & BRSR Platform
 * 
 * STRICT REGULATORY RULE:
 * ONLY APPROVED records are incorporated into Consolidated Group Metrics.
 * Draft, Submitted, Under Review, Correction Required, and Rejected records are strictly EXCLUDED!
 */

const prisma = require('../config/prisma');

class ConsolidationService {
  /**
   * Run group-level consolidation for a given reporting year
   */
  async runConsolidation(reportingYear = 'FY 2025-26', runBy = 'Main Company Admin') {
    // 1. Fetch all submissions for the year
    const allSubmissions = await prisma.submission.findMany({
      where: { reportingYear },
      include: { subsidiary: true }
    });

    const approvedSubmissions = allSubmissions.filter(s => s.status === 'Approved');
    const excludedSubmissions = allSubmissions.filter(s => s.status !== 'Approved');

    const approvedSubsidiaryIds = approvedSubmissions.map(s => s.subsidiaryId);

    // 2. Fetch projects that are Approved
    const approvedProjects = await prisma.project.findMany({
      where: {
        reportingYear,
        OR: [
          { submissionStatus: 'Approved' },
          { subsidiaryId: { in: approvedSubsidiaryIds } }
        ]
      },
      include: {
        emissions: { where: { reportingYear } }
      }
    });

    // 3. Aggregate emissions strictly from approved sources
    let totalScope1Mt = 0;
    let totalScope2Mt = 0;
    let totalScope3Mt = 0;

    approvedProjects.forEach(proj => {
      proj.emissions.forEach(e => {
        if (e.scope === 'Scope 1') totalScope1Mt += e.calculatedCo2eMt;
        if (e.scope === 'Scope 2') totalScope2Mt += e.calculatedCo2eMt;
        if (e.scope === 'Scope 3') totalScope3Mt += e.calculatedCo2eMt;
      });
    });

    totalScope1Mt = parseFloat(totalScope1Mt.toFixed(2));
    totalScope2Mt = parseFloat(totalScope2Mt.toFixed(2));
    totalScope3Mt = parseFloat(totalScope3Mt.toFixed(2));
    const totalEmissionsMt = parseFloat((totalScope1Mt + totalScope2Mt + totalScope3Mt).toFixed(2));

    // 4. Save Consolidation Snapshot to DB
    const snapshot = {
      timestamp: new Date().toISOString(),
      runBy,
      reportingYear,
      status: 'SUCCESS',
      summary: {
        totalScope1Mt,
        totalScope2Mt,
        totalScope3Mt,
        totalEmissionsMt,
        approvedSubsidiaryCount: approvedSubsidiaryIds.length,
        approvedProjectCount: approvedProjects.length,
        excludedSubmissionCount: excludedSubmissions.length
      },
      includedEntities: approvedSubmissions.map(s => ({
        id: s.id,
        subsidiaryId: s.subsidiaryId,
        subsidiaryName: s.subsidiary.name,
        approvedDate: s.approvalDate,
        reviewerNotes: s.reviewerNotes
      })),
      excludedEntities: excludedSubmissions.map(s => ({
        id: s.id,
        subsidiaryId: s.subsidiaryId,
        subsidiaryName: s.subsidiary.name,
        status: s.status,
        reason: `Filing status '${s.status}' is not eligible for consolidated group reporting.`
      }))
    };

    const record = await prisma.consolidationRun.create({
      data: {
        reportingYear,
        runBy,
        status: 'SUCCESS',
        totalScope1Mt,
        totalScope2Mt,
        totalScope3Mt,
        totalEmissionsMt,
        approvedSubsidiaries: approvedSubsidiaryIds.length,
        approvedProjects: approvedProjects.length,
        snapshotData: snapshot
      }
    });

    return record;
  }

  /**
   * Get latest consolidation summary
   */
  async getLatestConsolidation(reportingYear = 'FY 2025-26') {
    let latest = await prisma.consolidationRun.findFirst({
      where: { reportingYear },
      orderBy: { timestamp: 'desc' }
    });

    if (!latest) {
      latest = await this.runConsolidation(reportingYear, 'System Automated Initial Rollup');
    }

    return latest;
  }
}

module.exports = new ConsolidationService();
