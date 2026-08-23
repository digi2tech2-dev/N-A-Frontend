import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  Home,
  Inbox,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MailCheck,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import useAuthStore from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import apiClient from '../../services/client';
import {
  getAccountAccessRoute,
  getAccountStatusBadgeVariant,
  getAccountStatusLabel,
  isApprovedAccountStatus,
  isVerificationRequiredStatus,
  normalizeAccountStatus,
} from '../../utils/accountStatus';
import { getDefaultRouteForRole } from '../../utils/authRoles';
import { useToast } from '../ui/Toast';
import { resolveUserAvatar } from '../../utils/avatar';
import { formatAuthErrorMessage } from '../../utils/authErrorMessages';
import OtpInput from '../account/OtpInput';

const ACCOUNT_UI = {
  pending: {
    icon: Clock3,
    title: 'تم إنشاء الحساب',
    description: 'تم استلام بيانات حسابك بنجاح. يمكنك الرجوع لتسجيل الدخول أو تحديث حالة الحساب لاحقًا.',
    badge: 'تم التسجيل',
    accent:
      'border-[color:rgb(var(--color-warning-rgb)/0.22)] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_55%),rgba(255,255,255,0.82)] text-[var(--color-warning)] dark:bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_52%),rgba(15,23,42,0.9)]',
  },
  rejected: {
    icon: ShieldX,
    title: 'تم رفض الحساب',
    description: 'عذرًا، هذا الحساب غير متاح حاليًا.',
    badge: 'مرفوض',
    accent:
      'border-[color:rgb(var(--color-error-rgb)/0.22)] bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.16),transparent_55%),rgba(255,255,255,0.82)] text-[var(--color-error)] dark:bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.14),transparent_52%),rgba(15,23,42,0.9)]',
  },
  verification: {
    icon: Mail,
    title: 'تأكيد البريد الإلكتروني',
    description: 'أرسلنا كود تأكيد من 4 أرقام إلى بريدك الإلكتروني. أدخل الكود لإكمال تفعيل الحساب.',
    badge: 'تأكيد البريد مطلوب',
    accent:
      'border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_55%),rgba(255,255,255,0.82)] text-[var(--color-primary)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_52%),rgba(15,23,42,0.9)]',
  },
  approved: {
    icon: CheckCircle2,
    title: 'تم تفعيل الحساب',
    description: 'حسابك جاهز. يمكنك الآن الدخول والمتابعة إلى المنصة مباشرة.',
    badge: 'جاهز للدخول',
    accent:
      'border-[color:rgb(var(--color-success-rgb)/0.22)] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_55%),rgba(255,255,255,0.82)] text-[var(--color-success)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_52%),rgba(15,23,42,0.9)]',
  },
};

const AccountAccessState = ({ variant = 'pending' }) => {
  const navigate = useNavigate();
  const { dir } = useLanguage();
  const { addToast } = useToast();
  const { user, blockedStatus, blockedUser, refreshProfile, logout, clearBlockedAccess } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const lastSubmittedCodeRef = useRef('');
  const verificationRequestRef = useRef(false);

  const currentStatus = normalizeAccountStatus(user?.status || blockedStatus || variant);
  const isAccessReady = isApprovedAccountStatus(currentStatus) && user;
  const displayVariant = isAccessReady
    ? 'approved'
    : isVerificationRequiredStatus(currentStatus)
    ? 'verification'
    : currentStatus === 'rejected'
      ? 'rejected'
      : variant;
  const config = ACCOUNT_UI[displayVariant] || ACCOUNT_UI.pending;
  const Icon = config.icon;
  const activeUser = user || blockedUser || null;
  const showSignInShortcut = displayVariant === 'pending' && !user;
  const hasAccountEmail = Boolean(String(activeUser?.email || '').trim());
  const [helpEmail, setHelpEmail] = useState(() => String(activeUser?.email || '').trim());
  const normalizedHelpEmail = helpEmail.trim();
  const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(normalizedHelpEmail)}#spam`;

  useEffect(() => {
    const accountEmail = String(activeUser?.email || '').trim();
    if (accountEmail) setHelpEmail(accountEmail);
  }, [activeUser?.email]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    const email = normalizedHelpEmail || String(activeUser?.email || '').trim();
    if (!email) {
      addToast('اكتب البريد الإلكتروني لإرسال كود التأكيد.', 'error');
      return;
    }

    try {
      setIsResending(true);
      await apiClient.auth.resendVerification(email);
      setVerificationCode('');
      setVerificationError('');
      lastSubmittedCodeRef.current = '';
      setResendCooldown(45);
      addToast('تم إرسال كود تأكيد جديد إلى بريدك الإلكتروني.', 'success');
    } catch (error) {
      addToast(
        formatAuthErrorMessage(error, { action: 'resendCode' }),
        'error'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyEmailCode = async (event, submittedCode = verificationCode) => {
    event?.preventDefault?.();
    const email = normalizedHelpEmail || String(activeUser?.email || '').trim();
    const code = String(submittedCode || '').replace(/\D/g, '').slice(0, 4);

    if (!email) {
      setVerificationError('البريد الإلكتروني غير متاح. اكتبه في قسم المساعدة بالأسفل.');
      return;
    }
    if (code.length !== 4) {
      setVerificationError('أدخل كود التأكيد المكوّن من 4 أرقام.');
      return;
    }
    if (verificationRequestRef.current) return;

    try {
      verificationRequestRef.current = true;
      setIsVerifying(true);
      setVerificationError('');
      await apiClient.auth.verifyEmailCode({ email, code });
      addToast('تم تأكيد بريدك الإلكتروني بنجاح. يمكنك تسجيل الدخول الآن.', 'success');
      clearBlockedAccess?.();
      navigate('/auth?verified=1', { replace: true });
    } catch (error) {
      lastSubmittedCodeRef.current = '';
      setVerificationError(formatAuthErrorMessage(error, { action: 'verifyCode' }));
    } finally {
      verificationRequestRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;

    setIsRefreshing(true);
    const profile = await refreshProfile();
    setIsRefreshing(false);

    const nextStatus = normalizeAccountStatus(profile?.status || user?.status);
    const nextRoute = getAccountAccessRoute(nextStatus);

    if (nextRoute) {
      navigate(nextRoute, { replace: true });
      return;
    }

    navigate(getDefaultRouteForRole(profile?.role || user?.role), { replace: true });
  };

  if (displayVariant === 'verification') {
    const helpSteps = [
      {
        icon: LogIn,
        title: 'افتح Gmail بالحساب الصحيح',
        description: 'استخدم البريد نفسه الظاهر أعلى الصفحة.',
        tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200',
      },
      {
        icon: Inbox,
        title: 'راجع Inbox',
        description: 'ابحث عن أحدث رسالة من N&A HUB.',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200',
      },
      {
        icon: Search,
        title: 'ابحث في Spam',
        description: 'قد ينقل Gmail رسالة الكود إلى الرسائل غير المرغوب فيها.',
        tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200',
      },
      {
        icon: KeyRound,
        title: 'انسخ أحدث كود',
        description: 'ارجع إلى الخانات بالأعلى واكتب الأرقام الأربعة.',
        tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-200',
      },
    ];

    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f8f7ff] px-4 py-8 text-slate-900 dark:bg-[#080714] dark:text-white sm:py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-violet-300/35 blur-3xl dark:bg-violet-700/20" />
          <div className="absolute -left-28 top-[28rem] h-80 w-80 rounded-full bg-pink-300/30 blur-3xl dark:bg-fuchsia-700/15" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-700/10" />
        </div>

        <main className="relative z-10 mx-auto w-full max-w-6xl">
          <motion.section
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
            className="mx-auto max-w-lg overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-[0_28px_75px_-35px_rgba(76,29,149,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-[#121021]/92 dark:shadow-[0_30px_85px_-35px_rgba(139,92,246,0.35)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400" />
            <div className="p-5 sm:p-8">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.65rem] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-400 text-white shadow-[0_18px_35px_-16px_rgba(192,38,211,0.75)]">
                  <MailCheck className="h-9 w-9" />
                </div>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700 dark:bg-violet-400/10 dark:text-violet-200">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500" />
                  خطوة أخيرة لتفعيل حسابك
                </div>
                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">أدخل كود تأكيد البريد</h1>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-300">
                  {hasAccountEmail
                    ? 'أرسلنا كودًا مكوّنًا من 4 أرقام إلى بريدك الإلكتروني. أدخل الكود بالأسفل لتأكيد الحساب.'
                    : 'اكتب البريد الإلكتروني الذي سجلت به، ثم اطلب كود التأكيد وأدخله بالأسفل.'}
                </p>
                {hasAccountEmail ? (
                  <div dir="ltr" className="mx-auto mt-4 flex w-fit max-w-full items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2 text-sm font-bold text-violet-700 dark:border-violet-400/15 dark:bg-violet-400/10 dark:text-violet-200">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{normalizedHelpEmail}</span>
                  </div>
                ) : (
                  <div className="mx-auto mt-5 max-w-sm text-right">
                    <label htmlFor="verification-main-email" className="mb-2 block text-xs font-extrabold text-slate-600 dark:text-slate-300">
                      البريد الإلكتروني المستخدم في التسجيل
                    </label>
                    <div className="relative" dir="ltr">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                      <input
                        id="verification-main-email"
                        type="email"
                        value={helpEmail}
                        onChange={(event) => {
                          setHelpEmail(event.target.value);
                          if (verificationError) setVerificationError('');
                        }}
                        placeholder="name@example.com"
                        autoComplete="email"
                        autoFocus
                        className="h-12 w-full rounded-xl border border-violet-200 bg-white px-10 text-left text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:focus:ring-fuchsia-400/10"
                      />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerifyEmailCode} className="mt-7">
                <label className="mb-3 block text-center text-xs font-extrabold text-slate-500 dark:text-slate-300">
                  كود التأكيد
                </label>
                <OtpInput
                  length={4}
                  value={verificationCode}
                  onChange={(value) => {
                    const nextCode = value.replace(/\D/g, '').slice(0, 4);
                    setVerificationCode(nextCode);
                    if (verificationError) setVerificationError('');
                    if (nextCode.length < 4) {
                      lastSubmittedCodeRef.current = '';
                      return;
                    }
                    if (!isVerifying && lastSubmittedCodeRef.current !== nextCode) {
                      lastSubmittedCodeRef.current = nextCode;
                      window.setTimeout(() => handleVerifyEmailCode(null, nextCode), 120);
                    }
                  }}
                  disabled={isVerifying}
                  className="justify-center gap-3 [&>input]:h-16 [&>input]:w-14 [&>input]:rounded-2xl [&>input]:border-violet-200 [&>input]:bg-violet-50/70 [&>input]:text-2xl [&>input]:text-violet-800 [&>input]:shadow-none focus-within:[&>input]:border-fuchsia-400 dark:[&>input]:border-white/10 dark:[&>input]:bg-white/[0.055] dark:[&>input]:text-white sm:[&>input]:h-[4.5rem] sm:[&>input]:w-16"
                />

                {verificationError && (
                  <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold leading-5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    {verificationError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || verificationCode.length !== 4}
                  className="mt-5 flex h-13 min-h-[3.4rem] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 px-5 text-sm font-black text-white shadow-[0_16px_35px_-16px_rgba(192,38,211,0.75)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  {isVerifying ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <MailCheck className="h-5 w-5" />}
                  {isVerifying ? 'جاري تأكيد الكود...' : 'تأكيد وتفعيل الحساب'}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>لم يصلك الكود؟</span>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending || resendCooldown > 0 || !normalizedHelpEmail}
                  className="font-black text-violet-700 transition hover:text-fuchsia-600 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-violet-300 dark:hover:text-fuchsia-300"
                >
                  {isResending
                    ? 'جاري إرسال كود جديد...'
                    : resendCooldown > 0
                      ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                      : hasAccountEmail
                        ? 'إرسال كود جديد'
                        : normalizedHelpEmail
                          ? 'إرسال كود التأكيد'
                          : 'اكتب البريد لإرسال الكود'}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 border-t border-slate-100 pt-5 dark:border-white/10">
                <Link
                  to="/"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-extrabold text-slate-700 transition hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <Home className="h-4 w-4" />
                  الصفحة الرئيسية
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/auth', { replace: true });
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 text-xs font-extrabold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-7 overflow-hidden rounded-[2rem] border border-white bg-white/85 shadow-[0_30px_75px_-42px_rgba(76,29,149,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-[#11101e]/90"
            aria-labelledby="verification-help-title"
          >
            <div className="grid lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)]" dir="ltr">
              <div className="relative order-2 min-h-[32rem] overflow-hidden border-t border-slate-100 bg-[#fafafa] dark:border-white/10 lg:order-1 lg:min-h-[42rem] lg:border-e lg:border-t-0">
                <img
                  src="/assets/gmail-spam-help.png"
                  alt="مكان مجلد Spam في القائمة الجانبية داخل Gmail"
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
              </div>

              <div className="order-1 p-5 text-right sm:p-8 lg:order-2 lg:p-10" dir="rtl">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                  <CircleHelp className="h-4 w-4" />
                  لم يصل الكود؟
                </div>
                <h2 id="verification-help-title" className="mt-4 text-2xl font-black sm:text-3xl">اعثر على رسالة التأكيد بسهولة</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-300">
                  اتبع الخطوات التالية، واستخدم دائمًا أحدث كود وصلك لأن طلب كود جديد يلغي الكود السابق.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {helpSteps.map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <article key={step.title} className={`rounded-2xl border p-4 ${step.tone}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/75 shadow-sm dark:bg-white/10">
                            <StepIcon className="h-4.5 w-4.5" />
                          </span>
                          <span className="text-xs font-black opacity-60">0{index + 1}</span>
                        </div>
                        <h3 className="mt-3 text-sm font-black">{step.title}</h3>
                        <p className="mt-1 text-xs leading-6 opacity-80">{step.description}</p>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/65 p-4 dark:border-violet-400/15 dark:bg-violet-400/[0.07]">
                  <label htmlFor="verification-help-email" className="mb-2 block text-xs font-extrabold text-violet-800 dark:text-violet-200">
                    البريد المستخدم في التسجيل
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row" dir="ltr">
                    <div className="relative min-w-0 flex-1">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                      <input
                        id="verification-help-email"
                        type="email"
                        value={helpEmail}
                        onChange={(event) => setHelpEmail(event.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        className="h-12 w-full rounded-xl border border-violet-200 bg-white px-10 text-left text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-fuchsia-400/10"
                      />
                    </div>
                    <a
                      href={normalizedHelpEmail ? gmailUrl : undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!normalizedHelpEmail}
                      onClick={(event) => {
                        if (normalizedHelpEmail) return;
                        event.preventDefault();
                        addToast('اكتب البريد الإلكتروني أولًا للانتقال إلى Gmail.', 'error');
                      }}
                      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white transition ${
                        normalizedHelpEmail
                          ? 'bg-slate-900 hover:-translate-y-0.5 hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-200'
                          : 'cursor-not-allowed bg-slate-400 opacity-60'
                      }`}
                    >
                      فتح Gmail
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.84),transparent_46%),linear-gradient(180deg,rgba(241,245,249,0.92),rgba(248,250,252,0.98))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))]" />
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.72),transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_68%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-6xl"
      >
        <Card variant="premium" className="mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-[color:rgb(var(--color-border-rgb)/0.84)] p-6 sm:p-8">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-card-rgb)/0.78)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
                displayVariant === 'approved'
                  ? 'bg-[var(--color-success)]'
                  : displayVariant === 'rejected'
                    ? 'bg-[var(--color-error)]'
                    : 'bg-[var(--color-warning)]'
              }`} />
              {config.badge}
            </div>

            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border shadow-[var(--shadow-subtle)] ${config.accent}`}>
              <Icon className="h-9 w-9" />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-[var(--color-text)] sm:text-3xl">
                {config.title}
              </h1>
              <p className="mx-auto max-w-lg text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {config.description}
              </p>
            </div>

            {activeUser && (
              <div className="rounded-[1.5rem] border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-4 text-start">
                <div className="flex items-center gap-3">
                  <img
                    src={resolveUserAvatar(activeUser, activeUser?.name || activeUser?.email || 'N&A HUB User')}
                    alt={activeUser?.name || 'User'}
                    className="h-12 w-12 rounded-full border border-[color:rgb(var(--color-border-rgb)/0.84)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {activeUser?.name || 'N&A HUB User'}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">
                      {activeUser?.email || 'account@kanz-coins.app'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    getAccountStatusBadgeVariant(currentStatus) === 'success'
                      ? 'bg-[color:rgb(var(--color-success-rgb)/0.14)] text-[var(--color-success)]'
                      : getAccountStatusBadgeVariant(currentStatus) === 'danger'
                      ? 'bg-[color:rgb(var(--color-error-rgb)/0.14)] text-[var(--color-error)]'
                      : 'bg-[color:rgb(var(--color-warning-rgb)/0.16)] text-[var(--color-warning)]'
                  }`}>
                    {getAccountStatusLabel(currentStatus)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {displayVariant === 'verification' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={isResending || !activeUser?.email}
                >
                  <Mail className="h-4 w-4" />
                  {isResending ? 'جاري إعادة الإرسال...' : 'إعادة إرسال كود التأكيد'}
                </Button>
              ) : isAccessReady ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => navigate(getDefaultRouteForRole(user?.role), { replace: true })}
                >
                  <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
                  دخول
                </Button>
              ) : showSignInShortcut ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    clearBlockedAccess?.();
                    navigate('/auth', { replace: true });
                  }}
                >
                  <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
                  دخول
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => navigate('/auth', { replace: true })}
                >
                  <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
                  دخول
                </Button>
              )}

              {user && !isAccessReady && displayVariant !== 'verification' && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'جاري تحديث الحالة...' : 'تحديث حالة الحساب'}
                </Button>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/" className="block">
                  <Button variant="secondary" className="w-full">
                    <Home className="h-4 w-4" />
                    العودة للصفحة الرئيسية
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    logout();
                    navigate('/auth', { replace: true });
                  }}
                >
                  <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {displayVariant === 'verification' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            aria-labelledby="verification-help-title"
            className="mt-7 overflow-hidden rounded-[2rem] border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(7,18,48,0.96),rgba(20,17,58,0.96)_55%,rgba(49,16,67,0.94))] shadow-[0_30px_80px_-42px_rgba(117,71,245,0.9)]"
          >
            <div className="grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]" dir="ltr">
              <div className="relative order-2 min-h-[28rem] overflow-hidden bg-white lg:order-1 lg:min-h-[43rem]">
                <img
                  src="/assets/gmail-spam-help.png"
                  alt="مكان مجلد Spam في القائمة الجانبية داخل Gmail"
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
              </div>

              <div className="order-1 flex flex-col justify-center p-5 text-right text-white sm:p-8 lg:order-2 lg:p-10" dir="rtl">
                <div className="mb-7">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
                    <CircleHelp className="h-4 w-4" />
                    لم يصل الكود؟ المساعدة
                  </div>
                  <h2 id="verification-help-title" className="text-2xl font-black leading-tight sm:text-3xl">
                    إذا لم يصل الكود، اتبع هذه الخطوات
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    افتح Gmail بالحساب نفسه الذي أنشأت به حسابك في المنصة، ثم ابحث عن رسالة التأكيد في البريد الوارد أو مجلد الرسائل غير المرغوب فيها.
                  </p>
                </div>

                <div className="mb-7 space-y-3">
                  {[
                    {
                      icon: LogIn,
                      title: 'افتح حساب Gmail الصحيح',
                      description: 'تأكد من تسجيل الدخول بنفس البريد الإلكتروني المستخدم عند إنشاء الحساب.',
                      color: 'from-cyan-400 to-blue-500',
                    },
                    {
                      icon: Inbox,
                      title: 'راجع البريد الوارد (Inbox)',
                      description: 'ابحث عن أحدث رسالة تأكيد مرسلة من N&A HUB.',
                      color: 'from-blue-500 to-violet-500',
                    },
                    {
                      icon: Search,
                      title: 'لم تجد الرسالة؟',
                      description: 'افتح القائمة الجانبية في Gmail وانتقل إلى مجلد Spam كما هو موضح في الصورة.',
                      color: 'from-violet-500 to-fuchsia-500',
                    },
                    {
                      icon: ShieldAlert,
                      title: 'افتح الرسالة وأكمل التأكيد',
                      description: 'افتح أحدث رسالة وانسخ كود التأكيد، ثم ارجع إلى المنصة.',
                      color: 'from-fuchsia-500 to-pink-500',
                    },
                  ].map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={step.title} className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 transition hover:border-cyan-300/25 hover:bg-white/[0.085] sm:p-4">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg shadow-violet-950/30`}>
                          <StepIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-wider text-cyan-300">{String(index + 1).padStart(2, '0')}</span>
                            <h3 className="text-sm font-extrabold sm:text-base">{step.title}</h3>
                          </div>
                          <p className="mt-1 text-xs leading-6 text-slate-300 sm:text-sm">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-violet-300/25 bg-black/20 p-4 sm:p-5">
                  <label htmlFor="verification-help-email" className="mb-2 block text-xs font-bold text-violet-100 sm:text-sm">
                    البريد الذي أنشأت به الحساب
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row" dir="ltr">
                    <div className="relative min-w-0 flex-1">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
                      <input
                        id="verification-help-email"
                        type="email"
                        value={helpEmail}
                        onChange={(event) => setHelpEmail(event.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        className="h-12 w-full rounded-xl border border-cyan-300/25 bg-slate-950/55 px-10 text-left text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/10"
                      />
                    </div>
                    <a
                      href={normalizedHelpEmail ? gmailUrl : undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!normalizedHelpEmail}
                      onClick={(event) => {
                        if (normalizedHelpEmail) return;
                        event.preventDefault();
                        addToast('اكتب البريد الإلكتروني أولًا للانتقال إلى Gmail.', 'error');
                      }}
                      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white transition ${
                        normalizedHelpEmail
                          ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 shadow-[0_12px_30px_-14px_rgba(37,99,235,0.9)] hover:-translate-y-0.5 hover:brightness-110'
                          : 'cursor-not-allowed bg-slate-700 opacity-60'
                      }`}
                    >
                      فتح Gmail
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    سيفتح Gmail مباشرة على مجلد Spam باستخدام البريد المكتوب أعلاه.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </motion.div>
    </div>
  );
};

export default AccountAccessState;
