import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, Plus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CountryRequestModal } from "@/components/country-request-modal";
import { countries } from "@/lib/countries";

interface CountrySelectorProps {
  currentCountry: string;
}

export function CountrySelector({ currentCountry }: CountrySelectorProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const currentCountryConfig = countries[currentCountry];
  const currentName = t(`countries.${currentCountry}`);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-auto min-w-[80px] sm:min-w-[160px] justify-between">
            <span className="flex items-center gap-2 truncate">
              {currentCountryConfig && (
                <img
                  src={`https://flagcdn.com/16x12/${currentCountryConfig.code.toLowerCase()}.png`}
                  srcSet={`https://flagcdn.com/32x24/${currentCountryConfig.code.toLowerCase()}.png 2x`}
                  width="16"
                  height="12"
                  alt={currentCountryConfig.name}
                  className="rounded-sm"
                />
              )}
              <span className="hidden sm:inline">{currentName}</span>
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {Object.entries(countries).map(([code, config]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => navigate(`/${code}`)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <img
                  src={`https://flagcdn.com/16x12/${config.code.toLowerCase()}.png`}
                  srcSet={`https://flagcdn.com/32x24/${config.code.toLowerCase()}.png 2x`}
                  width="16"
                  height="12"
                  alt={config.name}
                  className="rounded-sm"
                />
                <span>{t(`countries.${code}`)}</span>
              </span>
              {code === currentCountry && (
                <Check className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setRequestModalOpen(true)}
            className="flex items-center gap-2 text-primary"
          >
            <Plus className="h-4 w-4" />
            {t("countryRequest.requestNew", "Request a country")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CountryRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
      />
    </>
  );
}
