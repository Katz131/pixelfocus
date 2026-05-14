// Tutorial Walkthrough — Spotlight click-through tutorial
// v3.23.228 — Multi-page support + tutorial-only lockout + viewport overflow + pet selectors + force-visible for hidden elements
(function() {
  var _tutBtn = document.getElementById('tutorialBtn');
  if (!_tutBtn) return;

  // Detect which page we're on
  var _pagePath = location.pathname.replace(/^.*\//, '').replace(/\.html$/, '') || 'popup';
  if (_pagePath === 'popup' || _pagePath === '') _pagePath = 'popup';

  // Tutorial-only access: arrived via ?tutorial=1 on a game page.
  // lockout-guard.js lets us through, but we enforce: tutorial must
  // auto-open, and closing it boots you out if no grace period.
  var _tutorialOnlyMode = (_pagePath !== 'popup' && window.location.search.indexOf('tutorial=1') !== -1);

  var _CATS_ALL = window.TUTORIAL_CATEGORIES || [];

  // Filter categories to this page only
  var _CATS = [];
  for (var ci = 0; ci < _CATS_ALL.length; ci++) {
    var catPage = _CATS_ALL[ci].page || 'popup';
    if (catPage === _pagePath) _CATS.push(_CATS_ALL[ci]);
  }

  var _allItems = [];
  var _catStartIdx = [];
  for (var c = 0; c < _CATS.length; c++) {
    _catStartIdx.push(_allItems.length);
    var cat = _CATS[c];
    for (var i = 0; i < cat.items.length; i++) {
      _allItems.push({ cat: cat, item: cat.items[i], catIdx: c, itemIdx: i });
    }
  }
  if (!_allItems.length) return;

  var _currentIdx = 0;
  var _isOpen = false;
  var _menuOpen = false;

  function _brief(text) {
    if (!text) return '';
    var m = text.match(/^[^.!]+[.!]/);
    var s = m ? m[0] : text;
    if (s.length > 110) s = s.substring(0, 107) + '...';
    return s;
  }

  // ══════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  // STATE ACCESS — works on popup (window._pixelState) AND
  // game pages (chrome.storage.local) where _pixelState doesn't exist
  // ══════════════════════════════════════════════════════════════
  var _cachedState = null;

  function _getState() {
    if (window._pixelState) return window._pixelState;
    return _cachedState || {};
  }

  function _loadStateAsync(cb) {
    if (window._pixelState) { cb(); return; }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('pixelFocusState', function(r) {
        _cachedState = (r && r.pixelFocusState) || {};
        cb();
      });
    } else {
      cb();
    }
  }

  // COMPLETION TRACKING
  function _isCatCompleted(catId) {
    var s = _getState();
    return !!(s.tutorialCompleted && s.tutorialCompleted[catId]);
  }

  function _markCatCompleted(catId) {
    var s = _getState();
    if (!s.tutorialCompleted) s.tutorialCompleted = {};
    if (!s.tutorialCompleted[catId]) {
      s.tutorialCompleted[catId] = true;
      if (window.saveState) {
        window.saveState();
      } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ pixelFocusState: s });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // GATE CHECK — mirrors _isCatUnlocked in app.js
  // On non-popup pages, if you're ON the page you've unlocked it.
  // ══════════════════════════════════════════════════════════════
  function _isCatUnlocked(cat) {
    if (!cat.gate) return true;
    // If you're on a game page, most categories are auto-unlocked since
    // being on the page means you have access. BUT spoiler gates still
    // apply — progression-gated content must be checked even on game pages
    // so late-game tutorials don't reveal upgrades/areas the player hasn't seen.
    var _spoilerGates = ['landbridge','petSetup','employees','research','incinerator','bureau','esoteric','ratiocinatory','ledger'];
    if (_pagePath !== 'popup' && _spoilerGates.indexOf(cat.gate) === -1) return true;
    var s = _getState();
    if (s.tutorialUnlocked && s.tutorialUnlocked[cat.id]) return true;
    switch (cat.gate) {
      case 'factory':       return !!s.hasSeenFactoryIntro;
      case 'market':        return !!(s.marketingLevel && s.marketingLevel > 0);
      case 'employees':     return !!(s.employeesLevel && s.employeesLevel > 0);
      case 'brokerage':     return !!s.brokerageUnlocked;
      case 'house':         return !!s.hasSeenFactoryIntro;
      case 'ratiocinatory': return !!s.ratiocinatoryUnlocked;
      case 'bureau':        return !!(s.bureauAgents && s.bureauAgents.length > 0);
      case 'research':      return !!(s.complianceFrameworkLevel && s.complianceFrameworkLevel > 0);
      case 'incinerator':   return !!s.materialsIncineratorUnlocked;
      case 'esoteric':      return !!(s.complianceFrameworkLevel && s.complianceFrameworkLevel >= 3);
      case 'landbridge':    return !!s.landBridgeBuilt;
      case 'petSetup':      return !!(s.housePetTypes && s.housePetTypes.length > 0);
      case 'ledger':        return !!s.ledgerRevealed;
      default:              return false;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ELEMENT SELECTOR MAPS — per page
  // ══════════════════════════════════════════════════════════════

  // --- POPUP selectors ---
  var _SEL_POPUP = {
    'ft-duration':'#sessionPicker','ft-start':'#startBtn','ft-display':'#timerDisplay',
    'ft-countdown':'#timerDisplay','ft-pause':'#startBtn','ft-complete':'.timer-section',
    'ft-blocks':'#blockProgress',
    'tm-add':'#taskInput','tm-complete':'.task-checkbox','tm-delete':'.task-delete',
    'tm-focus':'.task-select-btn','tm-expand':'.task-text',
    'st-today':'#todayBlocks','st-alltime':'#lifetimeBlocks','st-streak':'#streakCount',
    'st-xp':'#todayXPDisplay','st-focus':'#lifetimeTime','st-money':'#coinsDisplay',
    'st-blocks':'#blockCounter',
    'xp-earn':'.xp-section','xp-curve':'.xp-bar','xp-titles':'#levelTitle',
    'xp-ladder':'#levelBadge','xp-bar':'.xp-bar',
    'cb-chain':'#comboDisplay','cb-xp':'#comboDisplay','cb-coins':'#comboDisplay',
    'cb-timer':'#comboDisplay','cb-display':'#comboDisplay',
    'sk-owl':'#streakCount','sk-real':'#streakCount','sk-bonus':'#streakBonus',
    'sk-celeb':'#streakCount',
    'px-canvas':'#blockCounter','px-colors':'#blockCounter','px-gallery':'#blockCounter',
    'px-preview':'#miniCanvas','px-avatar':'#profileAvatar',
    'pj-multi':'.tabs-row','pj-all':'.tabs-row','pj-overflow':'.tabs-row',
    'pj-rotate':'.tabs-row','pj-stale':'.tabs-row',
    'pr-list':'#prioritySection','pr-recur':'#prioritySection',
    'pr-block':'#prioritySection','pr-drag':'#prioritySection',
    'td-list':'#todayTasksSection','td-stages':'#todayTasksSection','td-recur':'#todayTasksSection',
    'dq-gen':'#questCard','dq-types':'#questCard','dq-steady':'#questCard',
    'dq-ambitious':'#questCard','dq-rewards':'#questCard','dq-tiles':'#questTileGrid',
    'dq-streak':'#questCard','dq-celeb':'#questCard',
    'bg-system':'#badgesBtn','bg-celeb':'#badgesBtn','bg-page':'#badgesBtn',
    // Friends — proper selectors
    'fr-id':'#profileIdDisplay','fr-search':'#addFriendInput',
    'fr-requests':'#friendRequestsSection,#friendsListSection','fr-list':'#friendsListSection',
    'fr-perms':'#friendsListSection','fr-remote':'#friendsListSection',
    'fr-inbox':'#morseInboxPanel,#friendInboxBadge,#addFriendInput','fr-challenge':'#challengePanel,#friendsListSection',
    'fr-morse':'#morseTelegraphBanner,#friendsListSection','fr-profile':'#levelProfileBtn',
    'fr-mirror':'#levelProfileBtn',
    'sv-tiers':'#surveillanceTierPicker','sv-strikes':'#surveillancePanel',
    'sv-promise':'#surveillancePanel','sv-penalty':'#surveillancePanel',
    'sv-ct-block':'#surveillancePanel','sv-ct-daily':'#surveillancePanel',
    'sv-watchlist':'#surveillancePanel','sv-winddown':'#sleepTimeBtn',
    'sv-ct-idle':'#surveillancePanel',
    'sl-wizard':'#sleepTimeBtn','sl-remind':'#sleepTimeBtn',
    'sl-morning':'#sleepTimeBtn','sl-streak':'#sleepTimeBtn',
    'tl-timeline':'#focusTimelinePanel','tl-blocked':'#addBlockedTimeBtn',
    'tl-preblock':'#addBlockedTimeBtn','tl-weekly':'#focusTimelinePanel',
    'tl-donow':'.timer-section','tl-lockout':'#houseBtn',
    'tl-morning':'.header','tl-idle':'.timer-section',
    'tl-increm':'.tabs-row','tl-stale':'.tabs-row',
    'tl-welcome':'.header','tl-recur':'.tabs-row',
    'tl-remind':'#dailyRemindersPanel','tl-bundles':'#taskInput',
    'tl-settings':'#settingsBtn',
    'mk-card':'#marketCard','mk-slider':'#marketPriceSlider',
    'mk-yield':'#marketYieldVal','mk-events':'#marketEventTicker','mk-intro':'#marketCard',
    // Settings — inside settingsModal
    'set-safe':'#safeRefreshBtn','set-restore':'#restoreBackupBtn','set-import':'#importBackupBtn',
    'set-ct-test':'#ctTestBtn','set-ct-setup':'#ctSetupToggle',
    'set-ct-auto':'#coldTurkeyToggle','set-ct-daily':'#coldTurkeyDailyToggle',
    'set-ct-idle':'#coldTurkeyIdleToggle','set-ct-winddown':'#windDownCTToggle',
    'set-ct-block':'#coldTurkeyBlockName',
    'set-nag-toggle':'#siteNagToggle','set-nag-sites':'#nagSiteInput',
    'set-nag-export':'#nagExportBtn','set-nag-test':'#nagTestBtn',
    'set-nag-scope':'#multiBrowserToggle',
    'set-vol-toggle':'#volumeMuteEnabled','set-vol-times':'#volumeMuteHour',
    'set-vol-install':'#volumeInstallInfoBtn',
    // Building overview tutorials — point at their nav buttons
    'bf-what':'#factoryBtn','bf-open':'#factoryBtn','bf-tut':'#factoryBtn',
    'bh-what':'#houseBtn','bh-open':'#houseBtn','bh-tut':'#houseBtn',
    'bb-what':'#brokerageBtn','bb-open':'#brokerageBtn','bb-tut':'#brokerageBtn',
    // Employees — point at factory since that's where the upgrade lives
    'em-named':'#factoryBtn','em-wages':'#coinsDisplay','em-layoff':'#factoryBtn',
    'em-trickle':'#coinsDisplay',
    // Incinerator — on popup page in dustbin area
    'in-dustbin':'#dustbin','in-unlock':'#dustBurnRow','in-burn':'#burnDustBtn','in-timer':'#dustBurnTimer',
    // Ratiocinatory — accessed from factory
    'ra-overview':'#factoryBtn','ra-resources':'#factoryBtn','ra-aspects':'#factoryBtn',
    'ra-patsy':'#factoryBtn','ra-inst':'#factoryBtn','ra-amok':'#factoryBtn',
    // Bureau, Research, Esoteric — accessed from factory
    'bu-what':'#factoryBtn','bu-ops':'#factoryBtn','bu-stats':'#factoryBtn',
    're-what':'#factoryBtn','re-exp':'#factoryBtn',
    'es-what':'#factoryBtn','es-levels':'#factoryBtn','es-badge':'#factoryBtn',
  };

  // --- BROKERAGE selectors ---
  var _SEL_BROKERAGE = {
    'brk-wallet':'#walletCoins','brk-cash':'#brokerageCash',
    'brk-deposit':'#depositBtn','brk-portfolio':'#portfolioVal',
    'brk-pl':'#totalPL','brk-acumen':'#acumenVal',
    'brk-stocks-list':'#stocksPanel .section-title','brk-stocks-buy':'#stocksList',
    'brk-stocks-sell':'#portfolioView',
    'brk-funds-list':'#fundsPanel .section-title','brk-funds-fees':'#fundsList',
    'brk-bonds-types':'#bondsPanel .section-title','brk-bonds-mature':'#bondsList',
    'brk-bonds-buy':'#bondsPanel .section-title',
    'brk-crypto-list':'#cryptoPanel .section-title','brk-crypto-risk':'#cryptoList',
    'brk-limit-set':'#limitOrdersPanel .section-title','brk-limit-list':'#limitOrdersList',
    'brk-port-view':'#portfolioPanel .section-title','brk-port-sell':'#portfolioView',
    'brk-upg-list':'#upgradesPanel .section-title','brk-upg-acumen':'#upgradesList',
  };

  // --- FACTORY selectors ---
  var _SEL_FACTORY = {
    'fac-money':'#moneyCounter','fac-lifetime':'#lifetimeMoney',
    'fac-income':'#streakRate','fac-console':'#msgConsole',
    'fac-grid':'#upgradeGrid',
    'fac-autoloom':'#upgradeGrid','fac-marketing':'#upgradeGrid',
    'fac-dye':'#upgradeGrid','fac-qc':'#upgradeGrid',
    'fac-hire':'#upgradeGrid','fac-legal':'#upgradeGrid',
    'fac-lobby':'#upgradeGrid','fac-2nd':'#upgradeGrid',
    'fac-mktshare':'#upgradeGrid','fac-ai':'#upgradeGrid',
    'fac-research':'#upgradeGrid','fac-leader':'#upgradeGrid',
    'fac-world':'#upgradeGrid',
    'fac-pools':'#ledgerRows','fac-penalty':'#ledgerRows',
    'fac-subs':'#upgradeGrid','fac-ledger':'#ledgerRows',
    'fac-back':'#backBtn','fac-house':'#houseNavBtn',
    'fac-gallery':'#galleryNavBtn','fac-employees':'#employeesNavBtn',
    'fac-research-nav':'#researchNavBtn','fac-bureau':'#bureauNavBtn',
    'fac-incinerator':'#incineratorNavBtn',
  };

  // --- HOUSE selectors ---
  var _SEL_HOUSE = {
    'hou-hero':'#houseChapterEyebrow','hou-mood':'#houseMoodLine',
    'hou-spouse':'#spouseCount','hou-kids':'#kidCount',
    'hou-pets':'#petCount','hou-condition':'#conditionValue',
    'hou-events':'#houseEventCards','hou-event-btn':'.event-card-btn',
    'hou-vitals':'#vitalsPanel','hou-comms':'#commsRows',
    'hou-wellbeing':'#wbFill',
    'hou-back':'#toPopupBtn','hou-loom':'#toLoomBtn',
    'hou-factory':'#toFactoryBtn','hou-begin':'#beginWorkBtn',
    'hou-denial':'#houseDenialView',
    'hou-pet-sprite':'#petSpriteRow,#petCount',
    'hou-pet-mood':'#petSpriteRow,#houseMoodLine',
    'hou-pet-bowl':'#petSpriteRow,#petCount',
    'hou-pet-feed':'#petFeedBtn,#petSpriteRow,#petCount',
    'hou-pet-events':'#houseEventCards',
  };

  // --- GALLERY selectors ---
  var _SEL_GALLERY = {
    'gc-grid':'#pixelCanvas','gc-paint':'.tools-panel','gc-erase':'.tools-panel',
    'gc-clear':'#clearCanvas','gc-info':'#sizeLabel',
    'gp-colors':'#palette','gp-locked':'#palette',
    'gp-dye':'#milestoneList','gp-milestones':'#milestoneList',
    'gl-expand':'#upgradeList','gl-sizes':'#sizeLabel',
    'gl-master':'#masterLoomPanel',
    'gs-save':'#saveToGallery','gs-export':'#exportBtn',
    'gs-tab':'[data-view="gallery"]','gs-sell':'#galleryGrid',
    'gs-stars':'#galleryGrid',
    'gx-overview':'[data-view="practice"]','gx-traits':'#practiceFilePanel',
    'gx-stats':'#practiceStatsPanel','gx-sparkline':'#practiceRatingsBody',
    'gx-assessment':'#practiceStateOfBeingPanel',
    'gn-tabs':'.view-tab','gn-stats':'.top-stats',
    'gn-back':'#backBtn','gn-console':'#msgConsole',
    'gn-tutorial':'#tutorialBtn',
  };

  // --- EMPLOYEES selectors ---
  var _SEL_EMPLOYEES = {
    'emp-hero':'#empHeroCount','emp-sub':'#empHeroSub',
    'emp-chips':'#empPoolBreakdown',
    'emp-search':'#empSearch',
    'emp-filter-all':'.filter-btn[data-filter="all"]',
    'emp-filter-new':'.filter-btn[data-filter="new"]',
    'emp-filter-est':'.filter-btn[data-filter="established"]',
    'emp-filter-flag':'.filter-btn[data-filter="flagged"]',
    'emp-sort':'#empSort',
    'emp-card':'#empRoster','emp-name':'#empRoster',
    'emp-role':'#empRoster','emp-bio':'#empRoster',
    'emp-diss':'#empRoster','emp-stress':'#empRoster',
    'emp-nav-factory':'#backToFactoryBtn',
    'emp-nav-house':'#toHouseBtn',
    'emp-nav-research':'#toResearchBtn',
    'emp-nav-bureau':'#toBureauBtn',
    'emp-nav-incinerator':'#toIncineratorBtn',
    'emp-nav-tracker':'#backToTrackerBtn',
    'emp-nav-tutorial':'#tutorialBtn',
    'emp-empty':'#empEmpty,#empRoster',
  };

  // Pick the right selector map for this page
  var _SEL, _PSEL;
  if (_pagePath === 'brokerage') {
    _SEL = _SEL_BROKERAGE; _PSEL = {};
  } else if (_pagePath === 'factory') {
    _SEL = _SEL_FACTORY; _PSEL = {};
  } else if (_pagePath === 'house') {
    _SEL = _SEL_HOUSE; _PSEL = {};
  } else if (_pagePath === 'gallery') {
    _SEL = _SEL_GALLERY; _PSEL = {};
  } else if (_pagePath === 'employees') {
    _SEL = _SEL_EMPLOYEES; _PSEL = {};
  } else {
    _SEL = _SEL_POPUP;
    // No prefix fallbacks needed — all selectors are explicit
    _PSEL = {};
  }

  function _getTargetEl(id) {
    var sel = _SEL[id];
    if (!sel && _PSEL) {
      for (var p in _PSEL) { if (id.indexOf(p) === 0) { sel = _PSEL[p]; break; } }
    }
    if (!sel) return null;
    // Support comma-separated fallback selectors (e.g. '#primary,#fallback')
    var parts = sel.split(',');
    for (var si = 0; si < parts.length; si++) {
      var el = document.querySelector(parts[si].trim());
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (el.classList && el.classList.contains('stat-val')) return el.parentElement;
      return el;
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════════
  // SETTINGS MODAL HANDLING (popup only)
  // ══════════════════════════════════════════════════════════════
  function _ensureModalOpen(cat) {
    if (_pagePath !== 'popup') return;
    if (!cat || !cat.modal) return;
    var modal = document.getElementById(cat.modal);
    if (modal && modal.style.display === 'none') {
      // Open the settings modal
      if (typeof openSettingsModal === 'function') {
        openSettingsModal();
      } else {
        modal.style.display = 'flex';
      }
    }
  }

  function _ensureModalClosed() {
    if (_pagePath !== 'popup') return;
    var modal = document.getElementById('settingsModal');
    if (modal && modal.style.display !== 'none') {
      if (typeof closeSettingsModal === 'function') {
        closeSettingsModal();
      } else {
        modal.style.display = 'none';
      }
    }
    var ladderModal = document.getElementById('titleLadderModal');
    if (ladderModal && ladderModal.style.display !== 'none') {
      ladderModal.style.display = 'none';
    }
  }

  // ══════════════════════════════════════════════════════════════
  // COLLAPSIBLE SECTION EXPANSION (popup)
  // ══════════════════════════════════════════════════════════════
  function _ensureSectionExpanded(itemId) {
    if (_pagePath !== 'popup') return;
    // Map item prefixes to collapsible header text matches
    var sectionMap = {
      'fr-': 'FRIENDS',
      'sv-': 'SURVEILLANCE',
    };
    var prefix = null;
    for (var p in sectionMap) {
      if (itemId.indexOf(p) === 0) { prefix = p; break; }
    }
    if (!prefix) return;
    var keyword = sectionMap[prefix];
    var headers = document.querySelectorAll('.collapsible-header');
    for (var h = 0; h < headers.length; h++) {
      if (headers[h].textContent.indexOf(keyword) >= 0) {
        var body = headers[h].nextElementSibling;
        if (body && body.classList.contains('collapsible-body') && body.style.display === 'none') {
          body.classList.add('open');
          body.style.display = 'block';
          var arrow = headers[h].querySelector('.collapse-arrow');
          if (arrow) arrow.style.transform = 'rotate(180deg)';
        }
        break;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // FORCE HIDDEN ELEMENTS VISIBLE FOR TUTORIAL
  // ══════════════════════════════════════════════════════════════
  var _forcedVisibleEls = [];
  var _forceVisibleMap = {
    'fr-morse': '#morseTelegraphBanner',
    'fr-challenge': '#challengePanel',
    'fr-inbox': '#morseInboxPanel',
  };
  function _ensureElementVisible(itemId) {
    // Restore any previously forced elements
    for (var i = 0; i < _forcedVisibleEls.length; i++) {
      _forcedVisibleEls[i].el.style.display = _forcedVisibleEls[i].orig;
    }
    _forcedVisibleEls = [];
    var sel = _forceVisibleMap[itemId];
    if (!sel) return;
    var el = document.querySelector(sel);
    if (!el) return;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none') {
      _forcedVisibleEls.push({ el: el, orig: el.style.display });
      el.style.display = 'block';
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BROKERAGE TAB SWITCHING
  // ══════════════════════════════════════════════════════════════
  function _ensureTabVisible(itemId) {
    if (_pagePath !== 'brokerage') return;
    // Map item IDs to tab panel names
    var tabMap = {
      'brk-stocks-list':'stocks','brk-stocks-buy':'stocks',
      'brk-funds-list':'funds','brk-funds-fees':'funds',
      'brk-bonds-types':'bonds','brk-bonds-mature':'bonds','brk-bonds-buy':'bonds',
      'brk-crypto-list':'crypto','brk-crypto-risk':'crypto',
      'brk-limit-set':'limitOrders','brk-limit-list':'limitOrders',
      'brk-port-view':'portfolio','brk-port-sell':'portfolio',
      'brk-upg-list':'upgrades','brk-upg-acumen':'upgrades',
    };
    var panel = tabMap[itemId];
    if (!panel) return;
    var tabBtn = document.querySelector('[data-panel="' + panel + '"]');
    if (tabBtn) tabBtn.click();
  }

  // ══════════════════════════════════════════════════════════════
  // BUILD UI
  // ══════════════════════════════════════════════════════════════

  // Dark overlay
  var _overlay = document.createElement('div');
  _overlay.id = 'tutOverlayBlock';
  _overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:100000;background:rgba(0,0,0,0.55);display:none;';
  document.body.appendChild(_overlay);

  // ── CATEGORY MENU ──
  var _menu = document.createElement('div');
  _menu.id = 'tutMenu';
  _menu.style.cssText = 'position:fixed;z-index:100010;top:50%;left:50%;transform:translate(-50%,-50%);width:92%;max-width:420px;max-height:80vh;background:linear-gradient(160deg,#1e1840,#150f2a);border:1px solid #3a2a5a;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.7);display:none;overflow:hidden;pointer-events:auto;';
  document.body.appendChild(_menu);

  // Menu header
  var _menuHeader = document.createElement('div');
  _menuHeader.style.cssText = 'padding:16px 16px 8px;border-bottom:1px solid #2a2845;display:flex;align-items:center;justify-content:space-between;';
  _menu.appendChild(_menuHeader);

  var _menuTitleWrap = document.createElement('div');
  _menuTitleWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
  _menuHeader.appendChild(_menuTitleWrap);

  var _menuTitleIcon = document.createElement('span');
  _menuTitleIcon.textContent = '🎓';
  _menuTitleIcon.style.cssText = 'font-size:18px;';
  _menuTitleWrap.appendChild(_menuTitleIcon);

  var _menuTitle = document.createElement('span');
  _menuTitle.style.cssText = "font-family:'Courier New',monospace;font-size:11px;color:#4ecdc4;letter-spacing:2px;font-weight:bold;";
  // Show page-specific title
  var _pageTitles = { popup: 'TUTORIAL', brokerage: 'BROKERAGE TUTORIAL', factory: 'FACTORY TUTORIAL', house: 'HOUSE TUTORIAL' };
  _menuTitle.textContent = _pageTitles[_pagePath] || 'TUTORIAL';
  _menuTitleWrap.appendChild(_menuTitle);

  // Progress counter in header
  var _menuProgress = document.createElement('span');
  _menuProgress.style.cssText = "font-family:'Courier New',monospace;font-size:9px;color:#4a4a6e;";
  _menuTitleWrap.appendChild(_menuProgress);

  var _menuClose = document.createElement('button');
  _menuClose.type = 'button';
  _menuClose.textContent = '✕';
  _menuClose.style.cssText = "background:none;border:none;color:#5a5a7e;font-size:16px;cursor:pointer;padding:4px 8px;font-family:'Courier New',monospace;border-radius:6px;transition:background 0.15s,color 0.15s;";
  _menuHeader.appendChild(_menuClose);
  _menuClose.addEventListener('mouseenter', function() { _menuClose.style.background = 'rgba(255,100,100,0.15)'; _menuClose.style.color = '#ff6b6b'; });
  _menuClose.addEventListener('mouseleave', function() { _menuClose.style.background = 'none'; _menuClose.style.color = '#5a5a7e'; });

  // Scrollable list
  var _menuList = document.createElement('div');
  _menuList.style.cssText = 'padding:8px 10px 14px;overflow-y:auto;max-height:calc(80vh - 60px);';
  _menu.appendChild(_menuList);

  // ── DUOLINGO 3D BUTTON HELPER ──
  function _duo3dBtn(opts) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:6px;border-radius:12px;cursor:pointer;position:relative;transition:transform 0.1s;';

    var inner = document.createElement('div');
    inner.style.cssText = "padding:10px 14px;border-radius:12px;display:flex;align-items:center;gap:10px;" +
      "background:" + opts.bg + ";" +
      "border:2px solid " + (opts.borderColor || 'transparent') + ";" +
      "box-shadow:0 4px 0 " + opts.shadow + ";" +
      "transition:box-shadow 0.1s,transform 0.1s,background 0.12s;";
    wrap.appendChild(inner);

    wrap.addEventListener('mouseenter', function() {
      inner.style.background = opts.hoverBg || opts.bg;
      inner.style.boxShadow = '0 6px 0 ' + (opts.hoverShadow || opts.shadow);
      wrap.style.transform = 'translateY(-2px) scale(1.03)';
      if (typeof SFX !== 'undefined' && SFX.hover) try { SFX.hover(); } catch(_) {}
    });
    wrap.addEventListener('mouseleave', function() {
      inner.style.background = opts.bg;
      inner.style.boxShadow = '0 4px 0 ' + opts.shadow;
      wrap.style.transform = 'translateY(0) scale(1)';
    });
    wrap.addEventListener('mousedown', function() {
      inner.style.boxShadow = '0 1px 0 ' + opts.shadow;
      wrap.style.transform = 'translateY(3px) scale(0.97)';
      if (typeof SFX !== 'undefined' && SFX.click) try { SFX.click(); } catch(_) {}
    });
    wrap.addEventListener('mouseup', function() {
      inner.style.boxShadow = '0 4px 0 ' + opts.shadow;
      wrap.style.transform = 'translateY(0) scale(1)';
    });
    wrap.addEventListener('mouseleave', function() {
      inner.style.boxShadow = '0 4px 0 ' + opts.shadow;
      wrap.style.transform = 'translateY(0) scale(1)';
    });

    wrap._inner = inner;
    return wrap;
  }

  // ── CHECKMARK BADGE ──
  function _checkBadge() {
    var s = document.createElement('span');
    s.style.cssText = 'flex-shrink:0;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#4ecdc4,#00ff88);display:flex;align-items:center;justify-content:center;font-size:12px;color:#0d0b1a;font-weight:bold;box-shadow:0 2px 6px rgba(78,205,196,0.4);';
    s.textContent = '✓';
    return s;
  }

  // ── LOCK BADGE ──
  function _lockBadge() {
    var s = document.createElement('span');
    s.style.cssText = 'flex-shrink:0;width:22px;height:22px;border-radius:50%;background:rgba(90,90,126,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;';
    s.textContent = '🔒';
    return s;
  }

  // ── ITEM COUNT PILL ──
  function _countPill(n) {
    var s = document.createElement('span');
    s.style.cssText = "flex-shrink:0;font-family:'Courier New',monospace;font-size:8px;color:#8a7fb4;background:rgba(138,127,180,0.12);padding:2px 8px;border-radius:10px;";
    s.textContent = n + ' steps';
    return s;
  }

  // Divider label helper
  function _addDivider(text) {
    var d = document.createElement('div');
    d.style.cssText = "padding:12px 14px 6px;font-family:'Courier New',monospace;font-size:8px;color:#4a4a6e;letter-spacing:1.5px;text-transform:uppercase;";
    d.textContent = text;
    _menuList.appendChild(d);
  }

  // Build category rows
  function _buildMenu() {
    _menuList.innerHTML = '';

    // Count completed
    var completedCount = 0;
    var unlockedCount = 0;
    for (var cc = 0; cc < _CATS.length; cc++) {
      if (_isCatUnlocked(_CATS[cc])) {
        unlockedCount++;
        if (_isCatCompleted(_CATS[cc].id)) completedCount++;
      }
    }
    _menuProgress.textContent = completedCount + '/' + unlockedCount + ' complete';

    // "Start from the beginning" big green button
    var allWrap = _duo3dBtn({
      bg: 'linear-gradient(135deg,rgba(78,205,196,0.15),rgba(0,255,136,0.08))',
      shadow: 'rgba(78,205,196,0.3)',
      hoverBg: 'linear-gradient(135deg,rgba(78,205,196,0.25),rgba(0,255,136,0.15))',
      hoverShadow: 'rgba(78,205,196,0.4)',
      borderColor: 'rgba(78,205,196,0.5)',
    });
    var allIcon = document.createElement('span');
    allIcon.style.cssText = 'font-size:18px;flex-shrink:0;';
    allIcon.textContent = '▶';
    allWrap._inner.appendChild(allIcon);

    var allText = document.createElement('span');
    allText.style.cssText = "font-family:'Courier New',monospace;font-size:10px;color:#4ecdc4;letter-spacing:0.5px;font-weight:bold;flex:1;";
    allText.textContent = 'START FROM THE BEGINNING';
    allWrap._inner.appendChild(allText);

    allWrap._inner.appendChild(_countPill(_allItems.length));

    allWrap.addEventListener('click', function(e) {
      e.stopPropagation();
      _startWalkthrough(0);
    });
    _menuList.appendChild(allWrap);

    // Sort categories
    var unlocked = [];
    var locked = [];
    for (var c = 0; c < _CATS.length; c++) {
      if (_isCatUnlocked(_CATS[c])) { unlocked.push(c); }
      else { locked.push(c); }
    }

    // Render unlocked section
    if (unlocked.length > 0) {
      _addDivider('UNLOCKED');
      for (var u = 0; u < unlocked.length; u++) {
        _menuList.appendChild(_buildCatRow(unlocked[u], true));
      }
    }

    // Render locked section
    if (locked.length > 0) {
      _addDivider('LOCKED — progress further to unlock');
      for (var l = 0; l < locked.length; l++) {
        _menuList.appendChild(_buildCatRow(locked[l], false));
      }
    }
  }

  function _buildCatRow(catIndex, isUnlocked) {
    var cat = _CATS[catIndex];
    var completed = isUnlocked && _isCatCompleted(cat.id);

    if (isUnlocked) {
      var colors = completed
        ? { bg: 'rgba(78,205,196,0.06)', shadow: 'rgba(78,205,196,0.15)', hoverBg: 'rgba(78,205,196,0.12)', borderColor: 'rgba(78,205,196,0.2)' }
        : { bg: 'rgba(168,85,247,0.06)', shadow: 'rgba(168,85,247,0.2)', hoverBg: 'rgba(168,85,247,0.14)', borderColor: 'rgba(168,85,247,0.15)' };

      var wrap = _duo3dBtn(colors);
      wrap.setAttribute('data-cat-id', cat.id);

      var icon = document.createElement('span');
      icon.style.cssText = 'font-size:18px;flex-shrink:0;';
      icon.textContent = cat.icon;
      wrap._inner.appendChild(icon);

      var col = document.createElement('div');
      col.style.cssText = 'flex:1;min-width:0;overflow:hidden;';

      var name = document.createElement('div');
      name.style.cssText = "font-family:'Courier New',monospace;font-size:10px;color:" + (completed ? '#4ecdc4' : '#c8bfe0') + ";font-weight:bold;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      name.textContent = cat.name;
      col.appendChild(name);

      var sub = document.createElement('div');
      sub.style.cssText = "font-family:'Courier New',monospace;font-size:8px;color:#5a5a7e;margin-top:1px;";
      sub.textContent = cat.items.length + ' steps';
      col.appendChild(sub);

      wrap._inner.appendChild(col);

      if (completed) {
        wrap._inner.appendChild(_checkBadge());
      } else {
        var arrow = document.createElement('span');
        arrow.style.cssText = "flex-shrink:0;font-family:'Courier New',monospace;font-size:14px;color:#5a5a7e;transition:color 0.15s,transform 0.15s;";
        arrow.textContent = '›';
        wrap._inner.appendChild(arrow);
        wrap.addEventListener('mouseenter', function() { arrow.style.color = '#a855f7'; arrow.style.transform = 'translateX(2px)'; });
        wrap.addEventListener('mouseleave', function() { arrow.style.color = '#5a5a7e'; arrow.style.transform = 'translateX(0)'; });
      }

      (function(ci) {
        wrap.addEventListener('click', function(e) {
          e.stopPropagation();
          _startWalkthrough(_catStartIdx[ci]);
        });
      })(catIndex);

      return wrap;
    } else {
      var lRow = document.createElement('div');
      lRow.style.cssText = "margin-bottom:4px;border-radius:12px;";
      lRow.setAttribute('data-cat-id', cat.id);

      var lInner = document.createElement('div');
      lInner.style.cssText = "padding:10px 14px;border-radius:12px;display:flex;align-items:center;gap:10px;background:rgba(30,24,64,0.5);border:1px solid rgba(58,42,90,0.3);opacity:0.45;";

      var lIcon = document.createElement('span');
      lIcon.style.cssText = 'font-size:18px;flex-shrink:0;filter:grayscale(1);';
      lIcon.textContent = '🔒';
      lInner.appendChild(lIcon);

      var lCol = document.createElement('div');
      lCol.style.cssText = 'flex:1;min-width:0;overflow:hidden;';

      var lName = document.createElement('div');
      lName.style.cssText = "font-family:'Courier New',monospace;font-size:10px;color:#5a5a7e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      lName.textContent = '???';
      lCol.appendChild(lName);

      var lSub = document.createElement('div');
      lSub.style.cssText = "font-family:'Courier New',monospace;font-size:8px;color:#3a3a5e;margin-top:1px;";
      lSub.textContent = '? steps';
      lCol.appendChild(lSub);

      lInner.appendChild(lCol);
      lInner.appendChild(_lockBadge());
      lRow.appendChild(lInner);
      return lRow;
    }
  }

  // ── HIGHLIGHT CLONE (non-interactive snapshot) ──
  var _clone = document.createElement('div');
  _clone.id = 'tutHighlight';
  _clone.style.cssText = 'position:fixed;z-index:100002;border:2px solid rgba(78,205,196,0.7);border-radius:6px;box-shadow:0 0 18px rgba(78,205,196,0.3);pointer-events:none;display:none;overflow:hidden;transition:top 0.3s ease,left 0.3s ease,width 0.3s ease,height 0.3s ease;';
  document.body.appendChild(_clone);

  // ── WALKTHROUGH CARD ──
  var _card = document.createElement('div');
  _card.id = 'tutWalkCard';
  _card.style.cssText = 'position:fixed;z-index:100010;width:90%;max-width:340px;background:linear-gradient(160deg,#1e1840,#150f2a);border:1px solid #3a2a5a;border-radius:12px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,0.7);display:none;pointer-events:auto;';
  document.body.appendChild(_card);

  var _headerRow = document.createElement('div');
  _headerRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
  _card.appendChild(_headerRow);

  var _catIcon = document.createElement('span');
  _catIcon.style.cssText = 'font-size:14px;';
  _headerRow.appendChild(_catIcon);

  var _catLabel = document.createElement('span');
  _catLabel.style.cssText = "font-family:'Courier New',monospace;font-size:9px;color:#7c6baa;letter-spacing:1.5px;";
  _headerRow.appendChild(_catLabel);

  var _counter = document.createElement('span');
  _counter.style.cssText = "margin-left:auto;font-family:'Courier New',monospace;font-size:8px;color:#4a4a6e;white-space:nowrap;";
  _headerRow.appendChild(_counter);

  var _itemLabel = document.createElement('div');
  _itemLabel.style.cssText = "font-family:'Courier New',monospace;font-size:11px;color:#e0d4ff;font-weight:bold;margin-bottom:3px;";
  _card.appendChild(_itemLabel);

  var _hintRow = document.createElement('div');
  _hintRow.style.cssText = "font-family:'Courier New',monospace;font-size:9px;color:#ffb43c;margin-bottom:3px;display:none;";
  _card.appendChild(_hintRow);

  var _desc = document.createElement('div');
  _desc.style.cssText = "font-family:'Courier New',monospace;font-size:10px;color:#8a7fb4;line-height:1.5;margin-bottom:8px;";
  _card.appendChild(_desc);

  var _btnRow = document.createElement('div');
  _btnRow.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;align-items:center;';
  _card.appendChild(_btnRow);

  function _mkBtn(text, accent) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = text;
    var base = "font-family:'Courier New',monospace;font-size:8px;padding:5px 12px;border-radius:5px;cursor:pointer;transition:transform 0.12s;pointer-events:auto;";
    b.style.cssText = accent
      ? base + 'border:1px solid #4ecdc4;background:rgba(78,205,196,0.12);color:#4ecdc4;'
      : base + 'border:1px solid #2a2845;background:#1a1530;color:#5a5a7e;';
    b.addEventListener('mouseenter', function() { b.style.transform = 'scale(1.05)'; });
    b.addEventListener('mouseleave', function() { b.style.transform = 'scale(1)'; });
    return b;
  }

  var _btnMenu = _mkBtn('☰ MENU', false);
  var _btnBack = _mkBtn('◀', false);
  var _btnNext = _mkBtn('NEXT ▶', true);
  _btnRow.appendChild(_btnMenu);
  _btnRow.appendChild(_btnBack);
  _btnRow.appendChild(_btnNext);

  var _progWrap = document.createElement('div');
  _progWrap.style.cssText = 'margin-top:8px;background:#0d0b1a;border-radius:3px;height:2px;overflow:hidden;';
  _card.appendChild(_progWrap);
  var _progFill = document.createElement('div');
  _progFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#4ecdc4,#00ff88);border-radius:3px;transition:width 0.3s ease;';
  _progWrap.appendChild(_progFill);

  var _dotsRow = document.createElement('div');
  _dotsRow.style.cssText = 'display:flex;gap:2px;justify-content:center;margin-top:6px;flex-wrap:wrap;';
  _card.appendChild(_dotsRow);

  // ══════════════════════════════════════════════════════════════
  // FREEZE / UNFREEZE
  // ══════════════════════════════════════════════════════════════
  var _frozenStyle = null;
  function _freezeUI() {
    _frozenStyle = document.createElement('style');
    _frozenStyle.id = 'tutFreezeStyle';
    _frozenStyle.textContent = 'body > *:not(#tutOverlayBlock):not(#tutHighlight):not(#tutWalkCard):not(#tutMenu):not(.top-bar) { pointer-events: none !important; } #tutOverlayBlock, #tutWalkCard, #tutWalkCard *, #tutMenu, #tutMenu *, .top-bar, .top-bar * { pointer-events: auto !important; }';
    document.head.appendChild(_frozenStyle);
  }
  function _unfreezeUI() {
    if (_frozenStyle && _frozenStyle.parentNode) {
      _frozenStyle.parentNode.removeChild(_frozenStyle);
      _frozenStyle = null;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // DEMO POPUP WINDOWS (surveillance nag, promise, penalty)
  // ══════════════════════════════════════════════════════════════
  var _demoWin = null;
  var _demoUrl = '';

  function _closeDemoWin() {
    if (_demoWin && !_demoWin.closed) {
      try { _demoWin.close(); } catch(e) {}
    }
    _demoWin = null;
    _demoUrl = '';
  }

  function _openDemoWin(demoPath) {
    if (!demoPath) { _closeDemoWin(); return; }
    var fullUrl = '';
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      fullUrl = chrome.runtime.getURL(demoPath);
    } else {
      fullUrl = demoPath;
    }
    // Don't reopen if same URL is already showing
    if (_demoWin && !_demoWin.closed && _demoUrl === fullUrl) return;
    _closeDemoWin();

    // Full pages (factory, house, brokerage) use the same runtime message
    // that the nav buttons use — background.js handles dedup and focus
    var isFullPage = /^(factory|house|brokerage)\.html/.test(demoPath);

    if (isFullPage && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'pf-open', path: demoPath });
      _demoUrl = fullUrl;
    } else {
      // Small popup window for surveillance test pages
      var w = 400, h = 600;
      var left = Math.max(0, Math.round(screen.width / 2 - w / 2 + 220));
      var top = Math.max(0, Math.round(screen.height / 2 - h / 2));
      _demoWin = window.open(fullUrl, '_tutorialDemo', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes');
      _demoUrl = fullUrl;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CLONE HIGHLIGHT
  // ══════════════════════════════════════════════════════════════
  function _showClone(targetEl) {
    if (!targetEl) { _clone.style.display = 'none'; return; }
    var rect = targetEl.getBoundingClientRect();
    var pad = 4;
    _clone.style.display = 'block';
    _clone.style.top = (rect.top - pad) + 'px';
    _clone.style.left = (rect.left - pad) + 'px';
    _clone.style.width = (rect.width + pad * 2) + 'px';
    _clone.style.height = (rect.height + pad * 2) + 'px';
    _clone.innerHTML = '';
    // For canvas elements, don't clone content (cloneNode doesn't copy pixel data)
    // Just show the highlight border around the real element
    if (targetEl.tagName === 'CANVAS') {
      _clone.style.background = 'transparent';
      return;
    }
    try {
      var c = targetEl.cloneNode(true);
      // Disable all interactive children inside clone
      var btns = c.querySelectorAll('button,input,select,a,[onclick]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].disabled = true;
        btns[i].removeAttribute('onclick');
        btns[i].style.pointerEvents = 'none';
        btns[i].style.cursor = 'default';
      }
      c.style.cssText = 'pointer-events:none;cursor:default;margin:0;width:100%;height:100%;';
      var cs = window.getComputedStyle(targetEl);
      c.style.background = cs.background;
      c.style.borderRadius = cs.borderRadius;
      c.style.padding = cs.padding;
      c.style.overflow = 'hidden';
      _clone.appendChild(c);
    } catch(e) { _clone.innerHTML = ''; }
  }

  // ══════════════════════════════════════════════════════════════
  // POSITIONING
  // ══════════════════════════════════════════════════════════════
  var _posRetry = null;
  var _posRetryCount = 0;
  function _positionCard(targetEl, itemId) {
    if (_posRetry) { clearTimeout(_posRetry); _posRetry = null; }

    // Nav hint detection (popup only)
    if (_pagePath === 'popup') {
      var navIds = ['#factoryBtn','#houseBtn','#brokerageBtn','#ratiocinatoryBtn','#badgesBtn','#levelProfileBtn','#galleryBtn'];
      var sel = _SEL[itemId];
      if (!sel && _PSEL) { for (var p in _PSEL) { if (itemId.indexOf(p) === 0) { sel = _PSEL[p]; break; } } }
      var isNavHint = sel && navIds.indexOf(sel) >= 0;
      if (isNavHint && targetEl) {
        _hintRow.textContent = '▸ Found in ' + targetEl.textContent.trim().replace(/[^\w\s$&§]/g,'').trim();
        _hintRow.style.display = 'block';
      } else { _hintRow.style.display = 'none'; }
    } else {
      _hintRow.style.display = 'none';
    }

    if (!targetEl) {
      _clone.style.display = 'none';
      _card.style.left = '50%'; _card.style.top = '50%';
      _card.style.transform = 'translate(-50%, -50%)';
      return;
    }
    _card.style.transform = 'none';
    var rect = targetEl.getBoundingClientRect();
    var vh = window.innerHeight; var vw = window.innerWidth; var pad = 4;

    var elHeight = rect.bottom - rect.top;
    if (elHeight > vh - 70) {
      // Element is taller than viewport — don't clone, just center the card
      _clone.style.display = 'none';
      _card.style.left = '50%'; _card.style.top = '50%';
      _card.style.transform = 'translate(-50%, -50%)';
      return;
    }
    if (rect.top < 50 || rect.bottom > vh - 20) {
      if (_posRetryCount >= 3) {
        // Give up scrolling — center the card instead
        _posRetryCount = 0;
        _clone.style.display = 'none';
        _card.style.left = '50%'; _card.style.top = '50%';
        _card.style.transform = 'translate(-50%, -50%)';
        return;
      }
      _posRetryCount++;
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      _posRetry = setTimeout(function() { _showClone(targetEl); _positionCard(targetEl, itemId); }, 400);
      return;
    }
    _posRetryCount = 0;
    _showClone(targetEl);
    var cardW = Math.min(340, vw * 0.90);
    var cardH = _card.offsetHeight || 160;
    var gap = 10;
    var cardLeft = Math.max(8, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - 8));
    var below = rect.bottom + pad + gap;
    var above = rect.top - pad - gap - cardH;

    if (below + cardH + 10 < vh) {
      _card.style.top = below + 'px'; _card.style.left = cardLeft + 'px';
    } else if (above > 10) {
      _card.style.top = above + 'px'; _card.style.left = cardLeft + 'px';
    } else {
      _card.style.top = '50%'; _card.style.left = '50%';
      _card.style.transform = 'translate(-50%, -50%)';
    }
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER WALKTHROUGH STEP
  // ══════════════════════════════════════════════════════════════
  function _render() {
    if (_currentIdx < 0) _currentIdx = 0;
    if (_currentIdx >= _allItems.length) _currentIdx = _allItems.length - 1;
    var entry = _allItems[_currentIdx];

    // Open settings modal if this category needs it
    _ensureModalOpen(entry.cat);

    // Expand collapsible sections if needed (popup)
    _ensureSectionExpanded(entry.item.id);

    // Force hidden elements visible for tutorial spotlight
    _ensureElementVisible(entry.item.id);

    // Switch brokerage tab if needed
    _ensureTabVisible(entry.item.id);

    _catIcon.textContent = entry.cat.icon;
    _catLabel.textContent = entry.cat.name.toUpperCase();
    _counter.textContent = (_currentIdx + 1) + '/' + _allItems.length;
    _itemLabel.textContent = entry.item.label;
    _desc.textContent = _brief(entry.item.desc);

    _progFill.style.width = ((_currentIdx + 1) / _allItems.length * 100) + '%';
    _btnBack.style.display = _currentIdx === 0 ? 'none' : '';

    var catEnd = entry.catIdx < _CATS.length - 1 ? _catStartIdx[entry.catIdx + 1] - 1 : _allItems.length - 1;
    var isLastInCat = _currentIdx === catEnd;
    var isLastOverall = _currentIdx === _allItems.length - 1;

    if (isLastOverall || isLastInCat) {
      _btnNext.textContent = 'COMPLETE ✓';
    } else {
      _btnNext.textContent = 'NEXT ▶';
    }

    _dotsRow.innerHTML = '';
    for (var c = 0; c < _CATS.length; c++) {
      var dot = document.createElement('span');
      var isActive = c === entry.catIdx;
      dot.style.cssText = 'width:' + (isActive ? '12px' : '5px') + ';height:5px;border-radius:3px;background:' + (isActive ? '#4ecdc4' : '#1a1a2e') + ';transition:width 0.3s,background 0.3s;cursor:pointer;';
      dot.title = _CATS[c].name;
      (function(ci) {
        dot.addEventListener('click', function(e) {
          e.stopPropagation();
          _currentIdx = _catStartIdx[ci];
          _render();
        });
      })(c);
      _dotsRow.appendChild(dot);
    }

    // Remove any previous navigate button
    var oldNavBtn = _card.querySelector('.tut-nav-btn');
    if (oldNavBtn) oldNavBtn.remove();

    // Handle demo popup windows (surveillance nag, promise timer, penalty timer)
    if (entry.item.demo) {
      _openDemoWin(entry.item.demo);
      // No highlight needed — the element is in the demo window
      _clone.style.display = 'none';
      _card.style.left = '50%'; _card.style.top = '50%';
      _card.style.transform = 'translate(-50%, -50%)';
      _hintRow.textContent = '▸ Demo window opened — see the popup beside this page';
      _hintRow.style.display = 'block';
    } else if (entry.cat.navigate) {
      // Building categories — show centered card with "OPEN [PAGE]" button
      _clone.style.display = 'none';
      _card.style.left = '50%'; _card.style.top = '50%';
      _card.style.transform = 'translate(-50%, -50%)';
      _hintRow.style.display = 'none';

      var navBtn = document.createElement('button');
      navBtn.className = 'tut-nav-btn';
      var pageName = entry.cat.name.toUpperCase();
      navBtn.textContent = 'OPEN ' + pageName + ' →';
      navBtn.style.cssText = "display:block;width:100%;margin-top:10px;padding:10px 16px;border:none;border-radius:10px;background:linear-gradient(135deg,#4ecdc4,#00ff88);color:#0a0a23;font-family:'Press Start 2P','Courier New',monospace;font-size:9px;font-weight:bold;letter-spacing:1px;cursor:pointer;box-shadow:0 3px 0 #2a9d8f,0 4px 8px rgba(0,0,0,0.3);transition:transform 0.1s,box-shadow 0.1s;";
      navBtn.addEventListener('mousedown', function() {
        navBtn.style.transform = 'translateY(2px)';
        navBtn.style.boxShadow = '0 1px 0 #2a9d8f,0 2px 4px rgba(0,0,0,0.3)';
      });
      navBtn.addEventListener('mouseup', function() {
        navBtn.style.transform = '';
        navBtn.style.boxShadow = '';
      });
      navBtn.addEventListener('mouseleave', function() {
        navBtn.style.transform = '';
        navBtn.style.boxShadow = '';
      });
      (function(path) {
        navBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          _close();
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'pf-open', path: path });
          }
        });
      })(entry.cat.navigate);
      // Insert after the description
      _desc.parentNode.insertBefore(navBtn, _desc.nextSibling);
    } else {
      _closeDemoWin();
      // Fire action callback if the item has one (e.g. open a modal)
      if (entry.item.action) {
        try {
          var fn = window[entry.item.action];
          if (typeof fn === 'function') fn();
        } catch(_) {}
      }
      // Small delay to let modal/tab switch settle, then find element
      setTimeout(function() {
        var targetEl = _getTargetEl(entry.item.id);
        _positionCard(targetEl, entry.item.id);
      }, entry.item.action ? 200 : (entry.cat.modal ? 150 : 30));
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SHOW MENU / START WALKTHROUGH / CLOSE
  // ══════════════════════════════════════════════════════════════
  function _showMenu() {
    _menuOpen = true;
    _freezeUI();
    _overlay.style.display = 'block';
    _card.style.display = 'none';
    _clone.style.display = 'none';
    _ensureModalClosed();
    _buildMenu();
    _menu.style.display = 'block';
    _isOpen = true;
  }

  function _startWalkthrough(startIdx) {
    _menuOpen = false;
    _menu.style.display = 'none';
    _card.style.display = 'block';
    _currentIdx = startIdx;
    _render();
  }

  function _backToMenu() {
    _menuOpen = true;
    _card.style.display = 'none';
    _clone.style.display = 'none';
    _closeDemoWin();
    _ensureModalClosed();
    _buildMenu();
    _menu.style.display = 'block';
  }

  function _close() {
    _isOpen = false;
    _menuOpen = false;
    _overlay.style.display = 'none';
    _card.style.display = 'none';
    _clone.style.display = 'none';
    _menu.style.display = 'none';
    _closeDemoWin();
    _ensureModalClosed();
    _unfreezeUI();
    // Restore any elements forced visible during tutorial
    for (var fv = 0; fv < _forcedVisibleEls.length; fv++) {
      _forcedVisibleEls[fv].el.style.display = _forcedVisibleEls[fv].orig;
    }
    _forcedVisibleEls = [];
    if (_posRetry) { clearTimeout(_posRetry); _posRetry = null; }

    // Tutorial-only mode: closing the tutorial checks grace period.
    // If no grace period is active, boot the player back to the popup.
    // Same rules as lockout-guard.js — grace period is the ONLY way
    // to stay on a game page without the tutorial open.
    if (_tutorialOnlyMode) {
      try {
        chrome.storage.local.get('pixelFocusState', function(result) {
          var s = result.pixelFocusState || {};
          var now = Date.now();
          if (s.gameLockGraceUntil && now < s.gameLockGraceUntil) return; // grace active, stay
          // No grace period — close this page, go back to popup
          try {
            chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
          } catch(_) {}
          setTimeout(function() {
            try { window.close(); } catch(_) {}
          }, 200);
        });
      } catch(_) {}
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PUBLIC: jump straight to a category by id (e.g. 'morse-telegraph')
  // ══════════════════════════════════════════════════════════════
  window._openTutorialTo = function(catId) {
    for (var ci = 0; ci < _CATS.length; ci++) {
      if (_CATS[ci].id === catId) {
        _loadStateAsync(function() {
          _showMenu();
          _startWalkthrough(_catStartIdx[ci]);
        });
        return;
      }
    }
    // Category not found on this page — just open the menu
    _loadStateAsync(function() { _showMenu(); });
  };

  // ══════════════════════════════════════════════════════════════
  // EVENTS
  // ══════════════════════════════════════════════════════════════
  _tutBtn.addEventListener('click', function(e) {
    e.stopPropagation(); e.preventDefault();
    if (_isOpen) { _close(); return; }
    // Load state from chrome.storage on non-popup pages before showing menu
    _loadStateAsync(function() { _showMenu(); });
  });

  _overlay.addEventListener('click', function(e) {
    e.stopPropagation(); e.preventDefault();
    _close();
  });

  _menu.addEventListener('click', function(e) { e.stopPropagation(); });
  _card.addEventListener('click', function(e) { e.stopPropagation(); });

  _menuClose.addEventListener('click', function(e) {
    e.stopPropagation(); e.preventDefault();
    _close();
  });

  _btnMenu.addEventListener('click', function(e) {
    e.stopPropagation(); e.preventDefault();
    _backToMenu();
  });

  _btnBack.addEventListener('click', function(e) {
    e.stopPropagation(); e.preventDefault();
    if (_currentIdx > 0) { _currentIdx--; _render(); }
  });

  _btnNext.addEventListener('click', function(e) {
    e.stopPropagation(); e.preventDefault();
    var entry = _allItems[_currentIdx];
    var catEnd = entry.catIdx < _CATS.length - 1 ? _catStartIdx[entry.catIdx + 1] - 1 : _allItems.length - 1;
    var isLastInCat = _currentIdx === catEnd;

    if (isLastInCat) {
      _markCatCompleted(entry.cat.id);
      // v3.23.307: Always return to menu at end of category
      // Previously auto-advanced into next category if already completed,
      // which caused tutorial to show irrelevant content for other sections
      _backToMenu();
    } else {
      _currentIdx++;
      _render();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (!_isOpen) return;
    if (_menuOpen) {
      if (e.key === 'Escape') { e.preventDefault(); _close(); }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); _btnNext.click(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); _btnBack.click(); }
    if (e.key === 'Escape') { e.preventDefault(); _backToMenu(); }
  });

  var _scrollTimer = null;
  window.addEventListener('scroll', function() {
    if (!_isOpen || _menuOpen) return;
    if (_scrollTimer) clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(function() {
      var entry = _allItems[_currentIdx];
      var t = _getTargetEl(entry.item.id);
      _showClone(t);
      _positionCard(t, entry.item.id);
    }, 100);
  }, true);
  window.addEventListener('resize', function() {
    if (!_isOpen || _menuOpen) return;
    var entry = _allItems[_currentIdx];
    var t = _getTargetEl(entry.item.id);
    _showClone(t);
    _positionCard(t, entry.item.id);
  });

  // Tutorial-only mode: auto-open the tutorial menu on page load.
  // The player arrived via ?tutorial=1 from the popup tutorial's
  // "OPEN [BUILDING] →" button. Open the catalog immediately so
  // they're in the tutorial, not freely browsing a locked page.
  if (_tutorialOnlyMode) {
    // Short delay to let the page render its content underneath first
    setTimeout(function() {
      _loadStateAsync(function() { _showMenu(); });
    }, 500);
  }

  // Expose openCatalog globally so overlays (e.g. morse messenger) can trigger it
  window._openTutorialCatalog = function(jumpToCat) {
    _loadStateAsync(function() {
      _showMenu();
      // If a category ID was provided, auto-expand it after a tick
      if (jumpToCat) {
        setTimeout(function() {
          var el = document.querySelector('[data-cat-id="' + jumpToCat + '"]');
          if (el) { el.click(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }, 150);
      }
    });
  };

})();
