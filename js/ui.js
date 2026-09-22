/**
 * User Interface Controller & View Orchestrator
 * MEIL Centralized ESG & BRSR Reporting System
 */

class UIManager {
  constructor() {
    this.currentView = 'dashboard';
    this.currentSubTab = null;
    this.activeYearFilter = 'FY 2025-26';
    this.activeSubsidiaryFilter = 'all';
    this.activeBUFilter = 'all';
    this.activeProjectFilter = 'all';
    this.searchQuery = '';
  }

  init() {
    this.renderSidebar();
    this.renderHeader();
    this.renderCurrentView();

    // Subscribe to state & auth changes
    store.subscribe(() => {
      this.renderCurrentView();
      this.updateHeaderBadges();
    });

    auth.subscribe(() => {
      this.renderSidebar();
      this.renderHeader();
      this.renderCurrentView();
    });

    this.bindGlobalEvents();
  }

  bindGlobalEvents() {
    // Top Demo Role Switcher
    const roleSelect = document.getElementById('demo-role-select');
    const subSelect = document.getElementById('demo-sub-select');
    const subLabel = document.getElementById('demo-sub-label');

    if (roleSelect) {
      roleSelect.value = auth.getCurrentRole();
      if (auth.isSubAdmin()) {
        roleSelect.disabled = true;
        roleSelect.title = "Sub-Company Admins are restricted to assigned subsidiary scope";
      }
      roleSelect.addEventListener('change', (e) => {
        const newRole = e.target.value;
        auth.switchRole(newRole);
      });
    }

    if (subSelect) {
      subSelect.value = auth.getActiveSubsidiaryId();
      if (auth.isSubAdmin()) {
        subSelect.style.display = 'inline-block';
        if (subLabel) subLabel.style.display = 'inline-block';
        subSelect.disabled = true;
        subSelect.title = "Access restricted to your assigned entity only";
      } else {
        subSelect.style.display = 'inline-block';
        if (subLabel) subLabel.style.display = 'inline-block';
        subSelect.disabled = false;
      }
      subSelect.addEventListener('change', (e) => {
        auth.setAssignedSubsidiary(e.target.value);
      });
    }

    // Reset Demo State Button
    const resetBtn = document.getElementById('demo-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Reset application data back to factory demo defaults?")) {
          store.resetToDefault();
          this.showToast("Application state reset to factory defaults.", "info");
        }
      });
    }

    // Sidebar Toggle for Desktop Collapse and Mobile Drawer
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sidebar = document.getElementById('app-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (window.innerWidth <= 1024) {
          if (sidebar) sidebar.classList.toggle('open');
          if (backdrop) backdrop.classList.toggle('active');
        } else {
          if (sidebar) sidebar.classList.toggle('collapsed');
        }
      });
    }

    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }

    // Close profile dropdown on document click
    document.addEventListener('click', (e) => {
      const profileDropdown = document.getElementById('sidebar-profile-dropdown');
      const profileTrigger = document.getElementById('user-profile-trigger');
      if (profileDropdown && profileDropdown.classList.contains('open')) {
        if (!profileTrigger || !profileTrigger.contains(e.target)) {
          profileDropdown.classList.remove('open');
          const chevron = document.getElementById('profile-chevron');
          if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
      }
    });

    // Header Notifications Button
    const notifBtn = document.getElementById('header-notif-btn');
    const notifDrawer = document.getElementById('notification-drawer');
    if (notifBtn && notifDrawer) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDrawer.classList.toggle('open');
        this.renderNotificationsDrawer();
      });

      document.addEventListener('click', (e) => {
        if (!notifDrawer.contains(e.target) && e.target !== notifBtn) {
          notifDrawer.classList.remove('open');
        }
      });
    }

    // Global Search Input in Header
    const searchInput = document.getElementById('header-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.handleSearchFilter();
      });
    }
  }

  // =========================================================================
  // Navigation & Sidebar
  // =========================================================================
  renderSidebar() {
    const isMain = auth.isMainAdmin();
    const sub = auth.getActiveSubsidiary();
    const sidebarNav = document.getElementById('sidebar-nav');
    const scopeContainer = document.getElementById('sidebar-scope-container');
    const userProfileEl = document.getElementById('sidebar-user-profile');

    if (scopeContainer) {
      if (isMain) {
        scopeContainer.innerHTML = `
          <div class="sidebar-scope-card">
            <div class="scope-label"><i data-lucide="shield-check"></i> System Role</div>
            <div class="scope-value">Main Company Admin</div>
            <div class="scope-sub"><i data-lucide="building-2"></i> MEIL Central Oversight</div>
          </div>
        `;
      } else {
        scopeContainer.innerHTML = `
          <div class="sidebar-scope-card" style="border-left: 3px solid #38bdf8;">
            <div class="scope-label"><i data-lucide="building"></i> Assigned Subsidiary</div>
            <div class="scope-value" title="${sub?.name || 'Subsidiary'}">${sub?.shortName || 'Subsidiary'}</div>
            <div class="scope-sub"><i data-lucide="map-pin"></i> ${sub?.headquarters || 'India'}</div>
          </div>
        `;
      }
    }

    if (!sidebarNav) return;

    let navHTML = '';

    if (isMain) {
      // 9 MAIN COMPANY ADMIN MODULES
      const pendingCount = store.getSubmissions().filter(s => s.status === "Submitted" || s.status === "Under Review").length;
      const correctionCount = store.getSubmissions().filter(s => s.status === "Correction Required").length;

      navHTML = `
        <div class="nav-section-title">Central Oversight</div>
        <a class="nav-item ${this.currentView === 'dashboard' ? 'active' : ''}" onclick="ui.navigateTo('dashboard')">
          <i data-lucide="layout-dashboard"></i>
          <span>Dashboard</span>
        </a>
        <a class="nav-item ${this.currentView === 'company' ? 'active' : ''}" onclick="ui.navigateTo('company')">
          <i data-lucide="building-2"></i>
          <span>Company Management</span>
        </a>
        <a class="nav-item ${this.currentView === 'sustainability' ? 'active' : ''}" onclick="ui.navigateTo('sustainability')">
          <i data-lucide="leaf"></i>
          <span>Sustainability (ESG)</span>
        </a>
        <a class="nav-item ${this.currentView === 'brsr' ? 'active' : ''}" onclick="ui.navigateTo('brsr')">
          <i data-lucide="file-text"></i>
          <span>BRSR Disclosures</span>
        </a>
        
        <div class="nav-section-title">Review & Governance</div>
        <a class="nav-item ${this.currentView === 'submissions' ? 'active' : ''}" onclick="ui.navigateTo('submissions')">
          <i data-lucide="check-circle-2"></i>
          <span>Submissions & Approvals</span>
          ${pendingCount > 0 ? `<span class="nav-badge warning">${pendingCount}</span>` : ''}
        </a>
        <a class="nav-item ${this.currentView === 'analytics' ? 'active' : ''}" onclick="ui.navigateTo('analytics')">
          <i data-lucide="bar-chart-3"></i>
          <span>Analytics & Benchmarks</span>
        </a>
        <a class="nav-item ${this.currentView === 'reports' ? 'active' : ''}" onclick="ui.navigateTo('reports')">
          <i data-lucide="file-bar-chart"></i>
          <span>Consolidated Reports</span>
        </a>

        <div class="nav-section-title">Administration</div>
        <a class="nav-item ${this.currentView === 'notifications' ? 'active' : ''}" onclick="ui.navigateTo('notifications')">
          <i data-lucide="bell"></i>
          <span>Notifications</span>
          <span class="nav-badge" id="sidebar-notif-count">2</span>
        </a>
        <a class="nav-item ${this.currentView === 'settings' ? 'active' : ''}" onclick="ui.navigateTo('settings')">
          <i data-lucide="settings"></i>
          <span>System Settings</span>
        </a>
      `;
    } else {
      // 9 SUB-COMPANY ADMIN MODULES
      const subId = auth.getActiveSubsidiaryId();
      const ownSubm = store.getSubmissions('FY 2025-26', subId)[0];
      const hasCorrection = ownSubm?.status === "Correction Required";

      navHTML = `
        <div class="nav-section-title">Subsidiary Operations</div>
        <a class="nav-item ${this.currentView === 'dashboard' ? 'active' : ''}" onclick="ui.navigateTo('dashboard')">
          <i data-lucide="layout-dashboard"></i>
          <span>Dashboard</span>
        </a>
        <a class="nav-item ${this.currentView === 'profile' ? 'active' : ''}" onclick="ui.navigateTo('profile')">
          <i data-lucide="building"></i>
          <span>Company Profile</span>
        </a>
        <a class="nav-item ${this.currentView === 'activities' ? 'active' : ''}" onclick="ui.navigateTo('activities')">
          <i data-lucide="briefcase"></i>
          <span>Business Activities</span>
        </a>

        <div class="nav-section-title">Data Reporting</div>
        <a class="nav-item ${this.currentView === 'sustainability' ? 'active' : ''}" onclick="ui.navigateTo('sustainability')">
          <i data-lucide="leaf"></i>
          <span>Sustainability (ESG)</span>
        </a>
        <a class="nav-item ${this.currentView === 'brsr' ? 'active' : ''}" onclick="ui.navigateTo('brsr')">
          <i data-lucide="file-text"></i>
          <span>BRSR Disclosures</span>
        </a>
        <a class="nav-item ${this.currentView === 'submissions' ? 'active' : ''}" onclick="ui.navigateTo('submissions')">
          <i data-lucide="send"></i>
          <span>Data Submission</span>
          ${hasCorrection ? `<span class="nav-badge danger">Action</span>` : ''}
        </a>

        <div class="nav-section-title">Insights & Output</div>
        <a class="nav-item ${this.currentView === 'reports' ? 'active' : ''}" onclick="ui.navigateTo('reports')">
          <i data-lucide="file-bar-chart"></i>
          <span>Subsidiary Reports</span>
        </a>
        <a class="nav-item ${this.currentView === 'notifications' ? 'active' : ''}" onclick="ui.navigateTo('notifications')">
          <i data-lucide="bell"></i>
          <span>Notifications</span>
          <span class="nav-badge" id="sidebar-notif-count">1</span>
        </a>
        <a class="nav-item ${this.currentView === 'settings' ? 'active' : ''}" onclick="ui.navigateTo('settings')">
          <i data-lucide="sliders"></i>
          <span>Profile & Settings</span>
        </a>
      `;
    }

    sidebarNav.innerHTML = navHTML;

    // Render User profile summary at sidebar bottom with Dropdown Arrow
    if (userProfileEl) {
      const user = auth.getUserInfo();
      userProfileEl.innerHTML = `
        <div class="user-profile-wrapper" id="user-profile-trigger" onclick="ui.toggleProfileDropdown(event)" title="User Profile Options">
          <div class="user-profile-summary">
            <div class="user-avatar">${user.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
            <div class="user-meta">
              <span class="user-name" title="${user.name}">${user.name}</span>
              <span class="user-role-badge">${auth.getRoleLabel()}</span>
            </div>
          </div>
          <button class="profile-dropdown-arrow-btn" aria-label="Profile options menu">
            <i data-lucide="chevron-down" id="profile-chevron" style="width:16px; height:16px; transition: transform 0.2s;"></i>
          </button>
        </div>

        <!-- Sidebar Profile Dropdown Menu -->
        <div id="sidebar-profile-dropdown" class="sidebar-profile-dropdown">
          <div class="profile-dropdown-header">
            <div class="dropdown-user-name">${user.name}</div>
            <div class="dropdown-user-email">${user.email}</div>
          </div>
          <a class="profile-dropdown-item" onclick="ui.navigateTo('settings')">
            <i data-lucide="user" style="width:14px; height:14px;"></i>
            <span>Profile</span>
          </a>
          <a class="profile-dropdown-item" onclick="ui.navigateTo('settings')">
            <i data-lucide="settings" style="width:14px; height:14px;"></i>
            <span>Settings</span>
          </a>
          <a class="profile-dropdown-item" onclick="ui.showDemoRoleModal()">
            <i data-lucide="arrow-left-right" style="width:14px; height:14px;"></i>
            <span>Switch Role / Entity</span>
          </a>
          <div class="profile-dropdown-divider"></div>
          <a class="profile-dropdown-item" onclick="auth.logout()" style="color:var(--color-danger); font-weight:600;">
            <i data-lucide="log-out" style="width:14px; height:14px; color:var(--color-danger);"></i>
            <span>Sign Out</span>
          </a>
        </div>
      `;
    }

    this.refreshIcons();
  }

  toggleProfileDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('sidebar-profile-dropdown');
    const chevron = document.getElementById('profile-chevron');
    if (dropdown) {
      dropdown.classList.toggle('open');
      if (chevron) {
        chevron.style.transform = dropdown.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      this.refreshIcons();
    }
  }

  renderHeader() {
    const breadcrumbActive = document.getElementById('breadcrumb-active');

    if (breadcrumbActive) {
      breadcrumbActive.textContent = this.getViewTitle(this.currentView);
    }

    // Sync top demo selectors
    const roleSelect = document.getElementById('demo-role-select');
    if (roleSelect) roleSelect.value = auth.getCurrentRole();

    const subSelect = document.getElementById('demo-sub-select');
    if (subSelect) {
      subSelect.value = auth.getActiveSubsidiaryId();
      subSelect.style.display = auth.isMainAdmin() ? 'none' : 'inline-block';
      const subLabel = document.getElementById('demo-sub-label');
      if (subLabel) subLabel.style.display = auth.isMainAdmin() ? 'none' : 'inline-block';
    }

    this.updateHeaderBadges();
    this.refreshIcons();
  }

  updateHeaderBadges() {
    const unread = store.getNotifications(auth.getCurrentRole(), auth.getActiveSubsidiaryId()).filter(n => !n.read).length;
    const badge = document.getElementById('header-notif-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
  }

  navigateTo(view, subTab = null) {
    if (auth.isSubAdmin()) {
      const allowedViews = ['dashboard', 'profile', 'activities', 'sustainability', 'brsr', 'submissions', 'reports', 'notifications', 'settings'];
      if (!allowedViews.includes(view)) {
        this.showToast("Access Restricted: This section requires Main Company Admin privileges.", "warning");
        this.currentView = 'dashboard';
        this.currentSubTab = null;
        this.renderSidebar();
        this.renderHeader();
        this.renderCurrentView();
        return;
      }
    }

    this.currentView = view;
    this.currentSubTab = subTab;
    this.renderSidebar();
    this.renderHeader();
    this.renderCurrentView();

    // Close mobile drawer if open
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  getViewTitle(view) {
    const map = {
      dashboard: 'Dashboard',
      company: 'Company Management',
      profile: 'Company Profile',
      activities: 'Business Activities',
      sustainability: 'Sustainability (ESG)',
      brsr: 'BRSR Disclosures',
      submissions: auth.isMainAdmin() ? 'Submissions & Approvals' : 'Data Submission',
      analytics: 'Analytics & Benchmarks',
      reports: 'Reporting & Exports',
      notifications: 'Notification Center',
      settings: 'Settings'
    };
    return map[view] || 'Dashboard';
  }

  refreshIcons() {
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // =========================================================================
  // View Router & Content Renderer
  // =========================================================================
  renderCurrentView() {
    const viewport = document.getElementById('content-viewport');
    if (!viewport) return;

    chartEngine.destroyAll();

    switch (this.currentView) {
      case 'dashboard':
        viewport.innerHTML = auth.isMainAdmin() ? this.getTemplateMainDashboard() : this.getTemplateSubDashboard();
        if (auth.isMainAdmin()) {
          this.postRenderDashboard();
        } else {
          this.postRenderSubDashboard();
        }
        break;

      case 'company':
        viewport.innerHTML = this.getTemplateCompanyManagement();
        this.postRenderCompany();
        break;

      case 'profile':
        viewport.innerHTML = this.getTemplateSubsidiaryProfile();
        break;

      case 'activities':
        viewport.innerHTML = this.getTemplateBusinessActivities();
        break;

      case 'sustainability':
        viewport.innerHTML = this.getTemplateSustainability();
        this.postRenderSustainability();
        break;

      case 'brsr':
        viewport.innerHTML = this.getTemplateBRSR();
        this.postRenderBRSR();
        break;

      case 'submissions':
        viewport.innerHTML = auth.isMainAdmin() ? this.getTemplateMainSubmissions() : this.getTemplateSubSubmissions();
        this.postRenderSubmissions();
        break;

      case 'analytics':
        viewport.innerHTML = this.getTemplateAnalytics();
        this.postRenderAnalytics();
        break;

      case 'reports':
        viewport.innerHTML = this.getTemplateReports();
        this.postRenderReports();
        break;

      case 'notifications':
        viewport.innerHTML = this.getTemplateNotifications();
        break;

      case 'settings':
        viewport.innerHTML = this.getTemplateSettings();
        break;

      default:
        viewport.innerHTML = this.getTemplateMainDashboard();
        this.postRenderDashboard();
    }

    this.refreshIcons();
  }

  // =========================================================================
  // 1. DASHBOARDS
  // =========================================================================
  getTemplateMainDashboard() {
    const metrics = store.calculateDashboardMetrics("main_admin", null, this.activeYearFilter);
    const cons = metrics.consolidated;

    return `
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="layout-dashboard" style="color:var(--meil-navy)"></i>
            MEIL Group ESG & BRSR Central Executive Dashboard
          </h1>
          <p class="page-subtitle">Centralized oversight, subsidiary consolidation, statutory BRSR monitoring, and approval lifecycle</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="ui.navigateTo('reports')">
            <i data-lucide="file-bar-chart"></i> Generate Report
          </button>
          <button class="btn btn-brand-red" onclick="ui.navigateTo('submissions')">
            <i data-lucide="check-circle-2"></i> Review Submissions (${metrics.pendingReviewsCount})
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label"><i data-lucide="calendar"></i> Reporting Year:</span>
          <select class="filter-select" id="dash-year-filter" onchange="ui.setYearFilter(this.value)">
            <option value="FY 2025-26" ${this.activeYearFilter === 'FY 2025-26' ? 'selected' : ''}>FY 2025-26 (Active Cycle)</option>
            <option value="FY 2024-25" ${this.activeYearFilter === 'FY 2024-25' ? 'selected' : ''}>FY 2024-25 (Audited Baseline)</option>
          </select>

          <span class="filter-label" style="margin-left:12px;"><i data-lucide="building"></i> Scope:</span>
          <span class="badge badge-approved" style="font-size:12px; padding:6px 12px;">
            <i data-lucide="check"></i> 100% Group Consolidated
          </span>
        </div>

        <div class="filter-group">
          <span style="font-size:12px; color:var(--text-muted);">
            Consolidation Rule: <strong>Only Approved Submissions</strong> roll into group totals
          </span>
        </div>
      </div>

      <!-- Top High-Level Hierarchy & Submission Status Cards -->
      <div class="grid-kpi-4">
        <div class="kpi-card accent-blue">
          <div class="kpi-header">
            <span class="kpi-title">Total Subsidiaries</span>
            <div class="kpi-icon-wrap blue"><i data-lucide="building"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${metrics.totalSubsidiaries}</span>
            <span class="kpi-unit">Companies</span>
          </div>
          <div class="kpi-meta">
            <span>${metrics.approvedCount} of ${metrics.totalSubsidiaries} Approved</span>
            <span class="kpi-trend positive"><i data-lucide="arrow-up-right"></i> ${cons.consolidationRate}%</span>
          </div>
        </div>

        <div class="kpi-card accent-green">
          <div class="kpi-header">
            <span class="kpi-title">Approved Submissions</span>
            <div class="kpi-icon-wrap green"><i data-lucide="check-circle-2"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${metrics.approvedCount}</span>
            <span class="kpi-unit">Consolidated</span>
          </div>
          <div class="kpi-meta">
            <span>${metrics.pendingReviewsCount} Pending | ${metrics.correctionRequiredCount} In Correction</span>
            <span class="badge badge-approved">Active</span>
          </div>
        </div>

        <div class="kpi-card accent-amber">
          <div class="kpi-header">
            <span class="kpi-title">Pending Reviews</span>
            <div class="kpi-icon-wrap amber"><i data-lucide="clock"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${metrics.pendingReviewsCount}</span>
            <span class="kpi-unit">Awaiting Action</span>
          </div>
          <div class="kpi-meta">
            <span>Action required by Main Admin</span>
            <a href="javascript:void(0)" onclick="ui.navigateTo('submissions')" style="color:var(--meil-red); font-weight:600; text-decoration:none;">Review Now &rarr;</a>
          </div>
        </div>

        <div class="kpi-card accent-red">
          <div class="kpi-header">
            <span class="kpi-title">Correction Required</span>
            <div class="kpi-icon-wrap red"><i data-lucide="circle-alert"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${metrics.correctionRequiredCount}</span>
            <span class="kpi-unit">Awaiting Resubmission</span>
          </div>
          <div class="kpi-meta">
            <span>With reviewer feedback</span>
            <span class="kpi-trend negative">${metrics.correctionRequiredCount > 0 ? 'Action Needed' : 'Clean'}</span>
          </div>
        </div>
      </div>

      <!-- Core Consolidated Environmental & Social KPI Cards -->
      <div class="grid-kpi-4">
        <div class="kpi-card accent-blue">
          <div class="kpi-header">
            <span class="kpi-title">Consolidated Energy</span>
            <div class="kpi-icon-wrap blue"><i data-lucide="zap"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${cons.totalEnergyMWh ? cons.totalEnergyMWh.toLocaleString() : '0'}</span>
            <span class="kpi-unit">MWh</span>
          </div>
          <div class="kpi-meta">
            <span>Renewable Mix: <strong>${cons.renewablePercent}%</strong></span>
            <span class="kpi-trend positive"><i data-lucide="leaf"></i> Green</span>
          </div>
        </div>

        <div class="kpi-card accent-red">
          <div class="kpi-header">
            <span class="kpi-title">Consolidated GHG (Scope 1+2+3)</span>
            <div class="kpi-icon-wrap red"><i data-lucide="cloud"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${cons.totalGHG ? cons.totalGHG.toLocaleString() : '0'}</span>
            <span class="kpi-unit">tCO2e</span>
          </div>
          <div class="kpi-meta">
            <span>Scope 1: ${cons.ghgScope1.toLocaleString()} | S2: ${cons.ghgScope2.toLocaleString()}</span>
            <span class="kpi-trend positive"><i data-lucide="trending-down"></i> -8.4%</span>
          </div>
        </div>

        <div class="kpi-card accent-green">
          <div class="kpi-header">
            <span class="kpi-title">Total Workforce</span>
            <div class="kpi-icon-wrap green"><i data-lucide="users"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${cons.totalEmployees ? cons.totalEmployees.toLocaleString() : '0'}</span>
            <span class="kpi-unit">Employees</span>
          </div>
          <div class="kpi-meta">
            <span>Safety LTIFR: <strong>${cons.ltifrAverage}</strong> | Fatalities: <strong>0</strong></span>
            <span class="badge badge-approved">Safe</span>
          </div>
        </div>

        <div class="kpi-card accent-purple">
          <div class="kpi-header">
            <span class="kpi-title">BRSR Core Compliance</span>
            <div class="kpi-icon-wrap"><i data-lucide="file-check-2"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${cons.brsrOverallCompletion}%</span>
            <span class="kpi-unit">Avg Score</span>
          </div>
          <div class="kpi-meta">
            <span>SEBI Principles 1-9 Validated</span>
            <span class="kpi-trend positive">Tier-1</span>
          </div>
        </div>
      </div>

      <!-- Charts Row 1: Energy Mix + GHG Breakdown -->
      <div class="grid-2-col">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="pie-chart"></i> Consolidated Energy Portfolio (Renewable vs Grid)</h3>
            <span class="badge badge-approved">${cons.renewablePercent}% Renewable</span>
          </div>
          <div class="card-body" style="height: 300px;">
            <canvas id="chart-dash-energy"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="bar-chart-2"></i> Consolidated GHG Emissions by Scope (tCO2e)</h3>
            <span class="badge badge-draft">GHG Protocol</span>
          </div>
          <div class="card-body" style="height: 300px;">
            <canvas id="chart-dash-ghg"></canvas>
          </div>
        </div>
      </div>

      <!-- Charts Row 2: Subsidiary Comparison + Submission Status -->
      <div class="grid-2-1">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="award"></i> Subsidiary ESG Index Benchmark</h3>
            <a href="javascript:void(0)" onclick="ui.navigateTo('analytics')" style="font-size:12px; color:var(--meil-navy); font-weight:600;">View In-Depth &rarr;</a>
          </div>
          <div class="card-body" style="height: 280px;">
            <canvas id="chart-dash-subs"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="check-circle"></i> Submission Pipeline</h3>
            <span class="badge badge-submitted">${metrics.totalSubmissions} Total</span>
          </div>
          <div class="card-body" style="height: 280px;">
            <canvas id="chart-dash-status"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Submissions Table on Dashboard -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="layers"></i> Subsidiary Submission Status & Quick Review</h3>
          <button class="btn btn-outline btn-sm" onclick="ui.navigateTo('submissions')">View All Submissions</button>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Submission ID</th>
                  <th>Subsidiary Name</th>
                  <th>Reporting Cycle</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Consolidation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderSubmissionsTableRows(store.getSubmissions(this.activeYearFilter))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  postRenderDashboard() {
    const cons = store.calculateConsolidatedData(this.activeYearFilter);
    const metrics = store.calculateDashboardMetrics("main_admin", null, this.activeYearFilter);

    // Energy Chart
    chartEngine.renderEnergyMixChart('chart-dash-energy', {
      renewableEnergyMWh: cons.renewableEnergyMWh,
      nonRenewableEnergyMWh: cons.nonRenewableEnergyMWh
    });

    // GHG Chart
    chartEngine.renderGHGChart('chart-dash-ghg', {
      ghgScope1: cons.ghgScope1,
      ghgScope2: cons.ghgScope2,
      ghgScope3: cons.ghgScope3
    });

    // Subs Comparison
    chartEngine.renderSubsidiaryComparisonChart('chart-dash-subs', this.activeYearFilter);

    // Status Donut
    chartEngine.renderSubmissionStatusChart('chart-dash-status', {
      approvedCount: metrics.approvedCount,
      pendingReviewsCount: metrics.pendingReviewsCount,
      correctionRequiredCount: metrics.correctionRequiredCount,
      draftCount: metrics.draftCount
    });
  }

  getTemplateSubDashboard() {
    const subId = auth.getActiveSubsidiaryId();
    const metrics = store.calculateDashboardMetrics("sub_admin", subId, this.activeYearFilter);
    const sub = metrics.subsidiary;
    const esg = metrics.esg;
    const env = esg.environment || {};
    const soc = esg.social || {};

    return `
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="building" style="color:var(--meil-navy)"></i>
            ${sub.name} - Sustainability Portal
          </h1>
          <p class="page-subtitle">Assigned Subsidiary: <strong>${sub.shortName}</strong> | CIN: ${sub.cin} | Status: <strong>${metrics.submissionStatus}</strong></p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="ui.navigateTo('reports')">
            <i data-lucide="file-text"></i> Own Reports
          </button>
          <button class="btn btn-brand-red" onclick="ui.openDataEntryModal()">
            <i data-lucide="edit-3"></i> Edit / Enter ESG Data
          </button>
        </div>
      </div>

      <!-- 4-Stage Compliance Lifecycle Stepper (Integrated from Project 2) -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="padding:12px 16px;">
          <h4 class="card-title" style="font-size:13px;"><i data-lucide="route" style="color:var(--meil-navy)"></i> Annual BRSR Statutory Filing Lifecycle</h4>
          <span class="badge ${metrics.submissionStatus === 'Approved' ? 'badge-approved' : (metrics.submissionStatus === 'Submitted' ? 'badge-submitted' : (metrics.submissionStatus === 'Rejected' ? 'badge-rejected' : 'badge-draft'))}">${metrics.submissionStatus}</span>
        </div>
        <div class="card-body" style="padding:14px 16px;">
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px;">
            <div class="card" style="background:#f8fafc; border-top: 3px solid #059669; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:#059669;"><i data-lucide="check" style="width:12px;height:12px;display:inline;"></i> Step 1</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Data Entry &amp; Draft</strong>
              <span style="font-size:10px; color:#64748b;">E, S, G &amp; Principles 1-9</span>
            </div>
            <div class="card" style="background:#f8fafc; border-top: 3px solid ${metrics.submissionStatus !== 'Draft' ? '#059669' : '#cbd5e1'}; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:${metrics.submissionStatus !== 'Draft' ? '#059669' : '#64748b'};">${metrics.submissionStatus !== 'Draft' ? '<i data-lucide="check" style="width:12px;height:12px;display:inline;"></i>' : '<i data-lucide="send" style="width:12px;height:12px;display:inline;"></i>'} Step 2</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Submit for Review</strong>
              <span style="font-size:10px; color:#64748b;">Forwarded to Main Admin</span>
            </div>
            <div class="card" style="background:#f8fafc; border-top: 3px solid ${metrics.submissionStatus === 'Submitted' || metrics.submissionStatus === 'Under Review' ? '#f59e0b' : (metrics.submissionStatus === 'Correction Required' ? '#ea580c' : (metrics.submissionStatus === 'Rejected' ? '#dc2626' : (metrics.submissionStatus === 'Approved' ? '#059669' : '#cbd5e1')))}; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:${metrics.submissionStatus === 'Approved' ? '#059669' : (metrics.submissionStatus === 'Rejected' ? '#dc2626' : '#d97706')};">Step 3</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Executive Review</strong>
              <span style="font-size:10px; color:#64748b;">${metrics.submissionStatus === 'Correction Required' ? 'Revisions Requested' : (metrics.submissionStatus === 'Rejected' ? 'Filing Rejected' : 'Audit Verification')}</span>
            </div>
            <div class="card" style="background:#f8fafc; border-top: 3px solid ${metrics.submissionStatus === 'Approved' ? '#059669' : '#cbd5e1'}; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:${metrics.submissionStatus === 'Approved' ? '#059669' : '#64748b'};">${metrics.submissionStatus === 'Approved' ? '<i data-lucide="check-check" style="width:12px;height:12px;display:inline;"></i>' : '<i data-lucide="lock" style="width:12px;height:12px;display:inline;"></i>'} Step 4</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Approved &amp; Consolidated</strong>
              <span style="font-size:10px; color:#64748b;">Rolled into Group Reports</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Correction Required or Rejection Alert Banner if applicable -->
      ${metrics.submissionStatus === 'Correction Required' ? `
        <div class="correction-card" style="margin-bottom:20px;">
          <div class="correction-header">
            <div class="correction-badge-title">
              <i data-lucide="alert-triangle"></i>
              Correction Requested by Main Company Admin
            </div>
            <span class="badge badge-correction">Action Required</span>
          </div>
          <div class="correction-meta">
            Reviewer: <strong>Central MEIL ESG Admin</strong> | Date: <strong>${metrics.lastUpdated}</strong>
          </div>
          <div class="correction-comment">
            "${metrics.reviewerNotes || 'Please review and calibrate Scope 1 fugitive gas leakage measurements before resubmitting.'}"
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
            <button class="btn btn-sm btn-outline" onclick="ui.openDataEntryModal()">Edit Form</button>
            <button class="btn btn-sm btn-brand-red" onclick="workflow.resubmitData('${sub.id}', '${this.activeYearFilter}')">
              <i data-lucide="send"></i> Resubmit for Approval
            </button>
          </div>
        </div>
      ` : ''}

      ${metrics.submissionStatus === 'Rejected' ? `
        <div class="correction-card" style="margin-bottom:20px; border-left: 4px solid #dc2626; background: #fef2f2;">
          <div class="correction-header">
            <div class="correction-badge-title" style="color:#b91c1c;">
              <i data-lucide="x-circle"></i>
              Submission Rejected by Main Company Admin
            </div>
            <span class="badge badge-rejected">Filing Rejected</span>
          </div>
          <div class="correction-meta">
            Reviewer: <strong>Executive CSO</strong> | Date: <strong>${metrics.lastUpdated}</strong>
          </div>
          <div class="correction-comment" style="color:#991b1b; border-color:#fca5a5;">
            "${metrics.reviewerNotes || 'Disclosures rejected due to non-adherence with statutory verification guidelines.'}"
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
            <button class="btn btn-sm btn-outline" onclick="ui.openDataEntryModal()">Correct Disclosures</button>
            <button class="btn btn-sm btn-danger" style="background:#dc2626;" onclick="workflow.resubmitData('${sub.id}', '${this.activeYearFilter}')">
              <i data-lucide="refresh-cw"></i> Resubmit Revised Data
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Status & Progress Cards -->
      <div class="grid-kpi-4">
        <div class="kpi-card accent-blue">
          <div class="kpi-header">
            <span class="kpi-title">Submission Status</span>
            <div class="kpi-icon-wrap blue"><i data-lucide="shield-alert"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" style="font-size:20px;">${metrics.submissionStatus}</span>
          </div>
          <div class="kpi-meta">
            <span>Last Updated: ${metrics.lastUpdated}</span>
            ${this.getStatusBadge(metrics.submissionStatus)}
          </div>
        </div>

        <div class="kpi-card accent-green">
          <div class="kpi-header">
            <span class="kpi-title">ESG Disclosures Completed</span>
            <div class="kpi-icon-wrap green"><i data-lucide="leaf"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${metrics.esgCompletion}%</span>
            <span class="kpi-unit">Completion</span>
          </div>
          <div class="kpi-meta">
            <span>Environment, Social & Governance</span>
            <span class="kpi-trend positive">Verified</span>
          </div>
        </div>

        <div class="kpi-card accent-purple">
          <div class="kpi-header">
            <span class="kpi-title">BRSR Principles 1-9</span>
            <div class="kpi-icon-wrap"><i data-lucide="file-check-2"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${metrics.brsrCompletion}%</span>
            <span class="kpi-unit">Ready</span>
          </div>
          <div class="kpi-meta">
            <span>SEBI Core Disclosures</span>
            <span class="kpi-trend positive">On Track</span>
          </div>
        </div>

        <div class="kpi-card accent-amber">
          <div class="kpi-header">
            <span class="kpi-title">Business Units & Projects</span>
            <div class="kpi-icon-wrap amber"><i data-lucide="briefcase"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${metrics.totalProjects}</span>
            <span class="kpi-unit">Projects</span>
          </div>
          <div class="kpi-meta">
            <span>Across ${metrics.totalBusinessUnits} Operational BUs</span>
            <a href="javascript:void(0)" onclick="ui.navigateTo('activities')" style="color:var(--meil-navy); font-weight:600;">View &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Row 1: Energy & GHG -->
      <div class="grid-2-col">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="zap"></i> Energy Consumption Portfolio</h3>
            <button class="btn btn-sm btn-outline" onclick="ui.openDataEntryModal('environment')">Update Data</button>
          </div>
          <div class="card-body" style="height: 260px;">
            <canvas id="chart-sub-energy"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">Total: <strong>${(env.totalEnergyMWh || 0).toLocaleString()} MWh</strong> | Renewable: <strong>${env.renewablePercent || 0}%</strong></span>
            <span class="badge badge-approved">Certified</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="cloud"></i> GHG Emissions Breakdown</h3>
            <button class="btn btn-sm btn-outline" onclick="ui.openDataEntryModal('environment')">Update Data</button>
          </div>
          <div class="card-body" style="height: 260px;">
            <canvas id="chart-sub-ghg"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">Total GHG: <strong>${(env.totalGHG || 0).toLocaleString()} tCO2e</strong></span>
            <span class="badge badge-draft">Protocol Verified</span>
          </div>
        </div>
      </div>

      <!-- Row 2: Water & Waste -->
      <div class="grid-2-col">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="droplets"></i> Water Usage Summary</h3>
          </div>
          <div class="card-body" style="height: 240px;">
            <canvas id="chart-sub-water"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">Withdrawal: <strong>${(env.waterWithdrawalKL || 0).toLocaleString()} kL</strong> | Recycled: <strong>${env.waterRecycledPercent || 0}%</strong></span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="trash-2"></i> Waste Management</h3>
          </div>
          <div class="card-body" style="height: 240px;">
            <canvas id="chart-sub-waste"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">Generated: <strong>${(env.wasteGeneratedMT || 0).toLocaleString()} MT</strong> | Recycled: <strong>${env.wasteRecycledPercent || 0}%</strong></span>
          </div>
        </div>
      </div>

      <!-- Row 3: ESG Performance & BRSR Progress -->
      <div class="grid-2-col">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="target"></i> ESG Pillar Performance Scores</h3>
          </div>
          <div class="card-body" style="height: 240px;">
            <canvas id="chart-sub-esg-perf"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">Derived from current ESG disclosures</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="file-check-2"></i> BRSR Section Completion</h3>
          </div>
          <div class="card-body" style="height: 240px;">
            <canvas id="chart-sub-brsr"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">SEBI BRSR Core Disclosure Readiness</span>
            <span class="badge badge-submitted">FY 2025-26</span>
          </div>
        </div>
      </div>

      <!-- Row 4: BU Status & Project Progress -->
      <div class="grid-2-col">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="briefcase"></i> Business Unit ESG Status</h3>
          </div>
          <div class="card-body" style="height: 260px;">
            <canvas id="chart-sub-bu-status"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">${metrics.totalBusinessUnits} BU(s) in assigned subsidiary</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="folder-kanban"></i> Project ESG Progress</h3>
            <button class="btn btn-sm btn-outline" onclick="ui.navigateTo('activities')">Manage</button>
          </div>
          <div class="card-body" style="height: 260px;">
            <canvas id="chart-sub-proj"></canvas>
          </div>
          <div class="card-footer">
            <span style="font-size:12px;">Top ${Math.min(6, metrics.totalProjects)} of ${metrics.totalProjects} projects</span>
          </div>
        </div>
      </div>

      <!-- Submission Lifecycle & Quick Actions -->
      <div class="grid-2-1">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="git-branch"></i> Submission Lifecycle Status</h3>
            <span class="badge ${metrics.submissionStatus === 'Approved' ? 'badge-approved' : metrics.submissionStatus === 'Submitted' ? 'badge-submitted' : 'badge-draft'}">${metrics.submissionStatus}</span>
          </div>
          <div class="card-body" style="height: 220px;">
            <canvas id="chart-sub-timeline"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="send"></i> Quick Actions</h3>
          </div>
          <div class="card-body">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <button class="btn btn-secondary" style="justify-content:flex-start;" onclick="ui.openDataEntryModal('environment')">
                <i data-lucide="leaf"></i> Update ESG Data
              </button>
              <button class="btn btn-secondary" style="justify-content:flex-start;" onclick="ui.navigateTo('brsr')">
                <i data-lucide="file-text"></i> Edit BRSR Disclosures
              </button>
              <button class="btn btn-secondary" style="justify-content:flex-start;" onclick="ui.navigateTo('reports')">
                <i data-lucide="file-bar-chart"></i> Generate Subsidiary Report
              </button>
              <button class="btn btn-brand-red" style="justify-content:flex-start;" onclick="workflow.submitData('${sub.id}', '${this.activeYearFilter}')">
                <i data-lucide="send"></i> Submit to Main Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  postRenderSubDashboard() {
    const subId = auth.getActiveSubsidiaryId();
    const esg = store.getESGData(subId, this.activeYearFilter) || {};
    const brsr = store.getBRSRData(subId, this.activeYearFilter) || {};
    const env = esg.environment || {};
    const metrics = store.calculateDashboardMetrics('sub_admin', subId, this.activeYearFilter);

    // Chart 1: Energy Mix Donut
    chartEngine.renderEnergyMixChart('chart-sub-energy', {
      renewableEnergyMWh: env.renewableEnergyMWh,
      nonRenewableEnergyMWh: env.nonRenewableEnergyMWh
    });

    // Chart 2: GHG Scope Bar
    chartEngine.renderGHGChart('chart-sub-ghg', {
      ghgScope1: env.ghgScope1,
      ghgScope2: env.ghgScope2,
      ghgScope3: env.ghgScope3
    });

    // Chart 3: Water Bar
    chartEngine.renderWaterChart('chart-sub-water', {
      waterWithdrawalKL: env.waterWithdrawalKL,
      waterConsumptionKL: env.waterConsumptionKL,
      waterRecycledKL: env.waterRecycledKL
    });

    // Chart 4: Waste Donut
    chartEngine.renderWasteChart('chart-sub-waste', {
      wasteGeneratedMT: env.wasteGeneratedMT,
      wasteRecycledMT: env.wasteRecycledMT,
      wasteDisposalMT: env.wasteDisposalMT
    });

    // Chart 5: ESG Performance Bars
    chartEngine.renderESGPerformanceChart('chart-sub-esg-perf', esg);

    // Chart 6: BRSR Section Progress
    chartEngine.renderBRSRProgressChart('chart-sub-brsr', brsr);

    // Chart 7: BU Status Polar
    chartEngine.renderBUStatusChart('chart-sub-bu-status', subId);

    // Chart 8: Project Progress
    chartEngine.renderProjectProgressChart('chart-sub-proj', subId);

    // Chart 9: Submission Timeline
    chartEngine.renderSubmissionTimelineChart('chart-sub-timeline', metrics.submissionStatus);
  }

  // =========================================================================
  // 2. COMPANY MANAGEMENT (Main Company, Subsidiaries, BUs, Projects)
  // =========================================================================
  getTemplateCompanyManagement() {
    const activeTab = this.currentSubTab || 'subsidiaries';
    const mainCo = store.getMainCompany();
    const subs = store.getSubsidiaries();
    const bus = store.getBusinessUnits();
    const projs = store.getProjects();

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="building-2" style="color:var(--meil-navy)"></i>
            MEIL Enterprise Organizational Management
          </h1>
          <p class="page-subtitle">Manage Group structure, 5 primary subsidiaries, 12 Business Units, and 250+ project reporting nodes</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav">
        <button class="tab-btn ${activeTab === 'main_company' ? 'active' : ''}" onclick="ui.navigateTo('company', 'main_company')">
          <i data-lucide="home"></i> Main Company Profile
        </button>
        <button class="tab-btn ${activeTab === 'subsidiaries' ? 'active' : ''}" onclick="ui.navigateTo('company', 'subsidiaries')">
          <i data-lucide="building"></i> Subsidiaries (${subs.length})
        </button>
        <button class="tab-btn ${activeTab === 'business_units' ? 'active' : ''}" onclick="ui.navigateTo('company', 'business_units')">
          <i data-lucide="briefcase"></i> Business Units (${bus.length})
        </button>
        <button class="tab-btn ${activeTab === 'projects' ? 'active' : ''}" onclick="ui.navigateTo('company', 'projects')">
          <i data-lucide="folder-kanban"></i> Projects Directory (${projs.length})
        </button>
        <button class="tab-btn ${activeTab === 'user_access' ? 'active' : ''}" onclick="ui.navigateTo('company', 'user_access')">
          <i data-lucide="user-check"></i> Sub-Company Admin Access
        </button>
      </div>

      <!-- Tab Content Area -->
      ${this.renderCompanyTabContent(activeTab, mainCo, subs, bus, projs)}
    `;
  }

  renderCompanyTabContent(tab, mainCo, subs, bus, projs) {
    if (tab === 'main_company') {
      return `
        <div class="grid-2-1">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="info"></i> Corporate Profile & Identity</h3>
              <span class="badge badge-approved">Central Group Entity</span>
            </div>
            <div class="card-body">
              <div style="display:flex; align-items:center; gap:20px; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid var(--border-light);">
                <img src="assets/meil-logo.png" alt="MEIL" style="height:50px; background:#fff; padding:6px; border-radius:6px; border:1px solid var(--border-medium);">
                <div>
                  <h2 style="font-size:18px; color:var(--text-brand);">${mainCo.name}</h2>
                  <div style="font-size:12px; color:var(--text-muted);">CIN: <strong>${mainCo.cin}</strong> | Established: ${mainCo.founded}</div>
                </div>
              </div>

              <div class="form-grid">
                <div>
                  <label class="form-label">Headquarters</label>
                  <div style="font-size:13px; color:var(--text-primary);">${mainCo.headquarters}</div>
                </div>
                <div>
                  <label class="form-label">Managing Director</label>
                  <div style="font-size:13px; font-weight:600;">${mainCo.md}</div>
                </div>
                <div>
                  <label class="form-label">Founding Chairman</label>
                  <div style="font-size:13px; font-weight:600;">${mainCo.chairman}</div>
                </div>
                <div>
                  <label class="form-label">Industry Classification</label>
                  <div style="font-size:13px;">${mainCo.industry}</div>
                </div>
                <div>
                  <label class="form-label">Active Reporting Cycle</label>
                  <div style="font-size:13px; font-weight:700; color:var(--meil-navy);">${mainCo.activeReportingYear}</div>
                </div>
                <div>
                  <label class="form-label">Total Group Projects</label>
                  <div style="font-size:13px; font-weight:700; color:var(--meil-red);">${mainCo.totalProjectsCount} Nationwide</div>
                </div>
              </div>

              <div style="margin-top:20px;">
                <label class="form-label">Corporate Overview</label>
                <p style="font-size:12px; color:var(--text-secondary); line-height:1.6;">${mainCo.description}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="layers"></i> 4-Level Reporting Hierarchy</h3>
            </div>
            <div class="card-body">
              <div style="background:var(--bg-surface-secondary); padding:16px; border-radius:var(--radius-md); font-family:monospace; font-size:12px; line-height:1.8;">
                <div style="font-weight:bold; color:var(--meil-navy);">1. MEIL GROUP (Central Company)</div>
                <div style="padding-left:14px; color:var(--meil-red);">&darr; Level 1</div>
                <div style="font-weight:bold; color:var(--meil-navy);">2. SUBSIDIARY (5 Strategic Entities)</div>
                <div style="padding-left:14px; color:var(--meil-red);">&darr; Level 2</div>
                <div style="font-weight:bold; color:var(--meil-navy);">3. BUSINESS UNIT (12 Operating Divisions)</div>
                <div style="padding-left:14px; color:var(--meil-red);">&darr; Level 3</div>
                <div style="font-weight:bold; color:var(--meil-navy);">4. PROJECT (250+ Sites Across India)</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'subsidiaries') {
      return `
        <div style="display:flex; justify-content:flex-end; margin-bottom:16px; gap:8px;">
          <button class="btn btn-primary" onclick="ui.showAddSubsidiaryModal()">
            <i data-lucide="plus"></i> Add Subsidiary
          </button>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Subsidiary Name</th>
                <th>CIN</th>
                <th>Business Vertical</th>
                <th>Assigned Admin</th>
                <th>BUs</th>
                <th>Projects</th>
                <th>ESG Index</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${subs.map(s => `
                <tr>
                  <td>
                    <strong>${s.name}</strong>
                    <div style="font-size:11px; color:var(--text-muted);">${s.headquarters}</div>
                  </td>
                  <td style="font-family:monospace; font-size:11px;">${s.cin}</td>
                  <td>${s.businessType}</td>
                  <td>
                    <div style="font-weight:600;">${s.leadAdminName}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${s.leadAdminEmail}</div>
                  </td>
                  <td><span class="badge badge-draft">${s.buCount} BUs</span></td>
                  <td><span class="badge badge-submitted">${s.projectCount} Projects</span></td>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div class="progress-bar-container" style="width:60px;">
                        <div class="progress-bar-fill green" style="width:${s.complianceScore}%;"></div>
                      </div>
                      <span style="font-weight:700;">${s.complianceScore}</span>
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="auth.switchRole('sub_admin', '${s.id}'); ui.navigateTo('dashboard');">
                      <i data-lucide="external-link"></i> View as Admin
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (tab === 'business_units') {
      return `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>BU Code & Name</th>
                <th>Parent Subsidiary</th>
                <th>Unit Head</th>
                <th>Operational Scope</th>
                <th>Mapped Projects</th>
                <th>ESG Status</th>
              </tr>
            </thead>
            <tbody>
              ${bus.map(bu => {
                const sub = store.getSubsidiaryById(bu.subsidiaryId);
                return `
                  <tr>
                    <td><strong>${bu.name}</strong></td>
                    <td>${sub?.shortName || bu.subsidiaryId}</td>
                    <td>${bu.head}</td>
                    <td style="font-size:12px; color:var(--text-secondary);">${bu.activities}</td>
                    <td><span class="badge badge-draft">${bu.projectCount} Projects</span></td>
                    <td>${this.getStatusBadge(bu.esgStatus)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (tab === 'projects') {
      return `
        <div class="filter-bar" style="margin-bottom:16px;">
          <div class="filter-group">
            <span class="filter-label"><i data-lucide="filter"></i> Filter Subsidiary:</span>
            <select class="filter-select" onchange="ui.filterProjectsTable(this.value)">
              <option value="all">All Subsidiaries (${subs.length})</option>
              ${subs.map(s => `<option value="${s.id}">${s.shortName}</option>`).join('')}
            </select>
          </div>
          <div style="font-size:12px; color:var(--text-muted);">Showing representative 14 sample projects from the 250+ project network</div>
        </div>

        <div class="table-responsive">
          <table class="table" id="projects-table">
            <thead>
              <tr>
                <th>Project Code & Name</th>
                <th>Subsidiary</th>
                <th>Location</th>
                <th>Status</th>
                <th>ESG Complete</th>
                <th>BRSR Ready</th>
                <th>Consolidated</th>
              </tr>
            </thead>
            <tbody>
              ${projs.map(p => {
                const sub = store.getSubsidiaryById(p.subsidiaryId);
                return `
                  <tr data-sub="${p.subsidiaryId}">
                    <td>
                      <strong>${p.name}</strong>
                      <div style="font-size:11px; color:var(--text-muted);">${p.code}</div>
                    </td>
                    <td>${sub?.shortName || p.subsidiaryId}</td>
                    <td><i data-lucide="map-pin" style="width:12px; height:12px;"></i> ${p.location}</td>
                    <td><span class="badge badge-submitted">${p.status}</span></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-weight:600;">${p.esgCompletion}%</span>
                      </div>
                    </td>
                    <td>
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-weight:600;">${p.brsrCompletion}%</span>
                      </div>
                    </td>
                    <td>
                      ${p.approved ? `<span class="badge badge-approved"><i data-lucide="check"></i> Included</span>` : `<span class="badge badge-draft">Pending</span>`}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (tab === 'user_access') {
      const users = store.getUsers();
      const mainAdminsCount = users.filter(u => u.role === 'MAIN_ADMIN' || u.role === 'main_admin').length;
      const subAdminsCount = users.filter(u => u.role === 'SUB_ADMIN' || u.role === 'sub_admin').length;

      return `
        <!-- 3 KPI Cards for Access Control (Integrated from Project 2) -->
        <div class="grid-kpi-3" style="margin-bottom:20px;">
          <div class="kpi-card accent-blue">
            <div class="kpi-header">
              <span class="kpi-title">Total Registered Accounts</span>
              <div class="kpi-icon-wrap blue"><i data-lucide="users"></i></div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">${users.length}</span>
              <span class="kpi-unit">Users</span>
            </div>
            <div class="kpi-meta">
              <span>Active directory registry</span>
              <span class="kpi-trend positive">Managed</span>
            </div>
          </div>

          <div class="kpi-card accent-green">
            <div class="kpi-header">
              <span class="kpi-title">Main Company Admins</span>
              <div class="kpi-icon-wrap green"><i data-lucide="shield-check"></i></div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">${mainAdminsCount}</span>
              <span class="kpi-unit">CSO Executives</span>
            </div>
            <div class="kpi-meta">
              <span>Full governance &amp; approval rights</span>
            </div>
          </div>

          <div class="kpi-card accent-amber">
            <div class="kpi-header">
              <span class="kpi-title">Sub-Company Leads</span>
              <div class="kpi-icon-wrap amber"><i data-lucide="building-2"></i></div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">${subAdminsCount}</span>
              <span class="kpi-unit">Filing Officers</span>
            </div>
            <div class="kpi-meta">
              <span>Scoped entity data disclosures</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 class="card-title"><i data-lucide="users-gear"></i> User Authorization &amp; Role-Based Access Control (RBAC)</h3>
              <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">Manage credentials, account statuses, and entity filing permissions</p>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-primary" onclick="ui.showAddUserModal()">
                <i data-lucide="user-plus"></i> Add User Account
              </button>
              <button class="btn btn-outline" onclick="ExportUtil.exportTableToCSV('users-access-table', 'rbac_users.csv')">
                <i data-lucide="file-spreadsheet"></i> Export CSV
              </button>
            </div>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table class="table" id="users-access-table">
                <thead>
                  <tr>
                    <th>User &amp; Title</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Assigned Subsidiary</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Administrative Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(u => {
                    const isMainRole = u.role === 'MAIN_ADMIN' || u.role === 'main_admin';
                    const sub = store.getSubsidiaryById(u.subsidiaryId);
                    const isActive = u.status === 'ACTIVE' || u.accessStatus === 'Active';
                    const isSuspended = u.status === 'SUSPENDED' || u.accessStatus === 'Suspended';
                    const statusBadge = isActive ? 'badge-approved' : (isSuspended ? 'badge-review' : 'badge-rejected');

                    return `
                      <tr>
                        <td>
                          <strong>${u.name}</strong>
                          <div style="font-size:11px; color:var(--text-muted);">${u.title || (isMainRole ? 'Main Company Admin' : 'Subsidiary Admin')}</div>
                        </td>
                        <td style="font-size:12px; font-family:monospace; color:var(--text-brand);">${u.email}</td>
                        <td>
                          <span class="badge ${isMainRole ? 'badge-approved' : 'badge-submitted'}" style="font-size:11px;">
                            ${isMainRole ? '<i data-lucide="shield-check"></i> Main Admin' : '<i data-lucide="building"></i> Sub Admin'}
                          </span>
                        </td>
                        <td style="font-size:12px;">${isMainRole ? '<em>Entire MEIL Group</em>' : (sub ? sub.shortName : (u.subsidiaryName || 'N/A'))}</td>
                        <td><span class="badge ${statusBadge}">${isActive ? 'Active' : (isSuspended ? 'Suspended' : 'Revoked')}</span></td>
                        <td style="font-size:12px; color:var(--text-muted);">${u.lastLogin || 'Recent'}</td>
                        <td>
                          <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${!isActive ? `<button class="btn btn-sm btn-success" onclick="ui.changeUserAccess('${u.id}', 'Active')" title="Activate Account"><i data-lucide="check"></i> Activate</button>` : `<button class="btn btn-sm btn-outline" style="color:#d97706;" onclick="ui.changeUserAccess('${u.id}', 'Suspended')" title="Suspend Account"><i data-lucide="pause"></i> Suspend</button>`}
                            <button class="btn btn-sm btn-outline" onclick="ui.handleResetPassword('${u.id}', '${u.email}')" title="Reset Password to default (admin)">
                              <i data-lucide="key-round"></i> Reset Pwd
                            </button>
                            ${!isMainRole ? `
                              <button class="btn btn-sm btn-outline" onclick="auth.switchRole('sub_admin', '${u.subsidiaryId}'); ui.navigateTo('dashboard');" title="Preview as Subsidiary">
                                <i data-lucide="external-link"></i> View as
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
          </div>
        </div>
      `;
    }

    return '';
  }

  postRenderCompany() {
    this.refreshIcons();
  }

  filterProjectsTable(subId) {
    const rows = document.querySelectorAll('#projects-table tbody tr');
    rows.forEach(row => {
      if (subId === 'all' || row.getAttribute('data-sub') === subId) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }


  // =========================================================================
  // SUB-COMPANY: Company Profile View
  // =========================================================================
  getTemplateSubsidiaryProfile() {
    const subId = auth.getActiveSubsidiaryId();
    const sub = store.getSubsidiaryById(subId);
    if (!sub) return '<div class="card"><div class="card-body">No subsidiary assigned.</div></div>';
    const bus = store.getBusinessUnits(subId);
    const projs = store.getProjects(subId);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="building" style="color:var(--meil-navy)"></i>
            Company Profile: ${sub.shortName}
          </h1>
          <p class="page-subtitle">Subsidiary identity, corporate details, and organizational snapshot</p>
        </div>
      </div>

      <div class="grid-2-1">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="info"></i> Corporate Identity</h3>
            <span class="badge ${sub.status === 'Active' ? 'badge-approved' : 'badge-draft'}">${sub.status}</span>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div>
                <label class="form-label">Full Legal Name</label>
                <div style="font-size:14px; font-weight:600; color:var(--text-brand);">${sub.name}</div>
              </div>
              <div>
                <label class="form-label">Short Name</label>
                <div style="font-size:13px;">${sub.shortName}</div>
              </div>
              <div>
                <label class="form-label">CIN / Registration</label>
                <div style="font-size:12px; font-family:monospace; color:var(--text-secondary);">${sub.cin}</div>
              </div>
              <div>
                <label class="form-label">Headquarters</label>
                <div style="font-size:13px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${sub.headquarters}</div>
              </div>
              <div>
                <label class="form-label">Business Vertical / Type</label>
                <div style="font-size:13px;">${sub.businessType}</div>
              </div>
              <div>
                <label class="form-label">Sustainability Officer</label>
                <div style="font-size:13px; font-weight:600;">${sub.leadAdminName}</div>
                <div style="font-size:11px; color:var(--text-muted);">${sub.leadAdminEmail}</div>
              </div>
              <div>
                <label class="form-label">ESG Compliance Index</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="progress-bar-container" style="width:80px;">
                    <div class="progress-bar-fill ${sub.complianceScore >= 80 ? 'green' : sub.complianceScore >= 60 ? 'amber' : 'red'}" style="width:${sub.complianceScore}%;"></div>
                  </div>
                  <span style="font-weight:700; font-size:14px;">${sub.complianceScore}/100</span>
                </div>
              </div>
              <div>
                <label class="form-label">Last Updated</label>
                <div style="font-size:12px; color:var(--text-muted);">${sub.lastUpdated}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="layers"></i> Organizational Snapshot</h3>
            </div>
            <div class="card-body">
              <div style="display:flex; flex-direction:column; gap:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-surface-secondary); border-radius:var(--radius-md);">
                  <div>
                    <div style="font-size:11px; color:var(--text-muted); font-weight:600;">BUSINESS UNITS</div>
                    <div style="font-size:22px; font-weight:700; color:var(--meil-navy);">${bus.length}</div>
                  </div>
                  <i data-lucide="briefcase" style="width:28px; height:28px; color:var(--meil-navy); opacity:0.3;"></i>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-surface-secondary); border-radius:var(--radius-md);">
                  <div>
                    <div style="font-size:11px; color:var(--text-muted); font-weight:600;">ACTIVE PROJECTS</div>
                    <div style="font-size:22px; font-weight:700; color:var(--meil-red);">${projs.length}</div>
                  </div>
                  <i data-lucide="folder-kanban" style="width:28px; height:28px; color:var(--meil-red); opacity:0.3;"></i>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-surface-secondary); border-radius:var(--radius-md);">
                  <div>
                    <div style="font-size:11px; color:var(--text-muted); font-weight:600;">PARENT GROUP</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-brand);">MEIL Group</div>
                  </div>
                  <i data-lucide="building-2" style="width:28px; height:28px; color:var(--text-muted); opacity:0.3;"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Business Units List -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="briefcase"></i> Business Units under ${sub.shortName}</h3>
          <span class="badge badge-draft">${bus.length} BUs</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>BU Name</th>
                  <th>Unit Head</th>
                  <th>Operational Activities</th>
                  <th>Projects</th>
                  <th>ESG Status</th>
                </tr>
              </thead>
              <tbody>
                ${bus.map(bu => `
                  <tr>
                    <td><strong>${bu.name}</strong></td>
                    <td>${bu.head}</td>
                    <td style="font-size:12px; color:var(--text-secondary);">${bu.activities}</td>
                    <td><span class="badge badge-submitted">${bu.projectCount} Projects</span></td>
                    <td>${this.getStatusBadge(bu.esgStatus)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Manufacturing Plants & Operational Facilities (Integrated from Project 2) -->
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title"><i data-lucide="factory"></i> Manufacturing Plants &amp; Operational Facilities</h3>
            <span style="font-size:11px; color:var(--text-muted);">Site locations, environmental clearances (EC) and ISO certifications</span>
          </div>
          <button class="btn btn-sm btn-primary" onclick="ui.showAddFacilityModal('${subId}')">
            <i data-lucide="plus"></i> Add Facility
          </button>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Facility / Site Name</th>
                  <th>Location &amp; State</th>
                  <th>Operating Capacity</th>
                  <th>Environmental Clearance (EC) No.</th>
                  <th>Certifications</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${(store.getFacilities(subId) || []).map((fac, idx) => `
                  <tr>
                    <td><strong>${fac.name}</strong></td>
                    <td><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${fac.location}</td>
                    <td>${fac.capacity}</td>
                    <td><code style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${fac.ecNumber}</code></td>
                    <td><span class="badge badge-approved" style="font-size:10px;">${fac.iso}</span></td>
                    <td>
                      <button class="btn btn-sm btn-outline" style="color:#dc2626;" onclick="ui.handleDeleteFacility('${subId}', ${idx})" title="Delete Facility">
                        <i data-lucide="trash-2"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
                ${(store.getFacilities(subId) || []).length === 0 ? '<tr><td colspan="6" class="table-empty">No operational facilities recorded. Click "Add Facility" to add site disclosures.</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SUB-COMPANY: Business Activities & Project Management
  // =========================================================================
  getTemplateBusinessActivities() {
    const subId = auth.getActiveSubsidiaryId();
    const sub = store.getSubsidiaryById(subId);
    if (!sub) return '<div class="card"><div class="card-body">No subsidiary assigned.</div></div>';
    const bus = store.getBusinessUnits(subId);
    const projs = store.getProjects(subId);
    const activities = store.getBusinessActivities(subId);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="briefcase" style="color:var(--meil-navy)"></i>
            Business Activities &amp; Projects: ${sub.shortName}
          </h1>
          <p class="page-subtitle">NIC classifications, turnover, green capex, and project-level reporting for ${sub.name}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="ui.navigateTo('profile')">
            <i data-lucide="building"></i> Company Profile
          </button>
          <button class="btn btn-primary" onclick="ui.showAddProjectModal('${subId}')">
            <i data-lucide="plus"></i> Add Project
          </button>
        </div>
      </div>

      <!-- Section 1 & 2: NIC Classification, Turnover & Green Capex Disclosures (Integrated from Project 2) -->
      <div class="grid-2-col" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="tag" style="color:var(--meil-navy)"></i> 1. Sector Classification &amp; NIC Codes</h3>
            <span class="badge badge-approved">SEBI Section A</span>
          </div>
          <div class="card-body">
            <form id="form-nic-activities" onsubmit="event.preventDefault(); ui.saveBusinessActivities('${subId}');">
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">National Industrial Classification (NIC) Code &amp; Description <span class="required">*</span></label>
                <input type="text" id="act-nic-code" class="form-control" value="${activities.nicCode || ''}" required>
                <span style="font-size:11px; color:var(--text-muted);">Primary statutory activity code reported in MCA &amp; SEBI filings</span>
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Key Products / Services Offered <span class="required">*</span></label>
                <textarea id="act-products" class="form-control" rows="3" required>${activities.products || ''}</textarea>
              </div>
              <button type="submit" class="btn btn-sm btn-primary">
                <i data-lucide="save"></i> Save Sector Disclosures
              </button>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="coins" style="color:#059669"></i> 2. Financial Disclosures &amp; Green Capex</h3>
            <span class="badge badge-submitted">Turnover &amp; Clean Tech</span>
          </div>
          <div class="card-body">
            <form id="form-financial-capex" onsubmit="event.preventDefault(); ui.saveBusinessActivities('${subId}');">
              <div class="form-grid" style="margin-bottom:12px;">
                <div class="form-group">
                  <label class="form-label">Total Entity Turnover (INR Cr) <span class="required">*</span></label>
                  <input type="number" step="0.1" id="act-turnover" class="form-control" value="${activities.turnoverCr || 0}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Export Turnover Share (%)</label>
                  <input type="number" step="0.1" id="act-export-share" class="form-control" value="${activities.exportSharePct || 0}">
                </div>
              </div>
              <div class="form-grid" style="margin-bottom:12px;">
                <div class="form-group">
                  <label class="form-label">Green / Transition Capex (INR Cr)</label>
                  <input type="number" step="0.1" id="act-green-capex" class="form-control" value="${activities.greenCapexCr || 0}">
                  <span style="font-size:10px; color:var(--text-muted);">Allocated for energy efficiency &amp; renewables</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Clean Tech R&amp;D (% of Turnover)</label>
                  <input type="number" step="0.1" id="act-rd-pct" class="form-control" value="${activities.rdCleanTechPct || 0}">
                </div>
              </div>
              <button type="submit" class="btn btn-sm btn-success">
                <i data-lucide="save"></i> Save Financial Disclosures
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Business Units Overview Cards -->
      <div class="grid-kpi-3">
        ${bus.map(bu => {
          const buProjs = projs.filter(p => p.buId === bu.id);
          const avgProgress = buProjs.length ? Math.round(buProjs.reduce((s, p) => s + (p.progress || 0), 0) / buProjs.length) : 0;
          return `
            <div class="kpi-card accent-blue">
              <div class="kpi-header">
                <span class="kpi-title">${bu.name}</span>
                <div class="kpi-icon-wrap blue"><i data-lucide="briefcase"></i></div>
              </div>
              <div class="kpi-value-row">
                <span class="kpi-value">${buProjs.length}</span>
                <span class="kpi-unit">Projects</span>
              </div>
              <div class="kpi-meta">
                <span>Head: <strong>${bu.head}</strong></span>
                <span>Avg Progress: <strong>${avgProgress}%</strong></span>
              </div>
              <div class="kpi-meta" style="margin-top:4px;">
                <span style="font-size:11px; color:var(--text-muted);">${bu.activities}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Projects Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="folder-kanban"></i> Projects Directory (${projs.length} Projects)</h3>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm btn-outline" onclick="ui.navigateTo('sustainability')">
              <i data-lucide="leaf"></i> ESG Data
            </button>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Project Code & Name</th>
                  <th>Business Unit</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>ESG Ready</th>
                  <th>BRSR Ready</th>
                </tr>
              </thead>
              <tbody>
                ${projs.map(p => {
                  const bu = bus.find(b => b.id === p.buId);
                  return `
                    <tr>
                      <td>
                        <strong>${p.name}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">${p.code}</div>
                      </td>
                      <td style="font-size:12px;">${bu ? bu.name : '-'}</td>
                      <td><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${p.location}</td>
                      <td><span class="badge badge-submitted">${p.status}</span></td>
                      <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                          <div class="progress-bar-container" style="width:50px;">
                            <div class="progress-bar-fill ${p.progress >= 80 ? 'green' : p.progress >= 50 ? 'amber' : 'red'}" style="width:${p.progress}%;"></div>
                          </div>
                          <span style="font-weight:600; font-size:12px;">${p.progress}%</span>
                        </div>
                      </td>
                      <td><span style="font-weight:600;">${p.esgCompletion}%</span></td>
                      <td><span style="font-weight:600;">${p.brsrCompletion}%</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  showAddProjectModal(subsidiaryId) {
    const sub = store.getSubsidiaryById(subsidiaryId);
    const bus = store.getBusinessUnits(subsidiaryId);
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title"><i data-lucide="plus"></i> Add New Project</h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Project Name <span class="required">*</span></label>
              <input type="text" id="inp-proj-name" class="form-control" placeholder="e.g. Solar Park Phase 3">
            </div>
            <div class="form-group">
              <label class="form-label">Project Code</label>
              <input type="text" id="inp-proj-code" class="form-control" placeholder="e.g. MEIL-SP-03">
            </div>
            <div class="form-group">
              <label class="form-label">Business Unit</label>
              <select id="inp-proj-bu" class="form-control">
                ${bus.map(bu => '<option value="' + bu.id + '">' + bu.name + '</option>').join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Location</label>
              <input type="text" id="inp-proj-location" class="form-control" placeholder="City, State">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
          <button class="btn btn-brand-red" onclick="ui.saveNewProject('${subsidiaryId}')">
            <i data-lucide="plus"></i> Create Project
          </button>
        </div>
      </div>
    `;
    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  saveNewProject(subsidiaryId) {
    const name = document.getElementById('inp-proj-name')?.value;
    const code = document.getElementById('inp-proj-code')?.value;
    const buId = document.getElementById('inp-proj-bu')?.value;
    const location = document.getElementById('inp-proj-location')?.value;
    if (!name) { this.showToast('Project name is required.', 'danger'); return; }
    store.addProject({ name, code, subsidiaryId, buId, location });
    this.closeModals();
    this.showToast('Project created successfully.', 'success');
    this.renderCurrentView();
  }

  // =========================================================================
  // 3. SUSTAINABILITY (ESG) MODULE (Environment, Social, Governance)
  // =========================================================================
  getTemplateSustainability() {
    const activeTab = this.currentSubTab || 'environment';
    const isMain = auth.isMainAdmin();
    const subId = isMain ? (this.activeSubsidiaryFilter === 'all' ? 'sub-1' : this.activeSubsidiaryFilter) : auth.getActiveSubsidiaryId();
    const esg = store.getESGData(subId, this.activeYearFilter) || {};
    const cons = isMain ? store.calculateConsolidatedData(this.activeYearFilter) : null;
    const sub = store.getSubsidiaryById(subId);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="leaf" style="color:var(--color-success)"></i>
            Sustainability &amp; ESG Performance Engine
          </h1>
          <p class="page-subtitle">
            ${isMain ? 'Consolidated MEIL Group ESG Indicators with live roll-up from approved subsidiaries' : `Data management for ${sub?.name}`}
          </p>
        </div>
        <div class="page-actions">
          ${!isMain ? `
            <button class="btn btn-brand-red" onclick="ui.openDataEntryModal('${activeTab}')">
              <i data-lucide="edit-3"></i> Add / Edit ${activeTab.toUpperCase()} Data
            </button>
          ` : `
            <button class="btn btn-secondary" onclick="ui.navigateTo('reports')">
              <i data-lucide="file-bar-chart"></i> ESG Report
            </button>
          `}
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav">
        <button class="tab-btn ${activeTab === 'environment' ? 'active' : ''}" onclick="ui.navigateTo('sustainability', 'environment')">
          <i data-lucide="leaf"></i> Environment (E)
        </button>
        <button class="tab-btn ${activeTab === 'social' ? 'active' : ''}" onclick="ui.navigateTo('sustainability', 'social')">
          <i data-lucide="users"></i> Social & Workplace (S)
        </button>
        <button class="tab-btn ${activeTab === 'governance' ? 'active' : ''}" onclick="ui.navigateTo('sustainability', 'governance')">
          <i data-lucide="scale"></i> Governance & Ethics (G)
        </button>
      </div>

      <!-- Sub-Tab Content -->
      ${this.renderSustainabilityTabContent(activeTab, isMain, esg, cons, sub)}
    `;
  }

  renderSustainabilityTabContent(tab, isMain, esg, cons, sub) {
    if (tab === 'environment') {
      const data = isMain ? {
        totalEnergyMWh: cons.totalEnergyMWh,
        renewableEnergyMWh: cons.renewableEnergyMWh,
        nonRenewableEnergyMWh: cons.nonRenewableEnergyMWh,
        renewablePercent: cons.renewablePercent,
        waterWithdrawalKL: cons.waterWithdrawalKL,
        waterConsumptionKL: cons.waterConsumptionKL,
        waterRecycledKL: cons.waterRecycledKL,
        wasteGeneratedMT: cons.wasteGeneratedMT,
        wasteRecycledMT: cons.wasteRecycledMT,
        wasteDisposalMT: cons.wasteDisposalMT,
        ghgScope1: cons.ghgScope1,
        ghgScope2: cons.ghgScope2,
        ghgScope3: cons.ghgScope3,
        totalGHG: cons.totalGHG,
        biodiversitySaplings: cons.biodiversitySaplings
      } : esg.environment || {};

      return `
        <div class="grid-kpi-4">
          <div class="kpi-card accent-blue">
            <div class="kpi-header"><span class="kpi-title">Total Energy</span><div class="kpi-icon-wrap blue"><i data-lucide="zap"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">${(data.totalEnergyMWh || 0).toLocaleString()}</span><span class="kpi-unit">MWh</span></div>
            <div class="kpi-meta"><span>Renewable: <strong>${data.renewablePercent || 0}%</strong></span><span class="badge badge-approved">Certified</span></div>
          </div>
          <div class="kpi-card accent-red">
            <div class="kpi-header"><span class="kpi-title">Total GHG Emissions</span><div class="kpi-icon-wrap red"><i data-lucide="cloud"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">${(data.totalGHG || 0).toLocaleString()}</span><span class="kpi-unit">tCO2e</span></div>
            <div class="kpi-meta"><span>Scope 1 + Scope 2 + Scope 3</span><span class="kpi-trend positive">-6.2% YoY</span></div>
          </div>
          <div class="kpi-card accent-blue">
            <div class="kpi-header"><span class="kpi-title">Water Recycled</span><div class="kpi-icon-wrap blue"><i data-lucide="droplet"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">${(data.waterRecycledKL || 0).toLocaleString()}</span><span class="kpi-unit">kL</span></div>
            <div class="kpi-meta"><span>Withdrawal: ${(data.waterWithdrawalKL || 0).toLocaleString()} kL</span><span class="badge badge-approved">ZLD Standards</span></div>
          </div>
          <div class="kpi-card accent-green">
            <div class="kpi-header"><span class="kpi-title">Afforestation</span><div class="kpi-icon-wrap green"><i data-lucide="tree-pine"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">${(data.biodiversitySaplings || 0).toLocaleString()}</span><span class="kpi-unit">Saplings</span></div>
            <div class="kpi-meta"><span>Green belt preservation</span><span class="kpi-trend positive">Expanding</span></div>
          </div>
        </div>

        <div class="grid-2-col">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="droplets"></i> Water Withdrawal vs Consumption</h3></div>
            <div class="card-body" style="height:280px;"><canvas id="chart-esg-water"></canvas></div>
          </div>
          <div class="card-header-card card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="trash-2"></i> Waste Generation &amp; Circular Recycling</h3></div>
            <div class="card-body">
              <table class="table">
                <thead><tr><th>Waste Stream</th><th>Total MT</th><th>Recycled MT</th><th>Disposed MT</th><th>Recovery %</th></tr></thead>
                <tbody>
                  <tr><td>Non-Hazardous Construction Muck</td><td>${((data.wasteGeneratedMT || 1000) * 0.75).toFixed(0)} MT</td><td>${((data.wasteRecycledMT || 800) * 0.8).toFixed(0)} MT</td><td>${((data.wasteDisposalMT || 200) * 0.6).toFixed(0)} MT</td><td><span class="badge badge-approved">82%</span></td></tr>
                  <tr><td>Hazardous Oils &amp; Spent Lubricants</td><td>${((data.wasteGeneratedMT || 1000) * 0.25).toFixed(0)} MT</td><td>${((data.wasteRecycledMT || 800) * 0.2).toFixed(0)} MT</td><td>${((data.wasteDisposalMT || 200) * 0.4).toFixed(0)} MT</td><td><span class="badge badge-approved">74%</span></td></tr>
                </tbody>
              </table>
              <div style="margin-top:16px; padding:12px; background:var(--bg-surface-secondary); border-radius:6px; font-size:12px;">
                <strong>Key Initiative:</strong> Reutilization of tunnel muck in road sub-grade layers and bio-remediation of contaminated runoff.
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'social') {
      const data = isMain ? cons : esg.social || {};
      return `
        <div class="grid-kpi-4">
          <div class="kpi-card accent-green">
            <div class="kpi-header"><span class="kpi-title">Total Workforce</span><div class="kpi-icon-wrap green"><i data-lucide="users"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">${(data.totalEmployees || 0).toLocaleString()}</span><span class="kpi-unit">Personnel</span></div>
            <div class="kpi-meta"><span>Male: ${(data.maleEmployees || 0).toLocaleString()} | Female: ${(data.femaleEmployees || 0).toLocaleString()}</span><span class="badge badge-approved">Fair Wages</span></div>
          </div>
          <div class="kpi-card accent-blue">
            <div class="kpi-header"><span class="kpi-title">Safety Training</span><div class="kpi-icon-wrap blue"><i data-lucide="shield"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">${(data.safetyTrainingManHours || 0).toLocaleString()}</span><span class="kpi-unit">Man-Hours</span></div>
            <div class="kpi-meta"><span>Mandatory OHS certification</span><span class="kpi-trend positive">100% Target</span></div>
          </div>
          <div class="kpi-card accent-red">
            <div class="kpi-header"><span class="kpi-title">Workplace Safety LTIFR</span><div class="kpi-icon-wrap red"><i data-lucide="hard-hat"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">${data.ltifrAverage || data.ltifr || 0.08}</span><span class="kpi-unit">Rate</span></div>
            <div class="kpi-meta"><span>Fatalities: <strong>${data.fatalities || 0}</strong></span><span class="badge badge-approved">Vision Zero</span></div>
          </div>
          <div class="kpi-card accent-purple">
            <div class="kpi-header"><span class="kpi-title">CSR Investment</span><div class="kpi-icon-wrap"><i data-lucide="heart"></i></div></div>
            <div class="kpi-value-row"><span class="kpi-value">₹ ${(data.csrSpendLakhs || 0).toLocaleString()}</span><span class="kpi-unit">Lakhs</span></div>
            <div class="kpi-meta"><span>Beneficiaries: ${(data.csrBeneficiaries || 0).toLocaleString()}</span><span class="badge badge-approved">Sec 135</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="message-square"></i> Grievance Redressal &amp; Human Rights Tracking</h3></div>
          <div class="card-body">
            <div style="display:flex; gap:20px; align-items:center;">
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:600; margin-bottom:8px;">Grievances Redressed Status (100% Target)</div>
                <div class="progress-bar-container" style="height:12px;">
                  <div class="progress-bar-fill green" style="width:100%;"></div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:18px; font-weight:700; color:var(--color-success);">${data.grievancesResolved || 14} / ${data.grievancesReceived || 14} Resolved</div>
                <div style="font-size:11px; color:var(--text-muted);">Zero Child / Forced Labor Violations</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'governance') {
      const data = isMain ? cons : esg.governance || {};
      return `
        <div class="grid-3-col">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="scale"></i> Board Independence</h3></div>
            <div class="card-body" style="text-align:center; padding:30px 20px;">
              <div style="font-size:36px; font-weight:700; color:var(--meil-navy);">${data.independentPercent || 50}%</div>
              <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">${data.independentDirectors || 4} of ${data.boardTotalMembers || 8} Independent Directors</p>
              <div style="margin-top:16px;"><span class="badge badge-approved"><i data-lucide="check"></i> Meets SEBI LODR</span></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="shield-alert"></i> Anti-Bribery &amp; Ethics</h3></div>
            <div class="card-body" style="text-align:center; padding:30px 20px;">
              <div style="font-size:36px; font-weight:700; color:var(--color-success);">${data.antiCorruptionTrainedAvg || data.antiCorruptionTrainedPercent || 98}%</div>
              <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">Staff Trained on Prevention of Corruption</p>
              <div style="margin-top:16px;"><span class="badge badge-approved"><i data-lucide="check"></i> Zero Violations</span></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="phone-call"></i> Whistleblower Mechanism</h3></div>
            <div class="card-body" style="text-align:center; padding:30px 20px;">
              <div style="font-size:36px; font-weight:700; color:var(--meil-blue);">100%</div>
              <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">Complaints Investigated by Audit Committee</p>
              <div style="margin-top:16px;"><span class="badge badge-approved"><i data-lucide="check"></i> Active Helpline</span></div>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  postRenderSustainability() {
    const isMain = auth.isMainAdmin();
    const subId = isMain ? 'sub-1' : auth.getActiveSubsidiaryId();
    const esg = store.getESGData(subId, this.activeYearFilter) || {};
    const env = esg.environment || {};

    if (document.getElementById('chart-esg-water')) {
      chartEngine.renderWaterChart('chart-esg-water', {
        waterWithdrawalKL: env.waterWithdrawalKL,
        waterConsumptionKL: env.waterConsumptionKL,
        waterRecycledKL: env.waterRecycledKL
      });
    }

    this.refreshIcons();
  }

  // =========================================================================
  // 4. BRSR MODULE (Section A, Section B, Section C Principles 1-9)
  // =========================================================================
  getTemplateBRSR() {
    const activeTab = this.currentSubTab || 'section_c';
    const isMain = auth.isMainAdmin();
    const subId = isMain ? 'sub-1' : auth.getActiveSubsidiaryId();
    const brsr = store.getBRSRData(subId, this.activeYearFilter) || {};

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="file-text" style="color:var(--meil-navy)"></i>
            SEBI Business Responsibility &amp; Sustainability Reporting (BRSR)
          </h1>
          <p class="page-subtitle">Disclosures aligned with NGRBC &amp; SEBI Circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="ui.navigateTo('reports')">
            <i data-lucide="printer"></i> Export Statutory BRSR
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav">
        <button class="tab-btn ${activeTab === 'section_a' ? 'active' : ''}" onclick="ui.navigateTo('brsr', 'section_a')">
          <i data-lucide="info"></i> Section A: General Disclosures
        </button>
        <button class="tab-btn ${activeTab === 'section_b' ? 'active' : ''}" onclick="ui.navigateTo('brsr', 'section_b')">
          <i data-lucide="check-square"></i> Section B: Management &amp; Process
        </button>
        <button class="tab-btn ${activeTab === 'section_c' ? 'active' : ''}" onclick="ui.navigateTo('brsr', 'section_c')">
          <i data-lucide="award"></i> Section C: Principle-Wise Performance (P1-P9)
        </button>
      </div>

      <!-- Tab Content -->
      ${this.renderBRSRTabContent(activeTab, brsr)}
    `;
  }

  renderBRSRTabContent(tab, brsr) {
    if (tab === 'section_a') {
      const secA = brsr.sectionA || {};
      return `
        <div class="card">
          <div class="card-header"><h3 class="card-title">Section A: General Corporate &amp; Operations Disclosures</h3><span class="badge badge-approved">100% Completed</span></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group full-width"><label class="form-label">Corporate Identity &amp; Registration</label><div class="form-control" style="height:auto; padding:10px;">${secA.corporateIdentity || 'MEIL Group Company'}</div></div>
              <div class="form-group"><label class="form-label">Operations &amp; Site Locations</label><div class="form-control" style="height:auto; padding:10px;">${secA.operationsSummary || 'Pan India Infrastructure Projects'}</div></div>
              <div class="form-group"><label class="form-label">Markets &amp; Clients Served</label><div class="form-control" style="height:auto; padding:10px;">${secA.marketsServed || 'Central & State Governments'}</div></div>
              <div class="form-group"><label class="form-label">Total Workforce Covered</label><div class="form-control" style="height:auto; padding:10px;">${secA.totalWorkforce || 'All Employees Covered'}</div></div>
              <div class="form-group"><label class="form-label">Section 135 CSR Compliance</label><div class="form-control" style="height:auto; padding:10px;">${secA.csrEligibility || 'Compliant with 2% CSR Spend'}</div></div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'section_b') {
      const secB = brsr.sectionB || {};
      return `
        <div class="card">
          <div class="card-header"><h3 class="card-title">Section B: Management, Governance &amp; Policy Process</h3><span class="badge badge-approved">100% Completed</span></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group full-width"><label class="form-label">Sustainability Policies in Place (P1 to P9)</label><div class="form-control" style="height:auto; padding:10px;">${secB.policiesInPlace || 'Formal board-approved policies covering environmental management, occupational safety, human rights, and anti-bribery.'}</div></div>
              <div class="form-group"><label class="form-label">Board-Level Oversight &amp; Committees</label><div class="form-control" style="height:auto; padding:10px;">${secB.boardOversight || 'Quarterly review by Board CSR & Sustainability Committee.'}</div></div>
              <div class="form-group"><label class="form-label">Grievance Redressal Mechanisms</label><div class="form-control" style="height:auto; padding:10px;">${secB.grievanceRedressal || 'Digital grievance management portal and whistleblower hotline.'}</div></div>
              <div class="form-group full-width"><label class="form-label">Stakeholder Consultation &amp; Engagement</label><div class="form-control" style="height:auto; padding:10px;">${secB.stakeholderEngagement || 'Structured consultations with local communities, contractors, clients, and municipal stakeholders.'}</div></div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'section_c') {
      const secC = brsr.sectionC || { principles: [] };
      const principles = secC.principles || [];

      return `
        <div class="grid-2-1" style="margin-bottom:24px;">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="radar"></i> 9 Principles Compliance Spider Chart</h3></div>
            <div class="card-body" style="height:320px;"><canvas id="chart-brsr-radar"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header"><h3 class="card-title">Statutory Readiness Summary</h3></div>
            <div class="card-body">
              <div style="text-align:center; padding:20px 0;">
                <div style="font-size:42px; font-weight:700; color:var(--meil-navy);">${secC.completed || 92}%</div>
                <div style="font-size:13px; color:var(--text-muted);">Overall BRSR Core Readiness Score</div>
                <div style="margin-top:16px;"><span class="badge badge-approved">SEBI Filing Compliant</span></div>
              </div>
              <p style="font-size:12px; color:var(--text-secondary); line-height:1.5; border-top:1px solid var(--border-light); padding-top:16px;">
                Disclosures cover essential indicators for all 9 SEBI Principles including ethics, life-cycle sustainability, employee well-being, environment, human rights, and consumer value.
              </p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">Principle-wise Detailed Indicator Matrix (P1 to P9)</h3></div>
          <div class="card-body" style="padding:0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Principle No.</th>
                  <th>Principle Title</th>
                  <th>Compliance Score</th>
                  <th>Summary of Performance &amp; Initiatives</th>
                  <th>Statutory Status</th>
                </tr>
              </thead>
              <tbody>
                ${principles.map(p => `
                  <tr>
                    <td><strong style="color:var(--meil-navy);">Principle ${p.number}</strong></td>
                    <td><strong>${p.name}</strong></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:700;">${p.score}%</span>
                        <div class="progress-bar-container" style="width:60px;">
                          <div class="progress-bar-fill green" style="width:${p.score}%;"></div>
                        </div>
                      </div>
                    </td>
                    <td style="font-size:12px; color:var(--text-secondary);">${p.summary}</td>
                    <td>${this.getStatusBadge(p.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return '';
  }

  postRenderBRSR() {
    const subId = auth.isMainAdmin() ? 'sub-1' : auth.getActiveSubsidiaryId();
    const brsr = store.getBRSRData(subId, this.activeYearFilter) || {};
    const principles = brsr.sectionC?.principles || [];

    if (document.getElementById('chart-brsr-radar') && principles.length > 0) {
      chartEngine.renderBRSRRadarChart('chart-brsr-radar', principles);
    }

    this.refreshIcons();
  }

  // =========================================================================
  // 5. SUBMISSIONS & APPROVAL CENTER
  // =========================================================================
  getTemplateMainSubmissions() {
    const subs = store.getSubmissions(this.activeYearFilter);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="check-circle-2" style="color:var(--meil-navy)"></i>
            Central Submissions &amp; Approval Center
          </h1>
          <p class="page-subtitle">Review, verify, request corrections, or approve subsidiary ESG/BRSR data submissions</p>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label"><i data-lucide="filter"></i> Filter by Status:</span>
          <select class="filter-select" onchange="ui.filterSubmissionsTable(this.value)">
            <option value="all">All Statuses (${subs.length})</option>
            <option value="Submitted">Pending Review</option>
            <option value="Correction Required">Correction Required</option>
            <option value="Approved">Approved & Consolidated</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <div style="font-size:12px; color:var(--text-muted);">
          Rule: <strong>Only Approved records</strong> are consolidated into MEIL Group analytics &amp; reports.
        </div>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table" id="submissions-table">
              <thead>
                <tr>
                  <th>Submission ID</th>
                  <th>Subsidiary Name</th>
                  <th>Cycle</th>
                  <th>Submitted By</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderSubmissionsTableRows(subs)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  getTemplateSubSubmissions() {
    const subId = auth.getActiveSubsidiaryId();
    const sub = auth.getActiveSubsidiary();
    const submList = store.getSubmissions('all', subId);
    const currentSubm = submList[0];

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="send" style="color:var(--meil-navy)"></i>
            Data Submission &amp; Lifecycle Status
          </h1>
          <p class="page-subtitle">Submission tracking for <strong>${sub?.name}</strong></p>
        </div>
        <div class="page-actions">
          <button class="btn btn-brand-red" onclick="ui.openDataEntryModal()">
            <i data-lucide="edit-3"></i> Edit Data Form
          </button>
          <button class="btn btn-primary" onclick="workflow.submitData('${subId}', '${this.activeYearFilter}')">
            <i data-lucide="send"></i> Submit to Main Admin
          </button>
        </div>
      </div>

      <!-- 4-Stage Compliance Lifecycle Stepper -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="padding:12px 16px;">
          <h4 class="card-title" style="font-size:13px;"><i data-lucide="route" style="color:var(--meil-navy)"></i> Filing Compliance Lifecycle Stepper</h4>
          <span class="badge ${currentSubm?.status === 'Approved' ? 'badge-approved' : (currentSubm?.status === 'Submitted' ? 'badge-submitted' : (currentSubm?.status === 'Rejected' ? 'badge-rejected' : 'badge-draft'))}">${currentSubm?.status || 'Draft'}</span>
        </div>
        <div class="card-body" style="padding:14px 16px;">
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px;">
            <div class="card" style="background:#f8fafc; border-top: 3px solid #059669; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:#059669;"><i data-lucide="check" style="width:12px;height:12px;display:inline;"></i> Step 1</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Data Entry &amp; Draft</strong>
              <span style="font-size:10px; color:#64748b;">Save Disclosures</span>
            </div>
            <div class="card" style="background:#f8fafc; border-top: 3px solid ${currentSubm?.status && currentSubm?.status !== 'Draft' ? '#059669' : '#cbd5e1'}; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:${currentSubm?.status && currentSubm?.status !== 'Draft' ? '#059669' : '#64748b'};">${currentSubm?.status && currentSubm?.status !== 'Draft' ? '<i data-lucide="check" style="width:12px;height:12px;display:inline;"></i>' : '<i data-lucide="send" style="width:12px;height:12px;display:inline;"></i>'} Step 2</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Submitted for Review</strong>
              <span style="font-size:10px; color:#64748b;">Dispatched to Central Admin</span>
            </div>
            <div class="card" style="background:#f8fafc; border-top: 3px solid ${currentSubm?.status === 'Submitted' || currentSubm?.status === 'Under Review' ? '#f59e0b' : (currentSubm?.status === 'Correction Required' ? '#ea580c' : (currentSubm?.status === 'Rejected' ? '#dc2626' : (currentSubm?.status === 'Approved' ? '#059669' : '#cbd5e1')))}; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:${currentSubm?.status === 'Approved' ? '#059669' : (currentSubm?.status === 'Rejected' ? '#dc2626' : '#d97706')};">Step 3</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Executive Review</strong>
              <span style="font-size:10px; color:#64748b;">${currentSubm?.status === 'Correction Required' ? 'Correction Required' : (currentSubm?.status === 'Rejected' ? 'Submission Rejected' : 'Audit Verification')}</span>
            </div>
            <div class="card" style="background:#f8fafc; border-top: 3px solid ${currentSubm?.status === 'Approved' ? '#059669' : '#cbd5e1'}; text-align:center; padding:10px;">
              <div style="font-size:11px; font-weight:700; color:${currentSubm?.status === 'Approved' ? '#059669' : '#64748b'};">${currentSubm?.status === 'Approved' ? '<i data-lucide="check-check" style="width:12px;height:12px;display:inline;"></i>' : '<i data-lucide="lock" style="width:12px;height:12px;display:inline;"></i>'} Step 4</div>
              <strong style="font-size:12px; display:block; margin:2px 0;">Approved &amp; Consolidated</strong>
              <span style="font-size:10px; color:#64748b;">Included in Group Rollup</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Reviewer feedback if Correction Required -->
      ${currentSubm?.status === 'Correction Required' ? `
        <div class="correction-card" style="margin-bottom:20px;">
          <div class="correction-header">
            <div class="correction-badge-title">
              <i data-lucide="alert-triangle"></i> Reviewer Correction Required
            </div>
            <span class="badge badge-correction">Action Required</span>
          </div>
          <div class="correction-comment">
            "${currentSubm.reviewerNotes}"
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn btn-sm btn-outline" onclick="ui.openDataEntryModal()">Make Corrections</button>
            <button class="btn btn-sm btn-brand-red" onclick="workflow.resubmitData('${subId}', '${this.activeYearFilter}')">
              Resubmit Data
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Rejection Alert Banner -->
      ${currentSubm?.status === 'Rejected' ? `
        <div class="correction-card" style="margin-bottom:20px; border-left: 4px solid #dc2626; background: #fef2f2;">
          <div class="correction-header">
            <div class="correction-badge-title" style="color:#b91c1c;">
              <i data-lucide="x-circle"></i> Submission Rejected by Central Reviewer
            </div>
            <span class="badge badge-rejected">Filing Rejected</span>
          </div>
          <div class="correction-comment" style="color:#991b1b; border-color:#fca5a5;">
            "${currentSubm.reviewerNotes || 'The submitted data was rejected during audit verification. Review the remarks and submit revised disclosures.'}"
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn btn-sm btn-outline" onclick="ui.openDataEntryModal()">Correct Disclosures</button>
            <button class="btn btn-sm btn-danger" style="background:#dc2626;" onclick="workflow.resubmitData('${subId}', '${this.activeYearFilter}')">
              <i data-lucide="refresh-cw"></i> Resubmit Revised Data
            </button>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header"><h3 class="card-title">Submission History &amp; Audit Log</h3></div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Submission ID</th>
                  <th>Reporting Cycle</th>
                  <th>Submitted By</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Reviewer Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${submList.map(s => `
                  <tr>
                    <td><strong>${s.id}</strong></td>
                    <td>${s.year}</td>
                    <td>${s.submittedBy || 'N/A'}</td>
                    <td>${s.submissionDate || 'Draft (Not Submitted)'}</td>
                    <td>${this.getStatusBadge(s.status)}</td>
                    <td style="font-size:12px; color:var(--text-muted); max-width:250px;">
                      ${s.reviewerNotes || 'No remarks yet'}
                    </td>
                    <td>
                      <button class="btn btn-sm btn-outline" onclick="workflow.openReviewModal('${s.id}')">
                        <i data-lucide="eye"></i> View
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderSubmissionsTableRows(list) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="8" class="table-empty">No submissions found matching criteria.</td></tr>`;
    }

    return list.map(s => `
      <tr data-status="${s.status}">
        <td><strong>${s.id}</strong></td>
        <td><strong>${s.subsidiaryName}</strong></td>
        <td>${s.year}</td>
        <td>${s.submittedBy || 'Pending'}</td>
        <td>${s.submissionDate || 'Draft'}</td>
        <td>${this.getStatusBadge(s.status)}</td>
        <td style="font-size:12px; color:var(--text-muted);">${s.lastUpdated}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" onclick="workflow.openReviewModal('${s.id}')" title="Inspect Disclosures">
              <i data-lucide="file-search"></i> Review
            </button>
            ${auth.isMainAdmin() && (s.status === 'Submitted' || s.status === 'Resubmitted' || s.status === 'Under Review') ? `
              <button class="btn btn-sm btn-success" onclick="workflow.approveSubmission('${s.id}')" title="Approve & Consolidate">
                <i data-lucide="check"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="ui.openCorrectionModal('${s.id}')" title="Request Correction">
                <i data-lucide="alert-circle"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  postRenderSubmissions() {
    this.refreshIcons();
  }

  filterSubmissionsTable(status) {
    const rows = document.querySelectorAll('#submissions-table tbody tr');
    rows.forEach(row => {
      if (status === 'all' || row.getAttribute('data-status') === status) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  // =========================================================================
  // 6. ANALYTICS & BENCHMARKS
  // =========================================================================
  getTemplateAnalytics() {
    const cons = store.calculateConsolidatedData(this.activeYearFilter);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="bar-chart-3" style="color:var(--meil-navy)"></i>
            MEIL Group Sustainability Analytics &amp; Benchmarks
          </h1>
          <p class="page-subtitle">Comparative subsidiary intelligence, multi-year performance trends, and emissions intensity ratios</p>
        </div>
      </div>

      <div class="grid-2-col">
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="trending-up"></i> Multi-Year ESG Historical Trajectory</h3><span class="badge badge-approved">FY22 - FY26</span></div>
          <div class="card-body" style="height:320px;"><canvas id="chart-ana-trend"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="award"></i> Subsidiary ESG Score Benchmarking</h3><span class="badge badge-approved">Leaderboard</span></div>
          <div class="card-body" style="height:320px;"><canvas id="chart-ana-subs"></canvas></div>
        </div>
      </div>

      <div class="grid-kpi-3" style="margin-top:24px;">
        <div class="kpi-card accent-green">
          <div class="kpi-header"><span class="kpi-title">Carbon Intensity of Turnover</span><div class="kpi-icon-wrap green"><i data-lucide="leaf"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value">14.2</span><span class="kpi-unit">tCO2e / Cr INR</span></div>
          <div class="kpi-meta"><span>Down 22% vs FY23 baseline</span><span class="kpi-trend positive"><i data-lucide="arrow-down-right"></i> Reduced</span></div>
        </div>

        <div class="kpi-card accent-blue">
          <div class="kpi-header"><span class="kpi-title">Water Stewardship Intensity</span><div class="kpi-icon-wrap blue"><i data-lucide="droplet"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value">${cons.waterRecycledPercent}%</span><span class="kpi-unit">Recycling Rate</span></div>
          <div class="kpi-meta"><span>Zero Liquid Discharge Policy</span><span class="badge badge-approved">Exceeds Goal</span></div>
        </div>

        <div class="kpi-card accent-purple">
          <div class="kpi-header"><span class="kpi-title">Safety Lost Time Frequency</span><div class="kpi-icon-wrap"><i data-lucide="shield-check"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value">${cons.ltifrAverage}</span><span class="kpi-unit">LTIFR</span></div>
          <div class="kpi-meta"><span>Zero Lost-Time Incidents in EV Div</span><span class="badge badge-approved">Exemplary</span></div>
        </div>
      </div>
    `;
  }

  postRenderAnalytics() {
    chartEngine.renderHistoricalTrendChart('chart-ana-trend');
    chartEngine.renderSubsidiaryComparisonChart('chart-ana-subs', this.activeYearFilter);
    this.refreshIcons();
  }

  // =========================================================================
  // 7. REPORTS & STATUTORY EXPORTS
  // =========================================================================
  getTemplateReports() {
    const isMain = auth.isMainAdmin();
    const subs = store.getSubsidiaries();
    const activeSub = isMain ? 'all' : auth.getActiveSubsidiaryId();

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="file-bar-chart" style="color:var(--meil-navy)"></i>
            Statutory Sustainability &amp; BRSR Report Center
          </h1>
          <p class="page-subtitle">Generate official SEBI BRSR filings, ESG summary reports, PDF printable documents, and Excel exports</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="reportEngine.exportReportToExcel(document.getElementById('report-type-select')?.value || 'Consolidated BRSR Report', document.getElementById('report-year-select')?.value || '${this.activeYearFilter}', document.getElementById('report-scope-select')?.value || '${activeSub}')" title="Generate Formatted Microsoft Excel XML Spreadsheet">
            <i data-lucide="file-spreadsheet"></i> Export Excel (.xls)
          </button>
          <button class="btn btn-outline" onclick="reportEngine.exportToCSV('Consolidated_ESG_BRSR', '${this.activeYearFilter}', '${activeSub}')" title="Export Raw CSV Data">
            <i data-lucide="table"></i> Export CSV
          </button>
          <button class="btn btn-brand-red" onclick="reportEngine.printPDF()" title="Print or Save as PDF Document">
            <i data-lucide="printer"></i> Export / Print PDF
          </button>
        </div>
      </div>

      <!-- Report Generator Options Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label"><i data-lucide="file-text"></i> Report Type:</span>
          <select class="filter-select" id="report-type-select" onchange="ui.updateReportPreview()">
            <option value="Consolidated BRSR Report">Comprehensive SEBI BRSR Report</option>
            <option value="Consolidated ESG Report">Executive ESG Integrated Summary</option>
            <option value="Environmental Deep-Dive">Environmental & Carbon Accounting Report</option>
            <option value="Social & Workplace Safety">Workplace Safety & Social Report</option>
          </select>

          <span class="filter-label" style="margin-left:12px;"><i data-lucide="calendar"></i> Cycle:</span>
          <select class="filter-select" id="report-year-select" onchange="ui.updateReportPreview()">
            <option value="FY 2025-26">FY 2025-26</option>
            <option value="FY 2024-25">FY 2024-25</option>
          </select>

          ${isMain ? `
            <span class="filter-label" style="margin-left:12px;"><i data-lucide="building"></i> Scope:</span>
            <select class="filter-select" id="report-scope-select" onchange="ui.updateReportPreview()">
              <option value="all">MEIL Group Consolidated (All Approved)</option>
              ${subs.map(s => `<option value="${s.id}">${s.shortName}</option>`).join('')}
            </select>
          ` : ''}
        </div>
      </div>

      <!-- Live Printable Document Preview Container -->
      <div id="live-report-container" class="card" style="padding:24px; background:#ffffff; box-shadow:var(--shadow-md);">
        ${reportEngine.generateReportHTML('Consolidated BRSR Report', this.activeYearFilter, activeSub)}
      </div>
    `;
  }

  postRenderReports() {
    this.refreshIcons();
  }

  updateReportPreview() {
    const type = document.getElementById('report-type-select')?.value || 'Consolidated BRSR Report';
    const year = document.getElementById('report-year-select')?.value || 'FY 2025-26';
    const scope = document.getElementById('report-scope-select')?.value || (auth.isMainAdmin() ? 'all' : auth.getActiveSubsidiaryId());

    const container = document.getElementById('live-report-container');
    if (container) {
      container.innerHTML = reportEngine.generateReportHTML(type, year, scope);
      this.refreshIcons();
    }
  }

  // =========================================================================
  // 8. NOTIFICATIONS MODULE
  // =========================================================================
  getTemplateNotifications() {
    const notifs = store.getNotifications(auth.getCurrentRole(), auth.getActiveSubsidiaryId());

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="bell" style="color:var(--meil-navy)"></i>
            System Notifications &amp; Audit Trail
          </h1>
          <p class="page-subtitle">Submissions updates, reviewer remarks, and statutory compliance reminders</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline btn-sm" onclick="store.markAllNotificationsRead(); ui.renderCurrentView();">
            <i data-lucide="check-check"></i> Mark All as Read
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0;">
          <div class="notification-list">
            ${notifs.length === 0 ? `<div class="table-empty">No notifications available.</div>` : notifs.map(n => `
              <div class="notification-item ${n.read ? '' : 'unread'}" style="padding:16px 20px;">
                <div class="notification-icon" style="background-color: ${n.color === 'danger' ? 'var(--color-danger)' : (n.color === 'success' ? 'var(--color-success)' : 'var(--meil-blue)')}">
                  <i data-lucide="${n.icon}"></i>
                </div>
                <div class="notification-content">
                  <div class="notification-title">${n.title}</div>
                  <div class="notification-desc">${n.desc}</div>
                  <div class="notification-time">${n.time} &bull; ${n.timestamp.slice(0, 16)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderNotificationsDrawer() {
    const drawerList = document.getElementById('notification-drawer-list');
    if (!drawerList) return;

    const notifs = store.getNotifications(auth.getCurrentRole(), auth.getActiveSubsidiaryId());
    drawerList.innerHTML = notifs.slice(0, 5).map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}">
        <div class="notification-icon" style="background-color: ${n.color === 'danger' ? 'var(--color-danger)' : (n.color === 'success' ? 'var(--color-success)' : 'var(--meil-blue)')}">
          <i data-lucide="${n.icon}" style="width:16px; height:16px;"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${n.title}</div>
          <div class="notification-desc">${n.desc}</div>
          <div class="notification-time">${n.time}</div>
        </div>
      </div>
    `).join('');

    this.refreshIcons();
  }

  // =========================================================================
  // 9. SETTINGS & PROFILE
  // =========================================================================
  getTemplateSettings() {
    const user = auth.getUserInfo();

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="settings" style="color:var(--meil-navy)"></i>
            System &amp; Profile Settings
          </h1>
          <p class="page-subtitle">User profile details, statutory parameters, and reporting cycle configurations</p>
        </div>
      </div>

      <div class="grid-2-col">
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="user"></i> Active Session Information</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group"><label class="form-label">User ID</label><input type="text" class="form-control" value="${user.userId}" disabled></div>
              <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-control" value="${user.name}" disabled></div>
              <div class="form-group"><label class="form-label">Designation</label><input type="text" class="form-control" value="${user.title}" disabled></div>
              <div class="form-group"><label class="form-label">Email Address</label><input type="text" class="form-control" value="${user.email}" disabled></div>
              <div class="form-group full-width"><label class="form-label">Assigned Role</label><div class="badge badge-approved" style="font-size:13px; padding:6px 12px;">${auth.getRoleLabel()}</div></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="sliders"></i> Prototype Control Panel</h3></div>
          <div class="card-body">
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
              Easily reset test edits, re-simulate workflow cycles, or inspect Django-ready data structures.
            </p>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <button class="btn btn-outline" onclick="store.resetToDefault(); ui.showToast('Data reset to defaults!', 'info');">
                <i data-lucide="rotate-ccw"></i> Reset Local Demo State
              </button>
              <button class="btn btn-secondary" onclick="ui.showDemoRoleModal()">
                <i data-lucide="arrow-left-right"></i> Change Role or Subsidiary Scope
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // MODALS: Review, Correction Request, Data Entry, Demo Role Switcher
  // =========================================================================
  showReviewModal(subm, esg, brsr) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const env = esg.environment || {};
    const soc = esg.social || {};
    const isMain = auth.isMainAdmin();

    modalContent.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <h2 class="modal-title">
            <i data-lucide="file-check-2"></i> Review Submission: ${subm.id} (${subm.subsidiaryName})
          </h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info" style="margin-bottom:16px;">
            <div class="alert-content">
              <strong>Reporting Cycle: ${subm.year}</strong> | Current Status: <strong>${subm.status}</strong> | Submitted by: <strong>${subm.submittedBy || 'Subsidiary Admin'}</strong>
            </div>
          </div>

          ${subm.reviewerNotes ? `
            <div class="correction-card" style="margin-bottom:16px;">
              <div class="correction-badge-title"><i data-lucide="message-square"></i> Previous Reviewer Notes:</div>
              <div class="correction-comment">${subm.reviewerNotes}</div>
            </div>
          ` : ''}

          <!-- Side-by-side Environmental & Social Disclosures Preview -->
          <div class="grid-2-col">
            <div class="card">
              <div class="card-header"><h4 class="card-title"><i data-lucide="leaf"></i> Environmental Disclosures</h4></div>
              <div class="card-body" style="padding:0;">
                <table class="table">
                  <tbody>
                    <tr><td>Total Energy Consumption</td><td><strong>${(env.totalEnergyMWh || 0).toLocaleString()} MWh</strong></td></tr>
                    <tr><td>Renewable Energy Share</td><td><strong>${env.renewablePercent || 0}%</strong> (${(env.renewableEnergyMWh || 0).toLocaleString()} MWh)</td></tr>
                    <tr><td>Total GHG (Scope 1+2+3)</td><td><strong>${(env.totalGHG || 0).toLocaleString()} tCO2e</strong></td></tr>
                    <tr><td>Scope 1 Direct</td><td>${(env.ghgScope1 || 0).toLocaleString()} tCO2e</td></tr>
                    <tr><td>Scope 2 Electricity</td><td>${(env.ghgScope2 || 0).toLocaleString()} tCO2e</td></tr>
                    <tr><td>Water Recycled</td><td><strong>${(env.waterRecycledKL || 0).toLocaleString()} kL</strong></td></tr>
                    <tr><td>Waste Recycled / Reused</td><td><strong>${(env.wasteRecycledMT || 0).toLocaleString()} MT</strong></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><h4 class="card-title"><i data-lucide="users"></i> Social &amp; Safety Disclosures</h4></div>
              <div class="card-body" style="padding:0;">
                <table class="table">
                  <tbody>
                    <tr><td>Total Employees</td><td><strong>${(soc.totalEmployees || 0).toLocaleString()}</strong></td></tr>
                    <tr><td>Safety Training Hours</td><td><strong>${(soc.safetyTrainingManHours || 0).toLocaleString()} hrs</strong></td></tr>
                    <tr><td>Safety LTIFR</td><td><strong>${soc.ltifr || 0.08}</strong></td></tr>
                    <tr><td>Fatalities</td><td><strong>${soc.fatalities || 0}</strong></td></tr>
                    <tr><td>CSR Spend (INR)</td><td><strong>₹ ${(soc.csrSpendLakhs || 0).toLocaleString()} Lakhs</strong></td></tr>
                    <tr><td>Grievances Resolved</td><td><strong>${soc.grievancesResolved || 10} / ${soc.grievancesReceived || 10} (100%)</strong></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Close</button>
          ${isMain ? `
            <button class="btn btn-danger" onclick="ui.openRejectionModal('${subm.id}')">
              <i data-lucide="x-circle"></i> Reject Submission
            </button>
            <button class="btn btn-outline" style="color:#d97706; border-color:#f59e0b;" onclick="ui.openCorrectionModal('${subm.id}')">
              <i data-lucide="circle-alert"></i> Request Correction
            </button>
            <button class="btn btn-success" onclick="workflow.approveSubmission('${subm.id}')">
              <i data-lucide="check-circle-2"></i> Approve &amp; Consolidate Data
            </button>
          ` : `
            <button class="btn btn-brand-red" onclick="ui.openDataEntryModal()">
              <i data-lucide="edit-3"></i> Edit Form
            </button>
          `}
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  openRejectionModal(submissionId) {
    const subm = store.getSubmissionById(submissionId);
    if (!subm) return;

    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title" style="color:var(--color-danger, #ef4444);">
            <i data-lucide="x-circle"></i> Reject Submission: ${subm.subsidiaryName}
          </h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
            Specify the formal justification for rejecting this filing. The subsidiary will be notified immediately and their data will be excluded from MEIL Group consolidation.
          </p>
          <div class="form-group">
            <label class="form-label">Rejection Reason &amp; Audit Justification <span class="required">*</span></label>
            <textarea id="rejection-reason-input" class="form-control" rows="4" placeholder="E.g., Incomplete Scope 3 supply chain disclosures and non-compliant third-party audit verification for FY26."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
          <button class="btn btn-danger" onclick="workflow.rejectSubmission('${subm.id}', document.getElementById('rejection-reason-input').value)">
            <i data-lucide="x-circle"></i> Confirm Rejection
          </button>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  openCorrectionModal(submissionId) {
    const subm = store.getSubmissionById(submissionId);
    if (!subm) return;

    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title" style="color:var(--meil-red);">
            <i data-lucide="circle-alert"></i> Request Correction for ${subm.subsidiaryName}
          </h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
            Specify the exact disclosure fields or evidence documentation requiring correction by the Sub-Company Admin.
          </p>
          <div class="form-group">
            <label class="form-label">Required Correction &amp; Reviewer Remarks <span class="required">*</span></label>
            <textarea id="correction-remarks-input" class="form-control" placeholder="E.g., Scope 1 emission calculation discrepancy in Section C Principle 6 table. Attach third-party calibration certificate."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
          <button class="btn btn-danger" onclick="workflow.requestCorrection('${subm.id}', document.getElementById('correction-remarks-input').value)">
            <i data-lucide="send"></i> Dispatch Correction Request
          </button>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  openDataEntryModal(category = 'environment') {
    const subId = auth.getActiveSubsidiaryId();
    const sub = auth.getActiveSubsidiary();
    const esg = store.getESGData(subId, this.activeYearFilter) || {};
    const env = esg.environment || {};
    const soc = esg.social || {};

    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h2 class="modal-title">
            <i data-lucide="edit-3"></i> Sustainability Data Entry: ${sub?.shortName}
          </h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
            Reporting Year: <strong>${this.activeYearFilter}</strong> | Edits can be saved as <strong>Draft</strong> or forwarded to Main Admin.
          </p>

          <form id="esg-entry-form">
            <h4 style="font-size:14px; color:var(--text-brand); margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:6px;">
              <i data-lucide="leaf" style="color:var(--color-success)"></i> Environmental Disclosures
            </h4>
            <div class="form-grid" style="margin-bottom:20px;">
              <div class="form-group">
                <label class="form-label">Total Energy (MWh)</label>
                <input type="number" id="inp-total-energy" class="form-control" value="${env.totalEnergyMWh || 12000}">
              </div>
              <div class="form-group">
                <label class="form-label">Renewable Energy (MWh)</label>
                <input type="number" id="inp-ren-energy" class="form-control" value="${env.renewableEnergyMWh || 6000}">
              </div>
              <div class="form-group">
                <label class="form-label">Scope 1 GHG (tCO2e)</label>
                <input type="number" id="inp-ghg-s1" class="form-control" value="${env.ghgScope1 || 2400}">
              </div>
              <div class="form-group">
                <label class="form-label">Scope 2 GHG (tCO2e)</label>
                <input type="number" id="inp-ghg-s2" class="form-control" value="${env.ghgScope2 || 1200}">
              </div>
              <div class="form-group">
                <label class="form-label">Water Recycled (kL)</label>
                <input type="number" id="inp-water-recycled" class="form-control" value="${env.waterRecycledKL || 24000}">
              </div>
              <div class="form-group">
                <label class="form-label">Waste Recycled (MT)</label>
                <input type="number" id="inp-waste-recycled" class="form-control" value="${env.wasteRecycledMT || 550}">
              </div>
            </div>

            <h4 style="font-size:14px; color:var(--text-brand); margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:6px;">
              <i data-lucide="users" style="color:var(--meil-blue)"></i> Social &amp; Safety Disclosures
            </h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Total Employees</label>
                <input type="number" id="inp-total-emp" class="form-control" value="${soc.totalEmployees || 3200}">
              </div>
              <div class="form-group">
                <label class="form-label">Safety Training Hours</label>
                <input type="number" id="inp-safety-hours" class="form-control" value="${soc.safetyTrainingManHours || 65000}">
              </div>
              <div class="form-group">
                <label class="form-label">Workplace LTIFR</label>
                <input type="number" step="0.01" id="inp-ltifr" class="form-control" value="${soc.ltifr || 0.08}">
              </div>
              <div class="form-group">
                <label class="form-label">CSR Spend (INR Lakhs)</label>
                <input type="number" id="inp-csr" class="form-control" value="${soc.csrSpendLakhs || 220}">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
          <button class="btn btn-outline" onclick="ui.saveDataEntryForm(false)">
            <i data-lucide="save"></i> Save Draft
          </button>
          <button class="btn btn-brand-red" onclick="ui.saveDataEntryForm(true)">
            <i data-lucide="send"></i> Submit to Main Admin
          </button>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  saveDataEntryForm(submitImmediately = false) {
    const subId = auth.getActiveSubsidiaryId();
    const totEnergy = Number(document.getElementById('inp-total-energy')?.value) || 0;
    const renEnergy = Number(document.getElementById('inp-ren-energy')?.value) || 0;
    const s1 = Number(document.getElementById('inp-ghg-s1')?.value) || 0;
    const s2 = Number(document.getElementById('inp-ghg-s2')?.value) || 0;
    const waterRec = Number(document.getElementById('inp-water-recycled')?.value) || 0;
    const wasteRec = Number(document.getElementById('inp-waste-recycled')?.value) || 0;
    const totEmp = Number(document.getElementById('inp-total-emp')?.value) || 0;
    const safetyHrs = Number(document.getElementById('inp-safety-hours')?.value) || 0;
    const ltifr = Number(document.getElementById('inp-ltifr')?.value) || 0.08;
    const csr = Number(document.getElementById('inp-csr')?.value) || 0;

    const envData = {
      totalEnergyMWh: totEnergy,
      renewableEnergyMWh: renEnergy,
      nonRenewableEnergyMWh: Math.max(0, totEnergy - renEnergy),
      renewablePercent: totEnergy > 0 ? Math.round((renEnergy / totEnergy) * 100) : 0,
      ghgScope1: s1,
      ghgScope2: s2,
      totalGHG: s1 + s2 + 3000,
      waterRecycledKL: waterRec,
      wasteRecycledMT: wasteRec
    };

    const socData = {
      totalEmployees: totEmp,
      safetyTrainingManHours: safetyHrs,
      ltifr: ltifr,
      csrSpendLakhs: csr
    };

    store.updateESGData(subId, this.activeYearFilter, 'environment', envData);
    store.updateESGData(subId, this.activeYearFilter, 'social', socData);

    this.closeModals();

    if (submitImmediately) {
      workflow.submitData(subId, this.activeYearFilter);
    } else {
      workflow.saveDraft(subId, this.activeYearFilter, 'environment', envData);
    }
  }

  showDemoRoleModal() {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const subs = store.getSubsidiaries();

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title"><i data-lucide="arrow-left-right"></i> Fast Demo Role Switcher</h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Switch effortlessly between the two authorized roles to test approval, correction, and consolidation workflows:
          </p>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <button class="btn btn-brand-red btn-lg" onclick="auth.switchRole('main_admin'); ui.closeModals();">
              <i data-lucide="shield-check"></i> Switch to Main Company Admin (MEIL Central)
            </button>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-top:8px;">
              Or Switch to Sub-Company Admin:
            </div>
            ${subs.map(s => `
              <button class="btn btn-outline" style="justify-content:flex-start; text-align:left;" onclick="auth.switchRole('sub_admin', '${s.id}'); ui.closeModals();">
                <i data-lucide="building"></i>
                <span><strong>${s.shortName}</strong> (${s.leadAdminName})</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  closeModals() {
    const modalBackdrop = document.getElementById('modal-backdrop');
    if (modalBackdrop) modalBackdrop.classList.remove('open');
  }

  // =========================================================================
  // Toasts & Utility Badges
  // =========================================================================
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle-2' : (type === 'danger' ? 'alert-circle' : 'info')}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    this.refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  }

  getStatusBadge(status) {
    const norm = (status || 'draft').toLowerCase().replace(/\s+/g, '-');
    let icon = 'clock';
    let cls = 'badge-draft';

    if (norm.includes('approved')) {
      icon = 'check-circle-2';
      cls = 'badge-approved';
    } else if (norm.includes('rejected')) {
      icon = 'x-circle';
      cls = 'badge-rejected';
    } else if (norm.includes('correction')) {
      icon = 'circle-alert';
      cls = 'badge-correction-required';
    } else if (norm.includes('resubmitted')) {
      icon = 'refresh-cw';
      cls = 'badge-resubmitted';
    } else if (norm.includes('submitted')) {
      icon = 'send';
      cls = 'badge-submitted';
    } else if (norm.includes('review')) {
      icon = 'search';
      cls = 'badge-review';
    }

    return `<span class="badge ${cls}"><i data-lucide="${icon}"></i> ${status}</span>`;
  }

  setYearFilter(year) {
    this.activeYearFilter = year;
    this.renderCurrentView();
  }

  // =========================================================================
  // USER MANAGEMENT & RBAC MODALS
  // =========================================================================
  showAddUserModal() {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const subs = store.getSubsidiaries();

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title"><i data-lucide="user-plus"></i> Create User Account</h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <form id="form-create-user" onsubmit="event.preventDefault(); ui.createUser();">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input type="text" id="new-user-name" class="form-control" placeholder="E.g. Vikram Sharma" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Email Address <span class="required">*</span></label>
              <input type="email" id="new-user-email" class="form-control" placeholder="E.g. vikram@meil.in" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Job Title / Designation</label>
              <input type="text" id="new-user-title" class="form-control" placeholder="E.g. Lead ESG Analyst">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">System Role <span class="required">*</span></label>
              <select id="new-user-role" class="form-control" onchange="document.getElementById('user-sub-group').style.display = this.value === 'MAIN_ADMIN' ? 'none' : 'block'">
                <option value="SUB_ADMIN">Sub-Company Admin (Entity Scoped)</option>
                <option value="MAIN_ADMIN">Main Company Admin (MEIL Central Group)</option>
              </select>
            </div>
            <div class="form-group" id="user-sub-group" style="margin-bottom:12px;">
              <label class="form-label">Assigned Subsidiary Entity <span class="required">*</span></label>
              <select id="new-user-sub" class="form-control">
                ${subs.map(s => `<option value="${s.id}">${s.shortName} (${s.name})</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Initial Password</label>
              <input type="password" id="new-user-pwd" class="form-control" value="admin" placeholder="Default: admin">
            </div>
            <div class="modal-footer" style="padding:12px 0 0 0;">
              <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> Create Account</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  createUser() {
    const name = document.getElementById('new-user-name')?.value?.trim();
    const email = document.getElementById('new-user-email')?.value?.trim().toLowerCase();
    const title = document.getElementById('new-user-title')?.value?.trim();
    const role = document.getElementById('new-user-role')?.value;
    const subsidiaryId = role === 'MAIN_ADMIN' ? null : document.getElementById('new-user-sub')?.value;
    const password = document.getElementById('new-user-pwd')?.value || "admin";

    if (!name || !email) {
      this.showToast("Please enter user name and email", "warning");
      return;
    }

    store.addUser({ name, email, title, role, subsidiaryId, password });
    this.closeModals();
    this.showToast(`User account created for ${email}`, "success");
    this.renderCurrentView();
  }

  changeUserAccess(userId, newStatus) {
    store.updateUserAccess(userId, newStatus);
    this.showToast(`User account status updated to ${newStatus}`, "info");
    this.renderCurrentView();
  }

  handleResetPassword(userId, email) {
    if (confirm(`Reset password for ${email} back to factory default ('admin')?`)) {
      store.resetUserPassword(userId, "admin");
      this.showToast(`Password for ${email} reset to 'admin'.`, "success");
      this.renderCurrentView();
    }
  }

  // =========================================================================
  // OPERATIONAL FACILITIES MODALS
  // =========================================================================
  showAddFacilityModal(subsidiaryId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title"><i data-lucide="factory"></i> Add Operational Facility / Plant</h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <form id="form-create-facility" onsubmit="event.preventDefault(); ui.createFacility('${subsidiaryId}');">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Facility / Manufacturing Site Name <span class="required">*</span></label>
              <input type="text" id="fac-name" class="form-control" placeholder="E.g. Unit 3 Advanced Assembly Works" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Location (City, State) <span class="required">*</span></label>
              <input type="text" id="fac-location" class="form-control" placeholder="E.g. Hyderabad, Telangana" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Operating Capacity</label>
              <input type="text" id="fac-capacity" class="form-control" placeholder="E.g. 5,000 Units / Annum">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Environmental Clearance (EC) Number</label>
              <input type="text" id="fac-ec" class="form-control" placeholder="E.g. EC/MOEFCC/2023/8892">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">ISO / Safety Certifications</label>
              <input type="text" id="fac-iso" class="form-control" value="ISO 14001, ISO 45001" placeholder="E.g. ISO 14001, ISO 45001, ISO 50001">
            </div>
            <div class="modal-footer" style="padding:12px 0 0 0;">
              <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> Save Facility</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  createFacility(subsidiaryId) {
    const name = document.getElementById('fac-name')?.value?.trim();
    const location = document.getElementById('fac-location')?.value?.trim();
    const capacity = document.getElementById('fac-capacity')?.value?.trim();
    const ecNumber = document.getElementById('fac-ec')?.value?.trim();
    const iso = document.getElementById('fac-iso')?.value?.trim();

    if (!name || !location) {
      this.showToast("Please enter facility name and location", "warning");
      return;
    }

    store.addFacility(subsidiaryId, { name, location, capacity, ecNumber, iso });
    this.closeModals();
    this.showToast(`Facility "${name}" added successfully.`, "success");
    this.renderCurrentView();
  }

  handleDeleteFacility(subsidiaryId, index) {
    if (confirm("Delete this operational facility record?")) {
      store.deleteFacility(subsidiaryId, index);
      this.showToast("Facility record deleted.", "info");
      this.renderCurrentView();
    }
  }

  saveBusinessActivities(subsidiaryId) {
    const nicCode = document.getElementById('act-nic-code')?.value?.trim();
    const products = document.getElementById('act-products')?.value?.trim();
    const turnoverCr = Number(document.getElementById('act-turnover')?.value) || 0;
    const exportSharePct = Number(document.getElementById('act-export-share')?.value) || 0;
    const greenCapexCr = Number(document.getElementById('act-green-capex')?.value) || 0;
    const rdCleanTechPct = Number(document.getElementById('act-rd-pct')?.value) || 0;

    store.updateBusinessActivities(subsidiaryId, {
      nicCode,
      products,
      turnoverCr,
      exportSharePct,
      greenCapexCr,
      rdCleanTechPct
    });

    this.showToast("Business activities and financial disclosures saved.", "success");
  }

  // =========================================================================
  // SUBSIDIARY & PROJECT CREATION MODALS
  // =========================================================================
  showAddSubsidiaryModal() {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title"><i data-lucide="building"></i> Register New Subsidiary</h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <form id="form-create-subsidiary" onsubmit="event.preventDefault(); ui.createSubsidiary();">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Legal Name <span class="required">*</span></label>
              <input type="text" id="sub-new-name" class="form-control" placeholder="E.g. MEIL Solar Power Private Limited" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Short Name <span class="required">*</span></label>
              <input type="text" id="sub-new-short" class="form-control" placeholder="E.g. MEIL Solar" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Corporate Identification Number (CIN) <span class="required">*</span></label>
              <input type="text" id="sub-new-cin" class="form-control" placeholder="E.g. U40106TG2018PTC123456" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Business Vertical / Type</label>
              <input type="text" id="sub-new-type" class="form-control" placeholder="E.g. Renewable Energy">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Headquarters Location</label>
              <input type="text" id="sub-new-hq" class="form-control" value="Hyderabad, Telangana">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Lead Sustainability Officer Name</label>
              <input type="text" id="sub-new-admin-name" class="form-control" placeholder="E.g. R. K. Varma">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Lead Admin Email <span class="required">*</span></label>
              <input type="email" id="sub-new-admin-email" class="form-control" placeholder="E.g. solar@meil.in" required>
            </div>
            <div class="modal-footer" style="padding:12px 0 0 0;">
              <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> Register Subsidiary</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  createSubsidiary() {
    const name = document.getElementById('sub-new-name')?.value?.trim();
    const shortName = document.getElementById('sub-new-short')?.value?.trim();
    const cin = document.getElementById('sub-new-cin')?.value?.trim();
    const businessType = document.getElementById('sub-new-type')?.value?.trim();
    const headquarters = document.getElementById('sub-new-hq')?.value?.trim();
    const leadAdminName = document.getElementById('sub-new-admin-name')?.value?.trim();
    const leadAdminEmail = document.getElementById('sub-new-admin-email')?.value?.trim().toLowerCase();

    if (!name || !cin || !leadAdminEmail) {
      this.showToast("Please enter entity name, CIN, and admin email", "warning");
      return;
    }

    const newSub = store.addSubsidiary({
      name, shortName, cin, businessType, headquarters, leadAdminName, leadAdminEmail
    });

    // Also register user account for the admin
    store.addUser({
      name: leadAdminName || "Subsidiary Admin",
      email: leadAdminEmail,
      title: "Subsidiary ESG Filing Officer",
      role: "SUB_ADMIN",
      subsidiaryId: newSub.id,
      password: "admin"
    });

    this.closeModals();
    this.showToast(`Subsidiary ${newSub.name} added successfully.`, "success");
    this.renderCurrentView();
  }

  showAddProjectModal(subsidiaryId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const bus = store.getBusinessUnits(subsidiaryId);

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title"><i data-lucide="folder-kanban"></i> Add Operational Project Node</h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <form id="form-create-project" onsubmit="event.preventDefault(); ui.createProject('${subsidiaryId}');">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Project Code <span class="required">*</span></label>
              <input type="text" id="proj-code" class="form-control" placeholder="E.g. PRJ-OLC-05" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Project Name <span class="required">*</span></label>
              <input type="text" id="proj-name" class="form-control" placeholder="E.g. Pune Metropolitan EV Bus Infrastructure" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Site Location <span class="required">*</span></label>
              <input type="text" id="proj-location" class="form-control" placeholder="E.g. Pune, Maharashtra" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Assigned Business Unit</label>
              <select id="proj-bu" class="form-control">
                ${bus.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div class="modal-footer" style="padding:12px 0 0 0;">
              <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> Save Project</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  createProject(subsidiaryId) {
    const code = document.getElementById('proj-code')?.value?.trim();
    const name = document.getElementById('proj-name')?.value?.trim();
    const location = document.getElementById('proj-location')?.value?.trim();
    const businessUnitId = document.getElementById('proj-bu')?.value;

    if (!code || !name || !location) {
      this.showToast("Please enter project code, name, and location", "warning");
      return;
    }

    store.addProject({
      subsidiaryId,
      code,
      name,
      location,
      businessUnitId,
      esgCompletion: 80,
      brsrCompletion: 75
    });

    this.closeModals();
    this.showToast(`Project "${name}" added successfully.`, "success");
    this.renderCurrentView();
  }
}

// Global Singleton UI Instance
const ui = new UIManager();
