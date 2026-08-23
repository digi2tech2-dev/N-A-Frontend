import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Coins, Sparkles, Target } from 'lucide-react';
import Button, { cn } from '../ui/Button';
import Card from '../ui/Card';
import Input, { selectClassName } from '../ui/Input';
import UploadProof from './UploadProof';
import { formatNumber } from '../../utils/intl';
import { resolveImageUrl } from '../../utils/imageUrl';
import { useToast } from '../ui/Toast';
import { isPaymentMethodAllowed, isSiteWalletPaymentMethod } from '../../utils/paymentSettings';

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

const TargetForm = ({ products = [], paymentMethods = [], onSubmit }) => {
  const [selectedAppId, setSelectedAppId] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [senderId, setSenderId] = useState('');
  const [transferNumber, setTransferNumber] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [proof, setProof] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const activeApps = useMemo(
    () => (products || []).filter((app) => app?.isActive !== false),
    [products]
  );

  const selectedApp = useMemo(
    () => activeApps.find((app) => String(app.id) === String(selectedAppId)) || activeApps[0] || null,
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
  const isSiteWalletMethod = isSiteWalletPaymentMethod(selectedPaymentMethod || paymentMethodId);

  const coinAmountValue = Number(coinAmount || 0);
  const unitPrice = Number(selectedApp?.unitPrice || 0);
  const totalPrice = Math.max(0, coinAmountValue * unitPrice);
  const targetAccountId = String(selectedApp?.targetAccountId || selectedApp?.receivingAccountId || '').trim();

  useEffect(() => {
    if (!selectedApp && activeApps.length) {
      setSelectedAppId(activeApps[0].id);
      return;
    }
    if (selectedApp && !selectedAppId) {
      setSelectedAppId(selectedApp.id);
    }
  }, [activeApps, selectedApp, selectedAppId]);

  useEffect(() => {
    if (!availablePaymentMethods.length) {
      setPaymentMethodId('');
      return;
    }
    if (!availablePaymentMethods.some((method) => String(method.id) === String(paymentMethodId))) {
      setPaymentMethodId(availablePaymentMethods[0].id);
    }
  }, [availablePaymentMethods, paymentMethodId]);

  useEffect(() => {
    if (!isSiteWalletMethod) return;
    setTransferNumber('');
  }, [isSiteWalletMethod]);

  const resetForm = () => {
    setCoinAmount('');
    setSenderId('');
    setTransferNumber('');
    setTransactionNumber('');
    setProof(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const hasTransferDetails = isSiteWalletMethod || transferNumber.trim();
    const hasPaymentDetails = hasTransferDetails && transactionNumber.trim() && proof?.file;
    if (!selectedApp?.id || !Number.isInteger(coinAmountValue) || coinAmountValue <= 0 || !selectedPaymentMethod || !senderId.trim() || !hasPaymentDetails) {
      addToast('أكمل بيانات طلب التارجت وارفع صورة إثبات التحويل.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        appId: selectedApp.id,
        targetAccountIdSnapshot: targetAccountId,
        coinAmount: coinAmountValue,
        senderId: senderId.trim(),
        transferNumber: isSiteWalletMethod ? 'محفظة الموقع' : transferNumber.trim(),
        transactionNumber: transactionNumber.trim(),
        paymentReference: transactionNumber.trim(),
        paymentMethodId: selectedPaymentMethod.id,
        paymentMethod: selectedPaymentMethod.name,
        screenshotProof: proof.file,
        isSiteWalletPayment: isSiteWalletMethod,
      });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-[2rem] border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.96),rgb(var(--color-surface-rgb)/0.88))] p-4 shadow-[0_34px_100px_-58px_rgb(var(--color-primary-rgb)/0.5)] sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
              <Sparkles className="h-3.5 w-3.5" />
              N&amp;A HUB Target
            </p>
            <h2 className="mt-3 text-xl font-black text-[var(--color-text)] sm:text-2xl">بيع تارجت</h2>
          </div>
        </div>

        <section>
          <p className="mb-3 text-sm font-bold text-[var(--color-text)]">اختر تطبيق بيع التارجت</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeApps.map((app) => {
              const isSelected = String(app.id) === String(selectedApp?.id);
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedAppId(app.id)}
                  className={cn(
                    'group overflow-hidden rounded-[1.35rem] border bg-[color:rgb(var(--color-card-rgb)/0.9)] text-start shadow-[0_18px_60px_-42px_rgb(var(--color-primary-rgb)/0.48)] transition duration-300 hover:-translate-y-1 hover:scale-[1.01]',
                    isSelected
                      ? 'border-[color:rgb(var(--color-primary-rgb)/0.72)] shadow-[0_22px_70px_-36px_rgb(var(--color-primary-rgb)/0.65)]'
                      : 'border-[color:rgb(var(--color-border-rgb)/0.72)] hover:border-[color:rgb(var(--color-primary-rgb)/0.34)]'
                  )}
                >
                  <div className="relative h-28 overflow-hidden">
                    {app.image ? (
                      <img src={resolveImageUrl(app.image)} alt={app.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
                        <Target className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[color:rgb(var(--color-bg-rgb)/0.78)] via-[color:rgb(var(--color-bg-rgb)/0.08)] to-transparent" />
                    {isSelected && (
                      <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-black">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-[var(--color-text)]">{app.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-primary)]">
                      {formatNumber(app.unitPrice, 'en-US', { maximumFractionDigits: 2 })} EGP / كوين
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            {targetAccountId ? (
              <div className="rounded-[1.15rem] border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] p-3">
                <p className="text-xs font-bold text-[var(--color-text-secondary)]">آيدي الحساب المستلم</p>
                <p className="mt-1 break-all text-base font-black text-[var(--color-primary)]">{targetAccountId}</p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="الكمية المحولة بالدولار"
                type="number"
                min="1"
                step="1"
                value={coinAmount}
                onChange={(event) => setCoinAmount(event.target.value)}
                placeholder="على سبيل المثال: 100$، 50$، 10$"
              />
              <Input
                label="معرّف الحساب"
                value={senderId}
                onChange={(event) => setSenderId(event.target.value)}
                placeholder="ID الحساب أو اللاعب داخل التطبيق المحدد"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">طريقة الدفع</span>
                <select
                  value={paymentMethodId}
                  onChange={(event) => setPaymentMethodId(event.target.value)}
                  className={selectClassName}
                  disabled={!availablePaymentMethods.length}
                >
                  {availablePaymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>{getPaymentMethodLabel(method.name)}</option>
                  ))}
                </select>
                {!availablePaymentMethods.length ? (
                  <p className="mt-1.5 text-xs text-[var(--color-error)]">لا توجد طرق دفع مفعّلة لهذا التطبيق حاليًا.</p>
                ) : null}
              </label>
              {!isSiteWalletMethod ? (
                <Input
                  label="رقم التحويل"
                  value={transferNumber}
                  onChange={(event) => setTransferNumber(event.target.value)}
                  placeholder="رقم المحفظة أو حساب InstaPay أو مرجع Binance"
                />
              ) : (
                <div className="rounded-[1rem] border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] p-3 text-xs leading-6 text-[var(--color-text-secondary)]">
                  سيتم استلام قيمة الطلب على محفظة الموقع، لذلك لا تحتاج لإدخال رقم تحويل.
                </div>
              )}
            </div>

            <Input
              label="رقم العملية"
              value={transactionNumber}
              onChange={(event) => setTransactionNumber(event.target.value)}
              placeholder={isSiteWalletMethod ? 'اكتب رقم العملية للسحب' : 'اكتب رقم العملية أو مرجع الدفع'}
            />

            <UploadProof label="صورة إثبات التحويل" value={proof} onChange={setProof} />
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.96),rgb(var(--color-surface-rgb)/0.86))] p-4 shadow-[0_26px_80px_-48px_rgb(var(--color-primary-rgb)/0.5)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:rgb(var(--color-primary-rgb)/0.13)] text-[var(--color-primary)]">
              <Coins className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">ملخص السعر</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--color-text-secondary)]">سعر الكوين</span>
                <strong className="text-[var(--color-text)]">{formatNumber(unitPrice, 'en-US', { maximumFractionDigits: 2 })} EGP</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--color-text-secondary)]">الكمية بالدولار</span>
                <strong className="text-[var(--color-text)]">{formatNumber(coinAmountValue, 'en-US')}</strong>
              </div>
              <div className="border-t border-[color:rgb(var(--color-border-rgb)/0.72)] pt-3">
                <span className="text-xs text-[var(--color-text-secondary)]">الإجمالي</span>
                <p className="mt-1 text-3xl font-black text-[var(--color-primary)]">
                  {formatNumber(totalPrice, 'en-US', { maximumFractionDigits: 2 })} EGP
                </p>
              </div>
            </div>
          </aside>
        </div>

        <Button type="submit" size="lg" className="w-full rounded-[1.25rem]" disabled={isSubmitting || !activeApps.length || !availablePaymentMethods.length}>
          <Target className="h-5 w-5" />
          {isSubmitting ? 'جارٍ إرسال الطلب...' : 'إرسال طلب التارجت'}
        </Button>
      </form>
    </Card>
  );
};

export default TargetForm;
