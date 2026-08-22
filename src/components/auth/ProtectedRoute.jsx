import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { getDefaultRouteForRole, hasRequiredRole } from '../../utils/authRoles';
import {
  getAccountAccessRoute,
  isApprovedAccountStatus,
  normalizeAccountStatus,
} from '../../utils/accountStatus';
import { hasPermission } from '../../utils/permissions';

const SAFE_FALLBACK_PATH = '/dashboard';

const AccessDeniedFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center px-4">
    <div className="max-w-md rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.92)] p-6 text-center shadow-[var(--shadow-subtle)]">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">لا تملك صلاحية الوصول</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
        لا يمكن فتح هذه الصفحة بحسابك الحالي. يمكنك الرجوع إلى الصفحة الرئيسية ومتابعة التصفح من هناك.
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, roles = [], permission = null }) => {
  const { user, isAuthenticated, blockedStatus } = useAuthStore();
  const location = useLocation();
  const normalizedStatus = normalizeAccountStatus(user?.status || blockedStatus);
  const blockedRoute = getAccountAccessRoute(normalizedStatus);

  if (!isAuthenticated && blockedRoute) {
    return <Navigate to={blockedRoute} state={{ from: location }} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (user?.profileCompletionRequired) {
    return <Navigate to="/auth?status=PROFILE_COMPLETION_REQUIRED" state={{ from: location }} replace />;
  }

  if (!isApprovedAccountStatus(normalizedStatus) && blockedRoute) {
    return <Navigate to={blockedRoute} state={{ from: location }} replace />;
  }

  const fallbackPath = getDefaultRouteForRole(user?.role);
  const redirectOnDenied = () => {
    const redirectPath = fallbackPath === location.pathname ? SAFE_FALLBACK_PATH : fallbackPath;

    if (redirectPath && redirectPath !== location.pathname) {
      return <Navigate to={redirectPath} state={{ from: location, denied: true }} replace />;
    }

    return <AccessDeniedFallback />;
  };

  if (roles.length > 0 && !hasRequiredRole(user?.role, roles)) {
    return redirectOnDenied();
  }

  if (!hasPermission(user, permission)) {
    return redirectOnDenied();
  }

  return children;
};

export default ProtectedRoute;
