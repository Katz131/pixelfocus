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
    'Looking through the mail.'
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
    'Washing their hands.'
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
    'Sitting in a cardboard box.'
  ];

  // Session-stable rotation seed. Set once at module load and read on
  // every render. Reopening the window yields a new seed; re-rendering
  // an already-open window (because chrome.storage fired) keeps the
  // same one, so the notes don't flicker while the player watches them.
  var NOTE_SEED = Math.floor(Math.random() * 20);

  function pickNote(pool, offset) {
    if (!pool || pool.length === 0) return '';
    var idx = ((NOTE_SEED + (offset || 0)) % pool.length + pool.length) % pool.length;
    return pool[idx];
  }

  var MOOD_LINES = {
    prologue:
      'The house is newly yours and has not yet decided what kind of house '
      + 'it is going to be. You have a lunch in a paper bag and one pencil '
      + 'in the back pocket of your trousers.',
    early:
      'Things are, by any reasonable measure, going well. The kettle has '
      + 'not been on for anything in particular. The cat, if there is a cat, '
      + 'is washing itself.',
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

    // Rotating italic notes — session-stable. Each row gets a different
    // offset so two siblings never pick the same index by accident.
    var spouseNoteEl = $('spouseNote');
    if (spouseNoteEl) spouseNoteEl.textContent = pickNote(SPOUSE_NOTES, 0);

    var kidNoteEl = $('kidNote');
    if (kidNoteEl) kidNoteEl.textContent = pickNote(CHILDREN_NOTES, 7);

    var petNoteEl = $('petNote');
    if (petNoteEl) petNoteEl.textContent = pickNote(PETS_NOTES, 13);

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
