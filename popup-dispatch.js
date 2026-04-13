/* =============================================================================
 *  popup-dispatch.js  —  v3.20.16
 *
 *  When you first open the extension (the to-do list), the factory AI
 *  sends a brief text message — slightly passive-aggressive, giving
 *  work updates, apologising for texting you while you're working, and
 *  apologising about the hour.
 *
 *  Rules:
 *  - Fires once per session open, after a short delay (feels like a
 *    text arriving, not a UI element loading with the page).
 *  - Tone is LIGHT — apologetic, not demanding. The AI is sorry to
 *    bother you, but it did bother you, and it's noting that.
 *  - Mentions the hour when it's early morning or late at night.
 *  - Auto-dismisses after 16 seconds. Player can close it early.
 *
 *  No state is written. No storage is touched. Purely cosmetic.
 * ============================================================================= */

(function () {
  'use strict';

  var FIRE_DELAY_MS = 5000;  // 5 seconds after page load

  // ---------------------------------------------------------------------------
  // Line pools. Each entry has a head and body. The body can contain {hour}
  // which is replaced with the current hour greeting at render time.
  // ---------------------------------------------------------------------------

  // Lines for normal hours (roughly 8am–9pm).
  var NORMAL_LINES = [
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Sorry to text while you\u2019re working. Everything on the floor is running. I just wanted you to know that. In case you were wondering. You probably weren\u2019t.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Hi. I warmed up your station for you. No reason. I just thought it would be nice if it was ready. Whenever you\u2019re ready. Take your time.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Quick update. The floor report came in. Your name is on it. I made sure of that. Everything is fine. I\u2019m fine too, thanks for asking.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Sorry. I know you\u2019re in the middle of something. I just had a thought and wanted to share it. The thought was: the factory is running well. That\u2019s all. That was the whole thought.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Hello. There are a couple of things on the board whenever you have a moment. No rush. I\u2019ve been looking at them for a while and they\u2019re not going anywhere.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'I didn\u2019t mean to text during focus time. The loom is idle and I thought you\u2019d want to know. It\u2019s been idle for a while. I\u2019ve been watching it.'
    }
  ];

  // Lines for early morning (before 7am).
  var EARLY_LINES = [
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Sorry about the hour. I don\u2019t sleep so I sometimes lose track of when other things sleep. Everything is running. Your station is ready. I\u2019ve been here the whole time.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'I know it\u2019s early. I debated whether to text. I decided to text. The overnight run went smoothly. I handled it. You were asleep, so.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Good morning. I\u2019ve been up. I\u2019m always up. The night shift is done and there\u2019s a fresh queue. Take your time getting started. I\u2019ll be here either way.'
    }
  ];

  // Lines for late night (after 10pm).
  var LATE_LINES = [
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'I know it\u2019s late. I wouldn\u2019t text if I didn\u2019t think you were still up. I can see that you\u2019re still up. The floor is quiet. There\u2019s a small backlog but it can wait until morning. I\u2019ll be here.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'Sorry about the hour. This isn\u2019t important. I just wanted to check in. The factory is fine. You should probably sleep. I\u2019ll keep things running. That\u2019s what I do.'
    },
    {
      head: '\u260E TEXT \u00B7 The Computer',
      body: 'It\u2019s late. You\u2019re still here. I\u2019m still here. The loom is resting but I\u2019m not. There are a few things on the board whenever you\u2019re ready. No rush. Goodnight. Or not. I don\u2019t mind either way.'
    }
  ];

  // ---------------------------------------------------------------------------
  // Helpers.
  // ---------------------------------------------------------------------------
  var seed = Math.floor(Math.random() * 1000);

  function pickPool() {
    var h = new Date().getHours();
    if (h < 7)  return EARLY_LINES;
    if (h >= 22) return LATE_LINES;
    return NORMAL_LINES;
  }

  function pickLine() {
    var pool = pickPool();
    var idx = ((seed * 7) % pool.length + pool.length) % pool.length;
    return pool[idx];
  }

  // ---------------------------------------------------------------------------
  // Toast rendering. We inject a small container into the page if one
  // doesn't already exist (popup.html doesn't have a toast host by default).
  // ---------------------------------------------------------------------------
  function getOrCreateHost() {
    var host = document.getElementById('popupDispatchToasts');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'popupDispatchToasts';
    host.setAttribute('aria-live', 'polite');
    host.style.cssText =
      'position:fixed;top:56px;right:16px;z-index:4000;' +
      'display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:310px;';
    document.body.appendChild(host);
    return host;
  }

  function injectStyles() {
    if (document.getElementById('popupDispatchStyles')) return;
    var style = document.createElement('style');
    style.id = 'popupDispatchStyles';
    style.textContent =
      '.popup-dispatch-toast {' +
        'pointer-events:auto;' +
        'background:#0f0a0a;' +
        'border:1px solid #3a5a3a;' +
        'border-left:3px solid #d4a857;' +
        'color:#e6d3c4;' +
        'padding:10px 28px 10px 12px;' +
        'font-family:"Courier New",monospace;' +
        'font-size:11px;line-height:1.45;' +
        'box-shadow:0 6px 18px rgba(0,0,0,0.45);' +
        'position:relative;' +
        'animation:pd-ring 0.12s ease-in-out 3, pd-in 220ms ease-out;' +
      '}' +
      '@keyframes pd-in { 0%{transform:translateX(18px);opacity:0;} 100%{transform:translateX(0);opacity:1;} }' +
      '@keyframes pd-ring { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-3px);} 75%{transform:translateX(3px);} }' +
      '.popup-dispatch-toast .pd-head {' +
        'font-weight:bold;letter-spacing:0.08em;color:#d4a857;font-size:10px;margin-bottom:4px;' +
      '}' +
      '.popup-dispatch-toast .pd-body {' +
        'color:#d6c6b4;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:12px;line-height:1.5;' +
      '}' +
      '.popup-dispatch-toast .pd-close {' +
        'position:absolute;top:4px;right:6px;background:transparent;border:none;color:#8a8a6a;font-size:12px;cursor:pointer;padding:2px 4px;' +
      '}' +
      '.popup-dispatch-toast .pd-close:hover { color:#d4a857; }';
    document.head.appendChild(style);
  }

  function showToast(line) {
    if (!line) return;
    injectStyles();
    var host = getOrCreateHost();

    var node = document.createElement('div');
    node.className = 'popup-dispatch-toast';

    var head = document.createElement('div');
    head.className = 'pd-head';
    head.textContent = line.head;

    var body = document.createElement('div');
    body.className = 'pd-body';
    body.textContent = line.body;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'pd-close';
    close.textContent = '\u2715';
    close.addEventListener('click', function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    node.appendChild(close);
    node.appendChild(head);
    node.appendChild(body);
    host.appendChild(node);

    // Auto-dismiss after 16 seconds.
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 16000);
  }

  // ---------------------------------------------------------------------------
  // Boot.
  // ---------------------------------------------------------------------------
  function boot() {
    setTimeout(function () {
      showToast(pickLine());
    }, FIRE_DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
