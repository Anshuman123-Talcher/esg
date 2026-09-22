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
    if (!subsidiaryId) return this.state.businessUnits;
    return this.state.businessUnits.filter(bu => bu.subsidiaryId === subsidiaryId);
  }

  getProjects(subsidiaryId = null, buId = null) {
    let projs = this.state.projects;
    if (subsidiaryId) projs = projs.filter(p => p.subsidiaryId === subsidiaryId);
    if (buId) projs = projs.filter(p => p.buId === buId);
    return projs;
  }

  getSubmissions(year = "FY 2025-26", subsidiaryId = null) {
    let list = this.state.submissions;
    if (year && year !== 'all') list = list.filter(s => s.year === year);
    if (subsidiaryId && subsidiaryId !== 'all') list = list.filter(s => s.subsidiaryId === subsidiaryId);
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
    const submissions = this.getSubmissions(year);

    if (role === "main_admin") {
      const consolidated = this.calculateConsolidatedData(year);
      const totalSubs = this.state.subsidiaries.length;
      const totalBUs = this.state.businessUnits.length;
      const totalProjs = this.state.projects.length;

      const submitted = submissions.filter(s => s.status === "Submitted").length;
      const pendingReview = submissions.filter(s => s.status === "Submitted" || s.status === "Under Review").length;
      const approved = submissions.filter(s => s.status === "Approved").length;
      const rejected = submissions.filter(s => s.status === "Rejected").length;
      const correction = submissions.filter(s => s.status === "Correction Required").length;
      const drafts = submissions.filter(s => s.status === "Draft").length;

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
      desc: reviewerNotes ? `Status changed to ${newStatus}. Note: "${reviewerNotes}"` : `Status updated from ${prevStatus} to ${newStatus}.`,
      icon: newStatus === "Approved" ? "CheckCircle2" : (newStatus === "Correction Required" ? "CircleAlert" : "FileText"),
      color: newStatus === "Approved" ? "success" : (newStatus === "Correction Required" ? "danger" : "info")
    });

    this.saveState();
    return true;
  }

  submitDataForReview(subsidiaryId, year = "FY 2025-26", submittedBy = "Sub-Company Admin") {
    let subm = this.state.submissions.find(s => s.subsidiaryId === subsidiaryId && s.year === year);
    const sub = this.getSubsidiaryById(subsidiaryId);
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    if (!subm) {
      const newId = `SUBM-${new Date().getFullYear()}-${String(this.state.submissions.length + 1).padStart(3, '0')}`;
      subm = {
        id: newId,
        subsidiaryId,
        subsidiaryName: sub ? sub.name : "Subsidiary",
        year,
        reportType: "Integrated ESG & BRSR Report",
        submittedBy,
        submissionDate: nowStr,
        status: "Submitted",
        lastUpdated: nowStr,
        reviewedBy: null,
        approvalDate: null,
        esgScore: 90,
        brsrScore: 92,
        reviewerNotes: "Awaiting Main Admin Review"
      };
      this.state.submissions.push(subm);
    } else {
      subm.status = subm.status === "Correction Required" ? "Resubmitted" : "Submitted";
      subm.lastUpdated = nowStr;
      subm.submissionDate = nowStr;
      subm.submittedBy = submittedBy;
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
    this.state.notifications.forEach(n => n.read = true);
    this.saveState();
  }

  // =========================================================================
  // ENTITY MANAGEMENT – Subsidiaries, Business Units, Projects (CRUD + Soft Delete)
  // =========================================================================

  addSubsidiary(data) {
    const id = `sub-${Date.now()}`;
    const newSub = {
      id,
      name: data.name || 'New Subsidiary',
      shortName: data.shortName || data.name || 'Subsidiary',
      cin: data.cin || '',
      headquarters: data.headquarters || '',
      businessType: data.businessType || '',
      leadAdminName: data.leadAdminName || '',
      leadAdminEmail: data.leadAdminEmail || '',
      buCount: 0,
      projectCount: 0,
      status: 'Active',
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
      complianceScore: 0
    };
    this.state.subsidiaries.push(newSub);
    this.saveState();
    return newSub;
  }

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

  addProject(data) {
    const id = `prj-${Date.now()}`;
    const sub = this.state.subsidiaries.find(s => s.id === data.subsidiaryId);
    const newProj = {
      id,
      code: data.code || `PRJ-${Date.now()}`,
      name: data.name || 'New Project',
      subsidiaryId: data.subsidiaryId,
      buId: data.buId || null,
      location: data.location || '',
      status: data.status || 'Planning',
      progress: Number(data.progress) || 0,
      esgCompletion: 0,
      brsrCompletion: 0,
      approved: false
    };
    this.state.projects.push(newProj);
    if (sub) sub.projectCount = this.state.projects.filter(p => p.subsidiaryId === data.subsidiaryId).length;
    this.saveState();
    return newProj;
  }

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

  updateUserAccess(userId, newStatus) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    user.status = newStatus === 'Active' ? 'ACTIVE' : (newStatus === 'Suspended' ? 'SUSPENDED' : 'INACTIVE');
    user.accessStatus = newStatus;
    this.addAuditLog("Admin", "USER_ACCESS_UPDATE", `User ${user.email} status changed to ${newStatus}`);
    this.saveState();
    return user;
  }

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
      password: data.password || "admin",
      role: data.role || "SUB_ADMIN",
      title: data.title || (data.role === "MAIN_ADMIN" ? "Group Sustainability Officer" : "Subsidiary ESG Officer"),
      status: "ACTIVE",
      accessStatus: "Active",
      lastLogin: "Never",
      createdAt: new Date().toISOString().slice(0, 10)
    };
    users.push(newUser);
    this.addAuditLog("Admin", "USER_CREATED", `Created user account for ${newUser.name} (${newUser.email})`);
    this.saveState();
    return newUser;
  }

  deleteUser(userId) {
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
      businessUnitId: data.businessUnitId || "bu-1",
      location: data.location || "India",
      status: data.status || "Active",
      esgCompletion: Number(data.esgCompletion) || 75,
      brsrCompletion: Number(data.brsrCompletion) || 70,
      approved: false
    };
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


