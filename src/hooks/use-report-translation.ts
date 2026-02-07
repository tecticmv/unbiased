import { useState, useEffect, useRef } from "react";
import type { FeasibilityReport } from "@/lib/schemas";

interface UseReportTranslationResult {
  translatedReport: Partial<FeasibilityReport> | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useReportTranslation(
  reportId: string | null,
  language: string
): UseReportTranslationResult {
  const [translatedReport, setTranslatedReport] = useState<Partial<FeasibilityReport> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTranslation = async () => {
    // Skip if English or no reportId
    if (language === 'en' || !reportId) {
      setTranslatedReport(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // Call translation API
      const response = await fetch(
        `/api/report/${reportId}/translate/${language}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();

      // Handle different response states
      if (data.status === 'completed' && data.translation) {
        setTranslatedReport(data.translation);
        setIsLoading(false);
      } else if (data.status === 'in_progress') {
        // Poll for completion
        await pollForCompletion(reportId, language);
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Translation failed');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load translation');
        setIsLoading(false);
      }
    }
  };

  const pollForCompletion = async (slug: string, lang: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const delay = attempts < 5 ? 2000 : 5000;
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        const response = await fetch(
          `/api/translation/status/report/${slug}/${lang}`,
          { signal: abortControllerRef.current?.signal }
        );

        if (!response.ok) throw new Error('Status check failed');

        const data = await response.json();

        if (data.status === 'completed' && data.translation) {
          setTranslatedReport(data.translation);
          setIsLoading(false);
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Translation failed');
        }

        attempts++;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Translation timed out');
        setIsLoading(false);
        return;
      }
    }

    setError('Translation timed out');
    setIsLoading(false);
  };

  const retry = () => {
    fetchTranslation();
  };

  useEffect(() => {
    fetchTranslation();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, language]);

  return { translatedReport, isLoading, error, retry };
}
