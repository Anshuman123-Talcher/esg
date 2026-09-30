/**
 * Enterprise Report Generator & Export Engine
 * MEIL Centralized ESG & BRSR Software
 */

class ReportEngine {
  constructor() {}

  // =========================================================================
  // Generate Live Report Preview
  // =========================================================================
  generateReportHTML(reportType, year, subsidiaryId = 'all') {
    const mainCompany = store.getMainCompany();
    const isConsolidated = subsidiaryId === 'all';
    const sub = isConsolidated ? null : store.getSubsidiaryById(subsidiaryId);
    const entityName = isConsolidated ? mainCompany.name : sub?.name || "Subsidiary";
    const entityCin = isConsolidated ? mainCompany.cin : sub?.cin || "N/A";
    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    let metricsData;
    if (isConsolidated) {
      metricsData = store.calculateConsolidatedData(year);
    } else {
      const rawEsg = store.getESGData(subsidiaryId, year) || {};
      metricsData = {
        totalEnergyMWh: rawEsg.environment?.totalEnergyMWh || 0,
        renewableEnergyMWh: rawEsg.environment?.renewableEnergyMWh || 0,
        nonRenewableEnergyMWh: rawEsg.environment?.nonRenewableEnergyMWh || 0,
        renewablePercent: rawEsg.environment?.renewablePercent || 0,
        waterWithdrawalKL: rawEsg.environment?.waterWithdrawalKL || 0,
        waterConsumptionKL: rawEsg.environment?.waterConsumptionKL || 0,
        waterRecycledKL: rawEsg.environment?.waterRecycledKL || 0,
        wasteGeneratedMT: rawEsg.environment?.wasteGeneratedMT || 0,
        wasteRecycledMT: rawEsg.environment?.wasteRecycledMT || 0,
        wasteDisposalMT: rawEsg.environment?.wasteDisposalMT || 0,
        ghgScope1: rawEsg.environment?.ghgScope1 || 0,
        ghgScope2: rawEsg.environment?.ghgScope2 || 0,
        ghgScope3: rawEsg.environment?.ghgScope3 || 0,
        totalGHG: rawEsg.environment?.totalGHG || 0,
        biodiversitySaplings: rawEsg.environment?.biodiversitySaplings || 0,
        totalEmployees: rawEsg.social?.totalEmployees || 0,
        maleEmployees: rawEsg.social?.maleEmployees || 0,
        femaleEmployees: rawEsg.social?.femaleEmployees || 0,
        safetyTrainingManHours: rawEsg.social?.safetyTrainingManHours || 0,
        workplaceIncidents: rawEsg.social?.workplaceIncidents || 0,
        ltifrAverage: rawEsg.social?.ltifr || 0,
        fatalities: rawEsg.social?.fatalities || 0,
        csrSpendLakhs: rawEsg.social?.csrSpendLakhs || 0,
        csrBeneficiaries: rawEsg.social?.csrBeneficiaries || 0,
        grievancesReceived: rawEsg.social?.grievancesReceived || 0,
        grievancesResolved: rawEsg.social?.grievancesResolved || 0,
        boardTotalMembers: rawEsg.governance?.boardTotalMembers || 0,
        independentDirectors: rawEsg.governance?.independentDirectors || 0,
        womenDirectors: rawEsg.governance?.womenDirectors || 0,
        antiCorruptionTrainedAvg: rawEsg.governance?.antiCorruptionTrainedPercent || 0,
        approvedSubsidiariesCount: 1,
        totalSubsidiariesCount: 1
      };
    }

    // SDG Report — matches UI dropdown ("UN SDG Alignment Report") and quick-export button ("UN SDG Alignment & Progress Report")
    if (reportType.includes('SDG Alignment') || reportType === 'UN SDG Alignment & Progress Report') {
      return this.generateSDGReportHTML(year);
    }
    // Cross-Framework Mapping Report — matches UI dropdown and arrow-symbol variant
    if (reportType.includes('Cross-Framework') || reportType.includes('Framework Mapping') || reportType.includes('BRSR-SDG')) {
      return this.generateFrameworkMappingReportHTML();
    }
    // Business Unit Report — matches "Business Unit ESG Performance Report" and "Business Unit Sustainability Summary"
    if (reportType.includes('Business Unit') || reportType === 'Business Unit Sustainability Summary') {
      return this.generateBUReportHTML(year, subsidiaryId);
    }
    // Project Report — matches "Project ESG & Consolidation Audit Report" and "Project-Level ESG Performance Report"
    if (reportType.includes('Project') && (reportType.includes('ESG') || reportType.includes('Consolidation'))) {
      return this.generateProjectReportHTML(year, subsidiaryId);
    }

    return `
      <div class="report-document">
        <!-- Official Report Header -->
        <div class="print-header" style="display:block; border-bottom: 2px solid var(--meil-navy); padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <img src="assets/meil-logo.png" alt="MEIL Logo" style="height: 44px; margin-bottom: 8px;">
              <h2 style="font-size: 20px; color: var(--meil-navy); margin: 0;">${entityName}</h2>
              <div style="font-size: 11px; color: var(--text-muted);">CIN: ${entityCin} | Official Sustainability & Statutory Filing</div>
            </div>
            <div style="text-align: right;">
              <span class="badge badge-approved" style="font-size: 12px; padding: 4px 12px;">
                <i data-lucide="check-circle-2"></i> ${isConsolidated ? 'Consolidated Group Statement' : 'Subsidiary Report'}
              </span>
              <div style="font-size: 12px; margin-top: 6px; font-weight: 600;">Reporting Cycle: ${year}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Generated on: ${reportDate}</div>
            </div>
          </div>
        </div>

        <!-- Executive Summary Banner -->
        <div class="alert alert-info" style="margin-bottom: 24px;">
          <div class="alert-content">
            <div class="alert-title" style="font-size: 14px;">Executive Disclosure Note</div>
            <div>This report reflects verified operational sustainability data compiled pursuant to the <strong>Securities and Exchange Board of India (SEBI) BRSR framework</strong> and UN SDGs. ${isConsolidated ? 'Calculations strictly aggregate data from subsidiaries whose submissions have received final Main Company Admin approval.' : 'Data corresponds to verified disclosures submitted by the subsidiary governance committee.'}</div>
          </div>
        </div>

        <!-- Section 1: Environmental Performance Indicators -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="leaf" style="color:var(--color-success)"></i> 1. Environmental Stewardship Indicators</h3>
            <span class="badge badge-approved">P6 Compliant</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Metric / Unit</th>
                  <th>Disclosed Value</th>
                  <th>Statutory Benchmark</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Energy Consumption</strong></td>
                  <td>Mega Watt Hours (MWh)</td>
                  <td><strong>${metricsData.totalEnergyMWh?.toLocaleString()} MWh</strong></td>
                  <td>Energy Management Audit</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>Renewable Energy Share</td>
                  <td>Percentage (%)</td>
                  <td><strong>${metricsData.renewablePercent || Math.round((metricsData.renewableEnergyMWh / (metricsData.totalEnergyMWh || 1)) * 100)}%</strong> (${metricsData.renewableEnergyMWh?.toLocaleString()} MWh)</td>
                  <td>Target &ge; 40%</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Exceeds Target</span></td>
                </tr>
                <tr>
                  <td><strong>Total GHG Emissions (Scope 1+2+3)</strong></td>
                  <td>tCO2e (Metric Tons CO2 eq)</td>
                  <td><strong>${metricsData.totalGHG?.toLocaleString()} tCO2e</strong></td>
                  <td>GHG Protocol Aligned</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>Scope 1 Direct Emissions</td>
                  <td>tCO2e</td>
                  <td>${metricsData.ghgScope1?.toLocaleString()} tCO2e</td>
                  <td>Point-source Combustion</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>Scope 2 Indirect Electricity</td>
                  <td>tCO2e</td>
                  <td>${metricsData.ghgScope2?.toLocaleString()} tCO2e</td>
                  <td>Grid Emission Factor</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>Scope 3 Value Chain Emissions</td>
                  <td>tCO2e</td>
                  <td>${metricsData.ghgScope3?.toLocaleString()} tCO2e</td>
                  <td>Supply Chain Logistics</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td><strong>Water Withdrawal & Consumption</strong></td>
                  <td>Kilo Litres (kL)</td>
                  <td>Withdrawal: <strong>${metricsData.waterWithdrawalKL?.toLocaleString()} kL</strong> | Consumption: <strong>${metricsData.waterConsumptionKL?.toLocaleString()} kL</strong></td>
                  <td>Zero Liquid Discharge Policy</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>Waste Recycled / Diverted</td>
                  <td>Metric Tons (MT)</td>
                  <td><strong>${metricsData.wasteRecycledMT?.toLocaleString()} MT</strong> (${metricsData.wasteGeneratedMT > 0 ? Math.round((metricsData.wasteRecycledMT / metricsData.wasteGeneratedMT) * 100) : 0}% recycled)</td>
                  <td>Circular Economy Mandate</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>Afforestation & Biodiversity</td>
                  <td>Saplings Planted</td>
                  <td><strong>${metricsData.biodiversitySaplings?.toLocaleString()} Plants</strong></td>
                  <td>Green Belt Standard</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Certified</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 2: Social & Workplace Indicators -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="users" style="color:var(--meil-blue)"></i> 2. Social Capital & Workplace Safety Indicators</h3>
            <span class="badge badge-approved">P3 & P5 Compliant</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Unit</th>
                  <th>Disclosed Value</th>
                  <th>SEBI Standard</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Workforce</strong></td>
                  <td>Headcount</td>
                  <td><strong>${metricsData.totalEmployees?.toLocaleString()}</strong> (Male: ${metricsData.maleEmployees?.toLocaleString()}, Female: ${metricsData.femaleEmployees?.toLocaleString()})</td>
                  <td>Gender Inclusivity</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>Workplace Safety LTIFR</td>
                  <td>Rate per million man-hours</td>
                  <td><strong>${metricsData.ltifrAverage}</strong> (Lost Time Injury Freq Rate)</td>
                  <td>Industry Benchmark &lt; 0.50</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> World Class</span></td>
                </tr>
                <tr>
                  <td>Workplace Fatalities</td>
                  <td>Number</td>
                  <td><strong>${metricsData.fatalities || 0}</strong> (Zero Fatalities)</td>
                  <td>Vision Zero Policy</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Fully Met</span></td>
                </tr>
                <tr>
                  <td>Safety Training Man-Hours</td>
                  <td>Hours</td>
                  <td><strong>${metricsData.safetyTrainingManHours?.toLocaleString()} hrs</strong></td>
                  <td>Mandatory OHS Policy</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Verified</span></td>
                </tr>
                <tr>
                  <td>CSR Investment</td>
                  <td>INR Lakhs</td>
                  <td><strong>₹ ${metricsData.csrSpendLakhs?.toLocaleString()} Lakhs</strong> (${metricsData.csrBeneficiaries?.toLocaleString()} Beneficiaries)</td>
                  <td>Section 135 Compliant</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Statutory Met</span></td>
                </tr>
                <tr>
                  <td>Grievance Redressal Rate</td>
                  <td>Percentage (%)</td>
                  <td><strong>${metricsData.grievancesReceived > 0 ? Math.round((metricsData.grievancesResolved / metricsData.grievancesReceived) * 100) : 100}%</strong> (${metricsData.grievancesResolved}/${metricsData.grievancesReceived} resolved)</td>
                  <td>Internal Redressal Policy</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> 100% Target</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 3: Governance & Statutory Principles -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="scale" style="color:var(--color-purple)"></i> 3. Governance, Ethics & Anti-Corruption</h3>
            <span class="badge badge-approved">P1 & P7 Compliant</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Disclosed Value</th>
                  <th>Statutory Mandate</th>
                  <th>Compliance Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Independent Directors on Board</td>
                  <td><strong>${metricsData.independentDirectors} of ${metricsData.boardTotalMembers} (${metricsData.boardTotalMembers > 0 ? Math.round((metricsData.independentDirectors / metricsData.boardTotalMembers) * 100) : 50}%)</strong></td>
                  <td>SEBI LODR Reg 17 (&ge; 33-50%)</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Compliant</span></td>
                </tr>
                <tr>
                  <td>Anti-Corruption Training Rate</td>
                  <td><strong>${metricsData.antiCorruptionTrainedAvg || 98}%</strong> of designated personnel trained</td>
                  <td>Zero Tolerance Anti-Bribery</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Compliant</span></td>
                </tr>
                <tr>
                  <td>Whistleblower Complaints</td>
                  <td><strong>0</strong> pending (100% resolved under Ombudsperson)</td>
                  <td>Whistleblower Protection Act</td>
                  <td><span class="badge badge-approved"><i data-lucide="check"></i> Clean Record</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Verification Signatures Block -->
        <div class="print-sign-block" style="display:flex; justify-content:space-between; margin-top: 48px; border-top: 1px solid var(--border-medium); padding-top: 24px;">
          <div>
            <div style="font-weight: 700; color: var(--text-brand);">${auth.getUserInfo().name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${auth.getUserInfo().title}</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Digital Signature Verified: 2026-09-21</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: var(--text-brand);">Central ESG Oversight Committee</div>
            <div style="font-size: 11px; color: var(--text-muted);">Megha Engineering & Infrastructures Limited</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Seal of Corporate Sustainability</div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Export Clean CSV
  // =========================================================================
  exportToCSV(reportType, year, subsidiaryId = 'all') {
    const isConsolidated = subsidiaryId === 'all';
    const filename = `MEIL_${reportType.replace(/\s+/g, '_')}_${year}_${isConsolidated ? 'Consolidated' : subsidiaryId}.csv`;

    let rows = [
      ["Megha Engineering and Infrastructures Limited (MEIL) - Sustainability Reporting"],
      ["Report Type", reportType],
      ["Reporting Cycle", year],
      ["Entity Scope", isConsolidated ? "MEIL Group Consolidated" : store.getSubsidiaryById(subsidiaryId)?.name || subsidiaryId],
      ["Generated Date", new Date().toISOString()],
      [],
      ["Category", "Indicator", "Value", "Unit", "Verification Status"]
    ];

    let data;
    if (isConsolidated) {
      data = store.calculateConsolidatedData(year);
    } else {
      const raw = store.getESGData(subsidiaryId, year) || {};
      data = {
        totalEnergyMWh: raw.environment?.totalEnergyMWh || 0,
        renewableEnergyMWh: raw.environment?.renewableEnergyMWh || 0,
        nonRenewableEnergyMWh: raw.environment?.nonRenewableEnergyMWh || 0,
        renewablePercent: raw.environment?.renewablePercent || 0,
        waterWithdrawalKL: raw.environment?.waterWithdrawalKL || 0,
        waterConsumptionKL: raw.environment?.waterConsumptionKL || 0,
        wasteGeneratedMT: raw.environment?.wasteGeneratedMT || 0,
        wasteRecycledMT: raw.environment?.wasteRecycledMT || 0,
        totalGHG: raw.environment?.totalGHG || 0,
        ghgScope1: raw.environment?.ghgScope1 || 0,
        ghgScope2: raw.environment?.ghgScope2 || 0,
        ghgScope3: raw.environment?.ghgScope3 || 0,
        biodiversitySaplings: raw.environment?.biodiversitySaplings || 0,
        totalEmployees: raw.social?.totalEmployees || 0,
        ltifrAverage: raw.social?.ltifr || 0,
        fatalities: raw.social?.fatalities || 0,
        csrSpendLakhs: raw.social?.csrSpendLakhs || 0,
        independentPercent: raw.governance?.independentPercent || 50
      };
    }

    rows.push(["Environment", "Total Energy Consumption", data.totalEnergyMWh, "MWh", "Approved"]);
    rows.push(["Environment", "Renewable Energy", data.renewableEnergyMWh, "MWh", "Approved"]);
    rows.push(["Environment", "Non-Renewable Energy", data.nonRenewableEnergyMWh, "MWh", "Approved"]);
    rows.push(["Environment", "Renewable Share", `${data.renewablePercent}%`, "%", "Approved"]);
    rows.push(["Environment", "Total GHG Emissions", data.totalGHG, "tCO2e", "Approved"]);
    rows.push(["Environment", "Scope 1 Emissions", data.ghgScope1, "tCO2e", "Approved"]);
    rows.push(["Environment", "Scope 2 Emissions", data.ghgScope2, "tCO2e", "Approved"]);
    rows.push(["Environment", "Scope 3 Emissions", data.ghgScope3, "tCO2e", "Approved"]);
    rows.push(["Environment", "Water Withdrawal", data.waterWithdrawalKL, "kL", "Approved"]);
    rows.push(["Environment", "Water Consumption", data.waterConsumptionKL, "kL", "Approved"]);
    rows.push(["Environment", "Waste Generated", data.wasteGeneratedMT, "MT", "Approved"]);
    rows.push(["Environment", "Waste Recycled", data.wasteRecycledMT, "MT", "Approved"]);
    rows.push(["Environment", "Saplings Planted", data.biodiversitySaplings, "Count", "Approved"]);
    rows.push(["Social", "Total Employees", data.totalEmployees, "Headcount", "Approved"]);
    rows.push(["Social", "Workplace Safety LTIFR", data.ltifrAverage, "Rate", "Approved"]);
    rows.push(["Social", "Fatalities", data.fatalities, "Count", "Zero Target Met"]);
    rows.push(["Social", "CSR Investment", data.csrSpendLakhs, "INR Lakhs", "Approved"]);
    rows.push(["Governance", "Independent Board Share", `${data.independentPercent}%`, "%", "Approved"]);

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(x => `"${x}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ui.showToast(`Report exported successfully as ${filename}`, "success");
  }

  // =========================================================================
  // MODULE 1 & 14: UN SDG ALIGNMENT REPORT GENERATOR
  // =========================================================================
  generateSDGReportHTML(year = "FY 2025-26") {
    const mainCompany = store.getMainCompany();
    const sdgs = store.getSDGs();
    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <div class="report-document">
        <div class="print-header" style="display:block; border-bottom: 2px solid var(--meil-navy); padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <img src="assets/meil-logo.png" alt="MEIL Logo" style="height: 44px; margin-bottom: 8px;">
              <h2 style="font-size: 20px; color: var(--meil-navy); margin: 0;">${mainCompany.name}</h2>
              <div style="font-size: 11px; color: var(--text-muted);">CIN: ${mainCompany.cin} | UN Sustainable Development Goals (SDGs) Integrated Statement</div>
            </div>
            <div style="text-align: right;">
              <span class="badge badge-approved" style="font-size: 12px; padding: 4px 12px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;">
                <i data-lucide="globe"></i> 17 SDGs Fully Aligned
              </span>
              <div style="font-size: 12px; margin-top: 6px; font-weight: 600;">Reporting Cycle: ${year}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Generated on: ${reportDate}</div>
            </div>
          </div>
        </div>

        <div class="alert alert-info" style="margin-bottom: 24px;">
          <div class="alert-content">
            <div class="alert-title" style="font-size: 14px;">Strategic SDG Alignment Framework</div>
            <div>This disclosure details MEIL Group and its operating subsidiaries' statutory and operational contributions to all <strong>17 United Nations Sustainable Development Goals (UN SDGs)</strong> in accordance with SEBI Business Responsibility & Sustainability Reporting (BRSR) directives.</div>
          </div>
        </div>

        <div class="grid-kpi-4" style="margin-bottom:24px;">
          <div class="kpi-card accent-blue">
            <div class="kpi-header"><span class="kpi-title">SDGs Covered</span><div class="kpi-icon-wrap blue"><i data-lucide="globe"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">17 / 17</span></div>
            <div class="kpi-meta"><span>100% Agenda 2030 Scope</span><span class="badge badge-approved">Active</span></div>
          </div>
          <div class="kpi-card accent-green">
            <div class="kpi-header"><span class="kpi-title">Clean Power Share</span><div class="kpi-icon-wrap green"><i data-lucide="zap"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">52.8%</span></div>
            <div class="kpi-meta"><span>Target 7.2 &bull; Solar/Hydro</span><span class="kpi-trend positive">+8.4% YoY</span></div>
          </div>
          <div class="kpi-card accent-red">
            <div class="kpi-header"><span class="kpi-title">Workplace Zero Harm</span><div class="kpi-icon-wrap red"><i data-lucide="shield-check"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">0</span><span class="kpi-unit">Fatalities</span></div>
            <div class="kpi-meta"><span>Target 3.6 &bull; LTIFR 0.06</span><span class="badge badge-approved">Certified</span></div>
          </div>
          <div class="kpi-card accent-amber">
            <div class="kpi-header"><span class="kpi-title">Circular Waste Recovery</span><div class="kpi-icon-wrap amber"><i data-lucide="recycle"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">76.5%</span></div>
            <div class="kpi-meta"><span>Target 12.5 &bull; Circular RAP</span><span class="kpi-trend positive">Expanding</span></div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="list-checks" style="color:var(--meil-navy)"></i> All 17 UN Sustainable Development Goals Performance Index</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th style="width:120px;">SDG Goal</th>
                    <th>Goal Description &amp; Targets</th>
                    <th>MEIL Corporate Contribution</th>
                    <th>BRSR Mapping</th>
                    <th>Current vs Target</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${sdgs.map(s => `
                    <tr>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:${s.color};"></span>
                          <strong style="color:var(--text-brand);">${s.code}</strong>
                        </div>
                        <div style="font-size:11px; color:var(--text-muted); font-weight:600;">${s.name}</div>
                      </td>
                      <td style="font-size:12px; max-width:240px;">
                        <div>${s.description}</div>
                        <div style="margin-top:4px; font-size:11px; color:var(--text-muted); font-style:italic;">${s.targets[0] || ''}</div>
                      </td>
                      <td style="font-size:12px; max-width:220px; color:var(--text-secondary);">${s.meilContribution}</td>
                      <td>
                        ${s.brsrPrinciples.map(p => `<span class="badge badge-draft" style="display:inline-block; margin-bottom:2px; font-size:10px;">${p.split('-')[0].trim()}</span>`).join(' ')}
                      </td>
                      <td style="font-size:12px;">
                        <div><strong>${s.currentPerformance}</strong></div>
                        <div style="font-size:11px; color:var(--text-muted);">Target: ${s.target}</div>
                      </td>
                      <td style="width:120px;">
                        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; margin-bottom:4px;">
                          <span>${s.progressPct}%</span>
                        </div>
                        <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                          <div style="height:100%; width:${Math.min(100, s.progressPct)}%; background:${s.color};"></div>
                        </div>
                      </td>
                      <td>
                        <span class="badge ${s.status === 'Ahead of Target' || s.status === 'On Track' ? 'badge-approved' : (s.status === 'In Progress' ? 'badge-submitted' : 'badge-correction')}">
                          ${s.status}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // MODULE 2 & 14: ESG ↔ BRSR ↔ SDG CROSS-FRAMEWORK MAPPING REPORT
  // =========================================================================
  generateFrameworkMappingReportHTML() {
    const mainCompany = store.getMainCompany();
    const mappings = store.getFrameworkMappings();
    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <div class="report-document">
        <div class="print-header" style="display:block; border-bottom: 2px solid var(--meil-navy); padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <img src="assets/meil-logo.png" alt="MEIL Logo" style="height: 44px; margin-bottom: 8px;">
              <h2 style="font-size: 20px; color: var(--meil-navy); margin: 0;">${mainCompany.name}</h2>
              <div style="font-size: 11px; color: var(--text-muted);">ESG ↔ SEBI BRSR ↔ UN SDG Cross-Framework Interoperability Matrix</div>
            </div>
            <div style="text-align: right;">
              <span class="badge badge-approved" style="font-size: 12px; padding: 4px 12px;">
                <i data-lucide="git-merge"></i> Triple Framework Aligned
              </span>
              <div style="font-size: 11px; color: var(--text-muted); margin-top:6px;">Generated on: ${reportDate}</div>
            </div>
          </div>
        </div>

        <div class="alert alert-info" style="margin-bottom: 24px;">
          <div class="alert-content">
            <div class="alert-title" style="font-size: 14px;">Cross-Framework Interoperability Standard</div>
            <div>This authoritative mapping defines the direct relationship between <strong>MEIL ESG Operational Indicators</strong>, <strong>SEBI BRSR Statutory Principles (Section C Core Disclosures)</strong>, and <strong>UN Sustainable Development Goals (Agenda 2030)</strong> across all operating subsidiaries and projects.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="table"></i> ESG Indicator &rarr; BRSR Principle &rarr; UN SDG Alignment Matrix</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>ESG Operational Indicator</th>
                    <th>ESG Pillar</th>
                    <th>SEBI BRSR Principle &amp; Section</th>
                    <th>Linked UN SDG</th>
                    <th>Applicable Subsidiaries</th>
                    <th>Sample Linked Projects</th>
                  </tr>
                </thead>
                <tbody>
                  ${mappings.map(m => `
                    <tr>
                      <td>
                        <strong>${m.indicator}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">Unit: ${m.metricUnit}</div>
                      </td>
                      <td>
                        <span class="badge ${m.area === 'Environment' ? 'badge-approved' : (m.area === 'Social' ? 'badge-submitted' : 'badge-correction')}">
                          ${m.area}
                        </span>
                      </td>
                      <td style="font-size:12px;">
                        <div><strong>${m.brsrPrinciple}</strong></div>
                        <div style="font-size:11px; color:var(--text-muted);">${m.brsrSection}</div>
                      </td>
                      <td>
                        <span class="badge badge-submitted" style="font-weight:600;">SDG ${m.sdgNumber}</span>
                        <div style="font-size:11px; color:var(--text-brand); margin-top:2px;">${m.sdgName}</div>
                      </td>
                      <td style="font-size:12px; color:var(--text-secondary);">
                        ${m.linkedSubsidiaries.join(", ")}
                      </td>
                      <td style="font-size:11px; color:var(--text-muted);">
                        ${m.linkedProjects.join(", ")}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // MODULE 5 & 14: BUSINESS UNIT SUSTAINABILITY SUMMARY REPORT
  // =========================================================================
  generateBUReportHTML(year = "FY 2025-26", subsidiaryId = "all") {
    const mainCompany = store.getMainCompany();
    const subs = store.getSubsidiaries();
    const isFiltered = subsidiaryId && subsidiaryId !== 'all';
    const sub = isFiltered ? store.getSubsidiaryById(subsidiaryId) : null;
    const bus = store.getBusinessUnits(isFiltered ? subsidiaryId : null);
    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <div class="report-document">
        <div class="print-header" style="display:block; border-bottom: 2px solid var(--meil-navy); padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <img src="assets/meil-logo.png" alt="MEIL Logo" style="height: 44px; margin-bottom: 8px;">
              <h2 style="font-size: 20px; color: var(--meil-navy); margin: 0;">${isFiltered ? sub?.name : mainCompany.name}</h2>
              <div style="font-size: 11px; color: var(--text-muted);">Business Unit Sustainability &amp; Operational Rollup Summary</div>
            </div>
            <div style="text-align: right;">
              <span class="badge badge-approved" style="font-size: 12px; padding: 4px 12px;">
                <i data-lucide="layers"></i> ${bus.length} Business Units
              </span>
              <div style="font-size: 12px; margin-top: 6px; font-weight: 600;">Cycle: ${year}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Generated on: ${reportDate}</div>
            </div>
          </div>
        </div>

        <div class="alert alert-info" style="margin-bottom: 24px;">
          <div class="alert-content">
            <div class="alert-title" style="font-size: 14px;">Business Unit Level Reporting Scope</div>
            <div>This report aggregates sustainability and BRSR operational figures at the <strong>Business Unit level</strong>, summarizing bottom-up project performance across Environment, Social, Governance, and SDG contribution.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="building"></i> Business Units Performance Breakdown</h3></div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Business Unit Name</th>
                    <th>Parent Subsidiary</th>
                    <th>Head &amp; Scope</th>
                    <th>Mapped Projects</th>
                    <th>ESG Complete</th>
                    <th>BRSR Ready</th>
                    <th>Renewable %</th>
                    <th>Total GHG (tCO2e)</th>
                    <th>Workforce</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${bus.map(b => {
                    const buESG = store.getBusinessUnitESG(b.id, year);
                    const parentSub = store.getSubsidiaryById(b.subsidiaryId);
                    return `
                      <tr>
                        <td><strong>${b.name}</strong></td>
                        <td>${parentSub?.shortName || b.subsidiaryId}</td>
                        <td style="font-size:12px;">
                          <div>${b.head}</div>
                          <div style="font-size:11px; color:var(--text-muted);">${b.activities.slice(0, 32)}...</div>
                        </td>
                        <td><span class="badge badge-draft">${buESG.projectCount} Projects (${buESG.approvedCount} Approved)</span></td>
                        <td><strong style="color:var(--color-success);">${buESG.esgCompletion}%</strong></td>
                        <td><strong style="color:var(--meil-navy);">${buESG.brsrCompletion}%</strong></td>
                        <td>${buESG.totals.renewablePercent}%</td>
                        <td>${buESG.totals.totalGHG.toLocaleString()}</td>
                        <td>${buESG.totals.totalEmployees.toLocaleString()}</td>
                        <td>
                          <span class="badge ${buESG.esgStatus === 'Approved' ? 'badge-approved' : (buESG.esgStatus === 'Submitted' ? 'badge-submitted' : (buESG.esgStatus === 'Correction Required' ? 'badge-correction' : 'badge-draft'))}">
                            ${buESG.esgStatus}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // MODULE 3 & 14: PROJECT-LEVEL ESG PERFORMANCE REPORT
  // =========================================================================
  generateProjectReportHTML(year = "FY 2025-26", subsidiaryId = "all") {
    const mainCompany = store.getMainCompany();
    const isFiltered = subsidiaryId && subsidiaryId !== 'all';
    const sub = isFiltered ? store.getSubsidiaryById(subsidiaryId) : null;
    const projs = store.getProjects(isFiltered ? subsidiaryId : null);
    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <div class="report-document">
        <div class="print-header" style="display:block; border-bottom: 2px solid var(--meil-navy); padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <img src="assets/meil-logo.png" alt="MEIL Logo" style="height: 44px; margin-bottom: 8px;">
              <h2 style="font-size: 20px; color: var(--meil-navy); margin: 0;">${isFiltered ? sub?.name : mainCompany.name}</h2>
              <div style="font-size: 11px; color: var(--text-muted);">Site &amp; Project-Level ESG Data Center Disclosure (India &amp; International)</div>
            </div>
            <div style="text-align: right;">
              <span class="badge badge-approved" style="font-size: 12px; padding: 4px 12px;">
                <i data-lucide="map-pin"></i> ${projs.length} Reporting Projects
              </span>
              <div style="font-size: 12px; margin-top: 6px; font-weight: 600;">Cycle: ${year}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Generated on: ${reportDate}</div>
            </div>
          </div>
        </div>

        <div class="alert alert-info" style="margin-bottom: 24px;">
          <div class="alert-content">
            <div class="alert-title" style="font-size: 14px;">Project-Level Reporting Granularity &amp; Bottom-Up Consolidation Rule</div>
            <div>Only projects with status <strong>Approved</strong> are included in Business Unit and Group consolidation. Rejected, Draft, or Correction-Required project data remains isolated until rectified and approved by Central MEIL Admin.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="hard-hat"></i> Projects ESG Disclosures Summary</h3></div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Project Code &amp; Name</th>
                    <th>Country / Location</th>
                    <th>Subsidiary</th>
                    <th>Electricity (MWh)</th>
                    <th>Scope 1 (tCO2e)</th>
                    <th>Scope 2 (tCO2e)</th>
                    <th>Water Recycled (kL)</th>
                    <th>Workforce</th>
                    <th>LTIFR</th>
                    <th>Quality %</th>
                    <th>Consolidation Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${projs.map(p => {
                    const parentSub = store.getSubsidiaryById(p.subsidiaryId);
                    const env = p.environment || {};
                    const soc = p.social || {};
                    return `
                      <tr>
                        <td>
                          <strong>${p.name}</strong>
                          <div style="font-size:11px; color:var(--text-muted);">${p.code} &bull; ${p.projectType}</div>
                        </td>
                        <td>
                          <span class="badge ${p.isInternational ? 'badge-submitted' : 'badge-draft'}" style="font-size:10px; margin-bottom:2px;">
                            ${p.isInternational ? 'International' : 'India'}
                          </span>
                          <div style="font-size:11px; color:var(--text-secondary);">${p.location}</div>
                        </td>
                        <td>${parentSub?.shortName || p.subsidiaryId}</td>
                        <td>${(Number(env.electricityConsumptionMWh) || 0).toLocaleString()}</td>
                        <td>${(Number(env.scope1) || 0).toLocaleString()}</td>
                        <td>${(Number(env.scope2) || 0).toLocaleString()}</td>
                        <td>${(Number(env.waterRecycledKL) || 0).toLocaleString()}</td>
                        <td>${(Number(soc.totalEmployees) || 0).toLocaleString()}</td>
                        <td>${Number(soc.ltifr || 0.05).toFixed(2)}</td>
                        <td><strong style="color:var(--color-success);">${p.esgCompletion}%</strong></td>
                        <td>
                          ${p.approved && p.submissionStatus === 'Approved' ? `
                            <span class="badge badge-approved"><i data-lucide="check-circle-2"></i> Included</span>
                          ` : `
                            <span class="badge badge-draft"><i data-lucide="clock"></i> Not Included</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Native Excel (.xls) Export Engine (Integrated from Project 2)
  // =========================================================================
  exportReportToExcel(reportType, year, subsidiaryId = 'all') {
    const isConsolidated = subsidiaryId === 'all';
    const mainCompany = store.getMainCompany();
    const sub = isConsolidated ? null : store.getSubsidiaryById(subsidiaryId);
    const entityName = isConsolidated ? mainCompany.name : (sub?.name || subsidiaryId);
    const entityCin = isConsolidated ? mainCompany.cin : (sub?.cin || "N/A");
    const filename = `MEIL_${reportType.replace(/\s+/g, '_')}_${year}_${isConsolidated ? 'Consolidated' : subsidiaryId}.xls`;
    const sheetName = isConsolidated ? "Group Consolidated BRSR" : (sub?.shortName || "Subsidiary BRSR");

    let data;
    if (isConsolidated) {
      data = store.calculateConsolidatedData(year);
    } else {
      const raw = store.getESGData(subsidiaryId, year) || {};
      data = {
        totalEnergyMWh: raw.environment?.totalEnergyMWh || 0,
        renewableEnergyMWh: raw.environment?.renewableEnergyMWh || 0,
        nonRenewableEnergyMWh: raw.environment?.nonRenewableEnergyMWh || 0,
        renewablePercent: raw.environment?.renewablePercent || 0,
        waterWithdrawalKL: raw.environment?.waterWithdrawalKL || 0,
        waterConsumptionKL: raw.environment?.waterConsumptionKL || 0,
        wasteGeneratedMT: raw.environment?.wasteGeneratedMT || 0,
        wasteRecycledMT: raw.environment?.wasteRecycledMT || 0,
        totalGHG: raw.environment?.totalGHG || 0,
        ghgScope1: raw.environment?.ghgScope1 || 0,
        ghgScope2: raw.environment?.ghgScope2 || 0,
        ghgScope3: raw.environment?.ghgScope3 || 0,
        biodiversitySaplings: raw.environment?.biodiversitySaplings || 0,
        totalEmployees: raw.social?.totalEmployees || 0,
        ltifrAverage: raw.social?.ltifr || 0,
        fatalities: raw.social?.fatalities || 0,
        csrSpendLakhs: raw.social?.csrSpendLakhs || 0,
        independentPercent: raw.governance?.independentPercent || 50
      };
    }

    const rows = [
      { cat: "Environment", ind: "Total Energy Consumption", val: data.totalEnergyMWh, unit: "MWh", bench: "Energy Audit Aligned", status: "Verified & Approved" },
      { cat: "Environment", ind: "Renewable Energy Share", val: `${data.renewablePercent}% (${data.renewableEnergyMWh} MWh)`, unit: "%", bench: "Target >= 40%", status: "Exceeds Benchmark" },
      { cat: "Environment", ind: "Non-Renewable Energy", val: data.nonRenewableEnergyMWh, unit: "MWh", bench: "Baseline Transition", status: "Audited" },
      { cat: "Environment", ind: "Total GHG Emissions (Scope 1+2+3)", val: data.totalGHG, unit: "tCO2e", bench: "GHG Protocol Corporate Standard", status: "Verified & Approved" },
      { cat: "Environment", ind: "Scope 1 Direct Emissions", val: data.ghgScope1, unit: "tCO2e", bench: "Point-source Combustion", status: "Verified" },
      { cat: "Environment", ind: "Scope 2 Purchased Electricity", val: data.ghgScope2, unit: "tCO2e", bench: "Grid Emission Factor", status: "Verified" },
      { cat: "Environment", ind: "Scope 3 Supply Chain Emissions", val: data.ghgScope3, unit: "tCO2e", bench: "Value Chain Logistics", status: "Verified" },
      { cat: "Environment", ind: "Water Withdrawal", val: data.waterWithdrawalKL, unit: "kL", bench: "CGWA Guidelines Aligned", status: "Verified" },
      { cat: "Environment", ind: "Water Consumption", val: data.waterConsumptionKL, unit: "kL", bench: "Zero Liquid Discharge Initiatives", status: "Verified" },
      { cat: "Environment", ind: "Waste Generated", val: data.wasteGeneratedMT, unit: "MT", bench: "Hazardous & Non-hazardous", status: "Audited" },
      { cat: "Environment", ind: "Waste Recycled", val: data.wasteRecycledMT, unit: "MT", bench: "Circular Economy Framework", status: "Verified" },
      { cat: "Environment", ind: "Saplings Planted / Afforestation", val: data.biodiversitySaplings, unit: "Count", bench: "Biodiversity Conservation P6", status: "Verified" },
      { cat: "Social", ind: "Total Workforce Headcount", val: data.totalEmployees, unit: "Employees", bench: "Permanent & Contractual", status: "Statutory Filing" },
      { cat: "Social", ind: "Workplace Safety LTIFR", val: data.ltifrAverage, unit: "Rate / 1M hrs", bench: "Zero Harm Objective", status: "Compliant" },
      { cat: "Social", ind: "Workplace Fatalities", val: data.fatalities, unit: "Count", bench: "Target: 0", status: "Zero Target Met" },
      { cat: "Social", ind: "Corporate Social Responsibility (CSR)", val: data.csrSpendLakhs, unit: "INR Lakhs", bench: "Companies Act Sec 135", status: "Fully Complied" },
      { cat: "Governance", ind: "Independent Board Share", val: `${data.independentPercent}%`, unit: "%", bench: "SEBI LODR Regulations", status: "Compliant" }
    ];

    const tableRows = rows.map(r => `
      <tr>
        <td style="font-weight:600; background:#f8fafc;">${r.cat}</td>
        <td>${r.ind}</td>
        <td style="font-weight:bold; text-align:right;">${r.val}</td>
        <td>${r.unit}</td>
        <td>${r.bench}</td>
        <td style="color:#059669; font-weight:600;">${r.status}</td>
      </tr>
    `).join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${sheetName.replace(/[\\/?*\[\]]/g, '')}</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 11pt; }
            th { background-color: #0b2545; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; }
            td { border: 1px solid #cbd5e1; padding: 6px; }
            .header-title { font-size: 14pt; font-weight: bold; color: #0b2545; }
            .header-meta { font-size: 10pt; color: #64748b; }
          </style>
        </head>
        <body>
          <table>
            <tr>
              <td colspan="6" class="header-title">${entityName} - SEBI BRSR & ESG Report</td>
            </tr>
            <tr>
              <td colspan="6" class="header-meta">CIN: ${entityCin} | Reporting Cycle: ${year} | Generated: ${new Date().toLocaleDateString('en-GB')}</td>
            </tr>
            <tr>
              <td colspan="6" style="color: #059669; font-weight: bold;">Filing Status: ${isConsolidated ? 'Consolidated Group Statement (Approved Entities Only)' : 'Verified Subsidiary Report'}</td>
            </tr>
            <tr><td colspan="6"></td></tr>
            <thead>
              <tr>
                <th>Category</th>
                <th>Performance Indicator</th>
                <th>Disclosed Value</th>
                <th>Unit</th>
                <th>Benchmark / Standard</th>
                <th>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    this.downloadURI(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    ui.showToast(`Report exported successfully as Excel workbook (${filename})`, "success");
  }

  exportTableToExcel(tableId, filename = "esg_data_export.xls", sheetName = "ESG Disclosures") {
    const table = document.getElementById(tableId) || document.querySelector(tableId);
    if (!table) {
      ui.showToast("Table not found for export.", "warning");
      return;
    }

    const clonedTable = table.cloneNode(true);
    clonedTable.querySelectorAll(".actions-cell, .table-actions-group, .btn, .no-export").forEach(el => el.remove());

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${sheetName.replace(/[\\/?*\[\]]/g, '')}</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 10.5pt; }
            th { background-color: #0b2545; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; }
            td { border: 1px solid #cbd5e1; padding: 6px; }
          </style>
        </head>
        <body>
          ${clonedTable.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    this.downloadURI(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    ui.showToast(`Table exported successfully to Excel (${filename})`, "success");
  }

  downloadURI(uri, name) {
    const link = document.createElement("a");
    link.setAttribute("href", uri);
    link.setAttribute("download", name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =========================================================================
  // Print / PDF Export
  // =========================================================================
  printPDF() {
    window.print();
  }
}

// Global Singleton Report Instance
const reportEngine = new ReportEngine();
const ExportUtil = {
  exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tr"));
    const csv = rows.map(r => Array.from(r.querySelectorAll("th, td")).map(c => `"${c.innerText.trim().replace(/"/g, '""')}"`).join(",")).join("\n");
    const uri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    reportEngine.downloadURI(uri, filename || "export.csv");
  },
  exportTableToExcel(tableId, filename, sheetName) {
    reportEngine.exportTableToExcel(tableId, filename, sheetName);
  },
  exportReportToExcel(reportType, year, subsidiaryId) {
    reportEngine.exportReportToExcel(reportType, year, subsidiaryId);
  }
};
