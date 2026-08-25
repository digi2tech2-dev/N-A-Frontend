/// <reference types="@capacitor/app" />
/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.nahub.app',
  appName: 'N&A',

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
    '@capgo/capacitor-social-login',
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
      // Keep Capacitor's AndroidX system-back callback enabled. The React
      // Router shell registers the single App.backButton listener.
      disableBackButtonHandler: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_na_hub',
      iconColor: '#7C3AED',
    },
    // Only bundle the native Google Credential Manager provider. Other social
    // providers remain disabled because N&A does not use them.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
      logLevel: 1,
    },
  },

  // Avoid noisy Capacitor logging in production APKs.
  loggingBehavior: 'none',
};

export default config;
