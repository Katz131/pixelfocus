// =============================================================================
// !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!!
// =============================================================================
// gallery.html is a SEPARATE WINDOW (full browser tab) — NOT a Chrome extension
// popup. This script runs inside that tab. The window is opened via
// background.js's openPixelFocusWindow helper, which uses chrome.tabs.create().
// Milestones and canvas upgrades live HERE because they consume textiles, and
// textiles get used here on the loom/canvas.
// =============================================================================

// PixelFocus Gallery - external script (CSP-compliant)
(function() {
  'use strict';

  // ===== Color shop (mirrors app.js — colors are PURCHASED with BOTH textiles AND money $) =====
  // Green is the starter color (free). Every other color costs textiles, and
  // most also cost money ($, shown as coins in state). Textiles come from
  // focus sessions; money comes from streaks/combos/marathons/employees.
  //
  // Pink is the deliberate TEACHING PURCHASE (v3.19.13): 30 textiles, zero
  // money. It's the very first thing a new player can buy after the free
  // Green starter, priced so that about five hours of focused work is
  // enough to experience the "spend textiles → unlock a color → see it on
  // the canvas" loop. White is the second gentle tier at 200 textiles,
  // still money-free. Every color from Teal onward has shifted one slot
  // cheaper vs. the pre-v3.19.13 curve — each color now costs what the
  // NEXT color up used to cost. The grand-finale Amber tier is now 8T
  // textiles instead of the old 32T. Rationale: the old prices were sold
  // in the comment as "a single day of focused work" for Pink, but 1
  // textile = 10 minutes of real focus, which made the old 200-Pink
  // actually a full working week. The shifted curve restores the intended
  // pacing.
  var COLOR_SHOP = [
    { color: '#00ff88', cost: 0,                coinCost: 0,              name: 'Green' },     // starter, free
    { color: '#ff6b9d', cost: 30,               coinCost: 0,              name: 'Pink' },      // teaching #1 — textiles only
    { color: '#ffffff', cost: 200,              coinCost: 0,              name: 'White' },     // teaching #2 — textiles only
    { color: '#4ecdc4', cost: 400,              coinCost: 30,             name: 'Teal' },      // first money-cost tier
    { color: '#ffa502', cost: 8000,             coinCost: 400,            name: 'Orange' },
    { color: '#ff4757', cost: 32000,            coinCost: 1600,           name: 'Red' },
    { color: '#5352ed', cost: 128000,           coinCost: 6400,           name: 'Blue' },
    { color: '#ffd700', cost: 512000,           coinCost: 25600,          name: 'Gold' },
    { color: '#ff00ff', cost: 2000000,          coinCost: 100000,         name: 'Magenta' },
    { color: '#00ffff', cost: 8000000,          coinCost: 400000,         name: 'Cyan' },
    { color: '#9b59b6', cost: 32000000,         coinCost: 1600000,        name: 'Purple' },
    { color: '#e056fd', cost: 128000000,        coinCost: 6400000,        name: 'Lavender' },
    { color: '#f9ca24', cost: 500000000,        coinCost: 25000000,       name: 'Yellow' },
    { color: '#6ab04c', cost: 2000000000,       coinCost: 100000000,      name: 'Forest' },
    { color: '#eb4d4b', cost: 8000000000,       coinCost: 400000000,      name: 'Crimson' },
    { color: '#c0392b', cost: 32000000000,      coinCost: 1600000000,     name: 'Dark Red' },
    { color: '#1abc9c', cost: 128000000000,     coinCost: 6400000000,     name: 'Emerald' },
    { color: '#3498db', cost: 500000000000,     coinCost: 25000000000,    name: 'Sky Blue' },
    { color: '#2c3e50', cost: 2000000000000,    coinCost: 100000000000,   name: 'Midnight' },
    { color: '#f39c12', cost: 8000000000000,    coinCost: 400000000000,   name: 'Amber' },
  ];
  // ===== Canvas upgrade pricing — DUAL CURRENCY (textiles + money $) =====
  // 8x8 is the free starter. The first two tiers (12x12, 16x16) are gentle starter
  // prices so the user can grow their canvas early. After that the curve ramps 10x
  // per 4-pixel step, turning the Master Loom roadmap into a multi-year sink. Each
  // tier costs BOTH textiles AND money ($). The money cost is textile cost / 20
  // so both currencies must be accumulated. (Money is earned from streaks, combo
  // bursts, marathons and employees — see factory.js.)
  //   12x12 =            200 textiles +         $10 (gentle)
  //   16x16 =          2,000 textiles +        $100 (gentle)
  //   20x20 =        100,000 textiles +      $5,000 (astronomical begins)
  //   24x24 =      1,000,000 textiles +     $50,000
  //   28x28 =     10,000,000 textiles +    $500,000
  //   32x32 =    100,000,000 textiles +  $5,000,000
  //   36x36 =  1,000,000,000 textiles + $50,000,000
  //   ...
  function generateCanvasUpgrades(currentSize) {
    var upgrades = [{ size: 8, cost: 0, coinCost: 0, label: '8x8 (starter)' }];
    // Hard-coded gentle starters so the first two upgrades don't bury the user.
    upgrades.push({ size: 12, cost: 200,  coinCost: 10,  label: '12x12' });
    upgrades.push({ size: 16, cost: 2000, coinCost: 100, label: '16x16' });
    // Always include at least the next ~6 tiers past the current size so the
    // user can see the mountain ahead of them.
    var maxSize = Math.max(currentSize + 24, 32);
    var s = 20;
    var cost = 100000;
    while (s <= maxSize) {
      upgrades.push({
        size: s,
        cost: Math.round(cost),
        coinCost: Math.round(cost / 20),
        label: s + 'x' + s
      });
      s += 4;
      cost = cost * 10;
    }
    return upgrades;
  }

  // ===== Big-number formatter for astronomical costs =====
  // 1234 -> "1,234"; 1500000 -> "1.50M"; 12000000000 -> "12.0B"; etc.
  function formatBigCost(n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    if (n < 1000000) return n.toLocaleString();
    var units = [
      { v: 1e15, s: 'Q' },
      { v: 1e12, s: 'T' },
      { v: 1e9,  s: 'B' },
      { v: 1e6,  s: 'M' },
    ];
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i].v) {
        var x = n / units[i].v;
        return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + units[i].s;
      }
    }
    return n.toLocaleString();
  }

  // ===== Sound engine =====
  var SFX = (function() {
    var ctx = null;
    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol) {
      try {
        var c = getCtx(), o = c.createOscillator(), g = c.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, c.currentTime);
        g.gain.setValueAtTime(vol || 0.06, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime); o.stop(c.currentTime + dur);
      } catch(e) {}
    }
    return {
      place: function() { tone(800 + Math.random() * 600, 0.05, 'square', 0.04); },
      erase: function() { tone(300, 0.06, 'triangle', 0.03); },
      error: function() { tone(200, 0.15, 'square', 0.06); },
      click: function() { tone(600, 0.05, 'square', 0.04); },
      save:  function() { [523,659,784,1047,1318].forEach(function(f,i) { setTimeout(function() { tone(f, 0.12, 'square', 0.06); }, i*80); }); },
      del:   function() { [400,300,200].forEach(function(f,i) { setTimeout(function() { tone(f, 0.08, 'square', 0.05); }, i*60); }); }
    };
  })();

  var state = null;
  var activeTool = 'paint';
  var activeColor = '#00ff88';
  var isDrawing = false;
  var debugBar = null;

  var notifEl = document.getElementById('notif');
  function notify(msg) {
    if (notifEl) {
      notifEl.textContent = msg;
      notifEl.classList.add('show');
      setTimeout(function() { notifEl.classList.remove('show'); }, 2500);
    }
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        MsgLog.push(String(msg).replace(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '').trim());
      }
    } catch (_) {}
  }

  // ===== Debug bar (disabled in v3.20.0) =====
  function updateDebug(raw) {
    // Intentionally a no-op. The debug readout is kept around in case we
    // need to re-enable it later, but it should not be visible to players.
    if (debugBar && debugBar.parentNode) {
      debugBar.parentNode.removeChild(debugBar);
      debugBar = null;
    }
  }

  // ===== Load / Save =====
  function load(cb) {
    chrome.storage.local.get('pixelFocusState', function(r) {
      var raw = r.pixelFocusState;
      state = raw || {
        blocks: 0, coins: 0, totalLifetimeBlocks: 0, unlockedColors: ['#00ff88'],
        pixelCanvas: {}, canvasSize: 8, purchasedCanvasSizes: [8], savedArtworks: []
      };
      if (!state.pixelCanvas) state.pixelCanvas = {};
      if (!state.unlockedColors || state.unlockedColors.length === 0) {
        state.unlockedColors = (state.ownedColors && state.ownedColors.length > 0) ? state.ownedColors : ['#00ff88'];
      }
      if (!state.savedArtworks) state.savedArtworks = [];
      if (typeof state.coins !== 'number') state.coins = 0;
      if (typeof state.totalLifetimeBlocks !== 'number') state.totalLifetimeBlocks = 0;
      // v3.19.15: loom sell + profile picture. profilePicture is a
      // stand-alone snapshot copy of a saved artwork so selling/deleting
      // the source doesn't wipe the avatar. loomsSold + coinsFromLoomSales
      // are lifetime stats for future leaderboard / achievement use.
      if (typeof state.loomsSold !== 'number') state.loomsSold = 0;
      if (typeof state.coinsFromLoomSales !== 'number') state.coinsFromLoomSales = 0;
      if (typeof state.profilePicture !== 'object') state.profilePicture = null;
      // ===== Canvas purchase tracking (explicit ownership, NOT inferred) =====
      // Older saves used `state.canvasSize >= u.size` to decide ownership, which
      // meant any bumped canvasSize silently "unlocked" all smaller tiers even if
      // the user never paid for them. We now track actual purchases in an array.
      if (!Array.isArray(state.purchasedCanvasSizes) || state.purchasedCanvasSizes.length === 0) {
        state.purchasedCanvasSizes = [8]; // starter is always owned
      }
      if (state.purchasedCanvasSizes.indexOf(8) === -1) state.purchasedCanvasSizes.push(8);
      // Heal: if canvasSize claims to be a size we don't actually own, snap it
      // back down to the largest size we DO own. This repairs any previous save
      // that was inflated by the old >= heuristic.
      var maxOwned = Math.max.apply(null, state.purchasedCanvasSizes);
      if (!state.canvasSize || state.canvasSize < 8 || state.canvasSize > maxOwned) {
        state.canvasSize = maxOwned;
      }
      // ===== v3.20.0 LOOM PRACTICE STATS =====
      // Cute-but-ominous character sheet for the operator. Numbers climb
      // slowly with practice (and can DIP), and constitution + mental
      // acuity decay glacially once the Computer begins "merging."
      // Proclivities are rolled exactly once per save and saved forever.
      if (!state.loomStats || typeof state.loomStats !== 'object') {
        state.loomStats = {};
      }
      var ls = state.loomStats;
      if (typeof ls.totalWoven !== 'number')      ls.totalWoven = 0;
      if (!Array.isArray(ls.ratings))             ls.ratings = [];       // rolling last 50
      if (typeof ls.bestRating !== 'number')      ls.bestRating = 0;
      if (typeof ls.skill !== 'number')           ls.skill = 10;         // 0..100, climbs slowly
      if (typeof ls.constitution !== 'number')    ls.constitution = 0;   // set by roll
      if (typeof ls.mentalAcuity !== 'number')    ls.mentalAcuity = 0;   // set by roll
      if (typeof ls.lastWovenAt !== 'number')     ls.lastWovenAt = 0;
      if (typeof ls.lastDecayTickAt !== 'number') ls.lastDecayTickAt = 0;
      if (typeof ls.absentScold !== 'number')     ls.absentScold = 0;   // escalation level
      // -- Proclivities: rolled exactly once, saved forever. --
      if (!ls.proclivities || typeof ls.proclivities !== 'object') {
        ls.proclivities = rollLoomProclivities();
        // Seed constitution + mental acuity from the roll so every
        // player starts with a genuinely different baseline.
        ls.constitution  = ls.proclivities.constitution_seed;
        ls.mentalAcuity  = ls.proclivities.mental_acuity_seed;
        ls.rolledAt = Date.now();
      }

      // -- v3.20.8 Backfill: if there are saved artworks but no ratings
      // in loomStats, retroactively compute ratings for them. This covers
      // players who saved artworks BEFORE the v3.20.0 practice system
      // existed.
      //
      // The ratings use the same star formula the player already sees on
      // gallery cards (1-5 stars) mapped to a 0-100 scale:
      //   1 star  → 20,  2 stars → 40,  3 stars → 60,
      //   4 stars → 80,  5 stars → 100
      // with a small per-artwork jitter (±4) so the sparkline isn't flat.
      //
      // totalWoven also accounts for sold looms — selling a piece removes
      // it from savedArtworks but the work was still done, so the sold
      // count is added back. --
      var arts = Array.isArray(state.savedArtworks) ? state.savedArtworks : [];
      var sold = typeof state.loomsSold === 'number' ? state.loomsSold : 0;
      var totalCreated = arts.length + sold;
      if (totalCreated > 0 && ls.ratings.length === 0) {
        var backfilled = [];
        var bestBack = 0;
        var lastDate = 0;
        for (var bi = 0; bi < arts.length; bi++) {
          var art = arts[bi];
          // If the artwork already carries a v3.20.0 rating, use it.
          var r;
          if (typeof art.rating === 'number' && art.rating > 0) {
            r = art.rating;
          } else {
            // Compute the same 1-5 stars the gallery card shows, then
            // map directly to the 0-100 scale (20 per star).
            var starScore = 3; // default midpoint
            try {
              var px = art.pixelCount || Object.keys(art.pixels || {}).length;
              var cols = 0;
              var seen = {};
              for (var pk in (art.pixels || {})) {
                if ((art.pixels || {}).hasOwnProperty(pk)) {
                  var cv = art.pixels[pk];
                  if (!seen[cv]) { seen[cv] = 1; cols++; }
                }
              }
              var sz = art.size || 16;
              var effort   = Math.min(px / 500, 1);
              var variety  = Math.min(cols / 8, 1);
              var ambition = Math.min(Math.max((sz - 8) / 56, 0), 1);
              var raw01 = (effort * 0.45) + (variety * 0.30) + (ambition * 0.25);
              starScore = Math.round(raw01 * 5);
              if (starScore < 1) starScore = 1;
              if (starScore > 5) starScore = 5;
            } catch (e) { /* ignore */ }
            // Map stars to 0-100: 1★=20, 2★=40, 3★=60, 4★=80, 5★=100
            // with a small deterministic jitter (±4) per artwork.
            var jitter = ((bi * 7 + 3) % 9) - 4;
            r = Math.max(1, Math.min(100, starScore * 20 + jitter));
          }
          backfilled.push(r);
          if (r > bestBack) bestBack = r;
          if (art.date && art.date > lastDate) lastDate = art.date;
        }
        // For sold looms we no longer have the pixel data, but we know
        // they existed. Add placeholder ratings at the rolling average
        // of the known pieces (with per-entry jitter) so the total
        // count is accurate and the sparkline has the right length.
        if (sold > 0 && backfilled.length > 0) {
          var avgBack = 0;
          for (var si = 0; si < backfilled.length; si++) avgBack += backfilled[si];
          avgBack = Math.round(avgBack / backfilled.length);
          for (var sj = 0; sj < sold; sj++) {
            var sJit = ((sj * 11 + 5) % 9) - 4;
            backfilled.unshift(Math.max(1, Math.min(100, avgBack + sJit)));
          }
        }
        // Cap to last 50 (same as the live system).
        ls.ratings = backfilled.length > 50 ? backfilled.slice(-50) : backfilled;
        if (ls.totalWoven < totalCreated) ls.totalWoven = totalCreated;
        if (bestBack > ls.bestRating) ls.bestRating = bestBack;
        if (lastDate > ls.lastWovenAt) ls.lastWovenAt = lastDate;
      }
      // Even outside of a full backfill, make sure totalWoven never
      // falls below the real count (arts on hand + arts sold).
      if (ls.totalWoven < totalCreated) ls.totalWoven = totalCreated;

      updateDebug(raw);
      cb();
    });
  }

  // ===== v3.20.0 LOOM PROCLIVITIES =====
  // Rolls a fresh set of artistic/constitutional proclivities on the
  // operator's first visit. Different players genuinely get different
  // starting points and improvement slopes. Completely deterministic
  // per-session (uses Math.random once, then sticks forever).
  //
  // The roll is cute, slightly ominous, and played completely straight
  // in the narrator voice: the standing office has, for some time, been
  // assembling your file.
  var LOOM_PROCLIVITIES = {
    palette: [
      { key: 'warm',          blurb: 'Prefers warm palettes. Reds and oranges feel correct to the operator. Blues feel rented.' },
      { key: 'cool',          blurb: 'Prefers cool palettes. Warm colours feel, to the operator, like someone else\u2019s holiday.' },
      { key: 'monochromatic', blurb: 'Monochromatic tendencies. The operator has been quietly rating other people\u2019s artwork out of one colour.' },
      { key: 'riotous',       blurb: 'Riotous palette. The operator considers seven colours to be a polite minimum.' },
      { key: 'subdued',       blurb: 'Subdued palette. The operator is suspicious of colours that arrive unannounced.' },
      { key: 'opinionated',   blurb: 'Opinionated palette. The operator has, in writing, objected to turquoise.' }
    ],
    tempo: [
      { key: 'slow_starter',  blurb: 'Slow starter. The first several looms are forgettable. The later ones are not.' },
      { key: 'fast_starter',  blurb: 'Fast starter. Early looms are uncharacteristically competent; later ones plateau politely.' },
      { key: 'streaky',       blurb: 'Streaky. Three good ones in a row, then one loom the operator would rather not discuss.' },
      { key: 'consistent',    blurb: 'Consistent. The operator\u2019s ratings form a reassuringly flat line. Flat lines are, on other monitors, concerning.' },
      { key: 'late_bloomer',  blurb: 'Late bloomer. The operator\u2019s work improves sharply at an unspecified future date.' }
    ],
    // Signature flaw: something slightly off, permanently. Adds character.
    flaw: [
      { key: 'overfills',          blurb: 'Overfills. The operator cannot leave a canvas with empty pixels. The empty ones are judging them.' },
      { key: 'underfills',         blurb: 'Underfills. The operator stops one row short, citing "restraint."' },
      { key: 'symmetrical',        blurb: 'Compulsive symmetry. Asymmetric looms give the operator a headache and, briefly, a grudge.' },
      { key: 'intrusive_dots',     blurb: 'Intrusive dots. A single unexplained pixel appears on every loom. Removing it does not help.' },
      { key: 'corner_dweller',     blurb: 'Corner dweller. The operator always starts in the bottom-left. They cannot account for this.' },
      { key: 'borderline_realist', blurb: 'Borderline realist. The operator believes the loom should, eventually, resemble something.' }
    ],
    // Cute but ominous: the "file" the Computer is keeping.
    file_note: [
      'Noted as "of measured craft."',
      'Noted as "contracted mildly."',
      'Noted as "considered promising, contingent on further cooperation."',
      'Noted as "adjacent, at present, to usefulness."',
      'Noted as "stable; do not disturb."',
      'Noted as "under quiet review."',
      'Noted as "a model of domestic productivity."',
      'Noted as "compliant-adjacent."',
      'Noted as "a person of great and, frankly, untapped potential."'
    ]
  };
  function rollLoomProclivities() {
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    var palette = pick(LOOM_PROCLIVITIES.palette);
    var tempo   = pick(LOOM_PROCLIVITIES.tempo);
    var flaw    = pick(LOOM_PROCLIVITIES.flaw);
    var note    = pick(LOOM_PROCLIVITIES.file_note);
    // Constitution + Mental Acuity seeds: 40..75. The Computer will
    // whittle these down later; the high end is the high-water mark.
    var consSeed = 40 + Math.floor(Math.random() * 36);
    var acuSeed  = 40 + Math.floor(Math.random() * 36);
    // Starting skill slope: 0.6 .. 1.4 — slow players and fast players.
    var slope = 0.6 + Math.random() * 0.8;
    return {
      palette_key: palette.key,          palette_blurb: palette.blurb,
      tempo_key:   tempo.key,            tempo_blurb:   tempo.blurb,
      flaw_key:    flaw.key,             flaw_blurb:    flaw.blurb,
      file_note:   note,
      constitution_seed: consSeed,
      mental_acuity_seed: acuSeed,
      skill_slope: slope
    };
  }

  function save() {
    chrome.storage.local.set({ pixelFocusState: state }, function() {
      updateDebug(state);
    });
  }

  // ===== Palette =====
  function renderPalette() {
    var pal = document.getElementById('palette');
    if (!pal) return;
    pal.innerHTML = '';
    var colors = state.unlockedColors;
    if (!colors || !Array.isArray(colors) || colors.length === 0) colors = ['#00ff88'];

    // Find a friendly name for a color from the shop list
    function colorName(hex) {
      for (var i = 0; i < COLOR_SHOP.length; i++) {
        if (COLOR_SHOP[i].color === hex) return COLOR_SHOP[i].name;
      }
      return hex;
    }

    colors.forEach(function(c) {
      var el = document.createElement('div');
      el.className = 'palette-color' + (c === activeColor ? ' selected' : '');
      el.style.background = c;
      el.style.boxShadow = '0 0 4px ' + c;
      var nm = colorName(c);
      var sel = (c === activeColor) ? ' (currently selected)' : '';
      el.setAttribute('title', nm + ' (' + c + ')' + sel + '. Click to make it your active paint color.');
      el.addEventListener('click', function() {
        activeColor = c;
        SFX.click();
        renderPalette();
      });
      pal.appendChild(el);
    });
  }

  // ===== Canvas =====
  var GRID_COLOR = '#3d3d6a';
  var EMPTY_COLOR = '#0e0e1c';
  var GRID_GAP = 1;
  var canvasEl = document.getElementById('pixelCanvas');
  var ctx2d = canvasEl.getContext('2d');
  var cellSize = 32;
  var hoverCell = null;

  function getGridSize() {
    var s = Number(state.canvasSize);
    // Fallback is 8 (the starter size), NOT 16 — otherwise a missing canvasSize
    // silently gives the user a larger canvas they never paid for.
    if (!s || isNaN(s) || s < 4) s = 8;
    return Math.floor(s);
  }

  function renderCanvas() {
    var size = getGridSize();
    cellSize = Math.max(8, Math.min(30, Math.floor(480 / size)));
    var totalPx = (size * cellSize) + ((size + 1) * GRID_GAP);
    canvasEl.width = totalPx;
    canvasEl.height = totalPx;
    canvasEl.style.width = totalPx + 'px';
    canvasEl.style.height = totalPx + 'px';

    ctx2d.fillStyle = GRID_COLOR;
    ctx2d.fillRect(0, 0, totalPx, totalPx);

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var px = GRID_GAP + x * (cellSize + GRID_GAP);
        var py = GRID_GAP + y * (cellSize + GRID_GAP);
        var color = state.pixelCanvas[x + ',' + y] || EMPTY_COLOR;
        ctx2d.fillStyle = color;
        ctx2d.fillRect(px, py, cellSize, cellSize);
      }
    }

    if (hoverCell) {
      var hx = GRID_GAP + hoverCell.x * (cellSize + GRID_GAP);
      var hy = GRID_GAP + hoverCell.y * (cellSize + GRID_GAP);
      ctx2d.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(hx, hy, cellSize, cellSize);
    }
  }

  function getCellFromEvent(e) {
    var rect = canvasEl.getBoundingClientRect();
    var scaleX = canvasEl.width / rect.width;
    var scaleY = canvasEl.height / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top) * scaleY;
    var size = getGridSize();
    var step = cellSize + GRID_GAP;
    var x = Math.floor((mx - GRID_GAP) / step);
    var y = Math.floor((my - GRID_GAP) / step);
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return { x: x, y: y };
  }

  canvasEl.addEventListener('mousedown', function(e) {
    e.preventDefault();
    isDrawing = true;
    var cell = getCellFromEvent(e);
    if (cell) handlePixel(cell.x, cell.y);
  });
  canvasEl.addEventListener('mousemove', function(e) {
    var cell = getCellFromEvent(e);
    hoverCell = cell;
    if (isDrawing && cell) handlePixel(cell.x, cell.y);
    else renderCanvas();
  });
  canvasEl.addEventListener('mouseleave', function() { hoverCell = null; renderCanvas(); });
  document.addEventListener('mouseup', function() { isDrawing = false; });

  function handlePixel(x, y) {
    var key = x + ',' + y;
    if (activeTool === 'paint') {
      if (state.pixelCanvas[key] === activeColor) return;
      if (!state.pixelCanvas[key] && state.blocks <= 0) {
        SFX.error();
        notify('No blocks available! Complete 10-min focus sessions to earn blocks.');
        return;
      }
      if (!state.pixelCanvas[key]) state.blocks--;
      state.pixelCanvas[key] = activeColor;
      SFX.place();
    } else if (activeTool === 'erase') {
      if (state.pixelCanvas[key]) {
        delete state.pixelCanvas[key];
        state.blocks++;
        SFX.erase();
      }
    }
    save();
    renderCanvas();
    renderStats();
  }


  function renderStats() {
    document.getElementById('availableBlocks').textContent = state.blocks;
    var coinEl = document.getElementById('availableCoins');
    if (coinEl) coinEl.textContent = (state.coins || 0).toLocaleString();
    document.getElementById('canvasPixels').textContent = Object.keys(state.pixelCanvas).length;
    document.getElementById('canvasDim').textContent = state.canvasSize + 'x' + state.canvasSize;
    var sizeLabel = document.getElementById('sizeLabel');
    if (sizeLabel) sizeLabel.textContent = state.canvasSize + 'x' + state.canvasSize;
    document.getElementById('galleryCount').textContent = (state.savedArtworks || []).length;
    renderMilestones();
    renderCanvasUpgrades();
    updateDebug(state);
    // Stage archive: re-evaluate unlock thresholds after every
    // stat refresh so entries gated on textiles/money/etc. light
    // up promptly when the player crosses a threshold.
    try { checkGalleryStageUnlocks(); } catch (_) {}
  }

  function renderMilestones() {
    var container = document.getElementById('milestoneList');
    if (!container) return;
    container.innerHTML = '';

    // Ensure the free starter color is in the palette (fresh saves, etc.)
    if (!state.unlockedColors) state.unlockedColors = [];
    if (state.unlockedColors.indexOf('#00ff88') === -1) {
      state.unlockedColors.push('#00ff88');
    }

    var ownedSet = {};
    state.unlockedColors.forEach(function(c) { ownedSet[c] = true; });

    // Find the first unowned tier — only that one and the next one are actively purchasable.
    // Later tiers show as locked (need previous tier first) so the shop has a clear progression.
    var firstUnownedIdx = -1;
    for (var i = 0; i < COLOR_SHOP.length; i++) {
      if (!ownedSet[COLOR_SHOP[i].color]) { firstUnownedIdx = i; break; }
    }

    COLOR_SHOP.forEach(function(m, idx) {
      var owned = !!ownedSet[m.color];
      var isNext = !owned && idx === firstUnownedIdx;
      var locked = !owned && !isNext;
      var haveBlocks = state.blocks || 0;
      var haveCoins = state.coins || 0;
      var coinCost = m.coinCost || 0;
      var canAfford = isNext && haveBlocks >= m.cost && haveCoins >= coinCost;

      // Cost phrasing helpers — colors with zero coinCost (e.g. the Pink
      // teaching purchase at 200 textiles + $0) shouldn't show "$0" in
      // tooltips, so we assemble the cost string conditionally per item.
      var costLong = m.cost.toLocaleString() + ' textiles' +
                     (coinCost > 0 ? ' and $' + coinCost.toLocaleString() : '');
      var costShort = m.cost.toLocaleString() + ' textiles' +
                      (coinCost > 0 ? ' + $' + coinCost.toLocaleString() : '');

      var el = document.createElement('div');
      el.className = 'milestone-item' +
        (owned ? ' unlocked' : '') +
        (isNext && canAfford ? ' available' : '') +
        (locked ? ' locked' : '');

      var rowTip;
      if (owned) {
        rowTip = m.name + ' (' + m.color + ') \u2014 owned. This paint is in your palette.';
      } else if (isNext && canAfford) {
        rowTip = m.name + ' \u2014 READY to buy. Click to spend ' + costLong + ' to add this color to your palette.';
      } else if (isNext) {
        var needBlocks = Math.max(0, m.cost - haveBlocks);
        var needCoins = Math.max(0, coinCost - haveCoins);
        rowTip = m.name + ' \u2014 next color in line. Costs ' + costShort + '.';
        if (needBlocks > 0) rowTip += ' Need ' + needBlocks.toLocaleString() + ' more textiles.';
        if (needCoins > 0) rowTip += ' Need $' + needCoins.toLocaleString() + ' more money.';
      } else {
        rowTip = 'LOCKED color \u2014 buy the previous tier first. Future cost: ' + costShort + '.';
      }
      el.setAttribute('title', rowTip);

      var swatch = document.createElement('div');
      swatch.className = 'milestone-swatch';
      swatch.style.background = owned ? m.color : 'var(--border)';
      if (owned) swatch.style.boxShadow = '0 0 6px ' + m.color + '40';
      swatch.setAttribute('title', owned ? (m.name + ' \u2014 owned paint color.') : (locked ? 'Locked \u2014 buy the previous color first.' : (m.name + ' \u2014 costs ' + costShort + '.')));

      var info = document.createElement('div');
      info.className = 'milestone-info';

      var name = document.createElement('span');
      name.className = 'milestone-name';
      name.textContent = (owned || isNext) ? m.name : '???';
      name.setAttribute('title', (owned || isNext) ? m.name : 'Hidden until previous color is purchased.');

      var req = document.createElement('span');
      req.className = 'milestone-req';
      if (owned) {
        req.textContent = '\u2713 Owned';
        req.style.color = 'var(--accent)';
        req.setAttribute('title', 'You already own this color.');
      } else if (m.cost === 0 && coinCost === 0) {
        req.textContent = 'FREE';
        req.setAttribute('title', 'Starter color, always yours.');
      } else {
        req.textContent = formatBigCost(m.cost) + ' tex' +
                          (coinCost > 0 ? ' + $' + formatBigCost(coinCost) : '');
        req.setAttribute('title', 'Costs ' + m.cost.toLocaleString() + ' textiles' +
                          (coinCost > 0 ? ' AND $' + coinCost.toLocaleString() + ' money' : '') + '.');
      }

      info.appendChild(name);
      info.appendChild(req);
      el.appendChild(swatch);
      el.appendChild(info);

      // Progress bar for "next" tier only. Shows the LIMITING currency so the
      // user sees which resource is furthest from letting them buy this color.
      if (isNext && (m.cost > 0 || coinCost > 0)) {
        var blockPct = m.cost > 0 ? (haveBlocks / m.cost) : 1;
        var coinPct = coinCost > 0 ? (haveCoins / coinCost) : 1;
        var limiting = Math.min(blockPct, coinPct);
        var pct = Math.min(100, limiting * 100);
        var bar = document.createElement('div');
        bar.className = 'milestone-bar';
        bar.setAttribute('title', pct.toFixed(1) + '% of the way to affording this color (limited by your ' + (blockPct < coinPct ? 'textiles' : 'money') + ').');
        var fill = document.createElement('div');
        fill.className = 'milestone-bar-fill';
        fill.style.width = pct + '%';
        bar.appendChild(fill);
        el.appendChild(bar);
      }

      // Purchase click
      if (isNext && canAfford) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function() {
          if ((state.blocks || 0) < m.cost) { SFX.error(); return; }
          if ((state.coins || 0) < coinCost) { SFX.error(); return; }
          state.blocks -= m.cost;
          state.coins -= coinCost;
          if (state.unlockedColors.indexOf(m.color) === -1) {
            state.unlockedColors.push(m.color);
          }
          SFX.save();
          notify(m.name + ' added to palette. Spent ' + m.cost.toLocaleString() + ' textiles' +
                 (coinCost > 0 ? ' + $' + coinCost.toLocaleString() : '') + '.');
          save();
          renderPalette();
          renderMilestones();
          renderStats();
        });
      } else if (isNext && !canAfford) {
        el.addEventListener('click', function() { SFX.error(); });
      } else if (locked) {
        el.addEventListener('click', function() { SFX.error(); });
      }

      container.appendChild(el);
    });
  }

  // Dye Research is a Factory upgrade that discounts canvas upgrade textile cost.
  // Levels: 0 = no discount, 1 = 10%, 2 = 20%, 3 = 35%, 4 = 50%, 5 = 70%
  function getDyeDiscount() {
    var l = state.dyeResearchLevel || 0;
    return [0, 0.10, 0.20, 0.35, 0.50, 0.70][Math.min(l, 5)];
  }
  function applyDyeDiscount(rawCost) {
    var d = getDyeDiscount();
    if (d <= 0) return rawCost;
    return Math.max(1, Math.ceil(rawCost * (1 - d)));
  }

  function renderCanvasUpgrades() {
    var container = document.getElementById('upgradeList');
    if (!container) return;
    container.innerHTML = '';
    var upgrades = generateCanvasUpgrades(state.canvasSize);
    var dyeDiscount = getDyeDiscount();
    var owned_list = state.purchasedCanvasSizes || [8];
    var maxOwned = Math.max.apply(null, owned_list);

    upgrades.forEach(function(u) {
      // OWNERSHIP IS EXPLICIT — we only mark a size as owned if the user actually
      // bought it (or it's the free 8x8 starter). Previously we used canvasSize >=
      // which silently "owned" all smaller sizes for any inflated canvasSize.
      var owned = owned_list.indexOf(u.size) !== -1;
      // Next-up: the smallest not-yet-owned size in the shop.
      var nextUp = !owned && u.size === upgrades.reduce(function(acc, x) {
        return (owned_list.indexOf(x.size) === -1 && x.size > maxOwned && (acc == null || x.size < acc)) ? x.size : acc;
      }, null);
      var effectiveCost = applyDyeDiscount(u.cost);
      var coinCost = u.coinCost || 0;
      var haveBlocks = state.blocks || 0;
      var haveCoins = state.coins || 0;
      var canAfford = haveBlocks >= effectiveCost && haveCoins >= coinCost;

      var el = document.createElement('div');
      el.className = 'upgrade-btn' + (owned ? ' owned' : '') + (nextUp && canAfford ? ' available' : '');

      // Per-row tooltip
      var rowTip;
      if (owned) {
        rowTip = u.label + ' \u2014 you already own this canvas size.';
      } else if (!nextUp) {
        rowTip = u.label + ' \u2014 locked until you buy the previous size first. Costs ' + effectiveCost.toLocaleString() + ' textiles + $' + coinCost.toLocaleString() + '.';
      } else if (canAfford) {
        rowTip = u.label + ' \u2014 READY to buy. Click to spend ' + effectiveCost.toLocaleString() + ' textiles + $' + coinCost.toLocaleString() + ' and grow your canvas to ' + u.size + 'x' + u.size + '.';
      } else {
        var needB = Math.max(0, effectiveCost - haveBlocks);
        var needC = Math.max(0, coinCost - haveCoins);
        rowTip = u.label + ' \u2014 costs ' + effectiveCost.toLocaleString() + ' textiles + $' + coinCost.toLocaleString() + '.';
        if (needB > 0) rowTip += ' Need ' + needB.toLocaleString() + ' more textiles.';
        if (needC > 0) rowTip += ' Need $' + needC.toLocaleString() + ' more money.';
      }
      if (dyeDiscount > 0 && effectiveCost !== u.cost) {
        rowTip += ' (Dye Research saved you ' + (u.cost - effectiveCost).toLocaleString() + ' textiles.)';
      }
      el.setAttribute('title', rowTip);

      var labelSpan = document.createElement('span');
      labelSpan.textContent = u.label;
      labelSpan.setAttribute('title', 'Upgrade your canvas to ' + u.size + 'x' + u.size + ' (' + (u.size * u.size) + ' total pixels).');
      var costSpan = document.createElement('span');
      if (owned) {
        costSpan.textContent = '\u2713 Owned';
        costSpan.setAttribute('title', 'You already own this canvas size.');
      } else if (dyeDiscount > 0 && effectiveCost !== u.cost) {
        costSpan.innerHTML = '<span style="text-decoration:line-through;color:var(--text-dim);">' + formatBigCost(u.cost) + '</span> ' + formatBigCost(effectiveCost) + ' tex + $' + formatBigCost(coinCost);
        costSpan.setAttribute('title', 'Original textile cost: ' + u.cost.toLocaleString() + '. After Dye Research discount: ' + effectiveCost.toLocaleString() + ' textiles. Plus $' + coinCost.toLocaleString() + ' money.');
      } else {
        costSpan.textContent = formatBigCost(effectiveCost) + ' tex + $' + formatBigCost(coinCost);
        costSpan.setAttribute('title', 'Costs ' + effectiveCost.toLocaleString() + ' textiles AND $' + coinCost.toLocaleString() + ' money.');
      }
      el.appendChild(labelSpan);
      el.appendChild(costSpan);

      if (!owned && canAfford && nextUp) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function() {
          if ((state.blocks || 0) < effectiveCost) { SFX.error(); return; }
          if ((state.coins || 0) < coinCost) { SFX.error(); return; }
          state.blocks -= effectiveCost;
          state.coins -= coinCost;
          if (!Array.isArray(state.purchasedCanvasSizes)) state.purchasedCanvasSizes = [8];
          if (state.purchasedCanvasSizes.indexOf(u.size) === -1) state.purchasedCanvasSizes.push(u.size);
          state.canvasSize = u.size;
          SFX.save();
          notify('Master Loom expanded to ' + u.size + 'x' + u.size + '. Spent ' + effectiveCost.toLocaleString() + ' textiles + $' + coinCost.toLocaleString() + '.');
          save();
          renderCanvas();
          renderStats();
        });
      } else if (!owned && !canAfford) {
        el.addEventListener('click', function() { SFX.error(); });
      }
      container.appendChild(el);
    });
  }

  // ===== Loom Star Rating (v3.19.16) =====
  // Deterministic 1–5 star quality score shown on every gallery card
  // and on the sell modal. Unlike the sell price (which rolls RNG on
  // top of the stats), the rating is a pure function of the inputs
  // so it never flips between renders and the player can use it as a
  // predictive quality gauge BEFORE they commit to a sale.
  //
  // Three normalized sub-scores, each clamped to [0,1]:
  //   effort   = pixels / 500        — textiles invested (raw labor)
  //   variety  = colors / 8          — palette diversity
  //   ambition = (size - 8) / 56     — canvas edge scaled 8→0, 64→1
  // Weighted sum: effort 45% + variety 30% + ambition 25%.
  // Stars = clamp(round(score × 5), 1, 5).
  // A full 64×64 canvas with 500+ pixels and 8+ colors pins 5 stars;
  // a tiny 1-color 16×16 doodle sits at 1 star.
  function getLoomQualityScore(art) {
    if (!art) return 0;
    var pixels = art.pixelCount || Object.keys(art.pixels || {}).length;
    var colors = countUniqueLoomColors(art);
    var size = art.size || 16;
    var effort   = Math.min(pixels / 500, 1);
    var variety  = Math.min(colors / 8, 1);
    var ambition = Math.min(Math.max((size - 8) / 56, 0), 1);
    return (effort * 0.45) + (variety * 0.30) + (ambition * 0.25);
  }
  function getLoomStars(art) {
    var score = getLoomQualityScore(art);
    var stars = Math.round(score * 5);
    if (stars < 1) stars = 1;
    if (stars > 5) stars = 5;
    return stars;
  }
  // Build a 5-char string like "★★★☆☆" for a given rating.
  function formatStarRow(stars) {
    var full = '\u2605';  // filled star
    var empty = '\u2606'; // empty star
    var out = '';
    for (var i = 0; i < 5; i++) out += (i < stars ? full : empty);
    return out;
  }

  // ===== Loom Sell Valuation (v3.19.15) =====
  // RNG-rolled offer price for a saved artwork. Inputs: pixel count
  // (each filled pixel = 1 textile spent on the loom), unique color
  // count, and canvas edge size. The formula is deliberately tuned
  // to sit ALONGSIDE — not replace — the existing money sources:
  //   - Combo bursts (2x..5x chains):  $15..$200 per session
  //   - Daily marathon thresholds:     $50..$2,000
  //   - End-of-day streak bonus:       ~$50..$500 on a full day
  // A small doodle nets $20..$40 of fun money; a huge, colorful
  // masterpiece on a 64x64+ canvas can hit $3k..$20k, commensurate
  // with the hundreds of hours of focus already spent earning those
  // textiles. The color shop curve (textiles costs Millions+ at the
  // high end) keeps selling from becoming a dominant strategy — you
  // still need real focus sessions to buy the top tiers.
  //
  // Formula:
  //   base       = pixels * BASE_PER_PIXEL
  //   colorBonus = (colors ^ 1.5) * COLOR_BONUS
  //   sizeMult   = lookup by canvas edge (16->1.0, 64->1.8, 128->2.6)
  //   subtotal   = (base + colorBonus) * sizeMult
  //   grade roll = weighted pick of rough / fair / good / great /
  //                masterpiece / legendary (RNG-driven, rare highs)
  //   final      = round(subtotal * gradeMult)
  // Returns { price, grade, gradeColor, multiplier, pixels, colors,
  //           sizeMult, base, colorBonus, subtotal }.
  var LOOM_SELL_BASE_PER_PIXEL = 1.2;
  var LOOM_SELL_COLOR_BONUS_COEF = 2.0;
  var LOOM_SELL_GRADE_TABLE = [
    // { threshold, mult, label, color }
    { p: 0.12, mult: 0.70, label: 'ROUGH SKETCH',  color: '#888888' },
    { p: 0.35, mult: 0.85, label: 'FAIR WORK',     color: '#a0a0a0' },
    { p: 0.70, mult: 1.00, label: 'GOOD PIECE',    color: '#4ecdc4' },
    { p: 0.90, mult: 1.20, label: 'GREAT WORK',    color: '#00ff88' },
    { p: 0.98, mult: 1.55, label: 'MASTERPIECE',   color: '#ffd700' },
    { p: 1.00, mult: 2.10, label: 'LEGENDARY',     color: '#ff00ff' }
  ];
  function getLoomSizeMult(size) {
    // Lookup table for canvas sizes. Linear interpolate between known
    // points so non-standard sizes still produce sensible values.
    if (size <= 8)   return 0.8;
    if (size <= 12)  return 0.9;
    if (size <= 16)  return 1.0;
    if (size <= 20)  return 1.1;
    if (size <= 24)  return 1.15;
    if (size <= 28)  return 1.22;
    if (size <= 32)  return 1.30;
    if (size <= 40)  return 1.42;
    if (size <= 48)  return 1.55;
    if (size <= 56)  return 1.68;
    if (size <= 64)  return 1.80;
    if (size <= 80)  return 2.00;
    if (size <= 96)  return 2.20;
    if (size <= 128) return 2.60;
    return 3.00;
  }
  function countUniqueLoomColors(art) {
    if (!art || !art.pixels) return 0;
    var seen = Object.create(null);
    var n = 0;
    for (var k in art.pixels) {
      if (!Object.prototype.hasOwnProperty.call(art.pixels, k)) continue;
      var c = art.pixels[k];
      if (!seen[c]) { seen[c] = 1; n++; }
    }
    return n;
  }
  function rollLoomGrade() {
    var r = Math.random();
    for (var i = 0; i < LOOM_SELL_GRADE_TABLE.length; i++) {
      if (r <= LOOM_SELL_GRADE_TABLE[i].p) return LOOM_SELL_GRADE_TABLE[i];
    }
    return LOOM_SELL_GRADE_TABLE[LOOM_SELL_GRADE_TABLE.length - 1];
  }
  function getLoomSellValue(art) {
    if (!art) return null;
    var pixels = art.pixelCount || Object.keys(art.pixels || {}).length;
    var colors = countUniqueLoomColors(art);
    var size = art.size || 16;
    var base = pixels * LOOM_SELL_BASE_PER_PIXEL;
    var colorBonus = Math.pow(Math.max(colors, 1), 1.5) * LOOM_SELL_COLOR_BONUS_COEF;
    var sizeMult = getLoomSizeMult(size);
    var subtotal = (base + colorBonus) * sizeMult;
    var grade = rollLoomGrade();
    // Small ±8% jitter inside the grade's band so two sells with the
    // same inputs don't produce identical prices.
    var jitter = 0.92 + Math.random() * 0.16;
    var price = Math.max(1, Math.round(subtotal * grade.mult * jitter));
    return {
      price: price,
      grade: grade.label,
      gradeColor: grade.color,
      multiplier: grade.mult,
      pixels: pixels,
      colors: colors,
      size: size,
      sizeMult: sizeMult,
      base: base,
      colorBonus: colorBonus,
      subtotal: subtotal
    };
  }

  // ===== Sell modal state (v3.19.15) =====
  // Tracks which artwork index is currently being offered for sale and
  // the exact rolled quote. Re-opening the modal re-rolls.
  var pendingSell = null;
  function openSellLoomModal(idx) {
    var art = (state.savedArtworks || [])[idx];
    if (!art) return;
    var quote = getLoomSellValue(art);
    if (!quote) return;
    pendingSell = { idx: idx, quote: quote };
    var modal = document.getElementById('sellLoomModal');
    if (!modal) return;
    // Draw the preview thumbnail
    var prev = document.getElementById('sellLoomPreview');
    if (prev) {
      var artSize = art.size || 16;
      prev.width = artSize; prev.height = artSize;
      var pcx = prev.getContext('2d');
      pcx.fillStyle = '#08080f';
      pcx.fillRect(0, 0, artSize, artSize);
      Object.keys(art.pixels || {}).forEach(function(key) {
        var parts = key.split(',');
        pcx.fillStyle = art.pixels[key];
        pcx.fillRect(parseInt(parts[0], 10), parseInt(parts[1], 10), 1, 1);
      });
    }
    var starsEl = document.getElementById('sellLoomStars');
    if (starsEl) {
      var stars = getLoomStars(art);
      starsEl.textContent = formatStarRow(stars);
      var sellStarTip = stars + ' out of 5 stars. Stars are based on three things: pixels placed (effort, 45%), colours used (variety, 30%), and canvas size (ambition, 25%). ';
      if (stars <= 2) sellStarTip += 'A low star rating means fewer pixels, fewer colours, or a small canvas. The auction price will reflect this. ';
      else if (stars >= 4) sellStarTip += 'A high star rating means strong effort, variety, and ambition. The auction price will be on the generous side. ';
      sellStarTip += 'The final auction price adds some randomness on top of this rating, so two pieces with the same stars may sell for different amounts.';
      starsEl.setAttribute('title', sellStarTip);
    }
    var stats = document.getElementById('sellLoomStats');
    if (stats) {
      stats.textContent = quote.pixels + ' textiles \u00b7 ' + quote.colors + ' color' + (quote.colors === 1 ? '' : 's') + ' \u00b7 ' + quote.size + 'x' + quote.size + ' canvas';
    }
    var banner = document.getElementById('sellLoomGradeBanner');
    if (banner) {
      banner.textContent = quote.grade;
      banner.style.color = quote.gradeColor;
      banner.style.border = '1px solid ' + quote.gradeColor;
      banner.style.textShadow = '0 0 8px ' + quote.gradeColor + '66';
    }
    var priceEl = document.getElementById('sellLoomPrice');
    if (priceEl) {
      priceEl.textContent = '$' + quote.price.toLocaleString();
    }
    modal.style.display = 'flex';
    try { SFX.click(); } catch (_) {}
  }
  function closeSellLoomModal() {
    var modal = document.getElementById('sellLoomModal');
    if (modal) modal.style.display = 'none';
    pendingSell = null;
  }
  function confirmSellLoom() {
    if (!pendingSell) { closeSellLoomModal(); return; }
    var idx = pendingSell.idx;
    var quote = pendingSell.quote;
    var art = (state.savedArtworks || [])[idx];
    if (!art) { closeSellLoomModal(); return; }
    // If the sold artwork was the current profile picture, clear it.
    // (profilePicture is a snapshot copy so it won't reference-break,
    // but it would still be weird to keep a profile image of a loom
    // you just auctioned off.)
    try {
      if (state.profilePicture && state.profilePicture.savedAt && art.date && state.profilePicture.savedAt === art.date) {
        state.profilePicture = null;
      }
    } catch (_) {}
    state.savedArtworks.splice(idx, 1);
    state.coins = (state.coins || 0) + quote.price;
    state.coinsFromLoomSales = (state.coinsFromLoomSales || 0) + quote.price;
    state.loomsSold = (state.loomsSold || 0) + 1;
    closeSellLoomModal();
    save();
    renderGallery();
    try { renderStats(); } catch (_) {}
    try { SFX.purchase(); } catch (_) { try { SFX.save(); } catch (__) {} }
    notify('Sold for $' + quote.price.toLocaleString() + ' (' + quote.grade + ')', '#ffd700');
    try {
      if (typeof MsgLog !== 'undefined') {
        MsgLog.push('Sold a ' + quote.grade.toLowerCase() + ' loom for $' + quote.price.toLocaleString() + '. (' + quote.pixels + ' textiles, ' + quote.colors + ' colors, ' + quote.size + 'x' + quote.size + ')');
      }
    } catch (_) {}
  }

  // ===== Profile picture (v3.19.15) =====
  // The player picks any saved artwork and it becomes their avatar.
  // We deep-copy the pixel dict so selling or deleting the source
  // doesn't nuke the profile snapshot. `savedAt` mirrors art.date so
  // we can identify "is this gallery card the current profile?".
  function setProfilePicture(idx) {
    var art = (state.savedArtworks || [])[idx];
    if (!art) return;
    state.profilePicture = {
      pixels: JSON.parse(JSON.stringify(art.pixels || {})),
      size: art.size || 16,
      savedAt: art.date || Date.now(),
      setAt: Date.now()
    };
    save();
    renderGallery();
    try { SFX.save(); } catch (_) {}
    notify('Profile picture updated', 'var(--accent)');
  }
  function clearProfilePicture() {
    state.profilePicture = null;
    save();
    renderGallery();
    try { SFX.erase(); } catch (_) {}
    notify('Profile picture cleared', 'var(--text-dim)');
  }
  function isCurrentProfilePic(art) {
    if (!state.profilePicture || !art) return false;
    return state.profilePicture.savedAt === art.date;
  }

  // ===== Gallery =====
  function renderGallery() {
    var grid = document.getElementById('galleryGrid');
    grid.innerHTML = '';
    var artworks = state.savedArtworks || [];

    if (artworks.length === 0) {
      grid.innerHTML = '<div class="gallery-empty" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);"><p>No saved artworks yet</p><small>Create pixel art on the Canvas tab, then Save to Gallery.</small></div>';
      return;
    }

    artworks.forEach(function(art, idx) {
      var card = document.createElement('div');
      card.className = 'gallery-card';

      var cvs = document.createElement('canvas');
      var artSize = art.size || 16;
      cvs.width = artSize;
      cvs.height = artSize;
      cvs.style.cssText = 'width:100%;image-rendering:pixelated;border-radius:4px;background:var(--bg);';
      var cx = cvs.getContext('2d');
      Object.keys(art.pixels || {}).forEach(function(key) {
        var parts = key.split(',');
        cx.fillStyle = art.pixels[key];
        cx.fillRect(parseInt(parts[0], 10), parseInt(parts[1], 10), 1, 1);
      });
      var pxCount = (art.pixelCount || Object.keys(art.pixels || {}).length);
      var dt = art.date ? new Date(art.date) : new Date();
      cvs.setAttribute('title', 'Saved artwork &mdash; ' + artSize + 'x' + artSize + ', ' + pxCount + ' pixels, finished ' + dt.toLocaleString() + '.');
      card.setAttribute('title', 'Saved artwork. Use the buttons below to export it as a PNG or remove it from your gallery.');
      card.appendChild(cvs);

      var info = document.createElement('div');
      info.style.cssText = 'padding:8px 8px 2px;font-size:10px;color:var(--text-dim);';
      info.textContent = dt.toLocaleDateString() + ' | ' + artSize + 'x' + artSize + ' | ' + pxCount + 'px';
      info.setAttribute('title', 'Date saved, canvas size, and total pixel count.');
      card.appendChild(info);

      // v3.19.16: star rating row — deterministic quality gauge based
      // on pixels used, color variety, and canvas size. Previews the
      // kind of price the auction house is likely to roll.
      var starCount = getLoomStars(art);
      var starRow = document.createElement('div');
      starRow.style.cssText = 'padding:0 8px 6px;font-family:"Press Start 2P",monospace;font-size:11px;letter-spacing:2px;color:#ffd700;text-shadow:0 0 6px rgba(255,215,0,0.35);';
      starRow.textContent = formatStarRow(starCount);
      var uniqCols = countUniqueLoomColors(art);
      // Build an informative tooltip that explains what stars mean and
      // what specifically drove this piece's rating.
      var starTipParts = [starCount + ' out of 5 stars.'];
      starTipParts.push('WHAT STARS DO: Stars determine your sell price at the auction house. More stars = higher offer.');
      starTipParts.push('HOW STARS WORK: A simple formula \u2014 pixels placed (45%), colours used (30%), and canvas size (25%). Nothing else affects them.');
      if (starCount === 1) {
        starTipParts.push('1 star means the piece is small, uses few colours, or has very few pixels filled in. Try using more colours, filling more of the canvas, or working on a larger canvas to raise this.');
      } else if (starCount === 2) {
        starTipParts.push('2 stars \u2014 a modest piece. More pixels, more colours, or a bigger canvas would push this higher.');
      } else if (starCount === 3) {
        starTipParts.push('3 stars \u2014 a solid middle-ground piece. Good effort or variety but room to grow in one area.');
      } else if (starCount === 4) {
        starTipParts.push('4 stars \u2014 a strong piece. You\u2019re close to the maximum; a larger canvas or a few more colours could tip you to 5.');
      } else {
        starTipParts.push('5 stars \u2014 the highest rating. Large canvas, many pixels, strong colour variety.');
      }
      starTipParts.push('This piece: ' + pxCount + ' pixels, ' + uniqCols + ' colour' + (uniqCols === 1 ? '' : 's') + ', ' + artSize + '\u00d7' + artSize + ' canvas.');
      starTipParts.push('NOTE: The Practice tab has a SEPARATE 0\u2013100 rating system that uses a deeper formula (including your skill, proclivities, fatigue, and health) and drives how fast your operator\u2019s skill stat grows. Stars and practice ratings are independent.');
      starRow.setAttribute('title', starTipParts.join(' '));
      card.appendChild(starRow);

      // v3.19.15: profile picture indicator ribbon
      if (isCurrentProfilePic(art)) {
        var pfpBadge = document.createElement('div');
        pfpBadge.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:7px;color:#ffd700;text-align:center;padding:3px 6px;background:rgba(255,215,0,0.08);border-top:1px solid rgba(255,215,0,0.4);letter-spacing:1px;';
        pfpBadge.textContent = '\u2605 PROFILE PICTURE';
        pfpBadge.setAttribute('title', 'This loom is currently your profile picture.');
        card.appendChild(pfpBadge);
      }

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 8px;';

      var expBtn = document.createElement('button');
      expBtn.className = 'tool-btn';
      expBtn.textContent = 'EXPORT';
      expBtn.style.cssText = 'flex:1 1 45%;font-size:8px;padding:4px;';
      expBtn.setAttribute('title', 'Download this artwork as a PNG image (8x scaled so it is visible).');
      expBtn.addEventListener('click', function() { exportArtwork(idx); });

      // v3.19.15: sell button — opens RNG-quote modal
      var sellBtn = document.createElement('button');
      sellBtn.className = 'tool-btn';
      sellBtn.textContent = 'SELL $';
      sellBtn.style.cssText = 'flex:1 1 45%;font-size:8px;padding:4px;color:#ffd700;border-color:#ffd700;';
      sellBtn.setAttribute('title', 'Offer this loom for sale. The auction house rolls a price based on the textiles used, number of colors, and canvas size. Confirming the sale permanently removes the loom from your gallery.');
      sellBtn.addEventListener('click', function() { openSellLoomModal(idx); });

      // v3.19.15: set-as-profile button (toggles off if already set)
      var pfpBtn = document.createElement('button');
      pfpBtn.className = 'tool-btn';
      var isPfp = isCurrentProfilePic(art);
      pfpBtn.textContent = isPfp ? '\u2605 PROFILE' : 'PROFILE';
      pfpBtn.style.cssText = 'flex:1 1 45%;font-size:8px;padding:4px;color:' + (isPfp ? '#ffd700' : 'var(--accent3)') + ';border-color:' + (isPfp ? '#ffd700' : 'var(--accent3)') + ';';
      pfpBtn.setAttribute('title', isPfp ? 'This loom is your current profile picture. Click to clear it.' : 'Set this loom as your profile picture. It will show next to your name in the main tracker.');
      pfpBtn.addEventListener('click', function() {
        if (isCurrentProfilePic(art)) {
          clearProfilePicture();
        } else {
          setProfilePicture(idx);
        }
      });

      var delBtn = document.createElement('button');
      delBtn.className = 'tool-btn';
      delBtn.textContent = 'DELETE';
      delBtn.style.cssText = 'flex:1 1 45%;font-size:8px;padding:4px;color:var(--accent2);border-color:var(--accent2);';
      delBtn.setAttribute('title', 'Permanently remove this saved artwork from your gallery. Cannot be undone.');
      delBtn.addEventListener('click', function() {
        // If the deleted loom was the active profile pic, drop it too.
        try {
          if (state.profilePicture && state.profilePicture.savedAt && art.date && state.profilePicture.savedAt === art.date) {
            state.profilePicture = null;
          }
        } catch (_) {}
        state.savedArtworks.splice(idx, 1);
        save();
        renderGallery();
        renderStats();
        SFX.erase();
      });

      btns.appendChild(expBtn);
      btns.appendChild(sellBtn);
      btns.appendChild(pfpBtn);
      btns.appendChild(delBtn);
      card.appendChild(btns);
      grid.appendChild(card);
    });
  }

  function exportArtwork(idx) {
    var art = state.savedArtworks[idx];
    if (!art) return;
    var scale = 8;
    var artSize = art.size || 16;
    var cvs = document.createElement('canvas');
    cvs.width = artSize * scale;
    cvs.height = artSize * scale;
    var cx = cvs.getContext('2d');
    cx.fillStyle = '#08080f';
    cx.fillRect(0, 0, cvs.width, cvs.height);
    Object.keys(art.pixels || {}).forEach(function(key) {
      var parts = key.split(',');
      cx.fillStyle = art.pixels[key];
      cx.fillRect(parseInt(parts[0], 10) * scale, parseInt(parts[1], 10) * scale, scale, scale);
    });
    var link = document.createElement('a');
    link.download = 'pixelfocus-art-' + (idx + 1) + '.png';
    link.href = cvs.toDataURL();
    link.click();
    SFX.click();
    notify('Exported as PNG');
  }

  function exportCurrentCanvas() {
    var scale = 8;
    var size = state.canvasSize;
    var cvs = document.createElement('canvas');
    cvs.width = size * scale;
    cvs.height = size * scale;
    var cx = cvs.getContext('2d');
    cx.fillStyle = '#08080f';
    cx.fillRect(0, 0, cvs.width, cvs.height);
    Object.keys(state.pixelCanvas || {}).forEach(function(key) {
      var parts = key.split(',');
      cx.fillStyle = state.pixelCanvas[key];
      cx.fillRect(parseInt(parts[0], 10) * scale, parseInt(parts[1], 10) * scale, scale, scale);
    });
    var link = document.createElement('a');
    link.download = 'pixelfocus-canvas.png';
    link.href = cvs.toDataURL();
    link.click();
    SFX.click();
    notify('Canvas exported as PNG');
  }

  // ===== v3.20.0 Loom quality rating =====
  // Computes a 0..100 rating for the artwork being saved. The rating
  // can go UP or DOWN between looms — not every weave is the
  // operator's best. Factors:
  //   (1) Density: pixel count relative to canvas size
  //   (2) Colour variety: how many distinct hues are used
  //   (3) Operator skill: climbs glacially with practice (skill_slope)
  //   (4) Proclivity palette bias: small bonus if the loom matches
  //   (5) Tempo roll: streaky players get larger swings
  //   (6) Pure noise: +/- 12 points of drift every loom
  //   (7) Constitution / mental acuity: if either is low, cap slides
  //   (8) Fatigue: if it has been <2min since the last loom, rushed
  //   (9) Rust: if it has been >72h since the last loom, rusty
  // The result is strictly a cute stat and does not pay out coins.
  function computeLoomQuality(pixelCount, canvasSize, pixels) {
    var ls = state.loomStats || {};
    var proc = ls.proclivities || {};
    // Density: 0..1, then mapped to a 0..25 point contribution.
    var capacity = Math.max(1, canvasSize * canvasSize);
    var density = Math.min(1, pixelCount / capacity);
    var densityPts = Math.round(density * 25);
    // Colour variety: count distinct hex values, map to 0..20.
    var hues = {};
    for (var k in pixels) { if (pixels.hasOwnProperty(k)) hues[pixels[k]] = 1; }
    var hueCount = Object.keys(hues).length;
    var varietyPts = Math.min(20, hueCount * 3);
    // Skill: 0..25 contribution.
    var skillPts = Math.round((ls.skill || 10) * 0.25);
    // Palette bias: small bonus when the roll matches the loom.
    var WARM = ['#ff6b9d','#ffa502','#ff4757','#ffd700','#ff00ff','#f9ca24','#eb4d4b','#c0392b'];
    var COOL = ['#4ecdc4','#5352ed','#00ffff','#9b59b6','#e056fd','#6ab04c','#1abc9c'];
    var warmHits = 0, coolHits = 0, totalHit = 0;
    for (var h in hues) {
      totalHit++;
      if (WARM.indexOf(h) >= 0) warmHits++;
      if (COOL.indexOf(h) >= 0) coolHits++;
    }
    var biasPts = 0;
    if (totalHit > 0) {
      if (proc.palette_key === 'warm'          && warmHits / totalHit >= 0.5) biasPts += 4;
      if (proc.palette_key === 'cool'          && coolHits / totalHit >= 0.5) biasPts += 4;
      if (proc.palette_key === 'monochromatic' && totalHit <= 2)              biasPts += 5;
      if (proc.palette_key === 'riotous'       && totalHit >= 7)              biasPts += 5;
      if (proc.palette_key === 'subdued'       && totalHit <= 4)              biasPts += 3;
      if (proc.palette_key === 'opinionated'   && totalHit >= 5)              biasPts += 3;
    }
    // Tempo: streaky players get bigger swings.
    var noiseAmplitude = 12;
    if (proc.tempo_key === 'streaky')      noiseAmplitude = 22;
    if (proc.tempo_key === 'consistent')   noiseAmplitude = 5;
    if (proc.tempo_key === 'late_bloomer') noiseAmplitude = 10 + Math.min(10, ls.totalWoven * 0.3);
    if (proc.tempo_key === 'slow_starter' && ls.totalWoven < 8)  noiseAmplitude = 8;
    if (proc.tempo_key === 'fast_starter' && ls.totalWoven >= 8) noiseAmplitude = 8;
    var noise = (Math.random() * 2 - 1) * noiseAmplitude;
    // Fatigue / rust:
    var nowT = Date.now();
    var sinceLast = ls.lastWovenAt ? (nowT - ls.lastWovenAt) : 9e15;
    var fatiguePenalty = 0;
    if (sinceLast < 2 * 60 * 1000)      fatiguePenalty = -6;  // rushed
    else if (sinceLast < 6 * 60 * 1000) fatiguePenalty = -2;  // still recent
    var rustPenalty = 0;
    if (sinceLast > 72 * 60 * 60 * 1000) rustPenalty = -5;    // rusty
    // Health caps: constitution + mental acuity place a soft ceiling.
    var healthCap = Math.round((Math.max(10, ls.constitution || 50) + Math.max(10, ls.mentalAcuity || 50)) / 2);
    healthCap = Math.max(40, Math.min(100, healthCap + 20));
    var raw = densityPts + varietyPts + skillPts + biasPts + noise + fatiguePenalty + rustPenalty;
    raw = Math.max(1, Math.min(healthCap, Math.round(raw)));
    return raw;
  }

  // Climb the skill stat GLACIALLY after a save. Slope depends on
  // the operator's tempo proclivity. Adds a tiny random dip chance.
  function advanceLoomSkill(rating) {
    var ls = state.loomStats;
    if (!ls || !ls.proclivities) return;
    var slope = ls.proclivities.skill_slope || 1.0;
    // Base gain per loom: 0.15..0.45 skill points.
    var gain = (0.15 + Math.random() * 0.30) * slope;
    // Rating quality informs gain: bad loom, reduced gain (but never negative).
    if (rating < 40) gain *= 0.4;
    else if (rating < 55) gain *= 0.7;
    else if (rating > 85) gain *= 1.3;
    // Occasional tiny dip (7% chance) — practice doesn't always
    // monotonically improve. The dip is at most 0.1 points.
    if (Math.random() < 0.07) gain = -Math.random() * 0.1;
    ls.skill = Math.max(0, Math.min(100, (ls.skill || 0) + gain));
  }

  // ===== v3.20.0 Loom practice stats decay =====
  // Constitution + mental acuity drift DOWN glacially once the Computer
  // has begun "merging" with the operator — this is narratively tied to
  // the Improbability Annex being online (i.e. the player is deep in
  // the Ratiocinatory) or the aggregate aspect level crossing 400.
  // The decay is tiny and cumulative so it feels ominous rather than
  // punitive. Called on every render (~1Hz) and rate-limited by the
  // lastDecayTickAt timestamp to 1 tick per minute.
  function tickLoomStatDecay() {
    var ls = state.loomStats;
    if (!ls || !ls.proclivities) return;
    var nowT = Date.now();
    if (nowT - (ls.lastDecayTickAt || 0) < 60 * 1000) return; // at most once per minute
    ls.lastDecayTickAt = nowT;
    // Merge condition: Annex online OR aggregate aspect >= 400.
    var aspectTotal = (state.aspectExegesis||0) + (state.aspectChromatics||0)
                    + (state.aspectDeftness||0)  + (state.aspectOmens||0)
                    + (state.aspectIntrospection||0);
    var merging = !!state.improbabilityAnnexOnline || aspectTotal >= 400;
    if (!merging) return;
    // Decay rate: 0.004/min constitution, 0.006/min mental acuity.
    // Over 24h this is ~5.8 constitution and ~8.6 mental acuity — a
    // noticeable slide over days, invisible in any single session.
    // Each decay is suppressed if the operator has woven recently
    // (within 15 min) — the act of weaving keeps the Computer placid.
    var recentWeave = ls.lastWovenAt && (nowT - ls.lastWovenAt) < 15 * 60 * 1000;
    if (recentWeave) return;
    ls.constitution = Math.max(5, (ls.constitution || 50) - 0.004);
    ls.mentalAcuity = Math.max(5, (ls.mentalAcuity || 50) - 0.006);
  }

  // ===== v3.20.0 Render the operator file (Practice view) =====
  function renderLoomPracticeSheet() {
    var ls = state.loomStats;
    if (!ls) return;
    var proc = ls.proclivities || {};
    var filed = document.getElementById('practiceFileBody');
    var statsBody = document.getElementById('practiceStatsBody');
    var sparkBody = document.getElementById('practiceRatingsBody');
    var stateBody = document.getElementById('practiceStateOfBeingBody');
    var footer    = document.getElementById('practiceFooter');
    if (!filed || !statsBody || !sparkBody || !stateBody) return;

    // ----- Proclivities panel -----
    function fmtProcLabel(key) {
      return (key || 'unknown').replace(/_/g, ' ').toUpperCase();
    }
    filed.innerHTML =
      '<div class="proc-row" title="Your operator\u2019s colour personality. Assigned randomly the first time you wove a piece. This is flavour text \u2014 it describes the kinds of colours your operator gravitates toward but has no mechanical effect on gameplay.">' +
        '<span class="proc-label">Palette disposition \u2014 ' + fmtProcLabel(proc.palette_key) + '</span>' +
        '<span class="proc-value">' + (proc.palette_blurb || '\u2014') + '</span></div>' +
      '<div class="proc-row" title="Your operator\u2019s weaving speed personality. Like the palette, this was rolled once and never changes. It\u2019s a character trait, not a gameplay stat \u2014 it doesn\u2019t speed up or slow down anything.">' +
        '<span class="proc-label">Tempo \u2014 ' + fmtProcLabel(proc.tempo_key) + '</span>' +
        '<span class="proc-value">' + (proc.tempo_blurb || '\u2014') + '</span></div>' +
      '<div class="proc-row" title="A small personality quirk unique to your operator. Purely cosmetic \u2014 it doesn\u2019t cause any negative effects. Think of it as a flavour note on a personnel file.">' +
        '<span class="proc-label">Signature flaw \u2014 ' + fmtProcLabel(proc.flaw_key) + '</span>' +
        '<span class="proc-value">' + (proc.flaw_blurb || '\u2014') + '</span></div>' +
      '<div class="proc-row" title="A comment from the \u2018standing office\u2019 (the in-world bureaucracy that manages the factory). This is a randomly generated remark about your operator and has no gameplay effect.">' +
        '<span class="proc-label">Standing office note</span>' +
        '<span class="proc-value">' + (proc.file_note || '\u2014') + '</span></div>';

    // ----- At the bench panel -----
    var ratings = Array.isArray(ls.ratings) ? ls.ratings : [];
    var avg = 0;
    if (ratings.length) {
      var sum = 0;
      for (var i = 0; i < ratings.length; i++) sum += ratings[i];
      avg = sum / ratings.length;
    }
    var last = ratings.length ? ratings[ratings.length - 1] : null;
    var delta = '';
    if (ratings.length >= 2) {
      var d = ratings[ratings.length - 1] - ratings[ratings.length - 2];
      if      (d > 2)  delta = ' (up ' + Math.round(d) + ')';
      else if (d < -2) delta = ' (down ' + Math.abs(Math.round(d)) + ')';
      else             delta = ' (steady)';
    }
    function bar(pct, cls, tip) {
      pct = Math.max(0, Math.min(100, pct));
      var t = tip ? ' title="' + tip + '"' : '';
      return '<div class="stat-bar"' + t + '><div class="stat-bar-fill ' + (cls || '') + '" style="width:' + pct + '%;"></div></div>';
    }
    var skill = Math.round((ls.skill || 0) * 10) / 10;
    var cons  = Math.round((ls.constitution || 0) * 10) / 10;
    var acu   = Math.round((ls.mentalAcuity || 0) * 10) / 10;
    statsBody.innerHTML =
      '<div class="stat-row" title="Total number of pixel artworks you have saved to the gallery using the SAVE TO GALLERY button. Each save counts as one loom woven.">' +
        '<span class="stat-k">Looms woven (lifetime)</span><span class="stat-v">' + (ls.totalWoven || 0) + '</span></div>' +
      '<div class="stat-row" title="Your highest practice rating ever (out of 100). Not the 1\u20135 stars on gallery cards \u2014 those only affect sell price. This score reflects your best single artwork factoring in pixels, colours, canvas size, operator skill, proclivities, and whether you were rested (no fatigue or rust). To beat your best: use a large canvas, fill it thoroughly with many colours, weave regularly so rust doesn\u2019t set in, and let your skill stat climb naturally through consistent practice.">' +
        '<span class="stat-k">Best rating on file</span><span class="stat-v">' + (ls.bestRating || 0) + '</span></div>' +
      '<div class="stat-row" title="Your most recent practice rating (out of 100). NOT the 1\u20135 star rating on gallery cards \u2014 those only affect sell price. This practice rating controls how fast your operator skill grows. Scores above 85 give a skill bonus; scores below 40 give reduced skill gain. To score higher: fill more of the canvas, use more colours, work on larger canvases, weave regularly (long breaks cause rust, \u22122\u20135 days away), and don\u2019t rush (saving twice within 2 minutes causes fatigue). Your skill stat also feeds back in \u2014 the more you weave, the better your baseline gets over time. The bracket (up/down/steady) shows direction vs your previous save.">' +
        '<span class="stat-k">Last rating</span><span class="stat-v">' + (last === null ? '\u2014' : (last + delta)) + '</span></div>' +
      '<div class="stat-row" title="Your average practice rating (out of 100) across your last ' + ratings.length + ' saved artworks. Not the 1\u20135 stars. A rising average means your consistent weaving is paying off \u2014 your skill is climbing, your pieces are getting more ambitious, and you\u2019re avoiding rust and fatigue penalties. A falling average may mean long breaks between saves or rushing. This smooths out individual highs and lows so you can see the overall trend.">' +
        '<span class="stat-k">Rolling average (last ' + ratings.length + ')</span><span class="stat-v">' + (ratings.length ? avg.toFixed(1) : '\u2014') + '</span></div>' +
      '<div class="stat-row" title="A practice stat that rises slowly each time you save an artwork. Higher skill means your operator is more experienced at the loom. This is a cosmetic stat \u2014 it does not affect textile earnings or gameplay.">' +
        '<span class="stat-k">Operator skill</span><span class="stat-v">' + skill.toFixed(1) + ' / 100</span></div>' +
      bar(skill, '', 'Green bar = operator skill out of 100. Grows with each artwork you save.') +
      '<div class="stat-row" title="Your operator\u2019s physical resilience. Starts at 100 and stays high as long as you weave regularly. In the late game, if a \u2018merging\u2019 event is active, constitution drifts slowly downward. Weaving more frequently slows the decline. This is a cosmetic stat.">' +
        '<span class="stat-k">Constitution</span><span class="stat-v">' + cons.toFixed(1) + '</span></div>' +
      bar(cons, 'cons', 'Yellow-to-red bar = constitution. Starts full and stays healthy with regular weaving. Can drift down during late-game events.') +
      '<div class="stat-row" title="Your operator\u2019s mental sharpness. Like constitution, it starts high and stays healthy with regular weaving, but can drift down during late-game \u2018merging\u2019 events. This is a cosmetic stat \u2014 it won\u2019t lock you out of anything.">' +
        '<span class="stat-k">Mental acuity</span><span class="stat-v">' + acu.toFixed(1) + '</span></div>' +
      bar(acu, 'acu', 'Purple bar = mental acuity. Behaves like constitution \u2014 stays high with regular use, can drift during late-game merging.');

    // ----- Sparkline panel -----
    if (ratings.length === 0) {
      sparkBody.innerHTML = '<div class="spark-empty" title="This chart tracks your practice rating (0\u2013100) for each artwork you save, up to 50 entries. This is NOT the 1\u20135 star rating on gallery cards. Stars are simpler and only affect sell price. The practice rating is a deeper score that drives how fast your operator\u2019s skill grows. Go to the Canvas tab, paint something, and click SAVE TO GALLERY to get your first data point.">No looms on file. The first entry will be assessed, in pencil, by a clerk whose name you will not learn.</div>';
    } else {
      var W = 900, H = 90, pad = 6;
      var n = ratings.length;
      // v3.20.32: adaptive y-axis. Early on, practice ratings are low (say,
      // 10-25) and the full 0-100 scale makes the line look flat at the
      // bottom. Detect that and zoom in on the actual data range so small
      // changes are visible. Switch back to the full 0-100 scale once the
      // player is producing higher-rated work.
      var dataMin = ratings[0], dataMax = ratings[0];
      for (var k = 1; k < n; k++) {
        if (ratings[k] < dataMin) dataMin = ratings[k];
        if (ratings[k] > dataMax) dataMax = ratings[k];
      }
      var minR, maxR, zoomed, refAt, refLabel;
      // Zoom when the player's peak is still low OR they have a short
      // history (first 10 saves). The zoom always keeps 0 visible as the
      // floor so they can see distance from the bottom.
      if (dataMax <= 45 || n < 10) {
        minR = 0;
        // Pad the top a bit so the highest point isn't flush with the edge.
        maxR = Math.max(10, Math.min(100, Math.ceil((dataMax + 8) / 5) * 5));
        zoomed = true;
        // Reference line at half the zoomed range, so the dashed marker
        // stays meaningful as a midpoint.
        refAt = Math.round(maxR / 2);
        refLabel = 'midpoint of visible range';
      } else {
        minR = 0;
        maxR = 100;
        zoomed = false;
        refAt = 50;
        refLabel = '50 / 100';
      }
      var step = n > 1 ? (W - pad * 2) / (n - 1) : 0;
      var pts = '';
      for (var j = 0; j < n; j++) {
        var x = pad + j * step;
        var y = H - pad - ((ratings[j] - minR) / (maxR - minR)) * (H - pad * 2);
        pts += (j === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
      }
      var midY = H - pad - (refAt / (maxR - minR)) * (H - pad * 2);
      var scaleBadge = zoomed
        ? '<div class="spark-scale" style="font-family:\'Press Start 2P\',monospace;font-size:7px;color:#6ff0a1;letter-spacing:1px;opacity:0.7;margin-bottom:4px;" title="The y-axis is auto-zoomed to 0\u2013' + maxR + ' so small changes in your early practice ratings are visible. Once your best rating climbs past 45, the chart switches to the full 0\u2013100 scale.">SCALE &middot; 0&ndash;' + maxR + ' (AUTO-ZOOMED)</div>'
        : '<div class="spark-scale" style="font-family:\'Press Start 2P\',monospace;font-size:7px;color:#6ff0a1;letter-spacing:1px;opacity:0.5;margin-bottom:4px;" title="The y-axis covers the full practice rating range, 0\u2013100.">SCALE &middot; 0&ndash;100</div>';
      sparkBody.innerHTML =
        '<div class="spark-wrap" title="PRACTICE RATING chart, NOT the 1\u20135 stars. The game has two rating systems: STARS (1\u20135) appear on gallery cards and set your auction sell price \u2014 simple formula based on pixels, colours, canvas size. PRACTICE RATING is this line \u2014 a deeper score that also uses your operator\u2019s skill, proclivities, fatigue, rust, and health. Higher practice ratings make your skill grow faster, which feeds back into better future ratings. Green line = your score per artwork (newest on right). Dashed line = ' + refLabel + '. Early on the y-axis auto-zooms so small changes are visible; once you\u2019re consistently scoring above 45, it switches to the full 0\u2013100 scale.">' +
          scaleBadge +
          '<svg class="spark-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
            '<line x1="' + pad + '" y1="' + midY.toFixed(1) + '" x2="' + (W - pad) + '" y2="' + midY.toFixed(1) + '" stroke="#2a3d2f" stroke-width="1" stroke-dasharray="4,4"/>' +
            '<path d="' + pts + '" fill="none" stroke="#00ff88" stroke-width="2"/>' +
          '</svg>' +
        '</div>';
    }

    // ----- State of being panel -----
    var lines = [];
    var nowT = Date.now();
    var sinceLoom = ls.lastWovenAt ? (nowT - ls.lastWovenAt) : null;
    // Each state-of-being line gets a tooltip explaining what it means
    // in plain terms, so new players aren't left guessing.
    var TIP_NO_LOOM    = 'You haven\u2019t saved any pixel artwork yet. Go to the Canvas tab, paint something, then click SAVE TO GALLERY. This line will update once you do.';
    var TIP_RECENT     = 'You wove something recently. The factory AI is happy with your attendance \u2014 nothing to worry about here.';
    var TIP_FEW_HOURS  = 'It\u2019s been a few hours since you last saved an artwork. The AI is noting your absence but there\u2019s no penalty \u2014 this is just flavour text.';
    var TIP_MANY_HOURS = 'You\u2019ve been away from the loom for a while. The yellow text is the AI being dramatic \u2014 there\u2019s no actual penalty, but it gets more ominous the longer you\u2019re away.';
    var TIP_DAYS       = 'You\u2019ve been away for days. The red text is the AI at its most theatrical. Still no gameplay penalty \u2014 just the factory\u2019s way of missing you.';
    var TIP_EXTENDED   = 'A very long absence. The AI has given up waiting politely. Again, purely cosmetic \u2014 your progress is safe.';
    var TIP_MERGING    = 'A late-game event is active: the \u2018merging\u2019 means the factory AI is undergoing changes. During this period, your constitution and mental acuity stats drift slowly downward. This is cosmetic and doesn\u2019t lock you out of anything.';
    var TIP_LOW_CONS   = 'Your constitution stat has dropped quite low. This happens during extended late-game merging events. It\u2019s a cosmetic indicator \u2014 weaving more frequently can help slow the decline.';
    var TIP_LOW_ACU    = 'Your mental acuity stat has dropped quite low. Like constitution, this is a cosmetic stat affected by late-game merging. Keep weaving to slow the drift.';

    if (sinceLoom === null) {
      lines.push('<div class="state-line" title="' + TIP_NO_LOOM + '">No loom has yet been woven. The bench is waiting. The clerk is, unhelpfully, also waiting.</div>');
    } else {
      var hrs = sinceLoom / 3600000;
      if (hrs < 1) {
        lines.push('<div class="state-line" title="' + TIP_RECENT + '">Recently at the bench. The Computer is, for the moment, content.</div>');
      } else if (hrs < 6) {
        lines.push('<div class="state-line" title="' + TIP_FEW_HOURS + '">Not at the bench in the last ' + Math.round(hrs) + ' hours. The Computer has begun, quietly, to wonder.</div>');
      } else if (hrs < 24) {
        lines.push('<div class="state-line warning" title="' + TIP_MANY_HOURS + '">Away from the bench for ' + Math.round(hrs) + ' hours. The Computer is composing a memo it does not intend to send.</div>');
      } else if (hrs < 72) {
        lines.push('<div class="state-line warning" title="' + TIP_DAYS + '">Away ' + Math.round(hrs / 24 * 10) / 10 + ' days. The Computer has begun referring to your bench in the past tense.</div>');
      } else {
        lines.push('<div class="state-line bad" title="' + TIP_EXTENDED + '">Extended absence (' + Math.round(hrs / 24) + ' days). The memo has been sent. It has already been replied to, by the Computer, on your behalf.</div>');
      }
    }
    var aspectTotal = (state.aspectExegesis||0) + (state.aspectChromatics||0)
                    + (state.aspectDeftness||0)  + (state.aspectOmens||0)
                    + (state.aspectIntrospection||0);
    var merging = !!state.improbabilityAnnexOnline || aspectTotal >= 400;
    if (merging) {
      lines.push('<div class="state-line bad" title="' + TIP_MERGING + '">The Computer is, at present, merging. Your constitution and mental acuity are drifting downward. The standing office has requested a statement and then rescinded the request.</div>');
    }
    if ((ls.constitution || 100) < 30) {
      lines.push('<div class="state-line bad" title="' + TIP_LOW_CONS + '">Constitution has dropped below comfortable limits. It is recommended the operator drink water, stand, and quietly reconsider.</div>');
    }
    if ((ls.mentalAcuity || 100) < 30) {
      lines.push('<div class="state-line bad" title="' + TIP_LOW_ACU + '">Mental acuity has dropped below the standing office\u2019s minimum. The standing office does not define minimum.</div>');
    }
    stateBody.innerHTML = lines.join('');

    if (footer) {
      var dateStr = ls.rolledAt ? new Date(ls.rolledAt).toLocaleDateString() : 'undisclosed';
      footer.textContent = 'File opened ' + dateStr + '. Quietly maintained. The operator is not required to sign this document, and is advised not to.';
      footer.title = 'The date shown is when your proclivities were first rolled (the first time you saved an artwork). This footer is flavour text \u2014 no action needed.';
    }
  }

  // Expose to the module closure so saveToGallery's optional post-hook
  // can find it via typeof.
  // (Declared inside the IIFE, so this is a no-op for external scope.)

  function saveToGallery() {
    var pixelCount = Object.keys(state.pixelCanvas || {}).length;
    if (pixelCount === 0) { SFX.error(); notify('Canvas is empty'); return; }
    if (!state.savedArtworks) state.savedArtworks = [];
    // v3.20.0: compute quality BEFORE saving so it travels with the art.
    var rating = computeLoomQuality(pixelCount, state.canvasSize, state.pixelCanvas);
    state.savedArtworks.push({
      pixels: JSON.parse(JSON.stringify(state.pixelCanvas)),
      size: state.canvasSize,
      date: Date.now(),
      pixelCount: pixelCount,
      rating: rating
    });
    // Update loomStats
    if (state.loomStats) {
      var ls = state.loomStats;
      ls.totalWoven = (ls.totalWoven || 0) + 1;
      if (!Array.isArray(ls.ratings)) ls.ratings = [];
      ls.ratings.push(rating);
      if (ls.ratings.length > 50) ls.ratings = ls.ratings.slice(-50);
      if (rating > (ls.bestRating || 0)) ls.bestRating = rating;
      ls.lastWovenAt = Date.now();
      ls.absentScold = 0; // the Machine is placated for now
      advanceLoomSkill(rating);
    }
    SFX.save();
    // Flavour the notify based on the rating band so the player can
    // feel whether this was a good one or a bad one.
    var band = 'filed';
    if      (rating >= 90) band = 'exemplary';
    else if (rating >= 75) band = 'well-composed';
    else if (rating >= 60) band = 'competent';
    else if (rating >= 45) band = 'serviceable';
    else if (rating >= 30) band = 'unremarkable';
    else                    band = 'best not discussed';
    notify('Saved to gallery (' + pixelCount + ' pixels) \u2014 ' + band + ' [' + rating + ']');
    save();
    renderStats();
    renderGallery();
    if (typeof renderLoomPracticeSheet === 'function') {
      try { renderLoomPracticeSheet(); } catch (e) {}
    }
  }

  // ===== Cross-window nav (uses background.js dedup helper) =====
  function openWindow(path) {
    try {
      chrome.runtime.sendMessage({ type: 'pf-open', path: path });
    } catch (e) {}
  }
  var backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.addEventListener('click', function() {
    SFX.click();
    openWindow('popup.html');
  });

  // v3.20.0 Stage 5 — walk-home nav. Purely a read of state; opening
  // the house window cannot alter the save.
  var houseNavBtn = document.getElementById('houseNavBtn');
  if (houseNavBtn) houseNavBtn.addEventListener('click', function () {
    SFX.click();
    openWindow('house.html');
  });

  var factoryNavBtn = document.getElementById('factoryNavBtn');
  if (factoryNavBtn) factoryNavBtn.addEventListener('click', function() {
    SFX.click();
    openWindow('factory.html');
  });

  // ===== View tabs (CANVAS / GALLERY / PRACTICE) =====
  var viewTabs = document.querySelectorAll('.view-tab');
  var canvasView = document.getElementById('canvasView');
  var galleryView = document.getElementById('galleryView');
  var practiceView = document.getElementById('practiceView');
  viewTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      viewTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var v = tab.getAttribute('data-view');
      if (v === 'canvas') {
        canvasView.classList.remove('hidden');
        galleryView.classList.add('hidden');
        if (practiceView) practiceView.classList.add('hidden');
      } else if (v === 'practice') {
        canvasView.classList.add('hidden');
        galleryView.classList.add('hidden');
        if (practiceView) {
          practiceView.classList.remove('hidden');
          renderLoomPracticeSheet();
        }
      } else {
        canvasView.classList.add('hidden');
        if (practiceView) practiceView.classList.add('hidden');
        galleryView.classList.remove('hidden');
        renderGallery();
      }
      SFX.click();
    });
  });

  // v3.20.0: periodic loom stat decay tick (glacial drift once merging).
  // Also re-renders the practice sheet if it's currently visible so the
  // operator can watch the numbers slide without clicking anything.
  setInterval(function() {
    try {
      tickLoomStatDecay();
      if (practiceView && !practiceView.classList.contains('hidden')) {
        renderLoomPracticeSheet();
      }
    } catch (_) {}
  }, 60 * 1000);

  // ===== Tool buttons (PAINT / ERASE) =====
  document.querySelectorAll('.tool-btn[data-tool]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      activeTool = btn.getAttribute('data-tool');
      document.querySelectorAll('.tool-btn[data-tool]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      SFX.click();
    });
  });

  // ===== Clear canvas (refunds every textile) =====
  var clearBtn = document.getElementById('clearCanvas');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      var n = Object.keys(state.pixelCanvas || {}).length;
      if (n === 0) { SFX.error(); return; }
      state.blocks = (state.blocks || 0) + n;
      state.pixelCanvas = {};
      SFX.erase();
      notify('Canvas cleared. Refunded ' + n + ' textile' + (n === 1 ? '' : 's') + '.');
      save();
      renderCanvas();
      renderStats();
    });
  }

  // ===== Save / Export buttons =====
  var saveBtn = document.getElementById('saveToGallery');
  if (saveBtn) saveBtn.addEventListener('click', saveToGallery);

  // v3.19.15: wire up the sell-loom modal confirm / cancel / backdrop.
  var sellCancelBtn = document.getElementById('sellLoomCancelBtn');
  if (sellCancelBtn) sellCancelBtn.addEventListener('click', closeSellLoomModal);
  var sellConfirmBtn = document.getElementById('sellLoomConfirmBtn');
  if (sellConfirmBtn) sellConfirmBtn.addEventListener('click', confirmSellLoom);
  var sellLoomModalEl = document.getElementById('sellLoomModal');
  if (sellLoomModalEl) {
    sellLoomModalEl.addEventListener('click', function(e) {
      // Click on the backdrop (not the inner card) closes the modal.
      if (e.target === sellLoomModalEl) closeSellLoomModal();
    });
  }
  var exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportCurrentCanvas);

  // ===== Live sync from other windows =====
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local' || !changes.pixelFocusState) return;
    var newState = changes.pixelFocusState.newValue;
    if (!newState) return;
    state = newState;
    if (!state.pixelCanvas) state.pixelCanvas = {};
    if (!state.unlockedColors || state.unlockedColors.length === 0) state.unlockedColors = ['#00ff88'];
    if (!state.savedArtworks) state.savedArtworks = [];
    if (!state.canvasSize || state.canvasSize < 8) state.canvasSize = 8;
    renderPalette();
    renderCanvas();
    renderStats();
    renderGallery();
    // Re-check stage unlocks when state changes from another window
    // (e.g. player earns textiles in tracker, unlocks a gallery entry).
    try { checkGalleryStageUnlocks(); } catch (_) {}
  });

  // ===== Master Loom 24-hour reset countdown =====
  // Moved out of the factory in v3.17.1 — the loom lives in this
  // window, so the timer that governs its daily rollover belongs
  // here. The actual rollover is handled by app.js's
  // checkDayRollover() whenever either window writes state; this
  // widget just reads wall-clock time and ticks once a second. It
  // reads state.todayBlocks for the "textiles on the loom today"
  // subcaption; the storage.onChanged listener above keeps that
  // value fresh when the factory writes an update.
  function renderMasterLoomCountdown() {
    var cd = document.getElementById('masterLoomCountdown');
    var fill = document.getElementById('masterLoomBarFill');
    var sub = document.getElementById('masterLoomSub');
    if (!cd || !fill) return;
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    var msLeft = next - now;
    if (msLeft < 0) msLeft = 0;
    var totalSec = Math.floor(msLeft / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    cd.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
    var dayMs = 24 * 60 * 60 * 1000;
    var elapsed = dayMs - msLeft;
    var pct = Math.max(0, Math.min(1, elapsed / dayMs));
    fill.style.width = (pct * 100).toFixed(2) + '%';
    if (sub) {
      var blocks = (state && state.todayBlocks) || 0;
      sub.textContent = 'Day ' + Math.floor(pct * 100) + '% complete \u00b7 ' +
                        blocks + ' textile' + (blocks === 1 ? '' : 's') +
                        ' on the loom today';
    }
    // Prime color shift for the final hour — the warp is about to reset.
    if (h < 1) {
      cd.style.color = '#ffd27f';
      cd.style.textShadow = '0 0 10px rgba(255,210,127,0.55)';
    } else {
      cd.style.color = '';
      cd.style.textShadow = '';
    }
  }

  // ===== GALLERY OPERATIONAL LOG ARCHIVE (v3.19.1) =====
  // The LOG button now opens an archive of "Observation" entries from the
  // loom's voice that unlock as the player produces textiles, buys colors,
  // and climbs level tiers. stage-entries.js owns the data table, the
  // unlock evaluator, and the DOM renderer; this module handles the
  // per-window wiring: open-at-right-entry, prev/next nav, dismissal
  // (first-run vs replay), and periodic unlock checks.
  //
  // The first-run entry (gallery-s0) preserves the original "When the
  // craftsman is away, we are not idle" text verbatim.

  // Ephemeral — which entry the modal is currently showing. Not persisted.
  var currentGalleryStageEntryId = null;

  // Run the unlock evaluator for the gallery window and push MsgLog lines
  // for any newly-unlocked entries. Idempotent.
  function checkGalleryStageUnlocks() {
    try {
      if (typeof StageEntries === 'undefined') return;
      // Backfill archive arrays for older saves.
      if (!Array.isArray(state.stageEntriesUnlocked)) state.stageEntriesUnlocked = [];
      if (!Array.isArray(state.stageEntriesSeen)) state.stageEntriesSeen = [];
      // If the player has already dismissed the original gallery intro,
      // pre-seed gallery-s0 as unlocked+seen so we don't badge them on
      // the v3.19.1 upgrade.
      if (state.hasSeenGalleryIntro && state.stageEntriesUnlocked.indexOf('gallery-s0') === -1) {
        state.stageEntriesUnlocked.push('gallery-s0');
      }
      if (state.hasSeenGalleryIntro && state.stageEntriesSeen.indexOf('gallery-s0') === -1) {
        state.stageEntriesSeen.push('gallery-s0');
      }
      var newly = StageEntries.checkStageUnlocks(state, 'gallery');
      if (newly && newly.length > 0) {
        for (var i = 0; i < newly.length; i++) {
          var e = newly[i].entry;
          try {
            if (typeof MsgLog !== 'undefined') {
              MsgLog.push('A new entry has been appended to the operational log: \u201c' + (e.label || e.heading || e.id) + '.\u201d Click LOG to read it.');
            }
          } catch (_) {}
        }
        save();
      }
      refreshLogBadge();
    } catch (_) {}
  }

  // Refresh the little gold badge on the LOG header button. Called after
  // any unlock check and any storage-sync update.
  function refreshLogBadge() {
    try {
      var badge = document.getElementById('galleryIntroBadge');
      if (!badge) return;
      if (typeof StageEntries === 'undefined') { badge.style.display = 'none'; return; }
      var unseen = StageEntries.getUnseenCount(state, 'gallery');
      if (unseen > 0) {
        badge.textContent = String(unseen);
        badge.style.display = 'inline-block';
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
      }
    } catch (_) {}
  }

  // Open the archive modal to a specific entry id (or the default: first
  // unseen, or most recent if the player is caught up).
  function showGalleryIntroModal(entryId) {
    var modal = document.getElementById('galleryIntroModal');
    if (!modal) return;
    if (typeof StageEntries === 'undefined') return;

    // Safety net — gallery-s0 is always accessible.
    if (!Array.isArray(state.stageEntriesUnlocked)) state.stageEntriesUnlocked = [];
    if (state.stageEntriesUnlocked.indexOf('gallery-s0') === -1) {
      state.stageEntriesUnlocked.unshift('gallery-s0');
    }

    var targetEntry = null;
    if (entryId) {
      var info = StageEntries.getEntryById(entryId);
      if (info) targetEntry = info.entry;
    }
    if (!targetEntry) {
      targetEntry = StageEntries.getDefaultEntryToShow(state, 'gallery');
    }
    if (!targetEntry) return;

    currentGalleryStageEntryId = targetEntry.id;
    StageEntries.renderEntryInto(modal, 'gallery', targetEntry.id, state);

    // Wire dismiss button (clone-node to wipe stale listeners).
    var beginBtn = document.getElementById('galleryIntroBeginBtn');
    if (beginBtn) {
      var freshBtn = beginBtn.cloneNode(true);
      beginBtn.parentNode.replaceChild(freshBtn, beginBtn);
      freshBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        var wasFirstRun = !state.hasSeenGalleryIntro;
        if (wasFirstRun) {
          state.hasSeenGalleryIntro = true;
          try {
            if (typeof MsgLog !== 'undefined') {
              MsgLog.push('The loom notes the craftsman at the Master Loom. The study continues regardless.');
              MsgLog.push('Standing observation: the enterprise is not idle in the craftsman\u2019s absence. It is rarely idle at all.');
            }
          } catch (_) {}
        }
        save();
        refreshLogBadge();
      });
    }

    // Wire prev/next nav.
    var prevBtn = document.getElementById('stage-prev');
    if (prevBtn) {
      var freshPrev = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(freshPrev, prevBtn);
      freshPrev.addEventListener('click', function() {
        if (freshPrev.disabled) return;
        var neighborId = StageEntries.getNeighborEntryId(state, 'gallery', currentGalleryStageEntryId, -1);
        if (!neighborId) return;
        SFX.click();
        showGalleryIntroModal(neighborId);
      });
    }
    var nextBtn = document.getElementById('stage-next');
    if (nextBtn) {
      var freshNext = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(freshNext, nextBtn);
      freshNext.addEventListener('click', function() {
        if (freshNext.disabled) return;
        var neighborId = StageEntries.getNeighborEntryId(state, 'gallery', currentGalleryStageEntryId, 1);
        if (!neighborId) return;
        SFX.click();
        showGalleryIntroModal(neighborId);
      });
    }

    save();
    refreshLogBadge();

    if (modal.style.display !== 'flex') {
      modal.style.display = 'flex';
    }
  }

  var galleryIntroBtn = document.getElementById('galleryIntroBtn');
  if (galleryIntroBtn) {
    galleryIntroBtn.addEventListener('click', function() {
      SFX.click();
      try { showGalleryIntroModal(); } catch (e) {}
    });
  }

  // ===== Init =====
  try {
    if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.mount) {
      MsgLog.mount('msgConsole');
    }
  } catch (_) {}
  load(function() {
    renderPalette();
    renderCanvas();
    renderStats();
    renderGallery();
    renderMasterLoomCountdown();
    try { checkGalleryStageUnlocks(); } catch (_) {}
    setInterval(renderMasterLoomCountdown, 1000);
    try {
      if (typeof MsgLog !== 'undefined') {
        MsgLog.push('Master Loom online. ' + (state.canvasSize || 8) + 'x' + (state.canvasSize || 8) + ' frame loaded.');
      }
    } catch (_) {}
    try {
      if (!state.hasSeenGalleryIntro) {
        setTimeout(function() {
          try { showGalleryIntroModal(); } catch (e) {}
        }, 400);
      }
    } catch (_) {}
  });

})();
