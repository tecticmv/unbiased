export interface CountryConfig {
  slug: string;
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  regions: string[];
  projectTypes: string[];
  description: string;
}

export const countries: Record<string, CountryConfig> = {
  maldives: {
    slug: "maldives",
    code: "MV",
    name: "Maldives",
    currency: "MVR",
    currencySymbol: "MVR",
    flag: "🇲🇻",
    regions: [
      "Malé",
      "Hulhumalé",
      "Addu City",
      "Fuvahmulah",
      "Kulhudhuffushi",
      "Thinadhoo",
      "Haa Alifu Atoll",
      "Haa Dhaalu Atoll",
      "Shaviyani Atoll",
      "Noonu Atoll",
      "Raa Atoll",
      "Baa Atoll",
      "Lhaviyani Atoll",
      "Kaafu Atoll",
      "Alifu Alifu Atoll",
      "Alifu Dhaalu Atoll",
      "Vaavu Atoll",
      "Meemu Atoll",
      "Faafu Atoll",
      "Dhaalu Atoll",
      "Thaa Atoll",
      "Laamu Atoll",
      "Gaafu Alifu Atoll",
      "Gaafu Dhaalu Atoll",
      "Gnaviyani Atoll",
      "Seenu Atoll",
    ],
    projectTypes: [
      "Infrastructure",
      "Tourism",
      "Housing",
      "Energy",
      "Transportation",
      "Healthcare",
      "Education",
      "Land Reclamation",
      "Coastal Protection",
      "Water & Sanitation",
      "Telecommunications",
      "Fisheries",
    ],
    description:
      "Analyze infrastructure, tourism, and climate-resilient development projects in the Maldives.",
  },
  india: {
    slug: "india",
    code: "IN",
    name: "India",
    currency: "INR",
    currencySymbol: "₹",
    flag: "🇮🇳",
    regions: [
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chhattisgarh",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal",
      "Delhi NCR",
      "Mumbai",
      "Bengaluru",
      "Chennai",
      "Kolkata",
      "Hyderabad",
    ],
    projectTypes: [
      "Infrastructure",
      "Smart City",
      "Housing",
      "Energy",
      "Transportation",
      "Healthcare",
      "Education",
      "Manufacturing",
      "Agriculture",
      "Water & Sanitation",
      "Digital Infrastructure",
      "Metro Rail",
      "Highway",
      "Industrial Corridor",
    ],
    description:
      "Evaluate development projects across India's diverse states and sectors.",
  },
  bangladesh: {
    slug: "bangladesh",
    code: "BD",
    name: "Bangladesh",
    currency: "BDT",
    currencySymbol: "৳",
    flag: "🇧🇩",
    regions: [
      "Dhaka",
      "Chittagong",
      "Khulna",
      "Rajshahi",
      "Sylhet",
      "Rangpur",
      "Barisal",
      "Mymensingh",
      "Cox's Bazar",
      "Gazipur",
      "Narayanganj",
    ],
    projectTypes: [
      "Infrastructure",
      "Garment Industry",
      "Housing",
      "Energy",
      "Transportation",
      "Healthcare",
      "Education",
      "Flood Control",
      "Water & Sanitation",
      "Bridge & Flyover",
      "Port Development",
      "Special Economic Zone",
    ],
    description:
      "Assess infrastructure and industrial development projects in Bangladesh.",
  },
  srilanka: {
    slug: "srilanka",
    code: "LK",
    name: "Sri Lanka",
    currency: "LKR",
    currencySymbol: "Rs",
    flag: "🇱🇰",
    regions: [
      "Colombo",
      "Kandy",
      "Galle",
      "Jaffna",
      "Negombo",
      "Trincomalee",
      "Anuradhapura",
      "Batticaloa",
      "Ratnapura",
      "Matara",
      "Hambantota",
    ],
    projectTypes: [
      "Infrastructure",
      "Tourism",
      "Housing",
      "Energy",
      "Transportation",
      "Healthcare",
      "Education",
      "Port Development",
      "Agriculture",
      "Water & Sanitation",
      "Telecommunications",
      "Urban Development",
    ],
    description:
      "Evaluate development and reconstruction projects across Sri Lanka.",
  },
};

export const defaultCountry = "maldives";

export function getCountry(code: string): CountryConfig | undefined {
  return countries[code.toLowerCase()];
}

export function getAllCountries(): CountryConfig[] {
  return Object.values(countries);
}

export function getCountryCodes(): string[] {
  return Object.keys(countries);
}
