'use strict';

const crypto = require('node:crypto');

const FREE_SHIPPING_THRESHOLD = 100000n;
const BUNDLE_MINIMUM_ITEMS = 2;
const BUNDLE_PERCENTAGE = 2;
const BUNDLE_DISCOUNT_CODE = 'HAATRUSH-BUNDLE-2';
const { divisions: DIVISIONS, districts: DISTRICTS, upazilas: UPAZILAS } = require('./locations.json');
const DIVISION_VALUES = new Set(DIVISIONS.map((division) => division.value));
const DISTRICT_BY_VALUE = new Map(DISTRICTS.map((district) => [district.value, district]));
const DISTRICT_VALUES = new Set(DISTRICT_BY_VALUE.keys());
const UPAZILA_VALUES = new Set(UPAZILAS.map((upazila) => `${upazila.district}\0${upazila.value}`));
const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

function toMinorUnits(value) {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error('Invalid BDT amount from Shopify');
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
}

function fromMinorUnits(value) {
  const amount = BigInt(value);
  const whole = amount / 100n;
  const fraction = String(amount % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
}

function roundedPercentage(amount, percentage) {
  return (amount * BigInt(percentage) + 50n) / 100n;
}

function normalizePhone(value) {
  const ascii = String(value || '').replace(/[০-৯]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));
  const compact = ascii.replace(/[\s()-]/g, '');
  let local;
  if (/^01[3-9]\d{8}$/.test(compact)) {
    local = compact;
  } else if (/^(?:\+?880)1[3-9]\d{8}$/.test(compact)) {
    local = `0${compact.replace(/^\+?880/, '')}`;
  } else {
    return null;
  }
  return `+88${local}`;
}

function normalizeLines(lines) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 50) {
    throw new Error('কার্টের পণ্যের তালিকা সঠিক নয়।');
  }

  return lines.map((line) => {
    const rawId = String(line && line.variantId || '');
    const id = rawId.match(/^(?:gid:\/\/shopify\/ProductVariant\/)?(\d+)$/);
    const quantity = Number(line && line.quantity);
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error('কার্টে অবৈধ পণ্য বা পরিমাণ রয়েছে।');
    }

    const properties = [];
    if (line.properties && typeof line.properties === 'object' && !Array.isArray(line.properties)) {
      for (const [name, value] of Object.entries(line.properties)) {
        if (typeof value !== 'string' || name.length > 100 || value.length > 500) {
          throw new Error('পণ্যের অতিরিক্ত তথ্য সঠিক নয়।');
        }
        if (name.startsWith('_')) {
          continue;
        }
        properties.push({ name, value });
      }
    }

    return {
      variantId: id[1],
      quantity,
      properties
    };
  });
}

function buildQuote(lines, variants, district, division, upazila) {
  if (division && !DIVISION_VALUES.has(division)) {
    throw new Error('বিভাগ নির্বাচন করুন।');
  }
  if (district && (!DISTRICT_VALUES.has(district) || !division || DISTRICT_BY_VALUE.get(district).division !== division)) {
    throw new Error('জেলা নির্বাচন করুন।');
  }
  if (upazila && !UPAZILA_VALUES.has(`${district}\0${upazila}`)) {
    throw new Error('নির্বাচিত জেলার সঠিক উপজেলা বা থানা নির্বাচন করুন।');
  }

  const byId = new Map(variants.map((variant) => [variant.legacyResourceId, variant]));
  let itemCount = 0;
  let subtotal = 0n;
  let bundleDiscount = 0n;
  const quoteLines = lines.map((line) => {
    const variant = byId.get(line.variantId);
    if (!variant || !variant.availableForSale) {
      throw new Error('কার্টের একটি পণ্য এখন বিক্রয়ের জন্য উপলভ্য নয়।');
    }
    if (variant.inventoryTracked && (!Number.isInteger(variant.inventoryQuantity) || variant.inventoryQuantity < line.quantity)) {
      throw new Error(`${variant.product.title} পণ্যের পর্যাপ্ত স্টক নেই।`);
    }
    if (variant.price.currencyCode !== 'BDT') {
      throw new Error('দোকানের মুদ্রা BDT নয়; অর্ডার নেওয়া যাচ্ছে না।');
    }

    const unitPrice = toMinorUnits(variant.price.amount);
    const lineTotal = unitPrice * BigInt(line.quantity);
    subtotal += lineTotal;
    itemCount += line.quantity;
    return {
      variantId: line.variantId,
      quantity: line.quantity,
      properties: line.properties,
      title: variant.product.title,
      variantTitle: variant.title === 'Default Title' ? '' : variant.title,
      imageUrl: variant.product.featuredImage ? variant.product.featuredImage.url : '',
      unitPrice: fromMinorUnits(unitPrice),
      lineTotal: fromMinorUnits(lineTotal),
      unitPriceMinor: String(unitPrice)
    };
  });

  if (itemCount > 100) {
    throw new Error('একটি অর্ডারে সর্বোচ্চ ১০০টি পণ্য যোগ করা যাবে।');
  }

  if (itemCount >= BUNDLE_MINIMUM_ITEMS) {
    bundleDiscount = quoteLines.reduce((sum, line) => {
      return sum + roundedPercentage(BigInt(line.unitPriceMinor) * BigInt(line.quantity), BUNDLE_PERCENTAGE);
    }, 0n);
  }

  const shippingFree = subtotal > FREE_SHIPPING_THRESHOLD;
  const shipping = shippingFree
    ? 0n
    : !district
      ? null
      : district === 'Dhaka' ? 6000n : 13000n;
  const total = shipping === null ? null : subtotal - bundleDiscount + shipping;

  return {
    division: division || '',
    district,
    upazila: upazila || '',
    itemCount,
    subtotal: fromMinorUnits(subtotal),
    bundleEligible: itemCount >= BUNDLE_MINIMUM_ITEMS,
    bundleDiscount: fromMinorUnits(bundleDiscount),
    shippingFree,
    shipping: shipping === null ? null : fromMinorUnits(shipping),
    shippingRemaining: shippingFree ? '0.00' : fromMinorUnits(FREE_SHIPPING_THRESHOLD + 1n - subtotal > 0n ? FREE_SHIPPING_THRESHOLD + 1n - subtotal : 0n),
    total: total === null ? null : fromMinorUnits(total),
    lines: quoteLines
  };
}

function canonicalProxyQuery(searchParams) {
  const values = new Map();
  for (const [key, value] of searchParams.entries()) {
    if (key === 'signature') {
      continue;
    }
    if (!values.has(key)) {
      values.set(key, []);
    }
    values.get(key).push(value);
  }
  return [...values.entries()]
    .map(([key, entries]) => `${key}=${entries.join(',')}`)
    .sort()
    .join('');
}

function verifyAppProxy({ originalUrl, secret, shopDomain, now = Date.now() }) {
  const url = new URL(originalUrl, 'https://app-proxy.invalid');
  const signatures = url.searchParams.getAll('signature');
  const shop = url.searchParams.get('shop');
  const timestamp = Number(url.searchParams.get('timestamp'));
  if (signatures.length !== 1 || !shop || shop !== shopDomain || !Number.isInteger(timestamp)) {
    return false;
  }
  if (Math.abs(Math.floor(now / 1000) - timestamp) > 300) {
    return false;
  }

  const received = Buffer.from(signatures[0], 'hex');
  if (received.length !== 32 || signatures[0].length !== 64) {
    return false;
  }
  const expected = crypto.createHmac('sha256', secret)
    .update(canonicalProxyQuery(url.searchParams))
    .digest();
  return crypto.timingSafeEqual(received, expected);
}

function createQuoteToken(quote, secret, now = Date.now()) {
  const payload = {
    division: quote.division,
    district: quote.district,
    upazila: quote.upazila,
    exp: Math.floor(now / 1000) + 600,
    lines: quote.lines.map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      properties: line.properties
    })),
    subtotal: quote.subtotal,
    bundleDiscount: quote.bundleDiscount,
    shipping: quote.shipping,
    shippingFree: quote.shippingFree,
    itemCount: quote.itemCount,
    total: quote.total
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function readQuoteToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 12000) {
    return null;
  }
  const [encoded, signature, ...rest] = token.split('.');
  if (!encoded || !signature || rest.length) {
    return null;
  }
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest();
  let received;
  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload || payload.exp < Math.floor(now / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function buildOrderInput({ quote, lines, customer, submissionId }) {
  const [firstName, ...lastNameParts] = customer.name.trim().split(/\s+/);
  const phone = normalizePhone(customer.phone);
  if (!phone) {
    throw new Error('মোবাইল নম্বরটি সঠিকভাবে লিখুন।');
  }

  const orderLines = quote.lines.map((line) => ({
    variantId: `gid://shopify/ProductVariant/${line.variantId}`,
    quantity: line.quantity,
    priceSet: { shopMoney: { amount: line.unitPrice, currencyCode: 'BDT' } },
    properties: line.properties
  }));
  const shippingTitle = quote.shippingFree
    ? 'ফ্রি ডেলিভারি'
    : customer.district === 'Dhaka' ? 'ঢাকা জেলায় ডেলিভারি' : 'ঢাকার বাইরে ডেলিভারি';
  const order = {
    currency: 'BDT',
    customer: {
      toUpsert: {
        firstName,
        lastName: lastNameParts.join(' '),
        phone
      }
    },
    financialStatus: 'PENDING',
    fulfillmentStatus: 'UNFULFILLED',
    lineItems: orderLines,
    shippingAddress: {
      firstName,
      lastName: lastNameParts.join(' '),
      address1: customer.address,
      address2: customer.upazila,
      city: customer.upazila,
      province: quote.district,
      countryCode: 'BD',
      phone
    },
    phone,
    shippingLines: [{
      title: shippingTitle,
      code: quote.shippingFree ? 'FREE' : customer.district === 'Dhaka' ? 'DHAKA-DISTRICT-60' : 'OUTSIDE-DHAKA-130',
      priceSet: { shopMoney: { amount: quote.shipping, currencyCode: 'BDT' } }
    }],
    tags: ['haatrush-cod', 'haatrush-custom-checkout'],
    note: `HaatRush COD checkout submission ${submissionId}`,
    customAttributes: [
      { key: 'checkout_submission_id', value: submissionId },
      { key: 'delivery_division', value: customer.division },
      { key: 'delivery_district', value: quote.district },
      { key: 'upazila_thana', value: customer.upazila }
    ],
    taxesIncluded: false
  };
  if (quote.bundleEligible) {
    order.discountCode = {
      itemPercentageDiscountCode: {
        code: BUNDLE_DISCOUNT_CODE,
        percentage: BUNDLE_PERCENTAGE
      }
    };
  }
  return { order, lines };
}

function validateCustomer(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('গ্রাহকের তথ্য পূরণ করুন।');
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const upazila = typeof input.upazila === 'string' ? input.upazila.trim() : '';
  const division = typeof input.division === 'string' ? input.division : '';
  const district = typeof input.district === 'string' ? input.district : '';

  if (name.length < 2 || name.length > 120) {
    throw new Error('আপনার পূর্ণ নাম লিখুন।');
  }
  if (!normalizePhone(phone)) {
    throw new Error('বাংলাদেশের সঠিক মোবাইল নম্বর লিখুন।');
  }
  if (address.length < 5 || address.length > 500) {
    throw new Error('সম্পূর্ণ ঠিকানা লিখুন।');
  }
  if (upazila.length < 2 || upazila.length > 100) {
    throw new Error('উপজেলা বা থানা লিখুন।');
  }
  if (!DIVISION_VALUES.has(division)) {
    throw new Error('বিভাগ নির্বাচন করুন।');
  }
  if (!DISTRICT_VALUES.has(district) || DISTRICT_BY_VALUE.get(district).division !== division) {
    throw new Error('জেলা নির্বাচন করুন।');
  }
  if (!UPAZILA_VALUES.has(`${district}\0${upazila}`)) {
    throw new Error('নির্বাচিত জেলার সঠিক উপজেলা বা থানা নির্বাচন করুন।');
  }

  return { name, phone, address, upazila, division, district };
}

module.exports = {
  BUNDLE_DISCOUNT_CODE,
  BUNDLE_MINIMUM_ITEMS,
  BUNDLE_PERCENTAGE,
  DIVISIONS,
  DISTRICTS,
  FREE_SHIPPING_THRESHOLD,
  UPAZILAS,
  buildOrderInput,
  buildQuote,
  createQuoteToken,
  fromMinorUnits,
  normalizeLines,
  normalizePhone,
  readQuoteToken,
  toMinorUnits,
  validateCustomer,
  verifyAppProxy
};
