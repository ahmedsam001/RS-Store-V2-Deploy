import { BadRequestException, Injectable } from '@nestjs/common';
import {
  SHEIN_MAX_PRODUCT_IMAGES,
  isLikelyProductImage,
  normalizeImageUrl,
} from './shein-image-filter';
import { SheinPreviewNormalizer } from './shein-preview.normalizer';
import { DEFAULT_SHEIN_IMPORT_VARIANT_STOCK, SheinImportPreview } from './shein.types';
import { FIXED_SHEIN_CURRENCY, SheinMarketplaceSettings } from './shein-marketplace';

@Injectable()
export class SheinExtractorService {
  constructor(private readonly normalizer: SheinPreviewNormalizer) {}

  extract(
    sourceUrl: string,
    html: string,
    marketplace?: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>,
  ): SheinImportPreview {
    const jsonLdProducts = this.extractJsonLdProducts(html);
    const jsonLdProduct = jsonLdProducts[0];
    const fallback = this.extractMetaProduct(html);
    const htmlSignals = this.extractHtmlProductSignals(html, sourceUrl);
    const recursive = this.extractRecursiveSignals(html);
    const v1 = this.extractV1VisibleSignals(html, sourceUrl);
    const sourcePrice = this.firstString(
      htmlSignals.price,
      v1.price,
      recursive.price,
      this.extractOfferPrice(jsonLdProduct?.offers),
      fallback.price,
    );
    const sourceCurrency = this.firstString(
      v1.currency,
      recursive.currency,
      this.extractOfferCurrency(jsonLdProduct?.offers),
      fallback.currency,
    );
    this.assertDetectedCurrencyMatches(
      sourceCurrency,
      marketplace?.currencyCode ?? FIXED_SHEIN_CURRENCY,
    );

    const extractedSizes = this.extractOptionList(recursive.variants, 'size');
    const extractedColors = this.extractOptionList(recursive.variants, 'color');
    const resolvedSizes = extractedSizes.length > 0 ? extractedSizes : recursive.sizes;
    const resolvedColors = extractedColors.length > 0 ? extractedColors : recursive.colors;
    const resolvedVariants =
      recursive.variants.length > 0
        ? recursive.variants.slice(0, 80)
        : this.buildVariantsFromOptions(resolvedSizes, resolvedColors);

    const candidate = {
      slug: recursive.sku ?? fallback.sku ?? v1.sku,
      nameAr: this.firstString(
        htmlSignals.name,
        jsonLdProduct?.name,
        fallback.title,
        recursive.name,
        v1.name,
      ),
      nameEn: this.firstString(
        htmlSignals.name,
        jsonLdProduct?.name,
        fallback.title,
        recursive.name,
        v1.name,
      ),
      description: this.firstString(
        jsonLdProduct?.description,
        fallback.description,
        htmlSignals.description,
        recursive.description,
      ),
      sku: this.firstString(jsonLdProduct?.sku, fallback.sku, recursive.sku, v1.sku),
      priceAmount: sourcePrice,
      originalPriceAmount: htmlSignals.originalPrice,
      currency: marketplace?.currencyCode ?? FIXED_SHEIN_CURRENCY,
      country: marketplace?.countryCode,
      selectedCountry: marketplace?.countryCode,
      selectedCurrency: marketplace?.currencyCode ?? FIXED_SHEIN_CURRENCY,
      actualDetectedCurrency: sourceCurrency,
      images: this.mergeImages([
        ...htmlSignals.images,
        ...v1.images,
        ...this.imagesFromJsonLd(jsonLdProduct?.image),
        ...recursive.images,
        ...fallback.images,
      ]),
      sizes: resolvedSizes,
      colors: resolvedColors,
      variants: resolvedVariants.slice(0, 80),
    };

    try {
      return this.normalizer.normalize(candidate, sourceUrl, { marketplace });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Could not extract product data automatically. You can complete the data manually.',
      );
    }
  }

  private extractHtmlProductSignals(
    html: string,
    sourceUrl: string,
  ): {
    name?: string;
    description?: string;
    price?: string;
    originalPrice?: string;
    images: string[];
  } {
    const decoded = this.decodeHtml(html)
      .replace(/\\u002F/gi, '/')
      .replace(/\\u0026/gi, '&')
      .replace(/\\\//g, '/');
    const name = this.firstString(
      /<h1[^>]*class=["'][^"']*product-intro__head-name[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i.exec(
        decoded,
      )?.[1],
      /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(decoded)?.[1],
    )
      ?.replace(/<[^>]+>/g, ' ')
      .replace(/\s*[|\-–]\s*SHEIN.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    const description = this.firstString(
      /<meta[^>]+(?:property|name)=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i.exec(
        decoded,
      )?.[1],
      /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i.exec(
        decoded,
      )?.[1],
    );
    const prices = this.extractHtmlPrices(decoded);

    return {
      name,
      description,
      price: prices.salePrice ?? prices.price,
      originalPrice: prices.originalPrice,
      images: this.extractOrderedGalleryImages(decoded, sourceUrl),
    };
  }

  private extractHtmlPrices(html: string): {
    price?: string;
    salePrice?: string;
    originalPrice?: string;
  } {
    const candidates: Array<{ value: string; weight: number; original: boolean }> = [];
    const explicitSale = this.moneyFromText(
      /<[^>]+class=["'][^"']*(?:sale|special|current|final|discount|new)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i.exec(
        html,
      )?.[1] ?? '',
    );
    const explicitOriginal = this.moneyFromText(
      /<(?:del|s|span|div)[^>]*(?:class=["'][^"']*(?:original|old|retail|was)[^"']*["']|style=["'][^"']*line-through[^"']*["'])[^>]*>([\s\S]*?)<\/(?:del|s|span|div)>/i.exec(
        html,
      )?.[1] ?? '',
    );
    const tagRegex =
      /<(?<tag>del|span|div|p|strong|em|b|i)[^>]*(?<attrs>\s(?:class|data-testid|aria-label|title|style)=["'][^"']*["'][^>]*)[^>]*>(?<body>[\s\S]*?)<\/\k<tag>>/gi;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(html)) && candidates.length < 80) {
      const attrs = String(match.groups?.attrs ?? '');
      const body = String(match.groups?.body ?? '').replace(/<[^>]+>/g, ' ');
      const context = `${match.groups?.tag ?? ''} ${attrs} ${body}`.toLowerCase();
      if (!/price|amount|sale|retail|original|old|was|sr|sar/i.test(context)) continue;
      if (
        /shipping|delivery|installment|tax|coupon|points?|free|returns|qty|quantity|add to cart|cart|size guide/.test(
          context,
        )
      )
        continue;
      const value = this.moneyFromText(`${attrs} ${body}`);
      if (!value) continue;
      const original = /<del\b|original|old|retail|was|line-through/.test(
        `<${match.groups?.tag ?? ''} ${context}`,
      );
      let weight = 10;
      if (/product-intro__head-price|product-intro|head-price/.test(context)) weight += 50;
      if (/sale|special|current|final|now|discount|new/.test(context)) weight += 80;
      if (original) weight -= 100;
      candidates.push({ value, weight, original });
    }

    const originalPrice = candidates.find((candidate) => candidate.original)?.value;
    const current = candidates
      .filter((candidate) => !candidate.original)
      .sort((a, b) => b.weight - a.weight || Number(a.value) - Number(b.value))[0];
    const any = [...candidates].sort(
      (a, b) => b.weight - a.weight || Number(a.value) - Number(b.value),
    )[0];
    return {
      price: explicitSale ?? any?.value,
      salePrice: explicitSale ?? current?.value,
      originalPrice: explicitOriginal ?? originalPrice,
    };
  }

  private extractOrderedGalleryImages(html: string, sourceUrl: string): string[] {
    const images: string[] = [];
    const seen = new Set<string>();
    const imgRegex = /<img\b[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(html)) && images.length < SHEIN_MAX_PRODUCT_IMAGES) {
      const tag = match[0] ?? '';
      const nearby = html.slice(
        Math.max(0, match.index - 900),
        Math.min(html.length, match.index + tag.length + 300),
      );
      if (
        !/product-intro|thumb|gallery|swiper|crop-image|j-image|goods|product-image/i.test(nearby)
      )
        continue;
      const candidates = [
        this.bestFromSrcset(this.readAttribute(tag, 'srcset')),
        this.readAttribute(tag, 'data-zoom-image'),
        this.readAttribute(tag, 'data-origin-image'),
        this.readAttribute(tag, 'data-src'),
        this.readAttribute(tag, 'src'),
      ];
      for (const candidate of candidates) {
        const normalized = this.normalizeMediaUrl(candidate ?? '', sourceUrl);
        if (!normalized || !this.isProductImageUrl(normalized)) continue;
        const key = this.productImageKey(normalized);
        if (seen.has(key)) continue;
        seen.add(key);
        images.push(normalized);
        break;
      }
    }
    return images;
  }

  private extractJsonLdProducts(html: string): Array<Record<string, unknown>> {
    const products: Array<Record<string, unknown>> = [];
    const scriptRegex =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(html))) {
      const parsed = this.safeJsonParse(this.decodeHtml(match[1] ?? ''));
      for (const item of this.flattenJsonLd(parsed)) {
        if (this.isRecord(item) && this.isProductType(item['@type'])) {
          products.push(item);
        }
      }
    }

    return products;
  }

  private extractMetaProduct(html: string): {
    title?: string;
    description?: string;
    price?: string;
    currency?: string;
    sku?: string;
    images: string[];
  } {
    return {
      title: this.readMeta(html, 'og:title') ?? this.readTitle(html),
      description: this.readMeta(html, 'og:description') ?? this.readMeta(html, 'description'),
      price: this.readMeta(html, 'product:price:amount') ?? this.readMeta(html, 'og:price:amount'),
      currency:
        this.readMeta(html, 'product:price:currency') ?? this.readMeta(html, 'og:price:currency'),
      sku: this.readMeta(html, 'product:retailer_item_id'),
      images: this.readAllMeta(html, 'og:image'),
    };
  }

  private extractRecursiveSignals(html: string): {
    name?: string;
    description?: string;
    price?: string;
    currency?: string;
    sku?: string;
    images: string[];
    variants: Array<Record<string, unknown>>;
    sizes: string[];
    colors: string[];
    warnings?: string[];
  } {
    const candidates = this.extractEmbeddedJson(html);
    const signal: {
      name?: string;
      description?: string;
      price?: string;
      currency?: string;
      sku?: string;
      images: string[];
      variants: Array<Record<string, unknown>>;
      sizes: string[];
      colors: string[];
      warnings?: string[];
    } = { images: [], variants: [], sizes: [], colors: [] };

    for (const candidate of candidates) {
      this.walkForSkuData(candidate, signal);
    }

    // Derive sizes/colors from real variants
    const sizesFromVariants = this.extractSizesFromVariants(signal.variants);
    const colorsFromVariants = this.extractColorsFromVariants(signal.variants);

    return {
      name: signal.name,
      description: signal.description,
      price: signal.price,
      currency: signal.currency,
      sku: signal.sku,
      images: this.unique(signal.images).slice(0, SHEIN_MAX_PRODUCT_IMAGES),
      variants: signal.variants.length > 0 ? signal.variants.slice(0, 80) : [],
      sizes:
        sizesFromVariants.length > 0 ? sizesFromVariants : this.unique(signal.sizes).slice(0, 30),
      colors:
        colorsFromVariants.length > 0
          ? colorsFromVariants
          : this.unique(signal.colors).slice(0, 30),
      warnings:
        signal.variants.length === 0 && (signal.sizes.length > 0 || signal.colors.length > 0)
          ? ['Could not extract real SKU variants. Manual review recommended.']
          : undefined,
    };
  }

  private walkForSkuData(
    value: unknown,
    signal: {
      name?: string;
      description?: string;
      price?: string;
      currency?: string;
      sku?: string;
      images: string[];
      variants: Array<Record<string, unknown>>;
      sizes: string[];
      colors: string[];
    },
    key = '',
    depth = 0,
  ): void {
    if (depth > 10) {
      return;
    }

    // Check for SKU variant arrays by key name
    if (
      Array.isArray(value) &&
      key &&
      /sku_list|skus|productvariants|goods_skus|product_skus|variant_list|product_variants/i.test(
        key,
      )
    ) {
      this.extractRealSkuVariants(value, signal);
      return;
    }

    // Check if this record is an option group such as { attr_name: 'Size', attr_value_list: [...] }
    if (this.isRecord(value)) {
      this.extractAttributeOptionsFromRecord(value, signal);
    }

    // Check if this is a variant object itself (has sku, size, and/or color properties)
    if (this.isRecord(value)) {
      const hasSkuProps =
        value.sku !== undefined || value.goods_sku !== undefined || value.productSku !== undefined;
      const hasSizeProps =
        value.size !== undefined || value.size_name !== undefined || value.sizeName !== undefined;
      const hasColorProps =
        value.color !== undefined ||
        value.color_name !== undefined ||
        value.colorName !== undefined;

      if ((hasSkuProps || (hasSizeProps && hasColorProps)) && !Array.isArray(value.sku)) {
        this.extractVariantFromRecord(value, signal);
        return; // Don't recurse into variant objects
      }
    }

    // Handle primitive values
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (!text) return;

      if (!signal.sku && /^(goods_)?sn$|sku|productcode/i.test(key) && text.length <= 100) {
        signal.sku = text;
      }
      if (!signal.name && /goodsname|productname|title|name/i.test(key) && text.length <= 220) {
        signal.name = text;
      }
      if (!signal.description && /description|desc/i.test(key) && text.length <= 2000) {
        signal.description = text;
      }
      if (
        !signal.price &&
        /saleprice|retailprice|priceamount|price/i.test(key) &&
        /^\d+(?:\.\d{1,2})?$/.test(text)
      ) {
        const lowerKey = key.toLowerCase();
        const lowerText = text.toLowerCase();
        const excludedContexts =
          /shipping|delivery|installment|tax|coupon|points|free|returns|qty|quantity|add to cart|cart|size guide|swiss franc|currency|language|egyptian pound|saudi riyal|emirati dirham|us dollar|euro|pound sterling/i;
        if (!excludedContexts.test(lowerKey) && !excludedContexts.test(lowerText)) {
          signal.price = text;
        }
      }
      if (!signal.currency && /currency|currencycode/i.test(key) && /^[A-Z]{3}$/.test(text)) {
        signal.currency = text;
      }
      if (/size|sizename|size_name/i.test(key) && this.isValidSizeValue(text)) {
        signal.sizes.push(text);
      }
      if (/colou?r|colorname|color_name/i.test(key) && this.isValidColorValue(text)) {
        signal.colors.push(text);
      }
      if (this.isProductImageUrl(text)) {
        signal.images.push(this.ensureHttps(text));
      }
    }

    // Recurse into arrays and objects
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 80)) {
        this.walkForSkuData(item, signal, key, depth + 1);
      }
    } else if (this.isRecord(value)) {
      for (const [childKey, childValue] of Object.entries(value).slice(0, 120)) {
        this.walkForSkuData(childValue, signal, childKey, depth + 1);
      }
    }
  }

  private extractAttributeOptionsFromRecord(
    record: Record<string, unknown>,
    signal: { sizes: string[]; colors: string[] },
  ): void {
    const label = this.firstString(
      record.attr_name,
      record.attrName,
      record.attributeName,
      record.name,
      record.title,
      record.label,
    )?.toLowerCase();
    if (!label || !/(size|مقاس|color|colour|لون)/i.test(label)) return;

    const source =
      record.attr_value_list ??
      record.attrValueList ??
      record.valueList ??
      record.values ??
      record.options ??
      record.list;
    const values = this.collectOptionValueNames(source);
    if (/size|مقاس/i.test(label)) {
      signal.sizes.push(...values.filter((value) => this.isValidSizeValue(value)));
    }
    if (/colou?r|لون/i.test(label)) {
      signal.colors.push(...values.filter((value) => this.isValidColorValue(value)));
    }
  }

  private collectOptionValueNames(value: unknown, depth = 0): string[] {
    if (depth > 5) return [];
    if (typeof value === 'string' || typeof value === 'number') {
      return [String(value).replace(/\s+/g, ' ').trim()].filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectOptionValueNames(item, depth + 1));
    }
    if (!this.isRecord(value)) return [];

    const direct = this.firstString(
      value.attr_value_name,
      value.attrValueName,
      value.valueName,
      value.attrValue,
      value.value,
      value.name,
      value.title,
      value.label,
    );
    const nested =
      value.attr_value_list ??
      value.attrValueList ??
      value.valueList ??
      value.values ??
      value.options ??
      value.list;
    return [direct, ...this.collectOptionValueNames(nested, depth + 1)]
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.replace(/\s+/g, ' ').trim());
  }

  private buildVariantsFromOptions(
    sizes: string[],
    colors: string[],
  ): Array<Record<string, unknown>> {
    const cleanSizes = this.unique(sizes)
      .filter((value) => this.isValidSizeValue(value))
      .slice(0, 30);
    const cleanColors = this.unique(colors)
      .filter((value) => this.isValidColorValue(value))
      .slice(0, 30);
    const variants: Array<Record<string, unknown>> = [];

    if (
      cleanSizes.length > 0 &&
      cleanColors.length > 0 &&
      cleanSizes.length * cleanColors.length <= 80
    ) {
      for (const size of cleanSizes) {
        for (const color of cleanColors) {
          variants.push({
            nameAr: `${size} / ${color}`,
            size,
            color,
            stockQuantity: DEFAULT_SHEIN_IMPORT_VARIANT_STOCK,
          });
        }
      }
    } else if (cleanSizes.length > 0) {
      for (const size of cleanSizes) {
        variants.push({ nameAr: size, size, stockQuantity: DEFAULT_SHEIN_IMPORT_VARIANT_STOCK });
      }
    } else if (cleanColors.length > 0) {
      for (const color of cleanColors) {
        variants.push({ nameAr: color, color, stockQuantity: DEFAULT_SHEIN_IMPORT_VARIANT_STOCK });
      }
    }

    return variants;
  }

  private extractRealSkuVariants(
    skuArray: unknown,
    signal: { variants: Array<Record<string, unknown>>; sizes: string[]; colors: string[] },
  ): void {
    if (!Array.isArray(skuArray)) return;

    for (const item of skuArray) {
      if (!this.isRecord(item)) continue;

      const sku =
        typeof item.sku === 'string'
          ? item.sku.trim()
          : typeof item.goods_sku === 'string'
            ? item.goods_sku.trim()
            : typeof item.productSku === 'string'
              ? item.productSku.trim()
              : undefined;
      const size =
        typeof item.size === 'string' || typeof item.size === 'number'
          ? String(item.size).replace(/\s+/g, ' ').trim()
          : typeof item.size_name === 'string'
            ? item.size_name.trim()
            : typeof item.sizeName === 'string'
              ? item.sizeName.trim()
              : undefined;
      const color =
        typeof item.color === 'string' || typeof item.color === 'number'
          ? String(item.color).trim()
          : typeof item.color_name === 'string'
            ? item.color_name.trim()
            : typeof item.colorName === 'string'
              ? item.colorName.trim()
              : undefined;
      const stock =
        typeof item.stock === 'number'
          ? item.stock
          : typeof item.stockQuantity === 'number'
            ? item.stockQuantity
            : typeof item.inventory === 'number'
              ? item.inventory
              : undefined;

      // Validate: skip if this looks like a size guide entry or invalid value
      if (size && !this.isValidSizeValue(size)) continue;
      if (color && !this.isValidColorValue(color)) continue;
      if (!sku && !size && !color) continue;

      signal.variants.push({
        sku: sku ? sku.slice(0, 80) : undefined,
        nameAr: size && color ? `${size} / ${color}` : (size ?? color ?? 'Variant'),
        size: size ? size.slice(0, 60) : undefined,
        color: color ? color.slice(0, 80) : undefined,
        stockQuantity:
          typeof stock === 'number' && stock > 0 ? stock : DEFAULT_SHEIN_IMPORT_VARIANT_STOCK,
      });
    }
  }

  private isValidSizeValue(value: string): boolean {
    const text = value.trim().toLowerCase();
    const invalidPatterns =
      /size guide|model stats|bust|waist|hip|length|shoulder|measurement|add to cart|select size|sold out|quantity|undefined|null/i;
    return !invalidPatterns.test(text) && this.looksLikeSizeValue(value);
  }

  private isValidColorValue(value: string): boolean {
    const text = value.trim().toLowerCase();
    const invalidPatterns =
      /select color|choose color|more image|size guide|chart|guide|undefined|null/i;
    return !invalidPatterns.test(text) && this.looksLikeColorValue(value);
  }

  private extractVariantFromRecord(
    record: Record<string, unknown>,
    signal: { variants: Array<Record<string, unknown>> },
  ): void {
    const sku =
      typeof record.sku === 'string'
        ? record.sku.trim()
        : typeof record.goods_sku === 'string'
          ? record.goods_sku.trim()
          : typeof record.productSku === 'string'
            ? record.productSku.trim()
            : undefined;
    const size =
      typeof record.size === 'string' || typeof record.size === 'number'
        ? String(record.size).replace(/\s+/g, ' ').trim()
        : typeof record.size_name === 'string'
          ? record.size_name.trim()
          : typeof record.sizeName === 'string'
            ? record.sizeName.trim()
            : undefined;
    const color =
      typeof record.color === 'string' || typeof record.color === 'number'
        ? String(record.color).trim()
        : typeof record.color_name === 'string'
          ? record.color_name.trim()
          : typeof record.colorName === 'string'
            ? record.colorName.trim()
            : undefined;
    const stock =
      typeof record.stock === 'number'
        ? record.stock
        : typeof record.stockQuantity === 'number'
          ? record.stockQuantity
          : typeof record.inventory === 'number'
            ? record.inventory
            : undefined;

    if (size && !this.isValidSizeValue(size)) return;
    if (color && !this.isValidColorValue(color)) return;
    if (!sku && !size && !color) return;

    signal.variants.push({
      sku: sku ? sku.slice(0, 80) : undefined,
      nameAr: size && color ? `${size} / ${color}` : (size ?? color ?? 'Variant'),
      size: size ? size.slice(0, 60) : undefined,
      color: color ? color.slice(0, 80) : undefined,
      stockQuantity:
        typeof stock === 'number' && stock > 0 ? stock : DEFAULT_SHEIN_IMPORT_VARIANT_STOCK,
    });
  }

  private extractSizesFromVariants(variants: Array<Record<string, unknown>>): string[] {
    const sizes: string[] = [];
    const seen = new Set<string>();
    for (const variant of variants) {
      const size = typeof variant.size === 'string' ? variant.size.trim() : undefined;
      if (size && this.isValidSizeValue(size)) {
        const key = size.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          sizes.push(size);
        }
      }
    }
    return sizes;
  }

  private extractColorsFromVariants(variants: Array<Record<string, unknown>>): string[] {
    const colors: string[] = [];
    const seen = new Set<string>();
    for (const variant of variants) {
      const color = typeof variant.color === 'string' ? variant.color.trim() : undefined;
      if (color && this.isValidColorValue(color)) {
        const key = color.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          colors.push(color);
        }
      }
    }
    return colors;
  }

  private looksLikeSizeValue(value: string): boolean {
    const text = value.trim();
    return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|[0-9]xl|one size|eu ?[0-9]{2}|us ?[0-9]{1,2}(?:\.[0-9])?|uk ?[0-9]{1,2}(?:\.[0-9])?|[0-9]{1,3}(?:\.[0-9])?|[0-9]{1,2}-[0-9]{1,2}|[0-9]{1,2}y)$/i.test(
      text,
    );
  }

  private looksLikeColorValue(value: string): boolean {
    const text = value.trim();
    return (
      text.length > 2 &&
      text.length <= 40 &&
      !this.looksLikeSizeValue(text) &&
      !/select|size|guide|chart|undefined|null/i.test(text)
    );
  }

  private extractEmbeddedJson(html: string): unknown[] {
    const values: unknown[] = [];
    const nextData = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(
      html,
    )?.[1];
    if (nextData) {
      const parsed = this.safeJsonParse(this.decodeHtml(nextData));
      if (parsed) {
        values.push(parsed);
      }
    }

    const stateRegex =
      /<script[^>]*>\s*window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)\s*;?\s*<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = stateRegex.exec(html))) {
      const parsed = this.safeJsonParse(match[1] ?? '');
      if (parsed) {
        values.push(parsed);
      }
    }

    return values;
  }

  private extractV1VisibleSignals(
    html: string,
    sourceUrl: string,
  ): { name?: string; price?: string; currency?: string; sku?: string; images: string[] } {
    const decoded = this.decodeHtml(html)
      .replace(/\\u002F/gi, '/')
      .replace(/\\u0026/gi, '&')
      .replace(/\\\//g, '/');
    const currency = this.firstString(
      /"(?:priceCurrency|currency|currencyCode)"\s*:\s*"([A-Z]{3})"/i.exec(decoded)?.[1],
      this.readMeta(html, 'product:price:currency'),
      this.readMeta(html, 'og:price:currency'),
      process.env.SHEIN_IMPORT_CURRENCY,
    );

    const pricePatterns = [
      /"(?:salePrice|sale_price|salePriceAmount|discountPrice|finalPrice|currentPrice|retailPrice|amountWithSymbol|unit_price|retail_price|priceAmount)"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)/gi,
      /"(?:salePrice|retailPrice|price)"\s*:\s*\{[^{}]{0,500}?"(?:amount|value)"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)/gi,
    ];
    const prices: Array<{ value: string; hasCurrency: boolean; context: string }> = [];
    for (const regex of pricePatterns) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(decoded)) && prices.length < 40) {
        if (match[1]) {
          const context = decoded
            .slice(Math.max(0, match.index - 120), match.index + match[0].length + 120)
            .toLowerCase();
          const excludedContexts =
            /shipping|delivery|installment|tax|coupon|points?|free|returns|qty|quantity|add to cart|cart|size guide|swiss franc|currency|language|egyptian pound|saudi riyal|emirati dirham|us dollar|euro|pound sterling/i;
          if (excludedContexts.test(context)) continue;
          const hasCurrency = /sar|egp|aed|kwd|usd|us\$|\$|£|€/i.test(context);
          prices.push({ value: match[1], hasCurrency, context });
        }
      }
    }

    prices.sort((a, b) => {
      if (b.hasCurrency !== a.hasCurrency) return b.hasCurrency ? 1 : -1;
      const numA = Number(a.value);
      const numB = Number(b.value);
      if (Number.isFinite(numA) && Number.isFinite(numB) && numA > 0 && numB > 0) {
        if (Math.abs(numA - numB) < 0.01) return 0;
        return numA < numB ? -1 : 1;
      }
      return 0;
    });

    const imageValues = [
      this.readMeta(html, 'og:image'),
      this.readMeta(html, 'twitter:image'),
      ...[
        ...decoded.matchAll(
          /"(?:image_url|goods_img|origin_image|originalImage|imageUrl|goods_img_url|src)"\s*:\s*"((?:https?:)?\/?\/[^"\\]+)"/gi,
        ),
      ].map((item) => item[1] ?? ''),
      ...[
        ...decoded.matchAll(
          /(?:https?:)?\/?\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'\s<>]*)?/gi,
        ),
      ].map((item) => item[0] ?? ''),
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);

    const slugName = this.nameFromUrl(sourceUrl);
    const name = this.firstString(
      /"goods_name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i.exec(decoded)?.[1],
      /"productName"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i.exec(decoded)?.[1],
      this.readMeta(html, 'og:title'),
      this.readMeta(html, 'twitter:title'),
      this.readTitle(html),
      slugName,
    )
      ?.replace(/\s*[|\-–]\s*SHEIN.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      name,
      price: prices.length > 0 ? prices[0].value : undefined,
      currency,
      sku: /"(?:goods_sn|goodsSn|sku|productCode)"\s*:\s*"([^"\\]+)"/i.exec(decoded)?.[1],
      images: this.unique(
        imageValues
          .map((url) => this.ensureHttps(this.normalizeMediaUrl(url, sourceUrl)))
          .filter((url) => this.isProductImageUrl(url)),
      ).slice(0, SHEIN_MAX_PRODUCT_IMAGES),
    };
  }

  private assertDetectedCurrencyMatches(
    detectedCurrency: string | undefined,
    expectedCurrency: string,
  ): void {
    const detected = detectedCurrency?.trim().toUpperCase();
    if (detected && detected !== expectedCurrency) {
      throw new BadRequestException(
        'The visible price does not match the selected currency. Please reopen the link with the correct settings.',
      );
    }
  }

  private extractOptionList(
    variants: Array<Record<string, unknown>>,
    key: 'size' | 'color',
  ): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const variant of variants) {
      const value =
        typeof variant[key] === 'string' ? String(variant[key]).replace(/\s+/g, ' ').trim() : '';
      if (!value) continue;
      const normalized = value.slice(0, key === 'size' ? 60 : 80);
      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      result.push(normalized);
      if (result.length >= 40) break;
    }
    return result;
  }

  private normalizeMediaUrl(value: string, baseUrl: string): string {
    const raw = this.decodeHtml(String(value || ''))
      .replaceAll('\\/', '/')
      .replaceAll('\\u002F', '/')
      .trim();
    if (!raw) {
      return '';
    }
    try {
      return normalizeImageUrl(raw, baseUrl) ?? '';
    } catch {
      return '';
    }
  }

  private moneyFromText(value: string): string | undefined {
    const normalized = String(value || '')
      .replace(/,/g, '')
      .match(/[0-9]+(?:\.[0-9]{1,2})?/);
    if (!normalized) return undefined;
    const amount = Number(normalized[0]);
    return Number.isFinite(amount) && amount > 0 && amount < 1_000_000 ? normalized[0] : undefined;
  }

  private readAttribute(tag: string, name: string): string | undefined {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`\\s${escaped}=["']([^"']+)["']`, 'i').exec(tag);
    return match?.[1] ? this.decodeHtml(match[1]).trim() : undefined;
  }

  private bestFromSrcset(value: string | undefined): string | undefined {
    const parts = String(value || '')
      .split(',')
      .map((entry) => {
        const pieces = entry.trim().split(/\s+/);
        const width = Number((pieces[1] || '').replace(/[^0-9.]/g, '')) || 0;
        return { url: pieces[0] || '', width };
      })
      .filter((entry) => entry.url);
    parts.sort((a, b) => b.width - a.width);
    return parts[0]?.url;
  }

  private productImageKey(value: string): string {
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

  private nameFromUrl(sourceUrl: string): string | undefined {
    try {
      return (
        decodeURIComponent(new URL(sourceUrl).pathname.split('/').pop() || '')
          .replace(/-p-\d+\.html.*$/i, '')
          .replaceAll('-', ' ')
          .trim() || undefined
      );
    } catch {
      return undefined;
    }
  }

  private flattenJsonLd(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.flattenJsonLd(item));
    }
    if (this.isRecord(value) && Array.isArray(value['@graph'])) {
      return [value, ...value['@graph'].flatMap((item) => this.flattenJsonLd(item))];
    }
    return [value];
  }

  private extractOfferPrice(offers: unknown): string | undefined {
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (!this.isRecord(offer)) {
      return undefined;
    }
    const price = offer.price ?? offer.lowPrice;
    return typeof price === 'string' || typeof price === 'number' ? String(price) : undefined;
  }

  private extractOfferCurrency(offers: unknown): string | undefined {
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (!this.isRecord(offer)) {
      return undefined;
    }
    return typeof offer.priceCurrency === 'string' ? offer.priceCurrency : undefined;
  }

  private imagesFromJsonLd(value: unknown): string[] {
    if (typeof value === 'string') {
      return [value];
    }
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return [];
  }

  private mergeImages(urls: string[]): Array<{ url: string; altTextAr?: string }> {
    return this.unique(
      urls.map((url) => this.ensureHttps(url)).filter((url) => this.isProductImageUrl(url)),
    )
      .slice(0, SHEIN_MAX_PRODUCT_IMAGES)
      .map((url) => ({ url }));
  }

  private readMeta(html: string, name: string): string | undefined {
    return this.readAllMeta(html, name)[0];
  }

  private readAllMeta(html: string, name: string): string[] {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}"[^>]+content=["']([^"']+)["'][^>]*>`,
      'gi',
    );
    const values: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html))) {
      values.push(this.decodeHtml(match[1] ?? '').trim());
    }
    return values.filter(Boolean);
  }

  private readTitle(html: string): string | undefined {
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
    return title ? this.decodeHtml(title).trim() : undefined;
  }

  private safeJsonParse(value: string): unknown | null {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return undefined;
  }

  private isProductType(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'product';
    }
    return Array.isArray(value) && value.some((item) => this.isProductType(item));
  }

  private isProductImageUrl(value: string): boolean {
    return isLikelyProductImage(value);
  }

  private ensureHttps(value: string): string {
    if (value.startsWith('//')) {
      return `https:${value}`;
    }
    return value.replace(/^http:\/\//i, 'https://');
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private decodeHtml(value: string): string {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x2F;/g, '/');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
