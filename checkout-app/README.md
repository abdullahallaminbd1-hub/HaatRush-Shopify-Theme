# HaatRush checkout

The storefront checkout flow uses Shopify's native hosted checkout. The Bengali `/pages/checkout` page is a cart-review step only; it does not collect customer details, create orders, or simulate an order confirmation. Customers continue to `/checkout`, where Shopify applies the store's configured payment, shipping, tax, and discount rules.

## Backend status

The Node.js/PostgreSQL service in this folder is a legacy custom COD implementation and is not used by the current theme. Do not deploy it or configure an app proxy for the native-checkout flow. It requires Shopify credentials, a private app installation, and a durable database; none of those are needed for this storefront path.

Keep all backend credentials out of theme files and source control. The current theme does not call this service.

## Shopify Admin setup

Before promoting the flow to customers, verify the following in the correct HaatRush store:

1. Create or publish a Shopify page with handle `checkout` and assign the `page.checkout` template.
2. Configure Cash on Delivery as an available payment method under Shopify payment settings. Shopify Admin may label this as a manual payment method.
3. Configure shipping rates and delivery zones in Shopify. The review page intentionally does not promise a delivery charge; Shopify checkout displays the configured charge.
4. If offering the 2% bundle saving or free shipping above ৳1,000, configure and test those as actual Shopify discounts/shipping rules. The cart-review progress indicators only show eligibility; actual discounts and charges are reflected by Shopify's cart and checkout.
5. Preview the published theme, proceed from the review page to Shopify checkout, and place a clearly identified test order. Confirm the order and payment method in Shopify Admin before describing checkout as verified.

No Shopify app, Admin API permission, access token, App Proxy, hosting account, or PostgreSQL database is required for this native checkout flow. A manual bKash option should only be configured with the merchant's verified account details and customer payment instructions.
