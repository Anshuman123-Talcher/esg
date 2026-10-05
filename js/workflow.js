/**
 * ESG & BRSR 11-Step Workflow and Review Lifecycle Controller
 * MEIL Centralized Sustainability System
 * Server-authoritative workflow manager backed by Express REST API
 */

class WorkflowManager {
  constructor() {
    this.activeSubmissionUnderReview = null;
  }

  // =========================================================================
  // STEP 1 & 2: Save as Draft
  // =========================================================================
  async saveDraft(subsidiaryId, year, category, formData) {
    store.updateESGData(subsidiaryId, year, category, formData);
    
    // Server-authoritative draft creation/update
    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        await api.saveDraftSubmission({
          subsidiaryId,
          year,
          reportType: "Integrated ESG & BRSR Report"
        });
      } catch (err) {
        console.warn('[Workflow] Backend saveDraft notice:', err);
      }
    }

    // Ensure local store submission status is Draft
    const subm = store.getSubmissions(year, subsidiaryId)[0];
    if (!subm || subm.status !== "Approved") {
      let currentSubm = subm;
      if (!currentSubm) {
        const sub = store.getSubsidiaryById(subsidiaryId);
        currentSubm = {
          id: `SUBM-${new Date().getFullYear()}-${String(store.state.submissions.length + 1).padStart(3, '0')}`,
          subsidiaryId,
          subsidiaryName: sub?.name || "Subsidiary",
          year,
          reportType: "Integrated ESG & BRSR Report",
          submittedBy: auth.getUserInfo().name,
          submissionDate: null,
          status: "Draft",
          lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
          reviewedBy: null,
          approvalDate: null,
          esgScore: 70,
          brsrScore: 65,
          reviewerNotes: null
        };
        store.state.submissions.push(currentSubm);
      } else if (currentSubm.status !== "Submitted" && currentSubm.status !== "Approved") {
        currentSubm.status = "Draft";
        currentSubm.lastUpdated = new Date().toISOString().slice(0, 16).replace('T', ' ');
      }
      store.saveState();
    }

    ui.showToast("Draft saved successfully. Unsubmitted changes are stored locally.", "success");
  }

  // =========================================================================
  // STEP 3: Submit Data for Review
  // =========================================================================
  async submitData(subsidiaryId, year) {
    const user = auth.getUserInfo();
    const effectiveSubId = auth.isMainAdmin() ? subsidiaryId : (auth.getActiveSubsidiaryId() || subsidiaryId);

    // Call authoritative PostgreSQL backend first
    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.submitSubmission({ subsidiaryId: effectiveSubId, year });
        if (res && res.success && res.data) {
          const backendSubm = res.data;
          // Synchronize authoritative submission into store
          const existingIdx = store.state.submissions.findIndex(s => s.id === backendSubm.id || (s.subsidiaryId === effectiveSubId && (s.year === year || s.reportingYear === year)));
          if (existingIdx >= 0) {
            store.state.submissions[existingIdx] = { ...store.state.submissions[existingIdx], ...backendSubm };
          } else {
            store.state.submissions.unshift(backendSubm);
          }

          // Sync ESG data status
          const esgKey = `${effectiveSubId}_${year}`;
          if (store.state.esgData && store.state.esgData[esgKey]) {
            store.state.esgData[esgKey].status = "Submitted";
          }

          store.saveState();
          ui.showToast(`Submission ${backendSubm.id} forwarded to Central MEIL Executive Admin for review.`, "success");
          ui.renderCurrentView();
          return;
        } else if (res && !res.success && res.message && !res.isNetworkError) {
          ui.showToast(`Submission notice: ${res.message}`, "warning");
        }
      } catch (err) {
        console.warn('[Workflow] Backend submitData error:', err);
      }
    }

    // Fallback if offline
    const subm = store.submitDataForReview(effectiveSubId, year, user.name);
    ui.showToast(`Submission ${subm.id} recorded locally.`, "success");
    ui.renderCurrentView();
  }

  // =========================================================================
  // STEP 4 & 5: Main Company Admin Reviews Data
  // =========================================================================
  async openReviewModal(submissionId) {
    let subm = store.getSubmissionById(submissionId);
    if (!subm && typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.getSubmissionById(submissionId);
        if (res && res.success && res.data) {
          subm = res.data;
        }
      } catch (e) {
        console.warn('[Workflow] Backend fetch error:', e);
      }
    }

    if (!subm) {
      if (typeof ui !== 'undefined' && ui.showToast) {
        ui.showToast(`Submission record ${submissionId} not found.`, "warning");
      }
      return;
    }

    this.activeSubmissionUnderReview = subm;
    const year = subm.year || subm.reportingYear || "FY 2025-26";
    const esg = store.getESGData(subm.subsidiaryId, year) || {};
    const brsr = store.getBRSRData(subm.subsidiaryId, year) || {};

    if (typeof ui !== 'undefined' && ui.showReviewModal) {
      ui.showReviewModal(subm, esg, brsr);
    }
  }

  // =========================================================================
  // STEP 5A: Main Company Admin Approves Submission
  // -> Server is authoritative (Requirement 2)
  // =========================================================================
  async approveSubmission(submissionId, notes = "Verified and approved by Central MEIL ESG Committee.") {
    const user = auth.getUserInfo();

    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.approveSubmission(submissionId, notes);
        if (res && res.success && res.data) {
          const updated = res.data;
          const idx = store.state.submissions.findIndex(s => s.id === submissionId);
          if (idx >= 0) {
            store.state.submissions[idx] = { ...store.state.submissions[idx], ...updated };
          }
          store.setSubmissionStatus(submissionId, "Approved", notes, user.name);
          ui.showToast(`Submission ${submissionId} approved in PostgreSQL and consolidated into MEIL Group metrics.`, "success");
          ui.closeModals();
          ui.renderCurrentView();
          return;
        } else if (res && !res.success && !res.isNetworkError) {
          ui.showToast(res.message || "Failed to approve submission on server.", "danger");
          return;
        }
      } catch (err) {
        console.warn('[Workflow] Backend approval notice:', err);
      }
    }

    const success = store.setSubmissionStatus(submissionId, "Approved", notes, user.name);
    if (success) {
      ui.showToast(`Submission ${submissionId} approved! Data is now consolidated into MEIL Group metrics.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    } else {
      ui.showToast("Failed to approve submission.", "danger");
    }
  }

  // =========================================================================
  // STEP 5B & 6: Main Company Admin Requests Correction
  // =========================================================================
  async requestCorrection(submissionId, comment) {
    if (!comment || comment.trim().length === 0) {
      ui.showToast("Please provide specific reviewer comments detailing the required correction.", "warning");
      return;
    }

    const user = auth.getUserInfo();

    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.requestCorrection(submissionId, comment);
        if (res && res.success && res.data) {
          const updated = res.data;
          const idx = store.state.submissions.findIndex(s => s.id === submissionId);
          if (idx >= 0) {
            store.state.submissions[idx] = { ...store.state.submissions[idx], ...updated };
          }
          store.setSubmissionStatus(submissionId, "Correction Required", comment, user.name);
          ui.showToast(`Correction requested for ${submissionId} in PostgreSQL. Subsidiary notified.`, "warning");
          ui.closeModals();
          ui.renderCurrentView();
          return;
        } else if (res && !res.success && !res.isNetworkError) {
          ui.showToast(res.message || "Failed to request correction on server.", "danger");
          return;
        }
      } catch (err) {
        console.warn('[Workflow] Backend requestCorrection notice:', err);
      }
    }

    const success = store.setSubmissionStatus(submissionId, "Correction Required", comment, user.name);
    if (success) {
      ui.showToast(`Correction requested for ${submissionId}. Subsidiary notified with remarks.`, "warning");
      ui.closeModals();
      ui.renderCurrentView();
    } else {
      ui.showToast("Failed to update status.", "danger");
    }
  }

  // =========================================================================
  // STEP 5C: Main Company Admin Rejects Submission
  // =========================================================================
  async rejectSubmission(submissionId, reason) {
    if (!reason || reason.trim().length === 0) {
      ui.showToast("Please provide specific justification/remarks for rejecting this filing.", "warning");
      return;
    }

    const user = auth.getUserInfo();

    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.rejectSubmission(submissionId, reason);
        if (res && res.success && res.data) {
          const updated = res.data;
          const idx = store.state.submissions.findIndex(s => s.id === submissionId);
          if (idx >= 0) {
            store.state.submissions[idx] = { ...store.state.submissions[idx], ...updated };
          }
          store.setSubmissionStatus(submissionId, "Rejected", reason, user.name);
          ui.showToast(`Submission ${submissionId} rejected in PostgreSQL. Excluded from group consolidation.`, "danger");
          ui.closeModals();
          ui.renderCurrentView();
          return;
        } else if (res && !res.success && !res.isNetworkError) {
          ui.showToast(res.message || "Failed to reject submission on server.", "danger");
          return;
        }
      } catch (err) {
        console.warn('[Workflow] Backend reject notice:', err);
      }
    }

    const success = store.setSubmissionStatus(submissionId, "Rejected", reason, user.name);
    if (success) {
      ui.showToast(`Submission ${submissionId} has been REJECTED. Subsidiary notified to revise disclosures.`, "danger");
      ui.closeModals();
      ui.renderCurrentView();
    } else {
      ui.showToast("Failed to reject submission.", "danger");
    }
  }

  // =========================================================================
  // STEP 7: Sub-Company Admin Resubmits Corrected Data
  // =========================================================================
  async resubmitData(subsidiaryId, year) {
    const user = auth.getUserInfo();
    const effectiveSubId = auth.isMainAdmin() ? subsidiaryId : (auth.getActiveSubsidiaryId() || subsidiaryId);

    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.resubmitSubmission({ subsidiaryId: effectiveSubId, year });
        if (res && res.success && res.data) {
          const backendSubm = res.data;
          const existingIdx = store.state.submissions.findIndex(s => s.id === backendSubm.id || (s.subsidiaryId === effectiveSubId && (s.year === year || s.reportingYear === year)));
          if (existingIdx >= 0) {
            store.state.submissions[existingIdx] = { ...store.state.submissions[existingIdx], ...backendSubm };
          } else {
            store.state.submissions.unshift(backendSubm);
          }

          const esgKey = `${effectiveSubId}_${year}`;
          if (store.state.esgData && store.state.esgData[esgKey]) {
            store.state.esgData[esgKey].status = "Submitted";
          }

          store.saveState();
          ui.showToast(`Revised ESG data for ${year} resubmitted to PostgreSQL. Status: Submitted.`, "success");
          ui.renderCurrentView();
          return;
        }
      } catch (err) {
        console.warn('[Workflow] Backend resubmitData notice:', err);
      }
    }

    const subm = store.submitDataForReview(effectiveSubId, year, user.name);
    ui.showToast(`Updated data resubmitted for ${year}. Status: Resubmitted (Under Review).`, "success");
    ui.renderCurrentView();
  }

  // =========================================================================
  // STEP 8: Main Company Admin Re-opens a Filing for Review
  // =========================================================================
  async reopenSubmission(submissionId, notes = "Filing re-opened by Central MEIL Admin for review.") {
    const user = auth.getUserInfo();
    store.setSubmissionStatus(submissionId, "Under Review", notes, user.name);
    ui.showToast(`Submission ${submissionId} re-opened for active review.`, "info");
    ui.closeModals();
    ui.renderCurrentView();
  }

  // =========================================================================
  // MODULE 4: PROJECT-LEVEL ESG SUBMISSION WORKFLOW
  // Flow: Data Entry -> Save Draft -> Submit -> Review -> Approve / Correction / Reject -> Consolidation
  // =========================================================================

  saveProjectDraft(projectId, year, category, data) {
    const proj = store.saveProjectDraft(projectId, year, category, data);
    if (proj) {
      ui.showToast(`Draft saved for project ${proj.name} (${proj.code}). Unsubmitted changes stored locally.`, "success");
      ui.renderCurrentView();
    }
  }

  submitProjectData(projectId, year) {
    const user = auth.getUserInfo();
    const proj = store.submitProjectData(projectId, year, user.name);
    if (proj) {
      ui.showToast(`Project ${proj.code} submitted for Central Admin review. Status: Submitted.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  openProjectReviewModal(projectId, year = 'FY 2025-26') {
    const proj = store.getProjectById(projectId);
    if (!proj) return;
    ui.showProjectReviewModal(proj, year);
  }

  approveProjectSubmission(projectId, year = 'FY 2025-26', notes = "Verified and approved for group consolidation.") {
    const user = auth.getUserInfo();
    const proj = store.setProjectSubmissionStatus(projectId, year, "Approved", notes, user.name);
    if (proj) {
      ui.showToast(`Project ${proj.code} APPROVED! Data is now Included in Consolidation.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  requestProjectCorrection(projectId, year = 'FY 2025-26', comment = "") {
    if (!comment || comment.trim().length === 0) {
      ui.showToast("Please provide specific reviewer comments for required correction.", "warning");
      return;
    }
    const user = auth.getUserInfo();
    const proj = store.setProjectSubmissionStatus(projectId, year, "Correction Required", comment, user.name);
    if (proj) {
      ui.showToast(`Correction requested for project ${proj.code}. Excluded from consolidation until revised.`, "warning");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  rejectProjectSubmission(projectId, year = 'FY 2025-26', reason = "") {
    if (!reason || reason.trim().length === 0) {
      ui.showToast("Please provide formal justification for rejecting this project filing.", "warning");
      return;
    }
    const user = auth.getUserInfo();
    const proj = store.setProjectSubmissionStatus(projectId, year, "Rejected", reason, user.name);
    if (proj) {
      ui.showToast(`Project ${proj.code} REJECTED. Excluded from consolidation.`, "danger");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  resubmitProjectData(projectId, year) {
    const user = auth.getUserInfo();
    const proj = store.submitProjectData(projectId, year, user.name);
    if (proj) {
      ui.showToast(`Project ${proj.code} resubmitted for verification. Status: Resubmitted (Under Review).`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  // =========================================================================
  // SUB-COMPANY SDG CONTRIBUTION WORKFLOW LIFECYCLE
  // Sub Admin: Save Draft -> Submit -> Resubmit Corrected
  // Main Admin: Review -> Approve -> Request Correction / Reject
  // =========================================================================

  async saveSDGDraft(formData) {
    const user = auth.getUserInfo();
    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        await api.saveSdgContribution(formData);
      } catch (err) {
        console.warn('[Workflow] Backend saveSDGDraft notice:', err);
      }
    }
    const record = store.saveSDGContribution(formData, false, user.name);
    if (record) {
      ui.showToast(`SDG ${record.sdgNumber} initiative draft "${record.initiativeName}" saved.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  async submitSDGContribution(formDataOrId) {
    const user = auth.getUserInfo();
    let record = null;
    if (typeof formDataOrId === 'string') {
      record = store.submitSDGContribution(formDataOrId, user.name);
    } else {
      if (typeof api !== 'undefined' && api.getToken()) {
        try {
          await api.saveSdgContribution(formDataOrId);
        } catch (err) {
          console.warn('[Workflow] Backend submitSDGContribution notice:', err);
        }
      }
      record = store.saveSDGContribution(formDataOrId, true, user.name);
    }
    if (record) {
      ui.showToast(`SDG ${record.sdgNumber} initiative "${record.initiativeName}" submitted for Central MEIL Admin review. Status: Under Review.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  async approveSDGContribution(id, remarks = "Verified and approved by Central MEIL ESG Committee.") {
    const user = auth.getUserInfo();
    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.approveSdgContribution(id, remarks);
        if (!res.success && !res.isNetworkError) {
          ui.showToast(res.message || "Failed to approve SDG contribution on server.", "danger");
          return;
        }
      } catch (err) {
        console.warn('[Workflow] Backend approveSDGContribution notice:', err);
      }
    }
    const record = store.approveSDGContribution(id, remarks, user.name);
    if (record) {
      ui.showToast(`SDG ${record.sdgNumber} contribution APPROVED! Data is now active in consolidated Group analytics.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  async requestSDGCorrection(id, comment) {
    if (!comment || comment.trim().length === 0) {
      ui.showToast("Please provide specific reviewer comments for required correction.", "warning");
      return;
    }
    const user = auth.getUserInfo();
    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.requestCorrectionSdg(id, comment);
        if (!res.success && !res.isNetworkError) {
          ui.showToast(res.message || "Failed to request correction on server.", "danger");
          return;
        }
      } catch (err) {
        console.warn('[Workflow] Backend requestSDGCorrection notice:', err);
      }
    }
    const record = store.requestSDGCorrection(id, comment, user.name);
    if (record) {
      ui.showToast(`Correction requested for SDG ${record.sdgNumber} initiative. Subsidiary notified with audit remarks.`, "warning");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  async rejectSDGContribution(id, reason) {
    if (!reason || reason.trim().length === 0) {
      ui.showToast("Please provide formal justification for rejecting this filing.", "warning");
      return;
    }
    const user = auth.getUserInfo();
    if (typeof api !== 'undefined' && api.getToken()) {
      try {
        const res = await api.rejectSdgContribution(id, reason);
        if (!res.success && !res.isNetworkError) {
          ui.showToast(res.message || "Failed to reject SDG contribution on server.", "danger");
          return;
        }
      } catch (err) {
        console.warn('[Workflow] Backend rejectSDGContribution notice:', err);
      }
    }
    const record = store.rejectSDGContribution(id, reason, user.name);
    if (record) {
      ui.showToast(`SDG ${record.sdgNumber} contribution REJECTED. Excluded from consolidated analytics.`, "danger");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }
}

// Global Singleton Workflow Instance
const workflow = new WorkflowManager();
window.workflow = workflow;
