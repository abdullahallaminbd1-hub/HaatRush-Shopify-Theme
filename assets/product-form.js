/**
 * HaatRush Theme - Product Form & Detail Page JavaScript
 * Handles product gallery, variant management, quantity selectors,
 * Bangladesh location cascade for embedded order form, delivery charge calculation,
 * and Cash on Delivery (COD) quick checkout.
 */

(function () {
  'use strict';

  // State
  let currentQuantity = 1;
  let unitPrice = 0;
  let deliveryCharge = 70;

  // Initialize Product Page logic
  function initProductPage() {
    initGallery();
    initQuantityControls();
    initEmbeddedOrderForm();
    initScrollToOrder();
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
    const orderQtyInput = document.getElementById('order-summary-qty') || document.querySelector('.order-form [name="quantity"]');

    // Parse product unit price
    const priceEl = document.getElementById('productPriceDisplay') || document.querySelector('.product-price');
    if (priceEl) {
      const match = priceEl.textContent.replace(/[^0-9]/g, '');
      if (match) {
        unitPrice = parseInt(match, 10);
      }
    }

    window.updateQuantity = function (delta) {
      let val = (parseInt(qtyInput ? qtyInput.value : currentQuantity, 10) || 1) + delta;
      if (val < 1) val = 1;
      if (val > 99) val = 99;

      currentQuantity = val;

      if (qtyInput) qtyInput.value = val;
      if (orderQtyInput) orderQtyInput.value = val;

      const orderSummaryQtyDisplay = document.getElementById('order-product-qty-display');
      if (orderSummaryQtyDisplay) orderSummaryQtyDisplay.textContent = val;

      updateOrderSummaryTotals();
    };

    if (qtyInput) {
      qtyInput.addEventListener('change', function () {
        let val = parseInt(this.value, 10) || 1;
        if (val < 1) val = 1;
        currentQuantity = val;
        this.value = val;
        if (orderQtyInput) orderQtyInput.value = val;
        updateOrderSummaryTotals();
      });
    }
  }

  // --- 3. Embedded Order Form & Location Cascade ---
  function initEmbeddedOrderForm() {
    const divSelect = document.getElementById('order-division');
    const distSelect = document.getElementById('order-district');
    const upazilaSelect = document.getElementById('order-upazila');
    const deliveryRadios = document.querySelectorAll('input[name="delivery_area"], input[name="delivery_option"]');

    if (!divSelect) return;

    // Use BD_LOCATIONS if available
    const locations = typeof BD_LOCATIONS !== 'undefined' ? BD_LOCATIONS : null;

    if (locations) {
      // Ensure Division options exist
      if (divSelect.options.length <= 1) {
        divSelect.innerHTML = '<option value="">বিভাগ নির্বাচন করুন</option>';
        Object.keys(locations).forEach(div => {
          const opt = document.createElement('option');
          opt.value = div;
          opt.textContent = div;
          divSelect.appendChild(opt);
        });
      }

      // If District is a select dropdown
      if (distSelect && distSelect.tagName === 'SELECT') {
        divSelect.addEventListener('change', function () {
          const selectedDiv = this.value;
          distSelect.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
          if (upazilaSelect && upazilaSelect.tagName === 'SELECT') {
            upazilaSelect.innerHTML = '<option value="">উপজেলা / থানা নির্বাচন করুন</option>';
            upazilaSelect.disabled = true;
          }

          if (selectedDiv && locations[selectedDiv]) {
            distSelect.disabled = false;
            Object.keys(locations[selectedDiv]).forEach(dist => {
              const opt = document.createElement('option');
              opt.value = dist;
              opt.textContent = dist;
              distSelect.appendChild(opt);
            });
          } else {
            distSelect.disabled = true;
          }

          calculateDeliveryCharge();
        });

        distSelect.addEventListener('change', function () {
          const selectedDiv = divSelect.value;
          const selectedDist = this.value;

          if (upazilaSelect && upazilaSelect.tagName === 'SELECT') {
            upazilaSelect.innerHTML = '<option value="">উপজেলা / থানা নির্বাচন করুন</option>';
            if (selectedDiv && selectedDist && locations[selectedDiv] && locations[selectedDiv][selectedDist]) {
              upazilaSelect.disabled = false;
              locations[selectedDiv][selectedDist].forEach(upa => {
                const opt = document.createElement('option');
                opt.value = upa;
                opt.textContent = upa;
                upazilaSelect.appendChild(opt);
              });
            } else {
              upazilaSelect.disabled = true;
            }
          }

          calculateDeliveryCharge();
        });
      }
    }

    // Radio button changes for delivery area
    deliveryRadios.forEach(radio => {
      radio.addEventListener('change', function () {
        if (this.checked) {
          deliveryCharge = parseInt(this.value, 10) || (this.id.includes('inside') ? 70 : 130);
          updateOrderSummaryTotals();
        }
      });
    });

    // Form submission
    const orderForm = document.getElementById('embeddedOrderForm') || document.querySelector('.order-form form');
    if (orderForm) {
      orderForm.addEventListener('submit', handleOrderSubmit);
    }
  }

  // Delivery charge calculation
  function calculateDeliveryCharge() {
    const divSelect = document.getElementById('order-division');
    const distSelect = document.getElementById('order-district');

    if (!divSelect || !distSelect) return;

    const div = divSelect.value.trim();
    const dist = distSelect.value.trim();

    if (div === 'ঢাকা' && dist === 'ঢাকা') {
      deliveryCharge = 70;
      selectDeliveryRadio('inside');
    } else if (div || dist) {
      deliveryCharge = 130;
      selectDeliveryRadio('outside');
    }

    updateOrderSummaryTotals();
  }

  function selectDeliveryRadio(type) {
    const insideRadio = document.getElementById('delivery-inside') || document.querySelector('input[value="70"]');
    const outsideRadio = document.getElementById('delivery-outside') || document.querySelector('input[value="130"]');

    if (type === 'inside' && insideRadio) {
      insideRadio.checked = true;
    } else if (type === 'outside' && outsideRadio) {
      outsideRadio.checked = true;
    }
  }

  // Update order summary numbers
  function updateOrderSummaryTotals() {
    const subtotal = unitPrice * currentQuantity;
    const grandTotal = subtotal + deliveryCharge;

    const subtotalEl = document.getElementById('order-subtotal-price') || document.querySelector('.order-summary__subtotal');
    const deliveryEl = document.getElementById('order-delivery-price') || document.querySelector('.order-summary__delivery');
    const totalEl = document.getElementById('order-grand-total-price') || document.querySelector('.order-summary__total');

    if (subtotalEl) subtotalEl.textContent = '৳' + subtotal.toLocaleString('bn-BD');
    if (deliveryEl) deliveryEl.textContent = '৳' + deliveryCharge.toLocaleString('bn-BD');
    if (totalEl) totalEl.textContent = '৳' + grandTotal.toLocaleString('bn-BD');
  }

  // Validate and submit COD order
  function handleOrderSubmit(e) {
    e.preventDefault();

    const nameInput = document.getElementById('order-name');
    const phoneInput = document.getElementById('order-phone');
    const divInput = document.getElementById('order-division');
    const distInput = document.getElementById('order-district');
    const addressInput = document.getElementById('order-address');

    if (!nameInput || !nameInput.value.trim()) {
      alert('অনুগ্রহ করে আপনার নাম লিখুন।');
      nameInput && nameInput.focus();
      return;
    }

    if (!phoneInput || !isValidBdPhone(phoneInput.value.trim())) {
      alert('অনুগ্রহ করে একটি সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন (যেমন: 01XXXXXXXXX)।');
      phoneInput && phoneInput.focus();
      return;
    }

    if (!divInput || !divInput.value.trim()) {
      alert('অনুগ্রহ করে আপনার বিভাগ নির্বাচন করুন।');
      divInput && divInput.focus();
      return;
    }

    if (!distInput || !distInput.value.trim()) {
      alert('অনুগ্রহ করে আপনার জেলা নির্বাচন বা লিখুন।');
      distInput && distInput.focus();
      return;
    }

    if (!addressInput || !addressInput.value.trim()) {
      alert('অনুগ্রহ করে সম্পূর্ণ ঠিকানা লিখুন।');
      addressInput && addressInput.focus();
      return;
    }

    const submitBtn = document.getElementById('order-submit-btn') || document.querySelector('.order-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'অর্ডার প্রসেস হচ্ছে...';
    }

    // Variant ID for product
    const productMain = document.getElementById('productMainSection');
    const variantId = productMain ? productMain.dataset.variantId : null;

    if (variantId) {
      // Add to cart and redirect to order success modal
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(variantId, 10),
          quantity: currentQuantity,
          properties: {
            'Customer Name': nameInput.value.trim(),
            'Customer Phone': phoneInput.value.trim(),
            'Delivery Division': divInput.value.trim(),
            'Delivery District': distInput.value.trim(),
            'Full Address': addressInput.value.trim(),
            'Delivery Charge': '৳' + deliveryCharge,
            'Payment Method': 'Cash on Delivery (COD)'
          }
        })
      })
      .then(res => res.json())
      .then(() => {
        showSuccessModal();
      })
      .catch(() => {
        showSuccessModal();
      });
    } else {
      showSuccessModal();
    }
  }

  function showSuccessModal() {
    const modal = document.getElementById('orderSuccessModal');
    if (modal) {
      modal.style.display = 'flex';
    } else {
      alert('ধন্যবাদ! আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।');
      window.location.href = '/';
    }
  }

  function isValidBdPhone(phone) {
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    return /^(?:88)?01[3-9]\d{8}$/.test(cleaned);
  }

  // --- 4. Smooth Scroll to Order Form ---
  function initScrollToOrder() {
    window.scrollToOrderForm = function () {
      const target = document.getElementById('orderFormSection') || document.getElementById('productDescription');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addProductToCart = function (variantId) {
      const qty = currentQuantity || 1;
      if (typeof addToCart === 'function') {
        addToCart(variantId, qty);
      } else {
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: qty })
        })
        .then(r => r.json())
        .then(() => {
          if (typeof updateCartCount === 'function') updateCartCount();
          alert('পণ্যটি সফলভাবে কার্টে যোগ করা হয়েছে!');
        })
        .catch(() => {
          window.location.href = '/cart';
        });
      }
    };
  }

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductPage);
  } else {
    initProductPage();
  }
})();
