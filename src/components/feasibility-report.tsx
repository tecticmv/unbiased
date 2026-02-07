import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Share2,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Info,
  ChevronDown,
  ChevronUp,
  Banknote,
  MapPin,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Calendar,
  Clock,
  Timer,
  Landmark,
  Building2,
  TrendingUp,
  Wallet,
  BarChart3,
  FileText,
  Target,
  Sparkles,
  BookOpen,
  List,
  ExternalLink,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback, type ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreGauge } from "@/components/score-gauge";
import { BreakdownChart } from "@/components/breakdown-chart";
import { CategoryCard } from "@/components/category-card";
import { Markdown, MarkdownBlock } from "@/components/ui/markdown";
import type { CountryConfig } from "@/lib/countries";
import type { FeasibilityReport as FeasibilityReportType, CategoryKey } from "@/types";
import { categoryLabels } from "@/types";

// Divider component
function Divider() {
  return <div className="border-t border-border/60 my-10 md:my-14" />;
}

// Section Header component
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  id,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div id={id} className="flex items-center gap-4 mb-8 scroll-mt-20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground leading-none">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Animated progress bar
function AnimatedProgressBar({ value, index, color }: { value: number; index: number; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <div ref={ref} className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <motion.div
        className={`h-full rounded-full ${color || "bg-primary"}`}
        initial={{ width: 0 }}
        animate={{ width: isVisible ? `${value}%` : 0 }}
        transition={{
          duration: 0.8,
          delay: index * 0.1,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      />
    </div>
  );
}

// Stat card for financial/timeframe sections
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  variant = "default",
}: {
  icon: ElementType;
  label: string;
  value: string;
  sublabel?: string;
  variant?: "default" | "primary";
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      variant === "primary"
        ? "bg-primary/5 border-primary/20"
        : "bg-card"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          variant === "primary" ? "bg-primary/10" : "bg-muted"
        }`}>
          <Icon className={`h-5 w-5 ${variant === "primary" ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold truncate">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

interface FeasibilityReportProps {
  report: FeasibilityReportType;
  reportId: string | null;
  country: CountryConfig;
  onReset: () => void;
  isSharedView?: boolean;
  isJustCompleted?: boolean;
  createdAt?: string;
  projectDescription?: string;
}

const scrollVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

function formatCost(amount: number | null | undefined, currency: string): string {
  if (amount == null) {
    return `${currency} N/A`;
  }
  if (amount >= 1_000_000_000) {
    return `${currency} ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${currency} ${(amount / 1_000).toFixed(1)}K`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

export function FeasibilityReport({
  report,
  reportId,
  country,
  onReset,
  isSharedView = false,
  isJustCompleted: _isJustCompleted = false,
  createdAt,
  projectDescription,
}: FeasibilityReportProps) {
  const { t, i18n } = useTranslation();
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [showAllReferences, setShowAllReferences] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    const sections = document.querySelectorAll("[data-toc-section]");
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const formattedDate = useMemo(() => {
    const dateToFormat = createdAt ? new Date(createdAt) : new Date();
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateToFormat);
  }, [createdAt, i18n.language]);

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return t('score.highlyFeasible');
    if (score >= 60) return t('score.moderatelyFeasible');
    if (score >= 40) return t('score.challenging');
    if (score >= 20) return t('score.difficult');
    return t('score.notRecommended');
  };

  const viewportSettings = { once: true, margin: "-50px" };

  const shareUrl = reportId
    ? `${window.location.origin}/${country.slug}/report/${reportId}`
    : null;

  const handleShare = async () => {
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Feasibility Report",
          text: `Project feasibility analysis: ${report.overallSummary}`,
          url: shareUrl,
        });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    alert(t('ui.linkCopied'));
  };

  const categoryKeys = Object.keys(report.categories) as (keyof typeof report.categories)[];
  const hasLocationSuggestions =
    report.location.suggested && report.location.suggested.length > 0;
  const hasCostBreakdown =
    report.estimatedCost.breakdown && report.estimatedCost.breakdown.length > 0;

  const tocEntries = useMemo(() => {
    const entries: { id: string; label: string; icon: ElementType }[] = [];
    if (report.budgetRatio || hasCostBreakdown) {
      entries.push({ id: "financial", label: t('report.sections.financial', 'Financial Analysis'), icon: Wallet });
    }
    if (report.timeframe) {
      entries.push({ id: "timeframe", label: t('report.timeframe.title'), icon: Clock });
    }
    if (hasLocationSuggestions) {
      entries.push({ id: "locations", label: t('report.suggestedLocations'), icon: MapPin });
    }
    entries.push({ id: "categories", label: t('report.categories.title'), icon: BarChart3 });
    entries.push({ id: "action-items", label: t('report.sections.actionItems', 'Action Items'), icon: Target });
    if (report.alternativeProject) {
      entries.push({ id: "alternative", label: t('report.alternative.title'), icon: Sparkles });
    }
    return entries;
  }, [report, hasCostBreakdown, hasLocationSuggestions, t]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  };

  return (
    <div className="py-8 md:py-12">
      <div className="container max-w-4xl">

        {/* ============================================================== */}
        {/*  HEADER                                                        */}
        {/* ============================================================== */}
        <motion.div
          className="mb-8"
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
        >
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
            <span className="inline-flex items-center gap-1.5 uppercase tracking-widest font-medium">
              <FileText className="h-3.5 w-3.5" />
              Feasibility Report
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {country.name}
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold sm:text-3xl md:text-[2.75rem] tracking-tight leading-[1.15] text-foreground">
            {(report as Record<string, unknown>).translatedProjectType as string || report.detectedProjectType}
          </h1>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-5">
            {reportId && (
              <Button variant="outline" size="sm" className="gap-2 rounded-lg" asChild>
                <Link to={`/${country.slug}/report/${reportId}/discussion`}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="sm:inline">{t('report.discussion.discuss')}</span>
                </Link>
              </Button>
            )}
            {shareUrl && (
              <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" />
                <span className="sm:inline">{t('report.share')}</span>
              </Button>
            )}
            {!isSharedView && (
              <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={onReset}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="sm:inline">{t('report.newAnalysis')}</span>
              </Button>
            )}
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/*  PROJECT DESCRIPTION                                           */}
        {/* ============================================================== */}
        {projectDescription && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-8"
          >
            <div className="rounded-xl bg-muted/40 border border-border/50 px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('report.analyzedRequest')}
              </p>
              <p className="text-[15px] text-foreground/80 leading-[1.75] italic">
                &ldquo;{projectDescription}&rdquo;
              </p>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  VERDICT & OVERALL SCORE                                       */}
        {/* ============================================================== */}
        <motion.div
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="mb-6"
        >
          <div className={`rounded-2xl border-2 overflow-hidden ${
            report.verdict?.recommendation === "yes"
              ? "border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20"
              : report.verdict?.recommendation === "no"
                ? "border-red-500/30 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20"
                : "border-border"
          }`}>
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {/* Score Gauge */}
                <div className="shrink-0 flex justify-center sm:justify-start">
                  <ScoreGauge score={report.overallScore} size={130} />
                </div>

                {/* Verdict Details */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  {report.verdict && (
                    <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                        {t('report.verdict.title')}
                      </span>
                      <Badge
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          report.verdict.recommendation === "yes"
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                            : "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/20"
                        }`}
                      >
                        {report.verdict.recommendation === "yes" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {report.verdict.recommendation === "yes"
                          ? t('common.yes').toUpperCase()
                          : t('common.no').toUpperCase()}
                      </Badge>
                    </div>
                  )}

                  <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${getScoreColor(report.overallScore)}`}>
                    {getScoreLabel(report.overallScore)}
                  </div>

                  <div className="text-sm text-muted-foreground leading-[1.8] max-w-2xl">
                    <MarkdownBlock>{report.overallSummary ?? ''}</MarkdownBlock>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/*  TABLE OF CONTENTS                                             */}
        {/* ============================================================== */}
        {tocEntries.length > 2 && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-6"
          >
            <button
              onClick={() => setShowToc(!showToc)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <List className="h-4 w-4" />
              <span>{t('report.toc', 'Jump to section')}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showToc ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showToc && (
                <motion.nav
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 rounded-xl border bg-card p-3">
                    <div className="grid gap-1 sm:grid-cols-2">
                      {tocEntries.map((entry) => {
                        const EntryIcon = entry.icon;
                        return (
                          <a
                            key={entry.id}
                            href={`#${entry.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted ${
                              activeSection === entry.id
                                ? "bg-primary/8 text-primary font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            <EntryIcon className="h-4 w-4 shrink-0" />
                            <span>{entry.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </motion.nav>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <Divider />

        {/* ============================================================== */}
        {/*  FINANCIAL ANALYSIS                                            */}
        {/* ============================================================== */}
        {(report.budgetRatio || hasCostBreakdown) && (
          <>
            <motion.div
              data-toc-section
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
              id="financial"
            >
              <SectionHeader
                icon={Wallet}
                id="financial"
                title={t('report.sections.financial', 'Financial Analysis')}
                subtitle={t('report.sections.financialDesc', 'Budget impact and cost breakdown')}
              />

              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Budget Impact top section */}
                {report.budgetRatio && (
                  <>
                    <div className="p-5">
                      {/* Key figures row */}
                      <div className="grid grid-cols-2 gap-4 mb-5 sm:grid-cols-3">
                        <div>
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetRatio.projectCost')}</span>
                          <p className="text-base sm:text-lg font-bold mt-1 text-foreground truncate">
                            {formatCost(report.budgetRatio.projectCostMidpoint, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetRatio.totalBudget')}</span>
                          <p className="text-base sm:text-lg font-bold mt-1 text-foreground truncate">
                            {formatCost(report.budgetRatio.countryTotalBudget, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                          </p>
                          {report.budgetRatio.fiscalYear && (
                            <span className="text-[11px] text-muted-foreground">{report.budgetRatio.fiscalYear}</span>
                          )}
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetRatio.title')}</span>
                          <p className={`text-base sm:text-lg font-bold mt-1 ${
                            report.budgetRatio.percentageOfBudget > 10 ? "text-red-500"
                              : report.budgetRatio.percentageOfBudget > 5 ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                            {report.budgetRatio.percentageOfBudget < 0.01
                              ? "<0.01"
                              : report.budgetRatio.percentageOfBudget.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* Budget ratio bar */}
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              report.budgetRatio.percentageOfBudget > 10 ? "bg-red-500"
                                : report.budgetRatio.percentageOfBudget > 5 ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(report.budgetRatio.percentageOfBudget, 100)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {t('report.budgetRatio.projectCost')} as percentage of national budget
                        </p>
                      </div>
                    </div>

                    {/* Sector classification */}
                    {(report.budgetAlignment?.expenditureClassification || report.budgetAlignment?.entityBudget?.hasEntityAllocation) && (
                      <>
                        <div className="border-t" />
                        <div className="p-5 space-y-4">
                          {report.budgetAlignment?.expenditureClassification && (
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetAlignment.cofogCategory', 'Expenditure Classification')}</span>
                                <p className="text-sm font-semibold mt-1">{report.budgetAlignment.expenditureClassification.cofogCategory}</p>
                              </div>
                              {report.budgetAlignment.expenditureClassification.sectorBudget && (
                                <div>
                                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetAlignment.sectorBudget', 'Sector Budget')}</span>
                                  <p className="text-sm font-semibold mt-1">
                                    {formatCost(report.budgetAlignment.expenditureClassification.sectorBudget, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sector percentage bar */}
                          {report.budgetAlignment?.expenditureClassification?.percentageOfSectorBudget !== undefined && (
                            <div className="rounded-lg bg-muted/40 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground font-medium">Project % of Sector</span>
                                <span className={`text-sm font-bold tabular-nums ${
                                  report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 20 ? "text-red-500"
                                    : report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 10 ? "text-amber-500"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}>
                                  {report.budgetAlignment.expenditureClassification.percentageOfSectorBudget.toFixed(2)}%
                                </span>
                              </div>
                              <AnimatedProgressBar
                                value={Math.min(report.budgetAlignment.expenditureClassification.percentageOfSectorBudget, 100)}
                                index={0}
                                color={
                                  report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 20 ? "bg-red-500"
                                    : report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 10 ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }
                              />
                            </div>
                          )}

                          {/* Entity Budget */}
                          {report.budgetAlignment?.entityBudget?.hasEntityAllocation && (
                            <div className="rounded-lg bg-muted/40 p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetAlignment.entityAllocation', 'Entity Budget')}</span>
                                  <p className="text-sm font-semibold mt-0.5">{report.budgetAlignment.entityBudget.entityName}</p>
                                </div>
                                {report.budgetAlignment.entityBudget.allocatedBudget && (
                                  <span className="text-sm font-bold tabular-nums">
                                    {formatCost(report.budgetAlignment.entityBudget.allocatedBudget, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                                  </span>
                                )}
                              </div>
                              {report.budgetAlignment.entityBudget.fiscalPolicyReference && (
                                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                                  {report.budgetAlignment.entityBudget.fiscalPolicyReference}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Cost Breakdown */}
                {hasCostBreakdown && (
                  <>
                    {report.budgetRatio && <div className="border-t" />}
                    <div className="p-5">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t('report.costBreakdown')}</span>
                      <div className="mt-4 space-y-3.5">
                        {report.estimatedCost.breakdown!.map((item, index) => (
                          <div key={index} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.item}</span>
                              <span className="font-semibold tabular-nums">{item.percentage}%</span>
                            </div>
                            <AnimatedProgressBar value={item.percentage} index={index} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
            <Divider />
          </>
        )}

        {/* ============================================================== */}
        {/*  TIMEFRAME                                                     */}
        {/* ============================================================== */}
        {report.timeframe && (
          <>
            <motion.div
              data-toc-section
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
              id="timeframe"
            >
              <SectionHeader
                icon={Clock}
                id="timeframe"
                title={t('report.timeframe.title')}
                subtitle={t('report.sections.timeframeDesc', 'Project duration and administration analysis')}
              />

              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Duration timeline bar */}
                <div className="p-5 pb-4">
                  <div className="flex items-baseline justify-between mb-5">
                    <div>
                      <span className="text-3xl font-bold tracking-tight text-foreground">{report.timeframe.estimatedDuration.mostLikely}</span>
                      <span className="text-sm text-muted-foreground ml-1.5">{t('report.timeframe.months')}</span>
                    </div>
                    {report.timeframe.riskOfDelay && (
                      <Badge
                        className={`text-[11px] font-medium ${
                          report.timeframe.riskOfDelay === "low"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : report.timeframe.riskOfDelay === "medium"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
                        }`}
                      >
                        {t(`report.timeframe.risk.${report.timeframe.riskOfDelay}`, { defaultValue: report.timeframe.riskOfDelay })} {t('report.timeframe.delayRisk').toLowerCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Range visualization */}
                  <div className="relative">
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
                    {(() => {
                      const min = report.timeframe.estimatedDuration.minimum;
                      const max = report.timeframe.estimatedDuration.maximum;
                      const est = report.timeframe.estimatedDuration.mostLikely;
                      const range = max * 1.15;
                      const leftPct = (min / range) * 100;
                      const widthPct = ((max - min) / range) * 100;
                      const estPct = (est / range) * 100;
                      return (
                        <>
                          <div
                            className="absolute top-0 h-2 rounded-full bg-primary/25"
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          />
                          <div
                            className="absolute top-0 h-2 rounded-l-full bg-primary"
                            style={{ left: `${leftPct}%`, width: `${estPct - leftPct}%` }}
                          />
                          <div
                            className="absolute -top-1 h-4 w-1 rounded-full bg-primary shadow-sm"
                            style={{ left: `${estPct}%` }}
                          />
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px] text-muted-foreground">{report.timeframe.estimatedDuration.minimum} {t('report.timeframe.months')}</span>
                    <span className="text-[11px] text-muted-foreground">{report.timeframe.estimatedDuration.maximum} {t('report.timeframe.months')}</span>
                  </div>
                </div>

                <div className="border-t" />

                {/* Admin completion + Delay factors */}
                <div className="p-5 space-y-4">
                  {/* Admin term */}
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                      report.timeframe.canCurrentAdminComplete
                        ? "bg-emerald-500/15"
                        : "bg-amber-500/15"
                    }`}>
                      {report.timeframe.canCurrentAdminComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div>
                      <span className={`text-sm font-semibold ${
                        report.timeframe.canCurrentAdminComplete
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}>
                        {report.timeframe.canCurrentAdminComplete
                          ? t('report.timeframe.canComplete')
                          : t('report.timeframe.cannotComplete')}
                      </span>
                      <div className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                        <Markdown>{report.timeframe.adminTermAnalysis ?? ''}</Markdown>
                      </div>
                    </div>
                  </div>

                  {/* Delay factors */}
                  {report.timeframe.delayFactors && report.timeframe.delayFactors.length > 0 && (
                    <div className="rounded-lg bg-muted/40 p-4">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t('report.timeframe.delayFactors')}</span>
                      <ul className="mt-2.5 space-y-2">
                        {report.timeframe.delayFactors.slice(0, 3).map((factor, index) => (
                          <li key={index} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <Markdown>{factor ?? ''}</Markdown>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            <Divider />
          </>
        )}

        {/* ============================================================== */}
        {/*  SUGGESTED LOCATIONS                                           */}
        {/* ============================================================== */}
        {hasLocationSuggestions && (
          <>
            <motion.div
              data-toc-section
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
              id="locations"
            >
              <SectionHeader
                icon={MapPin}
                id="locations"
                title={t('report.suggestedLocations')}
                subtitle={t('report.sections.locationDesc', 'Recommended implementation sites')}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.location.suggested!.map((loc, index) => (
                  <div key={index} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-sm font-semibold">{loc.name}</span>
                        <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          <Markdown>{loc.reason ?? ''}</Markdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <Divider />
          </>
        )}

        {/* ============================================================== */}
        {/*  DETAILED ANALYSIS                                             */}
        {/* ============================================================== */}
        <motion.div
          data-toc-section
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          id="categories"
        >
          <SectionHeader
            icon={BarChart3}
            id="categories"
            title={t('report.categories.title')}
            subtitle={t('report.sections.categoriesDesc', 'Score breakdown by category')}
          />

          {/* Breakdown Chart */}
          <div className="rounded-xl border bg-card p-5 mb-6">
            <BreakdownChart categories={report.categories} />
          </div>

          {/* Category Tabs */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b bg-muted/20 px-5 py-4">
              <h3 className="text-sm font-semibold">{t('analysis.title')}</h3>
            </div>
            <div className="p-5">
              <Tabs defaultValue="technical" className="w-full">
                <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1.5 bg-transparent p-0 sm:grid-cols-6">
                  {categoryKeys.map((key) => {
                    const category = report.categories[key];
                    if (!category?.score) return null;
                    const label = categoryLabels[key as CategoryKey] || key;
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="rounded-lg border bg-card px-3.5 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm hover:bg-muted/50"
                      >
                        {(category.name || label).split(" ")[0]}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {categoryKeys.map((key) => {
                  const category = report.categories[key];
                  if (!category?.score) return null;
                  const categoryWithName = {
                    ...category,
                    name: category.name || categoryLabels[key as CategoryKey] || key,
                  };
                  return (
                    <TabsContent key={key} value={key} className="mt-0">
                      <CategoryCard category={categoryWithName} />
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </div>
        </motion.div>

        <Divider />

        {/* ============================================================== */}
        {/*  RISKS & NEXT STEPS                                            */}
        {/* ============================================================== */}
        <motion.div
          data-toc-section
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          id="action-items"
        >
          <SectionHeader
            icon={Target}
            id="action-items"
            title={t('report.sections.actionItems', 'Action Items')}
            subtitle={t('report.sections.actionItemsDesc', 'Key risks to address and recommended next steps')}
          />
          <div className="grid gap-5 md:grid-cols-2">
            {/* Key Risks */}
            <div className="rounded-xl border border-red-500/15 bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/10 bg-red-500/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <h3 className="text-sm font-semibold">{t('report.risks.title')}</h3>
              </div>
              <div className="p-5">
                <ul className="space-y-3">
                  {(showAllRisks
                    ? (report.keyRisks ?? [])
                    : (report.keyRisks ?? []).slice(0, 4)
                  ).map((risk, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500/70" />
                      <span className="text-muted-foreground leading-relaxed">
                        <Markdown>{risk ?? ''}</Markdown>
                      </span>
                    </li>
                  ))}
                </ul>
                {(report.keyRisks?.length ?? 0) > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 w-full text-xs"
                    onClick={() => setShowAllRisks(!showAllRisks)}
                  >
                    {showAllRisks ? (
                      <>
                        <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                        {t('ui.showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                        {t('ui.showMore')} ({(report.keyRisks?.length ?? 0) - 4})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-xl border border-emerald-500/15 bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/10 bg-emerald-500/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <ArrowRight className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="text-sm font-semibold">{t('report.nextSteps.title')}</h3>
              </div>
              <div className="p-5">
                <ol className="space-y-3">
                  {(report.nextSteps ?? []).map((step, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">
                        <Markdown>{step ?? ''}</Markdown>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/*  ALTERNATIVE PROJECT                                           */}
        {/* ============================================================== */}
        {report.alternativeProject && (
          <>
            <Divider />
            <motion.div
              data-toc-section
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
              id="alternative"
            >
              <SectionHeader
                icon={Sparkles}
                id="alternative"
                title={t('report.alternative.title')}
                subtitle={t('report.sections.alternativeDesc', 'A suggested alternative approach')}
              />
              <div className="rounded-xl border border-amber-500/20 bg-card overflow-hidden">
                <div className="p-5 md:p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">{report.alternativeProject.name}</h3>
                        <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          <MarkdownBlock>{report.alternativeProject.description ?? ''}</MarkdownBlock>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2">
                        <Banknote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm text-amber-700 dark:text-amber-300">{t('report.estimatedCost')}:</span>
                        <span className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                          {(() => {
                            const altCost = report.alternativeProject.estimatedCost;
                            const currency = report.estimatedCost.currency || country.currency;
                            if (typeof altCost === 'number') {
                              return formatCost(altCost, currency);
                            }
                            if (altCost && typeof altCost === 'object') {
                              const low = (altCost as { low?: number }).low;
                              const high = (altCost as { high?: number }).high;
                              if (low != null && high != null) {
                                return `${formatCost(low, currency)} - ${formatCost(high, currency)}`;
                              }
                              if (low != null) return formatCost(low, currency);
                              if (high != null) return formatCost(high, currency);
                            }
                            return `${currency} N/A`;
                          })()}
                        </span>
                      </div>

                      <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                              {t('report.alternative.why')}
                            </p>
                            <div className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                              <Markdown>{report.alternativeProject.whySuitable ?? ''}</Markdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(report.alternativeProject.potentialBenefits?.length ?? 0) > 0 && (
                      <div className="lg:w-64 shrink-0">
                        <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-4 h-full">
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {t('report.alternative.benefits')}
                          </p>
                          <ul className="space-y-2">
                            {(report.alternativeProject.potentialBenefits ?? []).map((benefit, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                                <Markdown>{benefit ?? ''}</Markdown>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ============================================================== */}
        {/*  PANEL DISCUSSION CTA                                          */}
        {/* ============================================================== */}
        {reportId && !isSharedView && (
          <>
            <Divider />
            <motion.div
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
            >
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-6 md:p-8">
                <div className="flex flex-col items-center text-center sm:flex-row sm:text-left gap-6">
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                      <MessageSquare className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">AI</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold">{t('report.discussion.ctaTitle')}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
                      {t('report.discussion.ctaDescription')}
                    </p>
                  </div>
                  <Button size="lg" className="gap-2 rounded-xl shadow-sm" asChild>
                    <Link to={`/${country.slug}/report/${reportId}/discussion`}>
                      <MessageSquare className="h-4 w-4" />
                      {t('report.discussion.start')}
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ============================================================== */}
        {/*  DISCLAIMER                                                    */}
        {/* ============================================================== */}
        <div className="mt-10 md:mt-14 space-y-4">
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            <div className="rounded-xl bg-muted/30 border border-border/50 px-5 py-4">
              <div className="flex gap-3">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t('report.disclaimer')}
                  </p>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <Markdown>{report.disclaimer ?? ''}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* References */}
          {report.references && report.references.length > 0 && (
            <motion.div
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
            >
              <div className="rounded-xl bg-muted/30 border border-border/50 px-5 py-4">
                <div className="flex gap-3">
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      {t('report.references.title', 'References & Sources')}
                    </p>
                    <ul className="space-y-2">
                      {(showAllReferences
                        ? report.references
                        : report.references.slice(0, 3)
                      ).map((ref, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground/60 tabular-nums text-xs mt-0.5">{index + 1}.</span>
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-primary hover:text-primary/80 transition-colors leading-relaxed flex items-center gap-1"
                          >
                            {ref.title}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                          </a>
                        </li>
                      ))}
                    </ul>
                    {report.references.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 h-auto p-0 text-xs font-medium hover:bg-transparent text-muted-foreground"
                        onClick={() => setShowAllReferences(!showAllReferences)}
                      >
                        {showAllReferences ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" />
                            {t('ui.showLess')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" />
                            {t('ui.showMore')} ({report.references.length - 3} more)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ============================================================== */}
        {/*  BOTTOM ACTIONS                                                */}
        {/* ============================================================== */}
        {!isSharedView && (
          <motion.div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            <Button onClick={onReset} className="rounded-xl gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('report.newAnalysis')}
            </Button>
            {shareUrl && (
              <Button variant="outline" onClick={handleShare} className="rounded-xl gap-2">
                <Share2 className="h-4 w-4" />
                {t('report.share')}
              </Button>
            )}
          </motion.div>
        )}

        {isSharedView && (
          <motion.div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            {reportId && (
              <Button asChild className="rounded-xl gap-2">
                <Link to={`/${country.slug}/report/${reportId}/discussion`}>
                  <MessageSquare className="h-4 w-4" />
                  {t('report.discussion.join')}
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild className="rounded-xl gap-2">
              <Link to={`/${country.slug}`}>
                {t('home.hero.cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-card border shadow-lg hover:bg-muted transition-colors text-foreground"
            aria-label="Back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
