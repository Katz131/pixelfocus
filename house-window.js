/* =============================================================================
 *  house-window.js  —  v3.20.1 Stage 5
 *
 *  Render glue for house.html. Reads the live state from chrome.storage,
 *  asks window.House for the current rap sheet, and paints it into the
 *  page. If the land bridge has been built the standard view is replaced
 *  by the denial paragraph.
 *
 *  This file NEVER writes state. Opening the house window is strictly a
 *  read operation on the save.
 * ============================================================================= */

(function () {
  'use strict';

  var STATE_KEY = 'pixelFocusState';
  var state = null;

  function $(id) { return document.getElementById(id); }

  // -------------------------------------------------------------------------
  // Flavour: header eyebrow and mood sentence. Both are derived from the
  // current chapter so the copy shifts subtly as the factory grows.
  // -------------------------------------------------------------------------
  var EYEBROWS = {
    prologue: 'THE HOUSE \u00B7 FIRST MORNING',
    early:    'THE HOUSE \u00B7 MORNING',
    mid:      'THE HOUSE \u00B7 LATE MORNING',
    'late-mid':'THE HOUSE \u00B7 AFTERNOON',
    late:     'THE HOUSE \u00B7 EARLY EVENING',
    denied:   'THE HOUSE \u00B7 UNREACHABLE'
  };

  // -------------------------------------------------------------------------
  // Rotating prose — twenty short italic notes each, for the three rap-sheet
  // rows (SPOUSE, CHILDREN, PETS). The window picks a stable starting index
  // at boot time, so each time the player opens the house they see a
  // different trio of observations, but those three stay put for the rest
  // of the session (every re-render during the same open uses the same
  // index). Offsets are added per row so the three selections are never
  // coincidentally identical.
  //
  // All of these are meant to read as the kind of small, warm, slightly
  // indirect observation one might make about a room one is not currently
  // standing in. None of them are vital signs or medical. The vital signs
  // panel below the rap sheet handles the clinical reading.
  // -------------------------------------------------------------------------
  var SPOUSE_NOTES = [
    'Reading at the kitchen table.',
    'Making coffee.',
    'On the phone with their mother.',
    'Folding laundry on the bed.',
    'Watching the news in the living room.',
    'Loading the dishwasher.',
    'Replying to emails at the desk.',
    'Packing a lunch.',
    'Taking out the trash.',
    'Watering the houseplants.',
    'Making a grocery list.',
    'Paying bills.',
    'Putting on a jacket by the front door.',
    'Brushing their teeth.',
    'Reading a book on the couch.',
    'Changing the sheets.',
    'Sweeping the kitchen floor.',
    'Taking a shower.',
    'Eating toast at the counter.',
    'Looking through the mail.',
    'Standing at the window with a cup of tea.',
    'Moving a plant to a sunnier spot.',
    'Sweeping something invisible off the rug.',
    'Rearranging the bookshelf alphabetically.',
    'Writing a to-do list on the back of a receipt.',
    'Fixing a drawer that has never quite closed.',
    'Wiping down the kitchen counters, twice.',
    'Pairing socks on the edge of the bed.',
    'Listening to the radio at a low volume.',
    'Looking for the good scissors.',
    'Writing a long note and then not leaving it.',
    'Ironing one shirt with great care.',
    'Opening and closing the fridge without taking anything.',
    'Standing in the doorway for a moment too long.',
    'Checking the weather and then checking it again.',
    'Cleaning their glasses on the hem of a shirt.',
    'Feeding the sourdough starter.',
    'Pulling a loose thread off a cushion.',
    'Writing a grocery list, then losing it.',
    'Pouring a second cup of coffee they won\u2019t finish.'
  ];

  var CHILDREN_NOTES = [
    'Doing homework at the table.',
    'Watching cartoons on the couch.',
    'Eating cereal.',
    'Playing with LEGOs on the rug.',
    'Drawing at the kitchen table.',
    'Taking a nap.',
    'Getting dressed for school.',
    'Brushing their teeth.',
    'Reading a book in bed.',
    'Packing a backpack.',
    'Eating lunch.',
    'Playing a video game.',
    'Looking out the window.',
    'Tying their shoes.',
    'Asking for a snack.',
    'Watching a movie.',
    'Doing a jigsaw puzzle.',
    'Coloring in a coloring book.',
    'Eating dinner.',
    'Washing their hands.',
    'Building a fort out of couch cushions.',
    'Sorting a shoebox of marbles by colour.',
    'Pretending the hallway is a balance beam.',
    'Narrating a long story to the refrigerator.',
    'Carefully drawing a map of the house.',
    'Doing a handstand against the wall.',
    'Running a toy car along the baseboard.',
    'Explaining a rule they just invented.',
    'Practising tying a shoelace on a stuffed bear.',
    'Trying on a grown-up coat from the closet.',
    'Quietly counting the steps on the stairs.',
    'Staring at the ceiling fan without blinking.',
    'Humming the same three notes over and over.',
    'Stacking books into an uneven tower.',
    'Cutting out paper snowflakes.',
    'Asking why the sky is the colour it is.',
    'Sharpening every pencil in the drawer.',
    'Watching dust drift in a beam of light.',
    'Writing a letter to nobody in particular.',
    'Rearranging the stuffed animals by height.',
    'Making a small museum on the windowsill.',
    'Balancing a spoon on the edge of a cup.',
    'Telling the pet a long, serious secret.',
    'Whispering plans into the heating vent.',
    'Folding a paper airplane with great ceremony.',
    'Drawing a family portrait with unusual heads.',
    'Counting the leaves on the houseplant.',
    'Setting up an imaginary shop on the rug.',
    'Reading the cereal box out loud.',
    'Hiding under the table with a flashlight.',
    'Teaching a doll the alphabet.',
    'Arguing gently with the washing machine.',
    'Practising a cartwheel in the hallway.',
    'Writing their name in the condensation.',
    'Watching a cartoon with the sound too loud.',
    'Drawing on a steamed-up window.',
    'Inventing a language for the goldfish.',
    'Turning the sofa into a pirate ship.',
    'Taping a drawing to the front of the fridge.',
    'Looking for a missing sock with great gravity.',
    'Trying to whistle, unsuccessfully.',
    'Practising saying a hard word on repeat.',
    'Pouring juice slightly past the rim of the glass.',
    'Waiting for the microwave like it\u2019s a miracle.',
    'Holding a seashell to one ear.',
    'Writing a very serious note and hiding it.',
    'Counting how many steps to the bathroom.'
  ];

  var PETS_NOTES = [
    'Sleeping on the couch.',
    'Drinking from the water bowl.',
    'Curled up on the bed.',
    'Sitting by the window.',
    'Chewing a toy.',
    'Eating from the food bowl.',
    'Lying in a sunbeam.',
    'Scratching at the door.',
    'Napping on a rug.',
    'Sitting in the hallway.',
    'Licking a paw.',
    'Lying under the table.',
    'Watching birds through the window.',
    'Resting in the living room.',
    'Curled on a blanket.',
    'Sitting on the stairs.',
    'Stretching on the floor.',
    'Walking through the kitchen.',
    'Sleeping in a patch of sunlight.',
    'Sitting in a cardboard box.',
    'Staring at the wall with great patience.',
    'Knocking a pen off the desk.',
    'Waiting expectantly by an empty bowl.',
    'Chasing dust across the floor.',
    'Curled inside an open drawer.',
    'Watching the ceiling with suspicion.',
    'Hiding behind the curtain.',
    'Walking in slow figure-eights.',
    'Sitting on the newspaper being read.',
    'Pawing at a closed door.',
    'Watching the kettle come to a boil.',
    'Guarding a sock no one wanted.',
    'Rolling once, considering, rolling back.',
    'Perched on top of the bookshelf.',
    'Sitting on the keyboard.',
    'Breathing slowly at nothing visible.',
    'Stalking an invisible intruder.',
    'Staring into the hallway for a long time.',
    'Chewing quietly on the corner of a rug.',
    'Pressed flat against the cool tile.',
    'Watching the doorway and blinking slowly.',
    'Following a beam of light with one paw.',
    'Asleep on top of the laundry pile.',
    'Sitting on the windowsill like a loaf.',
    'Investigating the empty shopping bag.',
    'Making a nest out of a clean hoodie.',
    'Watching the dishwasher as if it owed money.',
    'Asleep in the one patch of carpet you sit on.',
    'Staring at the door handle.',
    'Watching a spider with professional interest.',
    'Politely ignoring the new toy.',
    'Sighing audibly at nothing.',
    'Sitting in a chair that isn\u2019t theirs.',
    'Tapping the water bowl with one paw.',
    'Asleep on a book you were reading.',
    'Waiting by the door for no clear reason.',
    'Standing halfway up the stairs, thinking.',
    'Watching the curtain breathe.',
    'Sniffing the air with great concentration.',
    'Staring at their own reflection.',
    'Asleep with one eye mostly open.',
    'Following you from room to room at a distance.',
    'Watching a bird through the window in total silence.',
    'Curled in the empty pet bed, finally.',
    'Sitting on the mat as if stationed there.'
  ];

  // Rotating seed. Starts at a random position at module load so reopening
  // the window gives a different first view; then a rotation timer bumps
  // it on a slow cadence so the player who lingers on the house screen
  // sees the feed update — the family is doing different things every
  // little while. Offsets per row (and per sibling) keep simultaneous
  // picks from ever colliding.
  // ------------------------------------------------------------------------
  // Per-member seeds. Each household member (spouse, each child, each pet)
  // has its OWN seed and its OWN rotation timer, so family members do
  // not all change activities in lockstep. The keys look like
  // 'spouse:0', 'child:0', 'child:1', 'pet:0' etc.
  // ------------------------------------------------------------------------
  var memberSeeds  = {};
  var memberTimers = {};

  function getSeed(key) {
    if (typeof memberSeeds[key] !== 'number') {
      // Large random offset per key so initial picks diverge across siblings.
      memberSeeds[key] = Math.floor(Math.random() * 100000);
    }
    return memberSeeds[key];
  }

  function bumpSeed(key) {
    memberSeeds[key] = (getSeed(key) + 1) | 0;
  }

  function pickNoteFor(pool, key) {
    if (!pool || pool.length === 0) return '';
    var s = getSeed(key);
    var idx = ((s % pool.length) + pool.length) % pool.length;
    return pool[idx];
  }

  // Render a feed of notes, one per member, joined with line breaks so
  // a household with two children reads as two separate observations.
  // `count` is the number of members; `labelFn` turns 0-based index into
  // a short tag like "CHILD 1" (omitted entirely when there's only one).
  //
  // Each sibling is keyed by `keyPrefix + ':' + i` so each rotates on its
  // OWN seed — siblings never change activity at the same instant.
  function buildMemberFeed(pool, count, keyPrefix, labelFn) {
    if (!pool || pool.length === 0 || count <= 0) return '';
    var lines = [];
    for (var i = 0; i < count; i++) {
      var note = pickNoteFor(pool, keyPrefix + ':' + i);
      if (count > 1 && typeof labelFn === 'function') {
        lines.push(labelFn(i) + ': ' + note);
      } else {
        lines.push(note);
      }
    }
    return lines.join('<br>');
  }

  // ------------------------------------------------------------------------
  // Per-member rotation.
  //
  // Every active household member (spouse, each child, each pet) gets its
  // OWN setInterval ticking at a RANDOM period, with a RANDOM initial
  // delay. So three children do not all change activities at the same
  // instant — they drift relative to each other and the viewer watches
  // each person's feed change independently.
  //
  // Periods are roughly 14–26 seconds. Initial delays are 0–14 seconds.
  // ------------------------------------------------------------------------
  var PERIOD_MIN_MS  = 14000;
  var PERIOD_SPAN_MS = 12000;  // plus PERIOD_MIN, so 14–26s
  var INIT_DELAY_MS  = 14000;

  function activeMemberKeys(sheet) {
    var keys = ['spouse:0'];
    var kc = (sheet && sheet.children && sheet.children.count) || 0;
    for (var i = 0; i < kc; i++) keys.push('child:' + i);
    var pc = (sheet && sheet.pets && sheet.pets.count) || 0;
    for (var i = 0; i < pc; i++) keys.push('pet:' + i);
    return keys;
  }

  // Re-render the single DOM element that contains this member's feed.
  // Siblings within the same group share an element (kidNote, petNote),
  // so we rebuild the whole group from current per-member seeds; only
  // the bumped member's line actually changes, because the others still
  // resolve to the same seed index.
  function rerenderMemberGroup(key) {
    var sheet = (window.House && window.House.getRapSheet)
      ? window.House.getRapSheet(state || {})
      : null;
    if (!sheet) return;

    if (key.indexOf('spouse') === 0) {
      var sEl = $('spouseNote');
      if (sEl) sEl.textContent = pickNoteFor(SPOUSE_NOTES, 'spouse:0');
    } else if (key.indexOf('child') === 0) {
      var kEl = $('kidNote');
      var kc = (sheet && sheet.children && sheet.children.count) || 0;
      if (kEl) {
        kEl.innerHTML = buildMemberFeed(
          CHILDREN_NOTES, kc, 'child',
          function (i) { return 'CHILD ' + (i + 1); }
        );
      }
    } else if (key.indexOf('pet') === 0) {
      var pEl = $('petNote');
      var pc = (sheet && sheet.pets && sheet.pets.count) || 0;
      if (pEl) {
        pEl.innerHTML = buildMemberFeed(
          PETS_NOTES, pc, 'pet',
          function (i) { return 'PET ' + (i + 1); }
        );
      }
    }
  }

  function stopTimerFor(key) {
    if (memberTimers[key]) {
      clearTimeout(memberTimers[key].initial);
      clearInterval(memberTimers[key].interval);
      delete memberTimers[key];
    }
  }

  function startTimerFor(key) {
    if (memberTimers[key]) return;  // already running
    var rec = {};
    var period = PERIOD_MIN_MS + Math.floor(Math.random() * PERIOD_SPAN_MS);
    var delay  = Math.floor(Math.random() * INIT_DELAY_MS);
    rec.initial = setTimeout(function () {
      bumpSeed(key);
      rerenderMemberGroup(key);
      rec.interval = setInterval(function () {
        bumpSeed(key);
        rerenderMemberGroup(key);
      }, period);
    }, delay);
    memberTimers[key] = rec;
  }

  // Reconcile running timers with current population. Stops timers for
  // members that are no longer in the house; starts timers for new ones.
  function ensureMemberTimers(sheet) {
    var desired = {};
    activeMemberKeys(sheet).forEach(function (k) { desired[k] = true; });

    // Stop timers for members that no longer exist.
    Object.keys(memberTimers).forEach(function (k) {
      if (!desired[k]) stopTimerFor(k);
    });

    // Start timers for members that don't have one yet.
    Object.keys(desired).forEach(function (k) {
      if (!memberTimers[k]) startTimerFor(k);
    });
  }

  var MOOD_LINES = {
    prologue:
      'The house is newly yours and has not yet decided what kind of house '
      + 'it is going to be. You have a lunch in a paper bag and one pencil '
      + 'in the back pocket of your trousers.',
    early:
      'Things are, by any reasonable measure, going well. The kettle has '
      + 'not been on for anything in particular. The pet, if there is a pet, '
      + 'is off attending to personal business.',
    mid:
      'The household has settled into a rhythm. The money is coming in. The '
      + 'hallway has new flowers in it. You put on your coat at the same '
      + 'minute every morning, and the door makes the same small sound.',
    'late-mid':
      'The light in the hallway is being left on later than it used to be. '
      + 'Somebody \u2014 not you \u2014 has started keeping a list of things '
      + 'on the kitchen counter. The list is short. It is not shown to you.',
    late:
      'The house is very tidy now. Every object is where it belongs. The '
      + 'family stops talking when you come in and resumes when you leave, '
      + 'which you find, on balance, respectful.',
    denied:
      'The house is not currently reachable on foot. A small brown envelope '
      + 'on the factory\u2019s outgoing tray advises that the family has '
      + 'been informed of the new arrangement.'
  };

  // -------------------------------------------------------------------------
  // Render — builds the rap sheet and writes it into the DOM. Never mutates
  // state, never persists.
  // -------------------------------------------------------------------------
  function render() {
    if (!state) return;
    var sheet = (window.House && window.House.getRapSheet) ? window.House.getRapSheet(state) : null;
    if (!sheet) return;

    var std = $('houseStandardView');
    var deniedEl = $('houseDenialView');

    // DENIAL MODE: the land bridge has been commissioned. Replace the
    // whole form with the stamp and letter.
    if (sheet.denied) {
      if (std) std.style.display = 'none';
      if (deniedEl) deniedEl.style.display = '';
      var body = $('denialBody');
      if (body && window.House && window.House.denialNotice) {
        body.textContent = window.House.denialNotice();
      }
      return;
    }

    if (std) std.style.display = '';
    if (deniedEl) deniedEl.style.display = 'none';

    // STANDARD MODE: populate the rap sheet and mood lines.
    var eyebrow = EYEBROWS[sheet.chapter] || EYEBROWS.early;
    var moodLine = MOOD_LINES[sheet.chapter] || MOOD_LINES.early;

    var eyebrowEl = $('houseChapterEyebrow');
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;

    var moodEl = $('houseMoodLine');
    if (moodEl) moodEl.innerHTML = moodLine;

    var sp = $('spouseCount');
    if (sp) sp.textContent = String(sheet.spouse.count);

    var kc = $('kidCount');
    if (kc) kc.textContent = String(sheet.children.count);

    var pc = $('petCount');
    if (pc) pc.textContent = String(sheet.pets.count);

    // Rotating italic notes — per-member feed. Each child and each pet
    // gets its own observation, so a household with two children reads
    // as two distinct lines. A slow timer (NOTE_ROTATE_MS) bumps the
    // seed so the feed visibly changes while the player watches.
    var spouseNoteEl = $('spouseNote');
    if (spouseNoteEl) spouseNoteEl.textContent = pickNoteFor(SPOUSE_NOTES, 'spouse:0');

    var kidCount = (sheet && sheet.children && sheet.children.count) || 0;
    var kidNoteEl = $('kidNote');
    if (kidNoteEl) {
      kidNoteEl.innerHTML = buildMemberFeed(
        CHILDREN_NOTES, kidCount, 'child',
        function (i) { return 'CHILD ' + (i + 1); }
      );
    }

    var petCount = (sheet && sheet.pets && sheet.pets.count) || 0;
    var petNoteEl = $('petNote');
    if (petNoteEl) {
      petNoteEl.innerHTML = buildMemberFeed(
        PETS_NOTES, petCount, 'pet',
        function (i) { return 'PET ' + (i + 1); }
      );
    }

    // After the rap sheet is painted, make sure each active member has its
    // own rotation timer. Pass the current population so members that no
    // longer exist stop ticking and new members start.
    ensureMemberTimers(sheet);

    var cv = $('conditionValue');
    if (cv) cv.textContent = sheet.condition;

    // -----------------------------------------------------------------
    // VITAL SIGNS — populate the security-monitor panel. One row per
    // member from the rap sheet. All values are read-only derivations
    // of the current state; no timers, no intervals, no writes.
    // -----------------------------------------------------------------
    renderVitals(sheet);
  }

  // The panel is rebuilt from scratch on every render. Member counts
  // change rarely (two thresholds total) so there is no benefit to
  // patching rows in place.
  function renderVitals(sheet) {
    var rows = $('vitalRows');
    if (!rows) return;

    // Clear.
    while (rows.firstChild) rows.removeChild(rows.firstChild);

    var members = (sheet && sheet.members) || [];
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var v = m.vitals || {};

      var row = document.createElement('div');
      row.className = 'vital-row';

      var cLabel = document.createElement('div');
      cLabel.className = 'v-label';
      cLabel.textContent = m.display || m.label || '';

      var cHR = document.createElement('div');
      cHR.className = 'v-hr';
      cHR.textContent = (v.hr != null ? v.hr : '--') + ' ' + (v.hrUnit || 'bpm');

      var cTemp = document.createElement('div');
      cTemp.className = 'v-temp';
      cTemp.textContent = (v.temp != null ? v.temp : '--') + (v.tempUnit || '');

      var cSeen = document.createElement('div');
      cSeen.className = 'v-seen';
      cSeen.textContent = v.lastSeen || '--';

      var cMood = document.createElement('div');
      cMood.className = 'v-mood';
      cMood.textContent = (v.mood || '') + ' \u00B7 ' + (v.motion || '');

      row.appendChild(cLabel);
      row.appendChild(cHR);
      row.appendChild(cTemp);
      row.appendChild(cSeen);
      row.appendChild(cMood);

      rows.appendChild(row);
    }

    // Telecommunications rows: phone + internet, with a status dot and
    // a short italic line of prose. Same monitor aesthetic, different
    // grid. Rebuilt from scratch on every render for the same reason
    // the member rows are.
    renderComms(sheet);

    // Wellbeing bar: green >=70, amber 40..69, red <40.
    var wb = (sheet && typeof sheet.wellbeing === 'number') ? sheet.wellbeing : 0;
    var fill  = $('wbFill');
    var value = $('wbValue');
    if (fill) {
      fill.style.width = Math.max(0, Math.min(100, wb)) + '%';
      fill.classList.remove('tier-good', 'tier-mid', 'tier-bad');
      if (wb >= 70)      fill.classList.add('tier-good');
      else if (wb >= 40) fill.classList.add('tier-mid');
      else               fill.classList.add('tier-bad');
    }
    if (value) value.textContent = wb + '%';
  }

  // -------------------------------------------------------------------------
  // Telecommunications rows. Reads sheet.telecoms.{phone,net} and paints
  // them into #commsRows with a coloured status dot and a short italic
  // line of prose. The copy lives in house.js; this function is only
  // responsible for arrangement.
  // -------------------------------------------------------------------------
  function renderComms(sheet) {
    var host = $('commsRows');
    if (!host) return;

    while (host.firstChild) host.removeChild(host.firstChild);

    var tele = sheet && sheet.telecoms;
    if (!tele) return;

    var lines = [tele.phone, tele.net];
    for (var i = 0; i < lines.length; i++) {
      var c = lines[i];
      if (!c) continue;

      var row = document.createElement('div');
      row.className = 'comms-row';

      var label = document.createElement('div');
      label.className = 'c-label';
      label.textContent = c.label || '';

      var status = document.createElement('div');
      // Map status -> CSS tier class.
      var tier = 'c-open';
      if (c.status === 'warn') tier = 'c-warn';
      else if (c.status === 'down') tier = 'c-down';
      status.className = 'c-status ' + tier;

      var dot = document.createElement('span');
      dot.className = 'c-dot';
      status.appendChild(dot);
      status.appendChild(document.createTextNode((c.readout || c.status || '').toUpperCase()));

      var note = document.createElement('div');
      note.className = 'c-note';
      note.textContent = c.note || '';

      row.appendChild(label);
      row.appendChild(status);
      row.appendChild(note);
      host.appendChild(row);
    }
  }

  // -------------------------------------------------------------------------
  // Navigation — all three buttons are passthroughs to the existing
  // pf-open router in background.js. Clicking BEGIN TEXTILE WORK opens
  // the main tracker (popup.html) exactly as the toolbar icon used to.
  // -------------------------------------------------------------------------
  function go(path) {
    // Let the dispatch module tear down its pending timer (and, in
    // future, push any confession line to the message log) BEFORE we
    // hand control off to the background router.
    try {
      if (window.HouseDispatch && typeof window.HouseDispatch.onLeave === 'function') {
        window.HouseDispatch.onLeave();
      }
    } catch (e) { /* ignore */ }

    try {
      chrome.runtime.sendMessage({ type: 'pf-open', path: path });
    } catch (e) {
      // If the router is unavailable for any reason, fall back to a plain
      // navigation in the current tab. This never runs in practice but
      // keeps the window robust on cold start.
      window.location.href = path;
    }
  }

  function wireNav() {
    var toPopup = $('toPopupBtn');
    if (toPopup) toPopup.addEventListener('click', function () { go('popup.html'); });

    var toLoom = $('toLoomBtn');
    if (toLoom) toLoom.addEventListener('click', function () { go('gallery.html'); });

    var toFactory = $('toFactoryBtn');
    if (toFactory) toFactory.addEventListener('click', function () { go('factory.html'); });

    var begin = $('beginWorkBtn');
    if (begin) begin.addEventListener('click', function () { go('popup.html'); });

    var begin2 = $('beginWorkBtn2');
    if (begin2) begin2.addEventListener('click', function () { go('factory.html'); });

  }

  // -------------------------------------------------------------------------
  // Boot — fetch the state once, wire up nav, and subscribe to storage
  // changes so the rap sheet updates in real time if the player is also
  // playing in another window. The subscription is purely a re-read.
  // -------------------------------------------------------------------------
  function boot() {
    wireNav();
    try {
      chrome.storage.local.get(STATE_KEY, function (result) {
        state = (result && result[STATE_KEY]) || {};
        render();
      });
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (!changes[STATE_KEY]) return;
        state = changes[STATE_KEY].newValue || {};
        render();
      });
    } catch (e) {
      // No chrome.storage available (unlikely in production). Render a
      // cold-start rap sheet from an empty state.
      state = {};
      render();
    }

    // Each household member has its own staggered rotation timer,
    // started from render() via ensureMemberTimers(). No global seed
    // bump here — we explicitly want family members to change activity
    // at DIFFERENT times, not all on the same tick.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
