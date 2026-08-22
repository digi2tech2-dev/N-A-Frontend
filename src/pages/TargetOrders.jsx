import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ClipboardList, Eye, RefreshCw, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Button, { cn } from '../components/ui/Button';
import TargetOrderDetailsModal from '../components/target/TargetOrderDetailsModal';
import useAuthStore from '../store/useAuthStore';
import useTargetStore from '../store/useTargetStore';
import { formatDateTime, formatNumber } from '../utils/intl';
import {
  getTargetOrderStatusAccentClass,
  getTargetOrderStatusLabel,
  getTargetOrderStatusVariant,
  normalizeTargetOrderStatus,
} from '../utils/targetOrders';

const statusFilters = [
  { id: 'ALL', label: 'كل الطلبات' },
  { id: 'PENDING', label: 'قيد الانتظار' },
  { id: 'APPROVED', label: 'المقبولة' },
  { id: 'REJECTED', label: 'المرفوضة' },
];

const TargetOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myRequests, loadMyRequests, isLoading } = useTargetStore();
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = () => (
    loadMyRequests({ page: 1, limit: 100, userId: user?.id }).catch(() => [])
  );

  useEffect(() => {
    void loadOrders();
  }, [loadMyRequests, user?.id]);

  const stats = useMemo(() => {
    const base = { all: myRequests.length, pending: 0, approved: 0, rejected: 0 };
    myRequests.forEach((request) => {
      const status = normalizeTargetOrderStatus(request.status).toLowerCase();
      base[status] += 1;
    });
    return base;
  }, [myRequests]);

  const filteredRequests = useMemo(() => (
    selectedStatus === 'ALL'
      ? myRequests
      : myRequests.filter((request) => normalizeTargetOrderStatus(request.status) === selectedStatus)
  ), [myRequests, selectedStatus]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 text-[var(--color-text)]">
      <section className="overflow-hidden rounded-[2rem] border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[radial-gradient(30rem_circle_at_top_right,rgb(var(--color-primary-rgb)/0.14),transparent_44%),linear-gradient(135deg,rgb(var(--color-card-rgb)/0.98),rgb(var(--color-surface-rgb)/0.88))] p-5 shadow-[0_28px_80px_-54px_rgb(var(--color-primary-rgb)/0.42)] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.26)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <ClipboardList className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-black text-[var(--color-text)] sm:text-4xl">طلبات التارجت</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
              سجل كل طلبات التارجت التي أرسلتها، مع متابعة الحالة وفتح تفاصيل أي طلب.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:w-[28rem]">
            {[
              { label: 'الكل', value: stats.all },
              { label: 'قيد الانتظار', value: stats.pending },
              { label: 'مقبولة', value: stats.approved },
              { label: 'مرفوضة', value: stats.rejected },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-elevated-rgb)/0.72)] px-2 py-1.5 shadow-[var(--shadow-subtle)] sm:px-2.5 sm:py-2">
                <p className="text-[9px] font-semibold leading-4 text-[var(--color-text-secondary)] sm:text-[10px]">{item.label}</p>
                <p className="mt-0.5 text-sm font-black leading-5 text-[var(--color-text)] sm:text-base">{formatNumber(item.value, 'en-US')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.82)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedStatus(filter.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                selectedStatus === filter.id
                  ? 'border-[color:rgb(var(--color-primary-rgb)/0.42)] bg-[color:rgb(var(--color-primary-rgb)/0.12)] text-[var(--color-primary)]'
                  : 'border-[color:rgb(var(--color-border-rgb)/0.82)] text-[var(--color-text-secondary)] hover:border-[color:rgb(var(--color-primary-rgb)/0.22)] hover:text-[var(--color-text)]'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={loadOrders} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            تحديث
          </Button>
          <Button type="button" size="sm" onClick={() => navigate('/buy-target')}>
            <Target className="h-4 w-4" />
            طلب جديد
          </Button>
        </div>
      </div>

      {filteredRequests.length ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {filteredRequests.map((request) => {
            const status = normalizeTargetOrderStatus(request.status);
            const appName = request.appNameSnapshot || request.productName || request.app?.name || 'طلب تارجت';
            return (
              <article
                key={request.id}
                className="rounded-[1.35rem] border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-card-rgb)/0.86)] p-4 shadow-[0_20px_60px_-50px_rgb(var(--color-primary-rgb)/0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={getTargetOrderStatusVariant(status)}>{getTargetOrderStatusLabel(status)}</Badge>
                      <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold', getTargetOrderStatusAccentClass(status))}>
                        {formatDateTime(request.createdAt, 'en-US') || 'بدون تاريخ'}
                      </span>
                    </div>
                    <h2 className="truncate text-base font-black text-[var(--color-text)]">{appName}</h2>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      ID الحساب: <span className="font-semibold text-[var(--color-text)]">{request.senderId || request.transferFromId || '-'}</span>
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={() => setSelectedOrder(request)}>
                    <Eye className="h-4 w-4" />
                    تفاصيل
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.55)] p-2">
                    <p className="text-[10px] text-[var(--color-text-secondary)]">الكوينز</p>
                    <p className="mt-1 text-sm font-black text-[var(--color-text)]">{formatNumber(request.coinAmount || request.quantity, 'en-US')}</p>
                  </div>
                  <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.55)] p-2">
                    <p className="text-[10px] text-[var(--color-text-secondary)]">الدفع</p>
                    <p className="mt-1 truncate text-sm font-black text-[var(--color-text)]">{request.paymentMethod || request.paymentMethodName || '-'}</p>
                  </div>
                  <div className="rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] p-2">
                    <p className="text-[10px] text-[var(--color-text-secondary)]">الإجمالي</p>
                    <p className="mt-1 text-sm font-black text-[var(--color-primary)]">
                      {formatNumber(request.totalPrice, 'en-US', { maximumFractionDigits: 2 })} EGP
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[1.6rem] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.86)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-8 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-[var(--color-primary)]" />
          <h2 className="mt-3 text-lg font-black text-[var(--color-text)]">لا توجد طلبات في هذا السجل</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
            بعد إرسال طلب تارجت جديد سيظهر هنا فورًا بدون الحاجة للبحث عنه في أي مكان آخر.
          </p>
          <Button type="button" className="mt-4 rounded-xl" onClick={() => navigate('/buy-target')}>
            <ArrowRight className="h-4 w-4" />
            الذهاب لبيع تارجت
          </Button>
        </section>
      )}

      <TargetOrderDetailsModal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  );
};

export default TargetOrders;
