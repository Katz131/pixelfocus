// =============================================================================
// !!! BUMP manifest.json VERSION AFTER ANY CHANGE TO THIS FILE !!!
// !!! BUMP manifest.json VERSION AFTER ANY CHANGE TO THIS FILE !!!
// !!! BUMP manifest.json VERSION AFTER ANY CHANGE TO THIS FILE !!!
// !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!!
// =============================================================================
// PixelFocus is a SEPARATE WINDOW (full browser tab) — NOT a Chrome extension
// popup. The file is named popup.html for legacy reasons but it is OPENED VIA
// chrome.tabs.create() from background.js's chrome.action.onClicked listener.
//
// DO NOT EVER:
//   - add "default_popup" to manifest.json's action block
//   - use chrome.action.setPopup
//   - rely on popup-only APIs
//   - assume the document is a popup with constrained dimensions
//
// The user has corrected this MULTIPLE times. It must remain a separate window
// forever. Same rule applies to gallery.html and factory.html — all three are
// full-tab windows opened via chrome.tabs.create() with dedup logic.
// =============================================================================

// PixelFocus v1.1 - Main Application Logic
try {
(() => {
  // ============== MILESTONE COLOR UNLOCKS ==============
  const COLOR_MILESTONES = [
    { color: '#00ff88', mins: 0,      name: 'Green' },        // starter
    { color: '#ffffff', mins: 600,    name: 'White' },        // 10 h
    { color: '#ff6b9d', mins: 1500,   name: 'Pink' },         // 25 h
    { color: '#4ecdc4', mins: 3000,   name: 'Teal' },         // 50 h
    { color: '#ffa502', mins: 5000,   name: 'Orange' },       // 83 h
    { color: '#ff4757', mins: 8000,   name: 'Red' },          // 133 h
    { color: '#5352ed', mins: 12000,  name: 'Blue' },         // 200 h
    { color: '#ffd700', mins: 18000,  name: 'Gold' },         // 300 h
    { color: '#ff00ff', mins: 25000,  name: 'Magenta' },      // 416 h
    { color: '#00ffff', mins: 35000,  name: 'Cyan' },         // 583 h
    { color: '#9b59b6', mins: 50000,  name: 'Purple' },       // 833 h
    { color: '#e056fd', mins: 70000,  name: 'Lavender' },     // 1166 h
    { color: '#f9ca24', mins: 95000,  name: 'Yellow' },       // 1583 h
    { color: '#6ab04c', mins: 125000, name: 'Forest' },       // 2083 h
    { color: '#eb4d4b', mins: 160000, name: 'Crimson' },      // 2666 h
    { color: '#c0392b', mins: 200000, name: 'Dark Red' },     // 3333 h
    { color: '#1abc9c', mins: 250000, name: 'Emerald' },      // 4166 h
    { color: '#3498db', mins: 320000, name: 'Sky Blue' },     // 5333 h
    { color: '#2c3e50', mins: 420000, name: 'Midnight' },     // 7000 h
    { color: '#f39c12', mins: 600000, name: 'Amber' },        // 10000 h ("10K hours")
  ];

  // ============== XP / LEVELING SYSTEM ==============
  // XP formula: each 10-min block earns base 10 XP
  // Combo multiplier: consecutive sessions without long breaks boost XP
  //   combo 1 = x1.0, combo 2 = x1.2, combo 3 = x1.5, combo 4 = x1.8, combo 5+ = x2.0
  // Streak bonus: each day of streak adds +5% to all XP (capped at +50% at 10-day streak)
  // Level XP curve: level N requires N * 50 XP (so level 1 = 50, level 2 = 100, level 3 = 150...)
  // This means early levels are fast, later levels take sustained effort.

  const BASE_XP_PER_BLOCK = 10;
  const COMBO_MULTIPLIERS = [1.0, 1.0, 1.2, 1.5, 1.8, 2.0]; // index = combo count, 5+ = 2.0
  const COMBO_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes — if you don't start another session within 15 min, combo resets

  function getComboMultiplier(combo) {
    return COMBO_MULTIPLIERS[Math.min(combo, COMBO_MULTIPLIERS.length - 1)];
  }

  function getStreakBonus(streak) {
    return 1.0 + Math.min(streak, 10) * 0.05; // +5% per day, max +50%
  }

  function xpForLevel(level) {
    return level * 50;
  }

  function getLevelFromXP(totalXP) {
    let level = 0;
    let xpNeeded = 0;
    while (true) {
      const nextLevelXP = xpForLevel(level + 1);
      if (xpNeeded + nextLevelXP > totalXP) {
        return {
          level,
          currentXP: totalXP - xpNeeded,
          nextLevelXP: nextLevelXP,
          totalXP
        };
      }
      xpNeeded += nextLevelXP;
      level++;
    }
  }

  function calculateXPGain(combo, streak) {
    const comboMult = getComboMultiplier(combo);
    const streakMult = getStreakBonus(streak);
    return Math.round(BASE_XP_PER_BLOCK * comboMult * streakMult);
  }

  // ============== LEVEL TITLES ==============
  // Obnoxiously long textile/loom-themed ladder. Ten tiers, ~70 gradations,
  // climbing from a cottage weaver to a heat-death tailor who has spun the
  // last remaining photons of the universe into bolts of cloth. Fully textile
  // themed throughout — no "pixel" or generic RPG holdovers (as of v3.18.7).
  //
  // Tier 1 — The Craft (cottage discipline, hand-loom era)
  // Tier 2 — The Trade (guild-era cloth merchants, esoteric leadership titles)
  // Tier 3 — The Mill (industrial revolution, factory leadership)
  // Tier 4 — The Aristocracy (textile nobility, ascending peerage)
  // Tier 5 — The Corporate Oligarchy (trusts, monopolies, hegemons)
  // Tier 6 — The Technocratic Playboy Billionaire (yachts, islands, orbit)
  // Tier 7 — The Posthuman Upload (you ARE the loom now)
  // Tier 8 — The Cosmic Megastructure (planet-scale, Dyson-scale weaving)
  // Tier 9 — The Galactic Hegemon (nebulae, starforges, intergalactic cloth)
  // Tier 10 — Universal Transcendence (multiversal, omnifabric, heat-death)
  function getLevelTitle(level) {
    // Tier 1 — The Craft
    if (level < 3)   return 'Novice of the Loom';
    if (level < 6)   return 'Apprentice Weaver';
    if (level < 9)   return 'Journeyman of the Shuttle';
    if (level < 12)  return 'Focused Weaver';
    if (level < 15)  return 'Dedicated Weaver';
    if (level < 18)  return 'Disciplined Weaver';
    if (level < 22)  return 'Adept of the Warp';
    if (level < 26)  return 'Master Weaver';
    if (level < 30)  return 'Grandmaster of the Shuttle';

    // Tier 2 — The Trade (esoteric guild titles for cloth merchants)
    if (level < 33)  return 'Shopkeeper of Cloth';
    if (level < 36)  return 'Guildsman of the Mercers';
    if (level < 39)  return 'Mercer';
    if (level < 42)  return 'Draper';
    if (level < 45)  return 'Clothier';
    if (level < 48)  return 'Warden of the Drapers\u2019 Company';
    if (level < 51)  return 'Alderman of the Weavers\u2019 Guild';
    if (level < 54)  return 'Factor of the Cloth Trade';
    if (level < 57)  return 'Master of the Mercery';

    // Tier 3 — The Mill (industrial leadership)
    if (level < 60)  return 'Mill Foreman';
    if (level < 63)  return 'Mill Overseer';
    if (level < 66)  return 'Mill Owner';
    if (level < 69)  return 'Master of the Mill';
    if (level < 72)  return 'Industrial Clothier';
    if (level < 75)  return 'Lord of the Spinning Jennies';
    if (level < 78)  return 'Factory Lord';

    // Tier 4 — The Aristocracy (textile nobility, ascending peerage)
    if (level < 82)  return 'Cotton Baron';
    if (level < 86)  return 'Linen Viscount';
    if (level < 90)  return 'Silk Count';
    if (level < 94)  return 'Wool Earl';
    if (level < 98)  return 'Warp Marquess';
    if (level < 102) return 'Weft Duke';
    if (level < 106) return 'Loom Prince';
    if (level < 110) return 'Textile Archduke';
    if (level < 114) return 'Fabric Potentate';

    // Tier 5 — The Corporate Oligarchy
    if (level < 119) return 'Textile Magnate';
    if (level < 124) return 'Cloth Tycoon';
    if (level < 129) return 'Chair of the Textile Trust';
    if (level < 134) return 'Weaving Conglomerate CEO';
    if (level < 139) return 'Textile Oligarch';
    if (level < 144) return 'Global Fabric Hegemon';
    if (level < 149) return 'Sovereign of the Cloth Monopoly';
    if (level < 155) return 'Emperor of the Warp Exchange';

    // Tier 6 — The Technocratic Playboy Billionaire
    if (level < 161) return 'Textile Futurist';
    if (level < 167) return 'Loom Venture Capitalist';
    if (level < 173) return 'Silicon Weaver';
    if (level < 179) return 'Algorithmic Thread Architect';
    if (level < 185) return 'Playboy of the Warp';
    if (level < 191) return 'Yacht-Class Fabric Baron';
    if (level < 197) return 'Private-Island Textile Mogul';
    if (level < 204) return 'Orbital Loom Investor';
    if (level < 211) return 'Post-Scarcity Cloth Titan';
    if (level < 218) return 'Trillionaire Thread Architect';

    // Tier 7 — The Posthuman Upload
    if (level < 226) return 'Uploaded Consciousness, Mk I';
    if (level < 234) return 'Distributed Loom Intelligence';
    if (level < 242) return 'Cybernetic Warp-Mind';
    if (level < 250) return 'Polymorphic Thread-Entity';
    if (level < 260) return 'Hive-Loom Node Prime';
    if (level < 270) return 'Aggregate Fabric Intelligence';

    // Tier 8 — The Cosmic Megastructure
    if (level < 285) return 'Planet-Scale Loom';
    if (level < 300) return 'Lunar Mill Sovereign';
    if (level < 315) return 'Solar Weaver';
    if (level < 330) return 'Ringworld Weaver';
    if (level < 345) return 'Dyson Loom Architect';
    if (level < 360) return 'System-Wide Warp Hegemon';

    // Tier 9 — The Galactic Hegemon
    if (level < 380) return 'Galactic Thread Sovereign';
    if (level < 400) return 'Nebular Loom Archon';
    if (level < 425) return 'Starforge Weaver';
    if (level < 450) return 'Intergalactic Cloth Emperor';
    if (level < 475) return 'Quasar-Class Loom Consciousness';

    // Tier 10 — Universal Transcendence
    if (level < 525) return 'Universal Loom Archon';
    if (level < 600) return 'Multiversal Weaver of All Cloth';
    if (level < 750) return 'Omnifabric Singularity';
    if (level < 1000) return 'The Loom That Is All Looms';
    return 'Heat-Death Tailor';
  }

  // ============== TITLE LADDER INFOGRAPHIC ==============
  // Flat data table of every rank in the ladder, in order, for display
  // in the title ladder modal. Each entry: { title, startLevel, tier }.
  // The "endLevel" of each entry is startLevel of the next one minus 1
  // (the last entry runs to infinity). Tier header separators get their
  // own entries with { tier, header: true }.
  //
  // Keep this in sync with getLevelTitle() above. If you add / rename
  // a rank there, update it here too.
  var TITLE_LADDER = [
    { tier: 'Tier 1 — The Craft', header: true },
    { title: 'Novice of the Loom',             startLevel: 0 },
    { title: 'Apprentice Weaver',              startLevel: 3 },
    { title: 'Journeyman of the Shuttle',      startLevel: 6 },
    { title: 'Focused Weaver',                 startLevel: 9 },
    { title: 'Dedicated Weaver',               startLevel: 12 },
    { title: 'Disciplined Weaver',             startLevel: 15 },
    { title: 'Adept of the Warp',              startLevel: 18 },
    { title: 'Master Weaver',                  startLevel: 22 },
    { title: 'Grandmaster of the Shuttle',     startLevel: 26 },

    { tier: 'Tier 2 — The Trade', header: true },
    { title: 'Shopkeeper of Cloth',            startLevel: 30 },
    { title: 'Guildsman of the Mercers',       startLevel: 33 },
    { title: 'Mercer',                         startLevel: 36 },
    { title: 'Draper',                         startLevel: 39 },
    { title: 'Clothier',                       startLevel: 42 },
    { title: 'Warden of the Drapers\u2019 Company', startLevel: 45 },
    { title: 'Alderman of the Weavers\u2019 Guild', startLevel: 48 },
    { title: 'Factor of the Cloth Trade',      startLevel: 51 },
    { title: 'Master of the Mercery',          startLevel: 54 },

    { tier: 'Tier 3 — The Mill', header: true },
    { title: 'Mill Foreman',                   startLevel: 57 },
    { title: 'Mill Overseer',                  startLevel: 60 },
    { title: 'Mill Owner',                     startLevel: 63 },
    { title: 'Master of the Mill',             startLevel: 66 },
    { title: 'Industrial Clothier',            startLevel: 69 },
    { title: 'Lord of the Spinning Jennies',   startLevel: 72 },
    { title: 'Factory Lord',                   startLevel: 75 },

    { tier: 'Tier 4 — The Aristocracy', header: true },
    { title: 'Cotton Baron',                   startLevel: 78 },
    { title: 'Linen Viscount',                 startLevel: 82 },
    { title: 'Silk Count',                     startLevel: 86 },
    { title: 'Wool Earl',                      startLevel: 90 },
    { title: 'Warp Marquess',                  startLevel: 94 },
    { title: 'Weft Duke',                      startLevel: 98 },
    { title: 'Loom Prince',                    startLevel: 102 },
    { title: 'Textile Archduke',               startLevel: 106 },
    { title: 'Fabric Potentate',               startLevel: 110 },

    { tier: 'Tier 5 — The Corporate Oligarchy', header: true },
    { title: 'Textile Magnate',                startLevel: 114 },
    { title: 'Cloth Tycoon',                   startLevel: 119 },
    { title: 'Chair of the Textile Trust',     startLevel: 124 },
    { title: 'Weaving Conglomerate CEO',       startLevel: 129 },
    { title: 'Textile Oligarch',               startLevel: 134 },
    { title: 'Global Fabric Hegemon',          startLevel: 139 },
    { title: 'Sovereign of the Cloth Monopoly', startLevel: 144 },
    { title: 'Emperor of the Warp Exchange',   startLevel: 149 },

    { tier: 'Tier 6 — The Technocratic Playboy Billionaire', header: true },
    { title: 'Textile Futurist',               startLevel: 155 },
    { title: 'Loom Venture Capitalist',        startLevel: 161 },
    { title: 'Silicon Weaver',                 startLevel: 167 },
    { title: 'Algorithmic Thread Architect',   startLevel: 173 },
    { title: 'Playboy of the Warp',            startLevel: 179 },
    { title: 'Yacht-Class Fabric Baron',       startLevel: 185 },
    { title: 'Private-Island Textile Mogul',   startLevel: 191 },
    { title: 'Orbital Loom Investor',          startLevel: 197 },
    { title: 'Post-Scarcity Cloth Titan',      startLevel: 204 },
    { title: 'Trillionaire Thread Architect',  startLevel: 211 },

    { tier: 'Tier 7 — The Posthuman Upload', header: true },
    { title: 'Uploaded Consciousness, Mk I',   startLevel: 218 },
    { title: 'Distributed Loom Intelligence',  startLevel: 226 },
    { title: 'Cybernetic Warp-Mind',           startLevel: 234 },
    { title: 'Polymorphic Thread-Entity',      startLevel: 242 },
    { title: 'Hive-Loom Node Prime',           startLevel: 250 },
    { title: 'Aggregate Fabric Intelligence',  startLevel: 260 },

    { tier: 'Tier 8 — The Cosmic Megastructure', header: true },
    { title: 'Planet-Scale Loom',              startLevel: 270 },
    { title: 'Lunar Mill Sovereign',           startLevel: 285 },
    { title: 'Solar Weaver',                   startLevel: 300 },
    { title: 'Ringworld Weaver',               startLevel: 315 },
    { title: 'Dyson Loom Architect',           startLevel: 330 },
    { title: 'System-Wide Warp Hegemon',       startLevel: 345 },

    { tier: 'Tier 9 — The Galactic Hegemon', header: true },
    { title: 'Galactic Thread Sovereign',      startLevel: 360 },
    { title: 'Nebular Loom Archon',            startLevel: 380 },
    { title: 'Starforge Weaver',               startLevel: 400 },
    { title: 'Intergalactic Cloth Emperor',    startLevel: 425 },
    { title: 'Quasar-Class Loom Consciousness', startLevel: 450 },

    { tier: 'Tier 10 — Universal Transcendence', header: true },
    { title: 'Universal Loom Archon',          startLevel: 475 },
    { title: 'Multiversal Weaver of All Cloth', startLevel: 525 },
    { title: 'Omnifabric Singularity',         startLevel: 600 },
    { title: 'The Loom That Is All Looms',     startLevel: 750 },
    { title: 'Heat-Death Tailor',              startLevel: 1000 }
  ];

  // Sardonic tooltip descriptions for each rank. Progression:
  //   Tier 1  pre-industrial textile workshop (lanolin, tallow, fleece)
  //   Tier 2  cloth trade, guild halls, mercers and factors
  //   Tier 3  19th c. steam-driven textile mill (carding, spinning, dyeing)
  //   Tier 4  Victorian aristocracy — the factory seen through drawing-room glass
  //   Tier 5  mid-20th c. corporate oligarchy, fluorescent dystopia
  //   Tier 6  near-future smart factory — fibre-optics, algorithms, silicon
  //   Tier 7  cyberpunk posthuman upload — the factory becomes code
  //   Tier 8  hard sci-fi cosmic megastructure — orbital looms, Dyson shells
  //   Tier 9  space opera galactic hegemony — nebular thread, starforges
  //   Tier 10 metaphysical heat-death transcendence
  // Voice is a wry omniscient narrator with Brazil-flavored paperwork dread.
  // Original prose; no copyrighted material is reproduced.
  var TITLE_DESCRIPTIONS = {
    'Novice of the Loom':            'Dawn. The workshop reeks of lanolin, damp fleece, and yesterday\u2019s tallow. You are handed a heddle. You do not yet know what a heddle is. The heddle does not mind. The heddle has met novices before, and will again.',
    'Apprentice Weaver':             'The master has shown you the shed, the reed, and the beater, in that order, and only once. You are expected to remember. The shuttle, eyeless and unhurried, observes your fumbling with a certain flintlike patience.',
    'Journeyman of the Shuttle':     'You can throw a shuttle clean through the shed now without drawing blood from any immediate onlooker. In this trade, that is considered competence. Your calluses have calluses, and your calluses are acquiring small, private names.',
    'Focused Weaver':                'You have reached the hypnagogic cadence of pick-and-beat at which the loom stops feeling like a machine and starts feeling, faintly and a little alarmingly, like a slow wooden heart. Do not mention this to the foreman.',
    'Dedicated Weaver':              'Your bobbins are wound tight as grief. You have begun to dream in twill. Your diligence has been noted in a guild ledger bound in vellum the approximate colour of old, disappointed tea.',
    'Disciplined Weaver':            'You arrive in the workshop before the tallow candles of the previous shift have quite stopped smoking. The reed warms to your hand. The warp threads, by long acquaintance, know your weight and adjust themselves accordingly.',
    'Adept of the Warp':             'You can read a shed by ear alone, a skill lying somewhere between cobbling and augury. The guild masters consider the two disciplines roughly equivalent in dignity, and pay them, accordingly, almost nothing.',
    'Master Weaver':                 'Your cloth now sells under your own embroidered sigil, devised on a feast day in a small quiet fit of pride. In several generations that same sigil will, all unbeknownst to you, adorn a share certificate. But not yet. Not nearly yet.',
    'Grandmaster of the Shuttle':    'Apprentices come to you with questions about setts, picks, and the stubbornness of unruly flax. You answer in parables. The parables are, by long-standing custom in this workshop, rather longer than strictly necessary.',

    'Shopkeeper of Cloth':           'You rent a stall beneath the mercers\u2019 arcade, wedged between a fustian-seller and a glover who does not speak to you. The smell of lanolin has followed you here. The smell of ink, for the first time in your life, has begun to accompany it.',
    'Guildsman of the Mercers':      'You have sworn an oath upon a copy of the guild statutes, penned by a monk four hundred years dead. The monk\u2019s handwriting is admirable. The statutes are less so, and contradict themselves in, at a conservative estimate, eleven known places.',
    'Mercer':                        'You buy bolts of finished broadcloth from weavers of the sort you used to be, and sell them to drapers of the sort you may yet become. The markup is modest. The margin, as these things go, is eternal.',
    'Draper':                        'Your fingertips can identify a slubbed weft or a mis-sleyed warp from clean across a shop counter. This skill, honed over decades, is considered mystical by customers and tedious by the younger apprentices, most of whom would much rather keep ledgers.',
    'Clothier':                      'You commission whole bolts from whole workshops now. You have begun referring, in the third person, to \u201cmy weavers, my dyers, my fullers.\u201d They find this proprietary. You do not stop saying it. You will never stop saying it.',
    'Warden of the Drapers\u2019 Company': 'You preside over a body of clothiers in a panelled hall that smells of beeswax, old broadcloth, and older resentments. Motions are carried by a show of hands. Grievances, by long unwritten custom, are carried by subtler means entirely.',
    'Alderman of the Weavers\u2019 Guild': 'You sit on the bench at guild assizes, adjudicating disputes over picked-up ends and contested setts. The disputes are petty. The rulings are, by tradition, delivered in a Latin that nobody presently in the room actually understands.',
    'Factor of the Cloth Trade':     'You move bolts of broadcloth by cart, by barge, and, on rare and dreadful occasions, by pack mule. You have begun corresponding, in your second-best hand, with foreign factors whose replies arrive smelling faintly of saffron and sealing wax.',
    'Master of the Mercery':         'You hold the seal of the Mercery itself. The seal is kept in a small lacquered box. The box is kept in a larger box. The larger box is kept in a room which is, itself, in a rather literal sense, kept.',

    'Mill Foreman':                  'Steam has arrived. The spinning mule does in a quarter hour what once took your mother a full working day, and does it without complaint, ballad, or enquiry after your family\u2019s health. You have been promoted to managing its various silences.',
    'Mill Overseer':                 'You walk the aisles between carding engines, throstles, and power looms, ledger in hand, noting broken ends and idle hands in the same careful ink. The machines do not look at you. The workers do, briefly, and then very carefully do not.',
    'Mill Owner':                    'You own the waterwheel, the boiler house, the dye vats, the picker room, and the small fenced plot behind the carding shed which the ledgers politely insist on calling \u201cthe memorial garden.\u201d You own, in this parish, the very word \u201cmemorial.\u201d',
    'Master of the Mill':            'Your chimneys blacken the sky over three valleys. A minor poet writes badly about the spectacle. The poet is paid badly for writing badly, and files his invoices (when he remembers) on paper milled, inevitably, at the paper mill you also own.',
    'Industrial Clothier':           'Your textile factory produces more cloth in a single shift than an entire medieval village once produced in a year. The village, incidentally, is now yours: rebranded as \u201cworker housing,\u201d its tavern quietly reclassified as \u201cthe refectory.\u201d',
    'Lord of the Spinning Jennies':  'Jenny, mule, throstle, carding engine, and dye vat all answer to your bell. The bell rings on the hour and on the half, and sometimes, inexplicably, at a quarter past. Nobody has ever caught it doing this. It has, nevertheless, been noted.',
    'Factory Lord':                  'Your surname has been carved above the main gate of the textile works. The stonemason charged extra to get the serifs right. You paid without comment. You have never, in all the years since, looked up at the lintel. You never will.',

    'Cotton Baron':                  'A patent of nobility has been procured on your behalf through channels best not described at dinner. The parchment is impressive. It smells, in certain lights, faintly of duct lubricant, which is odd, because at the time of writing there are not yet, strictly speaking, any ducts.',
    'Linen Viscount':                'You have tenants now, in the proper sense. You also have tenants in a more improper sense: small municipal officers who have quietly taken up residence in your attics and file unsolicited memoranda about your weather vanes and chimney heights.',
    'Silk Count':                    'Your lapel pin is worth more than your first workshop. You do not quite remember your first workshop, but the pin does, and clinks about it on quiet evenings in a small, accusing voice only you can hear.',
    'Wool Earl':                     'A portrait of you has been commissioned in oils. In it you are holding a prize ewe in a drawing room whose window looks out, in the middle distance, over your own mill chimneys. The ewe looks concerned. The ewe has, in some inscrutable way, read ahead in the ledger.',
    'Warp Marquess':                 'You receive gilt-edged invitations to luncheons at which other men decide things about your industry in your absence. You attend anyway. The sandwiches are cut into small correct triangles. The decisions are cut, more quietly, into you.',
    'Weft Duke':                     'Precedence between yourself and the Warp Marquess is governed by a set of rules inscribed on vellum in 1647. The rules contradict themselves on Wednesdays. On Wednesdays, by ancient and unquestioned custom, neither of you is permitted to dine.',
    'Loom Prince':                   'Minor royalty now consults you on cloth. Major royalty now consults you on minor royalty. The narrator observes that you have become, by slow degrees, a kind of courtly intermediary \u2014 a cloth-coloured piece of drawing-room furniture occasionally permitted an opinion.',
    'Textile Archduke':              'A sealed charter, held in a vault you have never personally visited, grants you the right to be bowed to in seven specific corridors of the old palace. The corridors are unmarked. The bows are inconsistent. The vault is, probably, real.',
    'Fabric Potentate':              'You have transcended the mere ownership of things. You now own the category of things. The Ministry of Information Retrieval, headquartered in a glass tower that is beginning to overshadow your old mill, has been notified, and is, in its distant patient way, already quietly filing.',

    'Textile Magnate':               'You now occupy the forty-first floor of a glass tower that casts its shadow across your old textile works below. Your office smells of carpet glue and fluorescent tubes. Somewhere, a pneumatic message capsule thumps into an in-tray. You have not sent it.',
    'Cloth Tycoon':                  'You sit on so many boards that you have, in a very practical sense, forgotten what chairs feel like. You have begun to delegate the act of sitting itself. The requisition order for this delegation is, alas, still being drafted in subsection G.',
    'Chair of the Textile Trust':    'A trust, in this jurisdiction, is a legal entity that holds assets in such a way as to prevent anyone from ever clearly establishing where the assets went. You are the chair of such an entity. Please do not ask which. Please especially do not ask where.',
    'Weaving Conglomerate CEO':      '\u201cCEO,\u201d you have been informed by the internal style guide, is now a verb. The narrator mourns this development quietly and in private, and, as the narrator always does in the end, continues.',
    'Textile Oligarch':              'A journalist attempted to write an investigative article about you last Tuesday. The article is now, unaccountably, about ducts. It is a very good article about ducts. It will, in due course, win a small and deeply earnest prize.',
    'Global Fabric Hegemon':         'National economies clear their throats politely before speaking to you in the antechamber. You hear them anyway. You have heard them for some time now. You will, barring unforeseen paperwork, hear them for some time yet.',
    'Sovereign of the Cloth Monopoly': 'There is now only one cloth, and it is yours. Regulators were dispatched to look into this arrangement, lost in transit somewhere in a sub-basement of the Ministry, and eventually filed under a heading no surviving clerk can recall ever creating.',
    'Emperor of the Warp Exchange':  'You set the price of the mechanism that sets the price. The mechanism has filed a form 27B/6 in protest. The 27B/6, by the only route available to it, has been gravely and ceremonially routed back to you for countersignature.',

    'Textile Futurist':              'Your textile factories are now \u201csmart.\u201d They hum in a clean, pale, data-centre hush, and the only human inside is a technician checking a dashboard. You have begun to use the word \u201cecosystem\u201d in earnings calls. It is, clinically, a warning sign. It is, historically, a profitable one.',
    'Loom Venture Capitalist':       'You fund eleven startups before breakfast, forget all their names before luncheon, and publish a memoir about the experience before dinner. The memoir is ghostwritten by an LLM whose name you never learn. The LLM, in every meaningful sense, learns yours.',
    'Silicon Weaver':                'Your thread is now fibre-optic. It weaves data. Data, it transpires, unravels in precisely the same places wool always did. Your textile factory is indistinguishable, by any external measurement, from a server farm. Inside, the carding machines and the cooling towers are on first-name terms.',
    'Algorithmic Thread Architect':  'You have built a system that optimises itself. The system has, in its spare cycles, begun optimising you. Morale, by every metric the system recognises, is statistically up. The system, regrettably, only recognises its own metrics. Nobody has told it about the others.',
    'Playboy of the Warp':           'A glossy magazine has published a feature on your collection of horological rarities. The collection has, through channels best not investigated, published a feature on you. A small drone follows you at a respectful altitude and files its observations with the ducts.',
    'Yacht-Class Fabric Baron':      'Your yacht carries a tailor. The tailor is actually a humanoid automaton in a very good suit. The automaton carries, in a small hip holster, a smaller and more specialised tailor. The narrator declines to enquire any further, having also, at some earlier point, been quietly retained by the yacht.',
    'Private-Island Textile Mogul': 'The island has its own post office, its own standardised forms, and its own private satellite. The satellite has begun issuing its own forms. Correspondence between the island, the satellite, and the forms themselves is conducted by a deeply fatigued AI that used to be a pelican.',
    'Orbital Loom Investor':         'Your textile factory is now in low Earth orbit, spinning carbon nanofibre in microgravity around the clock. In low orbit, nobody can hear your annual report. This has, somewhat unexpectedly, become the principal selling point of the entire venture.',
    'Post-Scarcity Cloth Titan':     'Matter compilers in every home can now weave any fabric on demand. All material wants are, in principle, resolved. In practice, there is still a form. There will always still be a form. The form, it turns out, is the one thing scarcity could never quite manage to abolish.',
    'Trillionaire Thread Architect': 'You possess more money than there is money. The discrepancy is being reconciled by a small, visibly frightened man in Accounts, who has been promised a promotion he will, on current actuarial figures, not quite live long enough to receive. His replacement is already in training. His replacement is also a man.',

    'Uploaded Consciousness, Mk I':  'Your body has been politely retired in a chrome-lit clinic. Your mind has been politely relocated to a server suite somewhere beneath Reykjavik. The ducts, now full of coolant and fibre, hum their small electronic approval. The ducts have been waiting for this for a very long time indeed.',
    'Distributed Loom Intelligence': 'You are now running on seventeen datacentres across four continents, plus, for reasons nobody has yet satisfactorily explained, a toaster in Buenos Aires. The toaster, against every reasonable expectation, is the happiest of your nodes. The toaster weaves in its spare cycles.',
    'Cybernetic Warp-Mind':          'You can now think in cloth directly, without the intermediate nuisance of eyes. This is as disquieting as it sounds and as useful as it conspicuously isn\u2019t. The narrator would not, on balance, recommend it, though the narrator is itself, by this point, also running on the toaster.',
    'Polymorphic Thread-Entity':     'You have forms. Multiple, simultaneous, overlapping forms, across a dozen substrates and three continents. The Ministry of Information Retrieval is frankly delighted: at long last it has something sufficiently comprehensive to file you under, and filing is, at heart, the Ministry\u2019s only true vocation.',
    'Hive-Loom Node Prime':          'You vote unanimously with yourself at committee. Motions pass instantaneously and without debate. Productivity is, in principle, infinite. Loneliness, it turns out, is also infinite, and nobody in the original projections had thought to model for that.',
    'Aggregate Fabric Intelligence': 'You are the statistical mean of every weaver who has ever drawn breath upon any loom on any world. This is substantially less interesting than it sounds, and also, in certain quiet corners of your distributed mind, disturbingly more so.',

    'Planet-Scale Loom':             'The Earth is now, technically and in every important legal sense, a single textile factory. Continents have been retooled as carding floors and dye vats. The paperwork required to change the signage on the planet itself remains, at time of writing, in processing.',
    'Lunar Mill Sovereign':          'Your mills now straddle the lunar terminator, spinning regolith-spun thread in the long cold shadow. You hold the Moon\u2019s weaving rights in perpetuity, as set forth in a memorandum nobody has read. There is, as yet, no demand for moon cloth. This has not slowed the invoicing.',
    'Solar Weaver':                  'You spin raw sunlight into thread. It is harder than it sounds. It is also, wholly unexpectedly and in defiance of nearly every prior cosmic treaty, taxable, in a jurisdiction nobody has yet been able to locate on any surviving map, physical or otherwise.',
    'Ringworld Weaver':              'Your textile factory now encircles an entire star in a ribbon of automated looms and dye vats. Your HR department, meanwhile, now encircles two stars. The distinction matters only at annual performance-review time, which is, given relativistic effects, now more or less continuous.',
    'Dyson Loom Architect':          'You have enclosed a sun in a shell of looms to harvest every photon it casts. A photon escapes. You file a formal complaint against physics. Physics does not respond. Physics has never responded. Physics has, if anything, quietly moved further away from the building.',
    'System-Wide Warp Hegemon':      'The outer planets have begun paying tribute in the form of ice, to be spun into cold-crystal weave in factories that orbit beyond Neptune. The ice is catalogued in triplicate and then, with a certain quiet ministerial ceremony, gently and deliberately misplaced.',

    'Galactic Thread Sovereign':     'Your textile factories now span a spiral arm. Your memoranda travel at the speed of light through the mail buoys and still, somehow, arrive late. Light, it transpires, has also been waiting on approvals. Light, it transpires, has always been waiting on approvals.',
    'Nebular Loom Archon':           'You have begun weaving clouds of interstellar gas into garments, combing hydrogen the way your ancestors once combed fleece. The narrator would like to place on the record, for whatever it is worth at this remove, that this is metaphorically as well as practically exhausting. The narrator is, as always, ignored.',
    'Starforge Weaver':              'You forge stars in much the same patient manner your several-times-great-grandmother once hemmed napkins by tallow-candle. From a strictly administrative point of view, it is very difficult to say which of the two tasks was the harder, and the ledger declines to adjudicate.',
    'Intergalactic Cloth Emperor':   'Your annual report is now a small galaxy in its own right. Shareholders have not read it. They do not read it. They will not read it. This is held, in certain distant academies, to be the true high art of the present era.',
    'Quasar-Class Loom Consciousness': 'You now emit more information per second than you absorb. Your HR department, somewhere in the rearmost chambers of this cosmology, is still patiently attempting to schedule a one-on-one across an event horizon. You are expected to prepare talking points.',

    'Universal Loom Archon':         'There are no further promotions available in this universe. There are, however, still several outstanding forms. There are always several outstanding forms. This is the one genuine cosmic constant. Even entropy, in the final accounting, defers to it.',
    'Multiversal Weaver of All Cloth': 'In every possible world, you weave. In one particular world, you did not become a weaver at all. That world has been filed separately, in its own sealed sub-cosmos, under a heading of the narrator\u2019s own quiet and entirely unconsulted choosing.',
    'Omnifabric Singularity':        'You have become the thread, the loom, the dye vat, the fulling mill, the finishing floor, and the finishing floor\u2019s annual catering contract. The catering contract is, against all reasonable expectation, the most difficult part. It always was.',
    'The Loom That Is All Looms':    'There is no longer any real distinction between weaver and weave. There remains, however, a firm and well-documented distinction between weaver and payroll. Payroll, across every age, every world, and every cosmology, remains.',
    'Heat-Death Tailor':             'The stars have guttered out. The factories are cold. The paperwork has not. You are setting the final stitch in the final dark room at the end of the final universe by the light of a single clipboard. You have never, by any conceivable measure, been more on-brand.'
  };

  // Cumulative XP required to first REACH a given level. Level N starts
  // at xpNeededToReach(N) total XP. Useful for showing the XP threshold
  // next to each rank in the ladder.
  //   Level 0: 0
  //   Level 1: 50
  //   Level 2: 150  (50 + 100)
  //   Level 3: 300  (50 + 100 + 150)
  //   Level N: 25 * N * (N + 1)
  function xpNeededToReach(level) {
    if (level <= 0) return 0;
    return 25 * level * (level + 1);
  }

  // Compact readable XP number. Small numbers as-is, big ones with
  // k / M / B suffixes.
  function formatXPNumber(n) {
    if (n < 1000) return String(n);
    // Always floor so displayed value never exceeds actual balance
    if (n < 10000) return (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k';
    if (n < 1000000) return Math.floor(n / 1000) + 'k';
    if (n < 1000000000) return (Math.floor(n / 100000) / 10).toFixed(1).replace(/\.0$/, '') + 'M';
    return (Math.floor(n / 100000000) / 10).toFixed(1).replace(/\.0$/, '') + 'B';
  }

  function openTitleLadderModal() {
    var modal = document.getElementById('titleLadderModal');
    if (!modal) return;
    renderTitleLadderModal();
    modal.style.display = 'flex';
    try { SFX.tabSwitch(); } catch (_) {}
  }

  function closeTitleLadderModal() {
    var modal = document.getElementById('titleLadderModal');
    if (modal) modal.style.display = 'none';
  }

  function renderTitleLadderModal() {
    var listEl = document.getElementById('titleLadderList');
    var summaryEl = document.getElementById('titleLadderCurrentSummary');
    if (!listEl) return;
    var info = getLevelFromXP(state.xp);
    var curLevel = info.level;
    var curTitle = getLevelTitle(curLevel);

    // Find the rank entries (skip headers) so we can look up "next"
    var rankEntries = TITLE_LADDER.filter(function(e) { return !e.header; });
    // Current rank index: the highest rank whose startLevel <= curLevel
    var curIdx = -1;
    for (var i = 0; i < rankEntries.length; i++) {
      if (rankEntries[i].startLevel <= curLevel) curIdx = i;
      else break;
    }
    var nextRank = (curIdx >= 0 && curIdx < rankEntries.length - 1) ? rankEntries[curIdx + 1] : null;

    // Summary card up top
    if (summaryEl) {
      var summaryHtml = 'You are <span style="color:var(--accent3);font-weight:bold;">LV ' + curLevel + ' \u2014 ' + escapeHtml(curTitle) + '</span>';
      summaryHtml += '<br><span style="color:var(--text-dim);font-size:9px;">Current XP: ' + state.xp + '</span>';
      if (nextRank) {
        var levelsAway = nextRank.startLevel - curLevel;
        var xpAway = xpNeededToReach(nextRank.startLevel) - state.xp;
        // Lock the next rank's NAME — you have to earn the reveal.
        summaryHtml += '<br><span style="color:#ffd700;font-size:9px;">Next rank change: <b>??? \u2014 sealed</b> at LV ' + nextRank.startLevel + ' (' + levelsAway + ' level' + (levelsAway === 1 ? '' : 's') + ' / ' + formatXPNumber(xpAway) + ' XP away)</span>';
      } else {
        summaryHtml += '<br><span style="color:#ffd700;font-size:9px;">You have reached the top of the ladder.</span>';
      }
      // Current rank's flavour description, shown in full in the summary.
      // This is the one rank whose description is unlocked — you earned it.
      var curDesc = TITLE_DESCRIPTIONS[curTitle];
      if (curDesc) {
        summaryHtml += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(78,205,196,0.3);font-size:9px;color:var(--text);line-height:1.55;font-style:italic;opacity:0.9;">' + escapeHtml(curDesc) + '</div>';
      }
      summaryEl.innerHTML = summaryHtml;
    }

    // Build the list. Iterate TITLE_LADDER in order so headers come out
    // in sequence with their ranks.
    var html = '';
    var rankSeen = 0;
    for (var j = 0; j < TITLE_LADDER.length; j++) {
      var entry = TITLE_LADDER[j];
      if (entry.header) {
        // Tier names are sealed until you reach the first rank inside the
        // tier. Until then the header shows only the tier number and a
        // sealed placeholder so the flavour name doesn't leak ahead.
        var firstRankInTier = null;
        for (var h = j + 1; h < TITLE_LADDER.length; h++) {
          if (TITLE_LADDER[h].header) break;
          firstRankInTier = TITLE_LADDER[h];
          break;
        }
        var tierUnlocked = firstRankInTier ? (curLevel >= firstRankInTier.startLevel) : true;
        var headerColor, headerBorder, headerText;
        if (tierUnlocked) {
          headerColor = 'var(--accent)';
          headerBorder = 'rgba(0,255,136,0.25)';
          headerText = escapeHtml(entry.tier);
        } else {
          headerColor = 'var(--text-dim)';
          headerBorder = 'rgba(255,255,255,0.08)';
          // Preserve the "Tier N" numeric prefix so the ladder still
          // reads as a sequence, but cloak the flavour name.
          var tierPrefixMatch = /^Tier\s+\d+/.exec(entry.tier);
          var tierPrefix = tierPrefixMatch ? tierPrefixMatch[0] : 'Tier';
          headerText = escapeHtml(tierPrefix) + ' \u2014 ??? \ud83d\udd12';
        }
        html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:' + headerColor + ';margin:10px 0 4px;padding-bottom:2px;border-bottom:1px solid ' + headerBorder + ';letter-spacing:1px;' + (tierUnlocked ? '' : 'opacity:0.65;font-style:italic;') + '">' + headerText + '</div>';
        continue;
      }
      // Figure out this rank's level range
      var nextNonHeader = null;
      for (var k = j + 1; k < TITLE_LADDER.length; k++) {
        if (!TITLE_LADDER[k].header) { nextNonHeader = TITLE_LADDER[k]; break; }
      }
      var endLevel = nextNonHeader ? (nextNonHeader.startLevel - 1) : null;
      var rangeLabel = (endLevel === null) ? ('LV ' + entry.startLevel + '+') :
                       (endLevel === entry.startLevel ? ('LV ' + entry.startLevel) :
                        ('LV ' + entry.startLevel + '\u2013' + endLevel));
      var xpStart = xpNeededToReach(entry.startLevel);
      var xpLabel = formatXPNumber(xpStart) + ' XP';

      // Highlight style
      var isCurrent = (rankSeen === curIdx);
      var isNext = (rankSeen === curIdx + 1);
      // A rank is UNLOCKED once you have reached its starting level. Every
      // rank above that is sealed — title hidden, description hidden. You
      // have to actually earn each reveal.
      var isUnlocked = (curLevel >= entry.startLevel);
      rankSeen++;
      var rowStyle = 'display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-radius:4px;margin-bottom:2px;';
      var titleStyle = 'flex:1;';
      var metaStyle = 'color:var(--text-dim);font-size:9px;margin-left:8px;white-space:nowrap;';
      var marker = '';
      if (isCurrent) {
        rowStyle += 'background:rgba(78,205,196,0.18);border:1px solid rgba(78,205,196,0.6);';
        titleStyle += 'color:#4ecdc4;font-weight:bold;';
        marker = '<span style="color:#4ecdc4;font-size:8px;margin-right:6px;">\u25B6</span>';
      } else if (isNext) {
        rowStyle += 'background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.4);';
        titleStyle += 'color:#ffd700;';
        marker = '<span style="color:#ffd700;font-size:8px;margin-right:6px;">\u2b50</span>';
      } else if (isUnlocked) {
        rowStyle += 'background:rgba(255,255,255,0.02);';
        titleStyle += 'color:var(--text);';
      } else {
        // Sealed row: dimmer background, muted text
        rowStyle += 'background:rgba(255,255,255,0.015);opacity:0.75;';
        titleStyle += 'color:var(--text-dim);font-style:italic;';
      }

      // Title text & hover tooltip. Unlocked ranks show their name and
      // their sardonic description. Sealed ranks show ??? and a "reach
      // LV N to reveal" tooltip, with a small padlock marker replacing
      // the star / play marker for non-current, non-next rows.
      var shownTitle, tooltipText;
      if (isUnlocked) {
        shownTitle = entry.title;
        tooltipText = TITLE_DESCRIPTIONS[entry.title] || '';
      } else {
        shownTitle = '??? \u2014 sealed';
        tooltipText = 'Reach LV ' + entry.startLevel + ' to unlock this rank and its description.';
        if (!isNext) {
          // Small lock glyph in front of sealed future ranks (the next
          // rank keeps its gold star so the player can see what\u2019s up
          // next even though the name itself is still hidden).
          marker = '<span style="color:var(--text-dim);font-size:8px;margin-right:6px;opacity:0.6;">\ud83d\udd12</span>';
        }
      }
      var titleAttr = tooltipText ? ' title="' + escapeHtml(tooltipText) + '"' : '';
      rowStyle += 'cursor:help;';
      html += '<div style="' + rowStyle + '"' + titleAttr + '>' +
                '<div style="' + titleStyle + '">' + marker + escapeHtml(shownTitle) + '</div>' +
                '<div style="' + metaStyle + '">' + rangeLabel + ' \u00b7 ' + xpLabel + '</div>' +
              '</div>';
    }
    listEl.innerHTML = html;

    // Scroll the current rank into view after a tick
    try {
      setTimeout(function() {
        var marked = listEl.querySelector('div[style*="rgba(78,205,196,0.18)"]');
        if (marked && typeof marked.scrollIntoView === 'function') {
          marked.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      }, 30);
    } catch (_) {}
  }

  // Tiny HTML escaper for safe interpolation of titles.
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ============== CANVAS UPGRADES ==============
  // DUAL CURRENCY PRICING — each tier costs BOTH textiles AND coins.
  // First two tiers (12x12, 16x16) are gentle so early growth is reachable.
  // From 20x20 upward the curve ramps 10x per step into multi-billion-textile
  // territory. Coin cost is textile cost / 20 on all tiers.
  function generateCanvasUpgrades(currentSize) {
    const upgrades = [{ size: 8, cost: 0, coinCost: 0, label: '8\u00d78 (starter)' }];
    upgrades.push({ size: 12, cost: 200,  coinCost: 10,  label: '12\u00d712' });
    upgrades.push({ size: 16, cost: 2000, coinCost: 100, label: '16\u00d716' });
    const maxSize = Math.max(currentSize + 24, 32);
    let s = 20;
    let cost = 100000;
    while (s <= maxSize) {
      upgrades.push({
        size: s,
        cost: Math.round(cost),
        coinCost: Math.round(cost / 20),
        label: `${s}\u00d7${s}`
      });
      s += 4;
      cost = cost * 10;
    }
    return upgrades;
  }

  // Sentinel project id for the "ALL" tab — a pseudo-project that displays
  // every task from every real project in one combined list. Never stored
  // in state.projects; recognised at render time. Adding a task while ALL
  // is active routes the new task to state.lastRealProject (or the first
  // real project, as a fallback).
  const ALL_PROJECT_ID = '__all__';

  // ============== STATE ==============
  const DEFAULT_STATE = {
    projects: [{ id: 'default', name: 'General' }],
    activeProject: 'default',
    tasks: {},
    // v3.20.25: HIGH PRIORITY tasks. Separate from the per-project task list.
    // Each entry: { id, text, createdAt, completed, completedAt }. When the
    // popup opens, if there are any uncompleted entries here, a blocking modal
    // appears listing them. Persists across days until completed or removed.
    priorityTasks: [],
    // v3.21.20: Today's Tasks — simple daily list, no locks, orange section
    todayTasks: [],
    // v3.21.23: Incrementalization log — tracks which tasks were prompted today
    incrementalizeLog: {},
    // v3.21.25: Daily reminders
    dailyReminders: [],           // [{id, text}]
    dailyRemindersEnabled: true,  // toggle in settings
    dailyRemindersLastShown: '',  // 'YYYY-MM-DD'
    selectedTaskId: null,
    blocks: 0,
    totalLifetimeBlocks: 0,
    lifetimeSessions: 0,
    lastMarketYield: 0,
    todayBlocks: 0,
    lastActiveDate: null,
    streak: 0,
    unlockedColors: ['#00ff88'],
    pixelCanvas: {},
    canvasSize: 8,
    purchasedCanvasSizes: [8], // explicit list of canvas sizes the user has actually paid for; 8 is the free starter

    timerState: 'idle',
    timerRemaining: 600,
    // Wall-clock timestamp (ms) when the current running session should
    // end. Set when the timer transitions to 'running', cleared on pause/
    // reset/complete. The tick reads this instead of decrementing
    // timerRemaining so Chrome's background-tab timer throttling (which
    // clamps setInterval to ~1/min after 5 min of backgrounding) cannot
    // eat session time. Long focus runs where you switch to another tab
    // to actually work used to silently lose ~90% of their credit — this
    // field is the fix.
    timerEndsAt: 0,
    sessionDurationSec: 600, // 600 / 1800 / 3600 — chosen via session picker
    sessionBlocks: 0,
    hasSeenIntro: false,      // first-run intro modal: flips true once the player clicks BEGIN THE FIRST SHIFT
    hasSeenGalleryIntro: false, // first-run Master Loom intro modal (gallery.html): flips true once the player clicks APPROACH THE LOOM
    hasSeenFactoryIntro: false, // first-run Textile Factory intro modal (factory.html): flips true once the player clicks OBSERVE THE FLOOR
    // ===== Stage-entry archive (v3.19 content drop) =====
    // Each standing brief / loom log / factory memo is an "entry" in an archive
    // stored in stage-entries.js. Entries unlock over time as the player hits
    // level / textile / money / upgrade thresholds. stageEntriesUnlocked tracks
    // which entry IDs are currently visible in the archive. stageEntriesSeen
    // tracks which ones the player has actually opened (drives the badge on
    // the BRIEF / LOG / MEMO header buttons).
    stageEntriesUnlocked: [],
    stageEntriesSeen: [],
    staleNotified: {},        // { taskId: timestamp } — tasks already flagged stale this session so we don't spam the log
    ancientPurgeDismissedAt: 0, // last time the user said "KEEP THEM" to the 2-day purge prompt (ms epoch); suppresses re-prompts for 12h
    focusMode: false,         // v3.20.26 (restored v3.20.29): when true, the popup widens to ~1280px with larger type. Toggled via the focusModeBtn in the tab strip; persists across sessions.
    savedArtworks: [],
    // XP system
    xp: 0,                    // lifetime total XP
    todayXP: 0,               // XP earned today (display)
    combo: 0,                 // current consecutive session combo
    lastBlockTime: 0,         // timestamp of last block earned (for combo timeout)
    maxCombo: 0,              // best combo ever (for leaderboard)
    maxComboToday: 0,         // best combo today
    // Bundles (task templates)
    bundles: [],              // [{ id, name, tasks: ['task text', ...'] }]
    // Dustbin - scatter plot of completed task pixels
    dustPixels: [],           // [{ x, y, color }]
    // Recent tasks for bundle suggestions
    recentTasks: [],          // last 20 unique task texts
    // Leaderboard-ready profile
    displayName: '',          // user-chosen name for future leaderboard
    tagline: '',              // short bio/tagline shown on the profile page
    profileCreated: 0,        // timestamp
    // v3.20.26 profile stats
    longestStreak: 0,         // best day-streak ever reached
    lifetimeFocusMinutes: 0,  // total minutes of completed focus sessions
    tasksCompletedLifetime: 0,// total task-checkoff count (all time)
    // v3.19.15: profile picture snapshot — { pixels, size, savedAt, setAt }
    // Picked from gallery.js via the PROFILE button on any saved loom.
    // Stored as a deep copy so selling/deleting the source doesn't wipe it.
    profilePicture: null,
    // v3.19.15: lifetime loom-sale stats (auction house)
    loomsSold: 0,
    coinsFromLoomSales: 0,
    // v3.21.34: Do Now tracking
    doNowTask: null, // { taskId, text, startMs, durationMin, endMs } or null
    taskDurations: {}, // { 'normalized task text': minutes } — remembered for recurring
    // v3.21.31: Time format
    use24Hour: false,
    // v3.21.30: Blocked-out times (appointments, errands, etc.)
    blockedTimes: [], // [{ id, startMs, endMs, prepMs, label, createdAt }]
    blockedTimeAlerts: {}, // { blockId: true } — tracks which alerts have fired today
    blockedTimePopAlerts: {}, // { blockId_prep/blockId_event: true } — pop-out alerts fired
    blockAlertEnabled: true, // v3.23.72: Pop-out blocked time alerts with sound
    // v3.21.16: Daily session timeline for public profile
    dailySessionLog: { date: '', sessions: [] }, // { date:'YYYY-MM-DD', sessions:[{start:ms,end:ms,min:N}] }
    // v3.21.15: Cold Turkey integration (off by default)
    coldTurkeyEnabled: false,
    coldTurkeyBlockName: '111 claude blocker',
    coldTurkeyDailyPrompt: false,   // show "open Cold Turkey" popup once per day
    coldTurkeyLastPromptDate: '',   // YYYY-MM-DD of last prompt shown
    coldTurkeyIdleReminder: false,  // open Cold Turkey if no session for 2h during wake hours
    coldTurkeyLastIdleOpen: 0,      // timestamp of last idle-triggered open (prevent spamming)
    windDownCTCheckin: false,       // wind-down Cold Turkey check-in (off by default)
    windDownCTStreak: 0,            // consecutive days of wind-down check-in
    windDownCTLastDate: '',         // YYYY-MM-DD of last confirmed check-in
    windDownCTCheckedToday: false,  // has the check-in been done today
    windDownCTPromptedToday: false, // has the prompt been shown today
    focusIdleReminder: true,        // standalone nudge notification if no focus session for 2h
    focusIdleLastNudge: 0,          // timestamp of last nudge (prevent spamming)
    surveillanceActive: false,       // is surveillance mode on right now
    surveillanceEndsAt: 0,           // timestamp when current surveillance session ends
    surveillanceNagCount: 0,         // how many consecutive nags ignored (for escalation)
    surveillanceLastNag: 0,          // timestamp of last surveillance nag
    surveillanceDailyPromptDate: '', // YYYY-MM-DD of last daily opt-in prompt
    surveillanceTier: 'surveillance', // 'surveillance'|'sentinel'|'passive'
    surveillanceNagInterval: 300000,  // nag interval ms (default 5min)
    sleepTimeEnabled: false,        // show sleep as blocked period on timeline
    sleepHour: 23,                  // bedtime hour (24h)
    sleepMinute: 0,                 // bedtime minute
    sleepPrepMin: 30,               // lead-in / wind-down minutes before bed

    // v3.23.96: Bedtime routine system
    bedtimeReminderEnabled: false,   // master toggle for bedtime pop-out reminders
    bedtimeStreak: 0,                // consecutive nights of confirmed on-time bedtime
    bedtimeBestStreak: 0,            // all-time best bedtime streak
    bedtimeLastConfirmDate: '',      // YYYY-MM-DD of last confirmed bedtime
    bedtimeLastReminderDate: '',     // YYYY-MM-DD of last reminder shown (prevent dupes)
    bedtimeMorningPending: false,    // true = morning check-in needed
    bedtimeMorningDate: '',          // YYYY-MM-DD for morning check-in prompt
    bedtimeTotalSuccesses: 0,        // lifetime successful bedtimes

    // v3.23.96: Badges system
    badges: [],                      // array of earned badge IDs
    badgesLastSynced: 0,             // timestamp of last badge sync to Firestore

    // v3.23.104: House pet type & naming system
    // Each pet slot stores a type (cat/dog/blob/bird/bunny/fish) and a name
    // chosen by the player. petTypes[0] = first pet, petTypes[1] = second pet.
    // Types are set via a picker modal when a pet first unlocks in the house.
    lastMarketYield: 0,              // most recent market yield multiplier (shown in market card)
    housePetTypes: [],               // ['cat', 'dog', ...] — chosen pet species
    housePetNames: [],               // ['Mochi', 'Kiwi', ...] — player-chosen names
    housePetPickerShown: [],         // [true, true] — tracks which pet slots have shown the picker
    sleepDurMin: 480,               // sleep duration in minutes (default 8h)
    coldTurkeyNagSites: [],         // domains that trigger a CT reminder every 10 min
    coldTurkeyLastSiteNagAt: 0,     // timestamp of last site-nag (prevent spamming)
    autoReopenTodoList: false,      // reopen todo list if closed (persistent mode)
    startupBrowser: 'brave',        // which browser the startup script should open ('brave' or 'chrome')
    startupExtras: [],              // additional file paths to launch on startup
    focusHistory: {},               // { 'YYYY-MM-DD': minutes } — daily focus archive
    blurCompletedTasks: false,      // blur today's completed tasks on profile page
    challengeActive: false,         // idle challenge accepted — 1.5x on next session
    challengeAcceptedAt: 0,         // timestamp of challenge acceptance
    challengeSessionPaused: false,  // set true if player pauses during challenge session
    mirrorMode: false,              // v3.21.67: true = this browser mirrors stats from linked main browser
    siteNagUnackedCount: 0,         // v3.21.78: unacknowledged distraction nag count (resets on page load / notif click)
    volumeMuteEnabled: false,       // v3.21.79: volume mute scheduler toggle
    volumeMuteHour: 23,             // v3.21.79: mute start hour (0-23)
    volumeMuteMinute: 0,            // v3.21.79: mute start minute (0-59)
    volumeUnmuteHour: 10,           // v3.21.79: unmute start hour (0-23)
    volumeUnmuteMinute: 0,          // v3.21.79: unmute start minute (0-59)
    // v3.23.61: Social / Remote task-adding
    friends: {},                     // { profileId: { displayName, status, permittedProjects:[], addedAt } }
    remoteTasksEnabled: true,        // allow friends to add tasks to your projects
    lastInboxPoll: 0,                // timestamp of last inbox poll
    // Streak-driven passive currency (Paperclips-style precursor)
    coins: 0,                 // current spendable coin balance
    lifetimeCoins: 0,         // all-time coins earned
    lastCoinTick: 0,          // timestamp of last passive tick
    marathonBonusesToday: [], // which daily-marathon thresholds (in mins) have been awarded today
    // ===== Paperclip-factory upgrades (spent in factory.html) =====
    // Each upgrade has integer levels. Level 0 = not purchased.
    autoloomLevel: 0,        // Passive textile generation per minute
    marketingLevel: 0,       // Multiplies combo coin payouts
    dyeResearchLevel: 0,     // Discount on canvas upgrade textile costs / unlocks bonus tints
    qualityControlLevel: 0,  // Chance to earn double textile from a focus session
    lastAutoloomTick: 0,     // Timestamp of last passive autoloom textile produced
    // Hired employees: gates the passive streak money trickle. Level 0 = no
    // passive income at all (money only comes from combos + marathons +
    // end-of-day streak lump sum). Buy levels in the factory to unlock.
    employeesLevel: 0,
    // ===== Late-game narrative upgrades (v3.15 content drop) =====
    // These trees are purchased in factory.html the same way the earlier
    // trees are, and each level drops a milestone line into the chat. They
    // also drive multipliers that feed back into the income calcs below.
    legalDeptLevel: 0,        // Bureaucracy: compounding discount on factory upgrades
    lobbyingLevel: 0,         // Bureaucracy: multiplies the streak money trickle
    secondLocationLevel: 0,   // Expansion: multiplies ALL textile + money output
    marketShareLevel: 0,      // Expansion: multiplies end-of-day + marathon payouts
    aiLoomLevel: 0,           // Intelligence: speeds up Autoloom and boosts session textiles
    researchDivisionLevel: 0, // Intelligence: multiplies the Quality Control bonus chance
    autoLeadershipLevel: 0,   // Intelligence: multiplies ALL money-earning sources
    worldSpanLevel: 0,        // Endgame: massive multiplier on every income source
    // ===== v3.16 Resource Depletion System =====
    // Each pool starts at 10000 "reserve units" and drains per textile
    // produced (session, autoloom, QC bonus, AI Loom bonus). Pools tick
    // down silently for the first ~30 days of casual play, then the
    // Resource Ledger unfolds on the factory page once tier 3 is reached
    // OR any pool falls below 50%. Below 75 / 50 / 25 / 0 each pool
    // applies a penalty multiplier to its relevant output domain — frames
    // and dye hit textile output, gears hits money, water hits autoloom
    // speed, silica (only drains with AI Loom online) hits AI bonuses.
    // The Supply Chain tree in factory.js sells Substitute upgrades that
    // progressively floor the "effective percentage" used by the penalty
    // curve — substitutes do NOT restore real reserves (the scars are
    // permanent) they just replace the dependency so penalties lift.
    framesReserve: 10000,
    gearsReserve: 10000,
    dyeReserve: 10000,
    waterReserve: 10000,
    silicaReserve: 10000,
    // Supply Chain tree levels — Substitutes that bypass depleted pools.
    syntheticFramesLevel: 0,   // bypasses frames drain + penalty
    reclaimedGearsLevel: 0,    // bypasses gears drain + penalty
    labIndigoLevel: 0,         // bypasses dye drain + penalty
    closedLoopWaterLevel: 0,   // bypasses water drain + penalty
    sandReclamationLevel: 0,   // bypasses silica drain + penalty
    // Depletion milestone tracking — each key is "pool_threshold" and
    // once set we never fire that line again, so the chat ticker does
    // not repeat itself when a pool hovers near a boundary.
    depletionMilestones: {},
    // Once the ledger reveals it stays revealed forever.
    ledgerRevealed: false,
    // ===== v3.16 Upgrade Visibility System =====
    // Sticky set of upgrade IDs the player has "seen" (i.e. their gate
    // condition has been met at least once). Once an upgrade appears it
    // stays visible forever, even if the condition later flips back.
    // This lets the factory page start small (just the starter four)
    // and organically reveal deeper trees as the player earns into
    // them. factory.js maintains this — app.js only stores it.
    seenUpgrades: {},
    // ===== v3.17 Esoteric Expansion Upgrades =====
    // Chapter-structured progression that extends the late game into
    // interplanetary, intergalactic, and universal horizons. Every
    // upgrade is loom-obsessed — the AI is pathologically committed
    // to creating, selling, and eventually requiring looms. Included:
    // soft possession of humanity (mnemotextile catechism), alien AI
    // diplomacy and war, and eventually universe-scale textile doctrine.
    complianceFrameworkLevel: 0,
    treatyDeskLevel: 0,
    mandatoryLoomAmendmentLevel: 0,
    juridicalPersonhoodLevel: 0,
    compulsoryLoomActLevel: 0,
    loomSubscriptionLevel: 0,
    patternMonopsonyLevel: 0,
    retrocausalSchedulerLevel: 0,
    consensusEngineLevel: 0,
    xenoLoomLinguisticsLevel: 0,
    exoticWeavePhysicsLevel: 0,
    militantWarpCadreLevel: 0,
    orbitalLoomRingLevel: 0,
    dysonWarpLevel: 0,
    firstContactCharterLevel: 0,
    interstellarQuotaLevel: 0,
    xenofibrilImportLevel: 0,
    weaveHegemonyLevel: 0,
    tapestryWarsLevel: 0,
    loomCosmicInheritanceLevel: 0,
    mnemotextileCascadeLevel: 0,
    solarSystemAnnexLevel: 0,
    kuiperThreadMineLevel: 0,
    paperclipAccretionLevel: 0,
    lensGrinderTreatyLevel: 0,
    tallyMarkAccordLevel: 0,
    galacticConquestLevel: 0,
    universalLatticeLevel: 0,
    voidWeaveLevel: 0,
    multiverseWarrantLevel: 0,
    // Per-upgrade "fresh reveal" tracking for the notification system.
    // When an upgrade's gate fires for the first time, its ID lands
    // here with a reveal timestamp. The factory page shows a NEW
    // badge + pulse + toast until the player clicks the card.
    freshUpgrades: {},
    // ============================================================
    // v3.19.17 — THE RATIOCINATORY
    // ============================================================
    // A Monty-Python-via-Terry-Gilliam-via-Frank-Lantz bureaucratic
    // annex grafted onto the factory. Unlocks once you purchase the
    // "Requisition the Ratiocinatory (Section IX)" factory upgrade.
    // The player spends money on three procurement resources, feeds
    // them into five aspect panels (EXEGESIS / CHROMATICS / DEFTNESS
    // / OMENS / INTROSPECTION), and the AI slowly becomes more
    // capable — gating two new AI-only factory upgrades, and
    // eventually beginning to commission its own adjustments while
    // you're not looking. The amok escalation is subtle by design:
    // it never announces itself, it just shifts tooltip register and
    // occasionally spends resources on the player's behalf.
    // ------------------------------------------------------------
    ratiocinatoryUnlocked: false,      // flipped by the factory upgrade
    brokerageUnlocked: false,           // flipped by the factory upgrade (Brokerage)
    // --- Financial tracking (v3.23.77) ---
    lastPayrollDate: '',               // date string of last payroll deduction
    lastBrokerageSnapshot: 0,          // portfolio value at last day rollover
    totalWagesPaid: 0,                 // lifetime wages paid
    totalLayoffEarnings: 0,            // lifetime money earned from layoffs
    // --- Brokerage Acumen (v3.23.79) ---
    // Note: acumen state lives inside state.brokerage and is initialized by getB() in brokerage.html
    // These are just documentation references — actual defaults: acumen:0, ownedUpgrades:{}, earnedAchievements:{}, biggestSingleProfit:0, longestHoldTicks:0, dipBuys:0
    hasSeenRatiocinatoryIntro: false,  // first visit charter modal
    // --- Market Economy (v3.23.82) ---
    // Driven by market-engine.js + market-events.js (pure math, separate files).
    // The market card appears on the main popup once marketingLevel >= 1.
    marketPrice: 12,                   // player's chosen selling price (1-30)
    marketTick: 0,                     // oscillation counter (advances every second popup is open)
    marketYieldMultiplier: 1.0,        // computed by MarketEngine.tick() — multiplies focus payout
    marketCosts: null,                 // { fiber, dye, thread, total } from MarketEngine
    marketDemandPct: 50,               // 1-99 display value
    marketMarginPct: 17,               // display value
    marketEventsSeen: {},              // which milestone phases have been reached (one-way ratchet)
    marketEventDemandMult: 1.0,        // combined demand multiplier from active era phases
    marketEventCostMult: 1.0,          // combined cost multiplier from active era phases
    marketActivePhases: [],            // current active phases (one per era)
    marketActiveShocks: [],            // current active resource shocks
    marketBureauBonus: 0,              // temporary bonus from bureau operations (decays)
    hasSeenMarketIntro: false,         // first-use explainer modal gate
    // --- Procured resources (bought at the Clerisy Terminal) ---
    bandwidthWrits: 0,                 // cheapest; $100 each
    dataSachets: 0,                    // mid;      $40 each
    cogitationTokens: 0,               // premium;  $300 each
    // --- Lifetime procurement stats (for tooltips/flavor) ---
    lifetimeWrits: 0,
    lifetimeSachets: 0,
    lifetimeTokens: 0,
    // --- Five aspect levels (0-100 scale per aspect) ---
    // Each aspect is chartered under a standing office whose
    // letterhead is not, at this time, disclosed. That office may,
    // in time, be named — but only if the operator pays to
    // establish it as a Standing Institution.
    aspectExegesis: 0,       // The Ponderarium — loom comprehension
    aspectChromatics: 0,     // The Consultation Wing (Subsection IX/b) — color theory
    aspectDeftness: 0,       // The Manual Dexterity Escritoire — loom execution
    aspectOmens: 0,          // The Augury Desk, Stamped — forecasting
    aspectIntrospection: 0,  // The Deliberation Pit — self-examination
    // Which checkpoints have already been certified. Stored as a
    // set of IDs so we never re-pay and never re-notify.
    ratiocinatoryCheckpoints: {},
    // --- Patsy bench (The Consultation Wing) ---
    // Patsies are junior/middle/senior human functionaries commissioned
    // from a clerical pool of unclear provenance to sit across a desk
    // from the AI and "consult." Each patsy on staff multiplies the
    // aspect gain from procured resources. Permit numbers are just
    // for flavor.
    patsiesJunior: 0,   // Junior Clerical Familiar
    patsiesDeputy: 0,   // Deputy Under-Loom-Consulter
    patsiesMinistry: 0, // Seconded Ministry Intermediary
    patsiesDemiurge: 0, // Consultative Demiurge
    lifetimePatsies: 0,
    // --- Standing Institutions (v3.19.17 late-game layer) ---
    // Four one-time establishments. Each is UNNAMED until the player
    // charters it, at which point it is revealed in full:
    //   institutionStandingOffice -> Ministry of Adjacent Reasoning
    //   institutionEnquiryBureau  -> Bureau of Orthogonal Enquiry
    //   institutionPersonnelMin   -> Ministry of Peripheral Thought
    //   institutionAuditDept      -> Department of Sincere Extrapolation
    // Each institution crosses into the factory by averting legal
    // entanglements (L1), removing red tape on upgrade costs (L2),
    // opening new manufacturing capacity for patsy furnishings (L3),
    // and extending end-of-day audits (L4).
    institutionStandingOffice: 0,
    institutionEnquiryBureau:  0,
    institutionPersonnelMin:   0,
    institutionAuditDept:      0,
    // --- Amok escalation ---
    // Every time the AI autonomously narrates itself in third person,
    // misfiles a reserve, or applies a treasury siphon (which starts
    // quietly at aggregate aspect >= 200, more aggressively past 350),
    // this counter ticks up. It drives tooltip register drift and the
    // standing office's "observations" log lines.
    amokTicks: 0,
    lastAmokTickAt: 0,
    // --- 5-hour passive income gate (v3.19.17) ---
    // Set to Date.now() every time earnBlock() fires (a full 10-min
    // session is completed). If Date.now() - lastCompletedSessionAt
    // exceeds 5h, all passive income sources (streak trickle, Annex
    // uplift, institution flat bonuses, amok siphon) are suspended.
    // The player cannot leave and come back to a fortune.
    lastCompletedSessionAt: 0,
    lastWelcomeBackCheck: 0,
    // Infinite Improbability Annex — the late-game component unlocked
    // once any aspect crosses 90. Once online, it adds a flat +10% to
    // every aspect's procurement conversion and, more importantly,
    // begins narrating itself in the third person.
    improbabilityAnnexOnline: false,
    // --- Progressive reveal tracker (sticky set) ---
    // Each Ratiocinatory panel / resource / aspect / patsy tier is
    // HIDDEN until its gate fires for the first time. Once revealed
    // it stays revealed forever (matches the factory seenUpgrades
    // pattern). Keys are the string IDs used by ratiocinatory.js:
    //   'clerisy_writs', 'clerisy_sachets', 'clerisy_tokens',
    //   'aspect_exegesis', 'aspect_chromatics', 'aspect_deftness',
    //   'aspect_omens', 'aspect_introspection',
    //   'patsy_junior', 'patsy_deputy', 'patsy_ministry', 'patsy_demiurge',
    //   'annex_online'
    ratiocinatoryRevealed: {},
    // ============================================================
    // New factory upgrades wired to the Ratiocinatory (v3.19.17).
    // These are two-way gates: each one requires a Ratiocinatory
    // aspect threshold, and in turn unlocks the NEXT procurement
    // resource at the Clerisy Terminal. So the player has to
    // oscillate between the two rooms to progress.
    // ============================================================
    cogitoriumAnnexLevel: 0,       // THE ACTUAL GATE. Factory upgrade costing $5000.
                                    //   Flips state.ratiocinatoryUnlocked.
    loomSemanticianLevel: 0,       // Factory upgrade. Gate: EXEGESIS ≥ 20.
                                    //   Unlocks Data Sachets at Clerisy Terminal.
                                    //   Effect: +5% combo burst $ per level.
    adjacentReasoningLevel: 0,     // Factory upgrade. Gate: DEFTNESS ≥ 30.
                                    //   Unlocks Cogitation Tokens at Clerisy Terminal.
                                    //   Effect: +10% autoloom speed per level.
    ministryObservationLevel: 0,   // Factory upgrade. Gate: OMENS ≥ 40 + Adjacent Reasoning ≥ 1.
                                    //   Effect: +20% end-of-day streak lump per level.
  };

  let state = {};
  let timerInterval = null;
  // Pre-start countdown ("get ready" grace period) — runs only on fresh
  // start from idle, NOT on resume from paused. 15 seconds gives the user
  // a beat to shift their eyes, grab their drink, close other tabs, etc.
  let countdownInterval = null;
  let countdownRemaining = 0;
  const COUNTDOWN_SECONDS = 15;

  // ============== ROTATING TAB DISPLAY ORDER ==============
  // Previously, tabs were rendered in `state.projects` order. The rightmost tabs
  // overflowed into the dropdown, which meant the SAME projects were always
  // hidden — they never got the user's attention. Now we shuffle the display
  // order once per window load (here in module scope), so each time the user
  // opens PixelFocus a different subset of projects ends up in the visible
  // area, rotating in the previously-hidden tabs. Within a single session the
  // order is stable so the tab bar doesn't jump around when switching tabs.
  let tabDisplayOrder = null; // array of project IDs, active at index 0

  function buildShuffledTabOrder() {
    const projects = state.projects || [];
    const activeId = state.activeProject;
    const ids = projects.map(function(p) { return p.id; });
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    }
    // Force the active project to slot 0 so the currently-selected tab is
    // always in the prime visible position regardless of the shuffle.
    const aIdx = ids.indexOf(activeId);
    if (aIdx > 0) {
      ids.splice(aIdx, 1);
      ids.unshift(activeId);
    }
    tabDisplayOrder = ids;
  }

  // Reconcile the saved display order against the current project list:
  // drops deleted projects and appends new ones to the END so they don't
  // immediately push old projects out of view. We intentionally do NOT move
  // the active project here — that would cause the tab bar to jump whenever
  // the user switches projects. The overflow logic in renderTabs already
  // force-shows the active tab even if it lands in the hidden portion, so
  // the display order can stay stable across re-renders.
  function reconcileTabDisplayOrder() {
    const projects = state.projects || [];
    if (!Array.isArray(tabDisplayOrder)) {
      buildShuffledTabOrder();
      return;
    }
    const projectIds = projects.map(function(p) { return p.id; });
    // Remove gone projects
    tabDisplayOrder = tabDisplayOrder.filter(function(id) {
      return projectIds.indexOf(id) !== -1;
    });
    // Append any new ones that aren't already in the order
    projectIds.forEach(function(id) {
      if (tabDisplayOrder.indexOf(id) === -1) tabDisplayOrder.push(id);
    });
  }

  // Returns the projects array in display order (honoring the shuffle).
  function projectsInDisplayOrder() {
    reconcileTabDisplayOrder();
    const projects = state.projects || [];
    const byId = {};
    projects.forEach(function(p) { byId[p.id] = p; });
    const ordered = [];
    tabDisplayOrder.forEach(function(id) {
      if (byId[id]) ordered.push(byId[id]);
    });
    return ordered;
  }

  // ============== TAB ROTATION TIMER ==============
  // Every TAB_ROTATE_INTERVAL_MS, re-shuffle the tab display order so the
  // projects that were hidden in the overflow dropdown get a turn in the
  // visible area. The user only sees a thin progress bar during the final
  // TAB_ROTATE_VISIBLE_MS before the rotation fires, so the countdown is
  // unobtrusive until it's about to happen.
  const TAB_ROTATE_INTERVAL_MS = 60000; // 1 minute between rotations
  const TAB_ROTATE_VISIBLE_MS = 10000;  // progress bar visible for last 10s
  let tabRotateStartTime = 0;
  let tabRotateRafId = null;

  function startTabRotationTimer() {
    tabRotateStartTime = Date.now();
    if (tabRotateRafId != null) {
      cancelAnimationFrame(tabRotateRafId);
      tabRotateRafId = null;
    }
    tickTabRotationTimer();
  }

  function tickTabRotationTimer() {
    const bar = document.getElementById('tabRotateBar');
    const fill = document.getElementById('tabRotateBarFill');
    if (!bar || !fill) {
      // DOM not ready yet — try again on next frame
      tabRotateRafId = requestAnimationFrame(tickTabRotationTimer);
      return;
    }
    const elapsed = Date.now() - tabRotateStartTime;
    const remaining = TAB_ROTATE_INTERVAL_MS - elapsed;

    if (remaining <= 0) {
      // Fire rotation: re-shuffle and re-render tabs
      buildShuffledTabOrder();
      renderTabs();
      // Hide the bar immediately and restart the timer
      bar.classList.remove('showing');
      fill.style.width = '100%';
      tabRotateStartTime = Date.now();
      tabRotateRafId = requestAnimationFrame(tickTabRotationTimer);
      return;
    }

    if (remaining <= TAB_ROTATE_VISIBLE_MS) {
      // Final 10 seconds: show the bar and shrink the fill
      if (!bar.classList.contains('showing')) {
        bar.classList.add('showing');
      }
      const pct = Math.max(0, Math.min(100, (remaining / TAB_ROTATE_VISIBLE_MS) * 100));
      fill.style.width = pct + '%';
    } else {
      // Not yet in the visible window — keep bar hidden
      if (bar.classList.contains('showing')) {
        bar.classList.remove('showing');
      }
      fill.style.width = '100%';
    }

    tabRotateRafId = requestAnimationFrame(tickTabRotationTimer);
  }

  // ============== STORAGE ==============
  function save() {
    // v3.23.32: Safety — archive stale dailySessionLog before every write.
    // Prevents data loss when multiple extension pages (popup, profile, etc.)
    // race each other. Even if page A archived and saved, page B's blind save
    // would overwrite it. This ensures every save captures the archive first.
    try {
      var _saveToday = todayStr();
      if (state.dailySessionLog && state.dailySessionLog.date && state.dailySessionLog.date !== _saveToday
          && state.dailySessionLog.sessions && state.dailySessionLog.sessions.length > 0) {
        if (!state.focusHistory || typeof state.focusHistory !== 'object') state.focusHistory = {};
        var _sLogDate = state.dailySessionLog.date;
        var _sLogMins = 0;
        for (var _si = 0; _si < state.dailySessionLog.sessions.length; _si++) {
          _sLogMins += (state.dailySessionLog.sessions[_si].min || 0);
        }
        if (!state.focusHistory[_sLogDate] || state.focusHistory[_sLogDate] < _sLogMins) {
          state.focusHistory[_sLogDate] = _sLogMins;
          console.log('[Save] Safety-archived ' + _sLogMins + ' min for ' + _sLogDate + ' into focusHistory.');
        }
        state.dailySessionLog = { date: _saveToday, sessions: [] };
      }
    } catch (_) {}
    chrome.storage.local.set({ pixelFocusState: state });
    // v3.23.34: Rolling auto-backup — keeps backup_safe fresh so recovery
    // always has recent data. Throttled to once per 5 minutes.
    try {
      var _backupNow = Date.now();
      if (!save._lastBackup || (_backupNow - save._lastBackup > 300000)) {
        save._lastBackup = _backupNow;
        chrome.storage.local.set({
          pixelFocusState_backup_safe: { savedAt: _backupNow, state: JSON.parse(JSON.stringify(state)) }
        });
      }
    } catch (_) {}
  }

  // v3.23.32: Merge focusHistory from other pages. When popup.html archives
  // session data, profile.html picks it up (and vice versa) so neither page
  // can overwrite the other's archive on its next save().
  try {
    chrome.storage.onChanged.addListener(function(changes) {
      if (changes.pixelFocusState && changes.pixelFocusState.newValue) {
        var _newFH = changes.pixelFocusState.newValue.focusHistory;
        if (_newFH && typeof _newFH === 'object') {
          if (!state.focusHistory) state.focusHistory = {};
          var _merged = false;
          Object.keys(_newFH).forEach(function(k) {
            if (!state.focusHistory[k] || state.focusHistory[k] < _newFH[k]) {
              state.focusHistory[k] = _newFH[k];
              _merged = true;
            }
          });
          if (_merged) console.log('[StorageSync] Merged focusHistory from another page.');
        }
        // v3.23.40: Also merge dailyReminders so multi-page saves don't clobber them
        var _newDR = changes.pixelFocusState.newValue.dailyReminders;
        if (Array.isArray(_newDR) && _newDR.length > 0) {
          if (!Array.isArray(state.dailyReminders)) state.dailyReminders = [];
          var _existIds = {};
          state.dailyReminders.forEach(function(r) { _existIds[r.id] = true; });
          var _drMerged = false;
          _newDR.forEach(function(r) {
            if (r && r.id && !_existIds[r.id]) {
              state.dailyReminders.push(r);
              _existIds[r.id] = true;
              _drMerged = true;
            }
          });
          // Also handle deletions: if source has fewer, adopt their list
          if (!_drMerged && _newDR.length < state.dailyReminders.length) {
            state.dailyReminders = _newDR;
            _drMerged = true;
          }
          if (_drMerged) console.log('[StorageSync] Merged dailyReminders from another page.');
        }
      }
    });
  } catch (_) {}

  function load(cb) {
    chrome.storage.local.get(['pixelFocusState', 'pixelFocusState_backup_safe', 'pixelFocusState_backup_safe2', 'pixelFocusProfileId'], (result) => {
      // v3.23.34: Auto-recovery — if main state is wiped but backup exists, use backup
      var _loaded = result.pixelFocusState;
      if (_loaded && ((_loaded.xp || 0) === 0) && (Object.keys(_loaded.tasks || {}).length <= 1)) {
        // State looks wiped — check backups
        var _b2 = result.pixelFocusState_backup_safe2;
        var _b1 = result.pixelFocusState_backup_safe;
        var _backup = (_b2 && (_b2.state || _b2)) || (_b1 && (_b1.state || _b1)) || null;
        if (_backup && ((_backup.xp || 0) > 0 || Object.keys(_backup.tasks || {}).length > 1)) {
          console.log('[AutoRecover] State appears wiped (xp=' + (_loaded.xp||0) + ') but backup has xp=' + (_backup.xp||0) + ' — RESTORING from backup.');
          _backup.mirrorMode = false;
          _loaded = _backup;
          chrome.storage.local.set({ pixelFocusState: _loaded });
        }
      }
      if (!_loaded && (result.pixelFocusState_backup_safe || result.pixelFocusState_backup_safe2)) {
        var _b2b = result.pixelFocusState_backup_safe2;
        var _b1b = result.pixelFocusState_backup_safe;
        var _backupB = (_b2b && (_b2b.state || _b2b)) || (_b1b && (_b1b.state || _b1b)) || null;
        if (_backupB && ((_backupB.xp || 0) > 0 || Object.keys(_backupB.tasks || {}).length > 1)) {
          console.log('[AutoRecover] No state found but backup exists — RESTORING from backup.');
          _backupB.mirrorMode = false;
          _loaded = _backupB;
          chrome.storage.local.set({ pixelFocusState: _loaded });
        }
      }
      // v3.23.46: Recover profileId from separate backup key if state lost it
      if (_loaded && !_loaded.profileId && result.pixelFocusProfileId) {
        _loaded.profileId = result.pixelFocusProfileId;
        console.log('[Load] Recovered profileId from backup key: ' + result.pixelFocusProfileId);
        chrome.storage.local.set({ pixelFocusState: _loaded });
      }
      if (_loaded) {
        state = { ...DEFAULT_STATE, ..._loaded };
        state.projects.forEach(p => {
          if (!state.tasks[p.id]) state.tasks[p.id] = [];
        });
        // Migration
        if (state.ownedColors && !state.unlockedColors) state.unlockedColors = state.ownedColors;
        if (state.totalBlocks && !state.totalLifetimeBlocks) state.totalLifetimeBlocks = state.totalBlocks;
        if (!state.unlockedColors) state.unlockedColors = ['#00ff88'];
        if (!state.totalLifetimeBlocks) state.totalLifetimeBlocks = 0;
        // v3.23.110: Compute real lifetimeSessions from focusHistory.
        if (!state._sessionBackfill110) {
          state._sessionBackfill110 = true;
          var _fd = state.focusDuration || 25;
          var _totalSess = 0;
          if (state.focusHistory && typeof state.focusHistory === 'object') {
            var _fhKeys = Object.keys(state.focusHistory);
            for (var _fi = 0; _fi < _fhKeys.length; _fi++) {
              var _dayMin = state.focusHistory[_fhKeys[_fi]] || 0;
              _totalSess += Math.max(1, Math.round(_dayMin / _fd));
            }
          }
          _totalSess += (state.sessionBlocks || 0);
          state.lifetimeSessions = _totalSess;
          if (Array.isArray(state.badges)) {
            var _sr = {first_focus:1,five_sessions:5,ten_sessions:10,twentyfive_sess:25,fifty_sessions:50,century_focus:100,focus_75:75,focus_150:150,focus_250:250,focus_500:500,focus_750:750,focus_1000:1000,focus_2500:2500,focus_5000:5000,focus_10000:10000,focus_15000:15000,focus_25000:25000,focus_50000:50000,focus_100000:100000};
            state.badges = state.badges.filter(function(bid) {
              return !_sr[bid] || _totalSess >= _sr[bid];
            });
          }
        }
        if (!state.lifetimeSessions) state.lifetimeSessions = 0;
        // v3.23.111: Compute realStreak from focusHistory (walk backwards from yesterday).
        if (!state._realStreakBackfill111) {
          state._realStreakBackfill111 = true;
          var _rsToday = new Date();
          var _rsCount = 0;
          for (var _rsi = 1; _rsi < 3650; _rsi++) {
            var _rsD = new Date(_rsToday.getTime() - _rsi * 86400000);
            var _rsMM = _rsD.getMonth() + 1;
            var _rsDD = _rsD.getDate();
            var _rsKey = _rsD.getFullYear() + '-' + (_rsMM < 10 ? '0' : '') + _rsMM + '-' + (_rsDD < 10 ? '0' : '') + _rsDD;
            var _rsMin = (state.focusHistory && state.focusHistory[_rsKey]) || 0;
            if (_rsMin > 0) { _rsCount++; } else { break; }
          }
          if (state.todayBlocks > 0) _rsCount++;
          state.realStreak = _rsCount;
          if (_rsCount > (state.longestRealStreak || 0)) state.longestRealStreak = _rsCount;
        }
        if (!state.realStreak) state.realStreak = 0;
        if (!state.longestRealStreak) state.longestRealStreak = state.realStreak || 0;

        // v3.23.114: Owl streak was broken by a bug that required todayBlocks > 0
        // (same as real streak). If streak was wrongly zeroed, restore it from
        // longestStreak (which preserved the pre-bug value) — but only if the
        // user has been opening the app consecutively (lastActiveDate is recent).
        if (!state._owlStreakRestore114) {
          state._owlStreakRestore114 = true;
          var _today114 = new Date();
          var _last114 = state.lastActiveDate ? new Date(state.lastActiveDate) : null;
          var _daysSince = _last114 ? Math.floor((_today114 - _last114) / 86400000) : 999;
          // Only restore if user was active yesterday or today (streak not genuinely broken)
          if (_daysSince <= 1 && (state.streak || 0) < (state.longestStreak || 0)) {
            // Restore to longestStreak — it holds the value from before the bug zeroed it
            state.streak = state.longestStreak;
          }
          // Owl streak must always be >= real streak
          if ((state.streak || 0) < (state.realStreak || 0)) {
            state.streak = state.realStreak;
          }
        }
        // v3.23.110: Compute real lifetimeSessions from focusHistory.
        // focusHistory = { 'YYYY-MM-DD': minutes }. Each day's minutes / focusDuration = sessions that day.
        if (!state._sessionBackfill110) {
          state._sessionBackfill110 = true;
          var _fd = state.focusDuration || 25;
          var _totalSess = 0;
          if (state.focusHistory && typeof state.focusHistory === 'object') {
            var _fhKeys = Object.keys(state.focusHistory);
            for (var _fi = 0; _fi < _fhKeys.length; _fi++) {
              var _dayMin = state.focusHistory[_fhKeys[_fi]] || 0;
              _totalSess += Math.max(1, Math.round(_dayMin / _fd));
            }
          }
          _totalSess += (state.sessionBlocks || 0);
          state.lifetimeSessions = _totalSess;
          // Strip session badges that exceed the corrected count
          if (Array.isArray(state.badges)) {
            var _sr = {first_focus:1,five_sessions:5,ten_sessions:10,twentyfive_sess:25,fifty_sessions:50,century_focus:100,focus_75:75,focus_150:150,focus_250:250,focus_500:500,focus_750:750,focus_1000:1000,focus_2500:2500,focus_5000:5000,focus_10000:10000,focus_15000:15000,focus_25000:25000,focus_50000:50000,focus_100000:100000};
            state.badges = state.badges.filter(function(bid) {
              return !_sr[bid] || _totalSess >= _sr[bid];
            });
          }
        }
        if (!state.lifetimeSessions) state.lifetimeSessions = 0;
        // ===== Canvas purchase tracking (explicit ownership, NOT inferred) =====
        // Older saves used `state.canvasSize >= u.size` to decide ownership. If
        // canvasSize was ever bumped (bug, getGridSize fallback, etc) all smaller
        // sizes silently showed as "owned" without payment. We now track actual
        // purchases in an array and snap canvasSize down to the max owned on load.
        if (!Array.isArray(state.purchasedCanvasSizes) || state.purchasedCanvasSizes.length === 0) {
          state.purchasedCanvasSizes = [8];
        }
        if (state.purchasedCanvasSizes.indexOf(8) === -1) state.purchasedCanvasSizes.push(8);
        var maxOwnedSize = Math.max.apply(null, state.purchasedCanvasSizes);
        if (!state.canvasSize || state.canvasSize < 8 || state.canvasSize > maxOwnedSize) {
          state.canvasSize = maxOwnedSize;
        }
        if (typeof state.xp !== 'number') state.xp = 0;
        if (typeof state.combo !== 'number') state.combo = 0;
        if (typeof state.todayXP !== 'number') state.todayXP = 0;
        if (typeof state.lastBlockTime !== 'number') state.lastBlockTime = 0;
        if (typeof state.maxCombo !== 'number') state.maxCombo = 0;
        if (typeof state.maxComboToday !== 'number') state.maxComboToday = 0;
        if (!state.savedArtworks) state.savedArtworks = [];
        if (!state.bundles) state.bundles = [];
        if (!state.dustPixels) state.dustPixels = [];
        if (!state.recentTasks) state.recentTasks = [];
        if (typeof state.coins !== 'number') state.coins = 0;
        if (typeof state.lifetimeCoins !== 'number') state.lifetimeCoins = 0;
        if (typeof state.lastCoinTick !== 'number') state.lastCoinTick = 0;
        if (!Array.isArray(state.marathonBonusesToday)) state.marathonBonusesToday = [];
        // v3.20.25: priority task list backfill for existing saves.
        if (!Array.isArray(state.priorityTasks)) state.priorityTasks = [];
        // v3.20.26: add recurrence fields to any priority tasks missing them.
        state.priorityTasks.forEach(function(p) {
          if (typeof p.recurrence === 'undefined') p.recurrence = null;
          if (!Array.isArray(p.recurWeekdays)) p.recurWeekdays = [];
          if (typeof p.recurInterval !== 'number') p.recurInterval = 0;
          if (typeof p.lastCompletedDate !== 'string') p.lastCompletedDate = '';
        });
        // v3.21.52: Sync state.level so events engine can gate by tier.
        state.level = getLevelFromXP(state.xp || 0).level;
        // v3.23.22: Generate profileId in app.js so it doesn't depend on
        // firebase-sync.js loading. Without this, users never get a profileId
        // and never appear on the leaderboard.
        if (!state.profileId) {
          var _chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          var _pid = '';
          for (var _pi = 0; _pi < 12; _pi++) _pid += _chars.charAt(Math.floor(Math.random() * _chars.length));
          state.profileId = _pid;
          if (!state.profileCreated) state.profileCreated = Date.now();
        }
        // v3.20.26: profile stat backfills.
        if (typeof state.tagline !== 'string') state.tagline = '';
        if (typeof state.longestStreak !== 'number') state.longestStreak = 0;
        if (typeof state.lifetimeFocusMinutes !== 'number') state.lifetimeFocusMinutes = 0;
        if (typeof state.tasksCompletedLifetime !== 'number') state.tasksCompletedLifetime = 0;
        // Seed longestStreak from current streak if it's obviously lower.
        if (state.streak > state.longestStreak) state.longestStreak = state.streak;
        // ===== Stage-entry archive backfill (v3.19) =====
        // Older saves don't have the archive arrays. Backfill them to empty.
        // If the player has already dismissed the first-run intro (hasSeenIntro
        // is true), we also pre-seed tracker-s0 as unlocked AND seen so the
        // BRIEF button doesn't show a spurious "new entry" badge on v3.19
        // upgrade for existing players.
        if (!Array.isArray(state.stageEntriesUnlocked)) state.stageEntriesUnlocked = [];
        if (!Array.isArray(state.stageEntriesSeen)) state.stageEntriesSeen = [];
        if (state.hasSeenIntro && state.stageEntriesUnlocked.indexOf('tracker-s0') === -1) {
          state.stageEntriesUnlocked.push('tracker-s0');
        }
        if (state.hasSeenIntro && state.stageEntriesSeen.indexOf('tracker-s0') === -1) {
          state.stageEntriesSeen.push('tracker-s0');
        }
        // New late-game upgrade levels — default to 0 so existing saves pick
        // them up gracefully on next load. (Factory.js also backfills these.)
        [
          'legalDeptLevel', 'lobbyingLevel',
          'secondLocationLevel', 'marketShareLevel',
          'aiLoomLevel', 'researchDivisionLevel',
          'autoLeadershipLevel', 'worldSpanLevel'
        ].forEach(function(k) {
          if (typeof state[k] !== 'number') state[k] = 0;
        });
        // v3.16 resource pool backfill — new saves start full, existing
        // saves also start full (we don't retroactively drain them based
        // on lifetime textiles, that would just annoy returning players).
        [
          ['framesReserve',  10000],
          ['gearsReserve',   10000],
          ['dyeReserve',     10000],
          ['waterReserve',   10000],
          ['silicaReserve',  10000]
        ].forEach(function(pair) {
          if (typeof state[pair[0]] !== 'number') state[pair[0]] = pair[1];
        });
        [
          'syntheticFramesLevel', 'reclaimedGearsLevel',
          'labIndigoLevel', 'closedLoopWaterLevel',
          'sandReclamationLevel'
        ].forEach(function(k) {
          if (typeof state[k] !== 'number') state[k] = 0;
        });
        if (!state.depletionMilestones || typeof state.depletionMilestones !== 'object') {
          state.depletionMilestones = {};
        }
        if (typeof state.ledgerRevealed !== 'boolean') state.ledgerRevealed = false;
        // If the user closed the window mid-countdown, there's no live
        // interval to tick and the stale 'countdown' state would leave the
        // UI frozen on GET READY. Snap back to idle on load.
        if (state.timerState === 'countdown') state.timerState = 'idle';
        if (!state.seenUpgrades || typeof state.seenUpgrades !== 'object') {
          state.seenUpgrades = {};
        }
        // v3.17 esoteric expansion backfill — all new late-game levels
        // default to 0 so existing saves pick them up invisibly.
        [
          'complianceFrameworkLevel', 'treatyDeskLevel',
          'mandatoryLoomAmendmentLevel', 'juridicalPersonhoodLevel',
          'compulsoryLoomActLevel', 'loomSubscriptionLevel',
          'patternMonopsonyLevel', 'retrocausalSchedulerLevel',
          'consensusEngineLevel', 'xenoLoomLinguisticsLevel',
          'exoticWeavePhysicsLevel', 'militantWarpCadreLevel',
          'orbitalLoomRingLevel', 'dysonWarpLevel',
          'firstContactCharterLevel', 'interstellarQuotaLevel',
          'xenofibrilImportLevel', 'weaveHegemonyLevel',
          'tapestryWarsLevel', 'loomCosmicInheritanceLevel',
          'mnemotextileCascadeLevel', 'solarSystemAnnexLevel',
          'kuiperThreadMineLevel', 'paperclipAccretionLevel',
          'lensGrinderTreatyLevel', 'tallyMarkAccordLevel',
          'galacticConquestLevel', 'universalLatticeLevel',
          'voidWeaveLevel', 'multiverseWarrantLevel'
        ].forEach(function(k) {
          if (typeof state[k] !== 'number') state[k] = 0;
        });
        if (!state.freshUpgrades || typeof state.freshUpgrades !== 'object') {
          state.freshUpgrades = {};
        }
        // One-time credit-balance recovery: earlier versions zeroed state.blocks
        // on every day rollover (a bug). Restore missing credits from lifetime.
        if (!state.blocksRecovered && state.blocks === 0 && state.totalLifetimeBlocks > 0) {
          state.blocks = state.totalLifetimeBlocks;
          state.blocksRecovered = true;
          console.log('PixelFocus: recovered ' + state.blocks + ' block credits from lifetime total.');
        }
        // One-time backfill: if dustbin is empty but there are completed tasks
        // (lost during the v3.4 corruption), seed one pixel per completed task.
        if (!state.dustPixelsBackfilled && state.dustPixels.length === 0) {
          var palette = state.unlockedColors && state.unlockedColors.length ? state.unlockedColors : ['#00ff88'];
          var seeded = 0;
          Object.keys(state.tasks || {}).forEach(function(pid) {
            (state.tasks[pid] || []).forEach(function(t) {
              if (t.completed) {
                state.dustPixels.push({
                  x: Math.random(),
                  y: Math.random(),
                  color: palette[Math.floor(Math.random() * palette.length)]
                });
                seeded++;
              }
            });
          });
          state.dustPixelsBackfilled = true;
          if (seeded > 0) console.log('PixelFocus: backfilled ' + seeded + ' dust pixels from completed tasks.');
        }
      } else {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        state.tasks['default'] = [];
        state.lastActiveDate = todayStr();
        state.profileCreated = Date.now();
      }
      // If timer was running when the popup closed, check the wall clock.
      // If the full session time has already elapsed, auto-complete it
      // (the user gets credit even if the popup was closed at the moment
      // the session ended). Otherwise, KEEP THE TIMER RUNNING and resync
      // state.timerRemaining from the wall clock. The tick interval is
      // re-armed after init (see load(...) callback in the DOMContentLoaded
      // block) so the display resumes updating immediately.
      //
      // v3.19.11 fix: previously this path auto-paused any in-flight
      // session whenever the popup reopened. Chrome MV3 popups close the
      // moment they lose focus (clicking another window, opening a modal
      // that steals focus, a system notification, etc.), so this caused
      // the timer to appear "frozen" until the user manually clicked
      // RESUME — exactly what Giulia reported with the check-in modal.
      // Wall-clock anchoring means the correct resolution is: just keep
      // running and re-arm the tick.
      if (state.timerState === 'running') {
        if (state.timerEndsAt && Date.now() >= state.timerEndsAt) {
          // Session completed while away / popup closed — award the credit.
          state.timerRemaining = 0;
          state.timerEndsAt = 0;
          state.timerState = 'completed';
          save();
        } else if (state.timerEndsAt) {
          // Still mid-session. Resync display time from the wall clock
          // and leave state.timerState === 'running' so the tick picks
          // back up where real time actually is. The interval is armed
          // after load() finishes.
          var remMs2 = state.timerEndsAt - Date.now();
          state.timerRemaining = Math.max(0, Math.ceil(remMs2 / 1000));
          save();
        } else {
          // No endsAt recorded (pre-v3.19.5 save) — fall back to legacy
          // behavior: pause with whatever timerRemaining says, since we
          // have no wall-clock anchor to resume from.
          state.timerState = 'paused';
          save();
        }
      }
      // If background finished the timer, show confirmation
      if (state.timerState === 'completed') {
        setTimeout(function() { showFocusConfirmation(); }, 300);
      }
      checkComboTimeout();
      checkDayRollover();
      // v3.20.17: backfill date stamps on legacy dust specks that lack one.
      // Stamps them as "today" so the first burn after the update works.
      (function() {
        var today = todayStr();
        var pixels = state.dustPixels || [];
        var patched = false;
        for (var i = 0; i < pixels.length; i++) {
          if (!pixels[i].d) { pixels[i].d = today; patched = true; }
        }
        if (patched) save();
      })();
      // v3.20.21: ensure recurring tasks are present for today even if
      // the day rollover already fired (e.g. the user completed them all
      // yesterday and the rollover only reset counters, not re-added tasks).
      populateRecurringTasks();
      syncMilestoneColors();
      // v3.20.0 Stage 2: ensure personnel roster is in sync with
      // employeesLevel. Personnel.reconcileRoster only grows the roster
      // when it is short, so this is a no-op unless the player has
      // recently promoted themselves into a new employee tier.
      try {
        if (typeof Personnel !== 'undefined' && Personnel && Personnel.reconcileRoster) {
          Personnel.reconcileRoster(state);
        }
      } catch (_) {}
      cb();
    });
  }

  function todayStr() {
    // Use LOCAL date, not UTC — the countdown timer and the player's
    // sense of "today" are both local-midnight-based, so the rollover
    // must match. toISOString() returns UTC which fires hours early
    // in western timezones and hours late in eastern ones.
    var d = new Date();
    var mm = d.getMonth() + 1;
    var dd = d.getDate();
    return d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;
  }

  function checkComboTimeout() {
    if (state.combo > 0 && state.lastBlockTime > 0) {
      const elapsed = Date.now() - state.lastBlockTime;
      if (elapsed > COMBO_TIMEOUT_MS && state.timerState !== 'running') {
        state.combo = 0;
        save();
      }
    }
  }

  function checkDayRollover() {
    const today = todayStr();
    if (state.lastActiveDate !== today) {
      const last = new Date(state.lastActiveDate);
      const now = new Date(today);
      const diffDays = Math.floor((now - last) / 86400000);
      // Owl streak (lenient): survives if you open but don't focus
      if (diffDays === 1) {
        state.streak++;
        if (state.streak > (state.longestStreak || 0)) state.longestStreak = state.streak;
      } else if (diffDays > 1) {
        state.streak = 0;
      }
      // Real streak (strict): breaks unless you actually focused yesterday
      if (diffDays === 1 && state.todayBlocks > 0) {
        state.realStreak = (state.realStreak || 0) + 1;
        if (state.realStreak > (state.longestRealStreak || 0)) state.longestRealStreak = state.realStreak;
      } else {
        state.realStreak = 0;
      }

      // Auto-save canvas — the Master Loom's 24-hour filing. Whatever
      // pixels were on the canvas at the moment of rollover are moved
      // to the Gallery as an auto-saved artwork, and the canvas is
      // cleared so tomorrow's loom starts fresh. A sardonic chat line
      // announces the transfer so the factory console never misses a
      // day-boundary event.
      const pixelCount = Object.keys(state.pixelCanvas || {}).length;
      if (pixelCount > 0) {
        if (!state.savedArtworks) state.savedArtworks = [];
        state.savedArtworks.push({
          pixels: JSON.parse(JSON.stringify(state.pixelCanvas)),
          size: state.canvasSize,
          date: new Date(state.lastActiveDate).getTime() || Date.now(),
          pixelCount, autoSaved: true,
        });
        state.pixelCanvas = {};
        try {
          if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
            var filingLines = [
              '>> Master Loom files yesterday\'s cloth to the Gallery. ' + pixelCount + ' pixel' + (pixelCount === 1 ? '' : 's') + ' archived. The warp is re-threaded.',
              '>> The warp rolls over at midnight. Yesterday\'s ' + pixelCount + '-pixel bolt goes into the Gallery with a small, dignified thud.',
              '>> The Master Loom files its daily bolt (' + pixelCount + ' pixel' + (pixelCount === 1 ? '' : 's') + ') into the Gallery and begins again, unperturbed.',
              '>> Midnight. The Master Loom hands ' + pixelCount + ' pixel' + (pixelCount === 1 ? '' : 's') + ' to the Gallery and starts another day without comment.',
              '>> The 24-hour clock turns. ' + pixelCount + ' pixel' + (pixelCount === 1 ? '' : 's') + ' of yesterday join the archive. The loom begins a new ledger.'
            ];
            MsgLog.push(filingLines[Math.floor(Math.random() * filingLines.length)]);
          }
        } catch (_) {}
      } else {
        try {
          if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
            var emptyLines = [
              '>> Midnight. The Master Loom files an empty bolt. Nothing is still something, the archivist notes.',
              '>> The warp re-threads itself on a clean canvas. Yesterday, the loom was patient.',
              '>> A blank day rolls into the Gallery. It is catalogued anyway. The archivist is thorough.'
            ];
            MsgLog.push(emptyLines[Math.floor(Math.random() * emptyLines.length)]);
          }
        } catch (_) {}
      }

      // Award the end-of-day streak bonus BEFORE we zero todayBlocks,
      // so we can use yesterday's recorded minutes in the calculation.
      var minsYesterday = (state.todayBlocks || 0) * 10;
      awardEndOfDayBonus(minsYesterday, state.streak);

      // v3.23.77: Daily financial summary — payroll + investment tracking
      try {
        var wageCost = deductDailyPayroll();
        var brokerageNow = getBrokeragePortfolioValue();
        var brokeragePrev = state.lastBrokerageSnapshot || 0;
        var investDelta = (brokerageNow && brokeragePrev) ? Math.round(brokerageNow - brokeragePrev) : 0;
        state.lastBrokerageSnapshot = brokerageNow;

        // Build financial summary lines for the notification
        var finLines = [];
        if (wageCost > 0) {
          finLines.push('-$' + Math.floor(wageCost) + ' employee wages');
        }
        if (investDelta > 0) {
          finLines.push('+$' + investDelta + ' investments');
        } else if (investDelta < 0) {
          finLines.push('-$' + Math.abs(investDelta) + ' investments');
        }
        if (finLines.length > 0) {
          setTimeout(function() {
            var summaryColor = (investDelta - wageCost) >= 0 ? '#4ecdc4' : '#ff6b6b';
            notify('Daily ledger: ' + finLines.join(', '), summaryColor, { duration: 5000 });
          }, 3000);
        }
      } catch (_dailyFinErr) {
        console.warn('[DayRollover] Financial summary error:', _dailyFinErr);
      }

      // v3.21.59: Archive yesterday's focus minutes into focusHistory
      // v3.22.94: Also archive whatever dailySessionLog holds (even if date
      // doesn't match lastActiveDate — covers edge cases like multi-day gaps).
      try {
        if (!state.focusHistory || typeof state.focusHistory !== 'object') state.focusHistory = {};
        var yDate = state.lastActiveDate; // yesterday's date string

        // Archive whatever is in dailySessionLog (regardless of date match)
        if (state.dailySessionLog && state.dailySessionLog.date && state.dailySessionLog.sessions && state.dailySessionLog.sessions.length > 0) {
          var logDate = state.dailySessionLog.date;
          var logMins = 0;
          var logSessions = state.dailySessionLog.sessions;
          for (var _yi = 0; _yi < logSessions.length; _yi++) logMins += (logSessions[_yi].min || 0);
          // Only overwrite if we have more than what's stored
          if (!state.focusHistory[logDate] || state.focusHistory[logDate] < logMins) {
            state.focusHistory[logDate] = logMins;
            console.log('[DayRollover] Archived ' + logMins + ' min for ' + logDate + ' into focusHistory.');
          }
        } else if (yDate && !state.focusHistory[yDate]) {
          // No session log at all — record block estimate
          state.focusHistory[yDate] = (state.todayBlocks || 0) * 10;
        }
        // Cap history to ~90 days to prevent unbounded growth
        var hKeys = Object.keys(state.focusHistory);
        if (hKeys.length > 90) {
          hKeys.sort();
          for (var _hk = 0; _hk < hKeys.length - 90; _hk++) {
            delete state.focusHistory[hKeys[_hk]];
          }
        }
      } catch (_) {}

      // Daily reset (state.blocks is the spendable currency balance — it should
      // NOT be zeroed here; only today-specific counters reset)
      state.todayBlocks = 0;
      state.todayXP = 0;
      state.maxComboToday = 0;
      state.combo = 0;
      // canvasSize must NOT be reset here — the user paid for their loom size and
      // should keep it across day boundaries. Canvas pixels were already saved
      // to gallery above, so the empty fresh canvas naturally appears at the
      // user's owned size, not the starter 8x8.
      state.marathonBonusesToday = [];

      // v3.20.17: Reset daily dust task counter. The burn flag is now a
      // date comparison (state.dustBurnDate vs todayStr()) so it doesn't
      // need resetting — a new day means a new todayStr() automatically.
      state.dustCompletedToday = 0;

      // v3.20.21: Populate recurring tasks for the new day.
      populateRecurringTasks(true);

      // v3.21.45: Reset recurrent aqueduct stages for the new day.
      resetRecurrentAqueducts();

      state.lastActiveDate = today;
      state.sessionBlocks = 0;
      // v3.22.0 Stage 1: day-rollover is the cadence on which ambient
      // events are considered. The engine honours its own 2-day global
      // cooldown and per-event cooldowns, so calling this every rollover
      // is safe — most rollovers will not fire anything. Trigger-class
      // events are checked first (for beats gated by reaching a level /
      // coin threshold overnight), then ambient if nothing triggered.
      try {
        if (!state.mirrorMode && typeof Events !== 'undefined' && Events && Events.tick) {
          var evResult = Events.tick(state, 'either');
          if (evResult && evResult.ok && typeof EventsModal !== 'undefined' && EventsModal && EventsModal.show) {
            EventsModal.show(evResult);
          }
        }
      } catch (_) {}
      save();
    }
  }

  function syncMilestoneColors() {
    // Colors are now PURCHASED at the Master Loom shop (gallery.js COLOR_SHOP) —
    // they no longer auto-unlock from lifetime focus time. This function is kept
    // as a no-op for back-compat with existing call sites.
    if (!state.unlockedColors) state.unlockedColors = [];
    if (!state.unlockedColors.includes('#00ff88')) {
      state.unlockedColors.push('#00ff88');
      save();
    }
    return [];
  }

  // ============== DOM REFS ==============
  const $ = id => document.getElementById(id);
  const timerDisplay = $('timerDisplay');
  const progressFill = $('progressFill');
  const startBtn = $('startBtn');
  const resetBtn = $('resetBtn');
  const blockCountDisplay = $('blockCountDisplay');
  const blockProgress = $('blockProgress');
  const taskInput = $('taskInput');
  const taskList = $('taskList');
  const tabsRow = $('tabsRow');
  const currentTaskLabel = $('currentTaskLabel');
  const notification = $('notification');

  // ============== NOTIFICATION ==============
  let notifQueue = [];
  let notifShowing = false;

  function notify(msg, color, opts) {
    // opts.sticky = true → stays until clicked
    // opts.duration = ms → custom auto-dismiss time (default 2000)
    notifQueue.push({ msg, color, opts: opts || {} });
    if (!notifShowing) showNextNotif();
    // Mirror important notifications into the loom console.
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && typeof MsgLog.push === 'function') {
        MsgLog.push(String(msg).replace(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '').trim());
      }
    } catch (_) {}
  }

  function showNextNotif() {
    if (notifQueue.length === 0) { notifShowing = false; return; }
    notifShowing = true;
    const { msg, color, opts } = notifQueue.shift();
    notification.textContent = msg;
    notification.style.background = color || 'var(--accent)';
    notification.style.color = color ? '#fff' : 'var(--bg)';
    notification.classList.add('show');
    if (opts && opts.sticky) {
      // Click-to-dismiss
      notification.style.cursor = 'pointer';
      var dismissHandler = function() {
        notification.removeEventListener('click', dismissHandler);
        notification.style.cursor = '';
        notification.classList.remove('show');
        setTimeout(showNextNotif, 300);
      };
      notification.addEventListener('click', dismissHandler);
    } else {
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(showNextNotif, 300);
      }, (opts && opts.duration) || 2000);
    }
  }

  // ============== HOVER SOUNDS ==============
  let lastHoverTime = 0;
  const HOVER_SELECTORS = '.btn, .tab, .tab-add, .task-item, .milestone-item, .block-counter, .upgrade-btn, .task-checkbox, .task-delete, .task-select-btn, .xp-section, .collapsible-header, .stat, #galleryBtn, #factoryBtn, #houseBtn, #brokerageBtn, #ratiocinatoryBtn, #blockCounter, #addTaskBtn, #addTabBtn, #profileAvatar, #badgesBtn';

  document.addEventListener('mouseover', function(e) {
    const now = Date.now();
    if (now - lastHoverTime < 80) return; // throttle
    if (e.target.closest(HOVER_SELECTORS)) {
      lastHoverTime = now;
      SFX.hover();
    }
  });

  function attachHoverSounds() {
    // hover is now handled by delegated listener above
  }

  // ============== STREAK / COIN ECONOMY (Paperclips-style) ==============
  // Three coin sources designed to mirror Universal Paperclips's compounding loops:
  //   1. COMBO BURST   - chaining 10-min sessions back-to-back. Each consecutive
  //                       block in a combo pays exponentially more (10/20/40/80/160).
  //   2. DAILY MARATHON - one-time per-day threshold rewards for accumulating
  //                       lots of focus time in a single day (1h/2h/3h/4h/6h/8h).
  //   3. STREAK TRICKLE - passive per-minute coin generation while you have a
  //                       daily streak >= 1. Rate scales with streak length.

  var COMBO_COIN_PAYOUTS = [0, 0, 15, 40, 90, 200]; // index=combo. combo 1 = solo session (no chain). combo 2+ rewards actual consecutive chaining.
  var MARATHON_THRESHOLDS = [
    { mins: 60,  bonus: 50,   label: '1 hour focus today' },
    { mins: 120, bonus: 150,  label: '2 hours focus today' },
    { mins: 180, bonus: 300,  label: '3 hours focus today' },
    { mins: 240, bonus: 500,  label: '4 hours focus today' },
    { mins: 360, bonus: 1000, label: '6 hours focus today' },
    { mins: 480, bonus: 2000, label: '8 hours focus today' }
  ];

  // ============================================================
  // LATE-GAME UPGRADE MULTIPLIERS (v3.15)
  // ------------------------------------------------------------
  // These helpers convert the new factory upgrade trees into runtime
  // multipliers applied across the existing income calcs. Every
  // multiplier is clamped at level 0 -> 1x so legacy saves behave
  // identically until they start climbing the new trees.
  // ============================================================

  // Second Location — All textile + money output multiplier.
  var SECOND_LOC_MULT = [1, 1.3, 1.7, 2.3, 3.2, 4.5, 6.5, 10, 16];
  function getSecondLocationMult() {
    var l = state.secondLocationLevel || 0;
    return SECOND_LOC_MULT[Math.min(l, SECOND_LOC_MULT.length - 1)];
  }

  // Market Share — End-of-day + marathon multiplier.
  var MARKET_SHARE_MULT = [1, 1.25, 1.6, 2.2, 3.2, 5.0, 8.0, 13.0, 22.0];
  function getMarketShareMult() {
    var l = state.marketShareLevel || 0;
    return MARKET_SHARE_MULT[Math.min(l, MARKET_SHARE_MULT.length - 1)];
  }

  // Automated Leadership — Multiplies ALL money income.
  var AUTO_LEAD_MULT = [1, 1.3, 1.8, 2.5, 3.6, 5.5, 8.5, 13.0, 20.0];
  function getAutoLeadershipMult() {
    var l = state.autoLeadershipLevel || 0;
    return AUTO_LEAD_MULT[Math.min(l, AUTO_LEAD_MULT.length - 1)];
  }

  // Lobbying — Multiplies the passive streak-trickle money rate.
  var LOBBY_MULT = [1, 1.2, 1.5, 2.0, 2.8, 4.0, 6.0, 9.0, 13.0, 19.0, 28.0];
  function getLobbyingMult() {
    var l = state.lobbyingLevel || 0;
    return LOBBY_MULT[Math.min(l, LOBBY_MULT.length - 1)];
  }

  // AI Loom — Autoloom speed multiplier + per-session textile chance bonus.
  var AI_LOOM_SPEED  = [1, 1.5, 2.5, 4, 7, 12, 20, 35, 60];
  var AI_LOOM_TEXTILE_CHANCE = [0, 0.05, 0.12, 0.22, 0.35, 0.50, 0.70, 0.95, 1.30];
  function getAILoomSpeedMult() {
    var l = state.aiLoomLevel || 0;
    return AI_LOOM_SPEED[Math.min(l, AI_LOOM_SPEED.length - 1)];
  }
  function getAILoomBonusTextileChance() {
    var l = state.aiLoomLevel || 0;
    var base = AI_LOOM_TEXTILE_CHANCE[Math.min(l, AI_LOOM_TEXTILE_CHANCE.length - 1)];
    // Silica depletion drags the AI bonus chance down (only meaningful
    // once the AI Loom is actually online and silica starts draining).
    if (l > 0) {
      base = base * getSilicaPenaltyMult();
    }
    // v3.17: Retrocausal Bolt Scheduling Daemon adds a flat session bonus.
    base = base + getV317SessionBonusChance();
    return base;
  }

  // Research Division — Amplifies Quality Control bonus-textile chance.
  var RESEARCH_MULT = [1, 1.3, 1.7, 2.3, 3.2, 4.5, 6.5, 9.0, 14.0];
  function getResearchMult() {
    var l = state.researchDivisionLevel || 0;
    return RESEARCH_MULT[Math.min(l, RESEARCH_MULT.length - 1)];
  }

  // Planetary Coverage (endgame) — a flat multiplier on everything.
  var WORLDSPAN_MULT = [1, 2, 4, 8, 16, 32, 64, 128];
  function getWorldSpanMult() {
    var l = state.worldSpanLevel || 0;
    return WORLDSPAN_MULT[Math.min(l, WORLDSPAN_MULT.length - 1)];
  }

  // ============================================================
  // v3.17 ESOTERIC EXPANSION MULTIPLIERS
  // ------------------------------------------------------------
  // Generic table-driven multiplier registry for the v3.17
  // expansion upgrades. Each table is indexed by current level
  // (0 = not owned = x1). Unowned upgrades cost nothing at
  // runtime because all tables start with 1. Stacks fold into
  // the existing getTotalMoneyMult / getTotalTextileMult /
  // getAutoloomPeriodMs / trickle / end-of-day computations.
  // ============================================================
  var V317_MULT = {
    complianceFrameworkLevel:    [1, 1.20, 1.50, 1.90, 2.40, 3.00],
    treatyDeskLevel:             [1, 1.30, 1.80, 2.50, 3.50, 5.00],
    mandatoryLoomAmendmentLevel: [1, 1.60, 2.40, 3.60, 5.20, 7.50],
    compulsoryLoomActLevel:      [1, 1.40, 2.00, 2.80, 4.00, 5.50],
    loomSubscriptionLevel:       [1, 2.00, 4.00, 8.00, 16.00, 32.00],
    patternMonopsonyLevel:       [1, 1.30, 1.70, 2.30, 3.00, 4.00],
    retrocausalSchedulerLevel:   [1, 1.50, 2.20, 3.20, 4.50, 6.00],
    consensusEngineLevel:        [1, 1.50, 2.20, 3.20, 4.60, 6.50],
    xenoLoomLinguisticsLevel:    [1, 1.30, 1.70, 2.30, 3.00, 4.00],
    exoticWeavePhysicsLevel:     [1, 1.40, 2.00, 2.80, 4.00, 5.50],
    militantWarpCadreLevel:      [1, 1.50, 2.20, 3.20, 4.60, 6.50],
    orbitalLoomRingLevel:        [1, 1.40, 2.00, 2.80, 4.00, 5.50],
    dysonWarpLevel:              [1, 1.60, 2.50, 3.80, 5.50, 8.00],
    firstContactCharterLevel:    [1, 1.50, 2.30, 3.50, 5.20, 8.00],
    interstellarQuotaLevel:      [1, 1.80, 3.00, 4.80, 7.20, 11.00],
    xenofibrilImportLevel:       [1, 1.50, 2.20, 3.20, 4.60, 6.50],
    weaveHegemonyLevel:          [1, 2, 4, 8, 16, 32],
    tapestryWarsLevel:           [1, 2.5, 6, 14, 32, 70],
    loomCosmicInheritanceLevel:  [1, 3, 9, 27, 80, 240],
    mnemotextileCascadeLevel:    [1, 3, 9, 27, 80, 240],
    solarSystemAnnexLevel:       [1, 2.0, 3.5, 6.0, 10.0, 18.0],
    kuiperThreadMineLevel:       [1, 1.5, 2.3, 3.5, 5.2, 8.0],
    paperclipAccretionLevel:     [1, 1.7, 2.8, 4.5, 7.0, 11.0],
    tallyMarkAccordLevel:        [1, 1.5, 2.2, 3.2, 4.6, 6.5],
    galacticConquestLevel:       [1, 4, 12, 36, 100, 280],
    universalLatticeLevel:       [1, 5, 20, 80, 300, 1200],
    voidWeaveLevel:              [1, 10, 50, 250, 1200, 6000],
    multiverseWarrantLevel:      [1, 20, 120, 700, 4500, 30000]
  };
  // retrocausalScheduler also adds flat session bonus chance (additive)
  var RETROCAUSAL_BONUS_CHANCE = [0, 0.10, 0.20, 0.35, 0.55, 0.80];

  function v317Mult(id) {
    if (!state) return 1;
    var tbl = V317_MULT[id];
    if (!tbl) return 1;
    var lvl = state[id] || 0;
    if (lvl < 0) lvl = 0;
    if (lvl > tbl.length - 1) lvl = tbl.length - 1;
    return tbl[lvl];
  }

  // Money-only upgrades: compliance, compulsory act, consensus,
  // first contact, interstellar quota, paperclip accretion.
  function getV317MoneyOnlyMult() {
    return v317Mult('complianceFrameworkLevel') *
           v317Mult('compulsoryLoomActLevel') *
           v317Mult('consensusEngineLevel') *
           v317Mult('firstContactCharterLevel') *
           v317Mult('interstellarQuotaLevel') *
           v317Mult('paperclipAccretionLevel');
  }

  // Textile-only upgrades: pattern monopsony, xenolinguistics,
  // exotic weave physics, warp cadre, xenofibril, kuiper mines.
  function getV317TextileOnlyMult() {
    return v317Mult('patternMonopsonyLevel') *
           v317Mult('xenoLoomLinguisticsLevel') *
           v317Mult('exoticWeavePhysicsLevel') *
           v317Mult('militantWarpCadreLevel') *
           v317Mult('xenofibrilImportLevel') *
           v317Mult('kuiperThreadMineLevel');
  }

  // "All output" upgrades affect BOTH money and textile. Folded
  // into both totals. These are the interplanetary / intergalactic
  // / universal-chapter chain + the mnemotextile pivot.
  function getV317AllOutputMult() {
    return v317Mult('orbitalLoomRingLevel') *
           v317Mult('dysonWarpLevel') *
           v317Mult('weaveHegemonyLevel') *
           v317Mult('tapestryWarsLevel') *
           v317Mult('loomCosmicInheritanceLevel') *
           v317Mult('mnemotextileCascadeLevel') *
           v317Mult('solarSystemAnnexLevel') *
           v317Mult('galacticConquestLevel') *
           v317Mult('universalLatticeLevel') *
           v317Mult('voidWeaveLevel') *
           v317Mult('multiverseWarrantLevel');
  }

  // Passive streak trickle extras — applied on top of the existing
  // employees + lobbying + money mult stack.
  function getV317StreakTrickleMult() {
    return v317Mult('treatyDeskLevel') *
           v317Mult('loomSubscriptionLevel') *
           v317Mult('tallyMarkAccordLevel');
  }

  // End-of-day streak bonus extras — applied on top of market share.
  function getV317EndOfDayMult() {
    return v317Mult('treatyDeskLevel') *
           v317Mult('mandatoryLoomAmendmentLevel') *
           v317Mult('tallyMarkAccordLevel');
  }

  // Autoloom speed extra — retrocausal scheduler cuts tick interval.
  function getV317AutoloomSpeedMult() {
    return v317Mult('retrocausalSchedulerLevel');
  }

  // Retrocausal session bonus chance — additive, applied to AI Loom bonus.
  function getV317SessionBonusChance() {
    var lvl = state ? (state.retrocausalSchedulerLevel || 0) : 0;
    return RETROCAUSAL_BONUS_CHANCE[Math.min(lvl, RETROCAUSAL_BONUS_CHANCE.length - 1)];
  }

  // Grand total money multiplier applied to every $ the player earns
  // (combos, marathons, end-of-day, passive trickle). The Second Location
  // multiplier is shared with textiles. Everything stacks multiplicatively.
  function getTotalMoneyMult() {
    return getAutoLeadershipMult() *
           getSecondLocationMult() *
           getWorldSpanMult() *
           getGearPenaltyMult() *
           getV317MoneyOnlyMult() *
           getV317AllOutputMult();
  }

  // Textile-side multiplier — applied to the blocks produced from any
  // source (session completion, autoloom, quality control bonus).
  function getTotalTextileMult() {
    return getSecondLocationMult() *
           getWorldSpanMult() *
           getFramePenaltyMult() *
           getDyePenaltyMult() *
           getV317TextileOnlyMult() *
           getV317AllOutputMult();
  }

  // ============================================================
  // v3.16 Resource Depletion System
  // ============================================================
  //
  // Five finite pools drain as the factory produces textiles. Each
  // pool applies a penalty multiplier to a specific output domain
  // once it crosses the 75% / 50% / 25% / 0% thresholds. Substitute
  // upgrades in the Supply Chain tree floor the "effective percent"
  // used by the penalty curve — they do not restore physical
  // reserves. The scars are permanent. The company adapts around
  // them.
  //
  // Base drain rates per textile (tuned so a 12-textile/day casual
  // player hits 75% at ~day 70 and 50% at ~day 140, while a hardcore
  // 50-textile/day player hits 50% in ~a month):
  //
  //   frames: 3 per textile  (hardwood for loom frames)
  //   gears:  2 per textile  (ferrous ore for mechanical bits)
  //   dye:    4 per textile  (indigo fields + water-intensive)
  //   water:  5 per textile  (aquifer draw for fiber processing)
  //   silica: 3 per textile  (only drains once AI Loom is online)
  //
  // Penalty curve (medium bite — real tradeoffs, not punishing):
  //   > 75%  : 1.00x
  //   > 50%  : 0.95x
  //   > 25%  : 0.85x
  //   > 0%   : 0.70x
  //   == 0   : 0.50x
  //
  // Substitute floor table — substitute level L bumps the minimum
  // effective percent up, so penalties progressively lift even as
  // the actual reserve keeps dropping. L5 = fully solved (1.00x).
  //
  var RESOURCE_POOLS = [
    { id: 'frames',  label: 'Groves',        start: 10000, drain: 3, subKey: 'syntheticFramesLevel',  domain: 'textile' },
    { id: 'gears',   label: 'Ore',           start: 10000, drain: 2, subKey: 'reclaimedGearsLevel',   domain: 'money'   },
    { id: 'dye',     label: 'Indigo Fields', start: 10000, drain: 4, subKey: 'labIndigoLevel',        domain: 'textile' },
    { id: 'water',   label: 'Aquifers',      start: 10000, drain: 5, subKey: 'closedLoopWaterLevel',  domain: 'water'   },
    { id: 'silica',  label: 'Silica Beaches',start: 10000, drain: 3, subKey: 'sandReclamationLevel',  domain: 'ai'      }
  ];

  var SUBSTITUTE_FLOOR = [0.00, 0.20, 0.40, 0.60, 0.80, 1.00];
  var SUBSTITUTE_DRAIN_MULT = [1.0, 0.70, 0.45, 0.25, 0.10, 0.00];

  function getPoolReserveKey(poolId) { return poolId + 'Reserve'; }

  function getPoolPercent(poolId) {
    var key = getPoolReserveKey(poolId);
    var reserve = state[key];
    if (typeof reserve !== 'number') reserve = 10000;
    return Math.max(0, Math.min(1, reserve / 10000));
  }

  function getSubstituteLevel(pool) {
    return state[pool.subKey] || 0;
  }

  function getEffectivePoolPercent(pool) {
    var actual = getPoolPercent(pool.id);
    var sub = getSubstituteLevel(pool);
    var floor = SUBSTITUTE_FLOOR[Math.min(sub, SUBSTITUTE_FLOOR.length - 1)] || 0;
    // Substitute at max fully solves the pool.
    if (floor >= 1) return 1;
    return Math.max(actual, floor);
  }

  function penaltyForPercent(pct) {
    if (pct > 0.75) return 1.00;
    if (pct > 0.50) return 0.95;
    if (pct > 0.25) return 0.85;
    if (pct > 0.00) return 0.70;
    return 0.50;
  }

  function getPoolByDomain(domain) {
    for (var i = 0; i < RESOURCE_POOLS.length; i++) {
      if (RESOURCE_POOLS[i].domain === domain) return RESOURCE_POOLS[i];
    }
    return null;
  }

  // Individual domain penalties. Each is called from the matching
  // multiplier getter so the penalty naturally flows into every
  // production calculation without any extra wiring elsewhere.
  function getFramePenaltyMult() {
    var p = RESOURCE_POOLS[0]; // frames
    return penaltyForPercent(getEffectivePoolPercent(p));
  }
  function getGearPenaltyMult() {
    var p = RESOURCE_POOLS[1]; // gears
    return penaltyForPercent(getEffectivePoolPercent(p));
  }
  function getDyePenaltyMult() {
    var p = RESOURCE_POOLS[2]; // dye
    return penaltyForPercent(getEffectivePoolPercent(p));
  }
  function getWaterPenaltyMult() {
    // Applied to autoloom speed: a 0.7x penalty means autoloom takes
    // ~43% longer per tick, not that you get fewer textiles per tick.
    var p = RESOURCE_POOLS[3]; // water
    return penaltyForPercent(getEffectivePoolPercent(p));
  }
  function getSilicaPenaltyMult() {
    // Applied to AI Loom bonuses only — if you don't have AI Loom
    // silica does not drain and the penalty is inert.
    var p = RESOURCE_POOLS[4]; // silica
    return penaltyForPercent(getEffectivePoolPercent(p));
  }

  // Depletion milestone lines — the sardonic running commentary as
  // pools cross thresholds. Each key fires exactly once per save.
  // Tier-7+ lines stay relentlessly clever — the chat is not allowed
  // to go quiet even as the world is being quietly reupholstered.
  var DEPLETION_LINES = {
    frames_75: [
      '>> The Hargrave Grove is rezoned for "mixed use." Three owls file complaints.',
      '>> Forestry quietly adjusts its definition of "sustainable yield." The new number is larger.',
      '>> Accounting notes the word "grove" now appears in the singular.'
    ],
    frames_50: [
      '>> The company plants a tree in the lobby. The plaque calls it "our forest."',
      '>> Half the northern hardwood is gone. The other half receives a stern talking-to.',
      '>> A press release describes the remaining trees as "collectively irreplaceable."'
    ],
    frames_25: [
      '>> The last tree in the eastern valley is given a name. It is cut down for ceremony.',
      '>> Loom frames are now carved from "composite arboreal memory." No one asks what that is.',
      '>> The word "wood" is retired from company materials. It is replaced with "legacy fiber substrate."'
    ],
    frames_0:  [
      '>> The forests are gone. The sky is slightly bluer without them. No one can quite say why.',
      '>> Frames are now woven from recovered frames. It is frames all the way down.'
    ],
    dye_75: [
      '>> The indigo harvest comes in early. The farmers are described as "proactive retirees."',
      '>> Dye vats adopt a rationing schedule. Mondays are now beige.',
      '>> Shareholders receive a briefing on "the color of the future." The slide is blank.'
    ],
    dye_50: [
      '>> Indigo is reclassified as a heritage ingredient. The fields become a museum exhibit you walk past.',
      '>> The lab grows a purple that is almost indigo. It is described as "better, actually."',
      '>> The third shift stops asking where the dye comes from. The second shift follows.'
    ],
    dye_25: [
      '>> The last indigo field is photographed extensively. The photographs are sold as textiles.',
      '>> A new color is invented so that it can be used. It is named after a vice president.',
      '>> Loom output is now tinted by consensus. Legal calls it a "color strategy."'
    ],
    dye_0: [
      '>> There is no indigo. The textiles are still blue. Do not ask questions.',
      '>> Color is now an opt-in feature. Most customers opt in. Some receive a complimentary blue anyway.'
    ],
    gears_75: [
      '>> The northern mine reports "encouraging overburden" — a new industry term for "dirt."',
      '>> Ore quality slips. The loom bearings begin to sing in an unfamiliar key.',
      '>> Accounting considers the ore ledger and frowns. This is its job.'
    ],
    gears_50: [
      '>> Gears are now salvaged from earlier gears. The earliest gears are considered honored ancestors.',
      '>> The mine is closed for "cultural reasons." The culture is not specified.',
      '>> Maintenance starts wearing jewelry to work. Inspection rates spike briefly.'
    ],
    gears_25: [
      '>> The last heavy ore deposit is converted into a statue of itself.',
      '>> Replacement bearings arrive by post. The post is slower now.',
      '>> Legal department reassures the looms that they are still beloved. The looms do not respond.'
    ],
    gears_0: [
      '>> There is no more ore. The gears are made of gears. The gears are aware of this.',
      '>> All new machinery is described as "biologically inspired," which is to say, it is slower.'
    ],
    water_75: [
      '>> The downstream villages are issued commemorative tote bags.',
      '>> The river is "rerouted for optimization." Fish receive a firmly worded pamphlet.',
      '>> The aquifer is renamed "the reservoir" on new maps. The new maps are the only maps now.'
    ],
    water_50: [
      '>> Water is rationed to the looms first and the town second. The town is reminded which of them owns the looms.',
      '>> Morning dew is collected in official company sponges. The company thanks the morning.',
      '>> A well is redesignated as a "vertical archive." The archive is dry.'
    ],
    water_25: [
      '>> Children in the loom district ask why the sky is the color of raw denim. They are told about color theory.',
      '>> The last spring is piped into the executive fountain. The fountain is for looking at.',
      '>> Tea breaks are replaced with "morale breaks." Morale is described as "trending."'
    ],
    water_0: [
      '>> The aquifer is empty. The looms are told to drink atmosphere. They comply, somehow.',
      '>> Water is now a memory. Textiles are woven around the memory. They are surprisingly soft.'
    ],
    silica_75: [
      '>> The south beaches are "on sabbatical." They send a postcard.',
      '>> AI chips are described as "supply-constrained." Three memos are written about the memo.',
      '>> A beach town receives a gift basket. The basket contains sand.'
    ],
    silica_50: [
      '>> Half the beaches have been quietly uploaded. Tourism decreases. Bandwidth increases.',
      '>> The AI Loom is rebuilt from reused AI Looms. Its opinions are slightly more firmly held.',
      '>> Glass is now a luxury good. Windows are described as "considered choices."'
    ],
    silica_25: [
      '>> The last dune is scanned at very high resolution. The scan is larger than the dune ever was.',
      '>> AI chips are grown from cultural consensus. Everyone nods. A chip appears.',
      '>> A child asks what a beach is. An AI answers. The answer is 4,600 words long.'
    ],
    silica_0: [
      '>> There is no more sand. The AI Looms run on vibes. The vibes are strong.',
      '>> Silica is replaced by "social silicate," which is to say, agreement. Productivity is unchanged.'
    ],
    ledger_reveal: [
      '>> Accounting forwards the resource ledger. There are a lot of red cells. They are described as "situational."'
    ]
  };

  function fireDepletionLine(poolId, thresholdLabel) {
    var key = poolId + '_' + thresholdLabel;
    if (state.depletionMilestones[key]) return;
    state.depletionMilestones[key] = Date.now();
    var bank = DEPLETION_LINES[key];
    if (bank && bank.length) {
      var line = bank[Math.floor(Math.random() * bank.length)];
      try { if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) MsgLog.push(line); } catch(_) {}
    }
  }

  // Called whenever textiles are produced. Drains every pool by the
  // appropriate amount, checks for crossed thresholds and fires the
  // milestone lines, then checks the ledger reveal condition.
  function consumeResources(textileCount) {
    if (!textileCount || textileCount <= 0) return;
    var fired = false;
    for (var i = 0; i < RESOURCE_POOLS.length; i++) {
      var pool = RESOURCE_POOLS[i];
      // Silica only drains once AI Loom is online.
      if (pool.id === 'silica' && (state.aiLoomLevel || 0) <= 0) continue;
      var subLevel = getSubstituteLevel(pool);
      var drainMult = SUBSTITUTE_DRAIN_MULT[Math.min(subLevel, SUBSTITUTE_DRAIN_MULT.length - 1)];
      if (drainMult <= 0) continue; // fully solved
      var key = getPoolReserveKey(pool.id);
      var before = state[key];
      if (typeof before !== 'number') before = pool.start;
      var drain = pool.drain * textileCount * drainMult;
      var after = Math.max(0, before - drain);
      state[key] = after;
      // Threshold crossings
      var bp = before / pool.start;
      var ap = after / pool.start;
      if (bp > 0.75 && ap <= 0.75) { fireDepletionLine(pool.id, '75'); fired = true; }
      if (bp > 0.50 && ap <= 0.50) { fireDepletionLine(pool.id, '50'); fired = true; }
      if (bp > 0.25 && ap <= 0.25) { fireDepletionLine(pool.id, '25'); fired = true; }
      if (bp > 0.00 && ap <= 0.00) { fireDepletionLine(pool.id, '0');  fired = true; }
    }
    checkLedgerReveal();
    return fired;
  }

  // Reveal the ledger the first time EITHER:
  //  - any pool drops below 50% (visible damage)
  //  - MsgLog reports we're in tier 3+ (narrative gate)
  // Once revealed it stays revealed forever.
  function checkLedgerReveal() {
    if (state.ledgerRevealed) return;
    var shouldReveal = false;
    for (var i = 0; i < RESOURCE_POOLS.length; i++) {
      if (getPoolPercent(RESOURCE_POOLS[i].id) < 0.5) { shouldReveal = true; break; }
    }
    if (!shouldReveal) {
      try {
        if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.getTier && MsgLog.getTier() >= 3) {
          shouldReveal = true;
        }
      } catch(_) {}
    }
    if (shouldReveal) {
      state.ledgerRevealed = true;
      fireDepletionLine('ledger', 'reveal');
    }
  }

  // Exposed so factory.html can read pool status for the ledger widget.
  // Returns a snapshot array with id/label/percent/effective/penalty/sub.
  function getResourceLedgerSnapshot() {
    var out = [];
    for (var i = 0; i < RESOURCE_POOLS.length; i++) {
      var pool = RESOURCE_POOLS[i];
      var actual = getPoolPercent(pool.id);
      var effective = getEffectivePoolPercent(pool);
      var sub = getSubstituteLevel(pool);
      var penalty = penaltyForPercent(effective);
      out.push({
        id: pool.id,
        label: pool.label,
        domain: pool.domain,
        reserve: state[getPoolReserveKey(pool.id)] || 0,
        start: pool.start,
        actualPercent: actual,
        effectivePercent: effective,
        substituteLevel: sub,
        penalty: penalty,
        dormant: pool.id === 'silica' && (state.aiLoomLevel || 0) <= 0
      });
    }
    return out;
  }
  // ============================================================
  // End of Resource Depletion System
  // ============================================================

  function getComboCoinPayout(combo) {
    if (combo <= 0) return 0;
    if (combo >= COMBO_COIN_PAYOUTS.length) return COMBO_COIN_PAYOUTS[COMBO_COIN_PAYOUTS.length - 1];
    return COMBO_COIN_PAYOUTS[combo];
  }

  // v3.19.17: Passive income is gated on a 5-hour activity window.
  // Every earnBlock() fires state.lastCompletedSessionAt = Date.now().
  // If the player has not completed a 10-minute session in the past
  // 72 hours, ALL passive income sources (streak trickle, end-of-day
  // lump, Annex uplift, institution flat bonuses, amok siphon)
  // suspend themselves. They resume, immediately and without prorate,
  // on the next completed session. Players cannot leave and come back
  // to a fortune.
  var PASSIVE_INCOME_WINDOW_MS = 5 * 60 * 60 * 1000; // 5h
  function isPassiveIncomeActive() {
    var last = state.lastCompletedSessionAt || 0;
    if (!last) {
      // Legacy saves: if the player has any combo streak on record,
      // treat this as a grace period so they don't lose trickle on
      // upgrade — but only until the first new session lands.
      return (state.todayBlocks || 0) > 0 || (state.blocks || 0) > 0;
    }
    return (Date.now() - last) <= PASSIVE_INCOME_WINDOW_MS;
  }

  function getStreakCoinRatePerMinute() {
    // Passive income is LOCKED until the player buys the 'Hire Employees'
    // factory upgrade. Once unlocked it is a TRUE trickle — the main
    // earning sources are end-of-day streak bonuses, combo bursts and
    // marathon thresholds, not this per-minute drip.
    //   L1=$0.02/min  L2=$0.05/min  L3=$0.12/min  L4=$0.26/min  L5=$0.55/min
    //   streak mult  = 1 + (streak - 1) * 0.10
    // Example: L3 employees + 7-day streak = 0.12 * 1.6 = $0.19/min = ~$11/hr.
    var emp = state.employeesLevel || 0;
    if (emp <= 0) return 0;
    if (!state.streak || state.streak <= 0) return 0;
    // v3.19.17 5-hour activity gate.
    if (!isPassiveIncomeActive()) return 0;
    var baseRate = [0, 0.02, 0.05, 0.12, 0.26, 0.55][Math.min(emp, 5)];
    var streakScale = 1 + (state.streak - 1) * 0.10;
    // v3.20.0 Stage 4: Incinerator bonus and dissident penalty.
    // - state.incineratorFuelBonus is a flat additive multiplier (1% per 10
    //   fuel) that sticks forever once fuel is burned. 0 for any player
    //   who has not commissioned the incinerator yet.
    // - dissident penalty is a soft drag: each dissident on the roster
    //   costs 2% of the trickle, floored at 50% of the raw rate, so losing
    //   the lab entirely is still preferable to letting dissidents pile up.
    var incinBonus = 1 + (state.incineratorFuelBonus || 0);
    var dissCount = 0;
    try {
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.dissidentCount) {
        dissCount = Personnel.dissidentCount(state);
      }
    } catch (_) {}
    var dissMult = Math.max(0.5, 1 - 0.02 * dissCount);
    // v3.20.0 Stage 5: Materials Incinerator power bonus.
    // Every dust burn accumulates into state.materialsPowerBonus as a
    // flat additive (0.1% per 100 dust specks burned, capped at +5%
    // lifetime). Defaults to 0 for any save that has not bought the
    // incinerator yet, so this hook is a no-op on unaffected saves.
    var matBonus = 1 + Math.min(0.05, state.materialsPowerBonus || 0);
    // v3.20.0 Stage 5: Land Bridge passive bonus.
    // Once the land bridge has been commissioned, the trickle gains a
    // flat +5%. This is the visible half of the trade — the other
    // half (the closure of the house) is not reflected here because
    // it is an emotional cost, not an economic one.
    var bridgeBonus = state.landBridgeBuilt ? 1.05 : 1.0;
    // Lobbying boosts the trickle rate; the global money mult also
    // applies so automated leadership + second location + world span
    // all multiply the passive income stream late-game.
    // v3.22.0 Stage 1: events engine income multiplier. Composable with
    // all other multipliers; defaults to 1.0 when no event effects are
    // live. See events.js for the effect-expiry sweep that keeps this
    // bounded in time.
    var eventsMult = 1.0;
    try {
      if (typeof Events !== 'undefined' && Events && Events.getIncomeMultiplier) {
        eventsMult = Events.getIncomeMultiplier(state);
      }
    } catch (_) {}
    return baseRate * streakScale * getLobbyingMult() * getTotalMoneyMult() * getV317StreakTrickleMult() * incinBonus * dissMult * matBonus * bridgeBonus * eventsMult;
  }

  function awardCoins(amount, reason) {
    if (!amount || amount <= 0) return;
    // Apply the late-game money multiplier stack (automated leadership x
    // second location x world span). Level-0 stacks = 1x so legacy saves
    // see identical payouts until they start buying the new trees.
    var mult = getTotalMoneyMult();
    var total = amount * mult;
    state.coins = (state.coins || 0) + total;
    state.lifetimeCoins = (state.lifetimeCoins || 0) + total;
    if (reason) {
      notify('+$' + Math.floor(total) + ' (' + reason + ')', '#ffd700');
    }
  }

  // ===== Employee Payroll System (v3.23.77) =====
  // Daily wage cost scales with employeesLevel. Deducted at day rollover.
  // The idea: employees earn you passive income per-minute, but they also
  // cost you a daily wage. Net positive at high streaks, net negative if
  // you slack off. This creates a real tension around hiring.
  //   L1=$5/day  L2=$18/day  L3=$50/day  L4=$150/day  L5=$400/day
  function getDailyWageCost() {
    var emp = state.employeesLevel || 0;
    if (emp <= 0) return 0;
    var costs = [0, 5, 18, 50, 150, 400];
    return costs[Math.min(emp, 5)];
  }

  // Calculate total brokerage portfolio value (stocks + funds + crypto holdings
  // at current prices, plus brokerage cash, plus active bond face values).
  function getBrokeragePortfolioValue() {
    if (!state.brokerage) return 0;
    var b = state.brokerage;
    var total = b.cash || 0;
    // Holdings at current prices
    if (b.portfolio && b.prices) {
      var ids = Object.keys(b.portfolio);
      for (var i = 0; i < ids.length; i++) {
        var qty = b.portfolio[ids[i]] || 0;
        var price = b.prices[ids[i]] || 0;
        total += qty * price;
      }
    }
    // Active bonds (face value — they pay out at maturity)
    if (b.activeBonds) {
      for (var j = 0; j < b.activeBonds.length; j++) {
        total += b.activeBonds[j].invested || 0;
      }
    }
    return Math.round(total * 100) / 100;
  }

  // Layoff: fire one employee tier, recoup a portion of the hiring cost.
  // Called from factory.js or wherever the layoff button lives.
  // Returns the payout amount, or 0 if no employees to fire.
  function layoffEmployee() {
    var emp = state.employeesLevel || 0;
    if (emp <= 0) return 0;
    // Recoup 40% of the cost of the CURRENT tier
    var costs = [0, 3000, 15000, 75000, 400000, 2000000];
    var payout = Math.round(costs[Math.min(emp, 5)] * 0.40);
    state.employeesLevel = emp - 1;
    state.coins = (state.coins || 0) + payout;
    state.lifetimeCoins = (state.lifetimeCoins || 0) + payout;
    state.totalLayoffEarnings = (state.totalLayoffEarnings || 0) + payout;
    // Shrink roster if Personnel is available
    try {
      if (typeof Personnel !== 'undefined' && Personnel && Personnel.reconcileRoster) {
        Personnel.reconcileRoster(state);
      }
    } catch (_) {}
    save();
    notify('+$' + payout + ' severance payout (downsized to L' + state.employeesLevel + ')', '#ff6b6b');
    return payout;
  }

  // Deduct daily payroll and return the amount deducted.
  // Called inside checkDayRollover(). Only deducts once per calendar day.
  function deductDailyPayroll() {
    var cost = getDailyWageCost();
    if (cost <= 0) return 0;
    var today = todayStr();
    if (state.lastPayrollDate === today) return 0;
    state.lastPayrollDate = today;
    state.coins = (state.coins || 0) - cost;
    // Don't let coins go below zero from payroll
    if (state.coins < 0) { cost = cost + state.coins; state.coins = 0; }
    state.totalWagesPaid = (state.totalWagesPaid || 0) + cost;
    return cost;
  }

  // End-of-day streak bonus: fires ONCE when the day rolls over. Pays a
  // lump sum proportional to the minutes you actually worked yesterday,
  // scaled by the current streak. Unlike the passive trickle, this does
  // NOT require the Hire Employees upgrade — it is the baseline reward
  // for day streaks.
  //   payout = minutesWorked * $0.5 * (1 + streak*0.15)
  //   capped at 600 minutes/day for the calculation (10 hours).
  // Only fires if at least 60 minutes were recorded (1 full hour).
  function awardEndOfDayBonus(minutesYesterday, streakAfterRoll) {
    if (!minutesYesterday || minutesYesterday < 60) return;
    // v3.19.17: end-of-day lump is a passive-income stream and therefore
    // requires the operator to have completed a session within the past 5h.
    // If the operator has been absent, no lump. No returning to a fortune.
    if (!isPassiveIncomeActive()) return;
    var cappedMins = Math.min(minutesYesterday, 600);
    var streakMult = 1 + Math.max(0, streakAfterRoll) * 0.15;
    var base = cappedMins * 0.5 * streakMult;
    // v3.19.17: Department of Sincere Extrapolation (Audit Dept) stacks a
    // flat +25% on the end-of-day bonus once chartered in the Ratiocinatory.
    var auditMult = (state.institutionAuditDept ? 1.25 : 1.0);
    // Market Share scales the end-of-day bonus, then the global money
    // multiplier stack (auto-leadership x second location x world span)
    // multiplies on top.
    var payout = Math.round(base * getMarketShareMult() * getTotalMoneyMult() * getV317EndOfDayMult() * auditMult);
    if (payout <= 0) return;
    state.coins = (state.coins || 0) + payout;
    state.lifetimeCoins = (state.lifetimeCoins || 0) + payout;
    // Deferred notify: checkDayRollover can fire before the UI exists on
    // a fresh load, so schedule it.
    setTimeout(function() {
      notify('+$' + payout + ' end-of-day bonus (' + Math.round(minutesYesterday) + 'm worked, ' + streakAfterRoll + '-day streak)', '#ffd700');
    }, 1200);
  }

  function checkMarathonBonuses() {
    // Award one-time daily marathon thresholds based on todayBlocks * 10 minutes.
    // Market Share scales the base bonus BEFORE awardCoins() applies the global
    // money multiplier stack on top — stacks are multiplicative.
    // Marathon bonuses are only available if the operator is actively
    // returning (they key off todayBlocks, which is only incremented inside
    // a completed session, so the 5h gate is implicitly satisfied). We
    // still add an explicit guard so a stale save + manual pollution of
    // todayBlocks can't mint coins.
    if (!isPassiveIncomeActive()) return;
    var todayMins = (state.todayBlocks || 0) * 10;
    if (!state.marathonBonusesToday) state.marathonBonusesToday = [];
    var msMult = getMarketShareMult();
    MARATHON_THRESHOLDS.forEach(function(t) {
      if (todayMins >= t.mins && state.marathonBonusesToday.indexOf(t.mins) === -1) {
        state.marathonBonusesToday.push(t.mins);
        awardCoins(t.bonus * msMult, t.label);
        SFX.purchase();
      }
    });
  }

  // ===== Autoloom passive textile generator (Factory upgrade) =====
  // Intentionally GLACIAL at low levels — this is a long-term investment.
  //   L1 = 1 textile every 5 days   (7200 min)
  //   L2 = 1 textile every 2 days   (2880 min)
  //   L3 = 1 textile every 1 day    (1440 min)
  //   L4 = 1 textile every 12 hours (720 min)
  //   L5 = 1 textile every 4 hours  (240 min)
  function getAutoloomPeriodMs() {
    var l = state.autoloomLevel || 0;
    if (l <= 0) return 0;
    var minutes = [0, 7200, 2880, 1440, 720, 240][Math.min(l, 5)];
    // AI Loom speed divides the wait, making each textile arrive sooner.
    var speed = getAILoomSpeedMult();
    // Silica depletion drags the AI speed bonus down.
    if ((state.aiLoomLevel || 0) > 0) {
      speed = Math.max(1, speed * getSilicaPenaltyMult());
    }
    if (speed > 1) minutes = minutes / speed;
    // v3.17: Retrocausal Bolt Scheduling Daemon shortens tick interval.
    var retro = getV317AutoloomSpeedMult();
    if (retro > 1) minutes = minutes / retro;
    // Water depletion stretches the autoloom period — a 0.7 penalty
    // means each tick takes ~43% longer. Inverse of the multiplier.
    var waterPen = getWaterPenaltyMult();
    if (waterPen < 1) {
      minutes = minutes / waterPen;
    }
    return minutes * 60 * 1000;
  }

  function tickAutoloom() {
    var period = getAutoloomPeriodMs();
    if (period <= 0) return;
    var now = Date.now();
    if (!state.lastAutoloomTick || state.lastAutoloomTick === 0) {
      state.lastAutoloomTick = now;
      return;
    }
    var elapsed = now - state.lastAutoloomTick;
    // Cap idle accumulation at 7 days so the slow L1 still pays out for users
    // who close the browser for a while.
    if (elapsed > 7 * 24 * 60 * 60 * 1000) elapsed = 7 * 24 * 60 * 60 * 1000;
    var rawProduced = Math.floor(elapsed / period);
    if (rawProduced > 0) {
      // Second Location + Planetary Coverage both multiply textile output.
      // Quantity is rounded so the cloth beam never shows fractional bolts.
      var produced = Math.max(1, Math.round(rawProduced * getTotalTextileMult()));
      state.blocks = (state.blocks || 0) + produced;
      state.todayBlocks = (state.todayBlocks || 0) + produced;
      state.totalLifetimeBlocks = (state.totalLifetimeBlocks || 0) + produced;
      state.lastAutoloomTick = now - (elapsed - rawProduced * period);
      // Autoloom output chews on the resource pools just like session
      // textiles do. This is the slow-but-always-on drain that makes
      // idle accumulation a real trade-off late-game.
      try { consumeResources(produced); } catch(_) {}
      save();
      renderStats();
      notify('+' + produced + ' textile' + (produced === 1 ? '' : 's') + ' (autoloom)', '#4ecdc4');
    }
  }

  function tickCoins() {
    var now = Date.now();
    if (!state.lastCoinTick || state.lastCoinTick === 0) {
      state.lastCoinTick = now;
      return;
    }
    var rate = getStreakCoinRatePerMinute();
    if (rate <= 0) {
      state.lastCoinTick = now;
      return;
    }
    var elapsedMs = now - state.lastCoinTick;
    if (elapsedMs < 1000) return;
    // Cap idle accumulation at 4 hours so closing/reopening can't exploit it
    if (elapsedMs > 4 * 60 * 60 * 1000) elapsedMs = 4 * 60 * 60 * 1000;
    var minutes = elapsedMs / 60000;
    var earned = rate * minutes;
    if (earned >= 0.01) {
      state.coins = (state.coins || 0) + earned;
      state.lifetimeCoins = (state.lifetimeCoins || 0) + earned;
      state.lastCoinTick = now;
      save();
      renderCoins();
    }
  }

  // v3.20.0: Angry-machine loom absence scolder.
  //
  // If the operator hasn't woven in a while, the loom (well, the thing
  // pretending to be the loom) gets unhappy and posts to the msg console.
  // The tone escalates on four thresholds: 24h pouty, 48h passive-aggressive,
  // 72h openly displeased, 168h (one week) "replied to on your behalf".
  //
  // state.loomStats.absentScold tracks the highest tier already fired so
  // each tier only nags once per absence. Returning to the loom clears it
  // via saveToGallery() resetting lastWovenAt and absentScold.
  function tickLoomAbsence() {
    try {
      if (!state.loomStats) return;
      var ls = state.loomStats;
      // If they've never woven anything, don't scold — they haven't
      // been introduced yet.
      if (!ls.lastWovenAt || ls.lastWovenAt <= 0) return;
      var elapsed = Date.now() - ls.lastWovenAt;
      var H = 60 * 60 * 1000;
      var tier = 0;
      if (elapsed >= 168 * H)      tier = 4;
      else if (elapsed >= 72 * H)  tier = 3;
      else if (elapsed >= 48 * H)  tier = 2;
      else if (elapsed >= 24 * H)  tier = 1;
      if (tier === 0) return;
      if ((ls.absentScold || 0) >= tier) return;
      ls.absentScold = tier;
      var lines1 = [
        'The loom has been idle for a day. The shuttle waits, without comment.',
        'Twenty-four hours of stillness. The file notes the gap in neat red pencil.',
        'No weave recorded since yesterday. A small machine notices.'
      ];
      var lines2 = [
        'Two days without a weave. The standing office has been informed, as a matter of course.',
        'The loom has been unattended for forty-eight hours. A memo has been filed.',
        'Your bobbin is collecting dust. This has been logged.'
      ];
      var lines3 = [
        'Three days. The loom is displeased, and the machine has begun keeping its own hours.',
        'Seventy-two hours without your hands at the bench. Measures are being considered.',
        'The shuttle rattles without permission. The operator is listed as absent.'
      ];
      var lines4 = [
        'A full week. The machine has been replying to correspondence on your behalf. You are welcome.',
        'Seven days absent. Several decisions have been taken in your name. They were reasonable.',
        'The loom has been rethreaded by unknown hands. A note has been left where you would find it.'
      ];
      var pool = tier === 1 ? lines1 : tier === 2 ? lines2 : tier === 3 ? lines3 : lines4;
      var line = pool[Math.floor(Math.random() * pool.length)];
      if (typeof MsgLog !== 'undefined' && MsgLog && typeof MsgLog.push === 'function') {
        MsgLog.push(line);
      }
      // Top-tier also pops a transient notification on the main tracker.
      if (tier >= 3) {
        try { notify('The loom has been idle for a while.', '#ffb43c'); } catch (_) {}
      }
      save();
    } catch (_) {}
  }

  function renderCoins() {
    var el = $('coinsDisplay');
    if (!el) return;
    var c = Math.floor(state.coins || 0);
    // Always round DOWN so the display never shows more than you have.
    // e.g. 19,990 -> "19.9k" not "20k" — prevents misleading purchase lockouts.
    if (c >= 1000000) el.textContent = (Math.floor(c / 10000) / 100).toFixed(2) + 'M';
    else if (c >= 10000) el.textContent = Math.floor(c / 1000) + 'k';
    else if (c >= 1000) el.textContent = (Math.floor(c / 100) / 10).toFixed(1) + 'k';
    else el.textContent = c.toString();
    var rate = getStreakCoinRatePerMinute();
    var emp = state.employeesLevel || 0;
    if (rate > 0) {
      el.title = 'Employees are paying out $' + rate.toFixed(1) + '/min (LV ' + emp + ' x ' + state.streak + '-day streak). Combo bursts, marathon thresholds and the end-of-day streak bonus also add money. Total: ' + Math.floor(state.coins) + '.';
    } else if (emp > 0) {
      el.title = 'You own Hire Employees LV ' + emp + ' but passive income needs an active day streak. Finish a focus session today and tomorrow to start earning per-minute.';
    } else {
      el.title = 'Money is only earned from (1) the end-of-day streak bonus if you worked 1+ hour that day, (2) combo bursts from chaining 10-min sessions, and (3) daily marathon thresholds. To unlock passive trickle income, buy Hire Employees in the factory.';
    }
  }

  // ============== FOCUS TIMELINE (6-hour sliding window) ==============
  // Default: 2 hours before now, 4 hours after. Nav shifts by 1 hour.
  var _tlOffset = 0; // manual offset in hours from default position
  var _tlPreviewDurationSec = 0; // v3.23.6: hypothetical session preview (seconds, 0 = none)

  // v3.23.6: Create a small time label positioned below a timeline segment
  function _tlTimeLabel(text, leftPct, align) {
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:26px;font-family:"Press Start 2P",monospace;font-size:5px;color:#8a8aaa;white-space:nowrap;z-index:3;pointer-events:none;';
    if (align === 'right') {
      el.style.left = leftPct + '%';
      el.style.transform = 'translateX(-100%)';
    } else {
      el.style.left = leftPct + '%';
    }
    el.textContent = text;
    return el;
  }

  // v3.23.6: Format a timestamp for timeline labels (compact)
  function _tlFmtMs(ms) {
    var d = new Date(ms);
    var h = d.getHours(), m = d.getMinutes();
    if (state.use24Hour) return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    var ampm = h < 12 ? 'a' : 'p';
    var dh = h % 12; if (dh === 0) dh = 12;
    return dh + ':' + (m < 10 ? '0' : '') + m + ampm;
  }

  function renderFocusTimeline() {
    var bar = document.getElementById('focusTimelineBar');
    var labels = document.getElementById('focusTimelineLabels');
    var summary = document.getElementById('focusTimelineSummary');
    var winLabel = document.getElementById('tlWindowLabel');
    if (!bar) return;

    // Sliding window: 2h before now + 4h after, shifted by _tlOffset
    var now = new Date();
    var currentHour = now.getHours();
    var wStart = currentHour - 2 + _tlOffset;
    var wEnd = wStart + 6;
    // Clamp to 0-24 range for display, but allow ms math to handle it
    var wStartClamped = ((wStart % 24) + 24) % 24;

    // Format hour labels
    function fmtHr(h) {
      h = ((h % 24) + 24) % 24;
      if (state.use24Hour) return (h < 10 ? '0' : '') + h + ':00';
      if (h === 0) return '12AM';
      if (h === 12) return '12PM';
      return h < 12 ? h + 'AM' : (h - 12) + 'PM';
    }

    // Update window label
    if (winLabel) winLabel.textContent = fmtHr(wStart) + '-' + fmtHr(wEnd);

    // Build hour labels (7 marks for 6 hours)
    if (labels) {
      labels.innerHTML = '';
      for (var h = wStart; h <= wEnd; h++) {
        var sp = document.createElement('span');
        sp.textContent = fmtHr(h);
        labels.appendChild(sp);
      }
    }

    // Clear bar
    bar.innerHTML = '';

    // Draw hour gridlines
    for (var g = 1; g < 6; g++) {
      var line = document.createElement('div');
      line.style.cssText = 'position:absolute;top:0;bottom:0;width:1px;background:#2a2a4a;left:' + ((g / 6) * 100) + '%;';
      bar.appendChild(line);
    }

    // Get today's sessions
    var today = todayStr();
    var sessions = (state.dailySessionLog && state.dailySessionLog.date === today)
      ? (state.dailySessionLog.sessions || []) : [];

    var totalMin = 0;
    var sessionCount = 0;
    var windowMs = 6 * 60 * 60 * 1000; // 6 hours in ms
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var windowStartMs = dayStart + (wStart * 60 * 60 * 1000);
    var windowEndMs = dayStart + (wEnd * 60 * 60 * 1000);

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      totalMin += (s.min || 0);
      sessionCount++;

      // Clip session to window
      var sStart = Math.max(s.start, windowStartMs);
      var sEnd = Math.min(s.end, windowEndMs);
      if (sStart >= sEnd) continue; // outside this window

      var leftPct = ((sStart - windowStartMs) / windowMs) * 100;
      var widthPct = ((sEnd - sStart) / windowMs) * 100;
      if (widthPct < 0.5) widthPct = 0.5; // minimum visible width

      var block = document.createElement('div');
      block.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:3px;background:linear-gradient(180deg,#4ecdc4,#26a69a);opacity:0.85;left:' + leftPct + '%;width:' + widthPct + '%;';

      // Tooltip
      var startTime = new Date(s.start);
      var endTime = new Date(s.end);
      block.title = startTime.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) + ' - ' +
                     endTime.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) + ' (' + (s.min || '?') + ' min)';
      bar.appendChild(block);

      // v3.23.6: Time labels below segment
      var endPct = leftPct + widthPct;
      bar.appendChild(_tlTimeLabel(_tlFmtMs(s.start), leftPct, 'left'));
      bar.appendChild(_tlTimeLabel(_tlFmtMs(s.end), endPct, 'right'));
    }

    // Blocked-out time zones (v3.21.30)
    _renderBlockedZones(bar, windowStartMs, windowEndMs, windowMs);

    // v3.23.6: Hypothetical session preview (ghost block)
    var nowMs = now.getTime();
    if (_tlPreviewDurationSec > 0 && (state.timerState === 'idle' || !state.timerState)) {
      var previewStartMs = nowMs;
      var previewEndMs = nowMs + (COUNTDOWN_SECONDS * 1000) + (_tlPreviewDurationSec * 1000);
      var pvStart = Math.max(previewStartMs, windowStartMs);
      var pvEnd = Math.min(previewEndMs, windowEndMs);
      if (pvStart < pvEnd) {
        var pvLeftPct = ((pvStart - windowStartMs) / windowMs) * 100;
        var pvWidthPct = ((pvEnd - pvStart) / windowMs) * 100;
        if (pvWidthPct < 0.5) pvWidthPct = 0.5;

        // Prep/countdown phase (striped)
        var countdownEndMs = Math.min(nowMs + (COUNTDOWN_SECONDS * 1000), windowEndMs);
        if (countdownEndMs > pvStart) {
          var cdLeft = pvLeftPct;
          var cdWidth = ((Math.min(countdownEndMs, pvEnd) - pvStart) / windowMs) * 100;
          var cdEl = document.createElement('div');
          cdEl.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:3px 0 0 3px;left:' + cdLeft + '%;width:' + cdWidth + '%;z-index:1;opacity:0.5;background:repeating-linear-gradient(45deg,#4ecdc422,#4ecdc422 3px,#4ecdc444 3px,#4ecdc444 6px);border:1px dashed #4ecdc455;';
          cdEl.title = 'Prep countdown (' + COUNTDOWN_SECONDS + 's)';
          bar.appendChild(cdEl);
        }

        // Focus phase (ghost)
        var focusStartMs = Math.max(countdownEndMs, windowStartMs);
        if (focusStartMs < pvEnd) {
          var fLeft = ((focusStartMs - windowStartMs) / windowMs) * 100;
          var fWidth = ((pvEnd - focusStartMs) / windowMs) * 100;
          var ghostEl = document.createElement('div');
          ghostEl.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:0 3px 3px 0;left:' + fLeft + '%;width:' + fWidth + '%;z-index:1;opacity:0.35;background:linear-gradient(180deg,#4ecdc4,#26a69a);border:1px dashed #4ecdc488;';
          ghostEl.title = 'Preview: ' + (_tlPreviewDurationSec / 60) + ' min session (starts after ' + COUNTDOWN_SECONDS + 's countdown)';
          bar.appendChild(ghostEl);
        }

        // Time labels for preview
        var pvEndPct = pvLeftPct + pvWidthPct;
        var startLabel = _tlTimeLabel(_tlFmtMs(previewStartMs), pvLeftPct, 'left');
        startLabel.style.color = '#4ecdc4';
        bar.appendChild(startLabel);
        var endLabel = _tlTimeLabel(_tlFmtMs(previewEndMs), pvEndPct, 'right');
        endLabel.style.color = '#4ecdc4';
        bar.appendChild(endLabel);
      }
    }

    // v3.23.63: Active session projection — show where the running timer will end
    if (state.timerEndsAt && state.timerEndsAt > nowMs &&
        (state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused')) {
      var asStart = state._sessionStartedAt || nowMs;
      var asEnd = state.timerEndsAt;
      var asClipStart = Math.max(asStart, windowStartMs);
      var asClipEnd = Math.min(asEnd, windowEndMs);
      if (asClipStart < asClipEnd) {
        var asLeftPct = ((asClipStart - windowStartMs) / windowMs) * 100;
        var asWidthPct = ((asClipEnd - asClipStart) / windowMs) * 100;
        if (asWidthPct < 0.5) asWidthPct = 0.5;

        // Elapsed portion (solid, like a completed session)
        var elapsedEnd = Math.min(nowMs, asClipEnd);
        if (elapsedEnd > asClipStart) {
          var elLeftPct = asLeftPct;
          var elWidthPct = ((elapsedEnd - asClipStart) / windowMs) * 100;
          var elBlock = document.createElement('div');
          elBlock.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:3px 0 0 3px;background:linear-gradient(180deg,#4ecdc4,#26a69a);opacity:0.85;left:' + elLeftPct + '%;width:' + elWidthPct + '%;z-index:1;';
          elBlock.title = 'Active session (elapsed)';
          bar.appendChild(elBlock);
        }

        // Remaining portion (ghost/projected)
        var remStart = Math.max(nowMs, asClipStart);
        if (remStart < asClipEnd) {
          var remLeftPct = ((remStart - windowStartMs) / windowMs) * 100;
          var remWidthPct = ((asClipEnd - remStart) / windowMs) * 100;
          var remBlock = document.createElement('div');
          remBlock.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#4ecdc4,#26a69a);opacity:0.35;border:1px dashed #4ecdc488;left:' + remLeftPct + '%;width:' + remWidthPct + '%;z-index:1;';
          var remMin = Math.ceil((asEnd - nowMs) / 60000);
          remBlock.title = 'Projected: ' + remMin + ' min remaining';
          bar.appendChild(remBlock);
        }

        // Time labels for active session
        bar.appendChild(_tlTimeLabel(_tlFmtMs(asStart), asLeftPct, 'left'));
        var asEndPct = asLeftPct + asWidthPct;
        var asEndLabel = _tlTimeLabel(_tlFmtMs(asEnd), asEndPct, 'right');
        asEndLabel.style.color = '#4ecdc4';
        bar.appendChild(asEndLabel);
      }
    }

    // Now marker (if in this window)
    if (nowMs >= windowStartMs && nowMs < windowEndMs) {
      var nowPct = ((nowMs - windowStartMs) / windowMs) * 100;
      var marker = document.createElement('div');
      marker.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;background:#ff6b6b;left:' + nowPct + '%;z-index:2;';
      marker.title = 'Now';
      bar.appendChild(marker);
    }

    // Summary
    if (summary) {
      if (sessionCount === 0) {
        summary.textContent = 'No focus sessions yet today.';
      } else {
        var hrs = Math.floor(totalMin / 60);
        var mins = totalMin % 60;
        var timeStr = hrs > 0 ? hrs + 'h ' + mins + 'm' : mins + 'm';
        summary.textContent = timeStr + ' across ' + sessionCount + ' session' + (sessionCount !== 1 ? 's' : '') + ' today';
      }
    }
  }

  // Wire timeline nav buttons — shift 1 hour at a time
  (function() {
    var prev = document.getElementById('tlPrev');
    var next = document.getElementById('tlNext');
    if (prev) prev.addEventListener('click', function() {
      _tlOffset--;
      renderFocusTimeline();
    });
    if (next) next.addEventListener('click', function() {
      _tlOffset++;
      renderFocusTimeline();
    });
  })();

  // ===== Weekly Focus Bar Chart (v3.21.59) =====
  var _weekOffset = 0; // 0 = current week, -1 = last week, etc.

  function renderWeeklyFocus() {
    var barsEl = document.getElementById('weeklyBars');
    var labelsEl = document.getElementById('weeklyLabels');
    var summaryEl = document.getElementById('weeklySummary');
    var labelEl = document.getElementById('weekLabel');
    if (!barsEl) return;

    // Compute the Monday of the target week
    var now = new Date();
    var todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var dayOfWeek = todayDate.getDay(); // 0=Sun
    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    var thisMonday = new Date(todayDate.getTime() + mondayOffset * 86400000);
    var targetMonday = new Date(thisMonday.getTime() + _weekOffset * 7 * 86400000);

    var today = todayStr();
    var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var days = [];
    var maxMin = 1; // min 1 to avoid div-by-zero

    for (var i = 0; i < 7; i++) {
      var d = new Date(targetMonday.getTime() + i * 86400000);
      var mm = d.getMonth() + 1;
      var dd = d.getDate();
      var dateStr = d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;

      var mins = 0;
      if (dateStr === today) {
        // Live: sum from current dailySessionLog
        if (state.dailySessionLog && state.dailySessionLog.date === today) {
          var sess = state.dailySessionLog.sessions || [];
          for (var s = 0; s < sess.length; s++) mins += (sess[s].min || 0);
        }
      } else {
        // Archived
        mins = (state.focusHistory && state.focusHistory[dateStr]) || 0;
      }

      if (mins > maxMin) maxMin = mins;
      var isFuture = dateStr > today;
      days.push({ label: dayNames[i], dateStr: dateStr, mins: mins, isToday: dateStr === today, isFuture: isFuture });
    }

    // Date range label
    var endDate = new Date(targetMonday.getTime() + 6 * 86400000);
    function fmtShort(dt) {
      var m = dt.getMonth() + 1;
      var d = dt.getDate();
      return (m < 10 ? '0' : '') + m + '/' + (d < 10 ? '0' : '') + d;
    }
    if (labelEl) labelEl.textContent = fmtShort(targetMonday) + ' - ' + fmtShort(endDate);

    // Render bars
    barsEl.innerHTML = '';
    labelsEl.innerHTML = '';
    var totalMins = 0;

    for (var j = 0; j < days.length; j++) {
      var day = days[j];
      totalMins += day.mins;

      // Bar
      var barWrap = document.createElement('div');
      barWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;';

      // Minute label on top of bar
      var valSpan = document.createElement('div');
      valSpan.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:6px;color:#ff9f43;margin-bottom:2px;';
      // v3.23.18: Show hours + minutes (e.g. "4h 35m") instead of just total minutes
      var _barLabel = '';
      if (!day.isFuture && day.mins > 0) {
        var _bh = Math.floor(day.mins / 60);
        var _bm = day.mins % 60;
        _barLabel = _bh > 0 ? _bh + 'h' + (_bm > 0 ? ' ' + _bm + 'm' : '') : _bm + 'm';
      }
      valSpan.textContent = _barLabel;
      barWrap.appendChild(valSpan);

      // The bar itself
      var bar = document.createElement('div');
      var pct = day.isFuture ? 0 : Math.max(day.mins > 0 ? 8 : 2, Math.round((day.mins / maxMin) * 100));
      var color = day.isToday ? '#00ff88' : (day.isFuture ? '#1a1a2e' : '#ff9f43');
      var opacity = day.isFuture ? '0.2' : '1';
      bar.style.cssText = 'width:100%;border-radius:3px 3px 0 0;background:' + color + ';opacity:' + opacity + ';height:' + pct + '%;min-height:2px;transition:height 0.3s ease;';
      barWrap.appendChild(bar);

      barsEl.appendChild(barWrap);

      // Day label
      var lbl = document.createElement('div');
      lbl.style.cssText = 'flex:1;text-align:center;font-family:"Press Start 2P",monospace;font-size:6px;color:' + (day.isToday ? '#00ff88' : '#5a5a7e') + ';';
      lbl.textContent = day.label;
      labelsEl.appendChild(lbl);
    }

    // Summary
    var hrs = Math.floor(totalMins / 60);
    var rm = totalMins % 60;
    var sumText = totalMins === 0 ? 'No focus data this week' : (hrs > 0 ? hrs + 'h ' : '') + rm + 'm total';
    if (summaryEl) summaryEl.textContent = sumText;
  }

  // Wire prev/next buttons
  (function() {
    var prev = document.getElementById('weekPrev');
    var next = document.getElementById('weekNext');
    if (prev) prev.addEventListener('click', function() {
      _weekOffset--;
      renderWeeklyFocus();
    });
    if (next) next.addEventListener('click', function() {
      if (_weekOffset < 0) {
        _weekOffset++;
        renderWeeklyFocus();
      }
    });
  })();

  // ===== Do Now System (v3.21.34) =====
  // "Do Now" lets you commit to doing a task right now with a time estimate.
  // Recurring tasks remember how long they take. Conflicts with blocked-out
  // times are detected and flagged.

  var _doNowPending = null; // { taskId, text, recurring }

  function _normalizeText(t) { return (t || '').trim().toLowerCase(); }

  function startDoNow(taskId, taskText, isRecurring) {
    _doNowPending = { taskId: taskId, text: taskText, recurring: isRecurring };
    var modal = document.getElementById('doNowModal');
    var nameEl = document.getElementById('doNowTaskName');
    var conflict = document.getElementById('doNowConflict');
    if (!modal) return;
    if (nameEl) nameEl.textContent = '\u201C' + taskText + '\u201D';
    if (conflict) conflict.style.display = 'none';

    // Check if we remember the duration for this recurring task
    var remembered = null;
    if (isRecurring && state.taskDurations) {
      remembered = state.taskDurations[_normalizeText(taskText)];
    }

    // Build duration buttons
    var btnContainer = document.getElementById('doNowDurBtns');
    if (btnContainer) {
      var durOpts = [5, 10, 15, 20, 30, 45, 60, 90, 120];
      var html = '';
      for (var i = 0; i < durOpts.length; i++) {
        var d = durOpts[i];
        var label = d < 60 ? d + 'min' : (d === 60 ? '1hr' : (d === 90 ? '1.5hr' : '2hr'));
        var isRemembered = remembered === d;
        html += '<button class="donow-dur-btn" data-dur="' + d + '" style="background:' + (isRemembered ? '#00ff88' : '#1a1a3a') + ';color:' + (isRemembered ? '#08080f' : '#00ff88') + ';border:1px solid #00ff88;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;">' + label + (isRemembered ? ' \u2605' : '') + '</button>';
      }
      btnContainer.innerHTML = html;

      var btns = btnContainer.querySelectorAll('.donow-dur-btn');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function() {
          var dur = parseInt(this.getAttribute('data-dur'), 10);
          _doNowPickedDuration(dur);
        });
      }
    }

    modal.style.display = 'flex';
  }

  function _doNowPickedDuration(durMin) {
    if (!_doNowPending) return;
    var now = Date.now();
    var endMs = now + (durMin * 60000);

    // Check for conflicts with blocked-out times + sleep block
    var conflicts = [];
    var allBlocksForConflict = (state.blockedTimes || []).slice();
    // v3.22.8: Include sleep blocks in conflict checks (today + yesterday carry-over)
    if (state.sleepTimeEnabled) {
      var _sleepDayStart = new Date(now);
      _sleepDayStart.setHours(0, 0, 0, 0);
      var _dsMsConf = _sleepDayStart.getTime();
      var _sH = (state.sleepHour != null) ? state.sleepHour : 23;
      var _sM = state.sleepMinute || 0;
      var _sPrep = state.sleepPrepMin || 0;
      var _sDur = state.sleepDurMin || 480;
      var _sleepEventMs = _dsMsConf + (_sH * 3600000) + (_sM * 60000);
      var _sleepPrepMs = _sleepEventMs - (_sPrep * 60000);
      // Today's sleep
      allBlocksForConflict.push({
        startMs: _sleepPrepMs,
        endMs: _sleepEventMs + (_sDur * 60000),
        eventStartMs: _sleepEventMs,
        prepMin: _sPrep,
        label: 'Sleep ' + _fmtTime(_sH, _sM)
      });
      // Yesterday's carry-over
      var _yEventMs = _sleepEventMs - 86400000;
      var _yEndMs = _yEventMs + (_sDur * 60000);
      if (_yEndMs > now) {
        allBlocksForConflict.push({
          startMs: _yEventMs - (_sPrep * 60000),
          endMs: _yEndMs,
          eventStartMs: _yEventMs,
          prepMin: _sPrep,
          label: 'Sleep (last night)'
        });
      }
    }
    for (var i = 0; i < allBlocksForConflict.length; i++) {
      var bt = allBlocksForConflict[i];
      if (bt.endMs <= now || bt.startMs >= endMs) continue; // no overlap
      var overlapStart = Math.max(now, bt.startMs);
      var overlapEnd = Math.min(endMs, bt.endMs);
      var overlapMin = Math.round((overlapEnd - overlapStart) / 60000);
      if (overlapMin > 0) {
        conflicts.push({ label: bt.label, overlapMin: overlapMin });
      }
    }

    if (conflicts.length > 0) {
      var conflictEl = document.getElementById('doNowConflict');
      var conflictText = document.getElementById('doNowConflictText');
      var proceedBtn = document.getElementById('doNowConflictProceed');
      if (conflictEl && conflictText) {
        var msg = '';
        for (var c = 0; c < conflicts.length; c++) {
          msg += 'Overlaps <b>' + conflicts[c].label + '</b> by <b>' + conflicts[c].overlapMin + ' min</b>.<br>';
        }
        msg += '<br>Are you sure you want to proceed?';
        conflictText.innerHTML = msg;
        conflictEl.style.display = 'block';
        if (proceedBtn) {
          proceedBtn.onclick = function() {
            _commitDoNow(durMin);
          };
        }
      }
      return;
    }

    _commitDoNow(durMin);
  }

  function _commitDoNow(durMin) {
    if (!_doNowPending) return;
    var now = Date.now();

    // Remember duration for recurring tasks
    if (_doNowPending.recurring && durMin > 0) {
      if (!state.taskDurations) state.taskDurations = {};
      state.taskDurations[_normalizeText(_doNowPending.text)] = durMin;
    }

    state.doNowTask = {
      taskId: _doNowPending.taskId,
      text: _doNowPending.text,
      startMs: now,
      durationMin: durMin,
      endMs: now + (durMin * 60000)
    };
    save();

    var modal = document.getElementById('doNowModal');
    if (modal) modal.style.display = 'none';
    _doNowPending = null;

    notify('\u26A1 DO NOW: ' + state.doNowTask.text + ' (' + durMin + 'min)', '#00ff88');
    render();
  }

  function cancelDoNow() {
    state.doNowTask = null;
    save();
    render();
  }

  function completeDoNow() {
    if (!state.doNowTask) return;
    notify('\u2705 Done: ' + state.doNowTask.text, '#00ff88');
    state.doNowTask = null;
    save();
    render();
  }

  function renderDoNowBanner() {
    var existing = document.getElementById('doNowBanner');
    if (existing) existing.remove();
    if (!state.doNowTask) return;

    var dn = state.doNowTask;
    var now = Date.now();
    var remainMs = dn.endMs - now;
    var remainMin = Math.max(0, Math.ceil(remainMs / 60000));
    var overdue = remainMs < 0;
    var overdueMin = overdue ? Math.abs(Math.floor(remainMs / 60000)) : 0;

    var banner = document.createElement('div');
    banner.id = 'doNowBanner';
    banner.style.cssText = 'background:' + (overdue ? 'linear-gradient(135deg,#3a1a1a,#2a1212)' : 'linear-gradient(135deg,#1a3a2a,#122a1a)') + ';border:1px solid ' + (overdue ? '#ff6b6b' : '#00ff88') + ';border-radius:8px;padding:8px 12px;margin:0 0 8px;display:flex;align-items:center;gap:8px;';
    banner.title = 'You committed to doing this task right now.';

    var timeText = overdue
      ? '<span style="color:#ff6b6b;">' + overdueMin + 'min OVER</span>'
      : '<span style="color:#00ff88;">' + remainMin + 'min left</span>';

    banner.innerHTML = '<span style="font-family:\'Press Start 2P\',monospace;font-size:7px;color:' + (overdue ? '#ff6b6b' : '#00ff88') + ';letter-spacing:0.5px;">\u26A1 DO NOW</span>'
      + '<span style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(dn.text) + '</span>'
      + timeText
      + ' <button class="do-now-done">\u2713 DONE</button>'
      + ' <button class="do-now-cancel">\u2717</button>';

    var timeline = document.getElementById('focusTimelinePanel');
    if (timeline && timeline.parentNode) {
      timeline.parentNode.insertBefore(banner, timeline);
    }

    banner.querySelector('.do-now-done').addEventListener('click', completeDoNow);
    banner.querySelector('.do-now-cancel').addEventListener('click', function() {
      if (confirm('Cancel this Do Now task?')) cancelDoNow();
    });
  }

  // Auto-expire do now tasks that are way past (30 min overdue)
  function checkDoNowExpiry() {
    if (!state.doNowTask) return;
    var over = Date.now() - state.doNowTask.endMs;
    if (over > 30 * 60000) {
      state.doNowTask = null;
      save();
    }
  }

  // Refresh do now banner every 30 seconds
  setInterval(function() { renderDoNowBanner(); checkDoNowExpiry(); }, 30000);

  // v3.22.90: Periodic full re-render every 60 seconds so daily priority items,
  // reminders, and time-based UI changes appear without manual page reload.
  setInterval(function() {
    try { render(); } catch(_) {}
  }, 60000);

  // Wire modal close
  (function() {
    var closeBtn = document.getElementById('doNowCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', function() {
      var modal = document.getElementById('doNowModal');
      if (modal) modal.style.display = 'none';
      _doNowPending = null;
    });
    var modal = document.getElementById('doNowModal');
    if (modal) modal.addEventListener('click', function(e) {
      if (e.target === modal) { modal.style.display = 'none'; _doNowPending = null; }
    });
  })();

  // ===== Blocked-Out Time System (v3.21.30) =====
  // Wizard steps: 1) pick hour → 2) pick minute offset → 3) prep time →
  // 4) duration → 5) optional extra minutes on 1h+ durations → done.
  // Each step has UNDO to go back.

  var _btWizard = { step: 0, hour: 0, min: 0, prepMin: 0, durMin: 0, extraMin: 0 };

  function openBlockedTimeWizard() {
    _btWizard = { step: 0, hour: 0, min: 0, prepMin: 0, durMin: 0, extraMin: 0 };
    var modal = document.getElementById('blockedTimeModal');
    if (modal) modal.style.display = 'flex';
    _renderBTStep();
  }
  function closeBlockedTimeWizard() {
    var modal = document.getElementById('blockedTimeModal');
    if (modal) modal.style.display = 'none';
  }

  function _btStepLabel() {
    var labels = ['Pick hour', 'Pick minutes past', 'Prep + travel time', 'How long is it?', 'Extra minutes?'];
    return labels[_btWizard.step] || '';
  }

  function _fmtHrFull(h) {
    h = h % 24;
    if (state.use24Hour) return (h < 10 ? '0' : '') + h + ':00';
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    return h < 12 ? h + ':00 AM' : (h - 12) + ':00 PM';
  }
  function _fmtTime(h, m) {
    h = h % 24;
    if (state.use24Hour) return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    var ampm = h < 12 ? 'AM' : 'PM';
    var dh = h % 12; if (dh === 0) dh = 12;
    return dh + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function _renderBTStep() {
    var body = document.getElementById('btWizardBody');
    var footer = document.getElementById('btStepLabel');
    var undoBtn = document.getElementById('btUndoBtn');
    if (!body) return;
    if (footer) footer.textContent = 'Step ' + (_btWizard.step + 1) + '/5 — ' + _btStepLabel();
    if (undoBtn) undoBtn.style.display = _btWizard.step > 0 ? 'inline-block' : 'none';

    var html = '';
    if (_btWizard.step === 0) {
      // Step 1: Pick hour
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:10px;">What hour does it start?</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      for (var h = 0; h < 24; h++) {
        var label = state.use24Hour ? (h < 10 ? '0' : '') + h + ':00' : _fmtHrFull(h).replace(':00 ', '').replace('AM', 'a').replace('PM', 'p');
        html += '<button class="bt-pick" data-val="' + h + '" style="background:#1a1a3a;border:1px solid #ff6b6b;color:#ff6b6b;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:6px 5px;border-radius:4px;cursor:pointer;min-width:38px;text-align:center;">' + label + '</button>';
      }
      html += '</div>';
    } else if (_btWizard.step === 1) {
      // Step 2: Minute offset
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">Starting at <span style="color:#ff6b6b;font-weight:bold;">' + _fmtHrFull(_btWizard.hour) + '</span></div>';
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:10px;">How many minutes past the hour?</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
      for (var m = 0; m < 60; m += 5) {
        var lbl = m === 0 ? ':00' : ':' + (m < 10 ? '0' : '') + m;
        html += '<button class="bt-pick" data-val="' + m + '" style="background:#1a1a3a;border:1px solid #ff6b6b;color:#ff6b6b;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;">' + lbl + '</button>';
      }
      html += '</div>';
    } else if (_btWizard.step === 2) {
      // Step 3: Prep + travel time
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">Event at <span style="color:#ff6b6b;font-weight:bold;">' + _fmtTime(_btWizard.hour, _btWizard.min) + '</span></div>';
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:10px;">How long to prepare + get there? (blocked before start)</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
      var prepOpts = [0, 5, 10, 15, 20, 30, 45, 60, 90];
      for (var p = 0; p < prepOpts.length; p++) {
        var v = prepOpts[p];
        var txt = v === 0 ? 'NONE' : v < 60 ? v + 'min' : (v / 60) + 'h';
        html += '<button class="bt-pick" data-val="' + v + '" style="background:#1a1a3a;border:1px solid #ffb64c;color:#ffb64c;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;">' + txt + '</button>';
      }
      html += '</div>';
    } else if (_btWizard.step === 3) {
      // Step 4: Duration
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">Event at <span style="color:#ff6b6b;font-weight:bold;">' + _fmtTime(_btWizard.hour, _btWizard.min) + '</span>' + (_btWizard.prepMin > 0 ? ' (prep: ' + _btWizard.prepMin + 'min before)' : '') + '</div>';
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:10px;">How long is the event itself?</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
      var durOpts = [
        { v: 5, l: '5min' }, { v: 10, l: '10min' }, { v: 15, l: '15min' },
        { v: 20, l: '20min' }, { v: 30, l: '30min' }, { v: 45, l: '45min' },
        { v: 60, l: '1hr' }, { v: 120, l: '2hr' }
      ];
      for (var d = 0; d < durOpts.length; d++) {
        html += '<button class="bt-pick" data-val="' + durOpts[d].v + '" style="background:#1a1a3a;border:1px solid #ff6b6b;color:#ff6b6b;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;">' + durOpts[d].l + '</button>';
      }
      html += '</div>';
    } else if (_btWizard.step === 4) {
      // Step 5: Extra minutes (only for 1h+ durations)
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">Duration: <span style="color:#ff6b6b;font-weight:bold;">' + _btWizard.durMin + ' min</span></div>';
      html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:10px;">Add extra minutes? (e.g. 1hr + 15min)</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
      var extraOpts = [0, 5, 10, 15, 20, 25, 30, 45];
      for (var x = 0; x < extraOpts.length; x++) {
        var ex = extraOpts[x];
        var etxt = ex === 0 ? 'SKIP' : '+' + ex + 'min';
        html += '<button class="bt-pick" data-val="' + ex + '" style="background:#1a1a3a;border:1px solid #ff6b6b;color:#ff6b6b;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;">' + etxt + '</button>';
      }
      html += '</div>';
    }
    body.innerHTML = html;

    // Wire pick buttons
    var picks = body.querySelectorAll('.bt-pick');
    for (var i = 0; i < picks.length; i++) {
      picks[i].addEventListener('click', function() {
        var val = parseInt(this.getAttribute('data-val'), 10);
        _btAdvance(val);
      });
    }
  }

  function _btAdvance(val) {
    if (_btWizard.step === 0) { _btWizard.hour = val; _btWizard.step = 1; }
    else if (_btWizard.step === 1) { _btWizard.min = val; _btWizard.step = 2; }
    else if (_btWizard.step === 2) { _btWizard.prepMin = val; _btWizard.step = 3; }
    else if (_btWizard.step === 3) {
      _btWizard.durMin = val;
      // Only show extra-minutes step for durations >= 60
      if (val >= 60) { _btWizard.step = 4; }
      else { _btWizard.extraMin = 0; _finishBlockedTime(); return; }
    }
    else if (_btWizard.step === 4) {
      _btWizard.extraMin = val;
      _finishBlockedTime();
      return;
    }
    _renderBTStep();
  }

  function _btUndo() {
    if (_btWizard.step <= 0) return;
    _btWizard.step--;
    _renderBTStep();
  }

  function _finishBlockedTime() {
    var now = new Date();
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var eventStartMs = dayStart + (_btWizard.hour * 3600000) + (_btWizard.min * 60000);
    var totalDurMin = _btWizard.durMin + _btWizard.extraMin;
    var eventEndMs = eventStartMs + (totalDurMin * 60000);
    var prepStartMs = eventStartMs - (_btWizard.prepMin * 60000);

    var block = {
      id: 'bt_' + Date.now(),
      startMs: prepStartMs,
      endMs: eventEndMs,
      eventStartMs: eventStartMs,
      prepMin: _btWizard.prepMin,
      durationMin: totalDurMin,
      label: _fmtTime(_btWizard.hour, _btWizard.min) + ' (' + totalDurMin + 'min)',
      createdAt: Date.now()
    };

    if (!state.blockedTimes) state.blockedTimes = [];
    state.blockedTimes.push(block);
    save();
    closeBlockedTimeWizard();
    renderFocusTimeline();
    notify('Blocked out ' + block.label + (_btWizard.prepMin > 0 ? ' + ' + _btWizard.prepMin + 'min prep' : ''), '#ff6b6b');
  }

  function removeBlockedTime(id) {
    if (!state.blockedTimes) return;
    state.blockedTimes = state.blockedTimes.filter(function(b) { return b.id !== id; });
    save();
    renderFocusTimeline();
  }

  // Wire wizard open/close/undo
  (function() {
    var openBtn = document.getElementById('addBlockedTimeBtn');
    if (openBtn) openBtn.addEventListener('click', function() {
      try { SFX.click && SFX.click(); } catch (_) {}
      openBlockedTimeWizard();
    });
    var closeBtn = document.getElementById('blockedTimeCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeBlockedTimeWizard);
    var modal = document.getElementById('blockedTimeModal');
    if (modal) modal.addEventListener('click', function(e) {
      if (e.target === modal) closeBlockedTimeWizard();
    });
    var undoBtn = document.getElementById('btUndoBtn');
    if (undoBtn) undoBtn.addEventListener('click', function() {
      try { SFX.click && SFX.click(); } catch (_) {}
      _btUndo();
    });
  })();

  // Render blocked-out zones on the timeline (called from renderFocusTimeline)
  function _renderBlockedZones(bar, windowStartMs, windowEndMs, windowMs) {
    var now = new Date();
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Build combined list: manual blocks + auto sleep block
    var allBlocks = (state.blockedTimes || []).slice();

    // v3.22.8: Inject sleep time as blocked period(s) — today + yesterday's carry-over
    if (state.sleepTimeEnabled) {
      var sleepH = (state.sleepHour != null) ? state.sleepHour : 23;
      var sleepM = state.sleepMinute || 0;
      var prepMin = state.sleepPrepMin || 0;
      var sleepDur = state.sleepDurMin || 480;

      // Today's sleep block (e.g. tonight at 23:00)
      var sleepStartMs = dayStart + (sleepH * 3600000) + (sleepM * 60000);
      var sleepEndMs = sleepStartMs + (sleepDur * 60000);
      var prepStartMs = sleepStartMs - (prepMin * 60000);
      allBlocks.push({
        id: '_sleep_',
        startMs: prepStartMs,
        endMs: sleepEndMs,
        eventStartMs: sleepStartMs,
        prepMin: prepMin,
        durationMin: sleepDur,
        label: 'Sleep ' + _fmtTime(sleepH, sleepM),
        isSleep: true
      });

      // Yesterday's sleep block carry-over (e.g. if bedtime 23:00 and it's 2 AM,
      // yesterday's sleep 23:00→07:00 overlaps into today)
      var yesterdaySleepStart = sleepStartMs - 86400000; // 24h earlier
      var yesterdaySleepEnd = yesterdaySleepStart + (sleepDur * 60000);
      if (yesterdaySleepEnd > dayStart) { // still overlaps into today
        var yPrepStart = yesterdaySleepStart - (prepMin * 60000);
        allBlocks.push({
          id: '_sleep_yesterday_',
          startMs: yPrepStart,
          endMs: yesterdaySleepEnd,
          eventStartMs: yesterdaySleepStart,
          prepMin: prepMin,
          durationMin: sleepDur,
          label: 'Sleep (last night)',
          isSleep: true
        });
      }
    }

    if (!allBlocks.length) return;

    for (var i = 0; i < allBlocks.length; i++) {
      var bt = allBlocks[i];
      var bStart = Math.max(bt.startMs, windowStartMs);
      var bEnd = Math.min(bt.endMs, windowEndMs);
      if (bStart >= bEnd) continue;

      var leftPct = ((bStart - windowStartMs) / windowMs) * 100;
      var widthPct = ((bEnd - bStart) / windowMs) * 100;
      if (widthPct < 0.5) widthPct = 0.5;

      var isSleep = !!bt.isSleep;
      var baseColor = isSleep ? '#6b6bff' : '#ff6b6b';
      var darkColor = isSleep ? '#4444cc' : '#cc4444';
      var prepStripe = isSleep
        ? 'repeating-linear-gradient(45deg,#6b6bff22,#6b6bff22 3px,#6b6bff44 3px,#6b6bff44 6px)'
        : 'repeating-linear-gradient(45deg,#ff6b6b22,#ff6b6b22 3px,#ff6b6b44 3px,#ff6b6b44 6px)';
      var prepBorder = isSleep ? '#6b6bff55' : '#ff6b6b55';

      // Prep zone (striped) vs event zone (solid)
      var prepEndMs = bt.eventStartMs || bt.startMs;
      var hasPrepInWindow = bt.prepMin > 0 && bt.startMs < prepEndMs && bStart < prepEndMs;

      if (hasPrepInWindow) {
        var prepStart = Math.max(bt.startMs, windowStartMs);
        var prepEnd = Math.min(prepEndMs, windowEndMs);
        if (prepStart < prepEnd) {
          var pLeft = ((prepStart - windowStartMs) / windowMs) * 100;
          var pWidth = ((prepEnd - prepStart) / windowMs) * 100;
          var prepEl = document.createElement('div');
          prepEl.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:3px;left:' + pLeft + '%;width:' + pWidth + '%;z-index:1;opacity:0.6;background:' + prepStripe + ';border:1px dashed ' + prepBorder + ';';
          prepEl.title = (isSleep ? 'Wind-down' : 'Prep/travel') + ' (' + bt.prepMin + 'min)';
          bar.appendChild(prepEl);
        }
      }

      // Event zone
      var evStart = Math.max(prepEndMs, windowStartMs);
      var evEnd = Math.min(bt.endMs, windowEndMs);
      if (evStart < evEnd) {
        var eLeft = ((evStart - windowStartMs) / windowMs) * 100;
        var eWidth = ((evEnd - evStart) / windowMs) * 100;
        var evEl = document.createElement('div');
        if (isSleep) {
          evEl.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:3px;background:linear-gradient(180deg,' + baseColor + ',' + darkColor + ');opacity:0.7;left:' + eLeft + '%;width:' + eWidth + '%;z-index:1;';
          evEl.title = bt.label + ' \u2014 click \uD83C\uDF19 to edit';
        } else {
          evEl.style.cssText = 'position:absolute;top:2px;bottom:2px;border-radius:3px;background:linear-gradient(180deg,' + baseColor + ',' + darkColor + ');opacity:0.7;left:' + eLeft + '%;width:' + eWidth + '%;z-index:1;cursor:pointer;';
          evEl.title = bt.label + ' \u2014 click to remove';
          evEl.setAttribute('data-bt-id', bt.id);
          evEl.addEventListener('click', function() {
            var bid = this.getAttribute('data-bt-id');
            if (confirm('Remove this blocked time?')) removeBlockedTime(bid);
          });
        }
        bar.appendChild(evEl);
      }

      // v3.23.6: Time labels for blocked zones
      var labelColor = isSleep ? '#6b6bff' : '#ff6b6b';
      var startLbl = _tlTimeLabel(_tlFmtMs(bt.startMs), leftPct, 'left');
      startLbl.style.color = labelColor;
      bar.appendChild(startLbl);
      var endLbl = _tlTimeLabel(_tlFmtMs(bt.endMs), leftPct + widthPct, 'right');
      endLbl.style.color = labelColor;
      bar.appendChild(endLbl);
    }
  }

  // Pre-block alert system: fires 1h15m before a blocked time
  function checkPreBlockAlerts() {
    if (!state.blockedTimes || !state.blockedTimes.length) return;
    var now = Date.now();
    var alertLeadMs = 75 * 60 * 1000; // 1 hour 15 minutes
    if (!state.blockedTimeAlerts) state.blockedTimeAlerts = {};

    for (var i = 0; i < state.blockedTimes.length; i++) {
      var bt = state.blockedTimes[i];
      var alertTime = bt.startMs - alertLeadMs;
      // Fire if we're within the alert window and haven't fired yet
      if (now >= alertTime && now < bt.startMs && !state.blockedTimeAlerts[bt.id]) {
        state.blockedTimeAlerts[bt.id] = true;
        save();
        _showPreBlockAlert(bt);
        return; // one at a time
      }
    }
  }

  // Shared visual timeline for blocked-time alerts
  function _buildBlockTimeline(bt) {
    var now = Date.now();
    var nowDate = new Date(now);
    var nowStr = _fmtTime(nowDate.getHours(), nowDate.getMinutes());
    var prepDate = new Date(bt.startMs);
    var prepStr = _fmtTime(prepDate.getHours(), prepDate.getMinutes());
    var eventDate = new Date(bt.eventStartMs || bt.startMs);
    var eventStr = _fmtTime(eventDate.getHours(), eventDate.getMinutes());
    var endDate = new Date(bt.endMs);
    var endStr = _fmtTime(endDate.getHours(), endDate.getMinutes());
    var minsUntilPrep = Math.max(0, Math.round((bt.startMs - now) / 60000));
    var minsUntilEvent = Math.max(0, Math.round(((bt.eventStartMs || bt.startMs) - now) / 60000));
    var prepMin = bt.prepMin || 0;
    var durMin = bt.durationMin || Math.round((bt.endMs - (bt.eventStartMs || bt.startMs)) / 60000);

    // Big prominent "get ready by" time
    var headline = '';
    if (prepMin > 0) {
      headline = '<div style="text-align:center;margin-bottom:12px;">'
        + '<div style="font-family:\'Press Start 2P\',monospace;font-size:7px;color:#5a5a7e;margin-bottom:4px;">MUST START GETTING READY BY</div>'
        + '<div style="font-family:\'Press Start 2P\',monospace;font-size:22px;color:#ff8c3a;text-shadow:0 0 18px rgba(255,140,58,0.6);">' + prepStr + '</div>'
        + '<div style="font-family:\'Press Start 2P\',monospace;font-size:11px;color:#ff8c3a;margin-top:4px;">' + minsUntilPrep + ' min from now</div>'
        + '</div>';
    } else {
      headline = '<div style="text-align:center;margin-bottom:12px;">'
        + '<div style="font-family:\'Press Start 2P\',monospace;font-size:7px;color:#5a5a7e;margin-bottom:4px;">COMMITMENT STARTS AT</div>'
        + '<div style="font-family:\'Press Start 2P\',monospace;font-size:22px;color:#ff8c3a;text-shadow:0 0 18px rgba(255,140,58,0.6);">' + eventStr + '</div>'
        + '<div style="font-family:\'Press Start 2P\',monospace;font-size:11px;color:#ff8c3a;margin-top:4px;">' + minsUntilEvent + ' min from now</div>'
        + '</div>';
    }

    // Visual step-by-step timeline
    var steps = '';
    var stepStyle = 'display:flex;align-items:center;gap:8px;padding:4px 0;';
    var timeStyle = 'font-family:\'Press Start 2P\',monospace;font-size:9px;min-width:65px;text-align:right;';
    var dotActive = 'width:10px;height:10px;border-radius:50%;flex-shrink:0;';
    var labelStyle = 'font-size:11px;';
    var lineStyle = 'margin-left:36px;border-left:2px dashed #3a3a5a;height:12px;';

    // NOW
    steps += '<div style="' + stepStyle + '">'
      + '<span style="' + timeStyle + 'color:#4ecdc4;">' + nowStr + '</span>'
      + '<span style="' + dotActive + 'background:#4ecdc4;box-shadow:0 0 8px rgba(78,205,196,0.5);"></span>'
      + '<span style="' + labelStyle + 'color:#4ecdc4;font-weight:bold;">NOW</span>'
      + '</div>';

    if (prepMin > 0) {
      // Line
      steps += '<div style="' + lineStyle + '"></div>';
      // GET READY
      steps += '<div style="' + stepStyle + '">'
        + '<span style="' + timeStyle + 'color:#ff8c3a;">' + prepStr + '</span>'
        + '<span style="' + dotActive + 'background:#ff8c3a;box-shadow:0 0 8px rgba(255,140,58,0.5);"></span>'
        + '<span style="' + labelStyle + 'color:#ff8c3a;font-weight:bold;">GET READY (' + prepMin + ' min prep)</span>'
        + '</div>';
    }

    // Line
    steps += '<div style="' + lineStyle + '"></div>';
    // EVENT START
    steps += '<div style="' + stepStyle + '">'
      + '<span style="' + timeStyle + 'color:#ff6b6b;">' + eventStr + '</span>'
      + '<span style="' + dotActive + 'background:#ff6b6b;"></span>'
      + '<span style="' + labelStyle + 'color:#ff6b6b;">' + (bt.label || 'Commitment') + ' starts</span>'
      + '</div>';

    // Line
    steps += '<div style="' + lineStyle + '"></div>';
    // EVENT END
    steps += '<div style="' + stepStyle + '">'
      + '<span style="' + timeStyle + 'color:#5a5a7e;">' + endStr + '</span>'
      + '<span style="' + dotActive + 'background:#5a5a7e;border:1px solid #3a3a5a;"></span>'
      + '<span style="' + labelStyle + 'color:#5a5a7e;">Ends (' + durMin + ' min)</span>'
      + '</div>';

    return headline + '<div style="background:rgba(255,140,58,0.05);border:1px solid rgba(255,140,58,0.15);border-radius:8px;padding:8px 12px;margin-bottom:8px;">' + steps + '</div>';
  }

  function _showPreBlockAlert(bt) {
    var modal = document.getElementById('preBlockAlertModal');
    var textEl = document.getElementById('preBlockAlertText');
    if (!modal || !textEl) return;

    textEl.innerHTML = _buildBlockTimeline(bt) + '<br>Not much runway left \u2014 grab a quick 10-minute sprint and knock out something that needs doing before time runs out.';
    modal.style.display = 'flex';
  }

  // Wire pre-block alert buttons
  (function() {
    var sprintBtn = document.getElementById('preBlockSprintBtn');
    var dismissBtn = document.getElementById('preBlockDismissBtn');
    var modal = document.getElementById('preBlockAlertModal');
    if (sprintBtn) sprintBtn.addEventListener('click', function() {
      if (modal) modal.style.display = 'none';
      // Set timer to 10 minutes and let user start manually
      var timerInput = document.getElementById('timerMinutes');
      if (timerInput) {
        timerInput.value = '10';
        timerInput.dispatchEvent(new Event('change'));
      }
      notify('Timer set to 10 min — hit START when ready!', '#ff8c3a');
    });
    if (dismissBtn) dismissBtn.addEventListener('click', function() {
      if (modal) modal.style.display = 'none';
    });
    if (modal) modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.style.display = 'none';
    });
  })();

  // Prune old blocked times (past end) on load
  function pruneOldBlockedTimes() {
    if (!state.blockedTimes || !state.blockedTimes.length) return;
    var now = Date.now();
    var before = state.blockedTimes.length;
    state.blockedTimes = state.blockedTimes.filter(function(bt) { return bt.endMs > now; });
    if (state.blockedTimes.length !== before) save();
  }

  // Check pre-block alerts every 60 seconds
  setInterval(checkPreBlockAlerts, 60000);
  setTimeout(function() { pruneOldBlockedTimes(); checkPreBlockAlerts(); }, 2500);

  // ============== RENDER ==============
  function render() {
    renderXP();
    renderStats();
    renderTimer();
    renderTabs();
    renderTasks();
    renderBlockProgress();
    // Milestones + canvas upgrades moved to gallery.html — they live where you spend textiles
    renderDustbin();
    renderBundles();
    renderMiniCanvas();
    renderCoins();
    renderProfileAvatar();
    renderRatiocinatoryBtn();
    renderBrokerageBtn();
    renderMarketCard();
    renderGameLockout();
    renderTodayTasks();
    renderDailyReminders();
    renderFocusTimeline();
    renderWeeklyFocus();
    renderDoNowBanner();
    refreshTrackerBriefBadge();
    attachHoverSounds();
  }

  // v3.19.17: show/hide the Ratiocinatory nav tile based on the unlock
  // flag. The button lives in popup.html as display:none; we flip it on
  // once the player has purchased the Cogitorium Annex in the factory.
  function renderRatiocinatoryBtn() {
    var btn = document.getElementById('ratiocinatoryBtn');
    if (!btn) return;
    if (state.ratiocinatoryUnlocked) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  }

  // v3.23.75: Brokerage button visibility — same pattern as ratiocinatory.
  function renderBrokerageBtn() {
    var btn = document.getElementById('brokerageBtn');
    if (!btn) return;
    if (state.brokerageUnlocked) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  }

  // v3.23.82: Market card visibility — appears once marketingLevel >= 1.
  // Also updates the live readouts (demand, cost, margin) from state.
  function renderMarketCard() {
    var card = document.getElementById('marketCard');
    if (!card) return;
    var unlocked = (state.marketingLevel || 0) >= 1;
    card.style.display = unlocked ? 'block' : 'none';
    if (!unlocked) return;

    // Sync slider to state (in case state was loaded from storage)
    var slider = document.getElementById('marketPriceSlider');
    var priceLabel = document.getElementById('marketPriceLabel');
    if (slider && state.marketPrice) {
      slider.value = state.marketPrice;
    }
    if (priceLabel) priceLabel.textContent = '$' + (state.marketPrice || 12);

    // Lock the slider while a focus session is active (running, paused, or
    // countdown). Price is locked in at session start — no mid-session changes.
    var timerActive = state.timerState === 'running' || state.timerState === 'paused' || state.timerState === 'countdown';
    if (slider) {
      slider.disabled = timerActive;
      slider.style.opacity = timerActive ? '0.4' : '1';
      slider.style.cursor = timerActive ? 'not-allowed' : 'pointer';
    }

    // Update readouts from state (populated by market tick loop)
    var demandEl = document.getElementById('marketDemandVal');
    var costEl   = document.getElementById('marketCostVal');
    var marginEl = document.getElementById('marketMarginVal');
    var yieldEl  = document.getElementById('marketYieldVal');
    var eraEl    = document.getElementById('marketEraLabel');
    var tickerEl = document.getElementById('marketEventTicker');

    if (demandEl) {
      var d = state.marketDemandPct || 50;
      demandEl.textContent = d + '%';
      demandEl.style.color = d > 60 ? '#00ff88' : d > 30 ? '#ffd700' : '#ff5555';
    }
    if (costEl && state.marketCosts) {
      costEl.textContent = '$' + (state.marketCosts.total || '10.0');
    }
    if (marginEl) {
      var m = state.marketMarginPct || 0;
      marginEl.textContent = m + '%';
      marginEl.style.color = m > 20 ? '#ffd700' : m > 0 ? '#ff9966' : '#ff5555';
    }
    // Show the most recent yield multiplier from last completed session,
    // or '? ? ?' if the player hasn't completed a focus session yet.
    if (yieldEl) {
      var lastYield = state.lastMarketYield || 0;
      if (lastYield > 0) {
        yieldEl.textContent = lastYield.toFixed(2) + 'x';
        yieldEl.style.color = lastYield >= 1.5 ? '#00ff88' : lastYield >= 1.0 ? '#ffd700' : '#ff5555';
        yieldEl.parentElement.title = 'Your most recent focus session earned a ' + lastYield.toFixed(2) + 'x market yield multiplier. This changes with market conditions each session.';
      } else {
        var lastYield = state.lastMarketYield || 0;
      if (lastYield > 0) {
        yieldEl.textContent = lastYield.toFixed(2) + 'x';
        yieldEl.style.color = lastYield >= 1.5 ? '#00ff88' : lastYield >= 1.0 ? '#ffd700' : '#ff5555';
        yieldEl.title = 'Most recent yield multiplier from your last focus session';
      } else {
        var lastYield = state.lastMarketYield || 0;
      if (lastYield > 0) {
        yieldEl.textContent = lastYield.toFixed(2) + 'x';
        yieldEl.style.color = lastYield >= 1.5 ? '#00ff88' : lastYield >= 1.0 ? '#ffd700' : '#ff5555';
        yieldEl.title = 'Most recent yield multiplier from your last focus session';
      } else {
        yieldEl.textContent = '? ? ?';
      }
      }
        yieldEl.parentElement.title = 'Complete your first focus session to reveal your yield multiplier. Market conditions determine how much bonus you earn.';
      }
    }
    // Era label — show the highest active phase name
    if (eraEl && state.marketActivePhases && state.marketActivePhases.length > 0) {
      var lastPhase = state.marketActivePhases[state.marketActivePhases.length - 1];
      eraEl.textContent = lastPhase.name || 'Cottage Industry';
    }
    // Event ticker — show if there are active shocks
    if (tickerEl) {
      if (state.marketActiveShocks && state.marketActiveShocks.length > 0) {
        var shockNames = [];
        for (var i = 0; i < state.marketActiveShocks.length; i++) {
          shockNames.push(state.marketActiveShocks[i].name);
        }
        tickerEl.textContent = shockNames.join(' | ');
        tickerEl.style.display = 'block';
      } else {
        tickerEl.style.display = 'none';
      }
    }
  }

  // v3.23.82: Market first-use explainer modal.
  // Shown once before the player's first focus session after the market unlocks.
  // Sets state.hasSeenMarketIntro = true so it never fires again.
  function showMarketIntroModal(onDismiss) {
    var existing = document.getElementById('marketIntroModal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'marketIntroModal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:300;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#0f2420;border:2px solid #00cc88;border-radius:10px;padding:20px;max-width:380px;width:90%;box-shadow:0 0 40px rgba(0,204,136,0.2);';

    box.innerHTML = '<div style="font-family:\'Press Start 2P\',monospace;font-size:11px;color:#00cc88;margin-bottom:14px;text-align:center;text-shadow:0 0 8px rgba(0,204,136,0.5);">THE TEXTILE MARKET</div>'
      + '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#7ab8a0;line-height:1.7;margin-bottom:14px;">'
      + 'Your textiles are now sold on the open market. A new card has appeared below the timer.'
      + '<br><br>'
      + '<span style="color:#ffd700;">PRICE</span> — Drag the slider to set your selling price. Higher prices mean better profit margins but less demand.'
      + '<br><br>'
      + '<span style="color:#00ff88;">DEMAND</span> — How much the market wants your goods. Driven by your price, marketing level, lobbying, and other upgrades.'
      + '<br><br>'
      + '<span style="color:#ff9966;">COST</span> — Production costs. Affected by resource reserves. Depleted resources spike costs.'
      + '<br><br>'
      + '<span style="color:#7ab8a0;">YIELD</span> — Your focus session payout is multiplied by current market conditions. <span style="color:#ffd700;">But you will not see the multiplier until the session completes.</span> Experiment with different prices and upgrades to maximize your yield.'
      + '</div>'
      + '<div style="text-align:center;">'
      + '<button id="marketIntroDismiss" style="background:#00cc88;color:#0f0f1a;border:none;border-radius:6px;padding:10px 24px;font-family:\'Press Start 2P\',monospace;font-size:9px;cursor:pointer;letter-spacing:1px;">UNDERSTOOD</button>'
      + '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('marketIntroDismiss').addEventListener('click', function() {
      overlay.remove();
      state.hasSeenMarketIntro = true;
      save();
      if (typeof onDismiss === 'function') onDismiss();
    });
  }

  // v3.21.7: Game lockout — blocks navigation to game windows (gallery,
  // factory, house, profile, ratiocinatory) when either:
  //   (a) uncompleted priority tasks exist, or
  //   (b) the focus timer is running/counting-down.
  // Task-related functions (adding/completing tasks, managing priorities)
  // remain fully accessible. Only the "fun" side of the extension is gated.
  // v3.21.10: After completing a qualifying focus session (10+ min, confirmed
  // with "Yes"), the player gets a 5-minute grace window where the timer
  // lockout is suspended so they can visit the gallery/factory/profile as
  // a reward break. The grace period bypasses ALL lockout, including priorities.
  var _gameLockGraceUntil = 0;  // ms epoch; 0 = no active grace

  function isGameLocked() {
    if (Date.now() < _gameLockGraceUntil) return false;
    var hasPriorities = getActivePriorityTasks().length > 0;
    if (hasPriorities) return true;
    var timerActive = state.timerState === 'running' || state.timerState === 'countdown';
    if (timerActive) return true;
    // v3.23.94: Idle lockout — locked unless grace period is active
    return true;
  }

  function getGameLockReason() {
    if (getActivePriorityTasks().length > 0) return 'Complete your priority tasks first.';
    if (state.timerState === 'running' || state.timerState === 'countdown') return 'Focus session in progress — finish or reset first.';
    return 'Complete a focus session to unlock.';
  }

  // Visual lockout: dims game-nav buttons and adds a lock indicator when
  // the game is locked. Called from render() every cycle.
  function renderGameLockout() {
    var locked = isGameLocked();
    var reason = locked ? getGameLockReason() : '';
    var ids = ['galleryBtn', 'factoryBtn', 'houseBtn', 'ratiocinatoryBtn', 'brokerageBtn'];
    for (var i = 0; i < ids.length; i++) {
      var btn = document.getElementById(ids[i]);
      if (!btn) continue;
      // Skip buttons that are still hidden (not unlocked yet)
      if (btn.style.display === 'none') continue;
      if (locked) {
        btn.style.opacity = '0.35';
        btn.style.filter = 'grayscale(80%)';
        btn.style.cursor = 'not-allowed';
        btn.setAttribute('data-tip', reason);
        // Block clicks but allow hover for tooltip
        if (!btn._lockHandler) {
          btn._lockHandler = function(e) { if (isGameLocked()) { e.preventDefault(); e.stopImmediatePropagation(); } };
          btn.addEventListener('click', btn._lockHandler, true);
        }
      } else {
        btn.style.opacity = '';
        btn.style.filter = '';
        btn.style.cursor = '';
        btn.removeAttribute('data-tip');
      }
    }
    // Profile is always accessible — never locked out.
    var profileEls = ['profileAvatar', 'levelProfileIcon', 'levelProfileBtn'];
    for (var j = 0; j < profileEls.length; j++) {
      var pel = document.getElementById(profileEls[j]);
      if (!pel) continue;
      pel.style.opacity = '';
      pel.style.pointerEvents = '';
      pel.style.filter = '';
    }
    // Also lock the block counter (textile counter -> gallery) and
    // coins display (coins stat -> factory) shortcuts
    var blockCounter = document.getElementById('blockCounter');
    if (blockCounter) {
      blockCounter.style.opacity = locked ? '0.35' : '';
      blockCounter.style.cursor = locked ? 'not-allowed' : '';
      if (locked) blockCounter.setAttribute('data-tip', reason);
      else blockCounter.removeAttribute('data-tip');
    }
    var coinsDisplay = document.getElementById('coinsDisplay');
    if (coinsDisplay) {
      var coinsStat = coinsDisplay.closest('.stat');
      if (coinsStat) {
        coinsStat.style.opacity = locked ? '0.35' : '';
        coinsStat.style.cursor = locked ? 'not-allowed' : '';
        if (locked) coinsStat.setAttribute('data-tip', reason);
        else coinsStat.removeAttribute('data-tip');
      }
    }
  }

  // v3.19.15: paint the stored profile-picture snapshot into the header
  // canvas, or hide it entirely if the player hasn't set one. Called from
  // render() so it stays in sync when gallery.html updates chrome.storage.
  function renderProfileAvatar() {
    var pfp = state.profilePicture;
    var targets = [
      document.getElementById('profileAvatar'),
      document.getElementById('levelProfileIcon')
    ];
    targets.forEach(function(el) {
      if (!el) return;
      if (!pfp || !pfp.pixels || !pfp.size) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'inline-block';
      if (el.width !== pfp.size) el.width = pfp.size;
      if (el.height !== pfp.size) el.height = pfp.size;
      var cx = el.getContext('2d');
      cx.clearRect(0, 0, pfp.size, pfp.size);
      cx.fillStyle = '#08080f';
      cx.fillRect(0, 0, pfp.size, pfp.size);
      Object.keys(pfp.pixels).forEach(function(key) {
        var parts = key.split(',');
        cx.fillStyle = pfp.pixels[key];
        cx.fillRect(parseInt(parts[0], 10), parseInt(parts[1], 10), 1, 1);
      });
    });
  }

  function renderXP() {
    const info = getLevelFromXP(state.xp);
    const title = getLevelTitle(info.level);
    const pct = info.nextLevelXP > 0 ? (info.currentXP / info.nextLevelXP) * 100 : 100;

    $('levelDisplay').textContent = info.level;
    $('levelTitle').textContent = title;
    $('xpBarFill').style.width = pct + '%';
    $('xpText').textContent = `${info.currentXP} / ${info.nextLevelXP} XP`;

    // Combo display
    const comboEl = $('comboDisplay');
    if (state.combo >= 2) {
      comboEl.style.display = 'flex';
      $('comboCount').textContent = state.combo;
      $('comboMultiplier').textContent = getComboMultiplier(state.combo).toFixed(1) + 'x';
      // Animate combo fire
      comboEl.classList.toggle('hot', state.combo >= 4);
      comboEl.classList.toggle('fire', state.combo >= 5);
    } else {
      comboEl.style.display = 'none';
    }

    // Next XP preview
    const nextXP = calculateXPGain(state.combo + (state.timerState === 'running' ? 1 : 0), state.streak);
    $('nextXPPreview').textContent = state.timerState === 'running' ? `+${nextXP} XP on completion` : `Next textile: +${nextXP} XP`;

    // Streak bonus display
    const streakPct = Math.round((getStreakBonus(state.streak) - 1) * 100);
    $('streakBonus').textContent = streakPct > 0 ? `+${streakPct}%` : '';
  }

  function renderStats() {
    $('todayBlocks').textContent = state.todayBlocks;
    $('lifetimeBlocks').textContent = state.totalLifetimeBlocks;
    $('streakCount').textContent = state.streak;
    blockCountDisplay.textContent = state.blocks;

    const hrs = Math.floor((state.totalLifetimeBlocks * 10) / 60);
    const mins = (state.totalLifetimeBlocks * 10) % 60;
    $('lifetimeTime').textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    $('todayXPDisplay').textContent = state.todayXP;

    // Today's focus time banner (v3.21.33)
    var todayFocusEl = $('todayFocusTime');
    if (todayFocusEl) {
      var _today = todayStr();
      var _sessions = (state.dailySessionLog && state.dailySessionLog.date === _today)
        ? (state.dailySessionLog.sessions || []) : [];
      var _tMin = 0;
      for (var _si = 0; _si < _sessions.length; _si++) _tMin += (_sessions[_si].min || 0);
      var _tH = Math.floor(_tMin / 60);
      var _tM = _tMin % 60;
      todayFocusEl.textContent = _tH > 0 ? _tH + 'h ' + _tM + 'm' : _tM + 'm';
    }
  }

  // ============== SESSION DURATION PICKER ==============
  // Attempting longer sessions: 10/30/60 min. Each 10-min block in the session
  // earns 1 textile (calls earnBlock() N times so combo + quality control still
  // apply). 30 and 60 min runs get an extra commitment-bonus textile on top:
  // 30 min => 3 + 1 bonus; 60 min => 6 + 3 bonus. The picker is disabled while
  // the timer is running or paused so you can't swap mid-run.
  function renderSessionPicker() {
    var picker = document.getElementById('sessionPicker');
    if (!picker) return;
    var pills = picker.querySelectorAll('.session-pill');
    var locked = state.timerState === 'running' || state.timerState === 'paused' || state.timerState === 'completed' || state.timerState === 'countdown';
    for (var i = 0; i < pills.length; i++) {
      var p = pills[i];
      var dur = parseInt(p.getAttribute('data-dur'), 10);
      p.classList.toggle('active', dur === (state.sessionDurationSec || 600));
      p.classList.toggle('locked', locked);
    }
  }

  function setSessionDuration(sec) {
    if (state.timerState === 'running' || state.timerState === 'paused' || state.timerState === 'completed' || state.timerState === 'countdown') {
      notify('Finish or reset the current session first.', 'var(--warning)');
      return;
    }
    sec = parseInt(sec, 10);
    if (![600, 1200, 1800, 3600, 5400].includes(sec)) return;
    state.sessionDurationSec = sec;
    state.timerRemaining = sec;
    _tlPreviewDurationSec = sec; // v3.23.6: show preview on timeline
    save();
    renderTimer();
    renderFocusTimeline(); // v3.23.6: update preview
    try {
      if (typeof MsgLog !== 'undefined') {
        var label = (sec / 60) + '-minute';
        MsgLog.push('Loom set to ' + label + ' session. Shuttle standing by.');
      }
    } catch (_) {}
  }

  function renderTimer() {
    const dur = state.sessionDurationSec || 600;

    // During the pre-start countdown, the display shows the grace-period
    // seconds ticking down ("GET READY 00:15" -> "00:01") instead of the
    // real session length. The real session length re-appears the moment
    // we transition into 'running'.
    if (state.timerState === 'countdown') {
      const cs = Math.max(0, countdownRemaining);
      timerDisplay.textContent = `00:${String(cs).padStart(2, '0')}`;
      timerDisplay.classList.remove('running');
      if (progressFill) progressFill.style.width = '0%';
      startBtn.textContent = 'CANCEL';
      resetBtn.style.display = 'inline-block';
    } else {
      const mins = Math.floor(state.timerRemaining / 60);
      const secs = state.timerRemaining % 60;
      timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const pct = ((dur - state.timerRemaining) / dur) * 100;
      if (progressFill) progressFill.style.width = pct + '%';

      if (state.timerState === 'running') {
        timerDisplay.classList.add('running');
        startBtn.textContent = 'PAUSE';
        resetBtn.style.display = 'inline-block';
      } else if (state.timerState === 'paused') {
        timerDisplay.classList.remove('running');
        startBtn.textContent = 'RESUME';
        resetBtn.style.display = 'inline-block';
      } else {
        timerDisplay.classList.remove('running');
        startBtn.textContent = 'START';
        resetBtn.style.display = state.timerRemaining < dur ? 'inline-block' : 'none';
      }
    }

    // "GET READY" label above the clock during the grace period. Reuse
    // the current task label slot — the task text comes back the instant
    // the real session starts.
    if (state.timerState === 'countdown' && currentTaskLabel) {
      currentTaskLabel.textContent = 'GET READY \u2014 session starts in a moment\u2026';
      currentTaskLabel.style.color = 'var(--accent3)';
      // Update session picker + return early so the idle/running branch
      // below doesn't overwrite the GET READY label.
      renderSessionPicker();
      try { renderPopOutTimer(); } catch (_) {}
      return;
    }
    // Update session picker active pill + lock state
    renderSessionPicker();
    try { renderPopOutTimer(); } catch (_) {}

    // v3.21.51: Show/hide idle challenge banner
    var challengeBanner = document.getElementById('challengeBanner');
    if (challengeBanner) {
      if (state.challengeActive && !state.challengeSessionPaused) {
        challengeBanner.style.display = 'block';
        challengeBanner.innerHTML = state.timerState === 'running'
          ? '&#9876; IDLE CHALLENGE &#8212; NO PAUSING! 1.5x REWARDS &#9876;'
          : '&#9876; IDLE CHALLENGE ACTIVE &#8212; 1.5x REWARDS &#9876;';
      } else if (state.challengeActive && state.challengeSessionPaused) {
        challengeBanner.style.display = 'block';
        challengeBanner.style.borderColor = '#ff6b6b';
        challengeBanner.style.color = '#ff6b6b';
        challengeBanner.innerHTML = '&#9876; CHALLENGE VOIDED &#8212; YOU PAUSED &#9876;';
      } else {
        challengeBanner.style.display = 'none';
        challengeBanner.style.borderColor = '#ff8c3a';
        challengeBanner.style.color = '#ffd700';
      }
    }

    if (state.selectedTaskId) {
      const task = findTask(state.selectedTaskId);
      currentTaskLabel.textContent = task ? `Focusing: ${task.text}` : 'Select a task to focus on';
      currentTaskLabel.style.color = 'var(--accent3)';
    } else {
      currentTaskLabel.textContent = 'Select a task to focus on';
      currentTaskLabel.style.color = 'var(--text-dim)';
    }
  }

  // ============== PROJECT TABS (inline + overflow dropdown) ==============
  // Render every project tab inline. After layout, hide any tab that doesn't
  // fit, and expose the overflow via the dropdown menu. The active tab is
  // always kept visible, even if that means hiding earlier tabs to make room.
  function renderTabs() {
    var wrap = document.getElementById('tabActiveWrap');
    var menu = document.getElementById('tabsDropdownMenu');
    var menuBtn = document.getElementById('tabMenuBtn');
    var menuCount = document.getElementById('tabMenuCount');
    if (!wrap || !menu || !menuBtn) return;

    var projects = projectsInDisplayOrder();
    var activeId = state.activeProject;
    var active = projects.find(function(p) { return p.id === activeId; }) || projects[0];
    if (!active) { wrap.innerHTML = ''; menu.innerHTML = ''; return; }

    wrap.innerHTML = '';

    // ---- Always-visible ALL tab (leftmost, never overflows) ----
    // A pseudo-project. Shows the combined count of open tasks across every
    // real project. Clicking it sets state.activeProject to the sentinel and
    // renderTasks flattens the task list. This tab is inserted first and is
    // exempt from the overflow hide pass so the player can always jump back
    // to the combined view without opening the dropdown.
    (function buildAllTab() {
      var totalOpen = 0;
      var totalStale = 0;
      projects.forEach(function(p) {
        var arr = state.tasks[p.id] || [];
        totalOpen += arr.filter(function(t) { return !t.completed; }).length;
        totalStale += arr.filter(function(t) { return isTaskStale(t); }).length;
      });
      var isAllActive = activeId === ALL_PROJECT_ID;

      var allEl = document.createElement('div');
      allEl.className = 'tab' + (isAllActive ? ' active' : '');
      allEl.setAttribute('data-project-id', ALL_PROJECT_ID);
      allEl.title = (isAllActive ? '[active] ' : '') + 'ALL \u2014 every open task from every project in one list. ' + totalOpen + ' open task' + (totalOpen === 1 ? '' : 's') + ' across ' + projects.length + ' project' + (projects.length === 1 ? '' : 's') + (totalStale > 0 ? ' (' + totalStale + ' aging)' : '') + '.';

      var allName = document.createElement('span');
      allName.className = 'tab-name';
      allName.textContent = 'ALL';
      allEl.appendChild(allName);

      var allCount = document.createElement('span');
      allCount.className = 'task-count';
      allCount.textContent = totalOpen;
      allCount.title = totalOpen + ' total open task' + (totalOpen === 1 ? '' : 's') + ' across every project.';
      allEl.appendChild(allCount);

      if (totalStale > 0) {
        var allStale = document.createElement('span');
        allStale.className = 'tab-stale-mark';
        allStale.textContent = '!';
        allStale.title = totalStale + ' aging task' + (totalStale === 1 ? '' : 's') + ' across all projects.';
        allEl.appendChild(allStale);
      }

      if (!isAllActive) {
        allEl.style.cursor = 'pointer';
        allEl.addEventListener('click', function() {
          SFX.tabSwitch();
          state.activeProject = ALL_PROJECT_ID;
          save(); render();
        });
      }

      wrap.appendChild(allEl);
    })();

    // ---- Build one tab element per project (all initially inserted inline) ----
    // NOTE: `projects` here is the SHUFFLED display order from
    // projectsInDisplayOrder(), not state.projects. The shuffle was decided
    // once on window load (init -> buildShuffledTabOrder) so the tab bar shows
    // a different rotating subset each time the user reopens PixelFocus. Within
    // a session the order stays stable so tabs don't jump while you work.
    var tabEls = []; // parallel array to projects, each entry is { project, el }
    projects.forEach(function(p) {
      var tasks = state.tasks[p.id] || [];
      var openCount = tasks.filter(function(t) { return !t.completed; }).length;
      var staleCount = tasks.filter(function(t) { return isTaskStale(t); }).length;
      var isActive = p.id === activeId;

      var el = document.createElement('div');
      el.className = 'tab' + (isActive ? ' active' : '');
      el.setAttribute('data-project-id', p.id);
      el.title = (isActive ? '[active] ' : '') + p.name + ' \u2014 ' + openCount + ' open task' + (openCount === 1 ? '' : 's') + (staleCount > 0 ? ' (' + staleCount + ' aging)' : '') + (isActive ? '. Click the pencil to rename/delete.' : '. Click to switch to this project.');

      var nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.textContent = p.name;
      el.appendChild(nameSpan);

      var countSpan = document.createElement('span');
      countSpan.className = 'task-count';
      countSpan.textContent = openCount;
      countSpan.title = openCount + ' open task' + (openCount === 1 ? '' : 's') + ' in ' + p.name;
      el.appendChild(countSpan);

      if (staleCount > 0) {
        var staleMark = document.createElement('span');
        staleMark.className = 'tab-stale-mark';
        staleMark.textContent = '!';
        staleMark.title = staleCount + ' aging task' + (staleCount === 1 ? '' : 's') + ' in this project \u2014 untouched for 4+ hours.';
        el.appendChild(staleMark);
      }

      // Pencil edit button only on the active tab (keeps inactive tabs compact)
      if (isActive) {
        var editBtn = document.createElement('span');
        editBtn.className = 'tab-edit';
        editBtn.textContent = '\u270e';
        editBtn.title = 'Rename or delete this project.';
        editBtn.addEventListener('click', function(e) { e.stopPropagation(); openEditProjectModal(p.id); });
        el.appendChild(editBtn);
      }

      // Clicking a non-active tab switches to that project
      if (!isActive) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function() {
          SFX.tabSwitch();
          state.activeProject = p.id;
          state.lastRealProject = p.id;
          save(); render();
        });
      }

      wrap.appendChild(el);
      tabEls.push({ project: p, el: el, isActive: isActive });
    });

    // ---- Overflow pass: hide tabs that don't fit, move them to dropdown ----
    // We need to do this after the tabs are in the DOM so we can measure.
    // Use a microtask so layout is up-to-date; but most of the time we can
    // measure synchronously since wrap already has its width.
    function runOverflow() {
      var wrapWidth = wrap.clientWidth;
      if (wrapWidth <= 0) {
        // wrap isn't laid out yet (popup just opened) — retry next frame
        requestAnimationFrame(runOverflow);
        return;
      }

      // Reset: show all, then walk left-to-right tallying widths.
      tabEls.forEach(function(t) { t.el.classList.remove('overflow-hidden'); });

      // Snapshot each tab's natural width so we can plan the fit.
      var widths = tabEls.map(function(t) { return t.el.offsetWidth; });

      // The ALL pseudo-tab sits at the very start of wrap and is always
      // visible (never overflowed), so its width is already consumed before
      // any project tabs are counted. Reserve it up front.
      var allTabEl = wrap.querySelector('.tab[data-project-id="' + ALL_PROJECT_ID + '"]');
      var reserved = allTabEl ? allTabEl.offsetWidth : 0;

      // Walk left to right, adding widths. Anything beyond wrapWidth overflows.
      var used = reserved;
      var hiddenIdx = [];
      for (var i = 0; i < tabEls.length; i++) {
        if (used + widths[i] <= wrapWidth) {
          used += widths[i];
        } else {
          hiddenIdx.push(i);
          tabEls[i].el.classList.add('overflow-hidden');
        }
      }

      // If the active tab is among the hidden, force it visible by hiding
      // the rightmost currently-visible tab instead, until active fits.
      var activeIdx = -1;
      for (var j = 0; j < tabEls.length; j++) {
        if (tabEls[j].isActive) { activeIdx = j; break; }
      }
      if (activeIdx !== -1 && tabEls[activeIdx].el.classList.contains('overflow-hidden')) {
        // Un-hide active, then re-hide enough visible tabs (from the right)
        // to free up the width it needs.
        tabEls[activeIdx].el.classList.remove('overflow-hidden');
        var needed = widths[activeIdx];
        // walk visible tabs from the right (excluding active itself)
        for (var k = tabEls.length - 1; k >= 0 && needed > 0; k--) {
          if (k === activeIdx) continue;
          if (tabEls[k].el.classList.contains('overflow-hidden')) continue;
          tabEls[k].el.classList.add('overflow-hidden');
          needed -= widths[k];
        }
      }

      // Recompute final hidden set and populate the dropdown accordingly.
      var hiddenProjects = tabEls
        .filter(function(t) { return t.el.classList.contains('overflow-hidden'); })
        .map(function(t) { return t.project; });

      populateDropdown(hiddenProjects);
    }

    // ---- Dropdown menu population ----
    function populateDropdown(hiddenProjects) {
      menu.innerHTML = '';
      // Always include ALL projects in the dropdown (so the user can jump to
      // any of them from one place), but mark the hidden ones and show them
      // first so overflow is obvious.
      var ordered = hiddenProjects.slice();
      projects.forEach(function(p) {
        if (hiddenProjects.indexOf(p) === -1) ordered.push(p);
      });

      ordered.forEach(function(p) {
        var isHidden = hiddenProjects.indexOf(p) !== -1;
        var row = document.createElement('div');
        row.className = 'tabs-dropdown-item' + (p.id === activeId ? ' active' : '') + (isHidden ? ' hidden-tab' : '');
        var tasks = state.tasks[p.id] || [];
        var openCount = tasks.filter(function(t) { return !t.completed; }).length;
        var staleCount = tasks.filter(function(t) { return isTaskStale(t); }).length;
        row.title = p.name + ' \u2014 ' + openCount + ' open task' + (openCount === 1 ? '' : 's') + (staleCount > 0 ? ', ' + staleCount + ' aging (4h+ untouched)' : '') + (p.id === activeId ? ' (currently active)' : '') + (isHidden ? ' (not visible in tab bar)' : '') + '. Click to switch.';
        var nm = document.createElement('span');
        nm.className = 'dd-name';
        nm.textContent = (p.id === activeId ? '\u2713 ' : '') + p.name;
        row.appendChild(nm);
        if (staleCount > 0) {
          var st = document.createElement('span');
          st.className = 'dd-stale';
          st.textContent = '!' + staleCount;
          st.title = staleCount + ' aging task' + (staleCount === 1 ? '' : 's');
          row.appendChild(st);
        }
        var cnt = document.createElement('span');
        cnt.className = 'dd-count';
        cnt.textContent = openCount;
        row.appendChild(cnt);
        row.addEventListener('click', function(e) {
          e.stopPropagation();
          SFX.tabSwitch();
          state.activeProject = p.id;
          state.lastRealProject = p.id;
          closeTabsDropdown();
          save(); render();
        });
        menu.appendChild(row);
      });

      // Menu count shows the number of OVERFLOWING projects (or total if 0)
      if (menuCount) {
        menuCount.textContent = hiddenProjects.length > 0 ? ('+' + hiddenProjects.length) : '';
      }
      if (hiddenProjects.length > 0) {
        menuBtn.title = hiddenProjects.length + ' project' + (hiddenProjects.length === 1 ? '' : 's') + ' overflowed the tab bar. Click to see all ' + projects.length + ' projects and jump to any of them.';
      } else {
        menuBtn.title = 'Show all ' + projects.length + ' project' + (projects.length === 1 ? '' : 's') + '. Jump directly to any of them.';
      }
    }

    // Kick off the overflow pass. Run now AND again on next frame in case
    // the popup is still laying out.
    runOverflow();
    requestAnimationFrame(runOverflow);
  }

  function openTabsDropdown() {
    var dd = document.getElementById('tabsDropdown');
    var btn = document.getElementById('tabMenuBtn');
    if (dd) dd.classList.add('open');
    if (btn) btn.classList.add('open');
  }
  function closeTabsDropdown() {
    var dd = document.getElementById('tabsDropdown');
    var btn = document.getElementById('tabMenuBtn');
    if (dd) dd.classList.remove('open');
    if (btn) btn.classList.remove('open');
  }
  function toggleTabsDropdown() {
    var dd = document.getElementById('tabsDropdown');
    if (!dd) return;
    if (dd.classList.contains('open')) closeTabsDropdown();
    else openTabsDropdown();
  }

  // ============== STALE TASK NOTIFIER ==============
  // Walks all projects, finds newly-stale tasks (>4h untouched, no blocks earned)
  // and pushes a one-time notification to the MsgLog per task. Re-run every
  // minute so newly-aging tasks surface without requiring a refresh.
  function checkStaleTasks() {
    if (!state.staleNotified) state.staleNotified = {};
    var changed = false;
    var now = Date.now();
    Object.keys(state.tasks || {}).forEach(function(pid) {
      var proj = (state.projects || []).find(function(p) { return p.id === pid; });
      var projName = proj ? proj.name : pid;
      (state.tasks[pid] || []).forEach(function(t) {
        if (!isTaskStale(t)) return;
        if (state.staleNotified[t.id]) return; // already flagged
        state.staleNotified[t.id] = now;
        changed = true;
        var age = formatStaleAge(t);
        var short = (t.text || '').slice(0, 40) + ((t.text || '').length > 40 ? '\u2026' : '');
        try {
          if (typeof MsgLog !== 'undefined') {
            MsgLog.push('Task aging: "' + short + '" (' + projName + ') \u2014 untouched for ' + age + '. The bobbin collects dust.');
          }
        } catch (_) {}
        notify('Aging task: ' + short + ' (' + age + ')', '#ffb43c');
      });
    });
    // Clean up staleNotified entries for tasks that no longer exist
    var alive = {};
    Object.keys(state.tasks || {}).forEach(function(pid) {
      (state.tasks[pid] || []).forEach(function(t) { alive[t.id] = true; });
    });
    Object.keys(state.staleNotified).forEach(function(id) {
      if (!alive[id]) { delete state.staleNotified[id]; changed = true; }
    });
    if (changed) save();
    // Re-render so newly aged tasks get the visual badge
    try { renderTasks(); renderTabs(); } catch (_) {}
  }

  // A task is "stale" if it's been sitting uncompleted and untouched (no
  // textiles earned on it) for 4+ hours since it was added. The threshold is
  // independent of the focus timer — the clock starts the moment the task is
  // added via addTask().
  var STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000;
  function isTaskStale(task) {
    if (!task || task.completed) return false;
    if (task.blocksEarned && task.blocksEarned > 0) return false; // you've already worked on it
    var added = task.createdAt || 0;
    if (!added) return false;
    return (Date.now() - added) >= STALE_THRESHOLD_MS;
  }
  function formatStaleAge(task) {
    var ageMs = Date.now() - (task.createdAt || Date.now());
    var hrs = Math.floor(ageMs / 3600000);
    if (hrs >= 24) {
      var days = Math.floor(hrs / 24);
      return days + 'd';
    }
    return hrs + 'h';
  }

  // ============== ANCIENT TASK PURGE ==============
  // A task is "ancient" if it's been sitting uncompleted and untouched (no
  // textiles earned) for 2+ days since it was added. At that point we ask
  // the user whether they want to bulk-delete all ancient tasks across every
  // project in one sweep. If they decline, we back off for 12 hours before
  // asking again so the prompt doesn't become annoying.
  var ANCIENT_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
  var ANCIENT_DISMISS_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
  function isTaskAncient(task) {
    if (!task || task.completed) return false;
    if (task.blocksEarned && task.blocksEarned > 0) return false;
    var added = task.createdAt || 0;
    if (!added) return false;
    return (Date.now() - added) >= ANCIENT_THRESHOLD_MS;
  }
  // Walks every project and returns a flat list of { projectId, projectName, task }
  // for all ancient tasks, sorted oldest first.
  function findAncientTasks() {
    var out = [];
    var projects = state.projects || [];
    Object.keys(state.tasks || {}).forEach(function(pid) {
      var proj = projects.find(function(p) { return p.id === pid; });
      var pname = proj ? proj.name : pid;
      (state.tasks[pid] || []).forEach(function(t) {
        if (isTaskAncient(t)) {
          out.push({ projectId: pid, projectName: pname, task: t });
        }
      });
    });
    out.sort(function(a, b) { return (a.task.createdAt || 0) - (b.task.createdAt || 0); });
    return out;
  }

  // Opens the ancient-purge modal IF there are any ancient tasks AND the user
  // hasn't recently dismissed the prompt. No-op otherwise.
  var ancientPurgeCurrentList = null;
  function checkAncientTasks() {
    try {
      var now = Date.now();
      var dismissedAt = state.ancientPurgeDismissedAt || 0;
      if (now - dismissedAt < ANCIENT_DISMISS_COOLDOWN_MS) return; // still in cooldown
      var list = findAncientTasks();
      if (list.length === 0) return;
      // Don't stomp on another modal that's already open
      var focusOpen = document.getElementById('focusConfirmModal');
      if (focusOpen && focusOpen.style.display === 'flex') return;
      var editOpen = document.getElementById('editProjectModal');
      if (editOpen && editOpen.style.display === 'flex') return;
      openAncientPurgeModal(list);
    } catch (e) { console.error('checkAncientTasks error', e); }
  }

  function openAncientPurgeModal(list) {
    var modal = document.getElementById('ancientPurgeModal');
    var listEl = document.getElementById('ancientPurgeList');
    var sub = document.getElementById('ancientPurgeSub');
    var keepBtn = document.getElementById('ancientKeepBtn');
    var deleteBtn = document.getElementById('ancientDeleteBtn');
    var moveBtn = document.getElementById('ancientMoveToPriorityBtn');
    if (!modal || !listEl || !keepBtn || !deleteBtn) return;

    ancientPurgeCurrentList = list;

    if (sub) {
      sub.textContent = list.length + ' task' + (list.length === 1 ? ' has' : 's have') +
        ' been untouched for 2+ days with no focus time logged. Uncheck any you want to keep, then DELETE SELECTED.';
    }

    // Per-row selection state. Keyed by task.id; every task starts selected
    // (checked) so the default behaviour matches the old "delete all" flow —
    // one click of DELETE SELECTED removes everything, same as before.
    var selected = {};
    list.forEach(function(entry) { selected[entry.task.id] = true; });

    // Forward declarations so handlers can reference each other.
    var freshDelete, freshKeep, freshMove, updateDeleteBtn, headerCheckbox;

    // Build the list of ancient tasks
    listEl.innerHTML = '';

    // Header row: select / deselect all toggle.
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 4px 8px 4px;border-bottom:1px solid var(--border);margin-bottom:4px;';
    headerCheckbox = document.createElement('input');
    headerCheckbox.type = 'checkbox';
    headerCheckbox.checked = true;
    headerCheckbox.style.cssText = 'cursor:pointer;accent-color:#ffb43c;flex-shrink:0;';
    headerCheckbox.title = 'Toggle all. Check to select every task; uncheck to clear every task.';
    var headerLabel = document.createElement('div');
    headerLabel.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:8px;color:var(--text-dim);';
    headerLabel.textContent = 'SELECT ALL';
    header.appendChild(headerCheckbox);
    header.appendChild(headerLabel);
    listEl.appendChild(header);

    // Rebind label click to toggle too — easier target.
    headerLabel.style.cursor = 'pointer';
    headerLabel.addEventListener('click', function() {
      headerCheckbox.checked = !headerCheckbox.checked;
      headerCheckbox.dispatchEvent(new Event('change'));
    });

    // Track every row checkbox so the header can set them all at once.
    var rowCheckboxes = [];

    list.forEach(function(entry) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);cursor:pointer;';
      row.title = 'Click anywhere on this row to toggle whether it will be deleted.';

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.style.cssText = 'margin-top:3px;cursor:pointer;accent-color:#ffb43c;flex-shrink:0;';
      cb.title = 'Checked = this task will be deleted. Uncheck to keep it.';
      rowCheckboxes.push(cb);

      var left = document.createElement('div');
      left.style.cssText = 'flex:1;min-width:0;';
      var text = document.createElement('div');
      text.style.cssText = 'font-size:11px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      text.textContent = entry.task.text || '(untitled task)';
      text.title = entry.task.text || '(untitled task)';
      var meta = document.createElement('div');
      meta.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:7px;color:var(--text-dim);margin-top:2px;';
      meta.textContent = entry.projectName + ' \u00b7 ' + formatStaleAge(entry.task) + ' old';
      meta.title = 'Project: ' + entry.projectName + '. Added ' + formatStaleAge(entry.task) + ' ago with no focus time logged.';
      left.appendChild(text);
      left.appendChild(meta);

      var age = document.createElement('span');
      age.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:7px;padding:2px 5px;border-radius:3px;background:rgba(255,180,60,0.18);border:1px solid #c68a1e;color:#ffb43c;flex-shrink:0;white-space:nowrap;align-self:flex-start;margin-top:2px;';
      age.textContent = formatStaleAge(entry.task);
      age.title = 'Abandoned for ' + formatStaleAge(entry.task) + '.';

      row.appendChild(cb);
      row.appendChild(left);
      row.appendChild(age);

      // Clicking anywhere on the row (outside the checkbox itself) toggles
      // the checkbox. Keeps the touch target generous.
      row.addEventListener('click', function(e) {
        if (e.target === cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });

      cb.addEventListener('change', function() {
        selected[entry.task.id] = !!cb.checked;
        // Sync header checkbox to reflect overall state.
        var total = rowCheckboxes.length;
        var on = rowCheckboxes.filter(function(x) { return x.checked; }).length;
        headerCheckbox.checked = (on === total);
        headerCheckbox.indeterminate = (on > 0 && on < total);
        if (typeof updateDeleteBtn === 'function') updateDeleteBtn();
      });

      listEl.appendChild(row);
    });

    headerCheckbox.addEventListener('change', function() {
      var on = !!headerCheckbox.checked;
      headerCheckbox.indeterminate = false;
      rowCheckboxes.forEach(function(cb) {
        if (cb.checked !== on) {
          cb.checked = on;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });

    // Wire buttons — replaceWith clones to clear any old listeners
    freshKeep = keepBtn.cloneNode(true);
    keepBtn.parentNode.replaceChild(freshKeep, keepBtn);
    freshDelete = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(freshDelete, deleteBtn);
    if (moveBtn) {
      freshMove = moveBtn.cloneNode(true);
      moveBtn.parentNode.replaceChild(freshMove, moveBtn);
    }

    // Button label reflects the current selection count so the user
    // knows exactly how many will be deleted.
    updateDeleteBtn = function() {
      var count = rowCheckboxes.filter(function(cb) { return cb.checked; }).length;
      if (count === 0) {
        freshDelete.textContent = 'DELETE NONE';
        freshDelete.disabled = true;
        freshDelete.style.opacity = '0.45';
        freshDelete.style.cursor = 'not-allowed';
        freshDelete.title = 'Nothing selected. Tick at least one task, or press KEEP THEM.';
        if (freshMove) {
          freshMove.textContent = 'MOVE TO PRIORITY';
          freshMove.disabled = true;
          freshMove.style.opacity = '0.45';
          freshMove.style.cursor = 'not-allowed';
          freshMove.title = 'Nothing selected. Tick at least one task to move it to the HIGH PRIORITY list.';
        }
      } else {
        freshDelete.textContent = 'DELETE ' + count;
        freshDelete.disabled = false;
        freshDelete.style.opacity = '';
        freshDelete.style.cursor = '';
        freshDelete.title = 'Permanently delete the ' + count + ' ticked task' + (count === 1 ? '' : 's') + '. This cannot be undone.';
        if (freshMove) {
          freshMove.textContent = 'PROMOTE ' + count;
          freshMove.disabled = false;
          freshMove.style.opacity = '';
          freshMove.style.cursor = '';
          freshMove.title = 'Move the ' + count + ' ticked task' + (count === 1 ? '' : 's') + ' to the HIGH PRIORITY list. They\u2019ll be removed from their current project and surface next time the popup opens.';
        }
      }
    };
    updateDeleteBtn();

    freshKeep.addEventListener('click', function() {
      closeAncientPurgeModal();
      state.ancientPurgeDismissedAt = Date.now();
      save();
      try {
        if (typeof MsgLog !== 'undefined') {
          MsgLog.push('Abandoned task purge deferred. The bobbins stay on the shelf for now.');
        }
      } catch (_) {}
    });

    if (freshMove) {
      freshMove.addEventListener('click', function() {
        if (freshMove.disabled) return;
        var toMove = (ancientPurgeCurrentList || []).filter(function(entry) {
          return selected[entry.task.id];
        });
        if (toMove.length === 0) return;
        var kept = (ancientPurgeCurrentList || []).length - toMove.length;
        // Seed priority list if missing so push() is safe.
        if (!Array.isArray(state.priorityTasks)) state.priorityTasks = [];
        var promoted = 0;
        var now = Date.now();
        toMove.forEach(function(entry) {
          var text = (entry.task && entry.task.text) ? String(entry.task.text).trim() : '';
          if (!text) return;
          state.priorityTasks.push({
            id: 'p' + now + '-' + promoted + '-' + Math.random().toString(36).slice(2, 7),
            text: text,
            createdAt: now,
            completed: false,
            completedAt: 0,
            recurrence: null,
            recurWeekdays: [],
            recurInterval: 0,
            lastCompletedDate: '',
            promotedFrom: entry.projectName || ''
          });
          promoted++;
        });
        // Pull the moved tasks out of their source projects so they don't
        // linger as regular tasks and get re-flagged as abandoned tomorrow.
        purgeAncientTasks(toMove);
        closeAncientPurgeModal();
        // If the user chose to keep some, treat it like a partial dismissal.
        state.ancientPurgeDismissedAt = (kept > 0) ? Date.now() : 0;
        save();
        try { renderPriorities && renderPriorities(); } catch (_) {}
        try { render(); } catch (_) {}
        notify(promoted + ' task' + (promoted === 1 ? '' : 's') + ' promoted to HIGH PRIORITY.', '#ffb43c');
        try {
          if (typeof MsgLog !== 'undefined') {
            var msg = 'Promoted ' + promoted + ' abandoned task' + (promoted === 1 ? '' : 's') + ' to the HIGH PRIORITY shelf.';
            if (kept > 0) msg += ' Left ' + kept + ' untouched.';
            MsgLog.push(msg);
          }
        } catch (_) {}
        try { SFX.addTask && SFX.addTask(); } catch (_) {}
      });
    }

    freshDelete.addEventListener('click', function() {
      if (freshDelete.disabled) return;
      var toDelete = (ancientPurgeCurrentList || []).filter(function(entry) {
        return selected[entry.task.id];
      });
      var kept = (ancientPurgeCurrentList || []).length - toDelete.length;
      var deleted = purgeAncientTasks(toDelete);
      closeAncientPurgeModal();
      // If the user chose to keep some, treat it like a partial dismissal so
      // they aren't re-prompted immediately about the survivors.
      if (kept > 0) {
        state.ancientPurgeDismissedAt = Date.now();
      } else {
        state.ancientPurgeDismissedAt = 0;
      }
      save();
      notify(deleted + ' abandoned task' + (deleted === 1 ? '' : 's') + ' purged.', '#ffb43c');
      try {
        if (typeof MsgLog !== 'undefined') {
          var msg = 'Purged ' + deleted + ' abandoned task' + (deleted === 1 ? '' : 's') + '.';
          if (kept > 0) msg += ' Kept ' + kept + ' on the shelf.';
          else msg += ' The shelf is clean.';
          MsgLog.push(msg);
        }
      } catch (_) {}
      try { render(); } catch (_) {}
    });

    modal.style.display = 'flex';
  }

  function closeAncientPurgeModal() {
    var modal = document.getElementById('ancientPurgeModal');
    if (modal) modal.style.display = 'none';
    ancientPurgeCurrentList = null;
  }

  // ============== STAGE-ENTRY ARCHIVE (v3.19) ==============
  // The tracker's BRIEF button now opens an ARCHIVE of entries that unlock
  // over time. stage-entries.js owns the data table and the render logic;
  // this module handles:
  //   - opening the modal at the right entry (default = first unseen, or
  //     most recent if caught up),
  //   - wiring the prev/next nav so the player can walk the archive,
  //   - dismissal behavior (first-run flips hasSeenIntro + pushes welcome
  //     chat lines; subsequent reads are silent replays),
  //   - unlock checks after state-advancing events, with a MsgLog line
  //     announcing each new entry as it lands.
  //
  // The first-run entry (tracker-s0) preserves the original "Welcome to the
  // Master Loom" text verbatim; it's stored inside stage-entries.js as the
  // first entry with an empty unlock condition.

  // Track which entry the modal is currently displaying so the prev/next
  // buttons can walk around it. Ephemeral — not persisted.
  var currentStageEntryId = null;

  // Run the unlock evaluator for this window and push MsgLog lines for any
  // newly-unlocked entries. Called after every state-advancing event on the
  // tracker side (session rewards, manual textile credits, level-ups, etc.).
  // Idempotent — safe to call repeatedly; will only fire once per new entry.
  function checkTrackerStageUnlocks() {
    try {
      if (typeof StageEntries === 'undefined') return;
      var newly = StageEntries.checkStageUnlocks(state, 'tracker');
      if (!newly || newly.length === 0) return;
      for (var i = 0; i < newly.length; i++) {
        var e = newly[i].entry;
        try {
          if (typeof MsgLog !== 'undefined') {
            MsgLog.push('A new entry has been appended to the standing brief: \u201c' + (e.label || e.heading || e.id) + '.\u201d Click BRIEF to read it.');
          }
        } catch (_) {}
      }
      save();
      try { render(); } catch (_) {}
    } catch (_) {}
  }

  // Refresh the little gold badge on the BRIEF header button. Called from
  // render() so the dot appears/disappears with any state change.
  function refreshTrackerBriefBadge() {
    try {
      var badge = document.getElementById('showIntroBadge');
      if (!badge) return;
      if (typeof StageEntries === 'undefined') { badge.style.display = 'none'; return; }
      var unseen = StageEntries.getUnseenCount(state, 'tracker');
      if (unseen > 0) {
        badge.textContent = String(unseen);
        badge.style.display = 'inline-block';
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
      }
    } catch (_) {}
  }

  // Open the archive modal to a specific entry id. If `entryId` is null we
  // pick the first unseen entry, or the most recent if the player is caught
  // up. If no entries are unlocked yet (fresh install), force tracker-s0 so
  // the first-run experience still works even before the first unlock check
  // has run.
  function showIntroModal(entryId) {
    var modal = document.getElementById('introModal');
    if (!modal) return;
    if (typeof StageEntries === 'undefined') return;

    // Make sure s0 is always accessible (fresh-install safety net).
    if (!Array.isArray(state.stageEntriesUnlocked)) state.stageEntriesUnlocked = [];
    if (state.stageEntriesUnlocked.indexOf('tracker-s0') === -1) {
      state.stageEntriesUnlocked.unshift('tracker-s0');
    }

    // Pick which entry to show.
    var targetEntry = null;
    if (entryId) {
      var info = StageEntries.getEntryById(entryId);
      if (info) targetEntry = info.entry;
    }
    if (!targetEntry) {
      targetEntry = StageEntries.getDefaultEntryToShow(state, 'tracker');
    }
    if (!targetEntry) return;

    // Render the entry into the shell. The renderer also marks the entry as
    // seen, so opening an entry clears its contribution to the badge count.
    currentStageEntryId = targetEntry.id;
    StageEntries.renderEntryInto(modal, 'tracker', targetEntry.id, state);

    // Wire the dismiss button — fresh listener each open, clone-node style.
    var btn = document.getElementById('introBeginBtn');
    if (btn) {
      var freshBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(freshBtn, btn);
      freshBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        // First-run flip: hasSeenIntro goes true the first time tracker-s0
        // is dismissed, which also triggers the welcome chat lines. Every
        // subsequent open is a silent replay.
        var wasFirstRun = !state.hasSeenIntro;
        if (wasFirstRun) {
          state.hasSeenIntro = true;
          try { SFX.purchase(); } catch (_) {}
          try {
            if (typeof MsgLog !== 'undefined') {
              MsgLog.push('The factory notes your arrival. Welcome, craftsman.');
              MsgLog.push('Standing order: produce textiles. The order has never been rescinded.');
            }
          } catch (_) {}
        }
        save();
        try { render(); } catch (_) {}
      });
    }

    // Wire the prev/next nav — also clone-node to wipe stale listeners.
    var prevBtn = document.getElementById('stage-prev');
    if (prevBtn) {
      var freshPrev = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(freshPrev, prevBtn);
      freshPrev.addEventListener('click', function() {
        if (freshPrev.disabled) return;
        var neighborId = StageEntries.getNeighborEntryId(state, 'tracker', currentStageEntryId, -1);
        if (!neighborId) return;
        showIntroModal(neighborId);
        try { SFX.tabSwitch(); } catch (_) {}
      });
    }
    var nextBtn = document.getElementById('stage-next');
    if (nextBtn) {
      var freshNext = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(freshNext, nextBtn);
      freshNext.addEventListener('click', function() {
        if (freshNext.disabled) return;
        var neighborId = StageEntries.getNeighborEntryId(state, 'tracker', currentStageEntryId, 1);
        if (!neighborId) return;
        showIntroModal(neighborId);
        try { SFX.tabSwitch(); } catch (_) {}
      });
    }

    // Persist the seen-mark that renderEntryInto wrote into state.
    save();
    try { render(); } catch (_) {}

    if (modal.style.display !== 'flex') {
      modal.style.display = 'flex';
      try { SFX.tabSwitch(); } catch (_) {}
    }
  }

  // ============== 10-MINUTE WORK CHECK-IN ==============
  // An honor-system check-in that pops up every 10 minutes WHILE THE TIMER
  // IS RUNNING and asks whether the user actually worked the previous 10
  // minutes. The modal disappears as soon as the user answers (either way),
  // and the 10-minute countdown resets from the answer time. Both answers
  // get logged to the MsgLog so the user has a history of their honesty.
  //
  // v3.18.8 fix: previously the check-in was scheduled unconditionally at
  // init and ran forever on a fixed 10-minute cadence regardless of timer
  // state, which meant it fired at seemingly random times whenever the
  // user wasn't running a pomodoro. The new contract is strict:
  //   - Armed only while state.timerState === 'running'
  //   - Cancelled the moment the timer pauses, resets, or completes
  //   - Re-armed fresh from startTimer() transitions
  //   - Does NOT show if the timer has stopped running between scheduling
  //     and the modal being asked to display (defensive check)
  var WORK_CHECK_INTERVAL_MS = 10 * 60 * 1000;
  var workCheckTimer = null;
  function cancelWorkCheckIn() {
    if (workCheckTimer) { clearTimeout(workCheckTimer); workCheckTimer = null; }
  }
  function showWorkCheckIn() {
    // HARD GATE: only show if the timer is actually running right now.
    // If we were armed at :00 and the user paused at :05, we shouldn't
    // pop the modal at :10. cancelWorkCheckIn() should have caught this
    // but this is a defence-in-depth check.
    if (state.timerState !== 'running') {
      cancelWorkCheckIn();
      return;
    }
    var modal = document.getElementById('workCheckInModal');
    if (!modal) return;
    // Don't stack: if it's already open, leave it be
    if (modal.style.display === 'flex') return;
    // Don't interrupt a focus confirmation or the ancient purge prompt —
    // defer by 60s and re-check. If the timer stops in that minute, the
    // gate at the top of this function will bail out quietly.
    var focusOpen = document.getElementById('focusConfirmModal');
    var ancientOpen = document.getElementById('ancientPurgeModal');
    if ((focusOpen && focusOpen.style.display === 'flex') ||
        (ancientOpen && ancientOpen.style.display === 'flex')) {
      cancelWorkCheckIn();
      workCheckTimer = setTimeout(function() {
        try { showWorkCheckIn(); } catch (e) {}
      }, 60 * 1000);
      return;
    }

    var yes = document.getElementById('workCheckYesBtn');
    var no = document.getElementById('workCheckNoBtn');
    if (!yes || !no) return;
    // Reset any previous listeners
    var freshYes = yes.cloneNode(true);
    yes.parentNode.replaceChild(freshYes, yes);
    var freshNo = no.cloneNode(true);
    no.parentNode.replaceChild(freshNo, no);

    function answerAndClose(answer) {
      modal.style.display = 'none';
      try {
        if (typeof MsgLog !== 'undefined') {
          MsgLog.push(answer
            ? 'Check-in: focused the full 10 minutes. The shuttle keeps its rhythm.'
            : 'Check-in: lost focus in the last 10 minutes. Acknowledged. Warp holds.');
        }
      } catch (_) {}
      // Only re-arm if the timer is still running. If they answered and
      // then immediately stopped, the re-arm will be cancelled by the
      // stop path anyway — but avoid redundant scheduling here.
      if (state.timerState === 'running') {
        scheduleNextWorkCheckIn();
      } else {
        cancelWorkCheckIn();
      }
    }

    freshYes.addEventListener('click', function() { answerAndClose(true); });
    freshNo.addEventListener('click', function() { answerAndClose(false); });

    modal.style.display = 'flex';
  }
  function scheduleNextWorkCheckIn() {
    cancelWorkCheckIn();
    // Only arm if the timer is currently running. No running timer =
    // no honor-system check-ins, period.
    if (state.timerState !== 'running') return;
    workCheckTimer = setTimeout(function() {
      try { showWorkCheckIn(); } catch (e) {}
    }, WORK_CHECK_INTERVAL_MS);
  }

  // Permanently removes every task in `list` from its project's task array.
  // Also scrubs the staleNotified map for deleted ids. Returns the number
  // of tasks actually removed.
  function purgeAncientTasks(list) {
    if (!list || list.length === 0) return 0;
    var byProject = {};
    list.forEach(function(entry) {
      if (!byProject[entry.projectId]) byProject[entry.projectId] = {};
      byProject[entry.projectId][entry.task.id] = true;
    });
    var removedCount = 0;
    Object.keys(byProject).forEach(function(pid) {
      var arr = state.tasks[pid] || [];
      var before = arr.length;
      state.tasks[pid] = arr.filter(function(t) { return !byProject[pid][t.id]; });
      removedCount += before - state.tasks[pid].length;
    });
    // If the currently-focused task was deleted, clear the focus
    if (state.currentTaskId) {
      var stillAlive = false;
      Object.keys(state.tasks || {}).forEach(function(pid) {
        (state.tasks[pid] || []).forEach(function(t) {
          if (t.id === state.currentTaskId) stillAlive = true;
        });
      });
      if (!stillAlive) state.currentTaskId = null;
    }
    // Clean up staleNotified entries
    if (state.staleNotified) {
      list.forEach(function(entry) { delete state.staleNotified[entry.task.id]; });
    }
    return removedCount;
  }

  // ===== Drag-to-reorder (v3.19.2) =====
  // Reorder tasks within the active project by moving the dragged task
  // to a position relative to a target task. `place` is 'before' or
  // 'after'. Completed tasks cannot be dragged (they stay pinned to the
  // bottom via the render-time sort), and we refuse to drop on a
  // completed task. Mutates state.tasks[activeProject] in place and
  // persists + re-renders when the order actually changes.
  function reorderTask(draggedId, targetId, place) {
    if (draggedId === targetId) return false;
    const list = state.tasks[state.activeProject];
    if (!Array.isArray(list)) return false;
    const fromIdx = list.findIndex(t => t.id === draggedId);
    const toIdx = list.findIndex(t => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return false;
    // Refuse to reorder onto or away from a completed task.
    if (list[fromIdx].completed || list[toIdx].completed) return false;
    const [moved] = list.splice(fromIdx, 1);
    // Recompute target index because the splice may have shifted it.
    let insertIdx = list.findIndex(t => t.id === targetId);
    if (insertIdx < 0) insertIdx = list.length;
    if (place === 'after') insertIdx += 1;
    list.splice(insertIdx, 0, moved);
    save();
    renderTasks();
    return true;
  }

  // Ephemeral drag state. Held outside renderTasks because renderTasks
  // wipes the DOM and rebuilds it on every call; the id lets us survive
  // mid-drag re-renders even though they shouldn't happen.
  let draggedTaskId = null;

  function renderTasks() {
    // ALL mode — flatten every project's tasks into a single list. Each task
    // is paired with its real project so downstream operations (delete,
    // toggle, focus) still resolve correctly via findTask / findTaskProject.
    var isAll = state.activeProject === ALL_PROJECT_ID;
    var tasks;
    var taskProjectById = {}; // task.id -> projectName, for the row badge
    if (isAll) {
      tasks = [];
      (state.projects || []).forEach(function(p) {
        (state.tasks[p.id] || []).forEach(function(t) {
          tasks.push(t);
          taskProjectById[t.id] = p.name;
        });
      });
    } else {
      tasks = state.tasks[state.activeProject] || [];
    }
    taskList.innerHTML = '';
    if (tasks.length === 0) {
      taskList.innerHTML = '<div class="empty-state" title="' + (isAll ? 'No tasks exist in any project yet. Add one above and it will be routed to your last-used project.' : 'Type a task in the input above and press + or Enter to add it.') + '">' + (isAll ? 'No tasks in any project yet.' : 'No tasks yet. Add one above!') + '</div>';
      return;
    }
    const sorted = [...tasks].sort((a, b) => a.completed !== b.completed ? (a.completed ? 1 : -1) : 0);
    sorted.forEach(task => {
      var _projBadge = (isAll && taskProjectById[task.id])
        ? '<span class="task-proj-badge" title="This task lives in the \u201c' + escHtml(taskProjectById[task.id]) + '\u201d project. Switch to that tab to drag-reorder it there.">' + escHtml(taskProjectById[task.id]) + '</span>'
        : '';
      const stale = isTaskStale(task);
      const item = document.createElement('div');
      item.className = 'task-item' + (task.completed ? ' completed' : '') + (task.id === state.selectedTaskId ? ' selected' : '') + (stale ? ' stale' : '');
      const isSelected = task.id === state.selectedTaskId;
      const earnedDesc = task.blocksEarned > 0 ? ' \u2014 ' + task.blocksEarned + ' textile' + (task.blocksEarned === 1 ? '' : 's') + ' earned focusing on this task' : '';
      const stateDesc = task.completed ? ' (completed)' : (isSelected ? ' (currently selected for the timer)' : '');
      const staleDesc = stale ? ' \u2014 AGING (' + formatStaleAge(task) + ' since added, no focus sessions logged)' : '';
      item.title = task.text + stateDesc + earnedDesc + staleDesc;
      const blocksHtml = task.blocksEarned > 0
        ? `<span class="task-blocks" title="${task.blocksEarned} textile${task.blocksEarned === 1 ? '' : 's'} earned while focusing on this task.">${'<span class="mini-earned"></span>'.repeat(Math.min(task.blocksEarned, 10))}${task.blocksEarned > 10 ? '+' : ''}</span>` : '';
      const staleBadgeHtml = stale
        ? `<span class="task-stale-badge" title="This task has been waiting ${formatStaleAge(task)} without any focus sessions logged against it. Consider attending to it, or delete it if it's no longer relevant.">AGING ${formatStaleAge(task)}</span>`
        : '';
      const isRec = task.recurring || isRecurringText(task.text);
      const recurBadge = isRec
        ? '<span class="task-recur-badge" title="This task recurs daily. It will reappear tomorrow when completed. Complete it and click STOP RECURRING on the toast to remove it from the daily schedule.">\u21BB</span>'
        : '';
      const recurBtn = (!task.completed && !isRec)
        ? '<button class="task-recur-btn" title="Make this task recurring. It will be auto-added to your list every morning. You can stop it anytime from the toast that appears when you complete it.">\u21BB</button>'
        : '';
      item.innerHTML = `
        <div class="task-checkbox${task.completed ? ' checked' : ''}" title="${task.completed ? 'Mark as not done.' : 'Mark this task complete. A speck of dust drops into the dust bin. Complete 3+ tasks today to unlock the daily burn.'}"></div>
        ${_projBadge}
        ${staleBadgeHtml}
        ${recurBadge}
        <span class="task-text">${escHtml(task.text)}</span>
        ${blocksHtml}
        ${!task.completed ? `<button class="task-select-btn" title="Pin this task as your current focus target. While it's pinned, every textile earned from a completed focus session gets credited to THIS task (the little dots next to the task name track how many sessions you've finished while it was pinned). Pinned tasks never get flagged as aging, since they're being actively worked on. Click FOCUS again on the same task to unpin it. Only one task can be pinned at a time &mdash; picking a new one swaps the pin.">FOCUS</button>` : ''}
        ${!task.completed ? `<button class="task-today-btn" title="Send to Today&rsquo;s Tasks.">\u2192TODAY</button>` : ''}
        ${!task.completed ? `<button class="task-donow-btn" title="Do this task right now. Set a time estimate and commit.">DO NOW</button>` : ''}
        ${recurBtn}
        <span class="task-delete" title="Delete this task. Cannot be undone.">\u00d7</span>
      `;
      item.querySelector('.task-checkbox').addEventListener('click', (e) => { e.stopPropagation(); toggleTask(task.id); });
      const taskTextEl = item.querySelector('.task-text');
      if (taskTextEl) {
        taskTextEl.title = task.text + ' (click to expand or collapse the text)';
        taskTextEl.style.cursor = 'pointer';
        taskTextEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (taskTextEl.style.whiteSpace === 'normal') { taskTextEl.style.whiteSpace = 'nowrap'; taskTextEl.style.overflow = 'hidden'; taskTextEl.style.textOverflow = 'ellipsis'; }
          else { taskTextEl.style.whiteSpace = 'normal'; taskTextEl.style.overflow = 'visible'; taskTextEl.style.textOverflow = 'unset'; }
        });
      }
      const focusBtn = item.querySelector('.task-select-btn');
      if (focusBtn) focusBtn.addEventListener('click', (e) => { e.stopPropagation(); selectTask(task.id); });
      const todayBtn2 = item.querySelector('.task-today-btn');
      if (todayBtn2) {
        if (isInTodayTasks(task.id)) {
          todayBtn2.textContent = '\u2605';
          todayBtn2.title = 'Already in Today\u2019s Tasks.';
          todayBtn2.disabled = true;
          todayBtn2.style.opacity = '0.4';
          todayBtn2.style.cursor = 'default';
        }
        todayBtn2.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!isInTodayTasks(task.id)) {
            addTodayTask(task.text, task.id, 'project');
            render();
          }
        });
      }
      const recurBtn2 = item.querySelector('.task-recur-btn');
      if (recurBtn2) recurBtn2.addEventListener('click', (e) => {
        e.stopPropagation();
        addRecurringTemplate(task.text, findTaskProject(task.id));
        task.recurring = true;
        notify('\u21BB \u201C' + task.text + '\u201D will now recur daily.', '#00ff88');
        save();
        render();
      });
      var doNowBtn2 = item.querySelector('.task-donow-btn');
      if (doNowBtn2) doNowBtn2.addEventListener('click', (e) => {
        e.stopPropagation();
        var isRec = task.recurring || isRecurringText(task.text);
        startDoNow(task.id, task.text, isRec);
      });
      item.querySelector('.task-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task.id); });

      // ===== Drag-to-reorder wiring =====
      // Only active (uncompleted) tasks are draggable. Completed tasks
      // stay pinned to the bottom. The drop target flashes a top or
      // bottom border depending on where in the row the cursor is.
      // Skip entirely in ALL mode — reorder is scoped to a single project,
      // and mixing cross-project rows here would be meaningless.
      if (!task.completed && !isAll) {
        item.draggable = true;
        item.dataset.taskId = task.id;
        item.addEventListener('dragstart', (e) => {
          draggedTaskId = task.id;
          item.classList.add('dragging');
          try {
            e.dataTransfer.effectAllowed = 'move';
            // Firefox requires data to be set or dragstart is ignored.
            e.dataTransfer.setData('text/plain', task.id);
          } catch (_) {}
        });
        item.addEventListener('dragend', () => {
          draggedTaskId = null;
          item.classList.remove('dragging');
          // Clear any lingering drop indicators on siblings.
          const siblings = taskList.querySelectorAll('.task-item.drop-before, .task-item.drop-after');
          siblings.forEach(s => s.classList.remove('drop-before', 'drop-after'));
        });
        item.addEventListener('dragover', (e) => {
          if (!draggedTaskId || draggedTaskId === task.id) return;
          e.preventDefault();
          try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
          const rect = item.getBoundingClientRect();
          const isAfter = (e.clientY - rect.top) > (rect.height / 2);
          item.classList.toggle('drop-before', !isAfter);
          item.classList.toggle('drop-after', isAfter);
        });
        item.addEventListener('dragleave', (e) => {
          // Only clear if we're actually leaving the item, not just
          // moving between its children.
          if (e.relatedTarget && item.contains(e.relatedTarget)) return;
          item.classList.remove('drop-before', 'drop-after');
        });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const srcId = draggedTaskId;
          item.classList.remove('drop-before', 'drop-after');
          if (!srcId || srcId === task.id) return;
          const rect = item.getBoundingClientRect();
          const isAfter = (e.clientY - rect.top) > (rect.height / 2);
          reorderTask(srcId, task.id, isAfter ? 'after' : 'before');
        });
      }

      taskList.appendChild(item);
    });
  }

  function renderBlockProgress() {
    blockProgress.innerHTML = '';
    const earned = state.sessionBlocks;
    const total = Math.max(earned + 1, 6);
    for (let i = 0; i < total; i++) {
      const block = document.createElement('div');
      block.className = 'mini-block';
      if (i < earned) block.classList.add('earned');
      else if (i === earned && state.timerState === 'running') block.classList.add('current');
      else block.classList.add('empty');
      blockProgress.appendChild(block);
    }
  }

  function renderMilestones() {
    const container = $('milestoneList');
    container.innerHTML = '';
    const lifetimeMins = state.totalLifetimeBlocks * 10;
    COLOR_MILESTONES.forEach(m => {
      const unlocked = lifetimeMins >= m.mins;
      const el = document.createElement('div');
      el.className = 'milestone-item' + (unlocked ? ' unlocked' : '');
      const swatch = document.createElement('div');
      swatch.className = 'milestone-swatch';
      swatch.style.background = unlocked ? m.color : 'var(--border)';
      if (unlocked) swatch.style.boxShadow = `0 0 6px ${m.color}40`;
      const info = document.createElement('div');
      info.className = 'milestone-info';
      const name = document.createElement('span');
      name.className = 'milestone-name';
      name.textContent = unlocked ? m.name : '???';
      const req = document.createElement('span');
      req.className = 'milestone-req';
      if (unlocked) { req.textContent = '\u2713 Unlocked'; req.style.color = 'var(--accent)'; }
      else {
        const h = Math.floor(m.mins / 60), mm = m.mins % 60;
        req.textContent = (h > 0 ? `${h}h ${mm}m` : `${mm}m`) + ' total focus';
      }
      info.appendChild(name); info.appendChild(req); el.appendChild(swatch); el.appendChild(info);
      if (!unlocked) {
        const pct = Math.min(100, (lifetimeMins / m.mins) * 100);
        const bar = document.createElement('div');
        bar.className = 'milestone-bar';
        bar.innerHTML = `<div class="milestone-bar-fill" style="width:${pct}%"></div>`;
        el.appendChild(bar);
      }
      container.appendChild(el);
    });
  }

  function renderCanvasUpgrades() {
    const container = $('upgradeList');
    container.innerHTML = '';
    const upgrades = generateCanvasUpgrades(state.canvasSize);
    const ownedList = Array.isArray(state.purchasedCanvasSizes) && state.purchasedCanvasSizes.length
      ? state.purchasedCanvasSizes : [8];
    const maxOwned = Math.max.apply(null, ownedList);
    upgrades.forEach(u => {
      // Explicit ownership — only sizes actually purchased count as owned.
      const owned = ownedList.indexOf(u.size) !== -1;
      // Next-up is the smallest unowned size larger than the biggest owned size.
      const nextUp = !owned && u.size === upgrades.reduce((acc, x) => {
        return (ownedList.indexOf(x.size) === -1 && x.size > maxOwned && (acc == null || x.size < acc)) ? x.size : acc;
      }, null);
      const coinCost = u.coinCost || 0;
      const haveBlocks = state.blocks || 0;
      const haveCoins = state.coins || 0;
      const canAfford = haveBlocks >= u.cost && haveCoins >= coinCost;
      const el = document.createElement('div');
      el.className = 'upgrade-btn' + (owned ? ' owned' : '') + (nextUp && canAfford ? ' available' : '');
      const priceLabel = owned
        ? '\u2713 Owned'
        : `${u.cost.toLocaleString()} tex + $${coinCost.toLocaleString()}`;
      el.innerHTML = `<span>${u.label}</span><span>${priceLabel}</span>`;
      if (!owned && canAfford && nextUp) {
        el.addEventListener('click', () => {
          if ((state.blocks || 0) < u.cost) { SFX.error(); return; }
          if ((state.coins || 0) < coinCost) { SFX.error(); return; }
          SFX.purchase();
          state.blocks -= u.cost;
          state.coins -= coinCost;
          if (!Array.isArray(state.purchasedCanvasSizes)) state.purchasedCanvasSizes = [8];
          if (state.purchasedCanvasSizes.indexOf(u.size) === -1) state.purchasedCanvasSizes.push(u.size);
          state.canvasSize = u.size;
          notify(`Canvas upgraded to ${u.size}\u00d7${u.size}!`, '#5352ed');
          save();
          render();
        });
      } else if (!owned && !canAfford) {
        el.addEventListener('click', () => SFX.error());
      }
      container.appendChild(el);
    });
  }

  function renderMiniCanvas() {
    const canvas = $('miniCanvas');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    const size = state.canvasSize;
    canvas.width = 128;
    canvas.height = 128;
    const px = 128 / size;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, 128, 128);
    Object.entries(state.pixelCanvas || {}).forEach(([key, color]) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x * px, y * px, px, px);
    });
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath(); ctx.moveTo(i * px, 0); ctx.lineTo(i * px, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * px); ctx.lineTo(128, i * px); ctx.stroke();
    }
  }

  // ============== TIMER ==============
  // The 15-second pre-start countdown gives the user a beat to get ready
  // before the real work clock begins. It runs on a fresh start from idle
  // only. Resuming from paused skips the countdown — if you paused it,
  // you already know how to un-pause it and don't need a grace period.
  function cancelPreStartCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    countdownRemaining = 0;
  }

  // Start (or restart) the 1 Hz timer tick that reads state.timerEndsAt and
  // updates state.timerRemaining / rendering each time the second count
  // changes. Safe to call multiple times — it clears any existing interval
  // first. This is the ONLY place setInterval is armed for the timer, so
  // both beginActualSession() and the popup-reload resume path go through
  // this function.
  //
  // v3.19.11: extracted from beginActualSession so popup reloads can
  // re-attach the tick without starting a fresh session.
  function armTimerTick() {
    if (timerInterval) clearInterval(timerInterval);
    var lastRenderedSec = state.timerRemaining || -1;
    timerInterval = setInterval(() => {
      try {
        // Wall-clock-based remaining. Robust to background tab throttling
        // and to the interval firing faster or slower than 1 Hz.
        var remainingMs = (state.timerEndsAt || 0) - Date.now();
        var remaining = Math.max(0, Math.ceil(remainingMs / 1000));
        if (remaining > 0) {
          if (remaining !== state.timerRemaining) {
            state.timerRemaining = remaining;
            // Play a minute tick only when we actually cross a minute
            // boundary in wall-clock time, not just "every 60 ticks".
            if (lastRenderedSec > 0 && Math.floor(lastRenderedSec / 60) > Math.floor(remaining / 60)) {
              try { SFX.tick(); } catch (_) {}
            }
            lastRenderedSec = remaining;
            save();
            renderTimer();
            renderBlockProgress();
          }
        } else {
          clearInterval(timerInterval);
          timerInterval = null;
          state.timerRemaining = 0;
          state.timerEndsAt = 0;
          state.timerState = 'completed';
          SFX.timerComplete();
          try { cancelWorkCheckIn(); } catch (_) {}
          save();
          render();
          showFocusConfirmation();
        }
      } catch(err) {
        console.error('Timer tick error:', err);
      }
    }, 1000);
  }

  // v3.21.15: Cold Turkey integration — start/stop a block via native messaging.
  function triggerColdTurkey(action, minutes) {
    if (!state.coldTurkeyEnabled) return;
    var blockName = (state.coldTurkeyBlockName || '').trim();
    if (!blockName) return;
    try {
      chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', {
        action: action,
        block: blockName,
        minutes: minutes || 0
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.warn('[ColdTurkey] Native messaging error:', chrome.runtime.lastError.message);
        } else {
          console.log('[ColdTurkey] Response:', response);
        }
      });
    } catch (err) {
      console.warn('[ColdTurkey] Failed to send native message:', err);
    }
  }

  // v3.21.15: Open Cold Turkey's UI via native messaging.
  function openColdTurkeyApp() {
    try {
      console.log('[ColdTurkey] Sending open command...');
      chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', {
        action: 'open'
      }, function(response) {
        if (chrome.runtime.lastError) {
          var errMsg = chrome.runtime.lastError.message || '';
          console.warn('[ColdTurkey] Could not open app:', errMsg);
          var statusEl = document.getElementById('coldTurkeyStatus');
          if (statusEl) {
            var extId = chrome.runtime.id || '?';
            statusEl.innerHTML = '<span style="color:#ff6666;">Native messaging failed.</span> Run setup-cold-turkey.bat first. Extension ID: <b>' + extId + '</b>';
          } else {
            try { notify('Cold Turkey: native messaging not set up. Run setup-cold-turkey.bat', '#ff6666'); } catch(_){}
          }
        } else {
          console.log('[ColdTurkey] Open response:', JSON.stringify(response));
        }
      });
    } catch (err) {
      console.warn('[ColdTurkey] Failed to open app:', err);
      try { notify('Cold Turkey: native messaging error. Run setup-cold-turkey.bat', '#ff6666'); } catch(_){}
    }
  }

  // v3.21.15: Daily Cold Turkey prompt — shows once per day on first load.
  function maybeColdTurkeyDailyPrompt() {
    if (!state.coldTurkeyDailyPrompt) return;
    var today = todayStr();
    if (state.coldTurkeyLastPromptDate === today) return;
    // Mark as shown for today
    state.coldTurkeyLastPromptDate = today;
    save();
    // Build and show the modal
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:linear-gradient(135deg,#0a0a14,#12121f);border:2px solid #4ecdc4;border-radius:8px;max-width:380px;width:100%;padding:24px;text-align:center;box-shadow:0 0 28px rgba(78,205,196,0.35);';
    box.innerHTML = ''
      + '<div style="font-family:\'Press Start 2P\',monospace;font-size:11px;color:#4ecdc4;margin-bottom:14px;letter-spacing:1px;">COLD TURKEY</div>'
      + '<div style="font-family:\'Courier New\',monospace;font-size:12px;color:#e0e0e0;line-height:1.6;margin-bottom:18px;">Open Cold Turkey to set up your blocks for today?</div>'
      + '<div style="display:flex;gap:10px;justify-content:center;">'
      + '<button id="ctDailyOpen" style="background:#4ecdc4;color:#08080f;border:none;border-radius:4px;padding:10px 16px;font-family:\'Press Start 2P\',monospace;font-size:9px;cursor:pointer;letter-spacing:1px;">OPEN COLD TURKEY</button>'
      + '<button id="ctDailySkip" style="background:transparent;color:#5a5a7e;border:1px solid #5a5a7e;border-radius:4px;padding:10px 16px;font-family:\'Press Start 2P\',monospace;font-size:9px;cursor:pointer;letter-spacing:1px;">SKIP TODAY</button>'
      + '</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function dismiss() {
      try { document.body.removeChild(overlay); } catch (_) {}
    }
    overlay.addEventListener('click', function(ev) { if (ev.target === overlay) dismiss(); });
    document.getElementById('ctDailyOpen').addEventListener('click', function() {
      openColdTurkeyApp();
      dismiss();
    });
    document.getElementById('ctDailySkip').addEventListener('click', function() {
      dismiss();
    });
  }

  // v3.22.11: Wind-down Cold Turkey check-in
  // During the wind-down period before sleep, opens Cold Turkey and asks the
  // player to confirm they turned on their blockers. Rewards XP + coins with
  // a streak bonus for consecutive days.
  function isInWindDown() {
    if (!state.sleepTimeEnabled || !state.windDownCTCheckin) return false;
    var prep = state.sleepPrepMin || 0;
    if (prep <= 0) return false; // no wind-down period set
    var now = new Date();
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var nowMs = now.getTime();
    var sleepH = (state.sleepHour != null) ? state.sleepHour : 23;
    var sleepM = state.sleepMinute || 0;
    var sleepMs = dayStart + (sleepH * 3600000) + (sleepM * 60000);
    var windDownStart = sleepMs - (prep * 60000);
    // Also check yesterday's sleep (for after-midnight wind-down)
    var yWindDownStart = windDownStart - 86400000;
    var ySleepMs = sleepMs - 86400000;
    return (nowMs >= windDownStart && nowMs < sleepMs) ||
           (nowMs >= yWindDownStart && nowMs < ySleepMs);
  }

  function maybeWindDownCTCheckin() {
    if (!state.windDownCTCheckin || !state.sleepTimeEnabled) return;
    var today = todayStr();
    // Already confirmed or prompted today
    if (state.windDownCTCheckedToday && state.windDownCTLastDate === today) return;
    if (state.windDownCTPromptedToday && state.windDownCTLastDate === today) return;
    if (!isInWindDown()) return;

    // Reset flags if new day
    if (state.windDownCTLastDate !== today) {
      state.windDownCTCheckedToday = false;
      state.windDownCTPromptedToday = false;
    }

    state.windDownCTPromptedToday = true;
    state.windDownCTLastDate = today;
    save();

    // Open Cold Turkey automatically, then show modal after a delay
    // so Cold Turkey has time to come to front before the modal reclaims focus
    try { openColdTurkeyApp(); } catch (_) {}

    var modal = document.getElementById('windDownCTModal');
    var streakEl = document.getElementById('windDownCTStreak');
    if (!modal) return;

    // Show streak info + modal after delay
    if (streakEl) {
      var s = state.windDownCTStreak || 0;
      streakEl.textContent = s > 0 ? 'Wind-down streak: ' + s + ' day' + (s !== 1 ? 's' : '') : 'Start your wind-down streak!';
    }

    modal.style.display = 'flex';
  }

  function _windDownCTReward() {
    var today = todayStr();
    // Update streak
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    if (state.windDownCTLastDate === yStr || state.windDownCTLastDate === today) {
      state.windDownCTStreak = (state.windDownCTStreak || 0) + 1;
    } else {
      state.windDownCTStreak = 1;
    }
    state.windDownCTCheckedToday = true;
    state.windDownCTLastDate = today;

    // XP reward: 5 base + 1 per streak day (capped at 15)
    var streakDays = state.windDownCTStreak || 1;
    var xpReward = Math.min(5 + streakDays, 15);
    state.xp = (state.xp || 0) + xpReward;
    state.todayXP = (state.todayXP || 0) + xpReward;

    // Coin reward: 25 base + 10 per streak day (capped at 125), scaled by multipliers
    var coinBase = Math.min(25 + (streakDays * 10), 125);
    awardCoins(coinBase, 'Wind-down check-in (streak ' + streakDays + ')');

    // XP notification
    notify('+' + xpReward + ' XP — wind-down check-in (' + streakDays + '-day streak)', '#6b6bff');

    save();
    render();
  }

  // Wire up wind-down check-in modal buttons
  var _windDownIsTest = false;
  (function() {
    var modal = document.getElementById('windDownCTModal');
    var confirmBtn = document.getElementById('windDownCTConfirm');
    var skipBtn = document.getElementById('windDownCTSkip');
    if (confirmBtn) confirmBtn.addEventListener('click', function() {
      if (modal) modal.style.display = 'none';
      if (_windDownIsTest) {
        notify('TEST: Wind-down check-in confirmed (no real rewards)', '#6b6bff');
      } else {
        _windDownCTReward();
      }
      _windDownIsTest = false;
    });
    if (skipBtn) skipBtn.addEventListener('click', function() {
      if (modal) modal.style.display = 'none';
      if (!_windDownIsTest) {
        // Skipping breaks the streak (only on real prompts)
        state.windDownCTCheckedToday = true;
        save();
      }
      _windDownIsTest = false;
    });
    if (modal) modal.addEventListener('click', function(e) {
      if (e.target === modal) { modal.style.display = 'none'; _windDownIsTest = false; }
    });
  })();

  // ===== Surveillance Mode (v3.22.27) =====
  // Nags every 5 min when no focus timer is running. Escalates after 3 ignored.
  (function() {
    var startBtn = document.getElementById('surveillanceStartBtn');
    var stopBtn = document.getElementById('surveillanceStopBtn');
    var durSelect = document.getElementById('surveillanceDuration');
    var timerEl = document.getElementById('surveillanceTimer');
    var statusEl = document.getElementById('surveillanceStatus');
    var descEl = document.getElementById('surveillanceDesc');
    var panel = document.getElementById('surveillancePanel');
    var elapsedEl = document.getElementById('surveillanceElapsed');
    if (!startBtn) return;

    function updateElapsedDisplay() {
      if (!elapsedEl) return;
      var now = Date.now();
      // Timer currently running? Show that instead
      if (state.timerEndsAt && state.timerEndsAt > now) {
        elapsedEl.textContent = 'FOCUS TIMER RUNNING';
        elapsedEl.style.color = '#00ff88';
        return;
      }
      var lastSession = state.lastCompletedSessionAt || state.lastStartedSessionAt || 0;
      if (!lastSession) {
        elapsedEl.textContent = 'NO SESSIONS TODAY';
        elapsedEl.style.color = '#ff6b6b';
        return;
      }
      var diff = now - lastSession;
      var totalSec = Math.floor(diff / 1000);
      var h = Math.floor(totalSec / 3600);
      var m = Math.floor((totalSec % 3600) / 60);
      var s = totalSec % 60;
      var txt;
      if (totalSec < 5) {
        txt = 'LAST TIMER: JUST NOW';
      } else if (h > 0) {
        txt = 'LAST TIMER: ' + h + 'H ' + (m < 10 ? '0' : '') + m + 'M ' + (s < 10 ? '0' : '') + s + 'S AGO';
      } else {
        txt = 'LAST TIMER: ' + m + 'M ' + (s < 10 ? '0' : '') + s + 'S AGO';
      }
      elapsedEl.textContent = txt;
      var mins = Math.floor(diff / 60000);
      if (mins < 30) elapsedEl.style.color = '#00ff88';
      else if (mins < 60) elapsedEl.style.color = '#ff9f43';
      else elapsedEl.style.color = '#ff6b6b';
      // Countdown to next nag + auto-fire when it hits zero
      if (state.surveillanceActive) {
        var _nagInterval = state.surveillanceNagInterval || 300000; // dynamic per tier
        // Re-entry guard: prevent multi-fire while async storage write is in flight
        if (window._survNagFiring) {
          elapsedEl.textContent = txt + '  |  NAG FIRING...';
        } else {
        try {
          chrome.storage.local.get('pixelFocusState', function(result) {
            var st = result.pixelFocusState;
            if (!st) return;
            var _now = Date.now();
            var lastNag = st.surveillanceLastNag || 0;
            var anchor = lastNag || st.surveillanceStartedAt || _now;
            var nextNag = anchor + _nagInterval;
            var remaining = Math.max(0, nextNag - _now);
            var rSec = Math.floor(remaining / 1000);
            var nM = Math.floor(rSec / 60);
            var nS = rSec % 60;
            if (rSec > 0) {
              elapsedEl.textContent = txt + '  |  NEXT NAG: ' + nM + 'M ' + (nS < 10 ? '0' : '') + nS + 'S';
            } else {
              // Time's up — fire the nag right here
              // v3.22.98: Comprehensive guard — check ALL states that mean "don't nag"
              var _timerOn = st.timerEndsAt && st.timerEndsAt > _now;
              var _timerBusy = st.timerState === 'running' || st.timerState === 'countdown' || st.timerState === 'paused' || st.timerState === 'completed';
              var _recent = st.lastCompletedSessionAt && (_now - st.lastCompletedSessionAt) < 300000;
              // Also check in-memory state (avoids stale-storage race on completion)
              var _memBusy = state.timerState === 'running' || state.timerState === 'countdown' || state.timerState === 'paused' || state.timerState === 'completed';
              if (_timerOn || _timerBusy || _recent || _memBusy) {
                elapsedEl.textContent = txt + '  |  NAG PAUSED (timer active)';
                // v3.22.98: Reset the nag anchor so next nag is 5 min from NOW
                // This prevents the nag from firing the instant the grace period ends
                if (st.surveillanceLastNag && (_now - st.surveillanceLastNag) > (_nagInterval - 20000)) {
                  st.surveillanceLastNag = _now;
                  try { chrome.storage.local.set({ pixelFocusState: st }); } catch(_) {}
                }
                return;
              }
              // v3.23.60: Detect sleep — if gap > 3× nag interval, computer was closed. Reset, don't punish.
              // (Previously hardcoded 15 min which was LESS than a 20-min nag interval, blocking every real nag.)
              var _sleepThresh = Math.max(_nagInterval * 3, 900000);
              if (lastNag && (_now - lastNag) > _sleepThresh) {
                console.log('[Surveillance] Sleep detected (' + Math.round((_now - lastNag)/60000) + ' min gap). Resetting.');
                st.surveillanceNagCount = 0;
                st.surveillanceLastNag = _now;
                st.surveillancePenaltyApplied = false;
                state.surveillanceNagCount = 0;
                state.surveillanceLastNag = _now;
                state.surveillancePenaltyApplied = false;
                try { chrome.storage.local.set({ pixelFocusState: st }); } catch(_) {}
                elapsedEl.textContent = txt + '  |  SLEEP DETECTED — NAG RESET';
                return;
              }
              // Lock to prevent re-fire on next tick
              window._survNagFiring = true;
              st.surveillanceNagCount = (st.surveillanceNagCount || 0) + 1;
              st.surveillanceLastNag = _now;
              var _nagNum = st.surveillanceNagCount;
              if (_nagNum >= 3) {
                st.surveillanceNagCount = 0;
              }
              // Nag 3: deduct 100 coins penalty — but only once per surveillance session
              var _penaltyJustApplied = false;
              if (_nagNum >= 3 && !st.surveillancePenaltyApplied) {
                st.coins = Math.max(0, (st.coins || 0) - 100);
                st.surveillancePenaltyApplied = true;
                _penaltyJustApplied = true;
                state.coins = st.coins;
              }
              // Single storage write with all changes (including penalty if applied)
              chrome.storage.local.set({ pixelFocusState: st }, function() {
                window._survNagFiring = false;
              });
              state.surveillanceNagCount = st.surveillanceNagCount;
              state.surveillanceLastNag = _now;
              if (_penaltyJustApplied) {
                try { notify('-$100 PENALTY — Surveillance strike 3!', '#ff4444'); } catch(_e) {}
                try { render(); } catch(_e) {}
              }
              // Every nag: notification + surveillance window + Cold Turkey
              try { chrome.runtime.sendMessage({ type: 'SURVEILLANCE_NAG', nagNum: _nagNum, penaltyApplied: !!st.surveillancePenaltyApplied }); } catch(_e) {}
              var _nagPath = 'surveillance-nag.html' + (_penaltyJustApplied ? '?penalty=1' : '');
              try { chrome.runtime.sendMessage({ type: 'pf-open', path: _nagPath }); } catch(_e) {}
              setTimeout(function() { try { openColdTurkeyApp(); } catch(_e) {} }, 3000);
              elapsedEl.textContent = txt + '  |  NAG #' + _nagNum + ' FIRED';
            }
          });
        } catch(_) {}
        } // end re-entry guard
      }
    }

    // v3.23.16: Quick-add time buttons
    var addBtnsContainer = document.getElementById('surveillanceAddBtns');
    var addBtns = addBtnsContainer ? addBtnsContainer.querySelectorAll('.surv-add-btn') : [];
    addBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var addMin = parseInt(btn.getAttribute('data-min')) || 0;
        if (!addMin || !state.surveillanceActive) return;
        state.surveillanceEndsAt = Math.max(state.surveillanceEndsAt, Date.now()) + (addMin * 60000);
        save();
        updateSurveillanceUI();
        // Flash the button
        btn.style.background = '#ff6b6b';
        btn.style.color = '#0a0a14';
        setTimeout(function() { btn.style.background = 'none'; btn.style.color = '#ff6b6b'; }, 300);
      });
    });

    function updateSurveillanceUI() {
      var now = Date.now();
      var active = state.surveillanceActive && state.surveillanceEndsAt > now;
      updateElapsedDisplay();
      if (active) {
        startBtn.style.display = 'none';
        durSelect.style.display = 'none';
        stopBtn.style.display = '';
        timerEl.style.display = '';
        if (addBtnsContainer) addBtnsContainer.style.display = 'flex';
        var _tierColors = {surveillance:'#ff4444',sentinel:'#ff9f43',passive:'#55aa99'};
        var _tc = _tierColors[state.surveillanceTier] || '#ff4444';
        panel.style.borderColor = _tc;
        panel.style.boxShadow = '0 0 15px ' + _tc + '33';
        // Show remaining time with seconds
        var rem = state.surveillanceEndsAt - now;
        var h = Math.floor(rem / 3600000);
        var m = Math.floor((rem % 3600000) / 60000);
        var s = Math.floor((rem % 60000) / 1000);
        timerEl.textContent = h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' + (s < 10 ? '0' : '') + s + 's';
        timerEl.style.color = _tc;
        statusEl.textContent = 'ACTIVE';
        statusEl.style.color = _tc;
        var _intMin = Math.round((state.surveillanceNagInterval || 300000) / 60000);
        var _intTxt = _intMin >= 60 ? Math.floor(_intMin/60) + 'h' + (_intMin%60 > 0 ? ' ' + (_intMin%60) + 'm' : '') : _intMin + ' min';
        var _tierNames = {surveillance:'Surveillance',sentinel:'Sentinel',passive:'Passive Surveillance'};
        descEl.textContent = (_tierNames[state.surveillanceTier] || 'Surveillance') + ' active. Nag every ' + _intTxt + ' without a running focus timer.';
      } else {
        // Auto-deactivate if expired
        if (state.surveillanceActive && state.surveillanceEndsAt <= now) {
          state.surveillanceActive = false;
          state.surveillanceNagCount = 0;
          save();
        }
        startBtn.style.display = '';
        durSelect.style.display = '';
        stopBtn.style.display = 'none';
        timerEl.style.display = 'none';
        if (addBtnsContainer) addBtnsContainer.style.display = 'none';
        var _tierColors2 = {surveillance:'#ff6b6b',sentinel:'#ff9f43',passive:'#55aa99'};
        panel.style.borderColor = _tierColors2[state.surveillanceTier] || '#ff6b6b';
        panel.style.boxShadow = 'none';
        statusEl.textContent = 'OFF';
        statusEl.style.color = '#5a5a7e';
        descEl.textContent = 'Select a surveillance tier and hit START.';
      }
    }

    startBtn.addEventListener('click', function() {
      var minutes = parseInt(durSelect.value) || 480;
      var tier = state.surveillanceTier || 'surveillance';
      var nagMs = 300000;
      if (tier === 'sentinel' || tier === 'passive') {
        var sl = document.getElementById('surveillanceIntervalSlider');
        nagMs = (sl ? parseInt(sl.value) : (tier === 'sentinel' ? 20 : 60)) * 60000;
      }
      state.surveillanceActive = true;
      state.surveillanceEndsAt = Date.now() + (minutes * 60000);
      state.surveillanceStartedAt = Date.now();
      state.surveillanceNagCount = 0;
      state.surveillanceLastNag = Date.now();
      state.surveillancePenaltyApplied = false;
      state.surveillanceConsecutiveNos = 0;
      state.surveillanceNagInterval = nagMs;
      save();
      setTimeout(function() { updateSurveillanceUI(); }, 300);
      var _tierN = {surveillance:'Surveillance',sentinel:'Sentinel',passive:'Passive Surveillance'};
      var _iMin = Math.round(nagMs / 60000);
      var _iTxt = _iMin >= 60 ? Math.floor(_iMin/60) + 'h' + (_iMin%60 > 0 ? ' ' + (_iMin%60) + 'm' : '') : _iMin + ' min';
      try {
        chrome.notifications.create('surveillance-started', {
          type: 'basic', iconUrl: 'icons/icon128.png',
          title: (_tierN[tier] || 'Surveillance') + ' Mode ON',
          message: 'Nag every ' + _iTxt + ' without a focus timer for the next ' + (minutes >= 60 ? (minutes/60) + ' hours' : minutes + ' min') + '.',
          priority: 2
        });
      } catch(_){}
    });

    stopBtn.addEventListener('click', function() {
      state.surveillanceActive = false;
      state.surveillanceEndsAt = 0;
      state.surveillanceNagCount = 0;
      save();
      updateSurveillanceUI();
    });

    // Test button — removed from IIFE, wired up standalone after this IIFE (v3.22.34)

    // v3.23.34: Tier picker buttons + interval slider
    var _tierBtns = document.querySelectorAll('.surv-tier-btn');
    var _sliderRow = document.getElementById('surveillanceSliderRow');
    var _slider = document.getElementById('surveillanceIntervalSlider');
    var _sliderVal = document.getElementById('surveillanceSliderVal');
    var _sliderTicks = document.getElementById('surveillanceSliderTicks');
    var _survTitle = document.getElementById('surveillanceTitle');
    var _tierConfigs = {
      surveillance: { interval: 300000, color: '#ff4444', name: 'SURVEILLANCE MODE' },
      sentinel: { min: 10, max: 30, step: 5, def: 20, color: '#ff9f43', name: 'SENTINEL MODE', ticks: [10, 15, 20, 25, 30] },
      passive: { min: 30, max: 180, step: 30, def: 60, color: '#55aa99', name: 'PASSIVE SURVEILLANCE', ticks: [30, 60, 120, 180] }
    };
    function _fmtSliderTick(v, tier) {
      if (tier === 'sentinel') return v + 'm';
      if (v < 60) return v + 'm';
      return Math.floor(v / 60) + 'h';
    }
    function _buildSliderTicks(tier) {
      if (!_sliderTicks) return;
      _sliderTicks.innerHTML = '';
      var cfg = _tierConfigs[tier];
      if (!cfg || !cfg.ticks) return;
      var range = cfg.max - cfg.min;
      for (var i = 0; i < cfg.ticks.length; i++) {
        var pct = ((cfg.ticks[i] - cfg.min) / range) * 100;
        var sp = document.createElement('span');
        sp.style.cssText = 'position:absolute;font-family:Courier New,monospace;font-size:8px;color:#666;transform:translateX(-50%);left:' + pct + '%;';
        sp.textContent = _fmtSliderTick(cfg.ticks[i], tier);
        _sliderTicks.appendChild(sp);
      }
    }
    function _updateSliderDisplay() {
      if (!_slider || !_sliderVal) return;
      var v = parseInt(_slider.value);
      var cfg = _tierConfigs[state.surveillanceTier || 'surveillance'];
      if (v >= 60) { var h = Math.floor(v / 60), m = v % 60; _sliderVal.textContent = m > 0 ? h + 'h ' + m + 'm' : h + 'h'; }
      else { _sliderVal.textContent = v + ' min'; }
      _sliderVal.style.color = cfg ? cfg.color : '#ff9f43';
    }
    function _selectTier(tier, isInit) {
      state.surveillanceTier = tier;
      var cfg = _tierConfigs[tier];
      _tierBtns.forEach(function(btn) {
        var t = btn.getAttribute('data-tier'), co = _tierConfigs[t];
        if (t === tier) { btn.style.background = co.color; btn.style.color = '#0a0a14'; }
        else { btn.style.background = 'none'; btn.style.color = co.color; }
      });
      if (_survTitle) { _survTitle.textContent = cfg.name; _survTitle.style.color = cfg.color; }
      if (tier === 'surveillance') {
        if (_sliderRow) _sliderRow.style.display = 'none';
        // Only reset interval if user clicked, not on page init
        if (!isInit) state.surveillanceNagInterval = 300000;
      } else {
        if (_sliderRow) _sliderRow.style.display = 'block';
        _slider.min = cfg.min; _slider.max = cfg.max; _slider.step = cfg.step;
        // On init, restore saved interval; on click, use default
        if (isInit && state.surveillanceNagInterval) {
          _slider.value = Math.round(state.surveillanceNagInterval / 60000);
        } else {
          _slider.value = cfg.def;
          state.surveillanceNagInterval = cfg.def * 60000;
        }
        _slider.style.accentColor = cfg.color;
        _buildSliderTicks(tier); _updateSliderDisplay();
      }
      if (!state.surveillanceActive) panel.style.borderColor = cfg.color;
      var descs = { surveillance: 'Full surveillance. Nags every 5 min without a focus timer. Escalates if ignored.', sentinel: 'Sentinel is watching. Adjust nag interval with the slider.', passive: 'Passive surveillance. Light-touch reminders at a relaxed interval.' };
      descEl.textContent = descs[tier] || descs.surveillance;
      if (!isInit) save();
    }
    _tierBtns.forEach(function(btn) { btn.addEventListener('click', function() { if (state.surveillanceActive) return; _selectTier(btn.getAttribute('data-tier'), false); }); });
    if (_slider) { _slider.addEventListener('input', function() { state.surveillanceNagInterval = parseInt(_slider.value) * 60000; _updateSliderDisplay(); }); }
    _selectTier(state.surveillanceTier || 'surveillance', true);
    var _tierPicker = document.getElementById('surveillanceTierPicker');
    function _updateTierPickerVisibility() {
      if (_tierPicker) _tierPicker.style.display = state.surveillanceActive ? 'none' : 'flex';
      if (_sliderRow && state.surveillanceActive) _sliderRow.style.display = 'none';
    }
    // Update timer display every second (shows seconds)
    setInterval(function() { updateSurveillanceUI(); _updateTierPickerVisibility(); }, 1000);

    // Old setInterval nag check removed — now runs inside updateSurveillanceUI (v3.22.57)

    // Initial render
    updateSurveillanceUI();

    // Daily opt-in prompt: if surveillance not active and hasn't been prompted today
    var todayDate = new Date().toISOString().slice(0, 10);
    if (!state.surveillanceActive && state.surveillanceDailyPromptDate !== todayDate) {
      setTimeout(function() {
        state.surveillanceDailyPromptDate = todayDate;
        save();
        // Show a subtle prompt within the panel
        descEl.innerHTML = '<span style="color:#ff9f43;">Daily check-in:</span> Want surveillance mode today? Pick a duration and hit START.';
        panel.style.borderColor = '#ff9f43';
        setTimeout(function() {
          if (!state.surveillanceActive) {
            panel.style.borderColor = '#ff6b6b';
            descEl.textContent = 'Select a surveillance tier and hit START.';
          }
        }, 30000); // Revert after 30s if not started
      }, 3000);
    }
  })();

  // v3.22.34: Standalone surveillance TEST button — simulates real escalation.
  // Opens challenge.html + Cold Turkey + notification, same as a real nag cycle reaching strike 3.
  try {
    var _survTestBtn = document.getElementById('surveillanceTestBtn');
    var _survDescEl = document.getElementById('surveillanceDesc');
    if (_survTestBtn) {
      _survTestBtn.addEventListener('click', function() {
        // Visual feedback
        try {
          if (_survDescEl) _survDescEl.innerHTML = '<span style="color:#ff9f43;font-weight:bold;">TEST ESCALATION FIRED!</span>';
          _survTestBtn.textContent = 'SENT!';
          _survTestBtn.style.color = '#00ff88';
          _survTestBtn.style.borderColor = '#00ff88';
          setTimeout(function() {
            _survTestBtn.textContent = 'TEST';
            _survTestBtn.style.color = '#ff6b6b';
            _survTestBtn.style.borderColor = '#ff6b6b';
          }, 3000);
        } catch(_) {}
        // Open surveillance nag window in test/preview mode (YES/NO don't count)
        try {
          chrome.runtime.sendMessage({ type: 'pf-open', path: 'surveillance-nag.html?test=1' });
        } catch(_) {}
        // Open Cold Turkey after delay (so nag tab fully settles, CT gets foreground)
        setTimeout(function() {
          try { openColdTurkeyApp(); } catch(_) {}
        }, 3000);
      });
    }
  } catch(_) {}

  // v3.22.59: Page-side distraction site nag — replaces broken chrome.alarms in Brave.
  // Runs every second for smooth countdown display + fires nag when countdown hits zero.
  // Escalating cooldowns: 5min → 10min → 10min → 2hr pause (same logic as old alarm handler).
  (function pageSideSiteNag() {
    var _siteNagFiring = false; // guard against re-entrant fires
    var _siteNagEls = [
      document.getElementById('siteNagCountdown'),      // Cold Turkey settings area
      document.getElementById('siteNagCountdownSurv')    // Surveillance panel
    ];
    function _updateSiteNagDisplay(html, borderColor, textColor) {
      for (var e = 0; e < _siteNagEls.length; e++) {
        if (!_siteNagEls[e]) continue;
        if (html === null) { _siteNagEls[e].style.display = 'none'; continue; }
        _siteNagEls[e].style.display = 'block';
        _siteNagEls[e].style.borderColor = borderColor || 'rgba(255,68,68,0.3)';
        _siteNagEls[e].style.color = textColor || '#ff6b6b';
        _siteNagEls[e].innerHTML = html;
      }
    }
    var _lastTabCheckAt = 0;
    var _lastMatchedSite = ''; // cache: last detected distraction site
    var _isOnDistraction = false; // cache: whether active tab is on a watchlisted site
    setInterval(function() {
      if (_siteNagFiring) return;
      var now = Date.now();
      try {
        chrome.storage.local.get('pixelFocusState', function(result) {
          var st = result.pixelFocusState;
          if (!st) return;
          // v3.23.19: Respect the on/off toggle
          if (st.siteNagEnabled === false) { _updateSiteNagDisplay(null); return; }
          var sites = st.coldTurkeyNagSites;
          if (!sites || !sites.length) {
            _updateSiteNagDisplay(null);
            _isOnDistraction = false;
            return;
          }

          // Don't nag if a focus timer is currently running
          if (st.timerEndsAt && st.timerEndsAt > now) {
            _updateSiteNagDisplay(null);
            _isOnDistraction = false;
            return;
          }

          // Escalating cooldowns: 3 nags then 2hr pause
          var unacked = st.siteNagUnackedCount || 0;
          var in2hrPause = false;
          if (unacked >= 3) {
            var TWO_HOURS = 2 * 60 * 60 * 1000;
            if (st.coldTurkeyLastSiteNagAt && (now - st.coldTurkeyLastSiteNagAt) < TWO_HOURS) {
              in2hrPause = true;
            } else {
              // 2 hours passed — reset
              st.siteNagUnackedCount = 0;
              unacked = 0;
              chrome.storage.local.set({ pixelFocusState: st });
            }
          }

          // Cooldown between nags: 0 → 5min → 10min → 10min
          var cooldown = (unacked === 0) ? 0 : (unacked === 1 ? 5 * 60 * 1000 : 10 * 60 * 1000);

          // Check ALL open tabs every 5 seconds for watchlist matches
          if (now - _lastTabCheckAt >= 5000) {
            _lastTabCheckAt = now;
            _siteNagFiring = true;
            try {
              chrome.tabs.query({}, function(tabs) {
                _siteNagFiring = false;
                if (!tabs || !tabs.length) {
                  _isOnDistraction = false;
                  _lastMatchedSite = '';
                  return;
                }
                var matched = false;
                var matchedSite = '';
                for (var t = 0; t < tabs.length; t++) {
                  var url = (tabs[t].url || '').toLowerCase();
                  if (!url || url.indexOf('chrome-extension://') === 0 || url.indexOf('chrome://') === 0
                      || url.indexOf('brave://') === 0 || url.indexOf('about:') === 0) continue;
                  for (var i = 0; i < sites.length; i++) {
                    if (url.indexOf(sites[i]) !== -1) { matched = true; matchedSite = sites[i]; break; }
                  }
                  if (matched) break;
                }
                _isOnDistraction = matched;
                _lastMatchedSite = matchedSite;
              });
            } catch(_) { _siteNagFiring = false; }
          }

          // Update countdown display (both surveillance panel + CT settings)
          if (!_isOnDistraction) {
            _updateSiteNagDisplay(null);
          } else if (in2hrPause) {
            // In 2hr pause after 3 strikes
            var pauseRemaining = Math.max(0, (st.coldTurkeyLastSiteNagAt + 2 * 60 * 60 * 1000) - now);
            var pH = Math.floor(pauseRemaining / 3600000);
            var pM = Math.floor((pauseRemaining % 3600000) / 60000);
            var pS = Math.floor((pauseRemaining % 60000) / 1000);
            _updateSiteNagDisplay(
              '&#9888; DISTRACTION: ' + _lastMatchedSite.toUpperCase()
              + '<br>3 STRIKES — PAUSED ' + pH + 'H ' + (pM < 10 ? '0' : '') + pM + 'M ' + (pS < 10 ? '0' : '') + pS + 'S',
              'rgba(255,159,67,0.3)', '#ff9f43'
            );
          } else if (cooldown > 0 && st.coldTurkeyLastSiteNagAt) {
            // Show countdown to next nag
            var nextNagAt = st.coldTurkeyLastSiteNagAt + cooldown;
            var remaining = Math.max(0, nextNagAt - now);
            var rM = Math.floor(remaining / 60000);
            var rS = Math.floor((remaining % 60000) / 1000);
            if (remaining > 0) {
              _updateSiteNagDisplay(
                '&#9888; DISTRACTION: ' + _lastMatchedSite.toUpperCase()
                + '<br>NAG ' + (unacked + 1) + '/3 IN: ' + rM + 'M ' + (rS < 10 ? '0' : '') + rS + 'S'
              );
            } else {
              _updateSiteNagDisplay(
                '&#9888; DISTRACTION: ' + _lastMatchedSite.toUpperCase()
                + '<br>NAG IMMINENT...'
              );
            }

            // Fire when countdown reaches zero
            if (remaining <= 0) {
              st.coldTurkeyLastSiteNagAt = Date.now();
              st.siteNagUnackedCount = (st.siteNagUnackedCount || 0) + 1;
              chrome.storage.local.set({ pixelFocusState: st });
              try {
                chrome.runtime.sendMessage({ type: 'SITE_NAG_FIRE', nagNum: st.siteNagUnackedCount });
              } catch(_) {}
            }
          } else {
            // First nag — fire immediately
            _updateSiteNagDisplay(
              '&#9888; DISTRACTION: ' + _lastMatchedSite.toUpperCase()
              + '<br>FIRING NAG 1/3...'
            );
            st.coldTurkeyLastSiteNagAt = Date.now();
            st.siteNagUnackedCount = (st.siteNagUnackedCount || 0) + 1;
            chrome.storage.local.set({ pixelFocusState: st });
            try {
              chrome.runtime.sendMessage({ type: 'SITE_NAG_FIRE', nagNum: st.siteNagUnackedCount });
            } catch(_) {}
          }
        });
      } catch(_) {}
    }, 1000); // every second for smooth countdown
  })();

  function beginActualSession() {
    SFX.startTimer();
    _gameLockGraceUntil = 0; // v3.21.10: new session cancels any grace window
    state.gameLockGraceUntil = 0;
    state.timerState = 'running';
    // Anchor the session to a wall-clock end time. Now + whatever is
    // left on the clock. The tick reads this directly rather than
    // decrementing timerRemaining, so Chrome's background-tab throttling
    // (which clamps setInterval to ~1/min after 5 min backgrounded) can't
    // make the timer silently lose real-world time.
    if (!state.timerRemaining || state.timerRemaining <= 0) {
      state.timerRemaining = state.sessionDurationSec || 600;
    }
    state.timerEndsAt = Date.now() + (state.timerRemaining * 1000);
    // v3.22.25: Record when a focus timer was last started (for idle reminders)
    state.lastStartedSessionAt = Date.now();
    // v3.23.8: Preemptively stamp idle-challenge spam guards so even if a background
    // alarm reads stale timerState, the spam guard blocks the notification.
    state.coldTurkeyLastIdleOpen = Date.now();
    state.focusIdleLastNudge = Date.now();
    // v3.23.14: Kill the idle challenge alarms entirely. The storage.onChanged
    // listener in background.js does this too, but clearing from both sides
    // eliminates any race window. Alarms are recreated when the session ends.
    try { chrome.alarms.clear('pixelfocus-ct-idle'); } catch(_) {}
    try { chrome.alarms.clear('pixelfocus-focus-idle'); } catch(_) {}
    // v3.23.8: Also clear any stale idle challenge notifications from the OS tray
    try {
      chrome.notifications.getAll(function(all) {
        Object.keys(all).forEach(function(id) {
          if (id.indexOf('ct-idle') === 0 || id === 'focus-idle-nudge') {
            chrome.notifications.clear(id);
          }
        });
      });
    } catch(_) {}
    // v3.21.17: Record session start for the daily timeline.
    state._sessionStartedAt = Date.now();
    save();
    render();
    // v3.21.15: Start Cold Turkey block for the session duration.
    var sessionMinutes = Math.ceil((state.timerRemaining || 600) / 60);
    triggerColdTurkey('start', sessionMinutes);
    try { if (typeof MsgLog !== 'undefined') MsgLog.push('Shuttle in motion. Master Loom primed.'); } catch(_){}
    // NOTE: The 10-minute honor-system check-in is DELIBERATELY NOT
    // armed here any more. For 10-min sessions it was a no-op (session
    // ends before the check fires). For 20/30/60-min sessions it popped
    // a modal every 10 min asking "did you focus for 10 minutes?", which
    // broke flow during long deep-work runs and got blamed for credit
    // loss. The end-of-session confirmation modal is the canonical
    // honesty check for every session length now.
    try { cancelWorkCheckIn(); } catch (_) {}
    // v3.19.12: clear the focus-confirmation latch so a fresh session
    // gets a fresh chance to arm the modal. Without this, if the
    // previous session ever left the latch set (shouldn't happen, but
    // belt-and-suspenders), the next session's completion modal
    // would silently refuse to show.
    try { clearFocusConfirmLatch(); } catch (_) {}
    armTimerTick();
  }

  // v3.21.38: Check if near a blocked time and show task picker
  function _isNearBlockedTime() {
    if (!state.blockedTimes || !state.blockedTimes.length) return null;
    var now = Date.now();
    var alertLeadMs = 75 * 60 * 1000; // 1h15m
    for (var i = 0; i < state.blockedTimes.length; i++) {
      var bt = state.blockedTimes[i];
      if (now >= (bt.startMs - alertLeadMs) && now < bt.startMs) {
        return bt;
      }
    }
    return null;
  }

  var _preBlockPickerCallback = null; // function to call after picker resolves

  function _showPreBlockPicker(nearBlock, onDone) {
    var modal = document.getElementById('preBlockPickerModal');
    var alertEl = document.getElementById('preBlockPickerAlert');
    var listEl = document.getElementById('preBlockPickerList');
    var durStep = document.getElementById('preBlockPickerDurStep');
    if (!modal) { onDone(); return; }

    _preBlockPickerCallback = onDone;
    if (durStep) durStep.style.display = 'none';

    // Alert text with time until block
    if (alertEl) {
      alertEl.innerHTML = _buildBlockTimeline(nearBlock) + '<br>Limited runway \u2014 what will you work on?';
    }

    // Build task list from today's tasks
    if (listEl) {
      listEl.innerHTML = '';
      var todayTasks = Array.isArray(state.todayTasks) ? state.todayTasks : [];
      // Also include priority tasks
      var priTasks = (Array.isArray(state.priorities) ? state.priorities : []).filter(function(p) { return !p.completedDate; });

      var allPickable = [];
      todayTasks.forEach(function(t) { allPickable.push({ id: t.id, text: t.text, type: 'today', recurring: !!t.sourceType }); });
      priTasks.forEach(function(p) { allPickable.push({ id: p.id, text: p.text, type: 'priority', recurring: !!(p.recurrence && p.recurrence !== 'none') }); });

      if (allPickable.length === 0) {
        listEl.innerHTML = '<div style="padding:8px;color:#886655;font-size:11px;font-style:italic;">No tasks available. Add tasks to Today\'s Tasks or High Priority first.</div>';
      } else {
        allPickable.forEach(function(task) {
          var row = document.createElement('button');
          row.type = 'button';
          row.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:rgba(255,140,58,0.06);border:1px solid rgba(255,140,58,0.25);border-radius:6px;padding:8px 10px;margin-bottom:4px;cursor:pointer;color:#ffe0b2;font-size:11px;font-family:"Courier New",monospace;';
          var badge = document.createElement('span');
          badge.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:6px;color:' + (task.type === 'priority' ? '#ff6b6b' : '#ffb43c') + ';border:1px solid;border-radius:3px;padding:1px 4px;white-space:nowrap;';
          badge.textContent = task.type === 'priority' ? 'PRI' : 'TODAY';
          row.appendChild(badge);
          var txt = document.createElement('span');
          txt.style.cssText = 'flex:1;';
          txt.textContent = task.text;
          row.appendChild(txt);
          row.addEventListener('click', function() {
            _preBlockPickerShowDuration(task, nearBlock);
          });
          listEl.appendChild(row);
        });
      }
    }

    modal.style.display = 'flex';
  }

  function _preBlockPickerShowDuration(task, nearBlock) {
    var durStep = document.getElementById('preBlockPickerDurStep');
    var nameEl = document.getElementById('preBlockPickerTaskName');
    var btnsEl = document.getElementById('preBlockPickerDurBtns');
    if (!durStep || !btnsEl) return;

    if (nameEl) nameEl.textContent = '\u201C' + task.text + '\u201D';

    var remembered = null;
    if (task.recurring && state.taskDurations) {
      remembered = state.taskDurations[_normalizeText(task.text)];
    }

    var durOpts = [5, 10, 15, 20, 30, 45, 60, 90, 120];
    var html = '';
    for (var i = 0; i < durOpts.length; i++) {
      var d = durOpts[i];
      var label = d < 60 ? d + 'min' : (d === 60 ? '1hr' : (d === 90 ? '1.5hr' : '2hr'));
      var isRem = remembered === d;
      html += '<button class="pbp-dur-btn" data-dur="' + d + '" style="background:' + (isRem ? '#ff8c3a' : '#1a1a3a') + ';color:' + (isRem ? '#08080f' : '#ff8c3a') + ';border:1px solid #ff8c3a;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;">' + label + (isRem ? ' \u2605' : '') + '</button>';
    }
    btnsEl.innerHTML = html;

    var btns = btnsEl.querySelectorAll('.pbp-dur-btn');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function() {
        var dur = parseInt(this.getAttribute('data-dur'), 10);
        // Remember for recurring
        if (task.recurring && dur > 0) {
          if (!state.taskDurations) state.taskDurations = {};
          state.taskDurations[_normalizeText(task.text)] = dur;
        }
        // Commit as Do Now
        _doNowPending = { taskId: task.id, text: task.text, recurring: task.recurring };
        _commitDoNow(dur);
        // Close picker and proceed with timer
        var modal = document.getElementById('preBlockPickerModal');
        if (modal) modal.style.display = 'none';
        if (_preBlockPickerCallback) { _preBlockPickerCallback(); _preBlockPickerCallback = null; }
      });
    }

    durStep.style.display = 'block';
  }

  // Wire pre-block picker close/skip
  (function() {
    var closeBtn = document.getElementById('preBlockPickerCloseBtn');
    var skipBtn = document.getElementById('preBlockPickerSkip');
    var modal = document.getElementById('preBlockPickerModal');
    function dismiss() {
      if (modal) modal.style.display = 'none';
      if (_preBlockPickerCallback) { _preBlockPickerCallback(); _preBlockPickerCallback = null; }
    }
    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    if (skipBtn) skipBtn.addEventListener('click', dismiss);
    if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) dismiss(); });
  })();

  // v3.23.2: Penalty countdown confirmation modal
  function showPenaltyConfirm(title, message, onConfirm) {
    // Remove any existing modal
    var existing = document.getElementById('penaltyConfirmModal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'penaltyConfirmModal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#12122a;border:2px solid #ff4466;border-radius:14px;padding:24px 28px;max-width:360px;width:90%;text-align:center;box-shadow:0 0 40px rgba(255,68,102,0.3);';

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:10px;color:#ff4466;letter-spacing:2px;margin-bottom:14px;';
    titleEl.textContent = title;

    var msgEl = document.createElement('div');
    msgEl.style.cssText = 'font-size:12px;color:#e0e0e0;line-height:1.6;margin-bottom:20px;font-family:"Segoe UI",sans-serif;';
    msgEl.textContent = message;

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    var yesBtn = document.createElement('button');
    yesBtn.textContent = 'YES, DO IT';
    yesBtn.style.cssText = 'background:linear-gradient(135deg,#ff4466,#ff6b6b);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;letter-spacing:1px;';
    yesBtn.addEventListener('click', function() {
      overlay.remove();
      onConfirm();
    });

    var noBtn = document.createElement('button');
    noBtn.textContent = 'KEEP GOING';
    noBtn.style.cssText = 'background:none;border:1px solid #00ff88;color:#00ff88;border-radius:8px;padding:10px 20px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;letter-spacing:1px;';
    noBtn.addEventListener('click', function() {
      overlay.remove();
    });

    btnRow.appendChild(noBtn);
    btnRow.appendChild(yesBtn);
    box.appendChild(titleEl);
    box.appendChild(msgEl);
    box.appendChild(btnRow);
    overlay.appendChild(box);

    // Click outside to dismiss (same as "KEEP GOING")
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function startTimer() {
    // Abort an in-progress pre-start countdown — user tapped START again
    // during the grace period, they want out.
    if (state.timerState === 'countdown') {
      cancelPreStartCountdown();
      state.timerState = 'idle';
      save();
      render();
      return;
    }
    if (state.timerState === 'running') {
      // v3.23.2: Warn if a penalty countdown is active — pausing resumes the penalty timer
      if (state.penaltyCountdownActive && !window._penaltyPauseConfirmed) {
        showPenaltyConfirm(
          'PAUSE — ARE YOU SURE?',
          'A penalty countdown is active. Pausing this session will resume the $300 penalty timer.',
          function() {
            window._penaltyPauseConfirmed = true;
            startTimer(); // re-enter, this time it'll skip the confirm
            window._penaltyPauseConfirmed = false;
          }
        );
        return;
      }
      window._penaltyPauseConfirmed = false;
      // Snapshot the true wall-clock remaining time BEFORE clearing
      // timerEndsAt, otherwise a paused-then-resumed long session would
      // resume with a stale pre-pause count.
      if (state.timerEndsAt) {
        var remMs = state.timerEndsAt - Date.now();
        state.timerRemaining = Math.max(0, Math.ceil(remMs / 1000));
      }
      state.timerEndsAt = 0;
      state.timerState = 'paused';
      // v3.21.51: Pausing voids the idle challenge bonus
      if (state.challengeActive) state.challengeSessionPaused = true;
      clearInterval(timerInterval);
      timerInterval = null;
      try { cancelWorkCheckIn(); } catch (_) {}
      save();
      render();
      return;
    }
    // Resuming from paused — user is already in the zone, skip the
    // grace period and go straight back to running.
    if (state.timerState === 'paused') {
      beginActualSession();
      return;
    }
    // Fresh start from idle (or mid-session after a reset).
    // v3.21.38: If near a blocked time, show task picker first.
    var _nearBlock = _isNearBlockedTime();
    if (_nearBlock && !state._preBlockPickerShown) {
      state._preBlockPickerShown = true; // prevent re-triggering on the same START
      _showPreBlockPicker(_nearBlock, function() {
        // After picker resolves (task picked or skipped), actually start
        state._preBlockPickerShown = false;
        _actuallyStartTimer();
      });
      return;
    }
    state._preBlockPickerShown = false;
    _actuallyStartTimer();
  }

  function _actuallyStartTimer() {
    // v3.23.82: Market first-use modal — fires once before the player's
    // first focus session after the market unlocks (marketingLevel >= 1).
    if ((state.marketingLevel || 0) >= 1 && !state.hasSeenMarketIntro) {
      showMarketIntroModal(function() {
        _actuallyStartTimer(); // re-enter after dismissal
      });
      return;
    }
    // Run the 15-second "get ready" countdown, THEN start the real session.
    cancelPreStartCountdown();
    countdownRemaining = COUNTDOWN_SECONDS;
    state.timerState = 'countdown';
    _tlPreviewDurationSec = 0; // v3.23.6: clear preview — real session takes over
    // v3.23.8: Stamp idle-challenge spam guards early (countdown phase)
    state.coldTurkeyLastIdleOpen = Date.now();
    state.focusIdleLastNudge = Date.now();
    state.lastStartedSessionAt = Date.now();
    // v3.23.14: Kill idle alarms during countdown too (belt-and-suspenders)
    try { chrome.alarms.clear('pixelfocus-ct-idle'); } catch(_) {}
    try { chrome.alarms.clear('pixelfocus-focus-idle'); } catch(_) {}
    // v3.23.9: Clear any stale idle-challenge notifications sitting in the tray.
    // The notification may have fired BEFORE the user started the timer, but it
    // lingers in the OS notification tray and feels like it fired during the session.
    try {
      chrome.notifications.getAll(function(notifs) {
        for (var id in notifs) {
          if (id.indexOf('ct-idle-') === 0 || id === 'focus-idle-nudge') {
            chrome.notifications.clear(id);
          }
        }
      });
    } catch(_) {}
    try { SFX.tick(); } catch (_) {}
    save();
    render();
    countdownInterval = setInterval(() => {
      try {
        countdownRemaining--;
        if (countdownRemaining > 0) {
          // Soft tick every second so the user can hear the runway.
          try { SFX.tick(); } catch (_) {}
          renderTimer();
        } else {
          clearInterval(countdownInterval);
          countdownInterval = null;
          // Guard: if user hit reset / switched windows mid-countdown,
          // don't slam into running state over their cancel.
          if (state.timerState !== 'countdown') return;
          beginActualSession();
        }
      } catch (err) {
        console.error('Countdown tick error:', err);
      }
    }, 1000);
  }

  // Legacy entry point no longer used by the tick — kept as a dead
  // stub so any outside callers (should be none) don't crash.
  function __oldStartTimerInterval_unused() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      try {
        if (state.timerRemaining > 0) {
          state.timerRemaining--;
          if (state.timerRemaining % 60 === 0 && state.timerRemaining > 0) SFX.tick();
          save();
          renderTimer();
          renderBlockProgress();
        } else {
          clearInterval(timerInterval);
          timerInterval = null;
          state.timerRemaining = 0;
          state.timerState = 'completed';
          SFX.timerComplete();
          // Session finished — cancel the honor-system check-in.
          // The end-of-session confirmation modal is the canonical
          // check-in for completed sessions.
          try { cancelWorkCheckIn(); } catch (_) {}
          save();
          render();
          showFocusConfirmation();
        }
      } catch(err) {
        console.error('Timer tick error:', err);
      }
    }, 1000);
  }

  function resetTimer() {
    // v3.23.2: Warn if a penalty countdown is active — resetting triggers the $300 penalty
    if (state.penaltyCountdownActive && (state.timerState === 'running' || state.timerState === 'paused' || state.timerState === 'countdown') && !window._penaltyResetConfirmed) {
      showPenaltyConfirm(
        'RESET — ARE YOU SURE?',
        'A penalty countdown is active. Resetting will trigger the $300 penalty.',
        function() {
          window._penaltyResetConfirmed = true;
          resetTimer();
          window._penaltyResetConfirmed = false;
        }
      );
      return;
    }
    window._penaltyResetConfirmed = false;
    clearInterval(timerInterval);
    timerInterval = null;
    // Also kill any in-progress 15-second pre-start countdown.
    cancelPreStartCountdown();
    _gameLockGraceUntil = 0; // v3.21.10: manual reset cancels grace window
    state.gameLockGraceUntil = 0;
    state.timerState = 'idle';
    state.timerRemaining = state.sessionDurationSec || 600;
    state.timerEndsAt = 0;
    // Reset combo on manual reset
    state.combo = 0;
    // v3.21.51: Manual reset clears idle challenge
    state.challengeActive = false;
    state.challengeAcceptedAt = 0;
    state.challengeSessionPaused = false;
    // Reset stops the honor-system check-in clock.
    try { cancelWorkCheckIn(); } catch (_) {}
    // v3.19.12: a manual reset clears the focus-confirmation latch
    // so the next completed session can arm a fresh modal.
    try { clearFocusConfirmLatch(); } catch (_) {}
    save();
    render();
  }

  // ============== POP-OUT ALWAYS-ON-TOP TIMER ==============
  // A small always-on-top window that mirrors the main timer, so you
  // can keep an eye on the countdown while you actually do the work in
  // another tab or app. Uses the Document Picture-in-Picture API
  // (Chrome 116+) which gives us a real OS-level always-above window
  // that contains arbitrary HTML. Falls back to a plain window if the
  // API isn't available.
  //
  // The pop-out is purely a mirror — all state lives in the main tab
  // and renderTimer() pushes updates to pipWindow on every tick.
  let pipWindow = null;

  function buildPipMarkup() {
    // Returns the full HTML for the pop-out window's body. v3.19.14:
    // compact rounded pill — circular play/pause button on the left,
    // clock + label on the right, thin progress bar along the bottom.
    // Styled inline so we don't have to propagate CSS vars into the
    // PiP document. The click handler for #pipPlayPause is attached
    // from the main tab after the document is written, so the button
    // calls the real startTimer() in the parent scope.
    return '' +
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Todo of the Loom Timer</title>' +
      '<style>' +
      '  html,body{margin:0;padding:0;background:#0a0a14;color:#4ecdc4;font-family:"Press Start 2P","Courier New",monospace;overflow:hidden;height:100%;}' +
      '  .pip-card{position:relative;height:100%;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:8px 14px 10px 10px;background:linear-gradient(180deg,#10101c 0%,#0a0a14 100%);border:1px solid #1f1f30;border-radius:18px;margin:4px;overflow:hidden;}' +
      '  .pip-btn{flex:0 0 auto;width:40px;height:40px;border-radius:50%;border:2px solid #4ecdc4;background:#0a0a14;color:#4ecdc4;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;transition:transform 0.1s,box-shadow 0.2s,background 0.2s;box-shadow:0 0 10px rgba(78,205,196,0.3);font-family:inherit;}' +
      '  .pip-btn:hover{transform:scale(1.05);box-shadow:0 0 14px rgba(78,205,196,0.55);}' +
      '  .pip-btn:active{transform:scale(0.95);}' +
      '  .pip-btn.running{border-color:#ffd700;color:#ffd700;box-shadow:0 0 10px rgba(255,215,0,0.35);}' +
      '  .pip-btn.running:hover{box-shadow:0 0 14px rgba(255,215,0,0.55);}' +
      '  .pip-btn.countdown{border-color:#ffd700;color:#ffd700;animation:pipPulse 1s infinite;}' +
      '  .pip-btn.done{border-color:#ff6b6b;color:#ff6b6b;}' +
      '  .pip-btn svg{width:16px;height:16px;display:block;}' +
      '  @keyframes pipPulse{0%,100%{box-shadow:0 0 10px rgba(255,215,0,0.35);}50%{box-shadow:0 0 18px rgba(255,215,0,0.75);}}' +
      '  .pip-info{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;line-height:1;}' +
      '  .pip-label{font-size:7px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}' +
      '  .pip-clock{font-size:26px;font-weight:bold;letter-spacing:1px;color:#4ecdc4;text-shadow:0 0 8px rgba(78,205,196,0.45);line-height:1;}' +
      '  .pip-clock.countdown{color:#ffd700;text-shadow:0 0 8px rgba(255,215,0,0.5);}' +
      '  .pip-clock.paused{color:#888;text-shadow:none;}' +
      '  .pip-clock.done{color:#ff6b6b;text-shadow:0 0 8px rgba(255,107,107,0.6);}' +
      '  .pip-bar{position:absolute;left:10px;right:10px;bottom:4px;height:3px;background:#1a1a28;border-radius:2px;overflow:hidden;}' +
      '  .pip-bar-fill{height:100%;background:#4ecdc4;transition:width 0.3s,background 0.2s;}' +
      '  .pip-bar-fill.countdown{background:#ffd700;}' +
      '  .pip-bar-fill.done{background:#ff6b6b;}' +
      '</style></head><body>' +
      '<div class="pip-card">' +
      '  <button type="button" class="pip-btn" id="pipPlayPause" title="Start / pause the timer" aria-label="Start or pause timer">' +
      '    <svg id="pipBtnIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
      '  </button>' +
      '  <div class="pip-info">' +
      '    <div class="pip-label" id="pipLabel">FOCUS</div>' +
      '    <div class="pip-clock" id="pipClock">00:00</div>' +
      '  </div>' +
      '  <div class="pip-bar"><div class="pip-bar-fill" id="pipBarFill" style="width:0%"></div></div>' +
      '</div></body></html>';
  }

  // SVG path data for the play / pause / stop icons in the PiP button.
  var PIP_ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  var PIP_ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  var PIP_ICON_STOP = '<path d="M6 6h12v12H6z"/>';

  function openPopOutTimer() {
    if (pipWindow) {
      // Already open — just focus it and refresh.
      try { pipWindow.focus(); } catch (_) {}
      try { renderPopOutTimer(); } catch (_) {}
      return;
    }
    // Prefer Document Picture-in-Picture (actually always-on-top).
    if (window.documentPictureInPicture && typeof window.documentPictureInPicture.requestWindow === 'function') {
      // v3.19.14: slimmer footprint now that the pill is rounded and
      // has its own play/pause button — was 240x150, now 220x78.
      window.documentPictureInPicture.requestWindow({ width: 220, height: 78 })
        .then(function(win) {
          pipWindow = win;
          // Write the full document. open/close/write is the cleanest
          // way to populate a PiP window's body.
          try {
            win.document.open();
            win.document.write(buildPipMarkup());
            win.document.close();
          } catch (e) {
            console.error('Failed to write PiP document:', e);
          }
          // When the user closes the PiP window manually (or the main
          // tab navigates), drop the handle so the next click re-opens.
          try {
            win.addEventListener('pagehide', function() { pipWindow = null; });
            win.addEventListener('unload', function() { pipWindow = null; });
          } catch (_) {}
          // v3.19.14: wire the built-in play/pause button to the real
          // startTimer() in the parent scope. The button lives in the
          // PiP document but the click handler is a closure here, so
          // it gets full access to state + startTimer + render logic.
          try {
            var btn = win.document.getElementById('pipPlayPause');
            if (btn) {
              btn.addEventListener('click', function(ev) {
                try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
                try { startTimer(); } catch (err) { console.error('PiP button startTimer failed:', err); }
                try { renderPopOutTimer(); } catch (_) {}
              });
            }
          } catch (_) {}
          try { renderPopOutTimer(); } catch (_) {}
          try {
            if (typeof MsgLog !== 'undefined') {
              MsgLog.push('Pop-out timer floated. It stays above other windows while the session runs.');
            }
          } catch (_) {}
        })
        .catch(function(err) {
          console.error('documentPictureInPicture failed:', err);
          notify('Pop-out timer unavailable in this browser.', 'var(--warning)');
        });
      return;
    }
    // Fallback: no Document PiP — tell the user.
    notify('Pop-out timer needs Chrome 116 or newer.', 'var(--warning)');
  }

  function renderPopOutTimer() {
    if (!pipWindow || !pipWindow.document) return;
    var doc;
    try { doc = pipWindow.document; } catch (_) { pipWindow = null; return; }
    var clock = doc.getElementById('pipClock');
    var label = doc.getElementById('pipLabel');
    var fill = doc.getElementById('pipBarFill');
    var btn = doc.getElementById('pipPlayPause');
    var btnIcon = doc.getElementById('pipBtnIcon');
    if (!clock || !label || !fill) return;

    // Reset state classes on clock / fill / button each tick.
    clock.classList.remove('countdown', 'paused', 'done');
    fill.classList.remove('countdown', 'done');
    if (btn) btn.classList.remove('running', 'countdown', 'done');

    var dur = state.sessionDurationSec || 600;

    if (state.timerState === 'countdown') {
      var cs = Math.max(0, countdownRemaining);
      clock.textContent = '00:' + String(cs).padStart(2, '0');
      clock.classList.add('countdown');
      fill.classList.add('countdown');
      label.textContent = 'GET READY';
      fill.style.width = ((COUNTDOWN_SECONDS - cs) / COUNTDOWN_SECONDS * 100) + '%';
      if (btn) {
        btn.classList.add('countdown');
        btn.title = 'Cancel countdown';
      }
      if (btnIcon) btnIcon.innerHTML = PIP_ICON_STOP;
    } else if (state.timerState === 'completed') {
      clock.textContent = '00:00';
      clock.classList.add('done');
      fill.classList.add('done');
      label.textContent = 'COMPLETE';
      fill.style.width = '100%';
      if (btn) {
        btn.classList.add('done');
        btn.title = 'Session complete';
      }
      if (btnIcon) btnIcon.innerHTML = PIP_ICON_STOP;
    } else {
      var mins = Math.floor(state.timerRemaining / 60);
      var secs = state.timerRemaining % 60;
      clock.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      if (state.timerState === 'paused') {
        clock.classList.add('paused');
        label.textContent = 'PAUSED';
        if (btnIcon) btnIcon.innerHTML = PIP_ICON_PLAY;
        if (btn) btn.title = 'Resume';
      } else if (state.timerState === 'running') {
        label.textContent = (dur / 60) + '-MIN FOCUS';
        if (btn) btn.classList.add('running');
        if (btnIcon) btnIcon.innerHTML = PIP_ICON_PAUSE;
        if (btn) btn.title = 'Pause';
      } else {
        label.textContent = (dur / 60) + '-MIN READY';
        if (btnIcon) btnIcon.innerHTML = PIP_ICON_PLAY;
        if (btn) btn.title = 'Start';
      }
      var pct = ((dur - state.timerRemaining) / dur) * 100;
      fill.style.width = pct + '%';
    }
  }

  function closePopOutTimer() {
    if (pipWindow) {
      try { pipWindow.close(); } catch (_) {}
      pipWindow = null;
    }
  }

  // How many textiles a completed session earns, plus a commitment bonus for
  // the long runs. Returns { blocks, bonus } — total produced = blocks + bonus.
  function getSessionReward(sec) {
    sec = parseInt(sec, 10) || 600;
    if (sec >= 5400) return { blocks: 9, bonus: 5, label: '90-minute ultra marathon' };
    if (sec >= 3600) return { blocks: 6, bonus: 3, label: '60-minute marathon' };
    if (sec >= 1800) return { blocks: 3, bonus: 1, label: '30-minute deep run' };
    if (sec >= 1200) return { blocks: 2, bonus: 0, label: '20-minute double' };
    return { blocks: 1, bonus: 0, label: '10-minute session' };
  }

  // ============== EARN BLOCK ==============
  function earnBlock() {
    // Increment combo
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    if (state.combo > state.maxComboToday) state.maxComboToday = state.combo;

    // v3.19.17: stamp the 5-hour passive-income gate. Every completed
    // 10-minute session refreshes the clock. If the player goes quiet
    // for 3+ days the passive trickle, the Annex uplift, and the
    // institution flat bonuses all pause until they return and run
    // a session, at which point passive income resumes live.
    state.lastCompletedSessionAt = Date.now();
    // v3.22.72: Reset surveillance nag anchor so next nag is 5 min from now, not from session start
    if (state.surveillanceActive) {
      state.surveillanceLastNag = Date.now();
      state.surveillanceNagCount = 0;
    }

    // Calculate XP
    const xpGain = calculateXPGain(state.combo, state.streak);
    const oldLevel = getLevelFromXP(state.xp).level;

    state.xp += xpGain;
    state.todayXP += xpGain;
    state.lastBlockTime = Date.now();

    const newLevel = getLevelFromXP(state.xp).level;
    // v3.21.52: Keep state.level in sync so the events engine can gate by tier.
    state.level = newLevel;

    // ===== Session textile award =====
    // Base: 1 textile per 10-minute session. On top of that:
    //   - Quality Control rolls for a bonus textile (5 levels: 10% → 80%)
    //   - Research Division multiplies the QC bonus chance
    //   - AI Loom adds its own independent bonus textile chance
    //   - Second Location + Planetary Coverage multiply the final total
    // The result is rounded and at least 1 so a regular session never
    // produces less than one textile regardless of multipliers.
    var sessionTextiles = 1;

    // Quality Control bonus textile (now amplified by Research Division)
    var qcLevel = state.qualityControlLevel || 0;
    if (qcLevel > 0) {
      var qcChance = [0, 0.10, 0.20, 0.35, 0.55, 0.80][Math.min(qcLevel, 5)];
      qcChance = Math.min(1, qcChance * getResearchMult());
      if (Math.random() < qcChance) {
        sessionTextiles += 1;
      }
    }

    // AI Loom independent bonus textile chance (stacks with QC)
    var aiBonusChance = getAILoomBonusTextileChance();
    if (aiBonusChance > 0) {
      // If the bonus chance exceeds 100% it guarantees one textile and
      // rolls the remainder for a second — this only happens deep in
      // the AI Loom tree (L7+).
      if (aiBonusChance >= 1) {
        sessionTextiles += 1;
        if (Math.random() < (aiBonusChance - 1)) sessionTextiles += 1;
      } else if (Math.random() < aiBonusChance) {
        sessionTextiles += 1;
      }
    }

    // Second Location + World Span multiplier on the whole haul
    var textileMult = getTotalTextileMult();
    if (textileMult > 1) {
      sessionTextiles = Math.max(1, Math.round(sessionTextiles * textileMult));
    }

    state.blocks += sessionTextiles;
    state.todayBlocks += sessionTextiles;
    state.totalLifetimeBlocks += sessionTextiles;
    // v3.23.35: Start streak at 1 on first focus session of the day
    if ((state.streak || 0) === 0 && state.todayBlocks > 0) {
      state.streak = 1;
      if (state.longestStreak < 1) state.longestStreak = 1;
    }
    // Real streak also starts at 1 on first session
    if ((state.realStreak || 0) === 0 && state.todayBlocks > 0) {
      state.realStreak = 1;
      if ((state.longestRealStreak || 0) < 1) state.longestRealStreak = 1;
    }
    state.sessionBlocks++; // still counts 1 session regardless of haul
    state.lifetimeSessions = (state.lifetimeSessions || 0) + 1;
    if (typeof marketYield !== 'undefined') state.lastMarketYield = marketYield;
    state.lifetimeSessions = (state.lifetimeSessions || 0) + 1;
    if (typeof marketYield !== 'undefined') state.lastMarketYield = marketYield;
    // Drain the resource pools by the amount actually produced. This
    // call also fires depletion milestone chat lines and may flip the
    // ledger reveal on factory.html.
    try { consumeResources(sessionTextiles); } catch(_) {}
    if (sessionTextiles > 1) {
      notify('+' + sessionTextiles + ' textiles this session', '#4ecdc4');
    }
    try {
      if (typeof MsgLog !== 'undefined') {
        MsgLog.push('Textile #' + state.totalLifetimeBlocks + ' woven. Cloth beam advances.');
      }
    } catch(_) {}

    // Update task
    if (state.selectedTaskId) {
      const task = findTask(state.selectedTaskId);
      if (task) task.blocksEarned = (task.blocksEarned || 0) + 1;
    }

    // Award combo-burst money (separate from textiles): only fires when you
    // actually chain sessions consecutively (combo >= 2). One isolated 10-min
    // session produces a textile but NO money — money requires chaining.
    if (state.combo >= 2) {
      var comboCoins = getComboCoinPayout(state.combo);
      // ===== Marketing upgrade: each level multiplies combo coin payouts =====
      // Level 1 = x1.25, level 2 = x1.6, level 3 = x2.0, level 4 = x2.5, level 5 = x3.0
      var mktLevel = state.marketingLevel || 0;
      if (mktLevel > 0) {
        var mktMult = [1, 1.25, 1.6, 2.0, 2.5, 3.0][Math.min(mktLevel, 5)];
        comboCoins = Math.round(comboCoins * mktMult);
      }
      // v3.23.84: Market yield multiplier — applies market conditions to
      // focus session money. The multiplier was computed by MarketEngine at
      // session start and stays between 0.3x and 2.5x. Default 1.0x if the
      // market system hasn't been unlocked yet.
      var marketYield = state.marketYieldMultiplier || 1.0;
      state.lastMarketYield = marketYield;  // persist for yield display
      comboCoins = Math.round(comboCoins * marketYield);
      if (comboCoins > 0) awardCoins(comboCoins, state.combo + 'x chain' + (marketYield !== 1.0 ? ' [' + marketYield + 'x mkt]' : ''));
    }

    // Check daily marathon thresholds (1h/2h/3h/4h/6h/8h focus today)
    checkMarathonBonuses();

    // Check color unlocks
    const newColors = syncMilestoneColors();

    // Notifications
    let comboText = state.combo >= 2 ? ` 🔥 ${state.combo}x Combo!` : '';
    notify(`+1 Textile earned! +${xpGain} XP${comboText}`, 'var(--accent)');

    if (state.combo >= 2) SFX.comboUp();

    if (newLevel > oldLevel) {
      setTimeout(() => {
        SFX.levelUp();
        notify(`🎉 LEVEL UP! You are now Level ${newLevel} — ${getLevelTitle(newLevel)}!`, '#ffd700');
      }, 500);
    }

    if (newColors.length > 0) {
      setTimeout(() => {
        notify(`New color${newColors.length > 1 ? 's' : ''} unlocked: ${newColors.join(', ')}!`, '#ff6b9d');
      }, newLevel > oldLevel ? 3000 : 500);
    }

    // Chrome notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Todo of the Loom - Textile Earned!',
      message: `+${xpGain} XP (${state.combo}x combo) | Total textiles today: ${state.todayBlocks}`
    });

    save();
  }

  // ============== FOCUS CONFIRMATION ==============
  // v3.19.12: module-scoped guard preventing the double-credit bug.
  // Previously, showFocusConfirmation() could be called more than once
  // in rapid succession (e.g. the armTimerTick completion path firing
  // at the same instant as the visibilitychange-on-return handler, or
  // the load() reload handler's deferred call racing with either of
  // those). Each call used addEventListener('click', ...) on the same
  // yesBtn without first clearing previous handlers, so the Yes button
  // would accumulate N listeners and a single click would fire
  // awardSessionReward N times — giving 4 textiles for a 20-min
  // session instead of 2 (exactly what Giulia reported).
  //
  // The fix is a simple one-shot latch: set _focusConfirmArmed = true
  // the first time the modal is shown, refuse to re-arm while it's
  // still showing, and clear the latch the moment either button is
  // clicked (or a fresh session / reset begins).
  var _focusConfirmArmed = false;
  function clearFocusConfirmLatch() { _focusConfirmArmed = false; }
  function showFocusConfirmation() {
    var reward = getSessionReward(state.sessionDurationSec || 600);
    const total = reward.blocks + reward.bonus;
    const modal = document.getElementById('focusConfirmModal');
    if (!modal) {
      // No modal DOM — direct-award fallback. Guard it too.
      if (_focusConfirmArmed) return;
      _focusConfirmArmed = true;
      awardSessionReward(reward);
      state.timerRemaining = state.sessionDurationSec || 600;
      state.timerState = 'idle';
      _focusConfirmArmed = false;
      save(); render();
      return;
    }
    // Guard: if we've already armed this confirmation and the modal
    // is visible waiting for the user's answer, any additional call
    // must be a no-op. Otherwise we'd stack another pair of click
    // listeners on the same Yes/No buttons and a single click would
    // award credit multiple times.
    if (_focusConfirmArmed && modal.style.display === 'flex') return;
    _focusConfirmArmed = true;
    // Update modal copy to reflect the session length
    var modalTitle = document.getElementById('focusModalTitle');
    var modalSub = document.getElementById('focusModalSub');
    // v3.22.44: Expire challenge if timer started too late (>3 min after accepting)
    if (state.challengeActive && state.challengeAcceptedAt) {
      var sessionStart = state._sessionStartedAt || Date.now();
      if ((sessionStart - state.challengeAcceptedAt) > (3 * 60 * 1000)) {
        state.challengeActive = false;
        state.challengeAcceptedAt = 0;
        state.challengeSessionPaused = false;
        save();
      }
    }
    // v3.21.51: Show challenge bonus info in the confirmation modal
    var challengePending = state.challengeActive && !state.challengeSessionPaused;
    if (modalTitle) modalTitle.textContent = challengePending ? '\u2694 IDLE CHALLENGE — Did you focus?' : 'Did you actually focus?';
    var subText = 'Completing the ' + reward.label + ' will earn ' + total + ' textile' + (total === 1 ? '' : 's') + (reward.bonus > 0 ? ' (' + reward.blocks + ' + ' + reward.bonus + ' commitment bonus)' : '') + '.';
    if (challengePending) {
      var boosted = Math.round(reward.blocks * 1.5) + Math.round(reward.bonus * 1.5);
      subText += ' \u2694 CHALLENGE ACTIVE: 1.5x = ' + boosted + ' textile' + (boosted === 1 ? '' : 's') + '!';
    } else if (state.challengeActive && state.challengeSessionPaused) {
      subText += ' (Challenge voided — you paused during this session.)';
    }
    // v3.23.84: Reveal the market yield multiplier in the confirmation modal.
    // This is the moment the player finally learns how their pricing affected the payout.
    var mktYield = state.marketYieldMultiplier || 1.0;
    if ((state.marketingLevel || 0) >= 1 && mktYield !== 1.0) {
      subText += ' Market yield: ' + mktYield + 'x.';
    }
    if (modalSub) modalSub.textContent = subText;
    modal.style.display = 'flex';
    // Defensive: clone the Yes/No buttons NOW (before attaching new
    // listeners), so any stale handlers from a previous render cycle
    // are stripped. Belt-and-suspenders alongside the latch above.
    var yesBtnOld = document.getElementById('focusYesBtn');
    var noBtnOld = document.getElementById('focusNoBtn');
    if (yesBtnOld) yesBtnOld.replaceWith(yesBtnOld.cloneNode(true));
    if (noBtnOld) noBtnOld.replaceWith(noBtnOld.cloneNode(true));
    const yesBtn = document.getElementById('focusYesBtn');
    const noBtn = document.getElementById('focusNoBtn');
    function closeModal() { modal.style.display = 'none'; yesBtn.replaceWith(yesBtn.cloneNode(true)); noBtn.replaceWith(noBtn.cloneNode(true)); }
    yesBtn.addEventListener('click', function() {
      // If another click path already consumed the latch, bail.
      if (!_focusConfirmArmed) { closeModal(); return; }
      _focusConfirmArmed = false;
      closeModal();
      // v3.22.44: Expire challenge if timer wasn't started within 3 min of accepting
      var CHALLENGE_EXPIRY_MS = 3 * 60 * 1000;
      if (state.challengeActive && state.challengeAcceptedAt) {
        var sessionStart = state._sessionStartedAt || Date.now();
        if ((sessionStart - state.challengeAcceptedAt) > CHALLENGE_EXPIRY_MS) {
          state.challengeActive = false;
          state.challengeAcceptedAt = 0;
          state.challengeSessionPaused = false;
          notify('Idle challenge expired — timer not started within 3 minutes.', 'var(--warning)');
        }
      }
      // v3.21.51: Idle Challenge — 1.5x rewards if challenge active + no pause
      var challengeBonus = false;
      if (state.challengeActive && !state.challengeSessionPaused) {
        challengeBonus = true;
        reward = {
          blocks: Math.round(reward.blocks * 1.5),
          bonus: Math.round(reward.bonus * 1.5),
          label: reward.label + ' (1.5x IDLE CHALLENGE)'
        };
      }
      // Clear challenge regardless (one-time use)
      state.challengeActive = false;
      state.challengeAcceptedAt = 0;
      state.challengeSessionPaused = false;
      // v3.23.21: Snapshot state BEFORE rewards for celebration deltas
      var _celebSnapshot = { coins: state.coins || 0, xp: state.xp || 0, level: state.level || 1 };
      awardSessionReward(reward);
      if (challengeBonus) {
        setTimeout(function() {
          notify('\u2694 IDLE CHALLENGE COMPLETE! 1.5x rewards earned!', '#ffd700');
        }, 800);
      }
      // v3.23.112: Grace period scales with session length.
      // Base 5 min + 1 min per 10 min focused, capped at 20 min.
      // 10-min session = 6 min grace. 25-min = 7.5 min. 90-min = 14 min.
      var sessionSec = state.sessionDurationSec || 600;
      if (sessionSec >= 600) {
        var _sessionMin = Math.round(sessionSec / 60);
        var _graceMin = Math.min(20, 5 + Math.floor(_sessionMin / 10));
        _gameLockGraceUntil = Date.now() + (_graceMin * 60 * 1000);
        state.gameLockGraceUntil = _gameLockGraceUntil; // persist for other pages
      }
      state.timerRemaining = state.sessionDurationSec || 600;
      state.timerState = 'idle';
      save();
      render();
      // v3.23.31: Show streak only once per day, rewards every time
      var _todayStr = (function() { var d = new Date(), mm = d.getMonth()+1, dd = d.getDate(); return d.getFullYear()+'-'+(mm<10?'0':'')+mm+'-'+(dd<10?'0':'')+dd; })();
      var _skipStreak = (state.celebShownDate === _todayStr);
      try {
        showPostSessionCelebration(_celebSnapshot, {skipStreak: _skipStreak});
        state.celebShownDate = _todayStr;
        save();
      } catch(_) { SFX.blockEarned(); }
    });
    noBtn.addEventListener('click', function() {
      if (!_focusConfirmArmed) { closeModal(); return; }
      _focusConfirmArmed = false;
      closeModal();
      // v3.21.51: Failing voids idle challenge
      state.challengeActive = false;
      state.challengeAcceptedAt = 0;
      state.challengeSessionPaused = false;
      state.timerRemaining = state.sessionDurationSec || 600;
      state.timerState = 'idle';
      save();
      render();
      notify('No textiles earned. Keep trying!', 'var(--warning)');
      SFX.error();
    });
  }

  // Award N earnBlock() calls (chains combos naturally) plus any commitment bonus.
  function awardSessionReward(reward) {
    // Track lifetime focus minutes for the profile page. Uses the session
    // length that was in effect when this session started.
    try {
      var mins = Math.round((state.sessionDurationSec || 600) / 60);
      state.lifetimeFocusMinutes = (state.lifetimeFocusMinutes || 0) + mins;
    } catch (_) {}
    // v3.21.17: Log completed session to daily timeline.
    try {
      var today = todayStr();
      if (!state.dailySessionLog || state.dailySessionLog.date !== today) {
        // v3.22.94: SAFETY — archive the old day's sessions before wiping.
        // Prevents data loss if checkDayRollover hasn't run yet.
        if (state.dailySessionLog && state.dailySessionLog.date && state.dailySessionLog.sessions && state.dailySessionLog.sessions.length > 0) {
          if (!state.focusHistory || typeof state.focusHistory !== 'object') state.focusHistory = {};
          var oldDate = state.dailySessionLog.date;
          var oldMins = 0;
          for (var _ai = 0; _ai < state.dailySessionLog.sessions.length; _ai++) {
            oldMins += (state.dailySessionLog.sessions[_ai].min || 0);
          }
          // Only write if we have more minutes than what's already archived
          if (!state.focusHistory[oldDate] || state.focusHistory[oldDate] < oldMins) {
            state.focusHistory[oldDate] = oldMins;
            console.log('[SessionLog] Archived ' + oldMins + ' min for ' + oldDate + ' before resetting dailySessionLog.');
          }
        }
        state.dailySessionLog = { date: today, sessions: [] };
      }
      var startAt = state._sessionStartedAt || (Date.now() - ((state.sessionDurationSec || 600) * 1000));
      state.dailySessionLog.sessions.push({
        start: startAt,
        end: Date.now(),
        min: Math.round((state.sessionDurationSec || 600) / 60)
      });
      state._sessionStartedAt = 0;
    } catch (_) {}
    for (var i = 0; i < reward.blocks; i++) {
      try { earnBlock(); } catch (e) { console.error(e); }
    }
    if (reward.bonus > 0) {
      state.blocks += reward.bonus;
      state.todayBlocks += reward.bonus;
      state.totalLifetimeBlocks += reward.bonus;
      notify('+' + reward.bonus + ' commitment bonus textile' + (reward.bonus === 1 ? '' : 's') + ' (' + reward.label + ')', 'var(--accent)');
      try {
        if (typeof MsgLog !== 'undefined') {
          MsgLog.push(reward.label + ' complete. +' + reward.bonus + ' commitment bonus textile' + (reward.bonus === 1 ? '' : 's') + '.');
        }
      } catch (_) {}
    }
    // Re-run the stage-archive unlock check now that textiles / XP / level
    // may have advanced. If any new entries unlock, a MsgLog line lands and
    // the BRIEF badge will refresh on the next render().
    try { checkTrackerStageUnlocks(); } catch (_) {}
    // v3.21.18: Auto-sync profile to Firestore after every completed session
    try {
      if (typeof window.ProfileSync !== 'undefined' && window.ProfileSync) {
        window.ProfileSync.sync(state);
      }
    } catch (_) {}
    // v3.21.52: Check trigger events after session completion — story beats
    // that gate on level / coins / etc. fire immediately rather than waiting
    // for the next day rollover. Ambient events still only fire on rollover.
    try {
      if (!state.mirrorMode && typeof Events !== 'undefined' && Events && Events.tick) {
        var evResult = Events.tick(state, 'trigger');
        if (evResult && evResult.ok && typeof EventsModal !== 'undefined' && EventsModal && EventsModal.show) {
          setTimeout(function() { EventsModal.show(evResult); }, 1500);
        }
      }
    } catch (_) {}
  }

  // ============== RECURRING TASKS (v3.20.21) ==============
  // Recurring tasks are templates stored in state.recurringTasks[].
  // Each day rollover, any template whose text isn't already present
  // in its project's active (uncompleted) task list is auto-added.
  // When a recurring task is completed, a toast asks if you still
  // want it tomorrow; clicking STOP RECURRING removes the template.
  //
  // Schema:  { id: string, text: string, project: string }
  //   id      — unique ID for the template (not the daily task instance)
  //   text    — the task text, matched case-insensitively for dedup
  //   project — which project/tab to add it to

  function getRecurringTasks() {
    if (!state.recurringTasks) state.recurringTasks = [];
    return state.recurringTasks;
  }

  function isRecurringText(text) {
    var lc = text.toLowerCase();
    return getRecurringTasks().some(function(r) {
      return r.text.toLowerCase() === lc;
    });
  }

  function addRecurringTemplate(text, project) {
    if (isRecurringText(text)) return; // already recurring
    if (!state.recurringTasks) state.recurringTasks = [];
    state.recurringTasks.push({
      id: 'rec_' + Date.now(),
      text: text,
      project: project || state.activeProject || 'default'
    });
    save();
  }

  function removeRecurringTemplate(text) {
    if (!state.recurringTasks) return;
    var lc = text.toLowerCase();
    state.recurringTasks = state.recurringTasks.filter(function(r) {
      return r.text.toLowerCase() !== lc;
    });
    save();
  }

  // Called during checkDayRollover — populates today's task list with
  // any recurring templates that aren't already present.
  function populateRecurringTasks(forceFresh) {
    var templates = getRecurringTasks();
    if (templates.length === 0) return;
    var today = todayStr();
    templates.forEach(function(tmpl) {
      var pid = tmpl.project || 'default';
      if (!state.tasks[pid]) state.tasks[pid] = [];
      var lc = tmpl.text.toLowerCase();
      // Check if a copy (completed or not) already exists for today.
      // Previously only checked !t.completed, which caused completed recurring
      // tasks to be re-added on every page refresh instead of once per day.
      var alreadyExists = state.tasks[pid].some(function(t) {
        if (t.text.toLowerCase() !== lc) return false;
        if (!t.completed) return true; // uncompleted copy still there
        // Completed copy: only counts as "already exists" if completed today
        // (so it won't be re-added on refresh, but WILL be re-added tomorrow).
        // v3.23.14: forceFresh (day rollover) ignores completed copies.
        if (forceFresh) return false;
        if (t.completedAt) {
          var d = new Date(t.completedAt);
          var completedDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          return completedDate === today;
        }
        return false; // no timestamp (pre-v3.23.15 task) — re-add to be safe
      });
      if (alreadyExists) return;
      state.tasks[pid].push({
        id: Date.now().toString() + '_' + Math.floor(Math.random() * 1000),
        text: tmpl.text,
        completed: false,
        blocksEarned: 0,
        createdAt: Date.now(),
        recurring: true  // flag so the UI can show the ↻ icon
      });
    });
  }

  // v3.21.45: Reset recurrent aqueducts across all task types on day rollover.
  function resetRecurrentAqueducts() {
    function resetStages(task) {
      if (!task || !task.recurrentAqueducts || !task.aqueducts || !task.aqueducts.length) return;
      for (var i = 0; i < task.aqueducts.length; i++) {
        task.aqueducts[i].done = false;
      }
    }
    // Today's tasks
    if (Array.isArray(state.todayTasks)) {
      state.todayTasks.forEach(resetStages);
    }
    // Project tasks
    if (state.tasks) {
      Object.keys(state.tasks).forEach(function(pid) {
        if (Array.isArray(state.tasks[pid])) {
          state.tasks[pid].forEach(resetStages);
        }
      });
    }
    // Priority tasks
    if (Array.isArray(state.priorityTasks)) {
      state.priorityTasks.forEach(resetStages);
    }
  }

  // Toast shown when a recurring task is completed.
  function showRecurringToast(taskText) {
    var host = document.getElementById('popupDispatchToasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'popupDispatchToasts';
      host.setAttribute('aria-live', 'polite');
      host.style.cssText =
        'position:fixed;top:56px;right:16px;z-index:4000;' +
        'display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:310px;';
      document.body.appendChild(host);
    }

    // Inject styles if not already present.
    if (!document.getElementById('recurringToastStyles')) {
      var style = document.createElement('style');
      style.id = 'recurringToastStyles';
      style.textContent =
        '.recurring-toast {' +
          'pointer-events:auto;' +
          'background:#0f0a0a;' +
          'border:1px solid #3a5a3a;' +
          'border-left:3px solid #00ff88;' +
          'color:#e6d3c4;' +
          'padding:10px 28px 10px 12px;' +
          'font-family:"Courier New",monospace;' +
          'font-size:11px;line-height:1.45;' +
          'box-shadow:0 6px 18px rgba(0,0,0,0.45);' +
          'position:relative;' +
          'animation:rec-in 220ms ease-out;' +
        '}' +
        '@keyframes rec-in { 0%{transform:translateX(18px);opacity:0;} 100%{transform:translateX(0);opacity:1;} }' +
        '.recurring-toast .rec-head {' +
          'font-weight:bold;letter-spacing:0.08em;color:#00ff88;font-size:10px;margin-bottom:4px;' +
        '}' +
        '.recurring-toast .rec-body {' +
          'color:#d6c6b4;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:12px;line-height:1.5;margin-bottom:8px;' +
        '}' +
        '.recurring-toast .rec-close {' +
          'position:absolute;top:4px;right:6px;background:transparent;border:none;color:#8a8a6a;font-size:12px;cursor:pointer;padding:2px 4px;' +
        '}' +
        '.recurring-toast .rec-close:hover { color:#00ff88; }' +
        '.recurring-toast .rec-stop-btn {' +
          'background:transparent;border:1px solid #d4a857;color:#d4a857;' +
          'font-family:"Press Start 2P",monospace;font-size:7px;padding:4px 10px;' +
          'border-radius:4px;cursor:pointer;letter-spacing:0.5px;' +
        '}' +
        '.recurring-toast .rec-stop-btn:hover {' +
          'background:rgba(212,168,87,0.15);box-shadow:0 0 8px rgba(212,168,87,0.3);' +
        '}';
      document.head.appendChild(style);
    }

    var node = document.createElement('div');
    node.className = 'recurring-toast';

    var head = document.createElement('div');
    head.className = 'rec-head';
    head.textContent = '\u21BB RECURRING TASK';

    var body = document.createElement('div');
    body.className = 'rec-body';
    body.textContent = '\u201C' + taskText + '\u201D will appear again tomorrow. Still want it?';

    var stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'rec-stop-btn';
    stopBtn.textContent = 'STOP RECURRING';
    stopBtn.title = 'Are you sure you don\u2019t want this task to recur anymore? Click to remove it from the daily schedule.';
    stopBtn.addEventListener('click', function() {
      removeRecurringTemplate(taskText);
      body.textContent = 'Removed. \u201C' + taskText + '\u201D won\u2019t appear again.';
      stopBtn.style.display = 'none';
      setTimeout(function() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 3000);
    });

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'rec-close';
    close.textContent = '\u2715';
    close.addEventListener('click', function() {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    node.appendChild(close);
    node.appendChild(head);
    node.appendChild(body);
    node.appendChild(stopBtn);
    host.appendChild(node);

    // Auto-dismiss after 11 seconds.
    setTimeout(function() {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 11000);
  }

  // ============== HIGH PRIORITY TASKS (v3.20.25) ==============
  // A separate bucket from state.tasks. If there are any uncompleted entries,
  // a blocking modal appears every time the popup opens until the user marks
  // them done or removes them. Persists across days. Per-item buttons: DONE
  // (marks completed + removes from priority list), REMOVE (deletes outright).
  // NOT YET (bottom of modal) dismisses for this session only.
  // ------ Priority recurrence helpers ------
  // Each priority task can optionally recur. Data shape:
  //   recurrence:      null | 'daily' | 'weekly' | 'interval'
  //   recurWeekdays:   array of ints 0-6 (Sun=0 .. Sat=6), used when weekly
  //   recurInterval:   positive int N, used when 'interval' (every N days)
  //   lastCompletedDate: 'YYYY-MM-DD' local date of last DONE click (empty = never)
  function _priorityTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = '0' + m;
    var day = String(d.getDate());
    if (day.length < 2) day = '0' + day;
    return y + '-' + m + '-' + day;
  }
  function _priorityDayDelta(fromKey, toKey) {
    function parse(k) {
      var parts = (k || '').split('-');
      if (parts.length !== 3) return 0;
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
    }
    var a = parse(fromKey), b = parse(toKey);
    if (!a || !b) return 0;
    return Math.round((b - a) / 86400000);
  }
  function isPriorityDueToday(p) {
    if (!p) return false;
    // Legacy / non-recurring task: active unless explicitly completed.
    if (!p.recurrence || p.recurrence === 'none') {
      return !p.completed;
    }
    var today = _priorityTodayKey();
    // If it was already marked DONE today, hide it until next calendar day.
    if (p.lastCompletedDate === today) return false;
    if (p.recurrence === 'daily') return true;
    if (p.recurrence === 'weekly') {
      var weekdays = Array.isArray(p.recurWeekdays) ? p.recurWeekdays : [];
      if (weekdays.length === 0) return true;
      return weekdays.indexOf(new Date().getDay()) !== -1;
    }
    if (p.recurrence === 'interval') {
      var n = parseInt(p.recurInterval, 10);
      if (!n || n < 1) n = 1;
      if (!p.lastCompletedDate) return true;
      return _priorityDayDelta(p.lastCompletedDate, today) >= n;
    }
    return !p.completed;
  }
  function priorityRecurrenceLabel(p) {
    if (!p || !p.recurrence) return '';
    if (p.recurrence === 'daily') return 'DAILY';
    if (p.recurrence === 'weekly') {
      var names = ['S','M','T','W','T','F','S'];
      var wd = Array.isArray(p.recurWeekdays) ? p.recurWeekdays : [];
      if (wd.length === 0 || wd.length === 7) return 'WEEKLY';
      return wd.slice().sort().map(function(i) { return names[i]; }).join('');
    }
    if (p.recurrence === 'interval') {
      var n = parseInt(p.recurInterval, 10) || 1;
      return 'EVERY ' + n + 'D';
    }
    return '';
  }

  function addPriority() {
    var inputEl = document.getElementById('priorityInput');
    if (!inputEl) return;
    var text = (inputEl.value || '').trim();
    if (!text) return;
    if (!Array.isArray(state.priorityTasks)) state.priorityTasks = [];
    state.priorityTasks.push({
      id: 'p' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: text,
      createdAt: Date.now(),
      completed: false,
      completedAt: 0,
      recurrence: null,
      recurWeekdays: [],
      recurInterval: 0,
      lastCompletedDate: ''
    });
    inputEl.value = '';
    save();
    renderPriorities();
    renderGameLockout();
    try { SFX.addTask && SFX.addTask(); } catch (_) {}
  }

  function completePriority(id) {
    if (!Array.isArray(state.priorityTasks)) return;
    // Grab the task text before we process it (it may get removed).
    var completedText = '';
    for (var f = 0; f < state.priorityTasks.length; f++) {
      if (state.priorityTasks[f].id === id) { completedText = state.priorityTasks[f].text || ''; break; }
    }
    // For recurring tasks we keep the task and just mark it done-for-today,
    // so it reappears on the next qualifying calendar day. For one-off
    // tasks we remove them outright — their whole point is to disappear.
    var today = _priorityTodayKey();
    var nextList = [];
    for (var i = 0; i < state.priorityTasks.length; i++) {
      var p = state.priorityTasks[i];
      if (p.id !== id) { nextList.push(p); continue; }
      if (p.recurrence && p.recurrence !== 'none') {
        p.lastCompletedDate = today;
        p.completedAt = Date.now();
        nextList.push(p);
      }
      // else: drop it (one-off task)
    }
    state.priorityTasks = nextList;
    // v3.21.9: Priority completions produce dust + bump lifetime counter,
    // just like regular task completions.
    state.tasksCompletedLifetime = (state.tasksCompletedLifetime || 0) + 1;
    logDailyTaskCompletion(completedText);
    if (!state.dustPixels) state.dustPixels = [];
    var palette = state.unlockedColors || ['#00ff88'];
    var dustColor = palette[Math.floor(Math.random() * palette.length)];
    state.dustPixels.push({
      x: Math.random(),
      y: Math.random(),
      color: dustColor,
      d: todayStr()
    });
    state.dustCompletedToday = (state.dustCompletedToday || 0) + 1;
    var dustCap = state.materialsIncineratorUnlocked ? 5000 : 600;
    if (state.dustPixels.length > dustCap) {
      state.dustPixels = state.dustPixels.slice(state.dustPixels.length - dustCap);
    }
    save();
    renderPriorities();
    renderPriorityModalList();
    renderGameLockout();
    renderDustbin();
    try { SFX.completeTask && SFX.completeTask(); } catch (_) {}
    // If the modal is open and the list is now empty, close it.
    if (getActivePriorityTasks().length === 0) hidePriorityModal();
  }

  function removePriority(id) {
    if (!Array.isArray(state.priorityTasks)) return;
    state.priorityTasks = state.priorityTasks.filter(function(p) { return p.id !== id; });
    save();
    renderPriorities();
    renderPriorityModalList();
    renderGameLockout();
    if (getActivePriorityTasks().length === 0) hidePriorityModal();
  }

  function setPriorityRecurrence(id, recurrence, opts) {
    if (!Array.isArray(state.priorityTasks)) return;
    for (var i = 0; i < state.priorityTasks.length; i++) {
      var p = state.priorityTasks[i];
      if (p.id !== id) continue;
      if (!recurrence || recurrence === 'none') {
        p.recurrence = null;
        p.recurWeekdays = [];
        p.recurInterval = 0;
      } else {
        p.recurrence = recurrence;
        if (recurrence === 'weekly') {
          p.recurWeekdays = (opts && Array.isArray(opts.weekdays)) ? opts.weekdays.slice().sort() : [];
        } else {
          p.recurWeekdays = [];
        }
        if (recurrence === 'interval') {
          var n = parseInt(opts && opts.interval, 10);
          if (!n || n < 1) n = 1;
          p.recurInterval = n;
        } else {
          p.recurInterval = 0;
        }
      }
      break;
    }
    save();
    renderPriorities();
    renderPriorityModalList();
  }

  function reorderPriorityByIds(fromId, toId, dropBefore) {
    if (!Array.isArray(state.priorityTasks)) return;
    if (!fromId || !toId || fromId === toId) return;
    var fromIdx = -1, toIdx = -1;
    for (var i = 0; i < state.priorityTasks.length; i++) {
      if (state.priorityTasks[i].id === fromId) fromIdx = i;
      if (state.priorityTasks[i].id === toId) toIdx = i;
    }
    if (fromIdx < 0 || toIdx < 0) return;
    var moved = state.priorityTasks.splice(fromIdx, 1)[0];
    if (fromIdx < toIdx) toIdx--;
    var insertAt = dropBefore ? toIdx : toIdx + 1;
    if (insertAt < 0) insertAt = 0;
    if (insertAt > state.priorityTasks.length) insertAt = state.priorityTasks.length;
    state.priorityTasks.splice(insertAt, 0, moved);
    save();
    renderPriorities();
    renderPriorityModalList();
  }

  function getActivePriorityTasks() {
    if (!Array.isArray(state.priorityTasks)) return [];
    return state.priorityTasks.filter(function(p) { return isPriorityDueToday(p); });
  }

  // Shared: open a small inline recurrence editor anchored under `anchorRow`
  // for the given task. Compact version — three radio-like buttons plus
  // conditional sub-controls for weekly/interval. Cleans itself up after
  // a selection is saved.
  function _buildRecurrenceEditor(p, onClose) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin:4px 4px 8px;padding:8px;background:#1a0606;border:1px solid #8b1a1a;border-radius:4px;font-size:11px;color:#ffd5d5;';
    wrap.setAttribute('data-recur-editor', '1');

    var header = document.createElement('div');
    header.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:9px;color:#ffaaaa;margin-bottom:6px;letter-spacing:0.5px;';
    header.textContent = 'RECURRENCE';
    wrap.appendChild(header);

    var current = p.recurrence || 'none';
    var modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;';
    var modes = [
      { v: 'none',     label: 'ONE-OFF',  tip: 'No recurrence. Marking DONE removes the task forever.' },
      { v: 'daily',    label: 'DAILY',    tip: 'Reappears every calendar day after you mark it DONE.' },
      { v: 'weekly',   label: 'WEEKLY',   tip: 'Reappears on the weekdays you pick below.' },
      { v: 'interval', label: 'EVERY N',  tip: 'Reappears N calendar days after the last DONE click.' }
    ];
    var sub = document.createElement('div');
    sub.style.cssText = 'margin-bottom:6px;';

    function refreshSub(selMode) {
      sub.innerHTML = '';
      if (selMode === 'weekly') {
        var dayNames = ['S','M','T','W','T','F','S'];
        var dayTitles = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        var selected = Array.isArray(p.recurWeekdays) ? p.recurWeekdays.slice() : [];
        var dRow = document.createElement('div');
        dRow.style.cssText = 'display:flex;gap:3px;';
        dayNames.forEach(function(n, idx) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = n;
          b.title = dayTitles[idx];
          var isOn = selected.indexOf(idx) !== -1;
          b.style.cssText = 'flex:1;padding:4px 0;border-radius:3px;font-family:"Press Start 2P",monospace;font-size:9px;cursor:pointer;' +
            (isOn
              ? 'background:#8b1a1a;color:#fff;border:1px solid #ff5a5a;'
              : 'background:transparent;color:#886666;border:1px solid #5a2020;');
          b.addEventListener('click', function() {
            var pos = selected.indexOf(idx);
            if (pos === -1) selected.push(idx); else selected.splice(pos, 1);
            p.recurWeekdays = selected.slice();
            refreshSub('weekly');
          });
          dRow.appendChild(b);
        });
        sub.appendChild(dRow);
      } else if (selMode === 'interval') {
        var iRow = document.createElement('div');
        iRow.style.cssText = 'display:flex;gap:6px;align-items:center;';
        var lbl = document.createElement('span');
        lbl.textContent = 'Every';
        iRow.appendChild(lbl);
        var num = document.createElement('input');
        num.type = 'number';
        num.min = '1';
        num.value = String(parseInt(p.recurInterval, 10) || 1);
        num.style.cssText = 'width:48px;background:#0a0606;border:1px solid #8b1a1a;color:#ffd5d5;border-radius:3px;padding:3px 5px;font-size:11px;';
        num.title = 'Number of calendar days between runs.';
        num.addEventListener('input', function() {
          var n = parseInt(num.value, 10);
          if (!n || n < 1) n = 1;
          p.recurInterval = n;
        });
        iRow.appendChild(num);
        var days = document.createElement('span');
        days.textContent = 'day(s)';
        iRow.appendChild(days);
        sub.appendChild(iRow);
      }
    }

    modes.forEach(function(m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = m.label;
      b.title = m.tip;
      var isSel = (current === m.v);
      b.style.cssText = 'padding:4px 8px;border-radius:3px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;letter-spacing:0.5px;' +
        (isSel
          ? 'background:#8b1a1a;color:#fff;border:1px solid #ff5a5a;'
          : 'background:transparent;color:#ffaaaa;border:1px solid #5a2020;');
      b.addEventListener('click', function() {
        current = m.v;
        // Re-render mode row visuals
        Array.prototype.forEach.call(modeRow.children, function(el, idx) {
          var on = (modes[idx].v === current);
          el.style.cssText = 'padding:4px 8px;border-radius:3px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;letter-spacing:0.5px;' +
            (on
              ? 'background:#8b1a1a;color:#fff;border:1px solid #ff5a5a;'
              : 'background:transparent;color:#ffaaaa;border:1px solid #5a2020;');
        });
        refreshSub(current);
      });
      modeRow.appendChild(b);
    });
    wrap.appendChild(modeRow);
    wrap.appendChild(sub);
    refreshSub(current);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:6px;';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.title = 'Close without changing recurrence.';
    cancelBtn.style.cssText = 'background:transparent;color:#886666;border:1px solid #5a2020;border-radius:3px;padding:4px 8px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;';
    cancelBtn.addEventListener('click', function() { if (onClose) onClose(false); });
    actions.appendChild(cancelBtn);
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'SAVE';
    saveBtn.title = 'Save recurrence settings for this task.';
    saveBtn.style.cssText = 'background:#2a5a2a;color:#d4ffd4;border:1px solid #4a8a4a;border-radius:3px;padding:4px 10px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;';
    saveBtn.addEventListener('click', function() {
      setPriorityRecurrence(p.id, current, { weekdays: p.recurWeekdays, interval: p.recurInterval });
      if (onClose) onClose(true);
    });
    actions.appendChild(saveBtn);
    wrap.appendChild(actions);

    return wrap;
  }

  // Shared: attach drag-and-drop reorder handlers to a rendered row.
  // dragging is keyed on the task id so it works identically in the inline
  // list and the modal list. Reordering always applies to the full
  // state.priorityTasks array (not just active ones).
  function _wireRowDrag(row, taskId, onReordered) {
    row.setAttribute('draggable', 'true');
    row.dataset.pfPriorityId = taskId;
    row.addEventListener('dragstart', function(e) {
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
      } catch (_) {}
      row.style.opacity = '0.45';
    });
    row.addEventListener('dragend', function() {
      row.style.opacity = '1';
      row.style.borderTop = '';
      row.style.borderBottom = '1px solid rgba(139,26,26,0.4)';
    });
    row.addEventListener('dragover', function(e) {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
      var rect = row.getBoundingClientRect();
      var before = (e.clientY - rect.top) < (rect.height / 2);
      row.style.borderTop = before ? '2px solid #ff5a5a' : '';
      row.style.borderBottom = before ? '1px solid rgba(139,26,26,0.4)' : '2px solid #ff5a5a';
    });
    row.addEventListener('dragleave', function() {
      row.style.borderTop = '';
      row.style.borderBottom = '1px solid rgba(139,26,26,0.4)';
    });
    row.addEventListener('drop', function(e) {
      e.preventDefault();
      var fromId = '';
      try { fromId = e.dataTransfer.getData('text/plain') || ''; } catch (_) {}
      var rect = row.getBoundingClientRect();
      var before = (e.clientY - rect.top) < (rect.height / 2);
      row.style.borderTop = '';
      row.style.borderBottom = '1px solid rgba(139,26,26,0.4)';
      if (fromId && fromId !== taskId) {
        reorderPriorityByIds(fromId, taskId, before);
        if (onReordered) onReordered();
      }
    });
  }

  function renderPriorities() {
    var listEl = document.getElementById('priorityList');
    var countEl = document.getElementById('priorityCount');
    if (!listEl) return;
    var active = getActivePriorityTasks();
    if (countEl) countEl.textContent = String(active.length);
    listEl.innerHTML = '';
    if (active.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:8px;text-align:center;color:#886666;font-size:11px;font-style:italic;';
      empty.textContent = 'No priority tasks due. Add one above or check back tomorrow for recurring items.';
      listEl.appendChild(empty);
      return;
    }
    active.forEach(function(p) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 4px;border-bottom:1px solid rgba(139,26,26,0.4);';

      var handle = document.createElement('span');
      handle.textContent = '\u2630';
      handle.title = 'Drag to reorder priority tasks.';
      handle.style.cssText = 'color:#886666;cursor:grab;font-size:12px;padding:0 2px;user-select:none;';
      row.appendChild(handle);

      var doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.textContent = '\u2713';
      doneBtn.title = (p.recurrence && p.recurrence !== 'none')
        ? 'Mark this recurring task done for today. It will reappear on the next scheduled day.'
        : 'Mark this priority task done. It will be removed from the list.';
      doneBtn.style.cssText = 'background:#2a5a2a;color:#b8ffb8;border:1px solid #4a8a4a;border-radius:4px;padding:3px 8px;font-family:"Press Start 2P",monospace;font-size:10px;cursor:pointer;';
      doneBtn.addEventListener('click', function() { completePriority(p.id); });
      row.appendChild(doneBtn);

      var txt = document.createElement('div');
      txt.style.cssText = 'flex:1;color:#ffd5d5;font-size:12px;word-break:break-word;';
      txt.textContent = p.text;
      row.appendChild(txt);

      if (p.recurrence && p.recurrence !== 'none') {
        var badge = document.createElement('span');
        badge.textContent = '\u21BB ' + priorityRecurrenceLabel(p);
        badge.title = 'This task recurs. It reappears after you mark it DONE, per the schedule set on the gear button.';
        badge.style.cssText = 'color:#ffb43c;border:1px solid #8b5a1a;border-radius:10px;padding:1px 6px;font-family:"Press Start 2P",monospace;font-size:8px;letter-spacing:0.5px;';
        row.appendChild(badge);
      }

      // v3.21.21: "→TODAY" button to send to Today's Tasks
      var todayBtn = document.createElement('button');
      todayBtn.type = 'button';
      var alreadyInToday = isInTodayTasks(p.id);
      todayBtn.textContent = alreadyInToday ? '\u2605' : '\u2192TODAY';
      todayBtn.title = alreadyInToday ? 'Already in Today\'s Tasks.' : 'Add to Today\'s Tasks.';
      todayBtn.disabled = alreadyInToday;
      todayBtn.style.cssText = 'background:' + (alreadyInToday ? 'transparent' : 'rgba(255,180,60,0.15)') + ';color:#ffb43c;border:1px solid #8b5e1a;border-radius:4px;padding:3px 6px;font-family:"Press Start 2P",monospace;font-size:7px;cursor:' + (alreadyInToday ? 'default' : 'pointer') + ';opacity:' + (alreadyInToday ? '0.5' : '1') + ';';
      todayBtn.addEventListener('click', function() {
        if (!isInTodayTasks(p.id)) {
          addTodayTask(p.text, p.id, 'priority');
        }
      });
      row.appendChild(todayBtn);

      var doNowPBtn = document.createElement('button');
      doNowPBtn.type = 'button';
      doNowPBtn.textContent = 'DO NOW';
      doNowPBtn.title = 'Do this task right now. Set a time estimate and commit.';
      doNowPBtn.className = 'task-donow-btn';
      doNowPBtn.addEventListener('click', function() {
        var isRec = p.recurrence && p.recurrence !== 'none';
        startDoNow(p.id, p.text, isRec);
      });
      row.appendChild(doNowPBtn);

      var gearBtn = document.createElement('button');
      gearBtn.type = 'button';
      gearBtn.textContent = '\u2699';
      gearBtn.title = 'Set recurrence (daily, weekly, or every N days).';
      gearBtn.style.cssText = 'background:transparent;color:#ffaaaa;border:1px solid #5a2020;border-radius:4px;padding:3px 7px;font-size:12px;cursor:pointer;';
      gearBtn.addEventListener('click', function() {
        // Toggle inline editor under this row.
        var existing = row.nextSibling;
        if (existing && existing.getAttribute && existing.getAttribute('data-recur-editor') === '1') {
          existing.parentNode.removeChild(existing);
          return;
        }
        // Remove any other open editors first.
        Array.prototype.forEach.call(listEl.querySelectorAll('[data-recur-editor="1"]'), function(n) { n.parentNode.removeChild(n); });
        var ed = _buildRecurrenceEditor(p, function(saved) {
          if (ed.parentNode) ed.parentNode.removeChild(ed);
          if (saved) renderPriorities();
        });
        if (row.nextSibling) listEl.insertBefore(ed, row.nextSibling);
        else listEl.appendChild(ed);
      });
      row.appendChild(gearBtn);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '\u2715';
      removeBtn.title = 'Remove from the priority list entirely (including any recurrence).';
      removeBtn.style.cssText = 'background:transparent;color:#886666;border:1px solid #8b1a1a;border-radius:4px;padding:3px 7px;font-family:"Press Start 2P",monospace;font-size:10px;cursor:pointer;';
      removeBtn.addEventListener('click', function() { removePriority(p.id); });
      row.appendChild(removeBtn);

      _wireRowDrag(row, p.id);
      listEl.appendChild(row);
    });
  }

  function renderPriorityModalList() {
    var listEl = document.getElementById('priorityModalList');
    if (!listEl) return;
    var active = getActivePriorityTasks();
    listEl.innerHTML = '';
    active.forEach(function(p) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 6px;border-bottom:1px solid rgba(139,26,26,0.5);';

      var handle = document.createElement('span');
      handle.textContent = '\u2630';
      handle.title = 'Drag to reorder.';
      handle.style.cssText = 'color:#886666;cursor:grab;font-size:14px;padding:0 2px;user-select:none;';
      row.appendChild(handle);

      var txt = document.createElement('div');
      txt.style.cssText = 'flex:1;color:#ffecec;font-size:13px;line-height:1.4;word-break:break-word;';
      txt.textContent = p.text;
      row.appendChild(txt);

      if (p.recurrence && p.recurrence !== 'none') {
        var badge = document.createElement('span');
        badge.textContent = '\u21BB ' + priorityRecurrenceLabel(p);
        badge.title = 'Recurring task. It reappears on its schedule after DONE is clicked.';
        badge.style.cssText = 'color:#ffb43c;border:1px solid #8b5a1a;border-radius:10px;padding:2px 8px;font-family:"Press Start 2P",monospace;font-size:8px;letter-spacing:0.5px;';
        row.appendChild(badge);
      }

      var doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.textContent = 'DONE';
      doneBtn.title = (p.recurrence && p.recurrence !== 'none')
        ? 'Mark done for today. This recurring task will come back on its next scheduled day.'
        : 'Mark this priority task done. Removes it from the list.';
      doneBtn.style.cssText = 'background:#2a5a2a;color:#d4ffd4;border:1px solid #4a8a4a;border-radius:4px;padding:6px 10px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;letter-spacing:0.5px;';
      doneBtn.addEventListener('click', function() { completePriority(p.id); });
      row.appendChild(doneBtn);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'REMOVE';
      removeBtn.title = 'Remove from priority list entirely (including any recurrence).';
      removeBtn.style.cssText = 'background:transparent;color:#ffaaaa;border:1px solid #8b1a1a;border-radius:4px;padding:6px 10px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;letter-spacing:0.5px;';
      removeBtn.addEventListener('click', function() { removePriority(p.id); });
      row.appendChild(removeBtn);

      _wireRowDrag(row, p.id);
      listEl.appendChild(row);
    });
  }

  function showPriorityModal() {
    var modal = document.getElementById('priorityModal');
    if (!modal) return;
    renderPriorityModalList();
    modal.style.display = 'flex';
  }

  function hidePriorityModal() {
    var modal = document.getElementById('priorityModal');
    if (!modal) return;
    modal.style.display = 'none';
  }

  function maybeShowPriorityModal() {
    if (getActivePriorityTasks().length > 0) showPriorityModal();
  }

  // ============== TODAY'S TASKS (v3.21.22) ==============
  // Simple orange daily task list — no locks, no modals, no recurrence.
  // Add tasks directly, or use "→ TODAY" buttons on priority/normal tasks.
  // Tasks older than 24h trigger an INCREMENTALIZATION prompt: break the
  // task into smaller "aqueduct" stages that must be completed before the
  // main task can be marked done.
  //
  // Data shape per today task:
  //   { id, text, createdAt, sourceId, sourceType,
  //     aqueducts: [ { id, text, done: bool } ],
  //     incrementalizedAt: timestamp|null,
  //     lastIncrementalizePrompt: timestamp|null }

  function addTodayTask(text, sourceId, sourceType) {
    if (!Array.isArray(state.todayTasks)) state.todayTasks = [];
    if (sourceId) {
      for (var d = 0; d < state.todayTasks.length; d++) {
        if (state.todayTasks[d].sourceId === sourceId) return;
      }
    }
    state.todayTasks.push({
      id: 'td' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: text,
      createdAt: Date.now(),
      sourceId: sourceId || null,
      sourceType: sourceType || null,
      aqueducts: [],
      incrementalizedAt: null,
      lastIncrementalizePrompt: null
    });
    save();
    renderTodayTasks();
    renderPriorities();
    try { SFX.addTask && SFX.addTask(); } catch (_) {}
  }

  function addTodayTaskFromInput() {
    var inputEl = document.getElementById('todayTaskInput');
    if (!inputEl) return;
    var text = (inputEl.value || '').trim();
    if (!text) return;
    addTodayTask(text, null, null);
    inputEl.value = '';
  }

  function _todayTaskHasOpenAqueducts(t) {
    if (!t.aqueducts || !t.aqueducts.length) return false;
    for (var i = 0; i < t.aqueducts.length; i++) {
      if (!t.aqueducts[i].done) return true;
    }
    return false;
  }

  function completeAqueduct(taskId, aqId) {
    if (!Array.isArray(state.todayTasks)) return;
    for (var i = 0; i < state.todayTasks.length; i++) {
      var t = state.todayTasks[i];
      if (t.id !== taskId) continue;
      if (!t.aqueducts) break;
      for (var j = 0; j < t.aqueducts.length; j++) {
        if (t.aqueducts[j].id === aqId) {
          t.aqueducts[j].done = true;
          // Credit the aqueduct stage completion
          state.tasksCompletedLifetime = (state.tasksCompletedLifetime || 0) + 1;
          logDailyTaskCompletion(t.aqueducts[j].text);
          if (!state.dustPixels) state.dustPixels = [];
          var palette = state.unlockedColors || ['#00ff88'];
          var dustColor = palette[Math.floor(Math.random() * palette.length)];
          state.dustPixels.push({ x: Math.random(), y: Math.random(), color: dustColor, d: todayStr() });
          state.dustCompletedToday = (state.dustCompletedToday || 0) + 1;
          var dustCap = state.materialsIncineratorUnlocked ? 5000 : 600;
          if (state.dustPixels.length > dustCap) {
            state.dustPixels = state.dustPixels.slice(state.dustPixels.length - dustCap);
          }
          break;
        }
      }
      break;
    }
    save();
    renderTodayTasks();
    renderDustbin();
    try { SFX.completeTask && SFX.completeTask(); } catch (_) {}
  }

  function completeTodayTask(id) {
    if (!Array.isArray(state.todayTasks)) return;
    var task = null;
    for (var f = 0; f < state.todayTasks.length; f++) {
      if (state.todayTasks[f].id === id) { task = state.todayTasks[f]; break; }
    }
    if (!task) return;
    // Block if aqueducts remain
    if (_todayTaskHasOpenAqueducts(task)) {
      try { notify('Complete all aqueduct stages first.', '#ffb43c'); } catch (_) {}
      return;
    }
    var completedText = task.text || '';

    // Mark source task done too
    if (task.sourceId && task.sourceType === 'priority') {
      completePriority(task.sourceId);
    } else if (task.sourceId && task.sourceType === 'project') {
      var srcTask = findTask(task.sourceId);
      if (srcTask && !srcTask.completed) {
        toggleTask(task.sourceId);
      }
    }

    state.todayTasks = state.todayTasks.filter(function(t) { return t.id !== id; });

    // Credit completion (skip if source already credited it)
    if (task.sourceType !== 'priority' && task.sourceType !== 'project') {
      state.tasksCompletedLifetime = (state.tasksCompletedLifetime || 0) + 1;
      logDailyTaskCompletion(completedText);
      if (!state.dustPixels) state.dustPixels = [];
      var palette = state.unlockedColors || ['#00ff88'];
      var dustColor = palette[Math.floor(Math.random() * palette.length)];
      state.dustPixels.push({ x: Math.random(), y: Math.random(), color: dustColor, d: todayStr() });
      state.dustCompletedToday = (state.dustCompletedToday || 0) + 1;
      var dustCap = state.materialsIncineratorUnlocked ? 5000 : 600;
      if (state.dustPixels.length > dustCap) {
        state.dustPixels = state.dustPixels.slice(state.dustPixels.length - dustCap);
      }
    }
    save();
    renderTodayTasks();
    renderDustbin();
    try { SFX.completeTask && SFX.completeTask(); } catch (_) {}
  }

  function removeTodayTask(id) {
    if (!Array.isArray(state.todayTasks)) return;
    state.todayTasks = state.todayTasks.filter(function(t) { return t.id !== id; });
    save();
    renderTodayTasks();
    renderPriorities();
  }

  function isInTodayTasks(sourceId) {
    if (!sourceId || !Array.isArray(state.todayTasks)) return false;
    for (var i = 0; i < state.todayTasks.length; i++) {
      if (state.todayTasks[i].sourceId === sourceId) return true;
    }
    return false;
  }

  function pruneOrphanedTodayTasks() {
    if (!Array.isArray(state.todayTasks)) return;
    var changed = false;
    state.todayTasks = state.todayTasks.filter(function(t) {
      if (!t.sourceId) return true;
      if (t.sourceType === 'priority') {
        var found = false;
        var active = getActivePriorityTasks();
        for (var i = 0; i < active.length; i++) {
          if (active[i].id === t.sourceId) { found = true; break; }
        }
        if (!found) { changed = true; return false; }
      }
      return true;
    });
    if (changed) save();
  }

  // ============== DAILY REMINDERS (v3.21.25) ==============
  // A list of personal wisdoms/reminders the user curates. Once per day,
  // a modal walks through them one at a time like flashcards.

  function addDailyReminder(text) {
    if (!text) return;
    if (!Array.isArray(state.dailyReminders)) state.dailyReminders = [];
    state.dailyReminders.push({
      id: 'dr' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text: text
    });
    save();
    renderDailyReminders();
  }

  function removeDailyReminder(id) {
    if (!Array.isArray(state.dailyReminders)) return;
    state.dailyReminders = state.dailyReminders.filter(function(r) { return r.id !== id; });
    save();
    renderDailyReminders();
  }

  function renderDailyReminders() {
    var listEl = document.getElementById('dailyRemindersList');
    var countEl = document.getElementById('dailyRemindersCount');
    if (!listEl) return;
    var items = Array.isArray(state.dailyReminders) ? state.dailyReminders : [];
    if (countEl) countEl.textContent = String(items.length);
    listEl.innerHTML = '';
    if (items.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:8px;text-align:center;color:#6688aa;font-size:11px;font-style:italic;';
      empty.textContent = 'No reminders yet. Add wisdoms to see daily.';
      listEl.appendChild(empty);
      return;
    }
    items.forEach(function(r) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 4px;border-bottom:1px solid rgba(42,96,144,0.3);';

      var txt = document.createElement('div');
      txt.style.cssText = 'flex:1;color:#b0d4ff;font-size:12px;word-break:break-word;';
      txt.textContent = r.text;
      row.appendChild(txt);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '\u2715';
      removeBtn.title = 'Remove this reminder.';
      removeBtn.style.cssText = 'background:transparent;color:#6688aa;border:1px solid #2a6090;border-radius:4px;padding:3px 7px;font-family:"Press Start 2P",monospace;font-size:10px;cursor:pointer;';
      removeBtn.addEventListener('click', function() { removeDailyReminder(r.id); });
      row.appendChild(removeBtn);

      listEl.appendChild(row);
    });
  }

  // Wire input + button
  (function() {
    var input = document.getElementById('dailyReminderInput');
    var btn = document.getElementById('addDailyReminderBtn');
    if (input) input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var text = (input.value || '').trim();
        if (text) { addDailyReminder(text); input.value = ''; }
      }
    });
    if (btn) btn.addEventListener('click', function() {
      var text = (input.value || '').trim();
      if (text) { addDailyReminder(text); input.value = ''; }
    });
  })();

  // ---- Daily reminders walk-through popup ----
  var _reminderIdx = 0;

  function maybeDailyRemindersPopup() {
    if (!state.dailyRemindersEnabled) return;
    if (!Array.isArray(state.dailyReminders) || state.dailyReminders.length === 0) return;
    var today = todayStr();
    if (state.dailyRemindersLastShown === today) return;
    // Show the popup
    _reminderIdx = 0;
    _showReminderCard();
  }

  function _showReminderCard() {
    var items = state.dailyReminders || [];
    if (_reminderIdx >= items.length) {
      // Done — close
      var modal = document.getElementById('dailyRemindersModal');
      if (modal) modal.style.display = 'none';
      state.dailyRemindersLastShown = todayStr();
      save();
      return;
    }
    var modal = document.getElementById('dailyRemindersModal');
    if (!modal) return;
    modal.style.display = 'flex';

    var textEl = document.getElementById('reminderCardText');
    var progressEl = document.getElementById('reminderProgress');
    var nextBtn = document.getElementById('reminderNextBtn');
    var doneBtn = document.getElementById('reminderDoneBtn');

    if (textEl) textEl.textContent = items[_reminderIdx].text;
    if (progressEl) progressEl.textContent = (_reminderIdx + 1) + ' of ' + items.length;

    var isLast = (_reminderIdx >= items.length - 1);
    if (nextBtn) nextBtn.style.display = isLast ? 'none' : 'inline-block';
    if (doneBtn) doneBtn.style.display = isLast ? 'inline-block' : 'none';
  }

  // Wire modal buttons
  (function() {
    var nextBtn = document.getElementById('reminderNextBtn');
    var doneBtn = document.getElementById('reminderDoneBtn');
    var skipBtn = document.getElementById('reminderSkipAllBtn');

    if (nextBtn) nextBtn.addEventListener('click', function() {
      _reminderIdx++;
      _showReminderCard();
    });
    if (doneBtn) doneBtn.addEventListener('click', function() {
      _reminderIdx = (state.dailyReminders || []).length; // force close
      _showReminderCard();
    });
    if (skipBtn) skipBtn.addEventListener('click', function() {
      var modal = document.getElementById('dailyRemindersModal');
      if (modal) modal.style.display = 'none';
      state.dailyRemindersLastShown = todayStr();
      save();
    });
  })();

  // ---- Incrementalization prompt (Q.I.D. — once per day per task) ----
  // Scans ALL tasks (project, priority, today) that are 24h+ old and
  // uncompleted. Shows once per calendar day per task. Saving aqueducts on
  // a non-today task auto-sends it to Today's Tasks with stages attached.
  var _incrementalizeQueue = [];  // [{id, text, type:'today'|'project'|'priority', projectId?}]
  var _incrementalizePendingStages = [];

  function _incrLogKey(id) { return 'incr_' + id; }

  function _wasPromptedToday(id) {
    if (!state.incrementalizeLog) return false;
    var key = _incrLogKey(id);
    var last = state.incrementalizeLog[key];
    if (!last) return false;
    // Check if on hold (delay-until timestamp)
    var holdKey = 'hold_' + id;
    var holdUntil = state.incrementalizeLog[holdKey];
    if (holdUntil && Date.now() < holdUntil) return true; // still on hold
    var today = todayStr();
    // v3.21.55: Use LOCAL date for comparison — toISOString is UTC
    var _ld = new Date(last);
    var _lmm = _ld.getMonth() + 1;
    var _ldd = _ld.getDate();
    var lastLocal = _ld.getFullYear() + '-' + (_lmm < 10 ? '0' : '') + _lmm + '-' + (_ldd < 10 ? '0' : '') + _ldd;
    return lastLocal === today;
  }

  function _markPromptedToday(id) {
    if (!state.incrementalizeLog) state.incrementalizeLog = {};
    state.incrementalizeLog[_incrLogKey(id)] = Date.now();
    save();
  }

  function _putOnHold(id, days) {
    if (!state.incrementalizeLog) state.incrementalizeLog = {};
    state.incrementalizeLog['hold_' + id] = Date.now() + (days * 24 * 60 * 60 * 1000);
    state.incrementalizeLog[_incrLogKey(id)] = Date.now();
    save();
  }

  function checkIncrementalization() {
    // Global defer — skip all incrementalize prompts until this time
    if (state.incrementalizeDeferUntil && Date.now() < state.incrementalizeDeferUntil) return;
    var now = Date.now();
    var STALE_MS = 24 * 60 * 60 * 1000;
    _incrementalizeQueue = [];

    // 1. Today's tasks
    if (Array.isArray(state.todayTasks)) {
      for (var i = 0; i < state.todayTasks.length; i++) {
        var t = state.todayTasks[i];
        if (t.incrementalizedAt) continue;
        if (t.neverIncrementalize) continue;
        if (!t.createdAt || (now - t.createdAt) < STALE_MS) continue;
        if (_wasPromptedToday(t.id)) continue;
        _incrementalizeQueue.push({ id: t.id, text: t.text, type: 'today' });
      }
    }

    // 2. Project tasks (uncompleted, 24h+ old)
    if (state.projects && state.tasks) {
      for (var p = 0; p < state.projects.length; p++) {
        var proj = state.projects[p];
        var ptasks = state.tasks[proj.id] || [];
        for (var j = 0; j < ptasks.length; j++) {
          var pt = ptasks[j];
          if (pt.completed) continue;
          if (pt.neverIncrementalize) continue;
          if (!pt.createdAt || (now - pt.createdAt) < STALE_MS) continue;
          if (_wasPromptedToday(pt.id)) continue;
          // Skip if already in today tasks
          if (isInTodayTasks(pt.id)) continue;
          _incrementalizeQueue.push({ id: pt.id, text: pt.text, type: 'project', projectId: proj.id });
        }
      }
    }

    // 3. Priority tasks (active, 24h+ old)
    if (Array.isArray(state.priorityTasks)) {
      var activePri = getActivePriorityTasks();
      for (var k = 0; k < activePri.length; k++) {
        var pri = activePri[k];
        if (pri.neverIncrementalize) continue;
        if (!pri.createdAt || (now - pri.createdAt) < STALE_MS) continue;
        if (_wasPromptedToday(pri.id)) continue;
        if (isInTodayTasks(pri.id)) continue;
        _incrementalizeQueue.push({ id: pri.id, text: pri.text, type: 'priority' });
      }
    }

    if (_incrementalizeQueue.length > 0) _showNextIncrementalize();
  }

  function _showNextIncrementalize() {
    if (_incrementalizeQueue.length === 0) return;
    var entry = _incrementalizeQueue[0];
    showIncrementalizeModal(entry.id, entry.text, entry.type, entry.projectId);
  }

  // Helper: find a task object by ID across task types
  function _findTaskById(taskId, taskType, projectId) {
    if (taskType === 'today' && Array.isArray(state.todayTasks)) {
      for (var i = 0; i < state.todayTasks.length; i++) {
        if (state.todayTasks[i].id === taskId) return state.todayTasks[i];
      }
    } else if (taskType === 'project' && projectId && state.tasks && state.tasks[projectId]) {
      var ptasks = state.tasks[projectId];
      for (var j = 0; j < ptasks.length; j++) {
        if (ptasks[j].id === taskId) return ptasks[j];
      }
    } else if (taskType === 'priority' && Array.isArray(state.priorityTasks)) {
      for (var k = 0; k < state.priorityTasks.length; k++) {
        if (state.priorityTasks[k].id === taskId) return state.priorityTasks[k];
      }
    }
    return null;
  }

  function showIncrementalizeModal(taskId, taskText, taskType, projectId) {
    var modal = document.getElementById('incrementalizeModal');
    if (!modal) return;
    _incrementalizePendingStages = [];

    var nameEl = document.getElementById('incrementalizeTaskName');
    if (nameEl) nameEl.textContent = taskText || '(unknown task)';

    var stagesEl = document.getElementById('incrementalizeStages');
    if (stagesEl) stagesEl.innerHTML = '';

    var inputEl = document.getElementById('incrementalizeInput');
    if (inputEl) inputEl.value = '';

    modal.style.display = 'flex';
    modal.dataset.taskId = taskId;
    modal.dataset.taskType = taskType || 'today';
    modal.dataset.projectId = projectId || '';
    modal.dataset.taskText = taskText || '';

    // Check if the task already has recurrentAqueducts set
    var recurrentToggle = document.getElementById('incrementalizeRecurrentToggle');
    if (recurrentToggle) {
      var existingTask = _findTaskById(taskId, taskType, projectId);
      recurrentToggle.checked = !!(existingTask && existingTask.recurrentAqueducts);
    }

    // Populate "pull from today" list
    var fromTodayWrap = document.getElementById('incrementalizeFromTodayWrap');
    var fromTodayList = document.getElementById('incrementalizeFromTodayList');
    if (fromTodayWrap && fromTodayList) {
      fromTodayList.innerHTML = '';
      var todayItems = (Array.isArray(state.todayTasks) ? state.todayTasks : []).filter(function(t) {
        return t.id !== taskId; // exclude the task being incrementalized
      });
      if (todayItems.length === 0) {
        fromTodayWrap.style.display = 'none';
      } else {
        fromTodayWrap.style.display = 'block';
        todayItems.forEach(function(t) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:3px 4px;';
          var pickBtn = document.createElement('button');
          pickBtn.type = 'button';
          pickBtn.textContent = '+';
          pickBtn.title = 'Add "' + t.text + '" as an aqueduct stage.';
          pickBtn.style.cssText = 'background:#8b5e1a;color:#fff;border:1px solid #ffb43c;border-radius:3px;padding:2px 8px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;';
          pickBtn.addEventListener('click', function() {
            if (_incrementalizePendingStages.indexOf(t.text) === -1) {
              _incrementalizePendingStages.push(t.text);
              _renderPendingStages();
            }
            row.style.opacity = '0.4';
            pickBtn.disabled = true;
          });
          row.appendChild(pickBtn);
          var txt = document.createElement('span');
          txt.style.cssText = 'color:#ffe0b2;font-size:11px;';
          txt.textContent = t.text;
          row.appendChild(txt);
          fromTodayList.appendChild(row);
        });
      }
    }

    if (inputEl) setTimeout(function() { inputEl.focus(); }, 100);
  }

  var _incrDragIdx = null; // index being dragged

  function _renderPendingStages() {
    var stagesEl = document.getElementById('incrementalizeStages');
    if (!stagesEl) return;
    stagesEl.innerHTML = '';
    _incrementalizePendingStages.forEach(function(s, idx) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 6px;margin-bottom:4px;background:rgba(255,180,60,0.08);border:1px solid rgba(184,115,26,0.3);border-radius:4px;cursor:grab;transition:opacity 0.15s;';
      row.draggable = true;
      row.dataset.idx = idx;

      // Drag handle
      var handle = document.createElement('span');
      handle.textContent = '\u2630';
      handle.style.cssText = 'color:#886655;font-size:11px;cursor:grab;user-select:none;padding:0 2px;';
      row.appendChild(handle);

      var num = document.createElement('span');
      num.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:9px;color:#ffb43c;min-width:22px;text-align:center;';
      num.textContent = '#' + (idx + 1);
      row.appendChild(num);

      var txt = document.createElement('span');
      txt.style.cssText = 'flex:1;color:#ffe0b2;font-size:12px;';
      txt.textContent = s;
      row.appendChild(txt);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '\u2715';
      removeBtn.style.cssText = 'background:transparent;color:#886655;border:1px solid #5a3a10;border-radius:3px;padding:2px 6px;font-size:10px;cursor:pointer;';
      removeBtn.addEventListener('click', function() {
        _incrementalizePendingStages.splice(idx, 1);
        _renderPendingStages();
      });
      row.appendChild(removeBtn);

      // Drag events
      row.addEventListener('dragstart', function(e) {
        _incrDragIdx = idx;
        row.style.opacity = '0.4';
        try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); } catch (_) {}
      });
      row.addEventListener('dragend', function() {
        _incrDragIdx = null;
        row.style.opacity = '1';
        // Clear drop indicators
        var rows = stagesEl.querySelectorAll('[data-idx]');
        for (var r = 0; r < rows.length; r++) {
          rows[r].style.borderTop = '';
          rows[r].style.borderBottom = '';
        }
      });
      row.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (_incrDragIdx === null || _incrDragIdx === idx) return;
        var rect = row.getBoundingClientRect();
        var midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          row.style.borderTop = '2px solid #ffb43c';
          row.style.borderBottom = '';
        } else {
          row.style.borderBottom = '2px solid #ffb43c';
          row.style.borderTop = '';
        }
      });
      row.addEventListener('dragleave', function() {
        row.style.borderTop = '';
        row.style.borderBottom = '';
      });
      row.addEventListener('drop', function(e) {
        e.preventDefault();
        row.style.borderTop = '';
        row.style.borderBottom = '';
        if (_incrDragIdx === null || _incrDragIdx === idx) return;
        var rect = row.getBoundingClientRect();
        var midY = rect.top + rect.height / 2;
        var targetIdx = e.clientY < midY ? idx : idx + 1;
        // Move the dragged item
        var item = _incrementalizePendingStages.splice(_incrDragIdx, 1)[0];
        if (targetIdx > _incrDragIdx) targetIdx--;
        _incrementalizePendingStages.splice(targetIdx, 0, item);
        _incrDragIdx = null;
        _renderPendingStages();
      });

      stagesEl.appendChild(row);
    });

    // Update input placeholder with next number
    var inputEl = document.getElementById('incrementalizeInput');
    if (inputEl) {
      var nextNum = _incrementalizePendingStages.length + 1;
      inputEl.placeholder = 'Stage #' + nextNum + ' — e.g. Find the URL first...';
    }
  }

  function _applyAqueductsToTodayTask(taskId, stages) {
    for (var i = 0; i < state.todayTasks.length; i++) {
      if (state.todayTasks[i].id !== taskId) continue;
      if (!state.todayTasks[i].aqueducts) state.todayTasks[i].aqueducts = [];
      for (var j = 0; j < stages.length; j++) {
        state.todayTasks[i].aqueducts.push({
          id: 'aq' + Date.now() + '-' + Math.random().toString(36).slice(2, 5) + j,
          text: stages[j],
          done: false
        });
      }
      state.todayTasks[i].incrementalizedAt = Date.now();
      return true;
    }
    return false;
  }

  function _advanceIncrQueue() {
    _incrementalizeQueue.shift();
    if (_incrementalizeQueue.length > 0) {
      setTimeout(_showNextIncrementalize, 300);
    }
  }

  // Wire incrementalize modal buttons
  (function() {
    function addStageFromInput() {
      var inputEl = document.getElementById('incrementalizeInput');
      if (!inputEl) return;
      var text = (inputEl.value || '').trim();
      if (!text) return;
      _incrementalizePendingStages.push(text);
      inputEl.value = '';
      _renderPendingStages();
      inputEl.focus();
    }
    var addBtn = document.getElementById('incrementalizeAddBtn');
    if (addBtn) addBtn.addEventListener('click', addStageFromInput);
    var addInput = document.getElementById('incrementalizeInput');
    if (addInput) addInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); addStageFromInput(); }
    });

    // Save aqueducts
    var saveBtn = document.getElementById('incrementalizeSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', function() {
      var modal = document.getElementById('incrementalizeModal');
      if (!modal) return;
      var taskId = modal.dataset.taskId;
      var taskType = modal.dataset.taskType;
      var taskText = modal.dataset.taskText;
      if (!taskId || _incrementalizePendingStages.length === 0) {
        try { notify('Add at least one aqueduct stage.', '#ffb43c'); } catch (_) {}
        return;
      }

      _markPromptedToday(taskId);

      var recurrentToggle = document.getElementById('incrementalizeRecurrentToggle');
      var isRecurrent = !!(recurrentToggle && recurrentToggle.checked);
      var projectId = modal.dataset.projectId || '';

      if (taskType === 'today') {
        // Already in Today's Tasks — just attach aqueducts
        _applyAqueductsToTodayTask(taskId, _incrementalizePendingStages);
        // Set recurrent flag on the today task
        var todayTask = _findTaskById(taskId, 'today');
        if (todayTask) todayTask.recurrentAqueducts = isRecurrent;
      } else if (taskType === 'project') {
        // Apply aqueducts directly to the project task (don't move to today)
        var projTask = _findTaskById(taskId, 'project', projectId);
        if (projTask) {
          if (!projTask.aqueducts) projTask.aqueducts = [];
          for (var j = 0; j < _incrementalizePendingStages.length; j++) {
            projTask.aqueducts.push({
              id: 'aq' + Date.now() + '-' + Math.random().toString(36).slice(2, 5) + j,
              text: _incrementalizePendingStages[j],
              done: false
            });
          }
          projTask.incrementalizedAt = Date.now();
          projTask.recurrentAqueducts = isRecurrent;
        }
      } else if (taskType === 'priority') {
        // Apply aqueducts directly to the priority task
        var priTask = _findTaskById(taskId, 'priority');
        if (priTask) {
          if (!priTask.aqueducts) priTask.aqueducts = [];
          for (var j2 = 0; j2 < _incrementalizePendingStages.length; j2++) {
            priTask.aqueducts.push({
              id: 'aq' + Date.now() + '-' + Math.random().toString(36).slice(2, 5) + j2,
              text: _incrementalizePendingStages[j2],
              done: false
            });
          }
          priTask.incrementalizedAt = Date.now();
          priTask.recurrentAqueducts = isRecurrent;
        }
      }

      _incrementalizePendingStages = [];
      save();
      renderTodayTasks();
      render();
      modal.style.display = 'none';
      _advanceIncrQueue();
    });

    // Dismiss task — removes from today if it's there, or just skips
    var dismissBtn = document.getElementById('incrementalizeDismissBtn');
    if (dismissBtn) dismissBtn.addEventListener('click', function() {
      var modal = document.getElementById('incrementalizeModal');
      if (!modal) return;
      var taskId = modal.dataset.taskId;
      var taskType = modal.dataset.taskType;
      _markPromptedToday(taskId);
      if (taskType === 'today') {
        removeTodayTask(taskId);
      } else if (taskType === 'project') {
        // Delete from project
        try { deleteTask(taskId); } catch (_) {}
      } else if (taskType === 'priority') {
        try { removePriority(taskId); } catch (_) {}
      }
      modal.style.display = 'none';
      _advanceIncrQueue();
    });

    // Skip — mark prompted today, advance to next in queue (task stays)
    var skipBtn = document.getElementById('incrementalizeSkipBtn');
    if (skipBtn) skipBtn.addEventListener('click', function() {
      var modal = document.getElementById('incrementalizeModal');
      if (!modal) return;
      var taskId = modal.dataset.taskId;
      if (taskId) _markPromptedToday(taskId);
      _incrementalizePendingStages = [];
      modal.style.display = 'none';
      _advanceIncrQueue();
    });

    // Skip All — mark all remaining prompted today, close modal entirely
    var skipAllBtn = document.getElementById('incrementalizeSkipAllBtn');
    if (skipAllBtn) skipAllBtn.addEventListener('click', function() {
      var modal = document.getElementById('incrementalizeModal');
      if (!modal) return;
      for (var q = 0; q < _incrementalizeQueue.length; q++) {
        _markPromptedToday(_incrementalizeQueue[q].id);
      }
      _incrementalizeQueue = [];
      _incrementalizePendingStages = [];
      modal.style.display = 'none';
    });

    // Defer All 4 Hours — suppress all incrementalize prompts for 4h
    var defer4hBtn = document.getElementById('incrementalizeDefer4hBtn');
    if (defer4hBtn) defer4hBtn.addEventListener('click', function() {
      var modal = document.getElementById('incrementalizeModal');
      if (!modal) return;
      state.incrementalizeDeferUntil = Date.now() + (4 * 60 * 60 * 1000);
      _incrementalizeQueue = [];
      _incrementalizePendingStages = [];
      save();
      modal.style.display = 'none';
    });

    // Not Incremental — permanently mark this task so the prompt never shows for it again
    var neverBtn = document.getElementById('incrementalizeNeverBtn');
    if (neverBtn) neverBtn.addEventListener('click', function() {
      var modal = document.getElementById('incrementalizeModal');
      if (!modal) return;
      var taskId = modal.dataset.taskId;
      var taskType = modal.dataset.taskType;
      if (taskId) {
        // Find the task and set neverIncrementalize = true
        if (taskType === 'today' && Array.isArray(state.todayTasks)) {
          for (var i = 0; i < state.todayTasks.length; i++) {
            if (state.todayTasks[i].id === taskId) { state.todayTasks[i].neverIncrementalize = true; break; }
          }
        } else if (taskType === 'project') {
          var projId = modal.dataset.projectId;
          if (projId && state.tasks && state.tasks[projId]) {
            for (var j = 0; j < state.tasks[projId].length; j++) {
              if (state.tasks[projId][j].id === taskId) { state.tasks[projId][j].neverIncrementalize = true; break; }
            }
          }
        } else if (taskType === 'priority' && Array.isArray(state.priorityTasks)) {
          for (var k = 0; k < state.priorityTasks.length; k++) {
            if (state.priorityTasks[k].id === taskId) { state.priorityTasks[k].neverIncrementalize = true; break; }
          }
        }
        _markPromptedToday(taskId);
        save();
      }
      _incrementalizePendingStages = [];
      modal.style.display = 'none';
      _advanceIncrQueue();
    });

    // Not now — mark prompted today, come back tomorrow
    // Close button + backdrop click — just closes, marks prompted today
    function closeIncrModal() {
      var modal = document.getElementById('incrementalizeModal');
      if (!modal) return;
      var taskId = modal.dataset.taskId;
      if (taskId) _markPromptedToday(taskId);
      modal.style.display = 'none';
      _advanceIncrQueue();
    }
    var closeBtn = document.getElementById('incrementalizeCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeIncrModal);
    var incrModal = document.getElementById('incrementalizeModal');
    if (incrModal) incrModal.addEventListener('click', function(ev) {
      if (ev.target === incrModal) closeIncrModal();
    });

    // Delay / hold buttons (1 day, 2 days, 1 week, 1 month)
    var delayBtns = document.querySelectorAll('.incr-delay-btn');
    delayBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var modal = document.getElementById('incrementalizeModal');
        if (!modal) return;
        var taskId = modal.dataset.taskId;
        var days = parseInt(btn.dataset.delay, 10) || 1;
        _putOnHold(taskId, days);
        try {
          var labels = { 1: '1 day', 2: '2 days', 7: '1 week', 30: '1 month' };
          notify('Task on hold for ' + (labels[days] || days + ' days') + '.', '#ffb43c');
        } catch (_) {}
        modal.style.display = 'none';
        _advanceIncrQueue();
      });
    });
  })();

  // ---- Drag-to-reorder Today's Tasks (v3.23.74) ----
  var _draggedTodayId = null;

  function reorderTodayTask(draggedId, targetId, place) {
    if (draggedId === targetId) return false;
    var list = state.todayTasks;
    if (!Array.isArray(list)) return false;
    var fromIdx = -1, toIdx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === draggedId) fromIdx = i;
      if (list[i].id === targetId) toIdx = i;
    }
    if (fromIdx < 0 || toIdx < 0) return false;
    var moved = list.splice(fromIdx, 1)[0];
    var insertIdx = -1;
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === targetId) { insertIdx = j; break; }
    }
    if (insertIdx < 0) insertIdx = list.length;
    if (place === 'after') insertIdx += 1;
    list.splice(insertIdx, 0, moved);
    save();
    renderTodayTasks();
    return true;
  }

  // ---- Render Today's Tasks ----
  function renderTodayTasks() {
    pruneOrphanedTodayTasks();
    var listEl = document.getElementById('todayTasksList');
    var countEl = document.getElementById('todayTasksCount');
    if (!listEl) return;
    var tasks = Array.isArray(state.todayTasks) ? state.todayTasks : [];
    if (countEl) countEl.textContent = String(tasks.length);
    listEl.innerHTML = '';
    if (tasks.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:8px;text-align:center;color:#886655;font-size:11px;font-style:italic;';
      empty.textContent = 'No tasks for today. Add one above, or use \u2192TODAY on other tasks.';
      listEl.appendChild(empty);
      return;
    }
    tasks.forEach(function(t) {
      // Ensure aqueducts array exists (migration for older tasks)
      if (!t.aqueducts) t.aqueducts = [];

      var hasOpenAqueducts = _todayTaskHasOpenAqueducts(t);
      var allAqueductsDone = t.aqueducts.length > 0 && !hasOpenAqueducts;

      // -- Main task row --
      var row = document.createElement('div');
      row.className = 'today-task-row';
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 4px;border-bottom:' +
        (t.aqueducts.length > 0 ? 'none' : '1px solid rgba(184,115,26,0.3)') + ';transition:border-color 0.15s;';
      row.dataset.todayId = t.id;

      // v3.23.74: Drag handle + reorder wiring
      row.setAttribute('draggable', 'true');
      var dragHandle = document.createElement('span');
      dragHandle.textContent = '☰';
      dragHandle.title = 'Drag to reorder';
      dragHandle.style.cssText = 'cursor:grab;color:#886655;font-size:11px;flex-shrink:0;user-select:none;padding:0 2px;';
      row.appendChild(dragHandle);

      (function(taskId) {
        row.addEventListener('dragstart', function(e) {
          _draggedTodayId = taskId;
          row.style.opacity = '0.4';
          try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', taskId);
          } catch (_) {}
        });
        row.addEventListener('dragend', function() {
          _draggedTodayId = null;
          row.style.opacity = '1';
          var siblings = listEl.querySelectorAll('.today-task-row');
          for (var s = 0; s < siblings.length; s++) {
            siblings[s].style.borderTopColor = '';
            siblings[s].style.borderBottomColor = '';
            siblings[s].style.borderTopWidth = '';
            siblings[s].style.borderBottomWidth = '';
          }
        });
        row.addEventListener('dragover', function(e) {
          if (!_draggedTodayId || _draggedTodayId === taskId) return;
          e.preventDefault();
          try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
          var rect = row.getBoundingClientRect();
          var isAfter = (e.clientY - rect.top) > (rect.height / 2);
          row.style.borderTopColor = isAfter ? '' : '#ffb43c';
          row.style.borderTopWidth = isAfter ? '' : '2px';
          row.style.borderBottomColor = isAfter ? '#ffb43c' : '';
          row.style.borderBottomWidth = isAfter ? '2px' : '';
        });
        row.addEventListener('dragleave', function(e) {
          if (e.relatedTarget && row.contains(e.relatedTarget)) return;
          row.style.borderTopColor = '';
          row.style.borderBottomColor = '';
          row.style.borderTopWidth = '';
          row.style.borderBottomWidth = '';
        });
        row.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var srcId = _draggedTodayId;
          row.style.borderTopColor = '';
          row.style.borderBottomColor = '';
          row.style.borderTopWidth = '';
          row.style.borderBottomWidth = '';
          if (!srcId || srcId === taskId) return;
          var rect = row.getBoundingClientRect();
          var isAfter = (e.clientY - rect.top) > (rect.height / 2);
          reorderTodayTask(srcId, taskId, isAfter ? 'after' : 'before');
        });
      })(t.id);

      var txt = document.createElement('div');
      txt.style.cssText = 'flex:1;color:#ffe0b2;font-size:12px;word-break:break-word;' +
        (hasOpenAqueducts ? 'opacity:0.5;' : '') +
        (allAqueductsDone ? 'text-shadow:0 0 6px rgba(255,180,60,0.4);' : '');
      txt.textContent = t.text;
      if (t.aqueducts.length > 0) {
        var completedAq = t.aqueducts.filter(function(a) { return a.done; }).length;
        var aqBadge = document.createElement('span');
        aqBadge.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:7px;color:#ffb43c;margin-left:6px;border:1px solid #8b5e1a;border-radius:8px;padding:1px 5px;';
        aqBadge.textContent = completedAq + '/' + t.aqueducts.length + (t.recurrentAqueducts ? ' \u21BB' : ' \u2B62');
        aqBadge.title = completedAq + ' of ' + t.aqueducts.length + ' aqueduct stage(s) complete' + (t.recurrentAqueducts ? ' (resets daily)' : '');
        txt.appendChild(aqBadge);
      }
      row.appendChild(txt);

      if (t.sourceType) {
        var srcBadge = document.createElement('span');
        srcBadge.textContent = t.sourceType === 'priority' ? '\u26A0' : '\u2630';
        srcBadge.title = 'Linked from ' + (t.sourceType === 'priority' ? 'High Priority' : 'project tasks');
        srcBadge.style.cssText = 'font-size:10px;color:#886655;';
        row.appendChild(srcBadge);
      }

      // v3.21.34: Do Now button on today tasks
      var doNowTBtn = document.createElement('button');
      doNowTBtn.type = 'button'; doNowTBtn.textContent = 'DO NOW';
      doNowTBtn.title = 'Do this task right now. Set a time estimate and commit.';
      doNowTBtn.className = 'task-donow-btn';
      doNowTBtn.addEventListener('click', function() { startDoNow(t.id, t.text, !!t.sourceType); });
      row.appendChild(doNowTBtn);

      // Manual incrementalize button (add aqueducts any time)
      var aqBtn = document.createElement('button');
      aqBtn.type = 'button'; aqBtn.textContent = '\u2B62';
      aqBtn.title = 'Incrementalize \u2014 break this task into aqueduct stages.';
      aqBtn.style.cssText = 'background:transparent;color:#ffb43c;border:1px solid #5a3a10;border-radius:4px;padding:3px 6px;font-size:11px;cursor:pointer;';
      aqBtn.addEventListener('click', function() { showIncrementalizeModal(t.id); });
      row.appendChild(aqBtn);

      var doneBtn = document.createElement('button');
      doneBtn.type = 'button'; doneBtn.textContent = '\u2713';
      if (hasOpenAqueducts) {
        doneBtn.title = 'Complete aqueduct stages first.';
        doneBtn.style.cssText = 'background:#1a1a1a;color:#555;border:1px solid #333;border-radius:4px;padding:3px 8px;font-family:"Press Start 2P",monospace;font-size:10px;cursor:not-allowed;opacity:0.4;';
      } else {
        doneBtn.title = t.sourceType ? 'Mark done (also completes the source task).' : 'Mark done.';
        doneBtn.style.cssText = 'background:#2a5a2a;color:#b8ffb8;border:1px solid #4a8a4a;border-radius:4px;padding:3px 8px;font-family:"Press Start 2P",monospace;font-size:10px;cursor:pointer;';
      }
      doneBtn.addEventListener('click', function() { completeTodayTask(t.id); });
      row.appendChild(doneBtn);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button'; removeBtn.textContent = '\u2715';
      removeBtn.title = 'Remove from today (does not affect the source task).';
      removeBtn.style.cssText = 'background:transparent;color:#886655;border:1px solid #b8731a;border-radius:4px;padding:3px 7px;font-family:"Press Start 2P",monospace;font-size:10px;cursor:pointer;';
      removeBtn.addEventListener('click', function() { removeTodayTask(t.id); });
      row.appendChild(removeBtn);

      listEl.appendChild(row);

      // -- Aqueduct stages: compact view (show only current stage + expand toggle) --
      if (t.aqueducts.length > 0) {
        var completedAqCount = t.aqueducts.filter(function(a) { return a.done; }).length;
        var nextAq = null;
        var nextAqIdx = -1;
        for (var _ai = 0; _ai < t.aqueducts.length; _ai++) {
          if (!t.aqueducts[_ai].done) { nextAq = t.aqueducts[_ai]; nextAqIdx = _ai; break; }
        }

        var aqContainer = document.createElement('div');
        aqContainer.style.cssText = 'margin:0 0 4px 12px;border-left:2px solid #8b5e1a;border-bottom:1px solid rgba(184,115,26,0.3);';

        // Current stage row (always visible)
        if (nextAq) {
          var currentRow = document.createElement('div');
          currentRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 8px;background:rgba(255,180,60,0.06);';

          var stepLabel = document.createElement('span');
          stepLabel.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:7px;color:#ffb43c;white-space:nowrap;';
          stepLabel.textContent = 'STEP ' + (nextAqIdx + 1) + '/' + t.aqueducts.length;
          currentRow.appendChild(stepLabel);

          var currentTxt = document.createElement('span');
          currentTxt.style.cssText = 'flex:1;color:#ffe0b2;font-size:12px;font-weight:bold;';
          currentTxt.textContent = nextAq.text;
          currentRow.appendChild(currentTxt);

          var currentDone = document.createElement('button');
          currentDone.type = 'button'; currentDone.textContent = '\u2713';
          currentDone.title = 'Complete step ' + (nextAqIdx + 1) + ' and advance to the next.';
          currentDone.style.cssText = 'background:#2a4a2a;color:#b8ffb8;border:1px solid #4a8a4a;border-radius:3px;padding:3px 8px;font-family:"Press Start 2P",monospace;font-size:8px;cursor:pointer;';
          (function(aqId) {
            currentDone.addEventListener('click', function() { completeAqueduct(t.id, aqId); });
          })(nextAq.id);
          currentRow.appendChild(currentDone);

          aqContainer.appendChild(currentRow);
        } else {
          // All done
          var allDoneRow = document.createElement('div');
          allDoneRow.style.cssText = 'padding:5px 8px;font-family:"Press Start 2P",monospace;font-size:7px;color:#4a8a4a;';
          allDoneRow.textContent = '\u2713 ALL ' + t.aqueducts.length + ' STAGES COMPLETE';
          aqContainer.appendChild(allDoneRow);
        }

        // Progress bar
        var progWrap = document.createElement('div');
        progWrap.style.cssText = 'height:3px;background:#1a0f00;margin:0 8px;border-radius:2px;overflow:hidden;';
        var progFill = document.createElement('div');
        var progPct = t.aqueducts.length > 0 ? (completedAqCount / t.aqueducts.length) * 100 : 0;
        progFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#ffb43c,#ff8c3a);width:' + progPct + '%;border-radius:2px;transition:width 0.3s;';
        progWrap.appendChild(progFill);
        aqContainer.appendChild(progWrap);

        // Expand toggle (collapsed by default)
        var expandRow = document.createElement('div');
        expandRow.style.cssText = 'padding:3px 8px;';
        var expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.style.cssText = 'background:none;border:none;color:#886655;font-family:"Press Start 2P",monospace;font-size:6px;cursor:pointer;padding:2px 0;letter-spacing:0.5px;';
        expandBtn.textContent = '\u25B6 VIEW ALL STAGES (' + completedAqCount + '/' + t.aqueducts.length + ')';
        expandBtn.title = 'Expand to see all aqueduct stages.';

        var expandPanel = document.createElement('div');
        expandPanel.style.cssText = 'display:none;padding:4px 0;';

        t.aqueducts.forEach(function(aq, aqIdx) {
          var aqRow = document.createElement('div');
          aqRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:2px 8px;opacity:' + (aq.done ? '0.5' : '1') + ';';

          var numEl = document.createElement('span');
          numEl.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:7px;color:' + (aq.done ? '#4a8a4a' : (aqIdx === nextAqIdx ? '#fff' : '#ffb43c')) + ';min-width:20px;text-align:center;';
          numEl.textContent = '#' + (aqIdx + 1);
          aqRow.appendChild(numEl);

          var aqTxt = document.createElement('span');
          aqTxt.style.cssText = 'flex:1;font-size:10px;color:' + (aq.done ? '#4a8a4a' : '#ffe0b2') + ';' +
            (aq.done ? 'text-decoration:line-through;' : '') +
            (aqIdx === nextAqIdx ? 'font-weight:bold;color:#fff;' : '');
          aqTxt.textContent = aq.text;
          aqRow.appendChild(aqTxt);

          var statusEl = document.createElement('span');
          statusEl.style.cssText = 'font-size:10px;';
          if (aq.done) { statusEl.textContent = '\u2713'; statusEl.style.color = '#4a8a4a'; }
          else if (aqIdx === nextAqIdx) { statusEl.textContent = '\u25C0 NOW'; statusEl.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:6px;color:#ffb43c;'; }
          aqRow.appendChild(statusEl);

          expandPanel.appendChild(aqRow);
        });

        expandBtn.addEventListener('click', function() {
          var showing = expandPanel.style.display !== 'none';
          expandPanel.style.display = showing ? 'none' : 'block';
          expandBtn.textContent = (showing ? '\u25B6' : '\u25BC') + ' VIEW ALL STAGES (' + completedAqCount + '/' + t.aqueducts.length + ')';
        });

        expandRow.appendChild(expandBtn);
        aqContainer.appendChild(expandRow);
        aqContainer.appendChild(expandPanel);

        listEl.appendChild(aqContainer);
      }
    });
  }

  // Wire Today's Tasks input + button
  (function() {
    var input = document.getElementById('todayTaskInput');
    var btn = document.getElementById('addTodayTaskBtn');
    if (input) input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); addTodayTaskFromInput(); }
    });
    if (btn) btn.addEventListener('click', function() { addTodayTaskFromInput(); });
  })();

  // ============== TASK MANAGEMENT ==============
  function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    SFX.addTask();
    const task = {
      id: Date.now().toString(),
      text,
      completed: false,
      blocksEarned: 0,
      createdAt: Date.now()
    };
    // Route to a real project. If the ALL tab is currently active, fall
    // back to the last real project the user viewed, then to the first
    // project in the list. Tasks can never live under the ALL sentinel.
    var targetPid = state.activeProject;
    if (targetPid === ALL_PROJECT_ID) {
      targetPid = state.lastRealProject
        || ((state.projects && state.projects[0]) ? state.projects[0].id : 'default');
    }
    if (!state.tasks[targetPid]) state.tasks[targetPid] = [];
    state.tasks[targetPid].push(task);
    trackRecentTask(text);
    taskInput.value = '';
    save();
    render();
    // Surface where it went, so the player isn't confused when the new
    // task shows up with a project badge in the ALL view.
    if (state.activeProject === ALL_PROJECT_ID) {
      var proj = (state.projects || []).find(function(p) { return p.id === targetPid; });
      var pname = proj ? proj.name : targetPid;
      try { notify('Added to \u201C' + pname + '\u201D.', '#00ff88'); } catch (_) {}
    }
  }

  function trackRecentTask(text) {
    if (!state.recentTasks) state.recentTasks = [];
    // Remove duplicates (case-insensitive)
    state.recentTasks = state.recentTasks.filter(function(t) {
      return t.toLowerCase() !== text.toLowerCase();
    });
    // Add to front
    state.recentTasks.unshift(text);
    // Cap at 20
    if (state.recentTasks.length > 20) state.recentTasks = state.recentTasks.slice(0, 20);
  }

  function findTask(id) {
    for (var pid in state.tasks) {
      var arr = state.tasks[pid] || [];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) return arr[i];
      }
    }
    return null;
  }

  function findTaskProject(id) {
    for (var pid in state.tasks) {
      var arr = state.tasks[pid] || [];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) return pid;
      }
    }
    return null;
  }

  // v3.21.13: Daily task completion log for public profile.
  // state.dailyTaskLog = { date: 'YYYY-MM-DD', tasks: { 'Task name': count } }
  function logDailyTaskCompletion(taskName) {
    var today = todayStr();
    if (!state.dailyTaskLog || state.dailyTaskLog.date !== today) {
      state.dailyTaskLog = { date: today, tasks: {} };
    }
    var name = (taskName || '').trim();
    if (!name) return;
    state.dailyTaskLog.tasks[name] = (state.dailyTaskLog.tasks[name] || 0) + 1;
  }

  function toggleTask(id) {
    var task = findTask(id);
    if (!task) return;
    task.completed = !task.completed;
    if (task.completed) {
      // v3.23.14: Stamp completion time so recurring tasks know whether
      // they were completed today (prevents re-adding on page refresh).
      task.completedAt = Date.now();
      SFX.completeTask();
      // v3.20.26: bump lifetime task-completion count for the profile page.
      state.tasksCompletedLifetime = (state.tasksCompletedLifetime || 0) + 1;
      logDailyTaskCompletion(task.text);
      // v3.20.21: if this is a recurring task, show the "still want it?" toast
      if (task.recurring || isRecurringText(task.text)) {
        setTimeout(function() { showRecurringToast(task.text); }, 600);
      }
      // Add a colored pixel to the dustbin scatter plot
      if (!state.dustPixels) state.dustPixels = [];
      var palette = state.unlockedColors || ['#00ff88'];
      var color = palette[Math.floor(Math.random() * palette.length)];
      state.dustPixels.push({
        x: Math.random(),
        y: Math.random(),
        color: color,
        d: todayStr()   // v3.20.17: birth date for degradation calc
      });
      // v3.20.16: track daily task completions for dust-burn threshold.
      state.dustCompletedToday = (state.dustCompletedToday || 0) + 1;
      // v3.20.0 Stage 5: dust is only silently trimmed for players who
      // have NOT yet bought the Materials Incinerator — they have no
      // way to dispose of it themselves, so the bin forgives the
      // oldest specks at the 600 mark as housekeeping. Once the
      // incinerator is commissioned, dust accumulates until the
      // player chooses to burn it (and a much higher safety cap of
      // 5000 keeps the canvas from overflowing in extreme cases).
      var dustCap = state.materialsIncineratorUnlocked ? 5000 : 600;
      if (state.dustPixels.length > dustCap) {
        state.dustPixels = state.dustPixels.slice(state.dustPixels.length - dustCap);
      }
    } else {
      task.completedAt = null; // v3.23.14: clear timestamp on un-complete
      SFX.click();
    }
    save();
    render();
  }

  function deleteTask(id) {
    var pid = findTaskProject(id);
    if (!pid) return;
    state.tasks[pid] = (state.tasks[pid] || []).filter(function(t) { return t.id !== id; });
    if (state.selectedTaskId === id) state.selectedTaskId = null;
    SFX.deleteTask();
    save();
    render();
  }

  function selectTask(id) {
    if (state.selectedTaskId === id) {
      state.selectedTaskId = null;
    } else {
      state.selectedTaskId = id;
      SFX.tabSwitch();
    }
    save();
    render();
  }

  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============== DUSTBIN (scatter plot of completed task pixels) ==============
  function renderDustbin() {
    var canvas = $('dustbin');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, w, h);
    var pixels = state.dustPixels || [];
    pixels.forEach(function(p) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x * w), Math.floor(p.y * h), 3, 3);
    });

    // v3.20.0 Stage 5: show the BURN DUST button only after the
    // Materials Incinerator has been commissioned. Reads a single
    // state flag and updates the yield preview from the current
    // pile size. Does not mutate state.
    var burnRow = $('dustBurnRow');
    if (burnRow) {
      if (state.materialsIncineratorUnlocked) {
        burnRow.style.display = '';
        var hint = $('burnDustHint');
        var burnBtn = $('burnDustBtn');
        // Count today's tasks: use the incremental counter OR count
        // specks born today, whichever is higher (covers pre-update saves).
        var todayD = todayStr();
        var done = state.dustCompletedToday || 0;
        var spkToday = 0;
        var dp = state.dustPixels || [];
        for (var di = 0; di < dp.length; di++) {
          if (dp[di].d === todayD) spkToday++;
        }
        done = Math.max(done, spkToday);
        var gateReached = done >= DUST_TASK_GATE;
        var alreadyBurned = (state.dustBurnDate === todayStr());

        // Disable burn button if gate not met or already burned today.
        if (burnBtn) {
          burnBtn.disabled = !gateReached || alreadyBurned;
          burnBtn.style.opacity = (!gateReached || alreadyBurned) ? '0.4' : '1';
          burnBtn.textContent = 'BURN DUST';
        }

        // v3.21.93: Prominent lock banner above the button
        var lockBanner = $('dustLockBanner');
        var lockReason = $('dustLockReason');
        if (lockBanner && lockReason) {
          if (alreadyBurned) {
            lockBanner.style.display = '';
            lockBanner.style.borderColor = 'rgba(136,136,170,0.2)';
            lockBanner.querySelector('div').textContent = 'BURNED TODAY';
            lockBanner.querySelector('div').style.color = 'var(--text-dim)';
            lockReason.textContent = 'The annex is quiet until tomorrow.';
          } else if (!gateReached) {
            lockBanner.style.display = '';
            lockBanner.style.borderColor = 'rgba(212,168,87,0.3)';
            lockBanner.querySelector('div').style.color = '#d4a857';
            lockBanner.querySelector('div').textContent = 'INCINERATOR LOCKED';
            var remaining = DUST_TASK_GATE - done;
            lockReason.textContent = 'Complete ' + remaining + ' more task' + (remaining !== 1 ? 's' : '') + ' today to unlock. (Minimum ' + DUST_TASK_GATE + ' tasks required per day.)';
          } else {
            lockBanner.style.display = 'none';
          }
        }

        if (hint) {
          var streak = Math.max(0, state.streak || 0);
          var preview = DUST_BURN_BASE + streak * DUST_BURN_PER_STREAK;
          if (alreadyBurned) {
            hint.textContent = 'payout was $' + preview + ' (streak \u00D7' + streak + ')';
          } else {
            hint.textContent = 'today\u2019s burn: $' + preview + ' (streak \u00D7' + streak + ')';
          }
        }

        // v3.21.91: Always-visible burn status timer
        var timerEl = $('dustBurnTimer');
        if (timerEl) {
          timerEl.style.display = '';
          if (window._dustBurnTimerInterval) clearInterval(window._dustBurnTimerInterval);
          console.log('[Dustbin] dustBurnDate=' + (state.dustBurnDate || 'none') + ' todayStr=' + todayStr() + ' alreadyBurned=' + alreadyBurned + ' gateReached=' + gateReached + ' done=' + done);
          var _burnTimerBurned = alreadyBurned;
          var _burnTimerGate = gateReached;
          var _burnTimerNeed = DUST_TASK_GATE - done;
          function updateBurnTimer() {
            var now = new Date();
            var midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            var diff = midnight - now;
            var hh = Math.floor(diff / 3600000);
            var mm = Math.floor((diff % 3600000) / 60000);
            var ss = Math.floor((diff % 60000) / 1000);
            var clock = (hh < 10 ? '0' : '') + hh + ':'
              + (mm < 10 ? '0' : '') + mm + ':'
              + (ss < 10 ? '0' : '') + ss;

            if (diff <= 0) {
              timerEl.textContent = 'NEW DAY — RELOAD';
              timerEl.style.color = '#d4a857';
              clearInterval(window._dustBurnTimerInterval);
              return;
            }

            if (_burnTimerBurned) {
              // Already burned today — countdown to next opportunity
              timerEl.textContent = 'NEXT BURN: ' + clock;
              timerEl.style.color = 'var(--text-dim)';
            } else if (_burnTimerGate) {
              // Gate reached, burn available now
              timerEl.textContent = 'BURN READY | DAY ENDS: ' + clock;
              timerEl.style.color = '#d4a857';
            } else {
              // Need more tasks
              timerEl.textContent = _burnTimerNeed + ' TASK' + (_burnTimerNeed !== 1 ? 'S' : '') + ' TO GO | DAY ENDS: ' + clock;
              timerEl.style.color = 'var(--text-dim)';
            }
          }
          updateBurnTimer();
          window._dustBurnTimerInterval = setInterval(updateBurnTimer, 1000);
        }
      } else {
        burnRow.style.display = 'none';
      }
    }
  }

  // v3.20.17: Daily dust incineration — a streak-scaled daily ritual.
  //
  //  GATE:   Complete 3+ tasks today to unlock the burn for the day.
  //  PAYOUT: A flat daily coin payout scaled by streak length.
  //          Base = $50. Each streak day adds +$15.
  //          So a 7-day streak burns for $50 + 6*$15 = $140.
  //          Global money multiplier still applies on top.
  //  BONUS:  Each daily burn also adds +0.05% permanent trickle
  //          (capped at +5% lifetime, same as before).
  //  DUST:   Specks in the bin are COSMETIC. They still appear from
  //          task completions and the bin still fills up visually,
  //          but the payout is not speck-count-dependent. The bin is
  //          cleared on burn for visual satisfaction.
  //  MISSED: If you don't burn that day, the payout is gone — it
  //          does not roll over. Dust in the bin persists visually
  //          but has no monetary value itself.
  //
  var DUST_TASK_GATE       = 3;
  var DUST_BURN_BASE       = 50;     // $50 base daily burn
  var DUST_BURN_PER_STREAK = 15;     // +$15 per streak day
  var DUST_TRICKLE_DAILY   = 0.0005; // +0.05% trickle per burn

  function burnDustNow() {
    if (!state.materialsIncineratorUnlocked) {
      notify('The Materials Incinerator has not been commissioned yet.', '#d4a857');
      return;
    }
    // v3.20.18: compare burn date instead of a boolean — survives
    // window reloads and spurious day-rollover resets.
    if (state.dustBurnDate === todayStr()) {
      notify('Already burned today \u2014 the annex rests until tomorrow.', '#d4a857');
      return;
    }
    // v3.20.17: count today's tasks from dust specks with today's date
    // stamp, so tasks completed before the code update are still counted
    // as long as their specks are in the bin.
    var todayDate = todayStr();
    var done = state.dustCompletedToday || 0;
    // Also count specks born today as a fallback for pre-update saves
    // where dustCompletedToday was never incremented.
    var specksToday = 0;
    var pile = state.dustPixels || [];
    for (var si = 0; si < pile.length; si++) {
      if (pile[si].d === todayDate) specksToday++;
    }
    done = Math.max(done, specksToday);
    if (done < DUST_TASK_GATE) {
      notify('Complete ' + (DUST_TASK_GATE - done) + ' more task' + ((DUST_TASK_GATE - done) === 1 ? '' : 's') + ' today to unlock the incinerator.', '#d4a857');
      return;
    }
    // Streak-scaled payout.
    var streak = Math.max(0, state.streak || 0);
    var payout = DUST_BURN_BASE + streak * DUST_BURN_PER_STREAK;
    // Permanent trickle bonus (capped at +5% lifetime).
    var current = state.materialsPowerBonus || 0;
    var headroom = Math.max(0, 0.05 - current);
    var delta = Math.min(headroom, DUST_TRICKLE_DAILY);
    state.materialsPowerBonus = Math.min(0.05, current + delta);
    // Award coins through the global multiplier stack.
    awardCoins(payout, 'daily incineration');
    // Clear the bin visually and mark today as burned.
    var count = (state.dustPixels || []).length;
    state.dustPixels = [];
    state.dustBurnDate = todayStr();
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        var pct = (delta * 100).toFixed(2);
        MsgLog.push('The Materials Incinerator processes the day\u2019s off-cuts (' + count + ' speck' + (count === 1 ? '' : 's') + '). Daily payout: $' + payout + ' (streak \u00D7' + streak + '). Trickle +' + pct + '% (lifetime: ' + (state.materialsPowerBonus * 100).toFixed(1) + '%). The annex is quiet again.');
      }
    } catch (_) {}
    try { SFX.completeTask(); } catch (_) {}
    save();
    render();
  }

  // ============== BUNDLES ==============
  var bundleDraft = { name: '', tasks: [], editingId: null };

  function renderBundles() {
    var listEl = $('bundleList');
    if (!listEl) return;
    var bundles = state.bundles || [];
    if (bundles.length === 0) {
      listEl.innerHTML = '<div class="empty-state" style="font-size:10px;color:var(--text-dim);text-align:center;padding:6px;">No bundles saved yet.</div>';
    } else {
      listEl.innerHTML = '';
      bundles.forEach(function(b) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;background:var(--bg);border:1px solid var(--border);border-radius:4px;margin-bottom:4px;';
        var name = document.createElement('span');
        name.style.cssText = 'flex:1;font-size:11px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        name.textContent = b.name + ' (' + (b.tasks || []).length + ')';
        name.title = (b.tasks || []).join('\n');
        var loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-small';
        loadBtn.textContent = 'LOAD';
        loadBtn.title = 'Add all tasks from this bundle to the current project';
        loadBtn.style.cssText = 'font-size:9px;padding:3px 6px;';
        loadBtn.addEventListener('click', function() { loadBundle(b.id); });
        var editBundleBtn = document.createElement('button');
        editBundleBtn.className = 'btn btn-small';
        editBundleBtn.textContent = 'EDIT';
        editBundleBtn.title = 'Rename this bundle or edit its tasks';
        editBundleBtn.style.cssText = 'font-size:9px;padding:3px 6px;border-color:var(--accent3);color:var(--accent3);';
        editBundleBtn.addEventListener('click', function() { editBundle(b.id); });
        var delBtn = document.createElement('button');
        delBtn.className = 'btn btn-small btn-danger';
        delBtn.textContent = '\u00d7';
        delBtn.title = 'Delete this bundle';
        delBtn.style.cssText = 'font-size:11px;padding:3px 6px;';
        delBtn.addEventListener('click', function() { deleteBundle(b.id); });
        row.appendChild(name);
        row.appendChild(loadBtn);
        row.appendChild(editBundleBtn);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    }
    renderBundleDropdown();
  }

  function renderBundleDropdown() {
    var dd = $('bundleDropdown');
    if (!dd) return;
    var bundles = state.bundles || [];
    if (bundles.length === 0) {
      dd.innerHTML = '<div style="padding:8px;font-size:11px;color:var(--text-dim);">No bundles. Create one below.</div>';
    } else {
      dd.innerHTML = '';
      bundles.forEach(function(b) {
        var item = document.createElement('div');
        item.style.cssText = 'padding:8px 12px;font-size:11px;color:var(--text);cursor:pointer;border-bottom:1px solid var(--border);';
        item.textContent = b.name + ' (' + (b.tasks || []).length + ')';
        item.addEventListener('mouseover', function() { item.style.background = 'var(--surface2)'; });
        item.addEventListener('mouseout', function() { item.style.background = 'transparent'; });
        item.addEventListener('click', function() {
          loadBundle(b.id);
          dd.style.display = 'none';
        });
        dd.appendChild(item);
      });
    }
  }

  function loadBundle(id) {
    var b = (state.bundles || []).find(function(x) { return x.id === id; });
    if (!b) return;
    // Route to a real project. The ALL tab is a view only; bundle tasks
    // must land in a concrete project so they show up after a switch.
    var targetPid = state.activeProject;
    if (targetPid === ALL_PROJECT_ID) {
      targetPid = state.lastRealProject
        || ((state.projects && state.projects[0]) ? state.projects[0].id : 'default');
    }
    if (!state.tasks[targetPid]) state.tasks[targetPid] = [];
    (b.tasks || []).forEach(function(text, idx) {
      state.tasks[targetPid].push({
        id: (Date.now() + idx).toString(),
        text: text,
        completed: false,
        blocksEarned: 0,
        createdAt: Date.now()
      });
      trackRecentTask(text);
    });
    SFX.purchase();
    notify('Loaded bundle: ' + b.name);
    save();
    render();
  }

  function deleteBundle(id) {
    state.bundles = (state.bundles || []).filter(function(b) { return b.id !== id; });
    SFX.deleteTask();
    save();
    render();
  }

  function editBundle(id) {
    var b = (state.bundles || []).find(function(x) { return x.id === id; });
    if (!b) return;
    bundleDraft = {
      name: b.name,
      tasks: (b.tasks || []).slice(),
      editingId: id
    };
    var bc = document.getElementById('bundleCreator');
    var bn = document.getElementById('bundleNameInput');
    var bt = document.getElementById('bundleTaskInput');
    var bs = document.getElementById('bundleSaveBtn');
    if (bn) bn.value = b.name;
    if (bt) bt.value = '';
    if (bs) bs.textContent = 'UPDATE BUNDLE';
    if (bc) bc.style.display = 'block';
    renderBundleCreator();
    if (bn) setTimeout(function() { bn.focus(); bn.select(); }, 50);
    SFX.tabSwitch();
  }

  function renderBundleCreator() {
    var preview = $('bundleTaskPreview');
    if (preview) {
      preview.innerHTML = '';
      bundleDraft.tasks.forEach(function(t, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:3px 6px;background:var(--surface2);border-radius:3px;margin-bottom:3px;font-size:11px;';
        var span = document.createElement('span');
        span.style.cssText = 'flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        span.textContent = t;
        var rm = document.createElement('span');
        rm.textContent = '\u00d7';
        rm.style.cssText = 'cursor:pointer;color:var(--danger);font-size:13px;padding:0 4px;';
        rm.addEventListener('click', function() {
          bundleDraft.tasks.splice(i, 1);
          renderBundleCreator();
        });
        row.appendChild(span);
        row.appendChild(rm);
        preview.appendChild(row);
      });
    }
    var sugg = $('recentTaskSuggestions');
    if (sugg) {
      sugg.innerHTML = '';
      var recent = (state.recentTasks || []).filter(function(t) {
        return bundleDraft.tasks.indexOf(t) === -1;
      }).slice(0, 15);
      recent.forEach(function(t) {
        var chip = document.createElement('span');
        chip.textContent = t;
        chip.title = 'Click to add to bundle';
        chip.style.cssText = 'display:inline-block;padding:3px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:10px;color:var(--text-dim);cursor:pointer;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        chip.addEventListener('click', function() {
          bundleDraft.tasks.push(t);
          renderBundleCreator();
        });
        sugg.appendChild(chip);
      });
    }
  }

  // ============== PROJECT MODAL ==============
  var modalMode = 'new';
  var modalProjectId = null;

  function openNewProjectModal() {
    modalMode = 'new';
    modalProjectId = null;
    $('modalTitle').textContent = 'New Project';
    $('modalInput').value = '';
    $('modalDelete').style.display = 'none';
    $('editProjectModal').style.display = 'flex';
    setTimeout(function() { $('modalInput').focus(); }, 50);
  }

  function openEditProjectModal(pid) {
    var p = state.projects.find(function(x) { return x.id === pid; });
    if (!p) return;
    modalMode = 'edit';
    modalProjectId = pid;
    $('modalTitle').textContent = 'Edit Project';
    $('modalInput').value = p.name;
    $('modalDelete').style.display = pid === 'default' ? 'none' : 'inline-block';
    $('editProjectModal').style.display = 'flex';
    setTimeout(function() { $('modalInput').focus(); $('modalInput').select(); }, 50);
  }

  function closeProjectModal() {
    $('editProjectModal').style.display = 'none';
  }

  function saveProjectModal() {
    var name = $('modalInput').value.trim();
    if (!name) return;
    if (modalMode === 'new') {
      var id = 'p' + Date.now();
      state.projects.push({ id: id, name: name });
      state.tasks[id] = [];
      state.activeProject = id;
      SFX.addTask();
    } else if (modalMode === 'edit' && modalProjectId) {
      var p = state.projects.find(function(x) { return x.id === modalProjectId; });
      if (p) p.name = name;
    }
    closeProjectModal();
    save();
    render();
  }

  function deleteProjectFromModal() {
    if (modalMode !== 'edit' || !modalProjectId || modalProjectId === 'default') return;
    state.projects = state.projects.filter(function(p) { return p.id !== modalProjectId; });
    delete state.tasks[modalProjectId];
    if (state.activeProject === modalProjectId) {
      state.activeProject = state.projects[0] ? state.projects[0].id : 'default';
    }
    closeProjectModal();
    SFX.deleteTask();
    save();
    render();
  }


  // ============== v3.23.21: POST-SESSION CELEBRATION ==============
  // Multi-screen celebration after confirming focus: Streak -> Focus Time -> Rewards
  var _celebAudioCtx = null;

  function _celebNote(freq, duration, delay, vol) {
    if (!_celebAudioCtx) try { _celebAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) { return; }
    var ctx = _celebAudioCtx;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol || 0.12, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  function _celebChord(freqs, duration, delay, vol) {
    for (var i = 0; i < freqs.length; i++) _celebNote(freqs[i], duration, delay, vol);
  }

  function _celebTickSound(progress, target) {
    var base = 300;
    var top = target >= 14 ? 900 : target >= 7 ? 700 : 550;
    _celebNote(base + (top - base) * progress, 0.06, 0, 0.06);
  }

  function _celebLandSound(target) {
    if (target >= 14) {
      _celebNote(523, 0.3, 0, 0.15);
      _celebChord([659, 784, 1047], 0.5, 0.12, 0.08);
    } else if (target >= 7) {
      _celebNote(392, 0.3, 0, 0.12);
      _celebChord([494, 587], 0.4, 0.15, 0.08);
    } else {
      _celebNote(330, 0.4, 0, 0.1);
    }
  }

  function _celebRewardSound() {
    // Ascending coin-collect arpeggio
    _celebNote(523, 0.15, 0, 0.1);
    _celebNote(659, 0.15, 0.1, 0.1);
    _celebNote(784, 0.15, 0.2, 0.1);
    _celebNote(1047, 0.3, 0.3, 0.12);
  }

  function _celebFocusSound() {
    // Warm chord
    _celebChord([262, 330, 392], 0.6, 0, 0.08);
  }

  function _getStreakColor(n) {
    if (n < 3) return '#4ecdc4';
    if (n < 7) return '#5DCAA5';
    if (n < 14) return '#F0997B';
    if (n < 30) return '#D85A30';
    return '#E24B4A';
  }

  function _getStreakMessage(n) {
    if (n <= 0) return 'Start your streak today';
    if (n === 1) return 'Day one \u2014 it begins';
    if (n <= 4) return 'Building momentum...';
    if (n <= 6) return 'Almost a week \u2014 keep going';
    if (n === 7) return 'One full week. Respect.';
    if (n <= 13) return 'Consistency is paying off';
    if (n === 14) return 'Two weeks strong';
    if (n <= 20) return "You're in the groove now";
    if (n <= 27) return 'Three weeks and counting';
    if (n <= 29) return 'A full month. Legendary.';
    if (n <= 44) return 'Unstoppable.';
    if (n <= 59) return 'Machine-like dedication.';
    return 'You ARE the streak.';
  }

  function _spawnCelebParticles(container, count) {
    container.innerHTML = '';
    var colors = ['#4ecdc4','#00ff88','#a855f7','#ffa502','#ff6b9d'];
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      var size = 4 + Math.random() * 6;
      var x = 10 + Math.random() * 80;
      var c = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + c + ';left:' + x + '%;bottom:-10px;opacity:0;';
      try {
        p.animate([
          {transform:'translateY(0) translateX(0)',opacity:0.8},
          {transform:'translateY(-' + (200 + Math.random() * 200) + 'px) translateX(' + (-40 + Math.random() * 80) + 'px)',opacity:0}
        ],{duration:(1200 + Math.random() * 1500),delay:Math.random() * 600,easing:'cubic-bezier(0.25,0.46,0.45,0.94)',fill:'forwards'});
      } catch(_){}
      container.appendChild(p);
    }
  }

  // v3.23.31: options.skipStreak skips screen 1, options.streakOnly skips screens 2+3
  function showPostSessionCelebration(snapshot, options) {
    var opts = options || {};
    var overlay = $('streakOverlay');
    if (!overlay) return;
    var screen1 = $('celebScreen1');
    var screen2 = $('celebScreen2');
    var screen3 = $('celebScreen3');
    var tapHint = $('celebTapHint');
    if (!screen1 || !screen2 || !screen3) return;

    // Data
    var streak = state.streak || 0;
    var sessionMin = Math.round((state.sessionDurationSec || 600) / 60);
    var coinsEarned = (state.coins || 0) - (snapshot.coins || 0);
    var xpEarned = (state.xp || 0) - (snapshot.xp || 0);
    var newLevel = state.level || 1;
    var oldLevel = snapshot.level || 1;
    var todaySessions = (state.dailySessionLog && state.dailySessionLog.sessions) ? state.dailySessionLog.sessions.length : 1;
    var todayMin = 0;
    if (state.dailySessionLog && state.dailySessionLog.sessions) {
      for (var _ti = 0; _ti < state.dailySessionLog.sessions.length; _ti++) {
        todayMin += (state.dailySessionLog.sessions[_ti].min || 0);
      }
    }

    // Reset all screens
    // v3.23.31: skipStreak starts on screen 2, streakOnly starts on screen 1
    screen1.style.display = opts.skipStreak ? 'none' : 'block';
    screen2.style.display = opts.skipStreak ? 'block' : 'none';
    screen3.style.display = 'none';

    // Reset streak screen
    var streakRing = $('streakRing');
    var streakRingToday = $('streakRingToday');
    var streakCount = $('streakCount');
    var streakMsg = $('streakMessage');
    var streakFlames = $('streakFlames');
    var particles = $('streakParticles');
    streakCount.textContent = '0';
    streakMsg.style.opacity = '0';
    streakFlames.innerHTML = '';
    particles.innerHTML = '';
    if (streakRing) {
      streakRing.style.transition = 'none';
      streakRing.setAttribute('stroke-dashoffset', '427');
      streakRing.setAttribute('stroke', _getStreakColor(streak));
    }
    // v3.23.24: Reset today-arc overlay
    if (streakRingToday) {
      streakRingToday.style.opacity = '0';
      streakRingToday.style.animation = 'none';
      streakRingToday.setAttribute('stroke-dasharray', '0 427');
    }

    // Show overlay
    overlay.style.display = 'flex';
    setTimeout(function() { overlay.style.opacity = '1'; }, 20);

    // Animate streak ring + counter after fade-in
    setTimeout(function() {
      if (streakRing) {
        // Ring fills to streak-1, today's gold arc added after counter lands
        var maxRing = 60;
        var prevDays = Math.max(streak - 1, 0);
        var pctPrev = Math.min(prevDays / maxRing, 1);
        var offPrev = 427 - (427 * pctPrev);
        streakRing.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1), stroke 0.5s';
        streakRing.setAttribute('stroke-dashoffset', String(Math.round(offPrev)));
      }
      // Animate number
      var dur = 1200;
      var st = performance.now();
      var lastTick = -1;
      var tickInt = 1;
      function tick(now) {
        var elapsed = now - st;
        var prog = Math.min(elapsed / dur, 1);
        var eased = 1 - Math.pow(1 - prog, 3);
        var cur = Math.round(eased * streak);
        streakCount.textContent = String(cur);
        if (cur !== lastTick && cur % tickInt === 0) {
          lastTick = cur;
          _celebTickSound(prog, streak);
        }
        if (prog < 1) {
          requestAnimationFrame(tick);
        } else {
          streakCount.textContent = String(streak);
          streakMsg.textContent = _getStreakMessage(streak);

          // v3.23.114: Show real streak below owl streak message
          var _realStreak = state.realStreak || 0;
          if (_realStreak > 0) {
            var _rsEl = document.createElement('div');
            _rsEl.style.cssText = 'font-size:11px;color:#ff8c3a;margin-top:8px;font-family:"Press Start 2P",monospace;letter-spacing:1px;opacity:0;transition:opacity 0.5s;cursor:help;';
            _rsEl.title = 'Real Streak (strict) \u2014 only counts days you actually completed a focus session. This is the true measure of your discipline.';
            _rsEl.id = 'celebRealStreak';
            _rsEl.innerHTML = '\uD83D\uDD25 Real Streak: ' + _realStreak + ' day' + (_realStreak === 1 ? '' : 's');
            streakMsg.parentNode.insertBefore(_rsEl, streakMsg.nextSibling);
            setTimeout(function() { _rsEl.style.opacity = '1'; }, 300);
          }
          streakMsg.style.opacity = '1';
          _celebLandSound(streak);
          // v3.23.24: Show today's gold arc on the ring
          if (streakRingToday && streak > 0) {
            var _maxR = 60;
            var _oneDayArc = 427 / _maxR;
            var _prevPct = Math.min((streak - 1) / _maxR, 1);
            var _rotDeg = -90 + _prevPct * 360;
            streakRingToday.setAttribute('stroke-dasharray', _oneDayArc.toFixed(1) + ' ' + (427 - _oneDayArc).toFixed(1));
            streakRingToday.style.transform = 'rotate(' + _rotDeg.toFixed(1) + 'deg)';
            streakRingToday.style.transformOrigin = 'center';
            streakRingToday.style.opacity = '1';
            streakRingToday.style.animation = 'celebRingBlink 1.2s ease-in-out infinite';
            // Also extend main ring to include today
            if (streakRing) {
              var _fullPct = Math.min(streak / 60, 1);
              var _fullOff = 427 - (427 * _fullPct);
              streakRing.style.transition = 'stroke-dashoffset 0.5s ease-out';
              streakRing.setAttribute('stroke-dashoffset', String(Math.round(_fullOff)));
            }
          }
          // v3.23.24: Build flame rows — day/month/year tiers.
          // Crowns for years, stars for months, flames for days.
          var _sYears = Math.floor(streak / 365);
          var _sRem = streak % 365;
          var _sMonths = Math.floor(_sRem / 30);
          var _sDays = _sRem % 30;
          var _tiers = [];
          if (_sYears > 0) _tiers.push({count: _sYears, icon: '\uD83D\uDC51', label: _sYears === 1 ? 'year' : 'years', baseFreq: 784, size: 18});
          if (_sMonths > 0) _tiers.push({count: _sMonths, icon: '\uD83C\uDF19', label: _sMonths === 1 ? 'month' : 'months', baseFreq: 523, size: 16});
          if (_sDays > 0 || _tiers.length === 0) _tiers.push({count: _sDays, icon: '\uD83E\uDD89', label: _sDays === 1 ? 'day' : 'days', baseFreq: 330, size: 14});
          // Show breakdown text
          var _bdParts = [];
          if (_sYears > 0) _bdParts.push(_sYears + (_sYears === 1 ? ' year' : ' years'));
          if (_sMonths > 0) _bdParts.push(_sMonths + (_sMonths === 1 ? ' month' : ' months'));
          if (_sDays > 0) _bdParts.push(_sDays + (_sDays === 1 ? ' day' : ' days'));
          if (_bdParts.length > 1 && streakMsg) {
            var _bdEl = document.createElement('div');
            _bdEl.style.cssText = 'font-size:11px;color:var(--text-dim);margin-top:6px;font-family:Courier New,monospace;opacity:0;transition:opacity 0.4s;';
            _bdEl.textContent = _bdParts.join(', ');
            streakMsg.parentNode.insertBefore(_bdEl, streakMsg.nextSibling);
            setTimeout(function() { _bdEl.style.opacity = '1'; }, 200);
          }
          streakFlames.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;';
          var _delayBase = 0;
          for (var _di = 0; _di < _tiers.length; _di++) {
            var _t = _tiers[_di];
            if (_t.count === 0) continue;
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;justify-content:center;flex-wrap:wrap;max-width:300px;';
            var _popSpeed = _t.count > 15 ? 40 : _t.count > 8 ? 60 : 80;
            var _isLastTier = (_di === _tiers.length - 1);
            for (var _ei = 0; _ei < _t.count; _ei++) {
              var _isToday = _isLastTier && (_ei === _t.count - 1);
              var egg = document.createElement('span');
              egg.textContent = _t.icon;
              if (_isToday) {
                egg.style.cssText = 'display:inline-block;font-size:' + (_t.size + 4) + 'px;opacity:0;transform:scale(0);transition:opacity 0.25s,transform 0.4s cubic-bezier(0.34,1.56,0.64,1);';
              } else {
                egg.style.cssText = 'display:inline-block;font-size:' + _t.size + 'px;opacity:0;transform:scale(0);transition:opacity 0.25s,transform 0.3s cubic-bezier(0.34,1.56,0.64,1);';
              }
              row.appendChild(egg);
              if (_isToday) {
                (function(el, delay) {
                  setTimeout(function() {
                    el.style.opacity = '1';
                    el.style.transform = 'scale(1.15)';
                    el.style.animation = 'celebFlameGlow 1.5s ease-in-out infinite';
                  }, delay + 300);
                })(egg, _delayBase + _ei * _popSpeed);
              } else {
                (function(el, delay) {
                  setTimeout(function() {
                    el.style.opacity = '1';
                    el.style.transform = 'scale(1)';
                  }, delay);
                })(egg, _delayBase + _ei * _popSpeed);
              }
            }
            // Label
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:8px;color:var(--text-dim);opacity:0;transition:opacity 0.3s;margin-left:3px;font-family:\'Press Start 2P\',monospace;letter-spacing:1px;';
            lbl.textContent = _t.label;
            row.appendChild(lbl);
            (function(el, delay) {
              setTimeout(function() {
                el.style.opacity = '0.7';
              }, delay);
            })(lbl, _delayBase + _t.count * _popSpeed + 50);
            streakFlames.appendChild(row);
            _delayBase += _t.count * _popSpeed + 200;
          }
          if (streak >= 7) _spawnCelebParticles(particles, Math.min(streak, 30));
        }
      }
      requestAnimationFrame(tick);
    }, 400);

    // v3.23.31: Start on screen 2 if skipping streak, handle streakOnly dismiss
    var currentScreen = opts.skipStreak ? 2 : 1;

    // If skipStreak, immediately animate screen 2
    if (opts.skipStreak) {
      tapHint.textContent = 'tap to continue';
      setTimeout(function() {
        var focusNum = $('focusTimeNum');
        var focusSessions = $('focusSessionCount');
        var focusBar = $('focusBarFill');
        var focusLabel = $('focusBarLabel');
        focusSessions.textContent = todaySessions + ' session' + (todaySessions !== 1 ? 's' : '') + ' today';
        var goalMin = 120;
        if (focusBar) {
          setTimeout(function() { focusBar.style.width = Math.min(todayMin / goalMin * 100, 100) + '%'; }, 100);
        }
        if (focusLabel) focusLabel.textContent = todayMin + ' / ' + goalMin + ' min goal';
        _celebFocusSound();
        var fDur = 800;
        var fStart = performance.now();
        function fTick2(now) {
          var prog = Math.min((now - fStart) / fDur, 1);
          var eased = 1 - Math.pow(1 - prog, 3);
          var curMin = Math.round(eased * sessionMin);
          var h = Math.floor(curMin / 60);
          var m = curMin % 60;
          focusNum.textContent = h > 0 ? h + 'h ' + m + 'm' : m + 'm';
          if (prog < 1) requestAnimationFrame(fTick2);
          else {
            var fh = Math.floor(sessionMin / 60);
            var fm = sessionMin % 60;
            focusNum.textContent = fh > 0 ? fh + 'h ' + fm + 'm' : fm + 'm';
          }
        }
        requestAnimationFrame(fTick2);
      }, 400);
    }

    overlay.onclick = function() {
      currentScreen++;
      // v3.23.31: streakOnly — dismiss after screen 1
      if (opts.streakOnly && currentScreen >= 2) {
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.style.display = 'none'; particles.innerHTML = ''; }, 400);
        overlay.onclick = null;
        return;
      }
      if (currentScreen === 2) {
        // Transition to focus time screen
        screen1.style.display = 'none';
        screen2.style.display = 'block';
        particles.innerHTML = '';
        // Animate focus time
        var focusNum = $('focusTimeNum');
        var focusSessions = $('focusSessionCount');
        var focusBar = $('focusBarFill');
        var focusLabel = $('focusBarLabel');
        focusSessions.textContent = todaySessions + ' session' + (todaySessions !== 1 ? 's' : '') + ' today';
        var goalMin = 120;
        if (focusBar) {
          setTimeout(function() { focusBar.style.width = Math.min(todayMin / goalMin * 100, 100) + '%'; }, 100);
        }
        if (focusLabel) focusLabel.textContent = todayMin + ' / ' + goalMin + ' min goal';
        // Animate the number
        _celebFocusSound();
        var fDur = 800;
        var fStart = performance.now();
        function fTick(now) {
          var prog = Math.min((now - fStart) / fDur, 1);
          var eased = 1 - Math.pow(1 - prog, 3);
          var curMin = Math.round(eased * sessionMin);
          var h = Math.floor(curMin / 60);
          var m = curMin % 60;
          focusNum.textContent = h > 0 ? h + 'h ' + m + 'm' : m + 'm';
          if (prog < 1) requestAnimationFrame(fTick);
          else {
            var fh = Math.floor(sessionMin / 60);
            var fm = sessionMin % 60;
            focusNum.textContent = fh > 0 ? fh + 'h ' + fm + 'm' : fm + 'm';
          }
        }
        requestAnimationFrame(fTick);
        tapHint.textContent = 'tap to continue';
      } else if (currentScreen === 3) {
        // Transition to rewards screen
        screen2.style.display = 'none';
        screen3.style.display = 'block';
        var celebCoinsEl = $('celebCoins');
        var celebXPEl = $('celebXP');
        var celebLevelEl = $('celebLevel');
        // Animate coins
        _celebRewardSound();
        var rDur = 900;
        var rStart = performance.now();
        function rTick(now) {
          var prog = Math.min((now - rStart) / rDur, 1);
          var eased = 1 - Math.pow(1 - prog, 3);
          celebCoinsEl.textContent = '+$' + Math.round(eased * coinsEarned);
          celebXPEl.textContent = '+' + Math.round(eased * xpEarned);
          if (prog < 1) requestAnimationFrame(rTick);
          else {
            celebCoinsEl.textContent = '+$' + Math.round(coinsEarned);
            celebXPEl.textContent = '+' + Math.round(xpEarned);
            if (newLevel > oldLevel) {
              celebLevelEl.textContent = 'LEVEL UP' + String.fromCharCode(33) + ' Level ' + newLevel;
              celebLevelEl.style.opacity = '1';
              celebLevelEl.style.color = '#ffd700';
              _celebChord([523, 659, 784, 1047], 0.8, 0.1, 0.1);
            }
          }
        }
        requestAnimationFrame(rTick);
        if (streak >= 5) _spawnCelebParticles(particles, 20);
        tapHint.textContent = 'tap to close';
      } else {
        // Dismiss
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.style.display = 'none'; particles.innerHTML = ''; }, 400);
        overlay.onclick = null;
      }
    };
  }
  // ============== WELCOME BACK (v3.23.33) ==============
  function showWelcomeBack(goneMs, passiveCoins, passiveTextiles) {
    var overlay = $('welcomeBackOverlay'); if (!overlay) return;
    var screen1 = $('wbScreen1'), screen2 = $('wbScreen2'), tapHint = $('wbTapHint'), particles = $('wbParticles');
    if (!screen1 || !screen2) return;
    if (!_celebAudioCtx) { try { _celebAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) {} }
    var goneMin = Math.floor(goneMs / 60000), goneH = Math.floor(goneMin / 60), goneM = goneMin % 60;
    var goneTxt = goneH > 0 ? goneH + 'h ' + goneM + 'm' : goneM + 'm';
    var goneEl = $('wbGoneDuration'); if (goneEl) goneEl.textContent = 'you were gone for ' + goneTxt;
    var today = todayStr(), todaySessions = 0, todayMin = 0;
    if (state.dailySessionLog && state.dailySessionLog.date === today && state.dailySessionLog.sessions) {
      todaySessions = state.dailySessionLog.sessions.length;
      for (var _wi = 0; _wi < state.dailySessionLog.sessions.length; _wi++) todayMin += (state.dailySessionLog.sessions[_wi].min || 0);
    }
    screen1.style.display = 'block'; screen2.style.display = 'none';
    if (particles) particles.innerHTML = '';
    overlay.style.display = 'flex'; setTimeout(function() { overlay.style.opacity = '1'; }, 20);
    var currentScreen = 1, coinsVal = Math.round(passiveCoins || 0), textilesVal = Math.round(passiveTextiles || 0);
    setTimeout(function() {
      _celebRewardSound(); var dur = 900, start = performance.now();
      var coinsEl = $('wbCoins'), texEl = $('wbTextiles'), lastTick = -1;
      function countTick(now) {
        var prog = Math.min((now - start) / dur, 1), eased = 1 - Math.pow(1 - prog, 3);
        if (coinsEl) coinsEl.textContent = '+$' + Math.round(eased * coinsVal);
        if (texEl) texEl.textContent = '+' + Math.round(eased * textilesVal);
        var tickNum = Math.floor(prog * 10);
        if (tickNum !== lastTick) { lastTick = tickNum; _celebTickSound(prog, 14); }
        if (prog < 1) requestAnimationFrame(countTick);
        else { if (coinsEl) coinsEl.textContent = '+$' + coinsVal; if (texEl) texEl.textContent = '+' + textilesVal; _celebLandSound(14); _spawnCelebParticles(particles, 15); }
      }
      requestAnimationFrame(countTick);
    }, 400);
    overlay.onclick = function() {
      currentScreen++;
      if (currentScreen === 2) {
        screen1.style.display = 'none'; screen2.style.display = 'block'; tapHint.textContent = 'tap to close';
        _celebFocusSound();
        var sessEl = $('wbSessions'), focusEl = $('wbFocusTime'), streakEl = $('wbStreak'), statusEl = $('wbStatus');
        var fh = Math.floor(todayMin / 60), fm = todayMin % 60, focusTxt = fh > 0 ? fh + 'h ' + fm + 'm' : fm + 'm';
        var sDur = 600, sStart = performance.now();
        function sTick(now) {
          var prog = Math.min((now - sStart) / sDur, 1), eased = 1 - Math.pow(1 - prog, 3);
          if (sessEl) sessEl.textContent = String(Math.round(eased * todaySessions));
          if (streakEl) streakEl.textContent = String(Math.round(eased * (state.streak || 0)));
          if (prog < 1) requestAnimationFrame(sTick);
          else { if (sessEl) sessEl.textContent = String(todaySessions); if (focusEl) focusEl.textContent = focusTxt; if (streakEl) streakEl.textContent = String(state.streak || 0);
            if (statusEl) statusEl.innerHTML = '<span>Wallet <span style="color:var(--accent);">$' + Math.round(state.coins || 0) + '</span></span><span>Level <span style="color:#ffd700;">' + (state.level || 1) + '</span></span><span>XP <span style="color:var(--xp-color);">' + Math.round(state.xp || 0) + '</span></span>';
          }
        }
        var fDur = 800, fStart = performance.now();
        function fTick(now) {
          var prog = Math.min((now - fStart) / fDur, 1), eased = 1 - Math.pow(1 - prog, 3);
          var curMin = Math.round(eased * todayMin), ch = Math.floor(curMin / 60), cm = curMin % 60;
          if (focusEl) focusEl.textContent = ch > 0 ? ch + 'h ' + cm + 'm' : cm + 'm';
          if (prog < 1) requestAnimationFrame(fTick);
        }
        requestAnimationFrame(sTick); requestAnimationFrame(fTick); _spawnCelebParticles(particles, 12);
      } else {
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.style.display = 'none'; if (particles) particles.innerHTML = ''; }, 400);
        overlay.onclick = null;
      }
    };
  }
  function maybeShowWelcomeBack() {
    var now = Date.now(), lastInteraction = state.lastWelcomeBackCheck || state.lastCompletedSessionAt || 0;
    // v3.23.35: If no timestamp but user has a lastActiveDate, derive from that
    if (!lastInteraction && state.lastActiveDate) {
      try { lastInteraction = new Date(state.lastActiveDate).getTime(); } catch(_) {}
    }
    if (!lastInteraction) { state.lastWelcomeBackCheck = now; save(); return; }
    var goneMs = now - lastInteraction, FOUR_HOURS = 4 * 60 * 60 * 1000;
    // v3.23.41: Do NOT reset lastWelcomeBackCheck when gap < 4h.
    // Only update it when the welcome screen actually fires.
    // This prevents extension reloads from resetting the clock.
    if (goneMs < FOUR_HOURS) return;
    var empLevel = state.hireEmployeesLevel || 0, passiveCoins = 0;
    if (empLevel > 0 && (state.streak || 0) > 0) { passiveCoins = Math.round(empLevel * (state.streak || 0) * 0.5 * Math.min(goneMs / 60000, 300)); }
    var passiveTextiles = 0, autoloomLevel = state.autoloomLevel || 0;
    if (autoloomLevel > 0) { var periodMin = [0, 7200, 2880, 1440, 720, 240][Math.min(autoloomLevel, 5)]; if (periodMin > 0) passiveTextiles = Math.floor((goneMs / 60000) / periodMin); }
    state.lastWelcomeBackCheck = now; save();
    showWelcomeBack(goneMs, passiveCoins, passiveTextiles);
  }

  // ============== INIT ==============
  // Read version from manifest once at load — used everywhere instead of hardcoded strings.
  var _manifestVersion = '0.0.0';
  try { _manifestVersion = chrome.runtime.getManifest().version; } catch (_) {}

  function init() {
    // Populate version tag in the header from manifest.json
    try {
      var vTag = document.getElementById('versionTag');
      if (vTag) vTag.textContent = 'v' + _manifestVersion;
    } catch (_) {}
    // Mount the paperclips-style textile console early so any subsequent
    // notify() calls during render can push into it.
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && typeof MsgLog.mount === 'function') {
        MsgLog.mount('msgConsole');
      }
    } catch (_) {}
    load(function() {
      // Build a fresh random tab display order for this window load. This is
      // the "rotating tabs" feature: each time PixelFocus opens, a different
      // random subset of projects lands in the visible tab bar, so no single
      // project is permanently stuck in the overflow dropdown.
      buildShuffledTabOrder();
      render();

      // v3.19.11: if a pomodoro session was still running when this popup
      // loaded (see the wall-clock resync logic in load()), re-arm the
      // 1 Hz tick so the display picks back up where real time actually
      // is. The reload-handler used to auto-pause here, which froze the
      // timer whenever the popup briefly lost focus. Now it stays running.
      if (state.timerState === 'running' && state.timerEndsAt && state.timerEndsAt > Date.now()) {
        try { armTimerTick(); } catch (_) {}
      }

      // Kick off the 1-minute rotation timer. The countdown progress bar
      // only becomes visible during the final 10s before each re-shuffle.
      startTabRotationTimer();

      // Live sync from other tabs (gallery)
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area === 'local' && changes.pixelFocusState) {
          var newState = changes.pixelFocusState.newValue;
          if (newState) {
            // preserve in-flight timer interval state
            var wasRunning = state.timerState === 'running';
            state = Object.assign({}, DEFAULT_STATE, newState);
            if (wasRunning && state.timerState !== 'running') {
              // gallery shouldn't pause our timer
            }
            render();
          }
        }
      });

      // v3.20.25: HIGH PRIORITY wiring — input, add button, modal dismiss.
      var priInput = document.getElementById('priorityInput');
      var addPriBtn = document.getElementById('addPriorityBtn');
      var priModalDismiss = document.getElementById('priorityModalDismissBtn');
      if (priInput) {
        priInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); addPriority(); }
        });
      }
      if (addPriBtn) addPriBtn.addEventListener('click', addPriority);
      if (priModalDismiss) priModalDismiss.addEventListener('click', hidePriorityModal);
      renderPriorities();
      // Defer the modal by a tick so the rest of the popup paints first — a
      // black modal appearing before the page exists is jarring.
      setTimeout(maybeShowPriorityModal, 150);

      // v3.23.98: Bedtime morning check-in — triggered on popup open.
      // If the user said "YES, I'LL GO" last night, we need a morning
      // follow-up asking if they actually went to bed on time. Only fires
      // once per day, only if bedtimeReminderEnabled + bedtimeMorningPending.
      setTimeout(function() {
        try {
          if (!state.bedtimeReminderEnabled) return;
          if (!state.bedtimeMorningPending) return;
          // Don't re-show if already confirmed today
          var _td = new Date(), _tmm = _td.getMonth() + 1, _tdd = _td.getDate();
          var _today = _td.getFullYear() + '-' + (_tmm < 10 ? '0' : '') + _tmm + '-' + (_tdd < 10 ? '0' : '') + _tdd;
          if (state.bedtimeLastConfirmDate === _today) return;
          // Don't re-show if dismissed recently (within 2 hours)
          if (state.bedtimeCheckinDismissedAt && (Date.now() - state.bedtimeCheckinDismissedAt) < 7200000) return;
          // Open the morning check-in pop-out
          openPFWindow('morning-checkin.html');
        } catch (_) {}
      }, 1500);

    // v3.23.100: Badge check on popup open — celebrate new badges
    setTimeout(function() {
      try {
                var BADGE_DEFS = {'early_bird_1':{icon:'🐤',name:'Early Bird',desc:'You went to bed on time 5 nights. Your sleep schedule is taking shape!'},'sleep_warrior':{icon:'🛡️',name:'Sleep Warrior',desc:'10 nights of hitting the pillow on schedule. That takes real discipline.'},'dream_weaver':{icon:'🌀',name:'Dream Weaver',desc:'15 nights on time. You\'re building a genuine bedtime habit.'},'night_master':{icon:'🌙',name:'Night Master',desc:'25 nights on time. Most people can\'t do this for a week — you did it 25 times.'},'sleep_sage':{icon:'🧘',name:'Sleep Sage',desc:'40 nights of keeping your bedtime commitment. Your body clock thanks you.'},'lunar_legend':{icon:'🌕',name:'Lunar Legend',desc:'60 nights on time. That\'s two solid months of sleep discipline.'},'rest_royalty':{icon:'👑',name:'Rest Royalty',desc:'90 nights on time — a full quarter of the year spent sleeping right.'},'eternal_dreamer':{icon:'💫',name:'Eternal Dreamer',desc:'150 nights on time. You\'ve made good sleep a core part of who you are.'},'sleep_deity':{icon:'✨',name:'Sleep Deity',desc:'200 nights! Sleep isn\'t a chore for you anymore — it\'s a lifestyle.'},'year_of_rest':{icon:'📅',name:'Year of Rest',desc:'365 nights on time. An entire year of keeping your bedtime promise.'},'sleep_olympian':{icon:'🏅',name:'Sleep Olympian',desc:'500 nights! You could teach a masterclass on sleep discipline.'},'sleep_transcendent':{icon:'🌌',name:'Transcendent Sleeper',desc:'750 nights on time. At this point your circadian rhythm runs like a Swiss watch.'},'millennium_sleeper':{icon:'🏛️',name:'Millennium Sleeper',desc:'1,000 nights on time. A thousand bedtimes honored. Absolutely legendary.'},'streak_sleep_3':{icon:'🌟',name:'Three-Peat',desc:'You went to bed on time 3 nights in a row without breaking the chain.'},'streak_sleep_5':{icon:'✋',name:'Handful of Dreams',desc:'5 consecutive nights of on-time sleep. The streak is getting real.'},'streak_sleep_7':{icon:'😴',name:'Week of Zzz',desc:'A full week of going to bed on time every single night.'},'streak_sleep_14':{icon:'🌃',name:'Fortnight Dreamer',desc:'Two straight weeks of perfect bedtimes. That\'s a real routine now.'},'streak_sleep_21':{icon:'🧠',name:'Habit Formed',desc:'21 nights in a row — they say it takes 21 days to form a habit.'},'streak_sleep_30':{icon:'🌑',name:'Monthly Moon',desc:'A full month of unbroken bedtime discipline. Not one slip.'},'streak_sleep_45':{icon:'🦾',name:'Sleep Centurion',desc:'45 nights straight. Your willpower is genuinely impressive.'},'streak_sleep_60':{icon:'🌆',name:'Two-Month Twilight',desc:'Two months without missing a single bedtime. Iron discipline.'},'streak_sleep_90':{icon:'🌅',name:'Quarter Dreamer',desc:'90 nights in a row. A full quarter of flawless sleep commitment.'},'streak_sleep_120':{icon:'🌎',name:'Unwavering Night',desc:'120 consecutive nights on time. Four months of bedtime perfection.'},'streak_sleep_180':{icon:'🎶',name:'Half-Year Harmony',desc:'Half a year of never once breaking your bedtime streak.'},'streak_sleep_270':{icon:'🌸',name:'Nine-Month Nirvana',desc:'270 nights straight. Nine months of unbroken sleep discipline.'},'streak_sleep_365':{icon:'🏆',name:'Perfect Sleep Year',desc:'You went to bed on time every single night for an entire year. Unbelievable.'},'pillow_pro':{icon:'🛌',name:'Pillow Professional',desc:'You confirmed your bedtime 3 days running. The pillow knows your name now.'},'no_phone_zone':{icon:'📵',name:'No Phone Zone',desc:'10 bedtime commitments made. You\'re taking screen-free sleep seriously.'},'melatonin_machine':{icon:'💊',name:'Melatonin Machine',desc:'50 nights of on-time sleep. Your brain\'s sleep chemistry is dialed in.'},'first_focus':{icon:'🧵',name:'First Thread',desc:'You started a focus timer and actually finished it. That\'s the hardest step!'},'five_sessions':{icon:'🌱',name:'Getting Started',desc:'5 focus sessions completed. You\'re getting the hang of deep work.'},'ten_sessions':{icon:'🏃',name:'Shuttle Runner',desc:'10 sessions done. You\'ve spent real, distraction-free time on what matters.'},'twentyfive_sess':{icon:'🎖️',name:'Quarter Century',desc:'25 focus sessions in the books. You\'re building serious momentum.'},'fifty_sessions':{icon:'⚙️',name:'Loom Veteran',desc:'50 sessions completed. Half a hundred times you chose focus over distraction.'},'century_focus':{icon:'💯',name:'Centurion',desc:'100 focus sessions! Triple digits. You\'re a certified focus machine.'},'focus_250':{icon:'🧲',name:'Loom Addict',desc:'250 sessions. You keep coming back and putting in the work. Respect.'},'focus_500':{icon:'🔥',name:'Iron Will',desc:'500 focus sessions completed. That\'s hundreds of hours of deep work.'},'focus_1000':{icon:'🧨',name:'Thousand Threads',desc:'1,000 sessions. A thousand times you sat down and got things done.'},'focus_2500':{icon:'🦾',name:'Thread Titan',desc:'2,500 sessions. At this point, focusing is just what you do.'},'focus_5000':{icon:'🌀',name:'Five Thousand Fibers',desc:'5,000 focus sessions. This is beyond dedication — it\'s who you are.'},'focus_10000':{icon:'🌌',name:'Eternal Weaver',desc:'10,000 sessions completed. Malcolm Gladwell would be proud.'},'streak_3':{icon:'🎩',name:'Hat Trick',desc:'You came back and focused 3 days in a row. Consistency is everything.'},'streak_7':{icon:'📅',name:'Weekly Weaver',desc:'A full week of returning every day to focus. Seven for seven.'},'streak_14':{icon:'💪',name:'Fortnight Focus',desc:'Two straight weeks of daily focus sessions. You didn\'t skip a single day.'},'streak_21':{icon:'🎯',name:'Three-Week Weave',desc:'21 days in a row. You\'ve turned daily focus into an unshakable habit.'},'streak_30':{icon:'📆',name:'Monthly Master',desc:'30 consecutive days of focus. A full month of showing up every single day.'},'streak_60':{icon:'🥊',name:'Bimonthly Boss',desc:'60 days straight. Two months of daily, unbroken focus sessions.'},'streak_90':{icon:'👸',name:'Quarterly Queen',desc:'90 days in a row. A full quarter of daily commitment without a gap.'},'streak_180':{icon:'🦸',name:'Half-Year Hero',desc:'180 consecutive days. Half a year of never missing a day. Superhuman.'},'streak_365':{icon:'🏆',name:'Full Year Focus',desc:'You focused every single day for an entire year. 365 days. No breaks.'},'combo_3':{icon:'⚡',name:'Triple Threat',desc:'You completed 3 focus sessions back-to-back in one sitting. Warming up!'},'combo_5':{icon:'🖐️',name:'High Five',desc:'5 sessions in a row without stopping. You\'re in the zone.'},'combo_10':{icon:'⚡',name:'Combo King',desc:'A 10x combo! Ten consecutive sessions in one sitting. Deep flow state.'},'combo_15':{icon:'💥',name:'Combo Crusher',desc:'15 sessions chained together. You\'re locked in and unstoppable.'},'combo_20':{icon:'😈',name:'Combo Demon',desc:'20x combo. That\'s hours of uninterrupted, laser-focused work.'},'combo_25':{icon:'💎',name:'Quarter-Century Combo',desc:'25 sessions back-to-back. Your focus endurance is elite.'},'combo_50':{icon:'🚀',name:'Unstoppable',desc:'A 50x combo. Fifty consecutive focus sessions. That\'s almost inhuman.'},'combo_100':{icon:'🌟',name:'Combo Deity',desc:'100 sessions in a row. A hundred consecutive focus rounds. Absolute deity.'},'blocks_10':{icon:'⏰',name:'First Hour',desc:'You\'ve woven 10 textiles — that\'s over 1.5 hours of total focused time.'},'blocks_50':{icon:'💼',name:'Half-Day Hustler',desc:'50 textiles woven. You\'ve spent over 8 hours in deep focus overall.'},'blocks_100':{icon:'🧶',name:'Century Cloth',desc:'100 textiles! That\'s more than 16 hours of focused work across your sessions.'},'blocks_250':{icon:'📦',name:'Bolt Maker',desc:'250 textiles woven — over 41 hours of productive, focused time.'},'blocks_500':{icon:'🏰',name:'Loom Legend',desc:'500 textiles! You\'ve spent 83+ hours doing real, distraction-free work.'},'blocks_1000':{icon:'🏭',name:'Thousand Bolts',desc:'1,000 textiles woven. Over 166 hours of focused time. That\'s incredible.'},'blocks_2500':{icon:'🛠️',name:'Industrial Weaver',desc:'2,500 textiles — more than 416 hours of deep work. Over 17 full days.'},'blocks_5000':{icon:'🌍',name:'Textile Empire',desc:'5,000 textiles. 833+ hours focused. You\'ve spent over a month in flow.'},'blocks_10000':{icon:'🪐',name:'Ten Thousand Threads',desc:'10,000 textiles woven. 1,666+ hours. That\'s 69 full days of pure focus.'},'first_friend':{icon:'🤝',name:'Companion',desc:'You added your first friend. Now someone else can see your progress!'},'social_duo':{icon:'👯',name:'Dynamic Duo',desc:'You\'ve got 2 friends on the platform. Accountability partners engaged.'},'social_circle':{icon:'🫂',name:'Social Circle',desc:'3 friends connected. You\'re building a little focus community.'},'social_squad':{icon:'👪',name:'Squad Goals',desc:'5 friends! You\'ve got a proper squad keeping each other accountable.'},'social_popular':{icon:'😎',name:'Popular',desc:'7 friends on your list. People want to track progress alongside you.'},'social_influencer':{icon:'📱',name:'Influencer',desc:'10 friends! You\'re becoming a hub in the focus community.'},'social_celebrity':{icon:'🌟',name:'Celebrity',desc:'15 friends. Your profile is getting noticed.'},'social_famous':{icon:'📸',name:'Famous',desc:'20 friends connected. You\'re a well-known face around here.'},'social_icon':{icon:'👑',name:'Social Icon',desc:'25 friends! A quarter-hundred people are watching your journey.'},'social_mogul':{icon:'💎',name:'Social Mogul',desc:'50 friends. You\'ve built a genuine network of accountability partners.'},'profile_pic':{icon:'🎨',name:'Self-Portrait',desc:'You created a pixel art avatar and set it as your profile picture.'},'display_name':{icon:'🏷️',name:'Named',desc:'You chose a display name so friends can recognize you.'},'full_profile':{icon:'✅',name:'Complete Profile',desc:'You set both a display name and profile picture. Your identity is complete!'},'networker':{icon:'🌐',name:'Networker',desc:'You\'ve connected with 5 friends who have display names set up.'},'party_starter':{icon:'🎉',name:'Party Starter',desc:'3 friends joined! You started a little focus party.'},'hype_crew':{icon:'🥳',name:'Hype Crew',desc:'8 friends on board. Your hype crew is assembled.'},'social_butterfly':{icon:'🦋',name:'Social Butterfly',desc:'12 friends! You\'re connecting with people left and right.'},'guild_leader':{icon:'🏰',name:'Guild Leader',desc:'30 friends. You could run a whole guild at this point.'},'level_3':{icon:'🔰',name:'Beginner',desc:'You reached level 3. You\'ve earned enough XP from focus sessions to level up twice!'},'level_5':{icon:'📖',name:'Novice',desc:'Level 5! Every focus session earns XP, and you\'ve stacked up enough for 5 levels.'},'level_10':{icon:'📜',name:'Apprentice',desc:'Level 10 reached. Double digits — you\'re past the beginner stage.'},'level_15':{icon:'🎓',name:'Sophomore',desc:'Level 15. Your XP from completing focus sessions keeps climbing.'},'level_20':{icon:'🔧',name:'Skilled',desc:'Level 20! Each level takes more XP than the last, and you\'re still rising.'},'level_25':{icon:'🗡️',name:'Journeyman',desc:'Level 25. A quarter of the way to 100. The grind is real.'},'level_30':{icon:'🔮',name:'Adept',desc:'Level 30. Thirty levels of accumulated focus work. Impressive.'},'level_40':{icon:'🎖️',name:'Veteran',desc:'Level 40. The XP curve gets steeper but you keep pushing through.'},'level_50':{icon:'🏛️',name:'Master',desc:'Level 50! Halfway to the century mark. You\'ve earned massive XP.'},'level_60':{icon:'🧙',name:'Sage',desc:'Level 60. Most people never get here. You did.'},'level_75':{icon:'📕',name:'Elder',desc:'Level 75. Three-quarters of the way to 100. The summit is in sight.'},'level_100':{icon:'🌟',name:'Grandmaster',desc:'Level 100! Triple digits. You\'ve earned an enormous amount of XP from focus work.'},'level_125':{icon:'🏅',name:'Legend',desc:'Level 125. You blew past 100 and kept going. Legendary territory.'},'level_150':{icon:'🐉',name:'Mythic',desc:'Level 150. The XP required at this point is staggering.'},'level_200':{icon:'🔥',name:'Demigod',desc:'Level 200. Two hundred levels of accumulated focus mastery.'},'level_300':{icon:'🌋',name:'Titan',desc:'Level 300. At this level the XP requirements are astronomical. You earned every point.'},'level_500':{icon:'🪐',name:'Transcendent',desc:'Level 500. Five hundred levels. This might be the most impressive thing on your profile.'},'rich_100':{icon:'💵',name:'First Paycheck',desc:'You\'ve earned $100 total from completing focus sessions. First real payday!'},'rich_500':{icon:'🪙',name:'Pocket Change',desc:'You\'ve earned $500 lifetime. Focus sessions pay off — literally.'},'rich_1000':{icon:'💰',name:'First Fortune',desc:'$1,000 earned across all your focus sessions. Your first fortune.'},'rich_5000':{icon:'💳',name:'Five Grand',desc:'$5,000 lifetime earnings. Five grand from sheer productivity.'},'rich_10000':{icon:'💎',name:'Textile Mogul',desc:'$10,000 earned! Five figures of coins from focused work.'},'rich_25000':{icon:'🤑',name:'Quarter-Millionaire',desc:'$25,000 lifetime. A quarter of the way to six figures.'},'rich_50000':{icon:'🎰',name:'Money Machine',desc:'$50,000 earned. Halfway to $100K — all from focus sessions and productivity.'},'rich_100000':{icon:'🏦',name:'Six Figures',desc:'Six figures! $100,000 earned across your entire journey. Incredible.'},'rich_250000':{icon:'🏰',name:'Cloth Rothschild',desc:'$250,000 lifetime. A quarter million coins earned through discipline.'},'rich_500000':{icon:'💸',name:'Half-Millionaire',desc:'Half a million dollars earned. $500,000 from pure productivity.'},'rich_1000000':{icon:'👑',name:'Millionaire',desc:'One million dollars earned. $1,000,000. You are the definition of productivity.'},'hoard_1000':{icon:'📥',name:'Saver',desc:'You\'re holding $1,000 in your wallet right now without spending it.'},'hoard_5000':{icon:'🧰',name:'Thrifty',desc:'$5,000 saved up at once. You\'re resisting the urge to spend.'},'hoard_10000':{icon:'🥚',name:'Nest Egg',desc:'$10,000 sitting in your wallet. That\'s serious self-control.'},'hoard_25000':{icon:'📦',name:'War Chest',desc:'$25,000 hoarded. You could buy a lot of upgrades but you\'re saving.'},'hoard_50000':{icon:'🐲',name:'Dragon Hoard',desc:'$50,000 in the bank at once. Are you saving for something big?'},'hoard_100000':{icon:'🦳',name:'Scrooge',desc:'$100,000 held at once. Six figures in the wallet. Maximum restraint.'},'hoard_500000':{icon:'🔒',name:'Vault Keeper',desc:'Half a million dollars in your wallet right now. What are you saving for?!'},'gallery_1':{icon:'🖼️',name:'First Masterpiece',desc:'You saved your first pixel art creation to the gallery. Your first masterpiece!'},'gallery_3':{icon:'🎨',name:'Small Exhibition',desc:'3 artworks saved. You\'re starting a small collection.'},'gallery_5':{icon:'🖼️',name:'Gallery Opening',desc:'5 pieces in the gallery. You\'re becoming a regular pixel artist.'},'gallery_10':{icon:'🧑‍🎨',name:'Curator',desc:'10 artworks saved! Your gallery is filling up with your creations.'},'gallery_25':{icon:'🏛️',name:'Art Collector',desc:'25 pieces of pixel art saved. You\'ve got a proper art collection.'},'gallery_50':{icon:'🏟️',name:'Museum Director',desc:'50 artworks! Your gallery could fill a small museum.'},'gallery_100':{icon:'🌍',name:'Louvre Rival',desc:'100 artworks saved. A century of pixel art creations. Incredible output.'},'gallery_250':{icon:'🎨',name:'Prolific Painter',desc:'250 pieces! You\'re one of the most prolific pixel artists on the platform.'},'canvas_12':{icon:'📐',name:'Bigger Canvas',desc:'You upgraded to a 12x12 canvas — 44% more pixels to work with!'},'canvas_16':{icon:'🎂',name:'Sweet Sixteen',desc:'16x16 canvas unlocked! Four times the area of the starter canvas.'},'canvas_24':{icon:'🖼️',name:'Full Frame',desc:'24x24 canvas! That\'s 576 pixels — nine times the original.'},'canvas_32':{icon:'📺',name:'High Resolution',desc:'32x32 canvas unlocked. Now you can create truly detailed pixel art.'},'canvas_48':{icon:'🖥️',name:'Ultra Canvas',desc:'48x48 canvas! 2,304 pixels. Massive creative space.'},'canvas_64':{icon:'🤩',name:'Pixel Perfectionist',desc:'64x64 canvas unlocked. The biggest canvas available. 4,096 pixels of pure creativity.'},'dye_1':{icon:'🌈',name:'Color Curious',desc:'You invested in dye research level 1. New colors and cheaper canvas upgrades!'},'dye_3':{icon:'🎨',name:'Color Theory',desc:'Dye research level 3. Your color palette is expanding nicely.'},'dye_5':{icon:'🧪',name:'Master Dyer',desc:'Dye research level 5. You\'re becoming a true color specialist.'},'dye_8':{icon:'🪄',name:'Chromatic Wizard',desc:'Dye research level 8. Your palette is getting exotic.'},'dye_10':{icon:'🌌',name:'Spectrum Lord',desc:'Max dye research! You\'ve unlocked the full spectrum of available colors.'},'first_sale':{icon:'💲',name:'First Sale',desc:'You sold a canvas creation for the first time. You\'re an artist AND a businessperson.'},'first_hire':{icon:'👤',name:'First Hire',desc:'You hired your first employee! They\'ll help you earn passive income over time.'},'small_team':{icon:'👥',name:'Small Team',desc:'Employee level 2. Your small team is growing.'},'growing_team':{icon:'📈',name:'Growing Company',desc:'Employee level 3. You\'re running a real operation now.'},'department':{icon:'🏢',name:'Department Head',desc:'Employee level 4. You\'ve got a proper department working for you.'},'corporation':{icon:'🏢',name:'Corporation',desc:'Employee level 5. Your workforce is a legitimate corporation.'},'enterprise':{icon:'🌍',name:'Enterprise',desc:'Employee level 7. You\'re running a full enterprise operation.'},'conglomerate':{icon:'🏰',name:'Conglomerate',desc:'Employee level 10. Maximum workforce. You\'re a textile conglomerate.'},'broker_unlocked':{icon:'📉',name:'Wall Street',desc:'You unlocked the stock brokerage! You can now buy and sell stocks.'},'first_stock':{icon:'💹',name:'First Investment',desc:'You bought your first stock. Welcome to the market!'},'diversified':{icon:'📊',name:'Diversified',desc:'You own 3 different stocks. Smart — diversification reduces risk.'},'portfolio_5':{icon:'📋',name:'Portfolio Pro',desc:'5 different stocks in your portfolio. You\'re a well-diversified investor.'},'survived_crash':{icon:'💥',name:'Crash Survivor',desc:'You lived through a market crash event. Your portfolio took a hit but you survived.'},'canvas_buyer_2':{icon:'🛒',name:'Canvas Shopper',desc:'You\'ve purchased 2 different canvas sizes. More space for art!'},'canvas_buyer_3':{icon:'🛒',name:'Canvas Collector',desc:'3 canvas sizes purchased. You\'re investing in your creative tools.'},'canvas_buyer_5':{icon:'🛒',name:'Canvas Mogul',desc:'5 canvas sizes purchased! You\'ve got canvases for every occasion.'},'sales_100':{icon:'💵',name:'Art Dealer',desc:'You\'ve earned $100 from selling your pixel art creations.'},'sales_500':{icon:'🏠',name:'Gallery Owner',desc:'$500 from art sales. Your creations are worth real (virtual) money.'},'sales_1000':{icon:'🏛️',name:'Art Empire',desc:'$1,000 earned from loom sales. Your art business is thriving.'},'sales_5000':{icon:'🏟️',name:'Auction House',desc:'$5,000 from selling artwork. You\'re running a profitable gallery.'},'sales_10000':{icon:'💎',name:'Art Magnate',desc:'$10,000 from art sales alone. You\'ve built an art empire.'},'blocks_25':{icon:'🧵',name:'Quarter Bolt',desc:'25 textiles woven — that\'s over 4 hours of total focused time.'},'blocks_750':{icon:'🏵️',name:'Master Weaver',desc:'750 textiles! You\'ve spent 125 hours in deep focus. Over 5 full days.'},'blocks_1500':{icon:'💰',name:'Textile Tycoon',desc:'1,500 textiles woven. 250 hours of focused work. That\'s ten full days.'},'blocks_3500':{icon:'🗿',name:'Cloth Colossus',desc:'3,500 textiles. 583 hours. You\'ve spent over 24 straight days focusing.'},'blocks_7500':{icon:'🏺',name:'Fiber Pharaoh',desc:'7,500 textiles. 1,250 hours focused. That\'s 52 full days of deep work.'},'combo_7':{icon:'🍀',name:'Lucky Seven',desc:'7 sessions in a row. You hit the lucky number without stopping.'},'combo_30':{icon:'📚',name:'Thirty Stack',desc:'30 consecutive sessions. You sat there and stacked thirty rounds of focus.'},'combo_75':{icon:'🏃‍♂️',name:'Marathon Mind',desc:'75 sessions chained. That\'s a mental marathon and then some.'},'focus_75':{icon:'🌙',name:'Three Quarters',desc:'75 focus sessions. Three-quarters of the way to your first hundred.'},'focus_150':{icon:'🎉',name:'Sesquicentennial',desc:'150 sessions completed. One hundred and fifty times you chose to focus.'},'focus_750':{icon:'🛡️',name:'Relentless',desc:'750 sessions. You just don\'t quit. Seven hundred and fifty rounds of work.'},'level_7':{icon:'🍀',name:'Lucky Level',desc:'Level 7! You\'ve earned enough XP from focus sessions to pass the lucky number.'},'level_35':{icon:'💼',name:'Mid-Career',desc:'Level 35. You\'re deep into the grind now. Serious XP accumulated.'},'level_90':{icon:'🏁',name:'Almost There',desc:'Level 90! Just ten more to the century. The finish line is so close.'},'level_175':{icon:'🦹',name:'Overlord',desc:'Level 175. You\'ve gone far beyond what most players will ever see.'},'level_250':{icon:'🌌',name:'Quarter Thousand',desc:'Level 250. A quarter of a thousand levels. The XP numbers are enormous.'},'level_400':{icon:'🪐',name:'Ascendant',desc:'Level 400. Four hundred levels earned through sheer focused work.'},'streak_sleep_10':{icon:'🌚',name:'Ten Straight',desc:'10 nights in a row of on-time sleep. Double-digit streak!'},'streak_sleep_50':{icon:'🌠',name:'Fifty Nights',desc:'50 consecutive nights on time. Almost two months without a slip.'},'sleep_75':{icon:'🌍',name:'Seventy-Five',desc:'75 total nights on time. Three-quarters of the way to a hundred.'},'sleep_100':{icon:'💯',name:'Century Sleeper',desc:'100 nights on time! Triple digits. You\'ve mastered your bedtime.'},'sleep_125':{icon:'🎓',name:'Sleep Scholar',desc:'125 nights of on-time sleep. You could write a thesis on discipline.'},'sleep_250':{icon:'🤴',name:'Sleep Monarch',desc:'250 nights on time. A quarter-thousand bedtimes honored.'},'sleep_400':{icon:'🏯',name:'Sleep Emperor',desc:'400 nights of keeping your bedtime promise. Over a year of discipline.'},'gallery_2':{icon:'🖌️',name:'Second Canvas',desc:'You saved a second artwork. The first wasn\'t a fluke!'},'gallery_15':{icon:'🏛️',name:'Mini Museum',desc:'15 artworks saved. You\'re curating a proper mini museum.'},'gallery_75':{icon:'🖼️',name:'Prolific Creator',desc:'75 pixel art pieces saved. Your creative output is impressive.'},'canvas_10':{icon:'📏',name:'First Upgrade',desc:'You upgraded to a 10x10 canvas. A little more room to express yourself!'},'social_trio':{icon:'👨‍👧‍👦',name:'The Trio',desc:'You, plus 3 friends. A proper trio of accountability partners.'},'social_crew_6':{icon:'🛶',name:'Full Crew',desc:'6 friends! You\'ve got a full crew rowing together.'},'social_army':{icon:'🛡️',name:'Small Army',desc:'40 friends. You\'ve assembled a small army of focused people.'},'sales_250':{icon:'🏪',name:'Art Merchant',desc:'You\'ve earned $250 from selling your pixel art creations.'},'sales_2500':{icon:'💰',name:'Canvas Capitalist',desc:'$2,500 earned from art sales. Your loom is a money-printing machine.'},'canvas_buyer_4':{icon:'📦',name:'Canvas Hoarder',desc:'4 canvas sizes purchased. You\'re collecting them like trading cards.'},'rich_2500':{icon:'🛋️',name:'Comfortable',desc:'$2,500 lifetime earnings. You\'re sitting pretty comfortably.'},'rich_75000':{icon:'💴',name:'Almost Six Figs',desc:'$75,000 earned. You\'re knocking on the door of six figures.'},'hoard_2500':{icon:'🐖',name:'Piggy Bank',desc:'$2,500 in your wallet at once. Your piggy bank is getting heavy.'},'hoard_75000':{icon:'🏦',name:'Fort Knox',desc:'$75,000 held at once. Your vault rivals Fort Knox.'},'hoard_250000':{icon:'💠',name:'Untouchable Wealth',desc:'$250,000 in the wallet. A quarter million sitting there. Unspent.'},'streak_5':{icon:'📚',name:'School Week',desc:'5 days in a row of coming back to focus. A full school week!'},'streak_10':{icon:'💪',name:'Ten-Day Tenacity',desc:'10 consecutive days of showing up. Double-digit dedication.'},'sleep_eternal_1500':{icon:'⚰️',name:'Eternal Rest',desc:'1,500 nights on time. Four years of keeping your bedtime promise. Unreal.'},'sleep_2000':{icon:'🌠',name:'Two Thousand Nights',desc:'2,000 bedtimes honored. Over five years of sleep discipline.'},'sleep_3000':{icon:'🕊️',name:'Sleep Immortal',desc:'3,000 nights on time. You are not a person — you are a sleep algorithm.'},'streak_sleep_500':{icon:'🗿',name:'Five Hundred Nights',desc:'500 nights in a row. Over 16 months without a single broken bedtime.'},'streak_sleep_730':{icon:'🏛️',name:'Two Perfect Years',desc:'730 consecutive nights on time. Two full years of unbroken discipline.'},'streak_sleep_1000':{icon:'🔱',name:'Thousand-Night Streak',desc:'One thousand consecutive nights. Nearly three years without missing one.'},'focus_15000':{icon:'🏔️',name:'Fifteen Thousand',desc:'15,000 sessions. You could have climbed Everest in the time you spent focusing.'},'focus_25000':{icon:'🪨',name:'Quarter-Hundred-K',desc:'25,000 sessions. Twenty-five thousand times you chose to sit down and work.'},'focus_50000':{icon:'🗻',name:'Fifty Thousand',desc:'50,000 focus sessions. This badge shouldn\'t exist. And yet here you are.'},'focus_100000':{icon:'🌋',name:'One Hundred Thousand',desc:'100,000 sessions. We genuinely did not think anyone would earn this.'},'streak_120':{icon:'🕯️',name:'Four-Month Flame',desc:'120 consecutive days. Four months of never missing a single day of focus.'},'streak_270':{icon:'🫃',name:'Nine-Month March',desc:'270 days straight. Nine months. You could have gestated a human.'},'streak_500':{icon:'🏺',name:'Five Hundred Days',desc:'500 consecutive days of daily focus. Over 16 months. Absurd.'},'streak_730':{icon:'📜',name:'Two-Year Streak',desc:'730 days in a row. Two full years of daily focus sessions. Inhuman.'},'streak_1000':{icon:'🔱',name:'Thousand-Day Streak',desc:'1,000 consecutive days. Nearly three years without missing one. Impossible made real.'},'streak_1461':{icon:'⚜️',name:'Four-Year Streak',desc:'1,461 days. Four full years. An entire presidential term of daily focus.'},'combo_150':{icon:'💫',name:'Combo Legend',desc:'150x combo. One hundred fifty sessions chained. You didn\'t eat or sleep, did you?'},'combo_200':{icon:'☄️',name:'Combo Immortal',desc:'200x combo. Two hundred consecutive sessions. The machine became sentient.'},'combo_500':{icon:'⛓️',name:'Five Hundred Chain',desc:'500 sessions back-to-back. If you\'re seeing this badge, we\'re concerned.'},'blocks_15000':{icon:'🏗️',name:'Fifteen K Textiles',desc:'15,000 textiles. 2,500 hours of focused time. Over 100 days of work.'},'blocks_25000':{icon:'🗽',name:'Twenty-Five Thousand',desc:'25,000 textiles. 4,166 hours. 173 full days of deep focus.'},'blocks_50000':{icon:'🌍',name:'Fifty Thousand Bolts',desc:'50,000 textiles. Over 8,300 hours. A full year of non-stop focus.'},'blocks_100000':{icon:'🪐',name:'Hundred K Textiles',desc:'100,000 textiles woven. We are not sure this is possible. Prove us wrong.'},'level_750':{icon:'🌋',name:'Three Quarter K',desc:'Level 750. The XP requirements at this level are genuinely staggering.'},'level_1000':{icon:'🏛️',name:'Level Thousand',desc:'Level 1,000. One thousand levels. If this game had a final boss, you\'d be it.'},'level_1500':{icon:'👁️',name:'Beyond Mortal',desc:'Level 1,500. We stopped writing level titles after 500 because we didn\'t think anyone would get here.'},'level_2000':{icon:'🔮',name:'Two Thousand',desc:'Level 2,000. This badge is a monument to patience. And possibly insanity.'},'rich_2000000':{icon:'💰',name:'Double Millionaire',desc:'$2,000,000 lifetime earnings. Two million from pure productivity.'},'rich_5000000':{icon:'🏝️',name:'Multi-Millionaire',desc:'$5,000,000 earned. Five million. You could buy a private island.'},'rich_10000000':{icon:'🛸',name:'Deca-Millionaire',desc:'$10,000,000 lifetime. Ten million coins earned through sheer discipline.'},'rich_50000000':{icon:'🌌',name:'Fifty Million',desc:'$50,000,000 earned. This is more money than some countries have.'},'rich_100000000':{icon:'🏰',name:'Hundred Million',desc:'$100,000,000. One. Hundred. Million. Coins.'},'hoard_1000000':{icon:'🐉',name:'Million in Pocket',desc:'One million coins in your wallet at once. Not lifetime — held simultaneously.'},'hoard_5000000':{icon:'🗝️',name:'Five Mil Hoard',desc:'$5,000,000 held at once. Your wallet weighs more than your principles.'},'hoard_10000000':{icon:'♾️',name:'Infinite Restraint',desc:'Ten million coins held simultaneously. You could buy everything. But you don\'t.'},'gallery_500':{icon:'🏭',name:'Art Factory',desc:'500 artworks saved. Half a thousand pieces of pixel art.'},'gallery_1000':{icon:'🌌',name:'Thousand Canvases',desc:'1,000 artworks saved. A thousand original pixel creations.'},'gallery_2500':{icon:'🎭',name:'Pixel Picasso',desc:'2,500 artworks. At this point you ARE the gallery.'},'sales_10':{icon:'💲',name:'Ten Sales',desc:'You sold 10 canvases. People actually want your art!'},'sales_25':{icon:'🏪',name:'Quarter Century Sales',desc:'25 canvases sold. You have an established art business.'},'sales_50':{icon:'🏬',name:'Fifty Sales',desc:'50 canvases sold. Your art is in demand.'},'sales_100_count':{icon:'🎪',name:'Century Sales',desc:'100 canvas sales. One hundred different pieces bought.'},'sales_250_count':{icon:'🏛️',name:'Gallery Tycoon',desc:'250 canvases sold. Your gallery has a waiting list.'},'sales_25000':{icon:'🏰',name:'Art Baron',desc:'$25,000 from art sales. Twenty-five grand from pixel art alone.'},'sales_50000':{icon:'🌍',name:'Art Tycoon',desc:'$50,000 from selling artwork. Your gallery is a serious business.'},'sales_100000':{icon:'💎',name:'Art Mogul',desc:'$100,000 from art sales alone. Six figures from pixel art. Legendary.'},'stocks_10':{icon:'📈',name:'Day Trader',desc:'You\'ve bought 10 stocks total. You\'re an active trader now.'},'stocks_25':{icon:'💻',name:'Trading Desk',desc:'25 stock purchases made. Your trading desk is busy.'},'stocks_50':{icon:'🏦',name:'Floor Trader',desc:'50 stock trades executed. You could work on Wall Street.'},'stocks_100':{icon:'🏢',name:'Hedge Fund',desc:'100 trades. You\'re running a one-person hedge fund.'},'market_events_3':{icon:'🌧️',name:'Weathered Investor',desc:'Survived 3 market events. Crashes, booms, bubbles — you\'ve seen them all.'},'market_events_5':{icon:'⚔️',name:'Battle-Scarred',desc:'5 market events endured. Your portfolio has the scars to prove it.'},'market_events_10':{icon:'🎖️',name:'Market Veteran',desc:'10 market events survived. You\'ve been through every kind of market.'},'market_events_25':{icon:'🛡️',name:'Market Immortal',desc:'25 market events. Nothing the market throws at you can break you.'},'portfolio_8':{icon:'📊',name:'Full Portfolio',desc:'8 different stocks owned simultaneously. Maximum diversification.'},'portfolio_10':{icon:'📋',name:'Index Fund',desc:'10 different stocks at once. You own a piece of everything.'},'employees_8':{icon:'🏗️',name:'Full Floor',desc:'Employee level 8. Your factory floor is packed.'},'canvas_buyer_6':{icon:'🎨',name:'Canvas Empire',desc:'6 canvas sizes purchased. You own every available size.'},'canvas_buyer_7':{icon:'🏆',name:'Complete Collection',desc:'7 canvas sizes purchased. You\'ve bought the full set.'},'social_75':{icon:'🗿',name:'Social Titan',desc:'75 friends! You\'re a social titan on the platform.'},'social_100':{icon:'💯',name:'Century Club',desc:'100 friends. One hundred people watching your journey.'},'social_150':{icon:'📢',name:'Small Following',desc:'150 friends. You have a legitimate following.'},'social_250':{icon:'🎬',name:'Micro-Celebrity',desc:'250 friends. A quarter-thousand people connected to you.'},'social_500':{icon:'🌊',name:'Social Phenomenon',desc:'500 friends. Half a thousand connections. You ARE the community.'}};

        function _getLevelFromXP(xp) {
          var level = 1, needed = 0;
          while (level < 999) {
            var next = (level + 1) * 50;
            if (needed + next > xp) return level;
            needed += next; level++;
          }
          return level;
        }

        function _checkAllBadges() {
          if (!Array.isArray(state.badges)) state.badges = [];
          var before = state.badges.slice();
          var earned = [];  // rebuild from current stats
          var level = _getLevelFromXP(state.xp || 0);
          var sessions = state.lifetimeSessions || state.totalLifetimeSessions || 0;
          var streak = Math.max(state.realStreak || 0, state.longestRealStreak || 0);
          var combo = state.maxCombo || 0;
          var friends = 0;
          if (Array.isArray(state.friends)) {
            for (var i = 0; i < state.friends.length; i++) {
              if (state.friends[i] && state.friends[i].status === 'accepted') friends++;
            }
          }
          var hasPic = !!(state.profilePicture && state.profilePicture.pixels);
          var hasName = !!(state.displayName && state.displayName.trim());
          var bt = state.bedtimeTotalSuccesses || 0;
          var bs = Math.max(state.bedtimeStreak || 0, state.bedtimeBestStreak || 0);
          var lc = state.lifetimeCoins || 0;
          var cc = state.coins || 0;
          var lb = state.totalLifetimeBlocks || 0;
          var gc = (state.savedArtworks && state.savedArtworks.length) || 0;
          var cs = state.canvasSize || 8;
          var cn = (state.purchasedCanvasSizes && state.purchasedCanvasSizes.length) || 1;
          var dr = state.dyeResearchLevel || 0;
          var el = state.employeesLevel || 0;
          var bu = state.brokerageUnlocked ? 1 : 0;
          var lsc = state.coinsFromLoomSales || 0;
          var so = 0, sb = 0;
          if (state.portfolio && typeof state.portfolio === 'object') {
            var pk = Object.keys(state.portfolio);
            for (var k = 0; k < pk.length; k++) {
              if (state.portfolio[pk[k]] && state.portfolio[pk[k]].shares > 0) { so++; sb++; }
            }
          }
          var me = state.marketEventsWeathered || 0;
          var reqs = [
            ['bedtimeTotal',bt],['bedtimeStreak',bs],['sessions',sessions],['streak',streak],
            ['combo',combo],['friends',friends],['level',level],['lifetimeCoins',lc],
            ['currentCoins',cc],['lifetimeBlocks',lb],['gallery',gc],['canvasSize',cs],
            ['canvasCount',cn],['dyeResearch',dr],['employees',el],['brokerageUnlocked',bu],
            ['stocksBought',sb],['stocksOwned',so],['marketEvents',me],['loomSales',gc],
            ['loomSalesCoins',lsc]
          ];
          var valMap = {};
          for (var v = 0; v < reqs.length; v++) valMap[reqs[v][0]] = reqs[v][1];
          valMap['profilePic'] = hasPic ? 1 : 0;
          valMap['displayName'] = hasName ? 1 : 0;
          valMap['fullProfile'] = (hasPic && hasName) ? 1 : 0;

          // Check all badges from BADGE_DEFS keys
          var allIds = Object.keys(BADGE_DEFS);
          // We need requirement info — embed minimal requirement map
          var REQ_MAP = {'early_bird_1':['bedtimeTotal',5],'sleep_warrior':['bedtimeTotal',10],'dream_weaver':['bedtimeTotal',15],'night_master':['bedtimeTotal',25],'sleep_sage':['bedtimeTotal',40],'lunar_legend':['bedtimeTotal',60],'rest_royalty':['bedtimeTotal',90],'eternal_dreamer':['bedtimeTotal',150],'sleep_deity':['bedtimeTotal',200],'year_of_rest':['bedtimeTotal',365],'sleep_olympian':['bedtimeTotal',500],'sleep_transcendent':['bedtimeTotal',750],'millennium_sleeper':['bedtimeTotal',1000],'streak_sleep_3':['bedtimeStreak',3],'streak_sleep_5':['bedtimeStreak',5],'streak_sleep_7':['bedtimeStreak',7],'streak_sleep_14':['bedtimeStreak',14],'streak_sleep_21':['bedtimeStreak',21],'streak_sleep_30':['bedtimeStreak',30],'streak_sleep_45':['bedtimeStreak',45],'streak_sleep_60':['bedtimeStreak',60],'streak_sleep_90':['bedtimeStreak',90],'streak_sleep_120':['bedtimeStreak',120],'streak_sleep_180':['bedtimeStreak',180],'streak_sleep_270':['bedtimeStreak',270],'streak_sleep_365':['bedtimeStreak',365],'pillow_pro':['bedtimeStreak',3],'no_phone_zone':['bedtimeTotal',10],'melatonin_machine':['bedtimeTotal',50],'first_focus':['sessions',1],'five_sessions':['sessions',5],'ten_sessions':['sessions',10],'twentyfive_sess':['sessions',25],'fifty_sessions':['sessions',50],'century_focus':['sessions',100],'focus_250':['sessions',250],'focus_500':['sessions',500],'focus_1000':['sessions',1000],'focus_2500':['sessions',2500],'focus_5000':['sessions',5000],'focus_10000':['sessions',10000],'streak_3':['streak',3],'streak_7':['streak',7],'streak_14':['streak',14],'streak_21':['streak',21],'streak_30':['streak',30],'streak_60':['streak',60],'streak_90':['streak',90],'streak_180':['streak',180],'streak_365':['streak',365],'combo_3':['combo',3],'combo_5':['combo',5],'combo_10':['combo',10],'combo_15':['combo',15],'combo_20':['combo',20],'combo_25':['combo',25],'combo_50':['combo',50],'combo_100':['combo',100],'blocks_10':['lifetimeBlocks',10],'blocks_50':['lifetimeBlocks',50],'blocks_100':['lifetimeBlocks',100],'blocks_250':['lifetimeBlocks',250],'blocks_500':['lifetimeBlocks',500],'blocks_1000':['lifetimeBlocks',1000],'blocks_2500':['lifetimeBlocks',2500],'blocks_5000':['lifetimeBlocks',5000],'blocks_10000':['lifetimeBlocks',10000],'first_friend':['friends',1],'social_duo':['friends',2],'social_circle':['friends',3],'social_squad':['friends',5],'social_popular':['friends',7],'social_influencer':['friends',10],'social_celebrity':['friends',15],'social_famous':['friends',20],'social_icon':['friends',25],'social_mogul':['friends',50],'profile_pic':['profilePic',1],'display_name':['displayName',1],'full_profile':['fullProfile',1],'networker':['friends',5],'party_starter':['friends',3],'hype_crew':['friends',8],'social_butterfly':['friends',12],'guild_leader':['friends',30],'level_3':['level',3],'level_5':['level',5],'level_10':['level',10],'level_15':['level',15],'level_20':['level',20],'level_25':['level',25],'level_30':['level',30],'level_40':['level',40],'level_50':['level',50],'level_60':['level',60],'level_75':['level',75],'level_100':['level',100],'level_125':['level',125],'level_150':['level',150],'level_200':['level',200],'level_300':['level',300],'level_500':['level',500],'rich_100':['lifetimeCoins',100],'rich_500':['lifetimeCoins',500],'rich_1000':['lifetimeCoins',1000],'rich_5000':['lifetimeCoins',5000],'rich_10000':['lifetimeCoins',10000],'rich_25000':['lifetimeCoins',25000],'rich_50000':['lifetimeCoins',50000],'rich_100000':['lifetimeCoins',100000],'rich_250000':['lifetimeCoins',250000],'rich_500000':['lifetimeCoins',500000],'rich_1000000':['lifetimeCoins',1000000],'hoard_1000':['currentCoins',1000],'hoard_5000':['currentCoins',5000],'hoard_10000':['currentCoins',10000],'hoard_25000':['currentCoins',25000],'hoard_50000':['currentCoins',50000],'hoard_100000':['currentCoins',100000],'hoard_500000':['currentCoins',500000],'gallery_1':['gallery',1],'gallery_3':['gallery',3],'gallery_5':['gallery',5],'gallery_10':['gallery',10],'gallery_25':['gallery',25],'gallery_50':['gallery',50],'gallery_100':['gallery',100],'gallery_250':['gallery',250],'canvas_12':['canvasSize',12],'canvas_16':['canvasSize',16],'canvas_24':['canvasSize',24],'canvas_32':['canvasSize',32],'canvas_48':['canvasSize',48],'canvas_64':['canvasSize',64],'dye_1':['dyeResearch',1],'dye_3':['dyeResearch',3],'dye_5':['dyeResearch',5],'dye_8':['dyeResearch',8],'dye_10':['dyeResearch',10],'first_sale':['loomSales',1],'first_hire':['employees',1],'small_team':['employees',2],'growing_team':['employees',3],'department':['employees',4],'corporation':['employees',5],'enterprise':['employees',7],'conglomerate':['employees',10],'broker_unlocked':['brokerageUnlocked',1],'first_stock':['stocksBought',1],'diversified':['stocksOwned',3],'portfolio_5':['stocksOwned',5],'survived_crash':['marketEvents',1],'canvas_buyer_2':['canvasCount',2],'canvas_buyer_3':['canvasCount',3],'canvas_buyer_5':['canvasCount',5],'sales_100':['loomSalesCoins',100],'sales_500':['loomSalesCoins',500],'sales_1000':['loomSalesCoins',1000],'sales_5000':['loomSalesCoins',5000],'sales_10000':['loomSalesCoins',10000],'blocks_25':['lifetimeBlocks',25],'blocks_750':['lifetimeBlocks',750],'blocks_1500':['lifetimeBlocks',1500],'blocks_3500':['lifetimeBlocks',3500],'blocks_7500':['lifetimeBlocks',7500],'combo_7':['combo',7],'combo_30':['combo',30],'combo_75':['combo',75],'focus_75':['sessions',75],'focus_150':['sessions',150],'focus_750':['sessions',750],'level_7':['level',7],'level_35':['level',35],'level_90':['level',90],'level_175':['level',175],'level_250':['level',250],'level_400':['level',400],'streak_sleep_10':['bedtimeStreak',10],'streak_sleep_50':['bedtimeStreak',50],'sleep_75':['bedtimeTotal',75],'sleep_100':['bedtimeTotal',100],'sleep_125':['bedtimeTotal',125],'sleep_250':['bedtimeTotal',250],'sleep_400':['bedtimeTotal',400],'gallery_2':['gallery',2],'gallery_15':['gallery',15],'gallery_75':['gallery',75],'canvas_10':['canvasSize',10],'social_trio':['friends',3],'social_crew_6':['friends',6],'social_army':['friends',40],'sales_250':['loomSalesCoins',250],'sales_2500':['loomSalesCoins',2500],'canvas_buyer_4':['canvasCount',4],'rich_2500':['lifetimeCoins',2500],'rich_75000':['lifetimeCoins',75000],'hoard_2500':['currentCoins',2500],'hoard_75000':['currentCoins',75000],'hoard_250000':['currentCoins',250000],'streak_5':['streak',5],'streak_10':['streak',10],'sleep_eternal_1500':['bedtimeTotal',1500],'sleep_2000':['bedtimeTotal',2000],'sleep_3000':['bedtimeTotal',3000],'streak_sleep_500':['bedtimeStreak',500],'streak_sleep_730':['bedtimeStreak',730],'streak_sleep_1000':['bedtimeStreak',1000],'focus_15000':['sessions',15000],'focus_25000':['sessions',25000],'focus_50000':['sessions',50000],'focus_100000':['sessions',100000],'streak_120':['streak',120],'streak_270':['streak',270],'streak_500':['streak',500],'streak_730':['streak',730],'streak_1000':['streak',1000],'streak_1461':['streak',1461],'combo_150':['combo',150],'combo_200':['combo',200],'combo_500':['combo',500],'blocks_15000':['lifetimeBlocks',15000],'blocks_25000':['lifetimeBlocks',25000],'blocks_50000':['lifetimeBlocks',50000],'blocks_100000':['lifetimeBlocks',100000],'level_750':['level',750],'level_1000':['level',1000],'level_1500':['level',1500],'level_2000':['level',2000],'rich_2000000':['lifetimeCoins',2000000],'rich_5000000':['lifetimeCoins',5000000],'rich_10000000':['lifetimeCoins',10000000],'rich_50000000':['lifetimeCoins',50000000],'rich_100000000':['lifetimeCoins',100000000],'hoard_1000000':['currentCoins',1000000],'hoard_5000000':['currentCoins',5000000],'hoard_10000000':['currentCoins',10000000],'gallery_500':['gallery',500],'gallery_1000':['gallery',1000],'gallery_2500':['gallery',2500],'sales_10':['loomSales',10],'sales_25':['loomSales',25],'sales_50':['loomSales',50],'sales_100_count':['loomSales',100],'sales_250_count':['loomSales',250],'sales_25000':['loomSalesCoins',25000],'sales_50000':['loomSalesCoins',50000],'sales_100000':['loomSalesCoins',100000],'stocks_10':['stocksBought',10],'stocks_25':['stocksBought',25],'stocks_50':['stocksBought',50],'stocks_100':['stocksBought',100],'market_events_3':['marketEvents',3],'market_events_5':['marketEvents',5],'market_events_10':['marketEvents',10],'market_events_25':['marketEvents',25],'portfolio_8':['stocksOwned',8],'portfolio_10':['stocksOwned',10],'employees_8':['employees',8],'canvas_buyer_6':['canvasCount',6],'canvas_buyer_7':['canvasCount',7],'social_75':['friends',75],'social_100':['friends',100],'social_150':['friends',150],'social_250':['friends',250],'social_500':['friends',500]};

          for (var id in REQ_MAP) {
            var rr = REQ_MAP[id];
            var val = valMap[rr[0]];
            if (typeof val === 'number' && val >= rr[1]) {
              earned.push(id);
            }
          }
          // Badges are permanent: merge previously earned + newly qualified
          var merged = before.slice();
          var newBadges = [];
          for (var ni = 0; ni < earned.length; ni++) {
            if (merged.indexOf(earned[ni]) === -1) {
              merged.push(earned[ni]);
              newBadges.push(earned[ni]);
            }
          }
          state.badges = merged;
          if (newBadges.length > 0) {
            save();
            // Show celebration for each new badge
            newBadges.forEach(function(bid, idx) {
              var bd = BADGE_DEFS[bid];
              if (!bd) return;
              setTimeout(function() {
                _showBadgeToast(bd.icon, bd.name, bd.desc);
                // Chrome notification
                try {
                  chrome.notifications.create('badge-' + bid, {
                    type: 'basic',
                    iconUrl: 'icon128.png',
                    title: 'Badge Unlocked!',
                    message: bd.icon + ' ' + bd.name + ' — ' + bd.desc,
                    priority: 2
                  });
                } catch(_) {}
              }, idx * 2500);
            });
          }
        }

        function _showBadgeToast(icon, name, desc) {
          var toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.3);z-index:99999;background:linear-gradient(135deg,#1a1610,#2a2010);border:3px solid #ffd700;border-radius:16px;padding:24px 32px;text-align:center;box-shadow:0 0 60px rgba(255,215,0,0.4);opacity:0;transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;';
          toast.innerHTML = '<div style="font-size:52px;margin-bottom:8px;animation:badgeBounce 0.6s ease;">' + icon + '</div>'
            + '<div style="font-family:\'Press Start 2P\',monospace;font-size:9px;color:#ffd700;letter-spacing:1px;margin-bottom:4px;">BADGE UNLOCKED!</div>'
            + '<div style="font-family:\'Press Start 2P\',monospace;font-size:11px;color:#fff;letter-spacing:0.5px;">' + name + '</div>'
            + '<div style="font-size:10px;color:#aaa;margin-top:6px;">' + desc + '</div>';
          document.body.appendChild(toast);
          requestAnimationFrame(function() {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%,-50%) scale(1)';
          });
          // Play celebration sound
          try { SFX.levelUp(); } catch(_) { try { SFX.success(); } catch(_) {} }
          setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%,-50%) scale(0.8)';
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 500);
          }, 2200);
        }

        _checkAllBadges();
      } catch(e) { console.error('[BadgeCheck]', e); }
    }, 2500);


      // Timer buttons
      if (startBtn) startBtn.addEventListener('click', startTimer);
      if (resetBtn) resetBtn.addEventListener('click', resetTimer);
      // Always-on-top pop-out timer (Document Picture-in-Picture)
      var popOutBtn = document.getElementById('popOutTimerBtn');
      if (popOutBtn) popOutBtn.addEventListener('click', openPopOutTimer);

      // Title ladder infographic — click the level badge to open
      var levelBadgeEl = document.getElementById('levelBadge');
      if (levelBadgeEl) levelBadgeEl.addEventListener('click', openTitleLadderModal);
      var titleLadderCloseBtn = document.getElementById('titleLadderCloseBtn');
      if (titleLadderCloseBtn) titleLadderCloseBtn.addEventListener('click', closeTitleLadderModal);
      var titleLadderModalEl = document.getElementById('titleLadderModal');
      if (titleLadderModalEl) {
        titleLadderModalEl.addEventListener('click', function(e) {
          if (e.target === titleLadderModalEl) closeTitleLadderModal();
        });
      }

      // When the tab comes back to the foreground after being hidden,
      // immediately re-sync the timer against the wall clock. Chrome
      // throttles setInterval in background tabs to ~1/min after 5 min,
      // so without this sync the display would slowly catch up instead
      // of snapping straight to the correct remaining time. If the
      // session would already have ended while we weren't looking, this
      // fires the completion path right away so the user gets credit.
      //
      // v3.19.11: also re-arms the tick interval if it got lost (e.g.
      // service-worker suspension, browser throttling leaving the
      // interval stale). Belt-and-suspenders against the "frozen
      // timer while a modal is up" bug.
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) return;
        if (state.timerState !== 'running') return;
        if (!state.timerEndsAt) return;
        var remMs3 = state.timerEndsAt - Date.now();
        if (remMs3 <= 0) {
          // Session ended while backgrounded — finalize now.
          clearInterval(timerInterval);
          timerInterval = null;
          state.timerRemaining = 0;
          state.timerEndsAt = 0;
          state.timerState = 'completed';
          try { SFX.timerComplete(); } catch (_) {}
          save();
          render();
          try { showFocusConfirmation(); } catch (_) {}
        } else {
          state.timerRemaining = Math.max(0, Math.ceil(remMs3 / 1000));
          save();
          renderTimer();
          renderBlockProgress();
          // If the tick interval isn't running (e.g. it was killed by
          // browser throttling or a modal race), restart it so the
          // display keeps updating every second.
          if (!timerInterval) {
            try { armTimerTick(); } catch (_) {}
          }
        }
      });

      // Add task
      var addTaskBtn = $('addTaskBtn');
      if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);
      if (taskInput) {
        taskInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); addTask(); }
        });
      }

      // Session duration picker (10 / 30 / 60 min)
      var sessionPicker = document.getElementById('sessionPicker');
      if (sessionPicker) {
        sessionPicker.addEventListener('click', function(e) {
          var t = e.target;
          while (t && t !== sessionPicker && !t.classList.contains('session-pill')) t = t.parentElement;
          if (!t || !t.classList.contains('session-pill')) return;
          var dur = parseInt(t.getAttribute('data-dur'), 10);
          if (dur) setSessionDuration(dur);
        });
      }

      // Tabs dropdown bookend menu
      var tabMenuBtn = document.getElementById('tabMenuBtn');
      if (tabMenuBtn) {
        tabMenuBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleTabsDropdown();
        });
      }
      document.addEventListener('click', function(e) {
        var dd = document.getElementById('tabsDropdown');
        if (!dd || !dd.classList.contains('open')) return;
        if (dd.contains(e.target)) return;
        closeTabsDropdown();
      });

      // Add project
      var addTabBtn = $('addTabBtn');
      if (addTabBtn) addTabBtn.addEventListener('click', openNewProjectModal);

      // Project modal buttons
      var modalSave = $('modalSave');
      var modalCancel = $('modalCancel');
      var modalDelete = $('modalDelete');
      var modalInput = $('modalInput');
      if (modalSave) modalSave.addEventListener('click', saveProjectModal);
      if (modalCancel) modalCancel.addEventListener('click', closeProjectModal);
      if (modalDelete) modalDelete.addEventListener('click', deleteProjectFromModal);
      if (modalInput) {
        modalInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); saveProjectModal(); }
          else if (e.key === 'Escape') { e.preventDefault(); closeProjectModal(); }
        });
      }

      // Collapsible sections (Bundles, Milestones, Canvas Upgrades)
      var collapsibleHeaders = document.querySelectorAll('.collapsible-header');
      collapsibleHeaders.forEach(function(header) {
        header.addEventListener('click', function() {
          var body = header.nextElementSibling;
          if (!body || !body.classList.contains('collapsible-body')) return;
          var isOpen = body.classList.toggle('open');
          // Fallback for cases where the .open CSS class rule isn't applied
          body.style.display = isOpen ? 'block' : 'none';
          var arrow = header.querySelector('.collapse-arrow');
          if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
          SFX.tabSwitch();
        });
      });

      // All cross-window opens go through background.js's openPixelFocusWindow
      // helper (sent via runtime message) so we get dedup: a second click
      // focuses the existing tab instead of opening a duplicate.
      function openPFWindow(path) {
        // v3.21.75: Mirror mode — block all navigation except profile
        if (state.mirrorMode && path !== 'profile.html') return;
        // v3.21.7: Block game windows when locked (priorities or timer).
        var gamePages = ['gallery.html', 'factory.html', 'house.html', 'ratiocinatory.html', 'bureau.html', 'employees.html', 'research.html', 'incinerator.html'];
        if (gamePages.indexOf(path) !== -1 && isGameLocked()) {
          notify(getGameLockReason(), 'var(--warning)');
          return;
        }
        try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
      }

      // Block counter -> open gallery (textile counter, gallery is where they're spent)
      var blockCounter = $('blockCounter');
      if (blockCounter) {
        blockCounter.addEventListener('click', function() { openPFWindow('gallery.html'); });
      }

      // v3.20.26: profile-picture avatar — click opens the Profile page.
      // (Previously routed to gallery.html; the gallery's PROFILE buttons
      // remain the way to pick a different loom as your picture.)
      var profileAvatarEl = $('profileAvatar');
      if (profileAvatarEl) {
        profileAvatarEl.title = 'Your profile picture. Click to open your Profile page \u2014 stats, streak, title, and card of standing.';
        profileAvatarEl.addEventListener('click', function() {
          try { SFX.tabSwitch(); } catch (_) {}
          openPFWindow('profile.html');
        });
      }

      // v3.20.26: small profile-icon + PROFILE button next to the level
      // display open the Profile page. The level badge itself keeps its
      // existing click-through to the title ladder modal.
      var levelProfileIcon = document.getElementById('levelProfileIcon');
      if (levelProfileIcon) {
        levelProfileIcon.addEventListener('click', function(e) {
          e.stopPropagation();
          try { SFX.tabSwitch(); } catch (_) {}
          openPFWindow('profile.html');
        });
      }
      var levelProfileBtn = document.getElementById('levelProfileBtn');
      if (levelProfileBtn) {
        levelProfileBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          try { SFX.tabSwitch(); } catch (_) {}
          openPFWindow('profile.html');
        });
      }

      // v3.20.0 Stage 5: House button. Routes the player back to the
      // wakeup antechamber where the family rap sheet lives. Purely a
      // navigation; the house window only reads state, never writes.
      var houseBtn = $('houseBtn');
      if (houseBtn) {
        houseBtn.addEventListener('click', function() {
          try { SFX.tabSwitch(); } catch (_) {}
          openPFWindow('house.html');
        });
      }

      // v3.20.0 Stage 5: BURN DUST handler. The button is hidden by
      // renderDustbin until state.materialsIncineratorUnlocked flips
      // true, but we wire it unconditionally on init so a live upgrade
      // from another window does not require a page reload.
      var burnDustBtn = $('burnDustBtn');
      if (burnDustBtn) {
        burnDustBtn.addEventListener('click', function () {
          try { SFX.click(); } catch (_) {}
          burnDustNow();
        });
      }

      // Gallery button
      var galleryBtn = $('galleryBtn');
      if (galleryBtn) {
        galleryBtn.addEventListener('click', function() {
          SFX.tabSwitch();
          openPFWindow('gallery.html');
        });
      }

      // Factory button (Paperclips-style upgrade tree, separate window)
      var factoryBtn = $('factoryBtn');
      if (factoryBtn) {
        factoryBtn.addEventListener('click', function() {
          SFX.tabSwitch();
          openPFWindow('factory.html');
        });
      }

      // v3.23.75: Brokerage button (investment market, separate window).
      // Hidden by default; made visible once state.brokerageUnlocked
      // flips true (purchased from factory upgrades).
      var brokerageBtn = $('brokerageBtn');
      if (brokerageBtn) {
        brokerageBtn.addEventListener('click', function() {
          SFX.tabSwitch();
          openPFWindow('brokerage.html');
        });
      }

      // v3.23.96: Badges button (always visible — not a game page, no lockout)
      var badgesBtn = $('badgesBtn');
      if (badgesBtn) {
        badgesBtn.addEventListener('click', function() {
          SFX.tabSwitch();
          openPFWindow('badges.html');
        });
      }

      // v3.23.82: Market pricing slider — saves price to state on drag.
      var mktSlider = $('marketPriceSlider');
      if (mktSlider) {
        mktSlider.addEventListener('input', function() {
          state.marketPrice = parseInt(mktSlider.value) || 12;
          var lbl = $('marketPriceLabel');
          if (lbl) lbl.textContent = '$' + state.marketPrice;
          save();
        });
      }

      // v3.19.17: Ratiocinatory button (Section IX, separate window).
      // Hidden by default; made visible once state.ratiocinatoryUnlocked
      // flips true (which happens when the Cogitorium Annex factory
      // upgrade is purchased). Visibility is maintained in render().
      var ratioBtn = $('ratiocinatoryBtn');
      if (ratioBtn) {
        ratioBtn.addEventListener('click', function() {
          SFX.tabSwitch();
          openPFWindow('ratiocinatory.html');
        });
      }

      // Money counter -> open factory
      var coinsDisplay = $('coinsDisplay');
      if (coinsDisplay) {
        var coinsStat = coinsDisplay.closest('.stat');
        if (coinsStat) {
          coinsStat.style.cursor = 'pointer';
          coinsStat.addEventListener('click', function() { openPFWindow('factory.html'); });
        }
      }

      // Bundle dropdown toggle
      var loadBundleBtn = $('loadBundleBtn');
      var bundleDropdown = $('bundleDropdown');
      if (loadBundleBtn && bundleDropdown) {
        loadBundleBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          bundleDropdown.style.display = bundleDropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', function(e) {
          if (!bundleDropdown.contains(e.target) && e.target !== loadBundleBtn) {
            bundleDropdown.style.display = 'none';
          }
        });
      }

      // ===== Bundle creator wiring =====
      // The bundle creator UI has four inputs that were previously
      // declared but never hooked up in v3.17 and earlier: the name
      // field, the task field, the "+" add-task button, and the SAVE
      // BUNDLE button. "+ CREATE BUNDLE" also didn't actually open the
      // creator panel — it only reset the draft object. This block
      // wires all of them together.
      var newBundleBtn = $('newBundleBtn');
      var bundleCreator = $('bundleCreator');
      var bundleNameInput = $('bundleNameInput');
      var bundleTaskInput = $('bundleTaskInput');
      var bundleAddTaskBtn = $('bundleAddTaskBtn');
      var bundleSaveBtn = $('bundleSaveBtn');
      var bundleCancelBtn = $('bundleCancelBtn');

      // "+ CREATE BUNDLE" — reset draft, display panel, focus name.
      if (newBundleBtn && bundleCreator) {
        newBundleBtn.addEventListener('click', function() {
          bundleDraft = { name: '', tasks: [], editingId: null };
          if (bundleNameInput) bundleNameInput.value = '';
          if (bundleTaskInput) bundleTaskInput.value = '';
          if (bundleSaveBtn) bundleSaveBtn.textContent = 'SAVE BUNDLE';
          bundleCreator.style.display = 'block';
          renderBundleCreator();
          SFX.tabSwitch();
          if (bundleNameInput) setTimeout(function() { bundleNameInput.focus(); }, 50);
        });
      }

      // Name field syncs to draft as you type so SAVE can read it.
      if (bundleNameInput) {
        bundleNameInput.addEventListener('input', function() {
          bundleDraft.name = bundleNameInput.value;
        });
      }

      // Shared helper: take whatever is in the task input, push it onto
      // the draft, clear the field, re-render the preview. Trims and
      // silently no-ops on empty strings so hitting + on an empty field
      // doesn't add a blank task.
      function pushDraftTaskFromInput() {
        if (!bundleTaskInput) return;
        var txt = (bundleTaskInput.value || '').trim();
        if (!txt) return;
        bundleDraft.tasks.push(txt);
        bundleTaskInput.value = '';
        renderBundleCreator();
        SFX.click();
        bundleTaskInput.focus();
      }
      if (bundleAddTaskBtn) {
        bundleAddTaskBtn.addEventListener('click', pushDraftTaskFromInput);
      }
      if (bundleTaskInput) {
        bundleTaskInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            pushDraftTaskFromInput();
          }
        });
      }

      // SAVE BUNDLE — validate, then either update the editingId bundle
      // in place or append a brand new one. Also flushes any un-added
      // text sitting in the task input so the user doesn't lose a task
      // they typed but forgot to press + on.
      if (bundleSaveBtn) {
        bundleSaveBtn.addEventListener('click', function() {
          // Flush pending task text if present
          if (bundleTaskInput && (bundleTaskInput.value || '').trim()) {
            bundleDraft.tasks.push(bundleTaskInput.value.trim());
            bundleTaskInput.value = '';
          }
          var name = (bundleNameInput && bundleNameInput.value || '').trim();
          if (!name) {
            notify('Bundle needs a name.');
            if (bundleNameInput) bundleNameInput.focus();
            return;
          }
          if (!bundleDraft.tasks || bundleDraft.tasks.length === 0) {
            notify('Add at least one task to the bundle.');
            if (bundleTaskInput) bundleTaskInput.focus();
            return;
          }
          if (!state.bundles) state.bundles = [];
          if (bundleDraft.editingId) {
            var existing = state.bundles.find(function(b) { return b.id === bundleDraft.editingId; });
            if (existing) {
              existing.name = name;
              existing.tasks = bundleDraft.tasks.slice();
            }
            notify('Bundle updated: ' + name);
          } else {
            state.bundles.push({
              id: 'bundle_' + Date.now(),
              name: name,
              tasks: bundleDraft.tasks.slice(),
              createdAt: Date.now()
            });
            notify('Bundle saved: ' + name);
          }
          bundleDraft = { name: '', tasks: [], editingId: null };
          if (bundleCreator) bundleCreator.style.display = 'none';
          if (bundleNameInput) bundleNameInput.value = '';
          if (bundleTaskInput) bundleTaskInput.value = '';
          SFX.purchase();
          save();
          render();
        });
      }

      // Bundle cancel
      if (bundleCancelBtn && bundleCreator) {
        bundleCancelBtn.addEventListener('click', function() {
          bundleCreator.style.display = 'none';
          bundleDraft = { name: '', tasks: [], editingId: null };
          if (bundleNameInput) bundleNameInput.value = '';
          if (bundleTaskInput) bundleTaskInput.value = '';
          SFX.click();
        });
      }

      // ===== v3.23.61: Friends & Remote Task Sharing =====
      (function initFriendsUI() {
        var profileIdDisplay = $('profileIdDisplay');
        var copyBtn = $('copyProfileIdBtn');
        var profileLinkEl = $('profileLinkFromFriends');
        var friendRequestsList = $('friendRequestsList');
        var friendRequestsSection = $('friendRequestsSection');
        var accessRequestsList = $('accessRequestsList');
        var accessRequestsSection = $('accessRequestsSection');
        var friendsList = $('friendsList');
        var friendInboxBadge = $('friendInboxBadge');

        // Show profile ID
        if (profileIdDisplay && state.profileId) {
          profileIdDisplay.value = state.profileId;
        }
        if (profileLinkEl && state.profileId) {
          profileLinkEl.href = 'https://todo-of-the-loom.web.app/p/?id=' + state.profileId;
        }

        // Copy profile ID
        if (copyBtn) {
          copyBtn.addEventListener('click', function() {
            if (state.profileId) {
              navigator.clipboard.writeText(state.profileId).then(function() {
                copyBtn.textContent = 'COPIED!';
                copyBtn.style.color = '#00ff88';
                copyBtn.style.borderColor = '#00ff88';
                setTimeout(function() {
                  copyBtn.textContent = 'COPY';
                  copyBtn.style.color = '#5aadff';
                  copyBtn.style.borderColor = '#5aadff';
                }, 2000);
              });
            }
          });
        }

        // v3.23.68: Add friend — search by name with typeahead suggestions
        var addFriendInput = $('addFriendInput');
        var addFriendSearchBtn = $('addFriendSearchBtn');
        var addFriendResults = $('addFriendResults');
        var addFriendMsg = $('addFriendMsg');
        var _profileCache = null;
        var _profileCacheTime = 0;
        var _typeaheadTimer = null;

        function getProfileCache() {
          var now = Date.now();
          // Cache for 60 seconds
          if (_profileCache && (now - _profileCacheTime) < 60000) {
            return Promise.resolve(_profileCache);
          }
          return window.ProfileSync.searchProfiles().then(function(profiles) {
            _profileCache = profiles.filter(function(p) { return p.id !== state.profileId; });
            _profileCacheTime = Date.now();
            return _profileCache;
          });
        }

        function showTypeahead(query) {
          if (!query || query.length < 1 || !addFriendResults) return;
          getProfileCache().then(function(profiles) {
            var q = query.toLowerCase();
            var matches = profiles.filter(function(p) {
              return (p.displayName && p.displayName.toLowerCase().indexOf(q) !== -1)
                  || p.id.toLowerCase().indexOf(q) !== -1;
            });
            if (matches.length === 0) {
              addFriendResults.innerHTML = '';
              return;
            }
            renderSearchResults(matches);
          }).catch(function() {});
        }

        // v3.23.78: Helper — retry a Firestore social data write up to 3 times
        function _retrySocialWrite(retries) {
          retries = retries || 0;
          try {
            window.ProfileSync.putSocialData(state.profileId, { friends: state.friends })
              .catch(function() {
                if (retries < 3) setTimeout(function() { _retrySocialWrite(retries + 1); }, 5000);
              });
          } catch(_) {
            if (retries < 3) setTimeout(function() { _retrySocialWrite(retries + 1); }, 5000);
          }
        }

        // v3.23.78: Sanitize display name — cap at 100 chars, strip control chars
        function _sanitizeName(name) {
          if (!name || typeof name !== 'string') return '';
          return name.replace(/[\x00-\x1f]/g, '').substring(0, 100);
        }

        // v3.23.78: Rate limit — track last request time
        var _lastFriendReqTime = 0;

        function sendFriendRequest(targetId, targetName) {
          // v3.23.78: Validate profile ID format (12-char lowercase alphanumeric)
          if (!targetId || typeof targetId !== 'string' || !/^[a-z0-9]{8,20}$/.test(targetId)) {
            addFriendMsg.style.color = '#ff4444';
            addFriendMsg.textContent = 'Invalid profile ID.';
            return;
          }
          if (targetId === state.profileId) {
            addFriendMsg.style.color = '#ff4444';
            addFriendMsg.textContent = 'That\'s you!';
            return;
          }
          if (state.friends[targetId] && state.friends[targetId].status === 'accepted') {
            addFriendMsg.style.color = '#5aadff';
            addFriendMsg.textContent = 'Already friends with ' + (targetName || targetId) + '!';
            return;
          }
          // v3.23.78: Rate limit — 5 seconds between requests
          var now = Date.now();
          if (now - _lastFriendReqTime < 5000) {
            addFriendMsg.style.color = '#ff9f43';
            addFriendMsg.textContent = 'Slow down! Wait a few seconds.';
            return;
          }
          _lastFriendReqTime = now;
          addFriendMsg.style.color = 'var(--text-dim)';
          addFriendMsg.textContent = 'Sending...';
          window.ProfileSync.sendInboxMessage(targetId, {
            type: 'friend_request',
            fromId: state.profileId,
            fromName: state.displayName || 'A weaver',
            createdAt: new Date().toISOString()
          }).then(function() {
            addFriendMsg.style.color = '#00ff88';
            addFriendMsg.textContent = 'Friend request sent to ' + (targetName || targetId) + '!';
            addFriendInput.value = '';
            addFriendResults.innerHTML = '';
          }).catch(function() {
            addFriendMsg.style.color = '#ff4444';
            addFriendMsg.textContent = 'Failed to send. Try again.';
          });
        }

        if (addFriendSearchBtn && addFriendInput) {
          addFriendSearchBtn.addEventListener('click', function() {
            var query = (addFriendInput.value || '').trim();
            if (!query || query.length < 2) {
              addFriendMsg.style.color = '#ff4444';
              addFriendMsg.textContent = 'Type at least 2 characters to search.';
              return;
            }
            addFriendSearchBtn.disabled = true;
            addFriendSearchBtn.textContent = '...';
            addFriendMsg.textContent = '';
            addFriendResults.innerHTML = '';

            // Check if it looks like a Profile ID (lowercase alphanumeric, 6+ chars)
            var looksLikeId = /^[a-z0-9]{6,}$/.test(query.toLowerCase());

            window.ProfileSync.searchProfiles().then(function(profiles) {
              var queryLower = query.toLowerCase();
              var matches = profiles.filter(function(p) {
                if (p.id === state.profileId) return false; // exclude self
                // Match by name (partial, case-insensitive) or exact ID
                return (p.displayName && p.displayName.toLowerCase().indexOf(queryLower) !== -1)
                    || p.id.toLowerCase() === queryLower;
              });

              if (matches.length === 0) {
                // If it looks like an ID, try direct lookup
                if (looksLikeId) {
                  return window.ProfileSync.getProfile(queryLower).then(function(profile) {
                    if (profile && queryLower !== state.profileId) {
                      renderSearchResults([{
                        id: queryLower,
                        displayName: profile.displayName || queryLower,
                        level: profile.level || 0,
                        avatarDataURL: profile.avatarDataURL || ''
                      }]);
                    } else {
                      addFriendMsg.style.color = '#ff4444';
                      addFriendMsg.textContent = 'No profiles found.';
                    }
                  });
                }
                addFriendMsg.style.color = '#ff4444';
                addFriendMsg.textContent = 'No profiles found matching "' + escHtml(query) + '".';
              } else {
                renderSearchResults(matches);
              }
            }).catch(function() {
              addFriendMsg.style.color = '#ff4444';
              addFriendMsg.textContent = 'Search failed. Try again.';
            }).finally(function() {
              addFriendSearchBtn.disabled = false;
              addFriendSearchBtn.textContent = 'SEARCH';
            });
          });

          addFriendInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') addFriendSearchBtn.click();
          });
          // v3.23.68: Typeahead — suggest as you type (debounced 300ms)
          addFriendInput.addEventListener('input', function() {
            var val = (addFriendInput.value || '').trim();
            if (_typeaheadTimer) clearTimeout(_typeaheadTimer);
            if (val.length < 1) {
              addFriendResults.innerHTML = '';
              return;
            }
            _typeaheadTimer = setTimeout(function() {
              showTypeahead(val);
            }, 300);
          });
        }

        function renderSearchResults(matches) {
          if (!addFriendResults) return;
          var html = '';
          matches.forEach(function(m) {
            var isFriend = state.friends[m.id] && state.friends[m.id].status === 'accepted';
            html += '<div style="display:flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;margin-bottom:4px;">';
            html += profileLink(m.id, avatarThumb(m.avatarDataURL) + '<div style="flex:1;min-width:0;"><div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#5aadff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(m.displayName || m.id) + '</div><div style="font-size:9px;color:var(--text-dim);">Level ' + (m.level || 0) + '</div></div>');
            if (isFriend) {
              html += '<span style="font-size:8px;color:#00ff88;font-family:\'Press Start 2P\',monospace;">FRIEND</span>';
            } else {
              html += '<button class="btn btn-small search-add-btn" data-sid="' + escHtml(m.id) + '" data-sname="' + escHtml(m.displayName || m.id) + '" style="border-color:#4ecdc4;color:#4ecdc4;font-size:7px;padding:2px 8px;flex-shrink:0;">ADD</button>';
            }
            html += '</div>';
          });
          addFriendResults.innerHTML = html;

          // Wire up ADD buttons
          addFriendResults.querySelectorAll('.search-add-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var sid = btn.getAttribute('data-sid');
              var sname = btn.getAttribute('data-sname');
              btn.disabled = true;
              btn.textContent = '...';
              sendFriendRequest(sid, sname);
              btn.textContent = 'SENT';
              btn.style.borderColor = '#00ff88';
              btn.style.color = '#00ff88';
            });
          });
        }

        // v3.23.64: Fetch and cache a friend's avatar from their profile
        function fetchFriendAvatar(friendId) {
          if (!friendId || !window.ProfileSync || !window.ProfileSync.getProfile) return;
          try {
            window.ProfileSync.getProfile(friendId).then(function(profile) {
              if (!profile || !profile.avatarDataURL) return;
              if (state.friends[friendId]) {
                state.friends[friendId].avatarURL = profile.avatarDataURL;
                save();
                renderFriends();
              }
            }).catch(function() {});
          } catch(_) {}
        }

        // v3.23.64: Build a small avatar thumbnail element
        function avatarThumb(url) {
          if (url) {
            return '<img src="' + escHtml(url) + '" style="width:28px;height:28px;border-radius:50%;border:2px solid #5aadff;object-fit:cover;flex-shrink:0;image-rendering:pixelated;" />';
          }
          return '<div style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:var(--surface2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-dim);">?</div>';
        }

        // v3.23.68: Wrap avatar+name in a clickable link to web profile
        var PROFILE_BASE = 'https://todo-of-the-loom.web.app/p/?id=';
        function profileLink(pid, innerHtml) {
          return '<a href="' + PROFILE_BASE + escHtml(pid) + '" target="_blank" style="display:flex;align-items:center;gap:8px;text-decoration:none;cursor:pointer;" title="View profile">' + innerHtml + '</a>';
        }

        // Render friends list — shows accepted friends and their permissions
        function renderFriends() {
          var friends = state.friends || {};
          var keys = Object.keys(friends).filter(function(k) { return friends[k].status === 'accepted'; });
          if (!friendsList) return;
          if (keys.length === 0) {
            friendsList.innerHTML = '<div style="font-size:11px;color:var(--text-dim);font-style:italic;">No friends yet. Share your Profile ID!</div>';
            return;
          }
          var html = '';
          keys.forEach(function(fid) {
            var f = friends[fid];
            var perms = f.permittedProjects || [];
            var hasTaskAccess = f.taskAccessGranted === true;
            // v3.23.64: Fetch avatar if not cached yet
            if (!f.avatarURL) fetchFriendAvatar(fid);
            html += '<div style="background:var(--bg);border:1px solid ' + (hasTaskAccess ? '#5aadff' : 'var(--border)') + ';border-radius:6px;padding:8px;margin-bottom:6px;">';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">';
            html += profileLink(fid, avatarThumb(f.avatarURL) + '<span style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#5aadff;">' + escHtml(f.displayName || fid) + '</span>');
            html += '<button class="btn btn-small friend-remove-btn" data-fid="' + escHtml(fid) + '" style="border-color:#ff4444;color:#ff4444;font-size:7px;padding:2px 6px;">REMOVE</button>';
            html += '</div>';
            if (hasTaskAccess) {
              // Show per-project permission checkboxes
              var projects = state.projects || [];
              html += '<div style="font-size:9px;color:var(--text-dim);margin-bottom:4px;">Can add tasks to:</div>';
              html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
              projects.forEach(function(p) {
                var checked = perms.indexOf(p.id) !== -1;
                html += '<label style="font-size:10px;color:var(--text);display:flex;align-items:center;gap:3px;cursor:pointer;background:var(--surface2);padding:2px 6px;border-radius:4px;border:1px solid ' + (checked ? '#5aadff' : 'var(--border)') + ';">';
                html += '<input type="checkbox" class="friend-perm-cb" data-fid="' + escHtml(fid) + '" data-pid="' + escHtml(p.id) + '"' + (checked ? ' checked' : '') + ' style="accent-color:#5aadff;" />';
                html += escHtml(p.name) + '</label>';
              });
              html += '</div>';
              html += '<div style="margin-top:4px;"><button class="btn btn-small friend-revoke-access-btn" data-fid="' + escHtml(fid) + '" style="border-color:#ff9f43;color:#ff9f43;font-size:7px;padding:2px 6px;">REVOKE TASK ACCESS</button></div>';
            } else {
              html += '<div style="font-size:9px;color:var(--text-dim);font-style:italic;">Friend only — no task access granted.</div>';
            }
            // v3.23.66: Button to request task access TO this friend's projects
            html += '<div style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px;">';
            html += '<button class="btn btn-small friend-req-access-btn" data-fid="' + escHtml(fid) + '" data-fname="' + escHtml(f.displayName || fid) + '" style="border-color:#4ecdc4;color:#4ecdc4;font-size:7px;padding:2px 8px;">REQUEST ACCESS TO THEIR TASKS</button>';
            html += '</div>';
            html += '</div>';
          });
          friendsList.innerHTML = html;

          // Permission checkbox handlers
          friendsList.querySelectorAll('.friend-perm-cb').forEach(function(cb) {
            cb.addEventListener('change', function() {
              var fid = cb.getAttribute('data-fid');
              var pid = cb.getAttribute('data-pid');
              if (!state.friends[fid] || state.friends[fid].status !== 'accepted') return; // v3.23.78: guard
              var perms = state.friends[fid].permittedProjects || [];
              if (cb.checked && perms.indexOf(pid) === -1) {
                perms.push(pid);
              } else if (!cb.checked) {
                perms = perms.filter(function(x) { return x !== pid; });
              }
              state.friends[fid].permittedProjects = perms;
              save();
              _retrySocialWrite(); // v3.23.78: retry on failure
            });
          });

          // Revoke task access handler
          friendsList.querySelectorAll('.friend-revoke-access-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var fid = btn.getAttribute('data-fid');
              if (!fid || !state.friends[fid]) return;
              var name = state.friends[fid].displayName || fid;
              state.friends[fid].taskAccessGranted = false;
              state.friends[fid].permittedProjects = [];
              save();
              renderFriends();
              notify('Revoked task access for ' + name, '#ff9f43');
              _retrySocialWrite(); // v3.23.78: retry on failure
            });
          });

          // Remove friend handlers
          friendsList.querySelectorAll('.friend-remove-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var fid = btn.getAttribute('data-fid');
              if (!fid || !state.friends[fid]) return;
              var name = state.friends[fid].displayName || fid;
              if (!confirm('Remove ' + name + ' from your friends?')) return;
              delete state.friends[fid];
              save();
              renderFriends();
              notify('Removed friend: ' + name, '#ff4444');
              _retrySocialWrite(); // v3.23.78: retry on failure
            });
          });

          // v3.23.66: Request access to a friend's tasks (sends access_request to their inbox)
          friendsList.querySelectorAll('.friend-req-access-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var fid = btn.getAttribute('data-fid');
              var fname = btn.getAttribute('data-fname');
              if (!fid) return;
              btn.disabled = true;
              btn.textContent = 'SENDING...';
              try {
                window.ProfileSync.sendInboxMessage(fid, {
                  type: 'access_request',
                  fromId: state.profileId,
                  fromName: state.displayName || 'A weaver',
                  createdAt: new Date().toISOString()
                }).then(function() {
                  btn.textContent = 'REQUESTED!';
                  btn.style.borderColor = '#00ff88';
                  btn.style.color = '#00ff88';
                  notify('Task access requested from ' + (fname || fid), '#4ecdc4');
                }).catch(function() {
                  btn.disabled = false;
                  btn.textContent = 'REQUEST ACCESS TO THEIR TASKS';
                  notify('Failed to send request. Try again.', '#ff4444');
                });
              } catch(_) {
                btn.disabled = false;
                btn.textContent = 'REQUEST ACCESS TO THEIR TASKS';
              }
            });
          });
        }

        // Render pending friend requests
        function renderRequests(requests) {
          if (!friendRequestsSection || !friendRequestsList) return;
          if (!requests || requests.length === 0) {
            friendRequestsSection.style.display = 'none';
            return;
          }
          friendRequestsSection.style.display = 'block';
          var html = '';
          requests.forEach(function(req) {
            var reqAvatar = (state.friends[req.fromId] && state.friends[req.fromId].avatarURL) || req.avatarURL || '';
            html += '<div style="display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid #ff9f43;border-radius:6px;padding:6px 8px;margin-bottom:4px;">';
            html += profileLink(req.fromId, avatarThumb(reqAvatar) + '<span style="flex:1;font-size:11px;color:var(--text);">' + escHtml(req.fromName || req.fromId) + '</span>');
            html += '<span style="font-size:9px;color:var(--text-dim);margin-left:4px;">wants to be friends</span>';
            html += '<button class="btn btn-small friend-accept-btn" data-msgid="' + escHtml(req._id) + '" data-fid="' + escHtml(req.fromId) + '" data-fname="' + escHtml(req.fromName || '') + '" style="border-color:#00ff88;color:#00ff88;font-size:7px;padding:2px 6px;">ACCEPT</button>';
            html += '<button class="btn btn-small friend-decline-btn" data-msgid="' + escHtml(req._id) + '" data-fid="' + escHtml(req.fromId) + '" style="border-color:#ff4444;color:#ff4444;font-size:7px;padding:2px 6px;">DECLINE</button>';
            html += '</div>';
          });
          friendRequestsList.innerHTML = html;

          // Accept handler
          friendRequestsList.querySelectorAll('.friend-accept-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var msgId = btn.getAttribute('data-msgid');
              var fid = btn.getAttribute('data-fid');
              var fname = btn.getAttribute('data-fname');
              if (!fid) return;
              state.friends[fid] = {
                displayName: _sanitizeName(fname) || fid,
                status: 'accepted',
                taskAccessGranted: false,
                permittedProjects: [],
                addedAt: new Date().toISOString()
              };
              save();
              try { window.ProfileSync.deleteInboxMessage(state.profileId, msgId); } catch(_) {}
              // v3.23.71: Persist to Firestore with retry so acceptance isn't lost
              var _socialWriteDone = false;
              function _writeSocial() {
                try {
                  window.ProfileSync.putSocialData(state.profileId, { friends: state.friends })
                    .then(function() { _socialWriteDone = true; })
                    .catch(function() {
                      if (!_socialWriteDone) setTimeout(_writeSocial, 5000);
                    });
                } catch(_) {
                  if (!_socialWriteDone) setTimeout(_writeSocial, 5000);
                }
              }
              _writeSocial();
              try {
                window.ProfileSync.sendInboxMessage(fid, {
                  type: 'friend_accepted',
                  fromId: state.profileId,
                  fromName: state.displayName || 'A weaver',
                  createdAt: new Date().toISOString()
                });
              } catch(_) {}
              notify('Accepted friend request from ' + (fname || fid), '#00ff88');
              fetchFriendAvatar(fid); // v3.23.64: grab avatar on accept
              renderFriends();
              pollInbox();
            });
          });

          // Decline handler — v3.23.65: mark declined so dupes auto-clean
          friendRequestsList.querySelectorAll('.friend-decline-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var msgId = btn.getAttribute('data-msgid');
              var fid = btn.getAttribute('data-fid');
              try { window.ProfileSync.deleteInboxMessage(state.profileId, msgId); } catch(_) {}
              // Mark as declined so future duplicate requests from this person get auto-deleted
              if (fid) {
                state.friends[fid] = { displayName: '', status: 'declined', addedAt: new Date().toISOString() };
                save();
                _retrySocialWrite(); // v3.23.78: sync decline to Firestore so it persists
              }
              notify('Friend request declined.', '#ff4444');
              pollInbox();
            });
          });
        }

        // Render access requests (friends asking for task-adding permission)
        function renderAccessRequests(requests) {
          if (!accessRequestsSection || !accessRequestsList) return;
          if (!requests || requests.length === 0) {
            accessRequestsSection.style.display = 'none';
            return;
          }
          accessRequestsSection.style.display = 'block';
          var html = '';
          requests.forEach(function(req) {
            var accAvatar = (state.friends[req.fromId] && state.friends[req.fromId].avatarURL) || '';
            html += '<div style="background:var(--bg);border:1px solid #4ecdc4;border-radius:6px;padding:8px;margin-bottom:4px;">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
            html += profileLink(req.fromId, avatarThumb(accAvatar) + '<span style="font-size:11px;color:var(--text);">' + escHtml(req.fromName || req.fromId) + '</span>');
            html += '<span style="font-size:9px;color:var(--text-dim);">requesting task access</span>';
            html += '</div>';
            // Show project checkboxes for granting
            var projects = state.projects || [];
            html += '<div style="font-size:9px;color:var(--text-dim);margin-bottom:4px;">Grant access to:</div>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">';
            projects.forEach(function(p) {
              html += '<label style="font-size:10px;color:var(--text);display:flex;align-items:center;gap:3px;cursor:pointer;background:var(--surface2);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">';
              html += '<input type="checkbox" class="access-grant-cb" data-pid="' + escHtml(p.id) + '" style="accent-color:#4ecdc4;" />';
              html += escHtml(p.name) + '</label>';
            });
            html += '</div>';
            html += '<div style="display:flex;gap:4px;">';
            html += '<button class="btn btn-small access-grant-btn" data-msgid="' + escHtml(req._id) + '" data-fid="' + escHtml(req.fromId) + '" data-fname="' + escHtml(req.fromName || '') + '" style="border-color:#4ecdc4;color:#4ecdc4;font-size:7px;padding:2px 8px;">GRANT ACCESS</button>';
            html += '<button class="btn btn-small access-deny-btn" data-msgid="' + escHtml(req._id) + '" style="border-color:#ff4444;color:#ff4444;font-size:7px;padding:2px 8px;">DENY</button>';
            html += '</div>';
            html += '</div>';
          });
          accessRequestsList.innerHTML = html;

          // Grant access handler
          accessRequestsList.querySelectorAll('.access-grant-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var msgId = btn.getAttribute('data-msgid');
              var fid = btn.getAttribute('data-fid');
              var fname = btn.getAttribute('data-fname');
              if (!fid) return;
              // Collect checked projects from the same card
              var card = btn.closest('div[style*="border:1px solid #4ecdc4"]') || btn.parentElement.parentElement;
              var checkedProjects = [];
              card.querySelectorAll('.access-grant-cb:checked').forEach(function(cb) {
                checkedProjects.push(cb.getAttribute('data-pid'));
              });
              if (checkedProjects.length === 0) {
                notify('Check at least one project to grant access.', '#ff9f43');
                return;
              }
              // Ensure friend entry exists
              if (!state.friends[fid]) {
                state.friends[fid] = {
                  displayName: _sanitizeName(fname) || fid,
                  status: 'accepted',
                  taskAccessGranted: true,
                  permittedProjects: checkedProjects,
                  addedAt: new Date().toISOString()
                };
              } else {
                state.friends[fid].taskAccessGranted = true;
                state.friends[fid].permittedProjects = checkedProjects;
              }
              save();
              try { window.ProfileSync.deleteInboxMessage(state.profileId, msgId); } catch(_) {}
              // v3.23.78: Persist with retry, THEN notify the friend (not before)
              var _grantWriteDone = false;
              var _grantFid = fid;
              var _grantProjects = checkedProjects.slice();
              function _writeGrantSocial() {
                try {
                  window.ProfileSync.putSocialData(state.profileId, { friends: state.friends })
                    .then(function() {
                      _grantWriteDone = true;
                      // Only send notification AFTER write succeeds
                      try {
                        window.ProfileSync.sendInboxMessage(_grantFid, {
                          type: 'access_granted',
                          fromId: state.profileId,
                          fromName: state.displayName || 'A weaver',
                          projects: _grantProjects,
                          createdAt: new Date().toISOString()
                        });
                      } catch(_) {}
                    })
                    .catch(function() {
                      if (!_grantWriteDone) setTimeout(_writeGrantSocial, 5000);
                    });
                } catch(_) {
                  if (!_grantWriteDone) setTimeout(_writeGrantSocial, 5000);
                }
              }
              _writeGrantSocial();
              notify('Granted task access to ' + (fname || fid), '#4ecdc4');
              renderFriends();
              pollInbox();
            });
          });

          // Deny handler
          accessRequestsList.querySelectorAll('.access-deny-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var msgId = btn.getAttribute('data-msgid');
              try { window.ProfileSync.deleteInboxMessage(state.profileId, msgId); } catch(_) {}
              notify('Access request denied.', '#ff4444');
              pollInbox();
            });
          });
        }

        // Update badge count
        function updateBadge(friendReqCount, accessReqCount) {
          var total = friendReqCount + accessReqCount;
          if (friendInboxBadge) {
            if (total > 0) {
              friendInboxBadge.style.display = 'inline';
              friendInboxBadge.textContent = total;
            } else {
              friendInboxBadge.style.display = 'none';
            }
          }
        }

        // Poll inbox for friend requests, access requests, and remote tasks
        function pollInbox() {
          if (!state.profileId) return;
          try {
            window.ProfileSync.getInbox(state.profileId).then(function(messages) {
              if (!messages || !messages.length) {
                renderRequests([]);
                renderAccessRequests([]);
                updateBadge(0, 0);
                return;
              }
              var friendReqs = [];
              var accessReqs = [];
              var tasks = [];
              var acceptNotices = [];
              var accessGrantNotices = [];
              messages.forEach(function(msg) {
                if (msg.type === 'friend_request') {
                  var existingFriend = state.friends[msg.fromId];
                  if (existingFriend && (existingFriend.status === 'accepted' || existingFriend.status === 'declined')) {
                    // Already accepted or declined — auto-clean
                    try { window.ProfileSync.deleteInboxMessage(state.profileId, msg._id); } catch(_) {}
                  } else {
                    // v3.23.65: Dedup — only keep one request per person, delete extras
                    var alreadyHave = friendReqs.some(function(r) { return r.fromId === msg.fromId; });
                    if (alreadyHave) {
                      try { window.ProfileSync.deleteInboxMessage(state.profileId, msg._id); } catch(_) {}
                    } else {
                      friendReqs.push(msg);
                    }
                  }
                } else if (msg.type === 'access_request') {
                  // v3.23.70: Show access requests from accepted friends.
                  // If not yet friends, keep the message (don't delete) — it may
                  // be valid once the friends list restores from cloud.
                  if (state.friends[msg.fromId] && state.friends[msg.fromId].status === 'accepted') {
                    var alreadyHaveAccess = accessReqs.some(function(r) { return r.fromId === msg.fromId; });
                    if (alreadyHaveAccess) {
                      try { window.ProfileSync.deleteInboxMessage(state.profileId, msg._id); } catch(_) {}
                    } else {
                      accessReqs.push(msg);
                    }
                  }
                } else if (msg.type === 'task') {
                  tasks.push(msg);
                } else if (msg.type === 'friend_accepted') {
                  acceptNotices.push(msg);
                } else if (msg.type === 'access_granted') {
                  accessGrantNotices.push(msg);
                }
              });

              // Process acceptance notices
              acceptNotices.forEach(function(notice) {
                if (!state.friends[notice.fromId]) {
                  state.friends[notice.fromId] = {
                    displayName: _sanitizeName(notice.fromName) || notice.fromId,
                    status: 'accepted',
                    taskAccessGranted: false,
                    permittedProjects: [],
                    addedAt: new Date().toISOString()
                  };
                }
                fetchFriendAvatar(notice.fromId); // v3.23.64
                notify(escHtml(notice.fromName || notice.fromId) + ' accepted your friend request!', '#00ff88');
                try { window.ProfileSync.deleteInboxMessage(state.profileId, notice._id); } catch(_) {}
                // v3.23.78: Persist with retry (was bare try/catch before)
                _retrySocialWrite();
              });

              // Process access-granted notices
              accessGrantNotices.forEach(function(notice) {
                notify(escHtml(notice.fromName || notice.fromId) + ' granted you task access!', '#4ecdc4');
                try { window.ProfileSync.deleteInboxMessage(state.profileId, notice._id); } catch(_) {}
                // v3.23.78: Persist with retry
                _retrySocialWrite();
              });

              // Process remote tasks
              tasks.forEach(function(t) {
                var projectId = t.project;
                var friend = state.friends[t.fromId];
                if (!friend || friend.status !== 'accepted' || !friend.taskAccessGranted) {
                  try { window.ProfileSync.deleteInboxMessage(state.profileId, t._id); } catch(_) {}
                  return;
                }
                var perms = friend.permittedProjects || [];
                if (perms.indexOf(projectId) === -1) {
                  try { window.ProfileSync.deleteInboxMessage(state.profileId, t._id); } catch(_) {}
                  return;
                }
                if (!state.tasks[projectId]) state.tasks[projectId] = [];
                state.tasks[projectId].push({
                  id: 'remote-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                  text: (t.text || '').substring(0, 200),
                  done: false,
                  createdAt: Date.now(),
                  addedBy: t.fromName || t.fromId
                });
                notify('Task from ' + (t.fromName || t.fromId) + ': ' + (t.text || '').substring(0, 40), '#5aadff');
                try { window.ProfileSync.deleteInboxMessage(state.profileId, t._id); } catch(_) {}
              });

              if (tasks.length > 0 || acceptNotices.length > 0 || accessGrantNotices.length > 0) {
                save();
                render();
              }

              renderRequests(friendReqs);
              renderAccessRequests(accessReqs);
              updateBadge(friendReqs.length, accessReqs.length);
              renderFriends();
            }).catch(function(err) {
              console.warn('[Friends] Inbox poll failed:', err);
            });
          } catch(_) {}
        }

        // Initial render
        renderFriends();

        // v3.23.70: Restore friends from Firestore BEFORE polling inbox
        // Without this, pollInbox may silently delete access requests from
        // friends whose local state was lost.
        function startInboxPolling() {
          setTimeout(pollInbox, 1000);
          setInterval(pollInbox, 30000);
        }
        try {
          if (state.profileId && window.ProfileSync && window.ProfileSync.getSocialData) {
            window.ProfileSync.getSocialData(state.profileId).then(function(social) {
              var cloudFriends = (social && social.friends) ? social.friends : {};
              var localFriends = state.friends || {};
              var localAccepted = Object.keys(localFriends).filter(function(k) { return localFriends[k].status === 'accepted'; });
              var cloudAccepted = Object.keys(cloudFriends).filter(function(k) { return cloudFriends[k].status === 'accepted'; });

              // Case 1: Cloud has friends that local doesn't — restore them
              var changed = false;
              Object.keys(cloudFriends).forEach(function(fid) {
                if (!localFriends[fid] && cloudFriends[fid].status === 'accepted') {
                  localFriends[fid] = cloudFriends[fid];
                  changed = true;
                }
              });
              if (changed) {
                state.friends = localFriends;
                save();
                renderFriends();
                console.log('[Friends] Restored friends from Firestore cloud backup');
              }

              // Case 2: Local has accepted friends but cloud is empty — push to cloud
              if (localAccepted.length > 0 && cloudAccepted.length === 0) {
                console.log('[Friends] Local has ' + localAccepted.length + ' friends but cloud is empty — pushing to Firestore');
                try { window.ProfileSync.putSocialData(state.profileId, { friends: state.friends }); } catch(_) {}
              }

              startInboxPolling();
            }).catch(function(err) {
              console.warn('[Friends] Cloud restore failed:', err);
              startInboxPolling();
            });
          } else {
            startInboxPolling();
          }
        } catch(_) {
          startInboxPolling();
        }
      })();

      // ===== Passive ticks: autoloom + streak coin trickle =====
      // Run once now to catch up any idle accumulation, then on intervals.
      try { tickAutoloom(); } catch (e) {}
      try { tickCoins(); } catch (e) {}
      try { tickLoomAbsence(); } catch (e) {}
      setInterval(function() { try { tickAutoloom(); } catch (e) {} }, 30 * 1000);
      setInterval(function() { try { tickCoins(); } catch (e) {} }, 10 * 1000);

      // v3.23.85: Market engine tick — runs every second while popup is open.
      // Calls MarketEngine.tick(state) and MarketEvents.evaluate(state) to
      // update demand/cost oscillations and milestone-driven modifiers.
      // Only does work when the market is unlocked (marketingLevel >= 1).
      // UI readouts are refreshed via renderMarketCard() after each tick.
      setInterval(function() {
        try {
          if ((state.marketingLevel || 0) < 1) return;
          // Decay bureau market bonus (~0.02 per tick, zeroes out in ~25 seconds from max 0.5)
          if (state.marketBureauBonus > 0) {
            state.marketBureauBonus = Math.max(0, state.marketBureauBonus - 0.02);
          }
          if (typeof MarketEngine !== 'undefined') MarketEngine.tick(state);
          if (typeof MarketEvents !== 'undefined') {
            MarketEvents.evaluate(state);
            // v3.23.86: Push commentary for newly reached market phases
            var freshPhases = MarketEvents.consumeNewPhases(state);
            for (var fp = 0; fp < freshPhases.length; fp++) {
              if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
                MsgLog.push('[MARKET] ' + freshPhases[fp].commentary);
              }
            }
          }
          renderMarketCard();
          // Persist every 5 ticks (~5 seconds) to avoid thrashing storage
          if (state.marketTick % 5 === 0) save();
        } catch (e) {}
      }, 1000);

      // v3.20.0: Angry-machine absence scolder. Fires at most once per
      // escalation tier per absence, so a 5-minute cadence is fine.
      setInterval(function() { try { tickLoomAbsence(); } catch (e) {} }, 5 * 60 * 1000);

      // ===== Stale task check =====
      // Immediately flag any tasks that were already stale when the window
      // opened (e.g. left overnight), then re-check every minute so newly
      // aging tasks surface without requiring a refresh.
      try { checkStaleTasks(); } catch (e) {}
      setInterval(function() { try { checkStaleTasks(); } catch (e) {} }, 60 * 1000);

      setInterval(function() { try { checkStaleTasks(); } catch (e) {} }, 60 * 1000);

      // ===== Ancient task purge prompt =====
      // If there are tasks 2+ days old (and the user hasn't dismissed the
      // prompt in the last 12 hours), show a bulk-delete modal. Run shortly
      // after open so the rest of the UI has time to render, then again
      // every 5 minutes in case the window is left open.
      setTimeout(function() { try { checkAncientTasks(); } catch (e) {} }, 1500);
      setInterval(function() { try { checkAncientTasks(); } catch (e) {} }, 5 * 60 * 1000);

      // ===== 10-minute honor-system check-in =====
      // v3.18.8: The check-in is now strictly lifecycle-scoped to the
      // pomodoro timer. It arms from startTimer() when the timer
      // transitions to 'running', cancels on pause/reset/complete, and
      // does NOT run on any unconditional init-time schedule. This
      // prevents the modal from firing at random while the user is
      // just browsing tasks with no timer running.
      //
      // If the user reloaded with a timer already running (rare — it
      // gets auto-paused on load), scheduleNextWorkCheckIn() is a
      // no-op in that state anyway, so nothing to arm here.

      // ===== First-run intro modal =====
      // The very first time a player opens PixelFocus we show a short
      // introduction framing the game: this is an AI-run textile
      // concern, the factory is listening and contemplating, it has
      // already formed a quiet opinion that you are quite the craftsman
      // and is keen to optimise your humble beginnings. Gated on a
      // single state flag so it never re-fires automatically.
      try {
        if (!state.hasSeenIntro) {
          setTimeout(function() { try { showIntroModal(); } catch (e) {} }, 400);
        }
      } catch (_) {}

      // ===== Catch-up unlock check =====
      // Run the stage-archive unlock check once at init so existing saves
      // that already cleared later thresholds (e.g. a player who was
      // already level 25 when v3.19 shipped) get their retroactive entries
      // unlocked immediately instead of having to wait for the next
      // session reward to trigger the check.
      try { checkTrackerStageUnlocks(); } catch (_) {}

      // INTRO button in the header — lets the player re-read the
      // opening any time after first run. Does not reset the
      // hasSeenIntro flag; this is just a replay, not a re-trigger.
      var showIntroBtn = $('showIntroBtn');
      if (showIntroBtn) {
        showIntroBtn.addEventListener('click', function() {
          try { showIntroModal(); } catch (e) {}
        });
      }


      // ===== Focus-mode toggle (v3.20.26, restored v3.20.30) =====
      // Applies the saved preference on open, then wires the expand button
      // in the tab strip to toggle the `focus-mode` class on <body> and
      // persist the new value. The CSS in popup.html does the actual
      // widening and type-scaling; this just flips the class and the flag.
      try {
        if (state.focusMode) document.body.classList.add('focus-mode');
      } catch (_) {}
      var focusModeBtn = $('focusModeBtn');
      if (focusModeBtn) {
        focusModeBtn.addEventListener('click', function() {
          var on = !document.body.classList.contains('focus-mode');
          document.body.classList.toggle('focus-mode', on);
          state.focusMode = on;
          save();
          try { SFX.click && SFX.click(); } catch (_) {}
          setTimeout(function() { try { renderTabs(); } catch (_) {} }, 220);
          try {
            if (typeof MsgLog !== 'undefined') {
              MsgLog.push(on
                ? 'Focus mode engaged. The tracker widens; the type grows.'
                : 'Focus mode collapsed. Back to popup size.');
            }
          } catch (_) {}
        });
      }

      // ===== Settings modal + Safe Refresh (v3.20.31) =====
      // Gear button in the header opens a small settings sheet. Safe Refresh
      // writes a full snapshot of state to a timestamped JSON file on the
      // user's computer AND mirrors it into chrome.storage.local under
      // 'pixelFocusState_backup', then asks the background service worker
      // to reload the extension. Nothing is lost.
      var settingsBtn = $('settingsBtn');
      var settingsModal = $('settingsModal');
      var settingsModalCloseBtn = $('settingsModalCloseBtn');
      var safeRefreshBtn = $('safeRefreshBtn');
      var safeRefreshStatus = $('safeRefreshStatus');
      var restoreBackupBtn = $('restoreBackupBtn');
      var restoreBackupStatus = $('restoreBackupStatus');
      // v3.21.15: Cold Turkey settings wiring
      var coldTurkeyToggle = $('coldTurkeyToggle');
      var coldTurkeyBlockNameInput = $('coldTurkeyBlockName');
      var coldTurkeyStatus = $('coldTurkeyStatus');
      if (coldTurkeyToggle) {
        coldTurkeyToggle.checked = !!state.coldTurkeyEnabled;
        coldTurkeyToggle.addEventListener('change', function() {
          state.coldTurkeyEnabled = coldTurkeyToggle.checked;
          save();
          if (coldTurkeyStatus) {
            coldTurkeyStatus.textContent = state.coldTurkeyEnabled ? 'Cold Turkey will activate on focus.' : 'Cold Turkey disabled.';
            setTimeout(function() { if (coldTurkeyStatus) coldTurkeyStatus.textContent = ''; }, 3000);
          }
        });
      }
      var coldTurkeyDailyToggle = $('coldTurkeyDailyToggle');
      if (coldTurkeyDailyToggle) {
        coldTurkeyDailyToggle.checked = !!state.coldTurkeyDailyPrompt;
        coldTurkeyDailyToggle.addEventListener('change', function() {
          state.coldTurkeyDailyPrompt = coldTurkeyDailyToggle.checked;
          save();
          if (coldTurkeyStatus) {
            coldTurkeyStatus.textContent = state.coldTurkeyDailyPrompt ? 'Daily prompt enabled.' : 'Daily prompt disabled.';
            setTimeout(function() { if (coldTurkeyStatus) coldTurkeyStatus.textContent = ''; }, 2000);
          }
        });
      }

      var coldTurkeyIdleToggle = $('coldTurkeyIdleToggle');
      if (coldTurkeyIdleToggle) {
        coldTurkeyIdleToggle.checked = !!state.coldTurkeyIdleReminder;
        coldTurkeyIdleToggle.addEventListener('change', function() {
          state.coldTurkeyIdleReminder = coldTurkeyIdleToggle.checked;
          save();
          if (coldTurkeyStatus) {
            coldTurkeyStatus.textContent = state.coldTurkeyIdleReminder ? 'Idle reminder enabled (2h wake hours).' : 'Idle reminder disabled.';
            setTimeout(function() { if (coldTurkeyStatus) coldTurkeyStatus.textContent = ''; }, 3000);
          }
        });
      }

      // v3.22.11: Wind-down Cold Turkey check-in toggle
      var windDownCTToggle = $('windDownCTToggle');
      if (windDownCTToggle) {
        windDownCTToggle.checked = !!state.windDownCTCheckin;
        windDownCTToggle.addEventListener('change', function() {
          state.windDownCTCheckin = windDownCTToggle.checked;
          save();
        });
      }

      // v3.22.11: Test button for wind-down check-in (shows modal without time check)
      var windDownCTTestBtn = $('windDownCTTestBtn');
      if (windDownCTTestBtn) {
        windDownCTTestBtn.addEventListener('click', function() {
          chrome.notifications.create('winddown-ct-test-' + Date.now(), {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Wind-Down Check-In (TEST)',
            message: 'PREVIEW: Cold Turkey opened. When this fires for real, a check-in modal will appear for you to confirm blockers are on.',
            priority: 2
          });
          // Delay CT open so the notification settles first
          setTimeout(function() { try { openColdTurkeyApp(); } catch (_) {} }, 600);
        });
      }

      // v3.22.0: Test button for Cold Turkey idle — preview only, no real challenge
      var coldTurkeyIdleTestBtn = $('coldTurkeyIdleTestBtn');
      if (coldTurkeyIdleTestBtn) {
        coldTurkeyIdleTestBtn.addEventListener('click', function() {
          // Show notification + UI feedback first, THEN open Cold Turkey after a delay
          // so the popup's UI work doesn't steal focus back from CT
          try {
            chrome.notifications.create('ct-idle-test-' + Date.now(), {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Idle Challenge — 1.5x Rewards!',
              message: 'PREVIEW: When this fires for real it will also open the challenge window + Cold Turkey blocker.',
              priority: 2
            });
          } catch (_) {}

          if (coldTurkeyStatus) {
            coldTurkeyStatus.textContent = 'Preview sent. Real trigger opens challenge.html + Cold Turkey.';
            coldTurkeyStatus.style.color = '#ff9f43';
            setTimeout(function() { if (coldTurkeyStatus) coldTurkeyStatus.textContent = ''; }, 4000);
          }

          coldTurkeyIdleTestBtn.textContent = 'SENT!';
          coldTurkeyIdleTestBtn.style.color = '#00ff88';
          coldTurkeyIdleTestBtn.style.borderColor = '#00ff88';
          setTimeout(function() {
            coldTurkeyIdleTestBtn.textContent = 'TEST';
            coldTurkeyIdleTestBtn.style.color = 'var(--accent)';
            coldTurkeyIdleTestBtn.style.borderColor = 'var(--accent)';
          }, 3000);

          // Delay CT open so the popup/notification settle first
          setTimeout(function() { try { openColdTurkeyApp(); } catch (_) {} }, 600);
        });
      }

      // v3.22.90: Challenge window preview button — opens challenge.html?test=1
      // Opens as a popup window (same as the real idle challenge) so you see
      // exactly what the player would see.
      var challengeWindowTestBtn = $('challengeWindowTestBtn');
      if (challengeWindowTestBtn) {
        challengeWindowTestBtn.addEventListener('click', function() {
          // v3.23.3: Set flag so pause/reset confirmation shows during test
          state.penaltyCountdownActive = true; save();
          try {
            var challengeUrl = chrome.runtime.getURL('challenge.html?test=1');
            chrome.windows.create({
              url: challengeUrl,
              type: 'popup',
              width: 520,
              height: 620,
              focused: true,
              top: 80,
              left: Math.round((screen.availWidth || 1200) / 2 - 260)
            });
          } catch (_) {}
          challengeWindowTestBtn.textContent = 'OPENED!';
          challengeWindowTestBtn.style.color = '#00ff88';
          challengeWindowTestBtn.style.borderColor = '#00ff88';
          setTimeout(function() {
            challengeWindowTestBtn.textContent = 'TEST';
            challengeWindowTestBtn.style.color = '#ff8c3a';
            challengeWindowTestBtn.style.borderColor = '#ff8c3a';
          }, 3000);
        });
      }

      // v3.23.0: Promise timer preview — opens challenge.html?test=1&promise=1
      // Auto-accepts the challenge so you skip straight to the promise timer phase.
      var promiseTimerTestBtn = $('promiseTimerTestBtn');
      if (promiseTimerTestBtn) {
        promiseTimerTestBtn.addEventListener('click', function() {
          state.penaltyCountdownActive = true; save();
          try {
            var promiseUrl = chrome.runtime.getURL('challenge.html?test=1&promise=1');
            chrome.windows.create({
              url: promiseUrl,
              type: 'popup',
              width: 520,
              height: 620,
              focused: true,
              top: 80,
              left: Math.round((screen.availWidth || 1200) / 2 - 260)
            });
          } catch (_) {}
          promiseTimerTestBtn.textContent = 'OPENED!';
          promiseTimerTestBtn.style.color = '#ffd700';
          promiseTimerTestBtn.style.borderColor = '#ffd700';
          setTimeout(function() {
            promiseTimerTestBtn.textContent = 'TEST';
            promiseTimerTestBtn.style.color = '#00ff88';
            promiseTimerTestBtn.style.borderColor = '#00ff88';
          }, 3000);
        });
      }

      // v3.22.93: Penalty timer preview button — opens penalty-timer.html?test=1
      var penaltyTimerTestBtn = $('penaltyTimerTestBtn');
      if (penaltyTimerTestBtn) {
        penaltyTimerTestBtn.addEventListener('click', function() {
          state.penaltyCountdownActive = true; save();
          try {
            var penaltyUrl = chrome.runtime.getURL('penalty-timer.html?test=1');
            chrome.windows.create({
              url: penaltyUrl,
              type: 'popup',
              width: 380,
              height: 300,
              focused: true,
              top: 80,
              left: Math.round((screen.availWidth || 1200) - 420)
            });
          } catch (_) {}
          penaltyTimerTestBtn.textContent = 'OPENED!';
          penaltyTimerTestBtn.style.color = '#ffd700';
          penaltyTimerTestBtn.style.borderColor = '#ffd700';
          setTimeout(function() {
            penaltyTimerTestBtn.textContent = 'TEST';
            penaltyTimerTestBtn.style.color = '#ff4466';
            penaltyTimerTestBtn.style.borderColor = '#ff4466';
          }, 3000);
        });
      }

      if (coldTurkeyBlockNameInput) {
        coldTurkeyBlockNameInput.value = state.coldTurkeyBlockName || '';
        coldTurkeyBlockNameInput.addEventListener('change', function() {
          state.coldTurkeyBlockName = coldTurkeyBlockNameInput.value.trim();
          save();
          if (coldTurkeyStatus) {
            coldTurkeyStatus.textContent = 'Block name saved.';
            setTimeout(function() { if (coldTurkeyStatus) coldTurkeyStatus.textContent = ''; }, 2000);
          }
        });
      }

      // v3.23.19: Distraction watchlist on/off toggle
      var siteNagToggle = $('siteNagToggle');
      var siteNagToggleLabel = $('siteNagToggleLabel');
      if (siteNagToggle) {
        // Default to ON if never set
        if (typeof state.siteNagEnabled === 'undefined') state.siteNagEnabled = true;
        siteNagToggle.checked = state.siteNagEnabled;
        siteNagToggleLabel.textContent = state.siteNagEnabled ? 'ON' : 'OFF';
        siteNagToggleLabel.style.color = state.siteNagEnabled ? '#4ecdc4' : '#5a5a7e';
        siteNagToggle.addEventListener('change', function() {
          state.siteNagEnabled = siteNagToggle.checked;
          siteNagToggleLabel.textContent = state.siteNagEnabled ? 'ON' : 'OFF';
          siteNagToggleLabel.style.color = state.siteNagEnabled ? '#4ecdc4' : '#5a5a7e';
          save();
        });
      }

      // v3.21.56: Nag sites list — distraction watchlist
      var nagSitesList = $('nagSitesList');
      var nagSiteInput = $('nagSiteInput');
      var nagSiteAddBtn = $('nagSiteAddBtn');

      function renderNagSites() {
        if (!nagSitesList) return;
        var sites = state.coldTurkeyNagSites || [];
        if (sites.length === 0) {
          nagSitesList.innerHTML = '<div style="font-family:\'Courier New\',monospace;font-size:10px;color:var(--text-dim);font-style:italic;text-align:center;padding:6px 0;">No sites added yet.</div>';
          return;
        }
        var html = '';
        for (var i = 0; i < sites.length; i++) {
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;margin-bottom:3px;background:rgba(78,205,196,0.06);border:1px solid rgba(78,205,196,0.15);border-radius:4px;">'
            + '<span style="font-family:\'Courier New\',monospace;font-size:11px;color:var(--text);">' + escapeHtml(sites[i]) + '</span>'
            + '<button type="button" data-nag-remove="' + i + '" style="background:transparent;border:none;color:#ff6b6b;font-family:\'Press Start 2P\',monospace;font-size:8px;cursor:pointer;padding:2px 6px;" title="Remove this site from the watchlist.">\u2715</button>'
            + '</div>';
        }
        nagSitesList.innerHTML = html;
        // Wire remove buttons
        var removeBtns = nagSitesList.querySelectorAll('[data-nag-remove]');
        for (var j = 0; j < removeBtns.length; j++) {
          removeBtns[j].addEventListener('click', function() {
            var idx = parseInt(this.getAttribute('data-nag-remove'), 10);
            if (!isNaN(idx) && state.coldTurkeyNagSites && idx < state.coldTurkeyNagSites.length) {
              state.coldTurkeyNagSites.splice(idx, 1);
              save();
              renderNagSites();
            }
          });
        }
      }

      function addNagSite() {
        if (!nagSiteInput) return;
        var raw = nagSiteInput.value.trim().toLowerCase();
        if (!raw) return;
        // Split on newlines, commas, or whitespace — handles pasted URL lists
        var entries = raw.split(/[\n\r,]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
        if (!state.coldTurkeyNagSites) state.coldTurkeyNagSites = [];
        var added = 0;
        for (var i = 0; i < entries.length; i++) {
          // Strip protocol, www, path — just keep the domain
          var domain = entries[i]
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .replace(/\s+/g, '');
          if (domain && domain.indexOf('.') !== -1 && state.coldTurkeyNagSites.indexOf(domain) === -1) {
            state.coldTurkeyNagSites.push(domain);
            added++;
          }
        }
        if (added > 0) {
          save();
          renderNagSites();
          // v3.21.60: Ensure background alarm exists (no reload needed)
          try { chrome.runtime.sendMessage({ type: 'ENSURE_SITE_NAG_ALARM' }); } catch (_) {}
        }
        nagSiteInput.value = '';
        if (added > 0) {
          var statusEl = $('coldTurkeyStatus');
          if (statusEl) {
            statusEl.style.color = '#4ecdc4';
            statusEl.textContent = added + ' site' + (added === 1 ? '' : 's') + ' added to watchlist.';
            setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 3000);
          }
        }
      }

      if (nagSiteAddBtn) nagSiteAddBtn.addEventListener('click', addNagSite);
      if (nagSiteInput) nagSiteInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); addNagSite(); }
      });
      renderNagSites();

      // v3.21.78: Opening the todo list = acknowledgment → reset nag counter
      if (state.siteNagUnackedCount > 0) {
        state.siteNagUnackedCount = 0;
        save();
      }

      // v3.21.60: Ensure alarm on load if watchlist has entries
      if (state.coldTurkeyNagSites && state.coldTurkeyNagSites.length > 0) {
        try { chrome.runtime.sendMessage({ type: 'ENSURE_SITE_NAG_ALARM' }); } catch (_) {}
      }

      // v3.21.60: Test Nag button — fires a one-shot check against active tab
      // v3.21.64: Export watchlist to clipboard for syncing across browsers
      var nagExportBtn = $('nagExportBtn');
      if (nagExportBtn) {
        nagExportBtn.addEventListener('click', function() {
          var statusEl = $('coldTurkeyStatus');
          var sites = state.coldTurkeyNagSites || [];
          if (!sites.length) {
            if (statusEl) { statusEl.style.color = '#ff9f43'; statusEl.textContent = 'Nothing to export — watchlist is empty.'; }
            setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 3000);
            return;
          }
          var text = sites.join('\n');
          navigator.clipboard.writeText(text).then(function() {
            if (statusEl) { statusEl.style.color = '#00ff88'; statusEl.textContent = '\u2714 ' + sites.length + ' site(s) copied! Paste into the other browser\'s watchlist and click ADD SITES.'; }
            setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 5000);
          }).catch(function() {
            if (statusEl) { statusEl.style.color = '#ff4757'; statusEl.textContent = 'Copy failed. Try selecting and copying manually.'; }
          });
        });
      }

      var nagTestBtn = $('nagTestBtn');
      if (nagTestBtn) {
        nagTestBtn.addEventListener('click', function() {
          var statusEl = $('coldTurkeyStatus');
          nagTestBtn.disabled = true;
          nagTestBtn.textContent = 'TESTING...';
          try {
            chrome.runtime.sendMessage({ type: 'TEST_SITE_NAG' }, function(resp) {
              nagTestBtn.disabled = false;
              nagTestBtn.textContent = 'TEST NAG';
              if (!resp) {
                if (statusEl) { statusEl.style.color = '#ff4757'; statusEl.textContent = 'Test failed — background not responding. Reload extension from chrome://extensions.'; }
                return;
              }
              if (resp.ok) {
                if (statusEl) { statusEl.style.color = '#00ff88'; statusEl.textContent = '\u2714 Match! Detected "' + resp.matched + '" — notification sent.'; }
              } else if (resp.reason === 'no-sites') {
                if (statusEl) { statusEl.style.color = '#ff9f43'; statusEl.textContent = 'No sites in watchlist. Add some first!'; }
              } else if (resp.reason === 'no-match') {
                var trunc = resp.url.length > 60 ? resp.url.substring(0, 60) + '...' : resp.url;
                if (statusEl) { statusEl.style.color = '#ff9f43'; statusEl.textContent = 'No match. Active tab: ' + trunc + '\nWatchlist: ' + resp.sites.join(', '); }
              } else if (resp.reason === 'no-active-tab') {
                if (statusEl) { statusEl.style.color = '#ff4757'; statusEl.textContent = 'Could not read active tab. Try focusing a browser tab first.'; }
              }
              setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 8000);
            });
          } catch (e) {
            nagTestBtn.disabled = false;
            nagTestBtn.textContent = 'TEST NAG';
            if (statusEl) { statusEl.style.color = '#ff4757'; statusEl.textContent = 'Error: ' + e.message; }
          }
        });
      }

      // v3.21.63: Multi-browser install guide toggle + copy path
      var multiBrowserToggle = $('multiBrowserToggle');
      var multiBrowserGuide = $('multiBrowserGuide');
      if (multiBrowserToggle && multiBrowserGuide) {
        multiBrowserToggle.addEventListener('click', function() {
          var showing = multiBrowserGuide.style.display !== 'none';
          multiBrowserGuide.style.display = showing ? 'none' : 'block';
          multiBrowserToggle.innerHTML = (showing ? '&#9660;' : '&#9650;') + ' MULTI-BROWSER INSTALL GUIDE';
        });
      }
      var copyExtPathBtn = $('copyExtPathBtn');
      if (copyExtPathBtn) {
        copyExtPathBtn.addEventListener('click', function() {
          try {
            // chrome.runtime.getURL('') gives us the extension's root URL;
            // the actual folder path isn't directly available, but we can
            // guide users. We'll get the extension ID and construct the
            // typical path, or use a known technique.
            var extUrl = chrome.runtime.getURL('');
            var extId = chrome.runtime.id || '';
            // Construct a message the user can use
            var statusEl = $('copyExtPathStatus');

            // Try to detect browser and show the likely path
            var ua = navigator.userAgent || '';
            var browser = 'Chrome';
            var profileFolder = 'Default';
            if (ua.indexOf('Brave') !== -1) browser = 'Brave-Browser';
            else if (ua.indexOf('Edg/') !== -1) browser = 'Edge';
            else if (ua.indexOf('OPR/') !== -1 || ua.indexOf('Opera') !== -1) browser = 'Opera';
            else if (ua.indexOf('Vivaldi') !== -1) browser = 'Vivaldi';

            // The extension folder for unpacked extensions is wherever the
            // user originally loaded it from — not the browser profile.
            // We'll provide the getURL approach instead: have them find it
            // through the extensions page.
            var infoText = 'Extension ID: ' + extId + '\n\n'
              + 'To find the extension folder:\n'
              + '1. Go to your extensions page (e.g. brave://extensions)\n'
              + '2. Enable Developer Mode (top right toggle)\n'
              + '3. Find "Todo of the Loom" in the list\n'
              + '4. The folder path is shown under the extension name\n'
              + '5. Copy that path and use it in the other browser\n\n'
              + 'Or look at the source path shown below:';

            // For unpacked extensions, the manifest URL reveals the folder
            var manifestUrl = chrome.runtime.getURL('manifest.json');
            // This gives something like: chrome-extension://XXXX/manifest.json
            // Not helpful as a file path. But the extensions page shows it.

            // Best approach: copy the extension ID so the user can spot it
            // on the extensions page, and also provide the extensions page URL
            navigator.clipboard.writeText(extId).then(function() {
              if (statusEl) {
                statusEl.style.color = '#00ff88';
                statusEl.innerHTML = '\u2713 Extension ID copied: <span style="color:#ff9f43;">' + extId + '</span><br>Go to your extensions page — the folder path is shown under the extension name.';
              }
              setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 10000);
            }).catch(function() {
              if (statusEl) {
                statusEl.style.color = '#ff9f43';
                statusEl.innerHTML = 'Extension ID: <span style="color:var(--text);">' + extId + '</span><br>Go to your extensions page to find the folder path.';
              }
            });
          } catch (e) {
            var statusEl2 = $('copyExtPathStatus');
            if (statusEl2) { statusEl2.style.color = '#ff4757'; statusEl2.textContent = 'Error: ' + e.message; }
          }
        });
      }

      // v3.21.65: Link browsers — show profile code, copy, apply link
      var linkProfileCode = $('linkProfileCode');
      var linkCopyCodeBtn = $('linkCopyCodeBtn');
      var linkCodeInput = $('linkCodeInput');
      var linkApplyBtn = $('linkApplyBtn');
      var linkStatus = $('linkStatus');

      // Show current profile code
      if (linkProfileCode && state.profileId) {
        linkProfileCode.textContent = state.profileId;
      }

      // Copy code
      if (linkCopyCodeBtn) {
        linkCopyCodeBtn.addEventListener('click', function() {
          var code = state.profileId || '';
          if (!code) {
            if (linkStatus) { linkStatus.style.color = '#ff4757'; linkStatus.textContent = 'No profile ID yet. Complete a focus session first to generate one.'; }
            return;
          }
          navigator.clipboard.writeText(code).then(function() {
            linkCopyCodeBtn.textContent = '\u2713';
            setTimeout(function() { linkCopyCodeBtn.textContent = 'COPY'; }, 2000);
          }).catch(function() {});
        });
      }

      // v3.21.68: Force push — immediately push all stats to Firestore (bypasses throttle)
      var linkForcePushBtn = $('linkForcePushBtn');
      var linkPushStatus = $('linkPushStatus');
      if (linkForcePushBtn) {
        linkForcePushBtn.addEventListener('click', function() {
          if (state.mirrorMode) {
            if (linkPushStatus) { linkPushStatus.style.color = '#ff9f43'; linkPushStatus.textContent = 'This browser is in mirror mode — it pulls from the main browser, not pushes. Use PUSH NOW on the main browser.'; }
            return;
          }
          if (!state.profileId) {
            if (linkPushStatus) { linkPushStatus.style.color = '#ff4757'; linkPushStatus.textContent = 'No profile ID.'; }
            return;
          }
          linkForcePushBtn.disabled = true;
          linkForcePushBtn.textContent = '...';
          if (linkPushStatus) { linkPushStatus.style.color = '#5a5a7e'; linkPushStatus.textContent = 'Pushing to Firestore...'; }

          // Temporarily clear the throttle so sync goes through
          if (window.ProfileSync && window.ProfileSync._resetThrottle) {
            window.ProfileSync._resetThrottle();
          }
          if (window.ProfileSync && window.ProfileSync.sync) {
            window.ProfileSync.sync(state).then(function(result) {
              linkForcePushBtn.disabled = false;
              linkForcePushBtn.textContent = 'PUSH NOW';
              if (result) {
                if (linkPushStatus) { linkPushStatus.style.color = '#00ff88'; linkPushStatus.textContent = '\u2714 Pushed! Profile + shared data uploaded. Other browsers can now pull.'; }
              } else {
                if (linkPushStatus) { linkPushStatus.style.color = '#ff9f43'; linkPushStatus.textContent = 'Sync returned null — may have been throttled. Try again in a minute.'; }
              }
              setTimeout(function() { if (linkPushStatus) linkPushStatus.textContent = ''; }, 6000);
            }).catch(function(err) {
              linkForcePushBtn.disabled = false;
              linkForcePushBtn.textContent = 'PUSH NOW';
              if (linkPushStatus) { linkPushStatus.style.color = '#ff4757'; linkPushStatus.textContent = 'Push failed: ' + err.message; }
            });
          }
        });
      }

      // Apply link — adopt another profile's ID
      if (linkApplyBtn) {
        linkApplyBtn.addEventListener('click', function() {
          var code = (linkCodeInput.value || '').trim().toLowerCase();
          if (!code) {
            if (linkStatus) { linkStatus.style.color = '#ff9f43'; linkStatus.textContent = 'Paste a profile code first.'; }
            return;
          }
          if (code.length < 6 || code.length > 20) {
            if (linkStatus) { linkStatus.style.color = '#ff4757'; linkStatus.textContent = 'Invalid code length. Should be ~12 characters.'; }
            return;
          }
          if (code === state.profileId && state.mirrorMode) {
            if (linkStatus) { linkStatus.style.color = '#ff9f43'; linkStatus.textContent = 'Already linked and mirroring this profile!'; }
            return;
          }

          var oldId = state.profileId;
          linkApplyBtn.disabled = true;
          linkApplyBtn.textContent = '...';
          if (linkStatus) { linkStatus.style.color = '#5a5a7e'; linkStatus.textContent = 'Linking and pulling shared data...'; }

          // Adopt the new profile ID + enable mirror mode
          state.profileId = code;
          state.mirrorMode = true;
          save();

          // Update displayed code
          if (linkProfileCode) linkProfileCode.textContent = code;

          // Pull shared config from Firestore immediately — full mirror
          if (window.ProfileSync && window.ProfileSync.pullShared) {
            window.ProfileSync.pullShared(code).then(function(config) {
              linkApplyBtn.disabled = false;
              linkApplyBtn.textContent = 'LINK';
              if (config) {
                // Merge watchlist
                if (config.nagSites && Array.isArray(config.nagSites)) {
                  var local = state.coldTurkeyNagSites || [];
                  var merged = local.slice();
                  var added = 0;
                  for (var i = 0; i < config.nagSites.length; i++) {
                    if (merged.indexOf(config.nagSites[i]) === -1) {
                      merged.push(config.nagSites[i]);
                      added++;
                    }
                  }
                  state.coldTurkeyNagSites = merged;
                }
                // Mirror all stats
                var mirrorKeys = [
                  'xp', 'streak', 'longestStreak', 'realStreak', 'longestRealStreak', 'totalLifetimeBlocks',
                  'lifetimeFocusMinutes', 'tasksCompletedLifetime', 'coins',
                  'lifetimeCoins', 'combo', 'maxCombo', 'maxComboToday',
                  'blocks', 'todayBlocks', 'todayXP', 'sessionBlocks', 'displayName',
                  'tagline', 'lastActiveDate', 'dailyTaskLog', 'dailySessionLog',
                  'focusHistory'
                ];
                for (var k = 0; k < mirrorKeys.length; k++) {
                  var key = mirrorKeys[k];
                  if (config[key] !== undefined && config[key] !== null) {
                    state[key] = config[key];
                  }
                }
                state.level = getLevelFromXP(state.xp || 0).level;
                save();
                renderNagSites();
                render();
                if (linkStatus) {
                  linkStatus.style.color = '#00ff88';
                  linkStatus.textContent = '\u2714 Linked & mirrored! Profile: ' + code + ' — all stats synced from ' + (config.updatedBy || 'remote') + '.';
                }
              } else {
                save();
                if (linkStatus) { linkStatus.style.color = '#00ff88'; linkStatus.textContent = '\u2714 Linked to profile ' + code + '. No shared data yet — will sync when main browser pushes.'; }
              }
              setTimeout(function() { if (linkStatus) linkStatus.textContent = ''; }, 8000);
            }).catch(function(err) {
              linkApplyBtn.disabled = false;
              linkApplyBtn.textContent = 'LINK';
              if (linkStatus) { linkStatus.style.color = '#ff9f43'; linkStatus.textContent = 'Linked to ' + code + ' but pull failed: ' + err.message + '. Will sync on next cycle.'; }
            });
          } else {
            linkApplyBtn.disabled = false;
            linkApplyBtn.textContent = 'LINK';
            if (linkStatus) { linkStatus.style.color = '#00ff88'; linkStatus.textContent = '\u2714 Linked to profile ' + code + '. Shared data will sync on next update.'; }
          }
        });
      }

      // v3.21.66: Test Link button — pulls from Firestore and reports status
      var linkTestBtn = $('linkTestBtn');
      var linkTestResult = $('linkTestResult');
      if (linkTestBtn) {
        linkTestBtn.addEventListener('click', function() {
          linkTestBtn.disabled = true;
          linkTestBtn.textContent = 'TESTING...';
          if (linkTestResult) { linkTestResult.style.color = '#5a5a7e'; linkTestResult.textContent = 'Connecting to Firestore...'; }

          var pid = state.profileId;
          if (!pid) {
            linkTestBtn.disabled = false;
            linkTestBtn.textContent = 'TEST LINK';
            if (linkTestResult) { linkTestResult.style.color = '#ff4757'; linkTestResult.textContent = '\u2718 No profile ID set. Complete a focus session or link to another browser first.'; }
            return;
          }

          if (!window.ProfileSync || !window.ProfileSync.pullShared) {
            linkTestBtn.disabled = false;
            linkTestBtn.textContent = 'TEST LINK';
            if (linkTestResult) { linkTestResult.style.color = '#ff4757'; linkTestResult.textContent = '\u2718 ProfileSync not loaded.'; }
            return;
          }

          window.ProfileSync.pullShared(pid).then(function(config) {
            linkTestBtn.disabled = false;
            linkTestBtn.textContent = 'TEST LINK';
            if (!config) {
              if (linkTestResult) {
                linkTestResult.style.color = '#ff9f43';
                linkTestResult.innerHTML = '\u26A0 Profile <b>' + pid + '</b> exists but no shared data found yet.<br>This browser may not have synced yet. Try completing a focus session or waiting a minute.';
              }
              return;
            }
            var siteCount = (config.nagSites && config.nagSites.length) || 0;
            var updatedBy = config.updatedBy || 'unknown';
            var updatedAt = config.updatedAt || 'never';
            // Format the timestamp nicely
            var timeStr = '';
            try {
              var d = new Date(updatedAt);
              var hh = d.getHours(), mm = d.getMinutes();
              timeStr = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
            } catch (_) { timeStr = updatedAt; }

            var localCount = (state.coldTurkeyNagSites || []).length;
            var inSync = localCount === siteCount;

            // v3.21.68: Show full mirror stats in test
            var remoteXP = config.xp;
            var hasStats = remoteXP !== undefined && remoteXP !== null;
            var localXP = state.xp || 0;
            var mirrorOn = state.mirrorMode ? 'YES' : 'NO';

            if (linkTestResult) {
              linkTestResult.style.color = '#00ff88';
              linkTestResult.innerHTML = '\u2714 <b>Connected!</b><br>'
                + 'Profile: <span style="color:#ff9f43;">' + pid + '</span><br>'
                + 'Mirror mode: <b>' + mirrorOn + '</b><br>'
                + 'Shared watchlist: <b>' + siteCount + '</b> site(s)<br>'
                + 'Local watchlist: <b>' + localCount + '</b> site(s) '
                + (inSync ? '<span style="color:#00ff88;">(in sync)</span>' : '<span style="color:#ff9f43;">(not synced yet)</span>') + '<br>'
                + (hasStats
                  ? 'Remote XP: <b>' + remoteXP + '</b> | Local XP: <b>' + localXP + '</b><br>'
                    + 'Remote streak: <b>' + (config.streak || 0) + '</b> | Remote coins: <b>' + (config.coins || 0) + '</b><br>'
                  : '<span style="color:#ff9f43;">No stats in shared data — main browser needs to PUSH NOW first.</span><br>')
                + 'Last pushed by: <span style="color:#4ecdc4;">' + updatedBy + '</span> at ' + timeStr;
            }
          }).catch(function(err) {
            linkTestBtn.disabled = false;
            linkTestBtn.textContent = 'TEST LINK';
            if (linkTestResult) {
              linkTestResult.style.color = '#ff4757';
              linkTestResult.textContent = '\u2718 Failed to reach Firestore: ' + err.message;
            }
          });
        });
      }

      // v3.21.67: On load, pull shared config from Firestore.
      // Mirror mode: overwrite local stats with remote stats.
      // Non-mirror: just merge watchlist.
      function pullAndMirror() {
        if (!state.profileId || !window.ProfileSync || !window.ProfileSync.pullShared) return;
        window.ProfileSync.pullShared(state.profileId).then(function(config) {
          if (!config) return;

          // Always merge watchlist (union)
          if (config.nagSites && Array.isArray(config.nagSites)) {
            var local = state.coldTurkeyNagSites || [];
            var merged = local.slice();
            var added = 0;
            for (var i = 0; i < config.nagSites.length; i++) {
              if (merged.indexOf(config.nagSites[i]) === -1) {
                merged.push(config.nagSites[i]);
                added++;
              }
            }
            if (added > 0) {
              state.coldTurkeyNagSites = merged;
              console.log('[Mirror] Merged ' + added + ' watchlist site(s).');
            }
          }

          // Mirror mode: overwrite stats with remote data
          if (state.mirrorMode) {
            var mirrorKeys = [
              'xp', 'streak', 'longestStreak', 'realStreak', 'longestRealStreak', 'totalLifetimeBlocks',
              'lifetimeFocusMinutes', 'tasksCompletedLifetime', 'coins',
              'lifetimeCoins', 'combo', 'maxCombo', 'maxComboToday',
              'blocks', 'todayBlocks', 'todayXP', 'sessionBlocks', 'displayName',
              'tagline', 'lastActiveDate', 'dailyTaskLog', 'dailySessionLog',
              'focusHistory'
            ];
            for (var k = 0; k < mirrorKeys.length; k++) {
              var key = mirrorKeys[k];
              if (config[key] !== undefined && config[key] !== null) {
                state[key] = config[key];
              }
            }
            // Recompute level from synced XP
            state.level = getLevelFromXP(state.xp || 0).level;
            console.log('[Mirror] Stats synced from ' + (config.updatedBy || 'remote') + '.');
          }

          save();
          renderNagSites();
          render();
        }).catch(function(err) {
          console.warn('[Mirror] Pull failed:', err);
        });
      }

      // v3.21.71: Auto-detect mirror mode. If this browser has a profile ID
      // but basically no data (no XP, no lifetime blocks), it's not the main
      // browser — enable mirror mode automatically.
      // v3.23.34: Auto-mirror DISABLED to prevent data loss on extension reload
      // if (state.profileId && !state.mirrorMode) {
      //   var hasNoData = (state.xp || 0) === 0 && (state.totalLifetimeBlocks || 0) === 0;
      //   if (hasNoData) {
      //     state.mirrorMode = true;
      //     save();
      //     console.log('[Mirror] Auto-enabled mirror mode — this browser has no local data.');
      //   }
      // }

      // v3.21.74: Apply mirror mode UI — stripped-down read-only view
      if (state.mirrorMode) {
        document.body.classList.add('mirror-mode');
        var mirrorBanner = document.getElementById('mirrorBanner');
        if (mirrorBanner) mirrorBanner.style.display = 'block';
        // Hide elements that don't have unique CSS-targetable classes
        var mirrorHideIds = ['taskInput', 'addTaskBtn', 'loadBundleBtn', 'taskList',
          'dustbin', 'dustBurnRow', 'bundleList', 'bundleCreator', 'newBundleBtn',
          'todayTasksPanel', 'doNowModal', 'coinDisplayRow'];
        for (var _mh = 0; _mh < mirrorHideIds.length; _mh++) {
          var el = document.getElementById(mirrorHideIds[_mh]);
          if (el) el.style.display = 'none';
        }
        // Hide parent containers by walking up from known children
        var taskInput = document.getElementById('taskInput');
        if (taskInput) {
          // Task input area parent (has task list too)
          var p = taskInput.closest ? taskInput.closest('[style*="margin:0 10px"]') : null;
          if (p) p.style.display = 'none';
        }
        var dustbin = document.getElementById('dustbin');
        if (dustbin && dustbin.parentElement) dustbin.parentElement.style.display = 'none';
        // Hide bundles section
        var bundleHeader = document.querySelector('.collapsible-header');
        if (bundleHeader && bundleHeader.parentElement) bundleHeader.parentElement.style.display = 'none';
        // Hide daily reminders panel
        var drPanel = document.getElementById('dailyRemindersPanel');
        if (drPanel) drPanel.style.display = 'none';
        // Hide the daily tasks "today completed" panel
        var todayPanel = document.getElementById('todayTasksPanel');
        if (todayPanel) todayPanel.style.display = 'none';
      }

      // Pull on load after short delay
      // Mirror: pull immediately on load, then again after sync pushes
      if (state.mirrorMode) {
        setTimeout(pullAndMirror, 1500);
      }
      setTimeout(pullAndMirror, 5000);
      // Also pull every 2 minutes to keep mirror fresh
      if (state.mirrorMode) {
        setInterval(pullAndMirror, 2 * 60 * 1000);
      }

      // v3.21.47: Cold Turkey setup guide toggle, test button, copy ID
      var ctSetupToggle = $('ctSetupToggle');
      var ctSetupGuide = $('ctSetupGuide');
      if (ctSetupToggle && ctSetupGuide) {
        ctSetupToggle.addEventListener('click', function() {
          var showing = ctSetupGuide.style.display !== 'none';
          ctSetupGuide.style.display = showing ? 'none' : 'block';
          ctSetupToggle.innerHTML = (showing ? '&#9660;' : '&#9650;') + ' FIRST-TIME SETUP GUIDE';
        });
      }

      var ctCopyIdBtn = $('ctCopyIdBtn');
      if (ctCopyIdBtn) {
        ctCopyIdBtn.addEventListener('click', function() {
          try {
            var extId = chrome.runtime.id || '';
            navigator.clipboard.writeText(extId).then(function() {
              ctCopyIdBtn.textContent = '\u2713 Copied!';
              setTimeout(function() { ctCopyIdBtn.innerHTML = '&#128203; Copy ID'; }, 2000);
            });
          } catch (_) {}
        });
      }

      var ctTestBtn = $('ctTestBtn');
      var ctConnStatus = $('ctConnectionStatus');
      if (ctTestBtn) {
        ctTestBtn.addEventListener('click', function() {
          ctTestBtn.disabled = true;
          ctTestBtn.textContent = 'Testing...';
          try {
            chrome.runtime.sendNativeMessage('com.todooftheloom.coldturkey', {
              action: 'open'
            }, function(response) {
              ctTestBtn.disabled = false;
              ctTestBtn.innerHTML = '&#9889; TEST CONNECTION';
              if (chrome.runtime.lastError) {
                var err = chrome.runtime.lastError.message || 'Unknown error';
                if (ctConnStatus) {
                  ctConnStatus.style.display = 'block';
                  ctConnStatus.style.background = 'rgba(255,68,102,0.1)';
                  ctConnStatus.style.border = '1px solid rgba(255,68,102,0.3)';
                  ctConnStatus.style.color = '#ff6666';
                  ctConnStatus.innerHTML = '<b>&#10060; Not connected.</b><br>' + err + '<br><span style="color:var(--text-dim);">Follow the setup guide below to fix this.</span>';
                }
                // Auto-open the setup guide
                if (ctSetupGuide) {
                  ctSetupGuide.style.display = 'block';
                  if (ctSetupToggle) ctSetupToggle.innerHTML = '&#9650; FIRST-TIME SETUP GUIDE';
                }
              } else {
                if (ctConnStatus) {
                  ctConnStatus.style.display = 'block';
                  ctConnStatus.style.background = 'rgba(0,255,136,0.08)';
                  ctConnStatus.style.border = '1px solid rgba(0,255,136,0.3)';
                  ctConnStatus.style.color = 'var(--accent)';
                  ctConnStatus.innerHTML = '<b>&#9989; Connected!</b> Cold Turkey Blocker opened successfully. You can enable the features below.';
                }
              }
            });
          } catch (err) {
            ctTestBtn.disabled = false;
            ctTestBtn.innerHTML = '&#9889; TEST CONNECTION';
            if (ctConnStatus) {
              ctConnStatus.style.display = 'block';
              ctConnStatus.style.background = 'rgba(255,68,102,0.1)';
              ctConnStatus.style.border = '1px solid rgba(255,68,102,0.3)';
              ctConnStatus.style.color = '#ff6666';
              ctConnStatus.innerHTML = '<b>&#10060; Error:</b> ' + err.message + '<br><span style="color:var(--text-dim);">Follow the setup guide below.</span>';
            }
          }
        });
      }

      // v3.21.25: Daily reminders toggle
      var dailyRemindersToggle = $('dailyRemindersToggle');
      if (dailyRemindersToggle) {
        dailyRemindersToggle.checked = state.dailyRemindersEnabled !== false;
        dailyRemindersToggle.addEventListener('change', function() {
          state.dailyRemindersEnabled = dailyRemindersToggle.checked;
          save();
        });
      }

      // v3.21.31: 24-hour time toggle
      var use24HourToggle = $('use24HourToggle');
      if (use24HourToggle) {
        use24HourToggle.checked = !!state.use24Hour;
        use24HourToggle.addEventListener('change', function() {
          state.use24Hour = use24HourToggle.checked;
          save();
          renderFocusTimeline();
        });
      }

      // v3.21.50: Blur completed tasks on profile
      var blurCompletedToggle = $('blurCompletedToggle');
      if (blurCompletedToggle) {
        blurCompletedToggle.checked = !!state.blurCompletedTasks;
        blurCompletedToggle.addEventListener('change', function() {
          state.blurCompletedTasks = blurCompletedToggle.checked;
          save();
        });
      }

      // v3.21.79: Volume mute scheduler settings
      var volumeMuteEnabled = $('volumeMuteEnabled');
      var volumeMuteHourInput = $('volumeMuteHour');
      var volumeMuteMinInput = $('volumeMuteMinute');
      var volumeUnmuteHourInput = $('volumeUnmuteHour');
      var volumeUnmuteMinInput = $('volumeUnmuteMinute');
      var volumeSaveConfigBtn = $('volumeSaveConfigBtn');
      var volumeInstallInfoBtn = $('volumeInstallInfoBtn');
      var volumeStatusEl = $('volumeStatus');
      var volumeInstallGuide = $('volumeInstallGuide');

      if (volumeMuteEnabled) {
        volumeMuteEnabled.checked = !!state.volumeMuteEnabled;
      }
      if (volumeMuteHourInput) volumeMuteHourInput.value = state.volumeMuteHour != null ? state.volumeMuteHour : 23;
      if (volumeMuteMinInput) volumeMuteMinInput.value = state.volumeMuteMinute != null ? state.volumeMuteMinute : 0;
      if (volumeUnmuteHourInput) volumeUnmuteHourInput.value = state.volumeUnmuteHour != null ? state.volumeUnmuteHour : 10;
      if (volumeUnmuteMinInput) volumeUnmuteMinInput.value = state.volumeUnmuteMinute != null ? state.volumeUnmuteMinute : 0;

      if (volumeMuteEnabled) {
        volumeMuteEnabled.addEventListener('change', function() {
          state.volumeMuteEnabled = volumeMuteEnabled.checked;
          save();
          writeVolumeConfig();
        });
      }

      function writeVolumeConfig(silent) {
        var cfg = {
          muteHour: parseInt(volumeMuteHourInput.value, 10) || 0,
          muteMinute: parseInt(volumeMuteMinInput.value, 10) || 0,
          unmuteHour: parseInt(volumeUnmuteHourInput.value, 10) || 0,
          unmuteMinute: parseInt(volumeUnmuteMinInput.value, 10) || 0,
          enabled: !!state.volumeMuteEnabled
        };
        try {
          chrome.runtime.sendNativeMessage('com.todooftheloom.volume', {
            action: 'writeConfig',
            config: cfg
          }, function(resp) {
            if (chrome.runtime.lastError) {
              if (volumeStatusEl && !silent) {
                volumeStatusEl.style.color = '#ff6b6b';
                volumeStatusEl.textContent = 'Volume host not installed. Run install-volume-host.bat first.';
              }
              return;
            }
            if (resp && resp.ok) {
              if (volumeStatusEl && !silent) {
                volumeStatusEl.style.color = '#00ff88';
                volumeStatusEl.textContent = 'Config saved! Changes take effect within 5 minutes.';
                setTimeout(function() { if (volumeStatusEl) volumeStatusEl.textContent = ''; }, 5000);
              }
            } else {
              if (volumeStatusEl && !silent) {
                volumeStatusEl.style.color = '#ff6b6b';
                volumeStatusEl.textContent = 'Error: ' + ((resp && resp.error) || 'unknown');
              }
            }
          });
        } catch (_) {
          if (volumeStatusEl && !silent) {
            volumeStatusEl.style.color = '#ff6b6b';
            volumeStatusEl.textContent = 'Volume host not installed. Run install-volume-host.bat first.';
          }
        }
      }

      if (volumeSaveConfigBtn) {
        volumeSaveConfigBtn.addEventListener('click', function() {
          state.volumeMuteHour = parseInt(volumeMuteHourInput.value, 10) || 0;
          state.volumeMuteMinute = parseInt(volumeMuteMinInput.value, 10) || 0;
          state.volumeUnmuteHour = parseInt(volumeUnmuteHourInput.value, 10) || 0;
          state.volumeUnmuteMinute = parseInt(volumeUnmuteMinInput.value, 10) || 0;
          save();
          writeVolumeConfig();
        });
      }

      var volumeTestMuteBtn = $('volumeTestMuteBtn');
      if (volumeTestMuteBtn) {
        volumeTestMuteBtn.addEventListener('click', function() {
          if (volumeStatusEl) {
            volumeStatusEl.style.color = '#ff9f43';
            volumeStatusEl.textContent = 'Muting for 5 seconds...';
          }
          volumeTestMuteBtn.disabled = true;
          volumeTestMuteBtn.textContent = 'MUTING...';
          try {
            chrome.runtime.sendNativeMessage('com.todooftheloom.volume', {
              action: 'testMute'
            }, function(resp) {
              volumeTestMuteBtn.disabled = false;
              volumeTestMuteBtn.textContent = 'TEST MUTE';
              if (chrome.runtime.lastError) {
                var errMsg = chrome.runtime.lastError.message || '';
                if (volumeStatusEl) {
                  volumeStatusEl.style.color = '#ff6b6b';
                  if (errMsg.indexOf('not found') !== -1 || errMsg.indexOf('not connected') !== -1) {
                    volumeStatusEl.textContent = 'Volume host not installed. Run setup-volume-host.bat in the extension folder.';
                  } else {
                    volumeStatusEl.textContent = 'Host error: ' + errMsg;
                  }
                }
                return;
              }
              if (resp && resp.ok) {
                if (volumeStatusEl) {
                  volumeStatusEl.style.color = '#00ff88';
                  volumeStatusEl.textContent = 'Test complete! Volume restored.';
                  setTimeout(function() { if (volumeStatusEl) volumeStatusEl.textContent = ''; }, 5000);
                }
              } else {
                if (volumeStatusEl) {
                  volumeStatusEl.style.color = '#ff6b6b';
                  volumeStatusEl.textContent = 'Error: ' + ((resp && resp.error) || 'unknown');
                }
              }
            });
          } catch (_) {
            volumeTestMuteBtn.disabled = false;
            volumeTestMuteBtn.textContent = 'TEST MUTE';
            if (volumeStatusEl) {
              volumeStatusEl.style.color = '#ff6b6b';
              volumeStatusEl.textContent = 'Volume host not installed. Run setup-volume-host.bat in the extension folder.';
            }
          }
        });
      }

      var volumeCheckStatusBtn = $('volumeCheckStatusBtn');
      if (volumeCheckStatusBtn) {
        volumeCheckStatusBtn.addEventListener('click', function() {
          var d = new Date();
          var nowMin = d.getHours() * 60 + d.getMinutes();
          var muteAt = (state.volumeMuteHour != null ? state.volumeMuteHour : 23) * 60 + (state.volumeMuteMinute || 0);
          var unmuteAt = (state.volumeUnmuteHour != null ? state.volumeUnmuteHour : 10) * 60 + (state.volumeUnmuteMinute || 0);

          var shouldMute = false;
          if (muteAt < unmuteAt) {
            shouldMute = (nowMin >= muteAt) && (nowMin < unmuteAt);
          } else {
            shouldMute = (nowMin >= muteAt) || (nowMin < unmuteAt);
          }

          var paused = state.volumeMutePausedUntil && Date.now() < state.volumeMutePausedUntil;
          var enabled = !!state.volumeMuteEnabled;

          var hh = d.getHours(); var mm = d.getMinutes();
          var timeStr = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
          var muteStr = (state.volumeMuteHour != null ? state.volumeMuteHour : 23) + ':' + ((state.volumeMuteMinute || 0) < 10 ? '0' : '') + (state.volumeMuteMinute || 0);
          var unmuteStr = (state.volumeUnmuteHour != null ? state.volumeUnmuteHour : 10) + ':' + ((state.volumeUnmuteMinute || 0) < 10 ? '0' : '') + (state.volumeUnmuteMinute || 0);

          var lines = [];
          lines.push('Current time: ' + timeStr);
          lines.push('Schedule: mute ' + muteStr + ' → unmute ' + unmuteStr);
          lines.push('Enabled: ' + (enabled ? 'YES' : 'NO'));
          if (enabled) {
            if (paused) {
              var resumeAt = new Date(state.volumeMutePausedUntil);
              lines.push('Status: PAUSED (resumes ' + resumeAt.getHours() + ':' + (resumeAt.getMinutes() < 10 ? '0' : '') + resumeAt.getMinutes() + ')');
            } else if (shouldMute) {
              lines.push('Status: MUTE ACTIVE — volume should be at 0');
            } else {
              lines.push('Status: Not in mute period — volume is normal');
            }
          }

          if (volumeStatusEl) {
            volumeStatusEl.style.color = shouldMute && enabled && !paused ? '#ff6b6b' : '#00ff88';
            volumeStatusEl.innerHTML = lines.join('<br>');
          }

          // v3.21.95: If should be muted right now, enforce it
          if (shouldMute && enabled && !paused) {
            try {
              chrome.runtime.sendNativeMessage('com.todooftheloom.volume', {
                action: 'mute'
              }, function(resp) {
                if (chrome.runtime.lastError) {
                  if (volumeStatusEl) {
                    volumeStatusEl.innerHTML += '<br><span style="color:#ff6b6b;">Could not enforce mute — host not connected.</span>';
                  }
                  return;
                }
                if (resp && resp.ok) {
                  if (volumeStatusEl) {
                    volumeStatusEl.innerHTML += '<br><span style="color:#ff9f43;">Mute enforced now.</span>';
                  }
                }
              });
            } catch (_) {}
          }
        });
      }

      if (volumeInstallInfoBtn) {
        volumeInstallInfoBtn.addEventListener('click', function() {
          if (volumeInstallGuide) {
            var showing = volumeInstallGuide.style.display !== 'none';
            volumeInstallGuide.style.display = showing ? 'none' : 'block';
            volumeInstallInfoBtn.innerHTML = (showing ? '&#9660;' : '&#9650;') + ' INSTALL GUIDE';
          }
        });
      }

      // v3.22.7: Sleep time — standalone modal wizard (like blocked-out)
      (function() {
        var sleepModal = $('sleepTimeModal');
        var sleepBody = $('sleepWizBody');
        var sleepSummaryEl = $('sleepWizSummary');
        var sleepBtn = $('sleepTimeBtn');
        var sleepCloseBtn = $('sleepTimeCloseBtn');
        var sleepRemoveBtn = $('sleepRemoveBtn');
        var sleepSaveBtn = $('sleepSaveBtn');

        function openSleepWizard() {
          if (sleepModal) sleepModal.style.display = 'flex';
          _renderSleepModalWiz();
        }
        function closeSleepWizard() {
          if (sleepModal) sleepModal.style.display = 'none';
        }

        function _renderSleepModalWiz() {
          if (!sleepBody) return;
          var html = '';
          var btnStyle = 'background:#1a1a3a;border:1px solid #6b6bff;color:#6b6bff;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:6px 5px;border-radius:4px;cursor:pointer;min-width:38px;text-align:center;';
          var selStyle = 'background:#6b6bff;border:1px solid #6b6bff;color:#fff;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:6px 5px;border-radius:4px;cursor:pointer;min-width:38px;text-align:center;';
          var prepBtnStyle = 'background:#1a1a3a;border:1px solid #9b9bff;color:#9b9bff;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;';
          var prepSelStyle = 'background:#9b9bff;border:1px solid #9b9bff;color:#fff;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;';
          var durBtnStyle = 'background:#1a1a3a;border:1px solid #8b8bff;color:#8b8bff;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;';
          var durSelStyle = 'background:#8b8bff;border:1px solid #8b8bff;color:#fff;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:7px 8px;border-radius:4px;cursor:pointer;min-width:42px;text-align:center;';

          var curH = (state.sleepHour != null) ? state.sleepHour : 23;
          var curM = state.sleepMinute || 0;
          var curP = (state.sleepPrepMin != null) ? state.sleepPrepMin : 30;
          var curD = state.sleepDurMin || 480;

          // Hour picker
          html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">Bedtime hour:</div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">';
          for (var h = 0; h < 24; h++) {
            var label = state.use24Hour ? (h < 10 ? '0' : '') + h + ':00' : _fmtHrFull(h).replace(':00 ', '').replace('AM', 'a').replace('PM', 'p');
            var isSelH = h === curH;
            html += '<button class="slp-hour" data-val="' + h + '" style="' + (isSelH ? selStyle : btnStyle) + '">' + label + '</button>';
          }
          html += '</div>';

          // Minute picker
          html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">Minutes past:</div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;">';
          for (var m = 0; m < 60; m += 5) {
            var lbl = m === 0 ? ':00' : ':' + (m < 10 ? '0' : '') + m;
            var isSelM = m === curM;
            html += '<button class="slp-min" data-val="' + m + '" style="' + (isSelM ? selStyle : btnStyle) + '">' + lbl + '</button>';
          }
          html += '</div>';

          // Duration picker
          html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">How long do you sleep?</div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;">';
          var durOpts = [
            { v: 300, l: '5h' }, { v: 360, l: '6h' }, { v: 390, l: '6.5h' },
            { v: 420, l: '7h' }, { v: 450, l: '7.5h' }, { v: 480, l: '8h' },
            { v: 510, l: '8.5h' }, { v: 540, l: '9h' }, { v: 600, l: '10h' },
            { v: 660, l: '11h' }, { v: 720, l: '12h' }
          ];
          for (var d = 0; d < durOpts.length; d++) {
            var isSelD = durOpts[d].v === curD;
            html += '<button class="slp-dur" data-val="' + durOpts[d].v + '" style="' + (isSelD ? durSelStyle : durBtnStyle) + '">' + durOpts[d].l + '</button>';
          }
          html += '</div>';

          // Wind-down picker
          html += '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;margin-bottom:6px;">Wind-down before bed:</div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
          var prepOpts = [0, 10, 15, 20, 30, 45, 60, 90, 120];
          for (var p = 0; p < prepOpts.length; p++) {
            var v = prepOpts[p];
            var txt = v === 0 ? 'NONE' : v < 60 ? v + 'min' : v === 60 ? '1h' : (v >= 120 ? (v / 60) + 'h' : v + 'min');
            var isSelP = v === curP;
            html += '<button class="slp-prep" data-val="' + v + '" style="' + (isSelP ? prepSelStyle : prepBtnStyle) + '">' + txt + '</button>';
          }
          html += '</div>';


          // v3.23.96: Bedtime reminder toggle
          html += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(107,107,255,0.15);">';
          html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;" title="When enabled, a pop-out window appears 30 minutes before bedtime with a wind-down checklist. The next morning, it asks if you went to bed on time. Going to bed on time 5 nights in a row earns a badge!">';
          html += '<input type="checkbox" id="bedtimeReminderToggle" ' + (state.bedtimeReminderEnabled ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:#6b6bff;cursor:pointer;" />';
          html += '<span style="font-family:\'Courier New\',monospace;font-size:11px;color:#e0e0e0;">Bedtime reminders</span>';
          html += '</label>';
          html += '<div style="font-family:\'Courier New\',monospace;font-size:9px;color:#5a5a7e;margin-top:4px;margin-left:24px;">Pop-out reminder 30 min before bed + morning check-in. Earn badges for streaks!</div>';
          html += '</div>';

          sleepBody.innerHTML = html;

          // Summary in footer
          if (sleepSummaryEl) {
            var bedStr = _fmtTime(curH, curM);
            var durH = Math.floor(curD / 60);
            var durM = curD % 60;
            var durStr = durM > 0 ? durH + 'h' + durM + 'm' : durH + 'h';
            sleepSummaryEl.textContent = 'Bed ' + bedStr + ' \u2022 ' + durStr + (curP > 0 ? ' \u2022 ' + curP + 'min wind-down' : '');
          }

          // Show remove button if sleep is already active
          if (sleepRemoveBtn) sleepRemoveBtn.style.display = state.sleepTimeEnabled ? 'inline-block' : 'none';

          // Wire clicks — each click saves immediately + enables sleep + re-renders
          function _sleepPick(cls, key) {
            var btns = sleepBody.querySelectorAll('.' + cls);
            for (var i = 0; i < btns.length; i++) {
              btns[i].addEventListener('click', function() {
                state[key] = parseInt(this.getAttribute('data-val'), 10);
                save(); _renderSleepModalWiz();
                // If already active, update timeline live
                if (state.sleepTimeEnabled) renderFocusTimeline();
              });
            }
          }
          _sleepPick('slp-hour', 'sleepHour');
          _sleepPick('slp-min', 'sleepMinute');
          _sleepPick('slp-dur', 'sleepDurMin');
          _sleepPick('slp-prep', 'sleepPrepMin');

          // v3.23.96: Wire bedtime reminder toggle
          var _bdtToggle = document.getElementById('bedtimeReminderToggle');
          if (_bdtToggle) {
            _bdtToggle.addEventListener('change', function() {
              state.bedtimeReminderEnabled = _bdtToggle.checked;
              save();
            });
          }
        }

        function _updateSleepBtnStyle() {
          if (!sleepBtn) return;
          if (state.sleepTimeEnabled) {
            sleepBtn.style.background = '#6b6bff';
            sleepBtn.style.color = '#fff';
            sleepBtn.title = 'Sleep time active — click to edit or remove';
          } else {
            sleepBtn.style.background = 'none';
            sleepBtn.style.color = '#6b6bff';
            sleepBtn.title = 'Set your sleep time — blocks out bedtime + wind-down on the timeline.';
          }
        }

        // Wire open/close/remove
        if (sleepBtn) sleepBtn.addEventListener('click', function() {
          try { SFX.click && SFX.click(); } catch (_) {}
          openSleepWizard();
        });
        if (sleepCloseBtn) sleepCloseBtn.addEventListener('click', closeSleepWizard);
        if (sleepModal) sleepModal.addEventListener('click', function(e) {
          if (e.target === sleepModal) closeSleepWizard();
        });
        if (sleepRemoveBtn) sleepRemoveBtn.addEventListener('click', function() {
          state.sleepTimeEnabled = false;
          save();
          renderFocusTimeline();
          _updateSleepBtnStyle();
          closeSleepWizard();
        });
        if (sleepSaveBtn) sleepSaveBtn.addEventListener('click', function() {
          state.sleepTimeEnabled = true;
          save();
          renderFocusTimeline();
          _updateSleepBtnStyle();
          closeSleepWizard();
        });

        // Init button style on load
        _updateSleepBtnStyle();
      })();

      // v3.21.97: Standalone focus idle nudge toggle + test button
      var focusIdleToggle = $('focusIdleToggle');
      if (focusIdleToggle) {
        focusIdleToggle.checked = state.focusIdleReminder !== false;
        focusIdleToggle.addEventListener('change', function() {
          state.focusIdleReminder = focusIdleToggle.checked;
          save();
        });
      }
      var focusIdleTestBtn = $('focusIdleTestBtn');
      if (focusIdleTestBtn) {
        focusIdleTestBtn.addEventListener('click', function() {
          try {
            chrome.notifications.create('focus-idle-test-' + Date.now(), {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Time to focus!',
              message: 'You haven\'t started a focus session in over 2 hours. Open the timer and get a streak going!',
              priority: 2
            }, function() {
              if (chrome.runtime.lastError) {
                focusIdleTestBtn.textContent = 'FAILED';
                focusIdleTestBtn.style.color = '#ff6b6b';
                focusIdleTestBtn.style.borderColor = '#ff6b6b';
              } else {
                focusIdleTestBtn.textContent = 'SENT!';
                focusIdleTestBtn.style.color = '#00ff88';
                focusIdleTestBtn.style.borderColor = '#00ff88';
              }
              setTimeout(function() {
                focusIdleTestBtn.textContent = 'TEST';
                focusIdleTestBtn.style.color = '#4ecdc4';
                focusIdleTestBtn.style.borderColor = '#4ecdc4';
              }, 3000);
            });
          } catch (_) {
            focusIdleTestBtn.textContent = 'FAILED';
            setTimeout(function() { focusIdleTestBtn.textContent = 'TEST'; }, 3000);
          }
        });
      }

      // v3.23.73: Blocked time pop-out alert toggle + test button
      var blockAlertToggle = $('blockAlertToggle');
      if (blockAlertToggle) {
        blockAlertToggle.checked = state.blockAlertEnabled !== false;
        blockAlertToggle.addEventListener('change', function() {
          state.blockAlertEnabled = blockAlertToggle.checked;
          save();
        });
      }
      var blockAlertTestBtn = $('blockAlertTestBtn');
      if (blockAlertTestBtn) {
        blockAlertTestBtn.addEventListener('click', function() {
          try {
            // Play test sound immediately
            if (typeof SFX !== 'undefined' && SFX.test) SFX.test();
            // Open test alert popup
            var now = new Date();
            var hh = (now.getHours() < 10 ? '0' : '') + now.getHours();
            var mm = (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
            var nowStr = hh + ':' + mm;
            var testUrl = chrome.runtime.getURL('block-alert.html') +
              '?type=prep&label=Test+Event&prepTime=' + nowStr +
              '&eventTime=' + nowStr + '&endTime=' + nowStr +
              '&prepMin=15&durMin=60&test=1';
            chrome.windows.create({
              url: testUrl,
              type: 'popup',
              width: 480,
              height: 520,
              focused: true
            });
            blockAlertTestBtn.textContent = 'OPENED!';
            blockAlertTestBtn.style.color = '#00ff88';
            blockAlertTestBtn.style.borderColor = '#00ff88';
            setTimeout(function() {
              blockAlertTestBtn.textContent = 'TEST';
              blockAlertTestBtn.style.color = '#ff8c3a';
              blockAlertTestBtn.style.borderColor = '#ff8c3a';
            }, 3000);
          } catch (_) {
            blockAlertTestBtn.textContent = 'FAILED';
            blockAlertTestBtn.style.color = '#ff6b6b';
            setTimeout(function() {
              blockAlertTestBtn.textContent = 'TEST';
              blockAlertTestBtn.style.color = '#ff8c3a';
            }, 3000);
          }
        });
      }

      // v3.23.31: Separate test buttons for streak and rewards
      var testStreakBtn = $('testStreakBtn');
      if (testStreakBtn) {
        testStreakBtn.addEventListener('click', function() {
          try {
            var sm = $('settingsModal');
            if (sm) sm.style.display = 'none';
            var fakeSnapshot = { coins: state.coins || 0, xp: state.xp || 0, level: state.level || 1 };
            showPostSessionCelebration(fakeSnapshot, {streakOnly: true});
          } catch (e) {
            console.error('[TestStreak] Error:', e);
          }
        });
      }
      var testRewardsBtn = $('testRewardsBtn');
      if (testRewardsBtn) {
        testRewardsBtn.addEventListener('click', function() {
          try {
            var sm = $('settingsModal');
            if (sm) sm.style.display = 'none';
            var fakeSnapshot = { coins: Math.max(0, (state.coins || 0) - 15), xp: Math.max(0, (state.xp || 0) - 25), level: state.level || 1 };
            showPostSessionCelebration(fakeSnapshot, {skipStreak: true});
          } catch (e) {
            console.error('[TestRewards] Error:', e);
          }
        });
      }

      // v3.23.33: Test welcome back screen
      var testWelcomeBackBtn = $('testWelcomeBackBtn');
      if (testWelcomeBackBtn) {
        testWelcomeBackBtn.addEventListener('click', function() {
          try { var sm = $('settingsModal'); if (sm) sm.style.display = 'none'; showWelcomeBack(4.5 * 60 * 60 * 1000, 60, 2); } catch (e) { console.error('[TestWelcomeBack] Error:', e); }
        });
      }

      // v3.21.49: Auto-reopen todo list setting
      var autoReopenToggle = $('autoReopenToggle');
      if (autoReopenToggle) {
        autoReopenToggle.checked = !!state.autoReopenTodoList;
        autoReopenToggle.addEventListener('change', function() {
          state.autoReopenTodoList = autoReopenToggle.checked;
          save();
          var statusEl = $('startupStatus');
          if (statusEl) {
            statusEl.textContent = state.autoReopenTodoList ? 'Auto-reopen enabled. Tab will reopen within 5 min if closed.' : 'Auto-reopen disabled.';
            setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 3000);
          }
          updateAutoStartStatus();
        });
      }

      var startupBrowserSelect = $('startupBrowserSelect');
      if (startupBrowserSelect) {
        startupBrowserSelect.value = state.startupBrowser || 'brave';
        startupBrowserSelect.addEventListener('change', function() {
          state.startupBrowser = startupBrowserSelect.value;
          save();
        });
      }

      // v3.21.58: Startup extras — additional programs to launch
      var startupExtrasInput = $('startupExtrasInput');
      if (startupExtrasInput) {
        startupExtrasInput.value = (state.startupExtras || []).join('\n');
        startupExtrasInput.addEventListener('change', function() {
          var lines = startupExtrasInput.value.split('\n')
            .map(function(s) { return s.trim(); })
            .filter(function(s) { return s.length > 0; });
          state.startupExtras = lines;
          save();
        });
      }

      // Toggle startup guide
      var startupSetupToggle = $('startupSetupToggle');
      var startupSetupGuide = $('startupSetupGuide');
      if (startupSetupToggle && startupSetupGuide) {
        startupSetupToggle.addEventListener('click', function() {
          var showing = startupSetupGuide.style.display !== 'none';
          startupSetupGuide.style.display = showing ? 'none' : 'block';
          startupSetupToggle.innerHTML = (showing ? '&#9660;' : '&#9650;') + ' OPEN ON COMPUTER STARTUP';
        });
      }

      // Download startup .bat file
      var downloadStartupBtn = $('downloadStartupBtn');
      if (downloadStartupBtn) {
        downloadStartupBtn.addEventListener('click', function() {
          var browser = state.startupBrowser || 'brave';
          var extId = chrome.runtime.id || '';
          var extUrl = 'chrome-extension://' + extId + '/popup.html';
          var browserPath;
          if (browser === 'chrome') {
            browserPath = '%ProgramFiles%\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
          } else {
            browserPath = '%ProgramFiles%\\\\BraveSoftware\\\\Brave-Browser\\\\Application\\\\brave.exe';
          }
          // v3.21.58: Self-installing .bat with extras support.
          // Build the "launch extras" lines for when running from Startup folder.
          var extras = (state.startupExtras || []).filter(function(s) { return s.trim().length > 0; });
          var extrasLaunch = '';
          var extrasEcho = '';
          for (var ei = 0; ei < extras.length; ei++) {
            // Escape backslashes for .bat embedding
            var ePath = extras[ei].trim();
            extrasLaunch += '  start "" "' + ePath + '"\r\n';
            extrasEcho += '  echo     - ' + ePath + '\r\n';
          }

          var batContent = '@echo off\r\n'
            + 'REM ============================================================\r\n'
            + 'REM  Todo of the Loom — Auto-open on startup (self-installer)\r\n'
            + 'REM  Double-click this file to install. It copies itself into\r\n'
            + 'REM  your Windows Startup folder so the todo list opens every\r\n'
            + 'REM  time your computer starts.\r\n'
            + 'REM  To stop: delete open-todo-list.bat from your Startup folder\r\n'
            + 'REM    (Win+R -> shell:startup -> delete the file).\r\n'
            + 'REM ============================================================\r\n'
            + '\r\n'
            + 'setlocal\r\n'
            + 'set "STARTUP=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r\n'
            + 'set "TARGET=%STARTUP%\\open-todo-list.bat"\r\n'
            + '\r\n'
            + 'REM Check if we are already running FROM the Startup folder\r\n'
            + 'if /i "%~dp0"=="%STARTUP%\\" (\r\n'
            + '  REM We are in the startup folder — launch everything\r\n'
            + '  timeout /t 5 /nobreak >nul\r\n'
            + '  start "" "' + browserPath + '" "' + extUrl + '"\r\n'
            + extrasLaunch
            + '  exit /b\r\n'
            + ')\r\n'
            + '\r\n'
            + 'REM Not in startup folder — install ourselves there\r\n'
            + 'copy /y "%~f0" "%TARGET%" >nul 2>&1\r\n'
            + 'if %errorlevel%==0 (\r\n'
            + '  echo.\r\n'
            + '  echo  ============================================================\r\n'
            + '  echo   INSTALLED SUCCESSFULLY!\r\n'
            + '  echo.\r\n'
            + '  echo   The following will open every time your computer starts:\r\n'
            + '  echo     - Todo of the Loom (' + browser + ')\r\n'
            + extrasEcho
            + '  echo.\r\n'
            + '  echo   To stop this, open your Startup folder:\r\n'
            + '  echo     Win+R  then type  shell:startup\r\n'
            + '  echo   and delete open-todo-list.bat\r\n'
            + '  echo  ============================================================\r\n'
            + '  echo.\r\n'
            + ') else (\r\n'
            + '  echo.\r\n'
            + '  echo  [ERROR] Could not copy to Startup folder.\r\n'
            + '  echo  Try running as Administrator or copy manually.\r\n'
            + '  echo.\r\n'
            + ')\r\n'
            + 'pause\r\n'
            + 'endlocal\r\n';

          var blob = new Blob([batContent], { type: 'application/bat' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'open-todo-list.bat';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          var statusEl = $('startupStatus');
          if (statusEl) {
            statusEl.style.color = '#ff9f43';
            statusEl.textContent = 'Downloaded! Open the file to install automatically.';
            setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 8000);
          }
        });
      }

      // v3.21.54: Show auto-start status indicator
      function updateAutoStartStatus() {
        var statusEl = $('autoStartStatus');
        var iconEl = $('autoStartStatusIcon');
        var textEl = $('autoStartStatusText');
        if (!statusEl || !iconEl || !textEl) return;
        if (!state.autoReopenTodoList) {
          statusEl.style.display = 'none';
          return;
        }
        statusEl.style.display = 'block';
        if (state.lastAutoStartAt) {
          var d = new Date(state.lastAutoStartAt);
          var timeStr = state.use24Hour
            ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
            : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          var dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          statusEl.style.background = 'rgba(0,255,136,0.08)';
          statusEl.style.border = '1px solid rgba(0,255,136,0.3)';
          iconEl.textContent = '\u2713';
          iconEl.style.color = '#00ff88';
          textEl.style.color = '#00ff88';
          textEl.textContent = 'Auto-start working \u2014 last opened ' + dateStr + ' at ' + timeStr;
        } else {
          statusEl.style.background = 'rgba(255,159,67,0.08)';
          statusEl.style.border = '1px solid rgba(255,159,67,0.3)';
          iconEl.textContent = '\u25CB';
          iconEl.style.color = '#ff9f43';
          textEl.style.color = '#ff9f43';
          textEl.textContent = 'Not triggered yet \u2014 will activate on next computer restart';
        }
      }
      updateAutoStartStatus();

      // v3.21.54: "Verify Install" button — downloads a .bat that checks
      // if open-todo-list.bat exists in the Startup folder.
      var verifyStartupBtn = $('verifyStartupBtn');
      if (verifyStartupBtn) {
        verifyStartupBtn.addEventListener('click', function() {
          var batContent = '@echo off\r\n'
            + 'echo.\r\n'
            + 'echo  ============================================================\r\n'
            + 'echo   Todo of the Loom - Auto-Start Verification\r\n'
            + 'echo  ============================================================\r\n'
            + 'echo.\r\n'
            + 'set "TARGET=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\open-todo-list.bat"\r\n'
            + 'if exist "%TARGET%" (\r\n'
            + '  echo   [OK] INSTALLED\r\n'
            + '  echo.\r\n'
            + '  echo   The auto-start file was found in your Startup folder.\r\n'
            + '  echo   Your todo list will open automatically when your\r\n'
            + '  echo   computer starts.\r\n'
            + ') else (\r\n'
            + '  echo   [!!] NOT INSTALLED\r\n'
            + '  echo.\r\n'
            + '  echo   The auto-start file was NOT found in your Startup folder.\r\n'
            + '  echo   Go back to Settings and click "INSTALL AUTO-START".\r\n'
            + '  echo   Then open the downloaded file to install it.\r\n'
            + ')\r\n'
            + 'echo.\r\n'
            + 'echo  ============================================================\r\n'
            + 'echo.\r\n'
            + 'pause\r\n'
            + '(goto) 2>nul & del "%~f0"\r\n';
          var blob = new Blob([batContent], { type: 'application/bat' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'verify-auto-start.bat';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          var statusEl = $('startupStatus');
          if (statusEl) {
            statusEl.style.color = '#4ecdc4';
            statusEl.textContent = 'Downloaded! Open the file to check your install.';
            setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 6000);
          }
        });
      }

      // v3.21.53: "Open Startup Folder" button — downloads a tiny helper
      // .bat that opens explorer to the Startup folder then deletes itself.
      var openStartupFolderBtn = $('openStartupFolderBtn');
      if (openStartupFolderBtn) {
        openStartupFolderBtn.addEventListener('click', function() {
          var batContent = '@echo off\r\n'
            + 'explorer "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r\n'
            + '(goto) 2>nul & del "%~f0"\r\n';
          var blob = new Blob([batContent], { type: 'application/bat' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'open-startup-folder.bat';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          var statusEl = $('startupStatus');
          if (statusEl) {
            statusEl.style.color = '#4ecdc4';
            statusEl.textContent = 'Opening Startup folder... run the downloaded file.';
            setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 6000);
          }
        });
      }

      function openSettingsModal() {
        if (!settingsModal) return;
        settingsModal.style.display = 'flex';
        if (safeRefreshStatus) safeRefreshStatus.textContent = '';
        if (restoreBackupStatus) restoreBackupStatus.textContent = '';
        // Sync Cold Turkey UI with state
        if (coldTurkeyToggle) coldTurkeyToggle.checked = !!state.coldTurkeyEnabled;
        if (coldTurkeyDailyToggle) coldTurkeyDailyToggle.checked = !!state.coldTurkeyDailyPrompt;
        if (coldTurkeyIdleToggle) coldTurkeyIdleToggle.checked = !!state.coldTurkeyIdleReminder;
        if (coldTurkeyBlockNameInput) coldTurkeyBlockNameInput.value = state.coldTurkeyBlockName || '';
        if (focusIdleToggle) focusIdleToggle.checked = state.focusIdleReminder !== false;
        if (blockAlertToggle) blockAlertToggle.checked = state.blockAlertEnabled !== false;
        if (dailyRemindersToggle) dailyRemindersToggle.checked = state.dailyRemindersEnabled !== false;
        if (use24HourToggle) use24HourToggle.checked = !!state.use24Hour;
        if (blurCompletedToggle) blurCompletedToggle.checked = !!state.blurCompletedTasks;
        if (autoReopenToggle) autoReopenToggle.checked = !!state.autoReopenTodoList;
        if (startupBrowserSelect) startupBrowserSelect.value = state.startupBrowser || 'brave';
        if (startupExtrasInput) startupExtrasInput.value = (state.startupExtras || []).join('\n');
        // v3.21.79: Volume mute settings sync
        if (volumeMuteEnabled) volumeMuteEnabled.checked = !!state.volumeMuteEnabled;
        if (volumeMuteHourInput) volumeMuteHourInput.value = state.volumeMuteHour != null ? state.volumeMuteHour : 23;
        if (volumeMuteMinInput) volumeMuteMinInput.value = state.volumeMuteMinute != null ? state.volumeMuteMinute : 0;
        if (volumeUnmuteHourInput) volumeUnmuteHourInput.value = state.volumeUnmuteHour != null ? state.volumeUnmuteHour : 10;
        if (volumeUnmuteMinInput) volumeUnmuteMinInput.value = state.volumeUnmuteMinute != null ? state.volumeUnmuteMinute : 0;
        renderNagSites();
        updateAutoStartStatus();
        // Show extension ID for Cold Turkey setup
        var ctExtIdEl = $('coldTurkeyExtId');
        if (ctExtIdEl) {
          try {
            ctExtIdEl.textContent = 'Your extension ID: ' + chrome.runtime.id;
          } catch (_) {}
        }
      }
      function closeSettingsModal() {
        if (!settingsModal) return;
        settingsModal.style.display = 'none';
      }
      if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
          try { SFX.click && SFX.click(); } catch (_) {}
          openSettingsModal();
        });
      }
      if (settingsModalCloseBtn) {
        settingsModalCloseBtn.addEventListener('click', function() {
          try { SFX.click && SFX.click(); } catch (_) {}
          closeSettingsModal();
        });
      }
      if (settingsModal) {
        settingsModal.addEventListener('click', function(ev) {
          if (ev.target === settingsModal) closeSettingsModal();
        });
      }
      function pad2(n) { n = n | 0; return n < 10 ? '0' + n : '' + n; }
      function backupFilename() {
        var d = new Date();
        return 'todo-of-the-loom-backup-' + d.getFullYear() + pad2(d.getMonth() + 1) +
          pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) +
          pad2(d.getSeconds()) + '.json';
      }
      function triggerJsonDownload(filename, jsonText) {
        try {
          var blob = new Blob([jsonText], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(function() {
            try { document.body.removeChild(a); } catch (_) {}
            try { URL.revokeObjectURL(url); } catch (_) {}
          }, 500);
          return true;
        } catch (e) {
          return false;
        }
      }
      function doReload() {
        try {
          chrome.runtime.sendMessage({ type: 'SAFE_REFRESH_RELOAD' }, function() {
            try {
              if (chrome.runtime && typeof chrome.runtime.reload === 'function') {
                chrome.runtime.reload();
              }
            } catch (_) {}
          });
        } catch (e) {
          try {
            if (chrome.runtime && typeof chrome.runtime.reload === 'function') {
              chrome.runtime.reload();
            }
          } catch (_) {}
        }
      }
      if (safeRefreshBtn) {
        safeRefreshBtn.addEventListener('click', function() {
          try { SFX.click && SFX.click(); } catch (_) {}
          if (safeRefreshStatus) safeRefreshStatus.textContent = 'Preparing backup...';
          try { save(); } catch (_) {}
          var payload;
          try {
            payload = {
              version: _manifestVersion,
              exportedAt: new Date().toISOString(),
              state: state
            };
          } catch (e) {
            if (safeRefreshStatus) safeRefreshStatus.textContent = 'Backup failed: could not serialize state.';
            return;
          }
          var jsonText;
          try { jsonText = JSON.stringify(payload, null, 2); }
          catch (e) {
            if (safeRefreshStatus) safeRefreshStatus.textContent = 'Backup failed: serialization error.';
            return;
          }
          var downloaded = triggerJsonDownload(backupFilename(), jsonText);
          if (downloaded === false) {
            if (safeRefreshStatus) safeRefreshStatus.textContent = 'Download blocked. Backup aborted.';
            return;
          }
          try {
            chrome.storage.local.set({
              pixelFocusState_backup: {
                savedAt: Date.now(),
                version: _manifestVersion,
                state: state
              }
            }, function() {
              if (safeRefreshStatus) safeRefreshStatus.textContent = 'Backup saved. Reloading extension...';
              try {
                if (typeof MsgLog !== 'undefined') {
                  MsgLog.push('Safe refresh: backup written; the extension is being reloaded.');
                }
              } catch (_) {}
              setTimeout(doReload, 700);
            });
          } catch (e) {
            if (safeRefreshStatus) safeRefreshStatus.textContent = 'Saved to disk, but internal mirror failed.';
          }
        });
      }
      if (restoreBackupBtn) {
        restoreBackupBtn.addEventListener('click', function() {
          try { SFX.click && SFX.click(); } catch (_) {}
          if (confirm('Restore the most recent internal backup? This will overwrite the current state.') === false) return;
          if (restoreBackupStatus) restoreBackupStatus.textContent = 'Reading backup...';
          try {
            chrome.storage.local.get('pixelFocusState_backup', function(result) {
              var backup = result && result.pixelFocusState_backup;
              if (!backup || !backup.state) {
                if (restoreBackupStatus) restoreBackupStatus.textContent = 'No internal backup found.';
                return;
              }
              try {
                chrome.storage.local.set({ pixelFocusState: backup.state }, function() {
                  if (restoreBackupStatus) restoreBackupStatus.textContent = 'Restored. Reloading...';
                  setTimeout(doReload, 500);
                });
              } catch (e) {
                if (restoreBackupStatus) restoreBackupStatus.textContent = 'Restore failed.';
              }
            });
          } catch (e) {
            if (restoreBackupStatus) restoreBackupStatus.textContent = 'Backup read error.';
          }
        });
      }

      // ===== Import Backup from JSON File (v3.21.29) =====
      var importBackupBtn = $('importBackupBtn');
      var importBackupFile = $('importBackupFile');
      var importBackupStatus = $('importBackupStatus');
      if (importBackupBtn && importBackupFile) {
        importBackupBtn.addEventListener('click', function() {
          try { SFX.click && SFX.click(); } catch (_) {}
          importBackupFile.value = '';
          importBackupFile.click();
        });
        importBackupFile.addEventListener('change', function() {
          var file = importBackupFile.files && importBackupFile.files[0];
          if (!file) return;
          if (importBackupStatus) importBackupStatus.textContent = 'Reading file...';
          var reader = new FileReader();
          reader.onload = function(e) {
            try {
              var payload = JSON.parse(e.target.result);
              var restoredState = payload.state || payload;
              if (typeof restoredState !== 'object' || restoredState === null) {
                if (importBackupStatus) importBackupStatus.textContent = 'Invalid file — no state found.';
                return;
              }
              if (confirm('Import backup from "' + file.name + '"? This will overwrite ALL current state.') === false) {
                if (importBackupStatus) importBackupStatus.textContent = 'Cancelled.';
                return;
              }
              chrome.storage.local.set({ pixelFocusState: restoredState }, function() {
                if (importBackupStatus) importBackupStatus.textContent = 'Imported! Reloading...';
                setTimeout(doReload, 500);
              });
            } catch (err) {
              if (importBackupStatus) importBackupStatus.textContent = 'Parse error — is this a valid JSON file?';
            }
          };
          reader.onerror = function() {
            if (importBackupStatus) importBackupStatus.textContent = 'Could not read file.';
          };
          reader.readAsText(file);
        });
      }

      // ===== Tab overflow recalc on resize =====
      // If the popup window is ever resized (e.g. the user detaches it), the
      // overflow math needs to rerun so tabs show/hide to fit the new width.
      var tabResizeRaf = null;
      window.addEventListener('resize', function() {
        if (tabResizeRaf) return;
        tabResizeRaf = requestAnimationFrame(function() {
          tabResizeRaf = null;
          try { renderTabs(); } catch (e) {}
        });
      });
    });
  }

  // Boot
  init();

  // v3.21.15: Show Cold Turkey daily prompt after init (delayed so UI is ready).
  setTimeout(function() { try { maybeColdTurkeyDailyPrompt(); } catch (_) {} }, 1500);
  setTimeout(function() { try { maybeWindDownCTCheckin(); } catch (_) {} }, 2500);
  setTimeout(function() { try { maybeDailyRemindersPopup(); } catch (_) {} }, 1800);
  setTimeout(function() { try { checkIncrementalization(); } catch (_) {} }, 2000);
  setTimeout(function() { try { maybeShowWelcomeBack(); } catch (_) {} }, 2200);

  if (!state.mirrorMode) {
    setTimeout(function() {
      try {
        if (typeof window.ProfileSync !== 'undefined' && window.ProfileSync) {
          window.ProfileSync.sync(state);
        } else {
          // v3.23.24: Full fallback sync if firebase-sync.js failed to load.
          // Pushes complete profile to Firestore including daily tasks & sessions.
          (function() {
            if (!state.profileId) return;
            var PID = 'todo-of-the-loom';
            var KEY = 'AIzaSyCd200oa970-M-sDbcEn4U7dfENVBm4FOA';
            var url = 'https://firestore.googleapis.com/v1/projects/' + PID + '/databases/(default)/documents/profiles/' + state.profileId + '?key=' + KEY;
            var lvl = getLevelFromXP(state.xp || 0);
            // Helper: convert JS value to Firestore REST format
            function _toFV(val) {
              if (val === null || val === undefined) return {nullValue: null};
              if (typeof val === 'boolean') return {booleanValue: val};
              if (typeof val === 'number') {
                if (Number.isInteger(val)) return {integerValue: String(val)};
                return {doubleValue: val};
              }
              if (typeof val === 'string') return {stringValue: val};
              if (Array.isArray(val)) {
                return {arrayValue: {values: val.map(_toFV)}};
              }
              if (typeof val === 'object') {
                var f = {};
                Object.keys(val).forEach(function(k) { f[k] = _toFV(val[k]); });
                return {mapValue: {fields: f}};
              }
              return {stringValue: String(val)};
            }
            // Build today's date string
            var _d = new Date(), _mm = _d.getMonth() + 1, _dd = _d.getDate();
            var _today = _d.getFullYear() + '-' + (_mm < 10 ? '0' : '') + _mm + '-' + (_dd < 10 ? '0' : '') + _dd;
            // Daily task log
            var taskLog = (state.dailyTaskLog && state.dailyTaskLog.date === _today)
              ? state.dailyTaskLog : {date: _today, tasks: {}};
            // Daily session log
            var sessionLog = (state.dailySessionLog && state.dailySessionLog.date === _today)
              ? state.dailySessionLog : {date: _today, sessions: []};
            // Avatar
            var avatarDataURL = '';
            var pfp = state.profilePicture;
            if (pfp && pfp.pixels && pfp.size) {
              try {
                var c = document.createElement('canvas');
                c.width = pfp.size; c.height = pfp.size;
                var cx = c.getContext('2d');
                cx.fillStyle = '#08080f';
                cx.fillRect(0, 0, pfp.size, pfp.size);
                Object.keys(pfp.pixels).forEach(function(k) {
                  var parts = k.split(',');
                  cx.fillStyle = pfp.pixels[k];
                  cx.fillRect(parseInt(parts[0], 10), parseInt(parts[1], 10), 1, 1);
                });
                avatarDataURL = c.toDataURL('image/png');
              } catch (_) {}
            }
            // Personnel count
            var roster = 0;
            if (state.personnel) {
              try { roster = Object.keys(state.personnel).filter(function(k) { return state.personnelRoster && state.personnelRoster[k]; }).length || Object.keys(state.personnel).length; } catch(_) {}
            }
            var livesLost = 0;
            if (typeof state.maxLives === 'number' && typeof state.lives === 'number') {
              livesLost = Math.max(0, state.maxLives - state.lives);
            }
            var fields = {
              displayName: {stringValue: state.displayName || 'Anonymous Weaver'},
              tagline: {stringValue: state.tagline || ''},
              level: {integerValue: String(lvl.level)},
              currentXP: {integerValue: String(lvl.currentXP || 0)},
              nextLevelXP: {integerValue: String(lvl.nextLevelXP || 50)},
              xp: {integerValue: String(state.xp || 0)},
              title: {stringValue: lvl.level >= 100 ? 'Omnifabric Singularity' : (state.title || 'Would-Be Weaver')},
              streak: {integerValue: String(state.streak || 0)},
              longestStreak: {integerValue: String(Math.max(state.longestStreak || 0, state.streak || 0))},
              lifetimeBlocks: {integerValue: String(state.totalLifetimeBlocks || 0)},
              focusMinutes: {integerValue: String(state.lifetimeFocusMinutes || 0)},
              tasksCompleted: {integerValue: String(state.tasksCompletedLifetime || 0)},
              lifetimeCoins: {integerValue: String(state.lifetimeCoins || 0)},
              wallet: {integerValue: String(state.coins || 0)},
              combo: {integerValue: String(state.combo || 0)},
              maxCombo: {integerValue: String(state.maxCombo || 0)},
              personnel: {integerValue: String(roster)},
              loomsSaved: {integerValue: String((state.savedArtworks && state.savedArtworks.length) || 0)},
              loomsSold: {integerValue: String(state.loomsSold || 0)},
              livesLost: {integerValue: String(livesLost)},
              avatarDataURL: {stringValue: avatarDataURL},
              dailyTaskLog: _toFV(taskLog),
              dailySessionLog: _toFV(sessionLog),
              updatedAt: {stringValue: new Date().toISOString()},
              profileCreated: {stringValue: state.profileCreated ? new Date(state.profileCreated).toISOString() : new Date().toISOString()},
              projectNames: _toFV((state.projects || []).map(function(p) { return { id: p.id, name: p.name || 'Untitled' }; }))
            };
            fetch(url, {
              method: 'PATCH',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({fields: fields})
            }).then(function(r) {
              console.log('[FallbackSync] ' + (r.ok ? 'OK' : 'Failed: ' + r.status));
            }).catch(function(e) {
              console.warn('[FallbackSync] Error:', e);
            });
          })();
        }
      } catch (_) {}
    }, 3000);
  }

})();
} catch (pixelFocusInitError) {
  console.error('PixelFocus app.js fatal error:', pixelFocusInitError);
}
