import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class SheinUrlService {
  normalizeUrlKey(sourceUrl: string): string {
    return this.sheinLinkKey(sourceUrl).slice(0, 300);
  }

  sheinLinkKey(sourceUrl: string): string {
    const url = this.parseSheinUrl(sourceUrl);
    const share = url.searchParams.get('link') || url.searchParams.get('shc');
    if (share) {
      return `share:${String(share).replace(/^\d+_/, '').trim().toLowerCase()}`;
    }

    const productId = this.productIdFromUrl(url);
    if (productId) {
      return `product:${productId}`;
    }

    for (const key of [...url.searchParams.keys()]) {
      if (/^(url_from|ref|referrer|utm_|src_|source|share_from|campaign)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    url.searchParams.sort();
    return `${url.hostname}${url.pathname}${url.search}`.toLowerCase();
  }

  applyV1MarketToSheinUrl(
    sourceUrl: string,
    market: { countryCode: string; currencyCode: string; language: string },
  ): URL {
    const url = this.parseSheinUrl(sourceUrl);
    url.hash = '';
    url.searchParams.set('currency', market.currencyCode.toUpperCase());
    url.searchParams.set('lang', market.language || 'en');
    url.searchParams.set('country', market.countryCode.toUpperCase());
    url.searchParams.set('localcountry', market.countryCode.toUpperCase());
    return this.parseSheinUrl(url.toString());
  }

  productUrlCandidatesFromShare(sourceUrl: string): URL[] {
    const url = this.parseSheinUrl(sourceUrl);
    const candidates: URL[] = [];
    const productId = this.productIdFromUrl(url);
    if (productId && !/-p-\d+/i.test(url.pathname)) {
      candidates.push(this.parseSheinUrl(`https://www.shein.com/p-${productId}.html`));
    }
    return candidates;
  }

  productSlugFromUrl(sourceUrl: string, fallback: string): string {
    const url = this.parseSheinUrl(sourceUrl);
    const productId = this.productIdFromUrl(url);
    const pathPart = url.pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/\.html?$/i, '')
      .replace(/^appjump$/i, '')
      .replace(/^sharejump$/i, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return this.toSlug(pathPart || (productId ? `shein-${productId}` : fallback));
  }

  toSlug(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);

    return slug || `shein-${Date.now()}`;
  }

  parseSheinUrl(sourceUrl: string): URL {
    const url = this.parseUrl(this.normalizeSheinInput(sourceUrl), 'Invalid SHEIN product URL');

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('SHEIN URL must use HTTP or HTTPS');
    }

    if (url.username || url.password) {
      throw new BadRequestException('SHEIN URL must not include credentials');
    }

    if (!this.isAllowedSheinHost(url.hostname)) {
      throw new BadRequestException('Only SHEIN product URLs are allowed');
    }

    return url;
  }

  assertAllowedFetchedUrl(sourceUrl: string): URL {
    return this.parseSheinUrl(sourceUrl);
  }

  assertAllowedSheinImageUrl(imageUrl: string): URL {
    const url = this.parseUrl(imageUrl, 'Invalid SHEIN image URL');

    if (url.protocol !== 'https:') {
      throw new BadRequestException('SHEIN image URLs must use HTTPS');
    }

    if (url.username || url.password) {
      throw new BadRequestException('SHEIN image URLs must not include credentials');
    }

    if (!this.isAllowedSheinImageHost(url.hostname)) {
      throw new BadRequestException('Only SHEIN image CDN URLs are allowed');
    }

    return url;
  }

  private normalizeSheinInput(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) {
      throw new BadRequestException('SHEIN URL is required');
    }

    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^\/\//.test(raw)) return `https:${raw}`;

    if (/^(?:[a-z0-9-]+\.)?shein\.[a-z.]{2,}(?:[/:?#]|$)/i.test(raw)) return `https://${raw}`;

    const queryOnly = raw.replace(/^\?+/, '').replace(/^&+/, '');
    if (this.looksLikeSheinShareQuery(queryOnly)) {
      return new URL(
        `/h5/sharejump/appjump?${queryOnly}`,
        'https://api-shein.shein.com',
      ).toString();
    }

    if (raw.startsWith('/')) return new URL(raw, 'https://www.shein.com').toString();
    if (/^appjump(?:[/?#]|$)/i.test(raw))
      return new URL(`/${raw.replace(/^\/+/, '')}`, 'https://www.shein.com').toString();
    if (/^h5\/sharejump\/appjump(?:[/?#]|$)/i.test(raw))
      return new URL(`/${raw.replace(/^\/+/, '')}`, 'https://api-shein.shein.com').toString();
    if (/^(?:[a-z0-9-]+\.)?shein\.[a-z.]{2,}(?:[/:?#]|$)/i.test(raw)) return `https://${raw}`;
    throw new BadRequestException('Enter an official SHEIN product or share link');
  }

  private looksLikeSheinShareQuery(value: string): boolean {
    if (!value || value.length > 3000 || /\s/.test(value)) {
      return false;
    }
    return /(?:^|&)(?:link|shc|url_from|src_identifier|goods_id|goodsId|product_id|mallCode|skucode|skuCode|cat_id|currency|country|localcountry|lang)=/i.test(
      value,
    );
  }

  private productIdFromUrl(url: URL): string | undefined {
    const fromPath = url.pathname.match(/-p-(\d+)/i)?.[1];
    const fromQuery =
      url.searchParams.get('goods_id') ||
      url.searchParams.get('goodsId') ||
      url.searchParams.get('product_id');
    const fromShare = url.searchParams.get('url_from') || url.searchParams.get('src_identifier');
    const fromShareDigits = fromShare?.match(/(?:GM)?(\d{6,})/i)?.[1];
    return fromPath || fromQuery || fromShareDigits || undefined;
  }

  private parseUrl(value: string, errorMessage: string): URL {
    try {
      return new URL(value);
    } catch {
      throw new BadRequestException(errorMessage);
    }
  }

  private isAllowedSheinHost(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    if (this.looksLikeLocalHost(normalized)) {
      return false;
    }

    const accepted =
      normalized === 'shein.com' ||
      normalized.endsWith('.shein.com') ||
      /^([a-z0-9-]+\.)?shein\.[a-z.]{2,}$/i.test(normalized);
    return accepted;
  }

  private isAllowedSheinImageHost(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    if (this.looksLikeLocalHost(normalized)) {
      return false;
    }

    const allowedHosts = new Set([
      'img.shein.com',
      'img.ltwebstatic.com',
      'ltwebstatic.com',
      'shein.com',
      'www.shein.com',
      'm.shein.com',
      'ar.shein.com',
      'us.shein.com',
      'eur.shein.com',
      'shein.co.uk',
      'www.shein.co.uk',
      'm.shein.co.uk',
    ]);

    return (
      allowedHosts.has(normalized) ||
      normalized.endsWith('.shein.com') ||
      normalized.endsWith('.shein.co.uk') ||
      normalized.endsWith('.ltwebstatic.com')
    );
  }

  private looksLikeLocalHost(hostname: string): boolean {
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  }
}
