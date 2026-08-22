import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AccountAccessState from '../components/auth/AccountAccessState';

const includesAny = (value, patterns) => patterns.some((pattern) => value.includes(pattern));

const getVerificationErrorMeta = (rawMessage) => {
  const message = String(rawMessage || '').trim();
  const normalized = message.toLowerCase();

  if (
    includesAny(normalized, [
      'expired',
      'token expired',
      'link expired',
      'has expired',
      'منتهي',
      'انتهت',
      'منتهية',
    ])
  ) {
    return {
      type: 'expired',
      label: 'نوع الخطأ: رابط منتهي',
      title: 'رابط التحقق منتهي الصلاحية',
      description: 'انتهت صلاحية رابط التحقق. سجّل الدخول مرة أخرى ثم اطلب إرسال رابط تحقق جديد إلى بريدك.',
      shouldContactSupport: false,
    };
  }

  if (
    includesAny(normalized, [
      'invalid token',
      'invalid verification',
      'invalid or expired',
      'malformed',
      'not valid',
      'غير صالح',
      'غير صحيح',
      'رابط غير صالح',
    ])
  ) {
    return {
      type: 'invalid',
      label: 'نوع الخطأ: رابط غير صالح',
      title: 'رابط التحقق غير صالح',
      description: 'رابط التحقق غير صالح أو تم تعديله. افتح أحدث رسالة بريد وصالح التحقق من جديد.',
      shouldContactSupport: false,
    };
  }

  if (
    includesAny(normalized, [
      'already verified',
      'already confirmed',
      'verified already',
      'already used',
      'تم التحقق بالفعل',
      'مؤكد بالفعل',
      'مفعل بالفعل',
    ])
  ) {
    return {
      type: 'already_verified',
      label: 'نوع الخطأ: البريد مؤكد مسبقًا',
      title: 'البريد الإلكتروني مؤكد بالفعل',
      description: 'تم تأكيد هذا البريد سابقًا. يمكنك تسجيل الدخول الآن.',
      shouldContactSupport: false,
    };
  }

  if (
    includesAny(normalized, [
      'user not found',
      'account not found',
      'no user',
      'not found',
      'الحساب غير موجود',
      'المستخدم غير موجود',
    ])
  ) {
    return {
      type: 'account_not_found',
      label: 'نوع الخطأ: الحساب غير موجود',
      title: 'الحساب المرتبط بالرابط غير موجود',
      description: 'لم يتم العثور على الحساب المرتبط بهذا الرابط. تأكد أنك تستخدم الرابط الصحيح وحاول مرة أخرى.',
      shouldContactSupport: true,
    };
  }

  if (
    includesAny(normalized, [
      'missing token',
      'token required',
      'verification token required',
      'token is required',
      'مطلوب',
      'بدون رمز',
    ])
  ) {
    return {
      type: 'missing_token',
      label: 'نوع الخطأ: رابط ناقص',
      title: 'رابط التحقق ناقص',
      description: 'الرابط الذي تم فتحه لا يحتوي على بيانات التحقق الكاملة. افتح الرابط مباشرة من البريد الإلكتروني مرة أخرى.',
      shouldContactSupport: false,
    };
  }

  return {
    type: 'unknown',
    label: 'نوع الخطأ: غير معروف',
    title: 'تعذر تحديد نوع المشكلة',
    description: 'حدث خطأ غير معروف أثناء تأكيد البريد الإلكتروني. حاول مرة أخرى لاحقًا.',
    shouldContactSupport: true,
  };
};

const EmailVerified = () => {
  const location = useLocation();

  const { status, message } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      status: String(params.get('status') || '').trim().toLowerCase(),
      message: String(params.get('message') || '').trim(),
    };
  }, [location.search]);

  const isSuccess = status === 'success';
  const errorMeta = useMemo(() => getVerificationErrorMeta(message), [message]);

  if (isSuccess) {
    return <AccountAccessState variant="pending" />;
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
        className="relative z-10 w-full max-w-xl"
      >
        <Card variant="premium" className="overflow-hidden rounded-[2rem] border border-[color:rgb(var(--color-border-rgb)/0.84)] p-6 sm:p-8">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-card-rgb)/0.78)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-error)]" />
              تعذر تأكيد البريد
            </div>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-[color:rgb(var(--color-error-rgb)/0.22)] bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.16),transparent_55%),rgba(255,255,255,0.82)] text-[var(--color-error)] shadow-[var(--shadow-subtle)] dark:bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.14),transparent_52%),rgba(15,23,42,0.9)]">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-[var(--color-text)] sm:text-3xl">
                {errorMeta.title}
              </h1>
              <p className="mx-auto max-w-lg text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {errorMeta.description}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[color:rgb(var(--color-error-rgb)/0.16)] bg-[linear-gradient(135deg,rgba(248,113,113,0.1),rgba(239,68,68,0.06))] p-4 text-start shadow-[0_18px_40px_-28px_rgba(239,68,68,0.24)]">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {errorMeta.label}
              </p>
              {message ? (
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                  رسالة الخادم: {message}
                </p>
              ) : null}
              {errorMeta.shouldContactSupport ? (
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                  إذا تكرر الخطأ، عد إلى تسجيل الدخول وحاول مرة أخرى.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <Link to="/auth" className="block">
                <Button variant="secondary" className="w-full">
                  <Home className="h-4 w-4" />
                  العودة إلى تسجيل الدخول
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default EmailVerified;
