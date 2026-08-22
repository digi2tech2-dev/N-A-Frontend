import { isAdminRole, isSupervisorRole } from './authRoles';

const ADMIN_SIDEBAR_PATHS = new Set([
  '/admin/dashboard',
  '/admin/wallet',
  '/admin/users',
  '/admin/supervisors',
  '/admin/supervisor-monitoring',
  '/admin/groups',
  '/admin/products',
  '/admin/orders',
  '/admin/payments',
  '/admin/payment-methods',
  '/admin/currencies',
  '/admin/suppliers',
  '/admin/target-requests',
  '/account',
  '/account-security',
  '/settings',
]);

const CUSTOMER_SIDEBAR_PATHS = new Set([
  '/orders',
  '/referral',
  '/account',
  '/account-security',
  '/settings',
]);

const MANAGER_SIDEBAR_PATHS = new Set([
  '/dashboard',
  '/admin/users',
  '/admin/orders',
  '/admin/groups',
  '/admin/products',
  '/admin/payments',
  '/admin/payment-methods',
  '/admin/suppliers',
  '/admin/target-requests',
  '/account',
  '/account-security',
  '/settings',
]);

const pathnameHistory = [];

export const getDashboardPathForRole = (role) => {
  if (isAdminRole(role)) return '/admin/dashboard';
  if (isSupervisorRole(role)) return '/dashboard';
  return '/dashboard';
};

export const isSidebarRootPath = (pathname, role) => {
  const path = String(pathname || '').trim();
  if (!path) return false;

  if (isAdminRole(role)) {
    return ADMIN_SIDEBAR_PATHS.has(path);
  }

  if (isSupervisorRole(role)) {
    return MANAGER_SIDEBAR_PATHS.has(path);
  }

  return CUSTOMER_SIDEBAR_PATHS.has(path);
};

export const registerVisitedPath = (pathname) => {
  const path = String(pathname || '').trim();
  if (!path) return;

  if (pathnameHistory[pathnameHistory.length - 1] === path) {
    return;
  }

  pathnameHistory.push(path);

  if (pathnameHistory.length > 50) {
    pathnameHistory.shift();
  }
};

export const getPreviousVisitedPath = (currentPathname) => {
  const currentPath = String(currentPathname || '').trim();
  if (!currentPath) return null;

  for (let index = pathnameHistory.length - 2; index >= 0; index -= 1) {
    const candidate = pathnameHistory[index];
    if (candidate && candidate !== currentPath) {
      return candidate;
    }
  }

  return null;
};
