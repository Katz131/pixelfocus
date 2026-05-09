#!/usr/bin/env python3
"""Remove the word 'coins' from all user-visible text in badges-window.js."""

PROJECT = "/sessions/sweet-lucid-sagan/mnt/Pixel todo lists"
js_path = f"{PROJECT}/badges-window.js"

with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Fix progress labels (the ones we just added)
js = js.replace("lifetimeCoins: 'coins earned'", "lifetimeCoins: '$ earned'")
js = js.replace("currentCoins: 'coins held'", "currentCoins: '$ held'")
js = js.replace("loomSalesCoins: 'coins from sales'", "loomSalesCoins: '$ from sales'")
print("[1] Fixed progress labels")

# 2. Fix badge descriptions that mention "coins"
replacements = [
    ("Five figures of coins from focused work.", "Five figures from focused work."),
    ("A quarter million coins earned through discipline.", "A quarter million earned through discipline."),
    ("Ten million coins earned through sheer discipline.", "Ten million earned through sheer discipline."),
    ("One. Hundred. Million. Coins.", "One. Hundred. Million. Dollars."),
    ("One million coins in your wallet at once.", "One million in your wallet at once."),
    ("Ten million coins held simultaneously.", "Ten million held simultaneously."),
]

for old, new in replacements:
    if old in js:
        js = js.replace(old, new)
        print(f"  Fixed desc: '{old[:40]}...'")
    else:
        print(f"  NOT FOUND: '{old[:40]}...'")

# 3. Also check for any remaining user-visible "coins" in descs
# (Variable names like lifetimeCoins are internal and fine)
import re
desc_coins = re.findall(r"desc:\s*'[^']*coins[^']*'", js, re.IGNORECASE)
if desc_coins:
    print(f"\n[!] Remaining 'coins' in descriptions ({len(desc_coins)}):")
    for d in desc_coins:
        print(f"  {d[:80]}")
else:
    print("\n[✓] No remaining 'coins' in any badge description")

# 4. Bump version comment
js = js.replace("// badges-window.js — v3.23.156", "// badges-window.js — v3.23.157")
print("\n[4] Version comment updated to v3.23.157")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js)

# 5. Bump manifest
mf_path = f"{PROJECT}/manifest.json"
with open(mf_path, "r", encoding="utf-8") as f:
    mf = f.read()
mf = mf.replace('"version": "3.23.156"', '"version": "3.23.157"')
mf = mf.replace('v3.23.156', 'v3.23.157')
with open(mf_path, "w", encoding="utf-8") as f:
    f.write(mf)
print("[5] manifest.json bumped to v3.23.157")

print("\nDone!")
