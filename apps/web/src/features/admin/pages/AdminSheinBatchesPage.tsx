import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  History,
  MessageCircle,
  PackageCheck,
  PlusCircle,
  RefreshCw,
  Search,
  StickyNote,
  Truck,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import {
  AdminPaginated,
  AdminReports,
  AdminSheinBatch,
  AdminSheinBatchItem,
  OrderItemStatus,
  SheinBatchStatus,
  SheinBatchStatusGroup,
  adminApi,
} from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminCountBadge,
  AdminFilterBar,
  AdminInfoItem,
  AdminMetricCard,
  AdminPageHeader,
  AdminSoftPanel,
  AdminStatusBadge,
  CustomerWhatsappButton,
  labelBatchStatus,
  labelOrderItemStatus,
} from '@/features/admin/components/AdminDesign';
import { AdminConfirmationDialog } from '@/features/admin/components/AdminConfirmationDialog';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { AdminPagination } from '@/features/admin/components/AdminPagination';
import { AdminEmpty, AdminLoading } from '@/features/admin/components/AdminState';
import {
  readSetting,
  settingsApi,
  type StorefrontSettings,
} from '@/features/settings/settings-api';
import { PATHS } from '@/shared/constants/routes';

const SHEIN_BATCH_STATUSES: SheinBatchStatus[] = [
  'DRAFT',
  'ORDERED_FROM_SHEIN',
  'SHIPPING',
  'CUSTOMS',
  'ARRIVED_EGYPT',
  'ARRIVED_STORE',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'CANCELLED',
];

const STATUS_LABELS: Record<SheinBatchStatus, string> = {
  DRAFT: labelBatchStatus('DRAFT'),
  ORDERED_FROM_SHEIN: labelBatchStatus('ORDERED_FROM_SHEIN'),
  SHIPPING: labelBatchStatus('SHIPPING'),
  CUSTOMS: labelBatchStatus('CUSTOMS'),
  ARRIVED_EGYPT: labelBatchStatus('ARRIVED_EGYPT'),
  ARRIVED_STORE: labelBatchStatus('ARRIVED_STORE'),
  READY_FOR_PICKUP: labelBatchStatus('READY_FOR_PICKUP'),
  DELIVERED: labelBatchStatus('DELIVERED'),
  CANCELLED: labelBatchStatus('CANCELLED'),
};

const ORDER_ITEM_STATUSES: OrderItemStatus[] = [
  'PENDING',
  'SHEIN',
  'KUWAIT',
  'CUSTOMS',
  'EGYPT',
  'SHOP',
  'CANCELLED',
];

const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  PENDING: labelOrderItemStatus('PENDING'),
  SHEIN: labelOrderItemStatus('SHEIN'),
  KUWAIT: labelOrderItemStatus('KUWAIT'),
  CUSTOMS: labelOrderItemStatus('CUSTOMS'),
  EGYPT: labelOrderItemStatus('EGYPT'),
  SHOP: labelOrderItemStatus('SHOP'),
  CANCELLED: labelOrderItemStatus('CANCELLED'),
};

const BATCH_TO_ITEM_STATUS: Record<SheinBatchStatus, OrderItemStatus> = {
  DRAFT: 'PENDING',
  ORDERED_FROM_SHEIN: 'SHEIN',
  SHIPPING: 'KUWAIT',
  CUSTOMS: 'CUSTOMS',
  ARRIVED_EGYPT: 'EGYPT',
  ARRIVED_STORE: 'SHOP',
  READY_FOR_PICKUP: 'SHOP',
  DELIVERED: 'SHOP',
  CANCELLED: 'PENDING',
};

const NEXT_BATCH_STATUS: Partial<Record<SheinBatchStatus, SheinBatchStatus>> = {
  DRAFT: 'ORDERED_FROM_SHEIN',
  ORDERED_FROM_SHEIN: 'SHIPPING',
  SHIPPING: 'CUSTOMS',
  CUSTOMS: 'ARRIVED_EGYPT',
  ARRIVED_EGYPT: 'ARRIVED_STORE',
  ARRIVED_STORE: 'READY_FOR_PICKUP',
  READY_FOR_PICKUP: 'DELIVERED',
};

const BATCH_TABS: Array<{
  id: SheinBatchStatusGroup;
  label: string;
  description: string;
}> = [
  {
    id: 'COLLECTING',
    label: 'Collecting',
    description: 'Batches being prepared before SHEIN purchase',
  },
  { id: 'ORDERED', label: 'Ordered', description: 'Purchased and waiting shipment' },
  {
    id: 'IN_SHIPPING',
    label: 'In Shipping',
    description: 'Shipping customs and Egypt arrival tracking',
  },
  {
    id: 'ARRIVED_SHOP',
    label: 'Arrived Shop',
    description: 'Arrived and ready for customer delivery',
  },
  { id: 'COMPLETED', label: 'Completed', description: 'Delivered and closed batches' },
  { id: 'CANCELLED', label: 'Cancelled', description: 'Cancelled batches' },
];

const DETAIL_TABS: Array<{
  id: DetailTab;
  label: string;
  description: string;
}> = [
  { id: 'OVERVIEW', label: 'Overview', description: 'Main action totals tracking and timeline' },
  { id: 'ORDERS', label: 'Orders', description: 'Customer orders payments and balances' },
  { id: 'TRACKING', label: 'Tracking', description: 'Products and item movement' },
  { id: 'DELIVERY', label: 'Delivery', description: 'Deliver ready customer orders' },
  { id: 'NOTES', label: 'Notes', description: 'Internal admin notes' },
];

const BATCH_PROGRESS: SheinBatchStatus[] = [
  'DRAFT',
  'ORDERED_FROM_SHEIN',
  'SHIPPING',
  'CUSTOMS',
  'ARRIVED_EGYPT',
  'ARRIVED_STORE',
  'READY_FOR_PICKUP',
  'DELIVERED',
];

type BatchFilters = {
  search: string;
  statusGroup: SheinBatchStatusGroup;
  page: number;
};

type DetailTab = 'OVERVIEW' | 'ORDERS' | 'TRACKING' | 'DELIVERY' | 'NOTES';

type ConfirmAction = {
  title: string;
  message: string;
  details?: string[];
  confirmLabel?: string;
  tone?: 'danger' | 'warning';
  onConfirm: () => Promise<void> | void;
};

type BatchOrderSummary = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status?: string;
  paymentStatus?: string;
  totalAmount?: string | number | null;
  depositPaidAmount?: string | number | null;
  finalPaidAmount?: string | number | null;
  finalAmountDue?: string | number | null;
  remainingAmount?: string | number | null;
  items: AdminSheinBatchItem[];
};

export function AdminSheinBatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState<AdminPaginated<AdminSheinBatch> | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [selected, setSelected] = useState<AdminSheinBatch | null>(null);
  const [filters, setFilters] = useState<BatchFilters>(() =>
    getBatchFiltersFromSearchParams(searchParams),
  );
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [statusForm, setStatusForm] = useState<{ status: SheinBatchStatus; note: string }>({
    status: 'DRAFT',
    note: '',
  });
  const [detailTab, setDetailTab] = useState<DetailTab>('OVERVIEW');
  const [notesForm, setNotesForm] = useState('');
  const [trackingForm, setTrackingForm] = useState({
    sheinOrderReference: '',
    trackingNumber: '',
    trackingCarrier: '',
    trackingUrl: '',
  });
  const [itemStatusForms, setItemStatusForms] = useState<Record<string, OrderItemStatus>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);

  const batches = response?.items ?? [];
  const activeTab = BATCH_TABS.find((tab) => tab.id === filters.statusGroup) ?? BATCH_TABS[0];
  const selectedOrders = useMemo(() => groupBatchOrders(selected?.items ?? []), [selected]);
  const selectedPayments = useMemo(() => buildPaymentSummary(selectedOrders), [selectedOrders]);
  const selectedDistribution = useMemo(
    () => buildDistributionSummary(selectedOrders),
    [selectedOrders],
  );
  const adminWhatsappNumber = readSetting(settings, 'store.whatsapp', '');
  const sheinLinksWhatsappUrl = selected
    ? buildSheinLinksWhatsappUrl(selected, adminWhatsappNumber)
    : null;

  async function load(next = filters, autoSelect = false) {
    const nextResponse = await adminApi.sheinBatchesPage(buildBatchQuery(next));
    setResponse(nextResponse);
    if (autoSelect && nextResponse.items[0]) {
      await selectBatch(nextResponse.items[0].id);
    }
    return nextResponse;
  }

  async function loadBadgeCounts() {
    setReports(await adminApi.reports());
  }

  async function selectBatch(id: string) {
    const batch = await adminApi.sheinBatch(id);
    setSelected(batch);
    setStatusForm({ status: batch.status, note: '' });
    setNotesForm(batch.notes ?? '');
    setTrackingForm({
      sheinOrderReference: batch.sheinOrderReference ?? '',
      trackingNumber: batch.trackingNumber ?? '',
      trackingCarrier: batch.trackingCarrier ?? '',
      trackingUrl: batch.trackingUrl ?? '',
    });
    setItemStatusForms(buildItemStatusForms(batch.items ?? []));
    setDetailTab('OVERVIEW');
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice({ type: 'success', message: success });
      await load();
      await loadBadgeCounts();
      if (selected) await selectBatch(selected.id);
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  function syncUrl(next: BatchFilters, batchId?: string) {
    const params = buildBatchUrlSearchParams(next);
    if (batchId) params.set('batchId', batchId);
    setSearchParams(params);
  }

  async function selectBatchAndSync(id: string) {
    syncUrl(filters, id);
    await selectBatch(id);
  }

  async function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    syncUrl(next);
    setSelected(null);
    await load(next);
  }

  async function changeTab(statusGroup: SheinBatchStatusGroup) {
    const next = { ...filters, statusGroup, page: 1 };
    setFilters(next);
    syncUrl(next);
    setSelected(null);
    await load(next);
  }

  function confirmBatchStatusUpdate(nextStatus: SheinBatchStatus, note?: string) {
    if (!selected) return;
    const itemStatus = BATCH_TO_ITEM_STATUS[nextStatus];
    const finalPaymentMayOpen = itemStatus === 'SHOP';
    const isCancel = nextStatus === 'CANCELLED';
    const activeItemsCount = countActiveBatchItems(selected);
    const customerOrdersCount = selectedOrders.length;

    setConfirmAction({
      title: isCancel ? 'Cancel this SHEIN batch?' : `Move batch to ${STATUS_LABELS[nextStatus]}?`,
      message: finalPaymentMayOpen
        ? `This action will update ${activeItemsCount} item(s) and may open final payment for customer orders.`
        : `This action will update ${activeItemsCount} non-cancelled item(s) in this batch.`,
      details: [
        `Batch: ${selected.batchCode}`,
        `Customer orders affected: ${customerOrdersCount}`,
        `Item tracking will sync to: ${ORDER_ITEM_STATUS_LABELS[itemStatus]}`,
        finalPaymentMayOpen
          ? 'Orders whose items reached the shop may move to Waiting Final Payment.'
          : 'Final payment will not be opened by this step.',
        isCancel
          ? 'Cancelled batches cannot continue the normal tracking flow.'
          : 'Use item-level controls only for exceptions after this bulk update.',
      ],
      confirmLabel: isCancel ? 'Cancel Batch' : `Move To ${STATUS_LABELS[nextStatus]}`,
      tone: isCancel || finalPaymentMayOpen || nextStatus === 'DELIVERED' ? 'danger' : 'warning',
      onConfirm: async () => {
        setConfirmAction(null);
        await run(
          () =>
            adminApi.updateSheinBatchStatus(
              selected.id,
              nextStatus,
              note || statusForm.note || undefined,
            ),
          itemStatus === 'SHOP'
            ? `Batch moved to ${STATUS_LABELS[nextStatus]}. Final payment opened for ready orders.`
            : `Batch moved to ${STATUS_LABELS[nextStatus]} and items synced`,
        );
      },
    });
  }

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    confirmBatchStatusUpdate(statusForm.status, statusForm.note || undefined);
  }

  function quickMoveBatch(nextStatus: SheinBatchStatus) {
    if (!selected) return;
    confirmBatchStatusUpdate(nextStatus, `Bulk tracking moved to ${STATUS_LABELS[nextStatus]}`);
  }

  async function updateItemStatus(itemId: string) {
    if (!selected) return;
    const nextStatus = itemStatusForms[itemId];
    if (!nextStatus) return;
    await run(
      () =>
        adminApi.updateSheinBatchItemStatus(
          selected.id,
          itemId,
          nextStatus,
          `Manual item tracking override to ${ORDER_ITEM_STATUS_LABELS[nextStatus]}`,
        ),
      `Item status updated to ${ORDER_ITEM_STATUS_LABELS[nextStatus]}`,
    );
  }

  async function advanceDistributionOrder(
    order: BatchOrderSummary,
    targetStatus: 'SHIPPED' | 'COMPLETED',
  ) {
    if (!selected) return;
    const steps = getOrderStatusSteps(order.status, targetStatus);
    if (steps.length === 0) {
      setNotice({
        type: 'success',
        message: `${order.orderNumber} is already ${targetStatus === 'SHIPPED' ? 'ready to deliver' : 'delivered'}`,
      });
      return;
    }

    setConfirmAction({
      title:
        targetStatus === 'COMPLETED'
          ? 'Mark this order as delivered?'
          : 'Mark this order ready to deliver?',
      message:
        targetStatus === 'COMPLETED'
          ? 'This will close the customer order as completed after handover.'
          : 'This will move the customer order to the delivery stage.',
      details: [
        `Order: ${order.orderNumber}`,
        `Customer: ${order.customerName}`,
        `Batch: ${selected.batchCode}`,
        `Status steps to apply: ${steps.join(' → ')}`,
      ],
      confirmLabel: targetStatus === 'COMPLETED' ? 'Mark Delivered' : 'Mark Ready To Deliver',
      tone: targetStatus === 'COMPLETED' ? 'danger' : 'warning',
      onConfirm: async () => {
        setConfirmAction(null);
        await run(
          async () => {
            for (const step of steps) {
              await adminApi.updateOrderStatusWithNotes(
                order.orderId,
                step,
                `Delivery update from SHEIN batch ${selected.batchCode}`,
              );
            }
          },
          targetStatus === 'SHIPPED'
            ? `${order.orderNumber} marked ready to deliver`
            : `${order.orderNumber} marked delivered`,
        );
      },
    });
  }

  async function updateNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await run(
      () => adminApi.updateSheinBatch(selected.id, { notes: notesForm }),
      'Batch notes updated',
    );
  }

  async function updateTrackingDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await run(
      () =>
        adminApi.updateSheinBatch(selected.id, {
          sheinOrderReference: trackingForm.sheinOrderReference,
          trackingNumber: trackingForm.trackingNumber,
          trackingCarrier: trackingForm.trackingCarrier,
          trackingUrl: trackingForm.trackingUrl,
        }),
      'Batch tracking details updated',
    );
  }

  async function removeItem(itemId: string) {
    if (!selected) return;
    if (selected.status !== 'DRAFT') {
      setNotice({
        type: 'error',
        message: 'Items can only be removed while the batch is still collecting.',
      });
      return;
    }
    const item = selected.items?.find((entry) => entry.id === itemId);
    setConfirmAction({
      title: 'Remove item from this draft batch?',
      message:
        'This will detach the item from the SHEIN batch and return it to the ready list while the batch is still collecting.',
      details: [
        `Batch: ${selected.batchCode}`,
        `Customer: ${item?.customerNameSnapshot ?? item?.order?.customerNameSnapshot ?? '-'}`,
        `Order: ${item?.orderNumberSnapshot ?? item?.order?.orderNumber ?? '-'}`,
        `Product: ${item?.productNameSnapshot ?? '-'}`,
      ],
      confirmLabel: 'Remove Item',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmAction(null);
        await run(
          () => adminApi.removeSheinBatchItem(selected.id, itemId),
          'Item removed from batch',
        );
      },
    });
  }

  useEffect(() => {
    const batchId = searchParams.get('batchId');
    load()
      .then(() => {
        if (batchId) return selectBatch(batchId);
        return undefined;
      })
      .catch((error) => setNotice(toNotice(error)));
    loadBadgeCounts().catch((error) => setNotice(toNotice(error)));
    settingsApi
      .storefront()
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  if (!response) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="SHEIN Operations"
        title="SHEIN Batches"
        description="View and track internal SHEIN purchase groups. Create new batches in a separate step-by-step wizard so this page stays simple."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link to={PATHS.adminSheinBatchesNew}>
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Create New Batch
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                Promise.all([load(), loadBadgeCounts()]).catch((error) =>
                  setNotice(toNotice(error)),
                )
              }
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        }
      />
      <AdminFeedback notice={notice} />

      <div className="grid gap-3 md:grid-cols-3">
        <AdminMetricCard
          title={`${activeTab.label} batches`}
          value={response.meta.total}
          icon={Truck}
          hint={activeTab.description}
          tone="gold"
        />
        <AdminMetricCard
          title="Current stage"
          value={activeTab.label}
          icon={ClipboardList}
          hint="Use stage tabs to filter the batch list"
          tone="info"
        />
        <AdminMetricCard
          title="Create flow"
          value="Wizard"
          icon={PlusCircle}
          hint="New batches are created on a separate clean page"
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <AdminCard
            title="Batch Stages"
            description="Use these tabs to follow groups by business stage"
            contentClassName="space-y-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {BATCH_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeTab(tab.id).catch((error) => setNotice(toNotice(error)))}
                  className={`rounded-2xl border p-3 text-left transition ${filters.statusGroup === tab.id ? 'border-[#c7831e] bg-[#fff5df] shadow-sm' : 'border-[#efd6c5] bg-white hover:bg-[#fffaf3]'}`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-black text-[#241611]">
                    <span>{tab.label}</span>
                    <AdminCountBadge count={getBatchGroupBadgeCount(reports, tab.id)} />
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                    {tab.description}
                  </span>
                </button>
              ))}
            </div>
          </AdminCard>

          <AdminCard
            title="Search Existing Batches"
            description="Find by batch code customer phone or order number"
          >
            <AdminFilterBar onSubmit={submitFilters}>
              <Input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Search"
              />
              <Button type="submit">
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </Button>
            </AdminFilterBar>
          </AdminCard>

          <AdminCard
            title={activeTab.label}
            description={`${response.meta.total} batch in this stage`}
            contentClassName="grid gap-3"
          >
            {batches.length === 0 ? (
              <AdminEmpty message="No SHEIN batches found in this stage" />
            ) : null}
            {batches.map((batch) => (
              <button
                key={batch.id}
                type="button"
                onClick={() =>
                  selectBatchAndSync(batch.id).catch((error) => setNotice(toNotice(error)))
                }
                className={`rounded-3xl border p-4 text-left shadow-sm transition ${selected?.id === batch.id ? 'border-[#c7831e] bg-[#fff5df]' : 'border-[#efd6c5] bg-white hover:bg-[#fffaf3]'}`}
                aria-label={`Select batch ${batch.batchCode}`}
              >
                <span className="flex flex-wrap items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7831e]">
                      {batch.batchCode}
                    </span>
                    <span className="mt-1 block text-base font-black text-[#241611]">
                      {batch.title || 'SHEIN grouped order'}
                    </span>
                  </span>
                  <AdminStatusBadge value={batch.status}>
                    {STATUS_LABELS[batch.status]}
                  </AdminStatusBadge>
                </span>

                <span className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <BatchCardField label="Orders" value={batch.orderCount ?? '-'} />
                  <BatchCardField
                    label="Pieces"
                    value={batch.itemsCount ?? batch._count?.items ?? batch.totalQuantity}
                  />
                  <BatchCardField
                    label="Total SAR"
                    value={formatMinorMoney(batch.totalSarAmount, 'SAR')}
                  />
                  <BatchCardField
                    label="Total EGP"
                    value={formatMinorMoney(batch.totalEgpAmount, 'EGP')}
                  />
                  <BatchCardField label="Tracking" value={batch.trackingNumber ?? '-'} />
                </span>

                <span className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/70 p-3 text-xs font-bold text-[#5f4638]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Collected{' '}
                    {formatDate(batch.createdAt)}
                  </span>
                  <span>{getBatchNextAction(batch.status)}</span>
                </span>
              </button>
            ))}
            <AdminPagination
              meta={response.meta}
              onPageChange={(page) => {
                const next = { ...filters, page };
                setFilters(next);
                syncUrl(next);
                setSelected(null);
                load(next).catch((error) => setNotice(toNotice(error)));
              }}
            />
          </AdminCard>
        </div>

        {selected ? (
          <div className="space-y-4">
            <AdminCard
              title={`${selected.batchCode} Details`}
              description="Open one simple tab at a time instead of showing every batch detail in one long screen"
              actions={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AdminStatusBadge value={selected.status}>
                    {STATUS_LABELS[selected.status]}
                  </AdminStatusBadge>
                  {sheinLinksWhatsappUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={sheinLinksWhatsappUrl} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Send SHEIN Links WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                      Add store WhatsApp number in Settings
                    </span>
                  )}
                </div>
              }
              contentClassName="space-y-4"
            >
              <AdminSoftPanel>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7831e]">
                  Next Action
                </p>
                <p className="mt-1 text-base font-black text-[#241611]">
                  {getBatchNextAction(selected.status)}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Customer orders stay separate. This batch is only an internal SHEIN purchase
                  group.
                </p>
                {NEXT_BATCH_STATUS[selected.status] ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => quickMoveBatch(NEXT_BATCH_STATUS[selected.status]!)}
                    >
                      Move To {STATUS_LABELS[NEXT_BATCH_STATUS[selected.status]!]}
                    </Button>
                    <span className="text-xs font-semibold text-muted-foreground">
                      This updates every non-cancelled item in the batch to{' '}
                      {
                        ORDER_ITEM_STATUS_LABELS[
                          BATCH_TO_ITEM_STATUS[NEXT_BATCH_STATUS[selected.status]!]
                        ]
                      }
                    </span>
                  </div>
                ) : null}
              </AdminSoftPanel>

              <BatchProgress current={selected.status} />

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdminInfoItem label="Orders" value={selectedOrders.length} />
                <AdminInfoItem label="Pieces" value={selected.totalQuantity} />
                <AdminInfoItem
                  label="Total SAR"
                  value={formatMinorMoney(selected.totalSarAmount, 'SAR')}
                />
                <AdminInfoItem
                  label="Total EGP"
                  value={formatMinorMoney(selected.totalEgpAmount, 'EGP')}
                />
              </section>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {DETAIL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`rounded-2xl border p-3 text-left transition ${detailTab === tab.id ? 'border-[#c7831e] bg-[#fff5df]' : 'border-[#efd6c5] bg-white hover:bg-[#fffaf3]'}`}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-black text-[#241611]">
                      <span>{tab.label}</span>
                      <AdminCountBadge
                        count={getDetailTabBadgeCount(
                          tab.id,
                          selected,
                          selectedOrders,
                          selectedDistribution,
                        )}
                      />
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                      {tab.description}
                    </span>
                  </button>
                ))}
              </div>
            </AdminCard>

            {detailTab === 'OVERVIEW' ? (
              <AdminCard
                title="Overview"
                description="Main batch information status update and timeline"
                contentClassName="space-y-4"
              >
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminInfoItem label="Title" value={selected.title ?? '-'} />
                  <AdminInfoItem label="SHEIN ref" value={selected.sheinOrderReference ?? '-'} />
                  <AdminInfoItem label="Tracking number" value={selected.trackingNumber ?? '-'} />
                  <AdminInfoItem label="Carrier" value={selected.trackingCarrier ?? '-'} />
                  <AdminInfoItem label="Tracking URL" value={selected.trackingUrl ?? '-'} />
                  <AdminInfoItem
                    label="Exchange rate"
                    value={String(selected.exchangeRateSarToEgp)}
                  />
                  <AdminInfoItem
                    label="Collection date"
                    value={new Date(selected.createdAt).toLocaleString('en-US')}
                  />
                  <AdminInfoItem label="Created by" value={selected.createdBy?.name ?? '-'} />
                  <AdminInfoItem label="Updated by" value={selected.updatedBy?.name ?? '-'} />
                  <AdminInfoItem
                    label="Customer paid"
                    value={formatMinorMoney(
                      selectedPayments.depositPaid + selectedPayments.finalPaid,
                      'EGP',
                    )}
                  />
                  <AdminInfoItem
                    label="Customer remaining"
                    value={formatMinorMoney(selectedPayments.remaining, 'EGP')}
                  />
                </section>

                {BATCH_TO_ITEM_STATUS[selected.status] === 'SHOP' ? (
                  <AdminSoftPanel className="space-y-2">
                    <p className="text-sm font-black text-[#241611]">Final payment stage is open</p>
                    <p className="text-sm font-bold text-muted-foreground">
                      Orders in this batch whose active items reached the shop now move to Waiting
                      Final Payment. Uploaded proofs and cash-at-store confirmations are handled
                      from Payments Review.
                    </p>
                  </AdminSoftPanel>
                ) : null}

                <form
                  className="grid gap-3 rounded-3xl border border-[#efd6c5] bg-white p-4 md:grid-cols-2 xl:grid-cols-[180px_180px_180px_minmax(0,1fr)_auto]"
                  onSubmit={updateTrackingDetails}
                >
                  <Input
                    value={trackingForm.sheinOrderReference}
                    onChange={(event) =>
                      setTrackingForm((current) => ({
                        ...current,
                        sheinOrderReference: event.target.value,
                      }))
                    }
                    placeholder="SHEIN reference"
                  />
                  <Input
                    value={trackingForm.trackingNumber}
                    onChange={(event) =>
                      setTrackingForm((current) => ({
                        ...current,
                        trackingNumber: event.target.value,
                      }))
                    }
                    placeholder="Tracking number"
                  />
                  <Input
                    value={trackingForm.trackingCarrier}
                    onChange={(event) =>
                      setTrackingForm((current) => ({
                        ...current,
                        trackingCarrier: event.target.value,
                      }))
                    }
                    placeholder="Carrier"
                  />
                  <Input
                    value={trackingForm.trackingUrl}
                    onChange={(event) =>
                      setTrackingForm((current) => ({
                        ...current,
                        trackingUrl: event.target.value,
                      }))
                    }
                    placeholder="Tracking URL optional"
                  />
                  <Button type="submit" variant="outline">
                    Save Tracking
                  </Button>
                </form>

                <form
                  className="grid gap-3 rounded-3xl border border-[#efd6c5] bg-[#fffaf3] p-4 md:grid-cols-[240px_minmax(0,1fr)_auto]"
                  onSubmit={updateStatus}
                >
                  <Select
                    value={statusForm.status}
                    onChange={(event) =>
                      setStatusForm((current) => ({
                        ...current,
                        status: event.target.value as SheinBatchStatus,
                      }))
                    }
                  >
                    {SHEIN_BATCH_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={statusForm.note}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, note: event.target.value }))
                    }
                    placeholder="Status note optional"
                  />
                  <Button type="submit">Bulk Update Tracking</Button>
                  <p className="md:col-span-3 text-xs font-semibold text-muted-foreground">
                    Updating the batch status will sync every non-cancelled item to{' '}
                    {ORDER_ITEM_STATUS_LABELS[BATCH_TO_ITEM_STATUS[statusForm.status]]}. Use item
                    controls below for exceptions.
                  </p>
                </form>

                <section className="space-y-3 rounded-3xl border border-[#efd6c5] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-[#241611]">Timeline</p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Latest batch status changes
                      </p>
                    </div>
                    <AdminStatusBadge value={selected.status}>
                      {STATUS_LABELS[selected.status]}
                    </AdminStatusBadge>
                  </div>
                  {(selected.statusHistory ?? []).length === 0 ? (
                    <AdminEmpty message="No timeline entries yet" />
                  ) : null}
                  {(selected.statusHistory ?? []).slice(0, 5).map((history) => (
                    <AdminSoftPanel
                      key={history.id}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-black text-[#241611]">
                          <History className="mr-2 inline h-4 w-4" aria-hidden="true" />
                          {STATUS_LABELS[history.toStatus]}
                        </p>
                        {history.note ? (
                          <p className="text-sm text-muted-foreground">{history.note}</p>
                        ) : null}
                        {history.changedBy ? (
                          <p className="text-xs font-semibold text-muted-foreground">
                            By {history.changedBy.name}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {new Date(history.createdAt).toLocaleString('en-US')}
                      </span>
                    </AdminSoftPanel>
                  ))}
                  {(selected.statusHistory ?? []).length > 5 ? (
                    <p className="text-xs font-bold text-muted-foreground">
                      Showing latest 5 timeline entries
                    </p>
                  ) : null}
                </section>
              </AdminCard>
            ) : null}

            {detailTab === 'ORDERS' ? (
              <AdminCard
                title="Customer Orders"
                description="Each customer order stays independent inside the internal batch with its payment summary"
                contentClassName="space-y-3"
              >
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminMetricCard
                    title="Orders total"
                    value={formatMinorMoney(selectedPayments.total, 'EGP')}
                    icon={CircleDollarSign}
                    tone="info"
                  />
                  <AdminMetricCard
                    title="Deposit paid"
                    value={formatMinorMoney(selectedPayments.depositPaid, 'EGP')}
                    icon={CircleDollarSign}
                    tone="success"
                  />
                  <AdminMetricCard
                    title="Final paid"
                    value={formatMinorMoney(selectedPayments.finalPaid, 'EGP')}
                    icon={CircleDollarSign}
                    tone="success"
                  />
                  <AdminMetricCard
                    title="Remaining"
                    value={formatMinorMoney(selectedPayments.remaining, 'EGP')}
                    icon={CircleDollarSign}
                    tone="warning"
                  />
                </section>
                {selectedOrders.length === 0 ? (
                  <AdminEmpty message="No customer orders inside this batch yet" />
                ) : null}
                {selectedOrders.map((order) => (
                  <article
                    key={order.orderId}
                    className="rounded-3xl border border-[#efd6c5] bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-start">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7831e]">
                          {order.orderNumber}
                        </p>
                        <h3 className="mt-1 text-base font-black text-[#241611]">
                          {order.customerName}
                        </h3>
                        <p dir="ltr" className="mt-1 text-sm font-bold text-muted-foreground">
                          {order.customerPhone}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">
                          {order.items.length} item(s) in this SHEIN batch
                        </p>
                      </div>
                      <div className="grid gap-2 rounded-2xl bg-[#fffaf3] p-3 text-sm">
                        <span className="flex items-center justify-between gap-3">
                          <span>Total</span>
                          <strong>{formatOptionalMinorMoney(order.totalAmount, 'EGP')}</strong>
                        </span>
                        <span className="flex items-center justify-between gap-3">
                          <span>Paid</span>
                          <strong>
                            {formatOptionalMinorMoney(
                              sumMoneyValues(order.depositPaidAmount, order.finalPaidAmount),
                              'EGP',
                            )}
                          </strong>
                        </span>
                        <span className="flex items-center justify-between gap-3">
                          <span>Remaining</span>
                          <strong>{formatOptionalMinorMoney(order.remainingAmount, 'EGP')}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <CustomerWhatsappButton
                        phone={order.customerPhone}
                        customerName={order.customerName}
                        orderNumber={order.orderNumber}
                        orderStatus={order.status ?? ''}
                        paymentStatus={order.paymentStatus ?? ''}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.status ? <AdminStatusBadge value={order.status} /> : null}
                      {order.paymentStatus ? (
                        <AdminStatusBadge value={order.paymentStatus} />
                      ) : null}
                    </div>
                  </article>
                ))}
              </AdminCard>
            ) : null}

            {detailTab === 'TRACKING' ? (
              <AdminCard
                title="Tracking"
                description="Track every product in this batch and keep individual item control when needed"
                contentClassName="space-y-3"
              >
                {(selected.items ?? []).length === 0 ? (
                  <AdminEmpty message="No products inside this batch yet" />
                ) : null}
                {(selected.items ?? []).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-[#efd6c5] bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7831e]">
                          {item.orderNumberSnapshot}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-base font-black text-[#241611]">
                          {item.productNameSnapshot}
                        </h3>
                        {item.productVariantNameSnapshot ? (
                          <p className="mt-1 text-sm font-bold text-muted-foreground">
                            {item.productVariantNameSnapshot}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid gap-1 text-sm">
                        <strong className="text-[#241611]">{item.customerNameSnapshot}</strong>
                        <span dir="ltr" className="font-bold text-muted-foreground">
                          {item.customerPhoneSnapshot}
                        </span>
                        <span className="text-muted-foreground">
                          Qty {item.quantity} · {formatMinorMoney(item.totalSarAmount, 'SAR')} ·{' '}
                          {formatMinorMoney(item.totalEgpAmount, 'EGP')}
                        </span>
                        <span className="min-w-0 text-muted-foreground">
                          SHEIN link:{' '}
                          {item.product?.sourceSheinUrl ? (
                            <a
                              href={item.product.sourceSheinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[#c7831e] underline underline-offset-2"
                            >
                              Open link
                            </a>
                          ) : (
                            <strong className="text-red-700">Missing link</strong>
                          )}
                        </span>
                        <span className="flex flex-wrap gap-2 pt-1">
                          <AdminStatusBadge value={selected.status}>
                            {STATUS_LABELS[selected.status]}
                          </AdminStatusBadge>
                          {item.orderItem?.status ? (
                            <AdminStatusBadge value={item.orderItem.status} />
                          ) : null}
                        </span>
                      </div>
                      <div className="space-y-2 lg:text-right">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
                          <Select
                            value={itemStatusForms[item.id] ?? item.orderItem?.status ?? 'PENDING'}
                            onChange={(event) =>
                              setItemStatusForms((current) => ({
                                ...current,
                                [item.id]: event.target.value as OrderItemStatus,
                              }))
                            }
                            disabled={
                              selected.status === 'DELIVERED' || selected.status === 'CANCELLED'
                            }
                          >
                            {ORDER_ITEM_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {ORDER_ITEM_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemStatus(item.id)}
                            disabled={
                              selected.status === 'DELIVERED' || selected.status === 'CANCELLED'
                            }
                          >
                            Save Item Status
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {selected.status === 'DRAFT' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                            >
                              Remove
                            </Button>
                          ) : (
                            <span className="rounded-full border border-[#efd6c5] bg-[#fff7ed] px-3 py-1 text-xs font-black text-muted-foreground">
                              Locked after ordering
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.whatsappMessageTemplate ? (
                      <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#efd6c5] bg-[#fffaf3] p-3 text-xs font-bold leading-6 text-[#5f4638]">
                        {item.whatsappMessageTemplate}
                      </pre>
                    ) : null}
                  </article>
                ))}
              </AdminCard>
            ) : null}

            {detailTab === 'DELIVERY' ? (
              <AdminCard
                title="Delivery"
                description="Deliver customer orders after the batch reaches the shop and final payment is completed"
                contentClassName="space-y-4"
              >
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminMetricCard
                    title="Waiting final payment"
                    value={selectedDistribution.waitingPayment}
                    icon={CircleDollarSign}
                    tone="warning"
                  />
                  <AdminMetricCard
                    title="Paid delivery actions"
                    value={selectedDistribution.readyToDeliver}
                    icon={Truck}
                    tone="success"
                  />
                  <AdminMetricCard
                    title="Delivered"
                    value={selectedDistribution.delivered}
                    icon={PackageCheck}
                    tone="success"
                  />
                  <AdminMetricCard
                    title="Cancelled"
                    value={selectedDistribution.cancelled}
                    icon={ClipboardList}
                    tone="neutral"
                  />
                </section>

                {selected.status !== 'ARRIVED_STORE' &&
                selected.status !== 'READY_FOR_PICKUP' &&
                selected.status !== 'DELIVERED' ? (
                  <AdminSoftPanel className="space-y-2">
                    <p className="text-sm font-black text-[#241611]">
                      Delivery starts when the batch reaches the shop
                    </p>
                    <p className="text-sm font-bold text-muted-foreground">
                      Move this batch to Arrived shop first. Then final payment opens and paid
                      orders can be delivered from this tab.
                    </p>
                  </AdminSoftPanel>
                ) : null}

                {selectedOrders.length === 0 ? (
                  <AdminEmpty message="No customer orders inside this batch yet" />
                ) : null}
                {selectedOrders.map((order) => {
                  const distribution = getDistributionState(order);
                  return (
                    <article
                      key={order.orderId}
                      className="rounded-3xl border border-[#efd6c5] bg-white p-4 shadow-sm"
                    >
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px_220px] xl:items-start">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7831e]">
                            {order.orderNumber}
                          </p>
                          <h3 className="mt-1 text-base font-black text-[#241611]">
                            {order.customerName}
                          </h3>
                          <p dir="ltr" className="mt-1 text-sm font-bold text-muted-foreground">
                            {order.customerPhone}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-muted-foreground">
                            {order.items.length} item(s) from this batch
                          </p>
                        </div>

                        <div className="grid gap-2 rounded-2xl bg-[#fffaf3] p-3 text-sm">
                          <span className="flex items-center justify-between gap-3">
                            <span>Total</span>
                            <strong>{formatOptionalMinorMoney(order.totalAmount, 'EGP')}</strong>
                          </span>
                          <span className="flex items-center justify-between gap-3">
                            <span>Paid</span>
                            <strong>
                              {formatOptionalMinorMoney(
                                sumMoneyValues(order.depositPaidAmount, order.finalPaidAmount),
                                'EGP',
                              )}
                            </strong>
                          </span>
                          <span className="flex items-center justify-between gap-3">
                            <span>Remaining</span>
                            <strong>
                              {formatOptionalMinorMoney(order.remainingAmount, 'EGP')}
                            </strong>
                          </span>
                        </div>

                        <div className="space-y-2 xl:text-right">
                          <AdminStatusBadge value={distribution.badge}>
                            {distribution.label}
                          </AdminStatusBadge>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {distribution.helper}
                          </p>
                          {distribution.action === 'PAYMENT_REVIEW' ? (
                            <Button asChild type="button" variant="outline" size="sm">
                              <a href="/admin/payments-review">Open Payments Review</a>
                            </Button>
                          ) : null}
                          {distribution.action === 'READY' ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => advanceDistributionOrder(order, 'SHIPPED')}
                            >
                              Mark Ready To Deliver
                            </Button>
                          ) : null}
                          {distribution.action === 'DELIVERED' ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => advanceDistributionOrder(order, 'COMPLETED')}
                            >
                              Mark Delivered
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.status ? <AdminStatusBadge value={order.status} /> : null}
                        {order.paymentStatus ? (
                          <AdminStatusBadge value={order.paymentStatus} />
                        ) : null}
                      </div>
                      <div className="mt-2">
                        <CustomerWhatsappButton
                          phone={order.customerPhone}
                          customerName={order.customerName}
                          orderNumber={order.orderNumber}
                          orderStatus={order.status ?? ''}
                          paymentStatus={order.paymentStatus ?? ''}
                        />
                      </div>
                    </article>
                  );
                })}
              </AdminCard>
            ) : null}

            {detailTab === 'NOTES' ? (
              <AdminCard
                title="Internal Notes"
                description="Notes are for admins only and stay attached to this SHEIN batch"
                contentClassName="space-y-4"
              >
                <form className="space-y-3" onSubmit={updateNotes}>
                  <textarea
                    value={notesForm}
                    onChange={(event) => setNotesForm(event.target.value)}
                    className="min-h-36 w-full rounded-3xl border border-[#efd6c5] bg-white p-4 text-sm font-semibold text-[#241611] outline-none transition focus:border-[#c7831e] focus:ring-2 focus:ring-[#c7831e]/20"
                    placeholder="Write internal notes for this batch"
                  />
                  <Button type="submit">
                    <StickyNote className="h-4 w-4" aria-hidden="true" />
                    Save Notes
                  </Button>
                </form>
              </AdminCard>
            ) : null}
          </div>
        ) : null}
      </div>

      <AdminConfirmationDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        details={
          confirmAction?.details ? (
            <ul className="space-y-1">
              {confirmAction.details.map((detail) => (
                <li key={detail}>• {detail}</li>
              ))}
            </ul>
          ) : null
        }
        confirmLabel={confirmAction?.confirmLabel}
        tone={confirmAction?.tone}
        onConfirm={() => {
          void confirmAction?.onConfirm();
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function countActiveBatchItems(batch: AdminSheinBatch): number {
  return (batch.items ?? []).filter((item) => item.orderItem?.status !== 'CANCELLED').length;
}

function getBatchGroupBadgeCount(
  reports: AdminReports | null,
  group: SheinBatchStatusGroup,
): number {
  if (!reports) return 0;
  const countByStatus = (statuses: SheinBatchStatus[]) =>
    statuses.reduce(
      (total, status) =>
        total + (reports.batches.byStatus.find((row) => row.status === status)?.count ?? 0),
      0,
    );

  const map: Record<SheinBatchStatusGroup, SheinBatchStatus[]> = {
    COLLECTING: ['DRAFT'],
    ORDERED: ['ORDERED_FROM_SHEIN'],
    IN_SHIPPING: ['SHIPPING', 'CUSTOMS', 'ARRIVED_EGYPT'],
    ARRIVED_SHOP: ['ARRIVED_STORE', 'READY_FOR_PICKUP'],
    COMPLETED: ['DELIVERED'],
    CANCELLED: ['CANCELLED'],
  };
  return countByStatus(map[group]);
}

function getDetailTabBadgeCount(
  tab: DetailTab,
  selected: AdminSheinBatch | null,
  orders: BatchOrderSummary[],
  distribution: ReturnType<typeof buildDistributionSummary>,
): number {
  if (!selected) return 0;
  if (tab === 'OVERVIEW') return selected.statusHistory?.length ?? 0;
  if (tab === 'ORDERS') return orders.length;
  if (tab === 'TRACKING') return selected.items?.length ?? 0;
  if (tab === 'DELIVERY') return distribution.waitingPayment + distribution.readyToDeliver;
  if (tab === 'NOTES') return selected.notes?.trim() ? 1 : 0;
  return 0;
}

function BatchCardField({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded-2xl bg-white/70 p-3">
      <span className="block text-xs font-bold text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-sm font-black text-[#241611]">{value}</strong>
    </span>
  );
}

function BatchProgress({ current }: { current: SheinBatchStatus }) {
  const currentIndex = BATCH_PROGRESS.indexOf(current);
  return (
    <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {BATCH_PROGRESS.map((status, index) => {
        const isDone = currentIndex >= index && current !== 'CANCELLED';
        const isCurrent = current === status;
        return (
          <div
            key={status}
            className={`rounded-2xl border p-3 ${isCurrent ? 'border-[#c7831e] bg-[#fff5df]' : isDone ? 'border-emerald-200 bg-emerald-50' : 'border-[#efd6c5] bg-white'}`}
          >
            <p className="text-xs font-black text-[#241611]">{STATUS_LABELS[status]}</p>
          </div>
        );
      })}
    </div>
  );
}

function buildItemStatusForms(items: AdminSheinBatchItem[]) {
  return items.reduce<Record<string, OrderItemStatus>>((forms, item) => {
    forms[item.id] = item.orderItem?.status ?? 'PENDING';
    return forms;
  }, {});
}

function groupBatchOrders(items: AdminSheinBatchItem[]): BatchOrderSummary[] {
  const map = new Map<string, BatchOrderSummary>();
  for (const item of items) {
    const existing = map.get(item.orderId);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    map.set(item.orderId, {
      orderId: item.orderId,
      orderNumber: item.order?.orderNumber ?? item.orderNumberSnapshot,
      customerName: item.order?.customerNameSnapshot ?? item.customerNameSnapshot,
      customerPhone: item.order?.customerPhoneSnapshot ?? item.customerPhoneSnapshot,
      status: item.order?.status,
      paymentStatus: item.order?.paymentStatus,
      totalAmount: item.order?.totalAmount,
      depositPaidAmount: item.order?.depositPaidAmount,
      finalPaidAmount: item.order?.finalPaidAmount,
      finalAmountDue: item.order?.finalAmountDue,
      remainingAmount: item.order?.remainingAmount,
      items: [item],
    });
  }
  return Array.from(map.values());
}

function buildPaymentSummary(orders: BatchOrderSummary[]) {
  return orders.reduce(
    (summary, order) => ({
      total: summary.total + minorValue(order.totalAmount),
      depositPaid: summary.depositPaid + minorValue(order.depositPaidAmount),
      finalPaid: summary.finalPaid + minorValue(order.finalPaidAmount),
      remaining: summary.remaining + minorValue(order.remainingAmount),
    }),
    { total: 0, depositPaid: 0, finalPaid: 0, remaining: 0 },
  );
}

function buildDistributionSummary(orders: BatchOrderSummary[]) {
  return orders.reduce(
    (summary, order) => {
      const state = getDistributionState(order);
      if (state.bucket === 'WAITING_PAYMENT') summary.waitingPayment += 1;
      if (state.bucket === 'READY_TO_DELIVER' || state.bucket === 'IN_PROGRESS')
        summary.readyToDeliver += 1;
      if (state.bucket === 'DELIVERED') summary.delivered += 1;
      if (state.bucket === 'CANCELLED') summary.cancelled += 1;
      return summary;
    },
    { waitingPayment: 0, readyToDeliver: 0, delivered: 0, cancelled: 0 },
  );
}

function getDistributionState(order: BatchOrderSummary): {
  label: string;
  helper: string;
  badge: string;
  action: 'PAYMENT_REVIEW' | 'READY' | 'DELIVERED' | 'NONE';
  bucket: 'WAITING_PAYMENT' | 'READY_TO_DELIVER' | 'DELIVERED' | 'CANCELLED' | 'IN_PROGRESS';
} {
  if (order.status === 'CANCELLED') {
    return {
      label: 'Cancelled',
      helper: 'This customer order is cancelled',
      badge: 'CANCELLED',
      action: 'NONE',
      bucket: 'CANCELLED',
    };
  }
  if (order.status === 'COMPLETED') {
    return {
      label: 'Delivered',
      helper: 'This customer order is completed',
      badge: 'COMPLETED',
      action: 'NONE',
      bucket: 'DELIVERED',
    };
  }
  if (order.paymentStatus !== 'PAID') {
    return {
      label: 'Waiting final payment',
      helper: 'Review final payment before delivery',
      badge: order.paymentStatus ?? 'PAYMENT_PENDING',
      action: 'PAYMENT_REVIEW',
      bucket: 'WAITING_PAYMENT',
    };
  }
  if (order.status === 'SHIPPED') {
    return {
      label: 'Ready to deliver',
      helper: 'Final payment is paid. Mark delivered when handed to the customer',
      badge: 'READY_TO_DELIVER',
      action: 'DELIVERED',
      bucket: 'READY_TO_DELIVER',
    };
  }
  return {
    label: 'Payment completed',
    helper: 'Prepare the order for delivery',
    badge: 'PAID',
    action: 'READY',
    bucket: 'IN_PROGRESS',
  };
}

function getOrderStatusSteps(
  currentStatus: string | undefined,
  targetStatus: 'SHIPPED' | 'COMPLETED',
): Array<'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED'> {
  const flow = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as const;
  const currentIndex = flow.indexOf((currentStatus ?? 'CONFIRMED') as (typeof flow)[number]);
  const targetIndex = flow.indexOf(targetStatus);
  if (
    currentStatus === 'CANCELLED' ||
    currentStatus === 'COMPLETED' ||
    currentIndex === -1 ||
    targetIndex === -1 ||
    currentIndex >= targetIndex
  ) {
    return [];
  }
  return flow
    .slice(currentIndex + 1, targetIndex + 1)
    .filter(
      (status): status is 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' =>
        status !== 'PENDING',
    );
}

function isSheinBatchStatusGroup(value: string | null): value is SheinBatchStatusGroup {
  return BATCH_TABS.some((tab) => tab.id === value);
}

function getBatchFiltersFromSearchParams(params: URLSearchParams): BatchFilters {
  const pageValue = Number(params.get('page') ?? '1');
  const statusGroup = isSheinBatchStatusGroup(params.get('statusGroup'))
    ? (params.get('statusGroup') as SheinBatchStatusGroup)
    : 'COLLECTING';
  return {
    search: params.get('search') ?? '',
    statusGroup,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

function buildSheinLinksWhatsappUrl(
  batch: AdminSheinBatch,
  adminWhatsappNumber: string,
): string | null {
  const phone = normalizeWhatsappPhone(adminWhatsappNumber);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(batch.sheinLinksWhatsappMessage || '')}`;
}

function normalizeWhatsappPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') && digits.length >= 10 ? `20${digits.slice(1)}` : digits;
}

function buildBatchUrlSearchParams(filters: BatchFilters) {
  const params = new URLSearchParams({ statusGroup: filters.statusGroup });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

function buildBatchQuery(filters: BatchFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: '20',
    statusGroup: filters.statusGroup,
  });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  return params.toString();
}

function getBatchNextAction(status: SheinBatchStatus) {
  const map: Record<SheinBatchStatus, string> = {
    DRAFT: 'Add ready items or mark as ordered from SHEIN',
    ORDERED_FROM_SHEIN: 'Add tracking details then mark as shipped',
    SHIPPING: 'Follow shipment until it reaches customs',
    CUSTOMS: 'Confirm customs clearance and move the batch to Arrived Egypt',
    ARRIVED_EGYPT: 'Confirm local arrival and move the batch to Arrived Shop',
    ARRIVED_STORE: 'Final payment opens automatically. Use Delivery after payment approval',
    READY_FOR_PICKUP: 'Use Delivery to deliver paid customer orders',
    DELIVERED: 'Batch completed',
    CANCELLED: 'Batch cancelled',
  };
  return map[status];
}

function minorValue(value?: string | number | null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function sumMoneyValues(...values: Array<string | number | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + minorValue(value), 0);
}

function formatMinorMoney(value: string | number, currency: string) {
  const amount = minorValue(value) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatOptionalMinorMoney(value: string | number | null | undefined, currency: string) {
  if (value === null || value === undefined || value === '') return '-';
  return formatMinorMoney(value, currency);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
