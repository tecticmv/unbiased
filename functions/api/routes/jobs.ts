/**
 * Job status and cleanup endpoints
 */

import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, lt } from "drizzle-orm";
import { jobs, reports } from "../../../db/schema";
import type { HonoEnv } from "../lib/types";
import { isJobStale } from "../lib/job-utils";

// Job types constant
export const JOB_TYPES = {
  ANALYSIS: "analysis",
  REPORT_TRANSLATION: "report_translation",
  DISCUSSION_TRANSLATION: "discussion_translation",
  REPORT_REPAIR: "report_repair",
} as const;

const jobRoutes = new Hono<HonoEnv>();

// Get job status by job key
jobRoutes.get("/job/status/:jobKey", async (c) => {
  const jobKey = c.req.param("jobKey");
  const db = drizzle(c.env.DB);

  const existingJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.jobKey, jobKey))
    .limit(1);

  const job = existingJobs[0];

  if (!job) {
    return c.json({
      status: "not_found",
      message: "Job not found. It may have been cleaned up or never started.",
    }, 404);
  }

  // Check if job is stale
  if (isJobStale(job)) {
    return c.json({
      status: "stale",
      jobId: job.id,
      type: job.type,
      message: "Job timed out. Please retry.",
    });
  }

  // Return job status with relevant data
  const response: Record<string, unknown> = {
    status: job.status,
    jobId: job.id,
    type: job.type,
    progress: job.progress,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
  };

  if (job.status === "completed") {
    response.completedAt = job.completedAt;
    response.resultSlug = job.resultSlug;
  }

  if (job.status === "failed") {
    response.error = job.error;
    response.completedAt = job.completedAt;
  }

  if (job.status === "in_progress") {
    response.partialResult = job.partialResult;
    response.message = "Job is in progress. Please continue polling.";
  }

  return c.json(response);
});

// Get job status by ID
jobRoutes.get("/job/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const db = drizzle(c.env.DB);

  if (isNaN(id)) {
    return c.json({ error: "Invalid job ID" }, 400);
  }

  const existingJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);

  const job = existingJobs[0];

  if (!job) {
    return c.json({
      status: "not_found",
      message: "Job not found.",
    }, 404);
  }

  // Check if job is stale
  if (isJobStale(job)) {
    return c.json({
      status: "stale",
      jobId: job.id,
      type: job.type,
      message: "Job timed out. Please retry.",
    });
  }

  // Return full job details
  const response: Record<string, unknown> = {
    status: job.status,
    jobId: job.id,
    jobKey: job.jobKey,
    type: job.type,
    progress: job.progress,
    input: job.input,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
  };

  if (job.status === "completed") {
    response.completedAt = job.completedAt;
    response.resultSlug = job.resultSlug;

    // If it's an analysis job with a result, fetch the report
    if (job.type === JOB_TYPES.ANALYSIS && job.resultSlug) {
      const reportResult = await db
        .select()
        .from(reports)
        .where(eq(reports.slug, job.resultSlug))
        .limit(1);

      if (reportResult[0]) {
        response.report = reportResult[0].report;
      }
    }
  }

  if (job.status === "failed") {
    response.error = job.error;
    response.completedAt = job.completedAt;
  }

  if (job.status === "in_progress") {
    response.partialResult = job.partialResult;
    response.message = "Job is in progress. Please continue polling.";
  }

  return c.json(response);
});

// Cleanup old completed/failed jobs (can be called by cron or manually)
// Deletes jobs older than specified hours (default 24h)
jobRoutes.post("/jobs/cleanup", async (c) => {
  const db = drizzle(c.env.DB);
  const hoursOld = parseInt(c.req.query("hours") || "24", 10);

  const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();

  // Delete completed jobs older than cutoff
  const completedResult = await db
    .delete(jobs)
    .where(
      and(
        eq(jobs.status, "completed"),
        lt(jobs.completedAt, cutoffDate)
      )
    )
    .returning({ id: jobs.id });

  // Delete failed jobs older than cutoff
  const failedResult = await db
    .delete(jobs)
    .where(
      and(
        eq(jobs.status, "failed"),
        lt(jobs.completedAt, cutoffDate)
      )
    )
    .returning({ id: jobs.id });

  // Delete stale in-progress jobs (no heartbeat for 10+ minutes)
  const staleDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const staleResult = await db
    .delete(jobs)
    .where(
      and(
        eq(jobs.status, "in_progress"),
        lt(jobs.lastHeartbeat, staleDate)
      )
    )
    .returning({ id: jobs.id });

  return c.json({
    cleaned: {
      completed: completedResult.length,
      failed: failedResult.length,
      stale: staleResult.length,
    },
    cutoffDate,
    staleDate,
  });
});

export { jobRoutes };
