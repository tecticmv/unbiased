import { useTranslation } from "react-i18next";
import {
  FileText,
  MessagesSquare,
  TrendingUp,
  Target,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface StatsOverview {
  totalReports: number;
  activeDiscussions: number;
  recentActivity: number;
  avgFeasibilityScore: number;
}

interface AnalyticsDashboardProps {
  overview: StatsOverview;
}

export function AnalyticsDashboard({ overview }: AnalyticsDashboardProps) {
  const { t } = useTranslation();

  return (
    <section className="py-16 lg:py-20">
      <div className="container">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              {t("home.analytics.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("home.analytics.subtitle")}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
          <StatCard
            title={t("home.analytics.totalReports")}
            value={overview.totalReports.toLocaleString()}
            numericValue={overview.totalReports}
            prefix="+"
            padZero
            icon={FileText}
            iconColor="text-blue-600"
          />
          <StatCard
            title={t("home.analytics.activeDiscussions")}
            value={overview.activeDiscussions.toLocaleString()}
            numericValue={overview.activeDiscussions}
            prefix="+"
            padZero
            icon={MessagesSquare}
            iconColor="text-emerald-600"
          />
          <StatCard
            title={t("home.analytics.recentActivity")}
            value={overview.recentActivity.toLocaleString()}
            numericValue={overview.recentActivity}
            prefix="+"
            padZero
            icon={TrendingUp}
            iconColor="text-amber-600"
          />
          <StatCard
            title={t("home.analytics.overallFeasibility")}
            value={`${overview.avgFeasibilityScore}%`}
            numericValue={overview.avgFeasibilityScore}
            suffix="%"
            icon={Target}
            iconColor="text-purple-600"
          />
        </div>
      </div>
    </section>
  );
}
