import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export function AdminMobileList({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:hidden">{children}</div>;
}

export function AdminDesktopTable({ children }: { children: ReactNode }) {
  return (
    <div className="premium-scrollbar hidden overflow-x-auto rounded-[1.5rem] md:block">
      {children}
    </div>
  );
}

type AdminMobileDataCardProps = {
  title: ReactNode;
  badge?: ReactNode;
  media?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
};

export function AdminMobileDataCard({
  title,
  badge,
  media,
  meta,
  children,
  actions,
  selected = false,
  onClick,
  className,
  ariaLabel,
}: AdminMobileDataCardProps) {
  const body = (
    <>
      <div className="admin-mobile-card-head">
        {media ? <div className="admin-mobile-card-media">{media}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="admin-mobile-card-title">{title}</strong>
            {badge}
          </div>
          {meta ? <div className="admin-mobile-card-meta">{meta}</div> : null}
        </div>
      </div>
      {children ? <div className="admin-mobile-field-grid">{children}</div> : null}
    </>
  );

  return (
    <article className={cn('admin-mobile-card', selected && 'is-active', className)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          aria-label={ariaLabel}
          className="block w-full min-w-0 text-start"
        >
          {body}
        </button>
      ) : (
        body
      )}
      {actions ? <div className="admin-action-row">{actions}</div> : null}
    </article>
  );
}

export function AdminMobileField({
  label,
  value,
  dir,
}: {
  label: string;
  value: ReactNode;
  dir?: 'rtl' | 'ltr';
}) {
  return (
    <div className="admin-mobile-field">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong dir={dir} className="block text-sm font-bold text-foreground">
        {value}
      </strong>
    </div>
  );
}
