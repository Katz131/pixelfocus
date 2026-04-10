// =============================================================================
// !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!! (v3.19.13)
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
    if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '') + 'k';
    if (n < 1000000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
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

  // ============== STATE ==============
  const DEFAULT_STATE = {
    projects: [{ id: 'default', name: 'General' }],
    activeProject: 'default',
    tasks: {},
    selectedTaskId: null,
    blocks: 0,
    totalLifetimeBlocks: 0,
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
    profileCreated: 0,        // timestamp
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
    chrome.storage.local.set({ pixelFocusState: state });
  }

  function load(cb) {
    chrome.storage.local.get('pixelFocusState', (result) => {
      if (result.pixelFocusState) {
        state = { ...DEFAULT_STATE, ...result.pixelFocusState };
        state.projects.forEach(p => {
          if (!state.tasks[p.id]) state.tasks[p.id] = [];
        });
        // Migration
        if (state.ownedColors && !state.unlockedColors) state.unlockedColors = state.ownedColors;
        if (state.totalBlocks && !state.totalLifetimeBlocks) state.totalLifetimeBlocks = state.totalBlocks;
        if (!state.unlockedColors) state.unlockedColors = ['#00ff88'];
        if (!state.totalLifetimeBlocks) state.totalLifetimeBlocks = 0;
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
      syncMilestoneColors();
      cb();
    });
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
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
      if (diffDays === 1 && state.todayBlocks > 0) {
        state.streak++;
      } else if (diffDays > 1) {
        state.streak = 0;
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
      state.lastActiveDate = today;
      state.sessionBlocks = 0;
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

  function notify(msg, color) {
    notifQueue.push({ msg, color });
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
    const { msg, color } = notifQueue.shift();
    notification.textContent = msg;
    notification.style.background = color || 'var(--accent)';
    notification.style.color = color ? '#fff' : 'var(--bg)';
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(showNextNotif, 300);
    }, 2000);
  }

  // ============== HOVER SOUNDS ==============
  let lastHoverTime = 0;
  const HOVER_SELECTORS = '.btn, .tab, .tab-add, .task-item, .milestone-item, .block-counter, .upgrade-btn, .task-checkbox, .task-delete, .task-select-btn, .xp-section, .collapsible-header, .stat, #galleryBtn, #blockCounter, #addTaskBtn, #addTabBtn';

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
  var LOBBY_MULT = [1, 1.2, 1.5, 2.0, 2.8, 4.0, 6.0, 9.0];
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
    var baseRate = [0, 0.02, 0.05, 0.12, 0.26, 0.55][Math.min(emp, 5)];
    var streakScale = 1 + (state.streak - 1) * 0.10;
    // Lobbying boosts the trickle rate; the global money mult also
    // applies so automated leadership + second location + world span
    // all multiply the passive income stream late-game.
    return baseRate * streakScale * getLobbyingMult() * getTotalMoneyMult() * getV317StreakTrickleMult();
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
    var cappedMins = Math.min(minutesYesterday, 600);
    var streakMult = 1 + Math.max(0, streakAfterRoll) * 0.15;
    var base = cappedMins * 0.5 * streakMult;
    // Market Share scales the end-of-day bonus, then the global money
    // multiplier stack (auto-leadership x second location x world span)
    // multiplies on top.
    var payout = Math.round(base * getMarketShareMult() * getTotalMoneyMult() * getV317EndOfDayMult());
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

  function renderCoins() {
    var el = $('coinsDisplay');
    if (!el) return;
    var c = Math.floor(state.coins || 0);
    if (c >= 1000000) el.textContent = (c / 1000000).toFixed(2) + 'M';
    else if (c >= 1000) el.textContent = (c / 1000).toFixed(1) + 'k';
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
    refreshTrackerBriefBadge();
    attachHoverSounds();
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
    $('nextXPPreview').textContent = state.timerState === 'running' ? `+${nextXP} XP on completion` : `Next block: +${nextXP} XP`;

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
    if (![600, 1200, 1800, 3600].includes(sec)) return;
    state.sessionDurationSec = sec;
    state.timerRemaining = sec;
    save();
    renderTimer();
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

      // Walk left to right, adding widths. Anything beyond wrapWidth overflows.
      var used = 0;
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
    if (!modal || !listEl || !keepBtn || !deleteBtn) return;

    ancientPurgeCurrentList = list;

    if (sub) {
      sub.textContent = list.length + ' task' + (list.length === 1 ? ' has' : 's have') +
        ' been untouched for 2+ days with no focus time logged. Delete ' +
        (list.length === 1 ? 'it' : 'them all') + '?';
    }

    // Build the list of ancient tasks
    listEl.innerHTML = '';
    list.forEach(function(entry) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);';
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
      row.appendChild(left);
      row.appendChild(age);
      listEl.appendChild(row);
    });

    // Wire buttons — replaceWith clones to clear any old listeners
    var freshKeep = keepBtn.cloneNode(true);
    keepBtn.parentNode.replaceChild(freshKeep, keepBtn);
    var freshDelete = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(freshDelete, deleteBtn);

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

    freshDelete.addEventListener('click', function() {
      var deleted = purgeAncientTasks(ancientPurgeCurrentList || []);
      closeAncientPurgeModal();
      state.ancientPurgeDismissedAt = 0; // reset since there are none left
      save();
      notify(deleted + ' abandoned task' + (deleted === 1 ? '' : 's') + ' purged.', '#ffb43c');
      try {
        if (typeof MsgLog !== 'undefined') {
          MsgLog.push('Purged ' + deleted + ' abandoned task' + (deleted === 1 ? '' : 's') + '. The shelf is clean.');
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
    const tasks = state.tasks[state.activeProject] || [];
    taskList.innerHTML = '';
    if (tasks.length === 0) { taskList.innerHTML = '<div class="empty-state" title="Type a task in the input above and press + or Enter to add it.">No tasks yet. Add one above!</div>'; return; }
    const sorted = [...tasks].sort((a, b) => a.completed !== b.completed ? (a.completed ? 1 : -1) : 0);
    sorted.forEach(task => {
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
      item.innerHTML = `
        <div class="task-checkbox${task.completed ? ' checked' : ''}" title="${task.completed ? 'Mark as not done.' : 'Mark this task complete. A speck of dust drops into the dust bin.'}"></div>
        ${staleBadgeHtml}
        <span class="task-text">${escHtml(task.text)}</span>
        ${blocksHtml}
        ${!task.completed ? `<button class="task-select-btn" title="Pin this task as your current focus target. While it's pinned, every textile earned from a completed focus session gets credited to THIS task (the little dots next to the task name track how many sessions you've finished while it was pinned). Pinned tasks never get flagged as aging, since they're being actively worked on. Click FOCUS again on the same task to unpin it. Only one task can be pinned at a time &mdash; picking a new one swaps the pin.">FOCUS</button>` : ''}
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
      item.querySelector('.task-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task.id); });

      // ===== Drag-to-reorder wiring =====
      // Only active (uncompleted) tasks are draggable. Completed tasks
      // stay pinned to the bottom. The drop target flashes a top or
      // bottom border depending on where in the row the cursor is.
      if (!task.completed) {
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

  function beginActualSession() {
    SFX.startTimer();
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
    save();
    render();
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
      // Snapshot the true wall-clock remaining time BEFORE clearing
      // timerEndsAt, otherwise a paused-then-resumed long session would
      // resume with a stale pre-pause count.
      if (state.timerEndsAt) {
        var remMs = state.timerEndsAt - Date.now();
        state.timerRemaining = Math.max(0, Math.ceil(remMs / 1000));
      }
      state.timerEndsAt = 0;
      state.timerState = 'paused';
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
    // Fresh start from idle (or mid-session after a reset) — run the
    // 15-second "get ready" countdown, THEN start the real session.
    cancelPreStartCountdown();
    countdownRemaining = COUNTDOWN_SECONDS;
    state.timerState = 'countdown';
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
    clearInterval(timerInterval);
    timerInterval = null;
    // Also kill any in-progress 15-second pre-start countdown.
    cancelPreStartCountdown();
    state.timerState = 'idle';
    state.timerRemaining = state.sessionDurationSec || 600;
    state.timerEndsAt = 0;
    // Reset combo on manual reset
    state.combo = 0;
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
    // Returns the full HTML for the pop-out window's body. Styled
    // inline so we don't have to worry about propagating CSS vars into
    // the PiP document. Looks like a shrunken version of the main
    // clock: big cyan digits on a near-black background, a thin
    // progress bar underneath, and a small label above.
    return '' +
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PixelFocus Timer</title>' +
      '<style>' +
      '  html,body{margin:0;padding:0;background:#0a0a14;color:#4ecdc4;font-family:"Press Start 2P","Courier New",monospace;overflow:hidden;height:100%;}' +
      '  .pip-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:10px 14px;box-sizing:border-box;}' +
      '  .pip-label{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;text-align:center;line-height:1.4;}' +
      '  .pip-clock{font-size:42px;font-weight:bold;letter-spacing:2px;color:#4ecdc4;text-shadow:0 0 10px rgba(78,205,196,0.5);line-height:1;}' +
      '  .pip-clock.countdown{color:#ffd700;text-shadow:0 0 10px rgba(255,215,0,0.5);}' +
      '  .pip-clock.paused{color:#888;text-shadow:none;}' +
      '  .pip-clock.done{color:#ff6b6b;text-shadow:0 0 10px rgba(255,107,107,0.6);}' +
      '  .pip-bar{width:100%;height:4px;background:#1a1a28;border-radius:2px;overflow:hidden;margin-top:10px;}' +
      '  .pip-bar-fill{height:100%;background:#4ecdc4;transition:width 0.3s;}' +
      '  .pip-task{font-size:7px;color:#666;text-align:center;margin-top:8px;max-height:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;}' +
      '</style></head><body>' +
      '<div class="pip-wrap">' +
      '  <div class="pip-label" id="pipLabel">FOCUS TIMER</div>' +
      '  <div class="pip-clock" id="pipClock">00:00</div>' +
      '  <div class="pip-bar"><div class="pip-bar-fill" id="pipBarFill" style="width:0%"></div></div>' +
      '  <div class="pip-task" id="pipTask">&nbsp;</div>' +
      '</div></body></html>';
  }

  function openPopOutTimer() {
    if (pipWindow) {
      // Already open — just focus it and refresh.
      try { pipWindow.focus(); } catch (_) {}
      try { renderPopOutTimer(); } catch (_) {}
      return;
    }
    // Prefer Document Picture-in-Picture (actually always-on-top).
    if (window.documentPictureInPicture && typeof window.documentPictureInPicture.requestWindow === 'function') {
      window.documentPictureInPicture.requestWindow({ width: 240, height: 150 })
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
    var taskEl = doc.getElementById('pipTask');
    if (!clock || !label || !fill) return;

    // Reset state classes
    clock.classList.remove('countdown', 'paused', 'done');

    var dur = state.sessionDurationSec || 600;

    if (state.timerState === 'countdown') {
      var cs = Math.max(0, countdownRemaining);
      clock.textContent = '00:' + String(cs).padStart(2, '0');
      clock.classList.add('countdown');
      label.textContent = 'GET READY';
      fill.style.width = ((COUNTDOWN_SECONDS - cs) / COUNTDOWN_SECONDS * 100) + '%';
    } else if (state.timerState === 'completed') {
      clock.textContent = '00:00';
      clock.classList.add('done');
      label.textContent = 'SESSION COMPLETE';
      fill.style.width = '100%';
    } else {
      var mins = Math.floor(state.timerRemaining / 60);
      var secs = state.timerRemaining % 60;
      clock.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      if (state.timerState === 'paused') {
        clock.classList.add('paused');
        label.textContent = 'PAUSED';
      } else if (state.timerState === 'running') {
        label.textContent = (dur / 60) + '-MIN FOCUS';
      } else {
        label.textContent = (dur / 60) + '-MIN IDLE';
      }
      var pct = ((dur - state.timerRemaining) / dur) * 100;
      fill.style.width = pct + '%';
    }

    if (taskEl) {
      if (state.selectedTaskId) {
        var task = findTask(state.selectedTaskId);
        taskEl.textContent = task ? task.text : '';
      } else {
        taskEl.textContent = '\u00a0';
      }
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

    // Calculate XP
    const xpGain = calculateXPGain(state.combo, state.streak);
    const oldLevel = getLevelFromXP(state.xp).level;

    state.xp += xpGain;
    state.todayXP += xpGain;
    state.lastBlockTime = Date.now();

    const newLevel = getLevelFromXP(state.xp).level;

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
    state.sessionBlocks++; // still counts 1 session regardless of haul
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
      if (comboCoins > 0) awardCoins(comboCoins, state.combo + 'x chain');
    }

    // Check daily marathon thresholds (1h/2h/3h/4h/6h/8h focus today)
    checkMarathonBonuses();

    // Check color unlocks
    const newColors = syncMilestoneColors();

    // Notifications
    let comboText = state.combo >= 2 ? ` 🔥 ${state.combo}x Combo!` : '';
    notify(`+1 Block earned! +${xpGain} XP${comboText}`, 'var(--accent)');

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
      title: 'PixelFocus - Block Earned!',
      message: `+${xpGain} XP (${state.combo}x combo) | Total blocks today: ${state.todayBlocks}`
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
    const reward = getSessionReward(state.sessionDurationSec || 600);
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
    if (modalTitle) modalTitle.textContent = 'Did you actually focus?';
    if (modalSub) modalSub.textContent = 'Completing the ' + reward.label + ' will earn ' + total + ' textile' + (total === 1 ? '' : 's') + (reward.bonus > 0 ? ' (' + reward.blocks + ' + ' + reward.bonus + ' commitment bonus)' : '') + '.';
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
      awardSessionReward(reward);
      state.timerRemaining = state.sessionDurationSec || 600;
      state.timerState = 'idle';
      save();
      render();
      SFX.blockEarned();
    });
    noBtn.addEventListener('click', function() {
      if (!_focusConfirmArmed) { closeModal(); return; }
      _focusConfirmArmed = false;
      closeModal();
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
  }

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
    if (!state.tasks[state.activeProject]) state.tasks[state.activeProject] = [];
    state.tasks[state.activeProject].push(task);
    trackRecentTask(text);
    taskInput.value = '';
    save();
    render();
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

  function toggleTask(id) {
    var task = findTask(id);
    if (!task) return;
    task.completed = !task.completed;
    if (task.completed) {
      SFX.completeTask();
      // Add a colored pixel to the dustbin scatter plot
      if (!state.dustPixels) state.dustPixels = [];
      var palette = state.unlockedColors || ['#00ff88'];
      var color = palette[Math.floor(Math.random() * palette.length)];
      state.dustPixels.push({
        x: Math.random(),
        y: Math.random(),
        color: color
      });
      // Cap at 600 dust pixels
      if (state.dustPixels.length > 600) {
        state.dustPixels = state.dustPixels.slice(state.dustPixels.length - 600);
      }
    } else {
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
    if (!state.tasks[state.activeProject]) state.tasks[state.activeProject] = [];
    (b.tasks || []).forEach(function(text, idx) {
      state.tasks[state.activeProject].push({
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

  // ============== INIT ==============
  function init() {
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
        try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
      }

      // Block counter -> open gallery (textile counter, gallery is where they're spent)
      var blockCounter = $('blockCounter');
      if (blockCounter) {
        blockCounter.addEventListener('click', function() { openPFWindow('gallery.html'); });
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

      // ===== Passive ticks: autoloom + streak coin trickle =====
      // Run once now to catch up any idle accumulation, then on intervals.
      try { tickAutoloom(); } catch (e) {}
      try { tickCoins(); } catch (e) {}
      setInterval(function() { try { tickAutoloom(); } catch (e) {} }, 30 * 1000);
      setInterval(function() { try { tickCoins(); } catch (e) {} }, 10 * 1000);

      // ===== Stale task check =====
      // Immediately flag any tasks that were already stale when the window
      // opened (e.g. left overnight), then re-check every minute so newly
      // aging tasks surface without requiring a refresh.
      try { checkStaleTasks(); } catch (e) {}
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

})();
} catch (pixelFocusInitError) {
  console.error('PixelFocus app.js fatal error:', pixelFocusInitError);
}
