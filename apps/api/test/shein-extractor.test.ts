import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SheinExtractorService } from '../src/modules/shein/shein-extractor.service';
import { SheinPreviewNormalizer } from '../src/modules/shein/shein-preview.normalizer';
import { SheinUrlService } from '../src/modules/shein/shein-url.service';

const marketplace = { countryCode: 'KW' as const, currencyCode: 'SAR' as const, language: 'ar' };

function createExtractor(): SheinExtractorService {
  const urlService = new SheinUrlService();
  const normalizer = new SheinPreviewNormalizer(urlService);
  return new SheinExtractorService(normalizer);
}

describe('SHEIN extractor', () => {
  it('extracts product data from JSON-LD', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Floral Dress","description":"Light summer dress","sku":"SH123","image":["https://img.shein.com/images20240301/pi/12345/1.webp"],"offers":{"price":"299.50","priceCurrency":"SAR"}}
      </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Floral-Dress-p-123.html',
      html,
      marketplace,
    );

    assert.equal(preview.nameAr, 'Floral Dress');
    assert.equal(preview.priceAmount, '299.50');
    assert.equal(preview.currency, 'SAR');
    assert.equal(preview.country, 'KW');
    assert.equal(preview.sku, 'SH123');
    assert.equal(preview.images.length, 1);
  });

  it('extracts product data from meta tags when JSON-LD is missing', () => {
    const html = `
      <html><head>
        <title>Casual Shirt</title>
        <meta property="og:title" content="Casual Shirt" />
        <meta property="og:description" content="Cotton shirt" />
        <meta property="product:price:amount" content="150.00" />
        <meta property="product:price:currency" content="SAR" />
        <meta property="og:image" content="https://img.shein.com/images20240301/pi/12345/1.jpg" />
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://ar.shein.com/Casual-Shirt-p-456.html',
      html,
      marketplace,
    );

    assert.equal(preview.nameAr, 'Casual Shirt');
    assert.equal(preview.description, 'Cotton shirt');
    assert.equal(preview.priceAmount, '150.00');
    assert.equal(preview.currency, 'SAR');
    assert.equal(preview.images[0]?.url, 'https://img.shein.com/images20240301/pi/12345/1.jpg');
  });

  it('supports avif images', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Avif Dress","description":"Dress","sku":"AV1","image":["https://img.shein.com/images20240301/pi/12345/1.avif"],"offers":{"price":"100.00","priceCurrency":"SAR"}}
      </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Avif-Dress-p-789.html',
      html,
      marketplace,
    );

    assert.equal(preview.images[0]?.url, 'https://img.shein.com/images20240301/pi/12345/1.avif');
  });

  it('excludes bad image assets like stars logos icons placeholders', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Star Shirt" />
        <meta property="og:image" content="https://img.shein.com/star.png" />
        <script type="application/ld+json">
          {"@type":"Product","name":"Star Shirt","image":["https://img.shein.com/logo.png","https://img.shein.com/images20240301/pi/12345/1.jpg","https://img.shein.com/placeholder.png","https://img.shein.com/icon.ico"],"offers":{"price":"200.00","priceCurrency":"SAR"}}
        </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Star-Shirt-p-999.html',
      html,
      marketplace,
    );

    assert.equal(preview.images.length, 1);
    assert.equal(preview.images[0]?.url, 'https://img.shein.com/images20240301/pi/12345/1.jpg');
  });

  it('keeps ordered gallery images up to the SHEIN import limit', () => {
    const images = Array.from(
      { length: 25 },
      (_, i) => `https://img.shein.com/images20240301/pi/12345/${i + 1}.jpg`,
    ).join(',');
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Multi Image","image":[${images
          .split(',')
          .map((url) => `"${url}"`)
          .join(',')}],"offers":{"price":"300.00","priceCurrency":"SAR"}}
      </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Multi-Image-p-111.html',
      html,
      marketplace,
    );

    assert.equal(preview.images.length, 20);
    assert.equal(preview.images[0]?.url, 'https://img.shein.com/images20240301/pi/12345/1.jpg');
    assert.equal(preview.images[19]?.url, 'https://img.shein.com/images20240301/pi/12345/20.jpg');
  });

  it('excludes shipping tax coupon points from price candidates', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Price Test","offers":{"price":"50.00","priceCurrency":"SAR"}}
      </script>
      <script>
        window.__INITIAL_STATE__ = {
          goods: {
            salePrice: "50.00",
            retailPrice: "80.00",
            shippingPrice: "10.00",
            tax: "5.00",
            coupon: "15.00",
            points: "2.00"
          }
        };
      </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Price-Test-p-222.html',
      html,
      marketplace,
    );

    assert.equal(preview.priceAmount, '50.00');
  });

  it('excludes swiss franc and currency names from price', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Currency Name","offers":{"price":"120.00","priceCurrency":"SAR"}}
      </script>
      <script>
        window.__INITIAL_STATE__ = {
          meta: {
            price: "1.00",
            currencyName: "Swiss franc"
          }
        };
      </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Currency-Name-p-333.html',
      html,
      marketplace,
    );

    assert.equal(preview.priceAmount, '120.00');
  });

  it('ignors non-shein image hosts', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"External Image","image":["https://example.com/product.jpg"],"offers":{"price":"90.00","priceCurrency":"SAR"}}
      </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/External-Image-p-444.html',
      html,
      marketplace,
    );

    assert.equal(preview.images.length, 0);
  });

  it('only accepts product image paths from shein CDN', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Path Test","image":["https://img.shein.com/images20240301/spmp/12345/a.jpg","https://img.shein.com/images20240301/pi/12345/b.jpg"],"offers":{"price":"70.00","priceCurrency":"SAR"}}
      </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Path-Test-p-555.html',
      html,
      marketplace,
    );

    assert.equal(preview.images.length, 1);
    assert.equal(preview.images[0]?.url, 'https://img.shein.com/images20240301/pi/12345/b.jpg');
  });

  it('uses discounted sale price instead of old retail price', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Discount Dress" />
        <meta property="og:image" content="https://img.shein.com/images20240301/pi/12345/1.jpg" />
        <script>
          window.__INITIAL_STATE__ = {
            "goods": {
              "goodsName": "Discount Dress",
              "salePrice": "45.00",
              "retailPrice": "90.00",
              "priceCurrency": "SAR"
            }
          };
        </script>
      </head></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/Discount-Dress-p-777.html',
      html,
      marketplace,
    );

    assert.equal(preview.priceAmount, '45.00');
  });

  it('uses visible gallery order and ignores og:image product page URLs', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Test SHEIN Dress">
        <meta property="og:image" content="https://www.shein.com/test-dress-p-123456.html">
      </head><body>
        <h1 class="product-intro__head-name">Test SHEIN Dress</h1>
        <div class="product-intro__head-price">
          <del class="original-price" style="text-decoration:line-through">SR129.99</del>
          <span class="sale-price">SR94.21</span>
        </div>
        <div class="shipping-price">Shipping SR25.00</div>
        <div class="product-intro__thumbs">
          <img alt="front" src="https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_405x552.jpg" srcset="https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_220x293.webp 220w, https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_405x552.jpg 405w">
          <img alt="duplicate front" src="https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_220x293.webp">
          <img alt="back" src="https://img.ltwebstatic.com/v4/j/pi/a/itemB_thumbnail_405x552.jpg">
          <img alt="detail" src="https://img.ltwebstatic.com/v4/j/pi/a/itemC_thumbnail_405x552.webp">
        </div>
      </body></html>
    `;

    const preview = createExtractor().extract(
      'https://www.shein.com/test-dress-p-123456.html',
      html,
      marketplace,
    );

    assert.equal(preview.nameAr, 'Test SHEIN Dress');
    assert.equal(preview.priceAmount, '94.21');
    assert.equal(preview.originalPriceAmount, '129.99');
    assert.deepEqual(
      preview.images.map((image) => image.url),
      [
        'https://img.ltwebstatic.com/v4/j/pi/a/itemA_thumbnail_405x552.jpg',
        'https://img.ltwebstatic.com/v4/j/pi/a/itemB_thumbnail_405x552.jpg',
        'https://img.ltwebstatic.com/v4/j/pi/a/itemC_thumbnail_405x552.webp',
      ],
    );
  });

  it('rejects detected marketplace currency that is not SAR', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Wrong Market Dress" />
        <meta property="product:price:amount" content="12.00" />
        <meta property="product:price:currency" content="CHF" />
        <meta property="og:image" content="https://img.shein.com/images20240301/pi/12345/1.jpg" />
      </head></html>
    `;

    assert.throws(
      () =>
        createExtractor().extract(
          'https://www.shein.com/Wrong-Market-Dress-p-888.html',
          html,
          marketplace,
        ),
      /visible price does not match (the )?selected currency/i,
    );
  });
});
