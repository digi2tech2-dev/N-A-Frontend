import React, { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronLeft, CreditCard, ShieldCheck, Smartphone, Wallet, Zap } from 'lucide-react';
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

const PaymentMethodButton = ({ method, onSelect, isRTL }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = getMethodIcon(method);
  const showImage = Boolean(method?.image) && !imageFailed;

  return (
    <button
      type="button"
      onClick={() => onSelect(method)}
      className="group relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-[1rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.9),rgb(var(--color-surface-rgb)/0.62))] p-2.5 text-start shadow-[0_16px_34px_-30px_rgb(var(--color-primary-rgb)/0.72),inset_0_1px_rgb(255_255_255/0.1)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.42)] hover:shadow-[0_20px_38px_-26px_rgb(var(--color-primary-rgb)/0.56)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--color-primary-rgb)/0.42)]"
    >
      <span className="pointer-events-none absolute inset-y-0 start-0 w-16 bg-[radial-gradient(circle_at_center,rgb(var(--color-primary-rgb)/0.12),transparent_72%)] opacity-70" />
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[0.82rem] border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.09)] text-[var(--color-primary)] shadow-[inset_0_1px_rgb(255_255_255/0.14)] sm:h-14 sm:w-14">
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
        <strong className="block truncate text-[0.72rem] font-black text-[var(--color-text)] sm:text-xs">
          {method.name}
        </strong>
        <span className="mt-1 block truncate text-[0.58rem] font-bold text-[var(--color-text-secondary)] sm:text-[0.64rem]">
          {isRTL ? 'اختيار والمتابعة' : 'Select and continue'}
        </span>
      </span>

      <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.09)] text-[var(--color-primary)] transition-transform duration-200 group-hover:-translate-x-0.5">
        <ChevronLeft className="h-3.5 w-3.5" />
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
        <section className="relative isolate overflow-hidden rounded-[1.55rem] border border-violet-300/20 bg-[radial-gradient(22rem_circle_at_95%_-20%,rgb(244_114_208/0.42),transparent_48%),radial-gradient(18rem_circle_at_4%_115%,rgb(37_99_235/0.5),transparent_52%),linear-gradient(135deg,#10082b_0%,#24205c_38%,#6d28d9_70%,#c026d3_115%)] p-4 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_30px_70px_-38px_rgb(109_40_217/0.95),0_18px_45px_-34px_rgb(192_38_211/0.9)] sm:p-5">
          <span className="pointer-events-none absolute -end-8 -top-12 -z-10 h-32 w-32 rounded-full border border-white/10 bg-white/8 blur-[1px]" />
          <span className="pointer-events-none absolute end-12 top-2 -z-10 h-20 w-20 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[length:28px_28px] [mask-image:linear-gradient(110deg,black,transparent_72%)]" />

          <div className="relative flex items-center justify-between gap-3 sm:gap-5">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-2 py-1 text-[0.62rem] font-black text-fuchsia-100 backdrop-blur-md">
                <Wallet className="h-3 w-3" />
                {isRTL ? 'المحفظة' : 'Wallet'}
              </p>
              <h1 className="mt-2 text-lg font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgb(0_0_0/0.24)] sm:text-2xl">
                {t('wallet.addBalance')}
              </h1>
              <p className="mt-1 max-w-sm text-[0.68rem] font-semibold leading-5 text-violet-100/75 sm:text-xs">
                {isRTL ? 'اختر وسيلة الدفع المناسبة وأكمل البيانات' : 'Choose a payment method and complete the details'}
              </p>
            </div>

            <div className="relative shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(145deg,rgb(255_255_255/0.14),rgb(255_255_255/0.06))] px-3 py-2.5 text-end shadow-[inset_0_1px_0_rgb(255_255_255/0.13),0_16px_35px_-26px_rgb(0_0_0/0.75)] backdrop-blur-xl sm:min-w-36 sm:px-4 sm:py-3">
              <span className="pointer-events-none absolute -end-3 -top-5 h-14 w-14 rounded-full bg-fuchsia-300/20 blur-xl" />
              <span className="relative text-[0.58rem] font-bold text-violet-100/70 sm:text-[0.65rem]">
                {isRTL ? 'الرصيد الحالي' : 'Current balance'}
              </span>
              <div className="relative mt-1 flex items-baseline justify-end gap-1.5" dir="ltr">
                <strong className="font-['Poppins'] text-xl font-extrabold tracking-tight text-white [font-variant-numeric:tabular-nums] sm:text-2xl">
                  {formatWalletNumber(currentBalance, false, { maximumFractionDigits: 3 })}
                </strong>
                <span className="rounded-md bg-white/12 px-1.5 py-0.5 font-['Poppins'] text-[0.58rem] font-extrabold text-fuchsia-100 sm:text-[0.65rem]">{currentCurrency}</span>
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

        <section className="relative isolate overflow-hidden rounded-[1.45rem] border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[linear-gradient(155deg,rgb(var(--color-card-rgb)/0.82),rgb(var(--color-surface-rgb)/0.52))] p-3 shadow-[0_24px_58px_-48px_rgb(var(--color-primary-rgb)/0.64),inset_0_1px_rgb(255_255_255/0.08)] sm:p-4">
          <span className="pointer-events-none absolute -end-16 -top-20 -z-10 h-44 w-44 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.1)] blur-3xl" />

          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.5)] pb-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.95rem] border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.18),rgb(var(--color-primary-rgb)/0.07))] text-[var(--color-primary)] shadow-[inset_0_1px_rgb(255_255_255/0.14),0_12px_24px_-20px_rgb(var(--color-primary-rgb)/0.8)]">
                <CreditCard className="h-5 w-5" />
                <span className="absolute -end-2 -top-2 h-5 w-5 rounded-full bg-fuchsia-400/20 blur-md" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-black tracking-tight text-[var(--color-text)] sm:text-base">
                  {isRTL ? 'اختر وسيلة الدفع' : 'Choose a payment method'}
                </h2>
                <p className="mt-1 text-[0.65rem] font-semibold leading-4 text-[var(--color-text-secondary)] sm:text-[0.72rem]">
                  {isRTL ? 'اختر المجموعة أولًا، ثم وسيلة التحويل المناسبة لك' : 'Choose a group, then select your preferred payment method'}
                </p>
              </div>
            </div>

            {availableMethodsCount > 0 ? (
              <span className="shrink-0 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.16)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2.5 py-1 text-[0.6rem] font-black text-[var(--color-primary)]">
                {availableMethodsCount} {isRTL ? 'وسيلة' : 'methods'}
              </span>
            ) : null}
          </div>

          {paymentGroups.length ? (
            <div className="space-y-2.5">
              {paymentGroups.map((group) => {
                const isOpen = String(openGroupId) === String(group.id);
                const GroupIcon = String(group.currency || '').toUpperCase() === 'EGP'
                  ? Building2
                  : Wallet;

                return (
                <article
                  key={group.id}
                  className={`overflow-hidden rounded-[1.08rem] border bg-[color:rgb(var(--color-card-rgb)/0.6)] transition-[border-color,box-shadow,background-color] duration-200 ${isOpen
                    ? 'border-[color:rgb(var(--color-primary-rgb)/0.32)] shadow-[0_18px_40px_-34px_rgb(var(--color-primary-rgb)/0.72)]'
                    : 'border-[color:rgb(var(--color-border-rgb)/0.62)]'}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenGroupId((current) => (
                      String(current) === String(group.id) ? null : group.id
                    ))}
                    aria-expanded={isOpen}
                    className={`flex min-h-[4.25rem] w-full items-center gap-3 px-3 py-2.5 text-start transition-colors duration-200 ${isOpen
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
                        {group.methods.length} {isRTL ? 'وسائل دفع متاحة' : 'available payment methods'}
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
                      <div className="grid grid-cols-1 gap-2 border-t border-[color:rgb(var(--color-border-rgb)/0.48)] bg-[color:rgb(var(--color-surface-rgb)/0.25)] p-2.5 sm:grid-cols-2 sm:p-3">
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
