import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Banknote, CheckCircle, Copy, Hash, Landmark, Loader, MessageCircle, ReceiptText, ShieldCheck, Smartphone } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import UploadReceiptBox from '../components/wallet/UploadReceiptBox';
import { useLanguage } from '../context/LanguageContext';
import useSystemStore from '../store/useSystemStore';
import useTopupStore from '../store/useTopupStore';
import useAuthStore from '../store/useAuthStore';
import { useToast } from '../components/ui/Toast';
import { inputBaseClassName, textareaClassName } from '../components/ui/Input';
import { findPaymentMethodById } from '../utils/paymentSettings';
import { devLogger } from '../utils/devLogger';
import { resolveImageUrl } from '../utils/imageUrl';
import { buildWhatsAppLink, getDefaultWhatsAppNumber } from '../utils/whatsapp';
import { useNativeBackOverlay } from '../hooks/useNativeBackOverlay';

const normalizeMethodType = (type) => String(type || '').trim().toLowerCase();

const FieldCompletionBadge = ({ complete }) => (
  <span
    className={complete
      ? 'inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-black text-emerald-500'
      : 'rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-black text-rose-500'}
  >
    {complete ? (
      <>
        <CheckCircle className="h-3 w-3" />
        تم
      </>
    ) : 'مطلوب'}
  </span>
);

const getSenderDetailRequirement = (method) => {
  const type = normalizeMethodType(method?.type);
  if (type === 'mobile_wallet' || type === 'e_wallet' || type === 'ewallet') {
    return {
      field: 'senderWalletNumber',
      label: 'رقم المحفظة المحول منها',
      placeholder: 'أدخل رقم المحفظة التي تم التحويل منها',
      validationMessage: 'يرجى إدخال رقم المحفظة المحول منها',
    };
  }

  if (type === 'usdt' || type === 'crypto') {
    return {
      field: 'senderWalletAddress',
      label: 'عنوان المحفظة المحول منها',
      placeholder: 'أدخل عنوان محفظة USDT التي تم التحويل منها',
      validationMessage: 'يرجى إدخال عنوان المحفظة المحول منها',
    };
  }

  return null;
};

const getMethodPresentation = (method) => {
  const token = `${method?.id || ''} ${method?.name || ''}`.toLowerCase();
  const type = normalizeMethodType(method?.type);

  if (token.includes('vodafone')) return { icon: 'VC', color: 'from-red-500 to-yellow-500' };
  if (token.includes('etisalat')) return { icon: 'EC', color: 'from-green-500 to-indigo-500' };
  if (token.includes('orange')) return { icon: 'OC', color: 'from-orange-500 to-red-500' };
  if (type === 'bank_transfer') return { icon: 'BT', color: 'from-indigo-500 to-amber-500' };
  if (type === 'usdt' || type === 'crypto') return { icon: 'USDT', color: 'from-emerald-500 to-indigo-600' };
  if (type === 'credit_card') return { icon: 'CC', color: 'from-amber-500 to-orange-600' };

  return { icon: 'PM', color: 'from-emerald-500 to-indigo-600' };
};

const getCurrencyRate = (currencies = [], currencyCode = 'USD') => {
  const normalizedCode = String(currencyCode || '').trim().toUpperCase();
  if (!normalizedCode) return null;

  const matchedCurrency = (Array.isArray(currencies) ? currencies : []).find(
    (currency) => (
      currency?.isActive !== false
      && String(currency?.code || '').trim().toUpperCase() === normalizedCode
    )
  );
  const matchedRate = Number(matchedCurrency?.rate);
  if (Number.isFinite(matchedRate) && matchedRate > 0) return matchedRate;

  if (normalizedCode === 'USD') return 1;
  return null;
};

const PaymentDetails = ({
  embedded = false,
  methodId: embeddedMethodId = '',
  automaticAmount = null,
  automaticCurrency = '',
  onBack = null,
  onComplete = null,
  onReturnToPurchase = null,
}) => {
  const { methodId: routeMethodId } = useParams();
  const methodId = embeddedMethodId || routeMethodId;
  const { dir } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { paymentSettings, currencies, loadPaymentSettings, loadCurrencies } = useSystemStore();
  const { addToast } = useToast();
  const isRTL = dir === 'rtl';
  const automaticTopupAmount = Number(automaticAmount ?? searchParams.get('amount') ?? 0);
  const automaticTopupCurrency = String(automaticCurrency || searchParams.get('currency') || user?.currency || 'USD').toUpperCase();
  const isAutomaticTopup = (embedded || searchParams.get('mode') === 'auto')
    && Number.isFinite(automaticTopupAmount)
    && automaticTopupAmount > 0;
  const automaticTopupPrefilled = useRef(false);

  const [formData, setFormData] = useState({
    amount: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    senderWalletNumber: '',
    senderWalletAddress: '',
    transactionId: '',
    notes: '',
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (submitStatus !== 'success') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [submitStatus]);

  useEffect(() => {
    loadPaymentSettings({ force: true });
    loadCurrencies();
  }, [loadPaymentSettings, loadCurrencies]);

  const selectedMethodEntry = useMemo(
    () => findPaymentMethodById(paymentSettings, methodId, { fallbackToDefault: false }),
    [paymentSettings, methodId]
  );

  const group = selectedMethodEntry?.group || null;
  const method = selectedMethodEntry?.method || null;
  const methodPresentation = useMemo(
    () => getMethodPresentation(method),
    [method]
  );

  const methodFields = method?.fields || ['amount'];
  const senderDetailRequirement = useMemo(
    () => getSenderDetailRequirement(method),
    [method]
  );
  const isWalletMethod = ['mobile_wallet', 'e_wallet', 'ewallet'].includes(normalizeMethodType(method?.type));
  const visibleMethodFields = useMemo(
    () => methodFields.filter((field) => !['senderNumber', 'senderWalletNumber', 'senderWalletAddress', 'transactionId', 'transactionNumber', 'paymentReference'].includes(field)),
    [methodFields]
  );
  const rawMethodInstructions = method?.instructions || paymentSettings?.instructions || t('payments.chooseMethod');
  const methodInstructions = String(rawMethodInstructions)
    .replace(/\s*ورقم العملية\.?/g, '')
    .replace(/\s*ورقم المعاملة\.?/g, '')
    .trim();
  const requiresReceipt = Boolean(method?.accountNumber) && !isWalletMethod;
  const feePercent = useMemo(() => {
    const value = Number(method?.feePercent);
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value));
  }, [method?.feePercent]);
  const enteredAmount = Number(formData.amount || 0);
  const baseAmount = Number.isFinite(enteredAmount) && enteredAmount > 0 ? enteredAmount : 0;
  const feeAmount = Number(((baseAmount * feePercent) / 100).toFixed(2));
  const payableAmount = Number((baseAmount + feeAmount).toFixed(2));
  const paymentCurrencyCode = String(group?.currency || method?.currency || user?.currency || 'USD').toUpperCase();
  const supportWhatsAppNumber = String(paymentSettings?.whatsappNumber || getDefaultWhatsAppNumber()).trim();
  const supportWhatsAppHref = buildWhatsAppLink({
    number: supportWhatsAppNumber,
    message: dir === 'rtl'
      ? `مرحبًا، أواجه مشكلة في الدفع عبر ${method?.name || 'وسيلة الدفع'}. أرجو مساعدتي.`
      : `Hello, I need help with a payment using ${method?.name || 'this payment method'}.`,
  });
  const paymentCurrencyRate = useMemo(
    () => getCurrencyRate(currencies, paymentCurrencyCode),
    [currencies, paymentCurrencyCode]
  );
  const usdCurrencyRate = useMemo(
    () => getCurrencyRate(currencies, 'USD') || 1,
    [currencies]
  );

  useEffect(() => {
    if (automaticTopupPrefilled.current || !isAutomaticTopup) return;
    if (!Number.isFinite(automaticTopupAmount) || automaticTopupAmount <= 0 || !method) return;

    const sourceRate = getCurrencyRate(currencies, automaticTopupCurrency);
    const targetRate = getCurrencyRate(currencies, paymentCurrencyCode);
    if (!sourceRate || !targetRate) return;

    const convertedAmount = (automaticTopupAmount / sourceRate) * targetRate;
    if (!Number.isFinite(convertedAmount) || convertedAmount <= 0) return;

    setFormData((previous) => ({
      ...previous,
      amount: previous.amount || String(Number(convertedAmount.toFixed(2))),
    }));
    automaticTopupPrefilled.current = true;
  }, [automaticTopupAmount, automaticTopupCurrency, currencies, isAutomaticTopup, method, paymentCurrencyCode]);
  const usdPreviewAmount = useMemo(() => {
    const amountValue = Number(formData.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) return null;
    if (!Number.isFinite(paymentCurrencyRate) || paymentCurrencyRate <= 0) return null;

    const convertedAmount = (amountValue / paymentCurrencyRate) * usdCurrencyRate;
    if (!Number.isFinite(convertedAmount) || convertedAmount < 0.01) return null;

    return convertedAmount;
  }, [formData.amount, paymentCurrencyRate, usdCurrencyRate]);
  const usdPreviewLabel = useMemo(() => {
    if (!Number.isFinite(usdPreviewAmount) || usdPreviewAmount <= 0) return '';

    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usdPreviewAmount);

    return `≈ ${formattedAmount} USD`;
  }, [usdPreviewAmount]);

  const formatMoney = (value) => {
    const safeValue = Number(value || 0);

    try {
      return new Intl.NumberFormat(isRTL ? 'ar-EG-u-nu-latn' : 'en-US-u-nu-latn', {
        style: 'currency',
        currency: paymentCurrencyCode,
        numberingSystem: 'latn',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(safeValue);
    } catch (_error) {
      return `${safeValue.toFixed(2)} ${paymentCurrencyCode}`;
    }
  };

  const handleInputChange = (field, value) => {
    setFormError('');
    setSubmitStatus(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptUpload = (file) => {
    setFormError('');
    setSubmitStatus(null);
    setUploadedFile(file);
  };

  const handleCopyAccount = async () => {
    const value = String(method?.accountNumber || '').trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      addToast(
        t('payments.copySuccess', { defaultValue: dir === 'rtl' ? 'تم نسخ الرقم' : 'Number copied' }),
        'success'
      );
    } catch (_error) {
      addToast(
        t('payments.copyFailed', { defaultValue: dir === 'rtl' ? 'تعذر نسخ الرقم' : 'Unable to copy number' }),
        'error'
      );
    }
  };

  const validate = () => {
    const amountValue = Number(formData.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) return t('payments.validationAmount');
    if (senderDetailRequirement && !String(formData[senderDetailRequirement.field] || '').trim()) {
      return senderDetailRequirement.validationMessage;
    }
    if (!String(formData.transactionId || '').trim()) {
      return 'يرجى إدخال رقم العملية';
    }
    if (requiresReceipt && !uploadedFile) return t('payments.validationReceipt');
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      setFormError(validationMessage);
      setSubmitStatus(null);
      addToast(validationMessage, 'error');
      return;
    }

    setFormError('');
    setSubmitStatus(null);
    setIsSubmitting(true);
    try {
      const freshSettings = await loadPaymentSettings({ force: true });
      const freshEntry = findPaymentMethodById(freshSettings, methodId, { fallbackToDefault: false });
      const freshMethod = freshEntry?.method || null;
      const freshGroup = freshEntry?.group || null;

      if (!freshMethod) {
        addToast('طريقة الدفع لم تعد متاحة. تم تحديث البيانات من السيرفر.', 'error');
        if (onBack) onBack();
        else navigate('/wallet/add-balance');
        return;
      }

      const freshFeePercentValue = Number(freshMethod?.feePercent);
      const freshFeePercent = Number.isFinite(freshFeePercentValue)
        ? Math.min(100, Math.max(0, freshFeePercentValue))
        : 0;
      const freshFeeAmount = Number(((baseAmount * freshFeePercent) / 100).toFixed(2));
      const freshPayableAmount = Number((baseAmount + freshFeeAmount).toFixed(2));
      const freshSenderRequirement = getSenderDetailRequirement(freshMethod);
      const senderValue = freshSenderRequirement
        ? String(formData[freshSenderRequirement.field] || '').trim()
        : '';
      const transactionId = String(formData.transactionId || '').trim();

      if (freshSenderRequirement && !senderValue) {
        addToast(freshSenderRequirement.validationMessage, 'error');
        setFormError(freshSenderRequirement.validationMessage);
        return;
      }
      if (!transactionId) {
        addToast('يرجى إدخال رقم العملية', 'error');
        setFormError('يرجى إدخال رقم العملية');
        return;
      }

      const senderDetails = freshSenderRequirement ? {
        methodType: normalizeMethodType(freshMethod?.type),
        field: freshSenderRequirement.field,
        label: freshSenderRequirement.label,
        value: senderValue,
        transactionNumber: transactionId,
      } : null;
      const { requestTopup } = useTopupStore.getState();

      await requestTopup({
        requestedAmount: baseAmount,
        amount: baseAmount,
        paymentMethodId: freshMethod?.id || '',
        paymentFeePercent: freshFeePercent,
        paymentFeeAmount: freshFeeAmount,
        amountWithFee: freshPayableAmount,
        senderDetails,
        senderWalletNumber: freshSenderRequirement?.field === 'senderWalletNumber' ? senderValue : '',
        senderWalletAddress: freshSenderRequirement?.field === 'senderWalletAddress' ? senderValue : '',
        transferredFromNumber: senderValue,
        transactionId,
        transactionNumber: transactionId,
        paymentReference: transactionId,
        proofImage: uploadedFile || null,
        paymentChannel: freshMethod?.name || methodId || '',
        paymentMethodType: normalizeMethodType(freshMethod?.type),
        currencyCode: freshGroup?.currency || freshMethod?.currency || user?.currency || 'USD',
        userId: user?.id || '',
        userName: user?.name || '',
        notes: formData.notes || '',
        type: 'regular',
      });

      setSubmitStatus('success');
    } catch (error) {
      devLogger.warnUnlessBenign('Topup submission failed:', error);
      setFormError(t('payments.submitErrorDesc'));
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    if (onComplete) onComplete();
    else navigate('/wallet/topups');
  };

  const handleSuccessCancel = () => {
    if (onReturnToPurchase) {
      onReturnToPurchase();
      return;
    }
    setSubmitStatus(null);
  };

  useNativeBackOverlay(submitStatus === 'success', handleSuccessCancel);

  const fieldConfigs = {
    amount: {
      label: t('payments.fields.amount'),
      placeholder: t('payments.fields.amountPlaceholder'),
      type: 'number',
      min: '0.01',
      step: '0.01',
    },
    senderNumber: {
      label: t('payments.fields.senderNumber'),
      placeholder: t('payments.fields.senderNumberPlaceholder'),
      type: 'tel',
    },
    transactionId: {
      label: t('payments.fields.transactionId'),
      placeholder: t('payments.fields.transactionIdPlaceholder'),
      type: 'text',
    },
    cardNumber: {
      label: t('payments.fields.cardNumber'),
      placeholder: t('payments.fields.cardNumberPlaceholder'),
      type: 'text',
    },
    expiryDate: {
      label: t('payments.fields.expiryDate'),
      placeholder: t('payments.fields.expiryDatePlaceholder'),
      type: 'text',
    },
    cvv: {
      label: t('payments.fields.cvv'),
      placeholder: t('payments.fields.cvvPlaceholder'),
      type: 'text',
    },
  };

  if (!method) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 text-center dark:border-gray-800 dark:bg-gray-900/70">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t('payments.invalidMethodTitle')}</h1>
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate('/wallet/add-balance'))}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            {t('payments.invalidMethodAction')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'w-full min-w-0 overflow-x-hidden pb-2' : 'pb-6'} dir={dir}>
      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-3 sm:space-y-4">
        {embedded && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 text-xs font-black text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.14)]"
          >
            {dir === 'rtl' ? 'العودة لوسائل الدفع' : 'Back to payment methods'}
          </button>
        ) : null}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-white/90 p-4 shadow-[0_18px_48px_-38px_rgba(14,116,144,0.65)] backdrop-blur-xl dark:border-sky-400/15 dark:bg-slate-950/72 sm:p-5"
        >
          <div className="flex items-center gap-3">
            {method.image && !isWalletMethod ? (
              <img
                src={resolveImageUrl(method.image)}
                alt={method.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-12 w-12 shrink-0 rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-white object-cover sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-[0_12px_28px_-16px_rgba(14,165,233,0.8)] sm:h-14 sm:w-14">
                {isWalletMethod ? <Smartphone className="h-6 w-6" /> : <span className="text-xs font-bold">{methodPresentation.icon}</span>}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {dir === 'rtl' ? 'دفع آمن' : 'Secure payment'}
                </span>
                {group?.currency && (
                  <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black text-violet-600 dark:text-violet-300">
                    {String(group.currency).toUpperCase()}
                  </span>
                )}
              </div>
              <h1 className="truncate text-base font-black tracking-tight text-[var(--color-text)] sm:text-xl">{method.name}</h1>
              <p className="mt-0.5 truncate text-[10px] font-bold text-[var(--color-text-secondary)] sm:text-xs">
                {group?.name || (dir === 'rtl' ? 'إضافة رصيد' : 'Add balance')}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid min-w-0 gap-3 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        {method.accountNumber && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
            className="min-w-0 overflow-hidden rounded-[1.75rem] border border-emerald-200/90 bg-white/95 p-4 shadow-[0_22px_60px_-44px_rgba(5,150,105,0.55)] dark:border-emerald-400/15 dark:bg-slate-950/78 sm:p-5 lg:sticky lg:top-5"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-[0_14px_28px_-18px_rgba(5,150,105,0.9)]">
                <Landmark className="h-4 w-4" />
                <span className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--color-card)] bg-white font-['Poppins'] text-[9px] font-extrabold text-violet-700">1</span>
              </span>
              <div>
                <h3 className="text-sm font-black text-[var(--color-text)]">{t('payments.accountDetails')}</h3>
                <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">{dir === 'rtl' ? 'الخطوة الأولى: حوّل المبلغ إلى الرقم التالي' : 'Step 1: Transfer to this account'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.55)] p-2.5 sm:p-3">
              <button
                type="button"
                onClick={handleCopyAccount}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-[var(--color-text)] transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-400/35 dark:hover:bg-emerald-400/10"
              >
                <span className="min-w-0 break-all font-mono text-base font-black [direction:ltr]">{method.accountNumber}</span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                  <Copy className="h-4 w-4" />
                </span>
              </button>
              {method.accountName && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2">
                  <p className="text-[10px] font-bold text-[var(--color-text-secondary)]">
                    {t('payments.accountHolder', { defaultValue: dir === 'rtl' ? 'اسم صاحب الحساب' : 'Account holder' })}
                  </p>
                  <p className="text-xs font-black text-[var(--color-text)]">{method.accountName}</p>
                </div>
              )}
              {method.bankName && (
                <div className="mt-1 border-t border-[color:rgb(var(--color-border-rgb)/0.58)] pt-2 text-center text-[10px] font-bold text-[var(--color-text-secondary)]">
                  {method.bankName}
                </div>
              )}
            </div>
            {methodInstructions && (
              <p className="mt-2.5 rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.07)] px-3 py-2 text-[10px] font-semibold leading-5 text-[var(--color-text-secondary)]">
                {methodInstructions}
              </p>
            )}
          </motion.div>
        )}

        <motion.form
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.08, ease: 'easeOut' }}
          onSubmit={handleSubmit}
          className="min-w-0 overflow-hidden rounded-[1.75rem] border border-sky-200/80 bg-white/95 p-4 shadow-[0_24px_65px_-42px_rgba(14,116,144,0.55)] dark:border-sky-400/15 dark:bg-slate-950/78 sm:p-6"
        >
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-white/10">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-[0_14px_30px_-17px_rgba(14,165,233,0.9)]">
              <ReceiptText className="h-4 w-4" />
              <span className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-slate-900 font-['Poppins'] text-[9px] font-extrabold text-white dark:border-slate-950">2</span>
            </span>
            <div>
              <h3 className="text-base font-black text-[var(--color-text)]">{dir === 'rtl' ? 'سجّل بيانات التحويل' : 'Enter transfer details'}</h3>
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {dir === 'rtl'
                  ? (isWalletMethod ? 'اكتب 3 بيانات فقط كما ظهرت في رسالة التحويل' : 'أدخل البيانات المطلوبة لإرسال طلب الدفع')
                  : (isWalletMethod ? 'Enter only the 3 details shown in your transfer message' : 'Enter the required payment details')}
              </p>
            </div>
          </div>

          {isWalletMethod && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-3.5 text-sky-900 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-xs font-bold leading-6">
                لا نطلب صورة إيصال للمحافظ. اكتب المبلغ ورقم محفظتك ورقم العملية فقط.
              </p>
            </div>
          )}

          {visibleMethodFields.map((field) => {
            const config = fieldConfigs[field];
            if (!config) return null;

            return (
              <div key={field} className="mb-3 rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
                <label className={`mb-2.5 flex items-center justify-between gap-2 text-xs font-black text-[var(--color-text)] ${isRTL ? 'text-right' : 'text-left'}`}>
                  <span className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                      {field === 'amount' ? <Banknote className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                    </span>
                    <span>
                      <span className="block">{config.label}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {field === 'amount' ? 'اكتب نفس المبلغ الذي حوّلته' : 'اكتب البيانات كما ظهرت في عملية الدفع'}
                      </span>
                    </span>
                  </span>
                  {field === 'amount' ? (
                    <FieldCompletionBadge complete={Number(formData.amount) > 0} />
                  ) : null}
                </label>
                <input
                  type={config.type}
                  value={formData[field] || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={config.placeholder}
                  min={config.min}
                  step={config.step}
                  className={`${inputBaseClassName} !h-12 !rounded-xl !border-slate-200 !bg-white !text-base !font-bold focus:!border-sky-400 focus:!ring-4 focus:!ring-sky-100 dark:!border-white/10 dark:!bg-slate-950/60 dark:focus:!ring-sky-400/10 ${isRTL ? 'text-right' : 'text-left'}`}
                  disabled={isSubmitting}
                />
                {field === 'amount' && usdPreviewLabel && (
                  <div className="mt-1.5 flex min-h-9 w-full items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/8 px-3 py-2 text-center text-xs font-black text-emerald-600 dark:text-emerald-300">
                    <span className="[direction:ltr]">
                      {usdPreviewLabel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {senderDetailRequirement && (
            <div className="mb-3 rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
              <label className={`mb-2.5 flex items-center justify-between gap-2 text-xs font-black text-[var(--color-text)] ${isRTL ? 'text-right' : 'text-left'}`}>
                <span className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block">{senderDetailRequirement.label}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      اكتب رقم محفظتك أنت التي أرسلت منها المبلغ
                    </span>
                  </span>
                </span>
                <FieldCompletionBadge complete={Boolean(String(formData[senderDetailRequirement.field] || '').trim())} />
              </label>
              <input
                type={isWalletMethod ? 'tel' : 'text'}
                inputMode={isWalletMethod ? 'numeric' : undefined}
                value={formData[senderDetailRequirement.field] || ''}
                onChange={(e) => handleInputChange(senderDetailRequirement.field, e.target.value)}
                placeholder={senderDetailRequirement.placeholder}
                className={`${inputBaseClassName} !h-12 !rounded-xl !border-slate-200 !bg-white !text-base !font-bold focus:!border-sky-400 focus:!ring-4 focus:!ring-sky-100 dark:!border-white/10 dark:!bg-slate-950/60 dark:focus:!ring-sky-400/10 ${isRTL ? 'text-right' : 'text-left'}`}
                disabled={isSubmitting}
                required
              />
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
            <label className={`mb-2.5 flex items-center justify-between gap-2 text-xs font-black text-[var(--color-text)] ${isRTL ? 'text-right' : 'text-left'}`}>
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                  <Hash className="h-4 w-4" />
                </span>
                <span>
                  <span className="block">رقم العملية</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    ستجده في رسالة نجاح التحويل أو تفاصيل العملية
                  </span>
                </span>
              </span>
              <FieldCompletionBadge complete={Boolean(String(formData.transactionId || '').trim())} />
            </label>
            <input
              type="text"
              value={formData.transactionId || ''}
              onChange={(e) => handleInputChange('transactionId', e.target.value)}
              placeholder="أدخل رقم العملية"
              className={`${inputBaseClassName} !h-12 !rounded-xl !border-slate-200 !bg-white !text-base !font-bold focus:!border-amber-400 focus:!ring-4 focus:!ring-amber-100 dark:!border-white/10 dark:!bg-slate-950/60 dark:focus:!ring-amber-400/10 ${isRTL ? 'text-right' : 'text-left'}`}
              disabled={isSubmitting}
              required
            />
          </div>

          {requiresReceipt && (
            <div className="mb-4">
              <label className={`mb-2 flex items-center justify-between gap-2 rounded-xl border border-violet-400/20 bg-violet-500/7 px-3 py-2 text-xs font-black text-[var(--color-text)] ${isRTL ? 'text-right' : 'text-left'}`}>
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-violet-500 font-['Poppins'] text-[9px] font-extrabold text-white">3</span>
                  {t('payments.uploadReceipt')}
                </span>
                <FieldCompletionBadge complete={Boolean(uploadedFile)} />
              </label>
              <UploadReceiptBox onFileUpload={handleReceiptUpload} />
            </div>
          )}

          <div className="mb-4 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/65 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]">
            <div className="mb-3 flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-200">
              <Banknote className="h-4 w-4" />
              ملخص المبلغ
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-xs dark:bg-black/15">
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {t('payments.subtotalLabel', {
                  defaultValue: dir === 'rtl' ? 'المبلغ الأساسي' : 'Base amount',
                })}
              </span>
              <span className="font-['Poppins'] text-sm font-extrabold tracking-tight text-slate-950 [direction:ltr] [font-variant-numeric:tabular-nums] dark:text-white">{formatMoney(baseAmount)}</span>
            </div>

            {feePercent > 0 && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-xs dark:bg-black/15">
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {t('payments.feeAmountLabel', {
                    defaultValue: dir === 'rtl' ? 'رسوم التحويل' : 'Payment fee',
                  })}
                  {` (${feePercent}%)`}
                </span>
                <span className="font-['Poppins'] font-extrabold tracking-tight text-amber-600 [direction:ltr] [font-variant-numeric:tabular-nums] dark:text-amber-300">{formatMoney(feeAmount)}</span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-emerald-600 px-3 py-3 text-xs text-white shadow-[0_12px_26px_-18px_rgba(5,150,105,0.8)]">
              <span className="font-black">
                {t('payments.totalToTransferLabel', {
                  defaultValue: dir === 'rtl' ? 'الإجمالي المطلوب تحويله' : 'Total to transfer',
                })}
              </span>
              <span className="font-['Poppins'] text-base font-extrabold tracking-tight [direction:ltr] [font-variant-numeric:tabular-nums]">{formatMoney(payableAmount)}</span>
            </div>
          </div>

          {formError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className={`mb-4 rounded-[1rem] border border-rose-200 bg-rose-50/90 p-3.5 shadow-[0_14px_28px_-26px_rgba(225,29,72,0.55)] dark:border-rose-900/70 dark:bg-rose-950/25 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.75rem] border border-rose-200 bg-white text-rose-600 dark:border-rose-900/70 dark:bg-slate-950 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-rose-700 dark:text-rose-200">
                    {dir === 'rtl' ? 'راجع بيانات الدفع' : 'Check payment details'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-rose-700/85 dark:text-rose-100/80">{formError}</p>
                </div>
              </div>
            </motion.div>
          )}

          <motion.button
            type="submit"
            aria-busy={isSubmitting}
            whileTap={{ scale: 0.985 }}
            whileHover={!isSubmitting ? { y: -1 } : undefined}
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 px-5 text-sm font-black text-white shadow-[0_18px_36px_-22px_rgba(5,150,105,0.9)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>{t('common.processing')}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>{t('payments.confirmPayment')}</span>
              </>
            )}
          </motion.button>

          <section className="mt-4 overflow-hidden rounded-2xl border border-sky-200/90 bg-sky-50/60 dark:border-sky-400/20 dark:bg-sky-400/[0.07]" aria-labelledby="payment-customer-instructions">
            <div className="flex items-center gap-3 border-b border-sky-200/70 px-4 py-3 dark:border-sky-400/15">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-[0_10px_24px_-15px_rgba(2,132,199,0.9)]">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 id="payment-customer-instructions" className="text-sm font-black text-slate-900 dark:text-white">
                  تعليمات مهمة قبل تأكيد الدفع
                </h3>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  راجع هذه النقاط لتتم مراجعة طلبك بسرعة
                </p>
              </div>
            </div>

            <ol className="space-y-2 p-4">
              {[
                'تأكد أن المبلغ الذي حوّلته يساوي الإجمالي المطلوب تحويله الموضح بالأعلى.',
                isWalletMethod
                  ? 'اكتب رقم المحفظة التي أرسلت منها ورقم العملية كما ظهرا في رسالة نجاح التحويل.'
                  : 'راجع بيانات التحويل ورقم العملية، وارفع صورة واضحة للإيصال إذا كانت مطلوبة.',
                'لا ترسل نفس العملية أكثر من مرة؛ سيتم إشعارك بعد مراجعة طلب الدفع.',
              ].map((instruction, index) => (
                <li key={instruction} className="flex items-start gap-2.5 rounded-xl bg-white/85 px-3 py-2.5 text-xs font-bold leading-6 text-slate-700 dark:bg-black/15 dark:text-slate-200">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 font-['Poppins'] text-[9px] font-black text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                    {index + 1}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>

            <div className="m-4 mt-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-[0_10px_24px_-16px_rgba(37,211,102,0.9)]">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-900 dark:text-emerald-100">
                      إذا واجهت مشكلة تواصل مع دعم الموقع
                    </p>
                    <p dir="ltr" className="mt-1 w-fit font-['Poppins'] text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                      {supportWhatsAppNumber}
                    </p>
                  </div>
                </div>
                <a
                  href={supportWhatsAppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-black text-white shadow-[0_12px_26px_-18px_rgba(37,211,102,0.95)] transition hover:-translate-y-0.5 hover:bg-[#1fbd5a]"
                >
                  <MessageCircle className="h-4 w-4" />
                  تواصل عبر واتساب
                </a>
              </div>
            </div>
          </section>
        </motion.form>
        </div>

        {submitStatus === 'success' && createPortal(
          <div className="fixed inset-0 z-[240] flex items-center justify-center bg-[radial-gradient(34rem_circle_at_50%_15%,rgb(192_38_211/0.2),transparent_52%),radial-gradient(28rem_circle_at_15%_85%,rgb(37_99_235/0.17),transparent_50%),rgb(2_1_10/0.82)] px-4 backdrop-blur-[16px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="topup-success-title"
              className="relative isolate w-full max-w-[21.5rem] overflow-hidden rounded-[1.65rem] border border-violet-300/25 bg-[radial-gradient(20rem_circle_at_92%_-8%,rgb(244_114_208/0.25),transparent_46%),radial-gradient(18rem_circle_at_2%_104%,rgb(37_99_235/0.3),transparent_48%),linear-gradient(145deg,#10082b_0%,#221b53_52%,#42136a_100%)] p-5 text-center text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_32px_90px_-35px_rgb(0_0_0/0.95),0_0_55px_-28px_rgb(192_38_211/0.76),0_0_50px_-30px_rgb(124_58_237/0.88)] sm:p-6"
            >
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[length:30px_30px] [mask-image:linear-gradient(180deg,black,transparent_90%)]" />
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-emerald-300/25 bg-[linear-gradient(145deg,rgb(52_211_153/0.22),rgb(20_184_166/0.1))] text-emerald-300 shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_18px_42px_-22px_rgb(52_211_153/0.9)]">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 id="topup-success-title" className="text-xl font-black tracking-tight text-white">
                {dir === 'rtl' ? 'تم الشحن' : 'Top-up submitted'}
              </h3>
              <p className="mx-auto mt-2 max-w-[17rem] text-xs font-semibold leading-6 text-violet-100/76">
                {dir === 'rtl'
                  ? 'تم إرسال طلب إضافة الرصيد للمراجعة.'
                  : 'Your balance top-up request was sent for review.'}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSuccessConfirm}
                  className="h-11 rounded-xl bg-[linear-gradient(135deg,#7c3aed,#c026d3)] px-3 text-xs font-black text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_16px_32px_-20px_rgb(192_38_211/0.9)] transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  {dir === 'rtl' ? 'سجل الطلبات' : 'Request history'}
                </button>
                <button
                  type="button"
                  onClick={handleSuccessCancel}
                  className="h-11 rounded-xl border border-white/15 bg-white/8 px-3 text-xs font-black text-violet-100 backdrop-blur-md transition hover:border-white/28 hover:bg-white/14 hover:text-white"
                >
                  {onReturnToPurchase
                    ? (dir === 'rtl' ? 'العودة للشراء' : 'Back to purchase')
                    : (dir === 'rtl' ? 'إلغاء' : 'Cancel')}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {submitStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className={`rounded-[1.2rem] border border-rose-200 bg-white/90 p-4 shadow-[0_18px_34px_-30px_rgba(225,29,72,0.45)] backdrop-blur-xl dark:border-rose-900/70 dark:bg-slate-950/78 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-950 dark:text-white">{t('payments.submitErrorTitle')}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('payments.submitErrorDesc')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetails;

