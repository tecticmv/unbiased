import { z } from "zod";

// =============================================================================
// CONTEXT DATA SCHEMAS - Real-world data for informed feasibility analysis
// =============================================================================

/**
 * Government/Regional budget data - current and historical
 */
export const budgetDataSchema = z.object({
  fiscalYear: z.string(), // e.g., "2024", "2024-2025"
  totalBudget: z.number(), // Total budget in local currency
  allocatedToSector: z.number().optional(), // Amount allocated to relevant sector
  sectorName: z.string().optional(), // e.g., "Education", "Infrastructure", "Healthcare"
  capitalExpenditure: z.number().optional(), // Budget for capital projects
  developmentBudget: z.number().optional(), // Development/project budget
  budgetUtilization: z.number().min(0).max(100).optional(), // % of budget actually spent
  source: z.string().optional(), // Data source reference
});

export const budgetHistorySchema = z.object({
  current: budgetDataSchema,
  previous: z.array(budgetDataSchema).optional(), // Historical budgets for trend analysis
  projectedGrowth: z.number().optional(), // Expected budget growth %
});

/**
 * Census and demographic data for the target area
 */
export const censusDataSchema = z.object({
  totalPopulation: z.number(),
  year: z.number(), // Census year
  populationGrowthRate: z.number().optional(), // Annual growth %
  populationDensity: z.number().optional(), // People per sq km
  ageDistribution: z.object({
    under18: z.number().optional(), // % of population
    adults18to60: z.number().optional(),
    seniors60plus: z.number().optional(),
  }).optional(),
  householdCount: z.number().optional(),
  averageHouseholdSize: z.number().optional(),
  urbanRuralSplit: z.object({
    urban: z.number(), // % urban
    rural: z.number(), // % rural
  }).optional(),
  literacyRate: z.number().optional(),
  employmentRate: z.number().optional(),
});

/**
 * Economic indicators for the area
 */
export const economicDataSchema = z.object({
  gdpPerCapita: z.number().optional(),
  averageHouseholdIncome: z.number().optional(),
  medianIncome: z.number().optional(),
  povertyRate: z.number().optional(), // % below poverty line
  unemploymentRate: z.number().optional(),
  mainEconomicActivities: z.array(z.string()).optional(), // e.g., ["Fishing", "Tourism", "Agriculture"]
  economicGrowthRate: z.number().optional(),
});

/**
 * Existing loans and debt information
 */
export const debtDataSchema = z.object({
  totalPublicDebt: z.number().optional(),
  debtToGdpRatio: z.number().optional(),
  existingLoansForSector: z.array(z.object({
    lender: z.string(), // e.g., "World Bank", "ADB", "IMF"
    amount: z.number(),
    purpose: z.string(),
    status: z.enum(["active", "completed", "proposed"]).optional(),
    yearDisbursed: z.number().optional(),
  })).optional(),
  creditRating: z.string().optional(), // e.g., "BB-", "B+"
  borrowingCapacity: z.number().optional(), // Estimated remaining borrowing capacity
});

/**
 * Existing facilities in the area (to check for duplicates/saturation)
 */
export const existingFacilitySchema = z.object({
  name: z.string(),
  type: z.string(), // e.g., "School", "Hospital", "Power Plant"
  capacity: z.number().optional(), // e.g., student capacity, bed count, MW
  currentUtilization: z.number().optional(), // % of capacity being used
  distanceKm: z.number().optional(), // Distance from proposed location
  condition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  yearBuilt: z.number().optional(),
  servingPopulation: z.number().optional(), // Population it currently serves
});

export const existingFacilitiesSchema = z.object({
  facilities: z.array(existingFacilitySchema),
  totalCapacityInArea: z.number().optional(), // Combined capacity
  averageUtilization: z.number().optional(), // Average % utilization
  coverageGap: z.number().optional(), // Estimated unmet demand
});

/**
 * Similar/related projects data (completed or ongoing)
 */
export const projectDataSchema = z.object({
  name: z.string(),
  type: z.string(),
  location: z.string(),
  status: z.enum(["proposed", "ongoing", "completed", "abandoned", "delayed"]),
  budget: z.number().optional(),
  actualCost: z.number().optional(), // For completed projects
  startYear: z.number().optional(),
  completionYear: z.number().optional(),
  outcomes: z.string().optional(), // Brief description of results
  lessonsLearned: z.string().optional(),
});

export const relatedProjectsSchema = z.object({
  projects: z.array(projectDataSchema),
  sectorSuccessRate: z.number().optional(), // % of similar projects completed successfully
  averageCostOverrun: z.number().optional(), // Average % over budget
  averageDelayMonths: z.number().optional(),
});

/**
 * Combined context data for comprehensive analysis
 */
export const analysisContextSchema = z.object({
  budget: budgetHistorySchema.optional(),
  census: censusDataSchema.optional(),
  economic: economicDataSchema.optional(),
  debt: debtDataSchema.optional(),
  existingFacilities: existingFacilitiesSchema.optional(),
  relatedProjects: relatedProjectsSchema.optional(),
  dataQuality: z.enum(["high", "medium", "low", "estimated"]).optional(), // Indicates data reliability
  lastUpdated: z.string().optional(), // ISO date
});

export type BudgetData = z.infer<typeof budgetDataSchema>;
export type BudgetHistory = z.infer<typeof budgetHistorySchema>;
export type CensusData = z.infer<typeof censusDataSchema>;
export type EconomicData = z.infer<typeof economicDataSchema>;
export type DebtData = z.infer<typeof debtDataSchema>;
export type ExistingFacility = z.infer<typeof existingFacilitySchema>;
export type ExistingFacilities = z.infer<typeof existingFacilitiesSchema>;
export type ProjectData = z.infer<typeof projectDataSchema>;
export type RelatedProjects = z.infer<typeof relatedProjectsSchema>;
export type AnalysisContext = z.infer<typeof analysisContextSchema>;

// =============================================================================
// ANALYSIS FORM SCHEMAS
// =============================================================================

export const analysisFormSchema = z.object({
  projectDescription: z
    .string()
    .min(20, "Please provide at least 20 characters describing your project")
    .max(5000, "Description must be less than 5000 characters"),
  location: z.string().optional(),
  country: z.string(),
  context: analysisContextSchema.optional(), // Optional context data for enhanced analysis
});

export type AnalysisFormData = z.infer<typeof analysisFormSchema>;

export const categorySchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  summary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  recommendations: z.array(z.string()).optional(),
});

export const costEstimateSchema = z.object({
  low: z.number(),
  high: z.number(),
  currency: z.string(),
  breakdown: z.array(z.object({
    item: z.string(),
    percentage: z.number(),
  })).optional(),
});

export const locationSchema = z.object({
  specified: z.string().nullable(),
  suggested: z.array(z.object({
    name: z.string(),
    reason: z.string(),
  })).nullable(),
});

/**
 * Demand analysis - assesses if the project scale matches actual need
 */
export const demandAnalysisSchema = z.object({
  targetPopulation: z.number(), // Population that would benefit
  currentCapacity: z.number().optional(), // Existing capacity in the area
  proposedCapacity: z.number().optional(), // What the project would add
  capacityGap: z.number().optional(), // Unmet demand (negative = oversupply)
  utilizationForecast: z.number().min(0).max(100), // Expected % utilization
  demandScore: z.number().min(0).max(100), // How well project matches demand
  demandSummary: z.string(), // Explanation of demand assessment
  scalingRecommendation: z.enum([
    "appropriate", // Scale is right
    "scale_up", // Project should be larger
    "scale_down", // Project is too big for demand
    "reconsider", // Demand doesn't justify project
  ]),
  alternativeScale: z.string().optional(), // Suggested alternative size if scaling needed
  nearbyAlternatives: z.array(z.object({
    name: z.string(),
    distance: z.string(),
    canServeNeed: z.boolean(),
  })).optional(), // Existing facilities that could serve the need
  sourcesUsed: z.array(z.string()).optional(), // Sources used for demand data (from Google Search)
});

/**
 * Budget alignment analysis
 */
export const budgetAlignmentSchema = z.object({
  estimatedCostVsBudget: z.number(), // % of available budget required
  affordabilityScore: z.number().min(0).max(100),
  fundingGap: z.number().optional(), // Amount not covered by available budget
  suggestedFundingSources: z.array(z.string()).optional(),
  budgetImpact: z.string(), // Summary of impact on budget
  historicalComparison: z.string().optional(), // How this compares to past project spending
  sourcesUsed: z.array(z.string()).optional(), // Sources used for budget data (from Google Search)
  // Classification of Expenditure by Functions of Government (COFOG)
  expenditureClassification: z.object({
    cofogCategory: z.string(), // Primary COFOG category (Health, Education, Economic Affairs, etc.)
    sectorBudget: z.number().optional(), // Allocated budget for this sector
    percentageOfSectorBudget: z.number().optional(), // Project cost as % of sector budget
  }).optional(),
  // Entity-specific budget from Fiscal Policy Framework
  entityBudget: z.object({
    hasEntityAllocation: z.boolean(), // Whether project is for a specific entity with budget allocation
    entityName: z.string().optional(), // Name of the entity
    allocatedBudget: z.number().optional(), // Entity's allocated budget from Fiscal Policy Framework
    fiscalPolicyReference: z.string().optional(), // Reference to Fiscal Policy Framework provision
  }).optional(),
});

/**
 * Data found via Google Search grounding
 */
export const dataFoundViaSearchSchema = z.object({
  population: z.object({
    found: z.boolean(),
    value: z.string().optional(),
    source: z.string().optional(),
    year: z.string().optional(),
  }).optional(),
  governmentBudget: z.object({
    found: z.boolean(),
    totalBudget: z.string().optional(),
    relevantSectorBudget: z.string().optional(),
    source: z.string().optional(),
    fiscalYear: z.string().optional(),
  }).optional(),
  existingFacilities: z.object({
    found: z.boolean(),
    count: z.number().optional(),
    details: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
  economicIndicators: z.object({
    found: z.boolean(),
    gdpPerCapita: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
  similarProjects: z.object({
    found: z.boolean(),
    projects: z.array(z.string()).optional(),
    source: z.string().optional(),
  }).optional(),
});

/**
 * Verdict - Clear yes/no recommendation
 */
export const verdictSchema = z.object({
  recommendation: z.enum(["yes", "no"]),
  reason: z.string(), // Brief explanation for the verdict
  confidenceInVerdict: z.enum(["high", "medium", "low"]).optional(),
});

/**
 * Alternative project suggestion - uses same resources/budget
 */
export const alternativeProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  estimatedCost: z.object({
    low: z.number(),
    high: z.number(),
  }),
  whySuitable: z.string(), // Why this alternative makes sense
  potentialBenefits: z.array(z.string()),
});

/**
 * Budget ratio - cost as percentage of country's total budget
 */
export const budgetRatioSchema = z.object({
  projectCostMidpoint: z.number(), // Average of low/high estimate
  countryTotalBudget: z.number(), // Total national/regional budget
  percentageOfBudget: z.number(), // % of total budget
  fiscalYear: z.string().optional(),
  currencyCode: z.string(),
  interpretation: z.string(), // e.g., "This is a significant investment" or "Relatively small allocation"
});

/**
 * Timeframe - project completion timeline and administration analysis
 */
export const timeframeSchema = z.object({
  estimatedDuration: z.object({
    minimum: z.number(), // Minimum months to complete
    maximum: z.number(), // Maximum months to complete
    mostLikely: z.number(), // Most likely duration in months
  }),
  phases: z.array(z.object({
    name: z.string(),
    durationMonths: z.number(),
    description: z.string().optional(),
  })).optional(),
  canCurrentAdminComplete: z.boolean(), // Can current administration complete within their term
  adminTermAnalysis: z.string(), // Reasoning about administration term fit
  riskOfDelay: z.enum(["low", "medium", "high"]),
  delayFactors: z.array(z.string()).optional(),
});

export const feasibilityReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  overallSummary: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  detectedProjectType: z.string(),
  // NEW: Clear yes/no verdict
  verdict: verdictSchema,
  // NEW: Suggested alternative project
  alternativeProject: alternativeProjectSchema.optional(),
  // NEW: Budget ratio visualization data
  budgetRatio: budgetRatioSchema.optional(),
  // NEW: Project timeframe and administration analysis
  timeframe: timeframeSchema.optional(),
  location: locationSchema,
  estimatedCost: costEstimateSchema,
  // Demand and budget analysis (with Google Search grounding data)
  demandAnalysis: demandAnalysisSchema.optional(),
  budgetAlignment: budgetAlignmentSchema.optional(),
  categories: z.object({
    technical: categorySchema,
    economic: categorySchema,
    environmental: categorySchema,
    social: categorySchema,
    legal: categorySchema,
    operational: categorySchema,
  }),
  keyRisks: z.array(z.string()),
  nextSteps: z.array(z.string()),
  disclaimer: z.string(),
  // Data quality and grounding info
  dataQualityNote: z.string().optional(), // Note about data availability/reliability
  dataFoundViaSearch: dataFoundViaSearchSchema.optional(), // Summary of data found via Google Search
});

export type Category = z.infer<typeof categorySchema>;
export type DemandAnalysis = z.infer<typeof demandAnalysisSchema>;
export type BudgetAlignment = z.infer<typeof budgetAlignmentSchema>;
export type DataFoundViaSearch = z.infer<typeof dataFoundViaSearchSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type AlternativeProject = z.infer<typeof alternativeProjectSchema>;
export type BudgetRatio = z.infer<typeof budgetRatioSchema>;
export type Timeframe = z.infer<typeof timeframeSchema>;
export type FeasibilityReport = z.infer<typeof feasibilityReportSchema>;
