import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { projectCategoryLabels } from "@/types";

interface CategoryBreakdownData {
  category: string;
  count: number;
  percentage: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryBreakdownData[];
}

// Color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  government: "#6366f1", // indigo
  infrastructure: "#f59e0b", // amber
  transportation: "#8b5cf6", // violet
  housing: "#10b981", // emerald
  commercial: "#3b82f6", // blue
  social: "#ec4899", // pink
  economic: "#14b8a6", // teal
  environmental: "#22c55e", // green
  healthcare: "#ef4444", // red
  education: "#f97316", // orange
  other: "#6b7280", // gray
};

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "dv";

  if (!data || data.length === 0) {
    return null;
  }

  const chartData = data.map((item) => ({
    name: projectCategoryLabels[item.category as keyof typeof projectCategoryLabels] || item.category,
    value: item.count,
    percentage: item.percentage,
    fill: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other,
  }));

  return (
    <ScrollReveal>
      <Card>
        <CardContent className="pt-6">
          <div className="h-[300px] w-full" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) =>
                    percentage > 5 ? `${name} (${percentage}%)` : ""
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: 12,
                    direction: isRTL ? "rtl" : "ltr",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string, props: { payload: { percentage: number } }) => [
                    `${value} projects (${props.payload.percentage}%)`,
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "12px",
                    direction: isRTL ? "rtl" : "ltr",
                  }}
                  formatter={(value: string, entry: { payload: { percentage: number } }) =>
                    `${value} (${entry.payload.percentage}%)`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
