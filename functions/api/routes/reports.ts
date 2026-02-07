/**
 * Report listing and retrieval endpoints
 */

import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc, and, or, like, sql, type SQL } from "drizzle-orm";
import { reports } from "../../../db/schema";
import type { HonoEnv } from "../lib/types";

const reportRoutes = new Hono<HonoEnv>();

// Keywords used to detect project categories from project type strings
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

// Get reports by country (paginated with optional search and category filter)
reportRoutes.get("/reports/:country", async (c) => {
  const country = c.req.param("country");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "10", 10);
  const search = c.req.query("search")?.trim() || "";
  const category = c.req.query("category")?.trim() || "";
  const offset = (page - 1) * limit;
  const db = drizzle(c.env.DB);

  // Build search condition if search query provided
  const searchPattern = search ? `%${search}%` : null;
  const baseCondition = eq(reports.country, country);

  // Build conditions array
  const conditions: SQL[] = [baseCondition];

  // Add search condition if provided
  if (searchPattern) {
    conditions.push(
      or(
        like(sql`lower(${reports.projectDescription})`, searchPattern.toLowerCase()),
        like(sql`lower(${reports.projectType})`, searchPattern.toLowerCase()),
        like(sql`lower(${reports.location})`, searchPattern.toLowerCase())
      )!
    );
  }

  // Add category filter if provided
  if (category && categoryKeywords[category]) {
    const keywords = categoryKeywords[category];
    const keywordConditions = keywords.map(keyword =>
      like(sql`lower(${reports.projectType})`, `%${keyword}%`)
    );
    if (keywordConditions.length > 0) {
      conditions.push(or(...keywordConditions)!);
    }
  }

  const whereCondition = conditions.length > 1 ? and(...conditions) : baseCondition;

  // Get total count
  const countResult = await db
    .select()
    .from(reports)
    .where(whereCondition);
  const total = countResult.length;

  // Get paginated results
  const result = await db
    .select()
    .from(reports)
    .where(whereCondition)
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(total / limit);

  return c.json({
    reports: result.map((r) => ({
      id: r.slug,
      slug: r.slug,
      country: r.country,
      projectDescription: r.projectDescription,
      projectType: r.projectType,
      location: r.location,
      estimatedCost: r.estimatedCost,
      report: r.report,
      createdAt: r.createdAt,
    })),
    pagination: {
      page,
      limit,
      totalCount: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// Get report by slug
reportRoutes.get("/report/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, slug))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Report not found" }, 404);
  }

  const report = result[0];
  return c.json({
    id: report?.slug,
    slug: report?.slug,
    country: report?.country,
    projectDescription: report?.projectDescription,
    location: report?.location,
    report: report?.report,
    translations: report?.translations || {},
    createdAt: report?.createdAt,
  });
});

// Get recent reports across all countries
reportRoutes.get("/reports", async (c) => {
  const limit = parseInt(c.req.query("limit") || "4", 10);
  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .limit(limit);

  return c.json({
    reports: result.map((r) => ({
      id: r.slug,
      slug: r.slug,
      country: r.country,
      projectDescription: r.projectDescription,
      projectType: r.projectType,
      location: r.location,
      estimatedCost: r.estimatedCost,
      report: r.report,
      createdAt: r.createdAt,
    })),
  });
});

export { reportRoutes };
