const SFX = (() => {
  let ctx = null;
  let _resumed = false;

  function getCtx() {
    // Recreate if closed or missing
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      _resumed = false;
    }
    // Resume on user gesture — attach one-time listener
    if (!_resumed && ctx.state === 'suspended') {
      ctx.resume().then(function() {
        _resumed = true;
        console.log('[SFX] AudioContext resumed successfully');
      }).catch(function(e) {
        console.warn('[SFX] AudioContext resume failed:', e);
      });
      // Also attach click listener as fallback
      if (!getCtx._listenerAdded) {
        getCtx._listenerAdded = true;
        document.addEventListener('click', function _resumeOnClick() {
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(function() {
              _resumed = true;
              console.log('[SFX] AudioContext resumed via click');
            });
          }
          document.removeEventListener('click', _resumeOnClick);
        }, { once: true });
      }
    }
    return ctx;
  }

  function playTone(freq, duration, type, volume, ramp) {
    try {
      type = type || 'square';
      volume = volume || 0.15;
      ramp = ramp !== false;
      var c = getCtx();
      if (c.state === 'suspended') {
        // Try to resume and play after
        c.resume().then(function() {
          _doPlay(c, freq, duration, type, volume, ramp);
        });
      } else {
        _doPlay(c, freq, duration, type, volume, ramp);
      }
    } catch(e) {
      console.warn('[SFX] playTone error:', e);
    }
  }

  function _doPlay(c, freq, duration, type, volume, ramp) {
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(volume, c.currentTime);
      if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch(e) {
      console.warn('[SFX] _doPlay error:', e);
    }
  }

  function seq(notes, interval) {
    interval = interval || 0.08;
    notes.forEach(function(n, i) {
      setTimeout(function() { playTone(n[0], n[1] || 0.1, n[2] || 'square', n[3] || 0.15); }, i * interval * 1000);
    });
  }

  return {
    hover: function() { playTone(800, 0.04, 'square', 0.06); },
    click: function() { playTone(600, 0.06, 'square', 0.12); playTone(900, 0.06, 'square', 0.08); },
    addTask: function() { seq([[523, 0.08, 'square', 0.15], [659, 0.08, 'square', 0.15], [784, 0.12, 'square', 0.15]], 0.06); },
    completeTask: function() { seq([[523, 0.1, 'square', 0.15], [659, 0.1, 'square', 0.15], [784, 0.1, 'square', 0.15], [1047, 0.2, 'square', 0.15]], 0.08); },
    deleteTask: function() { seq([[400, 0.08, 'square', 0.15], [300, 0.08, 'square', 0.15], [200, 0.15, 'square', 0.15]], 0.06); },
    startTimer: function() { seq([[440, 0.1, 'square', 0.15], [554, 0.1, 'square', 0.15], [659, 0.15, 'square', 0.15]], 0.1); },
    blockEarned: function() { seq([[784, 0.1, 'square', 0.15], [988, 0.1, 'square', 0.15], [1175, 0.1, 'square', 0.15], [1318, 0.2, 'square', 0.15]], 0.1); },
    timerComplete: function() { seq([[523,0.12,'square',0.2],[659,0.12,'square',0.2],[784,0.12,'square',0.2],[1047,0.12,'square',0.2],[784,0.12,'square',0.2],[1047,0.25,'square',0.2]], 0.12); },
    purchase: function() { seq([[300,0.06,'square',0.15],[600,0.06,'square',0.15],[900,0.1,'square',0.15],[1200,0.15,'square',0.15]], 0.07); },
    error: function() { seq([[300, 0.15, 'square', 0.15], [200, 0.2, 'square', 0.15]], 0.1); },
    levelUp: function() { seq([[523,0.1,'square',0.18],[659,0.1,'square',0.18],[784,0.1,'square',0.18],[1047,0.15,'square',0.18],[1175,0.1,'square',0.15],[1318,0.1,'square',0.15],[1568,0.3,'square',0.2]], 0.09); },
    comboUp: function() { seq([[800, 0.06, 'square', 0.12], [1000, 0.06, 'square', 0.12], [1200, 0.08, 'square', 0.12]], 0.05); },
    tabSwitch: function() { playTone(700, 0.05, 'triangle', 0.08); },
    tick: function() { playTone(1200, 0.02, 'square', 0.06); },
    selectTask: function() { seq([[600, 0.06, 'square', 0.12], [800, 0.08, 'square', 0.12]], 0.06); },
    openShop: function() { playTone(500, 0.08, 'triangle', 0.1); },
    placePixel: function() { playTone(900 + Math.random() * 400, 0.06, 'square', 0.1); },
    // v3.23.72: Test sound — loud and obvious for settings test button
    test: function() { seq([[523,0.15,'square',0.25],[659,0.15,'square',0.25],[784,0.15,'square',0.25],[1047,0.3,'square',0.25]], 0.15); }
  };
})();
