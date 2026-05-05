// =============================================================================
// firebase-sync.js — v3.21.65
//
// Syncs the player's profile snapshot to Cloud Firestore so it's viewable
// at a public URL. Uses the Firestore REST API directly (no SDK) to avoid
// CSP and bundler issues in the Chrome extension context.
//
// Exposes window.ProfileSync with:
//   .sync(state)        — push current profile + shared data to Firestore
//   .pullShared(id)     — fetch shared config (watchlist etc.) from Firestore
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
      // v3.21.55: Use LOCAL date — must match app.js todayStr() which uses local midnight.
      dailyTaskLog: (function() {
        var _d = new Date(), _mm = _d.getMonth() + 1, _dd = _d.getDate();
        var _t = _d.getFullYear() + '-' + (_mm < 10 ? '0' : '') + _mm + '-' + (_dd < 10 ? '0' : '') + _dd;
        return (state.dailyTaskLog && state.dailyTaskLog.date === _t)
          ? state.dailyTaskLog : { date: _t, tasks: {} };
      })(),
      dailySessionLog: (function() {
        var _d = new Date(), _mm = _d.getMonth() + 1, _dd = _d.getDate();
        var _t = _d.getFullYear() + '-' + (_mm < 10 ? '0' : '') + _mm + '-' + (_dd < 10 ? '0' : '') + _dd;
        return (state.dailySessionLog && state.dailySessionLog.date === _t)
          ? state.dailySessionLog : { date: _t, sessions: [] };
      })(),
      focusHistory: state.focusHistory || {},
      updatedAt: new Date().toISOString(),
      profileCreated: state.profileCreated
        ? new Date(state.profileCreated).toISOString()
        : new Date().toISOString(),
      extensionUrl: (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL('popup.html') : '',
      // v3.23.61: Project names for remote task-adding (friends see which projects exist)
      projectNames: (state.projects || []).map(function(p) { return { id: p.id, name: p.name || 'Untitled' }; })
    };
  }

  // ---- Convert Firestore REST format back to a JS value ----
  function fromFirestoreValue(fv) {
    if (!fv || typeof fv !== 'object') return null;
    if ('nullValue' in fv) return null;
    if ('booleanValue' in fv) return fv.booleanValue;
    if ('integerValue' in fv) return parseInt(fv.integerValue, 10);
    if ('doubleValue' in fv) return fv.doubleValue;
    if ('stringValue' in fv) return fv.stringValue;
    if ('arrayValue' in fv) {
      var vals = (fv.arrayValue && fv.arrayValue.values) || [];
      return vals.map(fromFirestoreValue);
    }
    if ('mapValue' in fv) {
      var obj = {};
      var fields = (fv.mapValue && fv.mapValue.fields) || {};
      Object.keys(fields).forEach(function(k) {
        obj[k] = fromFirestoreValue(fields[k]);
      });
      return obj;
    }
    return null;
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

  // ---- v3.21.65: Push shared config (watchlist etc.) to Firestore ----
  // Stored in a separate document: profiles/{id}/shared/config
  function pushSharedConfig(profileId, sharedData) {
    var fields = {};
    Object.keys(sharedData).forEach(function(k) {
      fields[k] = toFirestoreValue(sharedData[k]);
    });

    var url = FIRESTORE_BASE + '/profiles/' + profileId + '/shared/config?key=' + API_KEY;
    return fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fields })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Shared config push failed: ' + resp.status);
      return resp.json();
    });
  }

  // ---- v3.21.65: Pull shared config from Firestore ----
  function pullSharedConfig(profileId) {
    var url = FIRESTORE_BASE + '/profiles/' + profileId + '/shared/config?key=' + API_KEY;
    return fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(function(resp) {
      if (resp.status === 404) return null; // no shared config yet
      if (!resp.ok) throw new Error('Shared config pull failed: ' + resp.status);
      return resp.json();
    }).then(function(doc) {
      if (!doc || !doc.fields) return null;
      var result = {};
      Object.keys(doc.fields).forEach(function(k) {
        result[k] = fromFirestoreValue(doc.fields[k]);
      });
      return result;
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
      console.warn('[ProfileSync] Generated NEW profileId: ' + profileId);
    }

    // v3.23.46: Always save profileId to a separate key that survives state wipes
    if (needsSave) {
      try {
        chrome.storage.local.set({ pixelFocusState: state, pixelFocusProfileId: profileId });
      } catch (_) {}
    } else {
      try {
        chrome.storage.local.set({ pixelFocusProfileId: profileId });
      } catch (_) {}
    }

    var snapshot = buildSnapshot(state);
    lastSyncTime = now;

    // v3.21.67: Push shared config — full mirror data for linked browsers
    var _td = new Date(), _tmm = _td.getMonth() + 1, _tdd = _td.getDate();
    var _today = _td.getFullYear() + '-' + (_tmm < 10 ? '0' : '') + _tmm + '-' + (_tdd < 10 ? '0' : '') + _tdd;
    var sharedData = {
      nagSites: state.coldTurkeyNagSites || [],
      // Mirror stats — everything needed to display the main browser's state
      xp: state.xp || 0,
      streak: state.streak || 0,
      longestStreak: Math.max(state.longestStreak || 0, state.streak || 0),
      totalLifetimeBlocks: state.totalLifetimeBlocks || 0,
      lifetimeFocusMinutes: state.lifetimeFocusMinutes || 0,
      tasksCompletedLifetime: state.tasksCompletedLifetime || 0,
      coins: state.coins || 0,
      lifetimeCoins: state.lifetimeCoins || 0,
      combo: state.combo || 0,
      maxCombo: state.maxCombo || 0,
      maxComboToday: state.maxComboToday || 0,
      blocks: state.blocks || 0,
      todayBlocks: state.todayBlocks || 0,
      todayXP: state.todayXP || 0,
      sessionBlocks: state.sessionBlocks || 0,
      displayName: state.displayName || '',
      tagline: state.tagline || '',
      lastActiveDate: state.lastActiveDate || '',
      dailyTaskLog: (state.dailyTaskLog && state.dailyTaskLog.date === _today) ? state.dailyTaskLog : { date: _today, tasks: {} },
      dailySessionLog: (state.dailySessionLog && state.dailySessionLog.date === _today) ? state.dailySessionLog : { date: _today, sessions: [] },
      focusHistory: state.focusHistory || {},
      updatedAt: new Date().toISOString(),
      updatedBy: _getBrowserName()
    };

    return pushToFirestore(profileId, snapshot).then(function() {
      console.log('[ProfileSync] Synced profile ' + profileId);
      // v3.21.70: Only push shared config if NOT in mirror mode.
      // Mirror browsers must never overwrite the main browser's stats.
      if (!state.mirrorMode) {
        pushSharedConfig(profileId, sharedData).then(function() {
          console.log('[ProfileSync] Shared config pushed.');
        }).catch(function(err) {
          console.warn('[ProfileSync] Shared config push failed:', err);
        });
      } else {
        console.log('[ProfileSync] Mirror mode — skipping shared config push.');
      }
      return profileId;
    }).catch(function(err) {
      console.warn('[ProfileSync] Sync failed:', err);
      return null;
    });
  }

  // v3.21.65: Pull shared config and return merged watchlist
  function pullShared(profileId) {
    if (!profileId) return Promise.resolve(null);
    return pullSharedConfig(profileId).then(function(config) {
      if (!config) return null;
      console.log('[ProfileSync] Pulled shared config from ' + (config.updatedBy || 'unknown'));
      return config;
    }).catch(function(err) {
      console.warn('[ProfileSync] Pull failed:', err);
      return null;
    });
  }

  // v3.21.65: Detect browser name for labeling which browser pushed
  function _getBrowserName() {
    var ua = (navigator && navigator.userAgent) || '';
    if (ua.indexOf('Brave') !== -1) return 'Brave';
    if (ua.indexOf('Edg/') !== -1) return 'Edge';
    if (ua.indexOf('OPR/') !== -1 || ua.indexOf('Opera') !== -1) return 'Opera';
    if (ua.indexOf('Vivaldi') !== -1) return 'Vivaldi';
    if (ua.indexOf('Chrome') !== -1) return 'Chrome';
    if (ua.indexOf('Firefox') !== -1) return 'Firefox';
    return 'Unknown';
  }

  function getProfileUrl(state) {
    if (!state || !state.profileId) return null;
    return HOSTING_BASE + '/p/?id=' + state.profileId;
  }

  function getProfileId(state) {
    return (state && state.profileId) || null;
  }

  // =========================================================================
  // v3.23.61: Social / Remote Task-Adding API
  //
  // Data model:
  //   profiles/{id}/social/data   — owner-managed: friend list + permissions
  //     { friends: { friendId: { displayName, status, permittedProjects, addedAt } } }
  //   profiles/{id}/inbox/{msgId} — individual messages (friend reqs, tasks)
  //     { type, fromId, fromName, project, text, createdAt }
  // =========================================================================

  // ---- Read social data (friends + permissions) ----
  function getSocialData(profileId) {
    var url = FIRESTORE_BASE + '/profiles/' + profileId + '/social/data?key=' + API_KEY;
    return fetch(url).then(function(resp) {
      if (resp.status === 404) return { friends: {} };
      if (!resp.ok) throw new Error('getSocialData failed: ' + resp.status);
      return resp.json();
    }).then(function(doc) {
      if (!doc || !doc.fields) return { friends: {} };
      var result = {};
      Object.keys(doc.fields).forEach(function(k) {
        result[k] = fromFirestoreValue(doc.fields[k]);
      });
      return result;
    });
  }

  // ---- Write social data (friends + permissions) ----
  function putSocialData(profileId, data) {
    var fields = {};
    Object.keys(data).forEach(function(k) {
      fields[k] = toFirestoreValue(data[k]);
    });
    var url = FIRESTORE_BASE + '/profiles/' + profileId + '/social/data?key=' + API_KEY;
    return fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fields })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('putSocialData failed: ' + resp.status);
      return resp.json();
    });
  }

  // ---- Send a message to someone's inbox (friend request, task, etc.) ----
  function sendInboxMessage(targetProfileId, message) {
    var fields = {};
    Object.keys(message).forEach(function(k) {
      fields[k] = toFirestoreValue(message[k]);
    });
    // POST creates a new document with auto-generated ID
    var url = FIRESTORE_BASE + '/profiles/' + targetProfileId + '/inbox?key=' + API_KEY;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fields })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('sendInboxMessage failed: ' + resp.status);
      return resp.json();
    });
  }

  // ---- Read all inbox messages ----
  function getInbox(profileId) {
    var url = FIRESTORE_BASE + '/profiles/' + profileId + '/inbox?key=' + API_KEY + '&pageSize=50';
    return fetch(url).then(function(resp) {
      if (resp.status === 404) return [];
      if (!resp.ok) throw new Error('getInbox failed: ' + resp.status);
      return resp.json();
    }).then(function(data) {
      if (!data || !data.documents) return [];
      return data.documents.map(function(doc) {
        var result = {};
        if (doc.fields) {
          Object.keys(doc.fields).forEach(function(k) {
            result[k] = fromFirestoreValue(doc.fields[k]);
          });
        }
        // Extract document ID from the name path
        var parts = (doc.name || '').split('/');
        result._id = parts[parts.length - 1];
        return result;
      });
    });
  }

  // ---- Delete an inbox message after processing ----
  function deleteInboxMessage(profileId, messageId) {
    var url = FIRESTORE_BASE + '/profiles/' + profileId + '/inbox/' + messageId + '?key=' + API_KEY;
    return fetch(url, { method: 'DELETE' }).then(function(resp) {
      if (!resp.ok && resp.status !== 404) throw new Error('deleteInboxMessage failed: ' + resp.status);
      return true;
    });
  }

  // ---- Fetch a single profile (for looking up friend names, etc.) ----
  function getProfile(profileId) {
    var url = FIRESTORE_BASE + '/profiles/' + profileId + '?key=' + API_KEY;
    return fetch(url).then(function(resp) {
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error('getProfile failed: ' + resp.status);
      return resp.json();
    }).then(function(doc) {
      if (!doc || !doc.fields) return null;
      var result = {};
      Object.keys(doc.fields).forEach(function(k) {
        result[k] = fromFirestoreValue(doc.fields[k]);
      });
      return result;
    });
  }

  // Expose
  window.ProfileSync = {
    sync: sync,
    pullShared: pullShared,
    getProfileUrl: getProfileUrl,
    getProfileId: getProfileId,
    HOSTING_BASE: HOSTING_BASE,
    _resetThrottle: function() { lastSyncTime = 0; },
    // v3.23.61: Social API
    getSocialData: getSocialData,
    putSocialData: putSocialData,
    sendInboxMessage: sendInboxMessage,
    getInbox: getInbox,
    deleteInboxMessage: deleteInboxMessage,
    getProfile: getProfile
  };
})();
