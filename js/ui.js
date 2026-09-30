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
    this.activeProjectScopeFilter = 'all';
    this.activeProjectStatusFilter = 'all';
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

  handleSearchFilter() {
    // Generic search filter for tables
    const val = this.searchQuery.toLowerCase().trim();
    const tables = document.querySelectorAll('table tbody tr[data-search]');
    tables.forEach(row => {
      const text = row.getAttribute('data-search') || '';
      row.style.display = !val || text.includes(val) ? '' : 'none';
    });
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
      // MAIN COMPANY ADMIN MODULES
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
        <a class="nav-item ${this.currentView === 'business_units' ? 'active' : ''}" onclick="ui.navigateTo('business_units')">
          <i data-lucide="network"></i>
          <span>BU ESG Monitoring</span>
        </a>
        <a class="nav-item ${this.currentView === 'projects' ? 'active' : ''}" onclick="ui.navigateTo('projects')">
          <i data-lucide="hard-hat"></i>
          <span>Project ESG Monitoring</span>
        </a>
        <a class="nav-item ${this.currentView === 'sustainability' ? 'active' : ''}" onclick="ui.navigateTo('sustainability')">
          <i data-lucide="leaf"></i>
          <span>ESG Overview</span>
        </a>
        <a class="nav-item ${this.currentView === 'brsr' ? 'active' : ''}" onclick="ui.navigateTo('brsr')">
          <i data-lucide="file-text"></i>
          <span>ESG Mapping</span>
        </a>
        <a class="nav-item ${this.currentView === 'sdg' ? 'active' : ''}" onclick="ui.navigateTo('sdg')">
          <i data-lucide="globe-2"></i>
          <span>SDG Alignment</span>
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
      // SUB-COMPANY ADMIN MODULES
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
        <a class="nav-item ${this.currentView === 'business_units' ? 'active' : ''}" onclick="ui.navigateTo('business_units')">
          <i data-lucide="network"></i>
          <span>My BU ESG</span>
        </a>
        <a class="nav-item ${this.currentView === 'projects' ? 'active' : ''}" onclick="ui.navigateTo('projects')">
          <i data-lucide="hard-hat"></i>
          <span>My Project ESG</span>
        </a>

        <div class="nav-section-title">Data Reporting</div>
        <a class="nav-item ${this.currentView === 'sustainability' ? 'active' : ''}" onclick="ui.navigateTo('sustainability')">
          <i data-lucide="leaf"></i>
          <span>My ESG Data</span>
        </a>
        <a class="nav-item ${this.currentView === 'brsr' ? 'active' : ''}" onclick="ui.navigateTo('brsr')">
          <i data-lucide="file-text"></i>
          <span>Applicable ESG-BRSR</span>
        </a>
        <a class="nav-item ${this.currentView === 'sdg' ? 'active' : ''}" onclick="ui.navigateTo('sdg')">
          <i data-lucide="globe-2"></i>
          <span>My SDG Contributions</span>
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
      const allowedViews = ['dashboard', 'profile', 'activities', 'business_units', 'projects', 'sustainability', 'brsr', 'sdg', 'submissions', 'reports', 'notifications', 'settings'];
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
      business_units: 'Business Unit ESG Center',
      projects: 'Project ESG Data Center',
      profile: 'Company Profile',
      activities: 'Business Activities',
      sustainability: 'Sustainability (ESG)',
      brsr: 'BRSR Disclosures',
      sdg: 'UN SDG Alignment & Mapping',
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

      case 'business_units':
        viewport.innerHTML = this.getTemplateBusinessUnits();
        this.postRenderBusinessUnits();
        break;

      case 'projects':
        viewport.innerHTML = this.getTemplateProjects();
        this.postRenderProjects();
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

      case 'sdg':
        viewport.innerHTML = this.getTemplateSDG();
        this.postRenderSDG();
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
      <!-- Bottom-Up Hierarchical Rollup Drill-Down Section (Module 6 & 8) -->
      <div class="card" style="margin-top:24px;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title"><i data-lucide="git-merge" style="color:var(--meil-navy)"></i> Bottom-Up Hierarchical ESG Consolidation Tree</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">
              MEIL Group &rarr; Subsidiary &rarr; Business Unit &rarr; Project Level. Strict Bottom-Up Rule: Only approved entities roll into consolidated metrics.
            </p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm btn-outline" onclick="ui.expandAllDrilldown()"><i data-lucide="chevrons-down"></i> Expand All</button>
            <button class="btn btn-sm btn-outline" onclick="ui.collapseAllDrilldown()"><i data-lucide="chevrons-up"></i> Collapse All</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table" id="drilldown-table">
              <thead>
                <tr>
                  <th>Organizational Entity</th>
                  <th>Level</th>
                  <th>Electricity (MWh)</th>
                  <th>Scope 1 (tCO2e)</th>
                  <th>Scope 2 (tCO2e)</th>
                  <th>Water (kL)</th>
                  <th>Employees</th>
                  <th>Status</th>
                  <th>Consolidation</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderDrilldownRows()}
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
            ${isMain ? 'ESG Overview' : 'My ESG Data'}
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
            ${isMain ? 'ESG-BRSR-SDG Mapping Management' : 'Applicable ESG-BRSR-SDG Mapping'}
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
    const sdgList = store.getSDGContributions();
    const pendingSDG = sdgList.filter(c => c.workflowStatus === 'Submitted');

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="check-circle-2" style="color:var(--meil-navy)"></i>
            Central Submissions &amp; Approval Center
          </h1>
          <p class="page-subtitle">Review, verify, request corrections, or approve subsidiary ESG/BRSR and UN SDG contribution filings</p>
        </div>
      </div>

      <!-- Filter Bar -->
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

      <!-- Tabbed Submissions Table (ESG/BRSR Reports vs SDG Contribution Filings) -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3 class="card-title"><i data-lucide="layers"></i> Integrated Subsidiary Filings</h3>
          <span class="badge badge-approved">${subs.length} Active Annual Filings</span>
        </div>
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

      <!-- SDG Contribution Initiatives Pending Review -->
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title"><i data-lucide="globe-2"></i> Sub-Company SDG Contribution Filings</h3>
            <span style="font-size:12px; color:var(--text-muted);">Granular project &amp; operational initiatives submitted for UN SDG alignment</span>
          </div>
          <span class="badge ${pendingSDG.length > 0 ? 'badge-submitted' : 'badge-approved'}">${pendingSDG.length} Pending Approval</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>SDG</th>
                  <th>Initiative</th>
                  <th>Subsidiary &amp; Project</th>
                  <th>Current / Target</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${sdgList.map(item => `
                  <tr>
                    <td><strong>${item.id}</strong></td>
                    <td>
                      <span class="badge" style="background:${store.getSDGById(item.sdgNumber)?.color || '#333'}; color:#fff; font-weight:700;">
                        SDG ${item.sdgNumber}
                      </span>
                    </td>
                    <td>
                      <strong>${item.initiativeName}</strong>
                      <div style="font-size:11px; color:var(--text-muted);">${item.brsrIndicator}</div>
                    </td>
                    <td>
                      <div><strong>${item.subsidiaryName}</strong></div>
                      <div style="font-size:11px; color:var(--text-muted);">${item.projectName}</div>
                    </td>
                    <td style="font-size:12px;">
                      ${(Number(item.currentValue)||0).toLocaleString()} / ${(Number(item.targetValue)||0).toLocaleString()} ${item.unit}
                    </td>
                    <td>
                      <div style="font-size:11px; font-weight:700; color:#059669;">${item.progress}%</div>
                      <div style="font-size:10px; color:var(--text-muted);">${item.performanceStatus}</div>
                    </td>
                    <td>
                      <span class="badge ${item.workflowStatus === 'Approved' ? 'badge-approved' : (item.workflowStatus === 'Submitted' ? 'badge-submitted' : (item.workflowStatus === 'Correction Required' ? 'badge-correction-required' : (item.workflowStatus === 'Rejected' ? 'badge-rejected' : 'badge-draft')))}">
                        ${item.workflowStatus === 'Submitted' ? 'Under Review' : item.workflowStatus}
                      </span>
                    </td>
                    <td>
                      <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="ui.showSDGInitiativeDetailModal('${item.id}')" title="Inspect Details">
                          <i data-lucide="eye"></i>
                        </button>
                        ${item.workflowStatus === 'Submitted' ? `
                          <button class="btn btn-sm btn-brand-red" onclick="ui.showMainAdminSDGReviewModal('${item.id}')" title="Review & Approve/Reject">
                            <i data-lucide="file-check-2"></i> Review
                          </button>
                        ` : ''}
                      </div>
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
    const projs = store.getProjects();
    const approvedCount = projs.filter(p => p.submissionStatus === 'Approved').length;
    const totalGHG = (cons.ghgScope1 + cons.ghgScope2 + cons.ghgScope3) || 0;
    const renewablePct = cons.totalEnergyMWh > 0 ? Math.round((cons.renewableEnergyMWh / cons.totalEnergyMWh) * 100) : 0;
    const wasteRecyclePct = cons.wasteGeneratedMT > 0 ? Math.round((cons.wasteRecycledMT / cons.wasteGeneratedMT) * 100) : 0;

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="bar-chart-3" style="color:var(--meil-navy)"></i>
            MEIL Group Sustainability Analytics &amp; Benchmarks
          </h1>
          <p class="page-subtitle">Comparative subsidiary intelligence, multi-year performance trends, emissions intensity ratios, and environmental stewardship KPIs</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="reportEngine.exportReportToExcel('Consolidated ESG Report', '${this.activeYearFilter}', 'all')">
            <i data-lucide="file-spreadsheet"></i> Export Analytics (.xls)
          </button>
        </div>
      </div>

      <!-- 6-Card Real-Time KPI Banner -->
      <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:14px; margin-bottom:24px;">
        <div class="kpi-card" style="padding:14px; border-top:3px solid var(--meil-navy);">
          <div class="kpi-header"><span class="kpi-title" style="font-size:11px;">Total GHG Emissions</span><div class="kpi-icon-wrap" style="background:rgba(11,37,69,0.1);"><i data-lucide="cloud" style="width:16px;height:16px;color:var(--meil-navy);"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:22px;">${(totalGHG/1000).toFixed(1)}K</span><span class="kpi-unit">tCO2e</span></div>
          <div class="kpi-meta"><span class="kpi-trend positive"><i data-lucide="arrow-down"></i> -8% YoY</span></div>
        </div>
        <div class="kpi-card accent-green" style="padding:14px;">
          <div class="kpi-header"><span class="kpi-title" style="font-size:11px;">Renewable Energy Share</span><div class="kpi-icon-wrap green"><i data-lucide="sun" style="width:16px;height:16px;"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:22px;">${renewablePct}%</span><span class="kpi-unit">of total</span></div>
          <div class="kpi-meta"><span class="badge badge-approved" style="font-size:10px;">Exceeds 40% Target</span></div>
        </div>
        <div class="kpi-card accent-blue" style="padding:14px;">
          <div class="kpi-header"><span class="kpi-title" style="font-size:11px;">Water Recycling Rate</span><div class="kpi-icon-wrap blue"><i data-lucide="droplets" style="width:16px;height:16px;"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:22px;">${cons.waterRecycledPercent}%</span><span class="kpi-unit">recycled</span></div>
          <div class="kpi-meta"><span class="badge badge-approved" style="font-size:10px;">ZLD Policy</span></div>
        </div>
        <div class="kpi-card accent-amber" style="padding:14px;">
          <div class="kpi-header"><span class="kpi-title" style="font-size:11px;">Waste Diversion Rate</span><div class="kpi-icon-wrap amber"><i data-lucide="recycle" style="width:16px;height:16px;"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:22px;">${wasteRecyclePct}%</span><span class="kpi-unit">diverted</span></div>
          <div class="kpi-meta"><span>${(cons.wasteRecycledMT/1000).toFixed(1)}K MT recycled</span></div>
        </div>
        <div class="kpi-card accent-purple" style="padding:14px;">
          <div class="kpi-header"><span class="kpi-title" style="font-size:11px;">Safety LTIFR</span><div class="kpi-icon-wrap"><i data-lucide="shield-check" style="width:16px;height:16px;"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:22px;">${cons.ltifrAverage}</span><span class="kpi-unit">rate</span></div>
          <div class="kpi-meta"><span class="badge badge-approved" style="font-size:10px;">World Class &lt;0.50</span></div>
        </div>
        <div class="kpi-card accent-green" style="padding:14px;">
          <div class="kpi-header"><span class="kpi-title" style="font-size:11px;">Projects Consolidated</span><div class="kpi-icon-wrap green"><i data-lucide="layers" style="width:16px;height:16px;"></i></div></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:22px;">${approvedCount}</span><span class="kpi-unit">of ${projs.length}</span></div>
          <div class="kpi-meta"><span>Approved &amp; rolled up</span></div>
        </div>
      </div>

      <!-- Row 1: Historical Trend + Subsidiary Comparison -->
      <div class="grid-2-col" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="trending-up"></i> Multi-Year ESG Performance Trajectory</h3><span class="badge badge-approved">FY22 - FY26</span></div>
          <div class="card-body" style="height:300px;"><canvas id="chart-ana-trend"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="award"></i> Subsidiary ESG Score Benchmarking</h3><span class="badge badge-approved">Leaderboard</span></div>
          <div class="card-body" style="height:300px;"><canvas id="chart-ana-subs"></canvas></div>
        </div>
      </div>

      <!-- Row 2: Water + Waste -->
      <div class="grid-2-col" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="droplets" style="color:var(--color-info)"></i> Water Withdrawal &amp; Consumption</h3><span class="badge badge-submitted">Per Subsidiary</span></div>
          <div class="card-body" style="height:280px;"><canvas id="chart-ana-water"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="recycle" style="color:var(--color-warning)"></i> Waste Generated vs. Recycled / Diverted</h3><span class="badge badge-submitted">Circular Economy</span></div>
          <div class="card-body" style="height:280px;"><canvas id="chart-ana-waste"></canvas></div>
        </div>
      </div>

      <!-- Row 3: Submission Timeline + Project Progress -->
      <div class="grid-2-col">
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="calendar-check"></i> Submission &amp; Approval Timeline</h3><span class="badge badge-approved">${this.activeYearFilter}</span></div>
          <div class="card-body" style="height:280px;"><canvas id="chart-ana-timeline"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="hard-hat" style="color:var(--color-success)"></i> Project ESG Completion Distribution</h3><span class="badge badge-approved">${projs.length} Project Nodes</span></div>
          <div class="card-body" style="height:280px;"><canvas id="chart-ana-projects"></canvas></div>
        </div>
      </div>
    `;
  }

  postRenderAnalytics() {
    const cons = store.calculateConsolidatedData(this.activeYearFilter);
    chartEngine.renderHistoricalTrendChart('chart-ana-trend');
    chartEngine.renderSubsidiaryComparisonChart('chart-ana-subs', this.activeYearFilter);
    chartEngine.renderWaterChart('chart-ana-water', {
      waterWithdrawalKL: cons.waterWithdrawalKL,
      waterConsumptionKL: cons.waterConsumptionKL,
      waterRecycledKL: cons.waterRecycledKL
    });
    chartEngine.renderWasteChart('chart-ana-waste', {
      wasteGeneratedMT: cons.wasteGeneratedMT,
      wasteRecycledMT: cons.wasteRecycledMT,
      wasteDisposalMT: cons.wasteDisposalMT
    });
    chartEngine.renderSubmissionTimelineChart('chart-ana-timeline', 'Approved');
    chartEngine.renderProjectProgressChart('chart-ana-projects', null);
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
            ${isMain ? `
              <option value="Consolidated BRSR Report">Comprehensive SEBI BRSR Report (Consolidated)</option>
              <option value="Consolidated ESG Report">Executive ESG Integrated Summary</option>
              <option value="UN SDG Alignment Report">UN SDG Alignment &amp; Progress Report</option>
              <option value="ESG-BRSR-SDG Cross-Framework Mapping Report">ESG ↔ BRSR ↔ SDG Cross-Framework Mapping</option>
              <option value="Business Unit ESG Performance Report">Business Unit ESG Performance Rollup</option>
              <option value="Project ESG &amp; Consolidation Audit Report">Project ESG &amp; Consolidation Audit Report</option>
              <option value="Environmental Deep-Dive">Environmental &amp; Carbon Accounting Report</option>
              <option value="Social &amp; Workplace Safety">Workplace Safety &amp; Social Report</option>
            ` : `
              <option value="My Subsidiary ESG Report">My Subsidiary ESG Report</option>
              <option value="My BRSR Report">My BRSR Report</option>
              <option value="My SDG Contribution Report">My SDG Contribution Report</option>
              <option value="My Business Unit Report">My Business Unit Report</option>
              <option value="My Project ESG Report">My Project ESG Report</option>
              <option value="Submission Summary">Submission Summary</option>
            `}
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
    const isMain = auth.isMainAdmin();
    const users = store.getUsers();
    const subs = store.getSubsidiaries();
    const logs = store.getAuditLogs().slice(0, 20);
    const subAdmins = users.filter(u => u.role === 'SUB_ADMIN' || u.role === 'sub_admin');
    const mainAdmins = users.filter(u => u.role === 'MAIN_ADMIN' || u.role === 'main_admin');

    const buildSubRows = () => subAdmins.map(u => {
      const sub = subs.find(s => s.id === u.subsidiaryId) || {};
      const isActive = u.status === 'ACTIVE' || u.accessStatus === 'Active';
      const isSusp = u.status === 'SUSPENDED' || u.accessStatus === 'Suspended';
      const statusLabel = isActive ? 'Active' : (isSusp ? 'Suspended' : 'Inactive');
      const badgeCls = isActive ? 'badge-approved' : (isSusp ? 'badge-correction' : 'badge-rejected');
      const initials = (u.name||'U').split(' ').map(n=>n[0]).slice(0,2).join('');
      const uid = u.id;
      const name = u.name;
      const actionBtn = isActive
        ? `<button class="btn btn-sm btn-outline" style="color:#d97706;border-color:#f59e0b;" onclick="store.updateUserAccess('${uid}','Suspended');ui.showToast('Access suspended','warning');ui.renderCurrentView();"><i data-lucide="pause-circle"></i> Suspend</button>`
        : `<button class="btn btn-sm btn-outline" style="color:#059669;border-color:#059669;" onclick="store.updateUserAccess('${uid}','Active');ui.showToast('Access granted','success');ui.renderCurrentView();"><i data-lucide="check-circle-2"></i> Grant</button>`;
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="user-avatar" style="width:32px;height:32px;font-size:11px;flex-shrink:0;">${initials}</div><div><div style="font-weight:600;font-size:13px;">${name}</div><div style="font-size:11px;color:var(--text-muted);">${u.title||'Sub Admin'}</div></div></div></td>
        <td><strong style="font-size:12px;">${sub.shortName||'Unassigned'}</strong><div style="font-size:11px;color:var(--text-muted);">${sub.headquarters||''}</div></td>
        <td style="font-size:12px;">${u.email}</td>
        <td style="font-size:12px;color:var(--text-muted);">${u.lastLogin||'Never'}</td>
        <td><span class="badge ${badgeCls}">${statusLabel}</span></td>
        <td><div class="table-actions">${actionBtn}<button class="btn btn-sm btn-outline" onclick="if(confirm('Reset password?')){store.resetUserPassword('${uid}');ui.showToast('Password reset done','info');}"><i data-lucide="key"></i> Reset Pwd</button></div></td>
      </tr>`;
    }).join('');

    const buildMainRows = () => mainAdmins.map(u => {
      const initials = (u.name||'U').split(' ').map(n=>n[0]).slice(0,2).join('');
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="user-avatar" style="width:32px;height:32px;font-size:11px;flex-shrink:0;background:var(--meil-navy);">${initials}</div><strong style="font-size:13px;">${u.name}</strong></div></td>
        <td style="font-size:12px;">${u.email}</td>
        <td style="font-size:12px;">${u.title||'Group Admin'}</td>
        <td style="font-size:12px;color:var(--text-muted);">${u.lastLogin||'Never'}</td>
        <td><span class="badge badge-approved">Main Admin</span></td>
      </tr>`;
    }).join('');

    const buildLogRows = () => logs.length === 0
      ? '<tr><td colspan="4" class="table-empty">No audit logs yet.</td></tr>'
      : logs.map(l => `<tr><td style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${l.timestamp}</td><td style="font-size:12px;font-weight:600;">${l.user}</td><td><span class="badge badge-draft" style="font-size:10px;">${l.action}</span></td><td style="font-size:12px;color:var(--text-secondary);">${l.details}</td></tr>`).join('');

    const subInfoSection = () => {
      const sub = store.getSubsidiaryById(auth.getActiveSubsidiaryId());
      if (!sub) return '';
      const subm = store.getSubmissions(store.state.mainCompany.activeReportingYear || 'FY 2025-26', sub.id)[0];
      const sc = subm ? (subm.status==='Approved'?'badge-approved':subm.status==='Correction Required'?'badge-correction':'badge-submitted') : 'badge-draft';
      const sl = subm ? subm.status : 'Draft â€“ Not Yet Submitted';
      return `<div class="card" style="margin-top:24px;">
        <div class="card-header"><h3 class="card-title"><i data-lucide="building"></i> Assigned Subsidiary Details</h3></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Subsidiary Name</label><input type="text" class="form-control" value="${sub.name}" disabled></div>
            <div class="form-group"><label class="form-label">CIN</label><input type="text" class="form-control" value="${sub.cin||''}" disabled></div>
            <div class="form-group"><label class="form-label">Headquarters</label><input type="text" class="form-control" value="${sub.headquarters||''}" disabled></div>
            <div class="form-group"><label class="form-label">Business Type</label><input type="text" class="form-control" value="${sub.businessType||''}" disabled></div>
            <div class="form-group full-width"><label class="form-label">Submission Status</label>
              <span class="badge ${sc}" style="font-size:13px;padding:6px 12px;">${sl}</span>
            </div>
          </div>
        </div>
      </div>`;
    };

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title"><i data-lucide="settings" style="color:var(--meil-navy)"></i> System &amp; Profile Settings</h1>
          <p class="page-subtitle">User profile, access control, audit logs, and system configuration</p>
        </div>
      </div>

      <div class="grid-2-col" style="margin-bottom:24px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="user"></i> Active Session Information</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group"><label class="form-label">User ID</label><input type="text" class="form-control" value="${user.userId || 'N/A'}" disabled></div>
              <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-control" value="${user.name}" disabled></div>
              <div class="form-group"><label class="form-label">Designation</label><input type="text" class="form-control" value="${user.title || 'N/A'}" disabled></div>
              <div class="form-group"><label class="form-label">Email Address</label><input type="text" class="form-control" value="${user.email}" disabled></div>
              <div class="form-group full-width"><label class="form-label">Assigned Role</label>
                <span class="badge badge-approved" style="font-size:13px;padding:6px 12px;">${auth.getRoleLabel()}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i data-lucide="sliders"></i> System Controls</h3></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Reset test state, switch role context, or sign out.</p>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <button class="btn btn-outline" onclick="store.resetToDefault();ui.showToast('Data reset to defaults!','info');ui.renderCurrentView();">
                <i data-lucide="rotate-ccw"></i> Reset Local Demo State
              </button>
              <button class="btn btn-secondary" onclick="ui.showDemoRoleModal()">
                <i data-lucide="arrow-left-right"></i> Change Role or Subsidiary Scope
              </button>
              <button class="btn btn-outline" style="color:var(--color-danger);border-color:var(--color-danger);" onclick="auth.logout()">
                <i data-lucide="log-out"></i> Sign Out of Session
              </button>
            </div>
          </div>
        </div>
      </div>

      ${isMain ? `
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="shield-check"></i> User Access Management &amp; RBAC</h3>
            <button class="btn btn-brand-red btn-sm" onclick="ui.showAddUserModal()"><i data-lucide="user-plus"></i> Add User Account</button>
          </div>
          <div class="card-body" style="padding:0;">
            <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid var(--border-light);">
              <strong style="font-size:12px;color:var(--meil-navy);">Sub-Company Administrators (${subAdmins.length})</strong>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Name &amp; Title</th><th>Assigned Subsidiary</th><th>Email</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${buildSubRows() || '<tr><td colspan="6" class="table-empty">No sub-company accounts found.</td></tr>'}</tbody>
              </table>
            </div>
            <div style="padding:10px 16px;background:#eef2ff;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);margin-top:8px;">
              <strong style="font-size:12px;color:var(--meil-navy);">Main Company Administrators (${mainAdmins.length})</strong>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Name</th><th>Email</th><th>Designation</th><th>Last Login</th><th>Role</th></tr></thead>
                <tbody>${buildMainRows()}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="scroll-text"></i> System Audit Log</h3>
            <span class="badge badge-submitted">Last 20 Entries</span>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
                <tbody>${buildLogRows()}</tbody>
              </table>
            </div>
          </div>
        </div>
      ` : subInfoSection()}
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

  getConsolidationBadge(isConsolidated) {
    if (isConsolidated) {
      return `<span class="badge badge-consolidated"><i data-lucide="check-check"></i> Included in Consolidation</span>`;
    }
    return `<span class="badge badge-not-consolidated"><i data-lucide="shield-alert"></i> Not Included</span>`;
  }

  getLocationBadge(project) {
    if (project && project.isInternational) {
      return `<span class="badge badge-international"><i data-lucide="globe"></i> ${project.country || 'International'} (${project.city || 'Overseas'})</span>`;
    }
    return `<span class="badge" style="background:rgba(59,130,246,0.1); color:#2563eb; border:1px solid rgba(59,130,246,0.25);"><i data-lucide="map-pin"></i> India (${project?.state || 'IN'})</span>`;
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

  // =========================================================================
  // BOTTOM-UP HIERARCHICAL ROLLUP DRILL-DOWN (MEIL -> Sub -> BU -> Project)
  // =========================================================================
  renderDrilldownRows() {
    const rollup = store.calculateHierarchicalRollup(this.activeYearFilter);
    let html = '';

    // Level 0: Group Root
    const group = rollup.group;
    html += `
      <tr class="tree-row-group" id="row-group" onclick="ui.toggleDrilldown('row-group')">
        <td>
          <div class="tree-cell">
            <span class="tree-toggle" id="toggle-row-group"><i data-lucide="chevron-down"></i></span>
            <span class="tree-icon" style="color:var(--meil-red);"><i data-lucide="shield-check"></i></span>
            <strong>${group.name}</strong>
          </div>
        </td>
        <td><span class="badge" style="background:#e0e7ff; color:#3730a3; font-weight:700;">Group Parent</span></td>
        <td><strong>${(group.electricityMWh || 0).toLocaleString()}</strong></td>
        <td><strong>${(group.scope1 || 0).toLocaleString()}</strong></td>
        <td><strong>${(group.scope2 || 0).toLocaleString()}</strong></td>
        <td><strong>${(group.waterKL || 0).toLocaleString()}</strong></td>
        <td><strong>${(group.employees || 0).toLocaleString()}</strong></td>
        <td>${this.getStatusBadge(group.status)}</td>
        <td>${this.getConsolidationBadge(group.isConsolidated)}</td>
      </tr>
    `;

    // Level 1: Subsidiaries
    (group.subsidiaries || []).forEach(sub => {
      const subRowId = `row-sub-${sub.id}`;
      html += `
        <tr class="tree-row-sub" id="${subRowId}" data-parent="row-group" onclick="ui.toggleDrilldown('${subRowId}')">
          <td>
            <div class="tree-cell" style="padding-left: 20px;">
              <span class="tree-toggle" id="toggle-${subRowId}"><i data-lucide="chevron-down"></i></span>
              <span class="tree-icon" style="color:var(--meil-navy);"><i data-lucide="building-2"></i></span>
              <strong>${sub.name}</strong> (${sub.shortName})
            </div>
          </td>
          <td><span class="badge" style="background:#dbeafe; color:#1e40af;">Subsidiary</span></td>
          <td>${(sub.electricityMWh || 0).toLocaleString()}</td>
          <td>${(sub.scope1 || 0).toLocaleString()}</td>
          <td>${(sub.scope2 || 0).toLocaleString()}</td>
          <td>${(sub.waterKL || 0).toLocaleString()}</td>
          <td>${(sub.employees || 0).toLocaleString()}</td>
          <td>${this.getStatusBadge(sub.status)}</td>
          <td>${this.getConsolidationBadge(sub.isConsolidated)}</td>
        </tr>
      `;

      // Level 2: Business Units
      (sub.businessUnits || []).forEach(bu => {
        const buRowId = `row-bu-${bu.id}`;
        html += `
          <tr class="tree-row-bu" id="${buRowId}" data-parent="${subRowId}" onclick="ui.toggleDrilldown('${buRowId}')">
            <td>
              <div class="tree-cell" style="padding-left: 42px;">
                <span class="tree-toggle" id="toggle-${buRowId}"><i data-lucide="chevron-down"></i></span>
                <span class="tree-icon" style="color:#0284c7;"><i data-lucide="network"></i></span>
                <span>${bu.name}</span>
              </div>
            </td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">Business Unit</span></td>
            <td>${(bu.electricityMWh || 0).toLocaleString()}</td>
            <td>${(bu.scope1 || 0).toLocaleString()}</td>
            <td>${(bu.scope2 || 0).toLocaleString()}</td>
            <td>${(bu.waterKL || 0).toLocaleString()}</td>
            <td>${(bu.employees || 0).toLocaleString()}</td>
            <td>${this.getStatusBadge(bu.status)}</td>
            <td>${this.getConsolidationBadge(bu.isConsolidated)}</td>
          </tr>
        `;

        // Level 3: Projects
        (bu.projects || []).forEach(proj => {
          const projRowId = `row-proj-${proj.id}`;
          html += `
            <tr class="tree-row-proj" id="${projRowId}" data-parent="${buRowId}">
              <td>
                <div class="tree-cell" style="padding-left: 64px;">
                  <span class="tree-icon" style="color:#059669;"><i data-lucide="hard-hat"></i></span>
                  <span><strong>${proj.code}</strong> - ${proj.name}</span>
                  ${this.getLocationBadge(proj)}
                </div>
              </td>
              <td><span class="badge" style="background:#ecfdf5; color:#047857;">Project</span></td>
              <td>${(proj.electricityMWh || 0).toLocaleString()}</td>
              <td>${(proj.scope1 || 0).toLocaleString()}</td>
              <td>${(proj.scope2 || 0).toLocaleString()}</td>
              <td>${(proj.waterKL || 0).toLocaleString()}</td>
              <td>${(proj.employees || 0).toLocaleString()}</td>
              <td>${this.getStatusBadge(proj.status)}</td>
              <td>${this.getConsolidationBadge(proj.isConsolidated)}</td>
            </tr>
          `;
        });
      });
    });

    return html;
  }

  toggleDrilldown(rowId) {
    const toggleIcon = document.getElementById(`toggle-${rowId}`);
    const isExpanded = !toggleIcon || !toggleIcon.classList.contains('collapsed');
    
    if (toggleIcon) {
      toggleIcon.classList.toggle('collapsed');
      toggleIcon.innerHTML = isExpanded ? '<i data-lucide="chevron-right"></i>' : '<i data-lucide="chevron-down"></i>';
    }

    const childRows = document.querySelectorAll(`[data-parent="${rowId}"]`);
    childRows.forEach(child => {
      if (isExpanded) {
        child.style.display = 'none';
        // Recursively hide sub-children if any
        const subChildren = document.querySelectorAll(`[data-parent="${child.id}"]`);
        subChildren.forEach(sc => sc.style.display = 'none');
      } else {
        child.style.display = '';
      }
    });

    this.refreshIcons();
  }

  expandAllDrilldown() {
    const table = document.getElementById('drilldown-table');
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(tr => tr.style.display = '');
    table.querySelectorAll('.tree-toggle').forEach(t => {
      t.classList.remove('collapsed');
      t.innerHTML = '<i data-lucide="chevron-down"></i>';
    });
    this.refreshIcons();
  }

  collapseAllDrilldown() {
    const table = document.getElementById('drilldown-table');
    if (!table) return;
    table.querySelectorAll('tbody tr.tree-row-bu, tbody tr.tree-row-proj').forEach(tr => tr.style.display = 'none');
    table.querySelectorAll('.tree-toggle').forEach(t => {
      t.classList.add('collapsed');
      t.innerHTML = '<i data-lucide="chevron-right"></i>';
    });
    this.refreshIcons();
  }

  // =========================================================================
  // MODULE 1, 2, 10, 11: UN SDG ALIGNMENT CENTER & CROSS-FRAMEWORK MAPPING
  // Sub-Company Admin: Add Contribution, Edit, Save Draft, Submit, Resubmit, Track
  // Main Company Admin: Group Overview, Multi-Entity Consolidation, Review, Approve/Reject
  // =========================================================================
  getTemplateSDG() {
    const isMain = auth.isMainAdmin();
    const subId = auth.getActiveSubsidiaryId();
    const activeSub = auth.getActiveSubsidiary();
    const activeTab = this.currentSubTab || (isMain ? 'overview' : 'initiatives');
    const summary = store.getSDGContributionSummary(isMain ? null : subId, this.activeYearFilter);
    const mappings = store.getFrameworkMappings();
    const allSDGs = store.getSDGs();

    return `
      <div class="page-header">
        <div class="page-title-group">
          <div style="display:flex; align-items:center; gap:8px;">
            <h1 class="page-title">
              <i data-lucide="globe-2" style="color:var(--meil-navy)"></i>
              ${isMain ? 'Group UN SDG Contribution & Alignment Center' : 'SDG Contribution & Sustainable Development'}
            </h1>
            <span class="badge ${isMain ? 'badge-approved' : 'badge-draft'}" style="font-size:12px;">
              ${isMain ? 'Group Consolidated View' : (activeSub?.shortName || 'Subsidiary View')}
            </span>
          </div>
          <p class="page-subtitle">
            ${isMain 
              ? 'Group-level multi-entity consolidation, approved initiative tracking, and SEBI BRSR cross-framework mapping across all 17 UN SDGs.'
              : 'Record, manage, project-map, and submit operational initiatives and KPI contributions toward the 17 UN Sustainable Development Goals.'
            }
          </p>
        </div>
        <div class="page-actions">
          ${!isMain ? `
            <button class="btn btn-brand-red" onclick="ui.showAddSDGContributionModal('${subId}')">
              <i data-lucide="plus-circle"></i> Add SDG Initiative
            </button>
          ` : `
            <button class="btn btn-brand-red" onclick="ui.navigateTo('submissions')">
              <i data-lucide="check-circle-2"></i> Review SDG Submissions
            </button>
          `}
          <button class="btn btn-outline" onclick="reportEngine.exportReportToExcel('UN SDG Alignment & Contribution Report', '${this.activeYearFilter}')" title="Export SDG Alignment Report">
            <i data-lucide="file-spreadsheet"></i> Export SDG Report (.xls)
          </button>
        </div>
      </div>

      <!-- Module Navigation Sub-Tabs -->
      <div class="tab-nav" style="margin-bottom:20px; border-bottom: 2px solid var(--border-color); display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn ${activeTab === 'initiatives' ? 'btn-brand-red' : 'btn-outline'}" onclick="ui.navigateTo('sdg', 'initiatives')">
          <i data-lucide="list-checks"></i> ${isMain ? 'All Subsidiary SDG Initiatives' : 'My SDG Initiatives & Disclosures'} (${summary.totalInitiatives})
        </button>
        <button class="btn ${activeTab === 'overview' ? 'btn-brand-red' : 'btn-outline'}" onclick="ui.navigateTo('sdg', 'overview')">
          <i data-lucide="grid"></i> 17 UN SDGs Portfolio
        </button>
        <button class="btn ${activeTab === 'mapping' ? 'btn-brand-red' : 'btn-outline'}" onclick="ui.navigateTo('sdg', 'mapping')">
          <i data-lucide="git-compare"></i> ESG ↔ BRSR ↔ SDG Matrix
        </button>
        <button class="btn ${activeTab === 'analytics' ? 'btn-brand-red' : 'btn-outline'}" onclick="ui.navigateTo('sdg', 'analytics')">
          <i data-lucide="bar-chart-3"></i> SDG Analytics &amp; Visualizations
        </button>
      </div>

      <!-- KPI Overview Bar -->
      <div class="grid-kpi-4" style="margin-bottom:20px;">
        <div class="kpi-card accent-navy">
          <div class="kpi-header">
            <span class="kpi-title">Active SDGs Contributed</span>
            <div class="kpi-icon-wrap blue"><i data-lucide="globe"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${summary.contributingSDGsCount}</span>
            <span class="kpi-unit">/ 17 Goals</span>
          </div>
          <div class="kpi-meta">
            <span>${isMain ? 'Consolidated Group Coverage' : 'Active Subsidiary Scope'}</span>
            <span class="badge ${summary.contributingSDGsCount >= 10 ? 'badge-approved' : 'badge-submitted'}">${Math.round((summary.contributingSDGsCount/17)*100)}% Coverage</span>
          </div>
        </div>

        <div class="kpi-card accent-green">
          <div class="kpi-header">
            <span class="kpi-title">Overall SDG Progress</span>
            <div class="kpi-icon-wrap green"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${summary.overallProgress > 0 ? summary.overallProgress + '%' : 'N/A'}</span>
            <span class="kpi-unit">Target Run-Rate</span>
          </div>
          <div class="kpi-meta">
            <span>${summary.onTrackCount} On Track | ${summary.atRiskCount} At Risk</span>
            <span class="badge badge-approved">${summary.completedCount} Completed</span>
          </div>
        </div>

        <div class="kpi-card accent-purple">
          <div class="kpi-header">
            <span class="kpi-title">Total SDG Initiatives</span>
            <div class="kpi-icon-wrap"><i data-lucide="target"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${summary.totalInitiatives}</span>
            <span class="kpi-unit">Initiatives</span>
          </div>
          <div class="kpi-meta">
            <span>${summary.approvedInitiatives} Approved &amp; Consolidated</span>
            <span class="badge ${summary.pendingReviewCount > 0 ? 'badge-submitted' : 'badge-draft'}">${summary.pendingReviewCount} Pending</span>
          </div>
        </div>

        <div class="kpi-card accent-amber">
          <div class="kpi-header">
            <span class="kpi-title">Mapped Indicators &amp; Projects</span>
            <div class="kpi-icon-wrap amber"><i data-lucide="network"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${summary.totalMappedIndicators}</span>
            <span class="kpi-unit">BRSR KPIs | ${summary.contributingProjectsCount} Projects</span>
          </div>
          <div class="kpi-meta">
            <span>Linked to SEBI Principles 1-9</span>
            <span class="badge badge-approved">Pillar Mapped</span>
          </div>
        </div>
      </div>

      ${activeTab === 'initiatives' ? this.renderSDGInitiativesTab(summary, isMain) : ''}
      ${activeTab === 'overview' ? this.renderSDGOverviewTab(summary.sdgCardMetrics, isMain) : ''}
      ${activeTab === 'mapping' ? this.renderSDGMappingTab(mappings, isMain) : ''}
      ${activeTab === 'analytics' ? this.renderSDGAnalyticsTab(summary, isMain) : ''}
    `;
  }

  // =========================================================================
  // TAB 1: SDG INITIATIVES & CONTRIBUTION DATA TABLE (Sub-Company Admin Focus)
  // =========================================================================
  renderSDGInitiativesTab(summary, isMain) {
    const list = summary.initiatives || [];
    const subs = store.getSubsidiaries();
    const projects = store.getProjects();
    const bus = store.getBusinessUnits();
    const subId = auth.getActiveSubsidiaryId();

    return `
      <!-- Sub-Company Admin Action Bar / Workflow Banner -->
      ${!isMain ? `
        <div class="card" style="background:linear-gradient(135deg, #07172c 0%, #0b2545 100%); color:#fff; padding:18px 22px; margin-bottom:20px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge badge-approved" style="background:#059669; color:#fff;">Sub-Company Admin Action Center</span>
                <span style="font-size:12px; color:#94a3b8;">${auth.getActiveSubsidiary()?.name}</span>
              </div>
              <h3 style="color:#ffffff; margin:6px 0 2px 0; font-size:17px; font-weight:700;">Record &amp; Submit SDG Contributions</h3>
              <p style="font-size:12px; color:#cbd5e1; margin:0; line-height:1.4;">
                Select from all 17 UN SDGs, link your field project and business unit, map statutory BRSR indicators, enter baseline/target milestones, and dispatch for Central MEIL review.
              </p>
            </div>
            <button class="btn btn-brand-red" style="padding:10px 18px; font-weight:700;" onclick="ui.showAddSDGContributionModal('${subId}')">
              <i data-lucide="plus-circle"></i> Add New Contribution
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Detailed Filter Bar -->
      <div class="filter-bar" style="margin-bottom:16px;">
        <div class="filter-group" style="flex-wrap:wrap; gap:8px;">
          ${isMain ? `
            <select class="filter-select" id="sdg-sub-filter" onchange="ui.filterSDGInitiatives()">
              <option value="all">All Subsidiaries (${subs.length})</option>
              ${subs.map(s => `<option value="${s.id}">${s.shortName}</option>`).join('')}
            </select>
          ` : ''}

          <select class="filter-select" id="sdg-goal-filter" onchange="ui.filterSDGInitiatives()">
            <option value="all">All 17 SDGs</option>
            ${Array.from({length: 17}, (_, i) => i + 1).map(n => `<option value="${n}">SDG ${n} - ${store.getSDGById(n)?.name || ''}</option>`).join('')}
          </select>

          <select class="filter-select" id="sdg-pillar-filter" onchange="ui.filterSDGInitiatives()">
            <option value="all">All ESG Pillars</option>
            <option value="Environmental">Environmental</option>
            <option value="Social">Social</option>
            <option value="Governance">Governance</option>
          </select>

          <select class="filter-select" id="sdg-workflow-filter" onchange="ui.filterSDGInitiatives()">
            <option value="all">All Workflow Statuses</option>
            <option value="Draft">Draft (Local)</option>
            <option value="Submitted">Submitted (Under Review)</option>
            <option value="Correction Required">Correction Required</option>
            <option value="Approved">Approved &amp; Consolidated</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select class="filter-select" id="sdg-perf-filter" onchange="ui.filterSDGInitiatives()">
            <option value="all">All Performance Statuses</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Completed">Completed</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>

        <div class="filter-group">
          <input type="text" id="sdg-search-input" class="form-control" style="width:240px;" placeholder="Search initiative, project, KPI..." oninput="ui.filterSDGInitiatives()">
        </div>
      </div>

      <!-- SDG Initiatives Table -->
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3 class="card-title">
            <i data-lucide="table"></i> SDG Operational Contributions &amp; Indicator Filings
          </h3>
          <span class="badge badge-approved" id="sdg-table-count-badge">${list.length} Records</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table" id="sdg-initiatives-table">
              <thead>
                <tr>
                  <th>SDG Goal</th>
                  <th>Initiative / Activity</th>
                  <th>Entity &amp; Project</th>
                  <th>KPI Baseline / Target</th>
                  <th>Progress</th>
                  <th>ESG &amp; BRSR Mapping</th>
                  <th>Performance</th>
                  <th>Workflow Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.length === 0 ? `
                  <tr>
                    <td colspan="9" class="table-empty" style="text-align:center; padding:32px 16px;">
                      <i data-lucide="info" style="width:32px; height:32px; color:var(--text-muted); margin-bottom:8px;"></i>
                      <div style="font-weight:600; font-size:14px; color:var(--text-secondary);">No SDG Contribution Initiatives Found</div>
                      <p style="font-size:12px; color:var(--text-muted); margin:4px 0 12px 0;">Click "Add SDG Initiative" above to record your first sustainable development activity.</p>
                      ${!isMain ? `<button class="btn btn-sm btn-brand-red" onclick="ui.showAddSDGContributionModal('${subId}')"><i data-lucide="plus"></i> Add Initiative</button>` : ''}
                    </td>
                  </tr>
                ` : list.map(item => {
                  const sdg = store.getSDGById(item.sdgNumber) || {};
                  const safeProgress = Number(item.progress) >= 0 ? Number(item.progress) : 0;
                  const progColor = safeProgress >= 100 ? '#059669' : (safeProgress >= 70 ? '#0284c7' : (safeProgress > 0 ? '#d97706' : '#94a3b8'));

                  return `
                    <tr data-sub="${item.subsidiaryId}" data-sdg="${item.sdgNumber}" data-pillar="${item.esgPillar}" data-workflow="${item.workflowStatus}" data-perf="${item.performanceStatus}" data-search="${(item.initiativeName + ' ' + item.projectName + ' ' + item.subsidiaryName + ' ' + item.brsrIndicator).toLowerCase()}">
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span class="sdg-num-badge" style="width:32px; height:32px; font-size:12px; background:${sdg.color || '#333'};">
                            ${item.sdgNumber}
                          </span>
                          <div>
                            <strong style="font-size:12px; display:block;">SDG ${item.sdgNumber}</strong>
                            <span style="font-size:11px; color:var(--text-muted);">${sdg.name || item.sdgName || 'UN Goal'}</span>
                          </div>
                        </div>
                      </td>
                      <td style="max-width:220px;">
                        <strong style="font-size:12.5px; color:var(--text-brand);">${item.initiativeName}</strong>
                        <div style="font-size:11px; color:var(--text-secondary); line-height:1.3; margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                          ${item.initiativeDesc || 'No detailed description provided.'}
                        </div>
                      </td>
                      <td style="font-size:12px;">
                        <div style="font-weight:600; color:var(--text-primary);">${item.subsidiaryName}</div>
                        <div style="color:var(--text-muted); font-size:11px;">
                          <i data-lucide="hard-hat" style="width:11px;height:11px;display:inline;"></i> ${item.projectName || 'General Facility'}
                          ${item.country && item.country !== 'India' ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:9px; padding:1px 4px;">${item.country}</span>` : ''}
                        </div>
                      </td>
                      <td style="font-size:12px;">
                        <div>Current: <strong>${(Number(item.currentValue)||0).toLocaleString()} ${item.unit}</strong></div>
                        <div style="font-size:11px; color:var(--text-muted);">Target: ${(Number(item.targetValue)||0).toLocaleString()} ${item.unit} (${item.targetYear})</div>
                      </td>
                      <td>
                        <div style="display:flex; flex-direction:column; gap:4px; min-width:90px;">
                          <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700;">
                            <span>${safeProgress}%</span>
                            <span style="color:${progColor}; font-size:10px;">${item.performanceStatus}</span>
                          </div>
                          <div class="progress-bar-wrap" style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                            <div style="width:${Math.min(safeProgress, 100)}%; background:${progColor}; height:100%;"></div>
                          </div>
                        </div>
                      </td>
                      <td style="font-size:11px;">
                        <div><span class="badge ${item.esgPillar === 'Environmental' ? 'badge-approved' : (item.esgPillar === 'Social' ? 'badge-submitted' : 'badge-draft')}">${item.esgPillar}</span></div>
                        <div style="color:var(--text-secondary); margin-top:2px; font-weight:600;">${item.brsrPrinciple ? item.brsrPrinciple.split(' - ')[0] : 'Principle 6'}</div>
                        <div style="color:var(--text-muted); font-size:10px;">${item.brsrIndicator || 'KPI Indicator'}</div>
                      </td>
                      <td>
                        <span class="badge ${item.performanceStatus === 'Completed' ? 'badge-approved' : (item.performanceStatus === 'On Track' ? 'badge-submitted' : (item.performanceStatus === 'At Risk' ? 'badge-rejected' : 'badge-draft'))}">
                          ${item.performanceStatus || 'In Progress'}
                        </span>
                      </td>
                      <td>
                        <span class="badge ${item.workflowStatus === 'Approved' ? 'badge-approved' : (item.workflowStatus === 'Submitted' ? 'badge-submitted' : (item.workflowStatus === 'Correction Required' ? 'badge-correction-required' : (item.workflowStatus === 'Rejected' ? 'badge-rejected' : 'badge-draft')))}">
                          ${item.workflowStatus === 'Submitted' ? 'Under Review' : item.workflowStatus}
                        </span>
                        ${item.workflowStatus === 'Approved' ? `<div style="font-size:9.5px; color:#059669; margin-top:2px;">Consolidated</div>` : ''}
                      </td>
                      <td>
                        <div class="table-actions">
                          <button class="btn btn-sm btn-outline" onclick="ui.showSDGInitiativeDetailModal('${item.id}')" title="View Full Details & History">
                            <i data-lucide="eye"></i>
                          </button>

                          ${!isMain ? `
                            ${item.workflowStatus === 'Draft' || item.workflowStatus === 'Correction Required' || item.workflowStatus === 'Rejected' ? `
                              <button class="btn btn-sm btn-outline" onclick="ui.showEditSDGContributionModal('${item.id}')" title="Edit Initiative">
                                <i data-lucide="edit-3"></i>
                              </button>
                              <button class="btn btn-sm btn-brand-red" onclick="workflow.submitSDGContribution('${item.id}')" title="Submit to Central Admin">
                                <i data-lucide="send"></i>
                              </button>
                            ` : `
                              <button class="btn btn-sm btn-outline" disabled title="Locked: Submitted for Main Admin review">
                                <i data-lucide="lock" style="width:12px;height:12px;"></i>
                              </button>
                            `}
                          ` : `
                            ${item.workflowStatus === 'Submitted' ? `
                              <button class="btn btn-sm btn-brand-red" onclick="ui.showMainAdminSDGReviewModal('${item.id}')" title="Review & Approve/Reject">
                                <i data-lucide="file-check-2"></i> Review
                              </button>
                            ` : ''}
                          `}
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

  filterSDGInitiatives() {
    const subFilter = document.getElementById('sdg-sub-filter')?.value || 'all';
    const goalFilter = document.getElementById('sdg-goal-filter')?.value || 'all';
    const pillarFilter = document.getElementById('sdg-pillar-filter')?.value || 'all';
    const workflowFilter = document.getElementById('sdg-workflow-filter')?.value || 'all';
    const perfFilter = document.getElementById('sdg-perf-filter')?.value || 'all';
    const searchVal = document.getElementById('sdg-search-input')?.value?.toLowerCase().trim() || '';

    const rows = document.querySelectorAll('#sdg-initiatives-table tbody tr');
    let visibleCount = 0;

    rows.forEach(r => {
      const subMatch = subFilter === 'all' || r.getAttribute('data-sub') === subFilter;
      const goalMatch = goalFilter === 'all' || r.getAttribute('data-sdg') === goalFilter;
      const pillarMatch = pillarFilter === 'all' || r.getAttribute('data-pillar') === pillarFilter;
      const wfMatch = workflowFilter === 'all' || r.getAttribute('data-workflow') === workflowFilter;
      const perfMatch = perfFilter === 'all' || r.getAttribute('data-perf') === perfFilter;
      const textMatch = !searchVal || (r.getAttribute('data-search') || '').includes(searchVal);

      if (subMatch && goalMatch && pillarMatch && wfMatch && perfMatch && textMatch) {
        r.style.display = '';
        visibleCount++;
      } else {
        r.style.display = 'none';
      }
    });

    const badge = document.getElementById('sdg-table-count-badge');
    if (badge) badge.textContent = `${visibleCount} Records`;
  }

  // =========================================================================
  // TAB 2: 17 UN SDGs PORTFOLIO CARDS GRID (With Safe Value Checks)
  // =========================================================================
  renderSDGOverviewTab(sdgs, isMain) {
    const subId = auth.getActiveSubsidiaryId();

    return `
      <!-- Filter Bar for SDGs -->
      <div class="filter-bar" style="margin-bottom:20px;">
        <div class="filter-group">
          <span class="filter-label"><i data-lucide="filter"></i> Category Filter:</span>
          <button class="btn btn-sm btn-outline active-filter-btn" id="filter-sdg-all" onclick="ui.filterSDGCards('all')">All 17 Goals</button>
          <button class="btn btn-sm btn-outline" id="filter-sdg-env" onclick="ui.filterSDGCards('Environment')">Environmental (6)</button>
          <button class="btn btn-sm btn-outline" id="filter-sdg-soc" onclick="ui.filterSDGCards('Social')">Social (7)</button>
          <button class="btn btn-sm btn-outline" id="filter-sdg-gov" onclick="ui.filterSDGCards('Governance')">Governance &amp; Economy (4)</button>
        </div>
        <div class="filter-group">
          ${!isMain ? `
            <button class="btn btn-sm btn-brand-red" onclick="ui.showAddSDGContributionModal('${subId}')">
              <i data-lucide="plus"></i> Add Initiative to SDG
            </button>
          ` : `
            <span style="font-size:12px; color:var(--text-muted);">
              Consolidated across <strong>5 Group Subsidiaries &amp; 250+ Projects</strong>
            </span>
          `}
        </div>
      </div>

      <!-- 17 SDGs Card Grid -->
      <div class="sdg-grid" id="sdg-cards-container">
        ${sdgs.map(sdg => {
          const progressVal = Number(sdg.calculatedProgress !== undefined ? sdg.calculatedProgress : (sdg.progress !== undefined ? sdg.progress : 0));
          const safeProgress = isNaN(progressVal) ? 0 : progressVal;
          const initiativesCount = Number(sdg.initiativeCount || 0);
          const projectsCount = Number(sdg.projectCount || (sdg.linkedProjectIds || []).length || 0);
          const indicatorsCount = Number(sdg.indicatorCount || (sdg.esgIndicators || []).length || 0);

          return `
            <div class="sdg-card" data-category="${sdg.category}" style="border-top: 5px solid ${sdg.color || 'var(--meil-navy)'};">
              <div class="sdg-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="sdg-num-badge" style="background:${sdg.color || 'var(--meil-navy)'};">SDG ${sdg.number}</span>
                <span class="badge" style="background:rgba(0,0,0,0.06); font-size:11px; font-weight:600;">${sdg.category}</span>
              </div>
              
              <h3 class="sdg-title" style="color:var(--text-primary); margin:8px 0 4px 0; font-size:15px; font-weight:700;">
                ${sdg.name}
              </h3>
              
              <p class="sdg-desc" style="font-size:12px; color:var(--text-secondary); line-height:1.4; margin-bottom:12px; height:46px; overflow:hidden;">
                ${sdg.description}
              </p>
              
              <!-- Progress Meter -->
              <div style="background:#f8fafc; border-radius:6px; padding:8px 10px; margin-bottom:12px; font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span style="color:var(--text-muted); font-size:11px; font-weight:600;">PROGRESS</span>
                  <span style="font-weight:700; color:${sdg.color || 'var(--meil-navy)'};">${safeProgress}% / ${sdg.target || 'Target'}</span>
                </div>
                <div class="progress-bar-wrap" style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                  <div style="width:${Math.min(safeProgress, 100)}%; background:${sdg.color || 'var(--meil-navy)'}; height:100%; border-radius:3px;"></div>
                </div>
              </div>

              <!-- Metrics Summary Grid -->
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:12px; text-align:center; background:var(--bg-surface-secondary); padding:6px; border-radius:4px;">
                <div>
                  <div style="font-size:13px; font-weight:700; color:var(--text-brand);">${initiativesCount}</div>
                  <div style="font-size:9.5px; color:var(--text-muted);">Initiatives</div>
                </div>
                <div>
                  <div style="font-size:13px; font-weight:700; color:var(--text-brand);">${projectsCount}</div>
                  <div style="font-size:9.5px; color:var(--text-muted);">Projects</div>
                </div>
                <div>
                  <div style="font-size:13px; font-weight:700; color:var(--text-brand);">${indicatorsCount}</div>
                  <div style="font-size:9.5px; color:var(--text-muted);">BRSR KPIs</div>
                </div>
              </div>

              <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">
                <strong>BRSR:</strong> ${(sdg.brsrPrinciples || ['Principle 6']).join(', ')}
              </div>

              <div style="display:flex; gap:6px; margin-top:auto;">
                <button class="btn btn-sm btn-outline" style="flex:1; justify-content:center;" onclick="ui.showSDGDetailModal(${sdg.number})">
                  <i data-lucide="info"></i> Target Details
                </button>
                ${!isMain ? `
                  <button class="btn btn-sm btn-brand-red" style="padding:4px 8px;" onclick="ui.showAddSDGContributionModal('${subId}', ${sdg.number})" title="Add Initiative for SDG ${sdg.number}">
                    <i data-lucide="plus"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  filterSDGCards(category) {
    const cards = document.querySelectorAll('#sdg-cards-container .sdg-card');
    cards.forEach(card => {
      if (category === 'all' || card.getAttribute('data-category') === category) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    ['all', 'env', 'soc', 'gov'].forEach(id => {
      const btn = document.getElementById(`filter-sdg-${id}`);
      if (btn) btn.classList.remove('active-filter-btn');
    });

    const activeMap = { all: 'all', Environment: 'env', Social: 'soc', Governance: 'gov' };
    const btn = document.getElementById(`filter-sdg-${activeMap[category] || 'all'}`);
    if (btn) btn.classList.add('active-filter-btn');
  }

  // =========================================================================
  // TAB 3: ESG ↔ BRSR ↔ SDG CROSS-FRAMEWORK MATRIX
  // =========================================================================
  renderSDGMappingTab(mappings, isMain) {
    const sdgs = store.getSDGs();

    return `
      <!-- Interactive Filtering Bar for Mapping -->
      <div class="filter-bar" style="margin-bottom:16px;">
        <div class="filter-group">
          <span class="filter-label"><i data-lucide="filter"></i> ESG Area:</span>
          <select class="filter-select" id="mapping-area-filter" onchange="ui.filterMappingTable()">
            <option value="all">All ESG Areas</option>
            <option value="Environment">Environment</option>
            <option value="Social">Social</option>
            <option value="Governance">Governance</option>
          </select>

          <span class="filter-label" style="margin-left:8px;"><i data-lucide="file-text"></i> BRSR Principle:</span>
          <select class="filter-select" id="mapping-principle-filter" onchange="ui.filterMappingTable()">
            <option value="all">All Principles (P1-P9)</option>
            <option value="Principle 1">Principle 1 (Ethics & Governance)</option>
            <option value="Principle 2">Principle 2 (Product Lifecycle)</option>
            <option value="Principle 3">Principle 3 (Employee Well-being)</option>
            <option value="Principle 4">Principle 4 (Stakeholder Engagement)</option>
            <option value="Principle 5">Principle 5 (Human Rights)</option>
            <option value="Principle 6">Principle 6 (Environmental Stewardship)</option>
            <option value="Principle 7">Principle 7 (Policy Advocacy)</option>
            <option value="Principle 8">Principle 8 (Inclusive Growth & CSR)</option>
            <option value="Principle 9">Principle 9 (Consumer Value)</option>
          </select>

          <span class="filter-label" style="margin-left:8px;"><i data-lucide="globe"></i> UN SDG:</span>
          <select class="filter-select" id="mapping-sdg-filter" onchange="ui.filterMappingTable()">
            <option value="all">All SDGs (1-17)</option>
            ${sdgs.map(s => `<option value="${s.number}">SDG ${s.number} - ${s.name}</option>`).join('')}
          </select>
        </div>

        <div class="filter-group">
          <input type="text" id="mapping-search-input" class="form-control" style="width:220px;" placeholder="Search indicator..." oninput="ui.filterMappingTable()">
        </div>
      </div>

      <!-- Mapping Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="link"></i> ESG Indicator &rarr; SEBI BRSR Principle &rarr; UN SDG Matrix</h3>
          <span class="badge badge-approved">${mappings.length} Core Framework Relationships</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table" id="framework-mapping-table">
              <thead>
                <tr>
                  <th>ESG Indicator</th>
                  <th>ESG Area</th>
                  <th>SEBI BRSR Principle</th>
                  <th>UN SDG Alignment</th>
                  <th>Corporate Context &amp; Applicability</th>
                  <th>Target Operational Scope</th>
                </tr>
              </thead>
              <tbody>
                ${mappings.map(m => {
                  const sdg = store.getSDGById(m.sdgNumber) || {};
                  return `
                    <tr data-area="${m.esgArea}" data-principle="${m.brsrPrinciple}" data-sdg="${m.sdgNumber}" data-name="${m.esgIndicator.toLowerCase()}">
                      <td><strong>${m.esgIndicator}</strong></td>
                      <td>
                        <span class="badge ${m.esgArea === 'Environment' ? 'badge-approved' : (m.esgArea === 'Social' ? 'badge-submitted' : 'badge-draft')}">
                          ${m.esgArea}
                        </span>
                      </td>
                      <td>
                        <span class="badge badge-draft" style="font-weight:600;">
                          ${m.brsrPrinciple}
                        </span>
                      </td>
                      <td>
                        <span class="badge" style="background:${sdg.color || '#333'}; color:#fff; font-weight:700;">
                          SDG ${m.sdgNumber} - ${m.sdgName}
                        </span>
                      </td>
                      <td style="font-size:12px; color:var(--text-secondary); max-width:320px;">
                        ${m.meilContext}
                      </td>
                      <td>
                        <span class="badge badge-approved" style="font-size:11px;">
                          ${m.applicability}
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
    `;
  }

  filterMappingTable() {
    const area = document.getElementById('mapping-area-filter')?.value || 'all';
    const principle = document.getElementById('mapping-principle-filter')?.value || 'all';
    const sdg = document.getElementById('mapping-sdg-filter')?.value || 'all';
    const search = document.getElementById('mapping-search-input')?.value?.toLowerCase().trim() || '';

    const rows = document.querySelectorAll('#framework-mapping-table tbody tr');
    rows.forEach(r => {
      const matchArea = area === 'all' || r.getAttribute('data-area') === area;
      const matchPrinciple = principle === 'all' || (r.getAttribute('data-principle') || '').includes(principle);
      const matchSDG = sdg === 'all' || String(r.getAttribute('data-sdg')) === String(sdg);
      const matchSearch = !search || (r.getAttribute('data-name') || '').includes(search);

      if (matchArea && matchPrinciple && matchSDG && matchSearch) {
        r.style.display = '';
      } else {
        r.style.display = 'none';
      }
    });
  }

  // =========================================================================
  // TAB 4: SDG ANALYTICS & VISUALIZATIONS
  // =========================================================================
  renderSDGAnalyticsTab(summary, isMain) {
    const subId = auth.getActiveSubsidiaryId();

    return `
      <!-- Charts Row 1: SDG Coverage + SDG Progress vs Target -->
      <div class="grid-2-col" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="bar-chart-2"></i> SDG Coverage (Mapped Indicators &amp; Projects)</h3>
            <span class="badge badge-draft">SDG 1 - 17 Distribution</span>
          </div>
          <div class="card-body" style="height:320px;">
            <canvas id="chart-sdg-coverage"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="target"></i> SDG Current Progress vs Target (%)</h3>
            <span class="badge badge-approved">Pillar Milestones</span>
          </div>
          <div class="card-body" style="height:320px;">
            <canvas id="chart-sdg-progress"></canvas>
          </div>
        </div>
      </div>

      <!-- Charts Row 2: Projects & Business Units Contributing to SDGs -->
      <div class="grid-2-col">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="hard-hat"></i> Project-Level SDG Aligned Nodes</h3>
            <span class="badge badge-approved">Field Sites</span>
          </div>
          <div class="card-body" style="height:320px;">
            <canvas id="chart-sdg-projects"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="layers"></i> ${isMain ? 'Subsidiary & BU SDG Alignment' : 'Business Unit SDG Contribution'}</h3>
            <span class="badge badge-approved">BU Alignment</span>
          </div>
          <div class="card-body" style="height:320px;">
            <canvas id="chart-sdg-subsidiary"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  postRenderSDG() {
    const activeTab = this.currentSubTab || (auth.isMainAdmin() ? 'overview' : 'initiatives');
    if (activeTab === 'analytics') {
      const isMain = auth.isMainAdmin();
      const subId = isMain ? null : auth.getActiveSubsidiaryId();
      chartEngine.renderSDGCoverageChart('chart-sdg-coverage');
      chartEngine.renderSDGProgressChart('chart-sdg-progress');
      chartEngine.renderSDGProjectChart('chart-sdg-projects', subId);
      chartEngine.renderSDGSubsidiaryChart('chart-sdg-subsidiary');
    }
    this.refreshIcons();
  }

  // =========================================================================
  // SUB-COMPANY ADMIN: ADD / EDIT SDG CONTRIBUTION MODAL
  // =========================================================================
  showAddSDGContributionModal(subsidiaryId = null, prefillSDGNumber = null) {
    const subId = subsidiaryId || auth.getActiveSubsidiaryId() || 'sub-1';
    this.showEditSDGContributionModal(null, subId, prefillSDGNumber);
  }

  showEditSDGContributionModal(contributionId = null, subsidiaryId = null, prefillSDGNumber = null) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const isEdit = !!contributionId;
    const existing = isEdit ? store.getSDGContributionById(contributionId) : null;
    const subId = existing ? existing.subsidiaryId : (subsidiaryId || auth.getActiveSubsidiaryId() || 'sub-1');
    const sub = store.getSubsidiaryById(subId) || auth.getActiveSubsidiary() || {};
    const bus = store.getBusinessUnits(subId);
    const projs = store.getProjects(subId);
    const allSDGs = store.getSDGs();
    const mappings = store.getFrameworkMappings();

    const selectedSDG = existing ? existing.sdgNumber : (prefillSDGNumber || 7);
    const selectedBU = existing ? existing.businessUnitId : (bus[0]?.id || '');
    const selectedProj = existing ? existing.projectId : (projs[0]?.id || '');
    const selectedPillar = existing ? existing.esgPillar : 'Environmental';

    modalContent.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-header" style="background:var(--meil-navy); color:#fff;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:6px; background:#e11d48; display:flex; align-items:center; justify-content:center; color:#fff;">
              <i data-lucide="globe-2"></i>
            </div>
            <div>
              <h2 class="modal-title" style="color:#ffffff; margin:0; font-size:16px;">
                ${isEdit ? 'Edit SDG Contribution Initiative' : 'Add New SDG Contribution Initiative'}
              </h2>
              <p style="font-size:12px; color:#94a3b8; margin:2px 0 0 0;">
                Sub-Company Admin Filing | <strong>${sub.name || 'MEIL Subsidiary'}</strong> (${sub.shortName || ''})
              </p>
            </div>
          </div>
          <button class="modal-close-btn" style="color:#fff;" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>

        <div class="modal-body" style="max-height:75vh; overflow-y:auto; padding:20px;">
          <form id="form-sdg-contribution" onsubmit="event.preventDefault();">
            <input type="hidden" id="sdg-contrib-id" value="${existing?.id || ''}">
            <input type="hidden" id="sdg-contrib-sub" value="${subId}">

            <!-- Top Hierarchy Bar -->
            <div class="card" style="background:#f8fafc; padding:12px 16px; margin-bottom:18px; border-left:4px solid var(--meil-navy);">
              <div style="font-size:11px; font-weight:700; color:var(--meil-navy); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                <i data-lucide="sitemap" style="width:12px;height:12px;display:inline;"></i> Enterprise Hierarchy Association
              </div>
              <div class="form-grid-3">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px;">Parent Subsidiary</label>
                  <input type="text" class="form-control" value="${sub.name}" readonly style="background:#e2e8f0; font-size:12px; font-weight:600;">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px;">Assigned Business Unit <span class="required">*</span></label>
                  <select class="form-control" id="sdg-bu" style="font-size:12px;" required>
                    ${bus.map(b => `<option value="${b.id}" ${b.id === selectedBU ? 'selected' : ''}>${b.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px;">Assigned Operational Project <span class="required">*</span></label>
                  <select class="form-control" id="sdg-proj" style="font-size:12px;" onchange="ui.onSDGProjectSelect(this.value)" required>
                    <option value="">-- General Company / Multi-Site --</option>
                    ${projs.map(p => `<option value="${p.id}" ${p.id === selectedProj ? 'selected' : ''}>${p.code} - ${p.name.slice(0, 28)} (${p.city || p.location})</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- SECTION 1: SDG GOAL SELECTION & MAPPING -->
            <div style="margin-bottom:18px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:12px;">
                1. Target UN Sustainable Development Goal &amp; Cross-Framework Mapping
              </h4>
              
              <div class="form-grid-3" style="margin-bottom:12px;">
                <div class="form-group">
                  <label class="form-label">Select UN SDG (1 to 17) <span class="required">*</span></label>
                  <select class="form-control" id="sdg-select-num" onchange="ui.onSDGGoalChange(this.value)" required style="font-weight:600;">
                    ${allSDGs.map(s => `
                      <option value="${s.number}" ${s.number === Number(selectedSDG) ? 'selected' : ''}>
                        SDG ${s.number}: ${s.name} (${s.category})
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">ESG Pillar <span class="required">*</span></label>
                  <select class="form-control" id="sdg-pillar" required>
                    <option value="Environmental" ${selectedPillar === 'Environmental' ? 'selected' : ''}>Environmental (E)</option>
                    <option value="Social" ${selectedPillar === 'Social' ? 'selected' : ''}>Social (S)</option>
                    <option value="Governance" ${selectedPillar === 'Governance' ? 'selected' : ''}>Governance (G)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">SEBI BRSR Principle <span class="required">*</span></label>
                  <select class="form-control" id="sdg-brsr-principle" required>
                    <option value="Principle 1 - Ethics, Transparency & Accountability" ${(existing?.brsrPrinciple||'').includes('Principle 1') ? 'selected' : ''}>Principle 1 - Ethics & Governance</option>
                    <option value="Principle 2 - Product Life-Cycle Sustainability" ${(existing?.brsrPrinciple||'').includes('Principle 2') ? 'selected' : ''}>Principle 2 - Product Lifecycle Sustainability</option>
                    <option value="Principle 3 - Employee Well-being & Workplace Safety" ${(existing?.brsrPrinciple||'').includes('Principle 3') ? 'selected' : ''}>Principle 3 - Employee Well-being & Safety</option>
                    <option value="Principle 4 - Stakeholder Engagement" ${(existing?.brsrPrinciple||'').includes('Principle 4') ? 'selected' : ''}>Principle 4 - Stakeholder Inclusiveness</option>
                    <option value="Principle 5 - Human Rights" ${(existing?.brsrPrinciple||'').includes('Principle 5') ? 'selected' : ''}>Principle 5 - Human Rights Protection</option>
                    <option value="Principle 6 - Environmental Protection & Climate Action" ${(existing?.brsrPrinciple||'').includes('Principle 6') || !existing ? 'selected' : ''}>Principle 6 - Environmental Protection & GHG</option>
                    <option value="Principle 7 - Responsible Policy Advocacy" ${(existing?.brsrPrinciple||'').includes('Principle 7') ? 'selected' : ''}>Principle 7 - Responsible Policy Advocacy</option>
                    <option value="Principle 8 - Inclusive Growth & Community CSR" ${(existing?.brsrPrinciple||'').includes('Principle 8') ? 'selected' : ''}>Principle 8 - Inclusive Growth & CSR</option>
                    <option value="Principle 9 - Consumer Value & Responsibility" ${(existing?.brsrPrinciple||'').includes('Principle 9') ? 'selected' : ''}>Principle 9 - Consumer Responsibility</option>
                  </select>
                </div>
              </div>

              <!-- Indicator Auto-suggestion / Manual Entry -->
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Mapped BRSR / ESG Indicator <span class="required">*</span></label>
                  <input type="text" class="form-control" id="sdg-indicator" value="${existing?.brsrIndicator || 'Renewable Energy Consumption & Generation'}" placeholder="E.g. Scope 1 GHG Reduction, Water Recycled (kL), LTIFR..." required>
                </div>
                <div class="form-group">
                  <label class="form-label">Reporting Period / Financial Year <span class="required">*</span></label>
                  <select class="form-control" id="sdg-reporting-year">
                    <option value="FY 2025-26" ${(existing?.reportingYear || this.activeYearFilter) === 'FY 2025-26' ? 'selected' : ''}>FY 2025-26 (Current Active)</option>
                    <option value="FY 2024-25" ${(existing?.reportingYear) === 'FY 2024-25' ? 'selected' : ''}>FY 2024-25</option>
                    <option value="FY 2023-24" ${(existing?.reportingYear) === 'FY 2023-24' ? 'selected' : ''}>FY 2023-24</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- SECTION 2: INITIATIVE DETAILS -->
            <div style="margin-bottom:18px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:12px;">
                2. Operational Initiative Description &amp; Field Location
              </h4>

              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Initiative / Activity Name <span class="required">*</span></label>
                <input type="text" class="form-control" id="sdg-init-name" value="${existing?.initiativeName || ''}" placeholder="E.g. 5MW Floating Solar Array on Intake Canal / Batching Plant Water Closed-Loop Recycling" required>
              </div>

              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Contribution Description &amp; Scope <span class="required">*</span></label>
                <textarea class="form-control" id="sdg-init-desc" rows="3" placeholder="Describe the physical technology, operational interventions, beneficiaries, and environmental/social outcomes achieved..." required>${existing?.initiativeDesc || ''}</textarea>
              </div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label">Project Location / Site</label>
                  <input type="text" class="form-control" id="sdg-location" value="${existing?.projectLocation || ''}" placeholder="E.g. Neemuch, Madhya Pradesh">
                </div>
                <div class="form-group">
                  <label class="form-label">Country</label>
                  <input type="text" class="form-control" id="sdg-country" value="${existing?.country || 'India'}" placeholder="E.g. India, Kuwait, Nepal">
                </div>
                <div class="form-group">
                  <label class="form-label">Responsible Department / Owner <span class="required">*</span></label>
                  <input type="text" class="form-control" id="sdg-owner" value="${existing?.responsibleDept || 'Sustainability Directorate'}" placeholder="E.g. HSE & Environmental Cell" required>
                </div>
              </div>
            </div>

            <!-- SECTION 3: METRIC TARGETS & AUTOMATIC PROGRESS CALCULATION -->
            <div style="margin-bottom:18px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:12px;">
                3. Milestone Metric Values &amp; Progress Tracking
              </h4>

              <div class="form-grid-4" style="margin-bottom:12px;">
                <div class="form-group">
                  <label class="form-label">Baseline Value</label>
                  <input type="number" step="any" class="form-control" id="sdg-base-val" value="${existing?.baselineValue ?? ''}" placeholder="E.g. 1000" oninput="ui.calculateSDGLiveProgress()">
                </div>
                <div class="form-group">
                  <label class="form-label">Current Value <span class="required">*</span></label>
                  <input type="number" step="any" class="form-control" id="sdg-cur-val" value="${existing?.currentValue ?? ''}" placeholder="E.g. 4500" required oninput="ui.calculateSDGLiveProgress()">
                </div>
                <div class="form-group">
                  <label class="form-label">Target Value <span class="required">*</span></label>
                  <input type="number" step="any" class="form-control" id="sdg-tgt-val" value="${existing?.targetValue ?? ''}" placeholder="E.g. 5000" required oninput="ui.calculateSDGLiveProgress()">
                </div>
                <div class="form-group">
                  <label class="form-label">Unit of Measurement <span class="required">*</span></label>
                  <input type="text" class="form-control" id="sdg-unit" value="${existing?.unit || 'MWh'}" placeholder="E.g. MWh, kL, tCO2e, Saplings, %" required>
                </div>
              </div>

              <div class="form-grid-3" style="margin-bottom:12px;">
                <div class="form-group">
                  <label class="form-label">Baseline Year</label>
                  <input type="text" class="form-control" id="sdg-base-year" value="${existing?.baselineYear || '2023'}" placeholder="E.g. 2022">
                </div>
                <div class="form-group">
                  <label class="form-label">Target Year <span class="required">*</span></label>
                  <input type="text" class="form-control" id="sdg-tgt-year" value="${existing?.targetYear || '2026'}" placeholder="E.g. 2026" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Data Source / Instrumentation</label>
                  <input type="text" class="form-control" id="sdg-source" value="${existing?.dataSource || 'SCADA Flow Meter Telemetry'}" placeholder="E.g. Calibration Loggers / Metering">
                </div>
              </div>

              <!-- Real-time Calculated Progress Bar -->
              <div class="card" style="background:#f1f5f9; padding:12px 16px; border-radius:6px;" id="sdg-live-progress-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:12px; font-weight:700; color:var(--text-primary);">
                    <i data-lucide="calculator" style="width:13px;height:13px;display:inline;"></i> Calculated Initiative Progress: <strong id="live-sdg-progress-text">${existing ? existing.progress + '%' : '0%'}</strong>
                  </span>
                  <span class="badge ${existing && existing.progress >= 70 ? 'badge-approved' : 'badge-submitted'}" id="live-sdg-status-badge">
                    ${existing?.performanceStatus || 'In Progress'}
                  </span>
                </div>
                <div class="progress-bar-wrap" style="height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                  <div id="live-sdg-progress-bar" style="width:${existing ? Math.min(existing.progress, 100) : 0}%; background:#059669; height:100%; transition: width 0.3s;"></div>
                </div>
              </div>
            </div>

            <!-- SECTION 4: AUDIT EVIDENCE & SUPPORTING NOTES -->
            <div>
              <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:12px;">
                4. Audit Evidence &amp; Compliance Notes
              </h4>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Document / Audit Certificate Reference</label>
                  <input type="text" class="form-control" id="sdg-doc-ref" value="${existing?.evidenceRef || ''}" placeholder="E.g. CERT-PCB-ZLD-2026.pdf / SCADA-LOG-Q2.xlsx">
                </div>
                <div class="form-group">
                  <label class="form-label">Operational Notes / Special Remarks</label>
                  <input type="text" class="form-control" id="sdg-notes" value="${existing?.notes || ''}" placeholder="E.g. Certified by external environmental auditor.">
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer" style="display:flex; justify-content:space-between; background:#f8fafc; border-top:1px solid #e2e8f0; padding:12px 20px;">
          <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
          
          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-outline" onclick="ui.handleSaveSDGForm(false)">
              <i data-lucide="save"></i> Save as Draft
            </button>
            <button type="button" class="btn btn-brand-red" onclick="ui.handleSaveSDGForm(true)">
              <i data-lucide="send"></i> Submit for Review
            </button>
          </div>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.calculateSDGLiveProgress();
    this.refreshIcons();
  }

  onSDGGoalChange(sdgNum) {
    const sdg = store.getSDGById(sdgNum);
    if (!sdg) return;

    const pillarSelect = document.getElementById('sdg-pillar');
    if (pillarSelect) {
      if (sdg.category === 'Environmental') pillarSelect.value = 'Environmental';
      else if (sdg.category === 'Social') pillarSelect.value = 'Social';
      else pillarSelect.value = 'Governance';
    }

    const brsrSelect = document.getElementById('sdg-brsr-principle');
    if (brsrSelect && sdg.brsrPrinciples && sdg.brsrPrinciples.length > 0) {
      const p = sdg.brsrPrinciples[0];
      for (let i = 0; i < brsrSelect.options.length; i++) {
        if (p.includes(brsrSelect.options[i].value.split(' - ')[0])) {
          brsrSelect.selectedIndex = i;
          break;
        }
      }
    }

    const indicatorInput = document.getElementById('sdg-indicator');
    if (indicatorInput && sdg.esgIndicators && sdg.esgIndicators.length > 0) {
      indicatorInput.value = sdg.esgIndicators[0];
    }
  }

  onSDGProjectSelect(projectId) {
    if (!projectId) return;
    const proj = store.getProjectById(projectId);
    if (!proj) return;

    const locInput = document.getElementById('sdg-location');
    const countryInput = document.getElementById('sdg-country');
    const buSelect = document.getElementById('sdg-bu');

    if (locInput) locInput.value = proj.location || proj.city || '';
    if (countryInput) countryInput.value = proj.country || 'India';
    if (buSelect && proj.buId) buSelect.value = proj.buId;
  }

  calculateSDGLiveProgress() {
    const curVal = parseFloat(document.getElementById('sdg-cur-val')?.value) || 0;
    const tgtVal = parseFloat(document.getElementById('sdg-tgt-val')?.value) || 0;
    
    let pct = 0;
    if (tgtVal > 0) {
      pct = Math.round((curVal / tgtVal) * 100);
    } else if (curVal > 0) {
      pct = 100;
    }

    let status = "Not Started";
    let color = "#94a3b8";
    if (pct >= 100) {
      status = "Completed";
      color = "#059669";
    } else if (pct >= 70) {
      status = "On Track";
      color = "#0284c7";
    } else if (pct > 0) {
      status = "At Risk";
      color = "#d97706";
    }

    const textEl = document.getElementById('live-sdg-progress-text');
    const badgeEl = document.getElementById('live-sdg-status-badge');
    const barEl = document.getElementById('live-sdg-progress-bar');

    if (textEl) textEl.textContent = `${pct}%`;
    if (badgeEl) {
      badgeEl.textContent = status;
      badgeEl.className = `badge ${pct >= 70 ? 'badge-approved' : (pct > 0 ? 'badge-submitted' : 'badge-draft')}`;
    }
    if (barEl) {
      barEl.style.width = `${Math.min(pct, 100)}%`;
      barEl.style.background = color;
    }
  }

  handleSaveSDGForm(isSubmit = false) {
    const form = document.getElementById('form-sdg-contribution');
    if (!form) return;

    const id = document.getElementById('sdg-contrib-id')?.value || null;
    const subsidiaryId = document.getElementById('sdg-contrib-sub')?.value || auth.getActiveSubsidiaryId();
    const businessUnitId = document.getElementById('sdg-bu')?.value || null;
    const projectId = document.getElementById('sdg-proj')?.value || null;
    const sdgNumber = parseInt(document.getElementById('sdg-select-num')?.value) || 7;
    const esgPillar = document.getElementById('sdg-pillar')?.value || 'Environmental';
    const brsrPrinciple = document.getElementById('sdg-brsr-principle')?.value || 'Principle 6 - Environmental Protection';
    const brsrIndicator = document.getElementById('sdg-indicator')?.value || 'Key Indicator';
    const reportingYear = document.getElementById('sdg-reporting-year')?.value || 'FY 2025-26';
    const initiativeName = document.getElementById('sdg-init-name')?.value?.trim();
    const initiativeDesc = document.getElementById('sdg-init-desc')?.value?.trim();
    const projectLocation = document.getElementById('sdg-location')?.value?.trim();
    const country = document.getElementById('sdg-country')?.value?.trim() || 'India';
    const responsibleDept = document.getElementById('sdg-owner')?.value?.trim() || 'Sustainability Cell';
    const baselineValue = parseFloat(document.getElementById('sdg-base-val')?.value) || 0;
    const currentValue = parseFloat(document.getElementById('sdg-cur-val')?.value) || 0;
    const targetValue = parseFloat(document.getElementById('sdg-tgt-val')?.value) || 0;
    const unit = document.getElementById('sdg-unit')?.value?.trim() || 'Units';
    const baselineYear = document.getElementById('sdg-base-year')?.value?.trim() || '2023';
    const targetYear = document.getElementById('sdg-tgt-year')?.value?.trim() || '2026';
    const dataSource = document.getElementById('sdg-source')?.value?.trim() || 'Site Telemetry';
    const evidenceRef = document.getElementById('sdg-doc-ref')?.value?.trim() || 'N/A';
    const notes = document.getElementById('sdg-notes')?.value?.trim() || '';

    if (!initiativeName) {
      this.showToast("Please enter an Initiative Name.", "warning");
      return;
    }
    if (!initiativeDesc) {
      this.showToast("Please enter a Contribution Description.", "warning");
      return;
    }

    const payload = {
      id,
      subsidiaryId,
      businessUnitId,
      projectId,
      sdgNumber,
      esgPillar,
      brsrPrinciple,
      brsrIndicator,
      reportingYear,
      initiativeName,
      initiativeDesc,
      projectLocation,
      country,
      responsibleDept,
      baselineValue,
      currentValue,
      targetValue,
      unit,
      baselineYear,
      targetYear,
      dataSource,
      evidenceRef,
      notes
    };

    if (isSubmit) {
      workflow.submitSDGContribution(payload);
    } else {
      workflow.saveSDGDraft(payload);
    }
  }

  // =========================================================================
  // VIEW SDG INITIATIVE DETAIL MODAL (With Audit Trail & Approval History)
  // =========================================================================
  showSDGInitiativeDetailModal(contributionId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const item = store.getSDGContributionById(contributionId);
    if (!item) return;

    const sdg = store.getSDGById(item.sdgNumber) || {};
    const safeProgress = Number(item.progress) >= 0 ? Number(item.progress) : 0;
    const history = item.history || [];
    const isMain = auth.isMainAdmin();

    modalContent.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header" style="border-left: 6px solid ${sdg.color || 'var(--meil-navy)'};">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="sdg-num-badge" style="background:${sdg.color || 'var(--meil-navy)'}; width:32px; height:32px; font-size:12px;">
                ${item.sdgNumber}
              </span>
              <h2 class="modal-title" style="margin:0; font-size:16px;">${item.initiativeName}</h2>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">
              SDG ${item.sdgNumber}: ${sdg.name} | ${item.subsidiaryName} | Project: <strong>${item.projectName}</strong>
            </p>
          </div>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>

        <div class="modal-body">
          <!-- Status Banner -->
          <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; margin-bottom:16px;">
            <div>
              <span style="font-size:11px; color:var(--text-muted);">Workflow Status:</span>
              <span class="badge ${item.workflowStatus === 'Approved' ? 'badge-approved' : (item.workflowStatus === 'Submitted' ? 'badge-submitted' : (item.workflowStatus === 'Correction Required' ? 'badge-correction-required' : (item.workflowStatus === 'Rejected' ? 'badge-rejected' : 'badge-draft')))}" style="font-size:12px; margin-left:6px;">
                ${item.workflowStatus === 'Submitted' ? 'Submitted (Under Review)' : item.workflowStatus}
              </span>
            </div>
            <div>
              <span style="font-size:11px; color:var(--text-muted);">Performance Status:</span>
              <span class="badge ${item.performanceStatus === 'Completed' ? 'badge-approved' : 'badge-submitted'}" style="margin-left:6px;">
                ${item.performanceStatus}
              </span>
            </div>
          </div>

          <!-- Rejection / Correction Banner if any -->
          ${item.workflowStatus === 'Correction Required' || item.workflowStatus === 'Rejected' ? `
            <div class="alert ${item.workflowStatus === 'Rejected' ? 'alert-danger' : 'alert-warning'}" style="margin-bottom:16px;">
              <div class="alert-content">
                <strong>Reviewer Remarks (${item.reviewedBy || 'Central MEIL Admin'}):</strong><br>
                "${item.reviewerRemarks || 'Please correct required baseline metrics and resubmit.'}"
              </div>
            </div>
          ` : ''}

          <!-- Description Box -->
          <div class="card" style="margin-bottom:16px; background:#ffffff;">
            <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="file-text"></i> Initiative Description</h4></div>
            <div class="card-body" style="padding:10px 14px; font-size:13px; line-height:1.5;">
              ${item.initiativeDesc}
            </div>
          </div>

          <!-- 2-Col Metrics & Mapping Grid -->
          <div class="grid-2-col" style="margin-bottom:16px;">
            <div class="card" style="background:#f8fafc;">
              <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="target"></i> Metric Milestones</h4></div>
              <div class="card-body" style="padding:10px 14px; font-size:12px; display:flex; flex-direction:column; gap:6px;">
                <div>Current Value: <strong>${(Number(item.currentValue)||0).toLocaleString()} ${item.unit}</strong></div>
                <div>Target Value: <strong>${(Number(item.targetValue)||0).toLocaleString()} ${item.unit} (${item.targetYear})</strong></div>
                <div>Baseline: <strong>${(Number(item.baselineValue)||0).toLocaleString()} ${item.unit} (${item.baselineYear})</strong></div>
                <div style="margin-top:4px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span>Progress:</span>
                    <strong>${safeProgress}%</strong>
                  </div>
                  <div class="progress-bar-wrap" style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                    <div style="width:${Math.min(safeProgress, 100)}%; background:${sdg.color || '#059669'}; height:100%;"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card" style="background:#f8fafc;">
              <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="link"></i> Framework Mapping</h4></div>
              <div class="card-body" style="padding:10px 14px; font-size:12px; display:flex; flex-direction:column; gap:6px;">
                <div>ESG Pillar: <span class="badge badge-approved">${item.esgPillar}</span></div>
                <div>BRSR Principle: <strong>${item.brsrPrinciple}</strong></div>
                <div>BRSR Indicator: <strong>${item.brsrIndicator}</strong></div>
                <div>Department: <strong>${item.responsibleDept}</strong></div>
                <div>Evidence Ref: <span class="badge badge-draft">${item.evidenceRef}</span></div>
              </div>
            </div>
          </div>

          <!-- Audit Log History -->
          <div class="card">
            <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="history"></i> Lifecycle Audit History</h4></div>
            <div class="card-body" style="padding:0;">
              <table class="table" style="font-size:11.5px; margin:0;">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.map(h => `
                    <tr>
                      <td style="color:var(--text-muted);">${h.date}</td>
                      <td><strong>${h.action}</strong></td>
                      <td>${h.user}</td>
                      <td>${h.remarks || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="display:flex; justify-content:space-between;">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Close</button>
          
          <div style="display:flex; gap:8px;">
            ${!isMain && (item.workflowStatus === 'Draft' || item.workflowStatus === 'Correction Required' || item.workflowStatus === 'Rejected') ? `
              <button class="btn btn-outline" onclick="ui.showEditSDGContributionModal('${item.id}')">
                <i data-lucide="edit-3"></i> Edit
              </button>
              <button class="btn btn-brand-red" onclick="workflow.submitSDGContribution('${item.id}')">
                <i data-lucide="send"></i> Resubmit for Review
              </button>
            ` : ''}

            ${isMain && item.workflowStatus === 'Submitted' ? `
              <button class="btn btn-brand-red" onclick="ui.showMainAdminSDGReviewModal('${item.id}')">
                <i data-lucide="file-check-2"></i> Review &amp; Approve/Reject
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  // =========================================================================
  // MAIN COMPANY ADMIN: SDG CONTRIBUTION REVIEW & APPROVAL MODAL
  // =========================================================================
  showMainAdminSDGReviewModal(contributionId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const item = store.getSDGContributionById(contributionId);
    if (!item) return;
    const sdg = store.getSDGById(item.sdgNumber) || {};

    modalContent.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header" style="background:#07172c; color:#fff;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-submitted">Central Review Audit</span>
              <h2 class="modal-title" style="color:#ffffff; margin:0; font-size:16px;">SDG Contribution Review: ${item.id}</h2>
            </div>
            <p style="font-size:12px; color:#94a3b8; margin:3px 0 0 0;">
              ${item.subsidiaryName} | Project: <strong>${item.projectName}</strong> | SDG ${item.sdgNumber} (${sdg.name})
            </p>
          </div>
          <button class="modal-close-btn" style="color:#fff;" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>

        <div class="modal-body">
          <div class="alert alert-info" style="margin-bottom:16px;">
            <div class="alert-content">
              <strong>Consolidation Governance Rule:</strong> Approving this initiative immediately consolidates its KPIs into the MEIL Group UN SDG Dashboard &amp; SEBI BRSR Report. Rejecting or requesting correction excludes it until rectified by the subsidiary.
            </div>
          </div>

          <div class="card" style="background:#f8fafc; padding:12px 14px; margin-bottom:16px;">
            <h4 style="margin:0 0 6px 0; font-size:13px; color:var(--meil-navy);"><i data-lucide="target"></i> Initiative: ${item.initiativeName}</h4>
            <p style="font-size:12.5px; color:var(--text-secondary); line-height:1.4; margin:0 0 10px 0;">${item.initiativeDesc}</p>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; font-size:12px; background:#ffffff; padding:8px; border-radius:4px; border:1px solid #e2e8f0;">
              <div>Current: <strong>${(Number(item.currentValue)||0).toLocaleString()} ${item.unit}</strong></div>
              <div>Target: <strong>${(Number(item.targetValue)||0).toLocaleString()} ${item.unit} (${item.targetYear})</strong></div>
              <div>Progress: <strong style="color:#059669;">${item.progress}% (${item.performanceStatus})</strong></div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">Reviewer Verification Remarks / Feedback <span class="required">*</span></label>
            <textarea id="sdg-review-remarks" class="form-control" rows="3" placeholder="Enter verification notes, reason for approval, or specific corrections required from the subsidiary..."></textarea>
          </div>
        </div>

        <div class="modal-footer" style="display:flex; justify-content:space-between;">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Close</button>
          
          <div style="display:flex; gap:8px;">
            <button class="btn btn-danger" onclick="const r = document.getElementById('sdg-review-remarks')?.value; workflow.rejectSDGContribution('${item.id}', r);">
              <i data-lucide="x-circle"></i> Reject Initiative
            </button>
            <button class="btn btn-outline" style="border-color:#d97706; color:#d97706;" onclick="const r = document.getElementById('sdg-review-remarks')?.value; workflow.requestSDGCorrection('${item.id}', r);">
              <i data-lucide="alert-triangle"></i> Request Correction
            </button>
            <button class="btn btn-brand-red" onclick="const r = document.getElementById('sdg-review-remarks')?.value; workflow.approveSDGContribution('${item.id}', r);">
              <i data-lucide="check-check"></i> Approve &amp; Consolidate
            </button>
          </div>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  showSDGDetailModal(sdgNumber) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const sdg = store.getSDGById(sdgNumber);
    if (!sdg) return;

    const linkedProjects = store.getProjects().filter(p => (p.sdgs || []).includes(sdgNumber));
    const linkedSubs = store.getSubsidiaries().filter(s => (s.coreSDGs || []).includes(sdgNumber));
    const initiatives = store.getSDGContributions({ sdgNumber });

    modalContent.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header" style="border-left: 6px solid ${sdg.color || 'var(--meil-navy)'};">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="sdg-num-badge" style="background:${sdg.color || 'var(--meil-navy)'};">SDG ${sdg.number}</span>
              <h2 class="modal-title" style="margin:0;">${sdg.name}</h2>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">${sdg.category} Pillar | Status: <strong>${sdg.status || 'Active'}</strong></p>
          </div>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info" style="margin-bottom:16px;">
            <div class="alert-content">
              <strong>UN Definition:</strong> ${sdg.description}
            </div>
          </div>

          <div class="card" style="margin-bottom:16px; background:#f8fafc;">
            <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="flag"></i> MEIL Corporate Commitment</h4></div>
            <div class="card-body" style="padding:10px 14px; font-size:13px; line-height:1.5;">
              ${sdg.meilContribution}
            </div>
          </div>

          <div class="grid-2-col" style="margin-bottom:16px;">
            <div class="card">
              <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="target"></i> Relevant UN Targets</h4></div>
              <div class="card-body" style="padding:10px 14px;">
                <ul style="padding-left:18px; margin:0; font-size:12px; color:var(--text-secondary);">
                  ${(sdg.targets || []).map(t => `<li style="margin-bottom:6px;">${t}</li>`).join('')}
                </ul>
              </div>
            </div>

            <div class="card">
              <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="activity"></i> Current Performance &amp; Run-rate</h4></div>
              <div class="card-body" style="padding:10px 14px; font-size:13px;">
                <div style="margin-bottom:10px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>Progress to FY26 Target:</span>
                    <strong>${sdg.progress || 0}% / ${sdg.target || 'Target'}</strong>
                  </div>
                  <div class="progress-bar-wrap" style="height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                    <div style="width:${Math.min(sdg.progress || 0, 100)}%; background:${sdg.color || '#059669'}; height:100%;"></div>
                  </div>
                </div>
                <div style="font-size:12px; color:var(--text-muted);">
                  <strong>SEBI BRSR Principles:</strong> ${(sdg.brsrPrinciples || []).join(', ')}<br>
                  <strong>Linked ESG Indicators:</strong> ${(sdg.esgIndicators || []).join(', ')}
                </div>
              </div>
            </div>
          </div>

          <!-- Active Filed Initiatives for this SDG -->
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="list-checks"></i> Recorded Subsidiary Initiatives (${initiatives.length})</h4></div>
            <div class="card-body" style="padding:10px 14px; font-size:12px;">
              ${initiatives.length > 0 ? `
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${initiatives.map(init => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 12px; border-radius:4px; border:1px solid #e2e8f0;">
                      <div>
                        <strong>${init.initiativeName}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">${init.subsidiaryName} | Project: ${init.projectName}</div>
                      </div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="badge ${init.workflowStatus === 'Approved' ? 'badge-approved' : 'badge-submitted'}">${init.workflowStatus}</span>
                        <span style="font-weight:700; color:#059669;">${init.progress}%</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : '<div style="color:var(--text-muted);">No granular initiatives filed yet for this SDG.</div>'}
            </div>
          </div>

          <div class="card">
            <div class="card-header" style="padding:10px 14px;"><h4 class="card-title" style="font-size:13px;"><i data-lucide="hard-hat"></i> Contributing Projects &amp; Subsidiaries</h4></div>
            <div class="card-body" style="padding:10px 14px;">
              <div style="font-size:12px; margin-bottom:8px;">
                <strong>Key Subsidiaries:</strong> ${linkedSubs.length > 0 ? linkedSubs.map(s => `<span class="badge badge-draft">${s.shortName}</span>`).join(' ') : 'Group-wide alignment'}
              </div>
              <div style="font-size:12px;">
                <strong>Field Projects Tagged (${linkedProjects.length}):</strong>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
                  ${linkedProjects.map(p => `
                    <span class="badge badge-approved" title="${p.name}">
                      ${p.code} (${p.city || p.location})
                    </span>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:space-between;">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Close</button>
          ${!auth.isMainAdmin() ? `
            <button class="btn btn-brand-red" onclick="ui.showAddSDGContributionModal('${auth.getActiveSubsidiaryId()}', ${sdg.number})">
              <i data-lucide="plus"></i> Add Initiative for SDG ${sdg.number}
            </button>
          ` : ''}
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }


  // =========================================================================
  // MODULE 3, 4, 7, 9, 10, 12, 13: PROJECT-LEVEL ESG DATA CENTER
  // =========================================================================
  getTemplateProjects() {
    const isMain = auth.isMainAdmin();
    const subs = store.getSubsidiaries();
    const selectedSub = isMain ? (this.activeSubsidiaryFilter || 'all') : auth.getActiveSubsidiaryId();
    const bus = store.getBusinessUnits(selectedSub === 'all' ? null : selectedSub);
    const selectedBU = this.activeBUFilter || 'all';
    const selectedScope = this.activeProjectScopeFilter || 'all'; // all / domestic / international
    const selectedStatus = this.activeProjectStatusFilter || 'all';

    const projects = store.getProjects(selectedSub, selectedBU, selectedScope, selectedStatus);

    const intlCount = projects.filter(p => p.isInternational).length;
    const approvedCount = projects.filter(p => p.submissionStatus === 'Approved').length;
    const avgQuality = Math.round(projects.reduce((acc, p) => acc + (store.validateProjectDataQuality(p.id).qualityScore || 0), 0) / (projects.length || 1));

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="hard-hat" style="color:var(--meil-navy)"></i>
            ${isMain ? 'Project ESG Monitoring' : 'My Project ESG'}
          </h1>
          <p class="page-subtitle">
            Operational project data collection, bottom-up review workflow, international site tracking, and data quality audits
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="reportEngine.exportReportToExcel('Project ESG & Consolidation Audit Report', '${this.activeYearFilter}')" title="Export Project Audit Report">
            <i data-lucide="file-spreadsheet"></i> Export Projects (.xls)
          </button>
          <button class="btn btn-brand-red" onclick="ui.showAddProjectModal('${selectedSub === 'all' ? (subs[0]?.id || 'sub-1') : selectedSub}')">
            <i data-lucide="plus"></i> Add Project Node
          </button>
        </div>
      </div>

      <!-- Top High-Level Project KPI Summary Cards -->
      <div class="grid-kpi-4" style="margin-bottom:20px;">
        <div class="kpi-card accent-blue">
          <div class="kpi-header">
            <span class="kpi-title">Total Active Projects</span>
            <div class="kpi-icon-wrap blue"><i data-lucide="folder-kanban"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${projects.length}</span>
            <span class="kpi-unit">Sites</span>
          </div>
          <div class="kpi-meta">
            <span>Domestic + Overseas</span>
            <span class="badge badge-approved">Monitored</span>
          </div>
        </div>

        <div class="kpi-card accent-purple">
          <div class="kpi-header">
            <span class="kpi-title">International Sites</span>
            <div class="kpi-icon-wrap"><i data-lucide="globe"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${intlCount}</span>
            <span class="kpi-unit">Global Projects</span>
          </div>
          <div class="kpi-meta">
            <span>Kuwait, Nepal &amp; Overseas Operations</span>
            <span class="badge badge-international">Global</span>
          </div>
        </div>

        <div class="kpi-card accent-green">
          <div class="kpi-header">
            <span class="kpi-title">Approved &amp; Consolidated</span>
            <div class="kpi-icon-wrap green"><i data-lucide="check-check"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${approvedCount}</span>
            <span class="kpi-unit">/ ${projects.length}</span>
          </div>
          <div class="kpi-meta">
            <span>${Math.round((approvedCount / (projects.length || 1)) * 100)}% Consolidation Eligibility</span>
            <span class="kpi-trend positive"><i data-lucide="arrow-up-right"></i> Qualified</span>
          </div>
        </div>

        <div class="kpi-card accent-amber">
          <div class="kpi-header">
            <span class="kpi-title">Data Completeness &amp; Quality</span>
            <div class="kpi-icon-wrap amber"><i data-lucide="shield-check"></i></div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">${avgQuality}%</span>
            <span class="kpi-unit">Audit Avg</span>
          </div>
          <div class="kpi-meta">
            <span>Field Validation Quality Score</span>
            <span class="badge ${avgQuality >= 80 ? 'badge-approved' : 'badge-correction-required'}">${avgQuality >= 80 ? 'Good' : 'Needs Review'}</span>
          </div>
        </div>
      </div>

      <!-- Project Filter Controls -->
      <div class="filter-bar" style="margin-bottom:16px;">
        <div class="filter-group">
          ${isMain ? `
            <span class="filter-label"><i data-lucide="building"></i> Subsidiary:</span>
            <select class="filter-select" id="proj-sub-filter" onchange="ui.activeSubsidiaryFilter = this.value; ui.activeBUFilter = 'all'; ui.renderCurrentView();">
              <option value="all" ${selectedSub === 'all' ? 'selected' : ''}>All Subsidiaries</option>
              ${subs.map(s => `<option value="${s.id}" ${selectedSub === s.id ? 'selected' : ''}>${s.shortName}</option>`).join('')}
            </select>
          ` : ''}

          <span class="filter-label" style="margin-left:8px;"><i data-lucide="network"></i> BU:</span>
          <select class="filter-select" id="proj-bu-filter" onchange="ui.activeBUFilter = this.value; ui.renderCurrentView();">
            <option value="all" ${selectedBU === 'all' ? 'selected' : ''}>All Business Units</option>
            ${bus.map(b => `<option value="${b.id}" ${selectedBU === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
          </select>

          <span class="filter-label" style="margin-left:8px;"><i data-lucide="map-pin"></i> Geography:</span>
          <select class="filter-select" id="proj-scope-filter" onchange="ui.activeProjectScopeFilter = this.value; ui.renderCurrentView();">
            <option value="all" ${selectedScope === 'all' ? 'selected' : ''}>All Locations</option>
            <option value="domestic" ${selectedScope === 'domestic' ? 'selected' : ''}>India Domestic</option>
            <option value="international" ${selectedScope === 'international' ? 'selected' : ''}>International (Overseas)</option>
          </select>

          <span class="filter-label" style="margin-left:8px;"><i data-lucide="clock"></i> Status:</span>
          <select class="filter-select" id="proj-status-filter" onchange="ui.activeProjectStatusFilter = this.value; ui.renderCurrentView();">
            <option value="all" ${selectedStatus === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="Draft" ${selectedStatus === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Submitted" ${selectedStatus === 'Submitted' ? 'selected' : ''}>Submitted</option>
            <option value="Correction Required" ${selectedStatus === 'Correction Required' ? 'selected' : ''}>Correction Required</option>
            <option value="Approved" ${selectedStatus === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Rejected" ${selectedStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>

        <div class="filter-group">
          <input type="text" id="project-search-input" class="form-control" style="width:200px;" placeholder="Search projects..." oninput="ui.filterProjectsList(this.value)">
        </div>
      </div>

      <!-- Project List Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="list-checks"></i> Project ESG Records &amp; Field Verification</h3>
          <span class="badge badge-approved">${projects.length} Filtered Sites</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table" id="projects-table">
              <thead>
                <tr>
                  <th>Project Code &amp; Name</th>
                  <th>Location</th>
                  <th>Subsidiary &amp; BU</th>
                  <th>Data Quality</th>
                  <th>Status</th>
                  <th>Consolidation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${projects.map(p => {
                  const sub = store.getSubsidiaryById(p.subsidiaryId) || {};
                  const bu = store.getBusinessUnitById(p.businessUnitId) || {};
                  const val = store.validateProjectDataQuality(p.id);
                  const isConsolidated = p.submissionStatus === 'Approved';

                  return `
                    <tr data-search="${(p.code + ' ' + p.name + ' ' + p.location + ' ' + sub.name).toLowerCase()}">
                      <td>
                        <strong>${p.code}</strong>
                        <div style="font-size:12px; color:var(--text-secondary); max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">
                          ${p.name}
                        </div>
                      </td>
                      <td>
                        ${this.getLocationBadge(p)}
                        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${p.location}</div>
                      </td>
                      <td>
                        <span style="font-weight:600; font-size:12px;">${sub.shortName || 'MEIL'}</span>
                        <div style="font-size:11px; color:var(--text-muted);">${bu.name || 'Core Operations'}</div>
                      </td>
                      <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                          <div class="progress-bar-wrap" style="width:50px; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                            <div style="width:${val.qualityScore}%; background:${val.qualityScore >= 80 ? 'var(--color-success)' : 'var(--color-warning)'}; height:100%;"></div>
                          </div>
                          <span style="font-size:11px; font-weight:700;">${val.qualityScore}%</span>
                          ${val.missingFields.length > 0 ? `<i data-lucide="alert-triangle" style="width:13px; height:13px; color:#d97706;" title="Missing: ${val.missingFields.join(', ')}"></i>` : ''}
                        </div>
                      </td>
                      <td>${this.getStatusBadge(p.submissionStatus)}</td>
                      <td>${this.getConsolidationBadge(isConsolidated)}</td>
                      <td>
                        <div class="table-actions">
                          <button class="btn btn-sm btn-outline" onclick="ui.showProjectScorecardModal('${p.id}')" title="View Project ESG Scorecard">
                            <i data-lucide="award"></i> Scorecard
                          </button>
                          
                          ${isMain ? `
                            <button class="btn btn-sm btn-brand-red" onclick="ui.showProjectReviewModal('${p.id}')" title="Review Submitted Data & Disclosures">
                              <i data-lucide="file-search"></i> Review Submitted Data
                            </button>
                          ` : `
                            <button class="btn btn-sm btn-outline" onclick="ui.openProjectDataEntryModal('${p.id}')" title="Edit / Enter ESG Disclosures">
                              <i data-lucide="edit-3"></i> Edit Project Data
                            </button>
                          `}
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

  postRenderProjects() {
    this.refreshIcons();
  }

  filterProjectsList(searchVal) {
    const val = (searchVal || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#projects-table tbody tr');
    rows.forEach(r => {
      const text = r.getAttribute('data-search') || '';
      r.style.display = !val || text.includes(val) ? '' : 'none';
    });
  }

  // =========================================================================
  // MODULE 12 & 13: PROJECT ESG SCORECARD MODAL
  // =========================================================================
  showProjectScorecardModal(projectId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const scorecard = store.calculateProjectScorecard(projectId);
    if (!scorecard) return;

    const p = scorecard.project;
    const env = scorecard.environment;
    const soc = scorecard.social;
    const gov = scorecard.governance;
    const q = scorecard.dataQuality;

    modalContent.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-approved" style="font-size:12px;">${p.code}</span>
              <h2 class="modal-title" style="margin:0;">Project ESG Scorecard: ${p.name}</h2>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">
              ${scorecard.subsidiary?.name} | BU: ${scorecard.businessUnit?.name} | Location: ${p.location} ${this.getLocationBadge(p)}
            </p>
          </div>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <!-- Top Overall Scorecard Badges -->
          <div class="grid-kpi-4" style="margin-bottom:20px;">
            <div class="kpi-card accent-blue">
              <div class="kpi-header"><span class="kpi-title">Overall ESG Score</span><div class="kpi-icon-wrap blue"><i data-lucide="award"></i></div></div>
              <div class="kpi-value-row"><span class="kpi-value">${scorecard.overallScore}%</span><span class="kpi-unit">Completion</span></div>
              <div class="kpi-meta"><span>Field Readiness</span>${this.getStatusBadge(scorecard.submissionStatus)}</div>
            </div>

            <div class="kpi-card accent-green">
              <div class="kpi-header"><span class="kpi-title">BRSR Alignment</span><div class="kpi-icon-wrap green"><i data-lucide="file-check-2"></i></div></div>
              <div class="kpi-value-row"><span class="kpi-value">${scorecard.brsrCompletion}%</span><span class="kpi-unit">Compliant</span></div>
              <div class="kpi-meta"><span>Principles 1-9 Validated</span><span class="badge badge-approved">Compliant</span></div>
            </div>

            <div class="kpi-card accent-amber">
              <div class="kpi-header"><span class="kpi-title">Data Quality</span><div class="kpi-icon-wrap amber"><i data-lucide="shield-check"></i></div></div>
              <div class="kpi-value-row"><span class="kpi-value">${q.qualityScore}%</span><span class="kpi-unit">Quality</span></div>
              <div class="kpi-meta"><span>${q.completedCount} of ${q.totalFields} Fields Complete</span><span class="badge badge-approved">Audit Ready</span></div>
            </div>

            <div class="kpi-card accent-purple">
              <div class="kpi-header"><span class="kpi-title">Consolidation Status</span><div class="kpi-icon-wrap"><i data-lucide="git-merge"></i></div></div>
              <div class="kpi-value-row"><span class="kpi-value" style="font-size:16px;">${scorecard.isConsolidated ? 'Consolidated' : 'Not Included'}</span></div>
              <div class="kpi-meta"><span>Group Rollup</span>${this.getConsolidationBadge(scorecard.isConsolidated)}</div>
            </div>
          </div>

          <!-- 3 Pillars Scorecard Grid -->
          <div class="scorecard-grid" style="margin-bottom:20px;">
            <!-- Pillar 1: Environment -->
            <div class="scorecard-pillar">
              <div class="scorecard-pillar-header" style="border-bottom: 2px solid #059669; padding-bottom:8px; margin-bottom:12px;">
                <h4 style="margin:0; font-size:14px; color:#059669; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="leaf"></i> Environmental Pillar (${scorecard.envScore}%)
                </h4>
              </div>
              <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between;"><span>Electricity:</span> <strong>${(env.electricityMWh || 0).toLocaleString()} MWh</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Renewable Elec:</span> <strong>${(env.renewableElectricityMWh || 0).toLocaleString()} MWh</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Fuel Consumption:</span> <strong>${(env.fuelLiters || 0).toLocaleString()} L</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Scope 1 GHG:</span> <strong>${(env.scope1 || 0).toLocaleString()} tCO2e</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Scope 2 GHG:</span> <strong>${(env.scope2 || 0).toLocaleString()} tCO2e</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Scope 3 GHG:</span> <strong>${(env.scope3 || 0).toLocaleString()} tCO2e</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Water Withdrawal:</span> <strong>${(env.waterWithdrawalKL || 0).toLocaleString()} kL</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Waste Recycled:</span> <strong>${(env.wasteRecycledMT || 0).toLocaleString()} MT</strong></div>
              </div>
            </div>

            <!-- Pillar 2: Social -->
            <div class="scorecard-pillar">
              <div class="scorecard-pillar-header" style="border-bottom: 2px solid #0284c7; padding-bottom:8px; margin-bottom:12px;">
                <h4 style="margin:0; font-size:14px; color:#0284c7; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="users"></i> Social Pillar (${scorecard.socScore}%)
                </h4>
              </div>
              <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between;"><span>Total Workforce:</span> <strong>${(soc.totalEmployees || 0).toLocaleString()}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Permanent / Contract:</span> <strong>${soc.permanentEmployees || 0} / ${soc.contractEmployees || 0}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Women Employees:</span> <strong>${soc.womenEmployees || 0} (${Math.round(((soc.womenEmployees||0)/(soc.totalEmployees||1))*100)}%)</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Training Hours/Emp:</span> <strong>${soc.trainingHoursPerEmployee || 0} hrs</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Lost Time Frequency (LTIFR):</span> <strong>${soc.ltifr || 0}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Fatalities:</span> <strong>${soc.fatalities || 0}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Safety Training Coverage:</span> <strong>${soc.safetyTrainingCoveragePercent || 0}%</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>CSR Community Spend:</span> <strong>INR ${soc.csrSpendLakhs || 0} L</strong></div>
              </div>
            </div>

            <!-- Pillar 3: Governance -->
            <div class="scorecard-pillar">
              <div class="scorecard-pillar-header" style="border-bottom: 2px solid #7c3aed; padding-bottom:8px; margin-bottom:12px;">
                <h4 style="margin:0; font-size:14px; color:#7c3aed; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="shield"></i> Governance Pillar (${scorecard.govScore}%)
                </h4>
              </div>
              <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between;"><span>ESG Code of Conduct:</span> <strong>${gov.policyImplementation ? 'Implemented' : 'Pending'}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Anti-Corruption Training:</span> <strong>${gov.antiCorruptionTrainingPercent || 0}% staff</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Whistleblower Mechanism:</span> <strong>${gov.whistleblowerMechanism ? 'Active Hotline' : 'None'}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Statutory Compliance:</span> <strong>${gov.complianceStatus || '100% Fully Compliant'}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Governance Incidents:</span> <strong>${gov.governanceIncidents || 0} reported</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Cybersecurity Audit:</span> <strong>${gov.cybersecurityAudit || 'Compliant'}</strong></div>
              </div>
            </div>
          </div>

          <!-- Data Quality Box & Missing Fields -->
          <div class="data-quality-box" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h4 style="margin:0; font-size:13px;"><i data-lucide="check-circle-2"></i> Field Data Quality &amp; Verification Audit</h4>
              <span class="badge ${q.qualityScore >= 80 ? 'badge-approved' : 'badge-correction-required'}">${q.qualityScore}% Quality</span>
            </div>
            ${q.missingFields.length > 0 ? `
              <div style="font-size:12px; color:#b45309; margin-bottom:6px;">
                <strong>Missing / Incomplete Fields (${q.missingFields.length}):</strong> ${q.missingFields.join(', ')}
              </div>
            ` : `
              <div style="font-size:12px; color:#047857;">
                <i data-lucide="check"></i> All mandatory environmental, social, and governance field inputs are verified and complete.
              </div>
            `}
          </div>

          <!-- Linked SDGs -->
          <div class="card" style="background:#f8fafc;">
            <div class="card-body" style="padding:10px 14px;">
              <div style="font-size:12px;"><strong>UN SDGs Directly Supported by this Project:</strong></div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
                ${(p.sdgs || []).map(num => {
                  const sdg = store.getSDGById(num) || {};
                  return `<span class="badge" style="background:${sdg.color || '#333'}; color:#fff; font-weight:700;">SDG ${num} - ${sdg.name || ''}</span>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Close Scorecard</button>
          ${auth.isMainAdmin() ? `
            <button class="btn btn-brand-red" onclick="ui.closeModals(); ui.showProjectReviewModal('${p.id}');">
              <i data-lucide="file-search"></i> Review Submitted Data
            </button>
          ` : `
            <button class="btn btn-outline" onclick="ui.closeModals(); ui.openProjectDataEntryModal('${p.id}');">
              <i data-lucide="edit-3"></i> Edit Project Data
            </button>
          `}
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  // =========================================================================
  // MODULE 3, 4, 13: PROJECT ESG DATA ENTRY MODAL
  // =========================================================================
  openProjectDataEntryModal(projectId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const proj = store.getProjectById(projectId);
    if (!proj) return;

    const env = proj.environment || {};
    const soc = proj.social || {};
    const gov = proj.governance || {};
    const val = store.validateProjectDataQuality(projectId);

    modalContent.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-draft">${proj.code}</span>
              <h2 class="modal-title" style="margin:0;">Project ESG Data Entry &amp; Submission Workflow</h2>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">
              ${proj.name} | Current Status: <strong>${proj.submissionStatus}</strong>
            </p>
          </div>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          ${proj.reviewerNotes ? `
            <div class="correction-card" style="margin-bottom:16px;">
              <div class="correction-badge-title"><i data-lucide="alert-triangle"></i> Reviewer Remarks:</div>
              <div class="correction-comment">${proj.reviewerNotes}</div>
            </div>
          ` : ''}

          <!-- Live Quality Indicator Bar -->
          <div class="data-quality-box" style="margin-bottom:16px;" id="project-live-quality-box">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:700;"><i data-lucide="shield-check"></i> Field Data Quality Score: <strong id="live-proj-quality-pct">${val.qualityScore}%</strong></span>
              <span class="badge ${val.qualityScore >= 80 ? 'badge-approved' : 'badge-correction-required'}" id="live-proj-quality-badge">${val.qualityScore >= 80 ? 'Audit Ready' : 'Incomplete'}</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;" id="live-proj-missing-text">
              ${val.missingFields.length > 0 ? `Missing fields: ${val.missingFields.join(', ')}` : 'All mandatory fields entered.'}
            </div>
          </div>

          <form id="form-project-esg" onsubmit="event.preventDefault();">
            <!-- Tabs for Data Entry -->
            <div class="tab-nav" style="margin-bottom:16px; display:flex; gap:10px;">
              <button type="button" class="btn btn-sm btn-outline active-filter-btn" id="btn-tab-proj-env" onclick="ui.switchProjectModalTab('env')">
                <i data-lucide="leaf"></i> Environment
              </button>
              <button type="button" class="btn btn-sm btn-outline" id="btn-tab-proj-soc" onclick="ui.switchProjectModalTab('soc')">
                <i data-lucide="users"></i> Social
              </button>
              <button type="button" class="btn btn-sm btn-outline" id="btn-tab-proj-gov" onclick="ui.switchProjectModalTab('gov')">
                <i data-lucide="shield"></i> Governance
              </button>
              <button type="button" class="btn btn-sm btn-outline" id="btn-tab-proj-info" onclick="ui.switchProjectModalTab('info')">
                <i data-lucide="info"></i> General Info
              </button>
            </div>

            <!-- SECTION: ENVIRONMENT -->
            <div id="section-proj-env">
              <h4 style="font-size:13px; font-weight:700; color:#059669; margin-bottom:12px;">Energy &amp; Emissions Disclosures</h4>
              <div class="form-grid" style="margin-bottom:16px;">
                <div class="form-group">
                  <label class="form-label">Electricity Consumption (MWh) <span class="required">*</span></label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-electricity" value="${env.electricityMWh ?? ''}" placeholder="E.g. 1850" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Renewable Electricity (MWh)</label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-renewable-elec" value="${env.renewableElectricityMWh ?? ''}" placeholder="E.g. 550" oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Fuel Consumption (Liters)</label>
                  <input type="number" step="1" min="0" class="form-control proj-input" id="p-fuel" value="${env.fuelLiters ?? ''}" placeholder="E.g. 12000" oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Scope 1 Direct GHG (tCO2e) <span class="required">*</span></label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-scope1" value="${env.scope1 ?? ''}" placeholder="E.g. 450" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Scope 2 Indirect GHG (tCO2e) <span class="required">*</span></label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-scope2" value="${env.scope2 ?? ''}" placeholder="E.g. 1100" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Scope 3 Value Chain GHG (tCO2e)</label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-scope3" value="${env.scope3 ?? ''}" placeholder="E.g. 850" oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
              </div>

              <h4 style="font-size:13px; font-weight:700; color:#0284c7; margin-bottom:12px;">Water &amp; Waste Management</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Water Withdrawal (kL) <span class="required">*</span></label>
                  <input type="number" step="1" min="0" class="form-control proj-input" id="p-water-withdrawal" value="${env.waterWithdrawalKL ?? ''}" placeholder="E.g. 8500" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Water Recycled (kL)</label>
                  <input type="number" step="1" min="0" class="form-control proj-input" id="p-water-recycled" value="${env.waterRecycledKL ?? ''}" placeholder="E.g. 2100" oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Waste Generated (MT) <span class="required">*</span></label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-waste-gen" value="${env.wasteGeneratedMT ?? ''}" placeholder="E.g. 120" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Waste Recycled (MT)</label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-waste-rec" value="${env.wasteRecycledMT ?? ''}" placeholder="E.g. 75" oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Hazardous Waste (MT)</label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-haz-waste" value="${env.hazardousWasteMT ?? ''}" placeholder="E.g. 1.5">
                </div>
                <div class="form-group">
                  <label class="form-label">Environmental Incidents</label>
                  <input type="number" min="0" class="form-control proj-input" id="p-env-incidents" value="${env.environmentalIncidents ?? 0}">
                </div>
              </div>
            </div>

            <!-- SECTION: SOCIAL -->
            <div id="section-proj-soc" style="display:none;">
              <h4 style="font-size:13px; font-weight:700; color:#0284c7; margin-bottom:12px;">Workforce &amp; Diversity</h4>
              <div class="form-grid" style="margin-bottom:16px;">
                <div class="form-group">
                  <label class="form-label">Total Employees <span class="required">*</span></label>
                  <input type="number" min="1" class="form-control proj-input" id="p-total-emp" value="${soc.totalEmployees ?? ''}" placeholder="E.g. 180" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Permanent Employees</label>
                  <input type="number" min="0" class="form-control proj-input" id="p-perm-emp" value="${soc.permanentEmployees ?? ''}" placeholder="E.g. 45">
                </div>
                <div class="form-group">
                  <label class="form-label">Contract Employees</label>
                  <input type="number" min="0" class="form-control proj-input" id="p-contract-emp" value="${soc.contractEmployees ?? ''}" placeholder="E.g. 135">
                </div>
                <div class="form-group">
                  <label class="form-label">Women Employees <span class="required">*</span></label>
                  <input type="number" min="0" class="form-control proj-input" id="p-women-emp" value="${soc.womenEmployees ?? ''}" placeholder="E.g. 24" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Training Hours per Emp <span class="required">*</span></label>
                  <input type="number" step="0.5" min="0" class="form-control proj-input" id="p-training-hrs" value="${soc.trainingHoursPerEmployee ?? ''}" placeholder="E.g. 28.5" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Safety Training Coverage (%)</label>
                  <input type="number" min="0" max="100" class="form-control proj-input" id="p-safety-cov" value="${soc.safetyTrainingCoveragePercent ?? 95}">
                </div>
              </div>

              <h4 style="font-size:13px; font-weight:700; color:#dc2626; margin-bottom:12px;">Health, Safety &amp; Community</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Lost Time Injury Rate (LTIFR) <span class="required">*</span></label>
                  <input type="number" step="0.01" min="0" class="form-control proj-input" id="p-ltifr" value="${soc.ltifr ?? ''}" placeholder="E.g. 0.12" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Fatalities <span class="required">*</span></label>
                  <input type="number" min="0" class="form-control proj-input" id="p-fatalities" value="${soc.fatalities ?? 0}" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Recordable Incidents</label>
                  <input type="number" min="0" class="form-control proj-input" id="p-recordable" value="${soc.recordableIncidents ?? 0}">
                </div>
                <div class="form-group">
                  <label class="form-label">CSR Community Spend (Lakhs INR)</label>
                  <input type="number" step="0.1" min="0" class="form-control proj-input" id="p-csr-spend" value="${soc.csrSpendLakhs ?? 0}">
                </div>
                <div class="form-group">
                  <label class="form-label">Grievances Received / Resolved</label>
                  <div style="display:flex; gap:8px;">
                    <input type="number" min="0" class="form-control" id="p-griev-rec" value="${soc.grievancesReceived ?? 0}" placeholder="Rec">
                    <input type="number" min="0" class="form-control" id="p-griev-res" value="${soc.grievancesResolved ?? 0}" placeholder="Res">
                  </div>
                </div>
              </div>
            </div>

            <!-- SECTION: GOVERNANCE -->
            <div id="section-proj-gov" style="display:none;">
              <h4 style="font-size:13px; font-weight:700; color:#7c3aed; margin-bottom:12px;">Policies, Ethics &amp; Compliance</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">ESG Policy Implemented <span class="required">*</span></label>
                  <select class="form-control proj-input" id="p-policy-imp">
                    <option value="true" ${gov.policyImplementation ? 'selected' : ''}>Yes - Fully Adopted</option>
                    <option value="false" ${!gov.policyImplementation ? 'selected' : ''}>No - Pending</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Anti-Corruption Training (%) <span class="required">*</span></label>
                  <input type="number" min="0" max="100" class="form-control proj-input" id="p-anticorrupt" value="${gov.antiCorruptionTrainingPercent ?? 100}" required oninput="ui.calculateRealtimeQuality('${projectId}')">
                </div>
                <div class="form-group">
                  <label class="form-label">Whistleblower Hotline <span class="required">*</span></label>
                  <select class="form-control proj-input" id="p-whistleblower">
                    <option value="true" ${gov.whistleblowerMechanism ? 'selected' : ''}>Active &amp; Operational</option>
                    <option value="false" ${!gov.whistleblowerMechanism ? 'selected' : ''}>Inactive</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Compliance Status <span class="required">*</span></label>
                  <input type="text" class="form-control proj-input" id="p-compliance" value="${gov.complianceStatus || '100% Fully Compliant'}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Governance / Legal Incidents</label>
                  <input type="number" min="0" class="form-control proj-input" id="p-gov-incidents" value="${gov.governanceIncidents ?? 0}">
                </div>
                <div class="form-group">
                  <label class="form-label">Cybersecurity Audit</label>
                  <input type="text" class="form-control proj-input" id="p-cyber" value="${gov.cybersecurityAudit || 'Compliant (FY26 Audit Cleared)'}">
                </div>
              </div>
            </div>

            <!-- SECTION: GENERAL INFO -->
            <div id="section-proj-info" style="display:none;">
              <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); margin-bottom:12px;">Project Metadata</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Project Code</label>
                  <input type="text" class="form-control" value="${proj.code}" disabled>
                </div>
                <div class="form-group">
                  <label class="form-label">Project Name</label>
                  <input type="text" class="form-control" id="p-name" value="${proj.name}">
                </div>
                <div class="form-group">
                  <label class="form-label">Country</label>
                  <input type="text" class="form-control" id="p-country" value="${proj.country}">
                </div>
                <div class="form-group">
                  <label class="form-label">State / Province</label>
                  <input type="text" class="form-control" id="p-state" value="${proj.state}">
                </div>
                <div class="form-group">
                  <label class="form-label">City</label>
                  <input type="text" class="form-control" id="p-city" value="${proj.city}">
                </div>
                <div class="form-group">
                  <label class="form-label">Project Manager</label>
                  <input type="text" class="form-control" id="p-manager" value="${proj.projectManager || ''}">
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:space-between;">
          <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-outline" onclick="ui.saveProjectDataForm('${projectId}', false)">
              <i data-lucide="save"></i> Save Draft
            </button>
            <button type="button" class="btn btn-brand-red" onclick="ui.saveProjectDataForm('${projectId}', true)">
              <i data-lucide="send"></i> Validate &amp; Submit for Review
            </button>
          </div>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  switchProjectModalTab(tab) {
    ['env', 'soc', 'gov', 'info'].forEach(t => {
      const section = document.getElementById(`section-proj-${t}`);
      const btn = document.getElementById(`btn-tab-proj-${t}`);
      if (section) section.style.display = t === tab ? '' : 'none';
      if (btn) {
        if (t === tab) {
          btn.classList.add('active-filter-btn');
          btn.classList.remove('btn-outline');
          btn.classList.add('btn-primary');
        } else {
          btn.classList.remove('active-filter-btn');
          btn.classList.add('btn-outline');
          btn.classList.remove('btn-primary');
        }
      }
    });
  }

  calculateRealtimeQuality(projectId) {
    const electricity = parseFloat(document.getElementById('p-electricity')?.value) || 0;
    const scope1 = parseFloat(document.getElementById('p-scope1')?.value) || 0;
    const scope2 = parseFloat(document.getElementById('p-scope2')?.value) || 0;
    const water = parseFloat(document.getElementById('p-water-withdrawal')?.value) || 0;
    const waste = parseFloat(document.getElementById('p-waste-gen')?.value) || 0;
    const totalEmp = parseInt(document.getElementById('p-total-emp')?.value) || 0;
    const womenEmp = parseInt(document.getElementById('p-women-emp')?.value) || 0;
    const training = parseFloat(document.getElementById('p-training-hrs')?.value) || 0;
    const ltifr = parseFloat(document.getElementById('p-ltifr')?.value) || 0;

    let score = 0;
    const missing = [];

    if (electricity > 0) score += 10; else missing.push('Electricity');
    if (scope1 > 0) score += 12; else missing.push('Scope 1');
    if (scope2 > 0) score += 12; else missing.push('Scope 2');
    if (water > 0) score += 10; else missing.push('Water');
    if (waste > 0) score += 10; else missing.push('Waste');
    if (totalEmp > 0) score += 12; else missing.push('Workforce');
    if (womenEmp >= 0) score += 10; else missing.push('Women Emp');
    if (training > 0) score += 12; else missing.push('Training');
    if (ltifr >= 0) score += 12; else missing.push('LTIFR');

    const pctEl = document.getElementById('live-proj-quality-pct');
    const badgeEl = document.getElementById('live-proj-quality-badge');
    const missingEl = document.getElementById('live-proj-missing-text');

    if (pctEl) pctEl.textContent = `${score}%`;
    if (badgeEl) {
      badgeEl.className = `badge ${score >= 80 ? 'badge-approved' : 'badge-correction-required'}`;
      badgeEl.textContent = score >= 80 ? 'Audit Ready' : 'Incomplete';
    }
    if (missingEl) {
      missingEl.textContent = missing.length > 0 ? `Missing fields: ${missing.join(', ')}` : 'All mandatory fields entered.';
    }
  }

  saveProjectDataForm(projectId, isSubmit = false) {
    const electricityMWh = parseFloat(document.getElementById('p-electricity')?.value) || 0;
    const renewableElectricityMWh = parseFloat(document.getElementById('p-renewable-elec')?.value) || 0;
    const fuelLiters = parseFloat(document.getElementById('p-fuel')?.value) || 0;
    const scope1 = parseFloat(document.getElementById('p-scope1')?.value) || 0;
    const scope2 = parseFloat(document.getElementById('p-scope2')?.value) || 0;
    const scope3 = parseFloat(document.getElementById('p-scope3')?.value) || 0;
    const waterWithdrawalKL = parseFloat(document.getElementById('p-water-withdrawal')?.value) || 0;
    const waterRecycledKL = parseFloat(document.getElementById('p-water-recycled')?.value) || 0;
    const wasteGeneratedMT = parseFloat(document.getElementById('p-waste-gen')?.value) || 0;
    const wasteRecycledMT = parseFloat(document.getElementById('p-waste-rec')?.value) || 0;
    const hazardousWasteMT = parseFloat(document.getElementById('p-haz-waste')?.value) || 0;
    const environmentalIncidents = parseInt(document.getElementById('p-env-incidents')?.value) || 0;

    const totalEmployees = parseInt(document.getElementById('p-total-emp')?.value) || 0;
    const permanentEmployees = parseInt(document.getElementById('p-perm-emp')?.value) || 0;
    const contractEmployees = parseInt(document.getElementById('p-contract-emp')?.value) || 0;
    const womenEmployees = parseInt(document.getElementById('p-women-emp')?.value) || 0;
    const trainingHoursPerEmployee = parseFloat(document.getElementById('p-training-hrs')?.value) || 0;
    const safetyTrainingCoveragePercent = parseFloat(document.getElementById('p-safety-cov')?.value) || 0;
    const ltifr = parseFloat(document.getElementById('p-ltifr')?.value) || 0;
    const fatalities = parseInt(document.getElementById('p-fatalities')?.value) || 0;
    const recordableIncidents = parseInt(document.getElementById('p-recordable')?.value) || 0;
    const csrSpendLakhs = parseFloat(document.getElementById('p-csr-spend')?.value) || 0;
    const grievancesReceived = parseInt(document.getElementById('p-griev-rec')?.value) || 0;
    const grievancesResolved = parseInt(document.getElementById('p-griev-res')?.value) || 0;

    const policyImplementation = document.getElementById('p-policy-imp')?.value === 'true';
    const antiCorruptionTrainingPercent = parseFloat(document.getElementById('p-anticorrupt')?.value) || 0;
    const whistleblowerMechanism = document.getElementById('p-whistleblower')?.value === 'true';
    const complianceStatus = document.getElementById('p-compliance')?.value || '100% Fully Compliant';
    const governanceIncidents = parseInt(document.getElementById('p-gov-incidents')?.value) || 0;
    const cybersecurityAudit = document.getElementById('p-cyber')?.value || 'Compliant';

    // Frontend Negative Value Validation (Module 13)
    if (electricityMWh < 0 || scope1 < 0 || scope2 < 0 || waterWithdrawalKL < 0 || totalEmployees < 0 || fatalities < 0) {
      this.showToast("Validation Error: Negative values are not permitted for environmental or safety metrics.", "danger");
      return;
    }

    const payload = {
      environment: {
        electricityMWh,
        renewableElectricityMWh,
        fuelLiters,
        scope1,
        scope2,
        scope3,
        waterWithdrawalKL,
        waterRecycledKL,
        wasteGeneratedMT,
        wasteRecycledMT,
        hazardousWasteMT,
        environmentalIncidents
      },
      social: {
        totalEmployees,
        permanentEmployees,
        contractEmployees,
        womenEmployees,
        trainingHoursPerEmployee,
        safetyTrainingCoveragePercent,
        ltifr,
        fatalities,
        recordableIncidents,
        csrSpendLakhs,
        grievancesReceived,
        grievancesResolved
      },
      governance: {
        policyImplementation,
        antiCorruptionTrainingPercent,
        whistleblowerMechanism,
        complianceStatus,
        governanceIncidents,
        cybersecurityAudit
      }
    };

    if (isSubmit) {
      workflow.submitProjectData(projectId, payload);
    } else {
      workflow.saveProjectDraft(projectId, payload);
    }

    this.closeModals();
    this.renderCurrentView();
  }

  // =========================================================================
  // MODULE 4: PROJECT REVIEW & APPROVAL MODAL (Main Admin - Read Only Review Mode)
  // =========================================================================
  showProjectReviewModal(projectId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const scorecard = store.calculateProjectScorecard(projectId);
    if (!scorecard) return;

    const p = scorecard.project;
    const env = scorecard.environment || {};
    const soc = scorecard.social || {};
    const gov = scorecard.governance || {};
    const q = scorecard.dataQuality;
    const isApproved = p.submissionStatus === 'Approved';

    modalContent.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${isApproved ? 'badge-approved' : 'badge-submitted'}">${p.code}</span>
              <h2 class="modal-title" style="margin:0;">Project ESG Review &amp; Verification Mode</h2>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">
              <strong>Project:</strong> ${p.name} | <strong>Subsidiary:</strong> ${scorecard.subsidiary?.name} | <strong>BU:</strong> ${scorecard.businessUnit?.name} | <strong>Location:</strong> ${p.location} ${this.getLocationBadge(p)}
            </p>
          </div>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>

        <div class="modal-body">
          <!-- Status Banner & Workflow Tracking Info -->
          <div class="alert ${isApproved ? 'alert-success' : 'alert-info'}" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong>Workflow Status:</strong> ${this.getStatusBadge(p.submissionStatus)}
                <span style="margin-left:12px; font-size:12px;"><strong>Consolidation Status:</strong> ${this.getConsolidationBadge(isApproved)}</span>
              </div>
              <div style="font-size:12px; color:var(--text-secondary);">
                <span><strong>Last Updated:</strong> ${p.lastUpdated || p.submissionDate || 'Recently'}</span>
                ${p.submittedBy ? `<span style="margin-left:8px;">| <strong>Submitted By:</strong> ${p.submittedBy}</span>` : ''}
                ${p.reviewerName ? `<span style="margin-left:8px;">| <strong>Reviewed By:</strong> ${p.reviewerName}</span>` : ''}
              </div>
            </div>
          </div>

          ${p.reviewerComments ? `
            <div class="correction-card" style="margin-bottom:16px;">
              <div class="correction-badge-title"><i data-lucide="message-square"></i> Last Reviewer Feedback / Remarks:</div>
              <div class="correction-comment">${p.reviewerComments}</div>
              ${p.reviewerDate ? `<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Recorded on ${p.reviewerDate} by ${p.reviewerName || 'Main Company Admin'}</div>` : ''}
            </div>
          ` : ''}

          <!-- Live Quality & Completeness Audit -->
          <div class="data-quality-box" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:700;"><i data-lucide="shield-check"></i> Field Data Completeness &amp; Quality: <strong>${q.qualityScore}%</strong></span>
              <span class="badge ${q.qualityScore >= 80 ? 'badge-approved' : 'badge-correction-required'}">${q.qualityScore >= 80 ? 'Audit Ready' : 'Incomplete'}</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
              ${q.missingFields.length > 0 ? `<span style="color:#b45309;">Missing / Incomplete fields (${q.missingFields.length}): ${q.missingFields.join(', ')}</span>` : '<span style="color:#047857;"><i data-lucide="check"></i> All required environmental, social, and governance disclosures are complete.</span>'}
            </div>
          </div>

          <!-- Review Tabs Navigation (Read-Only) -->
          <div class="tab-nav" style="margin-bottom:16px; display:flex; gap:10px;">
            <button type="button" class="btn btn-sm btn-primary active-filter-btn" id="btn-tab-rev-env" onclick="ui.switchProjectReviewTab('env')">
              <i data-lucide="leaf"></i> Environment
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btn-tab-rev-soc" onclick="ui.switchProjectReviewTab('soc')">
              <i data-lucide="users"></i> Social
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btn-tab-rev-gov" onclick="ui.switchProjectReviewTab('gov')">
              <i data-lucide="shield"></i> Governance
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btn-tab-rev-info" onclick="ui.switchProjectReviewTab('info')">
              <i data-lucide="info"></i> General Info &amp; SDGs
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btn-tab-rev-audit" onclick="ui.switchProjectReviewTab('audit')">
              <i data-lucide="history"></i> Audit Trail
            </button>
          </div>

          <!-- SECTION: REVIEW ENVIRONMENT -->
          <div id="section-rev-env">
            <h4 style="font-size:13px; font-weight:700; color:#059669; margin-bottom:12px;"><i data-lucide="leaf"></i> Energy, Emissions &amp; Decarbonization (Submitted Values)</h4>
            <div class="form-grid" style="margin-bottom:16px;">
              <div class="form-group">
                <label class="form-label">Electricity Consumption (MWh)</label>
                <input type="text" class="form-control" value="${(env.electricityMWh ?? 0).toLocaleString()} MWh" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Renewable Electricity (MWh)</label>
                <input type="text" class="form-control" value="${(env.renewableElectricityMWh ?? 0).toLocaleString()} MWh" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Fuel Consumption (Liters)</label>
                <input type="text" class="form-control" value="${(env.fuelLiters ?? 0).toLocaleString()} L" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Scope 1 Direct GHG (tCO2e)</label>
                <input type="text" class="form-control" value="${(env.scope1 ?? 0).toLocaleString()} tCO2e" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Scope 2 Indirect GHG (tCO2e)</label>
                <input type="text" class="form-control" value="${(env.scope2 ?? 0).toLocaleString()} tCO2e" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Scope 3 Value Chain GHG (tCO2e)</label>
                <input type="text" class="form-control" value="${(env.scope3 ?? 0).toLocaleString()} tCO2e" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
            </div>

            <h4 style="font-size:13px; font-weight:700; color:#0284c7; margin-bottom:12px;"><i data-lucide="droplet"></i> Water Stewardship &amp; Waste Management</h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Water Withdrawal (kL)</label>
                <input type="text" class="form-control" value="${(env.waterWithdrawalKL ?? 0).toLocaleString()} kL" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Water Recycled (kL)</label>
                <input type="text" class="form-control" value="${(env.waterRecycledKL ?? 0).toLocaleString()} kL" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Waste Generated (MT)</label>
                <input type="text" class="form-control" value="${(env.wasteGeneratedMT ?? 0).toLocaleString()} MT" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Waste Recycled (MT)</label>
                <input type="text" class="form-control" value="${(env.wasteRecycledMT ?? 0).toLocaleString()} MT" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Hazardous Waste (MT)</label>
                <input type="text" class="form-control" value="${(env.hazardousWasteMT ?? 0).toLocaleString()} MT" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Environmental Incidents</label>
                <input type="text" class="form-control" value="${env.environmentalIncidents ?? 0}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
            </div>
          </div>

          <!-- SECTION: REVIEW SOCIAL -->
          <div id="section-rev-soc" style="display:none;">
            <h4 style="font-size:13px; font-weight:700; color:#0284c7; margin-bottom:12px;"><i data-lucide="users"></i> Workforce &amp; Diversity Disclosures</h4>
            <div class="form-grid" style="margin-bottom:16px;">
              <div class="form-group">
                <label class="form-label">Total Workforce</label>
                <input type="text" class="form-control" value="${(soc.totalEmployees ?? 0).toLocaleString()} Employees" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Permanent Employees</label>
                <input type="text" class="form-control" value="${(soc.permanentEmployees ?? 0).toLocaleString()}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Contract Employees</label>
                <input type="text" class="form-control" value="${(soc.contractEmployees ?? 0).toLocaleString()}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Women Employees</label>
                <input type="text" class="form-control" value="${soc.womenEmployees ?? 0} (${Math.round(((soc.womenEmployees||0)/(soc.totalEmployees||1))*100)}%)" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Training Hours per Employee</label>
                <input type="text" class="form-control" value="${soc.trainingHoursPerEmployee ?? 0} hrs/emp" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Safety Training Coverage (%)</label>
                <input type="text" class="form-control" value="${soc.safetyTrainingCoveragePercent ?? 95}%" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
            </div>

            <h4 style="font-size:13px; font-weight:700; color:#dc2626; margin-bottom:12px;"><i data-lucide="heart-pulse"></i> Occupational Health, Safety &amp; Community</h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Lost Time Injury Frequency (LTIFR)</label>
                <input type="text" class="form-control" value="${soc.ltifr ?? 0}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Fatalities</label>
                <input type="text" class="form-control" value="${soc.fatalities ?? 0}" readonly style="background:#f1f5f9; font-weight:600; color:${(soc.fatalities || 0) > 0 ? '#dc2626' : 'inherit'};">
              </div>
              <div class="form-group">
                <label class="form-label">Recordable Incidents</label>
                <input type="text" class="form-control" value="${soc.recordableIncidents ?? 0}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">CSR Community Spend (Lakhs INR)</label>
                <input type="text" class="form-control" value="INR ${soc.csrSpendLakhs ?? 0} L" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Grievances Received / Resolved</label>
                <input type="text" class="form-control" value="${soc.grievancesReceived ?? 0} Received / ${soc.grievancesResolved ?? 0} Resolved" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
            </div>
          </div>

          <!-- SECTION: REVIEW GOVERNANCE -->
          <div id="section-rev-gov" style="display:none;">
            <h4 style="font-size:13px; font-weight:700; color:#7c3aed; margin-bottom:12px;"><i data-lucide="shield"></i> Governance, Ethics &amp; Statutory Compliance</h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">ESG Policy Implemented</label>
                <input type="text" class="form-control" value="${gov.policyImplementation ? 'Yes - Fully Adopted' : 'No - Pending'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Anti-Corruption Training (%)</label>
                <input type="text" class="form-control" value="${gov.antiCorruptionTrainingPercent ?? 100}% Staff Trained" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Whistleblower Hotline Mechanism</label>
                <input type="text" class="form-control" value="${gov.whistleblowerMechanism ? 'Active & Operational' : 'Inactive'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Statutory Compliance Status</label>
                <input type="text" class="form-control" value="${gov.complianceStatus || '100% Fully Compliant'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Governance / Legal Incidents</label>
                <input type="text" class="form-control" value="${gov.governanceIncidents ?? 0}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Cybersecurity Audit</label>
                <input type="text" class="form-control" value="${gov.cybersecurityAudit || 'Compliant (Audit Cleared)'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
            </div>
          </div>

          <!-- SECTION: REVIEW GENERAL INFO & SDGS -->
          <div id="section-rev-info" style="display:none;">
            <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); margin-bottom:12px;"><i data-lucide="info"></i> Project Hierarchy &amp; Metadata</h4>
            <div class="form-grid" style="margin-bottom:16px;">
              <div class="form-group">
                <label class="form-label">Project Code</label>
                <input type="text" class="form-control" value="${p.code}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Project Name</label>
                <input type="text" class="form-control" value="${p.name}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Subsidiary</label>
                <input type="text" class="form-control" value="${scorecard.subsidiary?.name || 'MEIL'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Business Unit</label>
                <input type="text" class="form-control" value="${scorecard.businessUnit?.name || 'Operations'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Location / Country</label>
                <input type="text" class="form-control" value="${p.location}, ${p.country || 'India'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
              <div class="form-group">
                <label class="form-label">Project Scope</label>
                <input type="text" class="form-control" value="${p.isInternational ? 'International / Overseas' : 'India Domestic'}" readonly style="background:#f1f5f9; font-weight:600;">
              </div>
            </div>

            <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); margin-bottom:8px;"><i data-lucide="globe"></i> UN SDGs Directly Supported</h4>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${(p.sdgs || []).map(num => {
                const sdg = store.getSDGById(num) || {};
                return `<span class="badge" style="background:${sdg.color || '#333'}; color:#fff; font-weight:700; padding:6px 10px;">SDG ${num} - ${sdg.name || ''}</span>`;
              }).join('')}
            </div>
          </div>

          <!-- SECTION: AUDIT TRAIL -->
          <div id="section-rev-audit" style="display:none;">
            <h4 style="font-size:13px; font-weight:700; color:var(--meil-navy); margin-bottom:12px;"><i data-lucide="history"></i> Submission &amp; Audit Trail History</h4>
            <div class="table-responsive">
              <table class="table" style="font-size:12px;">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor / Reviewer</th>
                    <th>Audit Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${(p.correctionHistory && p.correctionHistory.length > 0) ? p.correctionHistory.map(h => `
                    <tr>
                      <td>${h.date}</td>
                      <td><span class="badge badge-warning">${h.action}</span></td>
                      <td><strong>${h.reviewer}</strong></td>
                      <td>${h.note}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td>${p.lastUpdated || 'Initial'}</td>
                      <td><span class="badge badge-submitted">Filing Recorded</span></td>
                      <td>${p.submittedBy || 'Sub-Company Admin'}</td>
                      <td>Initial project data entered and validated.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Reviewer Action Comments Field (Mandatory for Correction/Reject) -->
          <div class="form-group" style="margin-top:16px;">
            <label class="form-label" style="font-weight:700;">
              <i data-lucide="message-square"></i> Main Company Admin Review Feedback / Correction Remarks:
            </label>
            <textarea id="proj-review-notes" class="form-control" rows="3" placeholder="Enter specific verification remarks, reason for approval, or detailed instructions for required corrections..."></textarea>
          </div>
        </div>

        <div class="modal-footer" style="display:flex; justify-content:space-between;">
          <button class="btn btn-secondary" onclick="ui.closeModals()">Close</button>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-danger" onclick="const notes = document.getElementById('proj-review-notes')?.value; workflow.rejectProjectSubmission('${projectId}', 'FY 2025-26', notes); ui.closeModals(); ui.renderCurrentView();" title="Reject project filing">
              <i data-lucide="x-circle"></i> Reject Filing
            </button>
            <button class="btn btn-outline" style="border-color:#d97706; color:#d97706;" onclick="const notes = document.getElementById('proj-review-notes')?.value; workflow.requestProjectCorrection('${projectId}', 'FY 2025-26', notes); ui.closeModals(); ui.renderCurrentView();" title="Request specific corrections from Sub-Company Admin">
              <i data-lucide="alert-triangle"></i> Request Correction
            </button>
            <button class="btn btn-brand-red" onclick="const notes = document.getElementById('proj-review-notes')?.value; workflow.approveProjectSubmission('${projectId}', 'FY 2025-26', notes); ui.closeModals(); ui.renderCurrentView();" title="Approve and include in MEIL Consolidated Metrics">
              <i data-lucide="check-check"></i> Approve &amp; Consolidate
            </button>
          </div>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  switchProjectReviewTab(tab) {
    ['env', 'soc', 'gov', 'info', 'audit'].forEach(t => {
      const section = document.getElementById(`section-rev-${t}`);
      const btn = document.getElementById(`btn-tab-rev-${t}`);
      if (section) section.style.display = t === tab ? '' : 'none';
      if (btn) {
        if (t === tab) {
          btn.classList.add('active-filter-btn', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active-filter-btn', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      }
    });
    this.refreshIcons();
  }

  // =========================================================================
  // MODULE 5, 6, 7: BUSINESS UNIT ESG CENTER & ROLLUP
  // =========================================================================
  getTemplateBusinessUnits() {
    const isMain = auth.isMainAdmin();
    const subs = store.getSubsidiaries();
    const selectedSub = isMain ? (this.activeSubsidiaryFilter || 'all') : auth.getActiveSubsidiaryId();
    const bus = store.getBusinessUnits(selectedSub === 'all' ? null : selectedSub);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            <i data-lucide="network" style="color:var(--meil-navy)"></i>
            ${isMain ? 'Business Unit ESG Monitoring' : 'My BU ESG'}
          </h1>
          <p class="page-subtitle">
            Operational BU-level performance, bottom-up project consolidation, and pillar readiness
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="reportEngine.exportReportToExcel('Business Unit ESG Performance Report', '${this.activeYearFilter}')" title="Export BU Report">
            <i data-lucide="file-spreadsheet"></i> Export BU Report (.xls)
          </button>
          <button class="btn btn-brand-red" onclick="ui.navigateTo('projects')">
            <i data-lucide="hard-hat"></i> Inspect Project Nodes
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar" style="margin-bottom:20px;">
        <div class="filter-group">
          ${isMain ? `
            <span class="filter-label"><i data-lucide="building"></i> Subsidiary Scope:</span>
            <select class="filter-select" id="bu-sub-filter" onchange="ui.activeSubsidiaryFilter = this.value; ui.renderCurrentView();">
              <option value="all" ${selectedSub === 'all' ? 'selected' : ''}>All Subsidiaries (12 BUs)</option>
              ${subs.map(s => `<option value="${s.id}" ${selectedSub === s.id ? 'selected' : ''}>${s.shortName}</option>`).join('')}
            </select>
          ` : `
            <span class="badge badge-approved"><i data-lucide="building"></i> ${auth.getActiveSubsidiary()?.shortName} Business Units</span>
          `}
        </div>

        <div class="filter-group">
          <span style="font-size:12px; color:var(--text-muted);">
            Bottom-Up Consolidation Rule: <strong>Only Approved Projects</strong> aggregate into BU totals
          </span>
        </div>
      </div>

      <!-- BU Comparison Chart -->
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bar-chart-3"></i> Business Unit Comparative ESG Completion (%)</h3>
          <span class="badge badge-approved">Pillar Benchmarking</span>
        </div>
        <div class="card-body" style="height:300px;">
          <canvas id="chart-bu-comparison"></canvas>
        </div>
      </div>

      <!-- Business Units Cards Grid -->
      <div class="grid-2-col" id="bu-grid-container">
        ${bus.map(bu => {
          const sub = store.getSubsidiaryById(bu.subsidiaryId) || {};
          const esgSummary = store.getBusinessUnitESG(bu.id, this.activeYearFilter);
          const projects = esgSummary.projects || [];
          const approvedCount = esgSummary.approvedProjectCount || 0;
          const isConsolidated = approvedCount > 0;

          return `
            <div class="card bu-card" style="border-top: 4px solid var(--meil-navy);">
              <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <h3 class="card-title" style="margin:0; font-size:16px;">${bu.name}</h3>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                    ${sub.name} (${sub.shortName}) | Head: <strong>${bu.head}</strong>
                  </div>
                </div>
                ${this.getConsolidationBadge(isConsolidated)}
              </div>
              <div class="card-body">
                <!-- Project Counts & Rates -->
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:16px; background:#f8fafc; padding:10px; border-radius:6px; text-align:center;">
                  <div>
                    <span style="font-size:10px; color:var(--text-muted); font-weight:700;">TOTAL PROJECTS</span>
                    <strong style="display:block; font-size:16px; color:var(--meil-navy);">${projects.length}</strong>
                  </div>
                  <div>
                    <span style="font-size:10px; color:var(--text-muted); font-weight:700;">APPROVED SITES</span>
                    <strong style="display:block; font-size:16px; color:#059669;">${approvedCount}</strong>
                  </div>
                  <div>
                    <span style="font-size:10px; color:var(--text-muted); font-weight:700;">ESG READY</span>
                    <strong style="display:block; font-size:16px; color:#2563eb;">${esgSummary.esgCompletion}%</strong>
                  </div>
                </div>

                <!-- Aggregated Operational Metrics -->
                <h4 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">
                  Aggregated Metrics (Approved Projects Only)
                </h4>
                <div style="font-size:12px; display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:16px;">
                  <div>Electricity: <strong>${(esgSummary.electricityMWh || 0).toLocaleString()} MWh</strong></div>
                  <div>Scope 1 GHG: <strong>${(esgSummary.scope1 || 0).toLocaleString()} tCO2e</strong></div>
                  <div>Water Usage: <strong>${(esgSummary.waterKL || 0).toLocaleString()} kL</strong></div>
                  <div>Total Workforce: <strong>${(esgSummary.employees || 0).toLocaleString()}</strong></div>
                </div>

                <!-- Linked SDGs -->
                <div style="margin-bottom:12px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted);">PRIORITY SDGs:</span>
                  <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">
                    ${(bu.sdgs || []).map(num => {
                      const sdg = store.getSDGById(num) || {};
                      return `<span class="badge" style="background:${sdg.color || '#333'}; color:#fff; font-size:10px; font-weight:700;">SDG ${num}</span>`;
                    }).join('')}
                  </div>
                </div>

                <!-- Projects List in this BU -->
                <div style="border-top:1px solid var(--border-color); padding-top:10px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted);">FIELD PROJECTS (${projects.length}):</span>
                  <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
                    ${projects.map(p => `
                      <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid #e2e8f0; padding:6px 10px; border-radius:4px; font-size:12px;">
                        <div>
                          <strong>${p.code}</strong> - ${p.name.slice(0, 24)}...
                          ${this.getLocationBadge(p)}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                          ${this.getStatusBadge(p.submissionStatus)}
                          <button class="btn btn-sm btn-outline" style="padding:2px 6px;" onclick="ui.showProjectScorecardModal('${p.id}')">
                            <i data-lucide="eye" style="width:12px;height:12px;"></i>
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  postRenderBusinessUnits() {
    chartEngine.renderBUComparisonChart('chart-bu-comparison', this.activeSubsidiaryFilter || 'all');
    this.refreshIcons();
  }

  // =========================================================================
  // MODULE 9: INTERNATIONAL & DOMESTIC PROJECT MODAL CREATION
  // =========================================================================
  showAddProjectModal(subsidiaryId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-dialog-content');
    if (!modalBackdrop || !modalContent) return;

    const subs = store.getSubsidiaries();
    const activeSubId = subsidiaryId || subs[0]?.id || 'sub-1';
    const bus = store.getBusinessUnits(activeSubId);

    modalContent.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title"><i data-lucide="folder-kanban"></i> Add Project Node (India / International)</h2>
          <button class="modal-close-btn" onclick="ui.closeModals()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <form id="form-create-project" onsubmit="event.preventDefault(); ui.createProject();">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Parent Subsidiary <span class="required">*</span></label>
              <select id="proj-sub" class="form-control" onchange="ui.updateBUMenu(this.value)">
                ${subs.map(s => `<option value="${s.id}" ${s.id === activeSubId ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Assigned Business Unit <span class="required">*</span></label>
              <select id="proj-bu" class="form-control">
                ${bus.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Project Code <span class="required">*</span></label>
              <input type="text" id="proj-code" class="form-control" placeholder="E.g. MEIL-IN-17 or MEIL-INT-02" required>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Project Name <span class="required">*</span></label>
              <input type="text" id="proj-name" class="form-control" placeholder="E.g. Regional Clean Energy Infrastructure" required>
            </div>

            <!-- Geographic Configuration (India vs International) -->
            <div class="card" style="background:#f8fafc; padding:10px; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <input type="checkbox" id="proj-is-intl" onchange="ui.toggleIntlFields(this.checked)">
                <label for="proj-is-intl" style="font-weight:700; font-size:13px; cursor:pointer;">
                  <i data-lucide="globe"></i> This is an International (Overseas) Project
                </label>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Country <span class="required">*</span></label>
                  <input type="text" id="proj-country" class="form-control" value="India" required>
                </div>
                <div class="form-group">
                  <label class="form-label">State / Region / Province <span class="required">*</span></label>
                  <input type="text" id="proj-state" class="form-control" placeholder="E.g. Telangana or Al Ahmadi" required>
                </div>
                <div class="form-group">
                  <label class="form-label">City / Site <span class="required">*</span></label>
                  <input type="text" id="proj-city" class="form-control" placeholder="E.g. Hyderabad or Ahmadi" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Project Manager</label>
                  <input type="text" id="proj-mgr" class="form-control" placeholder="E.g. Rajesh Reddy">
                </div>
              </div>
            </div>

            <div class="modal-footer" style="padding:12px 0 0 0;">
              <button type="button" class="btn btn-secondary" onclick="ui.closeModals()">Cancel</button>
              <button type="submit" class="btn btn-brand-red"><i data-lucide="check"></i> Create Project Node</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
    this.refreshIcons();
  }

  updateBUMenu(subsidiaryId) {
    const bus = store.getBusinessUnits(subsidiaryId);
    const buSelect = document.getElementById('proj-bu');
    if (buSelect) {
      buSelect.innerHTML = bus.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }
  }

  toggleIntlFields(isIntl) {
    const countryEl = document.getElementById('proj-country');
    if (countryEl) {
      countryEl.value = isIntl ? '' : 'India';
      countryEl.placeholder = isIntl ? 'E.g. Kuwait, Nepal, UAE' : 'India';
    }
  }

  createProject() {
    const subsidiaryId = document.getElementById('proj-sub')?.value;
    const businessUnitId = document.getElementById('proj-bu')?.value;
    const code = document.getElementById('proj-code')?.value?.trim();
    const name = document.getElementById('proj-name')?.value?.trim();
    const isInternational = document.getElementById('proj-is-intl')?.checked || false;
    const country = document.getElementById('proj-country')?.value?.trim() || (isInternational ? 'International' : 'India');
    const state = document.getElementById('proj-state')?.value?.trim() || '';
    const city = document.getElementById('proj-city')?.value?.trim() || '';
    const projectManager = document.getElementById('proj-mgr')?.value?.trim() || 'Site Incharge';

    if (!code || !name || !country || !city) {
      this.showToast("Please enter project code, name, country, and city", "warning");
      return;
    }

    const newProj = store.addProject({
      subsidiaryId,
      businessUnitId,
      code,
      name,
      country,
      state,
      city,
      location: `${city}, ${state ? state + ', ' : ''}${country}`,
      isInternational,
      projectManager,
      submissionStatus: 'Draft'
    });

    this.closeModals();
    this.showToast(`Project node "${name}" created successfully.`, "success");
    this.renderCurrentView();
  }
}

// Global Singleton UI Instance
const ui = new UIManager();