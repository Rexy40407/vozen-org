/* Shared ecosystem locale access for the React Helper workspace.  The public
   site owns the catalogue; importing the two browser bundles here keeps the
   Helper on the same locale key and persistence contract without copying the
   328 existing marketing strings into a second application. */
// @ts-ignore The static site catalogue is intentionally consumed as a browser side-effect module.
import '../../../site/js/i18n-v41.js';
// @ts-ignore The workspace overlay extends the generated catalogue at runtime.
import '../../../site/js/i18n-v42.js';

export const SUPPORTED_LOCALES = ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_OPTIONS: Array<{ code: SupportedLocale; flag: string; name: string }> = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'zh', flag: '🇹🇼', name: '繁體中文' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
];

type Dictionary = Record<string, Record<string, string>>;

declare global {
  interface Window {
    VOZEN_I18N?: Dictionary;
  }
}

const LOCALE_KEY = 'vozen.lang';

export function helperLocale(): SupportedLocale {
  try {
    const value = window.localStorage.getItem(LOCALE_KEY);
    return SUPPORTED_LOCALES.includes(value as SupportedLocale)
      ? (value as SupportedLocale)
      : 'en';
  } catch {
    return 'en';
  }
}

export function setHelperLocale(value: string): SupportedLocale {
  const locale = SUPPORTED_LOCALES.includes(value as SupportedLocale)
    ? (value as SupportedLocale)
    : 'en';
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // The workspace still changes language for the current render if storage is blocked.
  }
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent('vozen:languagechange', { detail: { language: locale } }));
  return locale;
}

function interpolate(value: string, variables?: Record<string, string | number>): string {
  if (!variables) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(variables[key] ?? `{${key}}`));
}

export function helperT(
  key: string,
  fallback: string,
  variables?: Record<string, string | number>,
): string {
  const locale = helperLocale();
  const dictionary = window.VOZEN_I18N ?? {};
  const value = dictionary[locale]?.[key] ?? dictionary.en?.[key] ?? fallback;
  return interpolate(value, variables);
}

export function localeName(locale: SupportedLocale): string {
  return LOCALE_OPTIONS.find((option) => option.code === locale)?.name ?? 'English';
}

export function syncHelperDocumentLocale(): void {
  const locale = helperLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}
