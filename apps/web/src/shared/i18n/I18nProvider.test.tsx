import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { useI18n } from '@/shared/i18n/useI18n';
import { LANGUAGE_STORAGE_KEY } from '@/shared/i18n/translations';

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    document.documentElement.className = '';
  });

  it('switches document language and direction for guests', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider>{children}</I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });

    await act(() => result.current.setLanguage('en'));

    expect(result.current.language).toBe('en');
    expect(result.current.direction).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('uses the authenticated account language', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider accountStatus="authenticated" accountLanguage="en">
        {children}
      </I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });

    await waitFor(() => expect(result.current.language).toBe('en'));
    expect(result.current.direction).toBe('ltr');
  });

  it('persists authenticated language changes', async () => {
    const persistLanguage = vi.fn().mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider
        accountStatus="authenticated"
        accountLanguage="en"
        persistLanguage={persistLanguage}
      >
        {children}
      </I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.language).toBe('en'));

    await act(() => result.current.setLanguage('ar'));

    expect(persistLanguage).toHaveBeenCalledWith('ar');
    expect(result.current.language).toBe('ar');
    expect(result.current.isSavingLanguage).toBe(false);
  });

  it('rolls back when account persistence fails', async () => {
    const persistLanguage = vi.fn().mockRejectedValue(new Error('offline'));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider
        accountStatus="authenticated"
        accountLanguage="en"
        persistLanguage={persistLanguage}
      >
        {children}
      </I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.language).toBe('en'));

    await act(() => result.current.setLanguage('ar'));

    await waitFor(() => expect(result.current.language).toBe('en'));
    expect(result.current.languageError).toMatch(/could not save/i);
    expect(document.documentElement.dir).toBe('ltr');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('interpolates translated values', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider>{children}</I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('nav.cartItems', { count: 3 })).toContain('3');
  });
});
