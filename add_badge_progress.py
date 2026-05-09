#!/usr/bin/env python3
"""Add itemized progress indicators to every badge card."""
import re, json, sys

PROJECT = "/sessions/sweet-lucid-sagan/mnt/Pixel todo lists"

# ──────────────────────────────────────────
# 1. badges.html — inject CSS for progress
# ──────────────────────────────────────────
html_path = f"{PROJECT}/badges.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

progress_css = """
  /* --- Badge progress indicators v3.23.156 --- */
  .badge-progress { margin-top:8px; }
  .badge-progress-text { font-family:'Press Start 2P',monospace; font-size:7px;
    color:var(--text-dim); letter-spacing:0.3px; margin-bottom:4px; }
  .badge-card.earned .badge-progress-text { color:var(--success); }
  .badge-progress-bar { width:100%; height:4px; background:var(--border); border-radius:2px;
    overflow:hidden; }
  .badge-progress-fill { height:100%; border-radius:2px; transition:width 0.3s ease; }
  .badge-card.locked .badge-progress-fill { background:linear-gradient(90deg, #5a5a7e, #7a7a9e); }
  .badge-card.earned .badge-progress-fill { background:linear-gradient(90deg, var(--success), #66ffaa); }
"""

# Insert before </style>
if 'badge-progress-text' not in html:
    html = html.replace('</style>', progress_css + '</style>')
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("[1] badges.html: CSS injected")
else:
    print("[1] badges.html: CSS already present, skipping")

# ──────────────────────────────────────────
# 2. badges-window.js — add progress to cards
# ──────────────────────────────────────────
js_path = f"{PROJECT}/badges-window.js"
with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

# 2a. After computeEarnedBadges(), add a getCurrentValues() helper
# We'll insert it right before the render() function

helper_fn = """
  // ===== Badge progress helper (v3.23.156) =====
  function _badgeCurrentVal(reqType, st) {
    var level = 1, xpNeeded = 0, lv = 1;
    var totalXP = st.xp || 0;
    while (lv < 999) { var nx = (lv + 1) * 50; if (xpNeeded + nx > totalXP) break; xpNeeded += nx; lv++; }
    level = lv;
    var sessions = st.lifetimeSessions || st.totalLifetimeSessions || 0;
    var streak = st.longestStreak || Math.max(st.streak || 0, st.longestStreak || 0);
    var combo = st.maxCombo || 0;
    var friends = 0;
    if (Array.isArray(st.friends)) {
      for (var i = 0; i < st.friends.length; i++) {
        if (st.friends[i] && st.friends[i].status === 'accepted') friends++;
      }
    }
    var bedtimeTotal = st.bedtimeTotalSuccesses || 0;
    var bedtimeStreakBest = Math.max(st.bedtimeStreak || 0, st.bedtimeBestStreak || 0);
    var lifetimeCoins = st.lifetimeCoins || 0;
    var currentCoins = st.coins || 0;
    var lifetimeBlocks = st.totalLifetimeBlocks || 0;
    var galleryCount = (st.savedArtworks && st.savedArtworks.length) || 0;
    var canvasSize = st.canvasSize || 8;
    var canvasCount = (st.purchasedCanvasSizes && st.purchasedCanvasSizes.length) || 1;
    var dyeResearch = st.dyeResearchLevel || 0;
    var employeesLevel = st.employeesLevel || 0;
    var brokerageUnlocked = st.brokerageUnlocked ? 1 : 0;
    var stocksOwned = 0, stocksBought = 0;
    if (st.portfolio && typeof st.portfolio === 'object') {
      var keys = Object.keys(st.portfolio);
      for (var k = 0; k < keys.length; k++) {
        if (st.portfolio[keys[k]] && st.portfolio[keys[k]].shares > 0) { stocksOwned++; stocksBought++; }
      }
    }
    var marketEvents = st.marketEventsWeathered || 0;
    var questsCompleted = st.questsCompletedLifetime || 0;
    var questStreak = st.questStreak || 0;
    var questsAmbitious = st.questsAmbitiousCompleted || 0;
    var hasProfilePic = !!(st.profilePicture && st.profilePicture.pixels);
    var hasDisplayName = !!(st.displayName && st.displayName.trim());
    var hasFullProfile = hasProfilePic && hasDisplayName;
    var loomSalesCount = galleryCount;
    var loomSalesCoins = st.coinsFromLoomSales || 0;

    var map = {
      bedtimeTotal: bedtimeTotal, bedtimeStreak: bedtimeStreakBest,
      sessions: sessions, streak: streak, combo: combo,
      friends: friends, profilePic: hasProfilePic ? 1 : 0,
      displayName: hasDisplayName ? 1 : 0, fullProfile: hasFullProfile ? 1 : 0,
      level: level, lifetimeCoins: lifetimeCoins, currentCoins: currentCoins,
      lifetimeBlocks: lifetimeBlocks, gallery: galleryCount,
      canvasSize: canvasSize, canvasCount: canvasCount,
      dyeResearch: dyeResearch, employees: employeesLevel,
      brokerageUnlocked: brokerageUnlocked, stocksBought: stocksBought,
      stocksOwned: stocksOwned, marketEvents: marketEvents,
      loomSales: loomSalesCount, loomSalesCoins: loomSalesCoins,
      questsCompleted: questsCompleted, questStreak: questStreak,
      questsAmbitious: questsAmbitious
    };
    return map[reqType] || 0;
  }

  var _BADGE_TYPE_LABELS = {
    bedtimeTotal: 'nights', bedtimeStreak: 'night streak',
    sessions: 'sessions', streak: 'day streak', combo: 'combo',
    friends: 'friends', profilePic: '', displayName: '', fullProfile: '',
    level: 'levels', lifetimeCoins: 'coins earned', currentCoins: 'coins held',
    lifetimeBlocks: 'textiles', gallery: 'artworks',
    canvasSize: 'px canvas', canvasCount: 'sizes owned',
    dyeResearch: 'dye level', employees: 'employee level',
    brokerageUnlocked: '', stocksBought: 'trades', stocksOwned: 'stocks owned',
    marketEvents: 'events', loomSales: 'sales', loomSalesCoins: 'coins from sales',
    questsCompleted: 'quests', questStreak: 'day quest streak',
    questsAmbitious: 'ambitious quests'
  };

"""

anchor_render = "  // ===== Render =====\n  function render() {"
if '_badgeCurrentVal' not in js:
    if anchor_render in js:
        js = js.replace(anchor_render, helper_fn + anchor_render)
        print("[2a] badges-window.js: helper function injected")
    else:
        print("[2a] ERROR: could not find render anchor")
        sys.exit(1)
else:
    print("[2a] badges-window.js: helper already present, skipping")

# 2b. In the badge card rendering loop, after the desc element, add progress
# Current code (after desc):
#   if (!isEarned) {
#     var lock = ...
# We need to insert progress elements before the lock overlay check.

progress_block = """
        // --- Progress indicator (v3.23.156) ---
        var _boolTypes = {profilePic:1, displayName:1, fullProfile:1, brokerageUnlocked:1};
        var progWrap = document.createElement('div');
        progWrap.className = 'badge-progress';
        if (_boolTypes[b.req.type]) {
          var pTxt = document.createElement('div');
          pTxt.className = 'badge-progress-text';
          pTxt.textContent = isEarned ? 'COMPLETE' : 'NOT YET';
          progWrap.appendChild(pTxt);
        } else {
          var curVal = _badgeCurrentVal(b.req.type, state);
          var pct = Math.min(100, Math.round((curVal / b.req.count) * 100));
          var pTxt = document.createElement('div');
          pTxt.className = 'badge-progress-text';
          var lbl = _BADGE_TYPE_LABELS[b.req.type] || '';
          pTxt.textContent = curVal + ' / ' + b.req.count + (lbl ? ' ' + lbl : '');
          progWrap.appendChild(pTxt);
          var pBar = document.createElement('div');
          pBar.className = 'badge-progress-bar';
          var pFill = document.createElement('div');
          pFill.className = 'badge-progress-fill';
          pFill.style.width = pct + '%';
          pBar.appendChild(pFill);
          progWrap.appendChild(pBar);
        }
        card.appendChild(progWrap);

"""

old_lock_block = """        if (!isEarned) {
          var lock = document.createElement('div');
          lock.className = 'lock-overlay';
          lock.textContent = '\\u{1F512}';
          card.appendChild(lock);
        }"""

# The emoji might be stored differently - let me find the exact text
# Actually it's the 🔒 character. Let me search for the actual string.
# Looking at the code: lock.textContent = '🔒';
# In the file it would be the actual emoji character.

# Let me find the exact anchor
lock_anchor = "        if (!isEarned) {\n          var lock = document.createElement('div');\n          lock.className = 'lock-overlay';"

if 'badge-progress' not in js and lock_anchor in js:
    # Insert progress block right before the lock check
    js = js.replace(lock_anchor, progress_block + lock_anchor)
    print("[2b] badges-window.js: progress elements injected into card rendering")
elif 'badge-progress' in js:
    print("[2b] badges-window.js: progress elements already present, skipping")
else:
    print("[2b] ERROR: could not find lock overlay anchor")
    # Try to find what's actually there
    # Search for 'lock-overlay' in js
    idx = js.find('lock-overlay')
    if idx >= 0:
        snippet = js[max(0,idx-200):idx+100]
        print(f"  Found 'lock-overlay' at char {idx}. Nearby text:")
        print(repr(snippet))
    sys.exit(1)

# 2c. Update version comment at top
js = js.replace("// badges-window.js — v3.23.99", "// badges-window.js — v3.23.156")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js)
print("[2c] badges-window.js: written successfully")

# ──────────────────────────────────────────
# 3. Bump manifest version
# ──────────────────────────────────────────
mf_path = f"{PROJECT}/manifest.json"
with open(mf_path, "r", encoding="utf-8") as f:
    mf = f.read()

mf = mf.replace('"version": "3.23.155"', '"version": "3.23.156"')
mf = mf.replace('v3.23.155', 'v3.23.156')
with open(mf_path, "w", encoding="utf-8") as f:
    f.write(mf)
print("[3] manifest.json: bumped to v3.23.156")

print("\nDone! All changes applied.")
