// =============================================================================
// incinerator-window.js — v3.20.0 Stage 4 Incinerator Window Renderer
// =============================================================================
// DOM glue for incinerator.html. Reads state, renders candidate cards with
// fuel previews, sorts/filters, runs Incinerator.burnEmployee on click,
// persists, and re-renders. Also cross-window syncs via storage.onChanged.
//
// Zero logic lives here — all fuel math and state mutation happens in
// incinerator.js.
// =============================================================================

(function() {
  'use strict';

  var state = null;
  var currentFilter = 'all'; // 'all' | 'dissident' | 'longest' | 'best'
  var notice = null;

  function $(id) { return document.getElementById(id); }

  function load(cb) {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        state = (result && result.pixelFocusState) || {};
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        if (!Array.isArray(state.incineratorLog)) state.incineratorLog = [];
        if (cb) cb();
      });
    } catch (e) {
      state = { personnelRoster: [], incineratorLog: [] };
      if (cb) cb();
    }
  }

  function save(cb) {
    try {
      chrome.storage.local.set({ pixelFocusState: state }, function() {
        if (cb) cb();
      });
    } catch (e) {
      if (cb) cb();
    }
  }

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(n) {
    n = n || 0;
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.floor(n);
  }

  function showNotice(text) {
    if (!notice) notice = $('incNotice');
    if (!notice) return;
    notice.textContent = text || '';
    notice.className = 'notice' + (text ? ' visible' : '');
  }

  function poolLabel(pool) {
    if (pool === 'wes') return 'Local eccentric';
    if (pool === 'stranger') return 'Quiet life';
    if (pool === 'migrant') return 'Recent arrival';
    return pool || '';
  }

  function renderHero() {
    var fuelPill   = $('incFuelPill');
    var burnedPill = $('incBurnedPill');
    var bonusPill  = $('incBonusPill');
    var dissPill   = $('incDissPill');
    var coinsPill  = $('incCoinsPill');

    var fuel = Incinerator.getTotalFuel(state);
    var burned = Incinerator.getBurnedCount(state);
    var bonus = Incinerator.getBonus(state);
    var dissCount = (typeof Personnel !== 'undefined' && Personnel && Personnel.dissidentCount)
      ? Personnel.dissidentCount(state) : 0;

    if (fuelPill)   fuelPill.textContent   = fuel + (fuel === 1 ? ' fuel unit' : ' fuel units');
    if (burnedPill) burnedPill.textContent = burned + (burned === 1 ? ' conversion' : ' conversions');
    if (bonusPill)  bonusPill.textContent  = '+' + (bonus * 100).toFixed(2) + '% passive';
    if (dissPill)   dissPill.textContent   = dissCount + (dissCount === 1 ? ' dissident' : ' dissidents');
    if (coinsPill)  coinsPill.textContent  = formatMoney(state.coins || 0);

    if (!state.incineratorUnlocked) {
      showNotice('The Incinerator has not yet been commissioned. Purchase the Commission the Incinerator upgrade in the factory to open the door.');
    } else {
      showNotice('');
    }
  }

  function getSortedRoster() {
    var roster = (state.personnelRoster || []).slice();
    if (currentFilter === 'dissident') {
      roster = roster.filter(function(e) { return e && e.dissident; });
    } else if (currentFilter === 'longest') {
      roster.sort(function(a, b) {
        return (a.hiredAt || 0) - (b.hiredAt || 0);
      });
    } else if (currentFilter === 'best') {
      roster.sort(function(a, b) {
        var af = Incinerator.previewFuel(a).fuel;
        var bf = Incinerator.previewFuel(b).fuel;
        return bf - af;
      });
    }
    return roster;
  }

  function renderGrid() {
    var grid = $('empGrid');
    if (!grid) return;
    var roster = getSortedRoster();
    if (roster.length === 0) {
      var msg = currentFilter === 'dissident'
        ? 'No dissidents on the roster. The floor is polite. (For now.)'
        : 'The intake list is empty. Hire more people in the factory first.';
      grid.innerHTML = '<div class="empty-state">' + esc(msg) + '</div>';
      return;
    }
    var disabled = state.incineratorUnlocked ? '' : ' disabled';
    var html = '';
    for (var i = 0; i < roster.length; i++) {
      var emp = roster[i];
      if (!emp) continue;
      var preview = Incinerator.previewFuel(emp);
      var tenure = Math.max(0, Math.floor((Date.now() - (emp.hiredAt || Date.now())) / (24 * 60 * 60 * 1000)));
      var dissTag = emp.dissident
        ? '<div class="emp-diss-tag">DISSIDENT &mdash; x2.0 yield</div>'
        : '';
      var cardClass = 'emp-card' + (emp.dissident ? ' dissident' : '');
      html += '<div class="' + cardClass + '">' +
                '<div class="emp-name">' + esc(emp.name) + '</div>' +
                '<div class="emp-pool ' + esc(emp.pool) + '">' + esc(poolLabel(emp.pool)) +
                  ' &middot; ' + tenure + (tenure === 1 ? ' day' : ' days') + ' tenure</div>' +
                '<div class="emp-meta">' + esc(emp.role) + '</div>' +
                dissTag +
                '<div class="emp-fuel">Yields ' + preview.fuel + ' fuel &rarr; ' +
                  formatMoney(preview.coins) + ' + ' +
                  (preview.bonus * 100).toFixed(2) + '% passive</div>' +
                '<div class="emp-actions">' +
                  '<button class="burn-btn" data-emp-id="' + esc(emp.id) + '"' + disabled + '>BURN</button>' +
                '</div>' +
              '</div>';
    }
    grid.innerHTML = html;

    var btns = grid.querySelectorAll('button.burn-btn');
    for (var b = 0; b < btns.length; b++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var empId = btn.getAttribute('data-emp-id');
          handleBurn(empId);
        });
      })(btns[b]);
    }
  }

  function renderLog() {
    var el = $('logList');
    if (!el) return;
    var log = (state.incineratorLog || []).slice();
    log.reverse();
    if (log.length === 0) {
      el.innerHTML = '<div class="empty-state">The conversion ledger is blank. The hatch has not been used.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < log.length; i++) {
      var h = log[i];
      var cls = 'log-entry' + (h.wasDissident ? ' dissident' : '');
      var tag = h.wasDissident ? 'DISSIDENT' : 'CONVERTED';
      html += '<div class="' + cls + '">' +
                '<div class="log-head">' +
                  '<span>' + esc(h.subjectName || '') + ' &mdash; ' + esc(h.subjectRole || '') + '</span>' +
                  '<span>' + tag + '</span>' +
                '</div>' +
                '<div class="log-line">' +
                  h.fuel + ' fuel produced &middot; tenure ' + (h.tenureDays || 0) + ' days' +
                '</div>' +
                '<div class="log-reward">+' + formatMoney(h.coins) +
                  (h.bonusDelta > 0 ? ' &middot; +' + (h.bonusDelta * 100).toFixed(2) + '% passive' : '') +
                '</div>' +
              '</div>';
    }
    el.innerHTML = html;
  }

  function handleBurn(empId) {
    if (!state.incineratorUnlocked) {
      showNotice('The Incinerator has not yet been commissioned.');
      return;
    }
    var result = Incinerator.burnEmployee(state, empId);
    if (!result || !result.ok) {
      showNotice((result && result.error) || 'The hatch would not close.');
      return;
    }
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        var who = result.employee && result.employee.name;
        var tag = result.employee && result.employee.wasDissident ? ' [DISSIDENT]' : '';
        MsgLog.push('>> [INCINERATOR] ' + who + tag + ' converted to ' + result.fuel + ' fuel (+' + formatMoney(result.coins) + ').');
      }
    } catch (_) {}

    save(function() {
      renderHero();
      renderGrid();
      renderLog();
    });
  }

  function openWindow(path) {
    try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
  }

  load(function() {
    try {
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.reconcileRoster) {
        var hired = Personnel.reconcileRoster(state);
        if (hired > 0) save();
      }
    } catch (_) {}

    renderHero();
    renderGrid();
    renderLog();

    // Filter buttons
    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          for (var j = 0; j < filterBtns.length; j++) filterBtns[j].classList.remove('active');
          btn.classList.add('active');
          currentFilter = btn.getAttribute('data-filter') || 'all';
          renderGrid();
        });
      })(filterBtns[i]);
    }

    // Nav buttons
    var f = $('backToFactoryBtn');   if (f) f.addEventListener('click', function() { openWindow('factory.html'); });
    // v3.20.0 Stage 5: HOUSE nav — from the incinerator the player can
    // still technically walk home, unless the land bridge has been
    // commissioned, in which case house-window.js renders the denial.
    var h = $('toHouseBtn');         if (h) h.addEventListener('click', function() { openWindow('house.html'); });
    var e = $('toEmployeesBtn');     if (e) e.addEventListener('click', function() { openWindow('employees.html'); });
    var r = $('toResearchBtn');      if (r) r.addEventListener('click', function() { openWindow('research.html'); });
    var t = $('backToTrackerBtn');   if (t) t.addEventListener('click', function() { openWindow('popup.html'); });

    // Live sync
    try {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area !== 'local' || !changes.pixelFocusState) return;
        var newState = changes.pixelFocusState.newValue;
        if (!newState) return;
        state = newState;
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        if (!Array.isArray(state.incineratorLog)) state.incineratorLog = [];
        renderHero();
        renderGrid();
        renderLog();
      });
    } catch (_) {}
  });

})();
