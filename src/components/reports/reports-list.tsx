import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { ReportCard } from "@/components/report-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import type { FeasibilityReport as FeasibilityReportType } from "@/types";

interface SavedReportData {
  slug: string;
  country: string;
  projectDescription: string;
  location?: string | null;
  projectType?: string | null;
  estimatedCost?: number | null;
  report: FeasibilityReportType;
  createdAt: string;
  hasTranslation?: boolean;
  needsTranslation?: boolean;
  translatedProjectType?: string;
  translatedSummary?: string;
}

interface ReportsListProps {
  reports: SavedReportData[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function ReportsList({
  reports,
  isLoading,
  hasMore,
  onLoadMore,
}: ReportsListProps) {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll using Intersection Observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  return (
    <div className="space-y-6">
      {/* Reports Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report, index) => (
          <ScrollReveal key={report.slug} delay={Math.min(index * 0.05, 0.3)} className="h-full">
            <ReportCard {...report} index={index} />
          </ScrollReveal>
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="flex justify-center py-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t('common.loadingMore')}</span>
          </div>
        )}
        {!hasMore && reports.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t('common.noMoreReports')}
          </p>
        )}
      </div>
    </div>
  );
}
