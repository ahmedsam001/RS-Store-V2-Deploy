import { useEffect, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { orderPath, PATHS } from '@/shared/constants/routes';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { buildCustomerAuthPath, currentPathWithSearch } from '@/shared/lib/return-to';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { ordersApi } from '@/features/orders/api/orders-api';
import { formatOrderDate, formatOrderMoney } from '@/features/orders/order-format';
import type { Order } from '@/shared/types/OrderTypes';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/features/orders/components/OrderStatusBadge';

export function OrdersPage() {
  useDocumentMetadata({
    title: 'My Orders | RS Store',
    description: 'Track your order history and shipping/payment status',
  });
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'anonymous') {
      const returnTo = currentPathWithSearch(
        location.pathname,
        location.search,
        location.hash,
        '/orders',
      );
      navigate(buildCustomerAuthPath(PATHS.login, returnTo), {
        replace: true,
        state: { returnTo, reason: 'auth' },
      });
    }
  }, [location.hash, location.pathname, location.search, navigate, status]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status !== 'authenticated') {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    async function loadOrders() {
      try {
        setIsLoading(true);
        setError(null);
        setOrders(await ordersApi.listMyOrders({ signal: controller.signal }));
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Failed to load orders');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();
    return () => controller.abort();
  }, [status]);

  if (isLoading || status === 'loading')
    return (
      <div className="rs-page-stack">
        <CatalogState title="Loading orders" message="Preparing your order history" />
      </div>
    );
  if (status !== 'authenticated')
    return (
      <div className="rs-page-stack">
        <CatalogState
          title="Sign in required"
          message="Please sign in to view your order history"
          ctaLabel="Sign In"
          ctaHref={PATHS.login}
        />
      </div>
    );
  if (error)
    return (
      <div className="rs-page-stack">
        <CatalogState
          title="Failed to load orders"
          message={error}
          ctaLabel="Try Again"
          ctaHref={PATHS.orders}
        />
      </div>
    );
  if (orders.length === 0)
    return (
      <div className="rs-page-stack">
        <EmptyOrders />
      </div>
    );

  return (
    <div className="rs-page-stack">
      <div className="rs-section-heading text-start">
        <span className="rs-section-kicker">Your Purchase History</span>
        <h1 className="rs-heading-1 mt-2">My Orders</h1>
      </div>
      <div className="grid gap-3 sm:gap-4">
        {orders.map((order) => (
          <CatalogLink
            key={order.id}
            href={orderPath(order.id)}
            className="rs-panel rs-card-hover block p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
                  Order Number
                </p>
                <p className="mt-1 font-black text-lg text-rs-ink">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatOrderDate(order.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            <div className="mt-4 h-px bg-rs-peach-light" />
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                {order.items.length} items
              </span>
              <span className="font-black text-base rs-price-primary">
                {formatOrderMoney(order.totalAmount, order.currency)}
              </span>
            </div>
          </CatalogLink>
        ))}
      </div>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="rs-panel-soft flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageSearch className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-rs-ink">No orders yet</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Your order history will appear here after you complete your first purchase
      </p>
      <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6">
        Start Shopping
      </CatalogLink>
    </div>
  );
}
