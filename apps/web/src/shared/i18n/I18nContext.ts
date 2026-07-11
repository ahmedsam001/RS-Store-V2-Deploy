import { createContext } from 'react';
import type { Language, TranslationKey } from '@/shared/i18n/translations';

export type TranslationVariables = Record<string, string | number>;

export type I18nContextValue = {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: Language) => Promise<boolean>;
  toggleLanguage: () => Promise<boolean>;
  isSavingLanguage: boolean;
  languageError: string | null;
  clearLanguageError: () => void;
  t: (key: TranslationKey, variables?: TranslationVariables) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
