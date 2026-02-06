/**
 * Job management utilities
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { jobs } from "../../../db/schema";

/**
 * Helper to create a simple hash for job keys (not cryptographic, just for deduplication)
 */
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Helper to check if an error is a unique constraint violation
 */
export const isUniqueConstraintError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("unique") || message.includes("constraint") || message.includes("duplicate");
  }
  return false;
};

/**
 * Helper to check if a job is stale (older than 10 minutes with in_progress status)
 */
export const isJobStale = (job: { status: string; lastHeartbeat: string }): boolean => {
  if (job.status !== "in_progress") return false;
  const lastHeartbeat = new Date(job.lastHeartbeat).getTime();
  const now = Date.now();
  const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  return now - lastHeartbeat > STALE_THRESHOLD_MS;
};

/**
 * Helper to generate job keys for deduplication
 */
export const generateJobKey = (type: string, ...parts: string[]): string => {
  return `${type}:${parts.join(":")}`;
};

/**
 * Type for safe job creation result
 */
export type SafeJobResult = {
  job: {
    id: number;
    status: string;
    resultSlug: string | null;
    progress: number | null;
    partialResult: unknown;
    lastHeartbeat: string;
  };
  isNew: boolean;
};

/**
 * Helper to safely create a job with race condition handling
 * Returns: { job, isNew } where isNew indicates if we created it or found existing
 */
export const createJobSafely = async (
  db: ReturnType<typeof drizzle>,
  jobKey: string,
  type: string,
  input: Record<string, unknown>
): Promise<SafeJobResult> => {
  // First, try to find existing job
  const existing = await db
    .select()
    .from(jobs)
    .where(eq(jobs.jobKey, jobKey))
    .limit(1);

  if (existing[0]) {
    return { job: existing[0], isNew: false };
  }

  // Try to create new job
  try {
    const newJob = await db
      .insert(jobs)
      .values({
        type,
        jobKey,
        status: "in_progress",
        startedAt: new Date().toISOString(),
        input,
      })
      .returning();

    if (newJob[0]) {
      return { job: newJob[0], isNew: true };
    }
  } catch (error) {
    // If unique constraint error, another request created the job - fetch it
    if (isUniqueConstraintError(error)) {
      const retryExisting = await db
        .select()
        .from(jobs)
        .where(eq(jobs.jobKey, jobKey))
        .limit(1);

      if (retryExisting[0]) {
        return { job: retryExisting[0], isNew: false };
      }
    }
    throw error;
  }

  throw new Error("Failed to create or find job");
};
