import { ProductStatus } from '@prisma/client';
import { SheinCountryCode } from './shein-marketplace';

export const DEFAULT_SHEIN_IMPORT_VARIANT_STOCK = 99;

export type SheinImportImage = {
  url: string;
  altTextAr?: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
  byteSize?: number;
  format?: string;
  isPrimary?: boolean;
  source?: 'SHEIN_IMPORT' | 'ADMIN_UPLOAD';
};

export type SheinImportVariant = {
  sku?: string;
  nameAr: string;
  nameEn?: string;
  size?: string;
  color?: string;
  priceAmount?: string;
  stockQuantity?: number;
};

export type SheinImportPreview = {
  slug: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  sku?: string;
  priceAmount: string;
  originalPriceAmount?: string;
  currency: string;
  country: SheinCountryCode;
  selectedCountry?: SheinCountryCode;
  selectedCurrency?: string;
  actualDetectedCountry?: string;
  actualDetectedCurrency?: string;
  warnings?: string[];
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  subCategory?: string;
  exchangeRate?: string | number;
  storePriceAmount?: string;
  discount?: number;
  rating?: number;
  images: SheinImportImage[];
  sizes?: string[];
  colors?: string[];
  variants: SheinImportVariant[];
};

export type SheinImportExtractionStatus =
  | 'success'
  | 'manual_review'
  | 'captcha_required'
  | 'failed';

export type SheinExtractedProduct = {
  title: string;
  price: number;
  currency: 'SAR';
  originalPrice: number | null;
  description: string;
  images: string[];
  variants: Array<{
    color: string | null;
    size: string | null;
    sku: string | null;
    stock: number | null;
  }>;
  sourceUrl: string;
  sourceProductId: string | null;
  categorySuggestion?: string | null;
};

export type SheinImportExtractionResponse = {
  status: SheinImportExtractionStatus;
  reason: string;
  product: SheinExtractedProduct | null;
};

export type SheinFetchedPage = {
  finalUrl: string;
  html: string;
};

export type SheinPublishOptions = {
  publishStatus?: ProductStatus;
  editedPayload?: SheinImportPreview | unknown;
};

export type SheinImportStepStatus =
  | 'pending'
  | 'running'
  | 'verification'
  | 'success'
  | 'warning'
  | 'error';

export type SheinImportStep = {
  id: string;
  labelAr: string;
  labelEn: string;
  status: SheinImportStepStatus;
  message?: string;
  at?: string;
};

export type SheinAssistJobStatus =
  | 'queued'
  | 'running'
  | 'verification'
  | 'ready'
  | 'manual'
  | 'failed'
  | 'expired'
  | 'cancelled';

export type SheinAssistJob = {
  id: string;
  importId: string;
  sourceUrl: string;
  preparedUrl?: string;
  assistedUrl?: string;
  status: SheinAssistJobStatus;
  messageAr: string;
  messageEn: string;
  currentStep?: string;
  progressMessage?: string;
  lastError?: string;
  expiresAt?: string;
  steps: SheinImportStep[];
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
};
