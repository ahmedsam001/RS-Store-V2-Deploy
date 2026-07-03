import { FormEvent, useEffect, useState } from 'react';
import { ExternalLink, ImagePlus, Loader2, PackageCheck, Send, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  customOrdersApi,
  type CustomOrderRequest,
} from '@/features/custom-orders/api/custom-orders-api';
import { useAuth } from '@/features/auth/AuthContext';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { Button } from '@/shared/components/ui/Button';
import { orderPath } from '@/shared/constants/routes';

const STATUS_LABELS: Record<CustomOrderRequest['status'], string> = {
  PENDING_REVIEW: 'Waiting Admin Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

const fieldClass = 'grid min-w-0 w-full gap-1.5 text-start text-sm font-bold text-rs-ink';
const inputClass =
  'w-full min-w-0 rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

export function CustomOrderPage() {
  const { csrfToken } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CustomOrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingOrderId, setCreatingOrderId] = useState<string | null>(null);
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
        if (err.name !== 'AbortError') setError(err.message || 'Unable to load custom orders');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

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
      setSuccess('Custom order request sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create custom order');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateOrder(item: CustomOrderRequest) {
    setCreatingOrderId(item.id);
    setError(null);
    try {
      const order = await customOrdersApi.createOrder(item.id, { csrfToken });
      navigate(orderPath(order.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to start checkout for this custom order',
      );
    } finally {
      setCreatingOrderId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="w-full max-w-full overflow-hidden rounded-[1.25rem] border border-border bg-card px-4 py-5 shadow-sm sm:p-6">
          <div className="mb-5 text-start">
            <p className="text-xs font-black uppercase tracking-wide text-rs-gold">Custom Order</p>
            <h1 className="mt-1 text-2xl font-black text-rs-ink">Request any product by link</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Send the product link and optional details. Color and size can stay empty.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className={fieldClass}>
              Product URL
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
                Requested color
                <input className={inputClass} name="requestedColor" placeholder="Optional" />
              </label>
              <label className={fieldClass}>
                Requested size
                <input className={inputClass} name="requestedSize" placeholder="Optional" />
              </label>
            </div>

            <label className={fieldClass}>
              Quantity
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
              Note
              <textarea
                className={`${inputClass} min-h-[120px] resize-none`}
                name="customerNote"
                placeholder="Optional"
              />
            </label>

            <label className={fieldClass}>
              Reference image
              <span className="flex min-h-[132px] w-full min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-orange-200 bg-white px-4 py-5 text-center transition hover:border-orange-300">
                <ImagePlus className="h-6 w-6 text-rs-gold" aria-hidden="true" />
                <span className="text-sm font-black text-rs-ink">
                  Upload reference image optional
                </span>
                <span className="max-w-full truncate rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">
                  {customerImageName ?? 'Choose image'}
                </span>
                <span className="text-xs font-bold text-muted-foreground">JPG PNG WEBP or GIF</span>
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
              Submit Request
            </Button>
          </form>
        </div>

        <div className="w-full max-w-full overflow-hidden rounded-[1.25rem] border border-border bg-card px-4 py-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3 text-start">
            <h2 className="text-xl font-black text-rs-ink">My Custom Orders</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-secondary-foreground">
              {items.length}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 flex min-h-[160px] items-center justify-center gap-2 rounded-2xl border border-border bg-white p-6 text-sm font-bold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading requests
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="mt-4 flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-8 text-center">
              <PackageCheck className="h-8 w-8 text-rs-gold" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-muted-foreground">No custom orders yet</p>
            </div>
          ) : null}

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) =>
              item.status === 'ACCEPTED' ? (
                <AcceptedCustomOrderCard
                  key={item.id}
                  item={item}
                  isCreatingOrder={creatingOrderId === item.id}
                  onCreateOrder={() => handleCreateOrder(item)}
                />
              ) : (
                <PendingCustomOrderCard key={item.id} item={item} />
              ),
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PendingCustomOrderCard({ item }: { item: CustomOrderRequest }) {
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
          {STATUS_LABELS[item.status]}
        </span>
        <span className="text-xs font-bold text-muted-foreground">Qty {item.quantity}</span>
      </div>
      <a
        className="mt-3 flex items-center gap-2 break-all text-sm font-bold text-rs-ink hover:text-rs-gold"
        href={item.productUrl}
        target="_blank"
        rel="noreferrer"
      >
        Product link <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </a>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
        {item.requestedColor ? (
          <span className="rounded-full bg-secondary px-2.5 py-1">Color {item.requestedColor}</span>
        ) : null}
        {item.requestedSize ? (
          <span className="rounded-full bg-secondary px-2.5 py-1">Size {item.requestedSize}</span>
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
  isCreatingOrder,
  onCreateOrder,
}: {
  item: CustomOrderRequest;
  isCreatingOrder: boolean;
  onCreateOrder: () => void;
}) {
  return (
    <article className="rs-product-card min-w-0">
      <div className="rs-product-image-wrap">
        {item.adminImageUrl ? (
          <img
            src={item.adminImageUrl}
            alt={item.adminTitle ?? 'Custom order'}
            className="rs-product-image"
          />
        ) : (
          <ImageWithFallback
            src={null}
            alt={item.adminTitle ?? 'Custom order'}
            className="rs-product-image"
            fallbackVariant="product"
          />
        )}
        <span className="rs-badge-sale bg-emerald-600">Accepted</span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground">Custom Order</p>
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-rs-ink">
          {item.adminTitle ?? 'Accepted custom product'}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
          {item.requestedColor ? (
            <span className="rounded-full bg-secondary px-2.5 py-1">
              Color {item.requestedColor}
            </span>
          ) : null}
          {item.requestedSize ? (
            <span className="rounded-full bg-secondary px-2.5 py-1">Size {item.requestedSize}</span>
          ) : null}
          <span className="rounded-full bg-secondary px-2.5 py-1">Qty {item.quantity}</span>
        </div>
        <p className="mt-3 text-base font-black rs-price-primary">
          {formatMinorAmount(item.adminTotalAmount)}
        </p>
        {item.adminNote ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.adminNote}
          </p>
        ) : null}
        <Button className="rs-cart-btn mt-auto" onClick={onCreateOrder} disabled={isCreatingOrder}>
          {isCreatingOrder ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          )}
          {item.convertedOrderId ? 'Open Order' : 'Add to Checkout'}
        </Button>
      </div>
    </article>
  );
}

function formatMinorAmount(value: string | number | null | undefined) {
  const amount = Number(value ?? 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}
