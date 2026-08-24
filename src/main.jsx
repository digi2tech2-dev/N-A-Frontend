import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'flag-icons/css/flag-icons.min.css';
import './index.css';
import './i18n';
import { devLogger } from './utils/devLogger';
import { cleanupVolatileAppStorage } from './utils/storageMaintenance';
import { initializeNativeApp } from './native/capacitorBridge';

const isExternalExtensionPermissionError = (value) => {
  const message = String(
    value?.reason?.message
    || value?.message
    || value?.error?.message
    || value?.data?.msg
    || ''
  ).toLowerCase();
  const source = String(value?.filename || value?.reason?.stack || value?.stack || '').toLowerCase();
  const requestPath = String(
    value?.reason?.reqInfo?.path
    || value?.reqInfo?.path
    || value?.reason?.path
    || value?.path
    || ''
  ).toLowerCase();
  const statusCode = Number(
    value?.reason?.code
    || value?.code
    || value?.reason?.data?.code
    || value?.data?.code
    || 0
  );

  return (
    statusCode === 403
    && message.includes('permission error')
    && (
      source.includes('content.js')
      || source.includes('chrome-extension')
      || ['/generate', '/get_template_list', '/template_list', '/site_integration'].includes(requestPath)
    )
  );
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isExternalExtensionPermissionError(event)) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (isExternalExtensionPermissionError(event)) {
      event.preventDefault();
    }
  });
}

// Auth state persists in localStorage; keep this compatibility cleanup as a no-op.
cleanupVolatileAppStorage && typeof cleanupVolatileAppStorage === 'function' && cleanupVolatileAppStorage();

const hideBootLoader = () => {
  if (typeof window === 'undefined') return;
  const bootLoader = document.getElementById('app-boot-loader');
  if (!bootLoader) return;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      bootLoader.classList.add('is-hidden');
      window.setTimeout(() => {
        bootLoader.remove();
      }, 260);
    });
  });
};

const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    const version = String(import.meta.env.VITE_SITE_VERSION || 'latest');
    navigator.serviceWorker.register(`/service-worker.js?v=${encodeURIComponent(version)}`, {
      updateViaCache: 'none',
    }).then((registration) => {
      // Check once on every launch so a newly deployed site is picked up
      // without requiring an APK reinstall or a manual cache clear.
      void registration.update();
    }).catch(() => {
      // Service workers are an enhancement; the website remains usable without one.
    });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

hideBootLoader();
registerServiceWorker();

// No-op in normal browsers; installs the Capacitor bridge when this remote site
// is running inside the Android shell.
void initializeNativeApp().catch((error) => {
  devLogger.error('Failed to initialize native app integration', error);
});
