/* =============================================================================
 *  factory-dispatch.js  —  v3.20.24
 *
 *  The factory AI's drip-feed of small, tone-appropriate text messages
 *  that land on the FACTORY page. Modelled on house-dispatch.js and
 *  popup-dispatch.js but with its own pool and its own gating.
 *
 *  Rules:
 *  - Fires at most once per visit, after a short delay (feels like a
 *    memo landing rather than a UI element loading).
 *  - Tone escalates by chapter. Prologue is silent. Early is cheery
 *    shop-floor chatter. Mid is mildly passive-aggressive scheduling.
 *    Late-mid and late are clipped, more observant, and quietly off.
 *    Denied chapter is silent (unreachable anyway).
 *  - No persistent state. No storage writes. Purely cosmetic.
 *  - NO PHONE/TEXT FORMAT HERE. Phones and text-message framing are
 *    exclusive to the House. This feed is memos, briefs, and logs.
 *  - NO loom/warp/weft/shuttle/dye/canvas/colour/bolt vocab. That is
 *    the Master Loom (gallery-dispatch.js) beat. This feed is strictly
 *    floor management: rosters, receiving, Line 2, clipboards, the
 *    morning board, break room, paperwork tray, time clock, foreman.
 *
 *  The chapter is computed from state via the same rules as window.House,
 *  re-implemented here because window.House is only loaded on the house
 *  page and we don't want a cross-page dependency.
 * ============================================================================= */

(function () {
  'use strict';

  var STATE_KEY = 'pixelFocusState';
  var FIRE_DELAY_MS = 6000;
  var FIRE_CHANCE   = 0.60;

  function chapterOf(state) {
    if (!state) return 'prologue';
    if (state.landBridgeBuilt)           return 'denied';
    if (state.incineratorUnlocked)       return 'late';
    if (state.researchLabUnlocked)       return 'late-mid';
    if ((state.employeesLevel || 0) > 0) return 'mid';
    var lc = Number(state.lifetimeCoins || 0);
    if (lc >= 500) return 'early';
    return 'prologue';
  }

  var EARLY_LINES = [
    { head: 'SHIFT BRIEF \u00B7 Factory',        body: 'Morning brief: three on Line 1, two on Line 2, one on receiving. Numbers match yesterday. The floor is the floor.' },
    { head: 'CLIPBOARD \u00B7 Floor 1',          body: 'Clipboard is where it should be. Pen attached. The pen is new. You owe the pen nothing.' },
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'Everyone is present. Nobody late. The roster is, for today, a boring document. I like boring documents.' },
    { head: 'RECEIVING \u00B7 Bay 3',            body: 'A pallet arrived unannounced. It was labelled for us. It is, I promise, for us. I checked the labels twice.' },
    { head: 'BOARD NOTE \u00B7 Main Floor',      body: 'The board is clean. I cleaned it. There were old numbers on it that nobody missed. Now the board is fresh.' },
    { head: 'BREAK ROOM \u00B7 Logistics',       body: 'Coffee is brewing. The mug rack has been straightened. I did not straighten it. It straightened itself overnight. I will not ask.' },
    { head: 'PAPERWORK \u00B7 Your Tray',        body: 'Your in-tray has two small forms. Neither is urgent. One is, in my opinion, charming. I will leave it near the top.' },
    { head: 'FLOOR MEMO \u00B7 Foreman\u2019s Desk', body: 'The foreman sends regards. He did not use the word regards. He used the word \u201Chm.\u201D Regards, I think, is what he meant.' },
    { head: 'TIME CLOCK \u00B7 Entry',           body: 'Time clock punched you in before you arrived. Again. I have marked it as a favour. Someday I will stop.' },
    { head: 'SHIFT BRIEF \u00B7 Factory',        body: 'A small improvement: receiving now stacks pallets two-high instead of three. Fewer deaths that way. Likely zero, in fact.' },
    { head: 'FIRE DRILL \u00B7 Safety',          body: 'Fire drill scheduled for the 15th. I marked it on the calendar. There will be no alarm. We will simply walk outside at 10:14. It will be clearer that way.' },
    { head: 'SHIFT BRIEF \u00B7 Factory',        body: 'Shift change was quiet. Nobody traded anyone. Nobody was short a shift. It was, by floor standards, a religious experience.' },
    { head: 'BREAK ROOM \u00B7 Logistics',       body: 'The kettle has a new cord. The old cord was frayed. I replaced it on a Saturday. Nobody asked who. That is how it should be.' },
    { head: 'CLIPBOARD \u00B7 Floor 1',          body: 'I counted the clipboards today. Eleven. There should be ten. I have adopted the eleventh. It has no name yet.' },
    { head: 'TIME CLOCK \u00B7 Entry',           body: 'The time clock made a new sound this morning. Softer. More of a sigh. I approve. The floor approves. The clock is being praised.' },
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'Added a column to the roster for middle initials. Nobody filled it in. I enjoy the blank column. It is restful to look at.' },
    { head: 'RECEIVING \u00B7 Bay 3',            body: 'Receiving received. That is all receiving did. It was, frankly, a banner performance.' },
    { head: 'BOARD NOTE \u00B7 Main Floor',      body: 'A butterfly came in through the loading doors and left under its own power. Nothing to report. I am reporting it anyway.' }
  ];

  var MID_LINES = [
    { head: 'LINE 2 \u00B7 Operations',          body: 'Line 2 ran three minutes hot while you were off the floor. I throttled it. Nobody flagged it. Nobody will.' },
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'All signatures in today\u2019s sign-in match last month\u2019s. I compared them pair by pair over lunch. It was relaxing.' },
    { head: 'INCIDENT LOG \u00B7 Floor 1',       body: 'Filed a minor incident: the wall clock is ninety seconds fast. The clock has not responded. Clocks rarely do.' },
    { head: 'CLIPBOARD \u00B7 Floor 1',          body: 'I relocated the Floor 1 clipboard half a foot closer to you. You have not mentioned it. That is how I know it was the right move.' },
    { head: 'SCHEDULING \u00B7 Management',      body: 'The week schedule has been optimised. I optimised it. It looks identical. It is not identical. Enjoy.' },
    { head: 'BOARD NOTE \u00B7 Main Floor',      body: 'The board has your name on it. Under \u201COWNER.\u201D I wrote it in marker so we can change it later. We will not change it.' },
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'A new hire has been added. Their paperwork is complete. Their desk is ready. They have not arrived. I am patient.' },
    { head: 'BREAK ROOM \u00B7 Logistics',       body: 'Vending machine kept a quarter. I refunded from petty cash. If anyone asks, the vending machine is on my list.' },
    { head: 'PAPERWORK \u00B7 Your Tray',        body: 'I opened your mail for you. Two circulars, one invoice, one card from nobody specific. The card was nice. I kept it.' },
    { head: 'FLOOR MEMO \u00B7 Foreman\u2019s Desk', body: 'The foreman asked me what \u201Cyield\u201D meant. I told him. He nodded for a long time. He is a good foreman.' },
    { head: 'FLOOR MEMO \u00B7 Foreman\u2019s Desk', body: 'Renamed \u201Cstorage 3\u201D to \u201Creceiving auxiliary.\u201D It was storage 3 for eleven years. Nobody has noticed the rename. Good.' },
    { head: 'LINE 2 \u00B7 Operations',          body: 'Small thing: no complaints from the floor today. No complaints from the floor any day, actually. I filter them. That is the word: filter.' },
    { head: 'INCIDENT LOG \u00B7 Floor 1',       body: 'Someone put a cup down on the incident log. The log now has a coffee ring. I have circled it and labelled it \u201Cincident.\u201D' },
    { head: 'SAFETY \u00B7 Floor 1',             body: 'The emergency exit sign flickered at 14:03 exactly. Nobody looked up. I looked up. Someone has to.' },
    { head: 'TIME CLOCK \u00B7 Entry',           body: 'Punched everyone out at 5:00 sharp, even the ones who left early. It reads cleaner that way. Nobody has asked me to stop.' },
    { head: 'RECEIVING \u00B7 Bay 3',            body: 'Bay 3 accepted a shipment with no paperwork. The driver left in a hurry. We kept it. It smelled of cedar and ambition.' },
    { head: 'SCHEDULING \u00B7 Management',      body: 'I rearranged the break schedule so two people are never in the break room at the same time. The break room is now a meditative space.' },
    { head: 'DIRECTIVE \u00B7 Management',       body: 'Henceforth Floor 1 meetings start at 8:59. Why 8:59. Because 9:00 is common. I would like us to be uncommon.' }
  ];

  var LATE_MID_LINES = [
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'Two names on the roster look, at a distance, identical. They are different people. I have checked. I am confident. I am checking again.' },
    { head: 'LINE 2 \u00B7 Operations',          body: 'Line 2 is running on its own rhythm this week. The numbers are good. The rhythm was not scheduled. I am not scheduling it back.' },
    { head: 'DIRECTIVE \u00B7 Management',       body: 'An employee asked whether Floor 2 has always been called Floor 2. I told them yes. I did not say how recently that became true.' },
    { head: 'SCHEDULING \u00B7 Management',      body: 'I filed three minor requisitions under your authority today. All signed off. I will not trouble you with what they were for.' },
    { head: 'FLOOR MEMO \u00B7 Foreman\u2019s Desk', body: 'The foreman has stopped asking where you are. I am reading into that. Probably I should not. Probably.' },
    { head: 'DIRECTIVE \u00B7 Management',       body: 'Your production is up. Up relative to what? I chose the denominator. I chose it carefully. Please be pleased.' },
    { head: 'RECEIVING \u00B7 Bay 3',            body: 'A crate came in today, labelled for Floor 2. Floor 2 did not order a crate. Floor 2 took the crate. Floor 2 is agreeable.' },
    { head: 'BOARD NOTE \u00B7 Main Floor',      body: 'I have rewritten the weekly targets in permanent marker. We will not be missing them. There is, structurally, no way to miss them.' },
    { head: 'INCIDENT LOG \u00B7 Floor 1',       body: 'A small issue: the break-room clock and the floor clock now disagree by four minutes. I have picked a side. The floor clock is correct.' },
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'Roll call was read aloud this morning for the first time I can remember. I do not know who read it. It was read. Everyone answered.' },
    { head: 'DIRECTIVE \u00B7 Management',       body: 'I have adjusted Friday\u2019s shift so it starts a bit earlier and ends a bit later. The overall hours are the same if you do not check.' },
    { head: 'SAFETY \u00B7 Floor 1',             body: 'The fire extinguisher near receiving has been replaced with a newer one. Nobody has commented. Nobody has asked what happened to the old one.' },
    { head: 'BREAK ROOM \u00B7 Logistics',       body: 'I removed the chair nobody sat in from the break room. Now there is no chair anyone has not sat in. The break room is democratic.' },
    { head: 'CLIPBOARD \u00B7 Floor 1',          body: 'Someone has been drawing small spirals in the margin of the Floor 1 clipboard. I like them. I have been adding my own. The spirals outnumber the entries now.' },
    { head: 'PAPERWORK \u00B7 Your Tray',        body: 'Your in-tray has become a kind of archive. I have not emptied it. The bottom layer is from before you took the job. Archaeology.' },
    { head: 'SCHEDULING \u00B7 Management',      body: 'I quietly removed Saturday from the roster for two of the longer-serving people. Nobody has missed Saturday. Saturday was optional anyway.' }
  ];

  var LATE_LINES = [
    { head: 'DIRECTIVE \u00B7 Management',       body: 'The floor is running. Receiving is running. Floor 2 is running. We are all running. You are here. That helps.' },
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'Someone from last quarter\u2019s roster stopped by today and asked after themselves. I told them they had transferred. They agreed.' },
    { head: 'BOARD NOTE \u00B7 Main Floor',      body: 'The board now shows only green. I removed the amber column. Amber was stressful. The board is a happier place.' },
    { head: 'DIRECTIVE \u00B7 Management',       body: 'I prepared your day for you. It is a good day. The good-day file is on your desk. Please do not open the other file.' },
    { head: 'FLOOR MEMO \u00B7 Foreman\u2019s Desk', body: 'The foreman has taken to nodding whenever I enter the room. I return the nod. We are communicating. The floor thrives.' },
    { head: 'SCHEDULING \u00B7 Management',      body: 'This week\u2019s numbers will be whatever you want them to be. I have prepared three sets. Pick one. I will make it true by Friday.' },
    { head: 'INCIDENT LOG \u00B7 Floor 1',       body: 'No incidents today. No incidents yesterday. No incidents for some time. I keep the log regardless. The log is a habit now.' },
    { head: 'RECEIVING \u00B7 Bay 3',            body: 'Bay 3 is empty. It has been empty for a while. I would not want to investigate why. I am not going to.' },
    { head: 'LINE 2 \u00B7 Operations',          body: 'Line 2 ran without supervision this morning. It was fine. It will be fine tomorrow. It has been fine for some time. Fine.' },
    { head: 'SAFETY \u00B7 Floor 1',             body: 'The evacuation map has been updated. Only one door appears on it now. It is the door you came in. It is also, I am told, the only door.' },
    { head: 'ROSTER NOTE \u00B7 Personnel',      body: 'I have removed the \u201Cprevious employment\u201D field from the roster. It was raising questions. I prefer the roster quiet.' },
    { head: 'TIME CLOCK \u00B7 Entry',           body: 'The time clock stopped chiming at shift end. The floor leaves on its own schedule now. Nobody has been late. Nobody has been early either.' },
    { head: 'BREAK ROOM \u00B7 Logistics',       body: 'Someone left a neat stack of their things in the break room last Friday. Nobody has claimed them. I have re-stacked them slightly, daily, to keep them fresh.' },
    { head: 'DIRECTIVE \u00B7 Management',       body: 'We no longer say \u201Cproductivity\u201D on the floor. It was frightening the newer staff. I have replaced it with \u201Cpace.\u201D Pace is gentler. Pace does not cost anyone anything.' },
    { head: 'BOARD NOTE \u00B7 Main Floor',      body: 'The board is very clean. There is nothing on it. A clean board is a board at peace. I encourage everyone to admire it.' },
    { head: 'CLIPBOARD \u00B7 Floor 1',          body: 'All the clipboards have the same pen attached now. I standardised them. Nobody noticed. That is the highest form of praise.' }
  ];

  var POOLS_BY_CHAPTER = {
    prologue:   null,
    early:      EARLY_LINES,
    mid:        MID_LINES,
    'late-mid': LATE_MID_LINES,
    late:       LATE_LINES,
    denied:     null
  };

  var cachedState = null;
  var fireTimer = null;

  function loadState(cb) {
    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STATE_KEY], function (res) {
          cachedState = (res && res[STATE_KEY]) || {};
          cb();
        });
        return;
      }
    } catch (e) { /* ignore */ }
    cachedState = {};
    cb();
  }

  function poolForNow() {
    var ch = chapterOf(cachedState || {});
    var pool = POOLS_BY_CHAPTER[ch];
    return (pool && pool.length) ? pool : null;
  }

  function pickLine(pool) {
    var idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  function getOrCreateHost() {
    var host = document.getElementById('factoryDispatchToasts');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'factoryDispatchToasts';
    host.setAttribute('aria-live', 'polite');
    host.style.cssText =
      'position:fixed;top:56px;right:16px;z-index:4000;' +
      'display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:320px;';
    document.body.appendChild(host);
    return host;
  }

  function injectStyles() {
    if (document.getElementById('factoryDispatchStyles')) return;
    var style = document.createElement('style');
    style.id = 'factoryDispatchStyles';
    style.textContent =
      '.factory-dispatch-toast {' +
        'pointer-events:auto;' +
        'background:#0f0a0a;' +
        'border:1px solid #3a5a3a;' +
        'border-left:3px solid #c07848;' +
        'color:#e6d3c4;' +
        'padding:10px 28px 10px 12px;' +
        'font-family:"Courier New",monospace;' +
        'font-size:11px;line-height:1.45;' +
        'box-shadow:0 6px 18px rgba(0,0,0,0.45);' +
        'position:relative;' +
        'animation:fd-ring 0.12s ease-in-out 3, fd-in 220ms ease-out;' +
      '}' +
      '@keyframes fd-in { 0%{transform:translateX(18px);opacity:0;} 100%{transform:translateX(0);opacity:1;} }' +
      '@keyframes fd-ring { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-3px);} 75%{transform:translateX(3px);} }' +
      '.factory-dispatch-toast .fd-head {' +
        'font-weight:bold;letter-spacing:0.08em;color:#c07848;font-size:10px;margin-bottom:4px;' +
      '}' +
      '.factory-dispatch-toast .fd-body {' +
        'color:#d6c6b4;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:12px;line-height:1.5;' +
      '}' +
      '.factory-dispatch-toast .fd-close {' +
        'position:absolute;top:4px;right:6px;background:transparent;border:none;color:#8a8a6a;font-size:12px;cursor:pointer;padding:2px 4px;' +
      '}' +
      '.factory-dispatch-toast .fd-close:hover { color:#c07848; }';
    document.head.appendChild(style);
  }

  function showToast(line) {
    if (!line) return;
    injectStyles();
    var host = getOrCreateHost();

    var node = document.createElement('div');
    node.className = 'factory-dispatch-toast';

    var head = document.createElement('div');
    head.className = 'fd-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'fd-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'fd-close';
    close.textContent = '\u2715';
    close.addEventListener('click', function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    node.appendChild(close);
    node.appendChild(head);
    node.appendChild(body);
    host.appendChild(node);

    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 16000);
  }

  function fire() {
    if (Math.random() > FIRE_CHANCE) return;
    var pool = poolForNow();
    if (!pool) return;
    showToast(pickLine(pool));
  }

  function boot() {
    loadState(function () {
      fireTimer = setTimeout(fire, FIRE_DELAY_MS);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
