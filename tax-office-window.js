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
        renderAll();
      }
    });
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
