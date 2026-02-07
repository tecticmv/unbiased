import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, AlertTriangle, ArrowRight, CheckCircle2, XCircle, PieChart, Clock, Timer, Banknote, Calendar, ServerCrash, RefreshCw, WifiOff } from "lucide-react";
import { MAX_RECONNECT_ATTEMPTS } from "@/contexts/streaming-report";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        className="py-10 md:py-16"
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
        className="py-10 md:py-16"
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

  const hasProjectType = !!report?.detectedProjectType;
  const hasVerdict = !!(report?.verdict as { recommendation?: string })?.recommendation;
  const hasScore = report?.overallScore !== undefined;
  const hasSummary = !!report?.overallSummary;
  const hasBudgetRatio = !!(report?.budgetRatio as { percentageOfBudget?: number })?.percentageOfBudget;
  const hasTimeframe = !!(report?.timeframe as { estimatedDuration?: { mostLikely?: number } })?.estimatedDuration?.mostLikely;
  const hasRisks = Array.isArray(report?.keyRisks) && report.keyRisks.length > 0;
  const hasSteps = Array.isArray(report?.nextSteps) && report.nextSteps.length > 0;

  const verdict = report?.verdict as { recommendation?: string; reason?: string } | undefined;
  const budgetRatio = report?.budgetRatio as { percentageOfBudget?: number; interpretation?: string; projectCostMidpoint?: number; countryTotalBudget?: number; currencyCode?: string } | undefined;
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
    <motion.div
      className="py-10 md:py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="container max-w-5xl">
        {/* Header - Project Type */}
        <motion.div
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="space-y-1">
            {hasProjectType ? (
              <motion.h1
                className="text-xl font-bold sm:text-2xl md:text-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {report.detectedProjectType}
              </motion.h1>
            ) : (
              <Skeleton className="h-8 w-64" />
            )}
            <p className="text-sm text-muted-foreground sm:text-base">{country.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <Skeleton className="h-3 w-32" />
            </p>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </motion.div>

        {/* Streaming Progress Banner - Always visible while streaming */}
        {isStreaming && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="rounded-lg border border-primary/30 bg-transparent px-4 py-3">
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

        {/* Project Description */}
        {projectDescription && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            <div className="rounded-lg border border-muted bg-transparent px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                {t('report.analyzedRequest')}
              </p>
              <p className="text-sm text-foreground/80 italic">
                "{projectDescription}"
              </p>
            </div>
          </motion.div>
        )}

        {/* COMBINED VERDICT & SCORE CARD */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {hasScore || hasVerdict ? (
            <Card className={`overflow-hidden ${
              verdict?.recommendation === "yes"
                ? "border-green-500/30"
                : verdict?.recommendation === "no"
                  ? "border-red-500/30"
                  : ""
            }`}>
              <CardContent className="py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Score Gauge */}
                  <div className="shrink-0 flex justify-center sm:justify-start">
                    {hasScore ? (
                      <ScoreGauge score={report.overallScore!} size={100} />
                    ) : (
                      <div className="relative h-[100px] w-[100px]">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-muted">--</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 text-center sm:text-left">
                    {/* Verdict Question + Badge */}
                    {hasVerdict ? (
                      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-2">
                        <span className="text-base font-semibold text-muted-foreground">
                          {t('report.verdict.title')}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-sm font-bold px-3 py-1 ${
                            verdict?.recommendation === "yes"
                              ? "border-green-500 bg-transparent text-green-700 dark:text-green-400"
                              : "border-red-500 bg-transparent text-red-700 dark:text-red-400"
                          }`}
                        >
                          {verdict?.recommendation === "yes" ? (
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1.5" />
                          )}
                          {verdict?.recommendation === "yes"
                            ? t('common.yes').toUpperCase()
                            : t('common.no').toUpperCase()}
                        </Badge>
                      </div>
                    ) : (
                      <Skeleton className="h-6 w-48 mx-auto sm:mx-0 mb-2" />
                    )}

                    {/* Score Label */}
                    {hasScore ? (
                      <div className="text-lg font-bold">
                        {getScoreLabel(report.overallScore!)}
                      </div>
                    ) : (
                      <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
                    )}

                    {/* Summary */}
                    {hasSummary ? (
                      <motion.p
                        className="mt-2 text-sm text-muted-foreground leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {report.overallSummary}
                      </motion.p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5 mx-auto sm:mx-0" />
                        <Skeleton className="h-4 w-3/5 mx-auto sm:mx-0" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="shrink-0 flex justify-center sm:justify-start">
                    <div className="relative h-[100px] w-[100px]">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-muted">--</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <Skeleton className="h-6 w-48 mx-auto sm:mx-0" />
                    <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
                    <div className="mt-2 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5 mx-auto sm:mx-0" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* BUDGET IMPACT & COST BREAKDOWN - Side by Side */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {/* Budget Impact Card */}
            {hasBudgetRatio ? (
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <PieChart className="h-5 w-5" />
                    {t('report.budgetRatio.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                        <circle
                          cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${Math.min(budgetRatio?.percentageOfBudget || 0, 100) * 2.51} 251`}
                          className={`${(budgetRatio?.percentageOfBudget || 0) > 10 ? "text-red-500" : (budgetRatio?.percentageOfBudget || 0) > 5 ? "text-yellow-500" : "text-green-500"}`}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-bold">{budgetRatio?.percentageOfBudget?.toFixed(2)}%</span>
                        <span className="text-[9px] text-muted-foreground">{t('report.budgetRatio.ofBudget')}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {budgetRatio?.projectCostMidpoint ? (
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t('report.budgetRatio.projectCost')}:</span>
                          <p className="font-semibold">
                            {formatCost(budgetRatio.projectCostMidpoint, budgetRatio.currencyCode || country.currency)}
                          </p>
                        </div>
                      ) : (
                        <Skeleton className="h-8 w-full" />
                      )}
                      {budgetRatio?.countryTotalBudget ? (
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t('report.budgetRatio.totalBudget')}:</span>
                          <p className="font-semibold">
                            {formatCost(budgetRatio.countryTotalBudget, budgetRatio.currencyCode || country.currency)}
                          </p>
                        </div>
                      ) : (
                        <Skeleton className="h-8 w-full" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cost Breakdown Skeleton */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Banknote className="h-5 w-5" />
                  {t('report.costBreakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* TIMEFRAME CARD */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {hasTimeframe ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-5 w-5" />
                  {t('report.timeframe.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6 sm:flex-row">
                  {/* Duration Visual */}
                  <div className="flex flex-col items-center justify-center shrink-0 sm:w-40">
                    <div className="flex items-center gap-2">
                      <Timer className="h-8 w-8 text-primary" />
                      <div className="text-center">
                        <span className="text-3xl font-bold">
                          {timeframe?.estimatedDuration?.mostLikely}
                        </span>
                        <p className="text-xs text-muted-foreground">{t('report.timeframe.months')}</p>
                      </div>
                    </div>
                    {timeframe?.estimatedDuration?.minimum && timeframe?.estimatedDuration?.maximum && (
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        {t('report.timeframe.range')}: {timeframe.estimatedDuration.minimum}-{timeframe.estimatedDuration.maximum} {t('report.timeframe.months')}
                      </p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-4">
                    {/* Admin Completion Status */}
                    {timeframe?.canCurrentAdminComplete !== undefined && (
                      <div className={`rounded-lg p-3 ${
                        timeframe.canCurrentAdminComplete
                          ? "bg-transparent border border-green-500/30"
                          : "bg-transparent border border-amber-500/30"
                      }`}>
                        <div className="flex items-center gap-2">
                          {timeframe.canCurrentAdminComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          )}
                          <span className={`font-medium text-sm ${
                            timeframe.canCurrentAdminComplete
                              ? "text-green-700 dark:text-green-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}>
                            {timeframe.canCurrentAdminComplete
                              ? t('report.timeframe.canComplete')
                              : t('report.timeframe.cannotComplete')}
                          </span>
                        </div>
                        {timeframe?.adminTermAnalysis ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {timeframe.adminTermAnalysis}
                          </p>
                        ) : (
                          <Skeleton className="mt-1 h-4 w-3/4" />
                        )}
                      </div>
                    )}

                    {/* Risk of Delay */}
                    {timeframe?.riskOfDelay && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{t('report.timeframe.delayRisk')}:</span>
                        <Badge
                          variant={
                            timeframe.riskOfDelay === "low"
                              ? "default"
                              : timeframe.riskOfDelay === "medium"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {t(`report.timeframe.risk.${timeframe.riskOfDelay}`, { defaultValue: timeframe.riskOfDelay })}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-36" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6 sm:flex-row">
                  <div className="flex flex-col items-center justify-center shrink-0 sm:w-40">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="mt-2 h-3 w-20" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Suggested Locations Skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                {t('report.suggestedLocations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="mt-1.5 h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Score Breakdown Skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Analysis Skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-44" />
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-1 flex-wrap">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-md" />
                ))}
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Risks and Next Steps */}
        <motion.div
          className="mb-6 grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {/* Key Risks */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertTriangle className="h-4 w-4" />
                {t('report.risks.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasRisks ? (
                <ul className="space-y-3">
                  {risks?.slice(0, 4).map((risk, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-3 text-xs sm:text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="mt-1.5 sm:mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      <span className="text-muted-foreground leading-relaxed">
                        {risk}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ArrowRight className="h-4 w-4" />
                {t('report.nextSteps.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasSteps ? (
                <ol className="space-y-3">
                  {steps?.slice(0, 4).map((step, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-3 text-xs sm:text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed pt-0.5">
                        {step}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Disclaimer Skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="bg-transparent">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <Skeleton className="h-4 w-4 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
