import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { FeasibilityReport } from "@/types";

export interface RejectionData {
  reason: string;
  rejectionType: string;
  suggestion: string;
}

interface StreamingProgress {
  chunks: number;
  length: number;
  status: string;
}

// Connection state for reconnection logic
export type StreamingConnectionState = "connected" | "connecting" | "reconnecting" | "disconnected";

// Reconnection constants
export const RECONNECT_BASE_DELAY_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 30000;
export const MAX_RECONNECT_ATTEMPTS = 10;

interface StreamingReportContextType {
  report: Partial<FeasibilityReport> | null;
  slug: string | null;
  isStreaming: boolean;
  isComplete: boolean;
  isValidating: boolean;
  isRejected: boolean;
  rejection: RejectionData | null;
  error: string | null;
  progress: StreamingProgress | null;
  // Reconnection state
  connectionState: StreamingConnectionState;
  reconnectAttempt: number;
  jobKey: string | null;
  // Existing methods
  startValidating: () => void;
  startStreaming: (slug: string) => void;
  updateReport: (data: Partial<FeasibilityReport>) => void;
  updateProgress: (progress: StreamingProgress) => void;
  completeStreaming: (finalReport: FeasibilityReport) => void;
  setRejection: (rejection: RejectionData) => void;
  setError: (error: string) => void;
  reset: () => void;
  // Reconnection methods
  setJobKey: (key: string) => void;
  setConnectionState: (state: StreamingConnectionState) => void;
  setReconnectAttempt: (attempt: number) => void;
}

const StreamingReportContext = createContext<StreamingReportContextType | null>(null);

export function StreamingReportProvider({ children }: { children: ReactNode }) {
  const [report, setReport] = useState<Partial<FeasibilityReport> | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [rejection, setRejectionState] = useState<RejectionData | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [progress, setProgress] = useState<StreamingProgress | null>(null);
  // Reconnection state
  const [connectionState, setConnectionStateValue] = useState<StreamingConnectionState>("disconnected");
  const [reconnectAttempt, setReconnectAttemptValue] = useState(0);
  const [jobKey, setJobKeyValue] = useState<string | null>(null);

  const startValidating = useCallback(() => {
    // Clear previous report data to prevent stale data from showing
    setReport(null);
    setSlug(null);
    setIsComplete(false);
    setProgress(null);
    // Set validation state
    setIsValidating(true);
    setIsRejected(false);
    setRejectionState(null);
    setErrorState(null);
  }, []);

  const startStreaming = useCallback((newSlug: string) => {
    setSlug(newSlug);
    setIsValidating(false);
    setIsStreaming(true);
    setIsComplete(false);
    setReport(null);
    setErrorState(null);
    setProgress(null);
  }, []);

  const updateReport = useCallback((data: Partial<FeasibilityReport>) => {
    setReport((prev) => {
      // Helper for recursive deep merge
      const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
        const result = { ...target };
        for (const key of Object.keys(source)) {
          const sourceVal = source[key];
          const targetVal = target[key];

          // Arrays - append new items (backend sends only new items)
          if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
            result[key] = [...targetVal, ...sourceVal];
          }
          // Nested objects - recursive merge
          else if (
            sourceVal !== null &&
            typeof sourceVal === "object" &&
            !Array.isArray(sourceVal) &&
            targetVal !== null &&
            typeof targetVal === "object" &&
            !Array.isArray(targetVal)
          ) {
            result[key] = deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
          }
          // Primitives or new values - use source
          else {
            result[key] = sourceVal;
          }
        }
        return result;
      };

      if (!prev) {
        return data as Partial<FeasibilityReport>;
      }

      return deepMerge(prev as Record<string, unknown>, data as Record<string, unknown>) as Partial<FeasibilityReport>;
    });
  }, []);

  const updateProgress = useCallback((progressData: StreamingProgress) => {
    setProgress(progressData);
  }, []);

  const completeStreaming = useCallback((finalReport: FeasibilityReport) => {
    setReport(finalReport);
    setIsStreaming(false);
    setIsComplete(true);
  }, []);

  const setRejection = useCallback((rejectionData: RejectionData) => {
    setRejectionState(rejectionData);
    setIsValidating(false);
    setIsStreaming(false);
    setIsRejected(true);
  }, []);

  const setError = useCallback((err: string) => {
    setErrorState(err);
    setIsValidating(false);
    setIsStreaming(false);
  }, []);

  // Reconnection methods
  const setJobKey = useCallback((key: string) => {
    setJobKeyValue(key);
  }, []);

  const setConnectionState = useCallback((state: StreamingConnectionState) => {
    setConnectionStateValue(state);
  }, []);

  const setReconnectAttempt = useCallback((attempt: number) => {
    setReconnectAttemptValue(attempt);
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setSlug(null);
    setIsStreaming(false);
    setIsComplete(false);
    setIsValidating(false);
    setIsRejected(false);
    setRejectionState(null);
    setErrorState(null);
    setProgress(null);
    // Reset reconnection state
    setConnectionStateValue("disconnected");
    setReconnectAttemptValue(0);
    setJobKeyValue(null);
  }, []);

  return (
    <StreamingReportContext.Provider
      value={{
        report,
        slug,
        isStreaming,
        isComplete,
        isValidating,
        isRejected,
        rejection,
        error,
        progress,
        // Reconnection state
        connectionState,
        reconnectAttempt,
        jobKey,
        // Methods
        startValidating,
        startStreaming,
        updateReport,
        updateProgress,
        completeStreaming,
        setRejection,
        setError,
        reset,
        // Reconnection methods
        setJobKey,
        setConnectionState,
        setReconnectAttempt,
      }}
    >
      {children}
    </StreamingReportContext.Provider>
  );
}

export function useStreamingReport() {
  const context = useContext(StreamingReportContext);
  if (!context) {
    throw new Error("useStreamingReport must be used within StreamingReportProvider");
  }
  return context;
}
