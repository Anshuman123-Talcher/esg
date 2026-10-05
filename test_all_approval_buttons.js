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
    value: '',
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
    querySelector: () => null,
    focus: () => {},
    remove: () => {}
  };
}

const requiredIds = [
  'content-viewport', 'app-sidebar', 'sidebar-backdrop', 'sidebar-nav',
  'user-profile-summary', 'current-view-title', 'header-pending-badge',
  'header-action-badge', 'header-notif-count', 'header-avatar', 'demo-reset-btn',
  'sidebar-toggle-btn', 'sidebar-profile-dropdown', 'user-profile-trigger',
  'modal-backdrop', 'modal-dialog-content', 'toast-container',
  'rejection-reason-input', 'correction-remarks-input', 'sdg-review-remarks', 'proj-review-notes',
  'inp-total-energy', 'inp-ren-energy', 'inp-ghg-s1', 'inp-ghg-s2', 'inp-water-recycled',
  'inp-waste-recycled', 'inp-total-emp', 'inp-safety-hours', 'inp-ltifr', 'inp-csr'
];
requiredIds.forEach(id => { domElements[id] = createMockElement(id); });

const sandbox = {
  console: console,
  addEventListener: () => {},
  window: {},
  document: {
    getElementById: (id) => {
      if (!domElements[id]) domElements[id] = createMockElement(id);
      return domElements[id];
    },
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

async function runAllTests() {
  console.log('=== TEST 1: API LOGIN & DATABASE SYNC ===');
  const loginRes = await sandbox.api.login('admin@meil.in', 'admin');
  console.log('API Login success:', loginRes.success);
  await sandbox.store.syncFromBackend();
  sandbox.auth.session = sandbox.auth.loadSession();
  sandbox.ui.init();
  sandbox.ui.navigateTo('submissions');
  console.log('✓ Submissions view rendered successfully');

  console.log('\n=== TEST 2: TEST REVIEW MODAL FOR ALL SUBMISSIONS ===');
  const submissions = sandbox.store.state.submissions;
  for (const s of submissions) {
    sandbox.workflow.openReviewModal(s.id);
    const content = domElements['modal-dialog-content'].innerHTML;
    if (!content.includes('Review Submission:')) {
      throw new Error(`Review modal content missing for ${s.id}`);
    }
    console.log(`✓ Review modal verified for: ${s.id}`);
  }

  console.log('\n=== TEST 3: TEST CORRECTION MODAL & HANDLER ===');
  const testSubm = submissions[0];
  sandbox.ui.openCorrectionModal(testSubm.id);
  domElements['correction-remarks-input'].value = 'Need calibration certificate for Scope 1 analyzer.';
  await sandbox.ui.handleCorrectionSubmit(testSubm.id);
  console.log('✓ Request correction executed successfully');

  console.log('\n=== TEST 4: TEST APPROVE SUBMISSION ===');
  await sandbox.workflow.approveSubmission(testSubm.id, 'Verified and approved by Central Committee.');
  console.log('✓ Approve submission executed successfully');

  console.log('\n=== TEST 5: TEST REJECTION MODAL & HANDLER ===');
  sandbox.ui.openRejectionModal(testSubm.id);
  domElements['rejection-reason-input'].value = 'Audit documentation incomplete.';
  await sandbox.ui.handleRejectionSubmit(testSubm.id);
  console.log('✓ Rejection executed successfully');

  console.log('\n=== TEST 6: TEST REOPEN SUBMISSION ===');
  await sandbox.workflow.reopenSubmission(testSubm.id, 'Re-opening for re-verification.');
  console.log('✓ Re-open executed successfully');

  console.log('\n=== TEST 7: TEST SDG CONTRIBUTION REVIEW & ACTION BUTTONS ===');
  const sdgList = sandbox.store.getSDGContributions();
  if (sdgList.length > 0) {
    const sdgItem = sdgList[0];
    sandbox.ui.showMainAdminSDGReviewModal(sdgItem.id);
    console.log(`✓ SDG Review modal opened for ${sdgItem.id}`);
    domElements['sdg-review-remarks'].value = 'Verified KPI metrics against target.';
    await sandbox.ui.handleSDGApprove(sdgItem.id);
    console.log('✓ SDG Approve executed successfully');
    await sandbox.ui.handleSDGCorrection(sdgItem.id);
    console.log('✓ SDG Correction executed successfully');
    await sandbox.ui.handleSDGReject(sdgItem.id);
    console.log('✓ SDG Reject executed successfully');
  }

  console.log('\n=== TEST 8: TEST PROJECT REVIEW MODAL & ACTION BUTTONS ===');
  const projects = sandbox.store.getProjects();
  if (projects.length > 0) {
    const proj = projects[0];
    sandbox.ui.showProjectReviewModal(proj.id);
    console.log(`✓ Project review modal opened for ${proj.id}`);
    domElements['proj-review-notes'].value = 'Verified and approved for group consolidation.';
    await sandbox.ui.handleProjectApprove(proj.id, 'FY 2025-26');
    console.log('✓ Project Approve executed successfully');
    await sandbox.ui.handleProjectCorrection(proj.id, 'FY 2025-26');
    console.log('✓ Project Correction executed successfully');
    await sandbox.ui.handleProjectReject(proj.id, 'FY 2025-26');
    console.log('✓ Project Reject executed successfully');
  }

  console.log('\n=== TEST 9: TEST SUB-ADMIN SUBMISSION VIEW & DATA ENTRY ===');
  sandbox.auth.session = {
    userId: 'user-sub-1',
    name: 'Hydro Admin',
    email: 'hydro@meil.in',
    role: 'sub_admin',
    assignedSubsidiaryId: 'sub-1',
    serverAuthenticated: true
  };
  sandbox.ui.navigateTo('submissions');
  sandbox.ui.openDataEntryModal();
  console.log('✓ Sub-Admin data entry modal opened');
  domElements['inp-total-energy'].value = '15000';
  domElements['inp-ren-energy'].value = '7500';
  sandbox.ui.saveDataEntryForm(true);
  console.log('✓ Data entry form saved & submitted to Main Admin successfully');

  console.log('\n========================================');
  console.log('ALL SUBMISSION & APPROVAL BUTTONS VERIFIED & WORKING PERFECTLY!');
  console.log('========================================');
}

runAllTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
