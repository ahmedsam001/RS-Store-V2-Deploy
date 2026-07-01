import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'premium' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  premium:
    'bg-[hsl(var(--brand-gold))] text-slate-950 shadow-sm hover:bg-[hsl(var(--brand-gold))]/90',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  outline:
    'border border-input bg-card/90 shadow-sm hover:border-primary/25 hover:bg-accent/70 hover:text-accent-foreground',
  ghost: 'hover:bg-accent/70 hover:text-accent-foreground',
  danger: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-full px-3 text-xs',
  md: 'min-h-11 rounded-full px-5 py-2',
  lg: 'min-h-12 rounded-full px-7 text-base',
  icon: 'h-11 w-11 rounded-full p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, className, size = 'md', type = 'button', variant = 'default', ...props }, ref) => {
    const classes = cn(
      'inline-flex min-w-0 items-center justify-center gap-2 whitespace-normal text-center text-sm font-bold leading-snug transition duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    if (asChild) {
      return <Slot ref={ref} className={classes} {...props} />;
    }

    return <button ref={ref} type={type} className={classes} {...props} />;
  },
);

Button.displayName = 'Button';
