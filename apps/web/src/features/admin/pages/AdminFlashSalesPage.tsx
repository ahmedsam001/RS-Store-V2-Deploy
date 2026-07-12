import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { adminApi } from '@/features/admin/api/admin-api';
import type { AdminFlashSale, AdminPaginated, AdminProduct } from '@/features/admin/api/admin-api';
import { AdminConfirmButton } from '@/features/admin/components/AdminConfirmButton';
import {
  AdminCard,
  AdminInfoItem,
  AdminPageHeader,
  AdminSoftPanel,
  AdminStatusBadge,
} from '@/features/admin/components/AdminDesign';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { AdminMobileDataCard, AdminMobileField } from '@/features/admin/components/AdminMobileList';
import { AdminEmpty, AdminLoading } from '@/features/admin/components/AdminState';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { useAuth } from '@/features/auth';

type FlashSaleFilters = {
  page: number;
  status: string;
  search: string;
  startsFrom: string;
  endsTo: string;
};

export function AdminFlashSalesPage() {
  const { csrfToken } = useAuth();
  const [salePage, setSalePage] = useState<AdminPaginated<AdminFlashSale> | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [filters, setFilters] = useState<FlashSaleFilters>({
    page: 1,
    status: '',
    search: '',
    startsFrom: '',
    endsTo: '',
  });
  const [productPickerSearch, setProductPickerSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isAddingProducts, setIsAddingProducts] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const sales = salePage?.items ?? [];
  const selected = sales.find((sale) => sale.id === selectedId) ?? sales[0] ?? null;

  useEffect(() => {
    setSelectedProductIds(new Set());
    setProductPickerSearch('');
  }, [selected?.id]);

  const groupedProducts = useMemo(() => {
    const query = productPickerSearch.trim().toLowerCase();
    const filtered = query
      ? products.filter(
          (p) =>
            p.nameAr.toLowerCase().includes(query) || (p.sku?.toLowerCase() ?? '').includes(query),
        )
      : products;
    const sorted = [...filtered].sort((a, b) => b.id.localeCompare(a.id));
    const map = new Map<string | null, { label: string; items: AdminProduct[] }>();
    for (const product of sorted) {
      const key = product.category?.id ?? product.categoryId ?? null;
      const label = product.category?.nameAr ?? product.category?.nameEn ?? 'Uncategorized';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(product);
    }
    return Array.from(map.entries());
  }, [products, productPickerSearch]);

  const attachedProductIds = useMemo(
    () => new Set(selected?.products?.map((entry) => entry.product.id) ?? []),
    [selected],
  );

  async function load(nextFilters = filters) {
    const [saleResponse, productResponse] = await Promise.all([
      adminApi.flashSalesPage(buildFlashSaleQuery(nextFilters)),
      adminApi.products('&status=ACTIVE'),
    ]);
    setSalePage(saleResponse);
    setProducts(productResponse.filter((item) => item.status === 'ACTIVE'));
    if (!saleResponse.items.some((sale) => sale.id === selectedId)) {
      setSelectedId(saleResponse.items[0]?.id ?? '');
    }
  }

  useEffect(() => {
    load().catch((err) => setNotice(toNotice(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      setNotice(null);
      await action();
      setNotice({ type: 'success', message: success });
      await load();
    } catch (err) {
      setNotice(toNotice(err));
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(
      () =>
        adminApi.createFlashSale(
          {
            titleAr: String(data.get('titleAr') ?? '').trim(),
            titleEn: String(data.get('titleEn') ?? '').trim() || undefined,
            discountPercent: String(data.get('discountPercent') ?? '').trim(),
            startsAt: new Date(String(data.get('startsAt') ?? '')).toISOString(),
            endsAt: new Date(String(data.get('endsAt') ?? '')).toISOString(),
            status: String(data.get('status') ?? 'SCHEDULED'),
          },
          { csrfToken },
        ),
      'Flash sale created',
    );
    form.reset();
    setCreateOpen(false);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    await run(
      () =>
        adminApi.updateFlashSale(
          selected.id,
          {
            titleAr: String(data.get('titleAr') ?? '').trim(),
            titleEn: String(data.get('titleEn') ?? '').trim() || null,
            discountPercent: String(data.get('discountPercent') ?? '').trim(),
            startsAt: new Date(String(data.get('startsAt') ?? '')).toISOString(),
            endsAt: new Date(String(data.get('endsAt') ?? '')).toISOString(),
            status: String(data.get('status') ?? selected.status),
          },
          { csrfToken },
        ),
      'Flash sale updated',
    );
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextFilters: FlashSaleFilters = {
      page: 1,
      status: String(data.get('status') ?? ''),
      search: String(data.get('search') ?? ''),
      startsFrom: String(data.get('startsFrom') ?? ''),
      endsTo: String(data.get('endsTo') ?? ''),
    };
    setFilters(nextFilters);
    await load(nextFilters);
  }

  async function goToPage(page: number) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    await load(nextFilters);
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function handleAddSelectedProducts() {
    if (!selected || selectedProductIds.size === 0) return;
    setIsAddingProducts(true);
    try {
      await Promise.all(
        Array.from(selectedProductIds).map((productId) =>
          adminApi.addFlashSaleProduct(selected.id, productId, { csrfToken }),
        ),
      );
      setNotice({
        type: 'success',
        message: `${selectedProductIds.size} product(s) added to sale`,
      });
      setSelectedProductIds(new Set());
      setProductPickerSearch('');
      await load();
    } catch (err) {
      setNotice(toNotice(err));
    } finally {
      setIsAddingProducts(false);
    }
  }

  if (!salePage) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Flash Sales"
        title="Flash Sales"
        description="Create flash sales linked to published products with discount and clear timing for customers"
        actions={
          <Button
            variant="outline"
            type="button"
            onClick={() => load().catch((err) => setNotice(toNotice(err)))}
          >
            Refresh
          </Button>
        }
      />
      <AdminFeedback notice={notice} />

      <AdminCard
        title="Find flash sales"
        description="Keep the daily screen light. Dates are hidden until you need advanced filtering."
        actions={
          <Button type="button" onClick={() => setCreateOpen((open) => !open)}>
            {createOpen ? 'Close New Sale' : 'New Flash Sale'}
          </Button>
        }
      >
        <form className="grid gap-3" onSubmit={applyFilters}>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto] md:items-end">
            <Input
              name="search"
              placeholder="Search sale product or SKU"
              defaultValue={filters.search}
            />
            <Select name="status" defaultValue={filters.status}>
              <option value="">All statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdvancedFiltersOpen((open) => !open)}
            >
              {advancedFiltersOpen ? 'Hide Dates' : 'Date Filters'}
            </Button>
            <Button type="submit">Search</Button>
          </div>
          {advancedFiltersOpen ? (
            <div className="admin-soft-panel grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                Starts from
                <Input name="startsFrom" type="datetime-local" defaultValue={filters.startsFrom} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                Ends before
                <Input name="endsTo" type="datetime-local" defaultValue={filters.endsTo} />
              </label>
            </div>
          ) : null}
        </form>
      </AdminCard>

      {createOpen ? (
        <AdminCard
          title="New Flash Sale"
          description="Step 1: create the sale. Step 2: choose products from the selected sale panel."
        >
          <form className="grid gap-4" onSubmit={handleCreate}>
            <AdminSoftPanel className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                Sale name
                <Input name="titleAr" placeholder="Weekend flash sale" required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                English name optional
                <Input name="titleEn" placeholder="Optional customer-facing title" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                Discount percent
                <Input
                  name="discountPercent"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="20"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                Status
                <Select name="status" defaultValue="SCHEDULED">
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </Select>
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                Starts at
                <Input name="startsAt" type="datetime-local" required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#241611]">
                Ends at
                <Input name="endsAt" type="datetime-local" required />
              </label>
            </AdminSoftPanel>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Flash Sale</Button>
            </div>
          </form>
        </AdminCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <AdminCard
          title="Sales"
          description={`${salePage.meta.total} sale · page ${salePage.meta.page} of ${salePage.meta.totalPages || 1}`}
          contentClassName="grid gap-3"
        >
          {sales.length === 0 ? <AdminEmpty message="No sales found" /> : null}
          {sales.map((sale) => (
            <FlashSaleCard
              key={sale.id}
              sale={sale}
              selected={selected?.id === sale.id}
              onSelect={() => setSelectedId(sale.id)}
            />
          ))}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!salePage.meta.hasPreviousPage}
              onClick={() =>
                goToPage(Math.max(1, filters.page - 1)).catch((err) => setNotice(toNotice(err)))
              }
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-muted-foreground">
              {salePage.meta.page} / {salePage.meta.totalPages || 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!salePage.meta.hasNextPage}
              onClick={() => goToPage(filters.page + 1).catch((err) => setNotice(toNotice(err)))}
            >
              Next
            </Button>
          </div>
        </AdminCard>

        {selected ? (
          <AdminCard
            title="Selected Sale"
            description="Daily actions stay visible. Full edit inputs are collapsed until needed."
            contentClassName="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <AdminInfoItem label="Customer state" value={liveStateLabel(selected)} />
              <AdminInfoItem label="Discount" value={`${String(selected.discountPercent)}%`} />
              <AdminInfoItem label="Products" value={String(selected.products?.length ?? 0)} />
            </div>

            <AdminSoftPanel className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  size="sm"
                  type="button"
                  onClick={() =>
                    run(
                      () =>
                        adminApi.updateFlashSale(selected.id, { status: 'ACTIVE' }, { csrfToken }),
                      'Sale activated',
                    )
                  }
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    run(
                      () =>
                        adminApi.updateFlashSale(selected.id, { status: 'PAUSED' }, { csrfToken }),
                      'Sale paused',
                    )
                  }
                >
                  Pause
                </Button>
                <AdminConfirmButton
                  size="sm"
                  variant="outline"
                  type="button"
                  message="Delete sale completely?"
                  onClick={() =>
                    run(() => adminApi.deleteFlashSale(selected.id, { csrfToken }), 'Sale deleted')
                  }
                >
                  Delete Sale
                </AdminConfirmButton>
              </div>
              <p className="text-xs font-bold text-muted-foreground">
                Flash Sale keeps priority over normal product discount. Linked products will show
                this sale price while the sale is active.
              </p>
            </AdminSoftPanel>

            <details className="admin-disclosure">
              <summary>Edit sale settings</summary>
              <form className="admin-form-grid pt-3" onSubmit={handleUpdate} key={selected.id}>
                <Input
                  name="titleAr"
                  placeholder="Sale name"
                  defaultValue={selected.titleAr}
                  required
                />
                <Input
                  name="titleEn"
                  placeholder="English name optional"
                  defaultValue={selected.titleEn ?? ''}
                />
                <Input
                  name="discountPercent"
                  inputMode="decimal"
                  dir="ltr"
                  defaultValue={String(selected.discountPercent)}
                  required
                />
                <Input
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(selected.startsAt)}
                  required
                />
                <Input
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(selected.endsAt)}
                  required
                />
                <Select name="status" defaultValue={selected.status}>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
                <Button type="submit">Update Sale</Button>
              </form>
            </details>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-extrabold text-[#241611]">Add products to sale</h3>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedProductIds.size} selected
                </span>
              </div>
              <Input
                placeholder="Search products by name or SKU"
                value={productPickerSearch}
                onChange={(event) => setProductPickerSearch(event.target.value)}
              />
              <div className="max-h-[360px] overflow-y-auto space-y-4 admin-scrollbar">
                {groupedProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products found</p>
                ) : (
                  groupedProducts.map(([key, group]) => (
                    <div key={key ?? 'uncategorized'}>
                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
                        {group.label}
                      </p>
                      <div className="grid gap-2">
                        {group.items.map((product) => {
                          const isAttached = attachedProductIds.has(product.id);
                          const isChecked = selectedProductIds.has(product.id);
                          const primaryImage =
                            product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
                          return (
                            <label
                              key={product.id}
                              className={`flex items-center gap-3 rounded-xl border bg-card p-2 transition ${
                                isAttached
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'cursor-pointer hover:border-[#c7831e]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#c7831e]"
                                checked={isChecked}
                                disabled={isAttached}
                                onChange={() => !isAttached && toggleProductSelection(product.id)}
                              />
                              <ImageWithFallback
                                src={primaryImage?.secureUrl}
                                alt={product.nameAr}
                                className="h-10 w-10 rounded-lg object-cover"
                                fallbackVariant="product"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  data-no-admin-translate
                                  className="text-sm font-black text-[#241611] truncate"
                                >
                                  {product.nameAr}
                                </p>
                                <p
                                  data-no-admin-translate
                                  className="text-xs text-muted-foreground truncate"
                                  dir="ltr"
                                >
                                  {product.sku ?? '-'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <span className="line-through">
                                    {formatBaseProductPrice(product)}
                                  </span>{' '}
                                  <span className="font-black text-[#ff3f6c]">
                                    {formatSalePrice(product, selected)}
                                  </span>
                                </p>
                              </div>
                              {isAttached && (
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                  Already added
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {selectedProductIds.size > 0 && (
                <Button
                  type="button"
                  onClick={handleAddSelectedProducts}
                  disabled={isAddingProducts}
                >
                  {isAddingProducts
                    ? 'Adding...'
                    : `Add ${selectedProductIds.size} selected product(s) to sale`}
                </Button>
              )}
            </div>

            <div className="grid gap-3">
              {selected.products?.length ? (
                selected.products.map((entry) => (
                  <div
                    key={entry.product.id}
                    className="admin-list-card grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <strong data-no-admin-translate className="text-[#241611]">
                        {entry.product.nameAr}
                      </strong>
                      <p className="text-sm text-muted-foreground">
                        <span className="line-through">
                          {formatBaseProductPrice(entry.product)}
                        </span>{' '}
                        <span className="font-black text-[#ff3f6c]">
                          {formatSalePrice(entry.product, selected)}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        run(
                          () =>
                            adminApi.removeFlashSaleProduct(selected.id, entry.product.id, {
                              csrfToken,
                            }),
                          'Product removed from sale',
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <AdminEmpty message="No products selected yet" />
              )}
            </div>
          </AdminCard>
        ) : null}
      </div>
    </div>
  );
}

function FlashSaleCard({
  sale,
  selected,
  onSelect,
}: {
  sale: AdminFlashSale;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <AdminMobileDataCard
      title={sale.titleAr}
      badge={<AdminStatusBadge value={sale.status}>{liveStateLabel(sale)}</AdminStatusBadge>}
      meta={`From ${formatDate(sale.startsAt)} to ${formatDate(sale.endsAt)}`}
      selected={selected}
      onClick={onSelect}
      ariaLabel={`Select sale ${sale.titleAr}`}
    >
      <AdminMobileField label="Discount" value={`${String(sale.discountPercent)}%`} />
      <AdminMobileField label="Products" value={String(sale.products?.length ?? 0)} />
      <AdminMobileField label="Status" value={liveStateLabel(sale)} />
    </AdminMobileDataCard>
  );
}

function buildFlashSaleQuery(filters: FlashSaleFilters): string {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', '20');
  if (filters.status) params.set('status', filters.status);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.startsFrom) params.set('startsFrom', new Date(filters.startsFrom).toISOString());
  if (filters.endsTo) params.set('endsTo', new Date(filters.endsTo).toISOString());
  return params.toString();
}

function liveStateLabel(sale: AdminFlashSale): string {
  const now = Date.now();
  const starts = new Date(sale.startsAt).getTime();
  const ends = new Date(sale.endsAt).getTime();
  if (sale.status === 'EXPIRED') return 'Expired';
  if (sale.status !== 'ACTIVE') return sale.status;
  if (starts > now) return 'Scheduled';
  if (ends <= now) return 'Expired';
  return 'Visible to customers';
}
function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US');
}
function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function formatMoney(amount: string | number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number(amount) / 100,
  );
}
function getDisplayAmount(product: AdminProduct): number {
  const variantAmounts = (product.variants ?? [])
    .map((variant) => Number(variant.priceAmount ?? product.priceAmount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  return variantAmounts.length ? Math.min(...variantAmounts) : Number(product.priceAmount);
}
function formatBaseProductPrice(product: AdminProduct): string {
  return formatMoney(getDisplayAmount(product), product.currency);
}
function formatSalePrice(product: AdminProduct, sale: AdminFlashSale): string {
  const amount = Math.max(
    0,
    Math.floor((getDisplayAmount(product) * (100 - Number(sale.discountPercent))) / 100),
  );
  return formatMoney(amount, product.currency);
}
