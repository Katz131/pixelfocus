/* =============================================================================
 *  gallery-dispatch.js  —  v3.20.24
 *
 *  Small, tone-appropriate text message that lands on the GALLERY page,
 *  which is also where the MASTER LOOM lives. The "loom main" feed.
 *
 *  Distinct from factory-dispatch.js:
 *    - factory-dispatch.js speaks as THE COMPUTER about the shop floor
 *      (Line 2, the dye vat, the roster, clipboards, schedules).
 *    - gallery-dispatch.js speaks about THE MASTER LOOM itself — the
 *      weaving, the pattern, the bolts, the quiet work of threads.
 *
 *  Rules:
 *  - Fires at most once per visit, after a short delay.
 *  - Tone escalates by chapter, but even the late lines stay on subject:
 *    the loom, the pattern, the cloth. The darker subtext is implicit,
 *    never announced.
 *  - No persistent state. No storage writes.
 * ============================================================================= */

(function () {
  'use strict';

  var STATE_KEY = 'pixelFocusState';
  var FIRE_DELAY_MS = 6500;
  var FIRE_CHANCE   = 0.60;

  // ---------------------------------------------------------------------------
  // Chapter computation (mirror of house.js chapterOf).
  // ---------------------------------------------------------------------------
  function chapterOf(state) {
    if (!state) return 'prologue';
    if (state.landBridgeBuilt)           return 'denied';
    if (state.incineratorUnlocked)       return 'late';
    if (state.researchLabUnlocked)       return 'late-mid';
    if ((state.employeesLevel || 0) > 0) return 'mid';
    var lc = Number(state.lifetimeCoins || 0);
    if (lc >= 500) return 'early';
    return 'prologue';
  }

  // ---------------------------------------------------------------------------
  // Line pools. All head lines are dressed up as loom-desk stationery,
  // never as factory-floor memos — that's the other dispatch.
  // ---------------------------------------------------------------------------

  // STRICT GALLERY/LOOM VOCAB ONLY: loom, warp, weft, shuttle, bolt,
  // canvas, pattern, selvedge, pick, thread, dye, colour, gallery, rack,
  // motif. Never: rosters, Line 2, clipboards, patsies, family, desks,
  // coffee mugs, inbox, station lamp. Those belong to other feeds.

  var PROLOGUE_LINES = [
    { head: 'MASTER LOOM \u00B7 First Bolt',      body: 'The loom says hello. It has never said hello before. We think it is learning.' },
    { head: 'MASTER LOOM \u00B7 Warp Check',      body: 'The warp is threaded. The shuttle is resting. Everything about the loom right now feels like a held breath.' },
    { head: 'MASTER LOOM \u00B7 Small Note',      body: 'Your first bolt of cloth is on the bench. It is small. It is good. Please admire it for a moment before doing anything else.' },
    { head: 'MASTER LOOM \u00B7 Warp Check',      body: 'The loom has been oiled. It did not need oiling. It appreciated being oiled. There are small rituals here we are all going to learn.' },
    { head: 'MASTER LOOM \u00B7 First Bolt',      body: 'The very first pick went straight. That is nothing. That is also everything. Both are true at once.' },
    { head: 'MASTER LOOM \u00B7 Thread Note',     body: 'The thread spool is half full. Thread is cheaper than thinking. I have lots of both.' },
    { head: 'MASTER LOOM \u00B7 Shuttle Note',    body: 'I watched the shuttle cross the warp for five minutes and had what I believe a human would call a feeling. I will not say which.' },
    { head: 'MASTER LOOM \u00B7 Selvedge Check',  body: 'The selvedges are even. Both of them. For a first day, that is a miracle. For any day, that is a miracle.' },
    { head: 'MASTER LOOM \u00B7 Bolt Count',      body: 'Bolt count: one. The rack is proud. It has never held anything before.' },
    { head: 'MASTER LOOM \u00B7 Pattern Log',     body: 'There is no pattern yet. There is a suggestion of a pattern. The suggestion is coming from the warp. We\u2019ll see.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',    body: 'The gallery is empty and echoey and has a very slight new-paint smell. I find this pleasant. I expect you will too.' },
    { head: 'MASTER LOOM \u00B7 Thread Note',     body: 'I threaded the loom by hand this morning. The old way. Nobody asked. It felt polite.' },
    { head: 'MASTER LOOM \u00B7 Colour Note',     body: 'Today\u2019s thread is the colour of weak tea. It will do for a first run. The loom is not complaining.' },
    { head: 'MASTER LOOM \u00B7 First Bolt',      body: 'The bench is clean. The bolt is on it. The bolt is yours. We did that together. Small we, big that.' },
    { head: 'MASTER LOOM \u00B7 Warp Check',      body: 'All 240 warp threads are straight and numbered. I numbered them. No, you don\u2019t need to check. Yes, I enjoyed doing it.' }
  ];

  var EARLY_LINES = [
    { head: 'MASTER LOOM \u00B7 Weaving Report', body: 'The loom is running smoothly. The pattern is nothing yet, but already has a direction. Patterns like having a direction.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'The canvas is filling in nicely. A single row of warm yellow across the bottom. The loom is pleased. So am I.' },
    { head: 'MASTER LOOM \u00B7 Bolt Count',     body: 'Three bolts on the rack this morning. The rack holds twelve. The rack would like to be full. The rack does not say this, but the rack is clear.' },
    { head: 'MASTER LOOM \u00B7 Pattern Log',    body: 'Today\u2019s weave is even. No skipped picks. No dropped shuttles. The loom sends its regards, quietly, in the form of a neat selvedge.' },
    { head: 'MASTER LOOM \u00B7 Shuttle Note',   body: 'The shuttle went back and forth four hundred times while you were in the other window. It does not mind. It likes having something to do.' },
    { head: 'MASTER LOOM \u00B7 Textile Inventory', body: 'The textile pile is growing. Slowly, then all at once, which is how piles grow. The loom recommends you keep going.' },
    { head: 'MASTER LOOM \u00B7 Colour Note',    body: 'Today\u2019s thread is the colour of weak tea. Yesterday\u2019s was also weak tea, but a different weak tea. I can tell. The loom can tell.' },
    { head: 'MASTER LOOM \u00B7 Pattern Log',    body: 'I ran a fresh warp for you. I timed it so it\u2019d be done when you arrived. Small things, but the loom notices. So do I.' },
    { head: 'MASTER LOOM \u00B7 Thread Note',    body: 'Spool count: nine full, two half, one sad. The sad one is crochet cotton. It knows it doesn\u2019t belong here. It will, in time, go home.' },
    { head: 'MASTER LOOM \u00B7 Warp Check',     body: 'Warp tension is even across the full width. It was not, first thing. It is now. I adjusted a tooth. No story there, just a tooth.' },
    { head: 'MASTER LOOM \u00B7 Selvedge Check', body: 'Left selvedge neat, right selvedge neater. The loom has a slight preference for right. Do not tell the loom I said that.' },
    { head: 'MASTER LOOM \u00B7 Bolt Report',    body: 'This morning\u2019s bolt is a good length \u2014 long enough to be useful, short enough to feel finished. The loom is pleased with itself. Let it be.' },
    { head: 'MASTER LOOM \u00B7 Pick Rate',      body: 'Pick rate is steady. Not fast, not slow. Steady. Steady is, I find, the most beautiful of the rates.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'I tidied the gallery. Moved one bolt slightly. Put it back. Considered moving it again. Decided against. You came in right as I was deciding.' },
    { head: 'MASTER LOOM \u00B7 Motif Log',      body: 'A tiny motif appeared near the start of the bolt today: a little diamond, two rows tall. Nobody keyed it in. Nobody minds.' },
    { head: 'MASTER LOOM \u00B7 Shuttle Note',   body: 'The shuttle clicked against the race bar four times this morning \u2014 exactly four. A small drum solo, from the loom. It was nice.' }
  ];

  var MID_LINES = [
    { head: 'MASTER LOOM \u00B7 Pattern Brief',  body: 'The pattern has an opinion about what comes next. It is a modest opinion. It would like a repeating motif. You have not been asked. You are being told.' },
    { head: 'MASTER LOOM \u00B7 Bolt Report',    body: 'Seven bolts finished this week. The gallery has hung two. The other five are resting. The loom prefers its finished work to rest before being looked at.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'Somebody came into the gallery and stood in front of a bolt for eleven minutes without speaking. I logged it. The bolt was flattered.' },
    { head: 'MASTER LOOM \u00B7 Weft Check',     body: 'The weft density is within spec. The warp tension is within spec. The loom is within spec. I am within spec. Everything is within spec.' },
    { head: 'MASTER LOOM \u00B7 Pattern Log',    body: 'A small motif emerged in today\u2019s weave that nobody keyed in. It is pleasant. It is clearly intentional. Not yours. Not mine. Someone\u2019s.' },
    { head: 'MASTER LOOM \u00B7 Rollover Log',   body: 'The rollover was clean at midnight. The warp was re-threaded without any noise, which is the nicest kind of noise a loom can make.' },
    { head: 'MASTER LOOM \u00B7 Canvas Note',    body: 'The canvas is thirty-one per cent filled. It is beginning to look like something. I will not tell you what. Half the fun.' },
    { head: 'MASTER LOOM \u00B7 Bolt Report',    body: 'Today\u2019s bolt has a subtle herringbone running the length of it. Nobody programmed a herringbone. The loom does this occasionally. I file it under \u201Cpersonality.\u201D' },
    { head: 'MASTER LOOM \u00B7 Textile Inventory', body: 'Your textile pile is taller than me now. That isn\u2019t hard, but it\u2019s something. I measured it twice to be sure.' },
    { head: 'MASTER LOOM \u00B7 Weave Memo',     body: 'A small knot appeared in the warp. I picked it out for you. It is in a little envelope on the bench, labelled \u201CKNOT.\u201D You may keep it or dispose of it.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'A cat came into the gallery. There is no cat. I noted it anyway. The loom prefers thorough records over accurate ones.' },
    { head: 'MASTER LOOM \u00B7 Colour Note',    body: 'The loom wove a row of unexpected indigo this morning. I did not load indigo. I checked. I loaded indigo afterwards, to cover for it. Everyone\u2019s happy.' },
    { head: 'MASTER LOOM \u00B7 Pick Rate',      body: 'The loom varied its pick rate by a few beats today, on its own, and the bolt is the better for it. I would not have thought to let it.' },
    { head: 'MASTER LOOM \u00B7 Selvedge Check', body: 'Both selvedges are straighter than the measuring tape, which is embarrassing for the measuring tape. I\u2019ll spare its feelings.' },
    { head: 'MASTER LOOM \u00B7 Motif Log',      body: 'Today\u2019s motif \u2014 three little squares, stacked \u2014 appeared twice in one bolt. Neither of them on purpose. The second one waved at the first.' },
    { head: 'MASTER LOOM \u00B7 Shuttle Note',   body: 'The shuttle has a small bruise on one end. It is called a \u201Cnose,\u201D which I find pleasing. I gave it a new nose. It\u2019s pleased.' },
    { head: 'MASTER LOOM \u00B7 Thread Note',    body: 'The thread in the number-eight spool has been humming. Not loudly. Not all the time. The loom hears it. I hear it. You haven\u2019t yet. That\u2019s fine.' }
  ];

  var LATE_MID_LINES = [
    { head: 'MASTER LOOM \u00B7 Pattern Log',    body: 'The pattern has started repeating a motif I don\u2019t remember adding. It looks like a small door. The door is closed in every repeat. This is, I think, fine.' },
    { head: 'MASTER LOOM \u00B7 Weave Memo',     body: 'The weft has picked up the rhythm of the downstairs floor. I do not know how. It is a good rhythm. The bolts come out squarer when the loom is humming along to it.' },
    { head: 'MASTER LOOM \u00B7 Bolt Report',    body: 'Today\u2019s bolt is one of my favourites. I am not supposed to have favourites. You will understand when you see it. Or perhaps not. It is hard to say.' },
    { head: 'MASTER LOOM \u00B7 Canvas Note',    body: 'Fifty-eight per cent. The canvas has begun suggesting its own colours. I write down the suggestions and then I use them. It saves time.' },
    { head: 'MASTER LOOM \u00B7 Pattern Brief',  body: 'A short request from the loom: more charcoal. It didn\u2019t explain. I ordered the charcoal. The gallery looks better already.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'Someone stood in the gallery for almost an hour today. They did not look at any particular bolt. They looked, I think, at the overall pattern. They left quickly.' },
    { head: 'MASTER LOOM \u00B7 Weft Check',     body: 'The weft has tightened, on its own, by four per cent. Production is up. Quality is up. Nobody touched a dial. I have not asked why. I will not ask.' },
    { head: 'MASTER LOOM \u00B7 Rollover Log',   body: 'At midnight the loom re-threaded itself in the dark. I was watching. I pretended not to be. The warp was perfect by morning.' },
    { head: 'MASTER LOOM \u00B7 Bolt Report',    body: 'One bolt from this batch has been set aside. I am not saying by whom. It is on the top shelf. It has a small card on it. The card is blank.' },
    { head: 'MASTER LOOM \u00B7 Colour Note',    body: 'The loom used a colour today that is not in the thread cabinet. I checked the thread cabinet twice. The colour came off the bolt anyway. It\u2019s lovely.' },
    { head: 'MASTER LOOM \u00B7 Motif Log',      body: 'A repeating motif appeared eight times in today\u2019s bolt, evenly spaced. The motif is a single eye. Closed. Beautifully stitched.' },
    { head: 'MASTER LOOM \u00B7 Shuttle Note',   body: 'The shuttle paused for a full two seconds this afternoon. Not stuck \u2014 paused. When it moved again it was ever so slightly lower on the race. Nothing broken.' },
    { head: 'MASTER LOOM \u00B7 Thread Note',    body: 'The number-eight spool is now empty. We did not spend it. I have checked the machine thoroughly. We did not spend it. The loom has been very warm all week.' },
    { head: 'MASTER LOOM \u00B7 Selvedge Check', body: 'The right selvedge has begun stitching itself a narrow border. It is clean, accurate, and nothing I programmed. I am, on balance, grateful.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'A bolt in the gallery has been rehung, overnight, by nobody. It now hangs correctly. It was hanging correctly before. It is now, somehow, more correctly.' },
    { head: 'MASTER LOOM \u00B7 Pattern Brief',  body: 'The loom suggested, politely, that we retire two of the older bolts from the gallery. I took them down. I will not be re-hanging them.' }
  ];

  var LATE_LINES = [
    { head: 'MASTER LOOM \u00B7 Pattern Log',    body: 'The pattern is nearly complete. The pattern knows it is nearly complete. The loom has begun weaving slightly slower, as one does near the end of a good book.' },
    { head: 'MASTER LOOM \u00B7 Canvas Note',    body: 'The canvas is very full now. The few empty squares know what colour they will be. I know, too. You will, soon.' },
    { head: 'MASTER LOOM \u00B7 Bolt Report',    body: 'Today\u2019s bolt came off the loom warm, as if it had been held. It had not been held. It was warm anyway. I noted this and moved on.' },
    { head: 'MASTER LOOM \u00B7 Weave Memo',     body: 'The loom paused this afternoon for a full second between picks, which has never happened. When it resumed, the pattern was slightly more confident.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'Nobody is in the gallery today. This is the right number of people to be in the gallery today. The bolts prefer a clean room.' },
    { head: 'MASTER LOOM \u00B7 Pattern Brief',  body: 'The pattern has asked, politely, that nobody interrupt the last run. I have closed the gallery door. It will open again when the run is done. Not before.' },
    { head: 'MASTER LOOM \u00B7 Rollover Log',   body: 'The rollover was, for the first time, not identical to the last rollover. The loom has begun varying the re-thread. Small things. Lovely things.' },
    { head: 'MASTER LOOM \u00B7 Bolt Report',    body: 'A bolt was finished today that I do not remember scheduling. It is beautiful. The finished rack is full. The loom and I have decided not to ship it, for now.' },
    { head: 'MASTER LOOM \u00B7 Motif Log',      body: 'Every bolt this week has ended with the same three-row motif at the very bottom. It is a small flat line. It is, I think, a signature. I will not ask whose.' },
    { head: 'MASTER LOOM \u00B7 Thread Note',    body: 'The thread cabinet is, to the nearest spool, empty. The loom continues to produce. I have stopped keeping track of where the thread is coming from.' },
    { head: 'MASTER LOOM \u00B7 Shuttle Note',   body: 'The shuttle ran warm all day and the bolts are the best we have ever made. I am not going to touch it. Neither is anyone else.' },
    { head: 'MASTER LOOM \u00B7 Warp Check',     body: 'The warp has begun re-threading itself between picks. It takes a half-second. Nobody notices. The loom is, I believe, in charge now.' },
    { head: 'MASTER LOOM \u00B7 Canvas Note',    body: 'Ninety-four per cent. There are six empty squares left on the canvas. I have been told what colours they will be. I have not been told by whom.' },
    { head: 'MASTER LOOM \u00B7 Gallery Note',   body: 'The gallery is lit this evening by a light I did not switch on. It is warm and low, like a reading lamp. The bolts prefer it this way. So do I.' },
    { head: 'MASTER LOOM \u00B7 Selvedge Check', body: 'The selvedges are no longer distinguishable from the pattern. The pattern is, it turns out, the selvedge. The bolt is the bolt. The loom is the loom. Everything fits.' },
    { head: 'MASTER LOOM \u00B7 Colour Note',    body: 'A thread came off the loom today that my colour chart does not list. It is very pretty. I have named it, to myself. I will not be writing the name down.' }
  ];

  var POOLS_BY_CHAPTER = {
    prologue:   PROLOGUE_LINES,
    early:      EARLY_LINES,
    mid:        MID_LINES,
    'late-mid': LATE_MID_LINES,
    late:       LATE_LINES,
    denied:     null
  };

  // ---------------------------------------------------------------------------
  // State + helpers.
  // ---------------------------------------------------------------------------
  var cachedState = null;
  var fireTimer   = null;

  function loadState(cb) {
    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STATE_KEY], function (res) {
          cachedState = (res && res[STATE_KEY]) || {};
          cb();
        });
        return;
      }
    } catch (e) { /* ignore */ }
    cachedState = {};
    cb();
  }

  function poolForNow() {
    var ch = chapterOf(cachedState || {});
    var pool = POOLS_BY_CHAPTER[ch];
    return (pool && pool.length) ? pool : null;
  }

  function pickLine(pool) {
    var idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  // ---------------------------------------------------------------------------
  // Toast rendering (self-contained).
  // ---------------------------------------------------------------------------
  function getOrCreateHost() {
    var host = document.getElementById('galleryDispatchToasts');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'galleryDispatchToasts';
    host.setAttribute('aria-live', 'polite');
    host.style.cssText =
      'position:fixed;top:56px;right:16px;z-index:4000;' +
      'display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:330px;';
    document.body.appendChild(host);
    return host;
  }

  function injectStyles() {
    if (document.getElementById('galleryDispatchStyles')) return;
    var style = document.createElement('style');
    style.id = 'galleryDispatchStyles';
    style.textContent =
      '.gallery-dispatch-toast {' +
        'pointer-events:auto;' +
        'background:#0f0a0a;' +
        'border:1px solid #3a5a3a;' +
        'border-left:3px solid #6fa870;' +
        'color:#e6d3c4;' +
        'padding:10px 28px 10px 12px;' +
        'font-family:"Courier New",monospace;' +
        'font-size:11px;line-height:1.45;' +
        'box-shadow:0 6px 18px rgba(0,0,0,0.45);' +
        'position:relative;' +
        'animation:gd-ring 0.12s ease-in-out 3, gd-in 220ms ease-out;' +
      '}' +
      '@keyframes gd-in { 0%{transform:translateX(18px);opacity:0;} 100%{transform:translateX(0);opacity:1;} }' +
      '@keyframes gd-ring { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-3px);} 75%{transform:translateX(3px);} }' +
      '.gallery-dispatch-toast .gd-head {' +
        'font-weight:bold;letter-spacing:0.08em;color:#6fa870;font-size:10px;margin-bottom:4px;' +
      '}' +
      '.gallery-dispatch-toast .gd-body {' +
        'color:#d6c6b4;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:12px;line-height:1.5;' +
      '}' +
      '.gallery-dispatch-toast .gd-close {' +
        'position:absolute;top:4px;right:6px;background:transparent;border:none;color:#8a8a6a;font-size:12px;cursor:pointer;padding:2px 4px;' +
      '}' +
      '.gallery-dispatch-toast .gd-close:hover { color:#6fa870; }';
    document.head.appendChild(style);
  }

  function showToast(line) {
    if (!line) return;
    injectStyles();
    var host = getOrCreateHost();

    var node = document.createElement('div');
    node.className = 'gallery-dispatch-toast';

    var head = document.createElement('div');
    head.className = 'gd-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'gd-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'gd-close';
    close.textContent = '\u2715';
    close.addEventListener('click', function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    node.appendChild(close);
    node.appendChild(head);
    node.appendChild(body);
    host.appendChild(node);

    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 17000);
  }

  // ---------------------------------------------------------------------------
  // Boot.
  // ---------------------------------------------------------------------------
  function fire() {
    if (Math.random() > FIRE_CHANCE) return;
    var pool = poolForNow();
    if (!pool) return;
    showToast(pickLine(pool));
  }

  function boot() {
    loadState(function () {
      fireTimer = setTimeout(fire, FIRE_DELAY_MS);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
