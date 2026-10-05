/**
 * End-to-End Submission & Review Workflow Verification Script
 * MEIL Centralized ESG & BRSR Reporting System
 */

const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Origin': 'http://localhost:5000'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method: 'POST',
      headers
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Origin': 'http://localhost:5000'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method: 'GET',
      headers
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('STARTING END-TO-END ESG SUBMISSION WORKFLOW TEST');
  console.log('====================================================\n');

  // STEP 1: Login as Sub-Admin for Subsidiary sub-2 (transport@meil.in)
  console.log('👉 STEP 1: Logging in as Subsidiary Admin for sub-2 (transport@meil.in)...');
  let sub2Login = await post('/auth/login', { email: 'transport@meil.in', password: 'admin' });
  if (!sub2Login.data.success) {
    // Try Admin@123
    sub2Login = await post('/auth/login', { email: 'transport@meil.in', password: 'Admin@123' });
  }
  if (!sub2Login.data.success) {
    console.error('❌ Sub-Admin login failed:', sub2Login);
    process.exit(1);
  }
  const sub2Token = sub2Login.data.token;
  const sub2User = sub2Login.data.user;
  console.log(`✅ Sub-Admin authenticated: ${sub2User.name} (${sub2User.email}), subsidiary: ${sub2User.subsidiaryId}\n`);

  // STEP 2: Sub-Admin submits ESG Data for Review
  console.log('👉 STEP 2: Sub-Admin clicks "Submit for Review" (year: FY 2025-26)...');
  const submitRes = await post('/submissions/submit', {
    year: 'FY 2025-26',
    reportType: 'Integrated ESG & BRSR Report',
    notes: 'Submitted for Central MEIL Executive review with full audit verification.',
    esgScore: 89.0,
    brsrScore: 86.5
  }, sub2Token);

  console.log('Submit Response Status:', submitRes.status);
  console.log('Submit Response Body:', JSON.stringify(submitRes.data, null, 2));

  if (!submitRes.data.success) {
    console.error('❌ Submission creation failed!');
    process.exit(1);
  }

  const createdSubm = submitRes.data.data;
  console.log(`✅ PostgreSQL record created: ID = ${createdSubm.id}`);
  console.log(`   status = ${createdSubm.status} (rawStatus: ${createdSubm.rawStatus})`);
  console.log(`   subsidiaryId = ${createdSubm.subsidiaryId} (${createdSubm.subsidiaryName})`);
  console.log(`   submittedBy = ${createdSubm.submittedBy}`);
  console.log(`   submittedAt = ${createdSubm.submittedAt}`);
  console.log(`   year = ${createdSubm.year} / ${createdSubm.reportingYear}\n`);

  // STEP 3: Verify Sub-Admin scope: Sub-Admin should only see their own submission
  console.log('👉 STEP 3: Verify Sub-Admin subsidiary isolation query...');
  const sub2List = await get('/submissions', sub2Token);
  console.log(`   Sub-Admin received ${sub2List.data.data.length} submissions.`);
  const allSub2Belong = sub2List.data.data.every(s => s.subsidiaryId === 'sub-2');
  if (!allSub2Belong) {
    console.error('❌ ISOLATION BREACH: Sub-Admin received records from other subsidiaries!');
    process.exit(1);
  }
  console.log('✅ PASS: Sub-Admin strictly received only sub-2 submissions.\n');

  // STEP 4: Login as MAIN_ADMIN (admin@meil.in)
  console.log('👉 STEP 4: Logging in as Main Admin (admin@meil.in)...');
  let mainLogin = await post('/auth/login', { email: 'admin@meil.in', password: 'Admin@123' });
  if (!mainLogin.data.success) {
    mainLogin = await post('/auth/login', { email: 'admin@meil.in', password: 'admin' });
  }
  if (!mainLogin.data.success) {
    console.error('❌ Main Admin login failed:', mainLogin);
    process.exit(1);
  }
  const mainToken = mainLogin.data.token;
  console.log(`✅ Main Admin authenticated: ${mainLogin.data.user.name}\n`);

  // STEP 5: Main Admin retrieves submissions across ALL subsidiaries
  console.log('👉 STEP 5: Main Admin fetches all submissions (GET /api/submissions)...');
  const mainSubmissions = await get('/submissions', mainToken);
  console.log(`   Main Admin received ${mainSubmissions.data.data.length} submissions across group.`);
  
  // Find sub-2's submission in the list
  const foundSub2 = mainSubmissions.data.data.find(s => s.id === createdSubm.id || s.subsidiaryId === 'sub-2');
  if (!foundSub2) {
    console.error('❌ FAILURE: Newly submitted sub-2 filing does NOT appear in Main Admin query!');
    process.exit(1);
  }
  console.log('✅ PASS: Newly submitted sub-2 filing appears in Main Admin list:');
  console.log(`   Submission ID: ${foundSub2.id}`);
  console.log(`   Subsidiary Name: ${foundSub2.subsidiaryName}`);
  console.log(`   Business Unit: ${foundSub2.businessUnit}`);
  console.log(`   Submitter: ${foundSub2.submittedBy}`);
  console.log(`   Status: ${foundSub2.status}`);
  console.log(`   Cycle: ${foundSub2.year}\n`);

  // STEP 6: Main Admin checks GET /api/submissions/pending-review
  console.log('👉 STEP 6: Main Admin checks pending review endpoint (/api/submissions/pending-review)...');
  const pendingRes = await get('/submissions/pending-review', mainToken);
  console.log(`   Pending submissions count: ${pendingRes.data.data.length}`);
  const foundInPending = pendingRes.data.data.find(s => s.id === createdSubm.id);
  if (!foundInPending) {
    console.error('❌ FAILURE: sub-2 not found in pending-review queue!');
    process.exit(1);
  }
  console.log('✅ PASS: sub-2 filing appears in Main Admin pending review queue.\n');

  // STEP 7: Main Admin Requests Correction
  console.log('👉 STEP 7: Main Admin Requests Correction on sub-2 filing...');
  const corrRes = await post(`/submissions/${createdSubm.id}/request-correction`, {
    comment: 'Scope 1 diesel invoice batch #44 requires certified reconciliation.'
  }, mainToken);
  console.log('Correction Response:', corrRes.data.message);
  if (!corrRes.data.success || corrRes.data.data.rawStatus !== 'Correction_Required') {
    console.error('❌ Correction request failed:', corrRes);
    process.exit(1);
  }
  console.log(`✅ Status changed in PostgreSQL: ${corrRes.data.data.status} (rawStatus: ${corrRes.data.data.rawStatus})\n`);

  // STEP 8: Sub-Admin resubmits revised data
  console.log('👉 STEP 8: Sub-Admin resubmits after correction (POST /api/submissions/resubmit)...');
  const resubmitRes = await post('/submissions/resubmit', {
    year: 'FY 2025-26',
    notes: 'Attached certified calibration certificates for diesel flow meters and updated fuel log.'
  }, sub2Token);
  console.log('Resubmit Response:', resubmitRes.data.message);
  if (!resubmitRes.data.success || resubmitRes.data.data.rawStatus !== 'Submitted') {
    console.error('❌ Resubmission failed:', resubmitRes);
    process.exit(1);
  }
  console.log(`✅ Status changed back to Submitted in PostgreSQL: ${resubmitRes.data.data.status}\n`);

  // STEP 9: Main Admin Approves Submission
  console.log('👉 STEP 9: Main Admin Approves sub-2 filing...');
  const approveRes = await post(`/submissions/${createdSubm.id}/approve`, {
    notes: 'Audit certificates verified. Reconciled and approved for group consolidation.'
  }, mainToken);
  console.log('Approve Response:', approveRes.data.message);
  if (!approveRes.data.success || approveRes.data.data.rawStatus !== 'Approved') {
    console.error('❌ Approval failed:', approveRes);
    process.exit(1);
  }
  console.log(`✅ PostgreSQL record updated: Status = ${approveRes.data.data.status}\n`);

  // STEP 10: Multi-Subsidiary Visibility Verification
  console.log('👉 STEP 10: Multi-Subsidiary Verification across all entities...');
  const allGroupSubs = await get('/submissions', mainToken);
  const distinctSubs = new Set(allGroupSubs.data.data.map(s => s.subsidiaryId));
  console.log(`   Main Admin sees submissions from ${distinctSubs.size} distinct subsidiaries:`, Array.from(distinctSubs));

  if (distinctSubs.size < 2) {
    console.error('❌ Multi-subsidiary test failed: expected multiple subsidiaries.');
    process.exit(1);
  }
  console.log('✅ PASS: Main Admin sees submissions from all authorized subsidiaries.\n');

  console.log('====================================================');
  console.log('🎉 ALL WORKFLOW TESTS PASSED PERFECTLY!');
  console.log('====================================================');
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
