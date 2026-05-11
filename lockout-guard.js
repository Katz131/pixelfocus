// lockout-guard.js — v3.23.93
// Page-load lockout enforcement for gamified pages.
// Include this script on factory.html, gallery.html, ratiocinatory.html,
// house.html, bureau.html, employees.html, research.html, incinerator.html,
// brokerage.html.
// Redirects to popup.html if the player shouldn't be here.
//
// Mirrors the isGameLocked() logic from app.js:
//   - If grace period is active → allow
//   - Otherwise → locked (idle lockout, priorities, or timer)

(function() {
  'use strict';
  // Allow tutorial preview access (bypass lockout)
  if (window.location.search.indexOf('tutorial=1') !== -1) return;
  try {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState || {};
      var now = Date.now();

      // Grace period active? Allow access.
      if (state.gameLockGraceUntil && now < state.gameLockGraceUntil) return;

      // v3.23.93: Always locked when grace period is not active.
      // The grace period is the ONLY way to access game pages.
      // Locked — redirect to the to-do list
      try {
        chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
      } catch(_) {}
      // Close this tab after a tiny delay to let the message go through
      setTimeout(function() {
        try { window.close(); } catch(_) {}
      }, 200);
    });
  } catch(_) {}
})();
