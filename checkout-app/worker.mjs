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
  verifyAppProxy,
  verifyShopifyOAuthHmac
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
      price
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
const requiredScopes = ['read_inventory', 'read_products', 'write_customers', 'write_orders', 'write_app_proxy'];
const oauthStateLifetime = 600;

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
  let publicOrigin = '';
  try {
    const parsedOrigin = new URL(env.SHOPIFY_WORKER_ORIGIN);
    if (parsedOrigin.protocol === 'https:' && parsedOrigin.origin === env.SHOPIFY_WORKER_ORIGIN) {
      publicOrigin = parsedOrigin.origin;
    }
  } catch {
    publicOrigin = '';
  }
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)
    && typeof env.SHOPIFY_API_SECRET === 'string' && env.SHOPIFY_API_SECRET.length >= 32
    && isShopifyClientId(env.SHOPIFY_CLIENT_ID)
    && typeof env.SHOPIFY_TOKEN_ENCRYPTION_KEY === 'string' && env.SHOPIFY_TOKEN_ENCRYPTION_KEY.length >= 32
    && typeof env.QUOTE_TOKEN_SECRET === 'string' && env.QUOTE_TOKEN_SECRET.length >= 32
    && publicOrigin.length > 0
    && typeof env.SHOPIFY_API_VERSION === 'string'
    && /^\d{4}-(01|04|07|10)$/.test(env.SHOPIFY_API_VERSION);
}

function isShopifyClientId(value) {
  return typeof value === 'string' && value.length > 0 && !/^shpss_/i.test(value);
}

function base64Encode(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64Decode(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function tokenEncryptionKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptToken(token, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await tokenEncryptionKey(secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(token))
  );
  return JSON.stringify({ iv: base64Encode(iv), ciphertext: base64Encode(new Uint8Array(ciphertext)) });
}

async function decryptToken(encrypted, secret) {
  const envelope = JSON.parse(encrypted);
  const key = await tokenEncryptionKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(envelope.iv) },
    key,
    base64Decode(envelope.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function randomHex(byteLength) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchAdminToken(env, fetchImpl, now) {
  if (!env.DB || !env.SHOPIFY_TOKEN_ENCRYPTION_KEY) {
    throw new Error('Shopify authorization storage is unavailable.');
  }
  const record = await env.DB.prepare(
    'SELECT encrypted_token FROM shopify_installations WHERE shop_domain = ?1'
  ).bind(env.SHOPIFY_SHOP_DOMAIN).first();
  if (!record?.encrypted_token) {
    throw new Error('Shopify app is not installed.');
  }
  const token = await decryptToken(record.encrypted_token, env.SHOPIFY_TOKEN_ENCRYPTION_KEY);
  if (token.expiresAt === null || token.expiresAt > now() + 60000) {
    return token.accessToken;
  }
  if (!token.refreshToken) {
    throw new Error('Shopify access token has expired; reinstall the app.');
  }
  const response = await fetchImpl(`https://${env.SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_API_SECRET,
      refresh_token: token.refreshToken
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error('Shopify access token refresh failed.');
  }
  const refreshed = await response.json();
  const expiresIn = Number(refreshed.expires_in);
  if (typeof refreshed.access_token !== 'string' || !refreshed.access_token
    || typeof refreshed.refresh_token !== 'string' || !refreshed.refresh_token
    || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('Shopify returned an invalid refreshed access token.');
  }
  const refreshedToken = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: now() + expiresIn * 1000,
    scope: String(refreshed.scope || token.scope || '')
  };
  await env.DB.prepare(
    'UPDATE shopify_installations SET encrypted_token = ?2, scopes = ?3, expires_at = ?4, updated_at = ?5 WHERE shop_domain = ?1'
  ).bind(
    env.SHOPIFY_SHOP_DOMAIN,
    await encryptToken(refreshedToken, env.SHOPIFY_TOKEN_ENCRYPTION_KEY),
    refreshedToken.scope,
    refreshedToken.expiresAt,
    Math.floor(now() / 1000)
  ).run();
  return refreshedToken.accessToken;
}

function shopifyOAuthMessage(url) {
  if (url.searchParams.getAll('shop').length !== 1
    || url.searchParams.getAll('timestamp').length !== 1
    || url.searchParams.getAll('state').length !== 1
    || url.searchParams.getAll('code').length !== 1
    || url.searchParams.getAll('hmac').length !== 1) {
    return 'Shopify authorization response is invalid.';
  }
  return '';
}

async function installStart(request, env, now) {
  const url = new URL(request.url);
  if (!env.DB || !isShopifyClientId(env.SHOPIFY_CLIENT_ID) || !env.SHOPIFY_API_SECRET
    || !env.SHOPIFY_TOKEN_ENCRYPTION_KEY || !env.SHOPIFY_WORKER_ORIGIN) {
    return errorResponse(503, 'oauth_not_configured', 'Shopify app authorization is not configured.');
  }
  const shop = url.searchParams.get('shop') || env.SHOPIFY_SHOP_DOMAIN;
  if (shop !== env.SHOPIFY_SHOP_DOMAIN) {
    return errorResponse(400, 'invalid_shop', 'The requested Shopify store is not configured.');
  }
  const state = randomHex(32);
  const stateHash = await sha256Hex(state);
  const issuedAt = Math.floor(now() / 1000);
  await env.DB.prepare('DELETE FROM shopify_oauth_states WHERE expires_at < ?1')
    .bind(issuedAt).run();
  await env.DB.prepare('DELETE FROM shopify_oauth_states WHERE shop_domain = ?1')
    .bind(shop).run();
  await env.DB.prepare(
    'INSERT INTO shopify_oauth_states (state_hash, shop_domain, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)'
  ).bind(stateHash, shop, issuedAt, issuedAt + oauthStateLifetime).run();

  const callback = new URL('/oauth/callback', env.SHOPIFY_WORKER_ORIGIN);
  const authorization = new URL(`https://${shop}/admin/oauth/authorize`);
  authorization.searchParams.set('client_id', env.SHOPIFY_CLIENT_ID);
  authorization.searchParams.set('scope', requiredScopes.join(','));
  authorization.searchParams.set('redirect_uri', callback.toString());
  authorization.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorization.toString(),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function oauthCallback(request, env, fetchImpl, now) {
  const url = new URL(request.url);
  const malformed = shopifyOAuthMessage(url);
  if (malformed) {
    return errorResponse(400, 'invalid_oauth_response', malformed);
  }
  if (!env.DB || !env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_API_SECRET
    || !env.SHOPIFY_TOKEN_ENCRYPTION_KEY || !env.SHOPIFY_WORKER_ORIGIN
    || url.origin !== env.SHOPIFY_WORKER_ORIGIN) {
    return errorResponse(503, 'oauth_not_configured', 'Shopify app authorization is not configured.');
  }
  if (!await verifyShopifyOAuthHmac(url, env.SHOPIFY_API_SECRET)) {
    return errorResponse(401, 'invalid_oauth_hmac', 'Shopify authorization could not be verified.');
  }
  const shop = url.searchParams.get('shop');
  const timestamp = Number(url.searchParams.get('timestamp'));
  const state = url.searchParams.get('state');
  if (shop !== env.SHOPIFY_SHOP_DOMAIN || !Number.isInteger(timestamp)
    || Math.abs(Math.floor(now() / 1000) - timestamp) > oauthStateLifetime
    || !/^[a-f0-9]{64}$/i.test(state)) {
    return errorResponse(400, 'invalid_oauth_response', 'Shopify authorization response is expired or invalid.');
  }
  let stateRecord;
  try {
    stateRecord = await env.DB.prepare(
      'DELETE FROM shopify_oauth_states WHERE state_hash = ?1 AND shop_domain = ?2 AND expires_at >= ?3 RETURNING shop_domain'
    ).bind(await sha256Hex(state), shop, Math.floor(now() / 1000)).first();
  } catch {
    return errorResponse(503, 'oauth_storage_unavailable', 'Shopify authorization storage is unavailable.');
  }
  if (!stateRecord) {
    return errorResponse(401, 'invalid_oauth_state', 'Shopify authorization session expired or was already used.');
  }

  let response;
  try {
    response = await fetchImpl(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_API_SECRET,
        code: url.searchParams.get('code')
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    return errorResponse(502, 'oauth_exchange_failed', 'Shopify authorization could not be completed. Start installation again.');
  }
  if (!response.ok) {
    return errorResponse(502, 'oauth_exchange_failed', 'Shopify authorization could not be completed. Start installation again.');
  }
  let credentials;
  try {
    credentials = await response.json();
  } catch {
    return errorResponse(502, 'oauth_exchange_failed', 'Shopify returned an invalid authorization response.');
  }
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
    return errorResponse(502, 'oauth_exchange_failed', 'Shopify returned an invalid authorization response.');
  }
  const grantedScopes = new Set(String(credentials.scope || '').split(',').map((scope) => scope.trim()).filter(Boolean));
  if (typeof credentials.access_token !== 'string' || !credentials.access_token
    || !requiredScopes.every((scope) => grantedScopes.has(scope))) {
    return errorResponse(403, 'oauth_scopes_missing', 'Shopify did not grant all required app permissions.');
  }
  const expiresIn = credentials.expires_in === undefined ? null : Number(credentials.expires_in);
  if (expiresIn !== null && (!Number.isFinite(expiresIn) || expiresIn <= 0
    || typeof credentials.refresh_token !== 'string' || !credentials.refresh_token)) {
    return errorResponse(502, 'oauth_exchange_failed', 'Shopify returned invalid offline-token credentials.');
  }
  const token = {
    accessToken: credentials.access_token,
    refreshToken: typeof credentials.refresh_token === 'string' ? credentials.refresh_token : '',
    expiresAt: expiresIn !== null
      ? now() + expiresIn * 1000
      : null,
    scope: [...grantedScopes].sort().join(',')
  };
  try {
    const encrypted = await encryptToken(token, env.SHOPIFY_TOKEN_ENCRYPTION_KEY);
    const updatedAt = Math.floor(now() / 1000);
    await env.DB.prepare(
      `INSERT INTO shopify_installations (shop_domain, encrypted_token, scopes, expires_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)
       ON CONFLICT(shop_domain) DO UPDATE SET
         encrypted_token = excluded.encrypted_token,
         scopes = excluded.scopes,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`
    ).bind(shop, encrypted, token.scope, token.expiresAt || null, updatedAt).run();
  } catch {
    return errorResponse(503, 'oauth_storage_unavailable', 'Shopify access could not be securely stored.');
  }
  return jsonResponse({
    status: 'installed',
    shop,
    scopes: token.scope.split(',')
  });
}

async function adminGraphql(env, query, variables, fetchImpl) {
  const accessToken = await fetchAdminToken(env, fetchImpl, Date.now);
  const response = await fetchImpl(
    `https://${env.SHOPIFY_SHOP_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000)
    }
  );
  if (!response.ok) {
    const error = new Error('Shopify Admin API rejected the request.');
    error.status = response.status;
    error.adminStage = 'http';
    throw error;
  }
  const result = await response.json();
  if (result.errors?.length) {
    const error = new Error('Shopify Admin API returned GraphQL errors.');
    error.adminStage = 'graphql';
    error.graphqlCodes = [...new Set(result.errors
      .map((item) => item.extensions?.code)
      .filter((code) => typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code)))]
      .slice(0, 5);
    throw error;
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
    price: { amount: variant.price, currencyCode: data.shop.currencyCode },
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
  if (url.pathname === '/oauth/install' && request.method === 'GET') {
    try {
      return await installStart(request, env, now);
    } catch {
      return errorResponse(503, 'oauth_storage_unavailable', 'Shopify authorization storage is unavailable.');
    }
  }
  if (url.pathname === '/oauth/callback' && request.method === 'GET') {
    return oauthCallback(request, env, fetchImpl, now);
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
      const customerValues = Object.values(customer)
        .filter((value) => typeof value === 'string' && value.length >= 3);
      const safeUserErrors = (orderData?.userErrors || []).slice(0, 5).map((item) => {
        let message = String(item.message || '');
        for (const value of customerValues) {
          message = message.replaceAll(value, '[redacted]');
        }
        return {
          field: Array.isArray(item.field) ? item.field.slice(0, 6) : [],
          code: typeof item.code === 'string' ? item.code : null,
          message: message.replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]').slice(0, 180)
        };
      });
      console.error('Shopify rejected order input.', { userErrors: safeUserErrors });
      const resultMessage = orderData?.userErrors?.some((item) => /inventory|stock|available/i.test(item.message))
        ? 'পণ্যের স্টক বদলে গেছে। কার্ট যাচাই করে আবার চেষ্টা করুন।'
        : 'Shopify অর্ডারটি গ্রহণ করেনি। আবার চেষ্টা করুন।';
      const failure = { code: 'shopify_rejected', error: resultMessage };
      await updateSubmission(env.DB, submissionId, 'failed', null, failure);
      return errorResponse(422, failure.code, failure.error, { retryable: true });
    }
  } catch (error) {
    if (error.adminStage === 'graphql') {
      const failure = { code: 'shopify_rejected', error: 'Shopify অর্ডারটি গ্রহণ করেনি। আবার চেষ্টা করুন।' };
      await updateSubmission(env.DB, submissionId, 'failed', null, failure);
      console.error('Shopify order mutation returned GraphQL errors.', { codes: error.graphqlCodes || [] });
      return errorResponse(422, failure.code, failure.error, { retryable: true });
    }
    if (error.status && error.status >= 400 && error.status < 500) {
      const failure = { code: 'shopify_rejected', error: 'Shopify অর্ডারটি গ্রহণ করেনি। আবার চেষ্টা করুন।' };
      await updateSubmission(env.DB, submissionId, 'failed', null, failure);
      return errorResponse(503, failure.code, failure.error, { retryable: true });
    }
    console.error('Order creation outcome unknown; submission remains reserved.', {
      submissionId,
      stage: error.adminStage || 'network_or_token',
      status: Number.isInteger(error.status) ? error.status : null
    });
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
