import { type HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger';
};

const variants = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'border-border bg-card text-foreground',
  success: 'border-transparent bg-emerald-50 text-emerald-700',
  warning: 'border-transparent bg-amber-50 text-amber-700',
  danger: 'border-transparent bg-red-50 text-red-700',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-bold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
