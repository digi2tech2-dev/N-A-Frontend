import { useCallback, useEffect, useState } from 'react';
import {
  buildWebsiteRefreshUrl,
  clearDismissedWebsiteUpdate,
  dismissWebsiteUpdate,
  fetchWebsiteVersionManifest,
  getWebsiteUpdate,
  readAndPersistCurrentWebsiteVersion,
  wasWebsiteUpdateDismissed,
} from '../utils/websiteUpdate';

export const CURRENT_WEBSITE_VERSION = import.meta.env.VITE_SITE_VERSION;
export const WEBSITE_VERSION_ENDPOINT = 'https://na-hub.online/version.json';

let startupVersionRequest = null;
let lastVersionCheckAt = 0;
const VERSION_CHECK_COOLDOWN = 60 * 1000;

const requestStartupVersion = ({ force = false } = {}) => {
  const now = Date.now();
  if (startupVersionRequest || (!force && now - lastVersionCheckAt < VERSION_CHECK_COOLDOWN)) {
    return startupVersionRequest || Promise.resolve(null);
  }

  lastVersionCheckAt = now;
  startupVersionRequest = fetchWebsiteVersionManifest({
    endpoint: WEBSITE_VERSION_ENDPOINT,
    // Offline launches should fall back immediately instead of waiting for a
    // long WebView timeout. The check is enhancement-only and never gates UI.
    timeoutMs: 2500,
  }).finally(() => {
    startupVersionRequest = null;
  });

  return startupVersionRequest;
};

const requestServiceWorkerUpdate = () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.ready
    .then((registration) => registration.update())
    .catch(() => {});
};

const useWebsiteUpdate = () => {
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let active = true;
    const currentVersion = readAndPersistCurrentWebsiteVersion(
      CURRENT_WEBSITE_VERSION,
      window.localStorage
    );

    const checkForUpdate = ({ force = false } = {}) => {
      if (navigator.onLine === false) return;
      void requestStartupVersion({ force }).then((manifest) => {
        if (!active) return;

        const update = getWebsiteUpdate(currentVersion, manifest);
        if (!update) return;

        if (
          !update.forceUpdate
          && wasWebsiteUpdateDismissed(update.version, window.sessionStorage)
        ) {
          return;
        }

        setAvailableUpdate(update);
      });
      requestServiceWorkerUpdate();
    };

    // Render first, then perform a short, enhancement-only check. Retry when
    // connectivity returns or the app becomes visible again.
    const scheduleCheck = () => window.setTimeout(checkForUpdate, 0);
    const handleOnline = () => window.setTimeout(() => checkForUpdate({ force: true }), 0);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') scheduleCheck();
    };
    scheduleCheck();
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (!availableUpdate || availableUpdate.forceUpdate || typeof window === 'undefined') return;

    dismissWebsiteUpdate(availableUpdate.version, window.sessionStorage);
    setAvailableUpdate(null);
  }, [availableUpdate]);

  const refresh = useCallback(() => {
    if (!availableUpdate || typeof window === 'undefined' || isRefreshing) return;

    setIsRefreshing(true);
    clearDismissedWebsiteUpdate(window.sessionStorage);

    const refreshUrl = buildWebsiteRefreshUrl(
      window.location.href,
      availableUpdate.version
    );

    try {
      window.location.replace(refreshUrl);
    } catch {
      setIsRefreshing(false);
    }
  }, [availableUpdate, isRefreshing]);

  return {
    availableUpdate,
    isRefreshing,
    dismiss,
    refresh,
  };
};

export default useWebsiteUpdate;
