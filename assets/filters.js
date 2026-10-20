/**
 * HaatRush Theme - Collection Filters & Sorting JavaScript
 * Handles sidebar filtering, price range inputs, tag/availability filters,
 * sorting dropdown, and mobile filter off-canvas drawer.
 */

(function () {
  'use strict';

  function initFilters() {
    initMobileDrawer();
    initPriceRange();
    initSorting();
    initFilterForms();
    initResetButtons();
  }

  // --- 1. Mobile Filter Drawer & Overlay ---
  function initMobileDrawer() {
    const toggleBtns = [
      document.getElementById('filterToggle'),
      document.getElementById('collPageFilterToggle'),
      document.querySelector('.filter-toggle-btn')
    ].filter(Boolean);

    const closeBtns = [
      document.getElementById('filterClose'),
      document.getElementById('collPageFilterClose')
    ].filter(Boolean);

    const overlays = [
      document.getElementById('filterOverlay'),
      document.getElementById('collPageOverlay')
    ].filter(Boolean);

    const sidebars = [
      document.getElementById('collectionFilter'),
      document.getElementById('collPageSidebar')
    ].filter(Boolean);

    function openDrawer() {
      sidebars.forEach(s => s.classList.add('is-open', 'open', 'active'));
      overlays.forEach(o => o.classList.add('is-visible', 'visible', 'active'));
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      sidebars.forEach(s => s.classList.remove('is-open', 'open', 'active'));
      overlays.forEach(o => o.classList.remove('is-visible', 'visible', 'active'));
      document.body.style.overflow = '';
    }

    toggleBtns.forEach(btn => btn.addEventListener('click', openDrawer));
    closeBtns.forEach(btn => btn.addEventListener('click', closeDrawer));
    overlays.forEach(o => o.addEventListener('click', closeDrawer));
  }

  // --- 2. Price Range Input Sync ---
  function initPriceRange() {
    const minInputs = [
      document.getElementById('filter-price-min'),
      document.getElementById('coll-price-min')
    ].filter(Boolean);

    const maxInputs = [
      document.getElementById('filter-price-max'),
      document.getElementById('coll-price-max')
    ].filter(Boolean);

    minInputs.forEach(minIn => {
      minIn.addEventListener('input', function () {
        let val = parseInt(this.value, 10) || 0;
        if (val < 0) this.value = 0;
      });
    });

    maxInputs.forEach(maxIn => {
      maxIn.addEventListener('input', function () {
        let val = parseInt(this.value, 10);
        if (val > 100000) this.value = 100000;
      });
    });
  }

  // --- 3. Sorting Dropdown ---
  function initSorting() {
    const sortSelects = document.querySelectorAll('#sortSelect, #collSortSelect, select[name="sort_by"]');

    sortSelects.forEach(select => {
      select.addEventListener('change', function () {
        const url = new URL(window.location.href);
        url.searchParams.set('sort_by', this.value);
        window.location.href = url.toString();
      });
    });
  }

  // --- 4. Filter Form Submissions ---
  function initFilterForms() {
    const forms = [
      document.getElementById('filterForm'),
      document.getElementById('collFilterForm')
    ].filter(Boolean);

    forms.forEach(form => {
      form.addEventListener('submit', function (e) {
        // Allow standard GET submission with Shopify filter params
        // Clean empty values before submitting
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
          if (!input.value && input.name) {
            input.disabled = true;
          }
        });
      });
    });
  }

  // --- 5. Reset All Filters ---
  function initResetButtons() {
    window.resetAllFilters = function () {
      const url = new URL(window.location.href);
      // Remove all filter parameters
      const keysToRemove = [];
      url.searchParams.forEach((val, key) => {
        if (key.startsWith('filter.') || key === 'tag' || key === 'price_min' || key === 'price_max') {
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach(k => url.searchParams.delete(k));
      window.location.href = url.pathname;
    };

    window.resetCollFilters = window.resetAllFilters;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
  } else {
    initFilters();
  }
})();
