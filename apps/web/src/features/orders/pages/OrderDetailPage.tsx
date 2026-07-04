import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { PATHS } from '@/shared/constants/routes';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { localizeProductOption, localizeProductText, useI18n, type Language } from '@/shared/i18n';
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


const orderDetailCopy = {
  ar: {
    metaTitle: 'تفاصيل الطلب | RS Store',
    metaDescription: 'حالة الطلب وتفاصيل إثبات الدفع',
    failedLoadOrder: 'فشل تحميل الطلب',
    cashFailed: 'فشل اختيار الدفع نقدًا',
    loadingOrder: 'جاري تحميل الطلب',
    preparingDetails: 'جاري تجهيز تفاصيل تتبع الطلب',
    signInRequired: 'تسجيل الدخول مطلوب',
    signInMessage: 'يرجى تسجيل الدخول لتتبع طلبك',
    signIn: 'تسجيل الدخول',
    failedLoadTitle: 'فشل تحميل الطلب',
    tryAgain: 'حاول مرة أخرى',
    orderNotFound: 'الطلب غير موجود',
    verifyOrder: 'راجع رابط الطلب أو سجل الطلبات',
    viewOrders: 'عرض الطلبات',
    orderDetails: 'تفاصيل الطلب',
    order: 'طلب',
    created: 'تم الإنشاء',
    allOrders: 'كل الطلبات',
    continueShopping: 'متابعة التسوق',
    viewTransferImage: 'عرض صورة التحويل',
    products: 'المنتجات',
    orderProducts: 'منتجات الطلب',
    items: 'منتجات',
    qty: 'الكمية',
    depositPayment: 'دفع العربون',
    uploadDepositAgain: 'رفع إثبات العربون مرة أخرى',
    uploadDepositHint: 'ارفع صورة تحويل أوضح حتى يراجع الأدمن العربون مرة أخرى.',
    depositRejectedFallback: 'تم رفض إثبات العربون. يرجى رفع صورة جديدة واضحة.',
    depositProof: 'إثبات العربون',
    rejectedByAdmin: 'تم الرفض من الأدمن',
    reason: 'السبب',
    rejectedUploaded: 'تم رفع الإثبات المرفوض في',
    sheinTracking: 'تتبع شحنة SHEIN',
    insideShipment: 'طلبك داخل الشحنة {batch}',
    currentState: 'الحالة الحالية {status} · آخر تحديث {date}',
    shipment: 'الشحنة',
    sheinShipment: 'شحنة SHEIN',
    shipmentPreparing: 'الشحنة يتم تجهيزها بواسطة الأدمن',
    shipmentCancelled: 'تم إلغاء شحنة SHEIN هذه',
    sheinStatuses: {
      DRAFT: 'جاري تجهيز الشحنة',
      ORDERED_FROM_SHEIN: 'تم الطلب من SHEIN',
      SHIPPING: 'قيد الشحن',
      CUSTOMS: 'في الجمارك',
      ARRIVED_EGYPT: 'وصلت مصر',
      ARRIVED_STORE: 'وصلت المتجر',
      READY_FOR_PICKUP: 'جاهزة للاستلام',
      DELIVERED: 'تم التسليم',
      CANCELLED: 'ملغاة',
    },
    nextAction: 'الإجراء التالي',
    finalPayment: 'الدفع النهائي',
    payRemaining: 'ادفع المبلغ المتبقي',
    finalPaymentHint: 'اختار طريقة واحدة. المبلغ بالأسفل يتحدث قبل رفع الإثبات.',
    finalRejectedFallback: 'تم رفض الدفعة النهائية. يرجى اختيار طريقة الدفع مرة أخرى أو رفع صورة تحويل صحيحة.',
    noExtraFee: 'بدون رسوم إضافية',
    addsFee: 'رسوم فودافون كاش {percent}%',
    cashAtStore: 'نقدًا في المتجر',
    payWhenPickup: 'ادفع عند الاستلام',
    amountToTransfer: 'المبلغ المطلوب تحويله',
    remainingBeforeFee: 'المتبقي قبل الرسوم',
    finalPaymentFee: 'رسوم الدفعة النهائية',
    selectedMethod: 'طريقة الدفع المختارة',
    noTransferProofNeeded: 'لا تحتاج لرفع إثبات تحويل. أكد الاختيار وادفع عند وصولك للمتجر.',
    uploadFinalAgain: 'رفع إثبات الدفعة النهائية مرة أخرى',
    uploadFinalProof: 'رفع إثبات الدفعة النهائية',
    transferExactly: 'حوّل بالضبط {amount} باستخدام {method}، ثم ارفع صورة الإيصال.',
    selectCash: 'اختيار الدفع نقدًا في المتجر',
    paymentSummary: 'ملخص الدفع',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    depositLine: 'عربون {percent}%',
    depositFee: 'رسوم العربون',
    depositMethod: 'طريقة العربون',
    remainingBeforeFinalFees: 'المتبقي قبل رسوم الدفع النهائي',
    finalMethod: 'طريقة الدفع النهائي',
    finalAmountToPay: 'المبلغ النهائي المطلوب دفعه',
    orderTotal: 'إجمالي الطلب',
    deliveryAddress: 'عنوان التوصيل',
    paymentProofs: 'إثباتات الدفع',
    firstPayment: 'الدفعة الأولى',
    finalPaymentProofName: 'الدفعة النهائية',
    viewImage: 'عرض الصورة',
    orderHistory: 'سجل الطلب',
    productImageFallback: 'صورة المنتج',
    methods: {
      vodafone: 'فودافون كاش',
      instapay: 'Instapay',
      cashAtStore: 'نقدًا في المتجر',
      notSelected: 'غير محدد',
      vodafoneNumber: 'رقم فودافون كاش',
      instapayAccount: 'حساب Instapay',
      payAtPickup: 'الدفع عند الاستلام',
    },
    actions: {
      depositNeededTitle: 'مطلوب إثبات العربون',
      depositNeededMessage: 'ارفع إثبات الدفعة الأولى من صفحة الدفع لبدء تأكيد الطلب.',
      depositAmount: 'قيمة العربون',
      depositReviewTitle: 'العربون قيد المراجعة',
      depositReviewMessage: 'استلمنا صورة التحويل. الأدمن سيوافق عليها قبل بدء الشراء من SHEIN.',
      submittedDeposit: 'العربون المرسل',
      uploadDepositAgainTitle: 'ارفع إثبات العربون مرة أخرى',
      uploadDepositAgainMessage: 'تم رفض إثبات العربون السابق. ارفع صورة إيصال أوضح بالأسفل.',
      depositApprovedTitle: 'تم قبول العربون',
      depositApprovedMessage: 'تم تأكيد طلبك. سيتم فتح الدفع النهائي عند وصول المنتجات إلى المتجر.',
      remainingBeforeFees: 'المتبقي قبل الرسوم',
      finalRejectedTitle: 'تم رفض إثبات الدفعة النهائية',
      finalRequiredTitle: 'الدفع النهائي مطلوب',
      finalVodafoneMessage: 'رسوم فودافون كاش مضافة إلى المبلغ المطلوب تحويله قبل رفع الإثبات.',
      finalUploadMessage: 'اختار طريقة الدفع بالأسفل وارفع إثبات التحويل النهائي.',
      amountToPayNow: 'المبلغ المطلوب دفعه الآن',
      finalReviewTitle: 'الدفعة النهائية قيد المراجعة',
      finalReviewMessage: 'استلمنا إثبات الدفعة النهائية. الأدمن سيوافق عليه قريبًا.',
      submittedFinalAmount: 'المبلغ النهائي المرسل',
      paymentCompleteTitle: 'الدفع مكتمل',
      paymentCompleteMessage: 'طلبك مدفوع بالكامل. تابع تحديثات الشحن أو الاستلام من هذه الصفحة.',
      finalPaid: 'الدفعة النهائية المدفوعة',
    },
  },
  en: {
    metaTitle: 'Order Details | RS Store',
    metaDescription: 'Order status and payment proof details',
    failedLoadOrder: 'Failed to load order',
    cashFailed: 'Failed to select cash payment',
    loadingOrder: 'Loading order',
    preparingDetails: 'Preparing order tracking details',
    signInRequired: 'Sign in required',
    signInMessage: 'Please sign in to track your order',
    signIn: 'Sign In',
    failedLoadTitle: 'Failed to load order',
    tryAgain: 'Try Again',
    orderNotFound: 'Order not found',
    verifyOrder: 'Verify your order link or check your order history',
    viewOrders: 'View Orders',
    orderDetails: 'Order Details',
    order: 'Order',
    created: 'Created',
    allOrders: 'All Orders',
    continueShopping: 'Continue Shopping',
    viewTransferImage: 'View transfer image',
    products: 'Products',
    orderProducts: 'Order Products',
    items: 'items',
    qty: 'Qty',
    depositPayment: 'Deposit Payment',
    uploadDepositAgain: 'Upload Deposit Proof Again',
    uploadDepositHint: 'Upload a clearer transfer image so admin can review your deposit again.',
    depositRejectedFallback: 'Deposit proof was rejected. Please upload a new clear image.',
    depositProof: 'Deposit proof',
    rejectedByAdmin: 'Rejected by admin',
    reason: 'Reason',
    rejectedUploaded: 'Rejected proof uploaded',
    sheinTracking: 'SHEIN Shipment Tracking',
    insideShipment: 'Your order is inside shipment {batch}',
    currentState: 'Current state {status} · Updated {date}',
    shipment: 'Shipment',
    sheinShipment: 'SHEIN shipment',
    shipmentPreparing: 'Shipment is being prepared by the admin',
    shipmentCancelled: 'This SHEIN shipment was cancelled',
    sheinStatuses: {
      DRAFT: 'Preparing shipment',
      ORDERED_FROM_SHEIN: 'Ordered from SHEIN',
      SHIPPING: 'Shipping',
      CUSTOMS: 'At customs',
      ARRIVED_EGYPT: 'Arrived Egypt',
      ARRIVED_STORE: 'Arrived at store',
      READY_FOR_PICKUP: 'Ready for pickup',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    },
    nextAction: 'Next Action',
    finalPayment: 'Final Payment',
    payRemaining: 'Pay the remaining amount',
    finalPaymentHint: 'Choose one method. The amount below updates before you upload the proof.',
    finalRejectedFallback: 'Final payment was rejected. Please choose the payment method again or upload a corrected transfer image.',
    noExtraFee: 'No extra fee',
    addsFee: 'Vodafone Cash fee {percent}%',
    cashAtStore: 'Cash at store',
    payWhenPickup: 'Pay when pickup',
    amountToTransfer: 'Amount to transfer',
    remainingBeforeFee: 'Remaining before fee',
    finalPaymentFee: 'Final payment fee',
    selectedMethod: 'Selected method',
    noTransferProofNeeded: 'No transfer proof needed. Confirm this choice and pay when you reach the store.',
    uploadFinalAgain: 'Upload Final Payment Proof Again',
    uploadFinalProof: 'Upload final payment proof',
    transferExactly: 'Transfer exactly {amount} using {method}, then upload the receipt image.',
    selectCash: 'Select cash at store payment',
    paymentSummary: 'Payment Summary',
    subtotal: 'Subtotal',
    discount: 'Discount',
    depositLine: 'Deposit {percent}%',
    depositFee: 'Deposit fee',
    depositMethod: 'Deposit method',
    remainingBeforeFinalFees: 'Remaining before final fees',
    finalMethod: 'Final method',
    finalAmountToPay: 'Final amount to pay',
    orderTotal: 'Order total',
    deliveryAddress: 'Delivery Address',
    paymentProofs: 'Payment Proofs',
    firstPayment: 'First payment',
    finalPaymentProofName: 'Final payment',
    viewImage: 'View image',
    orderHistory: 'Order History',
    productImageFallback: 'Product image',
    methods: {
      vodafone: 'Vodafone Cash',
      instapay: 'Instapay',
      cashAtStore: 'Cash at store',
      notSelected: 'Not selected',
      vodafoneNumber: 'Vodafone Cash number',
      instapayAccount: 'Instapay account',
      payAtPickup: 'Pay at pickup',
    },
    actions: {
      depositNeededTitle: 'Deposit proof needed',
      depositNeededMessage: 'Upload the first payment proof from checkout to start order confirmation.',
      depositAmount: 'Deposit amount',
      depositReviewTitle: 'Deposit under review',
      depositReviewMessage: 'We received your transfer image. Admin will approve it before SHEIN purchasing starts.',
      submittedDeposit: 'Submitted deposit',
      uploadDepositAgainTitle: 'Upload deposit proof again',
      uploadDepositAgainMessage: 'The previous deposit proof was rejected. Upload a clearer receipt image below.',
      depositApprovedTitle: 'Deposit approved',
      depositApprovedMessage: 'Your order is confirmed. Final payment will open when the items arrive at the store.',
      remainingBeforeFees: 'Remaining before fees',
      finalRejectedTitle: 'Final payment proof rejected',
      finalRequiredTitle: 'Final payment required',
      finalVodafoneMessage: 'Vodafone Cash fee is included in the amount to transfer before you upload the proof.',
      finalUploadMessage: 'Choose the payment method below and upload the final transfer proof.',
      amountToPayNow: 'Amount to pay now',
      finalReviewTitle: 'Final payment under review',
      finalReviewMessage: 'We received your final payment proof. Admin will approve it soon.',
      submittedFinalAmount: 'Submitted final amount',
      paymentCompleteTitle: 'Payment complete',
      paymentCompleteMessage: 'Your order is fully paid. Follow shipment or pickup updates on this page.',
      finalPaid: 'Final paid',
    },
  },
} as const;

type OrderDetailCopy = (typeof orderDetailCopy)[keyof typeof orderDetailCopy];

function interpolateCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function OrderDetailPage() {
  const { language } = useI18n();
  const copy = orderDetailCopy[language];

  useDocumentMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
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
            copy,
          })
        : null,
    [copy, finalPaymentMethod, instapay, order, vodafoneCash, vodafoneFeePercent],
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
          setError(caughtError instanceof Error ? caughtError.message : copy.failedLoadOrder);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();
    return () => controller.abort();
  }, [copy.failedLoadOrder, id, status]);

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
        caughtError instanceof Error ? caughtError.message : copy.cashFailed,
      );
    }
  }

  if (isLoading || status === 'loading')
    return (
      <div className="rs-page-stack">
        <CatalogState title={copy.loadingOrder} message={copy.preparingDetails} />
      </div>
    );
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
  if (error)
    return (
      <div className="rs-page-stack">
        <CatalogState
          title={copy.failedLoadTitle}
          message={error}
          ctaLabel={copy.tryAgain}
          ctaHref={PATHS.orders}
        />
      </div>
    );
  if (!order)
    return (
      <div className="rs-page-stack">
        <CatalogState
          title={copy.orderNotFound}
          message={copy.verifyOrder}
          ctaLabel={copy.viewOrders}
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
                {copy.orderDetails}
              </p>
              <h1 className="mt-2 text-2xl font-black text-rs-ink tracking-tight sm:text-3xl">
                {copy.order} {order.orderNumber}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {copy.created} {formatOrderDate(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={PATHS.orders}>{copy.allOrders}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={PATHS.home}>{copy.continueShopping}</Link>
            </Button>
            {depositProof?.secureUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={depositProof.secureUrl} target="_blank" rel="noreferrer">
                  {copy.viewTransferImage} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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
                  {copy.products}
                </p>
                <h2 className="mt-1 text-lg font-black text-rs-ink">{copy.orderProducts}</h2>
              </div>
              <span className="rounded-full bg-rs-cream-warm px-3 py-1 text-xs font-extrabold text-muted-foreground">
                {order.items.length} {copy.items}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {order.items.map((item) => (
                <article key={item.id} className="rs-order-product-card">
                  <div className="rs-order-product-main">
                    <div className="rs-order-product-thumb">
                      <ImageWithFallback
                        src={resolveOrderItemImageUrl(item)}
                        alt={resolveOrderItemImageAlt(item, language)}
                        loading="lazy"
                        className="rs-order-product-thumb-media"
                        fallbackVariant="product"
                      />
                    </div>

                    <div className="rs-order-product-info">
                      <h3 className="rs-order-product-title">{resolveOrderItemName(item, language)}</h3>
                      {item.productVariantNameSnapshot ? (
                        <p className="rs-order-product-variant">
                          {resolveOrderItemVariantName(item, language)}
                        </p>
                      ) : null}
                      {item.productVariantSizeSnapshot || item.productVariantColorSnapshot ? (
                        <p className="rs-order-product-options">
                          {resolveOrderItemOptions(item, language).join(' • ')}
                        </p>
                      ) : null}

                      <div className="rs-order-product-meta">
                        <span>{copy.qty} {item.quantity}</span>
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
                    {copy.depositPayment}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-rs-ink">
                    {copy.uploadDepositAgain}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.uploadDepositHint}
                  </p>
                </div>
              </div>

              <RejectionNotice
                proof={rejectedDepositProof}
                fallback={copy.depositRejectedFallback}
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
                <PaymentProofUploader label={copy.depositProof} onUpload={uploadDeposit} />
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

function resolveOrderItemName(item: OrderItem, language: Language): string {
  const localizedName = language === 'ar'
    ? item.product?.nameAr || item.productNameSnapshot
    : item.product?.nameEn || item.productNameSnapshot;
  return localizeProductText(localizedName, language);
}

function resolveOrderItemVariantName(item: OrderItem, language: Language): string {
  return localizeProductText(item.productVariantNameSnapshot, language);
}

function resolveOrderItemOptions(item: OrderItem, language: Language): string[] {
  return [item.productVariantSizeSnapshot, item.productVariantColorSnapshot]
    .filter((value): value is string => Boolean(value))
    .map((value) => localizeProductOption(value, language));
}

function resolveOrderItemImageAlt(item: OrderItem, language: Language): string {
  const image = item.product?.images?.[0];
  const altText = language === 'ar'
    ? image?.altTextAr || image?.altText || image?.altTextEn
    : image?.altTextEn || image?.altText || image?.altTextAr;

  return localizeProductText(
    altText || resolveOrderItemName(item, language) || orderDetailCopy.en.productImageFallback,
    language,
  );
}

function RejectionNotice({
  proof,
  fallback,
}: {
  proof: OrderPaymentProof | null;
  fallback: string;
}) {
  const { language } = useI18n();
  const copy = orderDetailCopy[language];
  const reason = proof?.rejectionReason?.trim();
  return (
    <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
      <p className="font-extrabold">{copy.rejectedByAdmin}</p>
      <p className="mt-1 font-semibold">{reason ? `${copy.reason}: ${reason}` : fallback}</p>
      {proof?.createdAt ? (
        <p className="mt-1 text-xs font-semibold opacity-80">
          {copy.rejectedUploaded} {formatOrderDate(proof.createdAt)}
        </p>
      ) : null}
    </div>
  );
}

function SheinBatchTracking({ order }: { order: Order }) {
  const { language } = useI18n();
  const copy = orderDetailCopy[language];
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
              {copy.sheinTracking}
            </p>
            <h2 className="mt-1 text-lg font-black text-rs-ink">
              {interpolateCopy(copy.insideShipment, { batch: primaryBatch.batchCode })}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {interpolateCopy(copy.currentState, {
                status: sheinStatusLabel(primaryBatch.status, copy),
                date: formatOrderDate(primaryBatch.updatedAt),
              })}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-rs-gold shadow-sm">
            {sheinStatusLabel(primaryBatch.status, copy)}
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
              <p className="text-sm font-black text-rs-ink">{resolveOrderItemName(item, language)}</p>
              {item.productVariantNameSnapshot ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {resolveOrderItemVariantName(item, language)}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                {copy.qty} {tracking!.quantity} · {copy.shipment} {tracking!.batch.batchCode} ·{' '}
                {sheinStatusLabel(tracking!.batch.status, copy)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OrderItemSheinBadge({ item }: { item: OrderItem }) {
  const { language } = useI18n();
  const copy = orderDetailCopy[language];
  const tracking = item.sheinBatchItems?.[0];
  if (!tracking?.batch) return null;
  return (
    <div className="rs-order-product-shipment">
      {copy.sheinShipment} <strong>{tracking.batch.batchCode}</strong> ·{' '}
      <span>{sheinStatusLabel(tracking.batch.status, copy)}</span>
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
  const { direction, language } = useI18n();
  const copy = orderDetailCopy[language];
  if (status === 'DRAFT') {
    return (
      <p className="mt-4 rounded-2xl bg-white/75 p-3 text-sm font-bold text-muted-foreground">
        {copy.shipmentPreparing}
      </p>
    );
  }
  if (status === 'CANCELLED') {
    return (
      <p className="mt-4 rounded-2xl bg-destructive/10 p-3 text-sm font-bold text-destructive">
        {copy.shipmentCancelled}
      </p>
    );
  }

  const currentIndex = SHEIN_TRACKING_STEPS.indexOf(status);
  return (
    <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6" dir={direction}>
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
            <p className="text-xs font-black leading-5">{sheinStatusLabel(step, copy)}</p>
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

function sheinStatusLabel(status: CustomerSheinBatchStatus, copy: OrderDetailCopy): string {
  return copy.sheinStatuses[status];
}

function NextActionCard({
  order,
  finalPaymentPreview,
}: {
  order: Order;
  finalPaymentPreview: FinalPaymentPreview | null;
}) {
  const { language } = useI18n();
  const copy = orderDetailCopy[language];
  const action = getNextAction(order, finalPaymentPreview, copy, language);
  if (!action) return null;

  return (
    <section className="rounded-3xl border border-rs-peach bg-rs-cream-warm p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
            {copy.nextAction}
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
  const { language } = useI18n();
  const copy = orderDetailCopy[language];

  return (
    <section className="rs-panel overflow-hidden p-0">
      <div className="bg-gradient-to-l from-rs-cream-warm via-card to-rs-cream p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rs-gold">
              {copy.finalPayment}
            </p>
            <h2 className="mt-1 text-xl font-black text-rs-ink">{copy.payRemaining}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
              {copy.finalPaymentHint}
            </p>
          </div>
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>

        {order.paymentStatus === 'FINAL_PAYMENT_REJECTED' ? (
          <RejectionNotice
            proof={rejectedProof}
            fallback={copy.finalRejectedFallback}
          />
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <FinalPaymentMethodButton
            value="instapay"
            label={copy.methods.instapay}
            hint={copy.noExtraFee}
            selected={finalPaymentMethod === 'instapay'}
            onSelect={onMethodChange}
          />
          <FinalPaymentMethodButton
            value="vodafone"
            label={copy.methods.vodafone}
            hint={interpolateCopy(copy.addsFee, { percent: preview.feePercent })}
            selected={finalPaymentMethod === 'vodafone'}
            onSelect={onMethodChange}
          />
          <FinalPaymentMethodButton
            value="cash_at_shop"
            label={copy.cashAtStore}
            hint={copy.payWhenPickup}
            selected={finalPaymentMethod === 'cash_at_shop'}
            onSelect={onMethodChange}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
          <div className="rounded-2xl border border-rs-peach-light bg-card p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
              {copy.amountToTransfer}
            </p>
            <p className="mt-2 text-3xl font-black rs-price-primary">
              {formatOrderMoney(preview.amountDue, order.currency, language)}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <SummaryRow
                label={copy.remainingBeforeFee}
                value={formatOrderMoney(preview.baseAmount, order.currency, language)}
              />
              <SummaryRow
                label={
                  preview.method === 'vodafone'
                    ? interpolateCopy(copy.addsFee, { percent: preview.feePercent })
                    : copy.finalPaymentFee
                }
                value={formatOrderMoney(preview.feeAmount, order.currency, language)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-rs-peach-light bg-card p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
              {copy.selectedMethod}
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
                {copy.noTransferProofNeeded}
              </p>
            )}
          </div>
        </div>

        {preview.isOnline ? (
          <div className="mt-4">
            <PaymentProofUploader
              label={
                finalPaymentProof?.status === 'REJECTED'
                  ? copy.uploadFinalAgain
                  : copy.uploadFinalProof
              }
              onUpload={onUpload}
            />
            <p className="mt-2 rounded-2xl bg-rs-cream-warm p-3 text-xs font-semibold leading-5 text-muted-foreground">
              {interpolateCopy(copy.transferExactly, {
                amount: formatOrderMoney(preview.amountDue, order.currency, language),
                method: preview.methodLabel,
              })}
            </p>
          </div>
        ) : (
          <Button type="button" className="rs-btn-secondary mt-4 w-full" onClick={onCashSubmit}>
            {copy.selectCash}
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
  const { language } = useI18n();
  const copy = orderDetailCopy[language];
  const savedFinalDue = toOrderRawAmount(order.finalAmountDue);
  const displayFinalDue =
    finalPaymentPreview?.amountDue ??
    (savedFinalDue > 0 ? savedFinalDue : toOrderRawAmount(order.remainingAmount));
  return (
    <div className="rs-panel p-4 sm:p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
        {copy.paymentSummary}
      </h2>
      <div className="mt-4 space-y-2 text-sm">
        <SummaryRow
          label={copy.subtotal}
          value={formatOrderMoney(order.subtotalAmount, order.currency, language)}
        />
        <SummaryRow
          label={copy.discount}
          value={formatOrderMoney(order.discountAmount, order.currency, language)}
        />
        <SummaryRow
          label={interpolateCopy(copy.depositLine, { percent: order.depositPercent })}
          value={formatOrderMoney(order.depositAmount, order.currency, language)}
        />
        <SummaryRow
          label={copy.depositFee}
          value={formatOrderMoney(order.depositPaymentFeeAmount, order.currency, language)}
        />
        <SummaryRow label={copy.depositMethod} value={paymentMethodLabel(order.depositPaymentMethod, copy)} />
        <SummaryRow
          label={copy.remainingBeforeFinalFees}
          value={formatOrderMoney(order.remainingAmount, order.currency, language)}
        />
        <SummaryRow
          label={copy.finalPaymentFee}
          value={formatOrderMoney(
            finalPaymentPreview?.feeAmount ?? order.finalPaymentFeeAmount,
            order.currency,
            language,
          )}
        />
        <SummaryRow
          label={copy.finalMethod}
          value={finalPaymentPreview?.methodLabel ?? paymentMethodLabel(order.finalPaymentMethod, copy)}
        />
        <SummaryRow
          label={copy.finalAmountToPay}
          value={formatOrderMoney(displayFinalDue, order.currency, language)}
          isStrong
        />
        <div className="h-px bg-rs-peach-light mt-2" />
        <SummaryRow
          label={copy.orderTotal}
          value={formatOrderMoney(order.totalAmount, order.currency, language)}
        />
      </div>
    </div>
  );
}

function ShippingSummary({ order }: { order: Order }) {
  const { language } = useI18n();
  const copy = orderDetailCopy[language];

  return (
    <div className="rs-panel p-4 sm:p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
        {copy.deliveryAddress}
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
  const { language } = useI18n();
  const copy = orderDetailCopy[language];

  if (proofs.length === 0) return null;

  return (
    <div className="rs-panel p-4 sm:p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
        {copy.paymentProofs}
      </h2>
      <div className="mt-4 space-y-2.5">
        {proofs.map((proof) => (
          <div key={proof.id} className="rounded-2xl border border-rs-peach-light bg-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold">
                {proof.type === 'DEPOSIT' ? copy.firstPayment : copy.finalPaymentProofName}
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
                  {copy.viewImage} <ExternalLink className="h-3 w-3" aria-hidden="true" />
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
  const { language } = useI18n();
  const copy = orderDetailCopy[language];
  const timeline = order.timeline ?? [];
  if (timeline.length === 0) return null;

  return (
    <details className="rs-panel p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold">
        {copy.orderHistory}
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

function paymentMethodLabel(
  method: Order['depositPaymentMethod'] | null | undefined,
  copy: OrderDetailCopy,
): string {
  if (method === 'VODAFONE') return copy.methods.vodafone;
  if (method === 'INSTAPAY') return copy.methods.instapay;
  if (method === 'CASH_AT_SHOP') return copy.methods.cashAtStore;
  return copy.methods.notSelected;
}

function getNextAction(
  order: Order,
  finalPaymentPreview: FinalPaymentPreview | null,
  copy: OrderDetailCopy,
  language: Language,
): { title: string; message: string; amount?: string; amountLabel?: string } | null {
  if (order.paymentStatus === 'DEPOSIT_PENDING') {
    return {
      title: copy.actions.depositNeededTitle,
      message: copy.actions.depositNeededMessage,
      amount: formatOrderMoney(order.depositAmount, order.currency, language),
      amountLabel: copy.actions.depositAmount,
    };
  }

  if (order.paymentStatus === 'DEPOSIT_SUBMITTED') {
    return {
      title: copy.actions.depositReviewTitle,
      message: copy.actions.depositReviewMessage,
      amount: formatOrderMoney(order.depositAmount, order.currency, language),
      amountLabel: copy.actions.submittedDeposit,
    };
  }

  if (order.paymentStatus === 'DEPOSIT_REJECTED') {
    return {
      title: copy.actions.uploadDepositAgainTitle,
      message: copy.actions.uploadDepositAgainMessage,
      amount: formatOrderMoney(order.depositAmount, order.currency, language),
      amountLabel: copy.actions.depositAmount,
    };
  }

  if (order.paymentStatus === 'DEPOSIT_APPROVED') {
    return {
      title: copy.actions.depositApprovedTitle,
      message: copy.actions.depositApprovedMessage,
      amount: formatOrderMoney(order.remainingAmount, order.currency, language),
      amountLabel: copy.actions.remainingBeforeFees,
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
          ? copy.actions.finalRejectedTitle
          : copy.actions.finalRequiredTitle,
      message:
        finalPaymentPreview.method === 'vodafone'
          ? copy.actions.finalVodafoneMessage
          : copy.actions.finalUploadMessage,
      amount: formatOrderMoney(finalPaymentPreview.amountDue, order.currency, language),
      amountLabel: copy.actions.amountToPayNow,
    };
  }

  if (order.paymentStatus === 'FINAL_PAYMENT_SUBMITTED') {
    return {
      title: copy.actions.finalReviewTitle,
      message: copy.actions.finalReviewMessage,
      amount: formatOrderMoney(order.finalAmountDue, order.currency, language),
      amountLabel: copy.actions.submittedFinalAmount,
    };
  }

  if (order.paymentStatus === 'PAID') {
    return {
      title: copy.actions.paymentCompleteTitle,
      message: copy.actions.paymentCompleteMessage,
      amount: formatOrderMoney(order.finalPaidAmount, order.currency, language),
      amountLabel: copy.actions.finalPaid,
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
  copy,
}: {
  order: Order;
  method: FinalPaymentMethodChoice;
  vodafoneFeePercent: number;
  vodafoneCash: string;
  instapay: string;
  copy: OrderDetailCopy;
}): FinalPaymentPreview {
  const baseAmount = toOrderRawAmount(order.remainingAmount);
  const feeAmount = method === 'vodafone' ? calculatePercentRaw(baseAmount, vodafoneFeePercent) : 0;
  const isOnline = method !== 'cash_at_shop';

  if (method === 'vodafone') {
    return {
      method,
      methodLabel: copy.methods.vodafone,
      receiverLabel: copy.methods.vodafoneNumber,
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
      methodLabel: copy.methods.cashAtStore,
      receiverLabel: copy.methods.payAtPickup,
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
    methodLabel: copy.methods.instapay,
    receiverLabel: copy.methods.instapayAccount,
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
