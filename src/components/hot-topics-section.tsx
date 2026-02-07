import { useTranslation } from "react-i18next";
import { Flame, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { TrendingCard } from "@/components/trending-card";
import { Button } from "@/components/ui/button";
import { defaultCountry } from "@/lib/countries";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import type { FeasibilityReport } from "@/types";

interface TrendingReport {
  slug: string;
  country: string;
  projectDescription: string;
  location?: string | null;
  projectType?: string | null;
  report: FeasibilityReport | string;
}

interface HotTopicsData {
  reports: TrendingReport[];
  discussions: unknown[];
}

interface HotTopicsSectionProps {
  data: HotTopicsData;
}

export function HotTopicsSection({ data }: HotTopicsSectionProps) {
  const { t } = useTranslation();

  if (!data.reports || data.reports.length === 0) {
    return null;
  }

  // Split reports into 3 rows, cycling if needed
  const makeRow = (offset: number) => {
    const items: TrendingReport[] = [];
    for (let i = 0; i < Math.max(4, data.reports.length); i++) {
      items.push(data.reports[(i + offset) % data.reports.length]!);
    }
    return items;
  };

  const rows = [makeRow(0), makeRow(1), makeRow(2)];
  const speeds = ["45s", "55s", "50s"];

  return (
    <section className="py-16 lg:py-20 bg-gradient-to-b from-background via-muted/20 to-background overflow-hidden">
      <div className="container">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-semibold mb-6 shadow-sm">
              <Flame className="h-4 w-4 animate-pulse" />
              <span>{t("home.hotTopics.title")}</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-3">
              {t("home.hotTopics.subtitle")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("home.recentAnalyses.description")}
            </p>
          </div>
        </ScrollReveal>
      </div>

      {/* Marquee rows */}
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-left { animation: marquee-left var(--speed, 40s) linear infinite; }
        .marquee-right { animation: marquee-right var(--speed, 40s) linear infinite; }
        .marquee-left:hover, .marquee-right:hover { animation-play-state: paused; }
      `}</style>

      <div className="space-y-4">
        {rows.map((row, rowIndex) => {
          const fadeWidth = rowIndex === 0
            ? "w-16 md:w-32"
            : rowIndex === 1
              ? "w-28 md:w-56"
              : "w-40 md:w-80";

          return (
            <div key={rowIndex} className="relative">
              <div className={`absolute left-0 top-0 bottom-0 ${fadeWidth} bg-gradient-to-r from-background to-transparent z-10 pointer-events-none`} />
              <div className={`absolute right-0 top-0 bottom-0 ${fadeWidth} bg-gradient-to-l from-background to-transparent z-10 pointer-events-none`} />

              <div
                className={`flex gap-4 ${rowIndex % 2 === 0 ? "marquee-left" : "marquee-right"}`}
                style={{ "--speed": speeds[rowIndex] } as React.CSSProperties}
              >
                {[...Array(2)].map((_, setIndex) => (
                  <div key={setIndex} className="flex gap-4 flex-shrink-0 items-stretch">
                    {row.map((report, i) => (
                      <div key={`${setIndex}-${i}`} className="w-[360px] flex-shrink-0">
                        <TrendingCard
                          slug={report.slug}
                          country={report.country}
                          projectDescription={report.projectDescription}
                          location={report.location}
                          projectType={report.projectType}
                          report={report.report}
                          index={0}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      <div className="container mt-10">
        <div className="flex justify-center">
          <Button asChild variant="outline" size="lg" className="group">
            <Link to={`/${defaultCountry}/reports`}>
              <span>{t("home.recentAnalyses.viewAll") || "View All Reports"}</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
