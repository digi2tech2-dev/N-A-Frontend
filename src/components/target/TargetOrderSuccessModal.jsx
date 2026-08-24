import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  Hash,
  ReceiptText,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { formatDateTime, formatNumber } from '../../utils/intl';
import {
  getTargetOrderStatusLabel,
  getTargetOrderStatusVariant,
  normalizeTargetOrderStatus,
} from '../../utils/targetOrders';
import { isSiteWalletPaymentMethod } from '../../utils/paymentSettings';
import { resolveImageUrl } from '../../utils/imageUrl';

const SummaryItem = ({ icon: Icon, label, value, tone = 'emerald' }) => (
  <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.66)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-3 shadow-[0_14px_32px_-28px_rgb(15_23_42/0.45)] transition hover:border-[color:rgb(var(--color-primary-rgb)/0.3)]">
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
      tone === 'amber'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
    }`}>
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-bold text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-[var(--color-text)]" title={String(value || '-')}>
        {value || '-'}
      </p>
    </div>
  </div>
);

const getPaymentMethodLabel = (order) => {
  if (isSiteWalletPaymentMethod(order.paymentMethodId || order.paymentMethod || order.paymentMethodName)) {
    return 'محفظة الموقع';
  }
  return order.paymentMethodName || order.paymentMethod || '-';
};

const TargetOrderSuccessModal = ({ isOpen, onClose, order, onViewOrders }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!order) return null;

  const status = normalizeTargetOrderStatus(order.status || 'PENDING');
  const appName = order.appNameSnapshot || order.productName || order.app?.name || 'طلب تارجت';
  const dollarAmount = Number(order.coinAmount ?? order.quantity ?? 0);
  const unitPrice = Number(order.unitPriceSnapshot ?? order.unitPrice ?? order.app?.unitPrice ?? 0);
  const totalPrice = Number(order.totalPrice ?? (dollarAmount * unitPrice));
  const accountId = order.senderId || order.transferFromId || '-';
  const orderId = String(order.id || '').trim();
  const shortOrderId = orderId ? `#${orderId.slice(-10).toUpperCase()}` : '';
  const appImage = order.app?.image || order.appImageSnapshot || '';

  const copyOrderId = async () => {
    if (!orderId) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderId);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = orderId;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تأكيد طلب بيع التارجت"
      size="lg"
      className="z-[240]"
      placement="bottom"
      footer={(
        <div className="grid grid-cols-[0.8fr_1.2fr] gap-2.5">
          <Button type="button" variant="secondary" className="h-11 rounded-xl" onClick={onClose}>
            إغلاق
          </Button>
          <Button type="button" className="h-11 rounded-xl bg-[linear-gradient(110deg,#059669,#10b981,#0d9488)] text-white shadow-[0_16px_32px_-18px_rgb(16_185_129/0.9)]" onClick={onViewOrders}>
            <ReceiptText className="h-4 w-4" />
            عرض طلباتي
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    >
      <div className="space-y-3.5" dir="rtl">
        <section className="relative isolate overflow-hidden rounded-[1.55rem] border border-emerald-300/55 bg-[linear-gradient(145deg,#ecfdf5_0%,#f0fdfa_48%,#ffffff_100%)] px-4 py-5 text-center shadow-[0_24px_60px_-42px_rgb(16_185_129/0.62)] dark:border-emerald-400/25 dark:bg-[radial-gradient(22rem_circle_at_top,rgb(16_185_129/0.18),transparent_58%),linear-gradient(145deg,rgb(5_46_34/0.9),rgb(var(--color-card-rgb)/0.92))] sm:px-6">
          <span className="pointer-events-none absolute -right-10 -top-12 -z-10 h-36 w-36 rounded-full bg-emerald-300/25 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-14 -left-10 -z-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" />
          <span className="absolute left-4 top-4 text-emerald-500/45"><Sparkles className="h-5 w-5" /></span>

          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[linear-gradient(145deg,#34d399,#059669)] text-white shadow-[0_16px_34px_-14px_rgb(5_150_105/0.75)] dark:border-emerald-950/70">
            <CheckCircle2 className="h-8 w-8" />
            <span className="absolute inset-[-7px] -z-10 animate-pulse rounded-full border border-emerald-400/35" />
          </span>
          <h3 className="mt-3 text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">تم استلام طلبك بنجاح</h3>
          <p className="mx-auto mt-1 max-w-md text-xs font-semibold leading-5 text-emerald-800/70 dark:text-emerald-100/65">
            طلب بيع {appName} وصل إلينا، وسيتم تحديث حالته بعد المراجعة مباشرة.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
            <Badge variant={getTargetOrderStatusVariant(status)}>{getTargetOrderStatusLabel(status)}</Badge>
            {orderId ? (
              <button
                type="button"
                onClick={copyOrderId}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300/70 bg-white/75 px-2.5 py-1 text-[10px] font-black text-emerald-800 shadow-sm transition hover:border-emerald-500 dark:border-emerald-300/20 dark:bg-black/15 dark:text-emerald-100"
                title={`نسخ رقم الطلب: ${orderId}`}
              >
                <Hash className="h-3 w-3" />
                <span dir="ltr">{shortOrderId}</span>
                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-[1.35fr_0.65fr] gap-2.5">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-emerald-300/60 bg-[linear-gradient(135deg,#047857,#059669_55%,#0d9488)] p-4 text-white shadow-[0_20px_44px_-26px_rgb(5_150_105/0.85)]">
            <span className="absolute -left-7 -top-9 h-24 w-24 rounded-full border border-white/10 bg-white/5" />
            <p className="relative flex items-center gap-1.5 text-[10px] font-bold text-emerald-100/85">
              <WalletCards className="h-4 w-4" />
              صافي قيمة البيع
            </p>
            <p className="relative mt-1.5 flex items-baseline gap-1.5" dir="ltr">
              <strong className="text-2xl font-black tracking-tight sm:text-3xl">{formatNumber(totalPrice, 'en-US', { maximumFractionDigits: 2 })}</strong>
              <span className="text-xs font-black text-emerald-100">EGP</span>
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-amber-300/60 bg-amber-50 p-3.5 text-center shadow-[0_18px_38px_-30px_rgb(217_119_6/0.55)] dark:border-amber-300/20 dark:bg-amber-400/[0.07]">
            <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-200/80 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
              <CircleDollarSign className="h-4 w-4" />
            </span>
            <p className="mt-1.5 text-[9px] font-bold text-amber-800/65 dark:text-amber-100/55">المبلغ المباع</p>
            <p className="mt-0.5 font-black text-amber-900 dark:text-amber-100" dir="ltr">{formatNumber(dollarAmount, 'en-US')} $</p>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-surface-rgb)/0.42)] px-3 py-3.5">
          <div className="relative grid grid-cols-3 gap-1 text-center">
            <span className="absolute right-[16.66%] left-[16.66%] top-4 h-px bg-[linear-gradient(90deg,rgb(16_185_129/0.25),rgb(16_185_129/0.7),rgb(245_158_11/0.45))]" />
            <div className="relative">
              <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_8px_18px_-10px_rgb(16_185_129/0.9)]"><Check className="h-4 w-4" /></span>
              <p className="mt-1.5 text-[9px] font-black text-emerald-700 dark:text-emerald-300">تم الاستلام</p>
            </div>
            <div className="relative">
              <span className="mx-auto grid h-8 w-8 place-items-center rounded-full border-2 border-amber-400 bg-amber-100 text-amber-700 shadow-[0_8px_18px_-10px_rgb(245_158_11/0.8)] dark:bg-amber-950"><Clock3 className="h-3.5 w-3.5" /></span>
              <p className="mt-1.5 text-[9px] font-black text-amber-700 dark:text-amber-300">قيد المراجعة</p>
            </div>
            <div className="relative">
              <span className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-[color:rgb(var(--color-border-rgb)/0.8)] bg-[var(--color-card)] text-[var(--color-text-secondary)]"><WalletCards className="h-3.5 w-3.5" /></span>
              <p className="mt-1.5 text-[9px] font-bold text-[var(--color-text-secondary)]">إتمام التحويل</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs font-black text-[var(--color-text)]"><ReceiptText className="h-4 w-4 text-[var(--color-primary)]" />تفاصيل الطلب</p>
            <span className="rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2 py-1 text-[9px] font-black text-[var(--color-primary)]" dir="ltr">1 USD = {formatNumber(unitPrice, 'en-US', { maximumFractionDigits: 2 })} EGP</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {appImage ? (
              <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.66)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-3 shadow-[0_14px_32px_-28px_rgb(15_23_42/0.45)]">
                <img src={resolveImageUrl(appImage)} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0"><p className="text-[9px] font-bold text-[var(--color-text-secondary)]">التطبيق</p><p className="mt-0.5 truncate text-xs font-black text-[var(--color-text)]">{appName}</p></div>
              </div>
            ) : <SummaryItem icon={Target} label="التطبيق" value={appName} />}
            <SummaryItem icon={UserRound} label="معرّف الحساب" value={accountId} tone="amber" />
            <SummaryItem icon={WalletCards} label="طريقة الاستلام" value={getPaymentMethodLabel(order)} />
            <SummaryItem icon={CircleDollarSign} label="سعر الدولار" value={`${formatNumber(unitPrice, 'en-US', { maximumFractionDigits: 2 })} EGP`} tone="amber" />
          </div>
        </section>

        <p className="flex items-center justify-center gap-1.5 rounded-lg bg-[color:rgb(var(--color-surface-rgb)/0.38)] px-3 py-2 text-center text-[9px] font-semibold text-[var(--color-text-secondary)]">
          <Clock3 className="h-3.5 w-3.5 text-emerald-500" />
          تم الإرسال {formatDateTime(order.createdAt || new Date().toISOString(), 'en-US')}
        </p>
      </div>
    </Modal>
  );
};

export default TargetOrderSuccessModal;

