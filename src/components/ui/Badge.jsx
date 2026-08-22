import React from 'react';
import { cn } from './Button';

const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-border-rgb)/0.24)] text-[var(--color-text-secondary)]',
    secondary: 'border-[color:rgb(var(--color-border-rgb)/0.8)] bg-transparent text-[var(--color-text-secondary)]',
    success: 'border-[color:rgb(var(--color-success-rgb)/0.25)] bg-[color:rgb(var(--color-success-rgb)/0.12)] text-[var(--color-success)]',
    warning: 'border-[color:rgb(var(--color-warning-rgb)/0.25)] bg-[color:rgb(var(--color-warning-rgb)/0.12)] text-[var(--color-warning)]',
    danger: 'border-[color:rgb(var(--color-error-rgb)/0.25)] bg-[color:rgb(var(--color-error-rgb)/0.12)] text-[var(--color-error)]',
    error: 'border-[color:rgb(var(--color-error-rgb)/0.25)] bg-[color:rgb(var(--color-error-rgb)/0.12)] text-[var(--color-error)]',
    info: 'border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] text-[var(--color-primary)]',
    purple: 'border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] text-[var(--color-primary)]',
    premium: 'border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em]',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
