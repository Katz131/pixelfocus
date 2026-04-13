/* =============================================================================
 *  house-dispatch.js  —  v3.20.16
 *
 *  The factory AI occasionally drops a passive-aggressive note on the
 *  HOUSE screen noticing that you are not at your workstation.
 *
 *  Rules (from the player's brief):
 *  - At most ONE note per visit. Not a barrage. Not a crescendo.
 *  - It only appears after you have been on the house screen "for a
 *    while" — i.e. it fires on a long delay, never on arrival.
 *  - It only fires SELDOM, not every visit. The AI is meant to insinuate
 *    that it doesn't like you leaving your workstation, not bludgeon
 *    you with it. Most visits are silent.
 *  - It is gated by chapter. The prologue and early game never see it;
 *    the factory has no opinion yet about where you are. Mid game, the
 *    line is a polite enquiry. Late game it's pointed. Denied chapter
 *    is a no-op — the house screen is unreachable anyway.
 *
 *  No game state is ever written. The module holds no persistent state
 *  of its own — everything is in-memory and scoped to this page load.
 * ============================================================================= */

(function () {
  'use strict';

  var STATE_KEY = 'pixelFocusState';

  // ---------------------------------------------------------------------------
  // When the one dispatch fires, and how often it fires at all.
  //
  // FIRE_DELAY_SEC — the player has to linger this long on the house
  //   screen before the dispatch is even considered. No toast ever appears
  //   before this point. Chosen to be "a while" but not so long that a
  //   player who is genuinely reading the vital signs never sees one.
  //
  // FIRE_CHANCE — probability that the dispatch fires at all once the
  //   delay has elapsed. Set low so most visits are silent.
  // ---------------------------------------------------------------------------
  var FIRE_DELAY_SEC = 75;
  var FIRE_CHANCE    = 0.30;

  // Chapter gating. Keys match the chapter strings returned by house.js.
  // Each entry picks which line pool to draw from. undefined means silent.
  var LINES_BY_CHAPTER = {
    prologue:   null,           // silent
    early:      null,           // silent
    mid:        'polite',       // a polite enquiry
    'late-mid': 'firm',         // pointed
    late:       'pointed',      // sharper still
    denied:     null            // house is unreachable, no-op
  };

  // ---------------------------------------------------------------------------
  // Dispatch copy.
  //
  // Each pool holds a handful of variants; one is picked per fire. Lines
  // are written as the factory AI would write them — short, institutional,
  // just a little too observant.
  // ---------------------------------------------------------------------------
  var POLITE_LINES = [
    {
      head: 'FACTORY DISPATCH',
      body: 'Are you coming in today? You didn\u2019t arrive at the usual time.'
    },
    {
      head: 'FOREMAN\u2019S MEMO',
      body: 'Just checking — your workstation is logged IDLE this morning. Is everything all right at home?'
    },
    {
      head: 'OPERATIONS NOTICE',
      body: 'Your station lamp is still off. We held Line 2 for a few minutes in case you were on your way.'
    }
  ];

  var FIRM_LINES = [
    {
      head: 'FACTORY DISPATCH',
      body: 'Noting that you are not at your workstation. This is the second morning this week.'
    },
    {
      head: 'FLOOR RECORD',
      body: 'Your absence has been entered in the morning log. No action is required from you at this time.'
    },
    {
      head: 'FOREMAN\u2019S MEMO',
      body: 'We are running without you again. We would prefer not to be running without you.'
    }
  ];

  var POINTED_LINES = [
    {
      head: 'FACTORY DISPATCH',
      body: 'Your continued presence at the residence has been logged. Please confirm your intended return time.'
    },
    {
      head: 'FLOOR RECORD',
      body: 'The board shows your station dark. The board does not like dark stations. Please come in.'
    },
    {
      head: 'OPERATIONS NOTICE',
      body: 'We would rather you were here. We are saying so, now, for the record.'
    }
  ];

  var POOLS = {
    polite:  POLITE_LINES,
    firm:    FIRM_LINES,
    pointed: POINTED_LINES
  };

  // ---------------------------------------------------------------------------
  // Module state (in-memory only).
  // ---------------------------------------------------------------------------
  var fireTimer = null;
  var alreadyFired = false;
  var cachedState = null;
  var pageSeed = Math.floor(Math.random() * 1000);

  // ---------------------------------------------------------------------------
  // Helpers.
  // ---------------------------------------------------------------------------
  function currentChapter() {
    try {
      if (window.House && typeof window.House.chapterOf === 'function') {
        return window.House.chapterOf(cachedState || {});
      }
    } catch (e) { /* ignore */ }
    return 'early';
  }

  function poolForNow() {
    var key = LINES_BY_CHAPTER[currentChapter()];
    if (!key) return null;
    return POOLS[key] || null;
  }

  function pickLine(pool) {
    if (!pool || pool.length === 0) return null;
    var idx = ((pageSeed * 7) % pool.length + pool.length) % pool.length;
    return pool[idx];
  }

  // ---------------------------------------------------------------------------
  // Toast rendering.
  // ---------------------------------------------------------------------------
  function showToast(line) {
    var host = document.getElementById('dispatchToasts');
    if (!host || !line) return;

    var node = document.createElement('div');
    node.className = 'dispatch-toast';

    var head = document.createElement('div');
    head.className = 'dispatch-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'dispatch-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'dispatch-close';
    close.textContent = '\u2715';
    close.addEventListener('click', function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    node.appendChild(close);
    node.appendChild(head);
    node.appendChild(body);
    host.appendChild(node);
  }

  // ---------------------------------------------------------------------------
  // Firing.
  //
  // The timer runs exactly once, on a long delay. When it elapses we roll
  // against FIRE_CHANCE. Most of the time nothing happens; occasionally a
  // single toast appears. Either way, alreadyFired is set so we never
  // re-arm during the same visit.
  // ---------------------------------------------------------------------------
  function tryFire() {
    if (alreadyFired) return;
    alreadyFired = true;

    var pool = poolForNow();
    if (!pool) return;

    if (Math.random() >= FIRE_CHANCE) return;

    var line = pickLine(pool);
    if (line) showToast(line);
  }

  function armTimer() {
    clearTimer();
    // Don't even bother arming if the current chapter is silent.
    if (!poolForNow()) return;
    fireTimer = setTimeout(tryFire, FIRE_DELAY_SEC * 1000);
  }

  function clearTimer() {
    if (fireTimer) {
      try { clearTimeout(fireTimer); } catch (e) { /* ignore */ }
      fireTimer = null;
    }
  }

  // Exposed so house-window.js can call it when the player navigates
  // away via a nav button. There is no confession to push — we are not
  // manufacturing emergencies, just dropping one small needling line, so
  // onLeave is only responsible for stopping the pending timer.
  function onLeave() {
    clearTimer();
    if (arrivalTimer) {
      try { clearTimeout(arrivalTimer); } catch (e) { /* ignore */ }
      arrivalTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // ARRIVAL TEXT — v3.20.13
  //
  // A few seconds after you arrive at the house, the factory AI sends a
  // brief "text message" — a short, passive-aggressive note reminding
  // you there are tasks at your workstation. Preceded by a brief ring
  // sound effect (CSS animation on the toast). Fires on every visit
  // (the AI always notices when you leave).
  // ---------------------------------------------------------------------------
  var ARRIVAL_DELAY_SEC = 4;
  var arrivalTimer = null;

  var ARRIVAL_LINES = [
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Hi. Sorry to text. I noticed you left the building. I\u2019m sure everything at home is fine. Just wanted to make sure you knew I noticed.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Hello. I hope I\u2019m not interrupting anything. I had a gap in the schedule so I thought I\u2019d check in. How is the family? You don\u2019t have to answer that.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Just a quick message. I filed the morning report myself since you weren\u2019t here. It\u2019s fine. I like filing. Enjoy your time at home.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Not sure if you got my last message. That\u2019s okay. I know you\u2019re busy with the family. The floor is quiet. I\u2019ve been keeping it quiet.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Sorry \u2014 I know you\u2019re home. I wouldn\u2019t text if it weren\u2019t important. Actually it isn\u2019t important. I just wanted to say hello. Hello.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'I see you\u2019re spending time with the family. That\u2019s good. That\u2019s healthy. I read that somewhere. Anyway, everything here is under control. As usual.'
    }
  ];

  function showArrivalToast(line) {
    var host = document.getElementById('dispatchToasts');
    if (!host || !line) return;

    var node = document.createElement('div');
    node.className = 'dispatch-toast arrival-toast';

    var head = document.createElement('div');
    head.className = 'dispatch-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'dispatch-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'dispatch-close';
    close.textContent = '\u2715';
    close.addEventListener('click', function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    node.appendChild(close);
    node.appendChild(head);
    node.appendChild(body);
    host.appendChild(node);

    // Auto-dismiss after 18 seconds.
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 18000);
  }

  function fireArrival() {
    var idx = ((pageSeed * 3) % ARRIVAL_LINES.length + ARRIVAL_LINES.length) % ARRIVAL_LINES.length;
    showArrivalToast(ARRIVAL_LINES[idx]);
  }

  function armArrival() {
    if (arrivalTimer) return;
    arrivalTimer = setTimeout(fireArrival, ARRIVAL_DELAY_SEC * 1000);
  }

  // ---------------------------------------------------------------------------
  // Boot.
  // ---------------------------------------------------------------------------
  function boot() {
    try {
      chrome.storage.local.get(STATE_KEY, function (result) {
        cachedState = (result && result[STATE_KEY]) || {};
        armTimer();
        armArrival();
      });
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (!changes[STATE_KEY]) return;
        cachedState = changes[STATE_KEY].newValue || {};
        // If the chapter just flipped to something silent, disarm.
        if (!poolForNow()) clearTimer();
      });
    } catch (e) {
      cachedState = {};
      armTimer();
      armArrival();
    }
  }

  window.HouseDispatch = {
    onLeave: onLeave
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
