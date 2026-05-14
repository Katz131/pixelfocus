/**
 * morse-messenger.js — Todo of the Loom morse code messaging
 * ===========================================================
 * Authentic telegraph-key input. One key — tap for dit, hold for
 * dah. Letter auto-locks after 600ms pause, word gap after 1400ms.
 * Uses real telegraph prosigns: BT (break) for word gap, AR for
 * end-of-message / transmit.
 *
 * Renders a full morse code binary tree (left=dot, right=dash)
 * matching the standard International Morse Code tree layout.
 *
 * Public API:
 *   MorseMessenger.open(friendId, friendName, profileId, sendFn)
 *   MorseMessenger.showIncoming(fromName, morseText)
 *   MorseMessenger.encode(text) / MorseMessenger.decode(morseStr)
 */
var MorseMessenger = (function() {
  'use strict';

  // ===== Binary tree =====
  var TREE = {val:null,
    dot:{val:'E',
      dot:{val:'I',
        dot:{val:'S',dot:{val:'H',dot:{val:'5'},dash:{val:'4'}},dash:{val:'V',dot:{val:'3'}}},
        dash:{val:'U',dot:{val:'F'},dash:{val:' ',dash:{val:'2'}}}},
      dash:{val:'A',
        dot:{val:'R',dot:{val:'L'},dash:{val:'⏎'}},
        dash:{val:'W',dot:{val:'P'},dash:{val:'J',dash:{val:'1'}}}}},
    dash:{val:'T',
      dot:{val:'N',
        dot:{val:'D',dot:{val:'B',dot:{val:'6'}},dash:{val:'X'}},
        dash:{val:'K',dot:{val:'C'},dash:{val:'Y'}}},
      dash:{val:'M',
        dot:{val:'G',dot:{val:'Z',dot:{val:'7'}},dash:{val:'Q'}},
        dash:{val:'O',dot:{val:null,dot:{val:'8'}},dash:{val:'⌫',dot:{val:'9'},dash:{val:'0'}}}}}
  };

  var MORSE_MAP = {
    'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---',
    'K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-',
    'U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..','0':'-----','1':'.----','2':'..---',
    '3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'
  };
  var DECODE_MAP = {};
  Object.keys(MORSE_MAP).forEach(function(k) { DECODE_MAP[MORSE_MAP[k]] = k; });

  // ===== Timing constants =====
  var DAH_MS = 200;     // hold threshold for dah
  var LETTER_MS = 1000;  // pause to auto-lock letter
  var WORD_MS = 2000;   // pause to auto-insert word gap

  // ===== State =====
  var _overlay = null;
  var _cursor = null;
  var _path = '';
  var _morseWords = [];
  var _currentWord = [];
  var _sendFn = null;
  var _targetId = '';
  var _targetName = '';
  var _profileId = '';
  var _keyDown = false;
  var _keyStart = 0;
  var _audioCtx = null;
  var _osc = null;
  var _gain = null;
  var _barAF = null;
  var _gapTimer = null;
  var _gapAF = null;
  var _lastUp = 0;
  var _keyHandler = null;
  var _keyUpHandler = null;

  // ===== Helpers =====
  function safeNode(tree, pathStr) {
    var n = tree;
    for (var i = 0; i < pathStr.length; i++) {
      if (!n) return null;
      n = pathStr[i] === '.' ? (n.dot || null) : (n.dash || null);
    }
    return n;
  }

  function _escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  // ===== Audio =====
  function _startTone() {
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      _osc = _audioCtx.createOscillator();
      _gain = _audioCtx.createGain();
      _osc.type = 'sine';
      _osc.frequency.value = 660;
      _gain.gain.value = 0.1;
      _osc.connect(_gain);
      _gain.connect(_audioCtx.destination);
      _osc.start();
    } catch(_) {}
  }

  function _stopTone() {
    try {
      if (_osc) { _osc.stop(); _osc.disconnect(); _osc = null; }
      if (_gain) { _gain.disconnect(); _gain = null; }
    } catch(_) {}
  }

  function _blip(freq, ms) {
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      var o = _audioCtx.createOscillator(), g = _audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.06;
      o.connect(g); g.connect(_audioCtx.destination);
      o.start(); o.stop(_audioCtx.currentTime + ms / 1000);
    } catch(_) {}
  }

  // ===== Gap timer (auto letter-lock / word-gap) =====
  function _clearGapTimer() {
    if (_gapTimer) { clearTimeout(_gapTimer); _gapTimer = null; }
    if (_gapAF) { cancelAnimationFrame(_gapAF); _gapAF = null; }
    var tf = document.getElementById('morseTf');
    var tl = document.getElementById('morseTl');
    if (tf) { tf.style.width = '0%'; tf.style.background = '#333'; }
    if (tl) tl.textContent = '';
  }

  function _startGapTimer() {
    _clearGapTimer();
    if (_path.length === 0) return;
    _lastUp = Date.now();

    function animGap() {
      var el = Date.now() - _lastUp;
      var tf = document.getElementById('morseTf');
      var tl = document.getElementById('morseTl');
      if (!tf || !tl) return;
      if (el < LETTER_MS) {
        tf.style.width = (el / LETTER_MS * 100) + '%';
        tf.style.background = '#00ff88';
        tl.textContent = 'letter...';
      } else if (el < WORD_MS) {
        tf.style.width = ((el - LETTER_MS) / (WORD_MS - LETTER_MS) * 100) + '%';
        tf.style.background = '#ffa500';
        tl.textContent = 'word gap...';
      }
      if (el < WORD_MS) _gapAF = requestAnimationFrame(animGap);
    }
    _gapAF = requestAnimationFrame(animGap);

    _gapTimer = setTimeout(function() {
      // If user is mid-press, don't auto-lock — they're still keying
      if (_keyDown) { _startGapTimer(); return; }
      // Auto-lock letter (prosigns already fired instantly in _onUp)
      if (_cursor && _cursor.val && _path.length > 0) {
        _currentWord.push(_path);
        _blip(880, 60);
        _cursor = TREE;
        _path = '';
        _render();

        // Then wait for word gap
        _gapTimer = setTimeout(function() {
          if (_currentWord.length > 0) {
            _morseWords.push(_currentWord.slice());
            _currentWord = [];
            _blip(440, 80);
            _render();
            _clearGapTimer();
          }
        }, WORD_MS - LETTER_MS);
      } else {
        _clearGapTimer();
      }
    }, LETTER_MS);
  }

  // ===== Key press handling =====
  function _onDown() {
    if (_keyDown) return;
    _keyDown = true;
    _keyStart = Date.now();
    _clearGapTimer();

    var tk = document.getElementById('morseKey');
    var kb = document.getElementById('morseKbar');
    var ks = document.getElementById('morseKsym');
    var ksu = document.getElementById('morseKsub');
    if (tk) tk.classList.add('morse-key-dit');
    if (kb) { kb.style.width = '0%'; kb.className = 'morse-key-bar morse-bar-dit'; }
    if (ks) { ks.textContent = '·'; ks.style.color = '#00ff88'; ks.style.fontSize = '36px'; }
    if (ksu) { ksu.textContent = 'DIT'; ksu.style.color = '#00ff88'; }

    _startTone();

    if (_barAF) cancelAnimationFrame(_barAF);
    (function anim() {
      if (!_keyDown) return;
      var el = Date.now() - _keyStart;
      var pct = Math.min(el / DAH_MS * 100, 100);
      if (kb) kb.style.width = pct + '%';
      if (el >= DAH_MS) {
        if (tk) { tk.classList.remove('morse-key-dit'); tk.classList.add('morse-key-dah'); }
        if (kb) kb.className = 'morse-key-bar morse-bar-dah';
        if (ks) { ks.textContent = '—'; ks.style.color = '#ffa500'; }
        if (ksu) { ksu.textContent = 'DAH'; ksu.style.color = '#ffa500'; }
        if (_osc) _osc.frequency.value = 550;
      }
      _barAF = requestAnimationFrame(anim);
    })();
  }

  function _onUp() {
    if (!_keyDown) return;
    _keyDown = false;
    if (_barAF) { cancelAnimationFrame(_barAF); _barAF = null; }
    _stopTone();

    var el = Date.now() - _keyStart;
    var tk = document.getElementById('morseKey');
    var kb = document.getElementById('morseKbar');
    var ks = document.getElementById('morseKsym');
    var ksu = document.getElementById('morseKsub');
    if (tk) tk.classList.remove('morse-key-dit', 'morse-key-dah');
    if (kb) { kb.style.width = '0%'; kb.className = 'morse-key-bar'; }
    if (ks) { ks.textContent = '▩'; ks.style.color = '#222'; ks.style.fontSize = '28px'; }
    if (ksu) { ksu.textContent = 'HOLD TO KEY'; ksu.style.color = '#3a6a3a'; }

    if (el < DAH_MS) {
      if (_cursor && _cursor.dot) { _cursor = _cursor.dot; _path += '.'; } else { _blip(220, 40); _render(); _startGapTimer(); return; }
    } else {
      if (_cursor && _cursor.dash) { _cursor = _cursor.dash; _path += '-'; } else { _blip(220, 40); _render(); _startGapTimer(); return; }
    }

    // Prosigns fire INSTANTLY — no waiting for gap timer
    if (_cursor.val === ' ') {
      if (_currentWord.length > 0) { _morseWords.push(_currentWord.slice()); _currentWord = []; }
      _blip(440, 80);
      _cursor = TREE; _path = ''; _render(); _clearGapTimer();
    } else if (_cursor.val === '⌫') {
      if (_currentWord.length > 0) { _currentWord.pop(); }
      else if (_morseWords.length > 0) { _currentWord = _morseWords.pop(); if (_currentWord.length > 0) _currentWord.pop(); }
      _blip(330, 60);
      _cursor = TREE; _path = ''; _render(); _clearGapTimer();
    } else if (_cursor.val === '⏎') {
      _cursor = TREE; _path = ''; _clearGapTimer();
      var sendBtn = document.getElementById('morseSendBtn');
      if (sendBtn) sendBtn.click();
    } else {
      _render(); _startGapTimer();
    }
  }

  // ===== Actions =====
  function _doBT() {
    _clearGapTimer();
    if (_path.length > 0 && _cursor && _cursor.val) { _currentWord.push(_path); _cursor = TREE; _path = ''; }
    if (_currentWord.length > 0) { _morseWords.push(_currentWord.slice()); _currentWord = []; _blip(440, 80); }
    _cursor = TREE; _path = '';
    _render();
  }

  function _doBk() {
    _clearGapTimer();
    if (_path.length > 0) {
      // Undo current in-progress letter attempt
      _path = '';
      _cursor = TREE;
    } else if (_currentWord.length > 0) {
      // Delete last locked letter outright (single click = gone)
      _currentWord.pop();
    } else if (_morseWords.length > 0) {
      // Pull back last completed word, drop its last letter
      _currentWord = _morseWords.pop();
      if (_currentWord.length > 0) _currentWord.pop();
      // If that emptied the word, leave _currentWord as empty array
    }
    _render();
  }

  function _doAR() {
    _clearGapTimer();
    if (_path.length > 0 && _cursor && _cursor.val) { _currentWord.push(_path); _cursor = TREE; _path = ''; }
    if (_currentWord.length > 0) { _morseWords.push(_currentWord.slice()); _currentWord = []; }
    if (_morseWords.length === 0) return;

    var morseStr = _morseWords.map(function(w) { return w.join(' '); }).join(' / ');
    var decoded = decode(morseStr);

    // v3.23.240: Detect famous morse code messages for badge tracking
    var _famousMessages = {
      'SOS': 'sos',
      'HELLO': 'hello',
      'CQD': 'cqd',
      'WHAT HATH GOD WROUGHT': 'whgw',
      'COME HERE I WANT TO SEE YOU': 'watson',
      'THE ENEMY IS IN SIGHT': 'togo',
      'A SMALL STEP FOR MAN': 'moon',
      'WHAT IS THE ANSWER': 'stein',
      'STOP': 'stop'
    };
    var _decodedUp = decoded.toUpperCase().trim();
    var _famousId = _famousMessages[_decodedUp] || null;

    if (_sendFn) {
      _sendFn(_targetId, {
        type: 'morse_message',
        fromId: _profileId,
        fromName: '',
        morseText: morseStr,
        famousId: _famousId,
        createdAt: new Date().toISOString()
      });
    }

    _morseWords = [];
    _currentWord = [];
    _cursor = TREE;
    _path = '';
    _blip(1000, 150);
    _showSentConfirmation(morseStr, decoded);
  }

  function _showSentConfirmation(morse, decoded) {
    if (!_overlay) return;
    _overlay.innerHTML = '<div style="text-align:center;margin-top:40px;">' +
      '<div style="font-family:\'Press Start 2P\',monospace;font-size:10px;color:#00ff88;margin-bottom:20px;">MESSAGE TRANSMITTED</div>' +
      '<div style="font-family:monospace;font-size:16px;color:#ffd700;margin-bottom:12px;letter-spacing:4px;">' + _escHtml(morse) + '</div>' +
      '<div style="font-family:monospace;font-size:11px;color:#666;margin-bottom:6px;">decodes to:</div>' +
      '<div style="font-family:\'Press Start 2P\',monospace;font-size:12px;color:#00ff88;margin-bottom:30px;">' + _escHtml(decoded) + '</div>' +
      '<div style="font-size:10px;color:#4ecdc4;margin-bottom:20px;">Sent to ' + _escHtml(_targetName) + '</div>' +
      '<button id="morseCloseBtn" style="font-family:\'Press Start 2P\',monospace;font-size:9px;padding:10px 20px;border-radius:8px;cursor:pointer;border:2px solid #00ff88;border-bottom:4px solid #00aa55;background:linear-gradient(180deg,#0a2a1a,#05150d);color:#00ff88;box-shadow:0 4px 0 #030a06,0 6px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(0,255,136,0.15);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);">CLOSE</button>' +
      '</div>';
    var closeBtn = document.getElementById('morseCloseBtn');
    if (closeBtn) closeBtn.onclick = close;
  }

  // ===== Tree SVG =====
  function _drawTree() {
    var el = document.getElementById('morseTreeSvg');
    if (!el) return;
    var W = 680, H = 300;
    var svg = '<rect width="' + W + '" height="' + H + '" rx="10" fill="#060a06"/>';
    svg += '<text x="' + (W/2) + '" y="18" text-anchor="middle" fill="#00ff88" font-family="\'Press Start 2P\',monospace" font-size="9">MORSE CODE TREE</text>';
    svg += '<text x="190" y="28" text-anchor="middle" fill="#00ff88" font-family="monospace" font-size="10">← dit (tap)</text>';
    svg += '<text x="490" y="28" text-anchor="middle" fill="#ffa500" font-family="monospace" font-size="10">dah (hold) →</text>';

    var levels = [
      [{x:W/2,y:42,p:''}],
      [{x:W/4,y:82,p:'.'},{x:3*W/4,y:82,p:'-'}],
      [{x:W/8,y:122,p:'..'},{x:3*W/8,y:122,p:'.-'},{x:5*W/8,y:122,p:'-.'},{x:7*W/8,y:122,p:'--'}],
      [{x:W/16,y:168,p:'...'},{x:3*W/16,y:168,p:'..-'},{x:5*W/16,y:168,p:'.-.'},{x:7*W/16,y:168,p:'.--'},
       {x:9*W/16,y:168,p:'-..'},{x:11*W/16,y:168,p:'-.-'},{x:13*W/16,y:168,p:'--.'},{x:15*W/16,y:168,p:'---'}],
      [{x:W/32+2,y:216,p:'....'},{x:3*W/32,y:216,p:'...-'},{x:5*W/32,y:216,p:'..-.'},{x:7*W/32,y:216,p:'..--'},
       {x:9*W/32,y:216,p:'.-..'},{x:11*W/32,y:216,p:'.-.-'},{x:13*W/32,y:216,p:'.--.'},{x:15*W/32,y:216,p:'.---'},
       {x:17*W/32,y:216,p:'-...'},{x:19*W/32,y:216,p:'-..-'},{x:21*W/32,y:216,p:'-.-.'},{x:23*W/32,y:216,p:'-.--'},
       {x:25*W/32,y:216,p:'--..'},  {x:27*W/32,y:216,p:'--.-'},
       {x:29*W/32,y:216,p:'---.'},{x:31*W/32-2,y:216,p:'----'}],
      [{x:W/32-4,y:262,p:'.....'},{x:2*W/32+2,y:262,p:'....-'},
       {x:3*W/32-2,y:262,p:'...-.'},{x:5*W/32+2,y:262,p:'..--.'},
       {x:7*W/32-4,y:262,p:'..--.'},{x:7*W/32+12,y:262,p:'..---'},
       {x:9*W/32-2,y:262,p:'.-...'},{x:11*W/32-6,y:262,p:'.-.-.'},{x:13*W/32-2,y:262,p:'.--..'},
       {x:15*W/32-2,y:262,p:'.---.'},{x:15*W/32+14,y:262,p:'.----'},
       {x:17*W/32,y:262,p:'-....'},{x:19*W/32-4,y:262,p:'-..-.'},{x:21*W/32-4,y:262,p:'-.-..'},
       {x:25*W/32-2,y:262,p:'--...'},{x:29*W/32-4,y:262,p:'---..'},{x:29*W/32+12,y:262,p:'----.'},{x:31*W/32+2,y:262,p:'-----'}]
    ];

    var allN = [];
    levels.forEach(function(lev) {
      lev.forEach(function(n) {
        var node = safeNode(TREE, n.p);
        if (node) allN.push({x:n.x, y:n.y, p:n.p, node:node});
      });
    });

    // Draw lines
    allN.forEach(function(n) {
      var dc = allN.find(function(c) { return c.p === n.p + '.'; });
      var dac = allN.find(function(c) { return c.p === n.p + '-'; });
      if (dc) {
        var on = _path.indexOf(dc.p) === 0 || dc.p === _path;
        svg += '<line x1="'+n.x+'" y1="'+(n.y+10)+'" x2="'+dc.x+'" y2="'+(dc.y-10)+'" stroke="'+(on?'#00ff88':'#1a3a1a')+'" stroke-width="'+(on?2:1)+'" opacity="'+(on?0.7:0.35)+'"/>';
      }
      if (dac) {
        var on2 = _path.indexOf(dac.p) === 0 || dac.p === _path;
        svg += '<line x1="'+n.x+'" y1="'+(n.y+10)+'" x2="'+dac.x+'" y2="'+(dac.y-10)+'" stroke="'+(on2?'#ffa500':'#1a3a1a')+'" stroke-width="'+(on2?2:1)+'" stroke-dasharray="'+(on2?'':'4 3')+'" opacity="'+(on2?0.7:0.35)+'"/>';
      }
    });

    // Draw nodes
    allN.forEach(function(n) {
      var rawVal = n.node.val || '';
      var isSpecial = rawVal === ' ' || rawVal === '⌫' || rawVal === '⏎';
      var letter = rawVal === ' ' ? 'SPC' : rawVal;
      var isNull = !rawVal && n.p !== '';
      var isCur = n.p === _path;
      var onP = _path.indexOf(n.p) === 0;
      var isNum = /[0-9]/.test(letter);
      var r = isNull ? 4 : (isCur ? 14 : (isSpecial ? 10 : (n.p.length <= 1 ? 12 : (n.p.length <= 2 ? 11 : (n.p.length <= 3 ? 10 : (isNum ? 8 : 9))))));
      var fill = isNull ? '#111' : (isCur ? '#00ff88' : (isSpecial ? '#1a1a0a' : (onP ? '#0a3a0a' : '#0c120c')));
      var stroke = isNull ? (onP ? '#00cc66' : '#1a3a1a') : (isCur ? '#00ff88' : (isSpecial ? '#ffd700' : (onP ? '#00cc66' : '#1a3a1a')));
      var tc = isCur ? '#060a06' : (isSpecial ? '#ffd700' : (letter ? (isNum ? '#888' : '#00ff88') : '#1a3a1a'));
      var fs = isCur ? 12 : (isSpecial ? 6 : (n.p.length <= 1 ? 11 : (n.p.length <= 2 ? 10 : (n.p.length <= 3 ? 9 : (isNum ? 7 : 8)))));

      if (isCur) {
        svg += '<circle cx="'+n.x+'" cy="'+n.y+'" r="'+(r+5)+'" fill="none" stroke="#00ff88" stroke-width="1" opacity="0.2"><animate attributeName="r" values="'+(r+5)+';'+(r+8)+';'+(r+5)+'" dur="1.5s" repeatCount="indefinite"/></circle>';
      }
      svg += '<circle cx="'+n.x+'" cy="'+n.y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(isCur?2.5:1)+'"/>';
      if (letter) {
        svg += '<text x="'+n.x+'" y="'+(n.y+fs*0.35)+'" text-anchor="middle" fill="'+tc+'" font-family="\'Press Start 2P\',monospace" font-size="'+fs+'" font-weight="bold">'+letter+'</text>';
      } else if (n.p === '') {
        svg += '<text x="'+n.x+'" y="'+(n.y+4)+'" text-anchor="middle" fill="#00ff88" font-family="\'Press Start 2P\',monospace" font-size="7">START</text>';
      }
    });

    el.innerHTML = svg;
  }

  // ===== Render =====
  function _render() {
    if (!_overlay) return;
    var pd = document.getElementById('morsePd');
    var ld = document.getElementById('morseLd');
    if (pd) pd.textContent = _path ? _path.replace(/\./g, '·').replace(/-/g, '—') : '';
    var cl = (_cursor && _cursor.val) ? _cursor.val : '';
    if (ld) { ld.textContent = cl; ld.style.color = cl ? '#00ff88' : '#333'; }

    var cm = '', ct = '';
    _morseWords.forEach(function(w, i) {
      if (i > 0) { cm += ' / '; ct += ' / '; }
      cm += w.join(' ');
      ct += w.map(function(c) { return DECODE_MAP[c] || '?'; }).join('');
    });
    if (_currentWord.length > 0) {
      if (_morseWords.length > 0) { cm += ' / '; ct += ' / '; }
      cm += _currentWord.join(' ');
      ct += _currentWord.map(function(c) { return DECODE_MAP[c] || '?'; }).join('');
    }
    if (_path.length > 0) {
      if (cm) cm += ' ';
      cm += _path.replace(/\./g, '·').replace(/-/g, '—');
      if (cl) ct += cl;
    }

    var mm = document.getElementById('morseMm');
    var mt = document.getElementById('morseMt');
    if (mm) mm.textContent = cm;
    if (mt) {
      if (ct) { mt.textContent = '(' + ct + ')'; mt.style.color = '#336633'; mt.style.fontStyle = 'normal'; }
      else { mt.textContent = 'Key your message...'; mt.style.color = '#292929'; mt.style.fontStyle = 'italic'; }
    }

    var arBtn = document.getElementById('morseArBtn');
    var hasMsg = _morseWords.length > 0 || _currentWord.length > 0;
    if (arBtn) arBtn.style.opacity = hasMsg ? '1' : '0.2';

    _drawTree();
  }

  // ===== Build overlay =====
  function open(friendId, friendName, profileId, sendFn) {
    if (_overlay) close();
    _targetId = friendId;
    _targetName = friendName;
    _profileId = profileId;
    _sendFn = sendFn;
    _cursor = TREE;
    _path = '';
    _morseWords = [];
    _currentWord = [];

    _overlay = document.createElement('div');
    _overlay.id = 'morseOverlay';
    _overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;padding:10px;overflow-y:auto;';

    var styles = document.createElement('style');
    styles.textContent = [
      '.morse-key{width:100%;max-width:600px;height:80px;border-radius:16px;',
      'border:2px solid #4a8a4a;border-bottom:5px solid #2a5a2a;',
      'background:linear-gradient(180deg,#1a3a1a,#0d1f0d);',
      'cursor:pointer;display:flex;align-items:center;',
      'justify-content:center;flex-direction:column;gap:4px;position:relative;overflow:hidden;touch-action:none;',
      '-webkit-user-select:none;user-select:none;',
      'box-shadow:0 6px 0 #0a150a,0 8px 16px rgba(0,0,0,0.5),inset 0 1px 0 rgba(111,196,111,0.15);',
      'transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);}',
      '.morse-key:hover{border-color:#6fc46f;border-bottom-color:#3a7a3a;',
      'background:linear-gradient(180deg,#1f4a1f,#112811);',
      'box-shadow:0 6px 0 #0a150a,0 8px 20px rgba(0,255,136,0.15),inset 0 1px 0 rgba(111,196,111,0.25);',
      'transform:translateY(-1px);}',
      '.morse-key:hover #morseKsym{color:#6fc46f !important;}',
      '.morse-key:hover #morseKsub{color:#4a8a4a !important;}',
      '.morse-key:active{border-bottom-width:2px;',
      'box-shadow:0 1px 0 #0a150a,0 2px 8px rgba(0,0,0,0.5),inset 0 2px 4px rgba(0,0,0,0.3);',
      'transform:translateY(3px);}',
      '.morse-key-dit{border-color:#00ff88 !important;border-bottom-color:#00aa55 !important;',
      'background:linear-gradient(180deg,#0a2a0a,#041404) !important;',
      'box-shadow:0 6px 0 #031003,0 8px 16px rgba(0,255,136,0.2),inset 0 1px 0 rgba(0,255,136,0.2) !important;}',
      '.morse-key-dah{border-color:#ffa500 !important;border-bottom-color:#cc8400 !important;',
      'background:linear-gradient(180deg,#2a1a0a,#140a04) !important;',
      'box-shadow:0 6px 0 #0a0600,0 8px 16px rgba(255,165,0,0.2),inset 0 1px 0 rgba(255,165,0,0.2) !important;}',
      '.morse-key-bar{position:absolute;left:0;bottom:0;height:5px;background:#222;width:0%;pointer-events:none;}',
      '.morse-bar-dit{background:#00ff88 !important;}',
      '.morse-bar-dah{background:#ffa500 !important;}',
      '#morseBackBtn:hover,#morseBtBtn:hover,#morseDelBtn:hover,#morseArBtn:hover,#morseCloseBtn:hover,#morseIncClose:hover,#morseTutBtn:hover,#morseAbcBtn:hover{transform:translateY(-2px);filter:brightness(1.2);}',
      '#morseBackBtn:active,#morseBtBtn:active,#morseDelBtn:active,#morseArBtn:active,#morseCloseBtn:active,#morseIncClose:active,#morseTutBtn:active,#morseAbcBtn:active{border-bottom-width:2px;transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,0.5),0 2px 6px rgba(0,0,0,0.3),inset 0 2px 4px rgba(0,0,0,0.3) !important;}'
    ].join('');
    document.head.appendChild(styles);

    var html = '';
    // Header
    html += '<div style="width:100%;max-width:680px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
    html += '<button id="morseBackBtn" style="font-family:\'Press Start 2P\',monospace;font-size:8px;padding:8px 14px;border-radius:8px;cursor:pointer;border:2px solid #ff5a5a;border-bottom:4px solid #aa2a2a;background:linear-gradient(180deg,#3a1515,#1f0a0a);color:#ff5a5a;box-shadow:0 4px 0 #0a0505,0 6px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,90,90,0.15);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);">\u2190 BACK</button>';
    html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#00ff88;">MORSE TO ' + _escHtml(friendName).toUpperCase() + '</div>';
    html += '<button id="morseTutBtn" style="font-family:\'Press Start 2P\',monospace;font-size:7px;padding:6px 10px;border-radius:8px;cursor:pointer;border:2px solid rgba(78,205,196,0.5);border-bottom:4px solid rgba(78,205,196,0.3);background:linear-gradient(180deg,rgba(78,205,196,0.12),rgba(78,205,196,0.04));color:#4ecdc4;box-shadow:0 3px 0 rgba(78,205,196,0.15),0 4px 10px rgba(0,0,0,0.3),inset 0 1px 0 rgba(78,205,196,0.1);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);letter-spacing:1px;">&#127891; HELP</button>';
    html += '<button id="morseAbcBtn" style="font-family:\'Press Start 2P\',monospace;font-size:7px;padding:6px 16px;border-radius:8px;cursor:pointer;border:2px solid #ffd700;border-bottom:4px solid #aa8800;background:linear-gradient(180deg,#2a2010,#150d05);color:#ffd700;box-shadow:0 4px 0 #0a0800,0 6px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,215,0,0.15);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);letter-spacing:1px;">ABC REFERENCE</button>';
    html += '</div>';

    // Tree
    html += '<svg id="morseTreeSvg" viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:680px;margin-bottom:4px;"></svg>';

    // Status bar
    html += '<div style="width:100%;max-width:680px;background:#0a1a0a;border:1px solid #1a3a1a;border-radius:8px;padding:6px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    html += '<div id="morsePd" style="font-size:18px;color:#ffd700;letter-spacing:3px;min-width:60px;"></div>';
    html += '<div id="morseLd" style="font-family:\'Press Start 2P\',monospace;font-size:20px;color:#333;min-width:24px;text-align:center;"></div>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:6px;">';
    html += '<div style="width:80px;height:6px;background:#111;border-radius:3px;overflow:hidden;"><div id="morseTf" style="height:100%;width:0%;border-radius:3px;background:#333;"></div></div>';
    html += '<div id="morseTl" style="font-size:7px;color:#444;min-width:50px;text-align:right;"></div>';
    html += '</div></div>';

    // Telegraph key
    html += '<div style="display:flex;flex-direction:column;align-items:center;margin-bottom:8px;width:100%;max-width:680px;">';
    html += '<div class="morse-key" id="morseKey">';
    html += '<div id="morseKsym" style="font-family:\'Press Start 2P\',monospace;font-size:28px;color:#3a6a3a;pointer-events:none;z-index:1;">▩</div>';
    html += '<div id="morseKsub" style="font-size:9px;color:#3a6a3a;letter-spacing:2px;pointer-events:none;z-index:1;">HOLD TO KEY</div>';
    html += '<div class="morse-key-bar" id="morseKbar"></div>';
    html += '</div>';
    html += '<div style="text-align:center;margin-top:5px;font-size:8px;color:#333;">tap &lt;200ms = <span style="color:#00ff88;">dit ·</span>    hold &gt;200ms = <span style="color:#ffa500;">dah —</span></div>';
    html += '</div>';

    // Controls
    html += '<div style="display:flex;gap:8px;margin-bottom:6px;width:100%;max-width:600px;">';
    html += '<button id="morseBtBtn" style="flex:1;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:8px 12px;border-radius:8px;cursor:pointer;border:2px solid #5aadff;border-bottom:4px solid #2a6aaa;background:linear-gradient(180deg,#0a1a2a,#050d15);color:#5aadff;box-shadow:0 4px 0 #030a10,0 6px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(90,173,255,0.15);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);">\u25AE BT BREAK</button>';
    html += '<button id="morseDelBtn" style="flex:1;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:8px 12px;border-radius:8px;cursor:pointer;border:2px solid #ff4444;border-bottom:4px solid #aa1a1a;background:linear-gradient(180deg,#2a0a0a,#150505);color:#ff4444;box-shadow:0 4px 0 #0a0303,0 6px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,68,68,0.15);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);">\u232B UNDO</button>';
    html += '<button id="morseArBtn" style="flex:2;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:8px 12px;border-radius:8px;cursor:pointer;border:2px solid #00ff88;border-bottom:4px solid #00aa55;background:linear-gradient(180deg,#0a2a1a,#05150d);color:#00ff88;box-shadow:0 4px 0 #030a06,0 6px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(0,255,136,0.15);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);">\u00b7\u2014\u00b7 AR TRANSMIT</button>';
    html += '</div>';

    // Message display
    
    // Hello Morse ABC Reference card (hidden by default)
    html += '<div id="morseAbcCard" style="display:none;width:100%;max-width:680px;background:linear-gradient(135deg,#1a2a1a,#0a150a);border:2px solid #2a4a2a;border-radius:10px;padding:12px;margin-bottom:8px;">';
    // Hello Morse visual reference image (hover tooltip)
    html += '<div style="margin-bottom:8px;text-align:center;">';
    html += '<span id="morseImgHint" style="cursor:pointer;font-size:11px;background:#2a4a2a;border:1px solid #3a6a3a;border-radius:12px;padding:3px 10px;display:inline-flex;align-items:center;gap:5px;color:#ffd700;font-family:monospace;font-weight:bold;transition:all 0.15s;"><span style="font-size:14px;">&#128444;</span> Show poster</span>';
    html += '<div id="morseImgTooltip" style="display:none;margin-top:8px;background:#111;border:2px solid #ffd700;border-radius:10px;padding:6px;box-shadow:0 4px 20px rgba(0,0,0,0.8);">';
    html += '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAgEAwADAAAD//gASTEVBRFRPT0xTIHYyMi4wAP/bAIQABQUFCAUIDAcHDAwJCQkMDQwMDAwNDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQEFCAgKBwoMBwcMDQwKDA0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0N/8QBogAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoLAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+hEAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/8AAEQgEaQLHAwERAAIRAQMRAf/aAAwDAQACEQMRAD8A9Er5U84KACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAEpgGaACgAzigAoAWkAUAFAClSOoIp2CzEwewNFh2EpCFoAKACgBKYBSAKYC0gEpgFIBaACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAQ9Ka0Y1udte2UCae0gjQOIVYMAM5wvOfXrXc4rludzjHkTS1OKxXEcFjr/D9pDPblpY1c+YRlhnjA4rppxUk7nbSimmcpOAssigYAkcAegDEAVzPRtHJJWbQ2ONpTiNS5HUKCcfXFFn0FZ9AkjeHAkVkz03Aj+eKLND5Wug6A/vF/3h/OhLVCW6O18SfLa8f31/ka7qvwno1fhRJ4aGLRf+ur+nqKVP4SaXws4STh3/3m/ma4XucMtwjRpTtRWY+ign+QppN7CSb2CWN4DiRWQ/7QI/mKHFrdD5WugypJENMD0K10u0aGNmiUlkQk85JKgk9etd0aaauelGmnFaa2OIvbY2c7wnop4/3TyP0Nc0lyto4JLlbRXSNpWEafeYgD6k1EVdpEpXaR6Imj2kahDGrFRgsc5JAxk89+td/s1Y9NU4pXa1POWOCewBNec97HmNWbsPjRpTiNWcjrtBOPyBp8rGot7IJI2iOHVkP+0CP5iizQrNDKkQ9o3QZZWUepUgfmRVcrWtiuVroAjcr5gU7Om7B2/n0osybdRERpDtQFj6KCf5dKSTew0m9hZI3h/wBYrJnpuUj+YpuLW6G4tbob0qSPQEBkO1AWb0UEn8hVWfQqz6EksMkAzIjIPVlI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CgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoEJTGFIApgGKQBQAUAFABigBaAEpgGKQC0AFACUAGKYBQAUgCgBaADpQAUAJTAKQC0AJQAUCFoAKBiYoAKAFoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAE6UwEVlcblIYHupBH5jIoasA6kAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAFe6hNxDJCvBkjdB7FlIH6mqWjT8xrQ4HwJqCQxyaZIdsyyFkGfvcbXVfdWXOO4Oa66sPtLY0kuqPRa5LGQVIC0AFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAlMDF1eeRgljanbcXJI3f8APOIY82X6gHanq5HpWsFpdlGJq3g2C5VXsf8ARp4lAU5IV9owC2OVf/bGST1BrWNS3uy2LUraPYy7fxJqGhSC31mNnToJRjf/AMBb7svrglWx79NHTjJXgHKnsd7ZX0GoRia2cSIe46g9cMOqkdwa5JR5dGZ2sXKzELQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAQzTJbRtNIdqRqWY+gHX/PrxVJNuyGZOkQySb9QuBia6A2of8AllCP9XH7E/fc92b2rSTS91DNustCSK5toryMwzqJI2GCrDI/xBHYggiqUnHZjWh5heW8/gm8W5tiz2cx2sp7jqUb/aA5jfrwc989qtVjr8Rr8SPT4JkuY1miO5JFDKfUGuGS5XYxemhNUgFABQAUAFABQAUAFABQAUAFABQAUAFACUwCkAUwFpAFABQAlMCnf38OmQNc3BKxx4yQpY8nAwByck/401FydkNI5O78aRWN08boJbcRK8TREF3LAHDZOF7gg4K4966fY6LuXyHZ286XUSTxnKSKHX6MM1zNcrt2M3oTVIBQAUAFABQAUAFABQAUAFABQBHJIsKmSQhEUElmOAAOSSapK7sFjg5/FF5qTMmjwjyo+DPNhVHudxCKD2DEtjnaOldapqOsjVRXUrJqOtg/u7myuW/55I8W4+y8JuP+630q+SA7I3dG8Trey/Yr1DaXY6K2QrkdQM8hu4BzuHQmsZ07ax2Jcbao6uubYzFpAJQBia1r1vokYaT55X/1cS/eb3PZVHc9ewBNbwhzFJHJyavrc4Eha205G5UTlFYg9Dtfc5+u0CunkgtGnc0shV1/V9OXzrlIb22H3pIGU7fqU+76/MgHvR7OL0WjCy2R2+m6nBqsC3FscqeCp4ZG7qw7H6ZBHIJFcUouDsZNW0NCoEFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAcr4m8Rf2GiJEoeeXJUNnaqjqxxycngDjPrXTTpc+5ajc45PH96vDRwt+DD+TV0/V49zT2YjePb4n5I4V/Bj/NsU/YIOSx3vh3W11y3MmBHLGdsig5GTyCuedpHTPTBHNcdSHs3oZNWN+sCQoAKACgAoAKACgAoAKACgAoAKACgAoAKAEoAOlOwGBeL/AGpdCyH/AB725WW5x/G33ooPp/y1cegUHrW3wK/Vl9DezWLIFpWAXNUMyNcsV1CxmgYZJQsh9HT5lI/EY+hNaQdpIpaGF4FvGuLBoX628hUf7rDeAPYEtWlaNpX7hJa3OzrmIFpAFABQAUAFABQAUAFABQAUAFABQAlAGNf+ILDTW8u4mUOOqLl2H1Cg4+hwa3VOT1SK5X2KMXjDS5TgzGP3dGUfnjA/Gn7KfYfK+x0kUizKJI2V0YZDKQQR7EZBrNprcm1h9R5CCnsCKd1f29ipe4lSID+8wBP0HU/gDVJOWxdmaGk203iCya+03ay7mSLzdyCRk4OMAkLu+UEgZPoOa3VJ9TWNJvVnmjX1z4k0y7gkAS7tpMmOMEbkRv8AVkZJYgqy+rMF74rRJQmiWuWR5+tjM8Uk6ISsBAkA+8pbOAV+91BHTg8HmutzjHcu57doFlLp1lHbzMHKjIIBGFb5gvPOVzj9K8qo7y0MGbVZEhQAUAFABQAUAFABQAUAFACUAcL4wme7lttIibYLh90h/wBkHAz7D5nI7lR2rrpK3vmse5naNoz+Mbk20OYtOtm8uKJMLuI5LsTn5mA3yOQSAwVRW7fLZbyZorvRHe6j8KLLyCYRskQZDIzlhgcnDkq+O4+U+hzT96O9i3TlHVnlVzDK6TWVySb3Tl82CYH5nhXBZCepChlkjLHK4K9Kad1psyLnp+iX/wDadjDdHhnX5wOm9eHx9SM/jXBNWk0YNWNSsiQ4HXgDr9O9NK+gHjr6hvefXHG6VpfIs0PIQ4zvwepjTG0H+Ns8mvSUeVKK6as6Foj0Hw78Nl1GM3WpMZpX5YuzEBjyVGCGYqeGYsADwowKXNJ6RVl3LUJS1WhmeJ/BsnhIf2jpjGMRjLLnejKPvcMCSMEB0bcCvK0XaajK3kKUXF6mFpFymn6nDJbjZa6pGG8sdEfJUqP9yQYX/ZfHalNcyd+hD1R6lXnXOcKBhQAUAFABQAUAFABQByniDU59MurIo+y3llKTcAgg4AySCRgEngj1rppxUlK+/QtK51fSud6OxGwUgCgAoAKACgDxXxnM02qSqTxEqRr7AID/ADYmvWoq0TojsdlqPijQbjwuulwQ7b7y0RR5WDHKpBabzcYbPJ6ktnaRitnudF1YXWvFOgXfhqPTLaDbeqkShPKx5Uibd8vnY+bdhujFm3YYejt2G2rHO/D+YpeyxdpIc/irrg/kTXHXVkjmn0PWK885xaQBQAUAFABQAUAFABQAUAFABQAUAFABQAlMDU0e1hvLjy52KqFLAAhdxGMDceBjkn1rSKvuawSbszye/wBTvdEvLi00mMX1os8hS5Mbu0pY5YtIhCOVbKblAU7eAK63Ti3Zuxo4q9ip/wAJTrn/AD6D/vzL/wDFUeyh3J5YnpHgd212CeXWP9DkilVY1H7rchTJbEmScNxkcfjS9nDuXGEerO1Gi6Z/z8H/AL+R/wCFL2cO5fJDuB0XTCCPtB5B/wCWkf8AhTUIp3QKEO55V4g0fTfCWmPdaBetPObmHcPNilAHzcFUAODnBB6/WtpJS1Y5wj3NvT55bm3SWeMwSsoLITnB/mAeoB5GcHmvNlo7HC1bYu1ABQAUAFABQAUAFABQAUAFABQAUCPO/F/iWS2Y6fZttfA85x1GRkIp7HHLHr0AxzXdSpX96RtGPU8yx37mvQt2NxpFIZveHtVu9OuVjtFecSEbrdAWLjuVVQSrejDvwc1hUpqa8yHG57LY6jFqGpLo8If7Ud3mKylRCEXe/mE4O5RxsUHLEDOOa41SktDNU7uzOb+Ix1bwzJHGs0YtrlWMTRKUkymN6sWLYbBGGTg57EYrpVGMdWaezUXqdt4kfTfEugrFYRK07LH9nEiFJIWBXeWdl3cLuDEFt5IwDnNPnjDaxblGK0MjwpFqHhq1azNyskblmCLHxGzfeMbk7ufQjGfmABrnlWvsZe0fQs2lhBYgiBFQscsw+8xznLMeSc85J61zuTephe5JDaxW7PJEio8p3OQMFj6n1qXJt3FcnFIBaQBQAUAFABQAUAFABQAUAJQAqgsdqgsT0ABJ/IVXKxpN7HAeLLeXTdZtJZ1Me+NlG7j729B9OZAfz9K7oxajyvubWcdGS+AfEMPh2ATXWRCly8VwVGTGJkxHIR1KrIoVscgZx0rS15XLg7Sue8N4g08W5u4Z4Zo9pKlHUg8dznC++7GKc3y3T67HXKasfNF3dpeX17qERzbw2zxBx0Z5AI0A9dx3EDqVXPSoiuVKLOE7TwfA0GlQhhgvvcD/AGXckfmOa5avxGctzpKwsQSLaTXcbiFGYBGyQDgcEdenHtzWsYu6di1B72PBYZPJtoFk/wCXS8bzR6bguDj0/duM16HVvyNrH0Z4b8VWUbyaXeSpBcRys0O8hFmhlxJGyMeCQGKkZycZGc1MNFY6qcklYzviP4gtILB7dXWR3RlABHLOpXj1ABLMegwOSah+8010MKklJqx45ZQMLjSrTH7yEGZx3UO/mAH0+Rc49xVN6SM3sz17NeYc4tABQAUAFABQAUAFABQBka3pKa1atbOdjfeR8Z2uOh+h6MOuDxzWsJcsvIpPlOZs/Ec2jAWWtRyI0fyrOo3K6jpnpkgfxKeR1UGuh0+duUSuXm1R6XZabcajbx3dsu6GdFkRsgZVhkHBIIyOxrH2UhqnItf2Be/88x/30v8AjR7KQ/ZS7B/YF7/zzH/fS/40vZyH7KXYP7Avf+eY/wC+l/xo9nIPZS7B/YF7/wA8x/30v+NP2Uuweyl2OH1n4ZX2qagLtNiRSbTKCwLZTg7OcfOoAySNp556V1R5oxtY0UJJWseeeMtA/sG/aJR5aOnmBSRhWH3o0OcMehVR82DjtW0ZWWu4rOOjJvCfh+LUZJpLn544hsUKQVZ3B+YMMg+WOcD+IjPSonV5V7pDl2Op8NeF5NDnknmdZCV8tNuR8pOSzZHDHAGOQOeelc1Sp7SKXVEOVzs65DIWgAoGFABQAUAFABQAUAFABQAUAFABQAUAJQAY7VV7Bsc/ERot39nzstb1i0WOFjuDy8f+ysoy69t4YdxnZ+8rlnQZPqawu0QGKLh5BjFAFW9nFrbyzN0jjZj+AOP1xVwV2kUtzhfAVkj28tw6qwM6lMjOGRc7vqpbj35rprOzSRpI9EFcbMWFIQtAwoAKACgAoAKACgAoAKACgBrHYCfQE/kM1S3QHzrPM1zK8rfM8rs57kliTx3PXAFe0lypI7Euh1mj+Ada1va0NuYYm/5a3B8pMeoBBdv+Aoc+tO5ag2es6N8HbG2AbUp3u5B/BEDFFn65MjfXK0jRQsds13oPgmIxhrbT17ogHmv7EJulcnH8WeeppWZXuxPKJZ7XxRrj+INHmntDB5altiq8kipsLgEsFR48I6uCWwcgA1z1JuGiOWUrPQ6e8/4mE63V0BNNEu1GYD5BnJ2DGFLHliACTjngVxucn1MZSbAknrWJmAFAgpAFGwBQAtABQAUAFABQAUAFABQBJBC1xIsKYDOdo3HAyfU/59KuMeYqKu7HTLoNtZjfeyj3H3F/D+M/p9K6lTjD3mdipRjrJitrlpYApp8X/AsbF+pPLt+OKbnGOwOpGHwo4XxTanxTDsn2pInMLAY2MAeDjkqckHOTg5HIFQqut3sc7qOTuzxYy3mg3Li5jH70FJY5BmOZT1z2OT8wYchueua61aaL32DzNIbLGK6jJ5aNXjZM+zsAcf7yk/WqtLyfqUr9Td03TpvEOyFIjaaXE29lBJMjdMsxwZZCPl3Y2opOOuDnJqKs3eRDdj27S9Fa/TKFYoo8JgckAAYAUYAAGMEkCuOEOd3bCNPn1ubf2bS9M5lbznX+E/Oc/wC6vyj8a1vGGm5vaFPfcq3PiaRxst41jToC3JH0UYUfrSdTpEylVvpHY8Q8V+HZ/Me+slLrKMTxL1z13qv8QyMkDlTyMgmtKdRW5XuZp9DkItSimiW11GNp0hGyN0YJNGmfufMCrop6KwG3sRXRy9V9xpZ9CeOfT4HDWkE93OfuC4KlM9sxx5MmOykhT3zzS1S96yXkHqeieG9FmtnfUdQO68uM8H/lmpxkHHAY4AwOFUBR3rjnLpHYxb6I60VzMzYtSIWgYUAFABQAUAFABQAlP0A8g8bao13d/ZUP7q2GMDoZGALN9QMKPTBr06MbK50RVkfSHg64i/sOwAdMrawg/MOCFGQeeCO461o9Ha52xatqdL58f95f++h/jU3Xcq8RPPj/ALy/99D/ABouu4c0RfOj/vL/AN9D/Gi67hzRGvcxRjLOigdyygfqaE09EO66Ef262xnzYsZxnzFxnGcZz1xzT1vYLo4HWyk15I6lZFypUjawztAyDzz2yPpXn1H7551RpS0MtVCcKAo9AAB7nA4571k2YjqQgoAWkAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQBUvrNL+B7eT7rjgjqrA5V1PZlYAj6Y6E1adhlPSr17hGhuPlurZhHMvqcZWRfVJVww9DkdqqUbO62A1hWYgpgee+MdYM4Gj2nzyysol2898rFx3Jwz+gGDjnHZShy+/L5GsV1Z2GkaeNKtI7VcZQfMfV25Y/mcD2Arnm+aTZLd2aVYkBSAWmAUAFABQAUAFABQAUAFABQAhXcCp6EEfmMVS3QHNfDG8sdEuL+01QW9vNbHzEuJggYIpKlVkYZGRscKvJBPWvYT5kmd8GjptY+MGl2mU05JL5xkbzmKLPsWG9h7hAD2NUauVtjyrWviVresgxiUWcB/5Z2w8s495cmU/gwHtTMuZnBkk5ZiWJ5JJyT9Sck/nTI9T1zwLaGCwaZhjz5Cy9vlX5M/QkEg+mK8ytK8rIwkzta5TIKQgoGJQAUALQAUAFABQAUAFABQAUAFAACVIYEgqQQRwQRyCPoaadtgTtsK7GQ7nJYnuxJP5mndjbb3G0hBikBHLBHcJ5cyLIno6hh+oNUm1sO9jPi0TT4W3x20IYd9gP88j9Kvnl3HdmpjAwOAKzuSPV3RSiswVsbgCQDjpkA8002tENNrRDAAvSlcTd9woAKAM+60qzvDuuIIpG9WQZ/EjBP4k1anJbMq7JbWxtrIYtoo4f9xAD+eM/rScm92JtlvFSIMUgFoEFAwoAKACgAoAKACgDzvx/cOiQQoWAdnJCkjdjAUcdeTx7120UrNs1gupylr4auLu+ew3orxKGkY5IGQpx6k/Nj6g54rrcko8yNG7bHrWk6XHpFstrH8wXJZiBlmP3j7DsB2AHNeZKbbvcwbvqamB6D8qzuTcMD0H5UXC4m0elF2Fzzbx/dOPIs14RsyN/tMPlUfRck/Ug+ld9BJ6s3h3MDW9OGnNaaaxCxlUkkbH3pJX2yOe3yABV9FGepNaxle76gj2O3t47SNYIQFjjUKoHTAGB+fUnuea86TvJtmTZNUEi0gCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBKADpTAwtWR7R11OFdzQjZOg6yW5PzY9XiPzp6gMvetIvTlZSfQu3WqWtjbrdTSBYpACjdS+RkBAOWJB6D8aFBt2sFtbHC3PiS/19za6PE0adHlP3sH1b7kQP1Lnsa6owjT1kzTlS3Og8PeF49H/fykTXTdX5wmeoTPOT/E55PbA64zqc+i0SJb6LY6qsGZhUiCgYtABQAUAFABQAUAFABQAUAFACUAcV4r8MtqmLu1ANwgAZTx5gHTB6b1HAz1GBnI566VTl0ZcZWPJZI3gcxSKUdeqsCGB9wcH9K9FNPZnUncbkDk1WwHS6D4an1hg7gxWoPzOeC49IwRzn+990eucCsJ1VHRGUpWPaI41iURxjaiAKqjoFHAH4CvLbu7nOSVABQAUALQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAlABQAtABQAUAFABQAUAFABQAUAJRoBy+v+H5dYmhmgmWA2443KW+bcGDdccYHBBzXRCfIml1LT5U0XIdAt0nF7IpN3wzyKzAM+MMducBW/u9Klzb0WxNzcrIBaQgoAKAOa8R+HhrqR7XEUkROGILAqw5XAI7gEH610QqcnoVF2H/APCPR3tvFFqpF1LACqyLujyh+6CAeSABk9CRnGSaXPbWI7m3bW6WkSwRZCRjaoJJIHoSeTWTd3d7ksnqRBQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQBHI6wo0jfdRSx+igk/oKa3SQHlGgaMPEcz3VxuW0hYhIwTj5jvESE/dRQctjk5AGK9GVT2a5bamrdtj1KC3jtIxDCqxxr0VRgf/AFz7nJrgcm9zO99ywKm4gpALQAUAFABQAUAFABQAUAFABQAUAFABQAlAFW5sLe9GLiJJcdNygkfQ9f1rRScVoF2tirDoWn253R28QYdDtBx+eaPaT7juzU/pU3vuFwqRBQAtABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQBFPEJ42ibO2RWQ464YEHH4Gri+XUEZ2j6THosH2aEsy7i5LYyScDsAMYH8z3qpy59WUzVqCQpAFIBaACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBKdgCgBaQBQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAlMBaQBQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAlAF6fTp7eBLlwBHJjHPIyMjI7ZxxWnI1qaODSuUMj/Pb6+lRbyMwJC9SB9eKaT7BYz7vUktLmC0ZWLXRYKwxhdmCd3Oe/atOS6uuhSRoAg8gis3daNEi98DGcZx7UWfYAJA68Y6+319KLdkAgIxkdKVncBQQenP0oasAtIAoAKACgAoAKACgAoAKACgAoAKACgDVi0aaWNJQ0SrJ93c4UntjBHJ+ma25NEzVQurmfc28lk5inG1l68gjB6HI4walxcXYhrldiDI9Rz09/pSs+xIZHqOeByKVn2HYoy3M6XUcCQl4XUl5twAjIzgFTyc8fn7GrsrNhYvkgHGeT0Hf8utTYQuMVIBSAKACgAoAKACgAoAKACgAoAKACgAoASmlfRAba+H7sgZCByMiMuA5H0/zjv0rX2bvY19mzGdTESrjaVJDA8YI65zU23T3RnZrQYCD0IqbPsINw45HPT3+nr+FO3kOwpIAyeBStfZCszNttUjubqezAKvahCzMRtO/pt5zx3yBVOLik+47GlnHXj68VNvIQtSAUAFABQAUAFABQAUAFABQAUAFABQAUAFAF6z06W+DNGUUR43F22gZ6c1ai2XGPNsF5pk9ioeQAo3AdGDLn0yOntnr2ocWteg3Bx16FDocdz0Hr9KVn20MxNwAySAPXoPzoafRAL0OOM+n+f50rNbqwC0gCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAsWdsbudIF/jYAn0HVj+AzVxV2VFXZ18qC9a4t1eJkkVfJRXBZWjHHHb3xXXveJ3Np3jfS2h4c+lx6trlzFcNII0t4WKIxTecrgOQCcLycDqcelJtRgu9zkdkkZ0EFnqNxftrD7ZYJGWMNIUMUQU7WjUEZboQMHORx81N3suUPQluI4ryTSo1lknibzgJGBjd0GODjkZA25HJXnNEXZSvvoNDvIOi6lc2+nZRGsXlEYJYCRejKCTyOT+OKNGk33EtjGWKFbGC7iaOK6Z0IuPtLvK0hPzq8SoSM8gr0HHJzVvd22LNuDTI9T1q9W5L7YvJbYjFAX2rgt1yFOSBxyeazk+WKfUm9kU725l0J7zS4QcXu2S1xnAaU7HA7469OQRnuKpWlaRO56BptgumW0dqnIiUAn1bqx/Fif0rjlu7EMvVAgoAKACgAoAKACgAoAKACgAoAKACgDqpTF9ktPNge44baEYjacjOcA5zxjp06811r4VuddlyrQ86+Jhf7fawXUhW0uJMykfIAgUbUcjPQZOf+Bdq0633ZMtJNo5eCC0tddt4bBgYxDKWRXLojFG6Ek4LDDFc8HnvTW13vclbGdZaVBc6HPdy7mmiM7Rtub93sbICqCB8x5bPJz1GBUt2kl0F1Rft55JrzS5SS8rWUp5/ibacZ9ckD60tLS9UJmTbxWVxpUuoXUpGohnJcykSJKD8qKmRwe4x0zyMcX9pK2lh9fI9M0uSSWzhef/WtEhfPXcQM59z1Pua456SaRnIv1mSFABQAUAFABQAUAFABQAUAFABQAUAWtPdI7qJpPuK6k/nWkLXV9i4bo0b2wvHvmKq5dpMo4zjBPynd0AUe/HStZJ810ayUuZ2POfGeZdVtbTUZf9GcyeawbaryqAFVmGOAMZz0yfrVwTSb6k2aeurOdhitrfWJYrN98KWMwADF1RsAlVYk8DOcZOCSK0+ynLRgvMqw6XA3h77ed32mJC8cm9sptl2hVGcBcEk8ZJ5zRdc9ugLexpzeVqOpQw6o2IBZxSRqzFEeRlBckgrk53d+wGaS0T5dw6aFbTdNh1OfVLS3fzI2jjWJy27BUts+bqQGG0H+6OveiTtyt+ZL0sP066l8Rz2drMGxYKZLrORmRD5aA+5wM5/2qTXs4uXcbVj0muEyFoAKACgAoAKACgAoAKACgAoAKACgAoAKANvTkL2N2qgsSqYAGSefQV1Q1i7HRD4XYktYZLXT7j7QCiy7RErcZfPUA/8A1umacU0tSo3jF8x4TBFZXen3N7eykagryctKVeN1PyIiZHB6fdOfUYra7TSS0M29dCyr/wBpXFhDrDlYXtTJhmKLJLyAXPGCVAzyOccjdgy9FJx3uBpaAkEWr3Udo5lhSGNVO4uFwy5RWPVUOVU88cZOKiesU5bilojvK4zIKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgCWGeS2bfExRhxkdeapOw03HYZHI8LiSMlHHII6ii9mFyqLWJZ3ugo8+UAPJj5mA5AJp3bsmFypd6PZX7iS5gjldcYZl5wOgJ7gehzVczS0YXsWHsoJHjkZFLQZ8s4+5kYO3HTjj6VCk+oXF+xwib7SEUTbdnmY+bb1259M0+ZrToFypHolhDN9qjt4lmzneFGcnqR2B75Azmq9pLuwuW47OGKV7hEVZZseY4+82OBk+wHFS30Awp7Ce91aO5lTba2kZ8o5GXkbqcDkAcdfTPetFK0Wh3sjp81gSFABQAUAFABQAUAFABQAUAFABQAUAJQBej1K6gUJFK6KBgAHArVSa0uWpNaGXeQJqKsl2onVzlhJ82T689x2I6dqXO07oXNqVLfSLO0ZGghjjaIMEKrggP97/vruT1o55A2Sx6fbwwNaxxqsD7t0YHynf8AeyP9rvS5ncm5gLpc51WGdIkgtLGJo4iG5cMOgTquCSOeMD3rbmXK+5d9DZk0axmm+1PBE03XcVBOfU9ifcis+eVrXJuzRHFZAOoEFABQAUAFABQAUAFABQAUAFABQAUAJij0AuLqN1HH5KyyKnTAY9PT1FUpSRfM1pcybuxgv08q5RZUznDDPPr6596rma2ZN7bEEOkWdsQYYY0IQx5C4+Ruq/Qnk+tPmfcLvqSrp9stubMRqLcjBjx8uCd2MemefrUczHcZdaVaXqJHcQpKsWAgYZ2gADA9uBx0queS6hcfDY29kzzW8Kq7KAwQbd4QfKvoMdB2FPmctJBe+hj+HNPmtEmuLtQlzdytI4BB2rk7VyMjuTx6881dSXNotrIcnc6SufYgWgAoAKACgAoAKACgAoAKACgAoAKACgBKALFvdzWufJdo92M7TjOOlWny6R0KUnHYbPcS3J3TO0hHTcScfQdKbbYNtmNPotjcy/aJYInl67ioJJ9T2J9zS5mtExIzPENlcXXlNFDDexIT5kMuFYkjho3/AIfQjPpwa2jJLd28y7kegaZcQXE17cxJa+YiRRQRkEIiY6kcZyPqcknFVOUWrITfY6uuQgKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBKAFoASgBaACgBKAFoASgAx3oAWgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAExQAtABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFACYxQAtABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAJQAYoAWgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBjyLENzkIo6liFA+pOAPxNNa6IBWYKCxICgZJPQDrnPpjmnboFita39vfIJbaRJUYkAqepXggA4PHfj36U3Brcdmi3UCCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAyL7W7awuIrSQs007Kqog3EBjgMw7Anp3IycYFaqDavsNI1s9qyELQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAFHUrJNRtpLVzgSrjOM4PUHHfBAOO/StIPlfN2BaHn9trzeGGk0m/H2lYh8jIegZfuMGP3RnoTleRyMV28ntLVIaG/K5akfhCKLUbiIldpsI2Zdpxvd5WO4gdcIcY9QM8AClUTS13FI9SrzzEKACgAoAKACgAoAKACgAoAKACgAoAKAEoAWgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBKADpVAApALSAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBKAOb1/XxpQFvAvm3kvEUY5xnozDr/ur/Eevy5rohTu7y0RSXXocXZ3D+F76SfVkMs00XmJIOSXPVQ3RSfuOcfJjjK11tKatDbqa+h3egz311bme/VYzI26JFBBWMjgNn36Z5x161wzSTsjF+Ru1kIWgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAazrEC8hCovLEnAA9yeBVJXdhpHlnhe30vUvEMi61IhtXad0Zn2xyybh5au+RhSpYjkBiAM9q9iGiSR2R7Gd4xg07TtXkXQ3zboI2BjcsqSYy6xvnLKDz1IBJGSBVON9waPWNNvotRt0uITlXAyO6sOGVvcHP16968eUeR6nHa25erMQUAFABQAUAFABQAUAFABQAUAFACUAcBrni640i/a2WJGijCE7sh2DKGJBBwvXC8HOOcV2wo86vctK5evvGtlaopgDXDuoYKuFC5HR2OcMO6gE/SpVCTK5DA/4WFNn/j1jx/10bP8A6DWiw/mPkOk0rxhZ6kdkgNrKATtcgqwAydrjAzjJ2kA8cZrOVFx9BchjQ+N5bq+jghiU28kixjOfMIJxvyPlB/i24PHBPerdDljzNi5bHo2McVxGYUgCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoASgDM1LWbTSE33ThSR8qDl2/3VH8zhfeto05S2WhSVzz+98e3EhIs4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AKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBKAFoAKACgAoAKACgAxigAxQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAPWGRkMoViinBbHAJ9T0qrPe2g7PcjqRBQAtABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAjB1rTbu+McllcvavFngfcYnHLAemMcgjBPFbwlGKtJFq3Uwj4h1LRWCaxBvjPAuIcYP1Awufb5G9jWvJGesX8i+W+x19lf2+oxia1cSIe46g+jL1U+xA9siueUHHcyasW6gApbAUdQ1O20uPzbpxGvYdWb2VRyT+g7kVpGDlpEdm9jkl1nVtdJXSoRbQf895vT2yMZ9lDkeoro5Ix+J6lpJb7nR6Lptxp0bi6uHupJGDEtnCnGCEzzg9T0HAwBWE5KT91WJk+xsdKyJFoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKADpTA3LTQ5Li3ad2EWRmMNwCBzlj/CD2P49K3VPS70N1TfLzPQpRapNBatZrt2PnnHzAMcsAc45P5dqz5tLEKTj7vQvLoMkloLmJhI5+bYvPyjqAc8uOcr+HWr9nzRujTkuuYwf0rHyOfyCgBaQBQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAlAB0oGIyq4KsAwIwQRkEe4PFUm1sPY4fUvDsunSHUNDJikHLwDlJB1O0H1GfkPH9zaevUqil7kil7250WiavHrVsJ0G11O2RM5KOBnH0PVT3HXkVjOPI7CasQ6/rS6LCCB5k8p2wx92P8AePfauRnHJJAH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h1toUsmhjTJcRzFCOoIDbyw6ZBHQEjPXNRzrm5gvqZt/aaxqVilnJBFH5LRZYSAtKI+BtGcIAPmbJJOAAOTWilFPmVx6Gxc2d5b6ol/bRpNHJCkMgLhCgDAlhn72BzgdcEelSppqzFdGfFZapowuLSzijuIbh3eORnCmMyDad6n72Bg8dx1wcCuaMrPVWHo9Qg8Oz2UmmhcSJZ+aZnBAAZ+RtB5IzxwO2aTqJpoHLcl8ZxtHBFfwsEubeUCM928wFSo9x970wD60qT3XQmJvaLp40uzitv4lXc59ZG+Zz+Zx9AKyqSu9BM1axJCgAoAKACgAoAKACgAoAKACgAoAKACgAoATFAAOKBABimAYpAGKBigUBsGKBBjFAwoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBKd7CFFIYYoEGKYBSAKBhQAUAFABQAUAFABQAUAFABQAUAFABQAUAFACYpgGKQBigQYpjCgQUhi0AFABQAUAFABQAUAFABQAUAFACYoAXFABigQYoGB4pgApAIBimAUAL0pAJincBaQGde6bBfvE84LfZ38xBkhd3qR3x2zVKbjoh3NCkIWkAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQBVvbyPT4HuZsiOJdzbRk46cDIycnHWqiruwIfbXCXUSTxZ2SKGXIwcHkZHY0NWbQWsT1IBQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUARSzJAu6RlRR3Zgo/MkCrim9ECVzEn8U6XbnBuFYjsis/8lx+ta+yn2K5WUT430odHlP0ib+uKpUZD5GKvjfSicF5R9Ymo9jJD5GXoPFGl3BAW4RSegcMn/oQA/WodOSJ5WjbjkSUboyGU9CpBH5jIrJxsSSVIBQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAc/4p/wCQVdf9cv8A2Za2p/Eio7lnQf8AkH2//XJP5VM/ifqD3Zr1mSFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQI83+IX3bYe8n/ALLXbQ3ZtT6nmlekdAUgCgApCPVPh6cWk69hOMD0/drXnV90YT3O/rjMgoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAOf8U/8gq6/wCuX/s61tS+JFR3LWhf8g+2/wCuKfypVPifqJ7s1qyEFABQAUAFABQAUAFABQAUAFABQAUAJQAtABQAUCCgYUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAJQAtABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAJQB5v8AELpbf9tP/Za7qHU2gea16BuFABQAUCPU/h7/AMetx/13H/ota82vujCe539chkLSAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAOf8U/8AIKuv+uX/ALOtbUviRUd0WdC/5B9t/wBcU/lRU+J+onuzXrEQUAFABQAU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CgAoAKACgAoAKACgAoAKACgAoEAoACKBiYoAXFABjFABigBMUwDFFwFxQAUgCgAoAKACgAoAKACgAoAKACgAoAKACgBMUAGKADFMAxQAtIAoAKACgAoAKACgAoAKACgAoAKACgAoASgQUDCgAxQAYpgGKQBQA6gBMUwDFIA6UAFABQAUAFABQAUAFABQAUAFABQACmAEUAGKADFAC4pAIRQAlABigAoAWgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBDx14/SqsAgYHoR+BB/lRYB3SpASgBaACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgCvc3MVnG007CONBlmbgD+pPYAZJPAF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AoAKACgAoAKACgAoAKACgAoAKACgAoAKAEoAWgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoASgApjCmIKm4C0AFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFACUwCgBaQBQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAJTAKLAFIBaACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgClf3sem273U33IlLYHUnso9yeBWsY8zshrXQ53wjq9xrC3D3JBKSLtAACorKflHAyAV6nnqa1qQ5LJFNWIrDxQdS1b7FCB9mCyAMR8zsg+8D2XIOB1IwT1pypqMeZ7jcbI7SuQzCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACnYAwfSnYLCYNFh2ClsIWkAUAFABQA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jHTAIwMdsdO1PmGJNaw3BDSxo7J90sqsR9CQSKV2tmL5j0hjiyUVU3Hc20AZY9ScdSe5PNTdgPpALQAUAFABQAUAFABQAUAFABQAUAFACUAPSR4wQjFQwwQCRkehx1H1p3Y722EV3QFFYhW6gEgH6jofxp3Y76WG0iSJII4s+WqpvO5toA3N6nHU+55qrtgRGygZzK0UZkYEFii7iDwcnGTkcH1HFPma6jvYy9d0+e8shY2QSNHZVf8AhCxA5YKAMc46ccdxThKzuwvrc2YIVto1hj4SNQoHsBgVLd3cGTVAgoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAEoAWgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoASgQUALQMTFAC0AFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQA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ABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFACYoAWgBOnSmAUwFpAFIAoAKACgAoAKACgAoAKACgAoAKACgAoAKAExTAQDFADqQCYoAMUAHI6UAGKAFoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/2Q==" alt="Hello Morse ABC Reference" style="max-width:100%;border-radius:6px;">';
    html += '</div></div>';
    // Hello Morse visual mnemonic section
    html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:9px;color:#ffd700;text-align:center;margin-bottom:4px;">HELLO MORSE</div>';
    html += '<div style="font-size:8px;color:#666;text-align:center;margin-bottom:10px;">Visual mnemonics \u2014 the word hints at the dot/dash pattern</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:5px;margin-bottom:12px;">';
    var _helloMorse = [
      ['A','\u00b7\u2014','Archery'],['B','\u2014\u00b7\u00b7\u00b7','Banjo'],['C','\u2014\u00b7\u2014\u00b7','Candy'],['D','\u2014\u00b7\u00b7','Dog'],
      ['E','\u00b7','Eye'],['F','\u00b7\u00b7\u2014\u00b7','Firetruck'],['G','\u2014\u2014\u00b7','Giraffe'],['H','\u00b7\u00b7\u00b7\u00b7','Hippo'],
      ['I','\u00b7\u00b7','Insect'],['J','\u00b7\u2014\u2014\u2014','Jet'],['K','\u2014\u00b7\u2014','Kite'],['L','\u00b7\u2014\u00b7\u00b7','Laboratory'],
      ['M','\u2014\u2014','Mustache'],['N','\u2014\u00b7','Net'],['O','\u2014\u2014\u2014','Orchestra'],['P','\u00b7\u2014\u2014\u00b7','Paddles'],
      ['Q','\u2014\u2014\u00b7\u2014','Quarterback'],['R','\u00b7\u2014\u00b7','Robot'],['S','\u00b7\u00b7\u00b7','Submarine'],['T','\u2014','Tape'],
      ['U','\u00b7\u00b7\u2014','Unicorn'],['V','\u00b7\u00b7\u00b7\u2014','Vacuum'],['W','\u00b7\u2014\u2014','Wand'],['X','\u2014\u00b7\u00b7\u2014','X-ray'],
      ['Y','\u2014\u00b7\u2014\u2014','Yard'],['Z','\u2014\u2014\u00b7\u00b7','Zebra']
    ];
    for (var _hi = 0; _hi < _helloMorse.length; _hi++) {
      html += '<div style="background:rgba(107,142,35,0.12);border:1px solid #3a5a2a;border-radius:6px;padding:6px 4px;text-align:center;">';
      html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:14px;color:#00ff88;margin-bottom:2px;">' + _helloMorse[_hi][0] + '</div>';
      html += '<div style="font-size:10px;color:#ffd700;letter-spacing:2px;margin-bottom:3px;">' + _helloMorse[_hi][1] + '</div>';
      html += '<div style="font-size:8px;color:#8fbc8f;">' + _helloMorse[_hi][2] + '</div>';
      html += '</div>';
    }
    html += '</div>';
    // Quick reference morse code grid
    html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#4ecdc4;text-align:center;margin-bottom:6px;">QUICK REFERENCE</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:4px;">';
    var _abcRef = [
      ['A','\u00b7\u2014'],['B','\u2014\u00b7\u00b7\u00b7'],['C','\u2014\u00b7\u2014\u00b7'],['D','\u2014\u00b7\u00b7'],['E','\u00b7'],['F','\u00b7\u00b7\u2014\u00b7'],
      ['G','\u2014\u2014\u00b7'],['H','\u00b7\u00b7\u00b7\u00b7'],['I','\u00b7\u00b7'],['J','\u00b7\u2014\u2014\u2014'],['K','\u2014\u00b7\u2014'],['L','\u00b7\u2014\u00b7\u00b7'],
      ['M','\u2014\u2014'],['N','\u2014\u00b7'],['O','\u2014\u2014\u2014'],['P','\u00b7\u2014\u2014\u00b7'],['Q','\u2014\u2014\u00b7\u2014'],['R','\u00b7\u2014\u00b7'],
      ['S','\u00b7\u00b7\u00b7'],['T','\u2014'],['U','\u00b7\u00b7\u2014'],['V','\u00b7\u00b7\u00b7\u2014'],['W','\u00b7\u2014\u2014'],['X','\u2014\u00b7\u00b7\u2014'],
      ['Y','\u2014\u00b7\u2014\u2014'],['Z','\u2014\u2014\u00b7\u00b7']
    ];
    for (var _ri = 0; _ri < _abcRef.length; _ri++) {
      html += '<div style="background:rgba(0,255,136,0.06);border:1px solid #1a3a1a;border-radius:4px;padding:4px 6px;text-align:center;">';
      html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:12px;color:#00ff88;">' + _abcRef[_ri][0] + '</div>';
      html += '<div style="font-size:11px;color:#ffd700;letter-spacing:2px;">' + _abcRef[_ri][1] + '</div>';
      html += '</div>';
    }
    html += '</div>';
    // Numbers
    html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:7px;color:#4ecdc4;text-align:center;margin:8px 0 6px;">NUMBERS</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:4px;">';
    var _numRef = [
      ['0','\u2014\u2014\u2014\u2014\u2014'],['1','\u00b7\u2014\u2014\u2014\u2014'],['2','\u00b7\u00b7\u2014\u2014\u2014'],['3','\u00b7\u00b7\u00b7\u2014\u2014'],['4','\u00b7\u00b7\u00b7\u00b7\u2014'],
      ['5','\u00b7\u00b7\u00b7\u00b7\u00b7'],['6','\u2014\u00b7\u00b7\u00b7\u00b7'],['7','\u2014\u2014\u00b7\u00b7\u00b7'],['8','\u2014\u2014\u2014\u00b7\u00b7'],['9','\u2014\u2014\u2014\u2014\u00b7']
    ];
    for (var _ni = 0; _ni < _numRef.length; _ni++) {
      html += '<div style="background:rgba(78,205,196,0.06);border:1px solid #1a3a3a;border-radius:4px;padding:4px 6px;text-align:center;">';
      html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:12px;color:#4ecdc4;">' + _numRef[_ni][0] + '</div>';
      html += '<div style="font-size:10px;color:#ffd700;letter-spacing:1px;">' + _numRef[_ni][1] + '</div>';
      html += '</div>';
    }
    html += '</div>';
    html += '<div style="text-align:center;margin-top:8px;font-size:8px;color:#555;">\u00b7 = dit (tap)  \u2014 = dah (hold)</div>';
    html += '</div>';

html += '<div style="width:100%;max-width:680px;background:#0a0f0a;border:1px solid #1a3a1a;border-radius:8px;padding:8px 10px;margin-bottom:6px;min-height:44px;">';
    html += '<div style="font-size:7px;color:#555;margin-bottom:3px;">MESSAGE:</div>';
    html += '<div id="morseMm" style="font-size:13px;color:#ffd700;letter-spacing:2px;word-break:break-all;margin-bottom:2px;min-height:16px;"></div>';
    html += '<div id="morseMt" style="font-size:9px;color:#292929;font-style:italic;">Key your message...</div>';
    html += '</div>';

    html += '<div style="text-align:center;font-size:7px;color:#292929;">SPACEBAR = key · pause 1s = letter locks · pause 2s = word gap · TAB = BT break · ENTER = AR transmit</div>';
    html += '<div style="text-align:center;font-size:8px;color:#ffd700;margin-top:4px;letter-spacing:0.5px;"><span style="color:#666;">PROSIGNS:</span> <span title="dit dit dah dah">··—— = SPACE</span>  · <span title="dah dah dah dah">———— = BACKSPACE</span>  · <span title="dit dah dit dah">·—·— = SEND</span></div>';

    _overlay.innerHTML = html;
    document.body.appendChild(_overlay);

    // Wire key
    var key = document.getElementById('morseKey');
    if (key) {
      key.addEventListener('mouseenter', function() { _blip(330, 25); });
      key.addEventListener('mousedown', function(e) { e.preventDefault(); _onDown(); });
      key.addEventListener('mouseup', function(e) { e.preventDefault(); _onUp(); });
      key.addEventListener('mouseleave', function() { if (_keyDown) _onUp(); });
      key.addEventListener('touchstart', function(e) { e.preventDefault(); _onDown(); }, {passive:false});
      key.addEventListener('touchend', function(e) { e.preventDefault(); _onUp(); }, {passive:false});
      key.addEventListener('touchcancel', function() { if (_keyDown) _onUp(); });
    }

    // Wire buttons with hover/click sounds
    function _wireBtn(id, handler) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('mouseenter', function() { _blip(660, 20); });
      btn.addEventListener('click', function() { _blip(880, 40); if (handler) handler(); });
    }
    _wireBtn('morseBackBtn', close);
    _wireBtn('morseBtBtn', _doBT);
    _wireBtn('morseDelBtn', _doBk);
    _wireBtn('morseArBtn', _doAR);
    _wireBtn('morseTutBtn', function() {
      // Close morse overlay, then open the tutorial to morse-telegraph category
      close();
      setTimeout(function() {
        if (typeof window._openTutorialTo === 'function') {
          window._openTutorialTo('morse-telegraph');
        }
      }, 100);
    });
    // ABC Reference toggle
    _wireBtn('morseAbcBtn', function() {
      var card = document.getElementById('morseAbcCard');
      if (card) card.style.display = card.style.display === 'none' ? 'block' : 'none';
    });

    // Hello Morse image hover tooltip
    var _hint = document.getElementById('morseImgHint');
    var _ttip = document.getElementById('morseImgTooltip');
    if (_hint && _ttip) {
      _hint.addEventListener('click', function(e) {
        e.stopPropagation();
        var showing = _ttip.style.display !== 'none';
        _ttip.style.display = showing ? 'none' : 'block';
        _hint.innerHTML = showing ? '<span style="font-size:14px;">&#128444;</span> Show poster' : '<span style="font-size:14px;">&#128444;</span> Hide poster';
      });
    }

    // Keyboard
    _keyHandler = function(e) {
      if (e.repeat) return;
      if (e.key === ' ') { e.preventDefault(); _onDown(); }
      else if (e.key === 'Backspace') { e.preventDefault(); _doBk(); }
      else if (e.key === 'Enter') { e.preventDefault(); _doAR(); }
      else if (e.key === 'Tab') { e.preventDefault(); _doBT(); }
      else if (e.key === 'Escape') { close(); }
    };
    _keyUpHandler = function(e) { if (e.key === ' ') _onUp(); };
    document.addEventListener('keydown', _keyHandler);
    document.addEventListener('keyup', _keyUpHandler);

    _drawTree();
    _render();
  }

  function close() {
    _clearGapTimer();
    _stopTone();
    if (_barAF) { cancelAnimationFrame(_barAF); _barAF = null; }
    if (_keyHandler) { document.removeEventListener('keydown', _keyHandler); _keyHandler = null; }
    if (_keyUpHandler) { document.removeEventListener('keyup', _keyUpHandler); _keyUpHandler = null; }
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _keyDown = false;
  }

  // ===== Incoming message display =====
  function showIncoming(fromName, morseText) {
    var decoded = decode(morseText);

    function _dismiss() {
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      document.removeEventListener('keydown', _escHandler);
    }
    function _escHandler(e) { if (e.key === 'Escape') _dismiss(); }

    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;';
    ov.addEventListener('click', function(e) { if (e.target === ov) _dismiss(); });

    var box = document.createElement('div');
    box.style.cssText = 'background:#0a1a0a;border:2px solid #00ff88;border-radius:12px;padding:20px 28px;max-width:500px;width:90%;text-align:center;';

    var header = document.createElement('div');
    header.style.cssText = "font-family:'Press Start 2P',monospace;font-size:8px;color:#00ff88;margin-bottom:12px;";
    header.textContent = 'INCOMING MORSE FROM ' + fromName.toUpperCase();
    box.appendChild(header);

    var morseDiv = document.createElement('div');
    morseDiv.style.cssText = 'font-size:14px;color:#ffd700;letter-spacing:3px;margin-bottom:12px;word-break:break-all;';
    morseDiv.textContent = morseText;
    box.appendChild(morseDiv);

    var out = document.createElement('div');
    out.style.cssText = "font-family:'Press Start 2P',monospace;font-size:16px;color:#00ff88;min-height:24px;letter-spacing:2px;";
    box.appendChild(out);

    var btn = document.createElement('button');
    btn.style.cssText = "margin-top:16px;font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 20px;border-radius:8px;cursor:pointer;border:2px solid #00ff88;border-bottom:4px solid #00aa55;background:linear-gradient(180deg,#0a2a1a,#05150d);color:#00ff88;box-shadow:0 4px 0 #030a06,0 6px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(0,255,136,0.15);transition:all 0.1s cubic-bezier(0.34,1.56,0.64,1);";
    btn.textContent = 'DISMISS';
    btn.addEventListener('click', function(e) { e.stopPropagation(); _dismiss(); });
    box.appendChild(btn);

    ov.appendChild(box);
    document.body.appendChild(ov);
    document.addEventListener('keydown', _escHandler);

    // Typewriter decode animation
    var idx = 0;
    function typeChar() {
      if (idx < decoded.length) {
        out.textContent += decoded[idx];
        idx++;
        setTimeout(typeChar, 80);
      }
    }
    setTimeout(typeChar, 600);
  }

  // ===== Encode / Decode helpers =====
  function encode(text) {
    return text.toUpperCase().split('').map(function(ch) {
      if (ch === ' ') return '/';
      return MORSE_MAP[ch] || '';
    }).filter(function(s) { return s; }).join(' ');
  }

  function decode(morseStr) {
    return morseStr.split(' / ').map(function(word) {
      return word.split(' ').map(function(code) {
        return DECODE_MAP[code] || '?';
      }).join('');
    }).join(' ');
  }

  // ===== Public API =====
  return {
    open: open,
    close: close,
    showIncoming: showIncoming,
    encode: encode,
    decode: decode
  };
})();
