import { FormEvent, useEffect, useState } from 'react';
import { ExternalLink, ImagePlus, Loader2, PackageCheck, Send, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  customOrdersApi,
  type CustomOrderRequest,
} from '@/features/custom-orders/api/custom-orders-api';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { Button } from '@/shared/components/ui/Button';
import { orderPath, PATHS } from '@/shared/constants/routes';
import { useI18n, type Language } from '@/shared/i18n';

const customOrderCopy = {
  ar: {
    status: {
      PENDING_REVIEW: 'بانتظار مراجعة الأدمن',
      ACCEPTED: 'تم القبول',
      REJECTED: 'مرفوض',
    },
    unableToLoad: 'تعذر تحميل الطلبات الخاصة',
    success: 'تم إرسال طلبك الخاص',
    unableToCreate: 'تعذر إنشاء الطلب الخاص',
    kicker: 'طلب خاص',
    title: 'اطلب أي منتج بالرابط',
    description: 'أرسل رابط المنتج والتفاصيل الاختيارية. اللون والمقاس يمكن تركهما فارغين.',
    productUrl: 'رابط المنتج',
    requestedColor: 'اللون المطلوب',
    requestedSize: 'المقاس المطلوب',
    optional: 'اختياري',
    quantity: 'الكمية',
    note: 'ملاحظة',
    referenceImage: 'صورة مرجعية',
    uploadReference: 'رفع صورة مرجعية اختياري',
    chooseImage: 'اختار صورة',
    imageFormats: 'JPG PNG WEBP أو GIF',
    submitRequest: 'إرسال الطلب',
    myCustomOrders: 'طلباتي الخاصة',
    loadingRequests: 'جاري تحميل الطلبات',
    noCustomOrders: 'لا توجد طلبات خاصة بعد',
    qty: 'الكمية',
    productLink: 'رابط المنتج',
    color: 'اللون',
    size: 'المقاس',
    customOrder: 'طلب خاص',
    customOrderAlt: 'طلب خاص',
    acceptedCustomProduct: 'منتج خاص مقبول',
    openOrder: 'فتح الطلب',
    viewInCart: 'عرض في السلة',
    locale: 'ar-EG',
  },
  en: {
    status: {
      PENDING_REVIEW: 'Waiting Admin Review',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
    },
    unableToLoad: 'Unable to load custom orders',
    success: 'Custom order request sent',
    unableToCreate: 'Unable to create custom order',
    kicker: 'Custom Order',
    title: 'Request any product by link',
    description: 'Send the product link and optional details. Color and size can stay empty.',
    productUrl: 'Product URL',
    requestedColor: 'Requested color',
    requestedSize: 'Requested size',
    optional: 'Optional',
    quantity: 'Quantity',
    note: 'Note',
    referenceImage: 'Reference image',
    uploadReference: 'Upload reference image optional',
    chooseImage: 'Choose image',
    imageFormats: 'JPG PNG WEBP or GIF',
    submitRequest: 'Submit Request',
    myCustomOrders: 'My Custom Orders',
    loadingRequests: 'Loading requests',
    noCustomOrders: 'No custom orders yet',
    qty: 'Qty',
    productLink: 'Product link',
    color: 'Color',
    size: 'Size',
    customOrder: 'Custom Order',
    customOrderAlt: 'Custom order',
    acceptedCustomProduct: 'Accepted custom product',
    openOrder: 'Open Order',
    viewInCart: 'View in Cart',
    locale: 'en-US',
  },
} as const;

type CustomOrderCopy = (typeof customOrderCopy)[keyof typeof customOrderCopy];

const fieldClass = 'grid min-w-0 w-full gap-1.5 text-start text-sm font-bold text-rs-ink';
const inputClass =
  'w-full min-w-0 rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

export function CustomOrderPage() {
  const { language } = useI18n();
  const copy = customOrderCopy[language];
  const { csrfToken } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState<CustomOrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customerImageName, setCustomerImageName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    customOrdersApi
      .listMine({ signal: controller.signal })
      .then(setItems)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message || copy.unableToLoad);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [copy.unableToLoad]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const form = new FormData(formElement);
    const file = form.get('customerImage');
    try {
      const created = await customOrdersApi.create(
        {
          productUrl: String(form.get('productUrl') ?? '').trim(),
          requestedColor: String(form.get('requestedColor') ?? '').trim(),
          requestedSize: String(form.get('requestedSize') ?? '').trim(),
          quantity: Number(form.get('quantity') ?? 1),
          customerNote: String(form.get('customerNote') ?? '').trim(),
        },
        file instanceof File && file.size > 0 ? file : null,
        { csrfToken },
      );
      setItems((current) => [created, ...current]);
      formElement.reset();
      setCustomerImageName(null);
      setSuccess(copy.success);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unableToCreate);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="w-full max-w-full overflow-hidden rounded-[1.25rem] border border-border bg-card px-4 py-5 shadow-sm sm:p-6">
          <div className="mb-5 text-start">
            <p className="text-xs font-black uppercase tracking-wide text-rs-gold">{copy.kicker}</p>
            <h1 className="mt-1 text-2xl font-black text-rs-ink">{copy.title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className={fieldClass}>
              {copy.productUrl}
              <input
                className={inputClass}
                name="productUrl"
                type="url"
                required
                placeholder="https://..."
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={fieldClass}>
                {copy.requestedColor}
                <input className={inputClass} name="requestedColor" placeholder={copy.optional} />
              </label>
              <label className={fieldClass}>
                {copy.requestedSize}
                <input className={inputClass} name="requestedSize" placeholder={copy.optional} />
              </label>
            </div>

            <label className={fieldClass}>
              {copy.quantity}
              <input
                className={`${inputClass} sm:max-w-36`}
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                required
              />
            </label>

            <label className={fieldClass}>
              {copy.note}
              <textarea
                className={`${inputClass} min-h-[120px] resize-none`}
                name="customerNote"
                placeholder={copy.optional}
              />
            </label>

            <label className={fieldClass}>
              {copy.referenceImage}
              <span className="flex min-h-[132px] w-full min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-orange-200 bg-white px-4 py-5 text-center transition hover:border-orange-300">
                <ImagePlus className="h-6 w-6 text-rs-gold" aria-hidden="true" />
                <span className="text-sm font-black text-rs-ink">{copy.uploadReference}</span>
                <span className="max-w-full truncate rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">
                  {customerImageName ?? copy.chooseImage}
                </span>
                <span className="text-xs font-bold text-muted-foreground">{copy.imageFormats}</span>
                <input
                  className="sr-only"
                  name="customerImage"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setCustomerImageName(event.currentTarget.files?.[0]?.name ?? null)
                  }
                />
              </span>
            </label>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                {success}
              </p>
            ) : null}

            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {copy.submitRequest}
            </Button>
          </form>
        </div>

        <div className="w-full max-w-full overflow-hidden rounded-[1.25rem] border border-border bg-card px-4 py-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3 text-start">
            <h2 className="text-xl font-black text-rs-ink">{copy.myCustomOrders}</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-secondary-foreground">
              {items.length}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 flex min-h-[160px] items-center justify-center gap-2 rounded-2xl border border-border bg-white p-6 text-sm font-bold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.loadingRequests}
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="mt-4 flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-8 text-center">
              <PackageCheck className="h-8 w-8 text-rs-gold" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-muted-foreground">{copy.noCustomOrders}</p>
            </div>
          ) : null}

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) =>
              item.status === 'ACCEPTED' ? (
                <AcceptedCustomOrderCard
                  key={item.id}
                  item={item}
                  copy={copy}
                  language={language}
                  onOpen={async () => {
                    const convertedOrderId = item.convertedOrder?.id ?? item.convertedOrderId;
                    if (convertedOrderId) {
                      navigate(orderPath(convertedOrderId));
                      return;
                    }

                    await refreshCart();
                    navigate(PATHS.cart);
                  }}
                />
              ) : (
                <PendingCustomOrderCard key={item.id} item={item} copy={copy} />
              ),
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PendingCustomOrderCard({
  item,
  copy,
}: {
  item: CustomOrderRequest;
  copy: CustomOrderCopy;
}) {
  return (
    <article className="min-w-0 rounded-[1.25rem] border border-border bg-card p-4 shadow-sm">
      {item.customerImageUrl ? (
        <img
          src={item.customerImageUrl}
          alt=""
          className="mb-3 aspect-[4/3] w-full rounded-xl object-cover"
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${item.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
        >
          {copy.status[item.status]}
        </span>
        <span className="text-xs font-bold text-muted-foreground">
          {copy.qty} {item.quantity}
        </span>
      </div>
      <a
        className="mt-3 flex items-center gap-2 break-all text-sm font-bold text-rs-ink hover:text-rs-gold"
        href={item.productUrl}
        target="_blank"
        rel="noreferrer"
      >
        {copy.productLink} <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </a>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
        {item.requestedColor ? (
          <span className="rounded-full bg-secondary px-2.5 py-1">
            {copy.color} {item.requestedColor}
          </span>
        ) : null}
        {item.requestedSize ? (
          <span className="rounded-full bg-secondary px-2.5 py-1">
            {copy.size} {item.requestedSize}
          </span>
        ) : null}
      </div>
      {item.customerNote ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.customerNote}</p>
      ) : null}
      {item.adminNote && item.status === 'REJECTED' ? (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">
          {item.adminNote}
        </p>
      ) : null}
    </article>
  );
}

function AcceptedCustomOrderCard({
  item,
  copy,
  language,
  onOpen,
}: {
  item: CustomOrderRequest;
  copy: CustomOrderCopy;
  language: Language;
  onOpen: () => void | Promise<void>;
}) {
  return (
    <article className="rs-product-card min-w-0">
      <div className="rs-product-image-wrap">
        {item.adminImageUrl ? (
          <img
            src={item.adminImageUrl}
            alt={item.adminTitle ?? copy.customOrderAlt}
            className="rs-product-image"
          />
        ) : (
          <ImageWithFallback
            src={null}
            alt={item.adminTitle ?? copy.customOrderAlt}
            className="rs-product-image"
            fallbackVariant="product"
          />
        )}
        <span className="rs-badge-sale bg-emerald-600">{copy.status.ACCEPTED}</span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground">
          {copy.customOrder}
        </p>
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-rs-ink">
          {item.adminTitle ?? copy.acceptedCustomProduct}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
          {item.requestedColor ? (
            <span className="rounded-full bg-secondary px-2.5 py-1">
              {copy.color} {item.requestedColor}
            </span>
          ) : null}
          {item.requestedSize ? (
            <span className="rounded-full bg-secondary px-2.5 py-1">
              {copy.size} {item.requestedSize}
            </span>
          ) : null}
          <span className="rounded-full bg-secondary px-2.5 py-1">
            {copy.qty} {item.quantity}
          </span>
        </div>
        <p className="mt-3 text-base font-black rs-price-primary">
          {formatMinorAmount(item.adminTotalAmount, language)}
        </p>
        {item.adminNote ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.adminNote}
          </p>
        ) : null}
        <Button className="rs-cart-btn mt-auto" onClick={() => void onOpen()}>
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {item.convertedOrder?.id || item.convertedOrderId ? copy.openOrder : copy.viewInCart}
        </Button>
      </div>
    </article>
  );
}

function formatMinorAmount(value: string | number | null | undefined, language: Language) {
  const amount = Number(value ?? 0) / 100;
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
  }).format(Number.isFinite(amount) ? amount : 0);
}
