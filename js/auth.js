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
   * Authenticate user credentials against registered accounts in store
   */
  login(email, password) {
    if (!email || !password) {
      return { success: false, message: "Please provide both email and password." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = store.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: "User account with this email address was not found." };
    }

    if (user.status === "INACTIVE" || user.status === "SUSPENDED" || user.accessStatus === "Suspended" || user.accessStatus === "Revoked") {
      return { success: false, message: "Your access has been suspended or deactivated. Contact Main Company Admin." };
    }

    if (user.password !== password) {
      return { success: false, message: "Invalid credentials. Please verify your password." };
    }

    // Determine normalized role
    const normalizedRole = (user.role === "MAIN_ADMIN" || user.role === "main_admin") ? "main_admin" : "sub_admin";
    const subId = user.subsidiaryId || (normalizedRole === "sub_admin" ? "sub-3" : null);

    this.session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: normalizedRole,
      title: user.title || (normalizedRole === "main_admin" ? "Main Company Admin" : "Sub-Company Admin"),
      assignedSubsidiaryId: subId,
      loginTimestamp: new Date().toISOString()
    };

    user.lastLogin = "Just now";
    store.addAuditLog(user.name, "LOGIN", `Successful login as ${normalizedRole === "main_admin" ? "Main Admin" : "Sub Admin"}`);
    this.saveSession();

    return { success: true, user: this.session };
  }

  /**
   * 1-Click login helper for demo experience
   */
  quickLogin(email) {
    return this.login(email, "admin");
  }

  /**
   * Sign out active session and return to login page
   */
  logout() {
    if (this.session) {
      store.addAuditLog(this.session.name, "LOGOUT", `User logged out from session`);
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
