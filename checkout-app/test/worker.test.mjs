import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../worker.mjs';
import { hmacHex } from '../worker-domain.mjs';

const appSecret = 'shopify-app-secret-for-worker-tests-123456';
const quoteSecret = 'quote-secret-for-worker-tests-1234567890';
const shopDomain = 'haatrush.myshopify.com';
const fixedNow = Date.now();
const submissionId = '93d93088-1903-4aa2-bf20-80cb5b169c78';

class MemoryD1 {
  rows = new Map();

  prepare(sql) {
    const normalizedSql = sql.trimStart();
    const rows = this.rows;
    let values = [];
    const statement = {
      bind(...boundValues) {
        values = boundValues;
        return this;
      },
      run: async () => {
        if (normalizedSql.startsWith('INSERT OR IGNORE INTO checkout_submissions')) {
          const [id, hash, timestamp] = values;
          if (rows.has(id)) {
            return { meta: { changes: 0 } };
          }
          rows.set(id, {
            submission_id: id,
            request_hash: hash,
            status: 'processing',
            order_id: null,
            order_name: null,
            response_json: null,
            created_at: timestamp,
            updated_at: timestamp
          });
          return { meta: { changes: 1 } };
        }
        if (normalizedSql.startsWith('UPDATE checkout_submissions')) {
          const [id, status, orderId, orderName, responseJson, updatedAt] = values;
          const row = rows.get(id);
          if (!row) {
            throw new Error('submission missing');
          }
          Object.assign(row, {
            status,
            order_id: orderId,
            order_name: orderName,
            response_json: responseJson,
            updated_at: updatedAt
          });
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected D1 statement: ${sql}`);
      },
      first: async () => {
        if (normalizedSql.startsWith('SELECT 1')) {
          return { ready: 1 };
        }
        if (!normalizedSql.startsWith('SELECT request_hash')) {
          throw new Error(`Unexpected D1 query: ${normalizedSql}`);
        }
        return rows.get(values[0]) || null;
      }
    };
    return statement;
  }
}

function proxyUrl(path, params = []) {
  const url = new URL(`https://shop.example${path}`);
  const signed = [
    ['shop', shopDomain],
    ['timestamp', String(Math.floor(fixedNow / 1000))],
    ['path_prefix', '/apps/haatrush-checkout'],
    ['logged_in_customer_id', ''],
    ...params
  ];
  signed.forEach(([key, value]) => url.searchParams.append(key, value));
  return hmacHex(appSecret, [...url.searchParams.entries()]
    .filter(([key]) => key !== 'signature')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('')).then((signature) => {
    url.searchParams.set('signature', signature);
    return url;
  });
}

function variant(price = '500.00', inventoryQuantity = 10) {
  return {
    id: 'gid://shopify/ProductVariant/101',
    legacyResourceId: '101',
    title: 'Default Title',
    availableForSale: true,
    inventoryQuantity,
    inventoryItem: { tracked: true },
    price: { amount: price, currencyCode: 'BDT' },
    product: { title: 'হেডফোন', featuredImage: { url: 'https://cdn.shopify.com/headphone.png' } }
  };
}

function testEnvironment({ db = new MemoryD1(), fetchImpl, bkashEnabled = false } = {}) {
  return {
    DB: db,
    SHOPIFY_SHOP_DOMAIN: shopDomain,
    SHOPIFY_API_SECRET: appSecret,
    SHOPIFY_ADMIN_ACCESS_TOKEN: 'server-only-token',
    QUOTE_TOKEN_SECRET: quoteSecret,
    SHOPIFY_API_VERSION: '2026-10',
    BKASH_ENABLED: String(bkashEnabled),
    fetchImpl
  };
}

function runRequest(request, env) {
  return handleRequest(request, env, {
    fetchImpl: env.fetchImpl || fetch,
    now: () => fixedNow
  });
}

function createShopifyFetch({ price = '500.00', inventoryQuantity = 10 } = {}) {
  const state = { mutations: 0, orderVariables: null };
  const catalog = { price, inventoryQuantity };
  const fetchImpl = async (_url, options) => {
    const payload = JSON.parse(options.body);
    if (payload.query.includes('query HaatRushCheckoutHealth')) {
      return new Response(JSON.stringify({
        data: {
          shop: { currencyCode: 'BDT' },
          products: { nodes: [{ variants: { nodes: [{ inventoryQuantity: 10, inventoryItem: { tracked: true } }] } }] }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (payload.query.includes('query CheckoutCatalog')) {
      return new Response(JSON.stringify({
        data: { shop: { currencyCode: 'BDT' }, nodes: [variant(catalog.price, catalog.inventoryQuantity)] }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    state.mutations += 1;
    state.orderVariables = payload.variables;
    return new Response(JSON.stringify({
      data: {
        orderCreate: {
          order: {
            id: 'gid://shopify/Order/9001',
            name: '#1001',
            displayFinancialStatus: 'PENDING',
            currentSubtotalPriceSet: { shopMoney: { amount: '1000.00', currencyCode: 'BDT' } },
            currentTotalDiscountsSet: { shopMoney: { amount: '20.00', currencyCode: 'BDT' } },
            currentShippingPriceSet: { shopMoney: { amount: '70.00', currencyCode: 'BDT' } },
            currentTotalPriceSet: { shopMoney: { amount: '1050.00', currencyCode: 'BDT' } }
          },
          userErrors: []
        }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  return {
    fetchImpl,
    state,
    setPrice(value) { catalog.price = value; },
    setInventory(value) { catalog.inventoryQuantity = value; }
  };
}

async function quoteFor(env, lines, area = { division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka City' }) {
  const url = await proxyUrl('/proxy/quote');
  const response = await runRequest(new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines, ...area })
  }), env);
  assert.equal(response.status, 200);
  return response.json();
}

test('Worker health and signed location configuration are available', async () => {
  const { fetchImpl } = createShopifyFetch();
  const env = testEnvironment({ fetchImpl });
  const health = await runRequest(new Request('https://worker.example/healthz'), env);
  assert.equal(health.status, 200);

  const configUrl = await proxyUrl('/proxy/config');
  const response = await runRequest(new Request(configUrl), env);
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.equal(config.divisions.length, 8);
  assert.equal(config.districts.length, 64);
  assert.ok(config.upazilas.some((item) => item.value === 'Dhaka City' && item.type === 'delivery_zone'));
  assert.equal(config.bkashEnabled, false);

  const integrationUrl = await proxyUrl('/proxy/health');
  const integration = await runRequest(new Request(integrationUrl), env);
  assert.equal(integration.status, 200);
  assert.deepEqual(await integration.json(), {
    status: 'ok',
    integrations: { database: 'ok', shopify: 'ok' },
    currency: 'BDT'
  });
});

test('quote applies the strict free-shipping threshold, bundle saving, and Dhaka zones', async () => {
  const { fetchImpl } = createShopifyFetch();
  const env = testEnvironment({ fetchImpl });

  const exactThreshold = await quoteFor(env, [{ variantId: '101', quantity: 2 }]);
  assert.equal(exactThreshold.subtotal, '1000.00');
  assert.equal(exactThreshold.bundleDiscount, '20.00');
  assert.equal(exactThreshold.shipping, '70.00');
  assert.equal(exactThreshold.total, '1050.00');

  const overThreshold = await quoteFor(env, [{ variantId: '101', quantity: 3 }]);
  assert.equal(overThreshold.subtotal, '1500.00');
  assert.equal(overThreshold.shipping, '0.00');
  assert.equal(overThreshold.total, '1470.00');

  const outsideDhaka = await quoteFor(env, [{ variantId: '101', quantity: 1 }], {
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Savar'
  });
  assert.equal(outsideDhaka.shipping, '130.00');
  assert.equal(outsideDhaka.bundleDiscount, '0.00');
});

test('order creation is server-priced, pending, tagged for COD, and deduplicated without storing customer data', async () => {
  const db = new MemoryD1();
  const shopify = createShopifyFetch();
  const env = testEnvironment({ db, fetchImpl: shopify.fetchImpl });
  const lines = [{ variantId: '101', quantity: 2, properties: {} }];
  const quote = await quoteFor(env, lines);
  const orderRequest = {
    submissionId,
    quoteToken: quote.quoteToken,
    lines,
    customer: {
      name: 'রহিম উদ্দিন',
      phone: '০১৭১২৩৪৫৬৭৮',
      address: 'বাড়ি ১, সড়ক ২',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhaka City',
      paymentMethod: 'cod'
    }
  };
  const requestUrl = await proxyUrl('/proxy/orders');
  const makeRequest = () => new Request(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderRequest)
  });

  const response = await runRequest(makeRequest(), env);
  assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
  const confirmation = await response.json();
  assert.equal(confirmation.orderName, '#1001');
  assert.equal(confirmation.financialStatus, 'PENDING');
  assert.equal(confirmation.total, '1050.00');
  assert.equal(shopify.state.mutations, 1);
  assert.equal(shopify.state.orderVariables.order.financialStatus, 'PENDING');
  assert.equal(shopify.state.orderVariables.order.shippingLines[0].priceSet.shopMoney.amount, '70.00');
  assert.equal(shopify.state.orderVariables.order.shippingLines[0].code, 'DHAKA-METRO-70');
  assert.equal(shopify.state.orderVariables.order.transactions[0].gateway, 'ক্যাশ অন ডেলিভারি');
  assert.equal(shopify.state.orderVariables.order.discountCode.itemPercentageDiscountCode.percentage, 2);
  assert.equal(shopify.state.orderVariables.options.inventoryBehaviour, 'DECREMENT_OBEYING_POLICY');

  const duplicate = await runRequest(makeRequest(), env);
  assert.equal(duplicate.status, 200);
  assert.deepEqual(await duplicate.json(), confirmation);
  assert.equal(shopify.state.mutations, 1);
  const stored = [...db.rows.values()][0];
  assert.equal(stored.status, 'created');
  assert.equal(JSON.stringify(stored).includes('রহিম'), false);
  assert.equal(JSON.stringify(stored).includes('০১৭১২৩৪৫৬৭৮'), false);

  const statusUrl = await proxyUrl(`/proxy/orders/${submissionId}`);
  const status = await runRequest(new Request(statusUrl), env);
  assert.equal(status.status, 200);
  assert.equal((await status.json()).status, 'created');
});

test('different requests cannot reuse a submission ID', async () => {
  const db = new MemoryD1();
  const shopify = createShopifyFetch();
  const env = testEnvironment({ db, fetchImpl: shopify.fetchImpl });
  const lines = [{ variantId: '101', quantity: 2, properties: {} }];
  const quote = await quoteFor(env, lines);
  const base = {
    submissionId,
    quoteToken: quote.quoteToken,
    lines,
    customer: {
      name: 'রহিম উদ্দিন',
      phone: '01712345678',
      address: 'বাড়ি ১, সড়ক ২',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhaka City',
      paymentMethod: 'cod'
    }
  };
  const firstUrl = await proxyUrl('/proxy/orders');
  const send = (body) => runRequest(new Request(firstUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }), env);
  const first = await send(base);
  assert.equal(first.status, 201, JSON.stringify(await first.clone().json()));
  const conflict = await send({ ...base, customer: { ...base.customer, name: 'অন্য গ্রাহক' } });
  assert.equal(conflict.status, 409);
  assert.equal(shopify.state.mutations, 1);
});

test('concurrent requests with the same submission ID create only one Shopify order', async () => {
  const db = new MemoryD1();
  const shopify = createShopifyFetch();
  const fetchImpl = async (url, options) => {
    if (JSON.parse(options.body).query.includes('mutation CreateHaatRushCodOrder')) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return shopify.fetchImpl(url, options);
  };
  const env = testEnvironment({ db, fetchImpl });
  const lines = [{ variantId: '101', quantity: 2, properties: {} }];
  const quote = await quoteFor(env, lines);
  const url = await proxyUrl('/proxy/orders');
  const body = {
    submissionId,
    quoteToken: quote.quoteToken,
    lines,
    customer: {
      name: 'রহিম উদ্দিন',
      phone: '01712345678',
      address: 'বাড়ি ১, সড়ক ২',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhaka City',
      paymentMethod: 'cod'
    }
  };
  const send = () => runRequest(new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }), env);

  const responses = await Promise.all([send(), send()]);
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(shopify.state.mutations, 1);
  for (const response of responses) {
    assert.ok([200, 201, 202].includes(response.status));
  }
});

test('order creation is blocked when Shopify price changes after the quote', async () => {
  const db = new MemoryD1();
  const shopify = createShopifyFetch();
  const env = testEnvironment({ db, fetchImpl: shopify.fetchImpl });
  const lines = [{ variantId: '101', quantity: 2, properties: {} }];
  const quote = await quoteFor(env, lines);
  shopify.setPrice('510.00');
  const url = await proxyUrl('/proxy/orders');
  const response = await runRequest(new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId,
      quoteToken: quote.quoteToken,
      lines,
      customer: {
        name: 'রহিম উদ্দিন',
        phone: '01712345678',
        address: 'বাড়ি ১, সড়ক ২',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Dhaka City',
        paymentMethod: 'cod'
      }
    })
  }), env);
  assert.equal(response.status, 409);
  assert.equal(shopify.state.mutations, 0);
  assert.equal([...db.rows.values()][0].status, 'failed');
});

test('invalid App Proxy signatures never reach Shopify', async () => {
  let adminCalls = 0;
  const env = testEnvironment({
    fetchImpl: async () => {
      adminCalls += 1;
      throw new Error('Shopify must not be called');
    }
  });
  const url = new URL('https://worker.example/proxy/config?shop=haatrush.myshopify.com&timestamp=1792647600&signature=0000000000000000000000000000000000000000000000000000000000000000');
  const response = await runRequest(new Request(url), env);
  assert.equal(response.status, 401);
  assert.equal(adminCalls, 0);
});

test('unavailable bKash is rejected before creating an order', async () => {
  const db = new MemoryD1();
  const shopify = createShopifyFetch();
  const env = testEnvironment({ db, fetchImpl: shopify.fetchImpl, bkashEnabled: false });
  const lines = [{ variantId: '101', quantity: 2, properties: {} }];
  const quote = await quoteFor(env, lines);
  const url = await proxyUrl('/proxy/orders');
  const response = await runRequest(new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId,
      quoteToken: quote.quoteToken,
      lines,
      customer: {
        name: 'রহিম উদ্দিন',
        phone: '01712345678',
        address: 'বাড়ি ১, সড়ক ২',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Dhaka City',
        paymentMethod: 'bkash'
      }
    })
  }), env);
  assert.equal(response.status, 422);
  assert.equal(shopify.state.mutations, 0);
  assert.equal(db.rows.size, 0);
});
