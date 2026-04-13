// =============================================================================
// incinerator.js — v3.20.0 Stage 4 Incinerator (pure logic module)
// =============================================================================
// The Incinerator is a Tier-7-gated late-game building. It is the darkest
// mechanic in the factory: it converts employees from the personnel roster
// into "fuel," which in turn produces:
//
//   1) An immediate one-time coin payout, scaled by the employee's tenure,
//      pool, and dissident status.
//
//   2) A permanent passive-income multiplier: every 10 accumulated fuel
//      units adds +1% to passive streak trickle, stacking indefinitely.
//      This is stored in state.incineratorFuelBonus (a fractional number
//      applied multiplicatively by factory.js when computing trickle).
//
// Fuel formula (deliberately opaque so the player discovers it):
//
//   base   = 10 + tenureDays(emp)
//   poolMult = wes 1.3, stranger 1.0, migrant 0.8
//   dissidentMult = 2.0 if emp.dissident, else 1.0
//   fuel = round(base * poolMult * dissidentMult)
//
// So feeding a long-tenured Wes-Anderson eccentric who has become a
// dissident is the single most efficient possible input. This is a
// gently horrible piece of design and it is intentional — the game is
// slowly asking the player what they are willing to do for a bigger
// number, and the room where they answer the question is called the
// Incinerator.
//
// Coin payout: fuel * INCIN_COIN_PER_FUEL (default: 120).
//
// Bonus calc: bonus = floor(totalFuel / 10) / 100, i.e. 1% per 10 fuel.
// factory.js reads state.incineratorFuelBonus when computing passive
// streak trickle and combo bursts.
//
// IMPORTANT: this file is window-scoped (IIFE) and exports a single
// global named Incinerator. It has NO DOM code — incinerator-window.js
// renders the UI and calls Incinerator.burnEmployee() on button click.
// =============================================================================

(function() {
  'use strict';

  // Tuning constants. All late-game so they're chunky.
  var INCIN_COIN_PER_FUEL = 120;
  var INCIN_BONUS_PER_10_FUEL = 0.01;

  // Pool multipliers. Wes eccentrics burn hottest because of their
  // "tailoring and resentment" — a piece of framing the lab has never
  // been willing to put in writing.
  var POOL_MULT = {
    wes:      1.3,
    stranger: 1.0,
    migrant:  0.8
  };

  function tenureDays(emp) {
    if (!emp || !emp.hiredAt) return 0;
    return Math.max(0, Math.floor((Date.now() - emp.hiredAt) / (24 * 60 * 60 * 1000)));
  }

  // ---------------------------------------------------------------------------
  // Compute the fuel yield for a given employee WITHOUT actually burning
  // them. Used by the UI to preview the numbers on each card.
  // ---------------------------------------------------------------------------
  function previewFuel(emp) {
    if (!emp) return { fuel: 0, coins: 0, bonus: 0 };
    var base = 10 + tenureDays(emp);
    var poolMult = POOL_MULT[emp.pool] || 1.0;
    var dissidentMult = emp.dissident ? 2.0 : 1.0;
    var fuel = Math.round(base * poolMult * dissidentMult);
    var coins = fuel * INCIN_COIN_PER_FUEL;
    // "Bonus added" is the delta to state.incineratorFuelBonus that this
    // burn would produce, assuming the 10-fuel threshold is respected.
    var bonusDelta = Math.floor(fuel / 10) * INCIN_BONUS_PER_10_FUEL;
    return { fuel: fuel, coins: coins, bonus: bonusDelta, poolMult: poolMult, dissidentMult: dissidentMult };
  }

  // ---------------------------------------------------------------------------
  // Read the current permanent bonus fraction from state.
  // ---------------------------------------------------------------------------
  function getBonus(state) {
    if (!state) return 0;
    return state.incineratorFuelBonus || 0;
  }

  function getTotalFuel(state) {
    if (!state) return 0;
    return state.incineratorFuel || 0;
  }

  function getBurnedCount(state) {
    if (!state) return 0;
    return state.incineratorBurned || 0;
  }

  // ---------------------------------------------------------------------------
  // Burn an employee by id. Mutates state:
  //   - Removes the employee via Personnel.removeById
  //   - Adds fuel to state.incineratorFuel
  //   - Adds coins from fuel * INCIN_COIN_PER_FUEL
  //   - Recomputes state.incineratorFuelBonus from total fuel
  //   - Appends a history entry to state.incineratorLog
  //   - Increments state.incineratorBurned
  //
  // Returns { ok, fuel, coins, bonusDelta, employee, error? }
  // ---------------------------------------------------------------------------
  function burnEmployee(state, employeeId) {
    if (!state) return { ok: false, error: 'no state' };
    if (!state.incineratorUnlocked) return { ok: false, error: 'The Incinerator is not yet commissioned.' };
    if (typeof Personnel === 'undefined' || !Personnel || !Personnel.findById) {
      return { ok: false, error: 'Personnel module missing.' };
    }
    var emp = Personnel.findById(state, employeeId);
    if (!emp) return { ok: false, error: 'Subject no longer on roster.' };

    var preview = previewFuel(emp);
    var removed = Personnel.removeById(state, employeeId);
    if (!removed) return { ok: false, error: 'Could not remove subject.' };

    state.incineratorFuel = (state.incineratorFuel || 0) + preview.fuel;
    state.incineratorBurned = (state.incineratorBurned || 0) + 1;
    state.coins = (state.coins || 0) + preview.coins;

    // Recompute the permanent bonus from the running total so it cannot
    // drift from history truncation.
    var newBonus = Math.floor((state.incineratorFuel || 0) / 10) * INCIN_BONUS_PER_10_FUEL;
    var prevBonus = state.incineratorFuelBonus || 0;
    state.incineratorFuelBonus = newBonus;
    var bonusDelta = Math.max(0, newBonus - prevBonus);

    // History log (capped)
    if (!Array.isArray(state.incineratorLog)) state.incineratorLog = [];
    state.incineratorLog.push({
      at: Date.now(),
      subjectId: emp.id,
      subjectName: emp.name,
      subjectRole: emp.role,
      subjectPool: emp.pool,
      wasDissident: !!emp.dissident,
      tenureDays: tenureDays(emp),
      fuel: preview.fuel,
      coins: preview.coins,
      bonusDelta: bonusDelta
    });
    if (state.incineratorLog.length > 200) {
      state.incineratorLog.splice(0, state.incineratorLog.length - 200);
    }

    return {
      ok: true,
      fuel: preview.fuel,
      coins: preview.coins,
      bonusDelta: bonusDelta,
      newBonus: newBonus,
      employee: {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        pool: emp.pool,
        wasDissident: !!emp.dissident
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.Incinerator = {
    previewFuel: previewFuel,
    burnEmployee: burnEmployee,
    getBonus: getBonus,
    getTotalFuel: getTotalFuel,
    getBurnedCount: getBurnedCount,
    POOL_MULT: POOL_MULT,
    INCIN_COIN_PER_FUEL: INCIN_COIN_PER_FUEL,
    INCIN_BONUS_PER_10_FUEL: INCIN_BONUS_PER_10_FUEL
  };

})();
