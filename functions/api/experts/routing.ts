/**
 * Expert selection and routing logic
 */

import { type ExpertType, expertPersonas } from "./personas";

// Keyword to expert mapping (shared between functions)
export const keywordToExpertMapping: Record<string, { expert: ExpertType; weight: number }[]> = {
  // Economic keywords (higher weights to ensure economic questions go to economist)
  budget: [{ expert: "ai_economist", weight: 12 }],
  budgets: [{ expert: "ai_economist", weight: 12 }],
  budgeting: [{ expert: "ai_economist", weight: 12 }],
  cost: [{ expert: "ai_economist", weight: 12 }],
  costs: [{ expert: "ai_economist", weight: 12 }],
  costing: [{ expert: "ai_economist", weight: 12 }],
  funding: [{ expert: "ai_economist", weight: 12 }],
  money: [{ expert: "ai_economist", weight: 12 }],
  roi: [{ expert: "ai_economist", weight: 15 }],
  "return on investment": [{ expert: "ai_economist", weight: 18 }],
  investment: [{ expert: "ai_economist", weight: 12 }],
  investments: [{ expert: "ai_economist", weight: 12 }],
  investor: [{ expert: "ai_economist", weight: 12 }],
  investors: [{ expert: "ai_economist", weight: 12 }],
  economic: [{ expert: "ai_economist", weight: 15 }],
  economics: [{ expert: "ai_economist", weight: 15 }],
  economy: [{ expert: "ai_economist", weight: 12 }],
  financial: [{ expert: "ai_economist", weight: 15 }],
  financially: [{ expert: "ai_economist", weight: 12 }],
  finance: [{ expert: "ai_economist", weight: 15 }],
  finances: [{ expert: "ai_economist", weight: 15 }],
  afford: [{ expert: "ai_economist", weight: 10 }],
  affordable: [{ expert: "ai_economist", weight: 10 }],
  affordability: [{ expert: "ai_economist", weight: 12 }],
  price: [{ expert: "ai_economist", weight: 10 }],
  prices: [{ expert: "ai_economist", weight: 10 }],
  pricing: [{ expert: "ai_economist", weight: 10 }],
  expense: [{ expert: "ai_economist", weight: 12 }],
  expenses: [{ expert: "ai_economist", weight: 12 }],
  revenue: [{ expert: "ai_economist", weight: 15 }],
  revenues: [{ expert: "ai_economist", weight: 15 }],
  profit: [{ expert: "ai_economist", weight: 15 }],
  profits: [{ expert: "ai_economist", weight: 15 }],
  profitability: [{ expert: "ai_economist", weight: 15 }],
  profitable: [{ expert: "ai_economist", weight: 12 }],
  taxes: [{ expert: "ai_economist", weight: 12 }],
  tax: [{ expert: "ai_economist", weight: 12 }],
  taxation: [{ expert: "ai_economist", weight: 12 }],
  loan: [{ expert: "ai_economist", weight: 12 }],
  loans: [{ expert: "ai_economist", weight: 12 }],
  grant: [{ expert: "ai_economist", weight: 10 }],
  grants: [{ expert: "ai_economist", weight: 10 }],
  subsidy: [{ expert: "ai_economist", weight: 12 }],
  subsidies: [{ expert: "ai_economist", weight: 12 }],
  market: [{ expert: "ai_economist", weight: 10 }],
  markets: [{ expert: "ai_economist", weight: 10 }],
  "cost-benefit": [{ expert: "ai_economist", weight: 18 }],
  "cost benefit": [{ expert: "ai_economist", weight: 18 }],
  "financial analysis": [{ expert: "ai_economist", weight: 18 }],
  "economic impact": [{ expert: "ai_economist", weight: 18 }],
  "economic feasibility": [{ expert: "ai_economist", weight: 18 }],
  payback: [{ expert: "ai_economist", weight: 12 }],
  cashflow: [{ expert: "ai_economist", weight: 15 }],
  "cash flow": [{ expert: "ai_economist", weight: 15 }],

  // Technical/Engineering keywords
  technical: [{ expert: "ai_engineer", weight: 15 }],
  technically: [{ expert: "ai_engineer", weight: 12 }],
  build: [{ expert: "ai_engineer", weight: 10 }],
  building: [{ expert: "ai_engineer", weight: 10 }],
  construction: [{ expert: "ai_engineer", weight: 15 }],
  construct: [{ expert: "ai_engineer", weight: 12 }],
  infrastructure: [{ expert: "ai_engineer", weight: 15 }],
  engineering: [{ expert: "ai_engineer", weight: 15 }],
  engineer: [{ expert: "ai_engineer", weight: 12 }],
  implementation: [{ expert: "ai_engineer", weight: 10 }],
  implement: [{ expert: "ai_engineer", weight: 10 }],
  technology: [{ expert: "ai_engineer", weight: 12 }],
  technologies: [{ expert: "ai_engineer", weight: 12 }],
  technological: [{ expert: "ai_engineer", weight: 12 }],
  design: [{ expert: "ai_engineer", weight: 10 }],
  designs: [{ expert: "ai_engineer", weight: 10 }],
  architecture: [{ expert: "ai_engineer", weight: 12 }],
  structural: [{ expert: "ai_engineer", weight: 15 }],
  structure: [{ expert: "ai_engineer", weight: 12 }],
  structures: [{ expert: "ai_engineer", weight: 12 }],
  materials: [{ expert: "ai_engineer", weight: 12 }],
  material: [{ expert: "ai_engineer", weight: 10 }],
  specifications: [{ expert: "ai_engineer", weight: 15 }],
  specs: [{ expert: "ai_engineer", weight: 12 }],
  blueprint: [{ expert: "ai_engineer", weight: 15 }],
  blueprints: [{ expert: "ai_engineer", weight: 15 }],
  equipment: [{ expert: "ai_engineer", weight: 12 }],
  machinery: [{ expert: "ai_engineer", weight: 12 }],
  machine: [{ expert: "ai_engineer", weight: 10 }],
  machines: [{ expert: "ai_engineer", weight: 10 }],
  fabrication: [{ expert: "ai_engineer", weight: 15 }],
  fabricate: [{ expert: "ai_engineer", weight: 12 }],
  install: [{ expert: "ai_engineer", weight: 10 }],
  installation: [{ expert: "ai_engineer", weight: 12 }],
  prototype: [{ expert: "ai_engineer", weight: 12 }],
  prototyping: [{ expert: "ai_engineer", weight: 12 }],
  feasibility: [{ expert: "ai_engineer", weight: 10 }],
  "technical requirements": [{ expert: "ai_engineer", weight: 18 }],
  "technical challenges": [{ expert: "ai_engineer", weight: 18 }],
  "technical issues": [{ expert: "ai_engineer", weight: 18 }],
  "engineering challenges": [{ expert: "ai_engineer", weight: 18 }],
  "how to build": [{ expert: "ai_engineer", weight: 18 }],
  "how do we build": [{ expert: "ai_engineer", weight: 18 }],
  contractor: [{ expert: "ai_engineer", weight: 12 }],
  contractors: [{ expert: "ai_engineer", weight: 12 }],
  durability: [{ expert: "ai_engineer", weight: 12 }],
  durable: [{ expert: "ai_engineer", weight: 10 }],
  reliability: [{ expert: "ai_engineer", weight: 10 }],
  reliable: [{ expert: "ai_engineer", weight: 10 }],

  // Legal keywords
  legal: [{ expert: "ai_legal", weight: 15 }],
  regulation: [{ expert: "ai_legal", weight: 12 }],
  regulations: [{ expert: "ai_legal", weight: 12 }],
  regulatory: [{ expert: "ai_legal", weight: 12 }],
  compliance: [{ expert: "ai_legal", weight: 12 }],
  permit: [{ expert: "ai_legal", weight: 12 }],
  permits: [{ expert: "ai_legal", weight: 12 }],
  permitting: [{ expert: "ai_legal", weight: 12 }],
  law: [{ expert: "ai_legal", weight: 15 }],
  laws: [{ expert: "ai_legal", weight: 15 }],
  lawsuit: [{ expert: "ai_legal", weight: 15 }],
  policy: [{ expert: "ai_legal", weight: 10 }],
  policies: [{ expert: "ai_legal", weight: 10 }],
  governance: [{ expert: "ai_legal", weight: 10 }],
  liability: [{ expert: "ai_legal", weight: 12 }],
  liabilities: [{ expert: "ai_legal", weight: 12 }],
  contract: [{ expert: "ai_legal", weight: 12 }],
  contracts: [{ expert: "ai_legal", weight: 12 }],
  license: [{ expert: "ai_legal", weight: 12 }],
  licenses: [{ expert: "ai_legal", weight: 12 }],
  licensing: [{ expert: "ai_legal", weight: 12 }],
  zoning: [{ expert: "ai_legal", weight: 15 }],
  approval: [{ expert: "ai_legal", weight: 10 }],
  approvals: [{ expert: "ai_legal", weight: 10 }],
  court: [{ expert: "ai_legal", weight: 15 }],
  attorney: [{ expert: "ai_legal", weight: 15 }],
  lawyer: [{ expert: "ai_legal", weight: 15 }],
  rights: [{ expert: "ai_legal", weight: 12 }],
  legislation: [{ expert: "ai_legal", weight: 15 }],
  statute: [{ expert: "ai_legal", weight: 15 }],
  statutes: [{ expert: "ai_legal", weight: 15 }],
  ordinance: [{ expert: "ai_legal", weight: 15 }],
  ordinances: [{ expert: "ai_legal", weight: 15 }],
  jurisdiction: [{ expert: "ai_legal", weight: 12 }],
  "legal requirements": [{ expert: "ai_legal", weight: 18 }],
  "legal issues": [{ expert: "ai_legal", weight: 18 }],
  "legal concerns": [{ expert: "ai_legal", weight: 18 }],
  "legal challenges": [{ expert: "ai_legal", weight: 18 }],
  "legal risks": [{ expert: "ai_legal", weight: 18 }],
  legally: [{ expert: "ai_legal", weight: 12 }],
  lawful: [{ expert: "ai_legal", weight: 12 }],
  unlawful: [{ expert: "ai_legal", weight: 12 }],
  illegal: [{ expert: "ai_legal", weight: 12 }],

  // Environmental keywords
  environment: [{ expert: "ai_environmental", weight: 15 }],
  environmental: [{ expert: "ai_environmental", weight: 15 }],
  environmentally: [{ expert: "ai_environmental", weight: 12 }],
  climate: [{ expert: "ai_environmental", weight: 15 }],
  "climate change": [{ expert: "ai_environmental", weight: 18 }],
  "global warming": [{ expert: "ai_environmental", weight: 18 }],
  sustainability: [{ expert: "ai_environmental", weight: 15 }],
  sustainable: [{ expert: "ai_environmental", weight: 15 }],
  ecological: [{ expert: "ai_environmental", weight: 15 }],
  ecology: [{ expert: "ai_environmental", weight: 15 }],
  ecosystem: [{ expert: "ai_environmental", weight: 15 }],
  ecosystems: [{ expert: "ai_environmental", weight: 15 }],
  green: [{ expert: "ai_environmental", weight: 10 }],
  carbon: [{ expert: "ai_environmental", weight: 15 }],
  "carbon footprint": [{ expert: "ai_environmental", weight: 18 }],
  "carbon neutral": [{ expert: "ai_environmental", weight: 18 }],
  "net zero": [{ expert: "ai_environmental", weight: 18 }],
  pollution: [{ expert: "ai_environmental", weight: 15 }],
  pollutant: [{ expert: "ai_environmental", weight: 12 }],
  pollutants: [{ expert: "ai_environmental", weight: 12 }],
  pollute: [{ expert: "ai_environmental", weight: 12 }],
  emission: [{ expert: "ai_environmental", weight: 15 }],
  emissions: [{ expert: "ai_environmental", weight: 15 }],
  nature: [{ expert: "ai_environmental", weight: 10 }],
  natural: [{ expert: "ai_environmental", weight: 10 }],
  wildlife: [{ expert: "ai_environmental", weight: 15 }],
  biodiversity: [{ expert: "ai_environmental", weight: 15 }],
  conservation: [{ expert: "ai_environmental", weight: 15 }],
  conserve: [{ expert: "ai_environmental", weight: 12 }],
  renewable: [{ expert: "ai_environmental", weight: 15 }],
  renewables: [{ expert: "ai_environmental", weight: 15 }],
  "renewable energy": [{ expert: "ai_environmental", weight: 18 }],
  solar: [{ expert: "ai_environmental", weight: 12 }],
  wind: [{ expert: "ai_environmental", weight: 10 }],
  hydro: [{ expert: "ai_environmental", weight: 12 }],
  geothermal: [{ expert: "ai_environmental", weight: 15 }],
  deforestation: [{ expert: "ai_environmental", weight: 15 }],
  reforestation: [{ expert: "ai_environmental", weight: 15 }],
  forest: [{ expert: "ai_environmental", weight: 12 }],
  forests: [{ expert: "ai_environmental", weight: 12 }],
  trees: [{ expert: "ai_environmental", weight: 10 }],
  ocean: [{ expert: "ai_environmental", weight: 12 }],
  oceans: [{ expert: "ai_environmental", weight: 12 }],
  marine: [{ expert: "ai_environmental", weight: 15 }],
  coastal: [{ expert: "ai_environmental", weight: 12 }],
  wetland: [{ expert: "ai_environmental", weight: 15 }],
  wetlands: [{ expert: "ai_environmental", weight: 15 }],
  habitat: [{ expert: "ai_environmental", weight: 15 }],
  habitats: [{ expert: "ai_environmental", weight: 15 }],
  species: [{ expert: "ai_environmental", weight: 12 }],
  endangered: [{ expert: "ai_environmental", weight: 15 }],
  waste: [{ expert: "ai_environmental", weight: 12 }],
  recycling: [{ expert: "ai_environmental", weight: 12 }],
  recycle: [{ expert: "ai_environmental", weight: 12 }],
  landfill: [{ expert: "ai_environmental", weight: 12 }],
  "environmental impact": [{ expert: "ai_environmental", weight: 18 }],
  "environmental concerns": [{ expert: "ai_environmental", weight: 18 }],
  "environmental issues": [{ expert: "ai_environmental", weight: 18 }],
  "environmental risks": [{ expert: "ai_environmental", weight: 18 }],
  "environmental assessment": [{ expert: "ai_environmental", weight: 18 }],
  eia: [{ expert: "ai_environmental", weight: 15 }],
  "air quality": [{ expert: "ai_environmental", weight: 15 }],
  "water quality": [{ expert: "ai_environmental", weight: 15 }],
  groundwater: [{ expert: "ai_environmental", weight: 12 }],
  aquifer: [{ expert: "ai_environmental", weight: 15 }],
  drought: [{ expert: "ai_environmental", weight: 12 }],
  flooding: [{ expert: "ai_environmental", weight: 12 }],
  flood: [{ expert: "ai_environmental", weight: 10 }],
  erosion: [{ expert: "ai_environmental", weight: 12 }],

  // Social keywords
  community: [{ expert: "ai_social", weight: 15 }],
  communities: [{ expert: "ai_social", weight: 15 }],
  people: [{ expert: "ai_social", weight: 10 }],
  social: [{ expert: "ai_social", weight: 15 }],
  socially: [{ expert: "ai_social", weight: 12 }],
  society: [{ expert: "ai_social", weight: 12 }],
  public: [{ expert: "ai_social", weight: 10 }],
  "public opinion": [{ expert: "ai_social", weight: 18 }],
  "public perception": [{ expert: "ai_social", weight: 18 }],
  residents: [{ expert: "ai_social", weight: 15 }],
  resident: [{ expert: "ai_social", weight: 12 }],
  displacement: [{ expert: "ai_social", weight: 15 }],
  displaced: [{ expert: "ai_social", weight: 15 }],
  relocation: [{ expert: "ai_social", weight: 15 }],
  relocate: [{ expert: "ai_social", weight: 12 }],
  equity: [{ expert: "ai_social", weight: 15 }],
  equitable: [{ expert: "ai_social", weight: 15 }],
  inequality: [{ expert: "ai_social", weight: 15 }],
  citizens: [{ expert: "ai_social", weight: 12 }],
  citizen: [{ expert: "ai_social", weight: 10 }],
  families: [{ expert: "ai_social", weight: 12 }],
  family: [{ expert: "ai_social", weight: 10 }],
  neighborhood: [{ expert: "ai_social", weight: 15 }],
  neighborhoods: [{ expert: "ai_social", weight: 15 }],
  neighbourhood: [{ expert: "ai_social", weight: 15 }],
  neighbourhoods: [{ expert: "ai_social", weight: 15 }],
  stakeholder: [{ expert: "ai_social", weight: 12 }],
  stakeholders: [{ expert: "ai_social", weight: 12 }],
  inclusion: [{ expert: "ai_social", weight: 15 }],
  inclusive: [{ expert: "ai_social", weight: 15 }],
  accessibility: [{ expert: "ai_social", weight: 15 }],
  accessible: [{ expert: "ai_social", weight: 12 }],
  vulnerable: [{ expert: "ai_social", weight: 15 }],
  marginalized: [{ expert: "ai_social", weight: 15 }],
  marginalised: [{ expert: "ai_social", weight: 15 }],
  minority: [{ expert: "ai_social", weight: 12 }],
  minorities: [{ expert: "ai_social", weight: 12 }],
  indigenous: [{ expert: "ai_social", weight: 15 }],
  welfare: [{ expert: "ai_social", weight: 12 }],
  wellbeing: [{ expert: "ai_social", weight: 12 }],
  "well-being": [{ expert: "ai_social", weight: 12 }],
  livelihoods: [{ expert: "ai_social", weight: 15 }],
  livelihood: [{ expert: "ai_social", weight: 15 }],
  employment: [{ expert: "ai_social", weight: 12 }],
  jobs: [{ expert: "ai_social", weight: 10 }],
  "job creation": [{ expert: "ai_social", weight: 15 }],
  housing: [{ expert: "ai_social", weight: 15 }],
  homeless: [{ expert: "ai_social", weight: 15 }],
  homelessness: [{ expert: "ai_social", weight: 15 }],
  poverty: [{ expert: "ai_social", weight: 15 }],
  poor: [{ expert: "ai_social", weight: 10 }],
  education: [{ expert: "ai_social", weight: 12 }],
  healthcare: [{ expert: "ai_social", weight: 12 }],
  health: [{ expert: "ai_social", weight: 10 }],
  "social impact": [{ expert: "ai_social", weight: 18 }],
  "social issues": [{ expert: "ai_social", weight: 18 }],
  "social concerns": [{ expert: "ai_social", weight: 18 }],
  "community impact": [{ expert: "ai_social", weight: 18 }],
  "community concerns": [{ expert: "ai_social", weight: 18 }],
  "public benefit": [{ expert: "ai_social", weight: 18 }],
  "quality of life": [{ expert: "ai_social", weight: 18 }],
  protest: [{ expert: "ai_social", weight: 12 }],
  protests: [{ expert: "ai_social", weight: 12 }],
  opposition: [{ expert: "ai_social", weight: 10 }],
  support: [{ expert: "ai_social", weight: 8 }],
  consultation: [{ expert: "ai_social", weight: 12 }],
  engagement: [{ expert: "ai_social", weight: 10 }],
  outreach: [{ expert: "ai_social", weight: 12 }],

  // Operations keywords
  operations: [{ expert: "ai_operations", weight: 15 }],
  operation: [{ expert: "ai_operations", weight: 12 }],
  operational: [{ expert: "ai_operations", weight: 15 }],
  operationally: [{ expert: "ai_operations", weight: 12 }],
  maintenance: [{ expert: "ai_operations", weight: 15 }],
  maintain: [{ expert: "ai_operations", weight: 12 }],
  maintaining: [{ expert: "ai_operations", weight: 12 }],
  staffing: [{ expert: "ai_operations", weight: 15 }],
  staff: [{ expert: "ai_operations", weight: 10 }],
  workforce: [{ expert: "ai_operations", weight: 15 }],
  personnel: [{ expert: "ai_operations", weight: 15 }],
  hiring: [{ expert: "ai_operations", weight: 12 }],
  training: [{ expert: "ai_operations", weight: 12 }],
  logistics: [{ expert: "ai_operations", weight: 15 }],
  logistical: [{ expert: "ai_operations", weight: 15 }],
  management: [{ expert: "ai_operations", weight: 10 }],
  manage: [{ expert: "ai_operations", weight: 8 }],
  managing: [{ expert: "ai_operations", weight: 10 }],
  scalability: [{ expert: "ai_operations", weight: 15 }],
  scalable: [{ expert: "ai_operations", weight: 12 }],
  scale: [{ expert: "ai_operations", weight: 10 }],
  scaling: [{ expert: "ai_operations", weight: 12 }],
  running: [{ expert: "ai_operations", weight: 8 }],
  run: [{ expert: "ai_operations", weight: 6 }],
  schedule: [{ expert: "ai_operations", weight: 12 }],
  schedules: [{ expert: "ai_operations", weight: 12 }],
  scheduling: [{ expert: "ai_operations", weight: 12 }],
  timeline: [{ expert: "ai_operations", weight: 12 }],
  timelines: [{ expert: "ai_operations", weight: 12 }],
  deadline: [{ expert: "ai_operations", weight: 10 }],
  deadlines: [{ expert: "ai_operations", weight: 10 }],
  workflow: [{ expert: "ai_operations", weight: 15 }],
  workflows: [{ expert: "ai_operations", weight: 15 }],
  process: [{ expert: "ai_operations", weight: 10 }],
  processes: [{ expert: "ai_operations", weight: 12 }],
  procedure: [{ expert: "ai_operations", weight: 12 }],
  procedures: [{ expert: "ai_operations", weight: 12 }],
  efficiency: [{ expert: "ai_operations", weight: 15 }],
  efficient: [{ expert: "ai_operations", weight: 12 }],
  inefficiency: [{ expert: "ai_operations", weight: 12 }],
  inefficient: [{ expert: "ai_operations", weight: 10 }],
  supply: [{ expert: "ai_operations", weight: 12 }],
  "supply chain": [{ expert: "ai_operations", weight: 18 }],
  vendor: [{ expert: "ai_operations", weight: 12 }],
  vendors: [{ expert: "ai_operations", weight: 12 }],
  supplier: [{ expert: "ai_operations", weight: 12 }],
  suppliers: [{ expert: "ai_operations", weight: 12 }],
  inventory: [{ expert: "ai_operations", weight: 15 }],
  storage: [{ expert: "ai_operations", weight: 12 }],
  warehouse: [{ expert: "ai_operations", weight: 12 }],
  distribution: [{ expert: "ai_operations", weight: 12 }],
  delivery: [{ expert: "ai_operations", weight: 10 }],
  "day-to-day": [{ expert: "ai_operations", weight: 15 }],
  "day to day": [{ expert: "ai_operations", weight: 15 }],
  daily: [{ expert: "ai_operations", weight: 8 }],
  routine: [{ expert: "ai_operations", weight: 10 }],
  upkeep: [{ expert: "ai_operations", weight: 12 }],
  repair: [{ expert: "ai_operations", weight: 10 }],
  repairs: [{ expert: "ai_operations", weight: 10 }],
  downtime: [{ expert: "ai_operations", weight: 15 }],
  uptime: [{ expert: "ai_operations", weight: 12 }],
  "operational costs": [{ expert: "ai_operations", weight: 18 }],
  "operational challenges": [{ expert: "ai_operations", weight: 18 }],
  "operational issues": [{ expert: "ai_operations", weight: 18 }],
  "how to run": [{ expert: "ai_operations", weight: 18 }],
  "how to operate": [{ expert: "ai_operations", weight: 18 }],

  // Moderator keywords (general inquiries, summaries)
  summary: [{ expert: "ai_moderator", weight: 15 }],
  summarize: [{ expert: "ai_moderator", weight: 15 }],
  summarise: [{ expert: "ai_moderator", weight: 15 }],
  overview: [{ expert: "ai_moderator", weight: 12 }],
  "wrap up": [{ expert: "ai_moderator", weight: 15 }],
  "key points": [{ expert: "ai_moderator", weight: 15 }],
  "main takeaways": [{ expert: "ai_moderator", weight: 15 }],
  takeaways: [{ expert: "ai_moderator", weight: 12 }],
  conclusion: [{ expert: "ai_moderator", weight: 12 }],
  "next steps": [{ expert: "ai_moderator", weight: 12 }],
  clarify: [{ expert: "ai_moderator", weight: 10 }],
  explain: [{ expert: "ai_moderator", weight: 8 }],
  "what do you all think": [{ expert: "ai_moderator", weight: 10 }],
  consensus: [{ expert: "ai_moderator", weight: 12 }],
  "general question": [{ expert: "ai_moderator", weight: 10 }],
  overall: [{ expert: "ai_moderator", weight: 8 }],
};

/**
 * Find the most relevant expert based on message keywords
 */
export function findMostRelevantExpert(message: string): ExpertType | null {
  const lowerMessage = message.toLowerCase();
  const expertScores: Record<ExpertType, number> = {
    ai_economist: 0,
    ai_engineer: 0,
    ai_legal: 0,
    ai_environmental: 0,
    ai_social: 0,
    ai_operations: 0,
    ai_moderator: 0,
  };

  for (const [keyword, mappings] of Object.entries(keywordToExpertMapping)) {
    if (lowerMessage.includes(keyword)) {
      for (const mapping of mappings) {
        expertScores[mapping.expert] += mapping.weight;
      }
    }
  }

  // Find the expert with highest score (minimum threshold of 8 to be considered relevant)
  let maxScore = 8;
  let bestExpert: ExpertType | null = null;
  for (const [expert, score] of Object.entries(expertScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestExpert = expert as ExpertType;
    }
  }

  return bestExpert;
}

// Domain-specific patterns for fuzzy matching (handles typos/misspellings)
const domainPatterns: { pattern: RegExp; expert: ExpertType; weight: number }[] = [
  // Environmental patterns - catch common misspellings (e?n?viron covers "eviron", "nviron", "environ")
  { pattern: /e?n?viron\w*/i, expert: "ai_environmental", weight: 15 },
  { pattern: /ecolog\w*/i, expert: "ai_environmental", weight: 15 },
  { pattern: /sustain\w*/i, expert: "ai_environmental", weight: 15 },
  { pattern: /pollut\w*/i, expert: "ai_environmental", weight: 15 },
  { pattern: /climat\w*/i, expert: "ai_environmental", weight: 15 },
  { pattern: /carbon\w*/i, expert: "ai_environmental", weight: 12 },
  { pattern: /emission\w*/i, expert: "ai_environmental", weight: 15 },
  { pattern: /biodiv\w*/i, expert: "ai_environmental", weight: 15 },
  { pattern: /ecosyst\w*/i, expert: "ai_environmental", weight: 15 },

  // Economic patterns
  { pattern: /econom\w*/i, expert: "ai_economist", weight: 15 },
  { pattern: /financ\w*/i, expert: "ai_economist", weight: 15 },
  { pattern: /budget\w*/i, expert: "ai_economist", weight: 12 },
  { pattern: /invest\w*/i, expert: "ai_economist", weight: 12 },

  // Engineering patterns
  { pattern: /engineer\w*/i, expert: "ai_engineer", weight: 15 },
  { pattern: /technic\w*/i, expert: "ai_engineer", weight: 15 },
  { pattern: /construct\w*/i, expert: "ai_engineer", weight: 15 },
  { pattern: /infrastruct\w*/i, expert: "ai_engineer", weight: 15 },

  // Legal patterns
  { pattern: /legal\w*/i, expert: "ai_legal", weight: 15 },
  { pattern: /regulat\w*/i, expert: "ai_legal", weight: 12 },
  { pattern: /complian\w*/i, expert: "ai_legal", weight: 12 },
  { pattern: /permit\w*/i, expert: "ai_legal", weight: 12 },

  // Social patterns
  { pattern: /social\w*/i, expert: "ai_social", weight: 15 },
  { pattern: /communit\w*/i, expert: "ai_social", weight: 15 },
  { pattern: /stakeholder\w*/i, expert: "ai_social", weight: 12 },

  // Operations patterns
  { pattern: /operat\w*/i, expert: "ai_operations", weight: 15 },
  { pattern: /mainten\w*/i, expert: "ai_operations", weight: 15 },
  { pattern: /logist\w*/i, expert: "ai_operations", weight: 15 },
];

/**
 * Select which expert should respond to a message
 */
export function selectRespondingExperts(
  message: string,
  targetExpert?: string,
  replyToExpert?: string
): ExpertType[] {
  // If a specific expert is targeted, only they respond
  if (targetExpert && targetExpert in expertPersonas) {
    return [targetExpert as ExpertType];
  }

  // If replying to an expert's message, check if the question is about their domain or another expert's
  if (replyToExpert && replyToExpert in expertPersonas) {
    const relevantExpert = findMostRelevantExpert(message);
    // If the question is clearly about another expert's domain, both experts respond:
    // First the replied-to expert passes to the relevant expert, then the relevant expert answers
    if (relevantExpert && relevantExpert !== replyToExpert) {
      return [replyToExpert as ExpertType, relevantExpert];
    }
    // Otherwise the replied-to expert answers
    return [replyToExpert as ExpertType];
  }

  // Use shared keyword mapping
  const lowerMessage = message.toLowerCase();

  // Check for "all experts" pattern
  const askAllPattern = /all experts|everyone|entire panel|each expert|all of you/i;
  if (askAllPattern.test(message)) {
    return ["ai_economist", "ai_engineer", "ai_legal", "ai_environmental", "ai_social", "ai_operations", "ai_moderator"];
  }

  // Track expert scores based on keyword matches
  const expertScores: Record<ExpertType, number> = {
    ai_economist: 0,
    ai_engineer: 0,
    ai_legal: 0,
    ai_environmental: 0,
    ai_social: 0,
    ai_operations: 0,
    ai_moderator: 0,
  };

  for (const [keyword, expertWeights] of Object.entries(keywordToExpertMapping)) {
    if (lowerMessage.includes(keyword)) {
      for (const { expert, weight } of expertWeights) {
        expertScores[expert] += weight;
      }
    }
  }

  // Also check domain patterns for fuzzy matching (catches typos like "evironmentalyy")
  for (const { pattern, expert, weight } of domainPatterns) {
    if (pattern.test(lowerMessage)) {
      expertScores[expert] += weight;
    }
  }

  // Get experts with scores > 0, sorted by score (highest first)
  const scoredExperts = (Object.entries(expertScores) as [ExpertType, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  // If no specific match, check if it's a casual/greeting message
  if (scoredExperts.length === 0) {
    const casualPatterns = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|thanks|thank you|ok|okay|sure|yes|no|wow|nice|cool|great|interesting|i see|got it|understood)[\s!?.]*$/i;
    const shortMessage = message.trim().length < 20;

    // For casual/short messages, the moderator responds
    if (casualPatterns.test(message.trim()) || shortMessage) {
      return ["ai_moderator"];
    }

    // For substantive general questions, moderator provides overview with support from key experts
    return ["ai_moderator", "ai_economist", "ai_engineer"];
  }

  // Get the top expert - this is the most relevant one for the question
  const topExpert = scoredExperts[0]!;
  const topScore = topExpert[1];

  // Only include additional experts if they have similar scores (within 50% of top score)
  // This ensures the most relevant expert answers, but allows related experts to chime in
  // when the question spans multiple domains
  const relevantExperts = scoredExperts
    .filter(([, score]) => score >= topScore * 0.5)
    .map(([expert]) => expert);

  // Limit to max 2 experts for focused discussions
  // The expert with highest score responds FIRST
  return relevantExperts.slice(0, 2);
}
