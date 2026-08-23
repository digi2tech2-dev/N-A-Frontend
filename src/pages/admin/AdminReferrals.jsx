import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  ImagePlus,
  Percent,
  Plus,
  Save,
  Search,
  Share2,
  TrendingUp,
  Trash2,
  UserRoundPlus,
  UsersRound,
  Wallet,
  XCircle,
} from 'lucide-react';
import useAdminStore from '../../store/useAdminStore';
import useGroupStore from '../../store/useGroupStore';
import agentProofImage from '../../assets/slide-3.webp';
import { resolveUserAvatar } from '../../utils/avatar';
import apiClient from '../../services/client';
import { isReferralApiEnabled } from '../../config/dataProvider';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

const REFERRAL_RATE_STORAGE_KEY = 'kanzcoins_admin_referral_commission_rate';
const WITHDRAWAL_METHODS_KEY = 'kanzcoins_referral_withdrawal_methods';
const WITHDRAWAL_REQUESTS_KEY = 'kanzcoins_referral_withdrawal_requests';
const SUB_AGENT_REQUESTS_KEY = 'oscar_sub_agent_requests';
const isRealProvider = isReferralApiEnabled;
const DEFAULT_METHODS = [
  { id: 'wallet', name: 'محفظة البرنامج', enabled: true, requiresAccount: false, discountPercent: 0 },
  { id: 'vodafone', name: 'فودافون كاش', enabled: true, requiresAccount: true, discountPercent: 0 },
  { id: 'instapay', name: 'إنستا باي', enabled: true, requiresAccount: true, discountPercent: 0 },
];
const DEMO_WITHDRAWAL_REQUESTS = [
  { id: 'demo-request-1', ownerName: 'أحمد محمد', ownerEmail: 'ahmed@kanzcoins.com', method: 'vodafone', methodName: 'فودافون كاش', accountHolder: 'أحمد محمد', accountNumber: '01012345678', amount: 50, currency: 'EGP', status: 'processing', createdAt: '2026-07-19T10:30:00Z', isTest: true },
  { id: 'demo-request-2', ownerName: 'مريم محمود', ownerEmail: 'mariam@kanzcoins.com', method: 'instapay', methodName: 'إنستا باي', accountHolder: 'مريم محمود', accountNumber: 'mariam.mahmoud@instapay', amount: 90, currency: 'EGP', status: 'processing', createdAt: '2026-07-19T12:15:00Z', isTest: true },
];
const DEMO_AGENT_REQUESTS = [
  { id: 'agent-request-1', name: 'أحمد محمد', email: 'ahmed@kanzcoins.com', message: 'لدي مجموعة من العملاء وأقوم بتوفير خدمات الشحن لهم بشكل مستمر، وأرغب في الانضمام إلى مجموعة الوكلاء الفرعيين.', proofImage: agentProofImage, status: 'pending', createdAt: '2026-07-19T12:30:00Z', isTest: true },
  { id: 'agent-request-2', name: 'مريم محمود', email: 'mariam@kanzcoins.com', message: 'أتعامل مع عدد من المتاجر والعملاء وأرفقت صورة توضح نشاطي الحالي.', proofImage: agentProofImage, status: 'pending', createdAt: '2026-07-20T09:15:00Z', isTest: true },
];

const DEMO_REFERRALS = [
  {
    id: 'demo-ahmed', name: 'أحمد محمد', email: 'ahmed@kanzcoins.com', code: 'AHMED25',
    earnings: 250, withdrawn: 50, currency: 'EGP', invitedAt: '2026-07-01T10:00:00Z', isTest: true,
    referrals: [
      { id: 'demo-1', name: 'محمد علي', email: 'mohamed.ali@test.com', addedAmount: 1000, earnings: 50, invitedAt: '2026-07-02T12:00:00Z' },
      { id: 'demo-2', name: 'سارة حسن', email: 'sara.hassan@test.com', addedAmount: 2500, earnings: 125, invitedAt: '2026-07-05T09:30:00Z' },
      { id: 'demo-3', name: 'عمر خالد', email: 'omar.khaled@test.com', addedAmount: 1500, earnings: 75, invitedAt: '2026-07-09T18:15:00Z' },
    ],
    withdrawals: [{ id: 'wd-1', amount: 50, status: 'completed', createdAt: '2026-07-15T18:30:00Z' }],
  },
  {
    id: 'demo-mariam', name: 'مريم محمود', email: 'mariam@kanzcoins.com', code: 'MARYAM9',
    earnings: 90, withdrawn: 0, currency: 'EGP', invitedAt: '2026-07-08T10:00:00Z', isTest: true,
    referrals: [
      { id: 'demo-4', name: 'نور أحمد', email: 'nour.ahmed@test.com', addedAmount: 1200, earnings: 60, invitedAt: '2026-07-10T11:00:00Z' },
      { id: 'demo-5', name: 'يوسف سامي', email: 'youssef.samy@test.com', addedAmount: 600, earnings: 30, invitedAt: '2026-07-12T14:00:00Z' },
    ], withdrawals: [],
  },
];

const number = (value) => Number(value || 0) || 0;
const getReferrals = (user) => user?.referrals || user?.referredCustomers || user?.invitedCustomers || [];
const getWithdrawals = (user) => user?.referralWithdrawals || user?.withdrawalRequests || [];

const normalizeOwner = (user, index) => {
  const referrals = (Array.isArray(getReferrals(user)) ? getReferrals(user) : []).map((entry, referralIndex) => ({
    id: entry?.id || entry?._id || `${user?.id || index}-${referralIndex}`,
    name: entry?.name || entry?.username || entry?.email || `مستخدم ${referralIndex + 1}`,
    email: entry?.email || '',
    avatar: resolveUserAvatar(entry, entry?.email || entry?.name),
    addedAmount: number(entry?.addedAmount ?? entry?.totalDeposits ?? entry?.depositsTotal ?? entry?.topupTotal),
    earnings: number(entry?.earnings ?? entry?.referralEarnings ?? entry?.commission),
    invitedAt: entry?.invitedAt || entry?.referralCreatedAt || entry?.joinedAt || entry?.createdAt,
  }));
  const withdrawals = Array.isArray(getWithdrawals(user)) ? getWithdrawals(user) : [];
  const referralsEarnings = referrals.reduce((total, entry) => total + entry.earnings, 0);
  const withdrawn = withdrawals
    .filter((entry) => String(entry?.status || '').toLowerCase() === 'completed')
    .reduce((total, entry) => total + number(entry?.amount), 0);

  return {
    id: user?.id || user?._id || `owner-${index}`,
    name: user?.name || user?.username || user?.email || `مستخدم ${index + 1}`,
    email: user?.email || '',
    avatar: resolveUserAvatar(user, user?.email || user?.name),
    code: user?.referralCode || user?.inviteCode || '—',
    currency: String(user?.currency || 'EGP').toUpperCase(),
    referrals,
    withdrawals,
    earnings: number(user?.referralRewards ?? user?.referralEarnings ?? referralsEarnings),
    withdrawn,
    isTest: Boolean(user?.isTest),
  };
};

const formatDate = (value, locale = 'ar-EG') => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const AdminReferrals = () => {
  const { dir } = useLanguage();
  const isArabic = dir === 'rtl';
  const { addToast } = useToast();
  const { users, loadUsers, isLoadingUsers, updateUserGroup } = useAdminStore();
  const { groups, loadGroups } = useGroupStore();
  const [query, setQuery] = useState('');
  const [activePanel, setActivePanel] = useState('earnings');
  const [filter, setFilter] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [newMethodName, setNewMethodName] = useState('');
  const [adminReferralOwners, setAdminReferralOwners] = useState([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState(() => {
    if (isRealProvider) return DEFAULT_METHODS;
    try { return JSON.parse(window.localStorage.getItem(WITHDRAWAL_METHODS_KEY)) || DEFAULT_METHODS; } catch { return DEFAULT_METHODS; }
  });
  const [requestOverrides, setRequestOverrides] = useState({});
  const [agentRequests, setAgentRequests] = useState(() => {
    if (isRealProvider) return [];
    try { return JSON.parse(window.localStorage.getItem(SUB_AGENT_REQUESTS_KEY)) || DEMO_AGENT_REQUESTS; } catch { return DEMO_AGENT_REQUESTS; }
  });
  const [agentGroupSelections, setAgentGroupSelections] = useState({});
  const [localRequests, setLocalRequests] = useState(() => {
    if (isRealProvider) return [];
    try { return JSON.parse(window.localStorage.getItem(WITHDRAWAL_REQUESTS_KEY)) || []; } catch { return []; }
  });
  const [commissionRate, setCommissionRate] = useState(() => {
    if (isRealProvider) return 1;
    const savedRate = typeof window !== 'undefined' ? Number(window.localStorage.getItem(REFERRAL_RATE_STORAGE_KEY)) : 5;
    return Number.isFinite(savedRate) && savedRate >= 0 && savedRate <= 100 ? savedRate : 5;
  });
  const [adminActionBusy, setAdminActionBusy] = useState(false);

  const getRequestErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.message || fallback;

  const loadRealReferralAdminData = async () => {
    if (!isRealProvider) return;
    const [agents, requests, payouts, methods, defaultRate] = await Promise.all([
      apiClient.referrals.adminAgents({ limit: 100, search: query }),
      apiClient.referrals.adminSubAgentRequests({ limit: 100 }),
      apiClient.referrals.adminPayouts({ limit: 100 }),
      apiClient.referrals.adminPayoutMethods(),
      apiClient.referrals.getDefaultCommissionRate(),
    ]);
    setAdminReferralOwners(Array.isArray(agents?.agents) ? agents.agents : []);
    setAgentRequests(Array.isArray(requests?.requests) ? requests.requests : []);
    setLocalRequests(Array.isArray(payouts?.payouts) ? payouts.payouts : []);
    if (Array.isArray(methods) && methods.length) setWithdrawalMethods(methods);
    setCommissionRate(defaultRate);
  };

  useEffect(() => {
    loadUsers().catch(() => {});
    loadGroups({ force: true }).catch(() => {});
    if (isRealProvider) {
      loadRealReferralAdminData().catch((error) => {
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر تحميل بيانات الإحالة.' : 'Unable to load referral data.'),
          'error'
        );
      });
    }
  }, [loadGroups, loadUsers, query, isArabic]);

  const persistAgentRequests = (nextRequests) => {
    setAgentRequests(nextRequests);
    if (isRealProvider) return;
    window.localStorage.setItem(SUB_AGENT_REQUESTS_KEY, JSON.stringify(nextRequests));
  };

  const updateAgentRequestStatus = async (request, status) => {
    if (adminActionBusy) return;
    if (status === 'approved') {
      const selectedGroupId = agentGroupSelections[request.id];
      const selectedGroup = groups.find((group) => String(group.id || group._id) === String(selectedGroupId));
      if (!selectedGroup) {
        addToast(isArabic ? 'اختر مجموعة الوكلاء الجديدة أولًا.' : 'Choose the new agent group first.', 'error');
        return;
      }
      if (isRealProvider) {
        try {
          setAdminActionBusy(true);
          await apiClient.referrals.approveSubAgentRequest(request.id, { groupId: selectedGroupId });
          await Promise.all([loadRealReferralAdminData(), loadUsers()]);
          addToast(isArabic ? 'تم قبول الطلب وتغيير مجموعة المستخدم.' : 'Request approved and user group updated.', 'success');
        } catch (error) {
          addToast(
            getRequestErrorMessage(error, isArabic ? 'تعذر قبول الطلب.' : 'Unable to approve request.'),
            'error'
          );
        } finally {
          setAdminActionBusy(false);
        }
        return;
      }
      const matchedUser = users.find((entry) => String(entry.email || '').toLowerCase() === String(request.email || '').toLowerCase());
      if (matchedUser) await updateUserGroup(matchedUser.id || matchedUser._id, selectedGroup);
    }
    if (isRealProvider) {
      try {
        setAdminActionBusy(true);
        await apiClient.referrals.rejectSubAgentRequest(request.id, {
          reason: request.rejectionReason || request.adminNotes || 'Rejected by admin.',
        });
        await loadRealReferralAdminData();
        addToast(isArabic ? 'تم رفض الطلب.' : 'Request rejected.', 'warning');
      } catch (error) {
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر رفض الطلب.' : 'Unable to reject request.'),
          'error'
        );
      } finally {
        setAdminActionBusy(false);
      }
      return;
    }
    persistAgentRequests(agentRequests.map((entry) => entry.id === request.id ? { ...entry, status, reviewedAt: new Date().toISOString() } : entry));
    window.dispatchEvent(new CustomEvent('sub-agent-status-updated', { detail: { email: request.email, status } }));
    addToast(status === 'approved' ? (isArabic ? 'تم قبول الطلب وتغيير مجموعة المستخدم.' : 'Request approved and user group updated.') : (isArabic ? 'تم رفض الطلب.' : 'Request rejected.'), status === 'approved' ? 'success' : 'warning');
  };

  const realOwners = useMemo(() => (isRealProvider ? adminReferralOwners : (Array.isArray(users) ? users : []))
    .map(normalizeOwner)
    .filter((owner) => owner.referrals.length || owner.earnings || owner.withdrawals.length), [adminReferralOwners, users]);
  const owners = useMemo(() => {
    if (realOwners.length) return realOwners;
    if (isRealProvider) return [];
    return DEMO_REFERRALS.map((entry, index) => {
      const owner = normalizeOwner(entry, index);
      const referrals = owner.referrals.map((referral) => ({
        ...referral,
        earnings: Number(((referral.addedAmount * commissionRate) / 100).toFixed(2)),
      }));
      return { ...owner, referrals, earnings: referrals.reduce((sum, referral) => sum + referral.earnings, 0) };
    });
  }, [realOwners, commissionRate]);

  const saveCommissionRate = async () => {
    const normalizedRate = Math.min(100, Math.max(0, number(commissionRate)));
    if (isRealProvider) {
      try {
        setAdminActionBusy(true);
        const savedRate = await apiClient.referrals.updateDefaultCommissionRate(normalizedRate);
        setCommissionRate(savedRate);
        await loadRealReferralAdminData();
        addToast(
          isArabic
            ? `تم حفظ النسبة: سيحصل الداعي على ${savedRate}% من إيداعات المدعوين.`
            : `Rate saved: inviters will receive ${savedRate}% of invited users' deposits.`,
          'success'
        );
      } catch (error) {
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر حفظ النسبة.' : 'Unable to save rate.'),
          'error'
        );
      } finally {
        setAdminActionBusy(false);
      }
      return;
    }
    setCommissionRate(normalizedRate);
    window.localStorage.setItem(REFERRAL_RATE_STORAGE_KEY, String(normalizedRate));
    addToast(
      isArabic
        ? `تم حفظ النسبة: سيحصل الداعي على ${normalizedRate}% من إيداعات المدعوين.`
        : `Rate saved: inviters will receive ${normalizedRate}% of invited users' deposits.`,
      'success'
    );
  };

  const persistMethods = async (nextMethods) => {
    setWithdrawalMethods(nextMethods);
    if (isRealProvider) {
      try {
        const savedMethods = await apiClient.referrals.updateAdminPayoutMethods(nextMethods);
        if (Array.isArray(savedMethods) && savedMethods.length) setWithdrawalMethods(savedMethods);
      } catch (error) {
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر حفظ طرق السحب.' : 'Unable to save withdrawal methods.'),
          'error'
        );
        return false;
      }
      return true;
    }
    window.localStorage.setItem(WITHDRAWAL_METHODS_KEY, JSON.stringify(nextMethods));
    return true;
  };
  const addWithdrawalMethod = async () => {
    const name = newMethodName.trim();
    if (!name) return;
    const saved = await persistMethods([...withdrawalMethods, { id: `method-${Date.now()}`, name, enabled: true, requiresAccount: true, discountPercent: 0 }]);
    if (!saved) return;
    setNewMethodName('');
    addToast(isArabic ? `تمت إضافة طريقة السحب: ${name}` : `Withdrawal method added: ${name}`, 'success');
  };
  const updateRequest = async (request, updates) => {
    const next = { ...request, ...updates };
    if (isRealProvider) {
      if (!updates.status) {
        setRequestOverrides((current) => ({ ...current, [request.id]: next }));
        return;
      }
      try {
        setAdminActionBusy(true);
        if (updates.status === 'failed') {
          await apiClient.referrals.rejectPayout(request.id, {
            reason: request.rejectionReason || request.adminNotes || 'Rejected by admin.',
          });
        } else if (updates.status === 'completed') {
          const isWalletPayout = request.raw?.method === 'WALLET_CREDIT' || String(request.method || '').toLowerCase() === 'wallet';
          if (isWalletPayout) {
            await apiClient.referrals.payWalletPayout(request.id);
          } else {
            await apiClient.referrals.markManualPayoutPaid(request.id, {
              receiptFile: next.receiptFile,
              reference: next.reference || next.externalTransactionReference || '',
            });
          }
        }
        setRequestOverrides((current) => {
          const copy = { ...current };
          delete copy[request.id];
          return copy;
        });
        await loadRealReferralAdminData();
      } catch (error) {
        setRequestOverrides((current) => ({ ...current, [request.id]: next }));
        addToast(
          getRequestErrorMessage(error, isArabic ? 'تعذر تحديث طلب السحب.' : 'Unable to update withdrawal request.'),
          'error'
        );
      } finally {
        setAdminActionBusy(false);
      }
      return;
    }
    setRequestOverrides((current) => ({ ...current, [request.id]: next }));
    if (request.isLocal) {
      const nextRequests = localRequests.map((entry) => entry.id === request.id ? next : entry);
      setLocalRequests(nextRequests);
      window.localStorage.setItem(WITHDRAWAL_REQUESTS_KEY, JSON.stringify(nextRequests));
    }
  };
  const attachReceipt = (request, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateRequest(request, { receiptImage: reader.result, receiptFile: file });
    reader.readAsDataURL(file);
  };
  const copyRequestValue = async (value, label) => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      addToast(isArabic ? `تم نسخ ${label}` : `${label} copied`, 'success');
    } catch {
      addToast(isArabic ? 'تعذر النسخ.' : 'Could not copy.', 'error');
    }
  };

  const visibleOwners = useMemo(() => owners.filter((owner) => {
    const term = query.trim().toLowerCase();
    const matchesSearch = !term || `${owner.name} ${owner.email} ${owner.code}`.toLowerCase().includes(term);
    const matchesFilter = filter === 'all'
      || (filter === 'active' && owner.referrals.length > 0)
      || (filter === 'balance' && owner.earnings - owner.withdrawn > 0);
    return matchesSearch && matchesFilter;
  }), [owners, query, filter]);

  const stats = useMemo(() => ({
    owners: owners.length,
    invited: owners.reduce((sum, owner) => sum + owner.referrals.length, 0),
    deposits: owners.reduce((sum, owner) => sum + owner.referrals.reduce((total, referral) => total + referral.addedAmount, 0), 0),
    earnings: owners.reduce((sum, owner) => sum + owner.earnings, 0),
    withdrawn: owners.reduce((sum, owner) => sum + owner.withdrawn, 0),
  }), [owners]);

  const currency = owners[0]?.currency || 'EGP';
  const allWithdrawalRequests = useMemo(() => {
    const gatheredRequests = [
      ...localRequests.map((request) => ({ ...request, isLocal: true })),
      ...(isRealProvider ? [] : owners.flatMap((owner) => owner.withdrawals.map((request, index) => ({ ...request, id: request?.id || `${owner.id}-withdrawal-${index}`, ownerName: owner.name, ownerEmail: owner.email, ownerAvatar: owner.avatar, currency: request?.currency || owner.currency })))),
    ];
    const requests = gatheredRequests.length || isRealProvider ? gatheredRequests : DEMO_WITHDRAWAL_REQUESTS;
    return requests.map((request) => {
      const resolvedRequest = requestOverrides[request.id] || request;
      const methodSettings = withdrawalMethods.find((method) => method.id === resolvedRequest.method);
      const requestedAmount = number(resolvedRequest.requestedAmount ?? resolvedRequest.amount);
      const discountPercent = Math.min(100, Math.max(0, number(methodSettings?.discountPercent ?? resolvedRequest.discountPercent)));
      const discountAmount = Number(((requestedAmount * discountPercent) / 100).toFixed(2));
      const netAmount = Number(Math.max(0, requestedAmount - discountAmount).toFixed(2));
      return {
        ...resolvedRequest,
        requestedAmount,
        discountPercent,
        discountAmount,
        amount: netAmount,
      };
    });
  }, [owners, localRequests, requestOverrides, withdrawalMethods]);
  const locale = isArabic ? 'ar-EG' : 'en-GB';
  const statCards = [
    { label: isArabic ? 'أصحاب أكواد الإحالة' : 'Referral owners', value: stats.owners, icon: Share2, iconClass: 'bg-violet-500/10 text-violet-500' },
    { label: isArabic ? 'إجمالي المدعوين' : 'Total invited', value: stats.invited, icon: UserRoundPlus, iconClass: 'bg-sky-500/10 text-sky-500' },
    { label: isArabic ? 'إيداعات المدعوين' : 'Invited deposits', value: `${stats.deposits.toLocaleString('en-US')} ${currency}`, icon: Wallet, iconClass: 'bg-amber-500/10 text-amber-500' },
    { label: isArabic ? 'إجمالي الأرباح' : 'Total earnings', value: `${stats.earnings.toLocaleString('en-US')} ${currency}`, icon: TrendingUp, iconClass: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <div className="admin-referrals-page mx-auto w-full max-w-[1500px] space-y-3 pb-10" dir={dir}>
      <section className="relative isolate overflow-hidden border-b-[6px] border-[#fb923c] bg-[linear-gradient(105deg,#172554,#0f3d3e_55%,#14532d)] px-4 py-3 text-white shadow-[10px_10px_0_#17255422]">
        <div className="absolute -end-8 -top-12 h-28 w-28 rotate-45 bg-[#fb923c]/20" />
        <div className="relative block">
          <span className="absolute start-0 top-0 grid h-9 w-9 place-items-center border-2 border-[#fdba74] bg-[#fb923c] text-[#172554]"><BadgeDollarSign className="h-4 w-4" /></span>
          <div className="w-full px-10">
            <span className="block text-center text-[0.5rem] font-black text-[#fed7aa]">{isArabic ? 'إدارة نظام المكافآت' : 'Rewards management'}</span>
            <div className="mx-auto mt-2 grid w-full max-w-md grid-cols-2 gap-2 border border-white/20 bg-black/20 p-1.5">
              <button type="button" onClick={() => setActivePanel('earnings')} aria-pressed={activePanel === 'earnings'} className={`flex h-9 items-center justify-center border px-2 text-[0.68rem] font-black transition-all sm:text-xs ${activePanel === 'earnings' ? 'border-[#fdba74] bg-[#fb923c] text-[#172554]' : 'border-transparent bg-white/5 text-white/72 hover:bg-white/12 hover:text-white'}`}>{isArabic ? 'أرباح كود الإحالة' : 'Referral code earnings'}</button>
              <button type="button" onClick={() => setActivePanel('agents')} aria-pressed={activePanel === 'agents'} className={`flex h-9 items-center justify-center gap-1 border px-2 text-[0.68rem] font-black transition-all sm:text-xs ${activePanel === 'agents' ? 'border-[#bbf7d0] bg-[#dcfce7] text-[#14532d]' : 'border-transparent bg-white/5 text-white/72 hover:bg-white/12 hover:text-white'}`}><span>{isArabic ? 'طلبات الوكلاء الفرعيين' : 'Sub-agent requests'}</span><span className={`grid h-4 min-w-4 place-items-center px-1 text-[0.5rem] ${activePanel === 'agents' ? 'bg-[#14532d] text-white' : 'bg-white/15 text-white'}`}>{agentRequests.filter((request) => request.status === 'pending').length}</span></button>
            </div>
          </div>
        </div>
      </section>

      <section className={`${activePanel === 'agents' ? '' : 'hidden'} overflow-hidden border-2 border-[#14532d]/25 border-t-[6px] border-t-[#22c55e] bg-[linear-gradient(135deg,rgb(220_252_231/.72),rgb(var(--color-card-rgb)/.96)_50%,rgb(255_237_213/.65))] shadow-[9px_9px_0_#14532d1c] dark:bg-[linear-gradient(135deg,#102b24,#111827_55%,#33210f)]`}>
        <div className="flex items-center justify-between gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.48)] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center bg-[#14532d] text-[#86efac] shadow-[3px_3px_0_#fb923c]"><UserRoundPlus className="h-4 w-4" /></span>
            <div><h2 className="text-xs font-black text-[var(--color-text)]">{isArabic ? 'طلبات الوكلاء الفرعيين' : 'Sub-agent requests'}</h2><p className="text-[0.55rem] font-semibold text-[var(--color-text-secondary)]">{isArabic ? 'راجع الرسالة والإثبات ثم اختر المجموعة المناسبة.' : 'Review the message and proof, then select the appropriate group.'}</p></div>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[0.55rem] font-black text-amber-500">{agentRequests.filter((request) => request.status === 'pending').length} {isArabic ? 'معلق' : 'pending'}</span>
        </div>
        <div className="grid gap-2 p-2.5 lg:grid-cols-2">
          {agentRequests.map((request) => {
            const status = String(request.status || 'pending');
            return (
              <article key={request.id} className="border border-[#14532d]/25 border-s-4 border-s-[#fb923c] bg-white/60 p-3 shadow-[4px_4px_0_#14532d14] dark:bg-[#091b20]/65">
                <div className="flex items-center gap-2.5">
                  <img src={resolveUserAvatar({ name: request.name, email: request.email }, request.email)} alt={request.name} className="h-10 w-10 rounded-full object-cover" />
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-xs font-black text-[var(--color-text)]">{request.name}</p>{request.isTest ? <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[0.5rem] font-black text-violet-500">{isArabic ? 'تجريبي' : 'Demo'}</span> : null}</div><p dir="ltr" className="truncate text-left text-[0.58rem] text-[var(--color-text-secondary)]">{request.email}</p></div>
                  <span className={`rounded-full px-2 py-1 text-[0.52rem] font-black ${status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>{status === 'approved' ? (isArabic ? 'مقبول' : 'Approved') : status === 'rejected' ? (isArabic ? 'مرفوض' : 'Rejected') : (isArabic ? 'قيد المراجعة' : 'Pending')}</span>
                </div>
                <div className="mt-2.5 border-y border-[#14532d]/20 bg-[#14532d]/5 p-2.5"><p className="text-[0.52rem] font-black text-[#15803d]">{isArabic ? 'رسالة المتقدم' : 'Applicant message'}</p><p className="mt-1 text-[0.66rem] font-semibold leading-5 text-[var(--color-text-secondary)]">{request.message}</p></div>
                <a href={request.proofImage} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg border border-violet-400/18 bg-violet-500/6 p-2 transition hover:border-violet-400/35"><img src={request.proofImage} alt={isArabic ? 'صورة إثبات العملاء' : 'Customer proof'} className="h-12 w-20 rounded-md object-cover" /><div><p className="text-[0.58rem] font-black text-[var(--color-text)]">{isArabic ? 'صورة إثبات وجود عملاء' : 'Customer proof image'}</p><p className="text-[0.5rem] font-semibold text-violet-500">{isArabic ? 'اضغط لعرض الصورة كاملة' : 'Open full image'}</p></div></a>
                {status === 'pending' ? <div className="mt-2.5 flex items-center gap-1.5"><select value={agentGroupSelections[request.id] || ''} onChange={(event) => setAgentGroupSelections((current) => ({ ...current, [request.id]: event.target.value }))} className="h-6 min-w-0 max-w-36 flex-1 rounded-md border border-[color:rgb(var(--color-border-rgb)/0.6)] bg-[var(--color-surface)] px-1.5 text-[0.48rem] font-black text-[var(--color-text)] outline-none"><option value="">{isArabic ? 'اختر المجموعة الجديدة' : 'Choose new group'}</option>{groups.map((group) => <option key={group.id || group._id} value={group.id || group._id}>{isArabic ? (group.nameAr || group.name) : (group.name || group.nameAr)}</option>)}</select><button type="button" onClick={() => updateAgentRequestStatus(request, 'rejected')} className="h-8 rounded-lg bg-rose-500/10 px-2 text-[0.55rem] font-black text-rose-500">{isArabic ? 'رفض' : 'Reject'}</button><button type="button" onClick={() => updateAgentRequestStatus(request, 'approved')} className="h-8 rounded-lg bg-emerald-500 px-2.5 text-[0.55rem] font-black text-white">{isArabic ? 'قبول وتغيير المجموعة' : 'Approve'}</button></div> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={`${activePanel === 'earnings' ? '' : 'hidden'} relative overflow-hidden rounded-xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgb(16_185_129/0.07),rgb(var(--color-card-rgb)/0.9)_60%,rgb(124_58_237/0.05))] p-2.5 shadow-[0_14px_35px_-30px_rgb(16_185_129/0.7)]`}>
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500"><Percent className="h-4 w-4" /></span>
            <div>
              <h2 className="text-xs font-black text-[var(--color-text)]">{isArabic ? 'نسبة ربح الداعي' : 'Inviter commission rate'}</h2>
              <p className="mt-0.5 max-w-lg text-[0.56rem] font-semibold leading-3.5 text-[var(--color-text-secondary)]">{isArabic ? 'النسبة التي يحصل عليها صاحب كود الإحالة من إيداعات المدعوين.' : 'The referral-code owner’s share of invited users’ deposits.'}</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <label className="block">
              <span className="mb-0.5 block text-[0.52rem] font-black text-[var(--color-text-secondary)]">{isArabic ? 'النسبة الحالية' : 'Current rate'}</span>
              <div className="flex h-8 w-24 items-center overflow-hidden rounded-lg border border-emerald-400/25 bg-[var(--color-surface)] focus-within:border-emerald-400">
                <input type="number" min="0" max="100" step="0.1" value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} className="h-full min-w-0 flex-1 appearance-none bg-transparent px-1.5 text-center text-sm font-black text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                <span className="grid h-full w-7 place-items-center border-s border-emerald-400/15 bg-emerald-500/10 text-[0.65rem] font-black text-emerald-500">%</span>
              </div>
            </label>
            <button type="button" onClick={saveCommissionRate} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2.5 text-[0.58rem] font-black text-white shadow-[0_10px_22px_-14px_rgb(16_185_129/0.9)] transition hover:bg-emerald-600"><Save className="h-3 w-3" />{isArabic ? 'حفظ' : 'Save'}</button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 border-t border-[color:rgb(var(--color-border-rgb)/0.35)] pt-2">
          {[100, 5000].map((amount) => <div key={amount} className="rounded-md bg-[color:rgb(var(--color-card-rgb)/0.55)] px-1 py-1 text-center"><p className="truncate text-[0.46rem] font-bold text-[var(--color-text-secondary)]">{amount.toLocaleString('en-US')} EGP</p><p dir="ltr" className="mt-0.5 truncate text-[0.58rem] font-black text-emerald-500">+{((amount * number(commissionRate)) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP</p></div>)}
        </div>
      </section>

      <section className={`${activePanel === 'earnings' ? '' : 'hidden'} sticky top-2 z-20 grid grid-cols-4 gap-2 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.45)] bg-[color:rgb(var(--color-card-rgb)/0.94)] p-2 shadow-[0_12px_35px_-24px_rgb(0_0_0/0.55)] backdrop-blur-xl`}>
        {statCards.map(({ label, value, icon: Icon, iconClass }) => (
          <article key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.4)] bg-[color:rgb(var(--color-surface-rgb)/0.6)] px-2.5 py-2.5 sm:px-3">
            <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid ${iconClass}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.56rem] font-bold text-[var(--color-text-secondary)] sm:text-[0.65rem]">{label}</p>
              <p dir="ltr" className="mt-1 truncate text-end text-xs font-black text-[var(--color-text)] sm:text-base">{value}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={`${activePanel === 'earnings' ? '' : 'hidden'} overflow-hidden rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.55)] bg-[color:rgb(var(--color-card-rgb)/0.82)] shadow-[0_18px_50px_-42px_rgb(var(--color-primary-rgb)/0.7)]`}>
        <div className="flex items-center justify-between gap-2 border-b border-[color:rgb(var(--color-border-rgb)/0.5)] p-2">
          <div className="shrink-0"><h2 className="text-[0.65rem] font-black text-[var(--color-text)]">{isArabic ? 'تفاصيل أرباح المستخدمين' : 'User earnings details'}</h2><p className="mt-0.5 text-[0.48rem] font-semibold text-[var(--color-text-secondary)]">{visibleOwners.length} {isArabic ? 'مستخدم' : 'users'}</p></div>
          <div className="flex min-w-0 flex-1 justify-end gap-0.5">
            <label className="relative min-w-0 max-w-24 flex-1"><Search className="absolute start-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 text-[var(--color-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isArabic ? 'ابحث بالاسم أو الكود...' : 'Search name or code...'} className="h-3 w-full rounded-full border border-[color:rgb(var(--color-border-rgb)/0.65)] bg-[var(--color-surface)] pe-0.5 ps-2.5 text-[0.31rem] font-bold leading-none text-[var(--color-text)] outline-none focus:border-violet-400" /></label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-3 max-w-10 appearance-none rounded-full border border-[color:rgb(var(--color-border-rgb)/0.65)] bg-[var(--color-surface)] px-0.5 text-[0.31rem] font-black leading-none text-[var(--color-text)] outline-none">
              <option value="all">{isArabic ? 'الكل' : 'All'}</option><option value="active">{isArabic ? 'لديه مدعوون' : 'Has invites'}</option><option value="balance">{isArabic ? 'رصيد متاح' : 'Available balance'}</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-[color:rgb(var(--color-border-rgb)/0.42)]">
          {visibleOwners.map((owner) => {
            const available = Math.max(0, owner.earnings - owner.withdrawn);
            return <article
              key={owner.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedOwner(owner)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedOwner(owner);
                }
              }}
              className="grid cursor-pointer grid-cols-3 gap-x-2 gap-y-3 p-3 transition-all hover:bg-[color:rgb(var(--color-primary-rgb)/0.055)] focus-visible:bg-[color:rgb(var(--color-primary-rgb)/0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 lg:grid-cols-[minmax(240px,1.3fr)_repeat(3,minmax(120px,.65fr))_auto] lg:items-center lg:gap-4 sm:p-5"
            >
              <div className="col-span-2 row-start-1 flex min-w-0 items-center gap-2 lg:col-span-1 lg:row-auto lg:gap-3"><img src={owner.avatar} alt={owner.name} className="h-10 w-10 rounded-full border-2 border-violet-400/25 object-cover shadow-md lg:h-12 lg:w-12" /><div className="min-w-0"><div className="flex items-center gap-1.5"><p className="truncate text-xs font-black text-[var(--color-text)] lg:text-sm">{owner.name}</p>{owner.isTest ? <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[0.48rem] font-black text-violet-500 lg:px-2 lg:text-[0.55rem]">{isArabic ? 'تجريبي' : 'Demo'}</span> : null}</div><p dir="ltr" className="truncate text-left text-[0.56rem] font-semibold text-[var(--color-text-secondary)] lg:text-[0.66rem]">{owner.email}</p><span dir="ltr" className="mt-0.5 inline-flex rounded-md bg-violet-500/10 px-1.5 py-0.5 font-mono text-[0.52rem] font-black tracking-wider text-violet-500 lg:mt-1 lg:px-2 lg:text-[0.62rem]">{owner.code}</span></div></div>
              <div className="col-start-1 row-start-2 min-w-0 lg:col-auto lg:row-auto"><p className="text-[0.5rem] font-bold text-[var(--color-text-secondary)] lg:text-[0.6rem]">{isArabic ? 'المدعوون' : 'Invited'}</p><div className="mt-0.5 flex items-center gap-1"><p className="text-sm font-black text-[var(--color-text)] lg:text-base">{owner.referrals.length}</p><div className="flex -space-x-2 rtl:space-x-reverse">{owner.referrals.slice(0, 3).map((referral) => <img key={referral.id} src={referral.avatar} alt="" title={referral.name} className="h-5 w-5 rounded-full border-2 border-[var(--color-card)] object-cover lg:h-6 lg:w-6" />)}</div></div></div>
              <div className="col-start-2 row-start-2 min-w-0 lg:col-auto lg:row-auto"><p className="truncate text-[0.5rem] font-bold text-[var(--color-text-secondary)] lg:text-[0.6rem]">{isArabic ? 'إجمالي الربح' : 'Total earnings'}</p><p dir="ltr" className="mt-0.5 truncate text-end text-xs font-black text-emerald-500 lg:mt-1 lg:text-base">+{owner.earnings.toLocaleString('en-US')} <span className="text-[0.52rem] lg:text-[0.62rem]">{owner.currency}</span></p></div>
              <div className="col-start-3 row-start-2 min-w-0 lg:col-auto lg:row-auto"><p className="truncate text-[0.5rem] font-bold text-[var(--color-text-secondary)] lg:text-[0.6rem]">{isArabic ? 'متاح للسحب' : 'Available'}</p><p dir="ltr" className="mt-0.5 truncate text-end text-xs font-black text-violet-500 lg:mt-1 lg:text-base">{available.toLocaleString('en-US')} <span className="text-[0.52rem] lg:text-[0.62rem]">{owner.currency}</span></p><p className="mt-0.5 truncate text-[0.46rem] font-bold text-[var(--color-text-secondary)] lg:mt-1 lg:text-[0.56rem]">{isArabic ? `تم سحب ${owner.withdrawn.toLocaleString('en-US')}` : `${owner.withdrawn.toLocaleString('en-US')} withdrawn`}</p></div>
              <button type="button" onClick={() => setSelectedOwner(owner)} aria-label={isArabic ? 'عرض التفاصيل' : 'View details'} className="col-start-3 row-start-1 inline-flex h-9 items-center justify-self-end gap-1 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 text-[0.55rem] font-black text-violet-500 transition hover:bg-violet-500/15 lg:col-auto lg:row-auto lg:h-10 lg:justify-self-auto lg:gap-2 lg:rounded-xl lg:px-3 lg:text-xs"><Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" /><span className="hidden sm:inline">{isArabic ? 'التفاصيل' : 'Details'}</span><ChevronLeft className="hidden h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180 lg:block" /></button>
            </article>;
          })}
          {!visibleOwners.length ? <div className="p-12 text-center"><UsersRound className="mx-auto h-9 w-9 text-[var(--color-muted)]" /><p className="mt-3 text-sm font-black text-[var(--color-text)]">{isArabic ? 'لا توجد نتائج مطابقة' : 'No matching results'}</p></div> : null}
        </div>
      </section>

      <section className={`${activePanel === 'earnings' ? '' : 'hidden'} grid gap-4 xl:grid-cols-2`}>
        <div className="rounded-[1.4rem] border border-[color:rgb(var(--color-border-rgb)/0.55)] bg-[color:rgb(var(--color-card-rgb)/0.84)] p-4">
          <h2 className="text-sm font-black text-[var(--color-text)]">{isArabic ? 'طرق سحب أرباح الإحالة' : 'Referral withdrawal methods'}</h2>
          <p className="mt-1 text-[0.6rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'الطرق المفعلة فقط ستظهر للمستخدم.' : 'Only enabled methods appear to users.'}</p>
          <div className="mt-3 space-y-2">
            {withdrawalMethods.map((method) => (
              <div key={method.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.45)] p-2.5">
                <span className="min-w-0 flex-1 text-xs font-black text-[var(--color-text)]">{method.name}</span>
                <label className="flex items-center gap-1.5">
                  <span className="text-[0.52rem] font-black text-[var(--color-text-secondary)]">{isArabic ? 'نسبة الخصم' : 'Deduction'}</span>
                  <div className="flex h-7 w-16 items-center overflow-hidden rounded-lg border border-amber-400/25 bg-[var(--color-surface)]">
                    <input type="number" min="0" max="100" step="0.1" value={number(method.discountPercent)} onChange={(event) => { const discountPercent = Math.min(100, Math.max(0, number(event.target.value))); persistMethods(withdrawalMethods.map((entry) => entry.id === method.id ? { ...entry, discountPercent } : entry)); }} className="h-full min-w-0 flex-1 bg-transparent px-1 text-center text-[0.6rem] font-black text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <span className="grid h-full w-5 place-items-center border-s border-amber-400/15 bg-amber-500/10 text-[0.55rem] font-black text-amber-500">%</span>
                  </div>
                </label>
                <button type="button" onClick={() => persistMethods(withdrawalMethods.map((entry) => entry.id === method.id ? { ...entry, enabled: !entry.enabled } : entry))} className={`relative h-6 w-11 rounded-full transition ${method.enabled ? 'bg-emerald-500' : 'bg-slate-400/40'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${method.enabled ? 'end-1' : 'end-6'}`} /></button>
                <button type="button" onClick={async () => { const saved = await persistMethods(withdrawalMethods.filter((entry) => entry.id !== method.id)); if (saved) addToast(isArabic ? `تم حذف طريقة السحب: ${method.name}` : `${method.name} deleted`, 'success'); }} aria-label={isArabic ? `حذف ${method.name}` : `Delete ${method.name}`} title={isArabic ? 'حذف طريقة السحب' : 'Delete withdrawal method'} className="grid h-7 w-7 place-items-center rounded-lg border border-rose-400/18 bg-rose-500/8 text-rose-500 transition hover:border-rose-400/35 hover:bg-rose-500/15"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2"><input value={newMethodName} onChange={(event) => setNewMethodName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addWithdrawalMethod(); }} placeholder={isArabic ? 'اكتب اسم طريقة جديدة' : 'New method name'} className="h-9 min-w-0 flex-1 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.6)] bg-[var(--color-surface)] px-3 text-xs font-bold text-[var(--color-text)] outline-none" /><button type="button" onClick={addWithdrawalMethod} className="inline-flex h-9 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[0.6rem] font-black text-white"><Plus className="h-3.5 w-3.5" />{isArabic ? 'إضافة' : 'Add'}</button></div>
        </div>
        <div className="rounded-[1.4rem] border border-[color:rgb(var(--color-border-rgb)/0.55)] bg-[color:rgb(var(--color-card-rgb)/0.84)] p-4">
          <h2 className="text-sm font-black text-[var(--color-text)]">{isArabic ? 'طلبات سحب العملاء' : 'Customer withdrawals'}</h2>
          <p className="mt-1 text-[0.6rem] font-bold text-[var(--color-text-secondary)]">{isArabic ? 'أرفق صورة التحويل ثم وافق على الطلب.' : 'Attach the transfer receipt, then approve.'}</p>
          <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto">{allWithdrawalRequests.map((request) => { const status = String(request.status || 'processing').toLowerCase(); const ownerName = request.accountHolder || request.ownerName || request.name || (isArabic ? 'عميل' : 'Customer'); const accountNumber = request.accountNumber || request.phone || ''; return <article key={request.id} className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.48)] p-3"><div className="flex items-center gap-2"><img src={request.ownerAvatar || resolveUserAvatar({ name: request.ownerName, email: request.ownerEmail }, request.ownerEmail)} alt="" className="h-9 w-9 rounded-full object-cover" /><div className="min-w-0 flex-1"><button type="button" onClick={() => copyRequestValue(ownerName, isArabic ? 'الاسم' : 'name')} title={isArabic ? 'اضغط لنسخ الاسم' : 'Click to copy name'} className="block max-w-full truncate text-xs font-black text-[var(--color-text)] hover:text-violet-500">{ownerName}</button><div className="mt-0.5 flex min-w-0 items-center gap-1 text-[0.55rem] text-[var(--color-text-secondary)]"><span className="shrink-0">{request.methodName || withdrawalMethods.find((method) => method.id === request.method)?.name || request.method} ·</span><button type="button" dir="ltr" onClick={() => copyRequestValue(accountNumber, isArabic ? 'رقم الحساب' : 'account number')} title={isArabic ? 'اضغط لنسخ الرقم' : 'Click to copy'} className="truncate font-black hover:text-violet-500 hover:underline">{accountNumber || '—'}</button></div></div><div className="text-end"><p dir="ltr" className="text-sm font-black text-[var(--color-text)]">{number(request.amount).toLocaleString('en-US')} {request.currency || 'EGP'}</p><span className={`text-[0.55rem] font-black ${status === 'completed' ? 'text-emerald-500' : status === 'failed' ? 'text-rose-500' : 'text-amber-500'}`}>{status === 'completed' ? (isArabic ? 'تم التحويل' : 'Completed') : status === 'failed' ? (isArabic ? 'مرفوض' : 'Rejected') : (isArabic ? 'قيد المراجعة' : 'Pending')}</span></div></div><div className="mt-2 flex flex-wrap items-center gap-1.5"><label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-violet-500/10 px-2 text-[0.55rem] font-black text-violet-500"><ImagePlus className="h-3.5 w-3.5" />{request.receiptImage ? (isArabic ? 'تغيير الصورة' : 'Change receipt') : (isArabic ? 'أرفق الصورة أولًا' : 'Attach receipt first')}<input type="file" accept="image/*" className="hidden" onChange={(event) => attachReceipt(request, event.target.files?.[0])} /></label>{request.receiptImage ? <a href={request.receiptImage} target="_blank" rel="noreferrer" className="text-[0.55rem] font-black text-sky-500 underline">{isArabic ? 'معاينة' : 'Preview'}</a> : null}<span className="flex-1" />{status === 'processing' ? <><button type="button" onClick={() => updateRequest(request, { status: 'failed' })} className="h-8 rounded-lg bg-rose-500/10 px-2 text-[0.55rem] font-black text-rose-500">{isArabic ? 'رفض' : 'Reject'}</button><button type="button" disabled={!request.receiptImage} title={!request.receiptImage ? (isArabic ? 'أرفق صورة التحويل أولًا' : 'Attach receipt first') : ''} onClick={() => updateRequest(request, { status: 'completed', completedAt: new Date().toISOString() })} className="h-8 rounded-lg bg-emerald-500 px-2.5 text-[0.55rem] font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-55">{isArabic ? 'موافقة وتحويل' : 'Approve'}</button></> : null}</div></article>; })}{!allWithdrawalRequests.length ? <p className="py-8 text-center text-xs text-[var(--color-text-secondary)]">{isArabic ? 'لا توجد طلبات سحب.' : 'No withdrawal requests.'}</p> : null}</div>
        </div>
      </section>

      <Modal isOpen={Boolean(selectedOwner)} onClose={() => setSelectedOwner(null)} title={isArabic ? 'تفاصيل كود الإحالة' : 'Referral details'} size="xl">
        {selectedOwner ? <div className="space-y-4" dir={dir}>
          <div className="flex items-center gap-3 rounded-2xl bg-[color:rgb(var(--color-primary-rgb)/0.07)] p-4"><img src={selectedOwner.avatar} alt={selectedOwner.name} className="h-14 w-14 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="font-black text-[var(--color-text)]">{selectedOwner.name}</p><p dir="ltr" className="truncate text-left text-xs text-[var(--color-text-secondary)]">{selectedOwner.email}</p></div><span dir="ltr" className="rounded-lg bg-violet-500/12 px-3 py-1.5 font-mono text-xs font-black text-violet-500">{selectedOwner.code}</span></div>
          <div className="grid grid-cols-3 gap-2">{[
            [isArabic ? 'إجمالي الربح' : 'Earnings', selectedOwner.earnings, TrendingUp],
            [isArabic ? 'تم سحبه' : 'Withdrawn', selectedOwner.withdrawn, ArrowDownToLine],
            [isArabic ? 'متاح' : 'Available', Math.max(0, selectedOwner.earnings - selectedOwner.withdrawn), Wallet],
          ].map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.5)] p-3"><Icon className="h-4 w-4 text-violet-500" /><p className="mt-2 text-[0.58rem] font-bold text-[var(--color-text-secondary)]">{label}</p><p dir="ltr" className="mt-1 text-end text-sm font-black text-[var(--color-text)]">{value.toLocaleString('en-US')} {selectedOwner.currency}</p></div>)}</div>
          <div><h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--color-text)]"><UsersRound className="h-4 w-4 text-violet-500" />{isArabic ? 'الأشخاص الذين دعاهم' : 'People invited'}</h3><div className="max-h-72 space-y-2 overflow-y-auto pe-1">{selectedOwner.referrals.map((referral) => <div key={referral.id} className="flex items-center gap-3 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.48)] p-3"><img src={referral.avatar} alt={referral.name} className="h-10 w-10 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[var(--color-text)]">{referral.name}</p><p dir="ltr" className="truncate text-left text-[0.6rem] text-[var(--color-text-secondary)]">{referral.email}</p><p className="mt-1 flex items-center gap-1 text-[0.56rem] text-[var(--color-text-secondary)]"><CalendarDays className="h-3 w-3" />{formatDate(referral.invitedAt, locale)}</p></div><div className="text-end"><p dir="ltr" className="text-xs font-black text-[var(--color-text)]">{referral.addedAmount.toLocaleString('en-US')} {selectedOwner.currency}</p><p dir="ltr" className="mt-1 text-[0.65rem] font-black text-emerald-500">+{referral.earnings.toLocaleString('en-US')} {selectedOwner.currency}</p></div></div>)}{!selectedOwner.referrals.length ? <p className="py-6 text-center text-xs text-[var(--color-text-secondary)]">{isArabic ? 'لم يدعُ أي شخص بعد' : 'No invitations yet'}</p> : null}</div></div>
          {selectedOwner.withdrawals.length ? <div><h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--color-text)]"><ArrowDownToLine className="h-4 w-4 text-violet-500" />{isArabic ? 'طلبات سحب الأرباح' : 'Earnings withdrawals'}</h3><div className="space-y-2">{selectedOwner.withdrawals.map((withdrawal, index) => { const status = String(withdrawal?.status || 'processing').toLowerCase(); const StatusIcon = status === 'completed' ? CheckCircle2 : status === 'failed' ? XCircle : Clock3; return <div key={withdrawal?.id || index} className="flex items-center justify-between rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.48)] p-3"><span className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)]"><StatusIcon className={`h-4 w-4 ${status === 'completed' ? 'text-emerald-500' : status === 'failed' ? 'text-rose-500' : 'text-amber-500'}`} />{formatDate(withdrawal?.createdAt || withdrawal?.requestedAt, locale)}</span><span dir="ltr" className="text-sm font-black text-[var(--color-text)]">{number(withdrawal?.amount).toLocaleString('en-US')} {selectedOwner.currency}</span></div>; })}</div></div> : null}
        </div> : null}
      </Modal>
      {isLoadingUsers ? <div className="fixed bottom-5 end-5 rounded-full bg-violet-600 px-4 py-2 text-xs font-black text-white shadow-xl">{isArabic ? 'جارٍ تحديث البيانات...' : 'Refreshing data...'}</div> : null}
    </div>
  );
};

export default AdminReferrals;
