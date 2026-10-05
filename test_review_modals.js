const fs = require('fs');
const path = require('path');
const vm = require('vm');

const workspaceRoot = 'c:\\anshuman\\Desktop\\Ps08Newver';
const localStorageData = {};
const mockLocalStorage = {
  getItem: (k) => localStorageData[k] || null,
  setItem: (k, v) => { localStorageData[k] = String(v); },
  removeItem: (k) => { delete localStorageData[k]; }
};

const domElements = {};
function createMockElement(id) {
  return {
    id,
    innerHTML: '',
    innerText: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    querySelectorAll: () => [],
    querySelector: () => null
  };
}

const requiredIds = [
  'content-viewport', 'app-sidebar', 'sidebar-backdrop', 'sidebar-nav',
  'user-profile-summary', 'current-view-title', 'header-pending-badge',
  'header-action-badge', 'header-notif-count', 'header-avatar', 'demo-reset-btn',
  'sidebar-toggle-btn', 'sidebar-profile-dropdown', 'user-profile-trigger',
  'modal-backdrop', 'modal-dialog-content', 'toast-container'
];
requiredIds.forEach(id => { domElements[id] = createMockElement(id); });

const sandbox = {
  console: console,
  addEventListener: () => {},
  window: {},
  document: {
    getElementById: (id) => domElements[id] || createMockElement(id),
    querySelector: (sel) => createMockElement(sel),
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: (tag) => createMockElement(tag),
    body: createMockElement('body')
  },
  location: { hostname: 'localhost', port: '5000', origin: 'http://localhost:5000', href: 'http://localhost:5000/index.html', replace: () => {} },
  localStorage: mockLocalStorage,
  sessionStorage: mockLocalStorage,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  fetch: globalThis.fetch,
  navigator: { onLine: true },
  Chart: class { constructor() {} destroy() {} },
  L: {
    map: () => ({ setView: () => {}, remove: () => {} }),
    tileLayer: () => ({ addTo: () => {} }),
    marker: () => ({ addTo: () => ({ bindPopup: () => {} }) }),
    divIcon: () => ({})
  },
  lucide: { createIcons: () => {} }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const scripts = [
  'js/data/defaultData.js',
  'js/api.js',
  'js/store.js',
  'js/auth.js',
  'js/charts.js',
  'js/workflow.js',
  'js/reports.js',
  'js/snapToBrsr.js',
  'js/controlTower.js',
  'js/ui.js'
];
for (const script of scripts) {
  const code = fs.readFileSync(path.join(workspaceRoot, script), 'utf8');
  vm.runInContext(code, sandbox);
}

sandbox.localStorage.setItem('MEIL_ESG_AUTH_SESSION_V2', JSON.stringify({
  userId: 'user-main-1',
  name: 'P. V. Krishna Reddy',
  email: 'admin@meil.in',
  role: 'main_admin',
  title: 'Managing Director & Group Sustainability Head',
  assignedSubsidiaryId: null,
  loginTimestamp: new Date().toISOString(),
  serverAuthenticated: true
}));

async function runTests() {
  const loginRes = await sandbox.api.login('admin@meil.in', 'admin');
  console.log('API Login success:', loginRes.success);
  await sandbox.store.syncFromBackend();

  sandbox.auth.session = sandbox.auth.loadSession();
  sandbox.ui.init();
  sandbox.ui.navigateTo('submissions');

  console.log('Testing openReviewModal for all submissions in store after backend sync:');
  const submissions = sandbox.store.state.submissions;
  console.log('Found submissions count:', submissions.length);
  for (const subm of submissions) {
    try {
      sandbox.workflow.openReviewModal(subm.id);
      console.log(`  ✓ Success for submission: ${subm.id} (${subm.subsidiaryName || subm.subsidiaryId})`);
    } catch (e) {
      console.error(`  ✗ Error for submission: ${subm.id} (${subm.subsidiaryName || subm.subsidiaryId}):`, e);
    }
  }
}
runTests();
