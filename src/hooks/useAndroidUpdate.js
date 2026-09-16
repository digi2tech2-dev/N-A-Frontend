import { useCallback, useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { nativeBridge } from '../native/capacitorBridge';
import { isNativeAndroidApp } from '../utils/nativePlatform';
import { fetchAndroidVersionManifest, getAndroidUpdate } from '../utils/androidUpdate';
import { devLogger } from '../utils/devLogger';

const useAndroidUpdate = () => {
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (!isNativeAndroidApp()) return undefined;

    let active = true;

    const checkForUpdate = async () => {
      try {
        const appInfo = await App.getInfo();
        const manifest = await fetchAndroidVersionManifest();
        const update = getAndroidUpdate(appInfo?.build, manifest);
        if (active && update) setAvailableUpdate(update);
      } catch (error) {
        // This is an enhancement only: a failed manifest check must never gate use.
        devLogger.warn('Android update check was unavailable', error);
      }
    };

    void checkForUpdate();
    return () => {
      active = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (availableUpdate?.forceUpdate) return;
    setAvailableUpdate(null);
  }, [availableUpdate]);

  const openUpdate = useCallback(async () => {
    if (!availableUpdate || isOpening) return;

    setIsOpening(true);
    try {
      await nativeBridge.openExternalUrl(availableUpdate.downloadUrl);
    } catch (error) {
      devLogger.warn('Unable to open Android update download', error);
    } finally {
      setIsOpening(false);
    }
  }, [availableUpdate, isOpening]);

  return { availableUpdate, dismiss, isOpening, openUpdate };
};

export default useAndroidUpdate;
