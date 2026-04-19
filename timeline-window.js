// =============================================================================
// timeline-window.js — v3.21.88 — Event Timeline renderer
// =============================================================================
// Extracted from inline <script> in timeline.html to comply with Manifest V3
// Content Security Policy (no inline scripts allowed).
// =============================================================================

(function() {
  'use strict';

  // ---- Navigation ----
  function openPage(path) {
    try {
      chrome.runtime.sendMessage({ type: 'pf-open', path: path });
    } catch (_) {}
  }
  var toProfileBtn = document.getElementById('toProfileBtn');
  var toFactoryBtn = document.getElementById('toFactoryBtn');
  var toHouseBtn = document.getElementById('toHouseBtn');
  var backBtn = document.getElementById('backToTrackerBtn');
  if (toProfileBtn) toProfileBtn.addEventListener('click', function() { openPage('profile.html'); });
  if (toFactoryBtn) toFactoryBtn.addEventListener('click', function() { openPage('factory.html'); });
  if (toHouseBtn) toHouseBtn.addEventListener('click', function() { openPage('house.html'); });
  if (backBtn) backBtn.addEventListener('click', function() { openPage('popup.html'); });

  // ---- Build catalog lookup ----
  var catalogMap = {};
  var catalogCount = 0;
  try {
    if (typeof EVENT_CATALOG !== 'undefined' && Array.isArray(EVENT_CATALOG)) {
      for (var i = 0; i < EVENT_CATALOG.length; i++) {
        catalogMap[EVENT_CATALOG[i].id] = EVENT_CATALOG[i];
        catalogCount++;
      }
    }
  } catch (e) {
    console.error('[Timeline] Failed to load EVENT_CATALOG:', e);
  }
  console.log('[Timeline] Catalog loaded:', catalogCount, 'events');

  // ---- Classify consequence text ----
  function classifyConsequence(text) {
    if (!text) return 'neutral';
    var t = text.toLowerCase();
    if (t.indexOf('+') === 0 || t.indexOf('granted') !== -1 || t.indexOf('free hire') !== -1) return 'positive';
    if (t.indexOf('-') === 0 || t.indexOf('dissident') !== -1 || t.indexOf('lost') !== -1 || t.indexOf('suspended') !== -1) return 'negative';
    if (t.indexOf('flag') !== -1 || t.indexOf('follow-up') !== -1 || t.indexOf('cleared') !== -1) return 'neutral';
    return 'neutral';
  }

  // ---- Format date ----
  function formatDate(ms) {
    if (!ms || typeof ms !== 'number') return 'Unknown date';
    var d = new Date(ms);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var day = d.getDate();
    var mon = months[d.getMonth()];
    var year = d.getFullYear();
    var h = d.getHours();
    var m = d.getMinutes();
    var hh = h < 10 ? '0' + h : h;
    var mm = m < 10 ? '0' + m : m;
    return day + ' ' + mon + ' ' + year + ' at ' + hh + ':' + mm;
  }

  // ---- Relative time ----
  function timeAgo(ms) {
    if (!ms || typeof ms !== 'number') return '';
    var diff = Date.now() - ms;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 30) return days + ' days ago';
    var months = Math.floor(days / 30);
    return months + ' month' + (months > 1 ? 's' : '') + ' ago';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Render ----
  var timeline = document.getElementById('timeline');
  var activeThreadsEl = document.getElementById('activeThreads');

  // Show loading state
  timeline.innerHTML = '<div class="empty-state"><div class="message">Loading timeline...</div></div>';

  try {
    chrome.storage.local.get('pixelFocusState', function(result) {
      try {
        var state = result && result.pixelFocusState;
        if (!state) {
          console.warn('[Timeline] No pixelFocusState found in storage');
          timeline.innerHTML = '<div class="empty-state">'
            + '<div class="icon">&#9888;</div>'
            + '<div class="message">Could not load game state.<br>Open the to-do list first,<br>then come back here.</div>'
            + '</div>';
          return;
        }

        console.log('[Timeline] State loaded. eventHistory:', (state.eventHistory || []).length,
          'entries. eventsFiredOnce:', Object.keys(state.eventsFiredOnce || {}).length, 'entries.');

        // Build history from eventHistory + backfill from eventsFiredOnce
        var history = (state.eventHistory || []).slice();
        var historyIds = {};
        for (var h = 0; h < history.length; h++) {
          if (history[h] && history[h].eventId) {
            historyIds[history[h].eventId] = true;
          }
        }

        // Backfill: any event in eventsFiredOnce that's missing from eventHistory
        var firedOnce = state.eventsFiredOnce || {};
        var firedOnceKeys = Object.keys(firedOnce);
        for (var k = 0; k < firedOnceKeys.length; k++) {
          var eventId = firedOnceKeys[k];
          if (historyIds[eventId]) continue; // already in history
          var catEntry = catalogMap[eventId];
          // Even without a catalog match, still show the event with its ID
          var ts = firedOnce[eventId];
          // Handle both timestamp (number) and boolean (true) formats
          if (ts === true) ts = 0;
          history.push({
            at: (typeof ts === 'number') ? ts : 0,
            eventId: eventId,
            tier: catEntry ? (catEntry.tier || null) : null,
            title: catEntry ? (catEntry.title || eventId) : eventId.replace(/-/g, ' '),
            summary: '',
            backfilled: true
          });
        }

        console.log('[Timeline] Total events to display:', history.length);

        // Show active story threads
        var flags = state.eventFlags || {};
        var activeFlags = [];
        var threadDescriptions = {
          'luddite_thread_active': 'The Luddite Manifesto \u2014 A hand-craft revivalist circle is organizing against your mill.',
          'guild_thread_active': 'The Guild Thread \u2014 The weavers\' guild has taken notice of your operation.',
          'heir_thread_active': 'The Rival Heirs \u2014 Competing claims to the mill\'s future are emerging.',
          'rail_thread_active': 'The Railway \u2014 Plans for a rail spur to the mill are in motion.'
        };
        var flagKeys = Object.keys(flags);
        for (var fi = 0; fi < flagKeys.length; fi++) {
          var fkey = flagKeys[fi];
          if (fkey.indexOf('__pending:') === 0) continue;
          if (threadDescriptions[fkey]) {
            activeFlags.push({ flag: fkey, desc: threadDescriptions[fkey] });
          }
        }
        if (activeFlags.length > 0) {
          var threadsHtml = '';
          for (var f = 0; f < activeFlags.length; f++) {
            threadsHtml += '<div class="thread-banner">'
              + '<div class="thread-label">ACTIVE STORY THREAD</div>'
              + '<div class="thread-desc">' + activeFlags[f].desc + '</div>'
              + '</div>';
          }
          activeThreadsEl.innerHTML = threadsHtml;
          activeThreadsEl.style.paddingTop = '20px';
        }

        if (history.length === 0) {
          var histCount = (state.eventHistory || []).length;
          var firedCount = Object.keys(state.eventsFiredOnce || {}).length;
          var diagMsg = 'No events yet.<br>Keep working at the loom<br>and the mill\'s story will unfold.';
          diagMsg += '<br><br><span style="font-size:7px;color:#555;letter-spacing:0;">'
            + 'catalog: ' + catalogCount + ' | history: ' + histCount + ' | firedOnce: ' + firedCount
            + '</span>';
          timeline.innerHTML = '<div class="empty-state">'
            + '<div class="icon">&#128220;</div>'
            + '<div class="message">' + diagMsg + '</div>'
            + '</div>';
          return;
        }

        // Reverse chronological — most recent first
        history.sort(function(a, b) { return (b.at || 0) - (a.at || 0); });

        timeline.innerHTML = '<div class="event-count">'
          + history.length + ' event' + (history.length !== 1 ? 's' : '') + ' recorded'
          + '</div>';

        for (var i = 0; i < history.length; i++) {
          var entry = history[i];
          var catalog = catalogMap[entry.eventId] || {};
          var card = document.createElement('div');
          card.className = 'event-card';

          var tierLabel = entry.tier ? ('TIER ' + entry.tier + ' \u2022 EVENT') : 'EVENT';

          var html = '<div class="event-tier">' + tierLabel + '</div>'
            + '<div class="event-title">' + escapeHtml(entry.title || catalog.title || entry.eventId || 'Unknown event') + '</div>';

          // Description from catalog
          var desc = catalog.desc || '';
          if (desc) {
            html += '<div class="event-desc">' + escapeHtml(desc) + '</div>';
          }

          // Flavor text from catalog
          var flavor = catalog.flavor || '';
          if (flavor) {
            html += '<div class="event-flavor">' + escapeHtml(flavor) + '</div>';
          }

          // Consequences
          if (entry.summary) {
            var parts = entry.summary.split(' \u2022 ');
            html += '<div class="event-consequences">'
              + '<div class="label">WHAT CHANGED</div>';
            for (var j = 0; j < parts.length; j++) {
              var cls = classifyConsequence(parts[j]);
              html += '<div class="consequence-item ' + cls + '">' + escapeHtml(parts[j]) + '</div>';
            }
            html += '</div>';
          } else if (entry.backfilled) {
            html += '<div style="font-size:10px;color:var(--text-dim);font-style:italic;margin-top:8px;">Consequence details were not recorded for this event.</div>';
          }

          // Date
          var dateStr = (entry.at && entry.at > 0)
            ? (formatDate(entry.at) + ' \u2022 ' + timeAgo(entry.at))
            : 'Date not recorded';
          html += '<div class="event-date">' + dateStr + '</div>';

          card.innerHTML = html;
          timeline.appendChild(card);
        }
      } catch (renderErr) {
        console.error('[Timeline] Render error:', renderErr);
        timeline.innerHTML = '<div class="empty-state">'
          + '<div class="icon">&#9888;</div>'
          + '<div class="message">Error rendering timeline.<br>' + escapeHtml(String(renderErr)) + '</div>'
          + '</div>';
      }
    });
  } catch (storageErr) {
    console.error('[Timeline] Storage access error:', storageErr);
    timeline.innerHTML = '<div class="empty-state">'
      + '<div class="icon">&#9888;</div>'
      + '<div class="message">Could not access storage.<br>' + escapeHtml(String(storageErr)) + '</div>'
      + '</div>';
  }
})();
