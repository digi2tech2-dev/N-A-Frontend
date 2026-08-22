import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Gamepad2,
  Package,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  Building2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useAdminStore from '../store/useAdminStore';
import useOrderStore from '../store/useOrderStore';
import useTopupStore from '../store/useTopupStore';
import useTargetStore from '../store/useTargetStore';
import useMediaStore from '../store/useMediaStore';
import useSystemStore from '../store/useSystemStore';
import apiClient from '../services/client';
import DashboardHeader from '../components/admin-dashboard/DashboardHeader';
import StatsGrid from '../components/admin-dashboard/StatsGrid';
import RecentOrdersSection from '../components/admin-dashboard/RecentOrdersSection';
import ManualTopupsSection from '../components/admin-dashboard/ManualTopupsSection';
import TargetRequestsReviewSection from '../components/admin-dashboard/TargetRequestsReviewSection';
import RejectionReasonModal from '../components/target/RejectionReasonModal';
import QuickActionsSection from '../components/admin-dashboard/QuickActionsSection';
import ActivityFeedSection from '../components/admin-dashboard/ActivityFeedSection';
import SupplierBalancesSection from '../components/admin-dashboard/SupplierBalancesSection';
import DashboardDateRangeFilter from '../components/admin-dashboard/DashboardDateRangeFilter';
import OrderDetailsDrawer from '../components/orders/OrderDetailsDrawer';
import Card from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { formatDateTime, formatNumber, getNumericLocale } from '../utils/intl';
import { enrichOrders } from '../utils/orders';
import { getUserRegistrationDate, isApprovedAccountStatus, isPendingAccountStatus } from '../utils/accountStatus';
import { PERMISSIONS, hasPermission } from '../utils/permissions';

const PENDING_STATUSES = ['pending', 'requested', 'under_review', 'processing'];
const COMPLETED_STATUSES = ['completed', 'approved', 'success'];
const REJECTED_STATUSES = ['rejected', 'denied', 'cancelled', 'canceled'];

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const byNewestDate = (left, right) => (
  new Date(right?.createdAt || right?.updatedAt || 0) - new Date(left?.createdAt || left?.updatedAt || 0)
);

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const isPendingStatus = (status) => PENDING_STATUSES.includes(normalizeStatus(status));
const isCompletedStatus = (status) => COMPLETED_STATUSES.includes(normalizeStatus(status));
const isRejectedStatus = (status) => REJECTED_STATUSES.includes(normalizeStatus(status));
const isManualTopup = (topup) => String(topup?.type || '').trim().toLowerCase() !== 'game_topup';

const shiftDateByDays = (inputDate, days) => {
  const nextDate = new Date(inputDate);
  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const startOfMonth = (inputDate) => {
  const nextDate = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const toDateInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateRangeBoundary = (value, { endOfDay = false } = {}) => {
  const parsed = parseDateInputValue(value);
  if (!parsed) return null;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
};

const isDateWithinRange = (value, { startDate, endDate }) => {
  const hasRange = Boolean(startDate || endDate);
  if (!hasRange) return true;
  if (!value) return false;

  const itemDate = new Date(value);
  if (Number.isNaN(itemDate.getTime())) return false;

  const startBoundary = getDateRangeBoundary(startDate);
  const endBoundary = getDateRangeBoundary(endDate, { endOfDay: true });

  if (startBoundary && itemDate < startBoundary) return false;
  if (endBoundary && itemDate > endBoundary) return false;
  return true;
};

const getOrderDashboardDate = (order) => (
  order?.createdAt
  || order?.date
  || order?.updatedAt
  || null
);

const getTopupDashboardDate = (topup) => (
  topup?.createdAt
  || topup?.updatedAt
  || topup?.reviewedAt
  || null
);

const getTargetRequestDashboardDate = (request) => (
  request?.createdAt
  || request?.updatedAt
  || null
);

const formatRelativeProductName = (product, isArabic) => (
  product?.nameAr || product?.name || (isArabic ? 'منتج غير معروف' : 'Unknown product')
);

const extractSupplierBalanceSnapshot = (payload = {}) => {
  const raw = payload || {};
  const balanceNode = raw?.balance;
  const innerData = (typeof balanceNode === 'object' && balanceNode !== null) ? balanceNode : {};
  const deepData = (typeof innerData?.data === 'object' && innerData.data !== null) ? innerData.data : {};
  const balanceCandidate = (
    deepData?.user_balance
    ?? innerData?.balance
    ?? innerData?.user_balance
    ?? innerData?.remains
    ?? innerData?.credits
    ?? raw?.user_balance
    ?? raw?.availableBalance
    ?? raw?.remains
    ?? raw?.credits
    ?? (typeof balanceNode !== 'object' ? balanceNode : null)
  );
  const parsedBalance = Number(balanceCandidate);

  return {
    balance: Number.isFinite(parsedBalance) ? parsedBalance : null,
    rawBalance: balanceCandidate ?? null,
    currency: String(
      deepData?.user_currency
      ?? innerData?.currency
      ?? innerData?.user_currency
      ?? raw?.currency
      ?? raw?.balanceCurrency
      ?? ''
    ).trim().toUpperCase(),
  };
};

const getDefaultDashboardRange = () => {
  const today = shiftDateByDays(new Date(), 0);
  return {
    startDate: toDateInputValue(startOfMonth(today)),
    endDate: toDateInputValue(today),
  };
};

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { users, loadUsers, updateUserStatus } = useAdminStore();
  const {
    orders,
    loadOrders,
    getOrderById,
    updateOrderStatus,
    syncOrderSupplierStatus,
  } = useOrderStore();
  const { topups, loadTopups, updateTopupStatus } = useTopupStore();
  const { requests: targetRequests, updateRequestStatus } = useTargetStore();
  const { products, categories, loadProducts } = useMediaStore();
  const { currencies, loadCurrencies } = useSystemStore();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = useState(true);
  const [startDate, setStartDate] = useState(() => getDefaultDashboardRange().startDate);
  const [endDate, setEndDate] = useState(() => getDefaultDashboardRange().endDate);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [loadingOrderActionId, setLoadingOrderActionId] = useState('');
  const [syncingOrderId, setSyncingOrderId] = useState('');
  const [approvingTopupId, setApprovingTopupId] = useState('');
  const [approvingTargetRequestId, setApprovingTargetRequestId] = useState('');
  const [rejectingTargetRequest, setRejectingTargetRequest] = useState(null);
  const [approvingUserId, setApprovingUserId] = useState('');
  const [rejectingUserId, setRejectingUserId] = useState('');
  const [supplierBalances, setSupplierBalances] = useState([]);
  const [isLoadingSupplierBalances, setIsLoadingSupplierBalances] = useState(false);

  const isArabic = String(i18n.resolvedLanguage || i18n.language || 'ar').toLowerCase().startsWith('ar');
  const locale = getNumericLocale(isArabic ? 'ar-EG' : 'en-US');
  const todayInputValue = useMemo(() => toDateInputValue(new Date()), []);
  const canViewUsers = hasPermission(user, PERMISSIONS.ADMIN_USERS);
  const canConfirmAccounts = hasPermission(user, PERMISSIONS.CONFIRM_ACCOUNTS);
  const canViewOrders = hasPermission(user, PERMISSIONS.ADMIN_ORDERS);
  const canConfirmOrders = hasPermission(user, PERMISSIONS.CONFIRM_ORDERS);
  const canViewPayments = hasPermission(user, PERMISSIONS.ADMIN_PAYMENTS);
  const canViewProducts = hasPermission(user, PERMISSIONS.ADMIN_PRODUCTS);
  const canViewSuppliers = hasPermission(user, PERMISSIONS.ADMIN_SUPPLIERS);
  const canViewTargets = hasPermission(user, PERMISSIONS.ADMIN_TARGET_REQUESTS);
  const canConfirmTargets = hasPermission(user, PERMISSIONS.CONFIRM_TARGET_REQUESTS);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setIsLoading(true);

      const tasks = [];
      if (canViewUsers || canConfirmAccounts) tasks.push(Promise.resolve(loadUsers({ force: true })));
      if (canViewOrders || canConfirmOrders) tasks.push(Promise.resolve(loadOrders(undefined, { force: true })));
      if (canViewPayments) tasks.push(Promise.resolve(loadTopups({ force: true })));
      if (canViewProducts) tasks.push(Promise.resolve(loadProducts({ force: true })));
      tasks.push(Promise.resolve(loadCurrencies?.()));

      await Promise.allSettled(tasks);

      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [
    canConfirmAccounts,
    canConfirmOrders,
    canViewOrders,
    canViewPayments,
    canViewProducts,
    canViewUsers,
    loadCurrencies,
    loadOrders,
    loadProducts,
    loadTopups,
    loadUsers,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardStats = async () => {
      setIsLoadingDashboardStats(true);

      try {
        const nextStats = await apiClient.dashboard.getDashboardStats({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (isMounted) {
          setDashboardStats(nextStats || null);
        }
      } catch (error) {
        if (isMounted) {
          setDashboardStats(null);
          addToast(error?.message || (isArabic ? 'تعذر تحميل إحصائيات اللوحة.' : 'Unable to load dashboard stats.'), 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDashboardStats(false);
        }
      }
    };

    void loadDashboardStats();

    return () => {
      isMounted = false;
    };
  }, [addToast, endDate, isArabic, startDate]);

  useEffect(() => {
    let isMounted = true;

    const loadSupplierBalances = async () => {
      setIsLoadingSupplierBalances(true);

      try {
        const suppliers = await apiClient.suppliers.list();
        const rows = Array.isArray(suppliers) ? suppliers : [];
        const results = await Promise.allSettled(
          rows.map((supplier) => apiClient.suppliers.getBalance(supplier.id))
        );

        if (!isMounted) return;

        const nextBalances = rows
          .map((supplier, index) => {
            const result = results[index];
            const snapshot = result?.status === 'fulfilled'
              ? extractSupplierBalanceSnapshot(result.value)
              : { balance: null, rawBalance: null, currency: '' };

            return {
              id: supplier.id,
              supplierName: supplier.supplierName || supplier.name || supplier.id,
              supplierCode: supplier.supplierCode || '',
              isActive: supplier.isActive !== false,
              balance: snapshot.balance,
              rawBalance: snapshot.rawBalance,
              currency: snapshot.currency,
            };
          })
          .sort((left, right) => {
            if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
            return String(left.supplierName || '').localeCompare(String(right.supplierName || ''), locale);
          });

        setSupplierBalances(nextBalances);
      } catch (_error) {
        if (!isMounted) return;
        setSupplierBalances([]);
      } finally {
        if (isMounted) {
          setIsLoadingSupplierBalances(false);
        }
      }
    };

    if (canViewSuppliers) {
      void loadSupplierBalances();
    } else {
      setSupplierBalances([]);
      setIsLoadingSupplierBalances(false);
    }

    return () => {
      isMounted = false;
    };
  }, [canViewSuppliers, locale]);

  const applyDateRangeSelection = (nextStartDate, nextEndDate = nextStartDate) => {
    const normalizedStartDate = nextStartDate || '';
    const normalizedEndDate = nextEndDate || '';

    if (!normalizedStartDate && !normalizedEndDate) {
      setStartDate('');
      setEndDate('');
      return;
    }

    let orderedStartDate = normalizedStartDate;
    let orderedEndDate = normalizedEndDate || normalizedStartDate;

    if (orderedStartDate && orderedEndDate && orderedStartDate > orderedEndDate) {
      [orderedStartDate, orderedEndDate] = [orderedEndDate, orderedStartDate];
    }

    setStartDate(orderedStartDate);
    setEndDate(orderedEndDate);
  };

  const isSingleDayView = Boolean(startDate && endDate && startDate === endDate);

  const dateRange = useMemo(
    () => ({
      startDate: startDate || null,
      endDate: endDate || null,
    }),
    [endDate, startDate]
  );

  const allCustomerUsers = useMemo(
    () => (users || []).filter((entry) => String(entry?.role || '').trim().toLowerCase() === 'customer'),
    [users]
  );

  const newCustomersInRange = useMemo(
    () => allCustomerUsers.filter((entry) => isDateWithinRange(getUserRegistrationDate(entry), dateRange)),
    [dateRange, allCustomerUsers]
  );

  const activeUsersInRange = useMemo(
    () => newCustomersInRange.filter((entry) => isApprovedAccountStatus(entry?.status)),
    [newCustomersInRange]
  );

  const pendingApprovalUsers = useMemo(
    () => [...allCustomerUsers]
      .filter((entry) => isPendingAccountStatus(entry?.status))
      .sort((left, right) => new Date(getUserRegistrationDate(right) || 0) - new Date(getUserRegistrationDate(left) || 0)),
    [allCustomerUsers]
  );

  const enrichedOrders = useMemo(
    () => enrichOrders(orders, { users, products, language: isArabic ? 'ar' : 'en' }),
    [isArabic, orders, products, users]
  );

  const filteredOrders = useMemo(
    () => enrichedOrders.filter((entry) => isDateWithinRange(getOrderDashboardDate(entry), dateRange)),
    [dateRange, enrichedOrders]
  );

  const completedOrders = useMemo(
    () => filteredOrders.filter((entry) => isCompletedStatus(entry?.status)),
    [filteredOrders]
  );

  const pendingOrders = useMemo(
    () => enrichedOrders.filter((entry) => isPendingStatus(entry?.status)),
    [enrichedOrders]
  );

  const manualTopups = useMemo(
    () => (topups || []).filter((entry) => isManualTopup(entry)),
    [topups]
  );

  const filteredManualTopups = useMemo(
    () => manualTopups.filter((entry) => isDateWithinRange(getTopupDashboardDate(entry), dateRange)),
    [dateRange, manualTopups]
  );

  const pendingManualTopups = useMemo(
    () => manualTopups.filter((entry) => isPendingStatus(entry?.status)),
    [manualTopups]
  );

  const filteredProducts = useMemo(() => {
    return Array.isArray(products) ? products : [];
  }, [products]);

  const recentOrders = useMemo(
    () => [...filteredOrders].sort(byNewestDate).slice(0, 6),
    [filteredOrders]
  );

  const selectedOrder = useMemo(
    () => filteredOrders.find((entry) => entry.id === selectedOrderId)
      || enrichedOrders.find((entry) => entry.id === selectedOrderId)
      || null,
    [enrichedOrders, filteredOrders, selectedOrderId]
  );

  const recentManualTopups = useMemo(
    () => [...filteredManualTopups].sort(byNewestDate).slice(0, 6),
    [filteredManualTopups]
  );

  const filteredTargetRequests = useMemo(
    () => (targetRequests || []).filter((entry) => isDateWithinRange(getTargetRequestDashboardDate(entry), dateRange)),
    [dateRange, targetRequests]
  );

  const pendingTargetRequests = useMemo(
    () => (targetRequests || []).filter((entry) => String(entry?.status || '').trim().toLowerCase() === 'pending'),
    [targetRequests]
  );

  const recentTargetRequests = useMemo(
    () => [...filteredTargetRequests].sort(byNewestDate).slice(0, 6),
    [filteredTargetRequests]
  );

  const formatCount = (value) => formatNumber(asNumber(value), locale);
  const formatMoney = (value, currencyCode = 'USD') => {
    const currency = String(currencyCode || 'USD').toUpperCase();
    const amount = asNumber(value);

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        numberingSystem: 'latn',
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
    } catch (_error) {
      return `${formatCount(amount)} ${currency}`;
    }
  };

  const formatSupplierBalance = (entry) => {
    if (Number.isFinite(entry?.balance)) {
      const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
        numberingSystem: 'latn',
      }).format(entry.balance);

      return entry?.currency ? `${formatted} ${entry.currency}` : formatted;
    }

    if (entry?.rawBalance !== undefined && entry?.rawBalance !== null && String(entry.rawBalance).trim()) {
      return String(entry.rawBalance);
    }

    return isArabic ? 'غير متاح' : 'Unavailable';
  };

  const formatDate = (value) => {
    if (!value) {
      return isArabic ? 'غير متوفر' : 'Unavailable';
    }

    return formatDateTime(value, locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const currentDateLabel = useMemo(
    () => formatDateTime(new Date(), locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    [locale]
  );

  const formatRangeDate = (value) => {
    const parsed = parseDateInputValue(value);
    if (!parsed) {
      return isArabic ? 'غير محدد' : 'Not set';
    }

    return formatDateTime(parsed, locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const selectedRangeLabel = (() => {
    if (isSingleDayView && startDate) {
      return isArabic
        ? `عرض النتائج ليوم ${formatRangeDate(startDate)}`
        : `Showing results for ${formatRangeDate(startDate)}`;
    }

    if (startDate && endDate) {
      return isArabic
        ? `عرض النتائج من ${formatRangeDate(startDate)} إلى ${formatRangeDate(endDate)}`
        : `Showing results from ${formatRangeDate(startDate)} to ${formatRangeDate(endDate)}`;
    }

    if (startDate) {
      return isArabic
        ? `عرض النتائج بدءًا من ${formatRangeDate(startDate)}`
        : `Showing results starting from ${formatRangeDate(startDate)}`;
    }

    if (endDate) {
      return isArabic
        ? `عرض النتائج حتى ${formatRangeDate(endDate)}`
        : `Showing results up to ${formatRangeDate(endDate)}`;
    }

    return isArabic ? 'عرض كل البيانات المتاحة' : 'Showing all available data';
  })();

  const productMetricNote = isArabic
    ? 'إجمالي المنتجات الحالية المتاحة في المتجر'
    : 'Current catalog total products available';

  const walletMetricNote = isArabic
    ? 'إجمالي أرصدة العملاء الحالية كما هي مخزنة في قاعدة البيانات'
    : 'Current customer wallet balances summed from the database';

  const supplierBalanceItems = useMemo(
    () => supplierBalances.map((entry) => ({
      ...entry,
      balanceLabel: formatSupplierBalance(entry),
    })),
    [isArabic, locale, supplierBalances]
  );

  const quickActions = useMemo(
    () => [
      {
        label: isArabic ? 'الرئيسية' : 'Home',
        description: isArabic
          ? 'الرجوع إلى الصفحة الرئيسية للوحة الأدمن'
          : 'Return to the main admin dashboard.',
        to: '/admin/dashboard',
      },
      {
        label: isArabic ? 'إدارة المستخدمين' : 'Manage Users',
        description: isArabic
          ? 'إدارة العملاء والأرصدة وإجراءات الحساب'
          : 'Manage customers, balances, and account actions.',
        to: '/admin/users',
      },
      {
        label: isArabic ? 'طرق الدفع' : 'Payment Methods',
        description: isArabic
          ? 'إدارة مجموعات الدفع ووسائل التحويل'
          : 'Manage payment groups and transfer methods.',
        to: '/admin/payment-methods',
      },
      {
        label: isArabic ? 'طلبات الدفع' : 'Payment Requests',
        description: isArabic
          ? 'مراجعة تأكيدات التحويل وطلبات الشحن'
          : 'Review transfer confirmations and topup requests.',
        to: '/admin/payments',
      },
      {
        label: isArabic ? 'العملات' : 'Currencies',
        description: isArabic
          ? 'إدارة العملات المفعلة والافتراضية'
          : 'Manage enabled and default currencies.',
        to: '/admin/currencies',
      },
      {
        label: isArabic ? 'حسابي' : 'My Account',
        description: isArabic
          ? 'عرض وتعديل بيانات حسابك'
          : 'View and edit your account details.',
        to: '/account',
      },
    ].filter((action) => {
      const permissionByRoute = {
        '/admin/users': PERMISSIONS.ADMIN_USERS,
        '/admin/payment-methods': PERMISSIONS.ADMIN_PAYMENT_METHODS,
        '/admin/payments': PERMISSIONS.ADMIN_PAYMENTS,
        '/admin/currencies': PERMISSIONS.ADMIN_CURRENCIES,
      };

      const requiredPermission = permissionByRoute[action.to];
      if (!requiredPermission) return true;
      return hasPermission(user, requiredPermission);
    }),
    [isArabic, user]
  );

  const statsOrders = dashboardStats?.orders || {};
  const statsFinancials = dashboardStats?.financials || {};
  const statsUsers = dashboardStats?.users || {};
  const statsProducts = dashboardStats?.products || {};
  const monthlyTargetUsd = 100;
  const monthlyTargetProfitUsd = asNumber(statsFinancials.totalProfitUsd ?? statsFinancials.netProfit);
  const monthlyTargetProgress = Math.min(100, Math.round((monthlyTargetProfitUsd / monthlyTargetUsd) * 100));
  const monthlyTargetRemaining = Math.max(0, monthlyTargetUsd - monthlyTargetProfitUsd);

  const stats = useMemo(
    () => [
      {
        title: isArabic ? 'صافي الأرباح (USD)' : 'Net Profit (USD)',
        value: formatMoney(statsFinancials.totalProfitUsd ?? statsFinancials.netProfit ?? 0, 'USD'),
        note: isArabic ? 'الأرباح من الطلبات المكتملة داخل الفترة المحددة' : 'Profit from completed orders in the selected range',
        icon: DollarSign,
      },
      {
        title: isArabic ? 'إجمالي الإيرادات (USD)' : 'Total Revenue (USD)',
        value: formatMoney(statsFinancials.totalRevenueUsd ?? statsFinancials.totalRevenue ?? 0, 'USD'),
        note: isArabic ? 'الإيرادات من الطلبات المكتملة داخل الفترة المحددة' : 'Revenue from completed orders in the selected range',
        icon: TrendingUp,
      },
      {
        title: isArabic ? 'إجمالي الطلبات' : 'Total Orders',
        value: formatCount(statsOrders.total),
        note: isArabic ? 'كل الطلبات المطابقة للفترة الحالية' : 'All orders matching the current date range',
        icon: ShoppingCart,
      },
      {
        title: isArabic ? 'إجمالي المستخدمين' : 'Total Users',
        value: formatCount(statsUsers.total),
        note: isArabic ? `${formatCount(statsUsers.active)} مستخدم مفعّل` : `${formatCount(statsUsers.active)} active users`,
        icon: Users,
      },
      {
        title: isArabic ? 'حسابات بانتظار التفعيل' : 'Pending account approvals',
        value: formatCount(pendingApprovalUsers.length),
        note: isArabic ? 'حسابات جديدة ما زالت بانتظار المراجعة' : 'New accounts still waiting for review',
        icon: UserCog,
      },
      {
        title: isArabic ? 'إجمالي المنتجات' : 'Total Products',
        value: formatCount(statsProducts.total),
        note: productMetricNote,
        icon: Package,
      },
      {
        title: isArabic ? 'الطلبات المعلقة' : 'Pending Orders',
        value: formatCount(statsOrders.pendingProcessing ?? (asNumber(statsOrders.pending) + asNumber(statsOrders.processing))),
        note: isArabic ? 'طلبات تحتاج متابعة داخل الفترة الحالية' : 'Orders that still need follow-up in the current range',
        icon: Clock3,
      },
      {
        title: isArabic ? 'الطلبات المكتملة' : 'Completed Orders',
        value: formatCount(statsOrders.completed),
        note: isArabic ? 'طلبات تم تنفيذها داخل الفترة المحددة' : 'Orders fulfilled inside the selected range',
        icon: CheckCircle2,
      },
      {
        title: isArabic ? 'طلبات الشحن اليدوي المعلقة' : 'Pending Manual Topups',
        value: formatCount(pendingManualTopups.length),
        note: isArabic ? 'طلبات شحن يدوي بانتظار المراجعة في الفترة الحالية' : 'Manual topup requests awaiting review in the current range',
        icon: ShieldCheck,
      },
      {
        title: isArabic ? 'إجمالي أرصدة المحافظ' : 'Total Wallet Balances',
        value: formatCount(statsUsers.totalWalletBalance),
        note: walletMetricNote,
        icon: Wallet,
      },
      {
        title: isArabic ? 'تارجت الشهر' : 'Monthly Target',
        value: `${formatMoney(monthlyTargetProfitUsd, 'USD')} / ${formatMoney(monthlyTargetUsd, 'USD')}`,
        note: monthlyTargetRemaining > 0
          ? (isArabic
            ? `متبقي ${formatMoney(monthlyTargetRemaining, 'USD')} للوصول لهدف ربح الشهر`
            : `${formatMoney(monthlyTargetRemaining, 'USD')} remaining to reach this month's profit target`)
          : (isArabic ? 'تم تحقيق هدف ربح الشهر' : 'This month’s profit target is complete'),
        icon: Target,
        progress: monthlyTargetProgress,
        wide: true,
      },
    ],
    [
      formatCount,
      formatMoney,
      isArabic,
      monthlyTargetProfitUsd,
      monthlyTargetProgress,
      monthlyTargetRemaining,
      pendingApprovalUsers.length,
      pendingManualTopups.length,
      productMetricNote,
      statsFinancials.netProfit,
      statsFinancials.totalProfitUsd,
      statsFinancials.totalRevenue,
      statsFinancials.totalRevenueUsd,
      statsOrders.completed,
      statsOrders.pending,
      statsOrders.pendingProcessing,
      statsOrders.processing,
      statsOrders.total,
      statsProducts.total,
      statsUsers.active,
      statsUsers.total,
      statsUsers.totalWalletBalance,
      walletMetricNote,
    ]
  );

  const activityItems = useMemo(() => {
    const items = [];
    const newestCompletedOrder = [...completedOrders].sort(byNewestDate)[0];
    const newestPendingTopup = [...pendingManualTopups].sort(byNewestDate)[0];
    const newestRejectedOrder = [...filteredOrders.filter((entry) => isRejectedStatus(entry?.status))].sort(byNewestDate)[0];
    const newestProduct = [...filteredProducts].sort(byNewestDate)[0];

    if (newestCompletedOrder) {
      items.push({
        id: `completed-order-${newestCompletedOrder.id}`,
        icon: CheckCircle2,
        tone: 'success',
        status: newestCompletedOrder.status,
        title: isArabic ? 'اكتمل طلب جديد' : 'New order completed',
        description: isArabic
          ? `${newestCompletedOrder.userName || newestCompletedOrder.userId || 'عميل'} أنهى طلب ${newestCompletedOrder.productName || newestCompletedOrder.productId || ''}.`
          : `${newestCompletedOrder.userName || newestCompletedOrder.userId || 'A customer'} completed ${newestCompletedOrder.productName || newestCompletedOrder.productId || 'an order'}.`,
        timestamp: newestCompletedOrder.createdAt,
      });
    }

    if (newestPendingTopup) {
      items.push({
        id: `pending-topup-${newestPendingTopup.id}`,
        icon: CreditCard,
        tone: 'warning',
        status: newestPendingTopup.status,
        title: isArabic ? 'طلب شحن يدوي بانتظار المراجعة' : 'Manual topup waiting for review',
        description: isArabic
          ? `${newestPendingTopup.userName || newestPendingTopup.userId || 'مستخدم'} أرسل طلب شحن بقيمة ${formatMoney(newestPendingTopup.requestedAmount ?? newestPendingTopup.amount, newestPendingTopup.currencyCode)}.`
          : `${newestPendingTopup.userName || newestPendingTopup.userId || 'A user'} submitted a topup request for ${formatMoney(newestPendingTopup.requestedAmount ?? newestPendingTopup.amount, newestPendingTopup.currencyCode)}.`,
        timestamp: newestPendingTopup.createdAt,
      });
    }

    if (newestRejectedOrder) {
      items.push({
        id: `rejected-order-${newestRejectedOrder.id}`,
        icon: Clock3,
        tone: 'info',
        status: newestRejectedOrder.status,
        title: isArabic ? 'طلب يحتاج مراجعة' : 'Order needs attention',
        description: isArabic
          ? `هناك طلب بحالة ${normalizeStatus(newestRejectedOrder.status)} للمنتج ${newestRejectedOrder.productName || newestRejectedOrder.productId || ''}.`
          : `There is an order with status ${normalizeStatus(newestRejectedOrder.status)} for ${newestRejectedOrder.productName || newestRejectedOrder.productId || 'a product'}.`,
        timestamp: newestRejectedOrder.createdAt,
      });
    }

    if (newestProduct) {
      items.push({
        id: `product-snapshot-${newestProduct.id}`,
        icon: Package,
        tone: 'info',
        title: isArabic ? 'حالة الكاتالوج الحالية' : 'Current catalog snapshot',
        description: isArabic
          ? `إجمالي ${formatCount(filteredProducts.length)} منتج داخل نطاق العرض الحالي. آخر منتج ظاهر: ${formatRelativeProductName(newestProduct, true)}.`
          : `${formatCount(filteredProducts.length)} products are currently inside the selected range. Latest visible item: ${formatRelativeProductName(newestProduct, false)}.`,
        timestamp: newestProduct.updatedAt || newestProduct.createdAt || null,
      });
    }

    if (!items.length && allCustomerUsers.length) {
      items.push({
        id: 'customer-snapshot',
        icon: UserCog,
        tone: 'info',
        title: isArabic ? 'ملخص المستخدمين' : 'Users snapshot',
        description: isArabic
          ? `يوجد حاليًا ${formatCount(allCustomerUsers.length)} عميل و${formatCount(activeUsersInRange.length)} منهم مفعّلون داخل الفترة المحددة.`
          : `There are currently ${formatCount(allCustomerUsers.length)} customers and ${formatCount(activeUsersInRange.length)} of them are approved in the selected range.`,
        timestamp: null,
      });
    }

    return items.slice(0, 4);
  }, [
    activeUsersInRange.length,
    allCustomerUsers.length,
    completedOrders,
    filteredOrders,
    filteredProducts,
    formatCount,
    formatMoney,
    isArabic,
    pendingManualTopups,
  ]);

  const handleViewOrderFromDashboard = async (order) => {
    const orderId = String(order?.id || '').trim();
    if (!orderId) return;

    setSelectedOrderId(orderId);
    setIsOrderDrawerOpen(true);

    try {
      await getOrderById(orderId);
    } catch (_error) {
      // Keep the existing order snapshot visible if fetching full details fails.
    }
  };

  const handleCloseOrderDrawer = () => {
    setIsOrderDrawerOpen(false);
    setSelectedOrderId('');
  };

  const handleDashboardOrderStatusUpdate = async (order, status, rejectionReason = '') => {
    const orderId = String(order?.id || '').trim();
    if (!orderId) return;
    if (!canConfirmOrders) return;

    try {
      setLoadingOrderActionId(orderId);
      await updateOrderStatus(orderId, status, { ...order, rejectionReason });
    } finally {
      setLoadingOrderActionId('');
    }
  };

  const handleDashboardOrderSync = async (order) => {
    const orderId = String(order?.id || '').trim();
    if (!orderId) return;
    if (!canConfirmOrders) return;

    try {
      setSyncingOrderId(orderId);
      await syncOrderSupplierStatus(orderId);
    } finally {
      setSyncingOrderId('');
    }
  };

  const handleDashboardTopupApprove = async (topup) => {
    const topupId = String(topup?.id || '').trim();
    if (!topupId) return;
    if (!canViewPayments) return;

    try {
      setApprovingTopupId(topupId);
      const actualPaidAmount = asNumber(
        topup?.actualPaidAmount
        ?? topup?.requestedAmount
        ?? topup?.requestedCoins
        ?? topup?.amount
      );

      await updateTopupStatus(topupId, 'approved', {
        actualPaidAmount,
        currencyCode: topup?.currencyCode || 'USD',
        adminNote: '',
      });
    } finally {
      setApprovingTopupId('');
    }
  };

  const handleDashboardTargetApprove = async (request) => {
    const requestId = String(request?.id || '').trim();
    if (!requestId) return;
    if (!canConfirmTargets) return;

    try {
      setApprovingTargetRequestId(requestId);
      await updateRequestStatus(requestId, 'Done', { rejectionReason: '' });
      addToast(isArabic ? 'تم تأكيد طلب التارجت.' : 'Target request approved.', 'success');
    } catch (error) {
      addToast(error?.message || (isArabic ? 'تعذر تأكيد طلب التارجت.' : 'Failed to approve target request.'), 'error');
    } finally {
      setApprovingTargetRequestId('');
    }
  };

  const handleDashboardTargetReject = async (request) => {
    const requestId = String(request?.id || '').trim();
    if (!requestId) return;
    if (!canConfirmTargets) return;

    setRejectingTargetRequest(request);
  };

  const handleConfirmDashboardTargetReject = async (reason = '') => {
    const requestId = String(rejectingTargetRequest?.id || '').trim();
    if (!requestId) return;
    if (!canConfirmTargets) return;

    try {
      setApprovingTargetRequestId(requestId);
      await updateRequestStatus(requestId, 'Rejected', { rejectionReason: reason.trim() });
      addToast(isArabic ? 'تم رفض طلب التارجت.' : 'Target request rejected.', 'success');
      setRejectingTargetRequest(null);
    } catch (error) {
      addToast(error?.message || (isArabic ? 'تعذر رفض طلب التارجت.' : 'Failed to reject target request.'), 'error');
    } finally {
      setApprovingTargetRequestId('');
    }
  };

  const handleDashboardUserApprove = async (entry) => {
    const targetId = String(entry?.id || '').trim();
    if (!targetId) return;
    if (!canConfirmAccounts) return;

    try {
      setApprovingUserId(targetId);
      await updateUserStatus(targetId, 'approved', {
        id: user?.id,
        name: user?.name,
        role: user?.role,
      });
      addToast(isArabic ? 'تم تفعيل الحساب بنجاح.' : 'Account approved successfully.', 'success');
      await loadUsers({ force: true });
    } catch (error) {
      addToast(error?.message || (isArabic ? 'تعذر تفعيل الحساب.' : 'Failed to approve account.'), 'error');
    } finally {
      setApprovingUserId('');
    }
  };

  const handleDashboardUserReject = async (entry) => {
    const targetId = String(entry?.id || '').trim();
    if (!targetId) return;
    if (!canConfirmAccounts) return;

    try {
      setRejectingUserId(targetId);
      await updateUserStatus(targetId, 'rejected', {
        id: user?.id,
        name: user?.name,
        role: user?.role,
      });
      addToast(isArabic ? 'تم رفض الحساب بنجاح.' : 'Account rejected successfully.', 'success');
      await loadUsers({ force: true });
    } catch (error) {
      addToast(error?.message || (isArabic ? 'تعذر رفض الحساب.' : 'Failed to reject account.'), 'error');
    } finally {
      setRejectingUserId('');
    }
  };

  return (
    <div className="admin-dashboard-shell min-w-0 space-y-4 pb-3 md:space-y-8 md:pb-4">
      <DashboardHeader
        isArabic={isArabic}
        userName={user?.name}
        currentDateLabel={currentDateLabel}
      />

      <Card variant="premium" className="admin-dashboard-filter-card overflow-visible p-4 sm:p-6">
        <DashboardDateRangeFilter
          isArabic={isArabic}
          formatRangeDate={formatRangeDate}
          todayInputValue={todayInputValue}
          startDate={startDate}
          endDate={endDate}
          onRangeChange={applyDateRangeSelection}
        />
      </Card>

      <StatsGrid stats={stats} isLoading={isLoadingDashboardStats} />

      <div className="grid place-items-center gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] xl:place-items-stretch xl:gap-6">
        <div className="w-full space-y-4 md:space-y-6">
          {canViewOrders ? (
            <RecentOrdersSection
              orders={recentOrders}
              isArabic={isArabic}
              onViewOrder={handleViewOrderFromDashboard}
            />
          ) : null}
          {canViewPayments ? (
            <ManualTopupsSection
              topups={recentManualTopups}
              pendingCount={pendingManualTopups.length}
              isArabic={isArabic}
              formatDate={formatDate}
              formatMoney={formatMoney}
              onApproveTopup={handleDashboardTopupApprove}
              approvingTopupId={approvingTopupId}
            />
          ) : null}
          {canViewTargets ? (
            <TargetRequestsReviewSection
              requests={recentTargetRequests}
              pendingCount={pendingTargetRequests.length}
              isArabic={isArabic}
              formatDate={formatDate}
              formatMoney={formatMoney}
              onApproveRequest={canConfirmTargets ? handleDashboardTargetApprove : undefined}
              onRejectRequest={canConfirmTargets ? handleDashboardTargetReject : undefined}
              approvingRequestId={approvingTargetRequestId}
            />
          ) : null}
        </div>

        <div className="w-full space-y-4 md:space-y-6">
          <QuickActionsSection actions={quickActions} isArabic={isArabic} variant="tiny" />
          {canViewSuppliers ? (
            <SupplierBalancesSection
              items={supplierBalanceItems}
              isArabic={isArabic}
              isLoading={isLoadingSupplierBalances}
            />
          ) : null}
          <ActivityFeedSection items={activityItems} isArabic={isArabic} formatDate={formatDate} />
        </div>
      </div>

      <OrderDetailsDrawer
        isOpen={isOrderDrawerOpen}
        onClose={handleCloseOrderDrawer}
        order={selectedOrder}
        isArabic={isArabic}
        currencies={currencies}
        view="admin"
        onUpdateStatus={canConfirmOrders ? handleDashboardOrderStatusUpdate : undefined}
        canUpdateStatus={canConfirmOrders}
        onSync={canConfirmOrders ? handleDashboardOrderSync : undefined}
        isActionLoading={loadingOrderActionId === selectedOrderId}
        isSyncing={syncingOrderId === selectedOrderId}
      />

      <RejectionReasonModal
        isOpen={Boolean(rejectingTargetRequest)}
        onClose={() => setRejectingTargetRequest(null)}
        onConfirm={handleConfirmDashboardTargetReject}
        title={isArabic ? 'رفض طلب التارجت' : 'Reject Target Request'}
        description={isArabic ? 'سبب الرفض اختياري وسيظهر داخل تفاصيل الطلب عند كتابته.' : 'The rejection reason is optional and will appear in the request details when provided.'}
        confirmLabel={isArabic ? 'تأكيد الرفض' : 'Confirm rejection'}
        cancelLabel={isArabic ? 'إلغاء' : 'Cancel'}
      />

    </div>
  );
};

export default AdminDashboard;
