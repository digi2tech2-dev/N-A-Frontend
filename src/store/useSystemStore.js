import { create } from 'zustand';
import apiClient from '../services/client';
import { getDefaultWhatsAppNumber } from '../utils/whatsapp';
import { createDefaultPaymentGroups, normalizePaymentGroups } from '../utils/paymentSettings';
import { isRealProvider } from '../config/dataProvider';

// Polling interval for payment settings (ms). Keep reasonable to avoid excess requests.
const PAYMENT_SETTINGS_POLL_INTERVAL = 15 * 1000;
const PAYMENT_SETTINGS_BROADCAST_CHANNEL = 'payment-settings-updates';

const CURRENCIES_CACHE_KEY = 'kanz-coins:currencies-cache:v1';
const CURRENCIES_CACHE_TTL = isRealProvider ? 60 * 1000 : 5 * 60 * 1000;

let currenciesRequest = null;
let paymentSettingsRequest = null;
let paymentSettingsRequestId = 0;
let paymentSettingsPollId = null;

const readCurrenciesCache = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(CURRENCIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const currencies = Array.isArray(parsed?.currencies) ? parsed.currencies : null;
    const loadedAt = Number(parsed?.loadedAt || 0);
    if (!currencies || !Number.isFinite(loadedAt)) return null;
    return { currencies, loadedAt };
  } catch {
    return null;
  }
};

const writeCurrenciesCache = (currencies, loadedAt) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      CURRENCIES_CACHE_KEY,
      JSON.stringify({ currencies: Array.isArray(currencies) ? currencies : [], loadedAt: Number(loadedAt || 0) })
    );
  } catch {
    // Best-effort only.
  }
};

const createInitialPaymentSettings = () => ({
  countryAccounts: [],
  instructions: '',
  whatsappNumber: isRealProvider ? '' : getDefaultWhatsAppNumber(),
  paymentGroups: isRealProvider ? [] : createDefaultPaymentGroups(),
});

const normalizeStorePaymentSettings = (settings = {}) => ({
  countryAccounts: Array.isArray(settings?.countryAccounts) ? settings.countryAccounts : [],
  instructions: settings?.instructions || '',
  whatsappNumber: settings?.whatsappNumber || (isRealProvider ? '' : getDefaultWhatsAppNumber()),
  paymentGroups: normalizePaymentGroups(settings?.paymentGroups, { fallbackToDefault: !isRealProvider }),
});

const notifyPaymentSettingsChanged = () => {
  if (typeof window === 'undefined' || !window.BroadcastChannel) return;

  try {
    const channel = new BroadcastChannel(PAYMENT_SETTINGS_BROADCAST_CHANNEL);
    channel.postMessage({ type: 'payment-settings:changed', at: Date.now() });
    channel.close();
  } catch {
    // The in-memory store has already been updated for the current tab.
  }
};

const useSystemStore = create((set, get) => ({
  currencies: (() => {
    const cached = isRealProvider ? readCurrenciesCache() : null;
    return Array.isArray(cached?.currencies) ? cached.currencies : [];
  })(),
  isLoadingCurrencies: false,
  currenciesLastLoadedAt: (() => {
    const cached = isRealProvider ? readCurrenciesCache() : null;
    return Number(cached?.loadedAt || 0) || 0;
  })(),
  paymentSettings: createInitialPaymentSettings(),

  loadCurrencies: async ({ force = true } = {}) => {
    const state = get();
    const hasCurrencies = Array.isArray(state.currencies) && state.currencies.length > 0;
    const loadedAt = Number(state.currenciesLastLoadedAt || 0);
    const cacheAge = loadedAt ? (Date.now() - loadedAt) : Number.POSITIVE_INFINITY;
    const cacheIsFresh = cacheAge >= 0 && cacheAge < CURRENCIES_CACHE_TTL;

    // Serve cached currencies immediately when still fresh (even if force=true).
    if (hasCurrencies && cacheIsFresh) {
      return state.currencies;
    }

    // Allow callers to opt-out via force=false.
    if (!force && hasCurrencies) {
      return state.currencies;
    }

    if (currenciesRequest) return currenciesRequest;
    set({ isLoadingCurrencies: !hasCurrencies });

    currenciesRequest = apiClient.system.currencies()
      .then((items) => {
        const nextCurrencies = Array.isArray(items) ? items : [];
        const nextLoadedAt = Date.now();
        set({
          currencies: nextCurrencies,
          isLoadingCurrencies: false,
          currenciesLastLoadedAt: nextLoadedAt,
        });
        writeCurrenciesCache(nextCurrencies, nextLoadedAt);
        return nextCurrencies;
      })
      .catch(() => {
        set({ isLoadingCurrencies: false });
        return get().currencies;
      })
      .finally(() => {
        currenciesRequest = null;
      });

    return currenciesRequest;
  },

  addCurrency: async (payload, actor) => {
    const created = await apiClient.system.addCurrency(payload, actor);
    set((state) => ({
      currencies: [...state.currencies, created],
      currenciesLastLoadedAt: Date.now(),
    }));
    return created;
  },

  updateCurrency: async (code, updates, actor) => {
    const updated = await apiClient.system.updateCurrency(code, updates, actor);
    set((state) => ({
      currencies: state.currencies.map((item) => (item.code === code ? updated : item)),
      currenciesLastLoadedAt: Date.now(),
    }));
    return updated;
  },

  deleteCurrency: async (code, actor) => {
    await apiClient.system.deleteCurrency(code, actor);
    set((state) => ({
      currencies: state.currencies.filter((item) => item.code !== code),
      currenciesLastLoadedAt: Date.now(),
    }));
  },

  ensureDefaultCurrency: () => {
    const list = get().currencies || [];
    if (!list.length) {
      set({
        currencies: [{ code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 }],
        currenciesLastLoadedAt: Date.now(),
      });
    }
  },

  loadPaymentSettings: async ({ force = true } = {}) => {
    // By default always fetch fresh data from the API to respect server-side truth.
    if (!force && get().paymentSettings && Array.isArray(get().paymentSettings.paymentGroups) && get().paymentSettings.paymentGroups.length) {
      return get().paymentSettings;
    }

    if (!force && paymentSettingsRequest) return paymentSettingsRequest;

    const requestId = ++paymentSettingsRequestId;
    const request = apiClient.system.paymentSettings()
      .then((settings) => {
        const nextPaymentSettings = normalizeStorePaymentSettings(settings);

        if (requestId === paymentSettingsRequestId) {
          set({
            paymentSettings: nextPaymentSettings,
          });
        }

        return nextPaymentSettings;
      })
      .catch(() => {
        // On error, keep current state but return a safe default
        if (!isRealProvider) return get().paymentSettings;
        const emptyPaymentSettings = createInitialPaymentSettings();
        if (requestId === paymentSettingsRequestId) {
          set({ paymentSettings: emptyPaymentSettings });
          return emptyPaymentSettings;
        }
        return get().paymentSettings;
      })
      .finally(() => {
        if (paymentSettingsRequest === request) {
          paymentSettingsRequest = null;
        }
      });

    paymentSettingsRequest = request;
    return paymentSettingsRequest;
  },

  savePaymentSettings: async (payload, actor) => {
    const normalizedPayload = {
      ...(payload || {}),
      ...(payload?.paymentGroups !== undefined ? {
        paymentGroups: normalizePaymentGroups(payload.paymentGroups, { fallbackToDefault: false }),
      } : {}),
    };
    const saved = await apiClient.system.updatePaymentSettings(normalizedPayload, actor);
    const nextPaymentSettings = normalizeStorePaymentSettings(saved);
    paymentSettingsRequestId += 1;
    paymentSettingsRequest = null;
    set({
      paymentSettings: nextPaymentSettings,
    });
    notifyPaymentSettingsChanged();
    return nextPaymentSettings;
  },
  // Start polling payment settings periodically (keeps data fresh).
  startPaymentSettingsPolling: (interval = PAYMENT_SETTINGS_POLL_INTERVAL) => {
    if (typeof window === 'undefined') return;
    if (paymentSettingsPollId) return;
    paymentSettingsPollId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        get().loadPaymentSettings({ force: true });
      } catch (e) {
        // ignore polling errors
      }
    }, interval);
  },
  stopPaymentSettingsPolling: () => {
    if (paymentSettingsPollId) {
      window.clearInterval(paymentSettingsPollId);
      paymentSettingsPollId = null;
    }
  },
}));

export default useSystemStore;
