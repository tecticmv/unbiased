import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, ArrowLeft, Languages } from "lucide-react";
import { FeasibilityReport } from "@/components/feasibility-report";
import { StreamingReportSkeleton } from "@/components/streaming-report-skeleton";
import { Button } from "@/components/ui/button";
import { getCountry, defaultCountry } from "@/lib/countries";
import { useStreamingReport } from "@/contexts/streaming-report";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import type { FeasibilityReport as FeasibilityReportType, SavedReport } from "@/types";

interface TranslationResponse {
  translated: boolean;
  report?: FeasibilityReportType;
}

export function ReportPage() {
  const { country, slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const countryConfig = getCountry(country || defaultCountry);

  // Streaming state from context
  const {
    report: streamingReport,
    isStreaming,
    isComplete,
    error: streamError,
    reset: resetStreaming,
  } = useStreamingReport();

  // Regular report state for direct URL access
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Translation state
  const [translatedReport, setTranslatedReport] = useState<FeasibilityReportType | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null);

  // Check if we arrived here via streaming navigation
  const isStreamingMode = location.state?.streaming === true;

  // Current language (only translate for non-English)
  const currentLanguage = i18n.language;
  const needsTranslation = currentLanguage !== 'en' && !currentLanguage.startsWith('en-');

  // Fetch translation when language changes or report is available
  const fetchTranslation = useCallback(async (reportSlug: string, lang: string) => {
    if (!reportSlug || reportSlug === "undefined" || !lang || lang === 'en' || lang.startsWith('en-')) {
      setTranslatedReport(null);
      setTranslationLanguage(null);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch(`/api/report/${reportSlug}/translate/${lang}`);
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      const data = (await response.json()) as TranslationResponse;
      if (data.translated && data.report) {
        setTranslatedReport(data.report);
        setTranslationLanguage(lang);
      }
    } catch (err) {
      console.error('Translation error:', err);
      // Silently fail - user will see English version
      setTranslatedReport(null);
      setTranslationLanguage(null);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  useEffect(() => {
    // If we're in streaming mode, don't fetch - wait for streaming to complete
    if (isStreamingMode && (isStreaming || isComplete)) {
      setLoading(false);
      return;
    }

    // If streaming is complete, we already have the report
    if (isComplete && streamingReport) {
      setLoading(false);
      return;
    }

    // Otherwise, fetch the report from API (direct URL access or page refresh)
    async function fetchReport() {
      if (!slug || slug === "undefined") return;

      try {
        const response = await fetch(`/api/report/${slug}`);
        if (!response.ok) {
          throw new Error("Report not found");
        }
        const data = (await response.json()) as SavedReport;
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [slug, isStreamingMode, isStreaming, isComplete, streamingReport]);

  // Fetch translation when language changes or report becomes available
  useEffect(() => {
    // Don't translate while streaming is in progress
    if (isStreamingMode && isStreaming) {
      return;
    }

    // Check if we need translation
    if (!needsTranslation) {
      setTranslatedReport(null);
      setTranslationLanguage(null);
      return;
    }

    // If we already have a translation for this language, skip
    if (translationLanguage === currentLanguage && translatedReport) {
      return;
    }

    // Determine which report to translate from
    const hasReport = (isComplete && streamingReport) || report;
    if (hasReport && slug) {
      fetchTranslation(slug, currentLanguage);
    }
  }, [slug, currentLanguage, needsTranslation, isComplete, streamingReport, report, isStreamingMode, isStreaming, translationLanguage, translatedReport, fetchTranslation]);

  // Handle navigation back
  const handleReset = () => {
    resetStreaming();
    navigate(`/${country}`);
  };

  if (!countryConfig) {
    return <Navigate to={`/${defaultCountry}`} replace />;
  }

  // Handle streaming mode - show skeleton while streaming, swap to report when complete
  // No animation on swap since user already saw content progressively
  if (isStreamingMode) {
    // Show full report when complete
    if (isComplete && streamingReport) {
      // Use translated report if available, otherwise use original
      const displayReport = (needsTranslation && translatedReport)
        ? translatedReport
        : streamingReport as FeasibilityReportType;

      // Get translated project description if available
      const translatedDesc = (translatedReport as Record<string, unknown>)?.translatedProjectDescription as string | undefined;
      const displayProjectDescription = (needsTranslation && translatedDesc)
        ? translatedDesc
        : location.state?.projectDescription;

      return (
        <>
          {isTranslating && (
            <div className="fixed inset-x-0 top-16 z-50 flex justify-center">
              <div className="flex items-center gap-2 rounded-b-lg bg-primary/90 px-6 py-2 text-sm text-primary-foreground shadow-md">
                <Languages className="h-4 w-4 animate-pulse" />
                <span>{t('common.translating')}</span>
              </div>
            </div>
          )}
          <FeasibilityReport
            report={displayReport}
            reportId={slug || null}
            country={countryConfig}
            onReset={handleReset}
            isSharedView={false}
            isJustCompleted={true}
            createdAt={new Date().toISOString()}
            projectDescription={displayProjectDescription}
          />
        </>
      );
    }

    // Show streaming skeleton while generating
    return <StreamingReportSkeleton country={countryConfig} projectDescription={location.state?.projectDescription} />;
  }

  // Show error from streaming
  if (streamError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ScrollReveal className="text-center">
          <h2 className="mb-2 text-2xl font-bold">{t('errors.analysisError')}</h2>
          <p className="mb-6 text-muted-foreground">{streamError}</p>
          <Button onClick={handleReset}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </ScrollReveal>
      </div>
    );
  }

  // Show loading spinner while fetching from API
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ScrollReveal className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </ScrollReveal>
      </div>
    );
  }

  // Show error from API fetch
  if (error || (!report && !streamingReport)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ScrollReveal className="text-center">
          <h2 className="mb-2 text-2xl font-bold">{t('errors.notFound')}</h2>
          <p className="mb-6 text-muted-foreground">
            {error || t('errors.generic')}
          </p>
          <Button asChild>
            <Link to={`/${country}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('report.newAnalysis')}
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    );
  }

  // Direct URL access or streaming completed without streaming mode flag
  // Use translated report if available, otherwise use original (prefer streamingReport if available)
  const baseReport = (isComplete && streamingReport)
    ? streamingReport as FeasibilityReportType
    : report?.report as FeasibilityReportType;
  const displayReport = (needsTranslation && translatedReport)
    ? translatedReport
    : baseReport;

  // Get translated project description if available
  const translatedDesc = (translatedReport as Record<string, unknown>)?.translatedProjectDescription as string | undefined;
  const baseProjectDescription = (isComplete && streamingReport)
    ? location.state?.projectDescription
    : report?.projectDescription;
  const displayProjectDescription = (needsTranslation && translatedDesc)
    ? translatedDesc
    : baseProjectDescription;

  return (
    <>
      {isTranslating && (
        <div className="fixed inset-x-0 top-16 z-50 flex justify-center">
          <div className="flex items-center gap-2 rounded-b-lg bg-primary/90 px-6 py-2 text-sm text-primary-foreground shadow-md">
            <Languages className="h-4 w-4 animate-pulse" />
            <span>{t('common.translating')}</span>
          </div>
        </div>
      )}
      <FeasibilityReport
        report={displayReport}
        reportId={report?.id || slug || null}
        country={countryConfig}
        onReset={handleReset}
        isSharedView={!isComplete || !!report}
        isJustCompleted={isComplete && !report}
        createdAt={report?.createdAt || (isComplete ? new Date().toISOString() : undefined)}
        projectDescription={displayProjectDescription}
      />
    </>
  );
}
