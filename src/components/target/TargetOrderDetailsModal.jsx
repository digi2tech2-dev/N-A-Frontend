import React from 'react';
import { CalendarClock, CheckCircle2, Coins, Copy, CreditCard, Hash, Image as ImageIcon, Mail, Target, User, XCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { formatDateTime, formatNumber } from '../../utils/intl';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  getTargetOrderStatusLabel,
  getTargetOrderStatusVariant,
  normalizeTargetOrderStatus,
} from '../../utils/targetOrders';
import { isSiteWalletPaymentMethod } from '../../utils/paymentSettings';

const copyText = (value) => {
  const text = String(value || '').trim();
  if (!text || !navigator?.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).catch(() => null);
};

const DetailItem = ({ icon: Icon, label, value, copyable = false }) => (
  <div className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.55)] p-3">
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">
      <Icon className="h-3.5 w-3.5 text-[var(--color-primary)]" />
      {label}
    </div>
    {copyable ? (
      <button
        type="button"
        onClick={() => copyText(value)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.24)] px-2 py-1 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
        title="نسخ"
      >
        <Copy className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{value || '-'}</span>
      </button>
    ) : (
      <p className="break-words text-sm font-bold text-[var(--color-text)]">{value || '-'}</p>
    )}
  </div>
);

const CustomerIdentity = ({ order }) => {
  const userId = order.userId || order.customerId || '';
  const userName = order.userName || order.customerName || '';
  const userEmail = order.userEmail || order.customerEmail || '';

  if (!userId && !userName && !userEmail) return null;

  return (
    <div className="mt-3 rounded-[1.2rem] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.55)] p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">
        <User className="h-3.5 w-3.5 text-[var(--color-primary)]" />
        بيانات صاحب الطلب
      </div>
      {userId ? (
        <button
          type="button"
          onClick={() => copyText(userId)}
          className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.24)] px-2 py-1 text-[10px] font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
          title="نسخ ID الحساب"
        >
          <Copy className="h-3 w-3 shrink-0" />
          <span className="truncate">ID الحساب: {userId}</span>
        </button>
      ) : null}
      {userName ? <p className="truncate text-sm font-black text-[var(--color-text)]">{userName}</p> : null}
      {userEmail ? (
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--color-text-secondary)]">
          <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
          <span className="truncate">{userEmail}</span>
        </p>
      ) : null}
    </div>
  );
};

const TargetOrderDetailsModal = ({
  isOpen,
  onClose,
  order,
  canManage = false,
  isUpdating = false,
  onStatusChange,
}) => {
  if (!order) return null;

  const proofUrl = resolveImageUrl(order.screenshotProof || order.proofImage || '');
  const status = normalizeTargetOrderStatus(order.status);
  const appName = order.appNameSnapshot || order.productName || order.app?.name || 'طلب تارجت';
  const accountId = order.senderId || order.transferFromId;
  const targetAccountId = order.targetAccountIdSnapshot
    || order.targetAccountId
    || order.receivingAccountId
    || order.recipientAccountId
    || order.targetRecipientId
    || order.receivingAccount
    || order.targetAccount
    || order.destinationAccountId
    || order.app?.targetAccountId
    || order.app?.receivingAccountId
    || '';
  const transferNumber = order.transferNumber || order.paymentAccount;
  const transactionNumber = order.transactionNumber || order.transactionId || order.paymentReference;
  const isSiteWallet = isSiteWalletPaymentMethod(order.paymentMethodId || order.paymentMethod || order.paymentMethodName);
  const rejectionReason = order.rejectionReason || order.adminNotes || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تفاصيل الطلب - ${appName}`}
      size="xl"
      className="z-[240]"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-[1.4rem] border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[linear-gradient(135deg,rgb(var(--color-card-rgb)/0.92),rgb(var(--color-surface-rgb)/0.66))] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={getTargetOrderStatusVariant(status)}>{getTargetOrderStatusLabel(status)}</Badge>
              {order.id ? (
                <button
                  type="button"
                  onClick={() => copyText(order.id)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[color:rgb(var(--color-border-rgb)/0.82)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]"
                  title="نسخ رقم الطلب"
                >
                  <Hash className="h-3 w-3 shrink-0" />
                  <span className="truncate">{order.id}</span>
                </button>
              ) : null}
            </div>
            <h3 className="truncate text-xl font-black text-[var(--color-text)]">{appName}</h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {formatDateTime(order.createdAt, 'en-US') || 'تاريخ غير متاح'}
            </p>
            <CustomerIdentity order={order} />
          </div>

          <div className="rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-4 py-3 text-[var(--color-primary)]">
            <p className="text-[11px] font-semibold text-[var(--color-text-secondary)]">الإجمالي</p>
            <p className="text-2xl font-black">
              {formatNumber(order.totalPrice, 'en-US', { maximumFractionDigits: 2 })} EGP
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem icon={Target} label="التطبيق" value={appName} />
          <DetailItem icon={Coins} label="عدد الكوينز" value={formatNumber(order.coinAmount || order.quantity, 'en-US')} />
          <DetailItem icon={Coins} label="سعر الكوين" value={`${formatNumber(order.unitPriceSnapshot || order.unitPrice, 'en-US', { maximumFractionDigits: 2 })} EGP`} />
          <DetailItem icon={Hash} label="ايدي المستلم للتارجت" value={targetAccountId} copyable />
          <DetailItem icon={Hash} label="معرّف الحساب" value={accountId} copyable />
          <DetailItem icon={CreditCard} label="طريقة الدفع" value={order.paymentMethod || order.paymentMethodName} />
          {!isSiteWallet ? <DetailItem icon={Copy} label="رقم التحويل" value={transferNumber} copyable /> : null}
          <DetailItem icon={Hash} label="رقم العملية" value={transactionNumber} copyable />
          <DetailItem icon={CalendarClock} label="آخر تحديث" value={formatDateTime(order.updatedAt || order.reviewedAt || order.createdAt, 'en-US')} />
        </div>

        {proofUrl ? (
          <div className="rounded-[1.35rem] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.55)] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[var(--color-text)]">إثبات التحويل</p>
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[var(--color-primary)] hover:underline"
              >
                فتح الصورة
              </a>
            </div>
            <img
              src={proofUrl}
              alt="إثبات التحويل"
              className="max-h-[28rem] w-full rounded-[1rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[1.35rem] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.8)] p-4 text-sm text-[var(--color-text-secondary)]">
            <ImageIcon className="h-4 w-4" />
            لا توجد صورة إثبات مرفقة.
          </div>
        )}

        {status === 'REJECTED' && rejectionReason ? (
          <div className="rounded-[1.2rem] border border-[color:rgb(var(--color-error-rgb)/0.24)] bg-[color:rgb(var(--color-error-rgb)/0.08)] p-4 text-sm text-[var(--color-error)]">
            <p className="mb-1 font-bold">سبب الرفض</p>
            <p className="leading-6">{rejectionReason}</p>
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-col gap-2 border-t border-[color:rgb(var(--color-border-rgb)/0.78)] pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={isUpdating || status === 'PENDING'}
              onClick={() => onStatusChange?.(order.id, 'PENDING')}
              className="rounded-xl"
            >
              قيد الانتظار
            </Button>
            <Button
              type="button"
              disabled={isUpdating || status === 'APPROVED'}
              onClick={() => onStatusChange?.(order.id, 'APPROVED')}
              className="rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              قبول
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isUpdating || status === 'REJECTED'}
              onClick={() => onStatusChange?.(order.id, 'REJECTED')}
              className="rounded-xl"
            >
              <XCircle className="h-4 w-4" />
              رفض
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default TargetOrderDetailsModal;
