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

const scheduleLocalNotification = async ({ id = Date.now() % 2_147_483_647, title, body, schedule, extra } = {}) => {
  if (!isNative()) return null;
  const permissions = await requestNotificationPermission();
  if (permissions.display !== 'granted') throw new Error('Notification permission was not granted.');

  return LocalNotifications.schedule({
    notifications: [{ id, title, body, schedule, extra }],
  });
};

let pushListenerHandles = [];

const registerPushNotifications = async () => {
  if (!isNative()) return { receive: 'unsupported' };

  const permissions = await ensurePermission(PushNotifications, 'receive');
  if (permissions.receive !== 'granted') throw new Error('Push notification permission was not granted.');

  await Promise.all(pushListenerHandles.map((handle) => handle.remove()));
  pushListenerHandles = await Promise.all([
    PushNotifications.addListener('registration', (token) => dispatchNativeEvent('push-registration', token)),
    PushNotifications.addListener('registrationError', (error) => dispatchNativeEvent('push-error', error)),
    PushNotifications.addListener('pushNotificationReceived', (notification) => dispatchNativeEvent('push-received', notification)),
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
  await StatusBar.setStyle({ style: isDark ? StatusBarStyle.Light : StatusBarStyle.Dark });
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

const installBackHandling = async () => {
  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void App.exitApp();
  });
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
  await Promise.all([installBackHandling(), installDeepLinkHandling(), syncStatusBarTheme()]);

  const themeObserver = new MutationObserver(() => void syncStatusBarTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
};
