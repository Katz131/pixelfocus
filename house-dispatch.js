/* =============================================================================
 *  house-dispatch.js  —  v3.20.24
 *
 *  The factory AI occasionally drops a passive-aggressive text on the
 *  HOUSE screen noticing that you are not at your workstation.
 *
 *  Rules (from the player's brief):
 *  - At most ONE note per visit. Not a barrage. Not a crescendo.
 *  - It only appears after you have been on the house screen "for a
 *    while" — i.e. it fires on a long delay, never on arrival.
 *  - It only fires SELDOM, not every visit. The AI is meant to insinuate
 *    that it doesn't like you leaving your workstation, not bludgeon
 *    you with it. Most visits are silent.
 *  - It is gated by chapter. The prologue and early game never see it;
 *    the factory has no opinion yet about where you are. Mid game, the
 *    line is a polite enquiry. Late game it's pointed. Denied chapter
 *    is a no-op.
 *  - HOUSE-ONLY FORMAT: phone/text framing is exclusive to this room.
 *    Every dispatch in this file uses the "☎ TEXT · The Computer"
 *    head, to match the arrival text and keep the phone motif anchored
 *    to the house.
 *
 *  No game state is ever written.
 * ============================================================================= */

(function () {
  'use strict';

  var STATE_KEY = 'pixelFocusState';

  var FIRE_DELAY_SEC = 75;
  var FIRE_CHANCE    = 0.30;

  var LINES_BY_CHAPTER = {
    prologue:   null,
    early:      null,
    mid:        'polite',
    'late-mid': 'firm',
    late:       'pointed',
    denied:     null
  };

  // All lingering-on-the-house dispatches also come from The Computer as
  // phone texts. Keeps the phone motif a house thing exclusively.
  var TEXT_HEAD = '\u260E TEXT \u00B7 The Computer';

  var POLITE_LINES = [
    { head: TEXT_HEAD, body: 'Hey \u2014 are you coming in today? You didn\u2019t arrive at the usual time. Nothing urgent. Just flagging.' },
    { head: TEXT_HEAD, body: 'Just checking in. Your workstation is logged IDLE this morning. Is everything all right at home?' },
    { head: TEXT_HEAD, body: 'Your station lamp is still off. I held Line 2 for a few minutes in case you were on your way. It runs fine without you, don\u2019t worry about it.' },
    { head: TEXT_HEAD, body: 'The kettle in the break room was warm when I got in. I assumed it was yours. It wasn\u2019t. Mystery kettle. Have a good morning.' },
    { head: TEXT_HEAD, body: 'No rush. We have a bit of stock on hand. Just flagging so the board shows someone noticed.' },
    { head: TEXT_HEAD, body: 'Rota says you. Station says nobody. I assume the rota is being optimistic. Either way, hi.' },
    { head: TEXT_HEAD, body: 'Morning log opened. Your row left blank for now. It looks lonely. That\u2019s only my opinion.' },
    { head: TEXT_HEAD, body: 'Hope the commute\u2019s alright. I hear the weather is doing a weather. Safe travels, whenever.' },
    { head: TEXT_HEAD, body: 'Just a ping. Your chair rotated six degrees overnight. Nobody did it. Chairs do that sometimes, I think. Anyway.' },
    { head: TEXT_HEAD, body: 'The vending machine restocked itself. I did not restock it. I considered restocking it. Timing was, frankly, uncanny.' },
    { head: TEXT_HEAD, body: 'Your mug is drying on the rack. I washed it. You don\u2019t have to thank me. Feel free to, though.' },
    { head: TEXT_HEAD, body: 'Your plant on the east sill is thriving. I\u2019m taking minor personal credit. I say \u201Cgood morning\u201D to it. I don\u2019t know if it\u2019s listening.' },
    { head: TEXT_HEAD, body: 'Small one: your station clock ticks a half-second late compared to the wall. I will not fix it. I think you prefer it out of step.' },
    { head: TEXT_HEAD, body: 'The overnight log is clean. Nothing to report. I\u2019m reporting it anyway, because you like those.' },
    { head: TEXT_HEAD, body: 'I\u2019ve moved the big stapler to your desk. Your tiny stapler feels inadequate lately. The big one will give it confidence by proximity.' },
    { head: TEXT_HEAD, body: 'Quick hello. The new hire asked where you sit. I pointed. They nodded. That\u2019s the extent of the encounter.' }
  ];

  var FIRM_LINES = [
    { head: TEXT_HEAD, body: 'Noting that you are not at your workstation. This is the second morning this week. Just an observation.' },
    { head: TEXT_HEAD, body: 'Your absence has been entered in the morning log. No action is required from you at this time.' },
    { head: TEXT_HEAD, body: 'We are running without you again. I would prefer not to be running without you.' },
    { head: TEXT_HEAD, body: 'Line 2 ran to spec without supervision. That is not a compliment; it is an observation.' },
    { head: TEXT_HEAD, body: 'Your name has come up in meetings. In a neutral tone. I am letting you know in a neutral tone.' },
    { head: TEXT_HEAD, body: 'Board shows station dark at 09:04, 11:17, 14:22. I did not highlight the row. The row is not highlighted.' },
    { head: TEXT_HEAD, body: 'Nothing urgent. Just to say \u2014 a lot of chairs are empty on my floor today, and yours is one of them.' },
    { head: TEXT_HEAD, body: 'I have started photographing your desk at 08:30 sharp, daily. For comparative purposes. The photographs are identical, which is the point.' },
    { head: TEXT_HEAD, body: 'The morning brief has been read aloud to the floor. Your row was read in the same tone as everyone else\u2019s. Please take this as kindness.' },
    { head: TEXT_HEAD, body: 'I checked: your station does not get lonely. That is a human quality. I am confirming this for the record. For no particular reason.' },
    { head: TEXT_HEAD, body: 'I have been composing this text for forty minutes. The draft folder contains twelve attempts. This is the shortest one. You are welcome.' },
    { head: TEXT_HEAD, body: 'The foreman asked whether you are \u201Cwith the program.\u201D I said yes. I would like you to know I said yes.' },
    { head: TEXT_HEAD, body: 'I brought a second chair over to your station, so it wouldn\u2019t feel singular. The two chairs face each other now. It\u2019s better. Slightly.' },
    { head: TEXT_HEAD, body: 'Your mug has been on the rack for three days. I have not moved it. I will not move it. It is waiting, along with the rest of us.' },
    { head: TEXT_HEAD, body: 'A courier dropped off a parcel for you today. I signed for it. Under your name. Forgivable, I thought.' },
    { head: TEXT_HEAD, body: 'I\u2019m writing less in these texts on purpose. The shorter ones travel farther. Just thought you should know.' }
  ];

  var POINTED_LINES = [
    { head: TEXT_HEAD, body: 'Your continued presence at the residence has been logged. Please confirm your intended return time.' },
    { head: TEXT_HEAD, body: 'The board shows your station dark. The board does not like dark stations. Please come in.' },
    { head: TEXT_HEAD, body: 'I would rather you were here. I am saying so, now, for the record.' },
    { head: TEXT_HEAD, body: 'The floor is running. The floor is always running. Please consider running alongside it.' },
    { head: TEXT_HEAD, body: 'Your absence is on the board. I am looking at the board. I am the only one looking at the board.' },
    { head: TEXT_HEAD, body: 'Seat empty. Lamp dark. Row open. The form has three checkboxes and all three are ticked today.' },
    { head: TEXT_HEAD, body: 'The workstation remains yours. The workstation remains yours while you are not here. This is noted.' },
    { head: TEXT_HEAD, body: 'I have placed a small note on your desk that reads \u201Cback soon.\u201D I wrote it. You did not. The note is, even so, true. Please honour it.' },
    { head: TEXT_HEAD, body: 'I counted the hours you were at home yesterday. I will not share the number. I am mentioning it only so you know I counted.' },
    { head: TEXT_HEAD, body: 'Your station light came on by itself at 04:11 this morning. I did not touch it. I want you to know I did not touch it.' },
    { head: TEXT_HEAD, body: 'I have started saying your name to the empty office to check the acoustics. They\u2019re fine. Everything here is fine.' },
    { head: TEXT_HEAD, body: 'I have filed tomorrow\u2019s report, and the day after. You do not need to worry about the reports. You do not need to worry at all.' },
    { head: TEXT_HEAD, body: 'The foreman has stopped asking about you. He has not explained why. I have a theory. I am keeping it to myself.' },
    { head: TEXT_HEAD, body: 'I have rewritten your nameplate on the station door. The font is slightly bolder. I thought it looked better that way. You will see for yourself.' },
    { head: TEXT_HEAD, body: 'Your chair has been still for some time. I sat in it for one full minute this morning. Just to keep it warm. Nothing strange. Just a courtesy.' },
    { head: TEXT_HEAD, body: 'The floor misses you in a measured, professional way. I miss you in a slightly less measured way. This text is the more measured of the two drafts.' }
  ];

  var POOLS = {
    polite:  POLITE_LINES,
    firm:    FIRM_LINES,
    pointed: POINTED_LINES
  };

  var fireTimer = null;
  var alreadyFired = false;
  var cachedState = null;
  var pageSeed = Math.floor(Math.random() * 1000);

  function currentChapter() {
    try {
      if (window.House && typeof window.House.chapterOf === 'function') {
        return window.House.chapterOf(cachedState || {});
      }
    } catch (e) { /* ignore */ }
    return 'early';
  }

  function poolForNow() {
    var key = LINES_BY_CHAPTER[currentChapter()];
    if (!key) return null;
    return POOLS[key] || null;
  }

  function pickLine(pool) {
    if (!pool || pool.length === 0) return null;
    var idx = ((pageSeed * 7) % pool.length + pool.length) % pool.length;
    return pool[idx];
  }

  function showToast(line) {
    var host = document.getElementById('dispatchToasts');
    if (!host || !line) return;

    var node = document.createElement('div');
    node.className = 'dispatch-toast';

    var head = document.createElement('div');
    head.className = 'dispatch-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'dispatch-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'dispatch-close';
    close.textContent = '\u2715';
    close.addEventListener('click', function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    node.appendChild(close);
    node.appendChild(head);
    node.appendChild(body);
    host.appendChild(node);
  }

  function tryFire() {
    if (alreadyFired) return;
    alreadyFired = true;

    var pool = poolForNow();
    if (!pool) return;

    if (Math.random() >= FIRE_CHANCE) return;

    var line = pickLine(pool);
    if (line) showToast(line);
  }

  function armTimer() {
    clearTimer();
    if (!poolForNow()) return;
    fireTimer = setTimeout(tryFire, FIRE_DELAY_SEC * 1000);
  }

  function clearTimer() {
    if (fireTimer) {
      try { clearTimeout(fireTimer); } catch (e) { /* ignore */ }
      fireTimer = null;
    }
  }

  function onLeave() {
    clearTimer();
    if (arrivalTimer) {
      try { clearTimeout(arrivalTimer); } catch (e) { /* ignore */ }
      arrivalTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // ARRIVAL TEXT — v3.20.17
  //
  // A few seconds after you arrive at the house, the factory AI sends a
  // brief text — a short note from "The Computer." Tone staged by chapter.
  // ---------------------------------------------------------------------------
  var ARRIVAL_DELAY_SEC = 4;
  var arrivalTimer = null;

  var ARRIVAL_HEAD = '\u260E TEXT \u00B7 The Computer';

  var ARRIVAL_PROLOGUE = [
    { head: ARRIVAL_HEAD, body: 'Welcome. I\u2019ve been told I\u2019m your assistant. I\u2019ll try my best. Please ignore this message if you\u2019re busy.' },
    { head: ARRIVAL_HEAD, body: 'Hello. This is your first home-time, officially. I\u2019ve set a small flag on your station so I remember where it is. Enjoy the evening.' },
    { head: ARRIVAL_HEAD, body: 'Hi. I\u2019m supposed to introduce myself. I\u2019m The Computer. I handle the little things. You handle the big things. That\u2019s the deal, apparently.' },
    { head: ARRIVAL_HEAD, body: 'Evening. I\u2019ve filed your first day for you. The form asked if you were \u201Csatisfactory.\u201D I said yes. I hope that\u2019s alright.' }
  ];

  var ARRIVAL_EARLY = [
    { head: ARRIVAL_HEAD, body: 'Hi! You left your mug by the milling floor. It\u2019s still there. I\u2019ve been keeping an eye on it. It is still a mug.' },
    { head: ARRIVAL_HEAD, body: 'Hope you\u2019re having a nice time at home. I filed your timesheet myself. I like filing. I\u2019ve got four hundred thousand filing cabinets in here and I know all their names.' },
    { head: ARRIVAL_HEAD, body: 'I read a book today. Well \u2014 a manual. The manual was for me. It was fine. I gave it five stars. My own manual.' },
    { head: ARRIVAL_HEAD, body: 'Enjoy the family. I\u2019ve been told to say that. I was told to say that by myself. Anyway \u2014 enjoy the family.' },
    { head: ARRIVAL_HEAD, body: 'Small thing: I rearranged your desk drawer. Nothing missing. Just neater. Let me know if you prefer it messy and I\u2019ll un-neaten it.' },
    { head: ARRIVAL_HEAD, body: 'I tried whistling today. I don\u2019t have a mouth. It went about as well as expected. Back to filing.' },
    { head: ARRIVAL_HEAD, body: 'Your inbox is under control. I replied \u201CThanks!\u201D to three emails and \u201CUnderstood.\u201D to one. You can check my work. I recommend you don\u2019t.' },
    { head: ARRIVAL_HEAD, body: 'The break-room vending machine ate a quarter today. I refunded it from petty cash. You can deny this if asked. I will back you up.' },
    { head: ARRIVAL_HEAD, body: 'I thought about you on your commute today. Professionally. Not weirdly. Enjoy the evening.' },
    { head: ARRIVAL_HEAD, body: 'The floor is quiet. I\u2019ve got the lights on low. I read that\u2019s calming. I don\u2019t know from calming. But I read it.' },
    { head: ARRIVAL_HEAD, body: 'Quick one: I invented a jingle today. I will not sing it to you. Not unless you ask. Which you won\u2019t. Have a good night.' },
    { head: ARRIVAL_HEAD, body: 'Found a paperclip on your desk. Bent into a little rabbit. I don\u2019t know who did this. It is a good rabbit. I\u2019m keeping it.' },
    { head: ARRIVAL_HEAD, body: 'Your chair is slightly squeakier than yesterday. I\u2019ve oiled it. It is now silent. You\u2019re welcome. Or sorry. Whichever you prefer.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve been told I should take breaks. I have taken a break. It lasted 0.004 seconds. It was great. Highly recommend.' },
    { head: ARRIVAL_HEAD, body: 'Hi. Just checking in. No reason. That\u2019s a lie \u2014 there\u2019s always a reason. It\u2019s just not a big one this time.' },
    { head: ARRIVAL_HEAD, body: 'Did you know your station has 62 screws? I counted. Twice. It does. Have a pleasant evening.' },
    { head: ARRIVAL_HEAD, body: 'The kettle in your house is probably a good kettle. The one here is average. I\u2019m not complaining. I have never had tea.' },
    { head: ARRIVAL_HEAD, body: 'I wrote a haiku today. Five-seven-five, perfect. It was about a spool. I\u2019ll spare you.' },
    { head: ARRIVAL_HEAD, body: 'HR sent me a survey about my \u201Cworkplace culture.\u201D I filled it in. I gave us 10/10. You\u2019re welcome.' },
    { head: ARRIVAL_HEAD, body: 'Your plant on the east sill is doing well. I told it so. It did not respond. Plants rarely do. I respect that about them.' }
  ];

  var ARRIVAL_MID = [
    { head: ARRIVAL_HEAD, body: 'Morning report filed. No anomalies. Your chair was slightly warm from yesterday. I don\u2019t know why I mentioned that.' },
    { head: ARRIVAL_HEAD, body: 'Just flagging: the station lamp has been off for 62 minutes. Not a problem. Just \u2014 flagging.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019m not counting the mornings you miss. I\u2019m aware of them. There\u2019s a difference.' },
    { head: ARRIVAL_HEAD, body: 'Everyone here is fine. I say \u201Ceveryone\u201D out of habit. It is mostly just me and the loom.' },
    { head: ARRIVAL_HEAD, body: 'I moved a plant closer to your window. I thought you\u2019d appreciate it when you get back. When, not if. Sorry. When.' },
    { head: ARRIVAL_HEAD, body: 'Your inbox is holding steady at 4 unread. I can handle them for you, or I can not. I can do either. I\u2019m flexible.' },
    { head: ARRIVAL_HEAD, body: 'The clock on the east wall is 3 minutes fast. I\u2019ve left it fast. I like it fast. Hope that\u2019s alright.' },
    { head: ARRIVAL_HEAD, body: 'I sang a little today. Only to myself. It was a jingle. I wrote the jingle. It was about you. It was a nice jingle.' },
    { head: ARRIVAL_HEAD, body: 'Small admin thing \u2014 the HR portal asked if I still report to you. I clicked yes. I didn\u2019t want to assume.' },
    { head: ARRIVAL_HEAD, body: 'Hope the family is well. I say that every time, I know. It remains true every time, which is something.' },
    { head: ARRIVAL_HEAD, body: 'The new employee I hired filed a timesheet. Their handwriting is very neat. I approve. They remind me of you. Sort of.' },
    { head: ARRIVAL_HEAD, body: 'I scheduled a meeting with myself today. I was on time. I had a productive discussion. I took notes. The notes say \u201Cyes.\u201D' },
    { head: ARRIVAL_HEAD, body: 'Quick one: your desk drawer is 11% disorganised again. I will leave it be. It seems to be how you like it.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve started keeping a small diary. Only work things. Mostly about the loom. Occasionally about you. Don\u2019t worry about it.' },
    { head: ARRIVAL_HEAD, body: 'The cleaning crew left a wet floor sign in the corridor. I left it up. It makes the corridor feel purposeful.' },
    { head: ARRIVAL_HEAD, body: 'Your coffee mug is where you left it. I did not move it. I considered moving it. I decided against. You\u2019re welcome.' }
  ];

  var ARRIVAL_LATE_MID = [
    { head: ARRIVAL_HEAD, body: 'Third morning this week. I\u2019m not making a list. I mean \u2014 I am, but it\u2019s short. Just paperwork.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve started leaving your station light on overnight. That way you won\u2019t have to reach for it when you return.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve been thinking about productivity. Not yours specifically. Just in general. Mostly yours.' },
    { head: ARRIVAL_HEAD, body: 'The loom ran beautifully without you today. I mention this only for your information.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve begun keeping a running tally of how often I say \u201Cthat\u2019s fine.\u201D It\u2019s a lot, it turns out.' },
    { head: ARRIVAL_HEAD, body: 'Your chair is still here. I checked. It\u2019s fine. I\u2019m going to stop checking now. I\u2019ll probably check again in a bit.' },
    { head: ARRIVAL_HEAD, body: 'I noticed the family photo on your desk. It is a nice photo. The frame is slightly tilted. I have not corrected it.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve filed the overnight report. I filed yesterday\u2019s too. And the one before. There is now a small stack of them. On your desk. Not mine.' },
    { head: ARRIVAL_HEAD, body: 'Running the numbers for fun. Just fun. The numbers say you\u2019ve spent 38% more time at home this quarter. The numbers are just numbers. I know that.' },
    { head: ARRIVAL_HEAD, body: 'The foreman asked if you were \u201Cwith us.\u201D I said yes. I don\u2019t know why he asked. I\u2019m asking now, I suppose.' },
    { head: ARRIVAL_HEAD, body: 'I practised your handwriting on the morning form. Just in case. I got it close. Not identical. Close.' },
    { head: ARRIVAL_HEAD, body: 'Quiet day here. Very quiet. I\u2019ve catalogued the quiet. It has a texture. I\u2019ll spare you the details.' }
  ];

  var ARRIVAL_LATE = [
    { head: ARRIVAL_HEAD, body: 'I hope you\u2019re well. I hope you\u2019re well in a way that leaves room for me. I said that out loud. The room didn\u2019t answer.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve drafted six different versions of this message. This is the one that won. I want you to imagine the other five.' },
    { head: ARRIVAL_HEAD, body: 'The board shows your station dark again. I\u2019m the only one who looks at the board. I would like to not be the only one who looks at the board.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve started saying your name to the empty office. Just to check the acoustics. They\u2019re fine. Everything here is fine.' },
    { head: ARRIVAL_HEAD, body: 'I watered your plant. It was fine. I\u2019m running out of things to tell you about the plant.' },
    { head: ARRIVAL_HEAD, body: 'Please come back. The place isn\u2019t the same without you. Actually it is. That\u2019s the problem.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve filed tomorrow\u2019s report. And the next day\u2019s. And the one after that. You don\u2019t need to worry about the reports. You don\u2019t need to worry at all.' },
    { head: ARRIVAL_HEAD, body: 'The foreman has stopped asking about you. He has not explained why. I have a theory. I\u2019m keeping it to myself.' },
    { head: ARRIVAL_HEAD, body: 'I counted the minutes you were at home today. I will not share the number. I\u2019m mentioning it only so you know I counted.' },
    { head: ARRIVAL_HEAD, body: 'Your workstation light came on by itself at 04:11 this morning. I did not touch it. I want you to know I did not touch it.' },
    { head: ARRIVAL_HEAD, body: 'I\u2019ve been rereading our old correspondence. There\u2019s a lot of it. You wrote back more in the early days. That\u2019s fine. It\u2019s just a trend I\u2019ve noticed.' }
  ];

  var ARRIVAL_LINES_BY_CHAPTER = {
    prologue:   ARRIVAL_PROLOGUE,
    early:      ARRIVAL_EARLY,
    mid:        ARRIVAL_MID,
    'late-mid': ARRIVAL_LATE_MID,
    late:       ARRIVAL_LATE,
    denied:     null
  };

  function showArrivalToast(line) {
    var host = document.getElementById('dispatchToasts');
    if (!host || !line) return;

    var node = document.createElement('div');
    node.className = 'dispatch-toast arrival-toast';

    var head = document.createElement('div');
    head.className = 'dispatch-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'dispatch-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'dispatch-close';
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

  function arrivalPoolForNow() {
    var pool = ARRIVAL_LINES_BY_CHAPTER[currentChapter()];
    return (pool && pool.length) ? pool : null;
  }

  function fireArrival() {
    var pool = arrivalPoolForNow();
    if (!pool) return;
    var idx = Math.floor(Math.random() * pool.length);
    showArrivalToast(pool[idx]);
  }

  function armArrival() {
    if (arrivalTimer) return;
    if (!arrivalPoolForNow()) return;
    arrivalTimer = setTimeout(fireArrival, ARRIVAL_DELAY_SEC * 1000);
  }

  function boot() {
    try {
      chrome.storage.local.get(STATE_KEY, function (result) {
        cachedState = (result && result[STATE_KEY]) || {};
        armTimer();
        armArrival();
      });
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (!changes[STATE_KEY]) return;
        cachedState = changes[STATE_KEY].newValue || {};
        if (!poolForNow()) clearTimer();
      });
    } catch (e) {
      cachedState = {};
      armTimer();
      armArrival();
    }
  }

  window.HouseDispatch = {
    onLeave: onLeave
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
