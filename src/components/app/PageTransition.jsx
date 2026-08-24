import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { preloadRoute } from '../../transitions/routeModules';
import {
  getBarbaNamespace,
  resetBarbaTransitionStyles,
  runBarbaInitialReveal,
} from '../../transitions/barbaTransition';

const locationIdentity = (location) => [
  location?.key || 'default',
  location?.pathname || '/',
  location?.search || '',
  location?.hash || '',
].join('|');

const COMMON_CUSTOMER_ROUTES = ['/dashboard', '/products', '/orders', '/wallet/add-balance'];

const scrollToHash = (hash) => {
  if (!hash) return false;

  let targetId = hash.replace(/^#/, '');
  try {
    targetId = decodeURIComponent(targetId);
  } catch {
    // Keep malformed encoded hashes untouched.
  }

  const target = document.getElementById(targetId)
    || document.getElementsByName(targetId)[0];

  if (!target) return false;
  target.scrollIntoView({ block: 'start', behavior: 'auto' });
  return true;
};

const restoreScroll = (location, navigationType, positions, fallbackPosition) => {
  if (location?.state?.preserveScroll) {
    window.scrollTo({ ...fallbackPosition, behavior: 'auto' });
    return;
  }

  if (scrollToHash(location?.hash)) return;

  const storedPosition = navigationType === 'POP'
    ? positions.get(location.key)
    : null;

  window.scrollTo({
    left: storedPosition?.x || 0,
    top: storedPosition?.y || 0,
    behavior: 'auto',
  });
};

const PageTransition = ({ children }) => {
  const routerLocation = useLocation();
  const navigationType = useNavigationType();
  const [displayedLocation, setDisplayedLocation] = useState(routerLocation);
  const containerRef = useRef(null);
  const displayedLocationRef = useRef(routerLocation);
  const latestNavigationRef = useRef({
    location: routerLocation,
    navigationType,
  });
  const processingRef = useRef(false);
  const mountedRef = useRef(false);
  const initialRevealRef = useRef(false);
  const initialRevealControllerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const commitResolverRef = useRef(null);
  const scrollPositionsRef = useRef(new Map());

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      initialRevealControllerRef.current?.abort();
      abortControllerRef.current?.abort();
      commitResolverRef.current?.resolve();
      resetBarbaTransitionStyles(containerRef.current);
      delete document.documentElement.dataset.pageTransition;
    };
  }, []);

  // Warm the most-used customer routes only while the browser is idle. This
  // removes the first-tap chunk download on normal connections without
  // competing with the initial render or data-saver networks.
  useEffect(() => {
    const connection = navigator.connection;
    if (
      typeof window === 'undefined'
      || connection?.saveData
      || ['slow-2g', '2g'].includes(connection?.effectiveType)
    ) return undefined;

    const warm = () => {
      COMMON_CUSTOMER_ROUTES.forEach((path) => {
        void preloadRoute(path).catch(() => {});
      });
    };
    const idleHandle = 'requestIdleCallback' in window
      ? window.requestIdleCallback(warm, { timeout: 2200 })
      : window.setTimeout(warm, 1800);

    return () => {
      if ('cancelIdleCallback' in window && typeof idleHandle === 'number') {
        window.cancelIdleCallback(idleHandle);
      } else {
        window.clearTimeout(idleHandle);
      }
    };
  }, []);

  useLayoutEffect(() => {
    displayedLocationRef.current = displayedLocation;
    const pendingCommit = commitResolverRef.current;

    if (
      pendingCommit
      && pendingCommit.identity === locationIdentity(displayedLocation)
    ) {
      commitResolverRef.current = null;
      pendingCommit.resolve();
    }
  }, [displayedLocation]);

  const commitLocation = useCallback((location) => new Promise((resolve) => {
    commitResolverRef.current = {
      identity: locationIdentity(location),
      resolve,
    };
    setDisplayedLocation(location);
  }), []);

  const processNavigationQueue = useCallback(async () => {
    if (processingRef.current || typeof window === 'undefined') return;
    processingRef.current = true;

    try {
      while (mountedRef.current) {
        const from = displayedLocationRef.current;
        const targetNavigation = latestNavigationRef.current;
        const to = targetNavigation.location;

        if (locationIdentity(from) === locationIdentity(to)) break;

        const controller = new AbortController();
        abortControllerRef.current = controller;
        initialRevealControllerRef.current?.abort();

        const fallbackPosition = { x: window.scrollX, y: window.scrollY };
        scrollPositionsRef.current.set(from.key, fallbackPosition);

        // Start the lazy import in the background. Navigation itself is
        // committed immediately so the first tap always takes effect.
        const preloadPromise = preloadRoute(to.pathname);
        void preloadPromise.catch(() => {});
        await commitLocation(to);

        restoreScroll(
          to,
          targetNavigation.navigationType,
          scrollPositionsRef.current,
          fallbackPosition
        );
        displayedLocationRef.current = to;
      }
    } finally {
      processingRef.current = false;
      abortControllerRef.current = null;

      if (mountedRef.current) {
        resetBarbaTransitionStyles(containerRef.current);
        delete document.documentElement.dataset.pageTransition;

        if (
          locationIdentity(displayedLocationRef.current)
          !== locationIdentity(latestNavigationRef.current.location)
        ) {
          void processNavigationQueue();
        }
      }
    }
  }, [commitLocation]);

  useEffect(() => {
    latestNavigationRef.current = {
      location: routerLocation,
      navigationType,
    };
    void processNavigationQueue();
  }, [navigationType, processNavigationQueue, routerLocation]);

  useEffect(() => {
    if (initialRevealRef.current || !containerRef.current) return undefined;
    initialRevealRef.current = true;

    const controller = new AbortController();
    initialRevealControllerRef.current = controller;

    void runBarbaInitialReveal({
      location: displayedLocationRef.current,
      container: containerRef.current,
      signal: controller.signal,
    });

    return () => {
      controller.abort();

      if (initialRevealControllerRef.current === controller) {
        initialRevealControllerRef.current = null;
        initialRevealRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  const namespace = getBarbaNamespace(displayedLocation);

  return (
    <div data-barba="wrapper" className="barba-react-wrapper">
      <div
        ref={containerRef}
        data-barba="container"
        data-barba-namespace={namespace}
        className="barba-page-container"
      >
        {children(displayedLocation)}
      </div>
    </div>
  );
};

export default PageTransition;

