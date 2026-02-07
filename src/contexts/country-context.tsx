import { createContext, useContext, useState, ReactNode } from "react";
import { defaultCountry } from "@/lib/countries";

interface CountryContextType {
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [selectedCountry, setSelectedCountryState] = useState<string>(() => {
    // Load from localStorage or use default
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedCountry") || defaultCountry;
    }
    return defaultCountry;
  });

  const setSelectedCountry = (country: string) => {
    setSelectedCountryState(country);
    // Persist to localStorage only if not default country
    if (typeof window !== "undefined") {
      if (country === defaultCountry) {
        // Remove from localStorage if it's the default
        localStorage.removeItem("selectedCountry");
      } else {
        localStorage.setItem("selectedCountry", country);
      }
    }
  };

  return (
    <CountryContext.Provider value={{ selectedCountry, setSelectedCountry }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry must be used within CountryProvider");
  }
  return context;
}
