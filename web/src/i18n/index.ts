import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

const resources = {
  en: {
    translation: en,
  },
  ru: {
    translation: ru,
  },
};

const savedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem('language') : null;
const browserLanguage =
  typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : 'en';
const initialLanguage = savedLanguage ?? (browserLanguage === 'ru' ? 'ru' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lang) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('language', lang);
  }
});

export default i18n;
