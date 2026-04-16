// =============================================================================
// bureau-window.js — v3.21.0 Stage 1 — Bureau window renderer (DOM glue)
// =============================================================================
// DOM glue for bureau.html. Reads state from chrome.storage.local, renders
// slot cards, operation cards, and history. Dispatches user actions into
// window.Bureau (relocate / return / runOperation). No game logic here.
// =============================================================================

(function() {
  'use strict';

  var state = null;
  var notice = null;
  var tickTimer = null;

  function $(id) { return document.getElementById(id); }

  // ---------------------------------------------------------------------------
  // Load / save
  // ---------------------------------------------------------------------------
  function load(cb) {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        state = (result && result.pixelFocusState) || {};
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        Bureau.ensureState(state);
        if (cb) cb();
      });
    } catch (e) {
      state = { personnelRoster: [] };
      Bureau.ensureState(state);
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

  // ---------------------------------------------------------------------------
  // Utility
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

  function formatMoney(n) {
    n = n || 0;
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.floor(n);
  }

  function showNotice(text, kind) {
    if (!notice) notice = $('bureauNotice');
    if (!notice) return;
    notice.textContent = text || '';
    notice.className = 'notice' + (text ? ' visible' : '') + (kind ? ' ' + kind : '');
  }

  function heatLabel(h) {
    if (h >= 70) return 'Heat: critical';
    if (h >= 40) return 'Heat: elevated';
    if (h >= 15) return 'Heat: moderate';
    return 'Heat: low';
  }

  // ---------------------------------------------------------------------------
  // Hero
  // ---------------------------------------------------------------------------
  function renderHero() {
    var coins    = $('bureauCoinsPill');
    var agents   = $('bureauAgentsPill');
    var roster   = $('bureauRosterPill');
    var ops      = $('bureauOpsPill');
    var blown    = $('bureauBlownPill');
    var heatPill = $('bureauHeatPill');

    if (coins) coins.textContent = formatMoney(state.coins || 0);

    var postedCount = 0;
    var map = state.bureauAgents || {};
    for (var k in map) if (map[k]) postedCount++;

    if (agents) agents.textContent = postedCount + (postedCount === 1 ? ' agent posted' : ' agents posted');

    var rosterArr = state.personnelRoster || [];
    // "on roster" means still on the loom floor (not currently relocated)
    var floorCount = 0;
    for (var i = 0; i < rosterArr.length; i++) {
      if (rosterArr[i] && !rosterArr[i].assignment) floorCount++;
    }
    if (roster) roster.textContent = floorCount + (floorCount === 1 ? ' on roster' : ' on roster');

    if (ops)   ops.textContent   = (state.bureauOpsRun || 0) + ((state.bureauOpsRun || 0) === 1 ? ' operation' : ' operations');
    if (blown) blown.textContent = (state.bureauBlown  || 0) + ((state.bureauBlown  || 0) === 1 ? ' burned'    : ' burned');

    if (heatPill) {
      var h = state.bureauHeat || 0;
      if (h > 0) {
        heatPill.style.display = '';
        heatPill.textContent = heatLabel(h) + ' (' + h + ')';
      } else {
        heatPill.style.display = 'none';
      }
    }

    if (!state.bureauUnlocked) {
      showNotice('The Bureau has not yet been commissioned. Purchase the Bureau upgrade in the factory to open the door.', 'locked');
    } else if (!notice || !notice.classList.contains('sticky')) {
      showNotice('', null);
    }
  }

  // ---------------------------------------------------------------------------
  // Slot grid
  // ---------------------------------------------------------------------------
  function rosterFloorEligibleForSlot(slot) {
    var out = [];
    var r = state.personnelRoster || [];
    for (var i = 0; i < r.length; i++) {
      var e = r[i];
      if (!e) continue;
      if (e.assignment) continue;          // already assigned somewhere
      if (e.dissident)  continue;          // dissidents are not postable
      var sen = Bureau.deriveSeniority(e);
      if (sen < (slot.minSeniority || 1)) continue;
      out.push(e);
    }
    return out;
  }

  function renderSlots() {
    var grid = $('slotGrid');
    if (!grid) return;
    var slots = Bureau.getSlots();
    var html = '';
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var empId = (state.bureauAgents || {})[slot.id];
      var emp = null;
      if (empId && typeof Personnel !== 'undefined' && Personnel.findById) {
        emp = Personnel.findById(state, empId);
      }
      var occupiedCls = emp ? ' occupied' : '';
      var agentHtml;
      if (emp) {
        var sen = Bureau.deriveSeniority(emp);
        var loy = Bureau.deriveLoyalty(emp);
        agentHtml =
          '<div class="slot-agent">' +
            '<span class="codename">' + esc(emp.name) + '</span>' +
            ' &mdash; <span>' + esc(emp.role || '') + '</span>' +
          '</div>' +
          '<div class="slot-stats">' +
            '<span class="chip seniority" title="Derived seniority from tenure on the loom floor.">S' + sen + '</span>' +
            '<span class="chip loyalty"   title="Derived loyalty from inverse stress.">L' + loy + '</span>' +
            '<span class="chip heatc"     title="Stress level (0&ndash;100).">Stress ' + (emp.stress || 0) + '</span>' +
          '</div>' +
          '<div class="slot-actions">' +
            '<button class="slot-btn return" data-slot="' + esc(slot.id) + '" title="Rotate this agent back to the loom floor. Adds a small stress hit.">RETURN</button>' +
          '</div>';
      } else {
        var eligibles = rosterFloorEligibleForSlot(slot);
        var optsHtml = '<option value="">(no eligible personnel)</option>';
        if (eligibles.length) {
          var parts = ['<option value="">Post a subject\u2026</option>'];
          for (var j = 0; j < eligibles.length; j++) {
            var e = eligibles[j];
            var sen2 = Bureau.deriveSeniority(e);
            var loy2 = Bureau.deriveLoyalty(e);
            parts.push('<option value="' + esc(e.id) + '">' +
                        esc(e.name) + ' \u2014 ' + esc(e.role) +
                        ' (S' + sen2 + ' / L' + loy2 + ')' +
                      '</option>');
          }
          optsHtml = parts.join('');
        }
        agentHtml =
          '<div class="slot-agent"><span class="empty">Unfilled post</span></div>' +
          '<div class="slot-stats">' +
            '<span class="chip seniority" title="Minimum seniority required to post here.">&ge; S' + (slot.minSeniority || 1) + '</span>' +
          '</div>' +
          '<div class="slot-actions">' +
            '<select class="relocate-select" data-slot="' + esc(slot.id) + '">' + optsHtml + '</select>' +
            '<button class="slot-btn" data-slot="' + esc(slot.id) + '" data-action="post" title="Relocate the selected employee into this post.">POST</button>' +
          '</div>';
      }
      html += '<div class="slot-card' + occupiedCls + '">' +
                '<div class="slot-title">' + esc(slot.title) + '</div>' +
                '<div class="slot-sub">' + esc(slot.subtitle || '') + '</div>' +
                agentHtml +
              '</div>';
    }
    grid.innerHTML = html;

    // Wire POST
    var postBtns = grid.querySelectorAll('button.slot-btn[data-action="post"]');
    for (var p = 0; p < postBtns.length; p++) {
      (function(btn){
        btn.addEventListener('click', function() {
          var slotId = btn.getAttribute('data-slot');
          var card   = btn.closest('.slot-card');
          var sel    = card && card.querySelector('select.relocate-select');
          var empId  = sel && sel.value;
          if (!empId) { showNotice('Select an employee before posting them.'); return; }
          var r = Bureau.relocateEmployee(state, empId, slotId);
          if (!r.ok) { showNotice(r.error || 'Cannot post that employee.'); return; }
          showNotice(r.employeeName + ' posted to the ' + (Bureau.getSlotById(slotId) || {}).title + '.');
          save(function() { renderAll(); });
        });
      })(postBtns[p]);
    }
    // Wire RETURN
    var returnBtns = grid.querySelectorAll('button.slot-btn.return');
    for (var q = 0; q < returnBtns.length; q++) {
      (function(btn){
        btn.addEventListener('click', function() {
          var slotId = btn.getAttribute('data-slot');
          var r = Bureau.returnAgent(state, slotId);
          if (!r.ok) { showNotice(r.error || 'Cannot return agent.'); return; }
          showNotice((r.employeeName || 'The agent') + ' has been rotated back to the loom floor.');
          save(function() { renderAll(); });
        });
      })(returnBtns[q]);
    }
  }

  // ---------------------------------------------------------------------------
  // Operations
  // ---------------------------------------------------------------------------
  function oddsPct(outcomes, key) {
    if (!outcomes) return 0;
    var total = (outcomes.success || 0) + (outcomes.partial || 0) + (outcomes.blown || 0);
    if (total <= 0) return 0;
    return Math.round(((outcomes[key] || 0) / total) * 100);
  }

  function renderOperations() {
    var listEl = $('opList');
    if (!listEl) return;
    var ops = Bureau.getOperations();
    var html = '';
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      var avail = Bureau.operationAvailability(state, op);
      var succ = oddsPct(op.outcomes, 'success');
      var part = oddsPct(op.outcomes, 'partial');
      var blwn = oddsPct(op.outcomes, 'blown');
      var disabled = avail ? ' disabled' : '';
      var reasonHtml = avail ? '<div class="op-unavailable">' + esc(avail.reason) + '</div>' : '';
      var slotLabel = (Bureau.getSlotById(op.slot) || {}).title || op.slot;
      var gateStr = 'Needs: ' + slotLabel + ' &middot; S' + (op.minSeniority || 1) + '+ / L' + (op.minLoyalty || 1) + '+';
      html += '<div class="op-card" data-op-id="' + esc(op.id) + '">' +
                '<div class="op-title">' + esc(op.title) + '</div>' +
                '<div class="op-sub">' + esc(op.subtitle || '') + '</div>' +
                '<div class="op-desc">' + esc(op.desc) + '</div>' +
                '<div class="op-meta">' +
                  '<span class="odds-chip success">Success ' + succ + '%</span>' +
                  '<span class="odds-chip partial">Partial ' + part + '%</span>' +
                  '<span class="odds-chip blown">Blown ' + blwn + '%</span>' +
                  '<span>' + gateStr + '</span>' +
                '</div>' +
                '<div class="op-actions">' +
                  '<span class="op-cost">$' + (op.cost || 0) + '</span>' +
                  '<button class="run-op-btn" data-op-id="' + esc(op.id) + '"' + disabled + '>RUN</button>' +
                '</div>' +
                reasonHtml +
              '</div>';
    }
    listEl.innerHTML = html;

    var runBtns = listEl.querySelectorAll('button.run-op-btn');
    for (var r = 0; r < runBtns.length; r++) {
      (function(btn){
        btn.addEventListener('click', function() {
          var opId = btn.getAttribute('data-op-id');
          handleRunOp(opId);
        });
      })(runBtns[r]);
    }
  }

  function handleRunOp(opId) {
    var result = Bureau.runOperation(state, opId);
    if (!result || !result.ok) {
      showNotice((result && result.error) || 'The Bureau cannot run that operation right now.');
      return;
    }
    // Mirror outcome into MsgLog
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        var tag = result.outcome === 'blown' ? 'BLOWN'
                : result.outcome === 'success' ? 'SUCCESS' : 'PARTIAL';
        MsgLog.push('>> [BUREAU ' + tag + '] ' + result.opTitle + ' \u2014 ' + result.agentName + '.');
      }
    } catch (_) {}
    showNotice(result.line + (result.reward ? ' \u2014 ' + result.reward : ''));
    save(function() { renderAll(); });
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------
  function renderHistory() {
    var el = $('bureauHistList');
    if (!el) return;
    var history = (state.bureauHistoryLog || []).slice();
    history.reverse();
    if (history.length === 0) {
      el.innerHTML = '<div class="empty-state">The logbook is empty. The phone that is not plugged in has not yet rung.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      var kind = h.outcome || 'partial';
      var tag = kind === 'success' ? 'SUCCESS'
              : kind === 'blown'   ? 'BLOWN'
              : 'PARTIAL';
      var rewardHtml = h.reward
        ? '<div class="hist-reward">' + esc(h.reward) + '</div>'
        : '';
      html += '<div class="hist-entry ' + kind + '">' +
                '<div class="hist-head">' +
                  '<span>' + esc(h.opTitle || 'Operation') + ' \u2014 ' + esc(h.agentName || '') + '</span>' +
                  '<span class="outcome-tag">' + tag + '</span>' +
                '</div>' +
                '<div class="hist-line">' + esc(h.line || '') + '</div>' +
                rewardHtml +
              '</div>';
    }
    el.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Aggregate re-render
  // ---------------------------------------------------------------------------
  function renderAll() {
    renderHero();
    renderSlots();
    renderOperations();
    renderHistory();
  }

  // ---------------------------------------------------------------------------
  // Nav
  // ---------------------------------------------------------------------------
  function openWindow(path) {
    try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  load(function() {
    try {
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.reconcileRoster) {
        var hired = Personnel.reconcileRoster(state);
        if (hired > 0) save();
      }
    } catch (_) {}

    renderAll();

    // Tick — refreshes cooldown-driven op availability
    tickTimer = setInterval(function() {
      try {
        renderHero();
        if (Bureau.cooldownRemainingMs(state) === 0) {
          var anyDisabled = false;
          var btns = document.querySelectorAll('#opList button.run-op-btn');
          for (var i = 0; i < btns.length; i++) if (btns[i].disabled) { anyDisabled = true; break; }
          if (anyDisabled) renderOperations();
        }
      } catch (_) {}
    }, 1000);

    // Nav buttons
    var backFactory = $('backToFactoryBtn');
    if (backFactory) backFactory.addEventListener('click', function() { openWindow('factory.html'); });
    var backEmps = $('backToEmployeesBtn');
    if (backEmps) backEmps.addEventListener('click', function() { openWindow('employees.html'); });
    var toHouse = $('toHouseBtn');
    if (toHouse) toHouse.addEventListener('click', function() { openWindow('house.html'); });
    var backTracker = $('backToTrackerBtn');
    if (backTracker) backTracker.addEventListener('click', function() { openWindow('popup.html'); });

    var toResearch = $('toResearchBtn');
    if (toResearch) {
      if (state && state.researchLabUnlocked) toResearch.style.display = '';
      toResearch.addEventListener('click', function() { openWindow('research.html'); });
    }
    var toInc = $('toIncineratorBtn');
    if (toInc) {
      if (state && state.incineratorUnlocked) toInc.style.display = '';
      toInc.addEventListener('click', function() { openWindow('incinerator.html'); });
    }

    // Cross-window sync
    try {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area !== 'local' || !changes.pixelFocusState) return;
        var newState = changes.pixelFocusState.newValue;
        if (!newState) return;
        state = newState;
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        Bureau.ensureState(state);
        renderAll();
      });
    } catch (_) {}
  });
})();
