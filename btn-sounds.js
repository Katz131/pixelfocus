// btn-sounds.js — Global hover/click sounds for ALL buttons
// v3.23.182: One file, included everywhere. Catches <button>, <a>, and cursor:pointer elements.
(function() {
  var _ctx = null;
  // v3.23.509: Respect global mute flag from chrome.storage
  var _pfMuted = false;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('pixelFocusState', function(d) {
        _pfMuted = !!(d.pixelFocusState && d.pixelFocusState.phaseTtsMuted);
      });
      chrome.storage.onChanged.addListener(function(changes) {
        if (changes.pixelFocusState && changes.pixelFocusState.newValue) {
          _pfMuted = !!changes.pixelFocusState.newValue.phaseTtsMuted;
        }
      });
    }
  } catch(_) {}
  function blip(freq, ms, vol) {
    try {
      if (_pfMuted) return; // v3.23.509: skip when muted
      if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (_ctx.state === 'suspended') _ctx.resume();
      var o = _ctx.createOscillator(), g = _ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol || 0.04;
      o.connect(g); g.connect(_ctx.destination);
      o.start(); o.stop(_ctx.currentTime + ms / 1000);
    } catch(_) {}
  }
  function isBtn(el) {
    if (!el) return false;
    if (el.tagName === 'BUTTON') return true;
    if (el.tagName === 'A' && el.href) return true;
    var cs = el.style && el.style.cursor;
    if (cs === 'pointer') return true;
    if (el.classList && (el.classList.contains('btn') || el.classList.contains('btn-game'))) return true;
    try { if (window.getComputedStyle(el).cursor === 'pointer') return true; } catch(_) {}
    return false;
  }
  // v3.23.484: Global hover brightness shift for all buttons
  document.addEventListener('mouseover', function(e) {
    if (isBtn(e.target)) {
      blip(660, 18, 0.025);
      // Apply brightness boost unless element already has a custom hover handler
      if (!e.target.getAttribute('data-no-hover-bright')) {
        e.target._pfOrigFilter = e.target.style.filter || '';
        var cur = e.target._pfOrigFilter;
        // Don't stack — only add if no brightness already set
        if (cur.indexOf('brightness') === -1) {
          e.target.style.filter = cur ? cur + ' brightness(1.3)' : 'brightness(1.3)';
        }
      }
    }
  });
  document.addEventListener('mouseout', function(e) {
    if (isBtn(e.target) && e.target._pfOrigFilter !== undefined) {
      e.target.style.filter = e.target._pfOrigFilter;
      delete e.target._pfOrigFilter;
    }
  });
  document.addEventListener('click', function(e) {
    var t = e.target;
    while (t && t !== document.body) {
      if (isBtn(t)) { blip(880, 35, 0.04); return; }
      t = t.parentElement;
    }
  }, true);
})();
