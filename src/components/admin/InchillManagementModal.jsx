import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import apiClient from '../../services/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useLanguage } from '../../context/LanguageContext';
import { getInchillAdminDeviceId } from '../../utils/inchillDeviceId';

const EMPTY = { phone: '', countryCode: '', country: '', language: '' };
const formatTimestamp = (value, locale) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const statusCopy = (status, isArabic) => ({
  CONNECTED: isArabic ? 'متصل' : 'Connected',
  REAUTH_REQUIRED: isArabic ? 'يحتاج إعادة تسجيل' : 'Re-login required',
  DISCONNECTED: isArabic ? 'غير متصل' : 'Disconnected',
  OTP_PENDING: isArabic ? 'بانتظار رمز التحقق' : 'OTP pending',
  UNKNOWN: isArabic ? 'غير معروف' : 'Unknown',
}[String(status || 'UNKNOWN').toUpperCase()] || (isArabic ? 'غير معروف' : 'Unknown'));
const statusVariant = (status) => ({ CONNECTED: 'success', REAUTH_REQUIRED: 'danger', OTP_PENDING: 'warning' }[String(status || '').toUpperCase()] || 'secondary');

export default function InchillManagementModal({ provider, isOpen, onClose }) {
  const { addToast } = useToast();
  const { dir, language } = useLanguage();
  const isArabic = language !== 'en';
  const locale = isArabic ? 'ar-EG' : 'en-US';
  const id = provider?.id;
  const [connection, setConnection] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [diagnostics, setDiagnostics] = useState({});
  const [targetId, setTargetId] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  const refresh = async () => {
    if (!id) return;
    try {
      const data = await apiClient.suppliers.getInchillConnection(id);
      setConnection(data?.connection ?? null);
    } catch (error) {
      addToast(error?.message || (isArabic ? 'تعذر تحميل اتصال Inchill.' : 'Unable to load Inchill connection.'), 'error');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setDiagnostics({});
    setOtp('');
    setTargetId('');
    setShowLoginForm(false);
    refresh();
  }, [isOpen, id]);

  const hasConnection = connection?.hasConnection === true;
  const pending = connection?.pendingLogin;
  // connectionStatus is the backend's session assessment. A legacy or
  // unvalidated connection can be UNKNOWN while still having an established
  // account connection; diagnostics must remain available in that case.
  const status = useMemo(() => String(connection?.connectionStatus || (pending ? 'OTP_PENDING' : hasConnection ? 'UNKNOWN' : 'DISCONNECTED')).toUpperCase(), [connection?.connectionStatus, hasConnection, pending]);
  const connected = hasConnection;
  const run = async (task, key) => {
    setBusy(true);
    try {
      const result = await task();
      if (key) setDiagnostics((old) => ({ ...old, [key]: result }));
      await refresh();
      return result;
    } catch (error) {
      addToast(error?.message || (isArabic ? 'تعذر تنفيذ طلب Inchill.' : 'Inchill request failed.'), 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = (event) => {
    event.preventDefault();
    run(() => apiClient.suppliers.sendInchillOtp(id, {
      phone: form.phone.trim(), countryCode: form.countryCode.trim(), deviceId: getInchillAdminDeviceId(),
      ...(form.country.trim() ? { country: form.country.trim().toUpperCase() } : {}),
      ...(form.language.trim() ? { language: form.language.trim() } : {}),
    }));
  };
  const verifyOtp = (event) => {
    event.preventDefault();
    const submitted = otp.trim();
    setOtp('');
    if (submitted) run(() => apiClient.suppliers.verifyInchillOtp(id, submitted));
  };

  if (!provider) return null;
  const metadata = [
    [isArabic ? 'اسم الاتصال' : 'Connection label', connection?.label || '—'],
    [isArabic ? 'آخر فحص' : 'Last checked', formatTimestamp(connection?.lastValidatedAt, locale)],
    [isArabic ? 'آخر تحقق ناجح' : 'Last successful validation', formatTimestamp(connection?.lastSuccessfulAt, locale)],
    [isArabic ? 'نتيجة التحقق' : 'Validation result', connection?.lastValidationStatus || '—'],
  ];

  return <Modal isOpen={isOpen} onClose={onClose} title={`Inchill — ${provider.supplierName || provider.name || ''}`} size="xl">
    <div className="space-y-5" dir={dir}>
      <section className="rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-[color:rgb(var(--color-primary-rgb)/0.07)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.14em] text-[var(--color-primary)]">{isArabic ? 'الاتصال والجلسة' : 'CONNECTION / SESSION'}</p><h4 className="mt-1 text-lg font-black text-gray-950 dark:text-white">{connection?.label || (isArabic ? 'جلسة وكيل Inchill' : 'Inchill agent session')}</h4><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{isArabic ? 'حالة الجلسة الحالية كما يحددها خادم Inchill.' : 'Current session state as determined by the Inchill backend.'}</p></div><Badge variant={statusVariant(status)}>{statusCopy(status, isArabic)} <span className="ms-1 opacity-70" dir="ltr">{status}</span></Badge></div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{metadata.map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200/70 bg-white/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-950/20"><p className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{value}</p></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy || !hasConnection} onClick={() => run(() => apiClient.suppliers.validateInchillSession(id))}><ShieldCheck className="h-4 w-4" />{isArabic ? 'تحقق من الجلسة' : 'Validate session'}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={refresh}><RefreshCw className="h-4 w-4" />{isArabic ? 'تحديث الحالة' : 'Refresh status'}</Button></div>
        {pending ? <form onSubmit={verifyOtp} className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 sm:flex sm:items-end sm:gap-2"><Input label={isArabic ? 'رمز التحقق' : 'OTP'} value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" required /><Button type="submit" size="sm" disabled={busy || !otp.trim()}><CheckCircle2 className="h-4 w-4" />{isArabic ? 'تأكيد الرمز' : 'Verify OTP'}</Button></form> : (showLoginForm || !hasConnection) ? <form onSubmit={sendOtp} className="mt-5 rounded-xl border border-gray-200 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-950/20"><p className="mb-3 text-sm font-black text-gray-900 dark:text-white">{hasConnection ? (isArabic ? 'إعادة تسجيل الدخول' : 'Re-login') : (isArabic ? 'تسجيل دخول Inchill' : 'Inchill login')}</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Input label={isArabic ? 'هاتف الوكيل' : 'Agent phone'} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /><Input label={isArabic ? 'رمز الدولة' : 'Country code'} value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value })} required /><Input label={isArabic ? 'الدولة (اختياري)' : 'Country (optional)'} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} /><Input label={isArabic ? 'اللغة (اختياري)' : 'Language (optional)'} value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} /></div><Button type="submit" size="sm" className="mt-3" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{isArabic ? 'إرسال رمز التحقق' : 'Send OTP'}</Button></form> : <Button size="sm" variant="outline" className="mt-5" disabled={busy} onClick={() => setShowLoginForm(true)}>{isArabic ? 'إعادة تسجيل الدخول' : 'Re-login'}</Button>}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40"><p className="text-xs font-semibold tracking-[0.14em] text-[var(--color-primary)]">{isArabic ? 'تشخيصات للقراءة فقط' : 'READ-ONLY DIAGNOSTICS'}</p><div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3"><Button size="sm" variant="outline" disabled={!connected || busy} onClick={() => run(() => apiClient.suppliers.getInchillReadiness(id), 'readiness')}><ShieldCheck className="h-4 w-4" />{isArabic ? 'الجاهزية' : 'Readiness'}</Button><Button size="sm" variant="outline" disabled={!connected || busy} onClick={() => run(() => apiClient.suppliers.getInchillProfile(id), 'profile')}><UserRound className="h-4 w-4" />{isArabic ? 'الملف الشخصي' : 'Profile'}</Button><Button size="sm" variant="outline" disabled={!connected || busy} onClick={() => run(() => apiClient.suppliers.getInchillWallet(id), 'wallet')}><Wallet className="h-4 w-4" />{isArabic ? 'رصيد Diamond' : 'Diamond balance'}</Button></div>{diagnostics.profile?.profile ? <p className="mt-3 text-sm">{diagnostics.profile.profile.nickName || diagnostics.profile.profile.vid || (isArabic ? 'تم تحميل الملف الشخصي' : 'Agent profile loaded')}</p> : null}{diagnostics.wallet?.wallet ? <p className="mt-2 text-sm">Diamond: {diagnostics.wallet.wallet.diamond ?? '—'}</p> : null}<form onSubmit={(event) => { event.preventDefault(); if (targetId.trim()) run(() => apiClient.suppliers.verifyInchillTarget(id, targetId.trim()), 'target'); }} className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder={isArabic ? 'معرّف الهدف' : 'Target ID'} disabled={!connected} /><Button type="submit" size="sm" disabled={!connected || busy || !targetId.trim()}><Search className="h-4 w-4" />{isArabic ? 'تحقق' : 'Verify'}</Button></form>{diagnostics.target?.verification ? <p className="mt-2 text-sm">{diagnostics.target.verification.nickName || diagnostics.target.verification.vid}</p> : null}{diagnostics.readiness?.readiness ? <p className="mt-2 text-xs text-gray-500">{isArabic ? 'تم تحميل حالة الجاهزية.' : 'Readiness state loaded.'}</p> : null}</section>
    </div>
  </Modal>;
}
