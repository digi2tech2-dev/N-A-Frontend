import { Capacitor } from '@capacitor/core';

const ANDROID_USER_AGENT_MARKER = 'NAHubAndroid/';

const getUserAgent = () => {
  if (typeof navigator === 'undefined') return '';
  return String(navigator.userAgent || '');
};

/**
 * Identifies the N&A Android shell without treating ordinary mobile browsers
 * as native. Capacitor is authoritative when its native bridge is available;
 * the stable UA token supports the remotely loaded site during bridge startup.
 */
export const isNativeAndroidApp = () => {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') return true;
  } catch {
    // A partially initialized Capacitor bridge must not break the web app.
  }

  return getUserAgent().includes(ANDROID_USER_AGENT_MARKER);
};

export { ANDROID_USER_AGENT_MARKER };
