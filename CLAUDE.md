# Todo of the Loom — Claude Handoff Document

**Current version:** 3.23.416
**Last updated:** 2026-05-23

---

## MANDATORY RULES (Read These First)

### 1. Version Bump on EVERY Change
ANY change to ANY file = bump the patch version in `manifest.json`.
No exceptions. No judgment calls about whether the change is "too small."

How: increment the last number in `"version": "3.23.XXX"` and update the `description` field to match.

**Version bump is required in ALL 4 files:** `manifest.json`, `factory.html` (badge), `fonts.css` (header comment), and `app.js` (first occurrence in header comment).

**5 REASONS THIS WILL NEVER BE FORGOTTEN AGAIN:**

1. **BUMP FIRST, NOT LAST.** The version bump is the FIRST action after deciding to make a change — before writing any code. Not "I'll bump at the end." Bump immediately, then code.

2. **Every bash/python edit block MUST end with a version check.** After any edit to any file, the final command must include: `grep '"version"' manifest.json` to visually confirm the version number is current. If it still shows the old number, the edit block is incomplete.

3. **The user cannot test without a version bump.** Chrome caches the old manifest. If the version doesn't change, Chrome may serve stale files. A missing bump doesn't just break protocol — it breaks the user's ability to verify the fix worked.

4. **Debug-only changes STILL require a bump.** Adding console.log? Bump. Changing a label? Bump. Fixing a typo? Bump. There is no category of change small enough to skip. The version number is how the user knows they're running new code.

5. **If you realize you forgot mid-task, STOP and bump before continuing.** Don't finish the current edit first. Don't say "I'll do it at the end." Stop. Bump. Then resume. The bump cannot be deferred.

### 2. Always Update the Task/Progress List
Every task worked on MUST be tracked via TaskCreate/TaskUpdate.
- Create a task BEFORE starting work
- Mark `in_progress` when actively working
- Mark `completed` when done (include version number)
- Never leave a task stuck in `in_progress` after finishing

Why: the user relies on the progress list as the single source of truth. Context compaction loses details, but the task list persists across sessions.

### 3. The User Does NOT Code
NEVER ask the user to run commands, paste code, use a terminal, or do anything technical. If something needs to be run or deployed, Claude must do it directly or provide a one-click solution (like a .bat file). This is non-negotiable.

ALWAYS give click-by-click instructions with exact file/folder locations. Assume zero technical knowledge.

### 4. Content Rules
- Do NOT try to identify or remove "whimsical" content
- Only rewrite: (a) overt horror tells, (b) meta real-world references, (c) user-flagged strings
- Do NOT proactively edit bureauLevel or incineratorLevel descriptions

### 5. Communication
- Always tell the user the new version number when bumping
- The user often relays instructions to Giulia (who cannot code) — keep ELI5 instructions simple and copy-paste ready
- User prefers military/24-hour time
- When giving numbered steps, format as a proper numbered list so the user can copy-paste it


### 6. Bridge Protocol with CK Buddy
Read **`BRIDGE.md`** in this folder BEFORE touching any CK Buddy integration code. It documents the cross-extension messaging protocol, reward thresholds, celebration overlay, and known pitfalls (like the race condition between background.js storage writes and popup's in-memory state).

If you modify ANY bridge-related code (`CKRB_*` handlers in background.js or app.js, `showCkBuddyCelebration()`, reward thresholds, `externally_connectable`, etc.), you MUST:

1. Update `BRIDGE.md` in THIS folder
2. Copy the updated `BRIDGE.md` to the CK Buddy project folder
3. Note the change in the changelog table at the bottom of BRIDGE.md

---

## ARCHITECTURE OVERVIEW

### What This Is
A Chrome Extension (Manifest V3) — a gamified Pomodoro/to-do tracker themed as a textile dystopia. The user earns textiles by completing focus sessions, spends them on pixel art, and progresses through a satirical corporate upgrade tree.

### CRITICAL: This Is NOT a Chrome Popup
`popup.html` is a full browser tab opened via `chrome.tabs.create()`. **Never** add `default_popup` to manifest.json. **Never** use `chrome.action.setPopup()`. This has been corrected multiple times. The comment at line 1 of app.js repeats it three times in all caps.

### No Build Step
All source files ship directly — no bundler, no npm, no webpack. The extension talks to Firestore via direct REST API calls (no Firebase SDK).

### State Storage
All state lives in `chrome.storage.local` under key `pixelFocusState`. Every page reads/writes this same key. `chrome.storage.onChanged` listeners sync state across open tabs. There is no backend database for user data — everything is local to the browser.

**VERSION BUMP VERIFICATION TEMPLATE** — paste this at the end of every bash edit block:
```bash
echo "=== VERSION CHECK ==="
grep '"version"' manifest.json
grep -m1 'v3.23' factory.html | grep -o 'v3\.[0-9.]*'
head -1 fonts.css | grep -o 'v3\.[0-9.]*'
echo "=== ALL 4 FILES MUST SHOW SAME VERSION ==="
```

---

## FILE INVENTORY

### Core Files (Main Popup)
| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) — permissions, icons, service worker |
| `popup.html` | Main UI (full tab, NOT a popup) — timer, tasks, quests, friends, market |
| `app.js` | ~18,000 lines. ALL main logic: state, timer, economy, quests, challenges, etc. Single IIFE |
| `app-main.js` | Thin entry point that loads after app.js |
| `popup-dispatch.js` | Cosmetic — fires one apologetic memo from "The Computer" per visit |
| `background.js` | Service worker — toolbar icon handler, alarm scheduling, nag/penalty window management |

### Game Sub-Pages (Each Opens as a Full Tab)
| Page | Companion JS | Purpose |
|------|-------------|---------|
| `factory.html` | `factory.js`, `factory-dispatch.js` | Upgrade tree (autoloom, marketing, dye, QC, employees) |
| `gallery.html` | `gallery.js`, `gallery-dispatch.js` | Pixel art canvas, color shop, saved artworks |
| `house.html` | `house.js`, `house-window.js`, `house-dispatch.js` | Domestic status screen (pets, spouse, events) |
| `brokerage.html` | `brokerage-window.js` | Investment market (stocks, bonds, funds, crypto) |
| `research.html` | `research.js`, `research-window.js` | Research lab (experiments on employees) |
| `incinerator.html` | `incinerator.js`, `incinerator-window.js` | Late-game dark mechanic (burn employees for fuel) |
| `ratiocinatory.html` | `ratiocinatory.js`, `ratiocinatory-dispatch.js` | Bureaucratic annex (aspects, patsies, institutions) |
| `timeline.html` | `timeline-window.js` | Event history + focus session timeline |
| `badges.html` | `badges-window.js` | 120+ badges across 7 categories |
| `challenge.html` | `challenge-window.js` | Idle-challenge pop-out (1.5x reward gamble) |
| `pet-sprites.html` | `pet-sprites-window.js` | Dev tool — pixel art sprite painter |

### Pop-Out Windows (Opened by background.js)
| Page | Companion JS | Purpose |
|------|-------------|---------|
| `surveillance-nag.html` | `surveillance-nag-window.js` | Confrontational nag after ignored surveillance prompts |
| `bedtime-reminder.html` | `bedtime-window.js` | Bedtime checklist with streak tracking |
| `morning-checkin.html` | `morning-checkin-window.js` | "Did you go to bed on time?" check-in |
| `block-alert.html` | (inline script) | Blocked-time alert countdown |
| `promise-timer.html` | `promise-timer.js` | 3-min countdown after promising to focus ($300 penalty) |
| `penalty-timer.html` | `penalty-timer.js` | 3-min countdown after refusing nag ($300 penalty) |
| `morse-preview.html` | (dev preview) | Morse code composer test page |

### Shared Libraries
| File | Purpose |
|------|---------|
| `firebase-sync.js` | `window.ProfileSync` — Firestore REST API for profiles/friends |
| `market-engine.js` | `window.MarketEngine` — pure math, computes `marketYieldMultiplier` |
| `market-events.js` | `window.MarketEvents` — milestone event data for market progression |
| `events.js` | `window.Events` — narrative event trigger engine |
| `events-catalog.js` | `window.EVENT_CATALOG` — all event definitions (pure data) |
| `events-modal.js` | `window.EventsModal` — dark overlay for event announcements |
| `tutorial-data.js` | `window.TUTORIAL_CATEGORIES` — feature encyclopedia data |
| `tutorial-ui.js` | Spotlight click-through tutorial engine (loaded on every page) |
| `lockout-guard.js` | Redirects to popup.html if no grace period (loaded on all game pages) |
| `morse-messenger.js` | `window.MorseMessenger` — binary-tree morse code UI |
| `sounds.js` | `const SFX` — Web Audio API tone presets |
| `btn-sounds.js` | Global hover/click sound effects for all buttons on all pages |
| `tooltip.js` | Custom tooltip engine (migrates `title=` to `data-tip=`) |
| `tips.js` | Older floating tooltip implementation |
| `msglog.js` | `window.MsgLog` — Paperclips-style scrolling message console |
| `personnel.js` | `window.Personnel` — employee roster management |
| `patsy-names.js` | `window.PatsyNames` — name pools for Ratiocinatory patsies |
| `stage-entries.js` | `window.STAGE_ENTRIES` — unlockable lore briefs/memos |
| `fonts.css` | `@font-face` for 'Press Start 2P' (local only, CSP workaround) |

### Deployment / Config Files
| File | Purpose |
|------|---------|
| `release.bat` | One-click release: git add/commit/tag/push → triggers GitHub Actions |
| `update.bat` | One-click update for Giulia: downloads latest zip from GitHub |
| `deploy-website.bat` | One-click Firebase Hosting deploy (calls PowerShell script) |
| `bump-version.bat` | Updates version in 5 files (manifest, app.js, popup.html, factory.html, fonts.css) |
| `package-extension.bat` | Creates distributable zip |
| `firebase.json` | Firebase config (Firestore rules + hosting) |
| `todo-of-the-loom-firebase-adminsdk-fbsvc-b2d375f258.json` | Service account key (local secret, not in Git) |
| `.github/workflows/release.yml` | CI/CD: tag push → build zip → publish GitHub Release |

---

## DEPLOYMENT

### Extension Updates
User double-clicks `release.bat`. That's it. It commits, tags, pushes, and GitHub Actions builds the zip.

### Firebase Hosting Updates
User double-clicks `deploy-website.bat`. Requires the service account key JSON file in the project root.

### Giulia's Updates
Giulia double-clicks `update.bat` which downloads the latest main branch zip from GitHub.

### Chrome Web Store
Not currently used. Extension ID: `jlfiokfngdjebicfaagoeiciihbfeeil`

### GitHub
Repo: `https://github.com/Katz131/pixelfocus`

### IMPORTANT: release.yml Staging List
The GitHub Actions workflow has a **hardcoded list of ~60 files** to include in the release zip. When new source files are added to the project, they MUST be manually added to this list in `.github/workflows/release.yml` or they'll be silently excluded (a warning is emitted but the build succeeds anyway).

---

## MAJOR SYSTEMS

### Focus Timer
**Key functions:** `startTimer()`, `_actuallyStartTimer()`, `beginActualSession()`, `_resumeFromPaused()`, `resetTimer()`, `armTimerTick()`, `cancelPreStartCountdown()`

Flow: START → 15-second "GET READY" countdown (`COUNTDOWN_SECONDS = 15`) → running → completed → confirmation modal (YES/NO) → `awardSessionReward()`.

`state.timerEndsAt` is the wall-clock anchor (epoch ms). The tick reads `Date.now() < timerEndsAt` rather than decrementing `timerRemaining`, defeating Chrome's background tab throttling. `timerRemaining` is display/save only.

Timer states: `idle` → `countdown` → `running` ↔ `paused` → `completed` → `idle`

Session durations: 10/20/30/60/90 minutes (600/1200/1800/3600/5400 seconds)

PiP pop-out timer mirrors the main timer via `renderPopOutTimer()`. Uses Document Picture-in-Picture API (Chrome 116+). The PiP button handles: running (pause), paused (resume), and countdown (cancel). It does NOT start new sessions — that must be done from the main popup.

### Earn Block / Session Rewards
**Key functions:** `getSessionReward(sec)`, `earnBlock()`, `awardSessionReward()`

Rewards per session length:
- 10 min: 1 textile, 0 bonus
- 20 min: 2 textiles, 0 bonus
- 30 min: 3 textiles, 1 bonus
- 60 min: 6 textiles, 3 bonus
- 90 min: 9 textiles, 5 bonus

`earnBlock()` fires once per 10-min block. It: increments combo, awards XP, awards 1 textile (+ QC roll + AI Loom roll + multipliers), drains resource pools, ticks bond sessions, awards combo coins (only at combo >= 2).

### Combo System
`COMBO_TIMEOUT_MS = 20 * 60 * 1000` (20 minutes between sessions). `COMBO_COIN_PAYOUTS = [0, 0, 15, 40, 90, 200]`.

`comboSessions` tracks per-session combo count (for quests). `combo` tracks per-block (for money payouts). Both reset on day rollover and combo timeout.

Marketing multiplier (L1-L5: 1.25/1.6/2.0/2.5/3.0x) applies to combo coin payouts.

### Economy (Coins/Dollars)
State field is `coins` but UI shows `$` / "dollars." (Renaming task #301 is in progress.)

Three coin sources:
1. **Combo burst** — only at combo >= 2; uses `COMBO_COIN_PAYOUTS`
2. **Daily marathon** — one-time thresholds at 60/120/180/240/360/480 minutes → $50/$150/$300/$500/$1000/$2000
3. **Streak trickle** — requires `employeesLevel >= 1`; rates [0, 0.02, 0.05, 0.12, 0.26, 0.55] $/min

Passive income gate: `PASSIVE_INCOME_WINDOW_MS = 5 hours`. No completed session in 5h = streak trickle, end-of-day lump, and Ratiocinatory income all pause.

Payroll: [0, 5, 18, 50, 150, 400] per day at employees L0-L5.

### Game Lockout / Grace Period
**Functions:** `isGameLocked()`, `getGameLockReason()`, `renderGameLockout()`

Locked when: (a) uncompleted priority tasks exist, (b) timer is running/countdown, OR (c) idle (requires completing a session to unlock).

Grace period: 5 minutes after clicking YES on session confirmation. Stored in BOTH module-scope `_gameLockGraceUntil` AND `state.gameLockGraceUntil` (persisted). Grace bypasses ALL lockout including priorities.

**Profile page is ALWAYS accessible — never locked.**

### Day Rollover
**Function:** `checkDayRollover()` — called on load.

If `lastActiveDate !== todayStr()`:
1. Updates streaks (Owl + Real)
2. Auto-saves canvas to gallery
3. Awards end-of-day bonus (formula: `mins * $0.5 * (1 + streak * 0.15)`, capped at 600 mins, requires 60+ mins)
4. Deducts daily payroll
5. Archives `dailySessionLog` into `focusHistory` and `sessionArchive`
6. Resets daily counters (todayBlocks, todayXP, combo, marathonBonuses, etc.)
7. Generates daily quests

**CRITICAL:** `todayStr()` uses LOCAL date, NOT UTC. `toISOString()` is banned here.

### Daily Quests
**Functions:** `generateDailyQuests()`, `_getQuestCurrent()`, `checkQuestCompletion()`, `renderQuestUI()`

Two quests generated daily (Steady + Ambitious) from `QUEST_POOL`. Player picks one. Progress tracked via `_getQuestCurrent()` reading state fields by quest type. Tile-grid UI (Duolingo style). Quest rewards: coins + sometimes `questDoubleTextile = true`.

### Friend Challenges
Challenge types: `focus_minutes` (canonical). `focus_marathon` is deprecated/auto-migrated on load.

Invites persisted in `pendingChallengeInvites` (survive popup close). Synced via Firestore social data. Buttons use `data-` attributes + delegated listeners (not inline `onclick` — CSP blocks those).

### Distractions Tracker
Per-session distraction counts in `sessionDistractions`. Penalty is a percentage deducted from money earnings. Zero distractions = +15% focus bonus (`FOCUS_BONUS_PCT = 15`). Integrated into PiP timer (hamburger menu) and celebration modal.

### Double-Down System
Mid-session gamble. Options: 10/20/30/60/90 extra minutes. One-shot per session. On YES completion: 1.5x bonus on extension portion. On NO/fail: -50% of all session earnings. `DOUBLE_DOWN_BONUS_MULT = 1.5`.

### Surveillance Nag
Three tiers: `passive`, `surveillance`, `sentinel`. Background alarm fires at `surveillanceNagInterval` (default 5 min). After 3 ignored nags → pop-out window. YES → promise-timer (3 min to start a session or $300 penalty). 3rd consecutive NO → penalty-timer.

Nag must NOT fire if timer is actively running.

### Badges
120+ badges across 7 categories (sleep, focus, social, mastery, quests, creative, business). Badge checks happen in `awardSessionReward()` and on milestone events. Badge IDs are strings.

### Pets / Tamagotchi
Species per slot in `housePetTypes`. Fullness drains 50/day. Feed cost: $50 (`PET_FOOD_COST`). Pet mood affects sprite state displayed in house-window.js.

### Market / Brokerage
`market-engine.js` computes `marketYieldMultiplier` per tick. Applied in `earnBlock()` to combo coin payout. `brokerage-window.js` handles stocks/bonds/funds/crypto trading UI.

### Morse Code
Binary-tree key input (left=dot, right=dash). DAH threshold 200ms, letter lock 1000ms, word gap 2000ms. Inbox, sent box, and famous messages tracking.

### Tutorial System
Spotlight click-through engine in `tutorial-ui.js`. Data in `tutorial-data.js`. Loaded on every page. Tiers 0-1 free, 2-5 require HMAC codes. `?tutorial=1` URL param for tutorial-only mode. `lockout-guard.js` bypass when tutorial active.

### Resource Depletion
5 pools: frames, gears, dye, water, silica. Each drains per textile produced. Penalty curve from 1.0x (healthy) down to 0.5x (empty). Supply Chain substitute upgrades floor the effective percentage (L0-L5: 0/20/40/60/80/100%).

### Narrative Events
`events.js` + `events-catalog.js`. Trigger-driven events with eligibility checks, consequences, cooldowns. Multi-day cadence. Events can suspend upgrades, award/deduct coins, flip flags.

---

## KEY CONSTANTS

| Constant | Value | Notes |
|----------|-------|-------|
| `COMBO_TIMEOUT_MS` | 20 min (1,200,000 ms) | Comment says "15 min" — that's WRONG, actual is 20 |
| `COUNTDOWN_SECONDS` | 15 | Pre-start "GET READY" countdown |
| `COMBO_COIN_PAYOUTS` | [0, 0, 15, 40, 90, 200] | Index = combo count |
| `BASE_XP_PER_BLOCK` | 10 | XP per 10-min block |
| `FOCUS_BONUS_PCT` | 15 | +15% earnings for 0 distractions |
| `DOUBLE_DOWN_BONUS_MULT` | 1.5 | 1.5x bonus on extension earnings |
| `PET_FOOD_COST` | $50 | Per feeding (fills all bowls) |
| `PASSIVE_INCOME_WINDOW_MS` | 5 hours | No session in 5h = passive income stops |
| `STALE_THRESHOLD_MS` | 4 hours | Task flagged stale |
| `ANCIENT_THRESHOLD_MS` | 2 days | Task flagged ancient, purge prompt |
| Grace period | 5 minutes | After YES on session confirmation |
| Pre-block alert | 75 minutes | Before blocked time starts |
| Marathon thresholds | 60/120/180/240/360/480 min | One-time daily bonuses |
| Marathon payouts | $50/$150/$300/$500/$1000/$2000 | Corresponding to thresholds |
| Payroll costs (L1-L5) | $5/$18/$50/$150/$400/day | Employee wages |
| Autoloom periods (L1-L5) | 7200/2880/1440/720/240 min | Between textile productions |
| XP level formula | `level * 50` XP per level | Linear scaling |
| Tab rotate interval | 60 seconds | Tabs shuffle every minute |

---

## KNOWN GOTCHAS AND TRAPS

1. **popup.html is NOT a popup.** Never suggest `default_popup`. Opens via `chrome.tabs.create()`. Stated 3x in all-caps at top of app.js. Has been corrected multiple times.

2. **`todayStr()` uses LOCAL date, NOT UTC.** Any code using `toISOString()` for date comparison will fire rollover at the wrong time.

3. **Combo timeout comment is wrong.** Line 59 says "15 min" — the actual value is 20 minutes.

4. **Combo coins only fire at combo >= 2.** Solo sessions get textiles only, no money.

5. **`questDoubleTextile` is one-shot.** Consumed in the first `earnBlock()` call. For multi-block sessions, only the first block gets 2x.

6. **`penaltyCountdownActive` can get stuck `true`** if a penalty/promise window dies unexpectedly. Auto-cleared on load if no active windows found. If pause/reset seems blocked, check this flag.

7. **`_focusConfirmArmed` latch prevents double-award.** The confirmation modal arms this; second calls are no-ops.

8. **`state.coins` is the internal field; UI says "dollars."** `awardCoins()` is still named with "coins." Renaming task #301 is in progress.

9. **Grace period lives in TWO places.** Module-scope `_gameLockGraceUntil` AND `state.gameLockGraceUntil`. Both must be set together. On load, persisted value restores module-scope.

10. **`ALL_PROJECT_ID = '__all__'` is never in `state.projects`.** Code looking for `state.projects.find(p => p.id === state.activeProject)` returns undefined when ALL tab is active.

11. **Session timestamps can be wrong** if extension reloaded mid-session. `renderFocusTimeline()` corrects this by recomputing start from `end - (min * 60000)`.

12. **`purchasedCanvasSizes` (not `canvasSize`)** is the authority for owned canvas sizes. On load, `canvasSize` is snapped down.

13. **`focus_marathon` challenge type is dead.** Auto-migrated to `focus_minutes` on load. Never create new `focus_marathon` challenges.

14. **`state.timerState === 'countdown'` is transient.** If popup closes mid-countdown, `load()` snaps it to `idle`.

15. **`chrome.storage.onChanged` merges `focusHistory`** across open pages. Only takes MAX per date key.

16. **The entire app.js is wrapped in `try { (() => { ... })(); } catch(e) {}`** — a silent top-level catch. If module-load fails for any syntax reason, the extension loads but shows nothing. Always verify syntax after edits.

17. **v3.23.334/334b patches are one-time credit injections** for 2026-05-15 due to a lost-session bug. Guard flags prevent re-execution.

18. **PiP pop-out timer state (`popOutTimerOpen`)** is just a boolean flag. The actual `pipWindow` reference is module-scope only — not persisted.

19. **CSP blocks inline `onclick` attributes.** All click handlers must use `addEventListener` or delegated event listeners via `data-` attributes.

20. **`release.yml` has a hardcoded staging list.** New files must be manually added to this list or they'll be excluded from release zips.

---

## DEFAULT_STATE FIELD GROUPS

### Timer / Session
`timerState`, `timerRemaining`, `timerEndsAt`, `sessionDurationSec`, `sessionBlocks`, `penaltyCountdownActive`, `popOutTimerOpen`, `gameLockGraceUntil`

### Double-Down
`doubleDownActive`, `doubleDownOriginalSec`, `doubleDownExtensionSec`, `doubleDownOriginalCoins`

### Combo / Streak
`combo`, `lastBlockTime`, `maxCombo`, `maxComboToday`, `comboSessions`, `streak`, `realStreak`, `longestStreak`, `longestRealStreak`

### XP / Level
`xp`, `todayXP`

### Economy
`coins`, `lifetimeCoins`, `lastCoinTick`, `marathonBonusesToday`, `coinsEarnedToday`, `lastMarketYield`

### Tasks / Projects
`projects`, `activeProject`, `tasks`, `priorityTasks`, `todayTasks`, `selectedTaskId`, `incrementalizeLog`, `dailyReminders`, `dailyRemindersEnabled`, `dailyRemindersLastShown`

### Session History
`dailySessionLog`, `sessionArchive`, `focusHistory`, `lifetimeFocusMinutes`, `lifetimeSessions`

### Quests
`questDate`, `questSteady`, `questAmbitious`, `questChosen`, `questCompleted`, `questStreak`, `questLongestStreak`, `questsCompletedLifetime`, `questsSteadyCompleted`, `questsAmbitiousCompleted`, `questDoubleTextile`, `_questTilesLit`

### Challenges
`friendChallenge`, `friendChallengeHistory`, `pendingChallengeInvites`, `friendChallengeWins`, `friendChallengeLosses`, `friendChallengeTies`

### Distractions
`distractionCategories`, `sessionDistractions`, `distractionHistory`

### Profile / Social
`displayName`, `tagline`, `profileId`, `profileCreated`, `profilePicture`, `friends`, `remoteTasksEnabled`, `lastInboxPoll`

### Badges
`badges`, `badgesLastSynced`

### Pets
`housePetTypes`, `housePetNames`, `housePetPickerShown`, `petFullness`, `petLastFed`, `petFoodCost`

### House Events
`houseEvents`, `houseEventLastRoll`, `houseEventHistory`, `houseFeedLog`

### Morse Code
`morseInbox`, `morseSentBox`, `morseSentCount`, `morseReceivedCount`, `morseFamousSent`

### Surveillance / Nag
`surveillanceActive`, `surveillanceEndsAt`, `surveillanceNagCount`, `surveillanceLastNag`, `surveillanceTier`, `surveillanceNagInterval`

### Bedtime / Sleep
`sleepTimeEnabled`, `sleepHour`, `sleepMinute`, `sleepPrepMin`, `sleepDurMin`, `bedtimeReminderEnabled`, `bedtimeStreak`, `bedtimeBestStreak`, `bedtimeLastConfirmDate`, `bedtimeMorningPending`, `bedtimeTotalSuccesses`

### Cold Turkey
`coldTurkeyEnabled`, `coldTurkeyBlockName`, `windDownCTCheckin`, `windDownCTStreak`

### Gallery / Canvas
`savedArtworks`, `focusMode`

### Blocked Times
`blockedTimes`, `blockedTimeAlerts`, `blockedTimePopAlerts`, `blockAlertEnabled`

### Do Now
`doNowTask`, `taskDurations`

### Dust / Bundles
`dustPixels`, `bundles`, `recentTasks`

### Factory Upgrades (Basic)
`autoloomLevel`, `marketingLevel`, `dyeResearchLevel`, `qualityControlLevel`, `employeesLevel`, `lastAutoloomTick`

### Factory Upgrades (Late-game)
`legalDeptLevel`, `lobbyingLevel`, `secondLocationLevel`, `marketShareLevel`, `aiLoomLevel`, `researchDivisionLevel`, `autoLeadershipLevel`, `worldSpanLevel`

### Resource Depletion
`framesReserve`, `gearsReserve`, `dyeReserve`, `waterReserve`, `silicaReserve` + 5 substitute upgrade levels + `depletionMilestones`, `ledgerRevealed`

### Esoteric Expansion (v3.17)
30 upgrade levels from `complianceFrameworkLevel` through `multiverseWarrantLevel`

### Ratiocinatory
`ratiocinatoryUnlocked`, `bandwidthWrits`, `dataSachets`, `cogitationTokens`, 5 aspect scores (0-100+), `patsies*` counts, 4 institution flags, `amokTicks`, `lastCompletedSessionAt`

### Brokerage / Market
`brokerageUnlocked`, `marketPrice`, `marketTick`, `marketYieldMultiplier`, `marketCosts`, various market event state fields

### Tutorial
`tutorialUnlocked` (object: `{ '2': true, ... }`)

### Visual / Settings
`use24Hour`, `blurCompletedTasks`, `autoReopenTodoList`, `startupBrowser`, `mirrorMode`

### Upgrade Visibility
`seenUpgrades`, `freshUpgrades`

### Onboarding Gates
`hasSeenIntro`, `hasSeenGalleryIntro`, `hasSeenFactoryIntro`, `hasSeenMarketIntro`, `hasSeenRatiocinatoryIntro`

---

## INTER-PAGE COMMUNICATION

All pages read/write `chrome.storage.local` (key: `pixelFocusState`). Navigation uses `chrome.runtime.sendMessage({ type: 'pf-open', path: 'page.html' })`. Background.js handles focusing existing tabs or creating new ones.

`lockout-guard.js` (included on all game pages) checks grace period on load — if expired, redirects to popup.html and closes the current tab. `?tutorial=1` bypasses the guard.

---

## NATIVE MESSAGING HOSTS

Two native messaging bridges (Windows only, require registry entries):
- `com.todooftheloom.coldturkey` — Cold Turkey website blocker integration
- `com.todooftheloom.volume` — System volume control

Both require `.exe` wrapper files present locally. Not distributed in the extension zip.

---

## PENDING TASKS (as of v3.23.362)

### In Progress
- #215: Rewrite tutorial catalog UI rendering
- #224: Build click-through tutorial walkthrough (v3 — frozen UI)
- #236: Auto-open tutorial + force close on tutorial exit when no grace period
- #301: Rename all internal coin references to dollars across codebase
- #319: Build "double down" focus timer extension gamble

### Pending (Not Started)
- #92: Implement Sector Analysis functionality
- #93: Implement Margin Trading functionality
- #94: Implement Short Selling functionality
- #164: Add bond quantity multiplier
- #165: Add mini-holdings strip to each asset card
- #192: Make daily quests harder — both tiers
- #216: Update tutorial CSS in popup.html
- #217: Update gating logic for building-based unlocks
- #218: Add exhaustive feature descriptions to each item
- #219: Version bump and syntax verify
- #223: Fix streak showing 4 instead of 7
- #251: Version bump and syntax verify
- #313: Add daily wage deduction per employee

---

## SYNTAX VERIFICATION

After editing app.js (or any JS file), always verify syntax. The extension wraps everything in a silent try/catch — syntax errors cause a blank page with no visible error. Use `node -c app.js` in the bash sandbox to check, or carefully re-read the edited section.

---

## SAVE / LOAD MECHANICS

`save()`: archives stale `dailySessionLog` into `focusHistory` before every write. Rolling auto-backup to `pixelFocusState_backup_safe` every 5 minutes.

`load()`: auto-recovery — if main state looks wiped (xp=0, tasks empty) but backup has data, silently restores. Multiple one-time migration patches run on load (backfilling fields, fixing data, etc.).

---

## DEEP FILE REFERENCE

### background.js — Service Worker

Handles: toolbar icon click, alarm scheduling, nag/penalty window management, tab deduplication.

**Toolbar icon click:** `chrome.action.onClicked` → `openPixelFocusWindow('popup.html')`. Deduplicates — finds existing tab and focuses it, only creates new if none found. CRITICAL: `manifest.json` must have NO `default_popup` on the action block — otherwise `onClicked` never fires.

**Alarms:**

| Alarm | Period | Purpose |
|-------|--------|---------|
| `pixelfocus-daycheck` | 30 min | Simplified day rollover when popup is closed (streaks, canvas save, counter resets). Does NOT do full rollover — no coin bonus, payroll, quest generation. |
| `pixelfocus-ct-idle` | 5 min | Cold Turkey idle challenge if no session in 2+ hours. 7 guards before firing. |
| `pixelfocus-focus-idle` | 5 min | Standalone idle nudge (no Cold Turkey). Same 7 guards. |
| `pixelfocus-surveillance` | 5 min | Backup nag for closed popup. Escalates through 3 tiers, $100 penalty at nag 3+. |
| `pixelfocus-keepopen` | 5 min | Auto-reopen popup if `autoReopenTodoList` enabled. Only 06:00–23:40. |
| `pixelfocus-site-nag` | 2 min | Distraction site watchlist check on active tab. |
| `pixelfocus-volume-mute` | 10 min | Volume enforcement via native messaging. |
| `pixelfocus-inbox-poll` | 1 min | Sends `INBOX_POLL` to popup for Firestore inbox check. |
| `pixelfocus-block-alert` | 1 min | Blocked-time pop-out alerts (prep phase + event start). |
| `pixelfocus-bedtime-check` | 5 min | Bedtime reminder popup (within 5 min of sleep time). |
| `pixelfocus-promise-deadline` | One-shot 3 min | Hard backstop for promise timer expiry. |
| `pixelfocus-penalty-deadline` | One-shot 3 min | Hard backstop for penalty timer expiry. |

**Message types handled:**

| Type | Action |
|------|--------|
| `pf-open` | Routes to `openNagPopup()` or `openPixelFocusWindow()` |
| `NAG_DISMISSED` | Clears nag tracking from memory + storage |
| `OPEN_PROMISE_TIMER` | Creates promise-timer.html popup, sets 3-min alarm, `penaltyCountdownActive = true` |
| `PROMISE_TIMER_EXPIRED` | Calls `applyPromisePenalty()` |
| `PROMISE_TIMER_RESOLVED` | Clears alarm and tracking |
| `OPEN_PENALTY_TIMER` | Creates penalty-timer.html popup, same pattern |
| `PENALTY_TIMER_EXPIRED` | Calls `applyPenaltyTimerPenalty()` |
| `PENALTY_TIMER_RESOLVED` | Clears alarm and tracking |
| `SAFE_REFRESH_RELOAD` | Responds OK then `chrome.runtime.reload()` after 100ms delay |

**Penalty safety checks (5 guards):** Already resolved → skip. Timer running/countdown/completed → cancel penalty. `timerEndsAt` in future → cancel. Session started within 5 min → cancel. Timer opened <10s ago → cancel. Paused timer does NOT save you.

**`_safeSaveState()` guard:** Rejects writes where `profileId` is falsy AND `xp === 0` AND `tasks` has ≤1 key. Prevents accidental state wipe.

**`chrome.storage.onChanged` handlers:** Clears deadline and idle alarms on `running`/`countdown`. Re-creates idle alarms on `idle`/`paused`/`completed`. Resets `surveillanceConsecutiveNos` when focus timer starts.

**Extension reload cleanup:** On `onInstalled` (reason: update), 500ms delay → queries all tabs → closes stale extension tabs except promise/penalty/nag windows → reopens popup.html.

**Nag window management:** `openNagPopup()` → creates 480×900 popup → re-focuses every 5s. Persisted to `pixelNagTracking` storage. On SW restart, 2s delay restores nag if <10 min old.

**Gotchas:**
- SW can die and restart mid-session — critical state persisted to `pixelNagTracking` and `pixelPenaltyTracking` storage keys
- Nag window close does NOT clear storage (intentional — `onRemoved` fires in dying SW during reload). Only `NAG_DISMISSED` message clears storage safely.
- Opportunistic surveillance check rate-limited to 30s (Brave workaround — Brave may not wake SW for alarms)
- Sleep detection: if alarm gap >10 min (5-min period), treats as wake-from-sleep and skips nag

---

### factory.js — Upgrade Tree

~50+ upgrades across trees: Production, Commerce, Research, Operations, Intelligence, Supply, Bureaucracy, Expansion, Endgame. Costs from $1,000 to sextillion-dollar endgame.

**Key data:** `UPGRADES` array (id maps to `state[id]` field), `UNLOCK_GATES` (visibility predicates), `UPGRADE_APPEAR_TEMPLATES` (sardonic one-liners on reveal).

**Key functions:** `load(cb)`, `isUpgradeVisible(u)`, `renderUpgrades()`, `buyUpgrade(u)`.

**Cost discounts stack multiplicatively:** `legalDeptLevel` + `juridicalPersonhoodLevel` + `lensGrinderTreatyLevel` compound together.

**Special purchases flip flags:** `brokerageUnlocked`, `ratiocinatoryUnlocked`, `researchLabUnlocked`, `incineratorUnlocked`, `materialsIncineratorUnlocked`, `bureauUnlocked`, `landBridgeBuilt`.

**Gotchas:** Land Bridge is NOT sticky — re-evaluates gate every render. v3.17 migration silently marks esoteric upgrades as seen. Local copies of `COMBO_COIN_PAYOUTS` and `MARATHON_THRESHOLDS` must stay in sync with app.js.

---

### gallery.js — Pixel Art Canvas

Player draws pixel art using textiles, buys paint colors (dual-currency: textiles + dollars), canvas size upgrades, saves to gallery, sells at auction, sets profile pictures. Contains "Loom Proclivities" character sheet.

**Key data:** `COLOR_SHOP` (20 tiers, Green free, dual currency from Teal), `LOOM_SELL_GRADE_TABLE` (6 grades), `LOOM_PROCLIVITIES`.

**Key functions:** `handlePixel(x,y)` (paint/erase, costs 1 block), `getLoomSellValue(art)` (RNG price), `getLoomStars(art)` (deterministic 1-5), `setProfilePicture(idx)` (deep-copy snapshot).

**Gotchas:** `purchasedCanvasSizes` is authority (not `canvasSize`). Color purchases deduct BOTH textiles AND dollars. Selling artwork that is current profile picture clears it. Dye Research discount applies to canvas textile cost only.

---

### house.js — Logic Module (No DOM)

Exports `window.House`. Computes wellbeing (0-100), household members, condition label, chapter.

**Wellbeing formula:** Starts 55. Positive: money (log scale, cap +25), streak (+1.5/streak, cap +15), employees (+2.5/level, cap +10), marketing (+2/level, cap +5). Dark: dissidents ×12 each, research lab -15, incinerator -35, lobbying L3+ -8.

**8 conditions:** "Drifted" (incinerator) → dissident states → research lab → streak/employee combos → "Settling in."

**Gotchas:** All vital signs are deterministic (no Math.random). Spouse always 1, never gendered. Pets don't decrease when things go dark.

---

### house-window.js — House Renderer

Renders rap sheet, house feed (rotating prose), pet sprites with feeding UI, household events. Contains `PET_SPRITES` — 8×8 pixel arrays for cat/dog/bunny/hamster/fish with 10+ states each.

**Note rotation:** Changes every minute (`Math.floor(Date.now() / 60000) % pool.length`), not per page load.

**Gotchas:** Not fully read-only — writes `petFullness`, `petLastFed`, `coins` (feeding), `houseEvents` (completion).

---

### research.js — Research Lab Logic

Exports `window.Research`. Player picks experiment + subject from personnel roster. Three weighted outcomes: success (reward), inconclusive (nothing), failure (subject permanently removed).

**Cooldown:** 90 seconds between experiments. All coin mutations happen directly on state object.

**Gotchas:** Failure rates intentionally non-zero on all experiments. `minEmployees` checks roster length, not `employeesLevel`.

---

### incinerator.js — Employee Fuel Conversion

Exports `window.Incinerator`. Convert employees to fuel → permanent passive income bonus.

**Fuel formula:** `base = 10 + tenureDays`, × pool multiplier (Wes 1.3×, Stranger 1.0×, Migrant 0.8×), × dissident multiplier (2.0× if dissident). Coins = fuel × 120. Bonus = `floor(totalFuel/10) / 100`.

**Gotchas:** `incineratorFuelBonus` recomputed from scratch on every burn (not accumulated). Dissidents have 2.0× fuel — optimal strategy is radicalize then burn.

---

### ratiocinatory.js — Bureaucratic Annex

Most complex sub-page. Handles: Clerisy Terminal (procurement), 5 Aspects (Exegesis/Chromatics/Deftness/Omens/Introspection, 0-100+), 4 patsy tiers, 4 Standing Institutions, Amok escalation.

**Amok system:** When aggregate aspects ≥ 200, AI autonomously spends player's resources. Frequency escalates past 350 and 450.

**5-hour passive gate:** `lastCompletedSessionAt` must be within 5 hours for income and amok to run.

**Gotchas:** Aspect reveal is sequential (Chromatics after Exegesis 20, etc.). Data Sachets need `loomSemanticianLevel >= 1`. Amok is silent — only in console feed.

---

### brokerage-window.js — Investment Market

Handles stocks/bonds/funds/crypto trading UI. State lives in `state.brokerage` (initialized by `getB()` in brokerage.html). Bonds tick per completed focus session in `earnBlock()`.

---

### timeline-window.js — Event History

Renders event history from `state.eventHistory` + backfill from `state.eventsFiredOnce`. Shows focus sessions from `dailySessionLog` + `sessionArchive`. Active story thread panel reads `state.eventFlags`. Read-only.

---

### badges-window.js — Badge System

120+ badges across 7 categories. `checkAndAwardBadges(state)` runs on every page open — badges can be earned retroactively. `streak` badge type uses `longestStreak` (not current). `lifetimeSessions` and `totalLifetimeSessions` both checked (OR logic, field was renamed).

---

### challenge-window.js — Idle Challenge Pop-out

Two phases: (1) Accept/decline challenge offer, (2) Promise timer (3-min countdown). Polls `state.timerState` every 2s. Minimizes window when focus timer is running. Auto-closes if `challengeOfferedAt` is >5 min old.

---

### firebase-sync.js — Firestore REST API

Exports `window.ProfileSync`. Throttled upload (60s minimum). Builds profile snapshot including avatar rendered to canvas as data URL. Profile ID stored separately in `pixelFocusProfileId` (survives state wipes). `getLevelTitle()` duplicated from app.js — must be kept in sync.

---

### market-engine.js — Market Math

Pure math, no DOM. `MarketEngine.tick(state)` updates `marketYieldMultiplier` (range 0.5x–2.5x). Sinusoidal demand with ~116min main cycle, ~45min secondary, ~5.8hr trend. Good zone width widens with marketing/lobbying/marketShare levels.

---

### market-events.js — Market Phase Events

One-way ratchets permanently modifying demand/cost multipliers. 8 eras (local → universal), 8 resource shocks (pool depletion thresholds). `consumeNewPhases()` is destructive — call only once per tick.

---

### events.js + events-catalog.js — Narrative Events

`window.Events` engine with evaluate/fire/tick cycle. 15+ consequence kinds including `scheduleFollowup` (stores future event) and `sideEffect` (arbitrary function). Global cooldown 1 day for ambient events. History capped at 300. Catalog file is very large (~80k+ tokens).

---

### tutorial-data.js + tutorial-ui.js — Tutorial System

Data: 30+ categories with gate conditions, page assignments, HMAC salts. UI: Spotlight click-through engine loaded on every page. Selector maps (`_SEL_POPUP`, `_SEL_FACTORY`, etc.) must be manually updated when DOM changes. `?tutorial=1` bypasses lockout.

---

### lockout-guard.js — Game Page Lock

Loaded on all game sub-pages. Checks `state.gameLockGraceUntil`. Grace active → floating countdown badge (turns red <60s). No grace → redirects to popup.html, `window.close()`. `?tutorial=1` bypasses entirely.

---

### morse-messenger.js — Morse Code UI

Exports `MorseMessenger`. Binary-tree key input. Timing: DAH 200ms, letter lock 1000ms, word gap 2000ms. Audio: 660Hz dit, 550Hz dah. Full International Morse Code tree.

---

### personnel.js — Employee Roster

Exports `window.Personnel`. `reconcileRoster(state)` grows/shrinks to match `ROSTER_TARGET_BY_LEVEL[employeesLevel]` = [0, 3, 8, 18, 35, 60]. Three name pools: Wes Anderson, Stranger, Migrant (6 sub-regions). Deterministic generation via FNV-1a hash.

---

### msglog.js — Factory Console

Exports `MsgLog`. 10-tier narrative progression (COTTAGE LOOM → HEAT DEATH). Flavor text every 45-75s. 20% chance to sample one tier below for texture. Persisted to `pixelLog` storage key.

---

### sounds.js — Web Audio SFX

Exports `SFX`. Named sounds: hover, click, addTask, completeTask, deleteTask, startTimer, blockEarned, timerComplete, purchase, error, levelUp, comboUp, tabSwitch, tick, selectTask, openShop, placePixel.

---

### btn-sounds.js — Global Micro-sounds

Side-effect IIFE on every page. Hover: 660Hz 18ms. Click: 880Hz 35ms (capture phase). Matches BUTTON, A[href], cursor:pointer, .btn, .btn-game.

---

### tooltip.js — Custom Tooltip Engine

Converts `[title]` → `[data-tip]`. MutationObserver watches for new `title` attributes. Max-width 280px. Skips `.tip` class (handled by tips.js). Guard: `window.__pfTooltipReady`.

---

### tips.js — Older Tooltip (.tip class)

Handles `.tip` question-mark chip elements specifically. Reads from `.tip-popup` child or `data-tip`/`title`. tooltip.js explicitly skips `.tip` elements to avoid conflict.

---

### Dispatch Files (factory-dispatch.js, gallery-dispatch.js, house-dispatch.js, ratiocinatory-dispatch.js)

All follow identical pattern: at most one passive-aggressive toast per page visit. Each has unique vocabulary constraints and fire probability/delay. ALL are read-only — no state writes. Chapter progression: prologue/early/mid/late-mid/late/denied.

| File | Voice | Probability | Delay | Vocab |
|------|-------|-------------|-------|-------|
| factory-dispatch | Floor management | 60% | 6.0s | Line 2, rosters, clipboards, foreman |
| gallery-dispatch | Master Loom | 60% | 6.5s | Warp, weft, bolt, canvas, shuttle |
| house-dispatch | The Computer (text msg) | 30% | 75s | Phone, text, screen, home |
| ratiocinatory-dispatch | Standing office memo | 55% | 7.0s | Memos, circulars, clerisy, patsies |

---

### Pop-Out Window Scripts

**surveillance-nag-window.js:** Confrontational nag. YES → clears tracking, opens promise-timer via `chrome.windows.create()` directly (Brave compat). NO → increments `consecutiveNos`; at 3 → opens penalty-timer. `?test=1` for inert buttons. `?penalty=1` shows -$100 banner.

**promise-timer.js:** 3-min countdown. Monitors `timerState` via storage + polling. Running → pauses countdown, minimizes window. Completed → success. Expiry → sends `PROMISE_TIMER_EXPIRED`. `?test=1` = 30s. `?remain=N` = resume from N seconds.

**penalty-timer.js:** Near-identical to promise-timer.js. Any bug fix in one must be checked in the other.

**bedtime-window.js:** YES → `bedtimeMorningPending=true`, auto-close 4s. NO → `bedtimeStreak=0`, auto-close 4s. Inline SFX (no sounds.js dependency).

**morning-checkin-window.js:** Two-step flow. Duplicates sleep badge definitions from badges-window.js (must sync manually). Auto-close 7s with new badge, 4.5s without.

**popup-dispatch.js:** One passive-aggressive "text from The Computer" 5s after popup opens. Three pools: normal/early/late. No state reads or writes.

**app-main.js:** Thin entry point that loads after app.js. Bridges initialization with page startup.

---

### Deployment Scripts

**release.bat:** Reads version from manifest → `git add -A` → commit → tag → push. Skips commit if nothing staged but still creates tag. Does NOT verify bump-version.bat was run.

**update.bat:** Giulia's updater. Downloads main branch zip from GitHub → extracts → `xcopy /Y` overwrites all files. 10KB minimum size check. No version check, no rollback.

**deploy-website.bat:** Thin wrapper calling `deploy-hosting.ps1` via PowerShell. Requires Firebase service account JSON.

**bump-version.bat:** Atomic version bumper for 5 files: `manifest.json`, `app.js`, `popup.html`, `factory.html`, `fonts.css`. Modes: patch (default), minor, major, or literal X.Y.Z.

**package-extension.bat:** Creates distributable zip. Auto-includes all .html/.js/.css/.json/.bat + icons + fonts. Includes dev-only bat files (differs from release.yml allowlist).

### .github/workflows/release.yml

Trigger: tag push matching `v*.*.*`. Steps: checkout → verify manifest version matches tag → stage ~60 hardcoded files into `pixelfocus/` folder → create zip → publish GitHub Release.

**CRITICAL:** Hardcoded staging list. New files MUST be manually added. Warning emitted but build succeeds if files missing. Skip list for warnings: `*_new.js`, `*_clean.js`, `*_backup.*`, `cleanup-*`, `CLAUDE.md`.

---

## CROSS-CUTTING GOTCHAS (MULTI-FILE)

1. **Silent top-level try/catch** — app.js wraps everything; syntax errors show blank page with no visible error. Always verify with `node -c`.
2. **Local date everywhere** — `todayStr()` in app.js, firebase-sync.js, bedtime-window.js all use local date. Never `toISOString()`.
3. **release.yml staging list** — every new file must be manually added or it's silently excluded from releases.
4. **Badge arrays duplicated** — `morning-checkin-window.js` duplicates sleep badges from `badges-window.js`. Must sync manually.
5. **CSP blocks inline onclick** — all pages, all click handlers must use `addEventListener` or delegated `data-` attributes.
6. **promise-timer.js ≈ penalty-timer.js** — near-identical code. Bug fixes in one must be checked in the other.
7. **AudioContext autoplay policy** — sounds.js, btn-sounds.js, bedtime-window.js, morse-messenger.js all create AudioContexts. Each handles suspended-context differently.
8. **`_safeSaveState()` in background.js** — rejects writes with empty profileId + xp=0 + ≤1 task key. Prevents accidental state wipes but can block legitimate saves if state is genuinely empty.
9. **Factory.js has local copies** of `COMBO_COIN_PAYOUTS` and `MARATHON_THRESHOLDS` — if app.js values change, factory.js must be updated manually.
10. **firebase-sync.js duplicates `getLevelTitle()`** from app.js — 74-rank title ladder must be kept in sync.
