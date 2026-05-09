(function() {
  'use strict';

  // =========================================================================
  // PET_SPRITES — copy of the existing happy sprites from house-window.js
  // Used as starting points when the user clicks "LOAD HAPPY"
  // =========================================================================
  var HAPPY_SPRITES = {
    cat: [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#f5f0eb','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#ff6b9d','#ff6b9d','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ],
    dog: [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ffffff','#8B5E3C','#8B5E3C','#f5f0eb','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#ff6b9d','#ff6b9d','#8B5E3C','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
    ],
    blob: [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#ffffff','#6b6bff','#6b6bff','#f5f0eb','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#ff6b9d','#ff6b9d','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ],
    bird: [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','#00c9a7','#ffffff','#00c9a7','#00c9a7','#f5f0eb','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
      ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ],
    bunny: [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#ffffff','#e8e0d8','#e8e0d8','#ffffff','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
    ],
    fish: [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#44ff44','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ]
  };

  // Base colors per pet type (for palette highlighting)
  var PET_COLORS = {
    cat:   { base: '#ff9f43', dark: '#cc7a2e', light: '#ffc78a', ear: '#ffa500' },
    dog:   { base: '#8B5E3C', dark: '#6b4530', light: '#a0764e', ear: '#6b4530' },
    blob:  { base: '#6b6bff', dark: '#3a3abf', light: '#9b9bff', ear: null },
    bird:  { base: '#00c9a7', dark: '#009b82', light: '#00f0c8', beak: '#ffa500', wing: '#ffeb3b' },
    bunny: { base: '#e8e0d8', dark: '#c4b8ac', light: '#f5f0eb', ear: '#e8e0d8' },
    fish:  { base: '#5bc0eb', dark: '#3a9cc4', light: '#8dd8f8', eye: '#44ff44' }
  };

  // All states the user will paint
  var STATES = ['sick','sleeping','eating','excited','angry','working','dancing','scared','bowl_full','bowl_empty'];
  var PET_TYPES = ['cat','dog','blob','bird','bunny','fish'];
  var STATE_LABELS = {
    sick:'SICK', sleeping:'SLEEP', eating:'EAT', excited:'EXCITED',
    angry:'ANGRY', working:'WORK', dancing:'DANCE', scared:'SCARED',
    bowl_full:'BOWL-FULL', bowl_empty:'BOWL-EMPTY'
  };

  // =========================================================================
  // State
  // =========================================================================
  var currentPet = 'cat';
  var currentState = 'sick';
  var currentColor = '#ff9f43';
  var grid = makeEmptyGrid();      // 8x8 array of color strings or 'transparent'
  var isDrawing = false;
  var isErasing = false;
  var allSprites = {};             // { cat: { sick: [[...], ...], sleeping: [...] }, ... }
  var hasUnsaved = false;

  function makeEmptyGrid() {
    var g = [];
    for (var r = 0; r < 8; r++) {
      var row = [];
      for (var c = 0; c < 8; c++) row.push('transparent');
      g.push(row);
    }
    return g;
  }

  function cloneGrid(g) {
    return g.map(function(row) { return row.slice(); });
  }

  // =========================================================================
  // DOM refs
  // =========================================================================
  var pixelGridEl = document.getElementById('pixelGrid');
  var gridLabel   = document.getElementById('gridLabel');
  var previewSmall = document.getElementById('previewSmall');
  var previewLarge = document.getElementById('previewLarge');
  var previewXL   = document.getElementById('previewXL');
  var saveStatus  = document.getElementById('saveStatus');
  var toolName    = document.getElementById('toolName');
  var exportModal = document.getElementById('exportModal');
  var exportCode  = document.getElementById('exportCode');

  // =========================================================================
  // Build grid cells
  // =========================================================================
  var cells = [];
  for (var i = 0; i < 64; i++) {
    var cell = document.createElement('div');
    cell.className = 'pixel-cell transparent-bg';
    cell.dataset.idx = i;
    pixelGridEl.appendChild(cell);
    cells.push(cell);
  }

  // =========================================================================
  // Palette
  // =========================================================================
  var PALETTE = {
    'PET BODY': [],  // filled dynamically
    'COMMON': ['#ffffff','#f5f0eb','#e0e0e0','#aaaaaa','#666666','#333333','#000000'],
    'EYES & MOUTH': ['#ff6b9d','#ff4466','#cc3355','#ff9999','#5bc0eb','#44ff44','#ff4444'],
    'WARM': ['#ffd700','#ffb64c','#ffa500','#ff9f43','#ff6347','#ff4500','#cc3300'],
    'COOL': ['#6b6bff','#3a3abf','#00c9a7','#00f0c8','#5bc0eb','#8dd8f8','#9b9bff'],
    'NATURE': ['#00ff88','#44ff44','#88cc44','#558833','#8B5E3C','#a0764e','#6b4530'],
    'EFFECTS': ['#e040fb','#9c27b0','#ffeb3b','#e8e0d8','#c4b8ac','#7799aa','#ff6b00']
  };

  function buildPalette() {
    var pc = PET_COLORS[currentPet];
    PALETTE['PET BODY'] = [pc.base, pc.dark, pc.light];
    if (pc.ear) PALETTE['PET BODY'].push(pc.ear);
    if (pc.beak) PALETTE['PET BODY'].push(pc.beak);
    if (pc.wing) PALETTE['PET BODY'].push(pc.wing);
    if (pc.eye) PALETTE['PET BODY'].push(pc.eye);

    var container = document.getElementById('paletteContent');
    container.innerHTML = '';

    // Transparent eraser swatch first
    var topRow = document.createElement('div');
    topRow.className = 'palette-row';
    var eraserSwatch = document.createElement('div');
    eraserSwatch.className = 'swatch transparent-swatch';
    eraserSwatch.title = 'Eraser (transparent)';
    if (currentColor === 'transparent') eraserSwatch.classList.add('active');
    eraserSwatch.addEventListener('click', function() {
      currentColor = 'transparent';
      refreshPaletteActive();
    });
    topRow.appendChild(eraserSwatch);

    // Custom color picker
    var customWrap = document.createElement('span');
    customWrap.className = 'custom-color-wrap';
    var picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'custom-color-input';
    picker.value = (currentColor !== 'transparent') ? currentColor : '#ff9f43';
    picker.title = 'Pick custom color';
    picker.addEventListener('input', function() {
      currentColor = picker.value;
      refreshPaletteActive();
    });
    customWrap.appendChild(picker);
    topRow.appendChild(customWrap);
    container.appendChild(topRow);

    var keys = Object.keys(PALETTE);
    for (var k = 0; k < keys.length; k++) {
      var label = document.createElement('div');
      label.className = 'palette-row-label';
      label.textContent = keys[k];
      container.appendChild(label);

      var row = document.createElement('div');
      row.className = 'palette-row';
      var colors = PALETTE[keys[k]];
      for (var j = 0; j < colors.length; j++) {
        (function(color) {
          var sw = document.createElement('div');
          sw.className = 'swatch';
          sw.style.backgroundColor = color;
          sw.title = color;
          if (color === currentColor) sw.classList.add('active');
          sw.addEventListener('click', function() {
            currentColor = color;
            refreshPaletteActive();
          });
          row.appendChild(sw);
        })(colors[j]);
      }
      container.appendChild(row);
    }
  }

  function refreshPaletteActive() {
    var swatches = document.querySelectorAll('.swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].classList.remove('active');
      if (swatches[i].classList.contains('transparent-swatch') && currentColor === 'transparent') {
        swatches[i].classList.add('active');
      } else if (swatches[i].style.backgroundColor) {
        // Normalize both to compare
        var swatchColor = rgbToHex(swatches[i].style.backgroundColor);
        if (swatchColor && swatchColor.toLowerCase() === currentColor.toLowerCase()) {
          swatches[i].classList.add('active');
        }
      }
    }
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb.indexOf('rgb') === -1) return rgb;
    var parts = rgb.match(/\d+/g);
    if (!parts || parts.length < 3) return rgb;
    return '#' + ((1 << 24) + (parseInt(parts[0]) << 16) + (parseInt(parts[1]) << 8) + parseInt(parts[2]))
      .toString(16).slice(1);
  }

  // =========================================================================
  // Grid rendering
  // =========================================================================
  function renderGrid() {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var idx = r * 8 + c;
        var color = grid[r][c];
        if (color === 'transparent') {
          cells[idx].style.backgroundColor = '';
          cells[idx].classList.add('transparent-bg');
        } else {
          cells[idx].style.backgroundColor = color;
          cells[idx].classList.remove('transparent-bg');
        }
      }
    }
    renderPreviews();
  }

  function renderPreviews() {
    drawSpriteToCanvas(previewSmall, grid, 5);
    drawSpriteToCanvas(previewLarge, grid, 16);
    drawSpriteToCanvas(previewXL, grid, 24);
  }

  function drawSpriteToCanvas(canvas, sprite, pxSize) {
    canvas.width = 8 * pxSize;
    canvas.height = 8 * pxSize;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var color = sprite[r] ? sprite[r][c] : 'transparent';
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(c * pxSize, r * pxSize, pxSize, pxSize);
        }
      }
    }
  }

  // =========================================================================
  // Grid interaction — paint on left click, erase on right click
  // =========================================================================
  pixelGridEl.addEventListener('mousedown', function(e) {
    var cell = e.target.closest('.pixel-cell');
    if (!cell) return;
    e.preventDefault();
    if (e.button === 2) {
      isErasing = true;
      paintCell(cell, 'transparent');
    } else {
      isDrawing = true;
      paintCell(cell, currentColor);
    }
  });

  pixelGridEl.addEventListener('mouseover', function(e) {
    var cell = e.target.closest('.pixel-cell');
    if (!cell) return;
    if (isDrawing) paintCell(cell, currentColor);
    if (isErasing) paintCell(cell, 'transparent');
  });

  document.addEventListener('mouseup', function() {
    isDrawing = false;
    isErasing = false;
  });

  pixelGridEl.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  function paintCell(cell, color) {
    var idx = parseInt(cell.dataset.idx);
    var r = Math.floor(idx / 8);
    var c = idx % 8;
    grid[r][c] = color;
    if (color === 'transparent') {
      cell.style.backgroundColor = '';
      cell.classList.add('transparent-bg');
    } else {
      cell.style.backgroundColor = color;
      cell.classList.remove('transparent-bg');
    }
    hasUnsaved = true;
    renderPreviews();
  }

  // =========================================================================
  // Tab switching
  // =========================================================================
  document.getElementById('petTabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.pet-tab');
    if (!btn) return;
    // Save current before switching
    saveCurrentToMemory();
    document.querySelectorAll('.pet-tab').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentPet = btn.dataset.pet;
    currentColor = PET_COLORS[currentPet].base;
    loadCurrentFromMemory();
    buildPalette();
    updateLabel();
    renderGrid();
  });

  document.getElementById('stateTabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.state-tab');
    if (!btn) return;
    saveCurrentToMemory();
    document.querySelectorAll('.state-tab').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentState = btn.dataset.state;
    loadCurrentFromMemory();
    updateLabel();
    renderGrid();
  });

  function updateLabel() {
    var petName = currentPet.toUpperCase();
    var stateName = STATE_LABELS[currentState] || currentState.toUpperCase();
    gridLabel.textContent = petName + ' — ' + stateName;
  }

  // =========================================================================
  // Memory (in-page) — save/load current grid to allSprites
  // =========================================================================
  function saveCurrentToMemory() {
    if (!allSprites[currentPet]) allSprites[currentPet] = {};
    allSprites[currentPet][currentState] = cloneGrid(grid);
  }

  function loadCurrentFromMemory() {
    if (allSprites[currentPet] && allSprites[currentPet][currentState]) {
      grid = cloneGrid(allSprites[currentPet][currentState]);
    } else {
      grid = makeEmptyGrid();
    }
  }

  // =========================================================================
  // Buttons
  // =========================================================================
  document.getElementById('btnClear').addEventListener('click', function() {
    grid = makeEmptyGrid();
    hasUnsaved = true;
    renderGrid();
  });

  document.getElementById('btnFill').addEventListener('click', function() {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        grid[r][c] = currentColor;
      }
    }
    hasUnsaved = true;
    renderGrid();
  });

  document.getElementById('btnCopyHappy').addEventListener('click', function() {
    if (currentState === 'bowl_full' || currentState === 'bowl_empty') {
      // For bowl states, load a default food bowl template
      grid = makeBowlTemplate(currentState === 'bowl_full');
    } else if (HAPPY_SPRITES[currentPet]) {
      grid = cloneGrid(HAPPY_SPRITES[currentPet]);
    }
    hasUnsaved = true;
    renderGrid();
  });

  // Default food bowl template
  function makeBowlTemplate(isFull) {
    var bowl = makeEmptyGrid();
    // Simple pixel art bowl
    var bowlColor = '#8B5E3C';
    var foodColor = '#ff9f43';
    if (isFull) {
      // Row 2: food poking above
      bowl[2][2] = foodColor; bowl[2][3] = foodColor; bowl[2][4] = foodColor; bowl[2][5] = foodColor;
      // Row 3: food + bowl rim
      bowl[3][1] = bowlColor; bowl[3][2] = foodColor; bowl[3][3] = foodColor;
      bowl[3][4] = foodColor; bowl[3][5] = foodColor; bowl[3][6] = bowlColor;
    } else {
      // Row 3: bowl rim only
      bowl[3][1] = bowlColor; bowl[3][2] = bowlColor; bowl[3][3] = bowlColor;
      bowl[3][4] = bowlColor; bowl[3][5] = bowlColor; bowl[3][6] = bowlColor;
    }
    // Row 4: bowl body
    bowl[4][1] = bowlColor; bowl[4][2] = '#a0764e'; bowl[4][3] = '#a0764e';
    bowl[4][4] = '#a0764e'; bowl[4][5] = '#a0764e'; bowl[4][6] = bowlColor;
    // Row 5: bowl body narrower
    bowl[5][2] = bowlColor; bowl[5][3] = '#a0764e'; bowl[5][4] = '#a0764e'; bowl[5][5] = bowlColor;
    // Row 6: bowl base
    bowl[6][3] = bowlColor; bowl[6][4] = bowlColor;
    return bowl;
  }

  // Save to chrome.storage
  document.getElementById('btnSave').addEventListener('click', function() {
    saveCurrentToMemory();
    saveToChromeStorage();
  });

  function saveToChromeStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ petSpritesPainted: allSprites }, function() {
        flashSaveStatus();
      });
    } else {
      // Fallback for testing outside extension
      try {
        localStorage.setItem('petSpritesPainted', JSON.stringify(allSprites));
      } catch(e) {}
      flashSaveStatus();
    }
    hasUnsaved = false;
  }

  function flashSaveStatus() {
    saveStatus.textContent = 'SAVED';
    saveStatus.classList.add('visible');
    setTimeout(function() { saveStatus.classList.remove('visible'); }, 2000);
  }

  // Load from chrome.storage on init
  function loadFromChromeStorage(cb) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('petSpritesPainted', function(data) {
        if (data.petSpritesPainted) {
          allSprites = data.petSpritesPainted;
        }
        if (cb) cb();
      });
    } else {
      try {
        var saved = localStorage.getItem('petSpritesPainted');
        if (saved) allSprites = JSON.parse(saved);
      } catch(e) {}
      if (cb) cb();
    }
  }

  // Export all sprites as JS code
  document.getElementById('btnExport').addEventListener('click', function() {
    saveCurrentToMemory();
    var code = '// Pet Sprites — New States\n';
    code += '// Generated by Pet Sprite Painter\n';
    code += '// Paste into house-window.js PET_SPRITES object\n\n';

    var pets = Object.keys(allSprites);
    for (var p = 0; p < pets.length; p++) {
      var petName = pets[p];
      var states = Object.keys(allSprites[petName]);
      for (var s = 0; s < states.length; s++) {
        var stateName = states[s];
        var spriteGrid = allSprites[petName][stateName];
        // Check if grid is empty
        var hasPixels = false;
        for (var r = 0; r < 8; r++) {
          for (var c = 0; c < 8; c++) {
            if (spriteGrid[r][c] !== 'transparent') { hasPixels = true; break; }
          }
          if (hasPixels) break;
        }
        if (!hasPixels) continue;

        code += '// ' + petName + '.' + stateName + '\n';
        code += 'PET_SPRITES.' + petName + '.' + stateName + ' = [\n';
        for (var r = 0; r < 8; r++) {
          code += '  [';
          for (var c = 0; c < 8; c++) {
            code += "'" + spriteGrid[r][c] + "'";
            if (c < 7) code += ',';
          }
          code += ']';
          if (r < 7) code += ',';
          code += '\n';
        }
        code += '];\n\n';
      }
    }

    exportCode.value = code;
    exportModal.classList.add('visible');
  });

  document.getElementById('closeModal').addEventListener('click', function() {
    exportModal.classList.remove('visible');
  });
  exportModal.addEventListener('click', function(e) {
    if (e.target === exportModal) exportModal.classList.remove('visible');
  });

  // Back button
  document.getElementById('backBtn').addEventListener('click', function() {
    if (hasUnsaved) {
      saveCurrentToMemory();
      saveToChromeStorage();
    }
    window.close();
  });

  // =========================================================================
  // Auto-save every 30 seconds
  // =========================================================================
  setInterval(function() {
    if (hasUnsaved) {
      saveCurrentToMemory();
      saveToChromeStorage();
    }
  }, 30000);

  // Save before unload
  window.addEventListener('beforeunload', function() {
    if (hasUnsaved) {
      saveCurrentToMemory();
      saveToChromeStorage();
    }
  });

  // =========================================================================
  // Init
  // =========================================================================
  loadFromChromeStorage(function() {
    loadCurrentFromMemory();
    buildPalette();
    updateLabel();
    renderGrid();
  });

})();
