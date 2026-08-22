import { useEffect, useRef, useState } from 'react';

const INITIAL_STATE = Object.freeze({
  isHidden: false,
  isScrolled: false,
});

const useHideOnScroll = ({
  enabled = true,
  hideAfter = 15,
  minimumDelta = 5,
} = {}) => {
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const lastHandledYRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const commitState = (nextState) => {
      const currentState = stateRef.current;
      if (
        currentState.isHidden === nextState.isHidden
        && currentState.isScrolled === nextState.isScrolled
      ) {
        return;
      }

      stateRef.current = nextState;
      setState(nextState);
    };

    if (!enabled || typeof window === 'undefined') {
      lastHandledYRef.current = 0;
      commitState(INITIAL_STATE);
      return undefined;
    }

    const readScrollY = () => Math.max(0, window.scrollY || window.pageYOffset || 0);
    lastHandledYRef.current = readScrollY();
    commitState({
      isHidden: false,
      isScrolled: lastHandledYRef.current > 0,
    });

    const updateScrollState = () => {
      frameRef.current = 0;

      const currentY = readScrollY();
      const previousY = lastHandledYRef.current;
      const delta = currentY - previousY;
      const isAtTop = currentY <= 0;

      if (isAtTop) {
        lastHandledYRef.current = 0;
        commitState(INITIAL_STATE);
        return;
      }

      if (Math.abs(delta) < minimumDelta) {
        if (!stateRef.current.isScrolled) {
          commitState({ ...stateRef.current, isScrolled: true });
        }
        return;
      }

      lastHandledYRef.current = currentY;

      if (delta < 0) {
        commitState({ isHidden: false, isScrolled: true });
        return;
      }

      if (delta > 0 && currentY > hideAfter) {
        commitState({ isHidden: true, isScrolled: true });
      }
    };

    const handleScroll = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(updateScrollState);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [enabled, hideAfter, minimumDelta]);

  return state;
};

export default useHideOnScroll;
