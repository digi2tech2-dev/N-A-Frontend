import React from 'react';
import Card from '../ui/Card';
import ManualOrderStatusControl from './ManualOrderStatusControl';
import { isManualStatusEditableOrder } from '../../utils/orders';

const AdminOrderActions = ({
  order,
  isArabic,
  isLoading,
  onUpdateStatus,
}) => {
  if (!isManualStatusEditableOrder(order)) {
    return (
      <Card variant="flat" className="border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-3.5">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {isArabic ? 'التعديل المباشر غير متاح' : 'Direct editing is unavailable'}
          </p>
          <p className="text-xs leading-6 text-[var(--color-text-secondary)]">
            {isArabic
              ? 'الطلب مربوط بمورد خارجي، لذلك حالته تتحدث من المزامنة فقط.'
              : 'This order is linked to a supplier, so its status is updated through sync only.'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="flat" className="border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.06)] p-3.5">
      <div className="space-y-2.5">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {isArabic ? 'إدارة حالة الطلب' : 'Manage order status'}
          </p>
        </div>
        <ManualOrderStatusControl
          order={order}
          isArabic={isArabic}
          isLoading={isLoading}
          onSubmit={onUpdateStatus}
          compact
        />
      </div>
    </Card>
  );
};

export default AdminOrderActions;
