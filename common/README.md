# Shared customer data layer

This folder contains plain TypeScript used by the web app and the future React Native app. It has no React components, hooks, Vite environment variables, navigation, or browser storage dependencies.

## Structure

- `api/transport.ts`: JSON requests, API base URL selection, HTTP errors, and cancellation. Supply URLs and optionally a fetch implementation when creating the transport.
- `models/customer.ts`: shared response models for customers, authentication, cards, products, and consultations.
- `controllers/auth.controller.ts`: customer login, registration, OTP, and password reset requests, including authentication response validation.
- `controllers/customer.controller.ts`: customer profiles, packages, address, Aadhaar, and PAN verification.
- `controllers/membership.controller.ts`: membership cards.
- `controllers/consultation.controller.ts`: consultations.
- `controllers/community.controller.ts`: community customer profiles and groups.
- `controllers/catalog.controller.ts`: configuration values and product catalog.
- `controllers/home.controller.ts`: combines the controllers into dashboard data, including partial failures and community fallback.
- `utils/`: shared date, expiry, appointment, package, and OTP timer helpers.
- `index.ts`: public exports.

## Using the same controllers in mobile

For an adapter at `mobile/src/api.ts`, create one transport and reuse the controllers:

```typescript
import {
  createApiRequest,
  createAuthController,
  createCustomerController,
  createHomeController,
} from '../../common';

// Supply these from your mobile app's configuration.
const request = createApiRequest({
  apiBaseUrl: 'https://your-customer-api.example',
  legacyApiBaseUrl: 'https://your-catalog-api.example',
});

export const authController = createAuthController(request);
export const customerController = createCustomerController(request);
export const homeController = createHomeController(request);

const signal = new AbortController().signal;
const members = await customerController.fetchMember(7, signal);
const dashboard = await homeController.loadHomeData(7, 0, 0, signal);
```

React Native uses its own screens, navigation, and session storage around these controllers. It can use its native `fetch`; no web code needs to be imported. Configure the mobile bundler to include this sibling folder when scaffolding the mobile app.

For authenticated requests, pass `getAccessToken: () => secureTokenStorage.getToken()` to `createApiRequest`; async storage is supported. Pass an `onUnauthorized` callback to clear the rejected session and return to login on HTTP 401. Save the `JwtToken` and `expiresAt` returned by login or registration in the app's secure storage. Auth requests remain anonymous. See [JWT configuration and behavior](../server/AUTHENTICATION.md).

The web adapter is `client/src/services/api.ts`. Existing web service modules now compose or re-export the shared controllers and helpers. Vite permits the `common` folder during development, and the web TypeScript build includes it.

Run `npm test`, `npm run build`, and `npm run lint` from the repository root. Tests use mock requests and do not contact customer services.
