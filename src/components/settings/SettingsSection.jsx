import React from 'react';
import Card from '../ui/Card';
import { cn } from '../ui/Button';

const SettingsSection = ({ icon: Icon, title, description, children, className }) => {
  return (
    <Card
      className={cn(
        'rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-5 shadow-[var(--shadow-subtle)] backdrop-blur-md',
        className
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-elevated-rgb)/0.92)] text-[var(--color-primary)]">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">{children}</div>
    </Card>
  );
};

export default SettingsSection;
