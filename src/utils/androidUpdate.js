import { ANDROID_VERSION_MANIFEST_URL } from '../config/appDownloads.js';

const MAX_MESSAGE_LENGTH = 240;
const MAX_VERSION_NAME_LENGTH = 64;

const normalizeVersionCode = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 ? number : null;
};

const normalizeText = (value, maxLength) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const normalizeDownloadUrl = (value) => {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname === 'na-hub.online'
      ? url.href
      : null;
  } catch {
    return null;
  }
};

export const normalizeAndroidVersionManifest = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const latestVersionCode = normalizeVersionCode(payload.latestVersionCode);
  const minimumSupportedVersionCode = normalizeVersionCode(payload.minimumSupportedVersionCode);
  const downloadUrl = normalizeDownloadUrl(payload.downloadUrl);

  if (
    !latestVersionCode
    || !minimumSupportedVersionCode
    || minimumSupportedVersionCode > latestVersionCode
    || !downloadUrl
  ) return null;

  return {
    latestVersionCode,
    latestVersionName: normalizeText(payload.latestVersionName, MAX_VERSION_NAME_LENGTH),
    minimumSupportedVersionCode,
    forceUpdate: payload.forceUpdate === true,
    downloadUrl,
    message: normalizeText(payload.message, MAX_MESSAGE_LENGTH),
  };
};

export const getAndroidUpdate = (currentVersionCode, payload) => {
  const current = normalizeVersionCode(currentVersionCode);
  const manifest = normalizeAndroidVersionManifest(payload);

  if (!current || !manifest || manifest.latestVersionCode <= current) return null;

  return {
    ...manifest,
    forceUpdate: manifest.forceUpdate || current < manifest.minimumSupportedVersionCode,
  };
};

export const buildAndroidVersionCheckUrl = (endpoint, timestamp = Date.now()) => {
  const url = new URL(endpoint);
  url.searchParams.set('__na_android_update', String(timestamp));
  return url.toString();
};

export const fetchAndroidVersionManifest = async ({
  endpoint = ANDROID_VERSION_MANIFEST_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = 6000,
  timestamp = Date.now(),
} = {}) => {
  if (typeof fetchImpl !== 'function') return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(buildAndroidVersionCheckUrl(endpoint, timestamp), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });
    if (!response?.ok) return null;
    return normalizeAndroidVersionManifest(await response.json());
  } catch {
    return null;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
};
