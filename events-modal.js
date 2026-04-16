// =============================================================================
// events-modal.js — v3.22.0 Stage 1 — Event modal + MsgLog announcer
// =============================================================================
// Player-facing surface for the events engine. When an event fires, this
// module shows a dark modal overlay with the title, flavor paragraph, and
// a human-readable list of the consequences that were applied. Also posts
// a one-line entry into MsgLog so the player has a scrollable audit trail.
//
// Public API:
//   EventsModal.show(result)      — display the result returned by Events.fire
//   EventsModal.showPending(state) — drain state.eventsPending and display them
//   EventsModal.init()            — inject stylesheet once (idempotent)
//
// The modal is created lazily on first show() and reused. Only one modal is
// visible at a time; if multiple events fire in a tick, they're queued.
// =============================================================================

(function() {
  'use strict';

  var STYLE_ID = 'events-modal-styles';
  var ROOT_ID  = 'events-modal-root';
  var queue = [];
  var showing = false;

  // ---------------------------------------------------------------------------
  // Styles — injected once. Colour palette matches the bureau / research
  // dark theme so the modal feels in-world, not like a browser alert.
  // ---------------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '#' + ROOT_ID + ' {',
      '  position: fixed; inset: 0; z-index: 99999;',
      '  display: flex; align-items: center; justify-content: center;',
      '  background: rgba(4,2,6,0.78); backdrop-filter: blur(3px);',
      '  font-family: "Segoe UI", sans-serif;',
      '}',
      '#' + ROOT_ID + ' .em-card {',
      '  background: #120b10; border: 1px solid #3a2a3a; border-radius: 12px;',
      '  box-shadow: 0 0 40px rgba(0,0,0,0.7);',
      '  max-width: 620px; width: calc(100vw - 48px);',
      '  max-height: 80vh; overflow-y: auto;',
      '  padding: 28px 32px; color: #e0d8d0;',
      '}',
      '#' + ROOT_ID + ' .em-tag {',
      '  font-family: "Press Start 2P", monospace; font-size: 9px; letter-spacing: 3px;',
      '  color: #ff8855; text-transform: uppercase; margin-bottom: 10px;',
      '}',
      '#' + ROOT_ID + ' h2 {',
      '  font-family: "Press Start 2P", monospace; font-size: 14px; line-height: 1.5;',
      '  color: #ffd27a; margin-bottom: 14px;',
      '}',
      '#' + ROOT_ID + ' .em-desc { font-size: 14px; line-height: 1.6; color: #ddd0c4; margin-bottom: 10px; }',
      '#' + ROOT_ID + ' .em-flavor { font-size: 13px; font-style: italic; color: #8a7a70; line-height: 1.55; margin-bottom: 18px; }',
      '#' + ROOT_ID + ' .em-effects { border-top: 1px solid #3a2a3a; padding-top: 14px; margin-top: 10px; }',
      '#' + ROOT_ID + ' .em-effects h3 {',
      '  font-family: "Press Start 2P", monospace; font-size: 9px; color: #8a7a70;',
      '  letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;',
      '}',
      '#' + ROOT_ID + ' .em-effect {',
      '  padding: 6px 10px; background: #1a1218; border-left: 3px solid #ff8855;',
      '  border-radius: 4px; margin-bottom: 6px; font-size: 12px; color: #d4c8be;',
      '}',
      '#' + ROOT_ID + ' .em-effect.neg { border-left-color: #ff4466; }',
      '#' + ROOT_ID + ' .em-effect.pos { border-left-color: #88cc66; }',
      '#' + ROOT_ID + ' .em-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }',
      '#' + ROOT_ID + ' button.em-ack {',
      '  background: transparent; border: 1px solid #ff8855; color: #ff8855;',
      '  font-family: "Press Start 2P", monospace; font-size: 10px;',
      '  padding: 8px 18px; border-radius: 6px; cursor: pointer;',
      '}',
      '#' + ROOT_ID + ' button.em-ack:hover { background: rgba(255,136,85,0.1); color: #ffd27a; }'
    ].join('\n');
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function classifyEffect(eff) {
    if (!eff || !eff.kind) return '';
    switch (eff.kind) {
      case 'addCoins':
      case 'addTextiles':
      case 'grantFreeHire':
        return 'pos';
      case 'loseCoins':
      case 'loseTextiles':
      case 'suspendUpgrade':
      case 'addDissident':
        return 'neg';
      case 'incomeMultiplier':
      case 'marketingMultiplier':
      case 'textileMultiplier':
        if (eff.applied && typeof eff.applied.factor === 'number') {
          return eff.applied.factor >= 1 ? 'pos' : 'neg';
        }
        return '';
      case 'adjustReputation':
        if (typeof eff.applied === 'number') return eff.applied >= 0 ? 'pos' : 'neg';
        return '';
      default:
        return '';
    }
  }

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // Render one event result in the modal.
  // ---------------------------------------------------------------------------
  function render(result) {
    injectStyles();
    var root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    var tag = result.tier ? ('Tier ' + result.tier + ' \u2022 Event') : 'Event';
    var effectsHtml = '';
    if (result.effects && result.effects.length) {
      var lines = [];
      for (var i = 0; i < result.effects.length; i++) {
        var e = result.effects[i];
        if (!e || !e.summary) continue;
        var cls = classifyEffect(e);
        lines.push('<div class="em-effect' + (cls ? ' ' + cls : '') + '">' + esc(e.summary) + '</div>');
      }
      if (lines.length) {
        effectsHtml = '<div class="em-effects"><h3>What changed</h3>' + lines.join('') + '</div>';
      }
    }
    root.innerHTML =
      '<div class="em-card" role="dialog" aria-modal="true">' +
        '<div class="em-tag">' + esc(tag) + '</div>' +
        '<h2>' + esc(result.title || 'Something happened.') + '</h2>' +
        (result.desc ? '<div class="em-desc">' + esc(result.desc) + '</div>' : '') +
        (result.flavor ? '<div class="em-flavor">' + esc(result.flavor) + '</div>' : '') +
        effectsHtml +
        '<div class="em-actions">' +
          '<button class="em-ack" id="emAckBtn">ACKNOWLEDGED</button>' +
        '</div>' +
      '</div>';
    var btn = document.getElementById('emAckBtn');
    if (btn) btn.addEventListener('click', dismiss);
  }

  function dismiss() {
    var root = document.getElementById(ROOT_ID);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    showing = false;
    // Drain queue
    if (queue.length) {
      var next = queue.shift();
      showing = true;
      render(next);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  function show(result) {
    if (!result || !result.ok) return;
    // MsgLog one-liner
    try {
      if (typeof MsgLog !== 'undefined' && MsgLog && MsgLog.push) {
        var tag = result.tier ? ('[T' + result.tier + ']') : '[EVENT]';
        var summary = result.summary ? (' \u2014 ' + result.summary) : '';
        MsgLog.push('>> ' + tag + ' ' + (result.title || 'Event') + summary);
      }
    } catch (_) {}

    if (showing) { queue.push(result); return; }
    showing = true;
    render(result);
  }

  function init() { injectStyles(); }

  window.EventsModal = {
    init: init,
    show: show
  };
})();
