import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  PackageCheck,
  ShoppingCart,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrdersFiltersBar from '../components/orders/OrdersFiltersBar';
import CustomerOrderCard from '../components/orders/CustomerOrderCard';
import OrderDetailsDrawer from '../components/orders/OrderDetailsDrawer';
import EmptyOrdersState from '../components/orders/EmptyOrdersState';
import useAuthStore from '../store/useAuthStore';
import useOrderStore from '../store/useOrderStore';
import useMediaStore from '../store/useMediaStore';
import useSystemStore from '../store/useSystemStore';
import {
  filterOrders,
  enrichOrders,
  getOrderAmountValue,
  getOrderCurrencyCode,
  summarizeOrders,
} from '../utils/orders';
import { formatNumber } from '../utils/intl';
import { formatCurrencyAmount, getCurrencyMeta } from '../utils/pricing';
import './Orders.css';

const ORDERS_PER_PAGE = 8;

const normalizeSearchValue = (value) => String(value ?? '')
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .trim()
  .replace(/^#/, '')
  .toLowerCase();

const getOrderSearchText = (order = {}) => (
  [
    order?.searchIndex,
    order?.id,
    order?._id,
    order?.orderNumber,
    order?.siteOrderNumber,
    order?.internalOrderNumber,
    order?.supplierOrderNumber,
    order?.externalOrderId,
    order?.providerOrderId,
    order?.userId,
    order?.customerId,
    order?.user?._id,
    order?.user?.id,
    order?.playerId,
    order?.uid,
    order?.username,
    order?.customerInput,
    order?.supplierRequestSnapshot?.orderId,
    order?.supplierResponseSnapshot?.orderId,
    order?.supplierResponseSnapshot?.data?.orderId,
  ].map(normalizeSearchValue).filter(Boolean).join(' ')
);

const matchesOrderSearch = (order, searchTerm) => {
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  if (!normalizedSearchTerm) return true;
  return getOrderSearchText(order).includes(normalizedSearchTerm);
};

const SummaryCard = ({ icon: Icon, label, value, tone = 'sky', isMoney = false }) => {
  return (
    <div className={`orders-page-neon__summary-card is-${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="orders-page-neon__summary-label truncate text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
            {label}
          </p>
          <p
            dir={isMoney ? 'ltr' : undefined}
            className={`orders-page-neon__summary-value ${isMoney
              ? 'mt-2 whitespace-normal text-start text-[clamp(0.78rem,1.55vw,1.08rem)] font-black leading-snug text-[var(--color-text)]'
              : 'mt-2 truncate text-xl font-black leading-none text-[var(--color-text)]'}`}
            title={String(value)}
          >
            {value}
          </p>
        </div>

        <span className="orders-page-neon__summary-icon">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
};

const Orders = () => {
  const { user } = useAuthStore();
  const { orders, loadOrders, getOrderById } = useOrderStore();
  const { products, loadProducts } = useMediaStore();
  const { currencies, loadCurrencies } = useSystemStore();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { orderId: routeOrderId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('custom');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const isArabic = String(i18n.resolvedLanguage || i18n.language || 'ar').toLowerCase().startsWith('ar');
  const locale = isArabic ? 'ar-EG' : 'en-US';
  const currentUserId = String(user?.id || user?._id || user?.userId || '').trim();
  const orderOwnerScopeId = currentUserId;

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      if (!orderOwnerScopeId) return;

      setIsLoading(true);

      await Promise.allSettled([
        Promise.resolve(loadOrders(orderOwnerScopeId, { force: true })),
        Promise.resolve(loadProducts({ force: true })),
        Promise.resolve(loadCurrencies()),
      ]);

      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [loadCurrencies, loadOrders, loadProducts, orderOwnerScopeId]);

  const enrichedOrders = useMemo(
    () => enrichOrders(orders, {
      users: user ? [user] : [],
      products,
      language: isArabic ? 'ar' : 'en',
    }),
    [orders, products, user, isArabic]
  );

  const accountOrders = useMemo(
    () => enrichedOrders.filter((order) => {
      const ownerId = String(
        order?.userId
        || order?.customerId
        || order?.user?._id
        || order?.user?.id
        || ''
      ).trim();

      return !ownerId || !currentUserId || ownerId === currentUserId;
    }),
    [currentUserId, enrichedOrders]
  );

  const filteredOrders = useMemo(
    () => {
      const baseFiltered = filterOrders(accountOrders, {
        searchTerm: '',
        statusFilter,
        typeFilter: 'all',
        dateFilter,
        sortOrder,
      });

      const orderNumberFiltered = baseFiltered.filter((order) => matchesOrderSearch(order, searchTerm));

      if (dateFilter !== 'custom') {
        return orderNumberFiltered;
      }

      const startBoundary = customStartDate ? new Date(`${customStartDate}T00:00:00`) : null;
      const endBoundary = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : null;

      return orderNumberFiltered.filter((order) => {
        const orderDate = new Date(order?.createdAt || 0);
        if (Number.isNaN(orderDate.getTime())) return false;
        if (startBoundary && orderDate < startBoundary) return false;
        if (endBoundary && orderDate > endBoundary) return false;
        return true;
      });
    },
    [accountOrders, customEndDate, customStartDate, dateFilter, searchTerm, sortOrder, statusFilter]
  );

  const summary = useMemo(() => summarizeOrders(filteredOrders), [filteredOrders]);
  const accountSummary = useMemo(() => summarizeOrders(accountOrders), [accountOrders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ORDERS_PER_PAGE;
  const paginatedOrders = useMemo(
    () => filteredOrders.slice(pageStartIndex, pageStartIndex + ORDERS_PER_PAGE),
    [filteredOrders, pageStartIndex]
  );
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, safeCurrentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    start = Math.max(1, end - maxButtons + 1);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }, [safeCurrentPage, totalPages]);

  const totalRechargeAmount = useMemo(() => {
    const accountCurrencyCode = String(user?.currency || 'USD').toUpperCase();
    const accountCurrency = getCurrencyMeta(accountCurrencyCode, currencies);
    const totalInAccountCurrency = filteredOrders.reduce((total, order) => {
      const orderCurrencyCode = getOrderCurrencyCode(order);
      const orderCurrency = getCurrencyMeta(orderCurrencyCode, currencies);
      const amount = getOrderAmountValue(order);
      const amountInUsd = amount / orderCurrency.rate;

      return total + (amountInUsd * accountCurrency.rate);
    }, 0);

    return formatCurrencyAmount(
      totalInAccountCurrency,
      accountCurrencyCode,
      currencies,
      locale
    );
  }, [currencies, filteredOrders, locale, user?.currency]);

  const selectedOrder = useMemo(
    () => accountOrders.find((order) => order.id === selectedOrderId) || null,
    [accountOrders, selectedOrderId]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [customEndDate, customStartDate, dateFilter, searchTerm, sortOrder, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const orderIdFromQuery = String(routeOrderId || searchParams.get('orderId') || '').trim();
    if (!orderIdFromQuery) {
      setSelectedOrderId(null);
      return;
    }

    setSelectedOrderId(orderIdFromQuery);
    if (!orderOwnerScopeId) return;
    void getOrderById(orderIdFromQuery, orderOwnerScopeId).catch(() => {});
  }, [getOrderById, orderOwnerScopeId, routeOrderId, searchParams]);

  const formatCount = (value) => formatNumber(value, locale);
  const visibleStart = filteredOrders.length ? pageStartIndex + 1 : 0;
  const visibleEnd = Math.min(pageStartIndex + paginatedOrders.length, filteredOrders.length);
  const PreviousIcon = isArabic ? ChevronRight : ChevronLeft;
  const NextIcon = isArabic ? ChevronLeft : ChevronRight;

  return (
    <div className="orders-page-neon min-w-0 space-y-3 pb-3">
      <section className="orders-page-neon__hero">
        <div className="orders-page-neon__hero-grid">
          <div className="orders-page-neon__intro">
            <div className="orders-page-neon__kicker">
              <span className="orders-page-neon__hero-icon">
                <PackageCheck className="h-5 w-5" />
              </span>
              <span>
                {isArabic ? 'لوحة الطلبات' : 'Orders Hub'}
              </span>
            </div>
            <h1>{isArabic ? 'طلباتي' : 'My Orders'}</h1>
            <p>
              {isArabic
                ? 'عرض ومتابعة طلبات هذا الحساب، مع البحث برقم الطلب فقط.'
                : 'View and track this account orders, searchable by order number only.'}
            </p>
            <div className="orders-page-neon__total">
              <span className="orders-page-neon__total-icon">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <span>
                <small>{isArabic ? 'إجمالي الطلبات' : 'Total orders'}</small>
                <strong>{formatCount(accountSummary.total)}</strong>
              </span>
            </div>
          </div>

          <div className="orders-page-neon__summary-grid">
            <SummaryCard
              icon={Clock3}
              label={isArabic ? 'قيد التنفيذ' : 'In progress'}
              value={formatCount(summary.processing)}
              tone="amber"
            />
            <SummaryCard
              icon={CheckCircle2}
              label={isArabic ? 'مكتملة' : 'Completed'}
              value={formatCount(summary.completed)}
              tone="emerald"
            />
            <SummaryCard
              icon={Coins}
              label={isArabic ? 'إجمالي مبلغ الشحن' : 'Total recharge'}
              value={totalRechargeAmount}
              tone="rose"
              isMoney
            />
          </div>
        </div>
      </section>

      <OrdersFiltersBar
        isArabic={isArabic}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        compact
        collapsible
        defaultCollapsed
        showTypeFilter={false}
        showDateFilter={false}
        resultCount={filteredOrders.length}
        panelClassName="orders-page-neon__filters"
        searchPlaceholder={isArabic
          ? 'ابحث برقم الطلب أو معرف المستخدم'
          : 'Search by order number or user ID'}
        helperText={isArabic
          ? 'ابحث برقم الطلب، معرف الحساب داخل الطلب، أو ID حسابك بالموقع.'
          : 'Search by order number, in-order account ID, or your site user ID.'}
        customRange={{
          startDate: customStartDate,
          endDate: customEndDate,
          onStartDateChange: setCustomStartDate,
          onEndDateChange: setCustomEndDate,
          helperText: isArabic
            ? 'فلترة الطلبات حسب تاريخ الإنشاء من بداية اليوم الأول لنهاية اليوم الأخير.'
            : 'Filters orders by creation date from the start date through the end date.',
        }}
        onApplyFilters={() => {
          setCurrentPage(1);
        }}
      />

      {filteredOrders.length ? (
        <>
          <div className="orders-page-neon__orders-grid grid grid-cols-1 gap-2 xl:grid-cols-2">
            {paginatedOrders.map((order) => (
              <CustomerOrderCard
                key={order.id}
                order={order}
                isArabic={isArabic}
                currencies={currencies}
                onSelect={() => {
                  setSelectedOrderId(order.id);
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.set('orderId', order.id);
                  setSearchParams(nextParams, { replace: true });
                  void getOrderById(order.id, orderOwnerScopeId).catch(() => {});
                }}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav
              className="orders-page-neon__pagination flex flex-col gap-2 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-card-rgb)/0.78)] p-2.5 shadow-[var(--shadow-subtle)] sm:flex-row sm:items-center sm:justify-between"
              aria-label={isArabic ? 'صفحات الطلبات' : 'Orders pages'}
            >
              <p className="text-center text-xs font-bold text-[var(--color-text-secondary)] sm:text-start">
                {isArabic
                  ? `عرض ${formatCount(visibleStart)}-${formatCount(visibleEnd)} من ${formatCount(filteredOrders.length)} طلب`
                  : `Showing ${formatCount(visibleStart)}-${formatCount(visibleEnd)} of ${formatCount(filteredOrders.length)} orders`}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.58)] px-3 text-[11px] font-black text-[var(--color-text)] transition hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.34)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  <PreviousIcon className="h-3.5 w-3.5" />
                  <span>{isArabic ? 'الصفحة السابقة' : 'Previous page'}</span>
                </button>

                <div className="flex items-center gap-1" dir="ltr">
                  {pageNumbers[0] > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(1)}
                        className="h-9 min-w-9 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.52)] px-3 text-[11px] font-black text-[var(--color-text)] transition hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.34)]"
                      >
                        1
                      </button>
                      <span className="px-1 text-sm font-black text-[var(--color-muted)]">...</span>
                    </>
                  ) : null}

                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === safeCurrentPage ? 'page' : undefined}
                      className={`h-9 min-w-9 rounded-lg border px-3 text-[11px] font-black transition hover:-translate-y-0.5 ${
                        page === safeCurrentPage
                          ? 'border-[color:rgb(var(--color-primary-rgb)/0.52)] bg-[linear-gradient(135deg,rgb(var(--color-primary-rgb)/0.2),rgb(168_85_247/0.14))] text-[var(--color-primary)] shadow-[0_0_24px_-16px_rgb(var(--color-primary-rgb)/0.9)]'
                          : 'border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.52)] text-[var(--color-text)] hover:border-[color:rgb(var(--color-primary-rgb)/0.34)]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {pageNumbers[pageNumbers.length - 1] < totalPages ? (
                    <>
                      <span className="px-1 text-sm font-black text-[var(--color-muted)]">...</span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(totalPages)}
                        className="h-9 min-w-9 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.52)] px-3 text-[11px] font-black text-[var(--color-text)] transition hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.34)]"
                      >
                        {totalPages}
                      </button>
                    </>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.32)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-3 text-[11px] font-black text-[var(--color-primary)] shadow-[var(--shadow-subtle)] transition hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.48)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  <span>{isArabic ? 'الصفحة التالية' : 'Next page'}</span>
                  <NextIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyOrdersState
          title={isLoading
            ? (isArabic ? 'جارٍ تحميل الطلبات' : 'Loading orders')
            : (isArabic ? 'لا توجد طلبات حتى الآن' : 'No orders yet')}
          description={isLoading
            ? (isArabic ? 'نقوم بجلب طلباتك الحالية من النظام.' : 'We are fetching your current orders from the system.')
            : (isArabic
              ? 'عندما تنشئ طلبًا جديدًا سيظهر هنا مع حالته وتفاصيله كاملة.'
              : 'Once you place a new order, it will appear here with its status and details.')}
          actionLabel={isLoading ? '' : (isArabic ? 'تصفح المنتجات' : 'Browse products')}
          actionTo={isLoading ? '' : '/products'}
        />
      )}

      <OrderDetailsDrawer
        isOpen={Boolean(selectedOrder)}
        onClose={() => {
          setSelectedOrderId(null);
          if (routeOrderId) {
            navigate('/orders', { replace: true });
            return;
          }
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('orderId');
          setSearchParams(nextParams, { replace: true });
        }}
        order={selectedOrder}
        isArabic={isArabic}
        currencies={currencies}
        view="customer"
      />
    </div>
  );
};

export default Orders;
