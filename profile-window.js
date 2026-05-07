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

  // Full title ladder — must match getLevelTitle(level) in app.js exactly.
  function getLevelTitle(level) {
    // Tier 1 — The Craft
    if (level < 3)   return 'Novice of the Loom';
    if (level < 6)   return 'Apprentice Weaver';
    if (level < 9)   return 'Journeyman of the Shuttle';
    if (level < 12)  return 'Focused Weaver';
    if (level < 15)  return 'Dedicated Weaver';
    if (level < 18)  return 'Disciplined Weaver';
    if (level < 22)  return 'Adept of the Warp';
    if (level < 26)  return 'Master Weaver';
    if (level < 30)  return 'Grandmaster of the Shuttle';

    // Tier 2 — The Trade
    if (level < 33)  return 'Shopkeeper of Cloth';
    if (level < 36)  return 'Guildsman of the Mercers';
    if (level < 39)  return 'Mercer';
    if (level < 42)  return 'Draper';
    if (level < 45)  return 'Clothier';
    if (level < 48)  return 'Warden of the Drapers\u2019 Company';
    if (level < 51)  return 'Alderman of the Weavers\u2019 Guild';
    if (level < 54)  return 'Factor of the Cloth Trade';
    if (level < 57)  return 'Master of the Mercery';

    // Tier 3 — The Mill
    if (level < 60)  return 'Mill Foreman';
    if (level < 63)  return 'Mill Overseer';
    if (level < 66)  return 'Mill Owner';
    if (level < 69)  return 'Master of the Mill';
    if (level < 72)  return 'Industrial Clothier';
    if (level < 75)  return 'Lord of the Spinning Jennies';
    if (level < 78)  return 'Factory Lord';

    // Tier 4 — The Aristocracy
    if (level < 82)  return 'Cotton Baron';
    if (level < 86)  return 'Linen Viscount';
    if (level < 90)  return 'Silk Count';
    if (level < 94)  return 'Wool Earl';
    if (level < 98)  return 'Warp Marquess';
    if (level < 102) return 'Weft Duke';
    if (level < 106) return 'Loom Prince';
    if (level < 110) return 'Textile Archduke';
    if (level < 114) return 'Fabric Potentate';

    // Tier 5 — The Corporate Oligarchy
    if (level < 119) return 'Textile Magnate';
    if (level < 124) return 'Cloth Tycoon';
    if (level < 129) return 'Chair of the Textile Trust';
    if (level < 134) return 'Weaving Conglomerate CEO';
    if (level < 139) return 'Textile Oligarch';
    if (level < 144) return 'Global Fabric Hegemon';
    if (level < 149) return 'Sovereign of the Cloth Monopoly';
    if (level < 155) return 'Emperor of the Warp Exchange';

    // Tier 6 — The Technocratic Playboy Billionaire
    if (level < 161) return 'Textile Futurist';
    if (level < 167) return 'Loom Venture Capitalist';
    if (level < 173) return 'Silicon Weaver';
    if (level < 179) return 'Algorithmic Thread Architect';
    if (level < 185) return 'Playboy of the Warp';
    if (level < 191) return 'Yacht-Class Fabric Baron';
    if (level < 197) return 'Private-Island Textile Mogul';
    if (level < 204) return 'Orbital Loom Investor';
    if (level < 211) return 'Post-Scarcity Cloth Titan';
    if (level < 218) return 'Trillionaire Thread Architect';

    // Tier 7 — The Posthuman Upload
    if (level < 226) return 'Uploaded Consciousness, Mk I';
    if (level < 234) return 'Distributed Loom Intelligence';
    if (level < 242) return 'Cybernetic Warp-Mind';
    if (level < 250) return 'Polymorphic Thread-Entity';
    if (level < 260) return 'Hive-Loom Node Prime';
    if (level < 270) return 'Aggregate Fabric Intelligence';

    // Tier 8 — The Cosmic Megastructure
    if (level < 285) return 'Planet-Scale Loom';
    if (level < 300) return 'Lunar Mill Sovereign';
    if (level < 315) return 'Solar Weaver';
    if (level < 330) return 'Ringworld Weaver';
    if (level < 345) return 'Dyson Loom Architect';
    if (level < 360) return 'System-Wide Warp Hegemon';

    // Tier 9 — The Galactic Hegemon
    if (level < 380) return 'Galactic Thread Sovereign';
    if (level < 400) return 'Nebular Loom Archon';
    if (level < 425) return 'Starforge Weaver';
    if (level < 450) return 'Intergalactic Cloth Emperor';
    if (level < 475) return 'Quasar-Class Loom Consciousness';

    // Tier 10 — Universal Transcendence
    if (level < 525) return 'Universal Loom Archon';
    if (level < 600) return 'Multiversal Weaver of All Cloth';
    if (level < 750) return 'Omnifabric Singularity';
    if (level < 1000) return 'The Loom That Is All Looms';
    return 'Heat-Death Tailor';
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
    // IMPORTANT: never clobber an inline-editable field that currently has
    // focus. render() is called on every storage change (which is constant
    // in this app), and overwriting a focused field mid-keystroke replaces
    // the player's draft with the placeholder text. Only apply the
    // placeholder/value when the field is not being actively edited.
    var active = (typeof document !== 'undefined') ? document.activeElement : null;
    var nameEl = document.getElementById('displayName');
    var tagEl  = document.getElementById('tagline');
    if (nameEl && nameEl !== active) applyPlaceholder(nameEl, state.displayName || '');
    if (tagEl  && tagEl  !== active) applyPlaceholder(tagEl,  state.tagline || '');

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

    // Today's focus time banner (v3.21.33)
    var _pfTodayEl = document.getElementById('profileTodayFocusTime');
    if (_pfTodayEl) {
      // v3.21.55: Use LOCAL date, not UTC — must match app.js todayStr().
      var _pfD = new Date();
      var _pfMM = _pfD.getMonth() + 1;
      var _pfDD = _pfD.getDate();
      var _pfToday = _pfD.getFullYear() + '-' + (_pfMM < 10 ? '0' : '') + _pfMM + '-' + (_pfDD < 10 ? '0' : '') + _pfDD;
      var _pfSessions = (state.dailySessionLog && state.dailySessionLog.date === _pfToday)
        ? (state.dailySessionLog.sessions || []) : [];
      var _pfMin = 0;
      for (var _psi = 0; _psi < _pfSessions.length; _psi++) _pfMin += (_pfSessions[_psi].min || 0);
      var _pfH = Math.floor(_pfMin / 60);
      var _pfM = _pfMin % 60;
      _pfTodayEl.textContent = _pfH > 0 ? _pfH + 'h ' + _pfM + 'm' : _pfMin + 'm';
    }

    // Stats — Work Ledger
    setText('stLifetimeBlocks', fmtNum(state.totalLifetimeBlocks || 0));
    setText('stFocusMins', fmtMinutes(state.lifetimeFocusMinutes || 0));
    setText('stTasksDone', fmtNum(state.tasksCompletedLifetime || 0));
    setText('stLifetimeCoins', fmtCoins(state.lifetimeCoins || 0));
    setText('stWallet', fmtCoins(state.coins || 0));
    // Start date — when the player first installed / created their state
    var startEl = document.getElementById('stStartDate');
    if (startEl) {
      startEl.textContent = state.profileCreated ? fmtDate(state.profileCreated) : '—';
      if (state.profileCreated) {
        var days = Math.floor((Date.now() - state.profileCreated) / 86400000);
        startEl.title = 'You started ' + days + ' day' + (days === 1 ? '' : 's') + ' ago.';
      }
    }

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

    // v3.23.55: Daily focus timeline
    renderProfileTimeline(state);

    // v3.21.19: Daily completed tasks
    renderDailyTasks(state);

    // v3.22.27: Weekly focus bar chart
    renderWeeklyFocus();

    // Sync to Firestore + show link
    updateProfileLinkBar(state);
    syncProfile(state);
  }

  function renderProfileTimeline(state) {
    var bar = document.getElementById('profileTimelineBar');
    var summary = document.getElementById('profileTimelineSummary');
    if (!bar) return;

    function todayStr() {
      var d = new Date();
      var m = d.getMonth() + 1;
      var dd = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
    }
    var today = todayStr();
    var sessions = (state.dailySessionLog && state.dailySessionLog.date === today)
      ? (state.dailySessionLog.sessions || []) : [];

    bar.innerHTML = '';
    var totalMin = 0;
    for (var i = 0; i < sessions.length; i++) { totalMin += (sessions[i].min || 0); }

    for (var j = 0; j < sessions.length; j++) {
      var s = sessions[j];
      if (!s.start || !s.end) continue;
      var sd = new Date(s.start);
      var ed = new Date(s.end);
      var startPct = ((sd.getHours() * 60 + sd.getMinutes()) / (24 * 60)) * 100;
      var endPct = ((ed.getHours() * 60 + ed.getMinutes()) / (24 * 60)) * 100;
      var widthPct = Math.max(0.5, endPct - startPct);

      var use24 = state.use24Hour;
      var startTime, endTime;
      if (use24) {
        startTime = (sd.getHours() < 10 ? '0' : '') + sd.getHours() + ':' + (sd.getMinutes() < 10 ? '0' : '') + sd.getMinutes();
        endTime = (ed.getHours() < 10 ? '0' : '') + ed.getHours() + ':' + (ed.getMinutes() < 10 ? '0' : '') + ed.getMinutes();
      } else {
        startTime = sd.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
        endTime = ed.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
      }

      var block = document.createElement('div');
      block.className = 'timeline-block';
      block.style.cssText = 'left:' + startPct.toFixed(1) + '%;width:' + widthPct.toFixed(1) + '%;';
      var tt = document.createElement('div');
      tt.className = 'tt';
      tt.textContent = startTime + ' - ' + endTime + ' (' + (s.min || '?') + ' min)';
      block.appendChild(tt);
      bar.appendChild(block);
    }

    if (summary) {
      if (sessions.length === 0) {
        summary.textContent = 'No focus sessions yet today.';
      } else {
        var hrs = Math.floor(totalMin / 60);
        var mins = totalMin % 60;
        var timeStr = hrs > 0 ? (hrs + 'h ' + (mins > 0 ? mins + 'm' : '')) : (mins + ' min');
        summary.innerHTML = '<strong>' + timeStr + '</strong> focused across <strong>' + sessions.length + '</strong> session' + (sessions.length === 1 ? '' : 's');
      }
    }
  }

  function renderDailyTasks(state) {
    var panel = document.getElementById('dailyTasksPanel');
    var dateEl = document.getElementById('dailyTasksDate');
    var listEl = document.getElementById('dailyTasksList');
    if (!panel || !listEl) return;

    var log = state.dailyTaskLog;
    // v3.21.55: Use LOCAL date, not UTC — must match app.js todayStr().
    var _dtD = new Date();
    var _dtMM = _dtD.getMonth() + 1;
    var _dtDD = _dtD.getDate();
    var today = _dtD.getFullYear() + '-' + (_dtMM < 10 ? '0' : '') + _dtMM + '-' + (_dtDD < 10 ? '0' : '') + _dtDD;
    var dateLabel = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

    if (log && log.date) {
      try {
        var parts = log.date.split('-');
        if (parts.length === 3) {
          var dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          dateLabel = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch (_) {}
    }

    if (dateEl) dateEl.textContent = dateLabel;

    var keys = [];
    if (log && log.tasks && typeof log.tasks === 'object') {
      keys = Object.keys(log.tasks);
      keys.sort(function(a, b) { return (log.tasks[b] || 0) - (log.tasks[a] || 0); });
    }

    if (keys.length === 0) {
      listEl.innerHTML = '<div style="font-size:11px;color:var(--text-dim);font-style:italic;text-align:center;padding:12px 0;">No tasks completed yet today.</div>';
      return;
    }

    var blurStyle = state.blurCompletedTasks ? 'filter:blur(5px);user-select:none;' : '';
    var html = '';
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var count = log.tasks[name] || 0;
      var countStr = count > 1 ? 'x' + count : '\u2713';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(78,205,196,0.1);' + blurStyle + '">'
        + '<span style="font-size:12px;color:var(--text);">' + escHtml(name) + '</span>'
        + '<span style="font-family:\'Press Start 2P\',monospace;font-size:9px;color:#4ecdc4;">' + countStr + '</span>'
        + '</div>';
    }
    listEl.innerHTML = html;
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

  // ---- Share / Export ----
  // Generates a self-contained HTML file of the profile that works in any
  // browser with no extension required. The player downloads it and can
  // upload it to any free host (Netlify Drop, GitHub Pages, etc.).
  function exportProfile() {
    if (!currentState) return;

    // Grab avatar as data-URL if present
    var avatarDataURL = '';
    var pfp = currentState.profilePicture;
    if (pfp && pfp.pixels && pfp.size) {
      var tmp = document.createElement('canvas');
      tmp.width = pfp.size;
      tmp.height = pfp.size;
      var cx = tmp.getContext('2d');
      cx.fillStyle = '#08080f';
      cx.fillRect(0, 0, pfp.size, pfp.size);
      Object.keys(pfp.pixels).forEach(function(k) {
        var parts = k.split(',');
        cx.fillStyle = pfp.pixels[k];
        cx.fillRect(parseInt(parts[0], 10), parseInt(parts[1], 10), 1, 1);
      });
      avatarDataURL = tmp.toDataURL('image/png');
    }

    // Snapshot all the rendered stat values
    function val(id) {
      var el = document.getElementById(id);
      return el ? el.textContent : '';
    }
    var snap = {
      name: currentState.displayName || 'Anonymous Weaver',
      tagline: currentState.tagline || '',
      level: val('levelChip'),
      title: val('titleChip'),
      xpText: val('xpText'),
      xpPct: 0,
      streak: val('streakNumber'),
      streakFlavor: val('streakFlavor'),
      longestStreak: val('longestStreakPill'),
      streakBonus: val('streakBonusPill'),
      streakCold: (parseInt(val('streakNumber'), 10) || 0) <= 0,
      stLifetimeBlocks: val('stLifetimeBlocks'),
      stFocusMins: val('stFocusMins'),
      stTasksDone: val('stTasksDone'),
      stLifetimeCoins: val('stLifetimeCoins'),
      stWallet: val('stWallet'),
      stTodayBlocks: val('stTodayBlocks'),
      stTodayXP: val('stTodayXP'),
      stCurrentCombo: val('stCurrentCombo'),
      stComboToday: val('stComboToday'),
      stMaxCombo: val('stMaxCombo'),
      stStage: val('stStage'),
      stBuildings: val('stBuildings'),
      stPersonnel: val('stPersonnel'),
      stLoomsSaved: val('stLoomsSaved'),
      stLoomsSold: val('stLoomsSold'),
      stLivesLost: val('stLivesLost'),
      footer: val('footerLine')
    };
    var fill = document.getElementById('xpFill');
    if (fill) snap.xpPct = fill.style.width || '0%';

    // Build the standalone HTML
    var avatarBlock = avatarDataURL
      ? '<img src="' + avatarDataURL + '" style="image-rendering:pixelated;width:100%;height:100%;" alt="Profile avatar">'
      : '<div class="avatar-empty">NO AVATAR</div>';

    var html = '<!DOCTYPE html>\n'
      + '<html lang="en"><head>\n'
      + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
      + '<title>' + snap.name + ' — Todo of the Loom</title>\n'
      + '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
      + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
      + '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">\n'
      + '<style>\n'
      + '  *{margin:0;padding:0;box-sizing:border-box}\n'
      + '  :root{--bg:#08080f;--surface:#12122a;--surface2:#1a1a3a;--accent:#00ff88;--accent2:#ff6b9d;--accent3:#4ecdc4;--gold:#ffd700;--gold-dim:#b8860b;--flame:#ff8c3a;--flame-hot:#ffb64c;--text:#e0e0e0;--text-dim:#5a5a7e;--border:#2a2a4a}\n'
      + '  body{background:radial-gradient(ellipse at 50% 10%,#15152e 0%,var(--bg) 55%);color:var(--text);font-family:"Segoe UI",sans-serif;min-height:100vh;display:flex;flex-direction:column;padding-bottom:40px}\n'
      + '  .top-bar{width:100%;background:var(--surface);border-bottom:2px solid var(--accent);padding:14px 24px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(0,255,136,0.12)}\n'
      + '  .top-bar h1{font-family:"Press Start 2P",monospace;font-size:16px;color:var(--accent);text-shadow:0 0 10px rgba(0,255,136,0.35)}\n'
      + '  .hero{text-align:center;padding:26px 20px 10px}\n'
      + '  .hero-label{font-family:"Press Start 2P",monospace;font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:3px;margin-bottom:8px}\n'
      + '  .layout{max-width:1080px;margin:0 auto;padding:18px 24px 40px;width:100%;display:flex;flex-direction:column;gap:18px}\n'
      + '  .profile-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px 32px;display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center}\n'
      + '  @media(max-width:720px){.profile-card{grid-template-columns:1fr;text-align:center}}\n'
      + '  .avatar-slot{width:132px;height:132px;border-radius:12px;border:2px solid var(--accent);box-shadow:0 0 18px rgba(0,255,136,0.28);background:#08080f;display:flex;align-items:center;justify-content:center;overflow:hidden}\n'
      + '  .avatar-slot img{image-rendering:pixelated;width:100%;height:100%}\n'
      + '  .avatar-empty{font-family:"Press Start 2P",monospace;font-size:9px;color:var(--text-dim);text-align:center;padding:0 10px;line-height:1.6}\n'
      + '  .identity{display:flex;flex-direction:column;gap:8px}\n'
      + '  .identity-name{font-family:"Press Start 2P",monospace;font-size:20px;color:var(--text);letter-spacing:0.5px}\n'
      + '  .identity-tagline{font-size:13px;color:var(--text-dim);font-style:italic}\n'
      + '  .title-row{display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap}\n'
      + '  .level-chip{background:var(--surface2);border:1px solid var(--accent3);color:var(--accent3);font-family:"Press Start 2P",monospace;font-size:10px;padding:5px 9px;border-radius:6px;letter-spacing:0.5px}\n'
      + '  .title-chip{background:var(--surface2);border:1px solid var(--gold);color:var(--gold);font-family:"Press Start 2P",monospace;font-size:10px;padding:5px 9px;border-radius:6px;letter-spacing:0.5px}\n'
      + '  .xp-bar{margin-top:8px;height:14px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;overflow:hidden;position:relative;max-width:420px}\n'
      + '  .xp-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent3))}\n'
      + '  .xp-text{font-size:10px;color:var(--text-dim);margin-top:4px;font-family:"Press Start 2P",monospace;letter-spacing:0.5px}\n'
      + '  .streak-card{background:var(--surface);border:1px solid var(--flame);border-radius:12px;padding:22px 24px;display:flex;gap:26px;align-items:center;box-shadow:0 0 18px rgba(255,140,58,0.12)}\n'
      + '  @media(max-width:720px){.streak-card{flex-direction:column;text-align:center}}\n'
      + '  .streak-flame{font-size:72px;line-height:1;text-shadow:0 0 18px rgba(255,140,58,0.5)}\n'
      + '  .streak-flame.cold{filter:grayscale(0.85);opacity:0.55}\n'
      + '  .streak-main{display:flex;flex-direction:column;gap:4px;flex:1}\n'
      + '  .streak-number{font-family:"Press Start 2P",monospace;font-size:28px;color:var(--flame-hot)}\n'
      + '  .streak-label{font-family:"Press Start 2P",monospace;font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase}\n'
      + '  .streak-flavor{font-size:12px;color:var(--text-dim);font-style:italic;max-width:520px;line-height:1.5}\n'
      + '  .streak-meta{display:flex;gap:14px;margin-top:4px;font-size:11px;color:var(--text-dim);flex-wrap:wrap}\n'
      + '  .streak-meta .pill{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:3px 10px}\n'
      + '  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}\n'
      + '  @media(max-width:900px){.stats-grid{grid-template-columns:1fr}}\n'
      + '  .stat-panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 20px}\n'
      + '  .stat-panel h2{font-family:"Press Start 2P",monospace;font-size:10px;color:var(--accent3);margin-bottom:12px;letter-spacing:0.5px}\n'
      + '  .stat-panel.work h2{color:var(--gold)}\n'
      + '  .stat-panel.game h2{color:var(--accent2)}\n'
      + '  .stat-row{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px dashed var(--border)}\n'
      + '  .stat-row:last-child{border-bottom:none}\n'
      + '  .stat-label{font-size:11px;color:var(--text-dim);letter-spacing:0.5px;text-transform:uppercase}\n'
      + '  .stat-value{font-family:"Press Start 2P",monospace;font-size:11px;color:var(--text);letter-spacing:0.5px}\n'
      + '  .stat-value.gold{color:var(--gold)}\n'
      + '  .stat-value.accent{color:var(--accent)}\n'
      + '  .stat-value.pink{color:var(--accent2)}\n'
      + '  .stat-value.teal{color:var(--accent3)}\n'
      + '  .footer-line{text-align:center;font-size:11px;color:var(--text-dim);font-style:italic;margin-top:4px}\n'
      + '  .snapshot-note{text-align:center;font-size:10px;color:var(--text-dim);margin-top:12px;font-style:italic}\n'
      + '</style>\n'
      + '</head><body>\n'
      + '<div class="top-bar"><h1>TODO OF THE LOOM</h1></div>\n'
      + '<div class="hero"><div class="hero-label">CARD OF STANDING</div></div>\n'
      + '<div class="layout">\n'
      // Profile card
      + '<div class="profile-card">\n'
      + '  <div class="avatar-slot">' + avatarBlock + '</div>\n'
      + '  <div class="identity">\n'
      + '    <div class="identity-name">' + escHtml(snap.name) + '</div>\n'
      + (snap.tagline ? '    <div class="identity-tagline">' + escHtml(snap.tagline) + '</div>\n' : '')
      + '    <div class="title-row">\n'
      + '      <span class="level-chip">' + escHtml(snap.level) + '</span>\n'
      + '      <span class="title-chip">' + escHtml(snap.title) + '</span>\n'
      + '    </div>\n'
      + '    <div class="xp-bar"><div class="xp-fill" style="width:' + snap.xpPct + ';"></div></div>\n'
      + '    <div class="xp-text">' + escHtml(snap.xpText) + '</div>\n'
      + '  </div>\n'
      + '</div>\n'
      // Streak card
      + '<div class="streak-card">\n'
      + '  <div class="streak-flame' + (snap.streakCold ? ' cold' : '') + '">\u{1F525}</div>\n'
      + '  <div class="streak-main">\n'
      + '    <div class="streak-number">' + escHtml(snap.streak) + '</div>\n'
      + '    <div class="streak-label">DAY STREAK</div>\n'
      + '    <div class="streak-flavor">' + escHtml(snap.streakFlavor) + '</div>\n'
      + '    <div class="streak-meta">\n'
      + '      <div class="pill">' + escHtml(snap.longestStreak) + '</div>\n'
      + '      <div class="pill">' + escHtml(snap.streakBonus) + '</div>\n'
      + '    </div>\n'
      + '  </div>\n'
      + '</div>\n'
      // Stats grid
      + '<div class="stats-grid">\n'
      // Work ledger
      + '  <div class="stat-panel work"><h2>WORK LEDGER</h2>\n'
      + statRow('Lifetime textiles', snap.stLifetimeBlocks, 'gold')
      + statRow('Focus minutes', snap.stFocusMins, 'accent')
      + statRow('Tasks completed', snap.stTasksDone, 'teal')
      + statRow('Lifetime coins', snap.stLifetimeCoins, 'gold')
      + statRow('Wallet', snap.stWallet, 'gold')
      + '  </div>\n'
      // Today & combos
      + '  <div class="stat-panel"><h2>TODAY &amp; COMBOS</h2>\n'
      + statRow('Today\'s textiles', snap.stTodayBlocks, 'accent')
      + statRow('Today\'s XP', snap.stTodayXP, 'accent')
      + statRow('Current combo', snap.stCurrentCombo, 'pink')
      + statRow('Best combo today', snap.stComboToday, 'pink')
      + statRow('All-time best combo', snap.stMaxCombo, 'gold')
      + '  </div>\n'
      // Game progress
      + '  <div class="stat-panel game"><h2>GAME PROGRESS</h2>\n'
      + statRow('Factory stage', snap.stStage, 'pink')
      + statRow('Buildings', snap.stBuildings, 'teal')
      + statRow('Personnel', snap.stPersonnel, 'teal')
      + statRow('Looms saved', snap.stLoomsSaved, 'accent')
      + statRow('Looms sold', snap.stLoomsSold, 'gold')
      + statRow('Lives lost', snap.stLivesLost, '', 'color:#ff6666')
      + '  </div>\n'
      + '</div>\n'
      // Footer
      + '<div class="footer-line">' + escHtml(snap.footer) + '</div>\n'
      + '<div class="snapshot-note">Snapshot taken ' + new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + '. Stats may have changed since.</div>\n'
      + '</div>\n'
      + '</body></html>';

    // Trigger download
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var safeName = (snap.name || 'profile').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-').toLowerCase();
    a.download = 'todo-of-the-loom-' + safeName + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function statRow(label, value, cls, style) {
    var clsAttr = cls ? ' ' + cls : '';
    var stAttr = style ? ' style="' + style + '"' : '';
    return '    <div class="stat-row"><span class="stat-label">' + escHtml(label) + '</span><span class="stat-value' + clsAttr + '"' + stAttr + '>' + escHtml(value) + '</span></div>\n';
  }

  // ---- Nav wiring (with lockout enforcement on gamified pages) ----
  var _gameLockedPages = ['factory.html', 'gallery.html', 'house.html'];
  // v3.23.93: Simplified — always locked unless grace period is active.
  function _isProfileNavLocked(state) {
    var now = Date.now();
    if (state.gameLockGraceUntil && now < state.gameLockGraceUntil) return false;
    return true;
  }

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
      ['toTimelineBtn', 'timeline.html'],
      ['backToTrackerBtn', 'popup.html']
    ];
    map.forEach(function(pair) {
      var btn = document.getElementById(pair[0]);
      if (!btn) return;
      if (_gameLockedPages.indexOf(pair[1]) !== -1) {
        // Gamified page — check lockout before navigating
        btn.addEventListener('click', function() {
          try {
            chrome.storage.local.get('pixelFocusState', function(res) {
              var s = res && res.pixelFocusState || {};
              if (_isProfileNavLocked(s)) {
                btn.style.opacity = '0.35';
                btn.style.filter = 'grayscale(80%)';
                btn.title = 'Complete your priority tasks or finish your session first.';
                setTimeout(function() { btn.style.opacity = ''; btn.style.filter = ''; }, 2000);
              } else {
                send(pair[1]);
              }
            });
          } catch(_) { send(pair[1]); }
        });
      } else {
        btn.addEventListener('click', function() { send(pair[1]); });
      }
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

  // ---- Profile link bar + sync ----
  function updateProfileLinkBar(state) {
    var bar = document.getElementById('profileLinkBar');
    var input = document.getElementById('profileLinkInput');
    var status = document.getElementById('profileSyncStatus');
    if (!bar || !input) return;

    if (typeof ProfileSync !== 'undefined' && ProfileSync) {
      var url = ProfileSync.getProfileUrl(state);
      if (url) {
        bar.style.display = 'block';
        input.value = url;
      }
    }
  }

  function syncProfile(state) {
    if (typeof ProfileSync === 'undefined' || !ProfileSync) return;
    var status = document.getElementById('profileSyncStatus');
    if (status) status.textContent = 'Syncing...';

    ProfileSync.sync(state).then(function(result) {
      if (status) {
        if (result === 'throttled') {
          status.textContent = 'Profile up to date.';
        } else if (result) {
          status.textContent = 'Profile synced.';
        } else {
          status.textContent = 'Sync failed — check your connection.';
        }
      }
      // Update link bar in case profileId was just generated
      updateProfileLinkBar(state);
    });
  }

  function wireCopyButton() {
    var btn = document.getElementById('copyLinkBtn');
    var input = document.getElementById('profileLinkInput');
    if (!btn || !input) return;
    btn.addEventListener('click', function() {
      input.select();
      try {
        navigator.clipboard.writeText(input.value).then(function() {
          btn.textContent = 'COPIED';
          setTimeout(function() { btn.textContent = 'COPY'; }, 2000);
        });
      } catch (_) {
        document.execCommand('copy');
        btn.textContent = 'COPIED';
        setTimeout(function() { btn.textContent = 'COPY'; }, 2000);
      }
    });
  }

  // ===== Weekly Focus Bar Chart (v3.22.27, moved from app.js) =====
  var _weekOffset = 0; // 0 = current week, -1 = last week, etc.

  function renderWeeklyFocus() {
    var barsEl = document.getElementById('weeklyBars');
    var labelsEl = document.getElementById('weeklyLabels');
    var summaryEl = document.getElementById('weeklySummary');
    var labelEl = document.getElementById('weekLabel');
    if (!barsEl || !currentState) return;

    var state = currentState;

    // Compute the Monday of the target week
    var now = new Date();
    var todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var dayOfWeek = todayDate.getDay(); // 0=Sun
    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    var thisMonday = new Date(todayDate.getTime() + mondayOffset * 86400000);
    var targetMonday = new Date(thisMonday.getTime() + _weekOffset * 7 * 86400000);

    // Helper to format today's date
    function todayStr() {
      var d = new Date();
      var m = d.getMonth() + 1;
      var dd = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
    }

    var today = todayStr();
    var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var days = [];
    var maxMin = 1; // min 1 to avoid div-by-zero

    for (var i = 0; i < 7; i++) {
      var d = new Date(targetMonday.getTime() + i * 86400000);
      var mm = d.getMonth() + 1;
      var dd = d.getDate();
      var dateStr = d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;

      var mins = 0;
      if (dateStr === today) {
        // Live: sum from current dailySessionLog
        if (state.dailySessionLog && state.dailySessionLog.date === today) {
          var sess = state.dailySessionLog.sessions || [];
          for (var s = 0; s < sess.length; s++) mins += (sess[s].min || 0);
        }
      } else {
        // Archived
        mins = (state.focusHistory && state.focusHistory[dateStr]) || 0;
      }

      if (mins > maxMin) maxMin = mins;
      var isFuture = dateStr > today;
      days.push({ label: dayNames[i], dateStr: dateStr, mins: mins, isToday: dateStr === today, isFuture: isFuture });
    }

    // Date range label
    var endDate = new Date(targetMonday.getTime() + 6 * 86400000);
    function fmtShort(dt) {
      var m = dt.getMonth() + 1;
      var d = dt.getDate();
      return (m < 10 ? '0' : '') + m + '/' + (d < 10 ? '0' : '') + d;
    }
    if (labelEl) labelEl.textContent = fmtShort(targetMonday) + ' - ' + fmtShort(endDate);

    // Render bars
    barsEl.innerHTML = '';
    labelsEl.innerHTML = '';
    var totalMins = 0;

    for (var j = 0; j < days.length; j++) {
      var day = days[j];
      totalMins += day.mins;

      // Bar
      var barWrap = document.createElement('div');
      barWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;';

      // Minute label on top of bar
      var valSpan = document.createElement('div');
      valSpan.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:6px;color:#ff9f43;margin-bottom:2px;';
      // v3.23.18: Show hours + minutes (e.g. "3h 20m") instead of just total minutes
      var _barLabel = '';
      if (!day.isFuture && day.mins > 0) {
        var _bh = Math.floor(day.mins / 60);
        var _bm = day.mins % 60;
        _barLabel = _bh > 0 ? _bh + 'h' + (_bm > 0 ? ' ' + _bm + 'm' : '') : _bm + 'm';
      }
      valSpan.textContent = _barLabel;
      barWrap.appendChild(valSpan);

      // The bar itself
      var bar = document.createElement('div');
      var pct = day.isFuture ? 0 : Math.max(day.mins > 0 ? 8 : 2, Math.round((day.mins / maxMin) * 100));
      var color = day.isToday ? '#00ff88' : (day.isFuture ? '#1a1a2e' : '#ff9f43');
      var opacity = day.isFuture ? '0.2' : '1';
      bar.style.cssText = 'width:100%;border-radius:3px 3px 0 0;background:' + color + ';opacity:' + opacity + ';height:' + pct + '%;min-height:2px;transition:height 0.3s ease;';
      barWrap.appendChild(bar);

      barsEl.appendChild(barWrap);

      // Day label
      var lbl = document.createElement('div');
      lbl.style.cssText = 'flex:1;text-align:center;font-family:"Press Start 2P",monospace;font-size:6px;color:' + (day.isToday ? '#00ff88' : '#5a5a7e') + ';';
      lbl.textContent = day.label;
      labelsEl.appendChild(lbl);
    }

    // Summary
    var hrs = Math.floor(totalMins / 60);
    var rm = totalMins % 60;
    var sumText = totalMins === 0 ? 'No focus data this week' : (hrs > 0 ? hrs + 'h ' : '') + rm + 'm total';
    if (summaryEl) summaryEl.textContent = sumText;
  }

  // Wire prev/next buttons for weekly focus
  function wireWeeklyFocusNav() {
    var prev = document.getElementById('weekPrev');
    var next = document.getElementById('weekNext');
    if (prev) prev.addEventListener('click', function() {
      _weekOffset--;
      renderWeeklyFocus();
    });
    if (next) next.addEventListener('click', function() {
      if (_weekOffset < 0) {
        _weekOffset++;
        renderWeeklyFocus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    wireNav();
    wireEditable('displayName', 'displayName', 40);
    wireEditable('tagline', 'tagline', 140);
    wireCopyButton();
    wireWeeklyFocusNav();
    var lbBtn = document.getElementById('leaderboardBtn');
    if (lbBtn) lbBtn.addEventListener('click', function() {
      window.open('https://todo-of-the-loom.web.app/', '_blank');
    });
    load();
    try {
      chrome.storage.onChanged.addListener(onStorageChanged);
    } catch (_) {}
  });
})();
