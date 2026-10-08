# OHOINDIA Native

Separate React Native app using Expo SDK 57 and native UI components. Screens are TypeScript in `src/screens/`; Expo Router routes are in `src/app/`. Android and iOS render React Native views, inputs, lists and maps. This app does not import `client/`, render HTML, use a WebView, or generate/load `client.json`.

The apps share only typed API transport, business helpers and content from `../common/`. The existing `mobile/` app instead runs `scripts/build-client.mjs`, bundles the Vite client into `src/generated/client.json`, and loads its HTML with `ClientView` in a WebView. That app remains separate.

## Run

Requires Node 22.13 or later. From the repository root:

```powershell
npm run native:install
Copy-Item native-mobile/.env.example native-mobile/.env.local
npm run native:start
```

Set `EXPO_PUBLIC_API_BASE_URL` to your backend origin without `/api`. Android emulator: `http://10.0.2.2:3000`. A physical phone needs a reachable LAN or HTTPS backend. Restart Metro after changing environment variables.

If Expo Go cannot connect over Wi-Fi, run `npm run native:tunnel` from the repository root and open the new QR code/link in Expo Go. This explicitly targets Expo Go, clears Metro's cache and uses port 8082 to avoid the existing server on 8081. Keep the terminal running. The tunnel exposes Metro only; your backend still needs a reachable address. Use an Expo Go version compatible with SDK 57.

If ngrok reports `remote gone away`, use LAN mode. Connect the computer and phone to the same Wi-Fi. With VPN or virtual adapters, explicitly set the computer's Wi-Fi IPv4 address (replace the example with your address):

```powershell
cd native-mobile
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.88.12'
npx expo start --go --lan --port 8083
```

Open `http://192.168.88.12:8083/status` on the phone: `packager-status:running` confirms Metro is reachable. Open `exp://192.168.88.12:8083` in Expo Go. If the status page cannot connect, check VPN local-network access, Windows Firewall permission for Node.js on private networks, and router client isolation. See [Expo connection options](https://docs.expo.dev/more/expo-cli/#tunneling).

For standalone Android maps, set `GOOGLE_MAPS_ANDROID_API_KEY` in the same environment file before Prebuild. `app.config.js` passes it to the maps config plugin; restrict the key to this app's package and signing certificate. See [Expo maps setup](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/).

## Native projects

```powershell
cd native-mobile
npm run prebuild
npm run android
# On macOS with Xcode:
npm run ios
```

Expo Prebuild generates `android/` and `ios/` from `app.json`. Android local compilation needs Java and the Android SDK; iOS compilation needs macOS and Xcode. Generated folders are ignored; configure repeatable native changes through app configuration/config plugins. See [Expo native project generation](https://docs.expo.dev/workflow/continuous-native-generation/).

The app uses its own identifiers (`com.ohoindia.customer.nativeapp` and `in.ohoindia.customer.nativeapp`) and deep-link scheme (`ohoindia-native`). It is not linked to the existing app's EAS project. Register these identifiers if you configure package-restricted map keys or store distribution.

## Features and checks

Native login, registration/password-reset OTP, secure device sessions, home, hospital list/map/location, OPD booking, membership, family, nominees, profile, KYC, support and wellness screens use the shared services. Packages use the live catalog and purchase endpoints, including primary member details, family, minor nominee guardians and external secure payment links. Payment completion is verified with the backend on resume and by polling. A payment link opens in the system browser.

Login follows the client's mobile layout and routes: existing customers sign in with a four-digit password; new customers enter their Aadhar name and continue to `/otp`; password reset verifies OTP before setting a new password. English, Telugu and Hindi selection persists on device. The five main tabs are Home, Bookings, Wallet, Packages and Profile, matching the client. Home includes the live benefit vault and pending purchases. Profile's Membership action opens account details and family/package coverage; account management starts password reset. Bookings support booking-detail links and QR codes.

Wallet uses the client's live OPD balances and savings calculations with transaction/category filtering. Notifications, doctor/lab/pharmacy catalogs, health records and payment preview retain sample-data behavior and are labeled as demos. The native UI is independent of web CSS. Browser map preview offers external directions; Android/iOS use `react-native-maps`.

```powershell
npm run native:typecheck
npm run native:lint
npm --prefix native-mobile run export -- --platform android --platform ios
```

Backend integration and actual device installation require a reachable backend and native build environment. No web-client dependency installation is needed to run this app.

`tests/flows.browser.cjs` exercises native components through React Native Web using mocked API responses, covering login, tabs, wallet, booking details, logout, OTP reset and registration. Pass your Playwright module path and a Metro web-server URL configured with a test API origin. Screenshots are written to `.expo/review/`. This does not replace Android device testing.
