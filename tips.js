// PixelFocus tooltip positioning - external script (CSP-compliant)
(function() {
  'use strict';

  // Create a single floating tooltip element that we reuse.
  var floater = document.createElement('div');
  floater.id = 'pf-tip-floater';
  floater.style.cssText = [
    'position:fixed',
    'display:none',
    'background:#12122a',
    'border:1px solid #4ecdc4',
    'border-radius:6px',
    'padding:8px 12px',
    'font-family:Segoe UI, sans-serif',
    'font-size:11px',
    'color:#e0e0e0',
    'white-space:normal',
    'width:220px',
    'z-index:99999',
    'box-shadow:0 4px 16px rgba(0,0,0,0.7)',
    'line-height:1.4',
    'text-align:left',
    'pointer-events:none'
  ].join(';');
  floater.textContent = '';

  function ready() {
    if (document.body) {
      document.body.appendChild(floater);
    } else {
      setTimeout(ready, 20);
    }
  }
  ready();

  var activeTip = null;

  function showFor(tip) {
    var popup = tip.querySelector('.tip-popup');
    var text = '';
    if (popup) {
      text = popup.textContent || popup.innerText || '';
    }
    if (!text) {
      // Fall back to title or data-tip attribute
      text = tip.getAttribute('data-tip') || tip.getAttribute('title') || '';
    }
    if (!text) return;

    floater.textContent = text;
    floater.style.display = 'block';

    // Position: prefer above the tip
    var rect = tip.getBoundingClientRect();
    var floatW = floater.offsetWidth;
    var floatH = floater.offsetHeight;
    var left = rect.left + rect.width / 2 - floatW / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - floatW - 6));
    var top = rect.top - floatH - 8;
    if (top < 6) {
      top = rect.bottom + 8;
    }
    floater.style.left = left + 'px';
    floater.style.top = top + 'px';
    activeTip = tip;
  }

  function hide() {
    floater.style.display = 'none';
    activeTip = null;
  }

  document.addEventListener('mouseover', function(e) {
    var tip = e.target.closest && e.target.closest('.tip');
    if (!tip) {
      if (activeTip) hide();
      return;
    }
    if (activeTip !== tip) {
      showFor(tip);
    }
  });

  document.addEventListener('mouseout', function(e) {
    var tip = e.target.closest && e.target.closest('.tip');
    if (!tip) return;
    var related = e.relatedTarget;
    if (related && related.closest && related.closest('.tip') === tip) return;
    hide();
  });

  // Hide on scroll/resize
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
})();
