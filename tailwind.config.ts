import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        "ink-black": {
          50: "var(--color-ink-black-50)",
          100: "var(--color-ink-black-100)",
          200: "var(--color-ink-black-200)",
          300: "var(--color-ink-black-300)",
          400: "var(--color-ink-black-400)",
          500: "var(--color-ink-black-500)",
          600: "var(--color-ink-black-600)",
          700: "var(--color-ink-black-700)",
          800: "var(--color-ink-black-800)",
          900: "var(--color-ink-black-900)",
          950: "var(--color-ink-black-950)",
        },
        "dark-teal": {
          50: "var(--color-dark-teal-50)",
          100: "var(--color-dark-teal-100)",
          200: "var(--color-dark-teal-200)",
          300: "var(--color-dark-teal-300)",
          400: "var(--color-dark-teal-400)",
          500: "var(--color-dark-teal-500)",
          600: "var(--color-dark-teal-600)",
          700: "var(--color-dark-teal-700)",
          800: "var(--color-dark-teal-800)",
          900: "var(--color-dark-teal-900)",
          950: "var(--color-dark-teal-950)",
        },
        "ocean-blue": {
          50: "var(--color-ocean-blue-50)",
          100: "var(--color-ocean-blue-100)",
          200: "var(--color-ocean-blue-200)",
          300: "var(--color-ocean-blue-300)",
          400: "var(--color-ocean-blue-400)",
          500: "var(--color-ocean-blue-500)",
          600: "var(--color-ocean-blue-600)",
          700: "var(--color-ocean-blue-700)",
          800: "var(--color-ocean-blue-800)",
          900: "var(--color-ocean-blue-900)",
          950: "var(--color-ocean-blue-950)",
        },
        "sky-surge": {
          50: "var(--color-sky-surge-50)",
          100: "var(--color-sky-surge-100)",
          200: "var(--color-sky-surge-200)",
          300: "var(--color-sky-surge-300)",
          400: "var(--color-sky-surge-400)",
          500: "var(--color-sky-surge-500)",
          600: "var(--color-sky-surge-600)",
          700: "var(--color-sky-surge-700)",
          800: "var(--color-sky-surge-800)",
          900: "var(--color-sky-surge-900)",
          950: "var(--color-sky-surge-950)",
        },
        "bright-sky": {
          50: "var(--color-bright-sky-50)",
          100: "var(--color-bright-sky-100)",
          200: "var(--color-bright-sky-200)",
          300: "var(--color-bright-sky-300)",
          400: "var(--color-bright-sky-400)",
          500: "var(--color-bright-sky-500)",
          600: "var(--color-bright-sky-600)",
          700: "var(--color-bright-sky-700)",
          800: "var(--color-bright-sky-800)",
          900: "var(--color-bright-sky-900)",
          950: "var(--color-bright-sky-950)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
