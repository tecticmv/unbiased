import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Markdown } from "@/components/ui/markdown";
import type { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
}

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
};

const getScoreBg = (score: number) => {
  if (score >= 70) return "bg-emerald-500/10 border-emerald-500/25";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/25";
  return "bg-red-500/10 border-red-500/25";
};

const getScoreBar = (score: number) => {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
};

export function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useTranslation();

  const score = category?.score ?? 0;
  const name = category?.name ?? '';
  const summary = category?.summary ?? '';
  const pros = category?.pros ?? [];
  const cons = category?.cons ?? [];

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${getScoreBg(score)}`}>
          <span className={`text-xl font-bold tabular-nums ${getScoreColor(score)}`}>{score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">{name}</h3>
          {summary && (
            <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              <Markdown>{summary}</Markdown>
            </div>
          )}
          <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getScoreBar(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pros and Cons */}
      <div className="grid gap-4 sm:grid-cols-2">
        {pros.length > 0 && (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('report.pros')}
            </h4>
            <ul className="space-y-2.5">
              {pros.map((pro, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  <span className="leading-relaxed text-muted-foreground"><Markdown>{pro ?? ''}</Markdown></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cons.length > 0 && (
          <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              <XCircle className="h-3.5 w-3.5" />
              {t('report.cons')}
            </h4>
            <ul className="space-y-2.5">
              {cons.map((con, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-500" />
                  <span className="leading-relaxed text-muted-foreground"><Markdown>{con ?? ''}</Markdown></span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {category?.recommendations && category.recommendations.length > 0 && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <Lightbulb className="h-3.5 w-3.5" />
            {t('report.recommendations')}
          </h4>
          <ul className="space-y-2.5">
            {category.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                <span className="leading-relaxed text-muted-foreground"><Markdown>{rec ?? ''}</Markdown></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
