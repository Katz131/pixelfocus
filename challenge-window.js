(function() {
  'use strict';

  // ?test=1 = preview mode: buttons show UI but don't grant rewards.
  // ?promise=1 = auto-accept, skip straight to promise timer phase.
  var isTest = window.location.search.indexOf('test=1') !== -1;
  var autoPromise = window.location.search.indexOf('promise=1') !== -1;

  // v3.22.89: Guard against manual navigation — only allow if the system
  // actually offered a challenge in the last 5 minutes. Skipped in test mode.
  if (!isTest) {
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        var s = result.pixelFocusState || {};
        var offered = s.challengeOfferedAt || 0;
        if (!offered || (Date.now() - offered) > 5 * 60 * 1000) {
          // Not a legitimate challenge — redirect to to-do list
          try { chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' }); } catch(_) {}
          setTimeout(function() {
            try { chrome.tabs.getCurrent(function(t) { if (t) chrome.tabs.remove(t.id); }); } catch(_) {}
            try { window.close(); } catch(_) {}
          }, 200);
        }
      });
    } catch(_) {}
  }

  var CHALLENGE_SECONDS = 180; // 3 minutes
  var remaining = CHALLENGE_SECONDS;
  var timerEl = document.getElementById('timerDisplay');
  var progressEl = document.getElementById('progressFill');
  var cardEl = document.getElementById('challengeCard');
  var acceptBtn = document.getElementById('acceptBtn');
  var declineBtn = document.getElementById('declineBtn');
  var resultEl = document.getElementById('resultMsg');
  var buttonRow = document.getElementById('buttonRow');
  var intervalId = null;
  var decided = false;

  // === TEST MODE: banner + inert buttons ===
  if (isTest) {
    var banner = document.createElement('div');
    banner.style.cssText = 'background:#ff9f43;color:#0a0a14;font-family:"Press Start 2P",monospace;font-size:8px;padding:6px 10px;border-radius:6px;margin-bottom:12px;letter-spacing:1px;';
    banner.textContent = 'TEST MODE — NO REWARDS';
    cardEl.insertBefore(banner, cardEl.firstChild);
    // Add close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'CLOSE PREVIEW';
    closeBtn.style.cssText = 'background:none;border:1px solid #5a5a7e;color:#5a5a7e;font-family:"Press Start 2P",monospace;font-size:7px;padding:6px 12px;border-radius:6px;cursor:pointer;margin-top:12px;';
    closeBtn.addEventListener('click', function() { killTab(); });
    buttonRow.appendChild(closeBtn);
  }

  cardEl.classList.add('ticking');

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function tick() {
    remaining--;
    if (remaining <= 0) {
      remaining = 0;
      clearInterval(intervalId);
      intervalId = null;
      if (!decided) expire();
    }
    timerEl.textContent = fmt(remaining);
    progressEl.style.width = ((remaining / CHALLENGE_SECONDS) * 100) + '%';
    if (remaining <= 30) {
      timerEl.classList.add('urgent');
    }
  }

  function setChallenge(active) {
    if (isTest) return; // test mode — no state changes
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      state.challengeActive = active;
      state.challengeAcceptedAt = active ? Date.now() : 0;
      state.challengeSessionPaused = false;
      state.challengeOfferedAt = 0; // v3.22.89: clear so page can't be reused
      chrome.storage.local.set({ pixelFocusState: state });
    });
  }

  // =========================================================================
  // v3.23.0: ACCEPT → morphs into promise timer IN THIS WINDOW.
  // No second window needed. Background tracks this window for penalty.
  // =========================================================================
  var PROMISE_SECONDS = isTest ? 30 : 180;
  var promiseRemaining = PROMISE_SECONDS;
  var promiseResolved = false;
  var promiseIntervalId = null;

  function promiseFmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function checkTimerStarted() {
    if (promiseResolved) return;
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        if (promiseResolved) return;
        var s = result.pixelFocusState || {};
        if (s.timerState === 'running' || s.timerState === 'countdown') {
          promiseSuccess();
        }
      });
    } catch(_) {}
  }

  function promiseSuccess() {
    if (promiseResolved) return;
    promiseResolved = true;
    clearInterval(promiseIntervalId);
    promiseIntervalId = null;

    if (!isTest) {
      try { chrome.runtime.sendMessage({ type: 'PROMISE_TIMER_RESOLVED' }); } catch(_) {}
    }

    // Transform to success state
    cardEl.style.borderColor = '#ffd700';
    cardEl.style.boxShadow = '0 0 50px rgba(255,215,0,0.35)';
    cardEl.style.animation = 'none';
    document.title = 'Penalty Cancelled!';
    timerEl.style.display = 'none';
    document.querySelector('.timer-label').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    resultEl.className = 'result-msg accepted';
    resultEl.style.display = 'block';
    resultEl.innerHTML = '&#10003; TIMER STARTED — PENALTY CANCELLED<br><br>'
      + '<span style="font-size:9px;color:#e0e0e0;font-family:\'Courier New\',monospace;">'
      + '1.5x rewards active. No pausing. Go get it.</span><br><br>'
      + '<span style="font-size:8px;color:#5a5a7e;">Closing in 3 seconds...</span>';
    setTimeout(function() { killTab(); }, 3000);
  }

  function promiseExpire() {
    if (promiseResolved) return;
    promiseResolved = true;
    clearInterval(promiseIntervalId);
    promiseIntervalId = null;

    if (!isTest) {
      try { chrome.runtime.sendMessage({ type: 'PROMISE_TIMER_EXPIRED' }); } catch(_) {}
    }

    cardEl.style.borderColor = '#ff2244';
    cardEl.style.boxShadow = '0 0 50px rgba(255,34,68,0.5)';
    cardEl.style.animation = 'none';
    document.title = 'Penalty Applied';
    timerEl.style.display = 'none';
    document.querySelector('.timer-label').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    resultEl.className = 'result-msg expired';
    resultEl.style.display = 'block';
    resultEl.innerHTML = '-$300<br><br>'
      + '<span style="font-size:9px;color:#ff8888;">You accepted the challenge but didn\'t start a timer.</span><br><br>'
      + '<span style="font-size:8px;color:#5a5a7e;">Closing in 5 seconds...</span>';
    setTimeout(function() { killTab(); }, 5000);
  }

  function promiseTick() {
    promiseRemaining--;
    if (promiseRemaining <= 0) {
      promiseRemaining = 0;
      promiseExpire();
      return;
    }
    timerEl.textContent = promiseFmt(promiseRemaining);
    progressEl.style.width = ((promiseRemaining / PROMISE_SECONDS) * 100) + '%';
    if (promiseRemaining <= 30) {
      timerEl.classList.add('urgent');
      cardEl.classList.add('urgent');
    }
    if (promiseRemaining % 3 === 0) {
      checkTimerStarted();
    }
  }

  function accept() {
    if (decided) return;
    decided = true;
    clearInterval(intervalId);
    intervalId = null;
    setChallenge(true);

    // === MORPH INTO PROMISE TIMER ===
    // Change card appearance
    cardEl.classList.remove('ticking');
    cardEl.style.borderColor = '#00ff88';
    cardEl.style.boxShadow = '0 0 40px rgba(0,255,136,0.25)';
    cardEl.style.animation = 'pulse 2s ease-in-out infinite';

    // Update icon and title
    document.querySelector('.challenge-icon').textContent = '\u23F0'; // alarm clock
    document.querySelector('.challenge-title').textContent = 'PROMISE TIMER';
    document.querySelector('.challenge-title').style.color = '#00ff88';
    document.title = 'Promise Timer — Start a Focus Session';

    // Reset and repurpose timer display
    timerEl.textContent = promiseFmt(PROMISE_SECONDS);
    timerEl.style.display = '';
    timerEl.style.color = '#00ff88';
    timerEl.style.textShadow = '0 0 15px rgba(0,255,136,0.4)';
    timerEl.classList.remove('urgent');
    var labelEl = document.querySelector('.timer-label');
    labelEl.textContent = 'START A FOCUS TIMER BEFORE TIME RUNS OUT';
    labelEl.style.display = '';

    // Reset progress bar
    progressEl.style.width = '100%';
    progressEl.style.background = 'linear-gradient(90deg, #00ff88, #4ecdc4)';
    document.querySelector('.progress-bar').style.display = '';

    // Replace explanation with promise text
    var explEl = document.getElementById('explanationText');
    explEl.style.display = '';
    explEl.style.background = 'rgba(0,255,136,0.06)';
    explEl.style.borderColor = 'rgba(0,255,136,0.15)';
    explEl.innerHTML = '<span class="highlight" style="color:#00ff88;">Challenge accepted — 1.5x rewards locked in.</span><br><br>'
      + 'Now <span class="gold">start a focus timer</span> within ' + (isTest ? '30 seconds' : '3 minutes') + ' or lose <span style="color:#ff4466;font-weight:bold;">$300</span>.<br><br>'
      + '<span style="font-size:10px;color:#5a5a7e;font-style:italic;">Closing this window won\'t save you — the penalty still applies.</span>';

    // Hide buttons
    buttonRow.style.display = 'none';

    // Add test banner if in test mode
    if (isTest) {
      var testNote = document.createElement('div');
      testNote.style.cssText = 'background:#ff9f43;color:#0a0a14;font-family:"Press Start 2P",monospace;font-size:8px;padding:6px 10px;border-radius:6px;margin-top:12px;letter-spacing:1px;';
      testNote.textContent = 'TEST MODE — NO PENALTY (30s)';
      cardEl.appendChild(testNote);
    }

    // Notify background to track this window for penalty enforcement
    if (!isTest) {
      try {
        chrome.tabs.getCurrent(function(tab) {
          if (tab && tab.windowId) {
            chrome.runtime.sendMessage({ type: 'TRACK_PROMISE_TIMER', windowId: tab.windowId });
          }
        });
      } catch(_) {}
    }

    // Listen for focus timer start via storage changes (instant detection)
    try {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (promiseResolved) return;
        if (area !== 'local' || !changes.pixelFocusState) return;
        var ns = changes.pixelFocusState.newValue || {};
        if (ns.timerState === 'running' || ns.timerState === 'countdown') {
          promiseSuccess();
        }
      });
    } catch(_) {}

    // Start promise countdown
    promiseIntervalId = setInterval(promiseTick, 1000);

    // Initial check — maybe they already started
    checkTimerStarted();
  }

  function decline() {
    if (decided) return;
    decided = true;
    clearInterval(intervalId);
    intervalId = null;
    cardEl.classList.remove('ticking');
    cardEl.style.borderColor = '#2a2a4a';
    cardEl.style.boxShadow = 'none';
    timerEl.style.display = 'none';
    document.querySelector('.timer-label').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('explanationText').style.display = 'none';
    buttonRow.style.display = 'none';
    resultEl.className = 'result-msg declined';
    resultEl.style.display = 'block';
    resultEl.innerHTML = 'Challenge declined.<br><br>'
      + '<span style="font-size:8px;color:#5a5a7e;">No penalty. This window will close in 3 seconds...</span>';
    setChallenge(false);
    setTimeout(function() { killTab(); }, 3000);
  }

  function expire() {
    if (decided) return;
    decided = true;
    cardEl.classList.remove('ticking');
    cardEl.style.borderColor = '#ff6b6b';
    timerEl.style.display = 'none';
    document.querySelector('.timer-label').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('explanationText').style.display = 'none';
    buttonRow.style.display = 'none';
    resultEl.className = 'result-msg expired';
    resultEl.style.display = 'block';
    resultEl.innerHTML = 'Time\'s up. Challenge expired.<br><br>'
      + '<span style="font-size:8px;color:#5a5a7e;">This window will close in 3 seconds...</span>';
    setChallenge(false);
    setTimeout(function() { killTab(); }, 3000);
  }

  // Kill the tab via chrome.tabs API so it's removed from history
  // and can't be recovered with Ctrl+Shift+T.
  function killTab() {
    try {
      chrome.tabs.getCurrent(function(tab) {
        if (tab && tab.id) {
          chrome.tabs.remove(tab.id);
        } else {
          window.close();
        }
      });
    } catch(_) {
      try { window.close(); } catch(_) {}
    }
  }

  acceptBtn.addEventListener('click', accept);
  declineBtn.addEventListener('click', decline);

  // v3.22.90: Keep window on top by re-focusing when it loses focus.
  // v3.23.0: Also stays on top during promise timer phase (promiseResolved check).
  try {
    window.addEventListener('blur', function() {
      if (decided && promiseResolved) return; // both phases done
      setTimeout(function() {
        try {
          chrome.tabs.getCurrent(function(tab) {
            if (tab && tab.windowId) {
              chrome.windows.update(tab.windowId, { focused: true });
            }
          });
        } catch(_) {}
      }, 200);
    });
  } catch(_) {}

  // v3.23.0: ?promise=1 → skip challenge phase, go straight to promise timer
  if (autoPromise) {
    // Brief flash of the challenge card then auto-accept
    setTimeout(function() { accept(); }, 300);
  } else {
    // Start the 3-minute challenge countdown
    intervalId = setInterval(tick, 1000);
  }
})();
