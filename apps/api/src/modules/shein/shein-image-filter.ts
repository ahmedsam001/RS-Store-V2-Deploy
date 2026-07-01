import { BadRequestException } from '@nestjs/common';
import type { SheinImportImage } from './shein.types';

export const SHEIN_MAX_PRODUCT_IMAGES = 20;

const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i;
const SHEIN_IMAGE_HOST = /(?:^|\.)(?:ltwebstatic\.com|shein\.com|shein\.co\.[a-z]{2}|shein\.[a-z]{2})$/i;
const MAIN_PRODUCT_IMAGE_PATH = /(?:images\d*_(?:pi|spmp|mp|p)|\/v4\/j\/(?:pi|spmp|mp|p)\/|\/pi\/|\/product\/|\/goods\/)/i;
const BAD_IMAGE_CONTEXT = /facebook|instagram|twitter|youtube|pinterest|snapchat|visa|mastercard|maestro|american\s*express|amex|diners\s*club|discover|paypal|payment|footer|social|logo|icon|sprite|app[-_\s]?store|google[-_\s]?play|qr|flag|currency|size[-_\s]?guide|size[-_\s]?chart|swatch|banner|placeholder|loading|avatar|\/assets\/|\/she_dist\/|blank|base64|grey\.gif|star|rating|review|points?|coupon|badge|shipping|return|favicon|common|download|swiss|franc|profile|measurement|color[-_\s]?block|advert|tracking|pixel/i;

export function normalizeImageUrl(value: unknown, baseUrl?: string): string | null {
  if (typeof value !== 'string') return null;
  const raw = value
    .replace(/&amp;/g, '&')
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .trim();

  if (!raw || /^(?:data|blob|javascript):/i.test(raw) || /^data:/i.test(raw) || /base64/i.test(raw)) {
    return null;
  }

  try {
    const url = new URL(raw.startsWith('//') ? `https:${raw}` : raw, baseUrl);
    if (!/^https?:$/i.test(url.protocol)) return null;
    url.protocol = 'https:';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function isLikelyMainProductGalleryImage(value: unknown, context = ''): boolean {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return false;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
  const haystack = `${host}${pathAndQuery} ${context}`.toLowerCase();

  if (!SHEIN_IMAGE_HOST.test(host)) return false;
  if (!IMAGE_EXTENSIONS.test(pathAndQuery)) return false;
  if (/\.svg(?:[?#]|$)/i.test(pathAndQuery) || /\.gif(?:[?#]|$)/i.test(pathAndQuery)) return false;
  if (BAD_IMAGE_CONTEXT.test(haystack)) return false;
  if (!MAIN_PRODUCT_IMAGE_PATH.test(pathAndQuery)) return false;

  return true;
}

export function productImageDedupeKey(value: string): string {
  const normalized = normalizeImageUrl(value) ?? value.trim();
  try {
    const url = new URL(normalized);
    return `${url.hostname}${url.pathname}`
      .toLowerCase()
      .replace(/_thumbnail_\d+x\d+(?=\.(?:jpe?g|png|webp|avif)$)/i, '_thumbnail')
      .replace(/_\d+x\d+(?=\.(?:jpe?g|png|webp|avif)$)/i, '')
      .replace(/\.(?:jpe?g|png|webp|avif)$/i, '');
  } catch {
    return normalized.toLowerCase().split('?')[0] ?? normalized.toLowerCase();
  }
}

export function dedupeProductImages(values: unknown[], max = SHEIN_MAX_PRODUCT_IMAGES): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeImageUrl(value);
    if (!normalized || !isLikelyMainProductGalleryImage(normalized)) continue;
    const key = productImageDedupeKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= max) break;
  }

  return result;
}

export function selectMainProductImages(values: unknown[], max = SHEIN_MAX_PRODUCT_IMAGES): string[] {
  return dedupeProductImages(values, Math.min(max, SHEIN_MAX_PRODUCT_IMAGES));
}

export function normalizeSheinImageEntries(value: unknown, options: { strict?: boolean; sourceUrl?: string } = {}): SheinImportImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > SHEIN_MAX_PRODUCT_IMAGES && options.strict) {
    throw new BadRequestException('Product images maximum limit is 20 images');
  }

  const rawEntries = value.map((item) => readImageCandidate(item, options.sourceUrl));
  const validImages: SheinImportImage[] = [];
  const seen = new Set<string>();
  let invalidCount = 0;

  for (const entry of rawEntries) {
    const isUploadedImage = Boolean(entry.cloudinaryPublicId);
    if (!entry.url || (!isUploadedImage && !isLikelyMainProductGalleryImage(entry.url))) {
      invalidCount += 1;
      continue;
    }
    const key = entry.cloudinaryPublicId ?? productImageDedupeKey(entry.url);
    if (seen.has(key)) continue;
    seen.add(key);
    validImages.push(entry);
    if (validImages.length >= SHEIN_MAX_PRODUCT_IMAGES) break;
  }

  if (options.strict && invalidCount > 0) {
    throw new BadRequestException('Product images must be valid SHEIN image URLs without icons, logos, or rating images');
  }

  return validImages;
}

function readImageCandidate(value: unknown, baseUrl?: string): SheinImportImage {
  if (typeof value === 'string') {
    return { url: normalizeImageUrl(value, baseUrl) ?? '' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { url: '' };
  }

  const candidate = value as Record<string, unknown>;
  const url = normalizeImageUrl(candidate.url, baseUrl) ?? '';
  const altTextAr = typeof candidate.altTextAr === 'string' && candidate.altTextAr.trim()
    ? candidate.altTextAr.trim().slice(0, 180)
    : typeof candidate.alt === 'string' && candidate.alt.trim()
      ? candidate.alt.trim().slice(0, 180)
      : undefined;
  const cloudinaryPublicId = typeof candidate.cloudinaryPublicId === 'string' && candidate.cloudinaryPublicId.trim()
    ? candidate.cloudinaryPublicId.trim().slice(0, 220)
    : undefined;
  const width = readPositiveInteger(candidate.width);
  const height = readPositiveInteger(candidate.height);
  const byteSize = readPositiveInteger(candidate.byteSize);
  const format = typeof candidate.format === 'string' && candidate.format.trim()
    ? candidate.format.trim().slice(0, 40)
    : undefined;
  const isPrimary = candidate.isPrimary === true;
  const source = cloudinaryPublicId ? 'ADMIN_UPLOAD' : 'SHEIN_IMPORT';

  return { url, altTextAr, cloudinaryPublicId, width, height, byteSize, format, isPrimary, source };
}

function readPositiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export const isLikelyProductImage = isLikelyMainProductGalleryImage;
export const selectFirstTwoMainProductImages = selectMainProductImages;
