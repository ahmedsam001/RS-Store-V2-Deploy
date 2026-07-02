import {
  AdminCategory,
  AdminSheinImport,
  AdminSheinMarketplaceSettings,
  SheinImportStep,
  SheinPreviewPayload,
} from '@/features/admin/api/admin-api';
import { findStoreCategory, getSubCategories } from '@/shared/constants/product-categories';

const MANUAL_REVIEW_MESSAGE =
  'System could not extract all data automatically. You can open the SHEIN link and complete product data manually.';
const DEFAULT_SAR_EXCHANGE_RATE = 15;
const DEFAULT_SHEIN_MARKETPLACE_COUNTRY = 'KW';
const DEFAULT_SHEIN_IMPORT_VARIANT_STOCK = 99;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Waiting',
  EXTRACTING: 'Extracting',
  PREVIEW_READY: 'Preview Ready',
  FAILED: 'Manual Review Required',
  MANUAL_REVIEW: 'Manual Review',
  REVIEWING: 'Under Review',
  REVIEWED: 'Ready to Publish',
  APPROVED: 'Approved',
  PROCESSING: 'Creating Product',
  PRODUCT_CREATED: 'Product Created',
  PUBLISHED: 'Published',
  SUCCEEDED: 'Published',
  CANCELLED: 'Cancelled',
};

export const STEP_STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting',
  running: 'Processing',
  verification: 'Verification',
  success: 'Done',
  warning: 'Manual',
  error: 'Failed',
};

export function formatSheinStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatStepStatus(status: string): string {
  return STEP_STATUS_LABELS[status] ?? status;
}

export function calculateStorePrice(
  sarPrice: string | number | undefined,
  exchangeRate: number,
): string {
  const parsedPrice = Number(
    String(sarPrice ?? '')
      .replace(/,/g, '')
      .trim(),
  );
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return '';
  const calculated = parsedPrice * exchangeRate;
  return calculated.toFixed(calculated % 1 === 0 ? 0 : 2);
}

export function formatNumberForInput(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function clampNumber(value: string | number | undefined, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function manualSlugFromUrl(sourceUrl: string): string {
  const fallback = `shein-product-${Date.now()}`;
  try {
    const url = new URL(sourceUrl);
    const key =
      url.searchParams.get('goods_id') ??
      url.searchParams.get('url_from') ??
      url.searchParams.get('src_identifier') ??
      url.searchParams.get('link') ??
      url.pathname.split('/').filter(Boolean).pop();
    return (
      String(key ?? fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || fallback
    );
  } catch {
    return fallback;
  }
}

export function shortSheinUrl(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).pathname.split('/').filter(Boolean).pop() || sourceUrl;
  } catch {
    return sourceUrl;
  }
}

export function cleanOptionList(values: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= 40) break;
  }
  return result;
}

export function normalizeReviewImages(
  images: SheinPreviewPayload['images'],
): SheinPreviewPayload['images'] {
  const result: SheinPreviewPayload['images'] = [];
  const seen = new Set<string>();
  for (const image of images ?? []) {
    if (!image?.url) continue;
    const isUploaded = Boolean(image.cloudinaryPublicId);
    if (!isUploaded && !isLikelySheinProductImageUrl(image.url)) continue;
    const key = image.cloudinaryPublicId ?? productImageKey(image.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...image, isPrimary: false });
    if (result.length >= 20) break;
  }
  const primaryIndex = (images ?? []).findIndex((image) => image.isPrimary);
  const normalizedPrimaryIndex =
    primaryIndex >= 0 && primaryIndex < result.length ? primaryIndex : 0;
  return result.map((image, index) => ({ ...image, isPrimary: index === normalizedPrimaryIndex }));
}

export function isLikelySheinProductImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = `${url.pathname}${url.search}`.toLowerCase();
    if (!/^https?:$/.test(url.protocol)) return false;
    if (!/(^|\.)(ltwebstatic\.com|shein\.com)$/i.test(host)) return false;
    if (!/\.(jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(path)) return false;
    if (
      /\.svg(?:[?#]|$)|\.gif(?:[?#]|$)|\/assets\/|\/she_dist\/|sprite|logo|icon|avatar|placeholder|blank|loading|base64|grey\.gif|star|rating|review|coupon|badge|shipping|return|payment|favicon|common|download|app-store|google-play|qr|flag|currency|size[-_\s]?guide|size[-_\s]?chart|swatch|banner|tracking|pixel/i.test(
        path,
      )
    )
      return false;
    return /images\d*_pi|\/v4\/j\/pi\/|\/pi\/|\/product\/|\/goods\//i.test(path);
  } catch {
    return false;
  }
}

export function productImageKey(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`
      .toLowerCase()
      .replace(/_thumbnail_\d+x\d+(?=\.(?:jpe?g|png|webp|avif)$)/i, '_thumbnail')
      .replace(/_\d+x\d+(?=\.(?:jpe?g|png|webp|avif)$)/i, '')
      .replace(/\.(?:jpe?g|png|webp|avif)$/i, '');
  } catch {
    return value.toLowerCase().split('?')[0] || value.toLowerCase();
  }
}

export function findSelectedAdminCategory(
  payload: SheinPreviewPayload,
  categories: AdminCategory[],
) {
  if (!payload.categoryId) return undefined;
  return categories.find((category) => category.id === payload.categoryId);
}

export function findAdminCategoryByStoreSlug(categories: AdminCategory[], slug?: string | null) {
  const normalizedSlug = String(slug ?? '')
    .trim()
    .toLowerCase();
  if (!normalizedSlug) return undefined;
  const config = findStoreCategory(normalizedSlug);
  return categories.find((category) => {
    const values = [category.slug, category.nameEn, category.nameAr]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    return (
      values.includes(normalizedSlug) ||
      Boolean(
        config && (values.includes(config.slug) || values.includes(config.name.toLowerCase())),
      )
    );
  });
}

export function resolveMainCategorySlug(
  payload: SheinPreviewPayload,
  categories: AdminCategory[],
): string | undefined {
  const explicit = findStoreCategory(payload.categorySlug ?? payload.categoryName)?.slug;
  if (explicit) return explicit;
  const normalizedSlug = String(payload.categorySlug ?? '')
    .trim()
    .toLowerCase();
  if (
    normalizedSlug &&
    categories.some((category) => category.slug.toLowerCase() === normalizedSlug)
  ) {
    return normalizedSlug;
  }
  const category = findSelectedAdminCategory(payload, categories);
  return category?.slug ?? findStoreCategory(category?.nameEn ?? category?.nameAr)?.slug;
}

export function normalizeEditorPayload(
  payload: SheinPreviewPayload,
  marketplace: AdminSheinMarketplaceSettings = {
    countryCode: DEFAULT_SHEIN_MARKETPLACE_COUNTRY,
    currencyCode: 'SAR',
    language: 'en',
    countries: [],
  },
  sarExchangeRate = DEFAULT_SAR_EXCHANGE_RATE,
  categories: AdminCategory[] = [],
): SheinPreviewPayload {
  const variants = payload.variants ?? [];
  const selectedAdminCategory = findSelectedAdminCategory(payload, categories);
  const categorySlug =
    selectedAdminCategory?.slug ??
    resolveMainCategorySlug(payload, categories) ??
    payload.categorySlug;
  const adminCategory =
    selectedAdminCategory ??
    (categorySlug ? findAdminCategoryByStoreSlug(categories, categorySlug) : undefined);
  const subCategories = getSubCategories(categorySlug);
  const subCategory =
    payload.subCategory &&
    (subCategories.length === 0 || subCategories.includes(payload.subCategory))
      ? payload.subCategory
      : subCategories[0];
  const sizes = cleanOptionList([
    ...(payload.sizes ?? []),
    ...variants.map((variant) => variant.size ?? ''),
  ]);
  const colors = cleanOptionList([
    ...(payload.colors ?? []),
    ...variants.map((variant) => variant.color ?? ''),
  ]);
  const images = normalizeReviewImages(payload.images ?? []);

  return {
    ...payload,
    currency: 'SAR',
    country: payload.country || marketplace.countryCode,
    selectedCountry: payload.selectedCountry || marketplace.countryCode,
    selectedCurrency: 'SAR',
    categoryId: payload.categoryId ?? adminCategory?.id,
    categorySlug,
    categoryName:
      adminCategory?.nameEn ??
      adminCategory?.nameAr ??
      findStoreCategory(categorySlug)?.name ??
      payload.categoryName,
    subCategory,
    exchangeRate: sarExchangeRate,
    storePriceAmount: calculateStorePrice(payload.priceAmount, sarExchangeRate),
    discount: clampNumber(payload.discount ?? 0, 0, 100),
    rating: clampNumber(payload.rating ?? 0, 0, 5),
    sizes,
    colors,
    images,
    variants: buildPreviewVariants(sizes, colors, variants),
  };
}

export function emptyPayload(
  sourceUrl = '',
  marketplace: AdminSheinMarketplaceSettings = {
    countryCode: DEFAULT_SHEIN_MARKETPLACE_COUNTRY,
    currencyCode: 'SAR',
    language: 'en',
    countries: [],
  },
): SheinPreviewPayload {
  return {
    slug: manualSlugFromUrl(sourceUrl),
    nameAr: '',
    priceAmount: '',
    currency: 'SAR',
    country: marketplace.countryCode,
    selectedCountry: marketplace.countryCode,
    selectedCurrency: 'SAR',
    categorySlug: undefined,
    categoryName: undefined,
    subCategory: undefined,
    exchangeRate: DEFAULT_SAR_EXCHANGE_RATE,
    storePriceAmount: '',
    discount: 0,
    rating: 0,
    images: [],
    sizes: [],
    colors: [],
    variants: [],
  };
}

export function prepareReviewedPayload(
  payload: SheinPreviewPayload,
  categories: AdminCategory[],
  sarExchangeRate: number,
): SheinPreviewPayload {
  const normalized = normalizeEditorPayload(
    payload,
    {
      countryCode: DEFAULT_SHEIN_MARKETPLACE_COUNTRY,
      currencyCode: 'SAR',
      language: 'en',
      countries: [],
    },
    sarExchangeRate,
    categories,
  );
  const sizes = cleanOptionList(normalized.sizes ?? []);
  const colors = cleanOptionList(normalized.colors ?? []);
  const images = normalizeReviewImages(normalized.images);
  const variants = buildPreviewVariants(sizes, colors, normalized.variants ?? []);

  return {
    slug: normalized.slug || manualSlugFromUrl(normalized.nameAr),
    nameAr: normalized.nameAr,
    nameEn: normalized.nameEn,
    description: normalized.description,
    sku: normalized.sku,
    priceAmount: normalized.priceAmount,
    currency: 'SAR',
    country: normalized.country || DEFAULT_SHEIN_MARKETPLACE_COUNTRY,
    categoryId: normalized.categoryId,
    categorySlug: normalized.categorySlug,
    categoryName: normalized.categoryName,
    subCategory: normalized.subCategory,
    exchangeRate: sarExchangeRate,
    storePriceAmount: calculateStorePrice(normalized.priceAmount, sarExchangeRate),
    discount: normalized.discount,
    rating: normalized.rating,
    images,
    sizes,
    colors,
    variants,
  };
}

export function buildPreviewVariants(
  sizes: string[],
  colors: string[],
  existingVariants: SheinPreviewPayload['variants'],
): SheinPreviewPayload['variants'] {
  const existingByOption = new Map<string, SheinPreviewVariantFromPayload>();
  for (const variant of existingVariants ?? []) {
    existingByOption.set(variantKey(variant.size, variant.color), variant);
  }

  if (!sizes.length && !colors.length) {
    return (existingVariants ?? []).slice(0, 80).map((variant, index) => ({
      nameAr: variant.nameAr || variant.size || variant.color || `Option ${index + 1}`,
      nameEn: variant.nameEn,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      priceAmount: variant.priceAmount,
      stockQuantity: normalizeSheinVariantStock(variant.stockQuantity),
    }));
  }

  const sizeValues = sizes.length ? sizes : [''];
  const colorValues = colors.length ? colors : [''];
  const result: SheinPreviewPayload['variants'] = [];

  for (const size of sizeValues) {
    for (const color of colorValues) {
      const existing = existingByOption.get(variantKey(size, color));
      const name =
        [size, color].filter(Boolean).join(' / ') ||
        existing?.nameAr ||
        `Option ${result.length + 1}`;
      result.push({
        sku: existing?.sku,
        nameAr: existing?.nameAr || name,
        nameEn: existing?.nameEn,
        size: size || undefined,
        color: color || undefined,
        priceAmount: existing?.priceAmount,
        stockQuantity: normalizeSheinVariantStock(existing?.stockQuantity),
      });
      if (result.length >= 80) return result;
    }
  }

  return result;
}

type SheinPreviewVariantFromPayload = NonNullable<SheinPreviewPayload['variants']>[number];

export function variantKey(size?: string, color?: string): string {
  return `${String(size ?? '')
    .trim()
    .toLowerCase()}::${String(color ?? '')
    .trim()
    .toLowerCase()}`;
}

function normalizeSheinVariantStock(stockQuantity: number | undefined): number {
  return Number.isFinite(stockQuantity) && Number(stockQuantity) > 0
    ? Math.trunc(Number(stockQuantity))
    : DEFAULT_SHEIN_IMPORT_VARIANT_STOCK;
}

export function buildSheinAdminOpenUrl(
  value: string,
  marketplace: AdminSheinMarketplaceSettings = {
    countryCode: DEFAULT_SHEIN_MARKETPLACE_COUNTRY,
    currencyCode: 'SAR',
    language: 'en',
    countries: [],
  },
): string {
  const url = new URL(normalizeSheinAdminInput(value));
  url.searchParams.set('country', marketplace.countryCode);
  url.searchParams.set('localcountry', marketplace.countryCode);
  url.searchParams.set('currency', 'SAR');
  url.searchParams.set('lang', marketplace.language || 'en');
  return url.toString();
}

export function normalizeSheinAdminInput(value: string): string {
  const raw = String(value || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;

  const queryOnly = raw.replace(/^\?+/, '').replace(/^&+/, '');
  if (looksLikeSheinShareQuery(queryOnly)) {
    return new URL(`/h5/sharejump/appjump?${queryOnly}`, 'https://api-shein.shein.com').toString();
  }

  if (raw.startsWith('/')) return new URL(raw, 'https://www.shein.com').toString();
  if (/^appjump(?:[/?#]|$)/i.test(raw))
    return new URL(`/${raw.replace(/^\/+/, '')}`, 'https://www.shein.com').toString();
  if (/^h5\/sharejump\/appjump(?:[/?#]|$)/i.test(raw))
    return new URL(`/${raw.replace(/^\/+/, '')}`, 'https://api-shein.shein.com').toString();
  if (/^(?:[a-z0-9-]+\.)?shein\.[a-z.]{2,}(?:[/:?#]|$)/i.test(raw)) return `https://${raw}`;
  return raw;
}

export function looksLikeSheinShareQuery(value: string): boolean {
  return Boolean(
    value &&
    value.length < 3000 &&
    !/\s/.test(value) &&
    /(?:^|&)(?:link|shc|url_from|src_identifier|goods_id|goodsId|product_id|mallCode|skucode|skuCode|cat_id|currency|country|localcountry|lang)=/i.test(
      value,
    ),
  );
}

export function countryLabel(
  marketplace: AdminSheinMarketplaceSettings,
  code: string | undefined,
): string {
  const countryCode = code || marketplace.countryCode;
  const country = marketplace.countries?.find((item) => item.code === countryCode);
  return country ? `${country.nameEn} ${country.code}` : countryCode;
}

export function buildReviewChecklist(payload: SheinPreviewPayload, calculatedStorePrice: string) {
  return [
    { label: 'Category', done: Boolean(payload.categoryId) },
    { label: 'Sub Category', done: Boolean(payload.subCategory) },
    { label: 'Description', done: Boolean((payload.description ?? '').trim()) },
    { label: 'Images', done: Boolean((payload.images ?? []).length) },
    {
      label: 'Price',
      done: Boolean(calculateStorePrice(payload.priceAmount, 1) && calculatedStorePrice),
    },
    { label: 'Available Sizes', done: Boolean((payload.sizes ?? []).length) },
  ];
}

export function sheinCycleStepIndex(status: string): number {
  if (['PENDING', 'EXTRACTING'].includes(status)) return 0;
  if (
    [
      'PREVIEW_READY',
      'FAILED',
      'MANUAL_REVIEW',
      'REVIEWING',
      'REVIEWED',
      'APPROVED',
      'PRODUCT_CREATED',
    ].includes(status)
  )
    return 1;
  if (['PROCESSING', 'PUBLISHED', 'SUCCEEDED'].includes(status)) return 2;
  return 0;
}

export function shouldShowManualNotice(item: AdminSheinImport): boolean {
  const hasUsableProductData = Boolean(
    (item.previewPayload || item.editedPayload) &&
    (item.previewPayload?.nameAr || item.editedPayload?.nameAr) &&
    ((item.previewPayload?.images.length ?? 0) > 0 || (item.editedPayload?.images.length ?? 0) > 0),
  );
  return (
    !hasUsableProductData &&
    (item.status === 'MANUAL_REVIEW' || Boolean(item.errorCode?.includes('PREVIEW_EXTRACTION')))
  );
}

export function sanitizeSheinAdminMessage(message: string): string {
  if (/Price does not match|Currency mismatch/.test(message)) {
    return 'Price does not match the selected currency. Please reopen the link with correct settings.';
  }
  if (/visible chrome|browser ui|x11|desktop display|docker|gui|wayland|display/i.test(message)) {
    return message;
  }
  if (
    /Could not extract enough data|Unable to fetch|PREVIEW_EXTRACTION|SHEIN page returned|did not return|Prisma|Cloudinary|Cannot read property|undefined|NaN|stack trace/i.test(
      message,
    )
  ) {
    return MANUAL_REVIEW_MESSAGE;
  }
  return message;
}

export function defaultSteps(): SheinImportStep[] {
  return [
    {
      id: 'prepare_link',
      labelAr: 'Prepare SHEIN Link',
      labelEn: 'Prepare SHEIN link',
      status: 'pending',
    },
    {
      id: 'open_market_link',
      labelAr: 'Open SHEIN with Country and Currency',
      labelEn: 'Open SHEIN with selected country and currency',
      status: 'pending',
    },
    {
      id: 'start_session',
      labelAr: 'Start Import Session',
      labelEn: 'Start import session',
      status: 'pending',
    },
    {
      id: 'try_extraction',
      labelAr: 'Try Extraction',
      labelEn: 'Try extraction',
      status: 'pending',
    },
    {
      id: 'show_preview',
      labelAr: 'Show Preview on Success',
      labelEn: 'Show preview if successful',
      status: 'pending',
    },
    {
      id: 'manual_review',
      labelAr: 'Manual Review on Failure',
      labelEn: 'Manual review if failed',
      status: 'pending',
    },
  ];
}
