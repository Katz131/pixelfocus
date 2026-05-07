// bedtime-window.js — v3.23.96
// Handles the bedtime reminder pop-out window.
// Loaded by bedtime-reminder.html.

(function() {
  'use strict';

  // ===== Sound engine =====
  var SFX = (function() {
    var ctx = null;
    function getCtx() {
      if (!ctx || ctx.state === 'closed') ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol) {
      try {
        var c = getCtx(), o = c.createOscillator(), g = c.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
        g.gain.setValueAtTime(vol || 0.06, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + dur);
      } catch(e) {}
    }
    return {
      check: function() { tone(800, 0.08, 'sine', 0.05); },
      success: function() { [523,659,784,1047].forEach(function(f,i) { setTimeout(function() { tone(f,0.1,'sine',0.08); }, i*80); }); },
      dismiss: function() { tone(300, 0.15, 'triangle', 0.04); }
    };
  })();

  // ===== State =====
  var state = {};

  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }

  function save() {
    chrome.storage.local.set({ pixelFocusState: state });
  }

  function formatTime(h, m, use24) {
    if (use24) {
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  // ===== Render streak dots =====
  function renderStreak() {
    var streak = state.bedtimeStreak || 0;
    var dotsEl = document.getElementById('streakDots');
    var textEl = document.getElementById('streakText');
    if (!dotsEl || !textEl) return;

    // Show progress toward next badge (every 5 nights)
    var inCycle = streak % 5;
    textEl.textContent = 'STREAK: ' + streak + ' NIGHT' + (streak === 1 ? '' : 'S');

    dotsEl.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var dot = document.createElement('div');
      dot.className = 'streak-dot';
      if (i < inCycle) dot.classList.add('filled');
      if (i === inCycle) dot.classList.add('current');
      dotsEl.appendChild(dot);
    }
  }

  // ===== Checklist interaction =====
  function wireChecklist() {
    var items = document.querySelectorAll('.check-item');
    items.forEach(function(item) {
      item.addEventListener('click', function() {
        var box = item.querySelector('.check-box');
        if (box.classList.contains('checked')) {
          box.classList.remove('checked');
          item.classList.remove('done');
        } else {
          box.classList.add('checked');
          item.classList.add('done');
          SFX.check();
        }
      });
    });
  }

  // ===== Button handlers =====
  function wireButtons() {
    var yesBtn = document.getElementById('yesBtn');
    var noBtn = document.getElementById('noBtn');

    yesBtn.addEventListener('click', function() {
      SFX.success();
      // Mark that we need a morning check-in tomorrow
      state.bedtimeMorningPending = true;
      state.bedtimeMorningDate = todayStr();
      state.bedtimeLastReminderDate = todayStr();
      save();
      showResult(true);
    });

    noBtn.addEventListener('click', function() {
      SFX.dismiss();
      // Reset streak — they said no
      state.bedtimeStreak = 0;
      state.bedtimeLastReminderDate = todayStr();
      state.bedtimeMorningPending = false;
      save();
      showResult(false);
    });
  }

  function showResult(committed) {
    document.getElementById('checklistSection').style.display = 'none';
    document.getElementById('streakBar').style.display = 'none';
    document.getElementById('actionBtns').style.display = 'none';

    var result = document.getElementById('resultSection');
    result.style.display = 'block';

    if (committed) {
      document.getElementById('resultIcon').textContent = '✨';
      document.getElementById('resultText').textContent = 'GOOD NIGHT!';
      document.getElementById('resultSub').textContent = 'We\'ll check in with you tomorrow morning. Sweet dreams.';
    } else {
      document.getElementById('resultIcon').textContent = '🦉';
      document.getElementById('resultText').textContent = 'NIGHT OWL MODE';
      document.getElementById('resultSub').textContent = 'No judgement. Your streak has been reset. Try again tomorrow.';
    }

    // Auto-close after 4 seconds
    setTimeout(function() {
      try { window.close(); } catch(_) {}
    }, 4000);
  }

  // ===== Init =====
  chrome.storage.local.get('pixelFocusState', function(result) {
    state = result.pixelFocusState || {};

    // Display bedtime
    var h = typeof state.sleepHour === 'number' ? state.sleepHour : 23;
    var m = typeof state.sleepMinute === 'number' ? state.sleepMinute : 0;
    var use24 = state.use24Hour !== false;
    document.getElementById('bedtimeDisplay').textContent = formatTime(h, m, use24);

    renderStreak();
    wireChecklist();
    wireButtons();
  });
})();
