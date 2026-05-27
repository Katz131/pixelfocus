// export-state.js — reads chrome.storage.local and triggers JSON download
(function() {
  var statusEl = document.getElementById('status');

  chrome.storage.local.get(null, function(allData) {
    if (chrome.runtime.lastError) {
      statusEl.className = 'err';
      statusEl.textContent = 'ERROR: ' + chrome.runtime.lastError.message;
      return;
    }

    var state = allData.pixelFocusState;
    if (!state) {
      statusEl.className = 'err';
      statusEl.textContent = 'ERROR: No pixelFocusState found in storage.';
      return;
    }

    // Build backup object with metadata
    var backup = {
      _backupMeta: {
        version: chrome.runtime.getManifest().version,
        exportedAt: new Date().toISOString(),
        fieldCount: Object.keys(state).length
      },
      state: state
    };

    // Also include backup keys if they exist
    if (allData.pixelFocusState_backup_safe) {
      backup.backup_safe = allData.pixelFocusState_backup_safe;
    }
    if (allData.pixelFocusState_backup_safe2) {
      backup.backup_safe2 = allData.pixelFocusState_backup_safe2;
    }
    if (allData.pixelFocusProfileId) {
      backup.profileId = allData.pixelFocusProfileId;
    }

    var json = JSON.stringify(backup, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    // Trigger download as state-backup.json
    var a = document.createElement('a');
    a.href = url;
    a.download = 'state-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    statusEl.className = 'ok';
    statusEl.textContent = 'EXPORTED ' + Object.keys(state).length + ' fields (' + Math.round(json.length / 1024) + ' KB). File saved to Downloads. You can close this tab.';

    // Auto-close after 4 seconds
    setTimeout(function() { window.close(); }, 4000);
  });
})();
