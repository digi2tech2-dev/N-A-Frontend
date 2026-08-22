/**
 * imageUrl.js — Utility to resolve image paths for display.
 *
 * The backend stores relative paths like `/uploads/avatars/123-abc.jpg`.
 * This utility prepends the backend origin so <img src> works correctly.
 *
 * Handles:
 *   - Relative paths: `/uploads/...` → `http://localhost:5000/uploads/...`
 *   - Absolute URLs: `https://...` → returned as-is
 *   - Base64 data URIs / object URLs: `data:image/...`, `blob:...` → returned as-is
 *   - Falsy values: → empty string
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Backend origin (without /api suffix).
 * e.g. "http://localhost:5000" or "https://mysite.com"
 */
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/**
 * Resolve an image path for display in <img src>.
 *
 * @param {string|null|undefined} path - Relative path, absolute URL, or falsy
 * @returns {string} A fully-qualified URL or empty string
 */
export const resolveImageUrl = (path) => {
  if (!path) return '';
  const trimmed = String(path).trim();
  if (!trimmed) return '';

  // Already absolute, data URI, or browser object URL — return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Relative path — prepend backend origin
  return `${BACKEND_ORIGIN}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export default resolveImageUrl;
