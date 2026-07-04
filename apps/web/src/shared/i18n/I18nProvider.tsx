import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  translations,
  type Language,
  type TranslationKey,
} from '@/shared/i18n/translations';
import {
  I18nContext,
  type I18nContextValue,
  type TranslationVariables,
} from '@/shared/i18n/I18nContext';

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function applyDocumentLanguage(language: Language) {
  if (typeof document === 'undefined') return;

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  document.documentElement.classList.toggle('rs-rtl', direction === 'rtl');
  document.documentElement.classList.toggle('rs-ltr', direction === 'ltr');
}

function interpolate(template: string, variables?: TranslationVariables) {
  if (!variables) return template;

  return Object.entries(variables).reduce((text, [key, value]) => {
    return text.replaceAll(`{${key}}`, String(value));
  }, template);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readInitialLanguage());

  useEffect(() => {
    applyDocumentLanguage(language);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((currentLanguage) => (currentLanguage === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback(
    (key: TranslationKey, variables?: TranslationVariables) => {
      const localizedText = translations[language][key] ?? translations.en[key] ?? key;
      return interpolate(localizedText, variables);
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr',
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, t, toggleLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
