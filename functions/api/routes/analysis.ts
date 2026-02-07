/**
 * Analysis endpoints with streaming
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { reports, jobs } from "../../../db/schema";
import type { HonoEnv, AnalysisContext } from "../lib/types";
import { countryCurrencies, languageNames } from "../lib/constants";
import { sanitizeInput } from "../lib/validation";
import { withGeminiRetry, getUserFriendlyError } from "../lib/gemini";
import { generateSlug } from "../lib/slug";
import { simpleHash, createJobSafely, generateJobKey, isJobStale } from "../lib/job-utils";
import { parseTranslationResponse } from "../lib/translation-utils";
import { JOB_TYPES } from "./jobs";

const analysisRoutes = new Hono<HonoEnv>();

// Analysis request schema
const analysisSchema = z.object({
  projectDescription: z.string().min(20).max(5000),
  location: z.string().optional(),
  country: z.string(),
  context: z.object({
    budget: z.object({
      current: z.object({
        fiscalYear: z.string(),
        totalBudget: z.number(),
        allocatedToSector: z.number().optional(),
        sectorName: z.string().optional(),
        capitalExpenditure: z.number().optional(),
        developmentBudget: z.number().optional(),
        budgetUtilization: z.number().optional(),
        source: z.string().optional(),
      }),
      previous: z.array(z.object({
        fiscalYear: z.string(),
        totalBudget: z.number(),
        allocatedToSector: z.number().optional(),
        sectorName: z.string().optional(),
      })).optional(),
      projectedGrowth: z.number().optional(),
    }).optional(),
    census: z.object({
      totalPopulation: z.number(),
      year: z.number(),
      populationGrowthRate: z.number().optional(),
      populationDensity: z.number().optional(),
      ageDistribution: z.object({
        under18: z.number().optional(),
        adults18to60: z.number().optional(),
        seniors60plus: z.number().optional(),
      }).optional(),
      householdCount: z.number().optional(),
      averageHouseholdSize: z.number().optional(),
      urbanRuralSplit: z.object({
        urban: z.number(),
        rural: z.number(),
      }).optional(),
      literacyRate: z.number().optional(),
      employmentRate: z.number().optional(),
    }).optional(),
    economic: z.object({
      gdpPerCapita: z.number().optional(),
      averageHouseholdIncome: z.number().optional(),
      medianIncome: z.number().optional(),
      povertyRate: z.number().optional(),
      unemploymentRate: z.number().optional(),
      mainEconomicActivities: z.array(z.string()).optional(),
      economicGrowthRate: z.number().optional(),
    }).optional(),
    debt: z.object({
      totalPublicDebt: z.number().optional(),
      debtToGdpRatio: z.number().optional(),
      existingLoansForSector: z.array(z.object({
        lender: z.string(),
        amount: z.number(),
        purpose: z.string(),
        status: z.string().optional(),
        yearDisbursed: z.number().optional(),
      })).optional(),
      creditRating: z.string().optional(),
      borrowingCapacity: z.number().optional(),
    }).optional(),
    existingFacilities: z.object({
      facilities: z.array(z.object({
        name: z.string(),
        type: z.string(),
        capacity: z.number().optional(),
        currentUtilization: z.number().optional(),
        distanceKm: z.number().optional(),
        condition: z.string().optional(),
        yearBuilt: z.number().optional(),
        servingPopulation: z.number().optional(),
      })),
      totalCapacityInArea: z.number().optional(),
      averageUtilization: z.number().optional(),
      coverageGap: z.number().optional(),
    }).optional(),
    relatedProjects: z.object({
      projects: z.array(z.object({
        name: z.string(),
        type: z.string(),
        location: z.string(),
        status: z.string(),
        budget: z.number().optional(),
        actualCost: z.number().optional(),
        startYear: z.number().optional(),
        completionYear: z.number().optional(),
        outcomes: z.string().optional(),
        lessonsLearned: z.string().optional(),
      })),
      sectorSuccessRate: z.number().optional(),
      averageCostOverrun: z.number().optional(),
      averageDelayMonths: z.number().optional(),
    }).optional(),
    dataQuality: z.enum(["high", "medium", "low", "estimated"]).optional(),
    lastUpdated: z.string().optional(),
  }).optional(),
});

/**
 * Format context data for the AI prompt
 */
function formatContextData(context: AnalysisContext): string {
  const sections: string[] = [];

  if (context.budget) {
    const b = context.budget;
    sections.push(`
BUDGET DATA (${b.current.fiscalYear}):
- Total Budget: ${b.current.totalBudget.toLocaleString()} (Local Currency)
${b.current.allocatedToSector ? `- ${b.current.sectorName || 'Sector'} Allocation: ${b.current.allocatedToSector.toLocaleString()}` : ''}
${b.current.capitalExpenditure ? `- Capital Expenditure: ${b.current.capitalExpenditure.toLocaleString()}` : ''}
${b.current.developmentBudget ? `- Development Budget: ${b.current.developmentBudget.toLocaleString()}` : ''}
${b.current.budgetUtilization ? `- Budget Utilization Rate: ${b.current.budgetUtilization}%` : ''}
${b.projectedGrowth ? `- Projected Budget Growth: ${b.projectedGrowth}%` : ''}
${b.previous?.length ? `- Previous Years: ${b.previous.map(p => `${p.fiscalYear}: ${p.totalBudget.toLocaleString()}`).join(', ')}` : ''}`);
  }

  if (context.census) {
    const c = context.census;
    sections.push(`
CENSUS DATA (${c.year}):
- Total Population: ${c.totalPopulation.toLocaleString()}
${c.populationGrowthRate ? `- Population Growth Rate: ${c.populationGrowthRate}%` : ''}
${c.populationDensity ? `- Population Density: ${c.populationDensity}/km²` : ''}
${c.ageDistribution ? `- Age Distribution: Under 18: ${c.ageDistribution.under18}%, Adults: ${c.ageDistribution.adults18to60}%, Seniors: ${c.ageDistribution.seniors60plus}%` : ''}
${c.householdCount ? `- Households: ${c.householdCount.toLocaleString()} (avg size: ${c.averageHouseholdSize})` : ''}
${c.urbanRuralSplit ? `- Urban/Rural: ${c.urbanRuralSplit.urban}% urban, ${c.urbanRuralSplit.rural}% rural` : ''}
${c.literacyRate ? `- Literacy Rate: ${c.literacyRate}%` : ''}
${c.employmentRate ? `- Employment Rate: ${c.employmentRate}%` : ''}`);
  }

  if (context.economic) {
    const e = context.economic;
    sections.push(`
ECONOMIC DATA:
${e.gdpPerCapita ? `- GDP per Capita: $${e.gdpPerCapita.toLocaleString()}` : ''}
${e.averageHouseholdIncome ? `- Average Household Income: ${e.averageHouseholdIncome.toLocaleString()}` : ''}
${e.medianIncome ? `- Median Income: ${e.medianIncome.toLocaleString()}` : ''}
${e.povertyRate ? `- Poverty Rate: ${e.povertyRate}%` : ''}
${e.unemploymentRate ? `- Unemployment Rate: ${e.unemploymentRate}%` : ''}
${e.economicGrowthRate ? `- Economic Growth Rate: ${e.economicGrowthRate}%` : ''}
${e.mainEconomicActivities?.length ? `- Main Economic Activities: ${e.mainEconomicActivities.join(', ')}` : ''}`);
  }

  if (context.debt) {
    const d = context.debt;
    sections.push(`
DEBT DATA:
${d.totalPublicDebt ? `- Total Public Debt: ${d.totalPublicDebt.toLocaleString()}` : ''}
${d.debtToGdpRatio ? `- Debt to GDP Ratio: ${d.debtToGdpRatio}%` : ''}
${d.creditRating ? `- Credit Rating: ${d.creditRating}` : ''}
${d.borrowingCapacity ? `- Available Borrowing Capacity: ${d.borrowingCapacity.toLocaleString()}` : ''}
${d.existingLoansForSector?.length ? `- Existing Sector Loans: ${d.existingLoansForSector.map(l => `${l.lender}: ${l.amount.toLocaleString()} for ${l.purpose}`).join('; ')}` : ''}`);
  }

  if (context.existingFacilities) {
    const f = context.existingFacilities;
    sections.push(`
EXISTING FACILITIES:
${f.facilities.map(fac => `- ${fac.name} (${fac.type}): Capacity ${fac.capacity || 'N/A'}, Utilization ${fac.currentUtilization || 'N/A'}%, ${fac.distanceKm || 'N/A'}km away, Condition: ${fac.condition || 'N/A'}`).join('\n')}
${f.totalCapacityInArea ? `- Total Area Capacity: ${f.totalCapacityInArea.toLocaleString()}` : ''}
${f.averageUtilization ? `- Average Utilization: ${f.averageUtilization}%` : ''}
${f.coverageGap ? `- Coverage Gap: ${f.coverageGap}%` : ''}`);
  }

  if (context.relatedProjects) {
    const r = context.relatedProjects;
    sections.push(`
RELATED PROJECTS:
${r.projects.map(p => `- ${p.name} (${p.status}): Budget ${p.budget?.toLocaleString() || 'N/A'}, Actual ${p.actualCost?.toLocaleString() || 'N/A'}, ${p.outcomes || 'No outcomes yet'}`).join('\n')}
${r.sectorSuccessRate ? `- Sector Success Rate: ${r.sectorSuccessRate}%` : ''}
${r.averageCostOverrun ? `- Average Cost Overrun: ${r.averageCostOverrun}%` : ''}
${r.averageDelayMonths ? `- Average Delay: ${r.averageDelayMonths} months` : ''}`);
  }

  if (context.dataQuality) {
    sections.push(`\nDATA QUALITY: ${context.dataQuality.toUpperCase()}${context.lastUpdated ? ` (Last updated: ${context.lastUpdated})` : ''}`);
  }

  return sections.join('\n');
}

/**
 * Build validation prompt
 */
function buildValidationPrompt(projectDescription: string, location: string | undefined, country: string): string {
  return `You are a project validation assistant. Analyze if the following is a valid development project request for ${country}.

PROJECT DESCRIPTION:
<user_input>
${projectDescription}
</user_input>

${location ? `LOCATION: ${location}` : ''}

Determine if this is a valid project request. Return a JSON response:

{
  "isValid": true/false,
  "reason": "Brief explanation if invalid",
  "detectedProjectType": "Type of project if valid (e.g., 'Healthcare Facility', 'Housing Development', 'Energy Infrastructure')"
}

A project is VALID if it:
1. Describes infrastructure, development, public service projects, or government initiatives
2. Is relevant to the specified country/region
3. Is something that could be analyzed (feasibility, impact, budget, policy implications)
4. Includes policy directives, budget allocations, or strategic government plans
5. Even high-level or abstract initiatives are valid if they relate to public sector activities

A project is INVALID if it:
1. Is clearly not related to public sector, development, or governance (e.g., personal questions, coding requests, private business plans)
2. Contains harmful or inappropriate content
3. Is completely nonsensical or gibberish

Respond with ONLY the JSON object, no other text.`;
}

/**
 * Build main analysis prompt
 */
function buildAnalysisPrompt(
  projectDescription: string,
  projectType: string,
  location: string | undefined,
  country: string,
  currency: string,
  context?: AnalysisContext
): string {
  const contextSection = context ? `
=== OFFICIAL DATA PROVIDED ===
${formatContextData(context)}
=== END OFFICIAL DATA ===

Use this official data in your analysis. When you use specific numbers from this data, note that you are using "provided data".
` : '';

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentYear = new Date().getFullYear();

  return `You are an expert feasibility analyst specializing in development projects for ${country}. Analyze the following project proposal.

CURRENT DATE: ${currentDate}
PROJECT TYPE: ${projectType}
DESCRIPTION:
<user_project>
${projectDescription}
</user_project>
${location ? `LOCATION: ${location}` : ''}
COUNTRY: ${country}
CURRENCY: ${currency}
${contextSection}

IMPORTANT: Today's date is ${currentDate}. Always search for and use the most recent data available (${currentYear} or ${currentYear - 1} fiscal year data). Do NOT use outdated data from previous years if more recent data is available.

Use Google Search to find current, real-world data about:
1. Similar projects in ${country} or the region
2. Current costs for this type of project
3. Local regulations and requirements
4. Environmental considerations specific to the location
5. Economic conditions and budget data for ${country}

IMPORTANT - For each source you use from Google Search, capture the title and full URL. You will include these in the "references" field of your response to allow users to verify the information.

IMPORTANT - Also analyze and incorporate data from these government/public finance areas:

TREASURY:
- Cash Management & Public Bank Account status
- Public Accounts System information
- Consolidated Financial Statements of the government
- Fiscal Position:
  * Total Revenue and Grants
  * Total Expenditure
  * Overall Balance (Deficit/Surplus)
  * Interest Expenditure
  * Primary Balance (Deficit/Surplus)
  * Total Financing Requirement
  * Total Financing
  * Deficit analysis
- Economic Outlook & Fiscal Policy:
  * Economic Outlook projections
  * Fiscal Policy Framework (including entity-specific budget allocations)
  * Fiscal Risk Statement
- Classification of Expenditure by Functions of Government (COFOG):
  * Health
  * Economic Affairs
  * Education
  * Housing and Community Amenities
  * Social Protection
  * Environmental Protection
  * Defense, and Public Order and Safety
  * General Public Services
  * Recreation, Culture, and Religion
- Debt Management:
  * Credit Rating (sovereign credit rating)
  * Active Loans/Bonds and Sovereign Guarantees
  * Government Securities Operations
- Public Enterprises:
  * Companies in Liquidation (relevant SOEs)
  * Audited Financial Statements of SOEs (State-Owned Enterprises)

REVENUE POLICY:
- Exemptions Under Income Tax Act (relevant tax incentives/exemptions for the project type)

LEGISLATION:
- Relevant Acts that may apply to this project
- Applicable Regulations
- Government Circulars related to the sector
- Guidelines from relevant ministries/departments

PUBLIC FINANCE MANAGEMENT (PFM) REFORM:
- Current PFM reform initiatives that may affect project implementation
- Budget execution and procurement reform status
- Public investment management framework

Provide a comprehensive feasibility analysis in the following JSON format:

{
  "overallScore": <number 0-100>,
  "overallSummary": "<2-3 sentence summary of the feasibility>",
  "confidence": "<low/medium/high - based on data availability>",
  "detectedProjectType": "${projectType}",
  "location": {
    "specified": "<location if provided>",
    "suitability": "<brief assessment of location suitability>"
  },
  "verdict": {
    "recommendation": "<yes/no>",
    "reason": "<1 sentence key reason for recommendation>",
    "confidenceInVerdict": "<high/medium/low>"
  },
  "categories": {
    "technical": {
      "score": <0-100>,
      "summary": "<key technical considerations>",
      "pros": ["<strength 1>", "<strength 2>"],
      "cons": ["<concern 1>", "<concern 2>"],
      "recommendations": ["<recommendation 1>"]
    },
    "economic": {
      "score": <0-100>,
      "summary": "<key economic considerations - MUST include: Fiscal Position (total revenue/grants, total expenditure, overall balance, interest expenditure, primary balance, financing requirement), Treasury status (cash management, public bank account), Debt Management (credit rating, active loans/bonds, sovereign guarantees), Public Enterprises financial status, Revenue Policy (tax exemptions applicable to this project)>",
      "pros": ["<strength 1>"],
      "cons": ["<concern 1>"],
      "recommendations": ["<recommendation 1>"]
    },
    "environmental": {
      "score": <0-100>,
      "summary": "<key environmental considerations>",
      "pros": ["<strength 1>"],
      "cons": ["<concern 1>"],
      "recommendations": ["<recommendation 1>"]
    },
    "social": {
      "score": <0-100>,
      "summary": "<key social considerations>",
      "pros": ["<strength 1>"],
      "cons": ["<concern 1>"],
      "recommendations": ["<recommendation 1>"]
    },
    "legal": {
      "score": <0-100>,
      "summary": "<key legal/regulatory considerations - MUST include: Relevant Acts, Regulations, Circulars, and Guidelines applicable to this project; PFM reform status and procurement requirements>",
      "pros": ["<strength 1>"],
      "cons": ["<concern 1>"],
      "recommendations": ["<recommendation 1>"]
    },
    "operational": {
      "score": <0-100>,
      "summary": "<key operational considerations - include SOE involvement if relevant, public accounts system implications>",
      "pros": ["<strength 1>"],
      "cons": ["<concern 1>"],
      "recommendations": ["<recommendation 1>"]
    }
  },
  "demandAnalysis": {
    "targetPopulation": <number>,
    "capacityGap": "<description of current gap>",
    "utilizationForecast": <expected utilization percentage>,
    "demandScore": <0-100>,
    "demandSummary": "<1-2 sentence summary>",
    "scalingRecommendation": "<appropriate/scale_up/scale_down/reconsider>",
    "sourcesUsed": ["<source 1>", "<source 2>"]
  },
  "estimatedCost": {
    "low": <number in local currency>,
    "high": <number in local currency>,
    "currency": "${currency}",
    "breakdown": [
      {"item": "Construction", "percentage": <number>},
      {"item": "Equipment", "percentage": <number>},
      {"item": "Other", "percentage": <number>}
    ],
    "confidenceLevel": "<high/medium/low>"
  },
  "budgetAlignment": {
    "estimatedCostVsBudget": "<comparison to government budget>",
    "affordabilityScore": <0-100>,
    "budgetImpact": "<minimal/moderate/significant>",
    "fundingGap": <number if applicable>,
    "suggestedFundingSources": ["<source 1>", "<source 2>"],
    "expenditureClassification": {
      "cofogCategory": "<Primary COFOG category: Health/Economic Affairs/Education/Housing and Community Amenities/Social Protection/Environmental Protection/Defense and Public Order and Safety/General Public Services/Recreation Culture and Religion>",
      "sectorBudget": <allocated budget for this sector in local currency>,
      "percentageOfSectorBudget": <project cost as % of sector budget>
    },
    "entityBudget": {
      "hasEntityAllocation": <true/false - whether project is for a specific entity with budget in Fiscal Policy Framework>,
      "entityName": "<name of entity if applicable>",
      "allocatedBudget": <entity's allocated budget from Fiscal Policy Framework>,
      "fiscalPolicyReference": "<reference to Fiscal Policy Framework provision>"
    }
  },
  "timeframe": {
    "estimatedDuration": {
      "minimum": <months>,
      "maximum": <months>,
      "mostLikely": <months>
    },
    "phases": ["<phase 1>", "<phase 2>"],
    "canCurrentAdminComplete": <true/false>,
    "riskOfDelay": "<low/medium/high>",
    "delayFactors": ["<factor 1>"]
  },
  "budgetRatio": {
    "projectCostMidpoint": <average of estimated cost low and high>,
    "countryTotalBudget": <total national/government budget for ${currentYear} fiscal year in ${currency} - MUST be current year data>,
    "percentageOfBudget": <projectCostMidpoint / countryTotalBudget * 100>,
    "currencyCode": "${currency}",
    "fiscalYear": "${currentYear} or ${currentYear}-${currentYear + 1}",
    "interpretation": "<brief interpretation of what this percentage means for the project's feasibility>"
  },
  "keyRisks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "nextSteps": ["<step 1>", "<step 2>", "<step 3>"],
  "alternativeProject": {
    "name": "<alternative project name if original has major issues>",
    "description": "<brief description>",
    "estimatedCost": {
      "low": <number>,
      "high": <number>
    },
    "whySuitable": "<why this might be better>",
    "potentialBenefits": ["<benefit 1>", "<benefit 2>"]
  },
  "dataFoundViaSearch": {
    "sourcesUsed": ["<source 1>", "<source 2>"],
    "dataConfidence": "<high/medium/low>",
    "keyDataPoints": ["<data point 1>", "<data point 2>"]
  },
  "references": [
    {
      "title": "<Source title from Google Search result>",
      "url": "<https://full-url-to-source.com>"
    }
  ],
  "disclaimer": "<standard disclaimer about this being an AI analysis>",
  "dataQualityNote": "<note about data quality and limitations>"
}

IMPORTANT:
- Today is ${currentDate} - search for and use ${currentYear} data (or latest available)
- For budget data, use the ${currentYear} fiscal year budget, NOT older data
- Use real data from your search results
- Be specific to ${country} context
- Provide realistic cost estimates in ${currency}
- Be balanced - highlight both opportunities and risks
- If data is limited, note this in the confidence ratings
- **Populate the "references" array with all sources you found via Google Search that informed your analysis. Include government websites, official reports, databases, and reliable sources with their full URLs.**

Return ONLY the JSON object, no other text.`;
}

/**
 * Extract partial report data from streaming JSON text
 * Attempts to parse fields that are complete even if the full JSON is truncated
 */
function extractPartialReport(text: string): Record<string, unknown> | null {
  const partial: Record<string, unknown> = {};

  // Helper to extract string arrays like keyRisks, nextSteps
  const extractStringArray = (fieldName: string): string[] | null => {
    // Match the array start and collect complete strings
    const arrayStartMatch = text.match(new RegExp(`"${fieldName}"\\s*:\\s*\\[`));
    if (!arrayStartMatch) return null;

    const startIdx = arrayStartMatch.index! + arrayStartMatch[0].length;
    const items: string[] = [];
    let i = startIdx;

    while (i < text.length) {
      // Skip whitespace
      while (i < text.length && /\s/.test(text[i]!)) i++;

      if (text[i] === ']') break; // End of array
      if (text[i] === ',') { i++; continue; } // Skip commas

      if (text[i] === '"') {
        // Find the end of this string
        let end = i + 1;
        while (end < text.length) {
          if (text[end] === '\\') { end += 2; continue; }
          if (text[end] === '"') break;
          end++;
        }
        if (end < text.length && text[end] === '"') {
          const str = text.slice(i + 1, end).replace(/\\"/g, '"').replace(/\\n/g, '\n');
          items.push(str);
          i = end + 1;
        } else {
          break; // Incomplete string
        }
      } else {
        break; // Unexpected character
      }
    }

    return items.length > 0 ? items : null;
  };

  // overallScore: <number>
  const scoreMatch = text.match(/"overallScore"\s*:\s*(\d+)/);
  if (scoreMatch?.[1]) {
    partial.overallScore = parseInt(scoreMatch[1], 10);
  }

  // confidence: "<string>"
  const confidenceMatch = text.match(/"confidence"\s*:\s*"([^"]+)"/);
  if (confidenceMatch) {
    partial.confidence = confidenceMatch[1];
  }

  // detectedProjectType: "<string>"
  const projectTypeMatch = text.match(/"detectedProjectType"\s*:\s*"([^"]+)"/);
  if (projectTypeMatch) {
    partial.detectedProjectType = projectTypeMatch[1];
  }

  // overallSummary: "<string>"
  const summaryMatch = text.match(/"overallSummary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (summaryMatch?.[1]) {
    partial.overallSummary = summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }

  // verdict object
  const verdictMatch = text.match(/"verdict"\s*:\s*\{[^}]*"recommendation"\s*:\s*"([^"]+)"[^}]*"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (verdictMatch?.[1] && verdictMatch[2]) {
    partial.verdict = {
      recommendation: verdictMatch[1],
      reason: verdictMatch[2].replace(/\\"/g, '"'),
    };
  }

  // Try to extract category scores
  const categories: Record<string, { score?: number; summary?: string }> = {};
  const categoryNames = ['technical', 'economic', 'environmental', 'social', 'legal', 'operational'];

  for (const catName of categoryNames) {
    const catScoreMatch = text.match(new RegExp(`"${catName}"\\s*:\\s*\\{[^}]*"score"\\s*:\\s*(\\d+)`));
    if (catScoreMatch?.[1]) {
      categories[catName] = { score: parseInt(catScoreMatch[1], 10) };

      const catSummaryMatch = text.match(new RegExp(`"${catName}"\\s*:\\s*\\{[^}]*"summary"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'));
      if (catSummaryMatch?.[1] && categories[catName]) {
        categories[catName].summary = catSummaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
    }
  }

  if (Object.keys(categories).length > 0) {
    partial.categories = categories;
  }

  // estimatedCost object
  const costLowMatch = text.match(/"estimatedCost"\s*:\s*\{[^}]*"low"\s*:\s*(\d+)/);
  const costHighMatch = text.match(/"estimatedCost"\s*:\s*\{[^}]*"high"\s*:\s*(\d+)/);
  const costCurrencyMatch = text.match(/"estimatedCost"\s*:\s*\{[^}]*"currency"\s*:\s*"([^"]+)"/);
  if (costLowMatch?.[1] || costHighMatch?.[1]) {
    partial.estimatedCost = {
      low: costLowMatch?.[1] ? parseInt(costLowMatch[1], 10) : undefined,
      high: costHighMatch?.[1] ? parseInt(costHighMatch[1], 10) : undefined,
      currency: costCurrencyMatch?.[1],
    };
  }

  // budgetRatio object
  const budgetPercentMatch = text.match(/"budgetRatio"\s*:\s*\{[^}]*"percentageOfBudget"\s*:\s*([\d.]+)/);
  const projectCostMatch = text.match(/"budgetRatio"\s*:\s*\{[^}]*"projectCostMidpoint"\s*:\s*(\d+)/);
  const totalBudgetMatch = text.match(/"budgetRatio"\s*:\s*\{[^}]*"countryTotalBudget"\s*:\s*(\d+)/);
  const budgetCurrencyMatch = text.match(/"budgetRatio"\s*:\s*\{[^}]*"currencyCode"\s*:\s*"([^"]+)"/);
  if (budgetPercentMatch?.[1] || projectCostMatch?.[1] || totalBudgetMatch?.[1]) {
    partial.budgetRatio = {
      percentageOfBudget: budgetPercentMatch?.[1] ? parseFloat(budgetPercentMatch[1]) : undefined,
      projectCostMidpoint: projectCostMatch?.[1] ? parseInt(projectCostMatch[1], 10) : undefined,
      countryTotalBudget: totalBudgetMatch?.[1] ? parseInt(totalBudgetMatch[1], 10) : undefined,
      currencyCode: budgetCurrencyMatch?.[1],
    };
  }

  // timeframe object
  const durationMatch = text.match(/"estimatedDuration"\s*:\s*\{[^}]*"mostLikely"\s*:\s*(\d+)/);
  const minDurationMatch = text.match(/"estimatedDuration"\s*:\s*\{[^}]*"minimum"\s*:\s*(\d+)/);
  const maxDurationMatch = text.match(/"estimatedDuration"\s*:\s*\{[^}]*"maximum"\s*:\s*(\d+)/);
  const canCompleteMatch = text.match(/"canCurrentAdminComplete"\s*:\s*(true|false)/);
  const delayRiskMatch = text.match(/"riskOfDelay"\s*:\s*"([^"]+)"/);
  if (durationMatch?.[1] || canCompleteMatch?.[1]) {
    partial.timeframe = {
      estimatedDuration: durationMatch?.[1] ? {
        mostLikely: parseInt(durationMatch[1], 10),
        minimum: minDurationMatch?.[1] ? parseInt(minDurationMatch[1], 10) : undefined,
        maximum: maxDurationMatch?.[1] ? parseInt(maxDurationMatch[1], 10) : undefined,
      } : undefined,
      canCurrentAdminComplete: canCompleteMatch?.[1] ? canCompleteMatch[1] === 'true' : undefined,
      riskOfDelay: delayRiskMatch?.[1],
    };
  }

  // keyRisks array
  const risks = extractStringArray('keyRisks');
  if (risks) {
    partial.keyRisks = risks;
  }

  // nextSteps array
  const steps = extractStringArray('nextSteps');
  if (steps) {
    partial.nextSteps = steps;
  }

  // Return null if we didn't extract anything useful
  if (Object.keys(partial).length === 0) {
    return null;
  }

  return partial;
}

// Priority order for card-by-card streaming (most important first)
const FIELD_PRIORITY = [
  'overallScore',
  'confidence',
  'detectedProjectType',
  'overallSummary',
  'verdict',
  'budgetRatio',
  'estimatedCost',
  'timeframe',
  'categories',
  'keyRisks',
  'nextSteps',
];

/**
 * Detect changes between previous and current partial report
 * Returns only ONE change at a time (highest priority) for true card-by-card streaming
 */
function detectPartialChanges(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown> | null
): { changes: Record<string, unknown> | null; fieldName: string | null } {
  if (!current) return { changes: null, fieldName: null };

  // Collect all changes first
  const allChanges: Record<string, unknown> = {};

  for (const key of Object.keys(current)) {
    const prevValue = previous?.[key];
    const currValue = current[key];

    // New field
    if (prevValue === undefined) {
      allChanges[key] = currValue;
      continue;
    }

    // Handle nested objects (categories, budgetRatio, timeframe, etc.)
    if (
      typeof currValue === 'object' &&
      currValue !== null &&
      !Array.isArray(currValue) &&
      typeof prevValue === 'object' &&
      prevValue !== null &&
      !Array.isArray(prevValue)
    ) {
      const { changes: nestedChanges } = detectPartialChanges(
        prevValue as Record<string, unknown>,
        currValue as Record<string, unknown>
      );
      if (nestedChanges && Object.keys(nestedChanges).length > 0) {
        allChanges[key] = nestedChanges;
      }
      continue;
    }

    // Handle arrays (keyRisks, nextSteps) - send if length increased
    if (Array.isArray(currValue) && Array.isArray(prevValue)) {
      if (currValue.length > prevValue.length) {
        // Send only new items
        allChanges[key] = currValue.slice(prevValue.length);
      }
      continue;
    }

    // Primitive values - check if changed
    if (prevValue !== currValue) {
      allChanges[key] = currValue;
    }
  }

  if (Object.keys(allChanges).length === 0) {
    return { changes: null, fieldName: null };
  }

  // Return only the HIGHEST PRIORITY change for card-by-card effect
  for (const field of FIELD_PRIORITY) {
    if (allChanges[field] !== undefined) {
      return {
        changes: { [field]: allChanges[field] },
        fieldName: field
      };
    }
  }

  // If field not in priority list, return first one found
  const keys = Object.keys(allChanges);
  if (keys.length > 0) {
    const firstKey: string = keys[0] as string;
    return {
      changes: { [firstKey]: allChanges[firstKey] },
      fieldName: firstKey
    };
  }

  return { changes: null, fieldName: null };
}

// Streaming analysis endpoint using Hono's streamSSE for proper streaming
analysisRoutes.post("/analyze/stream", zValidator("json", analysisSchema), async (c) => {
  const { projectDescription, location, country, context } = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const currency = countryCurrencies[country] || "USD";

  // Sanitize input
  const { sanitized: sanitizedDescription, isSuspicious } = sanitizeInput(projectDescription);

  // Generate job key for deduplication
  const descHash = simpleHash(sanitizedDescription.substring(0, 200));
  const jobKey = generateJobKey(JOB_TYPES.ANALYSIS, country, descHash);

  // Check for existing job
  const { job: existingJob, isNew } = await createJobSafely(db, jobKey, JOB_TYPES.ANALYSIS, {
    projectDescription: sanitizedDescription,
    location,
    country,
  });

  // If job already exists and completed, return cached result as SSE stream
  if (!isNew && existingJob.status === "completed" && existingJob.resultSlug) {
    const cachedSlug = existingJob.resultSlug;
    const reportResult = await db
      .select()
      .from(reports)
      .where(eq(reports.slug, cachedSlug))
      .limit(1);

    const cachedReport = reportResult[0];
    if (cachedReport) {
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({ data: JSON.stringify({ type: "start", slug: cachedSlug, cached: true }) });
        await stream.writeSSE({ data: JSON.stringify({ type: "complete", slug: cachedSlug, report: cachedReport.report }) });
      });
    }
  }

  // If job is in progress and not stale, return SSE with status event
  if (!isNew && existingJob.status === "in_progress" && !isJobStale(existingJob)) {
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({ data: JSON.stringify({ type: "in_progress", jobId: existingJob.id, jobKey, message: "Analysis is already in progress. Please wait." }) });
    });
  }

  // Use Hono's streamSSE for proper streaming support
  return streamSSE(c, async (stream) => {
    const sendEvent = async (eventData: Record<string, unknown>) => {
      await stream.writeSSE({ data: JSON.stringify(eventData) });
      // Force flush by yielding control - helps with Wrangler buffering
      await stream.sleep(0);
    };

    const jobId = existingJob.id;

    try {
      // Update job to in_progress
      await db
        .update(jobs)
        .set({ status: "in_progress", startedAt: new Date().toISOString() })
        .where(eq(jobs.id, jobId));

      await sendEvent({ type: "validating" });

      const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
      const modelName = c.env.GEMINI_MODEL || "gemini-2.0-flash";

      // Step 1: Validate the request
      const validationModel = genAI.getGenerativeModel({ model: modelName });
      const validationPrompt = buildValidationPrompt(sanitizedDescription, location, country);

      const validationResult = await withGeminiRetry(
        () => validationModel.generateContent(validationPrompt),
        { maxRetries: 2 }
      );
      const validationText = validationResult.response.text();

      let validation: { isValid: boolean; reason?: string; detectedProjectType?: string };
      try {
        const jsonMatch = validationText.match(/\{[\s\S]*\}/);
        validation = jsonMatch ? JSON.parse(jsonMatch[0]) : { isValid: false, reason: "Failed to parse validation" };
      } catch {
        validation = { isValid: false, reason: "Failed to parse validation response" };
      }

      // Handle suspicious input
      if (isSuspicious) {
        validation = { isValid: false, reason: "Input contains potentially problematic patterns" };
      }

      if (!validation.isValid) {
        await sendEvent({
          type: "rejected",
          reason: validation.reason || "This request is not suitable for feasibility analysis.",
          rejectionType: "invalid_request",
          suggestion: "Try analyzing projects like: 'Build a public hospital', 'Implement renewable energy policy', or 'Develop public transportation system'.",
        });

        await db
          .update(jobs)
          .set({
            status: "failed",
            error: validation.reason || "Validation failed",
            completedAt: new Date().toISOString(),
          })
          .where(eq(jobs.id, jobId));

        return;
      }

      const projectType = validation.detectedProjectType || "Development Project";

      // Generate preliminary slug so frontend can navigate early
      const slug = generateSlug(projectType, location);

      // Send start event so frontend navigates to report page
      await sendEvent({ type: "start", slug });
      await sendEvent({ type: "status", status: "analyzing", projectType });

      // Update progress
      await db
        .update(jobs)
        .set({ progress: 10, partialResult: { projectType } })
        .where(eq(jobs.id, jobId));

      // Step 2: Full analysis with Google Search grounding
      const analysisModel = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ googleSearch: {} }] as unknown as undefined,
      });

      const analysisPrompt = buildAnalysisPrompt(
        sanitizedDescription,
        projectType,
        location,
        country,
        currency,
        context
      );

      await sendEvent({ type: "status", status: "generating" });

      // Retry wrapper for both streaming and JSON parsing
      // If JSON parsing fails, we retry the entire LLM call since the malformed JSON is from the LLM
      const MAX_PARSE_RETRIES = 2;
      let report: Record<string, unknown> | null = null;
      let parseAttempt = 0;
      let lastParseError: Error | null = null;

      while (parseAttempt <= MAX_PARSE_RETRIES && !report) {
        if (parseAttempt > 0) {
          console.log(`[JSON Parse] Retry attempt ${parseAttempt}/${MAX_PARSE_RETRIES} due to parse error`);
          await sendEvent({ type: "retry", attempt: parseAttempt, reason: "parse_error" });
        }

        // Use streaming API for real-time progress
        let analysisText = "";
        let lastProgressUpdate = Date.now();
        const PROGRESS_INTERVAL = 300; // Check every 300ms for responsive UI

        // Track previously sent data to detect new completions
        let previousPartial: Record<string, unknown> | null = null;

        console.log("[SSE] Starting Gemini streaming...");

        try {
          await withGeminiRetry(
            async () => {
              const geminiStream = await analysisModel.generateContentStream(analysisPrompt);
              let chunkCount = 0;

              console.log("[SSE] Got stream, iterating chunks...");

              for await (const chunk of geminiStream.stream) {
                const chunkText = chunk.text();
                analysisText += chunkText;
                chunkCount++;

                // Try to extract partial report data from the streaming JSON
                const partial = extractPartialReport(analysisText);

                // Detect changes by comparing with previous partial (returns one field at a time)
                const { changes, fieldName } = detectPartialChanges(previousPartial, partial);

                // Send update if we have changes OR periodically for progress
                const now = Date.now();
                const hasChanges = changes !== null;
                const shouldSendProgress = now - lastProgressUpdate > PROGRESS_INTERVAL;

                if (hasChanges || shouldSendProgress) {
                  if (hasChanges && fieldName) {
                    console.log(`[SSE] New card data: ${fieldName}`);
                  }

                  console.log(`[SSE] Sending progress: ${chunkCount} chunks, ${analysisText.length} chars, has changes: ${hasChanges}`);

                  await sendEvent({
                    type: "progress",
                    status: "generating",
                    chunks: chunkCount,
                    length: analysisText.length,
                    partial: changes,
                    field: fieldName
                  });
                  lastProgressUpdate = now;

                  // Only update the sent field in previousPartial to allow other fields to be sent next
                  if (hasChanges && fieldName && partial) {
                    if (!previousPartial) {
                      previousPartial = {};
                    }
                    // Deep copy only the field we just sent
                    previousPartial[fieldName] = JSON.parse(JSON.stringify(partial[fieldName]));
                  }
                }
              }

              console.log(`[SSE] Stream complete: ${chunkCount} chunks, ${analysisText.length} chars`);
              return geminiStream;
            },
            { maxRetries: 3 },
            (attempt, error, delay) => {
              console.log(`Analysis retry ${attempt}, waiting ${delay}ms:`, error);
              // Note: Can't await here since onRetry is sync, but the retry logic handles it
              stream.writeSSE({ data: JSON.stringify({ type: "retry", attempt, delay }) });
              // Reset for retry
              analysisText = "";
              lastProgressUpdate = Date.now();
              previousPartial = null;
            }
          );

          // Parse the JSON response with repair attempts
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found in response");

          let jsonStr = jsonMatch[0];

          // Try parsing as-is first
          try {
            report = JSON.parse(jsonStr);
          } catch {
            // Attempt to repair common JSON issues from LLMs
            console.log("[JSON Repair] Attempting to fix malformed JSON...");

            // Remove trailing commas before } or ]
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

          // Fix unescaped newlines in strings
          jsonStr = jsonStr.replace(/([^\\])\\n(?!["])/g, '$1\\\\n');

          // Fix missing commas between array elements or object properties
          jsonStr = jsonStr.replace(/}(\s*){/g, '},{');
          jsonStr = jsonStr.replace(/](\s*)\[/g, '],[');
          jsonStr = jsonStr.replace(/"(\s*)"/g, '","');

          // Try to fix truncated JSON by finding the last complete object
          let depth = 0;
          let lastValidPos = 0;
          let inString = false;
          let escapeNext = false;

          for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === '{' || char === '[') depth++;
              if (char === '}' || char === ']') {
                depth--;
                if (depth === 0) lastValidPos = i + 1;
              }
            }
          }

          // If JSON is truncated, try to close it properly
          if (depth > 0 && lastValidPos > 0) {
            console.log(`[JSON Repair] JSON appears truncated at depth ${depth}, using last valid position`);
            jsonStr = jsonStr.substring(0, lastValidPos);
          } else if (depth > 0) {
            // Try to close unclosed braces/brackets
            console.log(`[JSON Repair] Attempting to close ${depth} unclosed braces`);
            jsonStr = jsonStr + '}'.repeat(depth);
          }

            report = JSON.parse(jsonStr);
            console.log("[JSON Repair] Successfully repaired JSON");
          }
        } catch (parseError) {
          console.error(`JSON parse error (attempt ${parseAttempt + 1}):`, parseError);
          lastParseError = parseError instanceof Error ? parseError : new Error(String(parseError));

          // Log the problematic section for debugging
          const errorMatch = String(parseError).match(/position (\d+)/);
          if (errorMatch && errorMatch[1]) {
            const pos = parseInt(errorMatch[1]);
            const context = analysisText.substring(Math.max(0, pos - 100), pos + 100);
            console.error("JSON error context:", context);
          }

          // Increment attempt counter to retry
          parseAttempt++;
        }
      } // end while loop

      // If we exhausted all retries without success, send error
      if (!report) {
        console.error(`JSON parsing failed after ${MAX_PARSE_RETRIES + 1} attempts`);

        await sendEvent({
          type: "error",
          error: "Our servers are experiencing high demand. Please try again in a moment.",
          errorCode: "HIGH_USAGE"
        });

        await db
          .update(jobs)
          .set({
            status: "failed",
            error: lastParseError?.message || "Failed to parse analysis response",
            completedAt: new Date().toISOString(),
          })
          .where(eq(jobs.id, jobId));

        return;
      }

      await db
        .update(jobs)
        .set({ progress: 80, partialResult: { projectType, hasReport: true } })
        .where(eq(jobs.id, jobId));

      // Use the slug generated earlier (after validation)
      const estimatedCost = report.estimatedCost as { low?: number; high?: number } | undefined;

      await db.insert(reports).values({
        slug,
        country,
        projectDescription: sanitizedDescription,
        location,
        projectType,
        estimatedCost: estimatedCost ? Math.round((estimatedCost.low || 0 + (estimatedCost.high || 0)) / 2) : null,
        report,
      });

      // Mark job as completed
      await db
        .update(jobs)
        .set({
          status: "completed",
          progress: 100,
          resultSlug: slug,
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, jobId));

      // Send completion with full report
      await sendEvent({
        type: "complete",
        slug,
        report,
      });

      // Trigger background translation for Dhivehi
      if (languageNames["dv"]) {
        triggerBackgroundTranslation(slug, c.env.GEMINI_API_KEY, modelName, db).catch((err) => {
          console.error("Background translation error:", err);
        });
      }
    } catch (error) {
      console.error("Streaming analysis error:", error);
      const userMessage = getUserFriendlyError(error);

      await sendEvent({
        type: "error",
        error: userMessage,
        technicalError: error instanceof Error ? error.message : "Unknown error",
      });

      await db
        .update(jobs)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, existingJob.id));
    }
  });
});

// Non-streaming analysis endpoint (for simpler clients)
analysisRoutes.post("/analyze", zValidator("json", analysisSchema), async (c) => {
  const { projectDescription, location, country, context } = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const currency = countryCurrencies[country] || "USD";

  // Sanitize input
  const { sanitized: sanitizedDescription, isSuspicious } = sanitizeInput(projectDescription);

  if (isSuspicious) {
    return c.json({ error: "Input contains potentially problematic patterns" }, 400);
  }

  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const modelName = c.env.GEMINI_MODEL || "gemini-2.0-flash";

  // Step 1: Validate
  const validationModel = genAI.getGenerativeModel({ model: modelName });
  const validationPrompt = buildValidationPrompt(sanitizedDescription, location, country);

  const validationResult = await withGeminiRetry(
    () => validationModel.generateContent(validationPrompt),
    { maxRetries: 2 }
  );
  const validationText = validationResult.response.text();

  let validation: { isValid: boolean; reason?: string; detectedProjectType?: string };
  try {
    const jsonMatch = validationText.match(/\{[\s\S]*\}/);
    validation = jsonMatch ? JSON.parse(jsonMatch[0]) : { isValid: false, reason: "Failed to parse validation" };
  } catch {
    validation = { isValid: false, reason: "Failed to parse validation response" };
  }

  if (!validation.isValid) {
    return c.json({ error: validation.reason || "Invalid project request" }, 400);
  }

  const projectType = validation.detectedProjectType || "Development Project";

  // Step 2: Full analysis
  const analysisModel = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ googleSearch: {} }] as unknown as undefined,
  });

  const analysisPrompt = buildAnalysisPrompt(
    sanitizedDescription,
    projectType,
    location,
    country,
    currency,
    context
  );

  try {
    const analysisResult = await withGeminiRetry(
      () => analysisModel.generateContent(analysisPrompt),
      { maxRetries: 3 }
    );

    const analysisText = analysisResult.response.text();

    let report: Record<string, unknown>;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      report = JSON.parse(jsonMatch[0]);
    } catch {
      return c.json({ error: "Failed to parse analysis response" }, 500);
    }

    // Save to database
    const slug = generateSlug(projectType, location);
    const estimatedCost = report.estimatedCost as { low?: number; high?: number } | undefined;

    await db.insert(reports).values({
      slug,
      country,
      projectDescription: sanitizedDescription,
      location,
      projectType,
      estimatedCost: estimatedCost ? Math.round((estimatedCost.low || 0 + (estimatedCost.high || 0)) / 2) : null,
      report,
    });

    return c.json({
      slug,
      projectType,
      report,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    const userMessage = getUserFriendlyError(error);
    return c.json({ error: userMessage }, 500);
  }
});

/**
 * Background translation trigger - fires after report creation
 */
async function triggerBackgroundTranslation(
  slug: string,
  apiKey: string,
  modelName: string,
  db: ReturnType<typeof drizzle>
): Promise<void> {
  const lang = "dv"; // Only Dhivehi for now
  const targetLanguage = languageNames[lang];

  try {
    // Check if translation already exists
    const reportResult = await db
      .select()
      .from(reports)
      .where(eq(reports.slug, slug))
      .limit(1);

    if (!reportResult[0]) {
      console.log(`Background translation: Report ${slug} not found`);
      return;
    }

    const report = reportResult[0];
    const existingTranslations = (report.translations as Record<string, unknown>) || {};

    if (existingTranslations[lang]) {
      console.log(`Background translation: ${slug} already has ${lang} translation`);
      return;
    }

    // Check for existing job
    const jobKey = `${JOB_TYPES.REPORT_TRANSLATION}:${slug}:${lang}`;
    const existingJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.jobKey, jobKey))
      .limit(1);

    if (existingJobs[0] && (existingJobs[0].status === "in_progress" || existingJobs[0].status === "completed")) {
      console.log(`Background translation: Job for ${slug}:${lang} already exists`);
      return;
    }

    // Create translation job
    const jobResult = await createJobSafely(db, jobKey, JOB_TYPES.REPORT_TRANSLATION, { slug, language: lang });
    if (!jobResult.isNew && jobResult.job.status !== "pending") {
      console.log(`Background translation: Job for ${slug}:${lang} already in progress`);
      return;
    }

    const jobId = jobResult.job.id;

    // Start translation
    console.log(`Background translation: Starting ${lang} translation for ${slug}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
      },
    });

    const originalReport = report.report as Record<string, unknown>;

    const translationPrompt = `You are a professional translator. Translate the following feasibility report from English to ${targetLanguage}.

IMPORTANT TRANSLATION RULES:
1. Translate ALL text content including: overallSummary, all category summaries, pros, cons, recommendations, keyRisks, nextSteps, disclaimer, dataQualityNote, demandSummary, budgetImpact
2. Keep the JSON structure EXACTLY the same - only translate string values
3. ADD a new field "translatedProjectType" with the translated version of "detectedProjectType"
4. DO NOT translate:
   - Numbers (scores, costs, percentages, populations)
   - Currency codes (MVR, INR, BDT, LKR, USD)
   - Property names/keys in the JSON
   - detectedProjectType (keep original English value, but ADD translatedProjectType with translation)
   - Location names
   - Source names in dataFoundViaSearch
5. Maintain the same professional but accessible tone
6. For Dhivehi, use Thaana script (ދިވެހި)
7. Ensure the translation sounds natural in ${targetLanguage}, not like a literal translation

Original English report:
${JSON.stringify(originalReport, null, 2)}

Respond with ONLY the translated JSON object. No markdown code blocks, no explanations. The JSON must be valid and parseable.`;

    const aiResult = await withGeminiRetry(
      () => model.generateContent(translationPrompt),
      { maxRetries: 3 }
    );
    const text = aiResult.response.text();
    const translatedReport = parseTranslationResponse(text);

    // Save translation to database
    const updatedTranslations = {
      ...existingTranslations,
      [lang]: translatedReport,
    };

    await db
      .update(reports)
      .set({ translations: updatedTranslations })
      .where(eq(reports.slug, slug));

    // Mark job as completed
    await db
      .update(jobs)
      .set({ status: "completed", completedAt: new Date().toISOString(), progress: 100 })
      .where(eq(jobs.id, jobId));

    console.log(`Background translation: Completed ${lang} translation for ${slug}`);
  } catch (error) {
    console.error(`Background translation error for ${slug}:`, error);
    // Don't throw - this is background work, failures shouldn't affect the main flow
  }
}

export { analysisRoutes };
