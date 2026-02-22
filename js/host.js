// Host page controller

var hostState = {
  gameCode: null,
  themeId: null,
  theme: null,
  patternId: "line",
  drawn: [],       // indices into theme.items that have been drawn
  pool: [],        // indices not yet drawn
  customGrid: Array(25).fill(0),
};

function saveHostState() {
  sessionStorage.setItem("bingo_host", JSON.stringify({
    gameCode: hostState.gameCode,
    themeId: hostState.themeId,
    patternId: hostState.patternId,
    drawn: hostState.drawn,
    pool: hostState.pool,
  }));
}

function restoreHostState() {
  var saved = sessionStorage.getItem("bingo_host");
  if (!saved) return Promise.resolve(false);
  var data = JSON.parse(saved);
  // Also check URL params match
  var urlGame = getParam("game");
  var urlTheme = getParam("theme");
  if (urlGame && urlGame !== data.gameCode) return Promise.resolve(false);
  if (urlTheme && urlTheme !== data.themeId) return Promise.resolve(false);

  hostState.gameCode = data.gameCode;
  hostState.themeId = data.themeId;
  hostState.patternId = data.patternId || "line";
  hostState.drawn = data.drawn;
  hostState.pool = data.pool;
  return loadTheme(data.themeId).then(function(theme) {
    hostState.theme = theme;
    return true;
  });
}

function createGame() {
  var themeId = document.getElementById("theme-select").value;
  var gameCode = generateGameCode();

  hostState.gameCode = gameCode;
  hostState.themeId = themeId;
  // Encode custom grid into pattern ID if custom is selected
  if (hostState.patternId === "custom") {
    hostState.patternId = encodeCustomPattern(hostState.customGrid);
  }

  return loadTheme(themeId).then(function(theme) {
    hostState.theme = theme;
    hostState.drawn = [];
    hostState.pool = hostState.theme.items.map(function(_, i) { return i; });

    // Shuffle pool
    for (var i = hostState.pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = hostState.pool[i];
      hostState.pool[i] = hostState.pool[j];
      hostState.pool[j] = tmp;
    }

    saveHostState();

    // Update URL without reload
    var url = buildHostUrl(gameCode, themeId, hostState.patternId);
    history.replaceState(null, "", url);

    showGamePanel();
  });
}

function showGamePanel() {
  document.getElementById("setup").style.display = "none";
  document.getElementById("game-panel").style.display = "block";

  document.getElementById("display-code").textContent = hostState.gameCode;
  var playUrl = buildPlayUrl(hostState.gameCode, hostState.themeId, hostState.patternId);
  document.getElementById("share-link").textContent = playUrl;

  // Show current pattern
  var pattern = getPattern(hostState.patternId);
  var patternInfo = document.getElementById("game-pattern-info");
  patternInfo.innerHTML =
    '<span class="pattern-label">Win pattern:</span>' +
    renderPatternPreview(pattern) +
    '<span class="pattern-value">' + pattern.name + '</span>';

  updateDrawCounter();
  renderHistory();

  // Show last drawn item if any
  if (hostState.drawn.length > 0) {
    var lastIdx = hostState.drawn[hostState.drawn.length - 1];
    showDrawnItem(hostState.theme.items[lastIdx]);
  }
}

function drawNext() {
  if (hostState.pool.length === 0) {
    document.getElementById("btn-draw").disabled = true;
    document.getElementById("btn-draw").textContent = "All drawn!";
    return;
  }

  var idx = hostState.pool.pop();
  hostState.drawn.push(idx);
  saveHostState();

  var item = hostState.theme.items[idx];
  showDrawnItem(item);
  updateDrawCounter();
  renderHistory();
}

function showDrawnItem(item) {
  var container = document.getElementById("current-draw");
  container.innerHTML = '<img src="' + item.image + '" alt="' + item.name + '">';
  document.getElementById("current-name").textContent = item.name;
}

function updateDrawCounter() {
  var total = hostState.drawn.length + hostState.pool.length;
  document.getElementById("draw-counter").textContent =
    hostState.drawn.length + " / " + total + " drawn";
}

function renderHistory() {
  var grid = document.getElementById("history-grid");
  grid.innerHTML = "";
  // Show in reverse chronological order (most recent first)
  for (var i = hostState.drawn.length - 1; i >= 0; i--) {
    var item = hostState.theme.items[hostState.drawn[i]];
    var div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML =
      '<img src="' + item.image + '" alt="' + item.name + '">' +
      '<div class="history-label">' + item.name + '</div>';
    grid.appendChild(div);
  }
}

function copyLink() {
  var url = buildPlayUrl(hostState.gameCode, hostState.themeId, hostState.patternId);
  copyToClipboard(url, document.getElementById("btn-copy"));
}

function resetGame() {
  sessionStorage.removeItem("bingo_host");
  window.location.href = "host.html";
}

function encodeCustomPattern(grid) {
  var bits = 0;
  for (var i = 0; i < 25; i++) {
    if (grid[i]) bits |= (1 << i);
  }
  return "c_" + bits.toString(36);
}

function renderCustomGrid() {
  var container = document.getElementById("custom-grid");
  container.innerHTML = "";
  for (var i = 0; i < 25; i++) {
    var cell = document.createElement("div");
    cell.className = hostState.customGrid[i] ? "on" : "off";
    (function(idx, el) {
      el.addEventListener("click", function() {
        hostState.customGrid[idx] = hostState.customGrid[idx] ? 0 : 1;
        el.className = hostState.customGrid[idx] ? "on" : "off";
        updateCustomPreview();
      });
    })(i, cell);
    container.appendChild(cell);
  }
}

function updateCustomPreview() {
  var card = document.querySelector('.pattern-card[data-pattern-id="custom"]');
  if (!card) return;
  var preview = card.querySelector(".pattern-mini");
  if (!preview) return;
  var cells = preview.children;
  for (var i = 0; i < 25; i++) {
    cells[i].className = hostState.customGrid[i] ? "on" : "off";
  }
}

function renderPatternPicker() {
  var picker = document.getElementById("pattern-picker");
  picker.innerHTML = "";
  WIN_PATTERNS.forEach(function(p) {
    var card = document.createElement("div");
    card.className = "pattern-card" + (p.id === hostState.patternId ? " selected" : "");
    card.dataset.patternId = p.id;
    card.innerHTML = renderPatternPreview(p) + '<span class="pattern-name">' + p.name + '</span>';
    card.addEventListener("click", function() { selectPattern(p.id); });
    picker.appendChild(card);
  });

  // Add Custom card
  var isCustom = hostState.patternId.startsWith("c_");
  var customCard = document.createElement("div");
  customCard.className = "pattern-card" + (isCustom ? " selected" : "");
  customCard.dataset.patternId = "custom";
  var customPreview = { grid: hostState.customGrid };
  customCard.innerHTML = renderPatternPreview(customPreview) + '<span class="pattern-name">Custom</span>';
  customCard.addEventListener("click", function() { selectPattern("custom"); });
  picker.appendChild(customCard);
}

function selectPattern(id) {
  hostState.patternId = id;
  document.querySelectorAll(".pattern-card").forEach(function(c) {
    c.classList.toggle("selected", c.dataset.patternId === id);
  });

  var builder = document.getElementById("custom-grid-builder");
  if (id === "custom") {
    builder.style.display = "";
    renderCustomGrid();
  } else {
    builder.style.display = "none";
  }
}

function verifyBingo() {
  var seedInput = document.getElementById("verify-seed");
  var seed = seedInput.value.trim().toUpperCase();
  if (!seed) { seedInput.focus(); return; }

  var cells = generateCard(hostState.theme.items, hostState.gameCode, seed);
  var drawnNames = new Set(hostState.drawn.map(function(i) { return hostState.theme.items[i].name; }));

  var marked = new Set();
  for (var i = 0; i < 25; i++) {
    if (cells[i].free || drawnNames.has(cells[i].name)) marked.add(i);
  }

  var label = "Card #" + seed;
  var winResult = checkWin(marked, hostState.patternId);

  // Find the winning cell indices to highlight
  var winCells = new Set();
  if (winResult) {
    var pattern = getPattern(hostState.patternId);
    for (var s = 0; s < pattern.sets.length; s++) {
      var set = pattern.sets[s];
      if (set.every(function(i) { return marked.has(i); })) {
        set.forEach(function(i) { winCells.add(i); });
      }
    }
  }

  // Get goal cells for dimming non-essential cells
  var goalCells = new Set();
  var verifyPattern = getPattern(hostState.patternId);
  if (verifyPattern && verifyPattern.sets && verifyPattern.sets.length === 1) {
    for (var g = 0; g < verifyPattern.sets[0].length; g++) {
      goalCells.add(verifyPattern.sets[0][g]);
    }
  }

  var resultEl = document.getElementById("verify-result");
  resultEl.innerHTML =
    '<div class="verify-message ' + (winResult ? "pass" : "fail") + '">' +
      (winResult ? "Valid BINGO! (" + winResult + ")" : "Not a valid BINGO") +
    '</div>' +
    '<div class="verify-player-name">' + label + '</div>' +
    renderVerifyGrid(cells, marked, winCells, goalCells);
}

function renderVerifyGrid(cells, marked, winCells, goalCells) {
  var html = '<div class="verify-grid">';
  for (var i = 0; i < 25; i++) {
    var cls = marked.has(i) ? "drawn" : "not-drawn";
    if (winCells && winCells.has(i)) cls += " win-cell";
    if (goalCells && goalCells.size > 0 && !goalCells.has(i) && !cells[i].free) cls += " dim-cell";
    if (cells[i].free) {
      html += '<div class="' + cls + '"><span>FREE</span></div>';
    } else if (cells[i].image) {
      html += '<div class="' + cls + '"><img src="' + cells[i].image + '" alt="' + cells[i].name + '"><span>' + cells[i].name + '</span></div>';
    } else {
      html += '<div class="' + cls + '"><span>' + cells[i].name + '</span></div>';
    }
  }
  html += '</div>';
  return html;
}

function populateThemeSelect() {
  var select = document.getElementById("theme-select");
  select.innerHTML = "";
  getThemeList().forEach(function(t) {
    var opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
    // Load theme to show item count
    loadTheme(t.id).then(function(theme) {
      opt.textContent = t.title + " (" + theme.items.length + ")";
    });
  });
}

// Init
(function init() {
  var urlGame = getParam("game");
  var urlTheme = getParam("theme");
  var urlPattern = getParam("pattern");

  if (urlPattern) {
    hostState.patternId = urlPattern;
    if (urlPattern.startsWith("c_")) {
      var decoded = decodeCustomPattern(urlPattern);
      hostState.customGrid = decoded.grid;
    }
  }

  populateThemeSelect();
  renderPatternPicker();

  restoreHostState().then(function(restored) {
    if (restored) {
      showGamePanel();
    } else if (urlGame && urlTheme) {
      hostState.gameCode = urlGame;
      hostState.themeId = urlTheme;
      hostState.patternId = urlPattern || "line";

      loadTheme(urlTheme).then(function(theme) {
        hostState.theme = theme;
        hostState.drawn = [];
        hostState.pool = hostState.theme.items.map(function(_, i) { return i; });

        for (var i = hostState.pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = hostState.pool[i];
          hostState.pool[i] = hostState.pool[j];
          hostState.pool[j] = tmp;
        }

        saveHostState();
        showGamePanel();
      });
    }
  });
})();
