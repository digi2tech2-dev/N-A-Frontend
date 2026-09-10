const STORAGE_KEY = 'na.inchill.admin.device-id.v1';

const createOpaqueDeviceId = () => {
  const randomId = globalThis.crypto?.randomUUID?.()
    || Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('');
  return `na-inchill-${randomId}`;
};

/**
 * Browser-local operational identifier for Inchill OTP verification. It is
 * stable and opaque, is never rendered or logged, and is not a credential.
 */
export const getInchillAdminDeviceId = () => {
  if (typeof window === 'undefined') return createOpaqueDeviceId();

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;

    const next = createOpaqueDeviceId();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch (_error) {
    return createOpaqueDeviceId();
  }
};

export const INCHILL_DEVICE_STORAGE_KEY = STORAGE_KEY;
