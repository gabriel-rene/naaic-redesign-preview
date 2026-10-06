/* NAAIC "Night glass" design preview — small, dependency-free behaviours. */
(function () {
  'use strict';

  /* ---------- Mobile menu (disclosure) ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var panel = document.getElementById('menu-panel');
  if (menuBtn && panel) {
    var setMenu = function (open) {
      menuBtn.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      if (open) { var first = panel.querySelector('a'); if (first) first.focus(); }
    };
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080) setMenu(false); });
  }

  /* ---------- Home finder: role + need -> page ---------- */
  var finder = document.querySelector('form.finder');
  if (finder) {
    finder.addEventListener('submit', function (e) {
      e.preventDefault();
      var role = finder.querySelector('#role').value;
      var need = finder.querySelector('#need').value;
      var audience = role === 'highschool' ? 'highschool' : 'college';
      var url = 'resources.html?audience=' + audience;
      if (need === 'events') url = 'events.html?audience=' + audience;
      if (need === 'training') url = 'events.html?type=training&audience=' + audience;
      window.location.href = url;
    });
  }

  /* ---------- Catalog filtering (Events + Resources) ---------- */
  var catalog = document.querySelector('[data-catalog]');
  if (catalog) {
    var items = Array.prototype.slice.call(catalog.querySelectorAll('[data-item]'));
    var boxes = Array.prototype.slice.call(catalog.querySelectorAll('.rail input[type="checkbox"]'));
    var search = catalog.querySelector('[data-search]');
    var countEl = catalog.querySelector('[data-count]');
    var empty = catalog.querySelector('[data-empty]');
    var sortSel = catalog.querySelector('[data-sort]');
    var noun = catalog.getAttribute('data-noun') || 'items';

    // Pre-select from the URL (e.g. ?audience=college from the Home finder)
    var params = new URLSearchParams(window.location.search);
    boxes.forEach(function (b) { if (params.get(b.name) === b.value) b.checked = true; });

    // Static facet counts
    boxes.forEach(function (b) {
      var n = items.filter(function (it) { return (it.getAttribute('data-' + b.name) || '').split(' ').indexOf(b.value) > -1; }).length;
      var c = b.parentElement.querySelector('.count'); if (c) c.textContent = n;
    });

    var activePanel = function () {
      var p = catalog.querySelector('[role="tabpanel"]:not([hidden])');
      return p || catalog;
    };

    var apply = function () {
      var groups = {};
      boxes.forEach(function (b) { if (b.checked) (groups[b.name] = groups[b.name] || []).push(b.value); });
      var q = search ? search.value.trim().toLowerCase() : '';
      items.forEach(function (it) {
        var ok = Object.keys(groups).every(function (g) {
          var vals = (it.getAttribute('data-' + g) || '').split(' ');
          return groups[g].some(function (v) { return vals.indexOf(v) > -1; });
        });
        if (ok && q) ok = it.textContent.toLowerCase().indexOf(q) > -1;
        it.hidden = !ok;
      });
      // hide empty month groups
      Array.prototype.forEach.call(catalog.querySelectorAll('[data-group]'), function (g) {
        g.hidden = !g.querySelector('[data-item]:not([hidden])');
      });
      var scope = activePanel();
      var shown = scope.querySelectorAll('[data-item]:not([hidden])').length;
      if (countEl) countEl.textContent = shown + ' ' + (shown === 1 ? noun.replace(/s$/, '') : noun);
      if (empty) empty.classList.toggle('show', shown === 0);
      var active = boxes.filter(function (b) { return b.checked; }).length;
      var ft = catalog.querySelector('.filters-toggle .n'); if (ft) ft.textContent = active ? ' (' + active + ')' : '';
    };

    boxes.forEach(function (b) { b.addEventListener('change', apply); });
    if (search) search.addEventListener('input', apply);
    Array.prototype.forEach.call(catalog.querySelectorAll('[data-clear]'), function (btn) {
      btn.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); if (search) search.value = ''; apply(); });
    });

    if (sortSel) {
      sortSel.addEventListener('change', function () {
        var list = catalog.querySelector('[data-sortable]');
        var arr = Array.prototype.slice.call(list.children);
        arr.sort(function (a, b) {
          if (sortSel.value === 'az') return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
          return (b.getAttribute('data-date') || '').localeCompare(a.getAttribute('data-date') || '');
        });
        arr.forEach(function (el) { list.appendChild(el); });
      });
    }

    // Filters disclosure (mobile)
    var ftBtn = catalog.querySelector('.filters-toggle');
    var rail = catalog.querySelector('.rail');
    if (ftBtn && rail) {
      ftBtn.addEventListener('click', function () {
        var open = ftBtn.getAttribute('aria-expanded') !== 'true';
        ftBtn.setAttribute('aria-expanded', String(open));
        rail.classList.toggle('open', open);
      });
    }

    // Tabs (Upcoming / Past) — WAI-ARIA tabs with arrow keys
    var tabs = Array.prototype.slice.call(catalog.querySelectorAll('[role="tab"]'));
    var select = function (tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      apply();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j]); tabs[j].focus(); }
      });
    });

    apply();
  }

  /* ---------- Home map (sample shading) ---------- */
  var mapEl = document.getElementById('map');
  if (mapEl && window.d3 && window.topojson) {
    var tiers = ['#c9d6ea', '#8fa6cf', '#5675b0', '#2d5195', '#1a365d'];
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json').then(function (r) { return r.json(); }).then(function (us) {
      var states = topojson.feature(us, us.objects.states).features;
      var svg = d3.select(mapEl).append('svg').attr('viewBox', '0 0 975 610').attr('aria-hidden', 'true').attr('focusable', 'false');
      var path = d3.geoPath();
      var big = ['Florida','California','Texas','New York','Illinois','North Carolina','Ohio','Pennsylvania','Michigan','Arizona','Georgia','Washington'];
      svg.append('g').selectAll('path').data(states).join('path')
        .attr('d', path)
        .attr('fill', function (d) { var n = d.properties.name; if (n === 'Florida') return tiers[4]; if (big.indexOf(n) > -1) return tiers[3]; return tiers[(n.length * 7) % 3]; })
        .attr('stroke', '#f1f5fb').attr('stroke-width', 1.2);
      var place = function () {
        var fl = states.filter(function (s) { return s.properties.name === 'Florida'; })[0];
        var b = path.bounds(fl);
        var card = mapEl.closest('.map-card').getBoundingClientRect();
        var box = mapEl.querySelector('svg').getBoundingClientRect();
        var k = box.width / 975;
        var pin = document.getElementById('pin');
        var x = (box.left - card.left) + (b[1][0] - 18) * k;
        var y = (box.top - card.top) + (b[1][1] - 34) * k;
        pin.style.left = Math.max(8, x - pin.offsetWidth + 14) + 'px';
        pin.style.top = (y - 36) + 'px';
      };
      place();
      window.addEventListener('resize', place);
    });
  }
})();
