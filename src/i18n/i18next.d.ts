// Typed translation keys: `t('home.leftToSpend')` is checked against en.json.
import 'i18next';
import type en from './en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
