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
        dash:{val:'U',dot:{val:'F'},dash:{val:null,dash:{val:'2'}}}},
      dash:{val:'A',
        dot:{val:'R',dot:{val:'L'}},
        dash:{val:'W',dot:{val:'P'},dash:{val:'J',dash:{val:'1'}}}}},
    dash:{val:'T',
      dot:{val:'N',
        dot:{val:'D',dot:{val:'B',dot:{val:'6'}},dash:{val:'X'}},
        dash:{val:'K',dot:{val:'C'},dash:{val:'Y'}}},
      dash:{val:'M',
        dot:{val:'G',dot:{val:'Z',dot:{val:'7'}},dash:{val:'Q'}},
        dash:{val:'O',dot:{val:null,dot:{val:'8'}},dash:{val:null,dot:{val:'9'},dash:{val:'0'}}}}}
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
      // Auto-lock letter
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
      if (_cursor && _cursor.dot) { _cursor = _cursor.dot; _path += '.'; _render(); _startGapTimer(); } else { _blip(220, 40); _startGapTimer(); }
    } else {
      if (_cursor && _cursor.dash) { _cursor = _cursor.dash; _path += '-'; _render(); _startGapTimer(); } else { _blip(220, 40); _startGapTimer(); }
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
      // Undo entire current letter attempt in one click
      _path = '';
      _cursor = TREE;
    } else if (_currentWord.length > 0) {
      // Remove last locked letter and restore it as editable path
      var lastCode = _currentWord.pop();
      _path = lastCode;
      _cursor = safeNode(TREE, lastCode) || TREE;
    } else if (_morseWords.length > 0) {
      _currentWord = _morseWords.pop();
      var lastCode2 = _currentWord.pop();
      if (lastCode2) { _path = lastCode2; _cursor = safeNode(TREE, lastCode2) || TREE; }
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

    if (_sendFn) {
      _sendFn(_targetId, {
        type: 'morse_message',
        fromId: _profileId,
        fromName: '',
        morseText: morseStr,
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
      '<button id="morseCloseBtn" style="background:rgba(0,255,136,0.15);border:1px solid #00ff88;color:#00ff88;font-family:\'Press Start 2P\',monospace;font-size:9px;padding:10px 20px;border-radius:6px;cursor:pointer;">CLOSE</button>' +
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
      var letter = n.node.val || '';
      var isNull = !letter && n.p !== '';
      var isCur = n.p === _path;
      var onP = _path.indexOf(n.p) === 0;
      var isNum = /[0-9]/.test(letter);
      var r = isNull ? 4 : (isCur ? 14 : (n.p.length <= 1 ? 12 : (n.p.length <= 2 ? 11 : (n.p.length <= 3 ? 10 : (isNum ? 8 : 9)))));
      var fill = isNull ? '#111' : (isCur ? '#00ff88' : (onP ? '#0a3a0a' : '#0c120c'));
      var stroke = isNull ? (onP ? '#00cc66' : '#1a3a1a') : (isCur ? '#00ff88' : (onP ? '#00cc66' : '#1a3a1a'));
      var tc = isCur ? '#060a06' : (letter ? (isNum ? '#888' : '#00ff88') : '#1a3a1a');
      var fs = isCur ? 12 : (n.p.length <= 1 ? 11 : (n.p.length <= 2 ? 10 : (n.p.length <= 3 ? 9 : (isNum ? 7 : 8))));

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
      if (i > 0) { cm += ' / '; ct += ' '; }
      cm += w.join(' ');
      ct += w.map(function(c) { return DECODE_MAP[c] || '?'; }).join('');
    });
    if (_currentWord.length > 0) {
      if (_morseWords.length > 0) { cm += ' / '; ct += ' '; }
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
      '.morse-bar-dah{background:#ffa500 !important;}'
    ].join('');
    document.head.appendChild(styles);

    var html = '';
    // Header
    html += '<div style="width:100%;max-width:680px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
    html += '<button id="morseBackBtn" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;padding:4px 8px;">←</button>';
    html += '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#00ff88;">MORSE TO ' + _escHtml(friendName).toUpperCase() + '</div>';
    html += '<div style="width:30px;"></div>';
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
    html += '<button id="morseBtBtn" style="flex:1;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:8px 12px;border-radius:6px;cursor:pointer;border:1px solid #5aadff;background:rgba(90,173,255,0.08);color:#5aadff;">▮ BT BREAK</button>';
    html += '<button id="morseDelBtn" style="flex:1;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:8px 12px;border-radius:6px;cursor:pointer;border:1px solid #ff4444;background:rgba(255,68,68,0.06);color:#ff4444;">⌫ UNDO</button>';
    html += '<button id="morseArBtn" style="flex:2;font-family:\'Press Start 2P\',monospace;font-size:7px;padding:8px 12px;border-radius:6px;cursor:pointer;border:2px solid #00ff88;background:linear-gradient(135deg,rgba(0,255,136,0.1),rgba(78,205,196,0.06));color:#00ff88;">·—· AR TRANSMIT</button>';
    html += '</div>';

    // Message display
    html += '<div style="width:100%;max-width:680px;background:#0a0f0a;border:1px solid #1a3a1a;border-radius:8px;padding:8px 10px;margin-bottom:6px;min-height:44px;">';
    html += '<div style="font-size:7px;color:#555;margin-bottom:3px;">MESSAGE:</div>';
    html += '<div id="morseMm" style="font-size:13px;color:#ffd700;letter-spacing:2px;word-break:break-all;margin-bottom:2px;min-height:16px;"></div>';
    html += '<div id="morseMt" style="font-size:9px;color:#292929;font-style:italic;">Key your message...</div>';
    html += '</div>';

    html += '<div style="text-align:center;font-size:7px;color:#292929;">SPACEBAR = key · pause 1s = letter locks · pause 2s = word gap · TAB = BT break · ENTER = AR transmit</div>';

    _overlay.innerHTML = html;
    document.body.appendChild(_overlay);

    // Wire key
    var key = document.getElementById('morseKey');
    if (key) {
      key.addEventListener('mousedown', function(e) { e.preventDefault(); _onDown(); });
      key.addEventListener('mouseup', function(e) { e.preventDefault(); _onUp(); });
      key.addEventListener('mouseleave', function() { if (_keyDown) _onUp(); });
      key.addEventListener('touchstart', function(e) { e.preventDefault(); _onDown(); }, {passive:false});
      key.addEventListener('touchend', function(e) { e.preventDefault(); _onUp(); }, {passive:false});
      key.addEventListener('touchcancel', function() { if (_keyDown) _onUp(); });
    }

    // Wire buttons
    var backBtn = document.getElementById('morseBackBtn');
    if (backBtn) backBtn.onclick = close;
    var btBtn = document.getElementById('morseBtBtn');
    if (btBtn) btBtn.onclick = _doBT;
    var delBtn = document.getElementById('morseDelBtn');
    if (delBtn) delBtn.onclick = _doBk;
    var arBtn = document.getElementById('morseArBtn');
    if (arBtn) arBtn.onclick = _doAR;

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
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0a1a0a;border:2px solid #00ff88;border-radius:12px;padding:20px 28px;max-width:500px;width:90%;text-align:center;';
    box.innerHTML = '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#00ff88;margin-bottom:12px;">INCOMING MORSE FROM ' + _escHtml(fromName).toUpperCase() + '</div>';
    box.innerHTML += '<div style="font-size:14px;color:#ffd700;letter-spacing:3px;margin-bottom:12px;word-break:break-all;">' + _escHtml(morseText) + '</div>';
    box.innerHTML += '<div id="morseDecodeOut" style="font-family:\'Press Start 2P\',monospace;font-size:16px;color:#00ff88;min-height:24px;letter-spacing:2px;"></div>';
    box.innerHTML += '<button id="morseIncClose" style="margin-top:16px;font-family:\'Press Start 2P\',monospace;font-size:8px;padding:8px 20px;border-radius:6px;cursor:pointer;border:1px solid #00ff88;background:rgba(0,255,136,0.08);color:#00ff88;">DISMISS</button>';
    ov.appendChild(box);
    document.body.appendChild(ov);

    // Typewriter decode animation
    var out = document.getElementById('morseDecodeOut');
    var idx = 0;
    function typeChar() {
      if (idx < decoded.length) {
        if (out) out.textContent += decoded[idx];
        idx++;
        setTimeout(typeChar, 80);
      }
    }
    setTimeout(typeChar, 600);

    document.getElementById('morseIncClose').onclick = function() { ov.remove(); };
    ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
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
