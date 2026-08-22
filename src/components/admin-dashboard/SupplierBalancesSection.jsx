import React from 'react';
import { Building2, Wallet } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { cn } from '../ui/Button';
import EmptyState from './EmptyState';

const SupplierBalancesSection = ({ items, isArabic, isLoading }) => {
  const loadingRows = Array.from({ length: 4 }, (_, index) => `supplier-loading-${index}`);

  return (
    <Card variant="elevated" className="mx-auto flex max-h-[23rem] w-[calc(100vw-1.5rem)] max-w-[24rem] flex-col overflow-hidden p-3 sm:w-full sm:max-w-[42rem] sm:p-4 xl:max-w-none">
      <div className={cn(
        'mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between',
        isArabic ? 'items-end text-right sm:flex-row-reverse' : 'items-start text-left'
      )}>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--color-text)] sm:text-lg">
            {isArabic ? 'أرصدة الموردين' : 'Supplier Balances'}
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)] sm:text-xs">
            {isArabic
              ? 'عرض اسم المورد والرصيد المتاح لديه بشكل مباشر.'
              : 'A direct view of each supplier name and currently available balance.'}
          </p>
        </div>
        <Badge variant="premium" className="shrink-0 text-[10px] sm:text-[11px]">
          {items.length}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex-1 overflow-y-auto pe-1">
          <div className="space-y-2">
            {loadingRows.map((rowId) => (
              <div
                key={rowId}
                className="rounded-[var(--radius-lg)] border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-card-rgb)/0.76)] px-3 py-2.5"
              >
                <div className={cn('flex items-center justify-between gap-3', isArabic && 'flex-row-reverse')}>
                  <div className="min-w-0 flex-1">
                    <div className="h-3.5 w-28 animate-pulse rounded-full bg-[color:rgb(var(--color-border-rgb)/0.42)]" />
                    <div className="mt-2 h-2.5 w-16 animate-pulse rounded-full bg-[color:rgb(var(--color-border-rgb)/0.28)]" />
                  </div>
                  <div className="h-8 w-24 animate-pulse rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.14)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={isArabic ? 'لا توجد أرصدة موردين' : 'No supplier balances yet'}
          description={isArabic
            ? 'ستظهر هنا أرصدة الموردين بمجرد توفر بيانات ربط الموردين داخل النظام.'
            : 'Supplier balances will appear here once supplier integrations are available.'}
        />
      ) : (
        <div className="flex-1 overflow-y-auto pe-1">
          <div className="space-y-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[var(--radius-lg)] border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-card-rgb)/0.76)] px-3 py-2.5"
              >
                <div className={cn('flex items-center justify-between gap-3', isArabic && 'flex-row-reverse text-right')}>
                  <div className={cn('flex min-w-0 items-center gap-2.5', isArabic && 'flex-row-reverse')}>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] text-[var(--color-primary)]">
                      <Building2 className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[var(--color-text)]">
                        {item.supplierName || (isArabic ? 'مورد غير معروف' : 'Unknown supplier')}
                      </p>
                      {item.supplierCode ? (
                        <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                          {item.supplierCode}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className={cn('shrink-0', isArabic ? 'text-left' : 'text-right')}>
                    <p className="text-[12px] font-bold text-[var(--color-primary)]">
                      {item.balanceLabel}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                      {isArabic ? 'الرصيد المتاح' : 'Available balance'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SupplierBalancesSection;
