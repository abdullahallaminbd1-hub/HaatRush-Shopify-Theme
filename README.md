# HaatRush Shopify Theme

A responsive Online Store 2.0 theme for a Bangladesh-focused electronics shop. Product names, images, variants, availability, and prices come from Shopify catalog data; the theme does not include a sample inventory.

## Theme setup

1. Upload this folder as a theme in **Shopify Admin → Online Store → Themes**. Keep it unpublished while configuring.
2. Add products and create the collections that you want to feature. Select the homepage collections and optional hero image/product in the theme editor.
3. Add a Shopify navigation menu and select it in the header section. Set the footer menus, logo, support details, and social links in the theme editor.
4. Create a page titled **Checkout** with the handle `checkout`, then assign the `page.checkout` template. The page provides the reference-style address form, live cart summary, COD presentation, and district-based delivery estimate.
5. Enable **Cash on Delivery** under Shopify payment settings if COD should be available in the native checkout. Shopify's native checkout remains responsible for creating orders and sending Shopify notifications.
6. Configure actual delivery rates in Shopify shipping settings or with a shipping app. Theme code can display the requested estimate (৳70 for Dhaka Division + Dhaka District; ৳130 for every other selected district), but cannot create or charge Shopify shipping rates. The estimate is not shown until a district is selected, and the selected address is passed to native Shopify checkout.

The checkout call-to-action validates the required address fields and hands the customer to Shopify checkout; it does not create a fake order-success state. Native checkout is not theme-customized, and Shopify controls checkout-specific payment, shipping, and notification behavior.

## Validation

Run Shopify Theme Check from this directory:

```powershell
shopify theme check --path .
```

Previewing with `shopify theme dev` requires an authorized Shopify development store. It creates a development theme, not a live published theme.
