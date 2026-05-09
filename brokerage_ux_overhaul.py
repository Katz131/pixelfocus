#!/usr/bin/env python3
"""
Brokerage UX Overhaul — all fixes in one script.
1. Bonds: buy section ABOVE active bonds
2. Quantity presets (x1, x5, x10, MAX) for stocks/funds/crypto
3. Bond batch buying (buy N bonds)
4. Mini-holdings strip on asset card headers
5. Scroll position preservation across renderAll
6. Sell buttons in Portfolio tab
7. Duolingo-style hover/click effects on all brokerage buttons
8. Fix "COINS" word in crypto
"""
import sys

PROJECT = "/sessions/sweet-lucid-sagan/mnt/Pixel todo lists"
js_path = f"{PROJECT}/brokerage-window.js"

with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

changes = 0

# ──────────────────────────────────────────────────────
# 8. Fix "COINS" in crypto rendering
# ──────────────────────────────────────────────────────
js = js.replace("fmt(coins) + ' COINS (AVG $'", "fmt(coins) + ' HELD (AVG $'")
js = js.replace("'Number of coins to buy or sell'", "'Number of tokens to buy or sell'")
js = js.replace("'Buy crypto coins at the current price'", "'Buy crypto at the current price'")
js = js.replace("'Sell coins back to brokerage cash'", "'Sell back to brokerage cash'")
print("[8] Fixed 'COINS' references in crypto")
changes += 1

# ──────────────────────────────────────────────────────
# 5. Scroll position preservation
# ──────────────────────────────────────────────────────
old_renderAll = """  function renderAll() {
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
  }"""

new_renderAll = """  function renderAll() {
    // v3.23.158: Save scroll position before re-rendering
    var scrollY = window.scrollY || window.pageYOffset || 0;
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
    // v3.23.158: Restore scroll position after rendering
    requestAnimationFrame(function() { window.scrollTo(0, scrollY); });
  }"""

if old_renderAll in js:
    js = js.replace(old_renderAll, new_renderAll)
    print("[5] Scroll position preservation added")
    changes += 1
else:
    print("[5] ERROR: Could not find renderAll")
    sys.exit(1)

# ──────────────────────────────────────────────────────
# 2. Quantity presets for stocks
# ──────────────────────────────────────────────────────
# Add preset buttons after each qty input in stock trade rows
# Replace the trade-row innerHTML in renderStocks

old_stock_trade_row = """'<div class="trade-row">' +
          (shares > 0 ? '<span class="holding-badge" title="Your current position: ' + shares + ' shares at an average purchase price of $' + fmt(holding.avgCost) + ' each">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<input class="trade-input" type="number" min="1" value="1" id="qty_' + s.id + '" title="Number of shares to buy or sell">' +
          '<button class="trade-btn buy" data-id="' + s.id + '" data-type="stock" title="Buy shares at the current price using your brokerage cash">BUY</button>' +
          (shares > 0 ? '<button class="trade-btn sell" data-id="' + s.id + '" data-type="stock" title="Sell shares at the current market price back to cash">SELL</button>' : '') +
          '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + s.id + '">' + fmt(price) + '</span></span>' +
        '</div>'"""

new_stock_trade_row = """'<div class="trade-row" style="flex-wrap:wrap;gap:6px;">' +
          (shares > 0 ? '<span class="holding-badge" title="Your current position: ' + shares + ' shares at an average purchase price of $' + fmt(holding.avgCost) + ' each">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<div style="display:flex;align-items:center;gap:4px;">' +
            '<input class="trade-input" type="number" min="1" value="1" id="qty_' + s.id + '" title="Number of shares to buy or sell" style="width:55px;">' +
            '<button class="preset-btn" data-target="qty_' + s.id + '" data-val="1" data-price="' + price + '" data-cost="cost_' + s.id + '">x1</button>' +
            '<button class="preset-btn" data-target="qty_' + s.id + '" data-val="5" data-price="' + price + '" data-cost="cost_' + s.id + '">x5</button>' +
            '<button class="preset-btn" data-target="qty_' + s.id + '" data-val="10" data-price="' + price + '" data-cost="cost_' + s.id + '">x10</button>' +
            '<button class="preset-btn max-btn" data-target="qty_' + s.id + '" data-price="' + price + '" data-cost="cost_' + s.id + '">MAX</button>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:4px;">' +
            '<button class="trade-btn buy brok-btn" data-id="' + s.id + '" data-type="stock" title="Buy shares at the current price using your brokerage cash">BUY</button>' +
            (shares > 0 ? '<button class="trade-btn sell brok-btn" data-id="' + s.id + '" data-type="stock" title="Sell shares at the current market price back to cash">SELL</button>' : '') +
            '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + s.id + '">' + fmt(price) + '</span></span>' +
          '</div>' +
        '</div>'"""

if old_stock_trade_row in js:
    js = js.replace(old_stock_trade_row, new_stock_trade_row)
    print("[2a] Stock quantity presets added")
    changes += 1
else:
    print("[2a] ERROR: Could not find stock trade row")
    sys.exit(1)

# Same for funds
old_fund_trade_row = """'<div class="trade-row">' +
          (shares > 0 ? '<span class="holding-badge" title="Your fund position">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<input class="trade-input" type="number" min="1" value="1" id="qty_' + f.id + '" title="Number of fund shares to buy or sell">' +
          '<button class="trade-btn buy" data-id="' + f.id + '" data-type="fund" title="Buy fund shares (management fee of ' + (f.fee * 100).toFixed(1) + '% applies)">BUY</button>' +
          (shares > 0 ? '<button class="trade-btn sell" data-id="' + f.id + '" data-type="fund" title="Sell fund shares back to cash">SELL</button>' : '') +
          '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + f.id + '">' + fmt(price) + '</span></span>' +
        '</div>'"""

new_fund_trade_row = """'<div class="trade-row" style="flex-wrap:wrap;gap:6px;">' +
          (shares > 0 ? '<span class="holding-badge" title="Your fund position">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<div style="display:flex;align-items:center;gap:4px;">' +
            '<input class="trade-input" type="number" min="1" value="1" id="qty_' + f.id + '" title="Number of fund shares to buy or sell" style="width:55px;">' +
            '<button class="preset-btn" data-target="qty_' + f.id + '" data-val="1" data-price="' + price + '" data-cost="cost_' + f.id + '">x1</button>' +
            '<button class="preset-btn" data-target="qty_' + f.id + '" data-val="5" data-price="' + price + '" data-cost="cost_' + f.id + '">x5</button>' +
            '<button class="preset-btn" data-target="qty_' + f.id + '" data-val="10" data-price="' + price + '" data-cost="cost_' + f.id + '">x10</button>' +
            '<button class="preset-btn max-btn" data-target="qty_' + f.id + '" data-price="' + price + '" data-cost="cost_' + f.id + '">MAX</button>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:4px;">' +
            '<button class="trade-btn buy brok-btn" data-id="' + f.id + '" data-type="fund" title="Buy fund shares (management fee applies)">BUY</button>' +
            (shares > 0 ? '<button class="trade-btn sell brok-btn" data-id="' + f.id + '" data-type="fund" title="Sell fund shares back to cash">SELL</button>' : '') +
            '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + f.id + '">' + fmt(price) + '</span></span>' +
          '</div>' +
        '</div>'"""

if old_fund_trade_row in js:
    js = js.replace(old_fund_trade_row, new_fund_trade_row)
    print("[2b] Fund quantity presets added")
    changes += 1
else:
    print("[2b] ERROR: Could not find fund trade row")
    sys.exit(1)

# Crypto presets
old_crypto_trade_row = """'<div class="trade-row">' +
          (coins > 0 ? '<span class="holding-badge" title="Your crypto position">' + fmt(coins) + ' HELD (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<input class="trade-input" type="number" min="1" value="10" id="qty_' + c.id + '" title="Number of tokens to buy or sell">' +
          '<button class="trade-btn buy" data-id="' + c.id + '" data-type="crypto" title="Buy crypto at the current price">BUY</button>' +
          (coins > 0 ? '<button class="trade-btn sell" data-id="' + c.id + '" data-type="crypto" title="Sell back to brokerage cash">SELL</button>' : '') +
          '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + c.id + '">' + fmt(10 * price) + '</span></span>' +
        '</div>'"""

new_crypto_trade_row = """'<div class="trade-row" style="flex-wrap:wrap;gap:6px;">' +
          (coins > 0 ? '<span class="holding-badge" title="Your crypto position">' + fmt(coins) + ' HELD (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +
          '<div style="display:flex;align-items:center;gap:4px;">' +
            '<input class="trade-input" type="number" min="1" value="10" id="qty_' + c.id + '" title="Number of tokens to buy or sell" style="width:55px;">' +
            '<button class="preset-btn" data-target="qty_' + c.id + '" data-val="10" data-price="' + price + '" data-cost="cost_' + c.id + '">x10</button>' +
            '<button class="preset-btn" data-target="qty_' + c.id + '" data-val="50" data-price="' + price + '" data-cost="cost_' + c.id + '">x50</button>' +
            '<button class="preset-btn" data-target="qty_' + c.id + '" data-val="100" data-price="' + price + '" data-cost="cost_' + c.id + '">x100</button>' +
            '<button class="preset-btn max-btn" data-target="qty_' + c.id + '" data-price="' + price + '" data-cost="cost_' + c.id + '">MAX</button>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:4px;">' +
            '<button class="trade-btn buy brok-btn" data-id="' + c.id + '" data-type="crypto" title="Buy crypto at the current price">BUY</button>' +
            (coins > 0 ? '<button class="trade-btn sell brok-btn" data-id="' + c.id + '" data-type="crypto" title="Sell back to brokerage cash">SELL</button>' : '') +
            '<span class="trade-info" title="Total cost for the selected quantity">Cost: $<span id="cost_' + c.id + '">' + fmt(10 * price) + '</span></span>' +
          '</div>' +
        '</div>'"""

if old_crypto_trade_row in js:
    js = js.replace(old_crypto_trade_row, new_crypto_trade_row)
    print("[2c] Crypto quantity presets added")
    changes += 1
else:
    print("[2c] ERROR: Could not find crypto trade row")
    sys.exit(1)

# Add preset button wiring after each render function's buy/sell wiring
# We'll add a global preset handler after renderAll instead
preset_handler = """
  // v3.23.158: Global preset button handler
  document.addEventListener('click', function(e) {
    var btn = e.target;
    if (!btn.classList.contains('preset-btn')) return;
    SFX.click();
    var targetId = btn.getAttribute('data-target');
    var input = document.getElementById(targetId);
    if (!input) return;
    var price = parseFloat(btn.getAttribute('data-price')) || 1;
    var costId = btn.getAttribute('data-cost');
    var costSpan = document.getElementById(costId);

    if (btn.classList.contains('max-btn')) {
      var b = getB();
      var maxQty = Math.floor(b.cash / price);
      if (maxQty < 1) maxQty = 1;
      input.value = maxQty;
      if (costSpan) costSpan.textContent = fmt(maxQty * price);
    } else {
      var val = parseInt(btn.getAttribute('data-val')) || 1;
      input.value = val;
      if (costSpan) costSpan.textContent = fmt(val * price);
    }
  });

"""

# Insert before the renderAll function
js = js.replace("  function renderAll() {", preset_handler + "  function renderAll() {")
print("[2d] Preset button handler added")
changes += 1

# ──────────────────────────────────────────────────────
# 1. Bonds: buy section ABOVE active bonds
# ──────────────────────────────────────────────────────
# Restructure renderBonds: buy new bonds first, then active bonds below

old_renderBonds = """  function renderBonds() {
    var b = getB();
    var el = document.getElementById('bondsList');
    el.innerHTML = '';

    // Active bonds
    if (b.activeBonds && b.activeBonds.length > 0) {
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
              '<div style="font-family:\\'Press Start 2P\\',monospace;font-size:10px;color:var(--gold);" title="Principal amount invested">$' + fmt(bond.amount) + '</div>' +
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

      var hr = document.createElement('div');
      hr.style.cssText = 'border-bottom:1px solid var(--border);margin:16px 0;';
      el.appendChild(hr);
    }

    // Available bonds to buy
    var buyTitle = document.createElement('div');
    buyTitle.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:var(--text-dim);margin-bottom:12px;';
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
            '<div style="margin-top:4px;font-family:\\'Press Start 2P\\',monospace;font-size:9px;color:var(--green);" title="Guaranteed return percentage when the bond matures">YIELD: ' + (bond.rate * 100).toFixed(0) + '%</div>' +
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
  }"""

new_renderBonds = """  function renderBonds() {
    var b = getB();
    var el = document.getElementById('bondsList');
    el.innerHTML = '';

    // v3.23.158: Buy section FIRST so you don't have to scroll past active bonds
    var buyTitle = document.createElement('div');
    buyTitle.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:var(--text-dim);margin-bottom:12px;';
    buyTitle.textContent = 'BUY NEW BONDS';
    el.appendChild(buyTitle);

    BONDS.forEach(function(bond) {
      var card = document.createElement('div');
      card.className = 'bond-card';
      card.title = esc(bond.desc) + ' Guaranteed ' + (bond.rate * 100).toFixed(0) + '% return after ' + bond.sessions + ' focus sessions.';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
          '<div style="flex:1;min-width:200px;">' +
            '<div class="rate">' + esc(bond.name) + '</div>' +
            '<div class="maturity">' + esc(bond.desc) + '</div>' +
            '<div style="margin-top:4px;font-family:\\'Press Start 2P\\',monospace;font-size:9px;color:var(--green);" title="Guaranteed return percentage when the bond matures">YIELD: ' + (bond.rate * 100).toFixed(0) + '%</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
            '<input class="trade-input" type="number" min="10" value="100" step="50" id="bondAmt_' + bond.id + '" title="Amount per bond" style="width:70px;">' +
            '<span style="color:var(--text-dim);font-size:9px;">x</span>' +
            '<input class="trade-input" type="number" min="1" value="1" id="bondQty_' + bond.id + '" title="Number of bonds to buy" style="width:45px;">' +
            '<button class="preset-btn" onclick="document.getElementById(\\'bondQty_' + bond.id + '\\').value=1">x1</button>' +
            '<button class="preset-btn" onclick="document.getElementById(\\'bondQty_' + bond.id + '\\').value=5">x5</button>' +
            '<button class="preset-btn" onclick="document.getElementById(\\'bondQty_' + bond.id + '\\').value=10">x10</button>' +
            '<button class="trade-btn buy brok-btn buy-bond-btn" data-id="' + bond.id + '" title="Purchase bond(s)">BUY</button>' +
          '</div>' +
        '</div>';
      el.appendChild(card);
    });

    el.querySelectorAll('.buy-bond-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        buyBond(btn.dataset.id);
      });
    });

    // Active bonds below
    if (b.activeBonds && b.activeBonds.length > 0) {
      var hr = document.createElement('div');
      hr.style.cssText = 'border-bottom:1px solid var(--border);margin:16px 0;';
      el.appendChild(hr);

      var activeTitle = document.createElement('div');
      activeTitle.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:var(--accent3);margin-bottom:12px;';
      activeTitle.textContent = 'ACTIVE BONDS (' + b.activeBonds.length + ')';
      el.appendChild(activeTitle);

      b.activeBonds.forEach(function(bond, idx) {
        var progress = Math.min(bond.sessionsElapsed || 0, bond.sessionsNeeded);
        var pct = Math.round((progress / bond.sessionsNeeded) * 100);
        var mature = progress >= bond.sessionsNeeded;
        var card = document.createElement('div');
        card.className = 'bond-card';
        card.title = mature ? 'This bond has matured! Click COLLECT to receive your principal plus interest.' : 'Bond in progress — ' + progress + ' of ' + bond.sessionsNeeded + ' focus sessions completed.';
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
              '<div class="rate">' + esc(bond.name) + '</div>' +
              '<div class="maturity">' + (mature ? 'MATURED — Ready to collect!' : progress + '/' + bond.sessionsNeeded + ' sessions (' + pct + '%)') + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<div style="font-family:\\'Press Start 2P\\',monospace;font-size:10px;color:var(--gold);" title="Principal amount invested">$' + fmt(bond.amount) + '</div>' +
              '<div style="font-size:10px;color:var(--green);" title="Interest earned when the bond matures">+$' + fmt(bond.amount * bond.rate) + ' on maturity</div>' +
            '</div>' +
          '</div>' +
          '<div style="height:4px;background:var(--border);border-radius:2px;margin-top:8px;overflow:hidden;">' +
            '<div style="height:100%;background:' + (mature ? 'var(--green)' : 'var(--gold)') + ';width:' + pct + '%;border-radius:2px;transition:width 0.3s;"></div>' +
          '</div>' +
          (mature ? '<div style="text-align:center;margin-top:8px;"><button class="trade-btn buy brok-btn collect-bond-btn" data-idx="' + idx + '" title="Collect principal plus interest">COLLECT $' + fmt(bond.amount * (1 + bond.rate)) + '</button></div>' : '');
        el.appendChild(card);
      });

      el.querySelectorAll('.collect-bond-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          collectBond(idx);
        });
      });
    }
  }"""

if "// Active bonds\n    if (b.activeBonds" in js and "// Available bonds to buy" in js:
    # Find and replace the entire renderBonds function
    start = js.find("  function renderBonds() {")
    # Find the end — it's followed by renderCrypto
    end = js.find("  function renderCrypto()")
    if start >= 0 and end > start:
        js = js[:start] + new_renderBonds + "\n\n" + js[end:]
        print("[1] Bonds buy section moved above active bonds + batch qty added")
        changes += 1
    else:
        print("[1] ERROR: Could not isolate renderBonds function")
        sys.exit(1)
else:
    print("[1] ERROR: renderBonds anchors not found")
    sys.exit(1)

# Update buyBond to support quantity
old_buyBond = """  function buyBond(bondId) {
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
  }"""

new_buyBond = """  function buyBond(bondId) {
    var b = getB();
    var bond = BONDS.filter(function(bd) { return bd.id === bondId; })[0];
    if (!bond) return;
    var amtEl = document.getElementById('bondAmt_' + bondId);
    var amount = parseInt(amtEl ? amtEl.value : 100) || 100;
    if (amount < 1) return;
    // v3.23.158: Batch bond purchasing
    var qtyEl = document.getElementById('bondQty_' + bondId);
    var qty = parseInt(qtyEl ? qtyEl.value : 1) || 1;
    if (qty < 1) qty = 1;
    var totalCost = amount * qty;

    if (b.cash < totalCost) {
      SFX.lose();
      showNews('Not enough brokerage cash. Need $' + fmt(totalCost) + ', have $' + fmt(b.cash) + '.');
      return;
    }

    b.cash -= totalCost;
    b.cash = Math.round(b.cash * 100) / 100;
    for (var _bi = 0; _bi < qty; _bi++) {
      b.activeBonds.push({
        id: bondId,
        name: bond.name,
        amount: amount,
        rate: bond.rate,
        sessionsNeeded: bond.sessions,
        sessionsElapsed: 0,
        purchasedAt: Date.now()
      });
    }
    b.tradesCount += qty;

    SFX.buy();
    showNews('Purchased ' + qty + 'x ' + bond.name + ' ($' + fmt(amount) + ' each). Yield: ' + (bond.rate * 100) + '%.');
    save(function() { renderAll(); });
  }"""

if old_buyBond in js:
    js = js.replace(old_buyBond, new_buyBond)
    print("[3] Bond batch purchasing added")
    changes += 1
else:
    print("[3] ERROR: Could not find buyBond")
    sys.exit(1)

# ──────────────────────────────────────────────────────
# 6. Sell buttons in Portfolio tab
# ──────────────────────────────────────────────────────
old_portfolio_table_header = """    var table = '<table class="portfolio-table"><thead><tr>' +
      '<th>ASSET</th><th>SHARES</th><th>AVG COST</th><th>PRICE</th><th>VALUE</th><th>P/L</th>' +
      '</tr></thead><tbody>';"""

new_portfolio_table_header = """    var table = '<table class="portfolio-table"><thead><tr>' +
      '<th>ASSET</th><th>SHARES</th><th>AVG COST</th><th>PRICE</th><th>VALUE</th><th>P/L</th><th>TRADE</th>' +
      '</tr></thead><tbody>';"""

if old_portfolio_table_header in js:
    js = js.replace(old_portfolio_table_header, new_portfolio_table_header)
    print("[6a] Portfolio table header updated")
    changes += 1
else:
    print("[6a] ERROR: Could not find portfolio table header")

old_portfolio_row_end = """        '<td style="color:' + (pl >= 0 ? 'var(--green)' : 'var(--red)') + ';">' + (pl >= 0 ? '+' : '') + fmt(pl) + ' (' + fmtPct(plPct) + ')</td>' +
        '</tr>';"""

new_portfolio_row_end = """        '<td style="color:' + (pl >= 0 ? 'var(--green)' : 'var(--red)') + ';">' + (pl >= 0 ? '+' : '') + fmt(pl) + ' (' + fmtPct(plPct) + ')</td>' +
        '<td><button class="trade-btn sell brok-btn port-sell-btn" data-id="' + a.id + '" data-type="' + (CRYPTOS.some(function(c){return c.id===a.id;}) ? 'crypto' : FUNDS.some(function(f){return f.id===a.id;}) ? 'fund' : 'stock') + '" data-max="' + holding.shares + '" style="font-size:8px;padding:3px 8px;">SELL</button></td>' +
        '</tr>';"""

if old_portfolio_row_end in js:
    js = js.replace(old_portfolio_row_end, new_portfolio_row_end)
    print("[6b] Portfolio sell buttons added to rows")
    changes += 1
else:
    print("[6b] ERROR: Could not find portfolio row end")

# Wire portfolio sell buttons — add after el.innerHTML = table;
old_portfolio_inner = "    el.innerHTML = table;\n\n    // Bonds section"
new_portfolio_inner = """    el.innerHTML = table;

    // v3.23.158: Wire portfolio sell buttons
    el.querySelectorAll('.port-sell-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-id');
        var type = btn.getAttribute('data-type');
        var maxShares = parseInt(btn.getAttribute('data-max')) || 1;
        // Sell all shares from portfolio view
        var b = getB();
        var h = b.portfolio[id];
        if (!h || h.shares < 1) return;
        var price = b.prices[id] || 0;
        if (type === 'fund') {
          var fund = FUNDS.filter(function(f){return f.id===id;})[0];
          if (fund) price = calcFundPrice(fund, b);
        }
        var revenue = h.shares * price;
        var saleProfit = revenue - (h.shares * h.avgCost);
        if (saleProfit > (b.biggestSingleProfit || 0)) b.biggestSingleProfit = saleProfit;
        b.cash += revenue;
        b.cash = Math.round(b.cash * 100) / 100;
        var soldQty = h.shares;
        delete b.portfolio[id];
        b.tradesCount++;
        SFX.sell();
        showNews('Sold ALL ' + soldQty + ' ' + id + ' for $' + fmt(revenue) + '.');
        checkAchievements(b);
        save(function() { renderAll(); });
      });
    });

    // Bonds section"""

if old_portfolio_inner in js:
    js = js.replace(old_portfolio_inner, new_portfolio_inner)
    print("[6c] Portfolio sell button wiring added")
    changes += 1
else:
    print("[6c] ERROR: Could not find portfolio innerHTML anchor")

# ──────────────────────────────────────────────────────
# 7. Duolingo-style hover/click effects — add CSS via brokerage.html
# ──────────────────────────────────────────────────────
html_path = f"{PROJECT}/brokerage.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

effect_css = """
  /* v3.23.158: Duolingo-style button effects + preset buttons */
  .brok-btn, .trade-btn {
    transition: all 0.15s ease !important;
    position: relative;
  }
  .brok-btn:hover, .trade-btn:hover {
    transform: translateY(-2px) scale(1.04) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    filter: brightness(1.15);
  }
  .brok-btn:active, .trade-btn:active {
    transform: translateY(1px) scale(0.97) !important;
    box-shadow: none !important;
    filter: brightness(0.9);
    transition-duration: 0.05s !important;
  }
  .preset-btn {
    background: var(--card-bg, #1a1a3a);
    border: 1px solid var(--border, #2a2a4a);
    color: var(--text-dim, #5a5a7e);
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .preset-btn:hover {
    border-color: var(--gold, #ffd700);
    color: var(--gold, #ffd700);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(255,215,0,0.2);
  }
  .preset-btn:active {
    transform: translateY(1px);
    box-shadow: none;
  }
  .preset-btn.max-btn {
    color: var(--green, #00ff88);
    border-color: rgba(0,255,136,0.3);
  }
  .preset-btn.max-btn:hover {
    border-color: var(--green, #00ff88);
    color: var(--green, #00ff88);
    box-shadow: 0 2px 6px rgba(0,255,136,0.2);
  }
  .collect-bond-btn {
    animation: bond-pulse 1.5s ease-in-out infinite;
  }
  @keyframes bond-pulse {
    0%, 100% { box-shadow: 0 0 4px rgba(0,255,136,0.3); }
    50% { box-shadow: 0 0 16px rgba(0,255,136,0.6); }
  }
"""

if 'preset-btn' not in html:
    html = html.replace('</style>', effect_css + '</style>')
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("[7] Duolingo-style effects + preset CSS added to brokerage.html")
    changes += 1
else:
    print("[7] CSS already present")

# ──────────────────────────────────────────────────────
# Write JS and bump version
# ──────────────────────────────────────────────────────
with open(js_path, "w", encoding="utf-8") as f:
    f.write(js)
print(f"\n[✓] brokerage-window.js written ({changes} changes applied)")

# Bump manifest
mf_path = f"{PROJECT}/manifest.json"
with open(mf_path, "r", encoding="utf-8") as f:
    mf = f.read()
mf = mf.replace('"version": "3.23.158"', '"version": "3.23.159"')
mf = mf.replace('v3.23.158', 'v3.23.159')
with open(mf_path, "w", encoding="utf-8") as f:
    f.write(mf)
print("[✓] manifest.json bumped to v3.23.159")

print("\nDone! All brokerage UX fixes applied.")
