# HaatRush custom Bengali checkout

The theme's `/pages/checkout` page is the customer-facing Bengali COD checkout form. It sends product variants, customer delivery details, and the chosen payment method through Shopify's signed App Proxy to `worker.mjs`. The Cloudflare Worker checks Shopify's current catalog and inventory, recalculates the quote, and creates the order through Shopify Admin GraphQL `orderCreate`. The form does not send customers to Shopify's hosted checkout.

## Data handling and free-tier resources

Shopify is the only system of record for customer and order data. Cloudflare D1 is used only as an idempotency ledger to prevent duplicate order creation and safely reconcile interrupted requests. It stores a random submission ID, an HMAC request fingerprint, status, Shopify order ID/name, and non-identifying totals. It does not store customer names, phone numbers, addresses, or product-line payloads.

The intended deployment uses **Workers Free** and **D1 Free** only. Cloudflare currently documents the Free limits as 100,000 Worker requests/day and 10 ms CPU time/invocation, plus 5 million D1 rows read/day, 100,000 rows written/day, and 5 GB total D1 storage. If a limit is reached, order submission should fail safely; do not upgrade to a paid plan or create a paid resource without the store owner's approval. D1 data is retained for idempotency; never delete `processing` records without reconciling their Shopify order status first.

The previous Express/PostgreSQL files in this folder are legacy reference/tests only. They are not part of the Worker deployment and must not be started or deployed for this flow.

## Shopify app and permissions required

Create/install an app for the **confirmed HaatRush Shopify store** and issue an offline Admin API access token with these scopes:

- `write_orders` — create Shopify orders.
- `read_products` — look up variant titles, prices, and availability.
- `read_inventory` — validate tracked stock before order creation.
- `write_customers` — upsert the customer's name and phone on the order.

Configure the Shopify app's App Proxy:

| Setting | Value |
| --- | --- |
| Subpath prefix | `apps` |
| Subpath | `haatrush-checkout` |
| Proxy URL | `https://<worker-name>.<workers-subdomain>.workers.dev/proxy` |

The Worker validates Shopify's App Proxy signature with the app's shared secret. Keep that app secret and the offline Admin API token in Cloudflare Worker secrets only. Never put them in Shopify theme settings, Liquid, browser JavaScript, committed files, or D1.

The storefront order form currently collects name, phone, and delivery address but no email. Shopify can create an order without email; a customer email receipt cannot be delivered unless an email field is added and collected. Verify the store's normal staff order notification behavior with the real test order.

## Cloudflare setup (no paid plan)

Use a Cloudflare account with Workers Free enabled. Do not select or upgrade to Workers Paid, add paid billing, attach a paid product, or configure a custom domain for this Worker. The `workers.dev` endpoint and D1 are sufficient.

From this folder:

1. Authenticate Wrangler to the intended Cloudflare account and confirm it is the right account:

   ```sh
   npm install
   npx wrangler login
   npx wrangler whoami
   ```

2. Create the D1 ledger on the Free plan:

   ```sh
   npx wrangler d1 create haatrush-checkout
   ```

   Copy the returned database ID into `wrangler.toml` at `d1_databases.database_id`. Do not use a database belonging to another project.

3. Apply the minimal schema and set server-only secrets:

   ```sh
   npx wrangler d1 migrations apply haatrush-checkout --remote
   npx wrangler secret put SHOPIFY_API_SECRET
   npx wrangler secret put SHOPIFY_ADMIN_ACCESS_TOKEN
   npx wrangler secret put QUOTE_TOKEN_SECRET
   ```

   `QUOTE_TOKEN_SECRET` must be a new, independent random value at least 32 bytes long. Enter secrets only at Wrangler's interactive prompt; do not put them on a command line or in a file.

4. Set `SHOPIFY_SHOP_DOMAIN` in `wrangler.toml` to the confirmed canonical `*.myshopify.com` domain. The API version is set to `2026-10`. Keep `BKASH_ENABLED = "false"` until the merchant number/instructions are confirmed and configured in both Shopify theme settings and Worker variables.

5. Verify the generated `workers.dev` URL, then deploy:

   ```sh
   npx wrangler deploy
   ```

   Configure the Shopify App Proxy URL from the deployed endpoint, ending in `/proxy`. Run the migration and deploy only while Wrangler shows the correct account and Free plan. Stop if Cloudflare asks to upgrade or attach a paid resource.

## Health and safe verification

- `GET https://<worker>.workers.dev/healthz` is a public liveness check only.
- `GET https://<store>/apps/haatrush-checkout/health` (through Shopify's configured App Proxy) checks the D1 binding, Shopify Admin API access, BDT currency, product access, and inventory access. It must return `200` before enabling order submission.
- A signed `/config` and a real `/quote` call verify the App Proxy signature and catalog lookup. `write_orders` cannot be proved without creating an order; do not create a test order until the correct store and permissions are confirmed.
- After deployment, verify location selection, Dhaka Metropolitan Area delivery at ৳70, outside-Dhaka delivery at ৳130, the strict `> ৳1,000` free-shipping threshold, and the 2% discount at two or more units.
- Only the Shopify `orderCreate` response permits the page to show success. An uncertain response remains `processing` in D1 and must be reconciled in Shopify Admin before retrying; the same submission ID is never sent to order creation twice.

## bKash

Manual bKash is hidden by default. The theme section can display it only after a verified merchant number and customer instructions are entered in the section settings, and the Worker must also have `BKASH_ENABLED = "true"`. No merchant account information was available when this code was prepared, so bKash is not enabled by default. This is a manual, pending-payment order, not a bKash payment gateway or payment confirmation.

## Real-order acceptance check

The automated tests use mocked Shopify responses and do not create real orders. Before promoting the custom form:

1. Confirm the Shopify shop identity and app installation/scopes.
2. Confirm the Worker uses the same shop and the App Proxy health check succeeds.
3. Create one clearly identified test COD order through the form.
4. Verify its line items, customer/address, pending payment transaction, discount, shipping, total, inventory behavior, and notification behavior in Shopify Admin → Orders.
5. Cancel/restock the test order using the store's normal process.

Do not describe checkout as operational until the real order is visible and verified in Shopify Admin.
