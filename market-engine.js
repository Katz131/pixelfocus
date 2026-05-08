/**
 * market-engine.js  — Todo of the Loom market economy layer
 * =========================================================
 * Pure math module. No DOM access, no UI, no side effects beyond
 * writing state.marketYieldMultiplier and state.marketCosts.
 *
 * Called from popup.html on a 1-second interval while the popup is open.
 * Reads existing state properties (factory levels, resource reserves,
 * bureau bonuses, ratiocinatory aspects) and outputs a single number
 * that the focus-session payout multiplies by.
 *
 * If this file is deleted or fails to load, the payout defaults to 1.0×
 * and nothing else breaks.
 */

var MarketEngine = (function() {
  'use strict';

  // ===== Resource cost bases =====
  // These oscillate over time via sine waves, like Paperclips' wire cost
  var FIBER_BASE = 3.0;
  var DYE_BASE   = 5.0;
  var THREAD_BASE = 2.0;

  // ===== Helpers =====

  // Sine-based oscillation (deterministic from tick count)
  function oscillate(base, tick, freqA, freqB, ampA, ampB) {
    var v = base + Math.sin(tick * freqA) * ampA + Math.cos(tick * freqB) * ampB;
    return Math.max(base * 0.3, v); // floor at 30% of base
  }

  // Clamp a number between min and max
  function clamp(n, lo, hi) {
    return n < lo ? lo : n > hi ? hi : n;
  }

  // ===== Demand calculation =====
  // Reads: marketingLevel, lobbyingLevel, marketShareLevel,
  //        employeesLevel, compliance/treaty/juridical levels,
  //        ratiocinatory aspects, bureau bonus
  function calcDemand(state, price, tick) {
    var mktg   = state.marketingLevel || 0;        // 0-5
    var lobby  = state.lobbyingLevel || 0;          // 0-10
    var mshare = state.marketShareLevel || 0;       // 0-8
    var emp    = state.employeesLevel || 0;          // 0-5
    var compl  = state.complianceFrameworkLevel || 0;// 0-5
    var treaty = state.treatyDeskLevel || 0;         // 0-5
    var jurid  = state.juridicalPersonhoodLevel || 0;// 0-5
    var monop  = state.patternMonopsonyLevel || 0;   // 0-4+

    // Ratiocinatory aspect bonuses (small)
    var exeg = 0, omens = 0, deft = 0;
    if (state.ratiocinatoryUnlocked) {
      exeg  = (state.aspectExegesis || 0) / 100;    // 0.0 - 1.0
      omens = (state.aspectOmens || 0) / 100;
      deft  = (state.aspectDeftness || 0) / 100;
    }

    // Bureau temporary bonus (set by successful market ops, decays)
    var bureauBonus = state.marketBureauBonus || 0;  // 0.0 - 0.5 typically

    // Base demand: inversely proportional to price, like Paperclips
    // Higher price = less demand, lower price = more demand
    var priceFactor = 0.8 / Math.max(0.5, price / 10);

    // Marketing multiplier: each level gives 1.1× (Paperclips formula)
    var marketingMult = Math.pow(1.1, mktg);

    // Lobbying: political influence boosts demand
    var lobbyMult = 1 + (lobby * 0.15);

    // Market share: you're a bigger player, more pricing power
    var mshareMult = 1 + (mshare * 0.12);

    // Supply capacity: employees affect how much you can actually deliver
    var supplyMult = 1 + (emp * 0.08);

    // Regulatory capture: compliance/treaty/juridical create favorable conditions
    var regMult = 1 + (compl * 0.06) + (treaty * 0.08) + (jurid * 0.05);

    // Monopsony: approaching monopoly
    var monopMult = 1 + (monop * 0.20);

    // Ratiocinatory: small bonuses from AI comprehension
    var ratioMult = 1 + (exeg * 0.05) + (omens * 0.08) + (deft * 0.04);

    // Bureau ops bonus (temporary)
    var bureauMult = 1 + bureauBonus;

    // Natural demand fluctuation (sine wave, like Paperclips)
    var noise = Math.sin(tick * 0.07) * 0.08 + Math.cos(tick * 0.13) * 0.05;

    var demand = priceFactor
              * marketingMult
              * lobbyMult
              * mshareMult
              * supplyMult
              * regMult
              * monopMult
              * ratioMult
              * bureauMult
              * (1 + noise);

    return clamp(demand, 0.05, 5.0);
  }

  // ===== Cost calculation =====
  // Resource reserves affect production costs
  // When reserves are full (10000), costs are at base
  // When depleted, costs spike
  function calcCosts(state, tick) {
    var frames = state.framesReserve;
    var gears  = state.gearsReserve;
    var dye    = state.dyeReserve;
    var water  = state.waterReserve;
    var silica = state.silicaReserve;

    // If resource system not active yet, use base costs
    if (typeof frames !== 'number') frames = 10000;
    if (typeof gears  !== 'number') gears  = 10000;
    if (typeof dye    !== 'number') dye    = 10000;
    if (typeof water  !== 'number') water  = 10000;
    if (typeof silica !== 'number') silica = 10000;

    // Resource health: 1.0 = full, 0.0 = empty
    // Depleted resources make costs higher
    var fHealth = clamp(frames / 10000, 0.01, 1.0);
    var gHealth = clamp(gears  / 10000, 0.01, 1.0);
    var dHealth = clamp(dye    / 10000, 0.01, 1.0);

    // Cost multipliers: healthy = 1.0×, depleted = up to 3.0×
    var fiberMult  = 1 + (1 - fHealth) * 2;
    var dyeMult    = 1 + (1 - dHealth) * 2;
    var threadMult = 1 + (1 - gHealth) * 2;

    // Oscillation on top of depletion-adjusted costs
    var fiber  = oscillate(FIBER_BASE * fiberMult, tick, 0.05, 0.11, 1.2, 0.7);
    var dyeC   = oscillate(DYE_BASE * dyeMult, tick, 0.08, 0.06, 1.5, 1.0);
    var thread = oscillate(THREAD_BASE * threadMult, tick, 0.03, 0.14, 0.8, 0.5);

    var total = Math.round((fiber + dyeC + thread) * 10) / 10;

    return {
      fiber:  Math.round(fiber * 10) / 10,
      dye:    Math.round(dyeC * 10) / 10,
      thread: Math.round(thread * 10) / 10,
      total:  total
    };
  }

  // ===== Main: compute yield multiplier =====
  // Called every second from popup.html
  // Writes state.marketYieldMultiplier and state.marketCosts
  function tick(state) {
    // Market tick counter (persistent, advances every second the popup is open)
    if (typeof state.marketTick !== 'number') state.marketTick = 0;
    state.marketTick++;

    // Player's chosen price (persisted in state)
    var price = state.marketPrice || 12;

    // Calculate components
    var costs = calcCosts(state, state.marketTick);
    var demand = calcDemand(state, price, state.marketTick);

    // Demand as a percentage (0-100) for UI display
    var demandPct = clamp(Math.round(demand * 50), 1, 99);

    // Margin: how much profit per unit at current price vs costs
    var margin = (costs.total > 0) ? (price - costs.total) / price : 0;

    // v3.23.117: Shifting sweet spot.
    // The "ideal price" drifts over time via slow sine waves so the
    // player can't just park the slider in one place forever.
    // When your price is near the ideal, you get a resonance bonus.
    // When you're far from it, you pay a penalty — but the ideal
    // moves, so yesterday's perfect price is tomorrow's bad call.
    //
    // The ideal price oscillates between ~$4 and ~$26 over different
    // overlapping cycles (short ~2min, medium ~7min, long ~20min).
    // Upgrades (marketing, lobbying, market share) widen the "good zone"
    // so higher-level players have more forgiveness.
    var tick = state.marketTick || 0;
    var idealPrice = 15
      + Math.sin(tick * 0.009) * 8       // slow drift (~11 min cycle)
      + Math.sin(tick * 0.025) * 3       // medium wobble (~4 min)
      + Math.cos(tick * 0.004) * 5;      // very slow trend (~26 min)
    idealPrice = clamp(Math.round(idealPrice * 10) / 10, 3, 28);

    // How far off is the player? Normalized 0-1 where 0 = perfect
    var priceDist = Math.abs(price - idealPrice) / 27;

    // "Good zone" width: base ±4, widens with upgrades
    var mktg  = state.marketingLevel || 0;
    var lobby = state.lobbyingLevel || 0;
    var mshare = state.marketShareLevel || 0;
    var zoneWidth = 4 + (mktg * 0.8) + (lobby * 0.5) + (mshare * 0.4);
    var zoneNorm = clamp(Math.abs(price - idealPrice) / zoneWidth, 0, 1);

    // Resonance: 1.0 when on target, drops to 0.3 when way off
    var resonance = 1.0 - (zoneNorm * 0.7);

    // Margin still matters but is secondary to resonance
    var marginFactor = margin > 0 ? (1 + margin * 0.5) : (1 + margin);
    marginFactor = clamp(marginFactor, 0.3, 2.0);

    var yieldMult = demand * marginFactor * resonance;
    yieldMult = clamp(yieldMult, 0.3, 2.5);

    // Round to 2 decimal places
    yieldMult = Math.round(yieldMult * 100) / 100;

    // Write to state (read by focus payout in app.js)
    state.marketYieldMultiplier = yieldMult;
    state.marketCosts = costs;
    state.marketDemandPct = demandPct;
    state.marketMarginPct = Math.round(margin * 100);

    return {
      yieldMultiplier: yieldMult,
      costs: costs,
      demandPct: demandPct,
      marginPct: Math.round(margin * 100),
      price: price
    };
  }

  // ===== Public API =====
  return {
    tick: tick,
    calcDemand: calcDemand,
    calcCosts: calcCosts
  };

})();
