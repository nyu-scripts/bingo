// Host page controller

var hostState = {
  gameCode: null,
  themeId: null,
  theme: null,
  patternId: "line",
  drawn: [],       // indices into theme.items that have been drawn
  pool: [],        // indices not yet drawn
  customGrid: Array(25).fill(0),
  customItems: null, // base64url-encoded custom item names
  urlItems: null,    // base64url-encoded URL scrape item suffixes
  urlPrefix: null,   // common image URL prefix
};

function saveHostState() {
  var data = {
    gameCode: hostState.gameCode,
    themeId: hostState.themeId,
    patternId: hostState.patternId,
    drawn: hostState.drawn,
    pool: hostState.pool,
  };
  if (hostState.customItems) data.customItems = hostState.customItems;
  if (hostState.urlItems) data.urlItems = hostState.urlItems;
  if (hostState.urlPrefix) data.urlPrefix = hostState.urlPrefix;
  sessionStorage.setItem("bingo_host", JSON.stringify(data));
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
  hostState.customItems = data.customItems || null;
  hostState.urlItems = data.urlItems || null;
  hostState.urlPrefix = data.urlPrefix || null;
  return loadTheme(data.themeId, hostState.customItems, {
    items: hostState.urlItems, prefix: hostState.urlPrefix
  }).then(function(theme) {
    hostState.theme = theme;
    return true;
  });
}

function parseCustomItemNames(raw) {
  var seen = {};
  return raw.split("\n")
    .map(function(line) { return line.trim().replace(/\|/g, "").substring(0, 40); })
    .filter(function(line) { return line.length > 0; })
    .filter(function(line) {
      var key = line.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
}

function createGame() {
  var themeId = document.getElementById("theme-select").value;
  var gameCode = generateGameCode();

  // Handle custom text theme
  if (themeId === "custom") {
    var raw = document.getElementById("custom-items-textarea").value;
    var names = parseCustomItemNames(raw);
    if (names.length < 24) {
      alert("Please enter at least 24 unique items (you have " + names.length + ").");
      return;
    }
    hostState.customItems = encodeCustomItems(names);
    hostState.urlItems = null;
    hostState.urlPrefix = null;
  } else if (themeId === "urlscrape") {
    if (!hostState.urlItems) {
      alert("Please fetch images from a URL first.");
      return;
    }
    hostState.customItems = null;
  } else {
    hostState.customItems = null;
    hostState.urlItems = null;
    hostState.urlPrefix = null;
  }

  hostState.gameCode = gameCode;
  hostState.themeId = themeId;
  localStorage.setItem("bingo_last_theme", themeId);
  // Encode custom grid into pattern ID if custom is selected
  if (hostState.patternId === "custom") {
    hostState.patternId = encodeCustomPattern(hostState.customGrid);
  }

  return loadTheme(themeId, hostState.customItems, {
    items: hostState.urlItems, prefix: hostState.urlPrefix
  }).then(function(theme) {
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
    var url = buildHostUrl(gameCode, themeId, hostState.patternId, hostState.customItems, hostState.urlItems, hostState.urlPrefix);
    history.replaceState(null, "", url);

    showGamePanel();
  });
}

function showGamePanel() {
  document.getElementById("setup").style.display = "none";
  document.getElementById("game-panel").style.display = "block";

  document.getElementById("display-code").textContent = hostState.gameCode;
  var playUrl = buildPlayUrl(hostState.gameCode, hostState.themeId, hostState.patternId, hostState.customItems, hostState.urlItems, hostState.urlPrefix);
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
  var url = buildPlayUrl(hostState.gameCode, hostState.themeId, hostState.patternId, hostState.customItems, hostState.urlItems, hostState.urlPrefix);
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

function parseImagesFromHtml(html, prefix) {
  var doc = new DOMParser().parseFromString(html, "text/html");
  var imgs = doc.querySelectorAll("img");
  var seen = {};
  var results = [];
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].getAttribute("src");
    if (!src) continue;
    if (prefix && src.indexOf(prefix) !== 0) continue;
    if (seen[src]) continue;
    seen[src] = true;
    var alt = imgs[i].getAttribute("alt");
    var name = (alt && alt.trim()) ? alt.trim() : nameFromUrl(src);
    results.push({ name: name.substring(0, 40), image: src });
  }
  return results;
}

function ensureUniqueNames(items) {
  var counts = {};
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var base = items[i].name;
    var key = base.toLowerCase();
    if (counts[key] === undefined) {
      counts[key] = 0;
    }
    counts[key]++;
    result.push({ name: base, image: items[i].image, _key: key });
  }
  // Second pass: append suffix to duplicates
  var seen = {};
  for (var j = 0; j < result.length; j++) {
    var k = result[j]._key;
    if (counts[k] > 1) {
      if (seen[k] === undefined) seen[k] = 0;
      seen[k]++;
      result[j].name = result[j].name + " " + seen[k];
    }
    delete result[j]._key;
  }
  return result;
}

function fetchUrlScrape() {
  var urlInput = document.getElementById("scrape-url");
  var url = urlInput.value.trim();
  if (!url) { urlInput.focus(); return; }

  var prefix = document.getElementById("scrape-prefix").value.trim();
  var status = document.getElementById("scrape-status");
  var fallback = document.getElementById("scrape-fallback");

  status.textContent = "Fetching...";
  status.className = "scrape-status";
  fallback.style.display = "none";

  fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function(html) {
      var items = parseImagesFromHtml(html, prefix);
      items = ensureUniqueNames(items);
      if (items.length === 0) {
        status.textContent = "No images found" + (prefix ? " matching that prefix." : ".");
        status.className = "scrape-status error";
        return;
      }
      displayScrapedItems(items);
    })
    .catch(function() {
      status.textContent = "Could not fetch URL (likely CORS). Paste the page HTML source below instead.";
      status.className = "scrape-status error";
      fallback.style.display = "";
    });
}

function parsePastedHtml() {
  var html = document.getElementById("scrape-paste-html").value;
  if (!html.trim()) return;

  var prefix = document.getElementById("scrape-prefix").value.trim();
  var status = document.getElementById("scrape-status");

  var items = parseImagesFromHtml(html, prefix);
  items = ensureUniqueNames(items);
  if (items.length === 0) {
    status.textContent = "No images found in pasted HTML" + (prefix ? " matching that prefix." : ".");
    status.className = "scrape-status error";
    return;
  }
  displayScrapedItems(items);
}

function commonUrlPrefix(urls) {
  if (urls.length === 0) return "";
  var prefix = urls[0];
  for (var i = 1; i < urls.length; i++) {
    while (urls[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (!prefix) return "";
    }
  }
  var lastSlash = prefix.lastIndexOf("/");
  return lastSlash >= 0 ? prefix.substring(0, lastSlash + 1) : "";
}

function displayScrapedItems(items) {
  var status = document.getElementById("scrape-status");
  status.textContent = items.length + " image" + (items.length !== 1 ? "s" : "") + " found" + (items.length < 24 ? " (need at least 24)" : "");
  status.className = "scrape-status" + (items.length >= 24 ? " success" : " error");

  var prefix = commonUrlPrefix(items.map(function(it) { return it.image; }));
  hostState.urlPrefix = prefix;
  hostState.urlItems = encodeUrlItems(items, prefix);

  var preview = document.getElementById("scrape-preview");
  preview.innerHTML = "";
  for (var i = 0; i < items.length; i++) {
    var div = document.createElement("div");
    div.className = "scrape-preview-item";
    div.innerHTML = '<img src="' + items[i].image + '" alt="' + escapeXml(items[i].name) + '">' +
      '<span>' + escapeXml(items[i].name) + '</span>';
    preview.appendChild(div);
  }
}

function populateThemeSelect() {
  var select = document.getElementById("theme-select");
  select.innerHTML = "";
  var lastTheme = localStorage.getItem("bingo_last_theme");
  getThemeList().forEach(function(t) {
    var opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    if (t.id === lastTheme) opt.selected = true;
    select.appendChild(opt);
    // Load theme to show item count
    loadTheme(t.id).then(function(theme) {
      opt.textContent = t.title + " (" + theme.items.length + ")";
    });
  });

  // Add Custom (Text) option
  var customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = "Custom (Text)";
  if (lastTheme === "custom") customOpt.selected = true;
  select.appendChild(customOpt);

  // Add Custom (Images) option
  var urlOpt = document.createElement("option");
  urlOpt.value = "urlscrape";
  urlOpt.textContent = "Custom (Images)";
  if (lastTheme === "urlscrape") urlOpt.selected = true;
  select.appendChild(urlOpt);

  // Show/hide custom builders
  var builder = document.getElementById("custom-items-builder");
  var urlBuilder = document.getElementById("url-scrape-builder");
  function updateBuilderVisibility() {
    builder.style.display = select.value === "custom" ? "" : "none";
    urlBuilder.style.display = select.value === "urlscrape" ? "" : "none";
  }
  updateBuilderVisibility();
  select.addEventListener("change", updateBuilderVisibility);

  // Live item counter
  var textarea = document.getElementById("custom-items-textarea");
  var counter = document.getElementById("custom-items-counter");
  textarea.addEventListener("input", function() {
    var names = parseCustomItemNames(textarea.value);
    counter.textContent = names.length + " item" + (names.length !== 1 ? "s" : "");
    counter.className = "custom-items-counter" + (names.length < 24 ? " insufficient" : "");
  });
}

// Init
(function init() {
  var urlGame = getParam("game");
  var urlTheme = getParam("theme");
  var urlPattern = getParam("pattern");
  var urlCitems = getParam("citems");
  var urlUitems = getParam("uitems");
  var urlUprefix = getParam("uprefix");

  if (urlPattern) {
    hostState.patternId = urlPattern;
    if (urlPattern.startsWith("c_")) {
      var decoded = decodeCustomPattern(urlPattern);
      hostState.customGrid = decoded.grid;
    }
  }

  if (urlCitems) {
    hostState.customItems = urlCitems;
  }
  if (urlUitems) {
    hostState.urlItems = urlUitems;
  }
  if (urlUprefix) {
    hostState.urlPrefix = urlUprefix;
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
      if (urlCitems) hostState.customItems = urlCitems;
      if (urlUitems) hostState.urlItems = urlUitems;
      if (urlUprefix) hostState.urlPrefix = urlUprefix;

      loadTheme(urlTheme, hostState.customItems, {
        items: hostState.urlItems, prefix: hostState.urlPrefix
      }).then(function(theme) {
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
