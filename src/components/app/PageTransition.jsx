import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import NavigationOverlay from './NavigationOverlay';
import { preloadRoute } from '../../transitions/routeModules';
import {
  getBarbaNamespace,
  resetBarbaTransitionStyles,
  runBarbaEnter,
  runBarbaInitialReveal,
  runBarbaLeave,
} from '../../transitions/barbaTransition';

const locationIdentity = (location) => [
  location?.key || 'default',
  location?.pathname || '/',
  location?.search || '',
  location?.hash || '',
].join('|');

const nextPaint = () => new Promise((resolve) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(resolve);
  });
});

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
  const [isTransitioning, setIsTransitioning] = useState(false);
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

        const container = containerRef.current;
        const fallbackPosition = { x: window.scrollX, y: window.scrollY };
        scrollPositionsRef.current.set(from.key, fallbackPosition);

        setIsTransitioning(true);
        document.documentElement.dataset.pageTransition = 'running';
        document.activeElement?.blur?.();

        const preloadPromise = preloadRoute(to.pathname);
        await nextPaint();

        const barbaData = await runBarbaLeave({
          from,
          to,
          container,
          trigger: targetNavigation.navigationType.toLowerCase(),
          signal: controller.signal,
        });

        if (controller.signal.aborted || !mountedRef.current) break;

        await preloadPromise;
        await commitLocation(to);
        await nextPaint();

        restoreScroll(
          to,
          targetNavigation.navigationType,
          scrollPositionsRef.current,
          fallbackPosition
        );

        await runBarbaEnter({
          data: barbaData,
          container: containerRef.current,
          signal: controller.signal,
        });

        if (controller.signal.aborted || !mountedRef.current) break;
        displayedLocationRef.current = to;
      }
    } finally {
      processingRef.current = false;
      abortControllerRef.current = null;

      if (mountedRef.current) {
        resetBarbaTransitionStyles(containerRef.current);
        setIsTransitioning(false);
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
        aria-busy={isTransitioning}
      >
        {children(displayedLocation)}
      </div>
      <NavigationOverlay active={isTransitioning} />
    </div>
  );
};

export default PageTransition;
