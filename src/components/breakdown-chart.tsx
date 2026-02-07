import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Radar as RadarIcon, ListChecks } from "lucide-react";
import type { FeasibilityReport, CategoryKey } from "@/types";
import { categoryLabels } from "@/types";

interface BreakdownChartProps {
  categories: FeasibilityReport["categories"];
}

const getBarColor = (score: number) => {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
};

const getScoreTextColor = (score: number) => {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
};

export function BreakdownChart({ categories }: BreakdownChartProps) {
  const { i18n } = useTranslation();
  const [chartType, setChartType] = useState<"radar" | "progress">("progress");
  const isRTL = i18n.language === "dv";

  if (!categories || typeof categories !== 'object') {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Loading categories...
      </div>
    );
  }

  const data = Object.entries(categories)
    .filter(([key, category]) => category?.score != null && key in categoryLabels)
    .map(([key, category]) => {
      const label = categoryLabels[key as CategoryKey] || key;
      return {
        key,
        name: label.split(" ")[0],
        fullName: category.name || label,
        score: category.score ?? 0,
      };
    });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No category data available
      </div>
    );
  }

  return (
    <div>
      {/* Toggle */}
      <div className="mb-4 flex justify-end gap-1">
        <Button
          variant={chartType === "progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setChartType("progress")}
          className="px-2.5 h-8 rounded-lg text-xs"
        >
          <ListChecks className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Progress</span>
        </Button>
        <Button
          variant={chartType === "radar" ? "default" : "outline"}
          size="sm"
          onClick={() => setChartType("radar")}
          className="px-2.5 h-8 rounded-lg text-xs"
        >
          <RadarIcon className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Radar</span>
        </Button>
      </div>

      {chartType === "progress" ? (
        <div className="space-y-3.5" style={{ direction: isRTL ? "rtl" : "ltr" }}>
          {data.map((item, index) => (
            <motion.div
              key={item.key}
              className="space-y-1.5"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
            >
              <div className="flex items-center justify-between text-sm">
                <span
                  className="font-medium text-foreground"
                  style={{ fontFamily: isRTL ? "'MV Faseyha', sans-serif" : "inherit" }}
                >
                  {item.fullName}
                </span>
                <motion.span
                  className={`font-bold tabular-nums text-xs ${getScoreTextColor(item.score)}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.08 + 0.3 }}
                >
                  {item.score}
                </motion.span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <motion.div
                  className={`h-full rounded-full ${getBarColor(item.score)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.08 + 0.2,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="h-[300px] w-full" style={{ direction: isRTL ? "rtl" : "ltr" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <PolarAngleAxis
                dataKey="name"
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: isRTL ? 12 : 11,
                  fontFamily: isRTL ? "'MV Faseyha', sans-serif" : "inherit",
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                  direction: isRTL ? "rtl" : "ltr",
                  fontFamily: isRTL ? "'MV Faseyha', sans-serif" : "inherit",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value}/100`, "Score"]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
