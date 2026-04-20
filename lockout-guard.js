// lockout-guard.js — v3.22.82
// Page-load lockout enforcement for gamified pages.
// Include this script on factory.html, gallery.html, ratiocinatory.html,
// house.html, bureau.html, employees.html, research.html, incinerator.html.
// Redirects to popup.html if the player shouldn't be here.
//
// Mirrors the isGameLocked() logic from app.js:
//   - If grace period is active → allow
//   - If timer is running/countdown → locked
//   - If active priority tasks exist → locked
//   - Otherwise → allow

(function() {
  'use strict';
  try {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState || {};
      var now = Date.now();

      // Grace period active? Allow access.
      if (state.gameLockGraceUntil && now < state.gameLockGraceUntil) return;

      // Check lock conditions
      var timerActive = state.timerState === 'running' || state.timerState === 'countdown';

      // Check priority tasks (mirrors isPriorityDueToday + getActivePriorityTasks)
      var hasPriorities = false;
      if (Array.isArray(state.priorityTasks) && state.priorityTasks.length > 0) {
        var d = new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1); if (m.length < 2) m = '0' + m;
        var day = String(d.getDate()); if (day.length < 2) day = '0' + day;
        var todayKey = y + '-' + m + '-' + day;
        var todayWeekday = d.getDay();

        hasPriorities = state.priorityTasks.some(function(p) {
          if (!p) return false;
          // Non-recurring
          if (!p.recurrence || p.recurrence === 'none') return !p.completed;
          // Already done today
          if (p.lastCompletedDate === todayKey) return false;
          // Daily
          if (p.recurrence === 'daily') return true;
          // Weekly
          if (p.recurrence === 'weekly') {
            var weekdays = Array.isArray(p.recurWeekdays) ? p.recurWeekdays : [];
            if (weekdays.length === 0) return true;
            return weekdays.indexOf(todayWeekday) !== -1;
          }
          // Interval
          if (p.recurrence === 'interval') {
            var n = parseInt(p.recurInterval, 10) || 1;
            if (!p.lastCompletedDate) return true;
            // Parse dates and compute delta
            function parseKey(k) {
              var parts = (k || '').split('-');
              if (parts.length !== 3) return 0;
              return new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10)).getTime();
            }
            var delta = Math.round((parseKey(todayKey) - parseKey(p.lastCompletedDate)) / 86400000);
            return delta >= n;
          }
          return !p.completed;
        });
      }

      if (timerActive || hasPriorities) {
        // Locked — redirect to the to-do list
        try {
          chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
        } catch(_) {}
        // Close this tab after a tiny delay to let the message go through
        setTimeout(function() {
          try { window.close(); } catch(_) {}
        }, 200);
      }
    });
  } catch(_) {}
})();
