import React, { useMemo, useRef } from 'react';
import { cn } from '../ui/Button';

const OtpInput = ({ value, onChange, length = 6, disabled = false, className }) => {
  const refs = useRef([]);
  const digits = useMemo(
    () => Array.from({ length }).map((_, index) => value?.[index] || ''),
    [length, value]
  );

  const updateValue = (nextDigits) => {
    onChange?.(nextDigits.join(''));
  };

  const handleChange = (index, inputValue) => {
    if (disabled) return;
    const clean = String(inputValue || '').replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[index] = '';
      updateValue(next);
      return;
    }

    const next = [...digits];
    clean.split('').forEach((char, offset) => {
      const targetIndex = index + offset;
      if (targetIndex < length) {
        next[targetIndex] = char;
      }
    });
    updateValue(next);

    const focusIndex = Math.min(index + clean.length, length - 1);
    refs.current[focusIndex]?.focus();
    refs.current[focusIndex]?.select?.();
  };

  const handleKeyDown = (index, event) => {
    if (disabled) return;

    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    if (disabled) return;
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const next = Array.from({ length }).map((_, index) => pasted[index] || '');
    updateValue(next);

    const focusIndex = Math.min(pasted.length, length - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div dir="ltr" className={cn('flex items-center justify-start gap-2', className)} onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className={cn(
            'h-11 w-10 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.92)] text-center text-[15px] font-bold text-[var(--color-text)] shadow-[var(--shadow-subtle)] outline-none transition-all focus:border-[color:rgb(var(--color-primary-rgb)/0.48)] focus:ring-2 focus:ring-[color:rgb(var(--color-primary-rgb)/0.2)] focus:shadow-[var(--shadow-subtle),var(--shadow-focus)] disabled:opacity-55 sm:h-12 sm:w-11 sm:text-base',
            disabled && 'cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
};

export default OtpInput;
