import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ClipboardCheck, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TargetForm from '../components/target/TargetForm';
import TargetOrderSuccessModal from '../components/target/TargetOrderSuccessModal';
import Button from '../components/ui/Button';
import useAuthStore from '../store/useAuthStore';
import useTargetStore from '../store/useTargetStore';
import useSystemStore from '../store/useSystemStore';
import { useToast } from '../components/ui/Toast';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  getTargetPaymentMethods,
  isPaymentMethodAllowed,
  resolveAllowedPaymentMethodValue,
} from '../utils/paymentSettings';
import { getTargetCommissionRate, TARGET_BASE_EXCHANGE_RATE } from '../utils/targetPricing';
import { formatNumber } from '../utils/intl';

const TARGET_DATA_REFRESH_INTERVAL = 15 * 1000;

const BuyTarget = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { products, loadApps, submitRequest } = useTargetStore();
  const { paymentSettings, loadPaymentSettings } = useSystemStore();
  const { addToast } = useToast();
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [selectedTargetApp, setSelectedTargetApp] = useState(null);
  const [withdrawalInfoRequest, setWithdrawalInfoRequest] = useState(0);
  const [backToAppsRequest, setBackToAppsRequest] = useState(0);

  const refreshData = useCallback(() => (
    Promise.allSettled([
      loadApps({ includeInactive: false }),
      loadPaymentSettings({ force: true }),
    ])
  ), [loadApps, loadPaymentSettings]);

  useEffect(() => {
    void refreshData();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void refreshData();
    }, TARGET_DATA_REFRESH_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [refreshData]);

  useEffect(() => {
    const handleTopBack = () => {
      if (selectedTargetApp) {
        setBackToAppsRequest((current) => current + 1);
        return;
      }
      navigate(-1);
    };

    window.addEventListener('ka:buy-target-back', handleTopBack);
    return () => window.removeEventListener('ka:buy-target-back', handleTopBack);
  }, [navigate, selectedTargetApp]);

  const paymentMethods = useMemo(
    () => getTargetPaymentMethods(paymentSettings),
    [paymentSettings]
  );

  const handleSubmit = async (payload) => {
    const [freshAppsResult, freshPaymentSettingsResult] = await Promise.allSettled([
      loadApps({ includeInactive: false }),
      loadPaymentSettings({ force: true }),
    ]);

    const freshApps = freshAppsResult.status === 'fulfilled' ? freshAppsResult.value : products;
    const freshSettings = freshPaymentSettingsResult.status === 'fulfilled' ? freshPaymentSettingsResult.value : paymentSettings;
    const freshApp = (freshApps || []).find((app) => String(app.id) === String(payload.appId));
    const freshMethods = getTargetPaymentMethods(freshSettings);
    const selectedMethod = freshMethods.find((method) => String(method.id) === String(payload.paymentMethodId));
    const isStillAllowed = freshApp && selectedMethod && isPaymentMethodAllowed(selectedMethod, freshApp.allowedPaymentMethods || freshApp.paymentMethodIds || []);

    if (!freshApp?.id) {
      addToast('التطبيق لم يعد متاحًا حاليًا. تم تحديث البيانات من السيرفر.', 'error');
      return false;
    }

    if (!isStillAllowed) {
      addToast('طريقة الدفع لم تعد متاحة لهذا التطبيق. تم تحديث البيانات من السيرفر.', 'error');
      return false;
    }

    const allowedPaymentMethodValue = resolveAllowedPaymentMethodValue(
      selectedMethod,
      freshApp.allowedPaymentMethods || freshApp.paymentMethodIds || []
    );

    const submittedPayload = {
      ...payload,
      appId: freshApp.id,
      paymentMethodId: selectedMethod.id,
      paymentMethod: allowedPaymentMethodValue,
      paymentMethodName: selectedMethod.name,
      userId: user?.id || '',
      userName: user?.name || user?.fullName || '',
      userEmail: user?.email || '',
    };
    const createdOrder = await submitRequest(submittedPayload);
    const orderDetails = {
      ...submittedPayload,
      ...createdOrder,
      app: createdOrder?.app || freshApp,
      appNameSnapshot: createdOrder?.appNameSnapshot || freshApp.name,
      targetAccountIdSnapshot: createdOrder?.targetAccountIdSnapshot || freshApp.targetAccountId || freshApp.receivingAccountId || '',
      unitPriceSnapshot: Number(createdOrder?.unitPriceSnapshot ?? createdOrder?.unitPrice ?? freshApp.unitPrice ?? 0),
      totalPrice: Number(createdOrder?.totalPrice ?? (Number(payload.coinAmount || 0) * Number(freshApp.unitPrice || 0))),
      paymentMethodName: createdOrder?.paymentMethodName || selectedMethod.name,
      status: createdOrder?.status || 'PENDING',
      createdAt: createdOrder?.createdAt || new Date().toISOString(),
    };
    setSubmittedOrder(orderDetails);
    addToast('تم إرسال طلب التارجت بنجاح.', 'success');
    return orderDetails;
  };

  const handleSelectedAppChange = useCallback((app) => {
    setSelectedTargetApp(app || null);
  }, []);

  const selectedAppCommissionRate = getTargetCommissionRate(selectedTargetApp?.unitPrice);

  return (
    <div className="mx-auto max-w-4xl space-y-4 text-[var(--color-text)] sm:space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-indigo-300/25 bg-[radial-gradient(24rem_circle_at_8%_-50%,rgb(34_211_238/0.18),transparent_58%),linear-gradient(135deg,#111a3b,#0b1228)] px-4 py-4 shadow-[0_22px_60px_-42px_rgb(79_70_229/0.72)] sm:px-5 dark:border-indigo-300/25">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-[linear-gradient(180deg,#22d3ee,#6366f1,#a78bfa)]" />
        <div className="flex items-center gap-4">
        {selectedTargetApp ? (
          <div className="min-w-0 flex-1 space-y-2">
            <button
              type="button"
              onClick={() => setWithdrawalInfoRequest((current) => current + 1)}
              className="group flex w-full items-center justify-center gap-3 rounded-xl px-1 py-1 text-start transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.06)]"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.45)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] shadow-[0_12px_28px_-18px_rgb(var(--color-primary-rgb)/0.9)]">
                {selectedTargetApp.image ? (
                  <img src={resolveImageUrl(selectedTargetApp.image)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[var(--color-primary)]"><Target className="h-5 w-5" /></span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-center">
                <span className="block whitespace-nowrap bg-[linear-gradient(90deg,#f2c94c,#fff1a6,#d4a52c)] bg-clip-text text-[clamp(0.72rem,3.4vw,0.95rem)] font-black leading-5 text-transparent transition group-hover:brightness-125">
                  اضغط هنا للاطلاع على بيانات السحب
                </span>
                <span className="mt-0.5 block whitespace-nowrap text-[9px] font-semibold text-[var(--color-text-secondary)]">اضغط على البطاقة لعرض آيدي السحب ومدة التنفيذ</span>
              </div>
              <ChevronLeft className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <h1 className="bg-[linear-gradient(90deg,#ffffff,#dbeafe_48%,#67e8f9)] bg-clip-text text-xl font-black tracking-tight text-transparent drop-shadow-[0_4px_14px_rgb(103_232_249/0.18)] sm:text-2xl">بيع التارجت</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">اختر التطبيق وابدأ طلبك</p>
          </div>
        )}
        {!selectedTargetApp ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] px-3 text-cyan-200 shadow-none hover:bg-cyan-300/[0.15] sm:px-4"
            onClick={() => navigate('/target-orders')}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">طلباتي السابقة</span>
            <span className="sm:hidden">طلباتي</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : null}
        </div>
      </header>

      {selectedTargetApp ? (
        <div className="grid grid-cols-2 gap-2" dir="rtl">
          <div className="rounded-xl border border-emerald-300/45 bg-[linear-gradient(145deg,rgb(8_67_51/0.92),rgb(7_34_31/0.92))] px-3 py-2.5 text-center shadow-[0_14px_30px_-24px_rgb(16_185_129/0.8)]">
            <p className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-200/80">سعر الصرف</p>
            <strong className="mt-0.5 block text-xs font-black text-emerald-700 dark:text-emerald-300">{TARGET_BASE_EXCHANGE_RATE} EGP / دولار</strong>
          </div>
          <div className="rounded-xl border border-cyan-300/45 bg-[linear-gradient(145deg,rgb(8_64_91/0.92),rgb(12_31_61/0.92))] px-3 py-2.5 text-center shadow-[0_14px_30px_-24px_rgb(34_211_238/0.8)]">
            <p className="text-[10px] font-bold text-cyan-700/80 dark:text-cyan-100/80">نسبة العمولة</p>
            <strong className="mt-0.5 block text-xs font-black text-cyan-700 dark:text-cyan-300">{formatNumber(selectedAppCommissionRate, 'en-US', { maximumFractionDigits: 2 })}%</strong>
          </div>
        </div>
      ) : null}

      <TargetForm
        products={products}
        paymentMethods={paymentMethods}
        onSubmit={handleSubmit}
        onSelectedAppChange={handleSelectedAppChange}
        withdrawalInfoRequest={withdrawalInfoRequest}
        backToAppsRequest={backToAppsRequest}
      />

      <TargetOrderSuccessModal
        isOpen={Boolean(submittedOrder)}
        onClose={() => setSubmittedOrder(null)}
        order={submittedOrder}
        onViewOrders={() => {
          setSubmittedOrder(null);
          navigate('/target-orders');
        }}
      />
    </div>
  );
};

export default BuyTarget;

