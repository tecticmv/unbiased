import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface ScoreDistributionData {
  range: string;
  count: number;
  percentage: number;
}

interface ScoreDistributionChartProps {
  data: ScoreDistributionData[];
}

// Color gradient from red to green based on score ranges
const getBarColor = (range: string): string => {
  switch (range) {
    case "0-20":
      return "#ef4444"; // red-500
    case "20-40":
      return "#f97316"; // orange-500
    case "40-60":
      return "#f59e0b"; // amber-500
    case "60-80":
      return "#84cc16"; // lime-500
    case "80-100":
      return "#22c55e"; // green-500
    default:
      return "#6b7280"; // gray-500
  }
};

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "dv";

  if (!data || data.length === 0) {
    return null;
  }

  const chartData = data.map((item) => ({
    range: item.range,
    count: item.count,
    percentage: item.percentage,
    fill: getBarColor(item.range),
  }));

  return (
    <ScrollReveal>
      <Card>
        <CardContent className="pt-6">
          <div className="h-[300px] w-full" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="range"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  label={{
                    value: t("home.analytics.scoreRange"),
                    position: "insideBottom",
                    offset: -5,
                    style: {
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    },
                  }}
                />
                <YAxis
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  label={{
                    value: t("home.analytics.numberOfProjects"),
                    angle: -90,
                    position: "insideLeft",
                    style: {
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: 12,
                    direction: isRTL ? "rtl" : "ltr",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [
                    `${value} projects`,
                    t("home.analytics.feasibilityScore"),
                  ]}
                  labelFormatter={(label) => `Score: ${label}`}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
