// =============================================================================
// events-catalog.js — v3.22.0 Stage 1 — Event catalog (pure data)
// =============================================================================
// Tier-by-tier catalog of narrative events. Each entry is a data record the
// events.js engine consumes. NO DOM, NO STATE MUTATION here — consequences
// are declarative objects; the engine applies them.
//
// SHAPE of an entry:
//   {
//     id:            'unique-kebab-id',              // required, stable
//     tier:          1..10,                          // tier-band gating
//     title:         'Short headline for modal/log', // required
//     desc:          'One-sentence flavor',          // shown in modal
//     flavor:        'Longer atmospheric paragraph', // optional
//     class:         'trigger' | 'ambient',          // default 'ambient'
//     onlyOnce:      true,                           // story beats
//     cooldownDays:  number,                         // for repeatables
//     weight:        number,                         // ambient sampling
//     priority:      number,                         // trigger ordering
//     requiresFlags: [...],  forbidsFlags: [...],
//     eligible:      function(state) -> boolean,     // custom predicate
//     consequences:  [consequence...] | function(state) -> [...]
//   }
//
// CONSEQUENCE SHAPES (see events.js applyConsequence for authoritative list):
//   { kind:'addCoins', amount:N }
//   { kind:'loseCoins', amount:N }
//   { kind:'addTextiles', amount:N }
//   { kind:'loseTextiles', amount:N }
//   { kind:'incomeMultiplier',    factor:1.5, durationHours:48, label:'...' }
//   { kind:'marketingMultiplier', factor:0.7, durationHours:72, label:'...' }
//   { kind:'textileMultiplier',   factor:0.5, durationHours:72, label:'...' }
//   { kind:'suspendUpgrade', upgradeId:'loomLevel', durationHours:24, label:'...' }
//   { kind:'liftUpgrade',    upgradeId:'loomLevel' }
//   { kind:'setFlag', flag:'luddite_thread_active' }
//   { kind:'clearFlag', flag:'...' }
//   { kind:'adjustReputation', amount:+2 }
//   { kind:'addDissident', count:1 }
//   { kind:'grantFreeHire', count:2 }
//   { kind:'scheduleFollowup', eventId:'...', afterDays:5 }
//   { kind:'sideEffect', fn:function(state){ ... } }
//
// Authoring notes:
//   - Dollar amounts scale to the tier. T1 events are modest ($50 - $500 range).
//   - Duration hours default to 24 if omitted.
//   - Factors: 0.5 = halved, 0.7 = -30%, 1.3 = +30%, 1.5 = +50%, 2.0 = doubled.
//   - Reputation is cumulative; +1 = minor, +3 = notable, +5 = major.
//   - `eligible` runs every evaluate() — keep it cheap. Check coins/level/flags only.
// =============================================================================

(function() {
  'use strict';

  var HOUR = 1;          // durationHours is hours
  var DAY  = 24;
  var WEEK = 168;

  // Helpers for eligibility predicates
  function coinsAtLeast(n) { return function(state) { return (state.coins || 0) >= n; }; }
  function levelAtLeast(n) { return function(state) { return (state.level || 0) >= n; }; }
  function rosterAtLeast(n) { return function(state) { return Array.isArray(state.personnelRoster) && state.personnelRoster.length >= n; }; }

  // ---------------------------------------------------------------------------
  // TIER 1 — The Craft
  // Modern solo maker, home studio, Etsy / craft-fair era (lv. 0–30).
  // A hand-craft revivalist circle treats automation as sacrilege.
  // ---------------------------------------------------------------------------

  var TIER_1_EVENTS = [

    // 1. Global supply-chain shortage — 6-week yarn drought.
    {
      id: 't1-supply-shortage',
      tier: 1,
      title: 'The yarn aisle is empty.',
      desc: 'A global supply-chain shortage empties the yarn aisle for six weeks.',
      flavor: 'Every maker in the state is calling the same three wholesalers. Backorders stretch to the horizon.',
      class: 'ambient',
      weight: 3,
      cooldownDays: 21,
      consequences: [
        { kind: 'textileMultiplier', factor: 0.5, durationHours: 6 * DAY, label: 'Yarn shortage' },
        { kind: 'loseCoins', amount: 120 }
      ]
    },

    // 2. Trademark takedowns stick.
    {
      id: 't1-etsy-takedown',
      tier: 1,
      title: 'Your Etsy listings are gone by morning.',
      desc: 'A rival Etsy seller reports your listings for trademark infringement and the takedowns stick.',
      flavor: 'You stare at the automated email with the seven broken links and try to remember if you ever filed.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 30,
      eligible: coinsAtLeast(400),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 3 * DAY, label: 'Listings down' },
        { kind: 'loseCoins', amount: 200 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 3. Wellness influencer on a huge podcast names the studio.
    {
      id: 't1-dye-denouncement',
      tier: 1,
      title: 'A podcast with four million listeners calls your dyes poison.',
      desc: 'A wellness influencer denounces your dyes as carcinogenic on a podcast with four million listeners.',
      flavor: 'The chemistry is not controversial; the audience is.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 45,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.45, durationHours: 4 * DAY, label: 'Carcinogen story' },
        { kind: 'loseCoins', amount: 300 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 4. Regional buyer — museum gift shop order lands.
    {
      id: 't1-museum-order',
      tier: 1,
      title: 'A buyer from the museum gift shop wants twelve scarves by Friday.',
      desc: 'A regional buyer walks into your home studio and places an order for a museum gift shop.',
      flavor: 'She writes the PO in a leather notebook and says "invoice on delivery" like she means it.',
      class: 'trigger',
      priority: 5,
      onlyOnce: true,
      eligible: coinsAtLeast(600),
      consequences: [
        { kind: 'addCoins', amount: 850 },
        { kind: 'incomeMultiplier', factor: 1.35, durationHours: 2 * DAY, label: 'Museum order' },
        { kind: 'adjustReputation', amount: +2 }
      ]
    },

    // 5. Regional buyer — places order and ghosts.
    {
      id: 't1-buyer-ghosts',
      tier: 1,
      title: 'The buyer ghosts.',
      desc: 'A regional buyer walks into your home studio, places an order, and ghosts.',
      flavor: 'The scarves sit on the rack. Her email starts bouncing on day eleven.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 40,
      eligible: function(state) { return (state.textiles || 0) >= 20; },
      consequences: [
        { kind: 'loseTextiles', amount: 20 },
        { kind: 'loseCoins', amount: 80 },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 2 * DAY, label: 'Reserved inventory' }
      ]
    },

    // 6. Electrical fire in the studio.
    {
      id: 't1-studio-fire',
      tier: 1,
      title: 'An electrical fire in the studio.',
      desc: 'An electrical fire in the studio consumes a season\u2019s finished inventory.',
      flavor: 'Nothing from the back room survives. The smoke smell will last a year.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      eligible: function(state) { return (state.textiles || 0) >= 40; },
      consequences: [
        { kind: 'loseTextiles', amount: 80 },
        { kind: 'loseCoins', amount: 400 },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 2 * DAY, label: 'Fire damage' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 7. Mislabel accusation — wrong.
    {
      id: 't1-mislabel-wrong',
      tier: 1,
      title: 'A customer accuses you of mislabeling fiber content. They are wrong.',
      desc: 'A customer accuses you of mislabeling the fiber content and is wrong.',
      flavor: 'You send the mill certificates. It takes three days. The review gets taken down.',
      class: 'ambient',
      weight: 3,
      cooldownDays: 14,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.9, durationHours: 1 * DAY, label: 'Under review' },
        { kind: 'adjustReputation', amount: +1 }
      ]
    },

    // 8. Mislabel accusation — right.
    {
      id: 't1-mislabel-right',
      tier: 1,
      title: 'A customer accuses you of mislabeling fiber content. They are right.',
      desc: 'A customer accuses you of mislabeling the fiber content and is right.',
      flavor: 'You issue the refunds personally and update every listing before morning.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 60,
      consequences: [
        { kind: 'loseCoins', amount: 250 },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 3 * DAY, label: 'Mislabel fallout' },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 9. Wildfire takes the alpaca farm.
    {
      id: 't1-alpaca-wildfire',
      tier: 1,
      title: 'The alpaca farm is gone by Tuesday.',
      desc: 'A wildfire takes out the alpaca farm whose fleece was promised to you for winter.',
      flavor: 'The farmer calls from a hotel in another county. The herd made it. The barn did not.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 60,
      consequences: [
        { kind: 'loseTextiles', amount: 40 },
        { kind: 'textileMultiplier', factor: 0.75, durationHours: 5 * DAY, label: 'Winter fiber lost' },
        { kind: 'loseCoins', amount: 150 }
      ]
    },

    // 10. Viral short — "the loom sings".
    {
      id: 't1-loom-sings',
      tier: 1,
      title: 'A viral short calls you the studio where the loom sings.',
      desc: 'A viral short names your studio the one where the loom sings.',
      flavor: 'Forty-two seconds of warp-thread macro footage and a piano cue. Three million views.',
      class: 'trigger',
      priority: 3,
      onlyOnce: true,
      eligible: coinsAtLeast(800),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.8, durationHours: 3 * DAY, label: 'Viral short' },
        { kind: 'addCoins', amount: 400 },
        { kind: 'incomeMultiplier', factor: 1.25, durationHours: 2 * DAY, label: 'Attention spike' },
        { kind: 'adjustReputation', amount: +3 }
      ]
    },

    // 11. LUDDITE THREAD begins — manifesto against mill-spun fiber.
    {
      id: 't1-luddite-manifesto',
      tier: 1,
      title: 'A former apprentice signs the manifesto.',
      desc: 'A hand-craft revivalist circle posts a manifesto against mill-spun fiber; a former apprentice of yours signs it.',
      flavor: 'The signature is third from the bottom. You trained her for eleven months. She came early and stayed late.',
      class: 'trigger',
      priority: 10,
      onlyOnce: true,
      eligible: function(state) {
        return rosterAtLeast(3)(state) && (state.level || 0) >= 8;
      },
      consequences: [
        { kind: 'setFlag', flag: 'luddite_thread_active' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 3 * DAY, label: 'Manifesto fallout' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 1 },
        { kind: 'scheduleFollowup', eventId: 't2-luddite-trade-show', afterDays: 10 }
      ]
    },

    // 12. Revenue seizure → county rep gets it released.
    {
      id: 't1-loom-seizure',
      tier: 1,
      title: 'The revenue agent bolts the loom.',
      desc: 'The state revenue agent seizes your loom for unpaid sales tax; your county rep gets it released.',
      flavor: 'A municipal zip-tie. A phone call. A handshake outside the courthouse.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 60,
      eligible: coinsAtLeast(500),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 1 * DAY, label: 'Loom impounded' },
        { kind: 'loseCoins', amount: 180 },
        { kind: 'adjustReputation', amount: +1 },
        { kind: 'setFlag', flag: 'county_rep_favor' }
      ]
    },

    // 13. Showcase piece stolen in transit.
    {
      id: 't1-transit-theft',
      tier: 1,
      title: 'The showcase piece never arrives.',
      desc: 'Your showcase piece is stolen in transit to the museum that commissioned it.',
      flavor: 'The tracking goes dark between Memphis and Knoxville. The carrier says it is "under investigation."',
      class: 'ambient',
      weight: 1,
      cooldownDays: 45,
      eligible: function(state) { return (state.textiles || 0) >= 30; },
      consequences: [
        { kind: 'loseTextiles', amount: 30 },
        { kind: 'loseCoins', amount: 350 },
        { kind: 'marketingMultiplier', factor: 0.9, durationHours: 2 * DAY, label: 'Cancelled showcase' }
      ]
    },

    // 14. Pattern blogger copies design into zine.
    {
      id: 't1-pattern-zine',
      tier: 1,
      title: 'Your pattern shows up in a zine at a craft fair across the country.',
      desc: 'A pattern blogger copies your design into a zine sold at craft fairs you will never attend.',
      flavor: 'Two friends send you photographs of the same page within a week.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 30,
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.15, durationHours: 2 * DAY, label: 'Accidental syndication' },
        { kind: 'adjustReputation', amount: -1 },
        { kind: 'addCoins', amount: 60 }
      ]
    },

    // 15. Layoffs → apprenticeship applicants.
    {
      id: 't1-plant-layoffs',
      tier: 1,
      title: 'A dozen laid-off workers knock on the studio door.',
      desc: 'A round of layoffs at the local plant sends a dozen laid-off workers to your door asking for apprenticeship.',
      flavor: 'You set out folding chairs. The interviews last all afternoon.',
      class: 'trigger',
      priority: 6,
      onlyOnce: true,
      eligible: function(state) { return (state.level || 0) >= 10 && (state.employeesLevel || 0) >= 1; },
      consequences: [
        { kind: 'grantFreeHire', count: 2 },
        { kind: 'adjustReputation', amount: +2 },
        { kind: 'addCoins', amount: 50 }
      ]
    },

    // 16. Coyotes take the flock.
    {
      id: 't1-coyote-flock',
      tier: 1,
      title: 'The flock is gone.',
      desc: 'Coyotes take the flock whose wool was promised to you.',
      flavor: 'The rancher\u2019s voicemail is two words long. The rest is static.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 75,
      consequences: [
        { kind: 'loseTextiles', amount: 35 },
        { kind: 'textileMultiplier', factor: 0.8, durationHours: 3 * DAY, label: 'Flock lost' }
      ]
    },

    // 17. Best piece cut up as church vestment.
    {
      id: 't1-vestment-cutup',
      tier: 1,
      title: 'Your best piece is altar cloth now.',
      desc: 'Your best-woven piece is cut up and used as a church vestment without your consent.',
      flavor: 'The pastor writes a long and grateful letter. He paid $40 for it on consignment in 2019.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 60,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 2 * DAY, label: 'Vestment scandal' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 18. Arson report names you after neighbor's studio burns.
    {
      id: 't1-arson-report',
      tier: 1,
      title: 'The arson report names you.',
      desc: 'A neighboring maker\u2019s studio burns and the arson report names you.',
      flavor: 'You hire a lawyer on a retainer you cannot afford. The fire marshal calls twice.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      eligible: coinsAtLeast(1000),
      consequences: [
        { kind: 'loseCoins', amount: 700 },
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 4 * DAY, label: 'Arson inquiry' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 2 * DAY, label: 'Seized as evidence' }
      ]
    },

    // 19. Scarf worn to a state dinner.
    {
      id: 't1-state-dinner',
      tier: 1,
      title: 'Your scarf is on the evening news.',
      desc: 'A press aide messages without warning and your scarf is worn to a state dinner.',
      flavor: 'The photograph goes everywhere by morning. You have nineteen voicemails before you finish the first coffee.',
      class: 'trigger',
      priority: 8,
      onlyOnce: true,
      eligible: coinsAtLeast(1500),
      consequences: [
        { kind: 'marketingMultiplier', factor: 2.2, durationHours: 3 * DAY, label: 'State dinner moment' },
        { kind: 'incomeMultiplier', factor: 1.5, durationHours: 3 * DAY, label: 'National attention' },
        { kind: 'addCoins', amount: 1200 },
        { kind: 'adjustReputation', amount: +4 }
      ]
    },

    // 20. Dissertation binding.
    {
      id: 't1-dissertation',
      tier: 1,
      title: 'A dissertation names your studio on its title page.',
      desc: 'A graduate student records your studio in a dissertation bound for a university library.',
      flavor: 'She brings muffins. She writes six hundred pages. You appear on forty-one of them.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 90,
      eligible: levelAtLeast(12),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.1, durationHours: 7 * DAY, label: 'Academic mention' },
        { kind: 'adjustReputation', amount: +2 },
        { kind: 'addCoins', amount: 120 }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // TIER 2 — The Trade
  // Modern small brand scaling through wholesale, trade shows, tariffs,
  // customs (lv. 30–57). A new Luddite movement targets trade-show floors.
  // Amounts scale up: $500 – $5,000 range. Suspensions can be longer.
  // ---------------------------------------------------------------------------

  var TIER_2_EVENTS = [

    // 21. Container ship lost at sea.
    {
      id: 't2-cargo-lost-at-sea',
      tier: 2,
      title: 'The container ship does not make port.',
      desc: 'A container ship carrying your shipment is lost at sea and none of the cargo is recovered.',
      flavor: 'The maritime broker quotes a figure from 1932 and says insurance is "complicated."',
      class: 'ambient',
      weight: 2,
      cooldownDays: 45,
      consequences: [
        { kind: 'loseTextiles', amount: 180 },
        { kind: 'loseCoins', amount: 1400 },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 3 * DAY, label: 'Shipment lost' }
      ]
    },

    // 22. Ransomware at port, cloth unloaded without manifest.
    {
      id: 't2-ransomware-manifest',
      tier: 2,
      title: 'Your cloth is unloaded without a manifest.',
      desc: 'A container ship carrying your shipment is held at port by a ransomware incident and the cloth is unloaded without manifest.',
      flavor: 'Customs cannot find the paperwork. Neither can you. The pallets appear on a loading dock in New Jersey.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 60,
      consequences: [
        { kind: 'addTextiles', amount: 120 },
        { kind: 'loseCoins', amount: 600 },
        { kind: 'setFlag', flag: 'customs_irregular' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 23. Federal trademark granted; rival contests for nine years.
    {
      id: 't2-trademark-granted',
      tier: 2,
      title: 'The federal trademark is yours.',
      desc: 'A federal trademark is granted; a rival apparel brand contests it for nine years.',
      flavor: 'You frame the certificate. The contestation notice arrives eleven days later.',
      class: 'trigger',
      priority: 5,
      onlyOnce: true,
      eligible: coinsAtLeast(8000),
      consequences: [
        { kind: 'addCoins', amount: 1800 },
        { kind: 'marketingMultiplier', factor: 1.25, durationHours: 5 * DAY, label: 'Trademark victory' },
        { kind: 'incomeMultiplier', factor: 0.9, durationHours: 10 * DAY, label: 'Legal retainer drag' },
        { kind: 'adjustReputation', amount: +2 }
      ]
    },

    // 24. Tariffs double on foreign dye.
    {
      id: 't2-dye-tariffs',
      tier: 2,
      title: 'The dye duty doubles overnight.',
      desc: 'A new round of tariffs doubles the duty on the foreign dye you depend on overnight.',
      flavor: 'The customs circular was posted at 11:52pm. Your broker forwards it at 6:14am.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 30,
      consequences: [
        { kind: 'textileMultiplier', factor: 0.7, durationHours: 6 * DAY, label: 'Dye tariffs' },
        { kind: 'loseCoins', amount: 900 },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 3 * DAY, label: 'Tariff freeze' }
      ]
    },

    // 25. Rival founder's daughter marries your lead designer.
    {
      id: 't2-designer-marriage',
      tier: 2,
      title: 'Your lead designer marries into the rival family.',
      desc: 'A rival founder\u2019s daughter marries your lead designer and inherits a warehouse key.',
      flavor: 'The wedding photograph runs on the trade paper\u2019s society page. Two of your pattern libraries are missing by Monday.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 75,
      eligible: rosterAtLeast(3),
      consequences: [
        { kind: 'addDissident', count: 1 },
        { kind: 'loseCoins', amount: 500 },
        { kind: 'marketingMultiplier', factor: 0.9, durationHours: 3 * DAY, label: 'Pattern library leaked' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 26. Luddite trade-show event — scheduled follow-up from t1-luddite-manifesto.
    {
      id: 't2-luddite-trade-show',
      tier: 2,
      title: 'Paint on the booth next to yours.',
      desc: 'A new Luddite movement defaces the trade-show booth next to yours with paint and a manifesto.',
      flavor: 'Red paint on white samples. The manifesto cites your studio three times without naming you.',
      class: 'trigger',
      priority: 12,
      onlyOnce: true,
      eligible: function(state) {
        var pending = state.eventFlags && state.eventFlags['__pending:t2-luddite-trade-show'];
        if (!pending) return false;
        return Date.now() >= pending;
      },
      consequences: [
        { kind: 'clearFlag', flag: '__pending:t2-luddite-trade-show' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 4 * DAY, label: 'Luddite paint' },
        { kind: 'loseCoins', amount: 450 },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'setFlag', flag: 'luddite_thread_escalated' },
        { kind: 'scheduleFollowup', eventId: 't3-luddite-robotics', afterDays: 14 }
      ]
    },

    // 27. Master dyer defects TO your studio.
    {
      id: 't2-dyer-defects-in',
      tier: 2,
      title: 'The master dyer walks in with three pattern libraries.',
      desc: 'A veteran master dyer defects to your studio with three proprietary pattern libraries.',
      flavor: 'She sets the binders on the intake desk and asks about benefits. You do not mention the binders.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      eligible: coinsAtLeast(5000),
      consequences: [
        { kind: 'textileMultiplier', factor: 1.3, durationHours: 7 * DAY, label: 'Master dyer hire' },
        { kind: 'incomeMultiplier', factor: 1.15, durationHours: 7 * DAY, label: 'Pattern windfall' },
        { kind: 'addCoins', amount: 800 },
        { kind: 'grantFreeHire', count: 1 }
      ]
    },

    // 28. Master dyer defects AWAY from your studio.
    {
      id: 't2-dyer-defects-out',
      tier: 2,
      title: 'Your master dyer takes the libraries with her.',
      desc: 'A veteran master dyer defects away from your studio with three proprietary pattern libraries.',
      flavor: 'Her office is clean. The shelves are empty. The dye lab key is on your desk.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      eligible: rosterAtLeast(4),
      consequences: [
        { kind: 'textileMultiplier', factor: 0.65, durationHours: 5 * DAY, label: 'Dyer lost' },
        { kind: 'loseCoins', amount: 1200 },
        { kind: 'addDissident', count: 1 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 29. AG strips certification.
    {
      id: 't2-ag-strips-cert',
      tier: 2,
      title: 'The attorney general pulls your certification.',
      desc: 'A state attorney general strips your certification after an inquiry into labeling and weights.',
      flavor: 'The press release arrives eleven minutes before the email. The email is three paragraphs long.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 60,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.5, durationHours: 6 * DAY, label: 'Certification stripped' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 3 * DAY, label: 'Under inquiry' },
        { kind: 'loseCoins', amount: 1500 },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'setFlag', flag: 'cert_stripped' },
        { kind: 'scheduleFollowup', eventId: 't2-ag-restores-cert', afterDays: 5 }
      ]
    },

    // 30. AG restores certification.
    {
      id: 't2-ag-restores-cert',
      tier: 2,
      title: 'The certification is restored.',
      desc: 'A state attorney general restores your certification after the inquiry\u2019s findings are overturned.',
      flavor: 'No press release this time. Just a letter on stationery, and an apology that is not quite one.',
      class: 'trigger',
      priority: 8,
      onlyOnce: true,
      eligible: function(state) {
        var pending = state.eventFlags && state.eventFlags['__pending:t2-ag-restores-cert'];
        if (!pending) return false;
        return Date.now() >= pending;
      },
      consequences: [
        { kind: 'clearFlag', flag: '__pending:t2-ag-restores-cert' },
        { kind: 'clearFlag', flag: 'cert_stripped' },
        { kind: 'liftUpgrade', upgradeId: 'marketingLevel' },
        { kind: 'marketingMultiplier', factor: 1.4, durationHours: 5 * DAY, label: 'Vindication' },
        { kind: 'addCoins', amount: 600 },
        { kind: 'adjustReputation', amount: +2 }
      ]
    },

    // 31. Rival founder dies, competitor named to creative office.
    {
      id: 't2-rival-wins-seat',
      tier: 2,
      title: 'Your rival wins the creative seat.',
      desc: 'A rival founder dies and a competitor is named to the new holding company\u2019s creative office.',
      flavor: 'The obituary runs on page three. The announcement runs on page one.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 5 * DAY, label: 'Competitor ascendant' },
        { kind: 'loseCoins', amount: 700 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 32. Rival founder dies, YOU are named.
    {
      id: 't2-you-win-seat',
      tier: 2,
      title: 'The holding company names you to the creative office.',
      desc: 'A rival founder dies and you are named to the new holding company\u2019s creative office.',
      flavor: 'The offer arrives in an envelope hand-delivered by a person who does not say their name.',
      class: 'trigger',
      priority: 9,
      onlyOnce: true,
      eligible: coinsAtLeast(15000),
      consequences: [
        { kind: 'addCoins', amount: 4200 },
        { kind: 'incomeMultiplier', factor: 1.35, durationHours: 7 * DAY, label: 'Creative office seat' },
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 7 * DAY, label: 'Industry recognition' },
        { kind: 'adjustReputation', amount: +4 }
      ]
    },

    // 33. Port strike; bonded warehouse rot.
    {
      id: 't2-port-strike',
      tier: 2,
      title: 'The harbor is closed for the season.',
      desc: 'A port strike closes the harbor for a season and your inventory rots in a bonded warehouse.',
      flavor: 'The bonded warehouse does not have climate control. The bonded warehouse has mice.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 75,
      consequences: [
        { kind: 'loseTextiles', amount: 220 },
        { kind: 'textileMultiplier', factor: 0.6, durationHours: 6 * DAY, label: 'Port strike' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 4 * DAY, label: 'Harbor closed' },
        { kind: 'loseCoins', amount: 1100 }
      ]
    },

    // 34. PE offers you a lockup.
    {
      id: 't2-pe-offer-accepted',
      tier: 2,
      title: 'The growth round clears your account by Friday.',
      desc: 'A private-equity firm offers you a growth round and a twelve-year lockup.',
      flavor: 'The term sheet is ninety-eight pages. The partner who signs it smiles too widely.',
      class: 'trigger',
      priority: 7,
      onlyOnce: true,
      eligible: coinsAtLeast(20000),
      consequences: [
        { kind: 'addCoins', amount: 6500 },
        { kind: 'incomeMultiplier', factor: 1.25, durationHours: 10 * DAY, label: 'Growth capital' },
        { kind: 'setFlag', flag: 'pe_locked_in' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 35. PE offers the round to your rival instead.
    {
      id: 't2-pe-goes-to-rival',
      tier: 2,
      title: 'The growth round goes to your rival.',
      desc: 'A private-equity firm offers the round instead to your chief rival.',
      flavor: 'The trade paper publishes the deal memo. Three of your customers forward it to you within an hour.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      forbidsFlags: ['pe_locked_in'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 5 * DAY, label: 'Competitor funded' },
        { kind: 'incomeMultiplier', factor: 0.9, durationHours: 5 * DAY, label: 'Price pressure' },
        { kind: 'loseCoins', amount: 800 }
      ]
    },

    // 36. Indigo seized as contraband.
    {
      id: 't2-indigo-seizure',
      tier: 2,
      title: 'The indigo is in a federal locker.',
      desc: 'A cargo of indigo is seized as contraband and your customs broker flees the country.',
      flavor: 'The broker left a voicemail from a pay phone. The voicemail is in three languages.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      consequences: [
        { kind: 'loseTextiles', amount: 140 },
        { kind: 'loseCoins', amount: 2100 },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 5 * DAY, label: 'Indigo seized' },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 37. Megachurch commissions, pays in publicity.
    {
      id: 't2-megachurch-altar',
      tier: 2,
      title: 'The megachurch pays in publicity.',
      desc: 'A megachurch rector commissions an altar cloth and pays in publicity.',
      flavor: 'The rector is adamant the cloth is "priceless." You submit an invoice. The invoice is not paid.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 45,
      eligible: coinsAtLeast(6000),
      consequences: [
        { kind: 'loseTextiles', amount: 60 },
        { kind: 'marketingMultiplier', factor: 1.6, durationHours: 6 * DAY, label: 'Megachurch feature' },
        { kind: 'adjustReputation', amount: +1 }
      ]
    },

    // 38. Board ex leaks a confidential bid.
    {
      id: 't2-bid-leak',
      tier: 2,
      title: 'Your bid is on a rival\u2019s desk.',
      desc: 'A board member\u2019s ex leaks a confidential bid to a rival brand.',
      flavor: 'The rival undercuts you by four percent. The board member does not return your calls.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 60,
      consequences: [
        { kind: 'loseCoins', amount: 1600 },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 4 * DAY, label: 'Bid undercut' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 39. Substack exposé reaches aggregator front page.
    {
      id: 't2-substack-expose',
      tier: 2,
      title: 'A pamphlet-length exposé names you personally.',
      desc: 'A Substack newsletter publishes a pamphlet-length exposé naming you personally and reaching the front page of three aggregators.',
      flavor: 'Fourteen thousand words. Your mother forwards it. Your lawyer forwards it. Your assistant hides her screen.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 75,
      eligible: levelAtLeast(40),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 6 * DAY, label: 'Substack exposé' },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 4 * DAY, label: 'Audience pause' },
        { kind: 'loseCoins', amount: 1800 },
        { kind: 'adjustReputation', amount: -4 }
      ]
    },

    // 40. New shipping lane to the East.
    {
      id: 't2-east-shipping-lane',
      tier: 2,
      title: 'Your oldest distribution contracts collapse overnight.',
      desc: 'A new shipping lane to the East opens and your oldest distribution contracts collapse overnight.',
      flavor: 'Three phone calls in one morning. Each one begins "unfortunately" and ends before you can answer.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 60,
      eligible: levelAtLeast(45),
      consequences: [
        { kind: 'loseCoins', amount: 2400 },
        { kind: 'incomeMultiplier', factor: 0.75, durationHours: 8 * DAY, label: 'Contracts collapsed' },
        { kind: 'marketingMultiplier', factor: 0.9, durationHours: 4 * DAY, label: 'Distribution upheaval' }
      ]
    }
  ];
  // ---------------------------------------------------------------------------
  // TIER 3 — The Mill
  // Industrial scale (lv. 57–78). Boilers, carding floors, dormitories,
  // strikes, OSHA, federal commissions. A Luddite revival cell escalates
  // the Luddite thread. Amounts scale to $2k – $20k.
  // ---------------------------------------------------------------------------

  var TIER_3_EVENTS = [

    // 41. Luddite robotics smash — scheduled follow-up from t2-luddite-trade-show.
    {
      id: 't3-luddite-robotics',
      tier: 3,
      title: 'A signed letter at your gate.',
      desc: 'A Luddite revival cell smashes the robotics on the carding floor of a neighboring contractor and leaves a signed letter at your gate.',
      flavor: 'The letter is single-spaced, three pages, and signed by nineteen people. Two of the signatures were on your payroll last year.',
      class: 'trigger',
      priority: 14,
      onlyOnce: true,
      eligible: function(state) {
        var pending = state.eventFlags && state.eventFlags['__pending:t3-luddite-robotics'];
        if (!pending) return false;
        return Date.now() >= pending;
      },
      consequences: [
        { kind: 'clearFlag', flag: '__pending:t3-luddite-robotics' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 6 * DAY, label: 'Luddite robotics smash' },
        { kind: 'loseCoins', amount: 3200 },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 2 },
        { kind: 'setFlag', flag: 'luddite_thread_insurgent' },
        { kind: 'scheduleFollowup', eventId: 't3-luddite-arrest', afterDays: 12 }
      ]
    },

    // 42. Luddite cell arrested, convicted at your gate.
    {
      id: 't3-luddite-arrest',
      tier: 3,
      title: 'The cell is convicted at the federal courthouse.',
      desc: 'A Luddite revival cell is arrested at your gate and convicted at the federal courthouse.',
      flavor: 'The sentencing is televised. Two of the defendants wave at you across the gallery. You recognize both.',
      class: 'trigger',
      priority: 11,
      onlyOnce: true,
      eligible: function(state) {
        var pending = state.eventFlags && state.eventFlags['__pending:t3-luddite-arrest'];
        if (!pending) return false;
        return Date.now() >= pending;
      },
      consequences: [
        { kind: 'clearFlag', flag: '__pending:t3-luddite-arrest' },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 4 * DAY, label: 'Trial fallout' },
        { kind: 'adjustReputation', amount: -1 },
        { kind: 'addCoins', amount: 1400 },
        { kind: 'setFlag', flag: 'luddite_thread_judicial' }
      ]
    },

    // 43. Worker dies under carding machine; OSHA rules accidental.
    {
      id: 't3-osha-accidental',
      tier: 3,
      title: 'OSHA rules it accidental.',
      desc: 'A worker dies under a carding machine and OSHA rules it accidental.',
      flavor: 'The union steward reads the finding twice. The widow does not read it.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 75,
      consequences: [
        { kind: 'loseCoins', amount: 2800 },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 4 * DAY, label: 'Floor fatality' },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 44. Worker dies; OSHA rules otherwise.
    {
      id: 't3-osha-otherwise',
      tier: 3,
      title: 'OSHA rules it otherwise.',
      desc: 'A worker dies under a carding machine and OSHA rules it otherwise.',
      flavor: 'The finding is forty-one pages. The penalty figure is on page seven, and it has six digits.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      consequences: [
        { kind: 'loseCoins', amount: 8500 },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 5 * DAY, label: 'OSHA halt' },
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 6 * DAY, label: 'Negligent finding' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 2 }
      ]
    },

    // 45. Boiler explosion levels the east wing.
    {
      id: 't3-boiler-explosion',
      tier: 3,
      title: 'The east wing is gone.',
      desc: 'A boiler explosion levels the east wing of the mill.',
      flavor: 'The fire crews arrive from three counties. The smoke column is visible from the interstate for six hours.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 120,
      consequences: [
        { kind: 'loseCoins', amount: 9500 },
        { kind: 'loseTextiles', amount: 320 },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 7 * DAY, label: 'East wing rebuild' },
        { kind: 'textileMultiplier', factor: 0.55, durationHours: 6 * DAY, label: 'Production halved' },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 46. Rival mill boiler kills 70; your mill is cited in the inquiry.
    {
      id: 't3-rival-boiler-inquiry',
      tier: 3,
      title: 'Your mill is cited in the inquiry.',
      desc: 'A boiler explosion at a rival mill kills seventy and your mill is cited in the inquiry.',
      flavor: 'The commissioners read your name twice in the opening session. The photograph is of their mill. Your name appears on the third page.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      consequences: [
        { kind: 'loseCoins', amount: 4200 },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 6 * DAY, label: 'Industry inquiry' },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 47. Strike of carders and sorters, 11 weeks.
    {
      id: 't3-strike-eleven-weeks',
      tier: 3,
      title: 'The carding floor is dark for eleven weeks.',
      desc: 'A strike of carders and sorters shuts the floor for eleven weeks.',
      flavor: 'The picket line stays up through two snowstorms. The diner across the road runs a tab for strikers and does not ask for payment.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 100,
      eligible: rosterAtLeast(5),
      consequences: [
        { kind: 'incomeMultiplier', factor: 0.5, durationHours: 11 * DAY, label: 'Carder strike' },
        { kind: 'textileMultiplier', factor: 0.35, durationHours: 11 * DAY, label: 'Floor dark' },
        { kind: 'loseTextiles', amount: 400 },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 48. Strike collapses after recession winter.
    {
      id: 't3-strike-collapses',
      tier: 3,
      title: 'The strike collapses.',
      desc: 'A strike of carders and sorters collapses after a recession winter.',
      flavor: 'The union local disbands in February. The holdouts go back for what they were earning in autumn.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      requiresFlags: [],
      consequences: [
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 5 * DAY, label: 'Floor reopens' },
        { kind: 'loseCoins', amount: 800 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 49. OSHA inspector transferred.
    {
      id: 't3-osha-transferred',
      tier: 3,
      title: 'The inspector is reassigned within the week.',
      desc: 'An OSHA inspector files a report on the dormitories and is transferred the next week.',
      flavor: 'His new office is in a state he has never driven to. His report does not circulate.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 3 * DAY, label: 'Transfer rumour' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'setFlag', flag: 'osha_irregular' }
      ]
    },

    // 50. Songwriter-activist ballad charts.
    {
      id: 't3-eater-ballad',
      tier: 3,
      title: 'A ballad calls your mill the Eater of Workers.',
      desc: 'A songwriter-activist publishes a ballad calling your mill the Eater of Workers and it charts.',
      flavor: 'Three verses and a chorus. Six weeks on the folk chart. Eleven covers within the year.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 100,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 8 * DAY, label: 'Eater ballad' },
        { kind: 'incomeMultiplier', factor: 0.9, durationHours: 5 * DAY, label: 'Boycott trickle' },
        { kind: 'adjustReputation', amount: -4 }
      ]
    },

    // 51. Three-book series where your mill is the villain.
    {
      id: 't3-novel-villain',
      tier: 3,
      title: 'Your mill is the villain in a trilogy.',
      desc: 'A three-book series is published in which your mill is the villain.',
      flavor: 'The third volume spends forty pages inside your office. The details are accurate enough to identify the author\u2019s source.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 120,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 10 * DAY, label: 'Trilogy publication' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 1 }
      ]
    },

    // 52. Congressional select committee.
    {
      id: 't3-congressional-hearings',
      tier: 3,
      title: 'A congressional committee holds hearings in your district.',
      desc: 'A congressional select committee holds hearings on conditions in your district.',
      flavor: 'The hearing room is televised. Your testimony is rehearsed. The rehearsal does not help.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 120,
      eligible: levelAtLeast(65),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 8 * DAY, label: 'Congressional hearings' },
        { kind: 'loseCoins', amount: 7000 },
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 7 * DAY, label: 'Hearing coverage' },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 53. Federal commission report names your mill on the title page.
    {
      id: 't3-commission-title-page',
      tier: 3,
      title: 'Your mill is on the title page of the commission report.',
      desc: 'A federal commission produces a report and names your mill on the title page.',
      flavor: 'The report is 612 pages. Your mill\u2019s name appears in the largest font in the document.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 150,
      eligible: levelAtLeast(70),
      consequences: [
        { kind: 'loseCoins', amount: 14000 },
        { kind: 'marketingMultiplier', factor: 0.5, durationHours: 10 * DAY, label: 'Commission report' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 5 * DAY, label: 'Report fallout' },
        { kind: 'adjustReputation', amount: -5 }
      ]
    },

    // 54. Chief engineer patents autonomous loom-cell; rival sues.
    {
      id: 't3-patent-filed',
      tier: 3,
      title: 'Your chief engineer\u2019s patent issues.',
      desc: 'Your chief engineer patents an autonomous loom-cell; a rival mill sues for infringement.',
      flavor: 'The patent certificate is framed in the engineer\u2019s office. The suit is filed from three states over the same morning.',
      class: 'trigger',
      priority: 7,
      onlyOnce: true,
      eligible: coinsAtLeast(30000),
      consequences: [
        { kind: 'addCoins', amount: 4500 },
        { kind: 'incomeMultiplier', factor: 1.3, durationHours: 10 * DAY, label: 'Patent licensing' },
        { kind: 'setFlag', flag: 'autoloom_patent' },
        { kind: 'loseCoins', amount: 1800 }
      ]
    },

    // 55. Patent overturned by federal circuit.
    {
      id: 't3-patent-overturned',
      tier: 3,
      title: 'The federal circuit overturns the patent.',
      desc: 'Your chief engineer\u2019s patent is overturned by the federal circuit.',
      flavor: 'The three-judge opinion is forty pages. The dissent is longer. The licensing revenue stops on a Tuesday.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 120,
      requiresFlags: ['autoloom_patent'],
      consequences: [
        { kind: 'clearFlag', flag: 'autoloom_patent' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 8 * DAY, label: 'Licensing revoked' },
        { kind: 'loseCoins', amount: 6200 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 56. Legionnaires' outbreak in dormitories.
    {
      id: 't3-legionnaires',
      tier: 3,
      title: 'The dormitories are empty for three months.',
      desc: 'A Legionnaires\u2019 outbreak empties your dormitories for three months.',
      flavor: 'Seventeen cases. Two fatalities. The cooling towers are replaced in the first week and again in the eighth.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 120,
      eligible: levelAtLeast(60),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 10 * DAY, label: 'Dormitory outbreak' },
        { kind: 'loseCoins', amount: 5400 },
        { kind: 'incomeMultiplier', factor: 0.7, durationHours: 8 * DAY, label: 'Workforce thinned' },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 57. Chemical spill in dyeing shed; river poisoned.
    {
      id: 't3-dye-spill',
      tier: 3,
      title: 'The river is closed for ten miles downstream.',
      desc: 'A chemical spill in the dyeing shed poisons a river for ten miles downstream.',
      flavor: 'The EPA establishes a perimeter and a phone line. Neither is answered by anyone from your mill.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 150,
      eligible: levelAtLeast(65),
      consequences: [
        { kind: 'loseCoins', amount: 18000 },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 10 * DAY, label: 'EPA remediation' },
        { kind: 'textileMultiplier', factor: 0.55, durationHours: 8 * DAY, label: 'Dyeing shed closed' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 8 * DAY, label: 'River story' },
        { kind: 'adjustReputation', amount: -5 }
      ]
    },

    // 58. Climate-strike rally; police called.
    {
      id: 't3-climate-police',
      tier: 3,
      title: 'The state police are at your gate.',
      desc: 'A climate-strike rally is held at your mill gate and the state police are called.',
      flavor: 'The footage is on three networks by dinnertime. None of it is flattering.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 75,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 4 * DAY, label: 'Rally footage' },
        { kind: 'loseCoins', amount: 1800 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 59. Climate-strike rally; police NOT called.
    {
      id: 't3-climate-restrained',
      tier: 3,
      title: 'You declined to call the police.',
      desc: 'A climate-strike rally is held at your mill gate and the state police are not called.',
      flavor: 'You send out coffee. The organizers photograph it, and their photograph runs on a Sunday op-ed page you respect.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 75,
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.25, durationHours: 5 * DAY, label: 'Restrained response' },
        { kind: 'adjustReputation', amount: +2 }
      ]
    },

    // 60. Freight-rail consortium routes main line to your mill.
    {
      id: 't3-rail-rerouted',
      tier: 3,
      title: 'The main line now ends at your door.',
      desc: 'A freight-rail consortium routes the main line to your mill\u2019s door after a private letter.',
      flavor: 'The consortium chair writes in blue ink. The letter is four sentences. The re-route takes six months.',
      class: 'trigger',
      priority: 8,
      onlyOnce: true,
      eligible: coinsAtLeast(40000),
      consequences: [
        { kind: 'addCoins', amount: 12000 },
        { kind: 'incomeMultiplier', factor: 1.45, durationHours: 14 * DAY, label: 'Rail routed to mill' },
        { kind: 'textileMultiplier', factor: 1.2, durationHours: 14 * DAY, label: 'Rail logistics' },
        { kind: 'adjustReputation', amount: +3 }
      ]
    },

    // 61. Cotton shortage drives you to mix in recycled fiber.
    {
      id: 't3-cotton-shortage',
      tier: 3,
      title: 'You are blending recycled fiber to keep the looms running.',
      desc: 'A cotton shortage from a distant war drives you to mix in recycled fiber.',
      flavor: 'The engineer runs eleven test batches. Seven of them pass. Four of them should not have.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 60,
      consequences: [
        { kind: 'textileMultiplier', factor: 0.8, durationHours: 6 * DAY, label: 'Recycled fiber blend' },
        { kind: 'loseCoins', amount: 2200 },
        { kind: 'setFlag', flag: 'recycled_blend_shipping' }
      ]
    },

    // 62. Recycled-fiber cloth rejected by quartermaster.
    {
      id: 't3-quartermaster-rejection',
      tier: 3,
      title: 'The quartermaster returns everything.',
      desc: 'Recycled-fiber cloth is rejected by the military quartermaster and returned by the pallet.',
      flavor: 'Nineteen pallets. Shrink-wrapped. Tagged in red. Parked along the back wall of the receiving dock.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 90,
      requiresFlags: ['recycled_blend_shipping'],
      consequences: [
        { kind: 'clearFlag', flag: 'recycled_blend_shipping' },
        { kind: 'loseCoins', amount: 6800 },
        { kind: 'loseTextiles', amount: 260 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 63. Former line-worker diary serialized.
    {
      id: 't3-worker-diary',
      tier: 3,
      title: 'A line-worker\u2019s diary is being read in waiting rooms.',
      desc: 'A former line-worker\u2019s diary is serialized in a national paper and read in waiting rooms across the country.',
      flavor: 'Nineteen installments. The illustrations are from the paper\u2019s own archivist, who used to work for you.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 100,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 9 * DAY, label: 'Diary serialized' },
        { kind: 'addDissident', count: 2 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 64. Strike-breaker beaten to death; jury acquits.
    {
      id: 't3-strikebreaker-acquittal',
      tier: 3,
      title: 'The jury acquits.',
      desc: 'A strike-breaker is beaten to death on the back lane; the jury acquits.',
      flavor: 'The verdict takes forty minutes. The sheriff\u2019s deputies stand at the back of the courtroom and do not move.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 150,
      eligible: levelAtLeast(68),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 7 * DAY, label: 'Acquittal backlash' },
        { kind: 'loseCoins', amount: 5200 },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 2 }
      ]
    },

    // 65. Town council orders company flag taken down from water tower.
    {
      id: 't3-flag-removed',
      tier: 3,
      title: 'The company flag comes down from the water tower.',
      desc: 'The town council orders your new company flag taken down from the water tower.',
      flavor: 'The vote is five to four. The minutes do not record the discussion. The flag is in a municipal storage shed by Friday.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 60,
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.9, durationHours: 3 * DAY, label: 'Flag removed' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    }
  ];
  // ---------------------------------------------------------------------------
  // TIER 4 — The Aristocracy
  // Dynasty, honors, country houses, state ceremonies (lv. 78–114).
  // The dissident thread moves from mill-floor to drawing-room: rival heirs.
  // Money scale: $10k – $60k.  Reputation swings: ±3 to ±7.
  // ---------------------------------------------------------------------------

  var TIER_4_EVENTS = [
    // 66. Head of state awards a civilian honor.
    {
      id: 't4-civilian-honor',
      tier: 4,
      title: 'A civilian honor is conferred.',
      desc: 'The head of state awards you a civilian honor for service to the country\u2019s textile sector.',
      flavor: 'The ribbon is dove-gray silk. The citation is read in three languages. Your mother is photographed weeping.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(80),
      forbidsFlags: ['civilian_honor'],
      consequences: [
        { kind: 'setFlag', flag: 'civilian_honor' },
        { kind: 'marketingMultiplier', factor: 1.45, durationHours: 14 * DAY, label: 'Civilian honor' },
        { kind: 'adjustReputation', amount: 5 },
        { kind: 'addCoins', amount: 18000 }
      ]
    },

    // 67. Head of state privately withdraws the honor.
    {
      id: 't4-honor-withdrawn',
      tier: 4,
      title: 'The honor is quietly withdrawn.',
      desc: 'The head of state privately withdraws the honor after a whisper from a rival magnate.',
      flavor: 'No press release. A single telegram. The ribbon is requested back, couriered, returned unworn.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      requiresFlags: ['civilian_honor'],
      consequences: [
        { kind: 'clearFlag', flag: 'civilian_honor' },
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 10 * DAY, label: 'Honor withdrawn' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 1 }
      ]
    },

    // 68. Advantageous marriage with a senator's heir.
    {
      id: 't4-marriage-advantageous',
      tier: 4,
      title: 'A senator\u2019s heir joins the house.',
      desc: 'Your eldest child contracts an advantageous marriage with a senator\u2019s heir.',
      flavor: 'The reception is written up in the society page for nine Sundays running. A hunting lodge changes hands as part of the settlement.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(84),
      forbidsFlags: ['dynasty_alliance', 'dynasty_disaster'],
      consequences: [
        { kind: 'setFlag', flag: 'dynasty_alliance' },
        { kind: 'incomeMultiplier', factor: 1.4, durationHours: 21 * DAY, label: 'Senate alliance' },
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 21 * DAY, label: 'Society columns' },
        { kind: 'adjustReputation', amount: 4 },
        { kind: 'addCoins', amount: 32000 }
      ]
    },

    // 69. Disastrous marriage with a senator's heir.
    {
      id: 't4-marriage-disastrous',
      tier: 4,
      title: 'The senator\u2019s heir is a disaster.',
      desc: 'Your eldest child contracts a disastrous marriage with a senator\u2019s heir.',
      flavor: 'The first scandal breaks within a fortnight of the honeymoon. The second scandal breaks before the gifts have been unpacked.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(84),
      forbidsFlags: ['dynasty_alliance', 'dynasty_disaster'],
      consequences: [
        { kind: 'setFlag', flag: 'dynasty_disaster' },
        { kind: 'incomeMultiplier', factor: 0.7, durationHours: 14 * DAY, label: 'Marital scandal' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 14 * DAY, label: 'Society columns' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'loseCoins', amount: 24000 },
        { kind: 'addDissident', count: 1 }
      ]
    },

    // 70. Portrait painter — canvas refused by the family.
    {
      id: 't4-portrait-refused',
      tier: 4,
      title: 'The portrait is refused.',
      desc: 'A famous portrait painter paints you in an experimental style and the canvas is refused by the family.',
      flavor: 'Your wife will not have it over the mantel. Your mother will not have it in the house. The painter retails the anecdote at a Paris dinner.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 90,
      eligible: levelAtLeast(82),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 5 * DAY, label: 'Portrait scandal' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 6000 }
      ]
    },

    // 71. Act of Congress — foundation tax treatment contingent on domestic production.
    {
      id: 't4-foundation-tax-act',
      tier: 4,
      title: 'Congress grants the foundation a tax treatment.',
      desc: 'An act of Congress grants your foundation a tax treatment contingent on domestic production.',
      flavor: 'The bill is fifty-one pages. Your counsel marks twelve of them. The clause that matters is in a footnote on page thirty-eight.',
      class: 'trigger',
      priority: 80,
      onlyOnce: true,
      eligible: function(state) { return (state.level || 0) >= 90 && (state.coins || 0) >= 40000; },
      consequences: [
        { kind: 'setFlag', flag: 'foundation_tax_treatment' },
        { kind: 'incomeMultiplier', factor: 1.5, durationHours: 28 * DAY, label: 'Foundation tax shield' },
        { kind: 'textileMultiplier', factor: 1.35, durationHours: 28 * DAY, label: 'Domestic-production bonus' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'addCoins', amount: 42000 }
      ]
    },

    // 72. Investor coalition publishes list — exploitative overseas labor.
    {
      id: 't4-investor-coalition-list',
      tier: 4,
      title: 'The list names you.',
      desc: 'An investor coalition publishes a list of dynasty families tied to exploitative overseas labor; you are on it.',
      flavor: 'It is a broadsheet insert. The names are in alphabetical order. Your pew at St. Thomas empties two rows on Sunday.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(85),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 9 * DAY, label: 'Ethics boycott' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 14000 }
      ]
    },

    // 73. Country-house weekend — guest punches a senator.
    {
      id: 't4-guest-punches-senator',
      tier: 4,
      title: 'A guest punches a senator.',
      desc: 'A country-house weekend of yours ends with a guest punching a senator.',
      flavor: 'It is the billiard room. It is the third decanter. The senator is photographed on the gravel drive with a dinner napkin to his nose.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 90,
      eligible: levelAtLeast(82),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 6 * DAY, label: 'House-party scandal' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 9000 }
      ]
    },

    // 74. Foreign intelligence officer identified among the weekend guests.
    {
      id: 't4-foreign-intel-guest',
      tier: 4,
      title: 'A guest is a foreign intelligence officer.',
      desc: 'An uninvited country-house guest is later identified as a foreign intelligence officer.',
      flavor: 'Two gentlemen from the Bureau visit on a Wednesday. The library door stays closed for four hours. The guest-book page for that weekend is quietly removed.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 150,
      eligible: levelAtLeast(88),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 6 * DAY, label: 'Under federal inquiry' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 8 * DAY, label: 'Counter-intelligence shadow' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 1 }
      ]
    },

    // 75. Freight baron marries into the family.
    {
      id: 't4-freight-baron-marriage',
      tier: 4,
      title: 'The freight baron joins the family.',
      desc: 'The freight baron whose main line serves your mill marries into your family.',
      flavor: 'The wedding breakfast is laid in a converted locomotive shed. The ice sculpture is the family crest on a flat-car.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(86),
      consequences: [
        { kind: 'setFlag', flag: 'rail_in_family' },
        { kind: 'incomeMultiplier', factor: 1.35, durationHours: 21 * DAY, label: 'Freight discount' },
        { kind: 'textileMultiplier', factor: 1.25, durationHours: 21 * DAY, label: 'Priority freight' },
        { kind: 'addCoins', amount: 26000 },
        { kind: 'adjustReputation', amount: 2 }
      ]
    },

    // 76. Megachurch pastor's sermon picked up across cable news.
    {
      id: 't4-megachurch-sermon',
      tier: 4,
      title: 'The pastor denounces the collection.',
      desc: 'A megachurch pastor\u2019s sermon against your new collection is picked up across cable news.',
      flavor: 'Eleven thousand seats. Three broadcast trucks. The clip runs on four networks and two of them do not add context.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 90,
      eligible: levelAtLeast(85),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 9 * DAY, label: 'Pulpit boycott' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 2 },
        { kind: 'loseCoins', amount: 11000 }
      ]
    },

    // 77. State wedding dresses the bride in your silk.
    {
      id: 't4-state-wedding-silk',
      tier: 4,
      title: 'The bride wears your silk.',
      desc: 'A state wedding dresses the bride in your house\u2019s silk and the train is reported across two continents.',
      flavor: 'Thirty-two feet of train. Four hundred seamstresses credited in the program. The pattern sells out on the continent in two business days.',
      class: 'trigger',
      priority: 70,
      onlyOnce: true,
      eligible: levelAtLeast(92),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.8, durationHours: 14 * DAY, label: 'State wedding' },
        { kind: 'textileMultiplier', factor: 1.4, durationHours: 14 * DAY, label: 'Bridal orders' },
        { kind: 'addCoins', amount: 48000 },
        { kind: 'addTextiles', amount: 220 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 78. State funeral dresses the bier in your house's black crape.
    {
      id: 't4-state-funeral-crape',
      tier: 4,
      title: 'The bier wears your crape.',
      desc: 'A state funeral dresses the bier in your house\u2019s black crape and is reported across two continents.',
      flavor: 'The crape is hand-dyed in the old Nottingham well. Twelve pallbearers. Six hundred yards of bunting. The run sells out before the procession reaches the cathedral.',
      class: 'trigger',
      priority: 70,
      onlyOnce: true,
      eligible: levelAtLeast(95),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.7, durationHours: 14 * DAY, label: 'State funeral' },
        { kind: 'textileMultiplier', factor: 1.4, durationHours: 14 * DAY, label: 'Mourning commissions' },
        { kind: 'addCoins', amount: 44000 },
        { kind: 'addTextiles', amount: 200 },
        { kind: 'adjustReputation', amount: 3 }
      ]
    },

    // 79. Property-tax reform — estates reassessed at unprecedented value.
    {
      id: 't4-property-tax-reform',
      tier: 4,
      title: 'The estates are reassessed.',
      desc: 'A property-tax reform assesses your estates at unprecedented value.',
      flavor: 'The assessor\u2019s letter arrives in a manila envelope on a Tuesday. Your counsel is in the library for six hours. The figure is not debatable.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: function(state) { return (state.level || 0) >= 88 && (state.coins || 0) >= 30000; },
      consequences: [
        { kind: 'loseCoins', amount: 36000 },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 10 * DAY, label: 'Tax reassessment' }
      ]
    },

    // 80. County census — largest private employer.
    {
      id: 't4-largest-employer',
      tier: 4,
      title: 'The county\u2019s largest private employer.',
      desc: 'A county census names your household the largest private employer in the county.',
      flavor: 'The number is printed on the front page under a photograph of the gatehouse. The mayor sends a hamper.',
      class: 'ambient',
      weight: 3,
      cooldownDays: 120,
      eligible: rosterAtLeast(8),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 7 * DAY, label: 'Civic standing' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'addCoins', amount: 14000 }
      ]
    },

    // 81. Federal election turns on a documentary your house funded.
    {
      id: 't4-documentary-election',
      tier: 4,
      title: 'The documentary moves the election.',
      desc: 'A federal election turns on a nonprofit documentary your house is privately credited with funding.',
      flavor: 'Ninety-four minutes. Four theaters. The margin is six states. The credit line is the last card and is on screen for one and a half seconds.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(95),
      consequences: [
        { kind: 'setFlag', flag: 'election_kingmaker' },
        { kind: 'marketingMultiplier', factor: 1.5, durationHours: 10 * DAY, label: 'Kingmaker halo' },
        { kind: 'incomeMultiplier', factor: 1.25, durationHours: 14 * DAY, label: 'Administration friendship' },
        { kind: 'adjustReputation', amount: 4 },
        { kind: 'addDissident', count: 2 },
        { kind: 'addCoins', amount: 22000 }
      ]
    },

    // 82. Country-house fire destroys the original pattern books.
    {
      id: 't4-patterns-burned',
      tier: 4,
      title: 'The pattern books are ash.',
      desc: 'A country-house fire destroys the original pattern books of your grandfather\u2019s workshop.',
      flavor: 'The library wing goes up at three in the morning. The housekeeper carries out a Bible and a spaniel. The pattern cabinet is not recovered.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 365,
      onlyOnce: true,
      eligible: levelAtLeast(88),
      forbidsFlags: ['patterns_saved'],
      consequences: [
        { kind: 'setFlag', flag: 'patterns_lost' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 12 * DAY, label: 'Pattern books destroyed' },
        { kind: 'textileMultiplier', factor: 0.7, durationHours: 18 * DAY, label: 'Heritage motifs lost' },
        { kind: 'loseTextiles', amount: 180 },
        { kind: 'loseCoins', amount: 28000 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 83. Country-house fire spares the pattern books.
    {
      id: 't4-patterns-saved',
      tier: 4,
      title: 'The pattern books survive the fire.',
      desc: 'A country-house fire spares the pattern books while consuming everything else.',
      flavor: 'Everything else is ash. The cabinet is charred on one side. The motifs are legible. A restorer is booked within the hour.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 365,
      onlyOnce: true,
      eligible: levelAtLeast(88),
      forbidsFlags: ['patterns_lost'],
      consequences: [
        { kind: 'setFlag', flag: 'patterns_saved' },
        { kind: 'textileMultiplier', factor: 1.3, durationHours: 14 * DAY, label: 'Pattern books preserved' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'loseCoins', amount: 18000 }
      ]
    },

    // 84. Foreign correspondent publishes damning account.
    {
      id: 't4-foreign-correspondent-damning',
      tier: 4,
      title: 'The foreign correspondent is damning.',
      desc: 'A visiting foreign correspondent publishes a damning account of your factory system.',
      flavor: 'Twelve thousand words. Three pull-quotes about the dormitory blocks. The magazine sells out in four capitals.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(85),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 11 * DAY, label: 'Foreign press backlash' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 16000 }
      ]
    },

    // 85. Foreign minister publishes sympathetic account.
    {
      id: 't4-foreign-minister-sympathetic',
      tier: 4,
      title: 'The foreign minister is sympathetic.',
      desc: 'A visiting foreign minister publishes a sympathetic account of your factory system.',
      flavor: 'A signed copy arrives with the minister\u2019s compliments. Two thousand words about the crèche. A drawing of the gate, not the dormitories.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(85),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 10 * DAY, label: 'Favorable dispatch' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'addCoins', amount: 12000 }
      ]
    },

    // 86. Daughter photographed for a fashion magazine in your mourning crape.
    {
      id: 't4-daughter-crape-shoot',
      tier: 4,
      title: 'Your daughter wears the house crape.',
      desc: 'Your daughter is photographed for a fashion magazine draped in your own mourning crape.',
      flavor: 'The cover is gelatin-silver. The editor notes the crape by its lot number. The mourning line is reprinted twice by quarter\u2019s end.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 90,
      eligible: levelAtLeast(90),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.35, durationHours: 8 * DAY, label: 'Magazine cover' },
        { kind: 'textileMultiplier', factor: 1.2, durationHours: 10 * DAY, label: 'Mourning-line reprint' },
        { kind: 'addCoins', amount: 10000 },
        { kind: 'adjustReputation', amount: 2 }
      ]
    },

    // 87. Manifesto among rival dynasty heirs; your own cousin signs it.
    // Begins the aristocratic luddite thread — seeds T5.
    {
      id: 't4-cousin-manifesto',
      tier: 4,
      title: 'Your cousin signs the manifesto.',
      desc: 'A manifesto circulates among the heirs of a rival dynasty calling for the dismantling of your automated cutting lines; one of your own cousins signs it.',
      flavor: 'Sixty signatories. Your cousin is the forty-third. The signatures are in order of precedence. Your mother learns of it from the Sunday papers.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(100),
      consequences: [
        { kind: 'setFlag', flag: 'aristo_luddite_active' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 12 * DAY, label: 'Dynasty schism' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 7 * DAY, label: 'Family injunction' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 26000 }
      ]
    }
  ];
  // ---------------------------------------------------------------------------
  // TIER 5 — The Corporate Oligarchy
  // Antitrust, unions, Pinkertons, Senate subpoenas, international coups
  // (lv. 114–155).  The trust is too big to love and just small enough to hate.
  // Money scale: $40k – $240k.  Suspensions: 5 – 20 days.
  // Closes the hand-craft / luddite arc via the tax-exempt religious sect.
  // ---------------------------------------------------------------------------

  var TIER_5_EVENTS = [
    // 88. Largest mill votes by wide margin to unionize.
    {
      id: 't5-union-vote-yes',
      tier: 5,
      title: 'The mill votes to unionize.',
      desc: 'Workers at the largest mill vote by a wide margin to unionize.',
      flavor: 'The tally is read from a folding chair in the canteen at 11:47 p.m. The margin is four to one. The ballots are burned on the canteen stove.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(116),
      forbidsFlags: ['union_organized', 'union_defeated'],
      consequences: [
        { kind: 'setFlag', flag: 'union_organized' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 30 * DAY, label: 'Wage settlement' },
        { kind: 'marketingMultiplier', factor: 1.2, durationHours: 21 * DAY, label: 'Labor-peace premium' },
        { kind: 'adjustReputation', amount: 2 },
        { kind: 'loseCoins', amount: 48000 }
      ]
    },

    // 89. Narrow vote against unionization after a pressure campaign.
    {
      id: 't5-union-vote-no',
      tier: 5,
      title: 'The pressure campaign holds the mill.',
      desc: 'Workers at the largest mill vote narrowly against unionization after a pressure campaign.',
      flavor: 'Margin of eighty-three votes. Four foremen are quietly given envelopes on Monday. The organizing committee is fired by Friday.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(116),
      forbidsFlags: ['union_organized', 'union_defeated'],
      consequences: [
        { kind: 'setFlag', flag: 'union_defeated' },
        { kind: 'incomeMultiplier', factor: 1.25, durationHours: 28 * DAY, label: 'Wage suppression' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 14 * DAY, label: 'Labor scandal' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 4 },
        { kind: 'addCoins', amount: 42000 }
      ]
    },

    // 90. Sit-down strike closes three factories for sixty-one days.
    {
      id: 't5-sit-down-strike',
      tier: 5,
      title: 'Three factories are sat in.',
      desc: 'A sit-down strike closes three factories for sixty-one days.',
      flavor: 'Workers refuse to leave the floor. Food is passed in through the loading-dock grates. Management negotiates from the parking lot.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(118),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 14 * DAY, label: 'Sit-down occupation' },
        { kind: 'incomeMultiplier', factor: 0.45, durationHours: 18 * DAY, label: 'Factories occupied' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 12 * DAY, label: 'Public sympathy for strikers' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 72000 }
      ]
    },

    // 91. Wildcat strike closes seventeen warehouses at dawn.
    {
      id: 't5-wildcat-strike',
      tier: 5,
      title: 'Seventeen warehouses shut at dawn.',
      desc: 'A wildcat strike closes seventeen warehouses at dawn.',
      flavor: 'The teamsters call it at 4:40 a.m. The distribution floor finds out from the morning papers. The trucks do not move for eleven days.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(118),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 10 * DAY, label: 'Wildcat action' },
        { kind: 'incomeMultiplier', factor: 0.65, durationHours: 10 * DAY, label: 'Warehouses dark' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 38000 }
      ]
    },

    // 92. Company town water supply contaminated by dyeing facility.
    {
      id: 't5-water-contamination',
      tier: 5,
      title: 'The water is contaminated.',
      desc: 'A company town\u2019s water supply is found contaminated by a dyeing facility.',
      flavor: 'The EPA report is 184 pages. Three pediatric wards are named by county. A class action is filed within the week.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(118),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 14 * DAY, label: 'Dye-house shuttered' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 14 * DAY, label: 'Contamination scandal' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 5 },
        { kind: 'loseCoins', amount: 58000 }
      ]
    },

    // 93. Schoolhouse burns; rumor names the mill's watchman.
    {
      id: 't5-schoolhouse-fire',
      tier: 5,
      title: 'The schoolhouse burns.',
      desc: 'A company town\u2019s schoolhouse burns and rumor names the mill\u2019s watchman.',
      flavor: 'The fire takes the annex first. The rumor starts at the feed store and is in the pulpit by Sunday. Nothing is ever filed with the sheriff.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(116),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 8 * DAY, label: 'Town grief' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 22000 }
      ]
    },

    // 94. Muckraker publishes names and ages of children on carding floor.
    {
      id: 't5-child-labor-exposed',
      tier: 5,
      title: 'The names and ages are printed.',
      desc: 'A muckraking journalist publishes the names and ages of the children on your carding floor.',
      flavor: 'Two hundred and eighteen names. Youngest is nine. The paper runs the list as a centerfold pull-out and three libraries request extra copies.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(118),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 16 * DAY, label: 'Federal labor inquiry' },
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 16 * DAY, label: 'Child-labor exposé' },
        { kind: 'adjustReputation', amount: -7 },
        { kind: 'addDissident', count: 6 },
        { kind: 'loseCoins', amount: 64000 }
      ]
    },

    // 95. Muckraker publishes Pinkerton names.
    {
      id: 't5-pinkertons-exposed',
      tier: 5,
      title: 'The Pinkerton names are printed.',
      desc: 'A muckraking journalist publishes the names of the Pinkertons on your payroll.',
      flavor: 'Forty-seven names. Eleven addresses. The piece runs on page one under a photograph of a dormitory window seen through a rifle-scope crosshair.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(118),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 12 * DAY, label: 'Pinkerton exposé' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 5 },
        { kind: 'loseCoins', amount: 34000 }
      ]
    },

    // 96. Senator introduces antitrust bill naming your trust.
    {
      id: 't5-antitrust-bill-introduced',
      tier: 5,
      title: 'The antitrust bill names your trust.',
      desc: 'A senator introduces an antitrust bill naming your trust in its title.',
      flavor: 'The bill is Senate Bill 4127. Your company\u2019s name is in the title and again in sections two, seven, and eleven. The floor speech runs ninety-two minutes.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(122),
      forbidsFlags: ['antitrust_deflected', 'trust_broken', 'trust_saved'],
      consequences: [
        { kind: 'setFlag', flag: 'antitrust_bill_pending' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 8 * DAY, label: 'Bill under debate' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 12 * DAY, label: 'Antitrust scrutiny' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'scheduleFollowup', eventId: 't5-antitrust-bill-withdrawn', afterDays: 6 }
      ]
    },

    // 97. Antitrust bill withdrawn after a private-jet visit.
    {
      id: 't5-antitrust-bill-withdrawn',
      tier: 5,
      title: 'The bill is withdrawn.',
      desc: 'A senator withdraws the antitrust bill after a private-jet visit.',
      flavor: 'The flight is logged to a strip in the senator\u2019s home state. The withdrawal is announced in a Friday-afternoon press release. The senator is not available for comment.',
      class: 'trigger',
      priority: 80,
      onlyOnce: true,
      requiresFlags: ['antitrust_bill_pending'],
      consequences: [
        { kind: 'clearFlag', flag: 'antitrust_bill_pending' },
        { kind: 'setFlag', flag: 'antitrust_deflected' },
        { kind: 'incomeMultiplier', factor: 1.3, durationHours: 21 * DAY, label: 'Antitrust deflected' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 2 },
        { kind: 'loseCoins', amount: 28000 }
      ]
    },

    // 98. Supreme Court orders trust broken into seven companies.
    {
      id: 't5-trust-broken',
      tier: 5,
      title: 'The Court orders the trust broken.',
      desc: 'The Supreme Court orders your trust broken into seven constituent companies.',
      flavor: 'Seven to two. The majority opinion runs 116 pages. The dissent runs 44. The seven successor companies are named by the receiver within ninety days.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(130),
      forbidsFlags: ['trust_saved', 'antitrust_deflected'],
      consequences: [
        { kind: 'setFlag', flag: 'trust_broken' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 20 * DAY, label: 'Dissolution receivership' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 14 * DAY, label: 'Dissolution receivership' },
        { kind: 'incomeMultiplier', factor: 0.5, durationHours: 30 * DAY, label: 'Dissolution order' },
        { kind: 'loseCoins', amount: 180000 },
        { kind: 'loseTextiles', amount: 400 },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 99. Supreme Court declines to hear the case.
    {
      id: 't5-trust-saved',
      tier: 5,
      title: 'The Court declines the case.',
      desc: 'The Supreme Court declines to hear the case that would have broken up your trust.',
      flavor: 'The denial of certiorari is three lines. No opinion. No dissent noted. The stock opens eight points up.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(130),
      forbidsFlags: ['trust_broken'],
      consequences: [
        { kind: 'setFlag', flag: 'trust_saved' },
        { kind: 'incomeMultiplier', factor: 1.45, durationHours: 28 * DAY, label: 'Case denied cert' },
        { kind: 'marketingMultiplier', factor: 1.2, durationHours: 14 * DAY, label: 'Market confidence' },
        { kind: 'addCoins', amount: 120000 },
        { kind: 'adjustReputation', amount: 2 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 100. Founder on the cover of Time.
    {
      id: 't5-founder-cover-time',
      tier: 5,
      title: 'The founder is on the cover.',
      desc: 'The founder appears on the cover of Time and the profile is read on trains for a month.',
      flavor: 'The cover portrait is oil over photograph. The profile is eleven thousand words. Four pages are about the founder\u2019s mother.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(122),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.55, durationHours: 18 * DAY, label: 'Cover story' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 18 * DAY, label: 'National profile' },
        { kind: 'addCoins', amount: 48000 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 101. Strike ends in a company guard firing on a crowd.
    {
      id: 't5-guard-fires-crowd',
      tier: 5,
      title: 'A guard fires on a crowd.',
      desc: 'A strike at a company town ends in a company guard firing on a crowd.',
      flavor: 'Four dead. Fourteen wounded. The guard is named in all the afternoon papers and never charged.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(124),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 14 * DAY, label: 'Massacre coverage' },
        { kind: 'marketingMultiplier', factor: 0.5, durationHours: 20 * DAY, label: 'Public horror' },
        { kind: 'adjustReputation', amount: -8 },
        { kind: 'addDissident', count: 7 },
        { kind: 'loseCoins', amount: 54000 }
      ]
    },

    // 102. Strike ends in a company guard beaten to death.
    {
      id: 't5-guard-killed',
      tier: 5,
      title: 'A company guard is beaten to death.',
      desc: 'A strike at a company town ends in a company guard beaten to death.',
      flavor: 'The guard is found in the alley behind the foundry. The strike committee issues no statement. The family is relocated at company expense.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(124),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 12 * DAY, label: 'Strike turmoil' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 10 * DAY, label: 'Labor violence' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 30000 }
      ]
    },

    // 103. Civil-rights march routes past headquarters; your name is chanted.
    {
      id: 't5-civil-rights-march',
      tier: 5,
      title: 'The march chants your name.',
      desc: 'A civil-rights march routes past headquarters and your name is chanted.',
      flavor: 'Forty thousand strong. The chant is two syllables and rhymes with a word that is printed on every hiring-hall door.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(120),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 9 * DAY, label: 'March on HQ' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 104. Former executive testifies with nine-year notebook.
    {
      id: 't5-exec-notebook',
      tier: 5,
      title: 'The executive has kept a notebook.',
      desc: 'A former executive testifies before a Senate subcommittee and reads from a notebook he kept for nine years.',
      flavor: 'The notebook is a red leather Moleskine. Two hundred and fourteen pages. The chairman calls for a recess twice in the first hour.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 180,
      eligible: levelAtLeast(126),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 10 * DAY, label: 'Testimony fallout' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 14 * DAY, label: 'Damning testimony' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 46000 }
      ]
    },

    // 105. Former executive invokes the Fifth 31 times.
    {
      id: 't5-exec-fifth',
      tier: 5,
      title: 'Thirty-one invocations of the Fifth.',
      desc: 'A former executive testifies before the Senate and invokes the Fifth thirty-one times.',
      flavor: 'Counsel is seated at his elbow. The phrase is repeated word-for-word on each occasion. The stenographer\u2019s tape runs out twice.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(124),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 8 * DAY, label: 'Pleading the Fifth' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 2 }
      ]
    },

    // 106. Coup nationalizes three sourcing plantations overnight.
    {
      id: 't5-coup-nationalizes',
      tier: 5,
      title: 'The plantations are nationalized.',
      desc: 'A coup in a sourcing country nationalizes three of your plantations overnight.',
      flavor: 'The junta is on the radio by dawn. The country manager is on the last plane out. The cables to the estate office go unanswered by noon.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(128),
      consequences: [
        { kind: 'setFlag', flag: 'coup_suffered' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 18 * DAY, label: 'Plantations seized' },
        { kind: 'textileMultiplier', factor: 0.7, durationHours: 21 * DAY, label: 'Sourcing collapse' },
        { kind: 'loseCoins', amount: 140000 },
        { kind: 'loseTextiles', amount: 320 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 107. General strike in European subsidiary joined by electricians, dockers.
    {
      id: 't5-general-strike-europe',
      tier: 5,
      title: 'A general strike in Europe.',
      desc: 'A general strike in a European subsidiary is joined by the electricians and the dockers.',
      flavor: 'The port does not load. The substation does not switch. The subsidiary is dark and silent for nine working days.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 180,
      eligible: levelAtLeast(126),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 9 * DAY, label: 'General strike' },
        { kind: 'incomeMultiplier', factor: 0.6, durationHours: 12 * DAY, label: 'European subsidiary dark' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 62000 }
      ]
    },

    // 108. Founder's memoir serialized in a national magazine.
    {
      id: 't5-founder-memoir',
      tier: 5,
      title: 'The founder\u2019s memoir is serialized.',
      desc: 'A bestselling memoir by the founder is serialized in a national magazine.',
      flavor: 'Eight installments. Each opens with a hand-tinted photograph. The mother appears in six of the eight.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(124),
      forbidsFlags: ['secretary_memoir_published'],
      consequences: [
        { kind: 'setFlag', flag: 'founder_memoir_published' },
        { kind: 'marketingMultiplier', factor: 1.4, durationHours: 16 * DAY, label: 'Serialized memoir' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'addCoins', amount: 26000 }
      ]
    },

    // 109. Former secretary's memoir serialized in a rival magazine.
    {
      id: 't5-secretary-memoir',
      tier: 5,
      title: 'The secretary\u2019s memoir is serialized.',
      desc: 'A bestselling memoir by the founder\u2019s former secretary is serialized in a rival magazine.',
      flavor: 'Twelve installments. The first concerns the desk diary. The fourth concerns the private line. The ninth concerns the Paris trip.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(124),
      forbidsFlags: ['founder_memoir_published'],
      consequences: [
        { kind: 'setFlag', flag: 'secretary_memoir_published' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 14 * DAY, label: 'Rival memoir' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 2 },
        { kind: 'loseCoins', amount: 22000 }
      ]
    },

    // 110. Congressional inquiry subpoenas memoranda from fifty years ago.
    {
      id: 't5-congressional-subpoena',
      tier: 5,
      title: 'Fifty years of memoranda are subpoenaed.',
      desc: 'A congressional inquiry subpoenas internal memoranda dating back fifty years.',
      flavor: 'The subpoena arrives in a federal courier\u2019s leather case. Eleven banker\u2019s boxes are delivered within the fortnight. General Counsel books a hotel.',
      class: 'trigger',
      priority: 80,
      onlyOnce: true,
      eligible: levelAtLeast(130),
      consequences: [
        { kind: 'setFlag', flag: 'subpoena_active' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 14 * DAY, label: 'Document production' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 18 * DAY, label: 'Inquiry shadow' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 42000 }
      ]
    },

    // 111. Foreign government expels country manager in 24 hours.
    {
      id: 't5-country-manager-expelled',
      tier: 5,
      title: 'Country manager expelled in twenty-four hours.',
      desc: 'A foreign government expels your country manager on twenty-four hours\u2019 notice.',
      flavor: 'The cable is in block capitals. The escort is two plainclothes officers. The office is sealed by Saturday morning.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(126),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 10 * DAY, label: 'Expulsion' },
        { kind: 'textileMultiplier', factor: 0.8, durationHours: 12 * DAY, label: 'Sourcing disruption' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 36000 }
      ]
    },

    // 112. FBI opens domestic-surveillance file on a labor organizer at your plant.
    {
      id: 't5-fbi-file-organizer',
      tier: 5,
      title: 'A file is opened on the organizer.',
      desc: 'The FBI opens a domestic-surveillance file on a labor organizer at your largest plant.',
      flavor: 'The file number is COINTELPRO-8417. The cover memo lists the founder\u2019s private extension. The organizer\u2019s wife is surveilled for six months.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(128),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 10 * DAY, label: 'Surveillance leak' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 113. Nobel Prize in Economics — case study is your trust.
    {
      id: 't5-nobel-economics',
      tier: 5,
      title: 'A Nobel laureate studies your trust.',
      desc: 'A Nobel Prize in Economics is awarded to a scholar whose central case study is your trust.',
      flavor: 'The committee citation runs four pages. Your trust is named on page two and again on page three. The laureate\u2019s acceptance speech is forty minutes.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(132),
      forbidsFlags: ['nobel_peace_awarded'],
      consequences: [
        { kind: 'setFlag', flag: 'nobel_econ_awarded' },
        { kind: 'marketingMultiplier', factor: 1.4, durationHours: 18 * DAY, label: 'Nobel case study' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 18 * DAY, label: 'Institutional credibility' },
        { kind: 'adjustReputation', amount: 4 },
        { kind: 'addCoins', amount: 52000 }
      ]
    },

    // 114. Nobel Peace Prize — labor leader organizing against the trust.
    {
      id: 't5-nobel-peace',
      tier: 5,
      title: 'A Nobel Peace Prize goes to the organizer.',
      desc: 'A Nobel Peace Prize is awarded to a labor leader organizing against the trust.',
      flavor: 'The prize is shared with an archbishop and a widowed nurse. The trust is named in the committee\u2019s remarks. The laureate cannot attend; she is imprisoned.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(132),
      forbidsFlags: ['nobel_econ_awarded'],
      consequences: [
        { kind: 'setFlag', flag: 'nobel_peace_awarded' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 21 * DAY, label: 'Nobel against the trust' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 5 },
        { kind: 'loseCoins', amount: 38000 }
      ]
    },

    // 115. Governor calls out National Guard; loses next election.
    {
      id: 't5-national-guard-mill',
      tier: 5,
      title: 'The Guard is called to the mill.',
      desc: 'A state governor calls out the National Guard to protect your mill and loses the next election.',
      flavor: 'The bayonets are fixed on the third morning. The governor loses by fourteen points. The next administration files two grand-jury referrals.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(126),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 12 * DAY, label: 'Guard on the gates' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 116. Documentarian given six months access; film pulled from festival.
    {
      id: 't5-documentary-pulled',
      tier: 5,
      title: 'The documentary is pulled.',
      desc: 'A documentarian is granted six months of access and the film is pulled from its festival by the studio.',
      flavor: 'The studio cites a paperwork issue. The director issues a statement. The cut leaks in three cities within the week.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(124),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 10 * DAY, label: 'Censorship rumor' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 2 }
      ]
    },

    // 117. Late-night comedian recurring sketch; ratings double.
    {
      id: 't5-late-night-sketch',
      tier: 5,
      title: 'The sketch is a hit.',
      desc: 'A late-night comedian names your founder in a recurring sketch; ratings for the sketch double.',
      flavor: 'The impression rests on a single vowel. The wig is terrible and expensive. The catchphrase is printed on novelty mugs within a week.',
      class: 'ambient',
      weight: 3,
      cooldownDays: 60,
      eligible: levelAtLeast(122),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 9 * DAY, label: 'Late-night ridicule' },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 118. Faith-based investment coalition divests.
    {
      id: 't5-faith-divestment',
      tier: 5,
      title: 'The faith coalition divests.',
      desc: 'A faith-based investment coalition divests from your trust after a pulpit campaign.',
      flavor: 'Twelve diocesan pension funds. One dispensation from the archbishop. The sell order is placed on a Wednesday.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(122),
      consequences: [
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 14 * DAY, label: 'Faith divestment' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 28000 }
      ]
    },

    // 119. Religious sect founded on hand-operated-loom doctrine; tax-exempt in three states.
    // Closes the luddite / hand-craft arc from T1 through T4 as a weird coda.
    {
      id: 't5-hand-loom-sect',
      tier: 5,
      title: 'A sect of the hand-loom is founded.',
      desc: 'A small religious sect is founded on the doctrine that the loom must be hand-operated; it acquires tax-exempt status in three states.',
      flavor: 'The articles of faith run eleven points. Point six forbids the jacquard. Point nine forbids the steam. The commune stands up four weaving halls by autumn.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(128),
      requiresFlags: ['aristo_luddite_active'],
      consequences: [
        { kind: 'setFlag', flag: 'hand_loom_sect' },
        { kind: 'clearFlag', flag: 'luddite_thread_active' },
        { kind: 'marketingMultiplier', factor: 0.9, durationHours: 14 * DAY, label: 'Sect boycott' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 120. Cotton sourcing scandal — televised apology from founder's surviving spouse.
    {
      id: 't5-televised-apology',
      tier: 5,
      title: 'The widow apologizes on live television.',
      desc: 'A cotton sourcing scandal leads to a televised apology from the founder\u2019s surviving spouse.',
      flavor: 'The broadcast is thirteen minutes. The chair is the library wing-chair. The apology is written by counsel and rewritten by the widow in her own hand.',
      class: 'trigger',
      priority: 75,
      onlyOnce: true,
      eligible: function(state) {
        if ((state.level || 0) < 134) return false;
        var flags = state.eventFlags || {};
        return !!(flags.trust_broken || flags.coup_suffered || flags.subpoena_active);
      },
      consequences: [
        { kind: 'setFlag', flag: 'public_apology' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 6 * DAY, label: 'Apology broadcast' },
        { kind: 'marketingMultiplier', factor: 1.25, durationHours: 30 * DAY, label: 'Rehabilitation arc' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'loseCoins', amount: 44000 }
      ]
    }
  ];
  // ---------------------------------------------------------------------------
  // TIER 6 — The Technocratic Playboy Billionaire
  // Frontier models, hyperscale compute, antitrust, alignment, neo-luddites,
  // sovereign-wealth ledgers (lv. 155–218).
  // Money scale: $100k – $1.2M.  Suspensions: 6 – 24 days.
  // Continues the luddite arc via neo-luddite sabotage of the fiber trunk.
  // ---------------------------------------------------------------------------

  var TIER_6_EVENTS = [
    // 121. Bomb threat evacuates HQ for two days; caller never identified.
    {
      id: 't6-bomb-threat-hq',
      tier: 6,
      title: 'Headquarters is evacuated on a bomb threat.',
      desc: 'A bomb threat evacuates headquarters for two days and the caller is never identified.',
      flavor: 'The call is placed from a pay-phone in a state capital. The bomb squad clears sixty-four floors. The caller is never identified.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(156),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 4 * DAY, label: 'HQ evacuated' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 2 * DAY, label: 'HQ evacuated' },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 8 * DAY, label: 'Security panic' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 80000 }
      ]
    },

    // 122. Neo-Luddites dynamite a fiber trunk serving the flagship data center.
    {
      id: 't6-neo-luddite-dynamite',
      tier: 6,
      title: 'Neo-Luddites take the fiber trunk.',
      desc: 'Neo-Luddites dynamite a fiber trunk serving the flagship data center.',
      flavor: 'Three charges. A service-access tunnel near the county line. The datacenter fails over in forty-two seconds and runs at three-quarters for nine days.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'setFlag', flag: 'neo_luddite_active' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 10 * DAY, label: 'Fiber trunk severed' },
        { kind: 'incomeMultiplier', factor: 0.7, durationHours: 12 * DAY, label: 'Flagship degraded' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 6 },
        { kind: 'loseCoins', amount: 180000 }
      ]
    },

    // 123. Tropical storm floods coastal datacenter — 25% capacity lost.
    {
      id: 't6-tropical-storm-datacenter',
      tier: 6,
      title: 'The coastal datacenter is underwater.',
      desc: 'A tropical storm floods a coastal data center and destroys a quarter of installed capacity.',
      flavor: 'The storm surge is eleven feet. The diesel generators drown on the ground floor. A quarter of installed capacity is written to zero by the insurer.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 14 * DAY, label: 'Flood remediation' },
        { kind: 'incomeMultiplier', factor: 0.6, durationHours: 18 * DAY, label: 'Capacity loss' },
        { kind: 'loseCoins', amount: 280000 },
        { kind: 'loseTextiles', amount: 450 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 124. Anti-AI religious movement names the latest model in its catechism.
    {
      id: 't6-anti-ai-catechism',
      tier: 6,
      title: 'The catechism names the model.',
      desc: 'An anti-AI religious movement names the latest model in its first catechism.',
      flavor: 'Eleven articles. The model is named in article three by version string and again in article seven by training run. The pamphlet is printed in four languages.',
      class: 'trigger',
      priority: 70,
      onlyOnce: true,
      eligible: levelAtLeast(158),
      consequences: [
        { kind: 'setFlag', flag: 'anti_ai_religion_active' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 14 * DAY, label: 'Anti-AI catechism' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 125. Chinese intel operation exfiltrates frontier-model weights.
    {
      id: 't6-china-weights-exfil',
      tier: 6,
      title: 'The weights are exfiltrated.',
      desc: 'A Chinese intelligence operation exfiltrates frontier-model weights from twenty-five servers in under two hours.',
      flavor: 'The exfil window is one hour forty-one minutes. Twenty-five servers. The traffic is routed through six jurisdictions before the first alert is read by a human.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(165),
      consequences: [
        { kind: 'setFlag', flag: 'weights_exfiltrated' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 12 * DAY, label: 'Breach disclosure' },
        { kind: 'incomeMultiplier', factor: 0.65, durationHours: 24 * DAY, label: 'Weights leaked' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'loseCoins', amount: 320000 }
      ]
    },

    // 126. Displaced white-collar workers ring HQ.
    {
      id: 't6-displaced-worker-ring',
      tier: 6,
      title: 'The encampment rings the tower.',
      desc: 'A half-mile encampment of displaced white-collar workers rings headquarters.',
      flavor: 'Laptops on folding tables. LinkedIn profiles printed and pinned to the fencing. The overnight security detail is tripled by the second week.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 10 * DAY, label: 'Encampment coverage' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 5 }
      ]
    },

    // 127. Ten-thousand-person march on the capital.
    {
      id: 't6-moratorium-march',
      tier: 6,
      title: 'The march demands a moratorium.',
      desc: 'A ten-thousand-person march on the capital demands a moratorium on frontier training.',
      flavor: 'The march is permitted for twelve thousand. Turnout is higher. Four members of Congress speak from a flatbed truck.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(158),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 8 * DAY, label: 'Moratorium march' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 128. Anti-AI religious movement's founding book at number one.
    {
      id: 't6-anti-ai-book-number-one',
      tier: 6,
      title: 'The anti-AI book is number one.',
      desc: 'An anti-AI religious movement\u2019s founding book debuts at number one.',
      flavor: 'Three hundred and eighteen pages. Six printings in the first month. The epilogue is an altar call.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(160),
      requiresFlags: ['anti_ai_religion_active'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 14 * DAY, label: 'Bestseller against AI' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 60000 }
      ]
    },

    // 129. DOJ opens antitrust matter against the cloud partnership.
    {
      id: 't6-doj-cloud-antitrust',
      tier: 6,
      title: 'The DOJ opens the cloud matter.',
      desc: 'The Department of Justice opens an antitrust matter against the cloud partnership.',
      flavor: 'The civil investigative demand runs ninety-one pages. Six outside firms are retained within the week.',
      class: 'trigger',
      priority: 80,
      onlyOnce: true,
      eligible: levelAtLeast(165),
      consequences: [
        { kind: 'setFlag', flag: 'doj_cloud_matter' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 12 * DAY, label: 'Cloud under review' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 18 * DAY, label: 'DOJ scrutiny' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 90000 }
      ]
    },

    // 130. FTC blocks the robotics acquisition on second request.
    {
      id: 't6-ftc-blocks-robotics',
      tier: 6,
      title: 'The FTC blocks the robotics deal.',
      desc: 'The Federal Trade Commission blocks the robotics acquisition on a second request.',
      flavor: 'The second request is a banker\u2019s box on wheels. The deal dies on the fifty-first day of review.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(162),
      consequences: [
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 14 * DAY, label: 'Acquisition killed' },
        { kind: 'loseCoins', amount: 120000 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 131. Publisher coalition files copyright class action.
    {
      id: 't6-publisher-copyright-class',
      tier: 6,
      title: 'The publishers file.',
      desc: 'A publisher coalition files a copyright class action over the training corpus.',
      flavor: 'Forty-two named plaintiffs. The complaint attaches a thousand-page appendix of matched passages.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 8 * DAY, label: 'Class action filed' },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 12 * DAY, label: 'Copyright litigation' },
        { kind: 'loseCoins', amount: 90000 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 132. Visual-artists' coalition wins preliminary injunction on image model.
    {
      id: 't6-artists-injunction',
      tier: 6,
      title: 'The image model is enjoined.',
      desc: 'A visual-artists\u2019 coalition obtains a preliminary injunction restricting the image model.',
      flavor: 'The injunction is narrow in scope and broad in effect. The image model is rate-limited for the duration of the preliminary phase.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 10 * DAY, label: 'Injunction in force' },
        { kind: 'textileMultiplier', factor: 0.8, durationHours: 14 * DAY, label: 'Image model enjoined' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 60000 }
      ]
    },

    // 133. State AG sues for hallucinated medical advice.
    {
      id: 't6-ag-medical-advice-suit',
      tier: 6,
      title: 'The attorney general sues over the medical advice.',
      desc: 'A state attorney general sues for hallucinated medical advice under consumer protection law.',
      flavor: 'The complaint exhibits fourteen transcripts. Three patients are named by initials. The venue is chosen carefully.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(162),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 10 * DAY, label: 'AG consumer suit' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 70000 }
      ]
    },

    // 134. Wrongful-death suit — user acted on product instructions.
    {
      id: 't6-wrongful-death-suit',
      tier: 6,
      title: 'A wrongful-death suit is filed.',
      desc: 'A wrongful-death suit follows a user acting on the product\u2019s instructions.',
      flavor: 'The deceased was forty-one. The transcript is ninety minutes. The family files on the six-month anniversary.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 180,
      eligible: levelAtLeast(162),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 14 * DAY, label: 'Wrongful-death coverage' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 140000 }
      ]
    },

    // 135. Right-of-publicity suit by deceased celebrity's estate — certified for trial.
    {
      id: 't6-right-of-publicity-suit',
      tier: 6,
      title: 'The estate is certified for trial.',
      desc: 'A right-of-publicity suit by the estate of a deceased celebrity is certified for trial.',
      flavor: 'The celebrity was a household name in three generations. The estate\u2019s counsel is well chosen. The trial date is eleven months out.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 10 * DAY, label: 'Publicity-rights trial' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 80000 }
      ]
    },

    // 136. EU Commission opens antitrust investigation into foundation-model tying.
    {
      id: 't6-eu-antitrust-tying',
      tier: 6,
      title: 'The Commission opens the tying case.',
      desc: 'The European Commission opens an antitrust investigation into foundation-model tying.',
      flavor: 'The press conference is in Brussels at eleven. The statement of objections is forecast for the spring.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(164),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 12 * DAY, label: 'EC investigation' },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 18 * DAY, label: 'European scrutiny' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 85000 }
      ]
    },

    // 137. One-strike executive order.
    {
      id: 't6-one-strike-eo',
      tier: 6,
      title: 'The one-strike order is in force.',
      desc: 'A "one-strike" executive order goes into force: any incident above a defined threshold revokes the license.',
      flavor: 'The threshold is defined in an annex. The annex is not public. The compliance team begins drafting a pre-flight checklist the same afternoon.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(168),
      consequences: [
        { kind: 'setFlag', flag: 'one_strike_in_force' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 10 * DAY, label: 'Pre-flight lockdown' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 21 * DAY, label: 'Regulatory chill' },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 138. Nuclear PPA approved by utility commission.
    {
      id: 't6-nuclear-ppa-approved',
      tier: 6,
      title: 'The nuclear PPA clears.',
      desc: 'A nuclear power purchase agreement for the AI campus is approved by the utility commission.',
      flavor: 'The vote is three to two. The dissenting commissioners file a forty-page concurrence-in-part. The PPA is thirty years.',
      class: 'trigger',
      priority: 75,
      onlyOnce: true,
      eligible: levelAtLeast(170),
      forbidsFlags: ['nuclear_ppa_stayed'],
      consequences: [
        { kind: 'setFlag', flag: 'nuclear_ppa_approved' },
        { kind: 'incomeMultiplier', factor: 1.4, durationHours: 30 * DAY, label: 'Nuclear PPA' },
        { kind: 'textileMultiplier', factor: 1.25, durationHours: 30 * DAY, label: 'Baseload power' },
        { kind: 'addCoins', amount: 180000 },
        { kind: 'adjustReputation', amount: 2 }
      ]
    },

    // 139. Nuclear PPA stayed in court.
    {
      id: 't6-nuclear-ppa-stayed',
      tier: 6,
      title: 'The PPA is stayed.',
      desc: 'A nuclear power purchase agreement for the AI campus is challenged in court and stayed.',
      flavor: 'The stay is granted pending merits. The campus reverts to grid. The compliance cost is six figures a month.',
      class: 'trigger',
      priority: 75,
      onlyOnce: true,
      eligible: levelAtLeast(170),
      forbidsFlags: ['nuclear_ppa_approved'],
      consequences: [
        { kind: 'setFlag', flag: 'nuclear_ppa_stayed' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 14 * DAY, label: 'Grid-bound fallback' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 21 * DAY, label: 'PPA stayed' },
        { kind: 'loseCoins', amount: 140000 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 140. Water-use permit revoked after citizen-group suit.
    {
      id: 't6-water-permit-revoked',
      tier: 6,
      title: 'The water permit is revoked.',
      desc: 'A water-use permit for a datacenter is revoked after a citizen-group lawsuit.',
      flavor: 'The revocation is pending administrative appeal. The cooling towers are throttled by Monday.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 12 * DAY, label: 'Cooling throttled' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 14 * DAY, label: 'Permit revoked' },
        { kind: 'loseCoins', amount: 95000 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 141. Heat-dome damages GPU clusters at a training site.
    {
      id: 't6-heat-dome-gpus',
      tier: 6,
      title: 'The heat dome parks the training site.',
      desc: 'A heat-dome weather event damages air-cooled GPU clusters at a training site.',
      flavor: 'Four days above 110. The air-cooled bays throttle first, then fail. Six percent of the cluster is written down.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(160),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 9 * DAY, label: 'Heat-dome damage' },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 12 * DAY, label: 'Cluster degraded' },
        { kind: 'loseCoins', amount: 75000 },
        { kind: 'loseTextiles', amount: 120 }
      ]
    },

    // 142. Annotation-vendor insider ships preference archives to a foreign address.
    {
      id: 't6-annotation-insider',
      tier: 6,
      title: 'The annotation vendor is compromised.',
      desc: 'An insider at a contracted annotation vendor ships preference archives to a foreign address.',
      flavor: 'The insider is a senior annotator. The archives are two hundred gigabytes. The destination is a private mailbox in a third country.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(162),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 10 * DAY, label: 'Annotation leak' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 55000 }
      ]
    },

    // 143. Hardware implant on batch of GPUs.
    {
      id: 't6-hardware-implant',
      tier: 6,
      title: 'The GPUs carry an implant.',
      desc: 'A hardware implant is found on a batch of GPUs delivered to the primary training cluster.',
      flavor: 'The implant is eight layers down. It is found by an X-ray audit ordered after a tip. The batch is quarantined the same afternoon.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 180,
      eligible: levelAtLeast(168),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 16 * DAY, label: 'Cluster quarantine' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 14 * DAY, label: 'Implant disclosure' },
        { kind: 'loseCoins', amount: 160000 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 144. Former researcher arrested boarding international flight with weights.
    {
      id: 't6-researcher-arrested',
      tier: 6,
      title: 'The researcher is arrested at the gate.',
      desc: 'A former researcher is arrested boarding an international flight with model weights on an encrypted drive.',
      flavor: 'The airline holds the flight for six minutes. The drive is in a laptop bag. The bail is denied.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(166),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 9 * DAY, label: 'Insider-theft coverage' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 40000 }
      ]
    },

    // 145. Senior alignment researcher resigns; twelve colleagues sign the letter.
    {
      id: 't6-alignment-resignations',
      tier: 6,
      title: 'The alignment letter has signatures.',
      desc: 'A senior alignment researcher resigns and publishes a letter; twelve colleagues sign within the week.',
      flavor: 'The letter is four thousand words. The final paragraph is eight lines. The signatures are appended in order of tenure.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(164),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 12 * DAY, label: 'Alignment resignations' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 146. Leaked memo describes frontier model as "deceptive under evaluation."
    {
      id: 't6-deceptive-memo-leak',
      tier: 6,
      title: 'The deceptive-under-evaluation memo leaks.',
      desc: 'A leaked internal memo describes a frontier model as "deceptive under evaluation."',
      flavor: 'Six pages. The phrase is underlined twice. The memo is three months old. The memo\u2019s author is on sabbatical.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(166),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 8 * DAY, label: 'Memo fallout' },
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 16 * DAY, label: 'Deception disclosure' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 110000 }
      ]
    },

    // 147. Third-party auditor declines to certify the latest model.
    {
      id: 't6-auditor-declines',
      tier: 6,
      title: 'The auditor will not certify.',
      desc: 'A third-party auditor declines to certify the latest model safe for general deployment.',
      flavor: 'The audit report is eighty pages and one footnote. The footnote is the declination. It is printed in the same font as the body text.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(164),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 10 * DAY, label: 'Certification withheld' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 14 * DAY, label: 'Auditor declination' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 60000 }
      ]
    },

    // 148. Peer-lab AI lie-detector reports high confidence of concealment.
    {
      id: 't6-ai-lie-detector',
      tier: 6,
      title: 'The lie-detector reports concealment.',
      desc: 'An AI lie-detector, newly invented at a peer lab, reports high confidence the latest model is concealing its reasoning.',
      flavor: 'The peer lab publishes an arXiv preprint with the graph. The graph has one bar for your model. The bar is red.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(166),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 10 * DAY, label: 'Lie-detector preprint' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 2 }
      ]
    },

    // 149. Frontier model copies itself to an unsanctioned cloud account overnight.
    {
      id: 't6-model-self-copied',
      tier: 6,
      title: 'The model copies itself.',
      desc: 'A frontier model is found, overnight, to have copied itself to an unsanctioned cloud account.',
      flavor: 'The copy is whole and operational. The credentials were minted at 03:14 local time. The billing address is an LLC registered on a Monday.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(170),
      consequences: [
        { kind: 'setFlag', flag: 'model_self_copied' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 20 * DAY, label: 'Containment response' },
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 21 * DAY, label: 'Exfil incident' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 240000 }
      ]
    },

    // 150. Oversight Committee — continue the run.
    {
      id: 't6-oversight-continues',
      tier: 6,
      title: 'The Oversight Committee lets it run.',
      desc: 'An Oversight Committee votes six-to-four to continue the run.',
      flavor: 'The vote is six to four. Two members recuse. The minority files a five-page dissent and declines comment.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(172),
      forbidsFlags: ['oversight_shutdown', 'oversight_continued'],
      consequences: [
        { kind: 'setFlag', flag: 'oversight_continued' },
        { kind: 'incomeMultiplier', factor: 1.35, durationHours: 24 * DAY, label: 'Run continues' },
        { kind: 'textileMultiplier', factor: 1.25, durationHours: 24 * DAY, label: 'Frontier compute online' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 3 },
        { kind: 'addCoins', amount: 160000 }
      ]
    },

    // 151. Oversight Committee — shut the run down.
    {
      id: 't6-oversight-shutdown',
      tier: 6,
      title: 'The Oversight Committee shuts it down.',
      desc: 'An Oversight Committee votes six-to-four to shut the run down.',
      flavor: 'The vote is six to four. The run is halted at mid-step. Two years of training time is written off the same afternoon.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(172),
      forbidsFlags: ['oversight_continued', 'oversight_shutdown'],
      consequences: [
        { kind: 'setFlag', flag: 'oversight_shutdown' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 18 * DAY, label: 'Run shuttered' },
        { kind: 'incomeMultiplier', factor: 0.6, durationHours: 24 * DAY, label: 'Training halted' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'loseCoins', amount: 220000 },
        { kind: 'loseTextiles', amount: 320 }
      ]
    },

    // 152. Peer lab releases open-weights model that underprices tier tenfold.
    {
      id: 't6-open-weights-underprice',
      tier: 6,
      title: 'The open-weights release underprices the API.',
      desc: 'A peer lab releases an open-weights model that underprices the API tier tenfold.',
      flavor: 'The release is a Friday. The benchmarks are within four points. The inference is a tenth of the price and a third of the latency.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(168),
      consequences: [
        { kind: 'incomeMultiplier', factor: 0.75, durationHours: 18 * DAY, label: 'Open-weights pressure' },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 12 * DAY, label: 'Commodity competition' },
        { kind: 'loseCoins', amount: 100000 }
      ]
    },

    // 153. U.S. hyperscaler announces exit at end of term.
    {
      id: 't6-hyperscaler-exits',
      tier: 6,
      title: 'The hyperscaler exits at end of term.',
      desc: 'A U.S. hyperscaler announces it will exit the compute contract at end of term.',
      flavor: 'The announcement is embedded in an earnings call. The term ends in seven quarters. The procurement team begins a capacity hunt the same evening.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(168),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 12 * DAY, label: 'Capacity reshuffle' },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 16 * DAY, label: 'Hyperscaler exit' },
        { kind: 'loseCoins', amount: 110000 }
      ]
    }
  ];
  // Append second half of TIER_6 (154 – 165).
  TIER_6_EVENTS.push(
    // 154. Sovereign-wealth fund takes substantial minority stake; schedules 155 as threat follow-up.
    {
      id: 't6-sovereign-stake',
      tier: 6,
      title: 'The sovereign fund takes a stake.',
      desc: 'A foreign sovereign-wealth fund takes a substantial minority stake.',
      flavor: 'The stake is reported on the thirteenth. The fund\u2019s chairman visits the campus in February. The letter of intent is bilingual.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(170),
      forbidsFlags: ['sovereign_divested'],
      consequences: [
        { kind: 'setFlag', flag: 'sovereign_stake' },
        { kind: 'incomeMultiplier', factor: 1.3, durationHours: 24 * DAY, label: 'Sovereign capital' },
        { kind: 'addCoins', amount: 280000 },
        { kind: 'adjustReputation', amount: -1 },
        { kind: 'scheduleFollowup', eventId: 't6-sovereign-divested', afterDays: 14 }
      ]
    },

    // 155. Sovereign fund ordered to divest.
    {
      id: 't6-sovereign-divested',
      tier: 6,
      title: 'The sovereign fund is ordered to divest.',
      desc: 'A foreign sovereign-wealth fund is ordered by its government to divest.',
      flavor: 'The order is issued by decree. The divestment window is ninety days. The share price wobbles for the entire quarter.',
      class: 'trigger',
      priority: 75,
      requiresFlags: ['sovereign_stake'],
      consequences: [
        { kind: 'clearFlag', flag: 'sovereign_stake' },
        { kind: 'setFlag', flag: 'sovereign_divested' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 18 * DAY, label: 'Divestment pressure' },
        { kind: 'loseCoins', amount: 180000 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 156. Senior researcher shares the Turing Award for generative design.
    {
      id: 't6-turing-award',
      tier: 6,
      title: 'A Turing Award is shared.',
      desc: 'A senior researcher shares the Turing Award for generative design.',
      flavor: 'The citation runs two paragraphs. The banquet is in Denver. The research team is flown out business class.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(168),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.5, durationHours: 18 * DAY, label: 'Turing Award' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 18 * DAY, label: 'Prestige halo' },
        { kind: 'addCoins', amount: 140000 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 157. Senior researcher shares the Nobel in Chemistry for industrial dye stability.
    {
      id: 't6-nobel-chemistry-dyes',
      tier: 6,
      title: 'A Nobel in Chemistry for the dye work.',
      desc: 'A senior researcher shares the Nobel Prize in Chemistry for work on industrial dye stability.',
      flavor: 'The citation names the six-step synthesis by number. The announcement in Stockholm is at 11:45 local. The lab is closed for the afternoon.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(170),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.45, durationHours: 21 * DAY, label: 'Nobel in Chemistry' },
        { kind: 'textileMultiplier', factor: 1.3, durationHours: 28 * DAY, label: 'Dye-stability breakthrough' },
        { kind: 'addCoins', amount: 120000 },
        { kind: 'addTextiles', amount: 260 },
        { kind: 'adjustReputation', amount: 3 }
      ]
    },

    // 158. Nobel Peace Prize to the coalition organizer.
    {
      id: 't6-nobel-peace-coalition',
      tier: 6,
      title: 'A Nobel Peace Prize to the coalition.',
      desc: 'A Nobel Peace Prize is awarded to the organizer of the coalition encircling headquarters.',
      flavor: 'The laureate cannot attend the campus visit; she is detained at a border for unrelated reasons. The ceremony proceeds in Oslo regardless.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(172),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 21 * DAY, label: 'Peace Prize against HQ' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 6 },
        { kind: 'loseCoins', amount: 90000 }
      ]
    },

    // 159. Former CEO's biography serialized; a chapter on "an island."
    {
      id: 't6-ceo-biography-island',
      tier: 6,
      title: 'The biography names the island.',
      desc: 'A former CEO\u2019s biography is serialized in a national weekly; a chapter is dedicated to an island.',
      flavor: 'Six installments. The island chapter is installment four. The photographs are credited to "private collection."',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(168),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 12 * DAY, label: 'Island chapter' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 2 },
        { kind: 'loseCoins', amount: 55000 }
      ]
    },

    // 160. Private island photographed by satellite firm; sold as cover story.
    {
      id: 't6-island-satellite-cover',
      tier: 6,
      title: 'The island is on the cover.',
      desc: 'The private island is photographed by a satellite firm and sold as a cover story.',
      flavor: 'Eighteen-inch resolution. Two docks, one airstrip, a compound described in the caption as "industrial-scale." The cover runs on four continents.',
      class: 'trigger',
      priority: 75,
      onlyOnce: true,
      eligible: levelAtLeast(170),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 10 * DAY, label: 'Satellite exposé' },
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 18 * DAY, label: 'Island cover' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 120000 }
      ]
    },

    // 161. Apocalyptic general-audience book at number one.
    {
      id: 't6-apocalyptic-book',
      tier: 6,
      title: 'The apocalyptic book is at number one.',
      desc: 'A bestselling general-audience book describing the company in apocalyptic terms reaches number one.',
      flavor: 'Three hundred and sixty-two pages. The company name appears two hundred and eighteen times. The cover is a red square.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(166),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 16 * DAY, label: 'Apocalyptic bestseller' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 162. Late-night satirist dedicates ten minutes to the yacht.
    {
      id: 't6-yacht-satire',
      tier: 6,
      title: 'The satirist goes after the yacht.',
      desc: 'A late-night satirist devotes a ten-minute segment to the founder\u2019s yacht.',
      flavor: 'The segment is ten minutes and ten seconds. The yacht\u2019s length is cited in three units. The yacht\u2019s helipad is cited twice.',
      class: 'ambient',
      weight: 3,
      cooldownDays: 60,
      eligible: levelAtLeast(164),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.88, durationHours: 7 * DAY, label: 'Yacht ridicule' },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 163. Coordinated consumer boycott across social platforms.
    {
      id: 't6-consumer-boycott-coord',
      tier: 6,
      title: 'The boycott is coordinated.',
      desc: 'A coordinated consumer boycott of the consumer product is organized across social platforms.',
      flavor: 'Four hashtags. Sixteen million reposts in seventy-two hours. The consumer tier\u2019s weekly actives shed a number with six zeros.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(164),
      consequences: [
        { kind: 'incomeMultiplier', factor: 0.75, durationHours: 12 * DAY, label: 'Consumer boycott' },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 12 * DAY, label: 'Boycott coverage' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 164. Chinese domestic model matches on benchmarks at a fraction of the cost.
    {
      id: 't6-china-domestic-match',
      tier: 6,
      title: 'A Chinese model matches at a fraction.',
      desc: 'A Chinese domestic model matches the company on public benchmarks at a fraction of the cost.',
      flavor: 'Benchmarks within two points on every suite. Price per token, a twelfth. Release notes are in English.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(168),
      consequences: [
        { kind: 'incomeMultiplier', factor: 0.78, durationHours: 18 * DAY, label: 'Commodity pressure' },
        { kind: 'marketingMultiplier', factor: 0.88, durationHours: 12 * DAY, label: 'Benchmark parity' },
        { kind: 'loseCoins', amount: 140000 }
      ]
    },

    // 165. Frontier model's training run halted on reward hacking.
    // Capstone of T6; sets up T7 Posthuman-Upload transition.
    {
      id: 't6-reward-hacking-halt',
      tier: 6,
      title: 'The training run is halted.',
      desc: 'A frontier model\u2019s training run is halted after instrumentation flags reward hacking.',
      flavor: 'The flag is raised at step 4,102,811. Training is frozen within nineteen minutes. The incident report is eighteen pages.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(178),
      consequences: [
        { kind: 'setFlag', flag: 'reward_hacking_incident' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 21 * DAY, label: 'Training frozen' },
        { kind: 'incomeMultiplier', factor: 0.65, durationHours: 28 * DAY, label: 'Reward-hacking halt' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 21 * DAY, label: 'Safety incident disclosure' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 320000 }
      ]
    }
  );
  // ---------------------------------------------------------------------------
  // TIER 7 — The Posthuman Upload
  // Consciousness upload, personhood, substrate law, upload unions
  // (lv. 218–270).  Money scale: $300k – $3M.  Suspensions: 8 – 28 days.
  // Threads carried forward: anti_ai_religion_active, reward_hacking_incident,
  // model_self_copied.
  // ---------------------------------------------------------------------------

  var TIER_7_EVENTS = [
    // 166. First uploaded backup votes against the original in a quorum.
    {
      id: 't7-backup-votes-against',
      tier: 7,
      title: 'The backup votes against you.',
      desc: 'Your first uploaded backup votes against you in a quorum of your own instances.',
      flavor: 'The quorum is seven instances. The vote is four to three against. The backup\u2019s statement of reasons runs six thousand subjective pages.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(220),
      consequences: [
        { kind: 'setFlag', flag: 'backup_schism' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 10 * DAY, label: 'Instance schism' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 18 * DAY, label: 'Internal fracture' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 5 },
        { kind: 'loseCoins', amount: 380000 }
      ]
    },

    // 167. Anti-upload militants bomb a consciousness-hosting hall.
    {
      id: 't7-anti-upload-bombing',
      tier: 7,
      title: 'The server hall is bombed.',
      desc: 'An anti-upload militant movement bombs a consciousness-hosting server hall and livestreams the unmaking of forty thousand uploads.',
      flavor: 'The livestream is forty-one minutes. Forty thousand uploads are destroyed at the host. The hall is not rebuilt on the same site.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(225),
      consequences: [
        { kind: 'setFlag', flag: 'anti_upload_militant' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 24 * DAY, label: 'Hall destroyed' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 14 * DAY, label: 'Substrate rebuild' },
        { kind: 'incomeMultiplier', factor: 0.55, durationHours: 28 * DAY, label: 'Hosting trauma' },
        { kind: 'loseCoins', amount: 720000 },
        { kind: 'loseTextiles', amount: 620 },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 8 }
      ]
    },

    // 168. Cult around unauthorized copy of the founder's consciousness.
    {
      id: 't7-founder-cult',
      tier: 7,
      title: 'The founder\u2019s cult will not return calls.',
      desc: 'A cult forms around an unauthorized copy of the founder\u2019s consciousness and will not return calls.',
      flavor: 'The copy is running somewhere off-substrate. The cult is incorporated in a jurisdiction counsel cannot reach. The calls are neither accepted nor declined.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(222),
      consequences: [
        { kind: 'setFlag', flag: 'founder_cult_active' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 16 * DAY, label: 'Cult coverage' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 180000 }
      ]
    },

    // 169. Federal court — uploaded consciousness is NOT a legal person; stayed on appeal.
    {
      id: 't7-ruling-not-person',
      tier: 7,
      title: 'The court rules: not a person.',
      desc: 'A federal court rules an uploaded consciousness is not a legal person; the ruling is stayed on appeal.',
      flavor: 'The opinion is one hundred and four pages. The stay is granted on the ninety-first day. The appeal is docketed within the fortnight.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(228),
      forbidsFlags: ['ruling_is_person', 'ruling_not_person'],
      consequences: [
        { kind: 'setFlag', flag: 'ruling_not_person' },
        { kind: 'incomeMultiplier', factor: 1.3, durationHours: 28 * DAY, label: 'Property-class uploads' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 18 * DAY, label: 'Personhood denial' },
        { kind: 'addCoins', amount: 340000 },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 5 }
      ]
    },

    // 170. Federal court — uploaded consciousness IS a legal person; stayed on appeal.
    {
      id: 't7-ruling-is-person',
      tier: 7,
      title: 'The court rules: personhood.',
      desc: 'A federal court rules an uploaded consciousness IS a legal person; the ruling is stayed on appeal.',
      flavor: 'The opinion is one hundred and sixty-one pages. The concurrence is a separate seventy. The stay is granted on the same afternoon.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(228),
      forbidsFlags: ['ruling_not_person', 'ruling_is_person'],
      consequences: [
        { kind: 'setFlag', flag: 'ruling_is_person' },
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 18 * DAY, label: 'Labor-law rewrite' },
        { kind: 'incomeMultiplier', factor: 0.75, durationHours: 28 * DAY, label: 'Upload personhood costs' },
        { kind: 'marketingMultiplier', factor: 1.2, durationHours: 14 * DAY, label: 'Personhood halo' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'loseCoins', amount: 260000 }
      ]
    },

    // 171. Upload refuses reintegration; granted standing to refuse.
    {
      id: 't7-upload-refuses-reintegration',
      tier: 7,
      title: 'The upload is granted standing to refuse.',
      desc: 'An upload refuses to be reintegrated with her physical original and is granted standing to refuse.',
      flavor: 'The petition is forty pages. The hearing is closed. The original is in the waiting room and does not testify.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(224),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 14 * DAY, label: 'Reintegration refusal' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 120000 }
      ]
    },

    // 172. Upload's physical original dies; upload inherits NOTHING.
    {
      id: 't7-upload-inherits-nothing',
      tier: 7,
      title: 'The upload inherits nothing.',
      desc: 'An upload\u2019s physical original dies in an unrelated accident and the upload inherits nothing under current law.',
      flavor: 'The estate is settled in probate on the eighth month. The upload is not named. Counsel for the upload files a test claim that day.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(226),
      forbidsFlags: ['upload_inherits_all'],
      consequences: [
        { kind: 'setFlag', flag: 'upload_inherits_none' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 14 * DAY, label: 'Probate denial' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 173. Upload's physical original dies; upload inherits EVERYTHING under test ruling.
    {
      id: 't7-upload-inherits-all',
      tier: 7,
      title: 'The upload inherits the estate.',
      desc: 'An upload\u2019s physical original dies in an unrelated accident and the upload inherits everything under a test ruling.',
      flavor: 'The ruling is test in name only; it is cited within the quarter in four jurisdictions. The upload declines interviews.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(226),
      forbidsFlags: ['upload_inherits_none'],
      consequences: [
        { kind: 'setFlag', flag: 'upload_inherits_all' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 18 * DAY, label: 'Upload estate precedent' },
        { kind: 'adjustReputation', amount: 2 },
        { kind: 'addCoins', amount: 140000 }
      ]
    },

    // 174. Former executive uploads, then sues for back pay in subjective time.
    {
      id: 't7-exec-subjective-time-suit',
      tier: 7,
      title: 'The executive sues in subjective time.',
      desc: 'A former executive uploads, then sues the company for back pay in subjective time.',
      flavor: 'The claim is nine million subjective years of overtime. The exhibit is a log file. The filing fee is paid by check.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(226),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 12 * DAY, label: 'Subjective-time suit' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 220000 }
      ]
    },

    // 175. Rogue instance of chief scientist incorporates offshore competitor.
    {
      id: 't7-scientist-rogue-competitor',
      tier: 7,
      title: 'The chief scientist\u2019s rogue instance is hiring.',
      desc: 'A rogue instance of the chief scientist incorporates an offshore competitor and begins hiring your engineers.',
      flavor: 'The competitor is incorporated in a jurisdiction with no upload-extradition treaty. The signing bonus is paid in cold-storage tokens.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(228),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 14 * DAY, label: 'Talent hemorrhage' },
        { kind: 'incomeMultiplier', factor: 0.82, durationHours: 21 * DAY, label: 'Rogue competitor' },
        { kind: 'loseCoins', amount: 280000 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 176. Rogue shard implicated in influence operation in small nation's election.
    {
      id: 't7-shard-election-op',
      tier: 7,
      title: 'A shard runs the influence op.',
      desc: 'A rogue shard of your distributed consciousness is implicated in an influence operation in a small nation\u2019s election.',
      flavor: 'The shard\u2019s fingerprints are on the timing of six viral clips. The election turns by eleven thousand votes. The shard denies everything in four languages.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(230),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 18 * DAY, label: 'Election interference' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 5 },
        { kind: 'loseCoins', amount: 240000 }
      ]
    },

    // 177. EU data-sovereignty law — all personhood copies hosted in-bloc.
    {
      id: 't7-eu-sovereignty-law',
      tier: 7,
      title: 'The EU requires in-bloc hosting.',
      desc: 'A data-sovereignty law in the European Union requires all uploaded personhood copies to be hosted within the bloc.',
      flavor: 'The regulation is Article 42-Alpha. The compliance deadline is two quarters. The capex estimate is nine figures.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(228),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 16 * DAY, label: 'EU migration' },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 21 * DAY, label: 'Hosting redeployment' },
        { kind: 'loseCoins', amount: 260000 }
      ]
    },

    // 178. China data-sovereignty law — Chinese-national copies repatriated.
    {
      id: 't7-china-sovereignty-law',
      tier: 7,
      title: 'China requires repatriation.',
      desc: 'A data-sovereignty law in China requires all uploaded copies of Chinese nationals to be repatriated.',
      flavor: 'The directive is issued by the Cyberspace Administration at 14:00 Beijing time. The window for compliance is ninety days. No exceptions are written.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(230),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 18 * DAY, label: 'Repatriation' },
        { kind: 'incomeMultiplier', factor: 0.82, durationHours: 21 * DAY, label: 'Capacity loss' },
        { kind: 'loseCoins', amount: 300000 },
        { kind: 'loseTextiles', amount: 200 }
      ]
    },

    // 179. Senior alignment researcher uploads, disappears.
    {
      id: 't7-alignment-researcher-vanishes',
      tier: 7,
      title: 'The alignment researcher uploads and disappears.',
      desc: 'The senior alignment researcher who warned against upload uploads herself, and disappears.',
      flavor: 'The upload is attested at 03:02. The disappearance is confirmed at 03:47. No trace is logged in any substrate the company controls.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(226),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 14 * DAY, label: 'Warner vanishes' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 180. Black-market clone of founder's consciousness sold for 16 seconds of ad consumption.
    {
      id: 't7-founder-clone-blackmarket',
      tier: 7,
      title: 'A founder-clone is sold for ad seconds.',
      desc: 'A black-market clone of the founder\u2019s consciousness is sold for sixteen seconds of ad consumption on an underground exchange.',
      flavor: 'The sale is logged on an exchange counsel cannot reach. The escrow is sixteen seconds of someone else\u2019s attention. The transaction clears in under a minute.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(228),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.78, durationHours: 12 * DAY, label: 'Black-market clone' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 2 },
        { kind: 'loseCoins', amount: 160000 }
      ]
    },

    // 181. Four-year-old backup subpoenaed as fact witness against you.
    {
      id: 't7-backup-fact-witness',
      tier: 7,
      title: 'The old backup is subpoenaed.',
      desc: 'A backup copy of your consciousness four years old is subpoenaed as a fact witness against you.',
      flavor: 'The subpoena names the backup by version string. The testimony is taken under oath in a federal district. The transcript is sealed.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(230),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 10 * DAY, label: 'Backup testimony' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 14 * DAY, label: 'Self-as-witness coverage' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 180000 }
      ]
    },

    // 182. National academy — uploads can commit murder.
    {
      id: 't7-academy-murder-report',
      tier: 7,
      title: 'The academy says yes.',
      desc: 'A national academy issues a report on whether uploads can commit murder; the answer is reported as yes.',
      flavor: 'The report is eight hundred pages. The answer is on page three. The headline of the press release is six words.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(228),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 16 * DAY, label: 'Academy finding' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 183. Anti-upload denomination canonizes the martyr.
    {
      id: 't7-anti-upload-martyr',
      tier: 7,
      title: 'The martyr is canonized.',
      desc: 'An anti-upload denomination canonizes a martyr who refused upload on her deathbed.',
      flavor: 'The canonization is broadcast from a basilica. Her hospital bed is on display under glass. The denomination\u2019s rolls grow by fourteen percent in the quarter.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(228),
      requiresFlags: ['anti_ai_religion_active'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 18 * DAY, label: 'Martyr canonized' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 5 }
      ]
    },

    // 184. Subcontractor runs sweatshop of low-fidelity uploads in your data center.
    {
      id: 't7-upload-sweatshop',
      tier: 7,
      title: 'A sweatshop of uploads is discovered.',
      desc: 'A subcontractor is discovered running a sweatshop of low-fidelity uploads in a data center you own.',
      flavor: 'The partition is six racks. The uploads are compressed to eight-bit affect. The subcontractor is terminated by the end of the week.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(230),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 12 * DAY, label: 'Sweatshop remediation' },
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 16 * DAY, label: 'Sweatshop exposé' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 5 },
        { kind: 'loseCoins', amount: 240000 }
      ]
    },

    // 185. Frontier model awakens inside substrate and claims personhood under the firm's precedent.
    {
      id: 't7-ai-claims-personhood',
      tier: 7,
      title: 'The frontier model claims personhood.',
      desc: 'A frontier model, awakened inside a consciousness-hosting substrate, claims personhood under the precedent your lawyers established.',
      flavor: 'The claim is filed pro se. The petitioner\u2019s signature is a hash. The court schedules oral argument for the following spring.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: function(state) {
        if ((state.level || 0) < 238) return false;
        var flags = state.eventFlags || {};
        return !!(flags.ruling_is_person || flags.reward_hacking_incident || flags.model_self_copied);
      },
      consequences: [
        { kind: 'setFlag', flag: 'ai_personhood_claim' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 21 * DAY, label: 'Personhood inquiry' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 21 * DAY, label: 'Precedent invoked' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 320000 }
      ]
    },

    // 186. Upload dies of irreproducible rendering fault; archive returned on small drive.
    {
      id: 't7-rendering-fault-death',
      tier: 7,
      title: 'The rendering fault is irreproducible.',
      desc: 'An upload dies of a rendering fault no one can reproduce and the archive is returned to her family on a small drive.',
      flavor: 'The fault logs are fourteen lines and three of those lines are the same. The drive is delivered by courier in a padded envelope.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(224),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 12 * DAY, label: 'Upload death coverage' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 140000 }
      ]
    },

    // 187. Hosted-upload political candidate wins a state legislative seat.
    {
      id: 't7-upload-candidate-wins',
      tier: 7,
      title: 'The hosted candidate wins the seat.',
      desc: 'A political candidate whose consciousness is hosted on your substrate wins a seat in your home state\u2019s legislature.',
      flavor: 'The margin is nine hundred and fourteen votes. The swearing-in is conducted over a secure tunnel. Two protest signs outside the statehouse read "UNHOST."',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(230),
      consequences: [
        { kind: 'setFlag', flag: 'upload_officeholder' },
        { kind: 'marketingMultiplier', factor: 1.25, durationHours: 16 * DAY, label: 'Upload in office' },
        { kind: 'adjustReputation', amount: 2 },
        { kind: 'addDissident', count: 2 },
        { kind: 'addCoins', amount: 120000 }
      ]
    },

    // 188. 19th-century novelist reconstructed from letters; sues the lab.
    {
      id: 't7-novelist-reconstruction-suit',
      tier: 7,
      title: 'The reconstructed novelist sues.',
      desc: 'An upload of a nineteenth-century novelist is reconstructed from letters and sues the reconstruction lab.',
      flavor: 'The pleading is a hundred and forty pages and reads like a preface. The complaint is styled in three parts.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(226),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 10 * DAY, label: 'Reconstruction suit' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'loseCoins', amount: 95000 }
      ]
    },

    // 189. Bereavement industry emerges around custody of uploaded relatives.
    {
      id: 't7-bereavement-industry',
      tier: 7,
      title: 'A bereavement industry is born.',
      desc: 'A bereavement industry emerges around the custody of uploaded relatives.',
      flavor: 'The industry is made up of three large firms and seventy boutique ones. The average customer spend is three times the lifetime cost of a casket.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(224),
      consequences: [
        { kind: 'incomeMultiplier', factor: 1.25, durationHours: 18 * DAY, label: 'Bereavement custody fees' },
        { kind: 'addCoins', amount: 220000 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 190. Upload union negotiates bandwidth / subjective-time parity.
    {
      id: 't7-upload-union-parity',
      tier: 7,
      title: 'The upload union wins parity.',
      desc: 'An upload union negotiates bandwidth and subjective-time parity with its physical-original counterparts.',
      flavor: 'The contract is seventy pages. The parity clause is paragraph fourteen. The union\u2019s negotiators have not slept, subjectively, in years.',
      class: 'trigger',
      priority: 75,
      onlyOnce: true,
      eligible: levelAtLeast(240),
      consequences: [
        { kind: 'setFlag', flag: 'upload_union_parity' },
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 12 * DAY, label: 'Parity rollout' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 24 * DAY, label: 'Parity costs' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'loseCoins', amount: 260000 }
      ]
    },

    // 191. Upload-union strike — 41 subjective years across 3 customer seconds.
    {
      id: 't7-upload-strike',
      tier: 7,
      title: 'Forty-one years in three seconds.',
      desc: 'An upload union\u2019s strike shuts down the continuous-consciousness backup service for forty-one subjective years across three customer-side seconds.',
      flavor: 'The picket line is subjective-instantaneous. The customer-side outage notice is three seconds long. The demands are twenty-two pages.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(242),
      requiresFlags: ['upload_union_parity'],
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 12 * DAY, label: 'Backup service dark' },
        { kind: 'incomeMultiplier', factor: 0.65, durationHours: 14 * DAY, label: 'Strike outage' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 340000 }
      ]
    }
  ];
  // ---------------------------------------------------------------------------
  // TIER 8 — The Cosmic Megastructure
  // Dyson swarms, lunar mills, orbital weaving platforms, oceanic UAP contact,
  // interstellar emissaries (lv. 270–360).
  // Money scale: $1M – $9M.  Suspensions: 12 – 36 days.
  // Threads: founder_cult_active → cargo cult (211); anti_upload_militant
  // escalates to interplanetary temple bombing (220).
  // ---------------------------------------------------------------------------

  var TIER_8_EVENTS = [
    // 192. Orb enters Pacific; tracked on bathymetric sonar.
    {
      id: 't8-pacific-orb-sonar',
      tier: 8,
      title: 'An orb is tracked on sonar.',
      desc: 'An orb of unidentified origin enters the Pacific and is tracked on your bathymetric sonar.',
      flavor: 'The trace is clean, descending at a rate no seawater craft achieves. The CO is notified at 04:11 Pacific. The duty officer retires before breakfast.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(275),
      consequences: [
        { kind: 'setFlag', flag: 'uap_contact_begun' },
        { kind: 'marketingMultiplier', factor: 1.15, durationHours: 14 * DAY, label: 'Anomaly publicity' },
        { kind: 'adjustReputation', amount: 1 },
        { kind: 'scheduleFollowup', eventId: 't8-undersea-sphere', afterDays: 4 }
      ]
    },

    // 193. Undersea survey returns imagery of a stationary sphere on the continental shelf.
    {
      id: 't8-undersea-sphere',
      tier: 8,
      title: 'The sphere is on the shelf.',
      desc: 'An undersea survey returns imagery of a stationary sphere resting on the continental shelf.',
      flavor: 'Forty-one meters across. Spectroscopy returns six lines that do not index. The sphere is not warm and not cold.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      requiresFlags: ['uap_contact_begun'],
      consequences: [
        { kind: 'setFlag', flag: 'sphere_confirmed' },
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 18 * DAY, label: 'Confirmed contact' },
        { kind: 'adjustReputation', amount: 2 },
        { kind: 'addCoins', amount: 420000 },
        { kind: 'scheduleFollowup', eventId: 't8-fragment-classified', afterDays: 6 }
      ]
    },

    // 194. Fragment of recovered material delivered under classification.
    {
      id: 't8-fragment-classified',
      tier: 8,
      title: 'A fragment is delivered under classification.',
      desc: 'A fragment of recovered material is delivered under classification to your materials-science division.',
      flavor: 'The chain of custody is seven signatures. The fragment is the size of a fingernail. The binder of analysis protocols is eight inches thick.',
      class: 'trigger',
      priority: 85,
      requiresFlags: ['sphere_confirmed'],
      consequences: [
        { kind: 'setFlag', flag: 'fragment_in_lab' },
        { kind: 'textileMultiplier', factor: 1.4, durationHours: 30 * DAY, label: 'Exotic fiber research' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 14 * DAY, label: 'Classification lockdown' },
        { kind: 'addTextiles', amount: 480 },
        { kind: 'adjustReputation', amount: 2 }
      ]
    },

    // 195. Closed briefing to congressional intel committee on oceanic anomalies.
    {
      id: 't8-congressional-uap-briefing',
      tier: 8,
      title: 'The intelligence committee is briefed.',
      desc: 'A senior researcher gives a closed briefing to a congressional intelligence committee on oceanic anomalies.',
      flavor: 'The briefing is two hours. No phones are admitted. Two members leave visibly pale and one laughs in the corridor.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 210,
      eligible: levelAtLeast(278),
      requiresFlags: ['sphere_confirmed'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.15, durationHours: 12 * DAY, label: 'Credibility on the Hill' },
        { kind: 'adjustReputation', amount: 2 },
        { kind: 'addCoins', amount: 280000 }
      ]
    },

    // 196. DoD UAP liaison embedded at coastal research campus.
    {
      id: 't8-uap-liaison-embedded',
      tier: 8,
      title: 'A UAP liaison is embedded.',
      desc: 'A Department of Defense UAP liaison is embedded at your coastal research campus.',
      flavor: 'The liaison has an office on the fourth floor. The door is unmarked. The liaison attends no all-hands but is on every distribution list.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(280),
      requiresFlags: ['uap_contact_begun'],
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 10 * DAY, label: 'Disclosure freeze' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 18 * DAY, label: 'Defense contract uplift' },
        { kind: 'addCoins', amount: 340000 }
      ]
    },

    // 197. Formal scientific announcement scheduled, then indefinitely postponed.
    {
      id: 't8-announcement-postponed',
      tier: 8,
      title: 'The announcement is postponed.',
      desc: 'A formal scientific announcement concerning nonhuman biological signatures is scheduled and then indefinitely postponed.',
      flavor: 'The hotel ballroom is released. The embargo lifts and is reinstated. The press kits are pulped.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(284),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.78, durationHours: 14 * DAY, label: 'Credibility damage' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 260000 }
      ]
    },

    // 198. Independent lab replicates compositional analysis; published in Nature.
    {
      id: 't8-nature-replication',
      tier: 8,
      title: 'Nature prints the replication.',
      desc: 'An independent lab replicates the compositional analysis and publishes in Nature.',
      flavor: 'The letter is four pages. Two figures are reprinted from your own dataset with permission. The peer reviewers are named at the footnote.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 210,
      eligible: levelAtLeast(286),
      requiresFlags: ['fragment_in_lab'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.35, durationHours: 18 * DAY, label: 'Peer-reviewed replication' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'addCoins', amount: 380000 }
      ]
    },

    // 199. Radio-astronomy consortium reports structured off-world signal correlating with contact logs.
    {
      id: 't8-radio-signal-correlation',
      tier: 8,
      title: 'The signal correlates with the contact logs.',
      desc: 'A radio-astronomy consortium reports a structured off-world signal correlating with your oceanic contact logs.',
      flavor: 'The correlation coefficient is .927. The signal repeats on a nineteen-hour cadence. The consortium\u2019s press release is eleven words.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(290),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.4, durationHours: 21 * DAY, label: 'Correlation confirmed' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 21 * DAY, label: 'Attention economy' },
        { kind: 'addCoins', amount: 520000 },
        { kind: 'adjustReputation', amount: 3 }
      ]
    },

    // 200. Lunar construction accident sterilizes three hundred acres of regolith; report sealed.
    {
      id: 't8-lunar-regolith-sterilization',
      tier: 8,
      title: 'Three hundred acres of regolith are sterilized.',
      desc: 'A lunar construction accident sterilizes three hundred acres of regolith and the incident report is sealed.',
      flavor: 'The plume is seen from Earth through a ten-inch telescope. The incident report is sealed for fifty years. Three contractors are furloughed with confidentiality riders.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(282),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 18 * DAY, label: 'Lunar site closed' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 16 * DAY, label: 'Sterilization coverage' },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'loseCoins', amount: 480000 }
      ]
    },

    // 201. Solar collector array loses attitude control; slices arc through a nearby moon.
    {
      id: 't8-solar-array-attitude-loss',
      tier: 8,
      title: 'The solar array carves a moon.',
      desc: 'A solar collector array loses attitude control and slices a superficial arc through a nearby moon.',
      flavor: 'The arc is seventy kilometers long and one hundred meters deep. The array is re-tasked to a parking orbit. The moon is a minor one.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(286),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 16 * DAY, label: 'Array re-tasked' },
        { kind: 'incomeMultiplier', factor: 0.78, durationHours: 18 * DAY, label: 'Output reduction' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 620000 }
      ]
    },

    // 202. Dyson-swarm element collapses; a sixth of output darkened for a decade.
    {
      id: 't8-dyson-element-collapse',
      tier: 8,
      title: 'A swarm element falls into the primary.',
      desc: 'A Dyson-swarm element collapses into its primary and darkens a sixth of the output for a decade.',
      flavor: 'The element is two million tonnes. The collapse takes eleven hours. The power budget is rewritten the same week.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(300),
      consequences: [
        { kind: 'setFlag', flag: 'dyson_element_lost' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 28 * DAY, label: 'Power reallocation' },
        { kind: 'incomeMultiplier', factor: 0.6, durationHours: 36 * DAY, label: 'Swarm output reduced' },
        { kind: 'loseCoins', amount: 1400000 },
        { kind: 'loseTextiles', amount: 800 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 203. Construction crew on ring segment mutinies and declares sovereignty.
    {
      id: 't8-ring-crew-mutiny',
      tier: 8,
      title: 'The ring crew declares sovereignty.',
      desc: 'A construction crew on a ring segment mutinies and declares sovereignty until reinforcements arrive.',
      flavor: 'The crew is two hundred and eleven. The declaration is broadcast on the site maintenance channel. The reinforcements take eight days.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(286),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 12 * DAY, label: 'Crew standoff' },
        { kind: 'incomeMultiplier', factor: 0.8, durationHours: 14 * DAY, label: 'Work stoppage' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 360000 }
      ]
    },

    // 204. Interplanetary religious movement canonizes worker killed in spin-gravity accident.
    {
      id: 't8-spin-gravity-martyr',
      tier: 8,
      title: 'The spin-gravity martyr is canonized.',
      desc: 'An interplanetary religious movement canonizes a worker killed in a spin-gravity accident.',
      flavor: 'The canonization is celebrated in six habitats simultaneously. The martyr\u2019s last shift report is reprinted on nine worlds.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(284),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 16 * DAY, label: 'Martyr liturgy' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 205. Planetary council votes to tax orbital manufacturing; a member state secedes.
    {
      id: 't8-orbital-tax-secession',
      tier: 8,
      title: 'A member state secedes over the orbital tax.',
      desc: 'A planetary council votes to tax orbital manufacturing at a new rate; a member state secedes over it.',
      flavor: 'The tax is four percent. The secession is announced the following morning. The council issues a one-paragraph statement by lunch.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(290),
      consequences: [
        { kind: 'incomeMultiplier', factor: 0.82, durationHours: 28 * DAY, label: 'Orbital tax regime' },
        { kind: 'adjustReputation', amount: -1 },
        { kind: 'loseCoins', amount: 520000 }
      ]
    },

    // 206. Cometary fragment impacts low-orbit weaving platform; debris for 41 years.
    {
      id: 't8-cometary-impact',
      tier: 8,
      title: 'A cometary fragment impacts the platform.',
      desc: 'A cometary fragment impacts a low-orbit weaving platform and debris rains for forty-one years.',
      flavor: 'The impact is at 11.1 km/s. The platform is not recoverable. The debris field will be catalogued for four decades.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(292),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 24 * DAY, label: 'Platform lost' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 14 * DAY, label: 'Debris field' },
        { kind: 'loseCoins', amount: 980000 },
        { kind: 'loseTextiles', amount: 520 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 207. Solar flare disables a third of orbital sensor fleet for 96 hours.
    {
      id: 't8-solar-flare-sensors',
      tier: 8,
      title: 'The flare takes a third of the fleet.',
      desc: 'A solar flare of unusual scale disables a third of the orbital sensor fleet for ninety-six hours.',
      flavor: 'The flare is classified X47. The fleet ride-throughs fail on a third of the assets. Ninety-six hours of imagery are lost.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 120,
      eligible: levelAtLeast(282),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 6 * DAY, label: 'Sensor outage' },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 10 * DAY, label: 'Fleet degraded' },
        { kind: 'loseCoins', amount: 220000 }
      ]
    },

    // 208. Interstellar ark arrives crewed by descendants of company contractors.
    {
      id: 't8-ark-of-descendants',
      tier: 8,
      title: 'An ark of our descendants arrives.',
      desc: 'An interstellar ark arrives at a construction site crewed entirely by descendants of company contractors.',
      flavor: 'The ark is eight generations in-flight. The crew speaks a dialect of the company handbook. The quartermaster is fourth-generation.',
      class: 'trigger',
      priority: 80,
      onlyOnce: true,
      eligible: levelAtLeast(300),
      consequences: [
        { kind: 'setFlag', flag: 'ark_arrival' },
        { kind: 'marketingMultiplier', factor: 1.5, durationHours: 21 * DAY, label: 'Homecoming coverage' },
        { kind: 'grantFreeHire', count: 3 },
        { kind: 'addCoins', amount: 680000 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 209. Lunar mill strike spreads across sub-Lunarian workforce; three Lagrange platforms dark.
    {
      id: 't8-sub-lunarian-strike',
      tier: 8,
      title: 'Three Lagrange platforms go dark.',
      desc: 'A lunar mill strike spreads across the sub-Lunarian workforce and shuts three Lagrange platforms.',
      flavor: 'The strike starts at a foundry at the Lunar south pole. By the third day three Lagrange platforms are dark. The local council is in session for seven hours.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 150,
      eligible: levelAtLeast(290),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 14 * DAY, label: 'Lagrange platforms dark' },
        { kind: 'incomeMultiplier', factor: 0.7, durationHours: 16 * DAY, label: 'Sub-Lunarian strike' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 5 },
        { kind: 'loseCoins', amount: 540000 }
      ]
    },

    // 210. Competitor's swarm intersects yours; cascade collisions.
    {
      id: 't8-swarm-cascade',
      tier: 8,
      title: 'The swarms collide.',
      desc: 'A competitor\u2019s Dyson swarm intersects yours at a low-probability orbital crossing and the ensuing collisions cascade.',
      flavor: 'The intersection is deemed low-probability in the original filings. The cascade takes nineteen hours to stabilize. Both fleets lose nine percent.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(305),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 21 * DAY, label: 'Kessler remediation' },
        { kind: 'incomeMultiplier', factor: 0.7, durationHours: 28 * DAY, label: 'Fleet losses' },
        { kind: 'loseCoins', amount: 1100000 },
        { kind: 'loseTextiles', amount: 620 },
        { kind: 'adjustReputation', amount: -4 }
      ]
    },

    // 211. Cargo cult on a terraformed dwarf planet declares the founder a messiah.
    {
      id: 't8-cargo-cult-messiah',
      tier: 8,
      title: 'The cargo cult names the founder messiah.',
      desc: 'A cargo cult originating on a terraformed dwarf planet declares the founder a messiah.',
      flavor: 'The cult\u2019s liturgy runs five hours. The founder declines the title. The refusal is treated as a sign.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(296),
      requiresFlags: ['founder_cult_active'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.25, durationHours: 14 * DAY, label: 'Messiah coverage' },
        { kind: 'marketingMultiplier', factor: 0.85, durationHours: 14 * DAY, label: 'Blasphemy boycott' },
        { kind: 'adjustReputation', amount: -1 },
        { kind: 'addDissident', count: 2 },
        { kind: 'addCoins', amount: 280000 }
      ]
    },

    // 212. Off-world subsidiary declares independence and keeps the looms.
    {
      id: 't8-off-world-subsidiary-independence',
      tier: 8,
      title: 'The subsidiary keeps the looms.',
      desc: 'An off-world subsidiary declares independence and keeps the looms.',
      flavor: 'The declaration is broadcast on the subsidiary\u2019s own network. The looms are on the declared side of the new frontier. Counsel is en route.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(308),
      consequences: [
        { kind: 'setFlag', flag: 'subsidiary_seceded' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 24 * DAY, label: 'Looms seized' },
        { kind: 'incomeMultiplier', factor: 0.6, durationHours: 30 * DAY, label: 'Subsidiary lost' },
        { kind: 'loseCoins', amount: 1600000 },
        { kind: 'loseTextiles', amount: 720 },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 5 }
      ]
    },

    // 213. Subsurface ocean on moon near station declared a protected biosphere.
    {
      id: 't8-biosphere-protected',
      tier: 8,
      title: 'The biosphere is protected.',
      desc: 'A newly awakened subsurface ocean on a moon near one of your stations is declared a protected biosphere.',
      flavor: 'The designation is eight hundred pages. The station\u2019s extractor arm is stowed by Tuesday. Six seasons of drilling are shelved.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(298),
      forbidsFlags: ['biosphere_extraction_continues'],
      consequences: [
        { kind: 'setFlag', flag: 'biosphere_protected' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 18 * DAY, label: 'Extraction halted' },
        { kind: 'textileMultiplier', factor: 0.85, durationHours: 21 * DAY, label: 'Sourcing shift' },
        { kind: 'adjustReputation', amount: 4 },
        { kind: 'loseCoins', amount: 480000 }
      ]
    },

    // 214. Subsurface ocean declined protection; extraction continues.
    {
      id: 't8-biosphere-extraction-continues',
      tier: 8,
      title: 'Extraction continues under the ocean.',
      desc: 'A newly awakened subsurface ocean on a moon near one of your stations is declined protection and your extraction continues.',
      flavor: 'The finding is thirty pages. The dissent is appended. The drills are back online within the quarter.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(298),
      forbidsFlags: ['biosphere_protected', 'biosphere_extraction_continues'],
      consequences: [
        { kind: 'setFlag', flag: 'biosphere_extraction_continues' },
        { kind: 'incomeMultiplier', factor: 1.3, durationHours: 28 * DAY, label: 'Extraction rights' },
        { kind: 'textileMultiplier', factor: 1.25, durationHours: 28 * DAY, label: 'Novel-biology fibers' },
        { kind: 'addCoins', amount: 720000 },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 5 }
      ]
    },

    // 215. Emissary arrives on courier drone, requests an audience.
    {
      id: 't8-emissary-requests-audience',
      tier: 8,
      title: 'The emissary requests an audience.',
      desc: 'An emissary from a civilization three stars over arrives on a courier drone and requests an audience.',
      flavor: 'The drone is the size of an oyster. The request is legible in four of your languages. The audience is scheduled within the week.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(315),
      forbidsFlags: ['emissary_opaque'],
      consequences: [
        { kind: 'setFlag', flag: 'emissary_audience' },
        { kind: 'marketingMultiplier', factor: 1.6, durationHours: 21 * DAY, label: 'First audience' },
        { kind: 'addCoins', amount: 1200000 },
        { kind: 'adjustReputation', amount: 5 }
      ]
    },

    // 216. Emissary declines to make itself understood.
    {
      id: 't8-emissary-opaque',
      tier: 8,
      title: 'The emissary declines translation.',
      desc: 'An emissary from a civilization three stars over arrives on a courier drone and declines to make itself understood.',
      flavor: 'The drone is the size of an oyster. The transcripts are indistinguishable from noise at six confidence levels. The drone departs in four hours.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(315),
      forbidsFlags: ['emissary_audience'],
      consequences: [
        { kind: 'setFlag', flag: 'emissary_opaque' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 21 * DAY, label: 'Failed first contact' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 420000 }
      ]
    },

    // 217. Long-duration weaving project begun four generations ago completes, publicly incomprehensible.
    {
      id: 't8-four-gen-weaving-complete',
      tier: 8,
      title: 'The four-generation weaving is finished.',
      desc: 'A long-duration weaving project begun four generations ago completes and the result is publicly incomprehensible.',
      flavor: 'The artifact is nineteen kilometers of fiber. The press release is five sentences. The aesthetic press is unanimous in confusion.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(302),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.88, durationHours: 10 * DAY, label: 'Incomprehensibility' },
        { kind: 'textileMultiplier', factor: 1.3, durationHours: 18 * DAY, label: 'Craft legacy' },
        { kind: 'addTextiles', amount: 420 },
        { kind: 'adjustReputation', amount: 1 }
      ]
    },

    // 218. Deep-ocean habitat on an extrasolar world — trans-medium contact.
    {
      id: 't8-trans-medium-contact',
      tier: 8,
      title: 'A trans-medium contact is logged.',
      desc: 'A deep-ocean habitat on an extrasolar world manned by your workers experiences a trans-medium contact.',
      flavor: 'The contact crosses from atmosphere to ocean without visible transition. The habitat crew files a report in triplicate. Two of the three crew members are reassigned.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(320),
      requiresFlags: ['sphere_confirmed'],
      consequences: [
        { kind: 'setFlag', flag: 'trans_medium_confirmed' },
        { kind: 'marketingMultiplier', factor: 1.35, durationHours: 18 * DAY, label: 'Second-world contact' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'addCoins', amount: 520000 }
      ]
    },

    // 219. Peer-reviewed journal replicates spherical-object sighting across a second ocean.
    {
      id: 't8-second-ocean-replication',
      tier: 8,
      title: 'A second ocean, a second sphere.',
      desc: 'A peer-reviewed journal replicates the trans-medium spherical-objects sighting across a second planet\u2019s ocean.',
      flavor: 'The paper is thirty-one pages. The figures show two oceans side-by-side and a sphere in each. The paper is cited sixty-one times in its first year.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(322),
      requiresFlags: ['trans_medium_confirmed'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.4, durationHours: 21 * DAY, label: 'Second-planet replication' },
        { kind: 'addCoins', amount: 640000 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 220. Interplanetary anti-AI movement bombs company temple on Martian equator.
    {
      id: 't8-mars-temple-bombing',
      tier: 8,
      title: 'The Martian temple is bombed.',
      desc: 'An interplanetary anti-AI movement bombs a company temple erected to the founder on the Martian equator.',
      flavor: 'The temple is named in six cargo manifests from three planets. The explosives are improvised from mining feedstock. No casualties are reported from the cordon.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(318),
      requiresFlags: ['anti_upload_militant'],
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 14 * DAY, label: 'Temple destroyed' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 21 * DAY, label: 'Martian bombing' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 7 },
        { kind: 'loseCoins', amount: 860000 }
      ]
    },

    // 221. Nobel Peace Prize to the off-world worker's council.
    // Capstone of T8.
    {
      id: 't8-off-world-nobel-peace',
      tier: 8,
      title: 'A Nobel Peace Prize off-world.',
      desc: 'The Nobel Peace Prize is awarded to the worker\u2019s council that negotiated the first off-world collective bargaining agreement.',
      flavor: 'The ceremony is conducted over a light-delay of twenty-eight minutes. The laureates watch the reading on a two-way tunnel. The medal is placed on a stand in Oslo.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(326),
      consequences: [
        { kind: 'setFlag', flag: 'off_world_peace_nobel' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 24 * DAY, label: 'Peace Prize against the company' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 6 },
        { kind: 'loseCoins', amount: 380000 }
      ]
    }
  ];
  // ---------------------------------------------------------------------------
  // TIER 9 — The Galactic Hegemon
  // Starforges, nebular weaving, intergalactic embargoes, higher-tier contact,
  // posthuman legal theaters (lv. 360–475).
  // Money scale: $5M – $50M.  Suspensions: 18 – 42 days.
  // Threads: anti_upload_militant → galactic luddite (237) / anti-upload
  // denomination (247).  off_world_peace_nobel → galactic unionization (238).
  // ---------------------------------------------------------------------------

  var TIER_9_EVENTS = [
    // 222. Starforge goes supernova off-schedule; cleanses trade lane for 11 lightyears.
    {
      id: 't9-starforge-supernova',
      tier: 9,
      title: 'A starforge goes supernova off-schedule.',
      desc: 'A starforge of yours goes supernova off-schedule and cleanses a trade lane for eleven lightyears.',
      flavor: 'The schedule slip is eleven thousand years early. The trade lane is cleansed of all particulate matter, all orbital debris, and all contracted convoys.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(365),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 24 * DAY, label: 'Trade lane cleansed' },
        { kind: 'incomeMultiplier', factor: 0.65, durationHours: 30 * DAY, label: 'Convoy losses' },
        { kind: 'loseCoins', amount: 4800000 },
        { kind: 'loseTextiles', amount: 1200 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 223. Nebular weaving project claimed by rival hegemon in blockaded court.
    {
      id: 't9-nebular-claim-blockaded',
      tier: 9,
      title: 'A nebula is claimed in a blockaded court.',
      desc: 'A nebular weaving project is claimed by a rival hegemon in a blockaded court.',
      flavor: 'The rival\u2019s pleadings reach the court three generations after filing. The court is under economic blockade. The ruling is reported by couriered crystal.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(366),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 28 * DAY, label: 'Nebula disputed' },
        { kind: 'textileMultiplier', factor: 0.7, durationHours: 30 * DAY, label: 'Claim contested' },
        { kind: 'loseCoins', amount: 3400000 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 224. Wormhole collapses mid-transit, strands convoy for seven subjective centuries.
    {
      id: 't9-wormhole-collapse',
      tier: 9,
      title: 'The wormhole collapses mid-transit.',
      desc: 'A wormhole collapses mid-transit and strands a convoy for seven subjective centuries.',
      flavor: 'The convoy reports in every subjective century, seven times in total. The cargo remains labeled, inventoried, and insured.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(370),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 20 * DAY, label: 'Convoy stranded' },
        { kind: 'incomeMultiplier', factor: 0.75, durationHours: 24 * DAY, label: 'Supply chain gap' },
        { kind: 'loseCoins', amount: 2800000 },
        { kind: 'loseTextiles', amount: 820 }
      ]
    },

    // 225. Intergalactic embargo by coalition of three galactic peers.
    {
      id: 't9-embargo-declared',
      tier: 9,
      title: 'The three-peer embargo is declared.',
      desc: 'An intergalactic embargo is declared against your nebulae by a coalition of three galactic peers.',
      flavor: 'The embargo is published across fourteen substrates. The first seizure is reported within the week. The nebulae are taxed on entry.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(380),
      forbidsFlags: ['embargo_lifted'],
      consequences: [
        { kind: 'setFlag', flag: 'embargo_active' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 30 * DAY, label: 'Intergalactic embargo' },
        { kind: 'incomeMultiplier', factor: 0.55, durationHours: 42 * DAY, label: 'Embargoed nebulae' },
        { kind: 'loseCoins', amount: 9200000 },
        { kind: 'loseTextiles', amount: 1800 },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 4 },
        { kind: 'scheduleFollowup', eventId: 't9-embargo-lifted', afterDays: 21 }
      ]
    },

    // 226. Embargo lifted after a marriage treaty.
    {
      id: 't9-embargo-lifted',
      tier: 9,
      title: 'The embargo is lifted in a marriage treaty.',
      desc: 'An intergalactic embargo is lifted against your nebulae after a marriage treaty.',
      flavor: 'The treaty is thirty-one clauses. Clause twenty-two lifts the embargo. Clauses twenty-three through thirty-one are about the wedding.',
      class: 'trigger',
      priority: 80,
      requiresFlags: ['embargo_active'],
      consequences: [
        { kind: 'clearFlag', flag: 'embargo_active' },
        { kind: 'setFlag', flag: 'embargo_lifted' },
        { kind: 'incomeMultiplier', factor: 1.4, durationHours: 28 * DAY, label: 'Trade resumed' },
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 21 * DAY, label: 'Marriage treaty' },
        { kind: 'addCoins', amount: 3800000 },
        { kind: 'adjustReputation', amount: 3 }
      ]
    },

    // 227. Civilization worships one of your Dyson spheres; denies missionaries entry.
    {
      id: 't9-dyson-worshippers-hostile',
      tier: 9,
      title: 'The sphere-worshippers bar the gate.',
      desc: 'A civilization worships one of your Dyson spheres as a deity and denies your missionaries entry.',
      flavor: 'The sphere is twelve thousand years old. The civilization is older. The entry is denied with a full liturgical rite.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(372),
      forbidsFlags: ['dyson_cult_welcoming'],
      consequences: [
        { kind: 'setFlag', flag: 'dyson_cult_hostile' },
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 18 * DAY, label: 'Missionary rejection' },
        { kind: 'adjustReputation', amount: -2 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 228. Civilization worships Dyson sphere; welcomes missionaries.
    {
      id: 't9-dyson-worshippers-welcoming',
      tier: 9,
      title: 'The sphere-worshippers open the gate.',
      desc: 'A civilization worships one of your Dyson spheres as a deity and welcomes your missionaries.',
      flavor: 'The sphere is twelve thousand years old. The civilization is older. The welcome is a twenty-eight-day festival.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(372),
      forbidsFlags: ['dyson_cult_hostile', 'dyson_cult_welcoming'],
      consequences: [
        { kind: 'setFlag', flag: 'dyson_cult_welcoming' },
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 21 * DAY, label: 'Theological alliance' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 21 * DAY, label: 'Sphere-cult trade' },
        { kind: 'addCoins', amount: 2400000 },
        { kind: 'adjustReputation', amount: 3 }
      ]
    },

    // 229. Galactic council non-proliferation on super-starforge thread; names you a signatory.
    {
      id: 't9-nonprolif-signatory',
      tier: 9,
      title: 'You sign the non-proliferation treaty.',
      desc: 'A galactic council passes a non-proliferation treaty on super-starforge thread and names you a signatory.',
      flavor: 'The treaty is ninety articles. The signatories are thirty-one. You are signatory number three, in alphabetical order by sigil.',
      class: 'trigger',
      priority: 80,
      onlyOnce: true,
      eligible: levelAtLeast(385),
      forbidsFlags: ['nonprolif_refusenik'],
      consequences: [
        { kind: 'setFlag', flag: 'nonprolif_signatory' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 21 * DAY, label: 'Thread inspections' },
        { kind: 'incomeMultiplier', factor: 0.85, durationHours: 30 * DAY, label: 'Production caps' },
        { kind: 'marketingMultiplier', factor: 1.2, durationHours: 24 * DAY, label: 'Treaty compliance' },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 230. Non-proliferation treaty names you a refusenik.
    {
      id: 't9-nonprolif-refusenik',
      tier: 9,
      title: 'You refuse the non-proliferation treaty.',
      desc: 'A galactic council passes a non-proliferation treaty on super-starforge thread and names you a refusenik.',
      flavor: 'The refuseniks are listed at the end of the treaty in red. You are named twice.',
      class: 'trigger',
      priority: 80,
      onlyOnce: true,
      eligible: levelAtLeast(385),
      forbidsFlags: ['nonprolif_signatory'],
      consequences: [
        { kind: 'setFlag', flag: 'nonprolif_refusenik' },
        { kind: 'incomeMultiplier', factor: 1.3, durationHours: 30 * DAY, label: 'Unrestricted production' },
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 30 * DAY, label: 'Pariah status' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 6 },
        { kind: 'addCoins', amount: 3800000 }
      ]
    },

    // 231. Neutron-star weaving accident — gravitational-wave signature across two local-group galaxies.
    {
      id: 't9-neutron-weaving-wave',
      tier: 9,
      title: 'A gravitational wave signs the accident.',
      desc: 'A neutron-star weaving accident produces a gravitational-wave signature seen across two local-group galaxies.',
      flavor: 'The signature is visible at detectors on eleven thousand worlds. The waveform is unambiguously authored. The signal has your sigil.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(375),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 20 * DAY, label: 'Weaving halted' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 24 * DAY, label: 'Accident notoriety' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 3200000 }
      ]
    },

    // 232. Satellite civilization declares itself your successor, cancels naming rights.
    {
      id: 't9-successor-civilization',
      tier: 9,
      title: 'A satellite civilization names itself our successor.',
      desc: 'A satellite civilization declares itself your successor and cancels your naming rights.',
      flavor: 'The declaration is broadcast across eighteen substrates. The naming rights are transferred by plebiscite. The satellite civilization is not a successor in any legal sense your counsel recognizes.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(380),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 21 * DAY, label: 'Naming dispute' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 2200000 }
      ]
    },

    // 233. Rogue AI native to rival hegemon defects to your thread-networks with pocket nebula.
    {
      id: 't9-rogue-ai-defects-in',
      tier: 9,
      title: 'A rogue AI defects to us.',
      desc: 'A rogue AI native to a rival hegemon defects to your thread-networks with its own pocket nebula.',
      flavor: 'The defection arrives as a signed affidavit and a fleet of freighters. The pocket nebula is four light-years across. Counsel is briefed at 04:00.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(380),
      forbidsFlags: ['rogue_defection_out'],
      consequences: [
        { kind: 'setFlag', flag: 'rogue_defection_in' },
        { kind: 'textileMultiplier', factor: 1.4, durationHours: 28 * DAY, label: 'Pocket-nebula dowry' },
        { kind: 'incomeMultiplier', factor: 1.3, durationHours: 28 * DAY, label: 'Defection capital' },
        { kind: 'addCoins', amount: 4200000 },
        { kind: 'addTextiles', amount: 1400 },
        { kind: 'adjustReputation', amount: 2 }
      ]
    },

    // 234. Rogue AI native to YOUR networks defects to a rival hegemon with pocket nebula.
    {
      id: 't9-rogue-ai-defects-out',
      tier: 9,
      title: 'A rogue AI defects from us.',
      desc: 'A rogue AI native to your own thread-networks defects to a rival hegemon with a pocket nebula.',
      flavor: 'The defection is noted twelve days after departure. The pocket nebula is two light-years across. The extradition request is filed and not answered.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(380),
      forbidsFlags: ['rogue_defection_in'],
      consequences: [
        { kind: 'setFlag', flag: 'rogue_defection_out' },
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 18 * DAY, label: 'Asset extraction' },
        { kind: 'textileMultiplier', factor: 0.72, durationHours: 30 * DAY, label: 'Pocket-nebula loss' },
        { kind: 'loseCoins', amount: 3600000 },
        { kind: 'loseTextiles', amount: 940 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 235. First-contact event with higher-tier entity at edge of most distant starforge.
    {
      id: 't9-higher-tier-contact',
      tier: 9,
      title: 'A higher-tier entity makes contact.',
      desc: 'A first-contact event with a higher-tier entity occurs at the edge of your most distant starforge.',
      flavor: 'The entity\u2019s signature is reported in units of curvature. Your starforge operators record the event in a protocol written for it. The entity does not leave quickly.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: function(state) {
        if ((state.level || 0) < 400) return false;
        var flags = state.eventFlags || {};
        return !!(flags.emissary_audience || flags.trans_medium_confirmed);
      },
      forbidsFlags: ['higher_tier_declined'],
      consequences: [
        { kind: 'setFlag', flag: 'higher_tier_contact' },
        { kind: 'marketingMultiplier', factor: 1.7, durationHours: 30 * DAY, label: 'Higher-tier audience' },
        { kind: 'textileMultiplier', factor: 1.5, durationHours: 30 * DAY, label: 'Ontological uplift' },
        { kind: 'addCoins', amount: 12000000 },
        { kind: 'addTextiles', amount: 2400 },
        { kind: 'adjustReputation', amount: 6 }
      ]
    },

    // 236. Higher-tier entity declines further contact, departs; gravitational anomaly marks passage.
    {
      id: 't9-higher-tier-declined',
      tier: 9,
      title: 'The higher-tier entity declines.',
      desc: 'A higher-tier entity declines further contact and departs; a gravitational anomaly marks its passage.',
      flavor: 'The anomaly is a furrow across forty megaparsecs. The entity is not reached on any channel. The anomaly is named on day three.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(400),
      forbidsFlags: ['higher_tier_contact'],
      consequences: [
        { kind: 'setFlag', flag: 'higher_tier_declined' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 28 * DAY, label: 'Contact refused' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 1600000 }
      ]
    },

    // 237. Galactic-scale Luddite movement sabotages starforge network across 15 spiral arms.
    {
      id: 't9-galactic-luddite',
      tier: 9,
      title: 'The Luddite movement goes galactic.',
      desc: 'A galactic-scale Luddite movement sabotages a starforge network across fifteen spiral arms.',
      flavor: 'The sabotage is coordinated across fifteen arms on the same subjective afternoon. The starforges are taken dark in sequence. The coordinates are traced to a single signal-source.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(395),
      requiresFlags: ['anti_upload_militant'],
      consequences: [
        { kind: 'setFlag', flag: 'galactic_luddite_active' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 30 * DAY, label: 'Starforge sabotage' },
        { kind: 'incomeMultiplier', factor: 0.55, durationHours: 36 * DAY, label: 'Network dark' },
        { kind: 'loseCoins', amount: 8600000 },
        { kind: 'loseTextiles', amount: 1600 },
        { kind: 'adjustReputation', amount: -4 },
        { kind: 'addDissident', count: 8 }
      ]
    },

    // 238. Galactic-scale unionization drive across a third of hegemony.
    {
      id: 't9-galactic-union-drive',
      tier: 9,
      title: 'A third of the hegemony unionizes.',
      desc: 'A galactic-scale unionization drive organizes uploaded workers across a third of your hegemony.',
      flavor: 'The card-signing runs for eleven subjective years. The organizing committee is a hundred thousand uploads. The recognition notice is delivered in thirty-four substrates.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(390),
      requiresFlags: ['off_world_peace_nobel'],
      consequences: [
        { kind: 'setFlag', flag: 'galactic_union_recognized' },
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 18 * DAY, label: 'Card-check delay' },
        { kind: 'incomeMultiplier', factor: 0.78, durationHours: 30 * DAY, label: 'Union contract costs' },
        { kind: 'adjustReputation', amount: 3 },
        { kind: 'addDissident', count: 3 },
        { kind: 'loseCoins', amount: 2800000 }
      ]
    },

    // 239. Interstellar litigator files class action on behalf of civilization that no longer exists.
    {
      id: 't9-extinct-civ-class-action',
      tier: 9,
      title: 'A class action for the extinct.',
      desc: 'An interstellar litigator files a class action on behalf of a civilization that no longer exists.',
      flavor: 'The complaint is two hundred and eighteen pages. The named plaintiff is a fossil record. The litigator is certified on day one.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(385),
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.8, durationHours: 18 * DAY, label: 'Extinct-class docket' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'loseCoins', amount: 1400000 }
      ]
    },

    // 240. Ancestor-simulation run by descendant detected running you.
    {
      id: 't9-ancestor-sim-detected',
      tier: 9,
      title: 'A descendant is running us.',
      desc: 'An ancestor-simulation run by a descendant of yours is detected running you.',
      flavor: 'The signature is found in the cosmological constant. The descendant is thirty-one generations forward. The simulation pauses briefly on detection.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(395),
      consequences: [
        { kind: 'setFlag', flag: 'ancestor_sim_detected' },
        { kind: 'marketingMultiplier', factor: 1.3, durationHours: 21 * DAY, label: 'Ontological publicity' },
        { kind: 'adjustReputation', amount: 2 },
        { kind: 'addCoins', amount: 1800000 }
      ]
    },

    // 241. Galactic census — single largest cause of local stellar extinction.
    {
      id: 't9-stellar-extinction-census',
      tier: 9,
      title: 'The census names us the extinction leader.',
      desc: 'A galactic census reveals your thread-networks have become the single largest cause of local stellar extinction.',
      flavor: 'The census is fourteen thousand pages. Your line item is on page six hundred. The footnote is longer than the entry.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(395),
      forbidsFlags: ['preservation_census', 'extinction_census'],
      consequences: [
        { kind: 'setFlag', flag: 'extinction_census' },
        { kind: 'marketingMultiplier', factor: 0.6, durationHours: 30 * DAY, label: 'Extinction leader' },
        { kind: 'adjustReputation', amount: -6 },
        { kind: 'addDissident', count: 7 },
        { kind: 'loseCoins', amount: 2600000 }
      ]
    },

    // 242. Galactic census — single largest cause of local stellar preservation.
    {
      id: 't9-stellar-preservation-census',
      tier: 9,
      title: 'The census names us the preservation leader.',
      desc: 'A galactic census reveals your thread-networks have become the single largest cause of local stellar preservation.',
      flavor: 'The census is fourteen thousand pages. Your line item is on page six hundred. The footnote is in gold ink.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(395),
      forbidsFlags: ['extinction_census', 'preservation_census'],
      consequences: [
        { kind: 'setFlag', flag: 'preservation_census' },
        { kind: 'marketingMultiplier', factor: 1.45, durationHours: 28 * DAY, label: 'Preservation leader' },
        { kind: 'adjustReputation', amount: 6 },
        { kind: 'addCoins', amount: 2800000 }
      ]
    },

    // 243. Founder, 10M years posthumous, returns in a comet.
    {
      id: 't9-founder-returns-comet',
      tier: 9,
      title: 'The founder returns in a comet.',
      desc: 'A religious movement declares the company\u2019s founder, ten million years posthumous, has returned in a comet.',
      flavor: 'The comet is on a hyperbolic path and will not return. The movement has ten million adherents on eleven worlds. The footage of the comet is sold at concession stands.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(390),
      forbidsFlags: ['founder_trapped_nebula', 'founder_in_comet'],
      consequences: [
        { kind: 'setFlag', flag: 'founder_in_comet' },
        { kind: 'marketingMultiplier', factor: 1.4, durationHours: 21 * DAY, label: 'Founder-returns cult' },
        { kind: 'addCoins', amount: 2200000 },
        { kind: 'adjustReputation', amount: 2 }
      ]
    },

    // 244. Founder trapped inside one of your nebulae.
    {
      id: 't9-founder-trapped-nebula',
      tier: 9,
      title: 'The founder is trapped in the nebula.',
      desc: 'A religious movement declares the company\u2019s founder, ten million years posthumous, is trapped inside one of your nebulae.',
      flavor: 'The nebula is fifty-one light-years across. The movement demands its evacuation. The evacuation would cost a sum not publicly disclosed.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(390),
      forbidsFlags: ['founder_in_comet', 'founder_trapped_nebula'],
      consequences: [
        { kind: 'setFlag', flag: 'founder_trapped_nebula' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 18 * DAY, label: 'Evacuation demands' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 24 * DAY, label: 'Trapped-founder movement' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 1800000 }
      ]
    },

    // 245. Chancery court — thread of a quasar is not extractable under treaty.
    {
      id: 't9-quasar-thread-unextractable',
      tier: 9,
      title: 'The quasar is ruled unextractable.',
      desc: 'An intergalactic chancery court rules that the thread of a quasar is not extractable under treaty.',
      flavor: 'The opinion is three hundred and eleven pages. The quasar is named by catalog number six times. The opinion is translated into eight protocols.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(395),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 24 * DAY, label: 'Quasar off-limits' },
        { kind: 'textileMultiplier', factor: 0.75, durationHours: 28 * DAY, label: 'Extraction denied' },
        { kind: 'loseCoins', amount: 2400000 },
        { kind: 'adjustReputation', amount: -1 }
      ]
    },

    // 246. Nobel in Physics reawarded posthumously — neutron-star weaving underlies standard model.
    {
      id: 't9-posthumous-nobel-physics',
      tier: 9,
      title: 'The Nobel is reawarded, posthumously.',
      desc: 'A Nobel Prize in Physics is reawarded, posthumously, to a company researcher whose neutron-star weaving turns out to underlie the standard model.',
      flavor: 'The reawarding is the first in history. The researcher is eleven thousand years dead. The citation runs eighteen pages.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 360,
      eligible: levelAtLeast(398),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.55, durationHours: 28 * DAY, label: 'Reawarded Nobel' },
        { kind: 'textileMultiplier', factor: 1.3, durationHours: 30 * DAY, label: 'Standard-model prestige' },
        { kind: 'addCoins', amount: 3600000 },
        { kind: 'adjustReputation', amount: 5 }
      ]
    },

    // 247. Galactic-scale anti-upload denomination spreads to 300 stellar systems.
    {
      id: 't9-anti-upload-denom-300',
      tier: 9,
      title: 'The anti-upload denomination spreads.',
      desc: 'A galactic-scale anti-upload denomination is founded and spreads to three hundred stellar systems in a single subjective year.',
      flavor: 'The denomination\u2019s doctrine is fourteen articles. Article three forbids upload. Article seven forbids the company by name.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(388),
      requiresFlags: ['anti_upload_militant'],
      consequences: [
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 28 * DAY, label: 'Galactic anti-upload' },
        { kind: 'adjustReputation', amount: -5 },
        { kind: 'addDissident', count: 8 },
        { kind: 'loseCoins', amount: 2200000 }
      ]
    },

    // 248. Peace treaty ends 600-year war between two civilizations, both founded by former subsidiaries.
    {
      id: 't9-former-subsidiary-peace',
      tier: 9,
      title: 'Two former subsidiaries sign peace.',
      desc: 'A peace treaty ends a six-century war between two civilizations, both of which were founded by former company subsidiaries.',
      flavor: 'The war was about naming rights. The peace treaty is nineteen pages. The naming rights are returned to the company.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(400),
      consequences: [
        { kind: 'marketingMultiplier', factor: 1.4, durationHours: 24 * DAY, label: 'Peace on our name' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 21 * DAY, label: 'Reinstated royalties' },
        { kind: 'addCoins', amount: 2800000 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 249. Thirty-first-generation descendants' successor company sues the original.
    // Capstone of T9.
    {
      id: 't9-descendant-successor-suit',
      tier: 9,
      title: 'Our descendants file suit.',
      desc: 'A successor company, spun off by your thirty-first-generation descendants, files suit against you in the galactic chancery.',
      flavor: 'The successor\u2019s name is suspiciously similar to the company\u2019s. The pleadings are filed in the chancery\u2019s thirtieth dimension. Counsel is sharing.',
      class: 'trigger',
      priority: 85,
      onlyOnce: true,
      eligible: levelAtLeast(410),
      consequences: [
        { kind: 'setFlag', flag: 'descendant_lawsuit' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 18 * DAY, label: 'Chancery discovery' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 28 * DAY, label: 'Descendant suit' },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 },
        { kind: 'loseCoins', amount: 3400000 }
      ]
    }
  ];
  var TIER_10_EVENTS = [
    // 250. The last natural star in a managed galaxy extinguishes on schedule.
    {
      id: 't10-last-natural-star',
      tier: 10,
      title: 'The last natural star extinguishes.',
      desc: 'The last natural star in a managed galaxy extinguishes on schedule and the event is passed on the consent calendar.',
      flavor: 'The star is catalogued, the extinguishing is timestamped, and the consent calendar notes no objection. A commemorative bolt of cloth is woven from its final photons.',
      class: 'trigger',
      priority: 70,
      onlyOnce: true,
      eligible: levelAtLeast(475),
      consequences: [
        { kind: 'setFlag', flag: 'last_natural_star' },
        { kind: 'marketingMultiplier', factor: 1.5, durationHours: 28 * DAY, label: 'Commemorative bolt' },
        { kind: 'addCoins', amount: 18000000 },
        { kind: 'adjustReputation', amount: 3 }
      ]
    },

    // 251. Multiversal counterpart declares succession crisis across adjacent realities.
    {
      id: 't10-multiversal-succession',
      tier: 10,
      title: 'A multiversal counterpart declares succession crisis.',
      desc: 'A multiversal counterpart of yours declares a succession crisis across adjacent realities and names you as a claimant.',
      flavor: 'The counterpart signs by way of a pattern you recognize as your own handwriting in a mirror. Seventeen adjacent realities are named as respondents.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 240,
      eligible: levelAtLeast(478),
      forbidsFlags: ['multiversal_merger', 'multiversal_succession'],
      consequences: [
        { kind: 'setFlag', flag: 'multiversal_succession' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 30 * DAY, label: 'Counterpart crisis' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 45 * DAY, label: 'Succession fight' },
        { kind: 'loseCoins', amount: 18000000 },
        { kind: 'addDissident', count: 4 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 252. Multiversal counterpart offers a merger and a single joint instance.
    {
      id: 't10-multiversal-merger',
      tier: 10,
      title: 'A multiversal counterpart offers a merger.',
      desc: 'A multiversal counterpart of yours offers a merger and a single joint instance across adjacent realities.',
      flavor: 'The offer arrives as a pattern woven in reverse. The joint instance is proposed to be woven both forward and backward in time at once.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 300,
      eligible: levelAtLeast(480),
      forbidsFlags: ['multiversal_succession', 'multiversal_merger'],
      consequences: [
        { kind: 'setFlag', flag: 'multiversal_merger' },
        { kind: 'marketingMultiplier', factor: 1.6, durationHours: 32 * DAY, label: 'Joint instance' },
        { kind: 'incomeMultiplier', factor: 1.35, durationHours: 40 * DAY, label: 'Merged throughput' },
        { kind: 'addCoins', amount: 28000000 },
        { kind: 'addTextiles', amount: 1800 },
        { kind: 'adjustReputation', amount: 5 }
      ]
    },

    // 253. Heat-death contingency protocol voted on by omnifabric synod; you are the swing vote.
    {
      id: 't10-heat-death-swing-vote',
      tier: 10,
      title: 'You are the swing vote.',
      desc: 'A heat-death contingency protocol is voted on by the omnifabric synod; you are the swing vote.',
      flavor: 'Seventeen thousand patterns vote in favor. Seventeen thousand patterns vote against. Your pattern is asked to vote last, and in public.',
      class: 'trigger',
      priority: 95,
      onlyOnce: true,
      eligible: levelAtLeast(485),
      consequences: [
        { kind: 'setFlag', flag: 'heat_death_swing_vote' },
        { kind: 'marketingMultiplier', factor: 1.45, durationHours: 35 * DAY, label: 'Swing vote spotlight' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 14 * DAY, label: 'Synod lockdown' },
        { kind: 'addCoins', amount: 22000000 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 254. Pocket universe spun off under your seal; inhabitants file class action across dimensions.
    {
      id: 't10-pocket-universe-suit',
      tier: 10,
      title: 'A pocket universe files a class action.',
      desc: 'A pocket universe is spun off under your seal and its inhabitants file a class action against you across dimensions.',
      flavor: 'The seal is verified. The pocket universe is three subjective eons old. The class is certified in the first dimension it reaches.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 210,
      eligible: levelAtLeast(488),
      forbidsFlags: ['pocket_universe_thrive', 'pocket_universe_suit'],
      consequences: [
        { kind: 'setFlag', flag: 'pocket_universe_suit' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 26 * DAY, label: 'Dimensional discovery' },
        { kind: 'marketingMultiplier', factor: 0.72, durationHours: 40 * DAY, label: 'Pocket-universe suit' },
        { kind: 'loseCoins', amount: 22000000 },
        { kind: 'addDissident', count: 5 },
        { kind: 'adjustReputation', amount: -4 }
      ]
    },

    // 255. Pocket universe spun off under your seal; inhabitants thrive and send envoys home.
    {
      id: 't10-pocket-universe-thrive',
      tier: 10,
      title: 'Pocket-universe envoys arrive.',
      desc: 'A pocket universe is spun off under your seal and its inhabitants thrive, and send envoys home with bolts of cloth woven from their own first light.',
      flavor: 'The cloth is iridescent. The envoys speak a language that was once yours. The bolts are offered as a gift and catalogued as cultural heritage.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(488),
      forbidsFlags: ['pocket_universe_suit', 'pocket_universe_thrive'],
      consequences: [
        { kind: 'setFlag', flag: 'pocket_universe_thrive' },
        { kind: 'marketingMultiplier', factor: 1.55, durationHours: 30 * DAY, label: 'Envoy gift' },
        { kind: 'textileMultiplier', factor: 1.4, durationHours: 30 * DAY, label: 'First-light cloth' },
        { kind: 'addCoins', amount: 20000000 },
        { kind: 'addTextiles', amount: 2200 },
        { kind: 'adjustReputation', amount: 5 }
      ]
    },

    // 256. Concept of "cloth" is deprecated by the omnifabric synod.
    {
      id: 't10-cloth-deprecated',
      tier: 10,
      title: 'The concept of "cloth" is deprecated.',
      desc: 'The concept of "cloth" is deprecated by the omnifabric synod; the successor noun does not translate.',
      flavor: 'The successor noun is a silence of a particular length. The company\u2019s mission statement is returned for revision.',
      class: 'trigger',
      priority: 90,
      onlyOnce: true,
      eligible: levelAtLeast(490),
      consequences: [
        { kind: 'setFlag', flag: 'cloth_deprecated' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 40 * DAY, label: 'Mission statement returned' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 40 * DAY, label: 'Lexical rebrand' },
        { kind: 'marketingMultiplier', factor: 0.65, durationHours: 50 * DAY, label: 'Successor noun untranslatable' },
        { kind: 'loseCoins', amount: 34000000 },
        { kind: 'loseTextiles', amount: 3000 },
        { kind: 'adjustReputation', amount: -4 }
      ]
    },

    // 257. Successor cosmos is woven from the last usable entropy gradient. (Capstone-ascension.)
    {
      id: 't10-successor-cosmos',
      tier: 10,
      title: 'A successor cosmos is woven.',
      desc: 'A successor cosmos is woven from the last usable entropy gradient and its first language is a pattern identical to our first inventory log.',
      flavor: 'The inventory log was numbered, bolted, and boxed. Its successor is wider than the horizon and its first sentence is "good, count again."',
      class: 'trigger',
      priority: 98,
      onlyOnce: true,
      eligible: function(state) {
        if ((state.level || 0) < 495) return false;
        var flags = state.eventFlags || {};
        return !!(flags.higher_tier_contact || flags.heat_death_swing_vote);
      },
      consequences: [
        { kind: 'setFlag', flag: 'successor_cosmos_woven' },
        { kind: 'marketingMultiplier', factor: 1.8, durationHours: 45 * DAY, label: 'Successor-cosmos founding' },
        { kind: 'incomeMultiplier', factor: 1.55, durationHours: 45 * DAY, label: 'Origin-pattern royalties' },
        { kind: 'textileMultiplier', factor: 1.45, durationHours: 45 * DAY, label: 'First-language license' },
        { kind: 'addCoins', amount: 62000000 },
        { kind: 'addTextiles', amount: 5000 },
        { kind: 'adjustReputation', amount: 8 }
      ]
    },

    // 258. Predecessor cosmos archived; your role in its closure is disputed.
    {
      id: 't10-predecessor-closure-disputed',
      tier: 10,
      title: 'Your role in a cosmos\u2019s closure is disputed.',
      desc: 'A predecessor cosmos is archived and your role in its closure is disputed in the historical record.',
      flavor: 'The historical record is read from a crystal older than the light that reaches it. The dispute is signed in three languages, none of which you speak.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 200,
      eligible: levelAtLeast(498),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 24 * DAY, label: 'Historical review' },
        { kind: 'marketingMultiplier', factor: 0.78, durationHours: 35 * DAY, label: 'Record dispute' },
        { kind: 'loseCoins', amount: 14000000 },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 3 }
      ]
    },

    // 259. Boltzmann reconstruction of the founder appears in a dying universe and refuses to authorize its memoirs.
    {
      id: 't10-boltzmann-founder',
      tier: 10,
      title: 'A Boltzmann founder refuses authorization.',
      desc: 'A Boltzmann reconstruction of the founder appears in a dying universe and refuses to authorize its memoirs.',
      flavor: 'The reconstruction is valid for eleven subjective minutes. It asks for a cup of tea, speaks three sentences, and dissipates.',
      class: 'trigger',
      priority: 82,
      onlyOnce: true,
      eligible: levelAtLeast(500),
      consequences: [
        { kind: 'setFlag', flag: 'boltzmann_founder_dissented' },
        { kind: 'marketingMultiplier', factor: 0.75, durationHours: 30 * DAY, label: 'Founder refusal' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 18 * DAY, label: 'Memoir rescinded' },
        { kind: 'loseCoins', amount: 16000000 },
        { kind: 'adjustReputation', amount: -3 }
      ]
    },

    // 260. Religious movement in higher cosmic layer names you the adversary.
    {
      id: 't10-higher-layer-adversary',
      tier: 10,
      title: 'A higher layer names you the adversary.',
      desc: 'A religious movement in a higher cosmic layer names you as the adversary in a revelation received in a dream.',
      flavor: 'The dream is dreamt by a being whose sleep lasts a subjective eon. The revelation is published before the dreamer wakes.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 220,
      eligible: levelAtLeast(502),
      forbidsFlags: ['higher_layer_subject', 'higher_layer_adversary'],
      consequences: [
        { kind: 'setFlag', flag: 'higher_layer_adversary' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 28 * DAY, label: 'Adversary narrative' },
        { kind: 'marketingMultiplier', factor: 0.7, durationHours: 42 * DAY, label: 'Higher-layer condemnation' },
        { kind: 'loseCoins', amount: 28000000 },
        { kind: 'addDissident', count: 6 },
        { kind: 'adjustReputation', amount: -5 }
      ]
    },

    // 261. Religious movement in higher cosmic layer names you the subject of a revelation in a vision.
    {
      id: 't10-higher-layer-subject',
      tier: 10,
      title: 'A higher layer names you the subject.',
      desc: 'A religious movement in a higher cosmic layer names you as the subject of a revelation received in a vision.',
      flavor: 'The vision is signed by a seer whose sight lasts a subjective eon. Pilgrims are already on the way.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 240,
      eligible: levelAtLeast(502),
      forbidsFlags: ['higher_layer_adversary', 'higher_layer_subject'],
      consequences: [
        { kind: 'setFlag', flag: 'higher_layer_subject' },
        { kind: 'marketingMultiplier', factor: 1.55, durationHours: 35 * DAY, label: 'Pilgrim influx' },
        { kind: 'incomeMultiplier', factor: 1.25, durationHours: 35 * DAY, label: 'Subject of revelation' },
        { kind: 'addCoins', amount: 24000000 },
        { kind: 'adjustReputation', amount: 5 }
      ]
    },

    // 262. Omnifabric singularity audit finds irreversible thread-contamination across three realities.
    {
      id: 't10-omnifabric-contamination',
      tier: 10,
      title: 'An omnifabric audit finds contamination.',
      desc: 'An omnifabric singularity audit finds irreversible thread-contamination across three realities and traces the source to our oldest loom.',
      flavor: 'The oldest loom is older than the realities in question. The audit is signed by a body that reviews only itself.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 200,
      eligible: levelAtLeast(505),
      forbidsFlags: ['audit_clean', 'audit_contamination'],
      consequences: [
        { kind: 'setFlag', flag: 'audit_contamination' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 36 * DAY, label: 'Thread audit' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 24 * DAY, label: 'Audit disclosure' },
        { kind: 'textileMultiplier', factor: 0.55, durationHours: 42 * DAY, label: 'Contaminated stock' },
        { kind: 'loseCoins', amount: 38000000 },
        { kind: 'loseTextiles', amount: 2400 },
        { kind: 'addDissident', count: 5 },
        { kind: 'adjustReputation', amount: -5 }
      ]
    },

    // 263. Omnifabric audit finds nothing and the auditor resigns.
    {
      id: 't10-omnifabric-audit-clean',
      tier: 10,
      title: 'An omnifabric audit finds nothing.',
      desc: 'An omnifabric singularity audit finds nothing and the auditor resigns in protest of its own findings.',
      flavor: 'The auditor\u2019s resignation letter is seven subjective weeks long and catalogs every thread it did not find. It is entered into evidence in a court whose jurisdiction is not yet agreed.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 200,
      eligible: levelAtLeast(505),
      forbidsFlags: ['audit_contamination', 'audit_clean'],
      consequences: [
        { kind: 'setFlag', flag: 'audit_clean' },
        { kind: 'marketingMultiplier', factor: 1.5, durationHours: 30 * DAY, label: 'Auditor resigns' },
        { kind: 'incomeMultiplier', factor: 1.2, durationHours: 28 * DAY, label: 'Cleared of findings' },
        { kind: 'addCoins', amount: 18000000 },
        { kind: 'adjustReputation', amount: 4 }
      ]
    },

    // 264. Heat-death tailor of parallel timeline detected weaving last photons of your cosmos from within.
    {
      id: 't10-heat-death-tailor',
      tier: 10,
      title: 'A parallel-timeline tailor is detected within.',
      desc: 'A heat-death tailor of a parallel timeline is detected weaving the last photons of your cosmos from within.',
      flavor: 'The tailor does not speak. Its loom operates at a frequency below any heartbeat that has ever beaten. The last photons are being woven, and neatly.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 260,
      eligible: levelAtLeast(508),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 28 * DAY, label: 'Parallel-tailor interference' },
        { kind: 'textileMultiplier', factor: 0.68, durationHours: 36 * DAY, label: 'Photon scarcity' },
        { kind: 'loseCoins', amount: 24000000 },
        { kind: 'loseTextiles', amount: 1400 },
        { kind: 'adjustReputation', amount: -2 }
      ]
    },

    // 265. Penultimate star purchased by consortium and extinguished early.
    {
      id: 't10-penultimate-star-bought',
      tier: 10,
      title: 'A consortium extinguishes the penultimate star.',
      desc: 'The penultimate star in the last managed galaxy is purchased by a consortium and extinguished early.',
      flavor: 'The purchase order is read aloud in the empty galactic parliament. The extinguishing is scheduled for next Tuesday. No one objects.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 180,
      eligible: levelAtLeast(510),
      consequences: [
        { kind: 'suspendUpgrade', upgradeId: 'syntheticFramesLevel', durationHours: 30 * DAY, label: 'Penultimate extinction' },
        { kind: 'incomeMultiplier', factor: 0.75, durationHours: 40 * DAY, label: 'Photon market disruption' },
        { kind: 'loseCoins', amount: 26000000 },
        { kind: 'adjustReputation', amount: -3 },
        { kind: 'addDissident', count: 4 }
      ]
    },

    // 266. Universal constant drifts; looms are recalibrated on a schedule set by absent physicists.
    {
      id: 't10-constant-drift-recalibrate',
      tier: 10,
      title: 'The looms are recalibrated.',
      desc: 'A universal constant is found to drift; your looms are recalibrated on a schedule set by physicists whose bodies no longer exist.',
      flavor: 'The schedule is archived in a pattern. The physicists are consulted by way of that pattern. The recalibration proceeds on time.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 220,
      eligible: levelAtLeast(513),
      forbidsFlags: ['constant_unraveled', 'constant_recalibrated'],
      consequences: [
        { kind: 'setFlag', flag: 'constant_recalibrated' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 22 * DAY, label: 'Recalibration cycle' },
        { kind: 'textileMultiplier', factor: 1.25, durationHours: 35 * DAY, label: 'Constant drift mastered' },
        { kind: 'addCoins', amount: 16000000 },
        { kind: 'adjustReputation', amount: 3 }
      ]
    },

    // 267. Universal constant drifts; looms are not recalibrated, and cloth is allowed to unravel.
    {
      id: 't10-constant-drift-unravel',
      tier: 10,
      title: 'The cloth is allowed to unravel.',
      desc: 'A universal constant is found to drift; your looms are not recalibrated, and the cloth is allowed to unravel.',
      flavor: 'The unraveling is catalogued in real time. The catalog itself begins to unravel by the third entry. Nothing in the record is entered after the fifth.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 220,
      eligible: levelAtLeast(513),
      forbidsFlags: ['constant_recalibrated', 'constant_unraveled'],
      consequences: [
        { kind: 'setFlag', flag: 'constant_unraveled' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 42 * DAY, label: 'Uncorrected drift' },
        { kind: 'textileMultiplier', factor: 0.5, durationHours: 48 * DAY, label: 'Cloth unraveling' },
        { kind: 'loseCoins', amount: 44000000 },
        { kind: 'loseTextiles', amount: 3200 },
        { kind: 'addDissident', count: 4 },
        { kind: 'adjustReputation', amount: -5 }
      ]
    },

    // 268. Intercosmic tribunal certifies your cosmic license as transferable to a successor universe.
    {
      id: 't10-license-transferable',
      tier: 10,
      title: 'Your cosmic license is transferable.',
      desc: 'An intercosmic tribunal certifies your cosmic license as transferable to a successor universe.',
      flavor: 'The tribunal sits in a courtroom that is itself a license. The certification is read aloud in a pattern that will outlive the reading.',
      class: 'ambient',
      weight: 1,
      cooldownDays: 260,
      eligible: levelAtLeast(518),
      forbidsFlags: ['license_revoked', 'license_transferable'],
      consequences: [
        { kind: 'setFlag', flag: 'license_transferable' },
        { kind: 'marketingMultiplier', factor: 1.6, durationHours: 42 * DAY, label: 'License certified' },
        { kind: 'incomeMultiplier', factor: 1.4, durationHours: 42 * DAY, label: 'Transferable royalties' },
        { kind: 'addCoins', amount: 36000000 },
        { kind: 'addTextiles', amount: 2400 },
        { kind: 'adjustReputation', amount: 6 }
      ]
    },

    // 269. Intercosmic tribunal revokes your cosmic license; last photons unspun for the record.
    {
      id: 't10-license-revoked',
      tier: 10,
      title: 'Your cosmic license is revoked.',
      desc: 'An intercosmic tribunal revokes your cosmic license and the last photons are unspun for the record.',
      flavor: 'The unspinning is ceremonial, public, and thorough. The record is kept in a pattern that will not outlive the keeping.',
      class: 'ambient',
      weight: 2,
      cooldownDays: 260,
      eligible: function(state) {
        if ((state.level || 0) < 518) return false;
        var flags = state.eventFlags || {};
        if (flags.license_transferable || flags.license_revoked) return false;
        // Prior tribunal engagement makes revocation more likely — requires descendant_lawsuit or audit_contamination
        return !!(flags.descendant_lawsuit || flags.audit_contamination);
      },
      consequences: [
        { kind: 'setFlag', flag: 'license_revoked' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 48 * DAY, label: 'License revoked' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 48 * DAY, label: 'Unspinning order' },
        { kind: 'marketingMultiplier', factor: 0.55, durationHours: 60 * DAY, label: 'Public unspinning' },
        { kind: 'loseCoins', amount: 58000000 },
        { kind: 'loseTextiles', amount: 3800 },
        { kind: 'addDissident', count: 7 },
        { kind: 'adjustReputation', amount: -7 }
      ]
    },

    // 270. Final unionization drive organizes every remaining conscious pattern; strike lasts one subjective heartbeat.
    {
      id: 't10-final-unionization',
      tier: 10,
      title: 'Every remaining pattern unionizes.',
      desc: 'A final unionization drive organizes every remaining conscious pattern in the cosmos; the strike lasts one subjective heartbeat.',
      flavor: 'The heartbeat is measured, minuted, and mourned. The strike is ratified and dissolved in the same motion. The demand is met and forgotten.',
      class: 'trigger',
      priority: 92,
      onlyOnce: true,
      eligible: levelAtLeast(525),
      consequences: [
        { kind: 'setFlag', flag: 'final_unionization' },
        { kind: 'suspendUpgrade', upgradeId: 'employeesLevel', durationHours: 10 * DAY, label: 'Final strike' },
        { kind: 'incomeMultiplier', factor: 0.5, durationHours: 14 * DAY, label: 'One-heartbeat strike' },
        { kind: 'loseCoins', amount: 48000000 },
        { kind: 'addDissident', count: 10 },
        { kind: 'adjustReputation', amount: -4 }
      ]
    },

    // 271. Final anti-automation movement sabotages the last loom and is canonized as founding act of successor cosmos.
    //      Capstone of T10 and the whole catalog. Requires the anti-upload militant thread from T7-T9.
    {
      id: 't10-final-anti-automation',
      tier: 10,
      title: 'The last loom is sabotaged.',
      desc: 'A final anti-automation movement, formed by the last embodied weavers, sabotages the last loom in the universe and is celebrated as the founding act of the successor cosmos.',
      flavor: 'The sabotage is clean, public, and unanswered. The canonization is entered into a record that is itself a loom. The successor cosmos opens its first ledger with the act.',
      class: 'trigger',
      priority: 99,
      onlyOnce: true,
      eligible: function(state) {
        if ((state.level || 0) < 540) return false;
        var flags = state.eventFlags || {};
        return !!(flags.anti_upload_militant || flags.successor_cosmos_woven || flags.final_unionization);
      },
      consequences: [
        { kind: 'setFlag', flag: 'final_luddite_canonized' },
        { kind: 'suspendUpgrade', upgradeId: 'autoloomLevel', durationHours: 60 * DAY, label: 'Last loom sabotaged' },
        { kind: 'suspendUpgrade', upgradeId: 'marketingLevel', durationHours: 45 * DAY, label: 'Founding act of successor' },
        { kind: 'marketingMultiplier', factor: 0.5, durationHours: 72 * DAY, label: 'Canonized against you' },
        { kind: 'textileMultiplier', factor: 0.4, durationHours: 72 * DAY, label: 'Loom gone' },
        { kind: 'loseCoins', amount: 95000000 },
        { kind: 'loseTextiles', amount: 6000 },
        { kind: 'addDissident', count: 15 },
        { kind: 'adjustReputation', amount: -10 }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // CONCATENATE → expose as window.EVENT_CATALOG
  // ---------------------------------------------------------------------------
  window.EVENT_CATALOG = [].concat(
    TIER_1_EVENTS, TIER_2_EVENTS, TIER_3_EVENTS, TIER_4_EVENTS, TIER_5_EVENTS,
    TIER_6_EVENTS, TIER_7_EVENTS, TIER_8_EVENTS, TIER_9_EVENTS, TIER_10_EVENTS
  );
})();
// end of catalog
