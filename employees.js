// =============================================================================
// employees.js — v3.20.0 Stage 2 Employee Management Center
// =============================================================================
// Renders the personnel roster in a full-window grid of cards. Reads from
// state.personnelRoster (which personnel.js maintains) and supports:
//   - search (case-insensitive across name / role / region / bio)
//   - filter by pool (All / Wes / Stranger / Migrant)
//   - sort (newest, oldest, name, role)
//
// This file is a standalone window script — it loads its own state copy
// via chrome.storage.local and responds to storage.onChanged so the
// roster stays fresh if the player buys more employees in the factory
// while this tab is open. It does NOT mutate the roster: the factory
// is the sole source of hires (Personnel.reconcileRoster is called from
// factory.js on purchase and app.js on load).
// =============================================================================

(function() {
  'use strict';

  var state = null;
  var currentFilter = 'all';
  var currentSort = 'hired-new';
  var searchTerm = '';

  function $(id) { return document.getElementById(id); }

  // ---------------------------------------------------------------------------
  // Load state from chrome.storage.local. Safe against missing roster.
  // ---------------------------------------------------------------------------
  function load(cb) {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        state = (result && result.pixelFocusState) || {};
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        if (cb) cb();
      });
    } catch (e) {
      state = { personnelRoster: [] };
      if (cb) cb();
    }
  }

  // ---------------------------------------------------------------------------
  // Escape HTML to keep migrant story text etc. safe against injection.
  // Bios are built from hard-coded pools but we still sanitize by habit.
  // ---------------------------------------------------------------------------
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // Filter + sort + render the roster into the grid.
  // ---------------------------------------------------------------------------
  function renderRoster() {
    var roster = (state && Array.isArray(state.personnelRoster)) ? state.personnelRoster.slice() : [];
    var heroCount = $('empHeroCount');
    var heroSub   = $('empHeroSub');
    var breakdown = $('empPoolBreakdown');
    var grid      = $('empRoster');
    var empty     = $('empEmpty');
    if (!grid) return;

    // Headline count + roster breakdown (based on the UNFILTERED roster)
    if (heroCount) heroCount.textContent = String(roster.length);
    var bCounts = { recent: 0, established: 0, flagged: 0 };
    for (var i = 0; i < roster.length; i++) {
      var emp = roster[i];
      if (!emp) continue;
      var td = 0;
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.tenureDays) {
        td = Personnel.tenureDays(emp);
      }
      if (td <= 14) bCounts.recent++;
      else bCounts.established++;
      if (emp.dissident || (emp.stress || 0) > 0) bCounts.flagged++;
    }
    if (breakdown) {
      if (roster.length > 0) {
        breakdown.style.display = 'flex';
        var cRec = $('chipWes'); if (cRec) cRec.textContent = 'Recent: ' + bCounts.recent;
        var cEst = $('chipStranger'); if (cEst) cEst.textContent = 'Established: ' + bCounts.established;
        var cFlg = $('chipMigrant'); if (cFlg) cFlg.textContent = 'Flagged: ' + bCounts.flagged;
      } else {
        breakdown.style.display = 'none';
      }
    }
    if (heroSub) {
      if (roster.length === 0) {
        heroSub.textContent = 'The Employee Management Center is not yet staffed. Purchase the Hire Employees upgrade in the factory to begin building a roster.';
      } else {
        var empLvl = state.employeesLevel || 0;
        heroSub.textContent = 'Hire Employees upgrade at level ' + empLvl + '. The standing office updates this file without consulting the craftsman, except in writing.';
      }
    }

    // Empty state: hide grid, show placeholder
    if (roster.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    // Apply roster filter (All / Recent / Established / Flagged)
    var filtered = roster.filter(function(e) {
      if (!e) return false;
      if (currentFilter === 'all') return true;
      if (currentFilter === 'flagged') {
        return !!e.dissident || (e.stress || 0) > 0;
      }
      var tDays = 0;
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.tenureDays) {
        tDays = Personnel.tenureDays(e);
      }
      if (currentFilter === 'new') return tDays <= 14;
      if (currentFilter === 'established') return tDays > 14;
      return true;
    });

    // Apply search
    var q = (searchTerm || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(function(e) {
        if (!e) return false;
        var hay = (e.name || '') + ' ' + (e.role || '') + ' ' + (e.region || '') + ' ' + (e.bio || '');
        return hay.toLowerCase().indexOf(q) !== -1;
      });
    }

    // Apply sort
    filtered.sort(function(a, b) {
      switch (currentSort) {
        case 'hired-old':
          return (a.hiredAt || 0) - (b.hiredAt || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'role':
          return (a.role || '').localeCompare(b.role || '');
        case 'hired-new':
        default:
          return (b.hiredAt || 0) - (a.hiredAt || 0);
      }
    });

    // Render cards
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; display:block;">' +
                       '<span class="big">NO MATCHES</span>' +
                       'No employees match the current filter or search.' +
                       '</div>';
      return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
      var emp = filtered[j];
      var poolClass = 'pool-' + (emp.pool || 'stranger');
      var tenure = 0;
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.tenureDays) {
        tenure = Personnel.tenureDays(emp);
      }
      var tenureLabel;
      if (tenure <= 0)      tenureLabel = 'hired today';
      else if (tenure === 1) tenureLabel = '1 day on the books';
      else                   tenureLabel = tenure + ' days on the books';
      // v3.20.0 Stage 4: surface the dissident flag on the card. Adds a
      // "dissident" class to the wrapper (CSS handles the red border)
      // and a short tag near the name so the player cannot miss it.
      // Also shows a small stress meter for employees past stress > 0.
      var dissClass = emp.dissident ? ' dissident' : '';
      var dissTag = '';
      if (emp.dissident) {
        var reason = emp.dissidentReason || 'Stopped cooperating.';
        dissTag = '<div class="emp-diss-tag" title="' + esc(reason) + '">DISSIDENT</div>';
      } else if ((emp.stress || 0) > 0) {
        dissTag = '<div class="emp-stress-tag" title="Recent stress from the Research Lab.">Stress: ' + (emp.stress || 0) + '/5</div>';
      }
      html += '<div class="emp-card ' + esc(poolClass) + dissClass + '">' +
                '<div class="emp-name">' + esc(emp.name) + '</div>' +
                '<div class="emp-role">' + esc(emp.role) + '</div>' +
                '<div class="emp-region">' + esc(emp.region) + '</div>' +
                '<div class="emp-bio">' + esc(emp.bio) + '</div>' +
                dissTag +
                '<div class="emp-meta">' +
                  '<span>#' + esc(emp.id) + '</span>' +
                  '<span>' + esc(tenureLabel) + '</span>' +
                '</div>' +
              '</div>';
    }
    grid.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Cross-window nav helpers (same pattern as factory.js / gallery.js)
  // ---------------------------------------------------------------------------
  function openWindow(path) {
    try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  load(function() {
    // Reconcile roster on open in case the player upgraded employees in
    // another window while this one was closed. Safe no-op when the
    // roster is already at target size.
    try {
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.reconcileRoster) {
        var hired = Personnel.reconcileRoster(state);
        if (hired > 0) {
          // Persist the newly-hired employees.
          try {
            chrome.storage.local.set({ pixelFocusState: state });
          } catch (_) {}
        }
      }
    } catch (_) {}

    renderRoster();

    // Wire search input
    var searchBox = $('empSearch');
    if (searchBox) {
      searchBox.addEventListener('input', function() {
        searchTerm = searchBox.value || '';
        renderRoster();
      });
    }

    // Wire filter buttons
    var filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter') || 'all';
        renderRoster();
      });
    });

    // Wire sort dropdown
    var sortSel = $('empSort');
    if (sortSel) {
      sortSel.addEventListener('change', function() {
        currentSort = sortSel.value || 'hired-new';
        renderRoster();
      });
    }

    // Wire nav buttons
    var backFactory = $('backToFactoryBtn');
    if (backFactory) {
      backFactory.addEventListener('click', function() { openWindow('factory.html'); });
    }
    var backTracker = $('backToTrackerBtn');
    if (backTracker) {
      backTracker.addEventListener('click', function() { openWindow('popup.html'); });
    }
    // v3.20.0 Stage 5: HOUSE nav button (always visible from personnel).
    var toHouse = $('toHouseBtn');
    if (toHouse) {
      toHouse.addEventListener('click', function() { openWindow('house.html'); });
    }
    // v3.20.0 Stage 3: RESEARCH nav button (hidden until the lab is open).
    var toResearch = $('toResearchBtn');
    if (toResearch) {
      if (state && state.researchLabUnlocked) toResearch.style.display = '';
      toResearch.addEventListener('click', function() { openWindow('research.html'); });
    }
    // v3.20.0 Stage 4: INCINERATOR nav button (hidden until Tier-7).
    var toIncinerator = $('toIncineratorBtn');
    if (toIncinerator) {
      if (state && state.incineratorUnlocked) toIncinerator.style.display = '';
      toIncinerator.addEventListener('click', function() { openWindow('incinerator.html'); });
    }
    // v3.21.0 Stage 1: BUREAU nav button (hidden until commissioned).
    var toBureau = $('toBureauBtn');
    if (toBureau) {
      if (state && state.bureauUnlocked) toBureau.style.display = '';
      toBureau.addEventListener('click', function() { openWindow('bureau.html'); });
    }

    // Live-sync: if the roster grows from another window (factory
    // purchase), re-render automatically.
    try {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area !== 'local' || !changes.pixelFocusState) return;
        var newState = changes.pixelFocusState.newValue;
        if (!newState) return;
        state = newState;
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        renderRoster();
      });
    } catch (_) {}

    // Mount the shared msg log console if the page has a host for it.
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && typeof MsgLog.mount === 'function') {
        if (document.getElementById('msgConsole')) MsgLog.mount('msgConsole');
      }
    } catch (_) {}
  });

})();
