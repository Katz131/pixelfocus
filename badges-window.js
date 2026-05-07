// badges-window.js — v3.23.96
// Handles the dedicated Badges page.
// Loaded by badges.html.

(function() {
  'use strict';

  // ===== All badge definitions =====
  // Categories: sleep, focus, social, mastery
  var ALL_BADGES = [
    // --- Sleep / Bedtime ---
    { id: 'early_bird_1',    cat: 'sleep', name: 'Early Bird',       icon: '🐤', desc: '5 nights on time',   req: { type: 'bedtimeTotal', count: 5 } },
    { id: 'sleep_warrior',   cat: 'sleep', name: 'Sleep Warrior',    icon: '🛡️', desc: '10 nights on time',  req: { type: 'bedtimeTotal', count: 10 } },
    { id: 'dream_weaver',    cat: 'sleep', name: 'Dream Weaver',     icon: '🌀', desc: '15 nights on time',  req: { type: 'bedtimeTotal', count: 15 } },
    { id: 'night_master',    cat: 'sleep', name: 'Night Master',     icon: '🌙', desc: '25 nights on time',  req: { type: 'bedtimeTotal', count: 25 } },
    { id: 'sleep_sage',      cat: 'sleep', name: 'Sleep Sage',       icon: '🧘', desc: '40 nights on time',  req: { type: 'bedtimeTotal', count: 40 } },
    { id: 'lunar_legend',    cat: 'sleep', name: 'Lunar Legend',     icon: '🌕', desc: '60 nights on time',  req: { type: 'bedtimeTotal', count: 60 } },
    { id: 'rest_royalty',    cat: 'sleep', name: 'Rest Royalty',     icon: '👑', desc: '90 nights on time',  req: { type: 'bedtimeTotal', count: 90 } },
    { id: 'eternal_dreamer', cat: 'sleep', name: 'Eternal Dreamer',  icon: '💫', desc: '150 nights on time', req: { type: 'bedtimeTotal', count: 150 } },

    // --- Focus ---
    { id: 'first_focus',     cat: 'focus', name: 'First Thread',     icon: '🧵', desc: 'Complete your first focus session', req: { type: 'sessions', count: 1 } },
    { id: 'ten_sessions',    cat: 'focus', name: 'Shuttle Runner',   icon: '🏃', desc: 'Complete 10 focus sessions',       req: { type: 'sessions', count: 10 } },
    { id: 'fifty_sessions',  cat: 'focus', name: 'Loom Veteran',     icon: '⚙️', desc: 'Complete 50 focus sessions',       req: { type: 'sessions', count: 50 } },
    { id: 'century_focus',   cat: 'focus', name: 'Centurion',        icon: '💯', desc: 'Complete 100 focus sessions',      req: { type: 'sessions', count: 100 } },
    { id: 'focus_500',       cat: 'focus', name: 'Iron Will',        icon: '🔥', desc: 'Complete 500 focus sessions',      req: { type: 'sessions', count: 500 } },
    { id: 'streak_7',        cat: 'focus', name: 'Weekly Weaver',    icon: '📅', desc: '7-day return streak',              req: { type: 'streak', count: 7 } },
    { id: 'streak_30',       cat: 'focus', name: 'Monthly Master',   icon: '📆', desc: '30-day return streak',             req: { type: 'streak', count: 30 } },
    { id: 'combo_10',        cat: 'focus', name: 'Combo King',       icon: '⚡', desc: 'Reach a 10x combo',                req: { type: 'combo', count: 10 } },

    // --- Social ---
    { id: 'first_friend',    cat: 'social', name: 'Companion',       icon: '🤝', desc: 'Add your first friend',            req: { type: 'friends', count: 1 } },
    { id: 'social_circle',   cat: 'social', name: 'Social Circle',   icon: '🫂', desc: 'Have 3 friends',                   req: { type: 'friends', count: 3 } },
    { id: 'profile_pic',     cat: 'social', name: 'Self-Portrait',   icon: '🎨', desc: 'Set a profile picture',            req: { type: 'profilePic', count: 1 } },
    { id: 'display_name',    cat: 'social', name: 'Named',           icon: '🏷️', desc: 'Set a display name',               req: { type: 'displayName', count: 1 } },

    // --- Mastery ---
    { id: 'level_10',        cat: 'mastery', name: 'Apprentice',     icon: '📜', desc: 'Reach level 10',                   req: { type: 'level', count: 10 } },
    { id: 'level_25',        cat: 'mastery', name: 'Journeyman',     icon: '🗡️', desc: 'Reach level 25',                   req: { type: 'level', count: 25 } },
    { id: 'level_50',        cat: 'mastery', name: 'Master',         icon: '🏛️', desc: 'Reach level 50',                   req: { type: 'level', count: 50 } },
    { id: 'level_100',       cat: 'mastery', name: 'Grandmaster',    icon: '🌟', desc: 'Reach level 100',                  req: { type: 'level', count: 100 } },
    { id: 'rich_1000',       cat: 'mastery', name: 'First Fortune',  icon: '💰', desc: 'Earn $1,000 lifetime',             req: { type: 'lifetimeCoins', count: 1000 } },
    { id: 'rich_10000',      cat: 'mastery', name: 'Textile Mogul',  icon: '💎', desc: 'Earn $10,000 lifetime',            req: { type: 'lifetimeCoins', count: 10000 } }
  ];

  var CAT_LABELS = {
    sleep:   { title: '🌙 SLEEP',    cls: 'sleep' },
    focus:   { title: '🎯 FOCUS',    cls: 'focus' },
    social:  { title: '👥 SOCIAL',   cls: 'social' },
    mastery: { title: '⚔️ MASTERY', cls: 'mastery' }
  };

  var state = {};

  // ===== Compute which badges are earned based on current state =====
  function computeEarnedBadges() {
    if (!Array.isArray(state.badges)) state.badges = [];
    var earned = state.badges.slice(); // start with already-earned
    var changed = false;

    // XP / level helper (synced with app.js)
    function getLevelFromXP(totalXP) {
      var level = 1, xpNeeded = 0;
      while (level < 999) {
        var next = (level + 1) * 50;
        if (xpNeeded + next > totalXP) return level;
        xpNeeded += next;
        level++;
      }
      return level;
    }

    var level = getLevelFromXP(state.xp || 0);
    var sessions = state.lifetimeSessions || state.totalLifetimeSessions || 0;
    var streak = state.longestStreak || Math.max(state.streak || 0, state.longestStreak || 0);
    var combo = state.maxCombo || 0;
    var friends = 0;
    if (Array.isArray(state.friends)) {
      for (var i = 0; i < state.friends.length; i++) {
        if (state.friends[i] && state.friends[i].status === 'accepted') friends++;
      }
    }
    var hasProfilePic = !!(state.profilePicture && state.profilePicture.pixels);
    var hasDisplayName = !!(state.displayName && state.displayName.trim());
    var bedtimeTotal = state.bedtimeTotalSuccesses || 0;
    var lifetimeCoins = state.lifetimeCoins || 0;

    ALL_BADGES.forEach(function(b) {
      if (earned.indexOf(b.id) !== -1) return; // already earned

      var met = false;
      var r = b.req;
      switch(r.type) {
        case 'bedtimeTotal':  met = bedtimeTotal >= r.count; break;
        case 'sessions':      met = sessions >= r.count; break;
        case 'streak':        met = streak >= r.count; break;
        case 'combo':         met = combo >= r.count; break;
        case 'friends':       met = friends >= r.count; break;
        case 'profilePic':    met = hasProfilePic; break;
        case 'displayName':   met = hasDisplayName; break;
        case 'level':         met = level >= r.count; break;
        case 'lifetimeCoins': met = lifetimeCoins >= r.count; break;
      }

      if (met) {
        earned.push(b.id);
        changed = true;
      }
    });

    if (changed) {
      state.badges = earned;
      chrome.storage.local.set({ pixelFocusState: state });
    }

    return earned;
  }

  // ===== Render =====
  function render() {
    var earned = computeEarnedBadges();
    var totalEarned = earned.length;
    var totalPossible = ALL_BADGES.length;

    // Stats bar
    document.getElementById('totalBadges').textContent = totalEarned;
    document.getElementById('bedtimeStreak').textContent = state.bedtimeStreak || 0;
    document.getElementById('bestStreak').textContent = state.bedtimeBestStreak || 0;
    document.getElementById('totalNights').textContent = state.bedtimeTotalSuccesses || 0;
    document.getElementById('badgeCount').textContent = totalEarned + ' / ' + totalPossible;

    var content = document.getElementById('badgeContent');
    content.innerHTML = '';

    if (totalPossible === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">No badges available yet.</div></div>';
      return;
    }

    // Group by category
    var cats = ['sleep', 'focus', 'social', 'mastery'];
    cats.forEach(function(cat) {
      var badges = ALL_BADGES.filter(function(b) { return b.cat === cat; });
      if (badges.length === 0) return;

      var section = document.createElement('div');
      section.className = 'section';

      var title = document.createElement('div');
      title.className = 'section-title ' + CAT_LABELS[cat].cls;
      title.textContent = CAT_LABELS[cat].title;
      section.appendChild(title);

      var grid = document.createElement('div');
      grid.className = 'badge-grid';

      badges.forEach(function(b) {
        var isEarned = earned.indexOf(b.id) !== -1;
        var card = document.createElement('div');
        card.className = 'badge-card' + (isEarned ? ' earned' : ' locked');

        var icon = document.createElement('div');
        icon.className = 'badge-icon';
        icon.textContent = b.icon;
        card.appendChild(icon);

        var name = document.createElement('div');
        name.className = 'badge-name';
        name.textContent = b.name;
        card.appendChild(name);

        var desc = document.createElement('div');
        desc.className = 'badge-desc';
        desc.textContent = b.desc;
        card.appendChild(desc);

        if (!isEarned) {
          var lock = document.createElement('div');
          lock.className = 'lock-overlay';
          lock.textContent = '🔒';
          card.appendChild(lock);
        }

        card.setAttribute('title', isEarned
          ? b.name + ' — ' + b.desc + '. Earned!'
          : b.name + ' — ' + b.desc + '. Not yet earned.');

        grid.appendChild(card);
      });

      section.appendChild(grid);
      content.appendChild(section);
    });
  }

  // ===== Nav =====
  function openWindow(path) {
    try {
      chrome.runtime.sendMessage({ type: 'pf-open', path: path });
    } catch (_) {}
  }

  document.getElementById('backBtn').addEventListener('click', function() {
    openWindow('popup.html');
  });

  // ===== Init =====
  chrome.storage.local.get('pixelFocusState', function(result) {
    state = result.pixelFocusState || {};
    render();
  });

  // Live sync
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local' || !changes.pixelFocusState) return;
    state = changes.pixelFocusState.newValue || {};
    render();
  });
})();
