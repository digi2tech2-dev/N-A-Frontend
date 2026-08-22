import { create } from 'zustand';
import apiClient from '../services/client';
import {
  getAccountAccessRoute,
  inferBlockedStatusFromError,
  isApprovedAccountStatus,
  normalizeAccountStatus,
} from '../utils/accountStatus';
import { getDefaultRouteForRole } from '../utils/authRoles';
import { formatAuthErrorMessage } from '../utils/authErrorMessages';
import { devLogger } from '../utils/devLogger';
import { getWalletBalanceSummary } from '../utils/money';

const AUTH_STORAGE_KEY = 'auth-storage';
const PROFILE_CACHE_TTL = 20 * 1000; // short TTL to keep UI responsive while staying reasonably fresh
let profileRefreshRequest = null;

const loadAdminUsersSilently = async () => {
  try {
    const useAdminStore = (await import('./useAdminStore')).default;
    await useAdminStore.getState().loadUsers({ force: true });
  } catch {
    // Keep auth flows independent from admin list hydration.
  }
};

const readStoredAuthState = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed?.state || {};
  } catch {
    return {};
  }
};

const writeStoredAuthState = (nextState = {}) => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const currentState = parsed?.state || {};
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ state: { ...currentState, ...nextState } }));
  } catch {
    // Best-effort only.
  }
};

const clearStoredAuthState = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const buildAuthOutcome = (user) => {
  const profileCompletionRequired = Boolean(user?.profileCompletionRequired);
  const status = profileCompletionRequired
    ? 'profile_completion_required'
    : normalizeAccountStatus(user?.status);
  return {
    ok: true,
    status,
    user: user || null,
    redirectTo: getAccountAccessRoute(status) || getDefaultRouteForRole(user?.role),
    canAccessApp: isApprovedAccountStatus(status),
  };
};

const buildBlockedOutcome = (status, user = null, error = null) => ({
  ok: false,
  status: normalizeAccountStatus(status),
  user,
  error,
  redirectTo: getAccountAccessRoute(status),
  canAccessApp: false,
});

const buildVerificationRequiredOutcome = (user = null) => ({
  ok: true,
  status: normalizeAccountStatus('verification_required'),
  user,
  error: null,
  redirectTo: getAccountAccessRoute('verification_required'),
  canAccessApp: false,
});

const pickPersistedUser = (user) => {
  if (!user) return null;
  const walletSummary = getWalletBalanceSummary(user);

  return {
    id: user.id || user._id || user.userId || '',
    _id: user._id || user.id || user.userId || '',
    name: user.name || '',
    username: user.username || '',
    email: user.email || '',
    avatar: user.avatar || '',
    role: user.role || 'customer',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    status: normalizeAccountStatus(user.status),
    verified: user.verified !== undefined ? Boolean(user.verified) : undefined,
    signupMethod: user.signupMethod || '',
    authProvider: user.authProvider || '',
    coins: walletSummary.walletBalance,
    walletBalance: walletSummary.walletBalance,
    balance: walletSummary.walletBalance,
    currency: walletSummary.currency,
    country: user.country || '',
    group: user.group || '',
    groupName: user.groupName || user.group || '',
    groupId: user.groupId || '',
    groupPercentage: user.groupPercentage ?? null,
    creditLimit: walletSummary.creditLimit,
    creditUsed: walletSummary.creditUsed,
    availableCredit: walletSummary.availableCredit,
    availableBalance: walletSummary.availableBalance,
    isApiEnabled: Boolean(user.isApiEnabled),
    referralCode: user.referralCode || user.inviteCode || '',
    inviteCode: user.inviteCode || user.referralCode || '',
    referralCount: user.referralCount ?? user.referralsCount ?? 0,
    referralRewards: user.referralRewards ?? user.referralEarnings ?? 0,
    referrals: Array.isArray(user.referrals) ? user.referrals : [],
    referredCustomers: Array.isArray(user.referredCustomers) ? user.referredCustomers : [],
    invitedCustomers: Array.isArray(user.invitedCustomers) ? user.invitedCustomers : [],
    referralWithdrawals: Array.isArray(user.referralWithdrawals) ? user.referralWithdrawals : [],
    withdrawalRequests: Array.isArray(user.withdrawalRequests) ? user.withdrawalRequests : [],
    whitelistIps: Array.isArray(user.whitelistIps) ? user.whitelistIps : [],
    webhookUrl: user.webhookUrl || '',
    phone: user.phone || '',
    twoFactorEnabled: user.twoFactorEnabled !== undefined ? Boolean(user.twoFactorEnabled) : undefined,
    profileCompletedAt: user.profileCompletedAt || null,
    isProfileComplete: user.isProfileComplete !== undefined ? Boolean(user.isProfileComplete) : undefined,
    profileCompletionRequired: Boolean(user.profileCompletionRequired),
    missingProfileFields: Array.isArray(user.missingProfileFields) ? user.missingProfileFields : [],
    emailChangedPending: user.emailChangedPending !== undefined ? Boolean(user.emailChangedPending) : undefined,
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
  };
};

const withCanonicalWalletFields = (user) => {
  if (!user) return user;
  const walletSummary = getWalletBalanceSummary(user);
  return {
    ...user,
    coins: walletSummary.walletBalance,
    walletBalance: walletSummary.walletBalance,
    balance: walletSummary.walletBalance,
    currency: walletSummary.currency,
    creditLimit: walletSummary.creditLimit,
    creditUsed: walletSummary.creditUsed,
    availableCredit: walletSummary.availableCredit,
    availableBalance: walletSummary.availableBalance,
  };
};

  const persistedAuthState = readStoredAuthState();
  const persistedAuthUser = pickPersistedUser(persistedAuthState.user);

const useAuthStore = create((set, get) => ({
    user: persistedAuthUser,
    token: persistedAuthState.token || null,
    isAuthenticated: Boolean(persistedAuthState.token),
      isLoading: false,
      error: null,
    blockedStatus: persistedAuthState.blockedStatus || null,
    blockedUser: persistedAuthState.blockedUser || null,
    profileLastLoadedAt: persistedAuthState.profileLastLoadedAt || 0,

      setBlockedAccess: (status, user = null) => {
        const normalizedStatus = normalizeAccountStatus(status);
        set({
          blockedStatus: normalizedStatus,
          blockedUser: user || null,
        });
        return buildBlockedOutcome(normalizedStatus, user);
      },

      clearBlockedAccess: () => {
        set({ blockedStatus: null, blockedUser: null });
      },

      login: async (email, password) => {
        set({
          isLoading: true,
          error: null,
          blockedStatus: null,
          blockedUser: null,
        });
        try {
          const response = await apiClient.auth.login(email, password);
          if (response?.requires2FA) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              blockedStatus: null,
              blockedUser: null,
              profileLastLoadedAt: 0,
            });
            return {
              ok: true,
              requires2FA: true,
              tempToken: response.tempToken || response.twoFactorToken,
              twoFactorToken: response.tempToken || response.twoFactorToken,
              user: response.user || null,
              canAccessApp: false,
            };
          }
          const outcome = buildAuthOutcome(response.user);

          set({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            isLoading: false,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });
          writeStoredAuthState({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });

          return outcome;
        } catch (err) {
          const blockedStatus = inferBlockedStatusFromError(err);
          const formattedError = formatAuthErrorMessage(err, { action: 'login' });
          if (blockedStatus) {
            const blockedUser = email ? { email } : null;
            set({
              user: null,
              token: null,
              error: formattedError,
              isLoading: false,
              blockedStatus,
              blockedUser,
              isAuthenticated: false,
              profileLastLoadedAt: 0,
            });
            return buildBlockedOutcome(blockedStatus, blockedUser, formattedError);
          }

          set({
            user: null,
            token: null,
            error: formattedError,
            isLoading: false,
            isAuthenticated: false,
            blockedStatus: null,
            blockedUser: null,
            profileLastLoadedAt: 0,
          });
          return { ok: false, error: formattedError };
        }
      },

      verifyTwoFactor: async ({ tempToken, twoFactorToken, code }) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.auth.verifyTwoFactor({
            tempToken: tempToken || twoFactorToken,
            twoFactorToken: tempToken || twoFactorToken,
            code,
          });
          const outcome = buildAuthOutcome(response.user);
          set({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            isLoading: false,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });
          writeStoredAuthState({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });
          return outcome;
        } catch (err) {
          const formattedError = formatAuthErrorMessage(err, { action: 'login' });
          set({ error: formattedError, isLoading: false, isAuthenticated: false });
          return { ok: false, error: formattedError };
        }
      },

      loginWithGoogle: async () => {
        set({
          isLoading: true,
          error: null,
          blockedStatus: null,
          blockedUser: null,
        });
        try {
          const response = await apiClient.auth.loginWithGoogle();
          if (response?.status === 'profile_completion_required' || response?.completionToken) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              blockedStatus: 'profile_completion_required',
              blockedUser: null,
              profileLastLoadedAt: 0,
            });

            return {
              ok: true,
              status: 'profile_completion_required',
              completionToken: response.completionToken,
              redirectTo: response.redirectTo || '/auth?status=PROFILE_COMPLETION_REQUIRED',
              canAccessApp: false,
            };
          }

          if (response?.redirectTo && !response?.user && !response?.token) {
            const callbackStatus = normalizeAccountStatus(response?.status);

            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              blockedStatus: callbackStatus || null,
              blockedUser: null,
              profileLastLoadedAt: 0,
            });

            return {
              ok: false,
              status: callbackStatus,
              user: null,
              error: null,
              redirectTo: response.redirectTo,
              canAccessApp: false,
            };
          }

          const outcome = buildAuthOutcome(response.user);

          set({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            isLoading: false,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });
          writeStoredAuthState({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });
          await loadAdminUsersSilently();
          return outcome;
        } catch (err) {
          const blockedStatus = inferBlockedStatusFromError(err);
          const formattedError = formatAuthErrorMessage(err, { action: 'google' });
          if (blockedStatus) {
            set({
              user: null,
              token: null,
              error: formattedError,
              isLoading: false,
              blockedStatus,
              blockedUser: null,
              isAuthenticated: false,
              profileLastLoadedAt: 0,
            });
            return buildBlockedOutcome(blockedStatus, null, formattedError);
          }

          set({
            user: null,
            token: null,
            error: formattedError,
            isLoading: false,
            isAuthenticated: false,
            blockedStatus: null,
            blockedUser: null,
            profileLastLoadedAt: 0,
          });
          return { ok: false, error: formattedError };
        }
      },

      completeGoogleProfile: async ({ completionToken, country, currency }) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.auth.completeGoogleProfile({ completionToken, country, currency });
          const outcome = buildAuthOutcome(response.user);

          set({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            isLoading: false,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });
          writeStoredAuthState({
            user: response.user,
            token: response.token || null,
            isAuthenticated: true,
            blockedStatus: outcome.canAccessApp ? null : outcome.status,
            blockedUser: outcome.canAccessApp ? null : response.user,
            profileLastLoadedAt: Date.now(),
          });

          await loadAdminUsersSilently();
          return outcome;
        } catch (err) {
          const formattedError = formatAuthErrorMessage(err, { action: 'google' });
          set({
            error: formattedError,
            isLoading: false,
            isAuthenticated: false,
            blockedStatus: 'profile_completion_required',
            blockedUser: null,
          });
          return { ok: false, status: 'profile_completion_required', error: formattedError };
        }
      },

      signup: async (userData) => {
        set({
          isLoading: true,
          error: null,
          blockedStatus: null,
          blockedUser: null,
        });
        try {
          const response = await apiClient.auth.register(userData);
          if (response?.token && response?.user) {
            const outcome = buildAuthOutcome(response.user);

            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              blockedUser: outcome.canAccessApp ? null : response.user,
              profileLastLoadedAt: Date.now(),
            });
            writeStoredAuthState({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              blockedStatus: outcome.canAccessApp ? null : outcome.status,
              blockedUser: outcome.canAccessApp ? null : response.user,
              profileLastLoadedAt: Date.now(),
            });

            await loadAdminUsersSilently();
            return outcome;
          }

          const status = normalizeAccountStatus(response?.user?.status);
          const effectiveStatus = status === 'pending' ? 'approved' : status;
          const requiresEmailVerification = response?.user?.verified === false
            && String(response?.user?.signupMethod || userData?.signupMethod || 'email').toLowerCase() !== 'google';

          await loadAdminUsersSilently();

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            blockedStatus: requiresEmailVerification ? 'verification_required' : null,
            blockedUser: requiresEmailVerification
              ? (response?.user || {
                  email: userData?.email,
                  name: userData?.name || userData?.username,
                })
              : null,
          });
          clearStoredAuthState();

          if (requiresEmailVerification) {
            return buildVerificationRequiredOutcome(response?.user || {
              email: userData?.email,
              name: userData?.name || userData?.username,
            });
          }

          return {
            ok: true,
            status: effectiveStatus,
            user: response?.user || null,
            redirectTo: getAccountAccessRoute(effectiveStatus) || getDefaultRouteForRole(response?.user?.role),
            canAccessApp: false,
          };
        } catch (err) {
          const formattedError = formatAuthErrorMessage(err, { action: 'register' });
          set({
            error: formattedError,
            isLoading: false,
            blockedStatus: null,
            blockedUser: null,
          });
          return { ok: false, error: formattedError };
        }
      },

      logout: async () => {
        profileRefreshRequest = null;
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          blockedStatus: null,
          blockedUser: null,
          profileLastLoadedAt: 0,
        });
        clearStoredAuthState();

        try {
          await apiClient.auth.logout?.();
        } catch {
          // Frontend state reset above remains the primary guard.
        }
      },

      updateUserSession: (updates) => {
        const { user, token } = get();
        if (user) {
          const nextUser = withCanonicalWalletFields({ ...user, ...updates });
          const nextStatus = nextUser?.profileCompletionRequired
            ? 'profile_completion_required'
            : normalizeAccountStatus(nextUser?.status);
          set({
            user: nextUser,
            blockedStatus: isApprovedAccountStatus(nextStatus) ? null : nextStatus,
            blockedUser: isApprovedAccountStatus(nextStatus) ? null : nextUser,
            profileLastLoadedAt: Date.now(),
          });
          writeStoredAuthState({
            user: nextUser,
            token: token || null,
            isAuthenticated: true,
            blockedStatus: isApprovedAccountStatus(nextStatus) ? null : nextStatus,
            blockedUser: isApprovedAccountStatus(nextStatus) ? null : nextUser,
            profileLastLoadedAt: Date.now(),
          });
        }
      },

      refreshProfile: async ({ force = true } = {}) => {
        try {
          const currentState = get();
          const currentUserId = currentState.user?.id;
          if (!currentUserId) return null;

          const loadedAt = Number(currentState.profileLastLoadedAt || 0);
          const cacheAge = loadedAt ? (Date.now() - loadedAt) : Number.POSITIVE_INFINITY;
          const cacheIsFresh = cacheAge >= 0 && cacheAge < PROFILE_CACHE_TTL;

          // Serve cached profile when still fresh to prevent refetch storms.
          if (currentState.user && cacheIsFresh) {
            return currentState.user;
          }

          const hasFreshProfile = (
            !force
            && currentState.user
          );

          if (hasFreshProfile) {
            return currentState.user;
          }

          if (profileRefreshRequest) {
            return profileRefreshRequest;
          }

          profileRefreshRequest = apiClient.auth.getProfile(currentUserId)
            .then((profile) => {
              const current = get();
              const nextUser = withCanonicalWalletFields({ ...current.user, ...profile });
              const nextStatus = nextUser?.profileCompletionRequired
                ? 'profile_completion_required'
                : normalizeAccountStatus(profile?.status);

              set({
                user: nextUser,
                blockedStatus: isApprovedAccountStatus(nextStatus) ? null : nextStatus,
                blockedUser: isApprovedAccountStatus(nextStatus) ? null : nextUser,
                profileLastLoadedAt: Date.now(),
              });
              writeStoredAuthState({
                user: nextUser,
                token: current.token || null,
                isAuthenticated: Boolean(current.token),
                blockedStatus: isApprovedAccountStatus(nextStatus) ? null : nextStatus,
                blockedUser: isApprovedAccountStatus(nextStatus) ? null : nextUser,
                profileLastLoadedAt: Date.now(),
              });
              return profile;
            })
            .catch((err) => {
              devLogger.warnUnlessBenign('[AuthStore] refreshProfile failed:', err, { once: true });
              return null;
            })
            .finally(() => {
              profileRefreshRequest = null;
            });

          return profileRefreshRequest;
        } catch (err) {
          devLogger.warnUnlessBenign('[AuthStore] refreshProfile failed:', err, { once: true });
          return null;
        }
      },
}));

export default useAuthStore;
