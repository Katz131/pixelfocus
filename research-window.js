// =============================================================================
// research-window.js — v3.20.0 Stage 3 Research Lab Window Renderer
// =============================================================================
// DOM glue for research.html. Reads state from chrome.storage.local, renders
// the experiment cards (with subject dropdowns), runs them via Research.runExperiment
// when the player clicks RUN, persists the result, updates the hero stats,
// and re-renders.
//
// Also listens to storage.onChanged so that if the player buys the Research
// Lab upgrade in another window — or runs an experiment there — this window
// reflects the new state automatically.
//
// This file contains zero outcome logic. All rolls, cost checks, reward
// payouts, and roster removals happen in research.js.
// =============================================================================

(function() {
  'use strict';

  var state = null;
  var notice = null;
  var tickTimer = null;

  function $(id) { return document.getElementById(id); }

  // ---------------------------------------------------------------------------
  // Load state. Defaults everything that might be missing on a fresh save.
  // ---------------------------------------------------------------------------
  function load(cb) {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        state = (result && result.pixelFocusState) || {};
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        if (!Array.isArray(state.researchHistoryLog)) state.researchHistoryLog = [];
        if (cb) cb();
      });
    } catch (e) {
      state = { personnelRoster: [], researchHistoryLog: [] };
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
  // Escape HTML for any text from state that might be user-provided.
  // Employee bios are hard-coded but the pool is open, so we sanitize.
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
    if (!notice) notice = $('labNotice');
    if (!notice) return;
    notice.textContent = text || '';
    notice.className = 'notice' + (text ? ' visible' : '') + (kind ? ' ' + kind : '');
  }

  // ---------------------------------------------------------------------------
  // Render the top-of-page stats row and the lab-not-open notice.
  // ---------------------------------------------------------------------------
  function renderHero() {
    var coinsPill    = $('labCoinsPill');
    var rosterPill   = $('labRosterPill');
    var runsPill     = $('labRunsPill');
    var departPill   = $('labDepartPill');
    var cooldownPill = $('labCooldownPill');

    if (coinsPill)    coinsPill.textContent = formatMoney(state.coins || 0);
    if (rosterPill) {
      var n = (state.personnelRoster || []).length;
      rosterPill.textContent = n + (n === 1 ? ' subject on roster' : ' subjects on roster');
    }
    if (runsPill) {
      var r = state.researchExperimentsRun || 0;
      runsPill.textContent = r + (r === 1 ? ' experiment run' : ' experiments run');
    }
    if (departPill) {
      var d = state.personnelDepartures || 0;
      departPill.textContent = d + (d === 1 ? ' departure' : ' departures');
    }
    if (cooldownPill) {
      var cdLeft = Research.cooldownRemainingMs(state);
      if (cdLeft > 0) {
        cooldownPill.style.display = '';
        cooldownPill.textContent = 'Resetting \u2014 ' + Math.ceil(cdLeft / 1000) + 's';
      } else {
        cooldownPill.style.display = 'none';
      }
    }

    if (!state.researchLabUnlocked) {
      showNotice('This lab has not yet been commissioned. Purchase the Research Lab upgrade in the factory to open the door.', 'locked');
    } else if (!notice || !notice.classList.contains('sticky')) {
      showNotice('', null);
    }
  }

  // ---------------------------------------------------------------------------
  // Compute total odds weight for display as percentages.
  // ---------------------------------------------------------------------------
  function oddsPct(outcomes, key) {
    if (!outcomes) return 0;
    var total = (outcomes.success || 0) + (outcomes.inconclusive || 0) + (outcomes.failure || 0);
    if (total <= 0) return 0;
    return Math.round(((outcomes[key] || 0) / total) * 100);
  }

  // ---------------------------------------------------------------------------
  // Build subject <option> list for a single experiment's dropdown. We
  // don't filter by pool for now — every employee is a valid subject.
  // ---------------------------------------------------------------------------
  function subjectOptionsHtml(roster, selectedId) {
    if (!Array.isArray(roster) || roster.length === 0) {
      return '<option value="">(nobody on the roster yet)</option>';
    }
    var parts = ['<option value="">Choose a subject\u2026</option>'];
    for (var i = 0; i < roster.length; i++) {
      var e = roster[i];
      if (!e) continue;
      var label = esc(e.name) + ' \u2014 ' + esc(e.role);
      var sel = (selectedId && e.id === selectedId) ? ' selected' : '';
      parts.push('<option value="' + esc(e.id) + '"' + sel + '>' + label + '</option>');
    }
    return parts.join('');
  }

  // ---------------------------------------------------------------------------
  // Render the list of experiments. Each card has:
  //   - title, subtitle, description
  //   - odds chips (success / inconclusive / failure)
  //   - cost
  //   - subject selector
  //   - RUN button (disabled if unavailable)
  //   - optional 'unavailable' reason text
  // ---------------------------------------------------------------------------
  function renderExperiments() {
    var listEl = $('expList');
    if (!listEl) return;
    var experiments = Research.getExperiments();
    var roster = state.personnelRoster || [];
    var html = '';

    for (var i = 0; i < experiments.length; i++) {
      var exp = experiments[i];
      var avail = Research.experimentAvailability(state, exp);
      var succ = oddsPct(exp.outcomes, 'success');
      var inco = oddsPct(exp.outcomes, 'inconclusive');
      var fail = oddsPct(exp.outcomes, 'failure');
      var disabled = avail ? ' disabled' : '';
      var reasonHtml = avail
        ? '<div class="exp-unavailable">' + esc(avail.reason) + '</div>'
        : '';
      var costStr = '$' + (exp.cost || 0);
      html += '<div class="exp-card" data-exp-id="' + esc(exp.id) + '">' +
                '<div class="exp-title">' + esc(exp.title) + '</div>' +
                '<div class="exp-sub">' + esc(exp.subtitle) + '</div>' +
                '<div class="exp-desc">' + esc(exp.desc) + '</div>' +
                '<div class="exp-meta">' +
                  '<span class="odds-chip success">Success ' + succ + '%</span>' +
                  '<span class="odds-chip inconclusive">Inconclusive ' + inco + '%</span>' +
                  '<span class="odds-chip failure">Departure ' + fail + '%</span>' +
                  '<span>Min roster: ' + (exp.minEmployees || 1) + '</span>' +
                '</div>' +
                '<div class="exp-actions">' +
                  '<select class="subject-select" data-exp-id="' + esc(exp.id) + '">' +
                    subjectOptionsHtml(roster) +
                  '</select>' +
                  '<span class="exp-cost">' + costStr + '</span>' +
                  '<button class="run-btn" data-exp-id="' + esc(exp.id) + '"' + disabled + '>RUN</button>' +
                '</div>' +
                reasonHtml +
              '</div>';
    }
    listEl.innerHTML = html;

    // Wire up the RUN buttons
    var runBtns = listEl.querySelectorAll('button.run-btn');
    for (var b = 0; b < runBtns.length; b++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var expId = btn.getAttribute('data-exp-id');
          var card = btn.closest('.exp-card');
          var sel = card && card.querySelector('select.subject-select');
          var subjectId = sel && sel.value;
          if (!subjectId) {
            showNotice('Choose a subject before running this experiment.');
            return;
          }
          handleRunClick(expId, subjectId);
        });
      })(runBtns[b]);
    }
  }

  // ---------------------------------------------------------------------------
  // Render the history panel. Newest first.
  // ---------------------------------------------------------------------------
  function renderHistory() {
    var el = $('histList');
    if (!el) return;
    var history = (state.researchHistoryLog || []).slice();
    history.reverse();
    if (history.length === 0) {
      el.innerHTML = '<div class="empty-state">No experiments have been conducted. The coat rack holds its one hat patiently.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      var kind = h.outcome || 'inconclusive';
      var tag = kind === 'success' ? 'SUCCESS'
              : kind === 'failure' ? 'DEPARTURE'
              : 'INCONCLUSIVE';
      var when = new Date(h.at || Date.now()).toLocaleString();
      var rewardHtml = h.reward
        ? '<div class="hist-reward">' + esc(h.reward) + '</div>'
        : '';
      html += '<div class="hist-entry ' + kind + '">' +
                '<div class="hist-head">' +
                  '<span>' + esc(h.experimentTitle || 'Experiment') + ' \u2014 ' + esc(h.subjectName || '') + '</span>' +
                  '<span class="outcome-tag">' + tag + '</span>' +
                '</div>' +
                '<div class="hist-line">' + esc(h.line || '') + '</div>' +
                rewardHtml +
              '</div>';
    }
    el.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Handle a RUN button click. Delegates to Research.runExperiment, then
  // persists, notices the result to the user, and re-renders.
  // ---------------------------------------------------------------------------
  function handleRunClick(experimentId, subjectId) {
    var result = Research.runExperiment(state, experimentId, subjectId);
    if (!result || !result.ok) {
      showNotice((result && result.error) || 'The lab cannot run that experiment right now.');
      return;
    }
    // Mirror the outcome as a short message in MsgLog if available
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && typeof MsgLog.push === 'function') {
        var tag = result.outcome === 'failure' ? 'DEPARTURE'
                : result.outcome === 'success' ? 'SUCCESS'
                : 'INCONCLUSIVE';
        MsgLog.push('>> [LAB ' + tag + '] ' + result.experimentTitle + ' \u2014 ' + result.subjectName + '.');
      }
    } catch (_) {}
    // Show a non-sticky notice with the flavor line
    showNotice(result.line + (result.reward ? ' \u2014 ' + result.reward : ''));

    save(function() {
      renderHero();
      renderExperiments();
      renderHistory();
    });
  }

  // ---------------------------------------------------------------------------
  // Cross-window nav
  // ---------------------------------------------------------------------------
  function openWindow(path) {
    try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  load(function() {
    // Reconcile in case employees were hired in another window and this
    // one was closed. Safe no-op if roster is already at target.
    try {
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.reconcileRoster) {
        var hired = Personnel.reconcileRoster(state);
        if (hired > 0) save();
      }
    } catch (_) {}

    renderHero();
    renderExperiments();
    renderHistory();

    // Cooldown tick — once per second — re-renders the cooldown pill and
    // re-enables RUN buttons the moment cooldown elapses.
    tickTimer = setInterval(function() {
      try {
        renderHero();
        if (Research.cooldownRemainingMs(state) === 0) {
          // Only re-render the experiment list when cooldown flips, to
          // avoid stomping on an in-progress dropdown selection.
          var anyDisabled = false;
          var btns = document.querySelectorAll('#expList button.run-btn');
          for (var i = 0; i < btns.length; i++) if (btns[i].disabled) { anyDisabled = true; break; }
          if (anyDisabled) renderExperiments();
        }
      } catch (_) {}
    }, 1000);

    // Nav buttons
    var backFactory = $('backToFactoryBtn');
    if (backFactory) backFactory.addEventListener('click', function() { openWindow('factory.html'); });
    var backEmps = $('backToEmployeesBtn');
    if (backEmps) backEmps.addEventListener('click', function() { openWindow('employees.html'); });
    // v3.20.0 Stage 5: HOUSE nav — always visible, read-only.
    var toHouse = $('toHouseBtn');
    if (toHouse) toHouse.addEventListener('click', function () { openWindow('house.html'); });
    var backTracker = $('backToTrackerBtn');
    if (backTracker) backTracker.addEventListener('click', function() { openWindow('popup.html'); });
    // v3.20.0 Stage 4: INCINERATOR nav button — hidden until the
    // Tier-7 commissioning flips state.incineratorUnlocked.
    var toInc = $('toIncineratorBtn');
    if (toInc) {
      if (state && state.incineratorUnlocked) toInc.style.display = '';
      toInc.addEventListener('click', function() { openWindow('incinerator.html'); });
    }
    // v3.21.0 Stage 1: BUREAU nav button. Hidden until commissioned.
    var toBur = $('toBureauBtn');
    if (toBur) {
      if (state && state.bureauUnlocked) toBur.style.display = '';
      toBur.addEventListener('click', function() { openWindow('bureau.html'); });
    }

    // Live-sync: if the roster or research log changes from another window,
    // refresh. We intentionally re-render everything because the experiment
    // list depends on coins / cooldown / roster size.
    try {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area !== 'local' || !changes.pixelFocusState) return;
        var newState = changes.pixelFocusState.newValue;
        if (!newState) return;
        state = newState;
        if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
        if (!Array.isArray(state.researchHistoryLog)) state.researchHistoryLog = [];
        renderHero();
        renderExperiments();
        renderHistory();
      });
    } catch (_) {}
  });

})();
