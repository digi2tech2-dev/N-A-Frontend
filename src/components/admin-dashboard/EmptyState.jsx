import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../ui/Button';

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.56)] px-6 py-8 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-elevated-rgb)/0.88)] text-[var(--color-primary)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
};

export default EmptyState;
