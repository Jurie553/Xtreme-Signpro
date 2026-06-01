# Zoho Sync Test Report

Date: 2026-06-01

## Summary

Zoho sync readiness was improved with a dedicated backend readiness endpoint and an admin test panel in the Zoho settings area.

Local code checks pass. Live Zoho/Firebase checks still need to be run in the deployed app because the Zoho and Firebase server environment variables are configured in deployment settings, not in this local workspace.

Update on 2026-06-01: Vercel JSON parsing failures were fixed so the Zoho settings UI fails gracefully when `/api/zoho/*` backend routes are unavailable.

Update on 2026-06-01: The Connect OAuth flow was hardened so an empty, HTML, or invalid `/api/zoho/auth-url` response cannot trigger `response.json()` / `Unexpected end of JSON input` errors.

Update on 2026-06-01: The Vercel `/api/zoho/*` fallback was replaced with working serverless Zoho API routes for OAuth, readiness, sync, exports, and payment pull.

Verification update on 2026-06-01:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run build:vercel` passed.
- Local serverless handler invocation confirmed `/api/zoho/auth-url` returns valid JSON for missing env.
- Local serverless handler invocation confirmed `/api/zoho/readiness` returns valid JSON with friendly Firebase/Zoho configuration warnings.

Routing update on 2026-06-01:

- Consolidated Zoho back into one Vercel serverless catch-all function at `api/zoho/[...path].ts`.
- Removed separate Zoho route files so the deployment stays within the Vercel Hobby plan serverless function limit.
- The single catch-all handles `/api/zoho/config`, `/api/zoho/readiness`, `/api/zoho/auth-url`, `/api/zoho/callback`, `/api/zoho/test-connection`, `/api/zoho/sync-clients`, `/api/zoho/sync-products`, `/api/zoho/push-quote`, `/api/zoho/push-invoice`, `/api/zoho/pull-payments`, `/api/zoho/token`, and `/api/zoho/disconnect`.
- Local catch-all invocation confirmed `/api/zoho/config`, `/api/zoho/readiness`, and `/api/zoho/auth-url` return valid JSON.

## What Passed

- `npm run typecheck` passed.
- `npm run lint` passed. This project currently maps lint to `tsc --noEmit`.
- `npm run build` passed.
- `npm run build:vercel` passed when run outside the local Windows sandbox path restriction.
- `/api/zoho/config` returns friendly JSON and does not expose the client secret.
- `/api/zoho/auth-url` returns a friendly missing-client-id warning locally instead of crashing.
- `/api/zoho/readiness` now returns friendly JSON instead of hanging when local Firebase config is missing.
- Frontend Zoho API calls now use guarded JSON handling and do not call JSON parsing on HTML, empty, or non-JSON responses.
- Vercel now has a single `/api/zoho/*` catch-all function that returns JSON instead of serving `index.html`.
- `vercel.json` no longer rewrites `/api/*` paths to the Vite SPA shell.
- `/api/zoho/auth-url` now returns `{ success: true, authUrl, url }` when OAuth env vars are present.
- `/api/zoho/auth-url` returns a safe JSON error when required OAuth env vars are missing.
- Generated OAuth URLs include `client_id`, `redirect_uri`, `response_type=code`, `access_type=offline`, `prompt=consent`, and Zoho Books scopes.
- Vercel serverless routes now exist for:
  - `/api/zoho/config`
  - `/api/zoho/auth-url`
  - `/api/zoho/callback`
  - `/api/zoho/readiness`
  - `/api/zoho/test-connection`
  - `/api/zoho/sync-clients`
  - `/api/zoho/sync-products`
  - `/api/zoho/push-quote`
  - `/api/zoho/push-invoice`
  - `/api/zoho/pull-payments`
- OAuth URL generation uses the configured Zoho Accounts domain, offline access, consent prompt, and the backend callback redirect URI.
- Callback handling remains at `/api/zoho/callback`.
- Access tokens, refresh tokens, and saved client secret are stored in `zoho_private/state`; `settings/zoho` only stores public connection/config metadata.
- Sync operations log success/failure through `zoho_sync_logs` where Firestore is available.
- Client sync checks existing Zoho contacts by email/name and maps `zohoCustomerId` to avoid duplicate contacts.
- Product sync maps local products to Zoho Books items and stores `zohoItemId`.
- Accepted quotes export through `/api/zoho/push-quote` as Zoho Estimates.
- Jobcards export through `/api/zoho/push-invoice` as Zoho Invoices and update mapped invoices when `zohoInvoiceId` exists.
- Payment status pull uses mapped `zohoInvoiceId` values and updates local job payment status safely.

## What Failed Locally

- Local workspace is missing Firebase server config (`VITE_FIREBASE_*`), so Firestore read/write checks for these paths cannot pass locally:
  - `clients`
  - `products`
  - `quotes`
  - `jobs`
  - `settings/zoho`
  - `zoho_private/state`
  - `zoho_sync_logs`
- Local workspace is missing Zoho deployment env vars, so OAuth URL generation cannot fully pass locally:
  - `ZOHO_CLIENT_ID`
  - `ZOHO_CLIENT_SECRET`
  - `ZOHO_ORGANIZATION_ID`
  - `ZOHO_REDIRECT_URI`
  - `APP_URL`
  - `VITE_PUBLIC_APP_URL`
- Live Zoho API calls were not executed locally because there is no local refresh token and network/live credentials are deployment-only.

## Vercel Compatibility Fix

The Vercel deployment was likely serving the Vite `index.html` page for `/api/zoho/config`, `/api/zoho/auth-url`, `/api/zoho/readiness`, and related API paths. That made the frontend try to parse HTML as JSON, causing errors such as `Unexpected token <`.

Fixes added:

- `src/components/ZohoSettingsTab.tsx` now checks `response.ok` and `content-type` before parsing JSON.
- The frontend Zoho helper now reads `response.text()` first and parses JSON only after confirming the body is non-empty JSON.
- Empty OAuth responses now show:

  `The Zoho OAuth endpoint returned an empty response. Please check the backend deployment and Zoho environment variables.`

- HTML/non-JSON OAuth responses now show:

  `The Zoho OAuth endpoint is not returning JSON. This usually means the backend route is missing or the deployment is frontend-only.`

- Non-JSON, empty, unavailable, or failed API responses show:

  `This API endpoint is not available on this deployment. Zoho backend routes may need Cloud Run or Vercel serverless functions.`

- Live Zoho buttons are disabled after the panel detects that the backend is unavailable.
- `api/zoho/[...path].ts` returns JSON for Zoho API paths on Vercel, preventing HTML parse crashes.
- `api/zoho/[...path].ts` can generate the OAuth URL on Vercel from `ZOHO_CLIENT_ID`, `ZOHO_REDIRECT_URI`, and `ZOHO_ACCOUNTS_URL` without exposing `ZOHO_CLIENT_SECRET`.
- `vercel.json` excludes `/api/*` from the SPA rewrite.

The previous fallback has been replaced by a real Vercel serverless implementation. Live testing is still required against the deployed Vercel environment and the actual Zoho organization.

## OAuth Redirect Flow Fix

Connect OAuth now:

- Calls `/api/zoho/auth-url`.
- Accepts either `{ success: true, authUrl: "..." }` or `{ success: true, url: "..." }`.
- Validates that the returned value is an HTTPS URL before opening it.
- Shows a friendly error when OAuth is not configured or the endpoint response is empty/non-JSON.
- Does not expose `ZOHO_CLIENT_SECRET` to the frontend.

Vercel catch-all verification:

- Missing env returned:

  `{ "success": false, "error": "Zoho OAuth is not configured. Missing ZOHO_CLIENT_ID, ZOHO_REDIRECT_URI, or ZOHO_ACCOUNTS_URL." }`

- With test env values, the generated URL included:
  - `client_id`
  - `redirect_uri`
  - `response_type=code`
  - `access_type=offline`
  - Zoho Books scopes

## Needs Real Live Testing

Run these from the deployed app at `Settings -> Zoho Books Integration -> Operations -> Zoho Admin Test Panel`:

1. Check Config
2. Connect OAuth
3. Test Connection
4. Sync Clients
5. Sync Products
6. Export One Test Estimate
7. Export One Test Invoice
8. Pull Payment Status

After each step, check the Zoho audit log table and Firestore `zoho_sync_logs`.

## Manual Vercel API Test

After deploying this version to Vercel, open these URLs directly in the browser and confirm each page displays JSON, not the app HTML page and not an empty response:

- `https://xtreme-signpro-n75zv0vsb-jurie553s-projects.vercel.app/api/zoho/config`
- `https://xtreme-signpro-n75zv0vsb-jurie553s-projects.vercel.app/api/zoho/readiness`
- `https://xtreme-signpro-n75zv0vsb-jurie553s-projects.vercel.app/api/zoho/auth-url`

Expected behavior:

- Missing env vars should return JSON with `success: false` and a friendly `error`.
- Configured OAuth env vars should make `/api/zoho/auth-url` return `success: true` with `authUrl`.
- The response content should begin with `{`, not `<!doctype html>`.

## Zoho Validation Requirements Found

- `ZOHO_REDIRECT_URI` must exactly match the callback URL registered in the Zoho API console.
- Zoho Books region domains must match the same data center:
  - Accounts domain example: `accounts.zoho.com`
  - Books API domain example: `www.zohoapis.com/books/v3`
- Zoho contact creation may require tax/VAT fields depending on the organization's country and tax configuration.
- Zoho item creation may require sales account, tax, inventory, or unit fields depending on Zoho Books organization settings.
- Estimates and invoices should update existing mapped `zohoEstimateId` / `zohoInvoiceId` records to avoid duplicates.
- A completed jobcard export requires a valid mapped or creatable Zoho customer contact.

## Firebase Permission Issues

Local testing confirms the app now reports a friendly Firebase config warning instead of blocking.

Deployment still needs Firestore permission verification for:

- Reading/writing client mappings.
- Reading/writing product item mappings.
- Reading accepted quotes and writing `zohoEstimateId`.
- Reading completed jobs and writing invoice/payment status fields.
- Reading/writing `settings/zoho`.
- Reading/writing secure OAuth state at `zoho_private/state`.
- Writing audit records to `zoho_sync_logs`.

## Files Changed

- `server.ts`
  - Added safe Firestore delete support to the local Firestore wrapper.
  - Added `/api/zoho/readiness`.
  - Added Firebase-missing short-circuit behavior for Zoho config, token, log, and Firestore checks.
  - Added OAuth URL builder reuse for readiness and auth URL generation.
  - Added Firestore readiness timeout fallback.

- `src/components/ZohoSettingsTab.tsx`
  - Added Zoho Admin Test Panel.
  - Added Check Config button.
  - Added Export One Test Estimate and Export One Test Invoice buttons using existing real export handlers.
  - Added readiness result display for redirect URI, Zoho domains, and token storage.
  - Added safe JSON handling for every Zoho frontend API request.
  - Hardened Connect OAuth against empty, invalid, or non-JSON `/auth-url` responses.
  - Added backend-unavailable warning and disables live sync buttons when Vercel does not provide the backend.

- `api/zoho/[...path].ts`
  - Replaced Vercel JSON fallback with one working catch-all serverless Zoho API handler.
  - Added OAuth URL generation and callback token exchange.
  - Added secure token storage in `zoho_private/state`.
  - Added readiness, test connection, client sync, product sync, estimate export, invoice export, payment pull, token status, and disconnect handlers.

- `vercel.json`
  - Updated SPA rewrite so `/api/*` is not rewritten to `index.html`.

- `DEPLOYMENT_NOTES.md`
  - Clarified that Vercel frontend-only deployments do not run the Express Zoho backend.

## Next Manual Steps

1. Open the deployed app.
2. Go to `Settings -> Zoho Books Integration`.
3. Click `Check Config`.
4. Confirm `redirectUri` exactly matches `ZOHO_REDIRECT_URI`.
5. Click `Connect OAuth` and complete Zoho consent.
6. Click `Test Connection`.
7. Run one client sync and one product sync.
8. Accept one real test quote and export one estimate.
9. Complete one real test jobcard and export one invoice.
10. Pull payment status after the invoice exists in Zoho.
11. Confirm all success/failure entries appear in `zoho_sync_logs`.

## Known Limitations

- Full live readiness cannot be proven from this local workspace because deployment-only environment variables are not visible here.
- Zoho organization-specific validation can still reject contacts, items, estimates, or invoices if that Zoho Books organization requires extra tax/account fields.
- Vercel callback returns JSON after token exchange. After OAuth succeeds, close the callback tab and run `Check Config` or `Test Connection` in the Zoho settings panel.
- The Vercel serverless implementation uses the configured Firebase web project values. Firestore rules must allow the serverless runtime to read/write the required collections, or a future Firebase Admin service-account migration will be needed.
- Build still shows Vite's large bundle warning; it is not a build failure.
