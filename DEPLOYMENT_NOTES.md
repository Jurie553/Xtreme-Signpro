# Deployment Notes

## Recommended Deployment

Vercel can now run the app UI and the Zoho serverless API routes under `/api/zoho/*`.

Cloud Run remains supported for the custom Express server in `server.ts`, but it is no longer the only option for Zoho OAuth and sync.

## Cloud Run Build Settings

- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm start`
- Output directory: `dist`
- Local dev command: `npm run dev`

## Required Environment Variables

Frontend/public:

- `VITE_PUBLIC_APP_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`

Server/private:

- `APP_URL`
- `GEMINI_API_KEY`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REDIRECT_URI`
- `ZOHO_ORGANIZATION_ID`
- `ZOHO_ACCOUNTS_URL=https://accounts.zoho.com`
- `ZOHO_BOOKS_API_URL=https://www.zohoapis.com/books/v3`

## Firebase Setup

1. Create or select the Firebase project.
2. Enable Google Authentication if using the header sign-in button.
3. Enable Firestore and confirm whether the app uses the default database or a named database.
4. Add the Firebase web app config values to `.env` locally and to Cloud Run/Vercel environment settings.
5. Deploy and verify `firestore.rules` match your live access requirements.

## Public App URL

Set `VITE_PUBLIC_APP_URL` to the deployed app origin, for example:

`https://your-service-url.run.app`

This value is used for WhatsApp, email, quote approval, proof approval, and client-facing links.

## Zoho Books Setup

Zoho API calls that require `ZOHO_CLIENT_SECRET` must run on the backend/serverless runtime, not directly in the browser.

1. Create a Zoho API Console client.
2. Set the redirect URI to `${APP_URL}/api/zoho/callback` or the exact value in `ZOHO_REDIRECT_URI`.
3. Add the Zoho variables listed above to the server runtime.
4. Open Settings > Zoho Books Integration and authorize the connection.
5. If Zoho is not configured, the app should show a clear configuration message instead of crashing.

## Vercel Compatibility

The frontend and Zoho serverless API can deploy to Vercel with the Vite framework preset.

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build:vercel` or `npm run build` if you also want the unused Cloud Run server bundle generated
- Output directory: `dist`
- Vercel config file: `vercel.json` rewrites non-API routes to `index.html` for the SPA and leaves `/api/*` available for serverless functions.

Vercel deployment works for the app UI, Firebase client-side screens, routing, quotes, jobcards, products, inventory, approvals, PDFs, and the Zoho serverless routes in `api/zoho/[...path].ts`.

The existing Zoho Express API in `server.ts` is not executed by Vercel static hosting. Vercel uses `api/zoho/[...path].ts` instead. Keep both implementations aligned if future Zoho behavior changes.

The Vercel implementation uses one catch-all serverless function at `api/zoho/[...path].ts`. This keeps the project within the Vercel Hobby plan function limit while still serving all Zoho routes through `/api/zoho/...`.

The single catch-all implements:

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
- `/api/zoho/token`
- `/api/zoho/disconnect`

The catch-all reads the route from Vercel's `req.query.path` and also falls back to parsing `req.url`. This is important because some deployments can invoke the catch-all without preserving the final route segment in `query.path`.

## Vercel Zoho Requirements

For Zoho OAuth and sync on Vercel, set these variables in Vercel Project Settings:

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_ORGANIZATION_ID`
- `ZOHO_REDIRECT_URI`
- `ZOHO_ACCOUNTS_URL`
- `ZOHO_BOOKS_API_URL`
- Firebase `VITE_FIREBASE_*` variables

Set `ZOHO_REDIRECT_URI` to the exact deployed Vercel callback URL, for example:

`https://your-vercel-domain.vercel.app/api/zoho/callback`

The callback route returns JSON after saving tokens. After Zoho authorization succeeds, close the callback tab and return to Settings > Zoho Books Integration, then click `Check Config` or `Test Connection`.

## Vercel JSON Parse Error Fix

The frontend uses safe JSON handling for Zoho calls and the Vercel API route always returns JSON. Empty, HTML, or missing route responses should show a friendly message instead of crashing.
