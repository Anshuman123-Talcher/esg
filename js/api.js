/**
 * MEIL Centralized ESG & BRSR REST API Client
 * Connects frontend UI & store to backend Express + PostgreSQL services
 */

class ApiClient {
  constructor() {
    this.baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api'
      : '/api';
    this.tokenKey = 'MEIL_ESG_API_TOKEN';
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerOfflineSync();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(typeof FormData !== 'undefined' && options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        console.warn('[API Client] Unauthorized request or expired session.');
        this.setToken(null);
        // Do not immediately redirect if already on login.html
        if (!window.location.pathname.includes('login.html')) {
          localStorage.removeItem('MEIL_ESG_AUTH_SESSION_V2');
          window.location.href = 'login.html';
        }
        return { success: false, message: 'Session expired or unauthorized.' };
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          message: data.message || `Request failed with status ${response.status}`
        };
      }

      return data;
    } catch (err) {
      console.warn(`[API Client Network Error] ${endpoint}:`, err.message);
      return {
        success: false,
        isNetworkError: true,
        message: 'Cannot reach backend server. Using local cache / offline mode.'
      };
    }
  }

  // =========================================================================
  // Auth
  // =========================================================================
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.success && res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // =========================================================================
  // Company & Subsidiaries & Business Units
  // =========================================================================
  async getMainCompany() {
    return this.request('/company');
  }

  async updateMainCompany(data) {
    return this.request('/company', { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getSubsidiaries() {
    return this.request('/subsidiaries');
  }

  async getSubsidiaryById(id) {
    return this.request(`/subsidiaries/${id}`);
  }

  async createSubsidiary(data) {
    return this.request('/subsidiaries', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateSubsidiary(id, data) {
    return this.request(`/subsidiaries/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getBusinessUnits(subsidiaryId = null) {
    const q = subsidiaryId ? `?subsidiaryId=${encodeURIComponent(subsidiaryId)}` : '';
    return this.request(`/business-units${q}`);
  }

  async createBusinessUnit(data) {
    return this.request('/business-units', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateBusinessUnit(id, data) {
    return this.request(`/business-units/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getUsers() {
    return this.request('/users');
  }

  async createUser(data) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateUserAccess(userId, accessStatus) {
    return this.request(`/users/${userId}/access`, {
      method: 'PATCH',
      body: JSON.stringify({ accessStatus })
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // =========================================================================
  // Projects
  // =========================================================================
  async getProjects(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/projects?${searchParams.toString()}`);
  }

  async getProjectById(id) {
    return this.request(`/projects/${id}`);
  }

  async createProject(data) {
    return this.request('/projects', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateProject(id, data) {
    return this.request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // =========================================================================
  // Submissions & Approvals Workflow
  // =========================================================================
  async getSubmissions(year = 'FY 2025-26', subsidiaryId = null, status = null) {
    const q = new URLSearchParams();
    if (year && year !== 'all') q.append('year', year);
    if (subsidiaryId && subsidiaryId !== 'all') q.append('subsidiaryId', subsidiaryId);
    if (status && status !== 'all') q.append('status', status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/submissions${qs}`);
  }

  async getPendingSubmissions(year = 'FY 2025-26') {
    const q = (year && year !== 'all') ? `?year=${encodeURIComponent(year)}` : '';
    return this.request(`/submissions/pending-review${q}`);
  }

  async getSubmissionById(id) {
    return this.request(`/submissions/${id}`);
  }

  async saveDraftSubmission(data) {
    return this.request('/submissions/draft', { method: 'POST', body: JSON.stringify(data) });
  }

  async submitSubmission(idOrPayload) {
    if (typeof idOrPayload === 'string') {
      return this.request(`/submissions/${idOrPayload}/submit`, { method: 'POST' });
    }
    return this.request('/submissions/submit', {
      method: 'POST',
      body: JSON.stringify(idOrPayload || {})
    });
  }

  async approveSubmission(id, notes) {
    return this.request(`/submissions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  async requestCorrection(id, comment) {
    return this.request(`/submissions/${id}/request-correction`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  }

  async rejectSubmission(id, reason) {
    return this.request(`/submissions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async resubmitSubmission(idOrPayload) {
    if (typeof idOrPayload === 'string') {
      return this.request(`/submissions/${idOrPayload}/resubmit`, { method: 'POST' });
    }
    return this.request('/submissions/resubmit', {
      method: 'POST',
      body: JSON.stringify(idOrPayload || {})
    });
  }

  // =========================================================================
  // Snap-to-BRSR (Official Unique Idea 1)
  // =========================================================================
  async uploadAndExtractDocument(formData) {
    return this.request('/snap-to-brsr/upload', {
      method: 'POST',
      body: formData
    });
  }

  async saveSnapRecord(recordData) {
    return this.request('/snap-to-brsr/save', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });
  }

  // =========================================================================
  // Control Tower & What-If Simulator (Official Unique Idea 2)
  // =========================================================================
  async getControlTowerSummary(year = 'FY 2025-26', subsidiaryId = null) {
    const q = new URLSearchParams({ year });
    if (subsidiaryId && subsidiaryId !== 'all') q.append('subsidiaryId', subsidiaryId);
    return this.request(`/control-tower/summary?${q.toString()}`);
  }

  async getControlTowerHierarchy(year = 'FY 2025-26') {
    return this.request(`/control-tower/hierarchy?year=${encodeURIComponent(year)}`);
  }

  async getControlTowerMap(year = 'FY 2025-26', subsidiaryId = null) {
    const q = new URLSearchParams({ year });
    if (subsidiaryId && subsidiaryId !== 'all') q.append('subsidiaryId', subsidiaryId);
    return this.request(`/control-tower/map?${q.toString()}`);
  }

  async getControlTowerHotspots(year = 'FY 2025-26') {
    return this.request(`/control-tower/hotspots?year=${encodeURIComponent(year)}`);
  }

  async simulateWhatIf(scenarioType, projectId, inputs) {
    return this.request('/what-if/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenarioType, projectId, inputs })
    });
  }

  async saveWhatIfSimulation(simulationData) {
    return this.request('/what-if/save', {
      method: 'POST',
      body: JSON.stringify(simulationData)
    });
  }

  async getWhatIfHistory(subsidiaryId = null) {
    const q = subsidiaryId && subsidiaryId !== 'all' ? `?subsidiaryId=${encodeURIComponent(subsidiaryId)}` : '';
    return this.request(`/what-if/history${q}`);
  }

  // =========================================================================
  // Emissions & Factors
  // =========================================================================
  async getEmissionFactors(category = null) {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/emissions/factors${q}`);
  }

  async calculateEmissions(params) {
    return this.request('/emissions/calculate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // =========================================================================
  // SDGs & Frameworks
  // =========================================================================
  async getSdgs() {
    return this.request('/sdgs');
  }

  async getSdgContributions(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/sdg-contributions?${searchParams.toString()}`);
  }

  async saveSdgContribution(data) {
    return this.request('/sdg-contributions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async approveSdgContribution(id, remarks) {
    return this.request(`/sdg-contributions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks })
    });
  }

  async requestCorrectionSdg(id, comment) {
    return this.request(`/sdg-contributions/${id}/request-correction`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  }

  async rejectSdgContribution(id, reason) {
    return this.request(`/sdg-contributions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async deleteSdgContribution(id) {
    return this.request(`/sdg-contributions/${id}`, {
      method: 'DELETE'
    });
  }

  // =========================================================================
  // Evidence & Reports & Notifications & Audit
  // =========================================================================
  async getEvidenceList(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/evidence?${searchParams.toString()}`);
  }

  async getEvidenceById(id) {
    return this.request(`/evidence/${id}`);
  }

  async getSubmissionEvidence(submissionId) {
    return this.request(`/submissions/${submissionId}/evidence`);
  }

  async getMyEvidence(year = 'FY 2025-26') {
    const q = year && year !== 'all' ? `?year=${encodeURIComponent(year)}` : '';
    return this.request(`/snap-to-brsr/my-evidence${q}`);
  }

  async reviewEvidence(id, reviewStatus, comments = '') {
    return this.request(`/evidence/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ reviewStatus, comments })
    });
  }

  async linkEvidence(id, data = {}) {
    return this.request(`/evidence/${id}/link`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async uploadEvidenceVersion(id, formData) {
    return this.request(`/evidence/${id}/version`, {
      method: 'POST',
      body: formData
    });
  }

  getEvidenceFileUrl(id, download = false) {
    const token = this.getToken();
    const tokenParam = token ? `token=${encodeURIComponent(token)}` : '';
    const dlParam = download ? 'download=true' : '';
    const qs = [tokenParam, dlParam].filter(Boolean).join('&');
    return `${this.baseUrl}/evidence/${id}/file${qs ? `?${qs}` : ''}`;
  }

  async fetchEvidenceBlob(id, download = false) {
    const token = this.getToken();
    const url = this.getEvidenceFileUrl(id, download);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to stream evidence document: ${res.statusText}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return {
      blob,
      objectUrl,
      contentType: res.headers.get('Content-Type') || blob.type
    };
  }

  async deleteEvidence(id) {
    return this.request(`/evidence/${id}`, {
      method: 'DELETE'
    });
  }

  async getReports(year = 'FY 2025-26', subsidiaryId = null) {
    const q = new URLSearchParams({ year });
    if (subsidiaryId && subsidiaryId !== 'all') q.append('subsidiaryId', subsidiaryId);
    return this.request(`/reports?${q.toString()}`);
  }

  async generateReport(data) {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  async getAuditLogs() {
    return this.request('/audit-logs');
  }

  async getConsolidation(year = 'FY 2025-26') {
    return this.request(`/consolidation/latest?year=${encodeURIComponent(year)}`);
  }

  async runConsolidation(year = 'FY 2025-26') {
    return this.request('/consolidation/run', {
      method: 'POST',
      body: JSON.stringify({ year })
    });
  }

  // =========================================================================
  // Offline-First Sync Queue
  // =========================================================================
  getOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem('MEIL_ESG_OFFLINE_QUEUE') || '[]');
    } catch {
      return [];
    }
  }

  saveOfflineQueue(queue) {
    localStorage.setItem('MEIL_ESG_OFFLINE_QUEUE', JSON.stringify(queue));
  }

  enqueueOfflineAction(action, payload) {
    const queue = this.getOfflineQueue();
    const item = {
      id: `queue-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING'
    };
    queue.push(item);
    this.saveOfflineQueue(queue);
    console.log(`[Offline Queue] Action '${action}' queued locally:`, item.id);
    return item;
  }

  async triggerOfflineSync() {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`[Offline Sync] Processing ${queue.length} pending items...`);
    const remaining = [];

    for (const item of queue) {
      try {
        if (item.action === 'SAVE_SNAP_RECORD') {
          const res = await this.saveSnapRecord(item.payload);
          if (res.success) {
            console.log(`[Offline Sync] Successfully synced Snap record ${item.id}`);
            if (window.ui) window.ui.showToast('Offline Snap-to-BRSR record synced to database!', 'success');
          } else {
            item.retryCount++;
            remaining.push(item);
          }
        } else {
          remaining.push(item);
        }
      } catch (err) {
        item.retryCount++;
        item.lastError = err.message;
        remaining.push(item);
      }
    }

    this.saveOfflineQueue(remaining);
  }
}

// Global Singleton API Client Instance
const api = new ApiClient();
if (typeof window !== 'undefined') {
  window.api = api;
}
