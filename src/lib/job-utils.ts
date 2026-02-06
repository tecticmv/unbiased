/**
 * Frontend job utilities for analysis reconnection
 * Must match backend implementation in functions/api/lib/job-utils.ts
 */

/**
 * Simple hash function for job key generation
 * Must match backend simpleHash implementation exactly
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
 * Generate job key for analysis jobs
 * Must match backend logic in analysis.ts
 */
export const generateAnalysisJobKey = (country: string, projectDescription: string): string => {
  const descHash = simpleHash(projectDescription.substring(0, 200));
  return `analysis:${country}:${descHash}`;
};

/**
 * Job status response from /api/job/status/:jobKey
 */
export interface JobStatusResponse {
  status: "pending" | "in_progress" | "completed" | "failed" | "stale" | "not_found";
  jobId?: number;
  type?: string;
  progress?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  resultSlug?: string;
  error?: string;
  partialResult?: Record<string, unknown>;
  report?: Record<string, unknown>;
}
