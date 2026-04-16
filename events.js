// =============================================================================
// events.js — v3.22.0 Stage 1 — Enterprise Events engine (logic-only module)
// =============================================================================
// Trigger-driven event system. Events are defined in events-catalog.js as
// pure data; this file is the engine: it evaluates eligibility, applies
// consequences, maintains active-effect timers, and answers queries from
// the rest of the game (is this upgrade currently suspended? what's the
// income multiplier right now?).
//
// Events are INFREQUENT — multi-day cadence at minimum. Most events are
// trigger-driven (a specific state predicate becomes true for the first
// time). A small ambient pool can fire on day-rollover if nothing else
// fired recently.
//
// No DOM here. events-modal.js owns the player-facing surface. This file
// is safe to import from factory.js, app.js, popup.js, etc.
//
// State keys (all under chrome.storage.local → pixelFocusState):
//   state.activeEventEffects    : [{ kind, factor, until, label, eventId }]
//   state.suspendedUpgrades     : [{ upgradeId, until, label, eventId }]
//   state.eventFlags            : { [flagName]: true|value }
//   state.eventHistory          : [{ at, eventId, tier, title, summary }]
//   state.eventsFiredOnce       : { [eventId]: firstFiredAtMs }
//   state.eventsLastFiredAt     : ms — last time ANY event fired (global cd)
//   state.eventsLastEvaluatedAt : ms — last eligibility scan
//   state.eventsPending         : [eventId] — queue for modal display
//   state.reputation            : int — cumulative narrative reputation score
//
// Effect kinds:
//   'incomeMultiplier'    — multiplies streak trickle (1.5 = +50%, 0.8 = -20%)
//   'marketingMultiplier' — multiplies marketing reach / rate
//   'textileMultiplier'   — multiplies textile production / dust generation
//   'suspendPool'         — disables a specific production pool (e.g. 'dye')
//
// Consequence kinds (what an event's consequences[] list can contain):
//   addCoins, loseCoins, addTextiles, loseTextiles,
//   incomeMultiplier, marketingMultiplier, textileMultiplier,
//   suspendUpgrade, liftUpgrade, setFlag, clearFlag,
//   adjustReputation, addDissident, grantFreeHire,
//   scheduleFollowup, sideEffect
// =============================================================================

(function() {
  'use strict';

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------
  var GLOBAL_EVENT_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;   // 2 days between ambient
  var DEFAULT_EVENT_COOLDOWN_DAYS = 7;                      // per-event reuse cd
  var HISTORY_CAP = 300;

  // ---------------------------------------------------------------------------
  // STATE INITIALISATION — safe to call multiple times, no-ops on fresh save.
  // ---------------------------------------------------------------------------
  function ensureState(state) {
    if (!state) return;
    if (!Array.isArray(state.activeEventEffects))  state.activeEventEffects  = [];
    if (!Array.isArray(state.suspendedUpgrades))   state.suspendedUpgrades   = [];
    if (!state.eventFlags || typeof state.eventFlags !== 'object') state.eventFlags = {};
    if (!Array.isArray(state.eventHistory))        state.eventHistory        = [];
    if (!state.eventsFiredOnce || typeof state.eventsFiredOnce !== 'object') state.eventsFiredOnce = {};
    if (typeof state.eventsLastFiredAt     !== 'number') state.eventsLastFiredAt     = 0;
    if (typeof state.eventsLastEvaluatedAt !== 'number') state.eventsLastEvaluatedAt = 0;
    if (!Array.isArray(state.eventsPending))       state.eventsPending        = [];
    if (typeof state.reputation !== 'number')      state.reputation           = 0;
  }

  // ---------------------------------------------------------------------------
  // EXPIRY — prune expired effects and suspensions. Called on every query so
  // callers never see stale entries without having to run a cleanup pass.
  // ---------------------------------------------------------------------------
  function pruneExpired(state) {
    ensureState(state);
    var now = Date.now();
    state.activeEventEffects = state.activeEventEffects.filter(function(e) {
      return !e || !e.until || e.until > now;
    });
    state.suspendedUpgrades = state.suspendedUpgrades.filter(function(s) {
      return !s || !s.until || s.until > now;
    });
  }

  // ---------------------------------------------------------------------------
  // QUERY API — these are the functions the rest of the game calls.
  // ---------------------------------------------------------------------------
  function _multFor(state, kind) {
    pruneExpired(state);
    var f = 1.0;
    for (var i = 0; i < state.activeEventEffects.length; i++) {
      var e = state.activeEventEffects[i];
      if (e && e.kind === kind && typeof e.factor === 'number') f *= e.factor;
    }
    return f;
  }

  function getIncomeMultiplier(state)    { return _multFor(state, 'incomeMultiplier'); }
  function getMarketingMultiplier(state) { return _multFor(state, 'marketingMultiplier'); }
  function getTextileMultiplier(state)   { return _multFor(state, 'textileMultiplier'); }

  function isUpgradeSuspended(state, upgradeId) {
    if (!upgradeId) return false;
    pruneExpired(state);
    for (var i = 0; i < state.suspendedUpgrades.length; i++) {
      var s = state.suspendedUpgrades[i];
      if (s && s.upgradeId === upgradeId) return true;
    }
    return false;
  }

  function getSuspension(state, upgradeId) {
    pruneExpired(state);
    for (var i = 0; i < state.suspendedUpgrades.length; i++) {
      var s = state.suspendedUpgrades[i];
      if (s && s.upgradeId === upgradeId) return s;
    }
    return null;
  }

  function listActiveEffects(state) {
    pruneExpired(state);
    return state.activeEventEffects.slice();
  }

  function listActiveSuspensions(state) {
    pruneExpired(state);
    return state.suspendedUpgrades.slice();
  }

  function hasFlag(state, name) {
    ensureState(state);
    return !!state.eventFlags[name];
  }

  function getFlag(state, name) {
    ensureState(state);
    return state.eventFlags[name];
  }

  // ---------------------------------------------------------------------------
  // CATALOG ACCESS — events-catalog.js defines window.EVENT_CATALOG.
  // ---------------------------------------------------------------------------
  function catalog() {
    if (typeof window !== 'undefined' && window.EVENT_CATALOG) return window.EVENT_CATALOG;
    return [];
  }

  function getEventById(eventId) {
    var c = catalog();
    for (var i = 0; i < c.length; i++) if (c[i] && c[i].id === eventId) return c[i];
    return null;
  }

  // ---------------------------------------------------------------------------
  // ELIGIBILITY — is this specific event firable right now?
  // ---------------------------------------------------------------------------
  function tierOfState(state) {
    // Mirrors app.js level ladder approximately. Used when an event has
    // `tier` but we want to gate by player's current tier band.
    var lvl = (state && state.level) || 0;
    if (lvl >= 475) return 10;
    if (lvl >= 360) return 9;
    if (lvl >= 270) return 8;
    if (lvl >= 218) return 7;
    if (lvl >= 155) return 6;
    if (lvl >= 114) return 5;
    if (lvl >= 78)  return 4;
    if (lvl >= 57)  return 3;
    if (lvl >= 30)  return 2;
    return 1;
  }

  function daysSince(ms) {
    if (!ms) return Infinity;
    return (Date.now() - ms) / (1000 * 60 * 60 * 24);
  }

  function isEligible(state, ev, opts) {
    ensureState(state);
    if (!ev || !ev.id) return false;
    opts = opts || {};

    // Once-only gate
    if (ev.onlyOnce && state.eventsFiredOnce[ev.id]) return false;

    // Per-event cooldown for repeatables
    if (!ev.onlyOnce) {
      var cdDays = (typeof ev.cooldownDays === 'number') ? ev.cooldownDays : DEFAULT_EVENT_COOLDOWN_DAYS;
      var lastFired = state.eventsFiredOnce[ev.id] || 0;
      if (daysSince(lastFired) < cdDays) return false;
    }

    // Tier gate — event's canonical tier must be at or below current tier.
    // Events from higher tiers wait until the player gets there.
    var playerTier = tierOfState(state);
    if (typeof ev.tier === 'number' && ev.tier > playerTier) return false;

    // maxTier gate — some events are Tier-specific and stop firing once
    // the player has left that tier band.
    if (typeof ev.maxTier === 'number' && playerTier > ev.maxTier) return false;

    // Required flags
    if (ev.requiresFlags && ev.requiresFlags.length) {
      for (var i = 0; i < ev.requiresFlags.length; i++) {
        if (!hasFlag(state, ev.requiresFlags[i])) return false;
      }
    }
    // Forbidden flags
    if (ev.forbidsFlags && ev.forbidsFlags.length) {
      for (var j = 0; j < ev.forbidsFlags.length; j++) {
        if (hasFlag(state, ev.forbidsFlags[j])) return false;
      }
    }

    // Custom predicate
    if (typeof ev.eligible === 'function') {
      try { if (!ev.eligible(state, opts)) return false; }
      catch (_) { return false; }
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // EVALUATE — find an eligible event to fire, or null. The caller decides
  // what to do with the result (show modal, skip, defer, etc).
  //
  // Modes:
  //   'trigger' — return the first eligible event that is *trigger-class*
  //     (explicit predicate match, e.g. "player just crossed 1000 coins").
  //     Ignores global cooldown — these are high-priority story beats.
  //   'ambient' — weighted random selection among eligible ambient events,
  //     honoring global cooldown. These are the "days pass, weird things
  //     happen" events.
  //   'either' (default) — tries 'trigger' first, falls back to 'ambient'.
  // ---------------------------------------------------------------------------
  function evaluate(state, mode) {
    ensureState(state);
    pruneExpired(state);
    mode = mode || 'either';

    var c = catalog();
    var triggers = [];
    var ambient = [];
    for (var i = 0; i < c.length; i++) {
      var ev = c[i];
      if (!ev || !isEligible(state, ev)) continue;
      if (ev.class === 'trigger') triggers.push(ev);
      else ambient.push(ev); // default is ambient
    }

    if (mode === 'trigger' || mode === 'either') {
      if (triggers.length) {
        // Priority ordering: higher `priority` first, then stable id sort.
        triggers.sort(function(a, b) {
          return (b.priority || 0) - (a.priority || 0) || (a.id < b.id ? -1 : 1);
        });
        return triggers[0];
      }
      if (mode === 'trigger') return null;
    }

    // Ambient path
    var now = Date.now();
    if ((now - (state.eventsLastFiredAt || 0)) < GLOBAL_EVENT_COOLDOWN_MS) return null;
    if (!ambient.length) return null;

    // Weighted sample
    var totalWeight = 0;
    for (var k = 0; k < ambient.length; k++) totalWeight += (ambient[k].weight || 1);
    var r = Math.random() * totalWeight;
    for (var m = 0; m < ambient.length; m++) {
      r -= (ambient[m].weight || 1);
      if (r <= 0) return ambient[m];
    }
    return ambient[ambient.length - 1];
  }

  // ---------------------------------------------------------------------------
  // FIRE — apply the event's consequences and append to history.
  // Returns { ok, eventId, title, summary, effects } or { ok:false, error }.
  // ---------------------------------------------------------------------------
  function fire(state, eventId) {
    ensureState(state);
    var ev = getEventById(eventId);
    if (!ev) return { ok: false, error: 'Unknown event: ' + eventId };

    var consequences = [];
    if (typeof ev.consequences === 'function') {
      try { consequences = ev.consequences(state) || []; } catch (_) { consequences = []; }
    } else if (Array.isArray(ev.consequences)) {
      consequences = ev.consequences;
    }

    var applied = [];
    var summaryLines = [];
    for (var i = 0; i < consequences.length; i++) {
      var cq = consequences[i];
      if (!cq || !cq.kind) continue;
      var res = applyConsequence(state, cq, ev);
      if (res) {
        applied.push(res);
        if (res.summary) summaryLines.push(res.summary);
      }
    }

    var now = Date.now();
    state.eventsFiredOnce[ev.id] = now;
    state.eventsLastFiredAt = now;

    var entry = {
      at: now,
      eventId: ev.id,
      tier: ev.tier || null,
      title: ev.title || '',
      summary: summaryLines.join(' \u2022 ')
    };
    state.eventHistory.push(entry);
    if (state.eventHistory.length > HISTORY_CAP) {
      state.eventHistory.splice(0, state.eventHistory.length - HISTORY_CAP);
    }

    return {
      ok: true,
      eventId: ev.id,
      tier: ev.tier,
      title: ev.title,
      desc: ev.desc || ev.title,
      flavor: ev.flavor || '',
      summary: entry.summary,
      effects: applied
    };
  }

  // ---------------------------------------------------------------------------
  // CONSEQUENCE APPLIERS — one per kind. Each returns a small object with
  // a human-readable summary string so the modal can show what changed.
  // ---------------------------------------------------------------------------
  function applyConsequence(state, cq, ev) {
    switch (cq.kind) {
      case 'addCoins': {
        var amt = Math.max(0, cq.amount || 0);
        state.coins = (state.coins || 0) + amt;
        state.lifetimeMoneyEarned = (state.lifetimeMoneyEarned || 0) + amt;
        return { kind: cq.kind, applied: amt, summary: '+$' + amt };
      }
      case 'loseCoins': {
        var loss = Math.max(0, cq.amount || 0);
        var actual = Math.min(loss, state.coins || 0);
        state.coins = Math.max(0, (state.coins || 0) - loss);
        return { kind: cq.kind, applied: actual, summary: '-$' + actual };
      }
      case 'addTextiles': {
        var tg = Math.max(0, cq.amount || 0);
        state.textiles = (state.textiles || 0) + tg;
        return { kind: cq.kind, applied: tg, summary: '+' + tg + ' textiles' };
      }
      case 'loseTextiles': {
        var tl = Math.max(0, cq.amount || 0);
        var tlActual = Math.min(tl, state.textiles || 0);
        state.textiles = Math.max(0, (state.textiles || 0) - tl);
        return { kind: cq.kind, applied: tlActual, summary: '-' + tlActual + ' textiles' };
      }
      case 'incomeMultiplier':
      case 'marketingMultiplier':
      case 'textileMultiplier': {
        var dur = (cq.durationHours || 24) * 3600 * 1000;
        var effect = {
          kind: cq.kind,
          factor: cq.factor || 1,
          until: Date.now() + dur,
          label: cq.label || (ev && ev.title) || '',
          eventId: ev && ev.id
        };
        state.activeEventEffects.push(effect);
        var pct = Math.round((effect.factor - 1) * 100);
        var sign = pct >= 0 ? '+' : '';
        var lbl = cq.kind === 'incomeMultiplier' ? 'income'
                : cq.kind === 'marketingMultiplier' ? 'marketing'
                : 'textiles';
        return { kind: cq.kind, applied: effect, summary: sign + pct + '% ' + lbl + ' for ' + (cq.durationHours || 24) + 'h' };
      }
      case 'suspendUpgrade': {
        if (!cq.upgradeId) return null;
        var sdur = (cq.durationHours || 24) * 3600 * 1000;
        var susp = {
          upgradeId: cq.upgradeId,
          until: Date.now() + sdur,
          label: cq.label || (ev && ev.title) || '',
          eventId: ev && ev.id
        };
        state.suspendedUpgrades.push(susp);
        return { kind: cq.kind, applied: susp, summary: cq.upgradeId + ' suspended ' + (cq.durationHours || 24) + 'h' };
      }
      case 'liftUpgrade': {
        if (!cq.upgradeId) return null;
        state.suspendedUpgrades = state.suspendedUpgrades.filter(function(s) {
          return s.upgradeId !== cq.upgradeId;
        });
        return { kind: cq.kind, summary: cq.upgradeId + ' suspension lifted' };
      }
      case 'setFlag': {
        if (!cq.flag) return null;
        state.eventFlags[cq.flag] = (cq.value === undefined) ? true : cq.value;
        return { kind: cq.kind, summary: 'flag \u201C' + cq.flag + '\u201D set' };
      }
      case 'clearFlag': {
        if (!cq.flag) return null;
        delete state.eventFlags[cq.flag];
        return { kind: cq.kind, summary: 'flag \u201C' + cq.flag + '\u201D cleared' };
      }
      case 'adjustReputation': {
        var delta = cq.amount || 0;
        state.reputation = (state.reputation || 0) + delta;
        var sgn = delta >= 0 ? '+' : '';
        return { kind: cq.kind, applied: delta, summary: sgn + delta + ' reputation' };
      }
      case 'addDissident': {
        var count = cq.count || 1;
        var marked = 0;
        try {
          if (typeof Personnel !== 'undefined' && Personnel && Array.isArray(state.personnelRoster)) {
            for (var i = 0; i < state.personnelRoster.length && marked < count; i++) {
              var emp = state.personnelRoster[i];
              if (!emp || emp.dissident) continue;
              if (Personnel.markDissident) {
                if (Personnel.markDissident(emp, (ev && ev.title) || 'Event consequence')) marked++;
              }
            }
          }
        } catch (_) {}
        return { kind: cq.kind, applied: marked, summary: marked ? (marked + ' dissident') : 'no eligible employee to flag' };
      }
      case 'grantFreeHire': {
        // Queue a free-hire bonus; factory.js reads state.pendingFreeHires and
        // adjusts roster target on its next reconcile.
        state.pendingFreeHires = (state.pendingFreeHires || 0) + (cq.count || 1);
        return { kind: cq.kind, summary: '+' + (cq.count || 1) + ' free hire pending' };
      }
      case 'scheduleFollowup': {
        // Queue another event to be eligible after a delay. The follow-up
        // event's eligible() predicate should check state.eventFlags for
        // its trigger flag.
        if (!cq.eventId) return null;
        state.eventFlags['__pending:' + cq.eventId] = Date.now() + (cq.afterDays || 3) * 86400000;
        return { kind: cq.kind, summary: 'follow-up queued' };
      }
      case 'sideEffect': {
        // Escape hatch for bespoke one-offs. cq.fn is called with (state).
        if (typeof cq.fn === 'function') {
          try { var out = cq.fn(state); return { kind: cq.kind, summary: (out && out.summary) || '' }; }
          catch (_) { return null; }
        }
        return null;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // EVALUATE-AND-FIRE — convenience wrapper. Pulls one eligible event,
  // fires it, returns the fire() result or null if nothing was eligible.
  // Called from day-rollover hooks in popup.js and from upgrade-purchase
  // hooks in factory.js.
  // ---------------------------------------------------------------------------
  function tick(state, mode) {
    ensureState(state);
    state.eventsLastEvaluatedAt = Date.now();
    var ev = evaluate(state, mode || 'either');
    if (!ev) return null;
    return fire(state, ev.id);
  }

  // ---------------------------------------------------------------------------
  // Helper: format remaining time for UI labels
  // ---------------------------------------------------------------------------
  function formatRemaining(untilMs) {
    var rem = (untilMs || 0) - Date.now();
    if (rem <= 0) return 'expired';
    var h = Math.floor(rem / 3600000);
    if (h >= 24) {
      var d = Math.floor(h / 24);
      return d + 'd ' + (h % 24) + 'h';
    }
    if (h >= 1) return h + 'h ' + Math.floor((rem % 3600000) / 60000) + 'm';
    return Math.ceil(rem / 60000) + 'm';
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.Events = {
    // state
    ensureState: ensureState,
    pruneExpired: pruneExpired,
    // queries
    getIncomeMultiplier: getIncomeMultiplier,
    getMarketingMultiplier: getMarketingMultiplier,
    getTextileMultiplier: getTextileMultiplier,
    isUpgradeSuspended: isUpgradeSuspended,
    getSuspension: getSuspension,
    listActiveEffects: listActiveEffects,
    listActiveSuspensions: listActiveSuspensions,
    hasFlag: hasFlag,
    getFlag: getFlag,
    tierOfState: tierOfState,
    formatRemaining: formatRemaining,
    // catalog
    catalog: catalog,
    getEventById: getEventById,
    // evaluation + firing
    isEligible: isEligible,
    evaluate: evaluate,
    fire: fire,
    tick: tick,
    // constants (exposed for debugging / tuning)
    GLOBAL_EVENT_COOLDOWN_MS: GLOBAL_EVENT_COOLDOWN_MS,
    DEFAULT_EVENT_COOLDOWN_DAYS: DEFAULT_EVENT_COOLDOWN_DAYS
  };
})();
