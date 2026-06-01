// =============================================================================
// TAX OFFICE WINDOW — Department of Revenue UI (v3.23.497)
// =============================================================================
// Reads/writes chrome.storage.local (pixelFocusState).
// All tax logic (bill generation, payment, audits) lives in app.js.
// This file handles rendering + user interaction on the Tax Office page.
// =============================================================================

(function() {
  'use strict';

  var state = {};
  var _clockInterval = null;

  // ── Tax bracket data (mirrors app.js TAX_BRACKETS) ──
  var TAX_BRACKETS = [
    { min: 0,           rate: 0,    label: 'Below the radar' },
    { min: 50000,       rate: 0.08, label: 'Cottage assessment' },
    { min: 200000,      rate: 0.15, label: 'Regional levy' },
    { min: 1000000,     rate: 0.22, label: 'Industrial tariff' },
    { min: 10000000,    rate: 0.30, label: 'Corporate extraction' },
    { min: 100000000,   rate: 0.38, label: 'Sovereign tithe' },
    { min: 1000000000,  rate: 0.45, label: 'Imperial tribute' }
  ];

  var EVASION_LABELS = [
    'Clean',
    'Warning issued',
    'Compliance surcharge active',
    'Morale impact',
    'Accounts flagged',
    'Full enforcement'
  ];

  var TREASURY_ALLOCATIONS = [
    { label: 'Municipal thread infrastructure', pct: 34 },
    { label: 'Loom safety inspections', pct: 22 },
    { label: 'The Committee on Committees', pct: 18 },
    { label: 'Administrative refreshments', pct: 15 },
    { label: 'Actual public services', pct: 11 }
  ];

  var DISPATCH_LINES = [
    'The Department of Revenue acknowledges your visit. It has been noted.',
    'Your file is on the desk. It is always on the desk.',
    'The inspector sends regards. The inspector always sends regards.',
    'We notice you have chosen to visit. The Department respects your decision.',
    'Welcome back. Your bill has been waiting. It is very patient.',
    'The Department appreciates punctuality. Punctuality is all we have.',
    'Your contributions fund essential services. Mostly committees about services.',
    'An audit is not currently scheduled. This may change.',
    'The filing cabinet is organized alphabetically, then by dread.',
    'The Department has noted your creative approach to civic obligation.',
    'Please take a number. Your number is the only number.',
    'The clock on the wall is correct. The Department is never late.',
    'Your compliance is appreciated. Your continued compliance is expected.',
    'The inspector was here earlier. The inspector is always here earlier.',
    'Revenue collection is not personal. Revenue collection is never personal.'
  ];

  // ── Helpers ──

  function $(id) { return document.getElementById(id); }

  function fmt(n) {
    if (n == null || isNaN(n)) return '$0';
    n = Math.round(n);
    if (n < 0) return '-$' + Math.abs(n).toLocaleString();
    return '$' + n.toLocaleString();
  }

  function fmtPct(n) {
    return (n * 100).toFixed(1) + '%';
  }

  function timeAgo(ms) {
    var diff = Date.now() - ms;
    var days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days > 0) return days + 'd ago';
    var hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours > 0) return hours + 'h ago';
    return 'just now';
  }

  function timeUntil(ms) {
    var diff = ms - Date.now();
    if (diff <= 0) return 'overdue';
    var days = Math.floor(diff / (24 * 60 * 60 * 1000));
    var hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return days + 'd ' + hours + 'h';
    if (hours > 0) return hours + 'h';
    var mins = Math.floor(diff / (60 * 1000));
    return mins + 'm';
  }

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // ── Clock ──

  function updateClock() {
    var el = $('clock');
    if (!el) return;
    var now = new Date();
    var use24 = state.use24Hour;
    var h = now.getHours();
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    if (use24) {
      el.textContent = String(h).padStart(2, '0') + ':' + m + ':' + s;
    } else {
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      el.textContent = h + ':' + m + ':' + s + ' ' + ampm;
    }
  }

  // ── Tax Bracket Computation (mirrors app.js) ──

  function getTaxBracket() {
    var lifetime = state.lifetimeCoins || 0;
    var bracket = 0;
    for (var i = TAX_BRACKETS.length - 1; i >= 0; i--) {
      if (lifetime >= TAX_BRACKETS[i].min) { bracket = i; break; }
    }
    return bracket;
  }

  function getEffectiveTaxRate() {
    var bracket = getTaxBracket();
    var baseRate = TAX_BRACKETS[bracket].rate;
    if (baseRate === 0) return 0;

    var reduction = 0;
    var legal = state.legalDeptLevel || 0;
    if (legal >= 1) reduction += 0.01;
    if (legal >= 2) reduction += 0.01;
    if (legal >= 3) reduction += 0.02;
    if (legal >= 4) reduction += 0.02;
    if (legal >= 5) reduction += 0.03;

    var lobby = state.lobbyingLevel || 0;
    if (lobby >= 7) reduction += 0.05;
    if (lobby >= 9) return Math.max(0.10, baseRate - reduction);

    var effective = Math.max(0, baseRate - reduction);
    return Math.round(effective * 100) / 100;
  }

  function getAuditRisk() {
    var base = 0.05;
    var overdue = 0, evaded = 0;
    var bills = state.taxBills || [];
    for (var i = 0; i < bills.length; i++) {
      if (bills[i].status === 'overdue') overdue++;
      if (bills[i].status === 'evaded') evaded++;
    }
    var chance = base + (overdue * 0.03) + (evaded * 0.05);
    if (evaded === 0 && overdue === 0) chance -= 0.02;
    return Math.max(0, Math.min(1, chance));
  }

  // ── Render Functions ──

  function renderBalanceStrip() {
    var bal = $('balanceDisplay');
    var coins = state.coins || 0;
    if (bal) {
      bal.textContent = fmt(coins);
      bal.className = coins < 0 ? 'val-bad' : 'val';
    }

    var bracket = getTaxBracket();
    var bEl = $('bracketDisplay');
    if (bEl) bEl.textContent = bracket + ' — ' + TAX_BRACKETS[bracket].label;

    var rEl = $('rateDisplay');
    if (rEl) rEl.textContent = fmtPct(getEffectiveTaxRate());

    var lpEl = $('lifetimePaidDisplay');
    if (lpEl) lpEl.textContent = fmt(state.taxPaidLifetime || 0);
  }

  function renderCurrentBill() {
    var container = $('currentBillContent');
    if (!container) return;

    var bills = state.taxBills || [];
    // Find the most recent unpaid/overdue/evaded bill
    var current = null;
    for (var i = bills.length - 1; i >= 0; i--) {
      if (bills[i].status !== 'paid') {
        current = bills[i];
        break;
      }
    }

    if (!current) {
      container.innerHTML = '<div class="no-bills"><div class="no-bills-icon">&#x2714;</div>' +
        '<div>No outstanding bills. The Department acknowledges your compliance.</div></div>';
      return;
    }

    var total = current.amount + (current.interest || 0);
    var canAfford = (state.coins || 0) >= total;

    var html = '<div class="bill-card current">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div class="bill-amount">' + fmt(total) + '</div>';
    html += '<span class="bill-status ' + current.status + '">' + current.status + '</span>';
    html += '</div>';

    html += '<div class="bill-meta">';
    html += '<span title="When this bill was issued">Issued: ' + timeAgo(current.issuedAt) + '</span>';
    html += '<span title="Time remaining to pay before status changes">Due: ' + timeUntil(current.dueAt) + '</span>';
    if (current.interest > 0) {
      html += '<span style="color:var(--warning);" title="Interest accrued on overdue amount">Interest: ' + fmt(current.interest) + '</span>';
    }
    html += '<span title="Tax bracket and rate when this bill was generated">Rate: ' + fmtPct(current.rate || 0) + ' (Bracket ' + (current.bracket || 0) + ')</span>';
    html += '</div>';

    html += '<div class="bill-actions">';
    html += '<button class="btn btn-pay" data-bill-id="' + current.id + '"' +
      (canAfford ? '' : ' disabled') +
      ' title="' + (canAfford ? 'Pay this bill in full (' + fmt(total) + ').' : 'Insufficient funds. You need ' + fmt(total) + '.') +
      '">PAY ' + fmt(total) + '</button>';

    // Appeal button (only if not yet appealed and not overdue/evaded)
    if (!current.appealFiled && current.status === 'unpaid') {
      html += '<button class="btn btn-appeal" data-appeal-id="' + current.id + '" title="File an appeal on this bill. Complete a focus challenge to reduce the bill by 50%.">APPEAL</button>';
    }
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
  }

  function renderOutstandingBills() {
    var panel = $('outstandingPanel');
    var container = $('outstandingContent');
    if (!panel || !container) return;

    var bills = state.taxBills || [];
    var outstanding = [];
    for (var i = 0; i < bills.length; i++) {
      if (bills[i].status !== 'paid') outstanding.push(bills[i]);
    }

    if (outstanding.length <= 1) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    var html = '';
    var totalAll = 0;

    for (var i = 0; i < outstanding.length; i++) {
      var b = outstanding[i];
      var total = b.amount + (b.interest || 0);
      totalAll += total;
      var canAfford = (state.coins || 0) >= total;

      html += '<div class="bill-card">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<div style="font-family:\'Courier New\',monospace;font-size:18px;color:var(--accent);">' + fmt(total) + '</div>';
      html += '<span class="bill-status ' + b.status + '">' + b.status + '</span>';
      html += '</div>';

      html += '<div class="bill-meta">';
      html += '<span>Issued: ' + timeAgo(b.issuedAt) + '</span>';
      html += '<span>Due: ' + timeUntil(b.dueAt) + '</span>';
      if (b.interest > 0) {
        html += '<span style="color:var(--warning);">Interest: ' + fmt(b.interest) + '</span>';
      }
      html += '</div>';

      html += '<div class="bill-actions">';
      html += '<button class="btn btn-pay" data-bill-id="' + b.id + '"' +
        (canAfford ? '' : ' disabled') +
        ' title="Pay this bill (' + fmt(total) + ')."' +
        '>PAY</button>';
      html += '</div></div>';
    }

    container.innerHTML = html;

    // Update PAY ALL button
    var payAllBtn = $('payAllBtn');
    if (payAllBtn) {
      payAllBtn.textContent = 'PAY ALL — ' + fmt(totalAll);
      payAllBtn.disabled = (state.coins || 0) < totalAll;
      payAllBtn.title = 'Pay all ' + outstanding.length + ' outstanding bills totaling ' + fmt(totalAll) + '.';
    }
  }

  function renderTaxStatus() {
    var bracket = getTaxBracket();
    var baseRate = TAX_BRACKETS[bracket].rate;
    var effRate = getEffectiveTaxRate();
    var auditRisk = getAuditRisk();
    var evasion = state.taxEvasionLevel || 0;

    var sb = $('statusBracket');
    if (sb) sb.textContent = bracket + ' — ' + TAX_BRACKETS[bracket].label;

    var sbr = $('statusBaseRate');
    if (sbr) sbr.textContent = fmtPct(baseRate);

    var ser = $('statusEffRate');
    if (ser) {
      ser.textContent = fmtPct(effRate);
      if (effRate < baseRate) {
        ser.textContent += ' (saved ' + fmtPct(baseRate - effRate) + ')';
        ser.className = 'status-value good';
      } else {
        ser.className = 'status-value';
      }
    }

    var swi = $('statusWeeklyIncome');
    if (swi) swi.textContent = fmt(state.taxableIncomeThisWeek || 0);

    var se = $('statusEvasion');
    if (se) {
      se.textContent = evasion + ' — ' + (EVASION_LABELS[evasion] || 'Unknown');
      se.className = 'status-value' + (evasion === 0 ? ' good' : evasion <= 2 ? ' warn' : ' bad');
    }

    var ef = $('evasionFill');
    if (ef) {
      var pct = (evasion / 5) * 100;
      ef.style.width = pct + '%';
      ef.style.background = evasion === 0 ? 'var(--green)' :
        evasion <= 2 ? 'var(--warning)' : 'var(--danger)';
    }

    var sar = $('statusAuditRisk');
    if (sar) {
      sar.textContent = fmtPct(auditRisk);
      sar.className = 'status-value' + (auditRisk <= 0.05 ? ' good' : auditRisk <= 0.15 ? ' warn' : ' bad');
    }

    // Loopholes
    var ll = $('loopholesList');
    if (ll) {
      var loopholes = [];
      var legal = state.legalDeptLevel || 0;
      if (legal >= 1) loopholes.push('Legal Dept L' + legal + ' (-' + _legalReduction(legal) + '%)');
      var lobby = state.lobbyingLevel || 0;
      if (lobby >= 7) loopholes.push('Regulatory Capture (-5%)');
      if (lobby >= 9) loopholes.push('Rate Cap (max 10%)');
      if (state.taxOffshoreEnabled && lobby >= 5) loopholes.push('Offshore Accounts (-20% income)');
      var charitable = state.taxCharitableDonatedThisWeek || 0;
      if (charitable > 0) loopholes.push('Charitable: ' + fmt(charitable) + ' (2x deduction)');

      if (loopholes.length === 0) {
        ll.innerHTML = '<span class="empty-state">No active loopholes.</span>';
      } else {
        ll.innerHTML = loopholes.map(function(l) {
          return '<span class="loophole-tag">' + l + '</span>';
        }).join(' ');
      }
    }
  }

  function _legalReduction(level) {
    var r = 0;
    if (level >= 1) r += 1;
    if (level >= 2) r += 1;
    if (level >= 3) r += 2;
    if (level >= 4) r += 2;
    if (level >= 5) r += 3;
    return r;
  }

  function renderFilingCabinet() {
    // Offshore toggle
    var offshoreSection = $('offshoreSection');
    if (offshoreSection) {
      var lobby = state.lobbyingLevel || 0;
      offshoreSection.style.display = lobby >= 5 ? 'block' : 'none';
    }
    var offshoreToggle = $('offshoreToggle');
    if (offshoreToggle) {
      offshoreToggle.checked = !!state.taxOffshoreEnabled;
    }
    var offshoreLabel = $('offshoreLabel');
    if (offshoreLabel) {
      offshoreLabel.textContent = state.taxOffshoreEnabled ? 'Offshore accounts ACTIVE — sheltering 20%' : 'Offshore accounts disabled';
      offshoreLabel.style.color = state.taxOffshoreEnabled ? 'var(--green)' : 'var(--text-dim)';
    }

    // Donated this week
    var dtw = $('donatedThisWeek');
    if (dtw) dtw.textContent = fmt(state.taxCharitableDonatedThisWeek || 0);

    // Forgiveness section
    var fs = $('forgivenessSection');
    if (fs) {
      var lobby = state.lobbyingLevel || 0;
      fs.style.display = lobby >= 7 ? 'block' : 'none';
    }
    var fStatus = $('forgivenessStatus');
    if (fStatus) {
      var lastForgive = state.taxForgivenessDate || '';
      if (lastForgive) {
        var ld = new Date(lastForgive + 'T00:00:00');
        var now = new Date();
        var daysSince = Math.floor((now - ld) / (24 * 60 * 60 * 1000));
        if (daysSince < 30) {
          fStatus.textContent = 'Next petition available in ' + (30 - daysSince) + ' days.';
          var fBtn = $('forgivenessBtn');
          if (fBtn) fBtn.disabled = true;
        } else {
          fStatus.textContent = 'Petition available.';
        }
      } else {
        fStatus.textContent = 'Petition available.';
      }
    }
  }

  function renderAuditHistory() {
    var container = $('auditContent');
    if (!container) return;

    var history = state.taxAuditHistory || [];
    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state">No audits on record. The Department is watching.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < Math.min(history.length, 10); i++) {
      var a = history[i];
      var resultLabel = a.result === 'clean' ? 'PASSED' :
        a.result === 'overdue_warning' ? 'WARNING' : 'FINED';
      var resultColor = a.result === 'clean' ? 'var(--green)' :
        a.result === 'overdue_warning' ? 'var(--warning)' : 'var(--danger)';

      html += '<div class="audit-entry">';
      html += '<span>' + (a.date || 'Unknown date') + '</span>';
      html += '<span style="color:' + resultColor + ';font-family:\'Press Start 2P\',monospace;font-size:8px;">' + resultLabel + '</span>';
      if (a.fine > 0) {
        html += '<span style="color:var(--danger);">Fine: ' + fmt(a.fine) + '</span>';
      } else if (a.fine < 0) {
        html += '<span style="color:var(--green);">Refund: ' + fmt(Math.abs(a.fine)) + '</span>';
      }
      html += '</div>';
    }

    container.innerHTML = html;
  }

  function renderTreasury() {
    var container = $('treasuryContent');
    if (!container) return;

    var html = '';
    for (var i = 0; i < TREASURY_ALLOCATIONS.length; i++) {
      var t = TREASURY_ALLOCATIONS[i];
      html += '<div class="treasury-item">';
      html += '<span>' + t.label + '</span>';
      html += '<span class="treasury-pct">' + t.pct + '%</span>';
      html += '</div>';
    }
    container.innerHTML = html;
  }

  function renderAll() {
    renderBalanceStrip();
    renderCurrentBill();
    renderOutstandingBills();
    renderTaxStatus();
    renderFilingCabinet();
    renderAuditHistory();
    renderTreasury();
    try { renderEugene(); } catch(e) { console.error('[TAX] renderEugene CRASHED:', e.message, e.stack); }
    try { applyEugeneReveals(); } catch(e) { console.error('[TAX] applyEugeneReveals CRASHED:', e.message, e.stack); }
  }

  // ── Actions ──

  function handlePayBill(billId) {
    billId = Number(billId);
    var bills = state.taxBills || [];
    for (var i = 0; i < bills.length; i++) {
      var b = bills[i];
      if (b.id === billId && b.status !== 'paid') {
        var total = b.amount + (b.interest || 0);
        state.coins = (state.coins || 0) - total;
        b.status = 'paid';
        state.taxPaidLifetime = (state.taxPaidLifetime || 0) + total;

        // Recount evaded
        var stillEvaded = 0;
        for (var j = 0; j < bills.length; j++) {
          if (bills[j].status === 'evaded') stillEvaded++;
        }
        state.taxEvadedCount = stillEvaded;
        // Recalc evasion level
        if (stillEvaded >= 10) state.taxEvasionLevel = 5;
        else if (stillEvaded >= 5) state.taxEvasionLevel = 4;
        else if (stillEvaded >= 3) state.taxEvasionLevel = 3;
        else if (stillEvaded >= 2) state.taxEvasionLevel = 2;
        else if (stillEvaded >= 1) state.taxEvasionLevel = 1;
        else state.taxEvasionLevel = 0;

        // Handle debt
        if (state.coins < 0) {
          var deficit = -state.coins;
          state.debtBalance = (state.debtBalance || 0) + deficit;
          state.debtCreatedDate = state.debtCreatedDate || todayStr();
          state.coins = 0;
        }

        saveState();
        renderAll();
        showToast('Tax bill paid: ' + fmt(total) + '. The Department acknowledges your contribution.');
        return;
      }
    }
  }

  function handlePayAll() {
    var bills = state.taxBills || [];
    var unpaid = [];
    for (var i = 0; i < bills.length; i++) {
      if (bills[i].status !== 'paid') unpaid.push(bills[i]);
    }
    for (var i = 0; i < unpaid.length; i++) {
      var b = unpaid[i];
      var total = b.amount + (b.interest || 0);
      state.coins = (state.coins || 0) - total;
      b.status = 'paid';
      state.taxPaidLifetime = (state.taxPaidLifetime || 0) + total;
    }

    // Clear evasion
    state.taxEvadedCount = 0;
    state.taxEvasionLevel = 0;

    // Handle debt
    if (state.coins < 0) {
      var deficit = -state.coins;
      state.debtBalance = (state.debtBalance || 0) + deficit;
      state.debtCreatedDate = state.debtCreatedDate || todayStr();
      state.coins = 0;
    }

    saveState();
    renderAll();
    showToast('All outstanding bills paid. The Department is satisfied. For now.');
  }

  function handleDonate() {
    var input = $('donateAmount');
    if (!input) return;
    var amount = parseInt(input.value, 10);
    if (!amount || amount <= 0) return;
    if (amount > (state.coins || 0)) {
      showToast('Insufficient funds for this donation.');
      return;
    }

    state.coins = (state.coins || 0) - amount;
    state.taxCharitableDonatedThisWeek = (state.taxCharitableDonatedThisWeek || 0) + amount;
    input.value = '';

    saveState();
    renderAll();
    showToast('Donated ' + fmt(amount) + ' to The Weavers’ Benevolent Fund. Taxable income reduced by ' + fmt(amount * 2) + '.');
  }

  function handleOffshoreToggle() {
    var toggle = $('offshoreToggle');
    if (!toggle) return;
    state.taxOffshoreEnabled = toggle.checked;
    saveState();
    renderAll();
    if (state.taxOffshoreEnabled) {
      showToast('Offshore accounts activated. 20% of weekly income will be sheltered.');
    } else {
      showToast('Offshore accounts deactivated.');
    }
  }

  function handleForgiveness() {
    // Find first overdue or evaded bill
    var bills = state.taxBills || [];
    var target = null;
    for (var i = 0; i < bills.length; i++) {
      if (bills[i].status === 'evaded' || bills[i].status === 'overdue') {
        target = bills[i];
        break;
      }
    }

    if (!target) {
      showToast('No overdue or evaded bills to forgive.');
      return;
    }

    target.status = 'paid'; // forgiven
    state.taxForgivenessDate = todayStr();

    // Recount evaded
    var stillEvaded = 0;
    for (var j = 0; j < bills.length; j++) {
      if (bills[j].status === 'evaded') stillEvaded++;
    }
    state.taxEvadedCount = stillEvaded;
    if (stillEvaded >= 10) state.taxEvasionLevel = 5;
    else if (stillEvaded >= 5) state.taxEvasionLevel = 4;
    else if (stillEvaded >= 3) state.taxEvasionLevel = 3;
    else if (stillEvaded >= 2) state.taxEvasionLevel = 2;
    else if (stillEvaded >= 1) state.taxEvasionLevel = 1;
    else state.taxEvasionLevel = 0;

    saveState();
    renderAll();
    showToast('The Department of Revenue has graciously reconsidered your assessment. Bill forgiven.');
  }

  function handleAppeal(billId) {
    billId = Number(billId);
    var bills = state.taxBills || [];
    for (var i = 0; i < bills.length; i++) {
      if (bills[i].id === billId) {
        bills[i].appealFiled = true;
        // Reduce bill by 50%
        bills[i].amount = Math.floor(bills[i].amount * 0.5);
        saveState();
        renderAll();
        showToast('Appeal filed. Bill reduced by 50%. The Department will review your case eventually.');
        return;
      }
    }
  }

  // ── Dispatch Toast ──

  function showToast(msg) {
    var toast = $('dispatchToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() {
      toast.classList.remove('show');
    }, 5000);
  }

  function fireDispatch() {
    if (Math.random() > 0.6) return; // 60% chance
    var line = DISPATCH_LINES[Math.floor(Math.random() * DISPATCH_LINES.length)];
    setTimeout(function() {
      showToast(line);
    }, 5000);
  }

  // ── State I/O ──

  function loadState(cb) {
    chrome.storage.local.get('pixelFocusState', function(result) {
      state = result.pixelFocusState || {};
      if (cb) cb();
    });
  }

  function saveState() {
    chrome.storage.local.set({ pixelFocusState: state });
  }

  // ── Event Wiring ──

  function wireEvents() {
    // Delegated click handler for PAY and APPEAL buttons
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target) return;

      // PAY button
      if (target.classList.contains('btn-pay') && target.dataset.billId) {
        handlePayBill(target.dataset.billId);
        return;
      }

      // APPEAL button
      if (target.classList.contains('btn-appeal') && target.dataset.appealId) {
        handleAppeal(target.dataset.appealId);
        return;
      }
    });

    // EUGENE — hire, lessons, retirement
    document.addEventListener('click', function(e) {
      if (e.target && e.target.id === 'eugeneHireBtn') { handleHireEugene(); return; }
      if (e.target && e.target.id === 'eugeneFireBtn') { handleFireEugene(); return; }
      if (e.target && e.target.dataset && e.target.dataset.lessonId) {
        handleBuyLesson(e.target.dataset.lessonId, parseInt(e.target.dataset.lessonCost, 10));
        return;
      }
      if (e.target && e.target.id === 'eugeneLetRetire') { handleEugeneRetirement('retire'); return; }
      if (e.target && e.target.id === 'eugeneKeep') { handleEugeneRetirement('stay'); return; }
      if (e.target && e.target.dataset && e.target.dataset.quizLesson) {
        handleQuizAnswer(e.target.dataset.quizLesson, parseInt(e.target.dataset.quizAnswer, 10));
        return;
      }
    });

    // PAY ALL
    var payAllBtn = $('payAllBtn');
    if (payAllBtn) {
      payAllBtn.addEventListener('click', function() { handlePayAll(); });
    }

    // DONATE
    var donateBtn = $('donateBtn');
    if (donateBtn) {
      donateBtn.addEventListener('click', function() { handleDonate(); });
    }

    // Enter key on donate input
    var donateInput = $('donateAmount');
    if (donateInput) {
      donateInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') handleDonate();
      });
    }

    // OFFSHORE TOGGLE
    var offshoreToggle = $('offshoreToggle');
    if (offshoreToggle) {
      offshoreToggle.addEventListener('change', function() { handleOffshoreToggle(); });
    }

    // FORGIVENESS
    var forgivenessBtn = $('forgivenessBtn');
    if (forgivenessBtn) {
      forgivenessBtn.addEventListener('click', function() { handleForgiveness(); });
    }

    // BACK button
    var backBtn = $('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({ type: 'pf-open', path: 'popup.html' });
        window.close();
      });
    }

    // Storage changes — keep UI in sync
    chrome.storage.onChanged.addListener(function(changes) {
      if (changes.pixelFocusState && changes.pixelFocusState.newValue) {
        var newState = changes.pixelFocusState.newValue;
        // Preserve local edits by merging carefully
        state.coins = newState.coins != null ? newState.coins : state.coins;
        state.taxBills = newState.taxBills || state.taxBills;
        state.taxEvadedCount = newState.taxEvadedCount != null ? newState.taxEvadedCount : state.taxEvadedCount;
        state.taxEvasionLevel = newState.taxEvasionLevel != null ? newState.taxEvasionLevel : state.taxEvasionLevel;
        state.taxPaidLifetime = newState.taxPaidLifetime != null ? newState.taxPaidLifetime : state.taxPaidLifetime;
        state.taxableIncomeThisWeek = newState.taxableIncomeThisWeek != null ? newState.taxableIncomeThisWeek : state.taxableIncomeThisWeek;
        state.taxCharitableDonatedThisWeek = newState.taxCharitableDonatedThisWeek != null ? newState.taxCharitableDonatedThisWeek : state.taxCharitableDonatedThisWeek;
        state.lifetimeCoins = newState.lifetimeCoins != null ? newState.lifetimeCoins : state.lifetimeCoins;
        state.legalDeptLevel = newState.legalDeptLevel != null ? newState.legalDeptLevel : state.legalDeptLevel;
        state.lobbyingLevel = newState.lobbyingLevel != null ? newState.lobbyingLevel : state.lobbyingLevel;
        state.debtBalance = newState.debtBalance != null ? newState.debtBalance : state.debtBalance;
        state.use24Hour = newState.use24Hour != null ? newState.use24Hour : state.use24Hour;
        state.eugeneHired = newState.eugeneHired != null ? newState.eugeneHired : state.eugeneHired;
        state.eugeneLessons = newState.eugeneLessons || state.eugeneLessons;
        state.eugeneRetirementChoice = newState.eugeneRetirementChoice || state.eugeneRetirementChoice;
        state.eugeneDeathTriggered = newState.eugeneDeathTriggered != null ? newState.eugeneDeathTriggered : state.eugeneDeathTriggered;
        state.eugeneFired = newState.eugeneFired != null ? newState.eugeneFired : state.eugeneFired;
        state.eugeneDeathMorseSent = newState.eugeneDeathMorseSent != null ? newState.eugeneDeathMorseSent : state.eugeneDeathMorseSent;
        state.eugeneQuizzesPassed = newState.eugeneQuizzesPassed || state.eugeneQuizzesPassed;
        renderAll();
      }
    });
  }

  // ── Eugene Strutt — Tax Advisor ──

  var EUGENE_HIRE_COST = 5000;

  var EUGENE_LESSONS = [
    {
      id: 'filing_basics',
      title: 'Filing basics',
      cost: 500,
      teaches: 'In the US, your tax liability is based on taxable income — not gross income. The difference matters. Taxable income is what\u2019s left after deductions, exemptions, and adjustments. Most people overpay because they don\u2019t understand what\u2019s being taxed.',
      benefit: 'Reveals your bracket thresholds and base rates on the Tax Status panel.',
      mechanic: 'Unlocks bracket detail display',
      reveals: ['statusBracket', 'statusBaseRate']
    },
    {
      id: 'standard_deduction',
      title: 'Standard deduction',
      cost: 1500,
      teaches: 'Every US taxpayer gets a standard deduction — $14,600 for single filers in 2024, $29,200 for married filing jointly. This amount comes off the top of your gross income before any tax is calculated. Most people take it because itemizing only makes sense if your deductions exceed this amount.',
      benefit: 'Flat 5% reduction on every weekly tax bill.',
      mechanic: 'billReduction5'
    },
    {
      id: 'marginal_rates',
      title: 'Marginal vs. effective rates',
      cost: 3500,
      teaches: 'The US uses a progressive tax system. You don\u2019t pay 22% on all your income just because you\u2019re in the 22% bracket — you pay 10% on the first $11,600, 12% on the next chunk, and only 22% on income above $47,150. Your effective rate is always lower than your marginal rate. Most people don\u2019t realize this.',
      benefit: 'Reveals your effective rate and weekly taxable income.',
      mechanic: 'Unlocks effective rate + weekly income display',
      reveals: ['statusEffRate', 'statusWeeklyIncome']
    },
    {
      id: 'charitable_giving',
      title: 'Charitable giving strategy',
      cost: 8000,
      teaches: 'Donations to qualified 501(c)(3) organizations are tax-deductible. In practice, bunching multiple years of donations into one year can push you above the standard deduction threshold, making itemizing worthwhile. Donor-advised funds let you take the deduction now and distribute later.',
      benefit: 'Charitable donations now reduce taxable income by 3x instead of 2x.',
      mechanic: 'charitableBoost'
    },
    {
      id: 'business_expenses',
      title: 'Business expense write-offs',
      cost: 18000,
      teaches: 'The IRS allows deduction of ordinary and necessary business expenses — things like equipment, supplies, employee wages, and office costs. The key word is \u201Cordinary\u201D: it has to be common in your industry. You can\u2019t write off a swimming pool as a textile expense.',
      benefit: 'Employee payroll costs now reduce your weekly taxable income.',
      mechanic: 'payrollDeduction'
    },
    {
      id: 'depreciation',
      title: 'Depreciation and Section 179',
      cost: 40000,
      teaches: 'Capital assets — equipment, vehicles, machinery — lose value over time. The IRS lets you deduct that loss through depreciation schedules. Section 179 lets small businesses deduct the full purchase price in the year of purchase instead of spreading it out. For 2024, the limit is $1,220,000.',
      benefit: 'Factory upgrade purchases reduce next week\u2019s taxable income by 20% of the purchase price.',
      mechanic: 'factoryDepreciation'
    },
    {
      id: 'estimated_payments',
      title: 'Quarterly estimated payments',
      cost: 85000,
      teaches: 'If you expect to owe $1,000+ in taxes, the IRS wants quarterly estimated payments (April 15, June 15, September 15, January 15). Miss these and you\u2019ll face an underpayment penalty — even if you pay the full amount by April. The safe harbor: pay 100% of last year\u2019s tax liability in estimated payments.',
      benefit: 'Bills no longer accrue interest for the first 5 days after due date.',
      mechanic: 'gracePeriod'
    },
    {
      id: 'tax_loss_harvesting',
      title: 'Tax-loss harvesting',
      cost: 175000,
      teaches: 'If you sell an investment at a loss, you can use that loss to offset capital gains dollar-for-dollar. If your losses exceed your gains, you can deduct up to $3,000 against ordinary income per year, and carry forward the rest indefinitely. The wash-sale rule prevents you from buying back substantially identical securities within 30 days.',
      benefit: 'Brokerage losses now reduce your weekly tax bill.',
      mechanic: 'harvestingDeduction'
    },
    {
      id: 'retirement_accounts',
      title: 'Tax-advantaged retirement accounts',
      cost: 400000,
      teaches: 'Traditional 401(k) and IRA contributions reduce your current taxable income dollar-for-dollar. For 2024: 401(k) limit is $23,000 ($30,500 if 50+), IRA limit is $7,000 ($8,000 if 50+). Roth accounts don\u2019t give you a deduction now, but withdrawals in retirement are completely tax-free. The math usually favors Roth if you\u2019re in a low bracket now.',
      benefit: 'Shelters an additional 10% of weekly income from taxation.',
      mechanic: 'retirementShelter'
    },
    {
      id: 'audit_defense',
      title: 'Audit preparation and defense',
      cost: 900000,
      teaches: 'Most audits are triggered by statistical anomalies — your return looks different from peers in your income bracket. The IRS audits less than 1% of returns, but the rate climbs with income. Keep records for 3 years minimum (6 if you underreport by 25%+). The best defense is documentation, not avoidance.',
      benefit: 'Audit fines reduced by 50%. Audit risk reduced by 3%.',
      mechanic: 'auditDefense'
    },
    {
      id: 'entity_structure',
      title: 'Business entity structuring',
      cost: 2000000,
      teaches: 'How you structure your business — sole prop, LLC, S-corp, C-corp — determines how income flows to your personal return. S-corps can reduce self-employment tax by splitting income into salary and distributions. The IRS requires \u201Creasonable compensation\u201D so you can\u2019t pay yourself $1 in salary and take $500K in distributions.',
      benefit: 'Effective tax rate reduced by an additional 3%.',
      mechanic: 'entityReduction'
    },
    {
      id: 'estate_planning',
      title: 'Estate and succession planning',
      cost: 5000000,
      teaches: 'The federal estate tax exemption is $13.61 million per person in 2024 ($27.22 million for couples). Below that, nothing is owed. Above it, the rate is 40%. Irrevocable trusts, family LLCs, and grantor retained annuity trusts (GRATs) are the standard tools for reducing exposure. The exemption is set to drop by roughly half in 2026 when the TCJA provisions sunset.',
      benefit: 'Effective tax rate reduced by an additional 5%. Unlocks evasion level and audit risk display.',
      mechanic: 'estateReduction',
      reveals: ['statusEvasion', 'statusAuditRisk']
    }
  ];

  function _eugeneHasLesson(id) {
    return (state.eugeneLessons || []).indexOf(id) !== -1;
  }

  function _eugeneNextLesson() {
    var owned = state.eugeneLessons || [];
    for (var i = 0; i < EUGENE_LESSONS.length; i++) {
      if (owned.indexOf(EUGENE_LESSONS[i].id) === -1) return i;
    }
    return -1; // all purchased
  }

  function _eugeneDiscount() {
    // Each lesson reduces effective tax rate cumulatively — only if quiz passed
    var owned = state.eugeneLessons || [];
    var passed = state.eugeneQuizzesPassed || [];
    var reduction = 0;
    for (var i = 0; i < EUGENE_LESSONS.length; i++) {
      if (owned.indexOf(EUGENE_LESSONS[i].id) !== -1 && passed.indexOf(EUGENE_LESSONS[i].id) !== -1) {
        var m = EUGENE_LESSONS[i].mechanic;
        if (m === "billReduction5") reduction += 0.05;
        if (m === "entityReduction") reduction += 0.03;
        if (m === "estateReduction") reduction += 0.05;
      }
    }
    return reduction;
  }

  function _eugeneShouldReveal(statId) {
    if (!state.eugeneHired) return false;
    var owned = state.eugeneLessons || [];
    var passed = state.eugeneQuizzesPassed || [];
    for (var i = 0; i < EUGENE_LESSONS.length; i++) {
      if (owned.indexOf(EUGENE_LESSONS[i].id) !== -1 && passed.indexOf(EUGENE_LESSONS[i].id) !== -1 && EUGENE_LESSONS[i].reveals) {
        if (EUGENE_LESSONS[i].reveals.indexOf(statId) !== -1) return true;
      }
    }
    return false;
  }


  // v3.23.524: AI management memos — escalating pressure to let Jed go
  var AI_MEMOS = [
    '',
    'A note from Automated Management: "Mr. Strutt\'s filing methods have been noted as predominantly manual. The department\'s analytics suite has offered to assist. Mr. Strutt declined."',
    'A note from Automated Management: "Mr. Strutt\'s quarterly projections lag our automated forecasts by approximately 72 hours. His insistence on double-checking figures by hand has been flagged as a process bottleneck."',
    'A note from Automated Management: "The CFO algorithm has completed its assessment of Mr. Strutt\'s position. His responsibilities have been fully modeled. Continued human oversight of tax operations introduces latency the system cannot justify. We recommend immediate transition."'
  ];

  function _getAiMemo() {
    if (state.eugeneFired || state.eugeneDeathTriggered) return '';
    var aiLevel = state.autoLeadershipLevel || 0;
    if (aiLevel <= 0) return '';
    var memoIdx = Math.min(aiLevel, AI_MEMOS.length - 1);
    return AI_MEMOS[memoIdx] || '';
  }


  function handleFireEugene() {
    if (state.eugeneFired || state.eugeneDeathTriggered) return;
    state.eugeneFired = true;
    saveState();
    renderAll();
    showToast('Eugene Strutt has been released from his contract. He and his wife left for Aspen this morning.');
  }

  // v3.23.525: Jed vitals — health indicators that worsen with lessons
  function _eugeneVitals() {
    if (state.eugeneDeathTriggered) {
      return { hr: "--", bp: "--/--", hrClass: "", bpClass: "" };
    }
    var lessons = (state.eugeneLessons || []).length;
    // Date-based variance so vitals fluctuate day to day
    var dayHash = 0;
    var ds = todayStr();
    for (var i = 0; i < ds.length; i++) { dayHash = ((dayHash << 5) - dayHash) + ds.charCodeAt(i); dayHash |= 0; }
    var variance = ((dayHash & 0x7fffffff) % 11) - 5; // -5 to +5

    var hrBase = 68;
    var hrAdd = Math.round((lessons / 12) * 30); // 0 lessons = 0, 12 lessons = 30
    var hr = hrBase + hrAdd + variance;

    var sysBase = 122;
    var diaBase = 78;
    var sysAdd = Math.round((lessons / 12) * 38);
    var diaAdd = Math.round((lessons / 12) * 18);
    var sys = sysBase + sysAdd + Math.round(variance * 0.8);
    var dia = diaBase + diaAdd + Math.round(variance * 0.4);

    var hrClass = hr >= 90 ? "bad" : hr >= 80 ? "warn" : "ok";
    var bpClass = sys >= 150 ? "bad" : sys >= 140 ? "warn" : "ok";

    return {
      hr: hr + " bpm",
      bp: sys + "/" + dia,
      hrClass: hrClass,
      bpClass: bpClass
    };
  }

  function handleQuizAnswer(lessonId, answerIdx) {
    var quizData = window.EUGENE_QUIZZES ? window.EUGENE_QUIZZES[lessonId] : null;
    if (!quizData) return;
    if (answerIdx === quizData.c) {
      // Correct!
      if (!state.eugeneQuizzesPassed) state.eugeneQuizzesPassed = [];
      if (state.eugeneQuizzesPassed.indexOf(lessonId) === -1) {
        state.eugeneQuizzesPassed.push(lessonId);
      }
      saveState();
      renderAll();
      showToast("Correct! Eugene nods approvingly. Lesson benefit is now active.");
    } else {
      showToast("Incorrect. Eugene suggests reviewing the material and trying again.");
    }
  }

  function renderEugene() {
    console.log('[TAX] renderEugene called, eugenePanel:', !!$('eugenePanel'));
    var panel = $('eugenePanel');
    if (!panel) return;

    // Always show Jed panel (hire prompt or lessons)
    panel.style.display = 'block';

    var container = $('eugeneContent');
    if (!container) return;

    // Not hired yet — show hire prompt
    if (!state.eugeneHired) {
      var canAfford = (state.coins || 0) >= EUGENE_HIRE_COST;
      var html = '<div class="eugene-hire">';
      html += '<div style="font-size:14px;margin-bottom:4px;">Eugene Strutt</div>';
      html += '<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px;">Certified Public Accountant</div>';
      html += '<div class="eugene-hire-desc">Retainer fee covers ongoing consultation. Eugene specializes in U.S. federal tax law and will walk you through how the system actually works — each lesson unlocks a mechanical advantage that directly reduces your weekly tax burden.</div>';
      html += '<button class="btn btn-hire" id="eugeneHireBtn"' + (canAfford ? '' : ' disabled') + ' title="' + (canAfford ? 'Hire Eugene Strutt as your tax advisor for ' + fmt(EUGENE_HIRE_COST) + '.' : 'Insufficient funds. You need ' + fmt(EUGENE_HIRE_COST) + '.') + '">HIRE — ' + fmt(EUGENE_HIRE_COST) + '</button>';
      html += '</div>';
      container.innerHTML = html;
      return;
    }
    // Hired — show lesson progression
    var owned = state.eugeneLessons || [];
    var passed = state.eugeneQuizzesPassed || [];
    var nextIdx = _eugeneNextLesson();
    var html = "";

    // v3.23.523: Vitals — always visible once hired
    var _v = _eugeneVitals();
    html += "<div style=\"display:flex;gap:10px;margin-bottom:12px;\">";
    html += "<div style=\"background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 10px;flex:1;\" title=\"Jed&apos;s resting heart rate. Monitored by company health services.\"><div style=\"font-size:8px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;\">Heart rate</div><div style=\"font-family:&apos;Courier New&apos;,monospace;font-size:14px;" + (_v.hrClass === "bad" ? "color:var(--danger);" : (_v.hrClass === "warn" ? "color:var(--warning);" : "color:var(--accent);")) + "\">" + _v.hr + "</div></div>";
    html += "<div style=\"background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 10px;flex:1;\" title=\"Jed&apos;s blood pressure reading. Monitored by company health services.\"><div style=\"font-size:8px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;\">Blood pressure</div><div style=\"font-family:&apos;Courier New&apos;,monospace;font-size:14px;" + (_v.bpClass === "bad" ? "color:var(--danger);" : (_v.bpClass === "warn" ? "color:var(--warning);" : "color:var(--accent);")) + "\">" + _v.bp + "</div></div>";
    html += "</div>";

    // US Tax Code disclaimer
    html += "<div style=\"font-size:9px;color:var(--text-dim);margin-bottom:10px;padding:4px 8px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.15);border-radius:4px;\">U.S. Tax Code \u2014 Jed&apos;s advice is based on current federal tax law.</div>";

    // Progress bar (morse-style)
    html += "<div style=\"display:flex;gap:3px;margin-bottom:12px;\">";
    for (var i = 0; i < EUGENE_LESSONS.length; i++) {
      var isDone = owned.indexOf(EUGENE_LESSONS[i].id) !== -1;
      var isPassed = passed.indexOf(EUGENE_LESSONS[i].id) !== -1;
      var isNext = (i === nextIdx);
      var bg = (isDone && isPassed) ? "#4ecdc4" : isDone ? "#c9a84c" : (isNext ? "#ffd700" : "#222");
      var border = isNext ? "2px solid #fff" : ((isDone && isPassed) ? "1px solid #3a8a80" : isDone ? "1px solid #8a7530" : "1px solid #333");
      html += "<div style=\"flex:1;height:10px;background:" + bg + ";border-radius:4px;border:" + border + ";transition:all 0.15s;\" title=\"" + EUGENE_LESSONS[i].title + (isDone && isPassed ? " (learned)" : isDone ? " (quiz pending)" : (isNext ? " (next)" : " (locked)")) + "\"></div>";
    }
    html += "</div>";
    html += "<div style=\"font-size:9px;color:var(--text-dim);text-align:center;margin-bottom:14px;\">" + owned.length + " / " + EUGENE_LESSONS.length + " LESSONS</div>";

    // AI Management memo + TERMINATE button
    var _aiMemo = _getAiMemo();
    if (_aiMemo) {
      html += "<div style=\"font-size:9px;color:var(--text-dim);margin-bottom:8px;padding:6px 8px;background:rgba(255,80,80,0.06);border:1px solid rgba(255,80,80,0.15);border-radius:4px;line-height:1.5;\">" + _aiMemo + "</div>";
      html += "<button class=\"btn\" id=\"eugeneFireBtn\" style=\"background:var(--danger);color:#fff;font-size:9px;margin-bottom:14px;padding:4px 12px;\" title=\"Terminate Eugene Strutt&apos;s contract. His lessons remain but no new ones can be purchased.\">TERMINATE CONTRACT</button>";
    }

    // Fired state
    if (state.eugeneFired) {
      html += "<div style=\"font-size:10px;color:var(--text-dim);margin-bottom:14px;padding:8px;background:rgba(255,80,80,0.06);border:1px solid rgba(255,80,80,0.12);border-radius:4px;font-style:italic;\">Eugene Strutt has been released from his contract. He and his wife left for Aspen this morning.</div>";
    }

    // Death state — AI's announcement
    if (state.eugeneDeathTriggered) {
      html += "<div style=\"margin-bottom:14px;padding:12px;background:rgba(100,100,100,0.08);border:1px solid rgba(100,100,100,0.15);border-radius:6px;\">";
      html += "<div style=\"font-size:9px;color:var(--text-dim);margin-bottom:6px;font-family:monospace;text-transform:uppercase;letter-spacing:1px;\">Memo from AI Management</div>";
      html += "<div style=\"font-size:12px;color:var(--text);line-height:1.6;font-style:italic;\">\"It is with regret that we inform you of the passing of Eugene Strutt. Mr. Strutt died in a skiing accident near Aspen, Colorado on Saturday. Services will not be held. His accounts have been transferred to automated management.\"</div>";
      html += "</div>";
      html += "<div style=\"font-size:10px;color:var(--warning);padding:6px 8px;background:rgba(255,136,68,0.06);border:1px solid rgba(255,136,68,0.15);border-radius:4px;margin-bottom:14px;\">You have an unread morse transmission.</div>";
    }

    // Render each lesson
    for (var i = 0; i < EUGENE_LESSONS.length; i++) {
      var lesson = EUGENE_LESSONS[i];
      var isDone = owned.indexOf(lesson.id) !== -1;
      var isPassed = passed.indexOf(lesson.id) !== -1;
      var isNext = (i === nextIdx);
      var isLocked = !isDone && !isNext;

      html += "<div class=\"eugene-lesson" + (isDone ? " purchased" : "") + (isLocked ? " eugene-lesson-locked" : "") + "\">";
      html += "<div class=\"eugene-lesson-header\">";
      html += "<div class=\"eugene-lesson-title\">" + (i + 1) + ". " + lesson.title + "</div>";
      if (isDone && isPassed) {
        html += "<div class=\"eugene-lesson-cost owned\">LEARNED</div>";
      } else if (isDone) {
        html += "<div class=\"eugene-lesson-cost\" style=\"color:var(--warning);\">QUIZ PENDING</div>";
      } else {
        html += "<div class=\"eugene-lesson-cost\">" + fmt(lesson.cost) + "</div>";
      }
      html += "</div>";

      if (isDone && isPassed) {
        // Purchased + passed: show teaching quote + benefit
        html += "<div class=\"eugene-lesson-body\" style=\"border-left:2px solid var(--accent-dim);padding-left:10px;margin-left:2px;font-style:italic;\">" + "\u201C" + lesson.teaches + "\u201D" + "<div style=\"font-size:10px;color:var(--text-dim);margin-top:4px;font-style:normal;\">\u2014 Eugene J. Strutt, CPA</div></div>";
        html += "<div class=\"eugene-lesson-benefit\">" + lesson.benefit + "</div>";
      } else if (isDone && !isPassed) {
        // Purchased but NOT passed: show quiz
        html += "<div class=\"eugene-lesson-body\" style=\"border-left:2px solid var(--accent-dim);padding-left:10px;margin-left:2px;font-style:italic;\">" + "\u201C" + lesson.teaches + "\u201D" + "<div style=\"font-size:10px;color:var(--text-dim);margin-top:4px;font-style:normal;\">\u2014 Eugene J. Strutt, CPA</div></div>";
        // Quiz section
        var quizData = window.EUGENE_QUIZZES ? window.EUGENE_QUIZZES[lesson.id] : null;
        if (quizData) {
          html += "<div style=\"margin-top:8px;padding:8px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:6px;\">";
          html += "<div style=\"font-size:10px;color:var(--accent);margin-bottom:6px;font-family:&apos;Press Start 2P&apos;,monospace;\">QUIZ</div>";
          html += "<div style=\"font-size:11px;margin-bottom:8px;\">" + quizData.q + "</div>";
          for (var qi = 0; qi < quizData.a.length; qi++) {
            html += "<button class=\"btn eugene-quiz-btn\" data-quiz-lesson=\"" + lesson.id + "\" data-quiz-answer=\"" + qi + "\" style=\"display:block;width:100%;text-align:left;margin-bottom:4px;padding:6px 10px;font-size:10px;\" title=\"Select this answer\">" + String.fromCharCode(65 + qi) + ". " + quizData.a[qi] + "</button>";
          }
          html += "<div style=\"font-size:9px;color:var(--text-dim);margin-top:4px;\">Pass the quiz to unlock this lesson&apos;s benefit.</div>";
          html += "</div>";
        }
      } else if (isNext && !state.eugeneFired && !state.eugeneDeathTriggered) {
        // Next unpurchased: show benefit preview + purchase button
        html += "<div class=\"eugene-lesson-body\" style=\"color:var(--text-dim);\">" + lesson.benefit + "</div>";
        var canAfford = (state.coins || 0) >= lesson.cost;
        html += "<button class=\"btn btn-hire\" data-lesson-id=\"" + lesson.id + "\" data-lesson-cost=\"" + lesson.cost + "\"" + (canAfford ? "" : " disabled") + " title=\"" + (canAfford ? "Purchase this lesson from Eugene for " + fmt(lesson.cost) + "." : "Insufficient funds. You need " + fmt(lesson.cost) + ".") + "\">PURCHASE \u2014 " + fmt(lesson.cost) + "</button>";
      } else {
        // Locked
        html += "<div class=\"eugene-lesson-body\" style=\"color:var(--text-dim);font-style:italic;\">Complete the previous lesson to unlock.</div>";
      }
      html += "</div>";
    }

    // Late-game retirement arc
    if (owned.length >= 10 && !state.eugeneRetirementChoice && !state.eugeneFired && !state.eugeneDeathTriggered) {
      html += "<div class=\"eugene-retire\">";
      html += "<p>Eugene has submitted a request to the board. He and his wife would like to relocate to Aspen \u2014 where they first met \u2014 and he\u2019s asking to be released from his contract.</p>";
      html += "<p>A memo from AI Management has been appended to the request: <em>\u201CThe department\u2019s preference is to retain Mr. Strutt. His institutional knowledge is not easily replaced. We recommend denial.\u201D</em></p>";
      html += "<div style=\"display:flex;gap:8px;margin-top:8px;\">";
      html += "<button class=\"btn btn-hire\" id=\"eugeneLetRetire\" title=\"Let Eugene retire to Aspen with his wife. You keep all purchased lessons.\">LET HIM GO</button>";
      html += "<button class=\"btn btn-appeal\" id=\"eugeneKeep\" title=\"Keep Eugene on staff. He stays, but he wanted to leave.\">KEEP HIM ON</button>";
      html += "</div>";
      html += "</div>";
    } else if (state.eugeneRetirementChoice === "retire") {
      html += "<div class=\"eugene-retire\"><p style=\"font-style:italic;color:var(--green);\">Eugene and his wife moved to Aspen last month. He left a note: \u201CIt was good work. I hope the numbers make more sense now.\u201D</p></div>";
    } else if (state.eugeneRetirementChoice === "stay") {
      html += "<div class=\"eugene-retire\"><p style=\"font-style:italic;color:var(--text-dim);\">Eugene acknowledged the board\u2019s decision. He hasn\u2019t mentioned Aspen since.</p></div>";
    }

    container.innerHTML = html;
  }

  // Hide/show stat items based on Jed lessons
  function applyEugeneReveals() {
    var statIds = ['statusBracket', 'statusBaseRate', 'statusEffRate', 'statusWeeklyIncome', 'statusEvasion', 'statusAuditRisk'];
    for (var i = 0; i < statIds.length; i++) {
      var el = $(statIds[i]);
      if (!el) continue;
      var parentItem = el.closest('.status-item');
      if (!parentItem) continue;
      if (!state.eugeneHired) {
        // Before hiring: hide all stats, show "hire Eugene" placeholder
        el.textContent = '???';
        el.style.filter = 'blur(4px)';
        parentItem.title = 'Hire Eugene Strutt to reveal this information.';
      } else if (_eugeneShouldReveal(statIds[i])) {
        el.style.filter = 'none';
        parentItem.title = '';
      } else {
        el.textContent = '???';
        el.style.filter = 'blur(4px)';
        parentItem.title = 'Purchase more lessons from Eugene to reveal this.';
      }
    }
    // Evasion bar
    var eBar = $('evasionFill');
    if (eBar) {
      var eParent = eBar.closest('.status-item');
      if (eParent && !_eugeneShouldReveal('statusEvasion')) {
        eBar.parentElement.style.filter = 'blur(4px)';
      } else if (eBar.parentElement) {
        eBar.parentElement.style.filter = 'none';
      }
    }
  }

  function handleHireEugene() {
    if ((state.coins || 0) < EUGENE_HIRE_COST) return;
    state.coins -= EUGENE_HIRE_COST;
    state.eugeneHired = true;
    if (!state.eugeneLessons) state.eugeneLessons = [];
    saveState();
    renderAll();
    showToast('Eugene Strutt has been retained. His first consultation is available.');
  }

  function handleBuyLesson(lessonId, cost) {
    if ((state.coins || 0) < cost) return;
    state.coins -= cost;
    if (!state.eugeneLessons) state.eugeneLessons = [];
    if (state.eugeneLessons.indexOf(lessonId) === -1) {
      state.eugeneLessons.push(lessonId);
    }
    saveState();
    renderAll();
    showToast('Lesson purchased. Jed\u2019s notes have been filed.');
  }

  function handleEugeneRetirement(choice) {
    state.eugeneRetirementChoice = choice;
    saveState();
    renderAll();
    if (choice === 'retire') {
      showToast('Eugene Strutt has been released from his contract. All lessons remain in effect.');
    } else {
      showToast('The board has denied Jed\u2019s request. He remains on staff.');
    }
  }

  // ── Init ──

  loadState(function() {
    renderAll();
    wireEvents();
    updateClock();
    _clockInterval = setInterval(updateClock, 1000);
    fireDispatch();
  });

})();
