import React, { useEffect, useState } from 'react';
import { ArrowUpLeft, Boxes, CheckCircle2, ClipboardList, Target } from 'lucide-react';
import AdminOrdersTable from '../../components/target/AdminOrdersTable';
import AdminProducts from '../../components/target/AdminProducts';
import RejectionReasonModal from '../../components/target/RejectionReasonModal';
import TargetOrderDetailsModal from '../../components/target/TargetOrderDetailsModal';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import useTargetStore from '../../store/useTargetStore';
import useAuthStore from '../../store/useAuthStore';
import useSystemStore from '../../store/useSystemStore';
import { useToast } from '../../components/ui/Toast';
import { formatNumber } from '../../utils/intl';
import { PERMISSIONS, hasPermission } from '../../utils/permissions';
import { getTargetPaymentMethods } from '../../utils/paymentSettings';

const AdminTargetRequests = () => {
  const {
    products,
    requests,
    addProduct,
    updateProduct,
    deleteProduct,
    loadApps,
    loadRequests,
    updateRequestStatus,
  } = useTargetStore();
  const { paymentSettings, loadPaymentSettings } = useSystemStore();
  const { user: actor } = useAuthStore();
  const { addToast } = useToast();
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isRequestsPanelOpen, setIsRequestsPanelOpen] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const canConfirmTargetRequests = hasPermission(actor, PERMISSIONS.CONFIRM_TARGET_REQUESTS);

  useEffect(() => {
    void loadApps({ includeInactive: true });
    void loadRequests({ page: 1, limit: 100 });
    void loadPaymentSettings({ force: true });
  }, [loadApps, loadRequests, loadPaymentSettings]);

  const paymentMethods = getTargetPaymentMethods(paymentSettings);

  const handleAddProduct = async (payload) => {
    await addProduct(payload);
    addToast('تم إنشاء تطبيق التارجت بنجاح.', 'success');
  };

  const handleUpdateProduct = async (id, payload) => {
    await updateProduct(id, payload);
    addToast('تم تحديث تطبيق التارجت بنجاح.', 'success');
  };

  const handleDeleteProduct = async (id) => {
    await deleteProduct(id);
    addToast('تم تعطيل تطبيق التارجت.', 'success');
  };

  const handleStatusChange = async (id, status) => {
    if (!canConfirmTargetRequests) {
      addToast('ليس لديك صلاحية مراجعة طلبات التارجت.', 'error');
      return;
    }

    if (String(status).toUpperCase() === 'REJECTED') {
      setRejectingRequest(requests.find((request) => String(request.id) === String(id)) || { id });
      return;
    }

    setIsStatusUpdating(true);
    try {
      const updated = await updateRequestStatus(id, status, { rejectionReason: '' });
      setSelectedRequest((current) => (String(current?.id) === String(id) ? { ...current, ...updated } : current));
      addToast('تم تحديث حالة طلب التارجت.', 'success');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleConfirmReject = async (reason) => {
    if (!rejectingRequest?.id) return;
    setIsStatusUpdating(true);
    try {
      const updated = await updateRequestStatus(rejectingRequest.id, 'REJECTED', { adminNotes: reason, rejectionReason: reason });
      setSelectedRequest((current) => (String(current?.id) === String(rejectingRequest.id) ? { ...current, ...updated } : current));
      setRejectingRequest(null);
      addToast('تم رفض طلب التارجت.', 'success');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const pendingCount = requests.filter((request) => String(request.status).toUpperCase() === 'PENDING').length;
  const completedCount = requests.filter((request) => String(request.status).toUpperCase() === 'APPROVED').length;

  return (
    <div className="min-w-0 space-y-6 text-[var(--color-text)]">
      <section className="overflow-hidden rounded-[2rem] border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[radial-gradient(34rem_circle_at_top_right,rgb(var(--color-primary-rgb)/0.14),transparent_44%),linear-gradient(135deg,rgb(var(--color-card-rgb)/0.98),rgb(var(--color-surface-rgb)/0.92))] p-5 shadow-[0_28px_80px_-54px_rgb(var(--color-primary-rgb)/0.42)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.26)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <Target className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-black text-[var(--color-text)] sm:text-4xl">تطبيقات وطلبات التارجت</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
              إدارة تطبيقات التارجت ومراجعة طلبات العملاء من لوحة التحكم.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[32rem]">
            <div className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-elevated-rgb)/0.72)] p-4 shadow-[var(--shadow-subtle)]">
              <Boxes className="h-5 w-5 text-[var(--color-primary)]" />
              <p className="mt-2 text-2xl font-black text-[var(--color-text)]">{formatNumber(products.length, 'en-US')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">التطبيقات</p>
            </div>
            <div className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-elevated-rgb)/0.72)] p-4 shadow-[var(--shadow-subtle)]">
              <ClipboardList className="h-5 w-5 text-[var(--color-primary)]" />
              <p className="mt-2 text-2xl font-black text-[var(--color-text)]">{formatNumber(pendingCount, 'en-US')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">قيد المراجعة</p>
            </div>
            <div className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-elevated-rgb)/0.72)] p-4 shadow-[var(--shadow-subtle)]">
              <Target className="h-5 w-5 text-[var(--color-primary)]" />
              <p className="mt-2 text-2xl font-black text-[var(--color-text)]">{formatNumber(completedCount, 'en-US')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">المقبولة</p>
            </div>
          </div>
        </div>
      </section>

      <AdminProducts
        products={products}
        paymentMethods={paymentMethods}
        onAdd={handleAddProduct}
        onUpdate={handleUpdateProduct}
        onDelete={handleDeleteProduct}
      />

      <section className="rounded-[1.5rem] border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[linear-gradient(135deg,rgb(var(--color-card-rgb)/0.94),rgb(var(--color-surface-rgb)/0.72))] p-4 shadow-[0_22px_62px_-48px_rgb(var(--color-primary-rgb)/0.34)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-[var(--color-text)]">طلبات التارجت</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                افتح الطلبات في خانة مستقلة لمراجعة التحويلات والإثباتات بدون ازدحام الصفحة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:rgb(var(--color-warning-rgb)/0.26)] bg-[color:rgb(var(--color-warning-rgb)/0.1)] px-3 py-1.5 text-[11px] font-bold text-[var(--color-warning)]">
              <ClipboardList className="h-3.5 w-3.5" />
              {formatNumber(pendingCount, 'en-US')} قيد المراجعة
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:rgb(var(--color-success-rgb)/0.22)] bg-[color:rgb(var(--color-success-rgb)/0.1)] px-3 py-1.5 text-[11px] font-bold text-[var(--color-success)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {formatNumber(completedCount, 'en-US')} مقبولة
            </span>
            <Button type="button" className="h-9 rounded-xl px-3 text-xs" onClick={() => setIsRequestsPanelOpen(true)}>
              فتح الطلبات
              <ArrowUpLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isRequestsPanelOpen}
        onClose={() => setIsRequestsPanelOpen(false)}
        title="طلبات التارجت"
        size="xl"
        className="z-[240]"
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.58)] p-3">
              <p className="text-[11px] text-[var(--color-text-secondary)]">كل الطلبات</p>
              <p className="mt-1 text-xl font-black text-[var(--color-text)]">{formatNumber(requests.length, 'en-US')}</p>
            </div>
            <div className="rounded-2xl border border-[color:rgb(var(--color-warning-rgb)/0.24)] bg-[color:rgb(var(--color-warning-rgb)/0.08)] p-3">
              <p className="text-[11px] text-[var(--color-text-secondary)]">قيد المراجعة</p>
              <p className="mt-1 text-xl font-black text-[var(--color-warning)]">{formatNumber(pendingCount, 'en-US')}</p>
            </div>
            <div className="rounded-2xl border border-[color:rgb(var(--color-success-rgb)/0.22)] bg-[color:rgb(var(--color-success-rgb)/0.08)] p-3">
              <p className="text-[11px] text-[var(--color-text-secondary)]">المقبولة</p>
              <p className="mt-1 text-xl font-black text-[var(--color-success)]">{formatNumber(completedCount, 'en-US')}</p>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-2">
            <AdminOrdersTable
              requests={requests}
              onStatusChange={handleStatusChange}
              onViewDetails={(request) => setSelectedRequest(request)}
              canConfirm={canConfirmTargetRequests}
              showHeader={false}
            />
          </div>
        </div>
      </Modal>

      <RejectionReasonModal
        isOpen={Boolean(rejectingRequest)}
        onClose={() => setRejectingRequest(null)}
        onConfirm={handleConfirmReject}
      />

      <TargetOrderDetailsModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        order={selectedRequest}
        canManage={canConfirmTargetRequests}
        isUpdating={isStatusUpdating}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default AdminTargetRequests;
