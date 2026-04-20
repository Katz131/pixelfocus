// penalty-timer.js — v3.22.93
// 3-minute countdown triggered on 3rd consecutive NO/close on surveillance nag.
// NOT a promise — they refused. Start a focus timer to cancel, or lose $300.
// Penalty enforced by background.js even if window is closed.
// ?test=1 = preview mode: 30s countdown, no penalty.

(function() {
  'use strict';

  var isTest = window.location.search.indexOf('test=1') !== -1;
  var PENALTY_SECONDS = isTest ? 30 : 180;
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

  // Check if a focus timer is now running
  function checkTimerStarted() {
    if (resolved) return;
    try {
      chrome.storage.local.get('pixelFocusState', function(result) {
        if (resolved) return;
        var state = result.pixelFocusState || {};
        var running = state.timerState === 'running' || state.timerState === 'countdown';
        if (running) {
          success();
        }
      });
    } catch(_) {}
  }

  function success() {
    if (resolved) return;
    resolved = true;
    clearInterval(intervalId);
    intervalId = null;

    // Tell background to cancel the penalty
    if (!isTest) {
      try { chrome.runtime.sendMessage({ type: 'PENALTY_TIMER_RESOLVED' }); } catch(_) {}
    }

    cardEl.className = 'penalty-card success';
    timerEl.style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('penaltyText').style.display = 'none';
    document.querySelector('.penalty-amount').style.display = 'none';
    document.querySelector('.escape-hint').style.display = 'none';
    document.getElementById('penaltyTitle').textContent = 'PENALTY CANCELLED';
    document.getElementById('penaltyTitle').style.color = '#ffd700';
    resultEl.className = 'result-msg success';
    resultEl.style.display = 'block';
    resultEl.innerHTML = 'Timer started. You\'re off the hook.<br><br>' +
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
      checkTimerStarted();
    }
  }

  // Listen for storage changes (instant detection of focus timer start)
  try {
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (resolved) return;
      if (area !== 'local' || !changes.pixelFocusState) return;
      var newState = changes.pixelFocusState.newValue || {};
      if (newState.timerState === 'running' || newState.timerState === 'countdown') {
        success();
      }
    });
  } catch(_) {}

  // Keep window on top
  try {
    window.addEventListener('blur', function() {
      if (resolved) return;
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

  // Initial check — maybe they already started a timer
  checkTimerStarted();
})();
