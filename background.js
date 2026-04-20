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

function applyPromisePenalty() {
  console.log('[PromiseTimer] applyPromisePenalty called. resolved=' + _promiseTimerResolved + ', windowId=' + _promiseTimerWindowId);
  if (_promiseTimerResolved) {
    console.log('[PromiseTimer] Already resolved (timer was started or penalty already applied). Skipping.');
    return;
  }
  _promiseTimerResolved = true;
  _promiseTimerWindowId = null;
  try { chrome.alarms.clear('pixelfocus-promise-deadline'); } catch(_) {}

  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState || {};

    // SAFETY: Double-check if a focus timer is currently running.
    // This catches edge cases where the storage listener didn't fire in time.
    if (state.timerState === 'running' || state.timerState === 'countdown') {
      console.log('[PromiseTimer] SAFETY CHECK: Timer is actually running (state=' + state.timerState + '). Penalty CANCELLED.');
      return;
    }

    // SAFETY: If the promise timer was opened less than 10 seconds ago, skip.
    // This prevents misfires from race conditions during window creation.
    if (_promiseTimerStartedAt && (Date.now() - _promiseTimerStartedAt) < 10000) {
      console.log('[PromiseTimer] SAFETY CHECK: Promise timer opened <10s ago. Possible misfire. Penalty CANCELLED.');
      return;
    }

    var prevCoins = state.coins || 0;
    state.coins = Math.max(0, prevCoins - PROMISE_PENALTY);
    chrome.storage.local.set({ pixelFocusState: state });
    console.log('[PromiseTimer] PENALTY APPLIED: $' + PROMISE_PENALTY + ' deducted. Coins: ' + prevCoins + ' → ' + state.coins);

    // Notification so the player knows what happened
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
  _penaltyTimerResolved = true;
  _penaltyTimerWindowId = null;
  try { chrome.alarms.clear('pixelfocus-penalty-deadline'); } catch(_) {}

  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState || {};

    if (state.timerState === 'running' || state.timerState === 'countdown') {
      console.log('[PenaltyTimer] SAFETY CHECK: Timer is running (state=' + state.timerState + '). Penalty CANCELLED.');
      return;
    }
    if (_penaltyTimerStartedAt && (Date.now() - _penaltyTimerStartedAt) < 10000) {
      console.log('[PenaltyTimer] SAFETY CHECK: Opened <10s ago. Possible misfire. Penalty CANCELLED.');
      return;
    }

    var prevCoins = state.coins || 0;
    state.coins = Math.max(0, prevCoins - PENALTY_TIMER_PENALTY);
    chrome.storage.local.set({ pixelFocusState: state });
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

  if (newState.timerState === 'running' || newState.timerState === 'countdown') {
    // v3.22.92: Reset consecutive NOs — they're focusing now
    if (newState.surveillanceConsecutiveNos > 0) {
      newState.surveillanceConsecutiveNos = 0;
      chrome.storage.local.set({ pixelFocusState: newState });
      console.log('[Surveillance] Consecutive NOs reset — focus timer started.');
    }

    // Cancel promise timer penalty if active
    if (!_promiseTimerResolved && _promiseTimerWindowId) {
      console.log('[PromiseTimer] Focus timer started (detected via storage change). Penalty CANCELLED. timerState=' + newState.timerState);
      _promiseTimerResolved = true;
      try { chrome.alarms.clear('pixelfocus-promise-deadline'); } catch(_) {}
      _promiseTimerWindowId = null;
    }

    // Cancel penalty timer if active
    if (!_penaltyTimerResolved && _penaltyTimerWindowId) {
      console.log('[PenaltyTimer] Focus timer started (detected via storage change). Penalty CANCELLED. timerState=' + newState.timerState);
      _penaltyTimerResolved = true;
      try { chrome.alarms.clear('pixelfocus-penalty-deadline'); } catch(_) {}
      _penaltyTimerWindowId = null;
    }
  }
});

// If the promise/penalty timer window is closed before resolving → penalty
chrome.windows.onRemoved.addListener(function(windowId) {
  if (windowId === _promiseTimerWindowId && !_promiseTimerResolved) {
    console.log('[PromiseTimer] Window ' + windowId + ' was CLOSED before resolution. Applying penalty after 1s safety delay...');
    setTimeout(function() {
      if (_promiseTimerResolved) {
        console.log('[PromiseTimer] Resolved during safety delay. Penalty skipped.');
        return;
      }
      applyPromisePenalty();
    }, 1000);
  }
  if (windowId === _penaltyTimerWindowId && !_penaltyTimerResolved) {
    console.log('[PenaltyTimer] Window ' + windowId + ' was CLOSED before resolution. Applying penalty after 1s safety delay...');
    setTimeout(function() {
      if (_penaltyTimerResolved) {
        console.log('[PenaltyTimer] Resolved during safety delay. Penalty skipped.');
        return;
      }
      applyPenaltyTimerPenalty();
    }, 1000);
  }
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg && msg.type === 'pf-open' && typeof msg.path === 'string') {
    openPixelFocusWindow(msg.path);
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
      height: 260,
      focused: true,
      top: 80,
      left: Math.round((screen.availWidth || 1200) - 420)
    }, function(win) {
      if (!isTestPromise && win && win.id) {
        _promiseTimerWindowId = win.id;
        _promiseTimerResolved = false;
        _promiseTimerStartedAt = Date.now();
        console.log('[PromiseTimer] Window opened. windowId=' + win.id + ', deadline in 3 minutes.');
        // Set a 3-minute alarm as the hard deadline
        chrome.alarms.create('pixelfocus-promise-deadline', { delayInMinutes: 3 });
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
    _promiseTimerResolved = true;
    _promiseTimerWindowId = null;
    try { chrome.alarms.clear('pixelfocus-promise-deadline'); } catch(_) {}
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.96: Track promise timer opened directly by surveillance-nag-window.js
  if (msg && msg.type === 'TRACK_PROMISE_TIMER') {
    var trackWinId = msg.windowId;
    if (trackWinId) {
      _promiseTimerWindowId = trackWinId;
      _promiseTimerResolved = false;
      _promiseTimerStartedAt = Date.now();
      console.log('[PromiseTimer] Tracking window opened by nag. windowId=' + trackWinId);
      chrome.alarms.create('pixelfocus-promise-deadline', { delayInMinutes: 3 });
    }
    try { sendResponse({ ok: true }); } catch(_) {}
  }
  // v3.22.96: Track penalty timer opened directly by surveillance-nag-window.js
  if (msg && msg.type === 'TRACK_PENALTY_TIMER') {
    var trackPenWinId = msg.windowId;
    if (trackPenWinId) {
      _penaltyTimerWindowId = trackPenWinId;
      _penaltyTimerResolved = false;
      _penaltyTimerStartedAt = Date.now();
      console.log('[PenaltyTimer] Tracking window opened by nag. windowId=' + trackPenWinId);
      chrome.alarms.create('pixelfocus-penalty-deadline', { delayInMinutes: 3 });
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
      height: 300,
      focused: true,
      top: 80,
      left: Math.round((screen.availWidth || 1200) - 420)
    }, function(win) {
      if (!isTestPenalty && win && win.id) {
        _penaltyTimerWindowId = win.id;
        _penaltyTimerResolved = false;
        _penaltyTimerStartedAt = Date.now();
        console.log('[PenaltyTimer] Window opened. windowId=' + win.id + ', deadline in 3 minutes.');
        chrome.alarms.create('pixelfocus-penalty-deadline', { delayInMinutes: 3 });
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
    _penaltyTimerResolved = true;
    _penaltyTimerWindowId = null;
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

      // Timer currently running or in countdown/paused? Don't nag.
      if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused') return;
      if (state.timerEndsAt && state.timerEndsAt > now) return;
      // Grace period: don't nag within 5 min of completing a session
      if (state.lastCompletedSessionAt && (now - state.lastCompletedSessionAt) < 300000) return;

      // Last STARTED session within 2 hours? All good.
      var TWO_HOURS = 2 * 60 * 60 * 1000;
      var lastSession = state.lastStartedSessionAt || state.lastCompletedSessionAt || 0;
      if (lastSession && (now - lastSession) < TWO_HOURS) return;

      // Don't spam — only open once per 2h window
      var lastIdleOpen = state.coldTurkeyLastIdleOpen || 0;
      if (lastIdleOpen && (now - lastIdleOpen) < TWO_HOURS) return;

      // Fire! Open the challenge window + Cold Turkey + notification
      state.coldTurkeyLastIdleOpen = now;
      state.challengeOfferedAt = now; // v3.22.89: gate so manual navigation can't exploit
      chrome.storage.local.set({ pixelFocusState: state });

      // v3.21.51: Open challenge window (3-min countdown for 1.5x bonus)
      openPixelFocusWindow('challenge.html');

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
  if (alarm.name === 'pixelfocus-focus-idle') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      if (state.focusIdleReminder === false) return;

      var now = Date.now();

      // Timer currently running, counting down, or paused? Don't nag.
      if (state.timerEndsAt && state.timerEndsAt > now) return;
      if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused') return;

      // Last STARTED session within 2 hours? All good.
      var TWO_HOURS = 2 * 60 * 60 * 1000;
      var lastSession = state.lastStartedSessionAt || state.lastCompletedSessionAt || 0;
      if (lastSession && (now - lastSession) < TWO_HOURS) return;

      // Don't spam — only nudge once per 2h window
      var lastNudge = state.focusIdleLastNudge || 0;
      if (lastNudge && (now - lastNudge) < TWO_HOURS) return;

      state.focusIdleLastNudge = now;
      chrome.storage.local.set({ pixelFocusState: state });

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
        chrome.storage.local.set({ pixelFocusState: state });
        return;
      }

      // Timer running, in countdown, completed, or recently completed? Skip.
      // v3.22.98: Also check 'completed' state — fires between timer end and user clicking confirmation
      if (state.timerEndsAt && state.timerEndsAt > now) return;
      if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused' || state.timerState === 'completed') {
        // Reset nag anchor so it doesn't fire the SECOND the timer ends
        if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > 280000) {
          state.surveillanceLastNag = now;
          chrome.storage.local.set({ pixelFocusState: state });
        }
        return;
      }
      if (state.lastCompletedSessionAt && (now - state.lastCompletedSessionAt) < 300000) {
        // Grace period — also reset nag anchor so nag is 5 min from NOW, not from session start
        if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > 280000) {
          state.surveillanceLastNag = now;
          chrome.storage.local.set({ pixelFocusState: state });
        }
        return;
      }

      // Respect the 5-min nag interval — don't double-fire with page-side
      var lastNag = state.surveillanceLastNag || 0;
      if (lastNag && (now - lastNag) < 280000) return; // 4m40s to avoid edge races with page-side 5m

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
      chrome.storage.local.set({ pixelFocusState: state });

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
      try { openPixelFocusWindow(nagPath); } catch(_){}
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
        chrome.storage.local.set({ pixelFocusState: state });
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
        chrome.storage.local.set({ pixelFocusState: state });

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
                    chrome.storage.local.set({ pixelFocusState: st });
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

    chrome.storage.local.set({ pixelFocusState: state });
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
      chrome.storage.local.set({ pixelFocusState: state });
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
      chrome.storage.local.set({ pixelFocusState: state });
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
  chrome.alarms.clear('pixelfocus-tick');

  // v3.21.49: Auto-open todo list on browser startup if enabled
  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState;
    if (state && state.autoReopenTodoList) {
      // v3.21.54: Stamp when auto-start last fired so settings can show status
      state.lastAutoStartAt = Date.now();
      chrome.storage.local.set({ pixelFocusState: state });
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
    if (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused' || state.timerState === 'completed') {
      // v3.22.98: Reset nag anchor while timer is active so nag doesn't fire the instant it ends
      if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > 280000) {
        state.surveillanceLastNag = now;
        chrome.storage.local.set({ pixelFocusState: state });
      }
      return;
    }
    // Buffer: skip if timer ended less than 60s ago (completion flow still writing)
    if (state.timerEndsAt && (now - state.timerEndsAt) < 60000) return;
    if (state.lastCompletedSessionAt && (now - state.lastCompletedSessionAt) < 300000) {
      // v3.22.98: Grace period — reset anchor so nag is 5 min from now
      if (state.surveillanceLastNag && (now - state.surveillanceLastNag) > 280000) {
        state.surveillanceLastNag = now;
        chrome.storage.local.set({ pixelFocusState: state });
      }
      return;
    }

    // Is a nag overdue? (5 min since last nag or surveillance start)
    var lastNag = state.surveillanceLastNag || 0;
    var anchor = lastNag || state.surveillanceStartedAt || now;
    if ((now - anchor) < 300000) return; // not yet due

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
    chrome.storage.local.set({ pixelFocusState: state });

    // Notification
    var nagTitle = penaltyJustApplied ? 'STRIKE 3 \u2014 $100 PENALTY'
                 : nagNum >= 3 ? 'STRIKE 3 \u2014 No focus timer running!'
                 : nagNum === 2 ? 'STRIKE 2 \u2014 Next one costs $100!'
                 : 'Surveillance: No focus timer running!';
    var nagMsg = penaltyJustApplied ? 'You just lost $100. Start a focus timer.'
               : nagNum >= 3 ? 'Penalty already applied. Start a timer.'
               : nagNum === 2 ? 'This is your warning. Strike 3 deducts $100.'
               : 'Nag 1/3 \u2014 Start a focus timer! Ignoring this costs you.';
    try {
      chrome.notifications.create('surveillance-opp-' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon128.png',
        title: nagTitle, message: nagMsg,
        priority: 2, requireInteraction: false
      });
    } catch(_){}

    // Open surveillance window + Cold Turkey
    var nagPath = 'surveillance-nag.html' + (penaltyJustApplied ? '?penalty=1' : '');
    try { openPixelFocusWindow(nagPath); } catch(_){}
    setTimeout(function() {
      try {
        chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', { action: 'open' }, function() {});
      } catch(_){}
    }, 3000);
  });
}

// Wire into browser events that wake the service worker
chrome.tabs.onActivated.addListener(function() { opportunisticSurveillanceCheck(); });
chrome.tabs.onUpdated.addListener(function(tabId, info) {
  if (info.status === 'complete') opportunisticSurveillanceCheck();
});
chrome.windows.onFocusChanged.addListener(function() { opportunisticSurveillanceCheck(); });
