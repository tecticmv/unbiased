import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Scale,
  Brain,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Shield,
  Zap,
  TrendingUp,
  MessageSquare,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useCountry } from "@/contexts/country-context";

export function LearnMorePage() {
  const { t } = useTranslation();
  const { selectedCountry } = useCountry();

  const howItWorks = [
    {
      icon: Lightbulb,
      titleKey: "learnMore.howItWorks.step1.title",
      descKey: "learnMore.howItWorks.step1.description",
    },
    {
      icon: Brain,
      titleKey: "learnMore.howItWorks.step2.title",
      descKey: "learnMore.howItWorks.step2.description",
    },
    {
      icon: BarChart3,
      titleKey: "learnMore.howItWorks.step3.title",
      descKey: "learnMore.howItWorks.step3.description",
    },
    {
      icon: MessageSquare,
      titleKey: "learnMore.howItWorks.step4.title",
      descKey: "learnMore.howItWorks.step4.description",
    },
  ];

  const features = [
    {
      icon: Brain,
      titleKey: "learnMore.features.aiPowered.title",
      descKey: "learnMore.features.aiPowered.description",
    },
    {
      icon: Users,
      titleKey: "learnMore.features.expertPanel.title",
      descKey: "learnMore.features.expertPanel.description",
    },
    {
      icon: BarChart3,
      titleKey: "learnMore.features.comprehensive.title",
      descKey: "learnMore.features.comprehensive.description",
    },
    {
      icon: Shield,
      titleKey: "learnMore.features.transparent.title",
      descKey: "learnMore.features.transparent.description",
    },
    {
      icon: Zap,
      titleKey: "learnMore.features.fast.title",
      descKey: "learnMore.features.fast.description",
    },
    {
      icon: Globe2,
      titleKey: "learnMore.features.multilingual.title",
      descKey: "learnMore.features.multilingual.description",
    },
  ];

  const categories = [
    {
      key: "technical",
      icon: "🔧",
    },
    {
      key: "economic",
      icon: "💰",
    },
    {
      key: "environmental",
      icon: "🌱",
    },
    {
      key: "social",
      icon: "👥",
    },
    {
      key: "legal",
      icon: "⚖️",
    },
    {
      key: "operational",
      icon: "⚙️",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container relative py-16 md:py-24">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary ring-1 ring-primary/20">
              <Scale className="h-4 w-4" />
              <span>{t('learnMore.badge')}</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {t('learnMore.hero.title')}
            </h1>

            <p className="mb-10 text-base text-muted-foreground md:text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
              {t('learnMore.hero.description')}
            </p>

            <Button asChild size="lg" className="min-w-[200px]">
              <Link to={`/${selectedCountry}/new`}>
                {t('learnMore.hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* What is Unbiased Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                {t('learnMore.whatIs.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('learnMore.whatIs.description')}
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer>
            <div className="grid gap-6 md:grid-cols-2">
              <StaggerItem>
                <Card className="h-full border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold">
                      {t('learnMore.whatIs.card1.title')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('learnMore.whatIs.card1.description')}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold">
                      {t('learnMore.whatIs.card2.title')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('learnMore.whatIs.card2.description')}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t bg-muted/30 py-16 md:py-24">
        <div className="container max-w-6xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                {t('learnMore.howItWorks.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('learnMore.howItWorks.description')}
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step, index) => (
                <StaggerItem key={index}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                      {index + 1}
                    </div>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(step.descKey)}
                    </p>
                    {index < howItWorks.length - 1 && (
                      <div className="absolute -right-4 top-8 hidden lg:block">
                        <ArrowRight className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* Analysis Categories Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                {t('learnMore.categories.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('learnMore.categories.description')}
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <StaggerItem key={category.key}>
                  <Card className="h-full border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="p-6 h-full">
                      <div className="flex items-start gap-3 h-full">
                        <div className="text-3xl flex-shrink-0">{category.icon}</div>
                        <div className="flex-1">
                          <h3 className="mb-1 text-lg font-semibold">
                            {t(`report.categories.${category.key}`)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t(`learnMore.categories.${category.key}`)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="border-t bg-muted/30 py-16 md:py-24">
        <div className="container max-w-6xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                {t('learnMore.features.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('learnMore.features.description')}
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <StaggerItem key={index}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(feature.descKey)}
                      </p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                {t('learnMore.useCases.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('learnMore.useCases.description')}
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer>
            <div className="space-y-4">
              {['infrastructure', 'publicServices', 'environmental', 'technology', 'social'].map((useCase) => (
                <StaggerItem key={useCase}>
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                        <div>
                          <h3 className="mb-1 text-lg font-semibold">
                            {t(`learnMore.useCases.${useCase}.title`)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t(`learnMore.useCases.${useCase}.description`)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-b from-background to-muted/30 py-16 md:py-24">
        <div className="container max-w-4xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                {t('learnMore.cta.title')}
              </h2>
              <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('learnMore.cta.description')}
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="min-w-[200px]">
                  <Link to={`/${selectedCountry}/new`}>
                    {t('learnMore.cta.start')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-w-[200px]">
                  <Link to={`/${selectedCountry}`}>
                    {t('learnMore.cta.browse')}
                  </Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
