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

chrome.action.onClicked.addListener(function() {
  openPixelFocusWindow('popup.html');
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg && msg.type === 'pf-open' && typeof msg.path === 'string') {
    openPixelFocusWindow(msg.path);
    sendResponse({ ok: true });
  }
  return false;
});

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name !== 'pixelfocus-daycheck') return;
  chrome.storage.local.get('pixelFocusState', function(result) {
    var state = result.pixelFocusState;
    if (!state) return;
    var today = new Date().toISOString().slice(0, 10);
    if (state.lastActiveDate === today) return;

    if (state.lastActiveDate) {
      var last = new Date(state.lastActiveDate);
      var now = new Date(today);
      var diffDays = Math.floor((now - last) / 86400000);
      if (diffDays === 1 && state.todayBlocks > 0) {
        state.streak = (state.streak || 0) + 1;
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
    // above, so the canvas naturally appears empty at the user's owned size.
    state.marathonBonusesToday = [];
    state.lastActiveDate = today;
    state.sessionBlocks = 0;

    chrome.storage.local.set({ pixelFocusState: state });
  });
});

chrome.runtime.onInstalled.addListener(function() {
  chrome.alarms.create('pixelfocus-daycheck', { periodInMinutes: 30 });
  chrome.alarms.clear('pixelfocus-tick');
});

chrome.runtime.onStartup.addListener(function() {
  chrome.alarms.create('pixelfocus-daycheck', { periodInMinutes: 30 });
  chrome.alarms.clear('pixelfocus-tick');
});
