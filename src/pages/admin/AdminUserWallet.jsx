import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import useAdminStore from '../../store/useAdminStore';
import useAuthStore from '../../store/useAuthStore';
import { formatDateTime, formatNumber, getNumericLocale } from '../../utils/intl';
import { formatWalletAmount } from '../../utils/storefront';
import { resolveUserAvatar } from '../../utils/avatar';
import { getAccountStatusBadgeVariant, getAccountStatusLabel } from '../../utils/accountStatus';
import { PERMISSIONS, hasPermission } from '../../utils/permissions';

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getSignedAmount = (transaction) => {
  const explicitAmount = Number(transaction?.signedAmount);
  if (Number.isFinite(explicitAmount)) return explicitAmount;

  const amount = Math.abs(toFiniteNumber(transaction?.amount, 0));
  return String(transaction?.type || '').trim().toLowerCase() === 'debit' ? -amount : amount;
};

const WALLET_TRANSACTIONS_PER_PAGE = 20;

const AdminUserWallet = () => {
  const { userId = '' } = useParams();
  const location = useLocation();
  const normalizedUserId = decodeURIComponent(String(userId || '')).trim();
  const {
    users,
    wallets,
    userWalletTransactions,
    getUserById,
    getUserWallet,
    getUserWalletTransactions,
    updateUserCoins,
    setUserBalance,
  } = useAdminStore();
  const actor = useAuthStore((state) => state.user);
  const { addToast } = useToast();

  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [targetBalance, setTargetBalance] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [transactionsPage, setTransactionsPage] = useState(1);
  const locale = getNumericLocale('ar-EG');
  const canManageWallet = hasPermission(actor, PERMISSIONS.MANAGE_WALLET);

  const loadWalletPage = useCallback(async () => {
    if (!normalizedUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [userResult, walletResult] = await Promise.allSettled([
        getUserById(normalizedUserId, { force: true }),
        getUserWallet(normalizedUserId, { force: true }),
        getUserWalletTransactions(normalizedUserId, { force: true }),
      ]);

      if (userResult.status === 'fulfilled' && userResult.value) {
        setUser(userResult.value);
      }
      if (walletResult.status === 'fulfilled' && walletResult.value) {
        setWallet(walletResult.value);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getUserById, getUserWallet, getUserWalletTransactions, normalizedUserId]);

  useEffect(() => {
    void loadWalletPage();
  }, [loadWalletPage]);

  const resolvedUser = user || (users || []).find((entry) => String(entry?.id || '').trim() === normalizedUserId) || null;
  const resolvedWallet = wallet || (wallets || []).find((entry) => (
    String(entry?.userId || entry?.id || '').trim() === normalizedUserId
  )) || null;

  const transactions = useMemo(() => {
    const fullHistory = Array.isArray(userWalletTransactions?.[normalizedUserId])
      ? userWalletTransactions[normalizedUserId]
      : [];
    const source = fullHistory.length ? fullHistory : (resolvedWallet?.recentTransactions || []);

    return [...source].sort((left, right) => (
      new Date(right?.createdAt || right?.date || 0).getTime()
      - new Date(left?.createdAt || left?.date || 0).getTime()
    ));
  }, [normalizedUserId, resolvedWallet?.recentTransactions, userWalletTransactions]);

  const transactionsPagesCount = Math.max(
    1,
    Math.ceil(transactions.length / WALLET_TRANSACTIONS_PER_PAGE)
  );
  const visibleTransactions = useMemo(() => {
    const startIndex = (transactionsPage - 1) * WALLET_TRANSACTIONS_PER_PAGE;
    return transactions.slice(startIndex, startIndex + WALLET_TRANSACTIONS_PER_PAGE);
  }, [transactions, transactionsPage]);

  useEffect(() => {
    setTransactionsPage(1);
  }, [normalizedUserId]);

  useEffect(() => {
    setTransactionsPage((currentPage) => Math.min(currentPage, transactionsPagesCount));
  }, [transactionsPagesCount]);

  useEffect(() => {
    if (isLoading || !location.hash) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const targetId = location.hash === '#account-history' ? 'account-history' : 'wallet-management';
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, location.hash, normalizedUserId]);

  const currency = resolvedWallet?.currency || resolvedUser?.currency || 'USD';
  const walletBalance = toFiniteNumber(resolvedWallet?.walletBalance ?? resolvedWallet?.balance ?? resolvedUser?.coins, 0);
  const transactionsCount = toFiniteNumber(resolvedWallet?.transactionsCount, transactions.length);

  const formatDate = (value) => {
    if (!value) return 'غير متوفر';
    return formatDateTime(value, locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const applyWalletChange = async (action) => {
    if (!canManageWallet || !normalizedUserId || pendingAction) return;

    const rawValue = action === 'set' ? targetBalance : adjustmentAmount;
    const amount = Number(rawValue);
    const requiresPositiveAmount = action !== 'set';

    if (!Number.isFinite(amount) || (requiresPositiveAmount ? amount <= 0 : String(rawValue).trim() === '')) {
      addToast(
        action === 'set'
          ? 'أدخل رصيدًا صحيحًا لتعيينه للحساب.'
          : 'أدخل مبلغًا صحيحًا أكبر من صفر.',
        'error'
      );
      return;
    }

    setPendingAction(action);
    try {
      if (action === 'set') {
        await setUserBalance(normalizedUserId, amount, actor);
        setTargetBalance('');
        addToast(`تم تعيين رصيد الحساب إلى ${formatWalletAmount(amount, currency)}.`, 'success');
      } else {
        const signedAmount = action === 'deduct' ? -Math.abs(amount) : Math.abs(amount);
        await updateUserCoins(normalizedUserId, signedAmount, actor);
        setAdjustmentAmount('');
        if (action === 'deduct') {
          addToast(`تم خصم ${formatWalletAmount(Math.abs(amount), currency)} من الحساب.`, 'success');
        } else {
          addToast(`تمت إضافة ${formatWalletAmount(amount, currency)} إلى الحساب.`, 'success');
        }
      }

      await loadWalletPage();
    } catch (error) {
      addToast(
        error?.message || (action === 'set'
          ? 'تعذر تعيين رصيد الحساب.'
          : action === 'deduct'
            ? 'تعذر خصم الرصيد.'
            : 'تعذر إضافة الرصيد.'),
        'error'
      );
    } finally {
      setPendingAction('');
    }
  };

  if (!normalizedUserId) {
    return (
      <Card variant="elevated" className="p-8 text-center">
        <p className="text-sm font-semibold text-[var(--color-text)]">معرّف العميل غير صالح.</p>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4 pb-6">
      <section id="wallet-management" className="admin-premium-hero relative scroll-mt-24 overflow-hidden p-3.5 sm:p-5">
        <span className="pointer-events-none absolute -end-16 -top-20 h-44 w-44 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.16)] blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {resolvedUser ? (
              <img
                src={resolveUserAvatar(resolvedUser, resolvedUser?.name || resolvedUser?.email || 'N&A HUB User')}
                alt={resolvedUser?.name || 'العميل'}
                className="h-14 w-14 shrink-0 rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] object-cover shadow-[0_18px_38px_-28px_rgb(0_0_0/0.82)] sm:h-16 sm:w-16"
              />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)] sm:h-16 sm:w-16">
                <UserRound className="h-6 w-6" />
              </span>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-black text-[var(--color-text)] sm:text-xl">
                  {resolvedUser?.name || (isLoading ? 'جارٍ تحميل العميل...' : 'عميل غير متوفر')}
                </h1>
                {resolvedUser?.status ? (
                  <Badge variant={getAccountStatusBadgeVariant(resolvedUser.status)}>
                    {getAccountStatusLabel(resolvedUser.status, true)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{resolvedUser?.email || '-'}</p>
              <p className="mt-1 break-all font-mono text-[9px] text-[var(--color-muted)]">ID: {normalizedUserId}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl px-3 text-xs sm:w-auto"
            onClick={() => { void loadWalletPage(); }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث المحفظة
          </Button>
        </div>

        <div className="relative mt-4 grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2 lg:grid-cols-4">
          <Card className="admin-premium-stat p-3.5">
            <p className="text-[11px] text-[var(--color-text-secondary)]">الرصيد الحالي</p>
            <p className={`mt-1.5 text-lg font-black ${walletBalance < 0 ? 'text-rose-600' : 'text-[var(--color-text)]'}`}>
              {formatWalletAmount(walletBalance, currency)}
            </p>
          </Card>
          <Card className="admin-premium-stat p-3.5">
            <p className="text-[11px] text-[var(--color-text-secondary)]">حد الدين</p>
            <p className="mt-1.5 text-lg font-black text-[var(--color-text)]">
              {formatWalletAmount(toFiniteNumber(resolvedUser?.creditLimit, 0), currency)}
            </p>
          </Card>
          <Card className="admin-premium-stat p-3.5">
            <p className="text-[11px] text-[var(--color-text-secondary)]">إجمالي العمليات</p>
            <p className="mt-1.5 text-lg font-black text-[var(--color-text)]">
              {formatNumber(transactionsCount, locale)}
            </p>
          </Card>
          <Card className="admin-premium-stat p-3.5">
            <p className="text-[11px] text-[var(--color-text-secondary)]">آخر حركة</p>
            <p className="mt-1.5 text-xs font-bold leading-5 text-[var(--color-text)]">
              {resolvedWallet?.lastTransactionAt ? formatDate(resolvedWallet.lastTransactionAt) : 'لا توجد حركة بعد'}
            </p>
          </Card>
        </div>

        <div className="relative mt-3.5 space-y-2.5">
          <Card className="admin-premium-stat p-3.5 sm:p-4">
            <div>
              <h2 className="text-sm font-black text-[var(--color-text)]">إدارة الرصيد</h2>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">أدخل المبلغ مرة واحدة ثم اختر الإضافة أو الخصم</p>
            </div>
            <div className="mt-3 flex flex-col gap-2 lg:flex-row">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={adjustmentAmount}
                onChange={(event) => setAdjustmentAmount(event.target.value)}
                placeholder="أدخل المبلغ"
                suffix={<span className="text-[10px] font-bold">{currency}</span>}
                className="payment-amount-input h-10 rounded-xl px-3 text-sm"
                disabled={!canManageWallet || Boolean(pendingAction)}
              />
              <div className="grid shrink-0 grid-cols-2 gap-2 lg:min-w-[15rem]">
                <Button
                  type="button"
                  variant="danger"
                  className="h-10 rounded-xl px-3 text-xs"
                  onClick={() => { void applyWalletChange('deduct'); }}
                  disabled={!canManageWallet || Boolean(pendingAction)}
                >
                  {pendingAction === 'deduct' ? 'جارٍ الخصم...' : 'خصم الرصيد'}
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-xl px-3 text-xs"
                  onClick={() => { void applyWalletChange('credit'); }}
                  disabled={!canManageWallet || Boolean(pendingAction)}
                >
                  {pendingAction === 'credit' ? 'جارٍ الإضافة...' : 'إضافة الرصيد'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="admin-premium-stat p-3.5 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
                  <Wallet className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-black text-[var(--color-text)]">تعيين رصيد الحساب</h2>
                  <p className="text-[10px] leading-4 text-[var(--color-text-secondary)]">استبدال الرصيد الحالي بقيمة جديدة محددة</p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={targetBalance}
                  onChange={(event) => setTargetBalance(event.target.value)}
                  placeholder={`الرصيد الحالي: ${formatWalletAmount(walletBalance, currency)}`}
                  suffix={<span className="text-[10px] font-bold">{currency}</span>}
                  className="payment-amount-input h-10 rounded-xl px-3 text-sm"
                  disabled={!canManageWallet || Boolean(pendingAction)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 rounded-xl px-4 text-xs sm:min-w-[9rem]"
                  onClick={() => { void applyWalletChange('set'); }}
                  disabled={!canManageWallet || Boolean(pendingAction)}
                >
                  {pendingAction === 'set' ? 'جارٍ التعيين...' : 'تعيين الرصيد'}
                </Button>
              </div>
            </div>
            {!canManageWallet ? (
              <p className="mt-2 text-[10px] font-semibold text-amber-600">لا تملك صلاحية إدارة أرصدة المحافظ.</p>
            ) : null}
          </Card>
        </div>
      </section>

      <section id="account-history" className="admin-premium-panel scroll-mt-24 overflow-hidden p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <History className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-[var(--color-text)]">سجل المحفظة</h2>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">مرتب من الأحدث إلى الأقدم</p>
            </div>
          </div>
          <span className="wallet-accent-chip rounded-full px-2.5 py-1 text-[10px] font-semibold">
            {formatNumber(transactions.length, locale)} عملية
          </span>
        </div>

        {transactions.length ? (
          <div className="mt-3.5 grid grid-cols-1 gap-2.5 xl:grid-cols-2">
            {visibleTransactions.map((transaction, index) => {
              const signedAmount = getSignedAmount(transaction);
              const isCredit = signedAmount >= 0;
              const TransactionIcon = isCredit ? ArrowUpRight : ArrowDownLeft;
              const transactionCurrency = transaction?.currency || currency;

              return (
                <article
                  key={transaction?.id || transaction?._id || `${transaction?.createdAt || 'transaction'}-${index}`}
                  className="rounded-[1rem] border border-[color:rgb(var(--color-border-rgb)/0.76)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-3 shadow-[0_16px_36px_-34px_rgb(0_0_0/0.84)]"
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${isCredit ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-rose-500/20 bg-rose-500/10 text-rose-600'}`}>
                      <TransactionIcon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words text-xs font-bold text-[var(--color-text)]">
                            {transaction?.description || (isCredit ? 'إضافة رصيد' : 'خصم من الرصيد')}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
                            {formatDate(transaction?.createdAt || transaction?.date)}
                          </p>
                        </div>
                        <p className={`shrink-0 text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatWalletAmount(signedAmount, transactionCurrency, { signed: true })}
                        </p>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[color:rgb(var(--color-border-rgb)/0.55)] pt-2.5 text-[10px] text-[var(--color-text-secondary)]">
                        <span>{isCredit ? 'إضافة للمحفظة' : 'خصم من المحفظة'}</span>
                        {transaction?.balanceAfter !== null && transaction?.balanceAfter !== undefined ? (
                          <span>
                            الرصيد بعدها: <b className="font-bold text-[var(--color-text)]">{formatWalletAmount(transaction.balanceAfter, transactionCurrency)}</b>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Card className="mt-3.5 p-8 text-center">
            <Wallet className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
            <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
              {isLoading ? 'جارٍ تحميل سجل المحفظة...' : 'لا توجد عمليات محفوظة لهذا العميل'}
            </p>
          </Card>
        )}

        {transactionsPagesCount > 1 ? (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-[color:rgb(var(--color-border-rgb)/0.6)] pt-4 sm:flex-row">
            <p className="text-[10px] text-[var(--color-text-secondary)]">
              صفحة {formatNumber(transactionsPage, locale)} من {formatNumber(transactionsPagesCount, locale)}
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="صفحات سجل المحفظة">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-lg p-0"
                onClick={() => setTransactionsPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={transactionsPage === 1}
                aria-label="الصفحة السابقة"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>

              {Array.from({ length: transactionsPagesCount }, (_, index) => index + 1).map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === transactionsPage ? 'primary' : 'outline'}
                  className="h-8 min-w-8 rounded-lg px-2 text-[11px]"
                  onClick={() => setTransactionsPage(pageNumber)}
                  aria-current={pageNumber === transactionsPage ? 'page' : undefined}
                >
                  {formatNumber(pageNumber, locale)}
                </Button>
              ))}

              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-lg p-0"
                onClick={() => setTransactionsPage((currentPage) => Math.min(transactionsPagesCount, currentPage + 1))}
                disabled={transactionsPage === transactionsPagesCount}
                aria-label="الصفحة التالية"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </nav>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AdminUserWallet;
