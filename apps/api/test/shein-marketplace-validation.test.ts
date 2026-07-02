import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SheinPreviewNormalizer } from '../src/modules/shein/shein-preview.normalizer';
import { SheinUrlService } from '../src/modules/shein/shein-url.service';
import {
  DEFAULT_SHEIN_COUNTRY,
  FIXED_SHEIN_CURRENCY,
  normalizeSheinCountry,
} from '../src/modules/shein/shein-marketplace';

const market = { countryCode: 'KW' as const, currencyCode: 'SAR' as const, language: 'ar' };

function normalizer() {
  return new SheinPreviewNormalizer(new SheinUrlService());
}

describe('SHEIN marketplace validation', () => {
  it('defaults to Kuwait and fixed SAR currency', () => {
    assert.equal(DEFAULT_SHEIN_COUNTRY, 'KW');
    assert.equal(FIXED_SHEIN_CURRENCY, 'SAR');
    assert.equal(normalizeSheinCountry(undefined), 'KW');
  });

  it('normalizes valid reviewed payload with SAR KW and two images', () => {
    const payload = normalizer().normalize(
      {
        nameAr: 'Valid SHEIN Dress',
        priceAmount: '94.21',
        currency: 'SAR',
        country: 'KW',
        images: [
          { url: 'https://img.shein.com/images20240301/pi/12345/1.jpg' },
          { url: 'https://img.shein.com/images20240301/pi/12345/2.jpg' },
        ],
        sizes: [' S ', 'M', 'S'],
        colors: ['Black', 'Black', 'Pink'],
      },
      'https://www.shein.com/Valid-Dress-p-123456.html',
      { marketplace: market, strictImages: true },
    );

    assert.equal(payload.currency, 'SAR');
    assert.equal(payload.country, 'KW');
    assert.deepEqual(payload.sizes, ['S', 'M']);
    assert.deepEqual(payload.colors, ['Black', 'Pink']);
    assert.equal(payload.images.length, 2);
  });

  it('rejects wrong currency before publishing', () => {
    assert.throws(
      () =>
        normalizer().normalize(
          {
            nameAr: 'Wrong Currency',
            priceAmount: '94.21',
            currency: 'CHF',
            country: 'KW',
            images: [],
            variants: [],
          },
          'https://www.shein.com/Wrong-Currency-p-123456.html',
          { marketplace: market },
        ),
      /SAR/,
    );
  });

  it('rejects invalid price and keeps ordered valid gallery images', () => {
    assert.throws(
      () =>
        normalizer().normalize(
          { nameAr: 'Bad Price', priceAmount: 'NaN', currency: 'SAR', country: 'KW' },
          undefined,
          { marketplace: market },
        ),
      /Price/,
    );

    const payload = normalizer().normalize(
      {
        nameAr: 'Image Limit',
        priceAmount: '10',
        currency: 'SAR',
        country: 'KW',
        images: [
          { url: 'https://img.shein.com/images20240301/pi/12345/1.jpg' },
          { url: 'https://img.shein.com/images20240301/pi/12345/2.jpg' },
          { url: 'https://img.shein.com/images20240301/pi/12345/3.jpg' },
        ],
      },
      'https://www.shein.com/Image-Limit-p-123456.html',
      { marketplace: market },
    );

    assert.equal(payload.images.length, 3);
  });
});
