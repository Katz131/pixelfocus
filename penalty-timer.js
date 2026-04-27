// penalty-timer.js — v3.22.93
// 3-minute countdown triggered on 3rd consecutive NO/close on surveillance nag.
// NOT a promise — they refused. Start a focus timer to cancel, or lose $300.
// Penalty enforced by background.js even if window is closed.
// ?test=1 = preview mode: 30s countdown, no penalty.

(function() {
  'use strict';

  var isTest = window.location.search.indexOf('test=1') !== -1;
  var _remainParam = (window.location.search.match(/remain=(\d+)/) || [])[1];
  var PENALTY_SECONDS = isTest ? 30 : (_remainParam ? parseInt(_remainParam, 10) : 180);
  var PENALTY_AMOUNT = 300;
  var remaining = PENALTY_SECONDS;
  var timerEl = document.getElementById('timerDisplay');
  var progressEl = document.getElementById('progressFill');
  var cardEl = document.getElementById('penaltyCard');
  var resultEl = document.getElementById('resultMsg');
  var intervalId = null;
  var resolved = false;

  // === TEST MODE: banner + shorter timer ===
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
    document.getElementById('penaltyTitle').textContent = 'TIMER RUNNING';
    document.getElementById('penaltyTitle').style.color = '#ffd700';
    document.getElementById('penaltyText').innerHTML = 'Complete the session to cancel the penalty.<br>Pausing or resetting resumes the countdown.';
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
    document.getElementById('penaltyTitle').textContent = 'PENALTY INCOMING';
    document.getElementById('penaltyTitle').style.color = '#ff4466';
    document.getElementById('penaltyText').innerHTML = 'You said <em>NO</em> three times. That\'s your limit.<br>Start a focus timer before this runs out or lose the money.';
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
      try { chrome.runtime.sendMessage({ type: 'PENALTY_TIMER_RESOLVED' }); } catch(_) {}
    } else {
      try { chrome.storage.local.get('pixelFocusState', function(r) {
        var s = r.pixelFocusState || {}; s.penaltyCountdownActive = false;
        chrome.storage.local.set({ pixelFocusState: s });
      }); } catch(_) {}
    }

    cardEl.className = 'penalty-card success';
    timerEl.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('penaltyText').style.display = 'none';
    document.querySelector('.penalty-amount').style.display = 'none';
    document.querySelector('.escape-hint').style.display = 'none';
    document.getElementById('penaltyTitle').textContent = 'SESSION COMPLETE';
    document.getElementById('penaltyTitle').style.color = '#ffd700';
    resultEl.className = 'result-msg success';
    resultEl.style.display = 'block';
    resultEl.innerHTML = 'Penalty cancelled. You\'re off the hook.<br><br>' +
      '<span style="font-size:8px;color:#5a5a7e;">Closing in 3 seconds...</span>';
    setTimeout(function() { killTab(); }, 3000);
  }

  function expire() {
    if (resolved) return;
    resolved = true;
    clearInterval(intervalId);
    intervalId = null;

    // Tell background the timer expired (it handles the actual penalty)
    if (!isTest) {
      try { chrome.runtime.sendMessage({ type: 'PENALTY_TIMER_EXPIRED' }); } catch(_) {}
    } else {
      try { chrome.storage.local.get('pixelFocusState', function(r) {
        var s = r.pixelFocusState || {}; s.penaltyCountdownActive = false;
        chrome.storage.local.set({ pixelFocusState: s });
      }); } catch(_) {}
    }

    cardEl.className = 'penalty-card applied';
    timerEl.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('penaltyText').style.display = 'none';
    document.querySelector('.escape-hint').style.display = 'none';
    document.getElementById('penaltyTitle').textContent = 'PENALTY APPLIED';
    document.getElementById('penaltyTitle').style.color = '#ff2244';
    resultEl.className = 'result-msg applied';
    resultEl.style.display = 'block';
    resultEl.innerHTML = '-$' + PENALTY_AMOUNT + '<br><br>' +
      '<span style="font-size:9px;color:#ff8888;">Three strikes. You had 3 minutes.</span><br><br>' +
      '<span style="font-size:8px;color:#5a5a7e;">Closing in 5 seconds...</span>';
    setTimeout(function() { killTab(); }, 5000);
  }

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
    progressEl.style.width = ((remaining / PENALTY_SECONDS) * 100) + '%';

    if (remaining <= 30) {
      timerEl.classList.add('urgent');
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

  // Keep window on top
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
