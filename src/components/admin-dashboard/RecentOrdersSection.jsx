import React from 'react';
import { Package } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button, { cn } from '../ui/Button';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';

const getOrderEmail = (order, isArabic) => (
  order?.userEmail
  || order?.email
  || order?.contactEmail
  || (isArabic ? 'لا يوجد بريد إلكتروني' : 'No email available')
);

const getOrderProduct = (order, isArabic) => (
  order?.productName
  || order?.productId
  || (isArabic ? 'منتج غير معروف' : 'Unknown product')
);

const getOrderCustomer = (order) => order?.userName || order?.userId || '-';
const getOrderQuantity = (order) => {
  const quantity = Number(order?.quantity ?? order?.qty ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const isIncompleteOrder = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return normalizedStatus !== 'completed' && normalizedStatus !== 'success';
};

const getOrderIndicatorClassName = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (normalizedStatus === 'completed' || normalizedStatus === 'success') {
    return 'bg-[var(--color-success)]';
  }

  return 'bg-[var(--color-primary)]';
};

const getOrderQuantityBadgeClassName = (status) => (
  isIncompleteOrder(status)
    ? 'bg-[color:rgb(var(--color-warning-rgb)/0.14)] text-[var(--color-warning)]'
    : 'bg-[color:rgb(var(--color-success-rgb)/0.14)] text-[var(--color-success)]'
);

const RecentOrdersSection = ({
  orders,
  isArabic,
  onViewOrder = null,
}) => {
  const incompleteOrdersCount = orders.filter((order) => isIncompleteOrder(order.status)).length;
  const completedOrdersCount = orders.length - incompleteOrdersCount;

  return (
    <Card variant="elevated" className="mx-auto flex max-h-[23rem] w-[calc(100vw-1.5rem)] max-w-[24rem] flex-col overflow-hidden p-3 sm:w-full sm:max-w-[42rem] sm:p-4 xl:max-w-none">
      <div className={cn(
        'mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between',
        isArabic ? 'items-end text-right sm:flex-row-reverse' : 'items-start text-left'
      )}>
        <div
          className={cn('min-w-0 flex-1', isArabic && 'w-full text-center')}
        >
          <div className={cn(
            'flex gap-1.5',
            isArabic ? 'w-full flex-col items-center text-center' : 'flex-wrap items-center justify-start text-left'
          )}>
            <h2 className="text-base font-bold text-[var(--color-text)] sm:text-lg">
              {isArabic ? 'آخر الطلبات' : 'Recent Orders'}
            </h2>
          </div>
          <p className={cn(
            'mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)] sm:text-xs',
            isArabic ? 'w-full text-center' : 'text-left'
          )}>
            {isArabic
              ? 'عرض مختصر للعميل والمنتج والعدد فقط.'
              : 'A compact view with customer, product, and quantity only.'}
          </p>
        </div>
        <div className={cn('flex items-center gap-1.5', isArabic ? 'flex-row-reverse' : 'flex-row')}>
          <Badge
            variant="premium"
            className="shrink-0 bg-[color:rgb(var(--color-warning-rgb)/0.14)] text-[10px] text-[var(--color-warning)] sm:text-[11px]"
          >
            {incompleteOrdersCount}
          </Badge>
          <span className="inline-flex min-w-[1.8rem] items-center justify-center rounded-full bg-[color:rgb(var(--color-success-rgb)/0.14)] px-2 py-1 text-[10px] font-semibold text-[var(--color-success)] sm:text-[11px]">
            {completedOrdersCount}
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={isArabic ? 'لا توجد طلبات حديثة' : 'No recent orders'}
          description={isArabic
            ? 'ستظهر هنا آخر الطلبات بمجرد بدء استقبال طلبات جديدة.'
            : 'The latest orders will appear here once new purchases start coming in.'}
        />
      ) : (
        <div className="flex-1 overflow-y-auto pe-1">
          <div className="space-y-2">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-[var(--radius-lg)] border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-card-rgb)/0.76)] px-2.5 py-2"
              >
                <div className={cn('flex items-start gap-2', isArabic && 'flex-row-reverse text-right')}>
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', getOrderIndicatorClassName(order.status))} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[var(--color-text)]">
                      {getOrderCustomer(order)}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--color-text-secondary)]">
                      {getOrderProduct(order, isArabic)}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted)]">
                      {getOrderEmail(order, isArabic)}
                    </p>
                    <div className={cn('mt-1 flex', isArabic ? 'justify-end' : 'justify-start')}>
                      <StatusBadge status={order.status} isArabic={isArabic} className="px-2 py-0.5 text-[10px]" />
                    </div>
                  </div>

                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    getOrderQuantityBadgeClassName(order.status)
                  )}>
                    {isArabic ? `العدد ${getOrderQuantity(order)}` : `Qty ${getOrderQuantity(order)}`}
                  </span>
                </div>

                {onViewOrder ? (
                  <div className="mt-1.5 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-[10px]"
                      onClick={() => onViewOrder(order)}
                    >
                      {isArabic ? 'مراجعة الطلب' : 'Review order'}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentOrdersSection;
