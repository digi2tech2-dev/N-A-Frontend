import humanAvatar01 from '../assets/avatars/human-avatar-01.webp';
import humanAvatar02 from '../assets/avatars/human-avatar-02.webp';
import humanAvatar03 from '../assets/avatars/human-avatar-03.webp';
import humanAvatar04 from '../assets/avatars/human-avatar-04.webp';
import { resolveImageUrl } from './imageUrl';

export const DEFAULT_HUMAN_AVATARS = [
  humanAvatar01,
  humanAvatar02,
  humanAvatar03,
  humanAvatar04,
];

const isUiAvatarUrl = (value) => /\/\/ui-avatars\.com\//i.test(String(value || ''));
const isLegacyAvatarUrl = (value) => /\/\/i\.pravatar\.cc\//i.test(String(value || ''));

const safeDecodeUri = (value) => {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
};

const isLegacyGeneratedAvatarUrl = (value) => {
  const text = safeDecodeUri(value);
  return text.includes('data:image/svg+xml')
    && text.includes('<text x="128" y="216"')
    && text.includes('font-size="34"');
};

const isGeneratedSvgAvatarUrl = (value) => {
  const text = safeDecodeUri(value);
  return text.includes('data:image/svg+xml')
    && text.includes('<svg')
    && text.includes('viewBox="0 0 256 256"');
};

const hashString = (value) => {
  const text = String(value || 'N&A HUB User');
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const isAdminIdentity = (source, identity = '') => {
  if (source && typeof source === 'object') {
    const role = String(source.role || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin' || role === 'platform_admin') return true;
  }

  const text = String(identity || '').toLowerCase();
  return text.includes('platform admin') || text.includes('مدير المنصة') || text.includes('مدير المنصه');
};

export const getDefaultAvatarUrl = (identity = 'N&A HUB User', options = {}) => {
  const seed = String(identity || 'N&A HUB User').trim() || 'N&A HUB User';
  const roleKey = options.variant === 'gulf-admin' ? 'admin' : 'customer';
  const avatarIndex = hashString(`${seed}:${roleKey}`) % DEFAULT_HUMAN_AVATARS.length;

  return DEFAULT_HUMAN_AVATARS[avatarIndex];
};

export const resolveUserAvatar = (source, fallbackIdentity = 'N&A HUB User') => {
  const isObject = source && typeof source === 'object';
  const rawAvatar = isObject ? source.avatar : source;
  const identity = String(
    fallbackIdentity
    || (isObject ? (source.name || source.username || source.email) : '')
    || 'N&A HUB User'
  ).trim();
  const resolved = resolveImageUrl(rawAvatar);

  const hasCustomAvatar = resolved
    && !isUiAvatarUrl(resolved)
    && !isLegacyAvatarUrl(resolved)
    && !isLegacyGeneratedAvatarUrl(resolved)
    && !isGeneratedSvgAvatarUrl(resolved);

  if (hasCustomAvatar) return resolved;

  return getDefaultAvatarUrl(identity, {
    variant: isAdminIdentity(source, identity) ? 'gulf-admin' : 'human',
  });
};
