# HaatRush — Shopify OS 2.0 Theme

> বিশ্বস্ত ইলেকট্রনিক্স সঙ্গী

A complete Shopify OS 2.0 theme purpose-built for Bengali-language electronics e-commerce in Bangladesh. HaatRush delivers a fully localized, mobile-first shopping experience with Cash on Delivery, Bangladesh-specific location cascading (Division → District → Upazila), and a bold orange-and-teal brand identity.

---

## ✨ Features

- **Full Bengali Language Support** — Every label, button, and message is in Bengali (bn locale). No English fallback needed.
- **Custom Bengali COD Checkout** — Customer details are validated by a Cloudflare Worker and confirmed orders are created in Shopify Admin.
- **Bangladesh Location Cascade** — Division → District → Upazila / Thana dropdown hierarchy for accurate delivery addresses.
- **Bangladesh Delivery Rules** — ৳70 in Dhaka Metropolitan Area, ৳130 outside it, with free shipping above ৳1,000.
- **Responsive / Mobile-First Design** — Optimized for mobile shoppers, the primary device segment in Bangladesh.
- **Shopify OS 2.0 Architecture** — JSON templates, section-everywhere support, and full Theme Editor integration.
- **Announcement Bar** — Highlight promotions, free shipping thresholds, or special offers.
- **Trust Badges Section** — Build buyer confidence with trust signals throughout the store.
- **Product Quick-Order** — Streamlined product pages with inline order forms.
- **Collection Filtering & Sorting** — Filter by product type, price range, and availability; sort by price, name, or date.
- **Related Products** — Automatically display related products on product pages.
- **Social Media Integration** — Facebook, YouTube, Instagram, and WhatsApp links configurable from settings.
- **SEO Optimized** — Clean semantic HTML with proper meta tags and structured data support.

---

## 📁 File Structure

```
HaatRush/
├── assets/
│   ├── theme.css                  # Main stylesheet
│   └── theme.js                   # Main JavaScript
├── config/
│   ├── settings_schema.json       # Theme settings definition
│   └── settings_data.json         # Default settings values
├── layout/
│   └── theme.liquid               # Main layout template
├── locales/
│   └── bn.default.json            # Bengali translations (default)
├── sections/
│   ├── announcement-bar.liquid    # Top announcement bar
│   ├── header.liquid              # Site header & navigation
│   ├── footer.liquid              # Site footer
│   ├── trust-badges.liquid        # Trust badges strip
│   ├── hero-banner.liquid         # Homepage hero/banner
│   ├── featured-deals.liquid      # Today's deals section
│   ├── popular-products.liquid    # Popular products grid
│   ├── collection-filter.liquid   # Collection filter sidebar
│   ├── collection-grid.liquid     # Collection product grid
│   ├── product-main.liquid        # Product detail & order form
│   ├── product-description.liquid # Product description tabs
│   ├── related-products.liquid    # Related products carousel
│   ├── checkout-form.liquid       # COD checkout / cart form
│   └── main-page.liquid           # Generic page content
├── snippets/
│   ├── product-card.liquid        # Reusable product card
│   └── price.liquid               # Price display helper
├── templates/
│   ├── index.json                 # Homepage template
│   ├── collection.json            # Collection page template
│   ├── product.json               # Product page template
│   ├── cart.json                   # Cart / checkout template
│   └── page.json                  # Generic page template
└── README.md
```

---

## 🚀 Installation

### Upload to Shopify Admin

1. **Compress** the entire theme folder into a `.zip` file.
2. Log in to your **Shopify Admin** dashboard.
3. Navigate to **Online Store → Themes**.
4. Click **Add theme → Upload zip file**.
5. Select the HaatRush `.zip` file and upload.
6. Once uploaded, click **Customize** to open the Theme Editor.
7. Configure your logo, colors, contact info, and delivery charges.
8. Click **Publish** when ready to go live.

### Shopify CLI (Development)

```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Clone the theme to a local directory
cd HaatRush

# Start local development server
shopify theme dev --store your-store.myshopify.com

# Push theme to your store
shopify theme push
```

---

## 🎨 Design Tokens

| Token               | Value       | Usage                                      |
| -------------------- | ----------- | ------------------------------------------ |
| `primary_color`      | `#2563EB`   | CTA buttons, highlights, sale badges       |
| `header_color`       | `#0F172A`   | Header background, footer, dark accents    |
| White                | `#FFFFFF`   | Page backgrounds, card surfaces            |
| Light Blue           | `#EFF6FF`   | Section backgrounds, input fields          |
| Text Dark            | `#0F172A`   | Body text, headings                        |
| Text Muted           | `#64748B`   | Secondary text, descriptions               |
| Success Green        | `#28A745`   | In-stock badges, success messages          |
| Danger Red           | `#DC3545`   | Out-of-stock, error messages               |

### Typography

- **Headings and body**: Self-hosted `'Noto Sans Bengali'` with `'Hind Siliguri'` fallback
- **Base size**: 16px
- **Line height**: 1.6 for Bengali text readability

---

## ⚙️ Customization Guide

### Theme Editor Settings

All settings are accessible from **Shopify Admin → Online Store → Themes → Customize**:

#### Logo & Branding
- Upload your store logo (image picker)
- Set fallback logo text (default: "HaatRush")
- Configure tagline (default: "বিশ্বস্ত ইলেকট্রনিক্স সঙ্গী")

#### Colors
- **Primary Color** — Used for buttons, links, sale badges. Default: `#2563EB` (blue).
- **Header Color** — Used for header and footer backgrounds. Default: `#0F172A` (navy).

#### Contact Information
- Support phone number
- Support email address
- Physical address (displayed in footer)

#### Social Media
- Facebook page URL
- YouTube channel URL
- Instagram profile URL
- WhatsApp number (for click-to-chat)

#### Delivery Settings
- Inside Dhaka delivery charge (default: ৳70)
- Outside Dhaka delivery charge (default: ৳130)

### Adding New Sections

HaatRush uses Shopify OS 2.0's JSON templates, so you can add, remove, and reorder sections directly from the Theme Editor without touching code.

### Modifying Translations

Edit `locales/bn.default.json` to change any Bengali text string used throughout the theme.

### Adding New Templates

Create new JSON files in the `templates/` directory following the OS 2.0 pattern:

```json
{
  "sections": {
    "main": { "type": "your-section-name", "settings": {} }
  },
  "order": ["main"]
}
```

Then create the corresponding section file in `sections/`.

---

## 🇧🇩 Localization

The theme ships with Bengali (`bn`) as the default and only locale. All UI strings are stored in `locales/bn.default.json` and accessed in Liquid via:

```liquid
{{ 'general.add_to_cart' | t }}
{{ 'general.showing_products' | t: count: collection.products_count }}
```

To add additional languages, create new locale files (e.g., `en.json`) in the `locales/` directory.

---

## 📦 Delivery & Checkout

HaatRush is designed around the Bangladeshi e-commerce workflow:

1. Customer browses products and adds to cart
2. Cart page displays an inline checkout form (no separate checkout page needed)
3. Customer fills in name, phone, and address using the Division → District → Upazila cascade
4. Delivery charge is auto-calculated based on whether the address is inside or outside Dhaka
5. Order is placed as Cash on Delivery
6. Confirmation message is displayed

---

## 🛡️ Browser Support

- Chrome 80+ (Android & Desktop)
- Firefox 78+
- Safari 13+ (iOS & macOS)
- Samsung Internet 12+
- Edge 80+

---

## 📝 License

This theme is proprietary to HaatRush. All rights reserved.

---

## 🙏 Credits

- **Theme Design & Development**: HaatRush Team
- **Platform**: [Shopify](https://www.shopify.com)
- **Bengali Fonts**: [Google Fonts — Noto Sans Bengali](https://fonts.google.com/noto/specimen/Noto+Sans+Bengali), [Hind Siliguri](https://fonts.google.com/specimen/Hind+Siliguri)
- **Icons**: Inline SVG icons optimized for performance
- **Inspiration**: Daraz Bangladesh, Evaly, and leading Bangladeshi e-commerce platforms

---

Built with ❤️ for Bangladesh 🇧🇩
