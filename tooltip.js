// =============================================================================
// PixelFocus tooltip engine
// -----------------------------------------------------------------------------
// Shared across popup.html, gallery.html, factory.html. Renders a styled
// hover popup for any element that has a `title=` or `data-tip=` attribute.
// Native `title` attributes are migrated to `data-tip` so the browser's own
// (slow, ugly) tooltip never appears in addition to ours.
//
// Works with content added later via DOM mutation (palette swatches, upgrade
// cards, task rows, etc.) thanks to a MutationObserver.
// =============================================================================
(function () {
  if (window.__pfTooltipReady) return;
  window.__pfTooltipReady = true;

  function migrate(root) {
    var nodes = (root || document).querySelectorAll('[title]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = el.getAttribute('title');
      if (t == null) continue;
      if (!el.dataset.tip) el.dataset.tip = t;
      el.removeAttribute('title');
    }
  }

  function init() {
    migrate(document);

    var tip = document.createElement('div');
    tip.id = 'pf-tooltip';
    tip.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'background:#0a0a14',
      'color:#e8e8f0',
      'border:1px solid #4ecdc4',
      'border-radius:6px',
      'padding:8px 11px',
      'font-size:11px',
      'line-height:1.45',
      'max-width:280px',
      'z-index:999999',
      'box-shadow:0 6px 24px rgba(0,0,0,0.7),0 0 12px rgba(78,205,196,0.25)',
      'display:none',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'white-space:normal',
      'opacity:0',
      'transition:opacity 0.12s ease-out'
    ].join(';') + ';';
    document.body.appendChild(tip);

    var hideTimer = null;

    function position(e) {
      var pad = 14;
      var x = e.clientX + pad;
      var y = e.clientY + pad + 4;
      var r = tip.getBoundingClientRect();
      if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
      if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
      if (x < 4) x = 4;
      if (y < 4) y = 4;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    }

    function show(e) {
      var el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) return;
      // Skip ".tip" question-mark chips — those are owned by tips.js,
      // which renders a dedicated anchor-positioned popup for them.
      // Without this guard both systems fire at once and you get two
      // overlapping tooltips for the same element.
      if (el.classList && el.classList.contains('tip')) return;
      if (el.closest && el.closest('.tip')) return;
      var txt = el.getAttribute('data-tip');
      if (!txt) return;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      tip.textContent = txt;
      tip.style.display = 'block';
      // force reflow then fade in
      tip.offsetHeight;
      tip.style.opacity = '1';
      position(e);
    }

    function move(e) {
      if (tip.style.display !== 'block') return;
      position(e);
    }

    function hide(e) {
      var el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) return;
      var related = e.relatedTarget;
      if (related && related.closest && related.closest('[data-tip]') === el) return;
      tip.style.opacity = '0';
      hideTimer = setTimeout(function () { tip.style.display = 'none'; }, 130);
    }

    document.addEventListener('mouseover', show, true);
    document.addEventListener('mousemove', move, true);
    document.addEventListener('mouseout', hide, true);
    // hide on scroll/click so the popup never gets stuck
    document.addEventListener('scroll', function () {
      tip.style.opacity = '0';
      tip.style.display = 'none';
    }, true);
    document.addEventListener('mousedown', function () {
      tip.style.opacity = '0';
      tip.style.display = 'none';
    }, true);

    // Migrate any titles added later by other scripts
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes' && m.attributeName === 'title' && m.target && m.target.hasAttribute && m.target.hasAttribute('title')) {
          var el = m.target;
          if (!el.dataset.tip) el.dataset.tip = el.getAttribute('title');
          el.removeAttribute('title');
        }
        if (m.addedNodes) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (n && n.nodeType === 1) {
              if (n.hasAttribute && n.hasAttribute('title')) {
                if (!n.dataset.tip) n.dataset.tip = n.getAttribute('title');
                n.removeAttribute('title');
              }
              migrate(n);
            }
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
