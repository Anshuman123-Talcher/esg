const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('====================================================');
  console.log('TEST CASE: SAME FILE NAME COLLISION & RBAC VERIFICATION');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:5000/api';

  // Helper for requests
  async function api(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  }

  // 1. Log in Person A (Sub-Admin, Subsidiary sub-3: Olectra)
  console.log('1. Logging in Person A (Sub-Admin: Olectra Greentech)...');
  const loginA = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'olectra@meil.in', password: 'admin' })
  });
  if (!loginA.ok) throw new Error('Person A login failed: ' + JSON.stringify(loginA.data));
  const tokenA = loginA.data.token;
  console.log('   ✅ Person A logged in:', loginA.data.user.name, `(${loginA.data.user.subsidiaryId})`);

  // 2. Log in Person B (Sub-Admin, Subsidiary sub-1: MEIL Hydro)
  console.log('2. Logging in Person B (Sub-Admin: MEIL Hydro)...');
  const loginB = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hydro@meil.in', password: 'admin' })
  });
  if (!loginB.ok) throw new Error('Person B login failed: ' + JSON.stringify(loginB.data));
  const tokenB = loginB.data.token;
  console.log('   ✅ Person B logged in:', loginB.data.user.name, `(${loginB.data.user.subsidiaryId})`);

  // 3. Log in Main Admin
  console.log('3. Logging in Main Company Admin...');
  const loginAdmin = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@apexgroup.com', password: 'admin' })
  });
  if (!loginAdmin.ok) throw new Error('Main Admin login failed: ' + JSON.stringify(loginAdmin.data));
  const tokenAdmin = loginAdmin.data.token;
  console.log('   ✅ Main Admin logged in:', loginAdmin.data.user.name, `(Role: ${loginAdmin.data.user.role})`);

  // Create two different PDF buffers with identical filename 'invoice.pdf'
  // Person A's invoice: Diesel supply to Olectra
  const pdfA = Buffer.from(
    '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length 55 >> stream\nBT /F1 12 Tf 50 700 Td (INVOICE PERSON A - OLECTRA DIESEL) Tj ET\nendstream\nendobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000350 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n450\n%%EOF\n'
  );

  // Person B's invoice: Heavy machinery fuel to MEIL Hydro
  const pdfB = Buffer.from(
    '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length 59 >> stream\nBT /F1 12 Tf 50 700 Td (INVOICE PERSON B - MEIL HYDRO POWER) Tj ET\nendstream\nendobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000354 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n454\n%%EOF\n'
  );

  // Helper to do multipart upload
  async function uploadFile(token, fileBuffer, filename, projectId) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document"; filename="${filename}"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;

    const bodyHead = Buffer.from(body, 'utf-8');
    let bodyTail = `\r\n--${boundary}\r\n`;
    bodyTail += `Content-Disposition: form-data; name="projectId"\r\n\r\n${projectId || ''}\r\n`;
    bodyTail += `--${boundary}\r\n`;
    bodyTail += `Content-Disposition: form-data; name="reportingYear"\r\n\r\nFY 2025-26\r\n`;
    bodyTail += `--${boundary}--\r\n`;
    const bodyTailBuf = Buffer.from(bodyTail, 'utf-8');

    const totalPayload = Buffer.concat([bodyHead, fileBuffer, bodyTailBuf]);

    const res = await fetch(`${BASE_URL}/snap-to-brsr/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: totalPayload
    });

    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data: json };
  }

  // 4. Person A uploads 'invoice.pdf'
  console.log('\n4. Person A uploads "invoice.pdf" for Olectra...');
  const resA = await uploadFile(tokenA, pdfA, 'invoice.pdf', 'proj-sub3-01');
  if (!resA.ok) throw new Error('Person A upload failed: ' + JSON.stringify(resA.data));
  const docA = resA.data.data;
  console.log('   ✅ Person A Evidence ID:', docA.evidenceId);
  console.log('   ✅ Displayed original filename:', docA.file.originalName);
  console.log('   ✅ Saved file hash:', docA.file.fileHash?.slice(0, 16) + '...');

  // 5. Person B uploads 'invoice.pdf' (IDENTICAL FILENAME)
  console.log('\n5. Person B uploads "invoice.pdf" for MEIL Hydro (SAME FILENAME!)...');
  const resB = await uploadFile(tokenB, pdfB, 'invoice.pdf', 'proj-sub1-01');
  if (!resB.ok) throw new Error('Person B upload failed: ' + JSON.stringify(resB.data));
  const docB = resB.data.data;
  console.log('   ✅ Person B Evidence ID:', docB.evidenceId);
  console.log('   ✅ Displayed original filename:', docB.file.originalName);
  console.log('   ✅ Saved file hash:', docB.file.fileHash?.slice(0, 16) + '...');

  // 6. Check uniqueness of Evidence IDs
  console.log('\n6. Checking Evidence ID Uniqueness:');
  if (docA.evidenceId === docB.evidenceId) {
    throw new Error('❌ FAILURE: Evidence IDs collided!');
  }
  console.log('   ✅ Both Evidence IDs are globally unique:', docA.evidenceId, 'vs', docB.evidenceId);

  // 7. Test Sub-Admin Isolation (Person A cannot see Person B's document)
  console.log('\n7. Testing Sub-Admin Isolation & RBAC:');
  const listA = await api('/evidence', {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const idsA = listA.data.data.map(d => d.id);
  console.log(`   Person A sees ${idsA.length} documents for Olectra Greentech.`);
  if (idsA.includes(docB.evidenceId)) {
    throw new Error('❌ SECURITY VIOLATION: Person A can see Person B\'s evidence document!');
  }
  console.log('   ✅ PASS: Person A CANNOT see Person B\'s evidence in document register.');

  // Try direct file access to Person B's document using Person A's token
  const crossAccessA = await fetch(`${BASE_URL}/evidence/${docB.evidenceId}/file`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`   Person A trying to download Person B's document: Status ${crossAccessA.status}`);
  if (crossAccessA.status !== 403) {
    throw new Error(`❌ SECURITY VIOLATION: Expected 403 Forbidden, got ${crossAccessA.status}`);
  }
  console.log('   ✅ PASS: Backend returned 403 Forbidden when Person A tried accessing Person B\'s file.');

  // Try direct file access to Person A's document using Person B's token
  const crossAccessB = await fetch(`${BASE_URL}/evidence/${docA.evidenceId}/file`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`   Person B trying to download Person A's document: Status ${crossAccessB.status}`);
  if (crossAccessB.status !== 403) {
    throw new Error(`❌ SECURITY VIOLATION: Expected 403 Forbidden, got ${crossAccessB.status}`);
  }
  console.log('   ✅ PASS: Backend returned 403 Forbidden when Person B tried accessing Person A\'s file.');

  // 8. Main Admin Visibility
  console.log('\n8. Testing Main Admin Central Visibility:');
  const adminList = await api('/evidence', {
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  const adminIds = adminList.data.data.map(d => d.id);
  console.log(`   Main Admin sees total ${adminIds.length} group-wide evidence documents.`);
  if (!adminIds.includes(docA.evidenceId) || !adminIds.includes(docB.evidenceId)) {
    throw new Error('❌ Main Admin is missing one or both uploaded documents!');
  }
  console.log('   ✅ PASS: Main Admin can view BOTH Person A\'s and Person B\'s documents.');

  // Main Admin streaming both files
  const streamA = await fetch(`${BASE_URL}/evidence/${docA.evidenceId}/file`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  const textA = await streamA.text();
  if (!textA.includes('INVOICE PERSON A - OLECTRA DIESEL')) {
    throw new Error('❌ Streamed file content mismatch for Person A!');
  }
  console.log('   ✅ PASS: Main Admin successfully streamed and verified Person A\'s physical file.');

  const streamB = await fetch(`${BASE_URL}/evidence/${docB.evidenceId}/file`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  const textB = await streamB.text();
  if (!textB.includes('INVOICE PERSON B - MEIL HYDRO POWER')) {
    throw new Error('❌ Streamed file content mismatch for Person B!');
  }
  console.log('   ✅ PASS: Main Admin successfully streamed and verified Person B\'s physical file.');

  // 9. Main Admin Submission Evidence Fetch
  console.log('\n9. Testing Submission Evidence linking (/api/submissions/:id/evidence):');
  const submEv = await api('/submissions/SUBM-2026-001/evidence', {
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  console.log(`   SUBM-2026-001 has ${submEv.data.count} linked evidence documents.`);
  if (submEv.data.count === 0) {
    throw new Error('❌ Submission SUBM-2026-001 has no evidence documents returned!');
  }
  console.log('   Sample linked evidence:');
  submEv.data.data.forEach((ed, idx) => {
    console.log(`     ${idx + 1}. [${ed.id}] ${ed.originalName} (${ed.category}) - Status: ${ed.reviewStatus} - Scope: ${ed.scope}`);
  });
  console.log('   ✅ PASS: Submission evidence endpoint returned all supporting documents.');

  // 10. Main Admin Evidence Review (Correction Required & Approve)
  console.log('\n10. Testing Main Admin Evidence Review:');
  const reviewRes = await api(`/evidence/${docA.evidenceId}/review`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenAdmin}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reviewStatus: 'Correction Required',
      comments: 'Please verify vendor tax registration GSTIN matches statutory e-way bill.'
    })
  });
  if (!reviewRes.ok) throw new Error('Review failed: ' + JSON.stringify(reviewRes.data));
  console.log('   ✅ PASS: Main Admin set status to "Correction Required" with mandatory comment.');
  console.log('   Updated Review Status:', reviewRes.data.data.reviewStatus);
  console.log('   Comments recorded:', reviewRes.data.data.reviewComments);

  // 11. Duplicate Detection Test
  console.log('\n11. Testing Exact Duplicate Detection (SHA-256):');
  console.log('   Person A uploads EXACT SAME pdfA file again...');
  const resDup = await uploadFile(tokenA, pdfA, 'invoice_duplicate_copy.pdf', 'proj-sub3-01');
  if (!resDup.ok) throw new Error('Duplicate upload failed: ' + JSON.stringify(resDup.data));
  console.log('   Duplicate detected flag:', resDup.data.data.duplicateWarning?.detected);
  console.log('   Duplicate existing Evidence ID:', resDup.data.data.duplicateWarning?.existingEvidenceId);
  console.log('   New Evidence ID (stored independently):', resDup.data.data.evidenceId);
  if (!resDup.data.data.duplicateWarning?.detected) {
    throw new Error('❌ Duplicate warning was not triggered!');
  }
  console.log('   ✅ PASS: Exact duplicate detected via SHA-256, safely stored with warning banner data without overwriting!');

  console.log('\n====================================================');
  console.log('🎉 ALL BACKEND COLLISION & RBAC TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runTest().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
