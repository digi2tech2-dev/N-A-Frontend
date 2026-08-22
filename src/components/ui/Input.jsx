import React from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from './Button';
import { useLanguage } from '../../context/LanguageContext';

export const inputBaseClassName =
  'flex h-11 w-full rounded-[var(--radius-lg)] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.92)] px-3.5 py-2.5 text-base text-[var(--color-text)] placeholder:text-[var(--color-muted)] shadow-[var(--shadow-subtle)] transition-all duration-200 hover:border-[color:rgb(var(--color-primary-rgb)/0.22)] focus:border-[color:rgb(var(--color-primary-rgb)/0.45)] focus:bg-[color:rgb(var(--color-surface-rgb)/0.98)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--color-primary-rgb)/0.12)] focus:shadow-[var(--shadow-subtle),var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-55 sm:px-4 sm:py-3 sm:text-sm';
export const textareaClassName = cn(inputBaseClassName, 'min-h-[96px] resize-none py-2.5 sm:min-h-[120px] sm:py-3');
export const selectClassName = cn(inputBaseClassName, 'appearance-none pr-10');
export const searchInputClassName = cn(
  inputBaseClassName,
  'h-11 rounded-full border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-surface-rgb)/0.9)] sm:h-12'
);

const Input = React.forwardRef(({ className, label, error, icon, suffix, variant = 'default', ...props }, ref) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const isSearch = variant === 'search';

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)] sm:text-sm">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--color-muted)]",
            isRTL ? "right-3" : "left-3"
          )}>
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            isSearch ? searchInputClassName : inputBaseClassName,
            icon && (isRTL ? 'pr-10' : 'pl-10'),
            suffix && (isRTL ? 'pl-10' : 'pr-10'),
            error &&
              'border-[color:rgb(var(--color-error-rgb)/0.85)] focus:border-[color:rgb(var(--color-error-rgb)/0.8)] focus:ring-[color:rgb(var(--color-error-rgb)/0.16)]',
            className
          )}
          {...props}
        />
        {suffix && (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 text-[var(--color-muted)]",
            isRTL ? "left-3" : "right-3"
          )}>
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/[0.07] px-2.5 py-2 text-xs font-semibold leading-5 text-rose-700 dark:text-rose-300">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
