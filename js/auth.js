/**
 * Role-Based Access Control, Authentication & Session Gate
 * MEIL ESG & BRSR Reporting System
 * 
 * Integrated from Project 2 (Ps08) + Project 1 (Ps08V2)
 * Role 1: MAIN COMPANY ADMIN (Full enterprise oversight, approvals, consolidation, reports)
 * Role 2: SUB-COMPANY ADMIN (Strictly scoped to their assigned subsidiary; cannot view other entities)
 */

class AuthManager {
  constructor() {
    this.storageKey = 'MEIL_ESG_AUTH_SESSION_V2';
    this.session = this.loadSession();
    this.listeners = [];
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load auth session, using default", e);
    }
    // Return null if not logged in (forces login.html via requireAuth)
    return null;
  }

  saveSession() {
    try {
      if (this.session) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.session));
      } else {
        localStorage.removeItem(this.storageKey);
      }
      this.notifyListeners();
    } catch (e) {
      console.error("Error saving auth session", e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(fn => fn(this.session));
  }

  /**
   * Authenticate user credentials against backend REST API or fallback to registered accounts
   */
  async login(email, password) {
    if (!email || !password) {
      return { success: false, message: "Please provide both email and password." };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Authoritative backend authentication ONLY (no offline or hardcoded bypasses)
    try {
      if (typeof api !== 'undefined' && api.login) {
        const apiRes = await api.login(cleanEmail, password);
        if (apiRes.success && apiRes.user) {
          const user = apiRes.user;
          const normalizedRole = (user.role === "MAIN_ADMIN" || user.role === "main_admin") ? "main_admin" : "sub_admin";
          const subId = user.assignedSubsidiaryId || user.subsidiaryId || (normalizedRole === "sub_admin" ? "sub-3" : null);

          this.session = {
            userId: user.userId || user.id,
            name: user.name,
            email: user.email,
            role: normalizedRole,
            rawRole: user.rawRole || user.role,
            title: user.title || (normalizedRole === "main_admin" ? "Main Company Admin" : "Sub-Company Admin"),
            assignedSubsidiaryId: subId,
            loginTimestamp: new Date().toISOString(),
            serverAuthenticated: true
          };

          this.saveSession();
          return { success: true, user: this.session };
        } else if (apiRes.isNetworkError) {
          return { success: false, message: "Unable to connect to the server. Please try again later." };
        } else {
          return { success: false, message: apiRes.message || "Invalid credentials. Please verify your password." };
        }
      } else {
        return { success: false, message: "Unable to connect to the server. Please try again later." };
      }
    } catch (apiErr) {
      console.error("[Auth] Backend login communication error:", apiErr);
      return { success: false, message: "Unable to connect to the server. Please try again later." };
    }
  }

  /**
   * Sign out active session and return to login page
   */
  async logout() {
    if (this.session) {
      if (typeof api !== 'undefined' && api.logout) {
        try { await api.logout(); } catch (e) { /* ignore */ }
      }
      if (typeof store !== 'undefined' && store.addAuditLog) {
        store.addAuditLog(this.session.name, "LOGOUT", `User logged out from session`);
      }
    }
    this.session = null;
    this.saveSession();
    window.location.href = "login.html";
  }

  isAuthenticated() {
    return !!this.session && !!this.session.role;
  }

  /**
   * Route Guard: Ensures visitor is logged in and possesses appropriate privileges
   */
  requireAuth(allowedRoles = []) {
    if (!this.isAuthenticated()) {
      window.location.href = "login.html";
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(this.session.role)) {
      alert("Access Denied: You do not have permission to view this section.");
      if (this.isMainAdmin()) {
        ui.navigateTo('dashboard');
      } else {
        ui.navigateTo('dashboard');
      }
      return null;
    }

    return this.session;
  }

  getCurrentRole() {
    return this.session ? this.session.role : "main_admin";
  }

  isMainAdmin() {
    return this.session ? this.session.role === 'main_admin' : false;
  }

  isSubAdmin() {
    return this.session ? this.session.role === 'sub_admin' : false;
  }

  getActiveSubsidiaryId() {
    if (this.isSubAdmin()) {
      return this.session ? (this.session.assignedSubsidiaryId || 'sub-3') : 'sub-3';
    }
    // Main Company Admin context defaults to null or designated entity
    return this.session ? this.session.assignedSubsidiaryId : null;
  }

  getActiveSubsidiary() {
    const id = this.getActiveSubsidiaryId();
    return id ? store.getSubsidiaryById(id) : null;
  }

  /**
   * Strict Access Control Check:
   * A Sub-Company Admin MUST NOT be able to access another sub-company's private data!
   */
  canAccessSubsidiary(subsidiaryId) {
    if (!subsidiaryId || subsidiaryId === 'all') {
      return this.isMainAdmin();
    }
    if (this.isMainAdmin()) {
      return true;
    }
    // Sub-Company Admin is strictly locked to their session-authenticated assigned subsidiary
    return this.getActiveSubsidiaryId() === subsidiaryId;
  }

  getUserInfo() {
    if (!this.session) {
      return {
        role: 'main_admin',
        name: 'Guest User',
        email: 'guest@meil.in',
        title: 'Visitor'
      };
    }
    return this.session;
  }

  getRoleLabel() {
    return this.isMainAdmin() ? 'Main Company Admin' : 'Sub-Company Admin';
  }

  getScopeLabel() {
    if (this.isMainAdmin()) {
      return 'MEIL Group (Central Oversight)';
    }
    const sub = this.getActiveSubsidiary();
    return sub ? sub.name : 'Assigned Subsidiary';
  }
}

// Global Singleton Auth Instance
const auth = new AuthManager();
window.auth = auth;
