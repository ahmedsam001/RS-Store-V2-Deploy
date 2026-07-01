import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLikelyProductImage, selectMainProductImages } from '../src/modules/shein/shein-image-filter';

describe('SHEIN image filter', () => {
  it('keeps ordered real main product gallery images', () => {
    const selected = selectMainProductImages([
      'https://img.shein.com/images20240301/pi/12345/1.jpg',
      'https://img.shein.com/images20240301/pi/12345/2.jpg',
      'https://img.shein.com/images20240301/pi/12345/3.jpg',
    ]);

    assert.deepEqual(selected, [
      'https://img.shein.com/images20240301/pi/12345/1.jpg',
      'https://img.shein.com/images20240301/pi/12345/2.jpg',
      'https://img.shein.com/images20240301/pi/12345/3.jpg',
    ]);
  });

  it('removes icons stars logos placeholders svg data URLs and review images', () => {
    const urls = [
      'data:image/png;base64,abc',
      'https://img.shein.com/logo.png',
      'https://img.shein.com/images20240301/pi/12345/facebook-icon.jpg',
      'https://img.shein.com/images20240301/pi/12345/instagram-logo.jpg',
      'https://img.shein.com/images20240301/pi/12345/visa-payment.jpg',
      'https://img.shein.com/images20240301/pi/12345/mastercard-footer.jpg',
      'https://img.shein.com/images20240301/pi/12345/paypal-social.jpg',
      'https://img.shein.com/star.png',
      'https://img.shein.com/images20240301/pi/12345/review-1.jpg',
      'https://img.shein.com/images20240301/pi/12345/size-guide.jpg',
      'https://img.shein.com/images20240301/pi/12345/icon.svg',
      'https://img.shein.com/images20240301/pi/12345/1.jpg',
    ];

    assert.deepEqual(selectMainProductImages(urls), ['https://img.shein.com/images20240301/pi/12345/1.jpg']);
  });

  it('deduplicates resized versions of the same gallery image', () => {
    const selected = selectMainProductImages([
      'https://img.shein.com/images20240301/pi/12345/1_405x552.jpg?x=1',
      'https://img.shein.com/images20240301/pi/12345/1.jpg?x=2',
      'https://img.shein.com/images20240301/pi/12345/2.jpg',
    ]);

    assert.equal(selected.length, 2);
    assert.equal(selected[0], 'https://img.shein.com/images20240301/pi/12345/1_405x552.jpg?x=1');
  });

  it('rejects size guide swatches and non product image paths', () => {
    assert.equal(isLikelyProductImage('https://img.shein.com/images20240301/spmp/12345/a.jpg'), false);
    assert.equal(isLikelyProductImage('https://img.shein.com/images20240301/pi/12345/color-swatch.jpg'), false);
    assert.equal(isLikelyProductImage('https://example.com/images20240301/pi/12345/1.jpg'), false);
  });

  it('rejects banners swatches size guides review photos and tracking pixels', () => {
    const urls = [
      'https://img.shein.com/images20240301/pi/12345/banner-main.jpg',
      'https://img.shein.com/images20240301/pi/12345/size-chart.jpg',
      'https://img.shein.com/images20240301/pi/12345/color-block.jpg',
      'https://img.shein.com/images20240301/pi/12345/customer-review.jpg',
      'https://img.shein.com/images20240301/pi/12345/tracking-pixel.jpg',
      'https://img.shein.com/images20240301/pi/12345/front.jpg',
      'https://img.shein.com/images20240301/pi/12345/back.jpg',
      'https://img.shein.com/images20240301/pi/12345/side.jpg',
    ];

    assert.deepEqual(selectMainProductImages(urls), [
      'https://img.shein.com/images20240301/pi/12345/front.jpg',
      'https://img.shein.com/images20240301/pi/12345/back.jpg',
      'https://img.shein.com/images20240301/pi/12345/side.jpg',
    ]);
  });

});
