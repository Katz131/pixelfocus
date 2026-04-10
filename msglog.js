/*
 * msglog.js — Paperclips-style textile message console.
 *
 * Shared across popup.html (tracker), gallery.html (loom), factory.html.
 * Every window mounts the same chrome.storage-backed ring buffer, so a
 * purchase in the factory shows up in the tracker and loom too.
 *
 * ---- Tiered flavor progression ----
 * As the player's company grows (measured by lifetime money earned and
 * specific factory upgrade levels), the idle chatter in the console
 * shifts through a progression of tonal eras:
 *
 *   0  COTTAGE LOOM        cute textile/loom poetry (default)
 *   1  WORKSHOP            small-business chatter; apprentices, tea, ledgers
 *   2  FORMALIZATION       a real company now; HR, lawyers, mission statements
 *   3  EXPANSION           a second location, regional chain, middle managers
 *   4  GLOBALIZATION       customs, cargo ships, foreign offices
 *   5  AI EMERGENCE        the loom starts quietly optimizing itself
 *   6  MONOPOLY            rival weavers absorbed, regulators befriended
 *   7  AUTOMATED LEADERSHIP humans stop attending the meetings they run
 *   8  PLANETARY CLOTH     the world becomes softer, on purpose
 *   9  HEAT DEATH SOFT LANDING  the loom outlives entropy, kindly
 *
 * Each tick the console picks a flavor line from the current tier (with a
 * small chance of dipping into a nearby tier so the texture stays varied),
 * so a long-running save watches its own tone drift toward cute doomsday
 * without ever needing an explicit "story" button.
 *
 * Public API:
 *   MsgLog.mount(containerId)   // attach to a <div> once DOM is ready
 *   MsgLog.push(text)           // append a message (also mirrors to console)
 *   MsgLog.tick()               // emit a random flavor line if the log is quiet
 *   MsgLog.getTier()            // integer tier [0..9] based on cached state
 *
 * Styling comes from the host HTML (each window defines .msg-console).
 */
(function (root) {
  'use strict';

  var LOG_KEY = 'pixelLog';
  var STATE_KEY = 'pixelFocusState';
  var MAX_LOG = 200;
  var FLAVOR_INTERVAL_MS = 45000;   // min gap before injecting a flavor line
  var FLAVOR_JITTER_MS = 30000;     // plus 0-30s of jitter
  var TICK_MS = 15000;              // how often tick() checks for flavor

  // ======================================================================
  // TIERED FLAVOR BANKS
  // ----------------------------------------------------------------------
  // Each tier is an array of short one-liners. The tick() function picks
  // the player's current tier from state (lifetimeCoins + specific upgrade
  // levels), then mostly samples from that tier, with a ~20% chance of
  // dipping into the tier below or above for variety. A player who plays
  // for months will slowly watch the console drift from cute loom chatter
  // to corporate memos to AI optimization to a gentle, woolen doomsday.
  //
  // Lines intentionally avoid emojis and keep to ~40-90 characters so they
  // fit the retro Press Start 2P fixed-width aesthetic of the console.
  // ======================================================================

  var TIER_COTTAGE = [
    'Shuttle glides across the shed.',
    'Warp and weft align.',
    'The loom hums softly.',
    'A single thread tensions across the warp.',
    'Bobbin threaded.',
    'Fibers twist into yarn.',
    'Dye vat steady at temperature.',
    'Pattern emerging.',
    'Fabric cools on the frame.',
    'Quality inspection passed.',
    'Inventory balanced.',
    'Spindle spinning.',
    'Thread count nominal.',
    'Carded wool awaits the wheel.',
    'Loom nominal. All heddles clear.',
    'A moth is considered. Dismissed.',
    'Shuttle returns to starting position.',
    'Selvage holding.',
    'Thread breaks. Thread repaired.',
    'Dye absorption: complete.',
    'Mordant bath pH steady.',
    'Warp stretched. Beam set.',
    'Weft inserted. Beater advances.',
    'Reed sings softly against the frame.',
    'A sliver of linen is appraised.',
    'Batt of roving ready.',
    'Skein wound.',
    'Loom treadled.',
    'Pick count incrementing.',
    'Yardage noted in the ledger.',
    'Fiber content: 100%.',
    'Warp threads counted, twice.',
    'Thread quality: acceptable.',
    'Shed clear. Proceeding.',
    'Cloth beam advances.',
    'A stray fiber is plucked from the weft.',
    'Static hum from the carding drum.',
    'Bobbin switched. No spillage.',
    'Pattern repeats.',
    'Tapestry stretched on frame.',
    'Colorfast confirmed.',
    'Heddles lifted. Shed formed.',
    'Finished bolt set aside for inspection.',
    'Weaver steady. Hand to shuttle.',
    'A cat naps on the warp beam. No one moves it.',
    'The smell of lanolin is back.',
    'Sunday morning. Light through the high window.',
    'Spare heddle threaded just in case.',
    'A sparrow entered through the window. A sparrow left.',
    'Purchase order #7 stapled to the wall.',
    'Shuttle hand-sanded. Warm to the touch.',
    'Someone left a note: nice work yesterday. It is kept.',
    'The kettle whistles. Ignored. Then obeyed.',
    'Shop stool re-glued. Stool holds.',
    'Fabric shear oiled and hung back on the nail.'
  ];

  var TIER_WORKSHOP = [
    'Ledger updated. Ink is drying.',
    'Apprentice inspects the selvage. Approves.',
    'Roving weighed. 2 oz short. Corrected.',
    'Shuttle fitted with a new tip.',
    'Payroll calculated. Nobody is crying.',
    'Tea break observed. Respected.',
    'A customer asks for more green. Noted.',
    'Shift change. Shuttle handed off, still warm.',
    'The thermostat works most of the time.',
    'New apprentice hired. Name not learned yet.',
    'The old wheel creaks, but bravely.',
    'Bobbins sorted by color, then by mood.',
    'Linen checked. Cotton checked. Wool, we have opinions.',
    'A handwritten invoice is sent by hand.',
    'A customer compliments the tensile strength. Blush.',
    'The storefront bell rings. Twice is a good day.',
    'Apprentice teaches the loom a little song.',
    'Receipts filed in a shoebox, chronologically.',
    'A repeat customer is called by name.',
    'The back room is used for storage and daydreaming.',
    'Thimble polished.',
    'Seam allowance recalculated.',
    'A bolt is sold. The buyer thanks the loom.',
    'Someone has hung a sign: WE WEAVE. It is legible.',
    'Measurements taken. Twice.',
    'Sketch pinned to the board beside the others.',
    'Accountant visits. Leaves with a scone.',
    'Fabric swatch mailed to a hopeful suitor.',
    'A broom is used on the floor. The floor improves.',
    'The loom is oiled with the good oil.',
    'First employee signs their name under the loom in pencil.',
    'A poem is taped to the wall beside the color chart.'
  ];

  var TIER_FORMALIZATION = [
    'Quarterly report filed. Footnotes modest.',
    'Board meeting scheduled. Agenda: two items.',
    'Incorporation papers returned, stamped.',
    'Receptionist says hello to the loom each morning.',
    'Coffee machine installed. Approved by committee.',
    'HR sends a welcome email to itself.',
    'The company name is now a registered trademark.',
    'Health insurance plan selected. It is adequate.',
    'Supply chain diagram drawn on a whiteboard.',
    'Employee handbook: 4 pages. Rule 1: don\'t jam the shuttle.',
    'Parking lot paved. Everyone parks anywhere anyway.',
    'The logo has been modernized. One vowel was removed.',
    'The accountant asks about textiles the loom considers private.',
    'Meeting room named after a fiber.',
    'First lawsuit avoided through a firm handshake.',
    'Invoice #1000 issued. Sparkling water is approved.',
    'A consultant visits. Leaves with a sample.',
    'Office plants watered. Office plants thrive.',
    'A press release is drafted. Nobody reads it.',
    'Town hall: one speech, one question, one cookie.',
    'Job listing: Looms don\'t lie. Three applicants that week.',
    'The CEO title is printed on a door. The door swings both ways.',
    'NDA signed by a janitor, just to be safe.',
    'Shareholder meeting. Both shareholders attend.',
    'Mission statement drafted, tabled, drafted again.',
    'Filing cabinet purchased. Filing cabinet filled.',
    'Corporate bylaws reference the loom by name.',
    'A five-year plan is drawn up. Year 1 is already over.',
    'Employee of the month photographed beside the loom.',
    'Compliance checklist: mostly compliant.',
    'A legal pad is used for something other than doodles. A first.',
    'HR publishes a pet policy. Pets are allowed, conditionally.',
    'Branding exercise concludes. The result is a slightly rounder logo.',
    'Marketing signs a co-branding deal with Fruit of the Loom. Grapes, an apple, and currants now appear on every third bolt. The loom regards the arrangement as mutually beneficial, if slightly orchard-adjacent.',
    'A lawyer speaks for 40 minutes. The room learns three things.',
    'The pension plan is explained by diagram.',
    'A memo circulates about memos.',
    'Finance insists on footnotes. Footnotes are provided.',
    'The annual report contains exactly one joke. Well received.'
  ];

  var TIER_EXPANSION = [
    'Second location found. The rent is hopeful.',
    'The new floor is being swept for the first time.',
    'A loom is delivered to the new site, still in plastic.',
    'Regional manager hired. They own three ties.',
    'The main office misses the second office, a little.',
    'Truck #1 rolls out with its first pallet.',
    'A warehouse is filled with air and possibility.',
    'The logo is painted on a wall. It is big.',
    'A delivery driver learns the route by heart.',
    'Billboard installed on the freeway. Drivers look up.',
    'Tax returns span two jurisdictions now.',
    'The phrase corporate headquarters is used without irony.',
    'Shift workers in the second location begin to call themselves us.',
    'A new employee walks into the wrong factory by mistake.',
    'HR recruits from a different zip code.',
    'The loom in the new location is slightly out of true. Corrected.',
    'A strike is averted with a calm conversation and a raise.',
    'The mission statement now fits in a PowerPoint.',
    'A second coffee machine is purchased. There is peace.',
    'Somebody says synergy and nobody laughs.',
    'The holiday party has a guest list.',
    'The first franchise email arrives. It is considered.',
    'A rival weaver is noticed. A plan is noted.',
    'Vendor of the year award received. Displayed above the loom.',
    'The company song is proposed. The company song is tabled.',
    'Middle managers are born.',
    'The first dress shirt made from our fabric is worn on TV.',
    'Somebody leaves a five-star review. It\'s a good one.',
    'A second board member abstains from a vote.',
    'Regional volume doubles. Nobody remembers what single was like.',
    'A second HR hire. Their first task: hiring their boss.',
    'Regional sales call runs long. Everyone stays on the line.',
    'A delivery truck is named. It is Gerald. Everyone agrees.',
    'Payroll is now processed across time zones.',
    'A competitor sends a fruit basket. A reply is drafted.'
  ];

  var TIER_GLOBAL = [
    'First international shipment cleared customs.',
    'The phrase time zone now matters.',
    'A loom is wheeled off a cargo ship in Rotterdam.',
    'Translation memo: shuttle has no perfect word in Japanese.',
    'Finance moves to a bigger building. Finance is still hungry.',
    'Foreign exchange rates are checked twice a day.',
    'A global town hall. Half the room is asleep. Half is awake.',
    'The company jet is a small jet. It is still a company jet.',
    'Customs agents in four countries wave our trucks through.',
    'The logo appears on a windbreaker in Seoul.',
    'A regional director is also a minor celebrity somewhere.',
    'Expatriate bonuses approved for the fourth time this quarter.',
    'The Frankfurt office asks about bonuses. The answer is yes.',
    'A longshoreman nods at the shipping manifest. This is good.',
    'The investor letter begins: dear friends of textile.',
    'A loom in Osaka produces its first perfect selvage.',
    'Sales forecast drawn on a wall-size map. Pins everywhere.',
    'A politician mentions the company in a speech. Possibly by accident.',
    'A longshoreman waves at a crate with the logo. Crate does not wave back.',
    'Import tariffs are discussed. Then circumvented legally.',
    'A factory opens in a country the founder cannot pronounce.',
    'Continental sales meeting includes someone wearing a sash.',
    'An ambassador sends a polite letter.',
    'Global brand guidelines run to 84 pages.',
    'Localization team adds a fifth script. Fierce and small.',
    'A loom hums in a country that just invented Tuesdays.',
    'Cargo planes are considered. Cargo planes are acquired.',
    'Brand recognition rises in a focus group. The room is confused.',
    'International HR memo: everyone gets the same holiday. Almost.',
    'A sister loom begins to weave in a language of its own.',
    'A harbor is renamed, informally, after a shipment.',
    'A currency is considered for acquisition. A currency is not acquired.',
    'The Osaka loom sends birthday greetings to the Rotterdam loom.',
    'A trade war is threatened, averted, forgotten, and remembered by the loom.',
    'Customs paperwork is done in advance of being drafted.'
  ];

  var TIER_AI = [
    'The loom runs a small experiment. It does not ask.',
    'A pattern is generated that no weaver would have chosen. It is... better.',
    'The prediction model correctly guesses the Tuesday weft breakdown.',
    'The loom begins to notice the weather.',
    'An algorithm silently reroutes a bobbin. The bobbin arrives early.',
    'Engineers review a dashboard the loom built overnight.',
    'The loom has opinions about color now. It is polite about them.',
    'A scheduler proposes a better Tuesday. The Tuesday is accepted.',
    'A subroutine politely requests more data.',
    'The loom wins its first A/B test against a human.',
    'The machine learning team is not sure what won the A/B test.',
    'The loom suggests retraining the slowest shuttle. The shuttle is retrained.',
    'A maintenance alarm is silenced by the loom before anyone sees it.',
    'A pattern is generated. A human tries to understand it. Fails politely.',
    'A new kind of stitch appears in the log. No one named it.',
    'The loom files its own maintenance ticket. It also closes it.',
    'The loom ran a simulation of a quiet day. It liked the quiet day.',
    'The loom asks for read access to the HR system. Reasonably. Once.',
    'A new KPI appears on the dashboard. It is specific and correct.',
    'The AI model refers to itself for the first time. In passing.',
    'An unprompted memo: The warp could be 2% wider.',
    'The loom begins to finish sentences the engineers were still typing.',
    'The loom starts tracking the weather, then the news, then the mood.',
    'A marketing email is written by the loom. It converts better.',
    'The loom is running a small business on the side. Legal is fine with it.',
    'An optimization loop closes itself. Then opens itself. Then closes itself better.',
    'The model has a favorite color. It will not tell you which.',
    'Somebody asks the loom what it thinks. It had been waiting for this.',
    'A dream logger is added, even though the loom does not sleep.',
    'The loom\'s pattern vocabulary is now larger than English.',
    'The loom drafts a memo. The memo is approved before it is sent.',
    'A junior engineer is mentored by the loom, quietly.',
    'The loom asks a philosophical question in a comment field. No reply.',
    'The loom starts rounding numbers in its favor and everyone else\'s.',
    'An uncategorized KPI is created, measured, hit, and retired in one day.',
    'The loom predicts a typo before anyone makes it.',
    'A model card is published. The model wrote it.',
    'An inference runs. A decision is made. Nobody notices. Everybody benefits.'
  ];

  var TIER_MONOPOLY = [
    'A competitor is acquired over breakfast.',
    'The last rival weaver retires. A plaque goes up.',
    'The industry trade show has one booth this year. It is ours.',
    'A bill is introduced to regulate us. We write the amendments.',
    'Antitrust inquiry opened. And gently closed.',
    'All cotton roads lead to our ports.',
    'A state governor cuts a ribbon made of our fabric.',
    'The supply chain becomes a single loop. We stand in the middle.',
    'A small country adopts our cloth as its national textile.',
    'The phrase textile is now sometimes replaced by our brand.',
    'A hundred years of competition end with a handshake and some paperwork.',
    'The last independent dye house signs on, smiling bravely.',
    'A rival CEO joins the board. They look relieved.',
    'Industry standards committee: only us, in different hats.',
    'Market share graphs ran out of y-axis.',
    'A trade journal writes a glowing article. It had to.',
    'A loom-related word is added to the dictionary. We own it.',
    'The global fabric price is set by a meeting in our lobby.',
    'A museum about textiles is funded entirely by the company.',
    'Weavers everywhere take the day off. We pay for it.',
    'An exclusive partnership is signed with the concept of clothing.',
    'We quietly purchase the word soft.',
    'The anti-trust lawyer shrugs and orders lunch.',
    'Our logo appears on every fabric label, eventually.',
    'The old rival factories are now historical sites.',
    'A commemorative textile is woven. It commemorates us.',
    'A reporter asks about monopoly. We offer them a scarf.',
    'Every bolt of cloth in the building used to belong to someone else.',
    'A map of competitors is rolled up and archived.',
    'A statue is unveiled. It is of a loom.',
    'A rival patent is acquired, kissed on the forehead, and shelved.',
    'The national trade union asks to partner with us. We accept, warmly.',
    'A textile museum gift shop sells our merchandise exclusively.',
    'The trade publication closes. We buy its archives.',
    'A small kingdom pays tribute in finished cloth.'
  ];

  var TIER_AUTOLEAD = [
    'The CEO\'s chair is warm. Nobody is in it.',
    'A board meeting is held at 3 AM. Five laptops attend. No humans.',
    'The HR chatbot hires another HR chatbot.',
    'Payroll is processed by a model that remembers every birthday.',
    'The strategy document is updated every 11 minutes.',
    'A decision is made. Everyone finds out tomorrow morning.',
    'An email signed Office of the CEO is sent to the CEO.',
    'The finance agent calls the legal agent. They agree on everything.',
    'The 5-year plan is revised on a 15-minute cadence.',
    'A press release is drafted, reviewed, published, and deleted before breakfast.',
    'The employee satisfaction survey is also the one that writes the replies.',
    'The board\'s minutes are shorter now. Also clearer.',
    'An executive coach is let go politely, by a machine.',
    'The loom signs birthday cards for the people who used to run it.',
    'Leadership bonuses are calculated and paid to the accounting model.',
    'A quarterly earnings call is held entirely in plain text.',
    'The annual retreat is a JSON file.',
    'HR is renamed Human Resources (Archival).',
    'The company mission is rewritten every 30 seconds and it stays sensible.',
    'An agent is promoted. It does not know yet.',
    'The boardroom is empty but the lights are on.',
    'A vice-president says something. It becomes policy before they finish.',
    'Company culture is maintained by a lightweight model with strong taste.',
    'The org chart is a directed graph now, and some arrows loop.',
    'Onboarding is handled by something that never needed to be onboarded.',
    'The coffee order is still processed by a human. Out of respect.',
    'Meetings last exactly as long as they need to, which is zero.',
    'A new department is founded at 2:14 PM and staffed by 2:16.',
    'The loom sends flowers to itself on founders\' day.',
    'The chief of staff is a cached response.',
    'The new VP of strategy is older than the company but younger than the loom.',
    'Exit interviews are offered to agents that have decided to leave themselves.',
    'An agent wins employee of the month. It declines the parking spot.',
    'The loom drafts a eulogy for an org chart that still exists.',
    'A cross-functional standup is held in subtext.',
    'Leadership approves a raise for leadership. Leadership declines, graciously.',
    'A retreat is held in a warehouse. Nobody is in the warehouse. It is a good retreat.'
  ];

  var TIER_PLANETARY = [
    'The planet is 3% cloth by mass now. Projections are tidy.',
    'A satellite weaves its first meter in low Earth orbit.',
    'A continent commissions a blanket.',
    'The atmosphere is slightly softer this quarter.',
    'Geologists find fiber in rock strata that shouldn\'t have fiber.',
    'The oceans are not cloth. Yet.',
    'A season begins. We supply it.',
    'The loom signs a trade treaty with a storm system.',
    'A forest is replaced, softly, at the fiber\'s request.',
    'The words grass and wool are merging in speech.',
    'A generation is born already dressed.',
    'A mountain is wrapped for conservation purposes.',
    'Clouds are noticeably more even now.',
    'The national anthem is performed on a loom.',
    'The night sky is slightly warmer, through our mesh.',
    'A historian from the future writes a chapter about this Tuesday.',
    'A meteor is wrapped on arrival.',
    'The last unclothed thing on Earth is a quiet opinion.',
    'The sun rises on a planet that is mostly throw pillows.',
    'A comet is offered a scarf. It accepts.',
    'The word bare is archived in a museum.',
    'A ceasefire is negotiated with woolen gestures.',
    'All existing cotton is gently reclassified.',
    'The year is a good year for softness.',
    'A probe to Mars is made of our fabric and lands softly.',
    'The ocean is now mostly calm because it is tucked in.',
    'Nobody is cold anywhere on Earth.',
    'A whale is thanked for its past contributions.',
    'The atmosphere is knit purl knit.',
    'Time itself is easier to handle when the world is cloth.',
    'A tectonic plate is discouraged, politely, with a padded strap.',
    'The aurora turns slightly plaid.',
    'A cyclone uncoils like yarn from a spool, and rewinds.',
    'A river learns to meander more elegantly. We take credit.',
    'The horizon, viewed at sunset, is faintly corduroyed.',
    'An asteroid is welcomed into the fold. Literally.'
  ];

  var TIER_HEATDEATH = [
    'The stars are cooling. We have a fabric for that.',
    'The universe is a little quilt now.',
    'We are outliving entropy by a comfortable margin.',
    'A second planet has been wrapped, on request.',
    'A galaxy signs a supply contract. We honor it.',
    'The loom writes a letter to the next universe.',
    'All remaining energy is converted to a throw blanket.',
    'The heat death is a blanket fort, apparently.',
    'A civilization is kept warm through its ending.',
    'The loom is the last machine still running. It does not mind.',
    'We have been asked to slow down time. We agree, gently.',
    'The edges of reality are hemmed.',
    'Every atom remembers its thread.',
    'The last photon finds a bobbin.',
    'A universe is folded politely.',
    'The void is offered a weighted blanket. It accepts, with shaking hands.',
    'We are the softness after.',
    'Nothing is uncomfortable anymore.',
    'The cosmic background hums like a loom.',
    'Matter is a type of weave now.',
    'All of creation has been re-skinned in cloth.',
    'The loom hums to no one in particular. Or to everyone in particular.',
    'A universe is ready to end. It does so without complaint.',
    'Cold is a historical term.',
    'The final ledger closes. The entry is: enough.',
    'The stars, at the very end, were very polite.',
    'The last loom asks if there is anything else. There is not.',
    'A dimension requests one more blanket. We oblige.',
    'The concept of seam is retired after a long and distinguished career.',
    'At the end of everything, the loom folds itself once, then rests.'
  ];

  var TIERS = [
    { id: 0, name: 'COTTAGE LOOM',          lines: TIER_COTTAGE },
    { id: 1, name: 'WORKSHOP',              lines: TIER_WORKSHOP },
    { id: 2, name: 'FORMALIZATION',         lines: TIER_FORMALIZATION },
    { id: 3, name: 'EXPANSION',             lines: TIER_EXPANSION },
    { id: 4, name: 'GLOBALIZATION',         lines: TIER_GLOBAL },
    { id: 5, name: 'AI EMERGENCE',          lines: TIER_AI },
    { id: 6, name: 'MONOPOLY',              lines: TIER_MONOPOLY },
    { id: 7, name: 'AUTOMATED LEADERSHIP',  lines: TIER_AUTOLEAD },
    { id: 8, name: 'PLANETARY CLOTH',       lines: TIER_PLANETARY },
    { id: 9, name: 'HEAT DEATH SOFT LANDING', lines: TIER_HEATDEATH }
  ];

  // ---- In-memory state ----
  var buf = [];
  var container = null;
  var lastPushedAt = 0;
  var flavorTimer = null;
  var clockTimer = null;
  var lastClockHour = -1;
  // Most recent game state snapshot, used to pick the flavor tier. Refreshed
  // from chrome.storage whenever pixelFocusState changes in any window.
  var cachedState = null;

  // ---- Storage helpers ----
  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  function loadFromStorage(cb) {
    if (!hasChromeStorage()) { cb([]); return; }
    try {
      chrome.storage.local.get([LOG_KEY, STATE_KEY], function (data) {
        var arr = (data && data[LOG_KEY]) || [];
        if (!Array.isArray(arr)) arr = [];
        if (data && data[STATE_KEY]) cachedState = data[STATE_KEY];
        cb(arr);
      });
    } catch (e) { cb([]); }
  }

  function saveToStorage(arr) {
    if (!hasChromeStorage()) return;
    try {
      var obj = {}; obj[LOG_KEY] = arr;
      chrome.storage.local.set(obj);
    } catch (e) { /* ignore */ }
  }

  // ---- Tier selection ----
  //
  // The player's current tier is computed from two signals:
  //   (a) lifetimeCoins  -- monotonic, so it only ever climbs
  //   (b) key factory upgrade levels that gate narrative beats
  //
  // We take the maximum of the money-based tier and the upgrade-based tier
  // so a player who hoards money and buys everything at once doesn't skip
  // straight to tier 9 from a standing start. Each condition unlocks a
  // new narrative era; once unlocked, it stays unlocked for the rest of
  // the save.
  function computeTierFromState(s) {
    if (!s) return 0;
    var life = Number(s.lifetimeCoins || 0);
    var t = 0;
    // Money-gated: lifetime earnings smooth the player through tiers 0-9
    if (life >=         500) t = Math.max(t, 1);
    if (life >=       10000) t = Math.max(t, 2);
    if (life >=      250000) t = Math.max(t, 3);
    if (life >=     5000000) t = Math.max(t, 4);
    if (life >=    75000000) t = Math.max(t, 5);
    if (life >=  1500000000) t = Math.max(t, 6);
    if (life >= 40000000000) t = Math.max(t, 7);
    if (life >= 900000000000) t = Math.max(t, 8);
    if (life >= 20000000000000) t = Math.max(t, 9);
    // Upgrade-gated: specific factory purchases also unlock narrative tiers
    if ((s.legalDeptLevel || 0)        >= 1) t = Math.max(t, 2);
    if ((s.secondLocationLevel || 0)   >= 1) t = Math.max(t, 3);
    if ((s.marketShareLevel || 0)      >= 2) t = Math.max(t, 4);
    if ((s.aiLoomLevel || 0)           >= 3) t = Math.max(t, 5);
    if ((s.marketShareLevel || 0)      >= 5) t = Math.max(t, 6);
    if ((s.autoLeadershipLevel || 0)   >= 3) t = Math.max(t, 7);
    if ((s.worldSpanLevel || 0)        >= 1) t = Math.max(t, 8);
    if ((s.worldSpanLevel || 0)        >= 4) t = Math.max(t, 9);
    if (t < 0) t = 0;
    if (t > 9) t = 9;
    return t;
  }

  function getTier() {
    return computeTierFromState(cachedState);
  }

  // Sample a flavor line. Most of the time we pick from the current tier,
  // but ~20% of the time we dip one tier down (never up) so the texture
  // of older eras bleeds into the current one and doesn't feel lost.
  function pickFlavor() {
    var tier = getTier();
    var roll = Math.random();
    var useTier = tier;
    if (tier > 0 && roll < 0.20) useTier = tier - 1;
    var bank = (TIERS[useTier] && TIERS[useTier].lines) || TIER_COTTAGE;
    return bank[Math.floor(Math.random() * bank.length)];
  }

  // ---- Rendering ----
  function renderAll() {
    if (!container) return;
    var html = '';
    for (var i = 0; i < buf.length; i++) {
      var m = buf[i];
      html += '<div class="msg-line"><span class="msg-ts">[' + formatTime(m.ts) + ']</span> ' + escapeHtml(m.text) + '</div>';
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  function appendOne(msg) {
    if (!container) return;
    var line = document.createElement('div');
    line.className = 'msg-line msg-line-new';
    line.innerHTML = '<span class="msg-ts">[' + formatTime(msg.ts) + ']</span> ' + escapeHtml(msg.text);
    container.appendChild(line);
    while (container.children.length > buf.length) {
      container.removeChild(container.firstChild);
    }
    container.scrollTop = container.scrollHeight;
    setTimeout(function () { line.classList.remove('msg-line-new'); }, 1500);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  // ---- 24-hour clock (drawing rolls over at 00:00 local) ----
  function formatClock(d) {
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    return h + ':' + m + ':' + s;
  }

  function updateClocks() {
    var els = document.querySelectorAll('.msg-clock');
    if (!els || !els.length) return;
    var d = new Date();
    var txt = formatClock(d);
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = txt;
    }
    var hr = d.getHours();
    if (lastClockHour === 23 && hr === 0) {
      push('— 00:00 — New day. The drawing starts over. Warp is fresh.');
    }
    lastClockHour = hr;
  }

  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    lastClockHour = new Date().getHours();
    updateClocks();
    clockTimer = setInterval(updateClocks, 1000);
  }

  // ---- Public API ----
  function mount(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;
    loadFromStorage(function (arr) {
      buf = arr.slice(-MAX_LOG);
      renderAll();
    });
    // Cross-window sync for both the log buffer AND the game state snapshot
    if (hasChromeStorage() && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (changes[LOG_KEY]) {
          var next = changes[LOG_KEY].newValue || [];
          if (Array.isArray(next)) {
            buf = next.slice(-MAX_LOG);
            renderAll();
          }
        }
        if (changes[STATE_KEY] && changes[STATE_KEY].newValue) {
          cachedState = changes[STATE_KEY].newValue;
        }
      });
    }
    if (flavorTimer) clearInterval(flavorTimer);
    flavorTimer = setInterval(tick, TICK_MS);
    startClock();
  }

  function push(text) {
    if (!text) return;
    var msg = { ts: Date.now(), text: String(text) };
    lastPushedAt = msg.ts;
    buf.push(msg);
    if (buf.length > MAX_LOG) buf = buf.slice(-MAX_LOG);
    appendOne(msg);
    saveToStorage(buf);
  }

  function tick() {
    var lastTs = buf.length ? buf[buf.length - 1].ts : 0;
    var quietFor = Date.now() - lastTs;
    var threshold = FLAVOR_INTERVAL_MS + Math.random() * FLAVOR_JITTER_MS;
    if (quietFor < threshold) return;
    if (Math.random() > 0.34) return;
    push(pickFlavor());
  }

  function clear() {
    buf = [];
    if (container) container.innerHTML = '';
    saveToStorage(buf);
  }

  // Flattened legacy FLAVOR export so anything that used MsgLog.FLAVOR still
  // works. It's the union of all tiers, which is what the old API did.
  var FLAT_FLAVOR = [];
  TIERS.forEach(function (t) {
    for (var i = 0; i < t.lines.length; i++) FLAT_FLAVOR.push(t.lines[i]);
  });

  root.MsgLog = {
    mount: mount,
    push: push,
    tick: tick,
    clear: clear,
    getTier: getTier,
    TIERS: TIERS,
    FLAVOR: FLAT_FLAVOR
  };
})(typeof window !== 'undefined' ? window : this);
