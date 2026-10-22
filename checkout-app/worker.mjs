import {
  DIVISIONS,
  DISTRICTS,
  UPAZILAS,
  buildOrderInput,
  buildQuote,
  createQuoteToken,
  hmacHex,
  normalizeLines,
  readQuoteToken,
  sameLines,
  sameQuote,
  validateCustomer,
  verifyAppProxy
} from './worker-domain.mjs';

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

const HEALTH_QUERY = `query HaatRushCheckoutHealth {
  shop { currencyCode }
  products(first: 1) {
    nodes {
      variants(first: 1) {
        nodes {
          inventoryQuantity
          inventoryItem { tracked }
        }
      }
    }
  }
}`;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function errorResponse(status, code, message, extra = {}) {
  return jsonResponse({ error: message, code, ...extra }, status);
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 32768) {
    throw new Error('request_too_large');
  }
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('invalid_content_type');
  }
  const text = await request.text();
  if (text.length > 32768) {
    throw new Error('request_too_large');
  }
  return JSON.parse(text);
}

function validateConfiguration(env) {
  const domain = env.SHOPIFY_SHOP_DOMAIN || '';
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)
    && typeof env.SHOPIFY_API_SECRET === 'string' && env.SHOPIFY_API_SECRET.length >= 32
    && typeof env.SHOPIFY_ADMIN_ACCESS_TOKEN === 'string' && env.SHOPIFY_ADMIN_ACCESS_TOKEN.length > 0
    && typeof env.QUOTE_TOKEN_SECRET === 'string' && env.QUOTE_TOKEN_SECRET.length >= 32
    && typeof env.SHOPIFY_API_VERSION === 'string'
    && /^\d{4}-(01|04|07|10)$/.test(env.SHOPIFY_API_VERSION);
}

async function adminGraphql(env, query, variables, fetchImpl) {
  const response = await fetchImpl(
    `https://${env.SHOPIFY_SHOP_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_ACCESS_TOKEN
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000)
    }
  );
  if (!response.ok) {
    const error = new Error('Shopify Admin API rejected the request.');
    error.status = response.status;
    throw error;
  }
  const result = await response.json();
  if (result.errors?.length) {
    throw new Error('Shopify Admin API returned GraphQL errors.');
  }
  return result.data;
}

async function loadCatalog(lines, env, fetchImpl) {
  const ids = [...new Set(lines.map((line) => `gid://shopify/ProductVariant/${line.variantId}`))];
  const data = await adminGraphql(env, CATALOG_QUERY, { ids }, fetchImpl);
  if (!data?.shop || data.shop.currencyCode !== 'BDT') {
    throw new Error('Shopify store currency must be BDT.');
  }
  return (data.nodes || []).filter(Boolean).map((variant) => ({
    legacyResourceId: String(variant.legacyResourceId),
    title: variant.title,
    availableForSale: variant.availableForSale,
    inventoryTracked: Boolean(variant.inventoryItem?.tracked),
    inventoryQuantity: variant.inventoryQuantity,
    price: variant.price,
    product: variant.product
  }));
}

function parseStoredResponse(record) {
  if (!record?.response_json) {
    return null;
  }
  try {
    return JSON.parse(record.response_json);
  } catch {
    return null;
  }
}

async function getSubmission(db, submissionId) {
  return db.prepare(
    'SELECT request_hash, status, order_id, order_name, response_json FROM checkout_submissions WHERE submission_id = ?1'
  ).bind(submissionId).first();
}

async function updateSubmission(db, submissionId, status, order, response) {
  await db.prepare(
    `UPDATE checkout_submissions
     SET status = ?2, order_id = ?3, order_name = ?4, response_json = ?5, updated_at = ?6
     WHERE submission_id = ?1`
  ).bind(
    submissionId,
    status,
    order?.id || null,
    order?.name || null,
    response ? JSON.stringify(response) : null,
    Math.floor(Date.now() / 1000)
  ).run();
}

function customerFacingCatalogError(error) {
  if (/কার্ট|পণ্য|জেলা|স্টক|BDT|অর্ডারে সর্বোচ্চ/i.test(error.message)) {
    return { status: 422, code: 'cart_invalid', message: error.message };
  }
  return {
    status: 503,
    code: 'catalog_unavailable',
    message: 'দাম ও স্টক যাচাই করা যাচ্ছে না। আবার চেষ্টা করুন।'
  };
}

export async function handleRequest(request, env, dependencies = {}) {
  const url = new URL(request.url);
  const fetchImpl = dependencies.fetchImpl || fetch;
  const now = dependencies.now || Date.now;

  if (url.pathname === '/healthz' && request.method === 'GET') {
    return jsonResponse({ status: 'ok' });
  }
  if (!url.pathname.startsWith('/proxy/')) {
    return errorResponse(404, 'not_found', 'অনুরোধটি পাওয়া যায়নি।');
  }
  if (!await verifyAppProxy(url, env.SHOPIFY_API_SECRET || '', env.SHOPIFY_SHOP_DOMAIN || '', now())) {
    return errorResponse(401, 'invalid_shopify_proxy', 'এই অনুরোধ যাচাই করা যায়নি।');
  }
  if (!validateConfiguration(env)) {
    return errorResponse(503, 'service_not_configured', 'অর্ডার সেবা এখনো প্রস্তুত নয়।');
  }
  const route = url.pathname.replace(/^\/proxy/, '');

  if (route === '/config' && request.method === 'GET') {
    return jsonResponse({
      divisions: DIVISIONS,
      districts: DISTRICTS,
      upazilas: UPAZILAS,
      bkashEnabled: env.BKASH_ENABLED === 'true'
    });
  }

  if (route === '/health' && request.method === 'GET') {
    try {
      if (!env.DB) {
        throw new Error('D1 binding is not configured.');
      }
      await env.DB.prepare('SELECT 1 AS ready').first();
      const result = await adminGraphql(env, HEALTH_QUERY, {}, fetchImpl);
      if (result?.shop?.currencyCode !== 'BDT') {
        return errorResponse(503, 'shop_currency_invalid', 'দোকানের মুদ্রা BDT নয়।');
      }
      return jsonResponse({
        status: 'ok',
        integrations: { database: 'ok', shopify: 'ok' },
        currency: result.shop.currencyCode
      });
    } catch {
      return errorResponse(503, 'integration_unavailable', 'Shopify বা অর্ডার সংযোগ যাচাই করা যায়নি।');
    }
  }

  if (route === '/quote' && request.method === 'POST') {
    let body;
    try {
      body = await readJson(request);
    } catch (error) {
      const large = error.message === 'request_too_large';
      return errorResponse(large ? 413 : 400, large ? 'request_too_large' : 'invalid_request',
        large ? 'অনুরোধটি খুব বড়।' : 'অনুরোধের তথ্য সঠিক নয়।');
    }
    let lines;
    try {
      lines = normalizeLines(body?.lines);
    } catch (error) {
      return errorResponse(422, 'quote_invalid', error.message);
    }

    try {
      const variants = await loadCatalog(lines, env, fetchImpl);
      const quote = buildQuote(lines, variants, body?.district, body?.division, body?.upazila);
      return jsonResponse({
        ...quote,
        quoteToken: await createQuoteToken(quote, env.QUOTE_TOKEN_SECRET, now())
      });
    } catch (error) {
      const safe = customerFacingCatalogError(error);
      return errorResponse(safe.status, safe.code, safe.message);
    }
  }

  const statusMatch = route.match(/^\/orders\/([0-9a-f-]{36})$/i);
  if (statusMatch && request.method === 'GET' && uuidPattern.test(statusMatch[1])) {
    if (!env.DB) {
      return errorResponse(503, 'checkout_storage_unavailable', 'অর্ডারের অবস্থা যাচাই করা যাচ্ছে না।');
    }
    try {
      const record = await getSubmission(env.DB, statusMatch[1]);
      if (!record) {
        return errorResponse(404, 'submission_not_found', 'এই অর্ডার জমার তথ্য পাওয়া যায়নি।');
      }
      return jsonResponse({
        status: record.status,
        submissionId: statusMatch[1],
        response: parseStoredResponse(record)
      });
    } catch {
      return errorResponse(503, 'checkout_storage_unavailable', 'অর্ডারের অবস্থা যাচাই করা যাচ্ছে না।');
    }
  }

  if (route !== '/orders' || request.method !== 'POST') {
    return errorResponse(404, 'not_found', 'অনুরোধটি পাওয়া যায়নি।');
  }
  if (!env.DB) {
    return errorResponse(503, 'checkout_storage_unavailable', 'অর্ডার সেবা সাময়িকভাবে অনুপলভ্য।');
  }

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    const large = error.message === 'request_too_large';
    return errorResponse(large ? 413 : 400, large ? 'request_too_large' : 'invalid_request',
      large ? 'অনুরোধটি খুব বড়।' : 'অনুরোধের তথ্য সঠিক নয়।');
  }

  const submissionId = body?.submissionId;
  if (typeof submissionId !== 'string' || !uuidPattern.test(submissionId)) {
    return errorResponse(400, 'invalid_submission_id', 'অর্ডার জমা দেওয়া যায়নি। আবার চেষ্টা করুন।');
  }

  let lines;
  let customer;
  const snapshot = await readQuoteToken(body.quoteToken, env.QUOTE_TOKEN_SECRET, now());
  try {
    lines = normalizeLines(body.lines);
    customer = validateCustomer(body.customer);
  } catch (error) {
    return errorResponse(422, 'invalid_checkout', error.message, { retryable: true });
  }
  if (customer.paymentMethod === 'bkash' && env.BKASH_ENABLED !== 'true') {
    return errorResponse(422, 'bkash_unavailable', 'বিকাশ পেমেন্ট এখন চালু নেই।', { retryable: true });
  }
  if (!snapshot
    || snapshot.division !== customer.division
    || snapshot.district !== customer.district
    || snapshot.upazila !== customer.upazila
    || !sameLines(snapshot.lines, lines)) {
    return errorResponse(409, 'quote_expired', 'দাম বা কার্টের তথ্য বদলেছে। অর্ডার দেওয়ার আগে সারাংশটি আবার যাচাই করুন।', { retryable: true });
  }

  const requestHash = await hmacHex(env.QUOTE_TOKEN_SECRET, JSON.stringify({
    quoteToken: body.quoteToken,
    lines,
    customer
  }));
  let record;
  let reservation;
  try {
    reservation = await env.DB.prepare(
      `INSERT OR IGNORE INTO checkout_submissions
       (submission_id, request_hash, status, created_at, updated_at)
       VALUES (?1, ?2, 'processing', ?3, ?3)`
    ).bind(submissionId, requestHash, Math.floor(now() / 1000)).run();
    record = await getSubmission(env.DB, submissionId);
  } catch {
    return errorResponse(503, 'checkout_storage_unavailable', 'অর্ডার সেবা সাময়িকভাবে অনুপলভ্য।');
  }
  if (!record || record.request_hash !== requestHash) {
    return errorResponse(409, 'submission_conflict', 'এই অর্ডার জমার অনুরোধটি আগে থেকেই ব্যবহৃত হয়েছে।');
  }
  if (record.status === 'created') {
    return jsonResponse(parseStoredResponse(record) || { status: 'created', orderName: record.order_name });
  }
  if (record.status === 'failed') {
    const result = parseStoredResponse(record) || {};
    return errorResponse(409, result.code || 'submission_failed', result.error || 'অর্ডারটি তৈরি হয়নি। নতুন করে চেষ্টা করুন।', { retryable: true });
  }
  if (record.status === 'processing' && !reservation?.meta?.changes) {
    return jsonResponse({ status: 'processing', submissionId }, 202);
  }

  let freshQuote;
  try {
    const variants = await loadCatalog(lines, env, fetchImpl);
    freshQuote = buildQuote(lines, variants, customer.district, customer.division, customer.upazila);
    if (!sameQuote(snapshot, freshQuote)) {
      const result = { code: 'quote_changed', error: 'দাম বা স্টক বদলেছে। নতুন সারাংশ দেখে আবার অর্ডার দিন।' };
      await updateSubmission(env.DB, submissionId, 'failed', null, result);
      return errorResponse(409, result.code, result.error, { retryable: true });
    }
  } catch (error) {
    const safe = customerFacingCatalogError(error);
    await updateSubmission(env.DB, submissionId, 'failed', null, { code: safe.code, error: safe.message });
    return errorResponse(safe.status, safe.code, safe.message, { retryable: true });
  }

  let orderData;
  try {
    const order = buildOrderInput({
      quote: freshQuote,
      lines,
      customer,
      submissionId,
      bkashEnabled: env.BKASH_ENABLED === 'true'
    });
    const result = await adminGraphql(env, ORDER_CREATE_MUTATION, {
      order,
      options: {
        inventoryBehaviour: 'DECREMENT_OBEYING_POLICY',
        sendReceipt: true,
        sendFulfillmentReceipt: false
      }
    }, fetchImpl);
    orderData = result?.orderCreate;
    if (orderData?.userErrors?.length || !orderData?.order) {
      const resultMessage = orderData?.userErrors?.some((item) => /inventory|stock|available/i.test(item.message))
        ? 'পণ্যের স্টক বদলে গেছে। কার্ট যাচাই করে আবার চেষ্টা করুন।'
        : 'Shopify অর্ডারটি গ্রহণ করেনি। আবার চেষ্টা করুন।';
      const failure = { code: 'shopify_rejected', error: resultMessage };
      await updateSubmission(env.DB, submissionId, 'failed', null, failure);
      return errorResponse(422, failure.code, failure.error, { retryable: true });
    }
  } catch (error) {
    if (error.status && error.status >= 400 && error.status < 500) {
      const failure = { code: 'shopify_rejected', error: 'Shopify অর্ডারটি গ্রহণ করেনি। আবার চেষ্টা করুন।' };
      await updateSubmission(env.DB, submissionId, 'failed', null, failure);
      return errorResponse(503, failure.code, failure.error, { retryable: true });
    }
    console.error('Order creation outcome unknown; submission remains reserved.', submissionId);
    return jsonResponse({ status: 'processing', submissionId }, 202);
  }

  const order = orderData.order;
  const money = (set) => set?.shopMoney?.amount || null;
  const confirmation = {
    status: 'created',
    submissionId,
    orderName: order.name,
    financialStatus: order.displayFinancialStatus,
    subtotal: freshQuote.subtotal,
    discount: money(order.currentTotalDiscountsSet),
    shipping: money(order.currentShippingPriceSet),
    total: money(order.currentTotalPriceSet),
    paymentMethod: customer.paymentMethod
  };
  try {
    await updateSubmission(env.DB, submissionId, 'created', order, confirmation);
  } catch {
    console.error('Created Shopify order could not be saved to the idempotency ledger.', submissionId);
    return jsonResponse({ status: 'processing', submissionId }, 202);
  }
  return jsonResponse(confirmation, 201);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
