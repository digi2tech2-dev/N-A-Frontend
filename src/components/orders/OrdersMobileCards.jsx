import React from 'react';
import { Eye, Building2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import { formatOrderDateTime, formatOrderMoney, getProviderDisplayName } from '../../utils/orders';

const OrdersMobileCards = ({
  orders,
  isArabic,
  currencies,
  onViewOrder,
}) => {
  const locale = isArabic ? 'ar-EG' : 'en-US';

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {orders.map((order) => (
        <Card key={order.id} variant="flat" className={`p-2.5 sm:p-3 ${String(order.status || '').toLowerCase() === 'manual_review' ? 'border-[color:rgb(var(--color-error-rgb)/0.45)] bg-[color:rgb(var(--color-error-rgb)/0.04)]' : ''}`}>
          <div className="mb-1.5 flex items-start justify-between [direction:ltr]">
            <OrderStatusBadge status={order.status} isArabic={isArabic} className="shrink-0" />
            {/* Provider badge */}
            {order.providerCode ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.25)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                <Building2 className="h-2.5 w-2.5" />
                {getProviderDisplayName(order.providerCode, isArabic ? 'ar' : 'en')}
              </span>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-[var(--color-text)]">
                {order.productName}
              </p>
              <p className="shrink-0 text-[10px] font-medium text-[var(--color-muted)]">
                {formatOrderDateTime(order.createdAt, locale)}
              </p>
            </div>
            <p className="mt-1 text-[13px] font-semibold text-[var(--color-text)]">
              {formatOrderMoney(order, currencies, locale)}
            </p>
          </div>

          {/* ── Order ID + Player ID row ─────────────────────────────── */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.55)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-secondary)]">
              <span className="font-sans font-medium text-[var(--color-muted)]">{isArabic ? 'رقم الطلب' : 'Order'}</span>
              #{order.siteOrderNumber || order.orderNumber}
            </span>
            {(order.playerId || order.primaryIdentifierField?.value) ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.06)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-primary)]">
                <span className="font-sans font-medium">{isArabic ? 'معرف اللاعب' : 'Player ID'}</span>
                {order.playerId || order.primaryIdentifierField?.value}
              </span>
            ) : null}
          </div>

          <div className="mt-2 rounded-[0.9rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-card-rgb)/0.7)] px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--color-muted)]">
                  {isArabic ? 'اسم المستخدم' : 'Customer name'}
                </p>
                <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--color-text)]">
                  {order.customerName}
                </p>
              </div>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-[var(--color-text-secondary)]">
              {order.customerEmail || '-'}
            </p>
          </div>

          {order.primaryIdentifierField ? (
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-[0.85rem] bg-[color:rgb(var(--color-surface-rgb)/0.52)] px-2.5 py-1.5">
              <p className="truncate text-[10px] text-[var(--color-text-secondary)]">
                {order.primaryIdentifierField.label}: <span className="font-medium text-[var(--color-text)]">{order.primaryIdentifierField.value}</span>
              </p>
            </div>
          ) : null}

          <div className="mt-2">
            <Button variant="secondary" className="h-8.5 w-full rounded-[0.85rem] text-[11px]" onClick={() => onViewOrder(order)}>
              <Eye className="h-3.5 w-3.5" />
              <span>{isArabic ? 'التفاصيل' : 'View details'}</span>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default React.memo(OrdersMobileCards);
