import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountry, defaultCountry } from "@/lib/countries";
import { ReportsFilters, ReportsList, ReportsEmptyState } from "@/components/reports";
import type { FeasibilityReport as FeasibilityReportType, ProjectCategory } from "@/types";

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

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ReportsResponse {
  reports: SavedReportData[];
  pagination: PaginationInfo;
}

export function CountryPage() {
  const { country } = useParams();
  const { t, i18n } = useTranslation();
  const countryConfig = getCountry(country || defaultCountry);
  const [reports, setReports] = useState<SavedReportData[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | null>(null);

  // Track current language for re-fetch
  const currentLang = i18n.language;

  // Debounced search query for API calls
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isFirstRender = useRef(true);

  // Debounce search input
  useEffect(() => {
    // Skip resetting page on initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
      setReports([]); // Clear reports when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset when category changes
  useEffect(() => {
    if (!isFirstRender.current) {
      setCurrentPage(1);
      setReports([]);
    }
  }, [selectedCategory]);

  // Fetch reports when page, language, country, search, or category changes
  const fetchReports = useCallback(async (page: number, lang: string, search: string, category: ProjectCategory | null, append: boolean = false) => {
    if (!countryConfig) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        lang,
        page: String(page),
        limit: "12",
      });
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (category) {
        params.append("category", category);
      }
      const response = await fetch(
        `/api/reports/${countryConfig.slug}?${params.toString()}`
      );
      if (response.ok) {
        const data = (await response.json()) as ReportsResponse;
        if (append) {
          setReports(prev => [...prev, ...data.reports]);
        } else {
          setReports(data.reports);
        }
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setIsLoading(false);
    }
  }, [countryConfig]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    if (countryConfig) {
      const append = currentPage > 1;
      fetchReports(currentPage, currentLang, debouncedSearch, selectedCategory, append);
    }
  }, [countryConfig?.slug, currentLang, currentPage, debouncedSearch, selectedCategory, fetchReports]);

  const handleCategoryChange = (category: ProjectCategory | null) => {
    setSelectedCategory(category);
  };

  const handleLoadMore = () => {
    if (pagination?.hasNextPage && !isLoading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setDebouncedSearch("");
    setCurrentPage(1);
    setReports([]);
  };

  if (!countryConfig) {
    return <Navigate to={`/${defaultCountry}`} replace />;
  }

  const hasFilters = searchQuery.trim() !== "" || selectedCategory !== null;
  const hasMore = pagination?.hasNextPage ?? false;
  const totalCount = pagination?.totalCount ?? 0;

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <section className="py-12 md:py-16">
          <div className="container">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold md:text-3xl">
                    {t('nav.reports')}
                  </h2>
                  <p className="text-muted-foreground">
                    {totalCount === 0 && !hasFilters
                      ? t('home.countries.description')
                      : `${totalCount} ${totalCount === 1 ? t('common.project').toLowerCase() : t('common.project').toLowerCase() + 's'}`}
                  </p>
                </div>
                <Button
                  size="lg"
                  asChild
                  className="gap-2"
                >
                  <Link to={`/${countryConfig.slug}/new`}>
                    <Plus className="h-5 w-5" />
                    {t('report.newAnalysis')}
                  </Link>
                </Button>
              </div>

              {/* Filters */}
              <ReportsFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
              />
            </div>

            {/* Content */}
            {reports.length === 0 && !isLoading ? (
              <ReportsEmptyState
                hasFilters={hasFilters}
                onClearFilters={hasFilters ? handleClearFilters : undefined}
              />
            ) : (
              <ReportsList
                reports={reports}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
              />
            )}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
