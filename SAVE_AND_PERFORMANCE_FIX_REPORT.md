# Save And Performance Fix Report

Date: 2026-06-01

## Summary

This pass focused on save reliability, clearer Firestore errors, duplicate-save prevention, and reducing repeated Firestore listeners/calculations that made the app feel slow.

## What Was Causing Slowness

- Multiple screens subscribed to the same Firestore collections independently, especially `clients`, `quotes`, `jobs`, `products`, `materials`, and settings collections.
- Dashboard metrics recalculated several filtered/sorted datasets on every render.
- Quotes and Jobs repeatedly scanned the full clients list for each row.
- Quotes page logged large collections to the console during filtering.

## What Was Causing Save Failures

- Firestore write helpers accepted undefined values, which can cause writes to fail.
- Some update/delete operations did not validate missing document IDs before calling Firestore.
- Some forms allowed double-click duplicate saves.
- Some forms showed generic success or closed after save without checking for returned document IDs.
- Some status/stage quick updates did not show a failure toast when Firestore rejected the write.
- Firebase missing configuration could fail late instead of showing a clear save-related error.

## Files Changed

- `src/lib/firestoreService.ts`
  - Added Firebase readiness checks before reads/writes.
  - Added deep sanitization to remove `undefined` values before Firestore writes.
  - Added automatic `updatedAt` and create-time `createdAt` audit fields.
  - Added missing ID validation for update, set, get, and delete operations.
  - Added shared collection subscription cache to reduce duplicate listeners for the same collection.

- `src/pages/Clients.tsx`
  - Prevented duplicate submit while saving.
  - Added required field validation.
  - Added confirmed success message after Firestore write.
  - Improved save failure message.

- `src/components/QuoteModal.tsx`
  - Prevented duplicate quote save clicks.
  - Added client and line-item validation.
  - Improved save failure message.
  - Confirms new quote document ID before showing success.

- `src/components/JobModal.tsx`
  - Prevented duplicate job save clicks.
  - Confirms new job document ID before showing success.
  - Improved save failure message.

- `src/pages/Products.tsx`
  - Prevented duplicate product saves.
  - Confirms new product document ID before showing success.
  - Logs technical errors and shows a friendly failure message.

- `src/pages/Settings.tsx`
  - Prevented double-click duplicate saves on pricing, company, and jobcard settings.

- `src/pages/Quotes.tsx`
  - Removed noisy console logging during filtering.
  - Memoized client lookup map.
  - Added success/error feedback for quote status changes.

- `src/pages/Jobs.tsx`
  - Memoized client lookup map, filtered jobs, and sorted jobs.
  - Added success/error feedback for job stage changes.

- `src/pages/Dashboard.tsx`
  - Memoized dashboard metric, chart, due-soon, and recent activity calculations.

## Forms Fixed

- Add/Edit Client
- Add/Edit Quote
- Add/Edit Jobcard
- Add/Edit Product
- Settings save actions
- Quote status update
- Job stage update

The shared Firestore fixes also improve reliability for forms using `createDocument`, `updateDocument`, `setDocument`, and `deleteDocument`, including materials/inventory, NCR books, litho products, suppliers, machines, departments, packages, public approvals, and Zoho settings.

## Tests Passed

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run build:vercel` passed.

## Manual Checks Still Needed

Run these against the deployed app with real Firebase configuration:

1. Create a client, reload, and confirm it remains saved.
2. Edit the same client, reload, and confirm changes remain.
3. Create a product, reload, and confirm it remains saved.
4. Edit the same product, reload, and confirm changes remain.
5. Create a material/inventory item, reload, and confirm it remains saved.
6. Edit the same material, reload, and confirm changes remain.
7. Create a quote with line items, reload, and confirm quote and items remain.
8. Edit the quote, reload, and confirm changes remain.
9. Convert a quote to a jobcard.
10. Save the jobcard, reload, and confirm it remains saved.
11. Update jobcard stage, reload, and confirm the stage remains.
12. Save pricing/company/jobcard settings, reload, and confirm values remain.
13. Test saving while offline or with blocked Firestore access and confirm the app shows a clear error.

## Firebase Rules Or Environment Issues

This local workspace does not have live deployment Firebase credentials, so persistence reload testing could not be completed locally.

If saves still fail on the live deployment, check:

- All `VITE_FIREBASE_*` values are set in Vercel.
- Firestore rules allow authenticated staff users to read/write the needed collections.
- The app is using the correct Firestore database ID, especially if using a named database.
- Browser console for Firestore errors such as `permission-denied`, `unavailable`, or invalid data fields.

## Remaining Limitations

- The app still loads some broad collections on operational screens. The new shared listener cache reduces duplicate listeners, but true pagination/query limits would require a deeper screen-by-screen data model pass.
- Build still reports Vite's large bundle warning; it is not a build failure.
