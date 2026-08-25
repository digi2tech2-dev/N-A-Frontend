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
// FCM cannot be registered safely until android/app/google-services.json is
// supplied and the Firebase application is configured.  Keep this disabled
// by default so Android's notification permission result can never terminate
// the WebView when a Firebase project is not present.
const PUSH_NOTIFICATIONS_ENABLED = import.meta.env.VITE_PUSH_NOTIFICATIONS_ENABLED === 'true';
const STARTUP_PERMISSIONS_KEY = 'nahub:startup-permissions-requested:v1';

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

const showForegroundPushAsLocalNotification = async (notification) => {
  const title = String(notification?.title || notification?.data?.title || 'N&A HUB');
  const body = String(notification?.body || notification?.data?.body || notification?.data?.message || 'لديك إشعار جديد');

  try {
    const permissions = await ensurePermission(LocalNotifications, 'display');
    if (permissions.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Date.now() % 2_147_000_000),
        title,
        body,
        extra: notification?.data || {},
      }],
    });
  } catch {
    // A foreground notification must never interrupt the app UI.
  }
};

const registerPushNotifications = async () => {
  if (!isNative()) return { receive: 'unsupported' };
  if (!PUSH_NOTIFICATIONS_ENABLED) {
    dispatchNativeEvent('push-disabled', {
      reason: 'Firebase push notifications are not configured for this build.',
    });
    return { receive: 'disabled' };
  }

  const permissions = await ensurePermission(PushNotifications, 'receive');
  if (permissions.receive !== 'granted') throw new Error('Push notification permission was not granted.');

  await Promise.all(pushListenerHandles.map((handle) => handle.remove()));
  pushListenerHandles = await Promise.all([
    PushNotifications.addListener('registration', (token) => {
      try {
        window.localStorage.setItem('nahub:push-token', token?.value || '');
      } catch {
        // Ignore storage restrictions in private WebViews.
      }
      dispatchNativeEvent('push-registration', token);
    }),
    PushNotifications.addListener('registrationError', (error) => dispatchNativeEvent('push-error', error)),
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      dispatchNativeEvent('push-received', notification);
      void showForegroundPushAsLocalNotification(notification);
    }),
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => dispatchNativeEvent('push-action', action)),
  ]);

  await PushNotifications.register();
  return permissions;
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
  openExternalUrl,
});

export const initializeNativeApp = async () => {
  if (!isNative()) return;

  // Exposed intentionally for remotely hosted UI code. Permission prompts still
  // happen only when the website explicitly calls one of these functions.
  window.NAHubNative = nativeBridge;

  installLinkHandling();
  await Promise.all([installDeepLinkHandling(), syncStatusBarTheme()]);

  // Runtime permission prompts are intentionally limited to the first launch.
  // Never let a plugin failure prevent the remote UI from starting.
  await requestStartupPermissions();

  // Do not request Android's Push permission during startup.  Calling FCM
  // registration without google-services.json makes Firebase throw a native
  // exception immediately after the user accepts the permission dialog.  A
  // configured build can opt in through VITE_PUSH_NOTIFICATIONS_ENABLED=true
  // and invoke registerPushNotifications explicitly.

  const themeObserver = new MutationObserver(() => void syncStatusBarTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
};
