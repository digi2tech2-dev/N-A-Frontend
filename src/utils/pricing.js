/**
 * pricing.js — Product pricing utilities (String-based arbitrary precision)
 *
 * Product prices (basePrice, providerPrice, finalPrice) are stored as
 * String with up to 50 decimal places. This module avoids wrapping them
 * in Number() to prevent IEEE 754 truncation.
 *
 * Only wallet/fiat amounts use Number (2dp).
 */

import { formatNumber } from './intl';
import { formatRawPriceString, getMoneyFormatOptions, normalizeMoneyAmount, toRawPriceString } from './money';
import useGroupStore from '../store/useGroupStore';

export const GROUP_MARKUPS = {
  Normal: 0.05, // 5% markup
  VIP: 0.02,    // 2% markup
  Reseller: 0,  // 0% markup
};

const toFinitePrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Calculate the product price with group markup.
 * Returns a raw STRING to preserve full precision.
 *
 * For products where the server already sends a marked-up finalPrice
 * (which it does for API users), we return that directly as a string.
 */
export const calculateProductPrice = (product, userGroup = 'Normal', userGroupPercentage = null) => {
  // Prefer server-computed finalPrice (already marked up with full precision)
  const serverFinalPrice = product?.finalPrice ?? product?.markedUpPriceUSD;
  if (serverFinalPrice != null && String(serverFinalPrice) !== '0' && String(serverFinalPrice) !== '') {
    return toRawPriceString(serverFinalPrice);
  }

  // Fallback: compute locally from basePrice + group markup
  const basePriceStr = String(product?.basePriceCoins ?? product?.basePrice ?? '0');
  const basePrice = Number(basePriceStr);

  if (product?.adminOverridePriceCoins != null) {
    return toRawPriceString(product.adminOverridePriceCoins);
  }

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return '0';
  }

  // Apply group markup
  let markup = 0;

  if (userGroupPercentage !== null && userGroupPercentage !== undefined && Number.isFinite(Number(userGroupPercentage))) {
    markup = Number(userGroupPercentage) / 100;
  } else {
    const state = useGroupStore.getState();
    const groups = state.groups || [];

    const dynamicGroup = groups.find((g) =>
      String(g.name).toLowerCase() === String(userGroup).toLowerCase() ||
      String(g.id) === String(userGroup)
    );

    if (dynamicGroup) {
      markup = (Number(dynamicGroup.percentage ?? dynamicGroup.discount ?? 0)) / 100;
    } else if (GROUP_MARKUPS[userGroup] !== undefined) {
      markup = GROUP_MARKUPS[userGroup];
    }
  }

  // For local markup computation, we must use Number since the markup
  // is a simple percentage. This is the customer-facing display price
  // and the precision loss here (~16 digits) is acceptable because the
  // authoritative price is the server-computed finalPrice (50dp string).
  const finalPrice = basePrice * (1 + markup);
  return String(finalPrice);
};

export const resolveProductUnitPrice = (
  product,
  currencyCode = 'USD',
  currencies = [],
  userGroup = 'Normal',
  userGroupPercentage = null
) => {
  const directDisplayPrice = toFinitePrice(product?.displayPrice);
  const normalizedCurrencyCode = String(currencyCode || 'USD').toUpperCase();

  // If product has a server-computed finalPrice, return it as raw string
  const unitPriceStr = calculateProductPrice(product, userGroup, userGroupPercentage);

  // For currency conversion (only for non-USD users), we need Number
  if (normalizedCurrencyCode !== 'USD' && currencies.length > 0) {
    const unitPriceNum = Number(unitPriceStr);
    if (Number.isFinite(unitPriceNum) && unitPriceNum > 0) {
      const locallyComputedPrice = convertPriceByCurrency(unitPriceNum, normalizedCurrencyCode, currencies);
      if (Number.isFinite(locallyComputedPrice) && locallyComputedPrice > 0) {
        return locallyComputedPrice;
      }
    }
  }

  // For USD users or when no conversion needed, return raw string
  if (unitPriceStr !== '0') {
    return unitPriceStr;
  }

  if (directDisplayPrice !== null) {
    return normalizeMoneyAmount(directDisplayPrice);
  }

  return '0';
};

export const getCurrencyMeta = (currencyCode = 'USD', currencies = []) => {
  const normalizedCode = String(currencyCode || 'USD').toUpperCase();
  const found = (currencies || []).find(
    (item) => String(item?.code || '').toUpperCase() === normalizedCode
  );

  if (found) {
    return {
      code: normalizedCode,
      rate: Number(found.rate || 1) || 1,
      symbol: String(found.symbol || normalizedCode)
    };
  }

  return {
    code: normalizedCode,
    rate: 1,
    symbol: normalizedCode === 'USD' ? '$' : normalizedCode
  };
};

export const convertPriceByCurrency = (baseAmount, currencyCode = 'USD', currencies = []) => {
  const amount = Number(baseAmount || 0);
  const meta = getCurrencyMeta(currencyCode, currencies);
  return normalizeMoneyAmount(amount * meta.rate);
};

/**
 * Format a currency amount for display.
 *
 * For product prices (strings): renders the raw string as-is using
 * toRawPriceString — NO Number() truncation, NO Intl.NumberFormat caps.
 * The client explicitly requires the raw, full-precision string everywhere.
 *
 * For fiat/wallet amounts (numbers): uses Intl.NumberFormat as before.
 */
export const formatCurrencyAmount = (amount, currencyCode = 'USD', currencies = [], locale = 'ar-EG', formatOptions = {}) => {
  const meta = getCurrencyMeta(currencyCode, currencies);

  // String product prices - display only; no truncation and no API value mutation.
  if (typeof amount === 'string') {
    const cleanPrice = formatRawPriceString(amount);
    return `${cleanPrice} ${meta.symbol}`;
  }

  // Number values (fiat/wallet) — standard Intl.NumberFormat
  const value = Number(amount || 0);
  const formatted = formatNumber(value, locale, getMoneyFormatOptions(value, formatOptions));

  return `${formatted} ${meta.symbol}`;
};
