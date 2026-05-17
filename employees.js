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
      // v3.23.349: FIRE button — disabled if employee is on Bureau assignment
      var isAssigned = !!(emp.assignment);
      var fireDisabled = isAssigned ? ' disabled title="Cannot fire — currently on Bureau assignment."' : '';
      var fireBtnHtml = '<button class="emp-fire-btn" data-fire-id="' + esc(emp.id) + '"' + fireDisabled
        + ' title="Terminate this employee. Permanent. Dissidents and stressed employees may sabotage on the way out."'
        + '>FIRE</button>';

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
                fireBtnHtml +
              '</div>';
    }
    grid.innerHTML = html;

    // Wire FIRE button click handlers
    var fireBtns = grid.querySelectorAll('.emp-fire-btn:not([disabled])');
    fireBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var empId = btn.getAttribute('data-fire-id');
        showFireConfirmation(empId);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // v3.23.349: FIRE confirmation modal + sabotage system
  // ---------------------------------------------------------------------------

  // Sabotage event pool — fired employees (especially dissidents) may retaliate
  var SABOTAGE_EVENTS = [
    { id: 'stolen_petty_cash', label: 'Petty cash stolen', desc: 'cleaned out the petty cash drawer on the way out.', costMin: 50, costMax: 300 },
    { id: 'stolen_supplies', label: 'Supplies stolen', desc: 'took a crate of dye supplies. The stock room is lighter.', costMin: 100, costMax: 500 },
    { id: 'broken_loom', label: 'Loom sabotaged', desc: 'jammed a shuttle into the main loom. Repair costs apply.', costMin: 200, costMax: 800 },
    { id: 'poisoned_morale', label: 'Morale poisoned', desc: 'gave a speech in the car park on the way out. Two employees are now questioning their life choices.', stressOthers: 2 },
    { id: 'leaked_secrets', label: 'Trade secrets leaked', desc: 'mailed a competitor your dye formulas. The envelope was stamped "PERSONAL."', costMin: 300, costMax: 1200 },
    { id: 'recruited_dissidents', label: 'Recruited dissidents', desc: 'convinced a colleague to stop cooperating. A new dissident has emerged.', makeDissidents: 1 },
    { id: 'arson_attempt', label: 'Arson attempt', desc: 'tried to set fire to the breakroom. The damage was minor. The intent was not.', costMin: 500, costMax: 2000 },
    { id: 'filed_complaint', label: 'Filed a complaint', desc: 'filed a complaint with the guild. An inspector will be visiting. It will cost you.', costMin: 150, costMax: 600 },
    { id: 'stole_client_list', label: 'Client list stolen', desc: 'copied your client ledger. Three orders were cancelled by the end of the week.', costMin: 400, costMax: 1500 },
    { id: 'spread_rumors', label: 'Rumors spread', desc: 'told anyone who would listen that your textiles are made from sawdust. Some believed it.', costMin: 100, costMax: 400 }
  ];

  // Calculate sabotage chance based on employee state
  function sabotageChance(emp) {
    if (!emp) return 0;
    var base = 0.10; // 10% base chance for any firing
    if (emp.dissident) base = 0.65; // dissidents retaliate 65% of the time
    else if ((emp.stress || 0) >= 3) base = 0.40; // high stress = 40%
    else if ((emp.stress || 0) >= 1) base = 0.20; // some stress = 20%
    // Tenure increases chance slightly — long-timers know where things are
    var tenure = 0;
    if (typeof Personnel !== 'undefined' && Personnel.tenureDays) tenure = Personnel.tenureDays(emp);
    if (tenure > 30) base = Math.min(0.85, base + 0.10);
    return base;
  }

  // Roll and apply sabotage
  function rollSabotage(emp) {
    var chance = sabotageChance(emp);
    if (Math.random() >= chance) return null; // no sabotage

    // Pick a random event — dissidents get access to worse ones
    var pool = SABOTAGE_EVENTS.slice();
    if (!emp.dissident) {
      // Non-dissidents can't do the really bad stuff
      pool = pool.filter(function(e) {
        return e.id !== 'arson_attempt' && e.id !== 'recruited_dissidents' && e.id !== 'leaked_secrets';
      });
    }
    var event = pool[Math.floor(Math.random() * pool.length)];
    var result = { event: event, name: emp.name, costs: 0 };

    // Apply monetary cost
    if (event.costMin && event.costMax) {
      var cost = Math.floor(event.costMin + Math.random() * (event.costMax - event.costMin));
      state.coins = Math.max(0, (state.coins || 0) - cost);
      result.costs = cost;
    }

    // Apply stress to random other employees
    if (event.stressOthers && state.personnelRoster && state.personnelRoster.length > 0) {
      var targets = state.personnelRoster.filter(function(e) { return e && e.id !== emp.id && !e.dissident; });
      var count = Math.min(event.stressOthers, targets.length);
      for (var i = 0; i < count; i++) {
        var idx = Math.floor(Math.random() * targets.length);
        if (typeof Personnel !== 'undefined' && Personnel.addStress) {
          Personnel.addStress(targets[idx], 1, 'Demoralized by ' + emp.name + '\'s departure speech.');
        }
        targets.splice(idx, 1);
      }
    }

    // Create a new dissident from an existing employee
    if (event.makeDissidents && state.personnelRoster && state.personnelRoster.length > 0) {
      var candidates = state.personnelRoster.filter(function(e) { return e && e.id !== emp.id && !e.dissident; });
      if (candidates.length > 0) {
        var pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (typeof Personnel !== 'undefined' && Personnel.markDissident) {
          Personnel.markDissident(pick, 'Recruited by ' + emp.name + ' on their way out.');
          result.newDissident = pick.name;
        }
      }
    }

    return result;
  }

  // Show sabotage result banner
  function showSabotageBanner(result) {
    // Remove any existing banner
    var old = document.querySelector('.sabotage-banner');
    if (old) old.remove();

    var banner = document.createElement('div');
    if (result) {
      banner.className = 'sabotage-banner';
      var titleHtml = '<div class="sabotage-banner-title bad">SABOTAGE: ' + esc(result.event.label).toUpperCase() + '</div>';
      var textHtml = '<div class="sabotage-banner-text">' + esc(result.name) + ' ' + esc(result.event.desc) + '</div>';
      var costHtml = '';
      if (result.costs > 0) costHtml = '<div class="sabotage-banner-cost">-$' + result.costs + '</div>';
      if (result.newDissident) {
        costHtml += '<div class="sabotage-banner-cost" style="color:var(--gold);">' + esc(result.newDissident) + ' is now a dissident</div>';
      }
      banner.innerHTML = titleHtml + textHtml + costHtml;
    } else {
      banner.className = 'sabotage-banner clean';
      banner.innerHTML = '<div class="sabotage-banner-title clean">CLEAN DEPARTURE</div>'
        + '<div class="sabotage-banner-text">The employee left quietly. No incidents reported.</div>';
    }
    document.body.appendChild(banner);
    setTimeout(function() { if (banner.parentNode) banner.remove(); }, result ? 6000 : 3000);
  }

  // Show the fire confirmation modal
  function showFireConfirmation(empId) {
    var emp = null;
    if (typeof Personnel !== 'undefined' && Personnel.findById) {
      emp = Personnel.findById(state, empId);
    }
    if (!emp) return;

    var chance = sabotageChance(emp);
    var pctLabel = Math.round(chance * 100) + '%';
    var riskColor = chance >= 0.5 ? '#ff4466' : (chance >= 0.25 ? '#ffa500' : '#00ff88');

    var overlay = document.createElement('div');
    overlay.className = 'fire-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'fire-modal';
    modal.innerHTML = '<div class="fire-modal-title">TERMINATE EMPLOYEE</div>'
      + '<div class="fire-modal-name">' + esc(emp.name) + '</div>'
      + '<div class="fire-modal-warning">'
      + esc(emp.role) + ' • ' + esc(emp.region)
      + '<br><br>This is <strong>permanent</strong>. ' + esc(emp.name) + ' will be removed from the roster and cannot be rehired.'
      + '<br><br>Sabotage risk: <strong style="color:' + riskColor + ';">' + pctLabel + '</strong>'
      + (emp.dissident ? '<br><span style="color:#ff4466;">Dissidents almost always retaliate.</span>' : '')
      + ((emp.stress || 0) >= 3 ? '<br><span style="color:var(--gold);">High stress employees are unpredictable.</span>' : '')
      + '</div>'
      + '<div class="fire-modal-actions">'
      + '<button class="fire-modal-btn confirm">FIRE THEM</button>'
      + '<button class="fire-modal-btn cancel">KEEP</button>'
      + '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Wire buttons
    var confirmBtn = modal.querySelector('.fire-modal-btn.confirm');
    var cancelBtn = modal.querySelector('.fire-modal-btn.cancel');

    confirmBtn.addEventListener('click', function() {
      overlay.remove();
      executeFireEmployee(empId);
    });
    cancelBtn.addEventListener('click', function() {
      overlay.remove();
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  // Execute the actual firing
  function executeFireEmployee(empId) {
    var emp = null;
    if (typeof Personnel !== 'undefined' && Personnel.findById) {
      emp = Personnel.findById(state, empId);
    }
    if (!emp) return;

    // Roll sabotage BEFORE removing (need the emp object)
    var sabResult = rollSabotage(emp);

    // Remove from roster
    if (typeof Personnel !== 'undefined' && Personnel.removeById) {
      Personnel.removeById(state, empId);
    }

    // Log to house feed if available
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // We'll save and let the house feed pick it up from the departure log
      }
    } catch (_) {}

    // Save state
    try {
      chrome.storage.local.set({ pixelFocusState: state });
    } catch (_) {}

    // Show result
    showSabotageBanner(sabResult);

    // Re-render
    renderRoster();
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
