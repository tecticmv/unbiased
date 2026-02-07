import { useState } from "react";
import { Scale, Github, Twitter, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { countries } from "@/lib/countries";
import { CountryRequestModal } from "@/components/country-request-modal";

export function Footer() {
  const { t } = useTranslation();
  const [countryRequestOpen, setCountryRequestOpen] = useState(false);

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Scale className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">{t('common.appName')}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('home.countries.title')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {Object.keys(countries).map((code) => (
                <li key={code}>
                  <Link to={`/${code}`} className="hover:text-foreground">
                    {t(`countries.${code}`)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setCountryRequestOpen(true)}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Globe className="h-3 w-3" />
                  {t('countryRequest.requestNew')}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('nav.about')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#how-it-works" className="hover:text-foreground">
                  {t('home.hero.learnMore')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('footer.contact')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  {t('footer.privacy')}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  {t('footer.terms')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {t('common.appName')}. {t('footer.copyright')}
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('footer.githubLabel')}
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('footer.twitterLabel')}
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      <CountryRequestModal
        open={countryRequestOpen}
        onOpenChange={setCountryRequestOpen}
      />
    </footer>
  );
}
