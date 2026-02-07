import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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

export function HomePage() {
  const { t } = useTranslation();

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
      <section className="relative overflow-hidden bg-gradient-to-b from-ocean-50 to-background dark:from-ocean-950 dark:to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container relative py-24 md:py-32">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
              <Scale className="h-4 w-4" />
              <span>{t('common.tagline')}</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              {t('home.hero.title')}
            </h1>

            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              {t('home.hero.description')}
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="xl">
                <Link to={`/${defaultCountry}`}>
                  {t('home.hero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24" id="how-it-works">
        <div className="container">
          <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <StaggerItem key={feature.titleKey}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="text-muted-foreground">
                      {t(feature.descKey)}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Analysis Categories */}
      <section className="border-t bg-muted/30 py-16 overflow-hidden">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex-shrink-0 md:w-64">
              <h2 className="text-2xl font-bold md:text-3xl">
                {t('report.categories.title')}
              </h2>
            </div>

            <div className="flex-1 overflow-hidden relative">
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
                  animation: scroll 20s linear infinite;
                }
                .animate-scroll:hover {
                  animation-play-state: paused;
                }
              `}</style>
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
                        className="flex-shrink-0 w-64 flex items-start gap-3 rounded-lg border bg-background p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                          <h4 className="font-medium">{t(`report.categories.${category.key}`)}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <ScrollReveal className="mx-auto max-w-3xl rounded-2xl p-8 text-center md:p-12">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {t('home.hero.title')}
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              {t('home.hero.description')}
            </p>
            <Button
              asChild
              size="xl"
              variant="secondary"
            >
              <Link to={`/${defaultCountry}`}>
                {t('home.hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
