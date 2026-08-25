import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/client';
import { nativeBridge } from '../../native/capacitorBridge';
import useAuthStore from '../../store/useAuthStore';
import useNotificationStore from '../../store/useNotificationStore';

const PUSH_ACTION_EVENT = 'nahub:native:push-action';
const PUSH_REGISTRATION_EVENT = 'nahub:native:push-registration';
const PUSH_RECEIVED_EVENT = 'nahub:native:push-received';
const PENDING_PUSH_ACTION_KEY = 'nahub:pending-push-action:v1';

// Backend push data is still treated as untrusted. These are the only routes
// a notification tap may open, and each must match its declared event type.
const PUSH_ROUTE_ALLOWLIST = Object.freeze({
  order_status: '/orders',
  deposit_status: '/wallet/topups',
  target_status: '/target-orders',
});

const readActionData = (value) => value?.notification?.data || value?.data || value || {};

const resolveAllowedRoute = (value) => {
  const data = readActionData(value);
  const type = String(data?.type || '').trim().toLowerCase();
  const allowedRoute = PUSH_ROUTE_ALLOWLIST[type];
  if (!allowedRoute) return null;
  if (data?.route && String(data.route) !== allowedRoute) return null;
  return allowedRoute;
};

const savePendingAction = (value) => {
  try {
    window.sessionStorage.setItem(PENDING_PUSH_ACTION_KEY, JSON.stringify(readActionData(value)));
  } catch {
    // Navigation remains optional when storage is unavailable.
  }
};

const takePendingAction = () => {
  try {
    const raw = window.sessionStorage.getItem(PENDING_PUSH_ACTION_KEY);
    window.sessionStorage.removeItem(PENDING_PUSH_ACTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const NativePushBootstrap = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id || state.user?._id);
  const lastSubmittedKey = useRef('');

  const submitToken = useCallback(async (value) => {
    const pushToken = String(value || '').trim();
    if (!pushToken || !userId || !isAuthenticated || !token) return;
    const submissionKey = `${userId}:${pushToken}`;
    if (lastSubmittedKey.current === submissionKey) return;

    try {
      await apiClient.notifications.registerDevice({
        token: pushToken,
        platform: 'android',
        provider: 'fcm',
      });
      lastSubmittedKey.current = submissionKey;
    } catch {
      // A failed registration never blocks an authenticated app session.
      // The next lifecycle/token event retries it safely.
    }
  }, [isAuthenticated, token, userId]);

  const navigateFromAction = useCallback((action) => {
    const route = resolveAllowedRoute(action);
    if (!route) return;
    if (!isAuthenticated || !token || !userId) {
      savePendingAction(action);
      return;
    }
    navigate(route);
  }, [isAuthenticated, navigate, token, userId]);

  useEffect(() => {
    if (!nativeBridge.isNative()) return undefined;

    const onRegistration = (event) => void submitToken(event.detail?.value);
    const onForegroundPush = () => {
      // The database notification already exists. Refresh it rather than add a
      // synthetic duplicate or display a second local OS notification.
      void useNotificationStore.getState().loadNotifications?.();
      void useNotificationStore.getState().loadUnreadCount?.();
    };
    const onAction = (event) => navigateFromAction(event.detail);

    window.addEventListener(PUSH_REGISTRATION_EVENT, onRegistration);
    window.addEventListener(PUSH_RECEIVED_EVENT, onForegroundPush);
    window.addEventListener(PUSH_ACTION_EVENT, onAction);
    return () => {
      window.removeEventListener(PUSH_REGISTRATION_EVENT, onRegistration);
      window.removeEventListener(PUSH_RECEIVED_EVENT, onForegroundPush);
      window.removeEventListener(PUSH_ACTION_EVENT, onAction);
    };
  }, [navigateFromAction, submitToken]);

  useEffect(() => {
    if (!nativeBridge.isNative() || !isAuthenticated || !token || !userId) return;

    void nativeBridge.registerPushNotifications()
      .then(() => submitToken(nativeBridge.getStoredPushToken()))
      .catch(() => {
        // Missing Firebase Android configuration or a denied permission must
        // never affect app startup or the existing notification center.
      });
  }, [isAuthenticated, submitToken, token, userId]);

  useEffect(() => {
    if (!isAuthenticated || !token || !userId) return;
    const pendingAction = takePendingAction();
    if (pendingAction) navigateFromAction(pendingAction);
  }, [isAuthenticated, navigateFromAction, token, userId]);

  return null;
};

export default NativePushBootstrap;
