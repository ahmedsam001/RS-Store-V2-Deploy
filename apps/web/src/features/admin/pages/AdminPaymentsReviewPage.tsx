import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { AdminOrder, AdminPaginated, AdminReports, adminApi } from '@/features/admin/api/admin-api';
import { AdminConfirmationDialog } from '@/features/admin/components/AdminConfirmationDialog';
import {
  AdminCard,
  AdminCountBadge,
  AdminFilterBar,
  AdminInfoItem,
  AdminPageHeader,
  AdminSoftPanel,
  AdminStatusBadge,
  CustomerWhatsappButton,
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
import { cn } from '@/shared/utils/cn';

type PaymentReviewStatus =
  | 'DEPOSIT_SUBMITTED'
  | 'FINAL_PAYMENT_SUBMITTED'
  | 'DEPOSIT_REJECTED'
  | 'FINAL_PAYMENT_REJECTED';

type PaymentReviewQueue = PaymentReviewStatus | 'CASH_FINAL_PAYMENT_PENDING';

type PaymentReviewTab = {
  key: PaymentReviewQueue;
  label: string;
  description: string;
  workflow: 'PAYMENT_REVIEW' | 'CASH_FINAL_PAYMENT_REVIEW';
  paymentStatus?: PaymentReviewStatus;
};

const PAYMENT_REVIEW_TABS: PaymentReviewTab[] = [
  {
    key: 'DEPOSIT_SUBMITTED',
    label: 'Deposit Review',
    description: 'Approve the deposit to move the order into Orders',
    workflow: 'PAYMENT_REVIEW',
    paymentStatus: 'DEPOSIT_SUBMITTED',
  },
  {
    key: 'FINAL_PAYMENT_SUBMITTED',
    label: 'Final Payment Review',
    description: 'Approve uploaded final payment proof before delivery',
    workflow: 'PAYMENT_REVIEW',
    paymentStatus: 'FINAL_PAYMENT_SUBMITTED',
  },
  {
    key: 'CASH_FINAL_PAYMENT_PENDING',
    label: 'Cash Final Review',
    description: 'Approve cash-at-store final payments after customer handover',
    workflow: 'CASH_FINAL_PAYMENT_REVIEW',
  },
  {
    key: 'DEPOSIT_REJECTED',
    label: 'Rejected Deposits',
    description: 'Rejected deposit proofs waiting for the customer to upload again',
    workflow: 'PAYMENT_REVIEW',
    paymentStatus: 'DEPOSIT_REJECTED',
  },
  {
    key: 'FINAL_PAYMENT_REJECTED',
    label: 'Rejected Final Payments',
    description: 'Rejected final payment proofs waiting for correction',
    workflow: 'PAYMENT_REVIEW',
    paymentStatus: 'FINAL_PAYMENT_REJECTED',
  },
];

export function AdminPaymentsReviewPage() {
  const { csrfToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState<AdminPaginated<AdminOrder> | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [filters, setFilters] = useState(() => getPaymentReviewFiltersFromSearchParams(searchParams));
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [rejectingProofId, setRejectingProofId] = useState<string | null>(null);
  const [cashRejectOpen, setCashRejectOpen] = useState(false);
  const orders = response?.items ?? [];
  const activeTab = PAYMENT_REVIEW_TABS.find((tab) => tab.key === filters.queue) ?? PAYMENT_REVIEW_TABS[0];
  const selectedInList = useMemo(
    () => orders.find((order) => order.id === selected?.id),
    [orders, selected],
  );

  async function load(next = filters) {
    const paymentResponse = await adminApi.ordersPage(buildPaymentsReviewQuery(next));
    setResponse(paymentResponse);

    if (paymentResponse.items[0]) {
      const preferred = selected?.id
        ? paymentResponse.items.find((order) => order.id === selected.id) ?? paymentResponse.items[0]
        : paymentResponse.items[0];
      await selectOrder(preferred.id);
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
      setRejectingProofId(null);
      setCashRejectOpen(false);
      await load();
      await loadBadgeCounts();
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  function syncUrl(next: { search: string; queue: PaymentReviewQueue; page: number }) {
    setSearchParams(buildPaymentReviewUrlSearchParams(next));
  }

  async function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    syncUrl(next);
    await load(next);
  }

  async function changeTab(queue: PaymentReviewQueue) {
    const next = { ...filters, queue, page: 1 };
    setFilters(next);
    syncUrl(next);
    setRejectingProofId(null);
    setCashRejectOpen(false);
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
        eyebrow="Payments Review"
        title="Review Customer Payments"
        description="Deposits and final payments stay here until approved so Orders remains focused on operations"
        actions={
          <Button
            variant="outline"
            type="button"
            onClick={() => Promise.all([load(), loadBadgeCounts()]).catch((error) => setNotice(toNotice(error)))}
          >
            Refresh
          </Button>
        }
      />
      <AdminFeedback notice={notice} />

      <AdminCard title="Review queues" description="Pick one queue and handle the next payment decision">
        <div className="admin-queue-strip">
          {PAYMENT_REVIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeTab(tab.key).catch((error) => setNotice(toNotice(error)))}
              className={cn(
                'admin-queue-pill',
                filters.queue === tab.key ? 'is-active' : '',
              )}
            >
              <span className="min-w-0 flex-1 truncate font-black">{tab.label}</span>
              <AdminCountBadge count={getPaymentReviewBadgeCount(reports, tab.key)} />
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm font-bold text-muted-foreground">{activeTab.description}</p>
      </AdminCard>

      <AdminCard
        title="Search this queue"
        description={`Current queue: ${activeTab.label}`}
      >
        <AdminFilterBar onSubmit={submitFilters}>
          <Input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Order number customer name or phone"
          />
          <Button type="submit">Search</Button>
        </AdminFilterBar>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <AdminCard
          title={activeTab.label}
          description={`${response.meta.total} payment item`}
          contentClassName="grid gap-3"
        >
          {orders.length === 0 ? <AdminEmpty message="No payments found in this queue" /> : null}
          {orders.map((order) => (
            <PaymentReviewListCard
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
          <PaymentReviewDetails
            order={selected}
            queue={filters.queue}
            rejectingProofId={rejectingProofId}
            setRejectingProofId={setRejectingProofId}
            cashRejectOpen={cashRejectOpen}
            setCashRejectOpen={setCashRejectOpen}
            csrfToken={csrfToken}
            run={run}
          />
        ) : null}
      </div>
    </div>
  );
}

function PaymentReviewListCard({
  order,
  selected,
  onSelect,
}: {
  order: AdminOrder;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <AdminMobileDataCard
      title={order.orderNumber}
      badge={<AdminStatusBadge value={order.paymentStatus} />}
      meta={
        <span>
          {order.customerNameSnapshot ?? '-'} ·{' '}
          <span dir="ltr">{order.customerPhoneSnapshot ?? '-'}</span>
        </span>
      }
      selected={selected}
      onClick={onSelect}
      ariaLabel={`Select payment ${order.orderNumber}`}
    >
      <AdminMobileField label="Total" value={formatMoney(order.totalAmount, order.currency)} />
      <AdminMobileField label="Deposit" value={formatMoney(order.depositAmount, order.currency)} />
      <AdminMobileField label="Remaining" value={formatMoney(getRemainingAmount(order), order.currency)} />
      <AdminMobileField label="Final method" value={paymentMethodLabel(order.finalPaymentMethod)} />
      <AdminMobileField label="Date" value={new Date(order.createdAt).toLocaleString()} />
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

function PaymentReviewDetails({
  order,
  queue,
  rejectingProofId,
  setRejectingProofId,
  cashRejectOpen,
  setCashRejectOpen,
  csrfToken,
  run,
}: {
  order: AdminOrder;
  queue: PaymentReviewQueue;
  rejectingProofId: string | null;
  setRejectingProofId: (id: string | null) => void;
  cashRejectOpen: boolean;
  setCashRejectOpen: (open: boolean) => void;
  csrfToken: string | null;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const isCashFinalQueue = queue === 'CASH_FINAL_PAYMENT_PENDING';
  const proofType = queue.startsWith('DEPOSIT') ? 'DEPOSIT' : 'FINAL_PAYMENT';
  const relevantProofs = (order.paymentProofs ?? [])
    .filter((proof) => proof.type === proofType)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingProofs = relevantProofs.filter((proof) => proof.status === 'SUBMITTED');
  const isRejectedCashFinal =
    queue === 'FINAL_PAYMENT_REJECTED' &&
    order.finalPaymentMethod === 'CASH_AT_SHOP' &&
    relevantProofs.length === 0;

  return (
    <AdminCard
      title={`Payment ${order.orderNumber}`}
      description="Only the next decision is visible first. Details stay collapsed until needed."
      contentClassName="space-y-5"
    >
      <AdminSoftPanel>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7831e]">
            Next action
          </p>
          <h3 className="text-lg font-black text-[#241611]">{nextActionLabel(queue)}</h3>
          <p className="text-sm text-muted-foreground">{nextActionDescription(queue)}</p>
        </div>
      </AdminSoftPanel>

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminInfoItem label="Amount to review" value={formatMoney(getReviewAmount(order, queue), order.currency)} />
        <AdminInfoItem label="Payment method" value={paymentMethodLabel(isCashFinalQueue ? 'CASH_AT_SHOP' : order.finalPaymentMethod)} />
        <AdminInfoItem label="Order total" value={formatMoney(order.totalAmount, order.currency)} />
      </section>

      <details className="admin-disclosure">
        <summary>Customer and order details</summary>
        <section className="grid gap-3 pt-3 sm:grid-cols-2">
          <AdminInfoItem label="Customer" value={order.customerNameSnapshot ?? '-'} />
          <AdminInfoItem label="Phone" value={order.customerPhoneSnapshot ?? '-'} dir="ltr" />
          <AdminInfoItem label="Deposit paid" value={formatMoney(order.depositPaidAmount, order.currency)} />
          <AdminInfoItem label="Remaining" value={formatMoney(getRemainingAmount(order), order.currency)} />
          <AdminInfoItem label="Final due" value={formatMoney(order.finalAmountDue ?? order.remainingAmount, order.currency)} />
          <AdminInfoItem label="Created" value={new Date(order.createdAt).toLocaleString()} />
          <div className="sm:col-span-2">
            <AdminInfoItem label="Address" value={order.shippingAddressSnapshot ?? '-'} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <AdminStatusBadge value={order.status} />
            <AdminStatusBadge value={order.paymentStatus} />
          </div>
          <div className="mt-3 sm:col-span-2">
            <CustomerWhatsappButton
              phone={order.customerPhoneSnapshot}
              customerName={order.customerNameSnapshot}
              orderNumber={order.orderNumber}
              orderStatus={order.status}
              paymentStatus={order.paymentStatus}
            />
          </div>
        </section>
      </details>

      {isCashFinalQueue || isRejectedCashFinal ? (
        <section className="space-y-3">
          <h3 className="font-black text-[#241611]">Cash Final Payment</h3>
          <AdminSoftPanel className="space-y-3">
            <p className="text-sm font-bold text-muted-foreground">
              {isRejectedCashFinal
                ? 'Cash at store final payment was rejected. The customer needs to choose a final payment method again before delivery can continue.'
                : 'The customer selected cash at store. Confirm the received remaining amount before delivery.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminInfoItem label="Amount to collect" value={formatMoney(order.finalAmountDue ?? order.remainingAmount, order.currency)} />
              <AdminInfoItem label="Payment method" value="Cash at store" />
            </div>
            {isCashFinalQueue ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="admin-tone-success border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                    onClick={() =>
                      run(
                        () => adminApi.reviewCashFinalPayment(order.id, 'APPROVED', 'Cash final payment received', { csrfToken }),
                        'Cash final payment approved. Order is ready to deliver.',
                      )
                    }
                  >
                    Approve Cash Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="admin-tone-danger border border-red-200 text-red-800 hover:bg-red-50"
                    type="button"
                    onClick={() => setCashRejectOpen(!cashRejectOpen)}
                  >
                    Reject Cash Payment
                  </Button>
                </div>
                {cashRejectOpen ? (
                  <RejectionForm
                    title="Reject cash final payment?"
                    confirmLabel="Reject Cash Payment"
                    details={[
                      `Order: ${order.orderNumber}`,
                      `Customer: ${order.customerNameSnapshot ?? '-'}`,
                      `Amount affected: ${formatMoney(order.finalAmountDue ?? order.remainingAmount, order.currency)}`,
                      'The customer will need admin follow-up before delivery can continue.',
                    ]}
                    onSubmit={(reason) =>
                      run(
                        () => adminApi.reviewCashFinalPayment(order.id, 'REJECTED', reason, { csrfToken }),
                        'Cash final payment rejected.',
                      )
                    }
                  />
                ) : null}
              </>
            ) : (
              <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-800">
                No transfer proof is attached because this was a rejected cash-at-store final payment.
              </p>
            )}
          </AdminSoftPanel>
        </section>
      ) : (
        <section className="space-y-3">
          <h3 className="font-black text-[#241611]">Payment Proof</h3>
          {relevantProofs.length ? (
            relevantProofs.map((proof) => (
              <div key={proof.id} className="admin-list-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-[#241611]">{paymentProofLabel(proof.type)}</strong>
                  <AdminStatusBadge value={proof.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uploaded {new Date(proof.createdAt).toLocaleString()}
                </p>
                <a href={proof.secureUrl} target="_blank" rel="noreferrer">
                  <img
                    src={proof.secureUrl}
                    alt="payment proof"
                    className="mt-3 max-h-80 w-full rounded-2xl bg-[#fff4ed] object-contain"
                  />
                </a>
                {proof.status === 'REJECTED' && proof.rejectionReason ? (
                  <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-800">
                    Reason: {proof.rejectionReason}
                  </p>
                ) : null}
                {proof.status === 'SUBMITTED' ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="button"
                        className="admin-tone-success border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                        onClick={() =>
                          run(
                            () => adminApi.reviewPaymentProof(proof.id, 'APPROVED', undefined, { csrfToken }),
                            proof.type === 'DEPOSIT'
                              ? 'Deposit approved. Order moved to Orders.'
                              : 'Final payment approved. Order is ready to deliver.',
                          )
                        }
                      >
                        Approve Payment
                      </Button>
                      <Button
                        variant="outline"
                        className="admin-tone-danger border border-red-200 text-red-800 hover:bg-red-50"
                        type="button"
                        onClick={() =>
                          setRejectingProofId(rejectingProofId === proof.id ? null : proof.id)
                        }
                      >
                        Reject Payment
                      </Button>
                    </div>
                    {rejectingProofId === proof.id ? (
                      <RejectionForm
                        title={proof.type === 'DEPOSIT' ? 'Reject deposit proof?' : 'Reject final payment proof?'}
                        confirmLabel="Reject Payment"
                        details={[
                          `Order: ${order.orderNumber}`,
                          `Customer: ${order.customerNameSnapshot ?? '-'}`,
                          `Payment type: ${paymentProofLabel(proof.type)}`,
                          proof.type === 'DEPOSIT'
                            ? 'The order will stay out of the active Orders workflow until a valid deposit is approved.'
                            : 'Delivery cannot continue until a valid final payment is approved.',
                        ]}
                        onSubmit={(reason) =>
                          run(
                            () => adminApi.reviewPaymentProof(proof.id, 'REJECTED', reason, { csrfToken }),
                            'Payment proof rejected.',
                          )
                        }
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <AdminEmpty message="No proof found for this payment type" />
          )}
        </section>
      )}

      {pendingProofs.length === 0 && queue.includes('SUBMITTED') ? (
        <AdminSoftPanel>
          <p className="text-sm font-bold text-muted-foreground">
            This order has no submitted proof left in this queue. Refresh or open another payment.
          </p>
        </AdminSoftPanel>
      ) : null}
    </AdminCard>
  );
}

function RejectionForm({
  onSubmit,
  title,
  details,
  confirmLabel = 'Reject Payment',
}: {
  onSubmit: (reason: string) => void;
  title: string;
  details: string[];
  confirmLabel?: string;
}) {
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cleanReason = reason.trim();

  return (
    <>
      <form
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (cleanReason) setConfirmOpen(true);
        }}
      >
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason" required />
        <Button
          variant="outline"
          type="submit"
          className="admin-tone-danger border border-red-200 text-red-800 hover:bg-red-50"
        >
          Confirm Rejection
        </Button>
      </form>
      <AdminConfirmationDialog
        open={confirmOpen}
        title={title}
        message="Rejecting a payment is a sensitive action. Confirm only after reviewing the proof and writing a clear reason."
        details={(
          <div className="space-y-3">
            <ul className="space-y-1">
              {details.map((detail) => <li key={detail}>• {detail}</li>)}
            </ul>
            <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-black text-red-800">
              Reason: {cleanReason}
            </p>
          </div>
        )}
        confirmLabel={confirmLabel}
        tone="danger"
        onConfirm={() => {
          setConfirmOpen(false);
          onSubmit(cleanReason);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}


function isPaymentReviewQueue(value: string | null): value is PaymentReviewQueue {
  return PAYMENT_REVIEW_TABS.some((tab) => tab.key === value);
}

function getPaymentReviewFiltersFromSearchParams(params: URLSearchParams): {
  search: string;
  queue: PaymentReviewQueue;
  page: number;
} {
  const explicitQueue = params.get('queue');
  const paymentStatus = params.get('paymentStatus');
  const workflow = params.get('workflow');
  const pageValue = Number(params.get('page') ?? '1');

  let queue: PaymentReviewQueue = 'DEPOSIT_SUBMITTED';
  if (isPaymentReviewQueue(explicitQueue)) {
    queue = explicitQueue;
  } else if (workflow === 'CASH_FINAL_PAYMENT_REVIEW') {
    queue = 'CASH_FINAL_PAYMENT_PENDING';
  } else if (isPaymentReviewQueue(paymentStatus)) {
    queue = paymentStatus;
  }

  return {
    search: params.get('search') ?? '',
    queue,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

function buildPaymentReviewUrlSearchParams(filters: {
  search: string;
  queue: PaymentReviewQueue;
  page: number;
}) {
  const tab = PAYMENT_REVIEW_TABS.find((item) => item.key === filters.queue) ?? PAYMENT_REVIEW_TABS[0];
  const params = new URLSearchParams({ queue: filters.queue, workflow: tab.workflow });
  if (tab.paymentStatus) params.set('paymentStatus', tab.paymentStatus);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}


function getPaymentReviewBadgeCount(reports: AdminReports | null, queue: PaymentReviewQueue): number {
  if (!reports) return 0;
  if (queue === 'DEPOSIT_SUBMITTED') return reports.orders.depositReview;
  if (queue === 'FINAL_PAYMENT_SUBMITTED') return reports.orders.finalPaymentReview;
  if (queue === 'CASH_FINAL_PAYMENT_PENDING') return reports.orders.cashFinalPaymentReview;
  return reports.orders.byPaymentStatus.find((row) => row.status === queue)?.count ?? 0;
}

function buildPaymentsReviewQuery(filters: {
  search: string;
  queue: PaymentReviewQueue;
  page: number;
}) {
  const tab = PAYMENT_REVIEW_TABS.find((item) => item.key === filters.queue) ?? PAYMENT_REVIEW_TABS[0];
  const params = new URLSearchParams({
    page: String(filters.page),
    workflow: tab.workflow,
  });
  if (tab.paymentStatus) params.set('paymentStatus', tab.paymentStatus);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  return `&${params.toString()}`;
}

function nextActionLabel(queue: PaymentReviewQueue): string {
  const map: Record<PaymentReviewQueue, string> = {
    DEPOSIT_SUBMITTED: 'Review deposit proof',
    FINAL_PAYMENT_SUBMITTED: 'Review final payment proof',
    CASH_FINAL_PAYMENT_PENDING: 'Review cash final payment',
    DEPOSIT_REJECTED: 'Waiting for new deposit proof',
    FINAL_PAYMENT_REJECTED: 'Waiting for corrected final payment proof',
  };
  return map[queue];
}

function nextActionDescription(queue: PaymentReviewQueue): string {
  const map: Record<PaymentReviewQueue, string> = {
    DEPOSIT_SUBMITTED:
      'If approved, this order leaves Payments Review and appears in Orders as ready for SHEIN batching.',
    FINAL_PAYMENT_SUBMITTED:
      'If approved, the order becomes fully paid and moves to Ready To Deliver.',
    CASH_FINAL_PAYMENT_PENDING:
      'Confirm that the remaining cash amount was received at the store before delivery.',
    DEPOSIT_REJECTED:
      'No admin action is required until the customer uploads a new deposit proof.',
    FINAL_PAYMENT_REJECTED:
      'No admin action is required until the customer uploads a corrected final payment proof.',
  };
  return map[queue];
}

function paymentProofLabel(type: string): string {
  const map: Record<string, string> = {
    DEPOSIT: 'Deposit proof',
    FINAL_PAYMENT: 'Final payment proof',
  };
  return map[type] ?? type;
}

function paymentMethodLabel(method?: string | null): string {
  const map: Record<string, string> = {
    INSTAPAY: 'Instapay',
    VODAFONE: 'Vodafone Cash',
    CASH_AT_SHOP: 'Cash at store',
  };
  return method ? map[method] ?? method : '-';
}

function getReviewAmount(order: AdminOrder, queue: PaymentReviewQueue): string | number {
  if (queue === 'DEPOSIT_SUBMITTED' || queue === 'DEPOSIT_REJECTED') {
    return order.depositAmount ?? order.depositPaidAmount ?? 0;
  }
  if (queue === 'CASH_FINAL_PAYMENT_PENDING') {
    return order.finalAmountDue ?? order.remainingAmount ?? 0;
  }
  return order.finalAmountDue ?? order.remainingAmount ?? 0;
}

function getRemainingAmount(order: AdminOrder): string | number {
  if (order.paymentStatus === 'PAID') return 0;
  if (order.paymentStatus === 'FINAL_PAYMENT_PENDING' || order.paymentStatus === 'FINAL_PAYMENT_SUBMITTED') {
    return order.finalAmountDue ?? order.remainingAmount ?? 0;
  }
  return order.remainingAmount ?? order.finalAmountDue ?? 0;
}

function formatMoney(amount: string | number | undefined, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number(amount ?? 0) / 100,
  );
}
