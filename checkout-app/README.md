# HaatRush COD checkout service

This service creates real, unpaid Cash-on-Delivery orders through Shopify's Admin GraphQL `orderCreate` mutation. It is not a payment processor and does not use the Neo COD Form app or Shopify's hosted checkout. The app proxy validates storefront requests, and a PostgreSQL unique key prevents the same submission from creating more than one order.

The service re-queries current variant availability, stock, and BDT prices before every quote and again before order creation. Shopify claims inventory using `DECREMENT_OBEYING_POLICY`. It computes delivery from the selected district, gives free shipping only when the product subtotal is strictly greater than ৳1,000, and passes a 2% item percentage discount only when the cart contains at least two units. The discount uses the documented `orderCreate.discountCode.itemPercentageDiscountCode` input; automatic Shopify discounts are not assumed to run.

## Bangladesh location data

`locations.json` supplies the Bengali-labeled 8 divisions, 64 districts, and 500 Upazilas used by the dependent checkout dropdowns. The matching `assets/locations.json` copy is loaded by the storefront so customers can select a delivery area before the checkout backend is deployed; keep both files in sync. Its base hierarchy is adapted from [bangladesh-geo-json](https://github.com/iqbalhasandev/bangladesh-geo-json), which compiles [bd-apis](https://github.com/SudipMHX/bd-apis) and [Bangladesh GEOJSON](https://github.com/ifahimreza/bangladesh-geojson). Because the database incorporates ODbL-licensed source data, the compiled location database is made available under the [Open Data Commons Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The five Upazilas approved in May 2026 are included from the bilingual records in the [Bangladesh Locations Dataset](https://github.com/HedaetShahriar/bangladesh-locations-dataset). Please update this data when official administrative boundaries or names change.

## Required Shopify setup

Create and install a Shopify app for the HaatRush store. Configure:

- **Offline Admin API access token**. `orderCreate` requires an app authenticated with an offline token.
- **Admin API scopes**: `write_orders`, `read_products`, `read_inventory`, and `write_customers`.
- **App proxy**: prefix `apps`, subpath `haatrush-checkout`, proxy URL `https://<deployed-app-host>/proxy`.
- **Shared app secret**: store as `SHOPIFY_API_SECRET` on the backend only.
- **Shop canonical domain**: the `*.myshopify.com` domain, not the public storefront domain.

The service accepts only signed app-proxy requests from the configured shop. Never put the Admin API token, app secret, quote-signing secret, or database credentials in theme settings, Liquid, browser JavaScript, or a committed environment file.

Shopify's `orderCreate` accepts one discount code/adjustment per order. To avoid implying that unsupported extra coupon codes will be honored, the theme's manual discount-code inputs are removed from the cart. The custom order applies the specified 2% bundle discount when eligible.

## Required hosting setup

Deploy this folder as a Node.js 20+ service with a durable PostgreSQL database. The database must persist across restarts and be reachable over TLS where supported. Configure these server-side environment variables:

| Variable | Value |
| --- | --- |
| `PORT` | Port supplied by the host (defaults to `3000`) |
| `SHOPIFY_SHOP_DOMAIN` | HaatRush canonical `*.myshopify.com` domain |
| `SHOPIFY_API_SECRET` | Shopify app shared secret |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Installed app's offline Admin API token |
| `SHOPIFY_API_VERSION` | Supported Admin GraphQL version (defaults to `2026-10`) |
| `QUOTE_TOKEN_SECRET` | Independent random secret, at least 32 bytes |
| `DATABASE_URL` | PostgreSQL connection URL |

Use the host's secret manager for credentials. Do not commit `.env`; only `.env.example` is tracked. The app starts only when the required configuration is present and creates its idempotency table at startup.

## Install, test, run

```sh
npm install
npm test
npm start
```

`GET /healthz` is a non-sensitive liveness endpoint. Shopify storefront traffic must use the app proxy at `/apps/haatrush-checkout`; do not expose an unauthenticated Admin API endpoint.

## Theme activation

1. Deploy and install the app, grant the scopes, set the app proxy, and configure the backend secrets/database.
2. In Shopify Admin, create a page with handle `checkout` and assign the `page.checkout` template.
3. Publish the theme changes. Cart and product pages now direct customers to this Bengali COD checkout.
4. Confirm that `https://<store>/apps/haatrush-checkout/config` returns the division, district, and Upazila lists through the configured app proxy.

If the app proxy is unavailable, the form disables submission and reports that no order was placed. It never falls back to a simulated success or the standard Shopify checkout.

## Real-order verification

Automated tests cover rule boundaries and validation but do not create Shopify orders. Before enabling this checkout for customers, submit a clearly identified COD test order in the store and verify in Shopify Admin that its line items, customer/address, discount, shipping line, inventory behavior, pending financial status, and total are correct. The API uses `sendReceipt: false`; the storefront displays confirmation only after Shopify confirms order creation. Cancel/restock the test order according to the store's process.

An interrupted Admin API request is deliberately left in a `processing` state because Shopify might have created the order even if the response was lost. The same submission ID is never sent to `orderCreate` twice. Reconcile such a submission in Shopify Admin before taking any retry action.
