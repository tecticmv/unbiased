/**
 * Shared constants for the API
 */

// Currency mapping for countries
export const countryCurrencies: Record<string, string> = {
  maldives: "MVR",
  india: "INR",
  bangladesh: "BDT",
  srilanka: "LKR",
  malaysia: "MYR",
};

// Supported countries list
export const supportedCountries = [
  {
    code: "maldives",
    name: "Maldives",
    flag: "🇲🇻",
    currency: "MVR",
  },
  {
    code: "india",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
  },
  {
    code: "bangladesh",
    name: "Bangladesh",
    flag: "🇧🇩",
    currency: "BDT",
  },
  {
    code: "srilanka",
    name: "Sri Lanka",
    flag: "🇱🇰",
    currency: "LKR",
  },
  {
    code: "malaysia",
    name: "Malaysia",
    flag: "🇲🇾",
    currency: "MYR",
  },
];

// Language names for translation prompts
export const languageNames: Record<string, string> = {
  dv: "Dhivehi (Maldivian)",
  hi: "Hindi",
  bn: "Bengali",
  si: "Sinhala",
  ta: "Tamil",
  ms: "Malay (Bahasa Melayu)",
};

// Heartbeat timeout for presence tracking
export const HEARTBEAT_TIMEOUT_MS = 30000; // 30 seconds
