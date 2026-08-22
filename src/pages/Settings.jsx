import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  Coins,
  CreditCard,
  ExternalLink,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Palette,
  Shield,
  SlidersHorizontal,
  User2,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingsSection from '../components/settings/SettingsSection';
import SettingsItem from '../components/settings/SettingsItem';
import ConfirmDialog from '../components/account/ConfirmDialog';
import Button, { cn } from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ui/Toast';
import useAuthStore from '../store/useAuthStore';

const SETTINGS_PREFS_KEY = 'kanz-coins-settings-prefs-v1';

const AdminToolCard = ({ icon: Icon, title, description, action, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex min-h-[9.5rem] flex-col justify-between rounded-[1.15rem] border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.94),rgb(var(--color-elevated-rgb)/0.72))] p-4 text-start shadow-[var(--shadow-subtle)] transition-colors hover:border-[color:rgb(var(--color-primary-rgb)/0.34)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
  >
    <div>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-black text-[var(--color-text)]">{title}</h3>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">{description}</p>
    </div>
    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)]">
      {action}
      <ExternalLink className="h-3.5 w-3.5" />
    </span>
  </button>
);

const PreferenceRow = ({ title, description, children }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-elevated-rgb)/0.58)] px-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{description}</p> : null}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [notifications, setNotifications] = useState({
    orders: true,
    balance: true,
    offers: false
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // No localStorage persistence: keep settings in-memory only for this session.

  const isEnglish = language === 'en';
  const text = useMemo(
    () =>
      isEnglish
        ? {
            title: isAdmin ? 'Admin Settings' : 'Settings',
            subtitle: isAdmin ? 'Manage dashboard preferences and admin shortcuts' : 'Control your preferences and account configuration',
            accountSection: isAdmin ? 'Admin Tools' : 'Account',
            accountSectionDescription: isAdmin ? 'Quick links for the main admin dashboard areas' : 'Manage your personal profile and account details',
            myAccount: 'My Account',
            myAccountDescription: 'View and edit your account data',
            dashboardOverview: 'Dashboard Home',
            dashboardOverviewDescription: 'Return to the main admin dashboard',
            usersManager: 'Users Management',
            usersManagerDescription: 'Manage customers, balances, and account actions',
            paymentsManager: 'Payment Methods',
            paymentsManagerDescription: 'Manage grouped payment methods and transfer options',
            topupsManager: 'Payment Requests',
            topupsManagerDescription: 'Review transfer confirmations and top-up operations',
            currenciesManager: 'Currencies',
            currenciesManagerDescription: 'Manage enabled currencies and defaults',
            languageSection: 'Language',
            languageSectionDescription: 'Choose your preferred application language',
            appearanceSection: 'Appearance',
            appearanceSectionDescription: 'Customize your app look and visual theme',
            darkMode: 'Dark mode',
            darkModeDescription: 'Use premium dark look across the app',
            notificationsSection: 'Notifications',
            notificationsSectionDescription: 'Select which alerts you would like to receive',
            notificationsOrders: 'Orders notifications',
            notificationsBalance: 'Balance notifications',
            notificationsOffers: 'Offers notifications',
            securitySection: 'Security',
            securitySectionDescription: 'Quick actions for password and security controls',
            changePassword: 'Change password',
            changePasswordDescription: 'Open account security panel to update password',
            twoFactor: 'Two-factor authentication',
            twoFactorDescription: 'Enable or disable email OTP protection',
            logoutAllDevices: 'Sign out from all devices',
            logoutAllDevicesDescription: 'Placeholder action until backend session APIs are connected',
            logoutAccount: 'Log out',
            logoutAccountDescription: 'Securely sign out from this account and return to the login screen',
            logoutAccountAction: 'Sign out now',
            logoutConfirmTitle: 'Logout',
            logoutConfirmDescription: 'Do you want to logout?',
            confirm: 'Confirm',
            cancel: 'Cancel',
            open: 'Open',
            active: 'Active',
            simulatedActionDone: 'Placeholder action executed. Connect backend endpoint later.',
            arabic: 'Arabic',
            english: 'English'
          }
        : {
            title: isAdmin ? 'إعدادات الأدمن' : 'الإعدادات',
            subtitle: isAdmin ? 'تحكم في تفضيلات لوحة الإدارة والاختصارات السريعة' : 'تحكم في تفضيلاتك وإعدادات حسابك',
            accountSection: isAdmin ? 'أدوات الإدارة' : 'الحساب',
            accountSectionDescription: isAdmin ? 'اختصارات سريعة لأهم أقسام لوحة الأدمن' : 'إدارة بياناتك الشخصية وإعدادات الحساب',
            myAccount: 'حسابي',
            myAccountDescription: 'عرض وتعديل بيانات حسابك',
            dashboardOverview: 'الرئيسية',
            dashboardOverviewDescription: 'الرجوع إلى الصفحة الرئيسية للوحة الأدمن',
            usersManager: 'إدارة المستخدمين',
            usersManagerDescription: 'إدارة العملاء والأرصدة وإجراءات الحساب',
            paymentsManager: 'طرق الدفع',
            paymentsManagerDescription: 'إدارة مجموعات الدفع ووسائل التحويل',
            topupsManager: 'طلبات الدفع',
            topupsManagerDescription: 'مراجعة تأكيدات التحويل وطلبات الشحن',
            currenciesManager: 'العملات',
            currenciesManagerDescription: 'إدارة العملات المفعلة والافتراضية',
            languageSection: 'اللغة',
            languageSectionDescription: 'اختر لغة التطبيق المفضلة لديك',
            appearanceSection: 'المظهر',
            appearanceSectionDescription: 'تحكم في شكل التطبيق وتجربة العرض',
            darkMode: 'الوضع الداكن',
            darkModeDescription: 'استخدام الواجهة الداكنة داخل التطبيق',
            notificationsSection: 'الإشعارات',
            notificationsSectionDescription: 'حدد الإشعارات التي تريد استقبالها',
            notificationsOrders: 'إشعارات الطلبات',
            notificationsBalance: 'إشعارات الرصيد',
            notificationsOffers: 'إشعارات العروض',
            securitySection: 'الأمان',
            securitySectionDescription: 'اختصارات لتغيير كلمة المرور وضبط الحماية',
            changePassword: 'تغيير كلمة المرور',
            changePasswordDescription: 'فتح قسم الأمان في صفحة حسابي لتحديث كلمة المرور',
            twoFactor: 'المصادقة الثنائية',
            twoFactorDescription: 'تفعيل أو تعطيل التحقق برمز البريد الإلكتروني',
            logoutAllDevices: 'تسجيل الخروج من كل الأجهزة',
            logoutAllDevicesDescription: 'إجراء تجريبي حتى يتم ربط واجهات الجلسات في الـ Backend',
            logoutAccount: 'تسجيل الخروج',
            logoutAccountDescription: 'الخروج الآمن من هذا الحساب والرجوع إلى صفحة تسجيل الدخول',
            logoutAccountAction: 'تسجيل الخروج الآن',
            logoutConfirmTitle: 'تسجيل الخروج',
            logoutConfirmDescription: 'هل تريد تسجيل الخروج؟',
            confirm: 'موافق',
            cancel: 'إلغاء',
            open: 'فتح',
            active: 'مفعل',
            simulatedActionDone: 'تم تنفيذ إجراء تجريبي. اربطه لاحقًا بواجهة الخلفية.',
            arabic: 'العربية',
            english: 'English'
          },
    [isAdmin, isEnglish]
  );

  const handlePlaceholderSecurityAction = () => {
    addToast(text.simulatedActionDone, 'info');
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/auth');
  };

  const openFromSettings = (to) => navigate(to, { state: { fromSettings: true } });

  const adminTools = [
    {
      icon: LayoutDashboard,
      title: text.dashboardOverview,
      description: text.dashboardOverviewDescription,
      to: '/admin/dashboard',
    },
    {
      icon: Users,
      title: text.usersManager,
      description: text.usersManagerDescription,
      to: '/admin/users',
    },
    {
      icon: CreditCard,
      title: text.paymentsManager,
      description: text.paymentsManagerDescription,
      to: '/admin/payment-methods',
    },
    {
      icon: Bell,
      title: text.topupsManager,
      description: text.topupsManagerDescription,
      to: '/admin/payments',
    },
    {
      icon: Coins,
      title: text.currenciesManager,
      description: text.currenciesManagerDescription,
      to: '/admin/currencies',
    },
    {
      icon: User2,
      title: text.myAccount,
      description: text.myAccountDescription,
      to: '/account',
    },
  ];

  const notificationItems = [
    { key: 'orders', label: text.notificationsOrders },
    { key: 'balance', label: text.notificationsBalance },
    { key: 'offers', label: text.notificationsOffers }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[1.35rem] border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[radial-gradient(34rem_circle_at_top_right,rgb(var(--color-primary-rgb)/0.16),transparent_45%),linear-gradient(180deg,rgb(var(--color-card-rgb)/0.96),rgb(var(--color-elevated-rgb)/0.76))] p-5 shadow-[var(--shadow-subtle)]"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isAdmin ? text.accountSection : text.title}
            </p>
            <h1 className="mt-3 text-2xl font-black text-[var(--color-text)] sm:text-3xl">{text.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">{text.subtitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[1rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-card-rgb)/0.64)] p-2 text-center">
            <div className="rounded-xl bg-[color:rgb(var(--color-surface-rgb)/0.54)] px-3 py-2">
              <p className="text-[10px] font-bold text-[var(--color-muted)]">{text.languageSection}</p>
              <p className="mt-1 text-sm font-black text-[var(--color-text)]">{language === 'ar' ? text.arabic : text.english}</p>
            </div>
            <div className="rounded-xl bg-[color:rgb(var(--color-surface-rgb)/0.54)] px-3 py-2">
              <p className="text-[10px] font-bold text-[var(--color-muted)]">{text.appearanceSection}</p>
              <p className="mt-1 text-sm font-black text-[var(--color-text)]">{isDark ? text.darkMode : (isEnglish ? 'Light' : 'فاتح')}</p>
            </div>
            <div className="rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-3 py-2">
              <p className="text-[10px] font-bold text-[var(--color-primary)]">{text.notificationsSection}</p>
              <p className="mt-1 text-sm font-black text-[var(--color-primary)]">
                {Object.values(notifications).filter(Boolean).length}/3
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SettingsSection
          icon={isAdmin ? LayoutDashboard : User2}
          title={text.accountSection}
          description={text.accountSectionDescription}
          className="p-4 sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(isAdmin ? adminTools : adminTools.slice(-1)).map((item) => (
              <AdminToolCard
                key={item.to}
                icon={item.icon}
                title={item.title}
                description={item.description}
                action={text.open}
                onClick={() => openFromSettings(item.to)}
              />
            ))}
          </div>
        </SettingsSection>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SettingsSection icon={SlidersHorizontal} title={isEnglish ? 'Preferences' : 'التفضيلات'} description={isEnglish ? 'Language, appearance, and alerts in one place' : 'اللغة والمظهر والإشعارات في مكان واحد'}>
            <PreferenceRow title={text.languageSection} description={text.languageSectionDescription}>
              <div className="grid w-[180px] grid-cols-2 gap-1 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.8)] bg-[color:rgb(var(--color-surface-rgb)/0.42)] p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={language === 'ar' ? 'primary' : 'ghost'}
                  className={cn('h-8 px-2 text-xs motion-safe:hover:translate-y-0 active:scale-100', language !== 'ar' && 'text-[var(--color-text-secondary)]')}
                  onClick={() => setLanguage('ar')}
                >
                  {text.arabic}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={language === 'en' ? 'primary' : 'ghost'}
                  className={cn('h-8 px-2 text-xs motion-safe:hover:translate-y-0 active:scale-100', language !== 'en' && 'text-[var(--color-text-secondary)]')}
                  onClick={() => setLanguage('en')}
                >
                  {text.english}
                </Button>
              </div>
            </PreferenceRow>

            <PreferenceRow title={text.darkMode} description={text.darkModeDescription}>
              <Switch checked={isDark} onChange={toggleTheme} />
            </PreferenceRow>

            <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-elevated-rgb)/0.58)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--color-primary)]" />
                <p className="text-sm font-bold text-[var(--color-text)]">{text.notificationsSection}</p>
              </div>
              <div className="space-y-2">
                {notificationItems.map((item) => (
                  <PreferenceRow key={item.key} title={item.label}>
                    <Switch
                      checked={Boolean(notifications[item.key])}
                      onChange={(checked) =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: checked
                        }))
                      }
                    />
                  </PreferenceRow>
                ))}
              </div>
            </div>
          </SettingsSection>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SettingsSection icon={Shield} title={text.securitySection} description={text.securitySectionDescription}>
            <SettingsItem
              icon={KeyRound}
              title={text.changePassword}
              description={text.changePasswordDescription}
              action={text.open}
              onClick={() => openFromSettings('/account#password')}
            />
            <SettingsItem
              icon={Shield}
              title={text.twoFactor}
              description={text.twoFactorDescription}
              action={text.open}
              onClick={() => openFromSettings('/account-security')}
            />
            <SettingsItem
              icon={CheckCircle2}
              title={text.logoutAllDevices}
              description={text.logoutAllDevicesDescription}
              action={text.active}
              destructive
              onClick={handlePlaceholderSecurityAction}
            />
          </SettingsSection>
        </motion.section>
      </div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="group relative w-full overflow-hidden rounded-2xl border border-rose-300/55 bg-gradient-to-br from-rose-500/14 via-[color:rgb(var(--color-card-rgb)/0.94)] to-orange-400/10 px-4 py-4 text-right shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-rose-400/70 hover:shadow-[var(--shadow-lg)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.18),transparent_42%)] opacity-80" />
          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-300/45 bg-rose-500/14 text-rose-600 dark:text-rose-200">
              <LogOut className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-100">{text.logoutAccount}</p>
              <p className="mt-1 text-xs text-rose-600/90 dark:text-rose-100/75">{text.logoutAccountDescription}</p>
            </div>

            <span className="shrink-0 rounded-full border border-rose-300/45 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-700 transition-colors group-hover:bg-rose-500/16 dark:text-rose-100">
              {text.logoutAccountAction}
            </span>
          </div>
        </button>
      </motion.section>

      <ConfirmDialog
        open={showLogoutConfirm}
        title={text.logoutConfirmTitle}
        description={text.logoutConfirmDescription}
        confirmLabel={text.confirm}
        cancelLabel={text.cancel}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

export default Settings;
