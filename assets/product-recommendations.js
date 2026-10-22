/* HaatRush product page: real Shopify product recommendations.

   A section can only read the `recommendations` object when Shopify renders it
   through /recommendations/products, so the section ships a curated selection
   and this script asks for the real answer as soon as the grid approaches the
   viewport. When the store has no recommendations for the product, the
   server-rendered grid stays exactly as it is. */
(function () {
  'use strict';

  var mount = document.querySelector('[data-recommendations]');
  if (!mount) { return; }

  var grid = mount.querySelector('[data-recommendations-grid]');
  var url = mount.getAttribute('data-recommendations-url');
  if (!grid || !url || url.charAt(0) === '#' || typeof window.fetch !== 'function') { return; }

  var busy = false;

  var load = function () {
    if (busy) { return; }
    busy = true;
    mount.classList.add('is-loading');
    fetch(url, { headers: { Accept: 'text/html' } })
      .then(function (response) {
        if (!response.ok) { throw new Error('recommendations request failed'); }
        return response.text();
      })
      .then(function (html) {
        var fresh = new DOMParser().parseFromString(html, 'text/html')
          .querySelector('[data-recommendations-grid]');
        /* only swap in a grid that really carries products */
        if (fresh && fresh.querySelector('.lf-product-card')) {
          grid.innerHTML = fresh.innerHTML;
          mount.classList.add('is-ready');
        }
      })
      .catch(function () { /* keep the server-rendered selection */ })
      .then(function () { mount.classList.remove('is-loading'); });
  };

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          observer.disconnect();
          load();
        }
      });
    }, { rootMargin: '400px 0px' });
    observer.observe(mount);
  } else {
    load();
  }
}());
