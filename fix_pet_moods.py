#!/usr/bin/env python3
"""
Fix pet moods:
1. Per-type mood variation — different species react differently to household condition
2. Visible mood reason label under each pet name
"""
import sys

PROJECT = "/sessions/sweet-lucid-sagan/mnt/Pixel todo lists"
js_path = f"{PROJECT}/house-window.js"

with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

# ──────────────────────────────────────────────────────
# 1. Replace CONDITION_TO_PET_MOOD and petMoodFromCondition
#    with per-type mood maps
# ──────────────────────────────────────────────────────

old_block = """  var CONDITION_TO_PET_MOOD = {
    'Settling in.':                                         'happy',
    'Warm. The light is good.':                             'happy',
    'Tidy. The hallway has new flowers.':                   'excited',
    'Quiet. Everyone is where they should be.':             'dancing',
    'Distracted. The kettle has been on twice.':            'working',
    'Watchful. The door is checked after it is already locked.': 'sad',
    'Unwell. A letter was left on the desk, unopened.':     'sad',
    'Drifted. The calendar is three weeks out of date.':    'sleeping'
  };

  function petMoodFromCondition(condition, wb, petType) {
    if (!condition) {
      if (typeof wb === 'number') {
        if (wb >= 80) return 'dancing';
        if (wb >= 70) return 'excited';
        if (wb >= 55) return 'happy';
        if (wb >= 40) return 'working';
        if (wb >= 15) return 'sad';
        return 'sleeping';
      }
      return 'happy';
    }
    return CONDITION_TO_PET_MOOD[condition] || 'happy';
  }"""

new_block = """  // v3.23.158: Per-type mood maps — different species react differently
  // to the same household condition, so pets no longer always match.
  var CONDITION_TO_PET_MOOD_DEFAULT = {
    'Settling in.':                                         'happy',
    'Warm. The light is good.':                             'happy',
    'Tidy. The hallway has new flowers.':                   'excited',
    'Quiet. Everyone is where they should be.':             'dancing',
    'Distracted. The kettle has been on twice.':            'working',
    'Watchful. The door is checked after it is already locked.': 'sad',
    'Unwell. A letter was left on the desk, unopened.':     'sad',
    'Drifted. The calendar is three weeks out of date.':    'sleeping'
  };

  // Per-type overrides — only list conditions where that species differs.
  var PET_MOOD_OVERRIDES = {
    dog: {
      'Watchful. The door is checked after it is already locked.': 'working',
      'Distracted. The kettle has been on twice.':                 'excited',
      'Drifted. The calendar is three weeks out of date.':         'sad'
    },
    cat: {
      'Quiet. Everyone is where they should be.':                  'sleeping',
      'Distracted. The kettle has been on twice.':                 'angry'
    },
    bird: {
      'Watchful. The door is checked after it is already locked.': 'scared',
      'Warm. The light is good.':                                  'dancing'
    },
    bunny: {
      'Watchful. The door is checked after it is already locked.': 'scared',
      'Tidy. The hallway has new flowers.':                        'dancing'
    },
    fish: {
      'Distracted. The kettle has been on twice.':                 'happy',
      'Watchful. The door is checked after it is already locked.': 'working'
    },
    blob: {
      'Drifted. The calendar is three weeks out of date.':         'sick',
      'Tidy. The hallway has new flowers.':                        'happy'
    }
  };

  // Short mood reason labels — what the pet "sees" that drives its mood.
  var PET_MOOD_REASONS = {
    happy:    'Content',
    excited:  'Excited',
    dancing:  'Joyful',
    working:  'Restless',
    sad:      'Unsettled',
    sleeping: 'Withdrawn',
    scared:   'Nervous',
    angry:    'Irritable',
    sick:     'Unwell'
  };

  function petMoodFromCondition(condition, wb, petType) {
    if (!condition) {
      if (typeof wb === 'number') {
        if (wb >= 80) return 'dancing';
        if (wb >= 70) return 'excited';
        if (wb >= 55) return 'happy';
        if (wb >= 40) return 'working';
        if (wb >= 15) return 'sad';
        return 'sleeping';
      }
      return 'happy';
    }
    // Check per-type override first, then fall back to default
    var overrides = PET_MOOD_OVERRIDES[petType];
    if (overrides && overrides[condition]) return overrides[condition];
    return CONDITION_TO_PET_MOOD_DEFAULT[condition] || 'happy';
  }"""

if old_block in js:
    js = js.replace(old_block, new_block)
    print("[1] Replaced mood mapping with per-type variation")
else:
    print("[1] ERROR: Could not find old mood block")
    # Debug
    idx = js.find('CONDITION_TO_PET_MOOD')
    if idx >= 0:
        print(f"  Found CONDITION_TO_PET_MOOD at char {idx}")
        print(repr(js[idx:idx+200]))
    sys.exit(1)

# ──────────────────────────────────────────────────────
# 2. Add visible mood label under pet name in renderPetSprites
# ──────────────────────────────────────────────────────

# After the pet name label, add a mood reason label
old_name_label = """      // Pet name label
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:8px;color:#5a5a7e;margin-top:2px;font-family:monospace;letter-spacing:0.5px;';
      lbl.textContent = petDisplayName(i);"""

new_name_label = """      // Pet name label
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:8px;color:#5a5a7e;margin-top:2px;font-family:monospace;letter-spacing:0.5px;';
      lbl.textContent = petDisplayName(i);

      // Visible mood reason label (v3.23.158)
      var moodColors = {happy:'#00ff88',excited:'#ffd700',dancing:'#ff6b9d',working:'#ffb64c',
        sad:'#6b6bff',sleeping:'#5a5a7e',scared:'#ff6347',angry:'#ff4444',sick:'#9966cc'};
      var moodLbl = document.createElement('div');
      moodLbl.style.cssText = 'font-size:7px;margin-top:1px;font-family:monospace;letter-spacing:0.3px;'
        + 'color:' + (moodColors[spriteMood] || '#5a5a7e') + ';';
      moodLbl.textContent = (PET_MOOD_REASONS[spriteMood] || spriteMood).toUpperCase();"""

if old_name_label in js:
    js = js.replace(old_name_label, new_name_label)
    print("[2a] Added mood reason label creation")
else:
    print("[2a] ERROR: Could not find name label block")
    sys.exit(1)

# Now also append moodLbl to wrap — find where lbl is appended
old_append = """      wrap.appendChild(cv);
      wrap.appendChild(bowlCv);
      wrap.appendChild(lbl);
      row.appendChild(wrap);"""

new_append = """      wrap.appendChild(cv);
      wrap.appendChild(bowlCv);
      wrap.appendChild(lbl);
      wrap.appendChild(moodLbl);
      row.appendChild(wrap);"""

if old_append in js:
    js = js.replace(old_append, new_append)
    print("[2b] Added moodLbl to DOM append chain")
else:
    print("[2b] ERROR: Could not find append block")
    sys.exit(1)

# ──────────────────────────────────────────────────────
# 3. Version bump
# ──────────────────────────────────────────────────────
with open(js_path, "w", encoding="utf-8") as f:
    f.write(js)
print("[3] house-window.js written")

mf_path = f"{PROJECT}/manifest.json"
with open(mf_path, "r", encoding="utf-8") as f:
    mf = f.read()
mf = mf.replace('"version": "3.23.157"', '"version": "3.23.158"')
mf = mf.replace('v3.23.157', 'v3.23.158')
with open(mf_path, "w", encoding="utf-8") as f:
    f.write(mf)
print("[4] manifest.json bumped to v3.23.158")

print("\nDone!")
