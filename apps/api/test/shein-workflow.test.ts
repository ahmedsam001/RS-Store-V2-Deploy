import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SheinImportStatus } from '@prisma/client';
import { SheinUrlService } from '../src/modules/shein/shein-url.service';
import { SheinWorkflowService } from '../src/modules/shein/shein-workflow.service';

const workflow = new SheinWorkflowService();

describe('SHEIN workflow states', () => {
  it('allows manual fallback after failed extraction', () => {
    assert.doesNotThrow(() => workflow.assertCanMoveToManualReview(SheinImportStatus.FAILED));
    assert.doesNotThrow(() => workflow.assertCanMoveToManualReview(SheinImportStatus.EXTRACTING));
    assert.doesNotThrow(() => workflow.assertCanReview(SheinImportStatus.MANUAL_REVIEW));
  });

  it('allows manual review to be saved as reviewed then approved then product-created', () => {
    assert.doesNotThrow(() => workflow.assertCanReview(SheinImportStatus.MANUAL_REVIEW));
    assert.doesNotThrow(() => workflow.assertCanApprove(SheinImportStatus.REVIEWED));
    assert.doesNotThrow(() => workflow.assertCanCreateProduct(SheinImportStatus.APPROVED));
  });

  it('allows preview-ready imports to be reviewed but blocks approval before review is saved', () => {
    assert.doesNotThrow(() => workflow.assertCanReview(SheinImportStatus.PREVIEW_READY));
    assert.throws(() => workflow.assertCanApprove(SheinImportStatus.PREVIEW_READY));
  });

  it('prevents skipping straight to product creation', () => {
    assert.throws(() => workflow.assertCanCreateProduct(SheinImportStatus.PREVIEW_READY));
    assert.throws(() => workflow.assertCanCreateProduct(SheinImportStatus.MANUAL_REVIEW));
    assert.throws(() => workflow.assertCanCreateProduct(SheinImportStatus.REVIEWED));
  });

  it('marks created and published imports as completed states', () => {
    assert.ok(workflow.completedAt(SheinImportStatus.PRODUCT_CREATED) instanceof Date);
    assert.ok(workflow.completedAt(SheinImportStatus.PUBLISHED) instanceof Date);
    assert.equal(workflow.completedAt(SheinImportStatus.MANUAL_REVIEW), undefined);
  });
});

describe('SHEIN URL normalization and market params', () => {
  const service = new SheinUrlService();
  const market = { countryCode: 'KW', currencyCode: 'SAR', language: 'ar' };

  it('normalizes V1-style SHEIN appjump links and strips tracking noise', () => {
    const link =
      'api-shein.shein.com/h5/sharejump/appjump?link=RqlfknoE7CJ_&localcountry=KW&shc=2_RqlfknoE7CJ&url_from=GM71181054314';
    assert.equal(service.normalizeUrlKey(link), 'share:rqlfknoe7cj_');
    assert.equal(service.productSlugFromUrl(link, 'fallback-product'), 'shein-71181054314');
    assert.match(service.parseSheinUrl(link).toString(), /^https:\/\/api-shein\.shein\.com/);
  });

  it('adds market parameters to full product URLs', () => {
    const prepared = service.applyV1MarketToSheinUrl(
      'www.shein.com/Floral-Dress-p-123456.html?currency=SAR&lang=en',
      market,
    );
    assert.equal(prepared.searchParams.get('country'), 'KW');
    assert.equal(prepared.searchParams.get('localcountry'), 'KW');
    assert.equal(prepared.searchParams.get('currency'), 'SAR');
    assert.equal(prepared.searchParams.get('lang'), 'ar');
  });

  it('uses the selected GCC country while keeping SAR fixed', () => {
    const prepared = service.applyV1MarketToSheinUrl(
      'www.shein.com/Floral-Dress-p-123456.html?currency=CHF&country=CH',
      { countryCode: 'SA', currencyCode: 'SAR', language: 'ar' },
    );
    assert.equal(prepared.searchParams.get('country'), 'SA');
    assert.equal(prepared.searchParams.get('localcountry'), 'SA');
    assert.equal(prepared.searchParams.get('currency'), 'SAR');
  });

  it('supports query-only share links', () => {
    const prepared = service.applyV1MarketToSheinUrl(
      'link=abc123&url_from=GM987654321&currency=SAR',
      market,
    );
    assert.equal(prepared.hostname, 'api-shein.shein.com');
    assert.equal(prepared.pathname, '/h5/sharejump/appjump');
    assert.equal(prepared.searchParams.get('currency'), 'SAR');
    assert.equal(prepared.searchParams.get('country'), 'KW');
  });

  it('supports partial appjump links without https', () => {
    const prepared = service.applyV1MarketToSheinUrl(
      'h5/sharejump/appjump?link=abc&goods_id=123456',
      market,
    );
    assert.equal(prepared.hostname, 'api-shein.shein.com');
    assert.equal(prepared.searchParams.get('goods_id'), '123456');
    assert.equal(prepared.searchParams.get('lang'), 'ar');
  });
});
