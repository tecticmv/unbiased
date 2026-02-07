import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  Scale,
  ArrowRight,
  Shield,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { defaultCountry } from "@/lib/countries";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/scroll-reveal";
import { ReportCard } from "@/components/report-card";
import type { FeasibilityReport } from "@/types";

interface RecentReport {
  id: string;
  slug: string;
  country: string;
  projectDescription: string;
  projectType: string;
  location: string | null;
  estimatedCost: number | null;
  report: FeasibilityReport;
  createdAt: string;
}

export function HomePage() {
  const { t } = useTranslation();
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentReports = async () => {
      try {
        const response = await fetch("/api/reports?limit=4");
        if (response.ok) {
          const data = await response.json();
          setRecentReports(data.reports);
        }
      } catch (error) {
        console.error("Failed to fetch recent reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentReports();
  }, []);

  const features = [
    {
      icon: BarChart3,
      titleKey: "home.features.realData.title",
      descKey: "home.features.realData.description",
    },
    {
      icon: TrendingUp,
      titleKey: "home.features.demandAnalysis.title",
      descKey: "home.features.demandAnalysis.description",
    },
    {
      icon: DollarSign,
      titleKey: "home.features.budgetAlignment.title",
      descKey: "home.features.budgetAlignment.description",
    },
    {
      icon: Shield,
      titleKey: "home.features.transparent.title",
      descKey: "home.features.transparent.description",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container relative py-20 md:py-28 lg:py-36">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary ring-1 ring-primary/20">
              <Scale className="h-4 w-4" />
              <span>{t('common.tagline')}</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl xl:text-7xl">
              {t('home.hero.title')}
            </h1>

            <p className="mb-10 text-base text-muted-foreground md:text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
              {t('home.hero.description')}
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="xl" className="min-w-[200px]">
                <Link to={`/${defaultCountry}/new`}>
                  {t('home.hero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="min-w-[200px]">
                <Link to={`/${defaultCountry}/reports`}>
                  {t('home.hero.viewReports') || 'View Reports'}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28" id="how-it-works">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold mb-3">
              {t('home.features.title') || 'Why Use Unbiased?'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('home.features.subtitle') || 'Data-driven insights to help you make informed decisions'}
            </p>
          </div>

          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <StaggerItem key={feature.titleKey}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105 border-muted/40">
                  <CardContent className="pt-6">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(feature.descKey)}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Recent Analyses Section */}
      {!loading && recentReports.length > 0 && (
        <section className="py-20 lg:py-28 bg-muted/20 border-y">
          <div className="container">
            <ScrollReveal>
              <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold mb-3">
                  {t('home.recentAnalyses.title') || 'Recent Feasibility Analyses'}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t('home.recentAnalyses.description') || 'Explore the latest project analyses from our community'}
                </p>
              </div>
            </ScrollReveal>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentReports.map((report, index) => (
                <ReportCard
                  key={report.slug}
                  slug={report.slug}
                  country={report.country}
                  projectDescription={report.projectDescription}
                  location={report.location}
                  projectType={report.projectType}
                  report={report.report}
                  createdAt={report.createdAt}
                  index={index}
                />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button asChild variant="outline" size="lg">
                <Link to={`/${defaultCountry}/reports`}>
                  {t('home.recentAnalyses.viewAll') || 'View All Reports'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Analysis Categories */}
      <section className="border-t bg-muted/30 py-20 overflow-hidden relative">
        <div className="container mb-12">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-3">
                {t('home.categories.title') || 'Comprehensive Analysis Across 6 Categories'}
              </h2>
              <p className="text-muted-foreground">
                {t('home.categories.description') || 'Every project is evaluated across multiple dimensions to provide you with a complete feasibility assessment'}
              </p>
            </div>
          </ScrollReveal>
        </div>

        <style>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .animate-scroll {
            animation: scroll 25s linear infinite;
          }
          .animate-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* Fade overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 md:w-96 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 md:w-96 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 animate-scroll">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-4">
              {[
                { key: "technical" },
                { key: "economic" },
                { key: "environmental" },
                { key: "social" },
                { key: "legal" },
                { key: "operational" },
              ].map((category) => (
                <div
                  key={`${setIndex}-${category.key}`}
                  className="flex-shrink-0 w-72 flex items-start gap-3 rounded-xl border bg-background p-5 shadow-sm hover:shadow-md transition-all hover:scale-105"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-base">{t(`report.categories.${category.key}`)}</h4>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
