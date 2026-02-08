import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Cpu,
  DollarSign,
  Leaf,
  Users,
  Scale,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultCountry } from "@/lib/countries";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/scroll-reveal";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { HotTopicsSection } from "@/components/hot-topics-section";
import { DottedMap } from "@/registry/magicui/dotted-map";

const countryMarkers = [
  { lat: 4.1755, lng: 73.5093, size: 0.4 },   // Maldives (Malé)
  { lat: 28.6139, lng: 77.209, size: 0.4 },    // India (New Delhi)
  { lat: 23.8103, lng: 90.4125, size: 0.4 },   // Bangladesh (Dhaka)
  { lat: 6.9271, lng: 79.8612, size: 0.4 },    // Sri Lanka (Colombo)
];

const categories = [
  { key: "technical", icon: Cpu, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-100 dark:border-blue-900/50" },
  { key: "economic", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-100 dark:border-emerald-900/50" },
  { key: "environmental", icon: Leaf, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-100 dark:border-green-900/50" },
  { key: "social", icon: Users, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-100 dark:border-amber-900/50" },
  { key: "legal", icon: Scale, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-100 dark:border-purple-900/50" },
  { key: "operational", icon: Settings, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-100 dark:border-rose-900/50" },
];

export function HomePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);

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
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background min-h-[calc(100svh-4rem)] flex items-center">
        {/* Map background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full max-w-6xl px-8 md:px-16 opacity-30 dark:opacity-20">
            <DottedMap markers={countryMarkers} markerColor="hsl(var(--primary))" />
          </div>
        </div>

        <div className="container relative py-20 md:py-28 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                {t('home.hero.subtitle')}
              </span>
            </motion.div>

            <motion.h1
              className="mb-5 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t('home.hero.title')}
            </motion.h1>

            <motion.p
              className="mb-10 text-base text-muted-foreground md:text-lg max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t('home.hero.description')}
            </motion.p>

            <motion.div
              className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button asChild size="xl" className="min-w-[200px]">
                <Link to={`/${defaultCountry}/new`}>
                  {t('home.hero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="min-w-[200px]">
                <Link to={`/${defaultCountry}`}>
                  {t('home.hero.viewReports') || 'View Reports'}
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <motion.div
            className="w-5 h-8 rounded-full border-2 border-current flex justify-center pt-1.5"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div className="w-1 h-1.5 rounded-full bg-current" />
          </motion.div>
        </motion.div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* Analysis Categories — what the platform evaluates */}
      <section className="py-16 lg:py-20 bg-muted/40">
        <div className="container">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-3">
                {t('learnMore.categories.title')}
              </h2>
              <p className="text-muted-foreground">
                {t('learnMore.categories.description')}
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <StaggerItem key={category.key}>
                  <div className={`rounded-xl border ${category.border} bg-white dark:bg-card p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-full`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 h-12 w-12 rounded-xl ${category.bg} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base mb-1">{t(`report.categories.${category.key}`)}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t(`learnMore.categories.${category.key}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* Platform Stats — social proof */}
      {stats?.overview && (
        <AnalyticsDashboard overview={stats.overview} />
      )}

      {/* Trending Reports — live content */}
      {stats?.trending && (
        <HotTopicsSection data={stats.trending} />
      )}

      {/* Closing CTA */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <ScrollReveal>
            <div className="relative rounded-2xl border bg-gradient-to-br from-muted/50 via-background to-muted/50 p-8 md:p-12 lg:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                  {t('home.features.title')}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                  {t('home.features.subtitle')}
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button asChild size="lg">
                    <Link to={`/${defaultCountry}/new`}>
                      {t('home.hero.cta')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost">
                    <Link to={`/${defaultCountry}`}>
                      {t('home.hero.viewReports') || 'View Reports'}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
