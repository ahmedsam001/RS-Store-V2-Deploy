import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ShoppingCart, ShieldCheck, UploadCloud } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { orderPath, PATHS, productPath } from '@/shared/constants/routes';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useAuth } from '@/features/auth';
import { buildCustomerAuthPath, currentPathWithSearch } from '@/shared/lib/return-to';
import { useCart } from '@/features/cart';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { formatPrice } from '@/features/catalog/utils/format';
import { settingsApi, readSetting, StorefrontSettings } from '@/features/settings/settings-api';
import { ordersApi } from '@/features/orders/api/orders-api';
import type { Cart } from '@/shared/types/CartTypes';
import type { CheckoutInput } from '@/shared/types/OrderTypes';

export function CheckoutPage() {
  useDocumentMetadata({
    title: 'Checkout | RS Store',
    description: 'Enter shipping details and confirm your order securely',
    canonicalPath: '/checkout',
    robots: 'noindex,follow',
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { status, user, csrfToken } = useAuth();
  const { cart, isLoading, error, refresh } = useCart();
  const [form, setForm] = useState<CheckoutInput>(() => ({
    customerName: user?.name ?? '',
    customerPhone: user?.phone ?? '',
    shippingAddress: user?.address ?? '',
    notes: '',
    depositPercent: 50,
    paymentMethod: 'instapay',
    idempotencyKey: createCheckoutIdempotencyKey(),
  }));
  const [depositProofFile, setDepositProofFile] = useState<File | null>(null);
  const [depositProofError, setDepositProofError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const authNotice =
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
    if (!user) return;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || user.name || '',
      customerPhone: current.customerPhone || user.phone || '',
      shippingAddress: current.shippingAddress || user.address || '',
    }));
  }, [user]);

  useEffect(() => {
    if (status !== 'anonymous' || isLoading || !cart?.items.length) return;
    const returnTo = currentPathWithSearch(
      location.pathname,
      location.search,
      location.hash,
      '/checkout',
    );
    navigate(buildCustomerAuthPath(PATHS.login, returnTo), {
      replace: true,
      state: {
        returnTo,
        reason: 'checkout',
        message: 'Please sign in or create an account to complete your purchase',
      },
    });
  }, [
    cart?.items.length,
    isLoading,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    status,
  ]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        cart?.items.length &&
        form.customerName.trim() &&
        form.customerPhone.trim() &&
        form.shippingAddress.trim(),
      ),
    [cart, form],
  );
  const depositChoices = getDepositChoices(settings);
  const defaultDeposit = getDefaultDeposit(settings, depositChoices);
  const vodafoneFeePercent = readSetting(settings, 'payment.vodafoneFeePercent', '1');
  const vodafoneCashNumber = readSetting(settings, 'payment.vodafoneCash', '01018313022');
  const instapayAccount = readSetting(settings, 'payment.instapay', '01018313022');
  const shippingDays = readSetting(settings, 'shipping.estimatedDays', '14');
  const paymentReceiver = form.paymentMethod === 'vodafone' ? vodafoneCashNumber : instapayAccount;
  const checkoutTotals = calculateCheckoutTotals({
    subtotal: Number(cart?.summary.subtotal.amount ?? 0),
    currency: cart?.summary.subtotal.currency ?? 'EGP',
    depositPercent: form.depositPercent,
    paymentMethod: form.paymentMethod,
    vodafoneFeePercent: Number(vodafoneFeePercent),
  });

  useEffect(() => {
    setForm((current) => {
      if (depositChoices.includes(current.depositPercent)) {
        return current;
      }
      const next = depositChoices.includes(defaultDeposit) ? defaultDeposit : depositChoices[0];
      return { ...current, depositPercent: next };
    });
  }, [defaultDeposit, depositChoices]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const staticCartReason = staticCartBlockReason(cart);
    if (staticCartReason) {
      setSubmitError(staticCartReason);
      return;
    }
    if (!depositProofFile) {
      setDepositProofError('Please upload payment proof before confirming order');
      return;
    }
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (status !== 'authenticated') {
        const returnTo = currentPathWithSearch(
          location.pathname,
          location.search,
          location.hash,
          '/checkout',
        );
        navigate(buildCustomerAuthPath(PATHS.login, returnTo), {
          replace: true,
          state: { returnTo, reason: 'checkout' },
        });
        return;
      }

      const orderWithDepositProof = await ordersApi.checkoutWithDepositProof(form, depositProofFile, {
        csrfToken,
        idempotencyKey: form.idempotencyKey,
      });
      await refresh();
      navigate(orderPath(orderWithDepositProof.id), {
        replace: true,
        state: { message: 'Order created and deposit proof uploaded successfully, awaiting admin review' },
      });
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Failed to complete checkout');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || status === 'loading')
    return (
      <div className="rs-page-stack">
        <CatalogState title="Preparing payment" message="Loading cart" />
      </div>
    );
  if (error) return (
    <div className="rs-page-stack">
      <CatalogState title="Failed to load cart" message={error} ctaLabel="Try Again" ctaHref={PATHS.cart} />
    </div>
  );
  if (!cart || cart.items.length === 0) return <EmptyCheckoutCart />;
  if (status !== 'authenticated')
    return (
      <div className="rs-page-stack">
        <CatalogState
          title="Sign in required"
          message="Please sign in to complete your purchase"
          ctaLabel="Sign In"
          ctaHref={PATHS.login}
        />
      </div>
    );

  return (
    <div className="rs-page-stack">
      <div className="rs-section-heading text-start">
        <span className="rs-section-kicker">Final Step</span>
        <h1 className="rs-heading-1 mt-2">Checkout</h1>
        <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          Enter contact and address details to create your order
        </p>
      </div>

      {authNotice ? (
        <div
          className="rounded-2xl border border-rs-green/30 bg-rs-green-bg p-3 text-sm font-extrabold text-rs-green"
          role="status"
        >
          {authNotice}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <form onSubmit={handleSubmit} className="rs-panel overflow-hidden" noValidate>
          <div className="space-y-5 p-4 sm:p-6">
            <div className="rounded-2xl border border-rs-peach bg-rs-cream-warm p-4 text-sm leading-7 text-muted-foreground">
              Estimated delivery time{' '}
              <span className="font-extrabold text-rs-ink">{shippingDays} days</span>
            </div>

            <section className="rounded-2xl border border-rs-peach-light bg-card p-3 shadow-sm sm:rounded-3xl sm:p-4">
              <h2 className="text-base font-black text-rs-ink">Customer Details</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Enter your name, phone, and address clearly for faster order confirmation
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full Name"
                  value={form.customerName}
                  autoComplete="name"
                  required
                  onChange={(value) => setForm((c) => ({ ...c, customerName: value }))}
                />
                <Field
                  label="Phone Number"
                  value={form.customerPhone}
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  onChange={(value) => setForm((c) => ({ ...c, customerPhone: value }))}
                />
              </div>
              <label className="mt-4 block">
                <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                  Delivery Address
                </span>
                <textarea
                  value={form.shippingAddress}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, shippingAddress: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-rs-peach bg-card px-4 py-3 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-rs-gold-light focus:outline-none focus:border-rs-gold focus:ring-2 focus:ring-rs-gold/20"
                  required
                  autoComplete="street-address"
                />
              </label>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-rs-peach-light bg-card p-3 shadow-sm sm:rounded-3xl sm:p-4">
                <h2 className="text-base font-black text-rs-ink">Deposit</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Select deposit percentage before submitting
                </p>
                <div
                  className="mt-4 grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="Deposit percentage"
                >
                  {depositChoices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      role="radio"
                      aria-checked={form.depositPercent === choice}
                      onClick={() => setForm((current) => ({ ...current, depositPercent: choice }))}
                      className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                        form.depositPercent === choice
                          ? 'border-rs-gold bg-rs-gold-bg text-rs-ink shadow-sm'
                          : 'border-rs-peach bg-background text-muted-foreground hover:border-rs-gold-light'
                      }`}
                    >
                      {choice}%
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-rs-cream-warm p-3 text-xs leading-6 text-muted-foreground">
                  Deposit amount:{' '}
                  <span className="font-black text-rs-ink">
                    {formatCheckoutMoney(checkoutTotals.depositAmount, checkoutTotals.currency)}
                  </span>
                </div>
              </section>

              <section className="rounded-2xl border border-rs-peach-light bg-card p-3 shadow-sm sm:rounded-3xl sm:p-4">
                <h2 className="text-base font-black text-rs-ink">Payment Method</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Choose payment method and upload proof image
                </p>
                <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Deposit payment method">
                  <PaymentMethodButton
                    label="Instapay"
                    value="instapay"
                    currentValue={form.paymentMethod}
                    onSelect={(value) =>
                      setForm((current) => ({ ...current, paymentMethod: value }))
                    }
                  />
                  <PaymentMethodButton
                    label="Vodafone Cash"
                    value="vodafone"
                    currentValue={form.paymentMethod}
                    onSelect={(value) =>
                      setForm((current) => ({ ...current, paymentMethod: value }))
                    }
                  />
                </div>
                <div className="mt-4 rounded-2xl border border-rs-peach bg-rs-cream-warm p-3 text-sm leading-7">
                  <p className="font-extrabold text-rs-ink">Transfer Number</p>
                  <p className="mt-1 font-black text-rs-gold" dir="ltr">
                    {paymentReceiver}
                  </p>
                  {form.paymentMethod === 'vodafone' ? (
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                      Vodafone Cash adds {vodafoneFeePercent}% fee on deposit amount
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-rs-peach-light bg-card p-3 shadow-sm sm:rounded-3xl sm:p-4">
              <h2 className="text-base font-black text-rs-ink">Payment Proof</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Upload a clear image of your deposit transfer for admin review
              </p>
              <CheckoutPaymentProofField
                file={depositProofFile}
                error={depositProofError}
                onChange={(file) => {
                  setDepositProofFile(file);
                  setDepositProofError(null);
                }}
                onError={setDepositProofError}
              />
            </section>

            <label className="block">
              <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                Notes (optional)
              </span>
              <textarea
                value={form.notes ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                className="mt-0.5 w-full rounded-2xl border border-rs-peach bg-card px-4 py-3 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-rs-gold-light focus:outline-none focus:border-rs-gold focus:ring-2 focus:ring-rs-gold/20"
              />
            </label>

            {submitError ? (
              <p
                className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}

            <Button
              type="submit"
              className="rs-btn-primary w-full"
              size="lg"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Creating order...' : 'Confirm Order & Upload Deposit'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </form>

        <aside className="rs-panel p-4 sm:p-5 lg:sticky lg:top-28">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rs-green-bg text-rs-green">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-black text-rs-ink">Order Summary</h2>
              <p className="text-[11px] text-muted-foreground">Snapshot before confirmation</p>
            </div>
          </div>

          <div className="mt-5 max-h-[420px] space-y-2.5 overflow-auto pe-1 premium-scrollbar">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-rs-peach-light bg-card p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CatalogLink
                      href={productPath(item.product.slug)}
                      className="line-clamp-2 font-extrabold transition hover:text-rs-gold"
                    >
                      {item.product.name}
                    </CatalogLink>
                    <p className="mt-1 text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="shrink-0 break-words text-end font-black rs-price-primary">
                    {formatPrice(item.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t pt-5" style={{ borderColor: 'hsl(var(--rs-peach-light))' }}>
            <div className="flex items-center justify-between text-lg font-black">
              <span>Total</span>
              <span className="rs-price-primary">{formatPrice(cart.summary.subtotal)}</span>
            </div>
            <div className="mt-3 space-y-2 rounded-2xl border border-rs-peach bg-rs-cream-warm p-3 text-xs leading-5">
              <SummaryLine
                label={`Deposit ${form.depositPercent}%`}
                value={formatCheckoutMoney(
                  checkoutTotals.depositBaseAmount,
                  checkoutTotals.currency,
                )}
              />
              {form.paymentMethod === 'vodafone' ? (
                <SummaryLine
                  label={`Vodafone Cash fee ${vodafoneFeePercent}%`}
                  value={formatCheckoutMoney(
                    checkoutTotals.vodafoneFeeAmount,
                    checkoutTotals.currency,
                  )}
                />
              ) : null}
              <SummaryLine
                label="Pay now"
                value={formatCheckoutMoney(checkoutTotals.depositAmount, checkoutTotals.currency)}
                isStrong
              />
              <SummaryLine
                label="Remaining after deposit"
                value={formatCheckoutMoney(checkoutTotals.remainingAmount, checkoutTotals.currency)}
                isStrong
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function staticCartBlockReason(cart: Cart | null): string | null {
  if (!cart?.items.length) return null;
  if (cart.id === 'preview-cart') {
    return 'Checkout is only available for real store products. Remove preview products from your cart and add products from the live catalog.';
  }

  const hasStaticProduct = cart.items.some(
    (item) => !isDatabaseId(item.product.id) || (item.variant?.id ? !isDatabaseId(item.variant.id) : false),
  );
  return hasStaticProduct
    ? 'Checkout is blocked because the cart contains products without real database IDs. Remove static preview products and add live catalog products.'
    : null;
}

function isDatabaseId(value: string | null | undefined): boolean {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

function EmptyCheckoutCart() {
  return (
    <div className="rs-page-stack">
      <div className="rs-panel-soft flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-black text-rs-ink">Your cart is empty</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Add products to your cart before proceeding to checkout
        </p>
        <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6">
          Browse Products
        </CatalogLink>
      </div>
    </div>
  );
}

const MAX_CHECKOUT_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;
const ACCEPTED_CHECKOUT_PAYMENT_PROOF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

type CheckoutPaymentMethod = CheckoutInput['paymentMethod'];

type PaymentMethodButtonProps = {
  label: string;
  value: CheckoutPaymentMethod;
  currentValue: CheckoutPaymentMethod;
  onSelect: (value: CheckoutPaymentMethod) => void;
};

function PaymentMethodButton({ label, value, currentValue, onSelect }: PaymentMethodButtonProps) {
  const isSelected = currentValue === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={() => onSelect(value)}
      className={`rounded-2xl border px-4 py-3 text-start text-sm font-black transition ${
        isSelected
          ? 'border-rs-gold bg-rs-gold-bg text-rs-ink shadow-sm'
          : 'border-rs-peach bg-background text-muted-foreground hover:border-rs-gold-light'
      }`}
    >
      {label}
    </button>
  );
}

function CheckoutPaymentProofField({
  file,
  error,
  onChange,
  onError,
}: {
  file: File | null;
  error: string | null;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      onChange(null);
      return;
    }

    if (!ACCEPTED_CHECKOUT_PAYMENT_PROOF_TYPES.includes(selectedFile.type)) {
      onChange(null);
      onError('Unsupported file format. Please upload JPG, PNG, WEBP, or GIF');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_CHECKOUT_PAYMENT_PROOF_BYTES) {
      onChange(null);
      onError('Image exceeds 5MB, please choose a smaller image');
      event.target.value = '';
      return;
    }

    onChange(selectedFile);
  }

  return (
    <div className="mt-4">
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-rs-peach bg-rs-cream-warm px-4 py-5 text-center transition hover:border-rs-gold-light">
        <UploadCloud className="h-6 w-6 text-rs-gold" aria-hidden="true" />
        <span className="mt-2 max-w-full break-all text-sm font-extrabold text-rs-ink">
          {file ? file.name : 'Click to select payment proof image'}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">JPG PNG WEBP GIF up to 5MB</span>
        <input
          type="file"
          accept={ACCEPTED_CHECKOUT_PAYMENT_PROOF_TYPES.join(',')}
          onChange={handleFileChange}
          className="sr-only"
          required
        />
      </label>
      {error ? (
        <p
          className="mt-2 rounded-xl bg-destructive/10 p-2 text-sm font-semibold text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SummaryLine({
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
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${isStrong ? 'font-black text-rs-ink' : 'text-muted-foreground'}`}
    >
      <span className="min-w-0 break-words">{label}</span>
      <span className={isStrong ? 'break-words text-end rs-price-primary' : 'break-words text-end font-semibold text-rs-ink'}>{value}</span>
    </div>
  );
}

type CheckoutTotalsInput = {
  subtotal: number;
  currency: string;
  depositPercent: number;
  paymentMethod: CheckoutPaymentMethod;
  vodafoneFeePercent: number;
};

function calculateCheckoutTotals({
  subtotal,
  currency,
  depositPercent,
  paymentMethod,
  vodafoneFeePercent,
}: CheckoutTotalsInput) {
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  const depositBaseAmount = roundMoney((safeSubtotal * depositPercent) / 100);
  const vodafoneFeeAmount =
    paymentMethod === 'vodafone'
      ? roundMoney(
          (depositBaseAmount * (Number.isFinite(vodafoneFeePercent) ? vodafoneFeePercent : 1)) / 100,
        )
      : 0;
  const depositAmount = roundMoney(depositBaseAmount + vodafoneFeeAmount);
  const totalAmount = roundMoney(safeSubtotal + vodafoneFeeAmount);
  const remainingAmount = Math.max(0, roundMoney(totalAmount - depositAmount));

  return {
    currency,
    depositBaseAmount,
    vodafoneFeeAmount,
    depositAmount,
    remainingAmount,
    totalAmount,
  };
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function formatCheckoutMoney(amount: number, currency: string): string {
  return formatPrice({ amount: amount.toFixed(2), currency });
}

type FieldProps = {
  label: string;
  value: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

function Field({
  label,
  value,
  type = 'text',
  inputMode,
  autoComplete,
  required,
  onChange,
}: FieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-extrabold text-rs-ink mb-1.5">{label}</span>
      <Input
        value={value}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="border-rs-peach bg-card hover:border-rs-gold-light focus:border-rs-gold focus:ring-rs-gold/20"
      />
    </label>
  );
}

function getDepositChoices(settings: StorefrontSettings | null): readonly (50 | 60 | 70)[] {
  const min = Number(readSetting(settings, 'payment.depositMinPercent', '50'));
  return ([50, 60, 70] as const).filter((value) => value >= min);
}

function getDefaultDeposit(
  settings: StorefrontSettings | null,
  choices: readonly (50 | 60 | 70)[],
): 50 | 60 | 70 {
  const defaultVal = Number(readSetting(settings, 'payment.depositDefaultPercent', '50'));
  return choices.includes(defaultVal as 50 | 60 | 70) ? (defaultVal as 50 | 60 | 70) : choices[0];
}

function createCheckoutIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
