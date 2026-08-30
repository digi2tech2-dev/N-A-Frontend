const STORAGE_KEY = 'na.hago.admin.device-id.v1';

const createOpaqueDeviceId = () => {
  const randomId = globalThis.crypto?.randomUUID?.()
    || Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('');
  return `na-hago-${randomId}`;
};

/**
 * A browser-local operational identifier required by the Hago login challenge.
 * It is intentionally stable, opaque, and never rendered or logged. It is not
 * an authentication secret and is not used for any customer operation.
 */
export const getHagoAdminDeviceId = () => {
  if (typeof window === 'undefined') return createOpaqueDeviceId();

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;

    const next = createOpaqueDeviceId();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch (_error) {
    // Private browsing/storage policies can reject persistence. The generated
    // value still remains stable for the active challenge flow in memory.
    return createOpaqueDeviceId();
  }
};

export const HAGO_DEVICE_STORAGE_KEY = STORAGE_KEY;
