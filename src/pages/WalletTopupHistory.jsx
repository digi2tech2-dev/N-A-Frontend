import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  CreditCard,
  Hash,
  Layers3,
  ReceiptText,
  RefreshCw,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { cn } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import useAuthStore from '../store/useAuthStore';
import useTopupStore from '../store/useTopupStore';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime, formatNumber } from '../utils/intl';
import { formatWalletAmount } from '../utils/storefront';
import { resolveTopupExecutionCurrency } from '../utils/transactionCurrency';

const normalizeStatus = (status) => String(status || 'pending').trim().toLowerCase();

const getStatusGroup = (status) => {
  const normalized = normalizeStatus(status);
  if (['approved', 'completed', 'complete', 'success'].includes(normalized)) return 'approved';
  if (['rejected', 'denied', 'failed', 'cancelled', 'canceled'].includes(normalized)) return 'rejected';
  return 'pending';
};

const STATUS_META = {
  approved: {
    label: 'مكتملة',
    Icon: CheckCircle2,
    badge: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-500 dark:text-emerald-300',
    icon: 'bg-emerald-500/12 text-emerald-500 dark:text-emerald-300',
    bar: 'from-emerald-400 via-teal-400 to-cyan-400',
  },
  pending: {
    label: 'قيد الانتظار',
    Icon: Clock3,
    badge: 'border-amber-400/30 bg-amber-500/12 text-amber-600 dark:text-amber-300',
    icon: 'bg-amber-500/12 text-amber-600 dark:text-amber-300',
    bar: 'from-amber-400 via-orange-400 to-yellow-300',
  },
  rejected: {
    label: 'مرفوضة',
    Icon: XCircle,
    badge: 'border-rose-400/30 bg-rose-500/12 text-rose-500 dark:text-rose-300',
    icon: 'bg-rose-500/12 text-rose-500 dark:text-rose-300',
    bar: 'from-rose-500 via-fuchsia-500 to-pink-400',
  },
};

const FILTERS = [
  {
    key: 'all', label: 'الكل', Icon: Layers3,
    active: 'border-violet-300/45 bg-[linear-gradient(145deg,#7c3aed,#c026d3)] text-white shadow-violet-950/45',
    icon: 'bg-violet-400/18 text-violet-100',
  },
  {
    key: 'pending', label: 'انتظار', Icon: Clock3,
    active: 'border-amber-300/50 bg-[linear-gradient(145deg,#d97706,#f59e0b)] text-white shadow-amber-950/45',
    icon: 'bg-amber-400/18 text-amber-200',
  },
  {
    key: 'approved', label: 'مقبولة', Icon: CheckCircle2,
    active: 'border-emerald-300/50 bg-[linear-gradient(145deg,#059669,#14b8a6)] text-white shadow-emerald-950/45',
    icon: 'bg-emerald-400/18 text-emerald-200',
  },
  {
    key: 'rejected', label: 'مرفوضة', Icon: XCircle,
    active: 'border-rose-300/50 bg-[linear-gradient(145deg,#e11d48,#db2777)] text-white shadow-rose-950/45',
    icon: 'bg-rose-400/18 text-rose-200',
  },
];

const getTopupAmount = (topup) => Number(
  topup?.actualPaidAmount
  ?? topup?.amountWithFee
  ?? topup?.requestedAmount
  ?? topup?.requestedCoins
  ?? topup?.amount
  ?? 0
);

const getTopupFee = (topup) => Number(
  topup?.paymentFeeAmount
  ?? topup?.feeAmount
  ?? topup?.fees
  ?? 0
);

const getTopupMethod = (topup) => (
  topup?.paymentChannel
  || topup?.paymentMethodName
  || topup?.methodName
  || topup?.method
  || 'إضافة رصيد'
);

const PAGE_SIZE = 12;

const WalletTopupHistory = () => {
  const { dir } = useLanguage();
  const { user } = useAuthStore();
  const { topups, loadTopups } = useTopupStore();
  const { addToast } = useToast();
  const userId = String(user?.id || '').trim();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTopups = async () => {
    setIsRefreshing(true);
    try {
      await loadTopups({ force: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyOrderId = async (orderId) => {
    const value = String(orderId || '').trim();
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Copy failed');
      }
      addToast('تم نسخ رقم الطلب', 'success');
    } catch (_error) {
      addToast('تعذر نسخ رقم الطلب', 'error');
    }
  };

  useEffect(() => {
    void refreshTopups();
    // Refresh only when the store loader changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTopups]);

  const myTopups = useMemo(() => (
    (topups || [])
      .filter((topup) => String(topup?.type || 'regular') !== 'game_topup')
      .filter((topup) => !userId || String(topup?.userId || '').trim() === userId)
      .sort((left, right) => new Date(right?.createdAt || right?.date || 0) - new Date(left?.createdAt || left?.date || 0))
  ), [topups, userId]);

  const stats = useMemo(() => {
    const summary = { all: myTopups.length, pending: 0, approved: 0, rejected: 0 };
    myTopups.forEach((topup) => {
      summary[getStatusGroup(topup.status)] += 1;
    });
    return summary;
  }, [myTopups]);

  const filteredTopups = useMemo(() => (
    activeFilter === 'all'
      ? myTopups
      : myTopups.filter((topup) => getStatusGroup(topup.status) === activeFilter)
  ), [activeFilter, myTopups]);

  const totalPages = Math.max(1, Math.ceil(filteredTopups.length / PAGE_SIZE));
  const visibleTopups = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredTopups.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredTopups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, userId]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 pb-6 text-[var(--color-text)] sm:space-y-4" dir={dir}>
      <section className="relative isolate overflow-hidden rounded-[1.65rem] border border-violet-300/20 bg-[radial-gradient(24rem_circle_at_95%_-18%,rgb(244_114_208/0.35),transparent_48%),radial-gradient(20rem_circle_at_0%_110%,rgb(37_99_235/0.46),transparent_50%),linear-gradient(135deg,#10082b_0%,#25215d_40%,#6d28d9_76%,#a21caf_115%)] px-4 py-5 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.13),0_32px_75px_-42px_rgb(109_40_217/0.95),0_18px_45px_-36px_rgb(192_38_211/0.9)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -end-16 -top-20 -z-10 h-52 w-52 rounded-full bg-fuchsia-300/18 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -start-16 -z-10 h-52 w-52 rounded-full bg-blue-500/22 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[length:30px_30px] [mask-image:linear-gradient(120deg,black,transparent_78%)]" />

        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-[linear-gradient(145deg,rgb(255_255_255/0.16),rgb(255_255_255/0.07))] text-fuchsia-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_16px_36px_-24px_rgb(0_0_0/0.9)] backdrop-blur-xl">
            <WalletCards className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.16em] text-fuchsia-200">حسابك المالي</p>
            <h1 className="mt-1 text-lg font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgb(0_0_0/0.22)] sm:text-2xl">سجل طلبات إضافة الرصيد</h1>
            <p className="mt-1 text-[11px] leading-5 text-violet-100/72 sm:text-sm">
              تابع حالة طلباتك ومبلغ وطريقة الدفع في مكان واحد.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {FILTERS.map(({ key, label, Icon, active, icon }) => {
            const selected = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                aria-pressed={selected}
                className={cn(
                  'group min-w-0 rounded-2xl border px-1.5 py-2.5 text-center transition duration-200 sm:flex sm:items-center sm:gap-2.5 sm:px-3 sm:text-start',
                  selected
                    ? `${active} -translate-y-0.5 shadow-[0_18px_38px_-24px_currentColor]`
                    : 'border-white/12 bg-white/7 text-violet-100/78 backdrop-blur-md hover:border-white/24 hover:bg-white/12 hover:text-white'
                )}
              >
                <span className={cn('mx-auto hidden h-8 w-8 shrink-0 place-items-center rounded-xl sm:grid', icon)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[9px] font-bold sm:text-[10px]">{label}</span>
                  <span className="mt-0.5 block text-base font-black leading-none sm:text-lg">{formatNumber(stats[key], 'en-US')}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-[color:rgb(var(--color-border-rgb)/0.76)] bg-[color:rgb(var(--color-card-rgb)/0.82)] shadow-[0_28px_70px_-58px_rgb(var(--color-primary-rgb)/0.65)]">
        <header className="flex items-center justify-between gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.7)] px-3.5 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black sm:text-base">طلباتك الأخيرة</h2>
              <p className="mt-0.5 text-[9px] font-semibold text-[var(--color-text-secondary)] sm:text-[10px]">
                عرض {formatNumber(filteredTopups.length, 'en-US')} طلب
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshTopups}
            disabled={isRefreshing}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.25)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 text-[10px] font-black text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.14)] disabled:cursor-wait disabled:opacity-60 sm:text-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'جارٍ التحديث' : 'تحديث'}
          </button>
        </header>

        {visibleTopups.length ? (
          <div className="grid gap-2.5 p-2.5 md:grid-cols-2 sm:p-3.5">
            {visibleTopups.map((topup) => {
              const statusGroup = getStatusGroup(topup.status);
              const statusMeta = STATUS_META[statusGroup];
              const StatusIcon = statusMeta.Icon;
              const currency = resolveTopupExecutionCurrency(topup, user?.currency || 'USD');
              const amount = getTopupAmount(topup);
              const fee = getTopupFee(topup);
              const createdAt = topup?.createdAt || topup?.date;
              const method = getTopupMethod(topup);

              return (
                <article
                  key={topup.id}
                  className="group relative overflow-hidden rounded-[1.25rem] border border-[color:rgb(var(--color-border-rgb)/0.76)] bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.94),rgb(var(--color-surface-rgb)/0.62))] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.32)] hover:shadow-[0_24px_50px_-38px_rgb(var(--color-primary-rgb)/0.72)] sm:p-4"
                >
                  <span className={cn('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-90', statusMeta.bar)} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl', statusMeta.icon)}>
                        <StatusIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-xs font-black sm:text-sm">{method}</h3>
                        <button
                          type="button"
                          onClick={() => copyOrderId(topup.id)}
                          title="اضغط لنسخ رقم الطلب"
                          aria-label={`نسخ رقم الطلب ${topup.id}`}
                          className="mt-1 flex max-w-full items-center gap-1 rounded-lg px-1 py-0.5 text-[9px] font-semibold text-[var(--color-text-secondary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.1)] hover:text-[var(--color-primary)] sm:text-[10px]"
                        >
                          <Hash className="h-3 w-3 shrink-0" />
                          <span className="truncate [direction:ltr]">{topup.id}</span>
                          <Copy className="h-3 w-3 shrink-0 opacity-70" />
                        </button>
                      </div>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black sm:text-[10px]', statusMeta.badge)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3 rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.14)] bg-[linear-gradient(135deg,rgb(var(--color-primary-rgb)/0.07),rgb(192_38_211/0.05))] px-3 py-2.5">
                    <div>
                      <p className="flex items-center gap-1 text-[9px] font-bold text-[var(--color-text-secondary)]">
                        <CircleDollarSign className="h-3 w-3" />
                        المبلغ
                      </p>
                      <p className="mt-1 text-base font-black tracking-tight text-[var(--color-primary)] [direction:ltr] sm:text-lg">
                        {formatWalletAmount(amount, currency || 'USD')}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[9px] font-bold text-[var(--color-text-secondary)]">الرسوم</p>
                      <p className="mt-1 text-[11px] font-black [direction:ltr]">
                        {formatWalletAmount(fee, currency || 'USD')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[color:rgb(var(--color-border-rgb)/0.62)] pt-3 text-[9px] text-[var(--color-text-secondary)] sm:text-[10px]">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                      <span className="truncate">
                        {formatDateTime(createdAt, 'ar-EG', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        }) || 'بدون تاريخ'}
                      </span>
                    </p>
                    <p className="flex min-w-0 items-center justify-end gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 shrink-0 text-fuchsia-500" />
                      <span className="truncate">{currency || 'USD'}</span>
                    </p>
                  </div>

                  {topup.adminNote ? (
                    <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/7 px-3 py-2 text-[10px] font-semibold leading-5 text-rose-500 dark:text-rose-300">
                      {topup.adminNote}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-[color:rgb(var(--color-primary-rgb)/0.35)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] text-[var(--color-primary)]">
              <CreditCard className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-sm font-black sm:text-base">
              {myTopups.length ? 'لا توجد طلبات بهذه الحالة' : 'لا توجد طلبات إضافة رصيد'}
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-[var(--color-text-secondary)] sm:text-xs">
              {myTopups.length ? 'اختر حالة أخرى لعرض الطلبات.' : 'ستظهر طلبات إضافة الرصيد هنا بعد إرسال أول طلب.'}
            </p>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="صفحات طلبات الرصيد">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="h-9 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.85)] px-3 text-[10px] font-black transition hover:border-violet-400/40 hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            السابق
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setCurrentPage(pageNumber)}
              aria-current={currentPage === pageNumber ? 'page' : undefined}
              className={cn(
                'h-9 min-w-9 rounded-xl border px-2 text-xs font-black transition',
                currentPage === pageNumber
                  ? 'border-violet-400/45 bg-[linear-gradient(135deg,#7c3aed,#c026d3)] text-white shadow-[0_12px_28px_-18px_rgb(124_58_237/0.9)]'
                  : 'border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.85)] hover:border-violet-400/40 hover:text-[var(--color-primary)]'
              )}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="h-9 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.85)] px-3 text-[10px] font-black transition hover:border-violet-400/40 hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            التالي
          </button>
        </nav>
      )}
    </div>
  );
};

export default WalletTopupHistory;
