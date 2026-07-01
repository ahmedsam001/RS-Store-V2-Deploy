import { type FormHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MessageCircle } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { cn } from '@/shared/utils/cn';

export type AdminStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function AdminPageHeader({
  eyebrow = 'RS Store Admin',
  title,
  description,
  actions,
  meta,
}: AdminPageHeaderProps) {
  return (
    <section className="admin-page-header">
      <div className="min-w-0 space-y-2">
        <p className="admin-eyebrow">{eyebrow}</p>
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="admin-page-title">{title}</h2>
          {meta ? <div className="admin-page-meta">{meta}</div> : null}
        </div>
        {description ? <p className="admin-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </section>
  );
}

type AdminCardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  actions?: ReactNode;
  contentClassName?: string;
  children?: ReactNode;
};

export function AdminCard({
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
  ...props
}: AdminCardProps) {
  return (
    <Card className={cn('admin-card', className)} {...props}>
      {title || description || actions ? (
        <CardHeader className="admin-card-header">
          <div className="min-w-0">
            {title ? <CardTitle className="admin-card-title">{title}</CardTitle> : null}
            {description ? <p className="admin-card-description">{description}</p> : null}
          </div>
          {actions ? <div className="admin-card-actions">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('admin-card-content', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function AdminFilterBar({
  className,
  children,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form className={cn('admin-filter-bar', className)} {...props}>
      {children}
    </form>
  );
}

export function AdminFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('admin-form-section', className)}>
      <div className="admin-form-section-head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="admin-form-section-body">{children}</div>
    </section>
  );
}

export function AdminMetricCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = 'neutral',
  children,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: AdminStatusTone;
  children?: ReactNode;
}) {
  return (
    <div className="admin-metric-card">
      <div className="flex items-start justify-between gap-3">
        <span className={cn('admin-metric-icon', statusToneClass(tone))}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {children}
      </div>
      <p className="admin-metric-label">{title}</p>
      <p className="admin-metric-value">{value}</p>
      {hint ? <p className="admin-metric-hint">{hint}</p> : null}
    </div>
  );
}

export function AdminStatusBadge({
  value,
  children,
  tone,
}: {
  value?: string;
  children?: ReactNode;
  tone?: AdminStatusTone;
}) {
  const safeValue = value ?? '';
  const resolvedTone = tone ?? inferStatusTone(safeValue);
  return (
    <Badge variant="outline" className={cn('admin-status-badge', statusToneClass(resolvedTone))}>
      {children ?? labelStatus(safeValue)}
    </Badge>
  );
}


export function AdminCountBadge({ count }: { count?: number | null }) {
  const display = typeof count === 'number' ? count : 0;
  return (
    <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-[#d9a441] bg-[#fff7df] px-2 py-0.5 text-xs font-black tabular-nums text-[#8a5a10]">
      {display}
    </span>
  );
}

export function AdminInfoItem({
  label,
  value,
  dir,
}: {
  label: string;
  value: ReactNode;
  dir?: 'rtl' | 'ltr';
}) {
  return (
    <div className="admin-info-item">
      <p>{label}</p>
      <strong dir={dir}>{value}</strong>
    </div>
  );
}

export function AdminSoftPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('admin-soft-panel', className)}>{children}</div>;
}

export function inferStatusTone(value: string): AdminStatusTone {
  if (
    [
      'ACTIVE',
      'APPROVED',
      'PAID',
      'COMPLETED',
      'SUCCEEDED',
      'PRODUCT_CREATED',
      'PUBLISHED',
      'REVIEWED',
      'DELIVERED',
      'ARRIVED_STORE',
      'READY_FOR_PICKUP',
      'DEPOSIT_APPROVED',
      'FINAL_PAYMENT_APPROVED',
    ].includes(value)
  )
    return 'success';
  if (
    [
      'FAILED',
      'REJECTED',
      'CANCELLED',
      'ARCHIVED',
      'DEPOSIT_REJECTED',
      'FINAL_PAYMENT_REJECTED',
    ].includes(value)
  )
    return 'danger';
  if (
    [
      'PENDING',
      'DEPOSIT_PENDING',
      'DEPOSIT_SUBMITTED',
      'SUBMITTED',
      'PREVIEW_READY',
      'REVIEWING',
      'PROCESSING',
      'ORDERED_FROM_SHEIN',
      'SHIPPING',
      'CUSTOMS',
      'ARRIVED_EGYPT',
      'FINAL_PAYMENT_PENDING',
      'FINAL_PAYMENT_SUBMITTED',
      'SCHEDULED',
      'EXTRACTING',
      'MANUAL_REVIEW',
    ].includes(value)
  )
    return 'warning';
  if (['DRAFT', 'PAUSED', 'INACTIVE', 'OUT_OF_STOCK'].includes(value)) return 'neutral';
  return 'info';
}

function statusToneClass(tone: AdminStatusTone): string {
  const map: Record<AdminStatusTone, string> = {
    success: 'admin-tone-success',
    warning: 'admin-tone-warning',
    danger: 'admin-tone-danger',
    info: 'admin-tone-info',
    neutral: 'admin-tone-neutral',
    gold: 'admin-tone-gold',
  };
  return map[tone];
}

export function labelStatus(value: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DEPOSIT_PENDING: 'Waiting Deposit',
    DEPOSIT_SUBMITTED: 'Deposit Review',
    DEPOSIT_APPROVED: 'Deposit Approved',
    DEPOSIT_REJECTED: 'Deposit Rejected',
    FINAL_PAYMENT_PENDING: 'Waiting Final Payment',
    FINAL_PAYMENT_SUBMITTED: 'Final Payment Review',
    FINAL_PAYMENT_APPROVED: 'Final Payment Approved',
    FINAL_PAYMENT_REJECTED: 'Final Payment Rejected',
    PAID: 'Paid',
    ACTIVE: 'Active',
    SCHEDULED: 'Scheduled',
    PAUSED: 'Paused',
    EXPIRED: 'Expired',
    FAILED: 'Failed',
    PREVIEW_READY: 'Preview ready',
    REVIEWING: 'Under review',
    APPROVED: 'Approved',
    SUBMITTED: 'Submitted',
    REJECTED: 'Rejected',
    PRODUCT_CREATED: 'Product created',
    PUBLISHED: 'Published',
    SUCCEEDED: 'Success',
    DRAFT: 'Draft',
    ORDERED_FROM_SHEIN: 'Ordered',
    SHIPPING: 'In Shipping',
    CUSTOMS: 'At Customs',
    ARRIVED_EGYPT: 'Arrived Egypt',
    ARRIVED_STORE: 'Arrived Shop',
    READY_FOR_PICKUP: 'Ready To Deliver',
    DELIVERED: 'Delivered',
    ARCHIVED: 'Archived',
    OUT_OF_STOCK: 'Out of stock',
    INACTIVE: 'Hidden',
    MANUAL_REVIEW: 'Manual review',
    EXTRACTING: 'Extracting',
    REVIEWED: 'Reviewed',
    SHEIN: 'Ordered',
    KUWAIT: 'Arrived Kuwait',
    EGYPT: 'Arrived Egypt',
    SHOP: 'Arrived Shop',
  };
  return map[value] ?? value;
}

export function labelBatchStatus(value: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Collecting',
    ORDERED_FROM_SHEIN: 'Ordered',
    SHIPPING: 'In Shipping',
    CUSTOMS: 'At Customs',
    ARRIVED_EGYPT: 'Arrived Egypt',
    ARRIVED_STORE: 'Arrived Shop',
    READY_FOR_PICKUP: 'Ready To Deliver',
    DELIVERED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return map[value] ?? labelStatus(value);
}

export function labelOrderItemStatus(value: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    SHEIN: 'Ordered',
    KUWAIT: 'Arrived Kuwait',
    CUSTOMS: 'At Customs',
    EGYPT: 'Arrived Egypt',
    SHOP: 'Arrived Shop',
    CANCELLED: 'Cancelled',
  };
  return map[value] ?? labelStatus(value);
}

export function labelPaymentStatus(value: string): string {
  const map: Record<string, string> = {
    DEPOSIT_PENDING: 'Waiting Deposit',
    DEPOSIT_SUBMITTED: 'Deposit Review',
    DEPOSIT_APPROVED: 'Deposit Approved',
    DEPOSIT_REJECTED: 'Deposit Rejected',
    FINAL_PAYMENT_PENDING: 'Waiting Final Payment',
    FINAL_PAYMENT_SUBMITTED: 'Final Payment Review',
    FINAL_PAYMENT_APPROVED: 'Final Payment Approved',
    FINAL_PAYMENT_REJECTED: 'Final Payment Rejected',
    PAID: 'Paid',
  };
  return map[value] ?? labelStatus(value);
}

export function normalizeWhatsappPhone(value: string): string {
  const digits = value.replace(/[\s\-()+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length >= 10) {
    return `20${digits.slice(1)}`;
  }
  return digits;
}

export function buildCustomerWhatsappUrl(
  phone: string | null | undefined,
  customerName: string | null | undefined,
  orderNumber: string,
  orderStatus: string,
  paymentStatus: string,
): string | null {
  const normalizedPhone = normalizeWhatsappPhone(phone ?? '');
  if (!normalizedPhone) return null;
  const message = `Hello ${customerName ?? 'customer'}
Your order ${orderNumber} from RS Store

Order status: ${labelStatus(orderStatus)}
Payment status: ${labelPaymentStatus(paymentStatus)}

We are contacting you regarding your order`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

type CustomerWhatsappButtonProps = {
  phone?: string | null;
  customerName?: string | null;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
};

export function CustomerWhatsappButton({
  phone,
  customerName,
  orderNumber,
  orderStatus,
  paymentStatus,
}: CustomerWhatsappButtonProps) {
  const whatsappUrl = buildCustomerWhatsappUrl(phone, customerName, orderNumber, orderStatus, paymentStatus);
  return whatsappUrl ? (
    <Button asChild variant="outline" size="sm">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        WhatsApp Customer
      </a>
    </Button>
  ) : (
    <Button variant="outline" size="sm" disabled>
      No phone
    </Button>
  );
}

