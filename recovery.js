// recovery.js — v3.23.446: FULLY AUTOMATIC data recovery
// Runs on page load. No button clicks needed.
// Priority: local backups > Firestore data > nothing

var _log = [];
function log(msg) {
  _log.push('[' + new Date().toLocaleTimeString() + '] ' + msg);
  var el = document.getElementById('log');
  if (el) el.innerHTML = _log.map(function(l) { return '<div class="log-line">' + l + '</div>'; }).join('');
  console.log('[RECOVERY-446] ' + msg);
}

function countTasks(s) {
  if (!s || !s.tasks || typeof s.tasks !== 'object') return 0;
  var c = 0;
  Object.values(s.tasks).forEach(function(arr) { if (Array.isArray(arr)) c += arr.length; });
  return c;
}

function scoreState(s) {
  if (!s) return 0;
  return (s.xp || 0) +
         (s.lifetimeFocusMinutes || 0) * 10 +
         countTasks(s) * 1000 +
         ((s.autoloomLevel || 0) + (s.employeesLevel || 0) + (s.marketingLevel || 0)) * 5000 +
         (s.lifetimeSessions || 0) * 100 +
         (s.badges ? Object.keys(s.badges).length * 50 : 0);
}

function renderState(data, containerId) {
  var el = document.getElementById(containerId);
  if (!data) { el.innerHTML = '<div class="status status-bad">NOT FOUND</div>'; return null; }
  var s = data.state || data;
  var savedAt = data.savedAt ? new Date(data.savedAt).toLocaleString() : 'N/A';
  var tc = countTasks(s);
  var score = scoreState(s);
  var hasRealData = score > 1000;
  var html = '';
  if (data.savedAt) html += '<div class="status status-info">Saved at: ' + savedAt + '</div>';
  html += hasRealData ? '<div class="status status-good">Contains real data! Score: ' + score + '</div>' : '<div class="status status-bad">Appears WIPED (score: ' + score + ')</div>';
  html += '<table><tr><th>Field</th><th>Value</th></tr>';
  [['xp', s.xp], ['coins', s.coins], ['lifetimeFocusMinutes', s.lifetimeFocusMinutes], ['streak', s.streak],
   ['tasks', tc], ['badges', s.badges ? Object.keys(s.badges).length : 0], ['projects', s.projects ? s.projects.length : 0],
   ['autoloomLevel', s.autoloomLevel], ['employeesLevel', s.employeesLevel], ['displayName', s.displayName],
   ['profileId', s.profileId], ['brokerageUnlocked', s.brokerageUnlocked], ['ratiocinatoryUnlocked', s.ratiocinatoryUnlocked]
  ].forEach(function(f) {
    var v = f[1];
    var cls = (v === 0 || v === undefined || v === null || v === '' || v === false) ? 'val-zero' : 'val-good';
    html += '<tr><td>' + f[0] + '</td><td class="' + cls + '">' + (v === undefined ? 'undefined' : String(v)) + '</td></tr>';
  });
  html += '</table>';
  el.innerHTML = html;
  return s;
}

// FIRESTORE DATA — last known good values from server
var FIRESTORE_DATA = {
  xp: 17274,
  lifetimeFocusMinutes: 4970,
  lifetimeSessions: 878,
  totalLifetimeSessions: 878,
  totalLifetimeBlocks: 878,
  lifetimeBlocks: 878,
  coins: 7707.11,
  lifetimeCoins: 176697.41,
  streak: 26,
  realStreak: 26,
  longestStreak: 26,
  longestRealStreak: 26,
  maxCombo: 25,
  maxComboToday: 0,
  combo: 0,
  comboSessions: 0,
  displayName: 'Jeffrey Gold-Loom',
  tagline: 'Trust no one.',
  profileId: '336ysd55fgia',
  profileCreated: '2026-04-09T19:55:44.287Z',
  loomsSold: 15,
  loomsSaved: 6,
  tasksCompleted: 237,
  bedtimeStreak: 0,
  bedtimeTotalSuccesses: 0,
  bedtimeBestStreak: 0,
  badges: {"streak_7":true,"combo_10":true,"profile_pic":true,"display_name":true,"level_10":true,"rich_1000":true,"rich_10000":true,"streak_3":true,"combo_3":true,"combo_5":true,"combo_15":true,"blocks_10":true,"blocks_50":true,"blocks_100":true,"blocks_250":true,"full_profile":true,"level_3":true,"level_5":true,"rich_100":true,"rich_500":true,"rich_5000":true,"rich_25000":true,"hoard_1000":true,"hoard_5000":true,"gallery_1":true,"gallery_3":true,"dye_1":true,"first_sale":true,"first_hire":true,"broker_unlocked":true,"sales_100":true,"blocks_25":true,"combo_7":true,"level_7":true,"gallery_2":true,"sales_250":true,"rich_2500":true,"hoard_2500":true,"streak_5":true,"first_focus":true,"five_sessions":true,"ten_sessions":true,"twentyfive_sess":true,"fifty_sessions":true,"focus_75":true,"century_focus":true,"rich_50000":true,"quest_1":true,"quest_ambitious_1":true,"hoard_10000":true,"streak_10":true,"gallery_5":true,"level_15":true,"focus_150":true,"quest_streak_3":true,"morse_recv_1":true,"morse_first":true,"morse_recv_5":true,"morse_recv_10":true,"streak_14":true,"combo_20":true,"morse_5":true,"canvas_12":true,"canvas_buyer_2":true,"canvas_10":true,"blocks_500":true,"rich_75000":true,"quest_5":true,"level_20":true,"focus_250":true,"morse_10":true,"hoard_25000":true,"hoard_50000":true,"hoard_100000":true,"hoard_75000":true,"rich_100000":true,"combo_25":true,"blocks_750":true,"streak_21":true,"rich_150000":true,"quest_10":true,"level_25":true},
  projects: [
    {id:'default',name:'General'},
    {id:'proj_1775764819297',name:'post-soup'},
    {id:'proj_1777511072973',name:'clinical'},
    {id:'proj_1777583403549',name:'ck buddy'},
    {id:'proj_1778154627539',name:'music'},
    {id:'proj_1778155204648',name:'house'},
    {id:'proj_1778475395204',name:'people'}
  ],
  profilePicture: {dataURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAoklEQVR4AZSQsQ7CMAxEj05kY+EHmTuxIL4A2FnhN2FLfVfbUqO2ais7jn33Uskd6rPuyQ4bvopbugRwUPszWFPxi2b9NzUBB7yA9wWlnNw2lmN5IDRVGwug0JpNU7SagP/vjki5/IgZq48gIBq+xox+rk4AvsSkcQlMIAzaihEBRm8jRQI0CPIV5pq9l2ZIAnZXlM9V622rRDsmAP+ylubHAAAA//87vdj8AAAABklEQVQDAEK2a2H6EJrYAAAAAElFTkSuQmCC'},
  mirrorMode: false,
  use24Hour: true
};

// Main recovery logic — runs on page load
chrome.storage.local.get(null, function(allData) {
  var el_loading = document.getElementById('loading');
  var el_content = document.getElementById('content');
  if (el_loading) el_loading.style.display = 'none';
  if (el_content) el_content.style.display = 'block';

  var keys = Object.keys(allData);
  log('Found ' + keys.length + ' storage keys: ' + keys.join(', '));

  document.getElementById('overview').innerHTML = '<div class="status status-info">Total storage keys: ' + keys.length + '</div>';

  // Extract states
  var mainRaw = allData.pixelFocusState || {};
  var b1Raw = allData.pixelFocusState_backup_safe;
  var b2Raw = allData.pixelFocusState_backup_safe2;

  var mainState = mainRaw;
  var b1State = b1Raw ? (b1Raw.state || b1Raw) : null;
  var b2State = b2Raw ? (b2Raw.state || b2Raw) : null;

  // Render display
  renderState(mainRaw, 'mainState');
  renderState(b1Raw, 'backup1');
  renderState(b2Raw, 'backup2');

  var pid = allData.pixelFocusProfileId;
  document.getElementById('profileId').innerHTML = pid ? '<div class="status status-good">' + pid + '</div>' : '<div class="status status-bad">Not found — will set to 336ysd55fgia</div>';

  // Score all sources
  var mainScore = scoreState(mainState);
  var b1Score = scoreState(b1State);
  var b2Score = scoreState(b2State);
  var firestoreScore = scoreState(FIRESTORE_DATA);

  log('Scores — Main: ' + mainScore + ' | Backup1: ' + b1Score + ' | Backup2: ' + b2Score + ' | Firestore: ' + firestoreScore);
  log('Tasks — Main: ' + countTasks(mainState) + ' | Backup1: ' + countTasks(b1State) + ' | Backup2: ' + countTasks(b2State));

  // Find best source
  var best = null;
  var bestName = '';
  var bestScore = 0;

  if (b1Score > bestScore) { best = b1State; bestName = 'Backup 1'; bestScore = b1Score; }
  if (b2Score > bestScore) { best = b2State; bestName = 'Backup 2'; bestScore = b2Score; }

  // Is main state wiped?
  var mainIsWiped = mainScore < 1000;

  if (!mainIsWiped) {
    // Main looks healthy
    log('Main state appears HEALTHY (score ' + mainScore + '). No auto-restore needed.');
    document.getElementById('actions').innerHTML = '<div class="status status-good" style="font-size:18px;">Data looks OK! Score: ' + mainScore + '. No restoration needed.</div>' +
      '<br><button class="btn-download" id="downloadBtn">Download Storage Dump (backup)</button>' +
      '<button class="btn-open" id="openPopup">Open Extension</button>';
    wireButtons(allData);
    return;
  }

  log('Main state is WIPED (score ' + mainScore + '). Starting auto-recovery...');

  // AUTO-DOWNLOAD dump BEFORE any changes (safety net)
  try {
    var dumpBlob = new Blob([JSON.stringify(allData, null, 2)], {type: 'application/json'});
    var dumpUrl = URL.createObjectURL(dumpBlob);
    var dumpLink = document.createElement('a');
    dumpLink.href = dumpUrl;
    dumpLink.download = 'pixelfocus-PRE-RESTORE-dump-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    dumpLink.click();
    URL.revokeObjectURL(dumpUrl);
    log('Auto-downloaded pre-restore storage dump as safety backup.');
  } catch(e) { log('Could not auto-download dump: ' + e.message); }

  if (bestScore > 1000) {
    // Backup has real data — FULL REPLACE
    log('RESTORING from ' + bestName + ' (score ' + bestScore + ')...');
    doFullReplace(best, bestName);
  } else {
    // All local sources are wiped — use Firestore
    log('ALL local sources are wiped. Restoring from FIRESTORE data...');
    doFullReplace(FIRESTORE_DATA, 'Firestore');
  }
});

function doFullReplace(source, sourceName) {
  // Make a deep copy
  var newState = JSON.parse(JSON.stringify(source));

  // Ensure critical fields
  newState.profileId = newState.profileId || '336ysd55fgia';
  newState.mirrorMode = false;
  newState.lastActiveDate = new Date().toLocaleDateString('en-CA');

  // Remove any internal scoring fields
  delete newState._score;
  delete newState._firestoreRestore442;
  delete newState._backupRestore443;

  var taskCount = countTasks(newState);
  var badgeCount = newState.badges ? Object.keys(newState.badges).length : 0;

  log('Writing FULL state replacement: xp=' + (newState.xp||0) + ' coins=$' + Math.round(newState.coins||0) +
      ' streak=' + (newState.streak||0) + ' tasks=' + taskCount + ' badges=' + badgeCount +
      ' autoloom=' + (newState.autoloomLevel||0) + ' employees=' + (newState.employeesLevel||0));

  chrome.storage.local.set({
    pixelFocusState: newState,
    pixelFocusProfileId: newState.profileId
  }, function() {
    if (chrome.runtime.lastError) {
      log('ERROR writing state: ' + chrome.runtime.lastError.message);
      document.getElementById('actions').innerHTML = '<div class="status status-bad" style="font-size:18px;">WRITE ERROR: ' + chrome.runtime.lastError.message + '</div>';
      return;
    }

    log('SUCCESS! State written from ' + sourceName + '.');
    log('Verifying write...');

    // Verify the write actually stuck
    chrome.storage.local.get('pixelFocusState', function(verify) {
      var v = verify.pixelFocusState || {};
      var vScore = scoreState(v);
      log('Verification: stored xp=' + (v.xp||0) + ' coins=$' + Math.round(v.coins||0) + ' score=' + vScore);

      if (vScore > 1000) {
        log('VERIFIED - data is restored!');
        document.getElementById('actions').innerHTML =
          '<div class="status status-good" style="font-size:20px;text-align:center;padding:20px;">' +
          'DATA RESTORED from ' + sourceName + '!<br>' +
          '<span style="font-size:14px;color:#aaa;">XP: ' + (v.xp||0) + ' | $' + Math.round(v.coins||0) + ' | Streak: ' + (v.streak||0) + ' | Tasks: ' + countTasks(v) + '</span><br><br>' +
          '<span style="font-size:16px;">Close this tab and click the extension icon to reopen.</span>' +
          '</div>' +
          '<button class="btn-open" id="openPopup" style="display:block;margin:20px auto;font-size:20px;padding:16px 40px;">OPEN EXTENSION NOW</button>';
        document.getElementById('openPopup').addEventListener('click', function() {
          chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
        });
      } else {
        log('WARNING: Verification failed - stored score is only ' + vScore);
        document.getElementById('actions').innerHTML = '<div class="status status-bad" style="font-size:16px;">Write appeared to succeed but verification shows low score (' + vScore + '). The save guard in background.js may be blocking writes. Try closing ALL extension tabs first, then reload this page.</div>';
      }
    });
  });
}

function wireButtons(allData) {
  var dlBtn = document.getElementById('downloadBtn');
  if (dlBtn) {
    dlBtn.addEventListener('click', function() {
      var blob = new Blob([JSON.stringify(allData, null, 2)], {type: 'application/json'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'pixelfocus-storage-dump-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
      a.click();
      URL.revokeObjectURL(url);
      log('Downloaded storage dump.');
    });
  }
  var openBtn = document.getElementById('openPopup');
  if (openBtn) {
    openBtn.addEventListener('click', function() {
      chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
    });
  }
}
