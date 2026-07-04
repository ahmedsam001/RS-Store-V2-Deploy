import { createContext } from 'react';
import type { Language, TranslationKey } from '@/shared/i18n/translations';

export type TranslationVariables = Record<string, string | number>;

export type I18nContextValue = {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, variables?: TranslationVariables) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
