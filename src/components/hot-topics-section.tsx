import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, MessagesSquare, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { TrendingCard } from "@/components/trending-card";
import { DiscussionPreviewCard } from "@/components/discussion-preview-card";
import { Button } from "@/components/ui/button";
import { defaultCountry } from "@/lib/countries";
import type { FeasibilityReport } from "@/types";

interface TrendingReport {
  slug: string;
  country: string;
  projectDescription: string;
  location?: string | null;
  projectType?: string | null;
  report: FeasibilityReport | string;
}

interface ActiveDiscussion {
  id: number;
  reportSlug: string;
  messageCount: number;
  projectDescription: string;
  projectType?: string | null;
  location?: string | null;
  country: string;
}

interface HotTopicsData {
  reports: TrendingReport[];
  discussions: ActiveDiscussion[];
}

interface HotTopicsSectionProps {
  data: HotTopicsData;
}

export function HotTopicsSection({ data }: HotTopicsSectionProps) {
  const { t } = useTranslation();

  // Don't show section if no data
  if (
    (!data.reports || data.reports.length === 0) &&
    (!data.discussions || data.discussions.length === 0)
  ) {
    return null;
  }

  const hasReports = data.reports && data.reports.length > 0;
  const hasDiscussions = data.discussions && data.discussions.length > 0;

  return (
    <section className="py-16 lg:py-20 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-semibold mb-6 shadow-sm">
            <Flame className="h-4 w-4 animate-pulse" />
            <span>{t("home.hotTopics.title")}</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {t("home.hotTopics.subtitle")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover what's being analyzed and discussed right now
          </p>
        </div>

        {/* Content Grid - Enhanced Layout */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Trending Reports */}
          {hasReports && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {t("home.hotTopics.trending")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Last 7 days
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {data.reports.slice(0, 4).map((report, index) => (
                  <TrendingCard
                    key={report.slug}
                    slug={report.slug}
                    country={report.country}
                    projectDescription={report.projectDescription}
                    location={report.location}
                    projectType={report.projectType}
                    report={report.report}
                    index={index}
                  />
                ))}
              </div>

              {/* View All Button */}
              <div className="pt-4">
                <Button asChild variant="outline" size="lg" className="w-full group">
                  <Link to={`/${defaultCountry}/reports`}>
                    <span>{t("home.recentAnalyses.viewAll") || "View All Reports"}</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Active Discussions */}
          {hasDiscussions && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                    <MessagesSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {t("home.hotTopics.activeDiscussions")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Happening now
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {data.discussions.slice(0, 4).map((discussion, index) => (
                  <DiscussionPreviewCard
                    key={discussion.id}
                    reportSlug={discussion.reportSlug}
                    country={discussion.country}
                    projectDescription={discussion.projectDescription}
                    projectType={discussion.projectType}
                    location={discussion.location}
                    messageCount={discussion.messageCount}
                    index={index}
                  />
                ))}
              </div>

              {/* CTA for starting own discussion */}
              <div className="pt-4">
                <div className="p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 text-center hover:border-primary/50 hover:bg-muted/50 transition-all">
                  <p className="text-sm text-muted-foreground mb-3">
                    Have a project idea? Start your own analysis and discussion
                  </p>
                  <Button asChild size="sm">
                    <Link to={`/${defaultCountry}/new`}>
                      Start Analysis
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
