import React from 'react';
import Badge from '../ui/Badge';
import { cn } from '../ui/Button';
import { getOrderStatusMeta } from '../../utils/orders';

const OrderStatusBadge = ({ status, isArabic, className }) => {
  const meta = getOrderStatusMeta(status, isArabic ? 'ar' : 'en');

  return (
    <Badge
      variant={meta.variant}
      className={cn('gap-1.5 px-3 py-1.5 text-[11px] font-semibold', className)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClassName)} />
      <span>{meta.label}</span>
    </Badge>
  );
};

export default OrderStatusBadge;

