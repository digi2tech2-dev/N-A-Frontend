# N&A HUB Frontend

React/Vite web frontend and Capacitor Android remote-shell experience for N&A HUB. It provides the customer store, wallet and deposit flows, target orders, and administration panels. This document describes the current implementation in this repository; the source code and configuration files are the source of truth.

> **Clone-migration note:** Some package metadata, browser-storage keys, mock fixtures, Barba transition symbols, referral fallback URLs, and WhatsApp fallbacks still contain former-product names. They are implementation leftovers, not N&A HUB branding or deployment configuration. Replace or migrate them deliberately; do not depend on inherited domains, phone numbers, keys, OAuth settings, or other third-party resources.

## Application Overview

N&A HUB is a storefront and account portal for buying digital products and services with an internal wallet balance. The frontend supports:

- Public browsing of the catalog, About, contact, creator, auth, and account-state pages.
- Customer registration, email-verification gating, login, Google OAuth callback handling, two-factor login, account settings, product purchases, wallet deposits, deposit history, order history, target requests, referral sharing, notifications, and WhatsApp contact actions.
- Admin dashboards for users, wallets, deposits, payment methods, products, categories, groups, currencies, providers/suppliers, orders, target requests, referrals, WhatsApp status, supervisors, and monitoring.
- Supervisor-style roles (`supervisor`, `manager`, `moderator`) that can access selected admin pages only when their permission array allows it.

The frontend can run against either an in-memory mock adapter or the real backend API. Mock mode is the default. Real mode expects a backend whose API routes are mounted under `/api`, with uploaded files served from `/uploads`.

## Backend, Mobile, And Release Integration Status

The repository contains the UI and adapter layer, but the inspected frontend/backend combination is **not release-ready** without resolving the gaps below. The full cross-project findings are in [`../PROJECT_INTEGRATION_AUDIT.md`](../PROJECT_INTEGRATION_AUDIT.md).

- Set `VITE_DATA_PROVIDER=real` for every real integration build. An unset or unrecognized value selects the in-memory mock adapter, so a production-looking UI can otherwise run without backend persistence.
- Set `VITE_API_BASE_URL` to the HTTPS backend URL ending in `/api`. This base URL is embedded at Vite build time and is also used to derive the `/uploads` origin.
- The frontend attempts `POST /auth/refresh`, but that route was not present in the inspected backend. The current backend issues an access token only, so an expiry/401 can force logout rather than silently refreshing a session.
- Backend notification endpoints exist, but the real frontend adapter does not yet implement inbox listing, unread counts, or read actions. It only wires the admin send operation.
- The frontend sends target-request status updates, but the inspected backend did not expose matching pending-transition routes. The target approval/rejection lifecycle must be aligned before release.
- The backend's Vodafone Cash SMS bridge (`POST /api/payment-events/vodafone-cash`) is an HMAC-protected server-to-server webhook. The browser must not call it or contain its signing secret; it can only reflect deposit status after the normal deposit APIs report it.
- There is no Socket.IO or other realtime transport in the frontend. Notifications, order/deposit/target status, and wallet data update through requests, refreshes, and polling rather than push synchronization.
- Android ships as a Capacitor shell loading `https://na-hub.online`, not the local `dist/` bundle. The site, backend CORS, OAuth redirects, uploaded-file URLs, and Android app-link host must all be deployed and compatible before an APK can function.

Release blockers are therefore: real-adapter configuration, an agreed token lifecycle, notification integration, target-state contract alignment, deployment CORS/origin checks, and Android host/app-link readiness.

## Technology Stack

The package versions below come from `package.json`.

| Area | Implementation |
| --- | --- |
| App runtime | React `^19.0.0`, React DOM `^19.0.0` |
| Bundler/dev server | Vite `^6.2.0`, `@vitejs/plugin-react` `^5.0.4` |
| Routing | `react-router-dom` `^7.13.1` |
| Styling | Tailwind CSS `^4.1.14`, `@tailwindcss/vite`, global CSS variables in `src/theme/tokens.css` |
| State | Zustand `^5.0.11`; stores are manually persisted where needed |
| API | Axios `^1.13.6`, real adapter in `src/services/realApi.js`, mock adapter in `src/services/mockApi.js` |
| Android shell | Capacitor `^8.5.0` with App, Browser, Camera, Geolocation, Local/Push Notifications, and Status Bar plugins |
| Localization | i18next `^25.8.14`, react-i18next `^16.5.6`, i18next browser detector |
| Animation | Framer Motion `^12.35.0`, Barba installed but not part of the main route setup |
| Icons | `lucide-react` `^0.546.0` |
| Utilities | `clsx`, `tailwind-merge` |
| Build-time tooling | TypeScript `~5.8.2` for `tsc --noEmit`; `sharp` and `to-ico` for favicon generation |

There is no test runner script in `package.json`. The `lint` script is a TypeScript check, not ESLint.

## Project Structure

Generated folders such as `node_modules` and `dist` are intentionally omitted.

```text
.
|-- .env.example                  # Safe example variables for local/mock/real modes
|-- capacitor.config.ts           # N&A HUB Android remote-shell configuration
|-- CAPACITOR_ANDROID.md          # Android build, signing, app-link, and release notes
|-- index.html                    # Root HTML, boot loader, default RTL/dark classes, favicon links
|-- package.json                  # Scripts and dependency versions
|-- package-lock.json             # npm lockfile
|-- public/
|   |-- _redirects                # Netlify-style SPA fallback: /* /index.html 200
|   `-- favicon/app icon files
|-- scripts/
|   |-- android-gradle.mjs        # Runs Gradle assemble tasks for debug/release APKs
|   |-- generate-android-icons.mjs # Generates Android launcher/notification icons
|   `-- generate-favicons.mjs     # Generates favicon assets from src/assets/logo.PNG
|-- capacitor-shell/              # Minimal offline fallback; not the React production bundle
|-- android/                      # Capacitor-generated native Android project and app-link example
|-- src/
|   |-- main.jsx                  # React entry point, i18n import, volatile cleanup, extension-error suppression
|   |-- App.jsx                   # Providers, session bootstrap, route tree, guards, redirects
|   |-- i18n.js                   # i18next setup for Arabic and English
|   |-- index.css                 # Tailwind v4 import, global styles, animations, responsive rules
|   |-- assets/                   # Logo, slides, target/product/contact images
|   |-- components/               # Layout, auth, admin, wallet, products, orders, UI, providers, etc.
|   |-- context/                  # ThemeContext and LanguageContext
|   |-- data/                     # Mock data, country/currency data, legacy translations
|   |-- hooks/                    # Shared hooks
|   |-- locales/
|   |   |-- ar/common.json        # Arabic translations
|   |   `-- en/common.json        # English translations
|   |-- pages/                    # Customer/public pages and admin pages
|   |-- native/capacitorBridge.js # Native back-navigation and Capacitor integrations
|   |-- services/
|   |   |-- client.js             # Provider-selecting API facade
|   |   |-- mockApi.js            # In-memory mock implementation
|   |   `-- realApi.js            # Axios backend adapter and normalizers
|   |-- store/                    # Zustand stores
|   |-- theme/tokens.css          # Light/dark design tokens
|   |-- transitions/              # Page transition and lazy route module registry
|   `-- utils/                    # Auth roles, permissions, account statuses, formatting, URLs, SEO, WhatsApp
|-- tsconfig.json                 # TypeScript check settings
`-- vite.config.js                # Vite plugins, aliases, manual chunks, HMR flag
```

Related documentation files in this repository:

- `FINANCIAL_SNAPSHOT_SYSTEM.md`
- `BALANCE_CALCULATION_TEST.md`

Backend documentation is not inside this frontend root. A sibling backend project was present during this audit under `../Backend`, with docs such as `../Backend/docs/api-reference.md`, `../Backend/docs/admin-panel.md`, `../Backend/docs/user-panel.md`, and `../Backend/docs/wallet-system.md`.

## Application Initialization

Startup begins in `src/main.jsx`.

1. Global CSS and `src/i18n.js` are imported before rendering.
2. Browser console handling suppresses known external browser-extension permission errors. This does not suppress normal application errors.
3. `cleanupVolatileAppStorage()` runs. It is currently a no-op and intentionally keeps persisted auth state.
4. React mounts `<App />` into `#root` inside `React.StrictMode`.
5. The boot loader defined in `index.html` is removed after React renders.

`src/App.jsx` sets up the app shell:

- `ThemeProvider` reads/writes the legacy `localStorage["kanz-coins-theme"]` key and applies `.dark` plus `data-theme`.
- `LanguageProvider` synchronizes i18next, `document.documentElement.lang`, and `dir`.
- `ToastProvider` provides toast notifications.
- `SessionBootstrap` restores and refreshes authenticated state, loads initial products/settings, refreshes profile on focus/visibility/online/interval, and listens for forced logout events.
- `BrowserRouter` owns all routes.
- `PageTransition` wraps route rendering.
- `FloatingWhatsApp` is available globally.

There is a route-level `RouteErrorBoundary`. There is no top-level React error boundary around all providers.

## Local Setup

Prerequisites:

- Node.js compatible with Vite 6 and React 19.
- npm, using the committed `package-lock.json`.
- A backend server only when running in real mode.

Install dependencies:

```powershell
npm install
```

Create local environment settings:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux equivalent:

```sh
cp .env.example .env.local
```

Run with mock data:

```env
VITE_DATA_PROVIDER=mock
```

```powershell
npm run dev
```

Run against the backend:

```env
VITE_DATA_PROVIDER=real
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the backend first, then run:

```powershell
npm run dev
```

The npm `dev` script starts Vite with `--port=3000 --host=0.0.0.0`. The Vite config itself declares port `5173`, but the script override wins for normal development.

To clear persisted frontend state in the browser, remove these keys as needed:

- `auth-storage`
- `auth:logout-reason`
- `kanz-coins-theme`
- `kanz-coins:categories-cache:v1`
- `kanz-coins:currencies-cache:v1`
- `kanz-coins:groups-cache:v1`
- referral-related localStorage keys documented in the referral section

The `kanz-coins-*` names above are legacy storage-key identifiers retained for backward compatibility. They are not the N&A HUB product name.

## Environment Variables

Vite only exposes variables prefixed with `VITE_` to browser code through `import.meta.env`. Anything prefixed with `VITE_` is public and can be inspected in the browser bundle. Do not place private API keys or secrets in frontend variables.

| Variable | Required | Default in code | Feature | Example | Notes/security |
| --- | --- | --- | --- | --- | --- |
| `VITE_DATA_PROVIDER` | Required for real/release builds | `mock` | Selects API provider | `real` | Only `real` enables the Axios adapter. Any other value behaves like mock mode. |
| `VITE_API_BASE_URL` | Required for real/release builds | `http://localhost:5000/api` | Backend API base URL and upload origin resolution | `https://api.example.com/api` | Include `/api` for this backend. `src/utils/imageUrl.js` strips a trailing `/api` to resolve `/uploads`; use HTTPS in release builds. |
| `VITE_PUBLIC_APP_URL` | Optional | hardcoded public-site fallback in source | Referral share links | `https://app.example.com` | Public URL only. Prefer setting this explicitly. |
| `VITE_SITE_URL` | Optional | none | SEO canonical URL | `https://app.example.com` | Used before `VITE_PUBLIC_SITE_URL`. |
| `VITE_PUBLIC_SITE_URL` | Optional | none | SEO canonical URL fallback | `https://app.example.com` | Public URL only. |
| `VITE_ADMIN_WHATSAPP_NUMBER` | Optional | hardcoded source fallback exists | WhatsApp support links | `01063068074` | Use a safe public support number. The repository still contains hardcoded phone/link fallbacks. |
| `VITE_APP_ENV` | Optional/stale | none | Legacy define in Vite config | `development` | No current application feature reads it directly. |
| `VITE_APP_MODE` | Optional/stale | none | Legacy/example value | `development` | No source-code usage found. |
| `APP_URL` | Not available to browser code | none | External hosting systems only | `http://localhost:3000` | Not read by current frontend source. Use `VITE_PUBLIC_APP_URL` for browser code. |
| `ADMIN_WHATSAPP_NUMBER` | Ineffective in current client code | none | Legacy WhatsApp fallback attempt | empty | `import.meta.env.ADMIN_WHATSAPP_NUMBER` is not exposed by Vite by default. Use `VITE_ADMIN_WHATSAPP_NUMBER`. |
| `DISABLE_HMR` | Shell-only optional | `false` behavior | Vite dev-server HMR | `$env:DISABLE_HMR="true"` | Read from `process.env` in `vite.config.js`, not from client code. |

## Scripts

| Script | Command | Purpose and notes |
| --- | --- | --- |
| `npm run dev` | `vite --port=3000 --host=0.0.0.0` | Starts the development server on port 3000 and listens on all interfaces. |
| `npm run build` | `vite build` | Creates the production static build in `dist/`. |
| `npm run preview` | `vite preview` | Serves the already-built `dist/` output with Vite preview. |
| `npm run cap:add:android` | `cap add android` | Creates the Capacitor Android project when it is not already present. Do not run it over a customized native project without reviewing the result. |
| `npm run cap:sync` | `cap sync android` | Synchronizes Capacitor configuration and the small fallback shell to Android. It does **not** copy the React build because this app loads a remote site. |
| `npm run cap:open` | `cap open android` | Opens the Android project in Android Studio. |
| `npm run android:apk:debug` | `node scripts/android-gradle.mjs assembleDebug` | Builds the debug APK through the Android Gradle wrapper. |
| `npm run android:apk:release` | `node scripts/android-gradle.mjs assembleRelease` | Builds the unsigned/locally signed release variant according to the native Gradle signing configuration. |
| `npm run generate:android-icons` | `node scripts/generate-android-icons.mjs` | Generates Android launcher and notification icon assets from the N&A HUB logo. |
| `npm run generate:favicons` | `node scripts/generate-favicons.mjs` | Generates favicon and app icon assets from `src/assets/logo.PNG`; requires `sharp` and `to-ico`. |
| `npm run clean` | `rm -rf dist` | Removes `dist` on Unix-like shells. This can fail in Windows PowerShell because `rm -rf` is not portable there. |
| `npm run lint` | `tsc --noEmit` | Runs TypeScript checking only. There is no ESLint config or ESLint command in this repository. |

There is no `test` script.

## Routing

All routes are declared in `src/App.jsx`. Lazy route imports are registered in `src/transitions/routeModules.js`. Guard behavior comes from `ProtectedRoute` plus role/permission helpers in `src/utils/authRoles.js`, `src/utils/permissions.js`, and `src/utils/accountStatus.js`.

### Public Routes

| Path | Component | Access | Behavior |
| --- | --- | --- | --- |
| `/`, `/welcome`, `/onboarding` | `OnboardingRoute` | Public | Shows onboarding to signed-out users; signed-in users are sent to their account-state/default role route. |
| `/auth` | `Auth` | Public | Login/signup page. Query `mode=signup` starts registration. |
| `/login` | `Auth` | Public | Login alias. |
| `/email-verified` | `EmailVerified` | Public | Email-verification result page after backend redirect. |
| `/auth/account-pending` | `AccountPending` | Public/account-state | Pending approval state. |
| `/auth/account-rejected` | `AccountRejected` | Public/account-state | Rejected/blocked account state. |
| `/auth/verify-email` | `AccountVerificationRequired` | Public/account-state | Email verification required state. |

### Public Redirects

| Path | Redirect |
| --- | --- |
| `/account-pending` | `/auth/account-pending` |
| `/account-rejected` | `/auth/account-rejected` |
| `*` | `/login` |

### Shared Authenticated Routes

These routes require a valid authenticated user with an approved account status. They accept roles `customer`, `admin`, `supervisor`, `manager`, and `moderator` unless noted.

| Path | Component | Role/permission | Notes |
| --- | --- | --- | --- |
| `/dashboard` | `Dashboard` | Shared roles | Main authenticated landing page for customers and supervisors. Admins can access it, but their default route is `/admin/dashboard`. |
| `/orders` | `Orders` | Shared roles | Order list/history. |
| `/orders/:orderId` | `Orders` | Shared roles | Opens or focuses a specific order. |
| `/products` | `Products` | Shared roles | Authenticated product catalog. |
| `/products/:productId` | `ProductPurchasePage` | Shared roles | Product purchase page. |
| `/purchase/:productId` | `ProductPurchasePage` | Shared roles | Purchase alias. |
| `/settings` | `Settings` | Shared roles | Settings page. |
| `/developers/api` | `DeveloperApi` | Shared roles | Route is protected by role only. Sidebar shows it only when `user.isApiEnabled === true`. |
| `/account` | `Account` | Shared roles | Profile/account details. |
| `/account/security` | `AccountSecurity` | Shared roles | Security and 2FA management. |
| `/account-security` | `AccountSecurity` | Shared roles | Security alias. |
| `/contact-us` | `ContactUs` | Shared roles | Authenticated contact page. |
| `/buy-target` | `BuyTarget` | Shared roles | Target-request purchase UI. Sidebar primarily exposes it for customers. |
| `/target-orders` | `TargetOrders` | Shared roles | Target-order history. |
| `/wallet/add-balance` | `AddBalance` | Shared roles | Deposit amount and payment-method selection. |
| `/wallet/topups` | `WalletTopupHistory` | Shared roles | Deposit/top-up history. |
| `/wallet/topup-history` | `WalletTopupHistory` | Shared roles | Deposit history alias. |
| `/wallet/payment-details/:methodId` | `PaymentDetails` | Shared roles | Deposit proof and payment details form. |

### Customer-Only Routes

| Path | Component | Requirement | Notes |
| --- | --- | --- | --- |
| `/referral` | `Referral` | `customer` | Local/demo referral and withdrawal UI. |

### Authenticated Redirects

| Path | Redirect |
| --- | --- |
| `/wallet` | `/wallet/add-balance` |

### Admin And Supervisor Routes

Admin panel roles are `admin`, `super_admin`, `supervisor`, `manager`, and `moderator`. Permission checks apply where listed. Admin roles bypass permission checks.

| Path | Component | Role/permission | Redirect behavior |
| --- | --- | --- | --- |
| `/admin` | `AdminPanelDefaultRoute` | Admin panel roles | Admins go to `/admin/dashboard`; supervisor-style roles go to `/dashboard`. |
| `/manager/dashboard` | Redirect component | Admin panel roles | Same as `/admin` default route. |
| `/supervisor/dashboard` | Redirect component | Admin panel roles | Same as `/admin` default route. |
| `/admin/dashboard` | `AdminDashboardRoute` / `AdminDashboard` | Admin panel roles | Supervisor-style roles are redirected to `/dashboard`; admin roles see the admin dashboard. |
| `/admin/users` | `AdminUsers` | `VIEW_USERS` | User management and account approval flows. |
| `/admin/groups` | `AdminGroups` | `MANAGE_GROUPS` | Customer group management. |
| `/admin/products` | `AdminProducts` | `MANAGE_PRODUCTS` | Product and category management. |
| `/admin/wallet` | `AdminWallet` | `VIEW_WALLET` | Wallet listing, adjustments, and user transactions. |
| `/admin/referrals` | `AdminReferrals` | Admin panel role only | Local/demo referral administration. |
| `/admin/payments` | `AdminPayments` | `MANAGE_DEPOSITS` | Deposit review. |
| `/admin/orders` | `AdminOrders` | `MANAGE_ORDERS` | Order management. |
| `/admin/supervisors` | `AdminSupervisors` | Intended supervisor-admin permission | The route references `PERMISSIONS.ADMIN_SUPERVISORS`, which is not defined. Because an undefined permission is treated as no permission requirement, this route is effectively role-protected in code. |
| `/admin/supervisors/:supervisorId/monitoring` | `SupervisorMonitoring` | Intended supervisor-admin permission | Same undefined-permission issue as above. |
| `/admin/supervisor-monitoring` | `SupervisorMonitoring` | Admin roles only | Monitoring alias restricted to `admin` and `super_admin`. |
| `/admin/payment-methods` | `AdminPaymentMethods` | `MANAGE_PAYMENT_METHODS` | Dynamic payment method settings. |
| `/admin/whatsapp` | `WhatsAppSettings` | `MANAGE_SETTINGS` | Backend WhatsApp client status/reconnect/reset UI. |
| `/admin/currencies` | `AdminCurrencies` | `MANAGE_CURRENCIES` | Currency settings. |
| `/admin/suppliers` | `AdminSuppliers` | `MANAGE_SUPPLIERS` | Provider/supplier management and catalog sync. |
| `/admin/target-requests` | `AdminTargetRequests` | `MANAGE_TARGETS` | Target app and target request management. |

Admin redirects:

| Path | Redirect |
| --- | --- |
| `/admin/user-transactions` | `/admin/wallet` |
| `/admin/users/:userId/transactions` | `/admin/wallet` |
| `/admin/topups` | `/admin/payments` |

## Route Guard Behavior

`ProtectedRoute` enforces authentication, account status, roles, and permissions.

- Unauthenticated users are sent to `/auth`, unless persisted blocked-account state points to an account-state route.
- Authenticated users whose account status is not approved are sent to `/auth/verify-email`, `/auth/account-pending`, or `/auth/account-rejected`.
- Role failures redirect to `getDefaultRouteForRole(user.role)`, usually `/dashboard` for customers/supervisors and `/admin/dashboard` for admins.
- Permission failures redirect to the same default route when possible; otherwise an Arabic access-denied fallback is rendered.
- A missing or undefined permission value is treated as no permission requirement. This is important for the undefined `PERMISSIONS.ADMIN_SUPERVISORS` route usage.

Approved account aliases are `active`, `approved`, `complete`, and `completed`. Pending aliases include `pending`, `requested`, `under_review`, and `awaiting_approval`. Rejected aliases include `rejected`, `denied`, `blocked`, and `inactive`. Verification-required aliases include `verification_required`, `email_verification_required`, `verify_email`, `verification`, and `unverified`.

## Authentication

Authentication state is owned by `src/store/useAuthStore.js` and the real backend adapter in `src/services/realApi.js`.

### Login

- `Auth.jsx` calls `useAuthStore.login(email, password)`.
- The real adapter posts to `/auth/login`.
- If the backend indicates `requires2FA` or `requiresTwoFactor`, the UI asks for a 6-digit code and then calls `/auth/verify-2fa`.
- On success, the store persists user/session state in localStorage key `auth-storage`.
- The login form has a remember-me checkbox, but current token persistence does not depend on it.

### Registration

- Registration is a two-step UI: name/email/password, then country/currency/referral code.
- Real mode posts to `/auth/register`.
- The UI handles email-verification-required, pending, rejected, and approved-like responses through account-state redirects.
- A referral code can be prefilled from `?ref=...`.

### Email Verification

- The backend owns `GET /api/auth/verify-email?token=...`.
- The frontend has `/email-verified` for redirect results and `/auth/verify-email` for users who must verify.
- The verification-required page can call `/auth/resend-verification`.

### Google OAuth

- `apiClient.auth.loginWithGoogle()` redirects the browser to `${VITE_API_BASE_URL}/auth/google`.
- The backend callback is expected to return users to the frontend with query parameters such as `token` and account-state information.
- If a Google signup needs missing profile fields, `Auth.jsx` asks for country/currency/referral data and updates the profile.
- Google signup intent is temporarily tracked in `sessionStorage["auth:google-signup-intent"]`.

### Two-Factor Authentication

- Login 2FA uses `/auth/verify-2fa`.
- Account-security 2FA setup uses `/auth/2fa/generate`, `/auth/2fa/enable`, and `/auth/2fa/disable`.
- The security UI prevents enabling 2FA while an email-change confirmation is pending.

### Tokens And Persistence

- `auth-storage` contains the persisted user, access token, auth flag, blocked account state, and profile timestamp.
- The real adapter also stores `refreshToken` in the same persisted state when the backend returns one.
- Axios request interceptors read `auth-storage` and attach `Authorization: Bearer <token>`.
- Access and refresh tokens are in localStorage, so XSS can steal them.

### Refresh And Expiry

- The Axios response interceptor retries auth failures once when a refresh token exists.
- Refresh calls `POST /auth/refresh` with `{ refreshToken }`.
- Concurrent requests wait behind a single refresh attempt.
- Login, register, Google, 2FA, and refresh endpoints skip forced-logout handling.
- If refresh is unsupported or fails, the adapter clears `auth-storage`, writes `auth:logout-reason = "expired"`, and dispatches `auth:force-logout`.
- `SessionBootstrap` listens for `auth:force-logout` and calls the auth-store logout action.

### Logout

- Logout resets auth state and removes `auth-storage`.
- The real adapter's logout method clears local state only; no backend logout endpoint is called.

## Roles And Permissions

Role helpers live in `src/utils/authRoles.js`.

| Role | Behavior |
| --- | --- |
| `customer` | Standard authenticated customer. Default route: `/dashboard`. |
| `admin` | Full admin role. Default route: `/admin/dashboard`. Bypasses permission checks. |
| `super_admin` | Treated as an admin role. Default route: `/admin/dashboard`. Bypasses permission checks. |
| `supervisor` | Supervisor-style admin-panel role. Default route: `/dashboard`. Requires permission array for admin pages. |
| `manager` | Supervisor-style alias. Default route: `/dashboard`. |
| `moderator` | Supervisor-style alias. Default route: `/dashboard`. |

Permission constants currently defined in `src/utils/permissions.js`:

```text
VIEW_ADMIN_DASHBOARD
VIEW_WALLET
MANAGE_WALLET
VIEW_USERS
MANAGE_USERS
CONFIRM_ACCOUNTS
MANAGE_GROUPS
MANAGE_PRODUCTS
MANAGE_ORDERS
CONFIRM_ORDERS
MANAGE_SUPPLIERS
MANAGE_DEPOSITS
MANAGE_PAYMENT_METHODS
MANAGE_CURRENCIES
MANAGE_SETTINGS
MANAGE_TARGETS
CONFIRM_TARGET_REQUESTS
VIEW_CUSTOMERS
VIEW_ACTIVITY_LOGS
```

Legacy aliases are normalized for older role/permission strings. Sidebar navigation is filtered by role and permission. Components also use `hasPermission()` for conditional actions such as approving accounts, confirming orders, managing deposits, and confirming target requests.

Current mismatch: `App.jsx` references `PERMISSIONS.ADMIN_SUPERVISORS`, but that constant is not defined. Because `hasPermission(user, undefined)` returns `true`, the route guard does not enforce a real supervisor-management permission for `/admin/supervisors` and `/admin/supervisors/:supervisorId/monitoring`.

## State Management

All stores are Zustand stores under `src/store`.

| Store | Purpose | Persistence/cache | Main API dependencies |
| --- | --- | --- | --- |
| `useAuthStore` | Login, signup, Google OAuth, 2FA, profile refresh, account status, logout | Persists to `localStorage["auth-storage"]`; uses `auth:logout-reason` for expired-token messaging | `auth`, `users.getProfile`, `users.updateProfile` |
| `useAdminStore` | Users, deleted users, wallets, user transactions, admin activity feed | No durable store persistence; page/cache TTLs in memory | `users`, `adminWallets`, `auth.register`, `auth.resendVerification` |
| `useMediaStore` | Products and categories | Real mode keeps category cache in `sessionStorage["kanz-coins:categories-cache:v1"]`; products are not persisted in real mode | `products`, `categories`, provider product helpers |
| `useOrderStore` | Customer/admin orders and order-status changes | No durable persistence; 15-second real-mode cache TTL and fetched scopes | `orders`, `products`, `system.currencies`, notifications, auth |
| `useTopupStore` | Deposits/top-ups, approval/rejection, summaries | No durable persistence; 15-second real-mode cache TTL | `topups`, notifications, auth, admin wallets |
| `useTargetStore` | Target apps and target purchase requests | No durable persistence | `targetApps`, `targetPurchases` |
| `useSystemStore` | Currencies and payment settings | Currencies cache in `sessionStorage["kanz-coins:currencies-cache:v1"]`; payment settings are polled | `system.currencies`, `system.paymentSettings`, `settings` |
| `useGroupStore` | Customer groups | Real mode cache in `sessionStorage["kanz-coins:groups-cache:v1"]` | `groups` |
| `useNotificationStore` | Toast/in-app notifications and unread count | No durable persistence; caps in-memory list at 30 | `notifications` where implemented |

Cross-store behavior is common:

- Auth refreshes profile after wallet, order, user, or profile changes.
- Admin wallet/user actions can add notifications.
- Product/order/top-up stores reload related data after changes.
- System payment settings publish a `BroadcastChannel("payment-settings-updates")` event after save.

## API Architecture

`src/services/client.js` exports the app-wide `apiClient` facade.

- `VITE_DATA_PROVIDER=real` lazily imports `src/services/realApi.js`.
- Any other value, including an unset variable, uses `src/services/mockApi.js`.
- The facade is a proxy, so calls like `apiClient.products.list()` are routed to the selected provider.

### Real API Adapter

`src/services/realApi.js` creates an Axios instance with:

- `baseURL = VITE_API_BASE_URL || "http://localhost:5000/api"`.
- Timeout of 180 seconds.
- Bearer token injection from `auth-storage`.
- Refresh-token retry logic on auth failures.
- Normalization helpers for common backend envelopes such as `{ success, message, data }`.
- Entity normalization for users, products, categories, orders, deposits, currencies, groups, providers, target apps, and target purchases.
- FormData handling for uploads, deposits, target requests, and product/category/payment images.
- Upload URL handling through relative `/uploads/...` paths and `src/utils/imageUrl.js`.

The adapter has many compatibility fallbacks. For example, some product/category/public catalog calls try several possible backend paths before failing. These fallbacks are useful during backend transitions, but they also mean a successful UI call may not identify a single canonical backend route.

### Mock API Adapter

`src/services/mockApi.js` uses in-memory data seeded from `src/data/mockData.js` and simulates latency. Mock mode is intended for frontend development and demos. It is not a complete backend substitute:

- Most data is held in memory and resets on reload.
- Auth state persists through `auth-storage`.
- Referral administration uses browser localStorage rather than backend APIs.
- Notification APIs are largely local/no-op.
- Provider/supplier behavior is simulated.
- Mock response shapes are normalized to resemble real mode, but feature parity is not guaranteed.

## Backend Integration Map

The frontend references these endpoint groups in real mode. Paths below are relative to `VITE_API_BASE_URL`, which should include `/api`.

| Feature | Frontend area | Backend paths used | Auth |
| --- | --- | --- | --- |
| Auth | `auth` adapter, `Auth.jsx`, account security | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/verify-2fa`, `POST /auth/2fa/generate`, `POST /auth/2fa/enable`, `POST /auth/2fa/disable` | Mixed public/authenticated |
| Profile/me | Auth store, account, developer API | `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/avatar`, `POST /me/api-token/generate`, `PUT /me/api-settings`, `POST /me/upload/order-field-image` | Authenticated |
| Public catalog | `PublicCatalog`, media store | `/public/catalog`, `/storefront/catalog`, `/catalog`, `/public/products`, `/storefront/products`, `/products`, `/public/categories`, `/storefront/categories`, `/categories` | Public where backend supports it |
| Products | Product pages, admin products, purchase dialog | `/products`, `/products/:id`, `/me/products/:id`, `/products/:id/verify-field`, `/admin/products`, `/admin/products/:id`, `/admin/products/from-provider`, `/providers/products/publish`, `/products/publish`, `/products/:id/toggle`, `/admin/products/:id/toggle` | Public/auth/admin depending path |
| Categories | Product/admin category UI | `/categories`, `/public/categories`, `/storefront/categories`, `/me/categories`, `/admin/categories`, `/admin/categories/:id`, `/admin/categories/:id/toggle` | Public/auth/admin depending path |
| Providers/suppliers | `AdminSuppliers`, admin products | `/admin/providers`, `/admin/providers/:id`, `/admin/providers/:id/toggle`, `/admin/providers/:id/test-connection`, `/admin/catalog/sync/:id`, `/admin/providers/:id/balance`, `/admin/providers/:id/products`, `/admin/providers/:id/check-order` | Admin/supervisor permission |
| Orders | Product purchase, order history, admin orders | `/orders`, `/me/orders`, `/me/orders/:id`, `/orders/:id`, `/orders/my/:id`, `/admin/orders`, `/admin/orders/:id`, `/admin/orders/:id/status`, `/admin/orders/:id/sync-status` | Authenticated/admin |
| Wallet | Dashboard/wallet/admin wallet | `/wallet/stats`, `/wallet/transactions`, `/admin/wallets`, `/admin/wallets/:userId`, `/admin/wallets/:userId/transactions`, `/admin/wallets/:userId/add`, `/admin/wallets/:userId/deduct`, `/admin/wallets/:userId/set` | Authenticated/admin |
| Deposits/top-ups | Add balance, payment details, top-up history, admin payments | `/me/deposits`, `/me/deposits/:id`, `/admin/deposits`, `/admin/deposits/:id`, `/admin/deposits/:id/approve`, `/admin/deposits/:id/reject`, `/admin/deposits/:id/review`, `/admin/deposits/:id` | Authenticated/admin |
| Vodafone Cash SMS events | Backend payment-event bridge | `POST /payment-events/vodafone-cash` | **Server-to-server HMAC webhook only; not called by the frontend** |
| Payment methods/settings | Add balance, payment details, admin settings | `/settings/payment`, `/admin/settings`, `/admin/settings/:key` | Public/auth/admin depending backend |
| Notifications | Notification store, admin send | `/me/notifications`, `/me/notifications/unread-count`, `/me/notifications/:id/read`, `/me/notifications/read-all`, `/admin/notifications`, `/admin/notifications/send` | Authenticated/admin |
| Target apps/orders | Buy Target, target history, admin target requests | `/me/targets/apps`, `/me/targets`, `/admin/target-apps`, `/admin/target-apps/:id`, `/admin/targets`, `/admin/targets/:id/approve`, `/admin/targets/:id/reject`, `/admin/targets/:id/status` | Authenticated/admin |
| Users | Admin users/supervisors | `/admin/users`, `/admin/users/deleted`, `/admin/users/:id`, `/admin/users/:id/approve`, `/admin/users/:id/reject`, `/admin/users/:id/restore`, `/admin/users/:id/role`, `/admin/users/:id/permissions`, `/admin/users/:id/credit-limit`, `/admin/users/:id/currency`, `/admin/users/:id/reset-password`, `/admin/users/:id/avatar` | Admin/supervisor permission |
| Groups | Group store/admin groups | `/groups`, `/admin/groups`, `/admin/groups/:id` | Auth/admin |
| Currencies | System store/admin currencies | `/currencies/active`, `/admin/currencies`, `/admin/currencies/:code` | Public/admin |
| Uploads | Product/category/payment images | `POST /upload/:category` | Authenticated admin; backend supports `products`, `categories`, `payments` |
| WhatsApp backend client | Admin WhatsApp page | `/admin/whatsapp/status`, `/admin/whatsapp/reconnect`, `/admin/whatsapp/reset` | Admin settings permission |
| Dashboard/audit | Admin dashboard/activity | `/admin/dashboard/stats`, `/admin/audit`, `/admin/audit/actor/:actorId` | Admin/supervisor permission |

Confirmed backend alignment from the sibling backend:

- The backend mounts core routes under `/api`, and serves static uploads from `/uploads`.
- `POST /api/auth/refresh` was not found in the inspected backend auth route listings, even though the frontend tries it. If the running backend does not implement it, expired access tokens will force logout.
- The backend exposes `/api/me/notifications` endpoints, while the current real frontend notification adapter returns `null` for list/unread/read and only implements admin send. This is an unused/missing frontend integration.
- Backend admin wallet routes require `MANAGE_WALLET`, while the frontend route guard for `/admin/wallet` uses `VIEW_WALLET`. Supervisors with only `VIEW_WALLET` may reach the page but fail mutation/list calls depending on backend enforcement.
- Backend upload categories for generic uploads are `products`, `categories`, and `payments`; deposit, target, avatar, and order-field uploads use their own route-specific upload handlers.

## Customer Workflows

### Registration And Login

Customers register through `/auth?mode=signup`, optionally with `?ref=CODE`. Login supports password auth, Google OAuth, and 2FA verification when required by the backend. Account status redirects prevent unapproved users from entering protected routes.

### Customer Dashboard

`/dashboard` shows wallet/profile context, product discovery, slides/assets, category filters, target-request entry points, and prompts such as 2FA setup. Products refresh on focus/visibility and periodic intervals.

### Product Browsing And Purchase

Authenticated catalog routes are `/products`, `/products/:productId`, and `/purchase/:productId`.

The purchase dialog:

- Loads the selected product from `useMediaStore`.
- Resolves dynamic order fields from product configuration.
- Supports text, number, email, select, image, and file-style order fields.
- Enforces required fields and quantity min/max/step rules.
- Uses provider-aware field verification through `POST /products/:id/verify-field` when a field is marked verifiable.
- Uploads order-field images to `/me/upload/order-field-image`.
- Calculates unit price, quantity total, customer group pricing, and available balance.
- Uses wallet balance plus credit limit minus used credit to decide whether the user can submit.
- Opens an embedded add-balance flow when the wallet is short.
- Sends an idempotency key with order creation.

### Orders

Customers use `/orders` and `/orders/:orderId`. The order store loads `/me/orders`, can fetch details, normalizes backend order shapes, and updates local/customer balance after successful purchases when the backend returns updated balance information.

### Wallet And Deposits

Customers add balance through:

1. `/wallet/add-balance` to enter/select amount and payment method.
2. `/wallet/payment-details/:methodId` to view receiver details, enter sender/transaction data, upload proof, and submit.
3. `/wallet/topups` or `/wallet/topup-history` to view deposit history.

The payment-details form calculates payment fees and payable amount. It supports method-specific sender fields such as wallet number, wallet address, and transaction/reference number. Deposit creation submits multipart FormData to `/me/deposits` with receipt file and payment metadata.

### Target Requests

`/buy-target` displays target apps/products. Customers submit target purchase requests with app/account data, sender/transfer fields, payment method, and screenshot proof. History is available at `/target-orders`. Admin review is handled under `/admin/target-requests`.

### Account And Security

`/account` handles profile/account information. `/account/security` and `/account-security` expose security settings, including two-factor setup/disable flows.

### Developer API

`/developers/api` lets authenticated users manage API-token/settings through `/me/api-token/generate` and `/me/api-settings`. The route itself accepts shared authenticated roles; sidebar navigation only shows it when `user.isApiEnabled === true`.

### Referral

`/referral` is customer-only. It builds referral links using `VITE_PUBLIC_APP_URL` and stores referral withdrawal/admin demo data locally. Related localStorage keys include:

- `kanzcoins_referral_withdrawal_methods`
- `kanzcoins_referral_withdrawal_requests`
- `oscar_sub_agent_requests`
- `kanzcoins_admin_referral_commission_rate`

This feature should be treated as local/demo behavior unless backend integration is added.

### Contact And WhatsApp

Contact pages and floating WhatsApp actions use `src/utils/whatsapp.js` and `VITE_ADMIN_WHATSAPP_NUMBER` when available. The code also contains hardcoded fallback phone/link values that should be reviewed before production deployment.

## Admin Workflows

Admin pages live under `src/pages/admin` and are routed under `/admin`.

- Dashboard: statistics, date ranges, recent orders, pending accounts, deposits, target requests, provider balances, activity feed, and permission-aware quick actions.
- Users: account approval/rejection, status, profile/avatar, group, role, permissions, currency, credit limit, password reset, delete/restore.
- Wallets: user wallet list, balance setting/adjustment, transaction history.
- Payments/deposits: pending deposit review, approval, rejection, and update of pending requests.
- Payment methods: dynamic payment groups/method settings used by customer deposit flows.
- Products/categories: product list, creation/update, provider products, category management, status toggles.
- Groups: customer group creation/update/delete and group-based pricing/permissions.
- Orders: order status management, rejection reasons, provider-status sync.
- Currencies: active currency list and admin currency create/update/delete.
- Providers/suppliers: provider CRUD, status toggles, connection testing, catalog sync, balance/products/order checks.
- Target requests: target app CRUD and target-order approval/rejection.
- Supervisors and monitoring: supervisor management UI and monitoring routes; route permission mismatch noted above.
- WhatsApp settings: backend WhatsApp client status, reconnect, and reset.
- Referrals: local/demo referral administration.
- Notifications: admin send endpoint is wired; user notification list integration is incomplete in the real frontend adapter.

Admin dashboard action cards use exact permission constants such as `VIEW_USERS`, `CONFIRM_ACCOUNTS`, `MANAGE_ORDERS`, `CONFIRM_ORDERS`, `MANAGE_DEPOSITS`, `MANAGE_PRODUCTS`, `MANAGE_SUPPLIERS`, `MANAGE_TARGETS`, and `CONFIRM_TARGET_REQUESTS`.

## Supervisor Experience

Supervisor-style roles are `supervisor`, `manager`, and `moderator`.

- Their default route is `/dashboard`, not `/admin/dashboard`.
- `/admin` redirects them to `/dashboard`.
- `/admin/dashboard` also redirects them to `/dashboard`.
- They may access selected `/admin/...` pages only when their role is allowed and their `permissions` array contains the required permission.
- Sidebar navigation is filtered by permissions.
- Admin roles bypass permissions; supervisor-style roles do not.

The current code has a supervisor-management permission mismatch: `/admin/supervisors` and `/admin/supervisors/:supervisorId/monitoring` reference an undefined permission constant, which weakens route-level protection.

## Forms, Product Fields, And Order Submission

Product purchase fields are derived from product metadata through product-field utilities. The UI supports:

- Dynamic field labels and translated names.
- Required and optional fields.
- Select options.
- Text, numeric, email, image, and file-like inputs.
- Provider verification for supported fields.
- Quantity constraints and quantity snapshots.
- Price calculation with customer group adjustments.
- Wallet/credit availability checks.
- Uploading file fields before order creation.
- Toasts, inline validation errors, loading states, and insufficient-balance add-balance flow.

Order submission records a financial snapshot in the order store, including original currency/amount, exchange rate at execution, converted amount, pricing snapshot, and fees snapshot where available.

## Wallet, Deposits, And Payment Methods

Wallet state is represented on the user object with normalized aliases such as `walletBalance`, `coins`, `balance`, `creditLimit`, and used credit fields. Currency data comes from `useSystemStore`.

Payment settings are dynamic:

- Customer screens read `/settings/payment`.
- Admin screens read/write `/admin/settings` and `/admin/settings/:key`.
- Payment settings include payment groups, methods, instructions, WhatsApp number, fees, fields, account destinations, image paths, and active/inactive state.
- Payment settings are polled while the app is active and refreshed by a BroadcastChannel after admin saves.

Deposits:

- Customers submit multipart proof through `/me/deposits`.
- Receipt file field is named `receipt`.
- Admins approve/reject through `/admin/deposits/:id/approve` and `/admin/deposits/:id/reject`.
- Pending deposits can be updated through `/admin/deposits/:id` where supported.
- Approval creates wallet-credit behavior on the backend; the frontend refreshes affected stores and profile data.

## Localization

Localization is configured in `src/i18n.js` and `src/context/LanguageContext.jsx`.

- Available languages: Arabic (`ar`) and English (`en`).
- Translation files: `src/locales/ar/common.json` and `src/locales/en/common.json`.
- Default language: Arabic.
- Fallback language: Arabic.
- Browser language detection checks the navigator language only.
- Language changes are applied through i18next and `LanguageContext`.
- `LanguageContext` exposes `setLanguage`, `toggleLanguage`, `language`, `isRTL`, `dir`, and a fallback-aware `t()` helper.
- Direction is intentionally forced to `rtl` for both languages to avoid layout shifts.
- There is no language localStorage persistence in the current i18next detection setup.
- Missing keys fall back to `legacy.<key>`, then `src/data/translations.js`, then the provided default value or key.

To add a language:

1. Add a new locale file under `src/locales/<lang>/common.json`.
2. Import it in `src/i18n.js`.
3. Add the language code to `supportedLngs`.
4. Update `LanguageContext` normalization and direction logic if the new language needs different behavior.
5. Add matching keys to every locale file.

## Theme And Styling

Theme behavior is implemented in `src/context/ThemeContext.jsx`, `src/theme/tokens.css`, `src/index.css`, and `index.html`.

- Supported themes: `dark` and `light`.
- Default theme: `dark`.
- Persistence key: `kanz-coins-theme`.
- Theme is applied to `document.documentElement` with `.dark` and `data-theme`.
- `index.html` includes an inline bootstrap script so the theme is applied before React loads.
- Design tokens are CSS variables in `src/theme/tokens.css`.
- Tailwind CSS v4 is imported through `@import "tailwindcss";`.
- There is no separate Tailwind config file in the repository.
- Global CSS includes responsive layout rules, animations, scrollbars, focus states, cards, buttons, skeletons, and RTL-oriented styling.
- Animation is implemented with CSS and Framer Motion components.

## Assets And URL Handling

- Main logo: `src/assets/logo.PNG`.
- Public favicons and app icons are under `public/`.
- `scripts/generate-favicons.mjs` regenerates favicon assets from the logo.
- `vite.config.js` includes uppercase `.PNG` assets with `assetsInclude`.
- `resolveImageUrl()` leaves absolute, data, and blob URLs unchanged.
- Relative upload paths are joined to the backend origin derived from `VITE_API_BASE_URL`.
- If `VITE_API_BASE_URL` is `https://api.example.com/api`, uploaded image paths resolve against `https://api.example.com/uploads/...`.
- If `VITE_API_BASE_URL` omits `/api`, upload origin calculation can point at the wrong path.

## Build And Deployment

Build:

```powershell
npm run build
```

Output folder:

```text
dist/
```

Preview the built output:

```powershell
npm run preview
```

Static hosting requirements:

- Serve `dist/` as static files.
- Configure an SPA fallback so direct routes like `/admin/users` and `/wallet/add-balance` return `index.html`.
- `public/_redirects` already contains the Netlify-style fallback `/* /index.html 200`.
- For Nginx/Apache or other hosts, configure equivalent rewrites.
- Environment variables are read at build time. Rebuild after changing `VITE_*` values.
- Backend CORS must allow the deployed frontend origin.
- Use HTTPS for auth tokens, OAuth callbacks, uploads, and payment/deposit flows.
- Ensure uploaded file URLs under `/uploads` are served by the backend or a CDN reachable by the frontend.

General Nginx-style SPA fallback example:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Capacitor Android Delivery

The Android app identifier is `online.nahub.app`, and the displayed app name is `𝑵&𝑨(HUB)`. `capacitor.config.ts` deliberately uses `capacitor-shell/` as `webDir`; it contains only a minimal fallback page. The React/Vite application is **not packaged into the APK**.

At runtime, Android loads `https://na-hub.online` over HTTPS with mixed content disabled. That makes the deployed website a runtime dependency of every installed APK:

- Deploy the web application and verify its SPA fallback before creating an APK.
- Keep `https://na-hub.online` reachable with a valid certificate. Do not use a localhost or HTTP URL for release builds.
- Allow the Android app's web origin in backend CORS where required, and verify API calls, OAuth redirect/query-token handling, uploads, and WhatsApp/external links on a physical device.
- `npm run cap:sync` copies the Capacitor configuration and fallback shell. It does not replace the remote website with `dist/`.
- The native project enables its own React Router back-navigation bridge in `src/native/capacitorBridge.js`; test Android back behavior after changing routes.
- Android App Links require publishing `android/app-links/assetlinks.json.example` at `https://na-hub.online/.well-known/assetlinks.json` after replacing the certificate SHA-256 placeholder with the release signing certificate fingerprint.
- Firebase `google-services.json` is not included. Push notifications cannot be considered enabled until Firebase is configured and device registration/permission flows are implemented and tested.
- Native Android settings currently use debug Capacitor logging and no release minification. Treat both as release-hardening items and review them before distribution.

Detailed Android setup, signing, and asset-link instructions are in [`CAPACITOR_ANDROID.md`](CAPACITOR_ANDROID.md).

## Error Handling And User Feedback

- `ToastProvider` and `useToast` power success/error/info feedback.
- Forms use inline validation and loading/disabled states.
- Stores normalize many backend errors to user-facing messages.
- Auth failures can trigger token refresh or forced logout.
- Network/API failures usually show toasts and retain current UI state when possible.
- Empty states exist for product, order, top-up, target, and admin lists.
- Route-level errors are handled by `RouteErrorBoundary`.
- The order store currently logs detailed order submission errors to the console, including `err.response.data`; avoid sensitive data in production logs.

## Testing And Quality Checks

Current quality setup:

- Build validation: `npm run build`.
- Type checking: `npm run lint`, which runs `tsc --noEmit`.
- ESLint: no ESLint config or script found.
- Prettier: no Prettier config or script found.
- Unit/component/e2e tests: no frontend test script found in `package.json`.

Do not assume tests exist or pass unless a script is added and run.

## Troubleshooting

| Problem | Verified checks |
| --- | --- |
| Frontend still uses mock data | Set `VITE_DATA_PROVIDER=real`, restart Vite, and confirm the value is present at build/dev-server start. Default is mock. |
| Requests go to the wrong backend | Check `VITE_API_BASE_URL`. It should normally look like `http://localhost:5000/api` or `https://api.example.com/api`. |
| Missing `/api` in base URL | Add `/api`; the backend mounts routes under `/api`, and upload URL resolution expects this shape. |
| CORS errors | Backend CORS must allow the frontend origin, especially `http://localhost:3000` in local dev. |
| Auth redirect loop | Clear `auth-storage` and `auth:logout-reason`, then log in again. Also check account status returned by backend. |
| Refresh-token failure | The frontend calls `POST /auth/refresh`; if the backend does not implement it or returns an error, the frontend clears auth and forces logout. |
| Multipart deposit upload fails | Ensure the request uses real mode, the backend accepts `receipt`, file size/type is allowed by backend, and the payment method still exists. |
| Order-field image upload fails | Ensure `/me/upload/order-field-image` exists and accepts field name `image`. |
| Broken uploaded images | Ensure backend serves `/uploads` and `VITE_API_BASE_URL` includes `/api` so the frontend can derive the backend origin. |
| Direct route returns 404 after deployment | Add an SPA fallback equivalent to `public/_redirects`. |
| Build-time env changes do not appear | Rebuild the frontend; Vite embeds `VITE_*` values at build time. |
| Windows clean script fails | `npm run clean` uses `rm -rf dist`; use `Remove-Item -Recurse -Force dist` in PowerShell if needed. |
| Missing translations | Add keys to both `src/locales/ar/common.json` and `src/locales/en/common.json`; the app falls back to Arabic/legacy translations. |
| Role/permission redirects | Check normalized role, account status, and `user.permissions`. Admins bypass permissions; supervisors do not. |
| Google OAuth callback issues | Confirm backend Google config, frontend callback URL, and that the backend redirects back to this frontend with expected query parameters. |
| Android opens an offline/error screen | Confirm `https://na-hub.online` is online with a valid HTTPS certificate; the APK is a remote shell and does not contain `dist/`. |
| Android API requests fail but browser requests work | Check backend CORS/origin policy, the device network, HTTPS certificate chain, and the deployed `VITE_API_BASE_URL` embedded in the remote site build. |
| Android deep links open the browser | Publish the real `assetlinks.json` at `/.well-known/assetlinks.json` using the release certificate SHA-256 fingerprint, then reinstall/verify the app link. |

## Security And Privacy Notes

- All `VITE_*` environment variables are public in the browser bundle.
- Do not put private backend, OAuth, payment, or admin secrets in frontend env files.
- Auth tokens and refresh tokens are stored in localStorage key `auth-storage`; XSS can steal them.
- Avoid rendering untrusted backend HTML. React escapes normal text rendering, but future use of raw HTML would require sanitization.
- Uploaded files require backend validation. Frontend checks do not replace server-side MIME, size, malware, and authorization checks.
- Use HTTPS in production for auth, deposits, OAuth, and uploads.
- External image URLs can leak client IP/user-agent data to third-party hosts.
- The repository contains hardcoded WhatsApp phone/link values and a WhatsApp group invite; review and replace with environment/config-driven public support links before production.
- Detailed API errors are logged in some catch blocks. Avoid logging sensitive request/response data in production.
- Run dependency audits as part of deployment; no audit script is currently defined in `package.json`.
- The Android app is a remote WebView shell. Its security and availability depend on the deployed site, TLS configuration, backend CORS, and the native app-link/signing setup in addition to the APK itself.

## Current Limitations And Risks

- Mock mode is default and does not provide full backend parity.
- Real notification inbox endpoints exist in the backend, but the frontend real adapter currently treats notification list/unread/read methods as local/no-op.
- `POST /auth/refresh` is expected by the frontend but was not confirmed in the inspected backend route listing.
- `/admin/wallet` route guard uses `VIEW_WALLET`, while backend wallet admin routes require `MANAGE_WALLET`.
- `PERMISSIONS.ADMIN_SUPERVISORS` is referenced but not defined, weakening supervisor-management route protection.
- Referral pages currently rely on browser localStorage/demo data rather than confirmed backend integration.
- Some legacy clone identifiers remain in package metadata, storage keys, mock data, referral defaults, and transition utilities. Audit and migrate them before treating the product identity or external integrations as complete.
- No realtime transport is implemented, so wallet, order, deposit, target, and notification changes rely on manual refreshes/polling rather than server push.
- The Android APK depends on the remote `https://na-hub.online` deployment; App Links still require a real certificate fingerprint, and push notifications require Firebase configuration and end-to-end testing.
- `APP_URL`, `VITE_APP_MODE`, and non-Vite `ADMIN_WHATSAPP_NUMBER` are stale or ineffective for browser code.
- The `clean` script is Unix-specific.
- There is no frontend test script, ESLint script, or Prettier script.
