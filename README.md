# OHO Customer App

The repository separates the web client and backend so a React Native mobile app can be developed alongside them.

- `client/`: existing React, TypeScript and Vite web app, including assets and frontend tests.
- `common/`: shared API transport, typed data models, domain controllers, and data helpers for web and mobile. See [shared data layer](common/README.md).
- `server/`: NestJS backend. See [server setup](server/README.md) and [deployment](server/DEPLOYMENT.md).
- `mobile/`: Expo native shell bundling the same client screens, styling, and navigation, with native API requests, secure device sessions, and location access. See [mobile setup](mobile/README.md).

From the repository root, install dependencies:

```powershell
npm run client:install
npm --prefix server ci
```

Frontend environment files belong in `client/`. For a new checkout, copy `client/.env.example` to `client/.env.local` and configure the API URLs. Backend configuration belongs in `server/.env` as described in its README.

Configure `JWT_SECRET` in the backend's `ConfigSecrets` table before using login or registration. See [JWT authentication setup](server/AUTHENTICATION.md).

For local development, `VITE_API_BASE_URL=/` uses Vite's same-origin `/api` proxy. Set `VITE_DEV_API_TARGET` to the backend's address (default `http://localhost:3000`). If another application occupies IPv4 port 3000 while this backend listens on IPv6, use `VITE_DEV_API_TARGET=http://[::1]:3000`. Vite restarts when its configuration or environment files change. Production builds need an absolute API URL, or `/` when the hosting server also forwards `/api` to the backend.

Run these in separate terminals:

```powershell
npm run dev
npm run server:dev
```

Root commands forward to the appropriate app:

```powershell
npm run build
npm run lint
npm test
npm run server:build
npm run server:test
```

The web build is written to `client/dist/`. You can also run the frontend commands directly from `client/`.

Additional customer services are available from **Profile → More Services** (`/menu`). The existing routes and bottom navigation are preserved. The added screens cover purchased memberships and policies, health products, consultations, hospital network/details/benefits, customer profile, family and nominee records, KYC status, OTP password reset, support, privacy/terms, and wellness tools. Reference-portal URLs such as `/PurchasedPackages`, `/ConsultationList`, `/CustomerProductDetails`, and `/policies/:policyId` are available directly after login.

All added data requests use the same `VITE_API_BASE_URL` and `/api` namespace as the existing app. There are no `lambdaAPI` or `apiLambda` routes. Family and nominee screens display existing records; KYC checks existing verification status. Step and nutrition entries are manually recorded and stored per account and day in this browser, rather than synced to the backend.

Home shows **Quick Actions** immediately before **Quick Services**. **Zero-Cash OPD** follows the reference portal's Book Service flow: choose a hospital, select yourself or a family member, check free-consultation coupons, then initiate a booking. It requires an active, unexpired membership card and an available free-consultation benefit at the hospital. **Scan & Pay QR** opens the existing Payment screen; **Pharmacy Subsidies** opens the existing Pharmacy screen.

Hospitals have List and Map views with search, speciality filters, directions, and Book Service links. Location access enables distance sorting, Nearest 2, and Nearby within 10 km. Hospitals without valid coordinates remain available in the list. The interactive map uses Leaflet and OpenStreetMap tiles with attribution.

OPD booking requires a future **Appointment Date & Time** and **Service Type**, and accepts an optional **Reason to Visit**. Service options come from `/api/HospitalServices/all`; appointment details are saved with the booking. The backend validates active service types and stores appointment time in India time.
