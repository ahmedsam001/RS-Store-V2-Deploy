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
import { localizeProductText, useI18n, type Language } from '@/shared/i18n';
import { getCheckoutCartBlockCode } from '@/features/orders/utils/checkout-cart';
import type { CheckoutInput } from '@/shared/types/OrderTypes';

const checkoutCopy = {
  ar: {
    metaTitle: 'إتمام الشراء | RS Store',
    metaDescription: 'أدخل بيانات الشحن وأكد طلبك بأمان',
    signInCheckout: 'يرجى تسجيل الدخول أو إنشاء حساب لإتمام الشراء',
    uploadProofRequired: 'يرجى رفع إثبات الدفع قبل تأكيد الطلب',
    createdSuccess: 'تم إنشاء الطلب ورفع إثبات العربون بنجاح، بانتظار مراجعة الأدمن',
    failedCheckout: 'فشل إتمام الشراء',
    preparingPayment: 'جاري تجهيز الدفع',
    loadingCart: 'جاري تحميل السلة',
    failedLoadCart: 'فشل تحميل السلة',
    tryAgain: 'حاول مرة أخرى',
    signInRequired: 'تسجيل الدخول مطلوب',
    signInMessage: 'يرجى تسجيل الدخول لإتمام الشراء',
    signIn: 'تسجيل الدخول',
    kicker: 'الخطوة الأخيرة',
    title: 'إتمام الشراء',
    subtitle: 'أدخل بيانات التواصل والعنوان لإنشاء طلبك',
    deliveryTime: 'مدة التوصيل المتوقعة',
    days: 'يوم',
    customerDetails: 'بيانات العميل',
    customerHint: 'اكتب الاسم ورقم الموبايل والعنوان بوضوح لتأكيد الطلب بسرعة',
    fullName: 'الاسم بالكامل',
    phoneNumber: 'رقم الموبايل',
    deliveryAddress: 'عنوان التوصيل',
    deposit: 'العربون',
    depositHint: 'اختار نسبة العربون قبل الإرسال',
    depositAria: 'نسبة العربون',
    depositAmount: 'قيمة العربون',
    paymentMethod: 'طريقة الدفع',
    paymentHint: 'اختار طريقة الدفع وارفع صورة الإثبات',
    paymentMethodAria: 'طريقة دفع العربون',
    transferNumber: 'رقم التحويل',
    vodafoneFee: 'فودافون كاش يضيف {percent}% رسوم على قيمة العربون',
    notes: 'ملاحظات (اختياري)',
    orderSummary: 'ملخص الطلب',
    summaryHint: 'مراجعة سريعة قبل التأكيد',
    customOrder: 'طلب خاص',
    customOrderFallback: 'طلب خاص',
    qty: 'الكمية',
    total: 'الإجمالي',
    depositLine: 'عربون {percent}%',
    vodafoneFeeLine: 'رسوم فودافون كاش {percent}%',
    payNow: 'ادفع الآن',
    remainingAfterDeposit: 'المتبقي بعد العربون',
    paymentProof: 'إثبات الدفع',
    paymentProofHint: 'ارفع صورة واضحة لتحويل العربون لمراجعة الأدمن',
    creating: 'جاري إنشاء الطلب ورفع الإثبات...',
    confirm: 'تأكيد الطلب ورفع العربون',
    emptyTitle: 'السلة فارغة',
    emptyMessage: 'أضف منتجات إلى السلة قبل متابعة إتمام الشراء',
    browseProducts: 'تصفح المنتجات',
    previewBlocked: 'إتمام الشراء متاح فقط لمنتجات المتجر الحقيقية. احذف منتجات المعاينة من السلة وأضف منتجات من الكتالوج الفعلي.',
    staticBlocked: 'إتمام الشراء متوقف لأن السلة تحتوي على منتجات بدون معرفات قاعدة بيانات حقيقية. احذف منتجات المعاينة وأضف منتجات من الكتالوج الفعلي.',
    unsupportedProof: 'صيغة الملف غير مدعومة. ارفع JPG أو PNG أو WEBP أو GIF',
    proofTooLarge: 'الصورة أكبر من 5MB، اختار صورة أصغر',
    chooseProof: 'اضغط لاختيار صورة إثبات الدفع',
    proofFormats: 'JPG PNG WEBP GIF حتى 5MB',
  },
  en: {
    metaTitle: 'Checkout | RS Store',
    metaDescription: 'Enter shipping details and confirm your order securely',
    signInCheckout: 'Please sign in or create an account to complete your purchase',
    uploadProofRequired: 'Please upload payment proof before confirming order',
    createdSuccess: 'Order created and deposit proof uploaded successfully, awaiting admin review',
    failedCheckout: 'Failed to complete checkout',
    preparingPayment: 'Preparing payment',
    loadingCart: 'Loading cart',
    failedLoadCart: 'Failed to load cart',
    tryAgain: 'Try Again',
    signInRequired: 'Sign in required',
    signInMessage: 'Please sign in to complete your purchase',
    signIn: 'Sign In',
    kicker: 'Final Step',
    title: 'Checkout',
    subtitle: 'Enter contact and address details to create your order',
    deliveryTime: 'Estimated delivery time',
    days: 'days',
    customerDetails: 'Customer Details',
    customerHint: 'Enter your name, phone, and address clearly for faster order confirmation',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    deliveryAddress: 'Delivery Address',
    deposit: 'Deposit',
    depositHint: 'Select deposit percentage before submitting',
    depositAria: 'Deposit percentage',
    depositAmount: 'Deposit amount',
    paymentMethod: 'Payment Method',
    paymentHint: 'Choose payment method and upload proof image',
    paymentMethodAria: 'Deposit payment method',
    transferNumber: 'Transfer Number',
    vodafoneFee: 'Vodafone Cash adds {percent}% fee on deposit amount',
    notes: 'Notes (optional)',
    orderSummary: 'Order Summary',
    summaryHint: 'Snapshot before confirmation',
    customOrder: 'Custom Order',
    customOrderFallback: 'Custom order',
    qty: 'Qty',
    total: 'Total',
    depositLine: 'Deposit {percent}%',
    vodafoneFeeLine: 'Vodafone Cash fee {percent}%',
    payNow: 'Pay now',
    remainingAfterDeposit: 'Remaining after deposit',
    paymentProof: 'Payment Proof',
    paymentProofHint: 'Upload a clear image of your deposit transfer for admin review',
    creating: 'Creating order and uploading proof...',
    confirm: 'Confirm Order & Upload Deposit',
    emptyTitle: 'Your cart is empty',
    emptyMessage: 'Add products to your cart before proceeding to checkout',
    browseProducts: 'Browse Products',
    previewBlocked: 'Checkout is only available for real store products. Remove preview products from your cart and add products from the live catalog.',
    staticBlocked: 'Checkout is blocked because the cart contains products without real database IDs. Remove static preview products and add live catalog products.',
    unsupportedProof: 'Unsupported file format. Please upload JPG, PNG, WEBP, or GIF',
    proofTooLarge: 'Image exceeds 5MB, please choose a smaller image',
    chooseProof: 'Click to select payment proof image',
    proofFormats: 'JPG PNG WEBP GIF up to 5MB',
  },
} as const;

type CheckoutCopy = (typeof checkoutCopy)[keyof typeof checkoutCopy];

export function CheckoutPage() {
  const { language } = useI18n();
  const copy = checkoutCopy[language];

  useDocumentMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
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
        message: copy.signInCheckout,
      },
    });
  }, [
    cart?.items.length,
    copy.signInCheckout,
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
    const cartBlockCode = getCheckoutCartBlockCode(cart);
    if (cartBlockCode) {
      setSubmitError(cartBlockCode === 'preview-cart' ? copy.previewBlocked : copy.staticBlocked);
      return;
    }
    if (!depositProofFile) {
      setDepositProofError(copy.uploadProofRequired);
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

      const orderWithDepositProof = await ordersApi.checkoutWithDepositProof(
        form,
        depositProofFile,
        {
          csrfToken,
          idempotencyKey: form.idempotencyKey,
        },
      );
      await refresh();
      navigate(orderPath(orderWithDepositProof.id), {
        replace: true,
        state: {
          message: copy.createdSuccess,
        },
      });
    } catch (caughtError) {
      setSubmitError(formatCheckoutError(caughtError, language, copy.failedCheckout));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || status === 'loading')
    return (
      <div className="rs-page-stack">
        <CatalogState title={copy.preparingPayment} message={copy.loadingCart} />
      </div>
    );
  if (error)
    return (
      <div className="rs-page-stack">
        <CatalogState
          title={copy.failedLoadCart}
          message={error}
          ctaLabel={copy.tryAgain}
          ctaHref={PATHS.cart}
        />
      </div>
    );
  if (!cart || cart.items.length === 0) return <EmptyCheckoutCart copy={copy} />;
  if (status !== 'authenticated')
    return (
      <div className="rs-page-stack">
        <CatalogState
          title={copy.signInRequired}
          message={copy.signInMessage}
          ctaLabel={copy.signIn}
          ctaHref={PATHS.login}
        />
      </div>
    );

  return (
    <div className="rs-page-stack">
      <div className="rs-section-heading text-start">
        <span className="rs-section-kicker">{copy.kicker}</span>
        <h1 className="rs-heading-1 mt-2">{copy.title}</h1>
        <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          {copy.subtitle}
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

      <form onSubmit={handleSubmit} className="rs-panel overflow-hidden" noValidate>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-5 p-4 sm:p-6">
            <div className="rounded-2xl border border-rs-peach bg-rs-cream-warm p-4 text-sm leading-7 text-muted-foreground">
              {copy.deliveryTime}{' '}
              <span className="font-extrabold text-rs-ink">
                {shippingDays} {copy.days}
              </span>
            </div>

            <section className="rounded-2xl border border-rs-peach-light bg-card p-3 shadow-sm sm:rounded-3xl sm:p-4">
              <h2 className="text-base font-black text-rs-ink">{copy.customerDetails}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.customerHint}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label={copy.fullName}
                  value={form.customerName}
                  autoComplete="name"
                  required
                  onChange={(value) => setForm((c) => ({ ...c, customerName: value }))}
                />
                <Field
                  label={copy.phoneNumber}
                  value={form.customerPhone}
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  onChange={(value) => setForm((c) => ({ ...c, customerPhone: value }))}
                />
              </div>
              <label className="mt-4 block">
                <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                  {copy.deliveryAddress}
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
                <h2 className="text-base font-black text-rs-ink">{copy.deposit}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.depositHint}</p>
                <div
                  className="mt-4 grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label={copy.depositAria}
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
                  {copy.depositAmount}:{' '}
                  <span className="font-black text-rs-ink">
                    {formatCheckoutMoney(checkoutTotals.depositAmount, checkoutTotals.currency, language)}
                  </span>
                </div>
              </section>

              <section className="rounded-2xl border border-rs-peach-light bg-card p-3 shadow-sm sm:rounded-3xl sm:p-4">
                <h2 className="text-base font-black text-rs-ink">{copy.paymentMethod}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.paymentHint}</p>
                <div
                  className="mt-4 grid gap-2"
                  role="radiogroup"
                  aria-label={copy.paymentMethodAria}
                >
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
                  <p className="font-extrabold text-rs-ink">{copy.transferNumber}</p>
                  <p className="mt-1 font-black text-rs-gold" dir="ltr">
                    {paymentReceiver}
                  </p>
                  {form.paymentMethod === 'vodafone' ? (
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                      {copy.vodafoneFee.replace('{percent}', vodafoneFeePercent)}
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <label className="block">
              <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                {copy.notes}
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
          </div>

          <aside className="rs-panel p-4 sm:p-5 lg:sticky lg:top-28">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rs-green-bg text-rs-green">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-black text-rs-ink">{copy.orderSummary}</h2>
                <p className="text-[11px] text-muted-foreground">{copy.summaryHint}</p>
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
                      {item.type === 'PRODUCT' && item.product ? (
                        <CatalogLink
                          href={productPath(item.product.slug)}
                          className="line-clamp-2 font-extrabold transition hover:text-rs-gold"
                        >
                          {localizeProductText(item.product.name, language)}
                        </CatalogLink>
                      ) : (
                        <div>
                          <p className="line-clamp-2 font-extrabold">
                            {localizeProductText(item.customOrder?.title ?? copy.customOrderFallback, language)}
                          </p>
                          <span className="mt-1 inline-flex rounded-full bg-rs-gold-bg px-2 py-0.5 text-[11px] font-black text-rs-gold">
                            {copy.customOrder}
                          </span>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {copy.qty}: {item.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 break-words text-end font-black rs-price-primary">
                      {formatPrice(item.lineTotal, language)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-5 border-t pt-5"
              style={{ borderColor: 'hsl(var(--rs-peach-light))' }}
            >
              <div className="flex items-center justify-between text-lg font-black">
                <span>{copy.total}</span>
                <span className="rs-price-primary">{formatPrice(cart.summary.subtotal, language)}</span>
              </div>
              <div className="mt-3 space-y-2 rounded-2xl border border-rs-peach bg-rs-cream-warm p-3 text-xs leading-5">
                <SummaryLine
                  label={copy.depositLine.replace('{percent}', String(form.depositPercent))}
                  value={formatCheckoutMoney(
                    checkoutTotals.depositBaseAmount,
                    checkoutTotals.currency,
                    language,
                  )}
                />
                {form.paymentMethod === 'vodafone' ? (
                  <SummaryLine
                    label={copy.vodafoneFeeLine.replace('{percent}', vodafoneFeePercent)}
                    value={formatCheckoutMoney(
                      checkoutTotals.vodafoneFeeAmount,
                      checkoutTotals.currency,
                      language,
                    )}
                  />
                ) : null}
                <SummaryLine
                  label={copy.payNow}
                  value={formatCheckoutMoney(checkoutTotals.depositAmount, checkoutTotals.currency, language)}
                  isStrong
                />
                <SummaryLine
                  label={copy.remainingAfterDeposit}
                  value={formatCheckoutMoney(
                    checkoutTotals.remainingAmount,
                    checkoutTotals.currency,
                    language,
                  )}
                  isStrong
                />
              </div>
            </div>

            <section className="mt-6 rounded-2xl border border-rs-peach-light bg-card p-3 shadow-sm sm:rounded-3xl sm:p-4">
              <h2 className="text-base font-black text-rs-ink">{copy.paymentProof}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {copy.paymentProofHint}
              </p>
              <CheckoutPaymentProofField
                file={depositProofFile}
                error={depositProofError}
                copy={copy}
                onChange={(file) => {
                  setDepositProofFile(file);
                  setDepositProofError(null);
                }}
                onError={setDepositProofError}
              />
            </section>

            {submitError ? (
              <p
                className="mt-4 rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}

            <Button
              type="submit"
              className="rs-btn-primary mt-4 w-full"
              size="lg"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? copy.creating : copy.confirm}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </aside>
        </div>
      </form>
    </div>
  );
}

function EmptyCheckoutCart({ copy }: { copy: CheckoutCopy }) {
  return (
    <div className="rs-page-stack">
      <div className="rs-panel-soft flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-black text-rs-ink">{copy.emptyTitle}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {copy.emptyMessage}
        </p>
        <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6">
          {copy.browseProducts}
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
  copy,
  onChange,
  onError,
}: {
  file: File | null;
  error: string | null;
  copy: CheckoutCopy;
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
      onError(copy.unsupportedProof);
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_CHECKOUT_PAYMENT_PROOF_BYTES) {
      onChange(null);
      onError(copy.proofTooLarge);
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
          {file ? file.name : copy.chooseProof}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">{copy.proofFormats}</span>
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
      <span
        className={
          isStrong
            ? 'break-words text-end rs-price-primary'
            : 'break-words text-end font-semibold text-rs-ink'
        }
      >
        {value}
      </span>
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
          (depositBaseAmount * (Number.isFinite(vodafoneFeePercent) ? vodafoneFeePercent : 1)) /
            100,
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

function formatCheckoutMoney(amount: number, currency: string, language: Language): string {
  return formatPrice({ amount: amount.toFixed(2), currency }, language);
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

function formatCheckoutError(
  error: unknown,
  language: Language,
  fallbackMessage: string,
): string {
  const rawMessage = error instanceof Error ? error.message : String(error || '');

  if (language !== 'ar') {
    return rawMessage || fallbackMessage;
  }

  if (rawMessage.includes('shippingAddress must be longer than or equal to 8 characters')) {
    return 'يجب أن يكون عنوان الشحن 8 أحرف على الأقل.';
  }

  if (rawMessage.includes('shippingAddress should not be empty')) {
    return 'عنوان الشحن مطلوب.';
  }

  if (rawMessage.includes('recipientName should not be empty')) {
    return 'اسم المستلم مطلوب.';
  }

  if (rawMessage.includes('recipientPhone should not be empty')) {
    return 'رقم الهاتف مطلوب.';
  }

  if (rawMessage.includes('paymentProofImageUrl should not be empty')) {
    return 'يرجى رفع صورة إثبات الدفع.';
  }

  if (rawMessage.includes('Database request failed')) {
    return 'فشل طلب قاعدة البيانات. حاول مرة أخرى.';
  }

  if (rawMessage.includes('Validation failed')) {
    return 'تأكد من البيانات المطلوبة ثم حاول مرة أخرى.';
  }

  if (rawMessage.includes('Unauthorized')) {
    return 'يرجى تسجيل الدخول أولًا.';
  }

  if (rawMessage.includes('Forbidden')) {
    return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.';
  }

  if (rawMessage.includes('Network Error')) {
    return 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.';
  }

  if (rawMessage.includes('Failed to fetch')) {
    return 'تعذر الاتصال بالخادم. حاول مرة أخرى.';
  }

  return 'حدث خطأ أثناء تأكيد الطلب. حاول مرة أخرى.';
}
