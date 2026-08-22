import React from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Hash, WalletCards } from 'lucide-react';
import Button from '../ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import {
  formatOrderDateTime,
  formatOrderMoney,
  getCustomerOrderFeedback,
} from '../../utils/orders';

const CustomerOrderCard = ({ order, isArabic, currencies, onSelect }) => {
  const locale = isArabic ? 'ar-EG' : 'en-US';
  const feedback = getCustomerOrderFeedback(order, isArabic ? 'ar' : 'en');
  const orderNumber = order.siteOrderNumber || order.orderNumber;
  const dynamicFields = Array.isArray(order?.dynamicFields) ? order.dynamicFields : [];
  const primaryIdentifierField = order?.primaryIdentifierField || null;
  const secondaryFields = dynamicFields.filter((field) => field.key !== primaryIdentifierField?.key);
  const previewFields = primaryIdentifierField
    ? [primaryIdentifierField, ...secondaryFields.slice(0, 1)]
    : dynamicFields.slice(0, 2);
  const remainingFieldsCount = Math.max(0, (order?.dynamicFields?.length || 0) - previewFields.length);
  const ArrowIcon = isArabic ? ChevronLeft : ChevronRight;

  return (
    <article className="customer-order-card-neon group relative isolate overflow-hidden rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[linear-gradient(135deg,rgb(var(--color-card-rgb)/0.92),rgb(var(--color-surface-rgb)/0.62))] shadow-[var(--shadow-subtle)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.34)] hover:shadow-[var(--shadow-medium)]">
      <div className="flex min-w-0 flex-col gap-2.5 p-2.5 sm:p-3">
        <div className="flex items-start gap-2.5">
          <div className="customer-order-card-neon__image relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.68)] shadow-[var(--shadow-subtle)]">
            {order.productImage ? (
              <img
                src={order.productImage}
                alt={order.productName}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color:rgb(var(--color-border-rgb)/0.18)] text-lg font-black text-[var(--color-muted)]">
                #
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="customer-order-card-neon__number inline-flex items-center gap-1 rounded-md border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.52)] px-1.5 py-0.5 text-[9px] font-black text-[var(--color-muted)]">
                    <Hash className="h-2.5 w-2.5" />
                    <span>#{orderNumber}</span>
                  </div>
                  <OrderStatusBadge status={order.status} isArabic={isArabic} className="px-2 py-0.5 text-[9px] shadow-[var(--shadow-subtle)]" />
                </div>

                <h2 className="customer-order-card-neon__title mt-1.5 line-clamp-2 text-sm font-black leading-5 text-[var(--color-text)]">
                  {order.productName}
                </h2>
              </div>

              <div className="customer-order-card-neon__amount shrink-0 rounded-xl border border-emerald-400/22 bg-emerald-500/10 px-2 py-1.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-500">
                  {isArabic ? 'القيمة' : 'Amount'}
                </p>
                <p className="mt-0.5 max-w-[7rem] truncate text-[11px] font-black text-[var(--color-text)]" title={formatOrderMoney(order, currencies, locale)}>
                  {formatOrderMoney(order, currencies, locale)}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              <div className="customer-order-card-neon__meta inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-surface-rgb)/0.44)] px-2 py-1.5 text-[var(--color-text-secondary)]">
                <CalendarClock className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                <span className="truncate">{formatOrderDateTime(order.createdAt, locale)}</span>
              </div>
              <div className="customer-order-card-neon__meta inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-surface-rgb)/0.44)] px-2 py-1.5 text-[var(--color-text-secondary)]">
                <WalletCards className="h-3 w-3 shrink-0 text-amber-500" />
                <span className="truncate">{order.customerEmail || order.customerName || '-'}</span>
              </div>
            </div>
          </div>
        </div>

          <div className="sr-only">
            <span>
              {formatOrderDateTime(order.createdAt, locale)}
              {formatOrderMoney(order, currencies, locale)}
            </span>
          </div>

          {previewFields.length ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {previewFields.map((field) => (
                <div
                  key={`${order.id}-${field.key}`}
                  className="customer-order-card-neon__field min-w-0 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-card-rgb)/0.58)] px-2 py-1.5 text-[10px]"
                >
                  <p className="truncate font-bold text-[var(--color-muted)]">{field.label}</p>
                  <p className="mt-0.5 truncate font-semibold text-[var(--color-text)]">{field.value}</p>
                </div>
              ))}
              {remainingFieldsCount > 0 ? (
                <div className="flex min-h-10 items-center rounded-xl border border-dashed border-[color:rgb(var(--color-border-rgb)/0.82)] px-2 py-1.5 text-[10px] font-bold text-[var(--color-muted)]">
                  {isArabic ? `+${remainingFieldsCount} بيانات أخرى` : `+${remainingFieldsCount} more`}
                </div>
              ) : null}
            </div>
          ) : null}

        <div className="pt-0.5">
            <Button
              type="button"
              variant={feedback?.tone === 'success' ? 'primary' : 'secondary'}
              className="customer-order-card-neon__button h-9 w-full rounded-xl text-[11px]"
              onClick={() => onSelect(order)}
            >
              <span>{feedback?.actionLabel || (isArabic ? 'التفاصيل' : 'View details')}</span>
              <ArrowIcon className="h-3.5 w-3.5" />
            </Button>
        </div>
      </div>
    </article>
  );
};

export default CustomerOrderCard;
