import { FormEvent, useEffect, useRef, useState } from 'react';
import { AdminCategory, AdminPaginated, AdminSheinImport, AdminSheinAssistJob, AdminSheinMarketplaceSettings, AdminSetting } from '@/features/admin/api/admin-api';
import { sheinApi, readSarExchangeRate } from '@/features/admin/shein/api/shein-api';
import { sanitizeSheinAdminMessage } from '@/features/admin/shein/utils/shein-review-utils';
import { Notice } from '@/features/admin/shein/types/shein.types';
import { useAuth } from '@/features/auth/AuthContext';

const DEFAULT_SHEIN_MARKETPLACE: AdminSheinMarketplaceSettings = {
  countryCode: 'KW',
  currencyCode: 'SAR',
  language: 'en',
  countries: [
    { code: 'KW', nameAr: 'Kuwait', nameEn: 'Kuwait' },
    { code: 'SA', nameAr: 'Saudi Arabia', nameEn: 'Saudi Arabia' },
    { code: 'AE', nameAr: 'United Arab Emirates', nameEn: 'United Arab Emirates' },
    { code: 'QA', nameAr: 'Qatar', nameEn: 'Qatar' },
    { code: 'BH', nameAr: 'Bahrain', nameEn: 'Bahrain' },
    { code: 'OM', nameAr: 'Oman', nameEn: 'Oman' },
  ],
};

function errorMessage(error: unknown, fallback: string): string {
  return sanitizeSheinAdminMessage(error instanceof Error ? error.message : fallback);
}

function isTemporaryDevToolsMessage(message: string): boolean {
  return /timed out|timeout|DevTools|communicate|fetch failed|ECONNREFUSED|ECONNRESET|aborted|Target closed|No target|socket|terminated while loading/i.test(message);
}

const SHEIN_VERIFICATION_NOTICE =
  'SHEIN needs verification. Solve CAPTCHA in the opened Chrome window. Import will continue automatically.';
const TERMINAL_ASSIST_STATUSES = ['ready', 'manual', 'failed', 'expired', 'cancelled'] as const;

function isTerminalAssistStatus(status: AdminSheinAssistJob['status']): boolean {
  return TERMINAL_ASSIST_STATUSES.includes(status as (typeof TERMINAL_ASSIST_STATUSES)[number]);
}

export function useSheinImportWorkflow() {
  const { csrfToken } = useAuth();
  const [response, setResponse] = useState<AdminPaginated<AdminSheinImport> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<AdminSheinImport | null>(null);
  const [assistJob, setAssistJob] = useState<AdminSheinAssistJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [marketplace, setMarketplace] =
    useState<AdminSheinMarketplaceSettings>(DEFAULT_SHEIN_MARKETPLACE);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<Notice>(null);
  const autoContinueInFlightRef = useRef(false);
  const autoContinueErrorCountRef = useRef(0);
  const assistJobStatusRef = useRef<AdminSheinAssistJob['status'] | null>(null);
  const sarExchangeRate = readSarExchangeRate(settings);

  async function load() {
    setLoadError(null);
    const [imports, cats, market, adminSettings] = await Promise.all([
      sheinApi.getImports(`&page=${page}`),
      sheinApi.getCategories().catch((error: unknown) => {
        setNotice({ type: 'error', message: errorMessage(error, 'Failed to load categories') });
        return [] as AdminCategory[];
      }),
      sheinApi.getMarketplaceSettings().catch(() => DEFAULT_SHEIN_MARKETPLACE),
      sheinApi.getSettings().catch(() => [] as AdminSetting[]),
    ]);

    setResponse(imports);
    setCategories(cats);
    setMarketplace(market);
    setSettings(adminSettings);
  }

  function reload() {
    setIsLoading(true);
    load()
      .catch((error: unknown) => {
        const message = errorMessage(error, 'Failed to load SHEIN import data');
        setLoadError(message);
        setNotice({ type: 'error', message });
      })
      .finally(() => setIsLoading(false));
  }

  async function loadSelected(id: string) {
    setSelected(await sheinApi.getImport(id));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (selectedId)
      loadSelected(selectedId).catch((err: Error) =>
        setNotice({ type: 'error', message: sanitizeSheinAdminMessage(err.message) }),
      );
  }, [selectedId]);

  useEffect(() => {
    assistJobStatusRef.current = assistJob?.status ?? null;
  }, [assistJob?.status]);

  useEffect(() => {
    if (!assistJob || isTerminalAssistStatus(assistJob.status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      if (autoContinueInFlightRef.current) return;
      autoContinueInFlightRef.current = true;

      try {
        const currentStatus = assistJobStatusRef.current ?? assistJob.status;
        const shouldReadVisibleTab = ['running', 'verification'].includes(currentStatus);
        const result = shouldReadVisibleTab
          ? await sheinApi.continueAssist(assistJob.id, { csrfToken })
          : await sheinApi.getAssistJob(assistJob.id);

        autoContinueErrorCountRef.current = 0;
        if (result.job) {
          assistJobStatusRef.current = result.job.status;
          setAssistJob(result.job);
        }
        const currentImport = result.import;
        if (currentImport?.id) {
          setSelectedId((previousId) => previousId || currentImport.id);
          setSelected(currentImport);
        }
        if (result.status === 'captcha_required') {
          setNotice({
            type: 'warning',
            message: SHEIN_VERIFICATION_NOTICE,
          });
        } else if (result.job && !isTerminalAssistStatus(result.job.status)) {
          setNotice((currentNotice) =>
            currentNotice?.message === SHEIN_VERIFICATION_NOTICE
              ? { type: 'success', message: 'Verification cleared. Reading SHEIN product data...' }
              : currentNotice,
          );
        }
        if (
          result.job &&
          isTerminalAssistStatus(result.job.status)
        ) {
          window.clearInterval(timer);
          await load();
          if (result.status === 'success') {
            setNotice({ type: 'success', message: 'Product extracted automatically. SHEIN tab was closed and the review form is ready.' });
          } else if (result.status === 'manual_review' || result.status === 'failed') {
            setNotice({
              type: result.product ? 'warning' : 'error',
              message: sanitizeSheinAdminMessage(result.reason || 'Automatic extraction needs manual review.'),
            });
          }
        }
      } catch (error) {
        const message = sanitizeSheinAdminMessage(
          error instanceof Error ? error.message : 'Failed to follow import steps',
        );
        const isTemporaryDevToolsError = isTemporaryDevToolsMessage(message);
        const nextErrorCount = isTemporaryDevToolsError
          ? autoContinueErrorCountRef.current
          : autoContinueErrorCountRef.current + 1;
        autoContinueErrorCountRef.current = nextErrorCount;
        const shouldStop = nextErrorCount >= 8;
        setNotice({
          type: shouldStop ? 'error' : 'warning',
          message: shouldStop
            ? message
            : isTemporaryDevToolsError
              ? SHEIN_VERIFICATION_NOTICE
              : `${message}. Still waiting for the SHEIN CAPTCHA/product page; keep the Chrome window open.`,
        });
        if (shouldStop) window.clearInterval(timer);
      } finally {
        autoContinueInFlightRef.current = false;
      }
    }, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistJob?.id, csrfToken]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = sourceUrl.trim();
    if (!trimmedUrl) return;
    setIsStarting(true);
    autoContinueErrorCountRef.current = 0;
    setNotice(null);
    try {
      const result = await sheinApi.startAssist({ sourceUrl: trimmedUrl }, { csrfToken });
      if (result.job) setAssistJob(result.job);
      if (result.import?.id) {
        setSelectedId(result.import.id);
        setSelected(result.import);
      }
      if (result.job && isTerminalAssistStatus(result.job.status)) {
        await load();
      }
      if (result.status === 'captcha_required') {
        setNotice({
          type: 'warning',
          message: SHEIN_VERIFICATION_NOTICE,
        });
      } else if (result.status === 'failed') {
        setNotice({
          type: 'error',
          message: sanitizeSheinAdminMessage(result.reason || 'Failed to open SHEIN assisted browser session.'),
        });
      } else if (result.status === 'success') {
        setNotice({ type: 'success', message: 'Product extracted successfully. Review form is ready.' });
      } else {
        setNotice({
          type: 'success',
          message:
            'Automatic import started. SHEIN will open with the selected country, SAR currency, and selected language. Keep the tab open; it will close automatically when extraction succeeds.',
        });
      }
    } catch (error) {
      setNotice({
        type: 'error',
        message: sanitizeSheinAdminMessage(
          error instanceof Error ? error.message : 'Failed to start import',
        ),
      });
    } finally {
      setIsStarting(false);
    }
  }

  async function handleContinueExtraction() {
    if (!assistJob?.id) return;
    setIsContinuing(true);
    autoContinueErrorCountRef.current = 0;
    setNotice(null);
    try {
      const result = await sheinApi.continueAssist(assistJob.id, { csrfToken });
      if (result.job) setAssistJob(result.job);
      if (result.import?.id) {
        setSelectedId(result.import.id);
        setSelected(result.import);
      }
      if (result.status === 'success') {
        await load();
        setNotice({ type: 'success', message: 'Product extracted successfully. Review form is ready.' });
      } else if (result.status === 'captcha_required') {
        setNotice({
          type: 'warning',
          message: SHEIN_VERIFICATION_NOTICE,
        });
      } else if (result.job && !isTerminalAssistStatus(result.job.status)) {
        setNotice({
          type: 'success',
          message: 'Manual check started a fresh browser read. Waiting for SHEIN product data...',
        });
      } else {
        setNotice({
          type: result.status === 'failed' ? 'error' : 'warning',
          message: sanitizeSheinAdminMessage(result.reason || 'Automatic extraction could not read product data.'),
        });
      }
    } catch (error) {
      setNotice({
        type: 'error',
        message: sanitizeSheinAdminMessage(
          error instanceof Error ? error.message : 'Failed to continue SHEIN extraction',
        ),
      });
    } finally {
      setIsContinuing(false);
    }
  }

  function handleClearForm() {
    setSourceUrl('');
    setSelectedId('');
    setSelected(null);
    setAssistJob(null);
    setNotice(null);
    setIsStarting(false);
    setIsContinuing(false);
    autoContinueErrorCountRef.current = 0;
  }

  return {
    response,
    isLoading,
    loadError,
    reload,
    categories,
    selectedId,
    selected,
    marketplace,
    sarExchangeRate,
    sourceUrl,
    isStarting,
    isContinuing,
    notice,
    assistJob,
    setSourceUrl,
    setMarketplace,
    setSelectedId,
    handleCreate,
    handleClearForm,
    handleContinueExtraction,
    handlePageChange: setPage,
    handleSelectImport: setSelectedId,
  };
}
