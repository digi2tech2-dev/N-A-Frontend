import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import { cn } from '../ui/Button';

const QuickActionsSection = ({ actions, isArabic, variant = 'default' }) => {
  const isCompact = variant === 'compact' || variant === 'tiny' || variant === 'dense';
  const title = isCompact
    ? (isArabic ? 'أدوات الإدارة' : 'Admin Tools')
    : (isArabic ? 'إجراءات سريعة' : 'Quick Actions');
  const description = isCompact
    ? (isArabic ? 'اختصارات سريعة لأهم أقسام لوحة الأدمن' : 'Quick shortcuts to the most important admin sections.')
    : (isArabic
      ? 'اختصارات مباشرة للمهام الأكثر استخدامًا داخل لوحة الإدارة.'
      : 'Direct shortcuts to the admin tasks you use most often.');

  return (
    <Card
      variant="elevated"
      className={cn(
        'mx-auto w-[calc(100vw-1.5rem)] max-w-[24rem] sm:w-full sm:max-w-[42rem] xl:max-w-none',
        isCompact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-6'
      )}
    >
      <div className={cn('mb-3 sm:mb-4', isArabic ? 'text-right' : 'text-left')}>
        <h2 className={cn(
          'font-bold text-[var(--color-text)]',
          isCompact ? 'text-sm leading-5 sm:text-base' : 'text-lg sm:text-xl'
        )}>
          {title}
        </h2>
        <p className={cn(
          'mt-1.5 text-[var(--color-text-secondary)]',
          isCompact
            ? 'text-[11px] leading-5'
            : 'hidden text-xs leading-6 sm:block sm:text-sm'
        )}>
          {description}
        </p>
      </div>

      <div className={cn('grid', isCompact ? 'gap-1.5' : 'gap-2.5')}>
        {actions.map((action) => {
          const content = isCompact ? (
            <div className={cn('flex items-center justify-between gap-2', isArabic && 'flex-row-reverse text-right')}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-4 text-[var(--color-text)]">
                  {action.label}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-[var(--color-text-secondary)]">
                  {action.description}
                </p>
              </div>

              <span className="inline-flex h-6 shrink-0 items-center justify-center rounded-md border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.38)] px-2 text-[11px] font-semibold text-[var(--color-text)] transition-[color,background-color,border-color,transform] duration-300 ease-out group-hover:scale-105 group-hover:border-[color:rgb(var(--color-primary-rgb)/0.34)] group-hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)] group-hover:text-[var(--color-primary)] group-focus-visible:scale-105 motion-reduce:transform-none">
                {isArabic ? 'فتح' : 'Open'}
              </span>
            </div>
          ) : (
            <>
              <span className="pointer-events-none absolute inset-y-3 w-1 rounded-full bg-[linear-gradient(180deg,var(--color-primary),var(--color-primary-hover))] opacity-0 transition-opacity group-hover:opacity-100 ltr:left-0 rtl:right-0" />

              <div className={cn('flex items-center gap-3', isArabic && 'flex-row-reverse text-right')}>
                {action.icon ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)] transition-colors group-hover:bg-[color:rgb(var(--color-primary-rgb)/0.16)]">
                    <action.icon className="h-4.5 w-4.5" />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-5 text-[var(--color-text)]">
                    {action.label}
                  </p>
                  <p className="mt-0.5 hidden truncate text-xs leading-5 text-[var(--color-text-secondary)] sm:block">
                    {action.description}
                  </p>
                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.42)] text-[var(--color-muted)] transition-colors group-hover:border-[color:rgb(var(--color-primary-rgb)/0.3)] group-hover:text-[var(--color-primary)]">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </>
          );

          return (
            <Link
              key={action.to}
              to={action.to}
              className={cn(
                'group relative z-0 overflow-hidden border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[linear-gradient(180deg,rgb(255_255_255/0.035),rgb(255_255_255/0.015))] shadow-[var(--shadow-subtle)] outline-none transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out hover:z-10 hover:-translate-y-0.5 hover:scale-[1.025] hover:border-[color:rgb(var(--color-primary-rgb)/0.42)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.07)] hover:shadow-[0_14px_34px_rgb(var(--color-primary-rgb)/0.16)] focus-visible:z-10 focus-visible:-translate-y-0.5 focus-visible:scale-[1.025] focus-visible:border-[color:rgb(var(--color-primary-rgb)/0.55)] focus-visible:shadow-[0_0_0_3px_rgb(var(--color-primary-rgb)/0.16),0_14px_34px_rgb(var(--color-primary-rgb)/0.16)] active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none',
                isCompact
                  ? 'rounded-[0.85rem] px-2 py-2'
                  : 'rounded-[1rem] px-3 py-3 sm:px-4 sm:py-3.5'
              )}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </Card>
  );
};

export default QuickActionsSection;
