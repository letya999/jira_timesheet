import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

type LocaleData = Record<string, Record<string, unknown>>;

function buildResources(enData: LocaleData, ruData: LocaleData) {
  const enNs: Record<string, unknown> = { translation: enData };
  const ruNs: Record<string, unknown> = { translation: ruData };
  for (const ns of Object.keys(enData)) {
    enNs[ns] = enData[ns];
    ruNs[ns] = (ruData[ns] as unknown) ?? enData[ns];
  }
  return { en: enNs, ru: ruNs };
}

const resources = buildResources(en as LocaleData, ru as LocaleData);
const availableNS = ['translation', ...Object.keys(en)];

const savedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem('language') : null;
const browserLanguage =
  typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : 'en';
const initialLanguage = savedLanguage ?? (browserLanguage === 'ru' ? 'ru' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    ns: availableNS,
    defaultNS: 'translation',
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
