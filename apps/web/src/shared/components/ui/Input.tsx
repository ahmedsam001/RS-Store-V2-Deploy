import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, placeholder, name, 'aria-label': ariaLabel, ...props }, ref) => (
    <input
      ref={ref}
      name={name}
      placeholder={placeholder}
      aria-label={ariaLabel ?? readableLabel(placeholder, name)}
      className={cn(
        'flex min-h-11 w-full rounded-2xl border border-input bg-card/90 px-4 py-2.5 text-sm shadow-sm transition-colors',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
        'hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

function readableLabel(
  placeholder: InputHTMLAttributes<HTMLInputElement>['placeholder'],
  name: InputHTMLAttributes<HTMLInputElement>['name'],
): string | undefined {
  if (typeof placeholder === 'string' && placeholder.trim()) {
    return placeholder.trim();
  }

  return typeof name === 'string' && name.trim() ? name.trim() : undefined;
}
