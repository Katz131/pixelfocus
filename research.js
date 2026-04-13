// =============================================================================
// research.js — v3.20.0 Stage 3 Research Lab (pure logic module)
// =============================================================================
// The Research Lab is the third stage of the v3.20.0 content pass. Once the
// player buys the "Research Lab" factory upgrade (a one-time unlock, like
// the Ratiocinatory), a new door appears on the factory top bar leading to
// research.html. Inside, the player can conduct experiments on members of
// the personnel roster (the employees Stage 2 established) and, later, on
// "patsies" from the Ratiocinatory.
//
// An experiment takes:
//   - a subject (an employee object from state.personnelRoster)
//   - a money cost (charged to state.coins)
//   - optionally, a requirement on the subject's pool or tenure
//
// Each experiment has three weighted outcomes:
//   SUCCESS    — subject stays, a reward is granted
//   INCONCLUSIVE — subject stays, no reward
//   FAILURE    — subject is removed from the roster forever
//                (failure generally also grants a smaller consolation payout
//                 — the lab "learned something" from the departure)
//
// Failure uses Personnel.removeById, which increments personnelDepartures
// and keeps the roster from being silently back-filled on reconcile.
//
// IMPORTANT: this file is window-scoped (IIFE) and exports a single global
// named Research. It has NO DOM code — research-window.js renders the UI
// and calls Research.runExperiment() when the player clicks a button.
//
// The catalog is designed to be non-monstrous in tone: the experiments
// read as quirky corporate HR theatre (sensitivity audits, bandwidth
// harvests, compliance drills) with the mordant understanding that
// "failure" quietly consumes a named person. This matches the Stranger-
// Than-Fiction / Wes Anderson pool flavor from personnel.js.
// =============================================================================

(function() {
  'use strict';

  // Cooldown between experiments, in ms. Prevents burning through the
  // entire roster in a single sitting — experiments are meant to feel
  // like decisions, not grinding.
  var COOLDOWN_MS = 90 * 1000; // 90 seconds

  // ---------------------------------------------------------------------------
  // Experiment catalog.
  //
  // Each entry:
  //   id            — stable string key stored in log entries
  //   title         — human readable name
  //   subtitle      — short tagline
  //   desc          — longer description shown in the card
  //   cost          — money cost
  //   minEmployees  — minimum roster size required to run this experiment
  //   requires      — optional predicate(state, subject) -> bool
  //   outcomes      — { success: weight, inconclusive: weight, failure: weight }
  //   rewards       — { success: fn(state, subject), failure: fn(state, subject) }
  //   flavor        — { success: [lines], inconclusive: [lines], failure: [lines] }
  //
  // All weights are relative; they don't need to sum to 100. Reward fns
  // are expected to mutate state directly (add coins, set flags, etc.)
  // and return a short result string describing what happened.
  // ---------------------------------------------------------------------------
  var EXPERIMENTS = [
    {
      id: 'bandwidth-harvest',
      title: 'Bandwidth Harvest',
      subtitle: 'An attention-span audit conducted during a long afternoon.',
      desc: 'The subject is seated at a tidy desk and asked to sort colored tags for ninety minutes while three clocks tick at slightly different rates. An observer takes notes on their posture. Afterwards, the subject may be offered a mint.',
      cost: 400,
      minEmployees: 1,
      outcomes: { success: 55, inconclusive: 30, failure: 15 },
      rewards: {
        success: function(state) {
          var bonus = 800 + Math.floor((state.employeesLevel || 0) * 200);
          state.coins = (state.coins || 0) + bonus;
          return 'Attention harvested. +$' + bonus + ' in productivity credit.';
        },
        failure: function(state) {
          var bonus = 300;
          state.coins = (state.coins || 0) + bonus;
          return 'Subject quietly withdrew their candidacy for further work. +$' + bonus + ' severance return.';
        }
      },
      flavor: {
        success: [
          '{name} sorts the tags with an unsettling courtesy. The observer makes two separate notes about the word "aligned."',
          '{name} completes the task in seventy-four minutes and asks whether there are more tags. There are always more tags.',
          '{name} arranges the tags into a small, unrequested mosaic. It is filed. It is admired. It is filed again.'
        ],
        inconclusive: [
          '{name} sorts tags thoughtfully but the observer\u2019s pen runs dry at minute forty. The notes for minutes 40 through 90 are blank.',
          '{name} asks to reschedule. The reschedule is granted. The reschedule is misplaced.'
        ],
        failure: [
          '{name} stands up at minute sixty-three, folds the chair, and walks out through a door that is not normally a door. They are not seen again.',
          '{name} closes their eyes "for just a second" and is gently guided to the HR office, which today is on a different floor, and then on no floor at all.',
          '{name} discovers, halfway through the audit, that they have an uncle in a distant province who needs them. They leave. The uncle is real.'
        ]
      }
    },

    {
      id: 'compliance-drill',
      title: 'Compliance Drill',
      subtitle: 'A standing-office refresher on the manual of acceptable nods.',
      desc: 'A 40-minute lecture is delivered on the correct angle at which to tilt one\u2019s head when being addressed by a superior. The subject is tested afterwards. The lecturer is rarely present at the testing and is never present at the retesting.',
      cost: 800,
      minEmployees: 2,
      outcomes: { success: 50, inconclusive: 30, failure: 20 },
      rewards: {
        success: function(state) {
          state.researchComplianceBonus = (state.researchComplianceBonus || 0) + 1;
          var bonus = 1500;
          state.coins = (state.coins || 0) + bonus;
          return 'Compliance +1. +$' + bonus + ' on the way out.';
        },
        failure: function(state) {
          var bonus = 500;
          state.coins = (state.coins || 0) + bonus;
          return 'Subject self-selected out of the roster. +$' + bonus + ' administrative recovery.';
        }
      },
      flavor: {
        success: [
          '{name} nods at exactly the right angle. The lecturer, watching from the ceiling via a panel that should not open, is visibly moved.',
          '{name} passes the test and is immediately given a harder test. They pass that one too. It is noted.',
          '{name} thanks the lecturer by name. The name is wrong. The lecturer accepts it.'
        ],
        inconclusive: [
          '{name} nods at an angle the manual describes as "acceptable under lamplight." The test is inconclusive.',
          '{name} passes the written test and fails the mirror test. The mirror is, by policy, the decisive one. A re-test is scheduled and forgotten.'
        ],
        failure: [
          '{name} nods too eagerly and pulls a muscle in their neck. They take sick leave. The sick leave is never rescinded.',
          '{name} asks whether the manual has been revised. The question is on its own a failure state. HR arrives with flowers.',
          '{name} is found to have been nodding ironically the entire time. The office is not equipped to handle irony.'
        ]
      }
    },

    {
      id: 'sensitivity-audit',
      title: 'Sensitivity Audit',
      subtitle: 'A one-on-one conversation about the pamphlet, specifically.',
      desc: 'The subject is handed a glossy pamphlet titled "What We Mean When We Say \u2018We.\u2019" They are given seven minutes to read it and are then asked what it means. The correct answer is printed on page four, upside down, in a font the subject does not own.',
      cost: 1500,
      minEmployees: 3,
      outcomes: { success: 45, inconclusive: 35, failure: 20 },
      rewards: {
        success: function(state) {
          state.researchSensitivityCleared = (state.researchSensitivityCleared || 0) + 1;
          var bonus = 2500;
          state.coins = (state.coins || 0) + bonus;
          return 'Audit cleared. +$' + bonus + ' and a standing commendation (filed).';
        },
        failure: function(state) {
          var bonus = 800;
          state.coins = (state.coins || 0) + bonus;
          return 'Subject asked to be excused. The excuse became permanent. +$' + bonus + '.';
        }
      },
      flavor: {
        success: [
          '{name} reads the pamphlet twice, looks up, and says "we." The room exhales.',
          '{name} correctly identifies the pronoun on page four without turning the pamphlet over. No one can explain how.',
          '{name} offers a friendly amendment to the pamphlet. The amendment is accepted. The pamphlet is not reprinted.'
        ],
        inconclusive: [
          '{name} reads the pamphlet carefully, returns it, and asks for a glass of water. The audit is tabled.',
          '{name} volunteers that they already agree with everything the pamphlet implies. The auditor finds this troublingly convenient and tables it.'
        ],
        failure: [
          '{name} reads the pamphlet and asks, softly, "who is we?" The auditor thanks them for coming.',
          '{name} is found to have been writing in the margins. The margins are now evidence, and evidence is not the subject\u2019s to keep.',
          '{name} disagrees with one comma. HR produces a box of their things in under four minutes. The box is already labeled.'
        ]
      }
    },

    {
      id: 'memory-consolidation',
      title: 'Memory Consolidation Trial',
      subtitle: 'A soft-spoken afternoon with a ledger and a hot drink.',
      desc: 'The subject is asked to recall, in order, the names of every colleague they have ever had, including the ones they would prefer not to. A stenographer is present. The stenographer, it transpires, does not actually write anything down — their typewriter is decorative.',
      cost: 2500,
      minEmployees: 4,
      outcomes: { success: 40, inconclusive: 30, failure: 30 },
      rewards: {
        success: function(state) {
          var bonus = 5000 + Math.floor((state.personnelDepartures || 0) * 200);
          state.coins = (state.coins || 0) + bonus;
          return 'Consolidated memories are, in their way, assets. +$' + bonus + '.';
        },
        failure: function(state) {
          var bonus = 1500;
          state.coins = (state.coins || 0) + bonus;
          return 'Subject\u2019s memory consolidated itself, with prejudice. +$' + bonus + ' archival recovery.';
        }
      },
      flavor: {
        success: [
          '{name} remembers every name and one face nobody else recognizes. The unrecognized face is added to the personnel file as a courtesy.',
          '{name} remembers a man named Clive who may or may not have worked here. A memo is drafted acknowledging Clive.',
          '{name} recites the names in perfect alphabetical order and no one, including {name}, knows why they chose alphabetical.'
        ],
        inconclusive: [
          '{name} remembers most of it. The stenographer closes their decorative typewriter with a small nod.',
          '{name} remembers everything up to a Tuesday in 2018 and then goes very still. The audit reschedules itself.'
        ],
        failure: [
          '{name} remembers something they were not supposed to remember. The stenographer, who does not write, writes.',
          '{name} forgets their own name on the way out, which is administratively convenient.',
          '{name} recalls a colleague, and the colleague recalls them in return, and neither can produce proof of either having existed. One must be removed. It is {name}.'
        ]
      }
    },

    {
      id: 'productive-daydream',
      title: 'Productive Daydream Session',
      subtitle: 'Sixty minutes of staring out a window on company time.',
      desc: 'The subject is given a window, a chair, and a cup of tepid water. They are told to daydream productively. What constitutes productive daydreaming is not defined and is, the instructions note, "the entire point."',
      cost: 350,
      minEmployees: 1,
      outcomes: { success: 60, inconclusive: 32, failure: 8 },
      rewards: {
        success: function(state) {
          var bonus = 600;
          state.coins = (state.coins || 0) + bonus;
          return 'A moderate daydream was observed. +$' + bonus + '.';
        },
        failure: function(state) {
          var bonus = 200;
          state.coins = (state.coins || 0) + bonus;
          return 'Daydream escaped its container. +$' + bonus + ' containment fee.';
        }
      },
      flavor: {
        success: [
          '{name} stares at the window for the full hour and produces a 3-word summary that is, somehow, actionable.',
          '{name} sketches a cloud on the back of a requisition form. The cloud is filed under "capital improvements."',
          '{name} returns from the session visibly rested and proposes a small change to the break-room lighting. The change is approved.'
        ],
        inconclusive: [
          '{name} daydreams but cannot say what about. The observer files "pastoral" and moves on.',
          '{name} falls asleep for twelve minutes. Regulations are unclear whether this counts. It is tabled.'
        ],
        failure: [
          '{name}\u2019s daydream takes them literally elsewhere. Their chair is still warm. The window, upon inspection, has no latch.',
          '{name} daydreams their way into a promotion that does not exist. HR spends an afternoon unbuilding the promotion, and the subject, and the week.'
        ]
      }
    }
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function getExperiments() { return EXPERIMENTS.slice(); }

  function getExperimentById(id) {
    for (var i = 0; i < EXPERIMENTS.length; i++) {
      if (EXPERIMENTS[i].id === id) return EXPERIMENTS[i];
    }
    return null;
  }

  function rosterSize(state) {
    if (!state || !Array.isArray(state.personnelRoster)) return 0;
    return state.personnelRoster.length;
  }

  function cooldownRemainingMs(state) {
    if (!state || !state.researchCooldownUntil) return 0;
    var left = state.researchCooldownUntil - Date.now();
    return left > 0 ? left : 0;
  }

  // Returns an object describing why an experiment is unavailable, or
  // null if it can be run right now on any subject.
  function experimentAvailability(state, exp) {
    if (!state || !exp) return { reason: 'Unknown experiment.' };
    if (!state.researchLabUnlocked) return { reason: 'The Research Lab is not yet open.' };
    var n = rosterSize(state);
    if (n < (exp.minEmployees || 1)) {
      return { reason: 'Requires at least ' + (exp.minEmployees || 1) + ' employees on the roster.' };
    }
    var cost = exp.cost || 0;
    if ((state.coins || 0) < cost) {
      return { reason: 'Requires $' + cost + '.' };
    }
    var cdLeft = cooldownRemainingMs(state);
    if (cdLeft > 0) {
      return { reason: 'The lab is resetting (' + Math.ceil(cdLeft / 1000) + 's).', cooldownLeft: cdLeft };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Weighted outcome roll. Uses Math.random — this is the ONLY source of
  // non-determinism in the lab. Returns 'success' | 'inconclusive' | 'failure'.
  // ---------------------------------------------------------------------------
  function rollOutcome(weights) {
    var w = weights || { success: 50, inconclusive: 30, failure: 20 };
    var s = (w.success || 0) + (w.inconclusive || 0) + (w.failure || 0);
    if (s <= 0) return 'inconclusive';
    var r = Math.random() * s;
    if (r < (w.success || 0)) return 'success';
    if (r < (w.success || 0) + (w.inconclusive || 0)) return 'inconclusive';
    return 'failure';
  }

  function pickFlavor(exp, outcome, subject) {
    var pool = (exp.flavor && exp.flavor[outcome]) || [];
    if (pool.length === 0) return '';
    var line = pool[Math.floor(Math.random() * pool.length)];
    return line.replace(/\{name\}/g, (subject && subject.name) || 'The subject');
  }

  // ---------------------------------------------------------------------------
  // Run an experiment by id on a specific subject id. Mutates state,
  // returns an object describing what happened for the UI to display:
  //   { ok: bool, outcome, experimentId, subjectName, line, reward,
  //     subjectRemoved: bool }
  //
  // On failure, calls Personnel.removeById to retire the subject.
  // On any success or failure, grants the experiment's reward function.
  // Appends to state.researchHistoryLog for the history panel.
  // Sets state.researchCooldownUntil to now + COOLDOWN_MS.
  // ---------------------------------------------------------------------------
  function runExperiment(state, experimentId, subjectId) {
    if (!state) return { ok: false, error: 'no state' };
    var exp = getExperimentById(experimentId);
    if (!exp) return { ok: false, error: 'unknown experiment' };
    var unavailable = experimentAvailability(state, exp);
    if (unavailable) return { ok: false, error: unavailable.reason };
    if (typeof Personnel === 'undefined' || !Personnel || !Personnel.findById) {
      return { ok: false, error: 'Personnel module missing.' };
    }
    var subject = Personnel.findById(state, subjectId);
    if (!subject) return { ok: false, error: 'Subject no longer on roster.' };

    // Charge cost up front
    state.coins = (state.coins || 0) - (exp.cost || 0);

    // Roll outcome
    var outcome = rollOutcome(exp.outcomes);
    var rewardMsg = '';
    var subjectRemoved = false;

    if (outcome === 'success') {
      if (exp.rewards && typeof exp.rewards.success === 'function') {
        rewardMsg = exp.rewards.success(state, subject) || '';
      }
    } else if (outcome === 'failure') {
      if (exp.rewards && typeof exp.rewards.failure === 'function') {
        rewardMsg = exp.rewards.failure(state, subject) || '';
      }
      var gone = Personnel.removeById(state, subject.id);
      subjectRemoved = !!gone;
    } else {
      rewardMsg = 'Nothing to report. The file remains open.';
    }

    // v3.20.0 Stage 4: Every experiment adds stress to the subject — the
    // lab is not a friendly place, even when nothing "happens." Success
    // adds 1, inconclusive adds 2 (it was the worst of the three from a
    // human-hours perspective), failure adds nothing because the subject
    // is already gone. If stress pushes the subject over the dissident
    // threshold, the flag flips and the UI will surface it.
    if (!subjectRemoved && Personnel && Personnel.addStress) {
      var stressAmount = outcome === 'success' ? 1 : outcome === 'inconclusive' ? 2 : 0;
      if (stressAmount > 0) {
        var stressResult = Personnel.addStress(
          subject,
          stressAmount,
          'Subjected to ' + (exp.title || 'an experiment') + '.'
        );
        if (stressResult === 'dissident') {
          // Promote the flag up into the result payload so the UI /
          // MsgLog can call it out — it is a real event, not a
          // background detail.
          rewardMsg = (rewardMsg ? rewardMsg + ' ' : '') +
                      '\u2014 The subject has since stopped cooperating. They are now a dissident.';
        }
      }
    }

    // Flavor line with {name} substituted
    var line = pickFlavor(exp, outcome, subject);

    // Cooldown
    state.researchCooldownUntil = Date.now() + COOLDOWN_MS;
    state.researchExperimentsRun = (state.researchExperimentsRun || 0) + 1;

    // History log (capped)
    if (!Array.isArray(state.researchHistoryLog)) state.researchHistoryLog = [];
    state.researchHistoryLog.push({
      at: Date.now(),
      experimentId: exp.id,
      experimentTitle: exp.title,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectPool: subject.pool,
      outcome: outcome,
      line: line,
      reward: rewardMsg,
      subjectRemoved: subjectRemoved
    });
    if (state.researchHistoryLog.length > 200) {
      state.researchHistoryLog.splice(0, state.researchHistoryLog.length - 200);
    }

    return {
      ok: true,
      outcome: outcome,
      experimentId: exp.id,
      experimentTitle: exp.title,
      subjectName: subject.name,
      subjectId: subject.id,
      line: line,
      reward: rewardMsg,
      subjectRemoved: subjectRemoved,
      cost: exp.cost || 0
    };
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.Research = {
    getExperiments: getExperiments,
    getExperimentById: getExperimentById,
    runExperiment: runExperiment,
    experimentAvailability: experimentAvailability,
    cooldownRemainingMs: cooldownRemainingMs,
    rosterSize: rosterSize,
    COOLDOWN_MS: COOLDOWN_MS
  };

})();
