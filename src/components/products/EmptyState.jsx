import React from 'react';
import Button, { cn } from '../ui/Button';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => (
  <div
    className={cn(
      'premium-card flex flex-col items-center justify-center gap-4 px-5 py-10 text-center sm:px-8',
      className
    )}
  >
    {Icon && (
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] text-[var(--color-primary)]">
        <Icon className="h-6 w-6" />
      </div>
    )}

    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
      {description && (
        <p className="mx-auto max-w-xl text-sm leading-7 text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}
    </div>

    {actionLabel && onAction && (
      <Button type="button" variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
