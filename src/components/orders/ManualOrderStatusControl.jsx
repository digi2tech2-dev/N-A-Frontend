import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Button, { cn } from '../ui/Button';
import { textareaClassName } from '../ui/Input';
import {
  createManualOrderStatusOptions,
  getManualOrderStatusLabel,
  normalizeManualOrderStatus,
} from '../../utils/orders';

const ManualOrderStatusControl = ({
  order,
  isArabic,
  isLoading = false,
  onSubmit = () => {},
  compact = false,
  className = '',
}) => {
  const language = isArabic ? 'ar' : 'en';
  const [selectedStatus, setSelectedStatus] = useState(normalizeManualOrderStatus(order?.status));
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    setSelectedStatus(normalizeManualOrderStatus(order?.status));
    setRejectionReason('');
  }, [order?.id, order?.status]);

  const options = useMemo(
    () => createManualOrderStatusOptions(language),
    [language]
  );

  const currentStatus = normalizeManualOrderStatus(order?.status);
  const isDirty = selectedStatus !== currentStatus;
  const isRejected = selectedStatus === 'rejected';

  return (
    <div className={cn(
      'flex min-w-0 flex-col gap-2',
      className
    )}>
      <div className="min-w-0">
        <span className={cn(
          'mb-1 block font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]',
          compact ? 'text-[10px]' : 'text-xs'
        )}>
          {isArabic ? 'الحالة اليدوية' : 'Manual status'}
        </span>
        <div className={cn('grid gap-2', compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
          {options.map((option) => {
            const isSelected = selectedStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={isLoading}
                onClick={() => setSelectedStatus(option.value)}
                className={cn(
                  'w-full rounded-[0.9rem] border px-3 py-2.5 text-start transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  isSelected
                    ? 'border-[color:rgb(var(--color-primary-rgb)/0.5)] bg-[color:rgb(var(--color-primary-rgb)/0.12)]'
                    : 'border-[color:rgb(var(--color-border-rgb)/0.85)] bg-[color:rgb(var(--color-card-rgb)/0.82)] hover:border-[color:rgb(var(--color-primary-rgb)/0.35)]'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--color-text)]">{option.label}</p>
                  {isSelected ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" /> : null}
                </div>
                {option.description ? (
                  <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)]">
                    {option.description}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {isRejected ? (
        <div className="rounded-xl border border-[color:rgb(var(--color-warning-rgb)/0.28)] bg-[color:rgb(var(--color-warning-rgb)/0.1)] p-2.5 text-right">
          <div className="mb-2 flex flex-row-reverse items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:rgb(var(--color-warning-rgb)/0.14)] text-[var(--color-warning)]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black text-[var(--color-text)]">
                {isArabic ? 'سبب الرفض اختياري' : 'Optional rejection reason'}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-secondary)]">
                {isArabic ? 'اكتب سبب الرفض لو حابب يظهر في تفاصيل الطلب.' : 'Write a reason if you want it to appear in order details.'}
              </p>
            </div>
          </div>
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            className={`${textareaClassName} min-h-20 rounded-xl text-xs sm:min-h-20`}
            placeholder={isArabic ? 'مثال: بيانات الطلب غير صحيحة' : 'Example: The order details are incorrect'}
          />
        </div>
      ) : null}

      <Button
        type="button"
        variant={selectedStatus === 'completed' ? 'primary' : isRejected ? 'danger' : 'secondary'}
        className={cn(
          compact
            ? 'h-9 w-full shrink-0 rounded-lg px-3 text-xs sm:w-auto sm:min-w-[132px]'
            : 'h-11 w-full shrink-0 rounded-[1rem] px-4 sm:w-auto'
        )}
        disabled={isLoading || !isDirty}
        onClick={() => onSubmit(order, selectedStatus, isRejected ? rejectionReason.trim() : undefined)}
      >
        <span>
          {compact
            ? (isArabic ? 'حفظ الحالة' : 'Save status')
            : (
              isArabic
                ? `تحديث إلى ${getManualOrderStatusLabel(selectedStatus, language)}`
                : `Update to ${getManualOrderStatusLabel(selectedStatus, language)}`
            )}
        </span>
      </Button>
    </div>
  );
};

export default React.memo(ManualOrderStatusControl);
