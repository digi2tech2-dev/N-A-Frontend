import barba from '@barba/core';

const BARBA_REACT_ADAPTER = Symbol.for('kanz-coins.barba-react-adapter');
const ENTER_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const LEAVE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const LEAVE_DURATION = 40;
const ENTER_DURATION = 110;

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
);

const clearTransitionStyles = (element) => {
  if (!element) return;
  element.style.removeProperty('opacity');
  element.style.removeProperty('transform');
  element.style.removeProperty('filter');
  element.style.removeProperty('transform-origin');
  element.style.removeProperty('will-change');
};

const getMotionDirection = (trigger) => {
  const isHistoryNavigation = String(trigger || '').toLowerCase() === 'pop';
  const isRtl = typeof document !== 'undefined'
    && document.documentElement.getAttribute('dir') === 'rtl';
  const readingDirection = isRtl ? -1 : 1;

  return readingDirection * (isHistoryNavigation ? -1 : 1);
};

const animateElement = async (element, keyframes, options, signal) => {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') {
    return;
  }

  const animation = element.animate(keyframes, options);
  const abort = () => animation.cancel();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    await animation.finished;
  } catch {
    // Cancelling an obsolete transition rejects `finished`; cleanup is intentional.
  } finally {
    signal?.removeEventListener('abort', abort);
  }
};

const leave = async ({ current, signal, trigger }) => {
  const element = current?.container;
  if (!element) return;

  const direction = getMotionDirection(trigger);
  const exitOffset = -8 * direction;
  element.style.transformOrigin = '50% 42%';
  element.style.willChange = 'opacity, transform, filter';
  await animateElement(
    element,
    [
      {
        opacity: 1,
        transform: 'translate3d(0, 0, 0) scale(1)',
        filter: 'blur(0px)',
      },
      {
        opacity: 0.72,
        transform: `translate3d(${exitOffset * 0.45}px, 0, 0) scale(0.993)`,
        filter: 'blur(0.4px)',
        offset: 0.58,
      },
      {
        opacity: 0,
        transform: `translate3d(${exitOffset}px, 0, 0) scale(0.99)`,
        filter: 'blur(1.5px)',
      },
    ],
    {
      duration: LEAVE_DURATION,
      easing: LEAVE_EASING,
      fill: 'forwards',
    },
    signal
  );

  if (!signal?.aborted && !prefersReducedMotion()) {
    element.style.opacity = '0';
    element.style.transform = `translate3d(${exitOffset}px, 0, 0) scale(0.99)`;
    element.style.filter = 'blur(1.5px)';
  }
};

const enter = async ({ next, signal, trigger }) => {
  const element = next?.container;
  if (!element) return;

  if (signal?.aborted || prefersReducedMotion()) {
    clearTransitionStyles(element);
    return;
  }

  const direction = getMotionDirection(trigger);
  const enterOffset = 12 * direction;
  element.style.opacity = '0';
  element.style.transform = `translate3d(${enterOffset}px, 0, 0) scale(0.992)`;
  element.style.filter = 'blur(2px)';
  element.style.transformOrigin = '50% 42%';
  element.style.willChange = 'opacity, transform, filter';

  await animateElement(
    element,
    [
      {
        opacity: 0,
        transform: `translate3d(${enterOffset}px, 0, 0) scale(0.992)`,
        filter: 'blur(2px)',
      },
      {
        opacity: 1,
        transform: 'translate3d(0, 0, 0) scale(1)',
        filter: 'blur(0px)',
      },
    ],
    {
      duration: ENTER_DURATION,
      easing: ENTER_EASING,
      fill: 'forwards',
    },
    signal
  );

  clearTransitionStyles(element);
};

if (!barba[BARBA_REACT_ADAPTER]) {
  // React owns the mounted DOM and providers. Barba supplies the transition
  // lifecycle without replacing the React root or resetting application state.
  barba.hooks.leave(leave);
  barba.hooks.enter(enter);
  barba.hooks.once(({ next, signal }) => enter({ next, signal }));
  barba[BARBA_REACT_ADAPTER] = true;
}

const transition = {
  name: 'react-router-premium-page-transition',
  sync: false,
};

const toUrl = (location) => {
  const path = location?.pathname || '/';
  const search = location?.search || '';
  const hash = location?.hash || '';
  const href = typeof window === 'undefined'
    ? `${path}${search}${hash}`
    : new URL(`${path}${search}${hash}`, window.location.origin).href;

  return {
    href,
    path,
    query: Object.fromEntries(new URLSearchParams(search)),
    hash: hash.replace(/^#/, ''),
  };
};

export const getBarbaNamespace = (location) => {
  const path = String(location?.pathname || '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-');

  return path || 'home';
};

const createBarbaPage = (location, container) => ({
  container,
  html: '',
  namespace: getBarbaNamespace(location),
  url: toUrl(location),
});

export const runBarbaInitialReveal = async ({ location, container, signal }) => {
  const data = {
    current: {},
    next: createBarbaPage(location, container),
    trigger: 'barba',
    signal,
  };

  await barba.hooks.do('beforeOnce', data, transition);
  await barba.hooks.do('once', data, transition);
  await barba.hooks.do('afterOnce', data, transition);
};

export const runBarbaLeave = async ({ from, to, container, trigger, signal }) => {
  const data = {
    current: createBarbaPage(from, container),
    next: createBarbaPage(to, null),
    trigger,
    signal,
  };

  await barba.hooks.do('before', data, transition);
  await barba.hooks.do('beforeLeave', data, transition);
  await barba.hooks.do('leave', data, transition);
  await barba.hooks.do('afterLeave', data, transition);

  return data;
};

export const runBarbaEnter = async ({ data, container, signal }) => {
  data.next = {
    ...data.next,
    container,
  };
  data.signal = signal;

  await barba.hooks.do('beforeEnter', data, transition);
  await barba.hooks.do('enter', data, transition);
  await barba.hooks.do('afterEnter', data, transition);
  await barba.hooks.do('after', data, transition);
};

export const resetBarbaTransitionStyles = clearTransitionStyles;

