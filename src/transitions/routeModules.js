export const routeLoaders = {
  Layout: () => import('../components/layout/Layout'),
  Onboarding: () => import('../pages/Onboarding'),
  Auth: () => import('../pages/Auth'),
  AccountPending: () => import('../pages/AccountPending'),
  AccountRejected: () => import('../pages/AccountRejected'),
  AccountVerificationRequired: () => import('../pages/AccountVerificationRequired'),
  EmailVerified: () => import('../pages/EmailVerified'),
  Dashboard: () => import('../pages/Dashboard'),
  AdminDashboard: () => import('../pages/AdminDashboard'),
  Orders: () => import('../pages/Orders'),
  Products: () => import('../pages/Products'),
  ProductPurchasePage: () => import('../pages/ProductPurchasePage'),
  Settings: () => import('../pages/Settings'),
  ContactUs: () => import('../pages/ContactUs'),
  Account: () => import('../pages/Account'),
  AccountSecurity: () => import('../pages/AccountSecurity'),
  Referral: () => import('../pages/Referral'),
  AdminUsers: () => import('../pages/admin/AdminUsers'),
  AdminGroups: () => import('../pages/admin/AdminGroups'),
  AdminProducts: () => import('../pages/admin/AdminProducts'),
  AdminWallet: () => import('../pages/admin/AdminWallet'),
  AdminReferrals: () => import('../pages/admin/AdminReferrals'),
  AdminCurrencies: () => import('../pages/admin/AdminCurrencies'),
  AdminPayments: () => import('../pages/admin/AdminPayments'),
  AdminPaymentMethods: () => import('../pages/admin/AdminPaymentMethods'),
  WhatsAppSettings: () => import('../pages/admin/WhatsAppSettings'),
  AdminSupervisors: () => import('../pages/admin/AdminSupervisors'),
  SupervisorMonitoring: () => import('../pages/admin/SupervisorMonitoring'),
  AdminSuppliers: () => import('../pages/admin/AdminSuppliers'),
  AdminOrders: () => import('../pages/admin/AdminOrders'),
  AdminTargetRequests: () => import('../pages/admin/AdminTargetRequests'),
  BuyTarget: () => import('../pages/BuyTarget'),
  TargetOrders: () => import('../pages/TargetOrders'),
  AddBalance: () => import('../pages/AddBalance'),
  WalletTopupHistory: () => import('../pages/WalletTopupHistory'),
  PaymentDetails: () => import('../pages/PaymentDetails'),
};

const publicPaths = new Set([
  '/',
  '/welcome',
  '/onboarding',
  '/auth',
  '/login',
  '/email-verified',
  '/auth/account-pending',
  '/auth/account-rejected',
  '/auth/verify-email',
  '/account-pending',
  '/account-rejected',
]);

const routeMatchers = [
  [/^\/$/, routeLoaders.Onboarding],
  [/^\/(?:welcome|onboarding)\/?$/, routeLoaders.Onboarding],
  [/^\/(?:auth|login)\/?$/, routeLoaders.Auth],
  [/^\/email-verified\/?$/, routeLoaders.EmailVerified],
  [/^\/auth\/verify-email\/?$/, routeLoaders.AccountVerificationRequired],
  [/^\/auth\/account-pending\/?$/, routeLoaders.AccountPending],
  [/^\/auth\/account-rejected\/?$/, routeLoaders.AccountRejected],
  [/^\/account-pending\/?$/, routeLoaders.AccountPending],
  [/^\/account-rejected\/?$/, routeLoaders.AccountRejected],
  [/^\/dashboard\/?$/, routeLoaders.Dashboard],
  [/^\/orders(?:\/[^/]+)?\/?$/, routeLoaders.Orders],
  [/^\/products\/?$/, routeLoaders.Products],
  [/^\/(?:products|purchase)\/[^/]+\/?$/, routeLoaders.ProductPurchasePage],
  [/^\/wallet\/?$/, routeLoaders.AddBalance],
  [/^\/settings\/?$/, routeLoaders.Settings],
  [/^\/account\/security\/?$/, routeLoaders.AccountSecurity],
  [/^\/account-security\/?$/, routeLoaders.AccountSecurity],
  [/^\/referral\/?$/, routeLoaders.Referral],
  [/^\/account\/?$/, routeLoaders.Account],
  [/^\/contact-us\/?$/, routeLoaders.ContactUs],
  [/^\/buy-target\/?$/, routeLoaders.BuyTarget],
  [/^\/target-orders\/?$/, routeLoaders.TargetOrders],
  [/^\/wallet\/add-balance\/?$/, routeLoaders.AddBalance],
  [/^\/wallet\/(?:topups|topup-history)\/?$/, routeLoaders.WalletTopupHistory],
  [/^\/wallet\/payment-details\/[^/]+\/?$/, routeLoaders.PaymentDetails],
  [/^\/(?:admin|manager\/dashboard|supervisor\/dashboard)\/?$/, routeLoaders.AdminDashboard],
  [/^\/admin\/dashboard\/?$/, routeLoaders.AdminDashboard],
  [/^\/admin\/users\/?$/, routeLoaders.AdminUsers],
  [/^\/admin\/groups\/?$/, routeLoaders.AdminGroups],
  [/^\/admin\/products\/?$/, routeLoaders.AdminProducts],
  [/^\/admin\/wallet\/?$/, routeLoaders.AdminWallet],
  [/^\/admin\/(?:user-transactions|users\/[^/]+\/transactions)\/?$/, routeLoaders.AdminWallet],
  [/^\/admin\/referrals\/?$/, routeLoaders.AdminReferrals],
  [/^\/admin\/(?:payments|topups)\/?$/, routeLoaders.AdminPayments],
  [/^\/admin\/orders\/?$/, routeLoaders.AdminOrders],
  [/^\/admin\/supervisors\/[^/]+\/monitoring\/?$/, routeLoaders.SupervisorMonitoring],
  [/^\/admin\/supervisor-monitoring\/?$/, routeLoaders.SupervisorMonitoring],
  [/^\/admin\/supervisors\/?$/, routeLoaders.AdminSupervisors],
  [/^\/admin\/payment-methods\/?$/, routeLoaders.AdminPaymentMethods],
  [/^\/admin\/whatsapp\/?$/, routeLoaders.WhatsAppSettings],
  [/^\/admin\/currencies\/?$/, routeLoaders.AdminCurrencies],
  [/^\/admin\/suppliers\/?$/, routeLoaders.AdminSuppliers],
  [/^\/admin\/target-requests\/?$/, routeLoaders.AdminTargetRequests],
];

const resolvedModules = new Map();

const normalizePath = (pathname) => {
  const value = String(pathname || '/').replace(/\/+$/, '');
  return value || '/';
};

const loadOnce = (loader) => {
  if (!loader) return Promise.resolve();

  if (!resolvedModules.has(loader)) {
    resolvedModules.set(loader, loader().catch((error) => {
      resolvedModules.delete(loader);
      throw error;
    }));
  }

  return resolvedModules.get(loader);
};

export const preloadRoute = async (pathname) => {
  const normalizedPath = normalizePath(pathname);
  const matchedLoader = routeMatchers.find(([matcher]) => matcher.test(normalizedPath))?.[1]
    || routeLoaders.Auth;
  const loaders = [
    publicPaths.has(normalizedPath) ? null : routeLoaders.Layout,
    matchedLoader,
  ].filter(Boolean);

  await Promise.allSettled(loaders.map(loadOnce));
};
