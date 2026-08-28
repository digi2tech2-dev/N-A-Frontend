import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CreditCard, Globe2, Landmark, ShieldCheck, Smartphone, Wallet, Zap } from 'lucide-react';
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

const isVodafoneCashMethod = (method) => {
  const token = `${method?.id || ''} ${method?.name || ''}`.toLowerCase();
  return token.includes('vodafone') || token.includes('فودافون');
};

const PAYMENT_CARD_THEMES = [
  'border-fuchsia-500/65 bg-fuchsia-500/[0.08] shadow-[0_0_24px_-14px_rgb(217_70_239/0.9)]',
  'border-blue-500/65 bg-blue-500/[0.08] shadow-[0_0_24px_-14px_rgb(59_130_246/0.9)]',
  'border-emerald-500/65 bg-emerald-500/[0.08] shadow-[0_0_24px_-14px_rgb(16_185_129/0.9)]',
];

const PaymentMethodButton = ({ method, onSelect, isRTL, currency = '', cardIndex = 0 }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = getMethodIcon(method);
  const showImage = Boolean(method?.image) && !imageFailed;
  const cardTheme = isVodafoneCashMethod(method)
    ? 'border-red-500/80 bg-red-500/[0.1] shadow-[0_0_28px_-13px_rgb(239_68_68/0.95)]'
    : PAYMENT_CARD_THEMES[cardIndex % PAYMENT_CARD_THEMES.length];

  return (
    <button
      type="button"
      onClick={() => onSelect(method)}
      aria-label={`${isRTL ? 'اختيار' : 'Select'} ${method.name}`}
      className={`group flex min-w-0 flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 ${cardTheme}`}
    >
      <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-white p-0.5 text-[var(--color-primary)] shadow-[0_14px_28px_-22px_rgb(var(--color-primary-rgb)/0.85)] transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--color-primary)] group-hover:shadow-[0_0_0_4px_rgb(var(--color-primary-rgb)/0.1),0_14px_28px_-22px_rgb(var(--color-primary-rgb)/0.85)] dark:bg-slate-100 sm:h-20 sm:w-20">
        {showImage ? (
          <img
            src={resolveImageUrl(method.image)}
            alt=""
            className="h-full w-full rounded-full object-contain p-2"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon className="h-6 w-6" />
        )}
      </span>

      <strong className="block w-full break-words text-sm font-black leading-5 tracking-tight text-white sm:text-base">{method.name}</strong>
      {currency ? <span className="rounded-full bg-white/10 px-2 py-0.5 font-['Poppins'] text-[0.58rem] font-black tracking-wide text-slate-200">{String(currency).toUpperCase()}</span> : null}
      {isVodafoneCashMethod(method) ? <span className="inline-flex items-center rounded-full border border-fuchsia-300/45 bg-fuchsia-400/15 px-2 py-0.5 text-[0.58rem] font-black text-fuchsia-100 shadow-[0_0_15px_-7px_rgb(217_70_239/0.95)]">{isRTL ? 'دفع آلي' : 'Automated payment'}</span> : null}
    </button>
  );
};

const SelectedPaymentMethodsPage = ({ group, onBack, onSelectMethod, isRTL }) => (
  <section className="relative isolate overflow-visible py-1 text-white">
    <button type="button" onClick={onBack} className="mb-5 inline-flex h-10 self-end items-center gap-2 rounded-full border border-fuchsia-400/60 bg-fuchsia-500/[0.08] px-4 text-sm font-black text-white shadow-[0_0_22px_-12px_rgb(217_70_239/0.95)] transition hover:bg-fuchsia-500/20">
      <span aria-hidden="true" className="text-lg leading-none">{isRTL ? '→' : '←'}</span>
      {isRTL ? 'رجوع' : 'Back'}
    </button>
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="min-w-0 text-start">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{isRTL ? 'اختر وسيلة الدفع' : 'Choose a payment method'}</h2>
        <p className="mt-1 text-xs font-semibold text-slate-300">{group.name}</p>
      </div>
      <span className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.08] px-3 py-2 font-['Poppins'] text-xs font-black tracking-wide text-cyan-200">{String(group.currency || '').toUpperCase()}</span>
    </div>
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h3 className="text-lg font-black text-white">{group.name}</h3>
        <span className="flex items-center gap-2 text-sm font-black text-slate-200"><span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgb(217_70_239)]" />{group.methods.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {group.methods.map((method, index) => <PaymentMethodButton key={method.id} method={method} onSelect={onSelectMethod} isRTL={isRTL} currency={group.currency} cardIndex={index} />)}
      </div>
    </div>
  </section>
);

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
  const selectedGroup = useMemo(
    () => paymentGroups.find((group) => String(group.id) === String(openGroupId)) || null,
    [openGroupId, paymentGroups]
  );

  useEffect(() => {
    if (!paymentGroups.length) {
      setOpenGroupId(null);
      return;
    }
    setOpenGroupId((current) => (
      current && paymentGroups.some((group) => String(group.id) === String(current))
        ? current
        : null
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

  const handleGroupToggle = (groupId) => {
    const willOpen = String(openGroupId) !== String(groupId);
    setOpenGroupId(willOpen ? groupId : null);
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

        {selectedGroup ? (
          <SelectedPaymentMethodsPage
            group={selectedGroup}
            onBack={() => setOpenGroupId(null)}
            onSelectMethod={handleMethodSelect}
            isRTL={isRTL}
          />
        ) : (
        <section className="relative isolate overflow-visible px-1 py-1 sm:px-2" aria-label={isRTL ? 'مجموعات الدفع' : 'Payment groups'}>
          <div className="mb-5 flex items-center gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.5)] pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[0.95rem] bg-[var(--color-primary)] text-white shadow-[0_12px_24px_-16px_rgb(var(--color-primary-rgb)/0.85)]">
                <CreditCard className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-black tracking-tight text-[var(--color-text)] sm:text-lg">
                  {isRTL ? 'اختر وسيلة الدفع' : 'Choose a payment method'}
                </h2>
              </div>
            </div>
          </div>

          {paymentGroups.length ? (
            <div className="grid grid-cols-3 items-start gap-2.5 sm:gap-4">
              {paymentGroups.map((group) => {
                const isOpen = String(openGroupId) === String(group.id);
                const GroupIcon = getGroupIcon(group);

                return (
                  <article
                    key={group.id}
                    className="col-span-1 min-w-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleGroupToggle(group.id)}
                      aria-expanded={isOpen}
                      className="flex min-h-0 w-full flex-col items-center justify-start gap-0.5 p-1 text-center transition-transform duration-200 hover:-translate-y-0.5 sm:p-2"
                    >
                      <span className={`order-1 relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 bg-[linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.13),rgb(var(--color-primary-rgb)/0.04))] transition-[border-color,box-shadow,transform] duration-200 sm:h-24 sm:w-24 ${isOpen
                        ? 'border-[var(--color-primary)] shadow-[0_0_0_4px_rgb(var(--color-primary-rgb)/0.14),0_16px_30px_-20px_rgb(var(--color-primary-rgb)/0.85)]'
                        : 'border-[color:rgb(var(--color-primary-rgb)/0.2)]'}`}
                      >
                        {group.image ? (
                          <img
                            src={resolveImageUrl(group.image)}
                            alt=""
                            className="h-full w-full object-contain p-1.5"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : <GroupIcon className="h-8 w-8 text-[var(--color-primary)]" />}
                      </span>
                      <span className="order-2 w-full text-sm font-black leading-5 text-[var(--color-text)] sm:text-base">{group.name}</span>
                      {group.currency ? (
                        <span className="order-3 font-['Poppins'] text-[0.58rem] font-bold tracking-wide text-emerald-500 dark:text-emerald-300">
                          {String(group.currency).toUpperCase()}
                        </span>
                      ) : null}
                    </button>

                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.82)] px-4 py-8 text-center">
              <Wallet className="mx-auto h-7 w-7 text-[var(--color-text-secondary)]" />
              <h3 className="mt-2 text-sm font-black text-[var(--color-text)]">{isRTL ? 'لا توجد وسائل دفع متاحة الآن' : 'No payment methods available'}</h3>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{isRTL ? 'يرجى المحاولة لاحقًا أو التواصل مع الدعم' : 'Try again later or contact support'}</p>
            </div>
          )}

        </section>
        )}

        <div className="flex items-center justify-center gap-2 py-1 text-[0.68rem] font-semibold text-[var(--color-text-secondary)]">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          {isRTL ? 'بيانات التحويل محمية وتُراجع بأمان' : 'Payment details are protected and reviewed securely'}
        </div>
      </div>
    </div>
  );
};

export default AddBalance;
