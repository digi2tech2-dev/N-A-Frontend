import { useEffect, useRef } from 'react';
import { registerNativeBackAction } from '../utils/nativeBackActionRegistry';

/**
 * Lets a screen or layout reuse its existing in-app Back action for Android
 * system Back without adding another native listener.
 */
export const useNativeBackAction = (isActive, action) => {
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    if (!isActive) return undefined;

    return registerNativeBackAction(() => {
      actionRef.current?.();
    });
  }, [isActive]);
};
