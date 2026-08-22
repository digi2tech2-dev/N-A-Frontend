import React from 'react';
import { cn } from './Button';

const Switch = ({ checked, onChange, disabled = false, className, size = 'md', ...props }) => {
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center overflow-hidden rounded-full border p-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--color-primary-rgb)/0.4)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-55',
        isSm ? 'h-6 w-11' : 'h-7 w-12',
        checked
          ? 'border-[color:rgb(var(--color-primary-rgb)/0.4)] bg-[var(--color-primary)]'
          : 'border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-elevated-rgb)/0.86)]',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'block rounded-full bg-[var(--color-surface)] shadow-md transition-transform',
          isSm ? 'h-5 w-5' : 'h-6 w-6',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
};

export default Switch;
