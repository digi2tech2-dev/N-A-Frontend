import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import FloatingWhatsApp from './components/ui/FloatingWhatsApp';
import MobileBottomNav from './components/layout/MobileBottomNav';
import PageTransition from './components/app/PageTransition';
import SessionBootstrap from './components/app/SessionBootstrap';
import RouteErrorBoundary from './components/app/RouteErrorBoundary';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import {
  ADMIN_ROLES,
  SUPERVISOR_ROLES,
  getDefaultRouteForRole,
  isSupervisorRole,
} from './utils/authRoles';
import { PERMISSIONS } from './utils/permissions';
import {
  ACCOUNT_PENDING_ROUTE,
  ACCOUNT_REJECTED_ROUTE,
  ACCOUNT_VERIFICATION_ROUTE,
  getAccountAccessRoute,
  normalizeAccountStatus,
} from './utils/accountStatus';
import useAuthStore from './store/useAuthStore';
import DeveloperApi from './pages/DeveloperApi';
import { routeLoaders } from './transitions/routeModules';

const Layout = lazy(routeLoaders.Layout);
const Onboarding = lazy(routeLoaders.Onboarding);
const Auth = lazy(routeLoaders.Auth);
const AccountPending = lazy(routeLoaders.AccountPending);
const AccountRejected = lazy(routeLoaders.AccountRejected);
const AccountVerificationRequired = lazy(routeLoaders.AccountVerificationRequired);
const EmailVerified = lazy(routeLoaders.EmailVerified);
const Dashboard = lazy(routeLoaders.Dashboard);
const AdminDashboard = lazy(routeLoaders.AdminDashboard);
const Orders = lazy(routeLoaders.Orders);
const Products = lazy(routeLoaders.Products);
const ProductPurchasePage = lazy(routeLoaders.ProductPurchasePage);
const Settings = lazy(routeLoaders.Settings);
const ContactUs = lazy(routeLoaders.ContactUs);
const Account = lazy(routeLoaders.Account);
const AccountSecurity = lazy(routeLoaders.AccountSecurity);
const Referral = lazy(routeLoaders.Referral);
const AdminUsers = lazy(routeLoaders.AdminUsers);
const AdminGroups = lazy(routeLoaders.AdminGroups);
const AdminProducts = lazy(routeLoaders.AdminProducts);
const AdminWallet = lazy(routeLoaders.AdminWallet);
const AdminReferrals = lazy(routeLoaders.AdminReferrals);
const AdminCurrencies = lazy(routeLoaders.AdminCurrencies);
const AdminPayments = lazy(routeLoaders.AdminPayments);
const AdminPaymentMethods = lazy(routeLoaders.AdminPaymentMethods);
const WhatsAppSettings = lazy(routeLoaders.WhatsAppSettings);
const AdminSupervisors = lazy(routeLoaders.AdminSupervisors);
const SupervisorMonitoring = lazy(routeLoaders.SupervisorMonitoring);
const AdminSuppliers = lazy(routeLoaders.AdminSuppliers);
const AdminOrders = lazy(routeLoaders.AdminOrders);
const AdminTargetRequests = lazy(routeLoaders.AdminTargetRequests);
const BuyTarget = lazy(routeLoaders.BuyTarget);
const TargetOrders = lazy(routeLoaders.TargetOrders);
const AddBalance = lazy(routeLoaders.AddBalance);
const WalletTopupHistory = lazy(routeLoaders.WalletTopupHistory);
const PaymentDetails = lazy(routeLoaders.PaymentDetails);

const ADMIN_PANEL_ROLES = [...ADMIN_ROLES, ...SUPERVISOR_ROLES];

const RouteLoader = () => (
  <div className="page-route-loader" role="status" aria-live="polite">
    <span className="page-route-loader__spinner" aria-hidden="true" />
    <span className="sr-only">Loading page</span>
  </div>
);

const renderSuspended = (element) => (
  <Suspense fallback={<RouteLoader />}>
    {element}
  </Suspense>
);

const OnboardingRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const blockedStatus = useAuthStore((state) => state.blockedStatus);

  if (isAuthenticated) {
    const accountStatus = user?.profileCompletionRequired
      ? 'profile_completion_required'
      : normalizeAccountStatus(blockedStatus || user?.status);
    const destination = getAccountAccessRoute(accountStatus)
      || getDefaultRouteForRole(user?.role);

    return <Navigate to={destination} replace />;
  }

  return renderSuspended(<Onboarding />);
};

const AdminPanelDefaultRoute = () => {
  const user = useAuthStore((state) => state.user);
  const fallbackPath = isSupervisorRole(user?.role) ? '/dashboard' : '/admin/dashboard';

  return <Navigate to={fallbackPath} replace />;
};

const AdminDashboardRoute = () => {
  const user = useAuthStore((state) => state.user);

  if (isSupervisorRole(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return renderSuspended(<AdminDashboard />);
};

const AnimatedAppRoutes = ({ location }) => {
  const isAdminRoute = location.pathname.startsWith('/admin');

  const routes = (
    <Routes location={location}>
      <Route path="/" element={<OnboardingRoute />} />
      <Route path="/welcome" element={<OnboardingRoute />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/auth" element={renderSuspended(<Auth />)} />
      <Route path="/login" element={renderSuspended(<Auth />)} />
      <Route path="/email-verified" element={renderSuspended(<EmailVerified />)} />
      <Route path={ACCOUNT_PENDING_ROUTE} element={renderSuspended(<AccountPending />)} />
      <Route path={ACCOUNT_REJECTED_ROUTE} element={renderSuspended(<AccountRejected />)} />
      <Route path={ACCOUNT_VERIFICATION_ROUTE} element={renderSuspended(<AccountVerificationRequired />)} />
      <Route path="/account-pending" element={<Navigate to={ACCOUNT_PENDING_ROUTE} replace />} />
      <Route path="/account-rejected" element={<Navigate to={ACCOUNT_REJECTED_ROUTE} replace />} />

      <Route element={renderSuspended(<Layout />)}>
        <Route path="/wallet" element={<Navigate to="/wallet/add-balance" replace />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<Dashboard />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orders"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<Orders />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orders/:orderId"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<Orders />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/products"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<Products />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/products/:productId"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<ProductPurchasePage />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/purchase/:productId"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<ProductPurchasePage />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<Settings />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/developers/api"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              <DeveloperApi />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/account"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<Account />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/account/security"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<AccountSecurity />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/account-security"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<AccountSecurity />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/referral"
          element={(
            <ProtectedRoute roles={['customer']}>
              {renderSuspended(<Referral />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/contact-us"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<ContactUs />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/buy-target"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<BuyTarget />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/target-orders"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<TargetOrders />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet/add-balance"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<AddBalance />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet/topups"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<WalletTopupHistory />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet/topup-history"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<WalletTopupHistory />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet/payment-details/:methodId"
          element={(
            <ProtectedRoute roles={['customer', 'admin', ...SUPERVISOR_ROLES]}>
              {renderSuspended(<PaymentDetails />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES}>
              <AdminPanelDefaultRoute />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/manager/dashboard"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES}>
              <AdminPanelDefaultRoute />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/supervisor/dashboard"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES}>
              <AdminPanelDefaultRoute />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/dashboard"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES}>
              <AdminDashboardRoute />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_USERS}>
              {renderSuspended(<AdminUsers />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/groups"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_GROUPS}>
              {renderSuspended(<AdminGroups />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/products"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_PRODUCTS}>
              {renderSuspended(<AdminProducts />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/wallet"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_WALLET}>
              {renderSuspended(<AdminWallet />)}
            </ProtectedRoute>
          )}
        />
        <Route path="/admin/user-transactions" element={<Navigate to="/admin/wallet" replace />} />
        <Route path="/admin/users/:userId/transactions" element={<Navigate to="/admin/wallet" replace />} />
        <Route
          path="/admin/referrals"
          element={(
            <ProtectedRoute roles={ADMIN_ROLES}>
              {renderSuspended(<AdminReferrals />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/payments"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_PAYMENTS}>
              {renderSuspended(<AdminPayments />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/orders"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_ORDERS}>
              {renderSuspended(<AdminOrders />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/supervisors"
          element={(
            <ProtectedRoute roles={ADMIN_ROLES}>
              {renderSuspended(<AdminSupervisors />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/supervisors/:supervisorId/monitoring"
          element={(
            <ProtectedRoute roles={ADMIN_ROLES}>
              {renderSuspended(<SupervisorMonitoring />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/supervisor-monitoring"
          element={(
            <ProtectedRoute roles={ADMIN_ROLES}>
              {renderSuspended(<SupervisorMonitoring />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/topups"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_PAYMENTS}>
              <Navigate to="/admin/payments" replace />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/payment-methods"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_PAYMENT_METHODS}>
              {renderSuspended(<AdminPaymentMethods />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/whatsapp"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_WHATSAPP}>
              {renderSuspended(<WhatsAppSettings />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/currencies"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_CURRENCIES}>
              {renderSuspended(<AdminCurrencies />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/suppliers"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_SUPPLIERS}>
              {renderSuspended(<AdminSuppliers />)}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/target-requests"
          element={(
            <ProtectedRoute roles={ADMIN_PANEL_ROLES} permission={PERMISSIONS.ADMIN_TARGET_REQUESTS}>
              {renderSuspended(<AdminTargetRequests />)}
            </ProtectedRoute>
          )}
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <RouteErrorBoundary routeKey={routeKey}>
      <div className={`min-h-screen${isAdminRoute ? ' admin-route-view' : ''}`}>{routes}</div>
    </RouteErrorBoundary>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <SessionBootstrap />
          <BrowserRouter>
            <PageTransition>
              {(location) => <AnimatedAppRoutes location={location} />}
            </PageTransition>
            <MobileBottomNav />
            <FloatingWhatsApp />
          </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
