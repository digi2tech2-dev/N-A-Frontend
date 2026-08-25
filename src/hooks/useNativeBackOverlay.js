import { useEffect, useRef } from 'react';
import { registerOverlayCloseHandler } from '../utils/overlayBackStack';

/**
 * Lets an existing React overlay participate in Android system Back without
 * changing how that overlay is otherwise opened or closed.
 */
export const useNativeBackOverlay = (isOpen, onClose) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    return registerOverlayCloseHandler(() => {
      closeRef.current?.();
    });
  }, [isOpen]);
};
