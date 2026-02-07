import { useParams, Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Hero } from "@/components/hero";
import { AnalysisForm } from "@/components/analysis-form";
import { Button } from "@/components/ui/button";
import { getCountry, defaultCountry } from "@/lib/countries";

export function NewAnalysisPage() {
  const { country } = useParams();
  const { t } = useTranslation();
  const countryConfig = getCountry(country || defaultCountry);

  if (!countryConfig) {
    return <Navigate to={`/${defaultCountry}`} replace />;
  }

  return (
    <div className="flex flex-col">
      <Hero country={countryConfig} />
      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Button
              variant="ghost"
              asChild
              className="mb-6 gap-2"
            >
              <Link to={`/${countryConfig.slug}`}>
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Link>
            </Button>
            <AnalysisForm country={countryConfig} />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
