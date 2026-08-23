/**
 * money.js — Arbitrary-precision money utilities
 *
 * Product prices (basePrice, providerPrice, finalPrice) are stored as
 * String with up to 50 decimal places. These functions work with raw
 * string values wherever possible to avoid IEEE 754 truncation.
 *
 * Only chargedAmount / wallet amounts use Number (2 dp fiat).
 */

const DEFAULT_MONEY_FRACTION_DIGITS = 10;
const FRACTION_EPSILON = 1e-9;
const MAX_INTL_FRACTION_DIGITS = 20;

const normalizeIntlFractionDigits = (value) => (
  Number.isInteger(value)
    ? Math.min(MAX_INTL_FRACTION_DIGITS, Math.max(0, value))
    : null
);

/**
 * Convert a value to a finite Number. For DISPLAY / FIAT amounts only.
 * DO NOT use this for product prices — use raw string rendering instead.
 */
export const toFiniteMoneyNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Normalize a fiat money amount to a given fraction digits.
 * Only used for chargedAmount / wallet balances (2dp fiat).
 */
export const normalizeMoneyAmount = (value, fractionDigits = DEFAULT_MONEY_FRACTION_DIGITS) => {
  const safeValue = toFiniteMoneyNumber(value, 0);
  return Number(safeValue.toFixed(fractionDigits));
};

export const getWalletBalanceSummary = (source = {}) => {
  const hasLedgerInputs = (
    source?.walletBalance !== undefined
    || source?.coins !== undefined
    || source?.balance !== undefined
    || source?.creditLimit !== undefined
  );
  const walletBalance = normalizeMoneyAmount(
    source?.walletBalance ?? source?.coins ?? source?.balance ?? 0,
    2
  );
  const creditLimit = Math.max(0, normalizeMoneyAmount(source?.creditLimit ?? 0, 2));
  const derivedCreditUsed = walletBalance < 0
    ? normalizeMoneyAmount(Math.min(Math.abs(walletBalance), creditLimit), 2)
    : 0;
  const rawAvailableBalance = normalizeMoneyAmount(walletBalance + creditLimit, 2);
  const availableBalanceSource = hasLedgerInputs ? rawAvailableBalance : (source?.availableBalance ?? rawAvailableBalance);
  const availableBalance = normalizeMoneyAmount(Math.max(0, availableBalanceSource), 2);
  const availableCredit = normalizeMoneyAmount(
    Math.max(0, hasLedgerInputs ? (creditLimit - derivedCreditUsed) : (source?.availableCredit ?? (creditLimit - derivedCreditUsed))),
    2
  );

  return {
    walletBalance,
    creditLimit,
    creditUsed: derivedCreditUsed,
    availableCredit,
    availableBalance,
    currency: String(source?.currency || 'USD').toUpperCase(),
  };
};

/**
 * Return the raw string representation of a price exactly as stored.
 * This is the primary display function for product prices (basePrice,
 * providerPrice, finalPrice) — it does NOT truncate, round, or cap.
 *
 * Returns the string as-is, stripping only trailing zeros for readability.
 * Falls back to '0' for null/undefined/empty.
 */
export const toRawPriceString = (value) => {
  if (value == null || value === '') return '0';
  const str = String(value);
  // If there's a dot, strip trailing zeros: 0.001700 → 0.0017
  if (str.includes('.')) {
    return str.replace(/0+$/, '').replace(/\.$/, '');
  }
  return str;
};

export const formatRawPriceString = (value) => {
  const raw = toRawPriceString(value).trim();
  const match = raw.match(/^([+-]?)(\d+)(\.\d+)?$/);

  if (!match) return raw;

  const [, sign, integerPart, fractionPart = ''] = match;
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${groupedInteger}${fractionPart}`;
};

/**
 * Multiply a raw decimal product price by a whole-number quantity without
 * passing the USD amount through IEEE-754 floating point arithmetic.
 */
export const multiplyRawPriceByQuantity = (value, quantity) => {
  const rawPrice = toRawPriceString(value).trim();
  const safeQuantity = Number(quantity);

  if (!/^\d+(?:\.\d+)?$/.test(rawPrice) || !Number.isSafeInteger(safeQuantity) || safeQuantity < 0) {
    return '0';
  }

  const [integerPart, fractionPart = ''] = rawPrice.split('.');
  const decimalPlaces = fractionPart.length;
  const digits = `${integerPart}${fractionPart}`.replace(/^0+(?=\d)/, '') || '0';
  const multiplied = (BigInt(digits) * BigInt(safeQuantity)).toString().padStart(decimalPlaces + 1, '0');

  if (decimalPlaces === 0) return multiplied;

  const splitAt = multiplied.length - decimalPlaces;
  return toRawPriceString(`${multiplied.slice(0, splitAt)}.${multiplied.slice(splitAt)}`);
};

const getResolvedMoneyFractionDigits = (value, maxFractionDigits = DEFAULT_MONEY_FRACTION_DIGITS) => {
  const safeValue = Math.abs(toFiniteMoneyNumber(value, 0));
  const normalized = safeValue.toFixed(maxFractionDigits).replace(/0+$/, '').replace(/\.$/, '');
  const fractionPart = normalized.split('.')[1] || '';
  return fractionPart.length;
};

export const getMoneyFormatOptions = (
  value,
  {
    compact = false,
    maximumFractionDigits,
    minimumFractionDigits,
  } = {}
) => {
  const safeValue = Math.abs(toFiniteMoneyNumber(value, 0));
  const hasFraction = Math.abs(safeValue - Math.trunc(safeValue)) > FRACTION_EPSILON;
  const actualFractionDigits = hasFraction
    ? getResolvedMoneyFractionDigits(safeValue, DEFAULT_MONEY_FRACTION_DIGITS)
    : 0;

  const requestedMaximumFractionDigits = normalizeIntlFractionDigits(maximumFractionDigits);
  const requestedMinimumFractionDigits = normalizeIntlFractionDigits(minimumFractionDigits);
  const defaultMaximumFractionDigits = compact
    ? Math.min(Math.max(actualFractionDigits, 1), 2)
    : actualFractionDigits;
  const resolvedMaximumFractionDigits = requestedMaximumFractionDigits
    ?? Math.max(defaultMaximumFractionDigits, requestedMinimumFractionDigits ?? 0);
  const defaultMinimumFractionDigits = compact ? 0 : actualFractionDigits;
  const resolvedMinimumFractionDigits = Math.min(
    requestedMinimumFractionDigits ?? defaultMinimumFractionDigits,
    resolvedMaximumFractionDigits
  );

  return {
    maximumFractionDigits: resolvedMaximumFractionDigits,
    minimumFractionDigits: resolvedMinimumFractionDigits,
  };
};
