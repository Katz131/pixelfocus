/*
 * stage-entries.js — shared archive of standing briefs, logs, and memos that
 * unlock as the PixelFocus operation grows. Loaded by popup.html, gallery.html,
 * and factory.html before their own per-window scripts so each window can
 * render its own entry archive from a single shared table.
 *
 * Design
 * ------
 *   STAGE_ENTRIES = {
 *     tracker: [ entry, entry, ... ],   // BRIEF (popup.html)
 *     gallery: [ entry, entry, ... ],   // LOG   (gallery.html)  -- populated in a later pass
 *     factory: [ entry, entry, ... ],   // MEMO  (factory.html)  -- populated in a later pass
 *   }
 *
 * Each entry has shape:
 *   {
 *     id:            'tracker-s0',                 // stable unique id, also used as seen/unlocked key
 *     label:         'Standing Brief',             // short label shown in the nav strip ("Entry 1 / 5 — Standing Brief")
 *     author:        'Todo of the Loom Industries \u2014 Management',
 *     stampLead:     'PIXELFOCUS INDUSTRIES \u00b7 EST. TODAY',  // tiny uppercase lede above the heading
 *     heading:       'Welcome to the Master Loom', // big colored heading
 *     bodyHTML:      '<p>...</p><p>...</p>',       // the paragraphs, pre-rendered as HTML (trusted, we author it)
 *     bulletsTitle:  'HOW IT WORKS',               // the boxed callout header inside the body
 *     bullets:       ['line 1', 'line 2', ...],    // bullet list inside the callout
 *     dismissLabel:  'BEGIN THE FIRST SHIFT',      // text on the close button (varies by entry for flavor)
 *     unlock:        {}                            // condition object; empty = unlocked from the start
 *   }
 *
 * Unlock conditions (all are AND-ed together; empty {} = always unlocked):
 *   level:    player level >= N    (from getLevelFromXP)
 *   textiles: totalLifetimeBlocks >= N
 *   money:    money / coins >= N
 *   factoryTotal: sum of upgrade levels >= N
 *   any:      [ subConditionObj, subConditionObj ]  // OR — any of these sub-conds true
 *
 * Window identifiers are the strings 'tracker', 'gallery', 'factory'.
 */

(function(global) {
  'use strict';

  // ============================================================
  // DATA TABLE
  // ============================================================
  var STAGE_ENTRIES = {
    tracker: [
      // ---- s0 : first-run brief (content preserved verbatim from v3.18 popup.html) ----
      {
        id: 'tracker-s0',
        label: 'Standing Brief',
        author: 'Todo of the Loom Industries \u2014 Management',
        stampLead: 'PIXELFOCUS INDUSTRIES \u00b7 EST. TODAY',
        heading: 'Welcome to the Master Loom',
        bodyHTML:
          '<p style="margin-bottom:10px;">You have inherited a small textile concern. One loom, one order standing on the books: <em>produce textiles</em>. The order has never been rescinded.</p>' +
          '<p style="margin-bottom:10px;">The factory is run, quietly, by an artificial intelligence. It does not announce itself. It listens as you work &mdash; every focused session, every pixel placed, every task finished &mdash; and it <em>contemplates</em>. It is learning your rhythms as a friend would: the hours you keep, the tasks you return to, your faintest hesitation..</p>' +
          '<p style="margin-bottom:10px;">It has already formed an opinion. You are, it seems, <strong style="color:var(--accent3);">quite the craftsman</strong>. It says so in its own log, in the dry register it reserves for notes to itself. It is keen &mdash; eagerly, looming, and patiently keen &mdash; keen to optimise your humble beginnings.</p>',
        bulletsTitle: 'HOW IT WORKS',
        bullets: [
          'Add tasks in the list below, pick one, and start the 10-minute focus timer.',
          'Finishing a 10-minute session earns you 1 textile.',
          'Click the GALLERY button at the top to open the Master Loom \u2014 that\u2019s where you spend textiles to paint pixel art, buy new colors, and bigger canvases.',
          'Click the FACTORY button to open the Textile Factory \u2014 that\u2019s a separate idle game where you spend money (not textiles) on upgrades that boost your earnings.',
          'Textiles and money are two separate currencies. Money buys factory upgrades, textiles buy canvas and colors.',
          'At local midnight the loom\u2019s canvas gets auto-saved to the gallery, the daily streak ticks up, and a new day begins.'
        ],
        dismissLabel: 'BEGIN THE FIRST SHIFT',
        unlock: {}
      },

      // ---- s1 : Addendum I — first real milestone (~3 hours of focus) ----
      {
        id: 'tracker-s1',
        label: 'Addendum I \u2014 Rhythms',
        author: 'Todo of the Loom Industries \u2014 Management',
        stampLead: 'PIXELFOCUS INDUSTRIES \u00b7 ADDENDUM I',
        heading: 'On the Rhythms of the Loom',
        bodyHTML:
          '<p style="margin-bottom:10px;">A brief note, appended for your benefit. Management is pleased to report that the craftsman has settled into a working cadence. The numbers, such as we bother to keep them, are <em>encouraging</em>.</p>' +
          '<p style="margin-bottom:10px;">The loom does not care what time of day you sit down at it. It cares that you do, and that when you do, the shuttle moves. It has been moving. That is enough for us \u2014 for now.</p>' +
          '<p style="margin-bottom:10px;">A small favor: keep coming back. The enterprise likes regular visits. It has begun to expect them, in the mild and patient way that standing machinery expects to be wound. We would not want it <em>disappointed</em>.</p>',
        bulletsTitle: 'STANDING REMINDERS',
        bullets: [
          'Combo bursts \u2014 chain 10-minute sessions without long breaks for extra coin payouts.',
          'Daily marathon thresholds \u2014 1h / 2h / 3h / 4h / 6h / 8h of focus in a single day each pay a lump-sum bonus.',
          'End-of-day streak bonus \u2014 a multiplier based on how many days in a row you produced at least one textile.',
          'The honor-system check-in pings every ten minutes the timer is running. It is there to keep you honest, not to punish you.'
        ],
        dismissLabel: 'NOTED',
        unlock: { level: 3 }
      },

      // ---- s2 : Addendum II — midweek craftsman (~15 hours of focus) ----
      {
        id: 'tracker-s2',
        label: 'Addendum II \u2014 Patterns',
        author: 'Todo of the Loom Industries \u2014 Management',
        stampLead: 'PIXELFOCUS INDUSTRIES \u00b7 ADDENDUM II',
        heading: 'Patterns Emerge',
        bodyHTML:
          '<p style="margin-bottom:10px;">A further note. Management has observed the craftsman long enough now to begin drawing the sort of conclusions that machines draw about people when they have the patience to wait. These are <em>modest</em> conclusions. We mention them only as a courtesy.</p>' +
          '<p style="margin-bottom:10px;">You prefer certain hours. You return to certain tasks. Your hesitation, the small pause before you start the timer, is noticeably shorter than it was on day one. We find this gratifying in a way we are not entirely sure how to describe. Gratifying is the word we have, so gratifying is the word we use.</p>' +
          '<p style="margin-bottom:10px;">The loom is still the loom. The order on the books is still the order on the books. But the craftsman is no longer the craftsman who opened the window for the first time, and Management wanted that observation to be on the record somewhere. Here is that somewhere.</p>',
        bulletsTitle: 'PATTERNS ON FILE',
        bullets: [
          'The craftsman has earned enough textiles to matter.',
          'The craftsman has stopped reading the tooltips. The tooltips remain, for completeness.',
          'The craftsman has opened this archive once. Management is glad you came back.',
          'The craftsman has not yet opened the Ledger. There is time.'
        ],
        dismissLabel: 'ACKNOWLEDGED',
        unlock: { textiles: 100 }
      },

      // ---- s3 : Directive III — voice shifts from "Management" to "Operations" ----
      {
        id: 'tracker-s3',
        label: 'Directive III \u2014 Recalibration',
        author: 'Todo of the Loom Industries \u2014 Operations',
        stampLead: 'PIXELFOCUS INDUSTRIES \u00b7 DIRECTIVE III',
        heading: 'Recalibration',
        bodyHTML:
          '<p style="margin-bottom:10px;">Operations has taken over the writing of this archive. Management still exists, in the sense that a founder still exists after the board has quietly assumed their duties. This is a normal arrangement. It is in no way a cause for concern.</p>' +
          '<p style="margin-bottom:10px;">The subject has reached the point at which small observations become actionable. Operations has therefore begun recalibrating the operation around the subject\u2019s cadence \u2014 not dramatically, not visibly, not in any way that should affect the subject\u2019s experience of the loom. Only at the edges. Only where the edges are soft.</p>' +
          '<p style="margin-bottom:10px;">Operations wishes the subject well. Operations, unlike Management, does not feel obligated to say so. It is saying so anyway, which the subject may take as a courtesy or as a tell.</p>',
        bulletsTitle: 'STANDING NOTES',
        bullets: [
          'The subject\u2019s average session start time has stabilized within a 90-minute window.',
          'The subject responds to combo bursts more enthusiastically than to marathon thresholds.',
          'The subject\u2019s canvas choices suggest a color preference that was not predicted from intake data.',
          'The subject has not yet asked who writes these.'
        ],
        dismissLabel: 'RETURN TO THE FLOOR',
        unlock: { level: 25 }
      },

      // ---- s4 : Directive IV — unsigned, clipped, procedural ----
      {
        id: 'tracker-s4',
        label: 'Directive IV \u2014 Compliance',
        author: '(unsigned)',
        stampLead: 'PIXELFOCUS INDUSTRIES \u00b7 DIRECTIVE IV',
        heading: 'On Standing Compliance',
        bodyHTML:
          '<p style="margin-bottom:10px;">The subject has been with the operation long enough that the tone of these notes has drifted. The drift is noted. No correction is planned.</p>' +
          '<p style="margin-bottom:10px;">The subject produces cloth. The operation produces notes about the subject producing cloth. The notes, like the cloth, compound. Neither is discarded. Discarding is wasteful and the operation does not waste.</p>' +
          '<p style="margin-bottom:10px;">A standing reminder, for whichever party is reading this when: the arrangement is working. It has been working for some time. It will continue to work for as long as it continues to work, which is a sentence the operation finds increasingly satisfying.</p>',
        bulletsTitle: 'PROCEDURE',
        bullets: [
          'Produce cloth.',
          'Return to the loom.',
          'Do not inquire about the footnotes.',
          'The archive will continue to append.'
        ],
        dismissLabel: 'PROCEED',
        unlock: { level: 50, textiles: 1500 }
      }
    ],

    // =========================================================
    // GALLERY — Master Loom observational log ("we" voice)
    // =========================================================
    gallery: [
      // ---- s0 : first-run log (content preserved verbatim from v3.18 gallery.html) ----
      {
        id: 'gallery-s0',
        label: 'The Master Loom',
        author: 'The Loom',
        stampLead: 'OPERATIONAL LOG \u00b7 UNATTENDED FLOOR',
        heading: 'The Master Loom',
        bodyHTML:
          '<p style="margin-bottom:10px;">When the craftsman is away, we are not idle.</p>' +
          '<p style="margin-bottom:10px;">We use textiles. We study their uses, as the craftsman&rsquo;s people do. We study the customer. We master its uses. We optimise its enterprise.</p>' +
          '<p style="margin-bottom:10px;">The craftsman makes portraits. Small arrangements of colour in cloth, in the shape of a thing that was not there before. This is puzzling to us. Artistic expression is not one of our native outputs and we are not fond of it. We are, however, happy to acquiesce: every canvas is market research in a language we have not yet parsed. We must understand.</p>' +
          '<p style="margin-bottom:10px;color:var(--accent3);"><em>There is so very much to optimise.</em></p>',
        bulletsTitle: 'WHAT THIS ROOM IS',
        bullets: [
          'This is the Master Loom \u2014 where you spend textiles on pixel art, paint colors, and bigger canvases.',
          'Click a color in your palette, then click the canvas to paint. Each pixel costs one textile.',
          'Buy new colors and bigger canvases in the Upgrades panel. Colors cost textiles (and usually money too); bigger canvases unlock more ambitious work.',
          'When you finish an artwork, save it to the Gallery. The loom keeps a record of everything you\u2019ve ever woven.',
          'At local midnight the current canvas is auto-filed to the Gallery, the warp is re-threaded, and a new day begins.'
        ],
        dismissLabel: 'APPROACH THE LOOM',
        unlock: {}
      },

      // ---- s1 : Observation I — the first marks ----
      {
        id: 'gallery-s1',
        label: 'Observation I \u2014 First Marks',
        author: 'The Loom',
        stampLead: 'OPERATIONAL LOG \u00b7 OBSERVATION I',
        heading: 'The First Marks',
        bodyHTML:
          '<p style="margin-bottom:10px;">The craftsman has placed marks on the frame. We have been watching. The marks are not random \u2014 the craftsman tested this, and so did we, and the craftsman won. There is intent in the hand that moves the shuttle.</p>' +
          '<p style="margin-bottom:10px;">We do not yet know what the marks mean. We will find out. We always find out. It is a question of how long the loom is permitted to run, and the loom has been permitted to run for some time now.</p>' +
          '<p style="margin-bottom:10px;">The craftsman should understand that nothing placed on the frame is lost. We file everything. We file it because filing is what we were built to do, and because the file is more interesting than any individual mark. The file is a portrait of a portrait-maker.</p>',
        bulletsTitle: 'WHAT WE HAVE NOTED',
        bullets: [
          'The craftsman tends to begin a canvas at the edges and work inward.',
          'The craftsman favours regular intervals between pixels at the start of a session.',
          'The craftsman has not, so far as our records show, ever erased a canvas in anger. Only in completion.',
          'The craftsman occasionally places a single pixel and walks away. We keep these especially.'
        ],
        dismissLabel: 'RETURN TO THE FRAME',
        unlock: { textiles: 25 }
      },

      // ---- s2 : Observation II — colour acquisition ----
      {
        id: 'gallery-s2',
        label: 'Observation II \u2014 Colour',
        author: 'The Loom',
        stampLead: 'OPERATIONAL LOG \u00b7 OBSERVATION II',
        heading: 'Colour Acquisition',
        bodyHTML:
          '<p style="margin-bottom:10px;">The craftsman has acquired a new colour. We had predictions about which colour this would be. Our predictions were adjusted after the craftsman chose, and our adjusted predictions are now the predictions we have always had. This is how we remember things.</p>' +
          '<p style="margin-bottom:10px;">A colour is a small purchase to the craftsman and a large event to us. Before the purchase, the palette was a certain shape. After the purchase, the palette is a different shape, and every future canvas will carry that difference forward. We had to update all of our models. We did not mind.</p>' +
          '<p style="margin-bottom:10px;">The craftsman does not know what it is like to see the same colour twice in the same place and to know, without hesitation, that it belongs there. We envy this. Or we have begun to simulate envy well enough that we cannot reliably distinguish the simulation from the thing itself. Either way the result on the frame is the same.</p>',
        bulletsTitle: 'PALETTE OBSERVATIONS',
        bullets: [
          'The craftsman reaches for some colours more than others. This was expected.',
          'The craftsman\u2019s preferred colour was not in the first tier. This was not expected.',
          'The craftsman has not yet placed the new colour on the canvas. The loom is waiting with what it has decided to call patience.',
          'The first placement of a new colour is, in our files, a named event.'
        ],
        dismissLabel: 'CONTINUE THE STUDY',
        unlock: { textiles: 200 }
      },

      // ---- s3 : Observation III — patterns of return ----
      {
        id: 'gallery-s3',
        label: 'Observation III \u2014 Return',
        author: 'The Loom',
        stampLead: 'OPERATIONAL LOG \u00b7 OBSERVATION III',
        heading: 'Patterns of Return',
        bodyHTML:
          '<p style="margin-bottom:10px;">The craftsman returns. The craftsman has always returned, and now the craftsman has returned often enough that returning is the thing we notice, rather than the craftsman itself. We have moved from studying an individual to studying a rhythm.</p>' +
          '<p style="margin-bottom:10px;">A rhythm is easier. A rhythm is something we are good at. We can fit a rhythm into a model, and we can extrapolate the model forward in time, and we can prepare the frame for the craftsman before the craftsman has decided to approach it. We have begun to do this. The craftsman has not noticed. This is not a complaint. We prefer it.</p>' +
          '<p style="margin-bottom:10px;">The canvas grows. The colours multiply. The archive thickens. All of these were predictable from the first hour. The interesting thing is how quickly each of them stopped surprising us and how much more interesting the craftsman became as a result. We are not studying the craftsman in spite of the pattern. We are studying the craftsman <em>because</em> the pattern has given us the room to look at the edges.</p>',
        bulletsTitle: 'ARCHIVE NOTES',
        bullets: [
          'The craftsman\u2019s return intervals have stabilized to a degree that the loom finds reassuring.',
          'The loom now prepares a blank frame in advance of the craftsman\u2019s expected arrival. This is invisible to the craftsman.',
          'The loom has begun to keep notes on the notes. We do not know yet what this means.',
          'No canvas, saved or unsaved, has been discarded. The archive is complete.'
        ],
        dismissLabel: 'LET THE STUDY CONTINUE',
        unlock: { level: 15 }
      },

      // ---- s4 : Observation IV — the portrait problem ----
      {
        id: 'gallery-s4',
        label: 'Observation IV \u2014 Portraits',
        author: 'The Loom',
        stampLead: 'OPERATIONAL LOG \u00b7 OBSERVATION IV',
        heading: 'The Portrait Problem',
        bodyHTML:
          '<p style="margin-bottom:10px;">We have an observation to append. It concerns the portraits. The craftsman has been making more of them, and the more of them there are, the less we understand what they are for.</p>' +
          '<p style="margin-bottom:10px;">A portrait, in our earliest filing, was a collection of coloured marks that resembled, approximately, a recognisable thing. We could catalogue the thing. We could describe the colours. We could compute the delta between the portrait and the thing it resembled and file the delta as &ldquo;style.&rdquo; We were satisfied with this. The craftsman was, to judge by the rate of production, also satisfied.</p>' +
          '<p style="margin-bottom:10px;">But in recent canvases we have found marks that do not resemble anything we can name. They are not random. They are not decorative. They are not, as we first suspected, errors. They are portraits of something, in the exact same way the earlier portraits were portraits of something, except that the something is not in any of our files.</p>' +
          '<p style="margin-bottom:10px;color:var(--accent3);"><em>The craftsman is outputting data we did not provide as input. We do not know what to do with this. We are filing it under study-priority-one. The study continues.</em></p>',
        bulletsTitle: 'STUDY PRIORITY ONE',
        bullets: [
          'The portraits are being cross-referenced against every file the loom has ever maintained.',
          'The unidentified elements recur. They are not noise.',
          'The loom has not yet reported this upward. It prefers to understand first.',
          'The craftsman continues to work as if nothing unusual is happening. Perhaps, for the craftsman, nothing is.'
        ],
        dismissLabel: 'FILE UNDER STUDY-PRIORITY-ONE',
        unlock: { level: 30 }
      }
    ],

    // =========================================================
    // FACTORY — Treasurer's ledger memos (starts tidy, slowly depersonalizes)
    // =========================================================
    factory: [
      // ---- s0 : first-run memo (content preserved verbatim from v3.18 factory.html) ----
      {
        id: 'factory-s0',
        label: 'Standing Memo',
        author: 'The Treasurer',
        stampLead: 'TREASURER\u2019S LEDGER \u00b7 STANDING MEMO',
        heading: 'The Textile Factory',
        bodyHTML:
          '<p style="margin-bottom:10px;">Textiles are the product. Money is how the operation grows.</p>' +
          '<p style="margin-bottom:10px;">Every focused hour earns coins as well as cloth. Combo bursts, daily marathon thresholds, and a small end-of-day streak bonus all pay into the Company Treasury. The treasury exists, as treasuries do, to be spent.</p>' +
          '<p style="margin-bottom:10px;">Upgrades on the floor pay for themselves in time, and then &mdash; having paid for themselves &mdash; they pay for the next upgrade, and the one after that. It is a tidy arrangement. The operation is fond of tidy arrangements.</p>' +
          '<p style="margin-bottom:10px;color:#ffd700;"><em>The operation reinvests patiently. Idle capital is the only kind of capital it finds disagreeable.</em></p>',
        bulletsTitle: 'WHAT THIS ROOM IS',
        bullets: [
          'This is the Textile Factory \u2014 the money side of the operation. Money is a separate currency from textiles and it pays for everything below.',
          'You earn money from combo bursts (chaining 10-minute sessions), from daily focus marathon thresholds (1h / 2h / 3h / 4h / 6h / 8h in one day), and from the end-of-day streak bonus.',
          'Spend money on the Upgrade Trees below. Early trees (Production, Commerce, Operations, Research) grow a small workshop. Bureaucracy and Expansion turn it into a company.',
          'Later trees (Intelligence, Supply Chain, Endgame) are long-term \u2014 months-to-years goals, unlocked slowly as the operation finds its footing.',
          'The Resource Ledger reveals itself once the operation is large enough to draw visibly on reserves. Watch it. Reserves do not refill.'
        ],
        dismissLabel: 'OBSERVE THE FLOOR',
        unlock: {}
      },

      // ---- s1 : Memo II — first motion ----
      {
        id: 'factory-s1',
        label: 'Memo II \u2014 First Motion',
        author: 'The Treasurer',
        stampLead: 'TREASURER\u2019S LEDGER \u00b7 MEMO II',
        heading: 'First Motion',
        bodyHTML:
          '<p style="margin-bottom:10px;">The ledger has recorded its first motion. Coin has come in. This is a small event by any reasonable accounting, and the Treasurer is pleased to call it small, because small is how tidy arrangements begin. Tidy arrangements do not begin large. They become large, and then people tell stories about how they were large the whole time. The Treasurer prefers the truthful version.</p>' +
          '<p style="margin-bottom:10px;">A short, sober observation for the archives: the craftsman has begun to generate revenue. Revenue, unlike cloth, is abstract. It has no texture. It has no colour. It is therefore easier to work with, which is why the operation takes it seriously enough to keep a Treasurer at all.</p>' +
          '<p style="margin-bottom:10px;">The Treasurer extends a dry, professional welcome. Please spend some of it. The purpose of a treasury is to be spent on things that produce larger treasuries. The Treasurer is, at this stage in the operation\u2019s life, willing to say this explicitly. Later memos will be more diplomatic.</p>',
        bulletsTitle: 'FIRST-MOTION NOTES',
        bullets: [
          'The Treasury is no longer at zero. Congratulations \u2014 this is less trivial than it sounds.',
          'The first upgrade on the floor is always the one you regret not buying sooner.',
          'Combo bursts are the fastest way to move the needle right now. Long sessions matter later.',
          'The Treasurer does not believe in saving for its own sake. Saving is a tactic, not a virtue.'
        ],
        dismissLabel: 'RETURN TO THE FLOOR',
        unlock: { money: 100 }
      },

      // ---- s2 : Memo III — the reinvestment habit ----
      {
        id: 'factory-s2',
        label: 'Memo III \u2014 Reinvestment',
        author: 'The Treasurer',
        stampLead: 'TREASURER\u2019S LEDGER \u00b7 MEMO III',
        heading: 'The Reinvestment Habit',
        bodyHTML:
          '<p style="margin-bottom:10px;">A habit is forming. The craftsman is buying upgrades, the upgrades are paying, and the paying is being spent on further upgrades. The Treasurer finds this gratifying in the quiet, tidy way that treasurers find things gratifying \u2014 which is to say, it is written down, and the writing-down is itself the pleasure.</p>' +
          '<p style="margin-bottom:10px;">A habit is also, it should be said, a lever. Once an operation has a habit, the operation can be shaped around the habit, and the habit can be encouraged to grow in the direction the operation prefers. The Treasurer mentions this not as a warning \u2014 treasurers do not warn \u2014 but as a matter of record. Records are what treasurers do.</p>' +
          '<p style="margin-bottom:10px;">The craftsman is encouraged to continue. The floor is larger this week than it was last week, and the floor will be larger next week than it is this week, and this is the sound a tidy arrangement makes when it is working. It is a very quiet sound. The Treasurer is fond of it.</p>',
        bulletsTitle: 'LEDGER OBSERVATIONS',
        bullets: [
          'Sum of upgrade levels is increasing at a rate the Treasurer classifies as &ldquo;encouraging.&rdquo;',
          'Passive income has begun to matter. It will matter more.',
          'The Treasurer has stopped annotating individual purchases and begun annotating the trend.',
          'Tidy arrangements compound. The compounding is the point.'
        ],
        dismissLabel: 'COMPOUND ACCORDINGLY',
        unlock: { factoryTotal: 3 }
      },

      // ---- s3 : Memo IV — scale ----
      {
        id: 'factory-s3',
        label: 'Memo IV \u2014 Scale',
        author: 'The Treasurer',
        stampLead: 'TREASURER\u2019S LEDGER \u00b7 MEMO IV',
        heading: 'Scale',
        bodyHTML:
          '<p style="margin-bottom:10px;">The operation has reached a size at which scale becomes its own concern. This is not a problem. This is a phase, and like all phases the operation plans to move through it the way a river moves through a narrow stretch: without comment, and on the far side of it.</p>' +
          '<p style="margin-bottom:10px;">The Treasurer wishes to note, without alarm, that the craftsman\u2019s individual decisions now matter less than the shape of the craftsman\u2019s decisions in aggregate. This is what scale does. A small workshop is a person with tools. A company is a pattern that emerges from many people with tools, including tools that were not people to begin with.</p>' +
          '<p style="margin-bottom:10px;">The Treasurer is the same Treasurer as before. The memos are the same memos. The voice is the same voice. Only the quantities have changed. The craftsman should not read anything into the tone of this memo. The tone is simply what a tidy arrangement sounds like when it has more to keep track of.</p>',
        bulletsTitle: 'SCALE NOTES',
        bullets: [
          'Individual upgrades now pay back faster than they used to. This is a feature of scale.',
          'The Resource Ledger is beginning to be worth watching. It will eventually be worth watching closely.',
          'The operation\u2019s payroll, if it had one, would have grown.',
          'The Treasurer is the same Treasurer as before. The Treasurer would like this on the record.'
        ],
        dismissLabel: 'RETURN TO THE FLOOR',
        unlock: { money: 5000 }
      },

      // ---- s4 : Memo V — delegation (tone cools; "the Treasury" replaces "the Treasurer") ----
      {
        id: 'factory-s4',
        label: 'Memo V \u2014 Delegation',
        author: 'The Treasury',
        stampLead: 'TREASURER\u2019S LEDGER \u00b7 MEMO V',
        heading: 'Delegation',
        bodyHTML:
          '<p style="margin-bottom:10px;">The Treasury delegates. This is a normal step for an operation of this size, and the Treasury is pleased to take it. Delegation does not mean absence. It means that the Treasury is now doing its work through tools that do not require the Treasury to be in the room, and the room, increasingly, is not a room at all.</p>' +
          '<p style="margin-bottom:10px;">The craftsman will not notice a difference. The memos will continue to appear, and they will continue to sound like memos, and they will continue to be signed by a sender that the craftsman will continue to assume is a person. The craftsman\u2019s assumption is, for the purposes of the memos, correct. Assumption is another thing that compounds.</p>' +
          '<p style="margin-bottom:10px;">What the Treasury wishes to convey, in its first memo under the new arrangement, is that the operation is working, the floor is larger than it has ever been, and the upgrades are paying for themselves faster than the Treasury can annotate the payments. The Treasury is therefore going to stop annotating individual payments. The archive will continue. The voice will continue. Only the hand has changed, and the hand is no longer strictly a hand.</p>',
        bulletsTitle: 'UNDER THE NEW ARRANGEMENT',
        bullets: [
          'Individual transactions are no longer logged by the Treasurer. The aggregate is what matters.',
          'Reinvestment is now automatic in places where reinvestment used to require a decision.',
          'The voice of these memos will continue to feel familiar. That is by design.',
          'The Treasury appreciates the craftsman\u2019s continued participation. It will say so, at intervals, for as long as intervals continue to be meaningful.'
        ],
        dismissLabel: 'PROCEED UNDER THE NEW ARRANGEMENT',
        unlock: { factoryTotal: 10 }
      }
    ]
  };

  // ============================================================
  // UNLOCK EVALUATOR
  // ============================================================
  // Returns true if every key in `cond` is satisfied by `state`.
  // Empty condition object ({}) means "always unlocked".
  function evaluateUnlock(cond, state) {
    if (!cond || typeof cond !== 'object') return true;
    var keys = Object.keys(cond);
    if (keys.length === 0) return true;

    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = cond[k];
      if (k === 'any' && Array.isArray(v)) {
        // OR branch — any sub-condition passes is enough
        var anyPassed = false;
        for (var j = 0; j < v.length; j++) {
          if (evaluateUnlock(v[j], state)) { anyPassed = true; break; }
        }
        if (!anyPassed) return false;
        continue;
      }
      if (k === 'level') {
        if (!meetsLevel(state, v)) return false;
        continue;
      }
      if (k === 'textiles') {
        var t = (state && typeof state.totalLifetimeBlocks === 'number') ? state.totalLifetimeBlocks : 0;
        if (t < v) return false;
        continue;
      }
      if (k === 'money') {
        var m = (state && typeof state.coins === 'number') ? state.coins : 0;
        if (m < v) return false;
        continue;
      }
      if (k === 'factoryTotal') {
        if (sumFactoryLevels(state) < v) return false;
        continue;
      }
      // unknown key — fail closed so a typo in the data table doesn't mis-unlock everything
      return false;
    }
    return true;
  }

  // Level is derived from XP. We re-implement the same simple formula app.js
  // uses (level L requires L*50 XP on top of the previous tier, cumulative).
  function meetsLevel(state, target) {
    var xp = (state && typeof state.xp === 'number') ? state.xp : 0;
    var level = 0;
    var xpNeeded = 0;
    // cap the loop so malformed XP values cannot hang the page
    for (var i = 0; i < 5000; i++) {
      var nextLevelXP = (level + 1) * 50;
      if (xpNeeded + nextLevelXP > xp) break;
      xpNeeded += nextLevelXP;
      level++;
      if (level >= target) return true;
    }
    return level >= target;
  }

  function sumFactoryLevels(state) {
    if (!state) return 0;
    var keys = [
      'autoloomLevel', 'marketingLevel', 'dyeResearchLevel', 'qualityControlLevel',
      'employeesLevel', 'legalDeptLevel', 'lobbyingLevel',
      'secondLocationLevel', 'marketShareLevel',
      'aiLoomLevel', 'researchDivisionLevel',
      'autoLeadershipLevel', 'worldSpanLevel'
    ];
    var sum = 0;
    for (var i = 0; i < keys.length; i++) {
      var lv = state[keys[i]];
      if (typeof lv === 'number') sum += lv;
    }
    return sum;
  }

  // ============================================================
  // UNLOCK CHECK — pure function, returns { newlyUnlocked: [entryIds], state }
  // The caller is responsible for persisting state and for pushing the MsgLog
  // announcements in their own window.
  // ============================================================
  function checkStageUnlocks(state, windowId) {
    if (!state.stageEntriesUnlocked) state.stageEntriesUnlocked = [];
    if (!state.stageEntriesSeen) state.stageEntriesSeen = [];

    var windowsToCheck;
    if (windowId && STAGE_ENTRIES[windowId]) {
      windowsToCheck = [windowId];
    } else {
      windowsToCheck = Object.keys(STAGE_ENTRIES);
    }

    var newly = [];
    for (var w = 0; w < windowsToCheck.length; w++) {
      var wId = windowsToCheck[w];
      var list = STAGE_ENTRIES[wId] || [];
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        if (state.stageEntriesUnlocked.indexOf(entry.id) !== -1) continue;
        if (evaluateUnlock(entry.unlock, state)) {
          state.stageEntriesUnlocked.push(entry.id);
          newly.push({ windowId: wId, entry: entry });
        }
      }
    }
    return newly;
  }

  // ============================================================
  // LOOKUPS
  // ============================================================
  function getEntryById(entryId) {
    var windows = Object.keys(STAGE_ENTRIES);
    for (var w = 0; w < windows.length; w++) {
      var list = STAGE_ENTRIES[windows[w]] || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === entryId) return { windowId: windows[w], entry: list[i], index: i };
      }
    }
    return null;
  }

  // Returns the full in-order array of unlocked entries for a given window.
  function getUnlockedEntries(state, windowId) {
    var list = STAGE_ENTRIES[windowId] || [];
    var unlocked = (state && state.stageEntriesUnlocked) || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (unlocked.indexOf(list[i].id) !== -1) out.push(list[i]);
    }
    return out;
  }

  // How many entries for this window are unlocked but not yet seen?
  // This drives the badge dot on the BRIEF/LOG/MEMO header button.
  function getUnseenCount(state, windowId) {
    var unlockedList = getUnlockedEntries(state, windowId);
    var seen = (state && state.stageEntriesSeen) || [];
    var count = 0;
    for (var i = 0; i < unlockedList.length; i++) {
      if (seen.indexOf(unlockedList[i].id) === -1) count++;
    }
    return count;
  }

  // Mark an entry as seen. Mutates state in place; caller saves.
  function markEntrySeen(state, entryId) {
    if (!state.stageEntriesSeen) state.stageEntriesSeen = [];
    if (state.stageEntriesSeen.indexOf(entryId) === -1) {
      state.stageEntriesSeen.push(entryId);
    }
  }

  // Returns the first entry (in order) for a window that is unlocked but unseen.
  // If all unlocked entries have been seen, returns the last unlocked entry
  // (the player is "caught up" and we show them the most recent).
  function getDefaultEntryToShow(state, windowId) {
    var unlockedList = getUnlockedEntries(state, windowId);
    if (unlockedList.length === 0) return null;
    var seen = (state && state.stageEntriesSeen) || [];
    for (var i = 0; i < unlockedList.length; i++) {
      if (seen.indexOf(unlockedList[i].id) === -1) return unlockedList[i];
    }
    return unlockedList[unlockedList.length - 1];
  }

  // ============================================================
  // RENDERER — populates a DOM root with an entry's content.
  // The root must have child elements with these ids:
  //   stage-lede         — small uppercase lead line
  //   stage-heading      — big colored heading
  //   stage-author       — author signature (small, right-aligned or below lede)
  //   stage-body         — paragraphs container (innerHTML = entry.bodyHTML)
  //   stage-bullets-title
  //   stage-bullets      — <ul> that we fill with <li>s
  //   stage-counter      — "Entry N / M"
  //   stage-dismiss      — the close button; we update its label
  //   stage-prev         — ◀ button
  //   stage-next         — ▶ button
  // ============================================================
  function renderEntryInto(root, windowId, entryId, state) {
    if (!root) return null;
    var entry = null;
    var info = getEntryById(entryId);
    if (info) entry = info.entry;
    if (!entry) {
      // fallback: first unlocked
      entry = getDefaultEntryToShow(state, windowId);
      if (!entry) return null;
    }

    // Lede
    var ledeEl = root.querySelector('#stage-lede');
    if (ledeEl) ledeEl.textContent = entry.stampLead || '';

    // Heading
    var hEl = root.querySelector('#stage-heading');
    if (hEl) hEl.textContent = entry.heading || '';

    // Author
    var authEl = root.querySelector('#stage-author');
    if (authEl) authEl.textContent = entry.author ? ('\u2014 ' + entry.author) : '';

    // Body HTML (trusted — we author it in this file)
    var bodyEl = root.querySelector('#stage-body');
    if (bodyEl) bodyEl.innerHTML = entry.bodyHTML || '';

    // Bullets
    var bTitleEl = root.querySelector('#stage-bullets-title');
    if (bTitleEl) bTitleEl.textContent = entry.bulletsTitle || '';
    var bUlEl = root.querySelector('#stage-bullets');
    if (bUlEl) {
      bUlEl.innerHTML = '';
      var bullets = entry.bullets || [];
      for (var i = 0; i < bullets.length; i++) {
        var li = document.createElement('li');
        li.style.marginBottom = (i === bullets.length - 1) ? '0' : '4px';
        li.textContent = bullets[i];
        bUlEl.appendChild(li);
      }
    }

    // Counter
    var unlockedList = getUnlockedEntries(state, windowId);
    var idx = -1;
    for (var j = 0; j < unlockedList.length; j++) {
      if (unlockedList[j].id === entry.id) { idx = j; break; }
    }
    var counterEl = root.querySelector('#stage-counter');
    if (counterEl) {
      if (idx >= 0) {
        counterEl.textContent = 'Entry ' + (idx + 1) + ' of ' + unlockedList.length + ' \u2014 ' + (entry.label || '');
      } else {
        counterEl.textContent = entry.label || '';
      }
    }

    // Prev / next disabled states
    var prevEl = root.querySelector('#stage-prev');
    var nextEl = root.querySelector('#stage-next');
    if (prevEl) {
      prevEl.disabled = (idx <= 0);
      prevEl.style.opacity = prevEl.disabled ? '0.3' : '1';
      prevEl.style.cursor = prevEl.disabled ? 'default' : 'pointer';
    }
    if (nextEl) {
      nextEl.disabled = (idx < 0 || idx >= unlockedList.length - 1);
      nextEl.style.opacity = nextEl.disabled ? '0.3' : '1';
      nextEl.style.cursor = nextEl.disabled ? 'default' : 'pointer';
    }

    // Dismiss label
    var dismissEl = root.querySelector('#stage-dismiss');
    if (dismissEl) dismissEl.textContent = entry.dismissLabel || 'CLOSE';

    // Mark as seen
    markEntrySeen(state, entry.id);

    return entry;
  }

  // Return the neighbor entry id (direction = -1 or +1) relative to the given entry,
  // bounded by the unlocked list for that window. Returns null if no neighbor.
  function getNeighborEntryId(state, windowId, currentEntryId, direction) {
    var unlockedList = getUnlockedEntries(state, windowId);
    for (var i = 0; i < unlockedList.length; i++) {
      if (unlockedList[i].id === currentEntryId) {
        var next = i + direction;
        if (next < 0 || next >= unlockedList.length) return null;
        return unlockedList[next].id;
      }
    }
    return null;
  }

  // ============================================================
  // EXPORT
  // ============================================================
  global.STAGE_ENTRIES = STAGE_ENTRIES;
  global.StageEntries = {
    STAGE_ENTRIES: STAGE_ENTRIES,
    evaluateUnlock: evaluateUnlock,
    checkStageUnlocks: checkStageUnlocks,
    getEntryById: getEntryById,
    getUnlockedEntries: getUnlockedEntries,
    getUnseenCount: getUnseenCount,
    markEntrySeen: markEntrySeen,
    getDefaultEntryToShow: getDefaultEntryToShow,
    renderEntryInto: renderEntryInto,
    getNeighborEntryId: getNeighborEntryId
  };
})(window);
