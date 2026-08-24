import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Clock3,
  Copy,
  CreditCard,
  DollarSign,
  Info,
  AlertTriangle,
  Target,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';
import Button, { cn } from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import UploadProof from './UploadProof';
import { formatNumber } from '../../utils/intl';
import { resolveImageUrl } from '../../utils/imageUrl';
import { useToast } from '../ui/Toast';
import {
  isPaymentMethodAllowed,
  isSiteWalletPaymentMethod,
  resolveAllowedPaymentMethodValue,
} from '../../utils/paymentSettings';
import { getTargetPricing } from '../../utils/targetPricing';

const getPaymentMethodLabel = (method) => {
  const normalized = String(method || '').trim().toLowerCase();
  if (normalized === 'vodafone cash') return 'فودافون كاش';
  if (normalized === 'instapay') return 'إنستا باي';
  if (normalized === 'orange cash') return 'أورانج كاش';
  if (normalized === 'etisalat cash') return 'اتصالات كاش';
  if (normalized === 'binance') return 'بينانس';
  if (isSiteWalletPaymentMethod(normalized)) return 'محفظة الموقع';
  return method;
};

const getPaymentMethodTheme = (method) => {
  const token = String(method?.id || method?.name || method || '').trim().toLowerCase();
  if (token.includes('vodafone') || token.includes('فودافون')) {
    return {
      key: 'vodafone',
      card: 'border-red-300/70 bg-red-50 text-red-950 dark:border-red-400/65 dark:bg-[linear-gradient(105deg,rgb(83_18_28/0.96),rgb(48_15_22/0.94))] dark:text-red-100',
      icon: 'bg-red-500 text-white',
      accent: 'text-red-700 dark:text-red-200',
      soft: 'border-red-200 bg-red-50 text-red-800 dark:border-red-300/35 dark:bg-red-400/10 dark:text-red-100',
    };
  }
  if (token.includes('orange') || token.includes('أورانج') || token.includes('اورانج')) {
    return {
      key: 'orange',
      card: 'border-orange-300/70 bg-orange-50 text-orange-950 dark:border-orange-400/65 dark:bg-[linear-gradient(105deg,rgb(98_43_10/0.96),rgb(56_25_9/0.94))] dark:text-orange-100',
      icon: 'bg-orange-500 text-white',
      accent: 'text-orange-700 dark:text-orange-100',
      soft: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-300/35 dark:bg-orange-400/10 dark:text-orange-100',
    };
  }
  if (token.includes('etisalat') || token.includes('اتصالات')) {
    return {
      key: 'etisalat',
      card: 'border-cyan-300/70 bg-cyan-50 text-cyan-950 dark:border-cyan-400/65 dark:bg-[linear-gradient(105deg,rgb(7_69_79/0.96),rgb(7_42_54/0.94))] dark:text-cyan-100',
      icon: 'bg-cyan-400 text-cyan-950',
      accent: 'text-cyan-700 dark:text-cyan-100',
      soft: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-300/35 dark:bg-cyan-400/10 dark:text-cyan-100',
    };
  }
  if (token.includes('insta') || token.includes('إنستا')) {
    return {
      key: 'instapay',
      card: 'border-indigo-300/70 bg-indigo-50 text-indigo-950 dark:border-indigo-400/65 dark:bg-[linear-gradient(105deg,rgb(35_35_104/0.96),rgb(25_25_70/0.94))] dark:text-indigo-100',
      icon: 'bg-indigo-400 text-white',
      accent: 'text-indigo-700 dark:text-indigo-100',
      soft: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-300/35 dark:bg-indigo-400/10 dark:text-indigo-100',
    };
  }
  if (token.includes('binance') || token.includes('بينانس')) {
    return {
      key: 'binance',
      card: 'border-yellow-300/70 bg-yellow-50 text-yellow-950 dark:border-yellow-400/65 dark:bg-[linear-gradient(105deg,rgb(78_61_7/0.96),rgb(47_36_6/0.94))] dark:text-yellow-100',
      icon: 'bg-yellow-400 text-yellow-950',
      accent: 'text-yellow-700 dark:text-yellow-100',
      soft: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-300/35 dark:bg-yellow-400/10 dark:text-yellow-100',
    };
  }
  return {
    key: 'wallet',
    card: 'border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-400/70 dark:bg-[linear-gradient(105deg,rgb(7_54_37/0.96),rgb(9_39_31/0.94))] dark:text-emerald-100',
    icon: 'bg-emerald-400 text-emerald-950',
    accent: 'text-emerald-700 dark:text-emerald-100',
    soft: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/35 dark:bg-emerald-400/10 dark:text-emerald-100',
  };
};

const normalizeIntegerInput = (value) => String(value || '')
  .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
  .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
  .replace(/\D/g, '');

const TargetForm = ({ products = [], paymentMethods = [], onSubmit, onSelectedAppChange, withdrawalInfoRequest = 0, backToAppsRequest = 0 }) => {
  const [selectedAppId, setSelectedAppId] = useState('');
  const [showWithdrawalInfo, setShowWithdrawalInfo] = useState(false);
  const [showPaymentMethodOptions, setShowPaymentMethodOptions] = useState(false);
  const [isTargetIdCopied, setIsTargetIdCopied] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');
  const [senderId, setSenderId] = useState('');
  const [transferNumber, setTransferNumber] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [proof, setProof] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const fieldRefs = useRef({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const activeApps = useMemo(
    () => (products || []).filter((app) => app?.isActive !== false),
    [products]
  );
  const selectedApp = useMemo(
    () => activeApps.find((app) => String(app.id) === String(selectedAppId)) || null,
    [activeApps, selectedAppId]
  );
  const allowedPaymentMethods = useMemo(
    () => (Array.isArray(selectedApp?.allowedPaymentMethods) ? selectedApp.allowedPaymentMethods : []),
    [selectedApp]
  );
  const availablePaymentMethods = useMemo(
    () => paymentMethods.filter((method) => isPaymentMethodAllowed(method, allowedPaymentMethods)),
    [allowedPaymentMethods, paymentMethods]
  );
  const selectedPaymentMethod = useMemo(
    () => availablePaymentMethods.find((method) => String(method.id) === String(paymentMethodId)) || null,
    [availablePaymentMethods, paymentMethodId]
  );
  const selectedPaymentTheme = useMemo(
    () => getPaymentMethodTheme(selectedPaymentMethod || paymentMethodId),
    [selectedPaymentMethod, paymentMethodId]
  );
  const isSiteWalletMethod = isSiteWalletPaymentMethod(selectedPaymentMethod || paymentMethodId);
  const coinAmountValue = Number(coinAmount || 0);
  const unitPrice = Number(selectedApp?.unitPrice || 0);
  const { walletBalance } = getTargetPricing(coinAmountValue, unitPrice);
  const targetAccountId = String(
    selectedApp?.targetAccountId
      || selectedApp?.receivingAccountId
      || selectedApp?.receiverAccountId
      || selectedApp?.recipientAccountId
      || selectedApp?.targetAccount
      || selectedApp?.targetRecipientId
      || selectedApp?.receivingAccount
      || selectedApp?.destinationAccountId
      || selectedApp?.accountId
      || selectedApp?.accountNumber
      || selectedApp?.target_account_id
      || selectedApp?.receiving_account_id
      || ''
  ).trim();

  useEffect(() => {
    if (selectedAppId && !selectedApp) setSelectedAppId('');
  }, [selectedApp, selectedAppId]);

  useEffect(() => {
    onSelectedAppChange?.(selectedApp);
  }, [onSelectedAppChange, selectedApp]);

  useEffect(() => {
    if (withdrawalInfoRequest > 0 && selectedApp) setShowWithdrawalInfo(true);
  }, [withdrawalInfoRequest]);

  useEffect(() => {
    if (backToAppsRequest > 0) {
      setShowWithdrawalInfo(false);
      setSelectedAppId('');
    }
  }, [backToAppsRequest]);

  useEffect(() => {
    if (!showWithdrawalInfo || typeof document === 'undefined') return undefined;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    return () => {
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
    };
  }, [showWithdrawalInfo]);

  useEffect(() => {
    if (!availablePaymentMethods.length) {
      setPaymentMethodId('');
      return;
    }
    if (!availablePaymentMethods.some((method) => String(method.id) === String(paymentMethodId))) {
      const siteWalletMethod = availablePaymentMethods.find((method) => isSiteWalletPaymentMethod(method));
      setPaymentMethodId(siteWalletMethod?.id || availablePaymentMethods[0].id);
    }
  }, [availablePaymentMethods, paymentMethodId]);

  useEffect(() => {
    if (isSiteWalletMethod) setTransferNumber('');
  }, [isSiteWalletMethod]);

  const resetForm = () => {
    setCoinAmount('');
    setSenderId('');
    setTransferNumber('');
    setProof(null);
    setValidationErrors({});
  };

  const chooseApp = (appId) => {
    setSelectedAppId(appId);
    setPaymentMethodId('');
    setShowPaymentMethodOptions(false);
    setValidationErrors({});
    setIsTargetIdCopied(false);
    setShowWithdrawalInfo(true);
  };

  const handleCopyTargetId = async () => {
    if (!targetAccountId) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetAccountId);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = targetAccountId;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsTargetIdCopied(true);
      addToast('تم نسخ آيدي السحب.', 'success');
      window.setTimeout(() => setIsTargetIdCopied(false), 1800);
    } catch {
      addToast('تعذر نسخ آيدي السحب تلقائيًا.', 'error');
    }
  };

  const clearValidationError = (field) => {
    setValidationErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!Number.isInteger(coinAmountValue) || coinAmountValue < 5) {
      nextErrors.coinAmount = coinAmountValue > 0 ? 'أدخل 5 دولارات على الأقل.' : 'أكمل المبلغ المطلوب.';
    }
    if (!senderId.trim()) nextErrors.senderId = 'أكمل ID المستخدم في التطبيق.';
    if (!selectedPaymentMethod) nextErrors.paymentMethod = 'اختر طريقة الاستلام.';
    if (!isSiteWalletMethod && !transferNumber.trim()) nextErrors.transferNumber = 'أكمل رقم الاستلام.';
    if (!proof?.file) nextErrors.proof = 'أرفق صورة إثبات التحويل.';

    if (!selectedApp?.id || Object.keys(nextErrors).length) {
      setValidationErrors(nextErrors);
      const firstErrorKey = ['coinAmount', 'senderId', 'paymentMethod', 'transferNumber', 'proof']
        .find((key) => nextErrors[key]);
      if (firstErrorKey) {
        window.setTimeout(() => {
          const field = fieldRefs.current[firstErrorKey];
          field?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          field?.focus?.();
        }, 0);
      }
      addToast(nextErrors[firstErrorKey] || 'أكمل بيانات طلب التارجت.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentMethodValue = resolveAllowedPaymentMethodValue(selectedPaymentMethod, allowedPaymentMethods);
      const wasSubmitted = await onSubmit({
        appId: selectedApp.id,
        targetAccountIdSnapshot: targetAccountId,
        coinAmount: coinAmountValue,
        senderId: senderId.trim(),
        transferNumber: isSiteWalletMethod ? 'محفظة الموقع' : transferNumber.trim(),
        paymentMethodId: selectedPaymentMethod.id,
        paymentMethod: paymentMethodValue,
        paymentMethodName: selectedPaymentMethod.name,
        screenshotProof: proof.file,
        isSiteWalletPayment: isSiteWalletMethod,
      });
      if (wasSubmitted === false) return;
      resetForm();
    } catch (error) {
      const isPaymentMethodError = /payment method.+not allowed/i.test(String(error?.message || ''));
      addToast(
        isPaymentMethodError
          ? 'طريقة الاستلام المختارة غير متاحة لهذا التطبيق حاليًا.'
          : String(error?.message || 'تعذر إرسال طلب التارجت. حاول مرة أخرى.'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showWithdrawalInfo && selectedApp) {
    return (
      <div className="fixed inset-0 z-[80] flex h-[100dvh] items-center justify-center overflow-hidden bg-[#050816]/90 p-3 backdrop-blur-md sm:p-4" dir="rtl">
        <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.6rem] border border-indigo-300/35 bg-[linear-gradient(145deg,#141d43,#0b1228)] shadow-[0_30px_90px_-40px_rgb(30_41_100/0.9)] sm:max-h-[calc(100dvh-2rem)]">
          <div className="h-1 bg-[linear-gradient(90deg,#22d3ee,#6366f1,#a78bfa)]" />
          <header className="flex items-start justify-between gap-3 border-b border-indigo-200/15 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#6366f1)] text-white shadow-[0_12px_28px_-16px_rgb(34_211_238/0.8)]">
                {selectedApp.image ? (
                  <img src={resolveImageUrl(selectedApp.image)} alt="" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <Target className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className="text-[11px] font-bold text-cyan-200/75">بيانات السحب</p>
                <h2 className="mt-0.5 text-lg font-black text-white">{selectedApp.name}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowWithdrawalInfo(false);
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-cyan-200/20 text-cyan-100/70 transition hover:border-cyan-200/60 hover:text-cyan-100"
              aria-label="رجوع"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="space-y-3 px-4 py-3 sm:space-y-4 sm:px-5 sm:py-4">
            <div>
              <p className="mb-1.5 text-xs font-bold text-cyan-100/75">آيدي السحب</p>
              <button
                type="button"
                onClick={handleCopyTargetId}
                disabled={!targetAccountId}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-300/70 bg-[linear-gradient(120deg,#33260d,#5a4211_52%,#19264d)] px-3.5 py-2.5 text-start transition hover:border-amber-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                title={targetAccountId ? 'اضغط لنسخ آيدي السحب' : 'لا يوجد آيدي سحب محدد'}
              >
                <strong className="min-w-0 flex-1 break-all text-center text-base font-black tracking-wide text-amber-100">
                  {targetAccountId || 'غير متاح حاليًا'}
                </strong>
                <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-300/15 px-2.5 py-1.5 text-[10px] font-black text-cyan-100 transition group-hover:bg-cyan-300/25">
                  {isTargetIdCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {isTargetIdCopied ? 'تم النسخ' : 'نسخ'}
                </span>
              </button>
              <p className="mt-1 text-center text-[10px] font-semibold text-cyan-100/55">اضغط داخل البطاقة لنسخ الآيدي</p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#d4a52c]/30 border-y border-[#d4a52c]/25 py-3" dir="ltr">
              <div className="px-3" dir="rtl">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                <p className="mt-1.5 text-[10px] font-bold text-cyan-100/60">مدة التنفيذ</p>
                <strong className="mt-0.5 block text-[11px] font-black leading-4 text-white">من ربع ساعة إلى 5 ساعات</strong>
              </div>
              <div className="px-3" dir="rtl">
                <DollarSign className="h-4 w-4 text-amber-300" />
                <p className="mt-1.5 text-[10px] font-bold text-amber-100/60">الحد الأدنى</p>
                <strong className="mt-0.5 block text-xs font-black text-white">5$</strong>
              </div>
            </div>
          </div>

          <footer className="border-t border-indigo-300/20 bg-indigo-950/45 px-4 py-3 sm:px-5 sm:py-4">
            <button
              type="button"
              onClick={() => setShowWithdrawalInfo(false)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#7c3aed,#2563eb,#22d3ee)] text-sm font-black text-white shadow-[0_16px_34px_-18px_rgb(79_70_229/0.9)] transition hover:brightness-110"
            >
              فهمت، ابدأ السحب
              <ChevronLeft className="h-5 w-5" />
            </button>
          </footer>
        </div>
      </div>
    );
  }

  if (!selectedApp) {
    return (
      <Card className="overflow-hidden rounded-[1.5rem] border border-indigo-300/25 bg-[linear-gradient(145deg,#111a3b,#0b1228)] shadow-[0_24px_70px_-52px_rgb(79_70_229/0.72)]">
        <div className="h-1 bg-[linear-gradient(90deg,#22d3ee,#6366f1,#a78bfa)]" />
        <div className="flex items-center justify-between gap-3 bg-[linear-gradient(110deg,rgb(34_211_238/0.08),transparent_48%,rgb(124_58_237/0.12))] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-white sm:text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(135deg,#22d3ee,#6366f1)] text-[10px] font-black text-white shadow-[0_8px_20px_-10px_rgb(34_211_238/0.9)]">01</span>
              اختر التطبيق
            </h2>
            <p className="mt-1 text-[10px] font-semibold text-cyan-100/55 sm:text-xs">اختر المنتج لبدء طلبك</p>
          </div>
          <span className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-2.5 py-1 text-[10px] font-bold text-cyan-100/75">متاح الآن</span>
        </div>

        {activeApps.length ? (
          <div className="grid grid-cols-3 gap-x-2 gap-y-5 border-t border-[color:rgb(var(--color-border-rgb)/0.62)] p-3 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-7 sm:p-5 lg:grid-cols-5">
            {activeApps.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => chooseApp(app.id)}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center transition-all hover:-translate-y-1 sm:px-2"
              >
                <div className="aspect-square w-full overflow-hidden rounded-[1.25rem] border-4 border-indigo-200/15 bg-indigo-300/[0.08] p-0.5 shadow-[0_14px_28px_-20px_rgb(79_70_229/0.95)] transition-all group-hover:scale-[1.04] group-hover:border-cyan-300/55 group-hover:shadow-[0_18px_34px_-18px_rgb(34_211_238/0.55)]">
                  {app.image ? (
                    <img src={resolveImageUrl(app.image)} alt="" className="h-full w-full rounded-[0.95rem] object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-[0.95rem] text-[var(--color-primary)]"><Target className="h-7 w-7" /></span>
                  )}
                </div>
                <div className="min-w-0 max-w-full">
                  <p className="break-words text-xs font-black leading-4 text-white sm:text-sm">{app.name}</p>
                  <p className="mt-1 inline-block max-w-full rounded-full bg-cyan-300/[0.1] px-1.5 py-0.5 text-[9px] font-black leading-3 text-cyan-200 sm:px-2 sm:text-xs">{formatNumber(app.unitPrice, 'en-US', { maximumFractionDigits: 2 })} EGP / دولار</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="border-t border-[color:rgb(var(--color-border-rgb)/0.62)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">لا توجد تطبيقات متاحة حاليًا.</div>
        )}
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden rounded-[1.75rem] border border-indigo-300/25 bg-[radial-gradient(38rem_circle_at_8%_-12%,rgb(34_211_238/0.12),transparent_48%),linear-gradient(145deg,#111a3b,#0b1228)] shadow-[0_28px_80px_-50px_rgb(79_70_229/0.72)]">
      <form onSubmit={handleSubmit}>
        <div className="h-1 bg-[linear-gradient(90deg,#22d3ee,#6366f1,#a78bfa)]" />
        <div className="px-3 py-4 sm:px-5 sm:py-5">
          {targetAccountId ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[color:rgb(var(--color-border-rgb)/0.58)] pb-4 text-sm">
              <span className="text-[var(--color-text-secondary)]">حساب التحويل</span>
              <strong className="break-all text-[var(--color-primary)]">{targetAccountId}</strong>
            </div>
          ) : null}

          <div className="space-y-4" dir="rtl">
            <div>
              <div className="mb-1.5 flex items-center justify-start gap-2 text-right">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/[0.1] text-cyan-200">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="text-sm font-black text-[var(--color-text)]">ID المستخدم في التطبيق</span>
              </div>
              <div className={cn(
                'flex h-12 overflow-hidden rounded-xl border bg-[color:rgb(var(--color-surface-rgb)/0.72)] shadow-inner shadow-black/5 focus-within:ring-2 dark:bg-[linear-gradient(110deg,rgb(15_23_42/0.76),rgb(34_29_13/0.72))] dark:shadow-black/10',
                validationErrors.senderId ? 'border-rose-400/90 focus-within:border-rose-400 focus-within:ring-rose-400/15' : 'border-indigo-200/25 focus-within:border-cyan-300/70 focus-within:ring-cyan-300/10'
              )} dir="rtl">
                <span className="grid w-14 shrink-0 place-items-center bg-[linear-gradient(135deg,#22d3ee,#2563eb)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]">
                  <UserRound className="h-5 w-5" />
                </span>
                <input
                  ref={(element) => { fieldRefs.current.senderId = element; }}
                  type="text"
                  value={senderId}
                  onChange={(event) => {
                    setSenderId(event.target.value);
                    clearValidationError('senderId');
                  }}
                  placeholder="أدخل ID حسابك في التطبيق"
                  className="min-w-0 flex-1 bg-transparent px-4 text-right text-sm font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] outline-none"
                />
              </div>
              <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                <Info className="h-3 w-3 text-cyan-300" />
                الـ ID الخاص بحسابك داخل تطبيق {selectedApp.name}
              </p>
              {validationErrors.senderId ? (
                <p role="alert" className="mt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-300"><CircleAlert className="h-3 w-3" />{validationErrors.senderId}</p>
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-start gap-2 text-right">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/[0.1] text-cyan-200">
                  <DollarSign className="h-4 w-4" />
                </span>
                <span className="text-sm font-black text-[var(--color-text)]">المبلغ المراد سحبه</span>
              </div>
              <div className={cn(
                'flex h-12 overflow-hidden rounded-xl border bg-[color:rgb(var(--color-surface-rgb)/0.72)] shadow-inner shadow-black/5 focus-within:ring-2 dark:bg-[linear-gradient(110deg,rgb(15_23_42/0.76),rgb(34_29_13/0.72))] dark:shadow-black/10',
                validationErrors.coinAmount ? 'border-rose-400/90 focus-within:border-rose-400 focus-within:ring-rose-400/15' : 'border-indigo-200/25 focus-within:border-cyan-300/70 focus-within:ring-cyan-300/10'
              )} dir="rtl">
                <span className="grid w-14 shrink-0 place-items-center bg-gradient-to-br from-amber-300 to-yellow-500 text-2xl font-black text-slate-950">$</span>
                <input
                  ref={(element) => { fieldRefs.current.coinAmount = element; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="rtl"
                  value={coinAmount}
                  onChange={(event) => {
                    setCoinAmount(normalizeIntegerInput(event.target.value));
                    clearValidationError('coinAmount');
                  }}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent px-4 text-right text-lg font-black text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-secondary)]"
                />
              </div>
              <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                <Info className="h-3 w-3 text-cyan-300" />
                يُدخل المبلغ بالدولار الأمريكي ($)
              </p>
              {validationErrors.coinAmount ? (
                <p role="alert" className="mt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-300"><CircleAlert className="h-3 w-3" />{validationErrors.coinAmount}</p>
              ) : null}
            </div>
          </div>

          <div className="my-4 h-px bg-[linear-gradient(90deg,transparent,rgb(var(--color-primary-rgb)/0.28),rgb(179_122_24/0.2),transparent)]" />

          <div className="space-y-4" dir="rtl">
            <div className="relative" ref={(element) => { fieldRefs.current.paymentMethod = element; }}>
              <button
                type="button"
                onClick={() => setShowPaymentMethodOptions((current) => !current)}
                disabled={!availablePaymentMethods.length}
                aria-expanded={showPaymentMethodOptions}
                className={cn(
                  'relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-right shadow-[0_14px_38px_-22px_rgb(16_185_129/0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
                  selectedPaymentTheme.card,
                  validationErrors.paymentMethod && 'border-rose-400/90'
                )}
              >
                <div className="absolute inset-y-0 right-0 w-1 bg-current opacity-80" />
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-[0_10px_24px_-14px_rgb(0_0_0/0.8)]', selectedPaymentTheme.icon)}>
                  {selectedPaymentMethod?.image ? (
                    <img src={resolveImageUrl(selectedPaymentMethod.image)} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                </span>
                  <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm font-black', selectedPaymentTheme.accent)}>
                    {selectedPaymentMethod ? `استلم على ${getPaymentMethodLabel(selectedPaymentMethod.name)}` : 'اختر وسيلة الاستلام'}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-[var(--color-text-secondary)]">اضغط لاختيار طريقة استلام أخرى</span>
                </span>
                <ChevronLeft className={cn('h-5 w-5 shrink-0', selectedPaymentTheme.accent)} />
              </button>

              {showPaymentMethodOptions ? (
                <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 space-y-1.5 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[var(--color-card)] p-2 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)] dark:border-white/10 dark:bg-[#11141a] dark:shadow-[0_24px_48px_-24px_rgb(0_0_0/0.95)]">
                  <p className="px-2 pb-1 text-[10px] font-bold text-[var(--color-text-secondary)]">طرق الاستلام المتاحة</p>
                  {availablePaymentMethods.map((method) => {
                    const theme = getPaymentMethodTheme(method);
                    const isSelected = String(method.id) === String(paymentMethodId);
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethodId(method.id);
                          setShowPaymentMethodOptions(false);
                          clearValidationError('paymentMethod');
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-right transition hover:brightness-110',
                          theme.soft,
                          isSelected && 'ring-1 ring-[var(--color-primary)]'
                        )}
                      >
                        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-black', theme.icon)}>
                          {method.image ? <img src={resolveImageUrl(method.image)} alt="" className="h-full w-full rounded-lg object-cover" /> : <CreditCard className="h-3.5 w-3.5" />}
                        </span>
                        <span className="flex-1 text-xs font-black">{getPaymentMethodLabel(method.name)}</span>
                        {isSelected ? <CheckCircle2 className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {validationErrors.paymentMethod ? (
              <p role="alert" className="flex items-center justify-end gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-300"><CircleAlert className="h-3 w-3" />{validationErrors.paymentMethod}</p>
            ) : null}

            {!isSiteWalletMethod ? (
              <Input
                ref={(element) => { fieldRefs.current.transferNumber = element; }}
                label="رقم الاستلام"
                error={validationErrors.transferNumber}
                className="border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[color:rgb(var(--color-card-rgb)/0.74)] focus:border-[color:rgb(var(--color-primary-rgb)/0.58)]"
                value={transferNumber}
                onChange={(event) => {
                  setTransferNumber(event.target.value);
                  clearValidationError('transferNumber');
                }}
                placeholder="رقم المحفظة أو الحساب"
              />
            ) : null}
            {!availablePaymentMethods.length ? <p className="text-xs text-[var(--color-error)]">لا توجد طريقة استلام متاحة.</p> : null}

            <div className={cn('overflow-hidden rounded-xl border text-right shadow-[0_18px_45px_-30px_rgb(0_0_0/0.7)]', selectedPaymentTheme.card)}>
              <div className="grid grid-cols-2 gap-2 border-b border-current/20 px-3 py-2.5">
                <p className={cn('text-xs font-black', selectedPaymentTheme.accent)}>الرصيد الذي سيضاف إلى محفظتك</p>
                <p className="text-[10px] font-bold leading-4 text-[var(--color-text-secondary)]">بعد خصم عمولة التطبيق</p>
              </div>
              <div className="flex items-center justify-end gap-2 px-3 py-3 text-right" dir="ltr">
                <span className={cn('text-2xl font-black tracking-tight', selectedPaymentTheme.accent)}>{formatNumber(walletBalance, 'en-US', { maximumFractionDigits: 2 })} <small className="text-xs">EGP</small></span>
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg font-black', selectedPaymentTheme.soft)}>EGP</span>
              </div>
              <p className="px-3 pb-3 text-right text-[11px] font-bold text-[var(--color-text-secondary)]">أدخل المبلغ لحساب الصافي</p>
            </div>

            {isSiteWalletMethod ? (
              <div className="flex gap-2.5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-3" dir="rtl">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-200" />
                <div>
                  <h3 className="text-sm font-black text-[var(--color-text)]">تنبيه مهم</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">يضاف المبلغ إلى محفظتك على الموقع بعد موافقة الإدارة، وللسحب اختر طريقة أخرى.</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="my-5 border-t border-indigo-200/15 pt-4">
            <div className="mb-2.5 flex items-center justify-between gap-3" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-emerald-400/45 bg-emerald-400/10 text-xs font-black text-emerald-700 dark:text-emerald-300">4</span>
                <div>
                  <h3 className="text-sm font-black text-[var(--color-text)]">إيصال السحب</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">أرفق صورة واضحة لإتمام المراجعة</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgb(52_211_153/0.9)]" />
            </div>
            <div ref={(element) => { fieldRefs.current.proof = element; }} className={cn(
              'rounded-xl border bg-indigo-950/35 p-1 shadow-[0_18px_42px_-30px_rgb(34_211_238/0.45)]',
              validationErrors.proof ? 'border-rose-400/90' : 'border-cyan-300/25'
            )}>
              <div className="rounded-lg border border-cyan-300/10 bg-indigo-950/25 px-1.5 py-1.5">
                <UploadProof
                  label={null}
                  title="ارفع إيصال السحب"
                  hint="PNG أو JPG — الحد الأقصى 5MB"
                  badge="مطلوب للتحقق"
                  compact
                  value={proof}
                  onChange={(value) => {
                    setProof(value);
                    if (value?.file) clearValidationError('proof');
                  }}
                />
              </div>
            </div>
            {validationErrors.proof ? (
              <p role="alert" className="mt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-300"><CircleAlert className="h-3 w-3" />{validationErrors.proof}</p>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-indigo-300/20 bg-indigo-950/40 px-3 py-3 sm:px-5">
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl border border-cyan-200/35 bg-[linear-gradient(110deg,#7c3aed,#2563eb,#22d3ee)] text-sm font-black text-white shadow-[0_20px_42px_-20px_rgb(79_70_229/0.9)] hover:brightness-110" disabled={isSubmitting || !availablePaymentMethods.length}>
            {isSubmitting ? 'جارٍ إرسال طلب السحب...' : <>إرسال طلب السحب <ChevronLeft className="h-6 w-6" /></>}
          </Button>
        </footer>
      </form>
    </Card>
  );
};

export default TargetForm;

