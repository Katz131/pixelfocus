// surveillance-nag-window.js — v3.22.40
// Rotating confrontational messages. YES/NO tracking. No rewards. Just accountability.
// ?test=1 = preview mode: inert buttons, no counting, has close button.

(function() {
  var isTest = window.location.search.indexOf('test=1') !== -1;

  var messages = [
    'Every minute you waste right now is a minute <span class="em">stolen from the version of you that worked so hard to get here.</span><br><br>You didn\'t build this foundation overnight. It took months. Years. Discipline you didn\'t think you had. And now you\'re letting it erode — not in some dramatic collapse, but in the quiet, incremental way that\'s almost worse.<br><br><span class="dim">Drip. Drip. Drip.</span>',

    'This isn\'t a bicycle. <span class="em">You can\'t just "pick it back up."</span><br><br>Skills atrophy. Momentum dies. The neural pathways you carved through repetition are already starting to fill back in with sand. Every idle hour makes the next start harder, the next session longer, the next breakthrough further away.<br><br><span class="dim">You know this. You\'ve felt it before.</span>',

    'You fought for every inch of progress you\'ve made. <span class="em">Do you remember what it cost?</span><br><br>The early mornings. The sessions where you wanted to quit at minute 3. The days you showed up anyway. All of that compound interest — the habits, the skills, the identity you built — requires <span class="em">maintenance.</span><br><br><span class="dim">Right now, you\'re not maintaining. You\'re withdrawing.</span>',

    'The dangerous part isn\'t that you stopped. <span class="em">It\'s that stopping feels fine.</span><br><br>That\'s how erosion works. You don\'t feel the cliff crumbling under your feet until you\'re already falling. The comfort you feel right now is the anesthetic. The numbness before the drop.<br><br><span class="dim">Start the timer. Feel something real.</span>',

    'Nobody is coming to save you from this moment. <span class="em">There is no rescue team for wasted potential.</span><br><br>The version of you that\'s watching right now — the one who knows better — is getting quieter every minute you ignore it. Eventually it stops talking altogether.<br><br><span class="dim">You\'ve heard the silence before. You know where it leads.</span>',

    'Every garden needs tending. <span class="em">Yours is growing weeds right now.</span><br><br>You planted something real. Something that took patience and showed up slow, one session at a time. But a garden you stop watering doesn\'t pause — it deteriorates. The weeds don\'t wait for you to feel motivated.<br><br><span class="dim">Neither should you.</span>',

    'You are not "taking a break." <span class="em">You are practicing quitting.</span><br><br>Every time you sit here instead of starting, you\'re training your brain that this is acceptable. That the default state is inaction. That the timer is optional. Repetition builds habits in both directions.<br><br><span class="dim">Which habit are you building right now?</span>',

    'The gap between who you are and who you want to be <span class="em">is measured in sessions you didn\'t start.</span><br><br>Not the big dramatic failures. Not the terrible days. The gap is made of moments exactly like this one — where nothing was wrong, nothing was stopping you, and you just... didn\'t.<br><br><span class="dim">That\'s the most expensive kind of waste.</span>',

    'Imagine explaining this moment to yourself six months from now. <span class="em">"I had the time. I had the tools. I just didn\'t feel like it."</span><br><br>Future you is watching. Future you is the one who pays for what you do right now. And future you can\'t come back here to fix it.<br><br><span class="dim">But present you can still start the timer.</span>',

    'The foundation you built is not a storage unit. <span class="em">You can\'t lock it up and expect it to be there when you come back.</span><br><br>It\'s alive. It\'s breathing. It needs you to show up — not perfectly, not heroically, just <span class="em">consistently.</span> Ten minutes. That\'s all it takes to keep the lights on.<br><br><span class="dim">Ten minutes. Start.</span>'
  ];

  var msgEl = document.getElementById('nagMessage');
  var elapsedEl = document.getElementById('elapsedTime');
  var dotsEl = document.getElementById('cycleDots');
  var ackBtn = document.getElementById('ackBtn');
  var ackGate = document.getElementById('ackGate');
  var questionGate = document.getElementById('questionGate');
  var yesBtn = document.getElementById('yesBtn');
  var noBtn = document.getElementById('noBtn');
  var scoreEl = document.getElementById('scoreDisplay');
  var currentIndex = Math.floor(Math.random() * messages.length);

  // === TEST MODE: show banner + close button, skip I KNOW gate ===
  if (isTest) {
    // Add test banner at top of card
    var card = document.querySelector('.nag-card');
    var banner = document.createElement('div');
    banner.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:#ff9f43;background:rgba(255,159,67,0.1);border:1px solid rgba(255,159,67,0.3);border-radius:6px;padding:8px;margin-bottom:12px;letter-spacing:1px;';
    banner.textContent = 'TEST PREVIEW — buttons are inert';
    card.insertBefore(banner, card.firstChild);

    // Add (X) close button top right of card
    card.style.position = 'relative';
    var closeX = document.createElement('div');
    closeX.textContent = '\u00D7';
    closeX.style.cssText = 'position:absolute;top:10px;right:14px;font-size:22px;color:#5a5a7e;cursor:pointer;line-height:1;z-index:10;';
    closeX.addEventListener('click', function() {
      try { window.close(); } catch(_) {}
    });
    closeX.addEventListener('mouseover', function() { closeX.style.color = '#e0e0e0'; });
    closeX.addEventListener('mouseout', function() { closeX.style.color = '#5a5a7e'; });
    card.insertBefore(closeX, card.firstChild);

    // Still require I KNOW gate in test mode
    ackBtn.addEventListener('click', function() {
      ackGate.style.display = 'none';
      questionGate.style.display = 'block';
    });

    // Make YES/NO inert in test mode
    yesBtn.addEventListener('click', function() {
      yesBtn.textContent = '(test)';
      setTimeout(function() { yesBtn.textContent = 'YES'; }, 1500);
    });
    noBtn.addEventListener('click', function() {
      noBtn.textContent = '(test)';
      setTimeout(function() { noBtn.textContent = 'NO'; }, 1500);
    });

    // Show current real score (read-only)
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        var state = result.pixelFocusState;
        if (!state) { scoreEl.innerHTML = 'No responses yet.'; return; }
        var yes = state.surveillanceYesCount || 0;
        var no = state.surveillanceNoCount || 0;
        var total = yes + no;
        if (total === 0) {
          scoreEl.innerHTML = 'No responses yet.';
        } else {
          var pct = Math.round((yes / total) * 100);
          scoreEl.innerHTML = '<span class="yes-count">' + yes + ' YES</span> / <span class="no-count">' + no + ' NO</span> — ' + pct + '% follow-through';
        }
      });
    } catch(_) { scoreEl.innerHTML = ''; }

  } else {
    // === REAL MODE ===

    // "I KNOW" acknowledgment gate — must click before YES/NO appears
    ackBtn.addEventListener('click', function() {
      ackGate.style.display = 'none';
      questionGate.style.display = 'block';
      updateScore();
    });

    // YES — record it, close the tab (they're going to set a timer)
    yesBtn.addEventListener('click', function() {
      try {
        chrome.storage.local.get('pixelFocusState', function(result) {
          var state = result.pixelFocusState || {};
          state.surveillanceYesCount = (state.surveillanceYesCount || 0) + 1;
          chrome.storage.local.set({ pixelFocusState: state }, function() {
            try { window.close(); } catch(_) {}
            yesBtn.textContent = 'GO.';
            yesBtn.style.opacity = '0.5';
            noBtn.style.display = 'none';
          });
        });
      } catch(_) {
        try { window.close(); } catch(_) {}
      }
    });

    // NO — record it, shame them, keep the window open
    noBtn.addEventListener('click', function() {
      try {
        chrome.storage.local.get('pixelFocusState', function(result) {
          var state = result.pixelFocusState || {};
          state.surveillanceNoCount = (state.surveillanceNoCount || 0) + 1;
          chrome.storage.local.set({ pixelFocusState: state }, function() {
            updateScore();
            var shameMessages = [
              'Noted. This window stays open.',
              'That\'s another NO on your record.',
              'You turned this on yourself. Think about why.',
              'The timer is right there. It takes 3 seconds.',
              'Every NO makes the next YES harder.',
              'Your record is watching.',
              'Still here. Still waiting.'
            ];
            var shame = shameMessages[Math.floor(Math.random() * shameMessages.length)];
            var questionEl = document.querySelector('.nag-question');
            if (questionEl) {
              questionEl.innerHTML = '<span style="color:#ff6b6b;">' + shame + '</span>';
              setTimeout(function() {
                questionEl.innerHTML = 'Are you going to set a timer<br>right now or not?';
              }, 5000);
            }
          });
        });
      } catch(_) {}
    });
  }

  // === SHARED: message rotation, elapsed time, score display ===

  // Build dots
  for (var i = 0; i < messages.length; i++) {
    var dot = document.createElement('div');
    dot.className = 'dot' + (i === currentIndex ? ' active' : '');
    dotsEl.appendChild(dot);
  }

  function showMessage(idx) {
    msgEl.style.opacity = '0';
    setTimeout(function() {
      msgEl.innerHTML = messages[idx];
      msgEl.style.opacity = '1';
      var dots = dotsEl.querySelectorAll('.dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].className = i === idx ? 'dot active' : 'dot';
      }
    }, 400);
  }

  showMessage(currentIndex);

  // Rotate every 20 seconds
  setInterval(function() {
    currentIndex = (currentIndex + 1) % messages.length;
    showMessage(currentIndex);
  }, 20000);

  // Show how long since last focus session
  function updateElapsed() {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        var state = result.pixelFocusState;
        if (!state) { elapsedEl.textContent = '??'; return; }
        var lastSession = state.lastStartedSessionAt || state.lastCompletedSessionAt || 0;
        if (!lastSession) { elapsedEl.textContent = 'no sessions today'; return; }
        var diff = Date.now() - lastSession;
        var mins = Math.floor(diff / 60000);
        if (mins < 60) {
          elapsedEl.textContent = mins + ' min';
        } else {
          var h = Math.floor(mins / 60);
          var m = mins % 60;
          elapsedEl.textContent = h + 'h ' + m + 'm';
        }
      });
    } catch(_) {
      elapsedEl.textContent = '??';
    }
  }

  updateElapsed();
  setInterval(updateElapsed, 30000);

  // Load and display score (used by real mode)
  function updateScore() {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        var state = result.pixelFocusState;
        if (!state) return;
        var yes = state.surveillanceYesCount || 0;
        var no = state.surveillanceNoCount || 0;
        var total = yes + no;
        if (total === 0) {
          scoreEl.innerHTML = 'No responses yet.';
        } else {
          var pct = Math.round((yes / total) * 100);
          scoreEl.innerHTML = '<span class="yes-count">' + yes + ' YES</span> / <span class="no-count">' + no + ' NO</span> — ' + pct + '% follow-through';
        }
      });
    } catch(_) {}
  }
})();
