
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
window.openCartDrawer = function () { setDrawer(true); };

function removeCartItem(lineKey) {
  fetch('/cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ items: [{ key: lineKey, quantity: 0 }]); }
    
    if (!setFlag('mobile-nav-open', open)) { return; }
    if (menuDrawer) { menuDrawer.setAttribute('aria-hidden', open ? 'false' : 'true'); }
    qsa('[data-menu-open]').forEach(function (t) { t.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  };
function changeCartItemQuantity(target) {
  var lineKey = target.getAttribute('data-line-key');
  var delta = target.getAttribute('data-cart-delta');
  var currentQty = Number(target.getAttribute('data-quantity'));
  var newQty = currentQty + Number(delta);
  if (newQty < 0) { newQty = 0; }
  fetch('/cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ items: [{ key: lineKey, quantity: newQty }] })
  });
  if (cartDrawer) { cartDrawer.setAttribute('aria-hidden', 'false'); }
  setDrawer(true);
}
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
    if (target.closest('[data-cart-remove]')) { event.preventDefault(); removeCartItem(target.getAttribute('data-line-key')); return; }
    if (target.closest('[data-cart-change]')) { event.preventDefault(); changeCartItemQuantity(target); return; }
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
    return 'à§³' + new Intl.NumberFormat('bn-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  var paintCartOffers = function (cart) {
    var root = qs('[data-cart-offers]');
    if (!root || !cart) { return; }
    var shippingThreshold = parseInt(root.getAttribute('data-shipping-threshold'), 10);
    if (isNaN(shippingThreshold) || shippingThreshold < 1) { return; }

    var subtotal = Math.max(0, Number(cart.original_total_price != null ? cart.original_total_price : cart.total_price) || 0);
    var shippingOffer = qs('[data-shipping-offer]', root);
    var shippingFill = qs('[data-shipping-fill]', root);
    var shippingTrack = qs('[data-shipping-offer] [role="progressbar"]', root);
    var shippingStatus = qs('[data-shipping-status]', root);
    var shippingComplete = subtotal >= shippingThreshold;
    var shippingValue = Math.min(subtotal, shippingThreshold);
    if (shippingOffer) { shippingOffer.classList.toggle('is-complete', shippingComplete); }
    var shippingPct = shippingComplete ? 100 : Math.min(99, Math.round(shippingValue * 100 / shippingThreshold));
    if (shippingFill) { shippingFill.style.width = shippingPct + '%'; }
    if (shippingTrack) { shippingTrack.setAttribute('aria-valuenow', String(shippingValue)); }
    if (shippingStatus) {
      shippingStatus.textContent = shippingComplete
        ? 'à¦…à¦­à¦¿à¦¨à¦¨à§à¦¦à¦¨! à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦°à§‡ à¦«à§à¦°à¦¿ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ªà§à¦°à¦¯à§‹à¦œà§à¦¯à¥¤'
        : 'à¦†à¦° ' + money(shippingThreshold - subtotal) + ' à¦–à¦°à¦š à¦•à¦°à§à¦¨';
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
      result.innerHTML = '<span>&#10003;</span><h2>à¦Ÿà§à¦°à§à¦¯à¦¾à¦•à¦¿à¦‚ à¦…à¦¨à§à¦°à§‹à¦§à¦Ÿà¦¿ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦—à§‡à¦›à§‡à¥¤</h2><p><strong>' + value + '</strong> à¦¨à¦®à§à¦¬à¦°à¦Ÿà¦¿à¦° à¦¸à¦°à§à¦¬à¦¶à§‡à¦· à¦¤à¦¥à§à¦¯ à¦¦à§‡à¦–à¦¾à¦¨à§‹ à¦¹à¦¬à§‡, à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦°-à¦¸à¦‚à¦•à§à¦°à¦¾à¦¨à§à¦¤ à¦¤à¦¥à§à¦¯ à¦¯à§à¦•à§à¦¤ à¦¹à¦²à§‡à¥¤</p>';
    }
  });
  /* ---------- cart data helpers ---------- */
  var getCart = function () {
    return fetch('/cart.js', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin'
    }).then(function (response) {
      if (!response.ok) { throw new Error('à¦•à¦¾à¦°à§à¦Ÿ à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤'); }
      return response.json();
    });
  };

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
     state over a newer one (the "1 items / qty 2 / subtotal à§³54.88" frame in
     the recording was an out-of-order response overwriting fresh UI). Each
     operation paints the header count and the cart offers from the SAME
     confirmed /cart.js snapshot, after the drawer HTML swap has landed. */
  var cartOpQueue = Promise.resolve();
  var enqueueCartOp = function (op) {
    var run = cartOpQueue.then(op, op);
    cartOpQueue = run.then(function () {}, function () {});
    return run;
  };
  var appendCartImage = function (container, item, className) {
    var wrapper = document.createElement('div');
    wrapper.className = className;
    if (item.image) {
      var image = document.createElement('img');
      image.src = item.image;
      image.alt = '';
      image.loading = 'lazy';
      wrapper.appendChild(image);
    }
    container.appendChild(wrapper);
  };
  var createCartItemView = function (item, index, pageView) {
    var row = document.createElement('div');
    row.className = pageView ? 'cart-page-item' : 'cart-item';
    var key = item.key || '';
    var line = String(index + 1);
    if (pageView) {
      appendCartImage(row, item, 'cart-page-item__image');
      var details = document.createElement('div');
      details.className = 'cart-page-item__details';
      var vendor = document.createElement('span');
      vendor.className = 'eyebrow';
      vendor.textContent = item.vendor || '';
      details.appendChild(vendor);
      var title = document.createElement('h2');
      title.textContent = item.product_title || item.title || '';
      details.appendChild(title);
      var price = document.createElement('p');
      price.className = 'cart-page-item__price';
      price.textContent = money(item.final_line_price != null ? item.final_line_price : item.line_price);
      details.appendChild(price);
      var remove = document.createElement('a');
      remove.href = '#';
      remove.setAttribute('data-remove-item', '');
      remove.setAttribute('data-line', line);
      remove.setAttribute('data-line-key', key);
      remove.textContent = 'à¦¸à¦°à¦¾à¦¨';
      details.appendChild(createQuantityControl(item, line, key));
      details.appendChild(remove);
      row.appendChild(details);
      return row;
    }

    appendCartImage(row, item, 'cart-item__image');
    var main = document.createElement('div');
    main.className = 'cart-item__main';
    var head = document.createElement('div');
    head.className = 'cart-item__head';
    var heading = document.createElement('h3');
    heading.className = 'cart-item__title';
    heading.textContent = item.product_title || item.title || '';
    head.appendChild(heading);
    var removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'cart-item__remove';
    removeButton.setAttribute('data-remove-item', '');
    removeButton.setAttribute('data-line', line);
    removeButton.setAttribute('data-line-key', key);
    removeButton.setAttribute('aria-label', 'à¦•à¦¾à¦°à§à¦Ÿ à¦¥à§‡à¦•à§‡ à¦¸à¦°à¦¾à¦¨: ' + heading.textContent);
    removeButton.textContent = 'Ã—';
    head.appendChild(removeButton);
    main.appendChild(head);
    if (item.variant_title && item.variant_title !== 'Default Title') {
      var variant = document.createElement('p');
      variant.className = 'cart-item__variant';
      variant.textContent = item.variant_title;
      main.appendChild(variant);
    }
    var foot = document.createElement('div');
    foot.className = 'cart-item__foot';
    foot.appendChild(createQuantityControl(item, line, key));
    var itemPrice = document.createElement('span');
    itemPrice.className = 'cart-item__price';
    itemPrice.textContent = money(item.final_line_price != null ? item.final_line_price : item.line_price);
    foot.appendChild(itemPrice);
    main.appendChild(foot);
    row.appendChild(main);
    return row;
  };
  var createQuantityControl = function (item, line, key) {
    var quantity = Number(item.quantity) || 0;
    var control = document.createElement('div');
    control.className = 'quantity-control';
    [-1, 1].forEach(function (delta) {
      var button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-cart-change', '');
      button.setAttribute('data-line', line);
      button.setAttribute('data-line-key', key);
      button.setAttribute('data-cart-delta', String(delta));
      button.setAttribute('data-quantity', String(Math.max(0, quantity + delta)));
      button.setAttribute('aria-label', delta < 0 ? 'à¦ªà¦°à¦¿à¦®à¦¾à¦£ à¦•à¦®à¦¾à¦¨' : 'à¦ªà¦°à¦¿à¦®à¦¾à¦£ à¦¬à¦¾à¦¡à¦¼à¦¾à¦¨');
      button.textContent = delta < 0 ? 'âˆ’' : 'ï¼‹';
      control.appendChild(button);
      if (delta < 0) {
        var count = document.createElement('span');
        count.textContent = String(quantity);
        control.appendChild(count);
      }
    });
    return control;
  };
  var renderCartViews = function (cart) {
    var items = cart.items || [];
    var body = getScroller();
    if (body) {
      var itemList = qs('.cart-items', body);
      var empty = qs('.empty-state', body);
      if (!items.length) {
        if (itemList) { itemList.remove(); }
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'empty-state';
          var title = document.createElement('h3');
          title.textContent = 'à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¾à¦°à§à¦Ÿ à¦¬à¦°à§à¦¤à¦®à¦¾à¦¨à§‡ à¦–à¦¾à¦²à¦¿ à¦†à¦›à§‡';
          var message = document.createElement('p');
          message.textContent = 'à¦†à¦ªà¦¨à¦¾à¦° à¦ªà¦›à¦¨à§à¦¦à§‡à¦° à¦ªà¦£à§à¦¯ à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¤à§‡ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¶à¦ª à¦˜à§à¦°à§‡ à¦¦à§‡à¦–à§à¦¨à¥¤';
          var link = document.createElement('a');
          link.className = 'button button--dark';
          link.href = '/collections/all';
          link.textContent = 'à¦•à§‡à¦¨à¦¾à¦•à¦¾à¦Ÿà¦¾ à¦šà¦¾à¦²à¦¿à¦¯à¦¼à§‡ à¦¯à¦¾à¦¨';
          empty.appendChild(title);
          empty.appendChild(message);
          empty.appendChild(link);
          body.insertBefore(empty, qs('.drawer-recommendations', body));
        }
      } else {
        if (empty) { empty.remove(); }
        if (!itemList) {
          itemList = document.createElement('div');
          itemList.className = 'cart-items';
          body.insertBefore(itemList, qs('.drawer-recommendations', body));
        }
        itemList.replaceChildren();
        items.forEach(function (item, index) {
          itemList.appendChild(createCartItemView(item, index, false));
        });
      }
      var drawerTotal = qs('.drawer__footer .drawer-total strong', cartDrawer);
      if (drawerTotal) { drawerTotal.textContent = money(cart.total_price); }
      
      // Add Place COD Order button below the total
      var existingTotalRow = drawer.querySelector('.drawer__total-row');
      if (!existingTotalRow) {
        var totalContainer = drawer.querySelector('.drawer__footer .drawer-total');
        if (totalContainer) {
          var codButton = document.createElement('button');
          codButton.type = 'button';
          codButton.className = 'button button--accent button--block';
          codButton.setAttribute('data-cod-order', 'true');
          codButton.textContent = 'সর্বমোট পরের কে শ Produtt';
          // Add click handler that reports limitation
          codButton.addEventListener('click', function(e) {
            e.preventDefault();
            alert('নিও কোড ফর্ম কার্ট থেকে প্রPrimaryDirectlyTriggered হয় না। পণ্য পেজে নিও কোড ফর্ম আপ্লিকেশন ব্লক যোগ করুন।');
          });
          // Wrap the total and add the button
          var totalRow = document.createElement('div');
          totalRow.className = 'drawer__total-row';
          totalRow.appendChild(totalContainer.parentNode.cloneNode(true));
          totalRow.appendChild(codButton);
          totalContainer.parentNode.replaceWith(totalRow);
        }
      }
      if (checkoutLink) { checkoutLink.textContent = 'à¦šà§‡à¦•à¦†à¦‰à¦Ÿ Â· ' + money(cart.total_price); }
    }

    var cartPage = qs('.cart-page');
    if (!cartPage) { return; }
    var layout = qs('.cart-page__layout', cartPage);
    var pageEmpty = qs('.cart-page__empty', cartPage);
    if (!items.length) {
      if (layout) { layout.remove(); }
      if (!pageEmpty) {
        pageEmpty = document.createElement('div');
        pageEmpty.className = 'cart-page__empty';
        var emptyTitle = document.createElement('h2');
        emptyTitle.textContent = 'à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¾à¦°à§à¦Ÿ à¦¬à¦°à§à¦¤à¦®à¦¾à¦¨à§‡ à¦–à¦¾à¦²à¦¿ à¦†à¦›à§‡';
        var emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'à¦†à¦ªà¦¨à¦¾à¦° à¦ªà¦›à¦¨à§à¦¦à§‡à¦° à¦ªà¦£à§à¦¯ à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¤à§‡ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¶à¦ª à¦˜à§à¦°à§‡ à¦¦à§‡à¦–à§à¦¨à¥¤';
        var shopLink = document.createElement('a');
        shopLink.className = 'button button--dark';
        shopLink.href = '/collections/all';
        shopLink.textContent = 'à¦¸à¦¬ à¦ªà¦£à§à¦¯ à¦¦à§‡à¦–à§à¦¨';
        pageEmpty.appendChild(emptyTitle);
        pageEmpty.appendChild(emptyMessage);
        pageEmpty.appendChild(shopLink);
        cartPage.appendChild(pageEmpty);
      }
      return;
    }
    if (pageEmpty) { pageEmpty.remove(); }
    if (!layout) { return; }
    var pageItems = qs('.cart-page__items', layout);
    if (pageItems) {
      pageItems.querySelectorAll('.cart-page-item').forEach(function (row) { row.remove(); });
      items.forEach(function (item, index) {
        pageItems.appendChild(createCartItemView(item, index, true));
      });
    }
    var pageTotal = qs('.cart-page__summary .drawer-total strong', layout);
    if (pageTotal) { pageTotal.textContent = money(cart.total_price); }
  };
  var applyCartSnapshot = function (cart, anchorLine) {
    paintCount(cart.item_count);
    renderCartViews(cart);
    paintCartOffers(cart);
    document.dispatchEvent(new CustomEvent('haatrush:cart-updated', { detail: { cart: cart } }));
    return Promise.resolve(cart);
  };

  var restoreButton = function (button, html) {
    if (!button) { return; }
    button.innerHTML = html;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  };

  var showCartError = function (message) {
    var scope = cartDrawer && cartDrawer.querySelector('[data-cart-body]')
      || document.querySelector('.cart-page')
      || document.querySelector('[data-checkout-app]');
    if (!scope) { return; }
    var note = qs('[data-cart-message]', scope);
    if (!note) {
      note = document.createElement('p');
      note.className = 'cart-note';
      note.setAttribute('data-cart-message', '');
      note.setAttribute('role', 'status');
      scope.insertBefore(note, scope.firstChild);
    }
    note.textContent = message;
    window.clearTimeout(note._hideTimer);
    note._hideTimer = window.setTimeout(function () { note.textContent = ''; }, 5000);
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
        if (!code) { if (note) { note.textContent = 'à¦†à¦—à§‡ à¦à¦•à¦Ÿà¦¿ à¦¡à¦¿à¦¸à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦•à§‹à¦¡ à¦²à¦¿à¦–à§à¦¨à¥¤'; } return; }
        enqueueCartOp(function () {
          return postCart('/cart/update.js', { discount: code })
            .then(function (r) {
              if (!r.ok) { throw new Error('discount failed'); }
              return r.json();
            })
            .then(function (cart) {
              if (note) { note.textContent = 'à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦°à§‡ ' + code + ' à¦ªà§à¦°à¦¯à¦¼à§‹à¦— à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤'; }
              return applyCartSnapshot(cart);
            })
            .catch(function () { if (note) { note.textContent = 'à¦•à§‹à¦¡à¦Ÿà¦¿ à¦ªà§à¦°à¦¯à¦¼à§‹à¦— à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤'; } });
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
    var trigger = root.querySelector('[data-line-key="' + line + '"]') || root.querySelector('[data-line="' + line + '"]');
    return trigger ? trigger.closest('.cart-item, .cart-page-item, .hr-checkout__item') : null;
  };

  /* loading feedback is applied to the single row the customer clicked */
  var setRowBusy = function (line, busy) {
    [cartDrawer, document.querySelector('.cart-page'), document.querySelector('[data-checkout-app]')].forEach(function (root) {
      var row = rowForLine(root, line);
      if (row) { row.classList.toggle('is-updating', !!busy); }
    });
  };
  var setRowControlsDisabled = function (row, disabled) {
    if (!row) { return; }
    qsa('button, a', row).forEach(function (control) {
      if ('disabled' in control) { control.disabled = disabled; }
      if (disabled) { control.setAttribute('aria-disabled', 'true'); }
      else { control.removeAttribute('aria-disabled'); }
    });
  };

  var refreshDrawer = function () {
    return getCart().then(function (cart) { return applyCartSnapshot(cart); });
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
      quickAdd.textContent = 'à¦¯à§‹à¦— à¦¹à¦šà§à¦›à§‡...';
      enqueueCartOp(function () {
        return postCart('/cart/add.js', { items: [{ id: variantId, quantity: 1 }] })
          .then(function (r) { if (!r.ok) { throw new Error('add failed'); } return getCart(); })
          .then(function (cart) {
            /* open the side cart straight away, then refresh its contents - no navigation */
            setDrawer(true);
            restoreButton(quickAdd, originalHtml);
            return applyCartSnapshot(cart);
          })
          .catch(function () { flashButton(quickAdd, 'à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾', originalHtml); });
      });
      return;
    }

    var change = event.target.closest('[data-cart-change]');
    if (change) {
      event.preventDefault();
      var line = change.getAttribute('data-line');
      var lineKey = change.getAttribute('data-line-key');
      var row = change.closest('.cart-item, .cart-page-item, .hr-checkout__item');
      var quantityText = row && qs('.quantity-control span, .checkout-qty-val', row);
      var currentQuantity = quantityText ? parseInt(quantityText.textContent, 10) : NaN;
      var delta = parseInt(change.getAttribute('data-cart-delta'), 10);
      var quantity = Number.isInteger(currentQuantity) && Number.isInteger(delta)
        ? Math.max(0, currentQuantity + delta)
        : Math.max(0, parseInt(change.getAttribute('data-quantity'), 10) || 0);
      if (!lineKey && !line) { return; }
      var busyKey = lineKey || line;
      setRowBusy(busyKey, true);
      setRowControlsDisabled(row, true);
      enqueueCartOp(function () {
        return postCart('/cart/change.js', lineKey
          ? { id: lineKey, quantity: quantity }
          : { line: line, quantity: quantity })
          .then(function (response) {
            if (!response.ok) { throw new Error('change failed'); }
            return response.json();
          })
          .then(function (cart) { return applyCartSnapshot(cart, busyKey); })
          .catch(function () {
            setRowBusy(busyKey, false);
            setRowControlsDisabled(row, false);
            showCartError('à¦•à¦¾à¦°à§à¦Ÿ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
          });
      });
      return;
    }

    var remove = event.target.closest('[data-remove-item]');
    if (remove) {
      event.preventDefault();
      var removeLine = remove.getAttribute('data-line');
      var removeKey = remove.getAttribute('data-line-key');
      var removeBusyKey = removeKey || removeLine;
      var removeRow = remove.closest('.cart-item, .cart-page-item, .hr-checkout__item');
      setRowBusy(removeBusyKey, true);
      enqueueCartOp(function () {
        return postCart('/cart/change.js', removeKey
          ? { id: removeKey, quantity: 0 }
          : { line: removeLine, quantity: 0 })
          .then(function (response) {
            if (!response.ok) { throw new Error('remove failed'); }
            return response.json();
          })
          .then(function (cart) { return applyCartSnapshot(cart); })
          .catch(function () {
            setRowBusy(removeBusyKey, false);
            setRowControlsDisabled(removeRow, false);
            showCartError('à¦ªà¦£à§à¦¯à¦Ÿà¦¿ à¦•à¦¾à¦°à§à¦Ÿ à¦¥à§‡à¦•à§‡ à¦¸à¦°à¦¾à¦¨à§‹ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
          });
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



  
  
  
  
  
  
  

  

  (/\/$/, '') + '/' + path; };
  
    if (!error) { return; }
    error.textContent = message;
    error.hidden = false;
  };
  
    var message = String(value || '');
    return /[\u0980-\u09FF]/.test(message)
      ? message
      : 'à¦¦à§à¦ƒà¦–à¦¿à¦¤, à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤ à¦¤à¦¥à§à¦¯ à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤';
  };
  
    if (!error) { return; }
    error.textContent = '';
    error.hidden = true;
  };
  
    if (!serviceNotice) { return; }
    if (message) { serviceNotice.textContent = message; }
    serviceNotice.hidden = !visible;
  };
  var money = function (amount) {
    var number = Number(amount);
    if (!Number.isFinite(number)) { return 'â€”'; }
    return 'à§³' + new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
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
  var headerCartCount = function () {
    var badge = document.querySelector('[data-cart-count]');
    if (!badge) { return null; }
    var digits = 'à§¦à§§à§¨à§©à§ªà§«à§¬à§­à§®à§¯';
    var value = badge.textContent.trim().replace(/[à§¦-à§¯]/g, function (digit) {
      return String(digits.indexOf(digit));
    });
    var count = Number(value);
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
  };
  var isValidCart = function (cart) {
    if (!cart || !Array.isArray(cart.items)
      || !Number.isSafeInteger(Number(cart.item_count)) || Number(cart.item_count) < 0) {
      return false;
    }
    if (!cart.items.every(function (item) {
      return item && Number.isSafeInteger(Number(item.variant_id))
        && Number(item.variant_id) > 0
        && Number.isSafeInteger(Number(item.quantity))
        && Number(item.quantity) > 0;
    })) {
      return false;
    }
    var actualCount = cart.items.reduce(function (total, item) {
      var quantity = Number(item.quantity);
      return total + quantity;
    }, 0);
    return actualCount === Number(cart.item_count);
  };
  var getCart = function (attempt) {
    return fetch('/cart.js', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin'
    })
      .then(function (response) {
        if (!response.ok) { throw new Error('à¦•à¦¾à¦°à§à¦Ÿ à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤'); }
        return response.json();
      }).then(function (cart) {
        if (!isValidCart(cart)) {
          throw new Error('à¦•à¦¾à¦°à§à¦Ÿà§‡à¦° à¦¤à¦¥à§à¦¯ à¦¸à¦ à¦¿à¦• à¦¨à¦¯à¦¼à¥¤');
        }
        var expectedCount = headerCartCount();
        if (!cart.items.length && expectedCount > 0 && (attempt || 0) < 2) {
          return new Promise(function (resolve) {
            window.setTimeout(resolve, 150);
          }).then(function () { return getCart((attempt || 0) + 1); });
        }
        return cart;
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
    replaceOptions(district, districts, 'à¦œà§‡à¦²à¦¾ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨');
    district.disabled = !division.value || !districts.length;
    replaceOptions(upazila, [], 'à¦‰à¦ªà¦œà§‡à¦²à¦¾/à¦¥à¦¾à¦¨à¦¾ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨');
    upazila.disabled = true;
  };
  var updateUpazilaOptions = function () {
    var upazilas = state.locations ? state.locations.upazilas.filter(function (entry) {
      return entry.district === district.value;
    }) : [];
    replaceOptions(upazila, upazilas, 'à¦‰à¦ªà¦œà§‡à¦²à¦¾/à¦¥à¦¾à¦¨à¦¾ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨');
    upazila.disabled = !district.value || !upazilas.length;
  };
  var isValidLocations = function (locations) {
    if (!locations || !Array.isArray(locations.divisions) || locations.divisions.length !== 8
      || !Array.isArray(locations.districts) || !Array.isArray(locations.upazilas)) {
      return false;
    }
    var divisionValues = new Set(locations.divisions.map(function (entry) { return entry.value; }));
    var districtValues = new Set(locations.districts.map(function (entry) { return entry.value; }));
    return locations.divisions.every(function (entry) {
      return typeof entry.value === 'string' && typeof entry.label === 'string';
    }) && locations.districts.every(function (entry) {
      return typeof entry.value === 'string' && typeof entry.label === 'string' && divisionValues.has(entry.division);
    }) && locations.upazilas.every(function (entry) {
      return typeof entry.value === 'string' && typeof entry.label === 'string' && districtValues.has(entry.district);
    });
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
        row.appendChild(create('span', 'hr-checkout__item-image hr-checkout__item-placeholder', 'â—‡'));
      }
      var info = create('div', 'hr-checkout__item-info');
      info.appendChild(create('strong', 'hr-checkout__item-title', line.title));
      if (line.variantTitle) { info.appendChild(create('small', 'hr-checkout__item-variant', line.variantTitle)); }
      var controls = create('div', 'hr-checkout__item-controls');
      var minus = create('button', 'checkout-qty-btn', 'âˆ’');
      minus.type = 'button';
      minus.setAttribute('data-cart-change', '');
      minus.setAttribute('data-line', String(index + 1));
      minus.setAttribute('data-line-key', line.cartKey || '');
      minus.setAttribute('data-cart-delta', '-1');
      minus.setAttribute('data-quantity', String(Math.max(0, line.quantity - 1)));
      minus.setAttribute('aria-label', 'à¦ªà¦°à¦¿à¦®à¦¾à¦£ à¦•à¦®à¦¾à¦¨');
      controls.appendChild(minus);
      controls.appendChild(create('span', 'checkout-qty-val', bengaliCount(line.quantity)));
      var plus = create('button', 'checkout-qty-btn', '+');
      plus.type = 'button';
      plus.setAttribute('data-cart-change', '');
      plus.setAttribute('data-line', String(index + 1));
      plus.setAttribute('data-line-key', line.cartKey || '');
      plus.setAttribute('data-cart-delta', '1');
      plus.setAttribute('data-quantity', String(line.quantity + 1));
      plus.setAttribute('aria-label', 'à¦ªà¦°à¦¿à¦®à¦¾à¦£ à¦¬à¦¾à¦¡à¦¼à¦¾à¦¨');
      controls.appendChild(plus);
      info.appendChild(controls);
      row.appendChild(info);
      row.appendChild(create('strong', 'hr-checkout__item-price', money(line.lineTotal)));
      var remove = create('button', 'checkout-item__remove-btn', 'Ã—');
      remove.type = 'button';
      remove.setAttribute('data-remove-item', '');
      remove.setAttribute('data-line', String(index + 1));
      remove.setAttribute('data-line-key', line.cartKey || '');
      remove.setAttribute('data-cart-remove', '');
      remove.setAttribute('aria-label', line.title + ' à¦•à¦¾à¦°à§à¦Ÿ à¦¥à§‡à¦•à§‡ à¦¸à¦°à¦¾à¦¨');
      row.appendChild(remove);
      itemsNode.appendChild(row);
    });
  };
  var paintQuote = function (quote, cart) {
    state.quote = quote;
    state.lines = quote.lines || [];
    state.cartPricing = {
      subtotalMinor: Math.round(Number(quote.subtotal) * 100),
      discountMinor: Math.round(Number(quote.bundleDiscount) * 100),
      shippingFree: Boolean(quote.shippingFree),
      itemCount: Number(quote.itemCount) || 0
    };
    if (cart && Array.isArray(cart.items)) {
      state.lines.forEach(function (line, index) {
        line.cartKey = cart.items[index] && cart.items[index].key || '';
      });
    }
    renderLines(state.lines);
    setText('[data-checkout-count]', bengaliCount(quote.itemCount));
    setText('[data-checkout-subtotal]', money(quote.subtotal));
    setText('[data-checkout-discount]', quote.bundleEligible ? 'âˆ’ ' + money(quote.bundleDiscount) : money(0));
    setText('[data-checkout-shipping-total]', quote.shipping == null
      ? 'à¦œà§‡à¦²à¦¾ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨'
      : Number(quote.shipping) === 0 ? 'à¦«à§à¦°à¦¿' : money(quote.shipping));
    setText('[data-checkout-total]', quote.total == null ? 'à¦à¦²à¦¾à¦•à¦¾ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨' : money(quote.total));

    var bundleDone = quote.bundleEligible;
    var bundle = root.querySelector('[data-checkout-bundle]');
    var bundleFill = root.querySelector('[data-bundle-fill]');
    var bundleTrack = bundle && bundle.querySelector('[role="progressbar"]');
    var bundleStatus = root.querySelector('[data-bundle-status]');
    if (bundle) { bundle.classList.toggle('is-complete', bundleDone); }
    if (bundleFill) { bundleFill.style.width = Math.min(100, Math.round(quote.itemCount * 50)) + '%'; }
    if (bundleTrack) { bundleTrack.setAttribute('aria-valuenow', String(Math.min(2, quote.itemCount))); }
    if (bundleStatus) { bundleStatus.textContent = bundleDone ? 'à¦¯à§‹à¦—à§à¦¯à¦¤à¦¾ à¦ªà§‚à¦°à¦£' : bengaliCount(quote.itemCount) + ' / à§¨'; }
    setText('[data-bundle-message]', bundleDone
      ? 'à§¨% à¦¬à¦¾à¦¨à§à¦¡à§‡à¦² à¦›à¦¾à¦¡à¦¼ à¦…à¦°à§à¦¡à¦¾à¦°à§‡ à¦ªà§à¦°à¦¯à¦¼à§‹à¦— à¦•à¦°à¦¾ à¦¹à¦¬à§‡à¥¤'
      : 'à¦†à¦° ' + bengaliCount(2 - quote.itemCount) + 'à¦Ÿà¦¿ à¦ªà¦£à§à¦¯ à¦¯à§‹à¦— à¦•à¦°à¦²à§‡ à§¨% à¦›à¦¾à¦¡à¦¼ à¦ªà¦¾à¦¬à§‡à¦¨à¥¤');

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
        ? 'à¦¯à§‹à¦—à§à¦¯à¦¤à¦¾ à¦ªà§‚à¦°à¦£'
        : money(quote.shippingRemaining) + ' à¦¬à¦¾à¦•à¦¿';
    }
    setText('[data-shipping-message]', shippingDone
      ? 'à§³à§§,à§¦à§¦à§¦-à¦à¦° à¦¬à§‡à¦¶à¦¿ à¦ªà¦£à§à¦¯à§‡à¦° à¦®à§‹à¦Ÿà§‡ à¦«à§à¦°à¦¿ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ªà§à¦°à¦¯à§‹à¦œà§à¦¯à¥¤'
      : 'à¦ªà¦£à§à¦¯à§‡à¦° à¦®à§‹à¦Ÿ à§³à§§,à§¦à§¦à§¦ à¦…à¦¤à¦¿à¦•à§à¦°à¦® à¦•à¦°à¦²à§‡ à¦«à§à¦°à¦¿ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ªà¦¾à¦¬à§‡à¦¨à¥¤');
    submit.disabled = state.busy || !state.proxyReady || !quote.quoteToken
      || !division.value || !district.value || !upazila.value || quote.total == null || state.confirmed;
  };
  var paintDistrictShipping = function () {
    var quote = state.quote;
    var pricing = state.cartPricing;
    if (!district.value || (!quote && !pricing)) { return; }
    var subtotal = quote ? Number(quote.subtotal) : pricing.subtotalMinor / 100;
    var discount = quote ? Number(quote.bundleDiscount) : pricing.discountMinor / 100;
    var shippingFree = quote ? quote.shippingFree : pricing.shippingFree;
    var shipping = shippingFree ? 0 : district.value === 'Dhaka' ? 60 : 130;
    var total = subtotal - discount + shipping;
    setText('[data-checkout-shipping-total]', shipping === 0 ? 'à¦«à§à¦°à¦¿' : money(shipping));
    setText('[data-checkout-total]', money(total));
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
        row.appendChild(create('span', 'hr-checkout__item-image hr-checkout__item-placeholder', 'â—‡'));
      }
      var info = create('div', 'hr-checkout__item-info');
      info.appendChild(create('strong', 'hr-checkout__item-title', line.title));
      if (line.variantTitle) { info.appendChild(create('small', 'hr-checkout__item-variant', line.variantTitle)); }
      var controls = create('div', 'hr-checkout__item-controls');
      var minus = create('button', 'checkout-qty-btn', 'âˆ’');
      minus.type = 'button';
      minus.setAttribute('data-cart-change', '');
      minus.setAttribute('data-line', String(index + 1));
      minus.setAttribute('data-line-key', item.key || '');
      minus.setAttribute('data-cart-delta', '-1');
      minus.setAttribute('data-quantity', String(Math.max(0, line.quantity - 1)));
      minus.setAttribute('aria-label', 'à¦ªà¦°à¦¿à¦®à¦¾à¦£ à¦•à¦®à¦¾à¦¨');
      controls.appendChild(minus);
      controls.appendChild(create('span', 'checkout-qty-val', bengaliCount(line.quantity)));
      var plus = create('button', 'checkout-qty-btn', '+');
      plus.type = 'button';
      plus.setAttribute('data-cart-change', '');
      plus.setAttribute('data-line', String(index + 1));
      plus.setAttribute('data-line-key', item.key || '');
      plus.setAttribute('data-cart-delta', '1');
      plus.setAttribute('data-quantity', String(line.quantity + 1));
      plus.setAttribute('aria-label', 'à¦ªà¦°à¦¿à¦®à¦¾à¦£ à¦¬à¦¾à¦¡à¦¼à¦¾à¦¨');
      controls.appendChild(plus);
      info.appendChild(controls);
      row.appendChild(info);
      row.appendChild(create('strong', 'hr-checkout__item-price', money(line.lineTotal)));
      var remove = create('button', 'checkout-item__remove-btn', 'Ã—');
      remove.type = 'button';
      remove.setAttribute('data-remove-item', '');
      remove.setAttribute('data-line', String(index + 1));
      remove.setAttribute('data-line-key', item.key || '');
      remove.setAttribute('aria-label', line.title + ' à¦•à¦¾à¦°à§à¦Ÿ à¦¥à§‡à¦•à§‡ à¦¸à¦°à¦¾à¦¨');
      row.appendChild(remove);
      itemsNode.appendChild(row);
    });
    var subtotal = Math.max(0, Number(cart.original_total_price != null ? cart.original_total_price : cart.total_price) || 0);
    var itemCount = Number(cart.item_count) || 0;
    var discount = itemCount >= 2 ? items.reduce(function (total, item) {
      var lineSubtotal = Number(item.original_line_price != null ? item.original_line_price : item.line_price) || 0;
      return total + Math.floor(lineSubtotal * 0.02);
    }, 0) : 0;
    state.cartPricing = {
      subtotalMinor: subtotal,
      discountMinor: discount,
      shippingFree: subtotal > 100000,
      itemCount: itemCount
    };
    var shippingFree = subtotal > 100000;
    var shipping = shippingFree
      ? 0
      : !district.value ? null
        : district.value === 'Dhaka' ? 6000 : 13000;
    var total = shipping === null ? null : subtotal - discount + shipping;
    setText('[data-checkout-count]', bengaliCount(cart.item_count));
    setText('[data-checkout-subtotal]', money(subtotal / 100));
    setText('[data-checkout-discount]', discount ? 'âˆ’ ' + money(discount / 100) : money(0));
    setText('[data-checkout-shipping-total]', shipping === null
      ? 'à¦œà§‡à¦²à¦¾ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨' : shipping === 0 ? 'à¦«à§à¦°à¦¿' : money(shipping / 100));
    setText('[data-checkout-total]', total === null ? 'à¦à¦²à¦¾à¦•à¦¾ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨' : money(total / 100));

    var bundleDone = itemCount >= 2;
    var bundle = root.querySelector('[data-checkout-bundle]');
    var bundleFill = root.querySelector('[data-bundle-fill]');
    var bundleTrack = bundle && bundle.querySelector('[role="progressbar"]');
    var bundleStatus = root.querySelector('[data-bundle-status]');
    if (bundle) { bundle.classList.toggle('is-complete', bundleDone); }
    if (bundleFill) { bundleFill.style.width = Math.min(100, Math.round(itemCount * 50)) + '%'; }
    if (bundleTrack) { bundleTrack.setAttribute('aria-valuenow', String(Math.min(2, itemCount))); }
    if (bundleStatus) { bundleStatus.textContent = bundleDone ? 'à¦¯à§‹à¦—à§à¦¯à¦¤à¦¾ à¦ªà§‚à¦°à¦£' : bengaliCount(itemCount) + ' / à§¨'; }
    setText('[data-bundle-message]', bundleDone
      ? 'à§¨% à¦¬à¦¾à¦¨à§à¦¡à§‡à¦² à¦›à¦¾à¦¡à¦¼ à¦…à¦°à§à¦¡à¦¾à¦°à§‡ à¦ªà§à¦°à¦¯à¦¼à§‹à¦— à¦•à¦°à¦¾ à¦¹à¦¬à§‡à¥¤'
      : 'à¦†à¦° ' + bengaliCount(2 - itemCount) + 'à¦Ÿà¦¿ à¦ªà¦£à§à¦¯ à¦¯à§‹à¦— à¦•à¦°à¦²à§‡ à§¨% à¦›à¦¾à¦¡à¦¼ à¦ªà¦¾à¦¬à§‡à¦¨à¥¤');

    var shippingOffer = root.querySelector('[data-checkout-shipping]');
    var shippingFill = root.querySelector('[data-shipping-fill]');
    var shippingTrack = shippingOffer && shippingOffer.querySelector('[role="progressbar"]');
    var shippingStatus = root.querySelector('[data-shipping-status]');
    var shippingDone = shippingFree;
    var shippingProgress = Math.min(100, Math.round(subtotal / 100001 * 100));
    if (!shippingDone) { shippingProgress = Math.min(99, shippingProgress); }
    if (shippingOffer) { shippingOffer.classList.toggle('is-complete', shippingDone); }
    if (shippingFill) { shippingFill.style.width = shippingProgress + '%'; }
    if (shippingTrack) { shippingTrack.setAttribute('aria-valuenow', String(Math.min(100001, subtotal))); }
    if (shippingStatus) {
      shippingStatus.textContent = shippingDone ? 'à¦¯à§‹à¦—à§à¦¯à¦¤à¦¾ à¦ªà§‚à¦°à¦£' : money(Math.max(0, 100001 - subtotal) / 100) + ' à¦¬à¦¾à¦•à¦¿';
    }
    setText('[data-shipping-message]', shippingDone
      ? 'à§³à§§,à§¦à§¦à§¦-à¦à¦° à¦¬à§‡à¦¶à¦¿ à¦ªà¦£à§à¦¯à§‡à¦° à¦®à§‹à¦Ÿà§‡ à¦«à§à¦°à¦¿ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ªà§à¦°à¦¯à§‹à¦œà§à¦¯à¥¤'
      : 'à¦ªà¦£à§à¦¯à§‡à¦° à¦®à§‹à¦Ÿ à§³à§§,à§¦à§¦à§¦ à¦…à¦¤à¦¿à¦•à§à¦°à¦® à¦•à¦°à¦²à§‡ à¦«à§à¦°à¦¿ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ªà¦¾à¦¬à§‡à¦¨à¥¤');
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
  var refreshQuote = function (cartSnapshot) {
    var sequence = ++state.sequence;
    clearError();
    var currentHeaderCount = headerCartCount();
    var snapshotIsCurrent = isValidCart(cartSnapshot) && (currentHeaderCount === null
      ? cartSnapshot.items.length > 0
      : Number(cartSnapshot.item_count) === currentHeaderCount);
    return (snapshotIsCurrent ? Promise.resolve(cartSnapshot) : getCart()).then(function (cart) {
      if (!cart.items || !cart.items.length) {
        if (headerCartCount() > 0) {
          if (content) { content.hidden = false; }
          if (emptyCart) { emptyCart.hidden = true; }
          state.quote = null;
          state.lines = [];
          itemsNode.replaceChildren();
          submit.disabled = true;
          setServiceNotice(true, 'à¦•à¦¾à¦°à§à¦Ÿà§‡à¦° à¦ªà¦£à§à¦¯ à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤ à¦ªà§‡à¦œà¦Ÿà¦¿ à¦°à¦¿à¦«à§à¦°à§‡à¦¶ à¦•à¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
          return null;
        }
        showEmptyCart();
        return null;
      }
      if (emptyCart) { emptyCart.hidden = true; }
      if (content) { content.hidden = false; }
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
          showError(result.body.error || 'à¦¦à¦¾à¦® à¦“ à¦¸à§à¦Ÿà¦• à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤');
          return null;
        }
        paintQuote(result.body, cart);
        setServiceNotice(false);
        return result.body;
      });
    }).catch(function () {
      if (sequence !== state.sequence) { return null; }
      state.quote = null;
      submit.disabled = true;
      setServiceNotice(true, 'à¦¦à§à¦ƒà¦–à¦¿à¦¤, à¦à¦‡ à¦®à§à¦¹à§‚à¦°à§à¦¤à§‡ à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à§‡à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤ à¦ªà¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
      return null;
    });
  };
  var loadLocations = function () {
    return fetch(locationsUrl, { cache: 'force-cache' }).then(function (response) {
      if (!response.ok) { throw new Error('location data unavailable'); }
      return response.json();
    }).then(function (locations) {
      if (!isValidLocations(locations)) { throw new Error('location data is invalid'); }
      state.locations = locations;
      if (division.options.length <= 1) {
        replaceOptions(division, locations.divisions, 'à¦¬à¦¿à¦­à¦¾à¦— à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§à¦¨');
      }
      division.disabled = false;
      updateDistrictOptions();
      return true;
    }).catch(function () {
      division.disabled = false;
      setServiceNotice(true, 'à¦¦à§à¦ƒà¦–à¦¿à¦¤, à¦à¦‡ à¦®à§à¦¹à§‚à¦°à§à¦¤à§‡ à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à§‡à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤ à¦ªà¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
    });
  };
  var loadCheckoutService = function () {
    return Promise.all([
      requestJson(endpoint('config')),
      requestJson(endpoint('health'))
    ]).then(function (results) {
      var config = results[0];
      var health = results[1];
      if (!config.response.ok || !health.response.ok || health.body.status !== 'ok'
        || !health.body.integrations || health.body.integrations.database !== 'ok'
        || health.body.integrations.shopify !== 'ok' || health.body.currency !== 'BDT') {
        throw new Error('checkout service unavailable');
      }
      var bkashLabel = root.querySelector('.hr-checkout__bkash');
      if (bkashLabel) {
        bkashLabel.hidden = !config.body.bkashEnabled || root.getAttribute('data-bkash-enabled') !== 'true';
      }
      state.proxyReady = true;
      setServiceNotice(false);
      submit.disabled = !state.quote || !state.quote.quoteToken || !state.quote.total
        || !division.value || !district.value || !upazila.value || state.confirmed;
      if (state.quote) { paintDistrictShipping(); }
      return true;
    }).catch(function () {
      state.proxyReady = false;
      submit.disabled = true;
      setServiceNotice(true, 'à¦¦à§à¦ƒà¦–à¦¿à¦¤, à¦à¦‡ à¦®à§à¦¹à§‚à¦°à§à¦¤à§‡ à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à§‡à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤ à¦ªà¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
      return false;
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
      setText('[data-checkout-discount]', Number(result.discount) > 0 ? 'âˆ’ ' + money(result.discount) : money(0));
    }
    if (result.shipping != null) {
      setText('[data-checkout-shipping-total]', Number(result.shipping) === 0 ? 'à¦«à§à¦°à¦¿' : money(result.shipping));
    }
    if (result.total != null) { setText('[data-checkout-total]', money(result.total)); }
    var paymentMethod = result.paymentMethod || 'cod';
    var confirmationBkash = root.querySelector('[data-confirmation-bkash]');
    if (paymentMethod === 'bkash') {
      if (confirmationBkash) {
        confirmationBkash.textContent = 'à¦®à§à¦¯à¦¾à¦¨à§à¦¯à¦¼à¦¾à¦² à¦¬à¦¿à¦•à¦¾à¦¶ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ: '
          + root.getAttribute('data-bkash-number') + 'à¥¤ '
          + (root.getAttribute('data-bkash-instructions') || '');
        confirmationBkash.hidden = false;
      }
    }
    clearStoredSubmission();
  };
  var pollSubmission = function (submissionId, attempts) {
    if (confirmation) { confirmation.hidden = true; }
    state.busy = true;
    submit.disabled = true;
    setServiceNotice(true, 'à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦•à¦°à¦¾ à¦¹à¦šà§à¦›à§‡à¥¤ à¦…à¦¨à§à¦—à§à¦°à¦¹ à¦•à¦°à§‡ à¦…à¦ªà§‡à¦•à§à¦·à¦¾ à¦•à¦°à§à¦¨à¥¤');
    return requestJson(endpoint('orders/' + encodeURIComponent(submissionId))).then(function (result) {
      if (result.response.status === 404) {
        clearStoredSubmission();
        state.busy = false;
        setServiceNotice(false);
        submitLabel.textContent = 'à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦¨à¦«à¦¾à¦°à§à¦® à¦•à¦°à§à¦¨';
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
        submitLabel.textContent = 'à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦¨à¦«à¦¾à¦°à§à¦® à¦•à¦°à§à¦¨';
        showError(result.body.response && result.body.response.error || 'à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¤à§ˆà¦°à¦¿ à¦¹à¦¯à¦¼à¦¨à¦¿à¥¤ à¦¤à¦¥à§à¦¯ à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
        refreshQuote();
        return;
      }
      if (attempts <= 0) {
        setServiceNotice(true, 'à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦•à¦°à¦¾ à¦¹à¦šà§à¦›à§‡à¥¤ à¦…à¦¨à§à¦—à§à¦°à¦¹ à¦•à¦°à§‡ à¦…à¦ªà§‡à¦•à§à¦·à¦¾ à¦•à¦°à§à¦¨à¥¤');
        return;
      }
      window.setTimeout(function () { pollSubmission(submissionId, attempts - 1); }, 2000);
    }).catch(function () {
      if (attempts > 0) {
        window.setTimeout(function () { pollSubmission(submissionId, attempts - 1); }, 2000);
      } else {
        setServiceNotice(true, 'à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦•à¦°à¦¾ à¦¹à¦šà§à¦›à§‡à¥¤ à¦…à¦¨à§à¦—à§à¦°à¦¹ à¦•à¦°à§‡ à¦…à¦ªà§‡à¦•à§à¦·à¦¾ à¦•à¦°à§à¦¨à¥¤');
      }
    });
  };

  var quoteTimer;
  var latestCartSnapshot = null;
  var scheduleQuoteRefresh = function (cart) {
    state.sequence += 1;
    if (cart) { latestCartSnapshot = cart; }
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(function () {
      var snapshot = latestCartSnapshot;
      latestCartSnapshot = null;
      refreshQuote(snapshot);
    }, 120);
  };
  [division, district, upazila].forEach(function (select) {
    select.addEventListener('change', function () {
      if (select === division) { updateDistrictOptions(); }
      if (select === district) { updateUpazilaOptions(); }
      if (select === district) { paintDistrictShipping(); }
      scheduleQuoteRefresh();
    });
  });
  document.addEventListener('haatrush:cart-updated', function (event) {
    scheduleQuoteRefresh(event.detail && event.detail.cart);
  });
  window.addEventListener('pageshow', function (event) { if (event.persisted) { refreshQuote(); } });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (state.busy || state.confirmed) { return; }
    clearError();
    if (!form.reportValidity()) { return; }
    if (!state.proxyReady) {
      setServiceNotice(true, 'à¦¦à§à¦ƒà¦–à¦¿à¦¤, à¦à¦‡ à¦®à§à¦¹à§‚à¦°à§à¦¤à§‡ à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à§‡à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤ à¦ªà¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
      return;
    }
    state.busy = true;
    submit.disabled = true;
    submitLabel.textContent = 'à¦¤à¦¥à§à¦¯ à¦¯à¦¾à¦šà¦¾à¦‡ à¦¹à¦šà§à¦›à§‡â€¦';
    var cartSnapshot;
    getCart().then(function (cart) {
      if (!cart.items || !cart.items.length) { throw new Error('à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¾à¦°à§à¦Ÿ à¦–à¦¾à¦²à¦¿à¥¤'); }
      cartSnapshot = cart;
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
        throw new Error(result.body.error || 'à¦¦à¦¾à¦® à¦¬à¦¾ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿à¦° à¦¤à¦¥à§à¦¯ à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à§à¦¨à¥¤');
      }
      paintQuote(result.body, cartSnapshot);
      var submissionId = createSubmissionId();
      if (!saveSubmission(submissionId)) {
        throw new Error('à¦¨à¦¿à¦°à¦¾à¦ªà¦¦à§‡ à¦…à¦°à§à¦¡à¦¾à¦° à¦œà¦®à¦¾ à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤ à¦¬à§à¦°à¦¾à¦‰à¦œà¦¾à¦°à§‡à¦° à¦¸à§‡à¦¶à¦¨ à¦¸à§à¦Ÿà§‹à¦°à§‡à¦œ à¦šà¦¾à¦²à§ à¦•à¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
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
          throw new Error(orderResult.body.error || 'à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
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
        showError(customerError(submitError.message));
        refreshQuote();
      }
    }).finally(function () {
      if (!state.confirmed && !getStoredSubmission()) {
        submit.disabled = !state.proxyReady || !state.quote || !state.quote.quoteToken || !state.quote.total;
        submitLabel.textContent = 'à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦¨à¦«à¦¾à¦°à§à¦® à¦•à¦°à§à¦¨';
      }
    });
  });

  function cartLinesFromQuote(quote) {
    return quote.lines.map(function (line) {
      return { variantId: line.variantId, quantity: line.quantity, properties: line.properties || [] };
    });
  }

  loadLocations();
  loadCheckoutService().then(function (available) {
    if (available) {
      var pendingSubmission = getStoredSubmission();
      if (pendingSubmission) { pollSubmission(pendingSubmission, 15); }
    }
  });
  getCart().then(function (cart) {
    if (!cart.items.length) {
      showEmptyCart();
      return null;
    }
    if (emptyCart) { emptyCart.hidden = true; }
    if (content) { content.hidden = false; }
    paintCartPreview(cart);
    return refreshQuote(cart);
  }).catch(function () {
    submit.disabled = true;
    setServiceNotice(true, 'à¦¦à§à¦ƒà¦–à¦¿à¦¤, à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¾à¦°à§à¦Ÿ à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à¦¾ à¦¯à¦¾à¦šà§à¦›à§‡ à¦¨à¦¾à¥¤ à¦ªà§‡à¦œà¦Ÿà¦¿ à¦°à¦¿à¦«à§à¦°à§‡à¦¶ à¦•à¦°à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤');
  });
}());

/* ============================================================
   HaatRush â€” Predictive product search suggestions
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
    return 'à§³' + (cents / 100).toFixed(2);
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
      ? (escapeHtml(q) + ' ' + escapeHtml(localeStrings.view_all_results_for || 'à¦à¦° à¦¸à¦¬ à¦«à¦²à¦¾à¦«à¦² à¦¦à§‡à¦–à§à¦¨'))
      : escapeHtml(localeStrings.view_all_products || 'à¦¸à¦¬ à¦ªà¦£à§à¦¯ à¦¦à§‡à¦–à§à¦¨');
    var href = routes.root + 'search?q=' + encodeURIComponent(q || '');
    return '<div class="lf-suggest__footer">' +
      '<a class="lf-suggest__viewall" href="' + href + '" data-suggest-viewall>' +
        '<span>' + label + '</span>' + ARROW_SVG +
      '</a>' +
    '</div>';
  };

  var statusHtml = function (q) {
    if (q) {
      return '<div class="lf-suggest__status"><strong>' + escapeHtml(q) + '</strong>-à¦à¦° à¦«à¦²à¦¾à¦«à¦²</div>';
    }
    return '<div class="lf-suggest__status">à¦œà¦¨à¦ªà§à¦°à¦¿à¦¯à¦¼ à¦ªà¦£à§à¦¯</div>';
  };

  var renderProducts = function (items, q) {
    state.items = items || [];
    state.activeIndex = -1;
    if (!state.items.length) {
      panel.innerHTML = statusHtml(q) +
        '<div class="lf-suggest__empty" role="status">' +
          '<strong>' + escapeHtml(localeStrings.no_matching_products || 'à¦®à¦¿à¦²à¦›à§‡ à¦à¦®à¦¨ à¦•à§‹à¦¨à§‹ à¦ªà¦£à§à¦¯ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿') + '</strong>' +
          '<span>à¦…à¦¨à§à¦¯ à¦¶à¦¬à§à¦¦ à¦¦à¦¿à¦¯à¦¼à§‡ à¦–à§à¦à¦œà§‡ à¦¦à§‡à¦–à§à¦¨à¥¤</span>' +
        '</div>' +
        (q ? footerHtml(q) : '');
      input.removeAttribute('aria-activedescendant');
      return;
    }
    var html = statusHtml(q) + '<div class="lf-suggest__heading">à¦ªà¦£à§à¦¯</div><ul class="lf-suggest__list" role="listbox" aria-label="à¦ªà¦£à§à¦¯à§‡à¦° à¦ªà¦°à¦¾à¦®à¦°à§à¦¶">';
    for (var i = 0; i < state.items.length; i++) {
      html += rowHtml(state.items[i], i);
    }
    html += '</ul>' + footerHtml(q);
    panel.innerHTML = html;
    input.removeAttribute('aria-activedescendant');
  };

  var renderLoading = function () {
    panel.innerHTML = '<div class="lf-suggest__loading" role="status" aria-live="polite">' +
      '<span class="lf-suggest__spinner" aria-hidden="true"></span>à¦–à§‹à¦à¦œà¦¾ à¦¹à¦šà§à¦›à§‡&hellip;</div>';
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
      panel.innerHTML = '<div class="lf-suggest__status">à¦¸à§à¦Ÿà§‹à¦°à§‡ à¦–à§à¦à¦œà§à¦¨</div>';
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


