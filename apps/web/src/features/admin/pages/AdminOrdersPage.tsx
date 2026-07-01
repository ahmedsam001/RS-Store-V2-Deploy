import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { AdminOrder, AdminPaginated, AdminReports, adminApi } from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminCountBadge,
  AdminFilterBar,
  AdminInfoItem,
  AdminPageHeader,
  AdminSoftPanel,
  AdminStatusBadge,
  CustomerWhatsappButton,
  labelBatchStatus,
  labelOrderItemStatus,
} from '@/features/admin/components/AdminDesign';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { AdminMobileDataCard, AdminMobileField } from '@/features/admin/components/AdminMobileList';
import { AdminPagination } from '@/features/admin/components/AdminPagination';
import { AdminEmpty, AdminLoading } from '@/features/admin/components/AdminState';
import { useAuth } from '@/features/auth';
import { PATHS } from '@/shared/constants/routes';

const ITEM_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['SHEIN', 'CANCELLED'],
  SHEIN: ['KUWAIT', 'CANCELLED'],
  KUWAIT: ['CUSTOMS', 'CANCELLED'],
  CUSTOMS: ['EGYPT', 'CANCELLED'],
  EGYPT: ['SHOP', 'CANCELLED'],
  SHOP: [],
  CANCELLED: [],
};

const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

type OrderWorkflowTab =
  | 'READY_FOR_SHEIN_BATCH'
  | 'IN_SHEIN_BATCH'
  | 'WAITING_FINAL_PAYMENT'
  | 'READY_TO_DELIVER'
  | 'COMPLETED'
  | 'CANCELLED';

const ORDER_WORKFLOW_TABS: Array<{
  key: OrderWorkflowTab;
  label: string;
  description: string;
}> = [
  {
    key: 'READY_FOR_SHEIN_BATCH',
    label: 'Ready For SHEIN Batch',
    description: 'Deposit approved and ready to be grouped',
  },
  {
    key: 'IN_SHEIN_BATCH',
    label: 'In SHEIN Batch',
    description: 'Already grouped and being tracked',
  },
  {
    key: 'WAITING_FINAL_PAYMENT',
    label: 'Waiting Final Payment',
    description: 'Items arrived or final payment is under review',
  },
  {
    key: 'READY_TO_DELIVER',
    label: 'Ready To Deliver',
    description: 'Fully paid and ready for handover',
  },
  { key: 'COMPLETED', label: 'Completed', description: 'Closed customer orders' },
  { key: 'CANCELLED', label: 'Cancelled', description: 'Cancelled customer orders' },
];

export function AdminOrdersPage() {
  const { csrfToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState<AdminPaginated<AdminOrder> | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [filters, setFilters] = useState(() => getOrderFiltersFromSearchParams(searchParams));
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const orders = response?.items ?? [];
  const currentTab = ORDER_WORKFLOW_TABS.find((tab) => tab.key === filters.workflow) ?? ORDER_WORKFLOW_TABS[0];
  const selectedInList = useMemo(
    () => orders.find((order) => order.id === selected?.id),
    [orders, selected],
  );

  async function load(next = filters) {
    const orderResponse = await adminApi.ordersPage(buildOrderQuery(next));
    setResponse(orderResponse);
    if (orderResponse.items[0]) {
      const stillExists = selected
        ? orderResponse.items.some((order) => order.id === selected.id)
        : false;
      if (!selected || !stillExists) await selectOrder(orderResponse.items[0].id);
    } else {
      setSelected(null);
    }
  }

  async function loadBadgeCounts() {
    setReports(await adminApi.reports());
  }

  async function selectOrder(id: string) {
    setSelected(await adminApi.order(id));
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice({ type: 'success', message: success });
      await load();
      await loadBadgeCounts();
      if (selected) await selectOrder(selected.id);
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  function syncUrl(next: { search: string; workflow: OrderWorkflowTab; page: number }) {
    setSearchParams(buildOrderUrlSearchParams(next));
  }

  async function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    syncUrl(next);
    await load(next);
  }

  async function changeWorkflow(workflow: OrderWorkflowTab) {
    const next = { ...filters, workflow, page: 1 };
    setFilters(next);
    syncUrl(next);
    await load(next);
  }

  async function changePage(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    syncUrl(next);
    await load(next);
  }

  useEffect(() => {
    load().catch((error) => setNotice(toNotice(error)));
    loadBadgeCounts().catch((error) => setNotice(toNotice(error)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!response) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Orders"
        title="Active Orders"
        description="Orders now start here only after deposit approval. Payments Review handles deposit and final payment proofs separately."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={PATHS.adminPaymentsReview}>Payments Review</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={PATHS.adminSheinBatches}>SHEIN Batches</Link>
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => Promise.all([load(), loadBadgeCounts()]).catch((error) => setNotice(toNotice(error)))}
            >
              Refresh
            </Button>
          </div>
        }
      />
      <AdminFeedback notice={notice} />

      <AdminCard title="Order Workflow" description="Choose the exact step you want to work on">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ORDER_WORKFLOW_TABS.map((tab) => {
            const active = filters.workflow === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-[#b98b2b] bg-[#fff7df] shadow-sm'
                    : 'border-[#eadfcb] bg-white hover:border-[#d8b85f] hover:bg-[#fffaf0]'
                }`}
                onClick={() => changeWorkflow(tab.key).catch((error) => setNotice(toNotice(error)))}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-black text-[#241611]">
                  <span>{tab.label}</span>
                  <AdminCountBadge count={getOrderWorkflowBadgeCount(reports, tab.key)} />
                </span>
                <span className="mt-1 block text-xs font-bold text-muted-foreground">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </AdminCard>

      <AdminCard title={currentTab.label} description={currentTab.description}>
        <AdminFilterBar onSubmit={submitFilters}>
          <Input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search order number, customer name, phone, or email"
          />
          <Button type="submit">Search</Button>
        </AdminFilterBar>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <AdminCard
          title="Orders"
          description={`${response.meta.total} order in ${currentTab.label}`}
          contentClassName="grid gap-3"
        >
          {orders.length === 0 ? <AdminEmpty message="No orders found in this step" /> : null}
          {orders.map((order) => (
            <OrderListCard
              key={order.id}
              order={order}
              selected={selectedInList?.id === order.id}
              onSelect={() => selectOrder(order.id).catch((error) => setNotice(toNotice(error)))}
            />
          ))}
          <AdminPagination
            meta={response.meta}
            onPageChange={(page) => changePage(page).catch((error) => setNotice(toNotice(error)))}
          />
        </AdminCard>

        {selected ? (
          <OrderDetails
            order={selected}
            csrfToken={csrfToken}
            run={run}
          />
        ) : null}
      </div>
    </div>
  );
}

function OrderListCard({
  order,
  selected,
  onSelect,
}: {
  order: AdminOrder;
  selected: boolean;
  onSelect: () => void;
}) {
  const action = getNextAction(order);
  return (
    <AdminMobileDataCard
      title={order.orderNumber}
      badge={<AdminStatusBadge value={order.paymentStatus}>{action.badge}</AdminStatusBadge>}
      meta={
        <span>
          {order.customerNameSnapshot ?? '-'} ·{' '}
          <span dir="ltr">{order.customerPhoneSnapshot ?? '-'}</span>
        </span>
      }
      selected={selected}
      onClick={onSelect}
      ariaLabel={`Select order ${order.orderNumber}`}
    >
      <AdminMobileField label="Items" value={order.items?.length ?? 0} />
      <AdminMobileField label="Total" value={formatMoney(order.totalAmount, order.currency)} />
      <AdminMobileField label="Paid" value={formatMoney(getPaidAmount(order), order.currency)} />
      <AdminMobileField label="Remaining" value={formatMoney(getRemainingAmount(order), order.currency)} />
      <AdminMobileField label="Next action" value={action.title} />
      <div className="admin-mobile-field-full">
        <CustomerWhatsappButton
          phone={order.customerPhoneSnapshot}
          customerName={order.customerNameSnapshot}
          orderNumber={order.orderNumber}
          orderStatus={order.status}
          paymentStatus={order.paymentStatus}
        />
      </div>
    </AdminMobileDataCard>
  );
}

function OrderDetails({
  order,
  csrfToken,
  run,
}: {
  order: AdminOrder;
  csrfToken: string | null;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const action = getNextAction(order);
  const batchCodes = getBatchCodes(order);
  return (
    <AdminCard
      title={`Order ${order.orderNumber}`}
      description="Simple customer order summary, products, tracking, and payment totals"
      contentClassName="space-y-5"
    >
      <AdminSoftPanel className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b98b2b]">
              Next Action
            </p>
            <h3 className="text-lg font-black text-[#241611]">{action.title}</h3>
            <p className="mt-1 text-sm font-bold text-muted-foreground">{action.description}</p>
          </div>
          <AdminStatusBadge value={order.paymentStatus}>{action.badge}</AdminStatusBadge>
        </div>
        {action.href ? (
          <Button asChild size="sm" variant="outline">
            <Link to={action.href}>{action.cta}</Link>
          </Button>
        ) : null}
        <div className="mt-3">
          <CustomerWhatsappButton
            phone={order.customerPhoneSnapshot}
            customerName={order.customerNameSnapshot}
            orderNumber={order.orderNumber}
            orderStatus={order.status}
            paymentStatus={order.paymentStatus}
          />
        </div>
      </AdminSoftPanel>

      <section className="grid gap-3 sm:grid-cols-2">
        <AdminInfoItem label="Customer" value={order.customerNameSnapshot ?? '-'} />
        <AdminInfoItem label="Phone" value={order.customerPhoneSnapshot ?? '-'} dir="ltr" />
        <AdminInfoItem label="Order total" value={formatMoney(order.totalAmount, order.currency)} />
        <AdminInfoItem label="Paid" value={formatMoney(getPaidAmount(order), order.currency)} />
        <AdminInfoItem label="Remaining" value={formatMoney(getRemainingAmount(order), order.currency)} />
        <AdminInfoItem label="Created" value={new Date(order.createdAt).toLocaleString()} />
        <div className="sm:col-span-2">
          <AdminInfoItem label="Address" value={order.shippingAddressSnapshot ?? '-'} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <AdminStatusBadge value={order.status} />
          <AdminStatusBadge value={order.paymentStatus} />
          {batchCodes.map((batchCode) => (
            <AdminStatusBadge key={batchCode} value="ORDERED_FROM_SHEIN">
              {batchCode}
            </AdminStatusBadge>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-[#241611]">Products</h3>
          <Button asChild size="sm" variant="outline">
            <Link to={PATHS.adminSheinBatches}>Open SHEIN Batches</Link>
          </Button>
        </div>
        {order.items?.length ? (
          order.items.map((item) => (
            <div key={item.id} className="admin-list-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[#241611]">{item.productNameSnapshot}</strong>
                <AdminStatusBadge value={item.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.productVariantSizeSnapshot ?? '-'} · {item.productVariantColorSnapshot ?? '-'} · Qty{' '}
                {item.quantity} · {formatMoney(item.lineTotalAmount, order.currency)}
              </p>
              {item.sheinBatchItems?.length ? (
                <p className="mt-2 text-xs font-black text-[#6f4a17]">
                  Batch:{' '}
                  {item.sheinBatchItems
                    .map((tracking) => `${tracking.batch.batchCode} · ${labelStatus(tracking.batch.status)}`)
                    .join(', ')}
                </p>
              ) : (
                <p className="mt-2 text-xs font-black text-muted-foreground">Not added to a batch yet</p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {validItemActions(item.status).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    type="button"
                    className={actionTone(status)}
                    onClick={() =>
                      run(
                        () => adminApi.updateOrderItemStatus(item.id, status, { csrfToken }),
                        'Product tracking updated',
                      )
                    }
                  >
                    {labelAction(status)}
                  </Button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <AdminEmpty message="No products in order" />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-black text-[#241611]">Payment Summary</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminInfoItem label="Deposit required" value={formatMoney(order.depositAmount, order.currency)} />
          <AdminInfoItem label="Deposit paid" value={formatMoney(order.depositPaidAmount, order.currency)} />
          <AdminInfoItem label="Final paid" value={formatMoney(order.finalPaidAmount, order.currency)} />
          <AdminInfoItem label="Remaining" value={formatMoney(getRemainingAmount(order), order.currency)} />
        </div>
        <p className="text-sm font-bold text-muted-foreground">
          Payment proof actions stay in Payments Review. This page only shows totals and the next order step.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-black text-[#241611]">Order Status</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {validOrderActions(order.status).length ? (
            validOrderActions(order.status).map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                type="button"
                className={actionTone(status)}
                onClick={() =>
                  run(() => adminApi.updateOrderStatus(order.id, status, { csrfToken }), 'Order status updated')
                }
              >
                {labelAction(status)}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No actions available for this order status</p>
          )}
        </div>
      </section>

      <OrderTimeline order={order} />
    </AdminCard>
  );
}

function OrderTimeline({ order }: { order: AdminOrder }) {
  const timeline = order.timeline ?? [];
  return (
    <section className="space-y-3">
      <h3 className="font-black text-[#241611]">Timeline</h3>
      {timeline.length ? (
        <div className="space-y-2">
          {timeline.map((event) => (
            <div key={event.id} className="admin-list-card text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[#241611]">{event.message}</strong>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              {event.actorName ? (
                <p className="mt-1 text-muted-foreground">by {event.actorName}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <AdminEmpty message="No timeline events yet" />
      )}
    </section>
  );
}

function getNextAction(order: AdminOrder): {
  title: string;
  description: string;
  badge: string;
  href?: string;
  cta?: string;
} {
  if (order.status === 'CANCELLED') {
    return {
      title: 'Cancelled order',
      description: 'This order is closed and should not move through batching or delivery.',
      badge: 'Cancelled',
    };
  }
  if (order.status === 'COMPLETED') {
    return {
      title: 'Completed order',
      description: 'The customer order is fully closed.',
      badge: 'Completed',
    };
  }
  if (order.paymentStatus === 'FINAL_PAYMENT_SUBMITTED') {
    return {
      title: 'Review final payment',
      description: 'The customer uploaded final payment proof. Review it from Payments Review.',
      badge: 'Needs payment review',
      href: PATHS.adminPaymentsReview,
      cta: 'Open Payments Review',
    };
  }
  if (order.paymentStatus === 'FINAL_PAYMENT_PENDING' && order.finalPaymentMethod === 'CASH_AT_SHOP') {
    return {
      title: 'Review cash final payment',
      description: 'The customer selected cash at store. Confirm the received amount from Payments Review.',
      badge: 'Cash review',
      href: PATHS.adminPaymentsReview,
      cta: 'Open Payments Review',
    };
  }
  if (order.paymentStatus === 'FINAL_PAYMENT_PENDING' || order.paymentStatus === 'FINAL_PAYMENT_REJECTED') {
    return {
      title: 'Waiting final payment',
      description: 'The customer should pay the remaining amount before delivery.',
      badge: 'Waiting final payment',
    };
  }
  if (order.paymentStatus === 'PAID') {
    return {
      title: 'Ready to deliver',
      description: 'The order is fully paid. Mark it completed after handover.',
      badge: 'Ready to deliver',
    };
  }
  if (hasActiveBatch(order)) {
    return {
      title: 'Track in SHEIN Batch',
      description: 'This order is already inside a SHEIN batch. Track shipment progress from SHEIN Batches.',
      badge: 'In batch',
      href: PATHS.adminSheinBatches,
      cta: 'Open SHEIN Batches',
    };
  }
  return {
    title: 'Add to SHEIN Batch',
    description: 'Deposit is approved. Add this order or its products to the next SHEIN batch.',
    badge: 'Ready for batch',
    href: PATHS.adminSheinBatches,
    cta: 'Open SHEIN Batches',
  };
}

function hasActiveBatch(order: AdminOrder): boolean {
  return Boolean(
    order.items?.some((item) =>
      item.sheinBatchItems?.some((tracking) =>
        !['CANCELLED', 'DELIVERED'].includes(tracking.batch.status),
      ),
    ),
  );
}

function getBatchCodes(order: AdminOrder): string[] {
  const codes = new Set<string>();
  order.items?.forEach((item) => {
    item.sheinBatchItems?.forEach((tracking) => codes.add(tracking.batch.batchCode));
  });
  return Array.from(codes);
}

function getPaidAmount(order: AdminOrder): string | number {
  if (order.paymentStatus === 'PAID') return order.totalAmount;
  const deposit = Number(order.depositPaidAmount ?? 0);
  const finalPaid = Number(order.finalPaidAmount ?? 0);
  return deposit + finalPaid;
}

function getRemainingAmount(order: AdminOrder): string | number {
  if (order.paymentStatus === 'PAID') return 0;
  if (
    order.paymentStatus === 'FINAL_PAYMENT_PENDING' ||
    order.paymentStatus === 'FINAL_PAYMENT_SUBMITTED' ||
    order.paymentStatus === 'FINAL_PAYMENT_REJECTED'
  ) {
    return order.finalAmountDue ?? order.remainingAmount ?? 0;
  }
  return order.remainingAmount ?? order.finalAmountDue ?? 0;
}

function actionTone(status: string): string {
  const upper = status.toUpperCase();
  if (
    ['APPROVED', 'CONFIRMED', 'COMPLETED', 'PAID', 'SHIPPED', 'DEPOSIT_APPROVED', 'FINAL_PAYMENT_APPROVED', 'SHOP'].includes(
      upper,
    )
  ) {
    return 'admin-tone-success border border-emerald-200 text-emerald-800 hover:bg-emerald-100';
  }
  if (
    ['CANCELLED', 'REJECTED', 'DEPOSIT_REJECTED', 'FINAL_PAYMENT_REJECTED'].includes(upper)
  ) {
    return 'admin-tone-danger border border-red-200 text-red-800 hover:bg-red-50';
  }
  if (
    ['PENDING', 'PROCESSING', 'DEPOSIT_PENDING', 'DEPOSIT_SUBMITTED', 'FINAL_PAYMENT_PENDING', 'FINAL_PAYMENT_SUBMITTED'].includes(
      upper,
    )
  ) {
    return 'admin-tone-warning border border-amber-200 text-amber-800 hover:bg-amber-50';
  }
  return '';
}

function validOrderActions(status: string) {
  return ORDER_TRANSITIONS[status] ?? [];
}

function validItemActions(status: string) {
  return ITEM_TRANSITIONS[status] ?? [];
}

function labelAction(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'Confirm order',
    PROCESSING: 'Start processing',
    SHIPPED: 'Mark as shipped',
    COMPLETED: 'Complete order',
    CANCELLED: 'Cancel',
    SHEIN: labelOrderItemStatus('SHEIN'),
    KUWAIT: labelOrderItemStatus('KUWAIT'),
    CUSTOMS: labelOrderItemStatus('CUSTOMS'),
    EGYPT: labelOrderItemStatus('EGYPT'),
    SHOP: labelOrderItemStatus('SHOP'),
  };
  return map[status] ?? status;
}

function labelStatus(status: string) {
  return labelBatchStatus(status);
}


function isOrderWorkflowTab(value: string | null): value is OrderWorkflowTab {
  return ORDER_WORKFLOW_TABS.some((tab) => tab.key === value);
}


function getOrderWorkflowBadgeCount(reports: AdminReports | null, workflow: OrderWorkflowTab): number {
  if (!reports) return 0;
  const map: Record<OrderWorkflowTab, number> = {
    READY_FOR_SHEIN_BATCH: reports.orders.readyForBatch,
    IN_SHEIN_BATCH: reports.orders.inBatch,
    WAITING_FINAL_PAYMENT: reports.orders.waitingFinalPayment,
    READY_TO_DELIVER: reports.orders.readyToDeliver,
    COMPLETED: reports.orders.completed,
    CANCELLED: reports.orders.cancelled,
  };
  return map[workflow];
}

function getOrderFiltersFromSearchParams(params: URLSearchParams): {
  search: string;
  workflow: OrderWorkflowTab;
  page: number;
} {
  const workflow = isOrderWorkflowTab(params.get('workflow'))
    ? params.get('workflow') as OrderWorkflowTab
    : 'READY_FOR_SHEIN_BATCH';
  const pageValue = Number(params.get('page') ?? '1');
  return {
    search: params.get('search') ?? '',
    workflow,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

function buildOrderUrlSearchParams(filters: {
  search: string;
  workflow: OrderWorkflowTab;
  page: number;
}) {
  const params = new URLSearchParams({ workflow: filters.workflow });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

function buildOrderQuery(filters: {
  search: string;
  workflow: OrderWorkflowTab;
  page: number;
}) {
  const params = new URLSearchParams({ page: String(filters.page), workflow: filters.workflow });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  return `&${params.toString()}`;
}

function formatMoney(amount: string | number | undefined, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number(amount ?? 0) / 100,
  );
}
