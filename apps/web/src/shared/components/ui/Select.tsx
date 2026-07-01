import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, name, 'aria-label': ariaLabel, ...props }, ref) => (
    <select
      ref={ref}
      name={name}
      aria-label={ariaLabel ?? (typeof name === 'string' && name.trim() ? name.trim() : undefined)}
      className={cn(
        'flex min-h-11 w-full rounded-2xl border bg-card/90 px-4 py-2.5 text-sm shadow-sm transition-colors',
        'border-rs-peach hover:border-rs-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rs-gold/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
