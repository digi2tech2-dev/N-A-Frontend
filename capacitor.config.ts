/// <reference types="@capacitor/app" />
/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.nahub.app',
  appName: '𝑵&𝑨(HUB)',

  // Keep the APK as a lightweight native shell. The live website is loaded
  // below so clients receive frontend updates without reinstalling the APK.
  // The website service worker keeps repeat launches fast and provides a
  // cached shell when the connection briefly drops.
  webDir: 'capacitor-shell',

  // SECURITY: only the plugins needed by this app are registered.
  includePlugins: [
    '@capacitor/app',
    '@capacitor/app-launcher',
    '@capacitor/browser',
    '@capacitor/camera',
    '@capacitor/geolocation',
    '@capacitor/local-notifications',
    '@capacitor/push-notifications',
    '@capacitor/status-bar',
  ],

  server: {
    url: 'https://na-hub.online',
    cleartext: false,
    androidScheme: 'https',
    errorPath: 'offline.html',
  },

  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    appendUserAgent: ' NAHubAndroid/1.0',
  },

  plugins: {
    App: {
      // src/native/capacitorBridge.js owns back navigation for React Router.
      disableBackButtonHandler: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_na_hub',
      iconColor: '#7C3AED',
    },
  },

  // Avoid noisy Capacitor logging in production APKs.
  loggingBehavior: 'none',
};

export default config;
