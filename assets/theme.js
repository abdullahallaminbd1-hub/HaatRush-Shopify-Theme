(() => {
  const root = window.Shopify?.routes?.root || '/';
  const drawer = document.querySelector('#CartDrawer');
  const backdrop = document.querySelector('.drawer-backdrop');
  const itemsContainer = document.querySelector('[data-cart-items]');
  const currencyFormatter = new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 });

  const money = (cents) => `৳${currencyFormatter.format(Math.round(cents / 100))}`;

  const updateCartBadges = (cart) => {
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = cart.item_count;
      element.setAttribute('aria-label', `কার্ট, ${cart.item_count} টি পণ্য`);
    });
    const drawerCount = document.querySelector('[data-drawer-count]');
    if (drawerCount) drawerCount.textContent = cart.item_count;
    const total = document.querySelector('[data-cart-total]');
    if (total) total.textContent = money(cart.total_price);
    const checkoutLink = document.querySelector('.drawer-checkout');
    if (checkoutLink) checkoutLink.setAttribute('aria-disabled', String(cart.item_count === 0));
  };

  const renderCart = (cart) => {
    if (!itemsContainer) return;
    itemsContainer.replaceChildren();
    if (!cart.items.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.textContent = 'আপনার কার্টে এখনো কোনো পণ্য নেই।';
      itemsContainer.append(empty);
      updateCartBadges(cart);
      return;
    }
    cart.items.forEach((item, index) => {
      const line = index + 1;
      const row = document.createElement('div');
      row.className = 'drawer-item';
      row.dataset.line = line;

      const imageLink = document.createElement('a');
      imageLink.className = 'drawer-item__image';
      imageLink.href = item.url;
      const imageUrl = typeof item.featured_image === 'string' ? item.featured_image : item.featured_image?.url;
      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = item.product_title;
        image.loading = 'lazy';
        imageLink.append(image);
      }

      const info = document.createElement('div');
      info.className = 'drawer-item__info';
      const title = document.createElement('a');
      title.href = item.url;
      title.textContent = item.product_title;
      const price = document.createElement('span');
      price.textContent = money(item.final_line_price);
      const quantity = document.createElement('div');
      quantity.className = 'quantity-control';
      const decrement = document.createElement('button');
      decrement.type = 'button';
      decrement.dataset.quantityChange = '-1';
      decrement.dataset.line = line;
      decrement.setAttribute('aria-label', 'পরিমাণ কমান');
      decrement.textContent = '−';
      const amount = document.createElement('span');
      amount.textContent = item.quantity;
      const increment = document.createElement('button');
      increment.type = 'button';
      increment.dataset.quantityChange = '1';
      increment.dataset.line = line;
      increment.setAttribute('aria-label', 'পরিমাণ বাড়ান');
      increment.textContent = '+';
      quantity.append(decrement, amount, increment);
      info.append(title, price, quantity);

      const remove = document.createElement('button');
      remove.className = 'remove-line';
      remove.type = 'button';
      remove.dataset.removeLine = line;
      remove.setAttribute('aria-label', 'পণ্য সরান');
      remove.textContent = '×';
      row.append(imageLink, info, remove);
      itemsContainer.append(row);
    });
    updateCartBadges(cart);
  };

  const fetchCart = async () => {
    const response = await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('কার্টের তথ্য লোড করা যায়নি।');
    return response.json();
  };

  const changeLine = async (line, quantity) => {
    const response = await fetch(`${root}cart/change.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line, quantity })
    });
    const cart = await response.json();
    if (!response.ok) throw new Error(cart.description || 'কার্ট আপডেট করা যায়নি।');
    renderCart(cart);
  };

  const showDrawer = async () => {
    if (!drawer || !backdrop) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-open');
    document.body.classList.add('drawer-is-open');
    try {
      renderCart(await fetchCart());
    } catch (error) {
      showCartError(error.message);
    }
    drawer.querySelector('button')?.focus();
  };

  const hideDrawer = () => {
    if (!drawer || !backdrop) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('drawer-is-open');
  };

  const showCartError = (message) => {
    let status = document.querySelector('[data-cart-error]');
    if (!status && drawer) {
      status = document.createElement('p');
      status.dataset.cartError = '';
      status.className = 'cart-error';
      status.setAttribute('role', 'alert');
      drawer.querySelector('.cart-drawer__header')?.after(status);
    }
    if (status) status.textContent = message;
  };

  document.addEventListener('click', async (event) => {
    const open = event.target.closest('[data-cart-open]');
    if (open) {
      event.preventDefault();
      await showDrawer();
      return;
    }
    if (event.target.closest('[data-cart-close]')) {
      event.preventDefault();
      hideDrawer();
      return;
    }
    const change = event.target.closest('[data-quantity-change]');
    if (change) {
      const line = Number(change.dataset.line);
      try {
        const cart = await fetchCart();
        const item = cart.items[line - 1];
        if (item) await changeLine(line, item.quantity + Number(change.dataset.quantityChange));
      } catch (error) {
        showCartError(error.message);
      }
      return;
    }
    const remove = event.target.closest('[data-remove-line]');
    if (remove) {
      try {
        await changeLine(Number(remove.dataset.removeLine), 0);
      } catch (error) {
        showCartError(error.message);
      }
      return;
    }
    const step = event.target.closest('[data-qty-step]');
    if (step) {
      const input = step.closest('[data-quantity-picker]')?.querySelector('input[name="quantity"]');
      if (input) input.value = Math.max(1, Number(input.value || 1) + Number(step.dataset.qtyStep));
    }
    const thumb = event.target.closest('[data-gallery-image]');
    if (thumb) {
      const mainImage = document.querySelector('.product-main-image');
      if (mainImage) mainImage.src = thumb.dataset.galleryImage;
      document.querySelectorAll('.gallery-thumb').forEach((button) => button.classList.toggle('is-active', button === thumb));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideDrawer();
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-cart-add-form], #ProductForm');
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[data-product-status]');
    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'যোগ হচ্ছে…';
    }
    try {
      const url = new URL(form.action, window.location.origin);
      url.pathname = `${url.pathname.replace(/\/$/, '')}.js`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.description || 'পণ্যটি কার্টে যোগ করা যায়নি।');
      renderCart(await fetchCart());
      if (status) status.textContent = 'পণ্যটি কার্টে যোগ হয়েছে।';
      await showDrawer();
    } catch (error) {
      if (status) status.textContent = error.message;
      else showCartError(error.message);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'কার্টে যোগ করুন';
      }
    }
  });

  const variantSelect = document.querySelector('[data-variant-select]');
  if (variantSelect) {
    variantSelect.addEventListener('change', () => {
      const option = variantSelect.selectedOptions[0];
      const price = document.querySelector('[data-product-price]');
      const buttons = document.querySelectorAll('#ProductForm button[name="add"]');
      if (price && option) {
        price.replaceChildren();
        const current = document.createElement('strong');
        current.textContent = money(Number(option.dataset.price));
        price.append(current);
        const compare = Number(option.dataset.compare);
        if (compare > Number(option.dataset.price)) {
          const oldPrice = document.createElement('s');
          oldPrice.textContent = money(compare);
          price.append(oldPrice);
          const discount = document.createElement('span');
          discount.className = 'discount-badge';
          discount.textContent = `-${Math.round(((compare - Number(option.dataset.price)) / compare) * 100)}%`;
          price.append(discount);
        }
        price.classList.toggle('price--sale', compare > Number(option.dataset.price));
      }
      buttons.forEach((button) => { button.disabled = option?.dataset.available !== 'true'; });
      const stockLabel = document.querySelector('.stock-label');
      if (stockLabel && option) {
        const available = option.dataset.available === 'true';
        stockLabel.classList.toggle('stock-label--out', !available);
        stockLabel.replaceChildren();
        if (available) {
          const indicator = document.createElement('i');
          stockLabel.append(indicator, document.createTextNode(' স্টকে আছে'));
        } else {
          stockLabel.textContent = 'স্টক শেষ';
        }
      }
    });
  }

  const locationData = {
    Barishal: ['বরগুনা', 'বরিশাল', 'ভোলা', 'ঝালকাঠি', 'পটুয়াখালী', 'পিরোজপুর'],
    Chattogram: ['বান্দরবান', 'ব্রাহ্মণবাড়িয়া', 'চাঁদপুর', 'চট্টগ্রাম', 'কুমিল্লা', 'কক্সবাজার', 'ফেনী', 'খাগড়াছড়ি', 'লক্ষ্মীপুর', 'নোয়াখালী', 'রাঙ্গামাটি'],
    Dhaka: ['ঢাকা', 'ফরিদপুর', 'গাজীপুর', 'গোপালগঞ্জ', 'কিশোরগঞ্জ', 'মাদারীপুর', 'মানিকগঞ্জ', 'মুন্সিগঞ্জ', 'নারায়ণগঞ্জ', 'নরসিংদী', 'রাজবাড়ী', 'শরীয়তপুর', 'টাঙ্গাইল'],
    Khulna: ['বাগেরহাট', 'চুয়াডাঙ্গা', 'যশোর', 'ঝিনাইদহ', 'খুলনা', 'কুষ্টিয়া', 'মাগুরা', 'মেহেরপুর', 'নড়াইল', 'সাতক্ষীরা'],
    Mymensingh: ['জামালপুর', 'ময়মনসিংহ', 'নেত্রকোণা', 'শেরপুর'],
    Rajshahi: ['বগুড়া', 'জয়পুরহাট', 'নওগাঁ', 'নাটোর', 'চাঁপাইনবাবগঞ্জ', 'পাবনা', 'রাজশাহী', 'সিরাজগঞ্জ'],
    Rangpur: ['দিনাজপুর', 'গাইবান্ধা', 'কুড়িগ্রাম', 'লালমনিরহাট', 'নীলফামারী', 'পঞ্চগড়', 'রংপুর', 'ঠাকুরগাঁও'],
    Sylhet: ['হবিগঞ্জ', 'মৌলভীবাজার', 'সুনামগঞ্জ', 'সিলেট']
  };
  const divisionNames = {
    Barishal: 'বরিশাল',
    Chattogram: 'চট্টগ্রাম',
    Dhaka: 'ঢাকা',
    Khulna: 'খুলনা',
    Mymensingh: 'ময়মনসিংহ',
    Rajshahi: 'রাজশাহী',
    Rangpur: 'রংপুর',
    Sylhet: 'সিলেট'
  };
  const checkoutPage = document.querySelector('[data-checkout-page]');
  const divisionSelect = document.querySelector('[data-division]');
  const districtSelect = document.querySelector('[data-district]');
  if (checkoutPage && divisionSelect && districtSelect) {
    Object.entries(divisionNames).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      divisionSelect.append(option);
    });
    divisionSelect.addEventListener('change', () => {
      districtSelect.replaceChildren(new Option('জেলা নির্বাচন করুন', ''));
      districtSelect.disabled = !divisionSelect.value;
      (locationData[divisionSelect.value] || []).forEach((district) => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.append(option);
      });
      updateDelivery();
    });
    districtSelect.addEventListener('change', updateDelivery);

    const updateDelivery = () => {
      const chargeElement = document.querySelector('[data-delivery-charge]');
      const totalElement = document.querySelector('[data-checkout-total]');
      const total = Number(checkoutPage.dataset.cartTotal);
      if (!districtSelect.value) {
        chargeElement.textContent = 'জেলা নির্বাচন করুন';
        totalElement.textContent = '—';
        return;
      }
      const charge = divisionSelect.value === 'Dhaka' && districtSelect.value === 'ঢাকা' ? 70 : 130;
      chargeElement.textContent = money(charge * 100);
      totalElement.textContent = money(total + charge * 100);
    };

    document.querySelector('[data-checkout-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const fields = new FormData(form);
      const checkoutUrl = new URL(`${root}checkout`, window.location.origin);
      const name = String(fields.get('name') || '').trim();
      checkoutUrl.searchParams.set('checkout[shipping_address][first_name]', name);
      checkoutUrl.searchParams.set('checkout[shipping_address][address1]', String(fields.get('address') || '').trim());
      checkoutUrl.searchParams.set('checkout[shipping_address][address2]', String(fields.get('upazila') || '').trim());
      checkoutUrl.searchParams.set('checkout[shipping_address][city]', String(fields.get('district') || ''));
      checkoutUrl.searchParams.set('checkout[shipping_address][province]', String(fields.get('division') || ''));
      checkoutUrl.searchParams.set('checkout[shipping_address][country]', 'Bangladesh');
      checkoutUrl.searchParams.set('checkout[shipping_address][phone]', String(fields.get('phone') || '').trim());
      window.location.assign(checkoutUrl.toString());
    });
  }
})();
