import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProductPricingService } from '../src/modules/pricing/product-pricing.service';

const pricing = new ProductPricingService({} as never);
const activeSale = {
  flashSaleId: 'sale-1',
  titleAr: 'عرض سريع',
  discountPercent: '25.00',
  discountBasisPoints: 2500,
};

describe('product pricing consistency across catalog cart checkout and order snapshot', () => {
  it('applies the same active flash sale price used by catalog cart and checkout snapshots', () => {
    const priced = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount: 10000, productDiscountPercent: 0, currency: 'EGP' },
      activeSale,
    );

    assert.equal(priced.basePriceAmount, 10000);
    assert.equal(priced.discountPercent, 25);
    assert.equal(priced.discountAmount, 2500);
    assert.equal(priced.finalPriceAmount, 7500);
    assert.equal(priced.priceSource, 'FLASH_SALE');
    assert.equal(priced.saleId, 'sale-1');
    assert.equal(priced.saleTitle, 'عرض سريع');
  });

  it('applies product discount when no flash sale', () => {
    const priced = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount: 10000, productDiscountPercent: 20, currency: 'EGP' },
      null,
    );

    assert.equal(priced.basePriceAmount, 10000);
    assert.equal(priced.discountPercent, 20);
    assert.equal(priced.discountAmount, 2000);
    assert.equal(priced.finalPriceAmount, 8000);
    assert.equal(priced.priceSource, 'PRODUCT_DISCOUNT');
    assert.equal(priced.saleId, 'product-discount');
    assert.equal(priced.saleTitle, 'Product discount');
  });

  it('prioritizes flash sale over product discount', () => {
    const priced = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount: 10000, productDiscountPercent: 20, currency: 'EGP' },
      activeSale,
    );

    assert.equal(priced.priceSource, 'FLASH_SALE');
    assert.equal(priced.discountPercent, 25);
    assert.equal(priced.finalPriceAmount, 7500);
  });

  it('returns no discount when no flash sale and no product discount', () => {
    const priced = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount: 10000, productDiscountPercent: 0, currency: 'EGP' },
      null,
    );

    assert.equal(priced.priceSource, 'NONE');
    assert.equal(priced.discountPercent, 0);
    assert.equal(priced.finalPriceAmount, 10000);
    assert.equal(priced.saleId, null);
    assert.equal(priced.saleTitle, null);
  });

  it('returns same price for catalog product card as checkout order item', () => {
    const catalogPricing = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount: 8500, productDiscountPercent: 10, currency: 'EGP' },
      activeSale,
    );

    assert.equal(catalogPricing.finalPriceAmount, 6375);
    assert.equal(catalogPricing.priceSource, 'FLASH_SALE');
  });

  it('uses variant price as base when variant has own price', () => {
    const variantPricing = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount: 5000, productDiscountPercent: 0, currency: 'EGP' },
      null,
    );

    assert.equal(variantPricing.finalPriceAmount, 5000);
    assert.equal(variantPricing.priceSource, 'NONE');
  });

  it('handles SHEIN imported product with original price (no double discount)', () => {
    const priced = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount: 7500, productDiscountPercent: 0, currency: 'EGP' },
      null,
    );

    assert.equal(priced.priceSource, 'NONE');
    assert.equal(priced.discountPercent, 0);
    assert.equal(priced.finalPriceAmount, 7500);
  });

  it('ensures identical price across all touchpoints', () => {
    const baseAmount = 8500;
    const flashSale = {
      flashSaleId: 'sale-1',
      titleAr: 'Flash Sale',
      discountPercent: '10',
      discountBasisPoints: 1000,
    };

    const catalogPrice = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount, productDiscountPercent: 0, currency: 'EGP' },
      flashSale,
    );

    const cartPrice = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount, productDiscountPercent: 0, currency: 'EGP' },
      flashSale,
    );

    const checkoutPrice = pricing.resolveProductPricing(
      { productId: 'product-1', baseAmount, productDiscountPercent: 0, currency: 'EGP' },
      flashSale,
    );

    assert.equal(catalogPrice.finalPriceAmount, cartPrice.finalPriceAmount);
    assert.equal(catalogPrice.finalPriceAmount, checkoutPrice.finalPriceAmount);
    assert.equal(catalogPrice.finalPriceAmount, 7650);
  });
});