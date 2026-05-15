// lockout-guard.js -- v3.23.331
// Page-load lockout enforcement for gamified pages.
// Include this script on factory.html, gallery.html, ratiocinatory.html,
// house.html, bureau.html, employees.html, research.html, incinerator.html,
// brokerage.html.
// Redirects to popup.html if the player shouldn't be here.
// During grace period: allows access AND shows floating countdown badge.

(function() {
  'use strict';
  if (window.location.search.indexOf('tutorial=1') !== -1) return;
  try {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState || {};
      var now = Date.now();
      if (state.gameLockGraceUntil && now < state.gameLockGraceUntil) {
        _injectGraceBadge(state.gameLockGraceUntil);
        return;
      }
      try {
        chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
      } catch(_) {}
      setTimeout(function() {
        try { window.close(); } catch(_) {}
      }, 200);
    });
  } catch(_) {}

  function _injectGraceBadge(graceUntil) {
    var badge = document.createElement('div');
    badge.id = 'graceBadge';
    badge.title = "Break time! You have 5 minutes after each focus session to explore game pages. When this runs out, you'll be sent back to the to-do list.";
    badge.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:99999;background:linear-gradient(180deg,#0a2a1a 0%,#061a10 100%);border:2px solid #00ff88;border-radius:12px;padding:6px 14px;font-family:"Press Start 2P",monospace;box-shadow:0 2px 16px rgba(0,255,136,0.35);display:flex;align-items:center;gap:8px;cursor:default;transition:border-color 0.3s,box-shadow 0.3s;';

    var label = document.createElement('span');
    label.style.cssText = 'font-size:7px;color:#00ff88;letter-spacing:1px;text-shadow:0 0 6px rgba(0,255,136,0.4);';
    label.textContent = '⏳';
    badge.appendChild(label);

    var clock = document.createElement('span');
    clock.id = 'graceBadgeClock';
    clock.style.cssText = 'font-size:11px;color:#fff;text-shadow:0 0 8px rgba(0,255,136,0.5);min-width:36px;text-align:center;';
    clock.textContent = '0:00';
    badge.appendChild(clock);

    var styleTag = document.createElement('style');
    styleTag.textContent = '@keyframes graceBadgePulse{0%,100%{opacity:1;border-color:#ff4444;box-shadow:0 2px 16px rgba(255,68,68,0.4);}50%{opacity:0.7;border-color:#ff6666;box-shadow:0 2px 8px rgba(255,68,68,0.2);}}.grace-badge-urgent{animation:graceBadgePulse 0.8s ease-in-out infinite !important;}.grace-badge-urgent #graceBadgeClock{color:#ff4444 !important;text-shadow:0 0 8px rgba(255,68,68,0.5) !important;}';
    badge.appendChild(styleTag);
    document.body.appendChild(badge);

    function tick() {
      var remaining = graceUntil - Date.now();
      if (remaining <= 0) {
        badge.remove();
        try {
          chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
        } catch(_) {}
        setTimeout(function() {
          try { window.close(); } catch(_) {}
        }, 200);
        return;
      }
      var mins = Math.floor(remaining / 60000);
      var secs = Math.floor((remaining % 60000) / 1000);
      var clockEl = document.getElementById('graceBadgeClock');
      if (clockEl) clockEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      if (remaining < 60000) {
        badge.classList.add('grace-badge-urgent');
      }
      setTimeout(tick, 1000);
    }
    tick();
  }
})();
