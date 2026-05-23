(function() {
  // Parse URL params
  var params = new URLSearchParams(window.location.search);
  var type = params.get('type') || 'event'; // 'prep' or 'event'
  var label = params.get('label') || 'Commitment';
  var prepTime = params.get('prepTime') || '';
  var eventTime = params.get('eventTime') || '';
  var endTime = params.get('endTime') || '';
  var prepMin = parseInt(params.get('prepMin') || '0', 10);
  var durMin = parseInt(params.get('durMin') || '0', 10);
  var isTest = params.get('test') === '1';

  // Build content
  var html = '';
  if (type === 'prep') {
    html += '<div class="alert-type prep pulse">GET READY NOW</div>';
    html += '<div class="big-time prep">' + (prepTime || 'NOW') + '</div>';
    html += '<div class="label">' + label + '</div>';
    if (eventTime) {
      html += '<div class="sublabel">Event starts at ' + eventTime + ' — you have ' + prepMin + ' min to prepare</div>';
    }
  } else {
    html += '<div class="alert-type event pulse">TIME TO GO</div>';
    html += '<div class="big-time event">' + (eventTime || 'NOW') + '</div>';
    html += '<div class="label">' + label + '</div>';
    if (durMin > 0) {
      html += '<div class="sublabel">' + durMin + ' minutes — ends at ' + endTime + '</div>';
    }
  }

  // Timeline
  html += '<div class="timeline-box">';
  var nowDate = new Date();
  var nowStr = (nowDate.getHours() < 10 ? '0' : '') + nowDate.getHours() + ':' + (nowDate.getMinutes() < 10 ? '0' : '') + nowDate.getMinutes();

  html += '<div class="step"><span class="step-time" style="color:#4ecdc4;">' + nowStr + '</span><span class="step-dot" style="background:#4ecdc4;box-shadow:0 0 8px rgba(78,205,196,0.5);"></span><span class="step-label" style="color:#4ecdc4;font-weight:bold;">NOW</span></div>';

  if (prepMin > 0 && type === 'prep') {
    html += '<div class="step-line"></div>';
    html += '<div class="step"><span class="step-time" style="color:#ff8c3a;">' + prepTime + '</span><span class="step-dot" style="background:#ff8c3a;box-shadow:0 0 8px rgba(255,140,58,0.5);"></span><span class="step-label" style="color:#ff8c3a;font-weight:bold;">GET READY (' + prepMin + ' min)</span></div>';
  }

  html += '<div class="step-line"></div>';
  html += '<div class="step"><span class="step-time" style="color:#ff4444;">' + eventTime + '</span><span class="step-dot" style="background:#ff4444;"></span><span class="step-label" style="color:#ff4444;">' + label + ' starts</span></div>';

  if (endTime) {
    html += '<div class="step-line"></div>';
    html += '<div class="step"><span class="step-time" style="color:#5a5a7e;">' + endTime + '</span><span class="step-dot" style="background:#5a5a7e;border:1px solid #3a3a5a;"></span><span class="step-label" style="color:#5a5a7e;">Ends' + (durMin > 0 ? ' (' + durMin + ' min)' : '') + '</span></div>';
  }
  html += '</div>';

  if (isTest) {
    html += '<div style="font-size:10px;color:#ff9f43;margin-top:8px;font-style:italic;">This is a test alert — your real alerts will look just like this.</div>';
  }

  document.getElementById('alertContent').innerHTML = html;

  // Play alarm sound — urgent ascending tones
  function playAlarm() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var isPrep = type === 'prep';
      var baseFreqs = isPrep ? [440, 554, 659, 880] : [523, 659, 784, 1047, 784, 1047];
      var vol = 0.15;

      // Play the sequence twice with a gap
      function playSeq(offset) {
        baseFreqs.forEach(function(freq, i) {
          var t = ctx.currentTime + offset + (i * 0.15);
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(vol, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.12);
        });
      }

      playSeq(0);
      playSeq(1.2);
      if (!isPrep) playSeq(2.4); // event start gets 3 rounds
    } catch(e) {}
  }

  playAlarm();

  // Dismiss
  document.getElementById('dismissBtn').addEventListener('click', function() {
    window.close();
  });

  // Auto-close after 5 minutes
  setTimeout(function() { window.close(); }, 5 * 60 * 1000);
})();
