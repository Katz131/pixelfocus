// =============================================================================
// !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!!
// =============================================================================
// PixelFocus is a SEPARATE WINDOW (full browser tab) — NOT a Chrome extension
// popup. The toolbar action MUST have NO default_popup in manifest.json so that
// chrome.action.onClicked fires here. The handler opens popup.html in a new
// browser tab via chrome.tabs.create().
//
// DO NOT EVER:
//   - add "default_popup" to manifest.json's action block
//   - use chrome.action.setPopup
//   - assume popup.html / gallery.html / factory.html run in popup chrome
//
// All three windows (popup.html main / gallery.html loom / factory.html factory)
// are full-tab windows, opened with dedup logic so a second click focuses the
// existing tab instead of opening a duplicate.
// =============================================================================

// PixelFocus Background Service Worker

// v3.23.35: Open surveillance nag as a popup window that re-focuses every 5s
var _nagWindowId = null;
function openNagPopup(htmlPath) {
  var url = chrome.runtime.getURL(htmlPath);
  console.log('[NagPopup] Opening:', url);
  // Close any existing nag window first
  if (_nagWindowId) {
    try { chrome.windows.remove(_nagWindowId, function() {}); } catch(_) {}
    _nagWindowId = null;
  }
  try {
    chrome.windows.create({
      url: url, type: 'popup', width: 480, height: 720, focused: true
    }, function(win) {
      if (chrome.runtime.lastError) {
        console.warn('[NagPopup] windows.create error:', chrome.runtime.lastError.message);
        // Fallback: open as tab
        openPixelFocusWindow(htmlPath);
        return;
      }
      if (win && win.id) {
        _nagWindowId = win.id;
        console.log('[NagPopup] Created window', win.id);
        // Re-focus every 5s so it stays on top
        var _refId = setInterval(function() {
          if (!_nagWindowId) { clearInterval(_refId); return; }
          try {
            chrome.windows.get(_nagWindowId, function(w) {
              if (chrome.runtime.lastError || !w) { _nagWindowId = null; clearInterval(_refId); return; }
              chrome.windows.update(_nagWindowId, { focused: true });
            });
          } catch(_) { clearInterval(_refId); }
        }, 5000);
      } else {
        console.warn('[NagPopup] No window returned, falling back to tab');
        openPixelFocusWindow(htmlPath);
      }
    });
  } catch(e) {
    console.warn('[NagPopup] Exception:', e);
    openPixelFocusWindow(htmlPath);
  }
}

// v3.23.72: Format time as HH:MM for blocked time alerts
function _fmtT(d) {
  return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

function openPixelFocusWindow(htmlPath) {
  var url = chrome.runtime.getURL(htmlPath);
  chrome.tabs.query({}, function(tabs) {
    var existing = tabs.find(function(t) {
      return t.url && t.url.indexOf(url) === 0;
    });
    if (existing) {
      chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId != null) {
        chrome.windows.update(existing.windowId, { focused: true });
      }
    } else {
      chrome.tabs.create({ url: url });
    }
  });
}

// v3.20.3 — The toolbar icon opens the to-do list (popup.html) again.
// The House window still exists and is reachable via its nav buttons from
// the factory, loom, and ratiocinatory, but it is no longer the wakeup
// screen. This is a pure routing change; saved state is not touched.
chrome.action.onClicked.addListener(function() {
  openPixelFocusWindow('popup.html');
});

// =============================================================================
// v3.22.91: Promise Timer — background-enforced $300 penalty
// =============================================================================
// The penalty must fire even if the user closes the promise timer window.
// background.js tracks the window, listens for close + alarm, and checks
// whether a focus timer was started. If not → $300 penalty + notification.
var _promiseTimerWindowId = null;
var _promiseTimerResolved = false;
var _promiseTimerStartedAt = 0; // epoch ms when promise timer was opened
var PROMISE_PENALTY = 300;

// v3.22.93: Penalty timer — separate from promise timer.
// Triggered by 3rd consecutive NO/close on surveillance nag.
var _penaltyTimerWindowId = null;
var _penaltyTimerResolved = false;
var _penaltyTimerStartedAt = 0;
var PENALTY_TIMER_PENALTY = 300;

// v3.23.12: Setter helpers — update in-memory var + sync to storage in one call.
// Use these instead of direct assignment to avoid forgetting to sync.
function _setPromiseTimer(windowId, resolved, startedAt) {
  if (windowId !== undefined) _promiseTimerWindowId = windowId;
  if (resolved !== undefined) _promiseTimerResolved = resolved;
  if (startedAt !== undefined) _promiseTimerStartedAt = startedAt;
  _syncPenaltyTracking();
}
function _setPenaltyTimer(windowId, resolved, startedAt) {
  if (windowId !== undefined) _penaltyTimerWindowId = windowId;
  if (resolved !== undefined) _penaltyTimerResolved = resolved;
  if (startedAt !== undefined) _penaltyTimerStartedAt = startedAt;
  _syncPenaltyTracking();
}

// Persist penalty tracking state so it survives service worker restarts.
function _syncPenaltyTracking() {
  try {
    chrome.storage.local.set({
      pixelPenaltyTracking: {
        promiseWindowId: _promiseTimerWindowId,
        promiseResolved: _promiseTimerResolved,
        promiseStartedAt: _promiseTimerStartedAt,
        penaltyWindowId: _penaltyTimerWindowId,
        penaltyResolved: _penaltyTimerResolved,
        penaltyStartedAt: _penaltyTimerStartedAt
      }
    });
  } catch(_) {}
}

// v3.23.35: SAFETY — never write pixelFocusState unless it has real data.
function _safeSaveState(stateObj) {
  if (!stateObj || typeof stateObj !== 'object') return;
  if (!stateObj.profileId && !stateObj.xp && (!stateObj.tasks || Object.keys(stateObj.tasks).length <= 1)) {
    console.warn('[BG-Safety] BLOCKED write of empty/wiped state to pixelFocusState.');
    return;
  }
  chrome.storage.local.set({ pixelFocusState: stateObj });
}

// Restore on startup (service worker wake)
try {
  chrome.storage.local.get('pixelPenaltyTracking', function(result) {
    var t = result.pixelPenaltyTracking;
    if (!t) return;
    _promiseTimerWindowId = t.promiseWindowId || null;
    _promiseTimerResolved = !!t.promiseResolved;
    _promiseTimerStartedAt = t.promiseStartedAt || 0;
    _penaltyTimerWindowId = t.penaltyWindowId || null;
    _penaltyTimerResolved = !!t.penaltyResolved;
    _penaltyTimerStartedAt = t.penaltyStartedAt || 0;
    console.log('[PenaltyTracking] Restored from storage: promise=' +
      (_promiseTimerResolved ? 'resolved' : 'active(win=' + _promiseTimerWindowId + ')') +
      ' penalty=' + (_penaltyTimerResolved ? 'resolved' : 'active(win=' + _penaltyTimerWindowId + ')'));

    // v3.23.12: If we restored an active (unresolved) timer but the window is gone,
    // verify the window still exists. If not, the penalty would have been handled
    // by the alarm already — just clean up.
    // v3.23.35: On reload, stale windows go blank. Close them and reopen fresh.
    if (_promiseTimerWindowId && !_promiseTimerResolved) {
      // Calculate remaining time from when it was started
      var _promiseElapsed = _promiseTimerStartedAt ? (Date.now() - _promiseTimerStartedAt) : 0;
      var _promiseRemainMs = Math.max(0, (3 * 60 * 1000) - _promiseElapsed);
      // Close the stale blank window
      try { chrome.windows.remove(_promiseTimerWindowId, function() {}); } catch(_) {}
      _promiseTimerWindowId = null;
      if (_promiseRemainMs > 5000) {
        // Reopen with remaining time
        var _pUrl = chrome.runtime.getURL('promise-timer.html?remain=' + Math.round(_promiseRemainMs / 1000));
        chrome.windows.create({
          url: _pUrl, type: 'popup', width: 380, height: 420, focused: true,
          top: 80, left: Math.round((screen.availWidth || 1200) - 420)
        }, function(win) {
          if (win && win.id) {
            _setPromiseTimer(win.id, false);
            console.log('[PenaltyTracking] Promise timer REOPENED with ' + Math.round(_promiseRemainMs/1000) + 's remaining.');
            var _refocusId = setInterval(function() {
              if (!_promiseTimerWindowId || _promiseTimerResolved) { clearInterval(_refocusId); return; }
              try { chrome.windows.update(_promiseTimerWindowId, { focused: true }); } catch(_) { clearInterval(_refocusId); }
            }, 5000);
          }
        });
      } else {
        console.log('[PenaltyTracking] Promise timer expired during reload. Letting alarm handle it.');
        _syncPenaltyTracking();
      }
    }
    if (_penaltyTimerWindowId && !_penaltyTimerResolved) {
      var _penElapsed = _penaltyTimerStartedAt ? (Date.now() - _penaltyTimerStartedAt) : 0;
      var _penRemainMs = Math.max(0, (3 * 60 * 1000) - _penElapsed);
      try { chrome.windows.remove(_penaltyTimerWindowId, function() {}); } catch(_) {}
      _penaltyTimerWindowId = null;
      if (_penRemainMs > 5000) {
        var _penUrl = chrome.runtime.getURL('penalty-timer.html?remain=' + Math.round(_penRemainMs / 1000));
        chrome.windows.create({
          url: _penUrl, type: 'popup', width: 380, height: 420, focused: true,
          top: 80, left: Math.round((screen.availWidth || 1200) - 420)
        }, function(win) {
          if (win && win.id) {
            _setPenaltyTimer(win.id, false);
            console.log('[PenaltyTracking] Penalty timer REOPENED with ' + Math.round(_penRemainMs/1000) + 's remaining.');
          }
        });
      } else {
        console.log('[PenaltyTracking] Penalty timer expired during reload.');
        _syncPenaltyTracking();
      }
    }
  });
} catch(_) {}

// v3.23.14: On service worker wake, if a focus timer is running, make sure
// idle challenge alarms are cleared. Handles the case where the SW dies and
// restarts mid-session — the onChanged listener wouldn't fire again.
try {
  chrome.storage.local.get('pixelFocusState', function(result) {
    var st = result.pixelFocusState || {};
    if (st.timerState === 'running' || st.timerState === 'countdown') {
      console.log('[Startup] Focus timer is ' + st.timerState + ' — clearing idle alarms.');
      try { chrome.alarms.clear('pixelfocus-ct-idle'); } catch(_) {}
      try { chrome.alarms.clear('pixelfocus-focus-idle'); } catch(_) {}
    }
  });
} catch(_) {}

// v3.23.2: Clear the penaltyCountdownActive flag when both timers are resolved
function clearPenaltyActiveFlag() {
  if (_promiseTimerResolved && _penaltyTimerResolved) {
    // Both resolved — but only clear if neither has an active window
    if (!_promiseTimerWindowId && !_penaltyTimerWindowId) {
      chrome.storage.local.get('pixelFocusState', function(r) {
        var s = r.pixelFocusState || {};
        if (s.penaltyCountdownActive) {
          s.penaltyCountdownActive = false;
          _safeSaveState(s);
          console.log('[Penalty] penaltyCountdownActive cleared.');
        }
      });
    }
  }
}

function applyPromisePenalty() {
  console.log('[PromiseTimer] applyPromisePenalty called. resolved=' + _promiseTimerResolved + ', windowId=' + _promiseTimerWindowId);
  if (_promiseTimerResolved) {
    console.log('[PromiseTimer] Already resolved (timer was started or penalty already applied). Skipping.');
    return;
  }

  // v3.23.11: Don't apply yet — read storage FIRST to check timer state.
  // Previous versions set _promiseTimerResolved=true here before the async read,
  // which meant if the penalty was wrongly applied, the session-completed listener
  // couldn't un-do it. Now we only set resolved=true after confirming penalty is warranted.
  try { chrome.alarms.clear('pixelfocus-promise-deadline'); } catch(_) {}

  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState || {};

    // v3.23.11: FULL DEBUG — log the state we read so we can trace misfires
    console.log('[PromiseTimer] Storage state: timerState=' + (state.timerState || 'undefined') +
      ' timerEndsAt=' + (state.timerEndsAt ? new Date(state.timerEndsAt).toLocaleTimeString() : 'none') +
      ' penaltyCountdownActive=' + !!state.penaltyCountdownActive +
      ' lastStartedSessionAt=' + (state.lastStartedSessionAt ? new Date(state.lastStartedSessionAt).toLocaleTimeString() : 'none'));

    // SAFETY: If the focus timer is running, in countdown, paused, or completed,
    // the user IS engaging. Don't penalize.
    // v3.23.11: Previously only checked 'completed'. This was the bug — the 3-minute
    // background alarm would fire while the focus timer was running because only
    // the window paused its countdown, not the background alarm.
    if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'completed') {
      console.log('[PromiseTimer] SAFETY CHECK: timerState=' + state.timerState + '. Penalty CANCELLED. User is engaging.');
      _setPromiseTimer(null, true);
      // Clear the flag
      state.penaltyCountdownActive = false;
      _safeSaveState(state);
      return;
    }

    // SAFETY: Also check timerEndsAt — belt and suspenders in case timerState is stale
    if (state.timerEndsAt && state.timerEndsAt > Date.now()) {
      console.log('[PromiseTimer] SAFETY CHECK: timerEndsAt is in the future (' +
        Math.round((state.timerEndsAt - Date.now()) / 1000) + 's left). Penalty CANCELLED.');
      _setPromiseTimer(null, true);
      state.penaltyCountdownActive = false;
      _safeSaveState(state);
      return;
    }

    // SAFETY: If a session was started recently (within 5 min), don't penalize.
    // Handles race where timerState hasn't flushed but the session clearly started.
    if (state.lastStartedSessionAt && (Date.now() - state.lastStartedSessionAt) < 300000) {
      console.log('[PromiseTimer] SAFETY CHECK: Session started ' +
        Math.round((Date.now() - state.lastStartedSessionAt) / 1000) + 's ago. Penalty CANCELLED.');
      _setPromiseTimer(null, true);
      state.penaltyCountdownActive = false;
      _safeSaveState(state);
      return;
    }

    // SAFETY: If the promise timer was opened less than 10 seconds ago, skip.
    if (_promiseTimerStartedAt && (Date.now() - _promiseTimerStartedAt) < 10000) {
      console.log('[PromiseTimer] SAFETY CHECK: Promise timer opened <10s ago. Possible misfire. Penalty CANCELLED.');
      return;
    }

    // If we're here, penalty is actually warranted — paused timer doesn't save you
    if (state.timerState === 'paused') {
      console.log('[PromiseTimer] Timer is PAUSED — penalty still applies (pausing = not following through).');
    }

    // NOW set resolved
    _setPromiseTimer(null, true);

    var prevCoins = state.coins || 0;
    state.coins = Math.max(0, prevCoins - PROMISE_PENALTY);
    state.penaltyCountdownActive = false;
    _safeSaveState(state);
    console.log('[PromiseTimer] PENALTY APPLIED: $' + PROMISE_PENALTY + ' deducted. Coins: ' + prevCoins + ' → ' + state.coins);

    // v3.23.155: Log penalty to house feed
    if (!Array.isArray(state.houseFeedLog)) state.houseFeedLog = [];
    state.houseFeedLog.push({
      type: 'promise_fail',
      msg: 'Surveillance promise broken \u2014 $' + PROMISE_PENALTY + ' penalty',
      amount: -PROMISE_PENALTY,
      ts: Date.now()
    });
    if (state.houseFeedLog.length > 30) state.houseFeedLog = state.houseFeedLog.slice(-30);
    _safeSaveState(state);

    try {
      chrome.notifications.create('promise-penalty-' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'PROMISE BROKEN — $' + PROMISE_PENALTY + ' PENALTY',
        message: 'You said YES to starting a focus timer but didn\'t follow through. $' + PROMISE_PENALTY + ' has been deducted. Closing the window doesn\'t save you.',
        priority: 2
      });
    } catch(e) {
      console.error('[PromiseTimer] Failed to create penalty notification:', e);
    }
  });
}

// v3.22.93: Penalty timer enforcement (3rd consecutive NO)
function applyPenaltyTimerPenalty() {
  console.log('[PenaltyTimer] applyPenaltyTimerPenalty called. resolved=' + _penaltyTimerResolved);
  if (_penaltyTimerResolved) {
    console.log('[PenaltyTimer] Already resolved. Skipping.');
    return;
  }
  try { chrome.alarms.clear('pixelfocus-penalty-deadline'); } catch(_) {}

  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState || {};

    console.log('[PenaltyTimer] Storage state: timerState=' + (state.timerState || 'undefined') +
      ' timerEndsAt=' + (state.timerEndsAt ? new Date(state.timerEndsAt).toLocaleTimeString() : 'none') +
      ' lastStartedSessionAt=' + (state.lastStartedSessionAt ? new Date(state.lastStartedSessionAt).toLocaleTimeString() : 'none'));

    // v3.23.11: If the focus timer is running, in countdown, or completed, don't penalize.
    if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'completed') {
      console.log('[PenaltyTimer] SAFETY CHECK: timerState=' + state.timerState + '. Penalty CANCELLED.');
      _setPenaltyTimer(null, true);
      state.penaltyCountdownActive = false;
      _safeSaveState(state);
      return;
    }
    if (state.timerEndsAt && state.timerEndsAt > Date.now()) {
      console.log('[PenaltyTimer] SAFETY CHECK: timerEndsAt in future. Penalty CANCELLED.');
      _setPenaltyTimer(null, true);
      state.penaltyCountdownActive = false;
      _safeSaveState(state);
      return;
    }
    if (state.lastStartedSessionAt && (Date.now() - state.lastStartedSessionAt) < 300000) {
      console.log('[PenaltyTimer] SAFETY CHECK: Session started ' +
        Math.round((Date.now() - state.lastStartedSessionAt) / 1000) + 's ago. Penalty CANCELLED.');
      _setPenaltyTimer(null, true);
      state.penaltyCountdownActive = false;
      _safeSaveState(state);
      return;
    }
    if (_penaltyTimerStartedAt && (Date.now() - _penaltyTimerStartedAt) < 10000) {
      console.log('[PenaltyTimer] SAFETY CHECK: Opened <10s ago. Possible misfire. Penalty CANCELLED.');
      return;
    }

    if (state.timerState === 'paused') {
      console.log('[PenaltyTimer] Timer is PAUSED — penalty still applies.');
    }

    _setPenaltyTimer(null, true);

    var prevCoins = state.coins || 0;
    state.coins = Math.max(0, prevCoins - PENALTY_TIMER_PENALTY);
    state.penaltyCountdownActive = false;
    _safeSaveState(state);
    console.log('[PenaltyTimer] PENALTY APPLIED: $' + PENALTY_TIMER_PENALTY + ' deducted. Coins: ' + prevCoins + ' → ' + state.coins);

    try {
      chrome.notifications.create('penalty-timer-' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'STRIKE 3 — $' + PENALTY_TIMER_PENALTY + ' PENALTY',
        message: 'You said NO three times and didn\'t start a focus timer. $' + PENALTY_TIMER_PENALTY + ' has been deducted. Closing the window doesn\'t help.',
        priority: 2
      });
    } catch(e) {
      console.error('[PenaltyTimer] Failed to create notification:', e);
    }
  });
}

// Cancel the penalty if the user starts a focus timer.
// Also reset consecutive NO counter when a focus timer starts.
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area !== 'local' || !changes.pixelFocusState) return;
  var newState = changes.pixelFocusState.newValue || {};

  // v3.23.11: When the focus timer starts running or enters countdown, CLEAR the
  // background deadline alarms. The window handles its own pause/resume, but
  // the background alarm is a separate 3-minute fuse that doesn't know the
  // window paused. Without clearing it, the alarm fires and applies the penalty
  // even though the user is actively focusing. THIS WAS THE BUG.
  //
  // The alarms are re-created if the user pauses or resets (the window sends
  // PROMISE_TIMER_EXPIRED / PENALTY_TIMER_EXPIRED, or we detect idle→resume below).
  if (newState.timerState === 'running' || newState.timerState === 'countdown') {
    console.log('[Storage] timerState=' + newState.timerState + ' — clearing deadline + idle alarms (user is engaging).');
    try { chrome.alarms.clear('pixelfocus-promise-deadline'); } catch(_) {}
    try { chrome.alarms.clear('pixelfocus-penalty-deadline'); } catch(_) {}
    // v3.23.14: Kill idle challenge alarms entirely while focusing. The guards
    // inside the alarm handler SHOULD block notifications, but a race condition
    // (service worker wake-up reading stale storage) has allowed them through
    // three separate times. If the alarm doesn't fire, the notification can't
    // be created. Alarms are re-created when timerState goes idle/completed.
    try { chrome.alarms.clear('pixelfocus-ct-idle'); } catch(_) {}
    try { chrome.alarms.clear('pixelfocus-focus-idle'); } catch(_) {}
    console.log('[Storage] Idle challenge alarms CLEARED for duration of focus session.');

    // Reset consecutive NOs — they're at least trying
    if (newState.surveillanceConsecutiveNos > 0) {
      newState.surveillanceConsecutiveNos = 0;
      _safeSaveState(newState);
      console.log('[Surveillance] Consecutive NOs reset — focus timer started.');
    }
  }

  // v3.23.11: If the user pauses or goes idle while a promise/penalty window is still
  // open (not resolved), re-create the deadline alarm for the REMAINING time.
  // The window's resume handler will resume its own countdown; the background alarm
  // is the belt-and-suspenders enforcement.
  if (newState.timerState === 'paused' || newState.timerState === 'idle') {
    // v3.23.14: Recreate idle challenge alarms that were cleared during focus
    chrome.alarms.create('pixelfocus-ct-idle', { periodInMinutes: 5 });
    chrome.alarms.create('pixelfocus-focus-idle', { periodInMinutes: 5 });
    console.log('[Storage] timerState=' + newState.timerState + ' — idle alarms re-created.');

    if (!_promiseTimerResolved && _promiseTimerWindowId) {
      console.log('[Storage] timerState=' + newState.timerState + ' — promise timer still active, re-arming alarm.');
      // We don't know exact remaining time, so give a fresh 3 minutes.
      // The window tracks real remaining time independently.
      chrome.alarms.create('pixelfocus-promise-deadline', { delayInMinutes: 3 });
    }
    if (!_penaltyTimerResolved && _penaltyTimerWindowId) {
      console.log('[Storage] timerState=' + newState.timerState + ' — penalty timer still active, re-arming alarm.');
      chrome.alarms.create('pixelfocus-penalty-deadline', { delayInMinutes: 3 });
    }
  }

  if (newState.timerState === 'completed') {
    // v3.23.14: Recreate idle challenge alarms (session is done, idle tracking resumes)
    chrome.alarms.create('pixelfocus-ct-idle', { periodInMinutes: 5 });
    chrome.alarms.create('pixelfocus-focus-idle', { periodInMinutes: 5 });
    console.log('[Storage] timerState=completed — idle alarms re-created.');

    // Session completed — cancel any active promise/penalty timers for good
    var anyCancelled = false;
    if (!_promiseTimerResolved && _promiseTimerWindowId) {
      console.log('[PromiseTimer] Session COMPLETED. Penalty CANCELLED.');
      _setPromiseTimer(null, true);
      try { chrome.alarms.clear('pixelfocus-promise-deadline'); } catch(_) {}
      anyCancelled = true;
    }
    if (!_penaltyTimerResolved && _penaltyTimerWindowId) {
      console.log('[PenaltyTimer] Session COMPLETED. Penalty CANCELLED.');
      _setPenaltyTimer(null, true);
      try { chrome.alarms.clear('pixelfocus-penalty-deadline'); } catch(_) {}
      anyCancelled = true;
    }
    if (anyCancelled) {
      newState.penaltyCountdownActive = false;
      _safeSaveState(newState);
    }
  }
});

// If the promise/penalty timer window is closed before resolving → penalty
// v3.23.11: But NOT if the focus timer is currently running — the user may have
// closed the minimized window from the taskbar while focusing. applyPromisePenalty
// and applyPenaltyTimerPenalty now check timerState themselves, but we also
// read storage here first to avoid even calling them unnecessarily.
chrome.windows.onRemoved.addListener(function(windowId) {
  if (windowId === _promiseTimerWindowId && !_promiseTimerResolved) {
    console.log('[PromiseTimer] Window ' + windowId + ' was CLOSED before resolution. Checking timer state...');
    setTimeout(function() {
      if (_promiseTimerResolved) {
        console.log('[PromiseTimer] Resolved during safety delay. Penalty skipped.');
        return;
      }
      // Check if focus timer is running before penalizing
      chrome.storage.local.get('pixelFocusState', function(result) {
        var st = (result.pixelFocusState || {});
        if (st.timerState === 'running' || st.timerState === 'countdown' || st.timerState === 'completed') {
          console.log('[PromiseTimer] Window closed but timer is ' + st.timerState + '. NOT penalizing.');
          // Don't resolve — the session might still fail. But don't penalize now.
          // The alarm was already cleared when timerState went to running.
          return;
        }
        if (st.timerEndsAt && st.timerEndsAt > Date.now()) {
          console.log('[PromiseTimer] Window closed but timerEndsAt in future. NOT penalizing.');
          return;
        }
        applyPromisePenalty();
      });
    }, 1000);
  }
  if (windowId === _penaltyTimerWindowId && !_penaltyTimerResolved) {
    console.log('[PenaltyTimer] Window ' + windowId + ' was CLOSED before resolution. Checking timer state...');
    setTimeout(function() {
      if (_penaltyTimerResolved) {
        console.log('[PenaltyTimer] Resolved during safety delay. Penalty skipped.');
        return;
      }
      chrome.storage.local.get('pixelFocusState', function(result) {
        var st = (result.pixelFocusState || {});
        if (st.timerState === 'running' || st.timerState === 'countdown' || st.timerState === 'completed') {
          console.log('[PenaltyTimer] Window closed but timer is ' + st.timerState + '. NOT penalizing.');
          return;
        }
        if (st.timerEndsAt && st.timerEndsAt > Date.now()) {
          console.log('[PenaltyTimer] Window closed but timerEndsAt in future. NOT penalizing.');
          return;
        }
        applyPenaltyTimerPenalty();
      });
    }, 1000);
  }
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg && msg.type === 'pf-open' && typeof msg.path === 'string') {
    if (msg.path.indexOf('surveillance-nag') !== -1) {
      openNagPopup(msg.path);
    } else {
      openPixelFocusWindow(msg.path);
    }
    sendResponse({ ok: true });
  }
  // v3.22.91: Open promise timer as a popup window AND track it in background
  // so the $300 penalty fires even if the user closes the window.
  if (msg && msg.type === 'OPEN_PROMISE_TIMER') {
    var isTestPromise = msg.test === true;
    var promiseUrl = chrome.runtime.getURL('promise-timer.html' + (isTestPromise ? '?test=1' : ''));
    chrome.windows.create({
      url: promiseUrl,
      type: 'popup',
      width: 380,
      height: 420,
      focused: true,
      top: 80,
      left: Math.round((screen.availWidth || 1200) - 420)
    }, function(win) {
      if (!isTestPromise && win && win.id) {
        _setPromiseTimer(win.id, false, Date.now());
        console.log('[PromiseTimer] Window opened. windowId=' + win.id + ', deadline in 3 minutes.');
        chrome.alarms.create('pixelfocus-promise-deadline', { delayInMinutes: 3 });
        // v3.23.35: Re-focus every 5s so it stays on top
        var _refocusId = setInterval(function() {
          if (!_promiseTimerWindowId || _promiseTimerResolved) { clearInterval(_refocusId); return; }
          try { chrome.windows.update(_promiseTimerWindowId, { focused: true }); } catch(_) { clearInterval(_refocusId); }
        }, 5000);
        // v3.23.2: Flag for pause/reset warning
        chrome.storage.local.get('pixelFocusState', function(r) {
          var s = r.pixelFocusState || {};
          s.penaltyCountdownActive = true;
          _safeSaveState(s);
        });
      } else if (!isTestPromise) {
        console.warn('[PromiseTimer] Window creation returned no window or no ID. Penalty tracking NOT active.');
      }
    });
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.91: Promise timer window signals it expired (timer ran out inside the window)
  if (msg && msg.type === 'PROMISE_TIMER_EXPIRED') {
    console.log('[PromiseTimer] Window reported expiry. Applying penalty via background.');
    applyPromisePenalty();
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.91: Promise timer window signals success (focus timer started, detected by window)
  if (msg && msg.type === 'PROMISE_TIMER_RESOLVED') {
    console.log('[PromiseTimer] Window reported success — focus timer started. Penalty cancelled.');
    _setPromiseTimer(null, true);
    try { chrome.alarms.clear('pixelfocus-promise-deadline'); } catch(_) {}
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.96: Track promise timer opened directly by surveillance-nag-window.js
  if (msg && msg.type === 'TRACK_PROMISE_TIMER') {
    var trackWinId = msg.windowId;
    if (trackWinId) {
      _setPromiseTimer(trackWinId, false, Date.now());
      console.log('[PromiseTimer] Tracking window opened by nag. windowId=' + trackWinId);
      chrome.alarms.create('pixelfocus-promise-deadline', { delayInMinutes: 3 });
      // v3.23.2: Set flag so app.js can warn before pause/reset
      chrome.storage.local.get('pixelFocusState', function(r) {
        var s = r.pixelFocusState || {};
        s.penaltyCountdownActive = true;
        _safeSaveState(s);
      });
    }
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.96: Track penalty timer opened directly by surveillance-nag-window.js
  if (msg && msg.type === 'TRACK_PENALTY_TIMER') {
    var trackPenWinId = msg.windowId;
    if (trackPenWinId) {
      _setPenaltyTimer(trackPenWinId, false, Date.now());
      console.log('[PenaltyTimer] Tracking window opened by nag. windowId=' + trackPenWinId);
      chrome.alarms.create('pixelfocus-penalty-deadline', { delayInMinutes: 3 });
      // v3.23.2: Set flag so app.js can warn before pause/reset
      chrome.storage.local.get('pixelFocusState', function(r) {
        var s = r.pixelFocusState || {};
        s.penaltyCountdownActive = true;
        _safeSaveState(s);
      });
    }
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.93: Open penalty timer (3rd consecutive NO on surveillance nag)
  if (msg && msg.type === 'OPEN_PENALTY_TIMER') {
    var isTestPenalty = msg.test === true;
    var penaltyUrl = chrome.runtime.getURL('penalty-timer.html' + (isTestPenalty ? '?test=1' : ''));
    chrome.windows.create({
      url: penaltyUrl,
      type: 'popup',
      width: 380,
      height: 420,
      focused: true,
      top: 80,
      left: Math.round((screen.availWidth || 1200) - 420)
    }, function(win) {
      if (!isTestPenalty && win && win.id) {
        _setPenaltyTimer(win.id, false, Date.now());
        console.log('[PenaltyTimer] Window opened. windowId=' + win.id + ', deadline in 3 minutes.');
        chrome.alarms.create('pixelfocus-penalty-deadline', { delayInMinutes: 3 });
        chrome.storage.local.get('pixelFocusState', function(r) {
          var s = r.pixelFocusState || {};
          s.penaltyCountdownActive = true;
          _safeSaveState(s);
        });
      } else if (!isTestPenalty) {
        console.warn('[PenaltyTimer] Window creation returned no window or no ID. Penalty tracking NOT active.');
      }
    });
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.93: Penalty timer window signals it expired
  if (msg && msg.type === 'PENALTY_TIMER_EXPIRED') {
    console.log('[PenaltyTimer] Window reported expiry. Applying penalty via background.');
    applyPenaltyTimerPenalty();
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.93: Penalty timer window signals success (focus timer started)
  if (msg && msg.type === 'PENALTY_TIMER_RESOLVED') {
    console.log('[PenaltyTimer] Window reported success — focus timer started. Penalty cancelled.');
    _setPenaltyTimer(null, true);
    try { chrome.alarms.clear('pixelfocus-penalty-deadline'); } catch(_) {}
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.21.60: Ensure site-nag alarm exists (sent from app.js when watchlist changes)
  if (msg && msg.type === 'ENSURE_SITE_NAG_ALARM') {
    chrome.alarms.get('pixelfocus-site-nag', function(alarm) {
      if (!alarm) {
        chrome.alarms.create('pixelfocus-site-nag', { periodInMinutes: 2 });
        console.log('[SiteNag] Alarm created on demand.');
      }
      try { sendResponse({ ok: true, created: !alarm }); } catch (_) {}
    });
    return true; // async sendResponse
  }

  // v3.21.62: Test site nag — scans ALL open tabs against the watchlist.
  // Reports every match found, not just one tab.
  if (msg && msg.type === 'TEST_SITE_NAG') {
    chrome.tabs.query({}, function(allTabs) {
      if (!allTabs || !allTabs.length) {
        try { sendResponse({ ok: false, reason: 'no-active-tab' }); } catch (_) {}
        return;
      }
      chrome.storage.local.get('pixelFocusState', function(result) {
        var st = result.pixelFocusState;
        var sites = (st && st.coldTurkeyNagSites) || [];
        if (!sites.length) {
          try { sendResponse({ ok: false, reason: 'no-sites', url: '' }); } catch (_) {}
          return;
        }
        // Check every tab against every watchlist entry
        var matches = [];
        var checkedUrls = [];
        for (var t = 0; t < allTabs.length; t++) {
          var tabUrl = (allTabs[t].url || '').toLowerCase();
          if (!tabUrl || tabUrl.indexOf('chrome-extension://') === 0
              || tabUrl.indexOf('chrome://') === 0
              || tabUrl.indexOf('brave://') === 0
              || tabUrl.indexOf('about:') === 0) continue;
          checkedUrls.push(tabUrl);
          for (var s = 0; s < sites.length; s++) {
            if (tabUrl.indexOf(sites[s]) !== -1) {
              matches.push({ site: sites[s], url: tabUrl });
              break;
            }
          }
        }
        if (matches.length > 0) {
          var matchNames = matches.map(function(m) { return m.site; });
          try {
            chrome.notifications.create('site-nag-test-' + Date.now(), {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'TEST: Distraction site detected!',
              message: 'Found ' + matches.length + ' match(es): ' + matchNames.join(', ') + '. Nag system is working!',
              priority: 2
            });
          } catch (e) {}
          try { sendResponse({ ok: true, matched: matchNames.join(', '), url: matches[0].url, count: matches.length }); } catch (_) {}
        } else {
          // Show what tabs we actually checked so user can debug
          var tabSummary = checkedUrls.length > 3
            ? checkedUrls.slice(0, 3).join(', ') + ' + ' + (checkedUrls.length - 3) + ' more'
            : checkedUrls.join(', ');
          try { sendResponse({ ok: false, reason: 'no-match', url: tabSummary, sites: sites }); } catch (_) {}
        }
      });
    });
    return true;
  }

  // v3.22.35: Surveillance TEST — fire notification from service worker context
  // (Brave may block notifications from extension pages but allows them from SW)
  if (msg && msg.type === 'SURVEILLANCE_TEST') {
    try {
      chrome.notifications.create('surveillance-test-' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon128.png',
        title: 'Surveillance TEST: No focus timer running!',
        message: 'TEST: This is what a real nag escalation looks like.',
        priority: 2
      }, function() {
        if (chrome.runtime.lastError) {
          try { sendResponse({ ok: false, error: chrome.runtime.lastError.message }); } catch(_){}
        } else {
          try { sendResponse({ ok: true }); } catch(_){}
        }
      });
    } catch(e) {
      try { sendResponse({ ok: false, error: e.message }); } catch(_){}
    }
    return true;
  }

  // v3.22.52: Surveillance nag notification from page-side check (fallback for alarms)
  if (msg && msg.type === 'SURVEILLANCE_NAG') {
    var nagNum = (msg && msg.nagNum) || 1;
    var penaltyDone = msg && msg.penaltyApplied;
    var nagTitle, nagMsg;
    if (nagNum >= 3 && !penaltyDone) {
      nagTitle = 'STRIKE 3 \u2014 $100 PENALTY';
      nagMsg = 'You just lost $100. Start a focus timer or keep bleeding money.';
    } else if (nagNum >= 3 && penaltyDone) {
      nagTitle = 'STRIKE 3 \u2014 No focus timer running!';
      nagMsg = 'Penalty already applied this session. Start a timer.';
    } else if (nagNum === 2 && !penaltyDone) {
      nagTitle = 'STRIKE 2 \u2014 Next one costs $100!';
      nagMsg = 'This is your warning. Strike 3 deducts $100 from your balance.';
    } else {
      nagTitle = 'Surveillance: No focus timer running!';
      nagMsg = 'Nag ' + nagNum + '/3 \u2014 Start a focus timer! Ignoring this costs you.';
    }
    try {
      chrome.notifications.create('surveillance-nag-' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon128.png',
        title: nagTitle,
        message: nagMsg,
        priority: 2, requireInteraction: false
      }, function() {
        try { sendResponse({ ok: true }); } catch(_){}
      });
    } catch(_){
      try { sendResponse({ ok: false }); } catch(_){}
    }
    return true;
  }

  // v3.22.59: Site nag notification from page-side check (fallback for broken alarms in Brave)
  if (msg && msg.type === 'SITE_NAG_FIRE') {
    var siteNagNum = (msg && msg.nagNum) || 1;
    var siteTitle = siteNagNum >= 3 ? 'FINAL WARNING — Distraction detected'
                  : siteNagNum === 2 ? 'Second warning — Distraction detected'
                  : 'Distraction site detected';
    var siteMsg = siteNagNum >= 3 ? 'Third strike! Nags paused for 2 hours.'
                : siteNagNum === 2 ? 'Still on a distraction site. Next nag in 10 min.'
                : 'You\'re on a distraction site. Time to focus!';
    try {
      chrome.notifications.create('site-nag-' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon128.png',
        title: siteTitle, message: siteMsg, priority: 2
      });
    } catch(_){}
    // Open Cold Turkey via native messaging
    try {
      chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', { action: 'open' }, function() {});
    } catch(_){}
    try { sendResponse({ ok: true }); } catch(_){}
    return false;
  }

  // v3.20.31: Safe Refresh request from popup.js. The popup has already
  // written a backup to disk and mirrored it into chrome.storage.local
  // under 'pixelFocusState_backup'. We reply, then reload the extension
  // on the next tick so the callback lands first.
  if (msg && msg.type === 'SAFE_REFRESH_RELOAD') {
    try { sendResponse({ ok: true }); } catch (_) {}
    setTimeout(function() {
      try { chrome.runtime.reload(); } catch (_) {}
    }, 100);
    return true;
  }
  return false;
});

chrome.alarms.onAlarm.addListener(function(alarm) {
  // v3.22.91: Promise timer deadline expired — apply penalty
  if (alarm.name === 'pixelfocus-promise-deadline') {
    console.log('[PromiseTimer] 3-minute alarm fired. resolved=' + _promiseTimerResolved);
    applyPromisePenalty();
    return;
  }
  // v3.22.93: Penalty timer deadline expired
  if (alarm.name === 'pixelfocus-penalty-deadline') {
    console.log('[PenaltyTimer] 3-minute alarm fired. resolved=' + _penaltyTimerResolved);
    applyPenaltyTimerPenalty();
    return;
  }

  // v3.21.44: Cold Turkey idle reminder — check every 15 min
  // This one opens challenge.html + Cold Turkey blocker (requires CT toggle)
  if (alarm.name === 'pixelfocus-ct-idle') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state || !state.coldTurkeyIdleReminder) return;

      var now = Date.now();

      // v3.23.8: FULL DEBUG — log every check so we can trace false fires
      var _dbg = '[CT-Idle] ';
      console.log(_dbg + 'ALARM FIRED at ' + new Date(now).toLocaleTimeString());

      // v3.23.15: Stamp every alarm fire so wake-from-sleep detection works.
      // Must be BEFORE guards so it updates even when blocked.
      state._ctIdleLastAlarmAt = now;
      _safeSaveState(state);

      console.log(_dbg + 'timerState=' + (state.timerState || 'undefined') +
        ' timerEndsAt=' + (state.timerEndsAt ? new Date(state.timerEndsAt).toLocaleTimeString() : 'none') +
        ' timerRemaining=' + (state.timerRemaining || 0));

      // Timer currently running or in countdown/paused/completed? Don't nag.
      if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused' || state.timerState === 'completed') {
        console.log(_dbg + 'BLOCKED by timerState=' + state.timerState);
        return;
      }
      if (state.timerEndsAt && state.timerEndsAt > now) {
        console.log(_dbg + 'BLOCKED by timerEndsAt (still in future, ' + Math.round((state.timerEndsAt - now) / 1000) + 's left)');
        return;
      }
      // Grace period: don't nag within 5 min of completing a session
      if (state.lastCompletedSessionAt && (now - state.lastCompletedSessionAt) < 300000) {
        console.log(_dbg + 'BLOCKED by grace period (' + Math.round((now - state.lastCompletedSessionAt) / 1000) + 's since completion)');
        return;
      }

      // v3.23.8: Also block if penaltyCountdownActive (user is dealing with a penalty)
      if (state.penaltyCountdownActive) {
        console.log(_dbg + 'BLOCKED by penaltyCountdownActive');
        return;
      }

      // Last STARTED session within 2 hours? All good.
      var TWO_HOURS = 2 * 60 * 60 * 1000;
      var lastSession = state.lastStartedSessionAt || state.lastCompletedSessionAt || 0;
      if (lastSession && (now - lastSession) < TWO_HOURS) {
        console.log(_dbg + 'BLOCKED by lastSession (' + Math.round((now - lastSession) / 60000) + 'min ago)');
        return;
      }

      // Don't spam — only open once per 2h window
      var lastIdleOpen = state.coldTurkeyLastIdleOpen || 0;
      if (lastIdleOpen && (now - lastIdleOpen) < TWO_HOURS) {
        console.log(_dbg + 'BLOCKED by lastIdleOpen (' + Math.round((now - lastIdleOpen) / 60000) + 'min ago)');
        return;
      }

      // v3.23.8: Also block if there's an active challenge window already
      if (state.challengeActive) {
        console.log(_dbg + 'BLOCKED by challengeActive');
        return;
      }

      // ALL GUARDS PASSED — about to fire
      console.warn(_dbg + 'ALL GUARDS PASSED — FIRING idle challenge!' +
        ' lastStartedSessionAt=' + (state.lastStartedSessionAt ? new Date(state.lastStartedSessionAt).toLocaleTimeString() + ' (' + Math.round((now - state.lastStartedSessionAt) / 60000) + 'min ago)' : 'NEVER') +
        ' lastCompletedSessionAt=' + (state.lastCompletedSessionAt ? new Date(state.lastCompletedSessionAt).toLocaleTimeString() + ' (' + Math.round((now - state.lastCompletedSessionAt) / 60000) + 'min ago)' : 'NEVER') +
        ' coldTurkeyLastIdleOpen=' + (lastIdleOpen ? new Date(lastIdleOpen).toLocaleTimeString() + ' (' + Math.round((now - lastIdleOpen) / 60000) + 'min ago)' : 'NEVER'));

      // v3.23.15: Don't fire on wake from sleep/hibernate. If the computer was
      // off for hours, the 2h idle check passes but the user wasn't actually idle
      // at their desk — they were away. Check if the LAST alarm fire was recent
      // enough to prove the computer has been continuously awake. The alarm fires
      // every 5 minutes, so if the gap since last fire is >10 minutes, the machine
      // was probably sleeping.
      var lastAlarmFire = state._ctIdleLastAlarmAt || 0;
      if (lastAlarmFire && (now - lastAlarmFire) > 600000) {
        console.log(_dbg + 'BLOCKED by wake-from-sleep (last alarm was ' + Math.round((now - lastAlarmFire) / 60000) + 'min ago, gap > 10min)');
        state._ctIdleLastAlarmAt = now;
        _safeSaveState(state);
        return;
      }
      state._ctIdleLastAlarmAt = now;

      // Fire! Open the challenge window + Cold Turkey + notification
      state.coldTurkeyLastIdleOpen = now;
      state.challengeOfferedAt = now; // v3.22.89: gate so manual navigation can't exploit
      _safeSaveState(state);

      // v3.23.15: Open challenge as a popup window (not a tab)
      chrome.windows.create({
        url: chrome.runtime.getURL('challenge.html'),
        type: 'popup',
        width: 480,
        height: 520,
        focused: true,
        top: 60,
        left: Math.round((screen.availWidth || 1200) - 520)
      });

      // Also open Cold Turkey if native messaging is set up
      try {
        chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', {
          action: 'open'
        }, function() {
          if (chrome.runtime.lastError) {
            console.warn('[ColdTurkey Idle] Native messaging error:', chrome.runtime.lastError.message);
          }
        });
      } catch (e) {
        console.warn('[ColdTurkey Idle] Failed:', e);
      }

      try {
        chrome.notifications.create('ct-idle-' + now, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Idle Challenge — 1.5x Rewards!',
          message: 'You haven\'t focused in 2 hours. Accept the challenge for bonus rewards!',
          priority: 2
        });
      } catch (e) {}
    });
    return;
  }

  // v3.21.98: Standalone focus timer idle nudge — no Cold Turkey, just a notification
  // Runs 24/7. Nag cadence: fires every 2h of inactivity, no wake-hour restriction.
  
  // v3.23.96: Bedtime reminder check — fires every 5 min when enabled
  if (alarm.name === 'pixelfocus-bedtime-check') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState || {};
      if (!state.bedtimeReminderEnabled || !state.sleepTimeEnabled) return;

      var now = new Date();
      var nowMin = now.getHours() * 60 + now.getMinutes();
      var bedMin = (state.sleepHour || 23) * 60 + (state.sleepMinute || 0);
      var reminderMin = bedMin - (state.sleepPrepMin || 30);
      if (reminderMin < 0) reminderMin += 1440; // wrap past midnight

      // Today's date string
      var m = now.getMonth() + 1, dd = now.getDate();
      var today = now.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;

      // --- Bedtime reminder ---
      // (Morning check-in is handled by app.js on popup open, not here.)
      // Already reminded today? Skip.
      if (state.bedtimeLastReminderDate === today) return;

      // Are we in the reminder window? (within 5 min of the target time)
      var diff = nowMin - reminderMin;
      if (diff < 0) diff += 1440;
      if (diff >= 0 && diff <= 5) {
        console.log('[Bedtime] Reminder triggered at ' + now.toLocaleTimeString());
        state.bedtimeLastReminderDate = today;
        chrome.storage.local.set({ pixelFocusState: state });
        chrome.windows.create({
          url: chrome.runtime.getURL('bedtime-reminder.html'),
          type: 'popup', width: 420, height: 600, focused: true,
          top: 60, left: Math.round((screen.availWidth || 1200) / 2 - 210)
        });
      }
    });
    return;
  }

  if (alarm.name === 'pixelfocus-focus-idle') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      if (state.focusIdleReminder === false) return;

      var now = Date.now();
      var _dbg = '[Focus-Idle] ';
      console.log(_dbg + 'ALARM FIRED at ' + new Date(now).toLocaleTimeString());

      // v3.23.15: Stamp + wake-from-sleep detection (same as CT-Idle)
      var lastFocusAlarm = state._focusIdleLastAlarmAt || 0;
      state._focusIdleLastAlarmAt = now;
      _safeSaveState(state);
      if (lastFocusAlarm && (now - lastFocusAlarm) > 600000) {
        console.log(_dbg + 'BLOCKED by wake-from-sleep (gap ' + Math.round((now - lastFocusAlarm) / 60000) + 'min)');
        return;
      }

      console.log(_dbg + 'timerState=' + (state.timerState || 'undefined') +
        ' timerEndsAt=' + (state.timerEndsAt ? new Date(state.timerEndsAt).toLocaleTimeString() : 'none'));

      // Timer currently running, counting down, paused, or completed? Don't nag.
      if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused' || state.timerState === 'completed') {
        console.log(_dbg + 'BLOCKED by timerState=' + state.timerState);
        return;
      }
      if (state.timerEndsAt && state.timerEndsAt > now) {
        console.log(_dbg + 'BLOCKED by timerEndsAt');
        return;
      }
      // Grace period
      if (state.lastCompletedSessionAt && (now - state.lastCompletedSessionAt) < 300000) {
        console.log(_dbg + 'BLOCKED by grace period');
        return;
      }
      if (state.penaltyCountdownActive) {
        console.log(_dbg + 'BLOCKED by penaltyCountdownActive');
        return;
      }

      // Last STARTED session within 2 hours? All good.
      var TWO_HOURS = 2 * 60 * 60 * 1000;
      var lastSession = state.lastStartedSessionAt || state.lastCompletedSessionAt || 0;
      if (lastSession && (now - lastSession) < TWO_HOURS) {
        console.log(_dbg + 'BLOCKED by lastSession (' + Math.round((now - lastSession) / 60000) + 'min ago)');
        return;
      }

      // Don't spam — only nudge once per 2h window
      var lastNudge = state.focusIdleLastNudge || 0;
      if (lastNudge && (now - lastNudge) < TWO_HOURS) {
        console.log(_dbg + 'BLOCKED by lastNudge');
        return;
      }

      console.warn(_dbg + 'ALL GUARDS PASSED — FIRING idle nudge!');

      state.focusIdleLastNudge = now;
      _safeSaveState(state);

      try {
        chrome.notifications.create('focus-idle-nudge', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Time to focus!',
          message: 'You haven\'t started a focus session in over 2 hours. Open the timer and get a streak going!',
          priority: 2
        });
      } catch (e) {}
    });
    return;
  }

  // v3.22.77: Surveillance Mode alarm — backup for when popup.html isn't open.
  // Page-side (app.js) is the primary; this fires when service worker wakes from alarm.
  if (alarm.name === 'pixelfocus-surveillance') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      if (!state.surveillanceActive) return;

      var now = Date.now();

      // Expired?
      if (state.surveillanceEndsAt && state.surveillanceEndsAt <= now) {
        state.surveillanceActive = false;
        state.surveillanceNagCount = 0;
        _safeSaveState(state);
        return;
      }

      // Timer running, in countdown, completed, or recently completed? Skip.
      // v3.22.98: Also check 'completed' state — fires between timer end and user clicking confirmation
      if (state.timerEndsAt && state.timerEndsAt > now) return;
      var _nagMs = state.surveillanceNagInterval || 300000;
      if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused' || state.timerState === 'completed') {
        // Reset nag anchor so it doesn't fire the SECOND the timer ends
        if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > (_nagMs - 20000)) {
          state.surveillanceLastNag = now;
          _safeSaveState(state);
        }
        return;
      }
      if (state.lastCompletedSessionAt && (now - state.lastCompletedSessionAt) < 300000) {
        // Grace period — also reset nag anchor so nag is 5 min from NOW, not from session start
        if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > (_nagMs - 20000)) {
          state.surveillanceLastNag = now;
          _safeSaveState(state);
        }
        return;
      }

      // Respect the user's chosen nag interval — don't fire early
      var nagIntervalMs = state.surveillanceNagInterval || 300000;
      var lastNag = state.surveillanceLastNag || 0;
      if (lastNag && (now - lastNag) < (nagIntervalMs - 20000)) return; // 20s buffer for alarm jitter

      // v3.23.59: Detect computer sleep/lid close — if gap since last nag is
      // more than 3× the nag interval, the computer was likely asleep. Reset
      // the nag counter and anchor time instead of punishing the user.
      // (Previously hardcoded 15 min which was LESS than a 20-min interval,
      //  causing every real nag to be swallowed by sleep detection.)
      var sleepThresholdMs = Math.max(nagIntervalMs * 3, 900000);
      if (lastNag && (now - lastNag) > sleepThresholdMs) {
        console.log('[Surveillance] Large gap detected (' + Math.round((now - lastNag)/60000) + ' min) — computer was likely asleep. Resetting nag counter.');
        state.surveillanceNagCount = 0;
        state.surveillanceLastNag = now;
        state.surveillancePenaltyApplied = false;
        _safeSaveState(state);
        return;
      }

      // Increment nag count
      state.surveillanceNagCount = (state.surveillanceNagCount || 0) + 1;
      state.surveillanceLastNag = now;
      var nagNum = state.surveillanceNagCount;

      // Nag 3: $100 penalty (once per session)
      if (nagNum >= 3 && !state.surveillancePenaltyApplied) {
        state.coins = Math.max(0, (state.coins || 0) - 100);
        state.surveillancePenaltyApplied = true;
      }
      if (nagNum >= 3) {
        state.surveillanceNagCount = 0;
      }
      _safeSaveState(state);

      // Notification with escalating messages
      var nagTitle = nagNum >= 3 && !state.surveillancePenaltyApplied ? 'STRIKE 3 \u2014 $100 PENALTY'
                   : nagNum >= 3 ? 'STRIKE 3 \u2014 No focus timer running!'
                   : nagNum === 2 ? 'STRIKE 2 \u2014 Next one costs $100!'
                   : 'Surveillance: No focus timer running!';
      var nagMsg = nagNum >= 3 && !state.surveillancePenaltyApplied ? 'You just lost $100. Start a focus timer.'
                 : nagNum >= 3 ? 'Penalty already applied. Start a timer.'
                 : nagNum === 2 ? 'This is your warning. Strike 3 deducts $100.'
                 : 'Nag 1/3 \u2014 Start a focus timer! Ignoring this costs you.';
      try {
        chrome.notifications.create('surveillance-nag-' + Date.now(), {
          type: 'basic', iconUrl: 'icons/icon128.png',
          title: nagTitle, message: nagMsg,
          priority: 2, requireInteraction: false
        });
      } catch(_){}

      // Every nag: open surveillance window + Cold Turkey
      var nagPath = 'surveillance-nag.html' + (nagNum >= 3 && state.surveillancePenaltyApplied ? '?penalty=1' : '');
      try { openNagPopup(nagPath); } catch(_){}
      setTimeout(function() {
        try {
          chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', { action: 'open' }, function() {});
        } catch(_){}
      }, 3000);
    });
    return;
  }

  // v3.21.78: Distraction watchlist — runs 24/7, stops after 2 unacknowledged nags
  if (alarm.name === 'pixelfocus-site-nag') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      if (state.siteNagEnabled === false) return;
      var sites = state.coldTurkeyNagSites;
      if (!sites || !sites.length) return;

      // Don't nag if a focus timer is currently running
      if (state.timerEndsAt && state.timerEndsAt > Date.now()) return;

      // v3.21.79: 3 nags with escalating cooldowns: 5min → 10min → 10min → 2hr pause
      var unacked = state.siteNagUnackedCount || 0;
      if (unacked >= 3) {
        var TWO_HOURS = 2 * 60 * 60 * 1000;
        if (state.coldTurkeyLastSiteNagAt && (Date.now() - state.coldTurkeyLastSiteNagAt) < TWO_HOURS) return;
        // 2 hours passed — reset and allow nagging again
        state.siteNagUnackedCount = 0;
        _safeSaveState(state);
      }

      // Escalating cooldowns: after 1st nag wait 5min, after 2nd/3rd wait 10min
      var cooldown = (unacked === 0) ? 0 : (unacked === 1 ? 5 * 60 * 1000 : 10 * 60 * 1000);
      if (cooldown > 0 && state.coldTurkeyLastSiteNagAt && (Date.now() - state.coldTurkeyLastSiteNagAt) < cooldown) return;

      // Check the currently active tab
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
        if (!tabs || !tabs.length || !tabs[0].url) return;
        var url = tabs[0].url.toLowerCase();

        var matched = false;
        for (var i = 0; i < sites.length; i++) {
          if (url.indexOf(sites[i]) !== -1) {
            matched = true;
            break;
          }
        }
        if (!matched) return;

        // Fire! Update timestamp + increment unacked count
        state.coldTurkeyLastSiteNagAt = Date.now();
        state.siteNagUnackedCount = (state.siteNagUnackedCount || 0) + 1;
        _safeSaveState(state);

        // Open Cold Turkey via native messaging
        try {
          chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', {
            action: 'open'
          }, function() {
            if (chrome.runtime.lastError) {
              console.warn('[SiteNag] Native messaging error:', chrome.runtime.lastError.message);
            }
          });
        } catch (e) {
          console.warn('[SiteNag] Failed:', e);
        }

        // Notification — escalating severity
        var nagNum = state.siteNagUnackedCount;
        var title = nagNum >= 3 ? 'FINAL WARNING — Distraction detected'
                  : nagNum === 2 ? 'Second warning — Distraction detected'
                  : 'Distraction site detected';
        var msg = nagNum >= 3 ? 'Third strike! Nags paused for 2 hours.'
                : nagNum === 2 ? 'Still on a distraction site. Next nag in 10 min.'
                : 'You\'re on a distraction site. Time to focus!';
        try {
          chrome.notifications.create('site-nag-' + Date.now(), {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: title,
            message: msg,
            priority: 2
          });
        } catch (e) {}
      });
    });
    return;
  }

  // v3.21.85: Volume mute enforcement — check every 10 min if we should be muted
  if (alarm.name === 'pixelfocus-volume-mute') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state || !state.volumeMuteEnabled) return;

      var d = new Date();
      var nowMin = d.getHours() * 60 + d.getMinutes();
      var muteAt = (state.volumeMuteHour || 23) * 60 + (state.volumeMuteMinute || 0);
      var unmuteAt = (state.volumeUnmuteHour || 10) * 60 + (state.volumeUnmuteMinute || 0);

      var shouldMute = false;
      if (muteAt < unmuteAt) {
        shouldMute = (nowMin >= muteAt) && (nowMin < unmuteAt);
      } else {
        shouldMute = (nowMin >= muteAt) || (nowMin < unmuteAt);
      }

      // Check if user paused the mute (30-min grace)
      if (shouldMute && state.volumeMutePausedUntil && Date.now() < state.volumeMutePausedUntil) {
        console.log('[VolumeMute] Paused until ' + new Date(state.volumeMutePausedUntil).toLocaleTimeString());
        return;
      }

      // Outside mute period? Nothing to do — skip the native call entirely.
      // (Sending 'unmute' every 10 min was causing PowerShell window flashes 24/7.)
      if (!shouldMute) return;

      // Track consecutive mutes to detect user fighting it
      var action = 'mute';
      try {
        chrome.runtime.sendNativeMessage('com.todooftheloom.volume', {
          action: action
        }, function() {
          if (chrome.runtime.lastError) {
            console.warn('[VolumeMute] Native messaging error:', chrome.runtime.lastError.message);
            return;
          }
          console.log('[VolumeMute] ' + action + ' at ' + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());

          // If we're muting, check 15 seconds later if volume is back up (user unmuted manually)
          if (shouldMute) {
            setTimeout(function() {
              try {
                chrome.runtime.sendNativeMessage('com.todooftheloom.volume', {
                  action: 'getMute'
                }, function(resp) {
                  if (chrome.runtime.lastError) return;
                  // getMute returns muted: false meaning user turned volume back up
                  // Increment antagonize counter
                  chrome.storage.local.get('pixelFocusState', function(r) {
                    var st = r.pixelFocusState;
                    if (!st) return;
                    st.volumeMuteAntagonizeCount = (st.volumeMuteAntagonizeCount || 0) + 1;
                    if (st.volumeMuteAntagonizeCount >= 2) {
                      // Offer a 30-minute pause via notification
                      try {
                        chrome.notifications.create('volume-pause-offer', {
                          type: 'basic',
                          iconUrl: 'icons/icon128.png',
                          title: 'Pause mute for 30 minutes?',
                          message: 'You keep unmuting. Click this notification to pause the auto-mute for 30 minutes.',
                          priority: 2
                        });
                      } catch (_) {}
                      st.volumeMuteAntagonizeCount = 0;
                    }
                    _safeSaveState(st);
                  });
                });
              } catch (_) {}
            }, 15000);
          }
        });
      } catch (e) {
        console.warn('[VolumeMute] Failed:', e);
      }
    });
    return;
  }

  // v3.23.61: Remote task inbox poll — send message to popup for processing
  if (alarm.name === 'pixelfocus-inbox-poll') {
    // The actual inbox processing happens in app.js (pollInbox function)
    // This alarm just ensures the popup's interval fires even if the service worker
    // was asleep. Send a lightweight message; popup will handle it if open.
    try {
      chrome.runtime.sendMessage({ type: 'INBOX_POLL' }, function() {
        // Ignore errors (popup may not be open)
        if (chrome.runtime.lastError) { /* expected */ }
      });
    } catch(_) {}
    return;
  }

  // v3.23.72: Blocked time pop-out alerts — fires when prep starts or event starts
  if (alarm.name === 'pixelfocus-block-alert') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state || !state.blockedTimes || !state.blockedTimes.length) return;
      if (state.blockAlertEnabled === false) return; // respect settings toggle
      var now = Date.now();
      var windowMs = 90 * 1000; // 90-second check window (alarm fires every 60s)
      if (!state.blockedTimePopAlerts) state.blockedTimePopAlerts = {};
      var changed = false;

      for (var i = 0; i < state.blockedTimes.length; i++) {
        var bt = state.blockedTimes[i];
        if (!bt || bt.endMs < now) continue;
        var eventStartMs = bt.eventStartMs || bt.startMs;
        var hasPrepPhase = bt.prepMin > 0 && bt.startMs < eventStartMs;

        // Check prep start
        if (hasPrepPhase) {
          var prepKey = bt.id + '_prep';
          if (!state.blockedTimePopAlerts[prepKey] && now >= bt.startMs && now < bt.startMs + windowMs) {
            state.blockedTimePopAlerts[prepKey] = true;
            changed = true;
            var prepDate = new Date(bt.startMs);
            var eventDate = new Date(eventStartMs);
            var endDate = new Date(bt.endMs);
            var durMin = bt.durationMin || Math.round((bt.endMs - eventStartMs) / 60000);
            var params = 'type=prep'
              + '&label=' + encodeURIComponent(bt.label || 'Commitment')
              + '&prepTime=' + _fmtT(prepDate)
              + '&eventTime=' + _fmtT(eventDate)
              + '&endTime=' + _fmtT(endDate)
              + '&prepMin=' + bt.prepMin
              + '&durMin=' + durMin;
            chrome.windows.create({
              url: chrome.runtime.getURL('block-alert.html?' + params),
              type: 'popup',
              width: 440,
              height: 520,
              focused: true
            });
            break;
          }
        }

        // Check event start
        var eventKey = bt.id + '_event';
        if (!state.blockedTimePopAlerts[eventKey] && now >= eventStartMs && now < eventStartMs + windowMs) {
          state.blockedTimePopAlerts[eventKey] = true;
          changed = true;
          var evDate = new Date(eventStartMs);
          var evEndDate = new Date(bt.endMs);
          var evDurMin = bt.durationMin || Math.round((bt.endMs - eventStartMs) / 60000);
          var evParams = 'type=event'
            + '&label=' + encodeURIComponent(bt.label || 'Commitment')
            + '&eventTime=' + _fmtT(evDate)
            + '&endTime=' + _fmtT(evEndDate)
            + '&durMin=' + evDurMin;
          chrome.windows.create({
            url: chrome.runtime.getURL('block-alert.html?' + evParams),
            type: 'popup',
            width: 440,
            height: 520,
            focused: true
          });
          break;
        }
      }

      if (changed) {
        state.blockedTimePopAlerts = state.blockedTimePopAlerts || {};
        _safeSaveState(state);
      }
    });
    return;
  }

  // v3.21.49: Auto-reopen todo list if closed (persistent mode)
  if (alarm.name === 'pixelfocus-keepopen') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state || !state.autoReopenTodoList) return;

      // Check wake hours (6:00 - 23:40)
      var d = new Date();
      var timeInMin = d.getHours() * 60 + d.getMinutes();
      if (timeInMin < 360 || timeInMin > 1420) return;

      // Check if popup.html is already open in any tab
      var popupUrl = chrome.runtime.getURL('popup.html');
      chrome.tabs.query({}, function(tabs) {
        var found = tabs.some(function(t) {
          return t.url && t.url.indexOf(popupUrl) === 0;
        });
        if (!found) {
          chrome.tabs.create({ url: popupUrl });
        }
      });
    });
    return;
  }

  if (alarm.name !== 'pixelfocus-daycheck') return;
  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState;
    if (!state) return;
    // v3.20.17: use LOCAL date, not UTC — must match app.js todayStr().
    var _d = new Date();
    var _mm = _d.getMonth() + 1;
    var _dd = _d.getDate();
    var today = _d.getFullYear() + '-' + (_mm < 10 ? '0' : '') + _mm + '-' + (_dd < 10 ? '0' : '') + _dd;
    if (state.lastActiveDate === today) return;

    if (state.lastActiveDate) {
      var last = new Date(state.lastActiveDate);
      var now = new Date(today);
      var diffDays = Math.floor((now - last) / 86400000);
      if (diffDays === 1 && state.todayBlocks > 0) {
        state.streak = (state.streak || 0) + 1;
        // v3.20.26: mirror app.js — keep the lifetime best for the profile.
        if (state.streak > (state.longestStreak || 0)) state.longestStreak = state.streak;
      } else if (diffDays > 1) {
        state.streak = 0;
      }
    }

    var pixelCount = Object.keys(state.pixelCanvas || {}).length;
    if (pixelCount > 0) {
      if (!state.savedArtworks) state.savedArtworks = [];
      state.savedArtworks.push({
        pixels: JSON.parse(JSON.stringify(state.pixelCanvas)),
        size: state.canvasSize,
        date: Date.now(),
        pixelCount: pixelCount,
        autoSaved: true
      });
      state.pixelCanvas = {};
    }

    state.todayBlocks = 0;
    state.todayXP = 0;
    state.maxComboToday = 0;
    state.combo = 0;
    // Do NOT reset state.canvasSize — canvas size is a paid upgrade and must
    // persist across day boundaries. Pixels were already archived to gallery
    state.marathonBonusesToday = [];
    state.lastActiveDate = today;
    state.sessionBlocks = 0;

    _safeSaveState(state);
  });
});

// v3.21.78: Clicking a site-nag notification = acknowledgment → reset counter
chrome.notifications.onClicked.addListener(function(notifId) {
  if (notifId === 'volume-pause-offer') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      state.volumeMutePausedUntil = Date.now() + 30 * 60 * 1000;
      state.volumeMuteAntagonizeCount = 0;
      _safeSaveState(state);
      // Unmute immediately
      try {
        chrome.runtime.sendNativeMessage('com.todooftheloom.volume', { action: 'unmute' }, function() {});
      } catch (_) {}
      try {
        chrome.notifications.create('volume-paused', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Mute paused for 30 minutes',
          message: 'Auto-mute will resume in 30 minutes.',
          priority: 1
        });
      } catch (_) {}
    });
    return;
  }
  if (notifId.indexOf('site-nag-') === 0) {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      state.siteNagUnackedCount = 0;
      _safeSaveState(state);
      console.log('[SiteNag] Acknowledged via notification click — counter reset.');
    });
  }
  // v3.21.96: Clicking the focus idle nudge opens the to-do list
  if (notifId === 'focus-idle-nudge') {
    openPixelFocusWindow('popup.html');
  }
});

chrome.runtime.onInstalled.addListener(function(details) {
  chrome.alarms.create('pixelfocus-daycheck', { periodInMinutes: 30 });
  chrome.alarms.create('pixelfocus-ct-idle', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-focus-idle', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-surveillance', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-keepopen', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-site-nag', { periodInMinutes: 2 });
  chrome.alarms.create('pixelfocus-volume-mute', { periodInMinutes: 10 });
  chrome.alarms.create('pixelfocus-inbox-poll', { periodInMinutes: 1 }); // v3.23.61: Remote task inbox
  chrome.alarms.create('pixelfocus-block-alert', { periodInMinutes: 1 }); // v3.23.72: Blocked time pop-out alerts
  chrome.alarms.clear('pixelfocus-tick');

  // v3.22.32: After extension reload, close stale extension tabs and reopen fresh.
  // Stale tabs have dead chrome.* APIs so buttons (like surveillance TEST) silently fail.
  // Delay slightly — service worker may fire onInstalled before tabs are fully queryable.
  if (details.reason === 'update') {
    setTimeout(function() {
      var extOrigin = chrome.runtime.getURL('');
      console.log('[Reload] Looking for stale tabs with origin:', extOrigin);
      chrome.tabs.query({}, function(tabs) {
        console.log('[Reload] Found', tabs.length, 'total tabs');
        var reopenPopup = false;
        var toClose = [];
        for (var i = 0; i < tabs.length; i++) {
          var tabUrl = tabs[i].url || '';
          if (tabUrl.indexOf(extOrigin) === 0) {
            console.log('[Reload] Stale ext tab:', tabs[i].id, tabUrl);
            toClose.push(tabs[i].id);
            if (tabUrl.indexOf('popup.html') !== -1) {
              reopenPopup = true;
            }
          }
        }
        console.log('[Reload] Closing', toClose.length, 'tabs, reopenPopup:', reopenPopup);
        if (toClose.length > 0) {
          chrome.tabs.remove(toClose, function() {
            if (chrome.runtime.lastError) {
              console.warn('[Reload] tabs.remove error:', chrome.runtime.lastError.message);
            }
            if (reopenPopup) {
              chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
            }
          });
        } else {
          // No stale tabs found — just open popup fresh
          console.log('[Reload] No stale tabs found, opening popup anyway');
          chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
        }
      });
    }, 500);
  }
});

chrome.runtime.onStartup.addListener(function() {
  chrome.alarms.create('pixelfocus-daycheck', { periodInMinutes: 30 });
  chrome.alarms.create('pixelfocus-ct-idle', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-focus-idle', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-surveillance', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-keepopen', { periodInMinutes: 5 });
  chrome.alarms.create('pixelfocus-site-nag', { periodInMinutes: 2 });
  chrome.alarms.create('pixelfocus-volume-mute', { periodInMinutes: 10 });
  chrome.alarms.create('pixelfocus-inbox-poll', { periodInMinutes: 1 }); // v3.23.61: Remote task inbox
  chrome.alarms.create('pixelfocus-block-alert', { periodInMinutes: 1 }); // v3.23.72: Blocked time pop-out alerts
  chrome.alarms.clear('pixelfocus-tick');

  // v3.21.49: Auto-open todo list on browser startup if enabled
  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState;
    if (state && state.autoReopenTodoList) {
      // v3.21.54: Stamp when auto-start last fired so settings can show status
      state.lastAutoStartAt = Date.now();
      _safeSaveState(state);
      setTimeout(function() { openPixelFocusWindow('popup.html'); }, 2000);
    }
  });
});

// =============================================================================
// v3.22.78: Opportunistic surveillance check — piggybacks on browser events
// that wake the service worker. Every tab switch, page load, or window focus
// triggers a lightweight check: "is surveillance active and is a nag overdue?"
// This ensures surveillance works even when popup.html isn't open, without
// relying on chrome.alarms (which Brave doesn't wake the SW for).
// =============================================================================
var _lastSurvCheck = 0; // throttle: max once per 30 seconds
function opportunisticSurveillanceCheck() {
  var now = Date.now();
  if (now - _lastSurvCheck < 30000) return; // don't hammer storage
  _lastSurvCheck = now;

  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState;
    if (!state || !state.surveillanceActive) return;
    if (state.surveillanceEndsAt && state.surveillanceEndsAt <= now) return;
    if (state.timerEndsAt && state.timerEndsAt > now) return;
    var _oppNagMs = state.surveillanceNagInterval || 300000;
    if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused' || state.timerState === 'completed') {
      // v3.22.98: Reset nag anchor while timer is active so nag doesn't fire the instant it ends
      if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > (_oppNagMs - 20000)) {
        state.surveillanceLastNag = now;
        _safeSaveState(state);
      }
      return;
    }
    // Buffer: skip if timer ended less than 60s ago (completion flow still writing)
    if (state.timerEndsAt && (now - state.timerEndsAt) < 60000) return;
    if (state.lastCompletedSessionAt && (now - state.lastCompletedSessionAt) < 300000) {
      // v3.22.98: Grace period — reset anchor so nag is from now
      if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > (_oppNagMs - 20000)) {
        state.surveillanceLastNag = now;
        _safeSaveState(state);
      }
      return;
    }

    // Is a nag overdue? Check against user's chosen interval
    var lastNag = state.surveillanceLastNag || 0;
    var anchor = lastNag || state.surveillanceStartedAt || now;
    if ((now - anchor) < _oppNagMs) return; // not yet due

    // Fire the nag — same logic as the alarm handler
    state.surveillanceNagCount = (state.surveillanceNagCount || 0) + 1;
    state.surveillanceLastNag = now;
    var nagNum = state.surveillanceNagCount;

    var penaltyJustApplied = false;
    if (nagNum >= 3 && !state.surveillancePenaltyApplied) {
      state.coins = Math.max(0, (state.coins || 0) - 100);
      state.surveillancePenaltyApplied = true;
      penaltyJustApplied = true;
    }
    if (nagNum >= 3) {
      state.surveillanceNagCount = 0;
    }
    _safeSaveState(state);

    // Notification
    var nagTitle = penaltyJustApplied ? 'STRIKE 3 — $100 PENALTY'
                 : nagNum >= 3 ? 'STRIKE 3 — No focus timer running!'
                 : nagNum === 2 ? 'STRIKE 2 — Next one costs $100!'
                 : 'Surveillance: No focus timer running!';
    var nagMsg = penaltyJustApplied ? 'You just lost $100. Start a focus timer.'
               : nagNum >= 3 ? 'Penalty already applied. Start a timer.'
               : nagNum === 2 ? 'This is your warning. Strike 3 deducts $100.'
               : 'Nag 1/3 — Start a focus timer! Ignoring this costs you.';
    try {
      chrome.notifications.create('surveillance-opp-' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon128.png',
        title: nagTitle, message: nagMsg,
        priority: 2, requireInteraction: false
      });
    } catch(_){}

    // Open surveillance window + Cold Turkey
    var nagPath = 'surveillance-nag.html' + (penaltyJustApplied ? '?penalty=1' : '');
    try { openNagPopup(nagPath); } catch(_){}
    setTimeout(function() {
      try {
        chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', { action: 'open' }, function() {});
      } catch(_){}
    }, 3000);
  });
}



// ===== v3.23.96: Bedtime reminder alarm =====
// Fires a pop-out window 30 min before the user's set bedtime.
// Also fires a morning check-in on first extension open the next day.

function setupBedtimeAlarm() {
  try { chrome.alarms.clear('pixelfocus-bedtime-reminder'); } catch(_) {}
  try { chrome.alarms.clear('pixelfocus-bedtime-check'); } catch(_) {}

  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState || {};
    if (!state.bedtimeReminderEnabled) return;
    if (!state.sleepTimeEnabled) return;

    // Set recurring alarm that checks every 5 minutes
    chrome.alarms.create('pixelfocus-bedtime-check', { periodInMinutes: 5 });
    console.log('[Bedtime] Alarm set — checking every 5 min for bedtime window');
  });
}

// Run on startup
setupBedtimeAlarm();
// Re-check when state changes (user toggles bedtime on/off)
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === 'local' && changes.pixelFocusState) {
    var oldVal = changes.pixelFocusState.oldValue || {};
    var newVal = changes.pixelFocusState.newValue || {};
    if (oldVal.bedtimeReminderEnabled !== newVal.bedtimeReminderEnabled ||
        oldVal.sleepTimeEnabled !== newVal.sleepTimeEnabled ||
        oldVal.sleepHour !== newVal.sleepHour ||
        oldVal.sleepMinute !== newVal.sleepMinute) {
      setupBedtimeAlarm();
    }
  }
});

// Wire into browser events that wake the service worker
chrome.tabs.onActivated.addListener(function() { opportunisticSurveillanceCheck(); });
chrome.tabs.onUpdated.addListener(function(tabId, info) {
  if (info.status === 'complete') opportunisticSurveillanceCheck();
});
chrome.windows.onFocusChanged.addListener(function() { opportunisticSurveillanceCheck(); });
