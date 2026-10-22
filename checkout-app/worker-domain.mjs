import locations from './locations.json' with { type: 'json' };

export const FREE_SHIPPING_THRESHOLD = 100000n;
export const BUNDLE_MINIMUM_ITEMS = 2;
export const BUNDLE_PERCENTAGE = 2;
export const BUNDLE_DISCOUNT_CODE = 'HAATRUSH-BUNDLE-2';

export const DIVISIONS = locations.divisions;
export const DISTRICTS = locations.districts;
export const UPAZILAS = locations.upazilas;

const divisionValues = new Set(DIVISIONS.map((item) => item.value));
const districtByValue = new Map(DISTRICTS.map((item) => [item.value, item]));
const upazilaValues = new Set(UPAZILAS.map((item) => `${item.district}\0${item.value}`));
const banglaDigits = '০১২৩৪৫৬৭৮৯';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toMinorUnits(value) {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error('Shopify থেকে পাওয়া মূল্য সঠিক নয়।');
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
}

export function fromMinorUnits(value) {
  const amount = BigInt(value);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}

function roundedPercentage(amount, percentage) {
  return (amount * BigInt(percentage) + 50n) / 100n;
}

export function normalizePhone(value) {
  const ascii = String(value || '').replace(/[০-৯]/g, (digit) => String(banglaDigits.indexOf(digit)));
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

export function normalizeLines(lines) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 50) {
    throw new Error('কার্টের পণ্যের তালিকা সঠিক নয়।');
  }

  return lines.map((line) => {
    const match = String(line && line.variantId || '').match(/^(?:gid:\/\/shopify\/ProductVariant\/)?(\d+)$/);
    const quantity = Number(line && line.quantity);
    if (!match || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error('কার্টে অবৈধ পণ্য বা পরিমাণ রয়েছে।');
    }

    const properties = [];
    if (Array.isArray(line.properties)) {
      for (const property of line.properties) {
        const name = property && property.name;
        const value = property && property.value;
        if (typeof name !== 'string' || typeof value !== 'string' || name.length > 100 || value.length > 500) {
          throw new Error('পণ্যের অতিরিক্ত তথ্য সঠিক নয়।');
        }
        if (!name.startsWith('_')) {
          properties.push({ name, value });
        }
      }
    } else if (line.properties && typeof line.properties === 'object') {
      for (const [name, value] of Object.entries(line.properties)) {
        if (typeof value !== 'string' || name.length > 100 || value.length > 500) {
          throw new Error('পণ্যের অতিরিক্ত তথ্য সঠিক নয়।');
        }
        if (!name.startsWith('_')) {
          properties.push({ name, value });
        }
      }
    }
    return { variantId: match[1], quantity, properties };
  });
}

export function validateCustomer(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('গ্রাহকের তথ্য পূরণ করুন।');
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const upazila = typeof input.upazila === 'string' ? input.upazila.trim() : '';
  const division = typeof input.division === 'string' ? input.division : '';
  const district = typeof input.district === 'string' ? input.district : '';
  const paymentMethod = input.paymentMethod === 'bkash' ? 'bkash' : input.paymentMethod === 'cod' ? 'cod' : '';

  if (name.length < 2 || name.length > 120) {
    throw new Error('আপনার পূর্ণ নাম লিখুন।');
  }
  if (!normalizePhone(phone)) {
    throw new Error('বাংলাদেশের সঠিক মোবাইল নম্বর লিখুন।');
  }
  if (address.length < 5 || address.length > 500) {
    throw new Error('সম্পূর্ণ ঠিকানা লিখুন।');
  }
  if (!divisionValues.has(division)) {
    throw new Error('বিভাগ নির্বাচন করুন।');
  }
  if (!districtByValue.has(district) || districtByValue.get(district).division !== division) {
    throw new Error('জেলা নির্বাচন করুন।');
  }
  if (!upazilaValues.has(`${district}\0${upazila}`)) {
    throw new Error('নির্বাচিত জেলার সঠিক উপজেলা বা থানা নির্বাচন করুন।');
  }
  if (!paymentMethod) {
    throw new Error('পেমেন্ট পদ্ধতি নির্বাচন করুন।');
  }
  return { name, phone, address, upazila, division, district, paymentMethod };
}

export function buildQuote(lines, variants, district, division, upazila) {
  if (division && !divisionValues.has(division)) {
    throw new Error('বিভাগ নির্বাচন করুন।');
  }
  if (district && (!districtByValue.has(district) || !division || districtByValue.get(district).division !== division)) {
    throw new Error('জেলা নির্বাচন করুন।');
  }
  if (upazila && !upazilaValues.has(`${district}\0${upazila}`)) {
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
    bundleDiscount = quoteLines.reduce((sum, line) => (
      sum + roundedPercentage(BigInt(line.unitPriceMinor) * BigInt(line.quantity), BUNDLE_PERCENTAGE)
    ), 0n);
  }

  const shippingFree = subtotal > FREE_SHIPPING_THRESHOLD;
  const shipping = shippingFree
    ? 0n
    : !district || (district === 'Dhaka' && !upazila)
      ? null
      : district === 'Dhaka' && upazila === 'Dhaka City' ? 7000n : 13000n;
  const total = shipping === null ? null : subtotal - bundleDiscount + shipping;

  return {
    division: division || '',
    district: district || '',
    upazila: upazila || '',
    itemCount,
    subtotal: fromMinorUnits(subtotal),
    bundleEligible: itemCount >= BUNDLE_MINIMUM_ITEMS,
    bundleDiscount: fromMinorUnits(bundleDiscount),
    shippingFree,
    shipping: shipping === null ? null : fromMinorUnits(shipping),
    shippingRemaining: shippingFree
      ? '0.00'
      : fromMinorUnits(FREE_SHIPPING_THRESHOLD + 1n > subtotal ? FREE_SHIPPING_THRESHOLD + 1n - subtotal : 0n),
    total: total === null ? null : fromMinorUnits(total),
    lines: quoteLines
  };
}

export async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function canonicalProxyQuery(searchParams) {
  const values = new Map();
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'signature') {
      if (!values.has(key)) {
        values.set(key, []);
      }
      values.get(key).push(value);
    }
  }
  return [...values.entries()]
    .map(([key, entries]) => `${key}=${entries.join(',')}`)
    .sort()
    .join('');
}

export async function verifyAppProxy(url, secret, shopDomain, now = Date.now()) {
  const signatures = url.searchParams.getAll('signature');
  const timestamp = Number(url.searchParams.get('timestamp'));
  if (signatures.length !== 1 || url.searchParams.get('shop') !== shopDomain || !Number.isInteger(timestamp)) {
    return false;
  }
  if (Math.abs(Math.floor(now / 1000) - timestamp) > 300 || !/^[a-f0-9]{64}$/i.test(signatures[0])) {
    return false;
  }
  const expected = await hmacHex(secret, canonicalProxyQuery(url.searchParams));
  return safeEqual(signatures[0].toLowerCase(), expected);
}

function base64UrlEncode(value) {
  const bytes = encoder.encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return decoder.decode(bytes);
}

export async function createQuoteToken(quote, secret, now = Date.now()) {
  const payload = {
    division: quote.division,
    district: quote.district,
    upazila: quote.upazila,
    exp: Math.floor(now / 1000) + 600,
    subtotal: quote.subtotal,
    bundleDiscount: quote.bundleDiscount,
    shipping: quote.shipping,
    shippingFree: quote.shippingFree,
    itemCount: quote.itemCount,
    total: quote.total,
    lines: quote.lines.map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
      properties: line.properties,
      unitPriceMinor: line.unitPriceMinor
    }))
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${await hmacHex(secret, encoded)}`;
}

export async function readQuoteToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 12000) {
    return null;
  }
  const [encoded, signature, ...rest] = token.split('.');
  if (!encoded || !signature || rest.length || !/^[a-f0-9]{64}$/i.test(signature)) {
    return null;
  }
  if (!safeEqual(signature.toLowerCase(), await hmacHex(secret, encoded))) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    return payload && Number.isInteger(payload.exp) && payload.exp >= Math.floor(now / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export function sameLines(left, right) {
  const canonical = (lines) => JSON.stringify(lines.map((line) => ({
    variantId: line.variantId,
    quantity: line.quantity,
    properties: line.properties
  })));
  return canonical(left) === canonical(right);
}

export function sameQuote(snapshot, fresh) {
  return snapshot.division === fresh.division
    && snapshot.district === fresh.district
    && snapshot.upazila === fresh.upazila
    && snapshot.subtotal === fresh.subtotal
    && snapshot.bundleDiscount === fresh.bundleDiscount
    && snapshot.shipping === fresh.shipping
    && snapshot.shippingFree === fresh.shippingFree
    && snapshot.itemCount === fresh.itemCount
    && snapshot.total === fresh.total
    && snapshot.lines.length === fresh.lines.length
    && snapshot.lines.every((line, index) => line.variantId === fresh.lines[index].variantId
      && line.quantity === fresh.lines[index].quantity
      && line.unitPriceMinor === fresh.lines[index].unitPriceMinor);
}

export function buildOrderInput({ quote, lines, customer, submissionId, bkashEnabled }) {
  if (customer.paymentMethod === 'bkash' && !bkashEnabled) {
    throw new Error('বিকাশ পেমেন্ট এখন চালু নেই।');
  }
  if (quote.shipping === null || quote.total === null) {
    throw new Error('ডেলিভারির এলাকা নির্বাচন করুন।');
  }
  const [firstName, ...lastNameParts] = customer.name.trim().split(/\s+/);
  const phone = normalizePhone(customer.phone);
  const paymentLabel = customer.paymentMethod === 'bkash' ? 'বিকাশ (ম্যানুয়াল)' : 'ক্যাশ অন ডেলিভারি';
  const shippingTitle = quote.shippingFree
    ? 'ফ্রি ডেলিভারি'
    : quote.upazila === 'Dhaka City' ? 'ঢাকা মহানগরে ডেলিভারি' : 'ঢাকার বাইরে ডেলিভারি';
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
    lineItems: quote.lines.map((line) => ({
      variantId: `gid://shopify/ProductVariant/${line.variantId}`,
      quantity: line.quantity,
      priceSet: { shopMoney: { amount: line.unitPrice, currencyCode: 'BDT' } },
      properties: line.properties
    })),
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
      code: quote.shippingFree ? 'FREE' : quote.upazila === 'Dhaka City' ? 'DHAKA-METRO-70' : 'OUTSIDE-DHAKA-130',
      priceSet: { shopMoney: { amount: quote.shipping, currencyCode: 'BDT' } }
    }],
    transactions: [{
      kind: 'SALE',
      status: 'PENDING',
      gateway: paymentLabel,
      amountSet: { shopMoney: { amount: quote.total, currencyCode: 'BDT' } }
    }],
    tags: [
      customer.paymentMethod === 'bkash' ? 'haatrush-bkash-manual' : 'haatrush-cod',
      'haatrush-custom-checkout'
    ],
    note: `HaatRush ${paymentLabel} checkout submission ${submissionId}`,
    customAttributes: [
      { key: 'checkout_submission_id', value: submissionId },
      { key: 'delivery_division', value: customer.division },
      { key: 'delivery_district', value: customer.district },
      { key: 'upazila_thana', value: customer.upazila },
      { key: 'payment_method', value: paymentLabel }
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
  return order;
}
