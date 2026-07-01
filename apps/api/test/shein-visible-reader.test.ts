import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SheinAssistedBrowserService } from '../src/modules/shein/shein-assisted-browser.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function chromiumPath(): string | null {
  for (const candidate of [
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-stable',
  ]) {
    try {
      const value = execFileSync('which', [candidate], { encoding: 'utf8' }).trim();
      if (value) return value;
    } catch {
      /* optional browser test */
    }
  }
  return null;
}

async function waitJson(url: string, child: ReturnType<typeof spawn>): Promise<unknown> {
  for (let index = 0; index < 80; index += 1) {
    if (child.exitCode !== null) throw new Error(`Chromium exited with ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      /* wait */
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class Cdp {
  private readonly ws: WebSocket;
  private next = 1;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        result?: Record<string, unknown>;
        error?: { message?: string };
      };
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message || 'CDP error'));
      else pending.resolve(message.result || {});
    };
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('CDP websocket failed'));
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const id = this.next++;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 10_000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression: string): Promise<Record<string, unknown>> {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const exceptionDetails = result.exceptionDetails as
      | { text?: string; exception?: { description?: string } }
      | undefined;
    if (exceptionDetails)
      throw new Error(
        exceptionDetails.exception?.description || exceptionDetails.text || 'Runtime exception',
      );
    return (result.result as { value?: Record<string, unknown> } | undefined)?.value || {};
  }

  close(): void {
    this.ws.close();
  }
}

function visibleReaderSource(): string {
  const servicePath = path.resolve(
    __dirname,
    '../src/modules/shein/shein-assisted-browser.service.ts',
  );
  const source = fs.readFileSync(servicePath, 'utf8');
  const start =
    source.indexOf('const VISIBLE_PAGE_READER = String.raw`') +
    'const VISIBLE_PAGE_READER = String.raw`'.length;
  const end = source.indexOf('`;\n\ntype AssistedBrowserHandle', start);
  if (start < 0 || end < 0) throw new Error('Could not locate VISIBLE_PAGE_READER');
  return source.slice(start, end).trim();
}

async function runVisibleReaderOnHtml(context: { skip: (message?: string) => void }, html: string): Promise<Record<string, unknown> | null> {
  const executable = chromiumPath();
  if (!executable) {
    context.skip('Chromium is not installed in this environment');
    return null;
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rsstore-capture-browser-'));
  const port = 12_000 + Math.floor(Math.random() * 3_000);
  const chrome = spawn(
    executable,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${path.join(temp, 'profile')}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let cdp: Cdp | undefined;

  try {
    await waitJson(`http://127.0.0.1:${port}/json/version`, chrome);
    const target = (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: 'PUT',
    }).then((response) => response.json())) as { webSocketDebuggerUrl: string };
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    const tree = (await cdp.send('Page.getFrameTree')) as {
      frameTree: { frame: { id: string } };
    };
    await cdp.send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html });
    await sleep(300);
    return cdp.eval(`(${visibleReaderSource()})({currencyCode:'SAR'})`);
  } finally {
    try {
      cdp?.close();
    } catch {
      /* ignore */
    }
    try {
      chrome.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await sleep(120);
      try {
        fs.rmSync(temp, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
        break;
      } catch {
        // Ignore cleanup retry failures in test teardown.
      }
    }
  }
}

describe('SHEIN visible Chrome reader', () => {
  it('returns verification for CAPTCHA html with social icons, never ready', async (context) => {
    const result = await runVisibleReaderOnHtml(context, `<!doctype html><html><head>
      <title>SHEIN Verification</title>
      <script src="https://example.com/cf-turnstile/challenge.js"></script>
      </head><body>
      <main id="px-captcha" class="security verification challenge">
        <h1>Verify you are not a robot</h1>
        <p>Slide to complete SHEIN verification</p>
        <iframe title="captcha challenge" src="https://captcha.example.com/turnstile"></iframe>
      </main>
      <footer>
        <img src="https://img.shein.com/images20240301/pi/12345/facebook-icon.jpg">
        <img src="https://img.shein.com/images20240301/pi/12345/visa-payment.jpg">
      </footer>
      </body></html>`);
    if (!result) return;

    assert.equal(result.state, 'verification');
  });

  it('does not return ready for pages with only payment and social images', async (context) => {
    const result = await runVisibleReaderOnHtml(context, `<!doctype html><html><body>
      <h1>SHEIN</h1>
      <footer class="footer social payment">
        <img alt="visa" width="160" height="100" src="https://img.shein.com/images20240301/pi/12345/visa-payment.jpg">
        <img alt="mastercard" width="160" height="100" src="https://img.shein.com/images20240301/pi/12345/mastercard-footer.jpg">
        <img alt="facebook" width="160" height="100" src="https://img.shein.com/images20240301/pi/12345/facebook-icon.jpg">
        <img alt="instagram" width="160" height="100" src="https://img.shein.com/images20240301/pi/12345/instagram-logo.jpg">
      </footer>
      </body></html>`);
    if (!result) return;

    assert.notEqual(result.state, 'ready');
  });

  it('returns ready for product title price and two valid SHEIN product images', async (context) => {
    const result = (await runVisibleReaderOnHtml(context, `<!doctype html><html><body>
      <section class="product-intro">
        <h1 class="product-intro__head-name">Premium Girls Dress</h1>
        <div class="product-intro__head-price"><span class="sale-price">SR88.50</span></div>
        <div class="product-intro__thumbs">
          <img alt="front" width="360" height="480" src="https://img.ltwebstatic.com/v4/j/pi/a/validA_thumbnail_405x552.jpg">
          <img alt="back" width="360" height="480" src="https://img.ltwebstatic.com/v4/j/pi/a/validB_thumbnail_405x552.jpg">
        </div>
        <button>Add to Bag</button>
      </section>
      </body></html>`)) as {
        state?: string;
        product?: { priceAmount?: string; images?: string[] };
      } | null;
    if (!result) return;

    assert.equal(result.state, 'ready');
    assert.equal(result.product?.priceAmount, '88.50');
    assert.equal(result.product?.images?.length, 2);
  });

  it('returns ready after CAPTCHA is solved even if old challenge scripts remain on the product page', async (context) => {
    const result = (await runVisibleReaderOnHtml(context, `<!doctype html><html><head>
      <title>Premium Girls Dress | SHEIN</title>
      <script src="https://example.com/recaptcha/challenge.js"></script>
      <script src="https://example.com/cf-turnstile/api.js"></script>
      </head><body>
      <section class="product-intro">
        <h1 class="product-intro__head-name">Premium Girls Dress</h1>
        <div class="product-intro__head-price"><span class="sale-price">SR88.50</span></div>
        <div class="product-intro__thumbs">
          <picture><img alt="front" width="360" height="480" src="https://img.ltwebstatic.com/v4/j/pi/a/solvedA_thumbnail_405x552.jpg"></picture>
          <picture><img alt="back" width="360" height="480" src="https://img.ltwebstatic.com/v4/j/pi/a/solvedB_thumbnail_405x552.jpg"></picture>
        </div>
        <button>Add to Bag</button>
      </section>
      </body></html>`)) as {
        state?: string;
        product?: { images?: string[] };
      } | null;
    if (!result) return;

    assert.equal(result.state, 'ready');
    assert.equal(result.product?.images?.length, 2);
  });

  it('returns ready for a full product page with hidden security artifacts', async (context) => {
    const result = (await runVisibleReaderOnHtml(context, `<!doctype html><html><head>
      <title>SHEIN verification cache</title>
      </head><body>
      <div style="display:none" class="security verification robot challenge">
        <iframe title="hidden captcha" src="https://captcha.example.com/recaptcha"></iframe>
        hidden verification text
      </div>
      <section class="product-intro">
        <h1 class="product-intro__head-name">Girls Floral Ruffle Dress</h1>
        <div class="product-intro__head-price"><span class="sale-price">SR74.00</span></div>
        <div class="product-intro__color"><button aria-label="Color Pink">Pink</button></div>
        <div class="product-intro__size"><button>S</button><button>M</button></div>
        <div class="product-intro__thumbs">
          <img alt="front" width="360" height="480" src="https://img.ltwebstatic.com/v4/j/pi/a/fullA_thumbnail_405x552.jpg">
          <img alt="back" width="360" height="480" src="https://img.ltwebstatic.com/v4/j/pi/a/fullB_thumbnail_405x552.jpg">
        </div>
        <button>Add to Cart</button>
      </section>
      <script src="https://example.com/security/challenge.js"></script>
      </body></html>`)) as {
        state?: string;
        product?: { priceAmount?: string; images?: string[] };
      } | null;
    if (!result) return;

    assert.equal(result.state, 'ready');
    assert.equal(result.product?.priceAmount, '74');
    assert.equal(result.product?.images?.length, 2);
  });

  it('selects discounted price and gallery images in visible page order', async (context) => {
    const executable = chromiumPath();
    if (!executable) {
      context.skip('Chromium is not installed in this environment');
      return;
    }

    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rsstore-capture-browser-'));
    const port = 12_000 + Math.floor(Math.random() * 3_000);
    const chrome = spawn(
      executable,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${path.join(temp, 'profile')}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let cdp: Cdp | undefined;

    try {
      await waitJson(`http://127.0.0.1:${port}/json/version`, chrome);
      const target = (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
        method: 'PUT',
      }).then((response) => response.json())) as { webSocketDebuggerUrl: string };
      cdp = new Cdp(target.webSocketDebuggerUrl);
      await cdp.open();
      await cdp.send('Page.enable');
      await cdp.send('Runtime.enable');
      const tree = (await cdp.send('Page.getFrameTree')) as {
        frameTree: { frame: { id: string } };
      };
      const html = `<!doctype html><html><head>
        <meta property="og:title" content="Test SHEIN Dress">
        <meta property="og:image" content="https://www.shein.com/test-dress-p-123456.html">
        </head><body>
        <h1 class="product-intro__head-name">Test SHEIN Dress</h1>
        <div class="product-intro__head-price"><del class="original-price">SR129.99</del><span class="sale-price">SR94.21</span></div><div class="shipping-price">Shipping SR25.00</div>
        <div class="product-intro__thumbs">
          <img alt="front" width="120" height="160" src="https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_405x552.jpg" srcset="https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_220x293.webp 220w, https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_405x552.jpg 405w">
          <img alt="back" width="120" height="160" src="https://img.ltwebstatic.com/v4/j/pi/a/itemB_thumbnail_405x552.jpg">
          <img alt="detail" width="120" height="160" src="https://img.ltwebstatic.com/v4/j/pi/a/itemC_thumbnail_405x552.webp">
        </div>
        <img class="rating-star" width="20" height="20" src="https://img.ltwebstatic.com/images3_ccc/star.png">
        <img class="currency flag" alt="Swiss franc" width="24" height="24" src="https://img.ltwebstatic.com/images3_ccc/swiss-franc.png">
        <img class="logo" width="120" height="60" src="https://img.ltwebstatic.com/she_dist/images/shein-logo.png">
        </body></html>`;
      await cdp.send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html });
      await sleep(300);
      const result = (await cdp.eval(`(${visibleReaderSource()})({currencyCode:'SAR'})`)) as {
        state?: string;
        product?: { priceAmount?: string; currency?: string; images?: string[] };
      };
      assert.equal(result.state, 'ready');
      assert.equal(result.product?.currency, 'SAR');
      assert.equal(result.product?.priceAmount, '94.21');
      assert.deepEqual(result.product?.images, [
        'https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_405x552.jpg',
        'https://img.ltwebstatic.com/v4/j/pi/a/itemB_thumbnail_405x552.jpg',
        'https://img.ltwebstatic.com/v4/j/pi/a/itemC_thumbnail_405x552.webp',
      ]);
      assert.ok(
        result.product?.images?.every(
          (value) => !/shein\.com\/test-dress-p-123456\.html/.test(value),
        ),
      );
      assert.ok(
        result.product?.images?.every(
          (value) => !/star|swiss-franc|shein-logo|images3_ccc|she_dist/i.test(value),
        ),
      );
    } finally {
      try {
        cdp?.close();
      } catch {
        /* ignore */
      }
      try {
        chrome.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await sleep(120);
        try {
          fs.rmSync(temp, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
          break;
        } catch {
          // Ignore cleanup retry failures in test teardown.
        }
      }
    }
  });
});

describe('SHEIN assisted browser session state handling', () => {
  function createServiceHarness() {
    const service = new SheinAssistedBrowserService({} as never, {} as never, {
      normalize: () => ({
        slug: 'test-product',
        nameAr: 'Ready Product',
        priceAmount: '88',
        currency: 'SAR',
        country: 'KW',
        images: [{ url: 'https://img.ltwebstatic.com/v4/j/pi/a/readyA.jpg' }, { url: 'https://img.ltwebstatic.com/v4/j/pi/a/readyB.jpg' }],
        variants: [],
      }),
    } as never);
    const serviceAny = service as unknown as {
      sessions: Map<string, unknown>;
      findBestSheinTarget: () => Promise<unknown>;
      wakeVisiblePage: () => Promise<void>;
      inspectVisiblePage: () => Promise<unknown>;
      closeSession: () => Promise<void>;
    };
    let closeCount = 0;
    serviceAny.sessions.set('job-1', {
      id: 'job-1',
      browser: {
        process: { exitCode: null, killed: false },
        port: 9222,
        profileDir: '/tmp/rsstore-test',
        temporaryProfile: false,
      },
      target: {
        id: 'target-1',
        url: 'https://www.shein.com/test-p-123456.html',
        webSocketDebuggerUrl: 'ws://127.0.0.1/devtools/page/target-1',
      },
      sourceUrl: 'https://www.shein.com/test-p-123456.html',
      preparedUrl: 'https://www.shein.com/test-p-123456.html',
      marketplace: { countryCode: 'KW', currencyCode: 'SAR', language: 'en' },
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });
    serviceAny.findBestSheinTarget = async () => null;
    serviceAny.wakeVisiblePage = async () => undefined;
    serviceAny.closeSession = async () => {
      closeCount += 1;
    };

    return {
      service,
      serviceAny,
      closeCount: () => closeCount,
    };
  }

  it('keeps the browser session open when verification is visible', async () => {
    const harness = createServiceHarness();
    harness.serviceAny.inspectVisiblePage = async () => ({
      state: 'verification',
      sourceUrl: 'https://www.shein.com/test-p-123456.html',
      message: 'SHEIN needs verification',
    });

    const result = await harness.service.readAssistedSession('job-1');

    assert.equal(result.state, 'verification');
    assert.equal(harness.closeCount(), 0);
  });

  it('returns loading for temporary DevTools timeouts and keeps the browser session open', async () => {
    const harness = createServiceHarness();
    harness.serviceAny.inspectVisiblePage = async () => {
      throw new Error('Chrome command timed out: Runtime.evaluate');
    };

    const result = await harness.service.readAssistedSession('job-1');

    assert.equal(result.state, 'loading');
    assert.match(result.message, /continue automatically/i);
    assert.equal(harness.closeCount(), 0);
  });

  it('lets a fresh ready read override a previous verification job state', async () => {
    const harness = createServiceHarness();
    harness.serviceAny.inspectVisiblePage = async () => ({
      state: 'ready',
      sourceUrl: 'https://www.shein.com/test-p-123456.html',
      product: {
        name: 'Ready Product',
        priceAmount: '88',
        currency: 'SAR',
        images: [
          'https://img.ltwebstatic.com/v4/j/pi/a/readyA.jpg',
          'https://img.ltwebstatic.com/v4/j/pi/a/readyB.jpg',
        ],
      },
    });

    const result = await harness.service.readAssistedSession('job-1');

    assert.equal(result.state, 'ready');
    assert.equal(harness.closeCount(), 1);
  });

  it('keeps waiting when the spawned Chrome process exits before DevTools reconnects', async () => {
    const harness = createServiceHarness();
    const session = harness.serviceAny.sessions.get('job-1') as {
      browser: { process: { exitCode: number | null; killed: boolean } };
      target: { webSocketDebuggerUrl?: string };
    };
    session.browser.process.exitCode = 0;
    session.target.webSocketDebuggerUrl = undefined;
    harness.serviceAny.findBestSheinTarget = async () => null;
    harness.serviceAny.inspectVisiblePage = async () => {
      throw new Error('Visible Chrome was closed before SHEIN import completed');
    };

    const result = await harness.service.readAssistedSession('job-1');

    assert.equal(result.state, 'loading');
    assert.match(result.message, /DevTools to reconnect/i);
    assert.equal(harness.closeCount(), 0);
  });
});
