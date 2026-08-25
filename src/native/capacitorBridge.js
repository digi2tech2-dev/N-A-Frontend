import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Browser } from '@capacitor/browser';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';

const APP_ORIGIN = 'https://na-hub.online';
const NATIVE_EVENT_PREFIX = 'nahub:native';
const EXTERNAL_SCHEMES = new Set(['geo:', 'intent:', 'mailto:', 'market:', 'sms:', 'tel:', 'whatsapp:']);
const STARTUP_PERMISSIONS_KEY = 'nahub:startup-permissions-requested:v1';
const PUSH_PERMISSION_REQUESTED_KEY = 'nahub:push-permission-requested:v1';
const PUSH_TOKEN_KEY = 'nahub:push-token';
const PENDING_PUSH_ACTION_KEY = 'nahub:pending-push-action:v1';

const isNative = () => Capacitor.isNativePlatform();

const dispatchNativeEvent = (name, detail) => {
  window.dispatchEvent(new CustomEvent(`${NATIVE_EVENT_PREFIX}:${name}`, { detail }));
};

const ensurePermission = async (plugin, permissionName) => {
  const current = await plugin.checkPermissions();
  if (current[permissionName] === 'granted') return current;
  return plugin.requestPermissions();
};

const photoToFile = async (photo) => {
  if (!photo.webPath) return null;
  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const extension = photo.format || blob.type.split('/')[1] || 'jpg';
  return new File([blob], `nahub-photo-${Date.now()}.${extension}`, {
    type: blob.type || `image/${extension}`,
  });
};

const pickImage = async ({ source = 'prompt', quality = 85 } = {}) => {
  if (!isNative()) return null;

  const sourceMap = {
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  };
  const photo = await Camera.getPhoto({
    source: sourceMap[source] || CameraSource.Prompt,
    quality,
    resultType: CameraResultType.Uri,
    correctOrientation: true,
    saveToGallery: false,
  });

  return { photo, file: await photoToFile(photo) };
};

const getCurrentPosition = async (options = {}) => {
  if (!isNative()) return navigator.geolocation
    ? new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options))
    : null;

  const permissions = await ensurePermission(Geolocation, 'location');
  if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
    throw new Error('Location permission was not granted.');
  }

  return Geolocation.getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 10_000,
    maximumAge: 30_000,
    ...options,
  });
};

const requestNotificationPermission = async () => {
  if (!isNative()) {
    if (!('Notification' in window)) return { display: 'denied' };
    return { display: await Notification.requestPermission() };
  }

  return ensurePermission(LocalNotifications, 'display');
};

// Ask for the permissions used by the app once, on the first native launch.
// Each permission is independent: a denial must not prevent the remaining
// prompts (or stop the WebView from loading).
const requestStartupPermissions = async () => {
  if (!isNative()) return { skipped: true };

  try {
    if (window.localStorage.getItem(STARTUP_PERMISSIONS_KEY) === '1') {
      return { alreadyRequested: true };
    }
  } catch {
    // Continue if storage is unavailable; native permission APIs are still safe.
  }

  const result = {};
  const request = async (name, callback) => {
    try {
      result[name] = await callback();
    } catch (error) {
      result[name] = { error: String(error?.message || error) };
    }
  };

  await request('camera', () => ensurePermission(Camera, 'camera'));
  await request('location', () => ensurePermission(Geolocation, 'location'));
  await request('notifications', requestNotificationPermission);

  // Android exposes one notification permission to both Capacitor plugins.
  // Record this so an account/session rerender never asks repeatedly.
  try {
    window.localStorage.setItem(PUSH_PERMISSION_REQUESTED_KEY, '1');
  } catch {
    // Ignore storage restrictions in private/managed WebViews.
  }

  try {
    window.localStorage.setItem(STARTUP_PERMISSIONS_KEY, '1');
  } catch {
    // Ignore storage restrictions in private/managed WebViews.
  }

  return result;
};

const scheduleLocalNotification = async ({ id = Date.now() % 2_147_483_647, title, body, schedule, extra } = {}) => {
  if (!isNative()) return null;
  const permissions = await requestNotificationPermission();
  if (permissions.display !== 'granted') throw new Error('Notification permission was not granted.');

  return LocalNotifications.schedule({
    notifications: [{ id, title, body, schedule, extra }],
  });
};

let pushListenerHandles = [];
let pushListenersInstalled = false;
let pushRegistrationPromise = null;
let nativeAppInitialized = false;

const getStoredPushToken = () => {
  try {
    return String(window.localStorage.getItem(PUSH_TOKEN_KEY) || '').trim();
  } catch {
    return '';
  }
};

const installPushListeners = async () => {
  if (pushListenersInstalled) return;

  pushListenerHandles = await Promise.all([
    PushNotifications.addListener('registration', (token) => {
      try {
        window.localStorage.setItem(PUSH_TOKEN_KEY, token?.value || '');
      } catch {
        // Ignore storage restrictions in private WebViews.
      }
      dispatchNativeEvent('push-registration', token);
    }),
    PushNotifications.addListener('registrationError', (error) => dispatchNativeEvent('push-error', error)),
    // A notification payload is rendered by Android when the app is not active.
    // While active, NativePushBootstrap refreshes the existing inbox instead of
    // scheduling a local duplicate.
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      dispatchNativeEvent('push-received', notification);
    }),
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      // Preserve a cold-start tap until React has restored its session and can
      // decide whether the allowlisted internal route is safe to open.
      try {
        window.sessionStorage.setItem(
          PENDING_PUSH_ACTION_KEY,
          JSON.stringify(action?.notification?.data || {})
        );
      } catch {
        // Navigation is an enhancement; never block native delivery on storage.
      }
      dispatchNativeEvent('push-action', action);
    }),
  ]);
  pushListenersInstalled = true;
};

const requestPushPermissionOnce = async () => {
  const current = await PushNotifications.checkPermissions();
  if (current.receive === 'granted') return current;

  try {
    if (window.localStorage.getItem(PUSH_PERMISSION_REQUESTED_KEY) === '1') return current;
    window.localStorage.setItem(PUSH_PERMISSION_REQUESTED_KEY, '1');
  } catch {
    // If storage is unavailable, request once for this bridge lifetime.
  }

  return PushNotifications.requestPermissions();
};

const registerPushNotifications = async () => {
  if (!isNative()) return { receive: 'unsupported' };
  if (pushRegistrationPromise) return pushRegistrationPromise;

  pushRegistrationPromise = (async () => {
    await installPushListeners();
    const permissions = await requestPushPermissionOnce();
    if (permissions.receive !== 'granted') return permissions;
    await PushNotifications.register();
    return permissions;
  })().finally(() => {
    pushRegistrationPromise = null;
  });

  return pushRegistrationPromise;
};

const openExternalUrl = async (url) => {
  if (!isNative()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const parsed = new URL(url, window.location.href);
  if (EXTERNAL_SCHEMES.has(parsed.protocol)) {
    await AppLauncher.openUrl({ url: parsed.href });
    return;
  }

  await Browser.open({ url: parsed.href });
};

const syncStatusBarTheme = async () => {
  if (!isNative()) return;
  const isDark = document.documentElement.classList.contains('dark')
    || document.documentElement.dataset.theme === 'dark';
  // Keep the WebView below Android's status bar so the header never sits
  // underneath the clock, signal and battery icons on edge-to-edge devices.
  await Promise.all([
    StatusBar.setOverlaysWebView({ overlay: false }),
    StatusBar.setStyle({ style: isDark ? StatusBarStyle.Light : StatusBarStyle.Dark }),
  ]);
};

const installLinkHandling = () => {
  document.addEventListener('click', (event) => {
    if (!isNative() || event.defaultPrevented || event.button !== 0) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;

    const url = new URL(anchor.href, window.location.href);
    const isExternalHttp = ['http:', 'https:'].includes(url.protocol) && url.origin !== APP_ORIGIN;
    const isExternalScheme = EXTERNAL_SCHEMES.has(url.protocol);
    const isSameOriginNewWindow = url.origin === APP_ORIGIN && anchor.target === '_blank';
    if (!isExternalHttp && !isExternalScheme && !isSameOriginNewWindow) return;

    event.preventDefault();
    if (isSameOriginNewWindow) {
      window.location.assign(url.href);
      return;
    }

    void openExternalUrl(url.href).catch(() => {
      window.location.assign(url.href);
    });
  }, true);
};

const installDeepLinkHandling = async () => {
  await App.addListener('appUrlOpen', ({ url }) => {
    try {
      const incoming = new URL(url);
      if (incoming.origin !== APP_ORIGIN) return;
      window.location.assign(`${incoming.pathname}${incoming.search}${incoming.hash}`);
    } catch {
      // Ignore malformed links supplied by another Android app.
    }
  });
};

export const nativeBridge = Object.freeze({
  isNative,
  getPlatform: () => Capacitor.getPlatform(),
  pickImage,
  getCurrentPosition,
  requestNotificationPermission,
  requestStartupPermissions,
  scheduleLocalNotification,
  registerPushNotifications,
  getStoredPushToken,
  openExternalUrl,
});

export const initializeNativeApp = async () => {
  if (!isNative() || nativeAppInitialized) return;
  nativeAppInitialized = true;

  // Exposed intentionally for remotely hosted UI code. Permission prompts still
  // happen only when the website explicitly calls one of these functions.
  window.NAHubNative = nativeBridge;

  installLinkHandling();
  await Promise.all([installDeepLinkHandling(), syncStatusBarTheme()]);

  // Runtime permission prompts are intentionally limited to the first launch.
  // Never let a plugin failure prevent the remote UI from starting.
  await requestStartupPermissions();
  // Install receivers immediately so a notification tap that cold-starts the
  // app is captured. FCM registration itself waits for an authenticated user.
  await installPushListeners();

  const themeObserver = new MutationObserver(() => void syncStatusBarTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
};
