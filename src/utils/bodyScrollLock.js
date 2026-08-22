import { useEffect } from 'react';

let lockCount = 0;
let scrollY = 0;
let previousStyles = null;

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const lockBodyScroll = () => {
  if (!canUseDOM()) return () => {};

  if (lockCount === 0) {
    scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    previousStyles = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
  }

  lockCount += 1;

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0 || !previousStyles) return;

    document.documentElement.style.overflow = previousStyles.htmlOverflow;
    document.body.style.overflow = previousStyles.bodyOverflow;
    document.body.style.position = previousStyles.bodyPosition;
    document.body.style.top = previousStyles.bodyTop;
    document.body.style.width = previousStyles.bodyWidth;
    window.scrollTo(0, scrollY);
    previousStyles = null;
  };
};

export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (!isLocked) return undefined;
    return lockBodyScroll();
  }, [isLocked]);
};
