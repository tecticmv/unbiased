import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check, Plus } from "lucide-react";
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
import { useCountry } from "@/contexts/country-context";

export function CountrySelector() {
  const { selectedCountry, setSelectedCountry } = useCountry();
  const { t } = useTranslation();
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const currentCountryConfig = countries[selectedCountry];
  const currentName = t(`countries.${selectedCountry}`);

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
              onClick={() => setSelectedCountry(code)}
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
              {code === selectedCountry && (
                <Check className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="p-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestModalOpen(true)}
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("countryRequest.requestNew", "Request a country")}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <CountryRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
      />
    </>
  );
}
