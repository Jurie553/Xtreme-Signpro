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
- Vercel config file: `vercel.json` contains only the SPA rewrite to `index.html`

`vercel.json` intentionally does not declare `functions`, `builds`, or any `runtime`. The project has no `api/` function directory, and function runtime configuration can cause Vercel to fail before build with `Function Runtimes must have a valid version`.

The existing Zoho Express API in `server.ts` is not executed by Vercel static hosting. Zoho OAuth, client sync, invoice push, and payment pull require Cloud Run or a future conversion of the Express routes into Vercel serverless functions under an `api/` directory.

For full end-to-end operation with Zoho, use Cloud Run or migrate the backend routes first.
