# Root Cause

`@capacitor/app` was already installed (`8.1.1`), but `capacitor.config.ts` set `App.disableBackButtonHandler` to `true`. In Capacitor 8 this disables the AndroidX `OnBackPressedDispatcher` callback completely, so both the system Back button and Android Back gesture fell through to Android's default activity exit behavior.

The unused-in-practice JavaScript fallback in `src/native/capacitorBridge.js` also treated `WebView.canGoBack` and `window.history.length` as application history. Those values can include unrelated WebView, OAuth, or external entries. The original Layout-specific native-event listener also forwarded every route through `handleGoBack`, which would have made a generic Layout fallback override the central session-owned route stack.

`Layout.handleGoBack` has one actual screen-specific branch: `/buy-target` dispatches `ka:buy-target-back`. `BuyTarget` uses that existing event to return from a selected app to the app list before it navigates away. This was bypassed by the first central Android handler's direct `navigate(-1)` call.

# Files Modified

- `capacitor.config.ts`
- `src/App.jsx`
- `src/components/account/ConfirmDialog.jsx`
- `src/components/app/AndroidBackNavigation.jsx`
- `src/components/layout/Layout.jsx`
- `src/hooks/useNativeBackAction.js`
- `src/components/orders/OrderDetailsDrawer.jsx`
- `src/components/products/ProductPurchaseDialog.jsx`
- `src/components/ui/Modal.jsx`
- `src/hooks/useNativeBackOverlay.js`
- `src/native/capacitorBridge.js`
- `src/pages/Account.jsx`
- `src/pages/PaymentDetails.jsx`
- `src/pages/ProductSearch.jsx`
- `src/utils/overlayBackStack.js`
- `src/utils/nativeBackActionRegistry.js`
- `ANDROID_BACK_NAVIGATION_FIX_REPORT.md`

# Back Architecture

`AndroidBackNavigation` is mounted once inside `BrowserRouter`. On Android only, it registers one `App.addListener('backButton', ...)` listener and removes its listener handle during cleanup. Refs keep the active `navigate` callback and route state current without re-registering on route changes.

The listener maintains a session-owned stack of React Router location keys. `PUSH`, `REPLACE`, and `POP` transitions update that stack; a POP to an unknown entry becomes a fresh root. It never uses `window.history.length`, `canGoBack`, or `window.history.back()` to decide whether the N&A application can go back. This prevents direct/app-link launches from entering external browser or OAuth history.

Back priority is:

1. Close the latest registered app overlay.
2. Run the current screen/layout's registered existing in-app Back action.
3. `navigate(-1)` only when the session-owned route stack has a prior N&A entry.
4. Call `App.exitApp()` only at the current session root.

`useNativeBackAction` and `nativeBackActionRegistry` are a small LIFO React registry analogous to the overlay registry. `Layout` registers `handleGoBack` only while `/buy-target` is active; the central handler therefore invokes the same existing `ka:buy-target-back` path as the visible Back control. The generic Layout `window.history.length` fallback is intentionally not registered, so ordinary nested routes remain controlled by the application-owned route stack.

A pending-POP guard prevents rapid duplicate native callbacks from skipping multiple application routes.

# Edge Swipe / Predictive Back

No native Java/Kotlin change was required. Capacitor 8's installed App plugin uses AndroidX `OnBackPressedDispatcher` / `OnBackPressedCallback`; AndroidX Activity is `1.11.0` and the app targets SDK 36. The implementation uses those supported Capacitor/AndroidX back APIs and keeps a single `App.backButton` listener.

No `KEYCODE_BACK`, deprecated `onBackPressed`, custom edge detector, or `OnBackInvokedCallback` override was added.

Predictive Back and edge-swipe behavior are **not verified by code inspection alone**. Final gesture behavior requires validation on a physical Android device using gesture navigation.

# Modal Priority

The small LIFO overlay registry invokes existing close callbacks; it does not remove DOM nodes or change UI state directly. The shared `Modal` and `ConfirmDialog` components are registered, covering their existing callers. The custom product-purchase dialog, product-search overlay, order-details drawer, mobile sidebar drawer, account password dialog, and top-up success dialog are also registered. Non-dismissible/loading overlays consume Back rather than allowing navigation behind them.

# Root Exit Behavior

Android may exit only when no registered overlay is open and the current session-owned React route is its root entry. Auth redirects implemented with React Router `replace` remain a single root entry. A direct/deep-link launch also begins as a single root entry, so it cannot pop to external WebView history.

# Web Safety

The native listener is registered only when Capacitor reports the Android native platform. Normal browser Back, `popstate`, and browser history are not intercepted or changed.

# Validation

- `npm run lint`: PASS (`tsc --noEmit`).
- `VITE_DATA_PROVIDER=real VITE_API_BASE_URL=https://na-hub.online/api VITE_REFERRAL_API_ENABLED=true npm run build`: PASS.
- `npx cap sync android`: PASS; found `@capacitor/app@8.1.1` and seven other configured plugins.
- `git diff --check`: PASS.

# Manual Android Test Matrix

| Scenario | Result | Notes |
| --- | --- | --- |
| Home -> Products -> Back button -> Home | NOT TESTED | Requires installed Android build/device. |
| Home -> Products -> Android edge swipe -> Home | NOT TESTED | Requires physical Android device with gesture navigation. |
| Buy Target selected app -> Android system Back -> app list | NOT TESTED | Uses the same registered `handleGoBack` / `ka:buy-target-back` action as the visible Layout Back button. |
| Buy Target app list -> Android system Back -> prior N&A route | NOT TESTED | Existing Buy Target Back action navigates to the prior route when no app is selected. |
| Home -> Products -> product/purchase -> Back -> Products | NOT TESTED | Product purchase dialog closes first. |
| Orders -> details/drawer -> Back -> close details first | NOT TESTED | Drawer is registered ahead of route navigation. |
| Open modal -> Back -> modal closes without route change | NOT TESTED | Shared Modal registry path. |
| Nested route -> repeated Back -> correct previous routes | NOT TESTED | Session-owned Router stack path. |
| Root route -> Back -> only then may app exit/system-back | NOT TESTED | `App.exitApp()` root path. |
| Direct launch/deep link -> Back does not enter invalid external history | NOT TESTED | Unknown POP entries reset to a safe root. |
| Browser website navigation remains unchanged | NOT TESTED | Code inspection confirms Android-only listener registration. |
| Repeated mount/unmount does not create duplicate listeners | NOT TESTED | Listener cleanup and inactive async-handle removal implemented. |
| Android predictive/gesture Back matches system Back | NOT TESTED | Device validation is required; code uses Capacitor's supported AndroidX callback. |

# Remaining Risks

- P1: Manual validation on a physical Android device with gesture navigation is still required to verify predictive/edge-swipe behavior.
