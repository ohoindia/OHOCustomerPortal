# Shared customer data layer

This folder contains plain TypeScript used by the web client and mobile app. It has no React components, hooks, Vite environment variables, navigation, or browser storage dependencies.

## Structure

- `api/transport.ts`: JSON requests, API base URL configuration, HTTP errors, and cancellation. Supply an API base URL and optionally a fetch implementation when creating the transport.
- `models/customer.ts`: shared response models for customers, authentication, cards, products, and consultations.
- `controllers/auth.controller.ts`: customer login, registration, OTP, and password reset requests, including authentication response validation.
- `controllers/customer.controller.ts`: customer profiles, packages, address, Aadhaar, and PAN verification.
- `controllers/membership.controller.ts`: membership cards.
- `controllers/consultation.controller.ts`: consultations.
- `controllers/community.controller.ts`: community customer profiles and groups.
- `controllers/catalog.controller.ts`: configuration values and product catalog.
- `controllers/home.controller.ts`: combines the controllers into dashboard data, including partial failures and community fallback.
- `utils/`: shared date, expiry, appointment, package, and OTP timer helpers.
- `utils/session.ts`: shared authentication storage keys and member/session mapping used by web login and mobile session restoration. Keep platform storage in the app adapters.
- `utils/purchase.ts`: shared package-detail destinations, purchase destinations, initial step selection, and nominee completion checks. Mobile purchase entry points reuse the client purchase interface and these helpers.
- `utils/membership.ts`: shared membership display labels (`MEMBERSHIP_LABELS`) and state selection (`membershipState`). Web and mobile can call `membershipState(dashboard)` or `membershipState(null)` while loading.
- `content/labels.ts`: `UI_TEXT` contains display text across authentication, home, account details, booking, discovery, profile, portal, and wellness screens. `UI_MESSAGES` formats messages containing dynamic values. Repeated labels share one value; capitalization and intentional spacing are preserved.
- `content/options.ts`: reusable service menus, booking filters, form choices, field labels, membership benefits, and sample display collections. Menu paths identify the existing web destinations; mobile maps them to its own navigation.
- `content/config.ts`: shared legal links, date locales, and India time zone.
- `data/mockData.ts`: typed sample hospitals, doctors, packages, tests, medicines, and bookings. These are demo values, separate from API results.
- `index.ts`: public exports.

## Using the same controllers in mobile

For an adapter at `mobile/src/api.ts`, create one transport and reuse the controllers:

```typescript
import {
  createApiRequest,
  createAuthController,
  createCustomerController,
  createHomeController,
} from "../../common";

// Supply these from your mobile app's configuration.
const request = createApiRequest({
  apiBaseUrl: "https://your-customer-api.example",
});

export const authController = createAuthController(request);
export const customerController = createCustomerController(request);
export const homeController = createHomeController(request);

const signal = new AbortController().signal;
const members = await customerController.fetchMember(7, signal);
const dashboard = await homeController.loadHomeData(7, 0, 0, signal);
```

React Native uses its own screens, navigation, and session storage around these controllers. It can use its native `fetch`; no web code needs to be imported. Configure the mobile bundler to include this sibling folder when scaffolding the mobile app.

## Using shared display values in mobile

```typescript
import {
  UI_TEXT,
  UI_MESSAGES,
  membershipState,
  membershipBadge,
  appointmentState,
  cardStatus,
  bookingPeriods,
} from "../../common";

const title = UI_TEXT.myBookings;
const membershipLabel = membershipState(dashboard);
const badge = membershipBadge(cardStatus(dashboard.card));
const appointmentLabel = appointmentState(memberId, appointments);
const otpLabel = UI_MESSAGES.resendOtpInS(secondsRemaining);
const filters = bookingPeriods;
```

Components keep their layout, CSS classes, DOM IDs, event handlers, storage, and platform-specific APIs. Add or edit reusable display values in `common/content/` so web and mobile stay consistent.

For authenticated requests, pass `getAccessToken: () => secureTokenStorage.getToken()` to `createApiRequest`; async storage is supported. Pass an `onUnauthorized` callback to clear the rejected session and return to login on HTTP 401. Save the `JwtToken` and `expiresAt` returned by login or registration in the app's secure storage. Auth requests remain anonymous. See [JWT configuration and behavior](../server/AUTHENTICATION.md).

The web adapter is `client/src/services/api.ts`. Existing web service modules now compose or re-export the shared controllers and helpers. Vite permits the `common` folder during development, and the web TypeScript build includes it.

Run `npm test`, `npm run build`, and `npm run lint` from the repository root. Tests use mock requests and do not contact customer services.
