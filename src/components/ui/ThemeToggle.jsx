import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from './Button';

const variantStyles = {
  default: 'border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.78),rgb(var(--color-elevated-rgb)/0.58))] backdrop-blur-xl',
  glass: 'border-[color:rgb(var(--color-border-rgb)/0.6)] bg-[color:rgb(var(--color-card-rgb)/0.62)] backdrop-blur-xl',
};

const compactVariantStyles = {
  default: 'border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.78),rgb(var(--color-elevated-rgb)/0.58))] text-[var(--color-text)] backdrop-blur-xl',
  glass: 'border-[color:rgb(var(--color-border-rgb)/0.6)] bg-[color:rgb(var(--color-card-rgb)/0.62)] text-[var(--color-text)] backdrop-blur-xl',
};

const ThemeToggle = ({ className, compact = false, variant = 'default' }) => {
  const { isDark, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-[var(--shadow-subtle)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.24)] hover:text-[var(--color-primary)]',
          compactVariantStyles[variant] || compactVariantStyles.default,
          className
        )}
        aria-label="تبديل المظهر"
      >
        {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-11 w-[82px] items-center rounded-full border px-1.5 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:border-[color:rgb(var(--color-primary-rgb)/0.24)]',
        variantStyles[variant] || variantStyles.default,
        className
      )}
      aria-label="تبديل المظهر"
    >
      <span
        className={cn(
          'absolute left-1.5 inset-y-1.5 w-[36px] rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-hover))] shadow-[var(--shadow-gold)] transition-transform duration-300 ease-out',
          isDark ? 'translate-x-[38px]' : 'translate-x-0'
        )}
      />
      <span className="relative z-10 grid w-full grid-cols-2 items-center">
        <span className="flex justify-center">
          <Sun className={cn('h-4 w-4 transition-colors', !isDark ? 'text-[var(--color-button-text)]' : 'text-[var(--color-muted)]')} />
        </span>
        <span className="flex justify-center">
          <Moon className={cn('h-4 w-4 transition-colors', isDark ? 'text-[var(--color-button-text)]' : 'text-[var(--color-muted)]')} />
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;
