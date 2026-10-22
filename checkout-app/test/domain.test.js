'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const STOREFRONT_LOCATIONS = require('../../assets/locations.json');
const {
  DIVISIONS,
  DISTRICTS,
  UPAZILAS,
  buildOrderInput,
  buildQuote,
  createQuoteToken,
  normalizeLines,
  normalizePhone,
  readQuoteToken,
  validateCustomer,
  verifyAppProxy
} = require('../domain');

function fixtureVariant(id, price, title) {
  return {
    legacyResourceId: id,
    title: 'Default Title',
    availableForSale: true,
    inventoryTracked: true,
    inventoryQuantity: 10,
    price: { amount: price, currencyCode: 'BDT' },
    product: { title, featuredImage: null }
  };
}

test('location data contains the administrative hierarchy and delivery follows the selected district', () => {
  assert.equal(DIVISIONS.length, 8);
  assert.equal(DISTRICTS.length, 64);
  assert.equal(UPAZILAS.length, 500);
  assert.deepEqual(STOREFRONT_LOCATIONS, { divisions: DIVISIONS, districts: DISTRICTS, upazilas: UPAZILAS });
  assert.ok(UPAZILAS.some((upazila) => upazila.value === 'Dhamrai' && upazila.district === 'Dhaka'));
  assert.ok([
    ['Mokamtola', 'Bogura'],
    ['Matamuhuri', "Cox's Bazar"],
    ['Chandraganj', 'Lakshmipur'],
    ['Ruhia', 'Thakurgaon'],
    ['Bhully', 'Thakurgaon']
  ].every(([value, district]) => UPAZILAS.some((upazila) => upazila.value === value && upazila.district === district)));
  assert.ok([...DIVISIONS, ...DISTRICTS, ...UPAZILAS].every((entry) => entry.value && entry.label));
  assert.equal(new Set(UPAZILAS.map((upazila) => `${upazila.district}\0${upazila.value.toLowerCase()}`)).size, UPAZILAS.length);
  assert.ok(DISTRICTS.every((district) =>
    DIVISIONS.some((division) => division.value === district.division)
    && UPAZILAS.some((upazila) => upazila.district === district.value)
  ));
  const lines = normalizeLines([{ variantId: '101', quantity: 1 }]);
  const variants = [fixtureVariant('101', '500.00', 'পণ্য')];
  assert.equal(buildQuote(lines, variants, 'Dhaka', 'Dhaka').shipping, '70.00');
  assert.equal(buildQuote(lines, variants, 'Chattogram', 'Chattogram').shipping, '130.00');
  assert.throws(() => buildQuote(lines, variants, 'Dhaka', 'Chattogram'), /জেলা/);
});

test('free shipping requires subtotal to exceed ৳1,000', () => {
  const lines = normalizeLines([{ variantId: '101', quantity: 1 }]);
  assert.equal(buildQuote(lines, [fixtureVariant('101', '1000.00', 'পণ্য')], 'Dhaka', 'Dhaka').shippingFree, false);
  assert.equal(buildQuote(lines, [fixtureVariant('101', '1000.01', 'পণ্য')], 'Dhaka', 'Dhaka').shippingFree, true);
});

test('bundle discount is absent for one item and applied for two eligible units', () => {
  const variants = [fixtureVariant('101', '100.00', 'পণ্য')];
  const one = buildQuote(normalizeLines([{ variantId: '101', quantity: 1 }]), variants, 'Dhaka', 'Dhaka');
  const two = buildQuote(normalizeLines([{ variantId: '101', quantity: 2 }]), variants, 'Dhaka', 'Dhaka');
  assert.equal(one.bundleDiscount, '0.00');
  assert.equal(two.bundleDiscount, '4.00');
  const order = buildOrderInput({
    quote: two,
    lines: [],
    customer: { name: 'রহিম', phone: '01712345678', address: 'বাড়ি ১, সড়ক ২', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhamrai' },
    submissionId: '93d93088-1903-4aa2-bf20-80cb5b169c78'
  }).order;
  assert.deepEqual(order.discountCode, {
    itemPercentageDiscountCode: { code: 'HAATRUSH-BUNDLE-2', percentage: 2 }
  });
  const singleOrder = buildOrderInput({
    quote: one,
    lines: [],
    customer: { name: 'রহিম', phone: '01712345678', address: 'বাড়ি ১, সড়ক ২', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhamrai' },
    submissionId: '93d93088-1903-4aa2-bf20-80cb5b169c78'
  }).order;
  assert.equal('discountCode' in singleOrder, false);
});

test('normalizes Bengali and international Bangladesh phone numbers', () => {
  assert.equal(normalizePhone('০১৭১২৩৪৫৬৭৮'), '+8801712345678');
  assert.equal(normalizePhone('+880 1712-345678'), '+8801712345678');
  assert.equal(normalizePhone('0212345678'), null);
});

test('rejects unavailable and understocked variants and unknown districts', () => {
  const lines = normalizeLines([{ variantId: '101', quantity: 2 }]);
  const understocked = fixtureVariant('101', '10.00', 'পণ্য');
  understocked.inventoryQuantity = 1;
  assert.throws(() => buildQuote(lines, [understocked], 'Dhaka', 'Dhaka'), /স্টক/);
  const unavailable = fixtureVariant('101', '10.00', 'পণ্য');
  unavailable.availableForSale = false;
  assert.throws(() => buildQuote(lines, [unavailable], 'Dhaka', 'Dhaka'), /উপলভ্য নয়/);
  assert.throws(() => buildQuote(lines, [fixtureVariant('101', '10.00', 'পণ্য')], 'Unknown', 'Dhaka'), /জেলা/);
});

test('signed quote token expires and cannot be modified', () => {
  const quote = buildQuote(
    normalizeLines([{ variantId: '101', quantity: 1 }]),
    [fixtureVariant('101', '500.00', 'পণ্য')],
    'Dhaka',
    'Dhaka'
  );
  const token = createQuoteToken(quote, 'a'.repeat(32), 1000000);
  assert.ok(readQuoteToken(token, 'a'.repeat(32), 1000000));
  assert.equal(readQuoteToken(token, 'b'.repeat(32), 1000000), null);
  assert.equal(readQuoteToken(token, 'a'.repeat(32), 2000000), null);
});

test('verifies Shopify app-proxy HMAC, shop, and timestamp', () => {
  const secret = 'shared-secret';
  const timestamp = '1700000000';
  const params = new URLSearchParams([
    ['shop', 'haatrush.myshopify.com'],
    ['timestamp', timestamp],
    ['path_prefix', '/apps/haatrush-checkout'],
    ['logged_in_customer_id', '']
  ]);
  const canonical = [...params.entries()].map(([key, value]) => `${key}=${value}`).sort().join('');
  params.set('signature', crypto.createHmac('sha256', secret).update(canonical).digest('hex'));
  const originalUrl = `/proxy/config?${params}`;
  assert.equal(verifyAppProxy({
    originalUrl,
    secret,
    shopDomain: 'haatrush.myshopify.com',
    now: Number(timestamp) * 1000
  }), true);
  assert.equal(verifyAppProxy({
    originalUrl: `${originalUrl}&extra=changed`,
    secret,
    shopDomain: 'haatrush.myshopify.com',
    now: Number(timestamp) * 1000
  }), false);
});

test('validates required Bengali checkout customer fields', () => {
  assert.equal(validateCustomer({
    name: 'রহিম উদ্দিন',
    phone: '01712345678',
    address: 'বাড়ি ১, সড়ক ২',
    division: 'Dhaka',
    upazila: 'Dhamrai',
    district: 'Dhaka'
  }).name, 'রহিম উদ্দিন');
  assert.throws(() => validateCustomer({
    name: 'রহিম',
    phone: '0212345678',
    address: 'বাড়ি ১, সড়ক ২',
    division: 'Dhaka',
    district: 'Dhaka'
  }), /মোবাইল/);
});

test('rejects a district from the wrong division and an Upazila outside that district', () => {
  const customer = {
    name: 'রহিম উদ্দিন',
    phone: '01712345678',
    address: 'বাড়ি ১, সড়ক ২',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhamrai'
  };
  assert.throws(() => validateCustomer({ ...customer, division: 'Chattogram' }), /জেলা/);
  assert.throws(() => validateCustomer({ ...customer, upazila: 'Mokamtola' }), /উপজেলা/);
});
