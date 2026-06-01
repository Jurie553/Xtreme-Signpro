# Deployment Notes

## Recommended Deployment

Use Cloud Run for the full app because the project has a custom Express server in `server.ts` for Zoho Books OAuth and API routes.

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

The static frontend can deploy to Vercel with the Vite framework preset.

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build:vercel` or `npm run build` if you also want the unused Cloud Run server bundle generated
- Output directory: `dist`
- Vercel config file: `vercel.json` rewrites non-API routes to `index.html` for the SPA and leaves `/api/*` available for serverless functions.

Vercel frontend-only deployment works for the app UI, Firebase client-side screens, routing, quotes, jobcards, products, inventory, approvals, and PDFs that do not require the custom Express server.

The existing Zoho Express API in `server.ts` is not executed by Vercel static hosting. Zoho OAuth, client sync, product sync, estimate export, invoice export, and payment pull require Cloud Run unless the Express routes are fully converted into Vercel serverless functions under the `api/` directory.

This repo includes a lightweight Vercel fallback at `api/zoho/[...path].ts`. It intentionally returns JSON with a friendly `503` message instead of allowing Vercel to return the Vite HTML page for `/api/zoho/*`. That prevents frontend JSON parsing crashes, but it does not perform live Zoho sync.

For full end-to-end operation with Zoho, use Cloud Run or migrate the backend routes first.

## Vercel JSON Parse Error Fix

If the app shows this message:

`This API endpoint is not available on this deployment. Zoho backend routes may need Cloud Run or Vercel serverless functions.`

then the frontend is working, but the live Zoho backend is not available in that Vercel deployment.

Use one of these deployment choices:

1. Deploy the full app to Cloud Run using `npm run build` and `npm start`.
2. Keep Vercel as frontend-only and do not use live Zoho sync there.
3. Convert the required Express endpoints in `server.ts` into real Vercel functions under `api/`.
