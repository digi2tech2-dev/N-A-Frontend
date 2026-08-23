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

const requestStartupVersion = () => {
  if (!startupVersionRequest) {
    startupVersionRequest = fetchWebsiteVersionManifest({
      endpoint: WEBSITE_VERSION_ENDPOINT,
    });
  }

  return startupVersionRequest;
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

    void requestStartupVersion().then((manifest) => {
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

    return () => {
      active = false;
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
