/**
 * Stats API endpoint
 * Provides aggregated analytics for the home page
 */

import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc, sql } from "drizzle-orm";
import { reports, panelDiscussions, discussionMessages } from "../../../db/schema";
import type { HonoEnv } from "../lib/types";

const statsRoutes = new Hono<HonoEnv>();

/**
 * Helper to detect project category from report data
 */
function detectProjectCategory(projectType: string | null | undefined): string {
  if (!projectType) return "other";

  const normalized = projectType.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
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
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }

  return "other";
}

/**
 * GET /api/stats
 * Returns aggregated analytics for the home page
 * Query params:
 * - country (optional): Filter stats by country code (e.g., 'maldives', 'india')
 */
statsRoutes.get("/stats", async (c) => {
  const db = drizzle(c.env.DB);
  const cache = caches.default;
  const country = c.req.query("country"); // Optional country filter

  // Try cache first (5-minute TTL) - include country in cache key
  const cacheKey = new Request(`https://cache/stats${country ? `?country=${country}` : ""}`, { method: "GET" });
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Calculate 7 days ago timestamp
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Total reports count
    const totalReportsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(country ? eq(reports.country, country) : sql`1=1`);
    const totalReports = Number(totalReportsResult[0]?.count) || 0;

    // 2. Active discussions count
    const activeDiscussionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(panelDiscussions)
      .leftJoin(reports, eq(panelDiscussions.reportSlug, reports.slug))
      .where(
        country
          ? sql`${panelDiscussions.status} = 'active' AND ${reports.country} = ${country}`
          : eq(panelDiscussions.status, "active")
      );
    const activeDiscussions = Number(activeDiscussionsResult[0]?.count) || 0;

    // 3. Recent activity (last 7 days)
    const recentReportsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(
        country
          ? sql`${reports.createdAt} >= ${sevenDaysAgo} AND ${reports.country} = ${country}`
          : sql`${reports.createdAt} >= ${sevenDaysAgo}`
      );
    const recentActivity = Number(recentReportsResult[0]?.count) || 0;

    // 4. Get all reports for score calculations and category breakdown
    const allReports = await db
      .select({
        report: reports.report,
        projectType: reports.projectType,
      })
      .from(reports)
      .where(country ? eq(reports.country, country) : sql`1=1`);

    // Calculate average feasibility score
    const scores = allReports
      .map(r => {
        try {
          const reportData = typeof r.report === 'string'
            ? JSON.parse(r.report)
            : r.report;
          return reportData?.overallScore;
        } catch {
          return null;
        }
      })
      .filter((score): score is number => typeof score === 'number' && !isNaN(score));

    const avgFeasibilityScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // 5. Category breakdown
    const categoryBreakdownMap = allReports.reduce((acc, r) => {
      try {
        const reportData = typeof r.report === 'string'
          ? JSON.parse(r.report)
          : r.report;
        const projectType = r.projectType || reportData?.detectedProjectType;
        const category = detectProjectCategory(projectType);
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      } catch {
        acc["other"] = (acc["other"] || 0) + 1;
        return acc;
      }
    }, {} as Record<string, number>);

    const categoryBreakdown = Object.entries(categoryBreakdownMap)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalReports > 0 ? Math.round((count / totalReports) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 6. Score distribution
    const scoreDistributionMap = scores.reduce((acc, score) => {
      const range = Math.floor(score / 20) * 20;
      const key = `${range}-${range + 20}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const scoreDistribution = [
      { range: "0-20", count: scoreDistributionMap["0-20"] || 0 },
      { range: "20-40", count: scoreDistributionMap["20-40"] || 0 },
      { range: "40-60", count: scoreDistributionMap["40-60"] || 0 },
      { range: "60-80", count: scoreDistributionMap["60-80"] || 0 },
      { range: "80-100", count: scoreDistributionMap["80-100"] || 0 },
    ].map(item => ({
      ...item,
      percentage: scores.length > 0 ? Math.round((item.count / scores.length) * 100) : 0,
    }));

    // 7. Trending reports (last 7 days, limit 4)
    const trendingReports = await db
      .select({
        slug: reports.slug,
        country: reports.country,
        projectDescription: reports.projectDescription,
        location: reports.location,
        projectType: reports.projectType,
        estimatedCost: reports.estimatedCost,
        report: reports.report,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(
        country
          ? sql`${reports.createdAt} >= ${sevenDaysAgo} AND ${reports.country} = ${country}`
          : sql`${reports.createdAt} >= ${sevenDaysAgo}`
      )
      .orderBy(desc(reports.createdAt))
      .limit(4);

    // 8. Active discussions with details
    const activeDiscussionsData = await db
      .select({
        id: panelDiscussions.id,
        reportSlug: panelDiscussions.reportSlug,
        startedAt: panelDiscussions.startedAt,
        projectDescription: reports.projectDescription,
        projectType: reports.projectType,
        location: reports.location,
        country: reports.country,
      })
      .from(panelDiscussions)
      .leftJoin(reports, eq(panelDiscussions.reportSlug, reports.slug))
      .where(
        country
          ? sql`${panelDiscussions.status} = 'active' AND ${reports.country} = ${country}`
          : eq(panelDiscussions.status, "active")
      )
      .orderBy(desc(panelDiscussions.startedAt))
      .limit(3);

    // Get message counts for each discussion
    const discussionsWithCounts = await Promise.all(
      activeDiscussionsData.map(async (item) => {
        const messageCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(discussionMessages)
          .where(eq(discussionMessages.discussionId, item.id));

        return {
          id: item.id,
          reportSlug: item.reportSlug,
          messageCount: Number(messageCountResult[0]?.count) || 0,
          projectDescription: item.projectDescription,
          projectType: item.projectType,
          location: item.location,
          country: item.country,
        };
      })
    );

    // Build response
    const statsData = {
      overview: {
        totalReports,
        activeDiscussions,
        recentActivity,
        avgFeasibilityScore,
      },
      categoryBreakdown,
      scoreDistribution,
      trending: {
        reports: trendingReports,
        discussions: discussionsWithCounts,
      },
    };

    // Create response with caching headers
    const response = new Response(JSON.stringify(statsData), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // 5 minutes
      },
    });

    // Cache the response
    await cache.put(cacheKey, response.clone());

    return response;
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json(
      {
        error: "Failed to fetch statistics",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});

export { statsRoutes };
