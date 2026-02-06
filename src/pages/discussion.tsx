import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, ArrowLeft, Languages } from "lucide-react";
import { PanelDiscussion } from "@/components/discussion";
import { Button } from "@/components/ui/button";
import { getCountry, defaultCountry } from "@/lib/countries";
import type { FeasibilityReport, SavedReport } from "@/types";

interface TranslationResponse {
  translated: boolean;
  report?: FeasibilityReport;
}

export function DiscussionPage() {
  const { country, slug } = useParams();
  const { t, i18n } = useTranslation();
  const countryConfig = getCountry(country || defaultCountry);

  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Translation state
  const [translatedReport, setTranslatedReport] = useState<FeasibilityReport | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null);

  // Current language (only translate for non-English)
  const currentLanguage = i18n.language;
  const needsTranslation = currentLanguage !== 'en' && !currentLanguage.startsWith('en-');

  // Fetch translation
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
      setTranslatedReport(null);
      setTranslationLanguage(null);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  useEffect(() => {
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
  }, [slug]);

  // Fetch translation when language changes or report becomes available
  useEffect(() => {
    if (!needsTranslation) {
      setTranslatedReport(null);
      setTranslationLanguage(null);
      return;
    }

    if (translationLanguage === currentLanguage && translatedReport) {
      return;
    }

    if (report && slug) {
      fetchTranslation(slug, currentLanguage);
    }
  }, [slug, currentLanguage, needsTranslation, report, translationLanguage, translatedReport, fetchTranslation]);

  if (!countryConfig) {
    return <Navigate to={`/${defaultCountry}`} replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t('report.discussion.loadingReport')}</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">{t('errors.reportNotFound')}</h2>
          <p className="mb-6 text-muted-foreground">
            {error || t('errors.reportNotFoundDescription')}
          </p>
          <Button asChild>
            <Link to={`/${country}`}>
              <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
              {t('report.newAnalysis')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Use translated report if available
  const displayReport = (needsTranslation && translatedReport)
    ? translatedReport
    : report.report as FeasibilityReport;

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
      <PanelDiscussion
        reportSlug={slug || ""}
        report={displayReport}
        country={countryConfig}
        projectDescription={report.projectDescription}
      />
    </>
  );
}
