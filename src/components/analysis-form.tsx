import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2, FileText, Send, Info, XCircle } from "lucide-react";
import { generateAnalysisJobKey } from "@/lib/job-utils";
import { useAnalysisReconnection } from "@/hooks/use-analysis-reconnection";

// Haptic feedback patterns
function triggerHaptic(type: "progress" | "complete") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "progress") {
        navigator.vibrate(15); // Very subtle 15ms pulse for data updates
      } else if (type === "complete") {
        navigator.vibrate([30, 50, 60]); // Satisfying completion pattern
      }
    } catch {
      // Silently fail if vibration not supported
    }
  }
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analysisFormSchema, type AnalysisFormData } from "@/lib/schemas";
import { useStreamingReport } from "@/contexts/streaming-report";
import type { CountryConfig } from "@/lib/countries";

interface AnalysisFormProps {
  country: CountryConfig;
}

export function AnalysisForm({ country }: AnalysisFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    startValidating,
    startStreaming,
    updateProgress,
    updateReport,
    completeStreaming,
    setRejection,
    setError: setStreamError,
    isValidating,
    isRejected,
    rejection,
    reset: resetStreaming,
    // Reconnection state and methods
    setJobKey,
    setConnectionState,
    jobKey,
  } = useStreamingReport();

  // Reconnection hook
  const { startReconnection, cancelReconnection } = useAnalysisReconnection({
    onReconnected: () => {
      console.log("Reconnected to analysis stream");
    },
    onComplete: (_report, slug) => {
      console.log("Analysis completed during reconnection:", slug);
    },
    onMaxAttemptsReached: () => {
      setError(t('errors.reconnectionFailed'));
    },
  });

  // Abort controller ref for the SSE stream
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      country: country.slug,
      projectDescription: "",
    },
  });

  // Reset streaming context when form mounts (user navigated to home page)
  // This prevents stale data from showing if user uses browser back navigation
  useEffect(() => {
    resetStreaming();
  }, [resetStreaming]);

  // Scroll textarea into view when keyboard opens on mobile
  const handleTextareaFocus = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Small delay to let the keyboard open
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    },
    []
  );

  const onSubmit = async (data: AnalysisFormData) => {
    setIsLoading(true);
    setError(null);
    cancelReconnection(); // Cancel any previous reconnection

    // Calculate and store jobKey for recovery
    const calculatedJobKey = generateAnalysisJobKey(country.slug, data.projectDescription);
    setJobKey(calculatedJobKey);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setConnectionState("connecting");

      const response = await fetch("/api/analyze/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          country: country.slug,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(t('errors.failedToStartAnalysis'));
      }

      setConnectionState("connected");

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(t('errors.streamingNotSupported'));
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let hasNavigated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "validating") {
                // Show validation state
                startValidating();
              } else if (event.type === "rejected") {
                // Request was rejected - show rejection UI
                setRejection({
                  reason: event.reason,
                  rejectionType: event.rejectionType,
                  suggestion: event.suggestion,
                });
                setConnectionState("disconnected");
                setIsLoading(false);
                return; // Stop processing
              } else if (event.type === "start" && !hasNavigated) {
                // Start streaming and navigate to report page
                startStreaming(event.slug);
                navigate(`/${country.slug}/report/${event.slug}`, {
                  state: { streaming: true, projectDescription: data.projectDescription },
                });
                hasNavigated = true;
              } else if (event.type === "complete") {
                // Update with final report and slug
                triggerHaptic("complete");
                completeStreaming(event.report);
                setConnectionState("disconnected");
                // Update URL with final slug (don't change streaming state to avoid re-render issues)
                if (hasNavigated) {
                  window.history.replaceState(
                    { streaming: true, projectDescription: data.projectDescription },
                    "",
                    `/${country.slug}/report/${event.slug}`
                  );
                }
              } else if (event.type === "progress") {
                // Update streaming progress to show real-time feedback
                triggerHaptic("progress");
                updateProgress({
                  chunks: event.chunks || 0,
                  length: event.length || 0,
                  status: event.status || "generating"
                });
                // Update report with partial data if available
                if (event.partial) {
                  updateReport(event.partial);
                }
              } else if (event.type === "error") {
                // Set error in context so streaming skeleton can show it
                setStreamError(event.error);
                setConnectionState("disconnected");
                setIsLoading(false);
                return; // Stop processing - error will be shown by streaming skeleton
              }
            } catch (parseError) {
              console.error("Failed to parse SSE event:", parseError);
            }
          }
        }
      }
    } catch (err) {
      // Check for intentional abort
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      // Check for network-related errors and trigger reconnection
      const isNetworkError =
        err instanceof Error &&
        (err.name === "TypeError" ||
          err.message.includes("network") ||
          err.message.includes("fetch") ||
          err.message.includes("Failed to fetch") ||
          err.message.includes("NetworkError"));

      if (isNetworkError && jobKey) {
        console.log("Network error detected, starting reconnection...");
        setConnectionState("reconnecting");
        startReconnection();
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
      setStreamError(errorMessage);
      setConnectionState("disconnected");
      setIsLoading(false);
    }
  };

  // Handle rejection dismissal
  const handleDismissRejection = () => {
    resetStreaming();
  };

  // Show rejection UI if request was rejected
  if (isRejected && rejection) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-destructive">
              <XCircle className="h-5 w-5" />
              {t('analysis.rejection.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-background p-4">
              <p className="text-sm text-muted-foreground">{rejection.reason}</p>
            </div>

            <div className="rounded-md bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">{t('analysis.rejection.suggestion')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{rejection.suggestion}</p>
                </div>
              </div>
            </div>

            <Button onClick={handleDismissRejection} className="w-full">
              {t('analysis.rejection.tryAgain')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('analysis.form.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Helper note about allowed projects */}
          <div className="mb-4 rounded-md bg-muted/50 border border-muted p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-xs sm:text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{t('analysis.form.allowedProjects.title')}</p>
                <p className="mt-1">{t('analysis.form.allowedProjects.description')}</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-6"
          >
            {/* Project Description */}
            <div className="space-y-2">
              <Label
                htmlFor="projectDescription"
                className="text-sm sm:text-base"
              >
                {t('analysis.form.projectDescription.label')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="projectDescription"
                placeholder={t('analysis.form.projectDescription.placeholder')}
                className="min-h-[120px] sm:min-h-[150px] resize-y text-sm sm:text-base"
                onFocus={handleTextareaFocus}
                {...register("projectDescription")}
              />
              {errors.projectDescription && (
                <p className="text-xs sm:text-sm text-destructive">
                  {errors.projectDescription.message}
                </p>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {t('analysis.form.projectDescription.hint')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 sm:p-4 text-xs sm:text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full text-sm sm:text-base"
              disabled={isLoading || isValidating}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  {t('analysis.form.validating')}
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  {t('analysis.form.analyzing')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('analysis.form.submit')}
                </>
              )}
            </Button>

            <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
              {t('report.disclaimer')}
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
