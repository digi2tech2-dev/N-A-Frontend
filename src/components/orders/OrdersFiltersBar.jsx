import React, { useId, useState } from 'react';
import { CalendarDays, ChevronDown, ListFilter, Search } from 'lucide-react';
import Badge from '../ui/Badge';
import SearchBar from '../ui/SearchBar';
import { cn } from '../ui/Button';
import { selectClassName } from '../ui/Input';
import {
  createOrderDateOptions,
  createOrderSortOptions,
  createOrderStatusOptions,
  createOrderTypeOptions,
} from '../../utils/orders';

const FilterField = ({ label, value, onChange, options, compact = false }) => (
  <label className="orders-filter-field min-w-0">
    <span className={cn(
      'orders-filter-field__label block font-black uppercase tracking-[0.1em] text-[var(--color-muted)]',
      compact ? 'mb-1 text-[11px]' : 'mb-1.5 text-[11px]'
    )}>
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        selectClassName,
        'orders-filter-field__select',
        compact
          ? 'h-8 rounded-lg bg-[color:rgb(var(--color-card-rgb)/0.94)] px-2 text-[10px] sm:h-9 sm:px-2.5 sm:text-[11px]'
          : 'h-11 rounded-lg bg-[color:rgb(var(--color-card-rgb)/0.94)] px-3 text-sm'
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const OrdersFiltersBar = ({
  isArabic,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter = 'all',
  onTypeChange = () => {},
  dateFilter = 'all',
  onDateChange = () => {},
  sortOrder = 'newest',
  onSortChange = () => {},
  resultCount = 0,
  searchPlaceholder,
  helperText,
  showTypeFilter = true,
  showDateFilter = true,
  showSort = true,
  panelClassName = '',
  compact = false,
  customRange = null,
  onApplyFilters = null,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const panelId = useId();
  const language = isArabic ? 'ar' : 'en';
  const titleText = isArabic ? 'بحث وتصفية' : 'Search and filter';
  const toggleText = isCollapsed
    ? (isArabic ? 'فتح الفلاتر' : 'Open filters')
    : (isArabic ? 'إخفاء الفلاتر' : 'Hide filters');
  const isContentVisible = !collapsible || !isCollapsed;

  const statusOptions = createOrderStatusOptions(language);
  const typeOptions = createOrderTypeOptions(language);
  const dateOptions = createOrderDateOptions(language);
  const sortOptions = createOrderSortOptions(language);

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[linear-gradient(135deg,rgb(var(--color-card-rgb)/0.92),rgb(var(--color-surface-rgb)/0.62))] shadow-[var(--shadow-subtle)]',
        compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4',
        panelClassName
      )}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          aria-expanded={!isCollapsed}
          aria-controls={panelId}
          className={cn(
            'orders-filter-toggle flex w-full items-center justify-between gap-3 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-card-rgb)/0.66)] text-start shadow-[var(--shadow-subtle)] transition hover:border-[color:rgb(var(--color-primary-rgb)/0.38)] hover:bg-[color:rgb(var(--color-card-rgb)/0.86)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--color-primary-rgb)/0.24)]',
            compact ? 'min-h-11 px-2.5 py-2' : 'min-h-12 px-3 py-2.5'
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="orders-filter-toggle__icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <ListFilter className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {titleText}
              </span>
              <span className="block truncate text-[11px] font-bold text-[var(--color-text-secondary)]">
                {toggleText}
              </span>
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-2">
            <Badge variant="premium" className="orders-filter-count rounded-md px-2 py-1 text-[10px]">
              {isArabic ? `${resultCount} نتيجة` : `${resultCount} results`}
            </Badge>
            <span className="orders-filter-toggle__chevron flex h-8 w-8 items-center justify-center rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-surface-rgb)/0.48)] text-[var(--color-text-secondary)]">
              <ChevronDown className={cn('h-4 w-4 transition-transform', isCollapsed ? '' : 'rotate-180')} />
            </span>
          </span>
        </button>
      ) : null}

      {isContentVisible ? (
        <div
          id={panelId}
          className={cn('orders-filter-content flex flex-col', compact ? 'gap-3' : 'gap-4', collapsible ? (compact ? 'mt-3' : 'mt-4') : '')}
        >
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end">
          <div className="min-w-0 flex-[1.45]">
            {!collapsible ? (
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  <ListFilter className={cn('text-[var(--color-primary)]', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                  {titleText}
                </span>
                <Badge variant="premium" className="rounded-md px-2 py-1 text-[10px]">
                  {isArabic ? `${resultCount} نتيجة` : `${resultCount} results`}
                </Badge>
              </div>
            ) : null}
            <SearchBar
              value={searchTerm}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              inputClassName={compact
                ? 'orders-filter-search h-9 rounded-lg text-xs shadow-none focus:shadow-none'
                : 'orders-filter-search h-11 rounded-lg text-sm shadow-none focus:shadow-none'}
            />
          </div>

          <div className={cn(
            'grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-3',
            showTypeFilter && showDateFilter ? 'xl:grid-cols-4' : 'xl:grid-cols-2'
          )}>
            <FilterField
              label={isArabic ? 'الحالة' : 'Status'}
              value={statusFilter}
              onChange={onStatusChange}
              options={statusOptions}
              compact={compact}
            />

            {showTypeFilter ? (
              <FilterField
                label={isArabic ? 'النوع' : 'Type'}
                value={typeFilter}
                onChange={onTypeChange}
                options={typeOptions}
                compact={compact}
              />
            ) : null}

            {showDateFilter ? (
              <FilterField
                label={isArabic ? 'التاريخ' : 'Date'}
                value={dateFilter}
                onChange={onDateChange}
                options={dateOptions}
                compact={compact}
              />
            ) : null}

            {showSort ? (
              <FilterField
                label={isArabic ? 'الترتيب' : 'Sort'}
                value={sortOrder}
                onChange={onSortChange}
                options={sortOptions}
                compact={compact}
              />
            ) : null}
          </div>
        </div>

        <div className={cn(
          'flex flex-wrap items-center gap-2 border-t border-[color:rgb(var(--color-border-rgb)/0.68)]',
          compact ? 'pt-2.5' : 'pt-3'
        )}>
          {helperText !== null ? (
            <span className={cn('text-[var(--color-text-secondary)]', compact ? 'text-[11px] leading-4.5' : 'text-xs leading-5')}>
              {helperText || (isArabic
                ? 'ابحث بالمنتج، العميل، البريد الإلكتروني، أو رقم الطلب.'
              : 'Search by product, customer, email, or order number.')}
            </span>
          ) : null}
        </div>

        {customRange ? (
          <div className={cn(
            'grid grid-cols-2 gap-2 border-t border-[color:rgb(var(--color-border-rgb)/0.68)] xl:grid-cols-4',
            compact ? 'pt-2.5' : 'pt-3'
          )}>
            <label className="min-w-0">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--color-muted)]">
                <CalendarDays className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                {isArabic ? 'من تاريخ' : 'From'}
              </span>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(event) => customRange.onStartDateChange(event.target.value)}
                className={cn(
                  selectClassName,
                  compact
                    ? 'h-8 rounded-lg bg-[color:rgb(var(--color-card-rgb)/0.94)] px-2 text-[10px] sm:h-9 sm:px-2.5 sm:text-[11px]'
                    : 'h-11 rounded-lg bg-[color:rgb(var(--color-card-rgb)/0.94)] px-3 text-sm'
                )}
              />
            </label>

            <label className="min-w-0">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--color-muted)]">
                <CalendarDays className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                {isArabic ? 'إلى تاريخ' : 'To'}
              </span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(event) => customRange.onEndDateChange(event.target.value)}
                className={cn(
                  selectClassName,
                  compact
                    ? 'h-8 rounded-lg bg-[color:rgb(var(--color-card-rgb)/0.94)] px-2 text-[10px] sm:h-9 sm:px-2.5 sm:text-[11px]'
                    : 'h-11 rounded-lg bg-[color:rgb(var(--color-card-rgb)/0.94)] px-3 text-sm'
                )}
              />
            </label>

            {customRange.helperText ? (
              <div className="col-span-2 xl:col-span-2">
                <div className={cn(
                  'flex h-full items-center rounded-[1rem] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.72)] px-3 text-[var(--color-text-secondary)]',
                  compact ? 'min-h-9 text-[10px] leading-5 sm:min-h-10 sm:text-xs' : 'min-h-11 text-xs'
                )}>
                  {customRange.helperText}
                </div>
              </div>
            ) : null}
            <div className="col-span-2 xl:col-span-2 flex items-center justify-center">
              <button
                type="button"
                onClick={() => onApplyFilters && onApplyFilters()}
                className={cn(
                  'orders-filter-apply inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-black transition-transform duration-150',
                  compact ? 'text-xs h-9' : 'h-11',
                  'w-full sm:w-auto min-w-[10rem]',
                  'bg-[linear-gradient(135deg,rgb(var(--color-primary-rgb)/0.22),rgb(168_85_247/0.14))]',
                  'text-[var(--color-primary)]',
                  'shadow-[0_0_28px_-12px_rgb(var(--color-primary-rgb)/0.75)]',
                  'border-[color:rgb(var(--color-primary-rgb)/0.28)]',
                  'hover:-translate-y-0.5'
                )}
              >
                <Search className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                <span>{isArabic ? 'بحث' : 'Search'}</span>
              </button>
            </div>
          </div>
        ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default OrdersFiltersBar;
