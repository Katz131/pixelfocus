#!/usr/bin/env python3
"""Brokerage UX Overhaul v2 — apply all changes at once, order-aware."""
import sys, re

PROJECT = "/sessions/sweet-lucid-sagan/mnt/Pixel todo lists"
js_path = f"{PROJECT}/brokerage-window.js"

with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

def must_replace(label, old, new):
    global js
    if old not in js:
        print(f"  ERROR: '{label}' anchor not found")
        # Show nearby text for debugging
        key = old[:60].strip()
        idx = js.find(key[:30])
        if idx >= 0:
            print(f"  Partial match at char {idx}")
        sys.exit(1)
    js = js.replace(old, new)
    print(f"  [{label}] OK")

# ═══════════════════════════════════════════
# 1. Fix "COINS" in crypto
# ═══════════════════════════════════════════
must_replace("coins-1", "fmt(coins) + ' COINS (AVG $'", "fmt(coins) + ' HELD (AVG $'")
must_replace("coins-2", "'Number of tokens to buy or sell'", "'Number of tokens to buy or sell'")
must_replace("coins-3", 'Buy crypto coins at the current price', 'Buy crypto at the current price')
must_replace("coins-4", 'Sell coins back to brokerage cash', 'Sell back to brokerage cash')

# ═══════════════════════════════════════════
# 2. Scroll position preservation in renderAll
# ═══════════════════════════════════════════
must_replace("scroll-save",
    "  function renderAll() {\n    var steps = [",
    "  function renderAll() {\n    var _scrollY = window.scrollY || window.pageYOffset || 0;\n    var steps = [")

must_replace("scroll-restore",
    "    }\n    }\n  }",  # end of renderAll loop
    "    }\n    }\n    requestAnimationFrame(function() { window.scrollTo(0, _scrollY); });\n  }")

# ═══════════════════════════════════════════
# 3. Add preset button handler (before renderAll)
# ═══════════════════════════════════════════
preset_handler = """
  // v3.23.159: Global preset & Duolingo effects
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
must_replace("preset-handler",
    "  // ===== Render all =====",
    preset_handler + "  // ===== Render all =====")

# ═══════════════════════════════════════════
# 4. Stock trade rows — add presets
# ═══════════════════════════════════════════
# Build a helper to make preset row HTML
def make_preset_row(id_expr, price_expr, cost_expr, presets, buy_label, buy_attrs, sell_cond, sell_attrs, default_qty="1"):
    return (
        "'<div class=\"trade-row\" style=\"flex-wrap:wrap;gap:6px;\">' +\n"
        "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
        f"            '<input class=\"trade-input\" type=\"number\" min=\"1\" value=\"{default_qty}\" id=\"qty_' + {id_expr} + '\" style=\"width:55px;\">' +\n"
        + "".join(
            f"            '<button class=\"preset-btn\" data-target=\"qty_' + {id_expr} + '\" data-val=\"{v}\" data-price=\"' + {price_expr} + '\" data-cost=\"cost_' + {id_expr} + '\">x{v}</button>' +\n"
            for v in presets
        )
        + f"            '<button class=\"preset-btn max-btn\" data-target=\"qty_' + {id_expr} + '\" data-price=\"' + {price_expr} + '\" data-cost=\"cost_' + {id_expr} + '\">MAX</button>' +\n"
        "          '</div>' +\n"
        "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
        f"            '<button class=\"trade-btn buy brok-btn\" {buy_attrs}>{buy_label}</button>' +\n"
        f"            ({sell_cond} ? '<button class=\"trade-btn sell brok-btn\" {sell_attrs}>SELL</button>' : '') +\n"
        f"            '<span class=\"trade-info\">Cost: $<span id=\"cost_' + {id_expr} + '\">' + {cost_expr} + '</span></span>' +\n"
        "          '</div>' +\n"
        "        '</div>'"
    )

# --- Stocks ---
old_stock = (
    "'<div class=\"trade-row\">' +\n"
    "          (shares > 0 ? '<span class=\"holding-badge\" title=\"Your current position: ' + shares + ' shares at an average purchase price of $' + fmt(holding.avgCost) + ' each\">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +\n"
    "          '<input class=\"trade-input\" type=\"number\" min=\"1\" value=\"1\" id=\"qty_' + s.id + '\" title=\"Number of shares to buy or sell\">' +\n"
    "          '<button class=\"trade-btn buy\" data-id=\"' + s.id + '\" data-type=\"stock\" title=\"Buy shares at the current price using your brokerage cash\">BUY</button>' +\n"
    "          (shares > 0 ? '<button class=\"trade-btn sell\" data-id=\"' + s.id + '\" data-type=\"stock\" title=\"Sell shares at the current market price back to cash\">SELL</button>' : '') +\n"
    "          '<span class=\"trade-info\" title=\"Total cost for the selected quantity\">Cost: $<span id=\"cost_' + s.id + '\">' + fmt(price) + '</span></span>' +\n"
    "        '</div>'"
)

new_stock = (
    "'<div class=\"trade-row\" style=\"flex-wrap:wrap;gap:6px;\">' +\n"
    "          (shares > 0 ? '<span class=\"holding-badge\">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +\n"
    "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
    "            '<input class=\"trade-input\" type=\"number\" min=\"1\" value=\"1\" id=\"qty_' + s.id + '\" style=\"width:55px;\">' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + s.id + '\" data-val=\"1\" data-price=\"' + price + '\" data-cost=\"cost_' + s.id + '\">x1</button>' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + s.id + '\" data-val=\"5\" data-price=\"' + price + '\" data-cost=\"cost_' + s.id + '\">x5</button>' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + s.id + '\" data-val=\"10\" data-price=\"' + price + '\" data-cost=\"cost_' + s.id + '\">x10</button>' +\n"
    "            '<button class=\"preset-btn max-btn\" data-target=\"qty_' + s.id + '\" data-price=\"' + price + '\" data-cost=\"cost_' + s.id + '\">MAX</button>' +\n"
    "          '</div>' +\n"
    "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
    "            '<button class=\"trade-btn buy brok-btn\" data-id=\"' + s.id + '\" data-type=\"stock\">BUY</button>' +\n"
    "            (shares > 0 ? '<button class=\"trade-btn sell brok-btn\" data-id=\"' + s.id + '\" data-type=\"stock\">SELL</button>' : '') +\n"
    "            '<span class=\"trade-info\">Cost: $<span id=\"cost_' + s.id + '\">' + fmt(price) + '</span></span>' +\n"
    "          '</div>' +\n"
    "        '</div>'"
)

must_replace("stock-presets", old_stock, new_stock)

# --- Funds ---
old_fund = (
    "'<div class=\"trade-row\">' +\n"
    "          (shares > 0 ? '<span class=\"holding-badge\" title=\"Your fund position\">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +\n"
    "          '<input class=\"trade-input\" type=\"number\" min=\"1\" value=\"1\" id=\"qty_' + f.id + '\" title=\"Number of fund shares to buy or sell\">' +\n"
    "          '<button class=\"trade-btn buy\" data-id=\"' + f.id + '\" data-type=\"fund\" title=\"Buy fund shares (management fee of ' + (f.fee * 100).toFixed(1) + '% applies)\">BUY</button>' +\n"
    "          (shares > 0 ? '<button class=\"trade-btn sell\" data-id=\"' + f.id + '\" data-type=\"fund\" title=\"Sell fund shares back to cash\">SELL</button>' : '') +\n"
    "          '<span class=\"trade-info\" title=\"Total cost for the selected quantity\">Cost: $<span id=\"cost_' + f.id + '\">' + fmt(price) + '</span></span>' +\n"
    "        '</div>'"
)

new_fund = (
    "'<div class=\"trade-row\" style=\"flex-wrap:wrap;gap:6px;\">' +\n"
    "          (shares > 0 ? '<span class=\"holding-badge\">' + shares + ' SHARES (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +\n"
    "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
    "            '<input class=\"trade-input\" type=\"number\" min=\"1\" value=\"1\" id=\"qty_' + f.id + '\" style=\"width:55px;\">' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + f.id + '\" data-val=\"1\" data-price=\"' + price + '\" data-cost=\"cost_' + f.id + '\">x1</button>' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + f.id + '\" data-val=\"5\" data-price=\"' + price + '\" data-cost=\"cost_' + f.id + '\">x5</button>' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + f.id + '\" data-val=\"10\" data-price=\"' + price + '\" data-cost=\"cost_' + f.id + '\">x10</button>' +\n"
    "            '<button class=\"preset-btn max-btn\" data-target=\"qty_' + f.id + '\" data-price=\"' + price + '\" data-cost=\"cost_' + f.id + '\">MAX</button>' +\n"
    "          '</div>' +\n"
    "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
    "            '<button class=\"trade-btn buy brok-btn\" data-id=\"' + f.id + '\" data-type=\"fund\">BUY</button>' +\n"
    "            (shares > 0 ? '<button class=\"trade-btn sell brok-btn\" data-id=\"' + f.id + '\" data-type=\"fund\">SELL</button>' : '') +\n"
    "            '<span class=\"trade-info\">Cost: $<span id=\"cost_' + f.id + '\">' + fmt(price) + '</span></span>' +\n"
    "          '</div>' +\n"
    "        '</div>'"
)

must_replace("fund-presets", old_fund, new_fund)

# --- Crypto (already has HELD instead of COINS from step 1) ---
old_crypto = (
    "'<div class=\"trade-row\">' +\n"
    "          (coins > 0 ? '<span class=\"holding-badge\" title=\"Your crypto position\">' + fmt(coins) + ' HELD (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +\n"
    "          '<input class=\"trade-input\" type=\"number\" min=\"1\" value=\"10\" id=\"qty_' + c.id + '\" title=\"Number of tokens to buy or sell\">' +\n"
    "          '<button class=\"trade-btn buy\" data-id=\"' + c.id + '\" data-type=\"crypto\" title=\"Buy crypto at the current price\">BUY</button>' +\n"
    "          (coins > 0 ? '<button class=\"trade-btn sell\" data-id=\"' + c.id + '\" data-type=\"crypto\" title=\"Sell back to brokerage cash\">SELL</button>' : '') +\n"
    "          '<span class=\"trade-info\" title=\"Total cost for the selected quantity\">Cost: $<span id=\"cost_' + c.id + '\">' + fmt(10 * price) + '</span></span>' +\n"
    "        '</div>'"
)

new_crypto = (
    "'<div class=\"trade-row\" style=\"flex-wrap:wrap;gap:6px;\">' +\n"
    "          (coins > 0 ? '<span class=\"holding-badge\">' + fmt(coins) + ' HELD (AVG $' + fmt(holding.avgCost) + ')</span>' : '') +\n"
    "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
    "            '<input class=\"trade-input\" type=\"number\" min=\"1\" value=\"10\" id=\"qty_' + c.id + '\" style=\"width:55px;\">' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + c.id + '\" data-val=\"10\" data-price=\"' + price + '\" data-cost=\"cost_' + c.id + '\">x10</button>' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + c.id + '\" data-val=\"50\" data-price=\"' + price + '\" data-cost=\"cost_' + c.id + '\">x50</button>' +\n"
    "            '<button class=\"preset-btn\" data-target=\"qty_' + c.id + '\" data-val=\"100\" data-price=\"' + price + '\" data-cost=\"cost_' + c.id + '\">x100</button>' +\n"
    "            '<button class=\"preset-btn max-btn\" data-target=\"qty_' + c.id + '\" data-price=\"' + price + '\" data-cost=\"cost_' + c.id + '\">MAX</button>' +\n"
    "          '</div>' +\n"
    "          '<div style=\"display:flex;align-items:center;gap:4px;\">' +\n"
    "            '<button class=\"trade-btn buy brok-btn\" data-id=\"' + c.id + '\" data-type=\"crypto\">BUY</button>' +\n"
    "            (coins > 0 ? '<button class=\"trade-btn sell brok-btn\" data-id=\"' + c.id + '\" data-type=\"crypto\">SELL</button>' : '') +\n"
    "            '<span class=\"trade-info\">Cost: $<span id=\"cost_' + c.id + '\">' + fmt(10 * price) + '</span></span>' +\n"
    "          '</div>' +\n"
    "        '</div>'"
)

must_replace("crypto-presets", old_crypto, new_crypto)

# ═══════════════════════════════════════════
# 5. Bonds: buy at top, batch qty, active below
# ═══════════════════════════════════════════
# Replace entire renderBonds function
start_marker = "  function renderBonds() {"
end_marker = "  function renderCrypto() {"
start_idx = js.find(start_marker)
end_idx = js.find(end_marker)
if start_idx < 0 or end_idx < 0:
    print("  ERROR: Could not find renderBonds boundaries")
    sys.exit(1)

new_renderBonds = """  function renderBonds() {
    var b = getB();
    var el = document.getElementById('bondsList');
    el.innerHTML = '';

    // v3.23.159: Buy section FIRST
    var buyTitle = document.createElement('div');
    buyTitle.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:var(--text-dim);margin-bottom:12px;';
    buyTitle.textContent = 'BUY NEW BONDS';
    el.appendChild(buyTitle);

    BONDS.forEach(function(bond) {
      var card = document.createElement('div');
      card.className = 'bond-card';
      card.title = esc(bond.desc);
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
          '<div style="flex:1;min-width:180px;">' +
            '<div class="rate">' + esc(bond.name) + '</div>' +
            '<div style="font-size:10px;color:var(--text-dim);">' + bond.sessions + ' sessions</div>' +
            '<div style="margin-top:4px;font-family:\\'Press Start 2P\\',monospace;font-size:9px;color:var(--green);">YIELD: ' + (bond.rate * 100).toFixed(0) + '%</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
            '<span style="color:var(--text-dim);font-size:9px;">$</span>' +
            '<input class="trade-input" type="number" min="10" value="100" step="50" id="bondAmt_' + bond.id + '" style="width:65px;" title="Amount per bond">' +
            '<span style="color:var(--text-dim);font-size:9px;">x</span>' +
            '<input class="trade-input" type="number" min="1" value="1" id="bondQty_' + bond.id + '" style="width:40px;" title="Number of bonds">' +
            '<button class="preset-btn" data-bondqty="bondQty_' + bond.id + '" data-val="1">x1</button>' +
            '<button class="preset-btn" data-bondqty="bondQty_' + bond.id + '" data-val="5">x5</button>' +
            '<button class="preset-btn" data-bondqty="bondQty_' + bond.id + '" data-val="10">x10</button>' +
            '<button class="trade-btn buy brok-btn buy-bond-btn" data-id="' + bond.id + '">BUY</button>' +
          '</div>' +
        '</div>';
      el.appendChild(card);
    });

    // Wire bond preset buttons
    el.querySelectorAll('.preset-btn[data-bondqty]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        SFX.click();
        var qtyEl = document.getElementById(btn.getAttribute('data-bondqty'));
        if (qtyEl) qtyEl.value = btn.getAttribute('data-val');
      });
    });

    el.querySelectorAll('.buy-bond-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { buyBond(btn.dataset.id); });
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
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
              '<div class="rate">' + esc(bond.name) + '</div>' +
              '<div class="maturity">' + (mature ? 'MATURED!' : progress + '/' + bond.sessionsNeeded + ' sessions (' + pct + '%)') + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<div style="font-family:\\'Press Start 2P\\',monospace;font-size:10px;color:var(--gold);">$' + fmt(bond.amount) + '</div>' +
              '<div style="font-size:10px;color:var(--green);">+$' + fmt(bond.amount * bond.rate) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="height:4px;background:var(--border);border-radius:2px;margin-top:8px;overflow:hidden;">' +
            '<div style="height:100%;background:' + (mature ? 'var(--green)' : 'var(--gold)') + ';width:' + pct + '%;border-radius:2px;"></div>' +
          '</div>' +
          (mature ? '<div style="text-align:center;margin-top:8px;"><button class="trade-btn buy brok-btn collect-bond-btn" data-idx="' + idx + '">COLLECT $' + fmt(bond.amount * (1 + bond.rate)) + '</button></div>' : '');
        el.appendChild(card);
      });

      el.querySelectorAll('.collect-bond-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { collectBond(parseInt(btn.dataset.idx)); });
      });
    }
  }

"""

js = js[:start_idx] + new_renderBonds + js[end_idx:]
print("  [bonds] Rewritten with buy-first + batch qty")

# ═══════════════════════════════════════════
# 6. Update buyBond for batch quantity
# ═══════════════════════════════════════════
old_buybond_amount = "    var amount = parseInt(amtEl ? amtEl.value : 100) || 100;\n    if (amount < 1) return;\n\n    if (b.cash < amount) {"
new_buybond_amount = """    var amount = parseInt(amtEl ? amtEl.value : 100) || 100;
    if (amount < 1) return;
    var qtyEl = document.getElementById('bondQty_' + bondId);
    var qty = parseInt(qtyEl ? qtyEl.value : 1) || 1;
    if (qty < 1) qty = 1;
    var totalCost = amount * qty;

    if (b.cash < totalCost) {"""

must_replace("buybond-qty", old_buybond_amount, new_buybond_amount)

must_replace("buybond-cash",
    "    b.cash -= amount;\n    b.cash = Math.round(b.cash * 100) / 100;\n    b.activeBonds.push({",
    "    b.cash -= totalCost;\n    b.cash = Math.round(b.cash * 100) / 100;\n    for (var _bi = 0; _bi < qty; _bi++) b.activeBonds.push({")

must_replace("buybond-close",
    "    });\n    b.tradesCount++;\n\n    SFX.buy();\n    showNews('Purchased ' + bond.name + ' for $' + fmt(amount) + '. Yield: ' + (bond.rate * 100) + '% on maturity.');",
    "    });\n    b.tradesCount += qty;\n\n    SFX.buy();\n    showNews('Purchased ' + qty + 'x ' + bond.name + ' ($' + fmt(amount) + ' ea). Yield: ' + (bond.rate * 100) + '%.');")

# ═══════════════════════════════════════════
# 7. Portfolio sell buttons
# ═══════════════════════════════════════════
must_replace("portfolio-header",
    "'<th>ASSET</th><th>SHARES</th><th>AVG COST</th><th>PRICE</th><th>VALUE</th><th>P/L</th>'",
    "'<th>ASSET</th><th>SHARES</th><th>AVG COST</th><th>PRICE</th><th>VALUE</th><th>P/L</th><th></th>'")

must_replace("portfolio-row-sell",
    "        '</tr>';",
    "        '<td><button class=\"trade-btn sell brok-btn port-sell\" data-id=\"' + a.id + '\" style=\"font-size:7px;padding:2px 6px;\">SELL ALL</button></td>' +\n        '</tr>';")

# Wire sell buttons
must_replace("portfolio-wire",
    "    el.innerHTML = table;\n\n    // Bonds section",
    """    el.innerHTML = table;

    // v3.23.159: Portfolio sell buttons
    el.querySelectorAll('.port-sell').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-id');
        var b = getB();
        var h = b.portfolio[id];
        if (!h || h.shares < 1) return;
        var price = b.prices[id] || 0;
        var fund = FUNDS.filter(function(f){return f.id===id;})[0];
        if (fund) price = calcFundPrice(fund, b);
        var revenue = h.shares * price;
        var profit = revenue - (h.shares * h.avgCost);
        if (profit > (b.biggestSingleProfit || 0)) b.biggestSingleProfit = profit;
        b.cash += revenue;
        b.cash = Math.round(b.cash * 100) / 100;
        var soldQty = h.shares;
        delete b.portfolio[id];
        b.tradesCount++;
        SFX.sell();
        showNews('Sold ALL ' + soldQty + ' ' + id + ' for $' + fmt(revenue));
        checkAchievements(b);
        save(function() { renderAll(); });
      });
    });

    // Bonds section""")

# ═══════════════════════════════════════════
# 8. CSS in brokerage.html
# ═══════════════════════════════════════════
html_path = f"{PROJECT}/brokerage.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

effect_css = """
  /* v3.23.159: Duolingo button effects + presets */
  .brok-btn, .trade-btn { transition: all 0.15s ease !important; }
  .brok-btn:hover, .trade-btn:hover {
    transform: translateY(-2px) scale(1.04) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    filter: brightness(1.15);
  }
  .brok-btn:active, .trade-btn:active {
    transform: translateY(1px) scale(0.97) !important;
    box-shadow: none !important; filter: brightness(0.9);
    transition-duration: 0.05s !important;
  }
  .preset-btn {
    background: var(--card-bg, #1a1a3a); border: 1px solid var(--border, #2a2a4a);
    color: var(--text-dim, #5a5a7e); font-family: 'Press Start 2P', monospace;
    font-size: 7px; padding: 4px 6px; border-radius: 4px; cursor: pointer;
    transition: all 0.12s ease;
  }
  .preset-btn:hover {
    border-color: var(--gold, #ffd700); color: var(--gold, #ffd700);
    transform: translateY(-1px); box-shadow: 0 2px 6px rgba(255,215,0,0.2);
  }
  .preset-btn:active { transform: translateY(1px); box-shadow: none; }
  .preset-btn.max-btn { color: var(--green, #00ff88); border-color: rgba(0,255,136,0.3); }
  .preset-btn.max-btn:hover { border-color: var(--green); box-shadow: 0 2px 6px rgba(0,255,136,0.2); }
  .collect-bond-btn { animation: bpulse 1.5s ease-in-out infinite; }
  @keyframes bpulse { 0%,100%{box-shadow:0 0 4px rgba(0,255,136,0.3)} 50%{box-shadow:0 0 16px rgba(0,255,136,0.6)} }
"""

if 'preset-btn' not in html:
    html = html.replace('</style>', effect_css + '</style>')
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("  [css] Duolingo effects + presets added to brokerage.html")

# ═══════════════════════════════════════════
# Write & bump version
# ═══════════════════════════════════════════
with open(js_path, "w", encoding="utf-8") as f:
    f.write(js)

mf_path = f"{PROJECT}/manifest.json"
with open(mf_path, "r", encoding="utf-8") as f:
    mf = f.read()
mf = mf.replace('"version": "3.23.155"', '"version": "3.23.159"')
mf = mf.replace('v3.23.155', 'v3.23.159')
with open(mf_path, "w", encoding="utf-8") as f:
    f.write(mf)

print("\n[✓] All brokerage UX changes applied. Version: 3.23.159")
