// promise-timer.js — v3.22.90
// 3-minute countdown after clicking YES on surveillance nag.
// Monitors chrome.storage for a focus timer starting.
// If timer starts → success, close window.
// If 3 minutes expire → $300 penalty, close window.
// ?test=1 = preview mode: full UI + timer, no penalty, no auto-close.

(function() {
  'use strict';

  var isTest = window.location.search.indexOf('test=1') !== -1;
  var PROMISE_SECONDS = isTest ? 30 : 180; // 30s in test mode so you can see expiry
  var PENALTY_AMOUNT = 300;
  var remaining = PROMISE_SECONDS;
  var timerEl = document.getElementById('timerDisplay');
  var progressEl = document.getElementById('progressFill');
  var cardEl = document.getElementById('promiseCard');
  var resultEl = document.getElementById('resultMsg');
  var intervalId = null;
  var resolved = false;

  // === TEST MODE: banner + shorter timer + no penalty ===
  if (isTest) {
    var banner = document.createElement('div');
    banner.style.cssText = 'background:#ff9f43;color:#0a0a14;font-family:"Press Start 2P",monospace;font-size:8px;padding:6px 10px;border-radius:6px;margin-bottom:12px;letter-spacing:1px;';
    banner.textContent = 'TEST MODE — NO PENALTY (30s)';
    cardEl.insertBefore(banner, cardEl.firstChild);
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // v3.23.1: Check timer state — pause countdown while running, resolve on completed
  var paused = false;

  function checkTimerState() {
    if (resolved) return;
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        if (resolved) return;
        var state = result.pixelFocusState || {};
        if (state.timerState === 'completed') {
          success();
        } else if (state.timerState === 'running') {
          pauseCountdown();
        } else if (paused) {
          resumeCountdown();
        }
      });
    } catch(_) {}
  }

  function pauseCountdown() {
    if (paused || resolved) return;
    paused = true;
    clearInterval(intervalId);
    intervalId = null;
    timerEl.textContent = 'FOCUSING...';
    timerEl.style.fontSize = '20px';
    timerEl.classList.remove('urgent');
    cardEl.classList.remove('urgent');
    var titleEl = document.querySelector('.promise-title');
    if (titleEl) titleEl.textContent = 'TIMER RUNNING';
    var textEl = document.querySelector('.promise-text');
    if (textEl) textEl.innerHTML = 'Complete the session to cancel the penalty.<br>Pausing or resetting resumes the countdown.';
    // v3.23.7: Minimize — get out of the way while focusing
    try {
      chrome.tabs.getCurrent(function(tab) {
        if (tab && tab.windowId) {
          chrome.windows.update(tab.windowId, { state: 'minimized' });
        }
      });
    } catch(_) {}
  }

  function resumeCountdown() {
    if (!paused || resolved) return;
    paused = false;
    timerEl.style.fontSize = '';
    timerEl.textContent = fmt(remaining);
    var titleEl = document.querySelector('.promise-title');
    if (titleEl) { titleEl.textContent = 'PROMISE TIMER'; titleEl.style.color = '#00ff88'; }
    intervalId = setInterval(tick, 1000);
    // v3.23.7: Restore + focus — user paused/reset, penalty countdown resumes
    try {
      chrome.tabs.getCurrent(function(tab) {
        if (tab && tab.windowId) {
          chrome.windows.update(tab.windowId, { state: 'normal', focused: true });
        }
      });
    } catch(_) {}
  }

  function success() {
    if (resolved) return;
    resolved = true;
    clearInterval(intervalId);
    intervalId = null;

    if (!isTest) {
      try { chrome.runtime.sendMessage({ type: 'PROMISE_TIMER_RESOLVED' }); } catch(_) {}
    } else {
      try { chrome.storage.local.get('pixelFocusState', function(r) {
        var s = r.pixelFocusState || {}; s.penaltyCountdownActive = false;
        chrome.storage.local.set({ pixelFocusState: s });
      }); } catch(_) {}
    }

    cardEl.className = 'promise-card success';
    timerEl.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    try { document.querySelector('.promise-text').style.display = 'none'; } catch(_) {}
    try { document.querySelector('.penalty-warn').style.display = 'none'; } catch(_) {}
    document.querySelector('.promise-title').textContent = 'SESSION COMPLETE';
    document.querySelector('.promise-title').style.color = '#ffd700';
    resultEl.className = 'result-msg success';
    resultEl.style.display = 'block';
    resultEl.innerHTML = 'Penalty cancelled. Well done.<br><br>' +
      '<span style="font-size:8px;color:#5a5a7e;">Closing in 3 seconds...</span>';
    setTimeout(function() { killTab(); }, 3000);
  }

  function expire() {
    if (resolved) return;
    resolved = true;
    clearInterval(intervalId);
    intervalId = null;

    // v3.22.91: Penalty is now applied by background.js (single source of truth).
    // The window just shows the UI — background handles the actual deduction
    // whether this window is open or closed. Tell background this expired from
    // inside the window (it already knows via alarm, but belt-and-suspenders).
    if (!isTest) {
      try {
        chrome.runtime.sendMessage({ type: 'PROMISE_TIMER_EXPIRED' });
      } catch(_) {}
    } else {
      try { chrome.storage.local.get('pixelFocusState', function(r) {
        var s = r.pixelFocusState || {}; s.penaltyCountdownActive = false;
        chrome.storage.local.set({ pixelFocusState: s });
      }); } catch(_) {}
    }
    cardEl.className = 'promise-card penalty';
    timerEl.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.querySelector('.promise-text').style.display = 'none';
    document.querySelector('.penalty-warn').style.display = 'none';
    document.querySelector('.promise-title').textContent = 'PROMISE BROKEN';
    document.querySelector('.promise-title').style.color = '#ff4466';
    resultEl.className = 'result-msg penalty';
    resultEl.style.display = 'block';
    resultEl.innerHTML = '-$' + PENALTY_AMOUNT + ' PENALTY<br><br>' +
      '<span style="font-size:9px;color:#ff8888;">You said YES and didn\'t follow through.</span><br><br>' +
      '<span style="font-size:8px;color:#5a5a7e;">Closing in 5 seconds...</span>';
    setTimeout(function() { killTab(); }, 5000);
  }

  // Kill the tab/window via chrome.tabs API so it can't be
  // recovered with Ctrl+Shift+T.
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

  function tick() {
    remaining--;
    if (remaining <= 0) {
      remaining = 0;
      expire();
      return;
    }
    timerEl.textContent = fmt(remaining);
    progressEl.style.width = ((remaining / PROMISE_SECONDS) * 100) + '%';

    // Urgency at 30 seconds
    if (remaining <= 30) {
      timerEl.classList.add('urgent');
      progressEl.classList.add('urgent');
      cardEl.classList.add('urgent');
    }

    // Check timer every 3 seconds
    if (remaining % 3 === 0) {
      checkTimerState();
    }
  }

  // Listen for storage changes (instant detection)
  try {
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (resolved) return;
      if (area !== 'local' || !changes.pixelFocusState) return;
      var newState = changes.pixelFocusState.newValue || {};
      if (newState.timerState === 'completed') {
        success();
      } else if (newState.timerState === 'running') {
        pauseCountdown();
      } else if (paused && (newState.timerState === 'idle' || newState.timerState === 'paused')) {
        resumeCountdown();
      }
    });
  } catch(_) {}

  // v3.22.90: Keep window on top by re-focusing when it loses focus.
  // v3.23.7: Skip re-focus when paused (minimized while user is focusing).
  try {
    window.addEventListener('blur', function() {
      if (resolved || paused) return;
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

  // Start
  timerEl.textContent = fmt(remaining);
  intervalId = setInterval(tick, 1000);

  // Initial check
  checkTimerState();
})();
