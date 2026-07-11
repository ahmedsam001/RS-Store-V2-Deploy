import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { I18nProvider, type Language } from '@/shared/i18n';

export function AppI18nProvider({ children }: { children: ReactNode }) {
  const { status, user, updateProfile } = useAuth();

  return (
    <I18nProvider
      accountStatus={status}
      accountLanguage={user?.language}
      persistLanguage={(language: Language) => updateProfile({ language })}
    >
      {children}
    </I18nProvider>
  );
}
