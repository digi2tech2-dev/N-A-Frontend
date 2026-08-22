/// <reference types="@capacitor/app" />
/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.nahub.app',
  appName: '𝑵&𝑨(HUB)',

  // This folder intentionally contains only the tiny native-shell fallback.
  // The React/Vite production bundle is NOT copied into the APK.
  webDir: 'capacitor-shell',

  // SECURITY: only the plugins needed by this native shell are registered.
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
    // REMOTE UI SOURCE: changing this value changes the website loaded by Android.
    // Keep HTTPS enabled; do not point release APKs at localhost or an HTTP server.
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

  loggingBehavior: 'debug',
};

export default config;
