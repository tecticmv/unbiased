import { useState, useCallback } from "react";
import type { AnalysisRequest, FeasibilityReport } from "@/types";

interface AnalysisResponse {
  success: boolean;
  report?: FeasibilityReport;
  reportId?: string;
  error?: string;
}

interface UseAnalysisReturn {
  isLoading: boolean;
  error: string | null;
  report: FeasibilityReport | null;
  reportId: string | null;
  analyze: (data: AnalysisRequest) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FeasibilityReport | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const analyze = useCallback(async (data: AnalysisRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as AnalysisResponse;

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      if (result.report) {
        setReport(result.report);
      }
      if (result.reportId) {
        setReportId(result.reportId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setReportId(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    report,
    reportId,
    analyze,
    reset,
  };
}
