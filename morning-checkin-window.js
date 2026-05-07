// morning-checkin-window.js — v3.23.98
// Handles the morning bedtime check-in pop-out.
// Two-step flow:
//   Step 1: "Is this the morning after, or are you still up?"
//   Step 2 (if morning): "Did you go to bed on time?"
// If user says "still up" AND it's past their bedtime, streak broken.
// If user says "still up" AND before bedtime, just dismiss, no penalty.

(function() {
  'use strict';

  // Sound engine
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
      success: function() { [523,659,784,1047,1318].forEach(function(f,i) { setTimeout(function() { tone(f,0.12,'sine',0.1); }, i*100); }); },
      badge: function() { [784,988,1175,1568,1175,1568].forEach(function(f,i) { setTimeout(function() { tone(f,0.15,'sine',0.12); }, i*120); }); },
      fail: function() { tone(300, 0.2, 'triangle', 0.04); },
      dismiss: function() { tone(400, 0.1, 'triangle', 0.03); }
    };
  })();

  // Badge definitions (sleep only -- keep in sync with badges-window.js)
  var BADGES = [
    { id: 'early_bird_1',   name: 'Early Bird',      icon: '🐤', desc: '5 nights on time',   req: 5 },
    { id: 'sleep_warrior',  name: 'Sleep Warrior',   icon: '🛡️', desc: '10 nights on time',  req: 10 },
    { id: 'dream_weaver',   name: 'Dream Weaver',    icon: '🌀', desc: '15 nights on time',  req: 15 },
    { id: 'night_master',   name: 'Night Master',    icon: '🌙', desc: '25 nights on time',  req: 25 },
    { id: 'sleep_sage',     name: 'Sleep Sage',      icon: '🧘', desc: '40 nights on time',  req: 40 },
    { id: 'lunar_legend',   name: 'Lunar Legend',    icon: '🌕', desc: '60 nights on time',  req: 60 },
    { id: 'rest_royalty',   name: 'Rest Royalty',    icon: '👑', desc: '90 nights on time',  req: 90 },
    { id: 'eternal_dreamer',name: 'Eternal Dreamer', icon: '💫', desc: '150 nights on time', req: 150 }
  ];

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

  function renderStreak() {
    var streak = state.bedtimeStreak || 0;
    var dotsEl = document.getElementById('streakDots');
    var textEl = document.getElementById('streakText');
    if (!dotsEl || !textEl) return;
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

  function checkForNewBadge(totalSuccesses) {
    if (!Array.isArray(state.badges)) state.badges = [];
    for (var i = BADGES.length - 1; i >= 0; i--) {
      var b = BADGES[i];
      if (totalSuccesses >= b.req && state.badges.indexOf(b.id) === -1) {
        state.badges.push(b.id);
        return b;
      }
    }
    return null;
  }

  // Is the current time past the user's set bedtime?
  function isPastBedtime() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var bedH = typeof state.sleepHour === 'number' ? state.sleepHour : 23;
    var bedM = typeof state.sleepMinute === 'number' ? state.sleepMinute : 0;
    var bedMin = bedH * 60 + bedM;
    // Evening bedtime (18:00+): past if nowMin >= bedMin OR early morning (before noon)
    if (bedMin >= 1080) {
      return nowMin >= bedMin || nowMin < 720;
    }
    return nowMin >= bedMin;
  }

  function showResult(success, newBadge) {
    var tc = document.getElementById('timeCheckSection');
    var bc = document.getElementById('bedtimeCheckSection');
    if (tc) tc.style.display = 'none';
    if (bc) bc.style.display = 'none';

    var result = document.getElementById('resultSection');
    result.style.display = 'block';

    if (success) {
      var streak = state.bedtimeStreak || 0;
      document.getElementById('resultIcon').textContent = '🌟';
      document.getElementById('resultText').style.color = '#00ff88';
      document.getElementById('resultText').textContent = streak + ' NIGHT STREAK!';
      var msgs = [
        'Your future self thanks you.',
        'Sleep is the best productivity hack.',
        'Rest well, work well.',
        'Consistency builds character.',
        'The loom rewards discipline.'
      ];
      document.getElementById('resultSub').textContent = msgs[Math.floor(Math.random() * msgs.length)];

      if (newBadge) {
        var bu = document.getElementById('badgeUnlock');
        bu.style.display = 'block';
        document.getElementById('newBadgeIcon').textContent = newBadge.icon;
        document.getElementById('newBadgeName').textContent = 'NEW BADGE: ' + newBadge.name.toUpperCase();
        document.getElementById('newBadgeDesc').textContent = newBadge.desc;
      }
    } else {
      document.getElementById('resultIcon').textContent = '😴';
      document.getElementById('resultText').style.color = '#ff6b6b';
      document.getElementById('resultText').textContent = 'STREAK RESET';
      document.getElementById('resultSub').textContent = 'No worries — tonight is a fresh start. Try again.';
    }

    setTimeout(function() {
      try { window.close(); } catch(_) {}
    }, newBadge ? 7000 : 4500);
  }

  // Wire all buttons
  function wireAll() {
    var morningBtn = document.getElementById('morningBtn');
    var stillUpBtn = document.getElementById('stillUpBtn');
    var yesBtn = document.getElementById('yesBtn');
    var noBtn = document.getElementById('noBtn');

    // Step 1: "It's morning" -- show the bedtime check
    morningBtn.addEventListener('click', function() {
      SFX.dismiss();
      document.getElementById('timeCheckSection').style.display = 'none';
      document.getElementById('bedtimeCheckSection').style.display = 'block';
      renderStreak();
    });

    // Step 1: "Still up" -- check if past bedtime
    stillUpBtn.addEventListener('click', function() {
      if (isPastBedtime()) {
        // Past bedtime and still awake = streak broken
        SFX.fail();
        state.bedtimeStreak = 0;
        state.bedtimeMorningPending = false;
        state.bedtimeLastConfirmDate = todayStr();
        save();

        var tc = document.getElementById('timeCheckSection');
        if (tc) tc.style.display = 'none';
        var result = document.getElementById('resultSection');
        result.style.display = 'block';
        document.getElementById('resultIcon').textContent = '🦉';
        document.getElementById('resultText').style.color = '#ff6b6b';
        document.getElementById('resultText').textContent = 'STILL UP PAST BEDTIME';
        document.getElementById('resultSub').textContent = 'Your streak has been reset. Get some rest!';

        setTimeout(function() {
          try { window.close(); } catch(_) {}
        }, 4000);
      } else {
        // Not past bedtime yet -- dismiss, don't repeat for 2 hours
        SFX.dismiss();
        state.bedtimeCheckinDismissedAt = Date.now();
        save();
        try { window.close(); } catch(_) {}
      }
    });

    // Step 2: "Yes, I went to bed on time"
    yesBtn.addEventListener('click', function() {
      state.bedtimeStreak = (state.bedtimeStreak || 0) + 1;
      state.bedtimeTotalSuccesses = (state.bedtimeTotalSuccesses || 0) + 1;
      if (state.bedtimeStreak > (state.bedtimeBestStreak || 0)) {
        state.bedtimeBestStreak = state.bedtimeStreak;
      }
      state.bedtimeLastConfirmDate = todayStr();
      state.bedtimeMorningPending = false;
      var newBadge = checkForNewBadge(state.bedtimeTotalSuccesses);
      save();
      if (newBadge) { SFX.badge(); } else { SFX.success(); }
      showResult(true, newBadge);
    });

    // Step 2: "No, I didn't"
    noBtn.addEventListener('click', function() {
      SFX.fail();
      state.bedtimeStreak = 0;
      state.bedtimeMorningPending = false;
      state.bedtimeLastConfirmDate = todayStr();
      save();
      showResult(false, null);
    });
  }

  // Init
  chrome.storage.local.get('pixelFocusState', function(result) {
    state = result.pixelFocusState || {};
    var h = typeof state.sleepHour === 'number' ? state.sleepHour : 23;
    var m = typeof state.sleepMinute === 'number' ? state.sleepMinute : 0;
    var use24 = state.use24Hour !== false;
    document.getElementById('bedtimeDisplay').textContent = formatTime(h, m, use24);
    wireAll();
  });
})();
