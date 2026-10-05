/**
 * Central State Store & Dynamic Consolidation Engine
 * MEIL ESG & BRSR Reporting System
 */

const STORAGE_KEY = 'MEIL_ESG_APP_STATE_V2';

class AppStore {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.users || parsed.users.length === 0) parsed.users = JSON.parse(JSON.stringify(DEFAULT_DATA.users || []));
        if (!parsed.businessActivities) parsed.businessActivities = JSON.parse(JSON.stringify(DEFAULT_DATA.businessActivities || {}));
        if (!parsed.facilities) parsed.facilities = JSON.parse(JSON.stringify(DEFAULT_DATA.facilities || {}));
        if (!parsed.auditLogs) parsed.auditLogs = JSON.parse(JSON.stringify(DEFAULT_DATA.auditLogs || []));
        if (!parsed.sdgData || parsed.sdgData.length === 0) parsed.sdgData = JSON.parse(JSON.stringify(DEFAULT_DATA.sdgData || []));
        if (!parsed.sdgContributions || parsed.sdgContributions.length === 0) parsed.sdgContributions = JSON.parse(JSON.stringify(DEFAULT_DATA.sdgContributions || []));
        if (!parsed.frameworkMappings || parsed.frameworkMappings.length === 0) parsed.frameworkMappings = JSON.parse(JSON.stringify(DEFAULT_DATA.frameworkMappings || []));
        if (!parsed.projects || parsed.projects.length < (DEFAULT_DATA.projects || []).length || !parsed.projects[0].environment) {
          parsed.projects = JSON.parse(JSON.stringify(DEFAULT_DATA.projects || []));
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Could not parse saved state, loading defaults", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error("Error saving state to localStorage", e);
    }
  }

  async syncFromBackend() {
    if (this._isSyncing || typeof api === 'undefined' || !api.isOnline) return;
    this._isSyncing = true;
    try {
      const prevStateStr = JSON.stringify({
        subsidiaries: this.state.subsidiaries,
        businessUnits: this.state.businessUnits,
        projects: this.state.projects,
        submissions: this.state.submissions,
        sdgContributions: this.state.sdgContributions,
        notifications: this.state.notifications
      });

      const [subsRes, buRes, projRes, submRes, sdgRes, notifRes] = await Promise.all([
        api.getSubsidiaries().catch(() => null),
        api.getBusinessUnits().catch(() => null),
        api.getProjects().catch(() => null),
        api.getSubmissions('all').catch(() => null),
        api.getSdgContributions().catch(() => null),
        api.getNotifications().catch(() => null)
      ]);

      let changed = false;
      if (subsRes && subsRes.success && Array.isArray(subsRes.data) && subsRes.data.length > 0) {
        this.state.subsidiaries = subsRes.data;
        changed = true;
      }
      if (buRes && buRes.success && Array.isArray(buRes.data) && buRes.data.length > 0) {
        this.state.businessUnits = buRes.data;
        changed = true;
      }
      if (projRes && projRes.success && Array.isArray(projRes.data) && projRes.data.length > 0) {
        this.state.projects = projRes.data;
        changed = true;
      }
      if (submRes && submRes.success && Array.isArray(submRes.data)) {
        this.state.submissions = submRes.data.map(s => {
          const normStatus = s.status === 'Correction_Required'
            ? 'Correction Required'
            : (s.status === 'Under_Review' ? 'Under Review' : s.status);
          return {
            ...s,
            year: s.reportingYear || s.year || 'FY 2025-26',
            reportingYear: s.reportingYear || s.year || 'FY 2025-26',
            subsidiaryName: s.subsidiaryName || s.subsidiary?.name || 'Subsidiary',
            subsidiaryCode: s.subsidiaryCode || s.subsidiary?.code || '',
            status: normStatus,
            rawStatus: s.rawStatus || s.status,
            submissionDate: s.submissionDate ? (typeof s.submissionDate === 'string' && s.submissionDate.includes('T') ? s.submissionDate.slice(0, 10) : s.submissionDate) : null,
            submittedAt: s.submittedAt || (s.submissionDate ? (typeof s.submissionDate === 'string' && s.submissionDate.includes('T') ? s.submissionDate.slice(0, 16).replace('T', ' ') : s.submissionDate) : null),
            lastUpdated: s.lastUpdated ? (typeof s.lastUpdated === 'string' && s.lastUpdated.includes('T') ? s.lastUpdated.slice(0, 16).replace('T', ' ') : s.lastUpdated) : 'Just now'
          };
        });
        changed = true;
      }
      if (sdgRes && sdgRes.success && Array.isArray(sdgRes.data)) {
        this.state.sdgContributions = sdgRes.data;
        changed = true;
      }
      if (notifRes && notifRes.success && Array.isArray(notifRes.data)) {
        this.state.notifications = notifRes.data;
        changed = true;
      }

      const newStateStr = JSON.stringify({
        subsidiaries: this.state.subsidiaries,
        businessUnits: this.state.businessUnits,
        projects: this.state.projects,
        submissions: this.state.submissions,
        sdgContributions: this.state.sdgContributions,
        notifications: this.state.notifications
      });

      if (changed && prevStateStr !== newStateStr) {
        this.saveState();
        console.log('[Store] Synchronized authoritative state from PostgreSQL backend.');
      }
    } catch (e) {
      console.warn('[Store] Backend sync notice:', e);
    } finally {
      this._isSyncing = false;
    }
  }

  resetToDefault() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.saveState();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(fn => {
      try {
        fn(this.state);
      } catch (err) {
        console.error("Listener error:", err);
      }
    });
  }

  // =========================================================================
  // Getters
  // =========================================================================
  getMainCompany() {
    return this.state.mainCompany;
  }

  getSubsidiaries() {
    return this.state.subsidiaries;
  }

  getSubsidiaryById(id) {
    return this.state.subsidiaries.find(s => s.id === id);
  }

  getBusinessUnits(subsidiaryId = null) {
    if (!subsidiaryId || subsidiaryId === 'all') return this.state.businessUnits;
    return this.state.businessUnits.filter(bu => bu.subsidiaryId === subsidiaryId);
  }

  getBusinessUnitById(id) {
    return this.state.businessUnits.find(bu => bu.id === id);
  }

  getProjectById(id) {
    return this.state.projects.find(p => p.id === id);
  }

  getProjects(subsidiaryId = null, buId = null, scope = 'all', status = 'all') {
    let projs = this.state.projects || [];
    if (subsidiaryId && subsidiaryId !== 'all') {
      projs = projs.filter(p => p.subsidiaryId === subsidiaryId);
    }
    if (buId && buId !== 'all') {
      projs = projs.filter(p => (p.buId === buId || p.businessUnitId === buId));
    }
    if (scope === 'domestic') {
      projs = projs.filter(p => !p.isInternational);
    } else if (scope === 'international') {
      projs = projs.filter(p => p.isInternational);
    }
    if (status && status !== 'all') {
      projs = projs.filter(p => (p.submissionStatus === status || p.status === status));
    }
    return projs;
  }

  getSDGs() {
    const raw = this.state.sdgData || DEFAULT_DATA.sdgData || [];
    // SDG category map by id (1–17)
    const catMap = {
      1:'Social', 2:'Social', 3:'Social', 4:'Social', 5:'Social', 8:'Social', 10:'Social',
      6:'Environment', 7:'Environment', 12:'Environment', 13:'Environment', 14:'Environment', 15:'Environment',
      9:'Governance', 11:'Governance', 16:'Governance', 17:'Governance'
    };
    return raw.map(s => ({
      ...s,
      number:   s.number   || s.id,                              // UI uses sdg.number
      progress: s.progress !== undefined ? s.progress : (s.progressPct || 0), // UI uses sdg.progress
      category: s.category || catMap[s.id] || 'Social'           // UI uses sdg.category for filtering
    }));
  }

  getSDGById(id) {
    const num = Number(id);
    return this.getSDGs().find(s => s.id === num);
  }

  getFrameworkMappings() {
    const raw = this.state.frameworkMappings || DEFAULT_DATA.frameworkMappings || [];
    // Normalize field names for UI compatibility
    return raw.map(m => ({
      ...m,
      // Alias: data uses 'indicator' & 'area'; UI expects 'esgIndicator' & 'esgArea'
      esgIndicator: m.esgIndicator || m.indicator || '',
      esgArea:      m.esgArea      || m.area      || '',
      // meilContext: derived from sdgTarget + linkedSubsidiaries if not present
      meilContext:  m.meilContext  || m.sdgTarget  || `Linked to ${(m.linkedSubsidiaries || []).join(', ')}`,
      // applicability: derived from linkedBUs if not present
      applicability: m.applicability || (m.linkedBUs && m.linkedBUs.length ? `${m.linkedBUs.length} BU${m.linkedBUs.length > 1 ? 's' : ''}` : 'Group-Wide')
    }));
  }

  getProjectEsgData(projectId, year = 'FY 2025-26') {
    const proj = this.getProjectById(projectId);
    if (!proj) return null;
    return {
      project: proj,
      environment: proj.environment || {},
      social: proj.social || {},
      governance: proj.governance || {},
      submissionStatus: proj.submissionStatus || (proj.approved ? 'Approved' : 'Draft'),
      approved: !!proj.approved,
      isConsolidated: !!(proj.approved && proj.submissionStatus === 'Approved'),
      esgCompletion: proj.esgCompletion || 0,
      brsrCompletion: proj.brsrCompletion || 0,
      reviewerComments: proj.reviewerComments || null,
      reviewerDate: proj.reviewerDate || null,
      reviewerName: proj.reviewerName || null
    };
  }

  updateProjectEsgData(projectId, year, category, data) {
    const proj = this.getProjectById(projectId);
    if (!proj) return false;
    if (!proj[category]) proj[category] = {};
    Object.assign(proj[category], data);

    // Recalculate completion %
    const qual = this.validateProjectDataQuality(projectId, year);
    proj.esgCompletion = qual.completionPct;

    this.saveState();
    return proj;
  }

  saveProjectDraft(projectId, year, category, data) {
    const proj = this.getProjectById(projectId);
    if (!proj) return false;
    this.updateProjectEsgData(projectId, year, category, data);

    if (proj.submissionStatus !== 'Approved') {
      proj.submissionStatus = 'Draft';
      proj.approved = false;
      proj.isConsolidated = false;
    }
    this.addAuditLog(auth.getUserInfo().name, "PROJECT_DRAFT_SAVED", `Saved draft ESG disclosures for project ${proj.name} (${proj.code})`);
    this.saveState();
    return proj;
  }

  submitProjectData(projectId, year, submittedBy = null) {
    const proj = this.getProjectById(projectId);
    if (!proj) return false;
    const user = submittedBy || auth.getUserInfo().name;

    proj.submissionStatus = 'Submitted';
    proj.approved = false;
    proj.isConsolidated = false;
    proj.lastSubmittedDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

    this.addNotification({
      role: 'main_admin',
      subsidiaryId: proj.subsidiaryId,
      type: 'submission',
      title: `Project ESG Data Submitted: ${proj.name}`,
      desc: `${user} submitted ESG disclosures for project ${proj.code}. Ready for review.`,
      icon: 'FileUp',
      color: 'info'
    });

    this.addAuditLog(user, "PROJECT_SUBMITTED", `Submitted ESG disclosures for project ${proj.name} (${proj.code})`);
    this.saveState();
    return proj;
  }

  setProjectSubmissionStatus(projectId, year, status, reviewerNotes = null, reviewerName = "Main Company Admin") {
    const proj = this.getProjectById(projectId);
    if (!proj) return false;

    const prevStatus = proj.submissionStatus;
    proj.submissionStatus = status;

    if (status === 'Approved') {
      proj.approved = true;
      proj.isConsolidated = true;
      proj.reviewerComments = reviewerNotes || "Approved by Central MEIL ESG Committee.";
      proj.reviewerDate = new Date().toISOString().slice(0, 10);
      proj.reviewerName = reviewerName;
    } else if (status === 'Correction Required') {
      proj.approved = false;
      proj.isConsolidated = false;
      proj.reviewerComments = reviewerNotes;
      proj.reviewerDate = new Date().toISOString().slice(0, 10);
      proj.reviewerName = reviewerName;
      if (!proj.correctionHistory) proj.correctionHistory = [];
      proj.correctionHistory.push({
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        action: 'Correction Requested',
        reviewer: reviewerName,
        note: reviewerNotes
      });
    } else if (status === 'Rejected') {
      proj.approved = false;
      proj.isConsolidated = false;
      proj.reviewerComments = reviewerNotes;
      proj.reviewerDate = new Date().toISOString().slice(0, 10);
      proj.reviewerName = reviewerName;
    } else {
      proj.approved = false;
      proj.isConsolidated = false;
    }

    this.addNotification({
      role: 'all',
      subsidiaryId: proj.subsidiaryId,
      type: status === 'Approved' ? 'approval' : (status === 'Correction Required' ? 'correction' : 'info'),
      title: `Project Status ${status}: ${proj.code}`,
      desc: reviewerNotes ? `Project ${proj.name} status updated to ${status}. Note: "${reviewerNotes}"` : `Status updated from ${prevStatus} to ${status}.`,
      icon: status === 'Approved' ? 'CheckCircle2' : (status === 'Correction Required' ? 'CircleAlert' : 'FileText'),
      color: status === 'Approved' ? 'success' : (status === 'Correction Required' ? 'danger' : 'info')
    });

    this.addAuditLog(reviewerName, "PROJECT_STATUS_UPDATE", `Updated project ${proj.name} status to ${status}`);
    this.saveState();
    return proj;
  }

  validateProjectDataQuality(projectId, year = 'FY 2025-26') {
    const proj = this.getProjectById(projectId);
    if (!proj) return { isValid: false, completionPct: 0, missingFields: [], warnings: [] };

    const env = proj.environment || {};
    const soc = proj.social || {};
    const gov = proj.governance || {};

    const requiredChecks = [
      { key: 'electricityConsumptionMWh', val: env.electricityConsumptionMWh, label: 'Electricity Consumption (MWh)' },
      { key: 'renewableElectricityMWh', val: env.renewableElectricityMWh, label: 'Renewable Electricity (MWh)' },
      { key: 'scope1', val: env.scope1, label: 'Scope 1 GHG Emissions' },
      { key: 'scope2', val: env.scope2, label: 'Scope 2 GHG Emissions' },
      { key: 'waterWithdrawalKL', val: env.waterWithdrawalKL, label: 'Water Withdrawal (kL)' },
      { key: 'waterConsumptionKL', val: env.waterConsumptionKL, label: 'Water Consumption (kL)' },
      { key: 'wasteGeneratedMT', val: env.wasteGeneratedMT, label: 'Waste Generated (MT)' },
      { key: 'wasteRecycledMT', val: env.wasteRecycledMT, label: 'Waste Recycled (MT)' },
      { key: 'totalEmployees', val: soc.totalEmployees, label: 'Total Workforce / Employees' },
      { key: 'safetyTrainingManHours', val: soc.safetyTrainingManHours, label: 'Safety Training Man-Hours' },
      { key: 'ltifr', val: soc.ltifr, label: 'LTIFR Safety Metric' },
      { key: 'antiCorruptionTrainingPct', val: gov.antiCorruptionTrainingPct, label: 'Anti-Corruption Training %' },
      { key: 'policyImplementation', val: gov.policyImplementation, label: 'Policy Implementation Status' }
    ];

    const missingFields = [];
    let completedCount = 0;

    requiredChecks.forEach(item => {
      if (item.val !== undefined && item.val !== null && item.val !== '') {
        completedCount++;
      } else {
        missingFields.push(item.label);
      }
    });

    const completionPct = Math.round((completedCount / requiredChecks.length) * 100);

    const warnings = [];
    if (Number(env.electricityConsumptionMWh) < 0) warnings.push("Electricity consumption cannot be negative.");
    if (Number(env.renewableElectricityMWh) > Number(env.electricityConsumptionMWh)) warnings.push("Renewable electricity cannot exceed total electricity consumption.");
    if (Number(env.scope1) < 0 || Number(env.scope2) < 0) warnings.push("GHG emissions cannot be negative.");
    if (Number(env.waterConsumptionKL) > Number(env.waterWithdrawalKL)) warnings.push("Water consumption cannot exceed water withdrawal.");
    if (Number(env.wasteRecycledMT) > Number(env.wasteGeneratedMT)) warnings.push("Recycled waste cannot exceed total generated waste.");
    if (Number(soc.totalEmployees) < 0) warnings.push("Total employees count cannot be negative.");
    if (Number(soc.womenEmployees) > Number(soc.totalEmployees)) warnings.push("Women employees count cannot exceed total employees.");
    if (Number(soc.ltifr) < 0) warnings.push("LTIFR cannot be negative.");

    return {
      isValid: warnings.length === 0,
      completionPct,
      qualityScore: completionPct,
      completedFields: completedCount,
      completedCount,
      totalFields: requiredChecks.length,
      missingFields,
      warnings
    };
  }

  getBusinessUnitESG(buId, year = 'FY 2025-26') {
    const bu = this.getBusinessUnitById(buId);
    if (!bu) return null;

    const sub = this.getSubsidiaryById(bu.subsidiaryId);
    const projects = this.getProjects(bu.subsidiaryId, bu.id);

    // Bottom-up consolidation rule: ONLY approved projects roll into consolidated numbers!
    const approvedProjects = projects.filter(p => p.submissionStatus === 'Approved' || p.approved);
    const draftProjects = projects.filter(p => p.submissionStatus === 'Draft');
    const submittedProjects = projects.filter(p => p.submissionStatus === 'Submitted');
    const correctionProjects = projects.filter(p => p.submissionStatus === 'Correction Required');
    const rejectedProjects = projects.filter(p => p.submissionStatus === 'Rejected');

    let totalEnergy = 0, renewableEnergy = 0, scope1 = 0, scope2 = 0, scope3 = 0;
    let waterWithdrawal = 0, waterConsumption = 0, wasteGenerated = 0, wasteRecycled = 0, saplings = 0;
    let totalEmployees = 0, womenEmployees = 0, safetyHours = 0, csrSpend = 0;
    let ltifrSum = 0, antiCorruptionSum = 0, esgCompletionSum = 0, brsrCompletionSum = 0;

    const rollupProjects = approvedProjects.length > 0 ? approvedProjects : [];

    rollupProjects.forEach(p => {
      const env = p.environment || {};
      const soc = p.social || {};
      const gov = p.governance || {};

      totalEnergy += Number(env.electricityMWh) || Number(env.electricityConsumptionMWh) || 0;
      renewableEnergy += Number(env.renewableElectricityMWh) || 0;
      scope1 += Number(env.scope1) || 0;
      scope2 += Number(env.scope2) || 0;
      scope3 += Number(env.scope3) || 0;
      waterWithdrawal += Number(env.waterWithdrawalKL) || 0;
      waterConsumption += Number(env.waterConsumptionKL) || 0;
      wasteGenerated += Number(env.wasteGeneratedMT) || 0;
      wasteRecycled += Number(env.wasteRecycledMT) || 0;
      saplings += Number(env.saplingsPlanted) || 0;

      totalEmployees += Number(soc.totalEmployees) || 0;
      womenEmployees += Number(soc.womenEmployees) || 0;
      safetyHours += Number(soc.safetyTrainingManHours) || 0;
      csrSpend += Number(soc.csrActivitiesLakhs) || 0;
      ltifrSum += Number(soc.ltifr) || 0;

      antiCorruptionSum += Number(gov.antiCorruptionTrainingPct) || 0;
    });

    projects.forEach(p => {
      esgCompletionSum += Number(p.esgCompletion) || 0;
      brsrCompletionSum += Number(p.brsrCompletion) || 0;
    });

    const approvedCount = approvedProjects.length;
    const allCount = projects.length || 1;

    const sdgSet = new Set();
    projects.forEach(p => {
      (p.sdgs || []).forEach(num => sdgSet.add(num));
    });

    const renewablePct = totalEnergy > 0 ? Math.round((renewableEnergy / totalEnergy) * 1000) / 10 : 0;
    const wasteRecycledPct = wasteGenerated > 0 ? Math.round((wasteRecycled / wasteGenerated) * 1000) / 10 : 0;
    const ltifrAvg = approvedCount > 0 ? Math.round((ltifrSum / approvedCount) * 100) / 100 : 0.08;
    const antiCorruptionAvg = approvedCount > 0 ? Math.round((antiCorruptionSum / approvedCount) * 10) / 10 : 98.0;

    let esgStatus = 'Draft';
    if (approvedCount === projects.length && projects.length > 0) {
      esgStatus = 'Approved';
    } else if (correctionProjects.length > 0) {
      esgStatus = 'Correction Required';
    } else if (submittedProjects.length > 0) {
      esgStatus = 'Submitted';
    }

    return {
      businessUnit: bu,
      subsidiary: sub,
      projectCount: projects.length,
      approvedCount,
      approvedProjectCount: approvedCount,
      pendingCount: submittedProjects.length,
      correctionCount: correctionProjects.length,
      draftCount: draftProjects.length,
      rejectedCount: rejectedProjects.length,
      projects,
      approvedProjects,
      esgStatus,
      isConsolidated: approvedCount > 0,
      esgCompletion: Math.round(esgCompletionSum / allCount),
      brsrCompletion: Math.round(brsrCompletionSum / allCount),
      environmentScore: approvedCount > 0 ? 92 : (submittedProjects.length > 0 ? 84 : 65),
      socialScore: approvedCount > 0 ? 94 : (submittedProjects.length > 0 ? 86 : 70),
      governanceScore: approvedCount > 0 ? 98 : (submittedProjects.length > 0 ? 90 : 75),
      sdgContributions: Array.from(sdgSet).sort((a,b) => a - b),
      electricityMWh: totalEnergy,
      scope1,
      scope2,
      waterKL: waterWithdrawal,
      employees: totalEmployees,
      totals: {
        totalEnergyMWh: totalEnergy,
        renewableEnergyMWh: renewableEnergy,
        renewablePercent: renewablePct,
        scope1,
        scope2,
        scope3,
        totalGHG: scope1 + scope2 + scope3,
        waterWithdrawalKL: waterWithdrawal,
        waterConsumptionKL: waterConsumption,
        wasteGeneratedMT: wasteGenerated,
        wasteRecycledMT: wasteRecycled,
        wasteRecycledPercent: wasteRecycledPct,
        saplingsPlanted: saplings,
        totalEmployees,
        womenEmployees,
        womenPercent: totalEmployees > 0 ? Math.round((womenEmployees / totalEmployees) * 1000) / 10 : 0,
        safetyTrainingManHours: safetyHours,
        ltifrAverage: ltifrAvg,
        csrSpendLakhs: csrSpend,
        antiCorruptionAverage: antiCorruptionAvg
      }
    };
  }

  calculateHierarchicalRollup(year = 'FY 2025-26') {
    const subs = this.getSubsidiaries();
    const tree = {
      id: 'meil-group',
      name: 'Megha Engineering & Infrastructures Limited (MEIL)',
      type: 'group',
      subsidiaries: [],
      totals: {
        totalEnergyMWh: 0,
        renewableEnergyMWh: 0,
        scope1: 0,
        scope2: 0,
        scope3: 0,
        totalGHG: 0,
        waterWithdrawalKL: 0,
        waterConsumptionKL: 0,
        wasteGeneratedMT: 0,
        wasteRecycledMT: 0,
        totalEmployees: 0
      }
    };

    subs.forEach(sub => {
      const bus = this.getBusinessUnits(sub.id);
      const subItem = {
        id: sub.id,
        name: sub.name,
        shortName: sub.shortName,
        type: 'subsidiary',
        status: this.getSubmissions(year, sub.id)[0]?.status || 'Draft',
        isConsolidated: this.getSubmissions(year, sub.id)[0]?.status === 'Approved',
        businessUnits: [],
        totals: {
          totalEnergyMWh: 0,
          renewableEnergyMWh: 0,
          scope1: 0,
          scope2: 0,
          scope3: 0,
          totalGHG: 0,
          waterWithdrawalKL: 0,
          waterConsumptionKL: 0,
          wasteGeneratedMT: 0,
          wasteRecycledMT: 0,
          totalEmployees: 0
        }
      };

      bus.forEach(bu => {
        const buESG = this.getBusinessUnitESG(bu.id, year);
        const buItem = {
          id: bu.id,
          name: bu.name,
          type: 'businessUnit',
          status: buESG.esgStatus,
          isConsolidated: buESG.isConsolidated,
          projects: [],
          totals: buESG.totals
        };

        buESG.projects.forEach(p => {
          const env = p.environment || {};
          const soc = p.social || {};
          const pItem = {
            id: p.id,
            code: p.code,
            name: p.name,
            type: 'project',
            country: p.country,
            location: p.location,
            isInternational: p.isInternational,
            status: p.submissionStatus,
            isConsolidated: p.submissionStatus === 'Approved',
            totals: {
              totalEnergyMWh: Number(env.electricityMWh) || Number(env.electricityConsumptionMWh) || 0,
              renewableEnergyMWh: Number(env.renewableElectricityMWh) || 0,
              scope1: Number(env.scope1) || 0,
              scope2: Number(env.scope2) || 0,
              scope3: Number(env.scope3) || 0,
              totalGHG: (Number(env.scope1) || 0) + (Number(env.scope2) || 0) + (Number(env.scope3) || 0),
              waterWithdrawalKL: Number(env.waterWithdrawalKL) || 0,
              waterConsumptionKL: Number(env.waterConsumptionKL) || 0,
              wasteGeneratedMT: Number(env.wasteGeneratedMT) || 0,
              wasteRecycledMT: Number(env.wasteRecycledMT) || 0,
              totalEmployees: Number(soc.totalEmployees) || 0
            }
          };
          pItem.electricityMWh = pItem.totals.totalEnergyMWh;
          pItem.scope1 = pItem.totals.scope1;
          pItem.scope2 = pItem.totals.scope2;
          pItem.waterKL = pItem.totals.waterWithdrawalKL;
          pItem.employees = pItem.totals.totalEmployees;

          buItem.projects.push(pItem);
        });

        buItem.electricityMWh = buItem.totals.totalEnergyMWh;
        buItem.scope1 = buItem.totals.scope1;
        buItem.scope2 = buItem.totals.scope2;
        buItem.waterKL = buItem.totals.waterWithdrawalKL;
        buItem.employees = buItem.totals.totalEmployees;

        if (buItem.isConsolidated) {
          subItem.totals.totalEnergyMWh += buItem.totals.totalEnergyMWh;
          subItem.totals.renewableEnergyMWh += buItem.totals.renewableEnergyMWh;
          subItem.totals.scope1 += buItem.totals.scope1;
          subItem.totals.scope2 += buItem.totals.scope2;
          subItem.totals.scope3 += buItem.totals.scope3;
          subItem.totals.totalGHG += buItem.totals.totalGHG;
          subItem.totals.waterWithdrawalKL += buItem.totals.waterWithdrawalKL;
          subItem.totals.waterConsumptionKL += buItem.totals.waterConsumptionKL;
          subItem.totals.wasteGeneratedMT += buItem.totals.wasteGeneratedMT;
          subItem.totals.wasteRecycledMT += buItem.totals.wasteRecycledMT;
          subItem.totals.totalEmployees += buItem.totals.totalEmployees;
        }

        subItem.businessUnits.push(buItem);
      });

      subItem.electricityMWh = subItem.totals.totalEnergyMWh;
      subItem.scope1 = subItem.totals.scope1;
      subItem.scope2 = subItem.totals.scope2;
      subItem.waterKL = subItem.totals.waterWithdrawalKL;
      subItem.employees = subItem.totals.totalEmployees;

      if (subItem.isConsolidated) {
        tree.totals.totalEnergyMWh += subItem.totals.totalEnergyMWh;
        tree.totals.renewableEnergyMWh += subItem.totals.renewableEnergyMWh;
        tree.totals.scope1 += subItem.totals.scope1;
        tree.totals.scope2 += subItem.totals.scope2;
        tree.totals.scope3 += subItem.totals.scope3;
        tree.totals.totalGHG += subItem.totals.totalGHG;
        tree.totals.waterWithdrawalKL += subItem.totals.waterWithdrawalKL;
        tree.totals.waterConsumptionKL += subItem.totals.waterConsumptionKL;
        tree.totals.wasteGeneratedMT += subItem.totals.wasteGeneratedMT;
        tree.totals.wasteRecycledMT += subItem.totals.wasteRecycledMT;
        tree.totals.totalEmployees += subItem.totals.totalEmployees;
      }

      tree.subsidiaries.push(subItem);
    });

    tree.status = 'Approved';
    tree.isConsolidated = true;
    tree.electricityMWh = tree.totals.totalEnergyMWh;
    tree.scope1 = tree.totals.scope1;
    tree.scope2 = tree.totals.scope2;
    tree.waterKL = tree.totals.waterWithdrawalKL;
    tree.employees = tree.totals.totalEmployees;

    return { group: tree, ...tree };
  }

  getSDGAnalytics(year = 'FY 2025-26') {
    const sdgs = this.getSDGs();
    const mappings = this.getFrameworkMappings();
    const projects = this.getProjects();
    const subs = this.getSubsidiaries();

    const coverage = sdgs.map(sdg => {
      const linkedMappings = mappings.filter(m => m.sdgNumber === sdg.id);
      const linkedProjects = projects.filter(p => (p.sdgs || []).includes(sdg.id));
      return {
        id: sdg.id,
        code: sdg.code,
        name: sdg.name,
        color: sdg.color,
        indicatorsCount: linkedMappings.length,
        projectsCount: linkedProjects.length,
        progressPct: sdg.progressPct,
        currentPerformance: sdg.currentPerformance,
        target: sdg.target,
        status: sdg.status
      };
    });

    const bySubsidiary = subs.map(sub => {
      const subProjects = projects.filter(p => p.subsidiaryId === sub.id);
      const subSDGSet = new Set();
      subProjects.forEach(p => (p.sdgs || []).forEach(num => subSDGSet.add(num)));
      return {
        subsidiaryId: sub.id,
        shortName: sub.shortName,
        contributingSDGsCount: subSDGSet.size,
        sdgList: Array.from(subSDGSet).sort((a,b) => a - b)
      };
    });

    const avgProgress = Math.round(sdgs.reduce((a, s) => a + (Number(s.progress) || Number(s.progressPct) || 0), 0) / (sdgs.length || 1));
    const sortedGoals = [...sdgs].sort((a,b) => (Number(b.progress) || Number(b.progressPct) || 0) - (Number(a.progress) || Number(a.progressPct) || 0));

    return {
      totalSDGs: sdgs.length,
      totalIndicatorsMapped: mappings.length,
      averageProgress: avgProgress,
      highestProgressGoal: sortedGoals[0] || sdgs[0],
      coverage,
      bySubsidiary,
      subsidiaryRollup: bySubsidiary,
      topContributingSDGs: coverage.filter(c => c.projectsCount > 0).sort((a,b) => b.projectsCount - a.projectsCount)
    };
  }

  // =========================================================================
  // SUB-COMPANY SDG CONTRIBUTION & INITIATIVE LIFECYCLE MANAGEMENT
  // Hierarchy: MEIL Group -> Subsidiary -> Business Unit -> Project -> SDG -> Disclosures
  // Workflow: Draft -> Submitted -> Under Review (Correction) -> Approved (Consolidated) / Rejected
  // =========================================================================

  getSDGContributions(filters = {}) {
    let list = this.state.sdgContributions;
    if (!list || !Array.isArray(list) || list.length === 0) {
      this.state.sdgContributions = JSON.parse(JSON.stringify(DEFAULT_DATA.sdgContributions || []));
      list = this.state.sdgContributions;
    }

    const {
      subsidiaryId,
      sdgNumber,
      projectId,
      businessUnitId,
      year,
      esgPillar,
      brsrPrinciple,
      performanceStatus,
      workflowStatus,
      approvedOnly
    } = filters;

    return list.filter(item => {
      if (subsidiaryId && subsidiaryId !== 'all' && item.subsidiaryId !== subsidiaryId) return false;
      if (sdgNumber && sdgNumber !== 'all' && String(item.sdgNumber) !== String(sdgNumber)) return false;
      if (projectId && projectId !== 'all' && item.projectId !== projectId) return false;
      if (businessUnitId && businessUnitId !== 'all' && item.businessUnitId !== businessUnitId) return false;
      if (year && year !== 'all' && item.reportingYear !== year) return false;
      if (esgPillar && esgPillar !== 'all' && item.esgPillar !== esgPillar) return false;
      if (brsrPrinciple && brsrPrinciple !== 'all') {
        const itemPrinciple = item.brsrPrinciple || '';
        if (!itemPrinciple.includes(brsrPrinciple) && itemPrinciple !== brsrPrinciple) return false;
      }
      if (performanceStatus && performanceStatus !== 'all' && item.performanceStatus !== performanceStatus) return false;
      if (workflowStatus && workflowStatus !== 'all' && item.workflowStatus !== workflowStatus) return false;
      if (approvedOnly && item.workflowStatus !== 'Approved') return false;
      return true;
    });
  }

  getSDGContributionById(id) {
    if (!this.state.sdgContributions) {
      this.state.sdgContributions = JSON.parse(JSON.stringify(DEFAULT_DATA.sdgContributions || []));
    }
    return this.state.sdgContributions.find(c => c.id === id);
  }

  saveSDGContribution(data, isSubmit = false, user = null) {
    if (!this.state.sdgContributions) {
      this.state.sdgContributions = JSON.parse(JSON.stringify(DEFAULT_DATA.sdgContributions || []));
    }

    const userName = user || (typeof auth !== 'undefined' ? auth.getUserInfo().name : "User");
    const sub = this.getSubsidiaryById(data.subsidiaryId);
    const bu = this.getBusinessUnitById(data.businessUnitId);
    const proj = this.getProjectById(data.projectId);
    const sdg = this.getSDGById(data.sdgNumber);

    const baseVal = parseFloat(data.baselineValue) || 0;
    const curVal = parseFloat(data.currentValue) || 0;
    const tgtVal = parseFloat(data.targetValue) || 0;

    // Safe Progress % calculation
    let progressPct = 0;
    if (tgtVal > 0) {
      progressPct = Math.round((curVal / tgtVal) * 100);
    } else if (curVal > 0) {
      progressPct = 100;
    }

    // Determine performance status from progress
    let perfStatus = "Not Started";
    if (progressPct >= 100) {
      perfStatus = "Completed";
    } else if (progressPct >= 70) {
      perfStatus = "On Track";
    } else if (progressPct > 0) {
      perfStatus = "At Risk";
    }

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const workflowStatus = isSubmit ? "Submitted" : (data.workflowStatus === "Correction Required" || data.workflowStatus === "Rejected" ? "Draft" : (data.workflowStatus || "Draft"));

    let existing = null;
    if (data.id) {
      existing = this.state.sdgContributions.find(c => c.id === data.id);
    }

    if (existing) {
      // Preserve history
      const history = existing.history || [];
      if (isSubmit) {
        history.push({
          date: now,
          action: existing.workflowStatus === "Correction Required" || existing.workflowStatus === "Rejected" ? "Resubmitted" : "Submitted",
          user: userName,
          remarks: data.notes || "Submitted for Central MEIL Admin review."
        });
      } else {
        history.push({
          date: now,
          action: "Draft Updated",
          user: userName,
          remarks: "Initiative details updated locally."
        });
      }

      Object.assign(existing, {
        sdgNumber: Number(data.sdgNumber) || sdg?.number || 1,
        sdgName: sdg?.name || data.sdgName || "Sustainable Development",
        sdgCategory: sdg?.category || data.sdgCategory || "Environmental",
        sdgDescription: sdg?.description || data.sdgDescription || "",
        subsidiaryId: data.subsidiaryId,
        subsidiaryName: sub?.name || data.subsidiaryName || "Subsidiary",
        businessUnitId: data.businessUnitId || null,
        businessUnitName: bu?.name || data.businessUnitName || "General BU",
        projectId: data.projectId || null,
        projectName: proj?.name || data.projectName || "Company Initiative",
        projectLocation: proj?.location || data.projectLocation || "Multiple Sites",
        country: proj?.country || data.country || "India",
        reportingYear: data.reportingYear || "FY 2025-26",
        initiativeName: data.initiativeName || "SDG Initiative",
        initiativeDesc: data.initiativeDesc || data.contributionDescription || "",
        esgPillar: data.esgPillar || "Environmental",
        brsrPrinciple: data.brsrPrinciple || "Principle 6 - Environmental Protection & Climate Action",
        brsrIndicator: data.brsrIndicator || "Key BRSR Indicator",
        baselineYear: data.baselineYear || "2023",
        baselineValue: baseVal,
        currentValue: curVal,
        targetValue: tgtVal,
        unit: data.unit || "Units",
        targetYear: data.targetYear || "2026",
        responsibleDept: data.responsibleDept || "Sustainability Directorate",
        dataSource: data.dataSource || "Internal Loggers",
        evidenceRef: data.evidenceRef || "N/A",
        notes: data.notes || "",
        progress: progressPct,
        performanceStatus: perfStatus,
        workflowStatus: workflowStatus,
        submittedBy: isSubmit ? userName : existing.submittedBy,
        submissionDate: isSubmit ? now : existing.submissionDate,
        lastUpdated: now,
        history
      });

      this.saveState();
      this.addAuditLog(userName, isSubmit ? "SDG_SUBMISSION" : "SDG_DRAFT_SAVED", `${isSubmit ? 'Submitted' : 'Updated draft for'} SDG ${existing.sdgNumber} initiative: ${existing.initiativeName} (${sub?.shortName})`);
      return existing;
    } else {
      const newId = `SDG-INIT-${String(this.state.sdgContributions.length + 1).padStart(3, '0')}`;
      const history = [
        {
          date: now,
          action: isSubmit ? "Submitted" : "Draft Created",
          user: userName,
          remarks: isSubmit ? "Initiative created and dispatched for review." : "Initial draft created."
        }
      ];

      const newRecord = {
        id: newId,
        sdgNumber: Number(data.sdgNumber) || sdg?.number || 1,
        sdgName: sdg?.name || data.sdgName || "Sustainable Development",
        sdgCategory: sdg?.category || data.sdgCategory || "Environmental",
        sdgDescription: sdg?.description || data.sdgDescription || "",
        subsidiaryId: data.subsidiaryId,
        subsidiaryName: sub?.name || data.subsidiaryName || "Subsidiary",
        businessUnitId: data.businessUnitId || null,
        businessUnitName: bu?.name || data.businessUnitName || "General BU",
        projectId: data.projectId || null,
        projectName: proj?.name || data.projectName || "Company Initiative",
        projectLocation: proj?.location || data.projectLocation || "Multiple Sites",
        country: proj?.country || data.country || "India",
        reportingYear: data.reportingYear || "FY 2025-26",
        initiativeName: data.initiativeName || "New SDG Initiative",
        initiativeDesc: data.initiativeDesc || data.contributionDescription || "",
        esgPillar: data.esgPillar || "Environmental",
        brsrPrinciple: data.brsrPrinciple || "Principle 6 - Environmental Protection & Climate Action",
        brsrIndicator: data.brsrIndicator || "Key BRSR Indicator",
        baselineYear: data.baselineYear || "2023",
        baselineValue: baseVal,
        currentValue: curVal,
        targetValue: tgtVal,
        unit: data.unit || "Units",
        targetYear: data.targetYear || "2026",
        responsibleDept: data.responsibleDept || "Sustainability Cell",
        dataSource: data.dataSource || "Site Metering",
        evidenceRef: data.evidenceRef || "N/A",
        notes: data.notes || "",
        progress: progressPct,
        performanceStatus: perfStatus,
        workflowStatus: workflowStatus,
        submittedBy: isSubmit ? userName : null,
        submissionDate: isSubmit ? now : null,
        reviewedBy: null,
        approvalDate: null,
        reviewerRemarks: null,
        lastUpdated: now,
        history
      };

      this.state.sdgContributions.unshift(newRecord);
      this.saveState();
      this.addAuditLog(userName, isSubmit ? "SDG_SUBMISSION" : "SDG_DRAFT_SAVED", `${isSubmit ? 'Created & Submitted' : 'Created draft for'} SDG ${newRecord.sdgNumber} initiative: ${newRecord.initiativeName} (${sub?.shortName})`);
      return newRecord;
    }
  }

  submitSDGContribution(id, user = null) {
    const item = this.getSDGContributionById(id);
    if (!item) return null;
    const userName = user || (typeof auth !== 'undefined' ? auth.getUserInfo().name : "User");
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    item.workflowStatus = "Submitted";
    item.submittedBy = userName;
    item.submissionDate = now;
    item.lastUpdated = now;
    if (!item.history) item.history = [];
    item.history.push({
      date: now,
      action: "Submitted",
      user: userName,
      remarks: "Submitted for Central MEIL Admin review and group consolidation."
    });

    this.saveState();
    this.addAuditLog(userName, "SDG_SUBMISSION", `Submitted SDG ${item.sdgNumber} initiative ${item.initiativeName} for review.`);
    return item;
  }

  approveSDGContribution(id, remarks = "Verified and approved by Central MEIL ESG Committee.", reviewerName = null) {
    const item = this.getSDGContributionById(id);
    if (!item) return null;
    const user = reviewerName || (typeof auth !== 'undefined' ? auth.getUserInfo().name : "Central MEIL ESG Admin");
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    item.workflowStatus = "Approved";
    item.reviewedBy = user;
    item.approvalDate = now;
    item.reviewerRemarks = remarks;
    item.lastUpdated = now;
    if (!item.history) item.history = [];
    item.history.push({
      date: now,
      action: "Approved",
      user,
      remarks: remarks || "Approved for MEIL Consolidated SDG reporting."
    });

    this.saveState();
    this.addAuditLog(user, "SDG_APPROVAL", `APPROVED SDG ${item.sdgNumber} contribution ${item.id} (${item.initiativeName}). Eligible for consolidated analytics.`);
    return item;
  }

  rejectSDGContribution(id, reason, reviewerName = null) {
    const item = this.getSDGContributionById(id);
    if (!item) return null;
    const user = reviewerName || (typeof auth !== 'undefined' ? auth.getUserInfo().name : "Central MEIL ESG Admin");
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    item.workflowStatus = "Rejected";
    item.reviewedBy = user;
    item.approvalDate = null;
    item.reviewerRemarks = reason || "Filing rejected by reviewer.";
    item.lastUpdated = now;
    if (!item.history) item.history = [];
    item.history.push({
      date: now,
      action: "Rejected",
      user,
      remarks: reason || "Rejected. Correction required."
    });

    this.saveState();
    this.addAuditLog(user, "SDG_REJECTION", `REJECTED SDG ${item.sdgNumber} contribution ${item.id}. Reason: ${reason}`);
    return item;
  }

  requestSDGCorrection(id, remarks, reviewerName = null) {
    const item = this.getSDGContributionById(id);
    if (!item) return null;
    const user = reviewerName || (typeof auth !== 'undefined' ? auth.getUserInfo().name : "Central MEIL ESG Admin");
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    item.workflowStatus = "Correction Required";
    item.reviewedBy = user;
    item.reviewerRemarks = remarks || "Please revise required metrics.";
    item.lastUpdated = now;
    if (!item.history) item.history = [];
    item.history.push({
      date: now,
      action: "Correction Requested",
      user,
      remarks: remarks || "Correction requested."
    });

    this.saveState();
    this.addAuditLog(user, "SDG_CORRECTION_REQUESTED", `Requested correction for SDG ${item.sdgNumber} contribution ${item.id}. Notes: ${remarks}`);
    return item;
  }

  deleteSDGContribution(id) {
    if (!this.state.sdgContributions) return false;
    const idx = this.state.sdgContributions.findIndex(c => c.id === id);
    if (idx !== -1) {
      const removed = this.state.sdgContributions.splice(idx, 1)[0];
      this.saveState();
      this.addAuditLog("User", "SDG_DELETED", `Deleted draft SDG initiative: ${removed.initiativeName}`);
      return true;
    }
    return false;
  }

  // Consolidated & Subsidiary-specific SDG Aggregations
  getSDGContributionSummary(subsidiaryId = null, year = 'FY 2025-26') {
    const all = this.getSDGContributions({ year });
    const isMain = !subsidiaryId || subsidiaryId === 'all';
    
    // For Main Admin Consolidated analytics: Only count APPROVED contributions
    // For Sub Admin: Count all their contributions and show workflow status breakdown
    const list = isMain ? all : all.filter(c => c.subsidiaryId === subsidiaryId);
    const approvedList = list.filter(c => c.workflowStatus === 'Approved');

    // Distinct contributing SDGs
    const distinctSDGs = new Set(list.map(c => c.sdgNumber));
    const approvedSDGs = new Set(approvedList.map(c => c.sdgNumber));

    // Distinct contributing projects & mapped indicators
    const distinctProjects = new Set(list.map(c => c.projectId).filter(Boolean));
    const distinctIndicators = new Set(list.map(c => c.brsrIndicator).filter(Boolean));

    // Progress calculations
    const activeItems = isMain ? approvedList : list;
    const avgProgress = activeItems.length > 0 
      ? Math.round(activeItems.reduce((acc, item) => acc + (Number(item.progress) || 0), 0) / activeItems.length)
      : 0;

    const onTrackCount = list.filter(c => c.performanceStatus === 'On Track' || c.performanceStatus === 'Ahead of Target').length;
    const atRiskCount = list.filter(c => c.performanceStatus === 'At Risk').length;
    const completedCount = list.filter(c => c.performanceStatus === 'Completed').length;
    const notStartedCount = 17 - distinctSDGs.size;

    const pendingReviewCount = list.filter(c => c.workflowStatus === 'Submitted').length;
    const correctionCount = list.filter(c => c.workflowStatus === 'Correction Required').length;
    const approvedCount = list.filter(c => c.workflowStatus === 'Approved').length;
    const draftCount = list.filter(c => c.workflowStatus === 'Draft').length;

    // Goal-by-Goal Breakdown
    const all17SDGs = this.getSDGs();
    const sdgCardMetrics = all17SDGs.map(s => {
      const goalInitiatives = list.filter(c => c.sdgNumber === s.id);
      const goalApproved = goalInitiatives.filter(c => c.workflowStatus === 'Approved');
      const goalProjects = new Set(goalInitiatives.map(c => c.projectId).filter(Boolean));
      const goalIndicators = new Set(goalInitiatives.map(c => c.brsrIndicator).filter(Boolean));
      
      const goalProgress = goalInitiatives.length > 0
        ? Math.round(goalInitiatives.reduce((acc, c) => acc + (Number(c.progress) || 0), 0) / goalInitiatives.length)
        : (s.progress !== undefined ? s.progress : 0);

      let status = "Not Started";
      if (goalInitiatives.length > 0) {
        if (goalProgress >= 100) status = "Completed";
        else if (goalProgress >= 70) status = "On Track";
        else status = "At Risk";
      } else {
        status = s.status || "Not Started";
      }

      return {
        ...s,
        initiativeCount: goalInitiatives.length,
        approvedInitiativeCount: goalApproved.length,
        projectCount: goalProjects.size || (s.linkedProjectIds || []).length,
        indicatorCount: goalIndicators.size || (s.esgIndicators || []).length,
        calculatedProgress: goalProgress,
        status: status,
        initiatives: goalInitiatives
      };
    });

    return {
      totalInitiatives: list.length,
      approvedInitiatives: approvedCount,
      pendingReviewCount,
      correctionCount,
      draftCount,
      contributingSDGsCount: distinctSDGs.size,
      approvedSDGsCount: approvedSDGs.size,
      totalMappedIndicators: distinctIndicators.size,
      contributingProjectsCount: distinctProjects.size,
      overallProgress: avgProgress,
      onTrackCount,
      atRiskCount,
      completedCount,
      notStartedCount: notStartedCount > 0 ? notStartedCount : 0,
      sdgCardMetrics,
      initiatives: list
    };
  }

  calculateProjectScorecard(projectId, year = 'FY 2025-26') {
    const proj = this.getProjectById(projectId);
    if (!proj) return null;

    const env = proj.environment || {};
    const soc = proj.social || {};
    const gov = proj.governance || {};
    const qual = this.validateProjectDataQuality(projectId, year);
    const sub = this.getSubsidiaryById(proj.subsidiaryId);
    const bu = this.getBusinessUnitById(proj.businessUnitId);

    const overallScore = proj.esgCompletion || qual.qualityScore || qual.completionPct || 85;

    return {
      project: proj,
      subsidiary: sub,
      businessUnit: bu,
      overallScore,
      overallESGCompletion: overallScore,
      brsrCompletion: proj.brsrCompletion || 90,
      envScore: 92,
      socScore: 95,
      govScore: 98,
      dataQuality: qual,
      isConsolidated: !!(proj.approved && proj.submissionStatus === 'Approved'),
      status: proj.submissionStatus,
      submissionStatus: proj.submissionStatus,
      environment: {
        ...env,
        electricityMWh: Number(env.electricityMWh) || Number(env.electricityConsumptionMWh) || 0,
        energyMWh: Number(env.electricityMWh) || Number(env.electricityConsumptionMWh) || 0,
        energyScore: Number(env.renewableElectricityMWh) > 0 ? 94 : 75,
        renewablePct: Number(env.electricityConsumptionMWh) > 0 ? Math.round((Number(env.renewableElectricityMWh) / Number(env.electricityConsumptionMWh)) * 100) : 0,
        emissionsTotal: (Number(env.scope1) || 0) + (Number(env.scope2) || 0) + (Number(env.scope3) || 0),
        waterRecycledKL: Number(env.waterRecycledKL) || 0,
        wasteRecycledMT: Number(env.wasteRecycledMT) || 0,
        wasteRecycledPct: Number(env.wasteGeneratedMT) > 0 ? Math.round((Number(env.wasteRecycledMT) / Number(env.wasteGeneratedMT)) * 100) : 0,
        saplings: Number(env.saplingsPlanted) || 0
      },
      social: {
        ...soc,
        safetyScore: Number(soc.fatalities) === 0 ? 98 : 60,
        totalEmployees: Number(soc.totalEmployees) || 0,
        womenPercent: Number(soc.totalEmployees) > 0 ? Math.round((Number(soc.womenEmployees) / Number(soc.totalEmployees)) * 100) : 0,
        ltifr: Number(soc.ltifr) || 0.05,
        fatalities: Number(soc.fatalities) || 0,
        safetyTrainingHours: Number(soc.safetyTrainingManHours) || Number(soc.trainingHoursPerEmployee) || 0,
        csrSpendLakhs: Number(soc.csrActivitiesLakhs) || Number(soc.csrSpendLakhs) || 0,
        grievancesResolved: `${soc.grievancesResolved || 0} / ${soc.grievancesReceived || 0}`
      },
      governance: {
        ...gov,
        complianceScore: gov.policyImplementation === 'Fully Implemented' ? 100 : 80,
        policyStatus: gov.policyImplementation || 'Implemented',
        antiCorruptionTrainedPct: gov.antiCorruptionTrainingPct || gov.antiCorruptionTrainingPercent || 98.0,
        whistleblowerCases: gov.whistleblowerCases || 0,
        complianceStatus: gov.complianceStatus || 'Compliant',
        cybersecurityStatus: gov.cybersecurityAudit || 'Certified'
      },
      sdgs: (proj.sdgs || []).map(id => this.getSDGById(id)).filter(Boolean)
    };
  }

  getSubmissions(year = "FY 2025-26", subsidiaryId = null) {
    let list = this.state.submissions || [];
    if (year && year !== 'all') {
      list = list.filter(s => (s.year === year || s.reportingYear === year));
    }
    if (subsidiaryId && subsidiaryId !== 'all') {
      list = list.filter(s => s.subsidiaryId === subsidiaryId);
    } else if (!subsidiaryId && typeof auth !== 'undefined' && auth.isAuthenticated() && !auth.isMainAdmin()) {
      const activeSub = auth.getActiveSubsidiaryId();
      if (activeSub) {
        list = list.filter(s => s.subsidiaryId === activeSub);
      }
    }
    return list;
  }

  getSubmissionById(id) {
    return this.state.submissions.find(s => s.id === id);
  }

  getESGData(subsidiaryId, year = "FY 2025-26") {
    const key = `${subsidiaryId}_${year}`;
    return this.state.esgData[key] || null;
  }

  getBRSRData(subsidiaryId, year = "FY 2025-26") {
    const key = `${subsidiaryId}_${year}`;
    return this.state.brsrData[key] || null;
  }

  getNotifications(role = "all", subsidiaryId = null) {
    return this.state.notifications.filter(n => {
      if (role === "main_admin") return n.role === "all" || n.role === "main_admin";
      if (role === "sub_admin") {
        return (n.role === "all" || n.role === "sub_admin") && (!n.subsidiaryId || n.subsidiaryId === subsidiaryId);
      }
      return true;
    });
  }

  // =========================================================================
  // DYNAMIC CONSOLIDATION ENGINE (CRITICAL: Only APPROVED records roll up)
  // =========================================================================
  calculateConsolidatedData(year = "FY 2025-26") {
    const submissions = this.getSubmissions(year);
    const approvedSubs = submissions.filter(s => s.status === "Approved");
    const approvedSubsidiaryIds = approvedSubs.map(s => s.subsidiaryId);

    const consolidated = {
      year,
      approvedSubsidiariesCount: approvedSubs.length,
      totalSubsidiariesCount: this.state.subsidiaries.length,
      consolidationRate: Math.round((approvedSubs.length / this.state.subsidiaries.length) * 100),
      
      // Environmental Totals
      totalEnergyMWh: 0,
      renewableEnergyMWh: 0,
      nonRenewableEnergyMWh: 0,
      renewablePercent: 0,
      waterWithdrawalKL: 0,
      waterConsumptionKL: 0,
      waterRecycledKL: 0,
      waterRecycledPercent: 0,
      wasteGeneratedMT: 0,
      wasteRecycledMT: 0,
      wasteDisposalMT: 0,
      wasteRecycledPercent: 0,
      ghgScope1: 0,
      ghgScope2: 0,
      ghgScope3: 0,
      totalGHG: 0,
      biodiversitySaplings: 0,

      // Social Totals
      totalEmployees: 0,
      maleEmployees: 0,
      femaleEmployees: 0,
      femalePercentage: 0,
      permanentEmployees: 0,
      contractualEmployees: 0,
      safetyTrainingManHours: 0,
      workplaceIncidents: 0,
      ltifrAverage: 0,
      fatalities: 0,
      csrSpendLakhs: 0,
      csrBeneficiaries: 0,
      grievancesReceived: 0,
      grievancesResolved: 0,
      grievanceResolutionRate: 100,

      // Governance
      boardTotalMembers: 0,
      independentDirectors: 0,
      independentPercent: 0,
      womenDirectors: 0,
      womenDirectorsPercent: 0,
      antiCorruptionTrainedAvg: 0,
      whistleblowerTotal: 0,
      whistleblowerResolved: 0,

      // BRSR
      brsrOverallCompletion: 0,
      principleScores: Array.from({ length: 9 }, (_, i) => ({ number: i + 1, totalScore: 0, count: 0, avgScore: 0 }))
    };

    if (approvedSubsidiaryIds.length === 0) {
      return consolidated;
    }

    let ltifrSum = 0;
    let antiCorruptionSum = 0;
    let brsrSum = 0;

    approvedSubsidiaryIds.forEach(subId => {
      const esg = this.getESGData(subId, year);
      const brsr = this.getBRSRData(subId, year);

      if (esg) {
        // Env
        const env = esg.environment || {};
        consolidated.totalEnergyMWh += Number(env.totalEnergyMWh) || 0;
        consolidated.renewableEnergyMWh += Number(env.renewableEnergyMWh) || 0;
        consolidated.nonRenewableEnergyMWh += Number(env.nonRenewableEnergyMWh) || 0;
        consolidated.waterWithdrawalKL += Number(env.waterWithdrawalKL) || 0;
        consolidated.waterConsumptionKL += Number(env.waterConsumptionKL) || 0;
        consolidated.waterRecycledKL += Number(env.waterRecycledKL) || 0;
        consolidated.wasteGeneratedMT += Number(env.wasteGeneratedMT) || 0;
        consolidated.wasteRecycledMT += Number(env.wasteRecycledMT) || 0;
        consolidated.wasteDisposalMT += Number(env.wasteDisposalMT) || 0;
        consolidated.ghgScope1 += Number(env.ghgScope1) || 0;
        consolidated.ghgScope2 += Number(env.ghgScope2) || 0;
        consolidated.ghgScope3 += Number(env.ghgScope3) || 0;
        consolidated.totalGHG += Number(env.totalGHG) || 0;
        consolidated.biodiversitySaplings += Number(env.biodiversitySaplings) || 0;

        // Social
        const soc = esg.social || {};
        consolidated.totalEmployees += Number(soc.totalEmployees) || 0;
        consolidated.maleEmployees += Number(soc.maleEmployees) || 0;
        consolidated.femaleEmployees += Number(soc.femaleEmployees) || 0;
        consolidated.permanentEmployees += Number(soc.permanentEmployees) || 0;
        consolidated.contractualEmployees += Number(soc.contractualEmployees) || 0;
        consolidated.safetyTrainingManHours += Number(soc.safetyTrainingManHours) || 0;
        consolidated.workplaceIncidents += Number(soc.workplaceIncidents) || 0;
        consolidated.fatalities += Number(soc.fatalities) || 0;
        consolidated.csrSpendLakhs += Number(soc.csrSpendLakhs) || 0;
        consolidated.csrBeneficiaries += Number(soc.csrBeneficiaries) || 0;
        consolidated.grievancesReceived += Number(soc.grievancesReceived) || 0;
        consolidated.grievancesResolved += Number(soc.grievancesResolved) || 0;
        ltifrSum += Number(soc.ltifr) || 0;

        // Gov
        const gov = esg.governance || {};
        consolidated.boardTotalMembers += Number(gov.boardTotalMembers) || 0;
        consolidated.independentDirectors += Number(gov.independentDirectors) || 0;
        consolidated.womenDirectors += Number(gov.womenDirectors) || 0;
        antiCorruptionSum += Number(gov.antiCorruptionTrainedPercent) || 0;
        consolidated.whistleblowerTotal += Number(gov.whistleblowerCasesReported) || 0;
        consolidated.whistleblowerResolved += Number(gov.whistleblowerCasesResolved) || 0;
      }

      if (brsr) {
        const secC = brsr.sectionC || {};
        brsrSum += secC.completed || 0;
        if (secC.principles) {
          secC.principles.forEach(p => {
            const item = consolidated.principleScores.find(x => x.number === p.number);
            if (item) {
              item.totalScore += Number(p.score) || 0;
              item.count += 1;
            }
          });
        }
      }
    });

    const count = approvedSubsidiaryIds.length;

    // Derived percentages
    if (consolidated.totalEnergyMWh > 0) {
      consolidated.renewablePercent = Math.round((consolidated.renewableEnergyMWh / consolidated.totalEnergyMWh) * 1000) / 10;
    }
    if (consolidated.waterWithdrawalKL > 0) {
      consolidated.waterRecycledPercent = Math.round((consolidated.waterRecycledKL / consolidated.waterWithdrawalKL) * 1000) / 10;
    }
    if (consolidated.wasteGeneratedMT > 0) {
      consolidated.wasteRecycledPercent = Math.round((consolidated.wasteRecycledMT / consolidated.wasteGeneratedMT) * 1000) / 10;
    }
    if (consolidated.totalEmployees > 0) {
      consolidated.femalePercentage = Math.round((consolidated.femaleEmployees / consolidated.totalEmployees) * 1000) / 10;
    }
    if (consolidated.boardTotalMembers > 0) {
      consolidated.independentPercent = Math.round((consolidated.independentDirectors / consolidated.boardTotalMembers) * 1000) / 10;
      consolidated.womenDirectorsPercent = Math.round((consolidated.womenDirectors / consolidated.boardTotalMembers) * 1000) / 10;
    }
    if (consolidated.grievancesReceived > 0) {
      consolidated.grievanceResolutionRate = Math.round((consolidated.grievancesResolved / consolidated.grievancesReceived) * 100);
    }

    consolidated.ltifrAverage = Math.round((ltifrSum / count) * 100) / 100;
    consolidated.antiCorruptionTrainedAvg = Math.round((antiCorruptionSum / count) * 10) / 10;
    consolidated.brsrOverallCompletion = Math.round(brsrSum / count);

    consolidated.principleScores.forEach(p => {
      p.avgScore = p.count > 0 ? Math.round(p.totalScore / p.count) : 0;
    });

    return consolidated;
  }

  // =========================================================================
  // Dashboard Metrics Calculator
  // =========================================================================
  calculateDashboardMetrics(role = "main_admin", subsidiaryId = "sub-3", year = "FY 2025-26") {
    // For main_admin, query across all subsidiaries explicitly
    const submissions = this.getSubmissions(year, role === "main_admin" ? 'all' : subsidiaryId);

    if (role === "main_admin") {
      const consolidated = this.calculateConsolidatedData(year);
      const totalSubs = this.state.subsidiaries.length;
      const totalBUs = this.state.businessUnits.length;
      const totalProjs = this.state.projects.length;

      const submitted = submissions.filter(s => s.status === "Submitted" || s.rawStatus === "Submitted").length;
      const pendingReview = submissions.filter(s => s.status === "Submitted" || s.status === "Under Review" || s.status === "Under_Review" || s.rawStatus === "Submitted" || s.rawStatus === "Under_Review").length;
      const approved = submissions.filter(s => s.status === "Approved" || s.rawStatus === "Approved").length;
      const rejected = submissions.filter(s => s.status === "Rejected" || s.rawStatus === "Rejected").length;
      const correction = submissions.filter(s => s.status === "Correction Required" || s.status === "Correction_Required" || s.rawStatus === "Correction_Required").length;
      const drafts = submissions.filter(s => s.status === "Draft" || s.rawStatus === "Draft").length;

      return {
        role: "main_admin",
        totalSubsidiaries: totalSubs,
        totalBusinessUnits: totalBUs,
        totalProjects: totalProjs,
        totalSubmissions: submissions.length,
        submittedCount: submitted,
        pendingReviewsCount: pendingReview,
        approvedCount: approved,
        rejectedCount: rejected,
        correctionRequiredCount: correction,
        draftCount: drafts,
        consolidated,
        overallESGScore: approved > 0 ? Math.round((approved / totalSubs) * 90 + 10) : 0,
        overallBRSRScore: consolidated.brsrOverallCompletion
      };
    } else {
      // Sub-Company Admin metrics
      const sub = this.getSubsidiaryById(subsidiaryId) || this.state.subsidiaries[0];
      const buList = this.getBusinessUnits(sub.id);
      const projList = this.getProjects(sub.id);
      const subSubmission = submissions.find(s => s.subsidiaryId === sub.id) || {
        status: "Draft",
        lastUpdated: "Not submitted"
      };

      const esg = this.getESGData(sub.id, year) || { environment: {}, social: {}, governance: {} };
      const brsr = this.getBRSRData(sub.id, year) || { sectionA: { completed: 0 }, sectionB: { completed: 0 }, sectionC: { completed: 0 } };

      const esgCompletion = subSubmission.status === "Approved" ? 100 : (subSubmission.status === "Submitted" ? 95 : (subSubmission.status === "Correction Required" ? 82 : 65));
      const brsrCompletion = brsr.sectionC?.completed || 70;

      return {
        role: "sub_admin",
        subsidiary: sub,
        totalBusinessUnits: buList.length,
        totalProjects: projList.length,
        submissionStatus: subSubmission.status,
        submissionId: subSubmission.id,
        lastUpdated: subSubmission.lastUpdated,
        reviewerNotes: subSubmission.reviewerNotes || esg.reviewerComments || null,
        esgCompletion,
        brsrCompletion,
        esg,
        brsr
      };
    }
  }

  // =========================================================================
  // State Mutators & Workflow Actions
  // =========================================================================
  updateESGData(subsidiaryId, year, category, data) {
    const key = `${subsidiaryId}_${year}`;
    if (!this.state.esgData[key]) {
      this.state.esgData[key] = { subsidiaryId, year, status: "Draft", environment: {}, social: {}, governance: {} };
    }
    this.state.esgData[key][category] = { ...this.state.esgData[key][category], ...data };
    this.state.esgData[key].lastUpdated = new Date().toISOString().slice(0, 16).replace('T', ' ');
    
    this.saveState();
  }

  updateBRSRSection(subsidiaryId, year, sectionKey, data) {
    const key = `${subsidiaryId}_${year}`;
    if (!this.state.brsrData[key]) {
      this.state.brsrData[key] = { subsidiaryId, year, status: "Draft", sectionA: {}, sectionB: {}, sectionC: {} };
    }
    this.state.brsrData[key][sectionKey] = { ...this.state.brsrData[key][sectionKey], ...data };
    this.saveState();
  }

  setSubmissionStatus(submissionId, newStatus, reviewerNotes = null, reviewerName = "Main Company Admin") {
    const subm = this.getSubmissionById(submissionId);
    if (!subm) return false;

    const prevStatus = subm.status;
    subm.status = newStatus;
    subm.lastUpdated = new Date().toISOString().slice(0, 16).replace('T', ' ');

    if (reviewerNotes) {
      subm.reviewerNotes = reviewerNotes;
      subm.reviewedBy = reviewerName;
    }

    if (newStatus === "Approved") {
      subm.approvalDate = subm.lastUpdated;
    }

    // Sync ESG data status
    const esgKey = `${subm.subsidiaryId}_${subm.year}`;
    if (this.state.esgData[esgKey]) {
      this.state.esgData[esgKey].status = newStatus;
      if (reviewerNotes) {
        this.state.esgData[esgKey].reviewerComments = reviewerNotes;
        this.state.esgData[esgKey].reviewerDate = subm.lastUpdated;
        this.state.esgData[esgKey].reviewerName = reviewerName;
        if (!this.state.esgData[esgKey].correctionHistory) this.state.esgData[esgKey].correctionHistory = [];
        this.state.esgData[esgKey].correctionHistory.push({
          date: subm.lastUpdated,
          action: newStatus,
          reviewer: reviewerName,
          note: reviewerNotes
        });
      }
    }

    // Add audit notification
    this.addNotification({
      role: "all",
      subsidiaryId: subm.subsidiaryId,
      type: newStatus === "Approved" ? "approval" : (newStatus === "Correction Required" ? "correction" : "submission"),
      title: `Submission ${newStatus}: ${subm.subsidiaryName}`,
      desc: reviewerNotes ? `Note: ${reviewerNotes}` : `Status updated to ${newStatus} by ${reviewerName}`,
      icon: newStatus === "Approved" ? "CheckCircle" : (newStatus === "Correction Required" ? "AlertTriangle" : "FileText"),
      color: newStatus === "Approved" ? "success" : (newStatus === "Correction Required" ? "warning" : "info")
    });

    // Call backend API in background to maintain server authorization & persistence
    if (typeof api !== 'undefined') {
      if (newStatus === "Approved") {
        api.approveSubmission(submissionId, reviewerNotes).catch(e => console.warn('[Store] API approve notice:', e));
      } else if (newStatus === "Correction Required") {
        api.requestCorrection(submissionId, reviewerNotes).catch(e => console.warn('[Store] API correction notice:', e));
      } else if (newStatus === "Rejected") {
        api.rejectSubmission(submissionId, reviewerNotes).catch(e => console.warn('[Store] API rejection notice:', e));
      } else if (newStatus === "Submitted") {
        api.submitSubmission(submissionId).catch(e => console.warn('[Store] API submit notice:', e));
      }
    }

    this.saveState();
    return true;
  }

  submitDataForReview(subsidiaryId, year = "FY 2025-26", submittedBy = "Sub-Company Admin") {
    let subm = this.state.submissions.find(s => s.subsidiaryId === subsidiaryId && (s.year === year || s.reportingYear === year));
    const sub = this.getSubsidiaryById(subsidiaryId);
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    if (!subm) {
      const newId = `SUBM-${new Date().getFullYear()}-${String(this.state.submissions.length + 1).padStart(3, '0')}`;
      subm = {
        id: newId,
        subsidiaryId,
        subsidiaryName: sub ? sub.name : "Subsidiary",
        subsidiaryCode: sub ? sub.code : "",
        year,
        reportingYear: year,
        reportType: "Integrated ESG & BRSR Report",
        submittedBy,
        submissionDate: nowStr,
        submittedAt: nowStr,
        status: "Submitted",
        rawStatus: "Submitted",
        lastUpdated: nowStr,
        reviewedBy: null,
        approvalDate: null,
        esgScore: 90,
        brsrScore: 92,
        reviewerNotes: "Awaiting Main Admin Review"
      };
      this.state.submissions.push(subm);
    } else {
      subm.status = (subm.status === "Correction Required" || subm.status === "Correction_Required") ? "Resubmitted" : "Submitted";
      subm.rawStatus = "Submitted";
      subm.lastUpdated = nowStr;
      subm.submissionDate = nowStr;
      subm.submittedAt = nowStr;
      subm.submittedBy = submittedBy;
      if (!subm.subsidiaryName && sub) subm.subsidiaryName = sub.name;
    }

    // Sync ESG data status
    const esgKey = `${subsidiaryId}_${year}`;
    if (this.state.esgData[esgKey]) {
      this.state.esgData[esgKey].status = subm.status;
    }

    this.addNotification({
      role: "main_admin",
      subsidiaryId,
      type: "submission",
      title: `${subm.status === "Resubmitted" ? "Resubmission" : "New Submission"}: ${sub?.name || 'Subsidiary'}`,
      desc: `${submittedBy} has submitted data for ${year}. Ready for Main Company Admin verification.`,
      icon: "FileUp",
      color: "info"
    });

    this.saveState();
    return subm;
  }

  addNotification(notif) {
    const id = `notif-${Date.now()}`;
    const newNotif = {
      id,
      role: notif.role || "all",
      subsidiaryId: notif.subsidiaryId || null,
      type: notif.type || "info",
      title: notif.title,
      desc: notif.desc,
      time: "Just now",
      timestamp: new Date().toISOString(),
      read: false,
      icon: notif.icon || "Bell",
      color: notif.color || "info"
    };
    this.state.notifications.unshift(newNotif);
  }

  markAllNotificationsRead() {
    if (typeof api !== 'undefined' && api.getToken()) {
      api.markAllNotificationsRead().catch(err => console.warn('[Store] markAllNotificationsRead notice:', err));
    }
    this.state.notifications.forEach(n => n.read = true);
    this.saveState();
  }

  markNotificationRead(id) {
    if (typeof api !== 'undefined' && api.getToken()) {
      api.markNotificationRead(id).catch(err => console.warn('[Store] markNotificationRead notice:', err));
    }
    const notif = this.state.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveState();
    }
  }

  // =========================================================================
  // ENTITY MANAGEMENT – Subsidiaries, Business Units, Projects (CRUD + Soft Delete)
  // =========================================================================

  // addSubsidiary defined below with full implementation

  updateSubsidiary(id, data) {
    const sub = this.state.subsidiaries.find(s => s.id === id);
    if (!sub) return false;
    Object.assign(sub, data, { lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ') });
    this.saveState();
    return sub;
  }

  softDeleteSubsidiary(id) {
    const sub = this.state.subsidiaries.find(s => s.id === id);
    if (!sub) return false;
    sub.status = sub.status === 'Inactive' ? 'Active' : 'Inactive';
    sub.lastUpdated = new Date().toISOString().slice(0, 16).replace('T', ' ');
    this.saveState();
    return sub;
  }

  addBusinessUnit(data) {
    const id = `bu-${Date.now()}`;
    const newBU = {
      id,
      subsidiaryId: data.subsidiaryId,
      name: data.name || 'New Business Unit',
      head: data.head || '',
      activities: data.activities || '',
      projectCount: 0,
      esgStatus: 'Draft',
      status: 'Active'
    };
    this.state.businessUnits.push(newBU);
    // Update parent subsidiary buCount
    const sub = this.state.subsidiaries.find(s => s.id === data.subsidiaryId);
    if (sub) sub.buCount = this.state.businessUnits.filter(b => b.subsidiaryId === data.subsidiaryId && b.status !== 'Inactive').length;
    this.saveState();
    return newBU;
  }

  updateBusinessUnit(id, data) {
    const bu = this.state.businessUnits.find(b => b.id === id);
    if (!bu) return false;
    Object.assign(bu, data);
    this.saveState();
    return bu;
  }

  softDeleteBusinessUnit(id) {
    const bu = this.state.businessUnits.find(b => b.id === id);
    if (!bu) return false;
    bu.status = bu.status === 'Inactive' ? 'Active' : 'Inactive';
    this.saveState();
    return bu;
  }

  // addProject defined below with full implementation

  updateProject(id, data) {
    const proj = this.state.projects.find(p => p.id === id);
    if (!proj) return false;
    Object.assign(proj, data);
    this.saveState();
    return proj;
  }

  softDeleteProject(id) {
    const proj = this.state.projects.find(p => p.id === id);
    if (!proj) return false;
    proj.status = proj.status === 'Inactive' ? 'Planning' : 'Inactive';
    this.saveState();
    return proj;
  }

  // =========================================================================
  // USER ACCESS MANAGEMENT & RBAC
  // =========================================================================
  getUsers() {
    if (!this.state.users || this.state.users.length === 0) {
      this.state.users = JSON.parse(JSON.stringify(DEFAULT_DATA.users || []));
    }
    return this.state.users;
  }

  getUserByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return this.getUsers().find(u => u.email.toLowerCase() === clean);
  }

  // updateUserAccess defined below with full implementation

  resetUserPassword(userId, newPassword = "admin") {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    user.password = newPassword;
    this.addAuditLog("Admin", "PASSWORD_RESET", `Password reset for user ${user.email}`);
    this.saveState();
    return true;
  }

  addUser(data) {
    const users = this.getUsers();
    const sub = this.getSubsidiaryById(data.subsidiaryId);
    const newUser = {
      id: `usr-${Date.now()}`,
      subsidiaryId: data.subsidiaryId || null,
      subsidiaryName: sub ? sub.name : null,
      name: data.name,
      email: data.email,
      role: data.role || "SUB_ADMIN",
      title: data.title || (data.role === "MAIN_ADMIN" ? "Group Sustainability Officer" : "Subsidiary ESG Officer"),
      status: "ACTIVE",
      accessStatus: "Active",
      lastLogin: "Never",
      createdAt: new Date().toISOString().slice(0, 10)
    };

    if (typeof api !== 'undefined' && api.getToken()) {
      api.createUser({
        name: data.name,
        email: data.email,
        password: data.password || "TempPass#2026",
        role: data.role || "SUB_ADMIN",
        title: data.title,
        subsidiaryId: data.subsidiaryId || null
      }).then(res => {
        if (res && res.success && res.data) {
          newUser.id = res.data.id;
        }
      }).catch(err => console.warn('[Store] createUser backend notice:', err));
    }

    users.push(newUser);
    this.addAuditLog("Admin", "USER_CREATED", `Created user account for ${newUser.name} (${newUser.email})`);
    this.saveState();
    return newUser;
  }

  deleteUser(userId) {
    if (typeof api !== 'undefined' && api.getToken()) {
      api.deleteUser(userId).catch(err => console.warn('[Store] deleteUser backend notice:', err));
    }
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      const removed = users.splice(idx, 1)[0];
      this.addAuditLog("Admin", "USER_DELETED", `Removed user account ${removed.email}`);
      this.saveState();
      return true;
    }
    return false;
  }

  updateUserAccess(userId, status) {
    if (typeof api !== 'undefined' && api.getToken()) {
      api.updateUserAccess(userId, status).catch(err => console.warn('[Store] updateUserAccess backend notice:', err));
    }
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    user.status = status.toUpperCase();
    user.accessStatus = status;
    this.addAuditLog("Admin", "USER_STATUS_CHANGE", `Changed user ${user.email} status to ${status}`);
    this.saveState();
    return true;
  }

  addSubsidiary(data) {
    const subs = this.getSubsidiaries();
    const id = `sub-${subs.length + 1}`;
    const newSub = {
      id: id,
      name: data.name,
      shortName: data.shortName || data.name,
      cin: data.cin || "U45200TG2006PTC051234",
      businessType: data.businessType || "Infrastructure",
      headquarters: data.headquarters || "Hyderabad, Telangana",
      leadAdminName: data.leadAdminName || "Assigned Officer",
      leadAdminEmail: data.leadAdminEmail || `admin@${id}.in`,
      buCount: 1,
      projectCount: 1,
      complianceScore: 75,
      status: "Active",
      lastUpdated: new Date().toISOString().slice(0, 10)
    };

    if (typeof api !== 'undefined' && api.getToken()) {
      api.createSubsidiary({
        name: data.name,
        code: (data.code || data.shortName || data.name.substring(0, 4)).toUpperCase(),
        sector: data.businessType || data.sector || "Infrastructure",
        location: data.headquarters || "Hyderabad, India"
      }).then(res => {
        if (res && res.success && res.data) {
          newSub.id = res.data.id;
        }
      }).catch(err => console.warn('[Store] createSubsidiary backend notice:', err));
    }

    subs.push(newSub);
    this.addAuditLog("Admin", "SUBSIDIARY_ADDED", `Added subsidiary ${newSub.name}`);
    this.saveState();
    return newSub;
  }

  addProject(data) {
    const projs = this.getProjects();
    const newProj = {
      id: `proj-${Date.now()}`,
      subsidiaryId: data.subsidiaryId,
      code: data.code || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name,
      businessUnitId: data.businessUnitId || data.buId || "bu-1",
      location: data.location || "India",
      status: data.status || "Active",
      esgCompletion: Number(data.esgCompletion) || 75,
      brsrCompletion: Number(data.brsrCompletion) || 70,
      approved: false
    };

    if (typeof api !== 'undefined' && api.getToken()) {
      api.createProject({
        name: data.name,
        code: data.code || newProj.code,
        buId: data.businessUnitId || data.buId || "bu-1",
        subsidiaryId: data.subsidiaryId,
        location: data.location || "India",
        projectType: data.projectType || "Infrastructure",
        reportingYear: data.reportingYear || "FY 2025-26",
        valueCr: Number(data.valueCr) || 0
      }).then(res => {
        if (res && res.success && res.data) {
          newProj.id = res.data.id;
        }
      }).catch(err => console.warn('[Store] createProject backend notice:', err));
    }

    projs.push(newProj);
    this.addAuditLog("User", "PROJECT_ADDED", `Added project ${newProj.name} (${newProj.code})`);
    this.saveState();
    return newProj;
  }

  // =========================================================================
  // GRANULAR BUSINESS ACTIVITIES & NIC CLASSIFICATION
  // =========================================================================
  getBusinessActivities(subsidiaryId) {
    if (!this.state.businessActivities) {
      this.state.businessActivities = JSON.parse(JSON.stringify(DEFAULT_DATA.businessActivities || {}));
    }
    return this.state.businessActivities[subsidiaryId] || {
      nicCode: "General Manufacturing / Operations",
      products: "Engineering and statutory infrastructure deliverables",
      turnoverCr: 500.0,
      exportSharePct: 0.0,
      greenCapexCr: 50.0,
      rdCleanTechPct: 1.5
    };
  }

  updateBusinessActivities(subsidiaryId, data) {
    if (!this.state.businessActivities) {
      this.state.businessActivities = JSON.parse(JSON.stringify(DEFAULT_DATA.businessActivities || {}));
    }
    this.state.businessActivities[subsidiaryId] = {
      ...this.getBusinessActivities(subsidiaryId),
      ...data,
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    this.addAuditLog("User", "BUSINESS_ACTIVITIES_UPDATE", `Updated business activities & NIC disclosures for subsidiary ${subsidiaryId}`);
    this.saveState();
    return this.state.businessActivities[subsidiaryId];
  }

  // =========================================================================
  // MANUFACTURING PLANTS & OPERATIONAL FACILITIES
  // =========================================================================
  getFacilities(subsidiaryId) {
    if (!this.state.facilities) {
      this.state.facilities = JSON.parse(JSON.stringify(DEFAULT_DATA.facilities || {}));
    }
    return this.state.facilities[subsidiaryId] || [];
  }

  addFacility(subsidiaryId, facility) {
    if (!this.state.facilities) {
      this.state.facilities = JSON.parse(JSON.stringify(DEFAULT_DATA.facilities || {}));
    }
    if (!this.state.facilities[subsidiaryId]) {
      this.state.facilities[subsidiaryId] = [];
    }
    this.state.facilities[subsidiaryId].push({
      id: `fac-${Date.now()}`,
      name: facility.name || "Operational Facility",
      location: facility.location || "India",
      capacity: facility.capacity || "Operational",
      ecNumber: facility.ecNumber || "Pending / Exemption",
      iso: facility.iso || "ISO 14001"
    });
    this.addAuditLog("User", "FACILITY_ADDED", `Added facility ${facility.name} to subsidiary ${subsidiaryId}`);
    this.saveState();
    return this.state.facilities[subsidiaryId];
  }

  deleteFacility(subsidiaryId, index) {
    const list = this.getFacilities(subsidiaryId);
    if (list && list[index]) {
      const removed = list.splice(index, 1)[0];
      this.addAuditLog("User", "FACILITY_REMOVED", `Removed facility ${removed.name} from subsidiary ${subsidiaryId}`);
      this.saveState();
      return true;
    }
    return false;
  }

  // =========================================================================
  // AUDIT LOGS FOR STATUTORY COMPLIANCE & ACCOUNTABILITY
  // =========================================================================
  getAuditLogs() {
    if (!this.state.auditLogs) {
      this.state.auditLogs = JSON.parse(JSON.stringify(DEFAULT_DATA.auditLogs || []));
    }
    return this.state.auditLogs;
  }

  addAuditLog(user, action, details) {
    if (!this.state.auditLogs) {
      this.state.auditLogs = [];
    }
    const log = {
      id: `log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: user || "System",
      action: action || "ACTION",
      details: details || ""
    };
    this.state.auditLogs.unshift(log);
    // Keep max 200 logs
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs.pop();
    }
    this.saveState();
    return log;
  }
}

// Global Singleton Store Instance
const store = new AppStore();
window.store = store;


