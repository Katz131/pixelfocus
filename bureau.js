// =============================================================================
// bureau.js — v3.21.0 Stage 1 — The Bureau / The Black Warp (logic module)
// =============================================================================
// Logic-only module. No DOM. Exports window.Bureau.
//
// Responsibilities:
//   - Define BUREAU_SLOTS (Chief of Station, Case Officer, Sparrow, Cipher Clerk,
//     Archivist, Vault Runner, Street Asset) and OPERATIONS (activatable verbs).
//   - Relocate employees from state.personnelRoster into state.bureauAgents.
//   - Return agents back to the loom floor (with a small loyalty hit).
//   - Run operations: charge cost, roll weighted outcome, pay rewards,
//     optionally burn the agent, append to state.bureauHistoryLog.
//   - Compute derived seniority (S1-S5 from tenure days) and loyalty
//     (L1-L5 from inverse stress) for any agent, without needing new
//     stored stats.
//
// State keys (all under chrome.storage.local → pixelFocusState):
//   state.bureauUnlocked       : bool, flipped by factory upgrade
//   state.bureauAgents         : { [slotId]: employeeId } map
//   state.bureauHeat           : 0..100 scalar (rises on blown ops)
//   state.bureauOpsRun         : lifetime counter
//   state.bureauBlown          : lifetime counter
//   state.bureauHistoryLog     : [{at, opId, opTitle, slotId, agentName, outcome, line, reward}]
//   state.bureauCooldownUntil  : epoch ms — global cooldown
//
// This file contains ALL the outcome logic. bureau-window.js only renders and
// dispatches clicks. Tests can import bureau.js in isolation.
// =============================================================================

(function() {
  'use strict';

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------
  var COOLDOWN_MS = 12 * 1000;           // 12s global cooldown between ops
  var HEAT_MAX = 100;
  var HEAT_COOLDOWN_UNIT = 2;            // heat ticks shed per second passively (computed on read)
  var STRESS_PER_OP = 8;                 // stress added to the agent for participating
  var STRESS_PER_BLOWN = 25;             // extra if the op was blown

  // ---------------------------------------------------------------------------
  // SLOT DEFINITIONS — the seven standing Bureau posts.
  // Each slot has:
  //   id          — storage key
  //   title       — display name (codename-ish)
  //   subtitle    — single-line flavor
  //   desc        — longer flavor used in tooltips
  //   minSeniority — 1..5 minimum derived seniority required to post here
  //   unlockCost   — one-time coin cost to open the post (future use; 0 for MVP)
  // ---------------------------------------------------------------------------
  var BUREAU_SLOTS = [
    {
      id: 'chiefOfStation',
      title: 'Chief of Station',
      subtitle: 'The hat on the coat rack is theirs.',
      desc: 'The senior post. Runs the room. Unlocks high-value operations and reduces heat accrual from blown ops.',
      minSeniority: 3,
      unlockCost: 0
    },
    {
      id: 'caseOfficer',
      title: 'Case Officer',
      subtitle: 'Handles assets. Keeps the notebook.',
      desc: 'Runs recruited assets in the field. Unlocks Recruitment operations and Sparrow Deployments.',
      minSeniority: 2,
      unlockCost: 0
    },
    {
      id: 'sparrow',
      title: 'Sparrow',
      subtitle: 'Graduate of the Reed Room.',
      desc: 'Honeytrap specialist, trained in compromise. High-return, high-risk operations.',
      minSeniority: 1,
      unlockCost: 0
    },
    {
      id: 'cipherClerk',
      title: 'Cipher Clerk',
      subtitle: 'Keeps the traffic tidy.',
      desc: 'Handles signals intelligence and communications security. Lowers the odds of messages being read.',
      minSeniority: 1,
      unlockCost: 0
    },
    {
      id: 'archivist',
      title: 'Archivist',
      subtitle: 'Catalogues the vault.',
      desc: 'Manages the kompromat vault. Enables lookups, pre-emptive releases, and a small passive income from leaks.',
      minSeniority: 2,
      unlockCost: 0
    },
    {
      id: 'vaultRunner',
      title: 'Vault Runner',
      subtitle: 'Moves the paper.',
      desc: 'Couriers between the Bureau and dead-drops. Unlocks Legend Laundry, brief-case rotations, and Dead-Drop Tailoring.',
      minSeniority: 1,
      unlockCost: 0
    },
    {
      id: 'streetAsset',
      title: 'Street Asset',
      subtitle: 'Not on any letterhead.',
      desc: 'Deniable labour on retainer. Cheap to post, but carries higher heat risk.',
      minSeniority: 1,
      unlockCost: 0
    }
  ];

  // ---------------------------------------------------------------------------
  // OPERATIONS — activatable verbs. Each op:
  //   id            — storage key
  //   title, subtitle, desc
  //   slot          — required slot id (the agent who runs the op)
  //   cost          — coin cost to run
  //   minLoyalty    — 1..5, derived loyalty floor on the assigned agent
  //   minSeniority  — 1..5, derived seniority floor on the assigned agent
  //   outcomes      — weight map: {success, partial, blown}
  //   heatOnBlown   — heat added if outcome === 'blown'
  //   burnOnBlown   — if true, 'blown' removes the agent from the roster entirely
  //   rewards       — {success(state, agent), partial(state, agent), blown(state, agent)}
  //                   each returns {coins, line} OR just a string line
  //   flavor        — {success:[], partial:[], blown:[]} pool of single-line descriptions
  //
  // This is the opening catalogue (~12 ops) — the 152-item list in
  // BUILDINGS-DESIGN.md is the eventual design target; we scaffold the
  // structure and wire up a representative dozen so the room is playable.
  // ---------------------------------------------------------------------------
  var OPERATIONS = [
    // ---------- Collection / INT ----------
    {
      id: 'surveillanceRun',
      title: 'Surveillance run',
      subtitle: 'A walk past. Twice.',
      desc: 'Send the Case Officer to lay eyes on a rival loom. Low risk, low yield, good for keeping the notebook current.',
      slot: 'caseOfficer',
      cost: 200, minSeniority: 1, minLoyalty: 2,
      outcomes: { success: 70, partial: 25, blown: 5 },
      heatOnBlown: 3, burnOnBlown: false,
      rewards: {
        success: function(s, a) { return { coins: 600, line: 'Full report filed. Two photographs, one of which is blurry but very funny.' }; },
        partial: function(s, a) { return { coins: 150, line: 'The shop was shut. We got the delivery schedule off the bins.' }; },
        blown:   function(s, a) { return { coins: 0,   line: 'An apprentice noticed. They\u2019ll remember our agent\u2019s coat.' }; }
      }
    },
    {
      id: 'signalsSweep',
      title: 'Signals sweep',
      subtitle: 'The Cipher Clerk leans into the handset.',
      desc: 'SIGINT pull. The Cipher Clerk listens to a known frequency and lifts whatever traffic is in the clear.',
      slot: 'cipherClerk',
      cost: 300, minSeniority: 2, minLoyalty: 2,
      outcomes: { success: 60, partial: 35, blown: 5 },
      heatOnBlown: 2, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 900, line: 'Three dispatches decoded. One of them is a supplier invoice. It is larger than ours.' }; },
        partial: function(s,a){ return { coins: 250, line: 'Hash of the callsign. We can pull it again when traffic lifts.' }; },
        blown:   function(s,a){ return { coins: 0,   line: 'Our counterpart sent back a palindrome. We are being waved at.' }; }
      }
    },
    {
      id: 'deadDropRotation',
      title: 'Dead-drop rotation',
      subtitle: 'Vault Runner, Tuesday, the park bench.',
      desc: 'A routine material rotation. Trains the Vault Runner and lifts a small bundle of coin from a long-standing arrangement.',
      slot: 'vaultRunner',
      cost: 150, minSeniority: 1, minLoyalty: 2,
      outcomes: { success: 75, partial: 20, blown: 5 },
      heatOnBlown: 2, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 500, line: 'Bundle collected. The paper is warm. We do not ask why.' }; },
        partial: function(s,a){ return { coins: 100, line: 'The bench was painted. Signal missed. We\u2019ll regrade.' }; },
        blown:   function(s,a){ return { coins: 0,   line: 'A parks officer asked for ID. Agent produced library card. Credible.' }; }
      }
    },

    // ---------- Recruitment / Compromise ----------
    {
      id: 'coldApproach',
      title: 'Cold approach',
      subtitle: 'The Case Officer buys someone a drink.',
      desc: 'A standing cold-pitch. The Case Officer tries to recruit a new asset at a rival loom. Cheap pitch, modest odds.',
      slot: 'caseOfficer',
      cost: 600, minSeniority: 2, minLoyalty: 3,
      outcomes: { success: 35, partial: 45, blown: 20 },
      heatOnBlown: 6, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 2000, line: 'Asset agreed in principle. We bought them a pint. They talked for two hours.' }; },
        partial: function(s,a){ return { coins: 300,  line: 'They took the drink and the card. They did not take the pitch.' }; },
        blown:   function(s,a){ return { coins: 0,    line: 'They reported us the next morning. Our agent\u2019s name is in a letter somewhere.' }; }
      }
    },
    {
      id: 'sparrowDeployment',
      title: 'Sparrow deployment',
      subtitle: 'The Reed Room\u2019s first graduate earns her coat.',
      desc: 'Honeytrap operation against a target of opportunity. High payoff, high risk. Requires a Sparrow on post.',
      slot: 'sparrow',
      cost: 1200, minSeniority: 2, minLoyalty: 3,
      outcomes: { success: 45, partial: 35, blown: 20 },
      heatOnBlown: 10, burnOnBlown: true,
      rewards: {
        success: function(s,a){ return { coins: 5000, line: 'Compromise secured. A photograph is now in our vault. The target does not yet know.' }; },
        partial: function(s,a){ return { coins: 800,  line: 'Meeting held. No material gained. The target is, however, curious.' }; },
        blown:   function(s,a){ return { coins: 0,    line: 'A hotel porter talked. The Sparrow has been shown the door. They are not coming back.' }; }
      }
    },
    {
      id: 'kompromatShelve',
      title: 'Shelve kompromat',
      subtitle: 'Archivist, side of an envelope.',
      desc: 'Consolidate existing compromising material into the vault. No field work; pays out a one-shot coin dividend on success.',
      slot: 'archivist',
      cost: 100, minSeniority: 2, minLoyalty: 2,
      outcomes: { success: 85, partial: 15, blown: 0 },
      heatOnBlown: 0, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 700, line: 'Indexed and filed. The cabinet is now one folder heavier. It does not mind.' }; },
        partial: function(s,a){ return { coins: 200, line: 'Two folders were the same folder. We caught it before filing.' }; },
        blown:   function(s,a){ return { coins: 0,   line: 'Dust. Somehow, dust. The archivist has views.' }; }
      }
    },

    // ---------- Legend / Cover ----------
    {
      id: 'legendLaundry',
      title: 'Legend laundry',
      subtitle: 'Vault Runner, new passport, Thursday.',
      desc: 'Refresh a cover identity. Small coin cost, small payoff, but reduces future blown-op probabilities (narrative only in MVP).',
      slot: 'vaultRunner',
      cost: 400, minSeniority: 2, minLoyalty: 3,
      outcomes: { success: 80, partial: 15, blown: 5 },
      heatOnBlown: 2, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 300, line: 'New legend fitted. The photograph is slightly better than the last one. A small mercy.' }; },
        partial: function(s,a){ return { coins: 80,  line: 'The clerk at the registry remembered our agent. They\u2019ll need to be re-legendeed elsewhere.' }; },
        blown:   function(s,a){ return { coins: 0,   line: 'A stamp was wrong. We burned the page. The clerk, politely, did not notice.' }; }
      }
    },

    // ---------- Street / Action ----------
    {
      id: 'streetAction',
      title: 'Street action',
      subtitle: 'A brick, a bin, a cough.',
      desc: 'Deniable direct action against a rival. Cheap, noisy, always adds heat. Not for polite evenings.',
      slot: 'streetAsset',
      cost: 250, minSeniority: 1, minLoyalty: 2,
      outcomes: { success: 55, partial: 25, blown: 20 },
      heatOnBlown: 12, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 1200, line: 'Window, bin, a small fire. The rival will spend the afternoon with a dustpan.' }; },
        partial: function(s,a){ return { coins: 200,  line: 'Bin only. The window held. The asset says next time they\u2019ll bring a brick.' }; },
        blown:   function(s,a){ return { coins: 0,    line: 'The asset was photographed. The photo is blurry but their coat is memorable.' }; }
      }
    },

    // ---------- Counterintelligence ----------
    {
      id: 'moleHunt',
      title: 'Mole hunt',
      subtitle: 'Chief of Station, door locked, one lamp.',
      desc: 'Sweep the Bureau itself for penetration. No coin payout, but on success reduces heat permanently and clears a small amount of agent stress.',
      slot: 'chiefOfStation',
      cost: 800, minSeniority: 3, minLoyalty: 4,
      outcomes: { success: 50, partial: 40, blown: 10 },
      heatOnBlown: 5, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 0,   line: 'Two discrepancies in the logbook. Reconciled by the Chief. Heat reduced.', sideEffect: 'reduceHeat:10' }; },
        partial: function(s,a){ return { coins: 0,   line: 'Nothing actionable. The tea was good.' }; },
        blown:   function(s,a){ return { coins: 0,   line: 'The mole hunt became the mole hunter. A memo leaves the Bureau.' }; }
      }
    },

    // ---------- Textile-Native ----------
    {
      id: 'threadCount',
      title: 'Thread count',
      subtitle: 'Archivist, microscope, a sample.',
      desc: 'Forensic analysis of a rival\u2019s cloth sample to reverse-engineer their dye formula. Bureau\u2019s signature textile-native op.',
      slot: 'archivist',
      cost: 500, minSeniority: 3, minLoyalty: 3,
      outcomes: { success: 55, partial: 35, blown: 10 },
      heatOnBlown: 3, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 1800, line: 'Formula reconstructed. Three aniline components, one mordant we don\u2019t stock. We will stock it.' }; },
        partial: function(s,a){ return { coins: 400,  line: 'Two components identified. The third fluoresces in a way we do not yet understand.' }; },
        blown:   function(s,a){ return { coins: 0,    line: 'The sample was a decoy. We have learned that the rival expected us to learn something.' }; }
      }
    },

    // ---------- Vault / Passive ----------
    {
      id: 'vaultLeak',
      title: 'Controlled leak',
      subtitle: 'Archivist, an envelope, the evening paper.',
      desc: 'Release a piece of kompromat on a rival. High coin payout from favourable swings, but adds meaningful heat.',
      slot: 'archivist',
      cost: 900, minSeniority: 4, minLoyalty: 4,
      outcomes: { success: 50, partial: 30, blown: 20 },
      heatOnBlown: 15, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 3500, line: 'The story broke. The rival\u2019s order book is suddenly quieter. The paper thanked us privately.' }; },
        partial: function(s,a){ return { coins: 900,  line: 'The story ran below the fold. Our vault still holds the original. We will try again.' }; },
        blown:   function(s,a){ return { coins: 0,    line: 'Traced to our envelope. A very expensive mistake. Heat rises.' }; }
      }
    },

    // ---------- Rival-facing escalation ----------
    {
      id: 'brownHatRequisition',
      title: 'Brown-hat requisition',
      subtitle: 'Chief of Station picks up the phone that is not plugged in.',
      desc: 'Call in a favour from the standing office with the undisclosed letterhead. Late-game operation; requires a Chief of Station of S4+ and L4+.',
      slot: 'chiefOfStation',
      cost: 2500, minSeniority: 4, minLoyalty: 4,
      outcomes: { success: 60, partial: 30, blown: 10 },
      heatOnBlown: 8, burnOnBlown: false,
      rewards: {
        success: function(s,a){ return { coins: 9000, line: 'A brown hat left the rack. It came back at dawn. A folder had appeared in the vault.' }; },
        partial: function(s,a){ return { coins: 2000, line: 'The phone rang. No one spoke. A small envelope arrived a week later with a stamped number on it.' }; },
        blown:   function(s,a){ return { coins: 0,    line: 'The hat is still on the rack. We do not, at this time, know why it is there.' }; }
      }
    },

    // ---------- Market Intelligence (v3.23.87) ----------
    // These operations feed state.marketBureauBonus which boosts market demand.
    // The bonus decays by 0.02 per market tick (~20 seconds to zero from max).
    {
      id: 'marketRecon',
      title: 'Market reconnaissance',
      subtitle: 'The Case Officer visits the bazaar.',
      desc: 'Send the Case Officer to survey competitor pricing and customer sentiment. Success grants a temporary market demand bonus.',
      slot: 'caseOfficer',
      cost: 400, minSeniority: 2, minLoyalty: 2,
      outcomes: { success: 65, partial: 30, blown: 5 },
      heatOnBlown: 2, burnOnBlown: false,
      rewards: {
        success: function(s, a) {
          s.marketBureauBonus = Math.min(0.5, (s.marketBureauBonus || 0) + 0.15);
          return { coins: 300, line: 'Competitor price sheets obtained. Three suppliers are undercutting us. We have adjusted.' };
        },
        partial: function(s, a) {
          s.marketBureauBonus = Math.min(0.5, (s.marketBureauBonus || 0) + 0.05);
          return { coins: 100, line: 'Partial intel. One supplier was talking but the market closed early.' };
        },
        blown: function(s, a) { return { coins: 0, line: 'A rival noticed our agent comparing price tags. Cover story: just shopping.' }; }
      }
    },
    {
      id: 'supplyChainInfiltration',
      title: 'Supply chain infiltration',
      subtitle: 'The Vault Runner follows the thread.',
      desc: 'Infiltrate a competitor’s supply chain to identify cost advantages. Success reduces your effective production costs via a market bonus.',
      slot: 'vaultRunner',
      cost: 600, minSeniority: 2, minLoyalty: 3,
      outcomes: { success: 55, partial: 35, blown: 10 },
      heatOnBlown: 4, burnOnBlown: false,
      rewards: {
        success: function(s, a) {
          s.marketBureauBonus = Math.min(0.5, (s.marketBureauBonus || 0) + 0.20);
          return { coins: 500, line: 'Full supply manifest copied. Their dye supplier charges 40% less. We have made a call.' };
        },
        partial: function(s, a) {
          s.marketBureauBonus = Math.min(0.5, (s.marketBureauBonus || 0) + 0.08);
          return { coins: 150, line: 'Partial manifest. Enough to renegotiate one contract.' };
        },
        blown: function(s, a) {
          s.marketBureauBonus = Math.max(0, (s.marketBureauBonus || 0) - 0.10);
          return { coins: 0, line: 'Our agent was caught in the warehouse. The supplier has raised our prices.' };
        }
      }
    },
    {
      id: 'demandManipulation',
      title: 'Demand manipulation',
      subtitle: 'The Strategist plants a rumour.',
      desc: 'Plant favourable stories about your textiles in key markets. High risk, high reward. Requires the Chief of Station.',
      slot: 'chiefOfStation',
      cost: 1500, minSeniority: 3, minLoyalty: 3,
      outcomes: { success: 50, partial: 35, blown: 15 },
      heatOnBlown: 6, burnOnBlown: false,
      rewards: {
        success: function(s, a) {
          s.marketBureauBonus = Math.min(0.5, (s.marketBureauBonus || 0) + 0.35);
          return { coins: 2000, line: 'Three newspapers ran the story. Demand is surging. The phone has not stopped.' };
        },
        partial: function(s, a) {
          s.marketBureauBonus = Math.min(0.5, (s.marketBureauBonus || 0) + 0.12);
          return { coins: 400, line: 'One paper ran it below the fold. Some interest. Not the frenzy we wanted.' };
        },
        blown: function(s, a) {
          s.marketBureauBonus = Math.max(0, (s.marketBureauBonus || 0) - 0.20);
          return { coins: 0, line: 'The newspaper traced the story back to us. An editorial has been published. It is unflattering.' };
        }
      }
    },

    // ====================================================================
    // v3.23.349: INTERNAL DISSIDENT OPERATIONS
    // These target employees on the player's own roster. They require a
    // target employee to be selected (stored in state.bureauTargetEmpId).
    // The bureau-window.js UI handles target selection.
    // ====================================================================

    // ---------- Identify / Investigate ----------
    {
      id: 'internalInvestigation',
      title: 'Internal investigation',
      subtitle: 'The Chief reviews the personnel file.',
      desc: 'Investigate an employee for disloyalty. Success reveals hidden stress and may flag them as a dissident before they act. More reliable than waiting for them to turn on their own.',
      slot: 'chiefOfStation',
      cost: 400, minSeniority: 2, minLoyalty: 3,
      outcomes: { success: 60, partial: 30, blown: 10 },
      heatOnBlown: 4, burnOnBlown: false,
      internal: true, // flag: targets own employee
      rewards: {
        success: function(s, a) {
          // On success, investigate the targeted employee
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target && !target.dissident && (target.stress || 0) >= 2) {
            // Correctly identified a stressed employee — flag as dissident
            if (typeof Personnel !== 'undefined' && Personnel.markDissident) {
              Personnel.markDissident(target, 'Identified by Bureau internal investigation.');
            }
            return { coins: 0, line: 'Investigation complete. ' + (target.name || 'The subject') + ' was found to be disloyal. They have been flagged as a dissident.', sideEffect: 'identified' };
          } else if (target && !target.dissident) {
            // Employee is clean — give them +1 stress from the investigation
            if (typeof Personnel !== 'undefined' && Personnel.addStress) {
              Personnel.addStress(target, 1, 'Investigated by Bureau. Found clean, but shaken.');
            }
            return { coins: 0, line: 'Investigation complete. ' + (target.name || 'The subject') + ' appears loyal. The investigation itself, however, was noted.' };
          }
          return { coins: 0, line: 'Investigation yielded nothing actionable. The file has been returned to the cabinet.' };
        },
        partial: function(s, a) {
          return { coins: 0, line: 'Inconclusive. The subject was evasive but nothing provable. We will watch.' };
        },
        blown: function(s, a) {
          // Blown investigation — the target gains stress
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target && typeof Personnel !== 'undefined' && Personnel.addStress) {
            Personnel.addStress(target, 2, 'Discovered they were being investigated. Furious.');
          }
          return { coins: 0, line: 'The subject discovered the investigation. They are not pleased. Trust has been damaged.' };
        }
      }
    },

    // ---------- Gather Compromat ----------
    {
      id: 'gatherKompromat',
      title: 'Gather compromat',
      subtitle: 'The Archivist opens the private file.',
      desc: 'Dig into an employee’s past for compromising material. Success stores kompromat that can later be used for blackmail or leverage. The target must not know.',
      slot: 'archivist',
      cost: 600, minSeniority: 3, minLoyalty: 3,
      outcomes: { success: 50, partial: 35, blown: 15 },
      heatOnBlown: 5, burnOnBlown: false,
      internal: true,
      rewards: {
        success: function(s, a) {
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target) {
            target.kompromatGathered = true;
            target.kompromatAt = Date.now();
            return { coins: 0, line: 'Material acquired on ' + (target.name || 'the subject') + '. A sealed folder has been placed in the vault. It will keep.' };
          }
          return { coins: 0, line: 'A folder was compiled. It may be useful.' };
        },
        partial: function(s, a) {
          return { coins: 0, line: 'Some material found, but nothing that would survive scrutiny. The search continues.' };
        },
        blown: function(s, a) {
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target && typeof Personnel !== 'undefined' && Personnel.addStress) {
            Personnel.addStress(target, 2, 'Learned the Bureau was digging into their past.');
          }
          return { coins: 0, line: ‘The subject’s former landlord called them. They now know someone has been asking questions.’ };
        }
      }
    },

    // ---------- Blackmail ----------
    {
      id: 'blackmailEmployee',
      title: 'Blackmail',
      subtitle: 'The Sparrow delivers the envelope.',
      desc: 'Use gathered kompromat to coerce a dissident into compliance. Requires kompromat to have been gathered on the target first. Removes dissident flag on success but the employee remembers.',
      slot: 'sparrow',
      cost: 800, minSeniority: 2, minLoyalty: 3,
      outcomes: { success: 55, partial: 30, blown: 15 },
      heatOnBlown: 8, burnOnBlown: false,
      internal: true,
      requiresKompromat: true,
      rewards: {
        success: function(s, a) {
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target && target.dissident) {
            target.dissident = false;
            target.dissidentReason = '';
            target.blackmailed = true;
            target.blackmailedAt = Date.now();
            target.stress = Math.max(0, (target.stress || 0) - 2);
            return { coins: 0, line: (target.name || 'The subject') + ' has agreed to cooperate. The envelope was persuasive. They will not forget this.' };
          }
          if (target && !target.dissident) {
            target.blackmailed = true;
            return { coins: 0, line: (target.name || 'The subject') + ' was already cooperative, but the envelope ensures they stay that way.' };
          }
          return { coins: 0, line: 'The envelope was delivered. Its contents were understood.' };
        },
        partial: function(s, a) {
          return { coins: 0, line: 'The subject read the material and said nothing. They have not agreed. They have not refused.' };
        },
        blown: function(s, a) {
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target) {
            if (typeof Personnel !== 'undefined' && Personnel.addStress) {
              Personnel.addStress(target, 3, 'Blackmail attempt discovered. Now hostile.');
            }
            // Kompromat is burned
            delete target.kompromatGathered;
            delete target.kompromatAt;
          }
          return { coins: 0, line: 'The subject took the envelope to a solicitor. The kompromat has been burned. Heat rises.' };
        }
      }
    },

    // ---------- Neutralize (permanent, clean removal) ----------
    {
      id: 'neutralizeEmployee',
      title: 'Neutralize',
      subtitle: 'The Street Asset gets the nod.',
      desc: 'Permanently remove an employee through Bureau channels. No sabotage risk. No questions asked. No one comes back from this. Extremely high heat.',
      slot: 'streetAsset',
      cost: 2000, minSeniority: 2, minLoyalty: 4,
      outcomes: { success: 65, partial: 25, blown: 10 },
      heatOnBlown: 20, burnOnBlown: false,
      internal: true,
      rewards: {
        success: function(s, a) {
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          var name = target ? target.name : 'the subject';
          if (target && typeof Personnel !== 'undefined' && Personnel.removeById) {
            Personnel.removeById(s, targetId);
          }
          s.bureauHeat = Math.min(100, (s.bureauHeat || 0) + 10); // Always adds heat, even on success
          return { coins: 0, line: name + ' did not report for work this morning. Their desk has been cleared. No one asked why.' };
        },
        partial: function(s, a) {
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target && typeof Personnel !== 'undefined' && Personnel.addStress) {
            Personnel.addStress(target, 3, 'Something happened. They won\'t say what.');
          }
          return { coins: 0, line: 'The subject survived. They look different now. Something happened, but they will not say what.' };
        },
        blown: function(s, a) {
          // Blown neutralization — target becomes dissident + heat spike
          var targetId = s.bureauTargetEmpId;
          var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(s, targetId) : null;
          if (target && typeof Personnel !== 'undefined') {
            if (Personnel.markDissident) Personnel.markDissident(target, 'Survived a Bureau neutralization attempt. Now very angry.');
          }
          return { coins: 0, line: 'It went wrong. The subject knows. Everyone knows. The asset is compromised. Heat spikes.' };
        }
      }
    }
  ];

  // ---------------------------------------------------------------------------
  // STATE HELPERS
  // ---------------------------------------------------------------------------
  function ensureState(state) {
    if (!state) return;
    if (!state.bureauAgents || typeof state.bureauAgents !== 'object') state.bureauAgents = {};
    if (!Array.isArray(state.bureauHistoryLog)) state.bureauHistoryLog = [];
    if (typeof state.bureauOpsRun   !== 'number') state.bureauOpsRun = 0;
    if (typeof state.bureauBlown    !== 'number') state.bureauBlown = 0;
    if (typeof state.bureauHeat     !== 'number') state.bureauHeat = 0;
    if (typeof state.bureauCooldownUntil !== 'number') state.bureauCooldownUntil = 0;
    // v3.23.349: target employee for internal ops
    if (state.bureauTargetEmpId === undefined) state.bureauTargetEmpId = null;
  }

  function cooldownRemainingMs(state) {
    ensureState(state);
    var now = Date.now();
    return Math.max(0, (state.bureauCooldownUntil || 0) - now);
  }

  // Tenure in days from hiredAt (ms). Falls back to 0 if missing.
  function tenureDays(emp) {
    if (!emp || !emp.hiredAt) return 0;
    var ms = Date.now() - emp.hiredAt;
    return Math.max(0, ms / (1000 * 60 * 60 * 24));
  }

  // Derived seniority 1..5 from tenure. 0-1 day → S1, 1-3 → S2, 3-7 → S3,
  // 7-21 → S4, 21+ → S5. Works without adding a stored seniority stat.
  function deriveSeniority(emp) {
    var d = tenureDays(emp);
    if (d >= 21) return 5;
    if (d >= 7)  return 4;
    if (d >= 3)  return 3;
    if (d >= 1)  return 2;
    return 1;
  }

  // Derived loyalty 1..5 from inverse stress. stress 0 → L5, stress >=80 → L1.
  function deriveLoyalty(emp) {
    var stress = (emp && emp.stress) || 0;
    if (stress >= 80) return 1;
    if (stress >= 60) return 2;
    if (stress >= 40) return 3;
    if (stress >= 20) return 4;
    return 5;
  }

  // Is this employee already posted to any Bureau slot?
  function agentSlotForEmployee(state, empId) {
    ensureState(state);
    var map = state.bureauAgents || {};
    for (var k in map) if (map[k] === empId) return k;
    return null;
  }

  // ---------------------------------------------------------------------------
  // RELOCATION — move an employee from the loom floor to a Bureau slot.
  // The employee stays on state.personnelRoster (so they keep drawing payroll
  // and show up in the House / Personnel views) but is flagged via
  // emp.assignment = 'bureau:<slotId>', and state.bureauAgents[slotId] = empId.
  //
  // Personnel.reconcileRoster respects emp.assignment (no-op — we never splice
  // an assigned employee out of the roster). Downstream passive-income math
  // excludes employees with emp.assignment so relocated agents stop earning.
  // ---------------------------------------------------------------------------
  function relocateEmployee(state, empId, slotId) {
    ensureState(state);
    if (!empId || !slotId) return { ok: false, error: 'Missing employee or slot.' };
    var slot = getSlotById(slotId);
    if (!slot) return { ok: false, error: 'Unknown slot: ' + slotId };
    if (state.bureauAgents[slotId]) {
      return { ok: false, error: 'That post is already filled.' };
    }
    var emp = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(state, empId) : null;
    if (!emp) return { ok: false, error: 'No such employee on the roster.' };
    if (emp.assignment) return { ok: false, error: emp.name + ' is already on assignment (' + emp.assignment + ').' };
    if (emp.dissident) return { ok: false, error: emp.name + ' is a dissident. The Bureau does not post dissidents.' };
    var sen = deriveSeniority(emp);
    if (sen < (slot.minSeniority || 1)) {
      return { ok: false, error: emp.name + ' is S' + sen + '; this post requires S' + slot.minSeniority + '+ seniority.' };
    }
    emp.assignment = 'bureau:' + slotId;
    emp.assignedAt = Date.now();
    state.bureauAgents[slotId] = empId;
    return { ok: true, slotId: slotId, employeeId: empId, employeeName: emp.name };
  }

  // Return an agent to the loom floor. Adds a small loyalty hit (stress +10).
  function returnAgent(state, slotId) {
    ensureState(state);
    var empId = state.bureauAgents[slotId];
    if (!empId) return { ok: false, error: 'That post is empty.' };
    var emp = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(state, empId) : null;
    if (emp) {
      try { if (Personnel.addStress) Personnel.addStress(emp, 10, 'Rotated out of Bureau post.'); } catch (_) {}
      delete emp.assignment;
      delete emp.assignedAt;
    }
    delete state.bureauAgents[slotId];
    return { ok: true, slotId: slotId, employeeName: emp ? emp.name : null };
  }

  // ---------------------------------------------------------------------------
  // AVAILABILITY — is this op currently runnable?
  // Returns null if runnable, or { reason: string } if blocked.
  // ---------------------------------------------------------------------------
  function operationAvailability(state, op) {
    ensureState(state);
    if (!op) return { reason: 'Unknown operation.' };
    if (!state.bureauUnlocked) return { reason: 'The Bureau has not yet been commissioned.' };
    if ((state.coins || 0) < (op.cost || 0)) {
      return { reason: 'Requires $' + (op.cost || 0) + '.' };
    }
    var cd = cooldownRemainingMs(state);
    if (cd > 0) return { reason: 'Bureau cooldown: ' + Math.ceil(cd / 1000) + 's.' };
    var slotId = op.slot;
    if (!state.bureauAgents[slotId]) {
      var slot = getSlotById(slotId);
      return { reason: 'Needs ' + (slot ? slot.title : slotId) + ' posted.' };
    }
    var emp = (typeof Personnel !== 'undefined' && Personnel.findById)
      ? Personnel.findById(state, state.bureauAgents[slotId]) : null;
    if (!emp) return { reason: 'Post is marked filled but agent is missing.' };
    var sen = deriveSeniority(emp);
    var loy = deriveLoyalty(emp);
    if (sen < (op.minSeniority || 1)) return { reason: 'Agent is S' + sen + '; op requires S' + op.minSeniority + '+.' };
    if (loy < (op.minLoyalty   || 1)) return { reason: 'Agent is L' + loy + '; op requires L' + op.minLoyalty   + '+.' };
    // v3.23.349: Internal ops require a target employee
    if (op.internal) {
      if (!state.bureauTargetEmpId) return { reason: 'Select a target employee first.' };
      var target = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(state, state.bureauTargetEmpId) : null;
      if (!target) return { reason: 'Target employee not found on roster.' };
      // Can't target yourself (the agent running the op)
      if (state.bureauTargetEmpId === state.bureauAgents[slotId]) return { reason: 'Cannot target the agent running this operation.' };
    }
    // v3.23.349: Blackmail requires kompromat
    if (op.requiresKompromat) {
      var bTarget = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(state, state.bureauTargetEmpId) : null;
      if (!bTarget || !bTarget.kompromatGathered) return { reason: 'No kompromat on file for this employee. Run "Gather compromat" first.' };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // RUN OPERATION — charge cost, roll outcome, pay out, possibly burn agent.
  // Returns { ok, outcome, line, reward, opTitle, agentName } on success, or
  // { ok:false, error:string } if blocked.
  // ---------------------------------------------------------------------------
  function runOperation(state, opId) {
    ensureState(state);
    var op = getOperationById(opId);
    if (!op) return { ok: false, error: 'Unknown operation.' };
    var blocked = operationAvailability(state, op);
    if (blocked) return { ok: false, error: blocked.reason };

    var empId = state.bureauAgents[op.slot];
    var emp = (typeof Personnel !== 'undefined' && Personnel.findById) ? Personnel.findById(state, empId) : null;
    var agentName = emp ? emp.name : '(agent)';

    // Charge cost
    state.coins = (state.coins || 0) - op.cost;

    // Roll outcome
    var outcome = rollOutcome(op.outcomes);

    // Base stress for participation
    try { if (emp && Personnel && Personnel.addStress) Personnel.addStress(emp, STRESS_PER_OP, 'Bureau op: ' + op.title); } catch (_) {}

    var rewardFn = (op.rewards && op.rewards[outcome]) || null;
    var rewardResult = rewardFn ? rewardFn(state, emp) : { coins: 0, line: '' };
    // Normalize: rewardResult may be a string
    if (typeof rewardResult === 'string') rewardResult = { coins: 0, line: rewardResult };
    var coinsPaid = rewardResult.coins || 0;
    var line = rewardResult.line || '';

    if (coinsPaid) state.coins = (state.coins || 0) + coinsPaid;

    // Side effects (string switchboard for simplicity in MVP)
    if (rewardResult.sideEffect && typeof rewardResult.sideEffect === 'string') {
      if (rewardResult.sideEffect.indexOf('reduceHeat:') === 0) {
        var amt = parseInt(rewardResult.sideEffect.split(':')[1], 10) || 0;
        state.bureauHeat = Math.max(0, (state.bureauHeat || 0) - amt);
      }
    }

    // Blown ops: add heat, extra stress, maybe burn agent
    if (outcome === 'blown') {
      state.bureauHeat = Math.min(HEAT_MAX, (state.bureauHeat || 0) + (op.heatOnBlown || 0));
      try { if (emp && Personnel && Personnel.addStress) Personnel.addStress(emp, STRESS_PER_BLOWN, 'Bureau op blown: ' + op.title); } catch (_) {}
      if (op.burnOnBlown && emp) {
        // Remove the agent from the roster entirely
        try {
          if (Personnel && Personnel.removeById) Personnel.removeById(state, emp.id);
        } catch (_) {}
        delete state.bureauAgents[op.slot];
        state.bureauBlown = (state.bureauBlown || 0) + 1;
      }
    }

    // Stats
    state.bureauOpsRun = (state.bureauOpsRun || 0) + 1;

    // History
    var entry = {
      at: Date.now(),
      opId: op.id,
      opTitle: op.title,
      slotId: op.slot,
      agentName: agentName,
      outcome: outcome,
      line: line,
      reward: coinsPaid ? ('+$' + coinsPaid) : ''
    };
    state.bureauHistoryLog.push(entry);
    if (state.bureauHistoryLog.length > 200) {
      state.bureauHistoryLog.splice(0, state.bureauHistoryLog.length - 200);
    }

    // Cooldown
    state.bureauCooldownUntil = Date.now() + COOLDOWN_MS;

    return {
      ok: true,
      outcome: outcome,
      line: line,
      reward: entry.reward,
      opTitle: op.title,
      agentName: agentName
    };
  }

  // ---------------------------------------------------------------------------
  // Weighted outcome roll. outcomes = {success, partial, blown} with integer
  // weights. Returns one of 'success' | 'partial' | 'blown'.
  // ---------------------------------------------------------------------------
  function rollOutcome(weights) {
    if (!weights) return 'partial';
    var s = (weights.success || 0), p = (weights.partial || 0), b = (weights.blown || 0);
    var total = s + p + b;
    if (total <= 0) return 'partial';
    var r = Math.random() * total;
    if (r < s) return 'success';
    if (r < s + p) return 'partial';
    return 'blown';
  }

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------
  function getSlotById(id) {
    for (var i = 0; i < BUREAU_SLOTS.length; i++) if (BUREAU_SLOTS[i].id === id) return BUREAU_SLOTS[i];
    return null;
  }
  function getOperationById(id) {
    for (var i = 0; i < OPERATIONS.length; i++) if (OPERATIONS[i].id === id) return OPERATIONS[i];
    return null;
  }

  // ---------------------------------------------------------------------------
  // v3.23.349: Target selection for internal operations
  // ---------------------------------------------------------------------------
  function setTargetEmployee(state, empId) {
    ensureState(state);
    state.bureauTargetEmpId = empId || null;
  }

  function getTargetEmployee(state) {
    ensureState(state);
    if (!state.bureauTargetEmpId) return null;
    return (typeof Personnel !== 'undefined' && Personnel.findById)
      ? Personnel.findById(state, state.bureauTargetEmpId) : null;
  }

  // Get only internal operations (for separate UI section)
  function getInternalOperations() {
    return OPERATIONS.filter(function(op) { return !!op.internal; });
  }

  // Get only external operations (original ops)
  function getExternalOperations() {
    return OPERATIONS.filter(function(op) { return !op.internal; });
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.Bureau = {
    COOLDOWN_MS: COOLDOWN_MS,
    HEAT_MAX: HEAT_MAX,
    getSlots:       function() { return BUREAU_SLOTS.slice(); },
    getOperations:  function() { return OPERATIONS.slice(); },
    getExternalOperations: getExternalOperations,
    getInternalOperations: getInternalOperations,
    getSlotById:    getSlotById,
    getOperationById: getOperationById,
    ensureState:    ensureState,
    cooldownRemainingMs: cooldownRemainingMs,
    deriveSeniority: deriveSeniority,
    deriveLoyalty:   deriveLoyalty,
    agentSlotForEmployee: agentSlotForEmployee,
    relocateEmployee: relocateEmployee,
    returnAgent:    returnAgent,
    operationAvailability: operationAvailability,
    runOperation:   runOperation,
    tenureDays:     tenureDays,
    setTargetEmployee: setTargetEmployee,
    getTargetEmployee: getTargetEmployee
  };
})();
