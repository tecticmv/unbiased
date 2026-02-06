import { useCallback, useRef, useEffect } from "react";
import { useStreamingReport, RECONNECT_BASE_DELAY_MS, RECONNECT_MAX_DELAY_MS, MAX_RECONNECT_ATTEMPTS } from "@/contexts/streaming-report";
import type { JobStatusResponse } from "@/lib/job-utils";
import type { FeasibilityReport } from "@/types";

const POLL_INTERVAL_MS = 2000;

interface UseAnalysisReconnectionOptions {
  onReconnected?: () => void;
  onComplete?: (report: FeasibilityReport, slug: string) => void;
  onMaxAttemptsReached?: () => void;
}

export function useAnalysisReconnection(options: UseAnalysisReconnectionOptions = {}) {
  const {
    jobKey,
    connectionState,
    reconnectAttempt,
    setConnectionState,
    setReconnectAttempt,
    updateReport,
    updateProgress,
    completeStreaming,
    setError,
  } = useStreamingReport();

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isReconnectingRef = useRef(false);

  // Calculate delay with exponential backoff and jitter
  const getReconnectDelay = useCallback((attempt: number): number => {
    const baseDelay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 500;
    return Math.min(baseDelay + jitter, RECONNECT_MAX_DELAY_MS);
  }, []);

  // Poll job status endpoint
  const pollJobStatus = useCallback(async (): Promise<JobStatusResponse | null> => {
    if (!jobKey) return null;

    try {
      const response = await fetch(`/api/job/status/${encodeURIComponent(jobKey)}`, {
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { status: "not_found" };
        }
        throw new Error("Failed to fetch job status");
      }

      return await response.json();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }
      console.error("Error polling job status:", err);
      return null;
    }
  }, [jobKey]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll for job completion while reconnected
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      const status = await pollJobStatus();

      if (status?.status === "completed" && status.resultSlug) {
        stopPolling();

        if (status.report) {
          completeStreaming(status.report as FeasibilityReport);
          options.onComplete?.(status.report as FeasibilityReport, status.resultSlug);
        } else {
          // Fetch full report
          try {
            const reportResponse = await fetch(`/api/report/${status.resultSlug}`);
            if (reportResponse.ok) {
              const reportData = (await reportResponse.json()) as { report: FeasibilityReport };
              completeStreaming(reportData.report);
              options.onComplete?.(reportData.report, status.resultSlug);
            }
          } catch (err) {
            console.error("Failed to fetch completed report:", err);
          }
        }
      } else if (status?.status === "failed" || status?.status === "stale") {
        stopPolling();
        setConnectionState("disconnected");
        setError(status.error || "Analysis failed. Please try again.");
      } else if (status?.partialResult) {
        updateReport(status.partialResult as Partial<FeasibilityReport>);
      }
    }, POLL_INTERVAL_MS);
  }, [pollJobStatus, completeStreaming, updateReport, setError, setConnectionState, stopPolling, options]);

  // Start reconnection process
  const startReconnection = useCallback(async () => {
    // Prevent multiple simultaneous reconnection attempts
    if (isReconnectingRef.current) return;
    isReconnectingRef.current = true;

    if (!jobKey || reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionState("disconnected");
      isReconnectingRef.current = false;
      options.onMaxAttemptsReached?.();
      return;
    }

    setConnectionState("reconnecting");
    const attempt = reconnectAttempt + 1;
    setReconnectAttempt(attempt);

    // Check job status
    const status = await pollJobStatus();

    if (!status) {
      // Network still down, schedule retry
      const delay = getReconnectDelay(attempt);
      console.log(`[Reconnect] Attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}, retry in ${delay}ms`);

      isReconnectingRef.current = false;
      reconnectTimeoutRef.current = setTimeout(() => {
        startReconnection();
      }, delay);
      return;
    }

    if (status.status === "completed" && status.resultSlug) {
      // Job finished while we were disconnected!
      setConnectionState("connected");
      setReconnectAttempt(0);
      isReconnectingRef.current = false;

      // Fetch the complete report
      if (status.report) {
        completeStreaming(status.report as FeasibilityReport);
        options.onComplete?.(status.report as FeasibilityReport, status.resultSlug);
      } else {
        // Fetch report from API if not included in status
        try {
          const reportResponse = await fetch(`/api/report/${status.resultSlug}`);
          if (reportResponse.ok) {
            const reportData = (await reportResponse.json()) as { report: FeasibilityReport };
            completeStreaming(reportData.report);
            options.onComplete?.(reportData.report, status.resultSlug);
          }
        } catch (err) {
          console.error("Failed to fetch completed report:", err);
        }
      }
      return;
    }

    if (status.status === "in_progress") {
      // Job still running - update with partial results and start polling
      setConnectionState("connected");
      setReconnectAttempt(0);
      isReconnectingRef.current = false;
      options.onReconnected?.();

      if (status.partialResult) {
        updateReport(status.partialResult as Partial<FeasibilityReport>);
      }
      if (status.progress !== undefined) {
        updateProgress({
          chunks: 0,
          length: 0,
          status: "generating",
        });
      }

      // Start polling for completion
      startPolling();
      return;
    }

    if (status.status === "failed" || status.status === "stale") {
      // Job failed, inform user
      setConnectionState("disconnected");
      isReconnectingRef.current = false;
      setError(status.error || "Analysis failed. Please try again.");
      return;
    }

    if (status.status === "not_found") {
      // Job doesn't exist, need to restart
      setConnectionState("disconnected");
      isReconnectingRef.current = false;
      setError("Analysis session expired. Please start a new analysis.");
      return;
    }

    // Unexpected status, retry
    const delay = getReconnectDelay(attempt);
    isReconnectingRef.current = false;
    reconnectTimeoutRef.current = setTimeout(() => {
      startReconnection();
    }, delay);
  }, [
    jobKey,
    reconnectAttempt,
    pollJobStatus,
    getReconnectDelay,
    setConnectionState,
    setReconnectAttempt,
    completeStreaming,
    updateReport,
    updateProgress,
    setError,
    startPolling,
    options,
  ]);

  // Cancel all pending operations
  const cancelReconnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopPolling();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setReconnectAttempt(0);
    isReconnectingRef.current = false;
  }, [stopPolling, setReconnectAttempt]);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (connectionState === "disconnected" && jobKey) {
        console.log("Browser online, starting reconnection...");
        startReconnection();
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        connectionState === "disconnected" &&
        jobKey
      ) {
        // User came back to tab, try to reconnect
        console.log("Tab visible, starting reconnection...");
        startReconnection();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connectionState, jobKey, startReconnection]);

  // Initialize abort controller and cleanup
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
      cancelReconnection();
    };
  }, [cancelReconnection]);

  return {
    startReconnection,
    cancelReconnection,
    stopPolling,
    isReconnecting: connectionState === "reconnecting",
    reconnectAttempt,
    maxAttempts: MAX_RECONNECT_ATTEMPTS,
  };
}
