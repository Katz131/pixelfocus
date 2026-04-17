// =============================================================================
// firebase-sync.js — v3.21.4
//
// Syncs the player's profile snapshot to Cloud Firestore so it's viewable
// at a public URL. Uses the Firestore REST API directly (no SDK) to avoid
// CSP and bundler issues in the Chrome extension context.
//
// Exposes window.ProfileSync with:
//   .sync(state)        — push current profile to Firestore
//   .getProfileUrl()    — returns the public URL string (or null)
//   .getProfileId()     — returns the stored profile ID (or null)
//
// Profile IDs are generated once per install and stored in state.profileId.
// The public viewer lives at: https://todo-of-the-loom.web.app/p/?id=XXXXX
// =============================================================================
(function() {
  'use strict';

  // ---- Firebase config (public, non-secret) ----
  var PROJECT_ID = 'todo-of-the-loom';
  var API_KEY = 'AIzaSyCd200oa970-M-sDbcEn4U7dfENVBm4FOA';
  var FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/'
    + PROJECT_ID + '/databases/(default)/documents';
  var HOSTING_BASE = 'https://todo-of-the-loom.web.app';

  // ---- Throttle: don't sync more than once per 60 seconds ----
  var MIN_SYNC_INTERVAL_MS = 60 * 1000;
  var lastSyncTime = 0;

  // ---- Generate a short random profile ID ----
  function generateProfileId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < 12; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  // ---- Convert a JS value to Firestore REST format ----
  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return { integerValue: String(val) };
      return { doubleValue: val };
    }
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === 'object') {
      var fields = {};
      Object.keys(val).forEach(function(k) {
        fields[k] = toFirestoreValue(val[k]);
      });
      return { mapValue: { fields: fields } };
    }
    return { stringValue: String(val) };
  }

  // ---- Build the profile snapshot from extension state ----
  function buildSnapshot(state) {
    // Avatar: render to a tiny canvas and export as data URL
    var avatarDataURL = '';
    var pfp = state.profilePicture;
    if (pfp && pfp.pixels && pfp.size) {
      try {
        var c = document.createElement('canvas');
        c.width = pfp.size;
        c.height = pfp.size;
        var cx = c.getContext('2d');
        cx.fillStyle = '#08080f';
        cx.fillRect(0, 0, pfp.size, pfp.size);
        Object.keys(pfp.pixels).forEach(function(k) {
          var parts = k.split(',');
          cx.fillStyle = pfp.pixels[k];
          cx.fillRect(parseInt(parts[0], 10), parseInt(parts[1], 10), 1, 1);
        });
        avatarDataURL = c.toDataURL('image/png');
      } catch (_) {}
    }

    // XP / level helpers (kept in sync with app.js)
    function xpForLevel(level) { return level * 50; }
    function getLevelFromXP(totalXP) {
      var level = 1, xpNeeded = 0;
      while (level < 100) {
        var next = xpForLevel(level + 1);
        if (xpNeeded + next > totalXP) {
          return { level: level, currentXP: totalXP - xpNeeded, nextLevelXP: next };
        }
        xpNeeded += next;
        level++;
      }
      return { level: 100, currentXP: 0, nextLevelXP: 1 };
    }
    function getLevelTitle(level) {
      if (level >= 100) return 'Omnifabric Singularity';
      if (level >= 90)  return 'Quasar-Class Loom Consciousness';
      if (level >= 80)  return 'Distributed Loom Intelligence';
      if (level >= 70)  return 'Orbital Loom Investor';
      if (level >= 60)  return 'Loom Venture Capitalist';
      if (level >= 50)  return 'Solar Weaver';
      if (level >= 45)  return 'Master of Markets';
      if (level >= 40)  return 'Lord of the Spinning Jennies';
      if (level >= 35)  return 'Mill Magnate';
      if (level >= 30)  return 'Warden of the Floor';
      if (level >= 25)  return 'Foreman of the Jacquards';
      if (level >= 20)  return 'Senior Weaver';
      if (level >= 15)  return 'Heddlekeeper';
      if (level >= 10)  return 'Journeyman Weaver';
      if (level >= 5)   return 'Apprentice Weaver';
      return 'Would-Be Weaver';
    }

    var info = getLevelFromXP(state.xp || 0);
    var roster = (state.personnelRoster && state.personnelRoster.length) || 0;
    var livesLost = (state.personnelDepartures || 0) + (state.incineratorBurned || 0);

    return {
      displayName: state.displayName || 'Anonymous Weaver',
      tagline: state.tagline || '',
      level: info.level,
      title: getLevelTitle(info.level),
      xp: state.xp || 0,
      currentXP: info.currentXP,
      nextLevelXP: info.nextLevelXP,
      streak: state.streak || 0,
      longestStreak: Math.max(state.longestStreak || 0, state.streak || 0),
      lifetimeBlocks: state.totalLifetimeBlocks || 0,
      focusMinutes: state.lifetimeFocusMinutes || 0,
      tasksCompleted: state.tasksCompletedLifetime || 0,
      lifetimeCoins: state.lifetimeCoins || 0,
      wallet: state.coins || 0,
      combo: state.combo || 0,
      maxCombo: state.maxCombo || 0,
      personnel: roster,
      loomsSaved: (state.savedArtworks && state.savedArtworks.length) || 0,
      loomsSold: state.loomsSold || 0,
      livesLost: livesLost,
      avatarDataURL: avatarDataURL,
      dailyTaskLog: (state.dailyTaskLog && state.dailyTaskLog.date === new Date().toISOString().slice(0, 10))
        ? state.dailyTaskLog : { date: new Date().toISOString().slice(0, 10), tasks: {} },
      dailySessionLog: (state.dailySessionLog && state.dailySessionLog.date === new Date().toISOString().slice(0, 10))
        ? state.dailySessionLog : { date: new Date().toISOString().slice(0, 10), sessions: [] },
      updatedAt: new Date().toISOString(),
      profileCreated: state.profileCreated
        ? new Date(state.profileCreated).toISOString()
        : new Date().toISOString()
    };
  }

  // ---- Push snapshot to Firestore ----
  function pushToFirestore(profileId, snapshot) {
    var fields = {};
    Object.keys(snapshot).forEach(function(k) {
      fields[k] = toFirestoreValue(snapshot[k]);
    });

    var url = FIRESTORE_BASE + '/profiles/' + profileId + '?key=' + API_KEY;
    return fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fields })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Firestore sync failed: ' + resp.status);
      return resp.json();
    });
  }

  // ---- Public API ----
  function sync(state) {
    if (!state) return Promise.resolve(null);

    // Throttle
    var now = Date.now();
    if (now - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
      return Promise.resolve('throttled');
    }

    // Ensure profile ID exists
    var profileId = state.profileId;
    var needsSave = false;
    if (!profileId) {
      profileId = generateProfileId();
      state.profileId = profileId;
      needsSave = true;
    }

    // Save profile ID back to state if newly generated
    if (needsSave) {
      try {
        chrome.storage.local.set({ pixelFocusState: state });
      } catch (_) {}
    }

    var snapshot = buildSnapshot(state);
    lastSyncTime = now;

    return pushToFirestore(profileId, snapshot).then(function() {
      console.log('[ProfileSync] Synced profile ' + profileId);
      return profileId;
    }).catch(function(err) {
      console.warn('[ProfileSync] Sync failed:', err);
      return null;
    });
  }

  function getProfileUrl(state) {
    if (!state || !state.profileId) return null;
    return HOSTING_BASE + '/p/?id=' + state.profileId;
  }

  function getProfileId(state) {
    return (state && state.profileId) || null;
  }

  // Expose
  window.ProfileSync = {
    sync: sync,
    getProfileUrl: getProfileUrl,
    getProfileId: getProfileId,
    HOSTING_BASE: HOSTING_BASE
  };
})();
