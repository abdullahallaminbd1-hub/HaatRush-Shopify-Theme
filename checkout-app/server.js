'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');
const {
  DISTRICTS,
  buildOrderInput,
  buildQuote,
  createQuoteToken,
  normalizeLines,
  readQuoteToken,
  validateCustomer,
  verifyAppProxy
} = require('./domain');

const CATALOG_QUERY = `query CheckoutCatalog($ids: [ID!]!) {
  shop { currencyCode }
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      legacyResourceId
      title
      availableForSale
      inventoryQuantity
      inventoryItem { tracked }
      price { amount currencyCode }
      product { title featuredImage { url } }
    }
  }
}`;

const ORDER_CREATE_MUTATION = `mutation CreateHaatRushCodOrder(
  $order: OrderCreateOrderInput!
  $options: OrderCreateOptionsInput
) {
  orderCreate(order: $order, options: $options) {
    order {
      id
      name
      displayFinancialStatus
      currentSubtotalPriceSet { shopMoney { amount currencyCode } }
      currentTotalDiscountsSet { shopMoney { amount currencyCode } }
      currentShippingPriceSet { shopMoney { amount currencyCode } }
      currentTotalPriceSet { shopMoney { amount currencyCode } }
    }
    userErrors { field message }
  }
}`;

function requiredEnvironment(env) {
  const required = [
    'SHOPIFY_SHOP_DOMAIN',
    'SHOPIFY_API_SECRET',
    'SHOPIFY_ADMIN_ACCESS_TOKEN',
    'QUOTE_TOKEN_SECRET',
    'DATABASE_URL'
  ];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (Buffer.byteLength(env.SHOPIFY_API_SECRET) < 32 || Buffer.byteLength(env.QUOTE_TOKEN_SECRET) < 32) {
    throw new Error('Shopify app secret and quote token secret must each be at least 32 bytes.');
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.SHOPIFY_SHOP_DOMAIN)) {
    throw new Error('SHOPIFY_SHOP_DOMAIN must be the shop canonical myshopify.com domain.');
  }
  const apiVersion = env.SHOPIFY_API_VERSION || '2026-10';
  if (!/^\d{4}-(01|04|07|10)$/.test(apiVersion)) {
    throw new Error('SHOPIFY_API_VERSION must use a supported quarterly version such as 2026-10.');
  }
  return {
    shopDomain: env.SHOPIFY_SHOP_DOMAIN,
    appSecret: env.SHOPIFY_API_SECRET,
    adminToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    quoteSecret: env.QUOTE_TOKEN_SECRET,
    apiVersion
  };
}

function safeError(res, status, code, message, extra) {
  res.status(status).json(Object.assign({ error: message, code }, extra || {}));
}

function requestHash(value, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(value)).digest('hex');
}

function sameLines(left, right) {
  return JSON.stringify(left.map((line) => ({
    variantId: line.variantId,
    quantity: line.quantity,
    properties: line.properties
  }))) === JSON.stringify(right.map((line) => ({
    variantId: line.variantId,
    quantity: line.quantity,
    properties: line.properties
  })));
}

function sameQuote(snapshot, fresh) {
  return snapshot.district === fresh.district
    && snapshot.subtotal === fresh.subtotal
    && snapshot.bundleDiscount === fresh.bundleDiscount
    && snapshot.shipping === fresh.shipping
    && snapshot.shippingFree === fresh.shippingFree
    && snapshot.itemCount === fresh.itemCount
    && snapshot.total === fresh.total
    && snapshot.lines.length === fresh.lines.length
    && snapshot.lines.every((line, index) =>
      line.variantId === fresh.lines[index].variantId
      && line.quantity === fresh.lines[index].quantity
      && line.unitPriceMinor === fresh.lines[index].unitPriceMinor
    );
}

function createApp({ config, pool, fetchImpl = fetch, now = Date.now }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb', strict: true }));

  const adminGraphql = async (query, variables) => {
    const response = await fetchImpl(
      `https://${config.shopDomain}/admin/api/${config.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': config.adminToken
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15000)
      }
    );
    if (!response.ok) {
      const error = new Error(`Shopify Admin API returned HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const result = await response.json();
    if (result.errors && result.errors.length) {
      throw new Error('Shopify Admin API returned GraphQL errors.');
    }
    return result.data;
  };

  const loadCatalog = async (lines) => {
    const ids = [...new Set(lines.map((line) => `gid://shopify/ProductVariant/${line.variantId}`))];
    const data = await adminGraphql(CATALOG_QUERY, { ids });
    if (!data || !data.shop || data.shop.currencyCode !== 'BDT') {
      throw new Error('Shopify store currency must be BDT.');
    }
    return (data.nodes || []).filter(Boolean).map((variant) => ({
      legacyResourceId: String(variant.legacyResourceId),
      title: variant.title,
      availableForSale: variant.availableForSale,
      inventoryTracked: variant.inventoryItem.tracked,
      inventoryQuantity: variant.inventoryQuantity,
      price: variant.price,
      product: variant.product
    }));
  };

  const proxyOnly = (req, res, next) => {
    if (!verifyAppProxy({
      originalUrl: req.originalUrl,
      secret: config.appSecret,
      shopDomain: config.shopDomain,
      now: now()
    })) {
      return safeError(res, 401, 'invalid_shopify_proxy', 'এই অনুরোধ যাচাই করা যায়নি।');
    }
    next();
  };

  app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/proxy', proxyOnly);

  app.get('/proxy/config', (_req, res) => {
    res.json({ districts: DISTRICTS });
  });

  app.post('/proxy/quote', async (req, res) => {
    let lines;
    try {
      lines = normalizeLines(req.body && req.body.lines);
    } catch (error) {
      return safeError(res, 422, 'quote_invalid', error.message);
    }

    let variants;
    try {
      variants = await loadCatalog(lines);
    } catch {
      return safeError(res, 503, 'quote_unavailable', 'দাম ও স্টক যাচাই করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }
    try {
      const quote = buildQuote(lines, variants, req.body && req.body.district);
      return res.json({
        ...quote,
        quoteToken: createQuoteToken(quote, config.quoteSecret, now())
      });
    } catch (error) {
      return safeError(res, 422, 'quote_invalid', error.message);
    }
  });

  app.post('/proxy/orders', async (req, res) => {
    const body = req.body || {};
    const submissionId = body.submissionId;
    if (typeof submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
      return safeError(res, 400, 'invalid_submission_id', 'অর্ডার জমা দেওয়া যায়নি। আবার চেষ্টা করুন।');
    }

    let lines;
    let customer;
    const snapshot = readQuoteToken(body.quoteToken, config.quoteSecret, now());
    try {
      lines = normalizeLines(body.lines);
      customer = validateCustomer(body.customer);
    } catch (error) {
      return safeError(res, 422, 'invalid_checkout', error.message, { retryable: true });
    }
    if (!snapshot || snapshot.district !== customer.district || !sameLines(snapshot.lines, lines)) {
      return safeError(res, 409, 'quote_expired', 'দাম বা কার্টের তথ্য বদলেছে। অর্ডার দেওয়ার আগে সারাংশটি আবার যাচাই করুন।', { retryable: true });
    }

    const hash = requestHash({ quoteToken: body.quoteToken, lines, customer }, config.quoteSecret);
    let reserved;
    try {
      reserved = await pool.query(
        `INSERT INTO checkout_submissions (submission_id, request_hash, status)
         VALUES ($1, $2, 'processing')
         ON CONFLICT (submission_id) DO NOTHING
         RETURNING submission_id`,
        [submissionId, hash]
      );
    } catch {
      return safeError(res, 503, 'checkout_storage_unavailable', 'অর্ডার সেবা সাময়িকভাবে বন্ধ আছে। পরে আবার চেষ্টা করুন।', { retryable: true });
    }

    if (!reserved.rowCount) {
      let existing;
      try {
        const result = await pool.query(
          'SELECT request_hash, status, response FROM checkout_submissions WHERE submission_id = $1',
          [submissionId]
        );
        existing = result.rows[0];
      } catch {
        return safeError(res, 503, 'checkout_storage_unavailable', 'অর্ডারের অবস্থা যাচাই করা যাচ্ছে না।');
      }
      if (!existing || existing.request_hash !== hash) {
        return safeError(res, 409, 'submission_conflict', 'এই অর্ডার জমার অনুরোধটি আগে থেকেই ব্যবহৃত হয়েছে।');
      }
      if (existing.status === 'created') {
        return res.json(existing.response);
      }
      if (existing.status === 'failed') {
        return safeError(res, 409, existing.response && existing.response.code || 'submission_failed',
          existing.response && existing.response.error || 'অর্ডারটি তৈরি হয়নি। নতুন করে চেষ্টা করুন।', { retryable: true });
      }
      return res.status(202).json({ status: 'processing', submissionId });
    }

    let variants;
    let freshQuote;
    try {
      variants = await loadCatalog(lines);
      freshQuote = buildQuote(lines, variants, customer.district);
      if (!sameQuote(snapshot, freshQuote)) {
        await pool.query(
          `UPDATE checkout_submissions
           SET status = 'failed', error_code = 'quote_changed', response = $2, updated_at = NOW()
           WHERE submission_id = $1`,
          [submissionId, { code: 'quote_changed', error: 'দাম বা স্টক বদলেছে। নতুন সারাংশ দেখে আবার অর্ডার দিন।' }]
        );
        return safeError(res, 409, 'quote_changed', 'দাম বা স্টক বদলেছে। নতুন সারাংশ দেখে আবার অর্ডার দিন।', { retryable: true });
      }
    } catch (error) {
      await pool.query(
        `UPDATE checkout_submissions
         SET status = 'failed', error_code = 'catalog_unavailable', response = $2, updated_at = NOW()
         WHERE submission_id = $1`,
        [submissionId, { code: 'catalog_unavailable', error: 'দাম ও স্টক যাচাই করা যাচ্ছে না। আবার চেষ্টা করুন।' }]
      );
      const isClientError = /কার্ট|পণ্য|জেলা|স্টক|BDT|পণ্যের/i.test(error.message);
      return safeError(res, isClientError ? 422 : 503,
        isClientError ? 'cart_unavailable' : 'catalog_unavailable',
        isClientError ? error.message : 'দাম ও স্টক যাচাই করা যাচ্ছে না। আবার চেষ্টা করুন।',
        { retryable: true });
    }

    const { order } = buildOrderInput({ quote: freshQuote, lines, customer, submissionId });
    let result;
    try {
      result = await adminGraphql(ORDER_CREATE_MUTATION, {
        order,
        options: {
          inventoryBehaviour: 'DECREMENT_OBEYING_POLICY',
          sendReceipt: false,
          sendFulfillmentReceipt: false
        }
      });
    } catch (error) {
      if (error.status && error.status >= 400 && error.status < 500) {
        await pool.query(
          `UPDATE checkout_submissions
           SET status = 'failed', error_code = 'shopify_rejected', response = $2, updated_at = NOW()
           WHERE submission_id = $1`,
          [submissionId, { code: 'shopify_rejected', error: 'Shopify অর্ডারটি গ্রহণ করেনি। আবার চেষ্টা করুন।' }]
        );
        return safeError(res, 503, 'shopify_rejected', 'Shopify অর্ডারটি গ্রহণ করেনি। আবার চেষ্টা করুন।', { retryable: true });
      }
      console.error('Order creation outcome is unknown; submission remains reserved.', submissionId);
      return res.status(202).json({ status: 'processing', submissionId });
    }

    const payload = result && result.orderCreate;
    if (payload && payload.order && (!payload.userErrors || payload.userErrors.length === 0)) {
      const money = (set) => set && set.shopMoney ? set.shopMoney.amount : null;
      const confirmation = {
        status: 'created',
        orderName: payload.order.name,
        financialStatus: payload.order.displayFinancialStatus,
        subtotal: money(payload.order.currentSubtotalPriceSet),
        discount: money(payload.order.currentTotalDiscountsSet),
        shipping: money(payload.order.currentShippingPriceSet),
        total: money(payload.order.currentTotalPriceSet)
      };
      await pool.query(
        `UPDATE checkout_submissions
         SET status = 'created', order_id = $2, order_name = $3, response = $4, updated_at = NOW()
         WHERE submission_id = $1`,
        [submissionId, payload.order.id, payload.order.name, confirmation]
      );
      return res.status(201).json(confirmation);
    }

    const messages = payload && payload.userErrors || [];
    const safeMessage = messages.some((error) => /inventory|stock|available/i.test(error.message))
      ? 'একটি পণ্য পর্যাপ্ত স্টকে নেই। কার্ট পরিবর্তন করে আবার চেষ্টা করুন।'
      : 'Shopify অর্ডারটি তৈরি করতে পারেনি। তথ্য যাচাই করে আবার চেষ্টা করুন।';
    await pool.query(
      `UPDATE checkout_submissions
       SET status = 'failed', error_code = 'order_create_rejected', response = $2, updated_at = NOW()
       WHERE submission_id = $1`,
      [submissionId, { code: 'order_create_rejected', error: safeMessage }]
    );
    return safeError(res, 422, 'order_create_rejected', safeMessage, { retryable: true });
  });

  app.get('/proxy/status', async (req, res) => {
    const submissionId = req.query.submissionId;
    if (typeof submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
      return safeError(res, 400, 'invalid_submission_id', 'অর্ডারের অবস্থা যাচাই করা যায়নি।');
    }
    try {
      const result = await pool.query(
        'SELECT status, response FROM checkout_submissions WHERE submission_id = $1',
        [submissionId]
      );
      const record = result.rows[0];
      if (!record) {
        return safeError(res, 404, 'submission_not_found', 'অর্ডারের অনুরোধটি পাওয়া যায়নি।');
      }
      if (record.status === 'created') {
        return res.json(record.response);
      }
      if (record.status === 'failed') {
        return safeError(res, 422, record.response.code, record.response.error, { retryable: true });
      }
      return res.status(202).json({ status: 'processing', submissionId });
    } catch {
      return safeError(res, 503, 'checkout_storage_unavailable', 'অর্ডারের অবস্থা যাচাই করা যাচ্ছে না।');
    }
  });

  return app;
}

async function start() {
  const config = requiredEnvironment(process.env);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const app = createApp({ config, pool });
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`HaatRush checkout listening on port ${port}`));
  const shutdown = () => server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('HaatRush checkout failed to start:', error.message);
    process.exit(1);
  });
}

module.exports = { CATALOG_QUERY, ORDER_CREATE_MUTATION, createApp, requiredEnvironment };
