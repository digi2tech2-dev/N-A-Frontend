import React, { useCallback, useEffect, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TargetForm from '../components/target/TargetForm';
import Button from '../components/ui/Button';
import useAuthStore from '../store/useAuthStore';
import useTargetStore from '../store/useTargetStore';
import useSystemStore from '../store/useSystemStore';
import { useToast } from '../components/ui/Toast';
import { getTargetPaymentMethods, isPaymentMethodAllowed } from '../utils/paymentSettings';
import targetHeroImage from '../assets/تارجت.jpg';

const TARGET_DATA_REFRESH_INTERVAL = 15 * 1000;

const BuyTarget = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { products, loadApps, submitRequest } = useTargetStore();
  const { paymentSettings, loadPaymentSettings } = useSystemStore();
  const { addToast } = useToast();

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
      return;
    }

    if (!isStillAllowed) {
      addToast('طريقة الدفع لم تعد متاحة لهذا التطبيق. تم تحديث البيانات من السيرفر.', 'error');
      return;
    }

    await submitRequest({
      ...payload,
      appId: freshApp.id,
      paymentMethodId: selectedMethod.id,
      paymentMethod: selectedMethod.name,
      userId: user?.id || '',
      userName: user?.name || user?.fullName || '',
      userEmail: user?.email || '',
    });
    addToast('تم إرسال طلب التارجت بنجاح.', 'success');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 text-[var(--color-text)]">
      <section className="relative mx-auto aspect-[2048/752] w-full max-w-2xl overflow-hidden rounded-[0.8rem] border border-[color:rgb(var(--color-border-rgb)/0.58)] bg-[var(--color-card)] shadow-[0_18px_46px_-32px_rgb(0_0_0/0.82)] sm:w-[58%] sm:rounded-[1.2rem]">
        <img
          src={targetHeroImage}
          alt="بيع تارجت"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="block h-full w-full object-cover"
        />
      </section>

      <TargetForm products={products} paymentMethods={paymentMethods} onSubmit={handleSubmit} />
      <section className="rounded-[1.5rem] border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[linear-gradient(135deg,rgb(var(--color-card-rgb)/0.92),rgb(var(--color-surface-rgb)/0.68))] p-4 shadow-[0_22px_62px_-48px_rgb(var(--color-primary-rgb)/0.34)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-[var(--color-text)]">طلبات التارجت السابقة</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                تابع حالة طلباتك وافتح تفاصيل كل طلب من سجل مستقل.
              </p>
            </div>
          </div>

          <Button type="button" className="h-10 rounded-xl px-4 text-sm" onClick={() => navigate('/target-orders')}>
            <ClipboardList className="h-4 w-4" />
            عرض طلباتي
          </Button>
        </div>
      </section>
    </div>
  );
};

export default BuyTarget;
