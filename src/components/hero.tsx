import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { CountryConfig } from "@/lib/countries";

interface HeroProps {
  country: CountryConfig;
}

export function Hero({ country }: HeroProps) {
  const { t } = useTranslation();

  return (
    <section className="border-b bg-muted/30">
      <div className="container py-3 sm:py-6 md:py-10">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-base font-semibold tracking-tight sm:text-xl md:text-3xl">
            {t('analysis.title')}
          </h1>
        </motion.div>
      </div>
    </section>
  );
}
