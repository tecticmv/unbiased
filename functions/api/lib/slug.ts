/**
 * Slug generation utilities
 */

/**
 * Converts text to URL-safe slug format
 */
export function slugify(text: string, maxLength = 20): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, "") // Trim hyphens from ends
    .substring(0, maxLength);
}

/**
 * Generates a random alphanumeric suffix
 */
export function generateRandomSuffix(length = 4): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}

/**
 * Extracts 1-2 meaningful keywords from project type
 * "Residential Housing Development" -> "housing"
 * "Monetary Policy Expansion" -> "monetary-policy"
 */
export function extractProjectTypeSlug(projectType: string): string {
  const skipWords = new Set([
    "development",
    "project",
    "initiative",
    "program",
    "expansion",
    "implementation",
    "improvement",
    "construction",
    "facility",
    "system",
    "infrastructure",
    "scheme",
    "the",
    "a",
    "an",
  ]);

  const compoundTerms: Record<string, string> = {
    "solar energy": "solar",
    "wind energy": "wind",
    "renewable energy": "renewable",
    "monetary policy": "monetary",
    "fiscal policy": "fiscal",
    "public health": "healthcare",
    "affordable housing": "housing",
    "residential housing": "housing",
    "commercial building": "commercial",
    "public transport": "transport",
    "mass transit": "transit",
    "water treatment": "water",
    "waste management": "waste",
    "land reclamation": "reclamation",
  };

  const normalized = projectType.toLowerCase();

  // Check for compound terms first
  for (const [term, slug] of Object.entries(compoundTerms)) {
    if (normalized.includes(term)) {
      return slug;
    }
  }

  // Otherwise, extract first meaningful word
  const words = normalized.split(/\s+/);
  for (const word of words) {
    const cleaned = slugify(word, 15);
    if (cleaned.length >= 3 && !skipWords.has(cleaned)) {
      return cleaned;
    }
  }

  return slugify(words[0] || "", 15) || "project";
}

/**
 * Generates a human-readable slug in format: {project-type}-{location}-{random4}
 * Examples: "housing-male-a1b2", "solar-colombo-x9y8", "monetary-7k3m"
 */
export function generateSlug(projectType: string, location?: string): string {
  const typeSlug = extractProjectTypeSlug(projectType);
  const locationSlug = location ? slugify(location, 15) : null;
  const suffix = generateRandomSuffix(4);

  if (locationSlug) {
    return `${typeSlug}-${locationSlug}-${suffix}`;
  }
  return `${typeSlug}-${suffix}`;
}
