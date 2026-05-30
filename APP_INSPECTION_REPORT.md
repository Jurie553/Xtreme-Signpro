# App Inspection Report

Inspection date: 2026-05-30

## Summary

The app is a Vite React business management system with Firebase/Firestore storage, a custom Express server for Zoho Books routes, jsPDF document generation, and public approval portals. The main app now builds successfully, typechecks successfully, supports environment-based Firebase setup, generates public approval links from `VITE_PUBLIC_APP_URL`, and avoids sending clients into the internal dashboard layout for token-based approvals.

## What Was Broken

- `npm run typecheck` did not exist.
- `npm run clean` used Unix `rm -rf`, which is not Windows-friendly.
- Firebase frontend configuration was hardcoded through `firebase-applet-config.json`, causing missing-file/import risk and source-controlled project config exposure.
- The server did not read Firebase config from environment variables before initializing Firestore.
- Public sharing used a hardcoded deployed Cloud Run URL, which could send localhost or stale production links depending on deployment.
- Zoho payment reconciliation called an incorrect `/api/pull-payments` endpoint before the correct `/api/zoho/pull-payments` endpoint.
- The dashboard chart used fixed dummy revenue values while claiming live sync.
- The Inventory page had no direct working path to add inventory/material records.
- Google sign-in support existed only as auth state tracking; there was no login action exposed in the header.

## What Is Incomplete

- Vercel deployment is only suitable for the static frontend unless the Zoho Express API is moved into Vercel serverless functions. The current full backend shape fits Cloud Run better.
- Zoho Books requires real OAuth credentials and a server runtime. Browser-only deployment cannot safely call Zoho APIs that need `ZOHO_CLIENT_SECRET`.
- Some advanced modules such as NCR, litho, products, and jobcards are broad and feature-rich, but final pricing/business formulas still need owner validation against real shop rates.
- The Products page includes an admin-role simulation control. It is useful for UI testing but is not real role-based security.

## What Was Using Dummy Data

- Dashboard weekly revenue chart used static Mon-Sun values. It now derives the last seven days from accepted Firestore quotes.
- NCR/litho setup screens include default/mock layer labels and placeholders for guided configuration. They are setup defaults, not live transactional data.
- Header session text still includes cosmetic labels such as `Session-L6`; this is display-only and not used for business logic.

## Unsafe Or Unstable Areas

- Firestore security must be validated in Firebase using `firestore.rules` before live use.
- Zoho credentials must stay server-side only. Do not add `VITE_` prefixes to Zoho secrets.
- Public approval tokens are stored in Firestore and expire/revoke through the app logic. Firestore rules must allow only the intended public token/document update surface.
- Large frontend bundle warning remains after build. It is not app-breaking, but code splitting would improve load time later.
- `npm install` reported 31 dependency vulnerabilities from the current dependency tree. Review with `npm audit` before final production launch.

## Files Changed

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.env.example`
- `firebase-applet-config.json`
- `server.ts`
- `src/App.tsx`
- `src/lib/firebase.ts`
- `src/lib/authContext.tsx`
- `src/lib/sharingService.ts`
- `src/lib/messagingService.ts`
- `src/components/layout/Header.tsx`
- `src/components/ZohoSettingsTab.tsx`
- `src/pages/Inventory.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Clients.tsx`
- `src/types.ts`
- `APP_INSPECTION_REPORT.md`
- `DEPLOYMENT_NOTES.md`
- `TESTING_CHECKLIST.md`

## Manual Setup Still Required

Add real values to local `.env` and deployment environment settings:

- `VITE_PUBLIC_APP_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID` if using a named Firestore database
- `APP_URL`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REDIRECT_URI`
- `ZOHO_ORGANIZATION_ID`
- `ZOHO_ACCOUNTS_URL`
- `ZOHO_BOOKS_API_URL`

## Validation Results

- `npm install --cache .\.npm-cache` succeeded after network/cache permission approval.
- `npm run build` succeeded.
- `npm run lint` succeeded.
- `npm run typecheck` succeeded.
- `npm run dev` starts the local Express/Vite server, but it requires real Firebase environment values for live data operations.
