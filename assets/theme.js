/* HaatRush theme behaviour - V2 */
(function () {
  'use strict';

  var body = document.body;
  var qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The header is a normal, non-sticky element in ordinary document flow, so
     there is deliberately no scroll listener, no scroll-direction state and no
     visibility toggling for it. It scrolls away with the page like any other
     block. */

  /* ---------- overlay helpers ---------- */
  var cartDrawer = qs('[data-cart-drawer]');
  var menuDrawer = qs('[data-menu-drawer]');
  var searchOverlay = qs('[data-search-overlay]');

  var isLocked = function () {
    return body.classList.contains('drawer-open') || body.classList.contains('mobile-nav-open') || body.classList.contains('search-open');
  };
  var setFlag = function (cls, open) {
    if (open && isLocked()) { return false; }
    body.classList.toggle(cls, open);
    return true;
  };

  var setDrawer = function (open) {
    if (!setFlag('drawer-open', open)) { return; }
    if (cartDrawer) { cartDrawer.setAttribute('aria-hidden', open ? 'false' : 'true'); }
  };
  var setMenu = function (open) {
    if (!setFlag('mobile-nav-open', open)) { return; }
    if (menuDrawer) { menuDrawer.setAttribute('aria-hidden', open ? 'false' : 'true'); }
    qsa('[data-menu-open]').forEach(function (t) { t.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  };
  /* The mobile search overlay closes from three places: the close control, the
     backdrop behind it, and the Escape key handled below. Opening keeps the
     existing behaviour (same form, same query, same results). Blurring the
     field on close stops the on-screen keyboard from lingering. */
  var setSearch = function (open) {
    if (!setFlag('search-open', open)) { return; }
    if (searchOverlay) {
      searchOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        var input = qs('input[type="search"]', searchOverlay);
        if (input) { window.setTimeout(function () { input.focus(); }, 240); }
      } else {
        var active = qs('input[type="search"]', searchOverlay);
        if (active && active.blur) { active.blur(); }
      }
    }
  };
  var setFilters = function (open) { body.classList.toggle('filter-panel-open', open); };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (target.closest('[data-cart-open]')) { event.preventDefault(); setDrawer(true); return; }
    if (target.closest('[data-drawer-close]')) { event.preventDefault(); setDrawer(false); return; }
    if (target.closest('[data-menu-open]')) { event.preventDefault(); setMenu(!body.classList.contains('mobile-nav-open')); return; }
    if (target.closest('[data-menu-close]')) { event.preventDefault(); setMenu(false); return; }
    if (target.closest('[data-search-open]')) { event.preventDefault(); setSearch(true); return; }
    if (target.closest('[data-search-close]')) { event.preventDefault(); setSearch(false); return; }
    if (target.closest('[data-filter-open]')) { event.preventDefault(); setFilters(true); return; }
    if (target.closest('[data-filter-close]')) { event.preventDefault(); setFilters(false); return; }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') { return; }
    setDrawer(false); setMenu(false); setSearch(false); setFilters(false);
  });

  /* ---------- hero slideshow ---------- */
  qsa('[data-slideshow]').forEach(function (root) {
    var slides = qsa('[data-slide]', root);
    if (slides.length < 2) { return; }
    var dots = qsa('[data-slide-dot]', root);
    var delay = Math.max(3, parseInt(root.getAttribute('data-autoplay'), 10) || 6) * 1000;
    var index = 0;
    var timer = null;

    var show = function (next) {
      index = next;
      slides.forEach(function (slide, i) { slide.classList.toggle('is-active', i === index); });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
        dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    };
    var stop = function () { if (timer) { window.clearInterval(timer); timer = null; } };
    var start = function () { stop(); if (!reduceMotion) { timer = window.setInterval(function () { show((index + 1) % slides.length); }, delay); } };

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () { show(parseInt(dot.getAttribute('data-slide-dot'), 10) || 0); start(); });
    });
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); } else { start(); } });

    var startX = 0;
    root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { show((index + (dx < 0 ? 1 : slides.length - 1)) % slides.length); start(); }
    }, { passive: true });

    show(0);
    start();
  });

  /* ---------- reveal on scroll ---------- */
  var revealables = qsa('[data-reveal]');
  if (revealables.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      revealables.forEach(function (el) { observer.observe(el); });
    } else {
      revealables.forEach(function (el) { el.classList.add('is-revealed'); });
    }
  }

  /* ---------- product gallery thumbnails (legacy markup) + quantity ---------- */
  document.addEventListener('click', function (event) {
    var thumb = event.target.closest('[data-gallery-thumb]');
    if (thumb) {
      /* The new product section owns its own gallery; leave those thumbnails alone. */
      if (thumb.closest('[data-product-root]')) { return; }
      var wanted = thumb.getAttribute('data-gallery-thumb');
      qsa('.product-gallery__item').forEach(function (item, i) { item.classList.toggle('is-active', String(i) === wanted); });
      qsa('[data-gallery-thumb]').forEach(function (other) { other.classList.toggle('is-active', other === thumb); });
      return;
    }
    var minus = event.target.closest('[data-qty-minus]');
    var plus = event.target.closest('[data-qty-plus]');
    if (minus || plus) {
      var wrap = (minus || plus).parentElement;
      var input = qs('input[type="number"]', wrap);
      if (!input) { return; }
      var step = minus ? -1 : 1;
      var next = Math.max(1, (parseInt(input.value, 10) || 1) + step);
      input.value = next;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  /* ---------- cart offer progress ----------
     Liquid renders the initial state and this painter updates both indicators
     from the same confirmed cart snapshot after each cart operation. */
  var money = function (cents) {
    var amount = Math.max(0, Number(cents) || 0) / 100;
    return '৳' + new Intl.NumberFormat('bn-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  var paintCartOffers = function (cart) {
    var root = qs('[data-cart-offers]');
    if (!root || !cart) { return; }
    var bundleTarget = parseInt(root.getAttribute('data-bundle-target'), 10);
    var shippingThreshold = parseInt(root.getAttribute('data-shipping-threshold'), 10);
    if (!bundleTarget || bundleTarget < 1 || isNaN(shippingThreshold) || shippingThreshold < 1) { return; }

    var count = Math.max(0, parseInt(cart.item_count, 10) || 0);
    var subtotal = Math.max(0, parseInt(cart.original_total_price, 10) || parseInt(cart.total_price, 10) || 0);
    var bundleOffer = qs('[data-bundle-offer]', root);
    var bundleFill = qs('[data-bundle-fill]', root);
    var bundleTrack = qs('[data-bundle-offer] [role="progressbar"]', root);
    var bundleStatus = qs('[data-bundle-status]', root);
    var bundleComplete = count >= bundleTarget;
    var bundleValue = Math.min(count, bundleTarget);
    if (bundleOffer) { bundleOffer.classList.toggle('is-complete', bundleComplete); }
    if (bundleFill) { bundleFill.style.width = Math.min(100, Math.round(bundleValue * 100 / bundleTarget)) + '%'; }
    if (bundleTrack) { bundleTrack.setAttribute('aria-valuenow', String(bundleValue)); }
    if (bundleStatus) {
      bundleStatus.textContent = bundleComplete
        ? 'অভিনন্দন! আপনি ২% ছাড়ের জন্য যোগ্য।'
        : 'আর ' + (bundleTarget - count) + 'টি পণ্য যোগ করুন';
    }
    if (bundleOffer) {
      if (bundleComplete) { bundleOffer.setAttribute('data-complete', 'true'); }
      else { bundleOffer.removeAttribute('data-complete'); }
    }

    var shippingOffer = qs('[data-shipping-offer]', root);
    var shippingFill = qs('[data-shipping-fill]', root);
    var shippingTrack = qs('[data-shipping-offer] [role="progressbar"]', root);
    var shippingStatus = qs('[data-shipping-status]', root);
    var shippingComplete = subtotal >= shippingThreshold;
    var shippingValue = Math.min(subtotal, shippingThreshold);
    if (shippingOffer) { shippingOffer.classList.toggle('is-complete', shippingComplete); }
    if (shippingFill) { shippingFill.style.width = Math.min(100, Math.round(shippingValue * 100 / shippingThreshold)) + '%'; }
    if (shippingTrack) { shippingTrack.setAttribute('aria-valuenow', String(shippingValue)); }
    if (shippingStatus) {
      shippingStatus.textContent = shippingComplete
        ? 'অভিনন্দন! আপনার অর্ডারে ফ্রি ডেলিভারি প্রযোজ্য।'
        : 'আর ' + money(shippingThreshold - subtotal) + ' খরচ করুন';
    }
    if (shippingOffer) {
      if (shippingComplete) { shippingOffer.setAttribute('data-complete', 'true'); }
      else { shippingOffer.removeAttribute('data-complete'); }
    }
  };

  /* ---------- discount code ----------
     The real handler lives in bindDrawerInternals() below, which applies the
     code with Shopify's supported { discount: code } payload and checks the
     response. An earlier delegated version of this handler only wrote the code
     to the cart as an "attribute" (which never applies a discount) and
     reported success without checking the response, so a rejected code was
     still announced as applied. It was removed to avoid two handlers racing
     to write the same message. */

  /* ---------- order tracking placeholder ---------- */
  document.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-track-form]');
    if (!form) { return; }
    event.preventDefault();
    var result = qs('[data-track-result]');
    var value = String(new FormData(form).get('tracking') || '').replace(/[&<>"']/g, '');
    if (result) {
      result.innerHTML = '<span>&#10003;</span><h2>ট্র্যাকিং অনুরোধটি পাওয়া গেছে।</h2><p><strong>' + value + '</strong> নম্বরটির সর্বশেষ তথ্য দেখানো হবে, কুরিয়ার-সংক্রান্ত তথ্য যুক্ত হলে।</p>';
    }
  });
  /* ---------- cart data helpers ---------- */
  var getCart = function () { return fetch('/cart.js').then(function (r) { return r.json(); }); };

  var paintCount = function (count) {
    qsa('[data-cart-count]').forEach(function (el) { el.textContent = count; });
  };

  var postCart = function (url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  /* Every cart write and the drawer re-render that follows it runs through
     this one queue, so a slow earlier response can never paint OLDER cart
     state over a newer one (the "1 items / qty 2 / subtotal ৳54.88" frame in
     the recording was an out-of-order response overwriting fresh UI). Each
     operation paints the header count and the cart offers from the SAME
     confirmed /cart.js snapshot, after the drawer HTML swap has landed. */
  var cartOpQueue = Promise.resolve();
  var enqueueCartOp = function (op) {
    var run = cartOpQueue.then(op, op);
    cartOpQueue = run.then(function () {}, function () {});
    return run;
  };
  var applyCartSnapshot = function (cart, anchorLine) {
    paintCount(cart.item_count);
    return refreshDrawer(anchorLine).then(function () {
      paintCartOffers(cart);
      document.dispatchEvent(new CustomEvent('haatrush:cart-updated', { detail: { cart: cart } }));
    });
  };

  var restoreButton = function (button, html) {
    if (!button) { return; }
    button.innerHTML = html;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  };

  var flashButton = function (button, message, html) {
    if (!button) { return; }
    button.textContent = message;
    window.setTimeout(function () { restoreButton(button, html); }, 1800);
  };

  /* the drawer markup is replaced after every cart update, so the listeners
     inside it are re-bound on the fresh nodes */
  var bindDrawerInternals = function () {
    /* every discount form is bound, not just the first one, so the cart page
       and the drawer each apply codes through the same supported flow */
    qsa('[data-discount-form]').forEach(function (form) {
      if (form.hasAttribute('data-bound')) { return; }
      form.setAttribute('data-bound', 'true');
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var scope = form.parentElement || document;
        var input = qs('input[name="discount"]', form);
        var note = qs('[data-discount-note]', scope) || qs('[data-discount-note]');
        var code = input ? input.value.trim() : '';
        if (!code) { if (note) { note.textContent = 'আগে একটি ডিসকাউন্ট কোড লিখুন।'; } return; }
        enqueueCartOp(function () {
          return postCart('/cart/update.js', { discount: code })
            .then(function (r) { if (!r.ok) { throw new Error('discount failed'); } return getCart(); })
            .then(function (cart) {
              if (note) { note.textContent = 'আপনার অর্ডারে ' + code + ' প্রয়োগ হয়েছে।'; }
              return applyCartSnapshot(cart);
            })
            .catch(function () { if (note) { note.textContent = 'কোডটি প্রয়োগ করা যায়নি। আবার চেষ্টা করুন।'; } });
        });
      });
    });
    /* The free-gift milestone is gone: the complimentary-gift claim was not
       backed by a configured offer, so the markup and this binding were both
       removed rather than replaced with an invented promise. */
  };

  var getScroller = function () {
    return cartDrawer ? cartDrawer.querySelector('[data-cart-body]') : null;
  };

  var rowForLine = function (root, line) {
    if (!root || !line) { return null; }
    var trigger = root.querySelector('[data-line="' + line + '"]');
    return trigger ? trigger.closest('.cart-item') : null;
  };

  /* loading feedback is applied to the single row the customer clicked */
  var setRowBusy = function (line, busy) {
    var row = rowForLine(cartDrawer, line);
    if (row) { row.classList.toggle('is-updating', !!busy); }
  };

  /* anchorLine keeps the clicked row in place across the markup swap.
     cache:'no-store' matters: a cached page can carry the PRE-update reward
     strip, which would also read as a backward jump after a quantity change. */
  var refreshDrawer = function (anchorLine) {
    if (!cartDrawer) { return Promise.resolve(); }
    var scroller = getScroller();
    var anchor = rowForLine(cartDrawer, anchorLine);
    var fallbackTop = scroller ? scroller.scrollTop : 0;
    var anchorDelta = null;
    if (anchor && scroller) {
      anchorDelta = anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    }
    return fetch(window.location.href, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var fresh = parsed.querySelector('[data-cart-drawer]');
        if (fresh) { cartDrawer.innerHTML = fresh.innerHTML; }
        /* innerHTML rebuilds [data-cart-body], so re-query the live scroller */
        var after = getScroller();
        if (after) {
          var next = rowForLine(cartDrawer, anchorLine);
          if (next && anchorDelta !== null) {
            var moved = next.getBoundingClientRect().top - after.getBoundingClientRect().top;
            after.scrollTop += (moved - anchorDelta);
          } else {
            after.scrollTop = fallbackTop;
          }
        }
        bindDrawerInternals();
      })
      .catch(function () { /* keep the current drawer markup when the request fails */ });
  };

  /* ---------- quick add / quantity / remove (delegated) ---------- */
  document.addEventListener('click', function (event) {
    var quickAdd = event.target.closest('[data-quick-add]');
    if (quickAdd) {
      event.preventDefault();
      var variantId = quickAdd.getAttribute('data-quick-add');
      if (!variantId || quickAdd.disabled) { return; }
      var originalHtml = quickAdd.innerHTML;
      quickAdd.setAttribute('aria-busy', 'true');
      quickAdd.disabled = true;
      quickAdd.textContent = 'যোগ হচ্ছে...';
      enqueueCartOp(function () {
        return postCart('/cart/add.js', { items: [{ id: variantId, quantity: 1 }] })
          .then(function (r) { if (!r.ok) { throw new Error('add failed'); } return getCart(); })
          .then(function (cart) {
            /* open the side cart straight away, then refresh its contents - no navigation */
            setDrawer(true);
            restoreButton(quickAdd, originalHtml);
            return applyCartSnapshot(cart);
          })
          .catch(function () { flashButton(quickAdd, 'পাওয়া যাচ্ছে না', originalHtml); });
      });
      return;
    }

    var change = event.target.closest('[data-cart-change]');
    if (change) {
      event.preventDefault();
      var line = change.getAttribute('data-line');
      var quantity = Math.max(0, parseInt(change.getAttribute('data-quantity'), 10) || 0);
      if (!line) { return; }
      change.disabled = true;
      setRowBusy(line, true);
      enqueueCartOp(function () {
        return postCart('/cart/change.js', { line: line, quantity: quantity })
          .then(function (r) { if (!r.ok) { throw new Error('change failed'); } return getCart(); })
          /* Paint AFTER the server re-render lands: painting first lets the
             DOM swap wipe the fresh width (the forward-then-backward jump). */
          .then(function (cart) { return applyCartSnapshot(cart, quantity > 0 ? line : null); })
          .catch(function () { change.disabled = false; setRowBusy(line, false); });
      });
      return;
    }

    var remove = event.target.closest('[data-remove-item]');
    if (remove) {
      event.preventDefault();
      var removeLine = remove.getAttribute('data-line');
      setRowBusy(removeLine, true);
      enqueueCartOp(function () {
        var removeRequest = removeLine
          ? postCart('/cart/change.js', { line: removeLine, quantity: 0 })
          : fetch(remove.getAttribute('href'), { headers: { Accept: 'application/json' } });
        return removeRequest
          .then(function (r) { if (r && r.ok === false) { throw new Error('remove failed'); } return getCart(); })
          .then(function (cart) { return applyCartSnapshot(cart); })
          .catch(function () { setRowBusy(removeLine, false); /* item stays in the drawer until the page reloads */ });
      });
    }
  });

  /* ---------- keep cart in sync across tabs ---------- */
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) { enqueueCartOp(function () { return refreshDrawer(); }); }
  });

  /* ---------- product page add to cart (uses the existing cart drawer) ---------- */
  var addToCart = function (items) {
    return enqueueCartOp(function () {
      return postCart('/cart/add.js', { items: items })
        .then(function (r) {
          if (!r.ok) { throw new Error('add failed'); }
          return getCart();
        })
        .then(function (cart) {
          setDrawer(true);
          return applyCartSnapshot(cart).then(function () { return cart; });
        });
    });
  };
  window.LumaCart = { add: addToCart, open: setDrawer, refresh: refreshDrawer, setCount: paintCount };

  bindDrawerInternals();
}());

/* ---------- HaatRush Shopify Admin API COD checkout ---------- */
(function () {
  var root = document.querySelector('[data-checkout-app]');
  if (!root) { return; }

  var form = root.querySelector('[data-checkout-form]');
  var division = form && form.querySelector('[name="division"]');
  var district = form && form.querySelector('[name="district"]');
  var upazila = form && form.querySelector('[name="upazila"]');
  var submit = root.querySelector('[data-checkout-submit]');
  var submitLabel = root.querySelector('[data-checkout-submit-label]');
  var error = root.querySelector('[data-checkout-error]');
  var serviceNotice = root.querySelector('[data-checkout-service-notice]');
  var itemsNode = root.querySelector('[data-checkout-items]');
  var content = root.querySelector('[data-checkout-content]');
  var emptyCart = root.querySelector('[data-checkout-empty]');
  var confirmation = root.querySelector('[data-checkout-confirmation]');
  var confirmationMessage = root.querySelector('[data-confirmation-message]');
  var state = { quote: null, lines: [], sequence: 0, busy: false, confirmed: false, proxyReady: false, locations: null };
  var submissionStorageKey = 'haatrush-cod-submission';
  var base = root.getAttribute('data-proxy-root');
  var locationsUrl = root.getAttribute('data-locations-url');

  if (!form || !division || !district || !upazila || !submit || !itemsNode || !base) { return; }

  var endpoint = function (path) { return base.replace(/\/$/, '') + '/' + path; };
  var showError = function (message) {
    if (!error) { return; }
    error.textContent = message;
    error.hidden = false;
  };
  var clearError = function () {
    if (!error) { return; }
    error.textContent = '';
    error.hidden = true;
  };
  var setServiceNotice = function (visible, message) {
    if (!serviceNotice) { return; }
    if (message) { serviceNotice.textContent = message; }
    serviceNotice.hidden = !visible;
  };
  var money = function (amount) {
    var number = Number(amount);
    if (!Number.isFinite(number)) { return '—'; }
    return '৳' + new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
  };
  var requestJson = function (url, options) {
    return fetch(url, Object.assign({
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    }, options || {})).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        return { response: response, body: body };
      });
    });
  };
  var getCart = function () {
    return fetch('/cart.js', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) { throw new Error('কার্ট যাচাই করা যায়নি।'); }
        return response.json();
      });
  };
  var cartLines = function (cart) {
    return (cart.items || []).map(function (item) {
      return {
        variantId: String(item.variant_id),
        quantity: Number(item.quantity),
        properties: item.properties || {}
      };
    });
  };
  var bengaliCount = function (value) { return Number(value || 0).toLocaleString('bn-BD'); };
  var setText = function (selector, value) {
    var node = root.querySelector(selector);
    if (node) { node.textContent = value; }
  };
  var create = function (tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text != null) { node.textContent = text; }
    return node;
  };
  var replaceOptions = function (select, entries, placeholder) {
    var placeholderOption = create('option', '', placeholder);
    placeholderOption.value = '';
    select.replaceChildren(placeholderOption);
    entries.forEach(function (entry) {
      var option = create('option', '', entry.label);
      option.value = entry.value;
      select.appendChild(option);
    });
  };
  var updateDistrictOptions = function () {
    var districts = state.locations ? state.locations.districts.filter(function (entry) {
      return entry.division === division.value;
    }) : [];
    replaceOptions(district, districts, 'জেলা নির্বাচন করুন');
    district.disabled = !division.value || !districts.length;
    replaceOptions(upazila, [], 'উপজেলা/থানা নির্বাচন করুন');
    upazila.disabled = true;
  };
  var updateUpazilaOptions = function () {
    var upazilas = state.locations ? state.locations.upazilas.filter(function (entry) {
      return entry.district === district.value;
    }) : [];
    replaceOptions(upazila, upazilas, 'উপজেলা/থানা নির্বাচন করুন');
    upazila.disabled = !district.value || !upazilas.length;
  };
  var renderLines = function (lines) {
    itemsNode.replaceChildren();
    lines.forEach(function (line, index) {
      var row = create('article', 'hr-checkout__item');
      if (line.imageUrl) {
        var image = document.createElement('img');
        image.src = line.imageUrl;
        image.alt = '';
        image.loading = 'lazy';
        image.width = 68;
        image.height = 68;
        image.className = 'hr-checkout__item-image';
        row.appendChild(image);
      } else {
        row.appendChild(create('span', 'hr-checkout__item-image hr-checkout__item-placeholder', '◇'));
      }
      var info = create('div', 'hr-checkout__item-info');
      info.appendChild(create('strong', 'hr-checkout__item-title', line.title));
      if (line.variantTitle) { info.appendChild(create('small', 'hr-checkout__item-variant', line.variantTitle)); }
      var controls = create('div', 'hr-checkout__item-controls');
      var minus = create('button', 'checkout-qty-btn', '−');
      minus.type = 'button';
      minus.setAttribute('data-cart-change', '');
      minus.setAttribute('data-line', String(index + 1));
      minus.setAttribute('data-quantity', String(Math.max(0, line.quantity - 1)));
      minus.setAttribute('aria-label', 'পরিমাণ কমান');
      controls.appendChild(minus);
      controls.appendChild(create('span', 'checkout-qty-val', bengaliCount(line.quantity)));
      var plus = create('button', 'checkout-qty-btn', '+');
      plus.type = 'button';
      plus.setAttribute('data-cart-change', '');
      plus.setAttribute('data-line', String(index + 1));
      plus.setAttribute('data-quantity', String(line.quantity + 1));
      plus.setAttribute('aria-label', 'পরিমাণ বাড়ান');
      controls.appendChild(plus);
      info.appendChild(controls);
      row.appendChild(info);
      row.appendChild(create('strong', 'hr-checkout__item-price', money(line.lineTotal)));
      var remove = create('button', 'checkout-item__remove-btn', '×');
      remove.type = 'button';
      remove.setAttribute('data-remove-item', '');
      remove.setAttribute('data-line', String(index + 1));
      remove.setAttribute('aria-label', line.title + ' কার্ট থেকে সরান');
      row.appendChild(remove);
      itemsNode.appendChild(row);
    });
  };
  var paintQuote = function (quote) {
    state.quote = quote;
    state.lines = quote.lines || [];
    renderLines(state.lines);
    setText('[data-checkout-count]', bengaliCount(quote.itemCount));
    setText('[data-checkout-subtotal]', money(quote.subtotal));
    setText('[data-checkout-discount]', quote.bundleEligible ? '− ' + money(quote.bundleDiscount) : money(0));
    setText('[data-checkout-shipping-total]', quote.shipping == null
      ? 'জেলা নির্বাচন করুন'
      : Number(quote.shipping) === 0 ? 'ফ্রি' : money(quote.shipping));
    setText('[data-checkout-total]', quote.total == null ? 'এলাকা নির্বাচন করুন' : money(quote.total));

    var bundleDone = quote.bundleEligible;
    var bundle = root.querySelector('[data-checkout-bundle]');
    var bundleFill = root.querySelector('[data-bundle-fill]');
    var bundleTrack = bundle && bundle.querySelector('[role="progressbar"]');
    var bundleStatus = root.querySelector('[data-bundle-status]');
    if (bundle) { bundle.classList.toggle('is-complete', bundleDone); }
    if (bundleFill) { bundleFill.style.width = Math.min(100, Math.round(quote.itemCount * 50)) + '%'; }
    if (bundleTrack) { bundleTrack.setAttribute('aria-valuenow', String(Math.min(2, quote.itemCount))); }
    if (bundleStatus) { bundleStatus.textContent = bundleDone ? 'যোগ্যতা পূরণ' : bengaliCount(quote.itemCount) + ' / ২'; }
    setText('[data-bundle-message]', bundleDone
      ? '২% বান্ডেল ছাড় অর্ডারে প্রয়োগ করা হবে।'
      : 'আর ' + bengaliCount(2 - quote.itemCount) + 'টি পণ্য যোগ করলে ২% ছাড় পাবেন।');

    var shippingDone = quote.shippingFree;
    var shipping = root.querySelector('[data-checkout-shipping]');
    var shippingFill = root.querySelector('[data-shipping-fill]');
    var shippingTrack = shipping && shipping.querySelector('[role="progressbar"]');
    var shippingStatus = root.querySelector('[data-shipping-status]');
    var subtotalMinor = Math.round(Number(quote.subtotal) * 100);
    var progress = Math.min(100, Math.round(subtotalMinor / 100001 * 100));
    if (!shippingDone) { progress = Math.min(99, progress); }
    if (shipping) { shipping.classList.toggle('is-complete', shippingDone); }
    if (shippingFill) { shippingFill.style.width = progress + '%'; }
    if (shippingTrack) { shippingTrack.setAttribute('aria-valuenow', String(Math.min(100001, subtotalMinor))); }
    if (shippingStatus) {
      shippingStatus.textContent = shippingDone
        ? 'যোগ্যতা পূরণ'
        : money(quote.shippingRemaining) + ' বাকি';
    }
    setText('[data-shipping-message]', shippingDone
      ? '৳১,০০০-এর বেশি পণ্যের মোটে ফ্রি ডেলিভারি প্রযোজ্য।'
      : 'পণ্যের মোট ৳১,০০০ অতিক্রম করলে ফ্রি ডেলিভারি পাবেন।');
    submit.disabled = state.busy || !state.proxyReady || !quote.quoteToken
      || !division.value || !district.value || !upazila.value || quote.total == null || state.confirmed;
  };
  var paintCartPreview = function (cart) {
    var items = cart.items || [];
    state.lines = items;
    itemsNode.replaceChildren();
    items.forEach(function (item, index) {
      var line = {
        title: item.product_title || item.title || '',
        variantTitle: item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '',
        imageUrl: item.image || '',
        quantity: Number(item.quantity) || 0,
        lineTotal: ((Number(item.final_line_price != null ? item.final_line_price : item.line_price) || 0) / 100).toFixed(2)
      };
      var row = create('article', 'hr-checkout__item');
      if (line.imageUrl) {
        var image = document.createElement('img');
        image.src = line.imageUrl;
        image.alt = '';
        image.width = 68;
        image.height = 68;
        image.loading = 'lazy';
        image.className = 'hr-checkout__item-image';
        row.appendChild(image);
      } else {
        row.appendChild(create('span', 'hr-checkout__item-image hr-checkout__item-placeholder', '◇'));
      }
      var info = create('div', 'hr-checkout__item-info');
      info.appendChild(create('strong', 'hr-checkout__item-title', line.title));
      if (line.variantTitle) { info.appendChild(create('small', 'hr-checkout__item-variant', line.variantTitle)); }
      var controls = create('div', 'hr-checkout__item-controls');
      var minus = create('button', 'checkout-qty-btn', '−');
      minus.type = 'button';
      minus.setAttribute('data-cart-change', '');
      minus.setAttribute('data-line', String(index + 1));
      minus.setAttribute('data-quantity', String(Math.max(0, line.quantity - 1)));
      minus.setAttribute('aria-label', 'পরিমাণ কমান');
      controls.appendChild(minus);
      controls.appendChild(create('span', 'checkout-qty-val', bengaliCount(line.quantity)));
      var plus = create('button', 'checkout-qty-btn', '+');
      plus.type = 'button';
      plus.setAttribute('data-cart-change', '');
      plus.setAttribute('data-line', String(index + 1));
      plus.setAttribute('data-quantity', String(line.quantity + 1));
      plus.setAttribute('aria-label', 'পরিমাণ বাড়ান');
      controls.appendChild(plus);
      info.appendChild(controls);
      row.appendChild(info);
      row.appendChild(create('strong', 'hr-checkout__item-price', money(line.lineTotal)));
      var remove = create('button', 'checkout-item__remove-btn', '×');
      remove.type = 'button';
      remove.setAttribute('data-remove-item', '');
      remove.setAttribute('data-line', String(index + 1));
      remove.setAttribute('aria-label', line.title + ' কার্ট থেকে সরান');
      row.appendChild(remove);
      itemsNode.appendChild(row);
    });
    var subtotal = Number(cart.original_total_price || 0);
    var discount = Number(cart.total_discount || 0);
    setText('[data-checkout-count]', bengaliCount(cart.item_count));
    setText('[data-checkout-subtotal]', money(subtotal / 100));
    setText('[data-checkout-discount]', money(discount / 100));
    setText('[data-checkout-shipping-total]', 'যাচাই করা যাচ্ছে না');
    setText('[data-checkout-total]', 'যাচাই করা যাচ্ছে না');
    submit.disabled = true;
  };
  var showEmptyCart = function () {
    if (content) { content.hidden = true; }
    if (emptyCart) { emptyCart.hidden = false; }
    itemsNode.replaceChildren();
    state.quote = null;
    state.lines = [];
    submit.disabled = true;
  };
  var refreshQuote = function () {
    var sequence = ++state.sequence;
    clearError();
    return getCart().then(function (cart) {
      if (!cart.items || !cart.items.length) {
        showEmptyCart();
        return null;
      }
      if (emptyCart) { emptyCart.hidden = true; }
      if (content) { content.hidden = false; }
      if (!state.proxyReady) {
        paintCartPreview(cart);
        return null;
      }
      return requestJson(endpoint('quote'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          lines: cartLines(cart),
          division: division.value,
          district: district.value,
          upazila: upazila.value
        })
      }).then(function (result) {
        if (sequence !== state.sequence) { return null; }
        if (!result.response.ok) {
          state.quote = null;
          paintCartPreview(cart);
          showError(result.body.error || 'দাম ও স্টক যাচাই করা যাচ্ছে না।');
          return null;
        }
        paintQuote(result.body);
        setServiceNotice(false);
        return result.body;
      });
    }).catch(function () {
      state.quote = null;
      submit.disabled = true;
      setServiceNotice(true, 'কার্ট বা অর্ডার সেবা সাময়িকভাবে অনুপলভ্য।');
      return null;
    });
  };
  var loadLocations = function () {
    return requestJson(endpoint('config')).then(function (result) {
      if (!result.response.ok || !result.body.divisions || !result.body.districts || !result.body.upazilas) {
        throw new Error('checkout configuration unavailable');
      }
      state.locations = result.body;
      var bkashLabel = root.querySelector('.hr-checkout__bkash');
      if (bkashLabel) {
        bkashLabel.hidden = !result.body.bkashEnabled || root.getAttribute('data-bkash-enabled') !== 'true';
      }
      replaceOptions(division, state.locations.divisions, 'বিভাগ নির্বাচন করুন');
      updateDistrictOptions();
      return requestJson(endpoint('health')).then(function (health) {
        if (!health.response.ok || health.body.status !== 'ok'
          || !health.body.integrations || health.body.integrations.database !== 'ok'
          || health.body.integrations.shopify !== 'ok' || health.body.currency !== 'BDT') {
          throw new Error('checkout integrations unavailable');
        }
        state.proxyReady = true;
        return true;
      });
    }).catch(function () {
      state.proxyReady = false;
      setServiceNotice(true, 'অর্ডার সেবা সাময়িকভাবে অনুপলভ্য।');
      return fetch(locationsUrl, { cache: 'force-cache' }).then(function (response) {
        if (!response.ok) { throw new Error('locations unavailable'); }
        return response.json();
      }).then(function (locations) {
        state.locations = locations;
        replaceOptions(division, locations.divisions, 'বিভাগ নির্বাচন করুন');
        updateDistrictOptions();
      }).catch(function () {
        state.locations = null;
        division.disabled = true;
        district.disabled = true;
        upazila.disabled = true;
      });
    });
  };
  var createSubmissionId = function () {
    if (window.crypto && window.crypto.randomUUID) { return window.crypto.randomUUID(); }
    if (!window.crypto || !window.crypto.getRandomValues) { throw new Error('Secure order submission is unavailable.'); }
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = Array.prototype.map.call(bytes, function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16)
      + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  };
  var getStoredSubmission = function () {
    try { return window.sessionStorage.getItem(submissionStorageKey); } catch (storageError) { return null; }
  };
  var saveSubmission = function (submissionId) {
    try {
      window.sessionStorage.setItem(submissionStorageKey, submissionId);
      return true;
    } catch (storageError) {
      return false;
    }
  };
  var clearStoredSubmission = function () {
    try { window.sessionStorage.removeItem(submissionStorageKey); } catch (storageError) { /* storage may be unavailable */ }
  };
  var finishOrder = function (result) {
    state.busy = false;
    state.confirmed = true;
    submit.disabled = true;
    form.hidden = true;
    if (confirmation) { confirmation.hidden = false; }
    if (result.subtotal != null) { setText('[data-checkout-subtotal]', money(result.subtotal)); }
    if (result.discount != null) {
      setText('[data-checkout-discount]', Number(result.discount) > 0 ? '− ' + money(result.discount) : money(0));
    }
    if (result.shipping != null) {
      setText('[data-checkout-shipping-total]', Number(result.shipping) === 0 ? 'ফ্রি' : money(result.shipping));
    }
    if (result.total != null) { setText('[data-checkout-total]', money(result.total)); }
    var orderName = result.orderName || 'অর্ডার';
    var total = result.total ? money(result.total) : '';
    if (confirmationMessage) {
      confirmationMessage.textContent = orderName + ' তৈরি হয়েছে।' + (total ? ' সর্বমোট ' + total + '।' : '');
    }
    var paymentMethod = result.paymentMethod || 'cod';
    var confirmationPayment = root.querySelector('[data-confirmation-payment]');
    var confirmationBkash = root.querySelector('[data-confirmation-bkash]');
    if (paymentMethod === 'bkash') {
      if (confirmationPayment) {
        confirmationPayment.textContent = 'ম্যানুয়াল বিকাশ পেমেন্ট: ' + root.getAttribute('data-bkash-number');
      }
      if (confirmationBkash) {
        confirmationBkash.textContent = root.getAttribute('data-bkash-instructions') || '';
        confirmationBkash.hidden = false;
      }
    }
    clearStoredSubmission();
  };
  var pollSubmission = function (submissionId, attempts) {
    if (confirmation) { confirmation.hidden = true; }
    state.busy = true;
    submit.disabled = true;
    setServiceNotice(true, 'অর্ডারটি Shopify-তে যাচাই হচ্ছে। পুনরায় জমা দেবেন না।');
    return requestJson(endpoint('orders/' + encodeURIComponent(submissionId))).then(function (result) {
      if (result.response.status === 404) {
        clearStoredSubmission();
        state.busy = false;
        setServiceNotice(false);
        submitLabel.textContent = 'অর্ডার কনফার্ম করুন';
        submit.disabled = !state.proxyReady || !state.quote || !state.quote.quoteToken || !state.quote.total;
        return;
      }
      if (!result.response.ok) { throw new Error('submission status unavailable'); }
      if (result.body.status === 'created' && result.body.response) {
        setServiceNotice(false);
        finishOrder(result.body.response);
        return;
      }
      if (result.body.status === 'failed') {
        clearStoredSubmission();
        state.busy = false;
        setServiceNotice(false);
        submitLabel.textContent = 'অর্ডার কনফার্ম করুন';
        showError(result.body.response && result.body.response.error || 'অর্ডারটি তৈরি হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।');
        refreshQuote();
        return;
      }
      if (attempts <= 0) {
        setServiceNotice(true, 'অর্ডারটি যাচাই হচ্ছে। নিশ্চিত না হওয়া পর্যন্ত আবার জমা দেবেন না।');
        return;
      }
      window.setTimeout(function () { pollSubmission(submissionId, attempts - 1); }, 2000);
    }).catch(function () {
      if (attempts > 0) {
        window.setTimeout(function () { pollSubmission(submissionId, attempts - 1); }, 2000);
      } else {
        setServiceNotice(true, 'অর্ডারটি যাচাই হচ্ছে। নিশ্চিত না হওয়া পর্যন্ত আবার জমা দেবেন না।');
      }
    });
  };

  var quoteTimer;
  [division, district, upazila].forEach(function (select) {
    select.addEventListener('change', function () {
      if (select === division) { updateDistrictOptions(); }
      if (select === district) { updateUpazilaOptions(); }
      window.clearTimeout(quoteTimer);
      quoteTimer = window.setTimeout(refreshQuote, 150);
    });
  });
  document.addEventListener('haatrush:cart-updated', function () { refreshQuote(); });
  window.addEventListener('pageshow', function (event) { if (event.persisted) { refreshQuote(); } });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (state.busy || state.confirmed) { return; }
    clearError();
    if (!form.reportValidity()) { return; }
    if (!state.proxyReady) {
      setServiceNotice(true, 'অর্ডার সেবা সাময়িকভাবে অনুপলভ্য।');
      return;
    }
    state.busy = true;
    submit.disabled = true;
    submitLabel.textContent = 'অর্ডার যাচাই হচ্ছে…';
    getCart().then(function (cart) {
      if (!cart.items || !cart.items.length) { throw new Error('আপনার কার্ট খালি।'); }
      return requestJson(endpoint('quote'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          lines: cartLines(cart),
          division: division.value,
          district: district.value,
          upazila: upazila.value
        })
      });
    }).then(function (result) {
      if (!result.response.ok || !result.body.quoteToken || result.body.total == null) {
        throw new Error(result.body.error || 'দাম বা ডেলিভারির তথ্য যাচাই করুন।');
      }
      paintQuote(result.body);
      var submissionId = createSubmissionId();
      if (!saveSubmission(submissionId)) {
        throw new Error('নিরাপদে অর্ডার জমা দেওয়া যাচ্ছে না। ব্রাউজারের সেশন স্টোরেজ চালু করে আবার চেষ্টা করুন।');
      }
      var formData = new FormData(form);
      var payload = {
        submissionId: submissionId,
        quoteToken: result.body.quoteToken,
        lines: cartLinesFromQuote(result.body),
        customer: {
          name: String(formData.get('name') || ''),
          phone: String(formData.get('phone') || ''),
          address: String(formData.get('address') || ''),
          division: division.value,
          district: district.value,
          upazila: upazila.value,
          paymentMethod: String(formData.get('paymentMethod') || 'cod')
        }
      };
      return requestJson(endpoint('orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (orderResult) {
        if (orderResult.response.status === 202 || orderResult.body.status === 'processing') {
          return pollSubmission(submissionId, 15);
        }
        if (!orderResult.response.ok || orderResult.body.status !== 'created') {
          clearStoredSubmission();
          throw new Error(orderResult.body.error || 'অর্ডারটি তৈরি করা যায়নি। আবার চেষ্টা করুন।');
        }
        setServiceNotice(false);
        finishOrder(orderResult.body);
      });
    }).catch(function (submitError) {
      var pending = getStoredSubmission();
      if (pending) {
        pollSubmission(pending, 15);
      } else {
        state.busy = false;
        setServiceNotice(false);
        showError(submitError.message || 'অর্ডারটি তৈরি করা যায়নি। আবার চেষ্টা করুন।');
        refreshQuote();
      }
    }).finally(function () {
      if (!state.confirmed && !getStoredSubmission()) {
        submit.disabled = !state.proxyReady || !state.quote || !state.quote.quoteToken || !state.quote.total;
        submitLabel.textContent = 'অর্ডার কনফার্ম করুন';
      }
    });
  });

  function cartLinesFromQuote(quote) {
    return quote.lines.map(function (line) {
      return { variantId: line.variantId, quantity: line.quantity, properties: line.properties || [] };
    });
  }

  loadLocations().then(refreshQuote).then(function () {
    var pendingSubmission = getStoredSubmission();
    if (pendingSubmission) { pollSubmission(pendingSubmission, 15); }
  });
}());

/* ============================================================
   HaatRush — Predictive product search suggestions
   Uses Shopify's real Predictive Search API (suggest.json) to
   power the dropdown under the desktop header search field.
   Scoped to [data-search-suggest-form]; the desktop field is
   display:none below 990px, so mobile is completely untouched.
   ============================================================ */
(function () {
  var form = document.querySelector('[data-search-suggest-form]');
  if (!form) { return; }
  var input = form.querySelector('[data-search-suggest-input]');
  var panel = form.querySelector('[data-search-suggest-panel]');
  if (!input || !panel) { return; }

  var LIMIT = 6;
  var DEBOUNCE_MS = 220;
  var routes = (typeof Shopify !== 'undefined' && Shopify.routes) ? Shopify.routes : { root: '/' };

  var formatMoney = function (cents) {
    if (typeof cents !== 'number') { cents = parseInt(cents, 10) || 0; }
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) { return Shopify.formatMoney(cents); }
    return '৳' + (cents / 100).toFixed(2);
  };

  var popular = [];
  /* locale island: strings the suggestion panel needs, rendered server-side */
  var localeStrings = {};
  var localeIsland = document.querySelector('[data-haatrush-locale]');
  if (localeIsland) {
    try { localeStrings = JSON.parse(localeIsland.textContent) || {}; } catch (e) { localeStrings = {}; }
  }
  var island = document.querySelector('[data-haatrush-popular]');
  if (island) {
    try { popular = JSON.parse(island.textContent) || []; } catch (e) { popular = []; }
  }

  var ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>';

  var state = { open: false, loading: false, query: '', items: [], activeIndex: -1, timer: null, seq: 0 };

  var searchUrl = routes.root + 'search/suggest.json';

  var escapeHtml = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  var imgSrc = function (img) {
    if (!img) { return ''; }
    if (img.indexOf('//') === 0) { return 'https:' + img; }
    return img;
  };

  var thumbHtml = function (p) {
    var src = imgSrc(p.image);
    if (src) {
      return '<span class="lf-suggest__thumb"><img src="' + escapeHtml(src) + '" alt="" loading="lazy" width="52" height="52"></span>';
    }
    return '<span class="lf-suggest__thumb" aria-hidden="true"></span>';
  };

  var priceHtml = function (p) {
    var price = (typeof p.price === 'number') ? p.price : (parseInt(p.price, 10) || 0);
    var compare = p.compare_at_price ? parseInt(p.compare_at_price, 10) : 0;
    var html = '<span class="lf-suggest__price">' + escapeHtml(formatMoney(price));
    if (compare > price) {
      html += '<span class="lf-suggest__compare">' + escapeHtml(formatMoney(compare)) + '</span>';
    }
    return html + '</span>';
  };

  var rowHtml = function (p, i) {
    return '<li role="none">' +
      '<a class="lf-suggest__row" role="option" id="lf-suggest-opt-' + i + '" href="' + escapeHtml(p.url) + '" data-suggest-item>' +
        thumbHtml(p) +
        '<span class="lf-suggest__meta">' +
          '<span class="lf-suggest__title">' + escapeHtml(p.title) + '</span>' +
          priceHtml(p) +
        '</span>' +
        '<span class="lf-suggest__arrow">' + ARROW_SVG + '</span>' +
      '</a>' +
    '</li>';
  };

  var footerHtml = function (q) {
    var label = q
      ? (escapeHtml(q) + ' ' + escapeHtml(localeStrings.view_all_results_for || 'এর সব ফলাফল দেখুন'))
      : escapeHtml(localeStrings.view_all_products || 'সব পণ্য দেখুন');
    var href = routes.root + 'search?q=' + encodeURIComponent(q || '');
    return '<div class="lf-suggest__footer">' +
      '<a class="lf-suggest__viewall" href="' + href + '" data-suggest-viewall>' +
        '<span>' + label + '</span>' + ARROW_SVG +
      '</a>' +
    '</div>';
  };

  var statusHtml = function (q) {
    if (q) {
      return '<div class="lf-suggest__status"><strong>' + escapeHtml(q) + '</strong>-এর ফলাফল</div>';
    }
    return '<div class="lf-suggest__status">জনপ্রিয় পণ্য</div>';
  };

  var renderProducts = function (items, q) {
    state.items = items || [];
    state.activeIndex = -1;
    if (!state.items.length) {
      panel.innerHTML = statusHtml(q) +
        '<div class="lf-suggest__empty" role="status">' +
          '<strong>' + escapeHtml(localeStrings.no_matching_products || 'মিলছে এমন কোনো পণ্য পাওয়া যায়নি') + '</strong>' +
          '<span>অন্য শব্দ দিয়ে খুঁজে দেখুন।</span>' +
        '</div>' +
        (q ? footerHtml(q) : '');
      input.removeAttribute('aria-activedescendant');
      return;
    }
    var html = statusHtml(q) + '<div class="lf-suggest__heading">পণ্য</div><ul class="lf-suggest__list" role="listbox" aria-label="পণ্যের পরামর্শ">';
    for (var i = 0; i < state.items.length; i++) {
      html += rowHtml(state.items[i], i);
    }
    html += '</ul>' + footerHtml(q);
    panel.innerHTML = html;
    input.removeAttribute('aria-activedescendant');
  };

  var renderLoading = function () {
    panel.innerHTML = '<div class="lf-suggest__loading" role="status" aria-live="polite">' +
      '<span class="lf-suggest__spinner" aria-hidden="true"></span>খোঁজা হচ্ছে&hellip;</div>';
  };

  var open = function () {
    if (state.open) { return; }
    state.open = true;
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  var close = function () {
    if (!state.open) { return; }
    state.open = false;
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    state.activeIndex = -1;
    state.items = [];
    state.seq++;
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
  };

  var setActive = function (index) {
    var rows = panel.querySelectorAll('[data-suggest-item]');
    if (!rows.length) { return; }
    if (index < 0) { index = rows.length - 1; }
    if (index >= rows.length) { index = 0; }
    state.activeIndex = index;
    for (var i = 0; i < rows.length; i++) {
      var on = i === index;
      rows[i].classList.toggle('is-active', on);
      rows[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    var active = rows[index];
    input.setAttribute('aria-activedescendant', active.getAttribute('id'));
    if (active.scrollIntoView) { active.scrollIntoView({ block: 'nearest' }); }
  };

  var showPopular = function () {
    if (popular && popular.length) {
      renderProducts(popular.slice(0, LIMIT), '');
    } else {
      panel.innerHTML = '<div class="lf-suggest__status">স্টোরে খুঁজুন</div>';
    }
    open();
  };

  var fetchSuggestions = function (q) {
    var mySeq = ++state.seq;
    state.loading = true;
    renderLoading();

    var url = searchUrl + '?q=' + encodeURIComponent(q) +
      '&resources[type]=product' +
      '&resources[limit]=' + LIMIT +
      '&resources[options][unavailable_products]=last';

    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        if (mySeq !== state.seq) { return; }
        var products = (data && data.resources && data.resources.results && data.resources.results.products) || [];
        renderProducts(products.slice(0, LIMIT), q);
        state.loading = false;
      })
      .catch(function () {
        if (mySeq !== state.seq) { return; }
        state.loading = false;
        renderProducts([], q);
      });
  };

  var onInput = function () {
    var q = input.value.trim();
    state.query = q;
    open();

    if (state.timer) { clearTimeout(state.timer); }
    if (!q) {
      state.seq++;
      state.loading = false;
      showPopular();
      return;
    }
    state.timer = setTimeout(function () { fetchSuggestions(q); }, DEBOUNCE_MS);
  };

  input.addEventListener('focus', function () {
    var q = input.value.trim();
    if (q) { onInput(); } else { showPopular(); }
  });

  input.addEventListener('input', onInput);

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (state.open) { event.preventDefault(); close(); input.blur(); }
      return;
    }
    if (event.key === 'ArrowDown') {
      if (!state.open) { open(); }
      event.preventDefault();
      setActive(state.activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      if (!state.open) { return; }
      event.preventDefault();
      setActive(state.activeIndex - 1);
      return;
    }
    if (event.key === 'Enter') {
      if (state.open && state.activeIndex >= 0 && panel.querySelector('[data-suggest-item].is-active')) {
        return; // let the highlighted anchor navigate
      }
      return; // otherwise let the form submit normally
    }
  });

  panel.addEventListener('click', function (event) {
    if (event.target.closest('[data-suggest-item]') || event.target.closest('[data-suggest-viewall]')) {
      close();
    }
  });

  document.addEventListener('click', function (event) {
    if (!state.open) { return; }
    if (!form.contains(event.target)) { close(); }
  });

  form.addEventListener('focusout', function () {
    setTimeout(function () {
      if (state.open && !form.contains(document.activeElement)) { close(); }
    }, 120);
  });
})();