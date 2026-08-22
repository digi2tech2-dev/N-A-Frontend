import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  TicketCheck,
  User,
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import Button, { cn } from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import OtpInput from '../components/account/OtpInput';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ui/Toast';
import useSystemStore from '../store/useSystemStore';
import { useTranslation } from 'react-i18next';
import {
  validateEmail,
  validateFullName,
  validatePassword,
} from '../utils/validation';
import { COUNTRY_CATALOG } from '../data/countryCatalog';
import { getDefaultRouteForRole } from '../utils/authRoles';
import { getAccountAccessRoute, normalizeAccountStatus } from '../utils/accountStatus';
import {
  clearReferralBridge,
  persistReferralBridge,
  readReferralBridge,
  readReferralCodeFromSearch,
} from '../utils/referralCode';
import brandIconImage from '../assets/logo.PNG';
import authBackgroundVideo from '../assets/فيديو مقدمه.MP4';
import styles from './Auth.module.css';

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2H12z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.7-2.6l-3.1-2.4c-.9.6-2 1-3.6 1-2.7 0-5-1.8-5.8-4.3l-3.2 2.5C4.7 19.6 8 22 12 22z" />
    <path fill="#4A90E2" d="M6.2 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7L3 7.8C2.4 9 2 10.4 2 12s.4 3 1 4.2l3.2-2.5z" />
    <path fill="#FBBC05" d="M12 5c1.5 0 2.9.5 4 1.6l3-3C17 1.8 14.7 1 12 1 8 1 4.7 3.4 3 7.8l3.2 2.5C7 6.8 9.3 5 12 5z" />
  </svg>
);

const stepMotion = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -18 },
  transition: { duration: 0.24, ease: 'easeOut' },
};

const StepOne = ({ children }) => (
  <motion.div key="register-step-1" {...stepMotion} className="space-y-4">
    {children}
  </motion.div>
);

const StepTwo = ({ children }) => (
  <motion.div key="register-step-2" {...stepMotion} className="space-y-4">
    {children}
  </motion.div>
);

const Auth = () => {
  const fallbackCountries = useMemo(() => COUNTRY_CATALOG, []);
  const navigate = useNavigate();
  const location = useLocation();
  const oauthHandledRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const { dir } = useLanguage();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const {
    login,
    verifyTwoFactor,
    loginWithGoogle,
    completeGoogleProfile,
    signup,
    isLoading,
    error: storeError,
    isAuthenticated,
    user,
    blockedStatus,
  } = useAuthStore();
  const { currencies: systemCurrencies, loadCurrencies } = useSystemStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('US');
  const [currency, setCurrency] = useState('USD');
  const [referralCode, setReferralCode] = useState(() => readReferralCodeFromSearch(location.search) || readReferralBridge());
  const [countries] = useState(COUNTRY_CATALOG);
  const [errors, setErrors] = useState({});
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [googleSetupPending, setGoogleSetupPending] = useState(() => (
    typeof window !== 'undefined'
    && normalizeAccountStatus(new URLSearchParams(window.location.search).get('status')) === 'profile_completion_required'
    && Boolean(new URLSearchParams(window.location.search).get('completionToken'))
  ));
  const [googleCompletionToken, setGoogleCompletionToken] = useState(() => (
    typeof window === 'undefined'
      ? ''
      : (new URLSearchParams(window.location.search).get('completionToken') || '')
  ));

const countryOptions = useMemo(() => {
    const source = countries.length ? countries : fallbackCountries;
    return [...source].sort((a, b) => (a?.name?.common || '').localeCompare(b?.name?.common || ''));
  }, [countries, fallbackCountries]);

  const selectedCountry = useMemo(
    () => countryOptions.find((item) => item.cca2 === country) || countryOptions[0],
    [countryOptions, country]
  );

  const availableCurrencyOptions = useMemo(() => {
    const list = Array.isArray(systemCurrencies) ? systemCurrencies : [];
    if (!list.length) return [];

    const normalized = list.map((item) => ({
      code: item.code,
      label: `${item.code}${item.symbol ? ` (${item.symbol})` : ''}`,
    }));

    const usdIndex = normalized.findIndex((item) => item.code === 'USD');
    if (usdIndex > 0) {
      const [usd] = normalized.splice(usdIndex, 1);
      normalized.unshift(usd);
    }

    return normalized;
  }, [systemCurrencies]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = String(params.get('mode') || '').toLowerCase();
    const codeFromLink = readReferralCodeFromSearch(location.search);

    if (codeFromLink) {
      setReferralCode(codeFromLink);
      persistReferralBridge(codeFromLink);
    }

    if (mode === 'signup') {
      setIsLogin(false);
      setRegisterStep(1);
      return;
    }

    if (mode === 'login') {
      setIsLogin(true);
      setRegisterStep(1);
    }
  }, [location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reason = localStorage.getItem('auth:logout-reason');
    if (!reason) return;

    localStorage.removeItem('auth:logout-reason');
    if (reason === 'expired') {
      addToast(
        dir === 'rtl'
          ? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى'
          : 'Session expired, please sign in again',
        'warning'
      );
    }
  }, [addToast, dir]);

  useEffect(() => {
    setCurrency((previous) => {
      if (availableCurrencyOptions.some((item) => item.code === previous)) {
        return previous;
      }

      return availableCurrencyOptions[0]?.code || '';
    });
  }, [availableCurrencyOptions]);

  useEffect(() => {
    if (location.search.includes('token=')) return;
    if (location.search.includes('status=')) return;

    const normalizedStatus = normalizeAccountStatus(user?.status || blockedStatus);
    const blockedRoute = getAccountAccessRoute(normalizedStatus);

    if (googleSetupPending) return;

    if (blockedRoute && (isAuthenticated || blockedStatus)) {
      navigate(blockedRoute, { replace: true });
      return;
    }

    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user?.role), { replace: true });
    }
  }, [blockedStatus, googleSetupPending, isAuthenticated, location.search, navigate, user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const callbackStatus = normalizeAccountStatus(params.get('status'));
    if ((!token && !callbackStatus) || oauthHandledRef.current) return;

    oauthHandledRef.current = true;

    const handleGoogleCallback = async () => {
      const result = await loginWithGoogle();

      if (result?.status === 'profile_completion_required' || result?.completionToken) {
        setGoogleCompletionToken(result?.completionToken || params.get('completionToken') || '');
        setGoogleSetupPending(true);
        setIsLogin(false);
        setRegisterStep(2);
        return;
      }

      const signupIntent = window.sessionStorage.getItem('auth:google-signup-intent') === '1';
      if (result?.user && signupIntent) {
        setGoogleSetupPending(true);
        setIsLogin(false);
        setRegisterStep(2);
        setName(result.user.name || '');
        setEmail(result.user.email || '');
        setCountry(result.user.country || 'US');
        setCurrency(result.user.currency || 'USD');
        return;
      }

      if (result?.redirectTo) {
        if (result?.status === 'legacy_pending') {
          addToast('تم إنشاء حساب Google بنجاح وهو الآن قيد مراجعة الإدارة.', 'success');
        } else if (result?.status === 'verification_required') {
          addToast('البريد غير مؤكد: افتح رابط التفعيل المرسل إلى بريدك ثم سجّل الدخول.', 'warning');
        } else if (result?.status === 'rejected') {
          addToast('لا يمكن الدخول بهذا الحساب: الحساب غير مفعّل أو مرفوض. تواصل مع الدعم.', 'error');
        } else {
          addToast(
            t('auth.googleSuccess', {
              defaultValue: dir === 'rtl' ? 'تم تسجيل الدخول عبر Google' : 'Signed in with Google',
            }),
            'success'
          );
        }

        navigate(
          result?.status === 'pending'
            ? getDefaultRouteForRole(result?.user?.role)
            : result.redirectTo,
          { replace: true }
        );
        return;
      }

      oauthHandledRef.current = false;
    };

    handleGoogleCallback();
  }, [addToast, dir, location.search, loginWithGoogle, navigate, t]);

  const validateForm = () => {
    const nextErrors = {};
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;

    if (!isLogin) {
      const nameError = validateFullName(name);

      if (nameError) nextErrors.name = nameError;

      if (!confirmPassword) {
        nextErrors.confirmPassword = t('auth.passwordConfirmRequired');
      } else if (password !== confirmPassword) {
        nextErrors.confirmPassword = t('auth.passwordsDoNotMatch');
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const setScopedErrors = (fieldErrors) => {
    setErrors((previous) => {
      const next = { ...previous };
      Object.keys(fieldErrors).forEach((key) => {
        if (fieldErrors[key]) {
          next[key] = fieldErrors[key];
        } else {
          delete next[key];
        }
      });
      return next;
    });
  };

  const validateRegisterStepOne = () => {
    const nextErrors = {};
    const nameError = validateFullName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    nextErrors.name = nameError || null;
    nextErrors.email = emailError || null;
    nextErrors.password = passwordError || null;

    if (!confirmPassword) {
      nextErrors.confirmPassword = t('auth.passwordConfirmRequired');
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    } else {
      nextErrors.confirmPassword = null;
    }

    setScopedErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const validateRegisterStepTwo = () => {
    const nextErrors = {
      country: country ? null : t('auth.country'),
      currency: currency ? null : t('auth.noCurrenciesConfigured'),
    };

    setScopedErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const isStepOneReady =
    Boolean(name.trim())
    && Boolean(email.trim())
    && Boolean(password)
    && Boolean(confirmPassword);
  const isStepTwoReady = Boolean(country) && Boolean(currency);

  const goToRegisterStepTwo = () => {
    if (!validateRegisterStepOne()) return;
    setRegisterStep(2);
  };

  const consumeAuthResult = (result, { source = 'email', mode = 'login' } = {}) => {
    if (!result) return;

    if (result.redirectTo) {
      if (result.status === 'verification_required') {
        addToast(
          mode === 'signup'
            ? 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني. افتح الرسالة واضغط رابط التفعيل أولاً.'
            : 'البريد غير مؤكد: افتح رابط التفعيل المرسل إلى بريدك ثم سجّل الدخول.',
          'warning'
        );
      } else if (result.status === 'legacy_pending') {
        addToast(
          source === 'google'
            ? 'تم إنشاء حساب Google بنجاح وهو الآن قيد مراجعة الإدارة.'
            : mode === 'signup'
              ? 'تم إنشاء الحساب بنجاح وهو الآن قيد مراجعة الإدارة.'
              : 'حسابك قيد المراجعة: انتظر موافقة الإدارة قبل الدخول.',
          'success'
        );
      } else if (result.status === 'rejected') {
        addToast('لا يمكن الدخول بهذا الحساب: الحساب غير مفعّل أو مرفوض. تواصل مع الدعم.', 'error');
      } else if (result.canAccessApp && source === 'google') {
        addToast(
          t('auth.googleSuccess', {
            defaultValue: dir === 'rtl' ? 'تم تسجيل الدخول عبر Google' : 'Signed in with Google',
          }),
          'success'
        );
      }

      navigate(
        result.status === 'pending'
          ? getDefaultRouteForRole(result?.user?.role)
          : result.redirectTo,
        { replace: true }
      );
      return;
    }

    if (result.ok && result.canAccessApp) {
      if (source === 'google') {
        addToast(
          t('auth.googleSuccess', {
            defaultValue: dir === 'rtl' ? 'تم تسجيل الدخول عبر Google' : 'Signed in with Google',
          }),
          'success'
        );
      }

      navigate(result.redirectTo || getDefaultRouteForRole(useAuthStore.getState().user?.role), { replace: true });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLogin && twoFactorChallenge) {
      await handleTwoFactorSubmit();
      return;
    }

    if (!isLogin) {
      if (registerStep === 1) {
        goToRegisterStepTwo();
        return;
      }

      if (registerStep !== 2) return;
      if ((!googleSetupPending && !validateRegisterStepOne()) || !validateRegisterStepTwo()) return;
    } else if (!validateForm()) {
      return;
    }

    if (!isLogin && !currency) {
      addToast(t('auth.noCurrenciesConfigured'), 'error');
      return;
    }

    if (googleSetupPending) {
      if (!country || !currency) {
        addToast('اختر الدولة والعملة لإكمال حساب Google.', 'error');
        return;
      }

      try {
        const result = await completeGoogleProfile({
          completionToken: googleCompletionToken,
          country,
          currency,
        });
        window.sessionStorage.removeItem('auth:google-signup-intent');
        clearReferralBridge();
        setGoogleSetupPending(false);
        setGoogleCompletionToken('');
        addToast('تم استكمال إعداد حساب Google بنجاح.', 'success');
        navigate(getDefaultRouteForRole(result?.user?.role || useAuthStore.getState().user?.role), { replace: true });
      } catch (error) {
        addToast(error?.message || 'تعذر حفظ إعدادات حساب Google. حاول مرة أخرى.', 'error');
      }
      return;
    }

    const result = isLogin
      ? await login(email, password)
      : await signup({
          name,
          email,
          password,
          country,
          currency,
          signupMethod: 'email',
          referralCode: referralCode.trim().toUpperCase(),
        });

    if (isLogin && result?.requires2FA) {
      setTwoFactorChallenge(result);
      setTwoFactorCode('');
      addToast('أدخل كود التحقق المرسل إلى بريدك الإلكتروني لإكمال تسجيل الدخول.', 'warning');
      return;
    }

    if (!isLogin) {
      if (result?.ok !== false) clearReferralBridge();
      consumeAuthResult(result, { source: 'email', mode: 'signup' });
      return;
    }

    consumeAuthResult(result, { source: 'email', mode: 'login' });
  };

  const handleTwoFactorSubmit = async () => {
    const tempToken = twoFactorChallenge?.tempToken || twoFactorChallenge?.twoFactorToken;
    if (!tempToken || twoFactorCode.length !== 6) {
      addToast('كود التحقق غير مكتمل: أدخل الكود المرسل إلى بريدك الإلكتروني.', 'error');
      return;
    }

    const result = await verifyTwoFactor({
      tempToken,
      code: twoFactorCode,
    });

    if (result?.canAccessApp) {
      setTwoFactorChallenge(null);
      setTwoFactorCode('');
      addToast('تم تأكيد كود البريد الإلكتروني وتسجيل الدخول بنجاح.', 'success');
    }

    consumeAuthResult(result, { source: 'email', mode: 'login' });
  };

  const handleGoogleAuth = async () => {
    if (typeof window !== 'undefined') {
      persistReferralBridge(referralCode);
      if (isLogin) window.sessionStorage.removeItem('auth:google-signup-intent');
      else window.sessionStorage.setItem('auth:google-signup-intent', '1');
    }
    const result = await loginWithGoogle();
    if (!result) return;
    consumeAuthResult(result, { source: 'google', mode: isLogin ? 'login' : 'signup' });
  };

  const handleAuthFormKeyDown = (event) => {
    if (
      event.key !== 'Enter'
      || event.shiftKey
      || event.ctrlKey
      || event.altKey
      || event.metaKey
    ) {
      return;
    }

    const target = event.target;
    if (!target?.matches?.('input, select')) return;

    const fields = Array.from(
      event.currentTarget.querySelectorAll('input:not([type="hidden"]), select')
    ).filter((element) => (
      !element.disabled
      && element.tabIndex !== -1
      && element.getAttribute('aria-hidden') !== 'true'
    ));
    const currentIndex = fields.indexOf(target);
    const nextField = fields[currentIndex + 1];

    if (nextField) {
      event.preventDefault();
      nextField.focus();
      nextField.select?.();
      return;
    }

    if (!isLogin && registerStep === 1) {
      event.preventDefault();
      if (isStepOneReady) {
        goToRegisterStepTwo();
      }
      return;
    }

    if (isLogin && twoFactorChallenge) {
      event.preventDefault();
      if (twoFactorCode.length === 6 && !isLoading) {
        handleTwoFactorSubmit();
      }
    }
  };

  const handleForgotSubmit = (event) => {
    event.preventDefault();

    if (!forgotEmail) {
      addToast(t('auth.emailRequired'), 'error');
      return;
    }

    addToast(t('auth.resetLinkSent'), 'success');
    setForgotModalOpen(false);
    setForgotEmail('');
  };

  const toggleMode = () => {
    setIsLogin((previous) => !previous);
    setRegisterStep(1);
    setTwoFactorChallenge(null);
    setTwoFactorCode('');
    setConfirmPassword('');
    setErrors({});
    useAuthStore.setState({ error: null, blockedStatus: null, blockedUser: null });
  };

  const authSelectClassName =
    'h-11 w-full rounded-[var(--radius-md)] px-4 text-sm outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55';
  const authLinkClassName = 'font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]';
  const modeConfig = isLogin
    ? {
        heading: t('auth.login', {
          defaultValue: dir === 'rtl' ? 'تسجيل الدخول' : 'Sign in',
        }),
        description: dir === 'rtl'
          ? 'سجّل الدخول للوصول إلى حسابك ومتابعة طلباتك'
          : 'Sign in to access your account and track your orders.',
        pills: [],
      }
    : {
        heading: t('auth.register'),
        description: t('auth.joinToday'),
        pills: [],
      };

  return (
    <div className={styles.authPage}>
      <video
        className={styles.authVideoBackground}
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src={authBackgroundVideo} type="video/mp4" />
      </video>
      <div className={styles.authVideoOverlay} aria-hidden="true" />

      <div className={styles.topControls} data-auth-no-sparkle>
        <div className={styles.topControlsInner}>
          <LanguageSwitcher
            variant="glass"
            className="h-8 min-w-[5.5rem] gap-2 rounded-full !border-0 !bg-transparent px-3 py-1 text-[0.62rem] tracking-[0.14em] sm:h-9 sm:min-w-[6rem] sm:text-[0.68rem]"
          />
        </div>
      </div>
      <div className={styles.themeControl} data-auth-no-sparkle>
        <div className={styles.topControlsInner}>
          <ThemeToggle
            variant="glass"
            compact
            className="h-8 w-8 sm:h-9 sm:w-9"
          />
        </div>
      </div>

      <main className={styles.authShell}>
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={styles.formPane}
        >
          <section className={styles.formCard} data-auth-no-sparkle>
            <div className={styles.formIntro}>
              <div className={styles.formLogo}><img src={brandIconImage} alt="" /></div>
              <span className={styles.eyebrow}>{isLogin ? t('auth.login') : t('auth.register')}</span>
              <h2 className={styles.formTitle}>
                {isLogin
                  ? (dir === 'rtl' ? <>مرحبًا بك <span>مجددًا</span></> : <>Welcome <span>back</span></>)
                  : modeConfig.heading}
              </h2>
              <p className={styles.formSubtitle}>{modeConfig.description}</p>
            </div>

            <div className={styles.modeToggle} data-auth-no-sparkle>
              {[
                { key: 'login', active: isLogin, label: t('auth.login'), onClick: () => !isLogin && toggleMode() },
                { key: 'register', active: !isLogin, label: t('auth.register'), onClick: () => isLogin && toggleMode() },
              ].map((item) => (
                <button key={item.key} type="button" onClick={item.onClick} className={cn(styles.modeButton, item.active && styles.modeButtonActive)}>
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} onKeyDown={handleAuthFormKeyDown} className={styles.formStack}>
              {!isLogin && (
                <div className={styles.stepProgress} aria-label="تقدم التسجيل">
                  {[
                    { index: 1, label: googleSetupPending ? 'Google' : 'البيانات الأساسية' },
                    { index: 2, label: 'إعداد الحساب' },
                  ].map((step) => (
                    <div
                      key={step.index}
                      className={cn(
                        styles.stepItem,
                        registerStep === step.index && styles.stepItemActive,
                        registerStep > step.index && styles.stepItemDone
                      )}
                    >
                      <span>{step.index}</span>
                      <small>{step.label}</small>
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {isLogin && twoFactorChallenge ? (
                  <motion.div key="login-2fa" {...stepMotion} className={styles.verificationStep}>
                    <div className={styles.successBadge}>
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h2>المصادقة الثنائية</h2>
                      <p>أدخل كود التحقق المرسل إلى بريدك الإلكتروني لإكمال تسجيل الدخول.</p>
                    </div>
                    <OtpInput value={twoFactorCode} onChange={setTwoFactorCode} disabled={isLoading} />
                  </motion.div>
                ) : isLogin ? (
                  <motion.div key="login" {...stepMotion} className="space-y-4">
                    <Input
                      label={t('auth.email')}
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      icon={<Mail className="h-4 w-4" />}
                      error={errors.email}
                      className={styles.authInput}
                    />

                    <Input
                      label={t('auth.password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      icon={<Lock className="h-4 w-4" />}
                      error={errors.password}
                      className={styles.authInput}
                      suffix={(
                        <button
                          type="button"
                          onClick={() => setShowPassword((previous) => !previous)}
                          className="flex items-center justify-center p-1 text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    />

                    <div className={styles.loginOptions}>
                      <label className={styles.rememberOption}>
                        <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                        <span>{dir === 'rtl' ? 'تذكرني' : 'Remember me'}</span>
                      </label>
                      <button type="button" onClick={() => setForgotModalOpen(true)} className={styles.forgotLink}>
                        {t('auth.forgotPassword')}
                      </button>
                    </div>
                  </motion.div>
                ) : registerStep === 1 ? (
                  <StepOne>
                    <Input
                      label={t('auth.fullName')}
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      icon={<User className="h-4 w-4" />}
                      error={errors.name}
                      className={styles.authInput}
                    />

                    <Input
                      label={t('auth.email')}
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      icon={<Mail className="h-4 w-4" />}
                      error={errors.email}
                      className={styles.authInput}
                    />

                    <Input
                      label={t('auth.password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      icon={<Lock className="h-4 w-4" />}
                      error={errors.password}
                      className={styles.authInput}
                      suffix={(
                        <button
                          type="button"
                          onClick={() => setShowPassword((previous) => !previous)}
                          className="flex items-center justify-center p-1 text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    />

                    <Input
                      label={t('auth.confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="********"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      icon={<Lock className="h-4 w-4" />}
                      error={errors.confirmPassword}
                      className={styles.authInput}
                      suffix={(
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((previous) => !previous)}
                          className="flex items-center justify-center p-1 text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    />
                  </StepOne>
                ) : registerStep === 2 ? (
                  <StepTwo>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                        {t('auth.country')}
                      </label>
                      <div className="relative">
                        <select
                          value={country}
                          onChange={(event) => setCountry(event.target.value)}
                          className={cn(authSelectClassName, styles.authSelect, dir === 'rtl' ? 'pr-10' : 'pl-10')}
                        >
                          {countryOptions.map((item) => (
                            <option key={item.cca2} value={item.cca2}>
                              {item.name?.common || item.cca2}
                            </option>
                          ))}
                        </select>
                        <Globe className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)] ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                      </div>
                      {errors.country && <p role="alert" className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/[0.07] px-2.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.country}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                        {t('auth.currency')}
                      </label>
                      <select
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        disabled={!availableCurrencyOptions.length}
                        className={cn(authSelectClassName, styles.authSelect)}
                      >
                        {!availableCurrencyOptions.length && (
                          <option value="">{t('auth.noCurrenciesConfigured')}</option>
                        )}
                        {availableCurrencyOptions.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      {errors.currency && <p role="alert" className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/[0.07] px-2.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.currency}</p>}
                    </div>

                    <Input
                      label={dir === 'rtl' ? 'كود الدعوة (اختياري)' : 'Invitation code (optional)'}
                      type="text"
                      value={referralCode}
                      onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                      placeholder={dir === 'rtl' ? 'أدخل كود الدعوة إن وجد' : 'Enter an invitation code'}
                      autoComplete="off"
                      maxLength={32}
                      className={styles.authInput}
                      prefix={<TicketCheck className="h-4 w-4" />}
                    />
                    {readReferralCodeFromSearch(location.search) && referralCode ? (
                      <p className="-mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <TicketCheck className="h-3.5 w-3.5" />
                        {dir === 'rtl' ? 'تمت إضافة كود الدعوة تلقائيًا من الرابط.' : 'The invitation code was added automatically from the link.'}
                      </p>
                    ) : null}
                  </StepTwo>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {storeError && (
                  <motion.div
                    key={storeError}
                    initial={{ opacity: 0, y: -8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.99 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={styles.errorBox}
                  >
                    <div className="relative flex items-start gap-3">
                      <span className={styles.errorIcon}>
                        <AlertCircle className="h-4.5 w-4.5" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-rose-700/80 dark:text-rose-200/72">
                          {t('auth.errorNotice', {
                            defaultValue: dir === 'rtl' ? 'تنبيه تسجيل' : 'Sign-in notice',
                          })}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-100/92">
                          {storeError}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isLogin && twoFactorChallenge ? (
                <div className={styles.stepActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    className={styles.secondaryStepButton}
                    onClick={() => {
                      setTwoFactorChallenge(null);
                      setTwoFactorCode('');
                    }}
                    disabled={isLoading}
                  >
                    رجوع
                  </Button>
                  <Button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleTwoFactorSubmit}
                    disabled={isLoading || twoFactorCode.length !== 6}
                  >
                    {isLoading ? t('common.loading') : 'تأكيد الدخول'}
                  </Button>
                </div>
              ) : isLogin ? (
                <Button type="submit" className={styles.primaryButton} disabled={isLoading}>
                  {isLoading ? t('common.loading') : t('auth.signIn')}
                  {!isLoading && <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'mr-1 rotate-180' : 'ml-1'}`} />}
                </Button>
              ) : registerStep === 1 ? (
                <Button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!isStepOneReady}
                  onClick={goToRegisterStepTwo}
                >
                  التالي
                  <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'mr-1 rotate-180' : 'ml-1'}`} />
                </Button>
              ) : (
                <div className={styles.stepActions}>
                  {!googleSetupPending && <Button
                    type="button"
                    variant="secondary"
                    className={styles.secondaryStepButton}
                    onClick={() => setRegisterStep(1)}
                    disabled={isLoading}
                  >
                    السابق
                  </Button>}
                  <Button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading || !isStepTwoReady}
                  >
                    {isLoading ? t('common.processing') : 'إكمال'}
                    {!isLoading && <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'mr-1 rotate-180' : 'ml-1'}`} />}
                  </Button>
                </div>
              )}

              {!twoFactorChallenge && !googleSetupPending && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(25,214,255,0.38)] to-transparent" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {t('auth.orContinueWith', {
                      defaultValue: dir === 'rtl' ? 'أو تابع باستخدام' : 'Or continue with',
                    })}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[rgba(25,214,255,0.38)] to-transparent" />
                </div>

                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className={styles.googleButton}
                >
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_10px_22px_-14px_rgba(66,133,244,0.75)]">
                    <GoogleMark />
                  </span>
                  <span className="relative">
                    {t('auth.continueWithGoogle', {
                      defaultValue: dir === 'rtl' ? 'المتابعة عبر Google' : 'Continue with Google',
                    })}
                  </span>
                </motion.button>
              </div>
              )}

              <div className="mt-6 space-y-2 text-center">
                <span className="block text-sm text-[var(--color-text-secondary)]">
                  {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className={authLinkClassName}
                  >
                    {isLogin ? t('auth.signUp') : t('auth.signIn')}
                  </button>
                </span>
                <p className="pt-1 text-[0.7rem] font-semibold leading-5 text-[var(--color-text-secondary)] sm:text-xs">
                  {dir === 'rtl' ? 'بمجرد التسجيل، فإنك توافق على ' : 'By registering, you agree to the '}
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(true)}
                    className="font-black text-[var(--color-primary)] underline decoration-[color:rgb(var(--color-primary-rgb)/0.38)] underline-offset-4 transition-colors hover:text-[var(--color-primary-hover)]"
                  >
                    {dir === 'rtl' ? 'الشروط والأحكام' : 'Terms and Conditions'}
                  </button>
                </p>
              </div>
            </form>
          </section>
        </motion.div>
      </main>

      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title={t('auth.forgotPassword')}
        footer={(
          <div className="flex justify-end gap-2">
            <Button onClick={() => setForgotModalOpen(false)} variant="ghost">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleForgotSubmit}>
              {t('common.confirm')}
            </Button>
          </div>
        )}
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('auth.forgotPasswordDesc')}
          </p>
          <Input
            label={t('auth.email')}
            type="email"
            placeholder="name@example.com"
            value={forgotEmail}
            onChange={(event) => setForgotEmail(event.target.value)}
            icon={<Mail className="h-4 w-4" />}
            autoFocus
          />
        </form>
      </Modal>

      <Modal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        title={dir === 'rtl' ? 'الشروط والأحكام' : 'Terms and Conditions'}
        footer={(
          <div className="flex justify-end">
            <Button onClick={() => setPrivacyModalOpen(false)}>
              {dir === 'rtl' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3 text-sm leading-7 text-[var(--color-text-secondary)]">
          <p>
            {dir === 'rtl'
              ? 'باستخدام N&A HUB، فإنك توافق على إدخال بيانات صحيحة والحفاظ على سرية حسابك وعدم استخدام المنصة في أي نشاط مخالف.'
              : 'By using N&A HUB, you agree to provide accurate information, protect your account, and avoid any prohibited activity.'}
          </p>
          <p>
            {dir === 'rtl'
              ? 'يرجى مراجعة تفاصيل الطلب بعناية قبل الدفع، فالمنتجات الرقمية لا يمكن استردادها بعد تأكيد التحويل وبدء تنفيذ الطلب.'
              : 'Please review order details before payment. Digital products cannot be refunded after payment is confirmed and fulfillment begins.'}
          </p>
          <p>
            {dir === 'rtl'
              ? 'يُعد إكمال التسجيل موافقة منك على هذه الشروط وعلى سياسات الحماية والتشغيل المعمول بها داخل المنصة.'
              : 'Completing registration confirms your acceptance of these terms and the platform’s applicable operation and protection policies.'}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Auth;
