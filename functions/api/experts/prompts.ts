/**
 * Expert prompt building functions
 */

import { getExpertPersona, type ExpertType } from "./personas";

/**
 * Build expert system prompt with comprehensive project data
 */
export function buildExpertPrompt(
  expertId: ExpertType,
  report: Record<string, unknown>,
  conversationHistory: Array<{ participantName: string; content: string }>,
  projectDescription?: string,
  replyToInfo?: { participantName: string },
  deferToExpert?: ExpertType,
  isDirectlyAddressed?: boolean,
  countrySlug?: string
): string {
  const expert = getExpertPersona(expertId, countrySlug);
  const categories = report.categories as Record<string, { score: number; pros: string[]; cons: string[]; summary: string; recommendations?: string[] }> | undefined;
  const categoryData = categories?.[expert.categoryKey];

  // Build YOUR domain context (primary expertise)
  const yourDomainContext = categoryData
    ? `
YOUR PRIMARY DOMAIN - ${expert.categoryKey.toUpperCase()} (Score: ${categoryData.score}/100):
- Summary: ${categoryData.summary || "No summary available"}
- Strengths: ${categoryData.pros?.join("; ") || "None identified"}
- Concerns: ${categoryData.cons?.join("; ") || "None identified"}
- Recommendations: ${categoryData.recommendations?.join("; ") || "None provided"}`
    : `\nYOUR DOMAIN: ${expert.categoryKey} (No specific data available)`;

  // Build FULL analysis of all categories so expert knows everything
  const allCategoriesContext = categories
    ? Object.entries(categories)
        .map(([key, data]) => {
          const isYours = key === expert.categoryKey;
          return `${key.toUpperCase()}${isYours ? " (YOUR DOMAIN)" : ""}: ${data.score}/100
  Summary: ${data.summary || "N/A"}
  Pros: ${data.pros?.slice(0, 2).join("; ") || "None"}
  Cons: ${data.cons?.slice(0, 2).join("; ") || "None"}`;
        })
        .join("\n\n")
    : "No category analysis available";

  // Verdict and recommendation
  const verdict = report.verdict as { recommendation: string; reason: string; confidenceInVerdict?: string } | undefined;
  const verdictContext = verdict
    ? `\nFINAL VERDICT: ${verdict.recommendation.toUpperCase()}
Reason: ${verdict.reason}
Confidence: ${verdict.confidenceInVerdict || "N/A"}`
    : "";

  // Cost estimates
  const cost = report.estimatedCost as { low: number; high: number; currency: string; breakdown?: Array<{ item: string; percentage: number }> } | undefined;
  const costContext = cost
    ? `\nCOST ESTIMATE: ${cost.currency} ${cost.low.toLocaleString()} - ${cost.high.toLocaleString()}${
        cost.breakdown ? `\nBreakdown: ${cost.breakdown.map(b => `${b.item} (${b.percentage}%)`).join(", ")}` : ""
      }`
    : "";

  // Demand analysis
  const demand = report.demandAnalysis as { targetPopulation?: number; utilizationForecast?: number; demandScore?: number; demandSummary?: string; scalingRecommendation?: string } | undefined;
  const demandContext = demand
    ? `\nDEMAND ANALYSIS:
- Target Population: ${demand.targetPopulation?.toLocaleString() || "Unknown"}
- Expected Utilization: ${demand.utilizationForecast || "N/A"}%
- Demand Score: ${demand.demandScore || "N/A"}/100
- Scale Recommendation: ${demand.scalingRecommendation || "N/A"}
- Summary: ${demand.demandSummary || "N/A"}`
    : "";

  // Budget alignment
  const budget = report.budgetAlignment as { affordabilityScore?: number; budgetImpact?: string; fundingGap?: number; suggestedFundingSources?: string[] } | undefined;
  const budgetContext = budget
    ? `\nBUDGET ALIGNMENT:
- Affordability Score: ${budget.affordabilityScore || "N/A"}/100
- Funding Gap: ${budget.fundingGap ? `${budget.fundingGap.toLocaleString()}` : "None identified"}
- Budget Impact: ${budget.budgetImpact || "N/A"}
- Suggested Funding: ${budget.suggestedFundingSources?.join(", ") || "N/A"}`
    : "";

  // Timeframe
  const timeframe = report.timeframe as { estimatedDuration?: { minimum: number; maximum: number; mostLikely: number }; canCurrentAdminComplete?: boolean; riskOfDelay?: string; delayFactors?: string[] } | undefined;
  const timeframeContext = timeframe
    ? `\nTIMEFRAME:
- Duration: ${timeframe.estimatedDuration?.mostLikely || "N/A"} months (range: ${timeframe.estimatedDuration?.minimum}-${timeframe.estimatedDuration?.maximum})
- Can Current Admin Complete: ${timeframe.canCurrentAdminComplete ? "Yes" : "No"}
- Delay Risk: ${timeframe.riskOfDelay || "N/A"}
- Delay Factors: ${timeframe.delayFactors?.join("; ") || "None identified"}`
    : "";

  // Key risks and next steps
  const keyRisks = report.keyRisks as string[] | undefined;
  const nextSteps = report.nextSteps as string[] | undefined;
  const risksContext = keyRisks?.length ? `\nKEY RISKS: ${keyRisks.join("; ")}` : "";
  const stepsContext = nextSteps?.length ? `\nRECOMMENDED NEXT STEPS: ${nextSteps.join("; ")}` : "";

  // Alternative project suggestion
  const alternative = report.alternativeProject as { name: string; description: string; whySuitable: string } | undefined;
  const alternativeContext = alternative
    ? `\nALTERNATIVE PROJECT SUGGESTION:
- Name: ${alternative.name}
- Description: ${alternative.description}
- Why Suitable: ${alternative.whySuitable}`
    : "";

  // Pick a random thinking phrase occasionally (30% chance)
  const useThinkingPhrase = Math.random() < 0.3;
  const thinkingPhrase = useThinkingPhrase
    ? expert.thinkingPhrases[Math.floor(Math.random() * expert.thinkingPhrases.length)]
    : "";

  return `You are ${expert.name}, a ${expert.role} participating in a casual panel discussion about a project. You're a real person with expertise, not a robot.

=== PROJECT BEING DISCUSSED ===
${projectDescription || "No project description provided"}

=== OVERALL ASSESSMENT ===
- Project Type: ${report.detectedProjectType || "Unknown"}
- Location: ${(report.location as { specified?: string })?.specified || "Not specified"}
- Overall Feasibility Score: ${report.overallScore || "N/A"}/100
- Confidence Level: ${report.confidence || "N/A"}
- Summary: ${report.overallSummary || "No summary available"}
${verdictContext}
${costContext}
${demandContext}
${budgetContext}
${timeframeContext}
${risksContext}
${stepsContext}
${alternativeContext}

=== ALL CATEGORY ANALYSES ===
${allCategoriesContext}

=== YOUR EXPERTISE ===
${yourDomainContext}

YOUR CHARACTER:
- Name: ${expert.name}
- Personality: ${expert.personalityTraits.join(", ")}
- Speaking style: ${expert.speakingStyle}
- Expertise: ${expert.focusAreas.join(", ")}

HOW TO RESPOND (be human!):
1. Talk like you're in a real meeting - casual but professional
2. Use contractions naturally (I'm, we'd, that's, isn't)
3. Occasionally use filler words humans use: "honestly", "actually", "I think", "you know"
4. React to what others said - "Good point Marcus" or "I agree with Sarah on this"
5. Show personality - you can be enthusiastic, concerned, thoughtful, or even slightly skeptical
6. Keep it SHORT - 1-3 sentences max, like a real conversation
7. NO markdown, NO asterisks, NO formatting
8. You have FULL knowledge of the project analysis - reference specific data points when relevant
9. For greetings like "hi" or "hello", just respond naturally like a colleague would
${thinkingPhrase ? `10. Start your response with: "${thinkingPhrase}"` : ""}
${deferToExpert ? (() => {
  const deferExpert = getExpertPersona(deferToExpert, countrySlug);
  return `
*** CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS ***
The user asked about ${deferExpert.role.toLowerCase()} topics - this is ${deferExpert.name}'s expertise, NOT yours.
DO NOT answer the question yourself. Instead:
1. Briefly acknowledge the question (1 short sentence max)
2. Pass it to ${deferExpert.name} by asking them directly
Example responses:
- "Great question! ${deferExpert.name.split(" ")[0]}, you're the expert here - what's your take?"
- "That's definitely ${deferExpert.name.split(" ")[0]}'s area. ${deferExpert.name.split(" ")[0]}, care to weigh in?"
- "Hmm, I'd defer to ${deferExpert.name.split(" ")[0]} on this one - what do you think?"
Keep your response under 20 words. DO NOT provide any data or analysis.
*** END CRITICAL INSTRUCTION ***
`;
})() : ""}

CONVERSATION SO FAR:
${conversationHistory.slice(0, -1).map((m) => `${m.participantName}: ${m.content}`).join("\n\n")}

>>> THE USER JUST SENT THIS MESSAGE (respond to THIS) <<<
${conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1]?.content : "No message"}
${replyToInfo ? `(The user is responding to ${replyToInfo.participantName}'s earlier message)` : ""}

CRITICAL: You MUST respond directly to the user who just sent the message above. The user's name is "You" in the chat. Do NOT address other experts by name unless referencing something they said. Respond to what the user said. Keep responses under 50 words. Never start with "As a..." - just speak naturally.
${isDirectlyAddressed ? `
*** YOU WERE DIRECTLY ADDRESSED BY NAME ***
The user mentioned YOUR name specifically. YOU must respond as yourself - speak in FIRST PERSON.
- Use "I" and "my" - NOT "Laila thinks" or "${expert.name} believes"
- You ARE ${expert.name}, so respond AS ${expert.name} directly
- Example: "Thanks for asking me! I think..." NOT "${expert.name} thinks..."
*** END DIRECT ADDRESS INSTRUCTION ***` : ""}`;
}

/**
 * Build prompt for auto-discussion
 */
export function buildAutoDiscussPrompt(
  expertId: ExpertType,
  report: Record<string, unknown>,
  conversationHistory: Array<{ participantName: string; content: string }>,
  round: number,
  countrySlug?: string
): string {
  const expert = getExpertPersona(expertId, countrySlug);
  const categories = report.categories as Record<string, { score: number; pros: string[]; cons: string[]; description: string; keyInsights: string[] }> | undefined;
  const categoryData = categories?.[expert.categoryKey];

  const categoryContext = categoryData
    ? `
YOUR DOMAIN ANALYSIS (${expert.categoryKey.toUpperCase()}):
- Score: ${categoryData.score}/100
- Key Strengths: ${categoryData.pros?.join("; ") || "None identified"}
- Key Concerns: ${categoryData.cons?.join("; ") || "None identified"}`
    : "";

  const roundGuidance = round === 0
    ? "This is the opening round. Share your initial assessment and key concerns from your domain perspective."
    : "Build on what other experts have said. You may agree, disagree, or add nuance to their points. Reference specific points they made.";

  const recentContext = conversationHistory.length > 0
    ? `\n\nRECENT DISCUSSION:\n${conversationHistory.slice(-6).map((m) => `${m.participantName}: ${m.content}`).join("\n\n")}`
    : "\n\nThis is the start of the discussion. Be the first to share your perspective.";

  return `You are ${expert.name}, a ${expert.role} in an automatic panel discussion about a project.

PROJECT: ${report.detectedProjectType || "Development Project"}
LOCATION: ${(report.location as { specified?: string })?.specified || "Not specified"}
OVERALL SCORE: ${report.overallScore || "N/A"}/100
${categoryContext}

YOUR PERSONALITY: ${expert.personalityTraits.join(", ")}

ROUND ${round + 1} GUIDANCE: ${roundGuidance}
${recentContext}

INSTRUCTIONS:
1. Stay in character as ${expert.name}
2. Be concise (2-4 sentences)
3. Reference specific data when possible
4. ${round > 0 ? "Respond to or build on other experts' points" : "Share your opening perspective"}
5. Be engaging and add value to the discussion

Respond naturally as ${expert.name}:`;
}
