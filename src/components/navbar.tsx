import { Link, useParams } from "react-router-dom";
import { Scale, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/theme-toggle";
import { CountrySelector } from "@/components/country-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultCountry } from "@/lib/countries";
import { languages, type LanguageCode } from "@/i18n";

export function Navbar() {
  const { country } = useParams();
  const { t, i18n } = useTranslation();
  const currentCountry = country || defaultCountry;
  const currentLanguage = i18n.language as LanguageCode;
  const currentLangName = languages.find(l => l.code === currentLanguage)?.nativeName || 'English';

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary">
            <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold sm:text-xl">{t('common.appName')}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-4">
          {/* Country selector with request option */}
          <CountrySelector currentCountry={currentCountry} />

          {/* Language selector - icon only on mobile */}
          <Select
            value={currentLanguage}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger className="w-auto min-w-[44px] sm:min-w-[100px]">
              <Globe className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {currentLangName}
              </span>
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
