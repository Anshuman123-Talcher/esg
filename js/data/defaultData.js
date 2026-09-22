/**
 * Centralized Initial Sample Data for MEIL ESG & BRSR System
 * Megha Engineering and Infrastructures Limited (MEIL) Group
 */
const DEFAULT_DATA = {
  mainCompany: {
    id: "meil-group",
    name: "Megha Engineering & Infrastructures Limited (MEIL)",
    shortName: "MEIL Group",
    cin: "U45202TG2006PLC050271",
    founded: "1989",
    headquarters: "MEIL House, 8-2-334/1, Road No. 3, Banjara Hills, Hyderabad - 500034, Telangana, India",
    industry: "Infrastructure, Energy, Transportation & Manufacturing",
    website: "https://www.meil.in",
    chairman: "P.P. Reddy",
    md: "P.V. Krishna Reddy",
    activeReportingYear: "FY 2025-26",
    reportingCycles: ["FY 2025-26", "FY 2024-25", "FY 2023-24"],
    contactEmail: "sustainability@meil.in",
    totalProjectsCount: 254,
    description: "Megha Engineering & Infrastructures Limited (MEIL) is a major diversified conglomerate engaged in manufacturing, EPC, irrigation, oil & gas, city gas distribution, defense equipment, and green mobility."
  },

  subsidiaries: [
    {
      id: "sub-1",
      name: "MEIL Hydro & Power Infrastructure Ltd.",
      shortName: "MEIL Hydro & Power",
      cin: "U40106TG2011PLC074902",
      headquarters: "Hyderabad, Telangana",
      businessType: "Hydroelectric, Lift Irrigation & Solar Mega-Parks",
      leadAdminName: "Rameshwar Rao",
      leadAdminEmail: "hydro.admin@meil.in",
      buCount: 2,
      projectCount: 42,
      status: "Active",
      lastUpdated: "2026-09-19 14:30",
      complianceScore: 94
    },
    {
      id: "sub-2",
      name: "Megha City Gas Distribution Pvt. Ltd. (MCGDL)",
      shortName: "Megha City Gas",
      cin: "U11100TG2019PTC134210",
      headquarters: "Hyderabad, Telangana",
      businessType: "City Gas Distribution (CNG & PNG Infrastructure)",
      leadAdminName: "Sanjay Verma",
      leadAdminEmail: "gas.admin@meil.in",
      buCount: 2,
      projectCount: 38,
      status: "Active",
      lastUpdated: "2026-09-18 17:15",
      complianceScore: 78
    },
    {
      id: "sub-3",
      name: "Olectra Greentech Limited",
      shortName: "Olectra Greentech",
      cin: "L34100TG2000PLC035451",
      headquarters: "Jubilee Hills, Hyderabad",
      businessType: "Electric Buses, E-Mobility & Composite Insulators (NSE Listed)",
      leadAdminName: "Praveen Kumar",
      leadAdminEmail: "olectra.admin@meil.in",
      buCount: 2,
      projectCount: 24,
      status: "Active",
      lastUpdated: "2026-09-20 11:20",
      complianceScore: 91
    },
    {
      id: "sub-4",
      name: "Drillmec International Solutions",
      shortName: "Drillmec Energy",
      cin: "U29299TG2020FTC142991",
      headquarters: "Piacenza (Italy) / Hyderabad Ops",
      businessType: "Advanced Oil & Gas Rigs, Geothermal & Exploration EPC",
      leadAdminName: "Marco Rossi / K. V. Sharma",
      leadAdminEmail: "drillmec.admin@meil.in",
      buCount: 2,
      projectCount: 19,
      status: "Active",
      lastUpdated: "2026-09-15 09:40",
      complianceScore: 65
    },
    {
      id: "sub-5",
      name: "MEIL Transportation & Highways Ltd.",
      shortName: "MEIL Highways",
      cin: "U45203TG2015PLC098231",
      headquarters: "Hyderabad, Telangana",
      businessType: "Tunnels, Expressways & Mega Railway Infrastructure",
      leadAdminName: "Col. D. S. Rathore",
      leadAdminEmail: "highways.admin@meil.in",
      buCount: 3,
      projectCount: 65,
      status: "Active",
      lastUpdated: "2026-09-19 16:05",
      complianceScore: 92
    }
  ],

  businessUnits: [
    { id: "bu-101", subsidiaryId: "sub-1", name: "Lift Irrigation & Hydro Power BU", head: "M. Ramakrishna", activities: "Mega lift irrigation dams, pump houses, penstocks", projectCount: 24, esgStatus: "Approved" },
    { id: "bu-102", subsidiaryId: "sub-1", name: "Solar Mega-Parks BU", head: "Sunil K. Murthy", activities: "Utility-scale ground mounted and floating solar arrays", projectCount: 18, esgStatus: "Approved" },
    { id: "bu-201", subsidiaryId: "sub-2", name: "City Gas Pipelined Network BU", head: "Ajay Tripathy", activities: "Domestic & commercial PNG pipeline laying & maintenance", projectCount: 20, esgStatus: "Correction Required" },
    { id: "bu-202", subsidiaryId: "sub-2", name: "CNG Station Operations BU", head: "Vikram Sengupta", activities: "Mother & daughter CNG station construction & dispensing", projectCount: 18, esgStatus: "Correction Required" },
    { id: "bu-301", subsidiaryId: "sub-3", name: "Electric Bus Manufacturing BU", head: "K. Anand", activities: "OEM fabrication of pure electric 9m & 12m passenger buses", projectCount: 14, esgStatus: "Submitted" },
    { id: "bu-302", subsidiaryId: "sub-3", name: "Polymer Composite Insulators BU", head: "Dr. N. Roy", activities: "High-voltage transmission line composite insulators", projectCount: 10, esgStatus: "Submitted" },
    { id: "bu-401", subsidiaryId: "sub-4", name: "Automated Drilling Rigs BU", head: "Roberto Bernini", activities: "High-spec hydraulic land rigs & offshore drilling units", projectCount: 10, esgStatus: "Draft" },
    { id: "bu-402", subsidiaryId: "sub-4", name: "Geothermal & Deep Wells BU", head: "E. Sreenivas", activities: "Green geothermal exploration & supercritical well execution", projectCount: 9, esgStatus: "Draft" },
    { id: "bu-501", subsidiaryId: "sub-5", name: "Strategic Tunnels & Underground BU", head: "Harpreet Singh", activities: "All-weather high-altitude road tunnels, Himalayan NATM", projectCount: 18, esgStatus: "Approved" },
    { id: "bu-502", subsidiaryId: "sub-5", name: "Highways & Expressways BU", head: "Rajeev Singhal", activities: "Access-controlled 6/8 lane greenfield expressways", projectCount: 28, esgStatus: "Approved" },
    { id: "bu-503", subsidiaryId: "sub-5", name: "Railway Corridors BU", head: "B. Venkatesh", activities: "Dedicated freight corridors, track electrification & viaducts", projectCount: 19, esgStatus: "Approved" }
  ],

  projects: [
    { id: "prj-01", code: "MEIL-ZJ-01", name: "Zojila All-Weather Tunnel Project", subsidiaryId: "sub-5", buId: "bu-501", location: "Sonamarg - Baltal, J&K", status: "In Progress", progress: 68, esgCompletion: 95, brsrCompletion: 92, approved: true },
    { id: "prj-02", code: "MEIL-KL-02", name: "Kaleshwaram Lift Irrigation Link-II", subsidiaryId: "sub-1", buId: "bu-101", location: "Medigadda, Telangana", status: "Operational", progress: 98, esgCompletion: 96, brsrCompletion: 94, approved: true },
    { id: "prj-03", code: "MEIL-PV-03", name: "Polavaram Hydroelectric Power Works", subsidiaryId: "sub-1", buId: "bu-101", location: "Eluru, Andhra Pradesh", status: "In Progress", progress: 74, esgCompletion: 92, brsrCompletion: 90, approved: true },
    { id: "prj-04", code: "MEIL-SL-04", name: "Western MP 500MW Ultra Mega Solar Park", subsidiaryId: "sub-1", buId: "bu-102", location: "Neemuch, Madhya Pradesh", status: "Commissioned", progress: 100, esgCompletion: 98, brsrCompletion: 96, approved: true },
    { id: "prj-05", code: "MCGD-TH-05", name: "Thane & Raigad City Gas Distribution", subsidiaryId: "sub-2", buId: "bu-201", location: "Thane, Maharashtra", status: "In Progress", progress: 58, esgCompletion: 74, brsrCompletion: 70, approved: false },
    { id: "prj-06", code: "MCGD-KR-06", name: "Belagavi District CNG Station Grid", subsidiaryId: "sub-2", buId: "bu-202", location: "Belagavi, Karnataka", status: "In Progress", progress: 62, esgCompletion: 76, brsrCompletion: 72, approved: false },
    { id: "prj-07", code: "OLEC-HY-07", name: "TSRTC 500 E-Bus Fleet & Charging Hubs", subsidiaryId: "sub-3", buId: "bu-301", location: "Hyderabad, Telangana", status: "Active Deployment", progress: 85, esgCompletion: 92, brsrCompletion: 90, approved: false },
    { id: "prj-08", code: "OLEC-PN-08", name: "PMPML Pune 150 Electric Bus Fleet", subsidiaryId: "sub-3", buId: "bu-301", location: "Pune, Maharashtra", status: "Operational", progress: 95, esgCompletion: 90, brsrCompletion: 88, approved: false },
    { id: "prj-09", code: "OLEC-IN-09", name: "765kV Composite Insulator Export Line", subsidiaryId: "sub-3", buId: "bu-302", location: "Dindigul, Tamil Nadu", status: "Operational", progress: 100, esgCompletion: 94, brsrCompletion: 92, approved: false },
    { id: "prj-10", code: "DRIL-ON-10", name: "ONGC 2000HP Automated Land Rig 04", subsidiaryId: "sub-4", buId: "bu-401", location: "Mehsana, Gujarat", status: "Commissioning", progress: 82, esgCompletion: 64, brsrCompletion: 60, approved: false },
    { id: "prj-11", code: "DRIL-GT-11", name: "Tuscany Deep Geothermal Exploration Rig", subsidiaryId: "sub-4", buId: "bu-402", location: "Larderello, Italy", status: "Field Trials", progress: 70, esgCompletion: 66, brsrCompletion: 62, approved: false },
    { id: "prj-12", code: "MEIL-DL-12", name: "Delhi-Amritsar-Katra Expressway Pkg-14", subsidiaryId: "sub-5", buId: "bu-502", location: "Ludhiana, Punjab", status: "In Progress", progress: 72, esgCompletion: 90, brsrCompletion: 89, approved: true },
    { id: "prj-13", code: "MEIL-RW-13", name: "Rishikesh-Karanprayag Rail Tunnel 08", subsidiaryId: "sub-5", buId: "bu-501", location: "Uttarakhand", status: "In Progress", progress: 61, esgCompletion: 91, brsrCompletion: 88, approved: true },
    { id: "prj-14", code: "MEIL-HY-14", name: "Hyderabad Regional Ring Road Pkg-02", subsidiaryId: "sub-5", buId: "bu-502", location: "Telangana", status: "Planning & Mobilization", progress: 30, esgCompletion: 88, brsrCompletion: 86, approved: true }
  ],

  // Subsidiary-level ESG & BRSR Core Datasets
  // Keyed by subsidiaryId and year
  esgData: {
    "sub-1_FY 2025-26": {
      subsidiaryId: "sub-1",
      year: "FY 2025-26",
      status: "Approved",
      submissionId: "SUBM-2026-001",
      environment: {
        totalEnergyMWh: 18450,
        renewableEnergyMWh: 12200,
        nonRenewableEnergyMWh: 6250,
        renewablePercent: 66.1,
        waterWithdrawalKL: 142000,
        waterConsumptionKL: 48500,
        waterRecycledKL: 39500,
        wasteGeneratedMT: 1240,
        wasteRecycledMT: 890,
        wasteDisposalMT: 350,
        ghgScope1: 2850,
        ghgScope2: 1420,
        ghgScope3: 4100,
        totalGHG: 8370,
        biodiversitySaplings: 85000,
        initiatives: "Installed 4.5MW captive floating solar arrays on intake canals; certified 3 batching plants as Zero Liquid Discharge."
      },
      social: {
        totalEmployees: 6420,
        maleEmployees: 5310,
        femaleEmployees: 1110,
        femalePercentage: 17.3,
        permanentEmployees: 2840,
        contractualEmployees: 3580,
        trainingHoursPerEmployee: 38.4,
        safetyTrainingManHours: 124500,
        workplaceIncidents: 1,
        ltifr: 0.08,
        fatalities: 0,
        csrSpendLakhs: 412.5,
        csrBeneficiaries: 28500,
        grievancesReceived: 14,
        grievancesResolved: 14,
        resolutionRate: 100
      },
      governance: {
        boardTotalMembers: 8,
        independentDirectors: 4,
        independentPercent: 50.0,
        womenDirectors: 2,
        esgCommitteeMeetings: 4,
        codeOfConductCompliance: 100,
        antiCorruptionTrainedPercent: 98.5,
        whistleblowerCasesReported: 2,
        whistleblowerCasesResolved: 2,
        cyberSecurityAuditsConducted: 2,
        policyApprovalStatus: "Fully Approved by Board"
      }
    },

    "sub-2_FY 2025-26": {
      subsidiaryId: "sub-2",
      year: "FY 2025-26",
      status: "Correction Required",
      submissionId: "SUBM-2026-002",
      reviewerComments: "Please revise Scope 1 fugitive gas leakage measurements using the updated EPA emission factors and attach calibration certification for compressors in Zone-C.",
      reviewerDate: "2026-09-18",
      reviewerName: "P. V. Krishna Reddy (Main Company Admin)",
      correctionHistory: [
        { date: "2026-09-18 17:15", action: "Correction Requested", reviewer: "Central MEIL Admin", note: "Fugitive emission factor methodology discrepancy in Section C Principle 6." }
      ],
      environment: {
        totalEnergyMWh: 9400,
        renewableEnergyMWh: 2100,
        nonRenewableEnergyMWh: 7300,
        renewablePercent: 22.3,
        waterWithdrawalKL: 28400,
        waterConsumptionKL: 12100,
        waterRecycledKL: 6200,
        wasteGeneratedMT: 410,
        wasteRecycledMT: 280,
        wasteDisposalMT: 130,
        ghgScope1: 6420,
        ghgScope2: 1890,
        ghgScope3: 3100,
        totalGHG: 11410,
        biodiversitySaplings: 24000,
        initiatives: "Solarization of 28 CNG stations with rooftop PV systems; upgraded smart acoustic gas leak detection sensors."
      },
      social: {
        totalEmployees: 2950,
        maleEmployees: 2480,
        femaleEmployees: 470,
        femalePercentage: 15.9,
        permanentEmployees: 1320,
        contractualEmployees: 1630,
        trainingHoursPerEmployee: 29.5,
        safetyTrainingManHours: 58000,
        workplaceIncidents: 2,
        ltifr: 0.14,
        fatalities: 0,
        csrSpendLakhs: 185.0,
        csrBeneficiaries: 14200,
        grievancesReceived: 8,
        grievancesResolved: 7,
        resolutionRate: 87.5
      },
      governance: {
        boardTotalMembers: 6,
        independentDirectors: 3,
        independentPercent: 50.0,
        womenDirectors: 1,
        esgCommitteeMeetings: 3,
        codeOfConductCompliance: 99.2,
        antiCorruptionTrainedPercent: 96.0,
        whistleblowerCasesReported: 1,
        whistleblowerCasesResolved: 1,
        cyberSecurityAuditsConducted: 1,
        policyApprovalStatus: "Pending Board Review"
      }
    },

    "sub-3_FY 2025-26": {
      subsidiaryId: "sub-3",
      year: "FY 2025-26",
      status: "Submitted", // Pending review by Main Company Admin
      submissionId: "SUBM-2026-003",
      environment: {
        totalEnergyMWh: 14200,
        renewableEnergyMWh: 8900,
        nonRenewableEnergyMWh: 5300,
        renewablePercent: 62.7,
        waterWithdrawalKL: 42000,
        waterConsumptionKL: 18500,
        waterRecycledKL: 14800,
        wasteGeneratedMT: 680,
        wasteRecycledMT: 590,
        wasteDisposalMT: 90,
        ghgScope1: 1150,
        ghgScope2: 1680,
        ghgScope3: 5400,
        totalGHG: 8230,
        biodiversitySaplings: 36000,
        initiatives: "Over 8,500 tons of CO2 offset through electric transit buses deployed; manufacturing plant powered by 65% green wheeling tariff."
      },
      social: {
        totalEmployees: 3420,
        maleEmployees: 2690,
        femaleEmployees: 730,
        femalePercentage: 21.3,
        permanentEmployees: 1980,
        contractualEmployees: 1440,
        trainingHoursPerEmployee: 42.0,
        safetyTrainingManHours: 82000,
        workplaceIncidents: 0,
        ltifr: 0.00,
        fatalities: 0,
        csrSpendLakhs: 265.0,
        csrBeneficiaries: 22000,
        grievancesReceived: 6,
        grievancesResolved: 6,
        resolutionRate: 100
      },
      governance: {
        boardTotalMembers: 7,
        independentDirectors: 4,
        independentPercent: 57.1,
        womenDirectors: 2,
        esgCommitteeMeetings: 4,
        codeOfConductCompliance: 100,
        antiCorruptionTrainedPercent: 99.4,
        whistleblowerCasesReported: 0,
        whistleblowerCasesResolved: 0,
        cyberSecurityAuditsConducted: 2,
        policyApprovalStatus: "Fully Approved by Board"
      }
    },

    "sub-4_FY 2025-26": {
      subsidiaryId: "sub-4",
      year: "FY 2025-26",
      status: "Draft",
      submissionId: "SUBM-2026-004",
      environment: {
        totalEnergyMWh: 7800,
        renewableEnergyMWh: 1800,
        nonRenewableEnergyMWh: 6000,
        renewablePercent: 23.1,
        waterWithdrawalKL: 19500,
        waterConsumptionKL: 9200,
        waterRecycledKL: 5400,
        wasteGeneratedMT: 820,
        wasteRecycledMT: 450,
        wasteDisposalMT: 370,
        ghgScope1: 3900,
        ghgScope2: 1250,
        ghgScope3: 2800,
        totalGHG: 7950,
        biodiversitySaplings: 12000,
        initiatives: "R&D investment in low-emission hybrid hydraulic powertrains for drilling rigs."
      },
      social: {
        totalEmployees: 1840,
        maleEmployees: 1610,
        femaleEmployees: 230,
        femalePercentage: 12.5,
        permanentEmployees: 1100,
        contractualEmployees: 740,
        trainingHoursPerEmployee: 31.0,
        safetyTrainingManHours: 49000,
        workplaceIncidents: 1,
        ltifr: 0.11,
        fatalities: 0,
        csrSpendLakhs: 98.0,
        csrBeneficiaries: 8500,
        grievancesReceived: 4,
        grievancesResolved: 4,
        resolutionRate: 100
      },
      governance: {
        boardTotalMembers: 5,
        independentDirectors: 2,
        independentPercent: 40.0,
        womenDirectors: 1,
        esgCommitteeMeetings: 2,
        codeOfConductCompliance: 98.0,
        antiCorruptionTrainedPercent: 94.0,
        whistleblowerCasesReported: 0,
        whistleblowerCasesResolved: 0,
        cyberSecurityAuditsConducted: 1,
        policyApprovalStatus: "In Internal Draft"
      }
    },

    "sub-5_FY 2025-26": {
      subsidiaryId: "sub-5",
      year: "FY 2025-26",
      status: "Approved",
      submissionId: "SUBM-2026-005",
      environment: {
        totalEnergyMWh: 24600,
        renewableEnergyMWh: 9800,
        nonRenewableEnergyMWh: 14800,
        renewablePercent: 39.8,
        waterWithdrawalKL: 186000,
        waterConsumptionKL: 72000,
        waterRecycledKL: 58000,
        wasteGeneratedMT: 3200,
        wasteRecycledMT: 2450,
        wasteDisposalMT: 750,
        ghgScope1: 8200,
        ghgScope2: 2600,
        ghgScope3: 9800,
        totalGHG: 20600,
        biodiversitySaplings: 145000,
        initiatives: "Reclaimed muck utilization for highway sub-base engineering; strict wildlife corridor underpass execution on expressway stretches."
      },
      social: {
        totalEmployees: 9850,
        maleEmployees: 8470,
        femaleEmployees: 1380,
        femalePercentage: 14.0,
        permanentEmployees: 4120,
        contractualEmployees: 5730,
        trainingHoursPerEmployee: 36.5,
        safetyTrainingManHours: 210000,
        workplaceIncidents: 2,
        ltifr: 0.05,
        fatalities: 0,
        csrSpendLakhs: 580.0,
        csrBeneficiaries: 45000,
        grievancesReceived: 18,
        grievancesResolved: 18,
        resolutionRate: 100
      },
      governance: {
        boardTotalMembers: 9,
        independentDirectors: 5,
        independentPercent: 55.6,
        womenDirectors: 2,
        esgCommitteeMeetings: 4,
        codeOfConductCompliance: 100,
        antiCorruptionTrainedPercent: 99.0,
        whistleblowerCasesReported: 1,
        whistleblowerCasesResolved: 1,
        cyberSecurityAuditsConducted: 2,
        policyApprovalStatus: "Fully Approved by Board"
      }
    }
  },

  // BRSR Disclosures Dataset (Representative SEBI BRSR Format)
  brsrData: {
    "sub-1_FY 2025-26": {
      subsidiaryId: "sub-1",
      year: "FY 2025-26",
      status: "Approved",
      sectionA: {
        completed: 100,
        corporateIdentity: "MEIL Hydro & Power Infrastructure Ltd. (CIN: U40106TG2011PLC074902)",
        operationsSummary: "42 active construction sites across 9 states in India.",
        marketsServed: "Indian state power utilities, central public sector undertakings, industrial irrigation boards.",
        totalWorkforce: "6,420 full-time and contractual professionals.",
        csrEligibility: "Yes (Applicable under Section 135 Companies Act 2013). Required 2% spend met."
      },
      sectionB: {
        completed: 100,
        policiesInPlace: "National Guidelines on Responsible Business Conduct (NGRBC) aligned policies across all 9 principles.",
        boardOversight: "Dedicated Board-level Sustainability and CSR Committee meets quarterly.",
        grievanceRedressal: "Digital grievance portal with whistleblower protection and internal complaints committee (ICC).",
        stakeholderEngagement: "Structured annual consultation with local communities, contractors, suppliers, and regulatory bodies."
      },
      sectionC: {
        completed: 96,
        principles: [
          { number: 1, name: "Ethics, Transparency & Accountability", score: 98, status: "Compliant", summary: "Zero tolerance anti-bribery policy; 98.5% employees trained; clean audit findings." },
          { number: 2, name: "Product Life-Cycle Sustainability", score: 94, status: "Compliant", summary: "Eco-design parameters incorporated in intake tunnels and hydraulic pump assemblies." },
          { number: 3, name: "Employee Well-being & Workplace Safety", score: 96, status: "Compliant", summary: "Zero fatalities; LTIFR of 0.08; comprehensive medical insurance & mental health helpline." },
          { number: 4, name: "Stakeholder Engagement & Inclusiveness", score: 92, status: "Compliant", summary: "Periodic community gram sabha meetings prior to project mobilisation." },
          { number: 5, name: "Protection & Promotion of Human Rights", score: 98, status: "Compliant", summary: "Explicit human rights clauses in vendor contracts; zero child or forced labor incidents." },
          { number: 6, name: "Environmental Protection & Climate Action", score: 95, status: "Compliant", summary: "66.1% renewable power mix; 85,000 tree saplings planted; water recycling rate of 81.4%." },
          { number: 7, name: "Responsible Policy Advocacy", score: 90, status: "Compliant", summary: "Participation in industry associations (FICCI, CII) advocating for hydro energy grid stability." },
          { number: 8, name: "Inclusive Growth & Community CSR", score: 96, status: "Compliant", summary: "INR 412.5 Lakhs invested in health clinics, drinking water purification, and vocational schools." },
          { number: 9, name: "Consumer Value & Responsibility", score: 95, status: "Compliant", summary: "Customer satisfaction score of 92%; automated SLA tracking for utility partners." }
        ]
      }
    },

    "sub-2_FY 2025-26": {
      subsidiaryId: "sub-2",
      year: "FY 2025-26",
      status: "Correction Required",
      sectionA: {
        completed: 92,
        corporateIdentity: "Megha City Gas Distribution Pvt. Ltd. (CIN: U11100TG2019PTC134210)",
        operationsSummary: "38 projects and 140+ CNG dispensing stations across 16 districts.",
        marketsServed: "Domestic, Commercial, Industrial piped natural gas and vehicular fuel users.",
        totalWorkforce: "2,950 employees & technician staff.",
        csrEligibility: "Compliant with CSR allocation."
      },
      sectionB: {
        completed: 85,
        policiesInPlace: "HSE and Safety policies active; BRSR formalization pending final board signature.",
        boardOversight: "Quarterly review conducted by executive director.",
        grievanceRedressal: "Consumer toll-free helpline active; internal employee grievance desk functional.",
        stakeholderEngagement: "Public notices and customer awareness drives on natural gas safety."
      },
      sectionC: {
        completed: 78,
        principles: [
          { number: 1, name: "Ethics, Transparency & Accountability", score: 92, status: "Compliant", summary: "Code of conduct communicated to 96% staff." },
          { number: 2, name: "Product Life-Cycle Sustainability", score: 82, status: "Compliant", summary: "Pipeline material recyclability and safety valve endurance certifications." },
          { number: 3, name: "Employee Well-being & Workplace Safety", score: 86, status: "Compliant", summary: "HazMat drills and mandatory fire safety certifications." },
          { number: 4, name: "Stakeholder Engagement & Inclusiveness", score: 75, status: "Needs Attention", summary: "Survey with municipal authorities conducted." },
          { number: 5, name: "Protection & Promotion of Human Rights", score: 90, status: "Compliant", summary: "Anti-discrimination and fair wage policies enforced." },
          { number: 6, name: "Environmental Protection & Climate Action", score: 68, status: "Correction Required", summary: "Scope 1 emission factor documentation must be corrected per reviewer directive." },
          { number: 7, name: "Responsible Policy Advocacy", score: 80, status: "Compliant", summary: "Active member of Natural Gas Society (NGS)." },
          { number: 8, name: "Inclusive Growth & Community CSR", score: 85, status: "Compliant", summary: "Drinking water plants in distribution corridors." },
          { number: 9, name: "Consumer Value & Responsibility", score: 84, status: "Compliant", summary: "Consumer app response times reduced to under 3 hours." }
        ]
      }
    },

    "sub-3_FY 2025-26": {
      subsidiaryId: "sub-3",
      year: "FY 2025-26",
      status: "Submitted",
      sectionA: {
        completed: 100,
        corporateIdentity: "Olectra Greentech Limited (CIN: L34100TG2000PLC035451, NSE: OLECTRA)",
        operationsSummary: "Manufacturing plants in Jadcherla and Hyderabad; operating depots in 12 Indian metro cities.",
        marketsServed: "State Road Transport Undertakings (SRTUs), corporate fleets, Indian Railways, Power Grid Corp.",
        totalWorkforce: "3,420 engineers, technicians and operations crew.",
        csrEligibility: "Full adherence with CSR mandates."
      },
      sectionB: {
        completed: 98,
        policiesInPlace: "ISO 14001, ISO 45001, and SEBI BRSR Core aligned sustainability governance policies.",
        boardOversight: "Board ESG and Risk Management committee with independent chair oversight.",
        grievanceRedressal: "Multi-channel grievance ticketing with 48-hour resolution SLA.",
        stakeholderEngagement: "Annual vendor summits and transit passenger comfort feedback drives."
      },
      sectionC: {
        completed: 94,
        principles: [
          { number: 1, name: "Ethics, Transparency & Accountability", score: 99, status: "Compliant", summary: "SEBI LODR full compliance; transparent quarterly investor calls." },
          { number: 2, name: "Product Life-Cycle Sustainability", score: 98, status: "Compliant", summary: "Electric buses generate zero tailpipe emissions; battery second-life recycling MoU signed." },
          { number: 3, name: "Employee Well-being & Workplace Safety", score: 96, status: "Compliant", summary: "Zero lost-time injuries; factory ergonomics program." },
          { number: 4, name: "Stakeholder Engagement & Inclusiveness", score: 92, status: "Compliant", summary: "Commuter surveys across Mumbai, Pune, and Hyderabad networks." },
          { number: 5, name: "Protection & Promotion of Human Rights", score: 97, status: "Compliant", summary: "Responsible sourcing policy for battery minerals and cobalt auditing." },
          { number: 6, name: "Environmental Protection & Climate Action", score: 96, status: "Compliant", summary: "62.7% renewable factory power; 8,230 tCO2e avoided annually." },
          { number: 7, name: "Responsible Policy Advocacy", score: 92, status: "Compliant", summary: "Policy inputs for FAME-II and PM e-Bus Sewa scheme." },
          { number: 8, name: "Inclusive Growth & Community CSR", score: 94, status: "Compliant", summary: "Skill development centers training EV mechanics and drivers." },
          { number: 9, name: "Consumer Value & Responsibility", score: 95, status: "Compliant", summary: "Telematics and live diagnostics on 100% of bus fleets." }
        ]
      }
    },

    "sub-4_FY 2025-26": {
      subsidiaryId: "sub-4",
      year: "FY 2025-26",
      status: "Draft",
      sectionA: { completed: 60, corporateIdentity: "Drillmec International Solutions", operationsSummary: "Rig fabrication and field ops.", marketsServed: "Oil & Gas operators.", totalWorkforce: "1,840.", csrEligibility: "Applicable." },
      sectionB: { completed: 50, policiesInPlace: "Draft policies under executive revision.", boardOversight: "Scheduled for next quarter.", grievanceRedressal: "Standard HR portal.", stakeholderEngagement: "In progress." },
      sectionC: { completed: 45, principles: [
        { number: 1, name: "Ethics, Transparency & Accountability", score: 85, status: "Draft", summary: "Drafting code." },
        { number: 2, name: "Product Life-Cycle Sustainability", score: 70, status: "Draft", summary: "Rig efficiency evaluation." },
        { number: 3, name: "Employee Well-being & Workplace Safety", score: 80, status: "Draft", summary: "Rig safety protocols." },
        { number: 4, name: "Stakeholder Engagement & Inclusiveness", score: 65, status: "Draft", summary: "Client meetings." },
        { number: 5, name: "Protection & Promotion of Human Rights", score: 80, status: "Draft", summary: "Vendor covenants." },
        { number: 6, name: "Environmental Protection & Climate Action", score: 60, status: "Draft", summary: "Baseline emissions tallying." },
        { number: 7, name: "Responsible Policy Advocacy", score: 70, status: "Draft", summary: "Industry body links." },
        { number: 8, name: "Inclusive Growth & Community CSR", score: 65, status: "Draft", summary: "Local scholarship plans." },
        { number: 9, name: "Consumer Value & Responsibility", score: 75, status: "Draft", summary: "API Q1 & ISO 9001 specs." }
      ]}
    },

    "sub-5_FY 2025-26": {
      subsidiaryId: "sub-5",
      year: "FY 2025-26",
      status: "Approved",
      sectionA: {
        completed: 100,
        corporateIdentity: "MEIL Transportation & Highways Ltd. (CIN: U45203TG2015PLC098231)",
        operationsSummary: "65 highway, tunnel, and railway projects across India.",
        marketsServed: "NHAI, MoRTH, Rail Vikas Nigam Ltd., State PWDs.",
        totalWorkforce: "9,850 personnel.",
        csrEligibility: "Full statutory compliance."
      },
      sectionB: {
        completed: 100,
        policiesInPlace: "All 9 NGRBC principles codified and integrated into site operations manuals.",
        boardOversight: "Board ESG and Health & Safety Committee meets bi-monthly.",
        grievanceRedressal: "24/7 site grievance kiosks and digital complaint portal.",
        stakeholderEngagement: "Landowner and district administration consultations."
      },
      sectionC: {
        completed: 95,
        principles: [
          { number: 1, name: "Ethics, Transparency & Accountability", score: 98, status: "Compliant", summary: "Strict anti-collusion and transparent e-procurement guidelines." },
          { number: 2, name: "Product Life-Cycle Sustainability", score: 93, status: "Compliant", summary: "Use of RAP (Reclaimed Asphalt Pavement) in road construction." },
          { number: 3, name: "Employee Well-being & Workplace Safety", score: 97, status: "Compliant", summary: "210,000 safety training man-hours; zero fatal incidents." },
          { number: 4, name: "Stakeholder Engagement & Inclusiveness", score: 94, status: "Compliant", summary: "Proactive highway user assistance squads and emergency towing." },
          { number: 5, name: "Protection & Promotion of Human Rights", score: 98, status: "Compliant", summary: "Fair living wage standards enforced for all sub-contractors." },
          { number: 6, name: "Environmental Protection & Climate Action", score: 92, status: "Compliant", summary: "145,000 saplings planted along highway medians; 39.8% renewable power." },
          { number: 7, name: "Responsible Policy Advocacy", score: 91, status: "Compliant", summary: "Inputs to IRC (Indian Roads Congress) green highway specifications." },
          { number: 8, name: "Inclusive Growth & Community CSR", score: 98, status: "Compliant", summary: "INR 580 Lakhs dedicated to roadside trauma care units and local schools." },
          { number: 9, name: "Consumer Value & Responsibility", score: 94, status: "Compliant", summary: "Advanced Traffic Management System (ATMS) deployed across corridors." }
        ]
      }
    }
  },

  // Central Submissions Registry
  submissions: [
    {
      id: "SUBM-2026-001",
      subsidiaryId: "sub-1",
      subsidiaryName: "MEIL Hydro & Power Infrastructure Ltd.",
      year: "FY 2025-26",
      reportType: "Integrated ESG & BRSR Report",
      submittedBy: "Rameshwar Rao",
      submissionDate: "2026-09-15 11:20",
      status: "Approved",
      lastUpdated: "2026-09-17 10:15",
      reviewedBy: "Central MEIL ESG Admin",
      approvalDate: "2026-09-17 10:15",
      esgScore: 94,
      brsrScore: 96,
      reviewerNotes: "Approved. All environmental and social indicators are verified with third-party audit reports."
    },
    {
      id: "SUBM-2026-002",
      subsidiaryId: "sub-2",
      subsidiaryName: "Megha City Gas Distribution Pvt. Ltd.",
      year: "FY 2025-26",
      reportType: "Integrated ESG & BRSR Report",
      submittedBy: "Sanjay Verma",
      submissionDate: "2026-09-16 14:45",
      status: "Correction Required",
      lastUpdated: "2026-09-18 17:15",
      reviewedBy: "Central MEIL ESG Admin",
      approvalDate: null,
      esgScore: 76,
      brsrScore: 78,
      reviewerNotes: "Please revise Scope 1 fugitive gas leakage measurements using updated EPA emission factors and attach calibration certification for compressors in Zone-C."
    },
    {
      id: "SUBM-2026-003",
      subsidiaryId: "sub-3",
      subsidiaryName: "Olectra Greentech Limited",
      year: "FY 2025-26",
      reportType: "Integrated ESG & BRSR Report",
      submittedBy: "Praveen Kumar",
      submissionDate: "2026-09-20 11:20",
      status: "Submitted",
      lastUpdated: "2026-09-20 11:20",
      reviewedBy: null,
      approvalDate: null,
      esgScore: 91,
      brsrScore: 94,
      reviewerNotes: "Awaiting review by Main Company Admin."
    },
    {
      id: "SUBM-2026-004",
      subsidiaryId: "sub-4",
      subsidiaryName: "Drillmec International Solutions",
      year: "FY 2025-26",
      reportType: "Integrated ESG & BRSR Report",
      submittedBy: "Marco Rossi",
      submissionDate: null,
      status: "Draft",
      lastUpdated: "2026-09-15 09:40",
      reviewedBy: null,
      approvalDate: null,
      esgScore: 65,
      brsrScore: 52,
      reviewerNotes: null
    },
    {
      id: "SUBM-2026-005",
      subsidiaryId: "sub-5",
      subsidiaryName: "MEIL Transportation & Highways Ltd.",
      year: "FY 2025-26",
      reportType: "Integrated ESG & BRSR Report",
      submittedBy: "Col. D. S. Rathore",
      submissionDate: "2026-09-16 09:10",
      status: "Approved",
      lastUpdated: "2026-09-19 16:05",
      reviewedBy: "Central MEIL ESG Admin",
      approvalDate: "2026-09-19 16:05",
      esgScore: 93,
      brsrScore: 95,
      reviewerNotes: "Approved. Excellent performance on roadside afforestation and zero workplace fatalities."
    }
  ],

  // Notifications System
  notifications: [
    {
      id: "notif-01",
      role: "all",
      subsidiaryId: null,
      type: "submission",
      title: "New BRSR & ESG Submission Received",
      desc: "Olectra Greentech Limited has submitted FY 2025-26 integrated disclosure for Main Admin review.",
      time: "2 hours ago",
      timestamp: "2026-09-20 11:20",
      read: false,
      icon: "FileCheck",
      color: "info"
    },
    {
      id: "notif-02",
      role: "sub_admin",
      subsidiaryId: "sub-2",
      type: "correction",
      title: "Correction Required on Submission",
      desc: "Central Admin requested revisions on Scope 1 fugitive gas leakage measurements for Megha City Gas.",
      time: "3 days ago",
      timestamp: "2026-09-18 17:15",
      read: false,
      icon: "CircleAlert",
      color: "danger"
    },
    {
      id: "notif-03",
      role: "all",
      subsidiaryId: "sub-5",
      type: "approval",
      title: "Submission Approved & Consolidated",
      desc: "MEIL Transportation & Highways Ltd. data has been approved and consolidated into MEIL Group metrics.",
      time: "2 days ago",
      timestamp: "2026-09-19 16:05",
      read: true,
      icon: "CheckCircle2",
      color: "success"
    },
    {
      id: "notif-04",
      role: "all",
      subsidiaryId: null,
      type: "reminder",
      title: "SEBI BRSR Statutory Deadline Approaching",
      desc: "Annual ESG consolidated filing deadline is scheduled in 30 days. 2 subsidiaries pending approval.",
      time: "4 days ago",
      timestamp: "2026-09-17 09:00",
      read: true,
      icon: "Clock",
      color: "warning"
    }
  ],

  // Registered User Accounts for Authentication & RBAC
  users: [
    {
      id: "usr-main-01",
      name: "P. V. Krishna Reddy",
      email: "admin@meil.in",
      password: "admin",
      role: "MAIN_ADMIN",
      title: "Managing Director & Group Sustainability Head",
      subsidiaryId: null,
      status: "ACTIVE",
      lastLogin: "Today, 10:45 AM",
      createdAt: "2025-01-01"
    },
    {
      id: "usr-main-02",
      name: "Vikramaditya Roy",
      email: "admin@apexgroup.com",
      password: "admin",
      role: "MAIN_ADMIN",
      title: "Group Chief Sustainability Officer",
      subsidiaryId: null,
      status: "ACTIVE",
      lastLogin: "Yesterday, 06:12 PM",
      createdAt: "2025-01-01"
    },
    {
      id: "usr-sub-01",
      name: "Rameshwar Rao",
      email: "hydro@meil.in",
      password: "admin",
      role: "SUB_ADMIN",
      title: "Sustainability Officer - Hydro & Power",
      subsidiaryId: "sub-1",
      subsidiaryName: "MEIL Hydro & Power Infrastructure Ltd.",
      status: "ACTIVE",
      lastLogin: "Yesterday, 04:30 PM",
      createdAt: "2025-01-15"
    },
    {
      id: "usr-sub-02",
      name: "Sanjay Verma",
      email: "citygas@meil.in",
      password: "admin",
      role: "SUB_ADMIN",
      title: "ESG Lead - City Gas Distribution",
      subsidiaryId: "sub-2",
      subsidiaryName: "Megha City Gas Distribution Pvt. Ltd.",
      status: "ACTIVE",
      lastLogin: "2 days ago",
      createdAt: "2025-02-01"
    },
    {
      id: "usr-sub-03",
      name: "Praveen Kumar",
      email: "olectra@meil.in",
      password: "admin",
      role: "SUB_ADMIN",
      title: "Head of ESG & Statutory Compliance",
      subsidiaryId: "sub-3",
      subsidiaryName: "Olectra Greentech Limited",
      status: "ACTIVE",
      lastLogin: "Today, 11:20 AM",
      createdAt: "2025-01-10"
    },
    {
      id: "usr-sub-04",
      name: "Marco Rossi",
      email: "drillmec@meil.in",
      password: "admin",
      role: "SUB_ADMIN",
      title: "QHSE & Sustainability Director",
      subsidiaryId: "sub-4",
      subsidiaryName: "Drillmec International Solutions",
      status: "ACTIVE",
      lastLogin: "3 days ago",
      createdAt: "2025-03-01"
    },
    {
      id: "usr-sub-05",
      name: "Col. D. S. Rathore",
      email: "transport@meil.in",
      password: "admin",
      role: "SUB_ADMIN",
      title: "VP - Safety & Sustainable Highways",
      subsidiaryId: "sub-5",
      subsidiaryName: "MEIL Transportation & Highways Ltd.",
      status: "ACTIVE",
      lastLogin: "Sep 19, 03:15 PM",
      createdAt: "2025-01-05"
    },
    // Aliases matching Project 2 accounts for complete backwards compatibility
    {
      id: "usr-sub-06",
      name: "Rajesh Sharma",
      email: "admin@ecotech.com",
      password: "admin",
      role: "SUB_ADMIN",
      title: "Operating Entity ESG Lead",
      subsidiaryId: "sub-3",
      subsidiaryName: "Olectra Greentech Limited",
      status: "ACTIVE",
      lastLogin: "Today, 09:30 AM",
      createdAt: "2025-01-12"
    },
    {
      id: "usr-sub-07",
      name: "Priya Nair",
      email: "admin@greenlogistics.com",
      password: "admin",
      role: "SUB_ADMIN",
      title: "Supply Chain Sustainability Lead",
      subsidiaryId: "sub-2",
      subsidiaryName: "Megha City Gas Distribution Pvt. Ltd.",
      status: "ACTIVE",
      lastLogin: "Yesterday, 02:40 PM",
      createdAt: "2025-01-18"
    }
  ],

  // Granular Business Activities (NIC Codes, Products, Turnover, Green Capex)
  businessActivities: {
    "sub-1": {
      nicCode: "3510 - Electric power generation, transmission and distribution",
      products: "Hydroelectric power generation, floating solar parks, mega lift irrigation pump equipment",
      turnoverCr: 4850.0,
      exportSharePct: 4.2,
      greenCapexCr: 620.0,
      rdCleanTechPct: 3.8
    },
    "sub-2": {
      nicCode: "3520 - Manufacture of gas; distribution of gaseous fuels through mains",
      products: "Piped Natural Gas (PNG) for domestic and industrial use, Compressed Natural Gas (CNG) for vehicles",
      turnoverCr: 2150.0,
      exportSharePct: 0.0,
      greenCapexCr: 280.0,
      rdCleanTechPct: 2.1
    },
    "sub-3": {
      nicCode: "2910 - Manufacture of motor vehicles (Electric Buses and Commercial EV Powertrains)",
      products: "Zero-emission pure electric buses (9m, 12m), high-voltage composite insulators, electric tippers",
      turnoverCr: 1980.5,
      exportSharePct: 12.8,
      greenCapexCr: 440.0,
      rdCleanTechPct: 6.5
    },
    "sub-4": {
      nicCode: "2824 - Manufacture of machinery for mining, quarrying and construction",
      products: "Automatic drilling rigs, continuous pipe tripping rigs, geothermal deep exploration assemblies",
      turnoverCr: 1420.0,
      exportSharePct: 68.5,
      greenCapexCr: 110.0,
      rdCleanTechPct: 4.2
    },
    "sub-5": {
      nicCode: "4210 - Construction of roads and railways (Expressways, Tunnels, Elevated Rail Corridors)",
      products: "Mega civil infrastructure, highway network development, Zojila tunnel construction, elevated transit",
      turnoverCr: 6890.0,
      exportSharePct: 0.0,
      greenCapexCr: 510.0,
      rdCleanTechPct: 2.9
    }
  },

  // Operational Manufacturing Plants & Facilities
  facilities: {
    "sub-1": [
      { name: "Kaleshwaram Lift Irrigation Pumping Stations", location: "Jayashankar Bhupalpally, Telangana", capacity: "3,000 MW pumping capacity", ecNumber: "J-12011/34/2016-IA.I", iso: "ISO 14001, ISO 45001" },
      { name: "Kundah Pumped Storage Hydro Complex", location: "Nilgiris District, Tamil Nadu", capacity: "500 MW Generation", ecNumber: "J-12011/12/2018-IA.I", iso: "ISO 14001, ISO 9001" }
    ],
    "sub-2": [
      { name: "City Gate Station & Mother CNG Hub", location: "Krishna & Guntur, Andhra Pradesh", capacity: "150,000 SCMD Compression", ecNumber: "APPCB/VJA/EC/2020-41", iso: "ISO 14001, ISO 45001" },
      { name: "Rayalseema CGD Compressor Terminal", location: "Kadapa & Kurnool, Andhra Pradesh", capacity: "100,000 SCMD Compression", ecNumber: "APPCB/KNL/EC/2021-19", iso: "ISO 14001" }
    ],
    "sub-3": [
      { name: "Jadcherla EV Manufacturing Mega Plant", location: "Mahabubnagar, Telangana", capacity: "5,000 Electric Buses / annum", ecNumber: "TSPCB/RO-MBNR/EC/2022-09", iso: "ISO 14001, ISO 45001, IATF 16949" },
      { name: "Cherlapally Composite Insulator Facility", location: "Hyderabad, Telangana", capacity: "300,000 Insulator units / annum", ecNumber: "TSPCB/RO-HYD/EC/2019-14", iso: "ISO 9001, ISO 14001" }
    ],
    "sub-4": [
      { name: "Drillmec Advanced Rig Manufacturing Plant", location: "Kandi, Sangareddy, Telangana", capacity: "24 Hydraulic Rigs / annum", ecNumber: "TSPCB/RO-RC/EC/2021-77", iso: "API Spec Q1, ISO 14001, ISO 45001" },
      { name: "Piacenza Engineering & Testing Centre", location: "Piacenza, Emilia-Romagna, Italy", capacity: "Rig R&D & Simulator Testing", ecNumber: "EU-IED-PC-2018/02", iso: "ISO 14001, CE Mark" }
    ],
    "sub-5": [
      { name: "Zojila Tunnel Construction Base Camp & Batching", location: "Baltal / Minamarg, UT of Ladakh & J&K", capacity: "14.15 km All-Weather Tunneling", ecNumber: "MoEFCC/IA/JK/MIS/2019", iso: "ISO 14001, ISO 45001" },
      { name: "Char Dham All-Weather Expressway Base", location: "Uttarkashi, Uttarakhand", capacity: "88 km Hill Highway Construction", ecNumber: "MoEFCC/UK/HWY/2020", iso: "ISO 14001" }
    ]
  },

  // Audit Logs for Governance Tracking
  auditLogs: [
    { timestamp: "2026-09-20 11:20:15", user: "Praveen Kumar", action: "SUBMISSION", details: "Submitted FY 2025-26 Integrated ESG & BRSR Report for Olectra Greentech" },
    { timestamp: "2026-09-19 16:05:40", user: "P. V. Krishna Reddy", action: "APPROVAL", details: "Approved FY 2025-26 disclosures for MEIL Transportation & Highways Ltd." },
    { timestamp: "2026-09-18 17:15:22", user: "Central MEIL ESG Admin", action: "CORRECTION_REQUEST", details: "Requested Scope 1 fugitive gas leakage revisions from Megha City Gas" },
    { timestamp: "2026-09-17 10:15:00", user: "P. V. Krishna Reddy", action: "APPROVAL", details: "Approved FY 2025-26 disclosures for MEIL Hydro & Power Infrastructure Ltd." }
  ]
};
