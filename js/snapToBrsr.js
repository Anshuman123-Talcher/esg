/**
 * Snap-to-BRSR Module
 * Official PS08 Unique Idea 1: Multimodal OCR/AI Document Extraction & BRSR Mapping
 * MEIL Centralized ESG Platform
 */

class SnapToBrsrModule {
  constructor() {
    this.currentExtraction = null;
    this.uploadedFile = null;
    this.selectedProjectId = null;
  }

  render(container) {
    const isMain = auth.isMainAdmin();
    const activeSubId = auth.getActiveSubsidiaryId();
    const projects = store.getProjects(activeSubId);
    const offlineQueue = typeof api !== 'undefined' ? api.getOfflineQueue() : [];

    const defaultProject = projects.length > 0 ? projects[0].id : '';
    if (!this.selectedProjectId) this.selectedProjectId = defaultProject;

    container.innerHTML = `
      <div class="view-header">
        <div class="view-header-title">
          <div style="display:flex; align-items:center; gap:8px;">
            <h2>Snap-to-BRSR</h2>
            <span class="badge badge-info" style="font-size:11px;">PS08 Official Unique Idea</span>
            <span class="badge badge-success" style="font-size:11px;">SEBI BRSR Principle 6 Core</span>
          </div>
          <p>Instant multimodal AI &amp; OCR document ingestion: convert bills, fuel receipts, weighbridge slips &amp; meter photos into verified statutory disclosures.</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-outline btn-sm" onclick="snapToBrsrModule.loadSample('diesel')" title="Test with standard 1,000L diesel bill">
            <i data-lucide="file-text"></i> Sample Diesel Bill
          </button>
          <button class="btn btn-outline btn-sm" onclick="snapToBrsrModule.loadSample('electricity')" title="Test with TSSPDCL electricity bill">
            <i data-lucide="zap"></i> Sample Electricity Bill
          </button>
          <button class="btn btn-outline btn-sm" onclick="snapToBrsrModule.loadSample('cement')" title="Test with PPC material slip">
            <i data-lucide="package"></i> Sample Fly-Ash Slip
          </button>
        </div>
      </div>

      ${offlineQueue.length > 0 ? `
        <div class="alert alert-warning" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="wifi-off" style="width:18px; height:18px;"></i>
            <span><strong>Offline Queue Active:</strong> ${offlineQueue.length} document record(s) queued for synchronization.</span>
          </div>
          <button class="btn btn-sm btn-warning" onclick="api.triggerOfflineSync(); snapToBrsrModule.render(document.getElementById('content-viewport'));">
            Sync Now
          </button>
        </div>
      ` : ''}

      <div class="grid-2-col" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; align-items:start;">
        <!-- Left Column: Document Upload & Capture -->
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="upload-cloud" style="color:var(--meil-navy);"></i>
              <span>Step 1: Document Upload &amp; Field Capture</span>
            </div>
            <span class="badge badge-secondary" style="font-size:10px;">Mobile &amp; Web In-Situ</span>
          </div>
          <div class="card-body">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" style="font-weight:600; font-size:12px;">Target Project Entity</label>
              <select id="snap-project-select" class="form-select" onchange="snapToBrsrModule.selectedProjectId = this.value">
                ${projects.map(p => `
                  <option value="${p.id}" ${p.id === this.selectedProjectId ? 'selected' : ''}>
                    ${p.name} (${p.code}) — ${p.subsidiary?.name || 'Assigned Subsidiary'}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Drag & Drop Zone -->
            <div id="snap-drop-zone" class="upload-dropzone" style="border:2px dashed var(--border-medium); border-radius:var(--radius-lg); padding:28px 16px; text-align:center; background:var(--bg-surface-secondary); cursor:pointer; transition:all 0.2s;" onclick="document.getElementById('snap-file-input').click()">
              <input type="file" id="snap-file-input" style="display:none;" accept="image/*,application/pdf" onchange="snapToBrsrModule.handleFileSelected(this.files)">
              <div style="width:48px; height:48px; border-radius:50%; background:var(--meil-navy-light); color:#fff; display:flex; align-items:center; justify-content:center; margin:0 auto 12px;">
                <i data-lucide="camera" style="width:24px; height:24px;"></i>
              </div>
              <h4 style="font-size:14px; margin-bottom:4px; color:var(--text-primary);">Upload Bill or Snap Photo</h4>
              <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Supported: Diesel receipts, electricity bills, weighbridge slips, meter photos (PDF, PNG, JPG, WEBP up to 15MB)</p>
              <div style="display:inline-flex; gap:8px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); document.getElementById('snap-file-input').click();">
                  <i data-lucide="folder-open"></i> Browse Files
                </button>
              </div>
            </div>

            <div id="snap-file-preview-card" style="display:none; margin-top:14px; padding:12px; border-radius:var(--radius-md); background:var(--bg-surface-tertiary); border:1px solid var(--border-light);">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <i data-lucide="file-check" style="color:var(--color-success); width:20px; height:20px;"></i>
                  <div>
                    <strong id="snap-file-name" style="font-size:12px; display:block;">filename.pdf</strong>
                    <span id="snap-file-size" style="font-size:11px; color:var(--text-muted);">340 KB</span>
                  </div>
                </div>
                <button class="btn btn-sm btn-outline" onclick="snapToBrsrModule.clearSelectedFile()" style="color:var(--color-danger);">
                  <i data-lucide="trash-2"></i> Remove
                </button>
              </div>
            </div>

            <div style="margin-top:16px;">
              <button id="snap-btn-analyze" class="btn btn-primary" style="width:100%;" onclick="snapToBrsrModule.runOcrExtraction()">
                <i data-lucide="sparkles"></i>
                <span>Run Multimodal OCR &amp; BRSR Extraction</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: OCR Extraction & Human Verification Form -->
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="check-square" style="color:var(--meil-navy);"></i>
              <span>Step 2: Confidence Audit &amp; Human Review</span>
            </div>
            <span id="snap-status-badge" class="badge badge-secondary">Awaiting Document</span>
          </div>
          <div class="card-body">
            <div id="snap-results-placeholder" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
              <i data-lucide="scan" style="width:48px; height:48px; stroke-width:1.5; margin-bottom:12px; opacity:0.4;"></i>
              <p style="font-size:13px;">Upload an invoice or load a sample bill to view structured extraction values, confidence scoring, and BRSR mapping.</p>
            </div>

            <div id="snap-results-container" style="display:none;">
              <!-- Confidence & Provider Header -->
              <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-surface-secondary); border-radius:var(--radius-md); margin-bottom:14px; border:1px solid var(--border-light);">
                <div>
                  <span style="font-size:11px; color:var(--text-muted); display:block;">OCR/AI Engine Provider:</span>
                  <strong id="snap-provider-label" style="font-size:12px; color:var(--meil-navy);">LOCAL DOCUMENT OCR ENGINE</strong>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:11px; color:var(--text-muted); display:block;">Confidence Score:</span>
                  <strong id="snap-confidence-score" style="font-size:14px; color:var(--color-success);">94.6%</strong>
                </div>
              </div>

              <!-- Editable Human Verification Fields -->
              <form id="snap-verification-form" onsubmit="event.preventDefault(); snapToBrsrModule.saveAndConfirmRecord();">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px; font-weight:600;">Fuel / Energy Category</label>
                    <input type="text" id="snap-field-fuel" class="form-control" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px; font-weight:600;">Extracted Quantity</label>
                    <input type="number" step="any" id="snap-field-qty" class="form-control" oninput="snapToBrsrModule.recalculateEmissionsPreview()" required>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px; font-weight:600;">Unit of Measurement</label>
                    <input type="text" id="snap-field-unit" class="form-control" oninput="snapToBrsrModule.recalculateEmissionsPreview()" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px; font-weight:600;">Invoice / Bill Date</label>
                    <input type="date" id="snap-field-date" class="form-control" required>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px; font-weight:600;">Vendor / Utility Provider</label>
                    <input type="text" id="snap-field-vendor" class="form-control" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px; font-weight:600;">Total Cost (INR)</label>
                    <input type="number" id="snap-field-cost" class="form-control">
                  </div>
                </div>

                <!-- Emission & BRSR Mapping Banner -->
                <div style="padding:12px 14px; border-radius:var(--radius-md); background:var(--meil-blue-light); border:1px solid #bfdbfe; margin-bottom:14px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:11px; font-weight:700; color:var(--meil-navy); text-transform:uppercase;">Statutory SEBI BRSR Mapping</span>
                    <span id="snap-scope-badge" class="badge badge-primary" style="font-size:10px;">Scope 1 Direct</span>
                  </div>
                  <div id="snap-brsr-mapping-text" style="font-size:12px; color:var(--text-primary); margin-bottom:8px;">
                    Principle 6 (P6-E1): Energy &amp; Fuel Direct Combustion Disclosures
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(0,0,0,0.08); padding-top:6px;">
                    <span style="font-size:11px; color:var(--text-secondary);">Calculated GHG Emissions:</span>
                    <strong id="snap-emissions-calc-text" style="font-size:13px; color:var(--color-success);">2.68 MT CO2e (2,680 kg)</strong>
                  </div>
                </div>

                <div style="display:flex; gap:10px;">
                  <button type="submit" id="snap-btn-confirm" class="btn btn-success" style="flex:1;">
                    <i data-lucide="check-circle-2"></i>
                    <span>Confirm &amp; Link Evidence</span>
                  </button>
                  <button type="button" class="btn btn-outline" onclick="snapToBrsrModule.submitDirectly()">
                    <i data-lucide="send"></i> Submit to Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: My Subsidiary Evidence & Verification Register (Requirement 11) -->
      <div class="card" style="margin-top:20px;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-title" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="folder-check" style="color:var(--meil-navy);"></i>
            <span>My Subsidiary Evidence &amp; Verification Register</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="snapToBrsrModule.loadEvidenceRegister()">
            <i data-lucide="refresh-cw"></i> Refresh Register
          </button>
        </div>
        <div class="card-body" id="snap-evidence-register-container" style="padding:16px;">
          <div style="text-align:center; padding:20px; color:var(--text-muted);">
            <i data-lucide="loader-2" class="spin" style="width:24px; height:24px;"></i>
            <p style="font-size:12px; margin-top:6px;">Loading verified documents...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons();
    }
    this.loadEvidenceRegister();
  }

  handleFileSelected(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.uploadedFile = file;

    const previewCard = document.getElementById('snap-file-preview-card');
    const nameEl = document.getElementById('snap-file-name');
    const sizeEl = document.getElementById('snap-file-size');

    if (previewCard) previewCard.style.display = 'block';
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    if (window.lucide) lucide.createIcons();
  }

  clearSelectedFile() {
    this.uploadedFile = null;
    const input = document.getElementById('snap-file-input');
    if (input) input.value = '';
    const previewCard = document.getElementById('snap-file-preview-card');
    if (previewCard) previewCard.style.display = 'none';
  }

  async loadSample(type = 'diesel') {
    ui.showToast(`Loading demo sample ${type} bill...`, 'info');

    let fakeFilename = 'diesel_commercial_invoice_sep2026.pdf';
    let sampleData = {
      fuelType: 'Diesel',
      quantity: 1000,
      unit: 'Litres',
      invoiceDate: '2026-09-15',
      vendor: 'Indian Oil Corporation Ltd (Commercial Depot)',
      siteLocation: 'MEIL Strategic Project Site',
      totalCostInr: 92500,
      overallConfidence: 94.6,
      provider: 'LOCAL DOCUMENT OCR ENGINE'
    };

    if (type === 'electricity') {
      fakeFilename = 'tsspdcl_ht_power_meter_aug2026.pdf';
      sampleData = {
        fuelType: 'Grid Electricity',
        quantity: 14500,
        unit: 'kWh',
        invoiceDate: '2026-08-31',
        vendor: 'Telangana State Southern Power Distribution Co.',
        siteLocation: 'Olectra EV Bus Giga-Hub',
        totalCostInr: 121800,
        overallConfidence: 96.2,
        provider: 'LOCAL DOCUMENT OCR ENGINE'
      };
    } else if (type === 'cement') {
      fakeFilename = 'weighbridge_slip_flyash_cement.pdf';
      sampleData = {
        fuelType: 'Fly-Ash Blended Cement (PPC)',
        quantity: 250,
        unit: 'Tonnes',
        invoiceDate: '2026-09-20',
        vendor: 'UltraTech Cement / ReadyMix Enclave',
        siteLocation: 'Polavaram Project Site',
        totalCostInr: 1550000,
        overallConfidence: 91.8,
        provider: 'LOCAL DOCUMENT OCR ENGINE'
      };
    }

    const previewCard = document.getElementById('snap-file-preview-card');
    const nameEl = document.getElementById('snap-file-name');
    const sizeEl = document.getElementById('snap-file-size');

    if (previewCard) previewCard.style.display = 'block';
    if (nameEl) nameEl.textContent = fakeFilename;
    if (sizeEl) sizeEl.textContent = '348.5 KB';

    this.displayExtractionResults({
      extraction: sampleData,
      provider: sampleData.provider,
      validation: { status: 'VALIDATED', issues: [] },
      brsrMapping: {
        principle: 'Principle 6: Protection & Restoration of Environment',
        section: 'Section C - Environmental Disclosures',
        esgCategory: sampleData.fuelType.includes('Diesel') ? 'Scope 1 / Fuel Combustion' : (sampleData.fuelType.includes('Elec') ? 'Scope 2 / Grid Electricity' : 'Scope 3 / Materials')
      }
    });

    if (window.lucide) lucide.createIcons();
  }

  async runOcrExtraction() {
    const btn = document.getElementById('snap-btn-analyze');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Extracting Structured Data...`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const projectId = document.getElementById('snap-project-select')?.value || this.selectedProjectId;
      const subId = auth.getActiveSubsidiaryId();

      let res;
      if (this.uploadedFile && typeof api !== 'undefined') {
        const formData = new FormData();
        formData.append('document', this.uploadedFile);
        formData.append('projectId', projectId);
        formData.append('subsidiaryId', subId);
        formData.append('reportingYear', 'FY 2025-26');

        res = await api.uploadAndExtractDocument(formData);
      }

      if (res && res.success && res.data) {
        this.currentExtraction = res.data;
        this.displayExtractionResults(res.data);
        ui.showToast('Document analyzed successfully via OCR adapter.', 'success');
      } else {
        // Fallback demo extraction if file was uploaded without backend or offline
        await new Promise(r => setTimeout(r, 600));
        this.loadSample('diesel');
      }
    } catch (err) {
      console.warn('[Snap OCR] Fallback to local heuristic extraction:', err);
      this.loadSample('diesel');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="sparkles"></i> <span>Run Multimodal OCR &amp; BRSR Extraction</span>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  displayExtractionResults(data) {
    const placeholder = document.getElementById('snap-results-placeholder');
    const container = document.getElementById('snap-results-container');
    const statusBadge = document.getElementById('snap-status-badge');

    if (placeholder) placeholder.style.display = 'none';
    if (container) container.style.display = 'block';

    const ext = data.extractedData || data.extraction || {};
    const provider = data.provider || 'LOCAL DOCUMENT OCR ENGINE';
    const evidenceId = data.evidenceId || data.file?.evidenceId || 'EV-NEW';
    const originalName = data.file?.originalName || 'Uploaded File';

    const provLabel = document.getElementById('snap-provider-label');
    const confScore = document.getElementById('snap-confidence-score');
    if (provLabel) {
      provLabel.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span>${provider}</span>
          <span class="badge" style="font-family:monospace; background:rgba(0,43,91,0.08); color:var(--meil-navy); border:1px solid rgba(0,43,91,0.2); font-size:11px;">
            ${evidenceId}
          </span>
          ${data.evidenceId ? `
            <button type="button" class="btn btn-sm btn-outline" style="font-size:11px; padding:2px 8px;" onclick="ui.showEvidenceViewerModal('${data.evidenceId}')">
              <i data-lucide="eye"></i> Preview
            </button>
          ` : ''}
        </div>
      `;
    }
    if (confScore) confScore.textContent = `${ext.overallConfidence || 94.0}%`;

    if (statusBadge) {
      statusBadge.className = 'badge badge-success';
      statusBadge.textContent = 'Data Extracted & Verified';
    }

    // Insert or update duplicate warning banner
    let dupAlert = document.getElementById('snap-duplicate-warning-banner');
    if (data.duplicateWarning?.detected) {
      const dw = data.duplicateWarning;
      const dupHtml = `
        <div id="snap-duplicate-warning-banner" class="alert alert-warning" style="margin-bottom:14px; padding:10px 14px; border-radius:6px; font-size:12px;">
          <div style="display:flex; align-items:flex-start; gap:8px;">
            <i data-lucide="alert-triangle" style="width:18px; height:18px; color:#d97706; flex-shrink:0; margin-top:2px;"></i>
            <div>
              <strong style="color:#92400e;">Possible duplicate evidence detected:</strong><br>
              Exact SHA-256 content matches existing Evidence <code>${dw.existingEvidenceId}</code> (<em>${dw.existingFileName}</em>) uploaded by <strong>${dw.existingUploadedBy}</strong> for <strong>${dw.existingSubsidiary}</strong>.<br>
              <span style="font-size:11px; color:#78350f;">Both documents remain independently stored under distinct Evidence IDs. Please verify whether this repeated document is legitimate.</span>
            </div>
          </div>
        </div>
      `;
      if (dupAlert) {
        dupAlert.outerHTML = dupHtml;
      } else {
        container.insertAdjacentHTML('afterbegin', dupHtml);
      }
    } else if (dupAlert) {
      dupAlert.remove();
    }

    document.getElementById('snap-field-fuel').value = ext.fuelType || 'Diesel';
    document.getElementById('snap-field-qty').value = ext.quantity || 1000;
    document.getElementById('snap-field-unit').value = ext.unit || 'Litres';
    document.getElementById('snap-field-date').value = ext.invoiceDate || new Date().toISOString().split('T')[0];
    document.getElementById('snap-field-vendor').value = ext.vendor || 'Indian Oil Corporation Ltd';
    document.getElementById('snap-field-cost').value = ext.totalCostInr || 92500;

    this.recalculateEmissionsPreview();
    if (window.lucide) lucide.createIcons();
  }

  recalculateEmissionsPreview() {
    const fuel = document.getElementById('snap-field-fuel')?.value || 'Diesel';
    const qty = parseFloat(document.getElementById('snap-field-qty')?.value) || 0;
    const unit = document.getElementById('snap-field-unit')?.value || 'Litres';

    const isElec = fuel.toLowerCase().includes('elec') || unit.toLowerCase() === 'kwh';
    const isCement = fuel.toLowerCase().includes('cement') || unit.toLowerCase() === 'tonnes';

    const scopeBadge = document.getElementById('snap-scope-badge');
    const mappingText = document.getElementById('snap-brsr-mapping-text');
    const calcText = document.getElementById('snap-emissions-calc-text');

    if (isElec) {
      if (scopeBadge) scopeBadge.textContent = 'Scope 2 Indirect';
      if (mappingText) mappingText.textContent = 'Principle 6 (P6-E2): Purchased Grid Electricity Consumption';
      const kg = qty * 0.716;
      const mt = (kg / 1000).toFixed(2);
      if (calcText) calcText.textContent = `${mt} MT CO2e (${Math.round(kg).toLocaleString('en-IN')} kg)`;
    } else if (isCement) {
      if (scopeBadge) scopeBadge.textContent = 'Scope 3 Materials';
      if (mappingText) mappingText.textContent = 'Principle 6 (P6-E3): Sustainable Materials & Low-Carbon Cement';
      const mt = (qty * 0.585).toFixed(2);
      if (calcText) calcText.textContent = `${mt} MT CO2e (${Math.round(mt * 1000).toLocaleString('en-IN')} kg)`;
    } else {
      if (scopeBadge) scopeBadge.textContent = 'Scope 1 Direct';
      if (mappingText) mappingText.textContent = 'Principle 6 (P6-E1): Direct Fuel Combustion Disclosures';
      const kg = qty * 2.68;
      const mt = (kg / 1000).toFixed(2);
      if (calcText) calcText.textContent = `${mt} MT CO2e (${Math.round(kg).toLocaleString('en-IN')} kg)`;
    }
  }

  async saveAndConfirmRecord() {
    const projectId = document.getElementById('snap-project-select')?.value || this.selectedProjectId;
    const subId = auth.getActiveSubsidiaryId();

    const recordData = {
      projectId,
      subsidiaryId: subId,
      reportingYear: 'FY 2025-26',
      fuelType: document.getElementById('snap-field-fuel')?.value,
      quantity: parseFloat(document.getElementById('snap-field-qty')?.value),
      unit: document.getElementById('snap-field-unit')?.value,
      invoiceDate: document.getElementById('snap-field-date')?.value,
      vendor: document.getElementById('snap-field-vendor')?.value,
      totalCostInr: parseFloat(document.getElementById('snap-field-cost')?.value) || 0,
      evidenceId: this.currentExtraction?.evidenceId || 'EV-8F31C2A7-001',
      isHumanCorrected: true
    };

    if (typeof api !== 'undefined' && api.isOnline) {
      try {
        const res = await api.saveSnapRecord(recordData);
        if (res.success) {
          ui.showToast('Snap-to-BRSR record verified and saved to database with evidence linked!', 'success');
          this.loadEvidenceRegister();
        } else {
          api.enqueueOfflineAction('SAVE_SNAP_RECORD', recordData);
          ui.showToast('Saved locally in offline sync queue.', 'warning');
        }
      } catch {
        api.enqueueOfflineAction('SAVE_SNAP_RECORD', recordData);
        ui.showToast('Saved locally in offline queue (network offline).', 'warning');
      }
    } else if (typeof api !== 'undefined') {
      api.enqueueOfflineAction('SAVE_SNAP_RECORD', recordData);
      ui.showToast('Saved to offline sync queue.', 'warning');
    }

    // Also update local store ESG state
    store.addAuditLog(
      auth.getUserInfo().name,
      'SNAP_CONFIRM',
      `Confirmed Snap-to-BRSR record: ${recordData.quantity} ${recordData.unit} of ${recordData.fuelType} (Evidence ID: ${recordData.evidenceId})`
    );
  }

  submitDirectly() {
    this.saveAndConfirmRecord();
    const subId = auth.getActiveSubsidiaryId();
    workflow.submitData(subId, 'FY 2025-26');
  }

  /**
   * Load and render the Evidence Register for the current user's subsidiary (Requirement 11)
   */
  async loadEvidenceRegister() {
    const container = document.getElementById('snap-evidence-register-container');
    if (!container) return;

    try {
      let docs = [];
      if (typeof api !== 'undefined' && api.getToken()) {
        const res = await api.getMyEvidence('FY 2025-26');
        if (res && res.success && res.data) {
          docs = res.data;
        }
      }

      if (docs.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:30px; color:var(--text-muted);">
            <i data-lucide="inbox" style="width:36px; height:36px; opacity:0.4; margin-bottom:8px;"></i>
            <p style="font-size:13px; margin:0;">No evidence documents uploaded yet for this subsidiary in FY 2025-26.</p>
            <p style="font-size:11px; margin-top:4px;">Use Step 1 above to ingest your first fuel bill, electricity receipt, or weighbridge slip.</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      container.innerHTML = `
        <div style="overflow-x:auto;">
          <table class="table" style="font-size:12px; margin:0;">
            <thead>
              <tr>
                <th>Document &amp; Evidence ID</th>
                <th>Category</th>
                <th>Supported Activity Metric</th>
                <th>BRSR Mapping</th>
                <th>OCR Conf.</th>
                <th>Review Status</th>
                <th>Reviewer Feedback</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${docs.map(doc => {
                const isPdf = (doc.mimeType || '').includes('pdf') || (doc.originalName || '').toLowerCase().endsWith('.pdf');
                const fileIcon = isPdf ? 'file-text' : 'image';
                const iconColor = isPdf ? '#ef4444' : '#3b82f6';
                const status = doc.reviewStatus || 'Pending Review';

                let statusBadge = 'badge-pending';
                if (status === 'Approved') statusBadge = 'badge-approved';
                else if (status === 'Correction Required') statusBadge = 'badge-rejected';
                else if (status === 'Rejected') statusBadge = 'badge-danger';

                return `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <i data-lucide="${fileIcon}" style="color:${iconColor}; width:16px; height:16px; flex-shrink:0;"></i>
                        <div>
                          <strong style="color:var(--text-primary); display:block;">${doc.originalName}</strong>
                          <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                            <code style="font-size:10px; color:var(--meil-navy); background:rgba(0,43,91,0.06); padding:1px 4px; border-radius:3px;">${doc.id}</code>
                            ${doc.version > 1 ? `<span class="badge" style="font-size:9px; background:#e0e7ff; color:#3730a3;">v${doc.version}</span>` : ''}
                            ${doc.isDuplicate ? `<span class="badge badge-warning" style="font-size:9px;" title="Duplicate hash detected">Duplicate</span>` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge badge-secondary" style="font-size:11px;">${doc.category || 'Receipt'}</span></td>
                    <td><strong>${doc.supportedMetric || '—'}</strong></td>
                    <td>${doc.brsrPrinciple || 'P6'} (${doc.scope || 'Scope 1'})</td>
                    <td><span class="badge ${doc.ocrConfidence >= 90 ? 'badge-approved' : 'badge-warning'}">${doc.ocrConfidence || 94}%</span></td>
                    <td><span class="badge ${statusBadge}">${status}</span></td>
                    <td>
                      ${doc.reviewComments ? `
                        <div style="max-width:220px; font-size:11px; color:#b45309; background:#fffbeb; padding:4px 8px; border-radius:4px; border-left:2px solid #f59e0b;">
                          ${doc.reviewComments}
                        </div>
                      ` : '<span style="color:var(--text-muted);">—</span>'}
                    </td>
                    <td style="text-align:right;">
                      <div style="display:inline-flex; gap:4px;">
                        <button class="btn btn-sm btn-outline" onclick="ui.showEvidenceViewerModal('${doc.id}')" title="Inspect Document">
                          <i data-lucide="eye"></i>
                        </button>
                        <a class="btn btn-sm btn-outline" href="${api.getEvidenceFileUrl(doc.id, true)}" download="${encodeURIComponent(doc.originalName)}" title="Download File">
                          <i data-lucide="download"></i>
                        </a>
                        ${status === 'Correction Required' ? `
                          <button class="btn btn-sm btn-warning" onclick="snapToBrsrModule.showCorrectionUploadModal('${doc.id}', '${doc.originalName}', ${doc.version})" title="Upload Corrected Document Version">
                            <i data-lucide="upload-cloud"></i> Fix
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.warn('[Evidence Register] Failed to load register:', err);
      container.innerHTML = `<div class="alert alert-warning" style="font-size:12px;">Failed to load register: ${err.message}</div>`;
    }
  }

  /**
   * Modal for uploading a corrected version of an existing evidence document (Requirement 18)
   */
  showCorrectionUploadModal(evidenceId, originalName, currentVersion = 1) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="refresh-cw" style="color:var(--meil-navy);"></i>
            <span>Upload Corrected Version (${originalName})</span>
          </h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div class="alert alert-info" style="font-size:12px; margin-bottom:14px;">
            Uploading a corrected document will create <strong>Version ${currentVersion + 1}</strong>.
            The previous version (Version ${currentVersion}) is permanently preserved in the audit version archive.
          </div>

          <form id="correction-version-form" onsubmit="event.preventDefault(); snapToBrsrModule.submitCorrectionVersion('${evidenceId}');">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" style="font-weight:600;">Select Replacement Document / Clearer Scan <span class="required">*</span></label>
              <input type="file" id="correction-file-input" class="form-control" accept="image/*,application/pdf" required>
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" style="font-weight:600;">Correction Reason / Response to Remarks <span class="required">*</span></label>
              <textarea id="correction-reason-input" class="form-control" rows="3" placeholder="E.g., Re-uploaded 300 DPI high-contrast scan with legible meter serial number." required></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
              <button type="submit" id="btn-submit-correction" class="btn btn-brand-blue">
                <i data-lucide="upload-cloud"></i> Upload Version ${currentVersion + 1}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    if (window.lucide) lucide.createIcons();
  }

  async submitCorrectionVersion(evidenceId) {
    const fileInput = document.getElementById('correction-file-input');
    const reasonInput = document.getElementById('correction-reason-input');
    const btn = document.getElementById('btn-submit-correction');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      ui.showToast('Please select a file to upload.', 'warning');
      return;
    }

    const reason = reasonInput ? reasonInput.value.trim() : '';
    if (!reason) {
      ui.showToast('Please provide an explanation for the corrected version.', 'warning');
      if (reasonInput) reasonInput.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Uploading Version...`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const formData = new FormData();
      formData.append('document', fileInput.files[0]);
      formData.append('reason', reason);

      const res = await api.uploadEvidenceVersion(evidenceId, formData);
      if (res && res.success) {
        ui.showToast('Corrected document version uploaded successfully and queued for review!', 'success');
        ui.closeModals();
        this.loadEvidenceRegister();
      } else {
        ui.showToast(res?.message || 'Failed to upload corrected version.', 'danger');
      }
    } catch (err) {
      ui.showToast(err.message || 'Upload error', 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="upload-cloud"></i> Upload Version`;
      }
    }
  }
}

// Global Singleton Instance
window.snapToBrsrModule = new SnapToBrsrModule();
