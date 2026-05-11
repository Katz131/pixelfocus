// Tutorial Encyclopedia — Complete feature catalog for Todo of the Loom
// v3.23.208 — Multi-page sub-tutorials + demo popup windows for surveillance
// page: which HTML page this category belongs to ('popup' default, 'brokerage', 'factory', 'house')
// gate: null = always unlocked. String = checked against state fields.
// HMAC codes can force-unlock any gated category.
window.TUTORIAL_CATEGORIES = [
  // ══════════════════════════════════════════════════════════════
  // POPUP.HTML — ALWAYS UNLOCKED (gate: null)
  // ══════════════════════════════════════════════════════════════
  { id: 'focus-timer', name: 'Focus Timer', icon: '⏱', gate: null, page: 'popup', salt: 'cat-focus-timer', items: [
    { id: 'ft-duration', label: 'Session Duration Picker', desc: 'Choose how long you want to focus. The five pills at the top (10, 20, 30, 60, 90 min) set your session length. Longer sessions earn more textiles and bonus rewards.' },
    { id: 'ft-start', label: 'Start / Reset Buttons', desc: 'Hit START to begin your focus session. There\'s a 15-second countdown to let you settle in. RESET cancels everything and resets your combo to 0, so use it carefully.' },
    { id: 'ft-display', label: 'Timer Display', desc: 'The big countdown clock in the center. It shows how much time is left in your session and pulses green while running.' },
    { id: 'ft-countdown', label: 'Pre-Start Countdown', desc: 'After you press START, you get 15 seconds to close distractions and get ready. You\'ll hear a tick each second. This is your "get settled" window before the real session begins.' },
    { id: 'ft-pause', label: 'Pause / Resume', desc: 'Need a quick break? Pause saves your remaining time. When you resume, it jumps straight back in with no countdown. Note: pausing voids any active idle challenge bonus.' },
    { id: 'ft-complete', label: 'Session Completion', desc: 'When time runs out, you\'ll see "Did you actually focus?" — be honest! YES gives you full rewards plus a grace period to explore game features. NO gives nothing.' },
    { id: 'ft-blocks', label: 'Block Progress Row', desc: 'The little mini-blocks below the timer show your textile progress within the current session. Filled = earned, pulsing = in progress, empty = still to come.' },
  ]},
  { id: 'task-mgmt', name: 'Task Management', icon: '✅', gate: null, page: 'popup', salt: 'cat-task-mgmt', items: [
    { id: 'tm-add', label: 'Add Task', desc: 'Type what you need to do in the input field at the top and press Enter. Tasks go into whichever project tab you\'re currently on.' },
    { id: 'tm-complete', label: 'Complete Task', desc: 'Click the checkbox next to any task to mark it done. Completed tasks drop to the bottom of the list and generate a dust pixel in the dustbin.' },
    { id: 'tm-delete', label: 'Delete Task', desc: 'Click the X button on any task to remove it permanently.' },
    { id: 'tm-focus', label: 'FOCUS Button', desc: 'Pin a task as your current focus target by clicking the target icon. While focused, textiles earned during sessions are credited to that task, and the task name appears below the timer.' },
    { id: 'tm-expand', label: 'Task Text Expand/Collapse', desc: 'Long task names get truncated. Click the task text to toggle between the short and full version.' },
  ]},
  { id: 'stats-display', name: 'Stats Display', icon: '📊', gate: null, page: 'popup', salt: 'cat-stats', items: [
    { id: 'st-today', label: 'Today\'s Textiles', desc: 'Shows how many textiles you\'ve earned today. Found in the stats row near the top. Resets at midnight.' },
    { id: 'st-alltime', label: 'All-Time Textiles', desc: 'Your lifetime total textiles across all sessions. This number only goes up — it never resets.' },
    { id: 'st-streak', label: 'Streak', desc: 'How many consecutive days you\'ve opened the extension. Visible in the stats row. There\'s also a separate "Real Streak" for days you actually focused (shown in celebrations).' },
    { id: 'st-xp', label: 'XP Today', desc: 'Experience points earned today, shown in the stats row. Resets at midnight. XP fills your level bar toward the next rank.' },
    { id: 'st-focus', label: 'Focus Time (Lifetime)', desc: 'Total hours and minutes of confirmed focus across your entire history. Found in the stats row.' },
    { id: 'st-money', label: 'Money', desc: 'Your coin balance, shown at the top of the screen. You earn coins from combos, quests, streaks, and employees. Spend them in the Factory, Brokerage, and House.' },
    { id: 'st-blocks', label: 'Block Counter (Header)', desc: 'The textile count in the header bar. Click it to open the pixel art gallery where your daily canvases are saved.' },
  ]},
  { id: 'xp-leveling', name: 'XP and Leveling', icon: '⭐', gate: null, page: 'popup', salt: 'cat-xp', items: [
    { id: 'xp-earn', label: 'How You Earn XP', desc: 'You get base XP for every 10-minute block you complete. Your combo multiplier and streak bonus stack on top. Higher combo + longer streak = way more XP per session.' },
    { id: 'xp-curve', label: 'Level Curve', desc: 'Each level requires more XP than the last. Early levels come fast, later ones take sustained effort. Level N needs N x 50 XP.' },
    { id: 'xp-titles', label: 'Rank Titles', desc: 'Every level has a unique rank title — from cottage weaver through guild merchants, industrial barons, and beyond. Click your level badge to see the full ladder.' },
    { id: 'xp-ladder', label: 'Title Ladder Modal', desc: 'Click your level badge (near the stats row) to open the full rank ladder. Your current rank is highlighted in teal, the next one in gold. Higher tiers are sealed until you reach them.', action: 'openTitleLadderModal' },
    { id: 'xp-bar', label: 'XP Progress Bar', desc: 'The colored bar showing how close you are to the next level. Found below the stats area.' },
  ]},
  { id: 'combo-system', name: 'Combo System', icon: '🔥', gate: null, page: 'popup', salt: 'cat-combo', items: [
    { id: 'cb-chain', label: 'How Combos Work', desc: 'Start another session within 20 minutes of finishing the last one to keep your combo alive. Each consecutive session increases your multiplier. Let it expire and you\'re back to 1x.' },
    { id: 'cb-xp', label: 'Combo XP Multiplier', desc: 'Your combo directly multiplies XP earned. 1x at combo 1, up to 2x at combo 5+. This is the fastest way to level up — keep chaining sessions.' },
    { id: 'cb-coins', label: 'Combo Coin Burst', desc: 'Each combo level pays out coins: $15 at combo 2, up to $200 at combo 5+. These payouts are also multiplied by your Marketing upgrade and Market Yield if you have them.' },
    { id: 'cb-timer', label: 'Combo Countdown Timer', desc: 'Shows how long before your combo expires. Watch the colors: green = plenty of time, yellow = hurry, red = about to drop. Start your next session before it runs out.' },
    { id: 'cb-display', label: 'Combo Display', desc: 'Found near the timer area. Shows your current combo count, multiplier, and a preview of the coin payout. Glows hotter at higher combos.' },
  ]},
  { id: 'streak-system', name: 'Streak System', icon: '📆', gate: null, page: 'popup', salt: 'cat-streak', items: [
    { id: 'sk-owl', label: 'Owl Streak', desc: 'The lenient streak — it counts as long as you open the app each day. This is your primary streak shown in the stats row and celebrations.' },
    { id: 'sk-real', label: 'Real Streak', desc: 'The strict streak — only counts days where you actually completed a focus session. Shown separately in your daily celebration.' },
    { id: 'sk-bonus', label: 'Streak XP Bonus', desc: 'Your streak gives you a passive XP boost: +5% per streak day, up to +50% at 10+ days. This stacks with your combo multiplier.' },
    { id: 'sk-celeb', label: 'Streak Celebration', desc: 'Every day when you return, you get a multi-screen animated celebration showing your streak, yesterday\'s focus time, and a rewards summary. It\'s your daily progress report.' },
  ]},
  { id: 'project-tabs', name: 'Project Tabs', icon: '📁', gate: null, page: 'popup', salt: 'cat-projects', items: [
    { id: 'pj-multi', label: 'Multiple Projects', desc: 'Organize your tasks into separate project folders using the tabs at the top. Click + to create a new project. Each project has its own task list.' },
    { id: 'pj-all', label: 'ALL Tab', desc: 'A special tab that shows every task from every project in one combined list. Tasks show a badge indicating which project they belong to.' },
    { id: 'pj-overflow', label: 'Tab Overflow', desc: 'If you have too many projects to fit on screen, extra tabs go into a dropdown menu. Look for the overflow button at the end of the tab bar.' },
    { id: 'pj-rotate', label: 'Tab Rotation Timer', desc: 'Every 60 seconds, the visible tabs shuffle so different projects rotate into view. A small progress bar shows when the next rotation happens.' },
    { id: 'pj-stale', label: 'Stale Task Markers', desc: 'An "!" badge appears on project tabs that have tasks you haven\'t touched in 4+ hours. It\'s a nudge to check on neglected work.' },
  ]},
  { id: 'priority-tasks', name: 'Priority Tasks', icon: '🚨', gate: null, page: 'popup', salt: 'cat-priority', items: [
    { id: 'pr-list', label: 'Priority Task List', desc: 'A separate red-themed section above your regular tasks for urgent items. When you have uncompleted priorities, a blocking modal appears every time you open the extension until you deal with them.' },
    { id: 'pr-recur', label: 'Recurrence', desc: 'Priority tasks can repeat automatically: daily, weekly (pick specific days), or on an interval (every N days). Click the gear icon on any priority task to set up recurrence.' },
    { id: 'pr-block', label: 'Blocking Modal', desc: 'If you have active priority tasks, this full-screen modal shows up when you open the extension. You can mark them DONE, REMOVE them, or dismiss with "NOT YET" (but it\'ll come back next time).' },
    { id: 'pr-drag', label: 'Drag-to-Reorder', desc: 'Drag priority tasks up and down to change their order. Visual drop indicators show where the task will land.' },
  ]},
  { id: 'today-tasks', name: 'Today\'s Tasks and Aqueducts', icon: '🗓', gate: null, page: 'popup', salt: 'cat-today', items: [
    { id: 'td-list', label: 'Today List', desc: 'An orange-themed daily task list for things you want to finish today. You can add tasks directly or pull them from your project/priority lists using the arrow button.' },
    { id: 'td-stages', label: 'Aqueduct Stages', desc: 'Break a today-task into sub-steps called "aqueducts." If a task has aqueducts, you can\'t mark the main task done until all sub-steps are complete. Expand to see all stages or use compact view for just the current step.' },
    { id: 'td-recur', label: 'Recurrent Aqueducts', desc: 'Flag an aqueduct task to reset its stages every day. Useful for daily routines with multiple steps — the stages re-open each morning automatically.' },
  ]},
  { id: 'daily-quests', name: 'Daily Quests', icon: '🎯', gate: null, page: 'popup', salt: 'cat-quests', items: [
    { id: 'dq-gen', label: 'Quest Generation', desc: 'Every day you get two quest options: STEADY (easier) and AMBITIOUS (harder). Pick one and try to complete it before midnight. Found in the quest card on the main page.' },
    { id: 'dq-types', label: 'Quest Types', desc: 'Quests challenge different things: total focus minutes, number of sessions, combo chains, longest single session, sessions of a minimum length, and more.' },
    { id: 'dq-steady', label: 'Steady Quest Examples', desc: 'Easier targets like "Focus 60 minutes" or "Complete 3 sessions" or "Hit a 4x combo." Good for building consistency.' },
    { id: 'dq-ambitious', label: 'Ambitious Quest Examples', desc: 'Harder goals like "Focus 180 minutes" or "Hit an 8x combo." Much bigger rewards if you can pull it off.' },
    { id: 'dq-rewards', label: 'Quest Rewards', desc: 'Steady quests pay coins + XP. Ambitious quests pay roughly 2.5x more coins, more XP, and give you double textiles on your next session. Rewards scale with your level.' },
    { id: 'dq-tiles', label: 'Tile Grid Progress', desc: 'A tile grid that lights up as you make progress toward your quest goal. Each tile represents a milestone step.' },
    { id: 'dq-streak', label: 'Quest Streak', desc: 'Complete a quest every day to build a quest streak. Separate from your focus streak. Breaking it means starting over.' },
    { id: 'dq-celeb', label: 'Quest Celebration', desc: 'When you complete a quest, a full-screen celebration shows your rewards with animated particles.' },
  ]},
  { id: 'badges', name: 'Badges', icon: '🏅', gate: null, page: 'popup', salt: 'cat-badges', items: [
    { id: 'bg-system', label: 'Badge System', desc: 'Over 300 achievement badges across every category: focus sessions, streaks, combos, textiles, friends, wealth, quests, and more. Click the trophy button to see your collection.' },
    { id: 'bg-celeb', label: 'Badge Celebration', desc: 'When you unlock a new badge, a celebration pops up showing the badge icon, name, and what you did to earn it.' },
    { id: 'bg-page', label: 'Badges Page', desc: 'A dedicated page showing all badges with progress indicators. Earned badges are highlighted; unearned ones show how close you are. Click the trophy button in the nav bar to open it.' },
  ]},
  { id: 'friends-social', name: 'Friends and Social', icon: '🤝', gate: null, page: 'popup', salt: 'cat-friends', items: [
    { id: 'fr-id', label: 'Your Profile ID', desc: 'A unique 12-character code generated after your first focus session. Share it with friends so they can find you. Found on your profile page with a copy button.' },
    { id: 'fr-search', label: 'Friend Search', desc: 'Enter someone\'s profile ID to send them a friend request. Found in the friends section of the main page.' },
    { id: 'fr-requests', label: 'Friend Requests', desc: 'Send, accept, or decline friend requests. Pending requests show as a red badge count next to the FRIENDS & SHARING header. Accept or decline directly in the friends section.' },
    { id: 'fr-list', label: 'Friend List', desc: 'Your friends appear as rows with their avatar, name, and buttons for challenges and messaging.' },
    { id: 'fr-perms', label: 'Task Sharing Permissions', desc: 'Control which friends can add tasks to your project lists. You can grant per-friend, per-project access. Friends can also request access, which you approve or deny.' },
    { id: 'fr-remote', label: 'Remote Task Sending', desc: 'With permission, you can add tasks directly to a friend\'s project list. Useful for shared work or accountability.' },
    { id: 'fr-inbox', label: 'Morse Inbox', desc: 'Your morse inbox collects every telegraph you receive from friends (and from your household when you are locked out). Each message shows the raw dots and dashes plus the decoded text. Click the morse code to replay the incoming animation. Delete individually or clear all.' },
    { id: 'fr-challenge', label: 'Challenges', desc: 'Challenge a friend to a 3-day head-to-head competition in categories like Focus Minutes, Best Combo, or Tasks Completed. Winner gets coins and XP; loser loses coins.' },
    { id: 'fr-morse', label: 'Morse Telegraph', desc: 'Send messages to friends using an authentic morse code input system. Click the telegraph icon next to any friend to open the full morse composer. See the dedicated Morse Telegraph tutorial category for a complete walkthrough of every element.' },
    { id: 'fr-profile', label: 'Profile Page', desc: 'Your public page with avatar, display name, tagline, level, streaks, and work ledger. Click your avatar in the header to open it. Always accessible, even during lockout.' },
    { id: 'fr-mirror', label: 'Browser Linking', desc: 'Use the same account across two browsers. Mirror mode lets you check your stats from another device without affecting your main data.' },
  ]},
  { id: 'morse-telegraph', name: 'Morse Telegraph', icon: '📡', gate: null, page: 'popup', salt: 'cat-morse', items: [
    { id: 'mt-overview', label: 'What Is This?', desc: 'The Morse Telegraph is a full-screen overlay that lets you compose and send messages to friends using real International Morse Code. Instead of typing letters, you key dots and dashes on a virtual telegraph key. It opens when you click the telegraph icon next to any friend in your friend list.', action: '_openMorseDemo' },
    { id: 'mt-tree', label: 'Morse Code Tree', desc: 'The big tree diagram at the top is a visual map of every letter and number in International Morse Code. The green dot at the top is START. Going left (tap/dit) takes you toward E, I, S, H. Going right (hold/dah) takes you toward T, N, M, O. As you key dots and dashes, the tree highlights your current path and shows which letter you\'re about to lock in. Green lines show dot paths, orange dashed lines show dash paths.' },
    { id: 'mt-key', label: 'Telegraph Key (HOLD TO KEY)', desc: 'The big green button labeled HOLD TO KEY is your telegraph key. Tap it quickly (under 200ms) to send a dit (dot). Hold it longer (over 200ms) to send a dah (dash). While pressing, the key changes color: green for dit, orange for dah. A progress bar at the bottom of the key shows the timing threshold. You can also use SPACEBAR on your keyboard instead of clicking.' },
    { id: 'mt-ditdah', label: 'Dit vs Dah Timing', desc: 'A quick tap under 200 milliseconds registers as a dit (shown as a green dot ·). Holding the key longer than 200ms registers as a dah (shown as an orange dash —). While holding, you\'ll hear a telegraph tone that shifts pitch when the dah threshold is crossed, and the key visually changes from green to orange so you always know which signal you\'re sending.' },
    { id: 'mt-autolock', label: 'Letter Auto-Lock', desc: 'After you release the key, a 1-second timer starts (shown as the green progress bar in the status bar, labeled "letter..."). If you don\'t press the key again within 1 second, the current letter locks in automatically. You\'ll hear a confirmation blip. This means you don\'t need to press any button to confirm a letter — just pause briefly and it locks.' },
    { id: 'mt-wordgap', label: 'Word Gap (Auto-Space)', desc: 'After a letter locks, another timer starts (shown as the orange progress bar, labeled "word gap..."). If you don\'t start a new letter within 2 seconds, a word gap is automatically inserted — like pressing the space bar. You\'ll hear a lower-pitched blip. This separates your message into distinct words without needing a space button.' },
    { id: 'mt-statusbar', label: 'Status Bar', desc: 'The dark bar between the tree and the telegraph key shows your current input state. On the left, you see the dots and dashes you\'ve keyed so far for the current letter (in gold), plus the letter it resolves to (in green). On the right, the progress bar shows how close you are to the auto-lock or word-gap threshold.' },
    { id: 'mt-btbreak', label: 'BT BREAK Button', desc: 'The blue button on the left. In real telegraph, BT (dah-dit-dit-dit-dah) is the prosign for "break" — it inserts a word gap manually. Use it when you want to force a space between words without waiting the full 2 seconds. Also locks any in-progress letter first. Keyboard shortcut: TAB.' },
    { id: 'mt-undo', label: 'UNDO Button', desc: 'The red button in the middle. Undoes your last action. If you\'re mid-letter (dots/dashes entered but not locked), it clears the current attempt. If you have locked letters, it deletes the last one. If the current word is empty, it pulls back the previous completed word and removes its last letter. Keyboard shortcut: BACKSPACE.' },
    { id: 'mt-transmit', label: 'AR TRANSMIT Button', desc: 'The green button on the right. In real telegraph, AR (dit-dah-dit-dah-dit) is the prosign for "end of message." Clicking this sends your composed message to your friend. It locks any in-progress letter, finalizes any in-progress word, and transmits everything. The button is dimmed when you have no message. Keyboard shortcut: ENTER.' },
    { id: 'mt-message', label: 'Message Display', desc: 'The box at the bottom shows your composed message in two forms: the raw morse code (gold dots, dashes, and slashes for word gaps) and the decoded plain text in parentheses below it. This updates live as you key each letter, so you can always see what you\'re writing.' },
    { id: 'mt-keyboard', label: 'Keyboard Shortcuts', desc: 'You can use your keyboard instead of clicking: SPACEBAR = telegraph key (hold for dah, tap for dit). BACKSPACE = undo. TAB = BT break (word gap). ENTER = AR transmit (send). ESCAPE = close and go back. The shortcuts are listed at the very bottom of the screen.' },
    { id: 'mt-sounds', label: 'Telegraph Sounds', desc: 'The telegraph key plays a continuous sine wave tone while pressed — starting at 660Hz for dit, shifting down to 550Hz when the dah threshold is crossed. Letter locks play an 880Hz blip. Word gaps play a 440Hz blip. The TRANSMIT button plays a 1000Hz confirmation tone. All buttons also play hover and click blips.' },
    { id: 'mt-sent', label: 'Sent Confirmation', desc: 'After transmitting, you see a confirmation screen showing your raw morse code, the decoded text, and who it was sent to. Click CLOSE to return to the main extension. Your friend will see the message in their Morse Inbox with the raw dots/dashes and a typewriter-animated decode.' },
    { id: 'mt-incoming', label: 'Incoming Messages', desc: 'When a friend sends you a morse message, it appears as a full-screen overlay with a typewriter decode animation — the letters reveal one by one with blip sounds. The raw morse code is shown above. Click DISMISS to close. The message is also saved in your Morse Inbox for later review.' },
    { id: 'mt-back', label: 'Back Button', desc: 'The red BACK button in the top-left corner closes the morse composer and returns you to the main extension. Any unsent message is discarded. Same as pressing ESCAPE on your keyboard.' },
  ]},
  { id: 'surveillance', name: 'Surveillance and Accountability', icon: '👁', gate: null, page: 'popup', salt: 'cat-surveillance', items: [
    { id: 'sv-tiers', label: 'Three Surveillance Tiers', desc: 'Choose how aggressively the extension nags you when you\'re not focusing. SURVEILLANCE (strict, every 5 min), SENTINEL (moderate, 10-30 min), or PASSIVE (gentle, 30 min-3 hr). Found in the surveillance panel on the main page.' },
    { id: 'sv-strikes', label: 'Escalating Strikes', desc: 'Ignore too many nag popups and you get penalized $100 in coins. The extension gets increasingly insistent — it\'s designed to make procrastination uncomfortable.', demo: 'surveillance-nag.html?test=1' },
    { id: 'sv-promise', label: 'Promise Timer', desc: 'Click YES on a surveillance nag and you promise to start within 3 minutes. If you don\'t follow through, you lose $300. It\'s a commitment device.', demo: 'promise-timer.html?test=1' },
    { id: 'sv-penalty', label: 'Penalty Timer', desc: 'Click NO three times in a row and a 3-minute penalty timer starts. Same $300 consequence if you still don\'t start. The system escalates.', demo: 'penalty-timer.html?test=1' },
    { id: 'sv-ct-block', label: 'Cold Turkey Auto-Block', desc: 'If you have Cold Turkey installed, the extension automatically starts a website block when your focus session begins. Keeps distractions away.' },
    { id: 'sv-ct-daily', label: 'Cold Turkey Daily Prompt', desc: 'A once-per-day reminder asking if you want to open Cold Turkey to set up your website blocks.' },
    { id: 'sv-watchlist', label: 'Distraction Watchlist', desc: 'Add distracting websites to a watchlist. You\'ll get nagged if any of them are open in your browser. Found in settings.' },
    { id: 'sv-winddown', label: 'Wind-Down Check-In', desc: 'During your bedtime wind-down period, you\'re asked to confirm your website blockers are on. Earns XP and coins, and has its own streak.' },
    { id: 'sv-ct-idle', label: 'Cold Turkey Idle Reminder', desc: 'If you haven\'t started a session in 2 hours during your awake time, Cold Turkey opens as a gentle nudge.' },
  ]},
  { id: 'sleep-bedtime', name: 'Sleep and Bedtime', icon: '💤', gate: null, page: 'popup', salt: 'cat-sleep', items: [
    { id: 'sl-wizard', label: 'Sleep Time Wizard', desc: 'Set your bedtime, sleep duration, and wind-down period. Click the moon/sleep button on the timeline to open the wizard. Your sleep time shows as a blue block on the focus timeline.' },
    { id: 'sl-remind', label: 'Bedtime Reminder', desc: 'When your wind-down period starts, a pop-out window appears with a bedtime prep checklist to help you wrap up.' },
    { id: 'sl-morning', label: 'Morning Check-In', desc: 'First thing each day: "Did you go to bed on time?" Honest answers build your bedtime streak and unlock badges.' },
    { id: 'sl-streak', label: 'Bedtime Streak', desc: 'Consecutive on-time bedtimes, tracked separately from your focus streak. Milestones at 5, 10, 15, and 25+ days unlock badges.' },
  ]},
  { id: 'tools-settings', name: 'Timelines, Tools, and Settings', icon: '⚙', gate: null, page: 'popup', salt: 'cat-tools', items: [
    { id: 'tl-timeline', label: 'Focus Timeline', desc: 'A visual timeline showing your day: completed sessions (teal bars), blocked-out times (red), sleep (blue), and a "now" marker. Found on the main page. Scroll to see 6 hours at a time.' },
    { id: 'tl-blocked', label: 'Blocked-Out Times', desc: 'Mark times you can\'t focus (meetings, commute, etc.) by clicking the + button on the timeline. Shows as red blocks with prep zones so you don\'t start a session too close to an obligation.' },
    { id: 'tl-preblock', label: 'Pre-Block Alert', desc: 'An alert pops up about an hour before a blocked time, showing a visual timeline of NOW → GET READY → EVENT. Offers a quick 10-minute sprint option so you can squeeze in one more session.' },
    { id: 'tl-weekly', label: 'Weekly Focus Bar Chart', desc: 'A bar chart of your focus minutes Mon-Sun. Today is green, past days are orange. Navigate to previous weeks to see your history. Found on the main page.' },
    { id: 'tl-donow', label: 'Do Now Commitment', desc: 'Commit to doing a specific task right now with a time estimate. A banner appears with DONE/CANCEL and a countdown. Auto-expires after 30 min overdue.' },
    { id: 'tl-lockout', label: 'Game Lockout and Grace Period', desc: 'Game pages (gallery, factory, house, etc.) are locked unless you have a grace period from completing a session. The grace period is 5 min + 1 min per 10 min focused. Your profile page is always accessible.' },
    { id: 'tl-morning', label: 'Morning Redirect', desc: 'When you first open the extension each day, a greeting screen shows your priorities, task counts, and active quest. Buttons to START FOCUSING or VIEW TASKS.' },
    { id: 'tl-idle', label: 'Idle Challenge', desc: 'Accept a 1.5x reward bonus for your next session, but you forfeit the bonus if you pause. A high-risk, high-reward option for confident focusers.' },
    { id: 'tl-increm', label: 'Incrementalization Prompt', desc: 'Once a day, the extension checks for old tasks and asks if you want to break them into smaller sub-steps. Helps you tackle tasks that have been sitting too long.' },
    { id: 'tl-stale', label: 'Stale and Ancient Tasks', desc: 'Tasks untouched for 4+ hours get an "AGING" badge. After 2+ days with no focus, you\'re prompted to bulk-delete, promote to priority, or keep them.' },
    { id: 'tl-welcome', label: 'Welcome Back Screen', desc: 'After 4+ hours away, you\'re greeted with animated counters showing passive coins and textiles you earned while gone, plus today\'s stats.' },
    { id: 'tl-recur', label: 'Recurring Tasks', desc: 'Set tasks to reappear automatically every day. When you complete one, a toast offers to stop the recurrence if you\'re done with it.' },
    { id: 'tl-remind', label: 'Daily Reminders', desc: 'A section for personal reminders and wisdoms. Once per day, a flashcard modal walks you through each one. Found in the blue-themed reminders panel.' },
    { id: 'tl-bundles', label: 'Task Bundles', desc: 'Save sets of tasks as reusable templates. Load a bundle to add all its tasks at once — useful for repeating workflows.' },
    { id: 'tl-settings', label: 'Settings', desc: 'Click the gear icon to access the settings panel with Safe Refresh, Backup/Restore, Cold Turkey integration, Distraction Watchlist, and Volume Mute Scheduler.' },
  ]},
  { id: 'market-economy', name: 'Market Economy', icon: '💰', gate: 'market', page: 'popup', salt: 'cat-market', items: [
    { id: 'mk-card', label: 'Market Card', desc: 'A dashboard on the main page showing demand, costs, margin, and your yield multiplier. Appears once you buy Marketing Level 1 in the Factory.' },
    { id: 'mk-slider', label: 'Price Slider', desc: 'Set your selling price (1-30). Higher price = bigger margin but lower demand. Find the sweet spot for the best yield. Locked while a session is running.' },
    { id: 'mk-yield', label: 'Yield Multiplier', desc: 'Applied to your combo coin earnings. Above 1.0x = bonus, below 1.0x = penalty. Driven by your price, demand, and current market conditions.' },
    { id: 'mk-events', label: 'Market Eras and Events', desc: 'The market goes through phases and random events that shift demand and costs. Watch the event ticker on the market card to adapt your pricing strategy.' },
    { id: 'mk-intro', label: 'Market Intro', desc: 'A one-time tutorial explaining Price, Demand, Cost, and Yield. Shows automatically before your first session after unlocking the market.' },
  ]},

  // ══════════════════════════════════════════════════════════════
  // POPUP.HTML — SETTINGS (opens settingsModal)
  // ══════════════════════════════════════════════════════════════
  { id: 'settings-backup', name: 'Backup and Restore', icon: '💾', gate: null, page: 'popup', salt: 'cat-settings-backup', modal: 'settingsModal', items: [
    { id: 'set-safe', label: 'Safe Refresh', desc: 'Saves a timestamped backup of your full game state to your computer, mirrors it inside the extension, then reloads cleanly. Your progress is always preserved. Use this any time something feels off.' },
    { id: 'set-restore', label: 'Restore Last Backup', desc: 'Overwrites your current state with the most recent internal backup. A panic button for when a Safe Refresh went wrong or data got corrupted.' },
    { id: 'set-import', label: 'Import from JSON File', desc: 'Pick a Safe Refresh JSON file from your Downloads folder and restore your entire state from it. Essential after re-installing the extension or switching computers.' },
  ]},
  { id: 'settings-ct', name: 'Cold Turkey Integration', icon: '❄', gate: null, page: 'popup', salt: 'cat-settings-ct', modal: 'settingsModal', items: [
    { id: 'set-ct-test', label: 'Test Connection', desc: 'Checks whether the extension can communicate with Cold Turkey Blocker on your computer. Must show "Connected!" before any features will work.' },
    { id: 'set-ct-setup', label: 'First-Time Setup Guide', desc: 'A step-by-step walkthrough for connecting Cold Turkey to the extension. You only need to do it once: install Cold Turkey, run the setup script, reload the extension.' },
    { id: 'set-ct-auto', label: 'Auto-Start Block on Focus', desc: 'When enabled, starting a focus session automatically activates your Cold Turkey block list for the session duration. Distracting sites are blocked until you finish.' },
    { id: 'set-ct-daily', label: 'Daily Prompt', desc: 'Once per day, a pop-up asks if you want to open Cold Turkey to configure your blocks. A gentle reminder to set up your defenses.' },
    { id: 'set-ct-idle', label: 'Idle Reminder', desc: 'If you haven\'t completed a session in 2 hours, Cold Turkey opens automatically along with the challenge window. Checks every 15 minutes during wake hours.' },
    { id: 'set-ct-winddown', label: 'Wind-Down Blocker Check-In', desc: 'During your bedtime wind-down period, asks you to confirm your blockers are on. Earns XP, coins, and builds its own streak. Requires sleep time to be set.' },
    { id: 'set-ct-block', label: 'Block List Name', desc: 'The exact name of your Cold Turkey block list. Must match what you named it in the Cold Turkey app. Type it in the text field and the extension will activate that list during focus sessions.' },
  ]},
  { id: 'settings-watchlist', name: 'Distraction Watchlist', icon: '🚫', gate: null, page: 'popup', salt: 'cat-settings-watchlist', modal: 'settingsModal', items: [
    { id: 'set-nag-toggle', label: 'Enable/Disable Watchlist', desc: 'Turn the distraction nags on or off. Your site list is preserved when disabled. Toggle is in the top-right of the watchlist section.' },
    { id: 'set-nag-sites', label: 'Adding Sites', desc: 'Paste URLs or domains into the text area — one per line or comma-separated. Full URLs are trimmed to just the domain automatically. Click ADD SITES to save them.' },
    { id: 'set-nag-export', label: 'Export and Sync', desc: 'Copy your entire watchlist to clipboard with EXPORT LIST. Paste it into the other browser\'s watchlist to sync across browsers.' },
    { id: 'set-nag-test', label: 'Test Nag', desc: 'Checks if your currently active tab matches any site on your watchlist. Navigate to a listed site in another tab first, then click TEST NAG to verify it works.' },
    { id: 'set-nag-scope', label: 'Browser Scope Warning', desc: 'The watchlist only monitors the browser where this extension is installed. For full coverage, install the extension in every browser you use and link them with the multi-browser setup guide.' },
  ]},
  { id: 'settings-volume', name: 'Volume Mute Scheduler', icon: '🔇', gate: null, page: 'popup', salt: 'cat-settings-volume', modal: 'settingsModal', items: [
    { id: 'set-vol-toggle', label: 'Enable Volume Schedule', desc: 'Turn the auto-mute on or off. When enabled, your computer\'s volume is muted at the mute time and unmuted at the unmute time every day. Requires a one-time install.' },
    { id: 'set-vol-times', label: 'Mute and Unmute Times', desc: 'Set the hour and minute for when to mute and unmute. Uses 24-hour format. For example, mute at 23:00 and unmute at 07:00 keeps you quiet overnight.' },
    { id: 'set-vol-install', label: 'Installation Guide', desc: 'A one-time setup to install the Windows scheduled task that controls your volume. Click INSTALL GUIDE and follow the steps. After that, it runs automatically every day.' },
  ]},

  // ══════════════════════════════════════════════════════════════
  // FACTORY.HTML — SUB-TUTORIALS (shown on factory page)
  // ══════════════════════════════════════════════════════════════
  { id: 'factory-overview', name: 'Factory Dashboard', icon: '🏭', gate: 'factory', page: 'factory', salt: 'cat-factory-overview', items: [
    { id: 'fac-money', label: 'Money Counter', desc: 'Your current coin balance, displayed prominently at the top. This is the same balance you see on the main page — coins flow in from combos, quests, streaks, and employees.' },
    { id: 'fac-lifetime', label: 'Lifetime Money', desc: 'Total coins earned across your entire history. This number only goes up and is used to determine household milestones like children appearing at the House.' },
    { id: 'fac-income', label: 'Income Strip', desc: 'A row of colored pills showing your active income sources: streak trickle rate, next marathon payout, next combo burst, and textile count. Gives you a quick snapshot of what\'s earning right now.' },
    { id: 'fac-console', label: 'Factory Console', desc: 'The scrolling message log at the bottom. Shows purchase confirmations, autoloom output, resource depletion warnings, and flavor text. The factory\'s heartbeat.' },
  ]},
  { id: 'factory-upgrades', name: 'Core Upgrades', icon: '⬆', gate: 'factory', page: 'factory', salt: 'cat-factory-upgrades', items: [
    { id: 'fac-grid', label: 'Upgrade Grid', desc: 'The main grid of purchasable upgrades. Each card shows the upgrade name, current level, cost, and what it does. Click to buy. Cards dim out when you can\'t afford them.' },
    { id: 'fac-autoloom', label: 'Autoloom', desc: 'Generates textiles passively over time, even when you\'re not focusing. Starts very slow but speeds up with later upgrades.' },
    { id: 'fac-marketing', label: 'Marketing', desc: 'Multiplies the coins you get from combos (1.25x to 3x). Also unlocks the Market card on the main page. One of the most impactful early upgrades.' },
    { id: 'fac-dye', label: 'Dye Research', desc: 'Gives discounts on canvas size upgrades and unlocks bonus tint colors. Helpful if you\'re into the pixel art side of things.' },
    { id: 'fac-qc', label: 'Quality Control', desc: 'Gives you a chance for a bonus textile from each focus session (10% to 80% depending on level).' },
    { id: 'fac-hire', label: 'Hire Employees', desc: 'Unlocks passive coin income that trickles in based on your streak. Also populates your employee roster with named characters.' },
  ]},
  { id: 'factory-upgrades-mid', name: 'Advanced Upgrades', icon: '⚡', gate: 'employees', page: 'factory', salt: 'cat-factory-upgmid', items: [
    { id: 'fac-legal', label: 'Legal Department', desc: 'Gives a compounding discount on all future factory upgrades. Buy this early to make everything else cheaper down the road.' },
    { id: 'fac-lobby', label: 'Lobbying', desc: 'Multiplies your streak trickle income (1x up to 28x). Pairs with Hire Employees — useless without it, powerful with it.' },
    { id: 'fac-2nd', label: 'Second Location', desc: 'A flat multiplier on ALL textile and money output (up to 16x). One of the most powerful mid-game upgrades.' },
    { id: 'fac-mktshare', label: 'Market Share', desc: 'Multiplies end-of-day bonuses and marathon payouts (up to 22x). Rewards sustained daily effort.' },
  ]},
  { id: 'factory-upgrades-late', name: 'Late-Game Upgrades', icon: '🔬', gate: 'research', page: 'factory', salt: 'cat-factory-upglate', items: [
    { id: 'fac-ai', label: 'AI Loom', desc: 'Speeds up Autoloom dramatically (up to 60x) and adds an independent chance for bonus session textiles. The autoloom\'s best friend.' },
    { id: 'fac-research', label: 'Research Division', desc: 'Multiplies your Quality Control bonus chance (up to 14x). Pairs with QC — together they make bonus textiles almost guaranteed.' },
    { id: 'fac-leader', label: 'Automated Leadership', desc: 'Multiplies ALL money from every source (up to 20x). A late-game income supercharger.' },
    { id: 'fac-world', label: 'World Span', desc: 'The ultimate endgame upgrade. A flat multiplier on everything — textiles, coins, all output (up to 128x).' },
  ]},
  { id: 'factory-resources', name: 'Resource Depletion', icon: '⛏', gate: 'ledger', page: 'factory', salt: 'cat-factory-resources', items: [
    { id: 'fac-pools', label: 'Five Resource Pools', desc: 'Frames, Gears, Dye, Water, and Silica — each starts at 10,000 and drains as you produce textiles. When pools get low, production penalties kick in.' },
    { id: 'fac-penalty', label: 'Depletion Penalties', desc: 'Resources above 75% = no penalty. Below that, output drops progressively: 0.95x, 0.85x, 0.70x, down to 0.50x at empty. The system forces you to address scarcity.' },
    { id: 'fac-subs', label: 'Supply Chain Substitutes', desc: 'Factory upgrades that mitigate depletion penalties without restoring reserves. The damage is permanent, but substitutes make the penalty manageable.' },
    { id: 'fac-ledger', label: 'Resource Ledger', desc: 'A detailed readout of your resource levels. Appears on the Factory page once any pool drops below 50%.' },
  ]},
  { id: 'factory-nav', name: 'Factory Navigation', icon: '🧭', gate: 'factory', page: 'factory', salt: 'cat-factory-nav', items: [
    { id: 'fac-back', label: 'Back to Main Page', desc: 'The top-left button returns you to your to-do list and timer. You can always come back to the factory during your grace period.' },
    { id: 'fac-house', label: 'House Button', desc: 'Opens The House — a quiet page showing your household: spouse, children, pets, and their condition. Visit to check on your family and handle household events.' },
    { id: 'fac-gallery', label: 'Gallery Button', desc: 'Opens the Pixel Gallery where all your daily canvases are archived. Browse your history of pixel art.' },
  ]},
  { id: 'factory-nav-adv', name: 'Advanced Navigation', icon: '🗺', gate: 'employees', page: 'factory', salt: 'cat-factory-navadv', items: [
    { id: 'fac-employees', label: 'Personnel Button', desc: 'Opens the Employee Management Center. View your workforce, their roles, bios, and hire dates. Search, filter, and manage your roster.' },
  ]},
  { id: 'factory-nav-late', name: 'Late-Game Navigation', icon: '🚪', gate: 'research', page: 'factory', salt: 'cat-factory-navlate', items: [
    { id: 'fac-research-nav', label: 'Research Lab Button', desc: 'Opens the Research Lab where you can run experiments on employees.' },
    { id: 'fac-bureau', label: 'Bureau Button', desc: 'Opens The Bureau — the espionage wing. Relocate employees into spy posts and run operations.' },
  ]},
  { id: 'factory-nav-endgame', name: 'Endgame Navigation', icon: '🔥', gate: 'incinerator', page: 'factory', salt: 'cat-factory-navendgame', items: [
    { id: 'fac-incinerator', label: 'Incinerator Button', desc: 'Opens the Incinerator — converts employees into permanent passive-income fuel.' },
  ]},

  // ══════════════════════════════════════════════════════════════
  // BROKERAGE.HTML — SUB-TUTORIALS (shown on brokerage page)
  // ══════════════════════════════════════════════════════════════
  { id: 'brokerage-basics', name: 'Brokerage Basics', icon: '🏦', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-basics', items: [
    { id: 'brk-wallet', label: 'Wallet Balance', desc: 'Your main coin balance, shown at the top left. This is the same wallet as everywhere else — coins earned from focus sessions, combos, and quests appear here.' },
    { id: 'brk-cash', label: 'Brokerage Cash', desc: 'Money you\'ve deposited into the brokerage. This is separate from your main wallet — you must deposit coins before you can trade. Shows at the top of the page.' },
    { id: 'brk-deposit', label: 'Deposit and Withdraw', desc: 'Use the deposit button to move coins from your wallet into brokerage cash. Withdraw moves them back. Type an amount in the transfer field or use presets.' },
    { id: 'brk-portfolio', label: 'Portfolio Value', desc: 'The total current value of all your investments: stocks, funds, bonds, and crypto combined. Updates in real-time as prices fluctuate.' },
    { id: 'brk-pl', label: 'Total Profit / Loss', desc: 'How much you\'ve gained or lost overall. Green = profit, red = loss. Calculated from your original purchase prices vs. current market values.' },
    { id: 'brk-acumen', label: 'Acumen', desc: 'A progression currency earned from trading activity. Spend acumen on permanent brokerage upgrades that give you advantages in the market.' },
  ]},
  { id: 'brokerage-stocks', name: 'Stocks', icon: '📈', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-stocks', items: [
    { id: 'brk-stocks-list', label: 'Stock Listings', desc: '6 stocks representing different sectors with unique price behaviors and volatility. Each card shows the ticker, current price, and price change. Prices fluctuate in real-time.' },
    { id: 'brk-stocks-buy', label: 'Buying Stocks', desc: 'Click BUY on any stock and choose a quantity preset (x1, x5, x10, or MAX). The trade executes instantly at the current market price using your brokerage cash.' },
    { id: 'brk-stocks-sell', label: 'Selling Stocks', desc: 'Sell shares you own to convert them back to brokerage cash at the current market price. Go to the Portfolio tab to see all your holdings and sell from there.' },
  ]},
  { id: 'brokerage-funds', name: 'Index Funds', icon: '📊', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-funds', items: [
    { id: 'brk-funds-list', label: 'Fund Listings', desc: '2 diversified index funds that track a basket of stocks. Lower volatility than individual stocks — good for steady, predictable growth.' },
    { id: 'brk-funds-fees', label: 'Management Fees', desc: 'Funds charge a small management fee on your holdings. It\'s deducted automatically. The trade-off is lower risk and less active management needed from you.' },
  ]},
  { id: 'brokerage-bonds', name: 'Treasury Bonds', icon: '📜', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-bonds', items: [
    { id: 'brk-bonds-types', label: 'Bond Types', desc: 'Three bond tiers with different maturity lengths: 3-session, 7-session, and 20-session. Longer bonds pay higher returns but take more focus sessions to mature.' },
    { id: 'brk-bonds-mature', label: 'Maturity Progress', desc: 'Bonds mature based on completed focus sessions, not real time. Each session you finish advances all your bonds one step toward payout. The safest investment — guaranteed returns if you keep focusing.' },
    { id: 'brk-bonds-buy', label: 'Buying Bonds', desc: 'Purchase bonds at the top of the Bonds tab. You can buy multiple bonds in one click with the quantity selector. Each bond costs a fixed amount from your brokerage cash.' },
  ]},
  { id: 'brokerage-crypto', name: 'Cryptocurrency', icon: '🪙', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-crypto', items: [
    { id: 'brk-crypto-list', label: 'Crypto Assets', desc: '2 cryptocurrency tokens with extreme volatility. Prices can swing wildly in either direction. The highest risk and highest potential return of any investment.' },
    { id: 'brk-crypto-risk', label: 'Volatility Warning', desc: 'Crypto can crash to near-zero or skyrocket unexpectedly. Only invest what you can afford to lose. Great for thrill-seekers, terrible for conservative portfolios.' },
  ]},
  { id: 'brokerage-limits', name: 'Limit Orders', icon: '📋', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-limits', items: [
    { id: 'brk-limit-set', label: 'Setting Limit Orders', desc: 'Set a target price for a buy or sell order. When the market hits your target, the trade executes automatically. Useful for buying dips or selling at peaks without watching constantly.' },
    { id: 'brk-limit-list', label: 'Pending Orders', desc: 'All your active limit orders are listed here. Each shows the asset, type (buy/sell), target price, and quantity. Cancel any order if you change your mind.' },
  ]},
  { id: 'brokerage-portfolio', name: 'Portfolio', icon: '💼', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-portfolio', items: [
    { id: 'brk-port-view', label: 'Portfolio Overview', desc: 'A comprehensive view of everything you own: stocks, funds, bonds, and crypto. Shows current value, gain/loss, and percentage change for each holding.' },
    { id: 'brk-port-sell', label: 'Selling from Portfolio', desc: 'Sell any holding directly from the Portfolio tab. Click the sell button on any asset to convert it back to brokerage cash at the current market price.' },
  ]},
  { id: 'brokerage-upgrades', name: 'Brokerage Upgrades', icon: '⭐', gate: 'brokerage', page: 'brokerage', salt: 'cat-brokerage-upgrades', items: [
    { id: 'brk-upg-list', label: 'Upgrade Shop', desc: 'Spend your earned acumen on permanent upgrades. These give lasting advantages: better prices, reduced fees, higher caps, and special abilities.' },
    { id: 'brk-upg-acumen', label: 'Earning Acumen', desc: 'Acumen is earned passively from trading activity — every buy and sell contributes. The more actively you trade, the faster acumen accumulates.' },
  ]},

  // ══════════════════════════════════════════════════════════════
  // HOUSE.HTML — SUB-TUTORIALS (shown on house page)
  // ══════════════════════════════════════════════════════════════
  { id: 'house-overview', name: 'Your Household', icon: '🏠', gate: 'house', page: 'house', salt: 'cat-house-overview', items: [
    { id: 'hou-hero', label: 'Welcome Banner', desc: 'The hero section at the top sets the mood. The chapter title and mood line change based on your overall wellbeing and game progress. It reflects how things are going at home.' },
    { id: 'hou-mood', label: 'Mood Line', desc: 'A dynamic sentence that changes based on your household wellbeing score. High wellbeing = warm, cozy descriptions. Low wellbeing = tense, uncomfortable vibes.' },
  ]},
  { id: 'house-rapsheet', name: 'Rap Sheet', icon: '📋', gate: 'house', page: 'house', salt: 'cat-house-rapsheet', items: [
    { id: 'hou-spouse', label: 'Spouse', desc: 'Your household\'s spouse headcount and status. The spouse appears as you progress through the game. Their description reflects the overall mood and condition of your household.' },
    { id: 'hou-kids', label: 'Children', desc: 'Children appear at lifetime coin milestones. The more you earn over your career, the more kids show up. Their mood and behavior reflect your game performance.' },
    { id: 'hou-pets', label: 'Pets', desc: 'Choose from 6 pet types: cat, dog, bird, bunny, or fish. Each has its own personality and mood that changes based on how you\'re doing. Feed them regularly to keep them happy.' },
    { id: 'hou-condition', label: 'Household Condition', desc: 'An overall verdict on your household\'s state. Ranges from thriving to struggling based on your focus habits, wealth, and how well you take care of your family and pets.' },
  ]},
  { id: 'house-events', name: 'Household Events', icon: '🎲', gate: 'house', page: 'house', salt: 'cat-house-events', items: [
    { id: 'hou-events', label: 'Event Cards', desc: 'Random events pop up when you visit the house based on your game state. Each event card has a description, a cost or reward, and an action button. Some events are positive windfalls, others require spending money.' },
    { id: 'hou-event-btn', label: 'Completing Events', desc: 'Click the action button on any event card to resolve it. Events might earn or cost you coins, textiles, or affect your household condition. Some events have prerequisites.' },
  ]},
  { id: 'house-vitals', name: 'Vital Signs', icon: '📟', gate: 'house', page: 'house', salt: 'cat-house-vitals', items: [
    { id: 'hou-vitals', label: 'Vital Signs Monitor', desc: 'A security-camera-style panel showing the status of each household member. Each row displays their current state, mood, and any warnings. The camera feed tag adds atmosphere.' },
    { id: 'hou-comms', label: 'Telecommunications', desc: 'Status rows for your household\'s phone and internet connections. Reflects your infrastructure and connectedness — these can be affected by game events.' },
    { id: 'hou-wellbeing', label: 'Wellbeing Bar', desc: 'A progress bar at the bottom showing your overall household wellbeing score from 0 to 100. Color-coded: green (good), yellow (okay), red (struggling). Driven by all your household factors combined.' },
  ]},
  { id: 'house-nav', name: 'House Navigation', icon: '🧭', gate: 'house', page: 'house', salt: 'cat-house-nav', items: [
    { id: 'hou-back', label: 'Back to To-Do List', desc: 'Returns you to the main extension popup with your timer, tasks, and all the core features. Found in the top navigation bar.' },
    { id: 'hou-loom', label: 'Master Loom', desc: 'Opens the Master Loom — the pixel art canvas where you paint with colors earned from focus milestones. Found in the top navigation bar.' },
    { id: 'hou-factory', label: 'To Factory', desc: 'Opens the Factory page where you purchase upgrades and manage your production empire. Found in the top navigation bar.' },
    { id: 'hou-begin', label: 'Begin Textile Work', desc: 'A shortcut button that takes you directly to the Factory to start producing. Found at the bottom of the house page.' },
  ]},
  { id: 'house-denial', name: 'House Status', icon: '⛔', gate: 'landbridge', page: 'house', salt: 'cat-house-denial', items: [
    { id: 'hou-denial', label: 'Current Condition', desc: 'The house page now reflects the consequences of a decision you made. What you see here is permanent.' },
  ]},
  { id: 'house-pets', name: 'Your Pets', icon: '🐾', gate: 'petSetup', page: 'house', salt: 'cat-house-pets', items: [
    { id: 'hou-pet-sprite', label: 'Pet Sprites', desc: 'Each pet is drawn as a tiny pixel art sprite below the feed. The sprite changes based on the pet\'s mood — happy pets wag, dance, or preen. Sad pets droop, whimper, or go quiet. Hover over a pet to see a tooltip describing what they\'re doing.' },
    { id: 'hou-pet-mood', label: 'Pet Mood', desc: 'Your pet\'s mood is driven by the household condition and your overall wellbeing score. Different species react differently to the same condition — a dog might be scared when a cat is merely alert. High wellbeing overrides dark moods.' },
    { id: 'hou-pet-bowl', label: 'Food Bowl', desc: 'Below each pet sprite is a food bowl. When the bowl is full, the pet has been fed. Feeding costs coins and keeps fullness from draining. An empty bowl means the pet is hungry — this doesn\'t affect wellbeing directly but it\'s not a good look.' },
    { id: 'hou-pet-feed', label: 'Feeding', desc: 'Use the FEED button on the house page to spend coins on food. Fullness drains over time (handled during daily rollover). Keep the bowl topped up.' },
    { id: 'hou-pet-events', label: 'Pet Events', desc: 'Random household events target specific pets — vet visits, new toys, grooming, comfort. Each event costs or earns coins and changes the pet\'s sprite briefly. Events add variety and give you reasons to check the house.' },
  ]},

  // ══════════════════════════════════════════════════════════════
  // POPUP.HTML — BUILDING OVERVIEW TUTORIALS (gated, point at nav buttons)
  // Each building has its own detailed sub-tutorial on its page.
  // These popup entries explain WHAT the building is and how to get there.
  // ══════════════════════════════════════════════════════════════
  { id: 'building-factory', name: 'The Factory', icon: '🏭', gate: 'factory', page: 'popup', salt: 'cat-bld-factory', navigate: 'factory.html?tutorial=1', items: [
    { id: 'bf-what', label: 'What Is the Factory?', desc: 'The Factory is where you spend coins on permanent upgrades that multiply your earnings. Buy Autoloom for passive textiles, Marketing for combo coin boosts, Hire Employees for passive income, and many more.' },
    { id: 'bf-open', label: 'How to Get There', desc: 'Click the gold-bordered FACTORY button at the bottom of the main page. It opens in a new window. You need to be in your grace period (after completing a focus session) to access it.' },
    { id: 'bf-tut', label: 'Factory Tutorial', desc: 'The Factory has its own dedicated tutorial that walks you through every upgrade, resource pool, and navigation option.' },
  ]},
  { id: 'building-house', name: 'The House', icon: '🏠', gate: 'house', page: 'popup', salt: 'cat-bld-house', navigate: 'house.html?tutorial=1', items: [
    { id: 'bh-what', label: 'What Is the House?', desc: 'The House is a quiet page showing your household: spouse, children, pets, and their condition. Your wellbeing score reflects how well you focus and take care of things. Random events pop up that cost or reward coins.' },
    { id: 'bh-open', label: 'How to Get There', desc: 'Click the olive-bordered HOUSE button at the bottom of the main page. It opens in a new window. Like the Factory, you need a grace period to access it.' },
    { id: 'bh-tut', label: 'House Tutorial', desc: 'The House has its own dedicated tutorial covering the rap sheet, events, vitals, and navigation.' },
  ]},
  { id: 'building-brokerage', name: 'The Brokerage', icon: '📈', gate: 'brokerage', page: 'popup', salt: 'cat-bld-brokerage', navigate: 'brokerage.html?tutorial=1', items: [
    { id: 'bb-what', label: 'What Is the Brokerage?', desc: 'The Brokerage is an investment platform where you trade stocks, index funds, treasury bonds, and cryptocurrency using your in-game coins. Deposit cash, buy assets, watch prices fluctuate, and earn acumen for upgrades.' },
    { id: 'bb-open', label: 'How to Get There', desc: 'Click the teal-bordered BROKERAGE button at the bottom of the main page. It only appears after you unlock it. Opens in a new window during your grace period.' },
    { id: 'bb-tut', label: 'Brokerage Tutorial', desc: 'The Brokerage has its own dedicated tutorial covering stocks, bonds, crypto, limit orders, portfolio, and upgrades.' },
  ]},
  { id: 'building-gallery', name: 'The Master Loom', icon: '🎨', gate: null, page: 'popup', salt: 'cat-bld-gallery', navigate: 'gallery.html?tutorial=1', items: [
    { id: 'bg-what', label: 'What Is the Master Loom?', desc: 'The Gallery window is where you paint pixel art, unlock colors, expand your canvas, browse saved artworks, sell pieces at auction, and view your operator file. It runs on the Master Loom — a 24-hour cycle that auto-saves your daily canvas at midnight.' },
    { id: 'bg-open', label: 'How to Get There', desc: 'Click the block counter in the header or the mini canvas preview on the main page. The Gallery opens in a new window. You need a grace period (after completing a focus session) to access it.' },
    { id: 'bg-tut', label: 'Gallery Tutorial', desc: 'The Gallery has its own dedicated tutorial covering the canvas, painting tools, dye house, loom expansion, saved artworks, auction house, and operator file.' },
  ]},

  // ══════════════════════════════════════════════════════════════
  // GALLERY.HTML — CANVAS, TOOLS, AND ARTWORK MANAGEMENT
  // ══════════════════════════════════════════════════════════════
  { id: 'gallery-canvas', name: 'Canvas and Painting', icon: '🖌', gate: null, page: 'gallery', salt: 'cat-gal-canvas', items: [
    { id: 'gc-grid', label: 'Pixel Canvas Grid', desc: 'The main grid in the center of the CANVAS tab. Click or drag to fill pixels with your selected color. Each pixel costs one textile. The canvas starts at 8x8 and can be expanded via Loom Expansion.' },
    { id: 'gc-paint', label: 'Paint Tool', desc: 'The default tool. Click the PAINT button in the Tools section (or just start clicking on the canvas). Places your selected color on any pixel you click or drag over.' },
    { id: 'gc-erase', label: 'Erase Tool', desc: 'Click ERASE in the Tools section to switch to eraser mode. Clicking a painted pixel removes its color and refunds the textile. Useful for fixing mistakes without wasting resources.' },
    { id: 'gc-clear', label: 'Clear Canvas', desc: 'The nuclear option. Click CLEAR CANVAS to wipe every pixel at once and refund all spent textiles back to your balance. Cannot be undone — but since textiles are refunded, nothing is truly lost.' },
    { id: 'gc-info', label: 'Canvas Info', desc: 'The info strip in the Tools panel showing your current canvas dimensions, how many pixels are painted, and how many textiles remain available. Updates live as you paint.' },
  ]},
  { id: 'gallery-palette', name: 'Color Palette and Dye House', icon: '🎨', gate: null, page: 'gallery', salt: 'cat-gal-palette', items: [
    { id: 'gp-colors', label: 'Color Palette', desc: 'The grid of color swatches at the top of the Tools panel. Click any unlocked color to select it as your active paint. Your currently selected color is highlighted with a border.' },
    { id: 'gp-locked', label: 'Locked Colors', desc: 'Greyed-out swatches represent colors you haven\'t unlocked yet. Hover over any locked swatch to see its name and the focus-time milestone required to unlock it (e.g., 50 hours for Blue, 500 hours for Purple).' },
    { id: 'gp-dye', label: 'Dye House', desc: 'The Dye House section in the Tools panel lets you purchase new paint colors with textiles. Only the next color in line is purchasable — you must buy them in order. Each successive tier costs roughly four times the previous one. Late-game colors become multi-trillion-textile trophies.' },
    { id: 'gp-milestones', label: 'Color Milestones', desc: 'There are 20 colors total, from Green (starter) through Amber (10,000+ hours). Each new color is a badge of dedication — the later ones represent serious lifetime focus commitment.' },
  ]},
  { id: 'gallery-loom', name: 'Loom Expansion and Master Loom', icon: '🔲', gate: null, page: 'gallery', salt: 'cat-gal-loom', items: [
    { id: 'gl-expand', label: 'Loom Expansion', desc: 'The Loom Expansion section in the Tools panel lets you spend textiles to upgrade your canvas to a larger size. Each +4 pixels of resolution costs roughly TEN TIMES the previous tier. The Dye Research factory upgrade discounts these costs.' },
    { id: 'gl-sizes', label: 'Canvas Sizes', desc: 'Your canvas starts at 8x8 pixels and can grow to 12x12, 16x16, 20x20, and beyond through Loom Expansion purchases. Bigger canvases mean more detail but require many more textiles to fill.' },
    { id: 'gl-master', label: 'Master Loom Countdown', desc: 'The panel at the top of the page showing a countdown to midnight. At 00:00 local time, the Master Loom auto-saves your current canvas to the Gallery, re-threads the warp, advances your streak, and rolls over daily counters. The progress bar shows how far through the current day you are.' },
  ]},
  { id: 'gallery-save', name: 'Save, Export, and Sell', icon: '💾', gate: null, page: 'gallery', salt: 'cat-gal-save', items: [
    { id: 'gs-save', label: 'Save to Gallery', desc: 'Click SAVE TO GALLERY in the Tools panel to stash your current canvas as a finished artwork in the GALLERY tab. The canvas is then cleared so you can start a new piece. You can save multiple artworks per day — the Master Loom auto-save at midnight is separate.' },
    { id: 'gs-export', label: 'Export as PNG', desc: 'Click EXPORT AS PNG to download your current canvas as a pixel-art PNG image file. The image is scaled up so pixels are clearly visible. Great for sharing your art outside the extension.' },
    { id: 'gs-tab', label: 'Gallery Tab', desc: 'Click the GALLERY tab at the top to browse all your saved artworks. Each piece shows as a thumbnail with its save date. You can export individual pieces as PNGs or sell them at auction.' },
    { id: 'gs-sell', label: 'Auction House (Sell)', desc: 'Click SELL on any saved artwork to open the Auction House modal. It shows a preview of the piece, a star rating based on pixels placed, colors used, and canvas size, plus a grade and price offer. Click CONFIRM SALE to accept the coins, or CANCEL to keep the piece.' },
    { id: 'gs-stars', label: 'Star Rating System', desc: 'The Auction House rates each piece from 1 to 5 stars based on how many pixels are painted, how many distinct colors were used, and the canvas dimensions. Higher ratings mean higher sale prices. The grade label (e.g., "Apprentice Weave," "Master Tapestry") is based on the star count.' },
  ]},
  { id: 'gallery-practice', name: 'Operator File (Practice Tab)', icon: '📋', gate: null, page: 'gallery', salt: 'cat-gal-practice', items: [
    { id: 'gx-overview', label: 'What Is the Operator File?', desc: 'Click the PRACTICE tab to see your operator file — a character sheet showing your loom traits (proclivities), weaving stats (skill, constitution, acuity), a sparkline of your quality ratings over time, and the AI\'s current assessment. Purely cosmetic — no purchases or upgrades here.' },
    { id: 'gx-traits', label: 'Proclivities', desc: 'Your loom traits are personality-style attributes derived from your focus patterns. They update over time as the system observes your behavior — session lengths, consistency, time of day, and more.' },
    { id: 'gx-stats', label: 'Weaving Stats', desc: 'Numerical ratings for Skill, Constitution, and Acuity. These are calculated from your lifetime focus data and serve as a fun summary of your work ethic. They go up as you focus more consistently.' },
    { id: 'gx-sparkline', label: 'Quality Sparkline', desc: 'A tiny chart showing your quality ratings over recent days. Gives you a visual sense of whether your focus quality is trending up or down.' },
    { id: 'gx-assessment', label: 'AI Assessment', desc: 'A procedurally generated text blurb that comments on your recent performance. It changes based on your stats and patterns. Sometimes encouraging, sometimes pointed.' },
  ]},
  { id: 'gallery-nav', name: 'Gallery Navigation', icon: '🧭', gate: null, page: 'gallery', salt: 'cat-gal-nav', items: [
    { id: 'gn-tabs', label: 'View Tabs', desc: 'Three tabs at the top of the page: CANVAS (paint pixel art), GALLERY (browse saved works), and PRACTICE (operator file). Click any tab to switch views.' },
    { id: 'gn-stats', label: 'Top Bar Stats', desc: 'The stats bar at the very top shows your textile balance, total textiles earned, and other key numbers. These update live as you paint or earn textiles.' },
    { id: 'gn-back', label: 'Back Button', desc: 'The BACK TO LOOM button in the top bar closes the Gallery and returns you to the main extension popup.' },
    { id: 'gn-console', label: 'Operations Log', desc: 'The message console at the bottom of the PRACTICE tab shows a live feed of factory events — sessions completed, textiles woven, employees hired, research breakthroughs, and idle chatter from the loom.' },
    { id: 'gn-tutorial', label: 'Tutorial Button', desc: 'The TUTORIAL button in the top bar opens this tutorial walkthrough. You can revisit it anytime to review how any part of the Gallery works.' },
  ]},

  // ══════════════════════════════════════════════════════════════
  // POPUP.HTML — REMAINING GATED CATEGORIES
  // ══════════════════════════════════════════════════════════════
  { id: 'employees', name: 'Employees and Payroll', icon: '👷', gate: 'employees', page: 'popup', salt: 'cat-employees', items: [
    { id: 'em-named', label: 'Named Employees', desc: 'Your workforce of uniquely named characters with roles, bios, and hire dates. The roster grows as you upgrade Hire Employees in the Factory (5 at L1 up to 60 at L5). View the full roster on the Employee Management page inside the Factory.' },
    { id: 'em-wages', label: 'Daily Wages', desc: 'Employees cost money — wages come out of your balance daily. Higher levels = more employees = bigger payroll. Make sure your income covers the cost. Wage totals show in your daily celebration.' },
    { id: 'em-layoff', label: 'Layoff Mechanic', desc: 'If payroll gets too expensive, you can fire an employee tier and recoup 40% of the hiring cost. Found on the Employee Management page inside the Factory.' },
    { id: 'em-trickle', label: 'Streak Trickle', desc: 'While your streak is active and you have employees, you earn passive coins every minute. The trickle rate shows in the income strip on the Factory page. Scales with employee level, streak, lobbying, and leadership upgrades.' },
  ]},
  { id: 'incinerator', name: 'The Incinerator', icon: '🔥', gate: 'incinerator', page: 'popup', salt: 'cat-incinerator', items: [
    { id: 'in-dustbin', label: 'Dust Bin', desc: 'Every completed task drops a colored speck into the dust bin canvas. The specks are cosmetic — they look cool but don\'t determine your payout. The bin fills up as you complete tasks throughout the day.' },
    { id: 'in-unlock', label: 'Daily Unlock Requirement', desc: 'You need to complete at least 3 tasks in a single day before the BURN DUST button unlocks. The hint text below the button tells you how many more tasks you need.' },
    { id: 'in-burn', label: 'Burning Dust', desc: 'Click BURN DUST once per day to incinerate your dust pile for coins. The payout is $50 base plus $15 per streak day. Each burn also adds a tiny permanent passive income boost (+0.05% per burn, capped at +5% lifetime). If you forget before midnight, that day\'s payout is gone.' },
    { id: 'in-timer', label: 'Burn Countdown', desc: 'After burning, a countdown timer shows when the incinerator resets (midnight). You can only burn once per day, so make sure you\'ve completed enough tasks before pulling the trigger.' },
  ]},
  { id: 'ratiocinatory', name: 'Ratiocinatory', icon: '🧠', gate: 'ratiocinatory', page: 'popup', salt: 'cat-ratio', items: [
    { id: 'ra-overview', label: 'Overview', desc: 'A bureaucratic annex attached to the Factory. Unlocked by purchasing the Cogitorium Annex upgrade. A strange place where you manage resources, aspects, and patsies. Access it through the Factory page.' },
    { id: 'ra-resources', label: 'Three Resources', desc: 'Bandwidth Writs, Data Sachets, and Cogitation Tokens. Purchase them with coins at the Clerisy Terminal, then spend them to develop aspects.' },
    { id: 'ra-aspects', label: 'Five Aspects', desc: 'Exegesis, Chromatics, Deftness, Omens, and Introspection. Develop each one to hit checkpoints that unlock special factory upgrades.' },
    { id: 'ra-patsy', label: 'Patsy System', desc: 'Commission clerical patsies from a large name pool to multiply your aspect gains. Higher-tier patsies (Junior to Demiurge) give bigger multipliers.' },
    { id: 'ra-inst', label: 'Standing Institutions', desc: 'Late-game one-time purchases that provide cross-system bonuses. Ministry of Adjacent Reasoning, Bureau of Orthogonal Enquiry, and more.' },
    { id: 'ra-amok', label: 'Amok Escalation', desc: 'Once your aggregate aspects get high enough, the AI starts acting on its own — procuring resources and eventually commissioning patsies autonomously. Subtle and unannounced.' },
  ]},
  { id: 'bureau', name: 'The Bureau', icon: '🕵', gate: 'bureau', page: 'popup', salt: 'cat-bureau', items: [
    { id: 'bu-what', label: 'What Is the Bureau?', desc: 'The espionage wing of the Factory. Relocate employees into spy posts and run covert operations for coin and XP rewards. Access it through the Bureau button on the Factory page.' },
    { id: 'bu-ops', label: 'Spy Operations', desc: 'Operations range in risk and reward. Success pays out coins and XP. Failure generates heat on the agent. Choose wisely — you can\'t run them back to back.' },
    { id: 'bu-stats', label: 'Agent Stats', desc: 'Agents have Seniority and Loyalty that grow with tenure. Heat rises on failed operations — keep it low to avoid blowback.' },
  ]},
  { id: 'research-lab', name: 'Research Lab', icon: '🧪', gate: 'research', page: 'popup', salt: 'cat-research', items: [
    { id: 're-what', label: 'What Is the Research Lab?', desc: 'A high-risk facility inside the Factory where you run experiments on employees. Access it through the Research Lab button on the Factory page.' },
    { id: 're-exp', label: 'Experiments', desc: 'Run experiments on employees with three possible outcomes: SUCCESS (reward), INCONCLUSIVE (nothing), or FAILURE (employee removed permanently). High risk, high reward.' },
  ]},
  { id: 'esoteric', name: 'Esoteric Expansion', icon: '👑', gate: 'esoteric', page: 'popup', salt: 'cat-esoteric', items: [
    { id: 'es-what', label: 'What Is the Esoteric Expansion?', desc: 'The endgame upgrade tree in the Factory. Once you max out core upgrades, the esoteric tiers unlock progressively — from Compliance Framework through international trade, alien first contact, galactic conquest, and universal transcendence.' },
    { id: 'es-levels', label: 'Progression Arc', desc: 'Over 30 upgrade levels with multipliers reaching up to 30,000x at max level. Each tier has its own themed upgrades and increasingly absurd lore. Visit the Factory to purchase them.' },
    { id: 'es-badge', label: 'Fresh Upgrades Badge', desc: 'When new esoteric upgrades become available, a NEW badge appears on the Factory button on the main page so you know to check in.' },
  ]},
];
