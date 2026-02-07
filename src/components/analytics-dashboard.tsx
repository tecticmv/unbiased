import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  MessagesSquare,
  TrendingUp,
  Target,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { CategoryBreakdownChart } from "@/components/category-breakdown-chart";
import { ScoreDistributionChart } from "@/components/score-distribution-chart";
import { StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";

interface StatsOverview {
  totalReports: number;
  activeDiscussions: number;
  recentActivity: number;
  avgFeasibilityScore: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface StatsResponse {
  overview: StatsOverview;
  categoryBreakdown: CategoryBreakdown[];
  scoreDistribution: ScoreDistribution[];
  trending: {
    reports: unknown[];
    discussions: unknown[];
  };
}

export function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Gracefully hide if loading fails or no data
  if (loading) {
    return (
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <div className="h-8 bg-muted animate-pulse rounded w-64 mx-auto mb-4" />
            <div className="h-4 bg-muted animate-pulse rounded w-96 mx-auto" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-card animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!stats) return null;

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {t("home.analytics.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("home.analytics.subtitle")}
          </p>
        </div>

        {/* Stats Overview Grid */}
        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <StaggerItem>
            <StatCard
              title={t("home.analytics.totalReports")}
              value={stats.overview.totalReports.toLocaleString()}
              icon={FileText}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100 dark:bg-blue-950"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              title={t("home.analytics.activeDiscussions")}
              value={stats.overview.activeDiscussions.toLocaleString()}
              icon={MessagesSquare}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-100 dark:bg-emerald-950"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              title={t("home.analytics.recentActivity")}
              value={stats.overview.recentActivity.toLocaleString()}
              subtitle={t("home.analytics.lastSevenDays")}
              icon={TrendingUp}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-100 dark:bg-amber-950"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              title={t("home.analytics.avgScore")}
              value={`${stats.overview.avgFeasibilityScore}%`}
              subtitle={t("home.analytics.overallFeasibility")}
              icon={Target}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100 dark:bg-purple-950"
            />
          </StaggerItem>
        </StaggerContainer>

        {/* Charts Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          <CategoryBreakdownChart data={stats.categoryBreakdown} />
          <ScoreDistributionChart data={stats.scoreDistribution} />
        </div>
      </div>
    </section>
  );
}
