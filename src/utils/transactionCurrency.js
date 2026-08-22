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
  transaction?.originalCurrency,
  resolveSnapshotExecutionCurrency(transaction?.financialSnapshot),
  resolveOrderExecutionCurrency(transaction?.order),
  resolveTopupExecutionCurrency(transaction?.topup),
  transaction?.currencyCode,
  transaction?.currency,
  transaction?.walletCurrency,
  transaction?.user?.currency
);

export const resolveWalletTransactionExecutionCurrency = (transaction = {}, fallback = '') => firstCurrencyCode(
  transaction?.originalCurrency,
  resolveSnapshotExecutionCurrency(transaction?.financialSnapshot),
  resolveOrderExecutionCurrency(transaction?.order),
  resolveTopupExecutionCurrency(transaction?.topup),
  transaction?.currencyCode,
  transaction?.currency,
  transaction?.walletCurrency,
  transaction?.user?.currency,
  fallback
);
