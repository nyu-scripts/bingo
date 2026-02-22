// Player page controller

var playerState = {
  gameCode: null,
  themeId: null,
  patternId: null,
  playerName: null,
  cardSeed: null,
  theme: null,
  cells: null,
  marked: new Set(),
};

function storageKey() {
  return "bingo_" + playerState.gameCode + "_" + playerState.playerName;
}

function savePlayerData() {
  localStorage.setItem(storageKey(), JSON.stringify({
    seed: playerState.cardSeed,
    marks: [].concat(Array.from(playerState.marked)),
  }));
}

function loadPlayerData() {
  var saved = localStorage.getItem(storageKey());
  if (!saved) return null;
  var data = JSON.parse(saved);
  // Migrate old format (plain array of marks) to new format
  if (Array.isArray(data)) {
    return { seed: null, marks: data };
  }
  return data;
}

function enterGame(e) {
  e.preventDefault();
  var name = document.getElementById("player-name").value.trim().toLowerCase();
  if (!name) return;

  playerState.playerName = name;
  playerState.gameCode = getParam("game");
  playerState.themeId = getParam("theme") || "default";
  playerState.patternId = getParam("pattern") || "line";

  if (!playerState.gameCode) {
    alert("No game code found. Please use a link from the host.");
    return;
  }

  // Restore or generate card seed
  var saved = loadPlayerData();
  if (saved && saved.seed) {
    playerState.cardSeed = saved.seed;
    playerState.marked = new Set(saved.marks);
  } else {
    playerState.cardSeed = generateCardSeed();
  }

  loadTheme(playerState.themeId).then(function(theme) {
    playerState.theme = theme;
    playerState.cells = generateCard(
      playerState.theme.items,
      playerState.gameCode,
      playerState.cardSeed
    );

    // Mark FREE cell
    playerState.marked.add(12);

    document.getElementById("name-section").style.display = "none";
    document.getElementById("game-area").style.display = "block";
    document.getElementById("display-name").textContent = playerState.playerName;
    document.getElementById("display-code").textContent = playerState.gameCode;
    document.getElementById("display-seed").textContent = playerState.cardSeed;

    // Show target pattern
    var pattern = getPattern(playerState.patternId);
    var goalEl = document.getElementById("goal-indicator");
    goalEl.innerHTML =
      '<span class="goal-label">Goal:</span>' +
      renderPatternPreview(pattern) +
      '<span class="goal-name">' + pattern.name + '</span>';

    savePlayerData();
    renderCard();
    checkForWin();
  });
}

function renderCard() {
  var grid = document.getElementById("bingo-grid");
  grid.innerHTML = "";

  playerState.cells.forEach(function(cell, idx) {
    var div = document.createElement("div");
    div.className = "bingo-cell";
    div.dataset.index = idx;

    if (cell.free) {
      div.classList.add("free", "marked");
      div.innerHTML = '<span class="cell-label">FREE</span>';
    } else {
      div.innerHTML =
        '<img src="' + cell.image + '" alt="' + cell.name + '" draggable="false">' +
        '<span class="cell-label">' + cell.name + '</span>';
      (function(i) {
        div.addEventListener("click", function() { toggleCell(i); });
      })(idx);
    }

    if (playerState.marked.has(idx)) {
      div.classList.add("marked");
    }

    grid.appendChild(div);
  });
}

function toggleCell(idx) {
  if (playerState.cells[idx].free) return;

  if (playerState.marked.has(idx)) {
    playerState.marked.delete(idx);
  } else {
    playerState.marked.add(idx);
  }

  // Update visual
  var cell = document.querySelector('.bingo-cell[data-index="' + idx + '"]');
  cell.classList.toggle("marked");

  savePlayerData();
  checkForWin();
}

function checkForWin() {
  var result = checkWin(playerState.marked, playerState.patternId);
  var banner = document.getElementById("win-banner");
  var patterns = document.getElementById("win-patterns");

  if (result) {
    banner.classList.add("show");
    patterns.textContent = result;
  } else {
    banner.classList.remove("show");
  }
}

// Init: check if we should restore a session
(function init() {
  var gameCode = getParam("game");
  if (!gameCode) {
    // No game code — redirect to home
    window.location.href = "index.html";
  }
})();
