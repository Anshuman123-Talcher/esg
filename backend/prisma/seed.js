/**
 * MEIL Centralized ESG & BRSR Database Seed Script
 * Populates realistic, demonstrable data for PS08 Hackathon
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seed for MEIL ESG & BRSR...');

  // 1. Password Hash (Default: "admin")
  const defaultPasswordHash = bcrypt.hashSync('admin', 10);

  // 2. Main Company
  const mainCompany = await prisma.mainCompany.upsert({
    where: { id: 'main-meil' },
    update: {},
    create: {
      id: 'main-meil',
      name: 'Megha Engineering and Infrastructures Limited',
      cin: 'U45200TG2006PLC050278',
      headquarters: 'S-2, Technocrat Industrial Estate, Balanagar, Hyderabad, Telangana 500037',
      reportingYear: 'FY 2025-26',
      turnover: 32500,
      totalEmployees: 45200,
      activeProjects: 185
    }
  });
  console.log('[Seed] Main Company seeded:', mainCompany.name);

  // 3. Subsidiaries
  const subsidiariesData = [
    {
      id: 'sub-1',
      name: 'MEIL Hydro & Power Infrastructure Ltd.',
      code: 'MEIL-HYDRO',
      sector: 'Renewable Power & Hydropower Infrastructure',
      location: 'Polavaram, Andhra Pradesh',
      headquarters: 'Hyderabad, Telangana',
      cin: 'U40100TG2010PLC069812',
      equityHolding: 100.0,
      contactEmail: 'hydro@meil.in'
    },
    {
      id: 'sub-2',
      name: 'MEIL Transport & Highway Networks Ltd.',
      code: 'MEIL-HWY',
      sector: 'Highways, Bridges & Underground Tunnels',
      location: 'New Delhi / Srinagar',
      headquarters: 'New Delhi',
      cin: 'U45203DL2012PLC238910',
      equityHolding: 100.0,
      contactEmail: 'transport@meil.in'
    },
    {
      id: 'sub-3',
      name: 'Olectra Greentech Limited',
      code: 'OLECTRA',
      sector: 'Electric Bus & Clean Mobility Manufacturing',
      location: 'Shamirpet, Hyderabad, Telangana',
      headquarters: 'Hyderabad, Telangana',
      cin: 'L34100TG2000PLC035451',
      equityHolding: 50.02,
      contactEmail: 'olectra@meil.in'
    },
    {
      id: 'sub-4',
      name: 'Megha City Gas Distribution Limited',
      code: 'MEGHA-GAS',
      sector: 'City Gas Distribution (PNG & CNG Clean Energy)',
      location: 'Krishna & Warangal Districts',
      headquarters: 'Hyderabad, Telangana',
      cin: 'U40300TG2015PLC099823',
      equityHolding: 100.0,
      contactEmail: 'citygas@meil.in'
    },
    {
      id: 'sub-5',
      name: 'Drillmec Energy Services',
      code: 'DRILLMEC',
      sector: 'Geothermal Rigs & Heavy Industrial Engineering',
      location: 'Piacenza, Italy / Kakinada Hub',
      headquarters: 'Piacenza, Italy',
      cin: 'IT-01589410339',
      equityHolding: 98.6,
      contactEmail: 'drillmec@meil.in'
    }
  ];

  for (const s of subsidiariesData) {
    await prisma.subsidiary.upsert({
      where: { id: s.id },
      update: s,
      create: s
    });
  }
  console.log('[Seed] 5 Subsidiaries seeded.');

  // 4. Users (Strictly exactly TWO roles: MAIN_ADMIN and SUB_ADMIN)
  const usersData = [
    {
      id: 'user-main-1',
      email: 'admin@meil.in',
      name: 'P. V. Krishna Reddy',
      role: 'MAIN_ADMIN',
      title: 'Managing Director & Group Sustainability Head',
      subsidiaryId: null,
      passwordHash: defaultPasswordHash
    },
    {
      id: 'user-main-2',
      email: 'admin@apexgroup.com',
      name: 'Vikramaditya Roy',
      role: 'MAIN_ADMIN',
      title: 'Group Chief Sustainability Officer',
      subsidiaryId: null,
      passwordHash: defaultPasswordHash
    },
    {
      id: 'user-sub-3',
      email: 'olectra@meil.in',
      name: 'Praveen Kumar',
      role: 'SUB_ADMIN',
      title: 'Head of ESG & Regulatory Affairs, Olectra',
      subsidiaryId: 'sub-3',
      passwordHash: defaultPasswordHash
    },
    {
      id: 'user-sub-1',
      email: 'hydro@meil.in',
      name: 'Rameshwar Rao',
      role: 'SUB_ADMIN',
      title: 'VP Project ESG, MEIL Hydro & Power',
      subsidiaryId: 'sub-1',
      passwordHash: defaultPasswordHash
    },
    {
      id: 'user-sub-4',
      email: 'citygas@meil.in',
      name: 'Sanjay Verma',
      role: 'SUB_ADMIN',
      title: 'Director Operations & Sustainability, Megha Gas',
      subsidiaryId: 'sub-4',
      passwordHash: defaultPasswordHash
    },
    {
      id: 'user-sub-5',
      email: 'drillmec@meil.in',
      name: 'Marco Rossi',
      role: 'SUB_ADMIN',
      title: 'Global HSE Coordinator, Drillmec',
      subsidiaryId: 'sub-5',
      passwordHash: defaultPasswordHash
    },
    {
      id: 'user-sub-2',
      email: 'transport@meil.in',
      name: 'Col. D. S. Rathore',
      role: 'SUB_ADMIN',
      title: 'Senior GM Infrastructure & Compliance, MEIL Highways',
      subsidiaryId: 'sub-2',
      passwordHash: defaultPasswordHash
    }
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u
    });
  }
  console.log('[Seed] 7 Users seeded (2 Main Admins, 5 Sub Admins).');

  // 5. Business Units
  const buData = [
    { id: 'bu-hydro-1', subsidiaryId: 'sub-1', name: 'Polavaram Dam Division', code: 'BU-HYD-01', head: 'R. K. Sharma', location: 'Andhra Pradesh', employeeCount: 4200, budgetCr: 1250 },
    { id: 'bu-hydro-2', subsidiaryId: 'sub-1', name: 'Kundah Pumped Storage', code: 'BU-HYD-02', head: 'M. S. Murthy', location: 'Tamil Nadu', employeeCount: 1800, budgetCr: 680 },
    { id: 'bu-hwy-1', subsidiaryId: 'sub-2', name: 'Northern Tunnels & Expressways', code: 'BU-HWY-01', head: 'V. K. Singh', location: 'J&K / Ladakh', employeeCount: 3500, budgetCr: 2100 },
    { id: 'bu-olectra-1', subsidiaryId: 'sub-3', name: 'EV Bus Assembly Plant', code: 'BU-OLE-01', head: 'Praveen Kumar', location: 'Hyderabad, TS', employeeCount: 2200, budgetCr: 840 },
    { id: 'bu-olectra-2', subsidiaryId: 'sub-3', name: 'Polymer Insulators & Components', code: 'BU-OLE-02', head: 'K. Venkatesh', location: 'Shamirpet, TS', employeeCount: 650, budgetCr: 220 },
    { id: 'bu-gas-1', subsidiaryId: 'sub-4', name: 'City Gas Pipeline Operations', code: 'BU-GAS-01', head: 'Sanjay Verma', location: 'Warangal, TS', employeeCount: 1200, budgetCr: 450 },
    { id: 'bu-drill-1', subsidiaryId: 'sub-5', name: 'Heavy Rig Manufacturing & Service', code: 'BU-DRL-01', head: 'Marco Rossi', location: 'Piacenza, Italy', employeeCount: 890, budgetCr: 560 }
  ];

  for (const b of buData) {
    await prisma.businessUnit.upsert({
      where: { id: b.id },
      update: b,
      create: b
    });
  }
  console.log('[Seed] Business Units seeded.');

  // 6. Projects with geographical coordinates and submission states
  const projectsData = [
    {
      id: 'proj-sub3-01',
      subsidiaryId: 'sub-3',
      buId: 'bu-olectra-1',
      name: 'Olectra EV Bus Giga-Manufacturing Hub',
      code: 'OLE-HYD-001',
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      location: 'Shamirpet Green Industrial Zone',
      latitude: 17.589,
      longitude: 78.572,
      projectType: 'Clean Mobility Facility',
      projectStatus: 'Active',
      reportingYear: 'FY 2025-26',
      esgCompletion: 100.0,
      brsrCompletion: 100.0,
      submissionStatus: 'Approved',
      approvalStatus: 'Approved by Central MEIL Admin',
      safetyIncidents: 0,
      valueCr: 950.0
    },
    {
      id: 'proj-sub1-01',
      subsidiaryId: 'sub-1',
      buId: 'bu-hydro-1',
      name: 'Polavaram Major Multi-Purpose Hydro Project',
      code: 'HYD-POL-001',
      country: 'India',
      state: 'Andhra Pradesh',
      city: 'Polavaram',
      location: 'Godavari River Basin',
      latitude: 17.262,
      longitude: 81.654,
      projectType: 'Hydropower & Irrigation',
      projectStatus: 'Active',
      reportingYear: 'FY 2025-26',
      esgCompletion: 88.0,
      brsrCompletion: 84.0,
      submissionStatus: 'Submitted',
      approvalStatus: 'Under Executive Review',
      safetyIncidents: 1,
      valueCr: 14500.0
    },
    {
      id: 'proj-sub4-01',
      subsidiaryId: 'sub-4',
      buId: 'bu-gas-1',
      name: 'Warangal & Nizamabad City Gas Pipeline Grid',
      code: 'GAS-WGL-001',
      country: 'India',
      state: 'Telangana',
      city: 'Warangal',
      location: 'Warangal Urban & Rural Network',
      latitude: 17.978,
      longitude: 79.594,
      projectType: 'City Gas Infrastructure',
      projectStatus: 'Active',
      reportingYear: 'FY 2025-26',
      esgCompletion: 65.0,
      brsrCompletion: 60.0,
      submissionStatus: 'Correction_Required',
      approvalStatus: 'Correction Requested: Clarify Fugitive Scope 1',
      safetyIncidents: 0,
      valueCr: 420.0
    },
    {
      id: 'proj-sub5-01',
      subsidiaryId: 'sub-5',
      buId: 'bu-drill-1',
      name: 'Kakinada Offshore Drill Rig Fabrication Yard',
      code: 'DRL-KKD-001',
      country: 'India',
      state: 'Andhra Pradesh',
      city: 'Kakinada',
      location: 'Kakinada Deepwater Port Enclave',
      latitude: 16.989,
      longitude: 82.247,
      projectType: 'Heavy Rig Engineering',
      projectStatus: 'Active',
      reportingYear: 'FY 2025-26',
      esgCompletion: 52.0,
      brsrCompletion: 48.0,
      submissionStatus: 'Rejected',
      approvalStatus: 'Rejected: Incomplete Scope 2 Billing Evidence',
      safetyIncidents: 2,
      valueCr: 380.0
    },
    {
      id: 'proj-sub2-01',
      subsidiaryId: 'sub-2',
      buId: 'bu-hwy-1',
      name: 'Zojila Pass Strategic All-Weather Tunnel',
      code: 'HWY-ZOJ-001',
      country: 'India',
      state: 'Jammu and Kashmir',
      city: 'Sonamarg / Kargil',
      location: 'NH-1 Zojila Pass (11,578 ft elevation)',
      latitude: 34.298,
      longitude: 75.210,
      projectType: 'Alpine Tunnel & Highway',
      projectStatus: 'Active',
      reportingYear: 'FY 2025-26',
      esgCompletion: 40.0,
      brsrCompletion: 35.0,
      submissionStatus: 'Draft',
      approvalStatus: 'Draft Saved Locally',
      safetyIncidents: 1,
      valueCr: 4600.0
    }
  ];

  for (const p of projectsData) {
    await prisma.project.upsert({
      where: { code: p.code },
      update: p,
      create: p
    });
  }
  console.log('[Seed] 5 Projects seeded across all required approval lifecycle states.');

  // 7. Emission Factors (Official transparent standards: IPCC 2006, CEA CO2 Database 2024, BEE India)
  const factorsData = [
    {
      id: 'ef-diesel-01',
      category: 'Scope 1 Fuel',
      fuelType: 'Diesel',
      factor: 2.68,
      unit: 'kg CO2e',
      activityUnit: 'Litres',
      source: 'IPCC 2006 Guidelines for National Greenhouse Gas Inventories',
      version: 'v2025.1',
      isDefault: true
    },
    {
      id: 'ef-petrol-01',
      category: 'Scope 1 Fuel',
      fuelType: 'Petrol',
      factor: 2.31,
      unit: 'kg CO2e',
      activityUnit: 'Litres',
      source: 'IPCC 2006 Guidelines / DEFRA 2024',
      version: 'v2025.1',
      isDefault: true
    },
    {
      id: 'ef-natgas-01',
      category: 'Scope 1 Fuel',
      fuelType: 'Natural Gas',
      factor: 1.93,
      unit: 'kg CO2e',
      activityUnit: 'SCM',
      source: 'IPCC 2006 / BEE India 2024',
      version: 'v2025.1',
      isDefault: true
    },
    {
      id: 'ef-grid-elec-01',
      category: 'Scope 2 Electricity',
      fuelType: 'Grid Electricity',
      factor: 0.716,
      unit: 'kg CO2e',
      activityUnit: 'kWh',
      source: 'Central Electricity Authority (CEA) CO2 Baseline Database v19, 2024',
      version: 'v2025.1',
      isDefault: true
    },
    {
      id: 'ef-solar-pv-01',
      category: 'Scope 2 Electricity',
      fuelType: 'Solar PV (Captive / PPA)',
      factor: 0.041,
      unit: 'kg CO2e',
      activityUnit: 'kWh',
      source: 'NREL Life Cycle Greenhouse Gas Emissions from Electricity Generation',
      version: 'v2025.1',
      isDefault: true
    },
    {
      id: 'ef-cement-opc-01',
      category: 'Materials',
      fuelType: 'Ordinary Portland Cement (OPC 53)',
      factor: 0.860,
      unit: 'tonnes CO2e',
      activityUnit: 'Tonnes',
      source: 'CSI / GCCA Cement Carbon Protocol & Bureau of Energy Efficiency',
      version: 'v2025.1',
      isDefault: true
    },
    {
      id: 'ef-cement-ppc-01',
      category: 'Materials',
      fuelType: 'Fly-Ash Blended Cement (PPC 35% fly ash)',
      factor: 0.585,
      unit: 'tonnes CO2e',
      activityUnit: 'Tonnes',
      source: 'Bureau of Energy Efficiency (BEE) PAT Scheme Baseline Data',
      version: 'v2025.1',
      isDefault: true
    }
  ];

  for (const f of factorsData) {
    await prisma.emissionFactor.upsert({
      where: { id: f.id },
      update: f,
      create: f
    });
  }
  console.log('[Seed] Official Versioned Emission Factors seeded.');

  // 8. UN SDGs Catalog (1 to 17)
  const sdgs = [
    { id: 1, title: 'No Poverty', category: 'Social', description: 'End poverty in all its forms everywhere.' },
    { id: 2, title: 'Zero Hunger', category: 'Social', description: 'End hunger, achieve food security and improved nutrition.' },
    { id: 3, title: 'Good Health & Well-being', category: 'Social', description: 'Ensure healthy lives and promote well-being for all.' },
    { id: 4, title: 'Quality Education', category: 'Social', description: 'Ensure inclusive and equitable quality education.' },
    { id: 5, title: 'Gender Equality', category: 'Social', description: 'Achieve gender equality and empower all women and girls.' },
    { id: 6, title: 'Clean Water & Sanitation', category: 'Environment', description: 'Ensure availability and sustainable management of water.' },
    { id: 7, title: 'Affordable & Clean Energy', category: 'Environment', description: 'Ensure access to affordable, reliable, sustainable and modern energy.' },
    { id: 8, title: 'Decent Work & Economic Growth', category: 'Social', description: 'Promote sustained, inclusive and sustainable economic growth.' },
    { id: 9, title: 'Industry, Innovation & Infrastructure', category: 'Governance', description: 'Build resilient infrastructure and foster innovation.' },
    { id: 10, title: 'Reduced Inequalities', category: 'Social', description: 'Reduce inequality within and among countries.' },
    { id: 11, title: 'Sustainable Cities & Communities', category: 'Governance', description: 'Make cities and human settlements inclusive, safe and sustainable.' },
    { id: 12, title: 'Responsible Consumption & Production', category: 'Environment', description: 'Ensure sustainable consumption and production patterns.' },
    { id: 13, title: 'Climate Action', category: 'Environment', description: 'Take urgent action to combat climate change and its impacts.' },
    { id: 14, title: 'Life Below Water', category: 'Environment', description: 'Conserve and sustainably use oceans and marine resources.' },
    { id: 15, title: 'Life on Land', category: 'Environment', description: 'Protect, restore and promote sustainable use of terrestrial ecosystems.' },
    { id: 16, title: 'Peace, Justice & Strong Institutions', category: 'Governance', description: 'Promote peaceful societies and build accountable institutions.' },
    { id: 17, title: 'Partnerships for the Goals', category: 'Governance', description: 'Strengthen global partnerships for sustainable development.' }
  ];

  for (const s of sdgs) {
    await prisma.sdgTarget.upsert({
      where: { id: s.id },
      update: s,
      create: s
    });
  }
  console.log('[Seed] UN SDGs Catalog seeded.');

  // 9. SDG Contributions (Linked to Subsidiaries & Projects)
  const sdgContributionsData = [
    {
      id: 'sdg-contrib-01',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      sdgNumber: 7,
      reportingYear: 'FY 2025-26',
      initiativeName: 'Solar Rooftop & 100% EV Factory Fleet',
      description: 'Installed 2.4 MWp solar PV rooftop at Shamirpet facility supplying 42% of annual factory electricity.',
      kpi: 'Clean Renewable Electricity Share',
      baseline: 15.0,
      currentValue: 42.0,
      targetValue: 60.0,
      progressPct: 70.0,
      unit: '%',
      status: 'Approved',
      submittedBy: 'Praveen Kumar',
      reviewedBy: 'P. V. Krishna Reddy',
      reviewerNotes: 'Verified against grid net-metering bills.'
    },
    {
      id: 'sdg-contrib-02',
      subsidiaryId: 'sub-1',
      projectId: 'proj-sub1-01',
      sdgNumber: 6,
      reportingYear: 'FY 2025-26',
      initiativeName: 'Godavari River Basin Water Quality & Sedimentation Monitoring',
      description: 'Automated real-time turbidity and biological oxygen demand sensors installed across downstream river points.',
      kpi: 'Water Quality Compliance Index',
      baseline: 82.0,
      currentValue: 94.5,
      targetValue: 100.0,
      progressPct: 94.5,
      unit: '%',
      status: 'Submitted',
      submittedBy: 'Rameshwar Rao'
    },
    {
      id: 'sdg-contrib-03',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      sdgNumber: 13,
      reportingYear: 'FY 2025-26',
      initiativeName: 'Electric Transit Bus Zero-Tailpipe Emission Impact',
      description: 'Over 1,200 commercial electric buses deployed across Indian state transport corporations eliminating 48,000 MT diesel CO2e.',
      kpi: 'Avoided CO2e Emissions',
      baseline: 24000,
      currentValue: 48500,
      targetValue: 60000,
      progressPct: 80.8,
      unit: 'MT CO2e',
      status: 'Approved',
      submittedBy: 'Praveen Kumar',
      reviewedBy: 'Vikramaditya Roy'
    }
  ];

  for (const c of sdgContributionsData) {
    await prisma.sdgContribution.upsert({
      where: { id: c.id },
      update: c,
      create: c
    });
  }
  console.log('[Seed] SDG Contributions seeded.');

  // 10. Evidence Document & Snap-to-BRSR Sample Record
  const sampleEvidence = await prisma.evidenceDocument.upsert({
    where: { id: 'doc-diesel-001' },
    update: {},
    create: {
      id: 'doc-diesel-001',
      filename: 'diesel_bill_invoice_sep2026.pdf',
      originalName: 'IOCL_Commercial_Fuel_Invoice_98231.pdf',
      mimeType: 'application/pdf',
      fileSize: 348210,
      filePath: 'uploads/diesel_bill_invoice_sep2026.pdf',
      fileHash: 'sha256_8f3b2c1a4e5d6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
      uploadedBy: 'Praveen Kumar',
      uploaderId: 'user-sub-3',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      reportingYear: 'FY 2025-26',
      category: 'Diesel Fuel Invoice',
      ocrStatus: 'COMPLETED',
      verificationStatus: 'Verified'
    }
  });

  // OCR Extraction Record for Sample Diesel Bill
  const sampleOcr = await prisma.ocrExtraction.upsert({
    where: { id: 'ocr-ext-001' },
    update: {},
    create: {
      id: 'ocr-ext-001',
      evidenceId: sampleEvidence.id,
      documentType: 'Diesel Fuel Invoice',
      rawText: 'INDIAN OIL CORPORATION LTD - COMMERCIAL INVOICE #98231. Customer: Olectra Greentech Ltd. Site: Shamirpet Plant Generator 2. Date: 15-Sep-2026. Item: High Speed Diesel (HSD). Quantity: 1000 Litres. Rate: 92.50 INR. Total: INR 92,500.00.',
      extractedJson: {
        fuelType: 'Diesel',
        quantity: 1000,
        unit: 'Litres',
        invoiceDate: '2026-09-15',
        vendor: 'Indian Oil Corporation Ltd',
        site: 'Olectra EV Bus Giga-Manufacturing Hub',
        costInr: 92500,
        invoiceNumber: 'IOCL-98231',
        mappedCategory: 'Scope 1 / Fuel Consumption',
        emissionFactor: 2.68,
        calculatedCo2eKg: 2680.0,
        calculatedCo2eMt: 2.68
      },
      confidenceScore: 94.6,
      provider: 'LOCAL_DOCUMENT_OCR_ENGINE',
      status: 'COMPLETED',
      reviewedBy: 'Praveen Kumar',
      reviewedAt: new Date('2026-09-16T10:30:00Z')
    }
  });

  // 11. Emission Records (Scope 1, 2, 3)
  const emissionsData = [
    {
      id: 'em-sub3-scope1',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      reportingYear: 'FY 2025-26',
      scope: 'Scope 1',
      categoryName: 'Stationary Diesel Combustion',
      activityValue: 125000,
      activityUnit: 'Litres',
      factorId: 'ef-diesel-01',
      emissionFactorVal: 2.68,
      factorSource: 'IPCC 2006',
      calculatedCo2eKg: 335000.0,
      calculatedCo2eMt: 335.0,
      evidenceId: sampleEvidence.id
    },
    {
      id: 'em-sub3-scope2',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      reportingYear: 'FY 2025-26',
      scope: 'Scope 2',
      categoryName: 'Purchased Grid Electricity',
      activityValue: 1850000,
      activityUnit: 'kWh',
      factorId: 'ef-grid-elec-01',
      emissionFactorVal: 0.716,
      factorSource: 'CEA CO2 Database v19',
      calculatedCo2eKg: 1324600.0,
      calculatedCo2eMt: 1324.6,
      evidenceId: null
    },
    {
      id: 'em-sub1-scope1',
      subsidiaryId: 'sub-1',
      projectId: 'proj-sub1-01',
      reportingYear: 'FY 2025-26',
      scope: 'Scope 1',
      categoryName: 'Heavy Earthmoving Equipment Diesel',
      activityValue: 1850000,
      activityUnit: 'Litres',
      factorId: 'ef-diesel-01',
      emissionFactorVal: 2.68,
      factorSource: 'IPCC 2006',
      calculatedCo2eKg: 4958000.0,
      calculatedCo2eMt: 4958.0,
      evidenceId: null
    }
  ];

  for (const e of emissionsData) {
    await prisma.emissionRecord.upsert({
      where: { id: e.id },
      update: e,
      create: e
    });
  }
  console.log('[Seed] Emission Records seeded.');

  // 12. Submissions across the exact lifecycle
  const submissionsData = [
    {
      id: 'SUBM-2026-001',
      subsidiaryId: 'sub-3',
      projectId: 'proj-sub3-01',
      reportingYear: 'FY 2025-26',
      reportType: 'Integrated ESG & BRSR Report',
      status: 'Approved',
      submittedBy: 'Praveen Kumar',
      submissionDate: new Date('2026-08-20T14:30:00Z'),
      reviewedBy: 'P. V. Krishna Reddy',
      approvalDate: new Date('2026-08-25T11:00:00Z'),
      reviewerNotes: 'Comprehensive submission with complete energy invoices and water recycling meters. Approved for group consolidation.',
      esgScore: 92.5,
      brsrScore: 89.0
    },
    {
      id: 'SUBM-2026-002',
      subsidiaryId: 'sub-1',
      projectId: 'proj-sub1-01',
      reportingYear: 'FY 2025-26',
      reportType: 'Integrated ESG & BRSR Report',
      status: 'Submitted',
      submittedBy: 'Rameshwar Rao',
      submissionDate: new Date('2026-09-28T09:15:00Z'),
      reviewedBy: null,
      approvalDate: null,
      reviewerNotes: 'Pending review by Group Chief Sustainability Officer.',
      esgScore: 88.0,
      brsrScore: 84.0
    },
    {
      id: 'SUBM-2026-003',
      subsidiaryId: 'sub-4',
      projectId: 'proj-sub4-01',
      reportingYear: 'FY 2025-26',
      reportType: 'Integrated ESG & BRSR Report',
      status: 'Correction_Required',
      submittedBy: 'Sanjay Verma',
      submissionDate: new Date('2026-09-10T16:00:00Z'),
      reviewedBy: 'Vikramaditya Roy',
      approvalDate: null,
      reviewerNotes: 'Please provide certified calibration certificates for natural gas leak detection sensors and reconcile city gate gas volume differences.',
      esgScore: 68.0,
      brsrScore: 64.0
    },
    {
      id: 'SUBM-2026-004',
      subsidiaryId: 'sub-5',
      projectId: 'proj-sub5-01',
      reportingYear: 'FY 2025-26',
      reportType: 'Integrated ESG & BRSR Report',
      status: 'Rejected',
      submittedBy: 'Marco Rossi',
      submissionDate: new Date('2026-09-02T11:20:00Z'),
      reviewedBy: 'P. V. Krishna Reddy',
      approvalDate: null,
      reviewerNotes: 'Scope 2 energy consumption missing third-party utility meter readouts. Rejection filed; resubmission required with full utility backing.',
      esgScore: 54.0,
      brsrScore: 50.0
    }
  ];

  for (const s of submissionsData) {
    await prisma.submission.upsert({
      where: { id: s.id },
      update: s,
      create: s
    });
  }
  console.log('[Seed] Submissions seeded with all required statuses.');

  // 13. Hotspots (Identified Risk & High-Impact Areas)
  const hotspotsData = [
    {
      id: 'hotspot-01',
      subsidiaryId: 'sub-1',
      projectId: 'proj-sub1-01',
      reportingYear: 'FY 2025-26',
      hotspotType: 'HIGH_SCOPE1',
      severity: 'CRITICAL',
      metricName: 'Heavy Machinery Diesel Consumption',
      value: 4958.0,
      threshold: 1500.0,
      percentShare: 64.2,
      description: 'Polavaram Hydro project accounts for 64.2% of group diesel consumption due to 24/7 excavation & concrete pumping.'
    },
    {
      id: 'hotspot-02',
      subsidiaryId: 'sub-4',
      projectId: 'proj-sub4-01',
      reportingYear: 'FY 2025-26',
      hotspotType: 'OVERDUE_SUBMISSION',
      severity: 'HIGH',
      metricName: 'Correction Turnaround Delay',
      value: 18.0,
      threshold: 10.0,
      percentShare: null,
      description: 'Correction requested for Megha Gas has been pending resubmission for 18 days.'
    },
    {
      id: 'hotspot-03',
      subsidiaryId: 'sub-5',
      projectId: 'proj-sub5-01',
      reportingYear: 'FY 2025-26',
      hotspotType: 'RECURRING_SAFETY',
      severity: 'HIGH',
      metricName: 'Lost-Time Injury Frequency',
      value: 2.0,
      threshold: 0.0,
      percentShare: null,
      description: 'Kakinada Rig Assembly recorded 2 lost-time incidents during crane hoisting operations in Q2.'
    }
  ];

  for (const h of hotspotsData) {
    await prisma.hotspot.upsert({
      where: { id: h.id },
      update: h,
      create: h
    });
  }
  console.log('[Seed] Hotspots seeded.');

  // 14. What-If Simulations (Baseline + Scenario 1: Diesel to Solar)
  const sampleSimulation = await prisma.whatIfSimulation.upsert({
    where: { id: 'sim-solar-001' },
    update: {},
    create: {
      id: 'sim-solar-001',
      title: 'Polavaram Heavy Equipment: 30% Diesel to Solar Replacement',
      scenarioType: 'DIESEL_TO_SOLAR',
      subsidiaryId: 'sub-1',
      projectId: 'proj-sub1-01',
      reportingYear: 'FY 2025-26',
      baselineData: {
        dieselUsageL: 1850000,
        dieselCostInr: 171125000,
        scope1EmissionsMt: 4958.0,
        totalEmissionsMt: 4958.0
      },
      scenarioInputs: {
        replacementPercentage: 30,
        solarCapitalCostPerKwpInr: 45000,
        solarAnnualYieldKwhPerKwp: 1600,
        solarLifecycleEmissionFactor: 0.041
      },
      resultsData: {
        remainingDieselL: 1295000,
        replacedDieselL: 555000,
        solarKwhGenerated: 2192250,
        newScope1Mt: 3470.6,
        newSolarScope2Mt: 89.9,
        netEmissionsMt: 3560.5,
        emissionReductionMt: 1397.5,
        percentageEmissionReduction: 28.2,
        annualFuelCostSavedInr: 51337500,
        solarAnnualOpexInr: 1250000,
        netAnnualCostSavingsInr: 50087500
      },
      createdById: 'user-main-1',
      createdByName: 'P. V. Krishna Reddy'
    }
  });
  console.log('[Seed] What-If Simulation scenario seeded:', sampleSimulation.title);

  // 15. Audit Logs
  const auditLogsData = [
    {
      actor: 'P. V. Krishna Reddy',
      role: 'MAIN_ADMIN',
      userId: 'user-main-1',
      action: 'LOGIN',
      entity: 'Session',
      entityId: 'user-main-1',
      details: 'Main Company Admin authenticated via corporate portal from Hyderabad HQ.',
      timestamp: new Date('2026-10-01T09:00:00Z')
    },
    {
      actor: 'Praveen Kumar',
      role: 'SUB_ADMIN',
      userId: 'user-sub-3',
      action: 'SNAP_OCR',
      entity: 'EvidenceDocument',
      entityId: sampleEvidence.id,
      details: 'Uploaded Diesel Bill invoice #IOCL-98231. Extracted 1,000 Litres diesel via OCR with 94.6% confidence.',
      timestamp: new Date('2026-09-15T10:15:00Z')
    },
    {
      actor: 'P. V. Krishna Reddy',
      role: 'MAIN_ADMIN',
      userId: 'user-main-1',
      action: 'APPROVE',
      entity: 'Submission',
      entityId: 'SUBM-2026-001',
      details: 'Approved Olectra Greentech integrated filing SUBM-2026-001. Rolled data into consolidated group ESG metrics.',
      timestamp: new Date('2026-08-25T11:00:00Z')
    }
  ];

  for (const a of auditLogsData) {
    await prisma.auditLog.create({
      data: a
    });
  }
  console.log('[Seed] Audit Logs seeded.');

  console.log('✅ [Seed] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ [Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
