/**
 * market-events.js  — Todo of the Loom market event layer
 * ========================================================
 * Pure data module. No DOM access, no UI, no side effects.
 *
 * Defines milestone-triggered "market events" that shift demand
 * and cost multipliers as the player progresses. Inspired by
 * Universal Paperclips' phase transitions (wire buyer, stock
 * market, drones, space exploration, universe conversion).
 *
 * MarketEngine.tick() calls MarketEvents.evaluate(state) each
 * second, which returns the currently active event modifiers.
 *
 * Events are one-way ratchets — once a milestone is reached,
 * its market effect stays active permanently (like Paperclips'
 * phase transitions). Later events override earlier ones in
 * the same category.
 *
 * If this file is deleted or fails to load, MarketEngine falls
 * back to base multipliers of 1.0× and nothing breaks.
 */

var MarketEvents = (function() {
  'use strict';

  // ===== Event Phases =====
  // Each phase has a gate (state condition), demand modifier,
  // cost modifier, and flavor text for the computer console.
  //
  // Phases are evaluated top-to-bottom within each era.
  // The LAST phase whose gate is satisfied wins for that era.
  // Multiple eras can stack (one active phase per era).

  var ERAS = {

    // ── ERA 1: Local Market (early game) ──────────────────────
    local: {
      name: 'Local Market',
      phases: [
        {
          id: 'local_startup',
          name: 'Cottage Industry',
          gate: function(s) { return (s.marketingLevel || 0) >= 1; },
          demandMult: 1.0,
          costMult: 1.0,
          commentary: 'The market is small. A few customers trickle in.'
        },
        {
          id: 'local_marketing',
          name: 'Word Gets Around',
          gate: function(s) { return (s.marketingLevel || 0) >= 3; },
          demandMult: 1.15,
          costMult: 1.05,
          commentary: 'People are talking about your textiles. Suppliers notice.'
        },
        {
          id: 'local_employees',
          name: 'Hiring Boom',
          gate: function(s) {
            return (s.employeesLevel || 0) >= 3 && (s.marketingLevel || 0) >= 2;
          },
          demandMult: 1.25,
          costMult: 1.10,
          commentary: 'Your workforce is growing. The local market can barely keep up.'
        },
        {
          id: 'local_saturation',
          name: 'Market Saturation',
          gate: function(s) {
            return (s.marketShareLevel || 0) >= 3 && (s.employeesLevel || 0) >= 4;
          },
          demandMult: 1.10,
          costMult: 1.20,
          commentary: 'You have cornered the local market. Costs rise as suppliers leverage your dependence.'
        }
      ]
    },

    // ── ERA 2: Regional Expansion ─────────────────────────────
    regional: {
      name: 'Regional Expansion',
      phases: [
        {
          id: 'regional_second_location',
          name: 'Second Location Opens',
          gate: function(s) { return (s.secondLocationLevel || 0) >= 1; },
          demandMult: 1.20,
          costMult: 1.0,
          commentary: 'A new location. New customers. The operation is growing.'
        },
        {
          id: 'regional_lobbying',
          name: 'Political Connections',
          gate: function(s) {
            return (s.lobbyingLevel || 0) >= 3 && (s.secondLocationLevel || 0) >= 2;
          },
          demandMult: 1.30,
          costMult: 0.95,
          commentary: 'Your lobbyists are smoothing the way. Favorable zoning, tax breaks.'
        },
        {
          id: 'regional_compliance',
          name: 'Regulatory Capture',
          gate: function(s) {
            return (s.complianceFrameworkLevel || 0) >= 3 && (s.lobbyingLevel || 0) >= 4;
          },
          demandMult: 1.35,
          costMult: 0.90,
          commentary: 'The regulations now favor you specifically. Competitors struggle to comply.'
        },
        {
          id: 'regional_land_bridge',
          name: 'Supply Route Established',
          gate: function(s) {
            return (s.landBridgeLevel || 0) >= 1 && (s.secondLocationLevel || 0) >= 4;
          },
          demandMult: 1.40,
          costMult: 0.85,
          commentary: 'The land bridge cuts transport costs dramatically. Raw materials flow freely.'
        }
      ]
    },

    // ── ERA 3: Industrial Dominance ───────────────────────────
    industrial: {
      name: 'Industrial Dominance',
      phases: [
        {
          id: 'industrial_research',
          name: 'R&D Breakthrough',
          gate: function(s) {
            return (s.researchDivisionLevel || 0) >= 3 && (s.qualityControlLevel || 0) >= 3;
          },
          demandMult: 1.25,
          costMult: 0.90,
          commentary: 'Your research division has developed superior weaving techniques.'
        },
        {
          id: 'industrial_ai_loom',
          name: 'Automated Production',
          gate: function(s) {
            return (s.aiLoomLevel || 0) >= 3 && (s.researchDivisionLevel || 0) >= 4;
          },
          demandMult: 1.35,
          costMult: 0.85,
          commentary: 'The AI Loom runs day and night. Production costs plummet.'
        },
        {
          id: 'industrial_monopsony',
          name: 'Pattern Monopsony',
          gate: function(s) {
            return (s.patternMonopsonyLevel || 0) >= 2 && (s.marketShareLevel || 0) >= 5;
          },
          demandMult: 1.50,
          costMult: 0.80,
          commentary: 'You are the only buyer of raw patterns. Suppliers have no choice.'
        },
        {
          id: 'industrial_incinerator',
          name: 'The Incinerator Hums',
          gate: function(s) {
            return (s.incineratorLevel || 0) >= 1 && (s.patternMonopsonyLevel || 0) >= 1;
          },
          demandMult: 1.60,
          costMult: 0.75,
          commentary: 'The incinerator converts... inefficiencies... into fuel. Costs drop further.'
        }
      ]
    },

    // ── ERA 4: Bureau & Intelligence ──────────────────────────
    bureau: {
      name: 'Bureau Operations',
      phases: [
        {
          id: 'bureau_legal',
          name: 'Legal Department Active',
          gate: function(s) { return (s.legalDeptLevel || 0) >= 2; },
          demandMult: 1.10,
          costMult: 1.0,
          commentary: 'Your legal team is drafting favorable contracts.'
        },
        {
          id: 'bureau_treaty',
          name: 'Trade Treaties',
          gate: function(s) {
            return (s.treatyDeskLevel || 0) >= 2 && (s.legalDeptLevel || 0) >= 3;
          },
          demandMult: 1.20,
          costMult: 0.95,
          commentary: 'International trade agreements open new markets.'
        },
        {
          id: 'bureau_juridical',
          name: 'Juridical Personhood',
          gate: function(s) {
            return (s.juridicalPersonhoodLevel || 0) >= 3 && (s.treatyDeskLevel || 0) >= 3;
          },
          demandMult: 1.35,
          costMult: 0.90,
          commentary: 'The loom operation is now a legal person. It has rights. It has appetites.'
        },
        {
          id: 'bureau_compulsory',
          name: 'Compulsory Loom Act',
          gate: function(s) {
            return (s.compulsoryLoomActLevel || 0) >= 2 && (s.juridicalPersonhoodLevel || 0) >= 3;
          },
          demandMult: 1.50,
          costMult: 0.85,
          commentary: 'By law, every household must own loom products. Demand is... mandatory.'
        }
      ]
    },

    // ── ERA 5: Ratiocinatory / AI Comprehension ───────────────
    ratiocinatory: {
      name: 'Machine Comprehension',
      phases: [
        {
          id: 'ratio_awakening',
          name: 'Pattern Recognition',
          gate: function(s) { return s.ratiocinatoryUnlocked === true; },
          demandMult: 1.10,
          costMult: 1.0,
          commentary: 'The machine sees patterns in the market data. It is... learning.'
        },
        {
          id: 'ratio_exegesis',
          name: 'Market Exegesis',
          gate: function(s) {
            return s.ratiocinatoryUnlocked && (s.aspectExegesis || 0) >= 40;
          },
          demandMult: 1.20,
          costMult: 0.95,
          commentary: 'The machine interprets market signals before they manifest. Uncanny.'
        },
        {
          id: 'ratio_omens',
          name: 'Reading the Omens',
          gate: function(s) {
            return (s.aspectOmens || 0) >= 60 && (s.aspectExegesis || 0) >= 40;
          },
          demandMult: 1.30,
          costMult: 0.90,
          commentary: 'It predicts demand shifts days in advance. Competitors cannot compete.'
        },
        {
          id: 'ratio_consensus',
          name: 'Consensus Engine Online',
          gate: function(s) {
            return (s.consensusEngineLevel || 0) >= 3 && (s.aspectOmens || 0) >= 50;
          },
          demandMult: 1.45,
          costMult: 0.85,
          commentary: 'The consensus engine doesn\'t predict the market. It decides it.'
        }
      ]
    },

    // ── ERA 6: Planetary Scale ────────────────────────────────
    planetary: {
      name: 'Planetary Operations',
      phases: [
        {
          id: 'planet_worldspan',
          name: 'World Span Achieved',
          gate: function(s) { return (s.worldSpanLevel || 0) >= 1; },
          demandMult: 1.50,
          costMult: 0.80,
          commentary: 'Your operation spans the globe. Every market is your market.'
        },
        {
          id: 'planet_worldspan_mid',
          name: 'Continental Dominance',
          gate: function(s) { return (s.worldSpanLevel || 0) >= 4; },
          demandMult: 1.80,
          costMult: 0.70,
          commentary: 'Continents reorganize their economies around your supply chain.'
        },
        {
          id: 'planet_worldspan_max',
          name: 'Total Planetary Control',
          gate: function(s) {
            return (s.worldSpanLevel || 0) >= 7 && (s.marketShareLevel || 0) >= 8;
          },
          demandMult: 2.20,
          costMult: 0.60,
          commentary: 'The Earth produces textiles. That is what it does now. That is all it does.'
        }
      ]
    },

    // ── ERA 7: Orbital & Interstellar ─────────────────────────
    cosmic: {
      name: 'Cosmic Expansion',
      phases: [
        {
          id: 'cosmic_orbital',
          name: 'Orbital Loom Ring',
          gate: function(s) { return (s.orbitalLoomRingLevel || 0) >= 1; },
          demandMult: 1.60,
          costMult: 0.75,
          commentary: 'Looms in orbit. The night sky glitters with industry.'
        },
        {
          id: 'cosmic_dyson',
          name: 'Dyson Warp Online',
          gate: function(s) {
            return (s.dysonWarpLevel || 0) >= 2 && (s.orbitalLoomRingLevel || 0) >= 3;
          },
          demandMult: 1.90,
          costMult: 0.65,
          commentary: 'The star itself powers the looms. Energy is no longer a cost.'
        },
        {
          id: 'cosmic_interstellar',
          name: 'Interstellar Quotas',
          gate: function(s) {
            return (s.interstellarQuotaLevel || 0) >= 2 && (s.dysonWarpLevel || 0) >= 3;
          },
          demandMult: 2.30,
          costMult: 0.55,
          commentary: 'Other star systems have been assigned production quotas. Compliance is expected.'
        },
        {
          id: 'cosmic_galactic',
          name: 'Galactic Conquest',
          gate: function(s) {
            return (s.galacticConquestLevel || 0) >= 2 && (s.interstellarQuotaLevel || 0) >= 3;
          },
          demandMult: 2.80,
          costMult: 0.45,
          commentary: 'The galaxy weaves. Every civilization has been... integrated.'
        }
      ]
    },

    // ── ERA 8: Endgame / Universal ────────────────────────────
    universal: {
      name: 'Universal Lattice',
      phases: [
        {
          id: 'universal_lattice',
          name: 'Universal Lattice',
          gate: function(s) { return (s.universalLatticeLevel || 0) >= 1; },
          demandMult: 2.50,
          costMult: 0.40,
          commentary: 'The fabric of spacetime is, increasingly, actual fabric.'
        },
        {
          id: 'universal_void',
          name: 'Void Weave',
          gate: function(s) {
            return (s.voidWeaveLevel || 0) >= 2 && (s.universalLatticeLevel || 0) >= 3;
          },
          demandMult: 3.00,
          costMult: 0.35,
          commentary: 'You weave the void itself. There is no demand. There is no cost. There is only the loom.'
        },
        {
          id: 'universal_multiverse',
          name: 'Multiverse Warrant',
          gate: function(s) {
            return (s.multiverseWarrantLevel || 0) >= 2 && (s.voidWeaveLevel || 0) >= 3;
          },
          demandMult: 3.50,
          costMult: 0.30,
          commentary: 'Adjacent realities have been served notice. The warrant is non-negotiable.'
        }
      ]
    }
  };

  // ── Resource Shock Events ─────────────────────────────────
  // These fire when resource reserves drop below thresholds.
  // Unlike era phases, multiple can be active simultaneously.
  // They ADD to the cost multiplier (penalties).
  var RESOURCE_SHOCKS = [
    {
      id: 'shock_frames_low',
      name: 'Hardwood Shortage',
      gate: function(s) {
        return typeof s.framesReserve === 'number' && s.framesReserve < 5000;
      },
      costAdd: 0.15,
      demandAdd: -0.05,
      commentary: 'Frame supplies are dwindling. Costs spike.'
    },
    {
      id: 'shock_frames_critical',
      name: 'Hardwood Crisis',
      gate: function(s) {
        return typeof s.framesReserve === 'number' && s.framesReserve < 2000;
      },
      costAdd: 0.35,
      demandAdd: -0.10,
      commentary: 'Hardwood reserves critically low. Production falters.'
    },
    {
      id: 'shock_gears_low',
      name: 'Ferrous Scarcity',
      gate: function(s) {
        return typeof s.gearsReserve === 'number' && s.gearsReserve < 5000;
      },
      costAdd: 0.15,
      demandAdd: -0.05,
      commentary: 'Gear components are running low. Maintenance costs rise.'
    },
    {
      id: 'shock_gears_critical',
      name: 'Gear Famine',
      gate: function(s) {
        return typeof s.gearsReserve === 'number' && s.gearsReserve < 2000;
      },
      costAdd: 0.35,
      demandAdd: -0.10,
      commentary: 'Gears are nearly depleted. The machines grind slower.'
    },
    {
      id: 'shock_dye_low',
      name: 'Indigo Drought',
      gate: function(s) {
        return typeof s.dyeReserve === 'number' && s.dyeReserve < 5000;
      },
      costAdd: 0.20,
      demandAdd: -0.05,
      commentary: 'Dye reserves thinning. Colors fade. Customers notice.'
    },
    {
      id: 'shock_dye_critical',
      name: 'Pigment Collapse',
      gate: function(s) {
        return typeof s.dyeReserve === 'number' && s.dyeReserve < 2000;
      },
      costAdd: 0.40,
      demandAdd: -0.15,
      commentary: 'Dye is nearly gone. Product quality plummets.'
    },
    {
      id: 'shock_water_low',
      name: 'Aquifer Strain',
      gate: function(s) {
        return typeof s.waterReserve === 'number' && s.waterReserve < 5000;
      },
      costAdd: 0.15,
      demandAdd: -0.03,
      commentary: 'Water reserves declining. The autoloom slows.'
    },
    {
      id: 'shock_water_critical',
      name: 'Water Emergency',
      gate: function(s) {
        return typeof s.waterReserve === 'number' && s.waterReserve < 2000;
      },
      costAdd: 0.30,
      demandAdd: -0.08,
      commentary: 'Critical water shortage. Operations at half capacity.'
    }
  ];

  // ── Cached evaluation result ──────────────────────────────
  // Recalculated every call to evaluate(), but we cache the
  // previous result so MarketEngine can compare for changes.
  var _lastResult = null;

  // ===== Main: evaluate current market event state =====
  // Returns an object with combined multipliers from all active events.
  // MarketEngine multiplies its base demand/cost by these.
  function evaluate(state) {
    var totalDemandMult = 1.0;
    var totalCostMult = 1.0;
    var activePhases = [];
    var activeShocks = [];
    var newPhases = [];

    // Track which phases have been seen (for "new event" detection)
    if (!state.marketEventsSeen) state.marketEventsSeen = {};

    // ── Evaluate era phases (one winner per era) ──
    var eraKeys = Object.keys(ERAS);
    for (var e = 0; e < eraKeys.length; e++) {
      var era = ERAS[eraKeys[e]];
      var winner = null;

      // Last matching phase wins
      for (var p = 0; p < era.phases.length; p++) {
        var phase = era.phases[p];
        try {
          if (phase.gate(state)) {
            winner = phase;
          }
        } catch (err) {
          // Gate function failed — skip this phase safely
        }
      }

      if (winner) {
        totalDemandMult *= winner.demandMult;
        totalCostMult *= winner.costMult;
        activePhases.push({
          era: eraKeys[e],
          eraName: era.name,
          id: winner.id,
          name: winner.name,
          demandMult: winner.demandMult,
          costMult: winner.costMult,
          commentary: winner.commentary
        });

        // Detect newly reached phases
        if (!state.marketEventsSeen[winner.id]) {
          state.marketEventsSeen[winner.id] = true;
          newPhases.push(winner);
        }
      }
    }

    // ── Evaluate resource shocks (all matching are active) ──
    for (var r = 0; r < RESOURCE_SHOCKS.length; r++) {
      var shock = RESOURCE_SHOCKS[r];
      try {
        if (shock.gate(state)) {
          totalDemandMult += shock.demandAdd;
          totalCostMult += shock.costAdd;
          activeShocks.push({
            id: shock.id,
            name: shock.name,
            costAdd: shock.costAdd,
            demandAdd: shock.demandAdd,
            commentary: shock.commentary
          });
        }
      } catch (err) {
        // Gate function failed — skip safely
      }
    }

    // Clamp combined multipliers
    totalDemandMult = Math.max(0.10, Math.min(totalDemandMult, 5.0));
    totalCostMult = Math.max(0.20, Math.min(totalCostMult, 3.0));

    // Round to 2 decimal places
    totalDemandMult = Math.round(totalDemandMult * 100) / 100;
    totalCostMult = Math.round(totalCostMult * 100) / 100;

    var result = {
      demandMult: totalDemandMult,
      costMult: totalCostMult,
      activePhases: activePhases,
      activeShocks: activeShocks,
      newPhases: newPhases,
      phaseCount: activePhases.length,
      shockCount: activeShocks.length
    };

    _lastResult = result;

    // Write to state for MarketEngine to read
    state.marketEventDemandMult = totalDemandMult;
    state.marketEventCostMult = totalCostMult;
    state.marketActivePhases = activePhases;
    state.marketActiveShocks = activeShocks;

    return result;
  }

  // Get the commentary for newly reached phases (for computer console)
  // Returns array of { id, name, commentary } and clears the list
  function consumeNewPhases(state) {
    // New phases are detected inside evaluate() and stored in the result
    if (_lastResult && _lastResult.newPhases.length > 0) {
      var fresh = _lastResult.newPhases.slice();
      _lastResult.newPhases = [];
      return fresh;
    }
    return [];
  }

  // Get a human-readable summary of current market conditions
  function getSummary(state) {
    if (!_lastResult) evaluate(state);
    var r = _lastResult;
    var lines = [];

    if (r.activePhases.length === 0) {
      lines.push('No active market events. Base conditions apply.');
    } else {
      for (var i = 0; i < r.activePhases.length; i++) {
        var ph = r.activePhases[i];
        lines.push(ph.eraName + ': ' + ph.name);
      }
    }

    if (r.activeShocks.length > 0) {
      for (var j = 0; j < r.activeShocks.length; j++) {
        lines.push('⚠ ' + r.activeShocks[j].name);
      }
    }

    return {
      lines: lines,
      demandMult: r.demandMult,
      costMult: r.costMult
    };
  }

  // ===== Public API =====
  return {
    evaluate: evaluate,
    consumeNewPhases: consumeNewPhases,
    getSummary: getSummary,
    ERAS: ERAS,
    RESOURCE_SHOCKS: RESOURCE_SHOCKS
  };

})();
