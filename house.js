/* =============================================================================
 *  house.js  —  v3.20.1 Stage 5  (The House)
 *
 *  A small, deliberately-spare module. It reads the live game state and
 *  returns a "rap sheet" — the number and condition of the things at home —
 *  plus a short block of per-member "vital signs" that read like a feed off
 *  the building's own security system: heart rates, surface temperatures,
 *  motion levels, last seen times. The signs improve while the business is
 *  going well and quietly degrade once the factory begins consuming people.
 *
 *  Design notes
 *  ------------
 *  - The house is strictly READ-ONLY relative to save state. It never
 *    writes. Every field on the returned object is derived from existing
 *    state values, so opening the window cannot alter the player's save.
 *  - Wellbeing is a single 0..100 scalar computed from state. Positive
 *    signals (streak, lifetime coins, early employees/marketing) push it
 *    up; dark signals (dissidents, research lab, personnel incinerator,
 *    heavy lobbying) push it down. This is what produces the "gets better,
 *    then gets worse" arc the player is supposed to feel.
 *  - Vital signs are a deterministic function of (wellbeing, member key).
 *    There are no random numbers here — two snapshots taken a second apart
 *    read identically, which is the point. A security feed is supposed to
 *    look steady unless something is wrong.
 *  - "Spouse" is labelled only SPOUSE. The window never specifies gender,
 *    profession, or name. This is a choice, and it is the entire joke.
 *  - If the land bridge has been built, the house is not reachable. The
 *    window shows a small paragraph of refusal and nothing else. This is
 *    also the joke, in a quieter way.
 *
 *  Export
 *  ------
 *    window.House = {
 *      getRapSheet(state)   -> { members[], spouse, kids, pets, condition,
 *                                chapter, wellbeing, denied }
 *      isAccessDenied(state)-> bool   (true after the land bridge opens)
 *      denialNotice()       -> string (the exact memo the window displays)
 *      CONDITION_LABELS     -> label table, exported for UI convenience
 *    };
 * ============================================================================= */

(function () {
  'use strict';

  // Progression thresholds. Kept private. They do NOT get read from state
  // anywhere else, so tweaking them here cannot affect saved values.
  var THRESHOLDS = {
    kidsAppear:   200,     // lifetimeCoins at which a second child appears
    petsAppear:   50,      // lifetimeCoins at which a pet joins the family
    secondPet:    8000,    // a second pet
    spouseNotes:  1,       // streak days before the spouse has notes to give
    improvingMin: 3,       // streak >= this AND no dark upgrades = "improving"
    waningStart:  1        // first dissident OR research lab => condition turns
  };

  // The six condition labels form a Wes-Anderson-shaped arc. The UI picks
  // one based on the progression signals below. None of the labels are
  // gendered, medicalised, or specific — they are the kinds of short notes
  // one writes in the margin of a ledger about one's own living room.
  var CONDITION_LABELS = {
    settling:     'Settling in.',
    warm:         'Warm. The light is good.',
    tidy:         'Tidy. The hallway has new flowers.',
    quiet:        'Quiet. Everyone is where they should be.',
    distracted:   'Distracted. The kettle has been on twice.',
    watchful:     'Watchful. The door is checked after it is already locked.',
    unwell:       'Unwell. A letter was left on the desk, unopened.',
    drifted:      'Drifted. The calendar is three weeks out of date.'
  };

  // -------------------------------------------------------------------------
  // Small helpers — everything here takes state and returns a scalar.
  // They never mutate. If state is missing, they default to zero so the
  // module can be called safely on a cold start.
  // -------------------------------------------------------------------------
  function safeNum(v, fallback) {
    var n = Number(v);
    if (!isFinite(n)) return fallback || 0;
    return n;
  }

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function dissidentCountFrom(state) {
    try {
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.dissidentCount) {
        return Personnel.dissidentCount(state) || 0;
      }
    } catch (_) {}
    return 0;
  }

  function spouseCount(/*state*/) {
    // The number of spouses is always exactly one. This is not a game
    // decision; it is a structural one. The spouse exists the moment the
    // house is opened. No upgrade adds or removes them.
    return 1;
  }

  function kidCount(state) {
    // Starts at one. A second child appears once the lifetime coin total
    // crosses the first meaningful threshold — narratively, "we bought a
    // little house because the work was going well." No further children
    // ever appear. The game is not about that.
    var lifetime = safeNum(state && state.lifetimeCoins, 0);
    if (lifetime >= THRESHOLDS.kidsAppear) return 2;
    return 1;
  }

  function petCount(state) {
    // One pet once modest earnings have been recorded. A second pet once
    // the factory is unambiguously successful. Pets do not decrease when
    // things at the factory sour — this is deliberate.
    var lifetime = safeNum(state && state.lifetimeCoins, 0);
    if (lifetime >= THRESHOLDS.secondPet)  return 2;
    if (lifetime >= THRESHOLDS.petsAppear) return 1;
    return 0;
  }

  // -------------------------------------------------------------------------
  // Wellbeing — a single 0..100 scalar that every vital sign reads from.
  //
  // The curve is intentionally the shape the player is supposed to feel:
  // it starts in the warm 50s, climbs through the early and mid chapters
  // as money and streaks accumulate, then walks itself back down as the
  // darker upgrades come online. A fully "successful" mid-game save sits
  // comfortably in the 80s; a save that has unlocked research, dissidents
  // and the personnel incinerator lands somewhere closer to 15.
  // -------------------------------------------------------------------------
  function wellbeingOf(state) {
    if (!state) return 55;

    var lifetime = safeNum(state.lifetimeCoins, 0);
    var streak   = safeNum(state.streak, 0);
    var emp      = safeNum(state.employeesLevel, 0);
    var mkt      = safeNum(state.marketingLevel, 0);
    var lob      = safeNum(state.lobbyingLevel, 0);
    var diss     = dissidentCountFrom(state);

    // --- positive terms: the "things are going well" side of the ledger.
    // All logarithmic or capped so the curve plateaus rather than running
    // away. The early game should FEEL like it is getting better, not pin
    // to 100 the moment the player opens the Ratiocinatory.
    var money   = clamp(5 * (Math.log(1 + lifetime / 500) / Math.log(2)), 0, 25);
    var streakP = clamp(streak * 1.5, 0, 15);
    var empP    = clamp(emp * 2.5, 0, 10);
    var mktP    = clamp(mkt * 2, 0, 5);

    var goodness = money + streakP + empP + mktP;

    // --- dark terms: each late-game unlock costs the house a little more.
    // The personnel incinerator is the biggest single hit; the land bridge
    // is not listed here because it triggers DENIAL MODE and the vital
    // signs are not rendered at all once it is commissioned.
    var darkness = 0;
    darkness += diss * 12;                        // each dissident: -12
    if (state.researchLabUnlocked) darkness += 15;
    if (state.incineratorUnlocked) darkness += 35;
    if (lob >= 3) darkness += 8;
    if (lob >= 6) darkness += 6;

    var wb = clamp(55 + goodness - darkness, 0, 100);
    return Math.round(wb);
  }

  // -------------------------------------------------------------------------
  // Chapter — a small label that summarises where the player is in the
  // overall narrative. The house window uses it to pick flavour copy for
  // the header. Derivation is deliberately additive: every test is an
  // independent signal, and the chapter falls out of the last one that
  // matches.
  // -------------------------------------------------------------------------
  function chapterOf(state) {
    if (!state) return 'prologue';
    if (state.landBridgeBuilt)          return 'denied';
    if (state.incineratorUnlocked)      return 'late';
    if (state.researchLabUnlocked)      return 'late-mid';
    if ((state.employeesLevel || 0) > 0) return 'mid';
    if (safeNum(state.lifetimeCoins, 0) >= 500) return 'early';
    return 'prologue';
  }

  // -------------------------------------------------------------------------
  // Condition — the single short label shown next to each family member.
  // The logic is a short decision tree rather than a scoring formula, so
  // the player can always trace a given label back to a specific factory
  // event. The tree reads top-down: the first matching rule wins.
  // -------------------------------------------------------------------------
  function conditionOf(state) {
    if (!state) return CONDITION_LABELS.settling;

    // --- DARK PHASE: once the factory has begun consuming people at all,
    //     the house copy darkens regardless of how well the money is doing.
    if (state.incineratorUnlocked) {
      return CONDITION_LABELS.drifted;
    }

    // --- A dissident-heavy roster darkens the house BEFORE the incinerator
    //     is purchased. It is the roster, not the hatch, that the family
    //     responds to. The family does not know what a dissident is. They
    //     simply notice when the ledger stops being a ledger.
    var diss = dissidentCountFrom(state);
    if (diss >= 2) return CONDITION_LABELS.unwell;

    if (state.researchLabUnlocked || diss >= 1) {
      return CONDITION_LABELS.watchful;
    }

    // --- FRAYING PHASE: the factory has personnel and the player has let
    //     at least a few in-game days slip without a session. The house
    //     notices the absence before it notices anything else.
    var streak = safeNum(state.streak, 0);
    if ((state.employeesLevel || 0) >= 3 && streak <= 0) {
      return CONDITION_LABELS.distracted;
    }

    // --- BRIGHT PHASE: the factory is still within the warm chapter of
    //     its story. Passive income is meaningful, the streak is long, and
    //     nobody at home has been asked to stop asking questions.
    if ((state.employeesLevel || 0) >= 2 && streak >= 7) {
      return CONDITION_LABELS.quiet;
    }
    if ((state.employeesLevel || 0) >= 1 && streak >= THRESHOLDS.improvingMin) {
      return CONDITION_LABELS.tidy;
    }
    if (streak >= THRESHOLDS.improvingMin) {
      return CONDITION_LABELS.warm;
    }
    return CONDITION_LABELS.settling;
  }

  // -------------------------------------------------------------------------
  // Vital signs — a per-member block in the shape the UI expects.
  //
  // Every member gets the same fields; the UI decides which cells to hide.
  // Each value is a pure function of (wellbeing, species baseline, small
  // stable per-member offset). No Math.random() is ever called: a given
  // save renders identical numbers on every open until the underlying
  // state actually changes.
  // -------------------------------------------------------------------------

  // Species baselines are ordinary resting numbers. They are medically
  // plausible but deliberately not precise; the feed is not a hospital
  // monitor, it is the sort of box that sits in a small room behind a
  // janitor's cupboard and blinks.
  var SPECIES = {
    spouse: { hrBase: 72, tempBase: 98.6, label: 'ADULT' },
    child:  { hrBase: 88, tempBase: 98.4, label: 'MINOR' },
    pet:    { hrBase: 120, tempBase: 101.2, label: 'ANIMAL' }
  };

  // Stable integer hash of a member key, used to give each sibling a small
  // unique offset so two children don't read as clones of each other.
  function keyOffset(key) {
    var s = String(key || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    // Normalise to the range [-2..+2].
    return (((h % 5) + 5) % 5) - 2;
  }

  // Short mood label keyed off the wellbeing tier.
  function moodTag(wb) {
    if (wb >= 85) return 'content';
    if (wb >= 70) return 'steady';
    if (wb >= 55) return 'settled';
    if (wb >= 40) return 'uneasy';
    if (wb >= 25) return 'withdrawn';
    if (wb >= 10) return 'remote';
    return 'absent';
  }

  // Motion label. Reads the way a two-line LCD on a janitor's corner box
  // would read: calm nouns, no verbs.
  function motionTag(wb) {
    if (wb >= 80) return 'light';
    if (wb >= 60) return 'steady';
    if (wb >= 40) return 'low';
    if (wb >= 20) return 'faint';
    return 'none';
  }

  // "Last seen" minutes. The worse things are at home, the longer it has
  // apparently been since the sensor had anything to report.
  function lastSeenMinutes(wb, offset) {
    var base = Math.round((100 - wb) * 0.6);   // 0 at peak, ~60 at 0
    return Math.max(0, base + offset);
  }

  // Formats a minutes number into the shape a monitor readout uses.
  function formatLastSeen(mins) {
    if (mins <= 0)  return 'now';
    if (mins < 60)  return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    var rem = mins % 60;
    if (hrs < 24)   return hrs + 'h ' + (rem ? rem + 'm ' : '') + 'ago';
    var days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  // Build a single member's vital block. The caller passes a stable key
  // so that siblings get small but reproducible offsets.
  function vitalsFor(speciesKey, wellbeing, memberKey) {
    var sp  = SPECIES[speciesKey] || SPECIES.spouse;
    var off = keyOffset(memberKey);

    // Heart rate rises as wellbeing falls. The rise is gentle below 60
    // and sharper once the house has drifted past the point the family
    // will name out loud.
    var stress = (100 - wellbeing) * 0.28;
    if (wellbeing < 40) stress += (40 - wellbeing) * 0.35;
    var hr = Math.round(sp.hrBase + stress + off);

    // Surface temperature drifts more slowly. A quarter of a degree at
    // full distress, which is not nothing but is also not an emergency.
    var tempDrift = (100 - wellbeing) * 0.012 + (off * 0.05);
    var temp = sp.tempBase + tempDrift;

    // "Signal" is a composed 0..100 readout, mainly for the UI bar.
    var signal = clamp(wellbeing + off * 2, 0, 100);

    return {
      species: sp.label,
      hr: hr,
      hrUnit: 'bpm',
      temp: Math.round(temp * 10) / 10,
      tempUnit: '\u00B0F',
      motion: motionTag(wellbeing),
      mood: moodTag(wellbeing),
      lastSeen: formatLastSeen(lastSeenMinutes(wellbeing, off)),
      signal: Math.round(signal)
    };
  }

  // -------------------------------------------------------------------------
  // Members — the flat list the UI iterates over. One row per actual
  // family member (two children => two rows). Keys are stable strings so
  // the per-member offsets stay consistent across renders.
  // -------------------------------------------------------------------------
  function buildMembers(state, wb) {
    var list = [];

    // Spouse: always exactly one.
    list.push({
      key:     'spouse',
      label:   'SPOUSE',
      display: 'SPOUSE',
      species: 'spouse',
      vitals:  vitalsFor('spouse', wb, 'spouse')
    });

    // Children: one or two. Labels carry their order so the sensor feed
    // reads like a list of unique tags, not like duplicates.
    var kc = kidCount(state);
    for (var i = 0; i < kc; i++) {
      var ckey = 'child-' + (i + 1);
      list.push({
        key:     ckey,
        label:   'CHILD',
        display: 'CHILD ' + (i + 1),
        species: 'child',
        vitals:  vitalsFor('child', wb, ckey)
      });
    }

    // Pets: zero, one or two.
    var pc = petCount(state);
    for (var j = 0; j < pc; j++) {
      var pkey = 'pet-' + (j + 1);
      list.push({
        key:     pkey,
        label:   'PET',
        display: 'PET ' + (j + 1),
        species: 'pet',
        vitals:  vitalsFor('pet', wb, pkey)
      });
    }

    return list;
  }

  // -------------------------------------------------------------------------
  // TELECOMMUNICATIONS — phone line and data link, reported as live
  // telemetry from the building's monitoring daemon. NOT prose. Each row
  // returns a single tabular-looking string of the kind a supervisor
  // glancing at the panel would use to decide whether the service is
  // functional: line voltage, loop resistance, dial tone frequencies,
  // link negotiation, RX power, latency, jitter, packet loss, uptime,
  // last handshake.
  //
  // Status rules — unchanged from the previous revision:
  //
  //     PHONE LINE
  //       open         early/mid game, no dark upgrades
  //       intermittent research lab, or dissident count >= 1, or wb < 55
  //       closed       personnel incinerator, or dissidents >= 2
  //
  //     DATA LINK
  //       open         early/mid game, no dissidents
  //       degraded     dissident, or research lab, or wb < 50
  //       closed       personnel incinerator
  //
  // Returned object shape:
  //   { key, status, label, readout, note }
  //   status  — 'open' | 'warn' | 'down'  (CSS tier)
  //   readout — short status word          ('OPEN' | 'DEGRADED' | 'CLOSED')
  //   note    — tabular telemetry string   (monospaced in the UI)
  // -------------------------------------------------------------------------

  // Deterministic per-wellbeing jitter for a numeric readout. Produces a
  // small stable variation so two renders of the same state show the
  // same numbers. No Math.random() is used.
  function jit(wb, key, range) {
    var s = String(key || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    // Fold wellbeing into the hash so the numbers drift a little as the
    // house degrades without the row flickering on re-render.
    h = (h ^ Math.round(wb * 13)) | 0;
    var frac = ((h % 1000) + 1000) % 1000 / 1000;   // 0..1
    return (frac - 0.5) * 2 * (range || 1);         // -range..+range
  }

  function fmt(n, decimals) {
    var f = Math.pow(10, decimals || 0);
    return (Math.round(n * f) / f).toFixed(decimals || 0);
  }

  // Telemetry string for the PHONE LINE row. Takes the wellbeing scalar
  // because the intermittent tier wants to look like a line that is
  // getting worse, not like a fixed string.
  function phoneTelemetry(status, wb) {
    if (status === 'down') {
      return (
        'LINE 0.0V \u00B7 LOOP \u221E \u00B7 TONE \u2205 \u00B7 CO ROUTE NULL '
        + '\u00B7 LAST HS 3d14h \u00B7 UPTIME 0.00%'
      );
    }
    if (status === 'warn') {
      // Numbers degrade as wellbeing falls from 55 toward 20.
      var t = Math.max(20, Math.min(55, wb));
      var volt = 41 + jit(wb, 'v', 1.2);                         // ~40-42
      var loop = Math.round(295 + (55 - t) * 3 + jit(wb, 'r', 4)); // rises
      var drop = fmt(6 + (55 - t) * 0.35 + jit(wb, 'd', 0.8), 1);  // %
      var lat  = Math.round(210 + (55 - t) * 6 + jit(wb, 'l', 10));
      return (
        'LINE ' + fmt(volt, 1) + 'V LOW \u00B7 LOOP ' + loop + '\u03A9 '
        + '\u00B7 TONE 348/436Hz \u00B1 4 \u00B7 LAT ' + lat + 'ms '
        + '\u00B7 DROP ' + drop + '% \u00B7 RETRIES \u00D73'
      );
    }
    // OPEN: a healthy POTS line.
    var v0  = 48.0 + jit(wb, 'v', 0.4);                    // ~47.8-48.2
    var l0  = Math.round(210 + jit(wb, 'r', 6));
    var la0 = Math.round(38  + jit(wb, 'l', 6));
    return (
      'LINE ' + fmt(v0, 1) + 'V \u00B7 LOOP ' + l0 + '\u03A9 '
      + '\u00B7 TONE 350/440Hz NOMINAL \u00B7 LAT ' + la0 + 'ms '
      + '\u00B7 LAST HS OK \u00B7 UPTIME 99.99%'
    );
  }

  // Telemetry string for the DATA LINK row.
  function netTelemetry(status, wb) {
    if (status === 'down') {
      return (
        'LINK DOWN \u00B7 NO CARRIER \u00B7 RX \u2205 \u00B7 DNS TIMEOUT '
        + '\u00B7 GW UNREACHABLE \u00B7 UPTIME 0.00%'
      );
    }
    if (status === 'warn') {
      var t    = Math.max(15, Math.min(55, wb));
      var rx   = Math.round(-55 - (55 - t) * 0.4 + jit(wb, 'x', 2));  // -55..-71
      var lat  = Math.round(140 + (55 - t) * 3.2 + jit(wb, 'l', 8));
      var jit1 = fmt(32 + (55 - t) * 0.6 + jit(wb, 'j', 2), 1);
      var loss = fmt(3.5 + (55 - t) * 0.22 + jit(wb, 'p', 0.6), 1);
      var up   = fmt(Math.max(62, 94 - (55 - t) * 0.9 + jit(wb, 'u', 0.5)), 1);
      return (
        'LINK 100BASE-T FDX \u00B7 RX ' + rx + 'dBm '
        + '\u00B7 LAT ' + lat + 'ms \u00B7 JIT ' + jit1 + 'ms '
        + '\u00B7 LOSS ' + loss + '% \u00B7 UPTIME ' + up + '%'
      );
    }
    // OPEN: a healthy gigabit link.
    var rx0  = Math.round(-38 + jit(wb, 'x', 2));       // ~-36..-40
    var la0  = Math.round(14 + jit(wb, 'l', 3));         // ~11..17
    var j0   = fmt(1.2 + jit(wb, 'j', 0.4), 1);
    var lo0  = '0.00';
    var up0  = fmt(99.9 + jit(wb, 'u', 0.08), 2);
    return (
      'LINK 1000BASE-T FDX \u00B7 RX ' + rx0 + 'dBm '
      + '\u00B7 LAT ' + la0 + 'ms \u00B7 JIT ' + j0 + 'ms '
      + '\u00B7 LOSS ' + lo0 + '% \u00B7 UPTIME ' + up0 + '%'
    );
  }

  function phoneStatus(state, wb) {
    if (!state) {
      return { key: 'phone', status: 'open', label: 'PHONE LINE',
               readout: 'OPEN', note: phoneTelemetry('open', wb) };
    }
    var diss = dissidentCountFrom(state);
    var tier = 'open';
    if (state.incineratorUnlocked || diss >= 2)        tier = 'down';
    else if (state.researchLabUnlocked || diss >= 1 || wb < 55) tier = 'warn';

    var readout = (tier === 'open')  ? 'OPEN'
                : (tier === 'warn')  ? 'DEGRADED'
                :                      'CLOSED';
    return {
      key:     'phone',
      status:  tier,
      label:   'PHONE LINE',
      readout: readout,
      note:    phoneTelemetry(tier, wb)
    };
  }

  function netStatus(state, wb) {
    if (!state) {
      return { key: 'net', status: 'open', label: 'DATA LINK',
               readout: 'OPEN', note: netTelemetry('open', wb) };
    }
    var diss = dissidentCountFrom(state);
    var tier = 'open';
    if (state.incineratorUnlocked) tier = 'down';
    else if (diss >= 1 || state.researchLabUnlocked || wb < 50) tier = 'warn';

    var readout = (tier === 'open') ? 'OPEN'
                : (tier === 'warn') ? 'DEGRADED'
                :                     'CLOSED';
    return {
      key:     'net',
      status:  tier,
      label:   'DATA LINK',
      readout: readout,
      note:    netTelemetry(tier, wb)
    };
  }

  function telecomsOf(state, wb) {
    return {
      phone: phoneStatus(state, wb),
      net:   netStatus(state, wb)
    };
  }

  // -------------------------------------------------------------------------
  // Denial — the two public signals that gate the land-bridge endgame.
  // Both are pure reads of state. Neither allocates anything new.
  // -------------------------------------------------------------------------
  function isAccessDenied(state) {
    if (!state) return false;
    return !!state.landBridgeBuilt;
  }

  // A single, fixed refusal paragraph. The prose is meant to sound like it
  // was typed onto a pre-printed form by somebody who has never met the
  // person reading it. There is no signature line because the form does
  // not include one.
  function denialNotice() {
    return (
      'NOTICE OF REDIRECTED TRANSIT (Form H/2b).  '
      + 'Since the land bridge connecting the Factory and the Master Loom '
      + 'has been commissioned in your name, outside travel on foot has been '
      + 'reclassified as unnecessary. Access to the house has therefore been '
      + 'closed, pending a review that is not currently scheduled. Any items '
      + 'left on the kitchen table will continue to be there. The family '
      + 'has been informed, by the same office, that you have elected to '
      + 'sleep at the factory until further notice.'
    );
  }

  // -------------------------------------------------------------------------
  // Public rap sheet — the one object the house window renders from.
  // Construction order matches the order fields appear in the UI, so the
  // render path is a straight iteration.
  // -------------------------------------------------------------------------
  function getRapSheet(state) {
    var wb = wellbeingOf(state);
    return {
      spouse:    { count: spouseCount(state), label: 'SPOUSE' },
      children:  { count: kidCount(state),    label: 'CHILDREN' },
      pets:      { count: petCount(state),    label: 'PETS'  },
      condition: conditionOf(state),
      chapter:   chapterOf(state),
      wellbeing: wb,
      members:   buildMembers(state, wb),
      telecoms:  telecomsOf(state, wb),
      denied:    isAccessDenied(state)
    };
  }

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------
  window.House = {
    getRapSheet:    getRapSheet,
    isAccessDenied: isAccessDenied,
    denialNotice:   denialNotice,
    CONDITION_LABELS: CONDITION_LABELS
  };

})();
