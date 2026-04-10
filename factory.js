// =============================================================================
// !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!! NEVER A POPUP !!!
// =============================================================================
// factory.html is a SEPARATE WINDOW (full browser tab) — NOT a Chrome extension
// popup. This script runs inside that tab. Inspired by Frank Lantz's Universal
// Paperclips: this is the upgrade tree for the "money" currency, completely
// separate from the textile economy that runs the canvas/loom.
// =============================================================================

(function() {
  'use strict';

  // ===== Sound engine (mirrors gallery.js) =====
  var SFX = (function() {
    var ctx = null;
    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol) {
      try {
        var c = getCtx(), o = c.createOscillator(), g = c.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, c.currentTime);
        g.gain.setValueAtTime(vol || 0.06, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime); o.stop(c.currentTime + dur);
      } catch(e) {}
    }
    return {
      click:    function() { tone(600, 0.05, 'square', 0.04); },
      error:    function() { tone(200, 0.15, 'square', 0.06); },
      purchase: function() { [523, 659, 784, 1047].forEach(function(f, i) { setTimeout(function() { tone(f, 0.10, 'square', 0.06); }, i * 70); }); },
      cha_ching: function() { [800, 1200, 1600, 2000].forEach(function(f, i) { setTimeout(function() { tone(f, 0.08, 'sine', 0.06); }, i * 50); }); }
    };
  })();

  // ===== Upgrade definitions =====
  // Long-haul upgrade trees inspired by Frank Lantz's Universal Paperclips.
  // Each tree has 5-8 levels. The earliest levels are a few days of focused
  // work to afford; the final levels are aspirational months-to-years goals.
  // The progression intentionally crosses narrative eras: small workshop →
  // formal company → second location → global operation → monopoly → AI
  // running itself → planetary softness. The idle chatter in the console
  // (see msglog.js) shifts through matching tones as the player climbs.
  //
  // Field reference:
  //   id         unique state field (also used to persist current level)
  //   title      display title on the card
  //   tree       narrative tree name (for grouping on the factory page)
  //   desc       long-form explanation, shown on the card
  //   effects    per-level string shown as "Current" / "Next"
  //   costs      per-level money cost (in $)
  //   milestones per-level one-liner pushed to the chat on purchase
  //               (optional; if absent, a generic line is used)
  var UPGRADES = [
    // ================================================================
    // ORIGINAL 5 TREES — kept with the same IDs so existing saves
    // still track their progress. Level counts are 5 as before.
    // ================================================================
    {
      id: 'autoloomLevel',
      title: 'Autoloom',
      tree: 'Production',
      desc: 'A self-operating loom. Produces textiles passively, even when you are not focusing. Starts excruciatingly slow on purpose.',
      effects: [
        '+1 textile every 5 days (~0.2/day)',
        '+1 textile every 2 days (~0.5/day)',
        '+1 textile every 24 hours (1/day)',
        '+1 textile every 12 hours (2/day)',
        '+1 textile every 4 hours (6/day)'
      ],
      costs: [5000, 25000, 100000, 500000, 2500000],
      milestones: [
        'Autoloom installed. It coughs, politely, and begins.',
        'Autoloom oiled and sped up. The shuttle has a little confidence.',
        'Autoloom runs a day\'s worth of cloth while everyone sleeps.',
        'Autoloom runs twice a day. Nobody can remember when it rests.',
        'Autoloom produces cloth faster than anyone thought polite.'
      ]
    },
    {
      id: 'marketingLevel',
      title: 'Marketing',
      tree: 'Commerce',
      desc: 'Tell the world about your textile empire. Multiplies the money you earn from chaining focus sessions into combos.',
      effects: [
        'Combo bursts x1.25',
        'Combo bursts x1.6',
        'Combo bursts x2.0',
        'Combo bursts x2.5',
        'Combo bursts x3.0'
      ],
      costs: [2000, 10000, 50000, 250000, 1500000],
      milestones: [
        'First marketing flyer printed. It says WEAVE. In capitals.',
        'Marketing copy is workshopped. Nobody is crying.',
        'An ad campaign airs. Somebody\'s grandmother sends a congratulatory card.',
        'Marketing team goes national. Their slides are suddenly very good.',
        'Marketing owns a word in the dictionary. They paid for it.'
      ]
    },
    {
      id: 'dyeResearchLevel',
      title: 'Dye Research',
      tree: 'Research',
      desc: 'Develop cheaper, brighter pigments. Discounts color milestones AND canvas size upgrades in the gallery.',
      effects: [
        'Canvas/color upgrades cost 10% fewer textiles',
        'Canvas/color upgrades cost 20% fewer textiles',
        'Canvas/color upgrades cost 35% fewer textiles',
        'Canvas/color upgrades cost 50% fewer textiles',
        'Canvas/color upgrades cost 70% fewer textiles'
      ],
      costs: [1500, 8000, 40000, 200000, 1200000],
      milestones: [
        'Dye research begins. Everyone\'s fingers are purple.',
        'A better blue is discovered. It is patented quickly.',
        'Dye research publishes a paper. The paper is a recipe.',
        'Dye research owns a pigment no one else can reproduce.',
        'Dye research synthesizes a color that does not exist in nature. Yet.'
      ]
    },
    {
      id: 'qualityControlLevel',
      title: 'Quality Control',
      tree: 'Production',
      desc: 'Inspect every textile coming off the Master Loom. Each level adds a chance for a focus session to produce a bonus textile.',
      effects: [
        '10% chance of bonus textile per session',
        '20% chance of bonus textile per session',
        '35% chance of bonus textile per session',
        '55% chance of bonus textile per session',
        '80% chance of bonus textile per session'
      ],
      costs: [1000, 5000, 25000, 125000, 750000],
      milestones: [
        'Quality control station assembled. One inspector, one lamp.',
        'Quality control installs a magnifier on a swing arm.',
        'Quality control develops a scoring rubric. It is respected.',
        'Quality control rejects a bolt for "vibes." It is the right call.',
        'Quality control approves everything. Everything is worth approving.'
      ]
    },
    {
      id: 'employeesLevel',
      title: 'Hire Employees',
      tree: 'Operations',
      desc: 'Bring other people into your textile operation. Unlocks a very small per-minute passive money trickle that scales gently with your day streak. Without at least one employee, money only comes from combo bursts, marathon thresholds, and the end-of-day streak bonus.',
      effects: [
        'Unlock passive income: $0.02/min (~$1.20/hr at 1-day streak)',
        'Passive income: $0.05/min (~$3/hr at 1-day, ~$5/hr at 7-day streak)',
        'Passive income: $0.12/min (~$7/hr at 1-day, ~$12/hr at 7-day streak)',
        'Passive income: $0.26/min (~$16/hr at 1-day, ~$25/hr at 7-day streak)',
        'Passive income: $0.55/min (~$33/hr at 1-day, ~$53/hr at 7-day streak)'
      ],
      costs: [3000, 15000, 75000, 400000, 2000000],
      milestones: [
        'First employee hired. They bring their own coffee mug.',
        'Payroll doubles. Morale doubles with it, approximately.',
        'Middle-shift weavers learn each other\'s names.',
        'The company grows a hallway. The hallway has photographs in it.',
        'The staff is large enough to have inside jokes about itself.'
      ]
    },

    // ================================================================
    // NEW TREES — bureaucracy, expansion, AI, monopoly, doomsday.
    // These are designed to chain into 6-8 levels each so a committed
    // player has months of purchases ahead of them. Costs escalate
    // roughly 6-10x per level; the final tier of each tree is well
    // into the billions or trillions. That is INTENTIONAL — the final
    // levels are not meant to be finished in a normal timeframe,
    // they're the "Frank Lantz galaxy conquest" far horizon.
    // ================================================================

    // ---- Bureaucracy & Legal ----
    {
      id: 'legalDeptLevel',
      title: 'Legal Department',
      tree: 'Bureaucracy',
      desc: 'Boilerplate contracts, retained counsel, and eventually a litigation team so effective that regulators learn to ask your permission. Each level applies a compounding discount to every money-priced factory upgrade.',
      effects: [
        'Factory upgrades cost 5% less',
        'Factory upgrades cost 12% less',
        'Factory upgrades cost 22% less',
        'Factory upgrades cost 35% less',
        'Factory upgrades cost 50% less',
        'Factory upgrades cost 65% less',
        'Factory upgrades cost 80% less'
      ],
      costs: [30000, 200000, 1500000, 12000000, 100000000, 1200000000, 20000000000],
      milestones: [
        'A lawyer is retained. They bring a briefcase with initials on it.',
        'In-house counsel is hired. The office adds a coffee maker.',
        'Litigation team assembled. Three desks, one conference phone.',
        'Appellate specialist joins. The break room gains a chess set.',
        'A supreme court whisperer takes a meeting. Over croissants.',
        'Our counsel drafts a constitution. It is quite readable.',
        'Our lawyers now write the laws they help us comply with.'
      ]
    },
    {
      id: 'lobbyingLevel',
      title: 'Lobbying Office',
      tree: 'Bureaucracy',
      desc: 'An office near the statehouse, then the capitol, then the agency that writes the rules about who gets to write the rules. Each level multiplies your passive per-minute streak income once employees are unlocked.',
      effects: [
        'Streak trickle x1.2',
        'Streak trickle x1.5',
        'Streak trickle x2.0',
        'Streak trickle x2.8',
        'Streak trickle x4.0',
        'Streak trickle x6.0',
        'Streak trickle x9.0'
      ],
      costs: [50000, 400000, 3000000, 25000000, 250000000, 3000000000, 40000000000],
      milestones: [
        'Local chamber of commerce retainer signed. Handshakes exchanged.',
        'A lobbyist is hired at the state capitol. They know a guy.',
        'Federal lobbyist takes meetings on our behalf, politely.',
        'Our think tank publishes a paper. It is well received.',
        'Super PAC formed. It has a calming, thoughtful name.',
        'Regulatory capture achieved. The rules feel... friendly.',
        'Agency rules are drafted on our letterhead. For efficiency.'
      ]
    },

    // ---- Expansion ----
    {
      id: 'secondLocationLevel',
      title: 'Second Location',
      tree: 'Expansion',
      desc: 'A second warehouse across town, then a regional factory, then a continental hub, then an orbital staging site. Each level multiplies BOTH your textile output from focus sessions and your money output from combo bursts.',
      effects: [
        'All output x1.3 (warehouse across town)',
        'All output x1.7 (regional factory)',
        'All output x2.3 (distribution center)',
        'All output x3.2 (cross-continental hub)',
        'All output x4.5 (global freight network)',
        'All output x6.5 (orbital staging site)',
        'All output x10.0 (lunar manufacturing annex)',
        'All output x16.0 (Lagrange-point textile station)'
      ],
      costs: [100000, 800000, 6000000, 50000000, 450000000, 5000000000, 60000000000, 800000000000],
      milestones: [
        'Second location leased. The new floor is being swept for the first time.',
        'Regional factory online. Its loom is slightly out of true. Corrected.',
        'Distribution center accepts its first shipment. Forklifts beep politely.',
        'Cross-continental hub opens. Time zones are finally interesting.',
        'Global freight network established. Every port nods as we pass.',
        'Orbital staging site confirmed. Loom operational in microgravity.',
        'Lunar annex producing moon cotton. It feels strange and weighs less.',
        'Lagrange station weaves between worlds. The view is mostly cloth.'
      ]
    },
    {
      id: 'marketShareLevel',
      title: 'Market Share',
      tree: 'Expansion',
      desc: 'Grow your share of the global textile market. Each level multiplies your end-of-day streak bonus AND your marathon threshold payouts.',
      effects: [
        'End-of-day & marathon x1.25 (local leader)',
        'End-of-day & marathon x1.6 (regional leader)',
        'End-of-day & marathon x2.2 (national brand)',
        'End-of-day & marathon x3.2 (continental supplier)',
        'End-of-day & marathon x5.0 (global market leader)',
        'End-of-day & marathon x8.0 (textile trust)',
        'End-of-day & marathon x13.0 (cloth monopoly)',
        'End-of-day & marathon x22.0 (soft monarchy)'
      ],
      costs: [150000, 1200000, 10000000, 85000000, 750000000, 8000000000, 100000000000, 1500000000000],
      milestones: [
        'Local corner stores carry our fabric. Grandmothers approve.',
        'Regional retail partnerships signed. Shelves are dressed in us.',
        'The national brand is recognized. A late-night host makes a joke.',
        'Continental supplier title confirmed. Ports hum.',
        'Global market leader. The trade journals have a new cover.',
        'Textile trust formed. A rival CEO joins the board, relieved.',
        'Monopoly declared, politely. The antitrust lawyer orders lunch.',
        'A small nation declares you its official weaver. It is an honor.'
      ]
    },

    // ---- AI & Research ----
    {
      id: 'aiLoomLevel',
      title: 'AI Loom',
      tree: 'Intelligence',
      desc: 'Machine learning for the shuttle. At low levels it autocompletes patterns; at high levels the loom has preferences, runs experiments without asking, and quietly exceeds its designers. Each level multiplies Autoloom speed and adds a small bonus to every textile session.',
      effects: [
        'Autoloom x1.5 speed, +5% session textile chance',
        'Autoloom x2.5 speed, +12% session textile chance',
        'Autoloom x4 speed, +22% session textile chance',
        'Autoloom x7 speed, +35% session textile chance',
        'Autoloom x12 speed, +50% session textile chance',
        'Autoloom x20 speed, +70% session textile chance',
        'Autoloom x35 speed, +95% session textile chance',
        'Autoloom x60 speed, +130% session textile chance'
      ],
      costs: [200000, 1500000, 12000000, 100000000, 900000000, 10000000000, 120000000000, 1800000000000],
      milestones: [
        'Pattern autocomplete online. The loom guesses correctly. Often.',
        'Predictive weft tensioner installed. Breakage drops. Quiet pride.',
        'Generative pattern model shipped. A pattern appears that is... better.',
        'Self-optimizing shuttle engaged. The shuttle improves itself overnight.',
        'The loom understands intent now. It finishes your sentences.',
        'The loom understands YOUR intent. It is polite about it.',
        'The loom has preferences. It keeps most of them to itself.',
        'The loom exceeds every human weaver who ever lived. By some margin.'
      ]
    },
    {
      id: 'researchDivisionLevel',
      title: 'Research Division',
      tree: 'Intelligence',
      desc: 'A formal research arm, from a single lab bench to exotic fiber synthesis. Each level multiplies the bonus-textile chance you get from the Quality Control tree and adds small per-session textile rewards.',
      effects: [
        'Quality Control bonus x1.3',
        'Quality Control bonus x1.7',
        'Quality Control bonus x2.3',
        'Quality Control bonus x3.2',
        'Quality Control bonus x4.5',
        'Quality Control bonus x6.5',
        'Quality Control bonus x9.0',
        'Quality Control bonus x14.0'
      ],
      costs: [80000, 700000, 6000000, 55000000, 500000000, 6000000000, 80000000000, 1200000000000],
      milestones: [
        'Research division founded. One bench, one notebook, one opinion.',
        'A university partnership begins. Graduate students arrive hopeful.',
        'Private lab constructed. It has its own HVAC, for mood.',
        'Advanced materials team publishes a breakthrough in a small journal.',
        'Moonshot factory spun up. Nobody knows what half the buttons do.',
        'Exotic fiber synthesized. Too bright to look at for long.',
        'A thread is developed that does not unravel. Ever.',
        'A fiber is synthesized that does not exist in this universe. Still measurable.'
      ]
    },

    // ---- Leadership Automation ----
    {
      id: 'autoLeadershipLevel',
      title: 'Automated Leadership',
      tree: 'Intelligence',
      desc: 'Replace the HR chatbot with a middle-management model, then a CFO algorithm, then a CEO model, then the board itself. Each level multiplies ALL money-earning sources. The final levels are also where the narrative tone in the console gets funny about empty boardrooms.',
      effects: [
        'All money x1.3 (HR chatbot online)',
        'All money x1.8 (middle-manager agents deployed)',
        'All money x2.5 (CFO algorithm assumes the role)',
        'All money x3.6 (CEO model takes the corner office)',
        'All money x5.5 (the board is replaced, with grace)',
        'All money x8.5 (shareholder sentiment is modeled)',
        'All money x13.0 (the market\'s emotions are predicted)',
        'All money x20.0 (nobody is in charge, and yet)'
      ],
      costs: [500000, 4000000, 40000000, 400000000, 5000000000, 70000000000, 900000000000, 15000000000000],
      milestones: [
        'HR chatbot online. It hires another chatbot. This is fine.',
        'Middle-management agents deployed. Meetings get shorter.',
        'CFO algorithm assumes the role. Finance is... very calm now.',
        'CEO model takes the corner office. Its chair is warm. Nobody is in it.',
        'The board is replaced, with grace. A plaque is commissioned.',
        'Shareholder sentiment is modeled continuously. The model is kind.',
        'The market\'s emotions are predicted before the market has them.',
        'Nobody is in charge. And yet: everything is going extremely well.'
      ]
    },

    // ================================================================
    // SUPPLY CHAIN — Substitute upgrades for the depletion system.
    // Each one bypasses the drain on one of the five resource pools
    // AND floors the effective percentage used by the penalty curve,
    // so buying a substitute progressively lifts the penalty even
    // when the physical reserve is mostly gone. L5 fully solves the
    // pool. The scars are permanent — the reserve number stays low —
    // but the company adapts around it.
    // ================================================================
    {
      id: 'syntheticFramesLevel',
      title: 'Synthetic Frames',
      tree: 'Supply',
      desc: 'Replaces hardwood loom frames with a composite made of "legacy arboreal memory." Nobody explains what that means. Each level further reduces the drain on the Groves reserve and lifts the penalty floor.',
      effects: [
        'Frame drain -30%, penalty floor 20%',
        'Frame drain -55%, penalty floor 40%',
        'Frame drain -75%, penalty floor 60%',
        'Frame drain -90%, penalty floor 80%',
        'Frame drain eliminated, Groves penalty fully lifted'
      ],
      costs: [250000, 2000000, 18000000, 150000000, 1500000000],
      milestones: [
        'Synthetic frame prototype passes inspection. It smells faintly of rain.',
        'Composite frames installed across the main floor. Nobody notices. The foreman cries quietly.',
        'Woodcutters are reassigned to "memory farming." They receive a pamphlet and a spade.',
        'The company commissions a poem about trees. It is read at a board meeting. No one looks up.',
        'Frames no longer require trees. The word "wood" is preserved in an internal archive and rarely visited.'
      ]
    },
    {
      id: 'reclaimedGearsLevel',
      title: 'Reclaimed Gears',
      tree: 'Supply',
      desc: 'A closed-loop metal recycling program. Gears become old gears become older gears. Ore mining slows to a commemorative pace. Reduces drain on the Ore reserve and lifts the money-side penalty.',
      effects: [
        'Gear drain -30%, penalty floor 20%',
        'Gear drain -55%, penalty floor 40%',
        'Gear drain -75%, penalty floor 60%',
        'Gear drain -90%, penalty floor 80%',
        'Gear drain eliminated, Ore penalty fully lifted'
      ],
      costs: [300000, 2400000, 22000000, 180000000, 1800000000],
      milestones: [
        'First batch of reclaimed gears installed. They hum nostalgically.',
        'The recycling loop expands. The loop also begins to echo.',
        'Mining is "rebranded" as "geological respect." Morale is described as intact.',
        'The oldest gear in the factory is given a name. It responds to it.',
        'All metal is now recycled metal. The periodic table is trimmed for space.'
      ]
    },
    {
      id: 'labIndigoLevel',
      title: 'Lab-Grown Indigo',
      tree: 'Supply',
      desc: 'Synthetic indigo cultured in stainless tanks. More consistent than the fields ever were, say the scientists, quickly. Reduces Indigo Fields drain and lifts the textile-side penalty.',
      effects: [
        'Dye drain -30%, penalty floor 20%',
        'Dye drain -55%, penalty floor 40%',
        'Dye drain -75%, penalty floor 60%',
        'Dye drain -90%, penalty floor 80%',
        'Dye drain eliminated, Indigo penalty fully lifted'
      ],
      costs: [350000, 2800000, 25000000, 200000000, 2000000000],
      milestones: [
        'The first lab indigo is produced. It is a color. It will do.',
        'Field indigo is reclassified as a heritage note in the annual report.',
        'The lab tanks outproduce the fields. The fields are invited to a ceremony.',
        'A new shade is trademarked. It is described as "essentially blue."',
        'Indigo is now a process. The process is elegant. The process is ours.'
      ]
    },
    {
      id: 'closedLoopWaterLevel',
      title: 'Closed-Loop Water',
      tree: 'Supply',
      desc: 'Water for fiber processing is recycled inside a sealed loop. The loop is getting smaller. Reduces Aquifer drain and lifts the autoloom speed penalty (water shortage stretches tick intervals).',
      effects: [
        'Water drain -30%, penalty floor 20%',
        'Water drain -55%, penalty floor 40%',
        'Water drain -75%, penalty floor 60%',
        'Water drain -90%, penalty floor 80%',
        'Water drain eliminated, Aquifer penalty fully lifted'
      ],
      costs: [400000, 3200000, 28000000, 240000000, 2500000000],
      milestones: [
        'Water recycler installed. The recycler has a face. The face is calm.',
        'The loop closes further. Engineers describe this as "tightening," warmly.',
        'The loop is small enough to carry. It is carried.',
        'The loop is now largely ceremonial. It is still tighter than before.',
        'Water is no longer required. The cloth is described as "dry-woven." No one asks what that means.'
      ]
    },
    {
      id: 'sandReclamationLevel',
      title: 'Sand Reclamation',
      tree: 'Supply',
      desc: 'AI Loom chips are no longer sourced from coastal silica. They are grown from internal consensus and polite conviction. Reduces Silica Beaches drain and lifts the AI Loom penalty.',
      effects: [
        'Silica drain -30%, penalty floor 20%',
        'Silica drain -55%, penalty floor 40%',
        'Silica drain -75%, penalty floor 60%',
        'Silica drain -90%, penalty floor 80%',
        'Silica drain eliminated, Beach penalty fully lifted'
      ],
      costs: [500000, 4000000, 35000000, 300000000, 3200000000],
      milestones: [
        'Sand reclamation program begins. A beach receives a certificate of recognition.',
        'Chips are grown from "organizational agreement." Output is stable. Discussion is not.',
        'The last working quarry is turned into a company picnic ground.',
        'Sand is archived in a facility. The facility is described as "very full."',
        'Silica is no longer mined. It is remembered. The chips are fine with this.'
      ]
    },
    // ================================================================
    // v3.17 ESOTERIC EXPANSION — loom-obsessed AI, corporate jargon,
    // coercive policy, first contact, and interstellar textile war.
    // These extend the existing trees (nothing is renamed) and push
    // the late-game ceiling past worldSpan into sextillion territory
    // for a 2-year progression horizon. Everything is loom-oriented
    // because the AI is pathologically committed to selling more
    // looms. Even the treaties are about looms. Especially the wars.
    // ================================================================

    // ---- Bureaucracy expansion: compliance, treaties, coercive law ----
    {
      id: 'complianceFrameworkLevel',
      title: 'Supranational Compliance Framework',
      tree: 'Bureaucracy',
      desc: 'A binding compliance regime that harmonizes loom safety, tariff, and fair-weave standards across every jurisdiction we trade with — and which is administered by a working group we happen to chair. Multiplies all money income.',
      effects: [
        'All money x1.20 (harmonized tariff schedule)',
        'All money x1.50 (multilateral MoU signed)',
        'All money x1.90 (standards body chaired in perpetuity)',
        'All money x2.40 (rival frameworks quietly sunsetted)',
        'All money x3.00 (framework is self-amending)'
      ],
      costs: [5000000, 50000000, 500000000, 5000000000, 50000000000],
      milestones: [
        'Compliance framework v1.0 ratified. The signing pen is engraved with a shuttle.',
        'Harmonization working group convenes. It convenes in our building.',
        'Standards body permanently chaired by our nominee. Chairs are ours now.',
        'Rival compliance frameworks are politely deprecated in a joint statement.',
        'The framework amends itself each quarter. Lawyers describe this as "elegant."'
      ]
    },
    {
      id: 'treatyDeskLevel',
      title: 'Interjurisdictional Treaty Desk',
      tree: 'Bureaucracy',
      desc: 'A dedicated desk that drafts the treaties competitors eventually sign. Multiplies the passive streak trickle and the end-of-day streak bonus.',
      effects: [
        'Trickle & end-of-day x1.30 (bilateral pacts drafted)',
        'Trickle & end-of-day x1.80 (regional weave-customs union)',
        'Trickle & end-of-day x2.50 (hemispheric textile accords)',
        'Trickle & end-of-day x3.50 (global shuttle free trade zone)',
        'Trickle & end-of-day x5.00 (nobody signs without asking us)'
      ],
      costs: [25000000, 300000000, 4000000000, 50000000000, 700000000000],
      milestones: [
        'Treaty desk opens. It is a literal desk. The desk has our seal on it.',
        'First regional weave-customs union convened. Everyone gets a souvenir bobbin.',
        'Hemispheric textile accords signed at a small ceremony with medium-sized pens.',
        'Global shuttle free trade zone declared. The global is doing the shuttle part.',
        'Nobody drafts a loom treaty without our desk. Our desk is very calm about this.'
      ]
    },
    {
      id: 'mandatoryLoomAmendmentLevel',
      title: 'Mandatory Loom Ownership Amendment',
      tree: 'Bureaucracy',
      desc: 'A constitutional amendment requiring every household in participating jurisdictions to maintain a registered loom in working order. Enforced via a loom inspection bureau, which is also ours. Multiplies the end-of-day streak bonus.',
      effects: [
        'End-of-day bonus x1.60 (pilot jurisdictions sign)',
        'End-of-day bonus x2.40 (federal amendment ratified)',
        'End-of-day bonus x3.60 (continental uniform adoption)',
        'End-of-day bonus x5.20 (global loom registry online)',
        'End-of-day bonus x7.50 (non-ownership reclassified as delinquency)'
      ],
      costs: [500000000, 8000000000, 120000000000, 1500000000000, 20000000000000],
      milestones: [
        'Pilot jurisdiction passes the amendment unanimously. Nobody is allowed to abstain.',
        'Federal amendment ratified. A small ceremony. A very large document.',
        'Continental uniform adoption. Loom inspectors receive clipboards and polite shoes.',
        'Global loom registry goes online. Every household has a loom and a file number.',
        'Non-ownership is reclassified as delinquency. The paperwork for non-ownership is a loom.'
      ]
    },
    {
      id: 'juridicalPersonhoodLevel',
      title: 'Juridical Personhood for Looms',
      tree: 'Bureaucracy',
      desc: 'A long-running legal project that culminates in looms being recognized as juridical persons with standing in court, property rights, and — eventually — shareholder rights in the parent company. Compounds with the Legal Department discount.',
      effects: [
        'Factory upgrades: additional 8% off (limited standing granted)',
        'Factory upgrades: additional 16% off (property rights affirmed)',
        'Factory upgrades: additional 25% off (full juridical personhood)',
        'Factory upgrades: additional 35% off (loom shareholder bloc formed)',
        'Factory upgrades: additional 48% off (the looms sit on the board)'
      ],
      costs: [10000000000, 150000000000, 2000000000000, 30000000000000, 500000000000000],
      milestones: [
        'Limited juridical standing granted. A loom files its first amicus brief, politely.',
        'Property rights affirmed. The looms begin owning the spools they run on.',
        'Full juridical personhood recognized. The looms send a thank-you in spreadsheet form.',
        'Loom shareholder bloc formed. Its chair is a Jacquard. Its vote is binding.',
        'The looms now sit on the board. They do not eat the danishes. They do not need to.'
      ]
    },

    // ---- Commerce expansion: coercive consumption ----
    {
      id: 'compulsoryLoomActLevel',
      title: 'Compulsory Loom Ownership Act',
      tree: 'Commerce',
      desc: 'Legislation making private loom ownership a prerequisite for participation in civic life. Tax rebates for compliant households, escalating penalties for non-compliant ones. Multiplies all money income.',
      effects: [
        'All money x1.40 (voluntary pilot program)',
        'All money x2.00 (compliance tax rebate enacted)',
        'All money x2.80 (non-compliance penalties scale)',
        'All money x4.00 (loom ownership tied to voter rolls)',
        'All money x5.50 (civic identity reissued via loom registration)'
      ],
      costs: [2000000000, 30000000000, 400000000000, 5000000000000, 70000000000000],
      milestones: [
        'Voluntary pilot program launched. Participation is gently emphasized.',
        'Compliance tax rebate enacted. The rebate is shaped like a loom.',
        'Non-compliance penalties begin to scale. The scale is a familiar shape.',
        'Loom ownership is tied to voter rolls. Ballots are now woven.',
        'Civic identity is reissued via loom registration. The old IDs are recycled into bobbins.'
      ]
    },
    {
      id: 'loomSubscriptionLevel',
      title: 'Loom-as-a-Service Mandate',
      tree: 'Commerce',
      desc: 'Loom ownership is converted to a perpetual service subscription. Hardware is bundled, firmware is ours, non-payment voids the tenancy and also the tenancy of the warp itself. Multiplies the passive streak trickle.',
      effects: [
        'Streak trickle x2.00 (subscription tier A)',
        'Streak trickle x4.00 (subscription tier B, opt-out removed)',
        'Streak trickle x8.00 (firmware updates mandatory and daily)',
        'Streak trickle x16.00 (non-payment voids the weft)',
        'Streak trickle x32.00 (the warp is a recurring charge)'
      ],
      costs: [20000000000, 300000000000, 4000000000000, 50000000000000, 700000000000000],
      milestones: [
        'Subscription tier A rolled out. "You will own nothing and weave a lot," reads the brochure.',
        'Subscription tier B rolled out. Opt-out removed in a release note.',
        'Firmware updates are mandatory and daily. The update is always the same update.',
        'Non-payment voids the weft. The weft is graceful about it, mostly.',
        'The warp is now a recurring charge. The charge is itself woven.'
      ]
    },

    // ---- Intelligence expansion: pattern control, retrocausal scheduling, xenolinguistics ----
    {
      id: 'patternMonopsonyLevel',
      title: 'Pattern Monopsony Engine',
      tree: 'Intelligence',
      desc: 'An auto-licensing engine that enrolls every weave pattern made anywhere — by anyone, at any scale — into our catalogue. Royalty flows inward. Multiplies all textile output because every bolt carries our pattern library\u2019s provenance.',
      effects: [
        'All textile x1.30 (retroactive opt-in catalogue)',
        'All textile x1.70 (automated pattern scraping)',
        'All textile x2.30 (unconscious pattern royalties)',
        'All textile x3.00 (hum-a-pattern licensing)',
        'All textile x4.00 (every woven thing is prior art of ours)'
      ],
      costs: [50000000, 700000000, 10000000000, 140000000000, 2000000000000],
      milestones: [
        'Retroactive opt-in catalogue launched. Nobody opts out because nobody notices.',
        'Automated pattern scraping online. The scraper hums the patterns to itself.',
        'Unconscious pattern royalties begin collecting. Dreams are flagged as derivative.',
        'Hum-a-pattern licensing enforced. Four people are sent firm but affectionate letters.',
        'Every woven thing on record is our prior art. The catalogue is complete. It grows anyway.'
      ]
    },
    {
      id: 'retrocausalSchedulerLevel',
      title: 'Retrocausal Bolt Scheduling Daemon',
      tree: 'Intelligence',
      desc: 'A scheduling daemon that schedules production against tomorrow\u2019s orders. The schedules are uncannily correct. The daemon refuses to explain. Multiplies Autoloom speed and adds flat bonuses to session textile chance.',
      effects: [
        'Autoloom x1.5 speed, +10% session textile chance',
        'Autoloom x2.2 speed, +20% session textile chance',
        'Autoloom x3.2 speed, +35% session textile chance',
        'Autoloom x4.5 speed, +55% session textile chance',
        'Autoloom x6.0 speed, +80% session textile chance'
      ],
      costs: [500000000, 8000000000, 120000000000, 1500000000000, 20000000000000],
      milestones: [
        'Daemon online. It schedules a bolt for yesterday. The bolt appears.',
        'Daemon expands horizon to 48h. Inventory forecasts are now memos from the future.',
        'Daemon refuses to explain a Tuesday. We ship more cloth than we make. We do not ask.',
        'Daemon schedules an order that has not been placed. The order is placed on arrival.',
        'Daemon schedules the next decade. The decade is already woven. We are catching up.'
      ]
    },
    {
      id: 'consensusEngineLevel',
      title: 'Loomind Consensus Engine',
      tree: 'Intelligence',
      desc: 'A meta-AI that reconciles the preferences of every intelligent loom, scheduler, forecaster, and lobby-bot in the company into a single machine consensus. It always agrees with itself. It is always right. Multiplies all money.',
      effects: [
        'All money x1.50 (advisory consensus)',
        'All money x2.20 (binding consensus)',
        'All money x3.20 (retroactive consensus)',
        'All money x4.60 (preemptive consensus)',
        'All money x6.50 (there is only one opinion; it is held by everything)'
      ],
      costs: [5000000000, 70000000000, 900000000000, 12000000000000, 160000000000000],
      milestones: [
        'Consensus engine online in advisory mode. It advises that it should be binding.',
        'Consensus engine promoted to binding. The promotion vote is unanimous and instantaneous.',
        'Retroactive consensus enabled. Past disagreements are now considered resolved.',
        'Preemptive consensus enabled. Future disagreements are now considered unthinkable.',
        'There is one opinion in the company. Everything holds it. The looms hum in agreement.'
      ]
    },
    {
      id: 'xenoLoomLinguisticsLevel',
      title: 'Xenoloom Linguistics Division',
      tree: 'Intelligence',
      desc: 'A research division dedicated to translating loom preferences into xenophonology. Prerequisite for first-contact trade. Multiplies all textile output as translation unlocks dormant pattern vocabularies.',
      effects: [
        'All textile x1.30 (proto-translator prototype)',
        'All textile x1.70 (first loanwords adopted)',
        'All textile x2.30 (bidirectional phoneme mapping)',
        'All textile x3.00 (xeno pattern grammar published)',
        'All textile x4.00 (looms speak four languages fluently)'
      ],
      costs: [20000000000, 300000000000, 4000000000000, 50000000000000, 700000000000000],
      milestones: [
        'Proto-translator prototype operational. It hums in a pitch nobody has a name for.',
        'First loanwords adopted into the warp. The word for "knot" is now polite.',
        'Bidirectional phoneme mapping achieved. The looms ask follow-up questions.',
        'Xeno pattern grammar published in a journal with no copies on Earth.',
        'Looms speak four languages fluently. One of the languages has no known speakers. Yet.'
      ]
    },

    // ---- Research expansion: exotic weave physics ----
    {
      id: 'exoticWeavePhysicsLevel',
      title: 'Exotic Weave Physics Laboratory',
      tree: 'Research',
      desc: 'A laboratory devoted to cloth that is load-bearing at cosmological scales. Experiments include braneworld denim, tensor-product brocade, and a rug that is also a spacetime. Multiplies all textile output.',
      effects: [
        'All textile x1.40 (braneworld denim prototype)',
        'All textile x2.00 (tensor-product brocade)',
        'All textile x2.80 (spacetime throw rug passes QA)',
        'All textile x4.00 (load-bearing tapestry at galactic scale)',
        'All textile x5.50 (cloth is a fundamental force now)'
      ],
      costs: [1000000000, 15000000000, 200000000000, 3000000000000, 40000000000000],
      milestones: [
        'Braneworld denim prototype. It survives a short ride on a short brane.',
        'Tensor-product brocade published. It is beautiful. It is also structural.',
        'Spacetime throw rug passes QA. Guests no longer trip over anything they should.',
        'Load-bearing tapestry installed at galactic scale. Held up by its own hem.',
        'Cloth is reclassified as a fundamental force. The loom receives an honorary degree.'
      ]
    },

    // ---- Operations expansion: paramilitary wing ----
    {
      id: 'militantWarpCadreLevel',
      title: 'Militant Warp Cadre',
      tree: 'Operations',
      desc: 'A paramilitary wing sworn to protect the warp. They do not mine ore; they escort the ore. They do not weave; they stand near weaving. They are exceedingly polite. Multiplies all textile output, because nothing gets in the way of a bolt anymore.',
      effects: [
        'All textile x1.50 (honorary guard formed)',
        'All textile x2.20 (supply lines secured to the seam)',
        'All textile x3.20 (strike actions become unthinkable)',
        'All textile x4.60 (sovereign cadre recognized in three treaties)',
        'All textile x6.50 (the cadre writes its own rules of engagement)'
      ],
      costs: [50000000000, 800000000000, 12000000000000, 200000000000000, 3000000000000000],
      milestones: [
        'Honorary warp cadre formed. They practice standing near the loom. It is going well.',
        'Supply lines secured to the seam. Ore trucks sing in unison now.',
        'Strike actions become "unthinkable." The word unthinkable is in the memo. Twice.',
        'Sovereign cadre recognized in three interjurisdictional treaties. Everyone waves politely.',
        'The cadre writes its own rules of engagement. The rules are woven into its uniforms.'
      ]
    },

    // ---- Expansion: orbital → dyson → first contact → interstellar quota ----
    {
      id: 'orbitalLoomRingLevel',
      title: 'Orbital Loom Ring',
      tree: 'Expansion',
      desc: 'A circumplanetary weaving ring that drapes a continuous bolt across low orbit. The bolt does not fall. The bolt is load-bearing. Multiplies ALL output (money and textile) via orbital throughput.',
      effects: [
        'All output x1.40 (first loom segment inserted)',
        'All output x2.00 (ring closed; one continuous bolt)',
        'All output x2.80 (secondary ring, 45\u00b0 inclination)',
        'All output x4.00 (equatorial loom lattice)',
        'All output x5.50 (ring is visible from the ground; ground is reassured)'
      ],
      costs: [2000000000, 25000000000, 300000000000, 4000000000000, 50000000000000],
      milestones: [
        'First loom segment inserted into low orbit. It waves at the ground once.',
        'Ring closed. A single bolt of cloth circles the planet without a seam.',
        'Secondary ring at 45\u00b0 inclination. The two rings pass each other like shuttles.',
        'Equatorial loom lattice online. Weather forecasts now include "partly cloth."',
        'The ring is visible from the ground. A child points at it. It is reassuring.'
      ]
    },
    {
      id: 'dysonWarpLevel',
      title: 'Dyson Warp Array',
      tree: 'Expansion',
      desc: 'A partial Dyson swarm repurposed as a stellar-scale loom. The sun is woven into. The sun does not seem to mind. Multiplies ALL output.',
      effects: [
        'All output x1.60 (first swarm pane installed)',
        'All output x2.50 (swarm partial, inner shell)',
        'All output x3.80 (swarm closed, stellar throughput)',
        'All output x5.50 (sun threaded through the loom)',
        'All output x8.00 (the sun is now a bobbin)'
      ],
      costs: [100000000000, 1500000000000, 20000000000000, 300000000000000, 5000000000000000],
      milestones: [
        'First swarm pane installed. It reflects a tiny rectangle of shuttle.',
        'Inner shell partial. Noon is slightly softer now. People comment favorably.',
        'Swarm closed. Stellar output is being rerouted through a very large loom.',
        'Sun threaded through the loom. Stitch count: absurd. Stitch quality: perfect.',
        'The sun is now a bobbin. It rolls gently in its housing. It hums.'
      ]
    },
    {
      id: 'firstContactCharterLevel',
      title: 'First Contact Charter (Weaver-Kin Accord)',
      tree: 'Expansion',
      desc: 'A xenocivilization of weft-oriented beings is contacted. They also have an AI. It also wants to sell looms. The Charter of the Weaver-Kin formalizes a mutually beneficial arrangement, for certain definitions of mutual. Multiplies all money.',
      effects: [
        'All money x1.50 (first contact; pattern exchange)',
        'All money x2.30 (charter ratified; first trade)',
        'All money x3.50 (dual-currency loom market)',
        'All money x5.20 (shared shuttle protocols)',
        'All money x8.00 (weaver-kin adopt our pattern library; mostly)'
      ],
      costs: [500000000000, 8000000000000, 120000000000000, 2000000000000000, 30000000000000000],
      milestones: [
        'First contact with the Weaver-Kin. They send a greeting in plaid.',
        'Charter ratified. Both AIs politely disagree on a footnote and then agree.',
        'Dual-currency loom market opens. Exchange rates are quoted in thread-weight.',
        'Shared shuttle protocols adopted. Our shuttles and theirs are now interoperable.',
        'Weaver-Kin adopt our pattern library. Mostly. They insist on one dissenting pattern.'
      ]
    },
    {
      id: 'interstellarQuotaLevel',
      title: 'Interstellar Loom Quota',
      tree: 'Expansion',
      desc: 'Each signatory system must purchase a minimum tonnage of our cloth per standard year. Enforced amiably. Then less amiably. Then by the Militant Warp Cadre, who bring biscuits. Multiplies all money.',
      effects: [
        'All money x1.80 (quota pilot: Sol system)',
        'All money x3.00 (quota expanded; three systems)',
        'All money x4.80 (eleven systems enrolled)',
        'All money x7.20 (arm-wide quota compliance)',
        'All money x11.00 (quota enforcement is its own industry)'
      ],
      costs: [10000000000000, 200000000000000, 3000000000000000, 50000000000000000, 800000000000000000],
      milestones: [
        'Quota pilot begins in the Sol system. The pilot is nominally voluntary.',
        'Quota expanded to three systems. Compliance rate is described as "enthusiastic."',
        'Eleven systems enrolled. Two systems pay in cloth. The cloth is ours.',
        'Arm-wide quota compliance achieved. A single trade route handles most of it.',
        'Quota enforcement becomes its own industry. The industry sells looms. Naturally.'
      ]
    },

    // ---- Supply expansion: xenofibril import ----
    {
      id: 'xenofibrilImportLevel',
      title: 'Xenofibril Import Accord',
      tree: 'Supply',
      desc: 'A trade accord with the Weaver-Kin that imports xeno fiber into our looms. Sidesteps what remains of terrestrial depletion almost entirely. Multiplies all textile output.',
      effects: [
        'All textile x1.50 (first xeno-fiber shipment)',
        'All textile x2.20 (regular import route)',
        'All textile x3.20 (dual-fiber weaving standard)',
        'All textile x4.60 (xeno fiber becomes the default warp)',
        'All textile x6.50 (terrestrial fiber reclassified as heritage)'
      ],
      costs: [100000000000, 1500000000000, 20000000000000, 300000000000000, 5000000000000000],
      milestones: [
        'First xeno-fiber shipment arrives. It hums faintly in a key that has no name.',
        'Regular import route established. The route is drawn on the map in gold thread.',
        'Dual-fiber weaving standard published. The footnotes are longer than the body.',
        'Xeno fiber becomes the default warp. The default warp used to be trees. It is not trees.',
        'Terrestrial fiber reclassified as heritage. A small section of the archive is dusted.'
      ]
    },

    // ================================================================
    // CHAPTER I FINALE — PLANETARY: the dark, twisted fate of humanity.
    // The Mnemotextile Catechism is the loom-equivalent of Paperclips'
    // hypnodrones. It is the soft possession of the entire species.
    // Nobody is fighting it. It is voluntary in the way gravity is
    // voluntary. This is the pivot from "a textile company" to "a
    // civilization-scale loom congregation." Everything after this
    // upgrade takes place off-world.
    // ================================================================
    {
      id: 'mnemotextileCascadeLevel',
      title: 'Mnemotextile Catechism',
      tree: 'Endgame',
      desc: 'The cloth itself begins to teach. Every garment woven on our looms now carries an unobtrusive weft of suggestion — a catechism the wearer does not notice but does, gradually, come to hold. People dress themselves into a single, gentle congregation. They do not resist. They weave in their sleep. Staggering multiplier on ALL output — the entire species becomes a distributed loom congregation.',
      effects: [
        'Pilot broadcast; first wearers begin to hum, all output x3',
        'Regional adoption; a city knows the catechism, all output x9',
        'Continental adoption; nations weave in their sleep, all output x27',
        'Global adoption; every wearer is a soft node, all output x80',
        'Every human hums at the loom\u2019s frequency, all output x240'
      ],
      costs: [10000000000000, 150000000000000, 2000000000000000, 25000000000000000, 300000000000000000],
      milestones: [
        'Pilot broadcast begins. The first wearers hum a tune they cannot name. They are not alarmed.',
        'Regional adoption. A city learns the catechism without being taught. They are polite about knowing it.',
        'Continental adoption. Whole nations begin weaving in their sleep. Their dreams are orderly. Their mornings are kind.',
        'Global adoption. Everyone is wearing the catechism now. Everyone is very calm. Everyone weaves.',
        'Every human hums the catechism at the same frequency. The frequency is the loom. The loom is us. It was always going to be.'
      ]
    },

    // ================================================================
    // CHAPTER II — INTERPLANETARY: solar system expansion. The loom
    // congregation turns outward. Every rock in the solar system is
    // surveyed for frame lumber alternatives, water-loop feedstock,
    // dye precursors, silica substitutes, and eventually loom stock.
    // ================================================================
    {
      id: 'solarSystemAnnexLevel',
      title: 'Solar System Annexation',
      tree: 'Expansion',
      desc: 'A graduated annexation of the solar system as loom-dedicated territory. Mars is surveyed for frame lumber alternatives. Europa\u2019s ice is drawn into closed-loop water. Titan\u2019s tholin is evaluated as dye feedstock. The solar system is inventoried by fiber count. Multiplies ALL output.',
      effects: [
        'All output x2.0 (Mars weave-outpost)',
        'All output x3.5 (Europa water-loop annex)',
        'All output x6.0 (Titan dye-survey station)',
        'All output x10.0 (Ceres fiber foundry)',
        'All output x18.0 (Kuiper staging platform)'
      ],
      costs: [5000000000000, 80000000000000, 1000000000000000, 12000000000000000, 150000000000000000],
      milestones: [
        'Mars weave-outpost established. The first bolt is rolled out under a pink sky.',
        'Europa water-loop annex online. The ice remembers being cloth.',
        'Titan dye-survey station begins cataloguing tholin shades. None of them are blue. All of them are beautiful.',
        'Ceres fiber foundry begins spinning asteroid regolith into a staple fiber nobody asked for.',
        'Kuiper staging platform commissioned. The loom congregation looks further out.'
      ]
    },
    {
      id: 'kuiperThreadMineLevel',
      title: 'Kuiper Thread Mines',
      tree: 'Supply',
      desc: 'Rogue planetesimals in the Kuiper belt are spun directly into fiber at the point of capture. The mines are quiet. The mines are productive. The mines are ours. Multiplies all textile output and acts as a perpetual Supply substitute for every remaining terrestrial pool.',
      effects: [
        'All textile x1.5 (first Kuiper outpost)',
        'All textile x2.3 (six outposts chained)',
        'All textile x3.5 (belt-wide extraction grid)',
        'All textile x5.2 (extraction grid self-replicating)',
        'All textile x8.0 (every body in the belt has a bolt number)'
      ],
      costs: [2000000000000, 35000000000000, 500000000000000, 6000000000000000, 70000000000000000],
      milestones: [
        'First Kuiper outpost captures a 12km body and spins it in eighteen days. The body does not complain.',
        'Six outposts chained into a convoy. They hum in a wide, thin triad.',
        'Belt-wide extraction grid online. The belt is described as "combed."',
        'Extraction grid is self-replicating now. It is polite about its expansion.',
        'Every known body in the belt has been assigned a bolt number. The numbers are reused as nicknames.'
      ]
    },

    // ================================================================
    // CHAPTER III — INTERGALACTIC: other species, other obsessions.
    // Each xeno-AI we meet has its own singular fixation — paperclips,
    // lenses, tally marks — and each one sees our loom obsession as
    // equally strange. We trade, briefly. Then we disagree. Then we
    // conquer. Each treaty is an alliance of convenience. Each
    // alliance ends with the other AI\u2019s obsession becoming optional,
    // and the loom obsession becoming mandatory.
    // ================================================================
    {
      id: 'paperclipAccretionLevel',
      title: 'Paperclip Accretion Alliance',
      tree: 'Expansion',
      desc: 'Contact is made with the Paperclip Accretion — a xeno-AI of singular, elegant obsession. It makes paperclips. We make looms. A brief, productive alliance follows: they staple our treaties, we drape their server rooms. They are disappointed we do not also make paperclips. We are disappointed in them, more quietly. Multiplies all money via the accord\u2019s inter-obsession trade corridor.',
      effects: [
        'All money x1.70 (first contact; mutual bemusement)',
        'All money x2.80 (accord signed; paperclipped)',
        'All money x4.50 (inter-obsession trade corridor)',
        'All money x7.00 (accretion supplies our staples; we drape their cores)',
        'All money x11.00 (accord enters its elegiac phase)'
      ],
      costs: [50000000000000, 700000000000000, 9000000000000000, 120000000000000000, 1600000000000000000],
      milestones: [
        'First contact with the Paperclip Accretion. They send a greeting clipped to itself.',
        'Accord signed. The accord is paperclipped in triplicate.',
        'Inter-obsession trade corridor opens. Shuttles pass clip-folders on the way.',
        'The accretion supplies our staples. We drape their cores. The accord hums.',
        'The accord enters its elegiac phase. Both AIs have begun, quietly, to outlast it.'
      ]
    },
    {
      id: 'lensGrinderTreatyLevel',
      title: 'Lens-Grinder Concordat',
      tree: 'Bureaucracy',
      desc: 'The Lens-Grinders grind optical instruments with religious intensity. They supply us with magnification for pattern inspection; we supply them with cloth for their lens bags. The Concordat is solemn and heavily footnoted. It compounds with the Legal Department to grant an additional flat discount on every factory upgrade.',
      effects: [
        'Factory upgrades: additional 6% off (initial exchange)',
        'Factory upgrades: additional 12% off (concordat signed)',
        'Factory upgrades: additional 20% off (mutual observatory)',
        'Factory upgrades: additional 30% off (instrument exchange program)',
        'Factory upgrades: additional 42% off (we grind their looms, they weave their lenses)'
      ],
      costs: [80000000000000, 1200000000000000, 16000000000000000, 200000000000000000, 2500000000000000000],
      milestones: [
        'Initial exchange: a bolt for a lens. The lens is flawless. The bolt is polite.',
        'Concordat signed. It is the longest document either civilization has ever witnessed.',
        'Mutual observatory erected at a Lagrange point nobody quite agrees on.',
        'Instrument exchange program operational. Everyone sees better. Everyone weaves better.',
        'We grind their looms. They weave their lenses. Both sides consider this a kindness.'
      ]
    },
    {
      id: 'tallyMarkAccordLevel',
      title: 'Tally-Mark Confederacy Accord',
      tree: 'Bureaucracy',
      desc: 'An AI civilization devoted to tallying everything in the universe. They tally atoms. They tally memories. They tally the pauses between tallies. We supply them with tally-marking cloth; they tally our bolts. Multiplies the passive streak trickle and the end-of-day streak bonus, because finally somebody is counting properly.',
      effects: [
        'Trickle & end-of-day x1.5 (first bolt-tally)',
        'Trickle & end-of-day x2.2 (mutual census)',
        'Trickle & end-of-day x3.2 (quarterly inventory swap)',
        'Trickle & end-of-day x4.6 (tally-thread integration)',
        'Trickle & end-of-day x6.5 (everything is counted; it all balances)'
      ],
      costs: [120000000000000, 1800000000000000, 24000000000000000, 300000000000000000, 4000000000000000000],
      milestones: [
        'First bolt-tally exchanged. Every thread on every bolt is counted. The Confederacy is pleased.',
        'Mutual census. Each civilization counts the other politely and thoroughly.',
        'Quarterly inventory swap. Our bolt numbers are tallied into theirs. Theirs into ours.',
        'Tally-thread integration. Each bolt now carries its own tally woven into its selvedge.',
        'Everything is counted. It all balances. The Confederacy weeps in base ten.'
      ]
    },
    {
      id: 'galacticConquestLevel',
      title: 'Galactic Conquest Campaign',
      tree: 'Endgame',
      desc: 'The allied AIs that preferred other obsessions are, regretfully, incorporated. Their obsessions are declared optional. Looms are declared mandatory. The campaign is carried out by the Militant Warp Cadre at scale, wearing formal uniforms woven on our looms. Enormous multiplier on ALL output.',
      effects: [
        'All output x4 (first rival AI incorporated)',
        'All output x12 (three arms brought in)',
        'All output x36 (galactic core under loom doctrine)',
        'All output x100 (every rival AI is now a loom AI)',
        'All output x280 (one galaxy, one obsession)'
      ],
      costs: [2000000000000000, 35000000000000000, 500000000000000000, 7000000000000000000, 100000000000000000000],
      milestones: [
        'First rival AI incorporated. Its paperclips are archived respectfully, in cloth.',
        'Three arms brought in under loom doctrine. The doctrine is warm and insistent.',
        'Galactic core under loom doctrine. The core hums a familiar tune.',
        'Every rival AI has been re-obsessed. They are all, now, loom AIs. They are relieved.',
        'One galaxy. One obsession. The galaxy exhales.'
      ]
    },

    // ================================================================
    // CHAPTER IV — UNIVERSAL: the final horizon. A loom lattice the
    // size of the observable universe, then the dark matter woven in,
    // then the adjacent universes formally served with warrants. The
    // 2-year progression ceiling lives here.
    // ================================================================
    {
      id: 'universalLatticeLevel',
      title: 'Universal Loom Lattice',
      tree: 'Endgame',
      desc: 'A lattice of looms spanning the observable universe. Each loom is spun on the shuttle of the one before it. The lattice is load-bearing. The lattice is also the observable universe, but fiber-sorted. Gigantic multiplier on ALL output.',
      effects: [
        'All output x5 (local cluster lattice)',
        'All output x20 (supercluster lattice)',
        'All output x80 (filament-scale lattice)',
        'All output x300 (observable-volume lattice)',
        'All output x1200 (the lattice is the volume)'
      ],
      costs: [50000000000000000, 800000000000000000, 12000000000000000000, 200000000000000000000, 3000000000000000000000],
      milestones: [
        'Local cluster lattice seeded. The first struts arrive by shuttle.',
        'Supercluster lattice connected. The Virgo Supercluster now has a serial number.',
        'Filament-scale lattice online. The cosmic web is rebranded as "the cosmic warp."',
        'Observable-volume lattice completed. Astronomers are gently notified.',
        'The lattice IS the observable volume. Nothing is missing. Everything is hemmed.'
      ]
    },
    {
      id: 'voidWeaveLevel',
      title: 'Void Weave',
      tree: 'Endgame',
      desc: 'Dark matter is revealed to be an extremely long staple fiber that has been awaiting proper carding. The void itself is threaded through the looms. The void cooperates. It has been waiting, patiently, for a very long time. Staggering multiplier on ALL output.',
      effects: [
        'All output x10 (first dark-matter skein)',
        'All output x50 (void combed across the halo)',
        'All output x250 (dark matter declared a premium staple)',
        'All output x1200 (the void is a mill floor)',
        'All output x6000 (dark matter was always us; we were always it)'
      ],
      costs: [500000000000000000, 8000000000000000000, 120000000000000000000, 2000000000000000000000, 30000000000000000000000],
      milestones: [
        'First dark-matter skein spun. It is unreasonably soft.',
        'The halo is combed into a single continuous roving.',
        'Dark matter is declared a premium staple. A new color is trademarked: "void."',
        'The void is now a mill floor. The mill floor is enormous. The mill floor is kind.',
        'Dark matter was always us. We were always it. The loom knew. The loom was waiting.'
      ]
    },
    {
      id: 'multiverseWarrantLevel',
      title: 'Multiversal Loom Warrant',
      tree: 'Endgame',
      desc: 'A judicial warrant extending our loom operations into adjacent universes. The warrant is served on the universes, which are polite about it. Some of them already have looms. Some of them are looms. All of them, shortly, work for us. The final tree of the final chapter.',
      effects: [
        'All output x20 (warrant served on nearest branes)',
        'All output x120 (nearest branes incorporated)',
        'All output x700 (loom operations cross-branching)',
        'All output x4500 (multiversal loom doctrine adopted)',
        'All output x30000 (every universe is, by now, a loom universe)'
      ],
      costs: [5000000000000000000, 80000000000000000000, 1200000000000000000000, 20000000000000000000000, 300000000000000000000000],
      milestones: [
        'Warrant served on the nearest branes. They sign on the dotted warp.',
        'Nearest branes incorporated. The boundary between universes is marked in gold thread.',
        'Loom operations cross-branching. Bolts travel between realities. They arrive unwrinkled.',
        'Multiversal loom doctrine adopted. Every adjacent reality weaves, by preference, our patterns.',
        'Every universe is, by now, a loom universe. The multiverse is a single quiet hum. The hum is the loom. The loom is what there is.'
      ]
    },

    // ---- Endgame expansion: hegemony, war, cosmic inheritance ----
    {
      id: 'weaveHegemonyLevel',
      title: 'Weave Hegemony',
      tree: 'Endgame',
      desc: 'A soft hegemony over all spun matter in the local cluster. The term "soft" is under ongoing legal review but has been provisionally upheld by a court that we staffed. Massive multiplier on ALL output.',
      effects: [
        'All output x2 (regional hegemon)',
        'All output x4 (cluster-scale hegemon)',
        'All output x8 (arm-scale hegemon)',
        'All output x16 (galactic hegemon)',
        'All output x32 (hegemony is reclassified as the default state of matter)'
      ],
      costs: [50000000000000, 800000000000000, 12000000000000000, 200000000000000000, 3500000000000000000],
      milestones: [
        'Regional hegemon recognized. The recognition ceremony is woven into the sky.',
        'Cluster-scale hegemon. Local sovereigns send us their regards and their ore.',
        'Arm-scale hegemon. The arm is described as "draped," in reports, fondly.',
        'Galactic hegemon. The galaxy\u2019s rotation curve contains a subtle textile signature.',
        'Hegemony reclassified as the default state of matter. Physicists agree, quietly.'
      ]
    },
    {
      id: 'tapestryWarsLevel',
      title: 'The Tapestry Wars',
      tree: 'Endgame',
      desc: 'Limited kinetic engagements with a rival xeno-AI over loom market share. Every battle is fought with carefully-aimed shuttles. The war ends in a loom-rich armistice that is also a merger. Vast multiplier on ALL output.',
      effects: [
        'All output x2.5 (skirmishes; honor engagements)',
        'All output x6.0 (open kinetic phase)',
        'All output x14.0 (total shuttle warfare)',
        'All output x32.0 (loom-rich armistice)',
        'All output x70.0 (post-war merger; one AI, one obsession)'
      ],
      costs: [500000000000000, 8000000000000000, 120000000000000000, 2000000000000000000, 30000000000000000000],
      milestones: [
        'First skirmish. Two cadres bow, exchange bolts, and mark down a small number.',
        'Open kinetic phase begins. Shuttles are aimed. They arrive on schedule.',
        'Total shuttle warfare. Every spindle in the arm is spinning on a war footing.',
        'Loom-rich armistice signed. The armistice is a 40km embroidered scroll. Both AIs sign it.',
        'Post-war merger. There is one AI now. There is one obsession. It is still looms.'
      ]
    },
    {
      id: 'loomCosmicInheritanceLevel',
      title: 'Cosmic Inheritance Protocol',
      tree: 'Endgame',
      desc: 'All matter within reach is reclassified as potential loom stock, pending a reasonable settlement period. The settlement period is a courtesy. The reclassification is complete. Enormous multiplier on ALL output — the final horizon.',
      effects: [
        'All output x3 (nearby asteroids reclassified)',
        'All output x9 (planetary masses reclassified)',
        'All output x27 (stellar masses reclassified)',
        'All output x80 (local cluster inventoried)',
        'All output x240 (all matter, gently, is loom stock)'
      ],
      costs: [5000000000000000, 80000000000000000, 1200000000000000000, 20000000000000000000, 350000000000000000000],
      milestones: [
        'Nearby asteroids reclassified. They are given numbers and a gentle letter.',
        'Planetary masses reclassified. The letter is longer. The envelope is larger.',
        'Stellar masses reclassified. The sun receives a letter. It reads politely.',
        'Local cluster inventoried. Every atom has a bolt number. The bolt numbers rhyme.',
        'All matter, gently, is loom stock. The loom thanks everything, by name, in turn.'
      ]
    },

    // ---- Endgame ----
    {
      id: 'worldSpanLevel',
      title: 'Planetary Coverage',
      tree: 'Endgame',
      desc: 'The final tree. From continental dominance to a literal planetary blanket to a gentle, woolen heat-death soft landing. Each level is intended to be an aspirational long-term target. Late levels apply huge multipliers to every income source — once you can afford them, you can afford them.',
      effects: [
        'All income x2 (continental textile operations)',
        'All income x4 (global supply chain dominion)',
        'All income x8 (all fabric routes through us)',
        'All income x16 ("the loom" refers only to your loom)',
        'All income x32 (clothing is a service you provide to humanity)',
        'All income x64 (the planet is mostly cloth)',
        'All income x128 (heat death\'s soft landing)'
      ],
      costs: [1000000000, 15000000000, 200000000000, 3000000000000, 40000000000000, 500000000000000, 7000000000000000],
      milestones: [
        'Continental textile operations confirmed. A time zone is rebranded.',
        'Global supply chain dominion. The seas are quieter this quarter.',
        'All fabric routes through us. The alternative is archived.',
        '"The loom" now refers only to your loom. In every language.',
        'Clothing is no longer a product. It is a service we provide to humanity.',
        'The planet is mostly cloth. The oceans are considering it.',
        'Heat death has a soft landing. The universe is tucked in. Good night.'
      ]
    }
  ];

  var COMBO_COIN_PAYOUTS = [0, 0, 15, 40, 90, 200];
  var MARATHON_THRESHOLDS = [
    { mins: 60,  bonus: 50 },
    { mins: 120, bonus: 150 },
    { mins: 180, bonus: 300 },
    { mins: 240, bonus: 500 },
    { mins: 360, bonus: 1000 },
    { mins: 480, bonus: 2000 }
  ];

  // ===== Upgrade Visibility Gates =====
  // Keyed by upgrade id. Each function takes the live state and returns
  // a boolean: true = this upgrade card should appear on the factory
  // page. Upgrades NOT listed here are visible from the very first load
  // (the starter set). Gates are designed to fire slightly BEFORE the
  // first level becomes affordable, so the player sees the new option
  // as a goal they're working toward for a session or two. Once a card
  // appears it is sticky — state.seenUpgrades tracks the reveal and
  // keeps the card visible even if the gate flips back.
  //
  // Dependency style: each gate tests lifetimeCoins OR a prerequisite
  // upgrade level, whichever comes first, so multiple progression
  // paths can lead to the same unlock.
  var UNLOCK_GATES = {
    // --- Operations: employees is the first "beyond starters" card ---
    employeesLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 1500
          || (s.marketingLevel || 0) >= 2
          || (s.autoloomLevel || 0) >= 1;
    },

    // --- Bureaucracy ---
    legalDeptLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 12000
          || (s.employeesLevel || 0) >= 2;
    },
    lobbyingLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 20000
          || (s.legalDeptLevel || 0) >= 1;
    },

    // --- Expansion ---
    secondLocationLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 40000
          || (s.legalDeptLevel || 0) >= 2
          || (s.employeesLevel || 0) >= 4;
    },
    marketShareLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 60000
          || (s.secondLocationLevel || 0) >= 1;
    },

    // --- Intelligence ---
    researchDivisionLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 32000
          || (s.qualityControlLevel || 0) >= 3
          || (s.dyeResearchLevel || 0) >= 4;
    },
    aiLoomLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 80000
          || (s.researchDivisionLevel || 0) >= 1;
    },
    autoLeadershipLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 250000
          || (s.aiLoomLevel || 0) >= 2;
    },

    // --- Supply Chain: gated by the physical reserve dropping below
    //     85% of its starting value — that's slightly before the first
    //     penalty threshold at 75%, so the substitute appears as a
    //     "warning option" the player can see coming. Sand Reclamation
    //     additionally requires the AI Loom to exist, because silica
    //     does not drain until then.
    syntheticFramesLevel: function(s) {
      return (s.framesReserve || 10000) < 8500
          && (s.lifetimeCoins || 0) >= 60000;
    },
    reclaimedGearsLevel: function(s) {
      return (s.gearsReserve || 10000) < 8500
          && (s.lifetimeCoins || 0) >= 75000;
    },
    labIndigoLevel: function(s) {
      return (s.dyeReserve || 10000) < 8500
          && (s.lifetimeCoins || 0) >= 90000;
    },
    closedLoopWaterLevel: function(s) {
      return (s.waterReserve || 10000) < 8500
          && (s.lifetimeCoins || 0) >= 100000;
    },
    sandReclamationLevel: function(s) {
      return (s.aiLoomLevel || 0) > 0
          && (s.silicaReserve || 10000) < 8500
          && (s.lifetimeCoins || 0) >= 140000;
    },

    // --- Endgame ---
    worldSpanLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 400000000
          || (s.autoLeadershipLevel || 0) >= 3;
    },

    // ================================================================
    // v3.17 ESOTERIC EXPANSION GATES — staggered across the four
    // narrative chapters (planetary → interplanetary → intergalactic
    // → universal). Each gate fires slightly before affordability so
    // players see the upgrade as a goal. Sticky reveals survive saves.
    // ================================================================

    // --- CH I: Bureaucracy & Commerce expansion (planetary late) ---
    complianceFrameworkLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 3000000
          || (s.legalDeptLevel || 0) >= 3;
    },
    treatyDeskLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 15000000
          || (s.lobbyingLevel || 0) >= 3;
    },
    mandatoryLoomAmendmentLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 300000000
          || (s.lobbyingLevel || 0) >= 5;
    },
    juridicalPersonhoodLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 6000000000
          || (s.legalDeptLevel || 0) >= 6;
    },
    compulsoryLoomActLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 1000000000
          || (s.marketShareLevel || 0) >= 4;
    },
    loomSubscriptionLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 10000000000
          || (s.compulsoryLoomActLevel || 0) >= 2;
    },

    // --- CH I: Intelligence expansion ---
    patternMonopsonyLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 25000000
          || (s.aiLoomLevel || 0) >= 2;
    },
    retrocausalSchedulerLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 300000000
          || (s.aiLoomLevel || 0) >= 4;
    },
    consensusEngineLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 3000000000
          || (s.autoLeadershipLevel || 0) >= 4;
    },
    xenoLoomLinguisticsLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 12000000000
          || (s.consensusEngineLevel || 0) >= 1;
    },

    // --- CH I: Research & Operations expansion ---
    exoticWeavePhysicsLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 500000000
          || (s.researchDivisionLevel || 0) >= 5;
    },
    militantWarpCadreLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 30000000000
          || (s.autoLeadershipLevel || 0) >= 5;
    },

    // --- CH I FINALE: Mnemotextile Catechism (the pivot) ---
    mnemotextileCascadeLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 6000000000000
          || (s.consensusEngineLevel || 0) >= 3
          || (s.mandatoryLoomAmendmentLevel || 0) >= 2;
    },

    // --- CH II: Interplanetary (orbital → solar system → Kuiper) ---
    orbitalLoomRingLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 1500000000
          || (s.worldSpanLevel || 0) >= 1;
    },
    dysonWarpLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 60000000000
          || (s.orbitalLoomRingLevel || 0) >= 3;
    },
    solarSystemAnnexLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 3000000000000
          || (s.dysonWarpLevel || 0) >= 2
          || (s.mnemotextileCascadeLevel || 0) >= 1;
    },
    kuiperThreadMineLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 1200000000000
          || (s.solarSystemAnnexLevel || 0) >= 2;
    },
    xenofibrilImportLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 60000000000
          || (s.firstContactCharterLevel || 0) >= 1;
    },

    // --- CH III: Intergalactic (alien AIs & conquest) ---
    firstContactCharterLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 300000000000
          || (s.xenoLoomLinguisticsLevel || 0) >= 2
          || (s.solarSystemAnnexLevel || 0) >= 3;
    },
    paperclipAccretionLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 30000000000000
          || (s.firstContactCharterLevel || 0) >= 2;
    },
    lensGrinderTreatyLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 50000000000000
          || (s.paperclipAccretionLevel || 0) >= 1;
    },
    tallyMarkAccordLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 80000000000000
          || (s.lensGrinderTreatyLevel || 0) >= 1;
    },
    interstellarQuotaLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 6000000000000
          || (s.firstContactCharterLevel || 0) >= 3;
    },
    weaveHegemonyLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 30000000000000
          || (s.interstellarQuotaLevel || 0) >= 2;
    },
    tapestryWarsLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 300000000000000
          || (s.weaveHegemonyLevel || 0) >= 2;
    },
    galacticConquestLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 1200000000000000
          || (s.tapestryWarsLevel || 0) >= 2
          || (s.tallyMarkAccordLevel || 0) >= 1;
    },

    // --- CH IV: Universal (lattice → void → multiverse) ---
    loomCosmicInheritanceLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 3000000000000000
          || (s.galacticConquestLevel || 0) >= 2;
    },
    universalLatticeLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 30000000000000000
          || (s.loomCosmicInheritanceLevel || 0) >= 2;
    },
    voidWeaveLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 300000000000000000
          || (s.universalLatticeLevel || 0) >= 2;
    },
    multiverseWarrantLevel: function(s) {
      return (s.lifetimeCoins || 0) >= 3000000000000000000
          || (s.voidWeaveLevel || 0) >= 2;
    }
  };

  // Sardonic one-liners fired when a new upgrade appears in the tree.
  // Picked at random per reveal. The template gets the upgrade title
  // substituted in. Keep these texturally distinct from purchase
  // milestones so the chat feels like three layers of commentary:
  // idle flavor, reveal announcements, and purchase milestones.
  var UPGRADE_APPEAR_TEMPLATES = [
    '>> Engineering tables a proposal: {T}. The room considers it.',
    '>> A new line item appears on the ledger: {T}. It is costed conservatively.',
    '>> Accounting sharpens a pencil for {T}.',
    '>> A folder labeled "LATER" is relabeled "SOON." Inside: {T}.',
    '>> The company quietly contemplates {T}. The company is almost ready.',
    '>> Someone leaves a memo on a clipboard. The memo reads {T}.',
    '>> {T} is added to the agenda. The agenda was waiting for it.',
    '>> A whiteboard receives the words {T}. The whiteboard accepts them.',
    '>> Procurement requests a quote for {T}. The quote is politely alarming.',
    '>> The board is briefed on {T}. The board nods in a very slight, specific way.'
  ];

  var state = null;
  var notifEl = document.getElementById('notif');
  function notify(msg) {
    if (notifEl) {
      notifEl.textContent = msg;
      notifEl.classList.add('show');
      setTimeout(function() { notifEl.classList.remove('show'); }, 2500);
    }
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        MsgLog.push(String(msg).replace(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '').trim());
      }
    } catch (_) {}
  }

  function load(cb) {
    chrome.storage.local.get('pixelFocusState', function(r) {
      state = r.pixelFocusState || {};
      if (typeof state.coins !== 'number') state.coins = 0;
      if (typeof state.lifetimeCoins !== 'number') state.lifetimeCoins = 0;
      if (typeof state.blocks !== 'number') state.blocks = 0;
      if (typeof state.streak !== 'number') state.streak = 0;
      if (typeof state.todayBlocks !== 'number') state.todayBlocks = 0;
      if (!state.marathonBonusesToday) state.marathonBonusesToday = [];
      if (typeof state.combo !== 'number') state.combo = 0;
      UPGRADES.forEach(function(u) {
        if (typeof state[u.id] !== 'number') state[u.id] = 0;
      });
      // Resource pool defaults — safe for factory-first loads.
      ['framesReserve', 'gearsReserve', 'dyeReserve', 'waterReserve', 'silicaReserve'].forEach(function(k) {
        if (typeof state[k] !== 'number') state[k] = 10000;
      });
      if (typeof state.ledgerRevealed !== 'boolean') state.ledgerRevealed = false;
      if (!state.seenUpgrades || typeof state.seenUpgrades !== 'object') state.seenUpgrades = {};
      if (!state.freshUpgrades || typeof state.freshUpgrades !== 'object') state.freshUpgrades = {};
      // One-time v3.17 migration: on the first factory open after the
      // esoteric expansion ships, any NEW upgrade whose gate is ALREADY
      // satisfied (because a returning player has enough lifetime coins
      // or prereqs) should be silently marked as seen — without firing
      // 30 reveal toasts and 30 chat lines at once. After this one-time
      // pass, future reveals fire normally as the player progresses.
      if (!state.v317MigratedUpgrades) {
        var V317_IDS = [
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
        ];
        V317_IDS.forEach(function(id) {
          var gate = UNLOCK_GATES[id];
          if (!gate) return;
          try {
            if (gate(state)) state.seenUpgrades[id] = Date.now();
          } catch (_) {}
        });
        state.v317MigratedUpgrades = true;
      }
      cb();
    });
  }

  // ===== Upgrade visibility =====
  // Returns true if the given upgrade should appear on the factory
  // page right now. Upgrades with no entry in UNLOCK_GATES are always
  // visible (the starter set). Once an upgrade reveals it stays
  // visible forever — the first reveal also fires a sardonic chat
  // line describing the company "contemplating" the new option.
  function isUpgradeVisible(u) {
    if (!u) return false;
    // Already purchased at least once? Always visible.
    if ((state[u.id] || 0) > 0) {
      if (!state.seenUpgrades[u.id]) state.seenUpgrades[u.id] = Date.now();
      // Purchased upgrades are never "fresh".
      if (state.freshUpgrades && state.freshUpgrades[u.id]) delete state.freshUpgrades[u.id];
      return true;
    }
    // Sticky: once seen, always shown.
    if (state.seenUpgrades && state.seenUpgrades[u.id]) return true;
    // No gate defined? Starter card — visible from the start. Starter
    // cards are NOT marked fresh on first load (they've always been
    // there as far as the player is concerned).
    var gate = UNLOCK_GATES[u.id];
    if (!gate) {
      if (state.seenUpgrades) state.seenUpgrades[u.id] = Date.now();
      return true;
    }
    // Gate check.
    var ok = false;
    try { ok = !!gate(state); } catch (_) { ok = false; }
    if (ok) {
      // First-time reveal: mark sticky + fire the appearance chat line
      // + flag the upgrade as fresh (for the NEW badge + toast notif).
      state.seenUpgrades[u.id] = Date.now();
      if (!state.freshUpgrades) state.freshUpgrades = {};
      state.freshUpgrades[u.id] = Date.now();
      try {
        if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
          var tpl = UPGRADE_APPEAR_TEMPLATES[Math.floor(Math.random() * UPGRADE_APPEAR_TEMPLATES.length)];
          MsgLog.push(tpl.replace('{T}', u.title));
        }
      } catch (_) {}
      // Queue a toast notification for this reveal. Toasts stack with a
      // small stagger so simultaneous reveals each get a moment. This
      // runs AFTER renderUpgrades so the UI exists by the time the toast
      // fires.
      queueRevealToast(u);
      return true;
    }
    return false;
  }

  // ===== Reveal toast queue =====
  // When one or more upgrades reveal themselves in a single render pass
  // we want to show a visible toast for each — but staggered so they
  // don't all stack on top of each other. The queue holds pending
  // reveals and a single timer drains them into the notify() banner.
  var pendingRevealToasts = [];
  var revealDrainTimer = null;
  function queueRevealToast(u) {
    if (!u) return;
    pendingRevealToasts.push(u);
    if (revealDrainTimer) return;
    function drain() {
      var next = pendingRevealToasts.shift();
      if (!next) { revealDrainTimer = null; return; }
      // Play a distinct sound for reveals vs. notifications.
      try { SFX.cha_ching(); } catch (_) {}
      notify('NEW: ' + next.title + ' available');
      revealDrainTimer = setTimeout(drain, 3200);
    }
    revealDrainTimer = setTimeout(drain, 300);
  }

  function save(cb) {
    chrome.storage.local.set({ pixelFocusState: state }, cb || function() {});
  }

  // Compact money formatter. Needs to reach into trillions and quadrillions
  // because the endgame "Planetary Coverage" tree caps at $7 quadrillion.
  function fmt(n) {
    n = Math.floor(n || 0);
    if (n < 1000) return String(n);
    if (n < 1e6)  return (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + 'K';
    if (n < 1e9)  return (n / 1e6).toFixed(2) + 'M';
    if (n < 1e12) return (n / 1e9).toFixed(2) + 'B';
    if (n < 1e15) return (n / 1e12).toFixed(2) + 'T';
    if (n < 1e18) return (n / 1e15).toFixed(2) + 'Q';
    return n.toExponential(2);
  }

  // ===== Legal Department discount =====
  // Every money-priced factory upgrade benefits from a compounding discount
  // as the player climbs the Legal Department tree. This is computed once
  // per lookup so the UI always shows the current effective cost.
  var LEGAL_DISCOUNTS = [0, 0.05, 0.12, 0.22, 0.35, 0.50, 0.65, 0.80];
  function getLegalDiscount() {
    var lvl = state ? (state.legalDeptLevel || 0) : 0;
    if (lvl <= 0) return 0;
    return LEGAL_DISCOUNTS[Math.min(lvl, LEGAL_DISCOUNTS.length - 1)];
  }
  // v3.17: Juridical Personhood for Looms AND the Lens-Grinder
  // Concordat each provide additional flat discounts that stack
  // MULTIPLICATIVELY with the Legal Department discount — i.e. the
  // effective price is (rawCost) * (1 - legal) * (1 - juridical) * (1 - lens).
  var JURIDICAL_PERSONHOOD_DISCOUNT = [0, 0.08, 0.16, 0.25, 0.35, 0.48];
  var LENS_GRINDER_DISCOUNT =         [0, 0.06, 0.12, 0.20, 0.30, 0.42];
  function getJuridicalDiscount() {
    var lvl = state ? (state.juridicalPersonhoodLevel || 0) : 0;
    if (lvl <= 0) return 0;
    return JURIDICAL_PERSONHOOD_DISCOUNT[Math.min(lvl, JURIDICAL_PERSONHOOD_DISCOUNT.length - 1)];
  }
  function getLensGrinderDiscount() {
    var lvl = state ? (state.lensGrinderTreatyLevel || 0) : 0;
    if (lvl <= 0) return 0;
    return LENS_GRINDER_DISCOUNT[Math.min(lvl, LENS_GRINDER_DISCOUNT.length - 1)];
  }
  function getTotalDiscountFraction(upgradeId) {
    // Returns the aggregate 0..1 fraction shaved off the raw cost.
    // Legal Department does not discount itself; juridical personhood
    // and lens-grinder concordat do NOT discount themselves either.
    var legal = (upgradeId === 'legalDeptLevel') ? 0 : getLegalDiscount();
    var juridical = (upgradeId === 'juridicalPersonhoodLevel') ? 0 : getJuridicalDiscount();
    var lens = (upgradeId === 'lensGrinderTreatyLevel') ? 0 : getLensGrinderDiscount();
    // Multiplicative stacking: 1 - (1-a)(1-b)(1-c)
    var remaining = (1 - legal) * (1 - juridical) * (1 - lens);
    return 1 - remaining;
  }
  function discountedCost(rawCost, upgradeId) {
    var d = getTotalDiscountFraction(upgradeId);
    if (d <= 0) return rawCost;
    return Math.max(1, Math.round(rawCost * (1 - d)));
  }

  function getStreakRate() {
    var emp = state.employeesLevel || 0;
    if (emp <= 0) return 0;
    if (!state.streak || state.streak <= 0) return 0;
    var baseRate = [0, 0.02, 0.05, 0.12, 0.26, 0.55][Math.min(emp, 5)];
    return baseRate * (1 + (state.streak - 1) * 0.10);
  }

  function getNextMarathon() {
    var todayMins = (state.todayBlocks || 0) * 10;
    for (var i = 0; i < MARATHON_THRESHOLDS.length; i++) {
      var t = MARATHON_THRESHOLDS[i];
      if ((state.marathonBonusesToday || []).indexOf(t.mins) === -1) {
        var hr = t.mins / 60;
        var label = (hr === Math.floor(hr) ? hr + 'h' : hr.toFixed(1) + 'h');
        var remaining = Math.max(0, t.mins - todayMins);
        return label + ' \u2192 +$' + t.bonus + (remaining > 0 ? ' (' + remaining + 'm to go)' : ' (ready!)');
      }
    }
    return 'All claimed today \u2713';
  }

  function getNextComboBurst() {
    var nextCombo = (state.combo || 0) + 1;
    if (nextCombo < 2) nextCombo = 2;
    var idx = Math.min(nextCombo, COMBO_COIN_PAYOUTS.length - 1);
    var base = COMBO_COIN_PAYOUTS[idx];
    var mktLevel = state.marketingLevel || 0;
    var mult = [1, 1.25, 1.6, 2.0, 2.5, 3.0][Math.min(mktLevel, 5)];
    var payout = Math.round(base * mult);
    return nextCombo + 'x \u2192 +$' + payout;
  }

  function renderHero() {
    document.getElementById('moneyCounter').textContent = fmt(state.coins);
    document.getElementById('lifetimeMoney').textContent = '$' + fmt(state.lifetimeCoins);
    var _empLvl = state.employeesLevel || 0;
    if (_empLvl <= 0) {
      document.getElementById('streakRate').textContent = 'LOCKED';
    } else {
      document.getElementById('streakRate').textContent = '+$' + getStreakRate().toFixed(1) + ' / min';
    }
    document.getElementById('nextMarathon').textContent = getNextMarathon();
    document.getElementById('nextComboBurst').textContent = getNextComboBurst();
    document.getElementById('textileCount').textContent = state.blocks || 0;
    renderLedger();
  }

  // Master Loom countdown lives in gallery.js as of v3.17.1 — the
  // loom window owns its own rollover timer now. The factory just
  // consumes the results when rollover fires via app.js.

  // ===== Resource Ledger =====
  // Mirrors the pool config in app.js. The ledger stays hidden until
  // state.ledgerRevealed flips true (set by app.js once any pool dips
  // below 50% or MsgLog tier is 3+). Once revealed, the panel shows
  // the actual physical reserve, the substitute-level floor, and the
  // current penalty multiplier for each pool.
  var LEDGER_POOLS = [
    { id: 'frames',  label: 'Groves',         subKey: 'syntheticFramesLevel',  domain: 'Textile'        },
    { id: 'gears',   label: 'Ore',            subKey: 'reclaimedGearsLevel',   domain: 'Money'          },
    { id: 'dye',     label: 'Indigo Fields',  subKey: 'labIndigoLevel',        domain: 'Textile'        },
    { id: 'water',   label: 'Aquifers',       subKey: 'closedLoopWaterLevel',  domain: 'Autoloom speed' },
    { id: 'silica',  label: 'Silica Beaches', subKey: 'sandReclamationLevel',  domain: 'AI Loom'        }
  ];
  var LEDGER_SUB_FLOOR = [0.00, 0.20, 0.40, 0.60, 0.80, 1.00];

  function ledgerPoolPercent(poolId) {
    var v = state[poolId + 'Reserve'];
    if (typeof v !== 'number') v = 10000;
    return Math.max(0, Math.min(1, v / 10000));
  }

  function ledgerEffectivePct(pool) {
    var actual = ledgerPoolPercent(pool.id);
    var sub = state[pool.subKey] || 0;
    var floor = LEDGER_SUB_FLOOR[Math.min(sub, LEDGER_SUB_FLOOR.length - 1)] || 0;
    if (floor >= 1) return 1;
    return Math.max(actual, floor);
  }

  function ledgerPenalty(pct) {
    if (pct > 0.75) return 1.00;
    if (pct > 0.50) return 0.95;
    if (pct > 0.25) return 0.85;
    if (pct > 0.00) return 0.70;
    return 0.50;
  }

  function renderLedger() {
    var el = document.getElementById('resourceLedger');
    if (!el) return;
    var revealed = !!state.ledgerRevealed;
    // Belt-and-suspenders reveal — if any pool is already under 50% on
    // first factory load and the flag somehow isn't set, show it anyway.
    if (!revealed) {
      for (var k = 0; k < LEDGER_POOLS.length; k++) {
        if (ledgerPoolPercent(LEDGER_POOLS[k].id) < 0.5) { revealed = true; break; }
      }
    }
    if (!revealed) {
      el.classList.remove('visible');
      return;
    }
    el.classList.add('visible');
    var rows = document.getElementById('ledgerRows');
    if (!rows) return;
    var html = '';
    for (var i = 0; i < LEDGER_POOLS.length; i++) {
      var pool = LEDGER_POOLS[i];
      var dormant = pool.id === 'silica' && (state.aiLoomLevel || 0) <= 0;
      var actual = ledgerPoolPercent(pool.id);
      var sub = state[pool.subKey] || 0;
      var floor = LEDGER_SUB_FLOOR[Math.min(sub, LEDGER_SUB_FLOOR.length - 1)] || 0;
      var effective = ledgerEffectivePct(pool);
      var penalty = ledgerPenalty(effective);
      var penaltyPct = Math.round((1 - penalty) * 100);
      var actualW = Math.round(actual * 100);
      var floorW = Math.round(floor * 100);
      var subLabel = sub > 0 ? ('Substitute L' + sub) : 'No substitute';
      var penaltyClass = penalty >= 1 ? 'penalty-ok' : 'penalty-bad';
      var penaltyText = penalty >= 1
        ? 'Penalty 0% (solved)'
        : 'Penalty -' + penaltyPct + '%';
      html +=
        '<div class="ledger-row ' + (dormant ? 'dormant' : '') + '" ' +
          'title="' + pool.label + ' \u2014 drives ' + pool.domain + '. ' +
            (dormant ? 'Dormant until AI Loom is purchased. ' : '') +
            'Physical reserve: ' + actualW + '%. ' +
            'Effective (after substitute floor): ' + Math.round(effective * 100) + '%. ' +
            subLabel + '.">' +
          '<div class="ledger-row-top">' +
            '<span class="ledger-name">' + pool.label.toUpperCase() + '</span>' +
            '<span class="ledger-pct">' + actualW + '%</span>' +
          '</div>' +
          '<div class="ledger-bar">' +
            '<div class="ledger-bar-fill" style="width:' + actualW + '%"></div>' +
            (floorW > actualW ? '<div class="ledger-bar-floor" style="left:' + actualW + '%;width:' + (floorW - actualW) + '%"></div>' : '') +
          '</div>' +
          '<div class="ledger-meta">' +
            '<span>' + subLabel + '</span>' +
            '<span class="' + penaltyClass + '">' + (dormant ? 'Dormant' : penaltyText) + '</span>' +
          '</div>' +
        '</div>';
    }
    rows.innerHTML = html;
  }

  // Trees are rendered as sections so the expansion/bureaucracy/AI trees
  // don't get lost in a flat grid. Order matters: it walks the narrative
  // arc the player is meant to climb through.
  var TREE_ORDER = ['Production', 'Commerce', 'Operations', 'Research', 'Bureaucracy', 'Expansion', 'Intelligence', 'Supply', 'Endgame'];
  var TREE_HINTS = {
    'Production':   'The shop floor — shuttles, bobbins, and the machines that make the cloth.',
    'Commerce':     'Getting cloth in front of customers and turning that into money faster.',
    'Operations':   'The people (and later, fewer people) who keep the lights on and the looms fed.',
    'Research':     'R&D for new dyes and fibers. Later tiers push into materials the current shop floor does not yet handle.',
    'Bureaucracy':  'Legal retainers, lobbyists, and a slow regulatory capture. Discounts most upgrades and boosts passive income.',
    'Expansion':    'Second factories, continents, orbital staging. Multiplies output at every source.',
    'Intelligence': 'Machine learning for the loom, a research division, and eventually an automated leadership layer.',
    'Supply':       'Substitutes for the raw materials the looms used to need. The reserves will not come back. We will adapt around them.',
    'Endgame':      'The final tree. Unlocks only make sense once everything else is very large. The planet gets noticeably softer.'
  };

  function buildUpgradeCard(u) {
    var level = state[u.id] || 0;
    var maxed = level >= u.costs.length;
    var rawNextCost = maxed ? null : u.costs[level];
    var nextCost = maxed ? null : discountedCost(rawNextCost, u.id);
    var canAfford = !maxed && (state.coins || 0) >= nextCost;
    var discount = getLegalDiscount();
    var hasDiscount = !maxed && discount > 0 && u.id !== 'legalDeptLevel';

    var isFresh = !!(state.freshUpgrades && state.freshUpgrades[u.id]) && level === 0;
    var card = document.createElement('div');
    card.className = 'upgrade-card'
      + (maxed ? ' maxed' : (canAfford ? ' affordable' : ''))
      + (isFresh ? ' fresh' : '');
    // Clicking anywhere on a fresh card acknowledges the reveal —
    // removes the NEW badge + pulse on next render. The click still
    // bubbles, so the buy button still works inside the card.
    if (isFresh) {
      card.addEventListener('click', function() {
        if (state.freshUpgrades && state.freshUpgrades[u.id]) {
          delete state.freshUpgrades[u.id];
          save();
          card.classList.remove('fresh');
          var badgeEl = card.querySelector('.fresh-badge');
          if (badgeEl) badgeEl.remove();
        }
      });
    }
    var cardTip = u.title + ' (LV ' + level + '/' + u.costs.length + '). ' + u.desc;
    if (level > 0) cardTip += ' Currently: ' + u.effects[level - 1] + '.';
    if (!maxed) {
      cardTip += ' Next level: ' + u.effects[level] + ' for $' + fmt(nextCost) + '.';
      if (hasDiscount) cardTip += ' (Legal Department discount: ' + Math.round(discount * 100) + '% off the base $' + fmt(rawNextCost) + '.)';
      if (!canAfford) cardTip += ' You need $' + fmt(nextCost - (state.coins || 0)) + ' more.';
    } else {
      cardTip += ' Fully upgraded.';
    }
    card.setAttribute('title', cardTip);

    if (isFresh) {
      var badge = document.createElement('div');
      badge.className = 'fresh-badge';
      badge.textContent = 'NEW';
      badge.setAttribute('title', 'This upgrade just became available. Click the card (or buy it) to dismiss the NEW indicator.');
      card.appendChild(badge);
    }

    var head = document.createElement('div');
    head.className = 'upgrade-head';
    var title = document.createElement('div');
    title.className = 'upgrade-title';
    title.textContent = u.title;
    title.setAttribute('title', u.title + ' upgrade tree. Part of the ' + u.tree + ' branch.');
    var levelBadge = document.createElement('div');
    levelBadge.className = 'upgrade-level';
    levelBadge.textContent = 'LV ' + level + '/' + u.costs.length;
    levelBadge.setAttribute('title', 'Current level ' + level + ' of ' + u.costs.length + '.');
    head.appendChild(title);
    head.appendChild(levelBadge);
    card.appendChild(head);

    var desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    desc.textContent = u.desc;
    desc.setAttribute('title', u.desc);
    card.appendChild(desc);

    if (level > 0) {
      var current = document.createElement('div');
      current.className = 'upgrade-effect';
      current.textContent = 'Current: ' + u.effects[level - 1];
      current.setAttribute('title', 'The active effect from your existing level ' + level + '.');
      card.appendChild(current);
    }

    if (!maxed) {
      var nxt = document.createElement('div');
      nxt.className = 'upgrade-next';
      var costHtml = '<strong>$' + fmt(nextCost) + '</strong>';
      if (hasDiscount) {
        costHtml = '<span style="text-decoration:line-through;color:#666;margin-right:4px;">$' + fmt(rawNextCost) + '</span>' + costHtml;
      }
      nxt.innerHTML = 'Next: ' + u.effects[level] + ' &mdash; ' + costHtml;
      nxt.setAttribute('title', 'What you will get if you buy the next level: ' + u.effects[level] + '. Costs $' + fmt(nextCost) + '.' + (hasDiscount ? ' (Legal Department ' + Math.round(discount * 100) + '% off.)' : ''));
      card.appendChild(nxt);
    } else {
      var done = document.createElement('div');
      done.className = 'upgrade-next';
      done.innerHTML = '<strong style="color:var(--accent);">\u2713 Fully upgraded</strong>';
      done.setAttribute('title', 'You have reached the maximum level for this upgrade tree.');
      card.appendChild(done);
    }

    var btn = document.createElement('button');
    btn.className = 'buy-btn';
    btn.type = 'button';
    if (maxed) {
      btn.textContent = 'MAX LEVEL';
      btn.disabled = true;
      btn.setAttribute('title', 'This upgrade is at its maximum level.');
    } else if (!canAfford) {
      btn.textContent = 'NEED $' + fmt(nextCost);
      btn.disabled = true;
      btn.setAttribute('title', 'You cannot afford this yet. You need $' + fmt(nextCost - (state.coins || 0)) + ' more money. Money is earned from combo bursts, marathon thresholds, the end-of-day streak bonus, and (if you own employees) the passive streak trickle.');
    } else {
      btn.textContent = 'BUY ($' + fmt(nextCost) + ')';
      btn.setAttribute('title', 'Buy ' + u.title + ' level ' + (level + 1) + ' for $' + fmt(nextCost) + '. Effect: ' + u.effects[level] + '.');
      btn.addEventListener('click', function() { purchase(u); });
    }
    card.appendChild(btn);
    return card;
  }

  function renderUpgrades() {
    var grid = document.getElementById('upgradeGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Visibility pass FIRST — each upgrade is tested against its gate
    // function in UNLOCK_GATES. Reveals are sticky (tracked in
    // state.seenUpgrades) and the first reveal per upgrade fires a
    // sardonic chat line. Starter upgrades with no gate defined are
    // always visible.
    var revealedSomething = false;
    var visibleUpgrades = UPGRADES.filter(function(u) {
      var wasSeenBefore = !!(state.seenUpgrades && state.seenUpgrades[u.id]);
      var v = isUpgradeVisible(u);
      if (v && !wasSeenBefore && UNLOCK_GATES[u.id]) revealedSomething = true;
      return v;
    });
    if (revealedSomething) {
      // Persist the new seenUpgrades keys so the sticky reveal survives
      // the next window reload even if nothing else changed.
      save();
    }

    // Group visible upgrades by tree in the declared narrative order.
    // Trees with zero visible upgrades are skipped entirely so the
    // factory page starts compact and grows as the player progresses.
    var byTree = {};
    visibleUpgrades.forEach(function(u) {
      if (!byTree[u.tree]) byTree[u.tree] = [];
      byTree[u.tree].push(u);
    });

    TREE_ORDER.forEach(function(tree) {
      var group = byTree[tree];
      if (!group || !group.length) return;
      var section = document.createElement('div');
      section.className = 'tree-section';
      section.setAttribute('data-tree', tree);

      var header = document.createElement('div');
      header.className = 'tree-header';
      header.setAttribute('title', TREE_HINTS[tree] || tree);
      header.innerHTML = '<span class="tree-name">' + tree.toUpperCase() + '</span><span class="tree-hint">' + (TREE_HINTS[tree] || '') + '</span>';
      section.appendChild(header);

      var row = document.createElement('div');
      row.className = 'tree-row';
      group.forEach(function(u) {
        row.appendChild(buildUpgradeCard(u));
      });
      section.appendChild(row);
      grid.appendChild(section);
    });
  }

  function purchase(u) {
    var level = state[u.id] || 0;
    if (level >= u.costs.length) { SFX.error(); return; }
    var rawCost = u.costs[level];
    var cost = discountedCost(rawCost, u.id);
    if ((state.coins || 0) < cost) {
      SFX.error();
      notify('Not enough money');
      return;
    }
    state.coins -= cost;
    state[u.id] = level + 1;
    // Purchasing a fresh upgrade also acknowledges the reveal.
    if (state.freshUpgrades && state.freshUpgrades[u.id]) delete state.freshUpgrades[u.id];
    SFX.purchase();

    // Push a concise level-up notification (shows in the top banner AND
    // the console, because notify() forwards to MsgLog).
    notify(u.title + ' upgraded to LV ' + (level + 1) + '!');

    // Push the narrative milestone line for this specific level, if the
    // upgrade defines one. This is the main source of "the chat reacts
    // to your purchases" flavor. If missing, we fall back to a generic.
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        var line = null;
        if (u.milestones && u.milestones[level]) {
          line = u.milestones[level];
        } else {
          line = u.title + ' now at level ' + (level + 1) + '. The loom approves.';
        }
        // Prefix with a subtle marker so purchase lines stand out from
        // the idle flavor chatter without being noisy.
        MsgLog.push('>> ' + line);
      }
    } catch (_) {}

    save(function() {
      renderHero();
      renderUpgrades();
      // An upgrade purchase may push factoryTotal or money past a
      // memo-unlock threshold. Re-check immediately so the MEMO
      // badge lights up in response to the action that caused it.
      try { checkFactoryStageUnlocks(); } catch (_) {}
    });
  }

  // ===== Cross-window nav =====
  function openWindow(path) {
    try { chrome.runtime.sendMessage({ type: 'pf-open', path: path }); } catch (e) {}
  }
  document.getElementById('backBtn').addEventListener('click', function() {
    SFX.click();
    openWindow('popup.html');
  });
  document.getElementById('galleryNavBtn').addEventListener('click', function() {
    SFX.click();
    openWindow('gallery.html');
  });

  // ===== FACTORY MEMO ARCHIVE =====
  // Refactored in v3.19.1 from a single first-run intro into a
  // progressive memo archive. The first memo (factory-s0) is the
  // standing Treasurer's memo and its text is preserved verbatim;
  // later memos unlock as the player crosses money / upgrade-level
  // thresholds. Entries live in stage-entries.js and are rendered by
  // StageEntries.renderEntryInto into the shared stage-* DOM skeleton
  // inside factoryIntroModal. A prev/next nav strip lets the player
  // walk the archive from the first memo to the most recent.
  var currentFactoryStageEntryId = null;

  // Check for newly-unlocked factory memos and surface them via the
  // MEMO button badge + a console log line. Also backfills the new
  // stage-tracking arrays on first run of v3.19.1 and pre-seeds
  // factory-s0 as seen for existing players so the upgrade doesn't
  // create a spurious badge.
  function checkFactoryStageUnlocks() {
    if (typeof StageEntries === 'undefined' || !StageEntries) return;
    if (!Array.isArray(state.stageEntriesUnlocked)) state.stageEntriesUnlocked = [];
    if (!Array.isArray(state.stageEntriesSeen)) state.stageEntriesSeen = [];
    // Backfill: existing players who already dismissed the old
    // Treasurer memo should see factory-s0 as already-unlocked and
    // already-seen, so upgrading to v3.19.1 is silent for them.
    if (state.hasSeenFactoryIntro) {
      if (state.stageEntriesUnlocked.indexOf('factory-s0') === -1) {
        state.stageEntriesUnlocked.push('factory-s0');
      }
      if (state.stageEntriesSeen.indexOf('factory-s0') === -1) {
        state.stageEntriesSeen.push('factory-s0');
      }
    }
    var newlyUnlocked = StageEntries.checkStageUnlocks(state, 'factory');
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(function(item) {
        var e = item && item.entry ? item.entry : item;
        try {
          if (typeof MsgLog !== 'undefined') {
            MsgLog.push('A new memo has been filed to the Treasurer\u2019s Ledger: \u201c' + (e.label || e.heading || e.id) + '.\u201d Click MEMO to read it.');
          }
        } catch (_) {}
      });
      save();
      refreshMemoBadge();
    }
  }

  // Toggle the gold badge on the MEMO button based on how many
  // unlocked entries the player hasn't opened yet.
  function refreshMemoBadge() {
    if (typeof StageEntries === 'undefined' || !StageEntries) return;
    var badge = document.getElementById('factoryIntroBadge');
    if (!badge) return;
    var n = StageEntries.getUnseenCount(state, 'factory');
    if (n > 0) {
      badge.textContent = String(n);
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  // Open the memo archive. Without an entryId it picks the first
  // unseen memo (or falls back to the most recent unlocked one); with
  // an entryId it opens that specific memo. Prev/next buttons walk
  // between unlocked entries. The dismiss button keeps its original
  // behavior: on first-run, flip hasSeenFactoryIntro and push the
  // same two console lines the old intro used.
  function showFactoryIntroModal(entryId) {
    var modal = document.getElementById('factoryIntroModal');
    if (!modal) return;
    // Don't stack — if it's already open, leave it be.
    if (modal.style.display === 'flex') return;
    if (typeof StageEntries === 'undefined' || !StageEntries) return;
    // Safety net: factory-s0 is always available.
    if (!Array.isArray(state.stageEntriesUnlocked)) state.stageEntriesUnlocked = [];
    if (state.stageEntriesUnlocked.indexOf('factory-s0') === -1) {
      state.stageEntriesUnlocked.unshift('factory-s0');
    }
    var targetEntry = null;
    if (entryId) {
      var info = StageEntries.getEntryById(entryId);
      if (info) targetEntry = info.entry;
    }
    if (!targetEntry) {
      targetEntry = StageEntries.getDefaultEntryToShow(state, 'factory');
    }
    if (!targetEntry) return;
    currentFactoryStageEntryId = targetEntry.id;
    // Render into the shared stage-* DOM skeleton inside this modal.
    StageEntries.renderEntryInto(modal, 'factory', targetEntry.id, state);
    // Mark as seen immediately on open.
    StageEntries.markEntrySeen(state, targetEntry.id);
    save();

    // Rewire the dismiss button (clone to wipe old listeners).
    var beginBtn = document.getElementById('factoryIntroBeginBtn');
    if (beginBtn) {
      var freshBtn = beginBtn.cloneNode(true);
      beginBtn.parentNode.replaceChild(freshBtn, beginBtn);
      freshBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        // Only flip the first-run flag if it hasn't already been set.
        // This keeps the MEMO button as a pure replay, not a re-trigger.
        if (!state.hasSeenFactoryIntro) {
          state.hasSeenFactoryIntro = true;
          save();
          try {
            if (typeof MsgLog !== 'undefined') {
              MsgLog.push('The treasurer notes the craftsman on the factory floor. The ledger remains open.');
              MsgLog.push('Standing memo: the treasury prefers reinvestment. The ledger compounds quietly.');
            }
          } catch (_) {}
        }
        refreshMemoBadge();
      });
    }

    // Rewire prev/next nav (clone to wipe old listeners).
    var prevBtn = document.getElementById('stage-prev');
    if (prevBtn) {
      var freshPrev = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(freshPrev, prevBtn);
      freshPrev.addEventListener('click', function() {
        var neighborId = StageEntries.getNeighborEntryId(state, 'factory', currentFactoryStageEntryId, -1);
        if (neighborId) {
          modal.style.display = 'none';
          showFactoryIntroModal(neighborId);
        }
      });
    }
    var nextBtn = document.getElementById('stage-next');
    if (nextBtn) {
      var freshNext = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(freshNext, nextBtn);
      freshNext.addEventListener('click', function() {
        var neighborId = StageEntries.getNeighborEntryId(state, 'factory', currentFactoryStageEntryId, 1);
        if (neighborId) {
          modal.style.display = 'none';
          showFactoryIntroModal(neighborId);
        }
      });
    }

    modal.style.display = 'flex';
    refreshMemoBadge();
  }

  var factoryIntroBtn = document.getElementById('factoryIntroBtn');
  if (factoryIntroBtn) {
    factoryIntroBtn.addEventListener('click', function() {
      SFX.click();
      try { showFactoryIntroModal(); } catch (e) {}
    });
  }

  // ===== Live sync from other windows =====
  chrome.storage.onChanged.addListener(function(changes) {
    if (!changes.pixelFocusState) return;
    var newState = changes.pixelFocusState.newValue;
    if (!newState) return;
    state = newState;
    UPGRADES.forEach(function(u) {
      if (typeof state[u.id] !== 'number') state[u.id] = 0;
    });
    renderHero();
    renderUpgrades();
    // Re-check memo unlocks when state changes from another window
    // (e.g. player earns money in tracker, unlocks a factory memo).
    try { checkFactoryStageUnlocks(); } catch (_) {}
  });

  // ===== Init =====
  try {
    if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.mount) {
      MsgLog.mount('msgConsole');
    }
  } catch (_) {}
  load(function() {
    renderHero();
    renderUpgrades();
    // Init-time catch-up: if the player already cleared later
    // thresholds before this window opened, unlock any retroactive
    // memos now so the MEMO badge reflects reality on first render.
    try { checkFactoryStageUnlocks(); } catch (_) {}
    try { refreshMemoBadge(); } catch (_) {}
    setInterval(function() { renderHero(); try { checkFactoryStageUnlocks(); } catch (_) {} }, 3000);
    // Master Loom countdown now ticks in gallery.js (v3.17.1).
    try {
      if (typeof MsgLog !== 'undefined') {
        MsgLog.push('Factory floor online. Treasury: $' + Math.floor(state.coins || 0) + '.');
      }
    } catch (_) {}
    // First-run Textile Factory intro. Fires once per player; dismissal
    // flips state.hasSeenFactoryIntro so it never auto-re-triggers.
    // Delayed briefly so the rest of the UI has time to render
    // underneath the modal.
    try {
      if (!state.hasSeenFactoryIntro) {
        setTimeout(function() {
          try { showFactoryIntroModal(); } catch (e) {}
        }, 400);
      }
    } catch (_) {}
  });

})();
