import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import dv from './locales/dv.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import si from './locales/si.json';
import ta from './locales/ta.json';

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

const resources = {
  en: { translation: en },
  dv: { translation: dv },
  hi: { translation: hi },
  bn: { translation: bn },
  si: { translation: si },
  ta: { translation: ta },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Note: Don't set `lng` here - let LanguageDetector restore from localStorage
    fallbackLng: 'en',
    supportedLngs: ['en', 'dv', 'hi', 'bn', 'si', 'ta'],
    load: 'languageOnly', // Strip region codes (en-US -> en)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'unbiased-language',
    },
  });

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
  const language = languages.find(l => l.code === lng);
  if (language) {
    document.documentElement.dir = language.dir;
    document.documentElement.lang = lng;
  }
});

// Set initial direction (default to English/LTR)
const currentLang = languages.find(l => l.code === i18n.language) || languages[0];
document.documentElement.dir = currentLang.dir;
document.documentElement.lang = currentLang.code;

export default i18n;
