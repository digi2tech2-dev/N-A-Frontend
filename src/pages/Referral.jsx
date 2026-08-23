import React, { useEffect, useState } from 'react';
import {
  Check,
  BadgeCheck,
  CheckCircle2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Copy,
  Crown,
  Gift,
  Eye,
  Link2,
  MessageCircle,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Smartphone,
  ReceiptText,
  XCircle,
  UserRound,
  UserRoundPlus,
  UsersRound,
  Wallet,
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useLanguage } from '../context/LanguageContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { resolveUserAvatar } from '../utils/avatar';
import apiClient from '../services/client';
import { isReferralApiEnabled } from '../config/dataProvider';
import referralHeroImage from '../assets/slide-3.webp';

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);
    return copied;
  }
};

const createSevenLetterCode = (value) => {
  const source = String(value || 'KANZCOINS').trim().toUpperCase();
  const lettersOnly = source.replace(/[^A-Z]/g, '');

  if (lettersOnly.length === 7) return lettersOnly;

  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let code = '';
  let state = hash || 1;
  for (let index = 0; index < 7; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    code += String.fromCharCode(65 + (state % 26));
  }

  return code;
};

const getPublicAppUrl = () => {
  const configuredUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || 'http://kanzcoins.com').trim();
  const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  return (configuredUrl || currentOrigin).replace(/\/+$/, '');
};

const REFERRAL_VALIDITY_DAYS = 30;
const WITHDRAWAL_METHODS_KEY = 'kanzcoins_referral_withdrawal_methods';
const WITHDRAWAL_REQUESTS_KEY = 'kanzcoins_referral_withdrawal_requests';
const SUB_AGENT_REQUESTS_KEY = 'oscar_sub_agent_requests';
const useRealReferralApi = isReferralApiEnabled;
const DEFAULT_WITHDRAWAL_METHODS = [
  { id: 'wallet', name: 'محفظة البرنامج', enabled: true, requiresAccount: false },
  { id: 'vodafone', name: 'فودافون كاش', enabled: true, requiresAccount: true },
  { id: 'instapay', name: 'إنستا باي', enabled: true, requiresAccount: true },
];

const getReferralExpiryDate = (invitedAt, expiresAt) => {
  if (expiresAt) return expiresAt;
  if (!invitedAt) return null;

  const invitationDate = new Date(invitedAt);
  if (Number.isNaN(invitationDate.getTime())) return null;

  return new Date(
    invitationDate.getTime() + (REFERRAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
  ).toISOString();
};

const Referral = () => {
  const { user } = useAuthStore();
  const { dir } = useLanguage();
  const { addToast } = useToast();
  const isArabic = dir === 'rtl';
  const [activePage, setActivePage] = useState('referral');
  const [copiedField, setCopiedField] = useState('');
  const [agentForm, setAgentForm] = useState({ message: '', proofImage: '', proofFile: null });
  const [referralDashboard, setReferralDashboard] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [submittingAgentRequest, setSubmittingAgentRequest] = useState(false);
  const [agentRequest, setAgentRequest] = useState(() => {
    if (useRealReferralApi) return null;
    try {
      const requests = JSON.parse(window.localStorage.getItem(SUB_AGENT_REQUESTS_KEY)) || [];
      return requests.find((request) => request.email === user?.email) || null;
    } catch { return null; }
  });
  const [agentRequestHistory, setAgentRequestHistory] = useState(() => {
    if (useRealReferralApi) return [];
    try {
      const requests = JSON.parse(window.localStorage.getItem(SUB_AGENT_REQUESTS_KEY)) || [];
      return requests.filter((request) => request.email === user?.email);
    } catch { return []; }
  });
  const isApprovedSubAgent = agentRequestHistory.some((request) => String(request.status || '').toLowerCase() === 'approved');
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalMethod, setWithdrawalMethod] = useState('wallet');
  const [withdrawalMethods, setWithdrawalMethods] = useState(() => {
    if (useRealReferralApi) return DEFAULT_WITHDRAWAL_METHODS;
    try { return JSON.parse(window.localStorage.getItem(WITHDRAWAL_METHODS_KEY)) || DEFAULT_WITHDRAWAL_METHODS; } catch { return DEFAULT_WITHDRAWAL_METHODS; }
  });
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [localWithdrawals, setLocalWithdrawals] = useState(() => {
    if (useRealReferralApi) return [];
    try {
      const requests = JSON.parse(window.localStorage.getItem(WITHDRAWAL_REQUESTS_KEY)) || [];
      return requests.filter((request) => !request.ownerEmail || request.ownerEmail === user?.email)
        .map((request) => ({ ...request, phone: request.phone || request.accountNumber }));
    } catch { return []; }
  });
  const [withdrawalForm, setWithdrawalForm] = useState({
    name: user?.name || '',
    phone: '',
    amount: '',
  });
  const enabledWithdrawalMethods = withdrawalMethods.filter((method) => method.enabled);
  const selectedMethod = enabledWithdrawalMethods.find((method) => method.id === withdrawalMethod) || enabledWithdrawalMethods[0];
  const withdrawalDiscountPercent = Math.min(100, Math.max(0, Number(selectedMethod?.discountPercent || 0)));

  const getRequestErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.message || fallback;

  const loadRealReferralData = async () => {
    if (!useRealReferralApi || !user?.id) return;
    const [
      dashboard,
      methods,
      currentRequest,
      requestHistory,
      payouts,
      commissions,
    ] = await Promise.all([
      apiClient.referrals.dashboard({ limit: 50 }),
      apiClient.referrals.payoutMethods(),
      apiClient.referrals.currentSubAgentRequest(),
      apiClient.referrals.subAgentRequests({ limit: 50 }),
      apiClient.referrals.payouts({ limit: 50 }),
      apiClient.referrals.commissions({ limit: 50 }),
    ]);

    setReferralDashboard(dashboard);
    if (Array.isArray(methods) && methods.length) setWithdrawalMethods(methods);
    setAgentRequest(currentRequest?.request || null);
    setAgentRequestHistory(Array.isArray(requestHistory?.requests) ? requestHistory.requests : []);
    setPayoutHistory(Array.isArray(payouts?.payouts) ? payouts.payouts : []);
    setCommissionHistory(Array.isArray(commissions?.commissions) ? commissions.commissions : []);
  };

  useEffect(() => {
    if (!useRealReferralApi) return undefined;
    let mounted = true;
    loadRealReferralData().catch((error) => {
      if (!mounted) return;
      addToast(
        getRequestErrorMessage(error, isArabic ? 'تعذر تحميل بيانات الإحالة.' : 'Unable to load referral data.'),
        'error'
      );
    });
    return () => { mounted = false; };
  }, [user?.id, user?.email, isArabic]);

  useEffect(() => {
    if (activePage !== 'agent') return;
    if (useRealReferralApi) {
      loadRealReferralData().catch((error) => {
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر تحميل حالة الطلب.' : 'Unable to load request status.'),
          'error'
        );
      });
      return;
    }
    try {
      const requests = JSON.parse(window.localStorage.getItem(SUB_AGENT_REQUESTS_KEY)) || [];
      const ownRequests = requests.filter((request) => request.email === user?.email);
      setAgentRequestHistory(ownRequests);
      setAgentRequest(ownRequests[0] || null);
    } catch {
      setAgentRequestHistory([]);
    }
  }, [activePage, user?.email]);
  const withdrawalRequestedAmount = Math.max(0, Number(withdrawalForm.amount || 0));
  const withdrawalDiscountAmount = Number(((withdrawalRequestedAmount * withdrawalDiscountPercent) / 100).toFixed(2));
  const withdrawalNetAmount = Number(Math.max(0, withdrawalRequestedAmount - withdrawalDiscountAmount).toFixed(2));

  useEffect(() => {
    if (selectedMethod && selectedMethod.id !== withdrawalMethod) setWithdrawalMethod(selectedMethod.id);
  }, [selectedMethod, withdrawalMethod]);

  const backendReferralCode = referralDashboard?.referralCode || user?.referralCode || user?.inviteCode || '';
  const referralCode = backendReferralCode
    ? String(backendReferralCode).trim().toUpperCase()
    : createSevenLetterCode(user?.id || user?._id || user?.userId || user?.email);
  const referralLink = typeof window === 'undefined'
    ? ''
    : `${getPublicAppUrl()}/auth?mode=signup&ref=${encodeURIComponent(referralCode)}`;
  const customersSource = useRealReferralApi
    ? (referralDashboard?.invitedUsers || referralDashboard?.referredCustomers || [])
    : (user?.referrals || user?.referredCustomers || user?.invitedCustomers);
  const realReferredCustomers = Array.isArray(customersSource)
    ? customersSource.map((customer, index) => {
      const invitedAt = customer?.invitedAt
        || customer?.referralCreatedAt
        || customer?.joinedAt
        || customer?.createdAt
        || null;
      const expiresAt = getReferralExpiryDate(
        invitedAt,
        customer?.expiresAt || customer?.referralExpiresAt || customer?.invitationExpiresAt
      );

      return ({
      id: customer?.id || customer?._id || `referral-${index}`,
      name: customer?.name || customer?.username || customer?.email || (isArabic ? `عميل ${index + 1}` : `Customer ${index + 1}`),
      email: customer?.email || '',
      avatar: resolveUserAvatar(customer, customer?.email || customer?.name || `Customer ${index + 1}`),
      addedAmount: Number(
        customer?.addedAmount
        ?? customer?.totalDeposits
        ?? customer?.depositsTotal
        ?? customer?.topupTotal
        ?? 0
      ) || 0,
      earnings: Number(
        customer?.earnings
        ?? customer?.referralEarnings
        ?? customer?.commission
        ?? 0
      ) || 0,
      currency: String(customer?.currency || user?.currency || 'USD').toUpperCase(),
      invitedAt,
      expiresAt,
    });
    })
    : [];
  const referredCustomers = realReferredCustomers;
  const referralCount = Number((useRealReferralApi ? referralDashboard?.referralCount : undefined) ?? user?.referralCount ?? user?.referralsCount ?? referredCustomers.length)
    || referredCustomers.length;
  const customersEarningsTotal = referredCustomers.reduce((sum, customer) => sum + customer.earnings, 0);
  const rewardTotal = Number(
    (useRealReferralApi ? referralDashboard?.displayAvailableEarnings : undefined)
    ?? user?.referralRewards
    ?? user?.referralEarnings
    ?? customersEarningsTotal
  ) || 0;
  const currency = String(referralDashboard?.displayCurrency || user?.currency || 'USD').toUpperCase();
  const withdrawalSource = useRealReferralApi ? payoutHistory : (user?.referralWithdrawals || user?.withdrawalRequests);
  const realWithdrawals = Array.isArray(withdrawalSource)
    ? withdrawalSource.map((withdrawal, index) => ({
      id: withdrawal?.id || withdrawal?._id || `withdrawal-${index}`,
      method: withdrawal?.method || withdrawal?.withdrawalMethod || 'vodafone',
      amount: Number(withdrawal?.amount || 0),
      currency: String(withdrawal?.currency || 'EGP').toUpperCase(),
      status: String(withdrawal?.status || 'processing').toLowerCase(),
      createdAt: withdrawal?.createdAt || withdrawal?.requestedAt || null,
      completedAt: withdrawal?.completedAt || withdrawal?.processedAt || null,
      phone: withdrawal?.phone || withdrawal?.walletNumber || '',
      receiptImage: withdrawal?.receiptImage || withdrawal?.transferImage || '',
    }))
    : [];
  const withdrawals = [...(useRealReferralApi ? [] : localWithdrawals), ...realWithdrawals];
  const shareMessage = isArabic
    ? '🚀 كل اللي محتاجه في مكان واحد مع N&A HUB!\n\n🎮 شحن الألعاب والبرامج\n💎 اشتراكات مميزة\n🤖 خدمات وأدوات الذكاء الاصطناعي\n📈 زيادة المتابعين وخدمات السوشيال ميديا\n\n✨ سجّل الآن من خلال رابط دعوتي واكتشف كل الخدمات:'
    : '🚀 Everything you need in one place with N&A HUB!\n\n🎮 Games and software top-ups\n💎 Premium subscriptions\n🤖 AI services and tools\n📈 Followers growth and social media services\n\n✨ Sign up through my invitation link and discover all the services:';
  const shareText = `${shareMessage}\n${referralLink}`;

  useEffect(() => {
    if (!copiedField) return undefined;
    const timer = window.setTimeout(() => setCopiedField(''), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedField]);

  const handleCopy = async (field, value) => {
    if (!value) return;
    const copied = await copyText(value);
    setCopiedField(copied ? field : '');

    if (copied) {
      addToast(
        isArabic
          ? (field === 'link' ? 'تم نسخ رابط الدعوة بنجاح' : 'تم نسخ كود الدعوة بنجاح')
          : (field === 'link' ? 'Invitation link copied successfully' : 'Invitation code copied successfully'),
        'success'
      );
      return;
    }

    addToast(isArabic ? 'تعذر النسخ، حاول مرة أخرى.' : 'Could not copy. Please try again.', 'error');
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopy('link', shareText);
      return;
    }

    try {
      await navigator.share({
        title: isArabic ? 'دعوة إلى N&A HUB' : 'N&A HUB invitation',
        text: shareMessage,
        url: referralLink,
      });
    } catch {
      // The user can dismiss the native share sheet without an error message.
    }
  };

  const updateWithdrawalField = (field) => (event) => {
    setWithdrawalForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleWithdrawalSubmit = async (event) => {
    event.preventDefault();
    if (submittingWithdrawal) return;
    const amount = Number(withdrawalForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      addToast(isArabic ? 'أدخل مبلغ سحب صحيحًا.' : 'Enter a valid withdrawal amount.', 'error');
      return;
    }

    if (amount > rewardTotal) {
      addToast(isArabic ? 'المبلغ المطلوب أكبر من أرباحك المتاحة.' : 'The requested amount exceeds your available earnings.', 'error');
      return;
    }

    if (selectedMethod?.requiresAccount) {
      if (!withdrawalForm.name.trim()) {
        addToast(isArabic ? 'أدخل اسم صاحب الحساب.' : 'Enter the account holder name.', 'error');
        return;
      }
      if (!withdrawalForm.phone.trim()) {
        addToast(isArabic ? 'أدخل رقم الحساب أو المحفظة.' : 'Enter the account or wallet number.', 'error');
        return;
      }

      if (useRealReferralApi) {
        try {
          setSubmittingWithdrawal(true);
          await apiClient.referrals.createPayout({
            method: selectedMethod.id,
            currency,
            amount: withdrawalForm.amount,
            accountName: withdrawalForm.name.trim(),
            accountNumber: withdrawalForm.phone.trim(),
            phone: withdrawalForm.phone.trim(),
          });
          setWithdrawalSuccess(true);
          await loadRealReferralData();
        } catch (error) {
          addToast(
            getRequestErrorMessage(error, isArabic ? 'تعذر إرسال طلب السحب.' : 'Unable to submit withdrawal request.'),
            'error'
          );
        } finally {
          setSubmittingWithdrawal(false);
        }
        return;
      }

      const newRequest = {
        id: `local-withdrawal-${Date.now()}`,
        ownerName: user?.name || withdrawalForm.name,
        ownerEmail: user?.email || '',
        ownerAvatar: resolveUserAvatar(user, user?.email || user?.name),
        accountHolder: withdrawalForm.name.trim(),
        accountNumber: withdrawalForm.phone.trim(),
        method: selectedMethod.id,
        methodName: selectedMethod.name,
        requestedAmount: amount,
        discountPercent: withdrawalDiscountPercent,
        discountAmount: Number(((amount * withdrawalDiscountPercent) / 100).toFixed(2)),
        amount: Number((amount - ((amount * withdrawalDiscountPercent) / 100)).toFixed(2)),
        currency: 'EGP',
        status: 'processing',
        createdAt: new Date().toISOString(),
      };
      let storedRequests = [];
      try { storedRequests = JSON.parse(window.localStorage.getItem(WITHDRAWAL_REQUESTS_KEY)) || []; } catch { storedRequests = []; }
      window.localStorage.setItem(WITHDRAWAL_REQUESTS_KEY, JSON.stringify([newRequest, ...storedRequests]));
      setWithdrawalSuccess(true);
      setLocalWithdrawals((current) => [{ ...newRequest, phone: newRequest.accountNumber }, ...current]);
      return;
    }

    if (useRealReferralApi) {
      try {
        setSubmittingWithdrawal(true);
        await apiClient.referrals.createPayout({
          method: 'wallet',
          currency,
          amount: withdrawalForm.amount,
        });
        setWithdrawalSuccess(true);
        await loadRealReferralData();
      } catch (error) {
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر إرسال طلب السحب.' : 'Unable to submit withdrawal request.'),
          'error'
        );
      } finally {
        setSubmittingWithdrawal(false);
      }
      return;
    }

    addToast(
      isArabic
        ? 'بيانات طلب السحب جاهزة، ويلزم ربط خدمة السحب بالسيرفر لإرسال الطلب.'
        : 'Withdrawal details are ready. The server withdrawal service must be connected to submit it.',
      'info'
    );
  };

  const closeWithdrawalModal = () => {
    setWithdrawalOpen(false);
    setWithdrawalSuccess(false);
  };

  const handleAgentProofUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast(isArabic ? 'اختر صورة إثبات صحيحة.' : 'Choose a valid proof image.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAgentForm((current) => ({ ...current, proofImage: String(reader.result || ''), proofFile: file }));
    reader.readAsDataURL(file);
  };

  const handleAgentRequestSubmit = async (event) => {
    event.preventDefault();
    if (submittingAgentRequest) return;
    if (!agentForm.message.trim() || !agentForm.proofImage) {
      addToast(isArabic ? 'اكتب رسالتك وأرفق صورة تثبت وجود عملاء.' : 'Write your message and attach customer proof.', 'error');
      return;
    }
    if (useRealReferralApi) {
      try {
        setSubmittingAgentRequest(true);
        const request = await apiClient.referrals.createSubAgentRequest({
          message: agentForm.message.trim(),
          proofFile: agentForm.proofFile,
        });
        setAgentRequest(request);
        await loadRealReferralData();
        setAgentForm({ message: '', proofImage: '', proofFile: null });
        addToast(isArabic ? 'تم إرسال طلب الوكيل الفرعي للمراجعة.' : 'Sub-agent request sent for review.', 'success');
      } catch (error) {
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر إرسال طلب الوكيل الفرعي.' : 'Unable to submit sub-agent request.'),
          'error'
        );
      } finally {
        setSubmittingAgentRequest(false);
      }
      return;
    }
    const request = {
      id: `sub-agent-${Date.now()}`,
      userId: user?.id || user?._id || '',
      name: user?.name || user?.username || user?.email || (isArabic ? 'مستخدم' : 'User'),
      email: user?.email || '',
      message: agentForm.message.trim(),
      proofImage: agentForm.proofImage,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    let requests = [];
    try { requests = JSON.parse(window.localStorage.getItem(SUB_AGENT_REQUESTS_KEY)) || []; } catch { requests = []; }
    const nextRequests = [request, ...requests];
    window.localStorage.setItem(SUB_AGENT_REQUESTS_KEY, JSON.stringify(nextRequests));
    setAgentRequest(request);
    setAgentRequestHistory((current) => [request, ...current.filter((item) => item.id !== request.id)]);
    addToast(isArabic ? 'تم إرسال طلب الوكيل الفرعي للمراجعة.' : 'Sub-agent request sent for review.', 'success');
  };

  const getWithdrawalStatus = (status) => {
    if (status === 'completed' || status === 'success') {
      return {
        label: isArabic ? 'مكتمل' : 'Completed',
        className: 'border-emerald-400/22 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        icon: CheckCircle2,
      };
    }
    if (status === 'failed' || status === 'rejected') {
      return {
        label: isArabic ? 'فاشل' : 'Failed',
        className: 'border-rose-400/22 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        icon: XCircle,
      };
    }
    return {
      label: isArabic ? 'قيد التنفيذ' : 'Processing',
      className: 'border-amber-400/22 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      icon: Clock3,
    };
  };

  const formatWithdrawalDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatReferralDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="referral-page relative isolate mx-auto w-full max-w-5xl space-y-5 pb-8 sm:space-y-6">
      <section className="referral-page__hero group relative aspect-[2048/752] overflow-hidden rounded-[1.35rem] border border-violet-300/35 bg-[var(--color-card)] shadow-[0_28px_80px_-38px_rgb(0_0_0/0.95),0_0_55px_-20px_rgb(139_92_246/0.8),0_0_28px_-18px_rgb(34_211_238/0.7)] sm:rounded-[1.65rem]">
        <img
          src={referralHeroImage}
          alt={isArabic ? 'الوكيل الفرعي والإحالة' : 'Sub-agent & Referral'}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="block h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.015]"
        />
        <span className="pointer-events-none absolute inset-x-[12%] bottom-0 h-px bg-[linear-gradient(90deg,transparent,#22d3ee,#d946ef,transparent)] shadow-[0_0_18px_3px_rgb(217_70_239/0.75)]" />
      </section>

      <nav className="referral-page__tabs grid grid-cols-2 gap-2 p-1.5 sm:gap-3" aria-label={isArabic ? 'أقسام الوكيل الفرعي والإحالة' : 'Sub-agent and referral sections'}>
        {[
          { id: 'referral', label: isArabic ? 'كود الإحالة' : 'Referral code', icon: Gift },
          { id: 'agent', label: isArabic ? 'وكيل فرعي' : 'Sub-agent', icon: UserRoundPlus },
        ].map((item) => {
          const Icon = item.icon;
          const selected = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              aria-pressed={selected}
              className={`referral-page__tab ${selected ? 'is-active' : ''} relative flex min-h-12 items-center justify-center gap-2 overflow-hidden border px-3 text-xs font-black transition-all sm:text-sm`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={`${activePage === 'referral' ? 'contents' : 'hidden'} referral-page__content`}>
      <section className="referral-invite-panel relative isolate overflow-hidden rounded-[1.75rem] border border-fuchsia-300/30 bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.96),rgb(91_33_182/0.18)_52%,rgb(8_145_178/0.09))] p-4 shadow-[0_30px_90px_-42px_rgb(124_58_237/0.95),0_0_42px_-28px_rgb(217_70_239/0.85),inset_0_1px_0_rgb(255_255_255/0.1)] backdrop-blur-xl sm:p-6">
        <div className="referral-invite-panel__header flex items-center gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.5)] pb-4">
          <span className="referral-invite-panel__icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-fuchsia-200/35 bg-[linear-gradient(145deg,#6d28d9,#c026d3_58%,#0891b2)] text-white shadow-[0_0_24px_-5px_rgb(217_70_239/0.9),inset_0_1px_0_rgb(255_255_255/0.24)]">
            <Gift className="h-5.5 w-5.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black text-violet-500">{isArabic ? 'شارك واربح' : 'Share & earn'}</p>
            <h1 className="text-lg font-black text-[var(--color-text)] sm:text-xl">{isArabic ? 'دعوتك الخاصة' : 'Your invitation'}</h1>
            <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">{isArabic ? 'انسخ الكود أو الرابط وشاركه مع أصدقائك' : 'Copy your code or link and share it'}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1.35fr]">
          <div className="referral-code-card relative overflow-hidden rounded-[1.35rem] border border-cyan-300/25 bg-[linear-gradient(145deg,rgb(var(--color-surface-rgb)/0.72),rgb(6_182_212/0.08))] p-4 shadow-[0_0_30px_-22px_rgb(34_211_238/0.9),inset_0_1px_0_rgb(255_255_255/0.1)]">
            <Sparkles className="absolute end-3 top-3 h-5 w-5 text-[var(--color-primary)]/55" />
            <p className="text-[0.68rem] font-black text-[var(--color-text-secondary)]">{isArabic ? 'كود الدعوة' : 'Invitation code'}</p>
            <p dir="ltr" className="mt-2 font-mono text-2xl font-black tracking-[0.26em] text-[var(--color-text)] drop-shadow-[0_0_12px_rgb(34_211_238/0.45)]">{referralCode}</p>
            <button
              type="button"
              onClick={() => handleCopy('code', referralCode)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-4 text-xs font-black text-cyan-600 shadow-[0_0_20px_-12px_rgb(34_211_238/0.8)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400/18 hover:shadow-[0_0_24px_-8px_rgb(34_211_238/0.9)] dark:text-cyan-300"
            >
              {copiedField === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedField === 'code' ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ الكود' : 'Copy code')}</span>
            </button>
          </div>

          <div className="referral-link-card relative overflow-hidden rounded-[1.35rem] border border-fuchsia-300/40 bg-[linear-gradient(135deg,rgb(124_58_237/0.22),rgb(192_38_211/0.16)_55%,rgb(6_182_212/0.11))] p-4 shadow-[0_20px_48px_-24px_rgb(124_58_237/0.95),0_0_32px_-24px_rgb(217_70_239/0.9),inset_0_1px_0_rgb(255_255_255/0.14)]">
            <div className="relative flex items-center gap-2 text-violet-600 dark:text-violet-300">
              <Link2 className="h-4.5 w-4.5" />
              <p className="text-[0.68rem] font-black">{isArabic ? 'رابط الدعوة' : 'Invitation link'}</p>
            </div>
            <div dir="ltr" className="relative mt-2.5 flex min-h-12 items-center overflow-hidden rounded-xl border border-violet-300/25 bg-[color:rgb(var(--color-card-rgb)/0.82)] px-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
              <span className="block min-w-0 truncate text-xs font-bold text-[var(--color-text)] sm:text-sm">{referralLink}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('link', referralLink)}
              className="relative mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-200/25 bg-[linear-gradient(135deg,#6d28d9,#c026d3_55%,#0891b2)] px-4 text-xs font-black text-white shadow-[0_0_24px_-7px_rgb(217_70_239/0.9)] transition-all hover:-translate-y-0.5 hover:brightness-115 hover:shadow-[0_0_30px_-5px_rgb(34_211_238/0.8)]"
            >
              {copiedField === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedField === 'link' ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ الرابط' : 'Copy link')}</span>
            </button>
          </div>
        </div>

        <div className="referral-share-actions mt-3 grid grid-cols-3 gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 text-[0.68rem] font-black text-emerald-600 transition-all hover:-translate-y-0.5 hover:bg-emerald-500/15 dark:text-emerald-400 sm:text-xs"
          >
            <MessageCircle className="h-4.5 w-4.5" />
            <span>{isArabic ? 'واتساب' : 'WhatsApp'}</span>
          </a>
          <a
            href={`https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-sky-400/20 bg-sky-500/10 px-2 text-[0.68rem] font-black text-sky-600 transition-all hover:-translate-y-0.5 hover:bg-sky-500/15 dark:text-sky-400 sm:text-xs"
          >
            <Send className="h-4.5 w-4.5" />
            <span>{isArabic ? 'تيليجرام' : 'Telegram'}</span>
          </a>
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2 text-[0.68rem] font-black text-[var(--color-primary)] transition-all hover:-translate-y-0.5 hover:bg-[color:rgb(var(--color-primary-rgb)/0.13)] sm:text-xs"
          >
            <Share2 className="h-4.5 w-4.5" />
            <span>{isArabic ? 'مشاركة' : 'Share'}</span>
          </button>
        </div>
      </section>

      <section className="referral-customers-panel overflow-hidden rounded-[1.5rem] border border-cyan-300/22 bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.84),rgb(6_182_212/0.065))] shadow-[0_24px_70px_-45px_rgb(34_211_238/0.85),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.55)] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-[var(--color-text)] sm:text-base">
                {isArabic ? 'العملاء المنضمون' : 'Joined customers'}
              </h2>
              <p className="text-[0.68rem] font-bold text-[var(--color-text-secondary)]">
                {isArabic ? 'المبالغ المضافة وأرباحك من كل عميل' : 'Added funds and your earnings per customer'}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-3 py-1 text-xs font-black text-[var(--color-primary)]">
            {referralCount.toLocaleString('en-US')}
          </span>
        </div>

        {referredCustomers.length ? (
          <div className="space-y-3 p-3 sm:p-4">
            {referredCustomers.map((customer) => (
              <article
                key={customer.id}
                className="group relative isolate overflow-hidden rounded-[1.3rem] border border-violet-300/22 bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)/0.82),rgb(124_58_237/0.08),rgb(6_182_212/0.05))] p-3.5 shadow-[0_18px_44px_-34px_rgb(124_58_237/0.75)] transition-all hover:-translate-y-1 hover:border-fuchsia-300/40 hover:shadow-[0_22px_52px_-30px_rgb(217_70_239/0.7)] sm:p-4"
              >
                <span className="pointer-events-none absolute -end-12 -top-14 -z-10 h-32 w-32 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.1)] blur-3xl" />
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <span className="absolute -inset-1 rounded-full bg-[linear-gradient(135deg,var(--color-primary),#ec4899)] opacity-55 blur-[3px]" />
                    <img
                      src={customer.avatar}
                      alt={customer.name}
                      className="relative h-12 w-12 rounded-full border-2 border-[color:rgb(var(--color-card-rgb)/0.92)] bg-[var(--color-card)] object-cover shadow-md sm:h-14 sm:w-14"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="absolute bottom-0 end-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-card)] bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153/0.8)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-black text-[var(--color-text)] sm:text-base">{customer.name}</p>
                      {customer.isTest ? (
                        <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[0.58rem] font-black text-violet-600 dark:text-violet-300">
                          {isArabic ? 'تجريبي' : 'Test'}
                        </span>
                      ) : null}
                    </div>
                    <p dir="ltr" className="mt-0.5 truncate text-left text-[0.68rem] font-semibold text-[var(--color-text-secondary)]">
                      {customer.email || (isArabic ? 'لا يوجد بريد إلكتروني' : 'No email available')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.52)] bg-[color:rgb(var(--color-card-rgb)/0.52)] px-3 py-2.5">
                    <p className="text-[0.61rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'أضاف للمحفظة' : 'Added funds'}</p>
                    <p dir="ltr" className="mt-1 text-end text-base font-black text-[var(--color-text)] sm:text-lg">
                      {customer.addedAmount.toLocaleString('en-US')} <span className="text-[0.68rem] text-[var(--color-text-secondary)]">{customer.currency}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-400/18 bg-[linear-gradient(135deg,rgb(16_185_129/0.12),rgb(52_211_153/0.05))] px-3 py-2.5 shadow-[0_12px_30px_-24px_rgb(16_185_129/0.8)]">
                    <p className="text-[0.61rem] font-bold text-emerald-600 dark:text-emerald-400">{isArabic ? 'أرباحك منه' : 'Your earnings'}</p>
                    <p dir="ltr" className="mt-1 text-end text-lg font-black text-emerald-600 dark:text-emerald-400 sm:text-xl">
                      +{customer.earnings.toLocaleString('en-US')} <span className="text-[0.68rem]">{customer.currency}</span>
                    </p>
                  </div>
                </div>
                {customer.invitedAt ? (
                  <p className="mt-2.5 text-center text-[0.58rem] font-semibold leading-relaxed text-[var(--color-text-secondary)]">
                    {isArabic ? 'تمت دعوته بتاريخ' : 'Invited on'}{' '}
                    <span dir="ltr" className="font-black text-[var(--color-text)]">{formatReferralDate(customer.invitedAt)}</span>
                    {' · '}
                    {isArabic ? 'وينتهي بتاريخ' : 'Expires on'}{' '}
                    <span dir="ltr" className="font-black text-[var(--color-text)]">{formatReferralDate(customer.expiresAt)}</span>
                    {' '}
                    <span className="whitespace-nowrap">({isArabic ? 'بعد 30 يومًا كاملًا' : 'after 30 full days'})</span>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-9 text-center sm:px-6">
            <UsersRound className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
            <p className="mt-3 text-sm font-black text-[var(--color-text)]">
              {isArabic ? 'لا يوجد عملاء منضمّون حتى الآن' : 'No joined customers yet'}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {isArabic ? 'ستظهر هنا بيانات العملاء وأرباحك بعد انضمامهم.' : 'Customer activity and earnings will appear here after they join.'}
            </p>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => setWithdrawalOpen(true)}
        className="referral-earnings-button referral-earnings-glow group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-[1.5rem] border border-cyan-200/35 bg-[linear-gradient(115deg,#071a33,#0b3b68_38%,#075985_68%,#4338ca)] p-4 text-start text-white shadow-[0_24px_64px_-30px_rgb(8_145_178/0.95)] transition-all hover:-translate-y-0.5 hover:border-cyan-100/60 hover:brightness-110 sm:p-5"
      >
        <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_15%,rgb(103_232_249/0.22),transparent_34%),radial-gradient(circle_at_90%_80%,rgb(99_102_241/0.3),transparent_40%)]" />
        <span className="pointer-events-none absolute left-[-45%] top-[-28%] z-0 h-[160%] w-[32%] rotate-[14deg] bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.12),rgb(165_243_252/0.95),rgb(255_255_255/0.8),transparent)] blur-[1px] mix-blend-screen animate-[neon-shine_3.2s_ease-in-out_infinite]" />
        <span className="pointer-events-none absolute inset-x-[18%] bottom-0 z-0 h-px bg-[linear-gradient(90deg,transparent,#67e8f9,#818cf8,transparent)] shadow-[0_0_16px_3px_rgb(34_211_238/0.78)]" />
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-100/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_20px_-7px_rgb(103_232_249/0.9),inset_0_1px_0_rgb(255_255_255/0.22)]">
          <Gift className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white/76">{isArabic ? 'إجمالي أرباحك' : 'Your total earnings'}</p>
          <p dir="ltr" className="mt-1 text-end text-2xl font-black tracking-tight text-white">
            {rewardTotal.toLocaleString('en-US')} <span className="text-base text-cyan-200">{currency}</span>
          </p>
          <p className="mt-1 text-[0.68rem] font-black text-cyan-100">
            {isArabic ? 'اضغط لعرض الأرباح وطرق السحب' : 'View earnings and withdrawal methods'}
          </p>
        </div>
        <CircleDollarSign className="h-6 w-6 shrink-0 text-white/72 transition-transform group-hover:scale-110" />
      </button>

      <section className="referral-how-panel rounded-[1.5rem] border border-violet-300/25 bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.86),rgb(124_58_237/0.07))] p-5 shadow-[0_24px_70px_-45px_rgb(139_92_246/0.85),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="h-5.5 w-5.5" />
          </span>
          <div>
            <h2 className="text-base font-black text-[var(--color-text)]">{isArabic ? 'كيف تعمل الإحالة؟' : 'How referrals work'}</h2>
            <p className="mt-0.5 text-xs font-medium text-[var(--color-text-secondary)]">{isArabic ? 'أربع خطوات بسيطة' : 'Four simple steps'}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { icon: Link2, text: isArabic ? 'انسخ كود دعوتك' : 'Copy your invitation code', tone: 'border-violet-400/18 bg-violet-500/8 text-violet-500' },
            { icon: Share2, text: isArabic ? 'شاركه مع أصدقائك' : 'Share it with friends', tone: 'border-sky-400/18 bg-sky-500/8 text-sky-500' },
            { icon: UsersRound, text: isArabic ? 'تابع العملاء المنضمين ومكافآتك' : 'Track joined customers and rewards', tone: 'border-emerald-400/18 bg-emerald-500/8 text-emerald-500' },
            { icon: Clock3, text: isArabic ? 'تستمر المكافآت 30 يومًا لكل مستخدم تتم إضافته' : 'Rewards continue for 30 days per joined user', tone: 'border-fuchsia-400/18 bg-fuchsia-500/8 text-fuchsia-500' },
          ].map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.text} className={`group relative overflow-hidden rounded-2xl border p-3.5 shadow-[0_14px_34px_-30px_currentColor] transition-all hover:-translate-y-0.5 sm:p-4 ${step.tone}`}>
                <span className="absolute end-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-[color:rgb(var(--color-card-rgb)/0.68)] text-[0.65rem] font-black text-[var(--color-text-secondary)]">{index + 1}</span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-current/10">
                  <StepIcon className="h-4.5 w-4.5" />
                </span>
                <p className="mt-3 text-xs font-black leading-5 text-[var(--color-text)] sm:text-sm sm:leading-6">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="referral-transfers-panel overflow-hidden rounded-[1.5rem] border border-fuchsia-300/22 bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.86),rgb(192_38_211/0.06))] shadow-[0_24px_70px_-45px_rgb(217_70_239/0.8),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.55)] px-4 py-4 sm:px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-black text-[var(--color-text)] sm:text-base">{isArabic ? 'حالة التحويلات' : 'Transfer status'}</h2>
            <p className="text-[0.68rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'تابع طلبات السحب واطّلع على التفاصيل' : 'Track withdrawals and view their details'}</p>
          </div>
        </div>

        <div className="space-y-2.5 p-3 sm:p-4">
          {withdrawals.length ? withdrawals.map((withdrawal) => {
            const status = getWithdrawalStatus(withdrawal.status);
            const StatusIcon = status.icon;
            return (
              <article key={withdrawal.id} className="flex flex-wrap items-center gap-3 rounded-[1.15rem] border border-[color:rgb(var(--color-border-rgb)/0.52)] bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)/0.66),rgb(124_58_237/0.045))] p-3.5 transition-all hover:-translate-y-0.5 hover:border-fuchsia-300/30 hover:shadow-[0_14px_34px_-28px_rgb(217_70_239/0.75)]">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${status.className}`}>
                  <StatusIcon className={`h-5 w-5 ${withdrawal.status === 'processing' ? 'animate-pulse' : ''}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[var(--color-text)]">
                      {withdrawal.method === 'vodafone' ? (isArabic ? 'فودافون كاش' : 'Vodafone Cash') : (isArabic ? 'محفظة البرنامج' : 'App wallet')}
                    </p>
                    {withdrawal.isTest ? <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[0.56rem] font-black text-violet-500">{isArabic ? 'تجريبي' : 'Test'}</span> : null}
                  </div>
                  <p dir="ltr" className="mt-0.5 text-left text-[0.68rem] font-bold text-[var(--color-text-secondary)]">{formatWithdrawalDate(withdrawal.createdAt)}</p>
                </div>
                <div className="text-end">
                  <p dir="ltr" className="text-base font-black text-[var(--color-text)]">{withdrawal.amount.toLocaleString('en-US')} <span className="text-[0.68rem] text-[var(--color-text-secondary)]">{withdrawal.currency}</span></p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-black ${status.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawal(withdrawal)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 text-[0.68rem] font-black text-[var(--color-primary)] transition-all hover:bg-[color:rgb(var(--color-primary-rgb)/0.14)]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {isArabic ? 'التفاصيل' : 'Details'}
                </button>
              </article>
            );
          }) : (
            <div className="referral-empty-state px-4 py-8 text-center">
              <ReceiptText className="mx-auto h-8 w-8" />
              <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                {isArabic ? 'لا توجد طلبات سحب حتى الآن' : 'No withdrawal requests yet'}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {isArabic ? 'ستظهر هنا حالة طلبات السحب عند إنشائها.' : 'Your withdrawal request status will appear here.'}
              </p>
            </div>
          )}
        </div>
      </section>
      </div>

      <section className={`${activePage === 'agent' ? '' : 'hidden'} referral-agent-panel relative isolate overflow-hidden p-4 sm:p-7`}>
        <div className="referral-agent-panel__header flex items-center gap-3 pb-5">
          <span className="referral-agent-panel__icon grid h-12 w-12 shrink-0 place-items-center"><UserRoundPlus className="h-5.5 w-5.5" /></span>
          <div><h1 className="text-lg font-black text-[var(--color-text)]">{isApprovedSubAgent ? (isArabic ? 'مبروك، أصبحت وكيلًا فرعيًا' : 'Congratulations, you are now a sub-agent') : (isArabic ? 'انضم كوكيل فرعي' : 'Become a sub-agent')}</h1><p className="mt-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">{isApprovedSubAgent ? (isArabic ? 'تم قبول طلبك وترقية حسابك في N&A HUB بنجاح.' : 'Your N&A HUB account was successfully upgraded.') : (isArabic ? 'أرسل رسالة وصورة تثبت وجود عملاء وسيتم مراجعة طلبك.' : 'Send a message and customer proof for review.')}</p></div>
        </div>

        {isApprovedSubAgent ? (
          <div className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-emerald-300/30 bg-[linear-gradient(135deg,rgb(16_185_129/0.14),rgb(6_182_212/0.08),rgb(124_58_237/0.1))] p-6 text-center shadow-[0_24px_60px_-38px_rgb(16_185_129/0.95)] sm:p-8">
            <span className="absolute inset-x-[22%] top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_16px_2px_rgb(52_211_153/0.7)]" />
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-300/35 bg-emerald-500/12 text-emerald-500 shadow-[0_18px_38px_-24px_rgb(16_185_129/0.9)]"><Crown className="h-9 w-9" /></span>
            <h2 className="mt-4 inline-flex items-center justify-center gap-2 text-xl font-black text-[var(--color-text)] sm:text-2xl"><span>{isArabic ? 'مبروك، أصبحت وكيلًا فرعيًا' : 'Congratulations, you are now a sub-agent'}</span><BadgeCheck className="h-6 w-6 shrink-0 fill-emerald-500 text-white drop-shadow-[0_3px_7px_rgb(16_185_129/0.5)]" /></h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">{isArabic ? 'تمت الموافقة على طلبك في N&A HUB وتغيير عضويتك من عضو المتجر إلى وكيل فرعي.' : 'N&A HUB approved your request and changed your Store Member account to a Sub-agent account.'}</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-white"><CheckCircle2 className="h-4 w-4" />{isArabic ? 'وكيل فرعي معتمد' : 'Approved sub-agent'}</span>
          </div>
        ) : agentRequest ? (
          <div className="mt-5 rounded-[1.35rem] border border-amber-300/25 bg-amber-500/8 p-5 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/12 text-amber-500"><Clock3 className="h-6 w-6" /></span>
            <h2 className="mt-3 font-black text-[var(--color-text)]">{agentRequest.status === 'approved' ? (isArabic ? 'تم قبول طلبك' : 'Your request was approved') : agentRequest.status === 'rejected' ? (isArabic ? 'تم رفض الطلب' : 'Request rejected') : (isArabic ? 'طلبك قيد المراجعة' : 'Request under review')}</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{isArabic ? 'ستظهر لك الحالة الجديدة هنا بعد مراجعة الإدارة.' : 'The updated status will appear here after admin review.'}</p>
          </div>
        ) : null}
        {!isApprovedSubAgent ? (
          <form onSubmit={handleAgentRequestSubmit} className="mt-6 space-y-5">
            <label className="block"><span className="mb-2 block text-xs font-black text-[var(--color-text)]">{isArabic ? 'رسالتك إلى الإدارة' : 'Message to admin'}</span><textarea value={agentForm.message} onChange={(event) => setAgentForm((current) => ({ ...current, message: event.target.value }))} rows={4} placeholder={isArabic ? 'اكتب عدد العملاء وطبيعة نشاطك...' : 'Describe your customers and activity...'} className="referral-agent-message w-full resize-none p-4 text-sm font-semibold outline-none transition" /></label>
            <label className="referral-agent-upload block cursor-pointer border-2 border-dashed p-4 transition">
              <input type="file" accept="image/*" onChange={handleAgentProofUpload} className="hidden" />
              {agentForm.proofImage ? <img src={agentForm.proofImage} alt={isArabic ? 'صورة الإثبات' : 'Proof'} className="mx-auto max-h-52 w-full object-contain" /> : <div className="py-7 text-center"><UserRoundPlus className="mx-auto h-8 w-8 text-[var(--color-primary)]" /><p className="mt-2 text-xs font-black text-[var(--color-text)]">{isArabic ? 'ارفع صورة إثبات وجود عملاء' : 'Upload customer proof'}</p><p className="mt-1 text-[0.65rem] text-[var(--color-text-secondary)]">{isArabic ? 'اضغط لاختيار الصورة' : 'Tap to choose an image'}</p></div>}
            </label>
            <Button type="submit" className="referral-agent-submit h-12 w-full">{isArabic ? 'إرسال طلب الوكيل الفرعي' : 'Send sub-agent request'}</Button>
          </form>
        ) : null}

        <div className="referral-agent-history mt-7 overflow-hidden border">
          <div className="flex items-center justify-between gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.55)] px-4 py-3">
            <div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-cyan-500" /><h2 className="text-sm font-black text-[var(--color-text)]">{isArabic ? 'حالة الطلبات' : 'Request status'}</h2></div>
            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[0.65rem] font-black text-violet-500">{agentRequestHistory.length}</span>
          </div>
          {agentRequestHistory.length ? (
            <div className="space-y-2 p-3">
              {agentRequestHistory.map((request, index) => {
                const status = String(request.status || 'pending').toLowerCase();
                const statusLabel = status === 'approved' ? (isArabic ? 'مقبول' : 'Approved') : status === 'rejected' ? (isArabic ? 'مرفوض' : 'Rejected') : (isArabic ? 'قيد المراجعة' : 'Under review');
                const statusClass = status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500';
                return (
                  <article key={request.id || index} className="flex items-center gap-3 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.45)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${statusClass}`}>{status === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : status === 'rejected' ? <XCircle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[var(--color-text)]">{isArabic ? `طلب وكيل فرعي رقم ${agentRequestHistory.length - index}` : `Sub-agent request #${agentRequestHistory.length - index}`}</p><p dir="ltr" className="mt-0.5 text-left text-[0.65rem] font-semibold text-[var(--color-text-secondary)]">{formatWithdrawalDate(request.createdAt)}</p></div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-black ${statusClass}`}>{statusLabel}</span>
                  </article>
                );
              })}
            </div>
          ) : <p className="p-5 text-center text-xs font-semibold text-[var(--color-text-secondary)]">{isArabic ? 'لا توجد طلبات حتى الآن.' : 'No requests yet.'}</p>}
        </div>
      </section>

      <Modal
        isOpen={withdrawalOpen}
        onClose={closeWithdrawalModal}
        title={withdrawalSuccess
          ? (isArabic ? 'تم إرسال الطلب' : 'Request submitted')
          : (isArabic ? 'أرباح الإحالة وطرق السحب' : 'Referral earnings and withdrawal')}
        size="md"
      >
        {withdrawalSuccess ? (
          <div className="py-3 text-center">
            <div className="relative mx-auto grid h-24 w-24 place-items-center">
              <span className="absolute inset-0 rounded-full bg-emerald-400/18 blur-xl" />
              <span className="relative grid h-20 w-20 place-items-center rounded-full border border-emerald-300/35 bg-[linear-gradient(145deg,#059669,#10b981_55%,#34d399)] text-white shadow-[0_22px_54px_-25px_rgb(16_185_129/0.95)]">
                <CheckCircle2 className="h-10 w-10" strokeWidth={2.2} />
              </span>
            </div>

            <h3 className="mt-5 text-2xl font-black text-[var(--color-text)]">
              {isArabic ? 'تم إرسال طلب السحب بنجاح' : 'Withdrawal request submitted'}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-7 text-[var(--color-text-secondary)]">
              {isArabic
                ? 'تم استلام بيانات فودافون كاش، وسيتم مراجعة طلبك قبل تنفيذ التحويل.'
                : 'Your Vodafone Cash details were received. The request will be reviewed before transfer.'}
            </p>

            <div className="mx-auto mt-5 grid max-w-sm gap-2 rounded-[1.2rem] border border-emerald-400/18 bg-emerald-500/8 p-3 text-start">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">{isArabic ? 'الاسم' : 'Name'}</span>
                <span className="truncate text-sm font-black text-[var(--color-text)]">{withdrawalForm.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">{isArabic ? 'رقم المحفظة' : 'Wallet number'}</span>
                <span dir="ltr" className="text-sm font-black text-[var(--color-text)]">{withdrawalForm.phone}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-emerald-400/14 pt-2">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">{isArabic ? 'المبلغ' : 'Amount'}</span>
                <span dir="ltr" className="text-lg font-black text-emerald-600 dark:text-emerald-400">{Number(withdrawalForm.amount).toLocaleString('en-US')} EGP</span>
              </div>
            </div>

            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              {isArabic ? 'الطلب قيد المراجعة' : 'Request under review'}
            </span>

            <Button type="button" onClick={closeWithdrawalModal} className="mt-6 h-11 w-full">
              {isArabic ? 'تم' : 'Done'}
            </Button>
          </div>
        ) : (
        <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
          <div className="referral-available-earnings relative isolate overflow-hidden rounded-[1.25rem] border border-fuchsia-300/30 bg-[linear-gradient(135deg,#4c1d95,#7c3aed_48%,#c026d3)] p-4 text-center text-white shadow-[0_22px_54px_-28px_rgb(124_58_237/0.95)]">
            <span className="pointer-events-none absolute -end-8 -top-12 -z-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
            <p className="text-xs font-bold text-violet-100">{isArabic ? 'إجمالي أرباحك المتاحة' : 'Total available earnings'}</p>
            <p dir="ltr" className="mt-1 text-4xl font-black tracking-tight text-white drop-shadow-[0_4px_14px_rgb(0_0_0/0.28)]">
              {rewardTotal.toLocaleString('en-US')} <span className="text-base font-black text-amber-200">{currency}</span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-black text-[var(--color-text)]">{isArabic ? 'اختر طريقة السحب' : 'Choose withdrawal method'}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {enabledWithdrawalMethods.map((method) => <button key={method.id} type="button" onClick={() => setWithdrawalMethod(method.id)} className={`rounded-2xl border p-3 text-start transition-all ${withdrawalMethod === method.id ? 'border-[color:rgb(var(--color-primary-rgb)/0.5)] bg-[color:rgb(var(--color-primary-rgb)/0.12)] shadow-[0_14px_34px_-26px_rgb(var(--color-primary-rgb)/0.8)]' : 'border-[color:rgb(var(--color-border-rgb)/0.65)] bg-[color:rgb(var(--color-surface-rgb)/0.55)]'}`}><Smartphone className="h-5 w-5 text-[var(--color-primary)]" /><p className="mt-2 text-sm font-black text-[var(--color-text)]">{method.name}</p><p className="mt-0.5 text-[0.6rem] font-bold text-[var(--color-text-secondary)]">{method.requiresAccount ? (isArabic ? 'تحويل إلى رقم الحساب أو المحفظة' : 'Transfer to account or wallet number') : (isArabic ? 'تحويل داخل المنصة' : 'Transfer inside the platform')}</p></button>)}
            </div>
          </div>

          {withdrawalDiscountPercent > 0 && withdrawalRequestedAmount > 0 ? (
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/7 p-3 text-center">
              <div><p className="text-[0.55rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'المبلغ' : 'Amount'}</p><p dir="ltr" className="mt-1 text-xs font-black text-[var(--color-text)]">{withdrawalRequestedAmount.toLocaleString('en-US')} EGP</p></div>
              <div><p className="text-[0.55rem] font-bold text-amber-600 dark:text-amber-400">{isArabic ? `الخصم ${withdrawalDiscountPercent}%` : `Deduction ${withdrawalDiscountPercent}%`}</p><p dir="ltr" className="mt-1 text-xs font-black text-amber-600 dark:text-amber-400">-{withdrawalDiscountAmount.toLocaleString('en-US')} EGP</p></div>
              <div><p className="text-[0.55rem] font-bold text-emerald-600 dark:text-emerald-400">{isArabic ? 'صافي التحويل' : 'Net transfer'}</p><p dir="ltr" className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400">{withdrawalNetAmount.toLocaleString('en-US')} EGP</p></div>
            </div>
          ) : null}

          {selectedMethod?.requiresAccount ? (
            <div className="space-y-3 rounded-[1.25rem] border border-rose-400/18 bg-[linear-gradient(145deg,rgb(244_63_94/0.08),rgb(var(--color-surface-rgb)/0.56))] p-3.5 sm:p-4">
              <div className="mb-1 flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/12 text-rose-500">
                  <Smartphone className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-black text-[var(--color-text)]">{isArabic ? `بيانات ${selectedMethod.name}` : `${selectedMethod.name} details`}</p>
                  <p className="text-[0.65rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'تأكد من صحة البيانات قبل الإرسال' : 'Verify the details before submitting'}</p>
                </div>
              </div>
              <Input
                label={isArabic ? 'اسم صاحب الحساب' : 'Account holder name'}
                value={withdrawalForm.name}
                onChange={updateWithdrawalField('name')}
                placeholder={isArabic ? 'اكتب الاسم بالكامل' : 'Enter full name'}
                icon={<UserRound className="h-4 w-4" />}
                className="h-12 rounded-xl"
              />
              <Input
                label={isArabic ? 'رقم الحساب أو المحفظة' : 'Account or wallet number'}
                value={withdrawalForm.phone}
                onChange={updateWithdrawalField('phone')}
                inputMode="numeric"
                placeholder={isArabic ? 'اكتب رقم الحساب' : 'Enter account number'}
                icon={<Smartphone className="h-4 w-4" />}
                className="h-12 rounded-xl"
              />
              <Input
                label={(
                  <span className="flex items-center justify-between gap-3">
                    <span>{isArabic ? 'المبلغ المطلوب' : 'Requested amount'}</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {isArabic ? 'المتاح:' : 'Available:'} {rewardTotal.toLocaleString('en-US')} EGP
                    </span>
                  </span>
                )}
                value={withdrawalForm.amount}
                onChange={updateWithdrawalField('amount')}
                inputMode="decimal"
                placeholder="0.00 EGP"
                icon={<CircleDollarSign className="h-4 w-4" />}
                suffix={(
                  <button
                    type="button"
                    onClick={() => setWithdrawalForm((current) => ({
                      ...current,
                      amount: String(rewardTotal),
                    }))}
                    className="inline-flex h-7 min-w-14 items-center justify-center rounded-lg bg-emerald-500/12 px-2 text-[0.68rem] font-black text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                  >
                    {isArabic ? 'الكل' : 'All'}
                  </button>
                )}
                className={`h-12 rounded-xl ${isArabic ? 'pl-20' : 'pr-20'}`}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-400/18 bg-emerald-500/8 p-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CircleDollarSign className="h-5 w-5" />
                <p className="text-sm font-black">{isArabic ? 'إضافة الأرباح إلى محفظتك' : 'Add earnings to your wallet'}</p>
              </div>
              <div className="mt-3">
                <Input
                  label={(
                    <span className="flex items-center justify-between gap-3">
                      <span>{isArabic ? 'المبلغ المطلوب' : 'Requested amount'}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {isArabic ? 'المتاح:' : 'Available:'} {rewardTotal.toLocaleString('en-US')} {currency}
                      </span>
                    </span>
                  )}
                  value={withdrawalForm.amount}
                  onChange={updateWithdrawalField('amount')}
                  inputMode="decimal"
                  placeholder={`0.00 ${currency}`}
                  className={isArabic ? 'pl-20' : 'pr-20'}
                  suffix={(
                    <button
                      type="button"
                      onClick={() => setWithdrawalForm((current) => ({
                        ...current,
                        amount: String(rewardTotal),
                      }))}
                      className="inline-flex h-7 min-w-14 items-center justify-center rounded-lg bg-emerald-500/12 px-2 text-[0.68rem] font-black text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      {isArabic ? 'الكل' : 'All'}
                    </button>
                  )}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="h-12 w-full">
            {withdrawalMethod === 'wallet'
              ? (isArabic ? 'إرسال طلب التحويل للمحفظة' : 'Request wallet transfer')
              : (isArabic ? 'إرسال طلب سحب فودافون كاش' : 'Request Vodafone Cash withdrawal')}
          </Button>
        </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(selectedWithdrawal)}
        onClose={() => setSelectedWithdrawal(null)}
        title={isArabic ? 'تفاصيل التحويل' : 'Transfer details'}
        size="md"
      >
        {selectedWithdrawal ? (() => {
          const status = getWithdrawalStatus(selectedWithdrawal.status);
          const StatusIcon = status.icon;
          const isCompleted = selectedWithdrawal.status === 'completed' || selectedWithdrawal.status === 'success';
          return (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 rounded-[1.2rem] border p-4 ${status.className}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-current/10">
                  <StatusIcon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold opacity-75">{isArabic ? 'حالة العملية' : 'Transfer status'}</p>
                  <p className="mt-0.5 text-lg font-black">{status.label}</p>
                </div>
                {selectedWithdrawal.isTest ? <span className="rounded-full bg-violet-500/12 px-2 py-1 text-[0.58rem] font-black text-violet-500">{isArabic ? 'تجريبي' : 'Test'}</span> : null}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.55)] bg-[color:rgb(var(--color-surface-rgb)/0.58)] p-3">
                  <p className="text-[0.64rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'المبلغ' : 'Amount'}</p>
                  <p dir="ltr" className="mt-1 text-end text-xl font-black text-[var(--color-text)]">{selectedWithdrawal.amount.toLocaleString('en-US')} <span className="text-xs text-[var(--color-primary)]">{selectedWithdrawal.currency}</span></p>
                </div>
                <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.55)] bg-[color:rgb(var(--color-surface-rgb)/0.58)] p-3">
                  <p className="text-[0.64rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'طريقة التحويل' : 'Method'}</p>
                  <p className="mt-1 text-sm font-black text-[var(--color-text)]">{selectedWithdrawal.method === 'vodafone' ? (isArabic ? 'فودافون كاش' : 'Vodafone Cash') : (isArabic ? 'محفظة البرنامج' : 'App wallet')}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-[1.1rem] border border-[color:rgb(var(--color-border-rgb)/0.55)] bg-[color:rgb(var(--color-card-rgb)/0.52)] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]"><CalendarDays className="h-3.5 w-3.5" />{isArabic ? 'تاريخ الطلب' : 'Request date'}</span>
                  <span dir="ltr" className="text-xs font-black text-[var(--color-text)]">{formatWithdrawalDate(selectedWithdrawal.createdAt)}</span>
                </div>
                {isCompleted ? (
                  <div className="flex items-center justify-between gap-3 border-t border-[color:rgb(var(--color-border-rgb)/0.42)] pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]"><CheckCircle2 className="h-3.5 w-3.5" />{isArabic ? 'تاريخ الاكتمال' : 'Completion date'}</span>
                    <span dir="ltr" className="text-xs font-black text-[var(--color-text)]">{formatWithdrawalDate(selectedWithdrawal.completedAt)}</span>
                  </div>
                ) : null}
                {selectedWithdrawal.phone ? (
                  <div className="flex items-center justify-between gap-3 border-t border-[color:rgb(var(--color-border-rgb)/0.42)] pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]"><Smartphone className="h-3.5 w-3.5" />{isArabic ? 'رقم المحفظة' : 'Wallet number'}</span>
                    <span dir="ltr" className="text-xs font-black text-[var(--color-text)]">{selectedWithdrawal.phone}</span>
                  </div>
                ) : null}
              </div>

              {isCompleted && selectedWithdrawal.method === 'vodafone' ? (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-black text-[var(--color-text)]">{isArabic ? 'صورة تحويل فودافون كاش' : 'Vodafone Cash receipt'}</p>
                  </div>
                  {selectedWithdrawal.receiptImage ? (
                    <a href={selectedWithdrawal.receiptImage} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[1.2rem] border border-emerald-400/20 bg-emerald-500/5 p-2 shadow-[0_18px_42px_-30px_rgb(16_185_129/0.65)]">
                      <img src={selectedWithdrawal.receiptImage} alt={isArabic ? 'إيصال تحويل فودافون كاش' : 'Vodafone Cash transfer receipt'} className="h-auto w-full rounded-[0.9rem] object-cover transition-transform duration-300 group-hover:scale-[1.01]" />
                    </a>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[color:rgb(var(--color-border-rgb)/0.7)] p-5 text-center text-xs font-bold text-[var(--color-text-secondary)]">{isArabic ? 'لم يتم إرفاق صورة التحويل.' : 'No transfer receipt attached.'}</div>
                  )}
                </div>
              ) : null}

              <Button type="button" variant="secondary" onClick={() => setSelectedWithdrawal(null)} className="w-full">
                {isArabic ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          );
        })() : null}
      </Modal>
    </div>
  );
};

export default Referral;
