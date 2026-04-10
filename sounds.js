const SFX = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function playTone(freq, duration, type, volume, ramp) {
    try {
      type = type || 'square'; volume = volume || 0.08; ramp = ramp !== false;
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(volume, c.currentTime);
      if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch(e) {}
  }
  function seq(notes, interval) {
    interval = interval || 0.08;
    notes.forEach(function(n, i) {
      setTimeout(function() { playTone(n[0], n[1] || 0.1, n[2] || 'square', n[3] || 0.08); }, i * interval * 1000);
    });
  }
  return {
    hover: function() { playTone(800, 0.04, 'square', 0.03); },
    click: function() { playTone(600, 0.06, 'square', 0.06); playTone(900, 0.06, 'square', 0.04); },
    addTask: function() { seq([[523, 0.08], [659, 0.08], [784, 0.12]], 0.06); },
    completeTask: function() { seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]], 0.08); },
    deleteTask: function() { seq([[400, 0.08], [300, 0.08], [200, 0.15]], 0.06); },
    startTimer: function() { seq([[440, 0.1], [554, 0.1], [659, 0.15]], 0.1); },
    blockEarned: function() { seq([[784, 0.1], [988, 0.1], [1175, 0.1], [1318, 0.2]], 0.1); },
    timerComplete: function() { seq([[523,0.12],[659,0.12],[784,0.12],[1047,0.12],[784,0.12],[1047,0.25]], 0.12); },
    purchase: function() { seq([[300,0.06],[600,0.06],[900,0.1],[1200,0.15]], 0.07); },
    error: function() { seq([[300, 0.15], [200, 0.2]], 0.1); },
    levelUp: function() { seq([[523,0.1,'square',0.1],[659,0.1,'square',0.1],[784,0.1,'square',0.1],[1047,0.15,'square',0.1],[1175,0.1,'square',0.08],[1318,0.1,'square',0.08],[1568,0.3,'square',0.12]], 0.09); },
    comboUp: function() { seq([[800, 0.06], [1000, 0.06], [1200, 0.08]], 0.05); },
    tabSwitch: function() { playTone(700, 0.05, 'triangle', 0.04); },
    tick: function() { playTone(1200, 0.02, 'square', 0.02); },
    selectTask: function() { seq([[600, 0.06], [800, 0.08]], 0.06); },
    openShop: function() { playTone(500, 0.08, 'triangle', 0.05); },
    placePixel: function() { playTone(900 + Math.random() * 400, 0.06, 'square', 0.05); }
  };
})();
