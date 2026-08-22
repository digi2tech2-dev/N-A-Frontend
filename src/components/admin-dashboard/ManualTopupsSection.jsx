import React from 'react';
import { CreditCard } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button, { cn } from '../ui/Button';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';

const isPendingLike = (status) => ['pending', 'requested', 'under_review', 'processing'].includes(String(status || '').trim().toLowerCase());

const getTopupEmail = (topup, isArabic) => (
  topup?.userEmail
  || topup?.email
  || topup?.contactEmail
  || (isArabic ? 'لا يوجد بريد إلكتروني' : 'No email available')
);

const getTopupName = (topup, isArabic) => (
  topup?.userName
  || topup?.userId
  || (isArabic ? 'مستخدم غير معروف' : 'Unknown user')
);

const ManualTopupsSection = ({
  topups,
  pendingCount,
  isArabic,
  formatDate,
  formatMoney,
  onApproveTopup = null,
  approvingTopupId = '',
}) => {
  return (
    <Card variant="elevated" className="mx-auto flex max-h-[23rem] w-[calc(100vw-1.5rem)] max-w-[24rem] flex-col overflow-hidden p-3 sm:w-full sm:max-w-[42rem] sm:p-4 xl:max-w-none">
      <div className={cn(
        'mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between',
        isArabic ? 'items-end text-right sm:flex-row-reverse' : 'items-start text-left'
      )}>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--color-text)] sm:text-lg">
            {isArabic ? 'طلبات الشحن اليدوي' : 'Manual Topup Requests'}
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)] sm:text-xs">
            {isArabic
              ? 'متابعة أحدث طلبات الشحن اليدوي مع إبراز الطلبات التي ما زالت بانتظار المراجعة.'
              : 'Track the latest manual wallet topups and highlight the ones still waiting for review.'}
          </p>
        </div>
        <Badge variant={pendingCount > 0 ? 'warning' : 'premium'} className="shrink-0 px-2 py-0.5 text-[10px]">
          {isArabic ? `${pendingCount} معلّق` : `${pendingCount} pending`}
        </Badge>
      </div>

      {topups.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={isArabic ? 'لا توجد طلبات شحن يدوي' : 'No manual topups yet'}
          description={isArabic
            ? 'ستظهر هنا الطلبات اليدوية فور إنشائها من المستخدمين.'
            : 'Manual topup requests will appear here as soon as users submit them.'}
        />
      ) : (
        <div className="flex-1 overflow-y-auto pe-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topups.map((topup) => {
              const isPending = isPendingLike(topup.status);
              const amount = Number(topup.actualPaidAmount ?? topup.requestedAmount ?? topup.amount ?? 0);
              const isApproving = String(approvingTopupId) === String(topup.id);

              return (
                <article
                  key={topup.id}
                  className={`rounded-[1rem] border p-2.5 sm:p-3 ${
                    isPending
                      ? 'border-[color:rgb(var(--color-warning-rgb)/0.36)] bg-[color:rgb(var(--color-warning-rgb)/0.08)]'
                      : 'border-[color:rgb(var(--color-border-rgb)/0.85)] bg-[color:rgb(var(--color-card-rgb)/0.78)]'
                  }`}
                >
                  <div className={cn('flex items-start justify-between gap-2', isArabic && 'flex-row-reverse text-right')}>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">
                        {getTopupName(topup, isArabic)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted)]">
                        {getTopupEmail(topup, isArabic)}
                      </p>
                    </div>
                    <StatusBadge status={topup.status} isArabic={isArabic} />
                  </div>

                  <div className={cn('mt-2.5 grid grid-cols-2 gap-2 text-[11px]', isArabic && 'text-right')}>
                    <div className="min-w-0">
                      <p className="text-[var(--color-muted)]">{isArabic ? 'المبلغ' : 'Amount'}</p>
                      <p className="mt-0.5 truncate font-medium text-[var(--color-text)]">
                        {formatMoney(amount, topup.currencyCode)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--color-muted)]">{isArabic ? 'الدفع' : 'Method'}</p>
                      <p className="mt-0.5 truncate font-medium text-[var(--color-text)]">
                        {topup.paymentChannel || topup.method || '-'}
                      </p>
                    </div>
                    <div className="min-w-0 col-span-2">
                      <p className="text-[var(--color-muted)]">{isArabic ? 'الوقت' : 'Time'}</p>
                      <p className="mt-0.5 truncate font-medium text-[var(--color-text)]">{formatDate(topup.createdAt)}</p>
                    </div>
                  </div>

                  {isPending && onApproveTopup ? (
                    <div className={cn('mt-2 flex', isArabic ? 'justify-start' : 'justify-end')}>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 rounded-lg px-2.5 text-[10px]"
                        onClick={() => onApproveTopup(topup)}
                        disabled={isApproving}
                      >
                        {isApproving
                          ? (isArabic ? 'جارٍ الاعتماد...' : 'Approving...')
                          : (isArabic ? 'اعتماد الطلب' : 'Approve request')}
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ManualTopupsSection;
