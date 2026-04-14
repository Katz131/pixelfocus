// =============================================================================
// profile-window.js — v3.20.26
//
// Renders the Profile tab from chrome.storage state. Reads the same
// STATE_KEY that popup.html / app.js use ('pixelFocusState') and walks
// the saved JSON to populate:
//   - Avatar canvas (state.profilePicture snapshot)
//   - Display name + tagline (inline-editable, write-back on blur/Enter)
//   - Level + title + XP bar (derived from state.xp)
//   - Daily streak + longest streak + XP bonus
//   - Work ledger, today/combo stats, and game-progress stats
//   - Lives lost memorial (personnelDepartures + incineratorBurned)
//
// This file is read-only for gameplay numbers. The only state it writes
// back are displayName and tagline. All other panels are derived.
// =============================================================================
(function() {
  'use strict';

  var STATE_KEY = 'pixelFocusState';
  var currentState = null;

  // ---- XP / Level helpers (kept in sync with app.js) ----
  var BASE_XP_PER_BLOCK = 10;
  function xpForLevel(level) {
    return level * 50;
  }
  function getLevelFromXP(totalXP) {
    var level = 1;
    var xpNeeded = 0;
    while (level < 100) {
      var nextLevelXP = xpForLevel(level + 1);
      if (xpNeeded + nextLevelXP > totalXP) {
        return {
          level: level,
          currentXP: totalXP - xpNeeded,
          nextLevelXP: nextLevelXP,
          totalXP: totalXP
        };
      }
      xpNeeded += nextLevelXP;
      level++;
    }
    return { level: 100, currentXP: 0, nextLevelXP: 1, totalXP: totalXP };
  }

  // Trim the huge title ladder from app.js down to the thresholds we need.
  // These must be kept in sync with getLevelTitle(level) in app.js.
  function getLevelTitle(level) {
    if (level >= 100) return 'Omnifabric Singularity';
    if (level >= 90)  return 'Quasar-Class Loom Consciousness';
    if (level >= 80)  return 'Distributed Loom Intelligence';
    if (level >= 70)  return 'Orbital Loom Investor';
    if (level >= 60)  return 'Loom Venture Capitalist';
    if (level >= 50)  return 'Solar Weaver';
    if (level >= 45)  return 'Master of Markets';
    if (level >= 40)  return 'Lord of the Spinning Jennies';
    if (level >= 35)  return 'Mill Magnate';
    if (level >= 30)  return 'Warden of the Floor';
    if (level >= 25)  return 'Foreman of the Jacquards';
    if (level >= 20)  return 'Senior Weaver';
    if (level >= 15)  return 'Heddlekeeper';
    if (level >= 10)  return 'Journeyman Weaver';
    if (level >= 5)   return 'Apprentice Weaver';
    return 'Would-Be Weaver';
  }

  function getStreakBonus(streak) {
    return 1.0 + Math.min(streak, 10) * 0.05;
  }

  // ---- Compact formatters ----
  function fmtNum(n) {
    n = parseInt(n, 10) || 0;
    if (n < 1000) return String(n);
    if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    if (n < 1000000) return Math.round(n / 1000) + 'k';
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  function fmtCoins(n) {
    n = Math.floor(parseInt(n, 10) || 0);
    return '$' + n.toLocaleString();
  }
  function fmtMinutes(mins) {
    mins = parseInt(mins, 10) || 0;
    if (mins < 60) return mins + ' min';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h < 24) return h + 'h ' + (m ? (m + 'm') : '');
    var d = Math.floor(h / 24);
    var hh = h % 24;
    return d + 'd ' + hh + 'h';
  }
  function fmtDate(ts) {
    if (!ts) return '\u2014';
    try {
      var d = new Date(ts);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) { return '\u2014'; }
  }

  // ---- Streak flavor text (Duolingo-ish) ----
  function streakFlavor(streak) {
    if (streak <= 0) return 'No streak yet. Complete one focus session today to light the fire.';
    if (streak === 1) return 'Day 1. Small embers. Keep showing up and it becomes a habit.';
    if (streak < 4)   return 'Getting warm. The kettle is noticing.';
    if (streak < 7)   return 'A respectable run. The foreman has marked it down.';
    if (streak < 14)  return 'A proper streak now. Don\u2019t let the floor go cold on you.';
    if (streak < 30)  return 'The loom knows your footsteps. Dangerous territory for missed days.';
    if (streak < 60)  return 'You are now a fixture. The standing office has filed a note.';
    if (streak < 120) return 'Institutional. The ledger accepts your streak without comment.';
    return 'Legend-tier consistency. The factory quietly adjusts its expectations upward.';
  }

  // ---- Avatar renderer ----
  function renderAvatar(state) {
    var canvas = document.getElementById('profileCanvas');
    var empty = document.getElementById('avatarEmpty');
    if (!canvas || !empty) return;
    var pfp = state && state.profilePicture;
    if (!pfp || !pfp.pixels || !pfp.size) {
      canvas.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    canvas.style.display = 'block';
    empty.style.display = 'none';
    if (canvas.width !== pfp.size) canvas.width = pfp.size;
    if (canvas.height !== pfp.size) canvas.height = pfp.size;
    var cx = canvas.getContext('2d');
    cx.clearRect(0, 0, pfp.size, pfp.size);
    cx.fillStyle = '#08080f';
    cx.fillRect(0, 0, pfp.size, pfp.size);
    Object.keys(pfp.pixels).forEach(function(k) {
      var parts = k.split(',');
      cx.fillStyle = pfp.pixels[k];
      cx.fillRect(parseInt(parts[0], 10), parseInt(parts[1], 10), 1, 1);
    });
  }

  // ---- Placeholder helper for contenteditable ----
  function applyPlaceholder(el, value) {
    if (!el) return;
    if (value && value.length > 0) {
      el.textContent = value;
      el.classList.remove('is-placeholder');
      el.style.color = '';
    } else {
      el.textContent = el.getAttribute('data-placeholder') || '';
      el.classList.add('is-placeholder');
      el.style.color = 'var(--text-dim)';
    }
  }

  // ---- Count unlocked buildings ----
  function countBuildings(state) {
    // 5 annex buildings in the factory-hub: Gallery, Ratiocinatory,
    // House (always), Research Lab, Incinerator. The first two are implicit
    // once you've hit stage 1+. We use explicit unlock flags where they
    // exist and fall back to tier gates otherwise.
    var unlocked = 0;
    // House is always accessible.
    unlocked++;
    // Gallery: accessible once the player has saved at least one loom or
    // has the gallery unlock flag. Fall back to "has any savedArtworks".
    if ((state.savedArtworks && state.savedArtworks.length > 0) || state.hasSeenGalleryIntro) unlocked++;
    // Ratiocinatory: gated by a factory milestone; conservative heuristic.
    if (state.ratiocinatoryUnlocked || (state.xp || 0) >= 500) unlocked++;
    // Research Lab
    if (state.researchLabUnlocked) unlocked++;
    // Incinerator
    if (state.incineratorUnlocked) unlocked++;
    return unlocked;
  }

  // ---- Stage string ----
  function stageString(state) {
    // Rough stage gate by level (mirrors the narrative breakpoints).
    var lvl = getLevelFromXP(state.xp || 0).level;
    if (lvl >= 50) return 'Stage 7 (Late-game)';
    if (lvl >= 30) return 'Stage 6';
    if (lvl >= 20) return 'Stage 5';
    if (lvl >= 15) return 'Stage 4';
    if (lvl >= 10) return 'Stage 3';
    if (lvl >= 5)  return 'Stage 2';
    if (lvl >= 2)  return 'Stage 1';
    return 'Stage 0 (New)';
  }

  // ---- Full render pass ----
  function render(state) {
    currentState = state;
    // Identity
    applyPlaceholder(document.getElementById('displayName'), state.displayName || '');
    applyPlaceholder(document.getElementById('tagline'), state.tagline || '');

    // Avatar
    renderAvatar(state);

    // Level / title / XP
    var info = getLevelFromXP(state.xp || 0);
    var title = getLevelTitle(info.level);
    var lvlChip = document.getElementById('levelChip');
    if (lvlChip) {
      lvlChip.textContent = 'LV ' + info.level;
      lvlChip.title = 'Current level: ' + info.level + '. Computed from ' + (state.xp || 0) + ' lifetime XP.';
    }
    var titleChip = document.getElementById('titleChip');
    if (titleChip) {
      titleChip.textContent = title;
      titleChip.title = 'Earned title: ' + title + '. Titles advance automatically with level.';
    }
    var pct = info.nextLevelXP > 0 ? Math.min(100, (info.currentXP / info.nextLevelXP) * 100) : 100;
    var fill = document.getElementById('xpFill');
    if (fill) fill.style.width = pct + '%';
    var xpText = document.getElementById('xpText');
    if (xpText) {
      xpText.textContent = info.currentXP + ' / ' + info.nextLevelXP + ' XP';
      xpText.title = info.currentXP + ' XP earned toward level ' + (info.level + 1) + '. Needs ' + info.nextLevelXP + ' XP for the next rung.';
    }

    // Streak
    var streak = state.streak || 0;
    var longest = Math.max(state.longestStreak || 0, streak);
    var flameEl = document.getElementById('streakFlame');
    if (flameEl) {
      if (streak > 0) flameEl.classList.remove('cold');
      else flameEl.classList.add('cold');
      flameEl.title = streak > 0
        ? 'Streak is live at ' + streak + ' day(s). Keep earning at least one textile each day to keep it burning.'
        : 'Streak is cold. Complete a focus session today to re-ignite it.';
    }
    var sNum = document.getElementById('streakNumber');
    if (sNum) sNum.textContent = String(streak);
    var sFlav = document.getElementById('streakFlavor');
    if (sFlav) sFlav.textContent = streakFlavor(streak);
    var longestPill = document.getElementById('longestStreakPill');
    if (longestPill) {
      longestPill.textContent = 'Best: ' + longest + ' day' + (longest === 1 ? '' : 's');
      longestPill.title = 'Longest consecutive-day streak you have ever reached. Persists across resets.';
    }
    var bonusPill = document.getElementById('streakBonusPill');
    if (bonusPill) {
      var mult = getStreakBonus(streak);
      bonusPill.textContent = 'XP bonus: x' + mult.toFixed(2);
      bonusPill.title = 'Your current streak grants a x' + mult.toFixed(2) + ' XP multiplier on every session. +5% per day, capped at +50% at 10 days.';
    }

    // Stats — Work Ledger
    setText('stLifetimeBlocks', fmtNum(state.totalLifetimeBlocks || 0));
    setText('stFocusMins', fmtMinutes(state.lifetimeFocusMinutes || 0));
    setText('stTasksDone', fmtNum(state.tasksCompletedLifetime || 0));
    setText('stLifetimeCoins', fmtCoins(state.lifetimeCoins || 0));
    setText('stWallet', fmtCoins(state.coins || 0));

    // Stats — Today & Combos
    setText('stTodayBlocks', fmtNum(state.todayBlocks || 0));
    setText('stTodayXP', fmtNum(state.todayXP || 0));
    setText('stCurrentCombo', (state.combo || 0) + 'x');
    setText('stComboToday', (state.maxComboToday || 0) + 'x');
    setText('stMaxCombo', (state.maxCombo || 0) + 'x');

    // Stats — Game Progress
    setText('stStage', stageString(state));
    var bld = countBuildings(state);
    setText('stBuildings', bld + ' / 5');
    var roster = (state.personnelRoster && state.personnelRoster.length) || 0;
    setText('stPersonnel', roster + ' on roster');
    setText('stLoomsSaved', fmtNum((state.savedArtworks && state.savedArtworks.length) || 0));
    setText('stLoomsSold', fmtNum(state.loomsSold || 0));

    // Lives lost: research departures + incinerator burns
    var lives = (state.personnelDepartures || 0) + (state.incineratorBurned || 0);
    var lostEl = document.getElementById('stLivesLost');
    if (lostEl) {
      lostEl.textContent = String(lives);
      lostEl.title = 'Lives lost in service of the company: '
        + (state.personnelDepartures || 0) + ' from failed research, '
        + (state.incineratorBurned || 0) + ' from the Incinerator annex. '
        + 'The factory regrets the inconvenience.';
    }

    // Footer
    var footer = document.getElementById('footerLine');
    if (footer) {
      var filed = state.profileCreated ? fmtDate(state.profileCreated) : fmtDate(Date.now());
      footer.textContent = 'Filed with the clerks of standing on ' + filed + '.';
      footer.title = 'Date your profile card was first stamped by the factory. Purely narrative.';
    }
  }

  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  // ---- Save handlers for inline-editable fields ----
  function saveField(key, newValue, maxLen) {
    if (!currentState) return;
    var cleaned = (newValue || '').replace(/\s+/g, ' ').trim();
    if (typeof maxLen === 'number' && cleaned.length > maxLen) cleaned = cleaned.slice(0, maxLen);
    if (currentState[key] === cleaned) return;
    currentState[key] = cleaned;
    // If the profile has never been stamped, stamp it the first time the
    // player writes a display name or tagline.
    if (!currentState.profileCreated) currentState.profileCreated = Date.now();
    try {
      chrome.storage.local.set({ pixelFocusState: currentState });
    } catch (_) {}
  }

  function wireEditable(id, key, maxLen) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', function() {
      if (el.classList.contains('is-placeholder')) {
        el.textContent = '';
        el.classList.remove('is-placeholder');
        el.style.color = '';
      }
    });
    el.addEventListener('blur', function() {
      var v = el.textContent || '';
      saveField(key, v, maxLen);
      applyPlaceholder(el, currentState ? (currentState[key] || '') : '');
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        applyPlaceholder(el, currentState ? (currentState[key] || '') : '');
        el.blur();
      }
    });
  }

  // ---- Nav wiring ----
  function wireNav() {
    function send(path) {
      try {
        chrome.runtime.sendMessage({ type: 'pf-open', path: path });
      } catch (_) {}
    }
    var map = [
      ['toFactoryBtn', 'factory.html'],
      ['toGalleryBtn', 'gallery.html'],
      ['toHouseBtn', 'house.html'],
      ['backToTrackerBtn', 'popup.html']
    ];
    map.forEach(function(pair) {
      var btn = document.getElementById(pair[0]);
      if (btn) btn.addEventListener('click', function() { send(pair[1]); });
    });
  }

  // ---- Load + live-update ----
  function load() {
    try {
      chrome.storage.local.get([STATE_KEY], function(res) {
        var s = res && res[STATE_KEY];
        if (!s) s = {};
        render(s);
      });
    } catch (e) {
      // Fallback when not running under the extension (e.g., opened as a
      // plain file) — render an empty shell.
      render({});
    }
  }

  function onStorageChanged(changes, area) {
    if (area !== 'local') return;
    if (!changes[STATE_KEY]) return;
    var s = changes[STATE_KEY].newValue || {};
    render(s);
  }

  document.addEventListener('DOMContentLoaded', function() {
    wireNav();
    wireEditable('displayName', 'displayName', 40);
    wireEditable('tagline', 'tagline', 140);
    load();
    try {
      chrome.storage.onChanged.addListener(onStorageChanged);
    } catch (_) {}
  });
})();
