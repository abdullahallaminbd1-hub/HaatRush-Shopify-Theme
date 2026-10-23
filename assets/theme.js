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

  /* ---------- cart milestone updater ----------
     Single source of truth for the reward strip: the Liquid in
     cart-drawer.liquid computes the SAME percentage, so the server re-render
     and this live painter never disagree (a mismatch here used to paint the
     fill forward, then jump it backward when refreshDrawer swapped the DOM).
     Free gift stays removed: only Bundle (2 items) and Free shipping (৳৯৯৯). */
  var money = function (cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) { return Shopify.formatMoney(cents); }
    return '$' + (cents / 100).toFixed(2);
  };
  var milestoneState = function (cart, threshold) {
    var need = 2;
    var count = (cart && cart.item_count) || 0;
    var subtotal = (cart && cart.total_price) || 0;
    var bundleDone = count >= need;
    var shipDone = subtotal >= threshold;
    var pct = 0;
    if (shipDone) { pct = 100; }
    else if (bundleDone) { pct = Math.min(99, Math.round(50 + (subtotal * 50 / threshold))); }
    else if (count > 0) { pct = Math.round(count * 50 / need); }
    return { need: need, count: count, subtotal: subtotal, bundleDone: bundleDone, shipDone: shipDone, pct: pct };
  };
  var paintMilestones = function (cart) {
    var root = qs('[data-cart-milestones]');
    if (!root || !cart) { return; }
    var threshold = parseInt(root.getAttribute('data-threshold'), 10) || 7500;
    var st = milestoneState(cart, threshold);
    var fill = qs('[data-milestone-fill]', root);
    if (fill) { fill.style.width = st.pct + '%'; }
    var track = qs('.reward-strip__track', root);
    if (track) { track.setAttribute('aria-valuenow', String(st.pct)); }
    if (st.shipDone) { root.setAttribute('data-complete', 'true'); }
    else { root.removeAttribute('data-complete'); }
    var steps = qsa('.reward-step', root);
    steps.forEach(function (step) {
      var kind = step.getAttribute('data-step');
      step.classList.toggle('is-done', kind === 'bundle' ? st.bundleDone : st.shipDone);
    });
    var markers = qsa('.reward-strip__marker', root);
    markers.forEach(function (marker) {
      var isBundle = marker.classList.contains('reward-strip__marker--bundle');
      marker.classList.toggle('is-done', isBundle ? st.bundleDone : st.shipDone);
    });
    var lead = qs('[data-milestone-lead]', root);
    if (lead) {
      var left = st.need - st.count;
      if (st.count <= 0) { lead.textContent = 'Add 2 more items to unlock 2% off'; }
      else if (!st.bundleDone) { lead.textContent = 'Add ' + left + ' more item' + (left === 1 ? '' : 's') + ' to unlock 2% off'; }
      else if (!st.shipDone) { lead.textContent = 'Spend ' + money(threshold - st.subtotal) + ' more to unlock free shipping'; }
      else { lead.textContent = "You've unlocked free shipping! Enjoy your savings."; }
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
      result.innerHTML = '<span>&#10003;</span><h2>Tracking request received.</h2><p>We will look up <strong>' + value + '</strong> and display the latest update once carrier data is connected.</p>';
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
     state over a newer one (the "1 items / qty 2 / subtotal $54.88" frame in
     the recording was an out-of-order response overwriting fresh UI). Each
     operation paints the header count and the reward strip from the SAME
     confirmed /cart.js snapshot, after the drawer HTML swap has landed. */
  var cartOpQueue = Promise.resolve();
  var enqueueCartOp = function (op) {
    var run = cartOpQueue.then(op, op);
    cartOpQueue = run.then(function () {}, function () {});
    return run;
  };
  var applyCartSnapshot = function (cart, anchorLine) {
    paintCount(cart.item_count);
    return refreshDrawer(anchorLine).then(function () { paintMilestones(cart); });
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
        if (!code) { if (note) { note.textContent = 'Enter a discount code first.'; } return; }
        enqueueCartOp(function () {
          return postCart('/cart/update.js', { discount: code })
            .then(function (r) { if (!r.ok) { throw new Error('discount failed'); } return getCart(); })
            .then(function (cart) {
              if (note) { note.textContent = code + ' applied to your order.'; }
              return applyCartSnapshot(cart);
            })
            .catch(function () { if (note) { note.textContent = 'That code could not be applied. Please try again.'; } });
        });
      });
    });
    /* No free-gift binding here: the cart drawer ships without a gift milestone;
       the cart page owns its own [data-gift-choices] block bound below. */
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
      quickAdd.textContent = 'Adding...';
      enqueueCartOp(function () {
        return postCart('/cart/add.js', { items: [{ id: variantId, quantity: 1 }] })
          .then(function (r) { if (!r.ok) { throw new Error('add failed'); } return getCart(); })
          .then(function (cart) {
            /* open the side cart straight away, then refresh its contents - no navigation */
            setDrawer(true);
            restoreButton(quickAdd, originalHtml);
            return applyCartSnapshot(cart);
          })
          .catch(function () { flashButton(quickAdd, 'Unavailable', originalHtml); });
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

/* ============================================================
   HAATRUSH — Predictive product search suggestions
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
    return '$' + (cents / 100).toFixed(2);
  };

  var popular = [];
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
    var label = q ? ('View all results for &ldquo;' + escapeHtml(q) + '&rdquo;') : 'View all products';
    var href = routes.root + 'search?q=' + encodeURIComponent(q || '');
    return '<div class="lf-suggest__footer">' +
      '<a class="lf-suggest__viewall" href="' + href + '" data-suggest-viewall>' +
        '<span>' + label + '</span>' + ARROW_SVG +
      '</a>' +
    '</div>';
  };

  var statusHtml = function (q) {
    if (q) {
      return '<div class="lf-suggest__status">Results for <strong>' + escapeHtml(q) + '</strong></div>';
    }
    return '<div class="lf-suggest__status">Popular products</div>';
  };

  var renderProducts = function (items, q) {
    state.items = items || [];
    state.activeIndex = -1;
    if (!state.items.length) {
      panel.innerHTML = statusHtml(q) +
        '<div class="lf-suggest__empty" role="status">' +
          '<strong>No matching products found</strong>' +
          '<span>Try a different keyword.</span>' +
        '</div>' +
        (q ? footerHtml(q) : '');
      input.removeAttribute('aria-activedescendant');
      return;
    }
    var html = statusHtml(q) + '<div class="lf-suggest__heading">Products</div><ul class="lf-suggest__list" role="listbox" aria-label="Product suggestions">';
    for (var i = 0; i < state.items.length; i++) {
      html += rowHtml(state.items[i], i);
    }
    html += '</ul>' + footerHtml(q);
    panel.innerHTML = html;
    input.removeAttribute('aria-activedescendant');
  };

  var renderLoading = function () {
    panel.innerHTML = '<div class="lf-suggest__loading" role="status" aria-live="polite">' +
      '<span class="lf-suggest__spinner" aria-hidden="true"></span>Searching&hellip;</div>';
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
      panel.innerHTML = '<div class="lf-suggest__status">Search our store</div>';
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