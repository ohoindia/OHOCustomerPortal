# OHOINDIA mobile

Expo SDK 57 native shell with the **same interface as `client/`**. The client components, CSS, routes, images, fonts and interactive map are bundled into a self-contained WebView document. This includes all client routes and their aliases, registration/password-reset OTP flows, navigation state, hospital details, OPD booking, memberships, account details and wellness tools. It does not require a hosted website to load its screens.

The Expo Router entry points handle native launch/deep links. Inside the bundled interface, HashRouter preserves the client's navigation and query parameters without requesting pages from a server. There is one bottom navigation bar, rendered by the shared client.

Packages has explicit Expo Router entry points at `/packages`, `/product-details?productId=...&purchase=1`, and `/purchase/:orderId/:step`. They open the shared live client catalog and complete purchase interface, including family members, nominee selection, guardians for minors, secure payment links and payment confirmation. The legacy native catalog also delegates packages to these screens instead of displaying demo products. Maintain reusable business functions in `common/`; purchase destinations and initial step selection are shared alongside session mapping. Rebuild the bundled client after changes to either `client/` or `common/` during an active Expo session.

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

## Build an Android APK

EAS Build creates a signed, installable APK in the cloud from Windows. Android Studio is not required. See the [Expo APK build guide](https://docs.expo.dev/build-reference/apk/).

For the first build, open PowerShell and run:

```powershell
cd C:\code\oho\ohoCustomerApp
npm run client:install
npm run mobile:install
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Sign in to your Expo account. Follow the initialization prompts to create or link the Expo project; skip initialization if this checkout is already linked to the correct project.

The existing `mobile/eas.json` has a `preview` profile with `distribution: "internal"` and `android.buildType: "apk"`. Before building, check its `env.EXPO_PUBLIC_API_BASE_URL`: it must point to the reachable HTTPS backend origin, without `/api`. The APK uses this build-time value; changing only `.env.local` does not change the cloud build configuration.

From the `mobile` directory, run:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

If prompted for Android signing credentials, generate a new keystore for a new app. For subsequent builds or an existing released app, reuse the same keystore so Android can install updates over the previous APK.

The build hook installs the client dependencies and bundles the latest shared interface automatically. When the build finishes, open the APK download link provided by EAS on your Android phone, download it, allow installation from that source if prompted, and install it. The installed APK runs without Metro or Expo Go; backend data and map tiles require connectivity.

## Update the existing Google Play app

The Android package is `com.ohoindia.connect`, matching the original app in
`C:\code\oho\OHOCareConnectApp`. The new app keeps its own Expo project and
`EXPO_PUBLIC_API_BASE_URL`; do not copy the original app's backend or Firebase configuration.
The production profile in `eas.json` generates a store AAB and automatically increments
the remote Android version code. No remote version is currently configured for this project;
before the first replacement release, check the highest version code in Play Console
and initialize EAS's production Android version with `npx eas-cli@latest build:version:set
--platform android --profile production` if needed. Subsequent builds must exceed every
previously uploaded Play version code.

The original folder contains only a debug keystore, not a verified release upload key.
Its Expo project is owned by `ohoindia`, with project ID
`a76ab5cf-8a0c-4ee6-8373-cdc41c681ae7`. An account with access to that project should
check its Android credentials in the Expo dashboard and download the original upload
keystore, alias and passwords. Verify the keystore with `keytool -list -v -keystore
"C:\secure\original-upload-key.jks"`: the expected SHA1 is
`1D:2C:BB:E7:40:4D:FF:60:29:1B:F8:2E:DF:AC:62:0A:E6:FA:DA:17`.

From this project's `mobile` directory, run:

```powershell
npx eas-cli@latest credentials --platform android
```

Select production and supply the verified original keystore for
`com.ohoindia.connect`. Do not generate a replacement key unless you intend to request
an upload key reset in Play Console. If the original key cannot be recovered and Play
App Signing is enabled, register a replacement upload certificate through Play Console's
upload key reset process and wait until it becomes active. Keep private keystores and
passwords out of source control; do not upload them to chat.

Once signing and version code are confirmed, build:

```powershell
npx eas-cli@latest build --platform android --profile production
```

Download the AAB from the completed EAS build and upload it to the existing app's
internal testing track before releasing to production. Changing the Android package
requires a new binary; previously built AABs with `in.ohoindia.customer` cannot be used.

## Rebuild after making changes

To include changes to screens, styles, assets, navigation, dependencies, native configuration or the API URL in an installed APK, build and install a new APK. Reuse the existing Expo project and signing credentials; login and initialization are only needed if your account or project setup has changed.

From the repository root:

```powershell
cd C:\code\oho\ohoCustomerApp
# Run these two installs if package.json or package-lock.json changed.
npm run client:install
npm run mobile:install

npm --prefix mobile run bundle:client
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile test
npm --prefix client run build
npm --prefix client run lint
npm --prefix client test

cd mobile
npx eas-cli@latest build --platform android --profile preview
```

Download and install the new APK from its new build link. Starting Expo or refreshing Metro does not update an already installed standalone APK. Update `expo.version` and `expo.android.versionCode` in `mobile/app.json` when assigning a new release version; keep the Android package name and signing keystore unchanged for in-place updates.

The installed version is checked after sign-in and when the mobile app returns to the foreground. In `ConfigValues`, set `BizManageVersion` to the latest numeric release (for example `1.1.0`) and `BizManageAppLocation` to its HTTPS download page, APK URL, or store listing. Publish the downloadable release before raising `BizManageVersion`. A newer release displays an update message; **Update now** opens that location, and **Later** dismisses the message for that version during the current app session. Missing/invalid configuration or a failed request leaves the app usable. The existing authenticated `api/ConfigValues/all` endpoint exposes these two settings alongside dashboard settings; deploy the server change with the mobile release. The browser preview does not check for native updates.

If a build appears to use stale cached dependencies, retry from `mobile` with:

```powershell
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

For a quick preview while developing with Expo Go, run `npm run mobile:start` from the repository root. If Expo is already running and you change `client/`, run `npm --prefix mobile run bundle:client` and reload the app. Changes to `.env.local` require restarting Expo. Changes to native modules or native configuration require a new custom development/release binary.

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
node tests/purchase.browser.cjs <path-to-playwright-module>
```

`npm --prefix mobile run web` previews the bundled interface in an iframe. Browser API requests still require backend CORS configuration; device requests run through the native adapter. Preview sessions remain in memory.

The purchase browser check exercises Packages using mocked backend responses through the native bridge: package details, primary member, family member, nominee selection, payment-link handoff and completed payment confirmation. No real payment is made.

Feature/data availability matches the client. Package purchase uses the purchase backend; wallet, notifications and the other demo catalog screens remain samples. OPD and account screens use the existing backend endpoints. The map uses the client's Leaflet/OpenStreetMap implementation; map tiles and API data need connectivity. Images and Inter/Plus Jakarta Sans fonts are bundled, with font licenses in `client/src/assets/fonts/`.

To publish to eas use :

```powershell
npx eas-cli@latest build --platform android --profile preview
```
