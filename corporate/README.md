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

## Deploy to AWS Amplify Hosting

The repository-root [`amplify.yml`](../amplify.yml) builds only this portal with
Node.js 22, installs its locked dependencies with `npm ci`, and publishes its
`dist/` folder. The NestJS backend must already be deployed separately; see
[backend deployment](../server/DEPLOYMENT.md).

1. Commit and push the configuration and portal source to your Git provider.
2. In AWS Amplify, create a new app, connect the repository, and select the branch
   to deploy. Select **My app is a monorepo** and set the app root to `corporate`
   (lowercase). For an existing Amplify app, set the environment variable
   `AMPLIFY_MONOREPO_APP_ROOT=corporate`.
3. Confirm that Amplify uses the repository's `amplify.yml`. Commands run inside
   `corporate/`, and the artifact directory is `dist`, not `corporate/dist`.
4. Under **Hosting > Environment variables**, set
   `VITE_CORPORATE_API_BASE_URL=https://your-api-host` to the public HTTPS backend
   base URL. Include any deployment stage prefix if required, but do not append
   `/api` or `/api/corporate`: the app appends `/api/corporate` itself. Configure
   the backend's CORS policy to allow the Amplify site origin and, later, the
   custom domain, including `Authorization` and `Content-Type` request headers.
   `VITE_DEV_API_TARGET` only controls the local Vite proxy and has no effect on
   Amplify. `VITE_*` values are embedded in the public JavaScript bundle, so put
   no secrets in them. Redeploy after changing these build-time variables.
5. Choose **Save and deploy**. After the build succeeds, open the generated
   `https://<branch>.<app-id>.amplifyapp.com` URL and verify login and employee
   loading. In browser developer tools, verify that API requests reach the
   configured backend and return JSON rather than the site's HTML.
6. Under **Hosting > Custom domains**, add `ohoindialife.com`, map the `corporate`
   subdomain to the deployed branch, and complete the DNS and certificate steps
   shown by Amplify. Verify `https://corporate.ohoindialife.com` once available.

Subsequent pushes to the connected branch trigger deployment automatically.
No Amplify backend initialization or Amplify JavaScript SDK is required.

### Optional same-origin API proxy

To keep API requests on the portal domain instead, leave
`VITE_CORPORATE_API_BASE_URL` unset and configure this rule in Amplify's
**Hosting > Rewrites and redirects** JSON editor, replacing the example host:

```json
[
  {
    "source": "/api/<*>",
    "target": "https://your-api-host/api/<*>",
    "status": "200",
    "condition": null
  }
]
```

Preserve any other rules you need and place the API proxy before any SPA
fallback. The production host does not use `vite.config.ts`'s proxy. This portal
currently switches views without URL routing, so a catch-all SPA rewrite is not
required. If client-side URL routes are added later, add an asset-excluding
`200` rewrite to `/index.html` after the API rule.

### Check the production build locally

From the repository root:

```powershell
npm run corporate:install
$env:VITE_CORPORATE_API_BASE_URL = "https://your-api-host"
npm run corporate:build
npm run corporate:preview
```

The preview serves the compiled files; the API must be reachable at the URL
embedded during the build. Allow the preview origin in backend CORS when testing
with a separate API origin.

References: [Amplify monorepo configuration](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html)
and [rewrite examples](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).

See [company provisioning, migrations and API details](../CORPORATE.md).
