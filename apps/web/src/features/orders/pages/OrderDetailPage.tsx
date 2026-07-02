import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { PATHS } from '@/shared/constants/routes';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { useAuth } from '@/features/auth';
import { buildCustomerAuthPath, currentPathWithSearch } from '@/shared/lib/return-to';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import {
  settingsApi,
  readSetting,
  type StorefrontSettings,
} from '@/features/settings/settings-api';
import { ordersApi } from '@/features/orders/api/orders-api';
import { PaymentProofUploader } from '@/features/orders/components/PaymentProofUploader';
import {
  OrderItemStatusLabel,
  OrderStatusBadge,
  PaymentProofStatusBadge,
  PaymentStatusBadge,
} from '@/features/orders/components/OrderStatusBadge';
import { formatOrderDate, formatOrderMoney } from '@/features/orders/order-format';
import type {
  CustomerSheinBatchStatus,
  Order,
  OrderItem,
  OrderPaymentProof,
} from '@/shared/types/OrderTypes';

type FinalPaymentMethodChoice = 'instapay' | 'vodafone' | 'cash_at_shop';

type FinalPaymentPreview = {
  method: FinalPaymentMethodChoice;
  methodLabel: string;
  receiverLabel: string;
  receiverValue: string | null;
  baseAmount: number;
  feeAmount: number;
  amountDue: number;
  feePercent: number;
  isOnline: boolean;
};

export function OrderDetailPage() {
  useDocumentMetadata({
    title: 'Order Details | RS Store',
    description: 'Order status and payment proof details',
  });
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, csrfToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [finalPaymentMethod, setFinalPaymentMethod] =
    useState<FinalPaymentMethodChoice>('instapay');
  const [cashSubmitError, setCashSubmitError] = useState<string | null>(null);

  const canUploadDeposit = order?.paymentStatus === 'DEPOSIT_REJECTED';
  const canUploadFinal =
    order?.paymentStatus === 'FINAL_PAYMENT_PENDING' ||
    order?.paymentStatus === 'FINAL_PAYMENT_REJECTED';
  const paymentProofs = useMemo(() => order?.paymentProofs ?? [], [order]);
  const depositProof = paymentProofs.find((proof) => proof.type === 'DEPOSIT') ?? null;
  const finalPaymentProof = paymentProofs.find((proof) => proof.type === 'FINAL_PAYMENT') ?? null;
  const rejectedDepositProof =
    order?.paymentStatus === 'DEPOSIT_REJECTED'
      ? (paymentProofs.find((proof) => proof.type === 'DEPOSIT' && proof.status === 'REJECTED') ??
        null)
      : null;
  const rejectedFinalPaymentProof =
    order?.paymentStatus === 'FINAL_PAYMENT_REJECTED'
      ? (paymentProofs.find(
          (proof) => proof.type === 'FINAL_PAYMENT' && proof.status === 'REJECTED',
        ) ?? null)
      : null;
  const vodafoneCash = readSetting(settings, 'payment.vodafoneCash', '01018313022');
  const instapay = readSetting(settings, 'payment.instapay', '01018313022');
  const vodafoneFeePercent = toSafePercent(
    readSetting(settings, 'payment.vodafoneFeePercent', '1'),
  );
  const finalPaymentPreview = useMemo(
    () =>
      order
        ? buildFinalPaymentPreview({
            order,
            method: finalPaymentMethod,
            vodafoneFeePercent,
            vodafoneCash,
            instapay,
          })
        : null,
    [finalPaymentMethod, instapay, order, vodafoneCash, vodafoneFeePercent],
  );
  const pageNotice =
    typeof (location.state as { message?: unknown } | null)?.message === 'string'
      ? String((location.state as { message?: string }).message)
      : null;

  useEffect(() => {
    settingsApi
      .storefront()
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    if (!id || status !== 'anonymous') return;
    const returnTo = currentPathWithSearch(
      location.pathname,
      location.search,
      location.hash,
      `/orders/${id}`,
    );
    navigate(buildCustomerAuthPath(PATHS.login, returnTo), {
      replace: true,
      state: { returnTo, reason: 'auth' },
    });
  }, [id, location.hash, location.pathname, location.search, navigate, status]);

  useEffect(() => {
    if (!id || status === 'loading') return;
    if (status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    const orderId = id;
    const controller = new AbortController();
    async function loadOrder() {
      try {
        setIsLoading(true);
        setError(null);
        setOrder(await ordersApi.getMyOrder(orderId, { signal: controller.signal }));
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Failed to load order');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();
    return () => controller.abort();
  }, [id, status]);

  async function uploadDeposit(file: File) {
    if (!order) return;
    setOrder(await ordersApi.uploadDepositProof(order.id, file, { csrfToken }));
  }

  async function uploadFinalPayment(file: File) {
    if (!order || finalPaymentMethod === 'cash_at_shop') return;
    setOrder(
      await ordersApi.uploadFinalPaymentProof(order.id, file, finalPaymentMethod, { csrfToken }),
    );
  }

  async function submitCashFinalPayment() {
    if (!order) return;
    try {
      setCashSubmitError(null);
      setOrder(await ordersApi.submitCashFinalPayment(order.id, { csrfToken }));
    } catch (caughtError) {
      setCashSubmitError(
        caughtError instanceof Error ? caughtError.message : 'Failed to select cash payment',
      );
    }
  }

  if (isLoading || status === 'loading')
    return (
      <div className="rs-page-stack">
        <CatalogState title="Loading order" message="Preparing order tracking details" />
      </div>
    );
  if (status !== 'authenticated')
    return (
      <div className="rs-page-stack">
        <CatalogState
          title="Sign in required"
          message="Please sign in to track your order"
          ctaLabel="Sign In"
          ctaHref={PATHS.login}
        />
      </div>
    );
  if (error)
    return (
      <div className="rs-page-stack">
        <CatalogState
          title="Failed to load order"
          message={error}
          ctaLabel="Try Again"
          ctaHref={PATHS.orders}
        />
      </div>
    );
  if (!order)
    return (
      <div className="rs-page-stack">
        <CatalogState
          title="Order not found"
          message="Verify your order link or check your order history"
          ctaLabel="View Orders"
          ctaHref={PATHS.orders}
        />
      </div>
    );

  return (
    <div className="rs-page-stack">
      <div className="rs-panel overflow-hidden p-0">
        <div className="bg-gradient-to-l from-rs-cream-warm via-card to-rs-cream p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
                Order Details
              </p>
              <h1 className="mt-2 text-2xl font-black text-rs-ink tracking-tight sm:text-3xl">
                Order {order.orderNumber}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Created {formatOrderDate(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={PATHS.orders}>All Orders</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={PATHS.home}>Continue Shopping</Link>
            </Button>
            {depositProof?.secureUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={depositProof.secureUrl} target="_blank" rel="noreferrer">
                  View transfer image <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {pageNotice ? (
        <div
          className="rounded-2xl border border-rs-green/30 bg-rs-green-bg p-3 text-sm font-extrabold text-rs-green"
          role="status"
        >
          {pageNotice}
        </div>
      ) : null}

      <NextActionCard order={order} finalPaymentPreview={finalPaymentPreview} />
      <SheinBatchTracking order={order} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {canUploadFinal && finalPaymentPreview ? (
            <FinalPaymentActionPanel
              order={order}
              finalPaymentMethod={finalPaymentMethod}
              onMethodChange={setFinalPaymentMethod}
              preview={finalPaymentPreview}
              rejectedProof={rejectedFinalPaymentProof}
              finalPaymentProof={finalPaymentProof}
              cashSubmitError={cashSubmitError}
              onCashSubmit={submitCashFinalPayment}
              onUpload={uploadFinalPayment}
            />
          ) : null}

          <section className="rs-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
                  Products
                </p>
                <h2 className="mt-1 text-lg font-black text-rs-ink">Order Products</h2>
              </div>
              <span className="rounded-full bg-rs-cream-warm px-3 py-1 text-xs font-extrabold text-muted-foreground">
                {order.items.length} items
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {order.items.map((item) => (
                <article key={item.id} className="rs-order-product-card">
                  <div className="rs-order-product-main">
                    <div className="rs-order-product-thumb">
                      <ImageWithFallback
                        src={resolveOrderItemImageUrl(item)}
                        alt={resolveOrderItemImageAlt(item)}
                        loading="lazy"
                        className="rs-order-product-thumb-media"
                        fallbackVariant="product"
                      />
                    </div>

                    <div className="rs-order-product-info">
                      <h3 className="rs-order-product-title">{item.productNameSnapshot}</h3>
                      {item.productVariantNameSnapshot ? (
                        <p className="rs-order-product-variant">
                          {item.productVariantNameSnapshot}
                        </p>
                      ) : null}
                      {item.productVariantSizeSnapshot || item.productVariantColorSnapshot ? (
                        <p className="rs-order-product-options">
                          {[item.productVariantSizeSnapshot, item.productVariantColorSnapshot]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      ) : null}

                      <div className="rs-order-product-meta">
                        <span>Qty {item.quantity}</span>
                        <span className="rs-order-product-store-badge">
                          <OrderItemStatusLabel status={item.status} />
                        </span>
                      </div>
                    </div>
                  </div>

                  <OrderItemSheinBadge item={item} />
                </article>
              ))}
            </div>
          </section>

          {canUploadDeposit ? (
            <section className="rs-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
                    Deposit Payment
                  </p>
                  <h2 className="mt-1 text-lg font-black text-rs-ink">
                    Upload Deposit Proof Again
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload a clearer transfer image so admin can review your deposit again.
                  </p>
                </div>
              </div>

              <RejectionNotice
                proof={rejectedDepositProof}
                fallback="Deposit proof was rejected. Please upload a new clear image."
              />

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-rs-peach-light bg-rs-cream-warm p-3">
                  <p className="text-xs font-extrabold text-muted-foreground">Vodafone Cash</p>
                  <p className="mt-1 font-black text-rs-ink">{vodafoneCash}</p>
                </div>
                <div className="rounded-2xl border border-rs-peach-light bg-rs-cream-warm p-3">
                  <p className="text-xs font-extrabold text-muted-foreground">Instapay</p>
                  <p className="mt-1 font-black text-rs-ink">{instapay}</p>
                </div>
              </div>

              <div className="mt-3">
                <PaymentProofUploader label="Deposit proof" onUpload={uploadDeposit} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <PaymentSummary order={order} finalPaymentPreview={finalPaymentPreview} />
          <ShippingSummary order={order} />
          <ProofList proofs={paymentProofs} />
          <CustomerTimeline order={order} />
        </aside>
      </div>
    </div>
  );
}

function resolveOrderItemImageUrl(item: OrderItem): string | null {
  return (
    item.imageUrl ||
    item.thumbnailUrl ||
    item.productImage ||
    item.product?.imageUrl ||
    item.product?.thumbnailUrl ||
    item.product?.images?.[0]?.url ||
    item.product?.images?.[0]?.secureUrl ||
    null
  );
}

function resolveOrderItemImageAlt(item: OrderItem): string {
  return (
    item.product?.images?.[0]?.altText ||
    item.product?.images?.[0]?.altTextEn ||
    item.product?.images?.[0]?.altTextAr ||
    item.productNameSnapshot ||
    item.product?.nameEn ||
    item.product?.nameAr ||
    'Product image'
  );
}

function RejectionNotice({
  proof,
  fallback,
}: {
  proof: OrderPaymentProof | null;
  fallback: string;
}) {
  const reason = proof?.rejectionReason?.trim();
  return (
    <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
      <p className="font-extrabold">Rejected by admin</p>
      <p className="mt-1 font-semibold">{reason ? `Reason: ${reason}` : fallback}</p>
      {proof?.createdAt ? (
        <p className="mt-1 text-xs font-semibold opacity-80">
          Rejected proof uploaded {formatOrderDate(proof.createdAt)}
        </p>
      ) : null}
    </div>
  );
}

function SheinBatchTracking({ order }: { order: Order }) {
  const trackedItems = order.items
    .map((item) => ({ item, tracking: item.sheinBatchItems?.[0] ?? null }))
    .filter((entry) => entry.tracking?.batch);

  if (trackedItems.length === 0) return null;

  const primaryBatch = trackedItems[0].tracking!.batch;

  return (
    <section className="rs-panel overflow-hidden p-0">
      <div className="bg-gradient-to-l from-[#fff6e4] via-card to-[#f8dfd8] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
              SHEIN Shipment Tracking
            </p>
            <h2 className="mt-1 text-lg font-black text-rs-ink">
              Your order is inside shipment {primaryBatch.batchCode}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Current state {sheinStatusLabel(primaryBatch.status)} · Updated{' '}
              {formatOrderDate(primaryBatch.updatedAt)}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-rs-gold shadow-sm">
            {sheinStatusLabel(primaryBatch.status)}
          </span>
        </div>

        <SheinStatusTimeline
          status={primaryBatch.status}
          history={primaryBatch.statusHistory ?? []}
        />

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {trackedItems.map(({ item, tracking }) => (
            <article
              key={`${item.id}-${tracking!.id}`}
              className="rounded-2xl border border-rs-peach-light bg-white/85 p-3 shadow-sm"
            >
              <p className="text-sm font-black text-rs-ink">{item.productNameSnapshot}</p>
              {item.productVariantNameSnapshot ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.productVariantNameSnapshot}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                Qty {tracking!.quantity} · Shipment {tracking!.batch.batchCode} ·{' '}
                {sheinStatusLabel(tracking!.batch.status)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OrderItemSheinBadge({ item }: { item: OrderItem }) {
  const tracking = item.sheinBatchItems?.[0];
  if (!tracking?.batch) return null;
  return (
    <div className="rs-order-product-shipment">
      SHEIN shipment <strong>{tracking.batch.batchCode}</strong> ·{' '}
      <span>{sheinStatusLabel(tracking.batch.status)}</span>
    </div>
  );
}

const SHEIN_TRACKING_STEPS: CustomerSheinBatchStatus[] = [
  'ORDERED_FROM_SHEIN',
  'SHIPPING',
  'CUSTOMS',
  'ARRIVED_EGYPT',
  'ARRIVED_STORE',
  'READY_FOR_PICKUP',
  'DELIVERED',
];

function SheinStatusTimeline({
  status,
  history,
}: {
  status: CustomerSheinBatchStatus;
  history: Array<{ toStatus: CustomerSheinBatchStatus; createdAt: string }>;
}) {
  if (status === 'DRAFT') {
    return (
      <p className="mt-4 rounded-2xl bg-white/75 p-3 text-sm font-bold text-muted-foreground">
        Shipment is being prepared by the admin
      </p>
    );
  }
  if (status === 'CANCELLED') {
    return (
      <p className="mt-4 rounded-2xl bg-destructive/10 p-3 text-sm font-bold text-destructive">
        This SHEIN shipment was cancelled
      </p>
    );
  }

  const currentIndex = SHEIN_TRACKING_STEPS.indexOf(status);
  return (
    <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6" dir="ltr">
      {SHEIN_TRACKING_STEPS.map((step, index) => {
        const completed = currentIndex >= index;
        const historyEvent = history.find((item) => item.toStatus === step);
        return (
          <div
            key={step}
            className={`rounded-2xl border p-3 text-center shadow-sm ${completed ? 'border-rs-gold bg-white text-rs-ink' : 'border-rs-peach-light bg-white/55 text-muted-foreground'}`}
          >
            <div
              className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${completed ? 'bg-rs-gold text-white' : 'bg-rs-cream-warm'}`}
            >
              {completed ? '✓' : index + 1}
            </div>
            <p className="text-xs font-black leading-5">{sheinStatusLabel(step)}</p>
            {historyEvent ? (
              <p className="mt-1 text-[10px] font-semibold opacity-75">
                {formatOrderDate(historyEvent.createdAt)}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function sheinStatusLabel(status: CustomerSheinBatchStatus): string {
  const labels: Record<CustomerSheinBatchStatus, string> = {
    DRAFT: 'Preparing shipment',
    ORDERED_FROM_SHEIN: 'Ordered from SHEIN',
    SHIPPING: 'Shipping',
    CUSTOMS: 'At customs',
    ARRIVED_EGYPT: 'Arrived Egypt',
    ARRIVED_STORE: 'Arrived at store',
    READY_FOR_PICKUP: 'Ready for pickup',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return labels[status];
}

function NextActionCard({
  order,
  finalPaymentPreview,
}: {
  order: Order;
  finalPaymentPreview: FinalPaymentPreview | null;
}) {
  const action = getNextAction(order, finalPaymentPreview);
  if (!action) return null;

  return (
    <section className="rounded-3xl border border-rs-peach bg-rs-cream-warm p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
            Next Action
          </p>
          <h2 className="mt-1 text-xl font-black text-rs-ink">{action.title}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
            {action.message}
          </p>
        </div>
        {action.amount ? (
          <div className="rounded-2xl border border-rs-peach-light bg-card px-4 py-3 text-start shadow-sm lg:min-w-56">
            <p className="text-xs font-extrabold text-muted-foreground">{action.amountLabel}</p>
            <p className="mt-1 text-2xl font-black rs-price-primary">{action.amount}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FinalPaymentActionPanel({
  order,
  finalPaymentMethod,
  onMethodChange,
  preview,
  rejectedProof,
  finalPaymentProof,
  cashSubmitError,
  onCashSubmit,
  onUpload,
}: {
  order: Order;
  finalPaymentMethod: FinalPaymentMethodChoice;
  onMethodChange: (method: FinalPaymentMethodChoice) => void;
  preview: FinalPaymentPreview;
  rejectedProof: OrderPaymentProof | null;
  finalPaymentProof: OrderPaymentProof | null;
  cashSubmitError: string | null;
  onCashSubmit: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <section className="rs-panel overflow-hidden p-0">
      <div className="bg-gradient-to-l from-rs-cream-warm via-card to-rs-cream p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
              Final Payment
            </p>
            <h2 className="mt-1 text-xl font-black text-rs-ink">Pay the remaining amount</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
              Choose one method. The amount below updates before you upload the proof.
            </p>
          </div>
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>

        {order.paymentStatus === 'FINAL_PAYMENT_REJECTED' ? (
          <RejectionNotice
            proof={rejectedProof}
            fallback="Final payment was rejected. Please choose the payment method again or upload a corrected transfer image."
          />
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <FinalPaymentMethodButton
            value="instapay"
            label="Instapay"
            hint="No extra fee"
            selected={finalPaymentMethod === 'instapay'}
            onSelect={onMethodChange}
          />
          <FinalPaymentMethodButton
            value="vodafone"
            label="Vodafone Cash"
            hint={`Adds ${preview.feePercent}% fee`}
            selected={finalPaymentMethod === 'vodafone'}
            onSelect={onMethodChange}
          />
          <FinalPaymentMethodButton
            value="cash_at_shop"
            label="Cash at store"
            hint="Pay when pickup"
            selected={finalPaymentMethod === 'cash_at_shop'}
            onSelect={onMethodChange}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
          <div className="rounded-2xl border border-rs-peach-light bg-card p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
              Amount to transfer
            </p>
            <p className="mt-2 text-3xl font-black rs-price-primary">
              {formatOrderMoney(preview.amountDue, order.currency)}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <SummaryRow
                label="Remaining before fee"
                value={formatOrderMoney(preview.baseAmount, order.currency)}
              />
              <SummaryRow
                label={
                  preview.method === 'vodafone'
                    ? `Vodafone Cash fee ${preview.feePercent}%`
                    : 'Final payment fee'
                }
                value={formatOrderMoney(preview.feeAmount, order.currency)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-rs-peach-light bg-card p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
              Selected method
            </p>
            <p className="mt-2 text-lg font-black text-rs-ink">{preview.methodLabel}</p>
            {preview.receiverValue ? (
              <>
                <p className="mt-3 text-xs font-extrabold text-muted-foreground">
                  {preview.receiverLabel}
                </p>
                <p className="mt-1 break-words text-base font-black text-rs-ink">
                  {preview.receiverValue}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">
                No transfer proof needed. Confirm this choice and pay when you reach the store.
              </p>
            )}
          </div>
        </div>

        {preview.isOnline ? (
          <div className="mt-4">
            <PaymentProofUploader
              label={
                finalPaymentProof?.status === 'REJECTED'
                  ? 'Upload Final Payment Proof Again'
                  : 'Upload final payment proof'
              }
              onUpload={onUpload}
            />
            <p className="mt-2 rounded-2xl bg-rs-cream-warm p-3 text-xs font-semibold leading-5 text-muted-foreground">
              Transfer exactly {formatOrderMoney(preview.amountDue, order.currency)} using{' '}
              {preview.methodLabel}, then upload the receipt image.
            </p>
          </div>
        ) : (
          <Button type="button" className="rs-btn-secondary mt-4 w-full" onClick={onCashSubmit}>
            Select cash at store payment
          </Button>
        )}

        {cashSubmitError ? (
          <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
            {cashSubmitError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function FinalPaymentMethodButton({
  value,
  label,
  hint,
  selected,
  onSelect,
}: {
  value: FinalPaymentMethodChoice;
  label: string;
  hint: string;
  selected: boolean;
  onSelect: (method: FinalPaymentMethodChoice) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-2xl border p-3 text-start transition hover:-translate-y-0.5 hover:shadow-md ${
        selected
          ? 'border-rs-gold bg-rs-cream-warm shadow-sm'
          : 'border-rs-peach-light bg-card shadow-sm'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-black text-rs-ink">{label}</span>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black ${
            selected ? 'border-rs-gold bg-rs-gold text-white' : 'border-rs-peach text-transparent'
          }`}
          aria-hidden="true"
        >
          ✓
        </span>
      </span>
      <span className="mt-1 block text-xs font-semibold text-muted-foreground">{hint}</span>
    </button>
  );
}

function PaymentSummary({
  order,
  finalPaymentPreview,
}: {
  order: Order;
  finalPaymentPreview: FinalPaymentPreview | null;
}) {
  const savedFinalDue = toOrderRawAmount(order.finalAmountDue);
  const displayFinalDue =
    finalPaymentPreview?.amountDue ??
    (savedFinalDue > 0 ? savedFinalDue : toOrderRawAmount(order.remainingAmount));
  return (
    <div className="rs-panel p-4 sm:p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
        Payment Summary
      </h2>
      <div className="mt-4 space-y-2 text-sm">
        <SummaryRow
          label="Subtotal"
          value={formatOrderMoney(order.subtotalAmount, order.currency)}
        />
        <SummaryRow
          label="Discount"
          value={formatOrderMoney(order.discountAmount, order.currency)}
        />
        <SummaryRow
          label={`Deposit ${order.depositPercent}%`}
          value={formatOrderMoney(order.depositAmount, order.currency)}
        />
        <SummaryRow
          label="Deposit fee"
          value={formatOrderMoney(order.depositPaymentFeeAmount, order.currency)}
        />
        <SummaryRow label="Deposit method" value={paymentMethodLabel(order.depositPaymentMethod)} />
        <SummaryRow
          label="Remaining before final fees"
          value={formatOrderMoney(order.remainingAmount, order.currency)}
        />
        <SummaryRow
          label="Final payment fee"
          value={formatOrderMoney(
            finalPaymentPreview?.feeAmount ?? order.finalPaymentFeeAmount,
            order.currency,
          )}
        />
        <SummaryRow
          label="Final method"
          value={finalPaymentPreview?.methodLabel ?? paymentMethodLabel(order.finalPaymentMethod)}
        />
        <SummaryRow
          label="Final amount to pay"
          value={formatOrderMoney(displayFinalDue, order.currency)}
          isStrong
        />
        <div className="h-px bg-rs-peach-light mt-2" />
        <SummaryRow
          label="Order total"
          value={formatOrderMoney(order.totalAmount, order.currency)}
        />
      </div>
    </div>
  );
}

function ShippingSummary({ order }: { order: Order }) {
  return (
    <div className="rs-panel p-4 sm:p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
        Delivery Address
      </h2>
      <p className="mt-3 text-sm font-extrabold text-rs-ink">{order.customerNameSnapshot}</p>
      <p className="mt-1 text-sm text-muted-foreground">{order.customerPhoneSnapshot}</p>
      <p className="mt-3 whitespace-pre-line break-words rounded-2xl bg-rs-cream-warm p-3 text-sm leading-7 text-muted-foreground">
        {order.shippingAddressSnapshot}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  isStrong = false,
}: {
  label: string;
  value: string;
  isStrong?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${isStrong ? 'border-t pt-2 text-base font-black text-rs-ink' : ''}`}
    >
      <span
        className={isStrong ? 'min-w-0 break-words' : 'min-w-0 break-words text-muted-foreground'}
      >
        {label}
      </span>
      <span
        className={
          isStrong ? 'break-words text-end rs-price-primary' : 'break-words text-end font-semibold'
        }
      >
        {value}
      </span>
    </div>
  );
}

function ProofList({ proofs }: { proofs: OrderPaymentProof[] }) {
  if (proofs.length === 0) return null;

  return (
    <div className="rs-panel p-4 sm:p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
        Payment Proofs
      </h2>
      <div className="mt-4 space-y-2.5">
        {proofs.map((proof) => (
          <div key={proof.id} className="rounded-2xl border border-rs-peach-light bg-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold">
                {proof.type === 'DEPOSIT' ? 'First payment' : 'Final payment'}
              </span>
              <PaymentProofStatusBadge status={proof.status} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatOrderDate(proof.createdAt)}
            </p>
            {proof.rejectionReason ? (
              <p className="mt-2 text-xs font-semibold text-destructive">{proof.rejectionReason}</p>
            ) : null}
            {proof.secureUrl ? (
              <Button asChild variant="ghost" size="sm" className="mt-2 px-0 text-xs font-semibold">
                <a href={proof.secureUrl} target="_blank" rel="noreferrer">
                  View image <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerTimeline({ order }: { order: Order }) {
  const timeline = order.timeline ?? [];
  if (timeline.length === 0) return null;

  return (
    <details className="rs-panel p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold">
        Order History
      </summary>
      <div className="mt-4 space-y-2.5">
        {timeline.map((event) => (
          <div key={event.id} className="rounded-2xl border border-rs-peach-light bg-card p-3.5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-extrabold leading-5">{event.message}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatOrderDate(event.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function paymentMethodLabel(method: Order['depositPaymentMethod'] | null | undefined): string {
  if (method === 'VODAFONE') return 'Vodafone Cash';
  if (method === 'INSTAPAY') return 'Instapay';
  if (method === 'CASH_AT_SHOP') return 'Cash at store';
  return 'Not selected';
}

function getNextAction(
  order: Order,
  finalPaymentPreview: FinalPaymentPreview | null,
): { title: string; message: string; amount?: string; amountLabel?: string } | null {
  if (order.paymentStatus === 'DEPOSIT_PENDING') {
    return {
      title: 'Deposit proof needed',
      message: 'Upload the first payment proof from checkout to start order confirmation.',
      amount: formatOrderMoney(order.depositAmount, order.currency),
      amountLabel: 'Deposit amount',
    };
  }

  if (order.paymentStatus === 'DEPOSIT_SUBMITTED') {
    return {
      title: 'Deposit under review',
      message:
        'We received your transfer image. Admin will approve it before SHEIN purchasing starts.',
      amount: formatOrderMoney(order.depositAmount, order.currency),
      amountLabel: 'Submitted deposit',
    };
  }

  if (order.paymentStatus === 'DEPOSIT_REJECTED') {
    return {
      title: 'Upload deposit proof again',
      message: 'The previous deposit proof was rejected. Upload a clearer receipt image below.',
      amount: formatOrderMoney(order.depositAmount, order.currency),
      amountLabel: 'Deposit amount',
    };
  }

  if (order.paymentStatus === 'DEPOSIT_APPROVED') {
    return {
      title: 'Deposit approved',
      message:
        'Your order is confirmed. Final payment will open when the items arrive at the store.',
      amount: formatOrderMoney(order.remainingAmount, order.currency),
      amountLabel: 'Remaining before fees',
    };
  }

  if (
    (order.paymentStatus === 'FINAL_PAYMENT_PENDING' ||
      order.paymentStatus === 'FINAL_PAYMENT_REJECTED') &&
    finalPaymentPreview
  ) {
    return {
      title:
        order.paymentStatus === 'FINAL_PAYMENT_REJECTED'
          ? 'Final payment proof rejected'
          : 'Final payment required',
      message:
        finalPaymentPreview.method === 'vodafone'
          ? 'Vodafone Cash fee is included in the amount to transfer before you upload the proof.'
          : 'Choose the payment method below and upload the final transfer proof.',
      amount: formatOrderMoney(finalPaymentPreview.amountDue, order.currency),
      amountLabel: 'Amount to pay now',
    };
  }

  if (order.paymentStatus === 'FINAL_PAYMENT_SUBMITTED') {
    return {
      title: 'Final payment under review',
      message: 'We received your final payment proof. Admin will approve it soon.',
      amount: formatOrderMoney(order.finalAmountDue, order.currency),
      amountLabel: 'Submitted final amount',
    };
  }

  if (order.paymentStatus === 'PAID') {
    return {
      title: 'Payment complete',
      message: 'Your order is fully paid. Follow shipment or pickup updates on this page.',
      amount: formatOrderMoney(order.finalPaidAmount, order.currency),
      amountLabel: 'Final paid',
    };
  }

  return null;
}

function buildFinalPaymentPreview({
  order,
  method,
  vodafoneFeePercent,
  vodafoneCash,
  instapay,
}: {
  order: Order;
  method: FinalPaymentMethodChoice;
  vodafoneFeePercent: number;
  vodafoneCash: string;
  instapay: string;
}): FinalPaymentPreview {
  const baseAmount = toOrderRawAmount(order.remainingAmount);
  const feeAmount = method === 'vodafone' ? calculatePercentRaw(baseAmount, vodafoneFeePercent) : 0;
  const isOnline = method !== 'cash_at_shop';

  if (method === 'vodafone') {
    return {
      method,
      methodLabel: 'Vodafone Cash',
      receiverLabel: 'Vodafone Cash number',
      receiverValue: vodafoneCash,
      baseAmount,
      feeAmount,
      amountDue: baseAmount + feeAmount,
      feePercent: vodafoneFeePercent,
      isOnline,
    };
  }

  if (method === 'cash_at_shop') {
    return {
      method,
      methodLabel: 'Cash at store',
      receiverLabel: 'Pay at pickup',
      receiverValue: null,
      baseAmount,
      feeAmount: 0,
      amountDue: baseAmount,
      feePercent: vodafoneFeePercent,
      isOnline,
    };
  }

  return {
    method,
    methodLabel: 'Instapay',
    receiverLabel: 'Instapay account',
    receiverValue: instapay,
    baseAmount,
    feeAmount: 0,
    amountDue: baseAmount,
    feePercent: vodafoneFeePercent,
    isOnline,
  };
}

function toOrderRawAmount(amount: string | number | null | undefined): number {
  if (typeof amount === 'number')
    return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  if (!amount) return 0;
  const trimmed = amount.trim();
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(trimmed.includes('.') ? parsed * 100 : parsed));
}

function toSafePercent(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(20, parsed));
}

function calculatePercentRaw(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}
