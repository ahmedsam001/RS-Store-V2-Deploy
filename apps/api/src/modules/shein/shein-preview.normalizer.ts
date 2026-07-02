import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_SHEIN_IMPORT_VARIANT_STOCK,
  SheinImportPreview,
  SheinImportVariant,
} from './shein.types';
import { SheinUrlService } from './shein-url.service';
import { normalizeSheinMainCategory } from './shein-category-config';
import { SHEIN_MAX_PRODUCT_IMAGES, normalizeSheinImageEntries } from './shein-image-filter';
import {
  DEFAULT_SHEIN_COUNTRY,
  FIXED_SHEIN_CURRENCY,
  SheinMarketplaceSettings,
  assertFixedSheinCurrency,
  normalizeSheinCountry,
} from './shein-marketplace';

export type SheinPreviewNormalizeOptions = {
  strictImages?: boolean;
  marketplace?: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>;
};

@Injectable()
export class SheinPreviewNormalizer {
  constructor(private readonly urlService: SheinUrlService) {}

  normalize(
    value: unknown,
    sourceUrl?: string,
    options: SheinPreviewNormalizeOptions = {},
  ): SheinImportPreview {
    if (!this.isRecord(value)) {
      throw new BadRequestException('SHEIN import payload must be an object');
    }

    const nameAr = this.requiredString(value.nameAr ?? value.name ?? value.title, 'nameAr').slice(
      0,
      220,
    );
    const priceAmount = this.requiredMoneyString(value.priceAmount ?? value.price, 'priceAmount');
    const slugSource = this.optionalString(value.slug) ?? this.optionalString(value.sku) ?? nameAr;
    const marketplaceCountry = options.marketplace?.countryCode ?? DEFAULT_SHEIN_COUNTRY;
    const country = normalizeSheinCountry(
      value.country ?? value.selectedCountry ?? marketplaceCountry,
      marketplaceCountry,
    );
    const currency = this.normalizeCurrency(
      value.currency ?? options.marketplace?.currencyCode ?? FIXED_SHEIN_CURRENCY,
    );
    const actualDetectedCurrency = this.optionalString(value.actualDetectedCurrency)
      ?.toUpperCase()
      .slice(0, 10);
    if (actualDetectedCurrency && actualDetectedCurrency !== FIXED_SHEIN_CURRENCY) {
      throw new BadRequestException(
        'Detected price does not match selected currency. Reopen link with correct settings.',
      );
    }
    const actualDetectedCountry = this.optionalString(value.actualDetectedCountry)
      ?.toUpperCase()
      .slice(0, 20);
    const warnings = this.normalizeOptions(value.warnings, 10, 220);
    if (actualDetectedCountry && actualDetectedCountry !== country) {
      warnings.push('Product opened on a different country than specified in import settings');
    }
    const variants = this.normalizeVariants(value.variants);
    const sizes = this.normalizeOptions(
      value.sizes,
      40,
      60,
      variants.map((variant) => variant.size),
    );
    const colors = this.normalizeOptions(
      value.colors,
      40,
      80,
      variants.map((variant) => variant.color),
    );
    const categorySlug = normalizeSheinMainCategory(value.categorySlug ?? value.categoryName);
    const rating = this.optionalNumber(value.rating);
    const discount = this.optionalNumber(value.discount);
    const exchangeRate = this.optionalNumber(value.exchangeRate);
    const storePriceAmount = this.optionalMoneyString(value.storePriceAmount);
    const originalPriceAmount = this.optionalMoneyString(
      value.originalPriceAmount ?? value.originalPrice,
    );

    return {
      slug: sourceUrl
        ? this.urlService.productSlugFromUrl(sourceUrl, slugSource)
        : this.urlService.toSlug(slugSource),
      nameAr,
      priceAmount,
      nameEn: this.optionalString(value.nameEn)?.slice(0, 220),
      description: this.optionalString(value.description)?.slice(0, 4000),
      sku: this.optionalString(value.sku)?.slice(0, 80),
      originalPriceAmount,
      currency,
      country,
      selectedCountry: country,
      selectedCurrency: FIXED_SHEIN_CURRENCY,
      actualDetectedCountry,
      actualDetectedCurrency,
      warnings,
      categoryId: this.optionalString(value.categoryId),
      categorySlug,
      categoryName: this.optionalString(value.categoryName)?.slice(0, 80) ?? categorySlug,
      subCategory: this.optionalString(value.subCategory)?.slice(0, 120),
      exchangeRate,
      storePriceAmount,
      discount: discount === undefined ? 0 : Math.min(100, Math.max(0, discount)),
      rating: rating === undefined ? 0 : Math.min(5, Math.max(0, rating)),
      images: this.normalizeImages(value.images, sourceUrl, options.strictImages ?? false),
      sizes,
      colors,
      variants,
    };
  }

  private normalizeImages(
    value: unknown,
    sourceUrl: string | undefined,
    strictImages: boolean,
  ): SheinImportPreview['images'] {
    const images = normalizeSheinImageEntries(value, { sourceUrl, strict: strictImages });
    if (images.length > SHEIN_MAX_PRODUCT_IMAGES) {
      return images.slice(0, SHEIN_MAX_PRODUCT_IMAGES);
    }
    return images;
  }

  private normalizeVariants(value: unknown): SheinImportVariant[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((variant): variant is Record<string, unknown> => this.isRecord(variant))
      .slice(0, 80)
      .map((variant) => {
        const stock = this.optionalNumber(variant.stockQuantity ?? variant.stock);
        return {
          sku: this.optionalString(variant.sku)?.slice(0, 80),
          nameAr: this.requiredString(
            variant.nameAr ?? variant.name ?? variant.size ?? variant.color,
            'variant.nameAr',
          ).slice(0, 160),
          nameEn: this.optionalString(variant.nameEn)?.slice(0, 160),
          size: this.optionalString(variant.size)?.slice(0, 60),
          color: this.optionalString(variant.color)?.slice(0, 80),
          priceAmount: this.optionalMoneyString(variant.priceAmount ?? variant.price),
          stockQuantity:
            typeof stock === 'number' && Number.isInteger(stock) && stock > 0
              ? stock
              : DEFAULT_SHEIN_IMPORT_VARIANT_STOCK,
        };
      });
  }

  private normalizeOptions(
    value: unknown,
    maxItems: number,
    maxLength: number,
    fallback: Array<string | undefined> = [],
  ): string[] {
    const source = Array.isArray(value) ? value : fallback;
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of source) {
      if (typeof item !== 'string') continue;
      const normalized = item.replace(/\s+/g, ' ').trim().slice(0, maxLength);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(normalized);
      if (result.length >= maxItems) break;
    }
    return result;
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
    return value.trim();
  }

  private requiredMoneyString(value: unknown, field: string): string {
    const text =
      typeof value === 'number' && Number.isFinite(value)
        ? String(value)
        : this.requiredString(value, field);
    const normalized = text.replace(/,/g, '').trim();
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new BadRequestException('Price after discount must be a positive number');
    }
    return normalized;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private optionalMoneyString(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const text =
      typeof value === 'number' && Number.isFinite(value)
        ? String(value)
        : typeof value === 'string'
          ? value.replace(/,/g, '').trim()
          : '';
    if (!text) return undefined;
    const numeric = Number(text);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new BadRequestException('Variant price must be a positive number');
    }
    return text;
  }

  private optionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private normalizeCurrency(value: unknown): typeof FIXED_SHEIN_CURRENCY {
    return assertFixedSheinCurrency(value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
