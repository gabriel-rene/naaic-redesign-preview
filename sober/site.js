/* NAAIC "Sober" mockup — shared behaviour (vanilla, no dependencies).
   1. Mobile menu   2. Filters disclosure   3. Client-side filters + sort
   4. Upcoming / Past tablist   5. Newsletter preview message            */
(function () {
  'use strict';

  /* ---------- 1. Mobile menu ---------- */
  var nav = document.querySelector('.nav');
  var menuBtn = document.querySelector('.menu-toggle');
  if (nav && menuBtn) {
    var label = menuBtn.querySelector('.menu-label');
    var setMenu = function (open, returnFocus) {
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
      if (!open && returnFocus) menuBtn.focus();
    };
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true', false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        e.preventDefault();
        setMenu(false, true);
      }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) setMenu(false, false);
    });
    var mq = window.matchMedia('(min-width: 1100px)');
    var onMq = function () { if (mq.matches) setMenu(false, false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- 2. Filters disclosure (mobile / tablet) ---------- */
  document.querySelectorAll('.filters-toggle').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    });
    panel.querySelectorAll('[data-close-filters]').forEach(function (done) {
      done.addEventListener('click', function () {
        btn.setAttribute('aria-expanded', 'false');
        panel.classList.remove('is-open');
        btn.focus();
      });
    });
  });

  /* ---------- 3. Filters ---------- */
  document.querySelectorAll('[data-filter-root]').forEach(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-item]'));
    var checks = Array.prototype.slice.call(root.querySelectorAll('input[type="checkbox"][data-filter]'));
    var chips = Array.prototype.slice.call(root.querySelectorAll('[data-chip]'));
    var search = root.querySelector('[data-filter-search]');
    var countEl = root.querySelector('[data-count]');
    var badge = root.querySelector('.active-n');
    var sortSel = root.querySelector('[data-sort]');

    // Facet counts come from the data, so the numbers can never drift from the cards.
    checks.forEach(function (cb) {
      var key = cb.getAttribute('data-filter');
      var n = items.filter(function (it) { return (it.getAttribute('data-' + key) || '').split(' ').indexOf(cb.value) !== -1; }).length;
      var out = cb.parentNode.querySelector('.count');
      if (out) out.textContent = n;
    });

    var activePanel = function () {
      var p = root.querySelector('[role="tabpanel"]:not([hidden])');
      return p || root;
    };

    var apply = function () {
      var groups = {};
      checks.forEach(function (cb) {
        if (!cb.checked) return;
        var k = cb.getAttribute('data-filter');
        (groups[k] = groups[k] || []).push(cb.value);
      });
      chips.forEach(function (c) {
        var v = c.getAttribute('data-value');
        if (c.getAttribute('aria-pressed') === 'true' && v !== 'all') {
          var k = c.getAttribute('data-chip');
          (groups[k] = groups[k] || []).push(v);
        }
      });
      var words = search ? search.value.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];

      items.forEach(function (it) {
        var ok = Object.keys(groups).every(function (k) {
          var vals = (it.getAttribute('data-' + k) || '').split(' ');
          return groups[k].some(function (v) { return vals.indexOf(v) !== -1; });
        });
        if (ok && words.length) {
          var text = it.textContent.toLowerCase();
          ok = words.every(function (w) { return text.indexOf(w) !== -1; });
        }
        it.hidden = !ok;
      });

      // Hide month headings whose rows are all filtered out.
      root.querySelectorAll('[data-group]').forEach(function (g) {
        g.hidden = !g.querySelector('[data-item]:not([hidden])');
      });

      var scope = activePanel();
      var visible = scope.querySelectorAll('[data-item]:not([hidden])').length;
      if (countEl) {
        var noun = scope.getAttribute('data-noun') || root.getAttribute('data-noun') || 'result';
        var plural = scope.getAttribute('data-noun-plural') || root.getAttribute('data-noun-plural') || noun + 's';
        countEl.textContent = 'Showing ' + visible + ' ' + (visible === 1 ? noun : plural);
      }
      root.querySelectorAll('[data-empty]').forEach(function (e) {
        var inScope = scope === root || scope.contains(e);
        e.classList.toggle('is-visible', inScope && visible === 0);
      });

      var nActive = checks.filter(function (c) { return c.checked; }).length +
        chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true' && c.getAttribute('data-value') !== 'all'; }).length +
        (words.length ? 1 : 0);
      if (badge) { badge.textContent = nActive; badge.hidden = nActive === 0; }
    };

    var clearAll = function () {
      checks.forEach(function (c) { c.checked = false; });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-value') === 'all')); });
      if (search) search.value = '';
      apply();
    };

    checks.forEach(function (c) { c.addEventListener('change', apply); });
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var key = c.getAttribute('data-chip');
        chips.forEach(function (o) { if (o.getAttribute('data-chip') === key) o.setAttribute('aria-pressed', String(o === c)); });
        apply();
      });
    });
    if (search) {
      var t;
      search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(apply, 250); });
      var form = search.closest('form');
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(t); apply(); });
    }
    root.querySelectorAll('[data-clear]').forEach(function (b) {
      b.addEventListener('click', function () {
        clearAll();
        var focusTarget = root.querySelector('[data-filter-search]') || root;
        if (b.hasAttribute('data-clear-focus')) focusTarget.focus();
      });
    });

    if (sortSel) {
      var list = root.querySelector('[data-sort-list]');
      sortSel.addEventListener('change', function () {
        var mode = sortSel.value;
        var sorted = items.slice().sort(function (a, b) {
          if (mode === 'az') return a.getAttribute('data-title').localeCompare(b.getAttribute('data-title'));
          if (mode === 'adopted') return Number(b.getAttribute('data-adopted')) - Number(a.getAttribute('data-adopted'));
          return b.getAttribute('data-date').localeCompare(a.getAttribute('data-date'));
        });
        sorted.forEach(function (it) { list.appendChild(it); });
      });
    }

    root._apply = apply;
    apply();
  });

  /* ---------- 4. Tablist (Upcoming / Past) ---------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      var root = list.closest('[data-filter-root]');
      if (root && root._apply) root._apply();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---------- 5. Newsletter (preview only — nothing is sent) ---------- */
  document.querySelectorAll('[data-preview-form]').forEach(function (form) {
    var status = form.querySelector('[data-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.textContent = 'Thanks. This is a design preview, so nothing was sent.';
    });
  });
})();
