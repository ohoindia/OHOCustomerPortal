# OHO Customer App

The repository separates the web client and backend so a React Native mobile app can be developed alongside them.

- `client/`: existing React, TypeScript and Vite web app, including assets and frontend tests.
- `common/`: shared API transport, typed data models, domain controllers, and data helpers for web and mobile. See [shared data layer](common/README.md).
- `server/`: NestJS backend. See [server setup](server/README.md) and [deployment](server/DEPLOYMENT.md).
- `mobile/`: intended location for the future React Native app; it has not been scaffolded yet.

From the repository root, install dependencies:

```powershell
npm run client:install
npm --prefix server ci
```

Frontend environment files belong in `client/`. For a new checkout, copy `client/.env.example` to `client/.env.local` and configure the API URLs. Backend configuration belongs in `server/.env` as described in its README.

Configure `JWT_SECRET` in the backend's `ConfigSecrets` table before using login or registration. See [JWT authentication setup](server/AUTHENTICATION.md).

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
