import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import Button, { cn } from '../ui/Button';

const parseDateValue = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const addMonths = (date, months) => {
  const nextDate = new Date(date.getFullYear(), date.getMonth() + months, 1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const startOfMonth = (date) => {
  const nextDate = new Date(date.getFullYear(), date.getMonth(), 1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const compareDateValues = (left, right) => {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  return left.localeCompare(right);
};

const getWeekdayLabels = (locale, weekStartsOn) => {
  const baseSunday = new Date(2026, 0, 4);
  return Array.from({ length: 7 }, (_, index) => {
    const dayDate = addDays(baseSunday, (weekStartsOn + index) % 7);
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dayDate);
  });
};

const buildCalendarCells = (monthDate, { weekStartsOn, maxDateValue }) => {
  const monthStart = startOfMonth(monthDate);
  const leadingDays = (monthStart.getDay() - weekStartsOn + 7) % 7;
  const firstVisibleDay = addDays(monthStart, -leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = addDays(firstVisibleDay, index);
    const dateValue = toDateValue(cellDate);
    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}-${dateValue}`,
      dateValue,
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === monthDate.getMonth(),
      isDisabled: Boolean(maxDateValue && dateValue > maxDateValue),
    };
  });
};

const DashboardDateRangeFilter = ({
  isArabic,
  formatRangeDate,
  todayInputValue,
  startDate,
  endDate,
  onRangeChange,
  className,
  buttonClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectionStep, setSelectionStep] = useState('start');
  const [draftStartDate, setDraftStartDate] = useState('');
  const rootRef = useRef(null);

  const locale = isArabic ? 'ar-EG' : 'en-US';
  const weekStartsOn = isArabic ? 6 : 0;
  const maxDate = useMemo(
    () => parseDateValue(todayInputValue) || new Date(),
    [todayInputValue]
  );

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = parseDateValue(startDate) || maxDate;
    return startOfMonth(initialDate);
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const initialDate = parseDateValue(startDate) || parseDateValue(endDate) || maxDate;
    setVisibleMonth(startOfMonth(initialDate));
    setSelectionStep('start');
    setDraftStartDate('');
  }, [endDate, isOpen, maxDate, startDate]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(visibleMonth),
    [locale, visibleMonth]
  );

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(locale, weekStartsOn),
    [locale, weekStartsOn]
  );

  const cells = useMemo(
    () => buildCalendarCells(visibleMonth, { weekStartsOn, maxDateValue: todayInputValue }),
    [todayInputValue, visibleMonth, weekStartsOn]
  );

  const previewStartDate = draftStartDate || startDate;
  const previewEndDate = draftStartDate ? '' : endDate;

  const handleDateSelect = (dateValue) => {
    if (!dateValue) return;

    if (selectionStep === 'start' || !draftStartDate) {
      setDraftStartDate(dateValue);
      setSelectionStep('end');
      return;
    }

    if (compareDateValues(dateValue, draftStartDate) < 0) {
      onRangeChange(dateValue, draftStartDate);
    } else {
      onRangeChange(draftStartDate, dateValue);
    }

    setDraftStartDate('');
    setSelectionStep('start');
    setIsOpen(false);
  };

  const triggerLabel = startDate && endDate
    ? (
      startDate === endDate
        ? formatRangeDate(startDate)
        : `${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}`
    )
    : (isArabic ? 'اختر التاريخ' : 'Select date');

  const popupContent = (
    <div
      className={cn(
        'fixed inset-0 z-[220] flex items-center justify-center p-4 transition-all duration-200',
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <button
        type="button"
        aria-label={isArabic ? 'إغلاق التقويم' : 'Close calendar'}
        className="absolute inset-0 bg-black/34"
        onClick={() => setIsOpen(false)}
      />

      <div
        className={cn(
          'relative w-[min(310px,calc(100vw-1.25rem))] overflow-hidden rounded-[1.05rem] border border-[color:rgb(var(--color-border-rgb)/0.92)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.99),rgb(var(--color-elevated-rgb)/0.94))] shadow-[0_24px_58px_-38px_rgba(15,23,42,0.46)] transition-opacity duration-100',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[color:rgb(var(--color-border-rgb)/0.76)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {isArabic ? 'فلترة التاريخ' : 'Date filter'}
              </p>
              <p className="mt-0.5 text-sm font-bold text-[var(--color-text)]">{monthLabel}</p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-9 px-3"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </Button>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className={cn(
              'rounded-[0.9rem] border px-3 py-1.5',
              selectionStep === 'start' || draftStartDate
                ? 'border-[rgba(212,175,55,0.34)] bg-[rgba(243,222,155,0.28)]'
                : 'border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-card-rgb)/0.9)]'
            )}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {isArabic ? 'من' : 'From'}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[var(--color-text)]">
                {previewStartDate ? formatRangeDate(previewStartDate) : (isArabic ? 'اختر البداية' : 'Pick start')}
              </p>
            </div>

            {(selectionStep === 'end' || endDate) && (
              <div className={cn(
                'rounded-[0.9rem] border px-3 py-1.5',
                selectionStep === 'end'
                  ? 'border-[rgba(212,175,55,0.34)] bg-[rgba(243,222,155,0.28)]'
                  : 'border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-card-rgb)/0.9)]'
              )}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {isArabic ? 'إلى' : 'To'}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--color-text)]">
                  {previewEndDate ? formatRangeDate(previewEndDate) : (isArabic ? 'اختر النهاية' : 'Pick end')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(243,222,155,0.18)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
            {selectionStep === 'end'
              ? (isArabic ? 'اختر إلى' : 'Pick end')
              : (isArabic ? 'اختر من' : 'Pick start')}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              disabled={addMonths(visibleMonth, 1).getTime() > startOfMonth(maxDate).getTime()}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                onRangeChange('', '');
                setDraftStartDate('');
                setSelectionStep('start');
              }}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-3 pb-2.5">
          <div className="grid grid-cols-7 gap-1">
            {weekdayLabels.map((label) => (
              <div
                key={`${monthLabel}-${label}`}
                className="flex h-6 items-center justify-center text-[10px] font-semibold text-[var(--color-muted)]"
              >
                {label}
              </div>
            ))}

            {cells.map((cell) => {
              const isSelectedStart = cell.dateValue === previewStartDate;
              const isSelectedEnd = cell.dateValue === previewEndDate;
              const isWithinRange = Boolean(
                previewStartDate
                && previewEndDate
                && compareDateValues(cell.dateValue, previewStartDate) > 0
                && compareDateValues(cell.dateValue, previewEndDate) < 0
              );

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => !cell.isDisabled && handleDateSelect(cell.dateValue)}
                  className={cn(
                    'relative flex h-8 items-center justify-center rounded-[0.72rem] border text-[13px] font-semibold transition-all duration-200',
                    cell.isCurrentMonth ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]',
                    cell.isDisabled && 'cursor-not-allowed opacity-30',
                    !cell.isDisabled && !isSelectedStart && !isSelectedEnd && !isWithinRange
                      && 'border-transparent bg-transparent hover:border-[rgba(212,175,55,0.18)] hover:bg-[rgba(243,222,155,0.1)]',
                    isWithinRange
                      && 'border-[rgba(212,175,55,0.14)] bg-[linear-gradient(180deg,rgba(243,222,155,0.24),rgba(212,175,55,0.16))] text-[var(--color-text)]',
                    (isSelectedStart || isSelectedEnd)
                      && 'border-[rgba(212,175,55,0.34)] bg-[linear-gradient(135deg,rgba(248,233,178,0.96),rgba(212,175,55,0.9))] text-[#2d2100] shadow-[0_14px_28px_-18px_rgba(212,175,55,0.72)]'
                  )}
                >
                  {cell.dayNumber}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={cn('relative flex w-full flex-wrap items-stretch gap-2 sm:w-auto', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          'inline-flex min-w-[220px] flex-1 items-center gap-2.5 rounded-[0.95rem] border border-[color:rgb(var(--color-border-rgb)/0.92)] bg-[color:rgb(var(--color-card-rgb)/0.96)] px-3.5 py-2 text-start shadow-[var(--shadow-subtle)] transition-all duration-200 hover:border-[color:rgb(var(--color-primary-rgb)/0.28)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.06)] sm:flex-none',
          buttonClassName
        )}
        aria-expanded={isOpen}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
          <CalendarRange className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            {isArabic ? 'التاريخ' : 'Date'}
          </p>
          <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">
            {triggerLabel}
          </p>
        </div>

        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-auto min-h-[3.25rem] shrink-0 rounded-[0.95rem] px-4"
        aria-label={isArabic ? 'فتح فلترة التاريخ' : 'Open date filter'}
      >
        <Filter className="h-4 w-4" />
        <span>{isArabic ? 'فلتره' : 'Filter'}</span>
      </Button>

      {typeof document !== 'undefined' ? createPortal(popupContent, document.body) : null}
    </div>
  );
};

export default DashboardDateRangeFilter;
