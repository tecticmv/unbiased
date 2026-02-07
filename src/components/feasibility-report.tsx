import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Share2,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
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
} from "lucide-react";
import { useState, useMemo, useRef, useEffect, type ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreGauge } from "@/components/score-gauge";
import { BreakdownChart } from "@/components/breakdown-chart";
import { CategoryCard } from "@/components/category-card";
import { Markdown, MarkdownBlock } from "@/components/ui/markdown";
import type { CountryConfig } from "@/lib/countries";
import type { FeasibilityReport as FeasibilityReportType, CategoryKey } from "@/types";
import { categoryLabels } from "@/types";

// Section Header component for visual hierarchy
function SectionHeader({
  icon: Icon,
  title,
  subtitle
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// Animated progress bar that triggers only once when visible
function AnimatedProgressBar({ value, index }: { value: number; index: number }) {
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
    <div ref={ref} className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className="h-full rounded-full bg-primary"
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

// Scroll animation variants - minimal and reactive
const scrollVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth feel
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

  // Format the report date
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

  // Viewport animation settings
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

  return (
    <div className="py-10 md:py-16">
      <div className="container max-w-5xl">
        {/* Header - Title and Actions (TOP) */}
        <motion.div
          className="mb-8"
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wider font-medium">Feasibility Report</span>
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl tracking-tight">
                {(report as Record<string, unknown>).translatedProjectType as string || report.detectedProjectType}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {country.name}
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formattedDate}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {reportId && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link to={`/${country.slug}/report/${reportId}/discussion`}>
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('report.discussion.discuss')}</span>
                  </Link>
                </Button>
              )}
              {shareUrl && (
                <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('report.share')}</span>
                </Button>
              )}
              {!isSharedView && (
                <Button variant="outline" size="sm" className="gap-2" onClick={onReset}>
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('report.newAnalysis')}</span>
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Project Description - What was analyzed */}
        {projectDescription && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-8"
          >
            <div className="relative rounded-xl border bg-gradient-to-br from-muted/50 to-muted/30 px-5 py-4">
              <div className="absolute -top-3 left-4 px-2 bg-background">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('report.analyzedRequest')}
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed pt-1">
                "{projectDescription}"
              </p>
            </div>
          </motion.div>
        )}

        {/* COMBINED VERDICT & SCORE SECTION */}
        <motion.div
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="mb-10"
        >
          <Card className={`overflow-hidden shadow-lg ${
            report.verdict?.recommendation === "yes"
              ? "border-green-500/40 bg-gradient-to-br from-green-500/5 to-transparent"
              : report.verdict?.recommendation === "no"
                ? "border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent"
                : ""
          }`}>
            <CardContent className="py-6 px-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {/* Score Gauge */}
                <div className="shrink-0 flex justify-center sm:justify-start">
                  <ScoreGauge score={report.overallScore} size={120} />
                </div>

                {/* Details */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  {/* Verdict Question + Badge */}
                  {report.verdict && (
                    <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {t('report.verdict.title')}
                      </span>
                      <Badge
                        className={`text-sm font-bold px-4 py-1.5 ${
                          report.verdict.recommendation === "yes"
                            ? "border-green-500 bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30"
                            : "border-red-500 bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/30"
                        }`}
                      >
                        {report.verdict.recommendation === "yes" ? (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        {report.verdict.recommendation === "yes"
                          ? t('common.yes').toUpperCase()
                          : t('common.no').toUpperCase()}
                      </Badge>
                    </div>
                  )}

                  {/* Score Label */}
                  <div className="text-xl sm:text-2xl font-bold tracking-tight">
                    {getScoreLabel(report.overallScore)}
                  </div>

                  {/* Summary */}
                  <div className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    <MarkdownBlock>{report.overallSummary ?? ''}</MarkdownBlock>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FINANCIAL ANALYSIS SECTION */}
        {(report.budgetRatio || hasCostBreakdown) && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-10"
          >
            <SectionHeader
              icon={Wallet}
              title={t('report.sections.financial', 'Financial Analysis')}
              subtitle={t('report.sections.financialDesc', 'Budget impact and cost breakdown')}
            />
            <div className="grid gap-4 md:grid-cols-2">
              {/* Budget Impact Card */}
              {report.budgetRatio && (
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Wallet className="h-5 w-5" />
                      {t('report.budgetRatio.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Main Budget Overview - Horizontal Layout */}
                    <div className="flex items-center gap-4">
                      {/* Circular Progress Visual */}
                      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-muted/20"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${Math.min(report.budgetRatio.percentageOfBudget, 100) * 2.51} 251`}
                            className={`${
                              report.budgetRatio.percentageOfBudget > 10
                                ? "text-red-500"
                                : report.budgetRatio.percentageOfBudget > 5
                                  ? "text-yellow-500"
                                  : "text-emerald-500"
                            }`}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-xl font-bold">
                            {report.budgetRatio.percentageOfBudget < 0.01
                              ? "<0.01"
                              : report.budgetRatio.percentageOfBudget.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-muted-foreground">{t('report.budgetRatio.ofBudget')}</span>
                        </div>
                      </div>

                      {/* Budget Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{t('report.budgetRatio.projectCost')}</p>
                            <p className="font-semibold text-sm">
                              {formatCost(report.budgetRatio.projectCostMidpoint, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">
                              {t('report.budgetRatio.totalBudget')}
                              {report.budgetRatio.fiscalYear && (
                                <span className="ml-1">({report.budgetRatio.fiscalYear})</span>
                              )}
                            </p>
                            <p className="font-semibold text-sm">
                              {formatCost(report.budgetRatio.countryTotalBudget, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expenditure Classification (COFOG) */}
                    {report.budgetAlignment?.expenditureClassification && (
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-blue-500/10 p-2">
                            <Landmark className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">{t('report.budgetAlignment.cofogCategory', 'Expenditure Classification')}</p>
                              <p className="font-semibold">{report.budgetAlignment.expenditureClassification.cofogCategory}</p>
                            </div>
                            {report.budgetAlignment.expenditureClassification.sectorBudget && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{t('report.budgetAlignment.sectorBudget', 'Sector Budget')}</span>
                                  <span className="font-medium">
                                    {formatCost(report.budgetAlignment.expenditureClassification.sectorBudget, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                                  </span>
                                </div>
                                {report.budgetAlignment.expenditureClassification.percentageOfSectorBudget !== undefined && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Project % of Sector</span>
                                      <span className={`font-semibold ${
                                        report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 20
                                          ? "text-red-500"
                                          : report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 10
                                            ? "text-yellow-500"
                                            : "text-emerald-500"
                                      }`}>
                                        {report.budgetAlignment.expenditureClassification.percentageOfSectorBudget.toFixed(2)}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 20
                                            ? "bg-red-500"
                                            : report.budgetAlignment.expenditureClassification.percentageOfSectorBudget > 10
                                              ? "bg-yellow-500"
                                              : "bg-emerald-500"
                                        }`}
                                        style={{ width: `${Math.min(report.budgetAlignment.expenditureClassification.percentageOfSectorBudget, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Entity Budget from Fiscal Policy Framework */}
                    {report.budgetAlignment?.entityBudget?.hasEntityAllocation && (
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-purple-500/10 p-2">
                            <Building2 className="h-4 w-4 text-purple-500" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-xs text-muted-foreground">{t('report.budgetAlignment.entityAllocation', 'Entity Budget Allocation')}</p>
                            <p className="font-semibold">{report.budgetAlignment.entityBudget.entityName}</p>
                            {report.budgetAlignment.entityBudget.allocatedBudget && (
                              <div className="flex items-center justify-between text-sm pt-1">
                                <span className="text-muted-foreground">{t('report.budgetAlignment.allocatedBudget', 'Allocated Budget')}</span>
                                <span className="font-medium">
                                  {formatCost(report.budgetAlignment.entityBudget.allocatedBudget, report.budgetRatio.currencyCode || report.estimatedCost.currency || country.currency)}
                                </span>
                              </div>
                            )}
                            {report.budgetAlignment.entityBudget.fiscalPolicyReference && (
                              <p className="text-xs text-muted-foreground italic pt-1 border-t mt-2">
                                {report.budgetAlignment.entityBudget.fiscalPolicyReference}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Cost Breakdown Card */}
              {hasCostBreakdown && (
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Banknote className="h-5 w-5" />
                      {t('report.costBreakdown')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.estimatedCost.breakdown!.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm">
                          <span>{item.item}</span>
                          <span className="font-medium">{item.percentage}%</span>
                        </div>
                        <AnimatedProgressBar value={item.percentage} index={index} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* TIMEFRAME SECTION */}
        {report.timeframe && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-10"
          >
            <SectionHeader
              icon={Clock}
              title={t('report.timeframe.title')}
              subtitle={t('report.sections.timeframeDesc', 'Project duration and administration analysis')}
            />
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Duration Visual - Left Side */}
                  <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-gradient-to-br from-primary/10 to-primary/5 md:w-48 shrink-0">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background shadow-inner border">
                        <div className="text-center">
                          <span className="text-3xl font-bold text-primary">
                            {report.timeframe.estimatedDuration.mostLikely}
                          </span>
                          <p className="text-xs text-muted-foreground font-medium">{t('report.timeframe.months')}</p>
                        </div>
                      </div>
                      <Timer className="absolute -bottom-1 -right-1 h-8 w-8 text-primary bg-background rounded-full p-1" />
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground text-center">
                      {t('report.timeframe.range')}: {report.timeframe.estimatedDuration.minimum}-{report.timeframe.estimatedDuration.maximum} {t('report.timeframe.months')}
                    </p>
                  </div>

                  {/* Details - Right Side */}
                  <div className="flex-1 p-6 space-y-4">
                    {/* Admin Completion Status */}
                    <div className={`rounded-xl p-4 ${
                      report.timeframe.canCurrentAdminComplete
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-amber-500/10 border border-amber-500/20"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          report.timeframe.canCurrentAdminComplete
                            ? "bg-green-500/20"
                            : "bg-amber-500/20"
                        }`}>
                          {report.timeframe.canCurrentAdminComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div>
                          <span className={`font-semibold ${
                            report.timeframe.canCurrentAdminComplete
                              ? "text-green-700 dark:text-green-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}>
                            {report.timeframe.canCurrentAdminComplete
                              ? t('report.timeframe.canComplete')
                              : t('report.timeframe.cannotComplete')}
                          </span>
                          <div className="mt-1 text-sm text-muted-foreground">
                            <Markdown>{report.timeframe.adminTermAnalysis ?? ''}</Markdown>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {/* Risk of Delay */}
                      {report.timeframe.riskOfDelay && (
                        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('report.timeframe.delayRisk')}</span>
                          <Badge
                            className={`${
                              report.timeframe.riskOfDelay === "low"
                                ? "bg-green-500/20 text-green-700 dark:text-green-300"
                                : report.timeframe.riskOfDelay === "medium"
                                  ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
                                  : "bg-red-500/20 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {t(`report.timeframe.risk.${report.timeframe.riskOfDelay}`, { defaultValue: report.timeframe.riskOfDelay })}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Delay Factors */}
                    {report.timeframe.delayFactors && report.timeframe.delayFactors.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('report.timeframe.delayFactors')}</span>
                        <ul className="mt-2 space-y-2">
                          {report.timeframe.delayFactors.slice(0, 3).map((factor, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                              <Markdown>{factor ?? ''}</Markdown>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}


        {/* Suggested Locations */}
        {hasLocationSuggestions && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-10"
          >
            <SectionHeader
              icon={MapPin}
              title={t('report.suggestedLocations')}
              subtitle={t('report.sections.locationDesc', 'Recommended implementation sites')}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.location.suggested!.map((loc, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-semibold">{loc.name}</span>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <Markdown>{loc.reason ?? ''}</Markdown>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* DETAILED ANALYSIS SECTION */}
        <motion.div
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="mb-10"
        >
          <SectionHeader
            icon={BarChart3}
            title={t('report.categories.title')}
            subtitle={t('report.sections.categoriesDesc', 'Score breakdown by category')}
          />

          {/* Breakdown Chart */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <BreakdownChart categories={report.categories} />
            </CardContent>
          </Card>

          {/* Category Details */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-base">{t('analysis.title')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="technical" className="w-full">
                <TabsList className="mb-6 flex h-auto flex-wrap gap-2 bg-transparent p-0">
                  {categoryKeys.map((key) => {
                    const category = report.categories[key];
                    if (!category?.score) return null;
                    const label = categoryLabels[key as CategoryKey] || key;
                    const score = category.score;
                    const scoreColor = score >= 70 ? "text-green-600 dark:text-green-400" :
                                      score >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                                      "text-red-600 dark:text-red-400";
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="flex items-center gap-2 rounded-xl border-2 bg-muted/30 px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md hover:bg-muted/50"
                      >
                        <span>{(category.name || label).split(" ")[0]}</span>
                        <span className={`font-bold tabular-nums ${scoreColor} data-[state=active]:text-primary-foreground`}>
                          {score}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {categoryKeys.map((key) => {
                  const category = report.categories[key];
                  if (!category?.score) return null;
                  // Ensure category has a name for CategoryCard
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
            </CardContent>
          </Card>
        </motion.div>

        {/* RISKS & NEXT STEPS SECTION */}
        <motion.div
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="mb-10"
        >
          <SectionHeader
            icon={Target}
            title={t('report.sections.actionItems', 'Action Items')}
            subtitle={t('report.sections.actionItemsDesc', 'Key risks to address and recommended next steps')}
          />
          <div className="grid gap-6 md:grid-cols-2">
            {/* Key Risks */}
            <Card className="h-full border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  {t('report.risks.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(showAllRisks
                    ? (report.keyRisks ?? [])
                    : (report.keyRisks ?? []).slice(0, 4)
                  ).map((risk, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-500" />
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
                    className="mt-4 w-full"
                    onClick={() => setShowAllRisks(!showAllRisks)}
                  >
                    {showAllRisks ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        {t('ui.showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        {t('ui.showMore')} ({(report.keyRisks?.length ?? 0) - 4})
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="h-full border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                    <ArrowRight className="h-5 w-5 text-green-500" />
                  </div>
                  {t('report.nextSteps.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {(report.nextSteps ?? []).map((step, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed pt-0.5">
                        <Markdown>{step ?? ''}</Markdown>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ALTERNATIVE PROJECT SUGGESTION */}
        {report.alternativeProject && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-10"
          >
            <SectionHeader
              icon={Sparkles}
              title={t('report.alternative.title')}
              subtitle={t('report.sections.alternativeDesc', 'A suggested alternative approach')}
            />
            <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Main Info */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">{report.alternativeProject.name}</h3>
                      <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        <MarkdownBlock>{report.alternativeProject.description ?? ''}</MarkdownBlock>
                      </div>
                    </div>

                    {/* Estimated Cost Badge */}
                    <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2">
                      <Banknote className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                      <span className="text-sm text-amber-700 dark:text-amber-300">{t('report.estimatedCost')}:</span>
                      <span className="font-bold text-amber-800 dark:text-amber-200">
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

                    {/* Why Consider Box */}
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                            {t('report.alternative.why')}
                          </p>
                          <div className="text-sm text-amber-700 dark:text-amber-300">
                            <Markdown>{report.alternativeProject.whySuitable ?? ''}</Markdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Sidebar */}
                  {(report.alternativeProject.potentialBenefits?.length ?? 0) > 0 && (
                    <div className="lg:w-72 shrink-0">
                      <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 h-full">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {t('report.alternative.benefits')}
                        </p>
                        <ul className="space-y-2">
                          {(report.alternativeProject.potentialBenefits ?? []).map((benefit, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                              <Markdown>{benefit ?? ''}</Markdown>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Panel Discussion CTA */}
        {reportId && !isSharedView && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-8"
          >
            <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <CardContent className="py-8 px-6">
                <div className="flex flex-col items-center text-center sm:flex-row sm:text-left gap-6">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                      <MessageSquare className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                      <span className="text-white text-xs">AI</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{t('report.discussion.ctaTitle')}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      {t('report.discussion.ctaDescription')}
                    </p>
                  </div>
                  <Button size="lg" className="gap-2 shadow-md" asChild>
                    <Link to={`/${country.slug}/report/${reportId}/discussion`}>
                      <MessageSquare className="h-5 w-5" />
                      {t('report.discussion.start')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div
          variants={scrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="mb-8"
        >
          <div className="rounded-xl border border-muted bg-muted/20 px-5 py-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {t('report.disclaimer')}
                </p>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <Markdown>{report.disclaimer ?? ''}</Markdown>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* References & Sources */}
        {report.references && report.references.length > 0 && (
          <motion.div
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            className="mb-8"
          >
            <div className="rounded-xl border border-muted bg-muted/20 px-5 py-4">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {t('report.references.title', 'References & Sources')}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {(showAllReferences
                      ? report.references
                      : report.references.slice(0, 3)
                    ).map((ref, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline leading-relaxed"
                        >
                          {ref.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {report.references.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-auto p-0 text-xs font-medium hover:bg-transparent"
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

        {/* Actions */}
        {!isSharedView && (
          <motion.div
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            <Button onClick={onReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('report.newAnalysis')}
            </Button>
            {shareUrl && (
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                {t('report.share')}
              </Button>
            )}
          </motion.div>
        )}

        {isSharedView && (
          <motion.div
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            variants={scrollVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            {reportId && (
              <Button asChild>
                <Link to={`/${country.slug}/report/${reportId}/discussion`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('report.discussion.join')}
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`/${country.slug}`}>
                {t('home.hero.cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
