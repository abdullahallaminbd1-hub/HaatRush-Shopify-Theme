/* HaatRush product page behaviour: gallery, quantity stepper and offers,
   countdown, order progress, policy accordions and add to cart. */
(function () {
  'use strict';

  var root = document.querySelector('[data-product-root]');
  if (!root) { return; }

  var qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var money = function (cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) { return Shopify.formatMoney(cents); }
    return '৳' + (cents / 100).toFixed(2);
  };

  /* ---------------- variant data ---------------- */
  var data = { variants: [] };
  var json = qs('[data-product-json]');
  if (json) {
    try { data = JSON.parse(json.textContent) || data; } catch (e) { /* keep defaults */ }
  }
  var variants = data.variants || [];

  var findVariant = function (options) {
    for (var i = 0; i < variants.length; i++) {
      var match = true;
      for (var j = 0; j < options.length; j++) {
        if (String(variants[i].options[j]) !== String(options[j])) { match = false; break; }
      }
      if (match) { return variants[i]; }
    }
    return null;
  };

  /* ---------------- gallery ---------------- */
  var slides = qsa('[data-gallery-slide]', root);
  var thumbs = qsa('[data-gallery-thumb]', root);
  var prevBtn = qs('[data-gallery-prev]', root);
  var nextBtn = qs('[data-gallery-next]', root);
  var dotWrap = qs('[data-gallery-dots]', root);
  var current = 0;

  var buildDots = function () {
    if (!dotWrap || slides.length < 2) { return; }
    dotWrap.innerHTML = '';
    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'lf-gallery__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'ছবি ' + (i + 1) + ' দেখুন');
      dot.addEventListener('click', function () { show(i); });
      dotWrap.appendChild(dot);
    });
  };

  var show = function (index, fromScroll) {
    if (!slides.length) { return; }
    current = (index + slides.length) % slides.length;
    slides.forEach(function (slide, i) {
      var active = i === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    thumbs.forEach(function (thumb, i) {
      var active = i === current;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    qsa('.lf-gallery__dot', dotWrap).forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === current);
      dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
    if (prevBtn) { prevBtn.disabled = current === 0; }
    if (nextBtn) { nextBtn.disabled = current === slides.length - 1; }
    revealThumb(current);
    /* a swipe already moved the stage, so never scroll it back mid-gesture */
    if (!fromScroll) { slideStageTo(current); }
  };

  /* thumbnail strip arrows */
  var thumbsList = qs('[data-thumbs-list]', root);
  var tPrev = qs('[data-thumbs-prev]', root);
  var tNext = qs('[data-thumbs-next]', root);
  var syncThumbArrows = function () {
    if (!thumbsList) { return; }
    var max = thumbsList.scrollWidth - thumbsList.clientWidth;
    if (tPrev) { tPrev.disabled = thumbsList.scrollLeft <= 2; }
    if (tNext) { tNext.disabled = thumbsList.scrollLeft >= max - 2; }
  };
  var revealThumb = function (index) {
    if (!thumbsList) { return; }
    var thumb = thumbs[index];
    if (!thumb) { return; }
    var left = thumb.offsetLeft;
    var right = left + thumb.offsetWidth;
    if (left < thumbsList.scrollLeft) { thumbsList.scrollLeft = left - 8; }
    else if (right > thumbsList.scrollLeft + thumbsList.clientWidth) {
      thumbsList.scrollLeft = right - thumbsList.clientWidth + 8;
    }
    syncThumbArrows();
  };

  /* ---------------- mobile swipe stage ----------------
     Only on phones does the stage become a horizontal scroller that holds
     every image. There, picking an image scrolls it into view, and scrolling
     it by hand reports back which image is now showing. The desktop gallery
     keeps its original crossfade and is left completely untouched. */
  var stage = qs('[data-gallery-stage]', root);
  var stageIsScroller = function () {
    if (!stage) { return false; }
    var cs = window.getComputedStyle(stage);
    return cs.display === 'flex' && cs.overflowX !== 'visible';
  };

  var slideStageTo = function (index) {
    var slide = slides[index];
    if (!slide || !stage || !stageIsScroller()) { return; }
    /* ignore the scroll events this movement causes, but keep the window
       short so a customer who swipes straight after tapping a thumbnail is
       never left looking at a stale indicator */
    ignoreScrollUntil = Date.now() + 350;
    if (typeof stage.scrollTo === 'function') {
      stage.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    } else {
      stage.scrollLeft = slide.offsetLeft;
    }
  };

  var ignoreScrollUntil = 0;
  var nearestSlide = function () {
    var mid = stage.scrollLeft + stage.clientWidth / 2;
    var best = 0;
    var bestGap = Infinity;
    slides.forEach(function (slide, i) {
      var centre = slide.offsetLeft + slide.offsetWidth / 2;
      var gap = Math.abs(centre - mid);
      if (gap < bestGap) { bestGap = gap; best = i; }
    });
    return best;
  };

  if (slides.length) {
    buildDots();
    /* one image needs no strip of thumbnails, so keep it off phones too */
    if (slides.length < 2) {
      var thumbsWrap = qs('[data-thumbs]', root);
      if (thumbsWrap) { thumbsWrap.hidden = true; }
    }
    show(0);
    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () { show(i); });
    });
    if (prevBtn) { prevBtn.addEventListener('click', function () { show(current - 1); }); }
    if (nextBtn) { nextBtn.addEventListener('click', function () { show(current + 1); }); }
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { show(current - 1); }
      if (e.key === 'ArrowRight') { show(current + 1); }
    });
    /* a swipe on the phone updates the thumbnail and dot indicator */
    if (stage) {
      var onScroll = function () {
        if (!stageIsScroller() || Date.now() < ignoreScrollUntil) { return; }
        var next = nearestSlide();
        if (next !== current) { show(next, true); }
      };
      /* a short timer rather than requestAnimationFrame, which some browsers
         do not run for a background or headless page */
      var pending = false;
      stage.addEventListener('scroll', function () {
        if (pending) { return; }
        pending = true;
        window.setTimeout(function () { pending = false; onScroll(); }, 60);
      }, { passive: true });
    }
  }
  if (thumbsList) {
    var step = function () { return Math.max(120, thumbsList.clientWidth * 0.8); };
    if (tPrev) { tPrev.addEventListener('click', function () { thumbsList.scrollLeft -= step(); }); }
    if (tNext) { tNext.addEventListener('click', function () { thumbsList.scrollLeft += step(); }); }
    thumbsList.addEventListener('scroll', syncThumbArrows, { passive: true });
    window.addEventListener('resize', syncThumbArrows);
    syncThumbArrows();
  }


  /* ---------------- price / variant sync ---------------- */
  var variantField = qs('[data-atc-variant]', root);
  var priceCurrent = qs('[data-price-current]', root);
  var priceCompare = qs('[data-price-compare]', root);
  var priceSaving = qs('[data-price-saving]', root);
  var atcSubmit = qs('[data-atc-submit]', root);
  var atcLabel = qs('[data-atc-label]', root);
  var atcStock = qs('[data-atc-stock]', root);
  var offPctBadge = qs('.lf-pbadge--off', root);

  var paintPrice = function (variant, bundle) {
    if (!variant) { return; }
    if (variantField) { variantField.value = variant.id; }
    var compare = variant.compare_at_price || 0;
    /* what the product saves on its own, before any offer is layered on top */
    var baseSaving = compare > variant.price ? compare - variant.price : 0;
    if (bundle) {
      /* A bundle offer is selected, so the headline price becomes that
         bundle's discounted total and the crossed price the 2-unit total. */
      if (priceCurrent) { priceCurrent.textContent = money(bundle.total); }
      if (priceCompare) { priceCompare.textContent = money(bundle.original); priceCompare.hidden = false; }
      if (priceSaving) {
        /* The headline saving stacks the product's own discount with the
           Buy 2 saving, so it always matches what the bundle really costs
           less than the two prices combined. */
        priceSaving.textContent = 'সাশ্রয় ' + money(baseSaving + bundle.saving);
        priceSaving.hidden = false;
      }
    } else {
      if (priceCurrent) { priceCurrent.textContent = money(variant.price); }
      if (priceCompare) {
        if (compare > variant.price) {
          priceCompare.textContent = money(compare);
          priceCompare.hidden = false;
        } else {
          priceCompare.hidden = true;
        }
      }
      if (priceSaving) {
        if (baseSaving > 0) {
          priceSaving.textContent = 'সাশ্রয় ' + money(baseSaving);
          priceSaving.hidden = false;
        } else {
          priceSaving.hidden = true;
        }
      }
    }
    if (offPctBadge) {
      /* the badge stacks the product's own discount with the offer's, the
         same way the saving above does */
      var basePct = compare > 0 ? (baseSaving / compare) * 100 : 0;
      var offerPct = bundle && bundle.original > 0 ? (bundle.saving / bundle.original) * 100 : 0;
      var totalPct = basePct + offerPct;
      if (totalPct > 0) {
        offPctBadge.textContent = 'সর্বোচ্চ ' + Math.round(totalPct) + '% ছাড়';
      }
    }
    if (atcSubmit) { atcSubmit.disabled = !variant.available; }
    if (atcLabel) { atcLabel.textContent = variant.available ? 'কার্টে যোগ করুন' : 'স্টক নেই'; }
    if (atcStock) {
      atcStock.innerHTML = variant.available
        ? '<span class="lf-dot" aria-hidden="true"></span> স্টক আছে — ১ কর্মদিবসে পাঠানো হবে'
        : '<span class="lf-dot is-off" aria-hidden="true"></span> বর্তমানে পাওয়া যাচ্ছে না';
    }
    /* keep the quantity inside what this variant actually allows */
    if (readQty() > qtyCeiling(variant)) { paintQty(qtyCeiling(variant)); } else { syncQtyControls(); }

    if (variant.featured_media_id) {
      slides.forEach(function (slide, i) {
        if (String(slide.getAttribute('data-media-id')) === String(variant.featured_media_id)) { show(i); }
      });
    }
  };

  /* ---------------- quantity stepper ----------------
     Shopify reports how many units of a variant may be ordered: a quantity rule,
     tracked inventory with the "deny" policy, or nothing at all. The stepper always
     works from the live value, so any quantity the inventory allows can be chosen. */
  var MAX_QTY = 999;
  var quantityField = qs('[data-atc-quantity]', root);
  var qtyValue = qs('[data-qty-value]', root);
  var quantityWrap = qs('[data-qty]', root);
  var qtyMinus = qs('[data-qty-minus]', root);
  var qtyPlus = qs('[data-qty-plus]', root);

  var readQty = function () {
    var value = parseInt(quantityField ? quantityField.value : '1', 10);
    return isNaN(value) || value < 1 ? 1 : value;
  };

  var currentVariant = function () {
    var id = variantField ? String(variantField.value) : '';
    for (var i = 0; i < variants.length; i++) {
      if (String(variants[i].id) === id) { return variants[i]; }
    }
    return variants[0] || null;
  };

  var qtyCeiling = function (variant) {
    if (!variant) { return MAX_QTY; }
    var caps = [];
    var ruleMax = parseInt(variant.quantity_rule_max, 10);
    if (ruleMax > 0) { caps.push(ruleMax); }
    if (variant.inventory_management && String(variant.inventory_policy) !== 'continue') {
      var stock = parseInt(variant.inventory_quantity, 10);
      caps.push(isNaN(stock) || stock < 0 ? 0 : stock);
    }
    if (!caps.length) { return MAX_QTY; }
    return Math.max(0, Math.min.apply(null, caps));
  };

  var syncQtyControls = function () {
    var qty = readQty();
    var ceiling = qtyCeiling(currentVariant());
    if (qtyMinus) { qtyMinus.disabled = qty <= 1; }
    if (qtyPlus) { qtyPlus.disabled = qty >= ceiling; }
    if (quantityWrap) { quantityWrap.classList.toggle('is-at-limit', qty >= ceiling); }
  };

  var paintQty = function (qty) {
    var value = Math.max(1, Math.min(qty, qtyCeiling(currentVariant())));
    if (quantityField) { quantityField.value = String(value); }
    if (qtyValue) { qtyValue.textContent = String(value); }
    syncQtyControls();
    return value;
  };

  var tierForQty = function (qty) {
    for (var i = 0; i < offers.length; i++) {
      if ((parseInt(offers[i].getAttribute('data-quantity'), 10) || 1) === qty) { return offers[i]; }
    }
    return null;
  };

  var highlightTiers = function (offer) {
    offers.forEach(function (other) {
      var input = qs('[data-offer-input]', other);
      if (input) { input.checked = other === offer; }
      other.classList.toggle('is-selected', other === offer);
    });
  };

  var bump = function (delta) {
    var ceiling = qtyCeiling(currentVariant());
    var next = Math.max(1, Math.min(readQty() + delta, ceiling));
    if (next === readQty()) { syncQtyControls(); return; }
    var tier = tierForQty(next);
    /* a bundle discount only applies while the quantity matches that offer exactly */
    highlightTiers(tier);
    if (tier) { selectOffer(tier); return; }
    /* no bundle at this quantity: repaint the plain single-unit price so a
       stale bundle total is never left showing next to a different quantity */
    paintQty(next);
    paintPrice(currentVariant());
  };

  if (qtyMinus) { qtyMinus.addEventListener('click', function () { bump(-1); }); }
  if (qtyPlus) { qtyPlus.addEventListener('click', function () { bump(1); }); }

  /* ---------------- buy more, save more ---------------- */
  var offers = qsa('[data-offer]', root);
  var offersWrap = qs('[data-offers]', root);

  var selectedOffer = function () {
    for (var i = 0; i < offers.length; i++) {
      var input = qs('[data-offer-input]', offers[i]);
      if (input && input.checked) { return offers[i]; }
    }
    return offers[0] || null;
  };

  /* reads one value per product option out of a grouped <select> */
  var offerOptions = function (offer) {
    var select = qs('[data-offer-select]', offer);
    if (!select) { return null; }
    var groups = select.querySelectorAll('optgroup');
    if (!groups.length) { return null; }
    var out = [];
    for (var i = 0; i < groups.length; i++) {
      var opts = groups[i].querySelectorAll('option');
      var chosen = null;
      for (var j = 0; j < opts.length; j++) { if (opts[j].selected) { chosen = opts[j]; break; } }
      if (!chosen) {
        for (var k = 0; k < opts.length; k++) { if (!opts[k].disabled) { chosen = opts[k]; break; } }
      }
      out.push(chosen ? chosen.value : '');
    }
    return out;
  };

  /* applies one chosen value to every option group of a tier select */
  var applyChoice = function (select, value) {
    var groups = select.querySelectorAll('optgroup');
    for (var i = 0; i < groups.length; i++) {
      var opts = groups[i].querySelectorAll('option');
      for (var j = 0; j < opts.length; j++) {
        if (opts[j].value === value && !opts[j].disabled) { select.value = value; return; }
      }
    }
  };

  /* the money for one tier: the discount is a percentage of the ORIGINAL
     bundle total, and the saving is rounded so that
     total + saving === original to the cent (no rounding drift). */
  var tierTotals = function (offer, variant) {
    var qty = parseInt(offer.getAttribute('data-quantity'), 10) || 1;
    var off = parseFloat(offer.getAttribute('data-discount')) || 0;
    var unit = variant ? variant.price : 0;
    var original = unit * qty;
    var saving = Math.round(original * off);
    return { qty: qty, off: off, original: original, saving: saving, total: original - saving };
  };

  /* Price one card from the variant its own select currently points at.
     This only touches that card's own prices, so every card can be repriced
     at once when the variant changes without disturbing which tier is
     selected or what quantity is on show. */
  var repaintOffer = function (offer) {
    var options = offerOptions(offer);
    var variant = options ? findVariant(options) : variants[0];
    var t = tierTotals(offer, variant);
    var amount = qs('[data-offer-price]', offer);
    var was = qs('[data-offer-was]', offer);
    var save = qs('[data-offer-save]', offer);
    if (amount) { amount.textContent = money(t.total); }
    if (was) {
      if (t.off > 0) { was.textContent = money(t.original); was.hidden = false; } else { was.textContent = ''; was.hidden = true; }
    }
    if (save) { save.textContent = money(t.saving); }
    return { variant: variant, totals: t };
  };

  var syncOffer = function (offer) {
    var result = repaintOffer(offer);
    if (offersWrap) {
      offers.forEach(function (other) { other.classList.toggle('is-selected', other === offer); });
    }
    paintQty(result.totals.qty);
    return result;
  };

  /* pick a tier: price the card, force the quantity, then repaint the
     headline price so a discounted bundle is reflected at the top too. */
  var selectOffer = function (offer) {
    var result = syncOffer(offer);
    /* a tier with no discount is just the normal single-unit price */
    paintPrice(result.variant, result.totals.off > 0 ? result.totals : null);
    return result.variant;
  };

  if (offers.length) {
    offers.forEach(function (offer) {
      var input = qs('[data-offer-input]', offer);
      if (input) { input.addEventListener('change', function () { selectOffer(offer); }); }
      var select = qs('[data-offer-select]', offer);
      if (select) {
        select.addEventListener('change', function () {
          var value = select.value;
          /* mirror the choice into the other tiers so every card shows one variant */
          offers.forEach(function (other) {
            if (other === offer) { return; }
            var mirror = qs('[data-offer-select]', other);
            if (mirror) { applyChoice(mirror, value); }
          });
          if (input) { input.checked = true; }
          /* reprice the mirrored cards for the variant just chosen, so no price
             is left showing the variant that was just replaced */
          offers.forEach(function (other) {
            if (other === offer) { return; }
            repaintOffer(other);
          });
          selectOffer(offer);
        });
      }
    });
    /* the first tier is the default: set it explicitly so the state is deterministic */
    offers.forEach(function (offer, index) {
      var input = qs('[data-offer-input]', offer);
      if (input) { input.checked = index === 0; }
    });
    /* price every tier up front so no card is left blank */
    var active = selectedOffer();
    offers.forEach(function (offer) { syncOffer(offer); });
    offers.forEach(function (other) { other.classList.toggle('is-selected', other === active); });
    if (active) { selectOffer(active); } else { paintPrice(variants[0]); }
    paintQty(readQty());
  } else if (variantField && variants.length) {
    paintPrice(variants[0]);
    paintQty(readQty());
  }

  /* ---------------- countdown ---------------- */
  var timer = qs('[data-timer]', root);
  if (timer) {
    var total = parseInt(timer.getAttribute('data-timer-seconds'), 10) || 7200;
    var section = root.closest('[id^="shopify-section-"]');
    var key = 'lf_offer_countdown_' + (section ? section.id : 'default');
    var hEl = qs('[data-timer-h]', timer);
    var mEl = qs('[data-timer-m]', timer);
    var sEl = qs('[data-timer-s]', timer);
    var end = 0;
    try { end = parseInt(window.localStorage.getItem(key), 10) || 0; } catch (e) { end = 0; }
    if (!end || end <= Date.now()) {
      end = Date.now() + total * 1000;
      try { window.localStorage.setItem(key, String(end)); } catch (e) { /* storage unavailable */ }
    }
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var paintTimer = function () {
      var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      if (left <= 0) {
        end = Date.now() + total * 1000;
        try { window.localStorage.setItem(key, String(end)); } catch (e) { /* storage unavailable */ }
        left = total;
      }
      if (hEl) { hEl.textContent = pad(Math.floor(left / 3600)); }
      if (mEl) { mEl.textContent = pad(Math.floor((left % 3600) / 60)); }
      if (sEl) { sEl.textContent = pad(left % 60); }
    };
    paintTimer();
    window.setInterval(paintTimer, 1000);
  }

  /* ---------------- order progress dates ---------------- */
  var track = qs('[data-track]', root);
  if (track) {
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var fmtDate = function (d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); };
    var addDays = function (d, n) { var c2 = new Date(d.getTime()); c2.setDate(c2.getDate() + n); return c2; };
    var today = new Date();
    var dates = [
      fmtDate(today),
      fmtDate(addDays(today, 1)) + ' - ' + fmtDate(addDays(today, 3)),
      fmtDate(addDays(today, 5)) + ' - ' + fmtDate(addDays(today, 12))
    ];
    qsa('[data-track-date]', track).forEach(function (el, i) {
      el.textContent = dates[i] || '-';
    });
  }

  /* ---------------- add to cart ----------------
     Shopify's Cart API has no price field. The custom COD flow revalidates
     current variant prices on the server and applies its eligible 2% discount
     through Shopify's Admin orderCreate mutation. */
  var form = qs('.lf-atc', root);
  var message = qs('[data-atc-message]', root);
  if (form) {
    form.addEventListener('submit', function (event) {
      if (!variantField || !variantField.value) { return; }
      /* the accelerated checkout button runs its own flow straight to /checkout */
      var submitter = event.submitter;
      if (submitter && submitter.closest && submitter.closest('.shopify-payment, shopify-payment-terms, [name="checkout"]')) { return; }
      event.preventDefault();
      var variantId = variantField.value;
      var qty = parseInt(quantityField ? quantityField.value : '1', 10) || 1;
      if (atcSubmit) { atcSubmit.classList.add('is-busy'); atcSubmit.disabled = true; }
      if (message) { message.textContent = ''; message.className = 'lf-atc__message'; }

      var settle = function (ok, text) {
        if (atcSubmit) { atcSubmit.classList.remove('is-busy'); atcSubmit.disabled = false; }
        if (message) {
          message.textContent = text || '';
          message.className = 'lf-atc__message' + (ok ? ' is-ok' : ' is-error');
        }
      };

      if (window.LumaCart && typeof window.LumaCart.add === 'function') {
        window.LumaCart.add([{ id: variantId, quantity: qty }])
          .then(function () {
            settle(true, 'Added to your cart.');
            if (message) { window.setTimeout(function () { message.textContent = ''; }, 4000); }
          })
          .catch(function () { settle(false, 'We could not add that item. Please try again.'); });
        return;
      }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: variantId, quantity: qty }] })
      })
        .then(function (r) {
          if (!r.ok) { throw new Error('add failed'); }
          return fetch('/cart.js').then(function (c3) { return c3.json(); });
        })
        .then(function (cart) {
          var count = qs('[data-cart-count]');
          if (count) { count.textContent = String(cart.item_count); }
          document.body.classList.add('drawer-open');
          var drawer = qs('[data-cart-drawer]');
          if (drawer) { drawer.setAttribute('aria-hidden', 'false'); }
          settle(true, 'Added to your cart.');
        })
        .catch(function () { settle(false, 'We could not add that item. Please try again.'); });
    });
  }
}());
