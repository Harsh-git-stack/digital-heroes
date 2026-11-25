# PrintForge

Digital Heroes web-to-print MVP built with Next.js, React and Supabase.

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Set the environment values in `.env.local` before testing integrations:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service role key |

Never prefix the service-role key with `NEXT_PUBLIC_`, commit it, or paste it into chat.

## Supabase setup

1. Run the complete `supabase/schema.sql` in the Supabase SQL Editor. It creates/updates tables, RLS policies, storage rules, RPC functions and starter templates. Re-run it after schema changes.
2. Register a customer through `/login`; confirm the account in Supabase Auth if email confirmation is enabled.
3. If you need an admin account, promote only your own test profile in SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-test-account@example.com';
   ```

4. Sign in again before opening `/admin`.

The `artwork` bucket is private and limited to 15 MB per upload. The service-role key is used only by server route handlers.

## Authentication and authorization

Sign-up and sign-in use Supabase Auth. Supabase manages the password, session refresh and access JWT; the app does not mint or store its own JWT. After sign-in, the app reads the signed-in user’s `profiles.role` and routes admins to `/admin` and customers to `/account`.

The client-side route check is for navigation and user experience, not the security boundary. Row-level security protects customer/admin data, database RPCs check ownership or admin role for writes, and server routes verify the Supabase access token before using the service-role key. New profiles default to `customer`; admin status must be assigned explicitly by a trusted project owner.

## Admin tools

The admin dashboard includes a customer directory with order totals and editable customer name/company fields; role changes are not available in the dashboard. Product records can be created, edited and deactivated. The storefront reads active products from Supabase, including their size/material/price configuration.

Admins can create and publish customer design presets (`text`, `color`, `font_size`, and `position`) and production specifications (`bleed_mm`, `dpi`). Active design presets are available to public visitors in the configurator. The selected production specification is snapshotted when a quote is created, so later template edits do not change existing orders. CSV reports export the currently filtered orders.

## Payments

Online payments, including Razorpay, are **not implemented**. Customers see that online checkout is unavailable and must arrange payment externally with the print team. An administrator may record a payment only after it has actually been received, selecting its method and entering a transaction or receipt reference. The database records the admin and timestamp; customers cannot mark their own orders as paid. No payment credentials or gateway configuration are needed for this manual workflow.

## MVP workflow

1. Configure a product and save a quote; optional artwork uploads with the quote.
2. The customer contacts the print team to arrange an external payment.
3. After receiving payment, an admin records its method and transaction/receipt reference in the production queue.
4. An admin uploads a proof version; the customer can preview it and approve it or request changes.
5. The admin advances a paid, proof-approved order to production and generates PDF, PNG and CSV files.

Production-file output currently uses 3 mm bleed and 300 DPI PNG, with a 40-megapixel image ceiling and a 50,000-row CSV ceiling. PNG/JPG/SVG artwork can be composed with the designer text; PDF/AI uploads are retained as separate original downloads. CSV output repeats the current design text for each numbered item.

These are MVP outputs, not certified prepress files: color profiles, embedded fonts, spot colors, product-specific dielines, and validation against a print vendor’s machine specs still require production review.

## Validation

```powershell
npm run lint
npm run build
```
