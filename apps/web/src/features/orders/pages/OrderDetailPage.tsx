import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { PATHS } from '@/shared/constants/routes';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { useAuth } from '@/features/auth';
import { buildCustomerAuthPath, currentPathWithSearch } from '@/shared/lib/return-to';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { settingsApi, readSetting, type StorefrontSettings } from '@/features/settings/settings-api';
import { ordersApi } from '@/features/orders/api/orders-api';
import { PaymentProofUploader } from '@/features/orders/components/PaymentProofUploader';
import {
  OrderItemStatusLabel,
  OrderStatusBadge,
  PaymentProofStatusBadge,
  PaymentStatusBadge,
} from '@/features/orders/components/OrderStatusBadge';
import { formatOrderDate, formatOrderMoney } from '@/features/orders/order-format';
import type { CustomerSheinBatchStatus, Order, OrderItem, OrderPaymentProof } from '@/shared/types/OrderTypes';

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
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<
    'instapay' | 'vodafone' | 'cash_at_shop'
  >('instapay');
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
      ? paymentProofs.find((proof) => proof.type === 'DEPOSIT' && proof.status === 'REJECTED') ?? null
      : null;
  const rejectedFinalPaymentProof =
    order?.paymentStatus === 'FINAL_PAYMENT_REJECTED'
      ? paymentProofs.find((proof) => proof.type === 'FINAL_PAYMENT' && proof.status === 'REJECTED') ?? null
      : null;
  const vodafoneCash = readSetting(settings, 'payment.vodafoneCash', '01018313022');
  const instapay = readSetting(settings, 'payment.instapay', '01018313022');
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
  if (error) return (
    <div className="rs-page-stack">
      <CatalogState title="Failed to load order" message={error} ctaLabel="Try Again" ctaHref={PATHS.orders} />
    </div>
  );
  if (!order) return (
    <div className="rs-page-stack">
      <CatalogState title="Order not found" message="Verify your order link or check your order history" ctaLabel="View Orders" ctaHref={PATHS.orders} />
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

      <NextStepMessage order={order} />
      <SheinBatchTracking order={order} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
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
                <article
                  key={item.id}
                  className="rounded-2xl border border-rs-peach-light bg-card p-4 shadow-sm"
                >
                  <div className="flex min-h-full flex-col justify-between gap-4">
                    <div>
                      <p className="font-extrabold text-sm leading-snug text-rs-ink">
                        {item.productNameSnapshot}
                      </p>
                      {item.productVariantNameSnapshot ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.productVariantNameSnapshot}
                        </p>
                      ) : null}
                      {item.productVariantSizeSnapshot || item.productVariantColorSnapshot ? (
                        <p className="mt-2 inline-flex rounded-full bg-rs-cream-warm px-2.5 py-1 text-xs font-bold text-muted-foreground">
                          {[item.productVariantSizeSnapshot, item.productVariantColorSnapshot]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Qty {item.quantity}</span>
                      <span className="rounded-full bg-rs-gold-bg px-3 py-1 text-xs font-black text-rs-gold">
                        <OrderItemStatusLabel status={item.status} />
                      </span>
                    </div>
                    <OrderItemSheinBadge item={item} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rs-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
                  Payment Status
                </p>
                <h2 className="mt-1 text-lg font-black text-rs-ink">Payment Summary & Transfer</h2>
              </div>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PaymentInfoCard
                label={`Deposit ${order.depositPercent}%`}
                value={formatOrderMoney(order.depositPaidAmount, order.currency)}
                hint={paymentMethodLabel(order.depositPaymentMethod)}
              />
              <PaymentInfoCard
                label="Remaining"
                value={formatOrderMoney(order.remainingAmount, order.currency)}
                hint="After deposit review"
              />
              <PaymentInfoCard
                label="Transfer Proof"
                value={depositProof ? proofStatusText(depositProof.status) : 'Not uploaded'}
                hint={depositProof ? formatOrderDate(depositProof.createdAt) : 'Uploaded from checkout page'}
              />
            </div>
          </section>

          {canUploadDeposit ? (
            <section className="rs-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
                    Deposit Payment
                  </p>
                  <h2 className="mt-1 text-lg font-black text-rs-ink">Upload Deposit Proof Again</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload a clearer transfer image so admin can review your deposit again.
                  </p>
                </div>
              </div>

              <RejectionNotice proof={rejectedDepositProof} fallback="Deposit proof was rejected. Please upload a new clear image." />

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

          {canUploadFinal ? (
            <section className="rs-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
                    Final Payment
                  </p>
                  <h2 className="mt-1 text-lg font-black text-rs-ink">Choose final payment method</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This step appears only when admin requests final payment
                  </p>
                </div>
              </div>

              {order.paymentStatus === 'FINAL_PAYMENT_REJECTED' ? (
                <RejectionNotice proof={rejectedFinalPaymentProof} fallback="Final payment was rejected. Please choose the payment method again or upload a corrected transfer image." />
              ) : null}

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

              <select
                value={finalPaymentMethod}
                onChange={(event) =>
                  setFinalPaymentMethod(
                    event.target.value as 'instapay' | 'vodafone' | 'cash_at_shop',
                  )
                }
                className="mt-4 h-12 w-full rounded-2xl border border-rs-peach bg-card px-4 text-sm shadow-sm transition-all focus:outline-none focus:border-rs-gold focus:ring-2 focus:ring-rs-gold/20"
              >
                <option value="instapay">Instapay</option>
                <option value="vodafone">Vodafone Cash</option>
                <option value="cash_at_shop">Cash at store</option>
              </select>

              {finalPaymentMethod === 'cash_at_shop' ? (
                <Button
                  type="button"
                  className="rs-btn-secondary mt-3 w-full"
                  onClick={submitCashFinalPayment}
                >
                  Select cash at store payment
                </Button>
              ) : (
                <div className="mt-3">
                  <PaymentProofUploader
                    label={finalPaymentProof?.status === 'REJECTED' ? 'Upload Final Payment Proof Again' : 'Final payment proof'}
                    onUpload={uploadFinalPayment}
                  />
                </div>
              )}

              {cashSubmitError ? (
                <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
                  {cashSubmitError}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <PaymentSummary order={order} />
          <ShippingSummary order={order} />
          <ProofList proofs={paymentProofs} />
          <CustomerTimeline order={order} />
        </aside>
      </div>
    </div>
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
              Current state {sheinStatusLabel(primaryBatch.status)} · Updated {formatOrderDate(primaryBatch.updatedAt)}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-rs-gold shadow-sm">
            {sheinStatusLabel(primaryBatch.status)}
          </span>
        </div>

        <SheinStatusTimeline status={primaryBatch.status} history={primaryBatch.statusHistory ?? []} />

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {trackedItems.map(({ item, tracking }) => (
            <article key={`${item.id}-${tracking!.id}`} className="rounded-2xl border border-rs-peach-light bg-white/85 p-3 shadow-sm">
              <p className="text-sm font-black text-rs-ink">{item.productNameSnapshot}</p>
              {item.productVariantNameSnapshot ? <p className="mt-1 text-xs text-muted-foreground">{item.productVariantNameSnapshot}</p> : null}
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                Qty {tracking!.quantity} · Shipment {tracking!.batch.batchCode} · {sheinStatusLabel(tracking!.batch.status)}
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
    <div className="rounded-2xl border border-rs-peach-light bg-rs-cream-warm px-3 py-2 text-xs font-bold text-muted-foreground">
      SHEIN shipment <span className="font-black text-rs-ink">{tracking.batch.batchCode}</span> ·{' '}
      <span className="text-rs-gold">{sheinStatusLabel(tracking.batch.status)}</span>
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
    return <p className="mt-4 rounded-2xl bg-white/75 p-3 text-sm font-bold text-muted-foreground">Shipment is being prepared by the admin</p>;
  }
  if (status === 'CANCELLED') {
    return <p className="mt-4 rounded-2xl bg-destructive/10 p-3 text-sm font-bold text-destructive">This SHEIN shipment was cancelled</p>;
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
            <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${completed ? 'bg-rs-gold text-white' : 'bg-rs-cream-warm'}`}>
              {completed ? '✓' : index + 1}
            </div>
            <p className="text-xs font-black leading-5">{sheinStatusLabel(step)}</p>
            {historyEvent ? <p className="mt-1 text-[10px] font-semibold opacity-75">{formatOrderDate(historyEvent.createdAt)}</p> : null}
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

function NextStepMessage({ order }: { order: Order }) {
  const message = nextStepText(order.paymentStatus);
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-rs-peach bg-rs-cream-warm p-4 text-sm font-extrabold leading-7 text-rs-ink">
      {message}
    </div>
  );
}

function nextStepText(status: Order['paymentStatus']): string | null {
  if (status === 'DEPOSIT_PENDING')
    return 'Complete deposit proof upload from checkout page to start order confirmation';
  if (status === 'DEPOSIT_SUBMITTED') return 'Deposit proof received and under admin review';
  if (status === 'DEPOSIT_REJECTED')
    return 'Deposit proof rejected, contact admin or re-upload a clearer proof';
  if (status === 'DEPOSIT_APPROVED')
    return 'Deposit approved. Final payment will be available when products arrive at store';
  if (status === 'FINAL_PAYMENT_PENDING')
    return 'Final payment now available. Choose payment method and upload proof or select cash at store';
  if (status === 'FINAL_PAYMENT_SUBMITTED') return 'Final payment proof received and under review';
  if (status === 'FINAL_PAYMENT_REJECTED')
    return 'Final payment proof rejected, please upload a valid proof';
  if (status === 'PAID') return 'Order fully paid. Track preparation or pickup status';
  return null;
}

function PaymentInfoCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-rs-peach-light bg-card p-3.5 shadow-sm">
      <p className="text-xs font-extrabold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-base font-black text-rs-ink">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{hint}</p>
    </div>
  );
}

function PaymentSummary({ order }: { order: Order }) {
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
        <SummaryRow label="Discount" value={formatOrderMoney(order.discountAmount, order.currency)} />
        <SummaryRow
          label={`Deposit ${order.depositPercent}%`}
          value={formatOrderMoney(order.depositAmount, order.currency)}
        />
        <SummaryRow
          label="Deposit fee"
          value={formatOrderMoney(order.depositPaymentFeeAmount, order.currency)}
        />
        <SummaryRow label="Remaining" value={formatOrderMoney(order.remainingAmount, order.currency)} />
        <SummaryRow
          label="Final payment fee"
          value={formatOrderMoney(order.finalPaymentFeeAmount, order.currency)}
        />
        <div className="h-px bg-rs-peach-light mt-2" />
        <SummaryRow
          label="Total"
          value={formatOrderMoney(order.totalAmount, order.currency)}
          isStrong
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
      <span className={isStrong ? 'min-w-0 break-words' : 'min-w-0 break-words text-muted-foreground'}>{label}</span>
      <span className={isStrong ? 'break-words text-end rs-price-primary' : 'break-words text-end font-semibold'}>{value}</span>
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
    <div className="rs-panel p-4 sm:p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
        Order History
      </h2>
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
    </div>
  );
}

function proofStatusText(status: OrderPaymentProof['status']): string {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  return 'Under review';
}

function paymentMethodLabel(method: Order['depositPaymentMethod']): string {
  if (method === 'VODAFONE') return 'Vodafone Cash';
  if (method === 'INSTAPAY') return 'Instapay';
  return 'Cash at store';
}
