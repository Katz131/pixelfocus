#!/bin/bash
# =============================================================================
# verify.sh — Automated self-test suite for Todo of the Loom
# Run after EVERY change. Claude should never ship without this passing.
# =============================================================================

DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0
WARN=0

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ FAIL: $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠ WARN: $1"; WARN=$((WARN+1)); }

echo "========================================"
echo "  TODO OF THE LOOM — VERIFICATION SUITE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# ─── 1. VERSION CONSISTENCY ───
echo ""
echo "── 1. Version Consistency ──"

V_MANIFEST=$(python3 -c "import json; print(json.load(open('$DIR/manifest.json'))['version'])")
V_FACTORY=$(grep -oP 'v3\.23\.\d+' "$DIR/factory.html" | grep -v '294' | head -1 | sed 's/^v//')
V_FONTS=$(head -1 "$DIR/fonts.css" | grep -oP 'v3\.23\.\d+' | sed 's/^v//')
V_APPJS=$(head -30 "$DIR/app.js" | grep -oP 'v3\.23\.\d+' | head -1 | sed 's/^v//')

echo "  manifest.json: $V_MANIFEST"
echo "  factory.html:  $V_FACTORY"
echo "  fonts.css:     $V_FONTS"
echo "  app.js:        $V_APPJS"

if [ "$V_MANIFEST" = "$V_FACTORY" ] && [ "$V_MANIFEST" = "$V_FONTS" ] && [ "$V_MANIFEST" = "$V_APPJS" ]; then
  pass "All 4 files show v$V_MANIFEST"
else
  fail "Version mismatch! manifest=$V_MANIFEST factory=$V_FACTORY fonts=$V_FONTS app=$V_APPJS"
fi

# Check factory.html line 34 CSS comment still has v3.23.294
if grep -q 'v3\.23\.294' "$DIR/factory.html"; then
  pass "Factory CSS comment still has v3.23.294 (correct — never update this)"
else
  warn "Factory CSS comment v3.23.294 missing — may have been accidentally overwritten"
fi

# ─── 2. SYNTAX CHECK — ALL JS FILES ───
echo ""
echo "── 2. JavaScript Syntax ──"

JS_FAIL=0
while IFS= read -r -d '' f; do
  fname=$(basename "$f")
  result=$(node -c "$f" 2>&1)
  if [ $? -eq 0 ]; then
    pass "$fname"
  else
    fail "$fname — $(echo "$result" | head -3)"
    JS_FAIL=$((JS_FAIL+1))
  fi
done < <(find "$DIR" -maxdepth 1 -name "*.js" -type f -print0 | sort -z)

if [ $JS_FAIL -eq 0 ]; then
  echo "  All JS files pass syntax check."
fi

# ─── 3. CRITICAL STRUCTURE CHECKS ───
echo ""
echo "── 3. Critical Structure ──"

APP_LINES=$(wc -l < "$DIR/app.js")
if [ "$APP_LINES" -gt 20000 ]; then
  pass "app.js is $APP_LINES lines (not truncated)"
else
  fail "app.js is only $APP_LINES lines — LIKELY TRUNCATED (expected 20000+)"
fi

if head -6 "$DIR/app.js" | grep -q 'BUMP manifest.json'; then
  pass "app.js starts with version bump warning"
else
  fail "app.js is missing the version bump warning header"
fi

if grep -q "catch(_appErr)" "$DIR/app.js"; then
  pass "app.js has outer try/catch IIFE wrapper"
else
  fail "app.js missing outer try/catch — extension will crash silently on errors"
fi

if grep -q "default_popup" "$DIR/manifest.json"; then
  fail "manifest.json has default_popup — THIS BREAKS THE EXTENSION"
else
  pass "No default_popup in manifest.json"
fi

# ─── 4. SCRIPT TAGS IN popup.html ───
echo ""
echo "── 4. Script Tags in popup.html ──"

for s in app.js app-main.js firebase-sync.js market-engine.js market-events.js events.js events-catalog.js events-modal.js tutorial-data.js tutorial-ui.js morse-messenger.js sounds.js btn-sounds.js tooltip.js; do
  if grep -q "src=\"$s\"" "$DIR/popup.html"; then
    pass "popup.html loads $s"
  else
    fail "popup.html MISSING script tag for $s"
  fi
done

# ─── 5. CRITICAL FUNCTIONS IN app.js ───
echo ""
echo "── 5. Critical Functions in app.js ──"

for fn in "function startTimer" "function resetTimer" "function earnBlock" "function awardSessionReward" "function save" "function load" "function checkDayRollover" "function generateDailyQuests" "function renderQuestUI" "function isGameLocked"; do
  if grep -q "$fn" "$DIR/app.js"; then
    pass "Found: $fn()"
  else
    fail "MISSING: $fn() — core functionality broken"
  fi
done

# ─── 6. DEFAULT_STATE FIELD COVERAGE ───
echo ""
echo "── 6. DEFAULT_STATE Sanity ──"

for field in timerState timerRemaining coins xp streak tasks projects badges focusHistory sessionArchive autoloomLevel employeesLevel profileId; do
  if grep -q "$field" "$DIR/app.js"; then
    pass "State field: $field"
  else
    fail "MISSING state field: $field"
  fi
done

# ─── 7. BACKGROUND.JS CHECKS ───
echo ""
echo "── 7. Background.js ──"

BG_LINES=$(wc -l < "$DIR/background.js")
if [ "$BG_LINES" -gt 500 ]; then
  pass "background.js is $BG_LINES lines (not truncated)"
else
  fail "background.js is only $BG_LINES lines — possibly truncated"
fi

if grep -q "_safeSaveState" "$DIR/background.js"; then
  pass "background.js has _safeSaveState guard"
else
  warn "background.js missing _safeSaveState guard"
fi

if grep -q "pf-open" "$DIR/background.js"; then
  pass "background.js handles pf-open messages"
else
  fail "background.js missing pf-open handler"
fi

# ─── 8. CSP COMPLIANCE ───
echo ""
echo "── 8. CSP Compliance ──"

CSP_VIOLATIONS=0
while IFS= read -r -d '' hf; do
  hname=$(basename "$hf")
  if grep -qP 'onclick="' "$hf"; then
    fail "$hname has inline onclick= (blocked by CSP)"
    CSP_VIOLATIONS=$((CSP_VIOLATIONS+1))
  fi
done < <(find "$DIR" -maxdepth 1 -name "*.html" -type f -print0)

if [ $CSP_VIOLATIONS -eq 0 ]; then
  pass "No inline onclick= found in HTML files"
fi

# ─── 9. FILE SIZE SANITY ───
echo ""
echo "── 9. File Size Sanity ──"

check_size() {
  local file="$1" min="$2" label="$3"
  if [ -f "$DIR/$file" ]; then
    local size=$(wc -c < "$DIR/$file")
    if [ "$size" -gt "$min" ]; then
      local human=$(python3 -c "s=$size; u='B'; [(s:=s/1024, u:=x) for x in ['KB','MB'] if s>1024]; print(f'{s:.0f}{u}')" 2>/dev/null || echo "${size}B")
      pass "$label: $human"
    else
      fail "$label is only ${size}B — likely truncated or empty (min: ${min}B)"
    fi
  else
    fail "$label: FILE NOT FOUND"
  fi
}

check_size "app.js" 500000 "app.js"
check_size "popup.html" 50000 "popup.html"
check_size "background.js" 15000 "background.js"
check_size "factory.js" 10000 "factory.js"
check_size "factory.html" 10000 "factory.html"
check_size "gallery.js" 5000 "gallery.js"
check_size "house-window.js" 10000 "house-window.js"
check_size "brokerage-window.js" 5000 "brokerage-window.js"

# ─── SUMMARY ───
echo ""
echo "========================================"
echo "  RESULTS: $PASS passed, $FAIL failed, $WARN warnings"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo "  *** FAILURES DETECTED — DO NOT SHIP ***"
  exit 1
else
  if [ $WARN -gt 0 ]; then
    echo "  Warnings present but no failures. Review warnings above."
  else
    echo "  ALL CLEAR — safe to ship."
  fi
  exit 0
fi
