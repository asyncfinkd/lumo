// All user-facing copy goes through i18n from day one (#35). English only in
// v1; Georgian comes in v1.1 (#20) as a second resource file.

import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en.json';

export const resources = { en: { translation: en } } as const;
export const supportedLanguages = ['en'] as const;

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

const i18n = createInstance();
i18n.use(initReactI18next).init({
  // Resources are bundled, so finish before the first render.
  initAsync: false,
  resources,
  lng: (supportedLanguages as readonly string[]).includes(deviceLanguage) ? deviceLanguage : 'en',
  fallbackLng: 'en',
  // React already escapes text.
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
