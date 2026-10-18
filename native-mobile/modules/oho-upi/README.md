# OHO booking UPI bridge

This local Expo module is discovered from `native-mobile/modules` by Expo Autolinking. Its Android library manifest merges a scoped `VIEW` / `upi://pay` query into the app. No broad installed-app permission or hard-coded list of payment providers is used. `listApps()` returns all installed, enabled, exported UPI payment handlers with package names, labels and small icons.

`launchPayment(uri, packageName)` starts the selected Android activity with a unique request code. `OnActivityResult` resolves the JavaScript Promise with `SUCCESS`, `CANCELLED`, `FAILURE` or `UNKNOWN`, the Android result code and available transaction evidence. It accepts standard query-string responses, recognized direct extras and JSON responses. A second launch is rejected while an activity is pending. If an app resumes OHOINDIA without an activity result, the Promise resolves `UNKNOWN` after a two-second grace period. Late callbacks cannot resolve a newer attempt. Activity destruction also releases the Promise as `UNKNOWN`.

`SUCCESS` means the payment app reported success. It must never be used as server-verified settlement or as permission to fulfill a booking. The backend must retain the attempt and reconcile payment with its PSP or hospital. Persist the server-created attempt before launch so process death or a missing callback can be recovered from booking history.

`src/lib/booking-payments.ts` saves returned evidence in an AsyncStorage outbox before reporting it. Entries are isolated by customer, booking and attempt. Sync runs only for the matching active account and booking, retains entries when the network/report fails, and removes them after an accepted report. The server accepts an identical replay when a report arrived but its acknowledgement was lost. Per-attempt serialization prevents concurrent saves and syncs from dropping a callback.

The wrapper at `src/lib/upi.ts` supports installed Android development and production builds. Expo Go, iOS, web and an older build without the module show a clear unsupported message; they do not simulate a payment. Rebuild Android after adding this module. Over-the-air JavaScript updates cannot install native code.

## Validation

Run `npm test`, `npm run typecheck`, `npm run lint`, and `node node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js resolve --platform android` from `native-mobile`. The latter must include `oho-upi` and `expo.modules.ohoupi.OhoUpiModule`.

Before release, use an Android build with at least two UPI apps installed and a hospital test payment recipient. Verify discovery, the displayed recipient and amount, app removal between discovery and launch, successful payment, back/cancel, failure, a pending/submitted response, an app returning no response, repeated taps, leaving and returning to OHOINDIA, and process recreation. Verify attempt history survives a network interruption when saving the returned result. Real banking payments require a controlled end-to-end test and PSP reconciliation.

Sources: [Expo module API](https://docs.expo.dev/modules/module-api/), [Expo Autolinking](https://docs.expo.dev/modules/autolinking/), [Android package visibility](https://developer.android.com/training/package-visibility/declaring), [Google Pay UPI intent and payment verification](https://developers.google.com/pay/india/api/android/in-app-payments).
