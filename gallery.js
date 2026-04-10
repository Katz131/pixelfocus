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
  // Pink is the deliberate TEACHING PURCHASE (v3.18.9): 200 textiles, zero
  // money. It's the very first thing a new player can buy after the free
  // Green starter, priced so that a single day of focused work is enough to
  // experience the "spend textiles → unlock a color → see it on the canvas"
  // loop. White follows as the second gentle tier (still cheap, but adds the
  // money-cost mechanic). After Teal the curve ramps into multi-trillion-
  // textile trophies.
  var COLOR_SHOP = [
    { color: '#00ff88', cost: 0,                coinCost: 0,              name: 'Green' },     // starter, free
    { color: '#ff6b9d', cost: 200,              coinCost: 0,              name: 'Pink' },      // teaching purchase — textiles only
    { color: '#ffffff', cost: 400,              coinCost: 30,             name: 'White' },
    { color: '#4ecdc4', cost: 8000,             coinCost: 400,            name: 'Teal' },
    { color: '#ffa502', cost: 32000,            coinCost: 1600,           name: 'Orange' },
    { color: '#ff4757', cost: 128000,           coinCost: 6400,           name: 'Red' },
    { color: '#5352ed', cost: 512000,           coinCost: 25600,          name: 'Blue' },
    { color: '#ffd700', cost: 2000000,          coinCost: 100000,         name: 'Gold' },
    { color: '#ff00ff', cost: 8000000,          coinCost: 400000,         name: 'Magenta' },
    { color: '#00ffff', cost: 32000000,         coinCost: 1600000,        name: 'Cyan' },
    { color: '#9b59b6', cost: 128000000,        coinCost: 6400000,        name: 'Purple' },
    { color: '#e056fd', cost: 500000000,        coinCost: 25000000,       name: 'Lavender' },
    { color: '#f9ca24', cost: 2000000000,       coinCost: 100000000,      name: 'Yellow' },
    { color: '#6ab04c', cost: 8000000000,       coinCost: 400000000,      name: 'Forest' },
    { color: '#eb4d4b', cost: 32000000000,      coinCost: 1600000000,     name: 'Crimson' },
    { color: '#c0392b', cost: 128000000000,     coinCost: 6400000000,     name: 'Dark Red' },
    { color: '#1abc9c', cost: 500000000000,     coinCost: 25000000000,    name: 'Emerald' },
    { color: '#3498db', cost: 2000000000000,    coinCost: 100000000000,   name: 'Sky Blue' },
    { color: '#2c3e50', cost: 8000000000000,    coinCost: 400000000000,   name: 'Midnight' },
    { color: '#f39c12', cost: 32000000000000,   coinCost: 1600000000000,  name: 'Amber' },
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

  // ===== Debug bar =====
  function updateDebug(raw) {
    if (!debugBar) {
      debugBar = document.createElement('div');
      debugBar.id = 'debugInfo';
      debugBar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#111;color:#0f0;font-size:11px;padding:6px 10px;z-index:9999;font-family:monospace;border-top:2px solid #0f0;white-space:nowrap;overflow-x:auto;';
      document.body.appendChild(debugBar);
    }
    var s = raw || {};
    debugBar.textContent =
      'DEBUG - blocks=' + (s.blocks != null ? s.blocks : 'N/A') +
      ' | todayBlocks=' + (s.todayBlocks != null ? s.todayBlocks : 'N/A') +
      ' | totalLifetime=' + (s.totalLifetimeBlocks != null ? s.totalLifetimeBlocks : 'N/A') +
      ' | timerState=' + (s.timerState || 'N/A') +
      ' | canvasSize=' + (s.canvasSize || 'N/A') +
      ' | pixelsPlaced=' + (s.pixelCanvas ? Object.keys(s.pixelCanvas).length : 0) +
      ' | colors=' + ((s.unlockedColors || []).length);
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
      updateDebug(raw);
      cb();
    });
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
      info.style.cssText = 'padding:8px;font-size:10px;color:var(--text-dim);';
      info.textContent = dt.toLocaleDateString() + ' | ' + artSize + 'x' + artSize + ' | ' + pxCount + 'px';
      info.setAttribute('title', 'Date saved, canvas size, and total pixel count.');
      card.appendChild(info);

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:4px;padding:0 8px 8px;';

      var expBtn = document.createElement('button');
      expBtn.className = 'tool-btn';
      expBtn.textContent = 'EXPORT';
      expBtn.style.cssText = 'flex:1;font-size:8px;padding:4px;';
      expBtn.setAttribute('title', 'Download this artwork as a PNG image (8x scaled so it is visible).');
      expBtn.addEventListener('click', function() { exportArtwork(idx); });

      var delBtn = document.createElement('button');
      delBtn.className = 'tool-btn';
      delBtn.textContent = 'DELETE';
      delBtn.style.cssText = 'flex:1;font-size:8px;padding:4px;color:var(--accent2);border-color:var(--accent2);';
      delBtn.setAttribute('title', 'Permanently remove this saved artwork from your gallery. Cannot be undone.');
      delBtn.addEventListener('click', function() {
        state.savedArtworks.splice(idx, 1);
        save();
        renderGallery();
        renderStats();
        SFX.erase();
      });

      btns.appendChild(expBtn);
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

  function saveToGallery() {
    var pixelCount = Object.keys(state.pixelCanvas || {}).length;
    if (pixelCount === 0) { SFX.error(); notify('Canvas is empty'); return; }
    if (!state.savedArtworks) state.savedArtworks = [];
    state.savedArtworks.push({
      pixels: JSON.parse(JSON.stringify(state.pixelCanvas)),
      size: state.canvasSize,
      date: Date.now(),
      pixelCount: pixelCount
    });
    SFX.save();
    notify('Saved to gallery (' + pixelCount + ' pixels)');
    save();
    renderStats();
    renderGallery();
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

  var factoryNavBtn = document.getElementById('factoryNavBtn');
  if (factoryNavBtn) factoryNavBtn.addEventListener('click', function() {
    SFX.click();
    openWindow('factory.html');
  });

  // ===== View tabs (CANVAS / GALLERY) =====
  var viewTabs = document.querySelectorAll('.view-tab');
  var canvasView = document.getElementById('canvasView');
  var galleryView = document.getElementById('galleryView');
  viewTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      viewTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var v = tab.getAttribute('data-view');
      if (v === 'canvas') {
        canvasView.classList.remove('hidden');
        galleryView.classList.add('hidden');
      } else {
        canvasView.classList.add('hidden');
        galleryView.classList.remove('hidden');
        renderGallery();
      }
      SFX.click();
    });
  });

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
    // Init-time catch-up: if the player already cleared later
    // thresholds in other windows before this window opened,
    // unlock any retroactive stage entries now so the LOG badge
    // reflects reality on first render.
    try { checkGalleryStageUnlocks(); } catch (_) {}
    // Countdown ticks every second so the hours:minutes:seconds
    // display is always current. Kept separate from the
    // storage-change driven renderers so it doesn't stutter.
    setInterval(renderMasterLoomCountdown, 1000);
    try {
      if (typeof MsgLog !== 'undefined') {
        MsgLog.push('Master Loom online. ' + (state.canvasSize || 8) + 'x' + (state.canvasSize || 8) + ' frame loaded.');
      }
    } catch (_) {}
    // First-run Master Loom intro. Fires once per player; dismissal
    // flips state.hasSeenGalleryIntro so it never auto-re-triggers.
    // Delayed briefly so the rest of the UI has time to render
    // underneath the modal.
    try {
      if (!state.hasSeenGalleryIntro) {
        setTimeout(function() {
          try { showGalleryIntroModal(); } catch (e) {}
        }, 400);
      }
    } catch (_) {}
  });

})();
