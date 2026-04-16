// =============================================================================
// personnel.js — v3.20.0 Employee Roster (Stage 2 Loom Practice pass)
// =============================================================================
// The factory used to treat "employees" as an abstract multiplier tied to
// state.employeesLevel (0..5). This module fleshes them out into an actual
// roster of named people with bios, so the Employee Management Center (next
// file up) has something to display and so later stages (Research Lab,
// Incinerator) have concrete patsies to act upon.
//
// Each employee is a plain object:
//   { id, name, role, pool, bio, hiredAt, tenureDays }
//
// "pool" is one of:
//   'wes'       — Wes Anderson-flavoured eccentrics (tight tailoring,
//                 symmetrical obsessions, inherited grievances)
//   'stranger'  — Stranger-Than-Fiction-flavoured mundanes (spreadsheets,
//                 tidy apartments, quiet desperation)
//   'migrant'   — Recent arrivals from varied places, each with a short
//                 one-line arrival story
//
// The roster size scales with state.employeesLevel:
//   L0 -> 0 employees
//   L1 -> 3 employees
//   L2 -> 8 employees
//   L3 -> 18 employees
//   L4 -> 35 employees
//   L5 -> 60 employees
//
// Employees are persistent once generated: the roster is stored in
// state.personnelRoster and only GROWS when employeesLevel climbs.
// It does not shrink when the player downgrades (they don't), and it
// survives save/load. Attrition will be handled in Stage 3 (Research
// Lab) and Stage 4 (Incinerator), which remove employees by id.
//
// This file is window-scoped (wrapped in an IIFE) and exports a single
// global named Personnel with three methods:
//   Personnel.getRoster(state)
//   Personnel.reconcileRoster(state)  // call after employeesLevel changes
//   Personnel.describeEmployee(emp)    // returns a 1-line tooltip
//
// There is intentionally NO DOM code in this file. The Management
// Center (employees.html / employees.js) will read from Personnel and
// render whatever it wants.
// =============================================================================

(function() {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pool: Wes Anderson eccentrics
  // Tight, slightly sad, slightly absurd. Inherited collections, failed
  // marriages, long-standing professional grudges. Always wearing some
  // specific piece of outerwear.
  // ---------------------------------------------------------------------------
  var WES_FIRST = [
    'Margot', 'Richie', 'Chas', 'Eli', 'Raleigh', 'Royal', 'Suzy', 'Sam',
    'Ward', 'Dignan', 'Anthony', 'Francis', 'Peter', 'Jack', 'Zero', 'Agatha',
    'Gustave', 'Dmitri', 'Henckels', 'Serge', 'Ludwig', 'Eleanor', 'Walt',
    'Steve', 'Ned', 'Klaus', 'Vladimir', 'Jane', 'Alistair', 'Badger'
  ];
  var WES_LAST = [
    'Tenenbaum', 'Sherman', 'Cash', 'Whitman', 'St. Clair', 'Bishop',
    'Ward', 'Fox', 'Zissou', 'Plimpton', 'Desgoffe-und-Taxis',
    'Khan', 'Moustafa', 'Nakamura', 'Pagoda', 'Woodbine', 'Lockheart',
    'Finn', 'Vermeer', 'Rollo', 'Atari', 'Bingo'
  ];
  var WES_ROLES = [
    'Shuttle supervisor (inherited)', 'Pattern librarian',
    'Dye-room philosopher', 'Bobbin historian', 'Hall monitor, unpaid',
    'Ledger correspondent', 'Assistant to the loom', 'Filing archaeologist',
    'Sub-secretary, second chair', 'Ribbon inventory, emeritus',
    'Junior under-junior manager'
  ];
  var WES_BIO_TEMPLATES = [
    'Arrives each morning in a mustard corduroy suit inherited from his late grandfather, an amateur lepidopterist of no particular distinction.',
    'Maintains a shoebox of unsent letters to a sister who lives two blocks away and is, by her own account, fine.',
    'Claims to have once been a nationally ranked junior fencer; refuses to elaborate except to say the scandal was not his fault.',
    'Keeps a scale model of the factory on her desk, updated daily with pins for meetings she is not invited to.',
    'Writes a private monthly report titled "Observations on the Warp" in green ink and files it in the wrong cabinet deliberately.',
    'Wears a tennis headband in a color the regulations forbid, and has been cited for it forty-one times since 1998.',
    'Is engaged in a long, quiet, never-mentioned feud with Floor 2 over a shared stapler.',
    'Has not spoken to her father since a dispute about a pool house. She brings the pool house up, occasionally, while eating lunch alone.',
    'Carries a folding map of the factory even though the factory has one hallway.',
    'Every Tuesday, puts on a different-colored corduroy blazer and records in a ledger which blazer it was.',
    'Refers to the breakroom only as "the annex" and becomes quietly upset when others do not.',
    'Took four months of leave last year to attend a failed archaeological dig she organized with two cousins.',
    'Runs an unofficial newsletter about the bobbin room and has never once been given permission to.',
    'His mother was a minor diplomat. His father was a better one. He, by his own admission, is neither.',
    'Maintains a scrapbook of Gallery rejection letters, including one from a gallery that does not exist.'
  ];

  // ---------------------------------------------------------------------------
  // Pool: Stranger-Than-Fiction mundanes
  // Quiet lives, repeating routines, spreadsheets, early bedtimes. Modest
  // tragedies. Narrated in the third person by someone they cannot hear.
  // ---------------------------------------------------------------------------
  var STRANGER_FIRST = [
    'Harold', 'Maggie', 'Karen', 'David', 'Susan', 'Greg', 'Barbara',
    'Kevin', 'Linda', 'Donald', 'Patricia', 'Martin', 'Deborah',
    'Steven', 'Christine', 'Philip', 'Joyce', 'Leonard', 'Rita',
    'Dennis', 'Eleanor', 'Frank', 'Norma', 'Russell', 'Beatrice'
  ];
  var STRANGER_LAST = [
    'Pascal', 'Crick', 'Mercer', 'Fellowes', 'Hobart', 'Wilkes',
    'Peavey', 'Dowling', 'Quist', 'Atwood', 'Marsh', 'Halpern',
    'Rennie', 'Thorpe', 'Overton', 'Carruth', 'Birdwell', 'Stang'
  ];
  var STRANGER_ROLES = [
    'Weft counter, night shift', 'Timesheet clerk', 'Shuttle inspector',
    'Receiving desk (back dock)', 'Breakroom coffee, 6am fill',
    'Junior ledger assistant', 'Packing line, station 4',
    'Quality control, batch B', 'Supply requests, A-M', 'Light fixture replacement'
  ];
  var STRANGER_BIO_TEMPLATES = [
    'Eats the same sandwich, cut into the same four triangles, every weekday. Has done so since 2017.',
    'Watches one episode of one particular sitcom before bed and has never once watched two.',
    'Keeps a notebook of every time a stranger has been kind to him. The notebook has seventy-two entries.',
    'Calls her mother every Sunday evening at 7:04pm and they speak, on average, for nine minutes.',
    'Owns a single houseplant, which is doing fine, and he does not know the species.',
    'Has the exact same haircut she had in her high school yearbook photo. Prefers not to discuss it.',
    'Rides the same bus every morning and has never learned the driver\u2019s name, and also would like to.',
    'Recently started saying "good morning" to the woman at the newsstand. She has not yet said it back.',
    'Keeps a shoebox of receipts from every restaurant he has ever eaten at alone.',
    'Owns a set of identical white shirts, numbered one through seven, and wears them in order.',
    'Is three months away from paying off a small loan she took out to buy a reliable used sedan.',
    'Is precisely the sort of man who, when his toaster broke, simply bought a new, identical toaster.',
    'Has, this year, begun to suspect her life is being described to an audience she cannot see.',
    'Counts the number of steps from the bus stop to the factory door each morning and writes it down.',
    'Sends a birthday card to a coworker she has never spoken to. She has done this for four years.',
    'His apartment is clean in the way that is also sad. He would like that sentence to be kinder.',
    'Has a savings account balance she checks on her phone at 10:07pm most nights.',
    'Keeps, in his desk, a single bar of plain chocolate. He has never eaten from it.'
  ];

  // ---------------------------------------------------------------------------
  // Pool: Random migrants
  // Recent arrivals from varied places, each with a short arrival-story bio.
  // Names drawn from small regional pools; stories note where they came
  // from, what they left, and sometimes what they miss. Deliberately quiet,
  // not tragic.
  // ---------------------------------------------------------------------------
  var MIGRANT_POOLS = [
    {
      region: 'Eastern European',
      first: ['Petra', 'Jan', 'Katerina', 'Mikolaj', 'Ivana', 'Tomas', 'Lenka', 'Stanislav', 'Zuzana', 'Dusan'],
      last:  ['Kovac', 'Novak', 'Horak', 'Marek', 'Sedlacek', 'Vlach', 'Dvorak', 'Pospisil', 'Svoboda'],
      stories: [
        'Left a town whose train station was closed in 2019 and never reopened. Sends a little money home, when she can.',
        'Learned English from a single borrowed paperback and the subtitles of one specific cooking show.',
        'Was a schoolteacher for eleven years. Keeps a bundle of her students\u2019 drawings in a drawer she does not open often.',
        'Arrived with one suitcase and a photograph of a river he will likely never see again.',
        'Has a sister three cities away whom she calls every Sunday. They speak in the language they grew up in.',
        'Worked as a welder in a shipyard that no longer exists. Still keeps his own pair of gloves.'
      ]
    },
    {
      region: 'West African',
      first: ['Amadou', 'Fatou', 'Kwame', 'Nneka', 'Ifeoma', 'Kofi', 'Adaeze', 'Ousmane', 'Aminata', 'Ebele'],
      last:  ['Diallo', 'Okonkwo', 'Mensah', 'Obi', 'Traore', 'Adeyemi', 'Cisse', 'Owusu', 'Bamba'],
      stories: [
        'Studied electrical engineering at a university whose library he still, technically, owes a book to.',
        'Keeps a recipe card in her wallet in her mother\u2019s handwriting. She has not yet worked up the nerve to make it here.',
        'Has the exact same first name as his grandfather, and introduces himself using both names at once.',
        'Was a taxi driver in a city with three roundabouts he could describe from memory. Can still describe them.',
        'Writes long letters home in a careful, sloping hand and posts them on the same Thursday each month.',
        'Arrived four years ago on a scholarship that fell through; stayed anyway. Is not sure it was the right decision.'
      ]
    },
    {
      region: 'Andean',
      first: ['Mateo', 'Rosa', 'Carlos', 'Camila', 'Diego', 'Luciana', 'Javier', 'Valeria', 'Andres', 'Yolanda'],
      last:  ['Quispe', 'Mamani', 'Vargas', 'Castillo', 'Condori', 'Ramirez', 'Huaman', 'Flores'],
      stories: [
        'Grew up on a mountain road so steep the school bus backed up it. Misses the altitude in a way he finds hard to describe.',
        'Her grandmother wove textiles in the same patterns her great-grandmother did. She has not touched a loom since arriving.',
        'Came north with a cousin who went further north. They still call each other on holidays.',
        'Was halfway through an accounting degree when she moved. Has not, yet, finished it.',
        'Keeps a small bag of dried herbs from home in a drawer. The smell is getting fainter.',
        'Learned to ride a bicycle at thirty-one so he could get to work on time.'
      ]
    },
    {
      region: 'South Asian',
      first: ['Priya', 'Arjun', 'Meera', 'Rohan', 'Anika', 'Devika', 'Imran', 'Sana', 'Vikram', 'Nasreen'],
      last:  ['Patel', 'Khan', 'Singh', 'Chatterjee', 'Desai', 'Iyer', 'Rao', 'Ahmed', 'Malhotra'],
      stories: [
        'Was a civil servant in a small district and misses the particular rhythm of the paperwork there.',
        'Has three siblings, one cat, and four cousins who she is, currently, helping to support.',
        'Studied computer science at a university that still has her graduation photograph in its hallway.',
        'Speaks five languages and is tired of being asked which one she thinks in.',
        'Runs a small, private WhatsApp group that consists of her family and exactly one friend.',
        'Brought with him a small cloth-wrapped bundle of books he has not, yet, read here.'
      ]
    },
    {
      region: 'Levantine',
      first: ['Layla', 'Omar', 'Rania', 'Youssef', 'Nadia', 'Samir', 'Yasmin', 'Karim', 'Mariam', 'Elias'],
      last:  ['Haddad', 'Khoury', 'Saleh', 'Nassar', 'Fares', 'Mansour', 'Abadi', 'Bishara'],
      stories: [
        'Left behind a family olive grove that his brother now manages, by text message, from two time zones away.',
        'Has a younger cousin who is also here, in a different city, whom she has seen twice in six years.',
        'Was a pharmacist for nine years. The license does not transfer; she is trying to be okay with that.',
        'Keeps a photograph of a specific street corner taped inside her locker. No one has asked her about it.',
        'His mother, at the airport, gave him a jar of a spice blend he cannot find anywhere here.',
        'Arrived with a friend who has since moved further north. They still text every few days.'
      ]
    },
    {
      region: 'Nordic',
      first: ['Elin', 'Mikkel', 'Saga', 'Henrik', 'Tove', 'Oskar', 'Ingrid', 'Lars', 'Sigrid', 'Viggo'],
      last:  ['Lund', 'Eriksen', 'Nilsson', 'Berg', 'Holm', 'Dahl', 'Vik', 'Hansen'],
      stories: [
        'Came for a one-year research program and somehow, five years later, is still here.',
        'Keeps an espresso pot she insists is better than any in this city, and makes a point of offering it to people.',
        'Worked in forestry management and has, on her desk, a small wooden disc cut from a tree she used to walk past.',
        'Left to be closer to a partner she is, quietly, no longer with.',
        'Grew up in a town of eight hundred people and does not, yet, know the name of most of her neighbors here.',
        'Came south for the winter and has never quite gone back.'
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // Deterministic pool picker
  // Uses the employee id as a seed so regenerating the same roster gives
  // the same bios — important because the DOM will re-render on state
  // reloads and we don't want bios to shuffle.
  // ---------------------------------------------------------------------------
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function seedPick(seed, arr) {
    if (!arr || !arr.length) return null;
    return arr[seed % arr.length];
  }

  // ---------------------------------------------------------------------------
  // Generate a single employee object. poolKey is one of 'wes' | 'stranger' | 'migrant'.
  // id is a unique string — the roster uses the running count (hiredAt + index).
  // ---------------------------------------------------------------------------
  function makeEmployee(id, poolKey, hiredAtTs, usedNames) {
    var seed = hashSeed(id + ':' + poolKey);
    var name, role, bio, regionLabel;
    if (poolKey === 'wes') {
      name = seedPick(seed, WES_FIRST) + ' ' + seedPick(seed >>> 3, WES_LAST);
      role = seedPick(seed >>> 5, WES_ROLES);
      bio  = seedPick(seed >>> 7, WES_BIO_TEMPLATES);
      regionLabel = 'local eccentric';
    } else if (poolKey === 'stranger') {
      name = seedPick(seed, STRANGER_FIRST) + ' ' + seedPick(seed >>> 3, STRANGER_LAST);
      role = seedPick(seed >>> 5, STRANGER_ROLES);
      bio  = seedPick(seed >>> 7, STRANGER_BIO_TEMPLATES);
      regionLabel = 'quiet life';
    } else {
      // migrant — pick region first, then name/story from its own pool
      var pool = MIGRANT_POOLS[seed % MIGRANT_POOLS.length];
      name = seedPick(seed >>> 2, pool.first) + ' ' + seedPick(seed >>> 6, pool.last);
      role = seedPick(seed >>> 4, STRANGER_ROLES); // migrants take ordinary roles
      bio  = seedPick(seed >>> 8, pool.stories);
      regionLabel = pool.region + ' arrival';
    }
    // Collision safety net (v3.20.31, tightened v3.20.32): never allow two
    // employees to share a FIRST name. `usedNames` is now a Set of first
    // names already in the roster. If the generated name's first-name
    // collides, swap in a name from the expanded PatsyNames pool whose
    // first name is not yet in use. The primary Wes/Stranger/Migrant pools
    // still do all the creative work — this only fires on collision.
    var PN = (typeof window !== 'undefined') ? window.PatsyNames : null;
    if (usedNames && typeof usedNames.has === 'function' && name && PN && typeof PN.firstNameOf === 'function') {
      var fn = PN.firstNameOf(name);
      if (fn && usedNames.has(fn)) {
        if (typeof PN.pickUniqueFirstName === 'function') {
          var alt = PN.pickUniqueFirstName(usedNames);
          if (alt && typeof alt === 'string') name = alt;
        }
      }
    }
    return {
      id: id,
      name: name || 'Unnamed Employee',
      role: role || 'General staff',
      pool: poolKey,
      region: regionLabel,
      bio: bio || '',
      hiredAt: hiredAtTs || Date.now()
    };
  }

  // ---------------------------------------------------------------------------
  // Target roster size for each employeesLevel tier.
  // Deliberately sub-linear so the management center isn't swamped.
  // ---------------------------------------------------------------------------
  var ROSTER_TARGET_BY_LEVEL = [0, 3, 8, 18, 35, 60];
  function targetRosterSize(employeesLevel) {
    var lvl = Math.max(0, Math.min(5, employeesLevel || 0));
    return ROSTER_TARGET_BY_LEVEL[lvl];
  }

  // ---------------------------------------------------------------------------
  // Reconcile the roster to employeesLevel. Only GROWS the roster — we
  // never remove employees here. If the player's level is higher than
  // the roster count allows for, we hire new ones (and log that).
  //
  // Pool mix (rough targets):
  //   Level 1..2: mostly Wes + Stranger, occasional migrant
  //   Level 3+:   even split of all three
  //
  // Returns the number of NEW employees hired so callers can push a
  // message into MsgLog if they want to.
  // ---------------------------------------------------------------------------
  function reconcileRoster(state) {
    if (!state) return 0;
    if (!Array.isArray(state.personnelRoster)) state.personnelRoster = [];
    var roster = state.personnelRoster;
    // Departures (research lab, incinerator) permanently lower the target.
    // Once an employee is gone they are gone — the standing office does
    // not replace them automatically, only a new upgrade level does.
    var departures = state.personnelDepartures || 0;
    var target = Math.max(0, targetRosterSize(state.employeesLevel || 0) - departures);
    if (roster.length >= target) return 0;
    var hiredNow = 0;
    var baseSeed = 'r' + (state.lifetimeCoins || 0) + ':' + roster.length;
    // v3.20.32: Build a Set of existing first names. If any already-hired
    // employees share a first name (legacy duplicates from before this
    // check existed), silently rename the duplicate using PatsyNames so
    // the user's progress is preserved but the roster ends up unique.
    // This only touches the NAME field — id, pool, role, bio, region,
    // hiredAt, stress, etc. all stay intact.
    var PN = (typeof window !== 'undefined') ? window.PatsyNames : null;
    var usedNames = new Set();
    if (PN && typeof PN.firstNameOf === 'function') {
      for (var u = 0; u < roster.length; u++) {
        var emp0 = roster[u];
        if (!emp0 || !emp0.name) continue;
        var fn0 = PN.firstNameOf(emp0.name);
        if (!fn0) continue;
        if (usedNames.has(fn0)) {
          // Legacy duplicate — swap in a unique alternative.
          if (typeof PN.pickUniqueFirstName === 'function') {
            var alt0 = PN.pickUniqueFirstName(usedNames);
            if (alt0 && typeof alt0 === 'string') {
              emp0.renamedFrom = emp0.name;
              emp0.name = alt0;
              fn0 = PN.firstNameOf(alt0);
            }
          }
        }
        if (fn0) usedNames.add(fn0);
      }
    } else {
      // Fallback when PatsyNames isn't loaded: dedup by full name only.
      for (var u2 = 0; u2 < roster.length; u2++) {
        if (roster[u2] && roster[u2].name) usedNames.add(roster[u2].name);
      }
    }
    while (roster.length < target) {
      var seed = hashSeed(baseSeed + ':' + roster.length);
      // Pick pool based on seed + current level mix
      var lvl = state.employeesLevel || 0;
      var roll = seed % 100;
      var poolKey;
      if (lvl <= 2) {
        if      (roll < 45) poolKey = 'wes';
        else if (roll < 85) poolKey = 'stranger';
        else                poolKey = 'migrant';
      } else {
        if      (roll < 34) poolKey = 'wes';
        else if (roll < 67) poolKey = 'stranger';
        else                poolKey = 'migrant';
      }
      var idStr = 'emp-' + (state.personnelNextId || 1);
      state.personnelNextId = (state.personnelNextId || 1) + 1;
      var emp = makeEmployee(idStr, poolKey, Date.now(), usedNames);
      roster.push(emp);
      if (emp && emp.name) {
        var empFirst = (PN && typeof PN.firstNameOf === 'function') ? PN.firstNameOf(emp.name) : emp.name;
        if (empFirst) usedNames.add(empFirst);
      }
      hiredNow++;
    }
    return hiredNow;
  }

  // ---------------------------------------------------------------------------
  // A short, DOM-safe one-liner suitable for tooltips.
  // ---------------------------------------------------------------------------
  function describeEmployee(emp) {
    if (!emp) return '';
    return emp.name + ' \u00b7 ' + emp.role + ' \u00b7 ' + emp.region;
  }

  // ---------------------------------------------------------------------------
  // Convenience: how many days has this employee been on the books?
  // Used by the management center to sort and to show tenure.
  // ---------------------------------------------------------------------------
  function tenureDays(emp) {
    if (!emp || !emp.hiredAt) return 0;
    return Math.max(0, Math.floor((Date.now() - emp.hiredAt) / (24 * 60 * 60 * 1000)));
  }

  // ---------------------------------------------------------------------------
  // Remove an employee from the roster by id. Used by the Research Lab
  // (Stage 3) and the Incinerator (Stage 4) when an outcome consumes a
  // specific named employee. Returns the removed employee object or null.
  //
  // The roster target size (derived from employeesLevel) is NOT touched:
  // removing an employee leaves a GAP that reconcileRoster will refill
  // only if employeesLevel later climbs. This keeps the player honest
  // about the human cost of experiments.
  //
  // To prevent reconcileRoster from back-filling losses, we also track
  // a running total of departures in state.personnelDepartures so the
  // target can be reduced by that amount in future tiers if desired.
  // ---------------------------------------------------------------------------
  function removeById(state, id) {
    if (!state || !id) return null;
    if (!Array.isArray(state.personnelRoster)) return null;
    var roster = state.personnelRoster;
    for (var i = 0; i < roster.length; i++) {
      if (roster[i] && roster[i].id === id) {
        var gone = roster.splice(i, 1)[0];
        state.personnelDepartures = (state.personnelDepartures || 0) + 1;
        if (!Array.isArray(state.personnelDepartureLog)) state.personnelDepartureLog = [];
        state.personnelDepartureLog.push({
          id: gone.id,
          name: gone.name,
          role: gone.role,
          pool: gone.pool,
          at: Date.now()
        });
        // Cap the log at 200 entries so saves stay tidy.
        if (state.personnelDepartureLog.length > 200) {
          state.personnelDepartureLog.splice(0, state.personnelDepartureLog.length - 200);
        }
        return gone;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Look up an employee object by id. Returns null if not found.
  // ---------------------------------------------------------------------------
  function findById(state, id) {
    if (!state || !id || !Array.isArray(state.personnelRoster)) return null;
    var roster = state.personnelRoster;
    for (var i = 0; i < roster.length; i++) {
      if (roster[i] && roster[i].id === id) return roster[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // v3.20.0 Stage 4 — Dissident / stress tracking
  //
  // Employees accumulate "stress" when subjected to Research Lab experiments
  // or left idle too long under certain conditions. Once stress crosses a
  // threshold, the employee becomes a dissident: they still draw payroll,
  // but they no longer contribute to passive income. Each unresolved
  // dissident applies a small penalty to the streak trickle (computed
  // downstream in factory.js), nudging the player toward wrangling them
  // through the Research Lab (higher risk) or the Incinerator (certain
  // resolution, permanent loss).
  //
  // Stress / dissident data lives on the employee object itself:
  //   emp.stress        — integer 0..5
  //   emp.dissident     — boolean
  //   emp.dissidentAt   — ms timestamp when the flag flipped
  //   emp.dissidentReason — short string for the UI tooltip
  //
  // None of these fields exist on older saves. Helpers here default
  // them lazily so you don't have to migrate existing rosters.
  // ---------------------------------------------------------------------------

  // Upper bound on stress. Beyond this, addStress auto-promotes to dissident.
  var STRESS_MAX = 5;

  function getStress(emp) {
    if (!emp) return 0;
    return emp.stress || 0;
  }

  function isDissident(emp) {
    if (!emp) return false;
    return !!emp.dissident;
  }

  // Add `amount` stress to an employee. If the new stress crosses the
  // auto-dissident threshold (>= STRESS_MAX) OR meets the risk threshold
  // (>= 3) and the roll passes, the employee becomes a dissident.
  //
  // Returns one of: 'ok' (no change), 'stressed' (stress went up, not yet
  // dissident), 'dissident' (flag flipped this call).
  function addStress(emp, amount, reason) {
    if (!emp) return 'ok';
    var prev = emp.stress || 0;
    var next = Math.min(STRESS_MAX, prev + (amount || 1));
    emp.stress = next;
    if (emp.dissident) return 'ok';
    if (next >= STRESS_MAX) {
      emp.dissident = true;
      emp.dissidentAt = Date.now();
      emp.dissidentReason = reason || 'Exceeded tolerable stress.';
      return 'dissident';
    }
    if (next >= 3 && Math.random() < 0.5) {
      emp.dissident = true;
      emp.dissidentAt = Date.now();
      emp.dissidentReason = reason || 'Quietly stopped cooperating.';
      return 'dissident';
    }
    return 'stressed';
  }

  // Count unresolved dissidents currently on the roster.
  function dissidentCount(state) {
    if (!state || !Array.isArray(state.personnelRoster)) return 0;
    var roster = state.personnelRoster;
    var n = 0;
    for (var i = 0; i < roster.length; i++) {
      if (roster[i] && roster[i].dissident) n++;
    }
    return n;
  }

  // Return a new array of only the dissident employees. Does not mutate.
  function listDissidents(state) {
    if (!state || !Array.isArray(state.personnelRoster)) return [];
    return state.personnelRoster.filter(function(e) { return e && e.dissident; });
  }

  // Manually flag an employee as a dissident without going through the
  // stress machinery. Useful for narrative events and debug tools.
  function markDissident(emp, reason) {
    if (!emp || emp.dissident) return false;
    emp.dissident = true;
    emp.dissidentAt = Date.now();
    emp.dissidentReason = reason || 'Flagged by standing order.';
    if ((emp.stress || 0) < STRESS_MAX) emp.stress = STRESS_MAX;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.Personnel = {
    getRoster: function(state) {
      if (!state || !Array.isArray(state.personnelRoster)) return [];
      return state.personnelRoster;
    },
    reconcileRoster: reconcileRoster,
    describeEmployee: describeEmployee,
    tenureDays: tenureDays,
    targetRosterSize: targetRosterSize,
    removeById: removeById,
    findById: findById,
    getStress: getStress,
    isDissident: isDissident,
    addStress: addStress,
    dissidentCount: dissidentCount,
    listDissidents: listDissidents,
    markDissident: markDissident,
    STRESS_MAX: STRESS_MAX,
    POOL_LABELS: {
      wes:      'Local eccentric',
      stranger: 'Quiet life',
      migrant:  'Recent arrival'
    }
  };

})();
