import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import {
  AdminAvailableSheinOrderItem,
  AdminPaginated,
  adminApi,
} from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminInfoItem,
  AdminMetricCard,
  AdminPageHeader,
  AdminSoftPanel,
} from '@/features/admin/components/AdminDesign';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { AdminEmpty, AdminLoading } from '@/features/admin/components/AdminState';
import { AdminPagination } from '@/features/admin/components/AdminPagination';
import { useAuth } from '@/features/auth/AuthContext';
import { PATHS } from '@/shared/constants/routes';

type WizardStep = 1 | 2 | 3 | 4;

type CreateFormState = {
  title: string;
  sheinOrderReference: string;
  trackingNumber: string;
  trackingCarrier: string;
  trackingUrl: string;
  exchangeRateSarToEgp: string;
  notes: string;
};

const STEPS: Array<{ id: WizardStep; label: string; description: string }> = [
  { id: 1, label: 'Select ready items', description: 'Choose approved-deposit products' },
  { id: 2, label: 'Review SAR prices', description: 'Auto-filled from SHEIN import' },
  { id: 3, label: 'Review totals', description: 'Check SAR and EGP before creating' },
  { id: 4, label: 'Create batch', description: 'Save the SHEIN purchase group' },
];

function getSheinBatchStatusGroupForStatus(status?: string) {
  switch (status) {
    case 'ORDERED_FROM_SHEIN':
      return 'ORDERED';
    case 'SHIPPING':
    case 'CUSTOMS':
    case 'ARRIVED_EGYPT':
      return 'IN_SHIPPING';
    case 'ARRIVED_STORE':
    case 'READY_FOR_PICKUP':
      return 'ARRIVED_SHOP';
    case 'DELIVERED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'DRAFT':
    default:
      return 'COLLECTING';
  }
}

export function AdminSheinBatchCreatePage() {
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [availableItems, setAvailableItems] =
    useState<AdminPaginated<AdminAvailableSheinOrderItem> | null>(null);
  const [availableSearch, setAvailableSearch] = useState('');
  const [availablePage, setAvailablePage] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedItemsById, setSelectedItemsById] = useState<
    Record<string, AdminAvailableSheinOrderItem>
  >({});
  const [selectedItemSarAmounts, setSelectedItemSarAmounts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    title: '',
    sheinOrderReference: '',
    trackingNumber: '',
    trackingCarrier: '',
    trackingUrl: '',
    exchangeRateSarToEgp: '13.00',
    notes: '',
  });

  const readyItems = availableItems?.items ?? [];
  const availableMeta = availableItems?.meta;
  const availableShowingFrom =
    availableMeta && availableMeta.total > 0
      ? (availableMeta.page - 1) * availableMeta.limit + 1
      : 0;
  const availableShowingTo = availableMeta
    ? Math.min(availableMeta.page * availableMeta.limit, availableMeta.total)
    : 0;
  const selectedReadyItems = useMemo(
    () =>
      selectedItemIds
        .map((id) => selectedItemsById[id])
        .filter((item): item is AdminAvailableSheinOrderItem => Boolean(item)),
    [selectedItemIds, selectedItemsById],
  );

  const totals = useMemo(() => {
    const rate = Number(createForm.exchangeRateSarToEgp);
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 0;
    const totalSar = selectedReadyItems.reduce(
      (sum, item) =>
        sum +
        getUnitSarAmount(getSelectedUnitSarInput(item, selectedItemSarAmounts)) * item.quantity,
      0,
    );
    const totalEgp = totalSar * safeRate;
    const orderIds = new Set(selectedReadyItems.map((item) => item.orderId));
    const pieces = selectedReadyItems.reduce((sum, item) => sum + item.quantity, 0);
    return { totalSar, totalEgp, orderCount: orderIds.size, pieces, exchangeRate: safeRate };
  }, [createForm.exchangeRateSarToEgp, selectedItemSarAmounts, selectedReadyItems]);

  const missingPrices = selectedReadyItems.filter(
    (item) => getUnitSarAmount(getSelectedUnitSarInput(item, selectedItemSarAmounts)) <= 0,
  );
  const totalsNeedPrices = selectedReadyItems.length > 0 && totals.totalSar <= 0;
  const canGoStep2 = selectedReadyItems.length > 0;
  const canGoStep3 = canGoStep2 && missingPrices.length === 0 && totals.exchangeRate > 0;
  const canCreate = canGoStep3;

  const loadAvailableItems = useCallback(async (search: string, page: number) => {
    const query = new URLSearchParams({ page: String(page), limit: '50' });
    if (search.trim()) query.set('search', search.trim());
    const result = await adminApi.availableSheinOrderItemsPage(query.toString());
    setAvailableItems(result);
    setAvailablePage(result.meta.page);
  }, []);

  function toggleAvailableItem(item: AdminAvailableSheinOrderItem) {
    setSelectedItemIds((current) => {
      const exists = current.includes(item.id);
      if (exists) {
        setSelectedItemsById((items) => {
          const next = { ...items };
          delete next[item.id];
          return next;
        });
        setSelectedItemSarAmounts((amounts) => {
          const next = { ...amounts };
          delete next[item.id];
          return next;
        });
        return current.filter((id) => id !== item.id);
      }
      const suggestedUnitSar = getSuggestedUnitSarInput(item);
      if (suggestedUnitSar) {
        setSelectedItemSarAmounts((amounts) =>
          amounts[item.id] ? amounts : { ...amounts, [item.id]: suggestedUnitSar },
        );
      }
      setSelectedItemsById((items) => ({ ...items, [item.id]: item }));
      return [...current, item.id];
    });
  }

  function clearSelection() {
    setSelectedItemIds([]);
    setSelectedItemsById({});
    setSelectedItemSarAmounts({});
    setStep(1);
  }

  function goToStep(next: WizardStep) {
    if (next > 1 && !canGoStep2) {
      setNotice({ type: 'error', message: 'Select at least one ready item first' });
      return;
    }
    if (next > 2 && !canGoStep3) {
      setNotice({
        type: 'error',
        message: 'Review or add a valid Unit SAR for every selected item and a valid exchange rate',
      });
      return;
    }
    setStep(next);
  }

  async function createBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      setNotice({
        type: 'error',
        message: 'Complete selected items prices and exchange rate before creating the batch',
      });
      return;
    }

    try {
      const created = await adminApi.createSheinBatch(
        {
          title: createForm.title || undefined,
          sheinOrderReference: createForm.sheinOrderReference || undefined,
          trackingNumber: createForm.trackingNumber || undefined,
          trackingCarrier: createForm.trackingCarrier || undefined,
          trackingUrl: createForm.trackingUrl || undefined,
          exchangeRateSarToEgp: createForm.exchangeRateSarToEgp || '0',
          notes: createForm.notes || undefined,
          items: selectedReadyItems.map((item) => ({
            orderItemId: item.id,
            unitSarAmount: getSelectedUnitSarInput(item, selectedItemSarAmounts),
          })),
        },
        { csrfToken },
      );
      setNotice({
        type: 'success',
        message: `${created.batchCode} created with ${selectedReadyItems.length} item(s)`,
      });
      const params = new URLSearchParams({
        statusGroup: getSheinBatchStatusGroupForStatus(created.status),
        batchId: created.id,
      });
      navigate(`${PATHS.adminSheinBatches}?${params.toString()}`);
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  useEffect(() => {
    loadAvailableItems('', 1).catch((error) => setNotice(toNotice(error)));
  }, [loadAvailableItems]);

  if (!availableItems) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="SHEIN Operations"
        title="Create New SHEIN Batch"
        description="A simple four-step wizard for selecting ready items, reviewing imported SHEIN SAR prices, checking SAR/EGP totals, and creating one internal SHEIN purchase batch."
        actions={
          <Button asChild variant="outline">
            <Link to={PATHS.adminSheinBatches}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Batches
            </Link>
          </Button>
        }
      />
      <AdminFeedback notice={notice} />

      <section className="grid gap-3 md:grid-cols-4">
        <AdminMetricCard
          title="Selected orders"
          value={totals.orderCount}
          icon={ClipboardList}
          hint="Unique customer orders"
          tone="info"
        />
        <AdminMetricCard
          title="Selected pieces"
          value={totals.pieces}
          icon={PackageCheck}
          hint="Total product quantity"
          tone="gold"
        />
        <AdminMetricCard
          title="Total SAR"
          value={totalsNeedPrices ? 'Pending' : formatMajorMoney(totals.totalSar, 'SAR')}
          icon={CircleDollarSign}
          hint={totalsNeedPrices ? 'Enter SAR prices in Step 2' : 'SHEIN cost'}
          tone={totalsNeedPrices ? 'gold' : 'success'}
        />
        <AdminMetricCard
          title="Total EGP"
          value={totalsNeedPrices ? 'Pending' : formatMajorMoney(totals.totalEgp, 'EGP')}
          icon={CircleDollarSign}
          hint={totalsNeedPrices ? 'Enter SAR prices in Step 2' : 'SAR × exchange rate'}
          tone={totalsNeedPrices ? 'gold' : 'success'}
        />
      </section>

      <AdminCard
        title="Batch creation steps"
        description="Move step by step so the admin always knows what to do next"
      >
        <div className="grid gap-2 md:grid-cols-4">
          {STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToStep(item.id)}
              className={`rounded-2xl border p-3 text-left transition ${step === item.id ? 'border-[#c7831e] bg-[#fff5df]' : step > item.id ? 'border-emerald-200 bg-emerald-50' : 'border-[#efd6c5] bg-white hover:bg-[#fffaf3]'}`}
            >
              <span className="flex items-center gap-2 text-sm font-black text-[#241611]">
                {step > item.id ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
                Step {item.id} · {item.label}
              </span>
              <span className="mt-1 block text-xs font-bold text-muted-foreground">
                {item.description}
              </span>
            </button>
          ))}
        </div>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {step === 1 ? (
            <AdminCard
              title="Step 1 Select ready items"
              description="Only orders with approved deposit appear here"
              contentClassName="space-y-4"
            >
              <form
                className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  loadAvailableItems(availableSearch, 1).catch((error) =>
                    setNotice(toNotice(error)),
                  );
                }}
              >
                <Input
                  value={availableSearch}
                  onChange={(event) => setAvailableSearch(event.target.value)}
                  placeholder="Search by order number customer or phone"
                />
                <Button type="submit" variant="outline">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    loadAvailableItems(availableSearch, availablePage).catch((error) =>
                      setNotice(toNotice(error)),
                    )
                  }
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Refresh
                </Button>
              </form>

              {availableMeta ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
                  <span>
                    Showing {availableShowingFrom}-{availableShowingTo} of {availableMeta.total}{' '}
                    ready item(s)
                  </span>
                  {availableSearch.trim() ? <span>Search: “{availableSearch.trim()}”</span> : null}
                </div>
              ) : null}

              {readyItems.length === 0 ? (
                <AdminEmpty message="No ready items. Orders appear here after deposit approval." />
              ) : null}
              <div className="grid gap-2">
                {readyItems.map((item) => {
                  const checked = selectedItemIds.includes(item.id);
                  return (
                    <article
                      key={item.id}
                      className="grid gap-3 rounded-2xl border border-[#efd6c5] bg-white p-3 transition hover:bg-[#fffaf3] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={checked}
                        onChange={() => toggleAvailableItem(item)}
                        aria-label={`Select ${item.productNameSnapshot}`}
                      />
                      <div className="min-w-0">
                        <p data-no-admin-translate className="text-sm font-black text-[#241611]">
                          {item.productNameSnapshot}
                        </p>
                        <p className="mt-1 text-xs font-bold text-muted-foreground">
                          <span data-no-admin-translate>{item.order.orderNumber}</span> ·{' '}
                          <span data-no-admin-translate>{item.order.customerNameSnapshot}</span> ·{' '}
                          <span data-no-admin-translate dir="ltr">{item.order.customerPhoneSnapshot}</span> · Qty{' '}
                          {item.quantity}
                        </p>
                        <ItemVariantMeta item={item} />
                        <SuggestedUnitSarNote item={item} />
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          Order {formatMinorMoney(item.order.totalAmount ?? 0, 'EGP')} · Paid{' '}
                          {formatMinorMoney(item.order.depositPaidAmount ?? 0, 'EGP')} · Remaining{' '}
                          {formatMinorMoney(item.order.remainingAmount ?? 0, 'EGP')}
                        </p>
                      </div>
                      <div className="flex md:justify-end">
                        <SheinProductButton item={item} />
                      </div>
                    </article>
                  );
                })}
              </div>

              {availableMeta && availableMeta.totalPages > 1 ? (
                <AdminPagination
                  meta={availableMeta}
                  onPageChange={(page) =>
                    loadAvailableItems(availableSearch, page).catch((error) =>
                      setNotice(toNotice(error)),
                    )
                  }
                />
              ) : null}

              <div className="flex justify-end">
                <Button type="button" disabled={!canGoStep2} onClick={() => goToStep(2)}>
                  Next Review SAR Prices
                </Button>
              </div>
            </AdminCard>
          ) : null}

          {step === 2 ? (
            <AdminCard
              title="Step 2 Review SAR prices"
              description="Unit SAR is filled from the saved SHEIN import price, and you can edit it when SHEIN changes the price"
              contentClassName="space-y-4"
            >
              <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
                <label className="grid gap-1 text-sm font-bold text-[#241611]">
                  SAR to EGP rate
                  <Input
                    value={createForm.exchangeRateSarToEgp}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        exchangeRateSarToEgp: event.target.value,
                      }))
                    }
                    placeholder="SAR to EGP rate"
                    inputMode="decimal"
                  />
                </label>
                <p className="text-sm font-semibold text-muted-foreground">
                  The exchange rate is saved inside the batch so old batch totals stay stable if the
                  rate changes later.
                </p>
              </div>

              <div className="grid gap-2">
                {selectedReadyItems.map((item) => {
                  const unitSar = getUnitSarAmount(
                    getSelectedUnitSarInput(item, selectedItemSarAmounts),
                  );
                  const lineSar = unitSar * item.quantity;
                  return (
                    <article
                      key={item.id}
                      className="grid gap-3 rounded-2xl border border-[#efd6c5] bg-white p-3 md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-center"
                    >
                      <div className="min-w-0">
                        <p data-no-admin-translate className="text-sm font-black text-[#241611]">
                          {item.productNameSnapshot}
                        </p>
                        <p className="text-xs font-bold text-muted-foreground">
                          <span data-no-admin-translate>{item.order.orderNumber}</span> ·{' '}
                          <span data-no-admin-translate>{item.order.customerNameSnapshot}</span> · Qty{' '}
                          {item.quantity}
                        </p>
                        <ItemVariantMeta item={item} />
                        <div className="mt-2">
                          <SheinProductButton item={item} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Input
                          value={getSelectedUnitSarInput(item, selectedItemSarAmounts)}
                          onChange={(event) =>
                            setSelectedItemSarAmounts((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Unit SAR"
                          inputMode="decimal"
                        />
                        <SuggestedUnitSarNote item={item} />
                      </div>
                      <div className="text-sm font-bold text-[#5f4638] md:text-right">
                        <strong className="block text-[#241611]">
                          {formatMajorMoney(lineSar, 'SAR')}
                        </strong>
                        <span>{formatMajorMoney(lineSar * totals.exchangeRate, 'EGP')}</span>
                      </div>
                    </article>
                  );
                })}
              </div>

              {missingPrices.length > 0 ? (
                <AdminSoftPanel className="text-sm font-bold text-[#7a4a12]">
                  {missingPrices.length} selected item(s) still need a valid Unit SAR amount because
                  no saved SHEIN import price was found.
                </AdminSoftPanel>
              ) : null}

              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" disabled={!canGoStep3} onClick={() => goToStep(3)}>
                  Next Review Totals
                </Button>
              </div>
            </AdminCard>
          ) : null}

          {step === 3 ? (
            <AdminCard
              title="Step 3 Review SAR and EGP totals"
              description="Confirm the selected products and financial totals before saving"
              contentClassName="space-y-4"
            >
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdminInfoItem label="Orders" value={totals.orderCount} />
                <AdminInfoItem label="Pieces" value={totals.pieces} />
                <AdminInfoItem label="Total SAR" value={formatMajorMoney(totals.totalSar, 'SAR')} />
                <AdminInfoItem label="Total EGP" value={formatMajorMoney(totals.totalEgp, 'EGP')} />
              </section>

              <div className="grid gap-2">
                {selectedReadyItems.map((item) => {
                  const unitSar = getUnitSarAmount(
                    getSelectedUnitSarInput(item, selectedItemSarAmounts),
                  );
                  const lineSar = unitSar * item.quantity;
                  return (
                    <div
                      key={item.id}
                      className="grid gap-2 rounded-2xl border border-[#efd6c5] bg-white p-3 text-sm md:grid-cols-[minmax(0,1fr)_120px_150px_150px] md:items-center"
                    >
                      <div className="min-w-0">
                        <p data-no-admin-translate className="font-black text-[#241611]">{item.productNameSnapshot}</p>
                        <p className="text-xs font-bold text-muted-foreground">
                          <span data-no-admin-translate>{item.order.orderNumber}</span> ·{' '}
                          <span data-no-admin-translate>{item.order.customerNameSnapshot}</span>
                        </p>
                        <ItemVariantMeta item={item} />
                        <div className="mt-2">
                          <SheinProductButton item={item} />
                        </div>
                      </div>
                      <span className="font-bold text-muted-foreground">Qty {item.quantity}</span>
                      <span className="font-black text-[#241611]">
                        {formatMajorMoney(lineSar, 'SAR')}
                      </span>
                      <span className="font-black text-[#241611]">
                        {formatMajorMoney(lineSar * totals.exchangeRate, 'EGP')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" onClick={() => goToStep(4)}>
                  Next Create Batch
                </Button>
              </div>
            </AdminCard>
          ) : null}

          {step === 4 ? (
            <AdminCard
              title="Step 4 Create batch"
              description="Add optional references and create the internal SHEIN purchase group"
              contentClassName="space-y-4"
            >
              <form className="space-y-4" onSubmit={createBatch}>
                <section className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={createForm.title}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Batch title optional"
                  />
                  <Input
                    value={createForm.sheinOrderReference}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        sheinOrderReference: event.target.value,
                      }))
                    }
                    placeholder="SHEIN order reference optional"
                  />
                  <Input
                    value={createForm.trackingNumber}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        trackingNumber: event.target.value,
                      }))
                    }
                    placeholder="Tracking number optional"
                  />
                  <Input
                    value={createForm.trackingCarrier}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        trackingCarrier: event.target.value,
                      }))
                    }
                    placeholder="Tracking carrier optional"
                  />
                  <Input
                    value={createForm.trackingUrl}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, trackingUrl: event.target.value }))
                    }
                    placeholder="Tracking URL optional"
                  />
                  <Input
                    value={createForm.notes}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Internal notes optional"
                  />
                </section>

                <AdminSoftPanel className="grid gap-2 text-sm font-black text-[#241611] sm:grid-cols-2 xl:grid-cols-4">
                  <span>Orders {totals.orderCount}</span>
                  <span>Pieces {totals.pieces}</span>
                  <span>Total {formatMajorMoney(totals.totalSar, 'SAR')}</span>
                  <span>Total {formatMajorMoney(totals.totalEgp, 'EGP')}</span>
                </AdminSoftPanel>

                <div className="flex flex-wrap justify-between gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={!canCreate}>
                    <Truck className="h-4 w-4" aria-hidden="true" />
                    Create Batch
                  </Button>
                </div>
              </form>
            </AdminCard>
          ) : null}
        </div>

        <SelectedItemsPanel
          selectedItems={selectedReadyItems}
          sarAmounts={selectedItemSarAmounts}
          exchangeRate={totals.exchangeRate}
          totals={totals}
          onClear={clearSelection}
          onRemove={(itemId) => toggleAvailableItem(selectedItemsById[itemId])}
        />
      </div>
    </div>
  );
}

type SelectedItemsPanelProps = {
  selectedItems: AdminAvailableSheinOrderItem[];
  sarAmounts: Record<string, string>;
  exchangeRate: number;
  totals: { totalSar: number; totalEgp: number; orderCount: number; pieces: number };
  onClear: () => void;
  onRemove: (itemId: string) => void;
};

function SelectedItemsPanel({
  selectedItems,
  sarAmounts,
  exchangeRate,
  totals,
  onClear,
  onRemove,
}: SelectedItemsPanelProps) {
  return (
    <AdminCard
      title="Selected Items"
      description="This drawer stays stable even when you search for other ready items"
      contentClassName="space-y-3"
    >
      {selectedItems.length === 0 ? <AdminEmpty message="No selected items yet" /> : null}
      {selectedItems.length > 0 ? (
        <>
          <div className="grid max-h-[560px] gap-2 overflow-auto pr-1">
            {selectedItems.map((item) => {
              const unitSar = getUnitSarAmount(getSelectedUnitSarInput(item, sarAmounts));
              const lineSar = unitSar * item.quantity;
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#efd6c5] bg-white p-3 text-xs font-bold text-[#5f4638]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p data-no-admin-translate className="text-sm font-black text-[#241611]">
                        {item.productNameSnapshot}
                      </p>
                      <p>
                        <span data-no-admin-translate>{item.order.orderNumber}</span> ·{' '}
                        <span data-no-admin-translate>{item.order.customerNameSnapshot}</span>
                      </p>
                      <p>Qty {item.quantity}</p>
                      <ItemVariantMeta item={item} />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="mt-2">
                    <SheinProductButton item={item} />
                  </div>
                  <div className="mt-2 grid gap-1 rounded-xl bg-[#fffaf3] p-2">
                    <span>Unit SAR {unitSar > 0 ? formatMajorMoney(unitSar, 'SAR') : '-'}</span>
                    <span>Total SAR {formatMajorMoney(lineSar, 'SAR')}</span>
                    <span>Total EGP {formatMajorMoney(lineSar * exchangeRate, 'EGP')}</span>
                  </div>
                </article>
              );
            })}
          </div>
          <AdminSoftPanel className="space-y-1 text-sm font-black text-[#241611]">
            <p>Orders {totals.orderCount}</p>
            <p>Pieces {totals.pieces}</p>
            <p>Total SAR {formatMajorMoney(totals.totalSar, 'SAR')}</p>
            <p>Total EGP {formatMajorMoney(totals.totalEgp, 'EGP')}</p>
          </AdminSoftPanel>
          <Button type="button" variant="outline" onClick={onClear}>
            Clear Selection
          </Button>
        </>
      ) : null}
    </AdminCard>
  );
}

function SuggestedUnitSarNote({ item }: { item: AdminAvailableSheinOrderItem }) {
  const suggested = getSuggestedUnitSarInput(item);
  if (!suggested) {
    return (
      <p className="mt-1 text-[11px] font-bold text-amber-700">
        No saved SHEIN import price for this item
      </p>
    );
  }

  return (
    <p className="mt-1 text-[11px] font-bold text-emerald-700">
      Default from SHEIN import: {formatMajorMoney(getUnitSarAmount(suggested), 'SAR')}
    </p>
  );
}

function SheinProductButton({ item }: { item: AdminAvailableSheinOrderItem }) {
  const url = getSheinProductUrl(item);
  if (!url) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        title="No SHEIN product link saved for this product"
      >
        Missing SHEIN Link
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm">
      <a href={url} target="_blank" rel="noreferrer">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        Open SHEIN Product
      </a>
    </Button>
  );
}

function ItemVariantMeta({ item }: { item: AdminAvailableSheinOrderItem }) {
  const details = getVariantDetails(item);
  if (details.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black text-[#5f4638]">
      {details.map((detail) => (
        <span
          key={`${detail.label}-${detail.value}`}
          className="rounded-full border border-[#efd6c5] bg-[#fffaf3] px-2 py-1"
        >
          {detail.label}: {detail.value}
        </span>
      ))}
    </div>
  );
}

function getSheinProductUrl(item: AdminAvailableSheinOrderItem) {
  return cleanText(item.product?.sourceSheinUrl);
}

function getVariantDetails(item: AdminAvailableSheinOrderItem) {
  const variantName = firstText(
    item.productVariantNameSnapshot,
    item.productVariant?.nameEn,
    item.productVariant?.nameAr,
  );
  const size = firstText(item.productVariantSizeSnapshot, item.productVariant?.size);
  const color = firstText(item.productVariantColorSnapshot, item.productVariant?.color);
  const sku = firstText(
    item.productVariantSkuSnapshot,
    item.productVariant?.sku,
    item.productSkuSnapshot,
  );

  return [
    { label: 'Variant', value: variantName },
    { label: 'Size', value: size },
    { label: 'Color', value: color },
    { label: 'SKU', value: sku },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));
}

function getSelectedUnitSarInput(
  item: AdminAvailableSheinOrderItem,
  amounts: Record<string, string>,
) {
  if (Object.prototype.hasOwnProperty.call(amounts, item.id)) return amounts[item.id] ?? '';
  return getSuggestedUnitSarInput(item) ?? '';
}

function getSuggestedUnitSarInput(item: AdminAvailableSheinOrderItem) {
  const numeric = Number(
    String(item.suggestedUnitSarAmount ?? '')
      .replace(/,/g, '')
      .trim(),
  );
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric.toFixed(2).replace(/\.00$/, '');
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function cleanText(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}

function getUnitSarAmount(value?: string | number | null) {
  const numeric = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim(),
  );
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function minorValue(value?: string | number | null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMinorMoney(value: string | number, currency: string) {
  const amount = minorValue(value) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMajorMoney(value: number, currency: string) {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
