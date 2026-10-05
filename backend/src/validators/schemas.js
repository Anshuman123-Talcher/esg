const { z } = require('zod');

// 1. Auth Schemas
const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('A valid corporate email address is required'),
    password: z.string().min(1, 'Password is required')
  })
});

// 2. User Schemas
const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('A valid corporate email address is required'),
    password: z.string().min(4, 'Password must be at least 4 characters'),
    role: z.enum(['MAIN_ADMIN', 'SUB_ADMIN'], {
      errorMap: () => ({ message: "Role must be 'MAIN_ADMIN' or 'SUB_ADMIN'" })
    }),
    title: z.string().trim().optional(),
    subsidiaryId: z.string().trim().nullable().optional()
  }).refine((data) => {
    if (data.role === 'SUB_ADMIN' && !data.subsidiaryId) {
      return false;
    }
    return true;
  }, {
    message: 'Subsidiary ID is required when role is SUB_ADMIN',
    path: ['subsidiaryId']
  })
});

const updateUserAccessSchema = z.object({
  body: z.object({
    accessStatus: z.enum(['Active', 'Suspended', 'Revoked'], {
      errorMap: () => ({ message: "Status must be 'Active', 'Suspended', or 'Revoked'" })
    })
  })
});

// 3. Subsidiary Schemas
const createSubsidiarySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Subsidiary name is required'),
    code: z.string().trim().min(2, 'Subsidiary code is required').toUpperCase(),
    sector: z.string().trim().min(2, 'Sector is required'),
    location: z.string().trim().min(2, 'Location is required'),
    headquarters: z.string().trim().optional(),
    cin: z.string().trim().optional(),
    equityHolding: z.coerce.number().min(0).max(100).default(100.0),
    contactEmail: z.string().trim().email().optional().or(z.literal(''))
  })
});

const updateSubsidiarySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    sector: z.string().trim().optional(),
    location: z.string().trim().optional(),
    headquarters: z.string().trim().optional(),
    cin: z.string().trim().optional(),
    equityHolding: z.coerce.number().min(0).max(100).optional(),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
    status: z.enum(['Active', 'Inactive', 'Archived']).optional()
  })
});

// 4. Business Unit Schemas
const createBusinessUnitSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Business unit name is required'),
    code: z.string().trim().min(2, 'Business unit code is required'),
    subsidiaryId: z.string().trim().optional(),
    head: z.string().trim().optional(),
    location: z.string().trim().optional(),
    employeeCount: z.coerce.number().int().min(0).default(0),
    budgetCr: z.coerce.number().min(0).default(0.0)
  })
});

const updateBusinessUnitSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z.string().trim().min(2).optional(),
    head: z.string().trim().optional(),
    location: z.string().trim().optional(),
    employeeCount: z.coerce.number().int().min(0).optional(),
    budgetCr: z.coerce.number().min(0).optional()
  })
});

// 5. Project Schemas
const createProjectSchema = z.object({
  body: z.object({
    id: z.string().trim().optional(),
    name: z.string().trim().min(2, 'Project name is required'),
    code: z.string().trim().min(2, 'Project code is required'),
    buId: z.string().trim().min(1, 'Business Unit ID (buId) is required'),
    subsidiaryId: z.string().trim().optional(),
    country: z.string().trim().default('India'),
    state: z.string().trim().optional(),
    city: z.string().trim().optional(),
    location: z.string().trim().optional(),
    latitude: z.coerce.number().default(17.3850),
    longitude: z.coerce.number().default(78.4867),
    projectType: z.string().trim().default('Infrastructure'),
    reportingYear: z.string().trim().default('FY 2025-26'),
    isInternational: z.boolean().default(false),
    client: z.string().trim().optional(),
    valueCr: z.coerce.number().min(0).optional()
  })
});

const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z.string().trim().min(2).optional(),
    buId: z.string().trim().optional(),
    country: z.string().trim().optional(),
    state: z.string().trim().optional(),
    city: z.string().trim().optional(),
    location: z.string().trim().optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    projectType: z.string().trim().optional(),
    projectStatus: z.string().trim().optional(),
    reportingYear: z.string().trim().optional(),
    isInternational: z.boolean().optional(),
    client: z.string().trim().optional(),
    valueCr: z.coerce.number().min(0).optional(),
    safetyIncidents: z.coerce.number().int().min(0).optional()
  })
});

// 6. Submissions & Workflow
const saveDraftSubmissionSchema = z.object({
  body: z.object({
    subsidiaryId: z.string().trim().optional(),
    year: z.string().trim().default('FY 2025-26'),
    reportType: z.string().trim().default('Integrated ESG & BRSR Report'),
    esgScore: z.coerce.number().min(0).max(100).default(70),
    brsrScore: z.coerce.number().min(0).max(100).default(65)
  })
});

const approveSubmissionSchema = z.object({
  body: z.object({
    notes: z.string().trim().min(1, 'Approval remarks are required').default('Verified and approved by Central MEIL ESG Committee.')
  })
});

const requestCorrectionSubmissionSchema = z.object({
  body: z.object({
    comment: z.string().trim().min(1, 'Reviewer comments detailing required revision are mandatory')
  })
});

const rejectSubmissionSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1, 'Specific formal justification for rejection is mandatory')
  })
});

// 7. SDG Contributions
const saveSdgContributionSchema = z.object({
  body: z.object({
    id: z.string().trim().optional(),
    subsidiaryId: z.string().trim().optional(),
    projectId: z.string().trim().nullable().optional(),
    sdgNumber: z.coerce.number().int().min(1).max(17, 'SDG number must be between 1 and 17'),
    reportingYear: z.string().trim().default('FY 2025-26'),
    initiativeName: z.string().trim().min(2, 'Initiative name is required'),
    description: z.string().trim().min(3, 'Description is required'),
    kpi: z.string().trim().min(2, 'KPI metric description is required'),
    baseline: z.coerce.number().default(0.0),
    currentValue: z.coerce.number().default(0.0),
    targetValue: z.coerce.number().default(100.0),
    progressPct: z.coerce.number().min(0).max(100).default(0.0),
    unit: z.string().trim().optional(),
    evidenceId: z.string().trim().nullable().optional()
  })
});

// 8. Snap to BRSR
const saveSnapRecordSchema = z.object({
  body: z.object({
    evidenceId: z.string().trim().optional(),
    projectId: z.string().trim().nullable().optional(),
    subsidiaryId: z.string().trim().optional(),
    reportingYear: z.string().trim().default('FY 2025-26'),
    fuelType: z.string().trim().min(1, 'Fuel or energy type is required'),
    quantity: z.coerce.number().positive('Quantity must be greater than 0'),
    unit: z.string().trim().min(1, 'Unit of measurement is required'),
    invoiceDate: z.string().trim().optional(),
    vendor: z.string().trim().optional(),
    totalCostInr: z.coerce.number().min(0).optional(),
    isHumanCorrected: z.boolean().default(false),
    correctedFields: z.record(z.any()).optional()
  })
});

// 9. What-If Simulation
const simulateWhatIfSchema = z.object({
  body: z.object({
    scenarioType: z.enum(['DIESEL_TO_SOLAR', 'DIESEL_TO_GRID', 'FLY_ASH_CEMENT', 'CUSTOM']),
    projectId: z.string().trim().min(1, 'Project selection is required for simulation'),
    inputs: z.record(z.any()).default({})
  })
});

const saveWhatIfSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, 'Simulation title is required'),
    scenarioType: z.string().trim(),
    subsidiaryId: z.string().trim().optional(),
    projectId: z.string().trim().nullable().optional(),
    reportingYear: z.string().trim().default('FY 2025-26'),
    baselineData: z.record(z.any()),
    scenarioInputs: z.record(z.any()),
    resultsData: z.record(z.any())
  })
});

// 10. Reports
const generateReportSchema = z.object({
  body: z.object({
    reportType: z.enum([
      'CONSOLIDATED_ESG',
      'BRSR_EXECUTIVE',
      'SUBSIDIARY_ESG',
      'PROJECT_AUDIT',
      'CONTROL_TOWER',
      'WHAT_IF'
    ]).default('CONSOLIDATED_ESG'),
    title: z.string().trim().optional(),
    subsidiaryId: z.string().trim().nullable().optional(),
    reportingYear: z.string().trim().default('FY 2025-26'),
    format: z.enum(['PDF', 'EXCEL', 'CSV']).default('PDF')
  })
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserAccessSchema,
  createSubsidiarySchema,
  updateSubsidiarySchema,
  createBusinessUnitSchema,
  updateBusinessUnitSchema,
  createProjectSchema,
  updateProjectSchema,
  saveDraftSubmissionSchema,
  approveSubmissionSchema,
  requestCorrectionSubmissionSchema,
  rejectSubmissionSchema,
  saveSdgContributionSchema,
  saveSnapRecordSchema,
  simulateWhatIfSchema,
  saveWhatIfSchema,
  generateReportSchema
};
