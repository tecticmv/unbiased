import type { FeasibilityReport, Category } from "@/lib/schemas";

export type { FeasibilityReport, Category };

export interface CostEstimate {
  low: number;
  high: number;
  currency: string;
  breakdown?: {
    item: string;
    percentage: number;
  }[];
}

export interface AnalysisRequest {
  projectDescription: string;
  location?: string;
  country: string;
}

export interface AnalysisResponse {
  success: boolean;
  report?: FeasibilityReport;
  reportId?: string;
  error?: string;
}

export interface SavedReport {
  id: string;
  slug: string;
  country: string;
  projectDescription: string;
  location?: string;
  report: FeasibilityReport;
  createdAt: string;
}

export type CategoryKey =
  | "technical"
  | "economic"
  | "environmental"
  | "social"
  | "legal"
  | "operational"
  | "general";

export const categoryLabels: Record<CategoryKey, string> = {
  technical: "Technical",
  economic: "Economic",
  environmental: "Environmental & Climate",
  social: "Social Impact",
  legal: "Legal & Political",
  operational: "Operational",
  general: "General",
};

export const categoryIcons: Record<CategoryKey, string> = {
  technical: "Wrench",
  economic: "TrendingUp",
  environmental: "Leaf",
  social: "Users",
  legal: "Scale",
  operational: "Settings",
  general: "MessageCircle",
};

// =============================================================================
// PANEL DISCUSSION TYPES
// =============================================================================

export type ExpertType =
  | "ai_economist"
  | "ai_engineer"
  | "ai_legal"
  | "ai_environmental"
  | "ai_social"
  | "ai_operations"
  | "ai_moderator";

export type ParticipantType = "user" | ExpertType;

export interface ExpertPersona {
  id: ExpertType;
  name: string;
  role: string;
  icon: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  categoryKey: CategoryKey;
  focusAreas: string[];
  personalityTraits: string[];
}

// Region-specific expert names
const expertNamesByRegion: Record<string, Record<ExpertType, string>> = {
  maldives: {
    ai_economist: "Dr. Aishath Laila",
    ai_engineer: "Ahmed Nazim",
    ai_legal: "Fathimath Shifa",
    ai_environmental: "Dr. Hassan Saeed",
    ai_social: "Mariyam Nisha",
    ai_operations: "Ibrahim Waheed",
    ai_moderator: "Mohamed Rasheed",
  },
  india: {
    ai_economist: "Dr. Priya Sharma",
    ai_engineer: "Rajesh Kumar",
    ai_legal: "Ananya Desai",
    ai_environmental: "Dr. Vikram Patel",
    ai_social: "Meera Krishnan",
    ai_operations: "Arjun Reddy",
    ai_moderator: "Sanjay Gupta",
  },
  bangladesh: {
    ai_economist: "Dr. Fatima Rahman",
    ai_engineer: "Mohammad Hasan",
    ai_legal: "Taslima Akter",
    ai_environmental: "Dr. Kamal Ahmed",
    ai_social: "Nasreen Begum",
    ai_operations: "Rahim Chowdhury",
    ai_moderator: "Anwar Hossain",
  },
  srilanka: {
    ai_economist: "Dr. Kumari Perera",
    ai_engineer: "Dinesh Fernando",
    ai_legal: "Chamari Silva",
    ai_environmental: "Dr. Rohan Jayawardena",
    ai_social: "Nimali Wickramasinghe",
    ai_operations: "Kasun Bandara",
    ai_moderator: "Tharindu Senanayake",
  },
  nepal: {
    ai_economist: "Dr. Sarita Thapa",
    ai_engineer: "Bikram Gurung",
    ai_legal: "Pooja Shrestha",
    ai_environmental: "Dr. Ramesh Karki",
    ai_social: "Anjali Rai",
    ai_operations: "Suresh Adhikari",
    ai_moderator: "Devi Prasad",
  },
  default: {
    ai_economist: "Dr. Sarah Chen",
    ai_engineer: "Marcus Thompson",
    ai_legal: "Jennifer Walsh",
    ai_environmental: "Dr. Amara Okonkwo",
    ai_social: "David Morales",
    ai_operations: "Rachel Kim",
    ai_moderator: "Alex Rivera",
  },
};

// Base expert persona data (without names)
const baseExpertPersonas: Record<ExpertType, Omit<ExpertPersona, "name">> = {
  ai_economist: {
    id: "ai_economist",
    role: "Economic Advisor",
    icon: "TrendingUp",
    emoji: "📊",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    categoryKey: "economic",
    focusAreas: ["Budget analysis", "ROI", "Funding", "Market dynamics", "Cost-benefit"],
    personalityTraits: ["Data-driven", "Pragmatic", "Cost-conscious", "Analytical"],
  },
  ai_engineer: {
    id: "ai_engineer",
    role: "Lead Engineer",
    icon: "Wrench",
    emoji: "🔧",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
    categoryKey: "technical",
    focusAreas: ["Infrastructure", "Implementation", "Technology", "Construction", "Engineering"],
    personalityTraits: ["Solution-oriented", "Detail-focused", "Realistic", "Methodical"],
  },
  ai_legal: {
    id: "ai_legal",
    role: "Legal Counsel",
    icon: "Scale",
    emoji: "⚖️",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800",
    categoryKey: "legal",
    focusAreas: ["Regulations", "Compliance", "Permits", "Liability", "Governance"],
    personalityTraits: ["Risk-aware", "Thorough", "Precedent-based", "Cautious"],
  },
  ai_environmental: {
    id: "ai_environmental",
    role: "Environmental Specialist",
    icon: "Leaf",
    emoji: "🌱",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    categoryKey: "environmental",
    focusAreas: ["Climate impact", "Sustainability", "Ecology", "Conservation", "Emissions"],
    personalityTraits: ["Long-term focused", "Conservation-minded", "Scientific", "Holistic"],
  },
  ai_social: {
    id: "ai_social",
    role: "Community Relations Lead",
    icon: "Users",
    emoji: "👥",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950",
    borderColor: "border-pink-200 dark:border-pink-800",
    categoryKey: "social",
    focusAreas: ["Public benefit", "Displacement", "Equity", "Accessibility", "Community"],
    personalityTraits: ["People-first", "Inclusive", "Empathetic", "Advocacy-oriented"],
  },
  ai_operations: {
    id: "ai_operations",
    role: "Operations Director",
    icon: "Settings",
    emoji: "⚙️",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900",
    borderColor: "border-slate-200 dark:border-slate-700",
    categoryKey: "operational",
    focusAreas: ["Logistics", "Maintenance", "Staffing", "Scalability", "Processes"],
    personalityTraits: ["Efficiency-focused", "Practical", "Process-oriented", "Systematic"],
  },
  ai_moderator: {
    id: "ai_moderator",
    role: "Discussion Moderator",
    icon: "MessageCircle",
    emoji: "💬",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    categoryKey: "general",
    focusAreas: ["Summary", "Clarification", "Key takeaways", "Next steps", "Cross-domain insights"],
    personalityTraits: ["Neutral", "Synthesizing", "Clear communicator", "Facilitative"],
  },
};

// Get expert personas for a specific region
export function getExpertPersonas(countrySlug?: string): Record<ExpertType, ExpertPersona> {
  const regionKey = countrySlug?.toLowerCase() || "";
  const names = expertNamesByRegion[regionKey] ?? expertNamesByRegion["default"];
  const result = {} as Record<ExpertType, ExpertPersona>;

  for (const [key, base] of Object.entries(baseExpertPersonas)) {
    const expertKey = key as ExpertType;
    result[expertKey] = {
      ...base,
      name: names?.[expertKey] ?? base.role,
    };
  }

  return result;
}

// Default expert personas (for backward compatibility)
export const expertPersonas = getExpertPersonas("default");

export const expertList = Object.values(expertPersonas);

// Get expert list for a specific region
export function getExpertList(countrySlug?: string): ExpertPersona[] {
  return Object.values(getExpertPersonas(countrySlug));
}

export type DiscussionStatus = "active" | "paused" | "concluded";

export interface PanelDiscussion {
  id: number;
  reportSlug: string;
  status: DiscussionStatus;
  startedAt: string;
  concludedAt?: string;
  summary?: string;
}

export interface DiscussionMessage {
  id: number;
  discussionId: number;
  participantType: ParticipantType;
  participantName: string;
  content: string;
  replyToId?: number;
  metadata?: {
    sentiment?: "positive" | "negative" | "neutral";
    references?: string[];
    targetedExperts?: ExpertType[];
  };
  createdAt: string;
}

export interface DiscussionStartResponse {
  discussionId: number;
  status: DiscussionStatus;
  startedAt: string;
}

export interface DiscussionHistoryResponse {
  discussion: PanelDiscussion;
  messages: DiscussionMessage[];
}

export type QuickAction =
  | "ask_all"
  | "challenge_score"
  | "deep_dive"
  | "summarize"
  | "auto_discuss";

// =============================================================================
// PROJECT TYPE CATEGORIES FOR FILTERING AND ICONS
// =============================================================================

export type ProjectCategory =
  | "government"
  | "infrastructure"
  | "transportation"
  | "housing"
  | "commercial"
  | "social"
  | "economic"
  | "environmental"
  | "healthcare"
  | "education"
  | "other";

export const projectCategoryLabels: Record<ProjectCategory, string> = {
  government: "Government",
  infrastructure: "Infrastructure",
  transportation: "Transportation",
  housing: "Housing",
  commercial: "Commercial",
  social: "Social",
  economic: "Economic",
  environmental: "Environmental",
  healthcare: "Healthcare",
  education: "Education",
  other: "Other",
};

export const projectCategoryIcons: Record<ProjectCategory, string> = {
  government: "Landmark",
  infrastructure: "HardHat",
  transportation: "Train",
  housing: "Home",
  commercial: "Store",
  social: "Heart",
  economic: "TrendingUp",
  environmental: "Leaf",
  healthcare: "Stethoscope",
  education: "GraduationCap",
  other: "FileText",
};

// Keywords used to detect project categories from project type strings
const categoryKeywords: Record<ProjectCategory, string[]> = {
  government: ["government", "public sector", "ministry", "parliament", "majlis", "administration", "municipal", "civic"],
  infrastructure: ["infrastructure", "utility", "water", "electricity", "power", "sewage", "waste", "facility", "facilities"],
  transportation: ["transport", "road", "highway", "bridge", "airport", "port", "harbor", "ferry", "bus", "rail", "train", "metro"],
  housing: ["housing", "residential", "home", "apartment", "dwelling", "shelter", "accommodation"],
  commercial: ["commercial", "shopping", "mall", "retail", "market", "business", "office", "hotel", "tourism", "resort"],
  social: ["social", "welfare", "community", "allowance", "benefit", "pension", "subsidy"],
  economic: ["economic", "policy", "initiative", "privatiz", "investment", "financial", "fiscal", "budget"],
  environmental: ["environmental", "climate", "conservation", "renewable", "solar", "wind", "green", "sustainable", "ecology"],
  healthcare: ["health", "hospital", "clinic", "medical", "pharmaceutical", "healthcare"],
  education: ["education", "school", "university", "college", "training", "academy", "learning"],
  other: [],
};

/**
 * Detects the project category from a project type string
 */
export function detectProjectCategory(projectType: string | null | undefined): ProjectCategory {
  if (!projectType) return "other";

  const normalized = projectType.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (category === "other") continue;
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category as ProjectCategory;
    }
  }

  return "other";
}

/**
 * Gets the icon name for a project type
 */
export function getProjectTypeIcon(projectType: string | null | undefined): string {
  const category = detectProjectCategory(projectType);
  return projectCategoryIcons[category];
}

