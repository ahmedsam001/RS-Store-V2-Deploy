import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  BarChart3,
  Boxes,
  Clock3,
  CreditCard,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Truck,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { PATHS } from '@/shared/constants/routes';
import {
  adminApi,
  type AdminReportStatusRow,
  type AdminReports,
} from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminCountBadge,
  AdminMetricCard,
  AdminPageHeader,
  AdminStatusBadge,
  labelBatchStatus,
  labelPaymentStatus,
  labelStatus,
} from '@/features/admin/components/AdminDesign';
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState';

type ReportMetric = {
  title: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';
  href?: string;
  count?: number;
};

type StatusTableRow = {
  label: string;
  status: string;
  count: number;
  valueA: string;
  valueB: string;
  href?: string;
};

const PAYMENT_QUEUE_LINKS = {
  deposit: `${PATHS.adminPaymentsReview}?queue=DEPOSIT_SUBMITTED&workflow=PAYMENT_REVIEW&paymentStatus=DEPOSIT_SUBMITTED`,
  final: `${PATHS.adminPaymentsReview}?queue=FINAL_PAYMENT_SUBMITTED&workflow=PAYMENT_REVIEW&paymentStatus=FINAL_PAYMENT_SUBMITTED`,
  cash: `${PATHS.adminPaymentsReview}?queue=CASH_FINAL_PAYMENT_PENDING&workflow=CASH_FINAL_PAYMENT_REVIEW`,
};

export function AdminReportsPage() {
  const [data, setData] = useState<AdminReports | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const response = await adminApi.reports();
      setData(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin reports');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const reportHealth = useMemo(() => {
    if (!data) return { label: 'Loading', tone: 'neutral' as const };
    const reviewCount =
      data.orders.depositReview +
      data.orders.finalPaymentReview +
      data.orders.cashFinalPaymentReview;
    if (reviewCount > 0) return { label: 'Payments need review', tone: 'warning' as const };
    if (data.orders.readyForBatch > 0)
      return { label: 'Orders ready for batching', tone: 'info' as const };
    if (data.batches.open > 0) return { label: 'Open batches active', tone: 'gold' as const };
    return { label: 'Operations clear', tone: 'success' as const };
  }, [data]);

  if (error) return <AdminError message={error} onRetry={load} />;
  if (!data) return <AdminLoading message="Loading admin reports" />;

  const paymentQueueTotal =
    data.orders.depositReview + data.orders.finalPaymentReview + data.orders.cashFinalPaymentReview;

  const financialMetrics: ReportMetric[] = [
    {
      title: 'Customer Sales',
      value: formatMoney(data.money.totalCustomerSalesAmount, 'EGP'),
      hint: 'Active non-cancelled order value',
      icon: ShoppingBag,
      tone: 'gold',
    },
    {
      title: 'Customers Paid',
      value: formatMoney(data.money.totalCustomerPaidAmount, 'EGP'),
      hint: `${formatMoney(data.orders.customerDepositPaidAmount, 'EGP')} deposit + ${formatMoney(data.orders.customerFinalPaidAmount, 'EGP')} final`,
      icon: WalletCards,
      tone: 'success',
    },
    {
      title: 'Customers Remaining',
      value: formatMoney(data.money.totalCustomerRemainingAmount, 'EGP'),
      hint: 'Remaining balance across active customer orders',
      icon: CreditCard,
      tone: toMinorNumber(data.money.totalCustomerRemainingAmount) > 0 ? 'warning' : 'success',
    },
    {
      title: 'SHEIN Total SAR',
      value: formatMoney(data.money.totalSheinSarAmount, 'SAR'),
      hint: 'Active non-cancelled batch cost in SAR',
      icon: Banknote,
      tone: 'info',
    },
    {
      title: 'SHEIN Total EGP',
      value: formatMoney(data.money.totalSheinEgpAmount, 'EGP'),
      hint: 'Active non-cancelled batch cost converted to EGP',
      icon: Banknote,
      tone: 'info',
    },
    {
      title: 'Active Pieces',
      value: data.batches.activeQuantity,
      hint: 'Pieces in active non-cancelled SHEIN batches',
      icon: Boxes,
      tone: data.batches.activeQuantity > 0 ? 'gold' : 'neutral',
    },
  ];

  const orderMetrics: ReportMetric[] = [
    {
      title: 'Ready For Batch',
      value: data.orders.readyForBatch,
      hint: 'Deposit approved and not attached to an active batch',
      icon: ShoppingBag,
      tone: data.orders.readyForBatch > 0 ? 'info' : 'neutral',
      href: `${PATHS.adminOrders}?workflow=READY_FOR_SHEIN_BATCH`,
      count: data.orders.readyForBatch,
    },
    {
      title: 'In Batch',
      value: data.orders.inBatch,
      hint: 'Orders attached to active SHEIN batches',
      icon: Boxes,
      tone: 'gold',
      href: `${PATHS.adminOrders}?workflow=IN_SHEIN_BATCH`,
      count: data.orders.inBatch,
    },
    {
      title: 'Waiting Final Payment',
      value: data.orders.waitingFinalPayment,
      hint: 'Final payment is pending submitted or rejected',
      icon: CreditCard,
      tone: data.orders.waitingFinalPayment > 0 ? 'warning' : 'neutral',
      href: `${PATHS.adminOrders}?workflow=WAITING_FINAL_PAYMENT`,
      count: data.orders.waitingFinalPayment,
    },
    {
      title: 'Ready To Deliver',
      value: data.orders.readyToDeliver,
      hint: 'Fully paid orders ready for handover',
      icon: PackageCheck,
      tone: data.orders.readyToDeliver > 0 ? 'success' : 'neutral',
      href: `${PATHS.adminOrders}?workflow=READY_TO_DELIVER`,
      count: data.orders.readyToDeliver,
    },
  ];

  const batchMetrics: ReportMetric[] = [
    {
      title: 'Open Batches',
      value: data.batches.open,
      hint: 'Collecting ordered shipping and arrived batches',
      icon: Truck,
      tone: data.batches.open > 0 ? 'gold' : 'neutral',
      href: `${PATHS.adminSheinBatches}?statusGroup=COLLECTING`,
      count: data.batches.open,
    },
    {
      title: 'Total Batches',
      value: data.batches.total,
      hint: `${data.batches.totalQuantity} total pieces in all batches`,
      icon: Boxes,
      tone: 'info',
      href: PATHS.adminSheinBatches,
      count: data.batches.total,
    },
    {
      title: 'Completed Batches',
      value: data.batches.completed,
      hint: 'Delivered and closed SHEIN batches',
      icon: PackageCheck,
      tone: 'success',
      href: `${PATHS.adminSheinBatches}?statusGroup=COMPLETED`,
      count: data.batches.completed,
    },
    {
      title: 'Cancelled Batches',
      value: data.batches.cancelled,
      hint: 'Cancelled SHEIN batches',
      icon: Clock3,
      tone: data.batches.cancelled > 0 ? 'danger' : 'neutral',
      href: `${PATHS.adminSheinBatches}?statusGroup=CANCELLED`,
      count: data.batches.cancelled,
    },
  ];

  const orderStatusRows = data.orders.byStatus.map((row) => ({
    label: labelStatus(row.status),
    status: row.status,
    count: row.count,
    valueA: formatMoney(row.paidAmount, 'EGP'),
    valueB: formatMoney(row.remainingAmount, 'EGP'),
    href: orderStatusHref(row.status),
  }));

  const paymentStatusRows = data.orders.byPaymentStatus.map((row) => ({
    label: labelPaymentStatus(row.status),
    status: row.status,
    count: row.count,
    valueA: formatMoney(row.paidAmount, 'EGP'),
    valueB: formatMoney(row.remainingAmount, 'EGP'),
    href: paymentStatusHref(row.status),
  }));

  const batchStatusRows = data.batches.byStatus.map((row) => ({
    label: labelBatchStatus(row.status),
    status: row.status,
    count: row.count,
    valueA: formatMoney(row.totalSarAmount, 'SAR'),
    valueB: formatMoney(row.totalEgpAmount, 'EGP'),
    href: `${PATHS.adminSheinBatches}?statusGroup=${batchStatusToGroup(row.status)}`,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reports"
        title="Operational Reports"
        description="Real-time money orders payments and SHEIN batch reporting for daily admin decisions"
        meta={<AdminStatusBadge tone={reportHealth.tone}>{reportHealth.label}</AdminStatusBadge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={load} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </Button>
            <Button asChild variant="outline">
              <Link to={PATHS.adminPaymentsReview}>Payments</Link>
            </Button>
            <Button asChild>
              <Link to={`${PATHS.adminSheinBatches}?statusGroup=COLLECTING`}>Open Batches</Link>
            </Button>
          </div>
        }
      />

      <ReportSection
        title="Financial Summary"
        description="Customer collections and SHEIN batch cost from current data"
        badgeCount={financialMetrics.length}
      >
        <MetricGrid metrics={financialMetrics} />
      </ReportSection>

      <ReportSection
        title="Orders Summary"
        description={`${data.orders.active} active orders from ${data.orders.total} total`}
        badgeCount={data.orders.active}
      >
        <MetricGrid metrics={orderMetrics} />
        <StatusTable
          title="Orders By Status"
          rows={orderStatusRows}
          valueAHeader="Paid"
          valueBHeader="Remaining"
          emptyMessage="No order status data yet"
        />
      </ReportSection>

      <ReportSection
        title="Payments Queue"
        description="Review queues and payment status totals"
        badgeCount={paymentQueueTotal}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <QueueLink
            icon={CreditCard}
            label="Deposit Review"
            value={data.orders.depositReview}
            href={PAYMENT_QUEUE_LINKS.deposit}
          />
          <QueueLink
            icon={WalletCards}
            label="Final Payment Review"
            value={data.orders.finalPaymentReview}
            href={PAYMENT_QUEUE_LINKS.final}
          />
          <QueueLink
            icon={Banknote}
            label="Cash Final Review"
            value={data.orders.cashFinalPaymentReview}
            href={PAYMENT_QUEUE_LINKS.cash}
          />
        </div>
        <StatusTable
          title="Orders By Payment Status"
          rows={paymentStatusRows}
          valueAHeader="Paid"
          valueBHeader="Remaining"
          emptyMessage="No payment status data yet"
        />
      </ReportSection>

      <ReportSection
        title="SHEIN Batches"
        description={`${data.batches.open} open batches with ${data.batches.activeQuantity} active pieces`}
        badgeCount={data.batches.open}
      >
        <MetricGrid metrics={batchMetrics} />
        <StatusTable
          title="Batches By Status"
          rows={batchStatusRows}
          valueAHeader="SAR"
          valueBHeader="EGP"
          emptyMessage="No SHEIN batch status data yet"
        />
      </ReportSection>

      <ReportSection
        title="Open Batches"
        description="Most recently updated open SHEIN batches"
        badgeCount={data.batches.openItems.length}
        action={
          <Link
            className="text-sm font-black text-[#c7831e]"
            to={`${PATHS.adminSheinBatches}?statusGroup=COLLECTING`}
          >
            View all
          </Link>
        }
      >
        {data.batches.openItems.length === 0 ? (
          <AdminEmpty message="No open SHEIN batches right now" />
        ) : null}
        <div className="grid gap-3">
          {data.batches.openItems.map((batch) => (
            <Link
              key={batch.id}
              to={`${PATHS.adminSheinBatches}?statusGroup=${batchStatusToGroup(batch.status)}`}
              className="admin-list-card block transition hover:bg-[#fff8ef]"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,auto)] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong data-no-admin-translate className="text-[#241611]">
                      {batch.batchCode}
                    </strong>
                    <AdminStatusBadge value={batch.status}>
                      {labelBatchStatus(batch.status)}
                    </AdminStatusBadge>
                    <AdminCountBadge count={batch.orderCount} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {batch.title || 'SHEIN batch'} - {batch.orderCount} orders - {batch.itemsCount}{' '}
                    items - {batch.totalQuantity} pieces
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {formatDate(batch.updatedAt)}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <AmountPill label="SAR" value={formatMoney(batch.totalSarAmount, 'SAR')} />
                  <AmountPill label="EGP" value={formatMoney(batch.totalEgpAmount, 'EGP')} />
                  <AmountPill label="Rate" value={formatRate(batch.exchangeRateSarToEgp)} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ReportSection>

      <p className="text-xs text-muted-foreground">Generated at {formatDate(data.generatedAt)}</p>
    </div>
  );
}

function ReportSection({
  title,
  description,
  badgeCount,
  action,
  children,
}: {
  title: string;
  description: string;
  badgeCount: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AdminCard
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-2">
          <AdminCountBadge count={badgeCount} />
          {action}
        </div>
      }
      contentClassName="space-y-4"
    >
      {children}
    </AdminCard>
  );
}

function MetricGrid({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <ReportMetricCard key={metric.title} metric={metric} />
      ))}
    </div>
  );
}

function ReportMetricCard({ metric }: { metric: ReportMetric }) {
  const content = (
    <AdminMetricCard
      title={metric.title}
      value={metric.value}
      icon={metric.icon}
      hint={metric.hint}
      tone={metric.tone}
    >
      {typeof metric.count === 'number' ? <AdminCountBadge count={metric.count} /> : null}
    </AdminMetricCard>
  );
  if (metric.href)
    return (
      <Link to={metric.href} className="block min-w-0">
        {content}
      </Link>
    );
  return content;
}

function StatusTable({
  title,
  rows,
  valueAHeader,
  valueBHeader,
  emptyMessage,
}: {
  title: string;
  rows: StatusTableRow[];
  valueAHeader: string;
  valueBHeader: string;
  emptyMessage: string;
}) {
  const hasAnyRows = rows.some((row) => row.count > 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#f2decf]">
      <div className="flex items-center justify-between gap-2 border-b border-[#f2decf] bg-[#fff8ef] px-4 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <BarChart3 className="h-4 w-4 shrink-0 text-[#c7831e]" />
          <strong className="truncate text-sm text-[#241611]">{title}</strong>
        </span>
        <AdminCountBadge count={rows.reduce((total, row) => total + row.count, 0)} />
      </div>
      {!hasAnyRows ? (
        <div className="p-4">
          <AdminEmpty message={emptyMessage} />
        </div>
      ) : null}
      {hasAnyRows ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#f2decf] text-sm">
            <thead className="bg-[#fffcfa] text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-4 py-3">{valueAHeader}</th>
                <th className="px-4 py-3">{valueBHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2decf] bg-white">
              {rows.map((row) => (
                <StatusTableRowView key={row.status} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function StatusTableRowView({ row }: { row: StatusTableRow }) {
  const content = (
    <>
      <td className="px-4 py-3">
        <AdminStatusBadge value={row.status}>{row.label}</AdminStatusBadge>
      </td>
      <td className="px-4 py-3">
        <AdminCountBadge count={row.count} />
      </td>
      <td className="px-4 py-3 font-bold text-[#241611]">{row.valueA}</td>
      <td className="px-4 py-3 font-bold text-[#241611]">{row.valueB}</td>
    </>
  );
  if (!row.href) return <tr>{content}</tr>;
  return (
    <tr className="transition hover:bg-[#fffaf3]">
      <td colSpan={4} className="p-0">
        <Link
          to={row.href}
          className="grid min-w-[680px] grid-cols-[1.2fr_0.7fr_1fr_1fr] items-center"
        >
          <span className="px-4 py-3">
            <AdminStatusBadge value={row.status}>{row.label}</AdminStatusBadge>
          </span>
          <span className="px-4 py-3">
            <AdminCountBadge count={row.count} />
          </span>
          <span className="px-4 py-3 font-bold text-[#241611]">{row.valueA}</span>
          <span className="px-4 py-3 font-bold text-[#241611]">{row.valueB}</span>
        </Link>
      </td>
    </tr>
  );
}

function QueueLink({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="admin-list-card flex items-center justify-between gap-3 transition hover:bg-[#fff8ef]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#fff6e4] text-[#9a5b00]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="truncate text-sm font-black text-[#241611]">{label}</span>
      </div>
      <AdminCountBadge count={value} />
    </Link>
  );
}

function AmountPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-2xl bg-[#fff6e4] px-3 py-2">
      <span className="block text-[11px] font-black uppercase text-[#9a5b00]">{label}</span>
      <strong className="block text-sm font-black text-[#241611]">{value}</strong>
    </span>
  );
}

function paymentStatusHref(status: string): string {
  const map: Record<string, string> = {
    DEPOSIT_SUBMITTED: PAYMENT_QUEUE_LINKS.deposit,
    FINAL_PAYMENT_SUBMITTED: PAYMENT_QUEUE_LINKS.final,
    FINAL_PAYMENT_PENDING: `${PATHS.adminOrders}?workflow=WAITING_FINAL_PAYMENT`,
    FINAL_PAYMENT_REJECTED: `${PATHS.adminPaymentsReview}?queue=FINAL_PAYMENT_REJECTED&workflow=PAYMENT_REVIEW&paymentStatus=FINAL_PAYMENT_REJECTED`,
    DEPOSIT_REJECTED: `${PATHS.adminPaymentsReview}?queue=DEPOSIT_REJECTED&workflow=PAYMENT_REVIEW&paymentStatus=DEPOSIT_REJECTED`,
    DEPOSIT_APPROVED: `${PATHS.adminOrders}?workflow=READY_FOR_SHEIN_BATCH`,
    PAID: `${PATHS.adminOrders}?workflow=READY_TO_DELIVER`,
  };
  return map[status] ?? PATHS.adminPaymentsReview;
}

function orderStatusHref(status: string): string | undefined {
  const map: Record<string, string> = {
    COMPLETED: `${PATHS.adminOrders}?workflow=COMPLETED`,
    CANCELLED: `${PATHS.adminOrders}?workflow=CANCELLED`,
    SHIPPED: `${PATHS.adminOrders}?workflow=READY_TO_DELIVER`,
    PROCESSING: `${PATHS.adminOrders}?workflow=IN_SHEIN_BATCH`,
    CONFIRMED: `${PATHS.adminOrders}?workflow=READY_FOR_SHEIN_BATCH`,
  };
  return map[status];
}

function batchStatusToGroup(status: string): string {
  if (status === 'DRAFT') return 'COLLECTING';
  if (status === 'ORDERED_FROM_SHEIN') return 'ORDERED';
  if (['SHIPPING', 'CUSTOMS', 'ARRIVED_EGYPT'].includes(status)) return 'IN_SHIPPING';
  if (['ARRIVED_STORE', 'READY_FOR_PICKUP'].includes(status)) return 'ARRIVED_SHOP';
  if (status === 'DELIVERED') return 'COMPLETED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'COLLECTING';
}

function formatMoney(amount: AdminReportStatusRow['totalAmount'], currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    toMinorNumber(amount) / 100,
  );
}

function formatRate(value: string | number | undefined): string {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
}

function toMinorNumber(value: string | number | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}
