// badges-window.js — v3.23.99
// Handles the dedicated Badges page.
// Loaded by badges.html.

(function() {
  'use strict';

  // ===== All badge definitions =====
  // Categories: sleep, focus, social, mastery
  var ALL_BADGES = [
    // --- Sleep / Bedtime ---
    { id: 'early_bird_1', cat: 'sleep', name: 'Early Bird', icon: '🐤', desc: 'You went to bed on time 5 nights. Your sleep schedule is taking shape!', req: {"type": "bedtimeTotal", "count": 5} },
    { id: 'sleep_warrior', cat: 'sleep', name: 'Sleep Warrior', icon: '🛡️', desc: '10 nights of hitting the pillow on schedule. That takes real discipline.', req: {"type": "bedtimeTotal", "count": 10} },
    { id: 'dream_weaver', cat: 'sleep', name: 'Dream Weaver', icon: '🌀', desc: '15 nights on time. You\'re building a genuine bedtime habit.', req: {"type": "bedtimeTotal", "count": 15} },
    { id: 'night_master', cat: 'sleep', name: 'Night Master', icon: '🌙', desc: '25 nights on time. Most people can\'t do this for a week — you did it 25 times.', req: {"type": "bedtimeTotal", "count": 25} },
    { id: 'sleep_sage', cat: 'sleep', name: 'Sleep Sage', icon: '🧘', desc: '40 nights of keeping your bedtime commitment. Your body clock thanks you.', req: {"type": "bedtimeTotal", "count": 40} },
    { id: 'lunar_legend', cat: 'sleep', name: 'Lunar Legend', icon: '🌕', desc: '60 nights on time. That\'s two solid months of sleep discipline.', req: {"type": "bedtimeTotal", "count": 60} },
    { id: 'rest_royalty', cat: 'sleep', name: 'Rest Royalty', icon: '👑', desc: '90 nights on time — a full quarter of the year spent sleeping right.', req: {"type": "bedtimeTotal", "count": 90} },
    { id: 'eternal_dreamer', cat: 'sleep', name: 'Eternal Dreamer', icon: '💫', desc: '150 nights on time. You\'ve made good sleep a core part of who you are.', req: {"type": "bedtimeTotal", "count": 150} },
    { id: 'sleep_deity', cat: 'sleep', name: 'Sleep Deity', icon: '✨', desc: '200 nights! Sleep isn\'t a chore for you anymore — it\'s a lifestyle.', req: {"type": "bedtimeTotal", "count": 200} },
    { id: 'year_of_rest', cat: 'sleep', name: 'Year of Rest', icon: '📅', desc: '365 nights on time. An entire year of keeping your bedtime promise.', req: {"type": "bedtimeTotal", "count": 365} },
    { id: 'sleep_olympian', cat: 'sleep', name: 'Sleep Olympian', icon: '🏅', desc: '500 nights! You could teach a masterclass on sleep discipline.', req: {"type": "bedtimeTotal", "count": 500} },
    { id: 'sleep_transcendent', cat: 'sleep', name: 'Transcendent Sleeper', icon: '🌌', desc: '750 nights on time. At this point your circadian rhythm runs like a Swiss watch.', req: {"type": "bedtimeTotal", "count": 750} },
    { id: 'millennium_sleeper', cat: 'sleep', name: 'Millennium Sleeper', icon: '🏛️', desc: '1,000 nights on time. A thousand bedtimes honored. Absolutely legendary.', req: {"type": "bedtimeTotal", "count": 1000} },
    { id: 'streak_sleep_3', cat: 'sleep', name: 'Three-Peat', icon: '🌟', desc: 'You went to bed on time 3 nights in a row without breaking the chain.', req: {"type": "bedtimeStreak", "count": 3} },
    { id: 'streak_sleep_5', cat: 'sleep', name: 'Handful of Dreams', icon: '✋', desc: '5 consecutive nights of on-time sleep. The streak is getting real.', req: {"type": "bedtimeStreak", "count": 5} },
    { id: 'streak_sleep_7', cat: 'sleep', name: 'Week of Zzz', icon: '😴', desc: 'A full week of going to bed on time every single night.', req: {"type": "bedtimeStreak", "count": 7} },
    { id: 'streak_sleep_14', cat: 'sleep', name: 'Fortnight Dreamer', icon: '🌃', desc: 'Two straight weeks of perfect bedtimes. That\'s a real routine now.', req: {"type": "bedtimeStreak", "count": 14} },
    { id: 'streak_sleep_21', cat: 'sleep', name: 'Habit Formed', icon: '🧠', desc: '21 nights in a row — they say it takes 21 days to form a habit.', req: {"type": "bedtimeStreak", "count": 21} },
    { id: 'streak_sleep_30', cat: 'sleep', name: 'Monthly Moon', icon: '🌑', desc: 'A full month of unbroken bedtime discipline. Not one slip.', req: {"type": "bedtimeStreak", "count": 30} },
    { id: 'streak_sleep_45', cat: 'sleep', name: 'Sleep Centurion', icon: '🦾', desc: '45 nights straight. Your willpower is genuinely impressive.', req: {"type": "bedtimeStreak", "count": 45} },
    { id: 'streak_sleep_60', cat: 'sleep', name: 'Two-Month Twilight', icon: '🌆', desc: 'Two months without missing a single bedtime. Iron discipline.', req: {"type": "bedtimeStreak", "count": 60} },
    { id: 'streak_sleep_90', cat: 'sleep', name: 'Quarter Dreamer', icon: '🌅', desc: '90 nights in a row. A full quarter of flawless sleep commitment.', req: {"type": "bedtimeStreak", "count": 90} },
    { id: 'streak_sleep_120', cat: 'sleep', name: 'Unwavering Night', icon: '🌎', desc: '120 consecutive nights on time. Four months of bedtime perfection.', req: {"type": "bedtimeStreak", "count": 120} },
    { id: 'streak_sleep_180', cat: 'sleep', name: 'Half-Year Harmony', icon: '🎶', desc: 'Half a year of never once breaking your bedtime streak.', req: {"type": "bedtimeStreak", "count": 180} },
    { id: 'streak_sleep_270', cat: 'sleep', name: 'Nine-Month Nirvana', icon: '🌸', desc: '270 nights straight. Nine months of unbroken sleep discipline.', req: {"type": "bedtimeStreak", "count": 270} },
    { id: 'streak_sleep_365', cat: 'sleep', name: 'Perfect Sleep Year', icon: '🏆', desc: 'You went to bed on time every single night for an entire year. Unbelievable.', req: {"type": "bedtimeStreak", "count": 365} },
    { id: 'pillow_pro', cat: 'sleep', name: 'Pillow Professional', icon: '🛌', desc: 'You confirmed your bedtime 3 days running. The pillow knows your name now.', req: {"type": "bedtimeStreak", "count": 3} },
    { id: 'no_phone_zone', cat: 'sleep', name: 'No Phone Zone', icon: '📵', desc: '10 bedtime commitments made. You\'re taking screen-free sleep seriously.', req: {"type": "bedtimeTotal", "count": 10} },
    { id: 'melatonin_machine', cat: 'sleep', name: 'Melatonin Machine', icon: '💊', desc: '50 nights of on-time sleep. Your brain\'s sleep chemistry is dialed in.', req: {"type": "bedtimeTotal", "count": 50} },
    { id: 'streak_sleep_10', cat: 'sleep', name: 'Ten Straight', icon: '🌚', desc: '10 nights in a row of on-time sleep. Double-digit streak!', req: {"type": "bedtimeStreak", "count": 10} },
    { id: 'streak_sleep_50', cat: 'sleep', name: 'Fifty Nights', icon: '🌠', desc: '50 consecutive nights on time. Almost two months without a slip.', req: {"type": "bedtimeStreak", "count": 50} },
    { id: 'sleep_75', cat: 'sleep', name: 'Seventy-Five', icon: '🌍', desc: '75 total nights on time. Three-quarters of the way to a hundred.', req: {"type": "bedtimeTotal", "count": 75} },
    { id: 'sleep_100', cat: 'sleep', name: 'Century Sleeper', icon: '💯', desc: '100 nights on time! Triple digits. You\'ve mastered your bedtime.', req: {"type": "bedtimeTotal", "count": 100} },
    { id: 'sleep_125', cat: 'sleep', name: 'Sleep Scholar', icon: '🎓', desc: '125 nights of on-time sleep. You could write a thesis on discipline.', req: {"type": "bedtimeTotal", "count": 125} },
    { id: 'sleep_250', cat: 'sleep', name: 'Sleep Monarch', icon: '🤴', desc: '250 nights on time. A quarter-thousand bedtimes honored.', req: {"type": "bedtimeTotal", "count": 250} },
    { id: 'sleep_400', cat: 'sleep', name: 'Sleep Emperor', icon: '🏯', desc: '400 nights of keeping your bedtime promise. Over a year of discipline.', req: {"type": "bedtimeTotal", "count": 400} },
    // --- Focus ---
    { id: 'first_focus', cat: 'focus', name: 'First Thread', icon: '🧵', desc: 'You started a focus timer and actually finished it. That\'s the hardest step!', req: {"type": "sessions", "count": 1} },
    { id: 'five_sessions', cat: 'focus', name: 'Getting Started', icon: '🌱', desc: '5 focus sessions completed. You\'re getting the hang of deep work.', req: {"type": "sessions", "count": 5} },
    { id: 'ten_sessions', cat: 'focus', name: 'Shuttle Runner', icon: '🏃', desc: '10 sessions done. You\'ve spent real, distraction-free time on what matters.', req: {"type": "sessions", "count": 10} },
    { id: 'twentyfive_sess', cat: 'focus', name: 'Quarter Century', icon: '🎖️', desc: '25 focus sessions in the books. You\'re building serious momentum.', req: {"type": "sessions", "count": 25} },
    { id: 'fifty_sessions', cat: 'focus', name: 'Loom Veteran', icon: '⚙️', desc: '50 sessions completed. Half a hundred times you chose focus over distraction.', req: {"type": "sessions", "count": 50} },
    { id: 'century_focus', cat: 'focus', name: 'Centurion', icon: '💯', desc: '100 focus sessions! Triple digits. You\'re a certified focus machine.', req: {"type": "sessions", "count": 100} },
    { id: 'focus_250', cat: 'focus', name: 'Loom Addict', icon: '🧲', desc: '250 sessions. You keep coming back and putting in the work. Respect.', req: {"type": "sessions", "count": 250} },
    { id: 'focus_500', cat: 'focus', name: 'Iron Will', icon: '🔥', desc: '500 focus sessions completed. That\'s hundreds of hours of deep work.', req: {"type": "sessions", "count": 500} },
    { id: 'focus_1000', cat: 'focus', name: 'Thousand Threads', icon: '🧨', desc: '1,000 sessions. A thousand times you sat down and got things done.', req: {"type": "sessions", "count": 1000} },
    { id: 'focus_2500', cat: 'focus', name: 'Thread Titan', icon: '🦾', desc: '2,500 sessions. At this point, focusing is just what you do.', req: {"type": "sessions", "count": 2500} },
    { id: 'focus_5000', cat: 'focus', name: 'Five Thousand Fibers', icon: '🌀', desc: '5,000 focus sessions. This is beyond dedication — it\'s who you are.', req: {"type": "sessions", "count": 5000} },
    { id: 'focus_10000', cat: 'focus', name: 'Eternal Weaver', icon: '🌌', desc: '10,000 sessions completed. Malcolm Gladwell would be proud.', req: {"type": "sessions", "count": 10000} },
    { id: 'streak_3', cat: 'focus', name: 'Hat Trick', icon: '🎩', desc: 'You came back and focused 3 days in a row. Consistency is everything.', req: {"type": "streak", "count": 3} },
    { id: 'streak_7', cat: 'focus', name: 'Weekly Weaver', icon: '📅', desc: 'A full week of returning every day to focus. Seven for seven.', req: {"type": "streak", "count": 7} },
    { id: 'streak_14', cat: 'focus', name: 'Fortnight Focus', icon: '💪', desc: 'Two straight weeks of daily focus sessions. You didn\'t skip a single day.', req: {"type": "streak", "count": 14} },
    { id: 'streak_21', cat: 'focus', name: 'Three-Week Weave', icon: '🎯', desc: '21 days in a row. You\'ve turned daily focus into an unshakable habit.', req: {"type": "streak", "count": 21} },
    { id: 'streak_30', cat: 'focus', name: 'Monthly Master', icon: '📆', desc: '30 consecutive days of focus. A full month of showing up every single day.', req: {"type": "streak", "count": 30} },
    { id: 'streak_60', cat: 'focus', name: 'Bimonthly Boss', icon: '🥊', desc: '60 days straight. Two months of daily, unbroken focus sessions.', req: {"type": "streak", "count": 60} },
    { id: 'streak_90', cat: 'focus', name: 'Quarterly Queen', icon: '👸', desc: '90 days in a row. A full quarter of daily commitment without a gap.', req: {"type": "streak", "count": 90} },
    { id: 'streak_180', cat: 'focus', name: 'Half-Year Hero', icon: '🦸', desc: '180 consecutive days. Half a year of never missing a day. Superhuman.', req: {"type": "streak", "count": 180} },
    { id: 'streak_365', cat: 'focus', name: 'Full Year Focus', icon: '🏆', desc: 'You focused every single day for an entire year. 365 days. No breaks.', req: {"type": "streak", "count": 365} },
    { id: 'combo_3', cat: 'focus', name: 'Triple Threat', icon: '⚡', desc: 'You completed 3 focus sessions back-to-back in one sitting. Warming up!', req: {"type": "combo", "count": 3} },
    { id: 'combo_5', cat: 'focus', name: 'High Five', icon: '🖐️', desc: '5 sessions in a row without stopping. You\'re in the zone.', req: {"type": "combo", "count": 5} },
    { id: 'combo_10', cat: 'focus', name: 'Combo King', icon: '⚡', desc: 'A 10x combo! Ten consecutive sessions in one sitting. Deep flow state.', req: {"type": "combo", "count": 10} },
    { id: 'combo_15', cat: 'focus', name: 'Combo Crusher', icon: '💥', desc: '15 sessions chained together. You\'re locked in and unstoppable.', req: {"type": "combo", "count": 15} },
    { id: 'combo_20', cat: 'focus', name: 'Combo Demon', icon: '😈', desc: '20x combo. That\'s hours of uninterrupted, laser-focused work.', req: {"type": "combo", "count": 20} },
    { id: 'combo_25', cat: 'focus', name: 'Quarter-Century Combo', icon: '💎', desc: '25 sessions back-to-back. Your focus endurance is elite.', req: {"type": "combo", "count": 25} },
    { id: 'combo_50', cat: 'focus', name: 'Unstoppable', icon: '🚀', desc: 'A 50x combo. Fifty consecutive focus sessions. That\'s almost inhuman.', req: {"type": "combo", "count": 50} },
    { id: 'combo_100', cat: 'focus', name: 'Combo Deity', icon: '🌟', desc: '100 sessions in a row. A hundred consecutive focus rounds. Absolute deity.', req: {"type": "combo", "count": 100} },
    { id: 'blocks_10', cat: 'focus', name: 'First Hour', icon: '⏰', desc: 'You\'ve woven 10 textiles — that\'s over 1.5 hours of total focused time.', req: {"type": "lifetimeBlocks", "count": 10} },
    { id: 'blocks_50', cat: 'focus', name: 'Half-Day Hustler', icon: '💼', desc: '50 textiles woven. You\'ve spent over 8 hours in deep focus overall.', req: {"type": "lifetimeBlocks", "count": 50} },
    { id: 'blocks_100', cat: 'focus', name: 'Century Cloth', icon: '🧶', desc: '100 textiles! That\'s more than 16 hours of focused work across your sessions.', req: {"type": "lifetimeBlocks", "count": 100} },
    { id: 'blocks_250', cat: 'focus', name: 'Bolt Maker', icon: '📦', desc: '250 textiles woven — over 41 hours of productive, focused time.', req: {"type": "lifetimeBlocks", "count": 250} },
    { id: 'blocks_500', cat: 'focus', name: 'Loom Legend', icon: '🏰', desc: '500 textiles! You\'ve spent 83+ hours doing real, distraction-free work.', req: {"type": "lifetimeBlocks", "count": 500} },
    { id: 'blocks_1000', cat: 'focus', name: 'Thousand Bolts', icon: '🏭', desc: '1,000 textiles woven. Over 166 hours of focused time. That\'s incredible.', req: {"type": "lifetimeBlocks", "count": 1000} },
    { id: 'blocks_2500', cat: 'focus', name: 'Industrial Weaver', icon: '🛠️', desc: '2,500 textiles — more than 416 hours of deep work. Over 17 full days.', req: {"type": "lifetimeBlocks", "count": 2500} },
    { id: 'blocks_5000', cat: 'focus', name: 'Textile Empire', icon: '🌍', desc: '5,000 textiles. 833+ hours focused. You\'ve spent over a month in flow.', req: {"type": "lifetimeBlocks", "count": 5000} },
    { id: 'blocks_10000', cat: 'focus', name: 'Ten Thousand Threads', icon: '🪐', desc: '10,000 textiles woven. 1,666+ hours. That\'s 69 full days of pure focus.', req: {"type": "lifetimeBlocks", "count": 10000} },
    { id: 'blocks_25', cat: 'focus', name: 'Quarter Bolt', icon: '🧵', desc: '25 textiles woven — that\'s over 4 hours of total focused time.', req: {"type": "lifetimeBlocks", "count": 25} },
    { id: 'blocks_750', cat: 'focus', name: 'Master Weaver', icon: '🏵️', desc: '750 textiles! You\'ve spent 125 hours in deep focus. Over 5 full days.', req: {"type": "lifetimeBlocks", "count": 750} },
    { id: 'blocks_1500', cat: 'focus', name: 'Textile Tycoon', icon: '💰', desc: '1,500 textiles woven. 250 hours of focused work. That\'s ten full days.', req: {"type": "lifetimeBlocks", "count": 1500} },
    { id: 'blocks_3500', cat: 'focus', name: 'Cloth Colossus', icon: '🗿', desc: '3,500 textiles. 583 hours. You\'ve spent over 24 straight days focusing.', req: {"type": "lifetimeBlocks", "count": 3500} },
    { id: 'blocks_7500', cat: 'focus', name: 'Fiber Pharaoh', icon: '🏺', desc: '7,500 textiles. 1,250 hours focused. That\'s 52 full days of deep work.', req: {"type": "lifetimeBlocks", "count": 7500} },
    { id: 'combo_7', cat: 'focus', name: 'Lucky Seven', icon: '🍀', desc: '7 sessions in a row. You hit the lucky number without stopping.', req: {"type": "combo", "count": 7} },
    { id: 'combo_30', cat: 'focus', name: 'Thirty Stack', icon: '📚', desc: '30 consecutive sessions. You sat there and stacked thirty rounds of focus.', req: {"type": "combo", "count": 30} },
    { id: 'combo_75', cat: 'focus', name: 'Marathon Mind', icon: '🏃‍♂️', desc: '75 sessions chained. That\'s a mental marathon and then some.', req: {"type": "combo", "count": 75} },
    { id: 'focus_75', cat: 'focus', name: 'Three Quarters', icon: '🌙', desc: '75 focus sessions. Three-quarters of the way to your first hundred.', req: {"type": "sessions", "count": 75} },
    { id: 'focus_150', cat: 'focus', name: 'Sesquicentennial', icon: '🎉', desc: '150 sessions completed. One hundred and fifty times you chose to focus.', req: {"type": "sessions", "count": 150} },
    { id: 'focus_750', cat: 'focus', name: 'Relentless', icon: '🛡️', desc: '750 sessions. You just don\'t quit. Seven hundred and fifty rounds of work.', req: {"type": "sessions", "count": 750} },
    { id: 'streak_5', cat: 'focus', name: 'School Week', icon: '📚', desc: '5 days in a row of coming back to focus. A full school week!', req: {"type": "streak", "count": 5} },
    { id: 'streak_10', cat: 'focus', name: 'Ten-Day Tenacity', icon: '💪', desc: '10 consecutive days of showing up. Double-digit dedication.', req: {"type": "streak", "count": 10} },
    // --- Social ---
    { id: 'first_friend', cat: 'social', name: 'Companion', icon: '🤝', desc: 'You added your first friend. Now someone else can see your progress!', req: {"type": "friends", "count": 1} },
    { id: 'social_duo', cat: 'social', name: 'Dynamic Duo', icon: '👯', desc: 'You\'ve got 2 friends on the platform. Accountability partners engaged.', req: {"type": "friends", "count": 2} },
    { id: 'social_circle', cat: 'social', name: 'Social Circle', icon: '🫂', desc: '3 friends connected. You\'re building a little focus community.', req: {"type": "friends", "count": 3} },
    { id: 'social_squad', cat: 'social', name: 'Squad Goals', icon: '👪', desc: '5 friends! You\'ve got a proper squad keeping each other accountable.', req: {"type": "friends", "count": 5} },
    { id: 'social_popular', cat: 'social', name: 'Popular', icon: '😎', desc: '7 friends on your list. People want to track progress alongside you.', req: {"type": "friends", "count": 7} },
    { id: 'social_influencer', cat: 'social', name: 'Influencer', icon: '📱', desc: '10 friends! You\'re becoming a hub in the focus community.', req: {"type": "friends", "count": 10} },
    { id: 'social_celebrity', cat: 'social', name: 'Celebrity', icon: '🌟', desc: '15 friends. Your profile is getting noticed.', req: {"type": "friends", "count": 15} },
    { id: 'social_famous', cat: 'social', name: 'Famous', icon: '📸', desc: '20 friends connected. You\'re a well-known face around here.', req: {"type": "friends", "count": 20} },
    { id: 'social_icon', cat: 'social', name: 'Social Icon', icon: '👑', desc: '25 friends! A quarter-hundred people are watching your journey.', req: {"type": "friends", "count": 25} },
    { id: 'social_mogul', cat: 'social', name: 'Social Mogul', icon: '💎', desc: '50 friends. You\'ve built a genuine network of accountability partners.', req: {"type": "friends", "count": 50} },
    { id: 'profile_pic', cat: 'social', name: 'Self-Portrait', icon: '🎨', desc: 'You created a pixel art avatar and set it as your profile picture.', req: {"type": "profilePic", "count": 1} },
    { id: 'display_name', cat: 'social', name: 'Named', icon: '🏷️', desc: 'You chose a display name so friends can recognize you.', req: {"type": "displayName", "count": 1} },
    { id: 'full_profile', cat: 'social', name: 'Complete Profile', icon: '✅', desc: 'You set both a display name and profile picture. Your identity is complete!', req: {"type": "fullProfile", "count": 1} },
    { id: 'networker', cat: 'social', name: 'Networker', icon: '🌐', desc: 'You\'ve connected with 5 friends who have display names set up.', req: {"type": "friends", "count": 5} },
    { id: 'party_starter', cat: 'social', name: 'Party Starter', icon: '🎉', desc: '3 friends joined! You started a little focus party.', req: {"type": "friends", "count": 3} },
    { id: 'hype_crew', cat: 'social', name: 'Hype Crew', icon: '🥳', desc: '8 friends on board. Your hype crew is assembled.', req: {"type": "friends", "count": 8} },
    { id: 'social_butterfly', cat: 'social', name: 'Social Butterfly', icon: '🦋', desc: '12 friends! You\'re connecting with people left and right.', req: {"type": "friends", "count": 12} },
    { id: 'guild_leader', cat: 'social', name: 'Guild Leader', icon: '🏰', desc: '30 friends. You could run a whole guild at this point.', req: {"type": "friends", "count": 30} },
    { id: 'social_trio', cat: 'social', name: 'The Trio', icon: '👨‍👧‍👦', desc: 'You, plus 3 friends. A proper trio of accountability partners.', req: {"type": "friends", "count": 3} },
    { id: 'social_crew_6', cat: 'social', name: 'Full Crew', icon: '🛶', desc: '6 friends! You\'ve got a full crew rowing together.', req: {"type": "friends", "count": 6} },
    { id: 'social_army', cat: 'social', name: 'Small Army', icon: '🛡️', desc: '40 friends. You\'ve assembled a small army of focused people.', req: {"type": "friends", "count": 40} },
    // --- Mastery ---
    { id: 'level_3', cat: 'mastery', name: 'Beginner', icon: '🔰', desc: 'You reached level 3. You\'ve earned enough XP from focus sessions to level up twice!', req: {"type": "level", "count": 3} },
    { id: 'level_5', cat: 'mastery', name: 'Novice', icon: '📖', desc: 'Level 5! Every focus session earns XP, and you\'ve stacked up enough for 5 levels.', req: {"type": "level", "count": 5} },
    { id: 'level_10', cat: 'mastery', name: 'Apprentice', icon: '📜', desc: 'Level 10 reached. Double digits — you\'re past the beginner stage.', req: {"type": "level", "count": 10} },
    { id: 'level_15', cat: 'mastery', name: 'Sophomore', icon: '🎓', desc: 'Level 15. Your XP from completing focus sessions keeps climbing.', req: {"type": "level", "count": 15} },
    { id: 'level_20', cat: 'mastery', name: 'Skilled', icon: '🔧', desc: 'Level 20! Each level takes more XP than the last, and you\'re still rising.', req: {"type": "level", "count": 20} },
    { id: 'level_25', cat: 'mastery', name: 'Journeyman', icon: '🗡️', desc: 'Level 25. A quarter of the way to 100. The grind is real.', req: {"type": "level", "count": 25} },
    { id: 'level_30', cat: 'mastery', name: 'Adept', icon: '🔮', desc: 'Level 30. Thirty levels of accumulated focus work. Impressive.', req: {"type": "level", "count": 30} },
    { id: 'level_40', cat: 'mastery', name: 'Veteran', icon: '🎖️', desc: 'Level 40. The XP curve gets steeper but you keep pushing through.', req: {"type": "level", "count": 40} },
    { id: 'level_50', cat: 'mastery', name: 'Master', icon: '🏛️', desc: 'Level 50! Halfway to the century mark. You\'ve earned massive XP.', req: {"type": "level", "count": 50} },
    { id: 'level_60', cat: 'mastery', name: 'Sage', icon: '🧙', desc: 'Level 60. Most people never get here. You did.', req: {"type": "level", "count": 60} },
    { id: 'level_75', cat: 'mastery', name: 'Elder', icon: '📕', desc: 'Level 75. Three-quarters of the way to 100. The summit is in sight.', req: {"type": "level", "count": 75} },
    { id: 'level_100', cat: 'mastery', name: 'Grandmaster', icon: '🌟', desc: 'Level 100! Triple digits. You\'ve earned an enormous amount of XP from focus work.', req: {"type": "level", "count": 100} },
    { id: 'level_125', cat: 'mastery', name: 'Legend', icon: '🏅', desc: 'Level 125. You blew past 100 and kept going. Legendary territory.', req: {"type": "level", "count": 125} },
    { id: 'level_150', cat: 'mastery', name: 'Mythic', icon: '🐉', desc: 'Level 150. The XP required at this point is staggering.', req: {"type": "level", "count": 150} },
    { id: 'level_200', cat: 'mastery', name: 'Demigod', icon: '🔥', desc: 'Level 200. Two hundred levels of accumulated focus mastery.', req: {"type": "level", "count": 200} },
    { id: 'level_300', cat: 'mastery', name: 'Titan', icon: '🌋', desc: 'Level 300. At this level the XP requirements are astronomical. You earned every point.', req: {"type": "level", "count": 300} },
    { id: 'level_500', cat: 'mastery', name: 'Transcendent', icon: '🪐', desc: 'Level 500. Five hundred levels. This might be the most impressive thing on your profile.', req: {"type": "level", "count": 500} },
    { id: 'rich_100', cat: 'mastery', name: 'First Paycheck', icon: '💵', desc: 'You\'ve earned $100 total from completing focus sessions. First real payday!', req: {"type": "lifetimeCoins", "count": 100} },
    { id: 'rich_500', cat: 'mastery', name: 'Pocket Change', icon: '🪙', desc: 'You\'ve earned $500 lifetime. Focus sessions pay off — literally.', req: {"type": "lifetimeCoins", "count": 500} },
    { id: 'rich_1000', cat: 'mastery', name: 'First Fortune', icon: '💰', desc: '$1,000 earned across all your focus sessions. Your first fortune.', req: {"type": "lifetimeCoins", "count": 1000} },
    { id: 'rich_5000', cat: 'mastery', name: 'Five Grand', icon: '💳', desc: '$5,000 lifetime earnings. Five grand from sheer productivity.', req: {"type": "lifetimeCoins", "count": 5000} },
    { id: 'rich_10000', cat: 'mastery', name: 'Textile Mogul', icon: '💎', desc: '$10,000 earned! Five figures of coins from focused work.', req: {"type": "lifetimeCoins", "count": 10000} },
    { id: 'rich_25000', cat: 'mastery', name: 'Quarter-Millionaire', icon: '🤑', desc: '$25,000 lifetime. A quarter of the way to six figures.', req: {"type": "lifetimeCoins", "count": 25000} },
    { id: 'rich_50000', cat: 'mastery', name: 'Money Machine', icon: '🎰', desc: '$50,000 earned. Halfway to $100K — all from focus sessions and productivity.', req: {"type": "lifetimeCoins", "count": 50000} },
    { id: 'rich_100000', cat: 'mastery', name: 'Six Figures', icon: '🏦', desc: 'Six figures! $100,000 earned across your entire journey. Incredible.', req: {"type": "lifetimeCoins", "count": 100000} },
    { id: 'rich_250000', cat: 'mastery', name: 'Cloth Rothschild', icon: '🏰', desc: '$250,000 lifetime. A quarter million coins earned through discipline.', req: {"type": "lifetimeCoins", "count": 250000} },
    { id: 'rich_500000', cat: 'mastery', name: 'Half-Millionaire', icon: '💸', desc: 'Half a million dollars earned. $500,000 from pure productivity.', req: {"type": "lifetimeCoins", "count": 500000} },
    { id: 'rich_1000000', cat: 'mastery', name: 'Millionaire', icon: '👑', desc: 'One million dollars earned. $1,000,000. You are the definition of productivity.', req: {"type": "lifetimeCoins", "count": 1000000} },
    { id: 'hoard_1000', cat: 'mastery', name: 'Saver', icon: '📥', desc: 'You\'re holding $1,000 in your wallet right now without spending it.', req: {"type": "currentCoins", "count": 1000} },
    { id: 'hoard_5000', cat: 'mastery', name: 'Thrifty', icon: '🧰', desc: '$5,000 saved up at once. You\'re resisting the urge to spend.', req: {"type": "currentCoins", "count": 5000} },
    { id: 'hoard_10000', cat: 'mastery', name: 'Nest Egg', icon: '🥚', desc: '$10,000 sitting in your wallet. That\'s serious self-control.', req: {"type": "currentCoins", "count": 10000} },
    { id: 'hoard_25000', cat: 'mastery', name: 'War Chest', icon: '📦', desc: '$25,000 hoarded. You could buy a lot of upgrades but you\'re saving.', req: {"type": "currentCoins", "count": 25000} },
    { id: 'hoard_50000', cat: 'mastery', name: 'Dragon Hoard', icon: '🐲', desc: '$50,000 in the bank at once. Are you saving for something big?', req: {"type": "currentCoins", "count": 50000} },
    { id: 'hoard_100000', cat: 'mastery', name: 'Scrooge', icon: '🦳', desc: '$100,000 held at once. Six figures in the wallet. Maximum restraint.', req: {"type": "currentCoins", "count": 100000} },
    { id: 'hoard_500000', cat: 'mastery', name: 'Vault Keeper', icon: '🔒', desc: 'Half a million dollars in your wallet right now. What are you saving for?!', req: {"type": "currentCoins", "count": 500000} },
    { id: 'level_7', cat: 'mastery', name: 'Lucky Level', icon: '🍀', desc: 'Level 7! You\'ve earned enough XP from focus sessions to pass the lucky number.', req: {"type": "level", "count": 7} },
    { id: 'level_35', cat: 'mastery', name: 'Mid-Career', icon: '💼', desc: 'Level 35. You\'re deep into the grind now. Serious XP accumulated.', req: {"type": "level", "count": 35} },
    { id: 'level_90', cat: 'mastery', name: 'Almost There', icon: '🏁', desc: 'Level 90! Just ten more to the century. The finish line is so close.', req: {"type": "level", "count": 90} },
    { id: 'level_175', cat: 'mastery', name: 'Overlord', icon: '🦹', desc: 'Level 175. You\'ve gone far beyond what most players will ever see.', req: {"type": "level", "count": 175} },
    { id: 'level_250', cat: 'mastery', name: 'Quarter Thousand', icon: '🌌', desc: 'Level 250. A quarter of a thousand levels. The XP numbers are enormous.', req: {"type": "level", "count": 250} },
    { id: 'level_400', cat: 'mastery', name: 'Ascendant', icon: '🪐', desc: 'Level 400. Four hundred levels earned through sheer focused work.', req: {"type": "level", "count": 400} },
    { id: 'rich_2500', cat: 'mastery', name: 'Comfortable', icon: '🛋️', desc: '$2,500 lifetime earnings. You\'re sitting pretty comfortably.', req: {"type": "lifetimeCoins", "count": 2500} },
    { id: 'rich_75000', cat: 'mastery', name: 'Almost Six Figs', icon: '💴', desc: '$75,000 earned. You\'re knocking on the door of six figures.', req: {"type": "lifetimeCoins", "count": 75000} },
    { id: 'hoard_2500', cat: 'mastery', name: 'Piggy Bank', icon: '🐖', desc: '$2,500 in your wallet at once. Your piggy bank is getting heavy.', req: {"type": "currentCoins", "count": 2500} },
    { id: 'hoard_75000', cat: 'mastery', name: 'Fort Knox', icon: '🏦', desc: '$75,000 held at once. Your vault rivals Fort Knox.', req: {"type": "currentCoins", "count": 75000} },
    { id: 'hoard_250000', cat: 'mastery', name: 'Untouchable Wealth', icon: '💠', desc: '$250,000 in the wallet. A quarter million sitting there. Unspent.', req: {"type": "currentCoins", "count": 250000} },
    // --- Creative ---
    { id: 'gallery_1', cat: 'creative', name: 'First Masterpiece', icon: '🖼️', desc: 'You saved your first pixel art creation to the gallery. Your first masterpiece!', req: {"type": "gallery", "count": 1} },
    { id: 'gallery_3', cat: 'creative', name: 'Small Exhibition', icon: '🎨', desc: '3 artworks saved. You\'re starting a small collection.', req: {"type": "gallery", "count": 3} },
    { id: 'gallery_5', cat: 'creative', name: 'Gallery Opening', icon: '🖼️', desc: '5 pieces in the gallery. You\'re becoming a regular pixel artist.', req: {"type": "gallery", "count": 5} },
    { id: 'gallery_10', cat: 'creative', name: 'Curator', icon: '🧑‍🎨', desc: '10 artworks saved! Your gallery is filling up with your creations.', req: {"type": "gallery", "count": 10} },
    { id: 'gallery_25', cat: 'creative', name: 'Art Collector', icon: '🏛️', desc: '25 pieces of pixel art saved. You\'ve got a proper art collection.', req: {"type": "gallery", "count": 25} },
    { id: 'gallery_50', cat: 'creative', name: 'Museum Director', icon: '🏟️', desc: '50 artworks! Your gallery could fill a small museum.', req: {"type": "gallery", "count": 50} },
    { id: 'gallery_100', cat: 'creative', name: 'Louvre Rival', icon: '🌍', desc: '100 artworks saved. A century of pixel art creations. Incredible output.', req: {"type": "gallery", "count": 100} },
    { id: 'gallery_250', cat: 'creative', name: 'Prolific Painter', icon: '🎨', desc: '250 pieces! You\'re one of the most prolific pixel artists on the platform.', req: {"type": "gallery", "count": 250} },
    { id: 'canvas_12', cat: 'creative', name: 'Bigger Canvas', icon: '📐', desc: 'You upgraded to a 12x12 canvas — 44% more pixels to work with!', req: {"type": "canvasSize", "count": 12} },
    { id: 'canvas_16', cat: 'creative', name: 'Sweet Sixteen', icon: '🎂', desc: '16x16 canvas unlocked! Four times the area of the starter canvas.', req: {"type": "canvasSize", "count": 16} },
    { id: 'canvas_24', cat: 'creative', name: 'Full Frame', icon: '🖼️', desc: '24x24 canvas! That\'s 576 pixels — nine times the original.', req: {"type": "canvasSize", "count": 24} },
    { id: 'canvas_32', cat: 'creative', name: 'High Resolution', icon: '📺', desc: '32x32 canvas unlocked. Now you can create truly detailed pixel art.', req: {"type": "canvasSize", "count": 32} },
    { id: 'canvas_48', cat: 'creative', name: 'Ultra Canvas', icon: '🖥️', desc: '48x48 canvas! 2,304 pixels. Massive creative space.', req: {"type": "canvasSize", "count": 48} },
    { id: 'canvas_64', cat: 'creative', name: 'Pixel Perfectionist', icon: '🤩', desc: '64x64 canvas unlocked. The biggest canvas available. 4,096 pixels of pure creativity.', req: {"type": "canvasSize", "count": 64} },
    { id: 'dye_1', cat: 'creative', name: 'Color Curious', icon: '🌈', desc: 'You invested in dye research level 1. New colors and cheaper canvas upgrades!', req: {"type": "dyeResearch", "count": 1} },
    { id: 'dye_3', cat: 'creative', name: 'Color Theory', icon: '🎨', desc: 'Dye research level 3. Your color palette is expanding nicely.', req: {"type": "dyeResearch", "count": 3} },
    { id: 'dye_5', cat: 'creative', name: 'Master Dyer', icon: '🧪', desc: 'Dye research level 5. You\'re becoming a true color specialist.', req: {"type": "dyeResearch", "count": 5} },
    { id: 'dye_8', cat: 'creative', name: 'Chromatic Wizard', icon: '🪄', desc: 'Dye research level 8. Your palette is getting exotic.', req: {"type": "dyeResearch", "count": 8} },
    { id: 'dye_10', cat: 'creative', name: 'Spectrum Lord', icon: '🌌', desc: 'Max dye research! You\'ve unlocked the full spectrum of available colors.', req: {"type": "dyeResearch", "count": 10} },
    { id: 'first_sale', cat: 'creative', name: 'First Sale', icon: '💲', desc: 'You sold a canvas creation for the first time. You\'re an artist AND a businessperson.', req: {"type": "loomSales", "count": 1} },
    { id: 'gallery_2', cat: 'creative', name: 'Second Canvas', icon: '🖌️', desc: 'You saved a second artwork. The first wasn\'t a fluke!', req: {"type": "gallery", "count": 2} },
    { id: 'gallery_15', cat: 'creative', name: 'Mini Museum', icon: '🏛️', desc: '15 artworks saved. You\'re curating a proper mini museum.', req: {"type": "gallery", "count": 15} },
    { id: 'gallery_75', cat: 'creative', name: 'Prolific Creator', icon: '🖼️', desc: '75 pixel art pieces saved. Your creative output is impressive.', req: {"type": "gallery", "count": 75} },
    { id: 'canvas_10', cat: 'creative', name: 'First Upgrade', icon: '📏', desc: 'You upgraded to a 10x10 canvas. A little more room to express yourself!', req: {"type": "canvasSize", "count": 10} },
    // --- Business ---
    { id: 'first_hire', cat: 'business', name: 'First Hire', icon: '👤', desc: 'You hired your first employee! They\'ll help you earn passive income over time.', req: {"type": "employees", "count": 1} },
    { id: 'small_team', cat: 'business', name: 'Small Team', icon: '👥', desc: 'Employee level 2. Your small team is growing.', req: {"type": "employees", "count": 2} },
    { id: 'growing_team', cat: 'business', name: 'Growing Company', icon: '📈', desc: 'Employee level 3. You\'re running a real operation now.', req: {"type": "employees", "count": 3} },
    { id: 'department', cat: 'business', name: 'Department Head', icon: '🏢', desc: 'Employee level 4. You\'ve got a proper department working for you.', req: {"type": "employees", "count": 4} },
    { id: 'corporation', cat: 'business', name: 'Corporation', icon: '🏢', desc: 'Employee level 5. Your workforce is a legitimate corporation.', req: {"type": "employees", "count": 5} },
    { id: 'enterprise', cat: 'business', name: 'Enterprise', icon: '🌍', desc: 'Employee level 7. You\'re running a full enterprise operation.', req: {"type": "employees", "count": 7} },
    { id: 'conglomerate', cat: 'business', name: 'Conglomerate', icon: '🏰', desc: 'Employee level 10. Maximum workforce. You\'re a textile conglomerate.', req: {"type": "employees", "count": 10} },
    { id: 'broker_unlocked', cat: 'business', name: 'Wall Street', icon: '📉', desc: 'You unlocked the stock brokerage! You can now buy and sell stocks.', req: {"type": "brokerageUnlocked", "count": 1} },
    { id: 'first_stock', cat: 'business', name: 'First Investment', icon: '💹', desc: 'You bought your first stock. Welcome to the market!', req: {"type": "stocksBought", "count": 1} },
    { id: 'diversified', cat: 'business', name: 'Diversified', icon: '📊', desc: 'You own 3 different stocks. Smart — diversification reduces risk.', req: {"type": "stocksOwned", "count": 3} },
    { id: 'portfolio_5', cat: 'business', name: 'Portfolio Pro', icon: '📋', desc: '5 different stocks in your portfolio. You\'re a well-diversified investor.', req: {"type": "stocksOwned", "count": 5} },
    { id: 'survived_crash', cat: 'business', name: 'Crash Survivor', icon: '💥', desc: 'You lived through a market crash event. Your portfolio took a hit but you survived.', req: {"type": "marketEvents", "count": 1} },
    { id: 'canvas_buyer_2', cat: 'business', name: 'Canvas Shopper', icon: '🛒', desc: 'You\'ve purchased 2 different canvas sizes. More space for art!', req: {"type": "canvasCount", "count": 2} },
    { id: 'canvas_buyer_3', cat: 'business', name: 'Canvas Collector', icon: '🛒', desc: '3 canvas sizes purchased. You\'re investing in your creative tools.', req: {"type": "canvasCount", "count": 3} },
    { id: 'canvas_buyer_5', cat: 'business', name: 'Canvas Mogul', icon: '🛒', desc: '5 canvas sizes purchased! You\'ve got canvases for every occasion.', req: {"type": "canvasCount", "count": 5} },
    { id: 'sales_100', cat: 'business', name: 'Art Dealer', icon: '💵', desc: 'You\'ve earned $100 from selling your pixel art creations.', req: {"type": "loomSalesCoins", "count": 100} },
    { id: 'sales_500', cat: 'business', name: 'Gallery Owner', icon: '🏠', desc: '$500 from art sales. Your creations are worth real (virtual) money.', req: {"type": "loomSalesCoins", "count": 500} },
    { id: 'sales_1000', cat: 'business', name: 'Art Empire', icon: '🏛️', desc: '$1,000 earned from loom sales. Your art business is thriving.', req: {"type": "loomSalesCoins", "count": 1000} },
    { id: 'sales_5000', cat: 'business', name: 'Auction House', icon: '🏟️', desc: '$5,000 from selling artwork. You\'re running a profitable gallery.', req: {"type": "loomSalesCoins", "count": 5000} },
    { id: 'sales_10000', cat: 'business', name: 'Art Magnate', icon: '💎', desc: '$10,000 from art sales alone. You\'ve built an art empire.', req: {"type": "loomSalesCoins", "count": 10000} },
    { id: 'sales_250', cat: 'business', name: 'Art Merchant', icon: '🏪', desc: 'You\'ve earned $250 from selling your pixel art creations.', req: {"type": "loomSalesCoins", "count": 250} },
    { id: 'sales_2500', cat: 'business', name: 'Canvas Capitalist', icon: '💰', desc: '$2,500 earned from art sales. Your loom is a money-printing machine.', req: {"type": "loomSalesCoins", "count": 2500} },
    { id: 'canvas_buyer_4', cat: 'business', name: 'Canvas Hoarder', icon: '📦', desc: '4 canvas sizes purchased. You\'re collecting them like trading cards.', req: {"type": "canvasCount", "count": 4} },

    // ===== ENDGAME / ULTRA-HARD BADGES (v3.23.106) =====
    // These are meant to be nearly impossible, requiring months or years of play.
    // --- Sleep Endgame ---
    { id: 'sleep_eternal_1500', cat: 'sleep', name: 'Eternal Rest', icon: '⚰️', desc: '1,500 nights on time. Four years of keeping your bedtime promise. Unreal.', req: {"type": "bedtimeTotal", "count": 1500} },
    { id: 'sleep_2000', cat: 'sleep', name: 'Two Thousand Nights', icon: '🌠', desc: '2,000 bedtimes honored. Over five years of sleep discipline.', req: {"type": "bedtimeTotal", "count": 2000} },
    { id: 'sleep_3000', cat: 'sleep', name: 'Sleep Immortal', icon: '🕊️', desc: '3,000 nights on time. You are not a person — you are a sleep algorithm.', req: {"type": "bedtimeTotal", "count": 3000} },
    { id: 'streak_sleep_500', cat: 'sleep', name: 'Five Hundred Nights', icon: '🗿', desc: '500 nights in a row. Over 16 months without a single broken bedtime.', req: {"type": "bedtimeStreak", "count": 500} },
    { id: 'streak_sleep_730', cat: 'sleep', name: 'Two Perfect Years', icon: '🏛️', desc: '730 consecutive nights on time. Two full years of unbroken discipline.', req: {"type": "bedtimeStreak", "count": 730} },
    { id: 'streak_sleep_1000', cat: 'sleep', name: 'Thousand-Night Streak', icon: '🔱', desc: 'One thousand consecutive nights. Nearly three years without missing one.', req: {"type": "bedtimeStreak", "count": 1000} },

    // --- Focus Endgame ---
    { id: 'focus_15000', cat: 'focus', name: 'Fifteen Thousand', icon: '🏔️', desc: '15,000 sessions. You could have climbed Everest in the time you spent focusing.', req: {"type": "sessions", "count": 15000} },
    { id: 'focus_25000', cat: 'focus', name: 'Quarter-Hundred-K', icon: '🪨', desc: '25,000 sessions. Twenty-five thousand times you chose to sit down and work.', req: {"type": "sessions", "count": 25000} },
    { id: 'focus_50000', cat: 'focus', name: 'Fifty Thousand', icon: '🗻', desc: '50,000 focus sessions. This badge shouldn\'t exist. And yet here you are.', req: {"type": "sessions", "count": 50000} },
    { id: 'focus_100000', cat: 'focus', name: 'One Hundred Thousand', icon: '🌋', desc: '100,000 sessions. We genuinely did not think anyone would earn this.', req: {"type": "sessions", "count": 100000} },
    { id: 'streak_120', cat: 'focus', name: 'Four-Month Flame', icon: '🕯️', desc: '120 consecutive days. Four months of never missing a single day of focus.', req: {"type": "streak", "count": 120} },
    { id: 'streak_270', cat: 'focus', name: 'Nine-Month March', icon: '🫃', desc: '270 days straight. Nine months. You could have gestated a human.', req: {"type": "streak", "count": 270} },
    { id: 'streak_500', cat: 'focus', name: 'Five Hundred Days', icon: '🏺', desc: '500 consecutive days of daily focus. Over 16 months. Absurd.', req: {"type": "streak", "count": 500} },
    { id: 'streak_730', cat: 'focus', name: 'Two-Year Streak', icon: '📜', desc: '730 days in a row. Two full years of daily focus sessions. Inhuman.', req: {"type": "streak", "count": 730} },
    { id: 'streak_1000', cat: 'focus', name: 'Thousand-Day Streak', icon: '🔱', desc: '1,000 consecutive days. Nearly three years without missing one. Impossible made real.', req: {"type": "streak", "count": 1000} },
    { id: 'streak_1461', cat: 'focus', name: 'Four-Year Streak', icon: '⚜️', desc: '1,461 days. Four full years. An entire presidential term of daily focus.', req: {"type": "streak", "count": 1461} },
    { id: 'combo_150', cat: 'focus', name: 'Combo Legend', icon: '💫', desc: '150x combo. One hundred fifty sessions chained. You didn\'t eat or sleep, did you?', req: {"type": "combo", "count": 150} },
    { id: 'combo_200', cat: 'focus', name: 'Combo Immortal', icon: '☄️', desc: '200x combo. Two hundred consecutive sessions. The machine became sentient.', req: {"type": "combo", "count": 200} },
    { id: 'combo_500', cat: 'focus', name: 'Five Hundred Chain', icon: '⛓️', desc: '500 sessions back-to-back. If you\'re seeing this badge, we\'re concerned.', req: {"type": "combo", "count": 500} },
    { id: 'blocks_15000', cat: 'focus', name: 'Fifteen K Textiles', icon: '🏗️', desc: '15,000 textiles. 2,500 hours of focused time. Over 100 days of work.', req: {"type": "lifetimeBlocks", "count": 15000} },
    { id: 'blocks_25000', cat: 'focus', name: 'Twenty-Five Thousand', icon: '🗽', desc: '25,000 textiles. 4,166 hours. 173 full days of deep focus.', req: {"type": "lifetimeBlocks", "count": 25000} },
    { id: 'blocks_50000', cat: 'focus', name: 'Fifty Thousand Bolts', icon: '🌍', desc: '50,000 textiles. Over 8,300 hours. A full year of non-stop focus.', req: {"type": "lifetimeBlocks", "count": 50000} },
    { id: 'blocks_100000', cat: 'focus', name: 'Hundred K Textiles', icon: '🪐', desc: '100,000 textiles woven. We are not sure this is possible. Prove us wrong.', req: {"type": "lifetimeBlocks", "count": 100000} },

    // --- Mastery Endgame ---
    { id: 'level_750', cat: 'mastery', name: 'Three Quarter K', icon: '🌋', desc: 'Level 750. The XP requirements at this level are genuinely staggering.', req: {"type": "level", "count": 750} },
    { id: 'level_1000', cat: 'mastery', name: 'Level Thousand', icon: '🏛️', desc: 'Level 1,000. One thousand levels. If this game had a final boss, you\'d be it.', req: {"type": "level", "count": 1000} },
    { id: 'level_1500', cat: 'mastery', name: 'Beyond Mortal', icon: '👁️', desc: 'Level 1,500. We stopped writing level titles after 500 because we didn\'t think anyone would get here.', req: {"type": "level", "count": 1500} },
    { id: 'level_2000', cat: 'mastery', name: 'Two Thousand', icon: '🔮', desc: 'Level 2,000. This badge is a monument to patience. And possibly insanity.', req: {"type": "level", "count": 2000} },
    { id: 'rich_2000000', cat: 'mastery', name: 'Double Millionaire', icon: '💰', desc: '$2,000,000 lifetime earnings. Two million from pure productivity.', req: {"type": "lifetimeCoins", "count": 2000000} },
    { id: 'rich_5000000', cat: 'mastery', name: 'Multi-Millionaire', icon: '🏝️', desc: '$5,000,000 earned. Five million. You could buy a private island.', req: {"type": "lifetimeCoins", "count": 5000000} },
    { id: 'rich_10000000', cat: 'mastery', name: 'Deca-Millionaire', icon: '🛸', desc: '$10,000,000 lifetime. Ten million coins earned through sheer discipline.', req: {"type": "lifetimeCoins", "count": 10000000} },
    { id: 'rich_50000000', cat: 'mastery', name: 'Fifty Million', icon: '🌌', desc: '$50,000,000 earned. This is more money than some countries have.', req: {"type": "lifetimeCoins", "count": 50000000} },
    { id: 'rich_100000000', cat: 'mastery', name: 'Hundred Million', icon: '🏰', desc: '$100,000,000. One. Hundred. Million. Coins.', req: {"type": "lifetimeCoins", "count": 100000000} },
    { id: 'hoard_1000000', cat: 'mastery', name: 'Million in Pocket', icon: '🐉', desc: 'One million coins in your wallet at once. Not lifetime — held simultaneously.', req: {"type": "currentCoins", "count": 1000000} },
    { id: 'hoard_5000000', cat: 'mastery', name: 'Five Mil Hoard', icon: '🗝️', desc: '$5,000,000 held at once. Your wallet weighs more than your principles.', req: {"type": "currentCoins", "count": 5000000} },
    { id: 'hoard_10000000', cat: 'mastery', name: 'Infinite Restraint', icon: '♾️', desc: 'Ten million coins held simultaneously. You could buy everything. But you don\'t.', req: {"type": "currentCoins", "count": 10000000} },

    // --- Creative Endgame ---
    { id: 'gallery_500', cat: 'creative', name: 'Art Factory', icon: '🏭', desc: '500 artworks saved. Half a thousand pieces of pixel art.', req: {"type": "gallery", "count": 500} },
    { id: 'gallery_1000', cat: 'creative', name: 'Thousand Canvases', icon: '🌌', desc: '1,000 artworks saved. A thousand original pixel creations.', req: {"type": "gallery", "count": 1000} },
    { id: 'gallery_2500', cat: 'creative', name: 'Pixel Picasso', icon: '🎭', desc: '2,500 artworks. At this point you ARE the gallery.', req: {"type": "gallery", "count": 2500} },
    { id: 'sales_10', cat: 'creative', name: 'Ten Sales', icon: '💲', desc: 'You sold 10 canvases. People actually want your art!', req: {"type": "loomSales", "count": 10} },
    { id: 'sales_25', cat: 'creative', name: 'Quarter Century Sales', icon: '🏪', desc: '25 canvases sold. You have an established art business.', req: {"type": "loomSales", "count": 25} },
    { id: 'sales_50', cat: 'creative', name: 'Fifty Sales', icon: '🏬', desc: '50 canvases sold. Your art is in demand.', req: {"type": "loomSales", "count": 50} },
    { id: 'sales_100_count', cat: 'creative', name: 'Century Sales', icon: '🎪', desc: '100 canvas sales. One hundred different pieces bought.', req: {"type": "loomSales", "count": 100} },
    { id: 'sales_250_count', cat: 'creative', name: 'Gallery Tycoon', icon: '🏛️', desc: '250 canvases sold. Your gallery has a waiting list.', req: {"type": "loomSales", "count": 250} },

    // --- Business Endgame ---
    { id: 'sales_25000', cat: 'business', name: 'Art Baron', icon: '🏰', desc: '$25,000 from art sales. Twenty-five grand from pixel art alone.', req: {"type": "loomSalesCoins", "count": 25000} },
    { id: 'sales_50000', cat: 'business', name: 'Art Tycoon', icon: '🌍', desc: '$50,000 from selling artwork. Your gallery is a serious business.', req: {"type": "loomSalesCoins", "count": 50000} },
    { id: 'sales_100000', cat: 'business', name: 'Art Mogul', icon: '💎', desc: '$100,000 from art sales alone. Six figures from pixel art. Legendary.', req: {"type": "loomSalesCoins", "count": 100000} },
    { id: 'stocks_10', cat: 'business', name: 'Day Trader', icon: '📈', desc: 'You\'ve bought 10 stocks total. You\'re an active trader now.', req: {"type": "stocksBought", "count": 10} },
    { id: 'stocks_25', cat: 'business', name: 'Trading Desk', icon: '💻', desc: '25 stock purchases made. Your trading desk is busy.', req: {"type": "stocksBought", "count": 25} },
    { id: 'stocks_50', cat: 'business', name: 'Floor Trader', icon: '🏦', desc: '50 stock trades executed. You could work on Wall Street.', req: {"type": "stocksBought", "count": 50} },
    { id: 'stocks_100', cat: 'business', name: 'Hedge Fund', icon: '🏢', desc: '100 trades. You\'re running a one-person hedge fund.', req: {"type": "stocksBought", "count": 100} },
    { id: 'market_events_3', cat: 'business', name: 'Weathered Investor', icon: '🌧️', desc: 'Survived 3 market events. Crashes, booms, bubbles — you\'ve seen them all.', req: {"type": "marketEvents", "count": 3} },
    { id: 'market_events_5', cat: 'business', name: 'Battle-Scarred', icon: '⚔️', desc: '5 market events endured. Your portfolio has the scars to prove it.', req: {"type": "marketEvents", "count": 5} },
    { id: 'market_events_10', cat: 'business', name: 'Market Veteran', icon: '🎖️', desc: '10 market events survived. You\'ve been through every kind of market.', req: {"type": "marketEvents", "count": 10} },
    { id: 'market_events_25', cat: 'business', name: 'Market Immortal', icon: '🛡️', desc: '25 market events. Nothing the market throws at you can break you.', req: {"type": "marketEvents", "count": 25} },
    { id: 'portfolio_8', cat: 'business', name: 'Full Portfolio', icon: '📊', desc: '8 different stocks owned simultaneously. Maximum diversification.', req: {"type": "stocksOwned", "count": 8} },
    { id: 'portfolio_10', cat: 'business', name: 'Index Fund', icon: '📋', desc: '10 different stocks at once. You own a piece of everything.', req: {"type": "stocksOwned", "count": 10} },
    { id: 'employees_8', cat: 'business', name: 'Full Floor', icon: '🏗️', desc: 'Employee level 8. Your factory floor is packed.', req: {"type": "employees", "count": 8} },
    { id: 'canvas_buyer_6', cat: 'business', name: 'Canvas Empire', icon: '🎨', desc: '6 canvas sizes purchased. You own every available size.', req: {"type": "canvasCount", "count": 6} },
    { id: 'canvas_buyer_7', cat: 'business', name: 'Complete Collection', icon: '🏆', desc: '7 canvas sizes purchased. You\'ve bought the full set.', req: {"type": "canvasCount", "count": 7} },

    // --- Social Endgame ---
    { id: 'social_75', cat: 'social', name: 'Social Titan', icon: '🗿', desc: '75 friends! You\'re a social titan on the platform.', req: {"type": "friends", "count": 75} },
    { id: 'social_100', cat: 'social', name: 'Century Club', icon: '💯', desc: '100 friends. One hundred people watching your journey.', req: {"type": "friends", "count": 100} },
    { id: 'social_150', cat: 'social', name: 'Small Following', icon: '📢', desc: '150 friends. You have a legitimate following.', req: {"type": "friends", "count": 150} },
    { id: 'social_250', cat: 'social', name: 'Micro-Celebrity', icon: '🎬', desc: '250 friends. A quarter-thousand people connected to you.', req: {"type": "friends", "count": 250} },
    { id: 'social_500', cat: 'social', name: 'Social Phenomenon', icon: '🌊', desc: '500 friends. Half a thousand connections. You ARE the community.', req: {"type": "friends", "count": 500} },

    // --- Quests ---
    { id: 'quest_1', cat: 'quests', name: 'First Quest', icon: '⚔️', desc: 'You completed your first daily quest.', req: {"type": "questsCompleted", "count": 1} },
    { id: 'quest_5', cat: 'quests', name: 'Questbound', icon: '🗡️', desc: '5 quests completed.', req: {"type": "questsCompleted", "count": 5} },
    { id: 'quest_10', cat: 'quests', name: 'Quest Regular', icon: '🛡️', desc: '10 quests done. Double digits!', req: {"type": "questsCompleted", "count": 10} },
    { id: 'quest_25', cat: 'quests', name: 'Quest Veteran', icon: '🏹', desc: '25 quests completed.', req: {"type": "questsCompleted", "count": 25} },
    { id: 'quest_50', cat: 'quests', name: 'Questmaster', icon: '🧭', desc: '50 quests completed!', req: {"type": "questsCompleted", "count": 50} },
    { id: 'quest_100', cat: 'quests', name: 'Century Quester', icon: '👑', desc: '100 quests completed.', req: {"type": "questsCompleted", "count": 100} },
    { id: 'quest_250', cat: 'quests', name: 'Quest Legend', icon: '🔥', desc: '250 quests completed.', req: {"type": "questsCompleted", "count": 250} },
    { id: 'quest_500', cat: 'quests', name: 'Quest Titan', icon: '⚡', desc: '500 quests completed!', req: {"type": "questsCompleted", "count": 500} },
    { id: 'quest_1000', cat: 'quests', name: 'Thousand Quests', icon: '🌋', desc: '1,000 quests completed.', req: {"type": "questsCompleted", "count": 1000} },
    { id: 'quest_streak_3', cat: 'quests', name: 'Three-Quest Run', icon: '🔥', desc: '3-day quest streak.', req: {"type": "questStreak", "count": 3} },
    { id: 'quest_streak_7', cat: 'quests', name: 'Weekly Quest Warrior', icon: '🏆', desc: '7-day quest streak.', req: {"type": "questStreak", "count": 7} },
    { id: 'quest_streak_14', cat: 'quests', name: 'Fortnight Quester', icon: '💪', desc: '14-day quest streak.', req: {"type": "questStreak", "count": 14} },
    { id: 'quest_streak_30', cat: 'quests', name: 'Monthly Quest Master', icon: '🌟', desc: '30-day quest streak.', req: {"type": "questStreak", "count": 30} },
    { id: 'quest_streak_60', cat: 'quests', name: 'Quest Machine', icon: '🧠', desc: '60-day quest streak.', req: {"type": "questStreak", "count": 60} },
    { id: 'quest_streak_90', cat: 'quests', name: 'Quarter Quest', icon: '🏅', desc: '90-day quest streak.', req: {"type": "questStreak", "count": 90} },
    { id: 'quest_streak_180', cat: 'quests', name: 'Half-Year Quester', icon: '🌍', desc: '180-day quest streak.', req: {"type": "questStreak", "count": 180} },
    { id: 'quest_streak_365', cat: 'quests', name: 'Perfect Quest Year', icon: '🏛️', desc: '365-day quest streak.', req: {"type": "questStreak", "count": 365} },
    { id: 'quest_ambitious_1', cat: 'quests', name: 'First Ambitious', icon: '💎', desc: 'Completed your first ambitious quest.', req: {"type": "questsAmbitious", "count": 1} },
    { id: 'quest_ambitious_10', cat: 'quests', name: 'Risk Taker', icon: '👿', desc: '10 ambitious quests completed.', req: {"type": "questsAmbitious", "count": 10} },
    { id: 'quest_ambitious_25', cat: 'quests', name: 'Ambitious Regular', icon: '🚀', desc: '25 ambitious quests completed.', req: {"type": "questsAmbitious", "count": 25} },
    { id: 'quest_ambitious_50', cat: 'quests', name: 'Ambitious Veteran', icon: '⚡', desc: '50 ambitious quests completed.', req: {"type": "questsAmbitious", "count": 50} },
    { id: 'quest_ambitious_100', cat: 'quests', name: 'Ambitious Legend', icon: '🔥', desc: '100 ambitious quests completed.', req: {"type": "questsAmbitious", "count": 100} },
  ];

  var CAT_LABELS = {
    sleep:    { title: '🌙 SLEEP',    cls: 'sleep' },
    focus:    { title: '🎯 FOCUS',    cls: 'focus' },
    social:   { title: '👥 SOCIAL',   cls: 'social' },
    mastery:  { title: '⚔️ MASTERY', cls: 'mastery' },
    quests:   { title: '⚔️ QUESTS',  cls: 'quests' },
    creative: { title: '🎨 CREATIVE', cls: 'creative' },
    business: { title: '💼 BUSINESS', cls: 'business' }
  };

  var state = {};

  // ===== Compute which badges are earned based on current state =====
  function computeEarnedBadges() {
    if (!Array.isArray(state.badges)) state.badges = [];
    var earned = state.badges.slice();
    var changed = false;

    function getLevelFromXP(totalXP) {
      var level = 1, xpNeeded = 0;
      while (level < 999) {
        var next = (level + 1) * 50;
        if (xpNeeded + next > totalXP) return level;
        xpNeeded += next;
        level++;
      }
      return level;
    }

    var level = getLevelFromXP(state.xp || 0);
    var sessions = state.lifetimeSessions || state.totalLifetimeSessions || 0;
    var streak = state.longestStreak || Math.max(state.streak || 0, state.longestStreak || 0);
    var combo = state.maxCombo || 0;
    var friends = 0;
    if (Array.isArray(state.friends)) {
      for (var i = 0; i < state.friends.length; i++) {
        if (state.friends[i] && state.friends[i].status === 'accepted') friends++;
      }
    }
    var hasProfilePic = !!(state.profilePicture && state.profilePicture.pixels);
    var hasDisplayName = !!(state.displayName && state.displayName.trim());
    var bedtimeTotal = state.bedtimeTotalSuccesses || 0;
    var bedtimeStreakBest = Math.max(state.bedtimeStreak || 0, state.bedtimeBestStreak || 0);
    var lifetimeCoins = state.lifetimeCoins || 0;
    var currentCoins = state.coins || 0;
    var lifetimeBlocks = state.totalLifetimeBlocks || 0;
    var galleryCount = (state.savedArtworks && state.savedArtworks.length) || 0;
    var canvasSize = state.canvasSize || 8;
    var canvasCount = (state.purchasedCanvasSizes && state.purchasedCanvasSizes.length) || 1;
    var dyeResearch = state.dyeResearchLevel || 0;
    var employeesLevel = state.employeesLevel || 0;
    var brokerageUnlocked = state.brokerageUnlocked ? 1 : 0;
    var loomSalesCoins = state.coinsFromLoomSales || 0;
    var hasFullProfile = hasProfilePic && hasDisplayName;
    // Stocks: count unique owned
    var stocksOwned = 0;
    var stocksBought = 0;
    if (state.portfolio && typeof state.portfolio === 'object') {
      var keys = Object.keys(state.portfolio);
      for (var k = 0; k < keys.length; k++) {
        if (state.portfolio[keys[k]] && state.portfolio[keys[k]].shares > 0) stocksOwned++;
        if (state.portfolio[keys[k]] && state.portfolio[keys[k]].shares > 0) stocksBought++;
      }
    }
    var marketEvents = state.marketEventsWeathered || 0;
    var questsCompleted = state.questsCompletedLifetime || 0;
    var questStreak = state.questStreak || 0;
    var questsAmbitious = state.questsAmbitiousCompleted || 0;

    ALL_BADGES.forEach(function(b) {
      if (earned.indexOf(b.id) !== -1) return;

      var met = false;
      var r = b.req;
      switch(r.type) {
        case 'bedtimeTotal':      met = bedtimeTotal >= r.count; break;
        case 'bedtimeStreak':     met = bedtimeStreakBest >= r.count; break;
        case 'sessions':          met = sessions >= r.count; break;
        case 'streak':            met = streak >= r.count; break;
        case 'combo':             met = combo >= r.count; break;
        case 'friends':           met = friends >= r.count; break;
        case 'profilePic':        met = hasProfilePic; break;
        case 'displayName':       met = hasDisplayName; break;
        case 'fullProfile':       met = hasFullProfile; break;
        case 'level':             met = level >= r.count; break;
        case 'lifetimeCoins':     met = lifetimeCoins >= r.count; break;
        case 'currentCoins':      met = currentCoins >= r.count; break;
        case 'lifetimeBlocks':    met = lifetimeBlocks >= r.count; break;
        case 'gallery':           met = galleryCount >= r.count; break;
        case 'canvasSize':        met = canvasSize >= r.count; break;
        case 'canvasCount':       met = canvasCount >= r.count; break;
        case 'dyeResearch':       met = dyeResearch >= r.count; break;
        case 'employees':         met = employeesLevel >= r.count; break;
        case 'brokerageUnlocked': met = brokerageUnlocked >= r.count; break;
        case 'stocksBought':      met = stocksBought >= r.count; break;
        case 'stocksOwned':       met = stocksOwned >= r.count; break;
        case 'marketEvents':      met = marketEvents >= r.count; break;
        case 'loomSales':         met = galleryCount >= r.count; break;
        case 'loomSalesCoins':    met = loomSalesCoins >= r.count; break;
        case 'questsCompleted':   met = questsCompleted >= r.count; break;
        case 'questStreak':       met = questStreak >= r.count; break;
        case 'questsAmbitious':   met = questsAmbitious >= r.count; break;
      }

      if (met) {
        earned.push(b.id);
        changed = true;
      }
    });

    if (changed) {
      state.badges = earned;
      chrome.storage.local.set({ pixelFocusState: state });
    }

    return earned;
  }

  // ===== Render =====
  function render() {
    var earned = computeEarnedBadges();
    var totalEarned = earned.length;
    var totalPossible = ALL_BADGES.length;

    // Stats bar
    document.getElementById('totalBadges').textContent = totalEarned;
    document.getElementById('bedtimeStreak').textContent = state.bedtimeStreak || 0;
    document.getElementById('bestStreak').textContent = state.bedtimeBestStreak || 0;
    document.getElementById('totalNights').textContent = state.bedtimeTotalSuccesses || 0;
    document.getElementById('badgeCount').textContent = totalEarned + ' / ' + totalPossible;

    var content = document.getElementById('badgeContent');
    content.innerHTML = '';

    if (totalPossible === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">No badges available yet.</div></div>';
      return;
    }

    // Group by category
    var cats = ['sleep', 'focus', 'social', 'mastery', 'quests', 'creative', 'business'];
    cats.forEach(function(cat) {
      var badges = ALL_BADGES.filter(function(b) { return b.cat === cat; });
      if (badges.length === 0) return;

      var section = document.createElement('div');
      section.className = 'section';

      var title = document.createElement('div');
      title.className = 'section-title ' + CAT_LABELS[cat].cls;
      title.textContent = CAT_LABELS[cat].title;
      section.appendChild(title);

      var grid = document.createElement('div');
      grid.className = 'badge-grid';

      badges.forEach(function(b) {
        var isEarned = earned.indexOf(b.id) !== -1;
        var card = document.createElement('div');
        card.className = 'badge-card' + (isEarned ? ' earned' : ' locked');

        var icon = document.createElement('div');
        icon.className = 'badge-icon';
        icon.textContent = b.icon;
        card.appendChild(icon);

        var name = document.createElement('div');
        name.className = 'badge-name';
        name.textContent = b.name;
        card.appendChild(name);

        var desc = document.createElement('div');
        desc.className = 'badge-desc';
        desc.textContent = b.desc;
        card.appendChild(desc);

        if (!isEarned) {
          var lock = document.createElement('div');
          lock.className = 'lock-overlay';
          lock.textContent = '🔒';
          card.appendChild(lock);
        }

        card.setAttribute('title', isEarned
          ? b.name + ' — ' + b.desc + '. Earned!'
          : b.name + ' — ' + b.desc + '. Not yet earned.');

        grid.appendChild(card);
      });

      section.appendChild(grid);
      content.appendChild(section);
    });
  }


  // ===== Category tab filtering =====
  var activeCat = 'all';
  var catTabs = document.querySelectorAll('.cat-tab');
  catTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      catTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      activeCat = tab.getAttribute('data-cat');
      // Show/hide sections
      var sections = document.querySelectorAll('#badgeContent .section');
      sections.forEach(function(sec) {
        if (activeCat === 'all') {
          sec.style.display = '';
        } else {
          // Check if this section's title has the matching class
          var title = sec.querySelector('.section-title');
          if (title && title.classList.contains(activeCat)) {
            sec.style.display = '';
          } else {
            sec.style.display = 'none';
          }
        }
      });
    });
  });


  function applyTabFilter() {
    if (activeCat === 'all') return;
    var sections = document.querySelectorAll('#badgeContent .section');
    sections.forEach(function(sec) {
      var title = sec.querySelector('.section-title');
      if (title && title.classList.contains(activeCat)) {
        sec.style.display = '';
      } else {
        sec.style.display = 'none';
      }
    });
  }

  // ===== Nav =====
  function openWindow(path) {
    try {
      chrome.runtime.sendMessage({ type: 'pf-open', path: path });
    } catch (_) {}
  }

  document.getElementById('backBtn').addEventListener('click', function() {
    openWindow('popup.html');
  });

  // ===== Init =====
  chrome.storage.local.get('pixelFocusState', function(result) {
    state = result.pixelFocusState || {};
    render();
    applyTabFilter();
  });

  // Live sync
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local' || !changes.pixelFocusState) return;
    state = changes.pixelFocusState.newValue || {};
    render();
    applyTabFilter();
  });
})();
