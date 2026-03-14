import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Placeholder translations - will mirror existing frontend/locales/
const resources = {
  en: {
    translation: {
      "hello": "Hello World",
      "dashboard": "Dashboard"
    }
  },
  ru: {
    translation: {
      "hello": "Привет, мир",
      "dashboard": "Дашборд"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
