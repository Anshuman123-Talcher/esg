/**
 * ESG & BRSR 11-Step Workflow and Review Lifecycle Controller
 * MEIL Centralized Sustainability System
 */

class WorkflowManager {
  constructor() {
    this.activeSubmissionUnderReview = null;
  }

  // =========================================================================
  // STEP 1 & 2: Save as Draft
  // =========================================================================
  saveDraft(subsidiaryId, year, category, formData) {
    store.updateESGData(subsidiaryId, year, category, formData);
    
    // Ensure submission status is Draft if not yet submitted
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
  submitData(subsidiaryId, year) {
    const user = auth.getUserInfo();
    const subm = store.submitDataForReview(subsidiaryId, year, user.name);

    ui.showToast(`Submission ${subm.id} forwarded to Central MEIL Admin for review.`, "success");
    ui.renderCurrentView();
  }

  // =========================================================================
  // STEP 4 & 5: Main Company Admin Reviews Data
  // =========================================================================
  openReviewModal(submissionId) {
    const subm = store.getSubmissionById(submissionId);
    if (!subm) return;

    this.activeSubmissionUnderReview = subm;
    const esg = store.getESGData(subm.subsidiaryId, subm.year) || {};
    const brsr = store.getBRSRData(subm.subsidiaryId, subm.year) || {};

    ui.showReviewModal(subm, esg, brsr);
  }

  // =========================================================================
  // STEP 5A: Main Company Admin Approves Submission
  // -> STEP 9 & 10: Only Approved Data rolls into Consolidated Reporting
  // =========================================================================
  approveSubmission(submissionId, notes = "Verified and approved by Central MEIL ESG Committee.") {
    const user = auth.getUserInfo();
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
  requestCorrection(submissionId, comment) {
    if (!comment || comment.trim().length === 0) {
      ui.showToast("Please provide specific reviewer comments detailing the required correction.", "warning");
      return;
    }

    const user = auth.getUserInfo();
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
  // -> Submission marked Rejected, strictly excluded from Consolidation
  // =========================================================================
  rejectSubmission(submissionId, reason) {
    if (!reason || reason.trim().length === 0) {
      ui.showToast("Please provide specific justification/remarks for rejecting this filing.", "warning");
      return;
    }

    const user = auth.getUserInfo();
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
  resubmitData(subsidiaryId, year) {
    const user = auth.getUserInfo();
    const subm = store.submitDataForReview(subsidiaryId, year, user.name);

    ui.showToast(`Updated data resubmitted for ${year}. Status: Resubmitted (Under Review).`, "success");
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

  saveSDGDraft(formData) {
    const user = auth.getUserInfo();
    const record = store.saveSDGContribution(formData, false, user.name);
    if (record) {
      ui.showToast(`SDG ${record.sdgNumber} initiative draft "${record.initiativeName}" saved locally.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  submitSDGContribution(formDataOrId) {
    const user = auth.getUserInfo();
    let record = null;
    if (typeof formDataOrId === 'string') {
      record = store.submitSDGContribution(formDataOrId, user.name);
    } else {
      record = store.saveSDGContribution(formDataOrId, true, user.name);
    }
    if (record) {
      ui.showToast(`SDG ${record.sdgNumber} initiative "${record.initiativeName}" submitted for Central MEIL Admin review. Status: Under Review.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  approveSDGContribution(id, remarks = "Verified and approved by Central MEIL ESG Committee.") {
    const user = auth.getUserInfo();
    const record = store.approveSDGContribution(id, remarks, user.name);
    if (record) {
      ui.showToast(`SDG ${record.sdgNumber} contribution APPROVED! Data is now active in consolidated Group analytics.`, "success");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  requestSDGCorrection(id, comment) {
    if (!comment || comment.trim().length === 0) {
      ui.showToast("Please provide specific reviewer comments for required correction.", "warning");
      return;
    }
    const user = auth.getUserInfo();
    const record = store.requestSDGCorrection(id, comment, user.name);
    if (record) {
      ui.showToast(`Correction requested for SDG ${record.sdgNumber} initiative. Subsidiary notified with audit remarks.`, "warning");
      ui.closeModals();
      ui.renderCurrentView();
    }
  }

  rejectSDGContribution(id, reason) {
    if (!reason || reason.trim().length === 0) {
      ui.showToast("Please provide formal justification for rejecting this filing.", "warning");
      return;
    }
    const user = auth.getUserInfo();
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

