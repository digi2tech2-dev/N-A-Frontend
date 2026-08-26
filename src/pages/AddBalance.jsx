import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpLeft, Building2, ChevronDown, CreditCard, Globe2, Landmark, ShieldCheck, Smartphone, Wallet, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import useAuthStore from '../store/useAuthStore';
import useSystemStore from '../store/useSystemStore';
import { resolveImageUrl } from '../utils/imageUrl';
import { formatWalletNumber } from '../utils/storefront';
import { getActivePaymentGroups } from '../utils/paymentSettings';

const getMethodIcon = (method) => {
  const token = `${method?.type || ''} ${method?.id || ''} ${method?.name || ''}`.toLowerCase();
  if (token.includes('bank') || token.includes('تحويل')) return Building2;
  if (token.includes('wallet') || token.includes('vodafone') || token.includes('orange') || token.includes('etisalat')) return Smartphone;
  return CreditCard;
};

const getGroupIcon = (group) => {
  const token = `${group?.name || ''} ${group?.currency || ''}`.toLowerCase();
  if (token.includes('عالمي') || token.includes('global') || token.includes('usd')) return Globe2;
  if (token.includes('مغرب') || token.includes('morocco') || token.includes('mad')) return Landmark;
  if (token.includes('مصر') || token.includes('egypt') || token.includes('egp')) return Building2;
  return Wallet;
};

const getAvailableLabel = (count, isRTL) => {
  if (!isRTL) return `${count} ${count === 1 ? 'available method' : 'available methods'}`;
  if (count === 1) return 'وسيلة دفع متاحة';
  if (count === 2) return 'وسيلتا دفع متاحتان';
  return `${count} وسائل دفع متاحة`;
};

const PaymentMethodButton = ({ method, onSelect, isRTL }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = getMethodIcon(method);
  const showImage = Boolean(method?.image) && !imageFailed;

  return (
    <button
      type="button"
      onClick={() => onSelect(method)}
      aria-label={`${isRTL ? 'اختيار' : 'Select'} ${method.name}`}
      className="group relative flex min-h-[6rem] min-w-0 items-center gap-3.5 overflow-hidden rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.7)] bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.96),rgb(var(--color-surface-rgb)/0.68))] p-3.5 text-start shadow-[0_16px_34px_-26px_rgb(15_23_42/0.38),inset_0_1px_rgb(255_255_255/0.18)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-[color:rgb(var(--color-primary-rgb)/0.5)] hover:shadow-[0_26px_46px_-28px_rgb(var(--color-primary-rgb)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--color-primary-rgb)/0.42)] sm:p-4"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgb(var(--color-primary-rgb)/0.28),rgb(var(--color-primary-rgb)/0.95),rgb(236_72_153/0.72))] opacity-75" />
      <span className="pointer-events-none absolute -start-10 -top-10 h-28 w-28 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.1)] blur-3xl" />
      <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.18),rgb(var(--color-primary-rgb)/0.06))] text-[var(--color-primary)] shadow-[inset_0_1px_rgb(255_255_255/0.2),0_14px_28px_-22px_rgb(var(--color-primary-rgb)/0.85)] sm:h-16 sm:w-16">
        {showImage ? (
          <img
            src={resolveImageUrl(method.image)}
            alt=""
            className="h-full w-full object-contain p-1"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </span>

      <span className="relative block min-w-0 flex-1">
        <span className="mb-1.5 inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16_185_129/0.8)]" />
          {isRTL ? 'متاح الآن' : 'Available now'}
        </span>
        <strong className="block truncate text-sm font-black tracking-tight text-[var(--color-text)] sm:text-base">
          {method.name}
        </strong>
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[var(--color-primary)] sm:text-xs">
          {isRTL ? 'اختيار الوسيلة' : 'Select method'}
          <ArrowUpLeft className="h-3.5 w-3.5" />
        </span>
      </span>

      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)] transition-transform duration-200 group-hover:-translate-x-1">
        <ArrowUpLeft className="h-4 w-4" />
      </span>
    </button>
  );
};

const AddBalance = ({
  embedded = false,
  automaticAmount = null,
  automaticCurrency = '',
  onSelectMethod = null,
}) => {
  const { dir } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const paymentSettings = useSystemStore((state) => state.paymentSettings);
  const loadPaymentSettings = useSystemStore((state) => state.loadPaymentSettings);
  const isRTL = dir === 'rtl';

  useEffect(() => {
    void loadPaymentSettings({ force: true }).catch(() => null);
  }, [loadPaymentSettings]);

  const currentBalance = Number(user?.walletBalance ?? user?.coins ?? user?.balance ?? 0);
  const currentCurrency = String(user?.currency || 'USD').toUpperCase();
  const suggestedAmount = Number(automaticAmount ?? searchParams.get('amount') ?? 0);
  const suggestedCurrency = String(automaticCurrency || searchParams.get('currency') || currentCurrency).toUpperCase();
  const isAutomaticTopup = (embedded || searchParams.get('mode') === 'auto')
    && Number.isFinite(suggestedAmount)
    && suggestedAmount > 0;
  const [openGroupId, setOpenGroupId] = useState(null);

  const paymentGroups = useMemo(
    () => getActivePaymentGroups(paymentSettings, { fallbackToDefault: false }),
    [paymentSettings]
  );
  const availableMethodsCount = useMemo(
    () => paymentGroups.reduce((total, group) => total + group.methods.length, 0),
    [paymentGroups]
  );

  useEffect(() => {
    if (!paymentGroups.length) {
      setOpenGroupId(null);
      return;
    }
    setOpenGroupId((current) => (
      paymentGroups.some((group) => String(group.id) === String(current))
        ? current
        : paymentGroups[0].id
    ));
  }, [paymentGroups]);

  const handleMethodSelect = (method) => {
    if (onSelectMethod) {
      onSelectMethod(method);
      return;
    }

    const next = new URLSearchParams();
    if (isAutomaticTopup) {
      next.set('amount', String(suggestedAmount));
      next.set('currency', suggestedCurrency);
      next.set('mode', 'auto');
    }
    const query = next.toString();
    navigate(`/wallet/payment-details/${method.id}${query ? `?${query}` : ''}`);
  };

  return (
    <div className={embedded ? 'w-full min-w-0 overflow-x-hidden pb-1' : 'min-h-full pb-6'} dir={dir}>
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-3 px-1 sm:space-y-4 sm:px-2">
        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-700/30 bg-[radial-gradient(28rem_circle_at_100%_-30%,rgb(96_165_250/0.3),transparent_54%),radial-gradient(20rem_circle_at_0%_120%,rgb(45_212_191/0.18),transparent_58%),linear-gradient(135deg,#0b1224_0%,#14213d_48%,#1d4e75_100%)] p-5 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.13),0_30px_70px_-38px_rgb(15_23_42/0.8)] sm:p-7">
          <span className="pointer-events-none absolute -end-8 -top-12 -z-10 h-32 w-32 rounded-full border border-white/10 bg-white/8 blur-[1px]" />
          <span className="pointer-events-none absolute end-12 top-2 -z-10 h-20 w-20 rounded-full bg-sky-300/20 blur-3xl" />
          <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[length:28px_28px] [mask-image:linear-gradient(110deg,black,transparent_72%)]" />

          <div className="relative flex items-center justify-between gap-3 sm:gap-5">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.65rem] font-black text-sky-100 backdrop-blur-md">
                <Wallet className="h-3 w-3" />
                {isRTL ? 'المحفظة' : 'Wallet'}
              </p>
              <h1 className="mt-3 text-xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgb(0_0_0/0.24)] sm:text-3xl">
                {t('wallet.addBalance')}
              </h1>
              <p className="mt-1.5 max-w-sm text-xs font-semibold leading-5 text-slate-200/80 sm:text-sm">
                {isRTL ? 'اختر وسيلة الدفع المناسبة وأكمل البيانات' : 'Choose a payment method and complete the details'}
              </p>
            </div>

            <div className="relative shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 text-end shadow-[inset_0_1px_0_rgb(255_255_255/0.13),0_16px_35px_-26px_rgb(0_0_0/0.75)] backdrop-blur-xl sm:min-w-40 sm:px-5 sm:py-3.5">
              <span className="pointer-events-none absolute -end-3 -top-5 h-14 w-14 rounded-full bg-sky-300/20 blur-xl" />
                <span className="relative text-[0.62rem] font-bold text-slate-200/75 sm:text-xs">
                {isRTL ? 'الرصيد الحالي' : 'Current balance'}
              </span>
              <div className="relative mt-1 flex items-baseline justify-end gap-1.5" dir="ltr">
                <strong className="font-['Poppins'] text-2xl font-extrabold tracking-tight text-white [font-variant-numeric:tabular-nums] sm:text-3xl">
                  {formatWalletNumber(currentBalance, false, { maximumFractionDigits: 3 })}
                </strong>
                <span className="rounded-md bg-white/12 px-1.5 py-0.5 font-['Poppins'] text-[0.58rem] font-extrabold text-sky-100 sm:text-[0.65rem]">{currentCurrency}</span>
              </div>
            </div>
          </div>
        </section>

        {isAutomaticTopup ? (
          <section className="flex items-center gap-3 rounded-[1rem] border border-amber-400/25 bg-[linear-gradient(115deg,rgb(245_158_11/0.1),rgb(var(--color-primary-rgb)/0.08))] p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-[0_12px_24px_-16px_rgb(245_158_11/0.8)]">
              <Zap className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-black text-[var(--color-text)]">
                {isRTL ? 'شحن آلي لإكمال الشراء' : 'Auto top-up for your purchase'}
              </strong>
              <span className="mt-0.5 block text-[0.68rem] font-semibold text-[var(--color-text-secondary)]">
                {isRTL ? 'سنضع المبلغ المطلوب تلقائيًا بعد اختيار وسيلة الدفع' : 'The required amount will be entered automatically'}
              </span>
            </div>
            <strong className="shrink-0 text-sm font-black text-amber-600 dark:text-amber-300" dir="ltr">
              {formatWalletNumber(suggestedAmount, false, { maximumFractionDigits: 3 })} {suggestedCurrency}
            </strong>
          </section>
        ) : null}

        <section className="flex items-center gap-2 rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.62)] bg-[color:rgb(var(--color-card-rgb)/0.62)] p-2.5 shadow-[0_14px_30px_-28px_rgb(15_23_42/0.55)] sm:gap-3 sm:p-3" aria-label={isRTL ? 'خطوات الدفع' : 'Payment steps'}>
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.09)] px-2.5 py-2 sm:gap-3 sm:px-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] font-['Poppins'] text-xs font-black text-white shadow-[0_8px_18px_-10px_rgb(var(--color-primary-rgb)/0.9)]">1</span>
            <span className="min-w-0">
              <strong className="block truncate text-[0.68rem] font-black text-[var(--color-text)] sm:text-xs">{isRTL ? 'اختر المجموعة' : 'Choose a group'}</strong>
              <span className="mt-0.5 block truncate text-[0.58rem] font-semibold text-[var(--color-text-secondary)] sm:text-[0.65rem]">{isRTL ? 'العملة المناسبة لك' : 'Pick your currency'}</span>
            </span>
          </div>
          <span className="h-px w-5 shrink-0 border-t border-dashed border-[color:rgb(var(--color-border-rgb)/0.85)] sm:w-8" />
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-2 sm:gap-3 sm:px-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[color:rgb(var(--color-border-rgb)/0.8)] bg-[color:rgb(var(--color-surface-rgb)/0.65)] font-['Poppins'] text-xs font-black text-[var(--color-text-secondary)]">2</span>
            <span className="min-w-0">
              <strong className="block truncate text-[0.68rem] font-black text-[var(--color-text)] sm:text-xs">{isRTL ? 'اختر وسيلة الدفع' : 'Choose payment'}</strong>
              <span className="mt-0.5 block truncate text-[0.58rem] font-semibold text-[var(--color-text-secondary)] sm:text-[0.65rem]">{isRTL ? 'ثم تابع بأمان' : 'Continue securely'}</span>
            </span>
          </div>
        </section>

        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[linear-gradient(155deg,rgb(var(--color-card-rgb)/0.9),rgb(var(--color-surface-rgb)/0.62))] p-4 shadow-[0_24px_58px_-48px_rgb(var(--color-primary-rgb)/0.64),inset_0_1px_rgb(255_255_255/0.1)] sm:p-6">
          <span className="pointer-events-none absolute -end-16 -top-20 -z-10 h-44 w-44 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.1)] blur-3xl" />

          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.5)] pb-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.95rem] border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.18),rgb(var(--color-primary-rgb)/0.07))] text-[var(--color-primary)] shadow-[inset_0_1px_rgb(255_255_255/0.14),0_12px_24px_-20px_rgb(var(--color-primary-rgb)/0.8)]">
                <CreditCard className="h-5 w-5" />
                <span className="absolute -end-2 -top-2 h-5 w-5 rounded-full bg-sky-400/20 blur-md" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-black tracking-tight text-[var(--color-text)] sm:text-lg">
                  {isRTL ? 'اختر وسيلة الدفع' : 'Choose a payment method'}
                </h2>
              </div>
            </div>

            {availableMethodsCount > 0 ? (
              <span className="shrink-0 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.16)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 py-1.5 text-[0.65rem] font-black text-[var(--color-primary)]">
                {availableMethodsCount} {isRTL ? 'وسائل دفع' : availableMethodsCount === 1 ? 'method' : 'methods'}
              </span>
            ) : null}
          </div>

          {paymentGroups.length ? (
            <div className="space-y-2.5">
              {paymentGroups.map((group) => {
                const isOpen = String(openGroupId) === String(group.id);
                const GroupIcon = getGroupIcon(group);

                return (
                <article
                  key={group.id}
                  className={`overflow-hidden rounded-2xl border bg-[color:rgb(var(--color-card-rgb)/0.68)] transition-[border-color,box-shadow,background-color] duration-200 ${isOpen
                    ? 'border-[color:rgb(var(--color-primary-rgb)/0.38)] shadow-[0_18px_40px_-30px_rgb(var(--color-primary-rgb)/0.72)]'
                    : 'border-[color:rgb(var(--color-border-rgb)/0.62)]'}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenGroupId((current) => (
                      String(current) === String(group.id) ? null : group.id
                    ))}
                    aria-expanded={isOpen}
                    className={`flex min-h-[4.75rem] w-full items-center gap-3 px-3.5 py-3 text-start transition-colors duration-200 ${isOpen
                      ? 'bg-[linear-gradient(105deg,rgb(var(--color-primary-rgb)/0.11),rgb(var(--color-primary-rgb)/0.035))]'
                      : 'hover:bg-[color:rgb(var(--color-primary-rgb)/0.05)]'}`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] border transition-colors duration-200 ${isOpen
                      ? 'border-[color:rgb(var(--color-primary-rgb)/0.26)] bg-[color:rgb(var(--color-primary-rgb)/0.14)] text-[var(--color-primary)]'
                      : 'border-[color:rgb(var(--color-border-rgb)/0.6)] bg-[color:rgb(var(--color-surface-rgb)/0.64)] text-[var(--color-text-secondary)]'}`}
                    >
                      <GroupIcon className="h-4.5 w-4.5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <h3 className="truncate text-xs font-black text-[var(--color-text)] sm:text-sm">{group.name}</h3>
                      <span className="mt-1 block text-[0.6rem] font-bold text-[var(--color-text-secondary)] sm:text-[0.65rem]">
                        {getAvailableLabel(group.methods.length, isRTL)}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2.5">
                      {group.currency ? (
                        <span className="rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.15)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2 py-1 font-['Poppins'] text-[0.62rem] font-black tracking-wide text-[var(--color-primary)]">
                          {String(group.currency).toUpperCase()}
                        </span>
                      ) : null}
                      <span className={`grid h-7 w-7 place-items-center rounded-full transition-colors duration-200 ${isOpen
                        ? 'bg-[color:rgb(var(--color-primary-rgb)/0.12)] text-[var(--color-primary)]'
                        : 'bg-[color:rgb(var(--color-surface-rgb)/0.7)] text-[var(--color-text-secondary)]'}`}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </span>
                    </span>
                  </button>

                  <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="grid grid-cols-1 gap-2.5 border-t border-[color:rgb(var(--color-border-rgb)/0.48)] bg-[color:rgb(var(--color-surface-rgb)/0.25)] p-3 sm:grid-cols-2 sm:p-4">
                      {group.methods.map((method) => (
                        <PaymentMethodButton
                          key={method.id}
                          method={method}
                          onSelect={handleMethodSelect}
                          isRTL={isRTL}
                        />
                      ))}
                      </div>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.82)] px-4 py-8 text-center">
              <Wallet className="mx-auto h-7 w-7 text-[var(--color-text-secondary)]" />
              <h3 className="mt-2 text-sm font-black text-[var(--color-text)]">
                {isRTL ? 'لا توجد وسائل دفع متاحة الآن' : 'No payment methods available'}
              </h3>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {isRTL ? 'يرجى المحاولة لاحقًا أو التواصل مع الدعم' : 'Try again later or contact support'}
              </p>
            </div>
          )}
        </section>

        <div className="flex items-center justify-center gap-2 py-1 text-[0.68rem] font-semibold text-[var(--color-text-secondary)]">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          {isRTL ? 'بيانات التحويل محمية وتُراجع بأمان' : 'Payment details are protected and reviewed securely'}
        </div>
      </div>
    </div>
  );
};

export default AddBalance;
