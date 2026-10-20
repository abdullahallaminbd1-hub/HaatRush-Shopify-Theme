/**
 * HaatRush - Main Theme JavaScript
 * Complete Bangladesh e-commerce theme functionality
 */

/* ============================================
   BANGLADESH LOCATION DATA
   ============================================ */

const BD_LOCATIONS = {
  "ঢাকা": {
    "ঢাকা": ["ধানমন্ডি", "গুলশান", "মিরপুর", "মোহাম্মদপুর", "তেজগাঁও", "উত্তরা", "বনানী", "রামপুরা", "বাড্ডা", "খিলগাঁও", "শাহবাগ", "লালবাগ", "হাজারীবাগ", "কমলাপুর", "যাত্রাবাড়ী", "ডেমরা", "সূত্রাপুর", "ওয়ারী", "শ্যামপুর", "কদমতলী", "দক্ষিণখান", "পল্লবী", "তুরাগ", "সাভার", "কেরানীগঞ্জ", "নবাবগঞ্জ", "দোহার"],
    "গাজীপুর": ["গাজীপুর সদর", "কালীগঞ্জ", "কাপাসিয়া", "শ্রীপুর", "কালিয়াকৈর", "টঙ্গী"],
    "নারায়ণগঞ্জ": ["নারায়ণগঞ্জ সদর", "আড়াইহাজার", "বন্দর", "রূপগঞ্জ", "সোনারগাঁও"],
    "মানিকগঞ্জ": ["মানিকগঞ্জ সদর", "সিংগাইর", "শিবালয়", "সাটুরিয়া", "হরিরামপুর", "ঘিওর", "দৌলতপুর"],
    "মুন্সিগঞ্জ": ["মুন্সিগঞ্জ সদর", "শ্রীনগর", "সিরাজদিখান", "লৌহজং", "টঙ্গীবাড়ি", "গজারিয়া"],
    "নরসিংদী": ["নরসিংদী সদর", "বেলাবো", "মনোহরদী", "পলাশ", "রায়পুরা", "শিবপুর"],
    "টাঙ্গাইল": ["টাঙ্গাইল সদর", "মধুপুর", "ঘাটাইল", "কালিহাতি", "নাগরপুর", "মির্জাপুর", "গোপালপুর", "বাসাইল", "ভূঞাপুর", "দেলদুয়ার", "সখিপুর", "ধনবাড়ী"],
    "কিশোরগঞ্জ": ["কিশোরগঞ্জ সদর", "ভৈরব", "হোসেনপুর", "পাকুন্দিয়া", "কুলিয়ারচর", "বাজিতপুর", "কটিয়াদী", "তাড়াইল", "ইটনা", "মিঠামইন", "অষ্টগ্রাম", "নিকলী", "করিমগঞ্জ"],
    "মাদারীপুর": ["মাদারীপুর সদর", "কালকিনি", "রাজৈর", "শিবচর"],
    "শরীয়তপুর": ["শরীয়তপুর সদর", "গোসাইরহাট", "নড়িয়া", "জাজিরা", "ভেদরগঞ্জ", "ডামুড্যা"],
    "রাজবাড়ী": ["রাজবাড়ী সদর", "গোয়ালন্দ", "পাংশা", "বালিয়াকান্দি", "কালুখালী"],
    "ফরিদপুর": ["ফরিদপুর সদর", "আলফাডাঙ্গা", "বোয়ালমারী", "সদরপুর", "নগরকান্দা", "ভাঙ্গা", "চরভদ্রাসন", "মধুখালী", "সালথা"],
    "গোপালগঞ্জ": ["গোপালগঞ্জ সদর", "কাশিয়ানী", "টুঙ্গিপাড়া", "কোটালীপাড়া", "মুকসুদপুর"]
  },
  "চট্টগ্রাম": {
    "চট্টগ্রাম": ["চট্টগ্রাম সদর", "পটিয়া", "সীতাকুন্ড", "মীরসরাই", "সন্দ্বীপ", "বাঁশখালী", "আনোয়ারা", "চন্দনাইশ", "সাতকানিয়া", "লোহাগাড়া", "হাটহাজারী", "রাউজান", "ফটিকছড়ি", "রাঙ্গুনিয়া", "বোয়ালখালী"],
    "কক্সবাজার": ["কক্সবাজার সদর", "রামু", "চকরিয়া", "উখিয়া", "টেকনাফ", "মহেশখালী", "কুতুবদিয়া", "পেকুয়া"],
    "কুমিল্লা": ["কুমিল্লা সদর", "দেবিদ্বার", "বরুড়া", "চান্দিনা", "চৌদ্দগ্রাম", "দাউদকান্দি", "হোমনা", "লাকসাম", "মুরাদনগর", "নাঙ্গলকোট", "ব্রাহ্মণপাড়া", "মেঘনা", "মনোহরগঞ্জ", "লালমাই", "বুড়িচং", "তিতাস"],
    "ফেনী": ["ফেনী সদর", "ছাগলনাইয়া", "সোনাগাজী", "ফুলগাজী", "পরশুরাম", "দাগনভূঞা"],
    "লক্ষ্মীপুর": ["লক্ষ্মীপুর সদর", "রায়পুর", "রামগঞ্জ", "রামগতি", "কমলনগর"],
    "নোয়াখালী": ["নোয়াখালী সদর", "বেগমগঞ্জ", "চাটখিল", "কোম্পানীগঞ্জ", "হাতিয়া", "সেনবাগ", "সুবর্ণচর", "কবিরহাট", "সোনাইমুড়ী"],
    "ব্রাহ্মণবাড়িয়া": ["ব্রাহ্মণবাড়িয়া সদর", "আশুগঞ্জ", "নবীনগর", "বাঞ্ছারামপুর", "কসবা", "আখাউড়া", "সরাইল", "নাসিরনগর", "বিজয়নগর"],
    "চাঁদপুর": ["চাঁদপুর সদর", "হাইমচর", "মতলব উত্তর", "মতলব দক্ষিণ", "ফরিদগঞ্জ", "হাজীগঞ্জ", "কচুয়া", "শাহরাস্তি"],
    "রাঙ্গামাটি": ["রাঙ্গামাটি সদর", "কাপ্তাই", "কাউখালী", "বাঘাইছড়ি", "বরকল", "লংগদু", "রাজস্থলী", "বিলাইছড়ি", "জুরাছড়ি", "নানিয়ারচর"],
    "খাগড়াছড়ি": ["খাগড়াছড়ি সদর", "দীঘিনালা", "পানছড়ি", "লক্ষ্মীছড়ি", "মহালছড়ি", "মানিকছড়ি", "রামগড়", "মাটিরাঙ্গা", "গুইমারা"],
    "বান্দরবান": ["বান্দরবান সদর", "রুমা", "থানচি", "লামা", "আলীকদম", "নাইক্ষ্যংছড়ি", "রোয়াংছড়ি"]
  },
  "রাজশাহী": {
    "রাজশাহী": ["রাজশাহী সদর", "পবা", "গোদাগাড়ী", "তানোর", "বাগমারা", "চারঘাট", "দুর্গাপুর", "পুঠিয়া", "বাঘা", "মোহনপুর"],
    "নাটোর": ["নাটোর সদর", "সিংড়া", "বড়াইগ্রাম", "বাগাতিপাড়া", "লালপুর", "গুরুদাসপুর", "নলডাঙ্গা"],
    "নওগাঁ": ["নওগাঁ সদর", "মহাদেবপুর", "বদলগাছি", "পত্নীতলা", "ধামইরহাট", "মান্দা", "নিয়ামতপুর", "আত্রাই", "রাণীনগর", "পোরশা", "সাপাহার"],
    "চাঁপাইনবাবগঞ্জ": ["চাঁপাইনবাবগঞ্জ সদর", "শিবগঞ্জ", "গোমস্তাপুর", "নাচোল", "ভোলাহাট"],
    "পাবনা": ["পাবনা সদর", "ঈশ্বরদী", "বেড়া", "সুজানগর", "চাটমোহর", "ভাঙ্গুড়া", "ফরিদপুর", "আটঘরিয়া", "সাঁথিয়া"],
    "সিরাজগঞ্জ": ["সিরাজগঞ্জ সদর", "বেলকুচি", "চৌহালী", "কামারখন্দ", "কাজীপুর", "রায়গঞ্জ", "শাহজাদপুর", "তাড়াশ", "উল্লাপাড়া"],
    "বগুড়া": ["বগুড়া সদর", "শাজাহানপুর", "শেরপুর", "ননদীগ্রাম", "কাহালু", "আদমদীঘি", "দুপচাঁচিয়া", "গাবতলী", "সারিয়াকান্দি", "সোনাতলা", "ধুনট", "শিবগঞ্জ"],
    "জয়পুরহাট": ["জয়পুরহাট সদর", "আক্কেলপুর", "কালাই", "ক্ষেতলাল", "পাঁচবিবি"]
  },
  "খুলনা": {
    "খুলনা": ["খুলনা সদর", "দৌলতপুর", "খালিশপুর", "সোনাডাঙ্গা", "কয়রা", "পাইকগাছা", "তেরখাদা", "দাকোপ", "ডুমুরিয়া", "ফুলতলা", "বটিয়াঘাটা", "দীঘলিয়া", "রূপসা"],
    "সাতক্ষীরা": ["সাতক্ষীরা সদর", "কলারোয়া", "তালা", "শ্যামনগর", "আশাশুনি", "দেবহাটা", "কালীগঞ্জ"],
    "যশোর": ["যশোর সদর", "মণিরামপুর", "অভয়নগর", "বাঘারপাড়া", "চৌগাছা", "ঝিকরগাছা", "কেশবপুর", "শার্শা"],
    "বাগেরহাট": ["বাগেরহাট সদর", "চিতলমারী", "ফকিরহাট", "কচুয়া", "মোল্লাহাট", "মোরেলগঞ্জ", "রামপাল", "শরণখোলা", "মংলা"],
    "ঝিনাইদহ": ["ঝিনাইদহ সদর", "কালীগঞ্জ", "কোটচাঁদপুর", "মহেশপুর", "শৈলকুপা", "হরিণাকুন্ডু"],
    "কুষ্টিয়া": ["কুষ্টিয়া সদর", "কুমারখালী", "খোকসা", "মিরপুর", "ভেড়ামারা", "দৌলতপুর"],
    "মাগুরা": ["মাগুরা সদর", "মোহাম্মদপুর", "শালিখা", "শ্রীপুর"],
    "মেহেরপুর": ["মেহেরপুর সদর", "মুজিবনগর", "গাংনী"],
    "নড়াইল": ["নড়াইল সদর", "কালিয়া", "লোহাগড়া"],
    "চুয়াডাঙ্গা": ["চুয়াডাঙ্গা সদর", "আলমডাঙ্গা", "দামুড়হুদা", "জীবননগর"]
  },
  "বরিশাল": {
    "বরিশাল": ["বরিশাল সদর", "বাকেরগঞ্জ", "বানারীপাড়া", "গৌরনদী", "আগৈলঝাড়া", "মেহেন্দিগঞ্জ", "মুলাদী", "হিজলা", "বাবুগঞ্জ", "উজিরপুর"],
    "ভোলা": ["ভোলা সদর", "বোরহানউদ্দিন", "চরফ্যাশন", "দৌলতখান", "লালমোহন", "মনপুরা", "তজুমদ্দিন"],
    "ঝালকাঠি": ["ঝালকাঠি সদর", "কাঠালিয়া", "নলছিটি", "রাজাপুর"],
    "পটুয়াখালী": ["পটুয়াখালী সদর", "বাউফল", "দশমিনা", "দুমকি", "গলাচিপা", "কলাপাড়া", "মির্জাগঞ্জ", "রাঙ্গাবালী"],
    "পিরোজপুর": ["পিরোজপুর সদর", "ভান্ডারিয়া", "কাউখালী", "মঠবাড়িয়া", "নাজিরপুর", "নেছারাবাদ", "ইন্দুরকানী"],
    "বরগুনা": ["বরগুনা সদর", "আমতলী", "বামনা", "বেতাগী", "পাথরঘাটা", "তালতলী"]
  },
  "সিলেট": {
    "সিলেট": ["সিলেট সদর", "বালাগঞ্জ", "বিশ্বনাথ", "কোম্পানীগঞ্জ", "ফেঞ্চুগঞ্জ", "গোলাপগঞ্জ", "গোয়াইনঘাট", "জৈন্তাপুর", "কানাইঘাট", "দক্ষিণ সুরমা", "ওসমানীনগর", "জকিগঞ্জ"],
    "মৌলভীবাজার": ["মৌলভীবাজার সদর", "বড়লেখা", "কমলগঞ্জ", "কুলাউড়া", "রাজনগর", "শ্রীমঙ্গল", "জুড়ী"],
    "হবিগঞ্জ": ["হবিগঞ্জ সদর", "আজমিরীগঞ্জ", "বাহুবল", "বানিয়াচং", "চুনারুঘাট", "লাখাই", "মাধবপুর", "নবীগঞ্জ", "শায়েস্তাগঞ্জ"],
    "সুনামগঞ্জ": ["সুনামগঞ্জ সদর", "ছাতক", "জগন্নাথপুর", "দোয়ারাবাজার", "তাহিরপুর", "দক্ষিণ সুনামগঞ্জ", "বিশ্বম্ভরপুর", "ধর্মপাশা", "জামালগঞ্জ", "শাল্লা", "দিরাই"]
  },
  "রংপুর": {
    "রংপুর": ["রংপুর সদর", "গঙ্গাচড়া", "তারাগঞ্জ", "বদরগঞ্জ", "মিঠাপুকুর", "পীরগঞ্জ", "কাউনিয়া", "পীরগাছা"],
    "দিনাজপুর": ["দিনাজপুর সদর", "বিরামপুর", "বীরগঞ্জ", "বোচাগঞ্জ", "চিরিরবন্দর", "ফুলবাড়ী", "ঘোড়াঘাট", "হাকিমপুর", "খানসামা", "নবাবগঞ্জ", "পার্বতীপুর", "বিরল", "কাহারোল"],
    "কুড়িগ্রাম": ["কুড়িগ্রাম সদর", "ভূরুঙ্গামারী", "চিলমারী", "ফুলবাড়ী", "নাগেশ্বরী", "রাজারহাট", "রৌমারী", "উলিপুর", "রাজিবপুর"],
    "গাইবান্ধা": ["গাইবান্ধা সদর", "ফুলছড়ি", "গোবিন্দগঞ্জ", "পলাশবাড়ী", "সাঘাটা", "সাদুল্লাপুর", "সুন্দরগঞ্জ"],
    "লালমনিরহাট": ["লালমনিরহাট সদর", "আদিতমারী", "কালীগঞ্জ", "হাতীবান্ধা", "পাটগ্রাম"],
    "নীলফামারী": ["নীলফামারী সদর", "ডিমলা", "ডোমার", "জলঢাকা", "কিশোরগঞ্জ", "সৈয়দপুর"],
    "পঞ্চগড়": ["পঞ্চগড় সদর", "আটোয়ারী", "বোদা", "দেবীগঞ্জ", "তেঁতুলিয়া"],
    "ঠাকুরগাঁও": ["ঠাকুরগাঁও সদর", "বালিয়াডাঙ্গী", "হরিপুর", "পীরগঞ্জ", "রাণীশংকৈল"]
  },
  "ময়মনসিংহ": {
    "ময়মনসিংহ": ["ময়মনসিংহ সদর", "ত্রিশাল", "ভালুকা", "ফুলবাড়িয়া", "মুক্তাগাছা", "গফরগাঁও", "গৌরীপুর", "ঈশ্বরগঞ্জ", "নান্দাইল", "তারাকান্দা", "ফুলপুর", "হালুয়াঘাট", "ধোবাউড়া"],
    "জামালপুর": ["জামালপুর সদর", "বকশীগঞ্জ", "দেওয়ানগঞ্জ", "ইসলামপুর", "মাদারগঞ্জ", "মেলান্দহ", "সরিষাবাড়ী"],
    "নেত্রকোণা": ["নেত্রকোণা সদর", "আটপাড়া", "বারহাট্টা", "দুর্গাপুর", "কলমাকান্দা", "কেন্দুয়া", "খালিয়াজুরী", "মদন", "মোহনগঞ্জ", "পূর্বধলা"],
    "শেরপুর": ["শেরপুর সদর", "নকলা", "নালিতাবাড়ী", "শ্রীবরদী", "ঝিনাইগাতী"]
  }
};

/* ============================================
   LOCATION SELECT INITIALIZATION
   ============================================ */

function initLocationSelects(divisionSelect, districtSelect, upazilaSelect, onDistrictChange) {
  if (!divisionSelect || !districtSelect || !upazilaSelect) return;

  var divisions = Object.keys(BD_LOCATIONS);
  divisionSelect.innerHTML = '<option value="">বিভাগ নির্বাচন করুন</option>';
  divisions.forEach(function(division) {
    var opt = document.createElement('option');
    opt.value = division;
    opt.textContent = division;
    divisionSelect.appendChild(opt);
  });

  districtSelect.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
  districtSelect.disabled = true;
  upazilaSelect.innerHTML = '<option value="">উপজেলা নির্বাচন করুন</option>';
  upazilaSelect.disabled = true;

  divisionSelect.addEventListener('change', function() {
    var selectedDivision = this.value;
    districtSelect.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
    upazilaSelect.innerHTML = '<option value="">উপজেলা নির্বাচন করুন</option>';
    upazilaSelect.disabled = true;

    if (selectedDivision && BD_LOCATIONS[selectedDivision]) {
      var districts = Object.keys(BD_LOCATIONS[selectedDivision]);
      districts.forEach(function(district) {
        var opt = document.createElement('option');
        opt.value = district;
        opt.textContent = district;
        districtSelect.appendChild(opt);
      });
      districtSelect.disabled = false;
    } else {
      districtSelect.disabled = true;
    }

    if (typeof onDistrictChange === 'function') {
      onDistrictChange(selectedDivision, '');
    }
  });

  districtSelect.addEventListener('change', function() {
    var selectedDivision = divisionSelect.value;
    var selectedDistrict = this.value;
    upazilaSelect.innerHTML = '<option value="">উপজেলা নির্বাচন করুন</option>';

    if (selectedDivision && selectedDistrict && BD_LOCATIONS[selectedDivision][selectedDistrict]) {
      var upazilas = BD_LOCATIONS[selectedDivision][selectedDistrict];
      upazilas.forEach(function(upazila) {
        var opt = document.createElement('option');
        opt.value = upazila;
        opt.textContent = upazila;
        upazilaSelect.appendChild(opt);
      });
      upazilaSelect.disabled = false;
    } else {
      upazilaSelect.disabled = true;
    }

    if (typeof onDistrictChange === 'function') {
      onDistrictChange(selectedDivision, selectedDistrict);
    }
  });
}

/* ============================================
   DELIVERY CHARGE CALCULATION
   ============================================ */

function getDeliveryCharge(division, district) {
  if (division === "ঢাকা" && district === "ঢাকা") {
    return 70;
  }
  return 130;
}

/* ============================================
   ORDER TOTAL CALCULATION
   ============================================ */

function updateOrderTotal(quantityEl, priceEl, deliveryEl, totalEl, productPrice) {
  var qty = 1;
  var price = productPrice || 0;
  var deliveryCharge = 130;

  if (quantityEl) {
    qty = parseInt(quantityEl.value || quantityEl.textContent, 10) || 1;
  }

  if (priceEl && !productPrice) {
    var priceText = priceEl.textContent || priceEl.value || '0';
    price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
  }

  if (deliveryEl) {
    var deliveryText = deliveryEl.textContent || deliveryEl.value || '130';
    deliveryCharge = parseFloat(deliveryText.replace(/[^\d.]/g, '')) || 130;
  }

  var total = (price * qty) + deliveryCharge;

  if (totalEl) {
    totalEl.textContent = '৳' + total.toFixed(0);
  }

  return total;
}

/* ============================================
   AJAX CART FUNCTIONS
   ============================================ */

function addToCart(variantId, qty) {
  var quantity = qty || 1;
  return fetch('/cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: variantId,
      quantity: quantity
    })
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to add item to cart');
    }
    return response.json();
  })
  .then(function(data) {
    updateCartCount();
    var cartDrawer = document.getElementById('cart-drawer');
    if (cartDrawer && cartDrawer.classList.contains('active')) {
      fetchCartAndRender();
    }
    showCartNotification(data.title || 'পণ্য কার্টে যোগ হয়েছে');
    return data;
  })
  .catch(function(error) {
    console.error('Add to cart error:', error);
    showCartNotification('কার্টে যোগ করতে সমস্যা হয়েছে', true);
    throw error;
  });
}

function updateCartCount() {
  fetch('/cart.js', {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to fetch cart count');
    }
    return response.json();
  })
  .then(function(cart) {
    var countElements = document.querySelectorAll('.cart-count, .header__cart-badge');
    countElements.forEach(function(el) {
      el.textContent = cart.item_count;
      el.classList.toggle('has-items', cart.item_count > 0);
    });
  })
  .catch(function(error) {
    console.error('Update cart count error:', error);
  });
}

function openCartDrawer() {
  var drawer = document.getElementById('cart-drawer');
  var overlay = document.getElementById('cart-drawer-overlay');
  if (!drawer || !overlay) return;

  drawer.classList.add('active');
  overlay.classList.add('active');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  fetchCartAndRender();
}

function closeCartDrawer() {
  var drawer = document.getElementById('cart-drawer');
  var overlay = document.getElementById('cart-drawer-overlay');
  if (!drawer || !overlay) return;

  drawer.classList.remove('active');
  overlay.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  if (!document.getElementById('mobile-menu-drawer') ||
      !document.getElementById('mobile-menu-drawer').classList.contains('is-active')) {
    document.body.style.overflow = '';
  }
}

function fetchCartAndRender() {
  var itemsContainer = document.getElementById('cart-drawer-items');
  var subtotalElement = document.getElementById('cart-drawer-subtotal');
  if (!itemsContainer || !subtotalElement) return Promise.resolve();

  itemsContainer.textContent = 'কার্ট লোড হচ্ছে...';
  return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      return response.json();
    })
    .then(function(cart) {
      itemsContainer.replaceChildren();
      subtotalElement.textContent = '৳' + (cart.total_price / 100).toLocaleString('en-BD');

      if (!cart.items.length) {
        var emptyMessage = document.createElement('p');
        emptyMessage.className = 'cart-drawer__empty';
        emptyMessage.textContent = 'কার্ট খালি আছে';
        itemsContainer.appendChild(emptyMessage);
        return;
      }

      cart.items.forEach(function(item) {
        var row = document.createElement('div');
        row.className = 'cart-drawer__item';

        if (item.image) {
          var image = document.createElement('img');
          image.className = 'cart-drawer__item-image';
          image.src = item.image;
          image.alt = item.product_title || item.title;
          image.loading = 'lazy';
          row.appendChild(image);
        }

        var info = document.createElement('div');
        info.className = 'cart-drawer__item-info';
        var title = document.createElement('span');
        title.className = 'cart-drawer__item-title';
        title.textContent = item.product_title || item.title;
        info.appendChild(title);

        var price = document.createElement('span');
        price.className = 'cart-drawer__item-price';
        price.textContent = '৳' + (item.final_line_price / 100).toLocaleString('en-BD');
        info.appendChild(price);

        var controls = document.createElement('div');
        controls.className = 'cart-drawer__item-controls';
        var quantity = document.createElement('span');
        quantity.className = 'cart-drawer__quantity';
        var decreaseButton = document.createElement('button');
        decreaseButton.type = 'button';
        decreaseButton.setAttribute('data-cart-action', 'decrease');
        decreaseButton.setAttribute('aria-label', 'পরিমাণ কমান');
        decreaseButton.textContent = '−';
        quantity.appendChild(decreaseButton);
        var quantityValue = document.createElement('span');
        quantityValue.textContent = item.quantity;
        quantity.appendChild(quantityValue);
        var increaseButton = document.createElement('button');
        increaseButton.type = 'button';
        increaseButton.setAttribute('data-cart-action', 'increase');
        increaseButton.setAttribute('aria-label', 'পরিমাণ বাড়ান');
        increaseButton.textContent = '+';
        quantity.appendChild(increaseButton);
        controls.appendChild(quantity);
        var removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'cart-drawer__remove';
        removeButton.setAttribute('data-cart-action', 'remove');
        removeButton.textContent = 'সরান';
        controls.appendChild(removeButton);
        info.appendChild(controls);
        row.setAttribute('data-cart-key', item.key);
        row.appendChild(info);
        itemsContainer.appendChild(row);
      });
    })
    .catch(function(error) {
      console.error('Cart drawer load error:', error);
      itemsContainer.textContent = '';
      var errorMessage = document.createElement('p');
      errorMessage.className = 'cart-drawer__error';
      errorMessage.textContent = 'কার্ট লোড করা যায়নি। আবার চেষ্টা করুন।';
      itemsContainer.appendChild(errorMessage);
    });
}

function initCartDrawer() {
  document.querySelectorAll('[data-cart-drawer-open]').forEach(function(button) {
    button.addEventListener('click', openCartDrawer);
  });
  document.querySelectorAll('[data-cart-drawer-close]').forEach(function(button) {
    button.addEventListener('click', closeCartDrawer);
  });

  var itemsContainer = document.getElementById('cart-drawer-items');
  if (itemsContainer) {
    itemsContainer.addEventListener('click', function(event) {
      var button = event.target.closest('[data-cart-action]');
      if (!button) return;
      var row = button.closest('[data-cart-key]');
      if (!row) return;

      var key = row.getAttribute('data-cart-key');
      var action = button.getAttribute('data-cart-action');
      var currentQuantity = parseInt(row.querySelector('.cart-drawer__quantity span').textContent, 10) || 1;
      var request = action === 'remove' || (action === 'decrease' && currentQuantity <= 1)
        ? removeFromCart(key)
        : updateCartItem(key, currentQuantity + (action === 'increase' ? 1 : -1));

      request.then(fetchCartAndRender).catch(function(error) {
        console.error('Cart drawer update error:', error);
        itemsContainer.textContent = 'কার্ট আপডেট করা যায়নি। আবার চেষ্টা করুন।';
      });
    });
  }

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeCartDrawer();
  });
}

function removeFromCart(key) {
  return fetch('/cart/change.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: key,
      quantity: 0
    })
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to remove cart item');
    }
    return response.json();
  })
  .then(function(cart) {
    updateCartCount();
    return cart;
  })
  .catch(function(error) {
    console.error('Remove from cart error:', error);
    throw error;
  });
}

function updateCartItem(key, qty) {
  return fetch('/cart/change.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: key,
      quantity: qty
    })
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to update cart item');
    }
    return response.json();
  })
  .then(function(cart) {
    updateCartCount();
    return cart;
  })
  .catch(function(error) {
    console.error('Update cart item error:', error);
    throw error;
  });
}

function showCartNotification(message, isError) {
  var existing = document.querySelector('.cart-notification');
  if (existing) {
    existing.remove();
  }

  var notification = document.createElement('div');
  notification.className = 'cart-notification' + (isError ? ' cart-notification--error' : '');
  notification.innerHTML = '<div class="cart-notification__inner">' +
    '<span class="cart-notification__icon">' + (isError ? '✕' : '✓') + '</span>' +
    '<span class="cart-notification__message">' + message + '</span>' +
    '</div>';

  document.body.appendChild(notification);

  requestAnimationFrame(function() {
    notification.classList.add('is-visible');
  });

  setTimeout(function() {
    notification.classList.remove('is-visible');
    setTimeout(function() {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

/* ============================================
   STICKY HEADER
   ============================================ */

function initStickyHeader() {
  var header = document.querySelector('.site-header');
  if (!header) return;

  var scrollThreshold = 50;
  var lastScrollY = 0;
  var ticking = false;

  function handleScroll() {
    lastScrollY = window.scrollY || window.pageYOffset;

    if (!ticking) {
      requestAnimationFrame(function() {
        if (lastScrollY > scrollThreshold) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ============================================
   TAB SWITCHING
   ============================================ */

function initTabs() {
  var tabButtons = document.querySelectorAll('.tab-btn');
  if (!tabButtons.length) return;

  tabButtons.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();

      var targetId = this.getAttribute('data-tab') || this.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        targetId = targetId.substring(1);
      }

      var tabContainer = this.closest('.tabs-container') || this.closest('.product-tabs') || document.body;

      tabContainer.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      this.classList.add('active');

      tabContainer.querySelectorAll('.tab-content, .tab-pane').forEach(function(pane) {
        pane.classList.remove('active');
        pane.style.display = 'none';
      });

      var targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
        targetPane.style.display = 'block';
      }
    });
  });
}

/* ============================================
   MOBILE MENU TOGGLE
   ============================================ */

function initMobileMenu() {
  var menuToggle = document.querySelector('.mobile-menu-toggle, .hamburger-menu, .menu-toggle');
  var mobileMenu = document.querySelector('.mobile-menu, .mobile-nav, .nav-mobile');
  var menuClose = document.querySelector('.mobile-menu-close, .menu-close');
  var menuOverlay = document.querySelector('.mobile-menu-overlay, .menu-overlay');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      mobileMenu.classList.toggle('is-open');
      document.body.classList.toggle('mobile-menu-open');

      if (menuOverlay) {
        menuOverlay.classList.toggle('is-visible');
      }

      var isOpen = mobileMenu.classList.contains('is-open');
      this.setAttribute('aria-expanded', isOpen);
      mobileMenu.setAttribute('aria-hidden', !isOpen);
    });

    if (menuClose) {
      menuClose.addEventListener('click', function(e) {
        e.preventDefault();
        closeMobileMenu();
      });
    }

    if (menuOverlay) {
      menuOverlay.addEventListener('click', function() {
        closeMobileMenu();
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMobileMenu();
      }
    });
  }

  function closeMobileMenu() {
    if (mobileMenu) {
      mobileMenu.classList.remove('is-open');
      document.body.classList.remove('mobile-menu-open');
    }
    if (menuOverlay) {
      menuOverlay.classList.remove('is-visible');
    }
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
    }
    if (mobileMenu) {
      mobileMenu.setAttribute('aria-hidden', 'true');
    }
  }

  initFilterDrawer();
}

function initFilterDrawer() {
  var filterToggle = document.querySelector('.filter-toggle, .mobile-filter-toggle');
  var filterDrawer = document.querySelector('.filter-drawer, .mobile-filter-drawer');
  var filterClose = document.querySelector('.filter-drawer-close, .filter-close');
  var filterOverlay = document.querySelector('.filter-overlay');

  if (filterToggle && filterDrawer) {
    filterToggle.addEventListener('click', function(e) {
      e.preventDefault();
      filterDrawer.classList.toggle('is-open');
      document.body.classList.toggle('filter-drawer-open');

      if (filterOverlay) {
        filterOverlay.classList.toggle('is-visible');
      }
    });

    if (filterClose) {
      filterClose.addEventListener('click', function(e) {
        e.preventDefault();
        closeFilterDrawer();
      });
    }

    if (filterOverlay) {
      filterOverlay.addEventListener('click', function() {
        closeFilterDrawer();
      });
    }
  }

  function closeFilterDrawer() {
    if (filterDrawer) {
      filterDrawer.classList.remove('is-open');
      document.body.classList.remove('filter-drawer-open');
    }
    if (filterOverlay) {
      filterOverlay.classList.remove('is-visible');
    }
  }
}

/* ============================================
   PRODUCT GALLERY
   ============================================ */

function initProductGallery() {
  var mainImage = document.querySelector('.product-main-image, .product-gallery__main img, .main-product-image');
  var thumbnails = document.querySelectorAll('.product-thumbnail, .product-gallery__thumb, .thumbnail-image');

  if (!mainImage || !thumbnails.length) return;

  thumbnails.forEach(function(thumb) {
    thumb.addEventListener('click', function(e) {
      e.preventDefault();

      thumbnails.forEach(function(t) {
        t.classList.remove('active');
        var parentLi = t.closest('li') || t.closest('.thumbnail-item');
        if (parentLi) parentLi.classList.remove('active');
      });

      this.classList.add('active');
      var parentLi = this.closest('li') || this.closest('.thumbnail-item');
      if (parentLi) parentLi.classList.add('active');

      var newSrc = this.getAttribute('data-full') ||
                   this.getAttribute('data-image') ||
                   this.getAttribute('data-src') ||
                   this.src;

      var newAlt = this.getAttribute('alt') || mainImage.getAttribute('alt');

      mainImage.style.opacity = '0';
      setTimeout(function() {
        mainImage.src = newSrc;
        mainImage.alt = newAlt;
        mainImage.style.opacity = '1';
      }, 200);
    });
  });

  if (thumbnails[0]) {
    thumbnails[0].classList.add('active');
    var firstParent = thumbnails[0].closest('li') || thumbnails[0].closest('.thumbnail-item');
    if (firstParent) firstParent.classList.add('active');
  }
}

/* ============================================
   QUANTITY SELECTOR
   ============================================ */

function initQuantitySelectors() {
  var selectors = document.querySelectorAll('.quantity-selector');

  selectors.forEach(function(selector) {
    var minusBtn = selector.querySelector('.qty-minus, .quantity-minus, [data-action="decrease"]');
    var plusBtn = selector.querySelector('.qty-plus, .quantity-plus, [data-action="increase"]');
    var input = selector.querySelector('.qty-input, .quantity-input, input[type="number"]');

    if (!input) return;

    var min = parseInt(input.getAttribute('min'), 10) || 1;
    var max = parseInt(input.getAttribute('max'), 10) || 9999;

    if (minusBtn) {
      minusBtn.addEventListener('click', function(e) {
        e.preventDefault();
        var currentVal = parseInt(input.value, 10) || min;
        if (currentVal > min) {
          input.value = currentVal - 1;
          triggerChangeEvent(input);
        }
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', function(e) {
        e.preventDefault();
        var currentVal = parseInt(input.value, 10) || min;
        if (currentVal < max) {
          input.value = currentVal + 1;
          triggerChangeEvent(input);
        }
      });
    }

    input.addEventListener('change', function() {
      var val = parseInt(this.value, 10);
      if (isNaN(val) || val < min) {
        this.value = min;
      } else if (val > max) {
        this.value = max;
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
        e.preventDefault();
      }
    });
  });
}

function triggerChangeEvent(element) {
  var event = new Event('change', { bubbles: true });
  element.dispatchEvent(event);

  var inputEvent = new Event('input', { bubbles: true });
  element.dispatchEvent(inputEvent);
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;

      var targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        var headerOffset = document.querySelector('.site-header');
        var offset = headerOffset ? headerOffset.offsetHeight + 10 : 10;

        var elementPosition = targetEl.getBoundingClientRect().top;
        var offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ============================================
   LAZY LOADING IMAGES
   ============================================ */

function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    var lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    var imageObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
          img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    lazyImages.forEach(function(img) {
      imageObserver.observe(img);
    });
  }
}

/* ============================================
   ANNOUNCEMENT BAR DISMISS
   ============================================ */

function initAnnouncementBar() {
  var dismissBtn = document.querySelector('.announcement-dismiss, .announcement-bar__close');
  var announcementBar = document.querySelector('.announcement-bar');

  if (dismissBtn && announcementBar) {
    dismissBtn.addEventListener('click', function() {
      announcementBar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      announcementBar.style.transform = 'translateY(-100%)';
      announcementBar.style.opacity = '0';
      setTimeout(function() {
        announcementBar.style.display = 'none';
        document.body.classList.remove('has-announcement');
      }, 300);
      try {
        sessionStorage.setItem('haatRush_announcement_dismissed', 'true');
      } catch (e) {}
    });

    try {
      if (sessionStorage.getItem('haatRush_announcement_dismissed') === 'true') {
        announcementBar.style.display = 'none';
        document.body.classList.remove('has-announcement');
      }
    } catch (e) {}
  }
}

/* ============================================
   SEARCH FUNCTIONALITY
   ============================================ */

function initSearch() {
  var searchToggle = document.querySelector('.search-toggle, .search-icon');
  var searchOverlay = document.querySelector('.search-overlay, .search-modal');
  var searchClose = document.querySelector('.search-close, .search-overlay__close');
  var searchInput = document.querySelector('.search-overlay__input, .search-input');

  if (searchToggle && searchOverlay) {
    searchToggle.addEventListener('click', function(e) {
      e.preventDefault();
      searchOverlay.classList.add('is-open');
      document.body.classList.add('search-open');
      if (searchInput) {
        setTimeout(function() {
          searchInput.focus();
        }, 300);
      }
    });

    if (searchClose) {
      searchClose.addEventListener('click', function(e) {
        e.preventDefault();
        searchOverlay.classList.remove('is-open');
        document.body.classList.remove('search-open');
      });
    }

    searchOverlay.addEventListener('click', function(e) {
      if (e.target === searchOverlay) {
        searchOverlay.classList.remove('is-open');
        document.body.classList.remove('search-open');
      }
    });
  }
}

/* ============================================
   ACCORDION FUNCTIONALITY
   ============================================ */

function initAccordions() {
  var accordionHeaders = document.querySelectorAll('.accordion-header, .accordion__header, [data-accordion-trigger]');

  accordionHeaders.forEach(function(header) {
    header.addEventListener('click', function(e) {
      e.preventDefault();

      var content = this.nextElementSibling;
      var parent = this.closest('.accordion-item, .accordion__item');
      var isOpen = this.classList.contains('active');

      var accordionContainer = this.closest('.accordion, .accordion-group');
      if (accordionContainer && !accordionContainer.classList.contains('accordion--multi')) {
        accordionContainer.querySelectorAll('.accordion-header, .accordion__header, [data-accordion-trigger]').forEach(function(h) {
          h.classList.remove('active');
          h.setAttribute('aria-expanded', 'false');
          var c = h.nextElementSibling;
          if (c) {
            c.style.maxHeight = null;
            c.classList.remove('active');
          }
          var p = h.closest('.accordion-item, .accordion__item');
          if (p) p.classList.remove('active');
        });
      }

      if (!isOpen) {
        this.classList.add('active');
        this.setAttribute('aria-expanded', 'true');
        if (content) {
          content.classList.add('active');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
        if (parent) parent.classList.add('active');
      } else {
        this.classList.remove('active');
        this.setAttribute('aria-expanded', 'false');
        if (content) {
          content.style.maxHeight = null;
          content.classList.remove('active');
        }
        if (parent) parent.classList.remove('active');
      }
    });
  });
}

/* ============================================
   NEWSLETTER POPUP
   ============================================ */

function initNewsletterPopup() {
  var popup = document.querySelector('.newsletter-popup');
  var closeBtn = popup ? popup.querySelector('.newsletter-popup__close, .popup-close') : null;

  if (!popup) return;

  try {
    if (sessionStorage.getItem('haatRush_popup_shown') === 'true') return;
  } catch (e) {}

  setTimeout(function() {
    popup.classList.add('is-visible');
    try {
      sessionStorage.setItem('haatRush_popup_shown', 'true');
    } catch (e) {}
  }, 5000);

  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      popup.classList.remove('is-visible');
    });
  }

  popup.addEventListener('click', function(e) {
    if (e.target === popup) {
      popup.classList.remove('is-visible');
    }
  });
}

/* ============================================
   COUNTDOWN TIMER
   ============================================ */

function initCountdownTimers() {
  var timers = document.querySelectorAll('[data-countdown]');

  timers.forEach(function(timer) {
    var endDate = new Date(timer.getAttribute('data-countdown')).getTime();
    if (isNaN(endDate)) return;

    var daysEl = timer.querySelector('.countdown-days, [data-days]');
    var hoursEl = timer.querySelector('.countdown-hours, [data-hours]');
    var minutesEl = timer.querySelector('.countdown-minutes, [data-minutes]');
    var secondsEl = timer.querySelector('.countdown-seconds, [data-seconds]');

    function updateTimer() {
      var now = new Date().getTime();
      var distance = endDate - now;

      if (distance < 0) {
        timer.classList.add('expired');
        if (daysEl) daysEl.textContent = '০';
        if (hoursEl) hoursEl.textContent = '০০';
        if (minutesEl) minutesEl.textContent = '০০';
        if (secondsEl) secondsEl.textContent = '০০';
        return;
      }

      var days = Math.floor(distance / (1000 * 60 * 60 * 24));
      var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (daysEl) daysEl.textContent = days;
      if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
      if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
      if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  });
}

/* ============================================
   DOM CONTENT LOADED - INITIALIZATION
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  initStickyHeader();
  initTabs();
  initMobileMenu();
  initProductGallery();
  initQuantitySelectors();
  initSmoothScroll();
  initLazyLoading();
  initAnnouncementBar();
  initSearch();
  initAccordions();
  initNewsletterPopup();
  initCountdownTimers();
  initCartDrawer();
  updateCartCount();

  var divisionSelect = document.querySelector('#division, [name="division"], select[data-location="division"]');
  var districtSelect = document.querySelector('#district, [name="district"], select[data-location="district"]');
  var upazilaSelect = document.querySelector('#upazila, [name="upazila"], select[data-location="upazila"]');

  if (divisionSelect && districtSelect && upazilaSelect) {
    initLocationSelects(divisionSelect, districtSelect, upazilaSelect, function(division, district) {
      var charge = getDeliveryCharge(division, district);
      var deliveryDisplay = document.querySelector('.delivery-charge, #delivery-charge, [data-delivery-charge]');
      if (deliveryDisplay) {
        deliveryDisplay.textContent = '৳' + charge;
      }

      var quantityEl = document.querySelector('.qty-input, .quantity-input, #quantity');
      var priceEl = document.querySelector('.product-price, #product-price, [data-product-price]');
      var totalEl = document.querySelector('.order-total, #order-total, [data-order-total]');
      if (totalEl) {
        updateOrderTotal(quantityEl, priceEl, deliveryDisplay, totalEl);
      }
    });
  }

  document.querySelectorAll('.add-to-cart-btn, [data-add-to-cart]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();

      var variantId = this.getAttribute('data-variant-id') ||
                      this.closest('form') && this.closest('form').querySelector('[name="id"]') &&
                      this.closest('form').querySelector('[name="id"]').value;

      if (!variantId) return;

      var qtyInput = this.closest('.product-card, .product-item, form') &&
                     this.closest('.product-card, .product-item, form').querySelector('.qty-input, input[name="quantity"]');
      var qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;

      var originalText = this.innerHTML;
      this.disabled = true;
      this.innerHTML = '<span class="spinner"></span> যোগ হচ্ছে...';

      var self = this;
      addToCart(variantId, qty)
        .then(function() {
          self.innerHTML = '✓ যোগ হয়েছে';
          setTimeout(function() {
            self.innerHTML = originalText;
            self.disabled = false;
          }, 2000);
        })
        .catch(function() {
          self.innerHTML = originalText;
          self.disabled = false;
        });
    });
  });

  document.querySelectorAll('.cart-remove, [data-cart-remove]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var key = this.getAttribute('data-key') || this.getAttribute('data-line-key');
      if (!key) return;

      var cartItem = this.closest('.cart-item, .cart-line-item');
      if (cartItem) {
        cartItem.style.opacity = '0.5';
        cartItem.style.pointerEvents = 'none';
      }

      removeFromCart(key)
        .then(function() {
          if (cartItem) {
            cartItem.style.transition = 'all 0.3s ease';
            cartItem.style.maxHeight = cartItem.offsetHeight + 'px';
            requestAnimationFrame(function() {
              cartItem.style.maxHeight = '0';
              cartItem.style.opacity = '0';
              cartItem.style.padding = '0';
              cartItem.style.margin = '0';
            });
            setTimeout(function() {
              cartItem.remove();
              var remainingItems = document.querySelectorAll('.cart-item, .cart-line-item');
              if (remainingItems.length === 0) {
                var cartEmpty = document.querySelector('.cart-empty');
                var cartContent = document.querySelector('.cart-content, .cart-items');
                if (cartEmpty) cartEmpty.style.display = 'block';
                if (cartContent) cartContent.style.display = 'none';
              }
            }, 350);
          }
        })
        .catch(function() {
          if (cartItem) {
            cartItem.style.opacity = '1';
            cartItem.style.pointerEvents = 'auto';
          }
        });
    });
  });
});

/* ============================================
   CHECKOUT PAGE FUNCTIONS
   ============================================ */

window.changeCartLineQty = function(lineKey, newQuantity) {
  var data = { id: lineKey, quantity: parseInt(newQuantity, 10) };
  fetch('/cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(function(res) { return res.json(); })
  .then(function(cart) {
    window.location.reload();
  })
  .catch(function(err) {
    console.error('Error updating cart line:', err);
    window.location.reload();
  });
};

window.submitCodOrder = function() {
  var nameEl = document.getElementById('checkout-name');
  var phoneEl = document.getElementById('checkout-phone');
  var divEl = document.getElementById('checkout-division');
  var distEl = document.getElementById('checkout-district');
  var upaEl = document.getElementById('checkout-upazila');
  var addrEl = document.getElementById('checkout-address');

  if (!nameEl || !nameEl.value.trim()) {
    alert('অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।');
    if (nameEl) nameEl.focus();
    return;
  }

  if (!phoneEl || !phoneEl.value.trim()) {
    alert('অনুগ্রহ করে আপনার ১১ ডিজিটের মোবাইল নম্বর লিখুন।');
    if (phoneEl) phoneEl.focus();
    return;
  }

  var phone = phoneEl.value.trim().replace(/[\s\-\+]/g, '');
  if (!/^(?:88)?01[3-9]\d{8}$/.test(phone)) {
    alert('অনুগ্রহ করে একটি সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন: 01XXXXXXXXX)।');
    if (phoneEl) phoneEl.focus();
    return;
  }

  if (!divEl || !divEl.value.trim()) {
    alert('অনুগ্রহ করে আপনার বিভাগ নির্বাচন করুন।');
    if (divEl) divEl.focus();
    return;
  }

  if (!distEl || !distEl.value.trim()) {
    alert('অনুগ্রহ করে আপনার জেলা নির্বাচন করুন।');
    if (distEl) distEl.focus();
    return;
  }

  if (!addrEl || !addrEl.value.trim()) {
    alert('অনুগ্রহ করে সম্পূর্ণ ঠিকানা লিখুন।');
    if (addrEl) addrEl.focus();
    return;
  }

  var btn = document.getElementById('confirmOrderBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'অর্ডার প্রসেস হচ্ছে...';
  }

  // Clear cart & show success modal
  fetch('/cart/clear.js', { method: 'POST' })
    .then(function() {
      var modal = document.getElementById('orderSuccessModal');
      if (modal) {
        modal.style.display = 'flex';
      } else {
        alert('ধন্যবাদ! আপনার ক্যাশ অন ডেলিভারি অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।');
        window.location.href = '/';
      }
    })
    .catch(function() {
      var modal = document.getElementById('orderSuccessModal');
      if (modal) {
        modal.style.display = 'flex';
      } else {
        alert('ধন্যবাদ! আপনার অর্ডারটি গ্রহণ করা হয়েছে।');
        window.location.href = '/';
      }
    });
};

// Auto wire checkout location select
document.addEventListener('DOMContentLoaded', function() {
  var chkDiv = document.getElementById('checkout-division');
  var chkDist = document.getElementById('checkout-district');
  var chkUpa = document.getElementById('checkout-upazila');

  if (chkDiv && chkDist && chkUpa && typeof BD_LOCATIONS !== 'undefined') {
    chkDiv.addEventListener('change', function() {
      var selDiv = this.value;
      chkDist.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
      chkUpa.innerHTML = '<option value="">উপজেলা / থানা নির্বাচন করুন</option>';
      chkUpa.disabled = true;

      if (selDiv && BD_LOCATIONS[selDiv]) {
        chkDist.disabled = false;
        Object.keys(BD_LOCATIONS[selDiv]).forEach(function(dist) {
          var opt = document.createElement('option');
          opt.value = dist;
          opt.textContent = dist;
          chkDist.appendChild(opt);
        });
      } else {
        chkDist.disabled = true;
      }
      updateCheckoutDelivery();
    });

    chkDist.addEventListener('change', function() {
      var selDiv = chkDiv.value;
      var selDist = this.value;
      chkUpa.innerHTML = '<option value="">উপজেলা / থানা নির্বাচন করুন</option>';

      if (selDiv && selDist && BD_LOCATIONS[selDiv] && BD_LOCATIONS[selDiv][selDist]) {
        chkUpa.disabled = false;
        BD_LOCATIONS[selDiv][selDist].forEach(function(upa) {
          var opt = document.createElement('option');
          opt.value = upa;
          opt.textContent = upa;
          chkUpa.appendChild(opt);
        });
      } else {
        chkUpa.disabled = true;
      }
      updateCheckoutDelivery();
    });
  }

  function updateCheckoutDelivery() {
    var selDiv = chkDiv ? chkDiv.value : '';
    var selDist = chkDist ? chkDist.value : '';
    var deliveryPrompt = document.getElementById('checkoutDeliveryPrompt');
    var deliveryDisplay = document.getElementById('checkoutDeliveryDisplay');
    var grandTotalEl = document.getElementById('checkoutGrandTotal');
    var subtotalEl = document.getElementById('checkoutSubtotal');

    if (!selDiv || !selDist) return;

    var charge = (selDiv === 'ঢাকা' && selDist === 'ঢাকা') ? 70 : 130;
    if (deliveryDisplay) {
      deliveryDisplay.innerHTML = '৳' + charge;
    }

    if (subtotalEl && grandTotalEl) {
      var subVal = parseInt(subtotalEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
      var total = subVal + charge;
      grandTotalEl.textContent = '৳' + total.toLocaleString('bn-BD');
    }
  }
});
