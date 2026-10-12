import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { sessionStore } from '@/lib/storage';

import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isLocale,
  type Locale,
} from './config';
import { buildResources } from './resources';
import { installZodErrorMap } from './validation';

/**
 * i18next singleton.
 *  - English on first visit regardless of browser language; the choice persists in sessionStorage.
 *  - Switching language never remounts the app: react-i18next re-renders subscribers in place.
 *  - <html lang> follows the active language (so Bulgarian typography / screen readers apply).
 */

export function readStoredLanguage(): Locale {
  const stored = sessionStore.get(LANGUAGE_STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

function applyDocumentLanguage(lang: Locale): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = 'ltr';
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', i18n.t('app.description'));
}

const resources = buildResources();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: resources.en },
    bg: { translation: resources.bg },
  },
  lng: readStoredLanguage(),
  fallbackLng: FALLBACK_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  load: 'languageOnly',
  initAsync: false,
  returnNull: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

installZodErrorMap();
applyDocumentLanguage(getLanguage());

i18n.on('languageChanged', (lng) => {
  if (!isLocale(lng)) return;
  sessionStore.set(LANGUAGE_STORAGE_KEY, lng);
  applyDocumentLanguage(lng);
});

/** Active UI language. */
export function getLanguage(): Locale {
  const lng = i18n.resolvedLanguage ?? i18n.language;
  return isLocale(lng) ? lng : DEFAULT_LOCALE;
}

/** Switches the UI language (persists for the session, updates <html lang>). */
export async function setLanguage(lang: Locale): Promise<void> {
  await i18n.changeLanguage(lang);
}

export { i18n };
export default i18n;
