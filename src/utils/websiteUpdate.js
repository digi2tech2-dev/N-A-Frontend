export const WEBSITE_VERSION_STORAGE_KEY = 'na-hub:website-version';
export const WEBSITE_UPDATE_DISMISSED_KEY = 'na-hub:website-update-dismissed';

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_UPDATE_MESSAGE_LENGTH = 240;

export const normalizeWebsiteVersion = (value) => {
  const version = String(value || '').trim();
  return VERSION_PATTERN.test(version) ? version : null;
};

export const compareWebsiteVersions = (left, right) => {
  const normalizedLeft = normalizeWebsiteVersion(left);
  const normalizedRight = normalizeWebsiteVersion(right);

  if (!normalizedLeft || !normalizedRight) return null;

  const leftParts = normalizedLeft.split('.').map(Number);
  const rightParts = normalizedRight.split('.').map(Number);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }

  return 0;
};

export const normalizeWebsiteVersionManifest = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const version = normalizeWebsiteVersion(payload.version);
  if (!version) return null;

  const message = typeof payload.message === 'string'
    ? payload.message.trim().slice(0, MAX_UPDATE_MESSAGE_LENGTH)
    : '';

  return {
    version,
    forceUpdate: payload.forceUpdate === true,
    message,
  };
};

export const getWebsiteUpdate = (currentVersion, payload) => {
  const manifest = normalizeWebsiteVersionManifest(payload);
  if (!manifest) return null;

  return compareWebsiteVersions(manifest.version, currentVersion) === 1
    ? manifest
    : null;
};

export const readAndPersistCurrentWebsiteVersion = (buildVersion, storage) => {
  const normalizedBuildVersion = normalizeWebsiteVersion(buildVersion);
  if (!normalizedBuildVersion) return null;

  try {
    const storedVersion = normalizeWebsiteVersion(storage?.getItem?.(WEBSITE_VERSION_STORAGE_KEY));
    if (storedVersion !== normalizedBuildVersion) {
      storage?.setItem?.(WEBSITE_VERSION_STORAGE_KEY, normalizedBuildVersion);
    }
  } catch {
    // Storage can be unavailable in private/restricted WebViews. The embedded
    // build version remains the source of truth in that case.
  }

  return normalizedBuildVersion;
};

export const wasWebsiteUpdateDismissed = (version, storage) => {
  try {
    return storage?.getItem?.(WEBSITE_UPDATE_DISMISSED_KEY) === version;
  } catch {
    return false;
  }
};

export const dismissWebsiteUpdate = (version, storage) => {
  try {
    storage?.setItem?.(WEBSITE_UPDATE_DISMISSED_KEY, version);
  } catch {
    // Dismissal is session-only and non-critical.
  }
};

export const clearDismissedWebsiteUpdate = (storage) => {
  try {
    storage?.removeItem?.(WEBSITE_UPDATE_DISMISSED_KEY);
  } catch {
    // Storage cleanup is non-critical.
  }
};

export const buildVersionCheckUrl = (endpoint, timestamp = Date.now()) => {
  const url = new URL(endpoint);
  url.searchParams.set('__na_version_check', String(timestamp));
  return url.toString();
};

export const buildWebsiteRefreshUrl = (currentUrl, version, timestamp = Date.now()) => {
  const url = new URL(currentUrl);
  url.searchParams.set('__na_site_version', normalizeWebsiteVersion(version) || 'refresh');
  url.searchParams.set('__na_update', String(timestamp));
  return url.toString();
};

export const fetchWebsiteVersionManifest = async ({
  endpoint,
  fetchImpl = globalThis.fetch,
  timeoutMs = 6000,
  timestamp = Date.now(),
} = {}) => {
  if (!endpoint || typeof fetchImpl !== 'function') return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetchImpl(buildVersionCheckUrl(endpoint, timestamp), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });

    if (!response?.ok) return null;
    return normalizeWebsiteVersionManifest(await response.json());
  } catch {
    return null;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
};
