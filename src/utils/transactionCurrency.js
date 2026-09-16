const normalizeCurrencyCode = (value) => String(value || '').trim().toUpperCase();

const firstCurrencyCode = (...values) => {
  for (const value of values) {
    const code = normalizeCurrencyCode(value);
    if (code) return code;
  }

  return '';
};

export const resolveSnapshotExecutionCurrency = (snapshot = {}, fallback = '') => firstCurrencyCode(
  snapshot?.originalCurrency,
  snapshot?.pricingSnapshot?.currency,
  fallback
);

export const resolveOrderExecutionCurrency = (order = {}, fallback = '') => firstCurrencyCode(
  resolveSnapshotExecutionCurrency(order?.financialSnapshot),
  order?.currencyCode,
  order?.currency,
  fallback
);

export const resolveTopupExecutionCurrency = (topup = {}, fallback = '') => firstCurrencyCode(
  resolveSnapshotExecutionCurrency(topup?.financialSnapshot),
  topup?.currencyCode,
  topup?.currency,
  fallback
);

export const resolveWalletTransactionOriginalCurrency = (transaction = {}) => firstCurrencyCode(
  transaction?.currency,
  transaction?.currencyCode,
  transaction?.originalCurrency,
  resolveSnapshotExecutionCurrency(transaction?.financialSnapshot),
  resolveOrderExecutionCurrency(transaction?.order),
  resolveTopupExecutionCurrency(transaction?.topup)
);

// WalletTransaction amounts are denominated only by their own immutable
// snapshot (or a nested immutable source snapshot). Never use a current user
// or wallet currency here: historical transactions may be genuinely unknown.
export const resolveWalletTransactionExecutionCurrency = (transaction = {}) => firstCurrencyCode(
  transaction?.currency,
  transaction?.currencyCode,
  transaction?.originalCurrency,
  resolveSnapshotExecutionCurrency(transaction?.financialSnapshot),
  resolveOrderExecutionCurrency(transaction?.order),
  resolveTopupExecutionCurrency(transaction?.topup)
);
