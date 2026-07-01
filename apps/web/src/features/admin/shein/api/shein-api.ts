import { adminApi, AdminSetting, SheinPreviewPayload } from '@/features/admin/api/admin-api';

const DEFAULT_SAR_EXCHANGE_RATE = 15;
type SheinWriteOptions = { csrfToken?: string | null };

export const sheinApi = {
  getImports: (query = '') => adminApi.sheinImportsPage(query),
  getCategories: () => adminApi.categories(),
  getMarketplaceSettings: () => adminApi.sheinMarketplaceSettings(),
  getSettings: () => adminApi.settings(),
  getImport: (id: string) => adminApi.sheinImport(id),
  startAssist: (input: { sourceUrl: string; rawPayload?: unknown }, options: SheinWriteOptions = {}) =>
    adminApi.startSheinAssist(input, options),
  getAssistJob: (jobId: string) => adminApi.sheinAssistJob(jobId),
  continueAssist: (jobId: string, options: SheinWriteOptions = {}) => adminApi.continueSheinAssist(jobId, options),
  createImport: (input: { sourceUrl: string; rawPayload?: unknown }, options: SheinWriteOptions = {}) =>
    adminApi.createSheinImport(input, options),
  reviewProduct: (id: string, editedPayload: SheinPreviewPayload, options: SheinWriteOptions = {}) =>
    adminApi.reviewSheinProduct(id, editedPayload, options),
  approveProduct: (id: string, editedPayload?: SheinPreviewPayload, options: SheinWriteOptions = {}) =>
    adminApi.approveSheinProduct(id, editedPayload, options),
  publishProduct: (id: string, editedPayload?: SheinPreviewPayload, options: SheinWriteOptions = {}) =>
    adminApi.publishSheinProduct(id, editedPayload, options),
  retryImport: (id: string, options: SheinWriteOptions = {}) => adminApi.retrySheinImport(id, options),
  updateMarketplaceSettings: (input: { countryCode: string; language?: string }, options: SheinWriteOptions = {}) =>
    adminApi.updateSheinMarketplaceSettings(input, options),
};

export function readSarExchangeRate(settings: AdminSetting[]): number {
  const setting = settings.find((item) => item.key === 'shein.import.sarExchangeRate');
  const parsed = Number(setting?.value ?? DEFAULT_SAR_EXCHANGE_RATE);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SAR_EXCHANGE_RATE;
}
