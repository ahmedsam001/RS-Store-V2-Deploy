import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
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

type AccountStatus = 'loading' | 'anonymous' | 'authenticated';

type I18nProviderProps = {
  children: ReactNode;
  accountStatus?: AccountStatus;
  accountLanguage?: string | null;
  persistLanguage?: (language: Language) => Promise<void>;
};

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

export function I18nProvider({
  children,
  accountStatus = 'anonymous',
  accountLanguage,
  persistLanguage,
}: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() =>
    readInitialLanguage(),
  );
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const languageRef = useRef(language);
  const savingRef = useRef(false);

  const applyLanguage = useCallback((nextLanguage: Language) => {
    languageRef.current = nextLanguage;
    setLanguageState(nextLanguage);
  }, []);

  useEffect(() => {
    applyDocumentLanguage(language);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  useEffect(() => {
    if (
      accountStatus !== 'authenticated' ||
      savingRef.current ||
      !isSupportedLanguage(accountLanguage) ||
      accountLanguage === languageRef.current
    ) {
      return;
    }

    applyLanguage(accountLanguage);
  }, [accountLanguage, accountStatus, applyLanguage]);

  const setLanguage = useCallback(
    async (nextLanguage: Language) => {
      const normalizedLanguage = normalizeLanguage(nextLanguage);
      const previousLanguage = languageRef.current;

      if (normalizedLanguage === previousLanguage) {
        setLanguageError(null);
        return true;
      }

      setLanguageError(null);
      applyLanguage(normalizedLanguage);

      if (accountStatus !== 'authenticated' || !persistLanguage) {
        return true;
      }

      savingRef.current = true;
      setIsSavingLanguage(true);
      try {
        await persistLanguage(normalizedLanguage);
        return true;
      } catch {
        applyLanguage(previousLanguage);
        setLanguageError(translations[previousLanguage]['language.saveFailed']);
        return false;
      } finally {
        savingRef.current = false;
        setIsSavingLanguage(false);
      }
    },
    [accountStatus, applyLanguage, persistLanguage],
  );

  const toggleLanguage = useCallback(
    () => setLanguage(languageRef.current === 'ar' ? 'en' : 'ar'),
    [setLanguage],
  );

  const clearLanguageError = useCallback(() => setLanguageError(null), []);

  const t = useCallback(
    (key: TranslationKey, variables?: TranslationVariables) => {
      const localizedText =
        translations[language][key] ?? translations.en[key] ?? key;
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
      isSavingLanguage,
      languageError,
      clearLanguageError,
      t,
    }),
    [
      clearLanguageError,
      isSavingLanguage,
      language,
      languageError,
      setLanguage,
      t,
      toggleLanguage,
    ],
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
      {languageError ? (
        <div
          role="alert"
          className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 shadow-xl"
        >
          <span>{languageError}</span>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-black hover:bg-red-50"
            onClick={clearLanguageError}
          >
            {t('common.dismiss')}
          </button>
        </div>
      ) : null}
    </I18nContext.Provider>
  );
}
