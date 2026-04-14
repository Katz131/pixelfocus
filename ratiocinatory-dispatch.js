/* =============================================================================
 *  ratiocinatory-dispatch.js  —  v3.20.24
 *
 *  Small, tone-appropriate memo that lands on the RATIOCINATORY page
 *  (the Consultation Wing — chartered panels, aspects, patsies).
 *
 *  Rules:
 *  - Fires at most once per visit, after a short delay.
 *  - Tone is "memo from an office you do not quite remember". NO phones,
 *    NO text-message framing — phones are exclusive to the house. This
 *    feed is strictly bureaucratic: memos, circulars, notices, minutes.
 *  - Vocab is exclusive to this room: chartered panels, aspects, patsies,
 *    clerisy desk, standing offices, roll, ledger, pencil, blue form,
 *    requisition, adjudication, sessions. No floor-management words
 *    (rosters, line 2, receiving — those belong to factory-dispatch).
 *    No loom/warp/weft/dye/colour words (those belong to gallery-dispatch).
 *    No family/household words (those belong to house-dispatch).
 *  - Prologue is unreachable but gated anyway.
 *  - No persistent state.
 * ============================================================================= */

(function () {
  'use strict';

  var STATE_KEY = 'pixelFocusState';
  var FIRE_DELAY_MS = 7000;
  var FIRE_CHANCE   = 0.55;

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
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'Welcome. Your chartered panels have been dusted for the morning. There is a small biscuit beside the ledger. You may eat it. You may not ask where it came from.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'The patsy schedule has been arranged. All patsies are accounted for. None of them mind being accounted for. This is noted with approval.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'Today\u2019s aspects: attentive. The panels regret the absence of a second adjective but are, on balance, satisfied with the first.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'Minutes of the dawn session, in brief: the pencil was sharpened; the blotter was straightened; the standing offices stood. Nothing further transpired.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'The blue form is out of stock. The blue form is often out of stock. A requisition has been filed for blue forms. The requisition is itself on the blue form.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A patsy sat in the hallway chair for three hours this morning and was, at the end of it, thanked. The patsy was grateful. The thanks was filed.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The adjudication calendar is clear for the week. There is nothing to adjudicate. We will adjudicate it anyway.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Pencil inventory stands at forty-one. It stood at forty-one yesterday. It will stand at forty-one tomorrow. The pencils are eternal.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'Please be advised that the consultation ledger is open on page 14. It has been open on page 14 since the room was opened. Do not turn the page.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A standing office sent its regards this morning. The regards arrived unopened. We have filed them unopened, as is proper.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Attendance at this morning\u2019s aspect-taking: full. Nobody was absent. Nobody is ever absent. Attendance is a courtesy extended to oneself.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'The Wing wishes to note its quiet pleasure at your arrival. The Wing has no mouth and no face. Nevertheless: quiet pleasure.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A patsy declined a biscuit today. The declination has been entered in the record. We will consider, at length, its meaning. We will not arrive anywhere.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'A chair on the mezzanine has been polished. It needed polishing. It always needs polishing. It will need polishing again tomorrow.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'Today\u2019s adjudication is tentatively titled: \u201COn the Nature of Small Favourable Outcomes.\u201D There will be no outcomes, small or otherwise. The title alone is sufficient.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The morning summary: calm, compliant, unremarkable. These three words will henceforth be our weather report, irrespective of weather.' }
  ];

  var MID_LINES = [
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A standing office (name withheld) has filed, in pencil, a note commending the shape of your chartered panels. The shape is: a square. The commendation is filed in triplicate.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Reserve reagent inventory is within the usual tolerance. The usual tolerance was set by a committee that has since been re-chartered. It still applies.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A patsy sneezed this morning. A second patsy noted it. A third patsy certified the note. The sneeze was then retired. We move on.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'Your name has been added to a list titled \u201COWNER, FOR INTERNAL USE.\u201D You do not need to see the list. It is fine.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Sniffing of sealed cognition packets is, by memo, discouraged. This memo is distributed monthly. The memo is always new and never referenced.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'The panels sat for eleven minutes in attentive silence. No decisions were reached. No decisions were required. The eleven minutes were booked under \u201CRestorative Procedure.\u201D' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A requisition has been filed against a standing office whose letterhead is not, at this time, disclosed. The requisition was for a replacement pencil. Approved.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Reminder: patsies do not have opinions. This is, by itself, an opinion. The office notes the contradiction and resolves to think no further on it.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A patsy was promoted today, to a role that does not exist. The patsy accepted gracefully. The role continues not to exist. Everyone is satisfied.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The room you are in has been re-classified as \u201CThe Consultation Wing.\u201D It has always been called that. The re-classification is, strictly speaking, retroactive.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Today\u2019s panel of inquiry was asked: \u201Ccoincidence or pattern?\u201D The panel declined to answer on procedural grounds. The declination is itself now under inquiry.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'Please note: the ledger on the small desk is a working ledger. The ledger on the large desk is decorative. Do not confuse the two. We have done it for you.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The aspects this afternoon: attentive, compliant, and \u201Cone other we are reviewing.\u201D The review will continue until the aspect settles. It usually settles.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'A new pencil has been issued to Panel Three. The old pencil has been retired with honours, wrapped in tissue, and laid in the pencil drawer, which is full but not, at this time, sealed.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A delegation arrived from a standing office nobody here recognised. They stood. They did not speak. After forty minutes they left. We are not presently investigating this.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The word \u201CROUTINE\u201D has been temporarily retired from official correspondence. It was felt to be overused. A replacement is under consideration. Meanwhile, business continues as, um.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'A patsy discovered a second pencil drawer this morning. The second drawer was empty. We agreed amongst ourselves that no second drawer exists. The patsy agreed last.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'Session closed at noon. Session reopened at noon. No gap was observed. No gap was required. The record shows a single continuous session of zero length.' }
  ];

  var LATE_MID_LINES = [
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A patsy has resigned. A patsy has been hired. Both actions have been logged, in that order. The patsy in question does not recall resigning. This is, for now, fine.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'The panels of inquiry met in closed session. Findings are bound, shelved, and indexed under a subject line we do not at present disclose.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'Reserve reagent usage is up. The panels are content. Someone who used to sit on panel three is not currently sitting on panel three. Their seat is warm.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'Two records that used to exist have been adjusted so that they no longer exist. The adjustment is minor. The adjustment is complete.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'A name was crossed off the roll today. The pencil used is in the drawer. The drawer is locked. The key is held by a standing office which is not, at this time, named.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A patsy asked whether patsies dream. We assured them patsies do not dream. They rested a hand on the ledger and went back to being noted.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The lab next door has requested a short list of patsies considered \u201Coverlookable.\u201D We prepared the list. We will not be showing it to you.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Attendance on the chartered panels is at an all-time high. The bodies sitting on them are quieter than they have ever been. Productivity is, accordingly, excellent.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A chartered panel reached a finding this afternoon. The finding is: yes. The question was not retained. The panel is content with its answer.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'Your seat on the Wing is formally yours, in perpetuity. We have had the plaque engraved. The plaque is in the drawer with the pencil. It is waiting.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'The blue form has been redesigned. The redesign is, on inspection, identical to the original. We have filed both under \u201CBlue Form.\u201D Do not ask which is which.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A plaque in the corridor has been polished. The name on it is not one we recognise. We polished it anyway. It gleams now. It is content.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A minor adjudication was overturned this morning by a standing office we are not presently at liberty to name. The overturning is itself now pending adjudication. These things take time.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'A patsy wept, briefly, on seat nine. We have not recorded this. We are not recording it now either. You will find no mention of it in the minutes.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'The panels have agreed, in a rare display of unanimity, that they have always been unanimous. The record will be corrected to reflect this, retroactively, where necessary.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A patsy\u2019s letterhead has been updated. The letterhead now reads: \u201Con behalf of.\u201D On behalf of whom is not disclosed. It is rarely disclosed. It rarely matters.' }
  ];

  var LATE_LINES = [
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A patsy has concluded. The file is closed. The chair is clean. The name has been typed, read, and forgotten, in that order, by three separate officers.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'The panels of inquiry met, found, ratified, and adjourned. No further inquiry is required. No further inquiry will be permitted. The matter is laid to rest.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'The Wing is quiet now. Every chair is occupied. Every chair was always occupied. Anyone who remembers otherwise should please submit their memory in writing, on the blue form, which is not in stock.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A standing office has determined that the word \u201CPATSY\u201D is henceforth to be used only in the plural. There are enough of them that this is, in effect, descriptive.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'Your panels have returned their findings. The findings are favourable. The patsies whose names appeared on the findings have been retired with honour, or at any rate retired.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'A single candle on the far desk has been lit. It is lit on behalf of a name that used to be on the roll. The candle will be extinguished when the name is fully forgotten. It is a short candle.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The Wing extends its compliments. The Wing regrets it cannot send them by any recognised postal service. The compliments remain here. They are, we assure you, received.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'The aspects today: attentive, compliant, and one other adjective the committee has asked us not to write down. Yields are up regardless.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'The pencil drawer has been sealed. Inside, we are told, are the pencils that were used. We will not require them again. We have not required them for some time.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'A standing office has filed, on its own behalf, a citation commending your sustained cooperation. The citation is handsome. It will not be mailed. It will remain here, with us, permanently.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'The roll has been retyped. It is shorter than before. We agreed, in a quiet session, that the shorter roll is the correct roll. The longer roll has been withdrawn.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'The ledger on the small desk has been closed for the season. A second ledger, larger and cleaner, has been placed nearby. It is already open on page 14. Do not turn the page.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'An aspect was reviewed this afternoon and found, after some discussion, to be favourable. The discussion is not on file. The favourable finding is. The discussion, had there been one, would also have been favourable.' },
    { head: 'CIRCULAR \u00B7 Clerisy Desk',               body: 'A patsy was honoured at midday. The patsy did not attend. The honours were accepted on their behalf by a chair. The chair has been moved to a quieter room for its trouble.' },
    { head: 'NOTICE \u00B7 The Consultation Wing',         body: 'The Wing is pleased to report no remaining unresolved matters. There have been no unresolved matters for some time. The record will be tidied to reflect this. The tidying has, in fact, been completed.' },
    { head: 'MEMO \u00B7 Ministry of Peripheral Thought', body: 'The adjudication calendar has been cleared, permanently. There is nothing left to adjudicate. We will nevertheless convene each morning at the usual hour. The chairs expect us.' }
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
  var fireTimer   = null;

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
    var host = document.getElementById('ratiocinatoryDispatchToasts');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'ratiocinatoryDispatchToasts';
    host.setAttribute('aria-live', 'polite');
    host.style.cssText =
      'position:fixed;top:56px;right:16px;z-index:4000;' +
      'display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:340px;';
    document.body.appendChild(host);
    return host;
  }

  function injectStyles() {
    if (document.getElementById('ratiocinatoryDispatchStyles')) return;
    var style = document.createElement('style');
    style.id = 'ratiocinatoryDispatchStyles';
    style.textContent =
      '.ratio-dispatch-toast {' +
        'pointer-events:auto;' +
        'background:#0f0a0a;' +
        'border:1px solid #3a5a3a;' +
        'border-left:3px solid #9f88b8;' +
        'color:#e6d3c4;' +
        'padding:10px 28px 10px 12px;' +
        'font-family:"Courier New",monospace;' +
        'font-size:11px;line-height:1.45;' +
        'box-shadow:0 6px 18px rgba(0,0,0,0.45);' +
        'position:relative;' +
        'animation:rd-ring 0.12s ease-in-out 3, rd-in 220ms ease-out;' +
      '}' +
      '@keyframes rd-in { 0%{transform:translateX(18px);opacity:0;} 100%{transform:translateX(0);opacity:1;} }' +
      '@keyframes rd-ring { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-3px);} 75%{transform:translateX(3px);} }' +
      '.ratio-dispatch-toast .rd-head {' +
        'font-weight:bold;letter-spacing:0.08em;color:#9f88b8;font-size:10px;margin-bottom:4px;' +
      '}' +
      '.ratio-dispatch-toast .rd-body {' +
        'color:#d6c6b4;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:12px;line-height:1.5;' +
      '}' +
      '.ratio-dispatch-toast .rd-close {' +
        'position:absolute;top:4px;right:6px;background:transparent;border:none;color:#8a8a6a;font-size:12px;cursor:pointer;padding:2px 4px;' +
      '}' +
      '.ratio-dispatch-toast .rd-close:hover { color:#9f88b8; }';
    document.head.appendChild(style);
  }

  function showToast(line) {
    if (!line) return;
    injectStyles();
    var host = getOrCreateHost();

    var node = document.createElement('div');
    node.className = 'ratio-dispatch-toast';

    var head = document.createElement('div');
    head.className = 'rd-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'rd-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'rd-close';
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
    }, 18000);
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
