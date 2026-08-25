import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { closeTopOverlay } from '../../utils/overlayBackStack';
import { runCurrentNativeBackAction } from '../../utils/nativeBackActionRegistry';

const locationIdentity = (location) => [
  location.key || 'default',
  location.pathname || '/',
  location.search || '',
  location.hash || '',
].join('|');

const isAndroidNativeApp = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

/**
 * Owns Android system Back for the entire React Router tree.  The route stack
 * is deliberately session-owned rather than derived from WebView history, so
 * direct launches cannot pop to an unrelated browser or OAuth entry.
 */
const AndroidBackNavigation = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const routeStackRef = useRef({ entries: [], index: -1 });
  const navigateRef = useRef(navigate);
  const handleBackRef = useRef(() => {});
  const isPopPendingRef = useRef(false);

  useLayoutEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useLayoutEffect(() => {
    isPopPendingRef.current = false;
    const routeStack = routeStackRef.current;
    const entry = { identity: locationIdentity(location) };

    if (routeStack.index === -1) {
      routeStack.entries = [entry];
      routeStack.index = 0;
      return;
    }

    if (routeStack.entries[routeStack.index]?.identity === entry.identity) return;

    if (navigationType === 'PUSH') {
      routeStack.entries = routeStack.entries.slice(0, routeStack.index + 1);
      routeStack.entries.push(entry);
      routeStack.index = routeStack.entries.length - 1;
      return;
    }

    if (navigationType === 'REPLACE') {
      routeStack.entries[routeStack.index] = entry;
      return;
    }

    const previousIndex = routeStack.entries.findIndex((candidate) => candidate.identity === entry.identity);
    if (previousIndex >= 0) {
      routeStack.index = previousIndex;
      return;
    }

    // A POP to an entry the app did not create is a new safe root. This is
    // important after reloads, app links, and browser/WebView history changes.
    routeStack.entries = [entry];
    routeStack.index = 0;
  }, [location, navigationType]);

  useLayoutEffect(() => {
    handleBackRef.current = () => {
      if (closeTopOverlay()) return;

      if (runCurrentNativeBackAction()) return;

      if (routeStackRef.current.index > 0) {
        if (isPopPendingRef.current) return;
        isPopPendingRef.current = true;
        navigateRef.current(-1);
        return;
      }

      void App.exitApp();
    };
  });

  useEffect(() => {
    if (!isAndroidNativeApp()) return undefined;

    let active = true;
    let listenerHandle;

    void App.addListener('backButton', () => {
      handleBackRef.current();
    }).then((handle) => {
      if (active) {
        listenerHandle = handle;
      } else {
        void handle.remove();
      }
    });

    return () => {
      active = false;
      void listenerHandle?.remove();
    };
  }, []);

  return null;
};

export default AndroidBackNavigation;
