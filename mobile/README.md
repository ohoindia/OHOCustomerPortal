# OHOINDIA mobile

Expo SDK 57 native shell with the **same interface as `client/`**. The client components, CSS, routes, images, fonts and interactive map are bundled into a self-contained WebView document. This includes all client routes and their aliases, registration/password-reset OTP flows, navigation state, hospital details, OPD booking, memberships, account details and wellness tools. It does not require a hosted website to load its screens.

The Expo Router entry points handle native launch/deep links. Inside the bundled interface, HashRouter preserves the client's navigation and query parameters without requesting pages from a server. There is one bottom navigation bar, rendered by the shared client.

Native adapters provide backend requests (independent of WebView CORS), cancellation, SecureStore authentication, location permissions, external directions/call links, Android back navigation and session expiry after resuming the app. Wellness entries use AsyncStorage. Existing device sessions migrate automatically from the previous native interface.

Requires Node 22.13 or newer. From the repository root:

```powershell
npm run client:install
npm run mobile:install
Copy-Item mobile/.env.example mobile/.env.local
npm run mobile:start
```

Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env.local` to the backend origin, without `/api`. Use an HTTPS API URL for deployed builds. Android emulator: `http://10.0.2.2:3000`; physical devices: a reachable LAN or HTTPS backend. Mobile does not use Vite's proxy or `VITE_*` variables. Restart Expo after changing environment variables. An Expo tunnel exposes Metro, not the backend.

If Expo Go cannot reach Metro over Wi-Fi, run `npm run mobile:tunnel` and scan the new QR code. Keep that terminal running and use an Expo Go version compatible with SDK 57.

`start`, `start:tunnel`, `android`, `ios`, `web` and `export` automatically rebuild the bundled client. After changing `client/` during an active Expo session, run `npm --prefix mobile run bundle:client` to refresh the bundle. EAS builds install the client dependencies and regenerate it through `eas-build-post-install`. The generated document is kept in `src/generated/client.json` so a checkout includes a working bundle.

**Rebuild and reinstall the mobile binary** after this update: the shell now includes `react-native-webview`. Expo Go includes this module; custom development/release builds must contain it. Configure the API URL in the build environment too; `.env.local` is normally excluded from EAS uploads.

Validation:

```powershell
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile test
npm --prefix client run build
npm --prefix client run lint
npm --prefix client test
npm --prefix mobile run export -- --platform all
```

The browser parity check compares all static authenticated client routes and six main-screen screenshots, and exercises login/logout through the native bridge. With Playwright and Chromium installed:

```powershell
cd mobile
node tests/shared-client.browser.cjs <path-to-playwright-module>
```

`npm --prefix mobile run web` previews the bundled interface in an iframe. Browser API requests still require backend CORS configuration; device requests run through the native adapter. Preview sessions remain in memory.

Feature/data availability matches the client. Sample checkout, wallet, notifications and catalog screens remain samples; OPD and account screens use the existing backend endpoints. The map uses the client's Leaflet/OpenStreetMap implementation; map tiles and API data need connectivity. Images and Inter/Plus Jakarta Sans fonts are bundled, with font licenses in `client/src/assets/fonts/`.
