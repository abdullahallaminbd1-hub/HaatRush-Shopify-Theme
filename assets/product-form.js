/**
 * HaatRush Theme - Product Form & Detail Page JavaScript
 * Handles product gallery, variant selection, quantity, and Shopify cart actions.
 */

(function () {
  'use strict';

  // State
  let currentQuantity = 1;

  // Initialize Product Page logic
  function initProductPage() {
    initGallery();
    initQuantityControls();
    initVariantSelector();
    initCartActions();
  }

  // --- 1. Product Image Gallery ---
  function initGallery() {
    const mainImg = document.getElementById('product-main-image');
    const thumbBtns = document.querySelectorAll('.product-gallery__thumb');

    if (!mainImg || !thumbBtns.length) return;

    window.selectProductImage = function (thumb) {
      thumbBtns.forEach(b => b.classList.remove('is-active', 'active'));
      thumb.classList.add('is-active', 'active');

      const src = thumb.dataset.imageSrc || thumb.dataset.image;
      if (src) {
        mainImg.src = src;
      }
    };

    thumbBtns.forEach(thumb => {
      thumb.addEventListener('click', function () {
        window.selectProductImage(this);
      });
    });
  }

  // --- 2. Quantity Controls ---
  function initQuantityControls() {
    const qtyInput = document.getElementById('product-quantity-input') || document.getElementById('product-quantity');

    window.updateQuantity = function (delta) {
      let val = (parseInt(qtyInput ? qtyInput.value : currentQuantity, 10) || 1) + delta;
      if (val < 1) val = 1;
      if (val > 99) val = 99;

      currentQuantity = val;
      if (qtyInput) qtyInput.value = val;
    };

    if (qtyInput) {
      qtyInput.addEventListener('change', function () {
        let val = parseInt(this.value, 10) || 1;
        val = Math.max(1, Math.min(99, val));
        currentQuantity = val;
        this.value = val;
      });
    }
  }

  function initVariantSelector() {
    const selector = document.getElementById('product-variant-select');
    const productMain = document.getElementById('productMainSection');
    if (!selector || !productMain) return;

    selector.addEventListener('change', function () {
      const option = selector.options[selector.selectedIndex];
      if (!option) return;

      productMain.dataset.variantId = option.value;
      productMain.dataset.priceCents = option.dataset.priceCents || '';
      const priceCents = Number(option.dataset.priceCents);
      const comparePriceCents = Number(option.dataset.comparePriceCents);
      const hasDiscount = comparePriceCents > priceCents;

      const price = document.getElementById('productPriceDisplay');
      const comparePrice = document.getElementById('productComparePriceDisplay');
      if (price) {
        price.textContent = option.dataset.price || '';
        price.dataset.priceCents = option.dataset.priceCents || '';
      }
      if (comparePrice) {
        comparePrice.textContent = hasDiscount ? option.dataset.comparePrice || '' : '';
        comparePrice.hidden = !hasDiscount;
      }

      productMain.querySelectorAll('[data-discount-badge]').forEach(function (badge) {
        badge.hidden = !hasDiscount;
        if (hasDiscount) {
          badge.textContent = '-' + Math.round((comparePriceCents - priceCents) * 100 / comparePriceCents) + '%';
        }
      });
    });
  }

  function initCartActions() {
    window.addProductToCart = function (variantId, buyNow) {
      const qtyInput = document.getElementById('product-quantity-input');
      const qty = Math.max(1, Math.min(99, parseInt(qtyInput && qtyInput.value, 10) || currentQuantity || 1));
      if (!variantId || typeof addToCart !== 'function') return;

      addToCart(variantId, qty)
        .then(function () {
          if (buyNow) {
            const productMain = document.getElementById('productMainSection');
            window.location.assign(productMain && productMain.dataset.checkoutUrl || '/pages/checkout');
          } else if (typeof window.openCartDrawer === 'function') {
            window.openCartDrawer();
          }
        })
        .catch(function (error) {
          console.error('Unable to add product to cart:', error);
        });
    };
  }

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductPage);
  } else {
    initProductPage();
  }
})();
