import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const baseButtonClassName =
  'inline-flex items-center justify-center gap-2 border font-semibold tracking-[0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--color-primary-rgb)/0.35)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] motion-safe:hover:-translate-y-0.5';

export const buttonClassName = baseButtonClassName;

const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
  const variants = {
    primary:
      'glow-button border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-soft)_48%,var(--color-primary-hover))] text-[var(--color-button-text)] shadow-[var(--shadow-gold)] hover:brightness-[1.03] hover:shadow-[0_26px_58px_-28px_rgb(var(--color-primary-rgb)/0.56)]',
    secondary:
      'border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-elevated-rgb)/0.76)] text-[var(--color-text)] shadow-[var(--shadow-subtle)] backdrop-blur-xl hover:border-[color:rgb(var(--color-primary-rgb)/0.2)] hover:bg-[color:rgb(var(--color-surface-rgb)/0.86)]',
    danger:
      'border-[color:rgb(var(--color-error-rgb)/0.35)] bg-[color:rgb(var(--color-error-rgb)/0.12)] text-[var(--color-error)] hover:bg-[color:rgb(var(--color-error-rgb)/0.18)]',
    ghost:
      'border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[color:rgb(var(--color-border-rgb)/0.36)] hover:text-[var(--color-text)]',
    outline:
      'border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-transparent text-[var(--color-text)] hover:border-[color:rgb(var(--color-primary-rgb)/0.44)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)] hover:text-[var(--color-primary-hover)]',
  };

  const sizes = {
    sm: 'h-10 rounded-[var(--radius-sm)] px-4 text-sm',
    md: 'h-11 rounded-[var(--radius-md)] px-[1.125rem] text-sm',
    lg: 'h-12 rounded-[1.15rem] px-6 text-base',
    icon: 'h-10 w-10 rounded-[var(--radius-sm)]',
  };

  return (
    <button
      ref={ref}
      className={cn(
        baseButtonClassName,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export default Button;
