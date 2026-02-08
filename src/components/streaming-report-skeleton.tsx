import { useState, useEffect, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  MapPin,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ServerCrash,
  RefreshCw,
  WifiOff,
  FileText,
  Wallet,
  BarChart3,
  Target,
  Info,
} from "lucide-react";
import { MAX_RECONNECT_ATTEMPTS } from "@/contexts/streaming-report";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/score-gauge";
import { useStreamingReport } from "@/contexts/streaming-report";
import type { CountryConfig } from "@/lib/countries";

// Hook for cycling through loading messages
function useCyclingText(messages: string[], intervalMs: number = 3000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [messages.length, intervalMs]);

  return messages[index];
}

interface StreamingReportSkeletonProps {
  country: CountryConfig;
  projectDescription?: string;
  onRetry?: () => void;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />
  );
}

function Divider() {
  return <div className="border-t border-border/60 my-10 md:my-14" />;
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-8">
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

function formatCost(amount: number, currency: string): string {
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

export function StreamingReportSkeleton({ country, projectDescription, onRetry }: StreamingReportSkeletonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { report, isStreaming, error, reset, connectionState, reconnectAttempt } = useStreamingReport();

  // Handle going back
  const handleBack = () => {
    reset();
    navigate(`/${country.slug}`);
  };

  // Show reconnection UI when disconnected or reconnecting
  const isReconnecting = connectionState === "reconnecting";
  const isDisconnected = connectionState === "disconnected" && !error;

  if (isReconnecting || isDisconnected) {
    return (
      <motion.div
        className="py-8 md:py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="container max-w-2xl">
          <Card className={isReconnecting ? "border-amber-500/30" : "border-destructive/30"}>
            <CardContent className="py-10">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`rounded-full p-4 ${isReconnecting ? "bg-transparent border border-amber-500" : "bg-transparent border border-destructive"}`}>
                  {isReconnecting ? (
                    <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
                  ) : (
                    <WifiOff className="h-10 w-10 text-destructive" />
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className={`text-xl font-bold ${isReconnecting ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
                    {isReconnecting
                      ? t('analysis.reconnecting.title')
                      : t('analysis.disconnected.title')}
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    {isReconnecting
                      ? t('analysis.reconnecting.description', { attempt: reconnectAttempt })
                      : t('analysis.disconnected.description')}
                  </p>
                </div>

                {/* Show partial data if available */}
                {report && Object.keys(report).length > 0 && (
                  <div className="w-full mt-4 p-4 rounded-lg bg-transparent border border-border text-left">
                    <p className="text-sm font-medium mb-2">{t('analysis.reconnecting.partialData')}</p>
                    {report.detectedProjectType && (
                      <p className="text-sm text-muted-foreground">
                        {t('analysis.streaming.projectType')}: {report.detectedProjectType}
                      </p>
                    )}
                    {report.overallScore !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        {t('analysis.streaming.score')}: {report.overallScore}%
                      </p>
                    )}
                  </div>
                )}

                {/* Actions - only show when not reconnecting */}
                {!isReconnecting && (
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleBack}>
                      {t('common.back')}
                    </Button>
                    {onRetry && (
                      <Button onClick={onRetry}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('analysis.rejection.tryAgain')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress indicator for reconnection attempts */}
          {isReconnecting && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('analysis.reconnecting.attempt', { current: reconnectAttempt, max: MAX_RECONNECT_ATTEMPTS })}</span>
                <div className="flex gap-1">
                  {Array.from({ length: MAX_RECONNECT_ATTEMPTS }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < reconnectAttempt ? "bg-amber-500" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Show error state
  if (error) {
    return (
      <motion.div
        className="py-8 md:py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="container max-w-2xl">
          <Card className="border-destructive/30">
            <CardContent className="py-10">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-destructive/10 p-4">
                  <ServerCrash className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-destructive">
                    {t('errors.highUsageTitle')}
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    {error}
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    {t('common.back')}
                  </Button>
                  {onRetry && (
                    <Button onClick={onRetry}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t('analysis.rejection.tryAgain')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Dynamic loading messages
  const loadingMessages = [
    t('analysis.streaming.thinking'),
    t('analysis.streaming.analyzing'),
    t('analysis.streaming.researching'),
    t('analysis.streaming.evaluating'),
    t('analysis.streaming.calculating'),
  ];
  const currentLoadingText = useCyclingText(loadingMessages, 2500);

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return t('score.highlyFeasible');
    if (score >= 60) return t('score.moderatelyFeasible');
    if (score >= 40) return t('score.challenging');
    if (score >= 20) return t('score.difficult');
    return t('score.notRecommended');
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  };

  const hasProjectType = !!report?.detectedProjectType;
  const hasVerdict = !!(report?.verdict as { recommendation?: string })?.recommendation;
  const hasScore = report?.overallScore !== undefined;
  const hasSummary = !!report?.overallSummary;
  const hasBudgetRatio = !!(report?.budgetRatio as { percentageOfBudget?: number })?.percentageOfBudget;
  const hasTimeframe = !!(report?.timeframe as { estimatedDuration?: { mostLikely?: number } })?.estimatedDuration?.mostLikely;
  const hasRisks = Array.isArray(report?.keyRisks) && report.keyRisks.length > 0;
  const hasSteps = Array.isArray(report?.nextSteps) && report.nextSteps.length > 0;

  const verdict = report?.verdict as { recommendation?: string; reason?: string } | undefined;
  const budgetRatio = report?.budgetRatio as { percentageOfBudget?: number; interpretation?: string; projectCostMidpoint?: number; countryTotalBudget?: number; currencyCode?: string; fiscalYear?: string } | undefined;
  const timeframe = report?.timeframe as {
    estimatedDuration?: { minimum?: number; maximum?: number; mostLikely?: number };
    canCurrentAdminComplete?: boolean;
    adminTermAnalysis?: string;
    riskOfDelay?: string;
    delayFactors?: string[];
  } | undefined;
  const risks = report?.keyRisks as string[] | undefined;
  const steps = report?.nextSteps as string[] | undefined;

  return (
    <div className="py-8 md:py-12">
      <div className="container max-w-4xl">

        {/* ============================================================== */}
        {/*  HEADER                                                        */}
        {/* ============================================================== */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {t('report.title')}
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {country.name}
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <Skeleton className="h-3 w-24 inline-block" />
            </span>
          </div>

          {/* Title */}
          {hasProjectType ? (
            <motion.h1
              className="text-2xl font-bold sm:text-3xl md:text-[2.75rem] tracking-tight leading-[1.15] text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {report.detectedProjectType}
            </motion.h1>
          ) : (
            <Skeleton className="h-10 w-80 max-w-full" />
          )}

          {/* Action button skeletons */}
          <div className="flex flex-wrap gap-2 mt-5">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/*  PROJECT DESCRIPTION                                           */}
        {/* ============================================================== */}
        {projectDescription && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            <div className="rounded-xl bg-muted/40 border border-border/50 px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('report.analyzedRequest')}
              </p>
              <p className="text-[15px] text-foreground/80 leading-[1.75]">
                {projectDescription}
              </p>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  STREAMING PROGRESS BANNER                                     */}
        {/* ============================================================== */}
        {isStreaming && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="rounded-xl border border-primary/30 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="absolute inset-0 h-5 w-5 animate-ping rounded-full bg-primary/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentLoadingText}
                      className="text-sm font-medium text-primary"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentLoadingText}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  VERDICT                                                       */}
        {/* ============================================================== */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {hasVerdict ? (
            <div className={`rounded-2xl border-2 overflow-hidden ${
              verdict?.recommendation === "yes"
                ? "border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20"
                : "border-red-500/30 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20"
            }`}>
              <div className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {t('report.verdict.title')}
                  </span>
                  <Badge
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      verdict?.recommendation === "yes"
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                        : "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/20"
                    }`}
                  >
                    {verdict?.recommendation === "yes" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 me-1.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 me-1.5" />
                    )}
                    {verdict?.recommendation === "yes"
                      ? t('common.yes').toUpperCase()
                      : t('common.no').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-border/50 overflow-hidden">
              <div className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ============================================================== */}
        {/*  OVERALL SCORE                                                 */}
        {/* ============================================================== */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="rounded-2xl border overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {/* Score Gauge */}
                <div className="shrink-0 flex justify-center sm:justify-start">
                  {hasScore ? (
                    <ScoreGauge score={report.overallScore!} size={130} />
                  ) : (
                    <div className="relative h-[130px] w-[130px]">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-muted">--</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Score Details */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  {hasScore ? (
                    <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${getScoreColor(report.overallScore!)}`}>
                      {getScoreLabel(report.overallScore!)}
                    </div>
                  ) : (
                    <Skeleton className="h-8 w-56 mx-auto sm:mx-0" />
                  )}

                  {hasSummary ? (
                    <motion.div
                      className="text-sm text-muted-foreground leading-[1.8] max-w-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {report.overallSummary}
                    </motion.div>
                  ) : (
                    <div className="space-y-2 max-w-2xl">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5 mx-auto sm:mx-0" />
                      <Skeleton className="h-4 w-3/5 mx-auto sm:mx-0" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <Divider />

        {/* ============================================================== */}
        {/*  FINANCIAL ANALYSIS                                            */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <SectionHeader
            icon={Wallet}
            title={t('report.sections.financial', 'Financial Analysis')}
            subtitle={t('report.sections.financialDesc', 'Budget impact and cost breakdown')}
          />

          <div className="rounded-xl border bg-card overflow-hidden">
            {/* Budget Impact */}
            <div className="p-5">
              {hasBudgetRatio ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-5 sm:grid-cols-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetRatio.projectCost')}</span>
                      <p className="text-base sm:text-lg font-bold mt-1 text-foreground truncate">
                        {budgetRatio?.projectCostMidpoint
                          ? formatCost(budgetRatio.projectCostMidpoint, budgetRatio.currencyCode || country.currency)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetRatio.totalBudget')}</span>
                      <p className="text-base sm:text-lg font-bold mt-1 text-foreground truncate">
                        {budgetRatio?.countryTotalBudget
                          ? formatCost(budgetRatio.countryTotalBudget, budgetRatio.currencyCode || country.currency)
                          : "—"}
                      </p>
                      {budgetRatio?.fiscalYear && (
                        <span className="text-[11px] text-muted-foreground">{budgetRatio.fiscalYear}</span>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{t('report.budgetRatio.title')}</span>
                      <p className={`text-base sm:text-lg font-bold mt-1 ${
                        (budgetRatio?.percentageOfBudget ?? 0) > 10 ? "text-red-500"
                          : (budgetRatio?.percentageOfBudget ?? 0) > 5 ? "text-amber-500"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {budgetRatio?.percentageOfBudget?.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Budget ratio bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (budgetRatio?.percentageOfBudget ?? 0) > 10 ? "bg-red-500"
                            : (budgetRatio?.percentageOfBudget ?? 0) > 5 ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(budgetRatio?.percentageOfBudget ?? 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t('report.budgetRatio.projectCost')} {t('report.budgetRatio.asPercentage')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-5 sm:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={i === 2 ? "col-span-2 sm:col-span-1" : ""}>
                        <Skeleton className="h-3 w-20 mb-2" />
                        <Skeleton className="h-6 w-28" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="border-t" />
            <div className="p-5">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t('report.costBreakdown')}</span>
              <div className="mt-4 space-y-3.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <Divider />

        {/* ============================================================== */}
        {/*  TIMEFRAME                                                     */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <SectionHeader
            icon={Clock}
            title={t('report.timeframe.title')}
            subtitle={t('report.sections.timeframeDesc', 'Project duration and administration analysis')}
          />

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-5">
              {hasTimeframe ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-primary tabular-nums">{timeframe?.estimatedDuration?.mostLikely}</span>
                      <span className="text-sm text-primary font-medium">{t('report.timeframe.months')}</span>
                    </div>

                    {timeframe?.riskOfDelay && (
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        timeframe.riskOfDelay === "low"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : timeframe.riskOfDelay === "medium"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-red-500/10 text-red-700 dark:text-red-300"
                      }`}>
                        <AlertTriangle className="h-3 w-3" />
                        {t(`report.timeframe.risk.${timeframe.riskOfDelay}`, { defaultValue: timeframe.riskOfDelay })} {t('report.timeframe.delayRisk').toLowerCase()}
                      </div>
                    )}
                  </div>

                  {/* Admin completion */}
                  {timeframe?.canCurrentAdminComplete !== undefined && (
                    <div className="flex items-center gap-2 mt-3">
                      {timeframe.canCurrentAdminComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${
                        timeframe.canCurrentAdminComplete
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}>
                        {timeframe.canCurrentAdminComplete
                          ? t('report.timeframe.canComplete')
                          : t('report.timeframe.cannotComplete')}
                      </span>
                    </div>
                  )}
                  {timeframe?.adminTermAnalysis ? (
                    <p className="mt-1 ms-6 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {timeframe.adminTermAnalysis}
                    </p>
                  ) : (
                    <Skeleton className="mt-1 ms-6 h-4 w-3/4" />
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-6 w-32 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="mt-1 ms-6 h-4 w-3/4" />
                </>
              )}
            </div>

            {/* Delay factors skeleton */}
            <div className="border-t" />
            <div className="px-5 py-4">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t('report.timeframe.delayFactors')}</span>
              <ul className="mt-2.5 space-y-1.5">
                {[...Array(3)].map((_, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    <Skeleton className="h-4 w-full" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <Divider />

        {/* ============================================================== */}
        {/*  SUGGESTED LOCATIONS                                           */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <SectionHeader
            icon={MapPin}
            title={t('report.suggestedLocations')}
            subtitle={t('report.sections.locationDesc', 'Recommended implementation sites')}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <Divider />

        {/* ============================================================== */}
        {/*  DETAILED ANALYSIS                                             */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <SectionHeader
            icon={BarChart3}
            title={t('report.categories.title')}
            subtitle={t('report.sections.categoriesDesc', 'Score breakdown by category')}
          />

          {/* Breakdown Chart skeleton */}
          <div className="rounded-xl border bg-card p-5 mb-6">
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-20 shrink-0" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-8 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Category Tabs skeleton */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b bg-muted/20 px-5 py-4">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="p-5">
              {/* Tab buttons skeleton */}
              <div className="mb-6 grid h-auto w-full grid-cols-3 gap-1.5 sm:grid-cols-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-9 rounded-lg" />
                ))}
              </div>
              {/* Tab content skeleton */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <Divider />

        {/* ============================================================== */}
        {/*  RISKS & NEXT STEPS                                            */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <SectionHeader
            icon={Target}
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
                {hasRisks ? (
                  <ul className="space-y-3">
                    {risks?.slice(0, 4).map((risk, index) => (
                      <motion.li
                        key={index}
                        className="flex items-start gap-2.5 text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500/70" />
                        <span className="text-muted-foreground leading-relaxed">
                          {risk}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Skeleton className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
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
                {hasSteps ? (
                  <ol className="space-y-3">
                    {steps?.slice(0, 4).map((step, index) => (
                      <motion.li
                        key={index}
                        className="flex items-start gap-3 text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground leading-relaxed">
                          {step}
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                ) : (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/*  DISCLAIMER                                                    */}
        {/* ============================================================== */}
        <div className="mt-10 md:mt-14">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <div className="rounded-xl bg-muted/30 border border-border/50 px-5 py-4">
              <div className="flex gap-3">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
