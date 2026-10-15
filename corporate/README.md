# OHOINDIA Corporate Portal

Standalone React + TypeScript + Vite project for company HR and administrators.
All application source, dependencies, assets and configuration belong to this folder.
It does not import anything from the customer client or mobile apps.

```powershell
cd corporate
npm ci
npm run dev
```

Open http://localhost:5174. Run the NestJS API separately from `server/`.
Copy `.env.example` to `.env.local` to override the local API target.

```powershell
npm run lint
npm run build
npm run preview
```

Deploy `corporate/dist/` to `corporate.ohoindialife.com` and route `/api` to the backend.
For a different API origin configure `VITE_CORPORATE_API_BASE_URL` before building.

See [company provisioning, migrations and API details](../CORPORATE.md).
