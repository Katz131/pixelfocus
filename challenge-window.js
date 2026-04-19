(function() {
  'use strict';

  var CHALLENGE_SECONDS = 180; // 3 minutes
  var remaining = CHALLENGE_SECONDS;
  var timerEl = document.getElementById('timerDisplay');
  var progressEl = document.getElementById('progressFill');
  var cardEl = document.getElementById('challengeCard');
  var acceptBtn = document.getElementById('acceptBtn');
  var declineBtn = document.getElementById('declineBtn');
  var resultEl = document.getElementById('resultMsg');
  var buttonRow = document.getElementById('buttonRow');
  var intervalId = null;
  var decided = false;

  cardEl.classList.add('ticking');

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function tick() {
    remaining--;
    if (remaining <= 0) {
      remaining = 0;
      clearInterval(intervalId);
      intervalId = null;
      if (!decided) expire();
    }
    timerEl.textContent = fmt(remaining);
    progressEl.style.width = ((remaining / CHALLENGE_SECONDS) * 100) + '%';
    if (remaining <= 30) {
      timerEl.classList.add('urgent');
    }
  }

  function setChallenge(active) {
    chrome.storage.local.get('pixelFocusState', function(result) {
      var state = result.pixelFocusState;
      if (!state) return;
      state.challengeActive = active;
      state.challengeAcceptedAt = active ? Date.now() : 0;
      state.challengeSessionPaused = false;
      chrome.storage.local.set({ pixelFocusState: state });
    });
  }

  function accept() {
    if (decided) return;
    decided = true;
    clearInterval(intervalId);
    intervalId = null;
    cardEl.classList.remove('ticking');
    cardEl.style.borderColor = '#ffd700';
    cardEl.style.boxShadow = '0 0 50px rgba(255,215,0,0.35)';
    timerEl.style.display = 'none';
    document.querySelector('.timer-label').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('explanationText').style.display = 'none';
    buttonRow.style.display = 'none';
    resultEl.className = 'result-msg accepted';
    resultEl.style.display = 'block';
    resultEl.innerHTML = '&#9876; CHALLENGE ACCEPTED &#9876;<br><br>'
      + '<span style="font-size:9px;color:#e0e0e0;font-family:\'Courier New\',monospace;">'
      + 'Your next completed focus session earns <span style="color:#ffd700;">1.5x rewards</span>.<br>'
      + 'No pausing. No failing. Go get it.</span><br><br>'
      + '<span style="font-size:8px;color:#5a5a7e;">This window will close in 5 seconds...</span>';
    setChallenge(true);

    // Also open Cold Turkey if enabled
    try {
      chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
    } catch (_) {}

    setTimeout(function() { window.close(); }, 5000);
  }

  function decline() {
    if (decided) return;
    decided = true;
    clearInterval(intervalId);
    intervalId = null;
    cardEl.classList.remove('ticking');
    cardEl.style.borderColor = '#2a2a4a';
    cardEl.style.boxShadow = 'none';
    timerEl.style.display = 'none';
    document.querySelector('.timer-label').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('explanationText').style.display = 'none';
    buttonRow.style.display = 'none';
    resultEl.className = 'result-msg declined';
    resultEl.style.display = 'block';
    resultEl.innerHTML = 'Challenge declined.<br><br>'
      + '<span style="font-size:8px;color:#5a5a7e;">No penalty. This window will close in 3 seconds...</span>';
    setChallenge(false);
    setTimeout(function() { window.close(); }, 3000);
  }

  function expire() {
    if (decided) return;
    decided = true;
    cardEl.classList.remove('ticking');
    cardEl.style.borderColor = '#ff6b6b';
    timerEl.style.display = 'none';
    document.querySelector('.timer-label').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('explanationText').style.display = 'none';
    buttonRow.style.display = 'none';
    resultEl.className = 'result-msg expired';
    resultEl.style.display = 'block';
    resultEl.innerHTML = 'Time\'s up. Challenge expired.<br><br>'
      + '<span style="font-size:8px;color:#5a5a7e;">This window will close in 3 seconds...</span>';
    setChallenge(false);
    setTimeout(function() { window.close(); }, 3000);
  }

  acceptBtn.addEventListener('click', accept);
  declineBtn.addEventListener('click', decline);

  // Start the 3-minute countdown
  intervalId = setInterval(tick, 1000);
})();
