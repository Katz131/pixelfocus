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

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg && msg.type === 'pf-open' && typeof msg.path === 'string') {
    openPixelFocusWindow(msg.path);
    sendResponse({ ok: true });
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
  // v3.21.44: Cold Turkey idle reminder — check every 15 min
  // This one opens challenge.html + Cold Turkey blocker (requires CT toggle)
  if (alarm.name === 'pixelfocus-ct-idle') {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state || !state.coldTurkeyIdleReminder) return;

      var now = Date.now();

      // Timer currently running? Don't nag.
      if (state.timerEndsAt && state.timerEndsAt > now) return;

      // Last STARTED session within 2 hours? All good.
      var TWO_HOURS = 2 * 60 * 60 * 1000;
      var lastSession = state.lastStartedSessionAt || state.lastCompletedSessionAt || 0;
      if (lastSession && (now - lastSession) < TWO_HOURS) return;

      // Don't spam — only open once per 2h window
      var lastIdleOpen = state.coldTurkeyLastIdleOpen || 0;
      if (lastIdleOpen && (now - lastIdleOpen) < TWO_HOURS) return;

      // Fire! Open the challenge window + Cold Turkey + notification
      state.coldTurkeyLastIdleOpen = now;
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

  // v3.22.27: Surveillance Mode — nag every 5 min, escalate after 3 ignored
  if (alarm.name === 'pixelfocus-surveillance') {
    console.log('[Surveillance] Alarm fired at', new Date().toLocaleTimeString());
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) { console.log('[Surveillance] No state'); return; }
      if (!state.surveillanceActive) { console.log('[Surveillance] Not active'); return; }

      var now = Date.now();

      // Expired?
      if (state.surveillanceEndsAt && state.surveillanceEndsAt <= now) {
        state.surveillanceActive = false;
        state.surveillanceNagCount = 0;
        chrome.storage.local.set({ pixelFocusState: state });
        return;
      }

      console.log('[Surveillance] Active, endsAt:', state.surveillanceEndsAt, 'now:', now, 'nagCount:', state.surveillanceNagCount, 'lastStart:', state.lastStartedSessionAt, 'timerEndsAt:', state.timerEndsAt);

      // Timer currently running? Reset nag count and skip.
      if (state.timerEndsAt && state.timerEndsAt > now) {
        if (state.surveillanceNagCount > 0) {
          state.surveillanceNagCount = 0;
          chrome.storage.local.set({ pixelFocusState: state });
        }
        return;
      }

      // Recently started a timer? (within last 5 min) Reset and skip.
      var lastStart = state.lastStartedSessionAt || 0;
      if (lastStart && (now - lastStart) < 300000) {
        if (state.surveillanceNagCount > 0) {
          state.surveillanceNagCount = 0;
          chrome.storage.local.set({ pixelFocusState: state });
        }
        return;
      }

      // Increment nag count
      state.surveillanceNagCount = (state.surveillanceNagCount || 0) + 1;
      state.surveillanceLastNag = now;
      chrome.storage.local.set({ pixelFocusState: state });

      var nagNum = state.surveillanceNagCount;

      // Escalation: 1-2 = notification only, 3+ = surveillance nag window + Cold Turkey
      if (nagNum >= 3) {
        // ESCALATION: Close all extension tabs except popup.html, then open surveillance nag
        var extOrigin = chrome.runtime.getURL('');
        try {
          chrome.tabs.query({}, function(tabs) {
            var toClose = [];
            for (var t = 0; t < tabs.length; t++) {
              var tUrl = tabs[t].url || '';
              if (tUrl.indexOf(extOrigin) === 0 && tUrl.indexOf('popup.html') === -1) {
                toClose.push(tabs[t].id);
              }
            }
            if (toClose.length > 0) chrome.tabs.remove(toClose);
          });
        } catch(_){}
        // Open surveillance nag window after brief delay for tab cleanup
        setTimeout(function() {
          try { openPixelFocusWindow('surveillance-nag.html'); } catch(_){}
        }, 300);
        setTimeout(function() {
          try {
            chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', { action: 'open' }, function() {
              if (chrome.runtime.lastError) {}
            });
          } catch(_){}
        }, 3000);
        try {
          chrome.notifications.create('surveillance-nag', {
            type: 'basic', iconUrl: 'icons/icon128.png',
            title: 'SURVEILLANCE: Start focusing!',
            message: 'Strike ' + nagNum + '! Cold Turkey opened. Start a focus timer NOW.',
            priority: 2, requireInteraction: false
          });
        } catch(_){}
        // Reset nag count after escalation so it cycles: 3 nags -> escalation -> reset -> 3 nags -> escalation...
        state.surveillanceNagCount = 0;
        chrome.storage.local.set({ pixelFocusState: state });
      } else {
        // Normal nag: notification (uses same ID to replace previous, no pileup)
        try {
          chrome.notifications.create('surveillance-nag', {
            type: 'basic', iconUrl: 'icons/icon128.png',
            title: 'Surveillance: No focus timer running!',
            message: 'Nag ' + nagNum + '/3 — Start a focus timer! Next escalation opens Cold Turkey.',
            priority: 2, requireInteraction: false
          });
        } catch(_){}
      }
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
