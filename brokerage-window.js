(function() {
  'use strict';
  // Debug: prove JavaScript is executing at all
  try {
    document.body.insertAdjacentHTML('afterbegin',
      '<div id="jsAlive" style="background:#004400;color:#00ff88;padding:4px 12px;font-family:monospace;font-size:10px;text-align:center;">JS OK — loading state...</div>');
  } catch(_) {}

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
        o.type = type || 'square'; o.frequency.setValueAtTime(freq, c.currentTime);
        g.gain.setValueAtTime(vol || 0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + dur);
      } catch(e) {}
    }
    return {
      click: function() { tone(600, 0.05, 'square', 0.06); },
      buy: function() { [523,659,784,1047].forEach(function(f,i) { setTimeout(function() { tone(f,0.08,'square',0.08); }, i*60); }); },
      sell: function() { [1047,784,659,523].forEach(function(f,i) { setTimeout(function() { tone(f,0.08,'square',0.08); }, i*60); }); },
      win: function() { [523,659,784,1047,1318].forEach(function(f,i) { setTimeout(function() { tone(f,0.1,'square',0.1); }, i*80); }); },
      lose: function() { [400,300,200].forEach(function(f,i) { setTimeout(function() { tone(f,0.12,'square',0.1); }, i*100); }); },
      cha_ching: function() { [800,1200,1600,2000].forEach(function(f,i) { setTimeout(function() { tone(f,0.08,'sine',0.08); }, i*50); }); }
    };
  })();

  // ===== Market definitions =====
  var STOCKS = [
    { id: 'AAPL', name: 'Apex Industries', desc: 'Blue-chip conglomerate. Reliable, boring, profitable. The stock your grandparents would approve of.', basePrice: 185, volatility: 0.02, drift: 0.001, sector: 'Industrial' },
    { id: 'NVEX', name: 'Novex Technologies', desc: 'High-growth AI and semiconductor company. Priced for perfection, which it occasionally delivers.', basePrice: 480, volatility: 0.04, drift: 0.002, sector: 'Technology' },
    { id: 'MRDN', name: 'Meridian Health', desc: 'Pharmaceutical giant. Steady revenue from existing drugs, pipeline gambles on new ones.', basePrice: 72, volatility: 0.03, drift: 0.001, sector: 'Healthcare' },
    { id: 'CSTL', name: 'Coastal Logistics', desc: 'Global shipping and freight. When the economy moves, so does their stock. Cyclical.', basePrice: 28, volatility: 0.035, drift: 0.0005, sector: 'Logistics' },
    { id: 'GRNV', name: 'GreenVolt Energy', desc: 'Renewable energy. Government contracts keep the lights on, but margins are thin.', basePrice: 42, volatility: 0.03, drift: 0.0015, sector: 'Energy' },
    { id: 'QBIT', name: 'QuBit Labs', desc: 'Speculative quantum computing startup. Either the future of everything or vaporware. No middle ground.', basePrice: 8, volatility: 0.07, drift: 0.003, sector: 'Technology' }
  ];

  var FUNDS = [
    { id: 'VIDX', name: 'Vanguard Total Market Index', desc: 'Weighted basket of all listed stocks. Diversified and steady. The boring choice that usually wins.', fee: 0.005 },
    { id: 'GFND', name: 'Growth Opportunities Fund', desc: 'Weighted toward Novex and QuBit. Higher risk, higher potential. For the optimistic.', fee: 0.008 }
  ];

  var BONDS = [
    { id: 'TB3', name: '3-Session Treasury Note', desc: 'Matures after 3 focus sessions. Low yield, guaranteed return. The safest bet.', sessions: 3, rate: 0.02 },
    { id: 'TB7', name: '7-Session Treasury Bond', desc: 'Matures after 7 focus sessions. Moderate yield, guaranteed. Patient money.', sessions: 7, rate: 0.05 },
    { id: 'TB20', name: '20-Session Treasury Bond', desc: 'Matures after 20 focus sessions. Best yield available, long commitment. Set it and forget it.', sessions: 20, rate: 0.15 }
  ];

  var CRYPTOS = [
    { id: 'BTC', name: 'BitCoin', desc: 'The original cryptocurrency. Wild swings, true believers, and the occasional rug pull.', basePrice: 0.50, volatility: 0.12, drift: 0.005 },
    { id: 'ETH', name: 'EtherToken', desc: 'Smart contract platform token. Slightly less volatile than BTC. Slightly.', basePrice: 3.20, volatility: 0.08, drift: 0.003 }
  ];

  // v3.23.139: Gambling removed

  var NEWS = [
    'Apex Industries reports record quarterly earnings. Stock holds steady.',
    'Novex Technologies unveils next-gen chip architecture. Analysts upgrade to buy.',
    'Meridian Health faces FDA review on flagship drug. Shares dip.',
    'Coastal Logistics expands into Southeast Asian markets.',
    'GreenVolt wins $2B federal energy contract.',
    'QuBit Labs publishes breakthrough quantum error correction paper.',
    'BitCoin surges 15% on institutional adoption rumors.',
    'EtherToken partnerships expand DeFi utility.',
    'Markets steady as Fed signals rate pause.',
    'Analysts warn of tech sector overvaluation.',
    'Federal Reserve holds interest rates steady at 4.5%.',
    'Crypto markets rattled after major exchange outage.',
    'Index fund inflows hit record highs as retail investors diversify.',
    'Bond yields tick up as inflation data exceeds expectations.',
    'Retail investors pile into speculative biotech names.',
    'SEC announces new cryptocurrency trading regulations.',
    'QuBit Labs plunges 30% on failed proof-of-concept demo.',
    'Apex Industries announces 2.1% dividend yield. Income investors rejoice.',
    'Novex Technologies CEO announces retirement. Successor unnamed.',
    'Coastal Logistics wins massive government defense contract.'
  ];

  // ===== State =====
  var state = {};

  function getB() {
    if (!state.brokerage) state.brokerage = {};
    var b = state.brokerage;
    if (typeof b.cash !== 'number') b.cash = 0;
    if (!b.portfolio || typeof b.portfolio !== 'object' || Array.isArray(b.portfolio)) b.portfolio = {};
    if (!b.prices || typeof b.prices !== 'object' || Array.isArray(b.prices)) b.prices = {};
    if (!b.priceHistory || typeof b.priceHistory !== 'object' || Array.isArray(b.priceHistory)) b.priceHistory = {};
    if (!Array.isArray(b.activeBonds)) b.activeBonds = [];
    if (typeof b.totalDeposited !== 'number') b.totalDeposited = 0;
    if (typeof b.totalWithdrawn !== 'number') b.totalWithdrawn = 0;
    if (typeof b.tradesCount !== 'number') b.tradesCount = 0;
    if (typeof b.totalGambled !== 'number') b.totalGambled = 0;
    if (typeof b.totalGamblingWon !== 'number') b.totalGamblingWon = 0;
    if (typeof b.lastMarketTick !== 'number') b.lastMarketTick = 0;
    if (typeof b.sessionsSinceBonds !== 'number') b.sessionsSinceBonds = 0;
    if (typeof b.acumen !== 'number') b.acumen = 0;
    if (!b.ownedUpgrades) b.ownedUpgrades = {};
    if (!b.earnedAchievements) b.earnedAchievements = {};
    if (typeof b.biggestSingleProfit !== 'number') b.biggestSingleProfit = 0;
    if (typeof b.longestHoldTicks !== 'number') b.longestHoldTicks = 0;
    if (typeof b.dipBuys !== 'number') b.dipBuys = 0;
    if (!Array.isArray(b.limitOrders)) b.limitOrders = [];
    if (!Array.isArray(b.shortPositions)) b.shortPositions = [];
    if (typeof b.marginLoan !== 'number') b.marginLoan = 0;
    if (typeof b.marginInterestPaid !== 'number') b.marginInterestPaid = 0;
    return b;
  }

  // ===== Storage =====
  function load(cb) {
    chrome.storage.local.get('pixelFocusState', function(r) {
      state = r.pixelFocusState || {};
      if (typeof state.coins !== 'number') state.coins = 0;
      var b = getB();
      // Initialize prices if needed
      initPrices(b);
      // Tick market forward if enough time has passed
      tickMarket(b);
      save(cb);
    });
  }

  // Read-merge-write: re-read the latest state from storage, merge ONLY
  // the properties the brokerage owns (coins and brokerage sub-object),
  // then write back.  This prevents the brokerage from stomping on
  // market engine state, bureau bonus, factory upgrades, or anything
  // else the popup wrote while we were open.
  function save(cb) {
    chrome.storage.local.get('pixelFocusState', function(r) {
      var latest = r.pixelFocusState || {};
      // Brokerage owns: coins and brokerage sub-object
      latest.coins = state.coins;
      latest.brokerage = state.brokerage;
      chrome.storage.local.set({ pixelFocusState: latest }, function() {
        // Sync our local state with whatever the popup changed
        state = latest;
        if (cb) cb();
      });
    });
  }

  // Keep wallet display fresh when the popup modifies coins
  // (e.g. user earns coins from a focus session while brokerage is open)
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local' || !changes.pixelFocusState) return;
    var newState = changes.pixelFocusState.newValue || {};
    // Only update coins from external changes; don't overwrite our brokerage data
    if (typeof newState.coins === 'number') {
      state.coins = newState.coins;
    }
    renderWalletBar();
  });

  // ===== Price engine =====
  // Geometric Brownian Motion: realistic stock price movement
  function gaussRandom() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function initPrices(b) {
    var allAssets = STOCKS.concat(CRYPTOS);
    allAssets.forEach(function(s) {
      if (!b.prices[s.id]) b.prices[s.id] = s.basePrice;
      if (!b.priceHistory[s.id]) b.priceHistory[s.id] = [s.basePrice];
    });
    // Fund prices derived from stock prices
    FUNDS.forEach(function(f) {
      if (!b.priceHistory[f.id]) b.priceHistory[f.id] = [];
    });
  }

  function tickMarket(b) {
    var now = Date.now();
    var TICK_INTERVAL = 60 * 60 * 1000; // 1 hour
    if (b.lastMarketTick && (now - b.lastMarketTick) < TICK_INTERVAL) return;

    // Calculate how many ticks we missed
    var ticksMissed = b.lastMarketTick ? Math.min(Math.floor((now - b.lastMarketTick) / TICK_INTERVAL), 168) : 1;
    if (ticksMissed < 1) ticksMissed = 1;

    var allAssets = STOCKS.concat(CRYPTOS);
    for (var t = 0; t < ticksMissed; t++) {
      // Random market event (5% chance per tick)
      var eventMult = 1;
      if (Math.random() < 0.05) {
        eventMult = 0.85 + Math.random() * 0.30; // -15% to +15% market-wide
      }

      allAssets.forEach(function(s) {
        var price = b.prices[s.id] || s.basePrice;
        var drift = s.drift || 0.001;
        var vol = s.volatility || 0.03;
        // GBM step
        var dW = gaussRandom();
        var dailyReturn = drift + vol * dW;
        price = price * (1 + dailyReturn) * eventMult;
        // Floor at 1% of base price (no going to zero)
        price = Math.max(price, s.basePrice * 0.01);
        // Cap at 100x base price
        price = Math.min(price, s.basePrice * 100);
        b.prices[s.id] = Math.round(price * 100) / 100;

        if (!b.priceHistory[s.id]) b.priceHistory[s.id] = [];
        b.priceHistory[s.id].push(b.prices[s.id]);
        // Keep last 168 ticks (1 week of hourly)
        if (b.priceHistory[s.id].length > 168) b.priceHistory[s.id] = b.priceHistory[s.id].slice(-168);
      });

      // Calculate fund prices (weighted average)
      FUNDS.forEach(function(f) {
        var fundPrice = calcFundPrice(f, b);
        if (!b.priceHistory[f.id]) b.priceHistory[f.id] = [];
        b.priceHistory[f.id].push(fundPrice);
        if (b.priceHistory[f.id].length > 168) b.priceHistory[f.id] = b.priceHistory[f.id].slice(-168);
      });
    }

    // v3.23.138: Update longestHoldTicks for Diamond Hands achievement
    var _tickNow = now;
    Object.keys(b.portfolio).forEach(function(pid) {
      var pos = b.portfolio[pid];
      if (pos && pos.shares > 0 && pos.boughtAtTick) {
        var holdTicks = Math.floor((_tickNow - pos.boughtAtTick) / (60 * 60 * 1000));
        if (holdTicks > (b.longestHoldTicks || 0)) b.longestHoldTicks = holdTicks;
      }
    });
    // v3.23.138: Process limit orders if upgrade owned
    if (b.ownedUpgrades && b.ownedUpgrades.limitOrders && Array.isArray(b.limitOrders)) {
      var _filled = [];
      b.limitOrders.forEach(function(order, oi) {
        var curPrice = b.prices[order.assetId];
        if (curPrice && curPrice <= order.targetPrice && b.cash >= order.qty * curPrice) {
          var cost = order.qty * curPrice;
          b.cash -= cost;
          b.cash = Math.round(b.cash * 100) / 100;
          if (!b.portfolio[order.assetId]) b.portfolio[order.assetId] = { shares: 0, avgCost: 0 };
          var h = b.portfolio[order.assetId];
          var oldT = h.shares * h.avgCost;
          h.shares += order.qty;
          h.avgCost = Math.round((oldT + cost) / h.shares * 100) / 100;
          if (!h.boughtAtTick) h.boughtAtTick = _tickNow;
          b.tradesCount++;
          _filled.push(oi);
          showNews('Limit order filled: ' + order.qty + ' ' + order.assetId + ' at $' + (Math.round(curPrice * 100) / 100));
        }
      });
      for (var _fi = _filled.length - 1; _fi >= 0; _fi--) b.limitOrders.splice(_filled[_fi], 1);
    }
    // v3.23.138: Charge margin interest if margin loan active
    if (b.ownedUpgrades && b.ownedUpgrades.margin && b.marginLoan > 0) {
      var _interest = b.marginLoan * 0.002 * ticksMissed; // 0.2% per tick
      b.cash -= _interest;
      b.marginInterestPaid = (b.marginInterestPaid || 0) + _interest;
      if (b.cash < 0) {
        // Margin call — liquidate the loan
        b.cash += b.marginLoan;
        showNews('MARGIN CALL! Loan liquidated. You owe more than you have.');
        b.marginLoan = 0;
      }
    }
    b.lastMarketTick = now;
  }

  function calcFundPrice(fund, b) {
    if (fund.id === 'VIDX') {
      // Equal-weighted index of all stocks
      var total = 0;
      STOCKS.forEach(function(s) { total += (b.prices[s.id] || s.basePrice); });
      return Math.round((total / STOCKS.length) * 100) / 100;
    } else if (fund.id === 'GFND') {
      // Growth-weighted: 40% NVEX, 30% QBIT, 15% AAPL, 15% rest
      var nvex = b.prices['NVEX'] || 480;
      var qbit = b.prices['QBIT'] || 8;
      var aapl = b.prices['AAPL'] || 185;
      var rest = 0;
      STOCKS.forEach(function(s) { if (s.id !== 'NVEX' && s.id !== 'QBIT' && s.id !== 'AAPL') rest += (b.prices[s.id] || s.basePrice); });
      rest = rest / Math.max(1, STOCKS.length - 3);
      return Math.round((nvex * 0.4 + qbit * 0.3 + aapl * 0.15 + rest * 0.15) * 100) / 100;
    }
    return 10;
  }

  // ===== Formatting helpers =====
  function fmt(n) {
    if (typeof n !== 'number' || isNaN(n)) return '0';
    if (Math.abs(n) >= 1000000) return (Math.floor(Math.abs(n) / 10000) / 100 * Math.sign(n)).toFixed(2) + 'M';
    if (Math.abs(n) >= 10000) return Math.floor(n / 1000) + 'K';
    if (Math.abs(n) >= 100) return Math.round(n).toLocaleString();
    return n.toFixed(2);
  }

  function fmtPct(n) {
    if (typeof n !== 'number' || isNaN(n)) return '0.00%';
    return (n >= 0 ? '+' : '') + (n * 100).toFixed(2) + '%';
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  // ===== Mini chart drawing =====
  function drawMiniChart(canvas, history, color) {
    if (!canvas || !history || history.length < 2) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width = canvas.offsetWidth * 2;
    var h = canvas.height = canvas.offsetHeight * 2;
    ctx.clearRect(0, 0, w, h);

    var min = Math.min.apply(null, history);
    var max = Math.max.apply(null, history);
    if (max === min) { max = min + 1; }
    var range = max - min;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(42,42,74,0.5)';
    ctx.lineWidth = 1;
    for (var g = 0; g < 3; g++) {
      var gy = h * (g + 1) / 4;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    // Draw price line
    var isUp = history[history.length - 1] >= history[0];
    ctx.strokeStyle = color || (isUp ? '#00ff88' : '#ff4466');
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach(function(p, i) {
      var x = (i / (history.length - 1)) * w;
      var y = h - ((p - min) / range) * (h * 0.9) - h * 0.05;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = isUp ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,102,0.05)';
    ctx.fill();
  }

  // ===== Tab switching =====
  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (btn.classList.contains('locked')) return;
      SFX.click();
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
      var target = btn.getAttribute('data-panel');
      var panel = document.getElementById(target + 'Panel');
      if (panel) panel.classList.add('active');
    });
  });

  // ===== Render functions =====
  function renderWalletBar() {
    var b = getB();
    document.getElementById('walletCoins').textContent = fmt(state.coins || 0);
    document.getElementById('brokerageCash').textContent = fmt(b.cash);

    var portfolioValue = calcPortfolioValue(b);
    document.getElementById('portfolioVal').textContent = fmt(portfolioValue);

    var totalInvested = b.totalDeposited - b.totalWithdrawn;
    var currentTotal = b.cash + portfolioValue;
    var pl = currentTotal - totalInvested;
    var plEl = document.getElementById('totalPL');
    plEl.textContent = (pl >= 0 ? '+' : '') + fmt(pl);
    plEl.className = 'val ' + (pl >= 0 ? 'green' : 'red');

    // Acumen display
    var acEl = document.getElementById('acumenVal');
    if (acEl) acEl.textContent = b.acumen || 0;
  }

  function calcPortfolioValue(b) {
    var total = 0;
    Object.keys(b.portfolio).forEach(function(id) {
      var holding = b.portfolio[id];
      if (!holding || !holding.shares) return;
      var price = b.prices[id] || 0;
      total += holding.shares * price;
    });
    // Add bond face values
    if (b.activeBonds) {
      b.activeBonds.forEach(function(bond) { total += bond.amount; });
    }
    return Math.round(total * 100) / 100;
  }

  function renderStocks() {
    var b = getB();
    var el = document.getElementById('stocksList');
    el.innerHTML = '';
    STOCKS.forEach(function(s) {
      var price = b.prices[s.id] || s.basePrice;
      var history = b.priceHistory[s.id] || [price];
      var prevPrice = history.length > 1 ? history[history.length - 2] : price;
      var change = prevPrice ? (price - prevPrice) / prevPrice : 0;
      var holding = b.portfolio[s.id];
      var shares = holding ? holding.shares : 0;

      var card = document.createElement('div');
      card.className = 'stock-card';
      card.title = esc(s.desc);
      card.innerHTML =
        '<div class="stock-row">' +
          '<span class="stock-ticker" title="Stock ticker symbol">' + s.id + '</span>' +
          '<span class="stock-name">' + esc(s.name) + '<br><span style="font-size:10px;color:var(--text-dim);">' + esc(s.desc) + '</span></span>' +
          '<span class="stock-price ' + (change >= 0 ? 'up' : 'down') + '" title="Current price per share">$' + fmt(price) + '</span>' +
          '<span class="stock-change ' + (change >= 0 ? 'up' : 'down') + '" title="Price change since last market tick">' + fmtPct(change) + '</span>' +
        '</div>' +
        '<canvas class="mini-chart" id="chart_' + s.id + '" title="Price history chart — shows recent price movement"></canvas>' +
        '<div class="trade-row">' +
          (shares > 0 ? '<span class="holding-badge" title="Your current position: ' + shares + ' shares at an average purchase price of $' + fmt(holding.avgCost) + ' each">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<input class="trade-input" type="number" min="1" value="1" id="qty_' + s.id + '" title="Number of shares to buy or sell">' +
          '<span class="qty-presets"><button class="qty-preset-btn" data-val="1">x1</button><button class="qty-preset-btn" data-val="5">x5</button><button class="qty-preset-btn" data-val="10">x10</button><button class="qty-preset-btn" data-val="max" data-price="' + price + '">MAX</button></span>' +
          '<button class="trade-btn buy" data-id="' + s.id + '" data-type="stock" title="Buy shares at the current price using your brokerage cash">BUY</button>' +
          (shares > 0 ? '<button class="trade-btn sell" data-id="' + s.id + '" data-type="stock" title="Sell shares at the current market price back to cash">SELL</button>' : '') +
          '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + s.id + '">' + fmt(price) + '</span></span>' +
        '</div>';

      el.appendChild(card);

      // Draw chart
      setTimeout(function() {
        var canvas = document.getElementById('chart_' + s.id);
        drawMiniChart(canvas, history);
      }, 10);

      // Qty change updates cost preview
      var qtyInput = document.getElementById('qty_' + s.id);
      var costSpan = document.getElementById('cost_' + s.id);
      if (qtyInput && costSpan) {
        qtyInput.addEventListener('input', function() {
          var q = parseInt(qtyInput.value) || 1;
          costSpan.textContent = fmt(q * price);
        });
      }
    });

    // Wire buy/sell buttons
    el.querySelectorAll('.trade-btn.buy').forEach(function(btn) {
      btn.addEventListener('click', function() { buyAsset(btn.dataset.id, btn.dataset.type); });
    });
    el.querySelectorAll('.trade-btn.sell').forEach(function(btn) {
      btn.addEventListener('click', function() { sellAsset(btn.dataset.id, btn.dataset.type); });
    });
  }

  function renderFunds() {
    var b = getB();
    var el = document.getElementById('fundsList');
    el.innerHTML = '';
    FUNDS.forEach(function(f) {
      var price = calcFundPrice(f, b);
      var history = b.priceHistory[f.id] || [price];
      var prevPrice = history.length > 1 ? history[history.length - 2] : price;
      var change = prevPrice ? (price - prevPrice) / prevPrice : 0;
      var holding = b.portfolio[f.id];
      var shares = holding ? holding.shares : 0;

      var card = document.createElement('div');
      card.className = 'stock-card';
      card.title = esc(f.desc);
      card.innerHTML =
        '<div class="stock-row">' +
          '<span class="stock-ticker" title="Fund ticker symbol">' + f.id + '</span>' +
          '<span class="stock-name">' + esc(f.name) + '<br><span style="font-size:10px;color:var(--text-dim);">' + esc(f.desc) + ' (Fee: ' + (f.fee * 100).toFixed(1) + '%)</span></span>' +
          '<span class="stock-price ' + (change >= 0 ? 'up' : 'down') + '" title="Current fund share price">$' + fmt(price) + '</span>' +
          '<span class="stock-change ' + (change >= 0 ? 'up' : 'down') + '" title="Price change since last tick">' + fmtPct(change) + '</span>' +
        '</div>' +
        '<canvas class="mini-chart" id="chart_' + f.id + '" title="Fund price history"></canvas>' +
        '<div class="trade-row">' +
          (shares > 0 ? '<span class="holding-badge" title="Your fund position">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<input class="trade-input" type="number" min="1" value="1" id="qty_' + f.id + '" title="Number of fund shares to buy or sell">' +
          '<span class="qty-presets"><button class="qty-preset-btn" data-val="1">x1</button><button class="qty-preset-btn" data-val="5">x5</button><button class="qty-preset-btn" data-val="10">x10</button><button class="qty-preset-btn" data-val="max" data-price="' + (price * (1 + f.fee)) + '">MAX</button></span>' +
          '<button class="trade-btn buy" data-id="' + f.id + '" data-type="fund" title="Buy fund shares (management fee of ' + (f.fee * 100).toFixed(1) + '% applies)">BUY</button>' +
          (shares > 0 ? '<button class="trade-btn sell" data-id="' + f.id + '" data-type="fund" title="Sell fund shares back to cash">SELL</button>' : '') +
          '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + f.id + '">' + fmt(price) + '</span></span>' +
        '</div>';

      el.appendChild(card);

      setTimeout(function() {
        var canvas = document.getElementById('chart_' + f.id);
        drawMiniChart(canvas, history, '#4ecdc4');
      }, 10);

      var qtyInput = document.getElementById('qty_' + f.id);
      var costSpan = document.getElementById('cost_' + f.id);
      if (qtyInput && costSpan) {
        qtyInput.addEventListener('input', function() {
          costSpan.textContent = fmt((parseInt(qtyInput.value) || 1) * price);
        });
      }
    });

    el.querySelectorAll('.trade-btn.buy').forEach(function(btn) {
      btn.addEventListener('click', function() { buyAsset(btn.dataset.id, btn.dataset.type); });
    });
    el.querySelectorAll('.trade-btn.sell').forEach(function(btn) {
      btn.addEventListener('click', function() { sellAsset(btn.dataset.id, btn.dataset.type); });
    });
  }

  function renderBonds() {
    var b = getB();
    var el = document.getElementById('bondsList');
    el.innerHTML = '';

    // Available bonds to buy
    var buyTitle = document.createElement('div');
    buyTitle.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:var(--green);margin-bottom:12px;';
    buyTitle.textContent = 'BUY NEW BONDS';
    el.appendChild(buyTitle);

    BONDS.forEach(function(bond) {
      var card = document.createElement('div');
      card.className = 'bond-card';
      card.title = esc(bond.desc) + ' Guaranteed ' + (bond.rate * 100).toFixed(0) + '% return after ' + bond.sessions + ' focus sessions.';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<div>' +
            '<div class="rate">' + esc(bond.name) + '</div>' +
            '<div class="maturity">' + esc(bond.desc) + '</div>' +
            '<div style="margin-top:4px;font-family:\'Press Start 2P\',monospace;font-size:9px;color:var(--green);" title="Guaranteed return percentage when the bond matures">YIELD: ' + (bond.rate * 100).toFixed(0) + '%</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<input class="trade-input" type="number" min="10" value="100" step="50" id="bondAmt_' + bond.id + '" title="Amount of brokerage cash to invest in this bond">' +
            '<button class="trade-btn buy buy-bond-btn" data-id="' + bond.id + '" title="Purchase this bond — matures after ' + bond.sessions + ' focus sessions for a ' + (bond.rate * 100).toFixed(0) + '% return">BUY</button>' +
          '</div>' +
        '</div>';
      el.appendChild(card);
    });

    el.querySelectorAll('.buy-bond-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        buyBond(btn.dataset.id);
      });
    });

    // Active bonds
    if (b.activeBonds && b.activeBonds.length > 0) {
      var hr = document.createElement('div');
      hr.style.cssText = 'border-bottom:1px solid var(--border);margin:16px 0;';
      el.appendChild(hr);

      var activeTitle = document.createElement('div');
      activeTitle.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:var(--accent3);margin-bottom:12px;';
      activeTitle.textContent = 'ACTIVE BONDS';
      el.appendChild(activeTitle);

      b.activeBonds.forEach(function(bond, idx) {
        var progress = Math.min(bond.sessionsElapsed || 0, bond.sessionsNeeded);
        var pct = Math.round((progress / bond.sessionsNeeded) * 100);
        var mature = progress >= bond.sessionsNeeded;
        var card = document.createElement('div');
        card.className = 'bond-card';
        card.title = mature ? 'This bond has matured! Click COLLECT to receive your principal plus interest.' : 'Bond in progress — ' + progress + ' of ' + bond.sessionsNeeded + ' focus sessions completed. ' + (bond.sessionsNeeded - progress) + ' sessions remaining.';
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
              '<div class="rate">' + esc(bond.name) + '</div>' +
              '<div class="maturity">' + (mature ? 'MATURED — Ready to collect!' : progress + '/' + bond.sessionsNeeded + ' sessions (' + pct + '%)') + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<div style="font-family:\'Press Start 2P\',monospace;font-size:10px;color:var(--gold);" title="Principal amount invested">$' + fmt(bond.amount) + '</div>' +
              '<div style="font-size:10px;color:var(--green);" title="Interest earned when the bond matures">+$' + fmt(bond.amount * bond.rate) + ' on maturity</div>' +
            '</div>' +
          '</div>' +
          '<div style="height:4px;background:var(--border);border-radius:2px;margin-top:8px;overflow:hidden;" title="Maturity progress — each focus session advances the bond">' +
            '<div style="height:100%;background:' + (mature ? 'var(--green)' : 'var(--gold)') + ';width:' + pct + '%;border-radius:2px;transition:width 0.3s;"></div>' +
          '</div>' +
          (mature ? '<div style="text-align:center;margin-top:8px;"><button class="trade-btn buy collect-bond-btn" data-idx="' + idx + '" title="Collect your principal plus ' + (bond.rate * 100).toFixed(0) + '% interest">COLLECT $' + fmt(bond.amount * (1 + bond.rate)) + '</button></div>' : '');
        el.appendChild(card);
      });

      // Wire collect buttons
      el.querySelectorAll('.collect-bond-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          collectBond(idx);
        });
      });
    }

  }

  function renderCrypto() {
    var b = getB();
    var el = document.getElementById('cryptoList');
    el.innerHTML = '';

    // Warning banner
    var warn = document.createElement('div');
    warn.style.cssText = 'background:rgba(255,68,102,0.1);border:1px solid rgba(255,68,102,0.3);border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;font-size:11px;color:#ff6b9d;';
    warn.textContent = 'EXTREME VOLATILITY — Crypto prices can swing wildly. You can lose everything.';
    el.appendChild(warn);

    CRYPTOS.forEach(function(c) {
      var price = b.prices[c.id] || c.basePrice;
      var history = b.priceHistory[c.id] || [price];
      var prevPrice = history.length > 1 ? history[history.length - 2] : price;
      var change = prevPrice ? (price - prevPrice) / prevPrice : 0;
      var holding = b.portfolio[c.id];
      var coins = holding ? holding.shares : 0;

      var card = document.createElement('div');
      card.className = 'stock-card';
      card.title = esc(c.desc);
      card.innerHTML =
        '<div class="stock-row">' +
          '<span class="stock-ticker" style="color:#ff6b9d;" title="Cryptocurrency ticker">' + c.id + '</span>' +
          '<span class="stock-name">' + esc(c.name) + '<br><span style="font-size:10px;color:var(--text-dim);">' + esc(c.desc) + '</span></span>' +
          '<span class="stock-price ' + (change >= 0 ? 'up' : 'down') + '" title="Current price per token">$' + fmt(price) + '</span>' +
          '<span class="stock-change ' + (change >= 0 ? 'up' : 'down') + '" title="Price change since last tick">' + fmtPct(change) + '</span>' +
        '</div>' +
        '<canvas class="mini-chart" id="chart_' + c.id + '" title="Price history — crypto swings hard"></canvas>' +
        '<div class="trade-row">' +
          (coins > 0 ? '<span class="holding-badge" title="Your crypto position">' + fmt(coins) + ' HELD (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<input class="trade-input" type="number" min="1" value="10" id="qty_' + c.id + '" title="Number of tokens to buy or sell">' +
          '<span class="qty-presets"><button class="qty-preset-btn" data-val="1">x1</button><button class="qty-preset-btn" data-val="5">x5</button><button class="qty-preset-btn" data-val="10">x10</button><button class="qty-preset-btn" data-val="max" data-price="' + price + '">MAX</button></span>' +
          '<button class="trade-btn buy" data-id="' + c.id + '" data-type="crypto" title="Buy crypto at the current price">BUY</button>' +
          (coins > 0 ? '<button class="trade-btn sell" data-id="' + c.id + '" data-type="crypto" title="Sell back to brokerage cash">SELL</button>' : '') +
          '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + c.id + '">' + fmt(10 * price) + '</span></span>' +
        '</div>';

      el.appendChild(card);

      setTimeout(function() {
        var canvas = document.getElementById('chart_' + c.id);
        drawMiniChart(canvas, history, '#ff6b9d');
      }, 10);

      var qtyInput = document.getElementById('qty_' + c.id);
      var costSpan = document.getElementById('cost_' + c.id);
      if (qtyInput && costSpan) {
        qtyInput.addEventListener('input', function() {
          costSpan.textContent = fmt((parseInt(qtyInput.value) || 1) * price);
        });
      }
    });

    el.querySelectorAll('.trade-btn.buy').forEach(function(btn) {
      btn.addEventListener('click', function() { buyAsset(btn.dataset.id, btn.dataset.type); });
    });
    el.querySelectorAll('.trade-btn.sell').forEach(function(btn) {
      btn.addEventListener('click', function() { sellAsset(btn.dataset.id, btn.dataset.type); });
    });
  }

  // v3.23.139: renderGambling removed

    function renderPortfolio() {
    var b = getB();
    var el = document.getElementById('portfolioView');
    el.innerHTML = '';

    var allAssets = STOCKS.concat(FUNDS).concat(CRYPTOS);
    var hasHoldings = false;

    var table = '<table class="portfolio-table"><thead><tr>' +
      '<th>ASSET</th><th>SHARES</th><th>AVG COST</th><th>PRICE</th><th>VALUE</th><th>P/L</th><th>SELL</th>' +
      '</tr></thead><tbody>';

    allAssets.forEach(function(a) {
      var holding = b.portfolio[a.id];
      if (!holding || !holding.shares) return;
      hasHoldings = true;
      var price = b.prices[a.id] || a.basePrice || calcFundPrice(a, b);
      var value = holding.shares * price;
      var cost = holding.shares * holding.avgCost;
      var pl = value - cost;
      var plPct = cost > 0 ? (pl / cost) : 0;
      table += '<tr>' +
        '<td style="color:var(--accent3);font-weight:bold;">' + a.id + ' <span style="color:var(--text-dim);font-weight:normal;">' + esc(a.name) + '</span></td>' +
        '<td>' + fmt(holding.shares) + '</td>' +
        '<td>$' + fmt(holding.avgCost) + '</td>' +
        '<td>$' + fmt(price) + '</td>' +
        '<td style="color:var(--gold);">$' + fmt(value) + '</td>' +
        '<td style="color:' + (pl >= 0 ? 'var(--green)' : 'var(--red)') + ';">' + (pl >= 0 ? '+' : '') + fmt(pl) + ' (' + fmtPct(plPct) + ')</td>' +
        '<td style="white-space:nowrap;"><input type="number" min="1" value="1" class="trade-input pf-sell-qty" data-id="' + a.id + '" style="width:40px;font-size:8px;padding:2px 3px;"><button class="trade-btn sell pf-sell-btn" data-id="' + a.id + '" style="font-size:7px;padding:3px 6px;margin-left:4px;">SELL</button></td></tr>';
    });

    table += '</tbody></table>';

    if (!hasHoldings && (!b.activeBonds || b.activeBonds.length === 0)) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-style:italic;">No investments yet. Start trading to build your portfolio.</div>';
      return;
    }

    el.innerHTML = table;

    // Bonds section
    if (b.activeBonds && b.activeBonds.length > 0) {
      var bondSection = document.createElement('div');
      bondSection.style.cssText = 'margin-top:20px;';
      bondSection.innerHTML = '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:var(--text-dim);margin-bottom:8px;">ACTIVE BONDS</div>';
      b.activeBonds.forEach(function(bond) {
        var pct = Math.round(((bond.sessionsElapsed || 0) / bond.sessionsNeeded) * 100);
        bondSection.innerHTML += '<div style="padding:4px 0;font-size:11px;color:var(--text);">' + esc(bond.name) + ' — $' + fmt(bond.amount) + ' (' + pct + '% mature)</div>';
      });
      el.appendChild(bondSection);
    }

    // Total summary
    var totalValue = b.cash + calcPortfolioValue(b);
    var totalInvested = b.totalDeposited - b.totalWithdrawn;
    var totalPL = totalValue - totalInvested;
    var summary = document.createElement('div');
    summary.className = 'portfolio-total';
    summary.innerHTML = 'TOTAL BROKERAGE VALUE: $' + fmt(totalValue) +
      '<br><span style="font-size:9px;color:' + (totalPL >= 0 ? 'var(--green)' : 'var(--red)') + ';">All-time P/L: ' + (totalPL >= 0 ? '+' : '') + fmt(totalPL) + '</span>' +
      '<br><span style="font-size:8px;color:var(--text-dim);">Trades: ' + (b.tradesCount || 0) + '</span>';
    el.appendChild(summary);

    // Wire portfolio sell buttons
    el.querySelectorAll('.pf-sell-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var assetId = btn.getAttribute('data-id');
        var qtyInput = btn.parentNode.querySelector('.pf-sell-qty');
        var qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
        var aType = 'stock';
        CRYPTOS.forEach(function(c) { if (c.id === assetId) aType = 'crypto'; });
        FUNDS.forEach(function(f) { if (f.id === assetId) aType = 'fund'; });
        sellAsset(assetId, aType, qty);
      });
    });
  }

  // ===== Trade actions =====
  function buyAsset(id, type) {
    var b = getB();
    var qtyEl = document.getElementById('qty_' + id);
    var qty = parseInt(qtyEl ? qtyEl.value : 1) || 1;
    if (qty < 1) return;

    var price;
    if (type === 'fund') {
      var fund = FUNDS.filter(function(f) { return f.id === id; })[0];
      if (!fund) return;
      price = calcFundPrice(fund, b);
      // Apply management fee
      price = price * (1 + fund.fee);
    } else {
      price = b.prices[id];
    }
    if (!price) return;

    var totalCost = qty * price;
    if (b.cash < totalCost) {
      SFX.lose();
      showNews('Not enough brokerage cash. Deposit more from your wallet.');
      return;
    }

    b.cash -= totalCost;
    b.cash = Math.round(b.cash * 100) / 100;

    if (!b.portfolio[id]) b.portfolio[id] = { shares: 0, avgCost: 0 };
    var h = b.portfolio[id];
    var oldTotal = h.shares * h.avgCost;
    h.shares += qty;
    h.avgCost = (oldTotal + totalCost) / h.shares;
    h.avgCost = Math.round(h.avgCost * 100) / 100;
    // v3.23.138: Track when position was first acquired for Diamond Hands
    if (!h.boughtAtTick) h.boughtAtTick = b.lastMarketTick || Date.now();
    b.tradesCount++;

    // Acumen: detect dip buy (price dropped >10% from recent high)
    var hist = b.priceHistory[id] || [];
    if (hist.length >= 5) {
      var recentHigh = Math.max.apply(null, hist.slice(-10));
      if (price < recentHigh * 0.9) b.dipBuys = (b.dipBuys || 0) + 1;
    }

    SFX.buy();
    showNews('Bought ' + qty + ' ' + id + ' at $' + fmt(price) + '/ea.');
    checkAchievements(b);
    save(function() { renderAll(); });
  }

  function sellAsset(id, type, _overrideQty) {
    var b = getB();
    var qtyEl = document.getElementById('qty_' + id);
    var qty = typeof _overrideQty === 'number' ? _overrideQty : (parseInt(qtyEl ? qtyEl.value : 1) || 1);

    var h = b.portfolio[id];
    if (!h || h.shares < qty) {
      SFX.lose();
      showNews('Not enough shares to sell.');
      return;
    }

    var price;
    if (type === 'fund') {
      var fund = FUNDS.filter(function(f) { return f.id === id; })[0];
      price = fund ? calcFundPrice(fund, b) : b.prices[id];
    } else {
      price = b.prices[id];
    }
    if (!price) return;

    var revenue = qty * price;
    var saleProfit = revenue - (qty * h.avgCost);
    if (saleProfit > (b.biggestSingleProfit || 0)) b.biggestSingleProfit = saleProfit;

    b.cash += revenue;
    b.cash = Math.round(b.cash * 100) / 100;
    h.shares -= qty;
    if (h.shares <= 0) delete b.portfolio[id];
    b.tradesCount++;

    SFX.sell();
    showNews('Sold ' + qty + ' ' + id + ' at $' + fmt(price) + '/ea for $' + fmt(revenue) + '.');
    checkAchievements(b);
    save(function() { renderAll(); });
  }

  function buyBond(bondId) {
    var b = getB();
    var bond = BONDS.filter(function(bd) { return bd.id === bondId; })[0];
    if (!bond) return;
    var amtEl = document.getElementById('bondAmt_' + bondId);
    var amount = parseInt(amtEl ? amtEl.value : 100) || 100;
    if (amount < 1) return;

    if (b.cash < amount) {
      SFX.lose();
      showNews('Not enough brokerage cash for this bond.');
      return;
    }

    b.cash -= amount;
    b.cash = Math.round(b.cash * 100) / 100;
    b.activeBonds.push({
      id: bondId,
      name: bond.name,
      amount: amount,
      rate: bond.rate,
      sessionsNeeded: bond.sessions,
      sessionsElapsed: 0,
      purchasedAt: Date.now()
    });
    b.tradesCount++;

    SFX.buy();
    showNews('Purchased ' + bond.name + ' for $' + fmt(amount) + '. Yield: ' + (bond.rate * 100) + '% on maturity.');
    save(function() { renderAll(); });
  }

  function collectBond(idx) {
    var b = getB();
    if (!b.activeBonds || idx >= b.activeBonds.length) return;
    var bond = b.activeBonds[idx];
    if ((bond.sessionsElapsed || 0) < bond.sessionsNeeded) return;

    var payout = bond.amount * (1 + bond.rate);
    b.cash += Math.round(payout * 100) / 100;
    b.activeBonds.splice(idx, 1);

    SFX.cha_ching();
    showNews('Bond matured! Collected $' + fmt(payout) + ' (principal + ' + (bond.rate * 100) + '% yield).');
    save(function() { renderAll(); });
  }

  // v3.23.139: playGamble removed

    // ===== Deposit / Withdraw =====
  // Re-read state from storage to get freshest coins value before any
  // transfer.  Prevents race conditions when the popup modifies coins
  // while the brokerage tab is open.
  function freshState(cb) {
    chrome.storage.local.get('pixelFocusState', function(r) {
      var fresh = r.pixelFocusState || {};
      // Merge only the wallet-side value; keep our brokerage sub-object
      // authoritative since WE are the one modifying it.
      if (typeof fresh.coins === 'number') state.coins = fresh.coins;
      cb();
    });
  }

  function deposit() {
    freshState(function() {
      var b = getB();
      var amt = parseInt(document.getElementById('transferAmt').value) || 0;
      if (amt < 1 || state.coins < amt) {
        SFX.lose();
        showNews(state.coins < amt ? 'Not enough money in wallet ($' + fmt(state.coins) + ' available).' : 'Enter a valid amount.');
        return;
      }
      state.coins -= amt;
      b.cash += amt;
      b.totalDeposited += amt;
      SFX.buy();
      showNews('Deposited $' + fmt(amt) + ' into brokerage.');
      save(function() { renderWalletBar(); });
    });
  }

  function withdraw() {
    freshState(function() {
      var b = getB();
      var amt = parseInt(document.getElementById('transferAmt').value) || 0;
      if (amt < 1 || b.cash < amt) {
        SFX.lose();
        showNews(b.cash < amt ? 'Not enough brokerage cash ($' + fmt(b.cash) + ' available).' : 'Enter a valid amount.');
        return;
      }
      b.cash -= amt;
      state.coins += amt;
      b.totalWithdrawn += amt;
      SFX.sell();
      showNews('Withdrew $' + fmt(amt) + ' to wallet.');
      save(function() { renderWalletBar(); });
    });
  }

  // ===== News ticker =====
  var _newsQueue = [];
  function showNews(msg) {
    var ticker = document.getElementById('newsTicker');
    if (ticker) {
      ticker.textContent = msg;
      ticker.style.color = 'var(--gold)';
    }
  }

  function randomNews() {
    var msg = NEWS[Math.floor(Math.random() * NEWS.length)];
    showNews(msg);
  }

  // ===== Acumen System =====
  var UPGRADES = [
    { id: 'trendLines', name: 'Trend Lines', desc: 'Overlay SMA trend line on mini charts', cost: 5, icon: '↗' },
    { id: 'sentiment', name: 'Market Sentiment', desc: 'Show bull/bear/flat badges on stocks', cost: 10, icon: '❤' },
    { id: 'limitOrders', name: 'Limit Orders', desc: 'Set a target price to auto-buy when it dips that low', cost: 25, icon: '⏰' },
    { id: 'sectorView', name: 'Sector Analysis', desc: 'See sector groupings in portfolio', cost: 30, icon: '📁' },
    { id: 'margin', name: 'Margin Trading', desc: 'Borrow up to 50% extra brokerage cash for trades (interest charged)', cost: 60, icon: '⚡' },
    { id: 'shorts', name: 'Short Selling', desc: 'Bet against stocks — profit when prices fall', cost: 75, icon: '📉' },
    { id: 'whispers', name: 'Insider Whispers', desc: 'Extra news hints before market moves', cost: 120, icon: '👂' },
    { id: 'algo', name: 'Algorithmic Trading', desc: 'Auto-rebalance portfolio each market tick', cost: 200, icon: '🤖' }
  ];

  var ACHIEVEMENTS = [
    { id: 'firstTrade', name: 'First Blood', desc: 'Complete your first trade', reward: 2, check: function(b) { return b.tradesCount >= 1; } },
    { id: 'tenTrades', name: 'Getting Started', desc: 'Complete 10 trades', reward: 5, check: function(b) { return b.tradesCount >= 10; } },
    { id: 'fiftyTrades', name: 'Seasoned Trader', desc: 'Complete 50 trades', reward: 15, check: function(b) { return b.tradesCount >= 50; } },
    { id: 'hundredTrades', name: 'Centurion', desc: 'Complete 100 trades', reward: 30, check: function(b) { return b.tradesCount >= 100; } },
    { id: 'diversified', name: 'Diversified', desc: 'Hold 3+ different assets', reward: 8, check: function(b) { return Object.keys(b.portfolio).length >= 3; } },
    { id: 'fullyDiversified', name: 'Fully Diversified', desc: 'Hold 6+ different assets', reward: 20, check: function(b) { return Object.keys(b.portfolio).length >= 6; } },
    { id: 'profitTaker', name: 'Profit Taker', desc: 'Make $100+ profit on a single sale', reward: 5, check: function(b) { return (b.biggestSingleProfit || 0) >= 100; } },
    { id: 'diamondHands', name: 'Diamond Hands', desc: 'Hold any asset for 48+ market ticks', reward: 12, check: function(b) { return (b.longestHoldTicks || 0) >= 48; } },
    { id: 'buyTheDip', name: 'Buy the Dip', desc: 'Buy 5 assets that dropped 10%+', reward: 10, check: function(b) { return (b.dipBuys || 0) >= 5; } },
    { id: 'bigPortfolio', name: 'Big Portfolio', desc: 'Portfolio value exceeds $5,000', reward: 15, check: function(b) { return calcPortfolioValue(b) >= 5000; } },
    { id: 'whale', name: 'Whale', desc: 'Portfolio value exceeds $50,000', reward: 40, check: function(b) { return calcPortfolioValue(b) >= 50000; } },
    { id: 'millionaire', name: 'Millionaire', desc: 'Total brokerage value exceeds $1,000,000', reward: 80, check: function(b) { return (b.cash + calcPortfolioValue(b)) >= 1000000; } }
  ];

  var TIERS = [
    { name: 'Retail Investor', threshold: 0, color: '#8892b0' },
    { name: 'Licensed Broker', threshold: 10, color: '#00ff88' },
    { name: 'Certified Analyst', threshold: 40, color: '#4ecdc4' },
    { name: 'Portfolio Strategist', threshold: 100, color: '#ffd700' },
    { name: 'Institutional Trader', threshold: 200, color: '#c084fc' }
  ];

  function getCurrentTier(b) {
    var ac = b.acumen || 0;
    var tier = TIERS[0];
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (ac >= TIERS[i].threshold) { tier = TIERS[i]; break; }
    }
    return tier;
  }

  function getNextTier(b) {
    var ac = b.acumen || 0;
    for (var i = 0; i < TIERS.length; i++) {
      if (ac < TIERS[i].threshold) return TIERS[i];
    }
    return null;
  }

  function showAcumenToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'acumen-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; }, 2500);
    setTimeout(function() { toast.remove(); }, 3200);
  }

  function checkAchievements(b) {
    if (!b.earnedAchievements) b.earnedAchievements = {};
    ACHIEVEMENTS.forEach(function(ach) {
      if (b.earnedAchievements[ach.id]) return;
      if (ach.check(b)) {
        b.earnedAchievements[ach.id] = Date.now();
        b.acumen = (b.acumen || 0) + ach.reward;
        SFX.cha_ching();
        showAcumenToast('+' + ach.reward + ' ACUMEN: ' + ach.name);
      }
    });
  }

  function buyUpgrade(upgradeId) {
    var b = getB();
    if (b.ownedUpgrades[upgradeId]) return;
    var upgrade = UPGRADES.filter(function(u) { return u.id === upgradeId; })[0];
    if (!upgrade) return;
    if ((b.acumen || 0) < upgrade.cost) {
      SFX.lose();
      showNews('Not enough Acumen. Keep trading to earn more.');
      return;
    }
    b.acumen -= upgrade.cost;
    b.ownedUpgrades[upgradeId] = Date.now();
    SFX.win();
    showAcumenToast('UNLOCKED: ' + upgrade.name);
    save(function() { renderAll(); });
  }

  function renderUpgrades() {
    var b = getB();
    var tier = getCurrentTier(b);
    var nextTier = getNextTier(b);

    // Tier display
    var tierEl = document.getElementById('tierDisplay');
    if (tierEl) {
      var tierHtml = '<div style="font-family:\'Press Start 2P\',monospace;font-size:10px;color:' + tier.color + ';">' + tier.name.toUpperCase() + '</div>';
      tierHtml += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">' + (b.acumen || 0) + ' Acumen';
      if (nextTier) tierHtml += ' — next tier at ' + nextTier.threshold;
      tierHtml += '</div>';
      if (nextTier) {
        var prevThresh = tier.threshold;
        var pct = Math.min(100, Math.round(((b.acumen || 0) - prevThresh) / (nextTier.threshold - prevThresh) * 100));
        tierHtml += '<div style="width:200px;height:4px;background:var(--border);border-radius:2px;margin:6px auto 0;overflow:hidden;">' +
          '<div style="height:100%;width:' + pct + '%;background:' + nextTier.color + ';border-radius:2px;transition:width 0.5s;"></div></div>';
      }
      tierEl.innerHTML = tierHtml;
    }

    // Achievements
    var achEl = document.getElementById('achievementsList');
    if (achEl) {
      var achHtml = '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:var(--text-dim);margin-bottom:8px;">ACHIEVEMENTS</div>';
      achHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
      ACHIEVEMENTS.forEach(function(ach) {
        var earned = b.earnedAchievements && b.earnedAchievements[ach.id];
        achHtml += '<div class="achievement-card' + (earned ? ' earned' : '') + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span class="ach-name">' + esc(ach.name) + '</span>' +
          '<span class="ach-reward">' + (earned ? '✓' : '+' + ach.reward) + '</span>' +
          '</div>' +
          '<div class="ach-desc">' + esc(ach.desc) + '</div>' +
          (earned ? '' : '<div class="ach-bar"><div class="ach-fill" style="width:' + getAchProgress(ach, b) + '%;"></div></div>') +
          '</div>';
      });
      achHtml += '</div>';
      achEl.innerHTML = achHtml;
    }

    // Upgrades
    var upEl = document.getElementById('upgradesList');
    if (upEl) {
      var upHtml = '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:var(--text-dim);margin-bottom:8px;">UPGRADES</div>';
      upHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
      UPGRADES.forEach(function(u) {
        var owned = b.ownedUpgrades && b.ownedUpgrades[u.id];
        var canAfford = (b.acumen || 0) >= u.cost;
        upHtml += '<div class="upgrade-card' + (owned ? ' owned' : '') + '">' +
          '<div class="upgrade-icon">' + u.icon + '</div>' +
          '<div class="upgrade-name">' + esc(u.name) + '</div>' +
          '<div class="upgrade-desc">' + esc(u.desc) + '</div>' +
          '<div class="upgrade-cost">' + (owned ? 'OWNED' : u.cost + ' Acumen') + '</div>' +
          (owned ? '' : '<button class="upgrade-buy-btn' + (canAfford ? '' : ' disabled') + '" data-upgrade="' + u.id + '"' + (canAfford ? '' : ' disabled') + '>BUY</button>') +
          '</div>';
      });
      upHtml += '</div>';
      upEl.innerHTML = upHtml;

      // Wire upgrade buy buttons
      upEl.querySelectorAll('.upgrade-buy-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          buyUpgrade(btn.getAttribute('data-upgrade'));
        });
      });
    }
  }

  function getAchProgress(ach, b) {
    // Return a rough % for progress bars
    if (ach.id === 'firstTrade') return Math.min(100, (b.tradesCount / 1) * 100);
    if (ach.id === 'tenTrades') return Math.min(100, (b.tradesCount / 10) * 100);
    if (ach.id === 'fiftyTrades') return Math.min(100, (b.tradesCount / 50) * 100);
    if (ach.id === 'hundredTrades') return Math.min(100, (b.tradesCount / 100) * 100);
    if (ach.id === 'diversified') return Math.min(100, (Object.keys(b.portfolio).length / 3) * 100);
    if (ach.id === 'fullyDiversified') return Math.min(100, (Object.keys(b.portfolio).length / 6) * 100);
    if (ach.id === 'profitTaker') return Math.min(100, ((b.biggestSingleProfit || 0) / 100) * 100);
    if (ach.id === 'diamondHands') return Math.min(100, ((b.longestHoldTicks || 0) / 48) * 100);
    if (ach.id === 'buyTheDip') return Math.min(100, ((b.dipBuys || 0) / 5) * 100);
    if (ach.id === 'bigPortfolio') return Math.min(100, (calcPortfolioValue(b) / 5000) * 100);
    if (ach.id === 'whale') return Math.min(100, (calcPortfolioValue(b) / 50000) * 100);
    if (ach.id === 'millionaire') return Math.min(100, ((b.cash + calcPortfolioValue(b)) / 1000000) * 100);
    return 0;
  }

  // Add sentiment badges to renderStocks when upgrade is owned
  var _origRenderStocks = renderStocks;
  renderStocks = function() {
    _origRenderStocks();
    var b = getB();
    if (b.ownedUpgrades && b.ownedUpgrades.sentiment) {
      document.querySelectorAll('.stock-card').forEach(function(card) {
        var tickerEl = card.querySelector('.stock-ticker');
        if (!tickerEl) return;
        var id = tickerEl.textContent.trim();
        var hist = b.priceHistory[id] || [];
        if (hist.length < 3) return;
        var recent = hist.slice(-5);
        var avg = recent.reduce(function(a,b){return a+b;},0) / recent.length;
        var last = recent[recent.length - 1];
        var sentClass = 'sent-flat', sentText = 'FLAT';
        if (last > avg * 1.02) { sentClass = 'sent-bull'; sentText = 'BULL'; }
        else if (last < avg * 0.98) { sentClass = 'sent-bear'; sentText = 'BEAR'; }
        var pill = document.createElement('span');
        pill.className = 'sentiment-pill ' + sentClass;
        pill.textContent = sentText;
        tickerEl.parentNode.insertBefore(pill, tickerEl.nextSibling);
      });
    }
  };

  // Enhance drawMiniChart for trend lines when upgrade is owned
  var _origDrawMiniChart = drawMiniChart;
  drawMiniChart = function(canvas, history, color) {
    _origDrawMiniChart(canvas, history, color);
    var b = getB();
    if (b.ownedUpgrades && b.ownedUpgrades.trendLines && canvas && history && history.length >= 5) {
      var ctx = canvas.getContext('2d');
      var w = canvas.width;
      var h = canvas.height;
      var min = Math.min.apply(null, history);
      var max = Math.max.apply(null, history);
      if (max === min) max = min + 1;
      var range = max - min;
      // Simple moving average (5-period)
      var sma = [];
      for (var i = 0; i < history.length; i++) {
        if (i < 4) { sma.push(null); continue; }
        var sum = 0;
        for (var j = i - 4; j <= i; j++) sum += history[j];
        sma.push(sum / 5);
      }
      ctx.strokeStyle = 'rgba(192,132,252,0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      var started = false;
      sma.forEach(function(v, i) {
        if (v === null) return;
        var x = (i / (history.length - 1)) * w;
        var y = h - ((v - min) / range) * (h * 0.9) - h * 0.05;
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // ===== Render all =====
  // v3.23.138: Limit Orders UI
  function renderLimitOrders() {
    var b = getB();
    var el = document.getElementById('limitOrdersList');
    if (!el) return;
    if (!b.ownedUpgrades || !b.ownedUpgrades.limitOrders) {
      el.innerHTML = '<div style="color:var(--text-dim);font-size:11px;text-align:center;padding:20px;">Purchase the Limit Orders upgrade to unlock this feature.</div>';
      return;
    }
    var html = '';
    // Active limit orders
    if (b.limitOrders && b.limitOrders.length > 0) {
      html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:var(--text-dim);margin-bottom:8px;">ACTIVE LIMIT ORDERS</div>';
      b.limitOrders.forEach(function(order, idx) {
        var curPrice = b.prices[order.assetId] || 0;
        var pctAway = curPrice > 0 ? Math.round(((curPrice - order.targetPrice) / curPrice) * 100) : 0;
        html += '<div style="padding:8px;margin-bottom:6px;background:var(--card-bg);border:1px solid var(--border);border-radius:6px;">';
        html += '<span style="color:var(--green);">BUY ' + order.qty + ' ' + esc(order.assetId) + '</span>';
        html += ' at <span style="color:var(--gold);">$' + fmt(order.targetPrice) + '</span>';
        html += ' <span style="color:var(--text-dim);font-size:10px;">(now $' + fmt(curPrice) + ', ' + pctAway + '% away)</span>';
        html += ' <button class="trade-btn sell cancel-limit-btn" data-idx="' + idx + '" style="float:right;font-size:9px;padding:2px 8px;">CANCEL</button>';
        html += '</div>';
      });
    }
    // New limit order form
    var allAssets = [{label:'Stocks',items:['AAPL','NVEX','MRDN','CSTL','GRNV','QBIT']},{label:'Crypto',items:['BTC','ETH']}];
    html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:var(--text-dim);margin:12px 0 8px;">NEW LIMIT ORDER</div>';
    html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
    html += '<select id="limitAsset" class="trade-input" style="width:auto;padding:4px;">';
    allAssets.forEach(function(group) {
      html += '<optgroup label="' + group.label + '">';
      group.items.forEach(function(id) { html += '<option value="' + id + '">' + id + ' ($' + fmt(b.prices[id] || 0) + ')</option>'; });
      html += '</optgroup>';
    });
    html += '</select>';
    html += '<input id="limitQty" class="trade-input" type="number" min="1" value="1" style="width:50px;" placeholder="Qty">';
    html += '<span style="color:var(--text-dim);font-size:10px;">@</span>';
    html += '<input id="limitPrice" class="trade-input" type="number" min="0.01" step="0.5" style="width:70px;" placeholder="Price">';
    html += '<button id="placeLimitBtn" class="trade-btn buy" style="font-size:9px;padding:4px 10px;">PLACE ORDER</button>';
    html += '</div>';
    el.innerHTML = html;
    // Wire cancel buttons
    el.querySelectorAll('.cancel-limit-btn').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.dataset.idx);
        if (b.limitOrders && idx < b.limitOrders.length) {
          b.limitOrders.splice(idx, 1);
          save(function() { renderLimitOrders(); });
        }
      };
    });
    // Wire place button
    var placeBtn = document.getElementById('placeLimitBtn');
    if (placeBtn) {
      placeBtn.onclick = function() {
        var assetId = document.getElementById('limitAsset').value;
        var qty = parseInt(document.getElementById('limitQty').value) || 1;
        var price = parseFloat(document.getElementById('limitPrice').value);
        if (!price || price <= 0) { showNews('Enter a valid target price.'); return; }
        if (qty < 1) { showNews('Quantity must be at least 1.'); return; }
        b.limitOrders.push({ assetId: assetId, qty: qty, targetPrice: price, placedAt: Date.now() });
        SFX.click();
        showNews('Limit order placed: BUY ' + qty + ' ' + assetId + ' at $' + price.toFixed(2));
        save(function() { renderLimitOrders(); });
      };
    }
  }


  // Wire quantity preset buttons
  function wirePresets() {
    document.querySelectorAll('.qty-preset-btn').forEach(function(btn) {
      btn.onclick = function() {
        var b = getB();
        var row = btn.closest('.trade-row');
        var input = row ? row.querySelector('.trade-input') : null;
        if (!input) return;
        var val = btn.getAttribute('data-val');
        if (val === 'max') {
          var p = parseFloat(btn.getAttribute('data-price')) || 1;
          input.value = Math.max(1, Math.floor(b.cash / p));
        } else {
          input.value = parseInt(val);
        }
        input.dispatchEvent(new Event('input'));
        SFX.click();
      };
    });
  }

  function renderAll() {
    var _scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    var steps = [
      ['WalletBar', renderWalletBar],
      ['Stocks', renderStocks],
      ['Funds', renderFunds],
      ['Bonds', renderBonds],
      ['Limit Orders', renderLimitOrders],
      ['Crypto', renderCrypto],
      ['Portfolio', renderPortfolio],
      ['Upgrades', renderUpgrades]
    ];
    for (var i = 0; i < steps.length; i++) {
      try {
        steps[i][1]();
      } catch(e) {
        console.error('[Brokerage] render' + steps[i][0] + ' crashed:', e);
        document.body.insertAdjacentHTML('afterbegin',
          '<div style="background:#ff4400;color:#fff;padding:8px;font-family:monospace;font-size:11px;z-index:9999;position:relative;">' +
          'CRASH in render' + steps[i][0] + ': ' + e.message +
          '</div>');
      }
    }
    wirePresets();
    requestAnimationFrame(function() { window.scrollTo(0, _scrollY); });
  }

  // ===== Init =====
  try {
    load(function() {
      try {
        renderAll();
        // Remove debug indicator — everything worked
        var jsA = document.getElementById('jsAlive');
        if (jsA) jsA.remove();
      } catch(renderErr) {
        console.error('[Brokerage] renderAll crash:', renderErr);
        document.body.insertAdjacentHTML('afterbegin',
          '<div style="background:#ff0000;color:#fff;padding:12px;font-family:monospace;font-size:12px;z-index:9999;position:fixed;top:0;left:0;right:0;">' +
          'RENDER ERROR: ' + renderErr.message + ' (line ' + (renderErr.stack||'').split('\n')[1] + ')' +
          '</div>');
      }

      // Rotate news every 15 seconds
      setInterval(randomNews, 15000);

      // Tick market every hour while page is open
      setInterval(function() {
        var b = getB();
        tickMarket(b);
        save(function() { renderAll(); });
      }, 60 * 60 * 1000);
    });
  } catch(initErr) {
    console.error('[Brokerage] init crash:', initErr);
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="background:#ff0000;color:#fff;padding:12px;font-family:monospace;font-size:12px;z-index:9999;position:fixed;top:0;left:0;right:0;">' +
      'INIT ERROR: ' + initErr.message +
      '</div>');
  }

  // Wire deposit/withdraw
  document.getElementById('depositBtn').addEventListener('click', deposit);
  document.getElementById('withdrawBtn').addEventListener('click', withdraw);

  // Back button
  document.getElementById('backBtn').addEventListener('click', function() {
    try {
      chrome.tabs.getCurrent(function(tab) {
        if (tab && tab.id) chrome.tabs.remove(tab.id);
      });
    } catch(_) { window.close(); }
  });

})();
