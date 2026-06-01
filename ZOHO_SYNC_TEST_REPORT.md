# Zoho Sync Test Report

Date: 2026-06-01

## Summary

Zoho sync readiness was improved with a dedicated backend readiness endpoint and an admin test panel in the Zoho settings area.

Local code checks pass. Live Zoho/Firebase checks still need to be run in the deployed app because the Zoho and Firebase server environment variables are configured in deployment settings, not in this local workspace.

## What Passed

- `npm run typecheck` passed.
- `npm run lint` passed. This project currently maps lint to `tsc --noEmit`.
- `npm run build` passed.
- `/api/zoho/config` returns friendly JSON and does not expose the client secret.
- `/api/zoho/auth-url` returns a friendly missing-client-id warning locally instead of crashing.
- `/api/zoho/readiness` now returns friendly JSON instead of hanging when local Firebase config is missing.
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
- Build still shows Vite's large bundle warning; it is not a build failure.
