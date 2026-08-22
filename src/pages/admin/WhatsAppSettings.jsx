import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader, MessageCircle, QrCode, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import apiClient from '../../services/client';

const POLL_INTERVAL_MS = 4000;

const normalizeStatus = (status) => {
  const state = String(status?.state || '').trim().toUpperCase();
  const isConnected = Boolean(status?.isConnected || state === 'CONNECTED');
  const qrCode = status?.qrCode || status?.qr || status?.qrDataUrl || null;
  const hasQrCode = Boolean(status?.hasQrCode || qrCode);
  const isInitializing = Boolean(status?.isInitializing || state === 'INITIALIZING' || state === 'AUTHENTICATED');
  const lastError = status?.lastError?.message || status?.error || '';

  return {
    ...status,
    state: state || (isConnected ? 'CONNECTED' : 'DISCONNECTED'),
    isConnected,
    qrCode,
    hasQrCode,
    isInitializing,
    lastError,
  };
};

const getStatusMeta = (status) => {
  if (status.isConnected) {
    return {
      label: 'متصل',
      description: 'Connected',
      icon: CheckCircle2,
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    };
  }

  if (status.hasQrCode) {
    return {
      label: 'بانتظار المصادقة',
      description: 'Authentication required',
      icon: QrCode,
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300',
    };
  }

  if (status.isInitializing) {
    return {
      label: 'جاري التشغيل',
      description: 'Initializing',
      icon: Loader,
      className: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300',
    };
  }

  if (status.state === 'ERROR' || status.lastError) {
    return {
      label: 'خطأ في الاتصال',
      description: 'Connection error',
      icon: AlertCircle,
      className: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300',
    };
  }

  return {
    label: 'غير متصل',
    description: 'Disconnected',
    icon: WifiOff,
    className: 'border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300',
  };
};

const WhatsAppSettings = () => {
  const { addToast } = useToast();
  const [status, setStatus] = useState(() => normalizeStatus({ state: 'IDLE' }));
  const [isLoading, setIsLoading] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');

  const statusMeta = useMemo(() => getStatusMeta(status), [status]);
  const StatusIcon = statusMeta.icon;
  const shouldPoll = !status.isConnected;

  const fetchStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const nextStatus = await apiClient.whatsapp.getStatus();
      setStatus(normalizeStatus(nextStatus));
      setError('');
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'تعذر تحميل حالة الواتساب';
      setError(message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!shouldPoll) return undefined;
    const intervalId = window.setInterval(() => {
      fetchStatus({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchStatus, shouldPoll]);

  const handleReconnect = async () => {
    setIsRestarting(true);
    setError('');
    try {
      const nextStatus = await apiClient.whatsapp.reconnect();
      setStatus(normalizeStatus(nextStatus));
      addToast('تم إرسال أمر إعادة التشغيل', 'success');
      await fetchStatus({ silent: true });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'تعذر إعادة تشغيل الواتساب';
      setError(message);
      addToast(message, 'error');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleHardReset = async () => {
    setIsResetting(true);
    setError('');
    try {
      const nextStatus = await apiClient.whatsapp.reset();
      setStatus(normalizeStatus(nextStatus));
      addToast('تم حذف جلسة الواتساب وإعادة التهيئة', 'success');
      await fetchStatus({ silent: true });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'تعذر حذف جلسة الواتساب';
      setError(message);
      addToast(message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text)]">تكامل الواتساب</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">WhatsApp Integration</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={handleReconnect}
            disabled={isRestarting || isResetting}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRestarting ? 'animate-spin' : ''}`} />
            <span>إعادة تشغيل</span>
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleHardReset}
            disabled={isRestarting || isResetting}
            className="inline-flex items-center gap-2"
          >
            {isResetting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>حذف الجلسة بالكامل</span>
          </Button>
        </div>
      </div>

      <Card className="admin-premium-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] border ${statusMeta.className}`}>
              <StatusIcon className={`h-6 w-6 ${status.isInitializing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">حالة الاتصال</p>
              <p className="mt-0.5 text-xl font-black text-[var(--color-text)]">{statusMeta.label}</p>
            </div>
          </div>
          <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.72)] px-3 py-2 text-left" dir="ltr">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{statusMeta.description}</p>
            <p className="mt-0.5 text-sm font-black text-[var(--color-text)]">{status.state}</p>
          </div>
        </div>
      </Card>

      <Card className="admin-premium-panel min-h-[360px] p-5 sm:p-7">
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <Loader className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : status.isConnected ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="mt-5 text-xl font-black text-[var(--color-text)]">خدمة الواتساب متصلة وتعمل بنجاح</h2>
          </div>
        ) : status.hasQrCode ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="rounded-[1.35rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-white p-4 shadow-[0_22px_45px_-32px_rgba(15,23,42,0.55)]">
              <img
                src={status.qrCode}
                alt="WhatsApp QR"
                className="h-64 w-64 rounded-xl object-contain"
              />
            </div>
            <h2 className="mt-5 text-xl font-black text-[var(--color-text)]">امسح رمز QR لتفعيل خدمة الواتساب</h2>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <MessageCircle className="h-10 w-10" />
            </div>
            <h2 className="mt-5 text-xl font-black text-[var(--color-text)]">خدمة الواتساب غير متصلة</h2>
            {status.lastError || error ? (
              <p className="mt-3 max-w-xl break-words text-sm text-[var(--color-text-secondary)]">{status.lastError || error}</p>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatsAppSettings;
