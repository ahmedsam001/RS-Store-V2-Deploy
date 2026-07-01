import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { SheinReviewEditorProps, Notice } from '@/features/admin/shein/types/shein.types';
import {
  normalizeEditorPayload,
  sanitizeSheinAdminMessage,
  calculateStorePrice,
  buildReviewChecklist,
  sheinCycleStepIndex,
  shouldShowManualNotice,
  cleanOptionList,
  prepareReviewedPayload,
  buildSheinAdminOpenUrl,
  countryLabel,
} from '@/features/admin/shein/utils/shein-review-utils';
import { adminApi, SheinPreviewPayload, AdminSheinMarketplaceSettings, AdminSheinImport } from '@/features/admin/api/admin-api';
import { SheinPriceSummary } from './SheinPriceSummary';
import { SheinReviewChecklist } from './SheinReviewChecklist';
import { SheinReviewProgress } from './SheinReviewProgress';
import { SheinReviewEditorButtons } from './SheinReviewEditorButtons';
import { SheinEditorForm } from './SheinEditorForm';
import { getSubCategories, hasStaticSubCategories } from '@/shared/constants/product-categories';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';

const MANUAL_REVIEW_MESSAGE =
  'System could not extract all data automatically. Open the SHEIN link to complete product data manually.';

export function SheinReviewEditor({
  item,
  categories,
  marketplace,
  sarExchangeRate,
  onActionComplete,
}: SheinReviewEditorProps) {
  const { csrfToken } = useAuth();
  const base = useMemo(
    () =>
      normalizeEditorPayload(
        item.editedPayload ?? item.previewPayload ?? createEmptyPayload(item.sourceUrl, marketplace),
        marketplace,
        sarExchangeRate,
        categories,
      ),
    [item, marketplace, sarExchangeRate, categories],
  );
  const [payload, setPayload] = useState(base);
  const [notice, setNotice] = useState<Notice>(null);
  const [publishPhase, setPublishPhase] = useState<'reviewing' | 'approving' | 'publishing' | null>(null);
  useEffect(() => setPayload(base), [base]);

  const hasExtractedData = Boolean(
    (item.previewPayload || item.editedPayload) &&
      payload.nameAr.trim() &&
      (payload.images ?? []).length > 0,
  );
  const isTerminal = ['PROCESSING', 'PUBLISHED', 'SUCCEEDED'].includes(item.status);
  const isManualFallback =
    ['FAILED', 'MANUAL_REVIEW'].includes(item.status) &&
    !item.previewPayload &&
    !item.editedPayload;
  const canEdit =
    !isTerminal &&
    ['PREVIEW_READY', 'FAILED', 'MANUAL_REVIEW', 'REVIEWING', 'REVIEWED', 'APPROVED'].includes(item.status);
  const canRetry = ['FAILED', 'MANUAL_REVIEW', 'PREVIEW_READY', 'REVIEWING', 'REVIEWED'].includes(item.status);
  const selectedCategory = categories.find((c) => c.id === payload.categoryId);
  const subCategories = getSubCategories(selectedCategory?.slug);
  const hasStaticSubCategoryOptions = hasStaticSubCategories(selectedCategory?.slug);
  const calculatedStorePrice = calculateStorePrice(payload.priceAmount, sarExchangeRate);
  const reviewChecklist = buildReviewChecklist(payload, calculatedStorePrice);
  const canPublishReviewedPayload = reviewChecklist.every((step) => step.done);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice({ type: 'success', message: success });
      await onActionComplete();
    } catch (error) {
      setNotice({
        type: 'error',
        message: sanitizeSheinAdminMessage(error instanceof Error ? error.message : 'Operation failed'),
      });
    }
  }

  async function publishProduct() {
    const nextPayload = reviewedPayload();
    const validationMessage = validatePublishPayload(nextPayload);
    if (validationMessage) {
      setNotice({ type: 'error', message: validationMessage });
      return;
    }
    setNotice(null);
    try {
      const reviewedStatuses = ['REVIEWED', 'APPROVED', 'PRODUCT_CREATED'];
      const approvedStatuses = ['APPROVED', 'PRODUCT_CREATED'];
      if (!reviewedStatuses.includes(item.status)) {
        setPublishPhase('reviewing');
        setNotice({ type: 'warning', message: 'Reviewing product...' });
        await adminApi.reviewSheinProduct(item.id, nextPayload, { csrfToken });
      }
      if (!approvedStatuses.includes(item.status)) {
        setPublishPhase('approving');
        setNotice({ type: 'warning', message: 'Approving product...' });
        await adminApi.approveSheinProduct(item.id, nextPayload, { csrfToken });
      }
      setPublishPhase('publishing');
      setNotice({ type: 'warning', message: 'Publishing product...' });
      await adminApi.publishSheinProduct(item.id, nextPayload, { csrfToken });
      setNotice({ type: 'success', message: 'Product published successfully' });
      await onActionComplete();
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to publish product',
      });
    } finally {
      setPublishPhase(null);
    }
  }

  function update(key: keyof SheinPreviewPayload, value: string | number | undefined) {
    setPayload((current) => ({
      ...current,
      [key]: key === 'currency' ? 'SAR' : value,
    }));
  }

  function updateMainCategory(nextCategoryId: string) {
    const adminCategory = categories.find((category) => category.id === nextCategoryId);
    const nextSlug = adminCategory?.slug;
    const nextSubCategories = getSubCategories(nextSlug);
    setPayload((current) => ({
      ...current,
      categoryId: adminCategory?.id,
      categorySlug: nextSlug,
      categoryName: adminCategory?.nameEn ?? adminCategory?.nameAr ?? undefined,
      subCategory: nextSubCategories.includes(current.subCategory ?? '')
        ? current.subCategory
        : (nextSubCategories[0] ?? current.subCategory ?? ''),
    }));
  }

  function updateOptionList(key: 'sizes' | 'colors', nextValues: string[]) {
    setPayload((current) => ({ ...current, [key]: cleanOptionList(nextValues) }));
  }

  function reviewedPayload() {
    return prepareReviewedPayload(payload, categories, sarExchangeRate);
  }

  function validatePublishPayload(nextPayload: SheinPreviewPayload): string | null {
    const price = Number(String(nextPayload.priceAmount ?? '').replace(/,/g, '').trim());
    if (!nextPayload.nameAr.trim()) return 'Please enter product title before publishing';
    if (!(nextPayload.description ?? '').trim()) return 'Please enter product description before publishing';
    if (!Number.isFinite(price) || price <= 0) return 'Please enter valid product price before publishing';
    if (!nextPayload.categoryId?.trim()) return 'Please select category before publishing';
    if (!(nextPayload.images ?? []).length) return 'Please add at least one product image before publishing';
    const invalidVariant = (nextPayload.variants ?? []).find((variant) => {
      const stock = Number(variant.stockQuantity ?? 0);
      return !variant.nameAr?.trim() || !Number.isFinite(stock) || stock < 0;
    });
    if (invalidVariant) return 'Please review product variants before publishing';
    return null;
  }

  return (
    <Card className="admin-shein-editor-card">
      <CardHeader>
        <div className="admin-shein-editor-title">
          <div>
            <p className="admin-shein-kicker">Review screen</p>
            <CardTitle>Review Product Before Publishing</CardTitle>
          </div>
          <Badge>{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <SheinEditorActions item={item} marketplace={marketplace} payload={payload} />
        <SheinReviewProgress currentStepIndex={sheinCycleStepIndex(item.status)} />
        <SheinReviewChecklist steps={reviewChecklist} />
        <SheinPriceSummary
          sheinPrice={payload.priceAmount}
          exchangeRate={sarExchangeRate}
          storePrice={calculatedStorePrice}
          discount={payload.discount ?? 0}
          rating={payload.rating ?? 0}
        />

        {(isManualFallback || (shouldShowManualNotice(item) && !hasExtractedData)) ? (
          <div className="admin-shein-manual-box">
            <strong>Manual review</strong>
            <p>{sanitizeSheinAdminMessage(item.errorMessage || MANUAL_REVIEW_MESSAGE)}</p>
            <small>Review required data and click Publish Product when complete</small>
          </div>
        ) : null}

        {(payload.warnings ?? []).length > 0 ? (
          <div className="admin-shein-error-box">
            <strong>Marketplace settings alert</strong>
            {payload.warnings?.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {!payload.categoryId && selectedCategory?.slug ? (
          <div className="admin-shein-error-box">
            <strong>Category not found in database</strong>
            <p>
              An active category with slug {selectedCategory?.slug} must exist before publishing to link the product to the store
            </p>
          </div>
        ) : null}

        <SheinEditorForm
          payload={payload}
          categories={categories}
          canEdit={canEdit}
          selectedCategory={selectedCategory}
          subCategories={subCategories}
          hasStaticSubCategoryOptions={hasStaticSubCategoryOptions}
          sarExchangeRate={sarExchangeRate}
          calculatedStorePrice={calculatedStorePrice}
          onUpdate={update}
          onUpdateMainCategory={updateMainCategory}
          onUpdateOptionList={updateOptionList}
          onImagesChange={(images) => setPayload((current) => ({ ...current, images }))}
          onNoticeChange={setNotice}
        />

        <SheinReviewEditorButtons
          item={item}
          canRetry={canRetry}
          isTerminal={isTerminal}
          canPublishReviewedPayload={canPublishReviewedPayload}
          publishPhase={publishPhase}
          run={run}
          onPublish={publishProduct}
        />

        {notice ? <NoticeBox notice={notice} /> : null}
      </CardContent>
    </Card>
  );
}

function SheinEditorActions({
  item,
  marketplace,
  payload,
}: {
  item: AdminSheinImport;
  marketplace: AdminSheinMarketplaceSettings;
  payload: SheinPreviewPayload;
}) {
  return (
    <div className="admin-shein-actions-row">
      <a
        className="admin-shein-link-pill"
        href={buildSheinAdminOpenUrl(item.sourceUrl, marketplace)}
        target="_blank"
        rel="noreferrer"
      >
        Open SHEIN link in {countryLabel(marketplace, payload.country)} with SAR
      </a>
      {item.createdProduct ? <Badge>Product created: {item.createdProduct.nameAr}</Badge> : null}
    </div>
  );
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        notice.type === 'error'
          ? 'border-destructive text-destructive'
          : notice.type === 'warning'
            ? 'border-amber-300 text-amber-800'
            : 'border-green-200 text-green-700'
      }`}
    >
      {sanitizeSheinAdminMessage(notice.message)}
    </div>
  );
}

function createEmptyPayload(
  _sourceUrl: string,
  marketplace: AdminSheinMarketplaceSettings,
): SheinPreviewPayload {
  return {
    slug: '',
    nameAr: '',
    priceAmount: '',
    currency: 'SAR',
    country: marketplace.countryCode,
    selectedCountry: marketplace.countryCode,
    selectedCurrency: 'SAR',
    categorySlug: undefined,
    categoryName: undefined,
    subCategory: undefined,
    exchangeRate: 15,
    storePriceAmount: '',
    discount: 0,
    rating: 0,
    images: [],
    sizes: [],
    colors: [],
    variants: [],
  };
}
