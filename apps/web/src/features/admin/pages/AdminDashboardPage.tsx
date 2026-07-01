import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '@/shared/constants/routes';
import {
  AlertTriangle,
  BadgePercent,
  Bell,
  Boxes,
  CheckCircle2,
  CreditCard,
  FolderTree,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';
import {
  adminApi,
  type AdminNotification,
  type AdminOverview,
} from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminMetricCard,
  AdminPageHeader,
  AdminStatusBadge,
} from '@/features/admin/components/AdminDesign';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { useAuth } from '@/features/auth';

export function AdminDashboardPage() {
  const { csrfToken } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const [overview, noticeResponse] = await Promise.all([
        adminApi.overview(),
        adminApi.notifications(),
      ]);
      setData(overview);
      setNotifications(noticeResponse);
      setError(null);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const health = useMemo(() => {
    if (!data)
      return { label: 'Loading', tone: 'neutral' as const, message: 'Loading store status' };
    const blockers =
      data.pendingPaymentProofsCount + data.failedSheinImportsCount + data.lowStockVariantsCount;
    if (blockers > 0)
      return {
        label: 'Needs attention',
        tone: 'warning' as const,
        message: `${blockers} task${blockers > 1 ? 's' : ''} need review`,
      };
    return { label: 'Healthy', tone: 'success' as const, message: 'All systems are stable' };
  }, [data]);

  if (error)
    return (
      <AdminError
        message={error}
        onRetry={() => load().catch((err: Error) => setError(err.message))}
      />
    );
  if (!data) return <AdminLoading />;

  const primaryMetrics: MetricCard[] = [
    {
      title: 'Total Orders',
      titleEn: 'Total orders',
      value: data.ordersCount,
      icon: ShoppingBag,
      href: PATHS.adminOrders,
      hint: `${data.pendingOrdersCount} new order${data.pendingOrdersCount > 1 ? 's' : ''}`,
      tone: data.pendingOrdersCount > 0 ? 'info' : 'neutral',
    },
    {
      title: 'Today Revenue',
      titleEn: 'Today revenue',
      value: formatMoney(data.todayRevenueAmount, 'EGP'),
      icon: TrendingUp,
      href: PATHS.adminOrders,
      hint: `${data.todayOrdersCount} order${data.todayOrdersCount > 1 ? 's' : ''} today`,
      tone: 'success',
    },
    {
      title: 'Products',
      titleEn: 'Products',
      value: data.productsCount,
      icon: Package,
      href: PATHS.adminProducts,
      hint: `${data.activeProductsCount} published, ${data.draftProductsCount} draft`,
      tone: data.draftProductsCount > 0 ? 'warning' : 'neutral',
    },
    {
      title: 'Flash Sales',
      titleEn: 'Flash sales',
      value: data.activeFlashSalesCount,
      icon: BadgePercent,
      href: PATHS.adminFlashSales,
      hint: `${data.scheduledFlashSalesCount} scheduled sale${data.scheduledFlashSalesCount > 1 ? 's' : ''}`,
      tone: data.activeFlashSalesCount > 0 ? 'gold' : 'neutral',
    },
  ];

  const operations: OperationCard[] = [
    {
      title: 'Pending Payment Proofs',
      value: data.pendingPaymentProofsCount,
      href: PATHS.adminPaymentsReview,
      icon: CreditCard,
      action: 'Review payment',
      danger: data.pendingPaymentProofsCount > 0,
    },
    {
      title: 'SHEIN Orders Processing',
      value: data.pendingSheinImportsCount,
      href: PATHS.adminShein,
      icon: Sparkles,
      action: 'Open import',
      danger: data.failedSheinImportsCount > 0,
      meta: `${data.failedSheinImportsCount} failed`,
    },
    {
      title: 'Low Stock Variants',
      value: data.lowStockVariantsCount,
      href: PATHS.adminProducts,
      icon: Boxes,
      action: 'Update stock',
      danger: data.lowStockVariantsCount > 0,
    },
    {
      title: 'Products Without Images',
      value: data.productsWithoutImagesCount,
      href: PATHS.adminProducts,
      icon: AlertTriangle,
      action: 'Add images',
      danger: data.productsWithoutImagesCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="RS Store Dashboard"
        description="Quick operational overview of orders, payments, sales, imports, and inventory from one place"
        meta={<AdminStatusBadge tone={health.tone}>{health.label}</AdminStatusBadge>}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => load().catch((err: Error) => setError(err.message))}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing' : 'Refresh data'}
          </Button>
        }
      />

      <section className="admin-dashboard-hero">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-black text-white ring-1 ring-white/15">
                {health.message}
              </span>
              <span className="text-sm text-white/60">{new Date().toLocaleString('en-US')}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-4xl">
                Clear and Quick Store Management
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Track orders, payments, sales, and SHEIN imports from a single, organized interface optimized for mobile and desktop
              </p>
            </div>
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
               <Link
                 className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#241611] transition hover:bg-white/90"
                 to={PATHS.adminProducts}
               >
                 Add Product
               </Link>
               <Link
                 className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-black text-white transition hover:bg-white/10"
                 to={PATHS.adminOrders}
               >
                 Review Orders
               </Link>
               <Link
                 className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-black text-white transition hover:bg-white/10"
                 to={PATHS.adminShein}
               >
                 Import SHEIN
               </Link>
               <Link
                 className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-black text-white transition hover:bg-white/10"
                 to={PATHS.adminReports}
               >
                 View Reports
               </Link>
             </div>
          </div>
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
             <HeroStat icon={CheckCircle2} label="System Status" value={health.message} />
             <HeroStat
               icon={Bell}
               label="Unread notifications"
               value={`${data.unreadNotificationsCount} notification${data.unreadNotificationsCount > 1 ? 's' : ''}`}
             />
             <HeroStat
               icon={FolderTree}
               label="Active categories"
               value={`${data.activeCategoriesCount} of ${data.categoriesCount}`}
             />
           </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((metric) => (
          <Link key={metric.title} to={metric.href} className="block min-w-0">
            <AdminMetricCard
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              hint={metric.hint}
              tone={metric.tone}
            >
              <Badge variant="secondary" className="rounded-full bg-[#fff6e4] text-[#9a5b00]">
                {metric.titleEn}
              </Badge>
            </AdminMetricCard>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <AdminCard title="Daily Operations Center" description="Top priorities to review before anything else">
          <div className="grid gap-3 sm:grid-cols-2">
            {operations.map((operation) => (
              <Operation key={operation.title} operation={operation} />
            ))}
          </div>
        </AdminCard>

<AdminCard
           title="Notifications"
           description="Admin notifications from orders and SHEIN imports"
           contentClassName="max-h-[430px] overflow-auto space-y-3 premium-scrollbar"
         >
           {notifications.length === 0 ? (
             <EmptyInline icon={Bell} title="No new notifications" />
           ) : null}
          {notifications.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onRead={() => adminApi.markNotificationRead(item.id, { csrfToken }).then(load)}
            />
          ))}
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
<AdminCard
           title="Recent Orders"
           description="Quick tracking of orders and payment status"
           actions={
             <Link className="text-sm font-black text-[#c7831e]" to={PATHS.adminOrders}>
               View All Orders
             </Link>
           }
           contentClassName="space-y-3"
         >
           {data.recentOrders.length === 0 ? (
             <EmptyInline icon={ShoppingBag} title="No orders yet" />
           ) : null}
          {data.recentOrders.map((order) => (
            <RecentOrderRow key={order.id} order={order} />
          ))}
        </AdminCard>

        <div className="grid gap-4">
<AdminCard
             title="SHEIN Import"
             description="Recent import links"
             actions={
               <Link className="text-sm font-black text-[#c7831e]" to={PATHS.adminShein}>
                 Open
               </Link>
             }
             contentClassName="space-y-3"
           >
             {data.recentSheinImports.length === 0 ? (
               <EmptyInline icon={Sparkles} title="No imports yet" />
             ) : null}
            {data.recentSheinImports.map((item) => (
              <SheinImportRow key={item.id} item={item} />
            ))}
          </AdminCard>

<AdminCard
             title="Low Stock"
             description="Priority stock adjustment needed"
             contentClassName="space-y-3"
           >
             {data.lowStockVariants.length === 0 ? (
               <EmptyInline icon={Boxes} title="No low stock variants" />
             ) : null}
            {data.lowStockVariants.map((variant) => (
              <LowStockRow key={variant.id} variant={variant} />
            ))}
          </AdminCard>
        </div>
      </section>
    </div>
  );
}

type MetricCard = {
  title: string;
  titleEn: string;
  value: string | number;
  icon: LucideIcon;
  href: string;
  hint: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';
};
type OperationCard = {
  title: string;
  value: number;
  href: string;
  icon: LucideIcon;
  action: string;
  danger?: boolean;
  meta?: string;
};

function Operation({ operation }: { operation: OperationCard }) {
  const Icon = operation.icon;
  return (
    <Link
      to={operation.href}
      className={cn(
        'admin-list-card block transition hover:-translate-y-0.5',
        operation.danger && 'border-amber-200 bg-amber-50',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#241611]">{operation.title}</p>
            {operation.meta ? (
              <p className="text-xs text-muted-foreground">{operation.meta}</p>
            ) : null}
          </div>
        </div>
        <span className="text-2xl font-black text-[#241611]">{operation.value}</span>
      </div>
      <p className="mt-3 text-sm font-black text-[#c7831e]">{operation.action}</p>
    </Link>
  );
}

function NotificationRow({
  item,
  onRead,
}: {
  item: AdminNotification;
  onRead: () => Promise<unknown>;
}) {
  return (
    <article className="admin-list-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-[#241611]">{item.titleAr}</strong>
            <Badge variant="secondary">{item.type}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.messageAr}</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
        </div>
{item.readAt ? (
           <AdminStatusBadge tone="success">Read</AdminStatusBadge>
         ) : (
            <Button size="sm" variant="outline" type="button" onClick={() => void onRead()}>
             Mark as Read
           </Button>
         )}
      </div>
    </article>
  );
}

function RecentOrderRow({ order }: { order: AdminOverview['recentOrders'][number] }) {
  return (
    <Link
      to={PATHS.adminOrders}
      className="admin-list-card grid gap-3 transition hover:bg-[#fff8ef] sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-[#241611]">{order.orderNumber}</strong>
          <AdminStatusBadge value={order.status} />
          <AdminStatusBadge value={order.paymentStatus} />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {order.customerNameSnapshot ?? '-'} · {order.customerPhoneSnapshot ?? '-'} ·{' '}
          {formatDate(order.createdAt)}
        </p>
      </div>
      <p className="text-lg font-black text-[#241611]">
        {formatMoney(order.totalAmount, order.currency)}
      </p>
    </Link>
  );
}

function SheinImportRow({ item }: { item: AdminOverview['recentSheinImports'][number] }) {
  return (
    <Link to={PATHS.adminShein} className="admin-list-card block transition hover:bg-[#fff8ef]">
      <div className="flex items-center justify-between gap-2">
        <strong className="truncate text-sm text-[#241611]">
          {item.createdProduct?.nameAr ?? item.sourceUrl}
        </strong>
        <AdminStatusBadge value={item.status} />
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {item.errorMessage ?? item.sourceUrl}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
    </Link>
  );
}

function LowStockRow({ variant }: { variant: AdminOverview['lowStockVariants'][number] }) {
  return (
    <Link
      to={PATHS.adminProducts}
      className="admin-list-card flex items-center justify-between gap-3 transition hover:bg-[#fff8ef]"
    >
      <div className="min-w-0">
        <strong className="truncate text-sm text-[#241611]">{variant.product.nameAr}</strong>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {variant.nameAr} {variant.size ? `· ${variant.size}` : ''}{' '}
          {variant.color ? `· ${variant.color}` : ''}
        </p>
      </div>
      <AdminStatusBadge tone={variant.stockQuantity === 0 ? 'danger' : 'warning'}>
        {variant.stockQuantity}
      </AdminStatusBadge>
    </Link>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-white/50">{label}</p>
          <p className="text-sm font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyInline({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-dashed border-[#e8c7b0] bg-[#fffcfa] p-4 text-center text-muted-foreground">
      <Icon className="mb-2 h-5 w-5" />
      <p className="text-sm font-bold">{title}</p>
    </div>
  );
}

function formatMoney(amount: string | number | undefined, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number(amount ?? 0) / 100,
  );
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}
