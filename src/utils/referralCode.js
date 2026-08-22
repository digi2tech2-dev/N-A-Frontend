const REFERRAL_BRIDGE_KEY = 'auth:pending-referral-code';
const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6,32}$/;

export const normalizeReferralCode = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : '';
};

export const readReferralCodeFromSearch = (search) => {
  const params = new URLSearchParams(search || '');
  return normalizeReferralCode(
    params.get('referralCode')
    || params.get('refCode')
    || params.get('ref')
    || params.get('inviteCode')
  );
};

export const persistReferralBridge = (value) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return '';

  const normalized = normalizeReferralCode(value);
  try {
    if (normalized) {
      window.sessionStorage.setItem(REFERRAL_BRIDGE_KEY, normalized);
    } else {
      window.sessionStorage.removeItem(REFERRAL_BRIDGE_KEY);
    }
  } catch {
    // Best-effort only; the URL/form state remains authoritative.
  }
  return normalized;
};

export const readReferralBridge = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return '';

  try {
    return normalizeReferralCode(window.sessionStorage.getItem(REFERRAL_BRIDGE_KEY));
  } catch {
    return '';
  }
};

export const clearReferralBridge = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    window.sessionStorage.removeItem(REFERRAL_BRIDGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};
