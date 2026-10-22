'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createApp } = require('../server');

const secret = 'a'.repeat(40);
const quoteSecret = 'b'.repeat(40);
const fixedNow = 1700000000000;
const shopDomain = 'haatrush.myshopify.com';
const submissionId = '93d93088-1903-4aa2-bf20-80cb5b169c78';

function proxyQuery() {
  const params = new URLSearchParams([
    ['shop', shopDomain],
    ['timestamp', String(fixedNow / 1000)],
    ['path_prefix', '/apps/haatrush-checkout'],
    ['logged_in_customer_id', '']
  ]);
  const canonical = [...params.entries()].map(([key, value]) => `${key}=${value}`).sort().join('');
  params.set('signature', crypto.createHmac('sha256', secret).update(canonical).digest('hex'));
  return `?${params}`;
}

function fakePool() {
  const records = new Map();
  return {
    records,
    async query(sql, values) {
      if (sql.startsWith('INSERT INTO checkout_submissions')) {
        if (records.has(values[0])) { return { rowCount: 0, rows: [] }; }
        records.set(values[0], { request_hash: values[1], status: 'processing', response: null });
        return { rowCount: 1, rows: [{ submission_id: values[0] }] };
      }
      if (sql.startsWith('SELECT request_hash')) {
        const record = records.get(values[0]);
        return { rowCount: record ? 1 : 0, rows: record ? [record] : [] };
      }
      if (sql.startsWith('SELECT status')) {
        const record = records.get(values[0]);
        return { rowCount: record ? 1 : 0, rows: record ? [record] : [] };
      }
      const record = records.get(values[0]);
      if (!record) { throw new Error('missing fake checkout row'); }
      if (sql.includes("status = 'created'")) {
        record.status = 'created';
        record.order_id = values[1];
        record.order_name = values[2];
        record.response = values[3];
      } else {
        record.status = 'failed';
        record.response = values[1];
      }
      return { rowCount: 1, rows: [] };
    }
  };
}

test('mocked Admin API order creation is pending COD and idempotent', async (t) => {
  const pool = fakePool();
  let orderMutations = 0;
  let createdOrderInput;
  const fetchImpl = async (_url, options) => {
    const payload = JSON.parse(options.body);
    if (payload.query.includes('query CheckoutCatalog')) {
      return new Response(JSON.stringify({
        data: {
          shop: { currencyCode: 'BDT' },
          nodes: [{
            id: 'gid://shopify/ProductVariant/101',
            legacyResourceId: '101',
            title: 'Default Title',
            availableForSale: true,
            inventoryQuantity: 10,
            inventoryItem: { tracked: true },
            price: { amount: '500.00', currencyCode: 'BDT' },
            product: { title: 'হেডফোন', featuredImage: { url: 'https://cdn.shopify.com/headphone.png' } }
          }]
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    orderMutations++;
    createdOrderInput = payload.variables;
    return new Response(JSON.stringify({
      data: {
        orderCreate: {
          order: {
            id: 'gid://shopify/Order/9001',
            name: '#1001',
            displayFinancialStatus: 'PENDING',
            currentSubtotalPriceSet: { shopMoney: { amount: '980.00', currencyCode: 'BDT' } },
            currentTotalDiscountsSet: { shopMoney: { amount: '20.00', currencyCode: 'BDT' } },
            currentShippingPriceSet: { shopMoney: { amount: '70.00', currencyCode: 'BDT' } },
            currentTotalPriceSet: { shopMoney: { amount: '1050.00', currencyCode: 'BDT' } }
          },
          userErrors: []
        }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const app = createApp({
    config: {
      shopDomain,
      appSecret: secret,
      adminToken: 'server-only-token',
      quoteSecret,
      apiVersion: '2026-10'
    },
    pool,
    fetchImpl,
    now: () => fixedNow
  });
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const lines = [{ variantId: '101', quantity: 2, properties: {} }];

  const configResponse = await fetch(`${base}/proxy/config${proxyQuery()}`);
  assert.equal(configResponse.status, 200);
  const locations = await configResponse.json();
  assert.equal(locations.divisions.length, 8);
  assert.equal(locations.districts.length, 64);
  assert.ok(locations.upazilas.some((upazila) => upazila.value === 'Dhaka City' && upazila.type === 'delivery_zone'));

  const quoteResponse = await fetch(`${base}/proxy/quote${proxyQuery()}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lines, division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka City' })
  });
  assert.equal(quoteResponse.status, 200);
  const quote = await quoteResponse.json();

  const orderRequest = {
    submissionId,
    quoteToken: quote.quoteToken,
    lines,
    customer: {
      name: 'রহিম উদ্দিন',
      phone: '01712345678',
      address: 'বাড়ি ১, সড়ক ২',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhaka City'
    }
  };
  const wrongDeliveryAreaResponse = await fetch(`${base}/proxy/orders${proxyQuery()}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...orderRequest,
      customer: { ...orderRequest.customer, upazila: 'Savar' }
    })
  });
  assert.equal(wrongDeliveryAreaResponse.status, 409);

  const firstResponse = await fetch(`${base}/proxy/orders${proxyQuery()}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderRequest)
  });
  assert.equal(firstResponse.status, 201);
  const firstResult = await firstResponse.json();
  assert.equal(firstResult.orderName, '#1001');
  assert.equal(firstResult.financialStatus, 'PENDING');
  assert.equal(firstResult.total, '1050.00');
  assert.equal(createdOrderInput.order.financialStatus, 'PENDING');
  assert.equal(createdOrderInput.order.shippingLines[0].priceSet.shopMoney.amount, '70.00');
  assert.equal(createdOrderInput.order.shippingLines[0].code, 'DHAKA-METRO-70');
  assert.equal(createdOrderInput.order.discountCode.itemPercentageDiscountCode.percentage, 2);
  assert.ok(createdOrderInput.order.customAttributes.some((attribute) =>
    attribute.key === 'delivery_division' && attribute.value === 'Dhaka'
  ));
  assert.equal(createdOrderInput.options.inventoryBehaviour, 'DECREMENT_OBEYING_POLICY');

  const duplicateResponse = await fetch(`${base}/proxy/orders${proxyQuery()}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderRequest)
  });
  assert.equal(duplicateResponse.status, 200);
  assert.deepEqual(await duplicateResponse.json(), firstResult);
  assert.equal(orderMutations, 1);
});

test('invalid app-proxy signatures cannot request a quote', async (t) => {
  let adminCalls = 0;
  const app = createApp({
    config: {
      shopDomain,
      appSecret: secret,
      adminToken: 'server-only-token',
      quoteSecret,
      apiVersion: '2026-10'
    },
    pool: fakePool(),
    fetchImpl: async () => { adminCalls++; throw new Error('should not call Shopify'); },
    now: () => fixedNow
  });
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/proxy/quote?shop=${shopDomain}&timestamp=${fixedNow / 1000}&signature=${'0'.repeat(64)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: [{ variantId: '101', quantity: 1 }], division: 'Dhaka', district: 'Dhaka' })
    }
  );
  assert.equal(response.status, 401);
  assert.equal(adminCalls, 0);
});
