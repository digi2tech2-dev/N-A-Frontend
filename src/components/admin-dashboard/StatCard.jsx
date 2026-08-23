import React from 'react';
import Card from '../ui/Card';
import { cn } from '../ui/Button';
import './AdminNeonGlow.css';

const StatCard = ({ title, value, note, icon: Icon, progress = 40, wide = false, targetTone, badge }) => {
  const progressValue = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <Card
      variant="elevated"
      className={cn(
        'admin-stat-card relative w-full max-w-[24rem] p-0 transition-colors sm:max-w-none',
        wide && 'col-span-2',
        targetTone && `is-target-card is-target-${targetTone}`
      )}
    >
      <span className="admin-stat-card-shimmer" aria-hidden="true" />
      <div className="relative flex min-h-[8.25rem] flex-col justify-between overflow-hidden rounded-[inherit] p-3.5 text-start sm:min-h-[9.25rem] sm:p-4">
        <div className="pointer-events-none absolute -end-4 -top-4 flex h-20 w-20 items-center justify-center rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.1)] bg-[color:rgb(var(--color-primary-rgb)/0.045)] text-[var(--color-primary)] opacity-40 sm:h-24 sm:w-24">
          <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="max-w-[9.5rem] text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-[var(--color-muted)] sm:max-w-[11rem] sm:text-[11px]">
              {title}
            </p>
            {badge ? <span className="admin-target-tier-badge">{badge}</span> : null}
          </div>

          <div className="admin-icon-glow flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.65rem] border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] text-[var(--color-primary)] sm:h-8 sm:w-8">
            <Icon className="relative z-10 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>

        <div className="relative mt-4">
          <p className="truncate text-[1.65rem] font-black leading-none text-[var(--color-text)] sm:text-[2.15rem]">
            {value}
          </p>
          {note && (
            <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[var(--color-text-secondary)] sm:text-xs">
              {note}
            </p>
          )}
        </div>

        <div className="admin-stat-progress mt-3 h-1 w-full overflow-hidden rounded-full bg-[color:rgb(var(--color-border-rgb)/0.42)]">
          <div
            className="admin-stat-progress__bar h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-primary-hover))]"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
