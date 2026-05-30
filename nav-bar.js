// nav-bar.js — v3.23.512: Universal navigation bar for all game pages
// Injects a consistent nav strip at the top of every page so you can
// reach any room from any room without going back to the main popup.
(function() {
  // Which page are we on? (used to highlight current + hide self-link)
  var _currentPage = location.pathname.split('/').pop().replace('.html', '');

  // All navigable rooms — id, label, page, gate (state field that must be truthy, or null for always-visible)
  var NAV_ROOMS = [
    { id: 'todo',         label: '\u{1F4CB} TODO',       page: 'popup.html',         gate: null },
    { id: 'factory',      label: '\u{1F3ED} FACTORY',    page: 'factory.html',        gate: null },
    { id: 'gallery',      label: '\u{1F3A8} GALLERY',    page: 'gallery.html',        gate: null },
    { id: 'house',        label: '\u{1F3E0} HOUSE',      page: 'house.html',          gate: null },
    { id: 'brokerage',    label: '\u{1F4C8} BROKERAGE',  page: 'brokerage.html',      gate: 'brokerageUnlocked' },
    { id: 'research',     label: '\u{1F52C} RESEARCH',   page: 'research.html',       gate: 'researchLabUnlocked' },
    { id: 'incinerator',  label: '\u{1F525} INCINERATOR',page: 'incinerator.html',    gate: 'incineratorUnlocked' },
    { id: 'ratiocinatory',label: '\u{1F4DC} BUREAU',     page: 'ratiocinatory.html',  gate: 'ratiocinatoryUnlocked' },
    { id: 'tax-office',   label: '\u{1F3E6} TAX OFFICE', page: 'tax-office.html',     gate: 'taxOfficeUnlocked' },
    { id: 'timeline',     label: '\u{1F4C5} TIMELINE',   page: 'timeline.html',       gate: null },
    { id: 'badges',       label: '\u{1F3C5} BADGES',     page: 'badges.html',         gate: null }
  ];

  function injectNavBar() {
    // Read state to check gates
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get('pixelFocusState', function(d) {
      var state = (d && d.pixelFocusState) || {};

      // Build the nav bar
      var bar = document.createElement('div');
      bar.id = 'pfNavBar';
      bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;background:rgba(0,0,0,0.3);border-bottom:1px solid rgba(255,255,255,0.08);position:sticky;top:0;z-index:9990;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';

      NAV_ROOMS.forEach(function(room) {
        // Check gate
        if (room.gate && !state[room.gate]) return;

        var isCurrent = (_currentPage === room.id) ||
                        (_currentPage === 'popup' && room.id === 'todo');

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = room.label;
        btn.title = room.page.replace('.html', '');
        btn.style.cssText = 'font-size:7px;font-family:"Press Start 2P",monospace;padding:4px 7px;border-radius:4px;cursor:pointer;transition:all 0.12s;border:1px solid ' +
          (isCurrent ? 'rgba(78,205,196,0.4)' : 'rgba(255,255,255,0.1)') + ';background:' +
          (isCurrent ? 'rgba(78,205,196,0.15)' : 'rgba(255,255,255,0.04)') + ';color:' +
          (isCurrent ? '#4ecdc4' : 'rgba(255,255,255,0.55)') + ';box-shadow:0 2px 0 rgba(0,0,0,0.25);position:relative;top:0;';

        if (isCurrent) {
          btn.style.cursor = 'default';
          btn.style.pointerEvents = 'none';
        } else {
          btn.addEventListener('mouseenter', function() {
            btn.style.background = 'rgba(120,180,255,0.15)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'rgba(120,180,255,0.3)';
            btn.style.transform = 'translateY(-1px)';
          });
          btn.addEventListener('mouseleave', function() {
            btn.style.background = 'rgba(255,255,255,0.04)';
            btn.style.color = 'rgba(255,255,255,0.55)';
            btn.style.borderColor = 'rgba(255,255,255,0.1)';
            btn.style.transform = 'none';
          });
          btn.addEventListener('mousedown', function() {
            btn.style.transform = 'translateY(2px)';
            btn.style.boxShadow = 'none';
          });
          btn.addEventListener('mouseup', function() {
            btn.style.transform = 'none';
            btn.style.boxShadow = '0 2px 0 rgba(0,0,0,0.25)';
          });
          btn.addEventListener('click', function() {
            try {
              chrome.runtime.sendMessage({ type: 'pf-open', path: room.page });
            } catch(_) {
              // Fallback: direct tab create
              try { chrome.tabs.create({ url: chrome.runtime.getURL(room.page) }); } catch(_2) {}
            }
          });
        }

        bar.appendChild(btn);
      });

      // Insert at the very top of body
      if (document.body.firstChild) {
        document.body.insertBefore(bar, document.body.firstChild);
      } else {
        document.body.appendChild(bar);
      }
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNavBar);
  } else {
    injectNavBar();
  }
})();
