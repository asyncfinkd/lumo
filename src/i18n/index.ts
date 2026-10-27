// All user-facing copy goes through i18n from day one (#35). English and
// Georgian (#20); the app follows the phone's language until you pick one in
// Profile → Language.

import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en.json';
import ka from './ka.json';

export const resources = { en: { translation: en }, ka: { translation: ka } } as const;
export const supportedLanguages = ['en', 'ka'] as const;
export type Language = (typeof supportedLanguages)[number];

const isSupported = (code: string | null | undefined): code is Language =>
  (supportedLanguages as readonly string[]).includes(code ?? '');

/** The phone's language if Lumo has it, else English. */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return isSupported(code) ? code : 'en';
}

const i18n = createInstance();
i18n.use(initReactI18next).init({
  // Resources are bundled, so finish before the first render.
  initAsync: false,
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  // React already escapes text.
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Switches to the saved language (`null`: the phone's). */
export function applyLanguage(saved: string | null | undefined): void {
  const next = isSupported(saved) ? saved : deviceLanguage();
  if (i18n.language !== next) i18n.changeLanguage(next);
}

export default i18n;
