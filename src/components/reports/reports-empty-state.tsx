import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { defaultCountry } from "@/lib/countries";

interface ReportsEmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
}

export function ReportsEmptyState({
  hasFilters,
  onClearFilters,
}: ReportsEmptyStateProps) {
  const { t } = useTranslation();
  const { country } = useParams();
  const countrySlug = country || defaultCountry;

  if (hasFilters) {
    return (
      <ScrollReveal className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 py-16 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {t('common.noResults') || 'No results found'}
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {t('common.noResultsDescription') || 'Try adjusting your search or filters to find what you\'re looking for.'}
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            {t('common.clearFilters') || 'Clear filters'}
          </Button>
        )}
      </ScrollReveal>
    );
  }

  return (
    <ScrollReveal className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 py-16 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {t('common.noReportsYet') || 'No reports yet'}
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {t('analysis.form.description')}
      </p>
      <Button asChild className="gap-2">
        <Link to={`/${countrySlug}/new`}>
          <Plus className="h-4 w-4" />
          {t('report.newAnalysis')}
        </Link>
      </Button>
    </ScrollReveal>
  );
}
