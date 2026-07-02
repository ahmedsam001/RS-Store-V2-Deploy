import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SheinUrlService } from './shein-url.service';
import { SheinFetchedPage } from './shein.types';
import { FIXED_SHEIN_CURRENCY, SheinMarketplaceSettings } from './shein-marketplace';

const MAX_HTML_BYTES = 4_000_000;
const FETCH_TIMEOUT_MS = 22_000;
const MAX_REDIRECTS = 6;
const DEFAULT_BROWSER_TIMEOUT_MS = 6_000;

@Injectable()
export class SheinFetchService {
  constructor(
    private readonly urlService: SheinUrlService,
    private readonly configService: ConfigService,
  ) {}

  async fetchProductPage(
    sourceUrl: string,
    marketplace?: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>,
  ): Promise<SheinFetchedPage> {
    const market = this.marketplaceOrEnv(marketplace);
    const candidates = this.v1StyleUrlCandidates(sourceUrl, market);
    let lastError: unknown;

    for (const url of candidates) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await this.fetchWithValidatedRedirects(url, controller.signal, market);

        if (!response.ok) {
          lastError = new BadRequestException(`SHEIN page returned ${response.status}`);
          continue;
        }

        this.urlService.assertAllowedFetchedUrl(response.url || url.toString());
        const contentType = response.headers.get('content-type') ?? '';
        if (
          !contentType.includes('text/html') &&
          !contentType.includes('application/xhtml') &&
          !contentType.includes('text/plain')
        ) {
          lastError = new BadRequestException('SHEIN URL did not return an HTML product page');
          continue;
        }

        const html = await this.readLimitedResponse(response);
        if (html.trim().length > 200) {
          return { finalUrl: response.url || url.toString(), html };
        }
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastError instanceof BadRequestException) {
      throw lastError;
    }
    throw new ServiceUnavailableException('Unable to fetch SHEIN product page');
  }

  async dumpProductPageWithBrowser(
    sourceUrl: string,
    marketplace?: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>,
  ): Promise<SheinFetchedPage | null> {
    if (!this.shouldUseBrowserFallback()) {
      return null;
    }

    const market = this.marketplaceOrEnv(marketplace);
    const url = this.v1StyleUrlCandidates(sourceUrl, market)[0];
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsstore-v2-shein-'));

    try {
      for (const executable of this.browserExecutableCandidates()) {
        if (path.isAbsolute(executable) && !fs.existsSync(executable)) {
          continue;
        }

        const args = [
          '--headless=new',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-networking',
          '--disable-features=TranslateUI',
          '--window-size=1280,1000',
          '--lang=en-US',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
          `--user-data-dir=${tempDir}`,
          '--virtual-time-budget=12000',
          '--dump-dom',
          url.toString(),
        ];
        if (process.platform !== 'win32') {
          args.unshift('--no-sandbox');
        }

        try {
          const html = await new Promise<string>((resolve, reject) => {
            execFile(
              executable,
              args,
              { timeout: this.browserTimeoutMs(), maxBuffer: 24 * 1024 * 1024, windowsHide: true },
              (error, stdout) => {
                if (error && !stdout) {
                  reject(error);
                  return;
                }
                resolve(String(stdout || ''));
              },
            );
          });

          if (html.trim().length > 500) {
            return { finalUrl: url.toString(), html };
          }
        } catch {
          // Try the next browser executable. Smart import must still fall back to manual entry.
        }
      }

      return null;
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore temporary directory cleanup errors.
      }
    }
  }

  shouldUseBrowserFallback(): boolean {
    const mode = String(this.configService.get<string>('SHEIN_BROWSER_IMPORT') ?? 'off')
      .trim()
      .toLowerCase();
    return ['headless', 'dump'].includes(mode);
  }

  browserTimeoutMs(): number {
    const configured = Number(this.configService.get<string>('SHEIN_BROWSER_TIMEOUT_MS'));
    if (Number.isFinite(configured) && configured > 0) {
      return Math.max(2_000, Math.min(15_000, Math.trunc(configured)));
    }
    return DEFAULT_BROWSER_TIMEOUT_MS;
  }

  private v1StyleUrlCandidates(
    sourceUrl: string,
    market: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>,
  ): URL[] {
    const base = this.urlService.applyV1MarketToSheinUrl(sourceUrl, market);
    const productCandidates = this.urlService
      .productUrlCandidatesFromShare(sourceUrl)
      .map((url) => this.urlService.applyV1MarketToSheinUrl(url.toString(), market));
    return this.uniqueUrls([base, ...productCandidates]);
  }

  private async fetchWithValidatedRedirects(
    initialUrl: URL,
    signal: AbortSignal,
    market: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>,
  ): Promise<Response> {
    let currentUrl = initialUrl;

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      this.urlService.assertAllowedFetchedUrl(currentUrl.toString());
      const response = await fetch(currentUrl, {
        signal,
        redirect: 'manual',
        headers: {
          accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9,ar;q=0.7',
          cookie: this.v1StyleSheinCookie(market),
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        },
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) {
        this.urlService.assertAllowedFetchedUrl(response.url || currentUrl.toString());
        return response;
      }

      const location = response.headers.get('location');
      if (!location) {
        throw new BadRequestException('SHEIN redirect did not include a destination');
      }

      currentUrl = this.urlService.assertAllowedFetchedUrl(
        new URL(location, currentUrl).toString(),
      );
    }

    throw new BadRequestException('SHEIN page redirected too many times');
  }

  private v1StyleSheinCookie(
    market: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>,
  ): string {
    return `currency=${market.currencyCode}; language=${market.language}; country=${market.countryCode}; localcountry=${market.countryCode}`;
  }

  private marketplaceOrEnv(
    marketplace?: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>,
  ): Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'> {
    return (
      marketplace ?? {
        countryCode: (
          this.configService.get<string>('SHEIN_IMPORT_COUNTRY_CODE') ?? 'KW'
        ).toUpperCase() as SheinMarketplaceSettings['countryCode'],
        currencyCode: FIXED_SHEIN_CURRENCY,
        language: this.configService.get<string>('SHEIN_IMPORT_LANGUAGE') ?? 'en',
      }
    );
  }

  private browserExecutableCandidates(): string[] {
    const configured = this.configService.get<string>('SHEIN_BROWSER_PATH');
    return [
      ...new Set(
        [
          configured,
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          'chromium-browser',
          'chromium',
          'google-chrome',
        ].filter((value): value is string => Boolean(value)),
      ),
    ];
  }

  private uniqueUrls(urls: URL[]): URL[] {
    const seen = new Set<string>();
    return urls.filter((url) => {
      const key = url.toString();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async readLimitedResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > MAX_HTML_BYTES) {
        throw new BadRequestException('SHEIN product page is too large to import');
      }
      return text;
    }

    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      received += value.byteLength;
      if (received > MAX_HTML_BYTES) {
        throw new BadRequestException('SHEIN product page is too large to import');
      }
      chunks.push(value);
    }

    return Buffer.concat(chunks).toString('utf8');
  }
}
