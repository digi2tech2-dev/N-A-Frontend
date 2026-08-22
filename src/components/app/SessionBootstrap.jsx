import { useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import apiClient from '../../services/client';

const AUTH_FORCE_LOGOUT_EVENT = 'auth:force-logout';
const PAYMENT_SETTINGS_BROADCAST_CHANNEL = 'payment-settings-updates';

const BOOTSTRAP_IDLE_TIMEOUT = 1800;
const PROFILE_SYNC_COOLDOWN = 2 * 60 * 1000;
const PROFILE_SYNC_INTERVAL = 5 * 60 * 1000;
const PAYMENT_SETTINGS_POLL_INTERVAL = 60 * 1000;
let systemStorePromise = null;

const loadMediaStore = () => import('../../store/useMediaStore').then((module) => module.default);
const loadGroupStore = () => import('../../store/useGroupStore').then((module) => module.default);
const loadAdminStore = () => import('../../store/useAdminStore').then((module) => module.default);

const loadSystemStore = () => {
  if (!systemStorePromise) {
    systemStorePromise = import('../../store/useSystemStore').then((module) => module.default);
  }

  return systemStorePromise;
};

const scheduleIdleTask = (callback, timeout = BOOTSTRAP_IDLE_TIMEOUT) => {
  if (typeof window === 'undefined') return null;

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }

  return window.setTimeout(callback, timeout);
};

const clearIdleTask = (handle) => {
  if (typeof window === 'undefined' || handle == null) return;

  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};

const runSilently = async (task) => {
  try {
    await task();
  } catch {
    // Bootstrap work must never block rendering.
  }
};

const loadReferenceData = async ({ userRole, force = false } = {}) => {
  const tasks = [
    loadMediaStore()
      .then((store) => store.getState().loadProducts?.({ force })),
    loadSystemStore()
      .then((store) => store.getState().loadPaymentSettings?.({ force })),
  ];

  if (userRole !== 'customer') {
    tasks.push(
      loadGroupStore()
        .then((store) => store.getState().loadGroups?.({ force }))
    );
  }

  if (userRole === 'admin') {
    tasks.push(
      loadAdminStore()
        .then((store) => store.getState().loadUsers?.({ force }))
    );
  }

  await Promise.allSettled(tasks);
};

const startPaymentSettingsPolling = () => {
  void loadSystemStore()
    .then((store) => {
      store.getState().startPaymentSettingsPolling?.(PAYMENT_SETTINGS_POLL_INTERVAL);
    })
    .catch(() => {});
};

const stopPaymentSettingsPolling = () => {
  if (!systemStorePromise) return;

  void loadSystemStore()
    .then((store) => {
      store.getState().stopPaymentSettingsPolling?.();
    })
    .catch(() => {});
};

const SessionBootstrap = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const userRole = useAuthStore((state) => String(state.user?.role || '').toLowerCase());
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handler = (event) => {
      const reason = event?.detail?.reason;
      logout?.(reason);
    };

    window.addEventListener(AUTH_FORCE_LOGOUT_EVENT, handler);
    return () => window.removeEventListener(AUTH_FORCE_LOGOUT_EVENT, handler);
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated || !token || !userId) return undefined;

    let cancelled = false;
    let idleHandle = null;

    const syncSession = async () => {
      await runSilently(async () => {
        await useAuthStore.getState().refreshProfile?.({ force: true });
      });

      if (cancelled) return;

      idleHandle = scheduleIdleTask(() => {
        void runSilently(async () => {
          if (!cancelled) {
            await loadReferenceData({ userRole, force: false });
          }
        });
      });
    };

    void syncSession();

    return () => {
      cancelled = true;
      clearIdleTask(idleHandle);
    };
  }, [isAuthenticated, token, userId, userRole]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !token || !userId) return undefined;

    let lastSyncAt = Date.now();
    let syncInFlight = false;

    const syncFreshProfile = async () => {
      if (document.visibilityState === 'hidden' || syncInFlight) return;

      const now = Date.now();
      if (now - lastSyncAt < PROFILE_SYNC_COOLDOWN) return;

      lastSyncAt = now;
      syncInFlight = true;

      try {
        await useAuthStore.getState().refreshProfile?.({ force: true });
      } finally {
        syncInFlight = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncFreshProfile();
      }
    };

    window.addEventListener('focus', syncFreshProfile);
    window.addEventListener('online', syncFreshProfile);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(syncFreshProfile, PROFILE_SYNC_INTERVAL);

    return () => {
      window.removeEventListener('focus', syncFreshProfile);
      window.removeEventListener('online', syncFreshProfile);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, token, userId]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      stopPaymentSettingsPolling();
      return undefined;
    }

    startPaymentSettingsPolling();

    return () => {
      stopPaymentSettingsPolling();
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel || !isAuthenticated || !token) return undefined;

    const channel = new BroadcastChannel(PAYMENT_SETTINGS_BROADCAST_CHANNEL);
    channel.onmessage = (event) => {
      if (event?.data?.type === 'payment-settings:changed') {
        void runSilently(async () => {
          const store = await loadSystemStore();
          await store.getState().loadPaymentSettings?.({ force: true });
        });
      }
    };

    return () => channel.close();
  }, [isAuthenticated, token]);

  return null;
};

export default SessionBootstrap;
