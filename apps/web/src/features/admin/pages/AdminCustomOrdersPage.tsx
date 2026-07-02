import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, PackageSearch, RefreshCw, Search, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  customOrdersApi,
  type CustomOrderRequest,
  type CustomOrderStatus,
} from '@/features/custom-orders/api/custom-orders-api';
import { useAuth } from '@/features/auth/AuthContext';
import {
  AdminCard,
  AdminCountBadge,
  AdminPageHeader,
  AdminStatusBadge,
} from '@/features/admin/components/AdminDesign';
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { Button } from '@/shared/components/ui/Button';

const STATUS_FILTERS: Array<{ value: 'ALL' | CustomOrderStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_REVIEW', label: 'Waiting Review' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_LABELS: Record<CustomOrderStatus, string> = {
  PENDING_REVIEW: 'Waiting Admin Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

export function AdminCustomOrdersPage() {
  const { csrfToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<CustomOrderRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const status = (searchParams.get('status') as CustomOrderStatus | null) ?? 'ALL';
  const search = searchParams.get('search') ?? '';

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (search) params.set('search', search);
    params.set('limit', '30');
    return params.toString();
  }, [search, status]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const response = await customOrdersApi.adminList(query, { signal });
        setItems(response.items);
        setTotal(response.meta.total);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load custom orders');
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function updateFilter(next: { status?: string; search?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.status !== undefined) {
      if (next.status === 'ALL') params.delete('status');
      else params.set('status', next.status);
    }
    if (next.search !== undefined) {
      if (next.search.trim()) params.set('search', next.search.trim());
      else params.delete('search');
    }
    setSearchParams(params);
  }

  async function review(
    id: string,
    event: FormEvent<HTMLFormElement>,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    event.preventDefault();
    setReviewingId(id);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get('adminImage');
    try {
      const updated = await customOrdersApi.review(
        id,
        {
          status,
          adminTitle: String(form.get('adminTitle') ?? '').trim(),
          adminPriceAmount: String(form.get('adminPriceAmount') ?? '').trim(),
          adminShippingAmount: String(form.get('adminShippingAmount') ?? '').trim(),
          adminTotalAmount: String(form.get('adminTotalAmount') ?? '').trim(),
          adminNote: String(form.get('adminNote') ?? '').trim(),
        },
        file instanceof File && file.size > 0 ? file : null,
        { csrfToken },
      );
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to review custom order');
    } finally {
      setReviewingId(null);
    }
  }

  const counts = countByStatus(items);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Custom Orders"
        description="Review customer product-link requests and prepare private accepted offers."
        meta={<AdminStatusBadge tone="info">{total} requests</AdminStatusBadge>}
        actions={
          <Button type="button" variant="outline" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <AdminCard
        title="Queue Filters"
        description="Use status links and search to find requests quickly"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Link
                key={filter.value}
                to={filter.value === 'ALL' ? '?' : `?status=${filter.value}`}
                onClick={(event) => {
                  event.preventDefault();
                  updateFilter({ status: filter.value });
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition ${
                  status === filter.value
                    ? 'border-[#d9a441] bg-[#fff7df] text-[#8a5a10]'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent'
                }`}
              >
                {filter.label}
                <AdminCountBadge
                  count={filter.value === 'ALL' ? total : (counts[filter.value] ?? 0)}
                />
              </Link>
            ))}
          </div>

          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              updateFilter({ search: String(data.get('search') ?? '') });
            }}
          >
            <label className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                className="min-h-11 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm"
                name="search"
                defaultValue={search}
                placeholder="Search customer, phone, URL, or note"
              />
            </label>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>
      </AdminCard>

      {error ? <AdminError message={error} onRetry={() => load()} /> : null}
      {loading ? <AdminLoading message="Loading custom orders" /> : null}

      {!loading && !error ? (
        <AdminCard
          title="Requests"
          description={`${total} matching custom order request${total === 1 ? '' : 's'}`}
        >
          {items.length === 0 ? <AdminEmpty message="No custom order requests found" /> : null}
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <CustomOrderAdminCard
                key={item.id}
                item={item}
                reviewing={reviewingId === item.id}
                onReview={review}
              />
            ))}
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
}

function CustomOrderAdminCard({
  item,
  reviewing,
  onReview,
}: {
  item: CustomOrderRequest;
  reviewing: boolean;
  onReview: (
    id: string,
    event: FormEvent<HTMLFormElement>,
    status: 'ACCEPTED' | 'REJECTED',
  ) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full shrink-0 sm:w-36">
          {item.customerImageUrl ? (
            <img
              src={item.customerImageUrl}
              alt=""
              className="aspect-square w-full rounded-xl object-cover"
            />
          ) : (
            <div className="grid aspect-square w-full place-items-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
              <PackageSearch className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AdminStatusBadge value={item.status}>{STATUS_LABELS[item.status]}</AdminStatusBadge>
            <span className="text-xs font-bold text-muted-foreground">
              {new Date(item.createdAt).toLocaleString('en-US')}
            </span>
          </div>
          <div>
            <p className="text-sm font-black text-rs-ink">{item.user?.name ?? 'Customer'}</p>
            <p className="text-xs font-bold text-muted-foreground">
              {item.user?.phone ?? item.user?.email ?? 'No contact saved'}
            </p>
          </div>
          <a
            className="inline-flex max-w-full items-center gap-2 break-all text-sm font-bold text-rs-gold"
            href={item.productUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open product URL <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <Info label="Color" value={item.requestedColor || 'Not specified'} />
            <Info label="Size" value={item.requestedSize || 'Not specified'} />
            <Info label="Quantity" value={String(item.quantity)} />
          </div>
          {item.customerNote ? (
            <p className="rounded-xl bg-muted p-3 text-sm leading-6 text-muted-foreground">
              {item.customerNote}
            </p>
          ) : null}
        </div>
      </div>

      <form
        className="mt-4 grid gap-3 border-t border-border pt-4"
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          onReview(item.id, event, submitter?.value === 'REJECTED' ? 'REJECTED' : 'ACCEPTED');
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-rs-ink">
            Admin title
            <input
              className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
              name="adminTitle"
              defaultValue={item.adminTitle ?? ''}
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-rs-ink">
            Admin image
            <input
              className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
              name="adminImage"
              type="file"
              accept="image/*"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-rs-ink">
            Product price
            <input
              className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
              name="adminPriceAmount"
              defaultValue={minorToInput(item.adminPriceAmount)}
              placeholder="0.00"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-rs-ink">
            Shipping
            <input
              className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
              name="adminShippingAmount"
              defaultValue={minorToInput(item.adminShippingAmount)}
              placeholder="0.00"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-rs-ink sm:col-span-2">
            Final total
            <input
              className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
              name="adminTotalAmount"
              defaultValue={minorToInput(item.adminTotalAmount)}
              placeholder="0.00"
            />
          </label>
        </div>
        <label className="grid gap-1 text-xs font-black text-rs-ink">
          Admin note
          <textarea
            className="min-h-24 rounded-xl border border-input bg-card px-3 py-2 text-sm"
            name="adminNote"
            defaultValue={item.adminNote ?? ''}
            placeholder="Internal note or rejection reason"
          />
        </label>
        {item.adminImageUrl ? (
          <a
            className="text-xs font-bold text-rs-gold"
            href={item.adminImageUrl}
            target="_blank"
            rel="noreferrer"
          >
            Current admin image
          </a>
        ) : null}
        {item.convertedOrder ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            Converted to order {item.convertedOrder.orderNumber}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            name="reviewStatus"
            value="REJECTED"
            variant="outline"
            disabled={reviewing || Boolean(item.convertedOrderId)}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
          <Button
            type="submit"
            name="reviewStatus"
            value="ACCEPTED"
            disabled={reviewing || Boolean(item.convertedOrderId)}
          >
            {reviewing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Accept
          </Button>
        </div>
      </form>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <p className="text-[11px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold text-rs-ink">{value}</p>
    </div>
  );
}

function countByStatus(items: CustomOrderRequest[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}

function minorToInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '';
  const amount = Number(value) / 100;
  return Number.isFinite(amount) ? amount.toFixed(2) : '';
}
