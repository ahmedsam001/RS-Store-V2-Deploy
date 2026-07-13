import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { translateAdminText } from '@/features/admin/i18n/admin-arabic';
import {
  ORDER_WORKFLOW_TABS,
  buildOrderQuery,
  buildOrderUrlSearchParams,
  getAdminOrderNextAction,
  getAdminOrderStatusPresentation,
  getAdminPaymentStatusPresentation,
  getOrderFiltersFromSearchParams,
  hasActiveOrderFilters,
  type AdminOrderFilters,
  type OrderWorkflowTab,
} from '@/features/admin/orders/admin-orders-presentation';
import {
  formatAdminCurrency,
  formatAdminDateTime,
  formatAdminNumber,
} from '@/features/admin/utils/admin-format';
import { useAuth } from '@/features/auth';
import { PATHS } from '@/shared/constants/routes';
import { useI18n, type Language } from '@/shared/i18n';

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

export function AdminOrdersPage() {
  const { csrfToken } = useAuth();
  const { language } = useI18n();
  const ordersLoadErrorMessage =
    language === 'ar' ? translateAdminText('Could not load orders').trim() : 'Could not load orders';
  const summaryLoadErrorMessage =
    language === 'ar'
      ? translateAdminText('Could not load order summary').trim()
      : 'Could not load order summary';
  const ordersLoadErrorMessageRef = useRef(ordersLoadErrorMessage);
  ordersLoadErrorMessageRef.current = ordersLoadErrorMessage;
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState<AdminPaginated<AdminOrder> | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const filters = useMemo(() => getOrderFiltersFromSearchParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [loadError, setLoadError] = useState(false);
  const requestSequence = useRef(0);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const orders = useMemo(() => response?.items ?? [], [response?.items]);
  const currentTab =
    ORDER_WORKFLOW_TABS.find((tab) => tab.key === filters.workflow) ?? ORDER_WORKFLOW_TABS[0];
  const selectedInList = useMemo(
    () => orders.find((order) => order.id === selected?.id),
    [orders, selected],
  );

  async function load(next = filters) {
    const requestId = ++requestSequence.current;
    try {
      const orderResponse = await adminApi.ordersPage(buildOrderQuery(next));
      if (requestId !== requestSequence.current) return;
      setResponse(orderResponse);
      setLoadError(false);
      setSelected((current) => {
        if (current && !orderResponse.items.some((order) => order.id === current.id)) {
          setDetailsOpen(false);
          return null;
        }
        return current;
      });
    } catch {
      if (requestId !== requestSequence.current) return;
      setLoadError(true);
      throw new Error('Could not load orders');
    }
  }

  async function loadBadgeCounts() {
    setReports(await adminApi.reports());
  }

  async function openOrderSummary(id: string) {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      setSelected(await adminApi.order(id));
      setDetailsOpen(true);
    } catch {
      setNotice({
        type: 'error',
        message: summaryLoadErrorMessage,
      });
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice({ type: 'success', message: success });
      await load();
      await loadBadgeCounts();
      if (selected) setSelected(await adminApi.order(selected.id));
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  function syncUrl(next: AdminOrderFilters) {
    setSearchParams(buildOrderUrlSearchParams(next));
  }

  async function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...filters, search: searchDraft.trim(), page: 1 };
    syncUrl(next);
    setDetailsOpen(false);
  }

  async function changeWorkflow(workflow: OrderWorkflowTab) {
    const next = { ...filters, workflow, page: 1 };
    syncUrl(next);
    setDetailsOpen(false);
  }

  function changePage(page: number) {
    const next = { ...filters, page };
    syncUrl(next);
  }

  function clearFilters() {
    setSearchDraft('');
    setSearchParams(new URLSearchParams());
    setDetailsOpen(false);
  }

  useEffect(() => {
    setSearchDraft(filters.search);
    setDetailsOpen(false);
    load().catch(() =>
      setNotice({ type: 'error', message: ordersLoadErrorMessageRef.current }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.search, filters.workflow]);

  useEffect(() => {
    loadBadgeCounts().catch(() => undefined);
  }, []);

  if (loadError && !response) {
    return (
      <AdminError
        message={ordersLoadErrorMessage}
        onRetry={() => load().catch(() => undefined)}
      />
    );
  }
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
              onClick={() =>
                Promise.all([load(), loadBadgeCounts()]).catch(() =>
                  setNotice({ type: 'error', message: ordersLoadErrorMessage }),
                )
              }
            >
              Refresh
            </Button>
          </div>
        }
      />
      <AdminFeedback notice={notice} />

      <AdminCard
        title="Orders toolbar"
        description="Search and choose the workflow step you want to review"
        actions={
          <span
            aria-live="polite"
            className="inline-flex items-center gap-1 text-sm font-black text-[#6f4a17]"
          >
            <span data-no-admin-translate>
              {formatAdminNumber(response.meta.total, language)}
            </span>
            <span>Results</span>
          </span>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ORDER_WORKFLOW_TABS.map((tab) => {
            const active = filters.workflow === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                className={`min-h-11 rounded-2xl border p-4 text-start transition ${
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

        <AdminFilterBar className="mt-4" onSubmit={submitFilters}>
          <label className="sr-only" htmlFor="admin-orders-search">
            Search orders
          </label>
          <Input
            id="admin-orders-search"
            aria-label="Search orders"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search order number, customer name, phone, or email"
            maxLength={120}
          />
          <Button type="submit">Search</Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveOrderFilters(filters) && !searchDraft}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </AdminFilterBar>
        <p className="mt-3 text-sm font-bold text-muted-foreground">
          {currentTab.label}: {currentTab.description}
        </p>
      </AdminCard>

      <div className="grid gap-4">
        <AdminCard
          title="Orders"
          description="Orders in the selected workflow"
          contentClassName="grid gap-3"
        >
          {orders.length === 0 ? (
            <AdminEmpty
              message={
                hasActiveOrderFilters(filters)
                  ? 'No orders match the current filters'
                  : 'No orders exist in this workflow yet'
              }
              action={
                hasActiveOrderFilters(filters)
                  ? { label: 'Clear filters', onClick: clearFilters }
                  : undefined
              }
            />
          ) : null}
          {orders.length > 0 ? (
            <div className="hidden gap-4 px-4 text-xs font-black uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(120px,0.7fr)_minmax(180px,1.1fr)_auto]">
              <span>Order</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Status and next action</span>
              <span>Actions</span>
            </div>
          ) : null}
          {orders.map((order) => (
            <OrderListCard
              key={order.id}
              language={language}
              order={order}
              selected={selectedInList?.id === order.id}
              onSelect={() => openOrderSummary(order.id)}
            />
          ))}
          <AdminPagination
            meta={response.meta}
            onPageChange={changePage}
          />
        </AdminCard>
      </div>

      {selected && detailsOpen ? (
        <AdminDetailsOverlay
          title="Order summary"
          closeLabel="Close order summary"
          returnFocusTo={returnFocusRef.current}
          onClose={() => setDetailsOpen(false)}
        >
          <OrderDetails order={selected} csrfToken={csrfToken} language={language} run={run} />
        </AdminDetailsOverlay>
      ) : null}
    </div>
  );
}

function AdminDetailsOverlay({
  title,
  closeLabel,
  onClose,
  returnFocusTo,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
  children: ReactNode;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-summary-title"
        className="relative ms-auto flex h-full w-[min(94vw,760px)] flex-col overflow-hidden bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="admin-order-summary-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-lg font-semibold leading-none text-slate-600 hover:bg-slate-50"
            aria-label={closeLabel}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

export function OrderListCard({
  language,
  order,
  selected,
  onSelect,
}: {
  language: Language;
  order: AdminOrder;
  selected: boolean;
  onSelect: () => void;
}) {
  const action = getAdminOrderNextAction(order, language);
  const orderStatus = getAdminOrderStatusPresentation(order.status, language);
  const paymentStatus = getAdminPaymentStatusPresentation(order.paymentStatus, language);
  const total = formatAdminCurrency(order.totalAmount, order.currency, language);
  const created = formatAdminDateTime(order.createdAt, language);

  return (
    <>
      <div className="md:hidden">
        <AdminMobileDataCard
          title={order.orderNumber}
          badge={
            <span className="flex flex-wrap gap-1">
              <AdminStatusBadge value={order.status} tone={orderStatus.tone}>
                {orderStatus.label}
              </AdminStatusBadge>
              <AdminStatusBadge value={order.paymentStatus} tone={paymentStatus.tone}>
                {paymentStatus.label}
              </AdminStatusBadge>
            </span>
          }
          meta={
            <span>
              {order.customerNameSnapshot ?? '-'} ·{' '}
              <span dir="ltr">{order.customerPhoneSnapshot ?? '-'}</span>
            </span>
          }
          selected={selected}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onSelect}>
                Quick view
              </Button>
              <CustomerWhatsappButton
                phone={order.customerPhoneSnapshot}
                customerName={order.customerNameSnapshot}
                orderNumber={order.orderNumber}
                orderStatus={order.status}
                paymentStatus={order.paymentStatus}
              />
            </div>
          }
        >
          <AdminMobileField label="Items" value={formatAdminNumber(order.items?.length ?? 0, language)} />
          <AdminMobileField label="Total" value={total} />
          <AdminMobileField label="Next action" value={action.title} />
          <AdminMobileField label="Created" value={created} />
        </AdminMobileDataCard>
      </div>

      <article
        className={`hidden gap-4 rounded-2xl border p-4 md:grid md:grid-cols-[minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(120px,0.7fr)_minmax(180px,1.1fr)_auto] md:items-center ${
          selected ? 'border-[#b98b2b] bg-[#fffaf0]' : 'border-[#eadfcb] bg-white'
        }`}
      >
        <div className="min-w-0">
          <strong data-no-admin-translate className="block truncate text-[#241611]">
            {order.orderNumber}
          </strong>
          <span data-no-admin-translate className="mt-1 block text-xs text-muted-foreground" dir="auto">
            {created}
          </span>
        </div>
        <div className="min-w-0">
          <p data-no-admin-translate className="truncate text-sm font-bold text-[#241611]">
            {order.customerNameSnapshot ?? '-'}
          </p>
          <p data-no-admin-translate className="truncate text-xs text-muted-foreground" dir="ltr">
            {order.customerPhoneSnapshot ?? '-'}
          </p>
        </div>
        <strong data-no-admin-translate className="text-sm text-[#241611]" dir="auto">
          {total}
        </strong>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-1">
            <AdminStatusBadge value={order.status} tone={orderStatus.tone}>
              {orderStatus.label}
            </AdminStatusBadge>
            <AdminStatusBadge value={order.paymentStatus} tone={paymentStatus.tone}>
              {paymentStatus.label}
            </AdminStatusBadge>
          </div>
          <p className="truncate text-xs font-black text-[#6f4a17]">{action.title}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onSelect}>
          Quick view
        </Button>
      </article>
    </>
  );
}

function OrderDetails({
  order,
  csrfToken,
  language,
  run,
}: {
  order: AdminOrder;
  csrfToken: string | null;
  language: Language;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const action = getAdminOrderNextAction(order, language);
  const orderStatus = getAdminOrderStatusPresentation(order.status, language);
  const paymentStatus = getAdminPaymentStatusPresentation(order.paymentStatus, language);
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
          <AdminStatusBadge value={order.paymentStatus} tone={action.tone}>
            {action.badge}
          </AdminStatusBadge>
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
        <AdminInfoItem
          label="Order total"
          value={formatAdminCurrency(order.totalAmount, order.currency, language)}
        />
        <AdminInfoItem
          label="Paid"
          value={formatAdminCurrency(getPaidAmount(order), order.currency, language)}
        />
        <AdminInfoItem
          label="Remaining"
          value={formatAdminCurrency(getRemainingAmount(order), order.currency, language)}
        />
        <AdminInfoItem
          label="Created"
          value={formatAdminDateTime(order.createdAt, language)}
        />
        <div className="sm:col-span-2">
          <AdminInfoItem label="Address" value={order.shippingAddressSnapshot ?? '-'} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <AdminStatusBadge value={order.status} tone={orderStatus.tone}>
            {orderStatus.label}
          </AdminStatusBadge>
          <AdminStatusBadge value={order.paymentStatus} tone={paymentStatus.tone}>
            {paymentStatus.label}
          </AdminStatusBadge>
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
                <strong data-no-admin-translate className="text-[#241611]">
                  {item.productNameSnapshot}
                </strong>
                <AdminStatusBadge value={item.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.productVariantSizeSnapshot ?? '-'} · {item.productVariantColorSnapshot ?? '-'}{' '}
                · Qty {item.quantity} ·{' '}
                {formatAdminCurrency(item.lineTotalAmount, order.currency, language)}
              </p>
              {item.sheinBatchItems?.length ? (
                <p className="mt-2 text-xs font-black text-[#6f4a17]">
                  Batch:{' '}
                  {item.sheinBatchItems
                    .map(
                      (tracking) =>
                        `${tracking.batch.batchCode} · ${labelStatus(tracking.batch.status)}`,
                    )
                    .join(', ')}
                </p>
              ) : (
                <p className="mt-2 text-xs font-black text-muted-foreground">
                  Not added to a batch yet
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {item.product?.sourceSheinUrl ? (
                  <Button asChild size="sm" variant="outline" className="font-black text-[#c7831e]">
                    <a href={item.product.sourceSheinUrl} target="_blank" rel="noreferrer">
                      Open SHEIN Product
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" type="button" disabled>
                    Missing SHEIN Link
                  </Button>
                )}
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
          <AdminInfoItem
            label="Deposit required"
            value={formatAdminCurrency(order.depositAmount, order.currency, language)}
          />
          <AdminInfoItem
            label="Deposit paid"
            value={formatAdminCurrency(order.depositPaidAmount, order.currency, language)}
          />
          <AdminInfoItem
            label="Final paid"
            value={formatAdminCurrency(order.finalPaidAmount, order.currency, language)}
          />
          <AdminInfoItem
            label="Remaining"
            value={formatAdminCurrency(getRemainingAmount(order), order.currency, language)}
          />
        </div>
        <p className="text-sm font-bold text-muted-foreground">
          Payment proof actions stay in Payments Review. This page only shows totals and the next
          order step.
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
                  run(
                    () => adminApi.updateOrderStatus(order.id, status, { csrfToken }),
                    'Order status updated',
                  )
                }
              >
                {labelAction(status)}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No actions available for this order status
            </p>
          )}
        </div>
      </section>

      <OrderTimeline language={language} order={order} />
    </AdminCard>
  );
}

function OrderTimeline({ language, order }: { language: Language; order: AdminOrder }) {
  const timeline = order.timeline ?? [];
  return (
    <section className="space-y-3">
      <h3 className="font-black text-[#241611]">Timeline</h3>
      {timeline.length ? (
        <div className="space-y-2">
          {timeline.map((event) => (
            <div key={event.id} className="admin-list-card text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong data-no-admin-translate className="text-[#241611]">
                  {event.message}
                </strong>
                <span data-no-admin-translate className="text-xs text-muted-foreground" dir="auto">
                  {formatAdminDateTime(event.createdAt, language)}
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
    [
      'APPROVED',
      'CONFIRMED',
      'COMPLETED',
      'PAID',
      'SHIPPED',
      'DEPOSIT_APPROVED',
      'FINAL_PAYMENT_APPROVED',
      'SHOP',
    ].includes(upper)
  ) {
    return 'admin-tone-success border border-emerald-200 text-emerald-800 hover:bg-emerald-100';
  }
  if (['CANCELLED', 'REJECTED', 'DEPOSIT_REJECTED', 'FINAL_PAYMENT_REJECTED'].includes(upper)) {
    return 'admin-tone-danger border border-red-200 text-red-800 hover:bg-red-50';
  }
  if (
    [
      'PENDING',
      'PROCESSING',
      'DEPOSIT_PENDING',
      'DEPOSIT_SUBMITTED',
      'FINAL_PAYMENT_PENDING',
      'FINAL_PAYMENT_SUBMITTED',
    ].includes(upper)
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

function getOrderWorkflowBadgeCount(
  reports: AdminReports | null,
  workflow: OrderWorkflowTab,
): number {
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
