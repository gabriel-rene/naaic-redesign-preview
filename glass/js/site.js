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

  /* ---------- Home finder: role -> its own "looking for" list -> page (client sheet) ---------- */
  var finder = document.querySelector('form[data-finder]');
  if (finder) {
    var map = JSON.parse(finder.getAttribute('data-finder'));
    var roleSel = finder.querySelector('#role');
    var needSel = finder.querySelector('#need');
    var fill = function () {
      needSel.innerHTML = '';
      (map[roleSel.value] || []).forEach(function (o) {
        var opt = document.createElement('option');
        opt.textContent = o[0]; opt.value = o[1];
        needSel.appendChild(opt);
      });
    };
    roleSel.addEventListener('change', fill);
    fill();
    finder.addEventListener('submit', function (e) {
      e.preventDefault();
      var url = needSel.value;
      if (url && url !== '#') window.location.href = url;
      else alert('This page is new in the redesign and is not built yet.');
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

  /* ---------- Home map (sample shading + lead-college stars) ---------- */
  var mapEl = document.getElementById('map');
  if (mapEl && window.d3 && window.topojson) {
    var tiers = ['#9fb6de', '#6e8fca', '#4468ad', '#2a4a8a', '#0d182c'];
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json').then(function (r) { return r.json(); }).then(function (us) {
      var states = topojson.feature(us, us.objects.states).features;
      var svg = d3.select(mapEl).append('svg').attr('viewBox', '0 0 975 610').attr('aria-hidden', 'true').attr('focusable', 'false');
      var path = d3.geoPath();
      var top = ['Florida', 'Texas', 'Arizona', 'California'];
      var big = ['New York','Illinois','North Carolina','Ohio','Pennsylvania','Michigan','Georgia','Washington'];
      svg.append('g').selectAll('path').data(states).join('path')
        .attr('d', path)
        .attr('fill', function (d) { var n = d.properties.name; if (top.indexOf(n) > -1) return tiers[4]; if (big.indexOf(n) > -1) return tiers[3]; return tiers[(n.length * 7) % 3]; })
        .attr('stroke', '#ffffff').attr('stroke-width', 1.2);
      // Same projection us-atlas used to pre-project states-albers-10m (975 x 610).
      var proj = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
      var leads = [[-80.37, 25.75], [-95.37, 29.76], [-111.93, 33.42]];   // MDC, HCC, MCCCD
      var star = function (cx, cy, R) {
        var pts = [];
        for (var i = 0; i < 10; i++) {
          var r = i % 2 ? R * 0.45 : R, a = Math.PI / 5 * i - Math.PI / 2;
          pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
        }
        return pts.join(' ');
      };
      svg.append('g').selectAll('polygon').data(leads).join('polygon')
        .attr('class', 'map-star')
        .attr('points', function (d) { var p = proj(d); return star(p[0], p[1], 22); });
    });
  }

  /* ---------- Quote carousel (WCAG 2.2.2: pause control; stops on hover/focus) ---------- */
  var car = document.querySelector('[data-carousel]');
  if (car) {
    var slides = Array.prototype.slice.call(car.querySelectorAll('.slide'));
    var live = car.querySelector('[data-slides]');
    var pauseBtn = car.querySelector('[data-pause]');
    var cur = 0, timer = null, userPaused = false;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var show = function (i) { cur = (i + slides.length) % slides.length; slides.forEach(function (s, j) { s.hidden = j !== cur; }); };
    var stop = function () { clearInterval(timer); timer = null; };
    var start = function () { if (!userPaused && !reduce && !timer) timer = setInterval(function () { show(cur + 1); }, 8000); };
    var manual = function (i) { live.setAttribute('aria-live', 'polite'); show(i); };
    car.querySelector('[data-prev]').addEventListener('click', function () { manual(cur - 1); });
    car.querySelector('[data-next]').addEventListener('click', function () { manual(cur + 1); });
    var setPaused = function (p) { userPaused = p; pauseBtn.setAttribute('aria-pressed', String(p)); pauseBtn.textContent = p ? 'Play' : 'Pause'; if (p) stop(); else start(); };
    pauseBtn.addEventListener('click', function () { setPaused(!userPaused); });
    if (reduce) { pauseBtn.hidden = true; }
    car.addEventListener('mouseenter', stop); car.addEventListener('mouseleave', start);
    car.addEventListener('focusin', stop); car.addEventListener('focusout', function (e) { if (!car.contains(e.relatedTarget)) start(); });
    start();
  }

  /* ---------- Partner logo marquee pause ---------- */
  var mq = document.querySelector('[data-marquee]');
  var mqBtn = document.querySelector('[data-marquee-pause]');
  if (mq && mqBtn) {
    mqBtn.addEventListener('click', function () {
      var p = !mq.classList.contains('paused');
      mq.classList.toggle('paused', p);
      mqBtn.setAttribute('aria-pressed', String(p));
      mqBtn.textContent = p ? 'Play' : 'Pause';
    });
  }

  /* ---------- Subscribe dialog (header + hero + footer open it) ---------- */
  var dlg = document.getElementById('subscribe');
  if (dlg && dlg.showModal) {
    var status = dlg.querySelector('[data-sub-status]');
    Array.prototype.forEach.call(document.querySelectorAll('[data-subscribe]'), function (b) {
      b.addEventListener('click', function () { status.textContent = ''; dlg.showModal(); });
    });
    dlg.querySelector('[data-sub-form]').addEventListener('submit', function (e) {
      if (e.submitter && e.submitter.value === 'subscribe') {
        e.preventDefault();
        status.textContent = 'Preview only: in the build this adds you to the NAAIC newsletter.';
      }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- Back to top ---------- */
  var toTop = document.querySelector('[data-to-top]');
  if (toTop) {
    var onScroll = function () { toTop.classList.toggle('show', window.scrollY > 700); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
