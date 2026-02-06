/**
 * Shared types for the API
 */

export type Bindings = {
  DB: D1Database;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  APP_NAME: string;
  DISCUSSION_ROOM?: DurableObjectNamespace;
  DO_SERVICE?: Fetcher;
};

export type HonoEnv = { Bindings: Bindings };

// Context data type (matches schema in src/lib/schemas.ts)
export interface AnalysisContext {
  budget?: {
    current: {
      fiscalYear: string;
      totalBudget: number;
      allocatedToSector?: number;
      sectorName?: string;
      capitalExpenditure?: number;
      developmentBudget?: number;
      budgetUtilization?: number;
      source?: string;
    };
    previous?: Array<{
      fiscalYear: string;
      totalBudget: number;
      allocatedToSector?: number;
      sectorName?: string;
    }>;
    projectedGrowth?: number;
  };
  census?: {
    totalPopulation: number;
    year: number;
    populationGrowthRate?: number;
    populationDensity?: number;
    ageDistribution?: {
      under18?: number;
      adults18to60?: number;
      seniors60plus?: number;
    };
    householdCount?: number;
    averageHouseholdSize?: number;
    urbanRuralSplit?: { urban: number; rural: number };
    literacyRate?: number;
    employmentRate?: number;
  };
  economic?: {
    gdpPerCapita?: number;
    averageHouseholdIncome?: number;
    medianIncome?: number;
    povertyRate?: number;
    unemploymentRate?: number;
    mainEconomicActivities?: string[];
    economicGrowthRate?: number;
  };
  debt?: {
    totalPublicDebt?: number;
    debtToGdpRatio?: number;
    existingLoansForSector?: Array<{
      lender: string;
      amount: number;
      purpose: string;
      status?: string;
      yearDisbursed?: number;
    }>;
    creditRating?: string;
    borrowingCapacity?: number;
  };
  existingFacilities?: {
    facilities: Array<{
      name: string;
      type: string;
      capacity?: number;
      currentUtilization?: number;
      distanceKm?: number;
      condition?: string;
      yearBuilt?: number;
      servingPopulation?: number;
    }>;
    totalCapacityInArea?: number;
    averageUtilization?: number;
    coverageGap?: number;
  };
  relatedProjects?: {
    projects: Array<{
      name: string;
      type: string;
      location: string;
      status: string;
      budget?: number;
      actualCost?: number;
      startYear?: number;
      completionYear?: number;
      outcomes?: string;
      lessonsLearned?: string;
    }>;
    sectorSuccessRate?: number;
    averageCostOverrun?: number;
    averageDelayMonths?: number;
  };
  dataQuality?: "high" | "medium" | "low" | "estimated";
  lastUpdated?: string;
}
