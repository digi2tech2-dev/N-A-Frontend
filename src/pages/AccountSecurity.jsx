import React, { useMemo } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import TwoFactorCard from '../components/account/TwoFactorCard';
import useAuthStore from '../store/useAuthStore';
import { useLanguage } from '../context/LanguageContext';

const AccountSecurity = () => {
  const { user } = useAuthStore();
  const { language, dir } = useLanguage();
  const isEnglish = language === 'en';
  const isRTL = dir === 'rtl';

  const text = useMemo(
    () =>
      isEnglish
        ? {
            title: 'Account Protection',
            subtitle: 'Manage advanced security settings for your account.',
            securityOverview: 'Security Overview',
            securityHint: 'Keep two-factor authentication enabled to protect your account from unauthorized access.',
            whyMatters: 'Why Account Security Matters',
            protection: 'Account Protection',
            protectionDesc: 'Your account contains sensitive information and financial data. Enabling security features helps prevent unauthorized access.',
            dataPrivacy: 'Data Privacy',
            dataPrivacyDesc: 'Control how your personal information is used and protect it from third-party access.',
            monitoring: 'Activity Monitoring',
            monitoringDesc: 'Monitor your account activity and get alerts about unusual login attempts.',
          }
        : {
            title: 'حماية الحساب',
            subtitle: 'إدارة إعدادات الأمان المتقدمة الخاصة بحسابك.',
            securityOverview: 'ملخص الأمان',
            securityHint: 'الحفاظ على تفعيل المصادقة الثنائية يساعد في حماية حسابك من الوصول غير المصرح به.',
            whyMatters: 'لماذا يهم أمان الحساب',
            protection: 'حماية الحساب',
            protectionDesc: 'يحتوي حسابك على معلومات حساسة وبيانات مالية. تفعيل ميزات الأمان يساعد في منع الوصول غير المصرح به.',
            dataPrivacy: 'خصوصية البيانات',
            dataPrivacyDesc: 'تحكم في كيفية استخدام معلوماتك الشخصية وحمايتها من الوصول من طرف ثالث.',
            monitoring: 'مراقبة النشاط',
            monitoringDesc: 'راقب نشاط حسابك واحصل على تنبيهات حول محاولات تسجيل دخول غير عادية.',
          },
    [isEnglish]
  );

  return (
    <div className={`min-h-screen bg-gray-50 pb-6 dark:bg-gray-950 sm:pb-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={dir}>
      <div
        className="mx-auto w-full max-w-3xl space-y-3 px-3 sm:px-4 sm:space-y-4"
      >
        {/* Hero Header */}
        <header
          className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white dark:bg-white dark:text-gray-950"
            >
              <Shield className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                {text.securityOverview}
              </div>
              <h1 className="mt-1 text-xl font-black text-gray-950 sm:text-2xl dark:text-white">
                {text.title}
              </h1>
              <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-gray-500 sm:text-sm dark:text-gray-400">
                {text.subtitle}
              </p>
            </div>
          </div>
        </header>

        {/* Security Alert Card */}
        <div
          className="rounded-[16px] border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/20"
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"
            >
              <AlertCircle className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold leading-5 text-amber-950 dark:text-amber-200">
                {text.securityHint}
              </h3>
              <p className="mt-1 text-xs font-medium leading-5 text-amber-900/70 dark:text-amber-300/70">
                {isEnglish 
                  ? 'Enable two-factor authentication to add an extra layer of security to your account.'
                  : 'فعّل المصادقة الثنائية لإضافة طبقة أمان إضافية لحسابك.'}
              </p>
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication Card */}
        <div>
          <TwoFactorCard
            userId={user?.id}
            email={String(user?.email || '')}
            twoFactorEnabled={Boolean(user?.twoFactorEnabled ?? user?.isTwoFactorEnabled)}
            emailChangedPending={false}
          />
        </div>

      </div>
    </div>
  );
};

export default AccountSecurity;
