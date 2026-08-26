/* N&A HUB offline-first cache with versioned, atomic builds and rollback. */
const CACHE_PREFIX = 'nahub-web-';
const CACHE_VERSION = new URL(self.location.href).searchParams.get('v') || 'runtime';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = '/';
const VERSION_PATH = '/version.json';

const isCacheableAsset = (url) => url.origin === self.location.origin
  && (/^\/assets\//.test(url.pathname)
    || /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|mp4)$/i.test(url.pathname));

const getBuildAssets = async (htmlResponse) => {
  const html = await htmlResponse.clone().text();
  const assets = new Set([APP_SHELL]);
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (isCacheableAsset(url)) assets.add(url.pathname + url.search);
    } catch { /* Ignore malformed/external references. */ }
  }
  return [...assets];
};

const deleteCache = (name) => caches.delete(name).catch(() => false);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const shellResponse = await fetch(APP_SHELL, { cache: 'no-store' });
      if (!shellResponse.ok) throw new Error('App shell unavailable');
      await cache.put(APP_SHELL, shellResponse.clone());
      const assets = await getBuildAssets(shellResponse);
      await Promise.all(assets.filter((asset) => asset !== APP_SHELL).map(async (asset) => {
        const response = await fetch(asset, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Asset unavailable: ${asset}`);
        await cache.put(asset, response);
      }));
      await self.skipWaiting();
    } catch (error) {
      await deleteCache(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const builds = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    const obsolete = builds.filter((key) => key !== CACHE_NAME).sort()
      .slice(0, Math.max(0, builds.length - 2));
    await Promise.all(obsolete.map(deleteCache));
    await self.clients.claim();
  })());
});

const findInBuildCaches = async (request) => {
  const keys = await caches.keys();
  const ordered = [CACHE_NAME, ...keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).sort().reverse()];
  for (const key of ordered) {
    const response = await caches.match(request, { cacheName: key });
    if (response) return response;
  }
  return undefined;
};

const networkFirst = async (request) => {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(APP_SHELL, response.clone());
    }
    return response;
  } catch {
    return (await findInBuildCaches(request)) || (await findInBuildCaches(APP_SHELL));
  }
};

const cacheFirst = async (request) => {
  const cached = await findInBuildCaches(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;
  // version.json is network-only/no-store by design.
  if (url.pathname === VERSION_PATH) return;
  if (request.mode === 'navigate' || url.pathname === APP_SHELL) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isCacheableAsset(url)) event.respondWith(cacheFirst(request));
});
