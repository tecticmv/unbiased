import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Markdown } from "@/components/ui/markdown";
import type { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
}

// Get score color based on value
const getScoreColor = (score: number) => {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

const getScoreBg = (score: number) => {
  if (score >= 70) return "bg-transparent border-green-200 dark:border-green-900";
  if (score >= 50) return "bg-transparent border-yellow-200 dark:border-yellow-900";
  return "bg-transparent border-red-200 dark:border-red-900";
};

export function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useTranslation();

  const score = category?.score ?? 0;
  const name = category?.name ?? '';
  const summary = category?.summary ?? '';
  const pros = category?.pros ?? [];
  const cons = category?.cons ?? [];

  return (
    <div className="space-y-5">
      {/* Score Header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 ${getScoreBg(score)}`}>
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold">{name}</h3>
          {summary && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              <Markdown>{summary}</Markdown>
            </p>
          )}
        </div>
      </div>

      {/* Pros and Cons */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pros */}
        {pros.length > 0 && (
          <div className="rounded-lg border bg-transparent p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {t('report.pros')}
            </h4>
            <ul className="space-y-2.5">
              {pros.map((pro, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-transparent border text-[10px] font-medium">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed text-muted-foreground"><Markdown>{pro ?? ''}</Markdown></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons */}
        {cons.length > 0 && (
          <div className="rounded-lg border bg-transparent p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              {t('report.cons')}
            </h4>
            <ul className="space-y-2.5">
              {cons.map((con, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-transparent border text-[10px] font-medium">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed text-muted-foreground"><Markdown>{con ?? ''}</Markdown></span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {category?.recommendations && category.recommendations.length > 0 && (
        <div className="rounded-lg border bg-transparent p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            {t('report.recommendations')}
          </h4>
          <ul className="space-y-2.5">
            {category.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 text-sm"
              >
                <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-transparent border text-[10px] font-medium">
                  {index + 1}
                </span>
                <span className="leading-relaxed text-muted-foreground"><Markdown>{rec ?? ''}</Markdown></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
