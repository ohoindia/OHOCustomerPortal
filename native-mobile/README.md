# OHOINDIA native React Native app

This is the native counterpart of `mobile/` and `client/`. Screens use React Native views, text, inputs, images, native maps and Expo Router. The app does not bundle the website or use a WebView. Business rules and backend controllers remain shared in `../common/`.

## Run

Requires Node 22.13 or newer. From the repository root:

```powershell
npm run native:install
Copy-Item native-mobile/.env.example native-mobile/.env.local
npm run native:start
```

Use an Expo Go version compatible with SDK 57, or a development build. Set `EXPO_PUBLIC_API_BASE_URL` to the reachable backend origin (the existing environment URLs include `/dev` or `/prod`; do not append `/api`). For a local backend, use `http://10.0.2.2:3000` from the Android emulator or a reachable LAN IP from a physical phone. Restart Metro after changing environment variables.

## Pages and flows

- Language selection, sign-in, new-customer OTP registration, password recovery and authenticated password reset.
- Home with live benefit balances, profile/membership notices, upcoming appointments, pending purchases and quick services.
- Hospital network, search/speciality/distance filters, native map, details, directions and membership-gated free OPD booking for self or dependents.
- Booking history and filters, individual booking details, savings and enlarged hospital check-in QR codes.
- Hospital bill payments against a booking: camera QR scan, recipient/amount review, installed Android UPI app selection, native activity-result capture and persistent payment-attempt history.
- Live categorized packages, premium/eligibility details, purchaser confirmation, family selection/removal, spouse requirements, nominees, adult guardians for minors, secure Cashfree payment links/QR, expiry and payment confirmation.
- Account details, family coverage, membership cards, profile, family members, purchased packages, policy and nominee details.
- Live wallet balances, subscription credits, transaction categories, running balances and expandable bill details.
- Products, KYC status, account management, support, policy/terms, about, BMI, breathing and per-account daily step/calorie tracking.
- Doctors, lab tests, pharmacy, health records, notifications, appointment/payment and order-tracking previews retain the source app's sample-data behavior. They do not create a real medical order or payment. Real purchases and hospital OPD bookings use the live flows above.

All named routes in `client/src/App.tsx` have explicit native entry points, including original aliases and dynamic purchase/policy/doctor links. `src/app/(member)/` is protected by the session guard. Device credentials persist in SecureStore; expiry and HTTP 401 clear the session. The bottom navigation matches the client: Home, Bookings, Wallet, Packages, Profile.

## Hospital booking and QR payments

Choose a hospital, select the patient and visit details, review the request, then send it. A saved request opens its booking details and hospital check-in QR. The **Scan & pay hospital** action opens a separate bill-payment flow linked to that booking.

On Android, scan the hospital counter's standard `upi://pay` QR, check the displayed recipient and bill amount, confirm them with the hospital, and choose any installed UPI-capable payment app. PhonePe and other apps are discovered from the device rather than from a fixed list. The native module starts the chosen activity and resolves its JavaScript Promise with success, cancellation, failure or an unknown result. Check-in QR codes and payment QR codes serve separate purposes.

Every active hospital booking supports scanned recipients without pre-registering the hospital's UPI account. Optional hospital settings can restrict the recipient or disable payments. Free consultation benefits stay free; this action is for separately billed hospital charges. Standard QR codes without an amount allow entry of the hospital's bill amount. Signed payment QR codes need a provider-specific integration and are rejected with an explanation.

The server saves the attempt and selected app before launch. Returned evidence is saved on the phone before reporting, and failed reports retry when this booking is opened again by the same account. History keeps the amount, recipient, app outcome and available transaction/bank references. An app-reported success or missing result requires hospital/provider confirmation before another payment. An Android callback does not confirm receipt of money; it never marks a booking paid or consumes a coupon.

Deploy the updated backend and apply [the payment migration](../server/docs/hospital-booking-payments.md) to its database before using this flow. Rebuild and install the Android binary so it includes the local UPI module and camera permission. Expo Go, iOS and web show payment history and an availability message. A controlled Android test with PhonePe is still required to verify its real return behavior; a JavaScript export does not compile or test the Kotlin module. See [native bridge validation](modules/oho-upi/README.md).

## Android APK and Play Store AAB

The default app installs as **OHOINDIA Native Preview**, package `com.ohoindia.connect.nativepreview`, so it can coexist with the existing app. Production uses `com.ohoindia.connect`.

From `native-mobile/`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:apk
```

Create/link a separate Expo project for this native app. EAS builds the preview APK and returns a download link. The repository does not include signing credentials or an EAS project ID for this app. The preview profile uses the development API. Build profiles in `eas.json` supply the API URL for cloud builds; `.env.local` is excluded from uploads.

For Play Store, use `npm run build:aab`. Before the first production build, configure the original app's verified upload keystore with `npx eas-cli@latest credentials --platform android` and set a remote version code higher than every existing Play upload with `npx eas-cli@latest build:version:set --platform android --profile production`. Use Play internal testing before release. Keep signing credentials outside this repository.

For Android Studio/local builds, install Java and the Android SDK, then:

```powershell
npx expo prebuild --platform android --clean
npm run android
```

Expo generates `android/` from `app.config.js`; generated native projects are excluded from version control. `expo run:android` requires a connected Android device or running emulator. An incomplete old generated folder should be regenerated with the prebuild command above. Release APK/AAB signing remains an EAS/signing configuration step.

Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in the build environment for native Android maps, and enable/restrict the key for the selected package and signing SHA-1. List search and external directions work without a map key. This value is intentionally public in the binary; restrict it in Google Cloud. Broad photo/video/storage permissions are blocked.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run export
```

`export` creates the production Android JavaScript/Hermes bundle; it is not a signed APK. Tests cover route coverage/imports, native-only screen code, session persistence/races, appointment dates, purchase validation and progression, and payment-method restrictions.

For the browser smoke test of these React Native components, export with `npx expo export --platform web --output-dir dist-web` and run `node tests/flows.browser.cjs <path-to-playwright> [path-to-chromium]`. This uses mocked API responses and covers sign-in/registration, route protection, spouse/family/nominee/guardian selection, payment confirmation, wallet, QR modal, OPD booking and the remaining page navigation. Screenshots are saved under `test-results/`. Device location, native map rendering and signed installation still need an Android device check.
