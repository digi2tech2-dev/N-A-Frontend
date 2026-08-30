import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Loader2, PlugZap, RefreshCw, Search, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import apiClient from '../../services/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTime } from '../../utils/intl';
import { getHagoAdminDeviceId } from '../../utils/hagoDeviceId';

const EMPTY_LOGIN_FORM = {
  phone: '',
  countryCode: '',
  country: '',
  language: '',
};

const statusConfig = {
  CONNECTED: { variant: 'success', icon: CheckCircle2, labelKey: 'hago.status.connected' },
  OTP_PENDING: { variant: 'warning', icon: Loader2, labelKey: 'hago.status.otpPending' },
  REAUTH_REQUIRED: { variant: 'danger', icon: CircleAlert, labelKey: 'hago.status.reauthRequired' },
  UNKNOWN: { variant: 'secondary', icon: CircleAlert, labelKey: 'hago.status.unknown' },
};

const valueOrUnavailable = (value, unavailable) => (
  value === null || value === undefined || value === '' ? unavailable : String(value)
);

const pendingExpiryMs = (pendingLogin) => {
  const expiresAt = Date.parse(String(pendingLogin?.expiresAt || ''));
  return Number.isFinite(expiresAt) ? expiresAt : null;
};

const hasValidPendingLogin = (pendingLogin, now = Date.now()) => {
  const expiresAt = pendingExpiryMs(pendingLogin);
  return Boolean(pendingLogin && expiresAt && expiresAt > now);
};

const HagoManagementModal = ({ provider, isOpen, onClose }) => {
  const { addToast } = useToast();
  const { language, dir, t } = useLanguage();
  const providerId = provider?.id;
  const activeProviderRef = useRef(null);
  const openRef = useRef(false);

  const [connection, setConnection] = useState(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState('');
  const [diagnostics, setDiagnostics] = useState({ readiness: null, profile: null, wallet: null, verification: null });
  const [targetId, setTargetId] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [requestingNewOtp, setRequestingNewOtp] = useState(false);

  const isCurrentProvider = (id) => openRef.current && activeProviderRef.current === id;

  const resetEphemeralState = () => {
    setConnection(null);
    setConnectionLoading(false);
    setShowLoginForm(false);
    setLoginForm(EMPTY_LOGIN_FORM);
    setOtp('');
    setSubmitting(false);
    setDiagnosticLoading('');
    setDiagnostics({ readiness: null, profile: null, wallet: null, verification: null });
    setTargetId('');
    setNowMs(Date.now());
    setRequestingNewOtp(false);
  };

  const refreshConnection = async (id = providerId, { silent = false } = {}) => {
    if (!id) return null;
    setConnectionLoading(true);
    try {
      const data = await apiClient.suppliers.getHagoConnection(id);
      if (!isCurrentProvider(id)) return null;
      const nextConnection = data?.connection ?? null;
      setConnection(nextConnection);
      const hasConnection = nextConnection?.hasConnection === true;
      const hasPendingLogin = hasValidPendingLogin(nextConnection?.pendingLogin);
      setShowLoginForm(!hasConnection && !hasPendingLogin);
      setRequestingNewOtp(false);
      return nextConnection;
    } catch (error) {
      if (isCurrentProvider(id) && !silent) addToast(error?.message || t('hago.errors.connectionLoad'), 'error');
      return null;
    } finally {
      if (isCurrentProvider(id)) setConnectionLoading(false);
    }
  };

  useEffect(() => {
    activeProviderRef.current = providerId || null;
    openRef.current = Boolean(isOpen);
    resetEphemeralState();
    if (isOpen && providerId) refreshConnection(providerId);

    return () => {
      openRef.current = false;
    };
  }, [isOpen, providerId]);

  const pendingLogin = connection?.pendingLogin;
  const pendingLoginExpiresAt = pendingExpiryMs(pendingLogin);
  const isOtpPending = hasValidPendingLogin(pendingLogin, nowMs);
  const isPendingLoginExpired = Boolean(pendingLogin) && !isOtpPending;

  useEffect(() => {
    setNowMs(Date.now());
    if (!isOpen || !pendingLoginExpiresAt) return undefined;

    const delay = pendingLoginExpiresAt - Date.now();
    if (delay <= 0) {
      setShowLoginForm(true);
      setOtp('');
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setNowMs(Date.now());
      setShowLoginForm(true);
      setOtp('');
    }, delay + 1);
    return () => window.clearTimeout(timeout);
  }, [isOpen, pendingLoginExpiresAt]);

  const connectionStatus = String(connection?.connectionStatus || 'UNKNOWN').toUpperCase();
  const displayConnectionStatus = isPendingLoginExpired && connectionStatus === 'OTP_PENDING'
    ? 'UNKNOWN'
    : connectionStatus;
  const currentStatus = statusConfig[displayConnectionStatus] || statusConfig.UNKNOWN;
  const StatusIcon = currentStatus.icon;
  // A local connection record can exist without an upstream Hago account.
  // Only the backend allowlisted presence signal can enable session-bound UI.
  const hasConnection = connection?.hasConnection === true;
  const canValidateSession = hasConnection && Boolean(connection?.enabled);
  const canReconnect = hasConnection;
  const dateLocale = language === 'en' ? 'en-US' : 'ar-EG';
  const formatSafeDate = (value) => value ? formatDateTime(value, dateLocale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : t('hago.unavailable');

  const handleClose = () => {
    openRef.current = false;
    resetEphemeralState();
    onClose();
  };

  const startReconnect = () => {
    setShowLoginForm(true);
    setOtp('');
    setRequestingNewOtp(false);
  };

  const requestNewOtp = () => {
    setOtp('');
    setLoginForm(EMPTY_LOGIN_FORM);
    setConnection((current) => current ? {
      ...current,
      pendingLogin: undefined,
      connectionStatus: current.connectionStatus === 'OTP_PENDING' ? 'UNKNOWN' : current.connectionStatus,
    } : current);
    setRequestingNewOtp(true);
    setShowLoginForm(true);
  };

  const sendOtp = async (event) => {
    event.preventDefault();
    if (!providerId || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        phone: loginForm.phone.trim(),
        countryCode: loginForm.countryCode.trim(),
        deviceId: getHagoAdminDeviceId(),
        ...(loginForm.country.trim() ? { country: loginForm.country.trim().toUpperCase() } : {}),
        ...(loginForm.language.trim() ? { language: loginForm.language.trim() } : {}),
      };
      const data = await apiClient.suppliers.createHagoLoginChallenge(providerId, payload);
      if (!isCurrentProvider(providerId)) return;
      setConnection(data?.connection ?? connection);
      setOtp('');
      setShowLoginForm(true);
      setRequestingNewOtp(false);
      addToast(t('hago.messages.otpSent'), 'success');
    } catch (error) {
      if (isCurrentProvider(providerId)) addToast(error?.message || t('hago.errors.otpSend'), 'error');
    } finally {
      if (isCurrentProvider(providerId)) setSubmitting(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    const submittedOtp = otp.trim();
    if (!providerId || !submittedOtp || submitting) return;
    // Clear immediately; OTP is never persisted and is not restored after an error.
    setOtp('');
    setSubmitting(true);
    try {
      const data = await apiClient.suppliers.verifyHagoLoginChallenge(providerId, submittedOtp);
      if (!isCurrentProvider(providerId)) return;
      setConnection(data?.connection ?? null);
      setLoginForm(EMPTY_LOGIN_FORM);
      setShowLoginForm(false);
      addToast(t('hago.messages.connected'), 'success');
      await refreshConnection(providerId, { silent: true });
    } catch (error) {
      if (isCurrentProvider(providerId)) addToast(error?.message || t('hago.errors.otpVerify'), 'error');
    } finally {
      if (isCurrentProvider(providerId)) setSubmitting(false);
    }
  };

  const validateSession = async () => {
    if (!providerId || !hasConnection || submitting) return;
    setSubmitting(true);
    try {
      const data = await apiClient.suppliers.validateHagoSession(providerId);
      if (!isCurrentProvider(providerId)) return;
      setConnection(data?.connection ?? connection);
      addToast(t('hago.messages.sessionValidated'), 'success');
      await refreshConnection(providerId, { silent: true });
    } catch (error) {
      if (isCurrentProvider(providerId)) addToast(error?.message || t('hago.errors.sessionValidate'), 'error');
    } finally {
      if (isCurrentProvider(providerId)) setSubmitting(false);
    }
  };

  const runDiagnostic = async (key, callback, { requiresConnection = false } = {}) => {
    if (!providerId || diagnosticLoading || (requiresConnection && !hasConnection)) return;
    setDiagnosticLoading(key);
    try {
      const data = await callback();
      if (!isCurrentProvider(providerId)) return;
      setDiagnostics((current) => ({ ...current, [key]: data }));
    } catch (error) {
      if (isCurrentProvider(providerId)) addToast(error?.message || t('hago.errors.diagnostic'), 'error');
    } finally {
      if (isCurrentProvider(providerId)) setDiagnosticLoading('');
    }
  };

  const walletRows = useMemo(() => ([
    ['hagoDiamond', t('hago.wallet.diamond')],
    ['hagoDiamondNew', t('hago.wallet.diamondNew')],
    ['hagoCrystal', t('hago.wallet.crystal')],
  ]), [t]);

  if (!provider) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${t('hago.manage')} — ${provider.supplierName || provider.name || 'Hago'}`} size="xl">
      <div className="space-y-5" dir={dir}>
        <section className="rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.07)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--color-primary)]">{t('hago.connection')}</p>
              <h4 className="mt-1 text-base font-bold text-gray-950 dark:text-white">{t('hago.accountSession')}</h4>
            </div>
            {connectionLoading ? <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" /> : (
              <Badge variant={currentStatus.variant} className="gap-1.5">
                <StatusIcon className={`h-3.5 w-3.5 ${isOtpPending ? 'animate-pulse' : ''}`} />
                {t(currentStatus.labelKey)}
              </Badge>
            )}
          </div>

          {hasConnection || isOtpPending ? (
            <div className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-950/25">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('hago.label')}</p>
                <p className="mt-1 font-semibold text-gray-950 dark:text-white">{valueOrUnavailable(connection.label, t('hago.unavailable'))}</p>
              </div>
              {connection.pendingLogin?.maskedIdentity ? (
                <div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-950/25">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('hago.account')}</p>
                  <p className="mt-1 font-semibold text-gray-950 dark:text-white" dir="ltr">{connection.pendingLogin.maskedIdentity}</p>
                </div>
              ) : null}
              <div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-950/25">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('hago.lastValidation')}</p>
                <p className="mt-1 font-semibold text-gray-950 dark:text-white">{formatSafeDate(connection.lastValidatedAt)}</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-950/25">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('hago.lastSuccessful')}</p>
                <p className="mt-1 font-semibold text-gray-950 dark:text-white">{formatSafeDate(connection.lastSuccessfulAt)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{t('hago.noConnection')}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {canValidateSession && !isOtpPending ? (
              <Button size="sm" variant="outline" onClick={validateSession} disabled={submitting}>
                <ShieldCheck className="h-4 w-4" />
                {t('hago.validateSession')}
              </Button>
            ) : null}
            {canReconnect && !isOtpPending ? (
              <Button size="sm" variant="secondary" onClick={startReconnect} disabled={submitting}>
                <RefreshCw className="h-4 w-4" />
                {t('hago.reconnect')}
              </Button>
            ) : null}
          </div>

          {isPendingLoginExpired ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-semibold text-gray-950 dark:text-white">{t('hago.loginExpired')}</p>
              <Button size="sm" variant="secondary" onClick={requestNewOtp} disabled={submitting}>
                <RefreshCw className="h-4 w-4" />
                {t('hago.sendNewOtp')}
              </Button>
            </div>
          ) : null}

          {showLoginForm && !isOtpPending && !isPendingLoginExpired ? (
            <form onSubmit={sendOtp} className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-bold text-gray-950 dark:text-white">{t('hago.connectAccount')}</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Input label={t('hago.phone')} value={loginForm.phone} onChange={(event) => setLoginForm((current) => ({ ...current, phone: event.target.value }))} inputMode="tel" autoComplete="tel" required />
                <Input label={t('hago.countryCode')} value={loginForm.countryCode} onChange={(event) => setLoginForm((current) => ({ ...current, countryCode: event.target.value }))} inputMode="numeric" placeholder="20" required />
                <Input label={t('hago.countryOptional')} value={loginForm.country} onChange={(event) => setLoginForm((current) => ({ ...current, country: event.target.value }))} placeholder="EG" />
                <Input label={t('hago.languageOptional')} value={loginForm.language} onChange={(event) => setLoginForm((current) => ({ ...current, language: event.target.value }))} placeholder="ar" />
              </div>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                {t(requestingNewOtp ? 'hago.sendNewOtp' : 'hago.sendOtp')}
              </Button>
            </form>
          ) : null}

          {isOtpPending ? (
            <form onSubmit={verifyOtp} className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-950 dark:text-white">{t('hago.enterOtp')}</p>
                {connection?.pendingLogin?.expiresAt ? <Badge variant="warning">{t('hago.expiresAt')}: {formatSafeDate(connection.pendingLogin.expiresAt)}</Badge> : null}
              </div>
              <Input label={t('hago.otp')} value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
              <Button type="submit" size="sm" disabled={submitting || !otp.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t('hago.confirmConnection')}
              </Button>
              {connection?.connectionStatus === 'CONNECTED' ? <p className="text-xs text-gray-600 dark:text-gray-300">{t('hago.reconnectKeepsCurrent')}</p> : null}
            </form>
          ) : null}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--color-primary)]" />
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--color-primary)]">{t('hago.diagnostics')}</p>
              <h4 className="text-base font-bold text-gray-950 dark:text-white">{t('hago.readOnlyDiagnostics')}</h4>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('hago.readOnlyNotice')}</p>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <Button size="sm" variant="outline" onClick={() => runDiagnostic('readiness', () => apiClient.suppliers.getHagoReadiness(providerId))} disabled={Boolean(diagnosticLoading)}>
                {diagnosticLoading === 'readiness' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {t('hago.checkService')}
              </Button>
              {diagnostics.readiness ? <p className="mt-3 text-sm font-semibold text-gray-950 dark:text-white">{t('hago.statusLabel')}: {valueOrUnavailable(diagnostics.readiness?.readiness?.status, t('hago.unavailable'))}</p> : null}
            </div>

            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <Button size="sm" variant="outline" onClick={() => runDiagnostic('profile', () => apiClient.suppliers.getHagoProfile(providerId), { requiresConnection: true })} disabled={!hasConnection || Boolean(diagnosticLoading)}>
                {diagnosticLoading === 'profile' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                {t('hago.accountDetails')}
              </Button>
              {diagnostics.profile?.profile ? (
                <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                  <p>{t('hago.nickname')}: {valueOrUnavailable(diagnostics.profile.profile.nickName, t('hago.unavailable'))}</p>
                  <p dir="ltr">UID: {valueOrUnavailable(diagnostics.profile.profile.uid, t('hago.unavailable'))}</p>
                  <p dir="ltr">{t('hago.vid')}: {valueOrUnavailable(diagnostics.profile.profile.vid, t('hago.unavailable'))}</p>
                  <p>{t('hago.country')}: {valueOrUnavailable(diagnostics.profile.profile.country, t('hago.unavailable'))}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <Button size="sm" variant="outline" onClick={() => runDiagnostic('wallet', () => apiClient.suppliers.getHagoWallet(providerId), { requiresConnection: true })} disabled={!hasConnection || Boolean(diagnosticLoading)}>
                {diagnosticLoading === 'wallet' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {t('hago.refreshBalance')}
              </Button>
              {diagnostics.wallet?.wallet ? (
                <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                  {walletRows.map(([key, label]) => <p key={key}>{label}: {valueOrUnavailable(diagnostics.wallet.wallet[key], t('hago.unavailable'))}</p>)}
                </div>
              ) : null}
            </div>
          </div>

          <form onSubmit={(event) => {
            event.preventDefault();
            const normalizedTargetId = targetId.trim();
            if (hasConnection && normalizedTargetId) {
              runDiagnostic('verification', () => apiClient.suppliers.verifyHagoTarget(providerId, normalizedTargetId), { requiresConnection: true });
            }
          }} className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-950 dark:text-white">{t('hago.verifyTarget')}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder={t('hago.targetPlaceholder')} className="flex-1" disabled={!hasConnection} />
              <Button type="submit" size="sm" variant="secondary" disabled={!hasConnection || Boolean(diagnosticLoading) || !targetId.trim()}>
                {diagnosticLoading === 'verification' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t('hago.verifyTarget')}
              </Button>
            </div>
            {diagnostics.verification?.verification ? (
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-4 dark:text-gray-200">
                <p>{t('hago.nickname')}: {valueOrUnavailable(diagnostics.verification.verification.nickName, t('hago.unavailable'))}</p>
                <p dir="ltr">UID: {valueOrUnavailable(diagnostics.verification.verification.uid, t('hago.unavailable'))}</p>
                <p dir="ltr">{t('hago.vid')}: {valueOrUnavailable(diagnostics.verification.verification.vid, t('hago.unavailable'))}</p>
                <p dir="ltr">{t('hago.requestedTargetId')}: {valueOrUnavailable(diagnostics.verification.verification.targetId, t('hago.unavailable'))}</p>
                <p>{t('hago.country')}: {valueOrUnavailable(diagnostics.verification.verification.country, t('hago.unavailable'))}</p>
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </Modal>
  );
};

export default HagoManagementModal;
