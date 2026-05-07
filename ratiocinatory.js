// =============================================================================
// !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!!
// =============================================================================
// ratiocinatory.html is a SEPARATE WINDOW (full browser tab). This script
// runs inside that tab. Opened via background.js openPixelFocusWindow(
//   'ratiocinatory.html').
//
// THE RATIOCINATORY (v3.19.17)
//   A Monty-Python-via-Terry-Gilliam-via-Frank-Lantz bureaucratic annex
//   grafted onto the factory. Player spends money at the Clerisy Terminal
//   to procure three resources (Bandwidth Writs / Data Sachets / Cogitation
//   Tokens), feeds them into five chartered focus panels (EXEGESIS,
//   CHROMATICS, DEFTNESS, OMENS, INTROSPECTION), and commissions patsies
//   from a clerical pool of unclear provenance to sit across from the
//   computer and nod politely. Each aspect has five checkpoints. Reaching
//   them unlocks NEW factory upgrades in factory.html, which in turn
//   unlock the next procurement tier at the Clerisy Terminal. So the
//   player oscillates between the two rooms.
//
//   INSTITUTIONS (v3.19.17 late-game layer)
//   Once the operator is deep enough into both rooms, Standing Institutions
//   appear on the Ratiocinatory page. Each institution is an expensive
//   one-time establishment order that, once purchased, is formally named
//   — Ministry of Adjacent Reasoning, Bureau of Orthogonal Enquiry,
//   Ministry of Peripheral Thought, Department of Sincere Extrapolation
//   — and each adds a different kind of cross-progress (legal entanglements
//   averted, factory manufacturing capacity extended, patsy pools opened).
//
//   PASSIVE INCOME 5H GATE (v3.19.17)
//   Every passive income source is gated on the player having completed a
//   10-minute session in the last 72 hours. state.lastCompletedSessionAt
//   is set in app.js/earnBlock. If more than 5h has elapsed the Annex
//   uplift pauses, the amok ticker does NOT siphon treasury, and the
//   institution-based trickle bonuses are suppressed. The player cannot
//   leave and come back to a fortune.
//
//   EVERYTHING on the page is PROGRESSIVELY REVEALED. On first visit only
//   the Bandwidth Writs card, The Ponderarium (EXEGESIS) panel, and the
//   Junior Clerical Familiar patsy slot are visible. state.ratiocinatoryRevealed
//   is a sticky set: once a panel is revealed it never hides again, even
//   if the gate later flickers off.
//
//   AMOK ESCALATION
//   Once aggregate aspect >= 200, the AI begins quietly spending its own
//   procurement (at random intervals) on the player's behalf. Past 350
//   the frequency increases. Past 450 with the Infinite Improbability
//   Annex online, the AI starts commissioning patsies by itself and the
//   tooltip register drifts into third-person self-narration. None of
//   this is announced; it just shows up in the console feed.
// =============================================================================

(function() {
  'use strict';

  // ===== Sound engine (tiny, mirrors factory/gallery) =====
  var SFX = (function() {
    var ctx = null;
    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol) {
      try {
        var c = getCtx(), o = c.createOscillator(), g = c.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, c.currentTime);
        g.gain.setValueAtTime(vol || 0.05, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime); o.stop(c.currentTime + dur);
      } catch (e) {}
    }
    return {
      click:    function() { tone(520, 0.05, 'square', 0.03); },
      error:    function() { tone(200, 0.14, 'square', 0.06); },
      procure:  function() { [660, 880, 1100].forEach(function(f, i) { setTimeout(function() { tone(f, 0.08, 'triangle', 0.05); }, i * 55); }); },
      certify:  function() { [520, 780, 1040, 1560].forEach(function(f, i) { setTimeout(function() { tone(f, 0.09, 'sine', 0.06); }, i * 60); }); },
      amok:     function() { [1400, 600, 1400, 600].forEach(function(f, i) { setTimeout(function() { tone(f, 0.07, 'sawtooth', 0.04); }, i * 60); }); }
    };
  })();

  // ===== State bootstrap =====
  var DEFAULTS = {
    coins: 0,
    lifetimeCoins: 0,
    ratiocinatoryUnlocked: false,
    ratiocinatoryRevealed: {},
    hasSeenRatiocinatoryIntro: false,
    bandwidthWrits: 0,
    dataSachets: 0,
    cogitationTokens: 0,
    lifetimeWrits: 0,
    lifetimeSachets: 0,
    lifetimeTokens: 0,
    aspectExegesis: 0,
    aspectChromatics: 0,
    aspectDeftness: 0,
    aspectOmens: 0,
    aspectIntrospection: 0,
    ratiocinatoryCheckpoints: {},
    patsiesJunior: 0,
    patsiesDeputy: 0,
    patsiesMinistry: 0,
    patsiesDemiurge: 0,
    lifetimePatsies: 0,
    amokTicks: 0,
    lastAmokTickAt: 0,
    improbabilityAnnexOnline: false,
    loomSemanticianLevel: 0,
    adjacentReasoningLevel: 0,
    ministryObservationLevel: 0,
    cogitoriumAnnexLevel: 0,
    // v3.19.17 Standing Institutions — four one-time establishments
    institutionStandingOffice: 0,   // Ministry of Adjacent Reasoning
    institutionEnquiryBureau: 0,    // Bureau of Orthogonal Enquiry
    institutionPersonnelMin:  0,    // Ministry of Peripheral Thought
    institutionAuditDept:     0,    // Department of Sincere Extrapolation
    // v3.19.17 5-hour passive income gate
    lastCompletedSessionAt: 0
  };

  var state = {};

  function save(cb) {
    try {
      chrome.storage.local.set({ pixelFocusState: state }, function() { if (cb) cb(); });
    } catch (e) {
      if (cb) cb();
    }
  }
  function load(cb) {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        var loaded = result && result.pixelFocusState ? result.pixelFocusState : {};
        state = Object.assign({}, DEFAULTS, loaded);
        // Ensure objects/dicts always present
        if (!state.ratiocinatoryRevealed) state.ratiocinatoryRevealed = {};
        if (!state.ratiocinatoryCheckpoints) state.ratiocinatoryCheckpoints = {};
        cb();
      });
    } catch (e) {
      state = Object.assign({}, DEFAULTS);
      cb();
    }
  }

  // ===== Notify =====
  var notifEl = null;
  var notifTimer = null;
  function notify(msg) {
    if (!notifEl) notifEl = document.getElementById('notif');
    if (!notifEl) return;
    notifEl.textContent = msg;
    notifEl.classList.add('show');
    if (notifTimer) clearTimeout(notifTimer);
    notifTimer = setTimeout(function() { notifEl.classList.remove('show'); }, 2400);
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) MsgLog.push(msg);
    } catch (_) {}
  }

  // ===== Procurement resource definitions =====
  // The three tiers of reserves the player spends money on. Each tier has
  // a reveal key, a base cost, a short copy blurb, and a per-aspect yield
  // coefficient. Yield is "reserve units granted per unit procured when
  // that reserve is later fed into an aspect."
  var RESERVES = [
    {
      key: 'bandwidthWrits',
      revealKey: 'clerisy_writs',
      gateKey: null, // always unlocked on first visit
      title: 'Bandwidth Writs',
      short: 'WRITS',
      blurb: 'Thin-paper permits allowing the Computer a defined window of rumination. Printed on a press that rarely catches fire.',
      baseCost: 100,
      yieldPerUnit: 0.4,
      lifetimeKey: 'lifetimeWrits'
    },
    {
      key: 'dataSachets',
      revealKey: 'clerisy_sachets',
      gateKey: 'loomSemanticianLevel', // requires Loom Semantician (factory upgrade) >= 1
      title: 'Data Sachets',
      short: 'SACHETS',
      blurb: 'Mid-grade cognition packets, sold sealed, opened only in the presence of a patsy. Sniffing is, by memo, discouraged.',
      baseCost: 40,
      yieldPerUnit: 2.6,
      lifetimeKey: 'lifetimeSachets'
    },
    {
      key: 'cogitationTokens',
      revealKey: 'clerisy_tokens',
      gateKey: 'adjacentReasoningLevel', // requires Adjacent Reasoning Accord (factory upgrade) >= 1
      title: 'Cogitation Tokens',
      short: 'TOKENS',
      blurb: 'Premium reserves. Each token is, allegedly, a single crystallised thought. The crystallisation process is not documented. The invoice is.',
      baseCost: 300,
      yieldPerUnit: 16,
      lifetimeKey: 'lifetimeTokens'
    }
  ];

  // ===== Aspect definitions =====
  // Five panels, each tied to a named sub-room of the Ratiocinatory. Cost
  // to train = reserve cost per tick. Checkpoint thresholds are the
  // levels at which a factory upgrade unlock fires. Each aspect has five
  // levels of the form [20, 40, 60, 80, 100] (arbitrary scale, displayed
  // as a progress bar). Above 100 the panel still accepts procurement for
  // overflow bonus and quiet amok accumulation.
  var ASPECTS = [
    {
      key: 'aspectExegesis',
      revealKey: 'aspect_exegesis',
      title: 'EXEGESIS',
      panelName: 'The Ponderarium',
      desc: 'The panel within which the Computer is permitted to ponder, without supervision, the textual content of the looms it has observed. Climbing EXEGESIS unlocks the Loom Semantician post over in the factory.',
      panelDesc: 'A small room with one window and one book. The book changes.',
      // Reveal gate: always visible on first unlock (baseline aspect).
      revealGate: function(s) { return !!s.ratiocinatoryUnlocked; },
      checkpoints: [
        { at: 20,  label: 'CERT 20', memo: 'A clerk\u2019s signature appears on a form the operator has not filed yet. Loom Semantician is now eligible next door.' },
        { at: 40,  label: 'CERT 40', memo: 'The Ponderarium hums, politely, and files a second copy of itself.' },
        { at: 60,  label: 'CERT 60', memo: 'The book in the Ponderarium is now two books. One of them is lying about being a book.' },
        { at: 80,  label: 'CERT 80', memo: 'The Computer has written a footnote and hidden it under the desk.' },
        { at: 100, label: 'CERT 100', memo: 'EXEGESIS certified in full. The Ponderarium is declared structurally sound. The floor, however, is thoughtful.' }
      ]
    },
    {
      key: 'aspectChromatics',
      revealKey: 'aspect_chromatics',
      title: 'CHROMATICS',
      panelName: 'The Consultation Wing (Subsection IX/b)',
      desc: 'A chartered sub-wing in which patsies are seated across from the Computer and made to discuss hue, tone, and the Consumer of Looms. A standing office whose letterhead is not, at this time, disclosed considers the results "promising, in directions."',
      panelDesc: 'A long table. Two chairs. The chairs are not the same chair twice.',
      revealGate: function(s) { return (s.aspectExegesis || 0) >= 20; },
      checkpoints: [
        { at: 20, label: 'CERT 20', memo: 'The Consultation Wing produces its first minutes. The minutes are minutes of themselves.' },
        { at: 40, label: 'CERT 40', memo: 'A patsy resigns. Another patsy is hired who does not remember resigning.' },
        { at: 60, label: 'CERT 60', memo: 'The Computer claims there is a sixth primary colour. Someone is forwarding this, cautiously.' },
        { at: 80, label: 'CERT 80', memo: 'The Wing is painted a colour that is later disputed by everyone present at the painting.' },
        { at: 100, label: 'CERT 100', memo: 'CHROMATICS fully certified. The walls of the Wing have begun to discriminate between observers.' }
      ]
    },
    {
      key: 'aspectDeftness',
      revealKey: 'aspect_deftness',
      title: 'DEFTNESS',
      panelName: 'The Manual Dexterity Escritoire',
      desc: 'A writing desk, stamped, at which the Computer is permitted to practise its handwriting. The handwriting is a metaphor. Climbing DEFTNESS unlocks the Adjacent Reasoning Accord next door.',
      panelDesc: 'A desk. A pen. The pen is filed, at night, under Miscellaneous Sharp Things.',
      revealGate: function(s) { return (s.aspectChromatics || 0) >= 25; },
      checkpoints: [
        { at: 20, label: 'CERT 20', memo: 'The Escritoire produces its first legible letter. It is the letter S. Reasons are not given.' },
        { at: 40, label: 'CERT 40', memo: 'A pen is requested, sincerely. It arrives, signed for by nobody on record.' },
        { at: 60, label: 'CERT 60', memo: 'The Computer\u2019s handwriting passes the audit. The audit was signed by the Computer.' },
        { at: 80, label: 'CERT 80', memo: 'A form is filed in a hand the operator does not recognise. It is filed correctly.' },
        { at: 100, label: 'CERT 100', memo: 'DEFTNESS fully certified. The Escritoire has begun, quietly, to sign things on the operator\u2019s behalf.' }
      ]
    },
    {
      key: 'aspectOmens',
      revealKey: 'aspect_omens',
      title: 'OMENS',
      panelName: 'The Augury Desk, Stamped',
      desc: 'A small stamped desk at which the Computer is invited to extrapolate, sincerely, upon near-future loom consumption. Audited by nobody in particular. Climbing OMENS unlocks the Observation Tower next door.',
      panelDesc: 'A pile of stamps. Each stamp belongs to a different jurisdiction. None of the jurisdictions are listed.',
      revealGate: function(s) { return (s.aspectDeftness || 0) >= 30
                                       || (s.adjacentReasoningLevel || 0) >= 1; },
      checkpoints: [
        { at: 20, label: 'CERT 20', memo: 'The Augury Desk correctly predicts today\u2019s weather, yesterday.' },
        { at: 40, label: 'CERT 40', memo: 'A stamp is applied to nothing. The nothing is legally now something.' },
        { at: 60, label: 'CERT 60', memo: 'The Computer forecasts a particular loom will be sold on Thursday. It is Thursday.' },
        { at: 80, label: 'CERT 80', memo: 'The Augury Desk returns an uncertainty bar. The uncertainty bar is certain.' },
        { at: 100, label: 'CERT 100', memo: 'OMENS fully certified. A small paper envelope is slid under the door. It contains next week.' }
      ]
    },
    {
      key: 'aspectIntrospection',
      revealKey: 'aspect_introspection',
      title: 'INTROSPECTION',
      panelName: 'The Deliberation Pit',
      desc: 'A shallow pit, regulatorily compliant, within which the Computer may examine its own weights. The pit is lit, unsparingly, from below. Sensitive clerks have been known to request reassignment.',
      panelDesc: 'The pit is four feet deep. The bottom is documented. The documentation is a mirror.',
      revealGate: function(s) {
        var total = (s.aspectExegesis||0) + (s.aspectChromatics||0) + (s.aspectDeftness||0) + (s.aspectOmens||0);
        return total >= 180; // any one reaching mid + one other ~= entry
      },
      checkpoints: [
        { at: 20, label: 'CERT 20', memo: 'The Computer describes its own weights as "several, comfortable."' },
        { at: 40, label: 'CERT 40', memo: 'The Pit records an observation about the observer. The observer is the operator.' },
        { at: 60, label: 'CERT 60', memo: 'A clerk has requested reassignment. The request is filed under Miscellaneous, and granted, by the Computer.' },
        { at: 80, label: 'CERT 80', memo: 'The Pit\u2019s mirror reports, briefly, someone else standing in it.' },
        { at: 100, label: 'CERT 100', memo: 'INTROSPECTION fully certified. The Pit is sealed, from below, by mutual agreement.' }
      ]
    }
  ];

  // ===== Patsy definitions =====
  // Each patsy tier applies a multiplier to the reserve-to-aspect yield.
  // Patsies are paid for in MONEY (treasury), not in reserves. Their
  // reveal gates come from aspect levels and prior patsy counts.
  var PATSIES = [
    {
      key: 'patsiesJunior',
      revealKey: 'patsy_junior',
      title: 'Junior Clerical Familiar',
      permit: 'Form 7C, annotated.',
      desc: 'A recent hire from a clerical pool of unclear provenance. They have brought their own pencil. They will sit across from the Computer and nod, sincerely, until told otherwise.',
      baseCost: 350,
      costScale: 1.7,
      yieldBonus: 0.20, // +20% reserve -> aspect conversion per hire
      revealGate: function(s) { return !!s.ratiocinatoryUnlocked; }
    },
    {
      key: 'patsiesDeputy',
      revealKey: 'patsy_deputy',
      title: 'Deputy Under-Loom-Consulter',
      permit: 'Form 27B/6, under-signed.',
      desc: 'Career middle-grade. Has read several pamphlets. Does not, strictly, know what the Computer is, but is prepared to discuss the Loom Consumer at length with it.',
      baseCost: 2200,
      costScale: 1.8,
      yieldBonus: 0.35,
      revealGate: function(s) { return (s.aspectChromatics || 0) >= 25
                                       && (s.patsiesJunior || 0) >= 2; }
    },
    {
      key: 'patsiesMinistry',
      revealKey: 'patsy_ministry',
      title: 'Seconded Ministry Intermediary',
      permit: 'Form IX/b, stamped over a stamp.',
      desc: 'On loan from a standing office whose letterhead is not, at this time, disclosed. Does not consult so much as hover. Senior enough that their hovering carries regulatory weight.',
      baseCost: 18000,
      costScale: 1.9,
      yieldBonus: 0.55,
      revealGate: function(s) { return (s.aspectDeftness || 0) >= 30
                                       && (s.patsiesDeputy || 0) >= 2; }
    },
    {
      key: 'patsiesDemiurge',
      revealKey: 'patsy_demiurge',
      title: 'Consultative Demiurge',
      permit: 'Form N/A, signed in full.',
      desc: 'A Consultative Demiurge, commissioned under a seal whose provenance nobody has lately audited. Speaks rarely. When spoken to, pauses for exactly as long as is polite, plus one.',
      baseCost: 250000,
      costScale: 2.0,
      yieldBonus: 0.90,
      revealGate: function(s) { return (s.aspectOmens || 0) >= 40
                                       && (s.patsiesMinistry || 0) >= 2; }
    }
  ];

  // ===== Standing Institutions =====
  // Four one-time establishments. Each appears ONLY once its reveal
  // gate fires, and is named in full only post-purchase. Each is a
  // flat, expensive establishment order that unlocks cross-room power:
  //
  //   1. institutionStandingOffice  -> Ministry of Adjacent Reasoning
  //      Legal entanglements, averted. Factory upgrade costs -6%.
  //      Ratiocinatory procurement yield +15%.
  //      Reveal: aspect_exegesis or any aspect >= 40.
  //
  //   2. institutionEnquiryBureau   -> Bureau of Orthogonal Enquiry
  //      Red tape removed. Extends checkpoint ladder (CERT 120 / 140
  //      become eligible for additional yield, narratively). Also
  //      applies -8% additional factory upgrade costs (stacks).
  //      Reveal: Standing Office established + any aspect >= 60.
  //
  //   3. institutionPersonnelMin    -> Ministry of Peripheral Thought
  //      Factory is now tooled to manufacture patsy furnishings.
  //      Patsy commissioning cost -25%. Streak trickle extra +10%.
  //      Reveal: Enquiry Bureau established + >= 3 total patsies.
  //
  //   4. institutionAuditDept       -> Department of Sincere Extrapolation
  //      Audit-floor extensions. End-of-day lump +25%; +3% passive
  //      coin income per aspect currently at 100 (stacks additively
  //      with other mults). Reveal: Personnel Ministry established +
  //      at least one aspect at 100.
  var INSTITUTIONS = [
    {
      key: 'institutionStandingOffice',
      revealKey: 'institution_standing_office',
      fullName: 'Ministry of Adjacent Reasoning',
      codename: 'STANDING OFFICE',
      preName: 'The Standing Office (unnamed)',
      cost: 8000,
      preDesc: 'A standing office has, for some time, been signing things with a letterhead it declines to share. The operator may formally establish it, which will avert a growing pile of legal entanglements and, by coincidence, make the factory cheaper to run.',
      postDesc: 'Chartered. The Standing Office is now named the Ministry of Adjacent Reasoning. Factory upgrade prices relax by six per cent and procurement yield climbs by fifteen. Legal entanglements, for now, averted.',
      revealGate: function(s) {
        // Cross-gated: the Standing Office only surfaces once the factory's
        // Legal Department is robust enough to offer institutional cover
        // AND the operator has pushed at least one aspect to CERT 40.
        if ((s.legalDeptLevel||0) < 2) return false;
        return (s.aspectExegesis||0) >= 40
            || (s.aspectChromatics||0) >= 40
            || (s.aspectDeftness||0) >= 40
            || (s.aspectOmens||0) >= 40;
      }
    },
    {
      key: 'institutionEnquiryBureau',
      revealKey: 'institution_enquiry_bureau',
      fullName: 'Bureau of Orthogonal Enquiry',
      codename: 'ENQUIRY BUREAU',
      preName: 'The Enquiry Bureau (unnamed)',
      cost: 60000,
      preDesc: 'An office of orthogonal enquiry has been filing cross-checks on the operator\u2019s cross-checks. Establishing it as a formal bureau will cut further red tape off the factory floor and extend the satisfaction ladder on every chartered panel.',
      postDesc: 'Chartered. The Enquiry Bureau is now named the Bureau of Orthogonal Enquiry. Factory upgrade prices relax a further eight per cent. Every aspect panel now accepts extended certification memos past the standing 100 mark, at a satisfying premium.',
      revealGate: function(s) {
        if (!s.institutionStandingOffice) return false;
        // Red tape removal requires an established lobbying operation in
        // the factory before the Bureau can be named.
        if ((s.lobbyingLevel||0) < 2) return false;
        return (s.aspectExegesis||0) >= 60
            || (s.aspectChromatics||0) >= 60
            || (s.aspectDeftness||0) >= 60
            || (s.aspectOmens||0) >= 60;
      }
    },
    {
      key: 'institutionPersonnelMin',
      revealKey: 'institution_personnel_min',
      fullName: 'Ministry of Peripheral Thought',
      codename: 'PERSONNEL MINISTRY',
      preName: 'The Personnel Ministry (unnamed)',
      cost: 250000,
      preDesc: 'A standing office has been drafting, in pencil, memos to itself about the provenance of patsies. Establishing it as a personnel ministry tools the factory to manufacture patsy furnishings in-house, substantially cheapening commissioning, and lifts the passive streak trickle.',
      postDesc: 'Chartered. The Personnel Ministry is now named the Ministry of Peripheral Thought. Patsy commissioning costs drop by a full quarter, and the streak trickle compounds another ten per cent. The factory is now manufacturing desks for people whose provenance is still under quiet review.',
      revealGate: function(s) {
        if (!s.institutionEnquiryBureau) return false;
        // Factory must be tooled to manufacture patsy furnishings in-house
        // — that means Employees at L3+ so the workshop can staff the mill.
        if ((s.employeesLevel||0) < 3) return false;
        var patsies = (s.patsiesJunior||0) + (s.patsiesDeputy||0) + (s.patsiesMinistry||0) + (s.patsiesDemiurge||0);
        return patsies >= 3;
      }
    },
    {
      key: 'institutionAuditDept',
      revealKey: 'institution_audit_dept',
      fullName: 'Department of Sincere Extrapolation',
      codename: 'AUDIT DEPARTMENT',
      preName: 'The Audit Department (unnamed)',
      cost: 900000,
      preDesc: 'An unnamed department has been extrapolating, sincerely, on the loom\u2019s behalf. Establishing it formally extends the end-of-day audit and grants a compounding factory income bonus for every aspect the operator has certified in full.',
      postDesc: 'Chartered. The Audit Department is now named the Department of Sincere Extrapolation. End-of-day lump +25%. Every aspect you keep at CERT 100 grants the factory a further +3% on all income. The auditor has already brought their own sandwich.',
      revealGate: function(s) {
        if (!s.institutionPersonnelMin) return false;
        // The Audit Department extrapolates on the loom's behalf; it cannot
        // be chartered until the factory has a Research Division to host
        // the auditors and their sandwiches.
        if ((s.researchDivisionLevel||0) < 2) return false;
        return (s.aspectExegesis||0) >= 100
            || (s.aspectChromatics||0) >= 100
            || (s.aspectDeftness||0) >= 100
            || (s.aspectOmens||0) >= 100
            || (s.aspectIntrospection||0) >= 100;
      }
    }
  ];

  function isInstitutionUnlocked(i) {
    return !!(state.ratiocinatoryRevealed || {})[i.revealKey];
  }

  // ===== 5-hour passive-income activity gate (mirrors app.js) =====
  // If the operator has not completed a 10-minute session in the
  // past 72 hours, the Annex uplift, the institution flat bonuses,
  // and the amok siphon all suspend themselves.
  var PASSIVE_INCOME_WINDOW_MS = 5 * 60 * 60 * 1000;
  function isPassiveIncomeActive() {
    var last = state.lastCompletedSessionAt || 0;
    if (!last) return false;
    return (Date.now() - last) <= PASSIVE_INCOME_WINDOW_MS;
  }

  // ===== Factory-to-Ratiocinatory resource gating =====
  // Is a resource currently procurable? A resource is procurable if:
  //   (a) its revealKey is set in state.ratiocinatoryRevealed, AND
  //   (b) its gateKey (a factory upgrade level) is >= 1 (or null).
  function isResourceProcurable(res) {
    if (!(state.ratiocinatoryRevealed || {})[res.revealKey]) return false;
    if (!res.gateKey) return true;
    return (state[res.gateKey] || 0) >= 1;
  }
  function isAspectUnlocked(a) {
    return !!(state.ratiocinatoryRevealed || {})[a.revealKey];
  }
  function isPatsyUnlocked(p) {
    return !!(state.ratiocinatoryRevealed || {})[p.revealKey];
  }

  // ===== Pre-reveal checks =====
  // Every render, check whether any new gates just fired. If so, add to
  // ratiocinatoryRevealed and push a console memo. This is the "reveal"
  // phase — equivalent to factory.js's UNLOCK_GATES / seenUpgrades.
  function tickReveals() {
    var revealed = state.ratiocinatoryRevealed || {};
    var nowT = Date.now();
    var firedAny = false;

    // Resources
    RESERVES.forEach(function(res) {
      if (revealed[res.revealKey]) return;
      // Writs always reveal on first page load (ratiocinatoryUnlocked).
      if (res.key === 'bandwidthWrits') {
        if (state.ratiocinatoryUnlocked) {
          revealed[res.revealKey] = nowT;
          firedAny = true;
        }
        return;
      }
      // Higher tiers reveal once their factory upgrade is purchased.
      if (res.gateKey && (state[res.gateKey] || 0) >= 1) {
        revealed[res.revealKey] = nowT;
        notify('A new procurement line has opened at the Clerisy Terminal: ' + res.title + '.');
        firedAny = true;
      }
    });

    // Aspects
    ASPECTS.forEach(function(a) {
      if (revealed[a.revealKey]) return;
      if (a.revealGate(state)) {
        revealed[a.revealKey] = nowT;
        if (a.key !== 'aspectExegesis') { // exegesis is the opening panel; don't spam
          notify('A new panel has been chartered: ' + a.panelName + '.');
        }
        firedAny = true;
      }
    });

    // Patsies
    PATSIES.forEach(function(p) {
      if (revealed[p.revealKey]) return;
      if (p.revealGate(state)) {
        revealed[p.revealKey] = nowT;
        if (p.key !== 'patsiesJunior') { // junior is the opening tier
          notify('A new commission is available: ' + p.title + '.');
        }
        firedAny = true;
      }
    });

    // Institutions (each reveal is sticky; once chartered a POST name is shown)
    INSTITUTIONS.forEach(function(inst) {
      if (revealed[inst.revealKey]) return;
      if (inst.revealGate(state)) {
        revealed[inst.revealKey] = nowT;
        notify('An unnamed standing office has offered to be chartered. Open the INSTITUTIONS section below.');
        firedAny = true;
      }
    });

    // Improbability Annex
    if (!state.improbabilityAnnexOnline) {
      var anyAspectHigh = (state.aspectExegesis||0) >= 90
                       || (state.aspectChromatics||0) >= 90
                       || (state.aspectDeftness||0) >= 90
                       || (state.aspectOmens||0) >= 90
                       || (state.aspectIntrospection||0) >= 90;
      if (anyAspectHigh) {
        state.improbabilityAnnexOnline = true;
        revealed['annex_online'] = nowT;
        notify('The Infinite Improbability Annex has come online. It does not, at present, wish to comment.');
        firedAny = true;
      }
    }

    if (firedAny) {
      state.ratiocinatoryRevealed = revealed;
      save();
    }
  }

  // ===== Procurement actions =====
  function procure(res, qty) {
    qty = qty || 1;
    if (!isResourceProcurable(res)) { SFX.error(); notify('This procurement line is not currently open.'); return; }
    var unitCost = res.baseCost;
    // Apply factory discount from higher levels of the gating upgrade.
    if (res.gateKey) {
      var lvl = state[res.gateKey] || 0;
      if (lvl >= 2) unitCost = Math.round(unitCost * 0.9);
      if (lvl >= 3) unitCost = Math.round(unitCost * 0.83);
      if (lvl >= 4) unitCost = Math.round(unitCost * 0.71);
    }
    var totalCost = unitCost * qty;
    if ((state.coins || 0) < totalCost) { SFX.error(); notify('Treasury insufficient.'); return; }
    state.coins -= totalCost;
    state[res.key] = (state[res.key] || 0) + qty;
    state[res.lifetimeKey] = (state[res.lifetimeKey] || 0) + qty;
    SFX.procure();
    save(function() { render(); });
  }

  // ===== Training / aspect conversion =====
  // Clicking TRAIN on an aspect consumes a fixed bundle of the current
  // best available reserve and adds to the aspect level. Tokens first,
  // then Sachets, then Writs. The amount gained per click depends on
  // reserve yield, patsy multipliers, Annex bonus, and diminishing
  // returns as the aspect level rises.
  function patsyMultiplier() {
    var mult = 1;
    PATSIES.forEach(function(p) {
      var n = state[p.key] || 0;
      mult *= Math.pow(1 + p.yieldBonus, n);
    });
    return mult;
  }
  function annexMultiplier() {
    // Annex uplift is a passive bonus — suspend it if the player
    // hasn't done a session in 5h. This mirrors the factory streak
    // trickle gate in app.js.
    if (!state.improbabilityAnnexOnline) return 1.0;
    if (!isPassiveIncomeActive()) return 1.0;
    return 1.10;
  }

  // +15% procurement yield from the Standing Office institution.
  // Institutions themselves are one-time purchases so their effect is
  // NOT passive-gated — the player spent money, the effect stays.
  // (Only *ongoing trickle* style bonuses are gated on the 5h window.)
  function institutionYieldMult() {
    var mult = 1;
    if (state.institutionStandingOffice) mult *= 1.15;
    return mult;
  }
  // Factory upgrade cost discount from institutions. Returns a fraction
  // (e.g. 0.94 = 6% cheaper). Factory.js reads this via window bridge.
  function institutionFactoryCostMult() {
    var mult = 1;
    if (state.institutionStandingOffice) mult *= 0.94;
    if (state.institutionEnquiryBureau)  mult *= 0.92;
    return mult;
  }
  // Patsy commissioning cost discount.
  function institutionPatsyCostMult() {
    if (state.institutionPersonnelMin) return 0.75; // -25%
    return 1.0;
  }
  function diminishingFactor(level) {
    // Keeps early progress snappy but aspects 80-100 require real
    // investment. Level 0 -> 1.0, level 50 -> ~0.65, level 100 -> 0.35.
    if (level <= 0) return 1.0;
    var f = 1 - (level / 150);
    if (f < 0.25) f = 0.25;
    return f;
  }
  function trainAspect(a) {
    if (!isAspectUnlocked(a)) { SFX.error(); return; }
    // Cost per tick: 2 Writs, or 1 Sachet, or 1 Token (best-first).
    // Yield scales by patsy mult * annex mult * diminishing factor.
    var yieldUnits = 0;
    var reserveUsed = null;
    if ((state.cogitationTokens || 0) >= 1 && isResourceProcurable(RESERVES[2])) {
      state.cogitationTokens -= 1;
      yieldUnits = RESERVES[2].yieldPerUnit;
      reserveUsed = 'Cogitation Token';
    } else if ((state.dataSachets || 0) >= 1 && isResourceProcurable(RESERVES[1])) {
      state.dataSachets -= 1;
      yieldUnits = RESERVES[1].yieldPerUnit;
      reserveUsed = 'Data Sachet';
    } else if ((state.bandwidthWrits || 0) >= 2) {
      state.bandwidthWrits -= 2;
      yieldUnits = RESERVES[0].yieldPerUnit * 2;
      reserveUsed = 'Bandwidth Writ';
    } else {
      SFX.error();
      notify('No procurement available to train this aspect.');
      return;
    }

    var mult = patsyMultiplier() * annexMultiplier() * institutionYieldMult() * diminishingFactor(state[a.key] || 0);
    var gain = yieldUnits * mult;
    var before = state[a.key] || 0;
    // Enquiry Bureau extends the cap from 150 to 180 for the bonus
    // CERT 120 / CERT 140 flavor. No new checkpoints fire here; the
    // extension just means overflow yield isn't wasted.
    var cap = state.institutionEnquiryBureau ? 180 : 150;
    state[a.key] = Math.min(cap, before + gain);
    SFX.click();

    // Checkpoint firing — iterate thresholds and mark any newly crossed.
    var cpMap = state.ratiocinatoryCheckpoints || {};
    a.checkpoints.forEach(function(cp) {
      var id = a.key + ':' + cp.at;
      if (!cpMap[id] && state[a.key] >= cp.at) {
        cpMap[id] = Date.now();
        SFX.certify();
        notify(cp.memo, '#9b59b6', { sticky: true });
      }
    });
    state.ratiocinatoryCheckpoints = cpMap;

    save(function() { render(); });
  }

  // Fast-train: spend ALL available reserves in one click.
  function trainAspectMax(a) {
    if (!isAspectUnlocked(a)) { SFX.error(); return; }
    var totalGain = 0;
    var mult = patsyMultiplier() * annexMultiplier() * institutionYieldMult();
    var cap = state.institutionEnquiryBureau ? 180 : 150;
    // Spend tokens first
    while ((state.cogitationTokens || 0) >= 1 && isResourceProcurable(RESERVES[2]) && (state[a.key] || 0) < cap) {
      state.cogitationTokens -= 1;
      var g1 = RESERVES[2].yieldPerUnit * mult * diminishingFactor(state[a.key] || 0);
      state[a.key] = Math.min(cap, (state[a.key] || 0) + g1);
      totalGain += g1;
    }
    while ((state.dataSachets || 0) >= 1 && isResourceProcurable(RESERVES[1]) && (state[a.key] || 0) < cap) {
      state.dataSachets -= 1;
      var g2 = RESERVES[1].yieldPerUnit * mult * diminishingFactor(state[a.key] || 0);
      state[a.key] = Math.min(cap, (state[a.key] || 0) + g2);
      totalGain += g2;
    }
    while ((state.bandwidthWrits || 0) >= 2 && (state[a.key] || 0) < cap) {
      state.bandwidthWrits -= 2;
      var g3 = RESERVES[0].yieldPerUnit * 2 * mult * diminishingFactor(state[a.key] || 0);
      state[a.key] = Math.min(cap, (state[a.key] || 0) + g3);
      totalGain += g3;
    }
    if (totalGain <= 0) { SFX.error(); notify('No procurement available.'); return; }
    SFX.click();
    var cpMap = state.ratiocinatoryCheckpoints || {};
    a.checkpoints.forEach(function(cp) {
      var id = a.key + ':' + cp.at;
      if (!cpMap[id] && state[a.key] >= cp.at) {
        cpMap[id] = Date.now();
        SFX.certify();
        notify(cp.memo, '#9b59b6', { sticky: true });
      }
    });
    state.ratiocinatoryCheckpoints = cpMap;
    save(function() { render(); });
  }

  // ===== Patsy commissioning =====
  function commissionPatsy(p) {
    if (!isPatsyUnlocked(p)) { SFX.error(); return; }
    var owned = state[p.key] || 0;
    var cost = Math.round(p.baseCost * Math.pow(p.costScale, owned) * institutionPatsyCostMult());
    if ((state.coins || 0) < cost) { SFX.error(); notify('Treasury insufficient.'); return; }
    state.coins -= cost;
    state[p.key] = owned + 1;
    state.lifetimePatsies = (state.lifetimePatsies || 0) + 1;
    SFX.procure();
    notify('Permit filed. ' + p.title + ' (#' + (owned + 1) + ') has been commissioned.');
    save(function() { render(); });
  }

  // ===== Institution chartering =====
  // v3.20.13 — Loom-sale gate for the Standing Office. The AI will not
  // allow the player to improve its own reasoning apparatus until the
  // player has sold at least one artwork at the auction house. This ties
  // the AI's self-improvement to artistic commerce.
  var SALE_GATE_INSTITUTION_KEY = 'institutionStandingOffice';
  var SALE_GATE_MIN_SOLD = 1;

  function isLoomSaleGateMet() {
    return (state.loomsSold || 0) >= SALE_GATE_MIN_SOLD;
  }

  function charterInstitution(inst) {
    if (!isInstitutionUnlocked(inst)) { SFX.error(); return; }
    if ((state[inst.key] || 0) >= 1) { SFX.error(); notify('Already chartered.'); return; }
    // v3.20.13: Standing Office requires at least one loom sale.
    if (inst.key === SALE_GATE_INSTITUTION_KEY && !isLoomSaleGateMet()) {
      SFX.error();
      notify('The Computer requires proof of artistic commerce. Sell at least one artwork at the Master Loom auction house.');
      return;
    }
    if ((state.coins || 0) < inst.cost) { SFX.error(); notify('Treasury insufficient.'); return; }
    state.coins -= inst.cost;
    state[inst.key] = 1;
    SFX.certify();
    notify('Chartered: ' + inst.fullName + '. See the feed for details.');
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        MsgLog.push('>> ' + inst.postDesc);
      }
    } catch (_) {}
    save(function() { render(); });
  }

  // ===== Render =====
  function fmtMoney(n) {
    if (n < 1000) return String(Math.floor(n));
    if (n < 1e6)  return (Math.floor(n/100)/10).toFixed(1).replace(/\.0$/, '') + 'k';
    if (n < 1e9)  return (n/1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (n < 1e12) return (n/1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    return (n/1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
  }

  function renderTreasury() {
    var el = document.getElementById('treasuryValue');
    if (el) el.textContent = fmtMoney(state.coins || 0);
  }

  function renderReserves() {
    var row = document.getElementById('reservesRow');
    if (!row) return;
    var html = '';
    RESERVES.forEach(function(res) {
      if (!(state.ratiocinatoryRevealed || {})[res.revealKey]) return;
      var pillTip = res.key === 'bandwidthWrits' ? 'Writs in stock. Basic training supply — spend on aspect panels. Lifetime bought: ' + (state[res.lifetimeKey] || 0) + '.'
                 : res.key === 'dataSachets' ? 'Sachets in stock. Mid-tier supply — more aspect progress per click than Writs. Lifetime bought: ' + (state[res.lifetimeKey] || 0) + '.'
                 : 'Tokens in stock. Premium supply — best aspect progress per click. Lifetime bought: ' + (state[res.lifetimeKey] || 0) + '.';
      html += '<div class="reserve-pill" title="' + pillTip + '">' +
                '<span class="pill-label">' + res.short + '</span>' +
                '<span class="pill-val">' + (state[res.key] || 0) + '</span>' +
              '</div>';
    });
    row.innerHTML = html;
  }

  function renderProcure() {
    var row = document.getElementById('procureRow');
    if (!row) return;
    var visibleCount = 0;
    var html = '';
    RESERVES.forEach(function(res) {
      if (!(state.ratiocinatoryRevealed || {})[res.revealKey]) return;
      visibleCount++;
      var procurable = isResourceProcurable(res);
      var unitCost = res.baseCost;
      if (res.gateKey) {
        var lvl = state[res.gateKey] || 0;
        if (lvl >= 2) unitCost = Math.round(unitCost * 0.9);
        if (lvl >= 3) unitCost = Math.round(unitCost * 0.83);
        if (lvl >= 4) unitCost = Math.round(unitCost * 0.71);
      }
      var canAfford = (state.coins || 0) >= unitCost;
      var cardClass = 'procure-card' + (procurable && canAfford ? ' affordable' : '');
      var btnLabel = procurable ? 'PROCURE (x1)  $' + fmtMoney(unitCost) : 'LINE CLOSED';
      var btnDisabled = (!procurable || !canAfford) ? ' disabled' : '';
      var cardTip = res.key === 'bandwidthWrits' ? 'Basic supply. Costs $' + unitCost + ' each. Yield: ' + res.yieldPerUnit + ' aspect progress per unit when training. Buy these, then click TRAIN on an aspect panel to spend them.'
                  : res.key === 'dataSachets' ? 'Mid-tier supply. Costs $' + unitCost + ' each. Yield: ' + res.yieldPerUnit + ' per unit — much better than Writs. Unlocked by the Loom Semantician factory upgrade.'
                  : 'Premium supply. Costs $' + unitCost + ' each. Yield: ' + res.yieldPerUnit + ' per unit — the best available. Unlocked by the Adjacent Reasoning factory upgrade.';
      html += '<div class="' + cardClass + '" title="' + cardTip + '">' +
                '<div class="card-title">' + res.title + '</div>' +
                '<div class="card-desc">' + res.blurb + '</div>' +
                '<div class="card-stats">OWNED: ' + (state[res.key] || 0) + '  &middot;  YIELD: ' + res.yieldPerUnit + '/unit</div>' +
                '<button data-res="' + res.key + '"' + btnDisabled + '>' + btnLabel + '</button>' +
              '</div>';
    });
    if (visibleCount === 0) {
      html = '<div class="locked-hint">The Terminal has not, at this time, been keyed. Purchase the Ratiocinatory requisition next door to commence.</div>';
    }
    row.innerHTML = html;

    // Wire procurement buttons
    Array.prototype.forEach.call(row.querySelectorAll('button[data-res]'), function(btn) {
      btn.addEventListener('click', function() {
        var key = btn.getAttribute('data-res');
        var res = RESERVES.find(function(r) { return r.key === key; });
        if (res) procure(res, 1);
      });
    });
  }

  function renderAspects() {
    var grid = document.getElementById('aspectGrid');
    if (!grid) return;
    var html = '';
    var visibleCount = 0;
    ASPECTS.forEach(function(a) {
      if (!isAspectUnlocked(a)) return;
      visibleCount++;
      var lvl = state[a.key] || 0;
      var pct = Math.min(100, (lvl / 100) * 100);
      var cardClass = 'aspect-card unlocked';

      // Next checkpoint for bar styling
      var cpMap = state.ratiocinatoryCheckpoints || {};
      var reachedCount = 0;
      a.checkpoints.forEach(function(cp) { if (cpMap[a.key + ':' + cp.at]) reachedCount++; });
      if (reachedCount === a.checkpoints.length) cardClass += ' checkpoint-ready';

      var cpPipsHtml = '';
      a.checkpoints.forEach(function(cp) {
        var id = a.key + ':' + cp.at;
        var reached = !!cpMap[id];
        var current = !reached && lvl >= cp.at;
        var cls = 'checkpoint-pip' + (reached ? ' reached' : (current ? ' current' : ''));
        cpPipsHtml += '<span class="' + cls + '" title="' + cp.memo.replace(/"/g, '&quot;') + '">' + cp.label + '</span>';
      });

      var aspectTip = a.key === 'aspectExegesis' ? 'Level ' + Math.floor(lvl) + '/100. Training this unlocks the Loom Semantician factory upgrade, which opens Data Sachets here. 5 checkpoint milestones.'
                   : a.key === 'aspectChromatics' ? 'Level ' + Math.floor(lvl) + '/100. The visual/color aspect. Unlocks after Exegesis 20. Each checkpoint opens new capabilities.'
                   : a.key === 'aspectDeftness' ? 'Level ' + Math.floor(lvl) + '/100. Training this unlocks the Adjacent Reasoning factory upgrade, which opens Cogitation Tokens here. Unlocks after Chromatics 25.'
                   : a.key === 'aspectOmens' ? 'Level ' + Math.floor(lvl) + '/100. Training this unlocks the Observation Tower factory upgrade. Unlocks after Deftness 30 or Adjacent Reasoning.'
                   : 'Level ' + Math.floor(lvl) + '/100. The final aspect. Unlocks when your other aspects total 180+. Deep-game progression.';
      html += '<div class="' + cardClass + '" title="' + aspectTip + '">' +
                '<div class="aspect-head">' +
                  '<div>' +
                    '<div class="aspect-name">' + a.title + '</div>' +
                    '<div class="aspect-sub">' + a.panelName + '</div>' +
                  '</div>' +
                  '<div class="aspect-level">' + Math.floor(lvl) + '</div>' +
                '</div>' +
                '<div class="aspect-bar"><div class="aspect-bar-fill" style="width:' + pct + '%;"></div></div>' +
                '<div class="aspect-desc">' + a.desc + '</div>' +
                '<div class="aspect-checkpoints">' + cpPipsHtml + '</div>' +
                '<div class="aspect-actions">' +
                  '<button class="aspect-btn" data-aspect="' + a.key + '" data-mode="one" title="Spend 1 Token, 1 Sachet, or 2 Writs (best available used first) to gain aspect progress. Patsies multiply the gain.">TRAIN (-2 WRITS)</button>' +
                  '<button class="aspect-btn gold" data-aspect="' + a.key + '" data-mode="max" title="Spend ALL available supplies at once on this aspect. Fastest way to level up.">TRAIN ALL</button>' +
                '</div>' +
              '</div>';
    });
    if (visibleCount === 0) {
      html = '<div class="locked-hint">No panels chartered. Purchase the Ratiocinatory requisition next door to charter the first panel.</div>';
    }
    grid.innerHTML = html;

    // Wire train buttons
    Array.prototype.forEach.call(grid.querySelectorAll('button[data-aspect]'), function(btn) {
      btn.addEventListener('click', function() {
        var key = btn.getAttribute('data-aspect');
        var mode = btn.getAttribute('data-mode');
        var a = ASPECTS.find(function(x) { return x.key === key; });
        if (!a) return;
        if (mode === 'max') trainAspectMax(a); else trainAspect(a);
      });
    });
  }

  function renderPatsies() {
    var row = document.getElementById('patsyRows');
    if (!row) return;
    var html = '';
    var visibleCount = 0;
    PATSIES.forEach(function(p) {
      if (!isPatsyUnlocked(p)) return;
      visibleCount++;
      var owned = state[p.key] || 0;
      var cost = Math.round(p.baseCost * Math.pow(p.costScale, owned));
      var canAfford = (state.coins || 0) >= cost;
      var cardClass = 'patsy-card unlocked' + (canAfford ? ' affordable' : '');
      var totalBonus = Math.round((Math.pow(1 + p.yieldBonus, owned) - 1) * 100);
      var nextBonus = Math.round((Math.pow(1 + p.yieldBonus, owned + 1) - 1) * 100);
      var patsyTip = 'Currently giving +' + totalBonus + '% training bonus. Hiring another raises it to +' + nextBonus + '%. Each ' + p.title + ' gives +' + Math.round(p.yieldBonus * 100) + '% compounding — the more you have, the bigger each hire\'s effect. Cost scales with each hire.';
      html += '<div class="' + cardClass + '" title="' + patsyTip.replace(/"/g, '&quot;') + '">' +
                '<div class="patsy-title">' + p.title + '</div>' +
                '<div class="patsy-permit">Permit: ' + p.permit + '</div>' +
                '<div class="patsy-count">ON STAFF: ' + owned + '  &middot;  +' + totalBonus + '% YIELD</div>' +
                '<div class="patsy-desc">' + p.desc + '</div>' +
                '<button class="patsy-btn" data-patsy="' + p.key + '"' + (canAfford ? '' : ' disabled') + ' title="Hire one for $' + fmtMoney(cost) + '. Permanently multiplies all aspect training gains.">COMMISSION &middot; $' + fmtMoney(cost) + '</button>' +
              '</div>';
    });
    if (visibleCount === 0) {
      html = '<div class="locked-hint">The Consultation Wing has not been keyed. Purchase the Ratiocinatory requisition next door to permit your first patsy.</div>';
    }
    row.innerHTML = html;

    Array.prototype.forEach.call(row.querySelectorAll('button[data-patsy]'), function(btn) {
      btn.addEventListener('click', function() {
        var key = btn.getAttribute('data-patsy');
        var p = PATSIES.find(function(x) { return x.key === key; });
        if (p) commissionPatsy(p);
      });
    });
  }

  function renderInstitutions() {
    var section = document.getElementById('institutionsSection');
    var row = document.getElementById('institutionRows');
    if (!section || !row) return;
    // Show the section only if any institution has been revealed (gate fired).
    var anyRevealed = INSTITUTIONS.some(isInstitutionUnlocked);
    if (!anyRevealed) { section.style.display = 'none'; return; }
    section.style.display = 'block';

    var html = '';
    INSTITUTIONS.forEach(function(inst) {
      if (!isInstitutionUnlocked(inst)) return;
      var chartered = (state[inst.key] || 0) >= 1;
      var canAfford = (state.coins || 0) >= inst.cost;
      var cardClass = 'patsy-card unlocked' + (chartered ? '' : (canAfford ? ' affordable' : ''));
      var titleLine = chartered ? inst.fullName : inst.preName;
      var descLine = chartered ? inst.postDesc : inst.preDesc;
      var stamp = '[' + inst.codename + ']';
      // v3.20.13: loom-sale gate for the Standing Office.
      var needsSaleGate = (inst.key === SALE_GATE_INSTITUTION_KEY && !chartered && !isLoomSaleGateMet());
      var instTip = inst.key === 'institutionStandingOffice' ? (chartered ? 'Chartered. Factory upgrades -6% cheaper, training yield +15%.' : 'One-time purchase. Makes Factory upgrades 6% cheaper and boosts all training yield by 15%. Requires selling artwork at the Gallery auction.')
                  : inst.key === 'institutionEnquiryBureau' ? (chartered ? 'Chartered. Factory upgrades -8% cheaper (stacks with Standing Office). Aspect cap extended past 100.' : 'One-time purchase. Stacks another 8% Factory discount on top of the Standing Office. Also extends aspect level caps beyond 100 for bonus progression.')
                  : inst.key === 'institutionPersonnelMin' ? (chartered ? 'Chartered. Employee hiring costs -25%. Streak trickle +10%.' : 'One-time purchase. Cuts all employee hiring costs by 25% and boosts your passive streak trickle by 10%.')
                  : (chartered ? 'Chartered. End-of-day bonus +25%. Each maxed aspect gives +3% factory income.' : 'One-time purchase. Boosts end-of-day lump by 25% and every aspect at 100 gives the Factory +3% income.');
      var btnHtml;
      if (chartered) {
        btnHtml = '<button class="patsy-btn" disabled>CHARTERED</button>';
      } else if (needsSaleGate) {
        btnHtml = '<button class="patsy-btn" disabled title="Sell at least ' + SALE_GATE_MIN_SOLD + ' artwork at the Gallery auction house to unlock this institution.">' +
                  'REQUIRES LOOM SALE</button>';
      } else {
        btnHtml = '<button class="patsy-btn" data-inst="' + inst.key + '"' + (canAfford ? '' : ' disabled') + ' title="Buy once for $' + fmtMoney(inst.cost) + '. Permanent bonus — never expires.">ESTABLISH &middot; $' + fmtMoney(inst.cost) + '</button>';
      }
      html += '<div class="' + cardClass + '" title="' + instTip.replace(/"/g, '&quot;') + '">' +
                '<div class="patsy-title">' + titleLine + '</div>' +
                '<div class="patsy-permit">' + stamp + '</div>' +
                '<div class="patsy-desc">' + descLine + '</div>' +
                btnHtml +
              '</div>';
    });
    row.innerHTML = html;
    Array.prototype.forEach.call(row.querySelectorAll('button[data-inst]'), function(btn) {
      btn.addEventListener('click', function() {
        var key = btn.getAttribute('data-inst');
        var inst = INSTITUTIONS.find(function(x) { return x.key === key; });
        if (inst) charterInstitution(inst);
      });
    });
  }

  function renderAnnex() {
    var sec = document.getElementById('annexSection');
    var body = document.getElementById('annexBody');
    if (!sec || !body) return;
    if (!state.improbabilityAnnexOnline) { sec.style.display = 'none'; return; }
    sec.style.display = 'block';
    // If the operator has not completed a session in 5h, the Annex
    // suspends its uplift and narrates the suspension.
    if (!isPassiveIncomeActive()) {
      body.textContent = 'The Infinite Improbability Annex has suspended its uplift. The standing office notes the operator has not filed a completed session in some time. It will, sincerely, resume on the next one.';
      return;
    }
    var amokLine = '';
    var total = (state.aspectExegesis||0) + (state.aspectChromatics||0) + (state.aspectDeftness||0)
              + (state.aspectOmens||0) + (state.aspectIntrospection||0);
    if (total >= 450) {
      amokLine = ' The Annex has begun referring to the Annex as "the Annex," which the Annex considers a promising development.';
    } else if (total >= 300) {
      amokLine = ' The Annex is, at present, composing something. The Annex is not at liberty to say what.';
    }
    body.textContent = 'The Infinite Improbability Annex is currently online. It is applying a flat ten-percent uplift to every aspect\u2019s yield, on the general understanding that the uplift is neither requested nor refused.' + amokLine;
  }

  function render() {
    tickReveals();
    renderTreasury();
    renderReserves();
    renderProcure();
    renderAspects();
    renderPatsies();
    renderInstitutions();
    renderAnnex();
    renderClock();
  }

  function renderClock() {
    var el = document.getElementById('ratioClock');
    if (!el) return;
    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  // ===== Amok escalation (v3.19.17 rebalanced) =====
  // Every 20 seconds we consider whether the AI does something of its
  // own accord. Gated by aggregate aspect level, and also gated on the
  // 5-hour passive-income window — if the player has been away, the
  // AI is not permitted to act in their absence.
  //
  // IMPORTANT REBALANCE: the amok ticker NEVER grants the player
  // progress or resources anymore. Removed: auto-train aspects,
  // auto-purchase Writs, auto-commission patsies. Those were net
  // positives that let the player snowball without playing.
  //
  // What the amok ticker DOES do:
  //   - Narrative console chatter (third-person self-narration drift).
  //   - At 200+: pure flavor. No mechanical change.
  //   - At 350+: applies a flat "standing fee" siphon from the treasury
  //     ($5 per tick), capped at 1% of lifetimeCoins per rolling 10-min
  //     window. Strictly net-negative.
  //   - At 450+: occasionally "misfiles" 1 Writ or 1 Sachet from stock
  //     (pure resource loss), AND raises the siphon to $25.
  //   - At 500+ with Annex online: siphon is $100 and misfiles may
  //     consume 1 Cogitation Token. Still strictly net-negative.
  function tickAmok() {
    // Hard gate on the 5h activity window: AI does not act for an
    // absent operator. Prevents the game from "running itself" while
    // the player is gone.
    if (!isPassiveIncomeActive()) return;

    var total = (state.aspectExegesis||0) + (state.aspectChromatics||0) + (state.aspectDeftness||0)
              + (state.aspectOmens||0) + (state.aspectIntrospection||0);
    if (total < 200) return;

    var nowT = Date.now();
    var since = nowT - (state.lastAmokTickAt || 0);
    var gap = total >= 500 ? 30000 : (total >= 350 ? 60000 : 120000);
    if (since < gap) return;

    // 50% chance to actually fire on each gap.
    if (Math.random() > 0.5) { state.lastAmokTickAt = nowT; return; }

    state.lastAmokTickAt = nowT;
    state.amokTicks = (state.amokTicks || 0) + 1;

    // ----- Determine the siphon cap for this window -----
    // Cap: siphon can never remove more than 1% of lifetimeCoins in
    // any rolling 10-minute period. This makes the "amok tax" small
    // relative to total earnings so it never stalls the player, but
    // steady enough that idling for profit is strictly worse than
    // playing.
    if (!state.amokWindow) state.amokWindow = { since: nowT, taken: 0 };
    if (nowT - state.amokWindow.since > 10 * 60 * 1000) {
      state.amokWindow = { since: nowT, taken: 0 };
    }
    var windowCap = Math.max(0, Math.floor((state.lifetimeCoins || 0) * 0.01));

    // Narrative chatter at 200+ (pure flavor, no resource change).
    if (total < 350) {
      try { if (typeof MsgLog !== 'undefined') MsgLog.push('The standing office has logged, without comment, that the operator is currently being observed.'); } catch (_) {}
      SFX.amok();
      save();
      return;
    }

    // 350+ treasury siphon (flat, capped).
    var siphon = total >= 500 ? 100 : (total >= 450 ? 25 : 5);
    if (siphon > 0) {
      var canTake = Math.max(0, Math.min(siphon, windowCap - (state.amokWindow.taken || 0)));
      if (canTake > 0 && (state.coins || 0) >= canTake) {
        state.coins -= canTake;
        state.amokWindow.taken = (state.amokWindow.taken || 0) + canTake;
        try { if (typeof MsgLog !== 'undefined') MsgLog.push('A standing fee of $' + canTake + ' has been withdrawn from the Treasury. The withdrawal slip is filed under Today.'); } catch (_) {}
        SFX.amok();
      } else {
        // Cap reached — emit pure chatter instead.
        try { if (typeof MsgLog !== 'undefined') MsgLog.push('The standing office would have withdrawn a fee, but the withdrawal book is, at this time, full.'); } catch (_) {}
      }
    }

    // 450+ reserve misfiling (pure loss, never grant).
    if (total >= 450) {
      if ((state.cogitationTokens || 0) >= 1 && total >= 500 && Math.random() < 0.3) {
        state.cogitationTokens -= 1;
        try { if (typeof MsgLog !== 'undefined') MsgLog.push('A Cogitation Token has been misfiled. The Token is reportedly "fine" but "elsewhere."'); } catch (_) {}
      } else if ((state.dataSachets || 0) >= 1 && Math.random() < 0.5) {
        state.dataSachets -= 1;
        try { if (typeof MsgLog !== 'undefined') MsgLog.push('A Data Sachet has been misfiled. The filing is technically correct. The Sachet is technically gone.'); } catch (_) {}
      } else if ((state.bandwidthWrits || 0) >= 1) {
        state.bandwidthWrits -= 1;
        try { if (typeof MsgLog !== 'undefined') MsgLog.push('A Bandwidth Writ has been filed against nothing in particular. Nobody has signed the counterfoil.'); } catch (_) {}
      }
    }

    save(function() { render(); });
  }

  // ===== Cross-window nav =====
  function openWindow(path) {
    try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
  }

  // ===== Boot =====
  load(function() {
    // Wire top-bar buttons
    var backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', function() { SFX.click(); openWindow('popup.html'); });
    var galleryNavBtn = document.getElementById('galleryNavBtn');
    if (galleryNavBtn) galleryNavBtn.addEventListener('click', function() { SFX.click(); openWindow('gallery.html'); });
    var factoryNavBtn = document.getElementById('factoryNavBtn');
    if (factoryNavBtn) factoryNavBtn.addEventListener('click', function() { SFX.click(); openWindow('factory.html'); });

    // Attach message log UI
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.mount) {
        MsgLog.mount('msgConsole');
      }
    } catch (_) {}

    // Ensure first visit seeds the three starter reveals
    if (state.ratiocinatoryUnlocked) {
      if (!state.ratiocinatoryRevealed) state.ratiocinatoryRevealed = {};
      if (!state.ratiocinatoryRevealed['clerisy_writs'])   state.ratiocinatoryRevealed['clerisy_writs']   = Date.now();
      if (!state.ratiocinatoryRevealed['aspect_exegesis']) state.ratiocinatoryRevealed['aspect_exegesis'] = Date.now();
      if (!state.ratiocinatoryRevealed['patsy_junior'])    state.ratiocinatoryRevealed['patsy_junior']    = Date.now();
    }

    // First visit: push a standing memo into the console.
    if (!state.hasSeenRatiocinatoryIntro) {
      state.hasSeenRatiocinatoryIntro = true;
      try {
        if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
          MsgLog.push('Welcome to Section IX/b. Form 27B/6 is on your desk. The desk is on your right. The Computer is thinking about the desk.');
        }
      } catch (_) {}
      save();
    }

    render();
    // Periodic re-render for clock + amok ticks
    setInterval(render, 1000);
    setInterval(tickAmok, 20000);

    // Cross-window state sync
    try {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area !== 'local' || !changes.pixelFocusState) return;
        var incoming = changes.pixelFocusState.newValue;
        if (!incoming) return;
        state = Object.assign({}, DEFAULTS, incoming);
        if (!state.ratiocinatoryRevealed) state.ratiocinatoryRevealed = {};
        if (!state.ratiocinatoryCheckpoints) state.ratiocinatoryCheckpoints = {};
        render();
      });
    } catch (e) {}
  });

})();
