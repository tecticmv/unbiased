import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FileText, CheckCircle2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscussionSummaryProps {
  summary: string;
  concludedAt: string;
  className?: string;
}

export function DiscussionSummary({
  summary,
  concludedAt,
  className,
}: DiscussionSummaryProps) {
  const { t, i18n } = useTranslation();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative", className)}
    >
      {/* Success gradient background */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent" />

      <div className="relative rounded-2xl border border-green-200 dark:border-green-800/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-green-100 dark:border-green-800/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-700 dark:text-green-400">
              {t('report.discussion.discussionConcluded')}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(concludedAt)}
            </div>
          </div>
        </div>

        {/* Summary content */}
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 flex-shrink-0">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('report.discussion.summaryLabel')}
              </p>
              <p dir="auto" className="text-sm leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
