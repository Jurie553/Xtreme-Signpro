# Testing Checklist

## Local Setup

- Run `npm install`.
- Create `.env` from `.env.example`.
- Add Firebase web config values.
- Set `VITE_PUBLIC_APP_URL` to the deployed origin for production link testing.
- Run `npm run dev`.

## Manual Workflow Tests

- Login with Google from the header.
- Confirm dashboard loads live Firestore data.
- Add a client with company name, contact person, email, phone, WhatsApp number, billing address, VAT number, and optional Zoho customer ID.
- Search, edit, and delete a client.
- Import a client CSV and confirm row-level errors are visible for invalid rows.
- Add a product from Products and confirm it saves to Firestore.
- Edit and archive/delete a product.
- Add a material from Materials or Inventory > Add Inventory Item.
- Confirm inventory shows stock quantity, reorder level/min stock, unit, cost, supplier, and category fields.
- Create a quote with a client and line items.
- Select a product, quantity, width, and length, then confirm square meter pricing updates.
- Enter manual pricing and confirm it does not receive a hidden extra markup unless intended.
- Toggle express surcharge and confirm VAT/profit totals.
- Save the quote and generate a quote PDF.
- Share the quote by WhatsApp and email.
- Open the quote approval link in a private/incognito browser without login.
- Approve or reject the quote and confirm Firestore status updates.
- Convert an accepted quote to a jobcard.
- Create a jobcard manually.
- Add NCR book details including size, layers, layer colours, paper type, numbering, perforation, binding, sets per book, quantity, print colour, and finishing notes.
- Confirm NCR details appear on the jobcard and jobcard PDF.
- Add litho details including paper type, paper size, quantity, finished size, flat size, pages, sides, colour option, finishing, setup, print cost, finishing cost, markup, VAT, and total.
- Upload or attach artwork/proof to a job.
- Send proof approval by WhatsApp and email.
- Open `/public/approval/:token` without login and confirm no dashboard/sidebar appears.
- Approve/reject the proof and confirm job artwork status updates in Firestore.
- Generate a clean jobcard PDF.
- Move jobs on the production board and confirm Firestore saves the stage/department update.
- Mark a job completed.
- Push quote/job to Zoho Books if Zoho is configured.
- Confirm clear “Zoho Books is not configured yet” messaging if Zoho variables are missing.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Deploy and repeat public approval link tests using the production URL.
