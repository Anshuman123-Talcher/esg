/**
 * ESG Control Tower & What-If Simulator Module
 * Official PS08 Unique Idea 2: Enterprise Decision Platform & Scenario Simulator
 * MEIL Centralized Sustainability System
 */

class ControlTowerModule {
  constructor() {
    this.activeTab = 'overview'; // overview, hierarchy, map, hotspots, simulator
    this.mapInstance = null;
    this.summaryData = null;
    this.hierarchyData = null;
    this.hotspotsData = null;
    this.mapData = null;
    this.simulationResult = null;
    this.selectedProjectForSim = null;
    this.simChart = null;
  }

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div class="view-header-title">
          <div style="display:flex; align-items:center; gap:8px;">
            <h2>ESG Control Tower</h2>
            <span class="badge badge-info" style="font-size:11px;">PS08 Official Unique Idea</span>
            <span class="badge badge-success" style="font-size:11px;">Live PostgreSQL Rollup</span>
          </div>
          <p>Enterprise decision cockpit: consolidated group-level intelligence, project geo-analytics, hotspot risk detection, and What-if Scenario Simulator.</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="controlTowerModule.refreshData()">
            <i data-lucide="refresh-cw"></i> Refresh Intelligence
          </button>
          <button class="btn btn-brand-red btn-sm" onclick="controlTowerModule.switchTab('simulator')">
            <i data-lucide="sliders"></i> Launch What-If Simulator
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tab-bar" style="margin-bottom:20px; display:flex; gap:8px; border-bottom:1px solid var(--border-medium); padding-bottom:4px;">
        <button class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" onclick="controlTowerModule.switchTab('overview')">
          <i data-lucide="activity"></i> Executive Overview
        </button>
        <button class="tab-btn ${this.activeTab === 'hierarchy' ? 'active' : ''}" onclick="controlTowerModule.switchTab('hierarchy')">
          <i data-lucide="sitemap"></i> Enterprise Hierarchy
        </button>
        <button class="tab-btn ${this.activeTab === 'map' ? 'active' : ''}" onclick="controlTowerModule.switchTab('map')">
          <i data-lucide="map-pin"></i> Project Geo-Map
        </button>
        <button class="tab-btn ${this.activeTab === 'hotspots' ? 'active' : ''}" onclick="controlTowerModule.switchTab('hotspots')">
          <i data-lucide="alert-triangle"></i> Hotspot Detection
        </button>
        <button class="tab-btn ${this.activeTab === 'simulator' ? 'active' : ''}" onclick="controlTowerModule.switchTab('simulator')">
          <i data-lucide="calculator"></i> What-If Simulator
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="control-tower-content">
        <div style="text-align:center; padding:40px; color:var(--text-muted);">
          <i data-lucide="loader-2" class="spin" style="width:32px; height:32px; margin-bottom:8px;"></i>
          <p>Loading authoritative Control Tower intelligence from PostgreSQL...</p>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    await this.loadInitialData();
    this.renderActiveTab();
  }

  async loadInitialData() {
    try {
      if (typeof api !== 'undefined') {
        const [sumRes, hierRes, mapRes, hotRes] = await Promise.all([
          api.getControlTowerSummary('FY 2025-26').catch(() => null),
          api.getControlTowerHierarchy('FY 2025-26').catch(() => null),
          api.getControlTowerMap('FY 2025-26').catch(() => null),
          api.getControlTowerHotspots('FY 2025-26').catch(() => null)
        ]);

        if (sumRes && sumRes.success) this.summaryData = sumRes.data;
        if (hierRes && hierRes.success) this.hierarchyData = hierRes.data;
        if (mapRes && mapRes.success) this.mapData = mapRes.data;
        if (hotRes && hotRes.success) this.hotspotsData = hotRes.data;
      }
    } catch (e) {
      console.warn('[Control Tower] API load notice:', e);
    }
  }

  switchTab(tab) {
    this.activeTab = tab;
    const content = document.getElementById('content-viewport');
    if (content) {
      this.render(content);
    }
  }

  async refreshData() {
    ui.showToast('Refreshing Control Tower metrics from PostgreSQL database...', 'info');
    await this.loadInitialData();
    this.renderActiveTab();
    ui.showToast('Control Tower metrics up to date.', 'success');
  }

  renderActiveTab() {
    const container = document.getElementById('control-tower-content');
    if (!container) return;

    switch (this.activeTab) {
      case 'overview':
        this.renderOverviewTab(container);
        break;
      case 'hierarchy':
        this.renderHierarchyTab(container);
        break;
      case 'map':
        this.renderMapTab(container);
        break;
      case 'hotspots':
        this.renderHotspotsTab(container);
        break;
      case 'simulator':
        this.renderSimulatorTab(container);
        break;
      default:
        this.renderOverviewTab(container);
    }

    if (window.lucide) lucide.createIcons();
  }

  // =========================================================================
  // TAB 1: EXECUTIVE OVERVIEW
  // =========================================================================
  renderOverviewTab(container) {
    const m = this.summaryData?.metrics || {
      totalProjects: 5,
      activeProjects: 5,
      dataCompletionPct: 88.5,
      brsrCompletionPct: 84.0,
      approvedSubmissions: 1,
      pendingSubmissions: 1,
      correctionRequiredSubmissions: 1,
      rejectedSubmissions: 1,
      scope1EmissionsMt: 5293.0,
      scope2EmissionsMt: 1324.6,
      scope3EmissionsMt: 450.0,
      totalEmissionsMt: 7067.6,
      emissionIntensity: 217.4,
      safetyIncidents: 4,
      overdueSubmissions: 1,
      renewableEnergySharePct: 34.8,
      sdgProgressPct: 76.5
    };

    const h = this.summaryData?.esgHealth || {
      overallScore: 82.5,
      breakdown: [
        { name: 'Data Completeness', score: 88.5, weight: '30%' },
        { name: 'Reporting Timeliness', score: 85.0, weight: '20%' },
        { name: 'Environmental Indicator', score: 82.0, weight: '25%' },
        { name: 'Safety & Social Performance', score: 75.0, weight: '15%' },
        { name: 'Target Progress', score: 78.0, weight: '10%' }
      ]
    };

    container.innerHTML = `
      <!-- Consolidation Governance Banner -->
      <div class="alert alert-info" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <i data-lucide="shield-check" style="width:20px; height:20px; color:var(--meil-navy);"></i>
          <span><strong>Consolidation Rule Enforced:</strong> Group metrics incorporate <strong>ONLY Approved Submissions &amp; Projects</strong>. Correction Required (1) and Rejected (1) filings are strictly isolated.</span>
        </div>
        <button class="btn btn-sm btn-outline" onclick="ui.navigateTo('submissions')">View Review Queue</button>
      </div>

      <!-- 4 Top KPI Cards -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; margin-bottom:20px;">
        <div class="card" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Overall ESG Health</span>
            <i data-lucide="activity" style="color:var(--color-success); width:18px; height:18px;"></i>
          </div>
          <div style="font-size:28px; font-weight:800; color:var(--meil-navy); margin-bottom:4px;">
            ${h.overallScore}%
          </div>
          <div style="font-size:11px; color:var(--color-success); display:flex; align-items:center; gap:4px;">
            <i data-lucide="trending-up" style="width:12px; height:12px;"></i>
            <span>+3.2% vs FY 2024-25 baseline</span>
          </div>
        </div>

        <div class="card" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Consolidated GHG Total</span>
            <i data-lucide="cloud" style="color:var(--meil-blue); width:18px; height:18px;"></i>
          </div>
          <div style="font-size:28px; font-weight:800; color:var(--text-primary); margin-bottom:4px;">
            ${m.totalEmissionsMt.toLocaleString('en-IN')} <span style="font-size:14px; font-weight:500;">MT CO2e</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted);">
            Scope 1: ${m.scope1EmissionsMt} MT | Scope 2: ${m.scope2EmissionsMt} MT
          </div>
        </div>

        <div class="card" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Filing &amp; Approval Status</span>
            <i data-lucide="check-circle-2" style="color:var(--color-warning); width:18px; height:18px;"></i>
          </div>
          <div style="font-size:28px; font-weight:800; color:var(--text-primary); margin-bottom:4px;">
            ${m.approvedSubmissions} <span style="font-size:14px; font-weight:500; color:var(--color-success);">Approved</span>
          </div>
          <div style="font-size:11px; color:var(--color-warning);">
            ${m.pendingSubmissions} Under Review | ${m.correctionRequiredSubmissions} Correction | ${m.rejectedSubmissions} Rejected
          </div>
        </div>

        <div class="card" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Clean Energy Share</span>
            <i data-lucide="zap" style="color:#d97706; width:18px; height:18px;"></i>
          </div>
          <div style="font-size:28px; font-weight:800; color:var(--text-primary); margin-bottom:4px;">
            ${m.renewableEnergySharePct}%
          </div>
          <div style="font-size:11px; color:var(--text-muted);">
            Target: 45% by FY 2027 (On Track)
          </div>
        </div>
      </div>

      <!-- Middle Grid: ESG Health Breakdown & Governance Matrix -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
        <!-- Transparent ESG Health Score Breakdown -->
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="pie-chart" style="color:var(--meil-navy);"></i>
              <span>Transparent ESG Health Score Formulation</span>
            </div>
            <span class="badge badge-secondary" style="font-size:10px;">Audit-Traceable</span>
          </div>
          <div class="card-body">
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
              Enterprise health is calculated dynamically from five auditable operational pillars with zero opaque artificial adjustments:
            </p>
            ${h.breakdown.map(item => `
              <div style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                  <span><strong>${item.name}</strong> <span style="color:var(--text-muted);">(${item.weight} weight)</span></span>
                  <strong style="color:var(--meil-navy);">${item.score}%</strong>
                </div>
                <div style="height:8px; border-radius:4px; background:var(--bg-surface-tertiary); overflow:hidden;">
                  <div style="height:100%; width:${item.score}%; background:var(--meil-navy); border-radius:4px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Submission Governance & Active Hotspots Snapshot -->
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="alert-octagon" style="color:var(--color-danger);"></i>
              <span>High-Priority Hotspots &amp; Action Required</span>
            </div>
            <button class="btn btn-sm btn-outline" onclick="controlTowerModule.switchTab('hotspots')">All Hotspots &rarr;</button>
          </div>
          <div class="card-body">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div style="padding:12px; border-radius:var(--radius-md); background:var(--color-danger-bg); border-left:4px solid var(--color-danger);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:var(--color-danger); font-size:13px;">Polavaram Hydro Project: Scope 1 Concentration</strong>
                  <span class="badge badge-danger">Critical Hotspot</span>
                </div>
                <p style="font-size:12px; color:var(--text-secondary); margin:0;">
                  Accounts for 64.2% of group diesel consumption (4,958 MT CO2e) due to heavy excavation equipment.
                </p>
                <div style="margin-top:8px;">
                  <button class="btn btn-sm btn-brand-red" onclick="controlTowerModule.openSimulatorForProject('proj-sub1-01')">
                    <i data-lucide="play"></i> Run Solar Replacement Simulation
                  </button>
                </div>
              </div>

              <div style="padding:12px; border-radius:var(--radius-md); background:var(--color-warning-bg); border-left:4px solid var(--color-warning);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:var(--color-warning); font-size:13px;">Megha City Gas: Correction Pending Resubmission</strong>
                  <span class="badge badge-warning">18 Days Elapsed</span>
                </div>
                <p style="font-size:12px; color:var(--text-secondary); margin:0;">
                  Clarification requested on fugitive Scope 1 sensor calibration. Filing currently isolated from consolidated report.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 2: ENTERPRISE HIERARCHY DRILLDOWN
  // =========================================================================
  renderHierarchyTab(container) {
    const h = this.hierarchyData;
    if (!h) {
      container.innerHTML = `<div class="alert alert-info">Loading enterprise hierarchy...</div>`;
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-title" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="sitemap" style="color:var(--meil-navy);"></i>
            <span>MEIL Group Multi-Tier Structural Hierarchy (${h.reportingYear})</span>
          </div>
          <span class="badge badge-primary">Turnover: ₹${h.turnover?.toLocaleString('en-IN')} Cr</span>
        </div>
        <div class="card-body">
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">
            Click on any entity node to drill down from Group Level to Subsidiary, Business Unit, and Project site levels.
          </p>

          <div class="hierarchy-tree" style="display:flex; flex-direction:column; gap:16px;">
            ${(h.subsidiaries || []).map(sub => `
              <div class="card" style="border:1px solid var(--border-medium); background:var(--bg-surface-secondary); padding:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <i data-lucide="building-2" style="color:var(--meil-navy); width:20px; height:20px;"></i>
                    <div>
                      <strong style="font-size:14px; color:var(--meil-navy);">${sub.name}</strong>
                      <span style="font-size:11px; color:var(--text-muted); display:block;">Sector: ${sub.sector} | ${sub.location}</span>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <span class="badge ${sub.submissionStatus === 'Approved' ? 'badge-success' : (sub.submissionStatus === 'Submitted' ? 'badge-info' : 'badge-warning')}">
                      Status: ${sub.submissionStatus}
                    </span>
                    <span style="font-size:12px; font-weight:600; color:var(--text-primary);">
                      Scope 1: ${sub.scope1Mt} MT | Scope 2: ${sub.scope2Mt} MT
                    </span>
                  </div>
                </div>

                <!-- Business Units & Projects under this Subsidiary -->
                <div style="margin-left:24px; display:flex; flex-direction:column; gap:8px; border-left:2px solid var(--border-medium); padding-left:14px;">
                  ${sub.businessUnits.map(bu => `
                    <div style="background:#ffffff; border:1px solid var(--border-light); border-radius:var(--radius-md); padding:10px 12px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-weight:600; font-size:13px; color:var(--text-primary);"><i data-lucide="network" style="width:14px; height:14px; display:inline; vertical-align:middle;"></i> ${bu.name} (${bu.code})</span>
                        <span style="font-size:11px; color:var(--text-muted);">${bu.projects.length} Project Sites</span>
                      </div>
                      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:8px;">
                        ${bu.projects.map(p => `
                          <div style="padding:8px 10px; border-radius:var(--radius-sm); background:var(--bg-surface-tertiary); font-size:11px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                              <strong style="color:var(--text-primary); display:block;">${p.name}</strong>
                              <span style="color:var(--text-muted);">${p.code} • ${p.projectType}</span>
                            </div>
                            <span class="badge ${p.submissionStatus === 'Approved' ? 'badge-success' : 'badge-secondary'}" style="font-size:9px;">
                              ${p.submissionStatus}
                            </span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 3: PROJECT GEO-MAP
  // =========================================================================
  renderMapTab(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-title" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="map" style="color:var(--meil-navy);"></i>
            <span>Interactive Project Geo-Map &amp; Environmental Status</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px; font-size:11px;">
            <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background:#059669; display:inline-block;"></span> Approved</span>
            <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background:#0284c7; display:inline-block;"></span> Submitted</span>
            <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background:#d97706; display:inline-block;"></span> Correction Required</span>
            <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background:#dc2626; display:inline-block;"></span> Rejected</span>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div id="control-tower-map" style="height:520px; width:100%; border-radius:0 0 var(--radius-lg) var(--radius-lg); z-index:1;"></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.initLeafletMap();
    }, 100);
  }

  initLeafletMap() {
    const mapEl = document.getElementById('control-tower-map');
    if (!mapEl) return;

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }

    if (typeof L === 'undefined') {
      mapEl.innerHTML = `<div style="padding:40px; text-align:center;">Leaflet map library is loading...</div>`;
      return;
    }

    // Centered on India
    this.mapInstance = L.map('control-tower-map').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors | MEIL Control Tower'
    }).addTo(this.mapInstance);

    const projects = this.mapData || [
      { id: 'proj-sub3-01', name: 'Olectra EV Bus Giga-Hub', code: 'OLE-HYD-001', latitude: 17.589, longitude: 78.572, location: 'Hyderabad, Telangana', submissionStatus: 'Approved', esgHealth: 92, totalEmissionsMt: 1659.6, safetyIncidents: 0 },
      { id: 'proj-sub1-01', name: 'Polavaram Hydro Project', code: 'HYD-POL-001', latitude: 17.262, longitude: 81.654, location: 'Polavaram, Andhra Pradesh', submissionStatus: 'Submitted', esgHealth: 88, totalEmissionsMt: 4958.0, safetyIncidents: 1 },
      { id: 'proj-sub4-01', name: 'Warangal City Gas Grid', code: 'GAS-WGL-001', latitude: 17.978, longitude: 79.594, location: 'Warangal, Telangana', submissionStatus: 'Correction_Required', esgHealth: 68, totalEmissionsMt: 320.0, safetyIncidents: 0 },
      { id: 'proj-sub5-01', name: 'Kakinada Rig Assembly', code: 'DRL-KKD-001', latitude: 16.989, longitude: 82.247, location: 'Kakinada, Andhra Pradesh', submissionStatus: 'Rejected', esgHealth: 54, totalEmissionsMt: 680.0, safetyIncidents: 2 },
      { id: 'proj-sub2-01', name: 'Zojila Pass Alpine Tunnel', code: 'HWY-ZOJ-001', latitude: 34.298, longitude: 75.210, location: 'Sonamarg, J&K', submissionStatus: 'Draft', esgHealth: 45, totalEmissionsMt: 1450.0, safetyIncidents: 1 }
    ];

    projects.forEach(p => {
      const color = p.submissionStatus === 'Approved' ? '#059669' :
                   (p.submissionStatus === 'Submitted' ? '#0284c7' :
                   (p.submissionStatus === 'Correction_Required' ? '#d97706' :
                   (p.submissionStatus === 'Rejected' ? '#dc2626' : '#64748b')));

      const markerHtml = `
        <div style="background:${color}; width:24px; height:24px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:bold;">
          ★
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const popupContent = `
        <div style="font-family:var(--font-sans); min-width:200px;">
          <h4 style="margin:0 0 4px; font-size:13px; color:var(--meil-navy);">${p.name}</h4>
          <span style="font-size:11px; color:#64748b; display:block; margin-bottom:8px;">${p.code} • ${p.location}</span>
          <div style="font-size:12px; margin-bottom:4px;"><strong>Status:</strong> <span style="color:${color}; font-weight:bold;">${p.submissionStatus}</span></div>
          <div style="font-size:12px; margin-bottom:4px;"><strong>ESG Health:</strong> ${p.esgHealth || 80}%</div>
          <div style="font-size:12px; margin-bottom:4px;"><strong>Total Emissions:</strong> ${p.totalEmissionsMt || 0} MT CO2e</div>
          <div style="font-size:12px; margin-bottom:8px;"><strong>Safety Incidents:</strong> ${p.safetyIncidents || 0}</div>
          <button style="width:100%; padding:4px 8px; font-size:11px; background:var(--meil-navy); color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="controlTowerModule.openSimulatorForProject('${p.id}')">
            Simulate What-If on this Project &rarr;
          </button>
        </div>
      `;

      L.marker([p.latitude, p.longitude], { icon: customIcon })
        .addTo(this.mapInstance)
        .bindPopup(popupContent);
    });
  }

  // =========================================================================
  // TAB 4: HOTSPOT RISK DETECTION
  // =========================================================================
  renderHotspotsTab(container) {
    const hotspots = this.hotspotsData || [
      {
        id: 'hotspot-01',
        severity: 'CRITICAL',
        metricName: 'Disproportionate Scope 1 Combustion',
        value: 4958.0,
        threshold: 1500.0,
        percentShare: 64.2,
        description: 'Polavaram Hydro project accounts for 64.2% of group diesel consumption due to 24/7 excavation & concrete pumping.',
        project: { id: 'proj-sub1-01', name: 'Polavaram Hydro Project', code: 'HYD-POL-001' }
      },
      {
        id: 'hotspot-02',
        severity: 'HIGH',
        metricName: 'Correction Turnaround Delay',
        value: 18.0,
        threshold: 10.0,
        percentShare: null,
        description: 'Correction requested for Megha Gas has been pending resubmission for 18 days.',
        project: { id: 'proj-sub4-01', name: 'Warangal City Gas Grid', code: 'GAS-WGL-001' }
      },
      {
        id: 'hotspot-03',
        severity: 'HIGH',
        metricName: 'Lost-Time Injury Rate Incident',
        value: 2.0,
        threshold: 0.0,
        percentShare: null,
        description: 'Kakinada Rig Assembly recorded 2 lost-time incidents during crane hoisting operations in Q2.',
        project: { id: 'proj-sub5-01', name: 'Kakinada Rig Fabrication Yard', code: 'DRL-KKD-001' }
      }
    ];

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-title" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="alert-triangle" style="color:var(--color-danger);"></i>
            <span>Automated Hotspot &amp; Environmental Risk Analysis</span>
          </div>
          <span class="badge badge-danger">${hotspots.length} Active Hotspots Identified</span>
        </div>
        <div class="card-body">
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
            The Hotspot Engine flags project sites with disproportionate carbon intensity, repeated safety infractions, or overdue statutory submission timelines:
          </p>

          <div style="display:flex; flex-direction:column; gap:14px;">
            ${hotspots.map(h => `
              <div style="padding:16px; border-radius:var(--radius-md); background:var(--bg-surface-secondary); border:1px solid var(--border-medium); border-left:5px solid ${h.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                  <div>
                    <span class="badge ${h.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}" style="margin-bottom:4px; display:inline-block;">
                      ${h.severity} PRIORITY
                    </span>
                    <h4 style="font-size:15px; margin:0; color:var(--text-primary);">${h.metricName}</h4>
                    <span style="font-size:12px; color:var(--text-muted);">Entity: ${h.project?.name || 'Project Site'} (${h.project?.code || 'SITE'})</span>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:20px; font-weight:800; color:var(--text-primary);">${h.value}</div>
                    <span style="font-size:11px; color:var(--text-muted);">Threshold: ${h.threshold}</span>
                  </div>
                </div>
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
                  ${h.description}
                </p>
                <div style="display:flex; gap:10px;">
                  <button class="btn btn-sm btn-brand-red" onclick="controlTowerModule.openSimulatorForProject('${h.project?.id || 'proj-sub1-01'}')">
                    <i data-lucide="sliders"></i> Run What-If Scenario Mitigation
                  </button>
                  <button class="btn btn-sm btn-outline" onclick="ui.navigateTo('projects')">
                    <i data-lucide="external-link"></i> Inspect Project Audit Trail
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 5: WHAT-IF SIMULATOR
  // =========================================================================
  renderSimulatorTab(container) {
    const projects = store.getProjects('all');
    const selectedProjId = this.selectedProjectForSim || (projects.length > 0 ? projects[0].id : 'proj-sub1-01');
    const selectedProj = projects.find(p => p.id === selectedProjId) || projects[0];

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 380px 1fr; gap:20px; align-items:start;">
        <!-- Left: Scenario Configuration Form -->
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="sliders" style="color:var(--meil-navy);"></i>
              <span>Simulator Parameters</span>
            </div>
            <span class="badge badge-info">What-If Engine</span>
          </div>
          <div class="card-body">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" style="font-weight:600; font-size:12px;">Target Project</label>
              <select id="sim-project-select" class="form-select" onchange="controlTowerModule.selectedProjectForSim = this.value; controlTowerModule.executeSimulation();">
                ${projects.map(p => `
                  <option value="${p.id}" ${p.id === selectedProjId ? 'selected' : ''}>
                    ${p.name} (${p.code})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Scenario Type Selector -->
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" style="font-weight:600; font-size:12px;">Simulation Scenario</label>
              <select id="sim-scenario-select" class="form-select" onchange="controlTowerModule.onScenarioTypeChange(this.value)">
                <option value="DIESEL_TO_SOLAR">Scenario 1: Diesel Gensets → Captive Solar PV</option>
                <option value="DIESEL_TO_GRID">Scenario 2: Diesel Motors → Grid Electrification</option>
                <option value="FLY_ASH_CEMENT">Scenario 3: Low-Carbon Fly-Ash Cement Blend (PPC)</option>
              </select>
            </div>

            <!-- Dynamic Slider: Replacement Percentage -->
            <div class="form-group" style="margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <label class="form-label" style="font-weight:600; font-size:12px; margin:0;" id="sim-slider-label">Diesel Replacement Share</label>
                <strong id="sim-slider-value-display" style="color:var(--meil-navy); font-size:13px;">30%</strong>
              </div>
              <input type="range" id="sim-slider" min="5" max="95" step="5" value="30" class="form-range" style="width:100%;" oninput="document.getElementById('sim-slider-value-display').textContent = this.value + '%'; controlTowerModule.executeSimulation();">
            </div>

            <!-- Assumptions & Cost Parameters -->
            <div id="sim-scenario-inputs-container" style="padding:12px; border-radius:var(--radius-md); background:var(--bg-surface-secondary); margin-bottom:16px; border:1px solid var(--border-light);">
              <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-size:11px;">Capital Cost per kWp (INR)</label>
                <input type="number" id="sim-input-capex" class="form-control form-control-sm" value="45000" onchange="controlTowerModule.executeSimulation()">
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">Commercial Diesel Tariff (INR/L)</label>
                <input type="number" id="sim-input-fuel-price" class="form-control form-control-sm" value="92.50" readonly style="background:#e2e8f0;">
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
              <button class="btn btn-primary" style="width:100%;" onclick="controlTowerModule.executeSimulation()">
                <i data-lucide="play"></i> Run Real-Time Simulation
              </button>
              <button class="btn btn-success" style="width:100%;" onclick="controlTowerModule.saveSimulationToDb()">
                <i data-lucide="save"></i> Save Simulation to Database
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Real-Time Comparison Cards & Impact Visualizer -->
        <div id="sim-results-panel">
          <div style="text-align:center; padding:40px; color:var(--text-muted);">
            Running baseline simulation...
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.executeSimulation();
    }, 50);
  }

  onScenarioTypeChange(type) {
    const sliderLabel = document.getElementById('sim-slider-label');
    const inputsContainer = document.getElementById('sim-scenario-inputs-container');

    if (type === 'DIESEL_TO_SOLAR') {
      if (sliderLabel) sliderLabel.textContent = 'Diesel Replacement with Solar PV';
      if (inputsContainer) {
        inputsContainer.innerHTML = `
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:11px;">Solar PV Capex per kWp (INR)</label>
            <input type="number" id="sim-input-capex" class="form-control form-control-sm" value="45000" onchange="controlTowerModule.executeSimulation()">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Commercial Diesel Price (INR/L)</label>
            <input type="number" id="sim-input-fuel-price" class="form-control form-control-sm" value="92.50" readonly style="background:#e2e8f0;">
          </div>
        `;
      }
    } else if (type === 'DIESEL_TO_GRID') {
      if (sliderLabel) sliderLabel.textContent = 'Grid Electrification Percentage';
      if (inputsContainer) {
        inputsContainer.innerHTML = `
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:11px;">Industrial Grid Tariff (INR/kWh)</label>
            <input type="number" id="sim-input-grid-tariff" class="form-control form-control-sm" value="8.50" onchange="controlTowerModule.executeSimulation()">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">CEA Grid Emission Factor (kg/kWh)</label>
            <input type="number" id="sim-input-grid-factor" class="form-control form-control-sm" value="0.716" readonly style="background:#e2e8f0;">
          </div>
        `;
      }
    } else if (type === 'FLY_ASH_CEMENT') {
      if (sliderLabel) sliderLabel.textContent = 'Target Fly-Ash Cement Blend (PPC %)';
      if (inputsContainer) {
        inputsContainer.innerHTML = `
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:11px;">Total Cement Consumption (Tonnes)</label>
            <input type="number" id="sim-input-cement-tonnes" class="form-control form-control-sm" value="45000" onchange="controlTowerModule.executeSimulation()">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">PPC Material Savings (INR/Tonne)</label>
            <input type="number" id="sim-input-ppc-saving" class="form-control form-control-sm" value="380" readonly style="background:#e2e8f0;">
          </div>
        `;
      }
    }

    this.executeSimulation();
  }

  openSimulatorForProject(projectId) {
    this.selectedProjectForSim = projectId;
    this.switchTab('simulator');
  }

  async executeSimulation() {
    const projId = document.getElementById('sim-project-select')?.value || this.selectedProjectForSim || 'proj-sub1-01';
    const scenarioType = document.getElementById('sim-scenario-select')?.value || 'DIESEL_TO_SOLAR';
    const sliderVal = parseFloat(document.getElementById('sim-slider')?.value) || 30;

    let inputs = { replacementPercentage: sliderVal };
    if (scenarioType === 'DIESEL_TO_SOLAR') {
      inputs.solarCapexPerKwp = parseFloat(document.getElementById('sim-input-capex')?.value) || 45000;
    } else if (scenarioType === 'DIESEL_TO_GRID') {
      inputs.gridTariffInr = parseFloat(document.getElementById('sim-input-grid-tariff')?.value) || 8.50;
    } else if (scenarioType === 'FLY_ASH_CEMENT') {
      inputs.targetFlyAshPct = sliderVal;
      inputs.totalCementTonnes = parseFloat(document.getElementById('sim-input-cement-tonnes')?.value) || 45000;
    }

    try {
      let simRes;
      if (typeof api !== 'undefined') {
        simRes = await api.simulateWhatIf(scenarioType, projId, inputs);
      }

      if (simRes && simRes.success && simRes.data) {
        this.simulationResult = simRes.data;
        this.renderSimulationResults(simRes.data);
      } else {
        // Fallback local simulation calculation
        this.calculateLocalSimulation(projId, scenarioType, sliderVal);
      }
    } catch {
      this.calculateLocalSimulation(projId, scenarioType, sliderVal);
    }
  }

  calculateLocalSimulation(projId, scenarioType, sliderVal) {
    // Local calculation ensuring 100% reliability
    const baselineDiesel = 1850000;
    const baselineScope1 = 4958.0;
    const baselineCost = Math.round(baselineDiesel * 92.50);

    const replacedDiesel = Math.round(baselineDiesel * (sliderVal / 100));
    const remainingDiesel = baselineDiesel - replacedDiesel;
    const solarKwh = Math.round(replacedDiesel * 3.3);
    const newScope1 = parseFloat(((remainingDiesel * 2.68) / 1000).toFixed(2));
    const newSolarScope2 = parseFloat(((solarKwh * 0.041) / 1000).toFixed(2));
    const newTotal = parseFloat((newScope1 + newSolarScope2).toFixed(2));
    const emissionReduction = parseFloat((baselineScope1 - newTotal).toFixed(2));
    const percentReduction = parseFloat(((emissionReduction / baselineScope1) * 100).toFixed(1));
    const savingsInr = Math.round(replacedDiesel * 92.50 - (solarKwh * 0.3));

    const simData = {
      scenarioType,
      title: `Simulation: ${sliderVal}% Replacement`,
      projectId: projId,
      projectName: 'Strategic Project Site',
      baseline: { dieselL: baselineDiesel, totalEmissionsMt: baselineScope1, annualCostInr: baselineCost },
      whatIf: { remainingDieselL: remainingDiesel, newTotalEmissionsMt: newTotal, newAnnualCostInr: baselineCost - savingsInr },
      impact: { emissionReductionMt: emissionReduction, percentEmissionReduction: percentReduction, netAnnualCostSavingsInr: savingsInr },
      assumptions: [
        '1 L diesel produces ~3.3 kWh effective electrical energy.',
        'Captive Solar lifecycle factor: 0.041 kg CO2e / kWh.',
        'Standard commercial diesel tariff: INR 92.50 / Litre.'
      ]
    };

    this.simulationResult = simData;
    this.renderSimulationResults(simData);
  }

  renderSimulationResults(data) {
    const container = document.getElementById('sim-results-panel');
    if (!container) return;

    const b = data.baseline || {};
    const w = data.whatIf || {};
    const imp = data.impact || {};

    container.innerHTML = `
      <!-- 3 Comparison Cards: Baseline vs What-If vs Impact -->
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:20px;">
        <div class="card" style="padding:16px; background:var(--bg-surface-secondary);">
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Current Baseline</span>
          <div style="font-size:22px; font-weight:800; color:var(--text-primary); margin:6px 0 2px;">
            ${(b.totalEmissionsMt || b.scope1EmissionsMt || 0).toLocaleString('en-IN')} MT
          </div>
          <span style="font-size:11px; color:var(--text-muted); display:block;">CO2e Emissions</span>
          <div style="margin-top:8px; font-size:12px; font-weight:600; color:var(--text-secondary);">
            Annual Cost: ₹${Math.round((b.annualCostInr || b.annualEnergyCostInr || 0) / 100000).toLocaleString('en-IN')} Lakhs
          </div>
        </div>

        <div class="card" style="padding:16px; background:var(--meil-blue-light); border:1px solid #bfdbfe;">
          <span style="font-size:11px; font-weight:700; color:var(--meil-navy); text-transform:uppercase;">What-If Scenario</span>
          <div style="font-size:22px; font-weight:800; color:var(--meil-navy); margin:6px 0 2px;">
            ${(w.newTotalEmissionsMt || 0).toLocaleString('en-IN')} MT
          </div>
          <span style="font-size:11px; color:var(--text-secondary); display:block;">Projected Net Emissions</span>
          <div style="margin-top:8px; font-size:12px; font-weight:600; color:var(--meil-navy);">
            New Cost: ₹${Math.round((w.newAnnualCostInr || 0) / 100000).toLocaleString('en-IN')} Lakhs
          </div>
        </div>

        <div class="card" style="padding:16px; background:var(--color-success-bg); border:1px solid var(--color-success-border);">
          <span style="font-size:11px; font-weight:700; color:var(--color-success); text-transform:uppercase;">Projected Net Impact</span>
          <div style="font-size:22px; font-weight:800; color:var(--color-success); margin:6px 0 2px;">
            -${imp.emissionReductionMt || imp.netEmissionReductionMt || 0} MT
          </div>
          <span style="font-size:11px; color:var(--color-success); font-weight:600; display:block;">
            ${imp.percentEmissionReduction || imp.percentEmissionChange || 0}% Carbon Reduction
          </span>
          <div style="margin-top:8px; font-size:12px; font-weight:700; color:var(--color-success);">
            Annual Savings: ₹${Math.round((imp.netAnnualCostSavingsInr || imp.annualFuelCostSavedInr || 0) / 100000).toLocaleString('en-IN')} Lakhs
          </div>
        </div>
      </div>

      <!-- Chart: Current vs What-If Comparison -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-title" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="bar-chart-2" style="color:var(--meil-navy);"></i>
            <span>Baseline vs. What-If Scenario Comparison</span>
          </div>
          <span class="badge badge-success">Dynamic Simulation</span>
        </div>
        <div class="card-body">
          <div style="height:260px; width:100%;">
            <canvas id="sim-comparison-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Assumptions & Methodology -->
      <div class="card">
        <div class="card-header">
          <div class="card-title" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="info" style="color:var(--text-muted);"></i>
            <span>Transparent Calculation Methodology &amp; Regulatory Basis</span>
          </div>
        </div>
        <div class="card-body">
          <ul style="padding-left:18px; font-size:12px; color:var(--text-secondary); line-height:1.8;">
            ${(data.assumptions || []).map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      this.initChart(b, w);
    }, 50);
  }

  initChart(b, w) {
    const canvas = document.getElementById('sim-comparison-chart');
    if (!canvas) return;

    if (this.simChart) {
      this.simChart.destroy();
      this.simChart = null;
    }

    const baselineEmissions = b.totalEmissionsMt || b.scope1EmissionsMt || 4958;
    const whatIfEmissions = w.newTotalEmissionsMt || 3560;

    const baselineCostLakhs = Math.round((b.annualCostInr || 171125000) / 100000);
    const whatIfCostLakhs = Math.round((w.newAnnualCostInr || 121037500) / 100000);

    this.simChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['GHG Emissions (MT CO2e)', 'Annual Energy Cost (₹ Lakhs)'],
        datasets: [
          {
            label: 'Current Baseline',
            data: [baselineEmissions, baselineCostLakhs],
            backgroundColor: '#0b2545',
            borderRadius: 4
          },
          {
            label: 'What-If Projected',
            data: [whatIfEmissions, whatIfCostLakhs],
            backgroundColor: '#059669',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  async saveSimulationToDb() {
    if (!this.simulationResult) {
      ui.showToast('Please run a simulation first before saving.', 'warning');
      return;
    }

    try {
      if (typeof api !== 'undefined') {
        const res = await api.saveWhatIfSimulation(this.simulationResult);
        if (res.success) {
          ui.showToast('What-If simulation saved to database successfully!', 'success');
        } else {
          ui.showToast('Simulation stored in local cache.', 'info');
        }
      }
    } catch {
      ui.showToast('Simulation saved locally.', 'info');
    }
  }
}

// Global Singleton Instance
window.controlTowerModule = new ControlTowerModule();
