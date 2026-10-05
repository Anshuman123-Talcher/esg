const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../src/config/prisma');
const storageService = require('../src/services/storageService');
const { UPLOAD_DIR } = require('../src/config/env');

function createSamplePdf(title, lines) {
  const content = `BT /F1 16 Tf 50 740 Td (${title}) Tj ET\n` +
    lines.map((l, i) => `BT /F1 10 Tf 50 ${700 - i * 22} Td (${l.replace(/[()\\]/g, '')}) Tj ET\n`).join('');
  const len = Buffer.byteLength(content);
  return Buffer.from(
    `%PDF-1.4\n` +
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n` +
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n` +
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n` +
    `4 0 obj << /Length ${len} >> stream\n${content}\nendstream\nendobj\n` +
    `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n` +
    `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000350 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF\n`
  );
}

// Minimal valid 1x1 JPEG buffer
const sampleJpegBuffer = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
  0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
  0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
  0x00, 0xBF, 0x80, 0xFF, 0xD9
]);

async function seedEvidence() {
  console.log('[SeedEvidence] Populating realistic evidence documents and storage...');

  // Sample documents definitions
  const sampleDocs = [
    {
      evidenceId: 'EV-8F31C2A7-001',
      originalName: 'diesel_commercial_invoice_sep2026.pdf',
      type: 'pdf',
      mimeType: 'application/pdf',
      title: 'INDIAN OIL CORP - COMMERCIAL DIESEL INVOICE #IOCL-98231',
      lines: [
        'Vendor: Indian Oil Corporation Ltd. - Secunderabad Division',
        'Customer: Olectra Greentech Ltd. (Subsidiary of MEIL)',
        'Site: Shamirpet EV Bus Manufacturing Giga-Facility (OLE-HYD-001)',
        'Date of Supply: 15-September-2026 | Invoice Ref: IOCL-98231',
        'Fuel Description: Ultra-Low Sulphur High Speed Diesel (HSD BS-VI)',
        'Quantity Supplied: 1,000.00 Litres @ Rs. 92.50 / Litre',
        'Total Taxable Amount: INR 92,500.00 | GST (18%): INR 16,650.00',
        'Grand Total Paid: INR 109,150.00',
        'Statutory Emission Factor: 2.68 kg CO2e / Litre (IPCC Tier-1)',
        'Calculated GHG Impact: 2.68 Metric Tonnes CO2e (Scope 1 Direct Combustion)',
        'Audited by: Praveen Kumar, Plant ESG Officer'
      ],
      submissionId: 'SUBM-2026-001',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      category: 'Diesel Receipt',
      esgCategory: 'Energy / Fuel Combustion',
      brsrPrinciple: 'Principle 6',
      scope: 'Scope 1',
      metric: '1,000 Litres High Speed Diesel',
      emissionMt: 2.68,
      ocrConfidence: 96.8,
      reviewStatus: 'Pending Review',
      uploadedBy: 'Praveen Kumar',
      uploaderRole: 'SUB_ADMIN'
    },
    {
      evidenceId: 'EV-91D74B20-002',
      originalName: 'weighbridge_fuel_slip_wb891.jpg',
      type: 'jpg',
      mimeType: 'image/jpeg',
      submissionId: 'SUBM-2026-001',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      category: 'Weighbridge Slip',
      esgCategory: 'Logistics & Fuel Quality',
      brsrPrinciple: 'Principle 6',
      scope: 'Scope 1',
      metric: 'Gross Wt: 28,450 kg | Tare: 12,200 kg | Net Diesel: 16,250 kg',
      emissionMt: 0.0,
      ocrConfidence: 94.2,
      reviewStatus: 'Pending Review',
      uploadedBy: 'Praveen Kumar',
      uploaderRole: 'SUB_ADMIN'
    },
    {
      evidenceId: 'EV-3C48FA12-003',
      originalName: 'tsspdcl_electricity_bill_aug2026.pdf',
      type: 'pdf',
      mimeType: 'application/pdf',
      title: 'TSSPDCL HT INDUSTRIAL POWER SUPPLY - HT CONSUMER #SP-7712',
      lines: [
        'Utility: Telangana State Southern Power Distribution Co. Ltd.',
        'Consumer: Olectra Greentech Ltd - Industrial Feeder 33kV',
        'Billing Month: August 2026 | Due Date: 10-September-2026',
        'Units Consumed: 125,000 kWh (Active Units)',
        'Contract Maximum Demand (CMD): 500 kVA | Recorded Peak: 420 kVA',
        'Total Energy Charges: INR 937,500.00 @ Rs. 7.50 / kWh',
        'Grid Emission Factor: 0.716 kg CO2e / kWh (CEA CO2 Database v19)',
        'Calculated GHG Impact: 89.50 Metric Tonnes CO2e (Scope 2 Purchased Electricity)',
        'Renewable Solar PPA Off-take: 25,000 kWh (Rec-credited)'
      ],
      submissionId: 'SUBM-2026-001',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      category: 'Electricity Bill',
      esgCategory: 'Purchased Electricity',
      brsrPrinciple: 'Principle 6',
      scope: 'Scope 2',
      metric: '125,000 kWh Grid Electricity',
      emissionMt: 89.5,
      ocrConfidence: 98.2,
      reviewStatus: 'Pending Review',
      uploadedBy: 'Praveen Kumar',
      uploaderRole: 'SUB_ADMIN'
    },
    {
      evidenceId: 'EV-7E19BC44-004',
      originalName: 'water_consumption_flowmeter_log.jpg',
      type: 'jpg',
      mimeType: 'image/jpeg',
      submissionId: 'SUBM-2026-001',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      category: 'Meter Photograph',
      esgCategory: 'Water Stewardship',
      brsrPrinciple: 'Principle 6',
      scope: 'General',
      metric: 'Flowmeter Reading: 4,850 Kilolitres',
      emissionMt: 0.0,
      ocrConfidence: 91.5,
      reviewStatus: 'Pending Review',
      uploadedBy: 'Praveen Kumar',
      uploaderRole: 'SUB_ADMIN'
    },
    {
      evidenceId: 'EV-5D62CA88-005',
      originalName: 'polavaram_hydro_heavy_fuel_receipt.pdf',
      type: 'pdf',
      mimeType: 'application/pdf',
      title: 'BPCL COMMERCIAL INVOICE - POLAVARAM HYDRO POWER SITE',
      lines: [
        'Supplier: Bharat Petroleum Corporation Limited',
        'Consignee: MEIL Hydro & Power Infrastructure Ltd.',
        'Site: Polavaram Spillway Excavation Camp (MEIL-HYD-001)',
        'Date: 28-August-2026 | Invoice: BPCL-PLV-4412',
        'Product: High Speed Heavy Diesel',
        'Quantity: 4,500.00 Litres @ Rs. 91.20 / Litre',
        'Calculated GHG Impact: 12.06 MT CO2e (Scope 1)',
        'Approved by MEIL Central Committee: 15-September-2026'
      ],
      submissionId: 'SUBM-2026-002',
      subsidiaryId: 'sub-1',
      projectId: 'proj-sub1-01',
      category: 'Fuel Receipt',
      esgCategory: 'Energy - Fuel Combustion',
      brsrPrinciple: 'Principle 6',
      scope: 'Scope 1',
      metric: '4,500 Litres Diesel',
      emissionMt: 12.06,
      ocrConfidence: 97.4,
      reviewStatus: 'Approved',
      reviewedBy: 'Vikramaditya Roy',
      reviewComments: 'Verified against Polavaram fuel log and physical site ledger.',
      uploadedBy: 'Rajesh Sharma',
      uploaderRole: 'SUB_ADMIN'
    },
    {
      evidenceId: 'EV-1A90EF33-006',
      originalName: 'megha_gas_pressure_flow_meter_readout.jpg',
      type: 'jpg',
      mimeType: 'image/jpeg',
      submissionId: 'SUBM-2026-003',
      subsidiaryId: 'sub-4',
      projectId: 'proj-sub4-01',
      category: 'Meter Photograph',
      esgCategory: 'Fugitive Emissions & Gas Flow',
      brsrPrinciple: 'Principle 6',
      scope: 'Scope 1',
      metric: 'Flowmeter Pressure: 4.2 Bar | Volume: 12,400 SCM',
      emissionMt: 24.8,
      ocrConfidence: 78.4,
      reviewStatus: 'Correction Required',
      reviewedBy: 'Vikramaditya Roy',
      reviewComments: 'Image is partially blurry and calibration certificate stamp is obscured. Please re-upload high-resolution calibration certificate.',
      uploadedBy: 'Sanjay Verma',
      uploaderRole: 'SUB_ADMIN'
    }
  ];

  for (const doc of sampleDocs) {
    // 1. Create file buffer
    let fileBuf = null;
    if (doc.type === 'pdf') {
      fileBuf = createSamplePdf(doc.title, doc.lines);
    } else {
      // Use existing jpeg from uploads if available, or fallback to sample buffer
      const existingJpg = path.resolve(UPLOAD_DIR, 'ev_0b05cd22633005fe8fef476c02fe033e_1791206352226.jpg');
      if (fs.existsSync(existingJpg)) {
        fileBuf = fs.readFileSync(existingJpg);
      } else {
        fileBuf = sampleJpegBuffer;
      }
    }

    // 2. Write to a temporary file
    const tempFile = path.resolve(UPLOAD_DIR, `temp_${doc.evidenceId}_${doc.originalName}`);
    fs.writeFileSync(tempFile, fileBuf);

    // 3. Store via storageService in collision-safe hierarchy
    const stored = await storageService.storeEvidenceFile(tempFile, {
      originalName: doc.originalName,
      companyId: 'main-meil',
      subsidiaryId: doc.subsidiaryId,
      projectId: doc.projectId,
      reportingYear: 'FY_2025-26',
      submissionId: doc.submissionId,
      evidenceId: doc.evidenceId
    });

    // 4. Upsert EvidenceDocument in PostgreSQL
    const evidenceDoc = await prisma.evidenceDocument.upsert({
      where: { id: doc.evidenceId },
      update: {
        filename: stored.filename,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: stored.fileSize,
        filePath: stored.filePath,
        fileHash: stored.fileHash,
        submissionId: doc.submissionId,
        subsidiaryId: doc.subsidiaryId,
        projectId: doc.projectId,
        reportingYear: 'FY 2025-26',
        category: doc.category,
        esgCategory: doc.esgCategory,
        brsrPrinciple: doc.brsrPrinciple,
        scope: doc.scope,
        supportedMetric: doc.metric,
        supportedEmission: doc.emissionMt,
        ocrStatus: 'COMPLETED',
        ocrConfidence: doc.ocrConfidence,
        verificationStatus: doc.reviewStatus === 'Approved' ? 'Verified' : 'Unverified',
        reviewStatus: doc.reviewStatus,
        reviewedBy: doc.reviewedBy || null,
        reviewedAt: doc.reviewedBy ? new Date() : null,
        reviewComments: doc.reviewComments || null,
        uploadedBy: doc.uploadedBy,
        uploaderRole: doc.uploaderRole
      },
      create: {
        id: doc.evidenceId,
        filename: stored.filename,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: stored.fileSize,
        filePath: stored.filePath,
        fileHash: stored.fileHash,
        submissionId: doc.submissionId,
        subsidiaryId: doc.subsidiaryId,
        projectId: doc.projectId,
        reportingYear: 'FY 2025-26',
        category: doc.category,
        esgCategory: doc.esgCategory,
        brsrPrinciple: doc.brsrPrinciple,
        scope: doc.scope,
        supportedMetric: doc.metric,
        supportedEmission: doc.emissionMt,
        ocrStatus: 'COMPLETED',
        ocrConfidence: doc.ocrConfidence,
        verificationStatus: doc.reviewStatus === 'Approved' ? 'Verified' : 'Unverified',
        reviewStatus: doc.reviewStatus,
        reviewedBy: doc.reviewedBy || null,
        reviewedAt: doc.reviewedBy ? new Date() : null,
        reviewComments: doc.reviewComments || null,
        uploadedBy: doc.uploadedBy,
        uploaderRole: doc.uploaderRole
      }
    });

    // 5. Create Sample OCR Extraction Record
    await prisma.ocrExtraction.upsert({
      where: { id: `ocr-${doc.evidenceId}` },
      update: {},
      create: {
        id: `ocr-${doc.evidenceId}`,
        evidenceId: doc.evidenceId,
        documentType: doc.category,
        rawText: doc.type === 'pdf' ? doc.lines.join('\n') : `Extracted image readout for ${doc.originalName}`,
        extractedJson: {
          category: doc.category,
          metric: doc.metric,
          confidence: doc.ocrConfidence,
          scope: doc.scope,
          calculatedEmissionMt: doc.emissionMt
        },
        confidenceScore: doc.ocrConfidence,
        provider: 'LOCAL_DOCUMENT_OCR_ENGINE',
        status: 'COMPLETED'
      }
    });

    console.log(`[SeedEvidence] Stored evidence ${doc.evidenceId} (${doc.originalName}) -> ${stored.filePath}`);
  }

  console.log('[SeedEvidence] Done! All sample evidence documents created and linked.');
}

seedEvidence()
  .catch(err => {
    console.error('[SeedEvidence] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
