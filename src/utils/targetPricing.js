export const TARGET_BASE_EXCHANGE_RATE = 50;

export const getTargetCommissionRate = (productRate) => {
  const normalizedProductRate = Number(productRate);
  if (!Number.isFinite(normalizedProductRate) || normalizedProductRate <= 0) return 0;

  const rate = ((TARGET_BASE_EXCHANGE_RATE - normalizedProductRate) / TARGET_BASE_EXCHANGE_RATE) * 100;
  return Number(Math.min(100, Math.max(0, rate)).toFixed(2));
};

export const getTargetPricing = (dollarAmount, productRate) => {
  const normalizedAmount = Math.max(0, Number(dollarAmount) || 0);
  const commissionRate = getTargetCommissionRate(productRate);
  const grossAmount = normalizedAmount * TARGET_BASE_EXCHANGE_RATE;
  const commissionValue = (grossAmount * commissionRate) / 100;

  return {
    baseExchangeRate: TARGET_BASE_EXCHANGE_RATE,
    commissionRate,
    grossAmount,
    commissionValue,
    walletBalance: Math.max(0, grossAmount - commissionValue),
  };
};

