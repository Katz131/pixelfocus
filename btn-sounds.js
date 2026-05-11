// btn-sounds.js — Global hover/click sounds for ALL buttons
// v3.23.182: One file, included everywhere. Catches <button>, <a>, and cursor:pointer elements.
(function() {
  var _ctx = null;
  function blip(freq, ms, vol) {
    try {
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
  document.addEventListener('mouseover', function(e) {
    if (isBtn(e.target)) blip(660, 18, 0.025);
  });
  document.addEventListener('click', function(e) {
    var t = e.target;
    while (t && t !== document.body) {
      if (isBtn(t)) { blip(880, 35, 0.04); return; }
      t = t.parentElement;
    }
  }, true);
})();
