// Host page controller

const hostState = {
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
  const data = {
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
  const saved = sessionStorage.getItem("bingo_host");
  if (!saved) return Promise.resolve(false);
  const data = JSON.parse(saved);
  // Also check URL params match
  const urlGame = getParam("game");
  const urlTheme = getParam("theme");
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
  const seen = {};
  return raw.split("\n")
    .map(function(line) { return line.trim().replace(/\|/g, "").substring(0, 40); })
    .filter(function(line) { return line.length > 0; })
    .filter(function(line) {
      const key = line.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
}

function createGame() {
  const themeId = document.getElementById("theme-select").value;
  const gameCode = generateGameCode();

  // Handle custom text theme
  if (themeId === "custom") {
    const raw = document.getElementById("custom-items-textarea").value;
    const names = parseCustomItemNames(raw);
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
    for (let i = hostState.pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = hostState.pool[i];
      hostState.pool[i] = hostState.pool[j];
      hostState.pool[j] = tmp;
    }

    saveHostState();

    // Update URL without reload
    const url = buildHostUrl(gameCode, themeId, hostState.patternId, hostState.customItems, hostState.urlItems, hostState.urlPrefix);
    history.replaceState(null, "", url);

    showGamePanel();
  });
}

function showGamePanel() {
  document.getElementById("setup").style.display = "none";
  document.getElementById("game-panel").style.display = "block";

  document.getElementById("display-code").textContent = hostState.gameCode;
  const playUrl = buildPlayUrl(hostState.gameCode, hostState.themeId, hostState.patternId, hostState.customItems, hostState.urlItems, hostState.urlPrefix);
  document.getElementById("share-link").textContent = playUrl;

  // Show current pattern
  const pattern = getPattern(hostState.patternId);
  const patternInfo = document.getElementById("game-pattern-info");
  patternInfo.innerHTML =
    '<span class="pattern-label">Win pattern:</span>' +
    renderPatternPreview(pattern) +
    '<span class="pattern-value">' + pattern.name + '</span>';

  updateDrawCounter();
  renderHistory();

  // Show last drawn item if any
  if (hostState.drawn.length > 0) {
    const lastIdx = hostState.drawn[hostState.drawn.length - 1];
    showDrawnItem(hostState.theme.items[lastIdx]);
  }
}

function drawNext() {
  if (hostState.pool.length === 0) {
    document.getElementById("btn-draw").disabled = true;
    document.getElementById("btn-draw").textContent = "All drawn!";
    return;
  }

  const idx = hostState.pool.pop();
  hostState.drawn.push(idx);
  saveHostState();

  const item = hostState.theme.items[idx];
  showDrawnItem(item);
  updateDrawCounter();
  renderHistory();
}

function showDrawnItem(item) {
  const container = document.getElementById("current-draw");
  container.innerHTML = '<img src="' + item.image + '" alt="' + item.name + '">';
  document.getElementById("current-name").textContent = item.name;
}

function updateDrawCounter() {
  const total = hostState.drawn.length + hostState.pool.length;
  document.getElementById("draw-counter").textContent =
    hostState.drawn.length + " / " + total + " drawn";
}

function renderHistory() {
  const grid = document.getElementById("history-grid");
  grid.innerHTML = "";
  // Show in reverse chronological order (most recent first)
  for (let i = hostState.drawn.length - 1; i >= 0; i--) {
    const item = hostState.theme.items[hostState.drawn[i]];
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML =
      '<img src="' + item.image + '" alt="' + item.name + '">' +
      '<div class="history-label">' + item.name + '</div>';
    grid.appendChild(div);
  }
}

function copyLink() {
  const url = buildPlayUrl(hostState.gameCode, hostState.themeId, hostState.patternId, hostState.customItems, hostState.urlItems, hostState.urlPrefix);
  copyToClipboard(url, document.getElementById("btn-copy"));
}

function resetGame() {
  sessionStorage.removeItem("bingo_host");
  window.location.href = "host.html";
}

function encodeCustomPattern(grid) {
  let bits = 0;
  for (let i = 0; i < 25; i++) {
    if (grid[i]) bits |= (1 << i);
  }
  return "c_" + bits.toString(36);
}

function renderCustomGrid() {
  const container = document.getElementById("custom-grid");
  container.innerHTML = "";
  for (let i = 0; i < 25; i++) {
    const cell = document.createElement("div");
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
  const card = document.querySelector('.pattern-card[data-pattern-id="custom"]');
  if (!card) return;
  const preview = card.querySelector(".pattern-mini");
  if (!preview) return;
  const cells = preview.children;
  for (let i = 0; i < 25; i++) {
    cells[i].className = hostState.customGrid[i] ? "on" : "off";
  }
}

function renderPatternPicker() {
  const picker = document.getElementById("pattern-picker");
  picker.innerHTML = "";
  WIN_PATTERNS.forEach(function(p) {
    const card = document.createElement("div");
    card.className = "pattern-card" + (p.id === hostState.patternId ? " selected" : "");
    card.dataset.patternId = p.id;
    card.innerHTML = renderPatternPreview(p) + '<span class="pattern-name">' + p.name + '</span>';
    card.addEventListener("click", function() { selectPattern(p.id); });
    picker.appendChild(card);
  });

  // Add Custom card
  const isCustom = hostState.patternId.startsWith("c_");
  const customCard = document.createElement("div");
  customCard.className = "pattern-card" + (isCustom ? " selected" : "");
  customCard.dataset.patternId = "custom";
  const customPreview = { grid: hostState.customGrid };
  customCard.innerHTML = renderPatternPreview(customPreview) + '<span class="pattern-name">Custom</span>';
  customCard.addEventListener("click", function() { selectPattern("custom"); });
  picker.appendChild(customCard);
}

function selectPattern(id) {
  hostState.patternId = id;
  document.querySelectorAll(".pattern-card").forEach(function(c) {
    c.classList.toggle("selected", c.dataset.patternId === id);
  });

  const builder = document.getElementById("custom-grid-builder");
  if (id === "custom") {
    builder.style.display = "";
    renderCustomGrid();
  } else {
    builder.style.display = "none";
  }
}

function verifyBingo() {
  const seedInput = document.getElementById("verify-seed");
  const seed = seedInput.value.trim().toUpperCase();
  if (!seed) { seedInput.focus(); return; }

  const cells = generateCard(hostState.theme.items, hostState.gameCode, seed);
  const drawnNames = new Set(hostState.drawn.map(function(i) { return hostState.theme.items[i].name; }));

  const marked = new Set();
  for (let i = 0; i < 25; i++) {
    if (cells[i].free || drawnNames.has(cells[i].name)) marked.add(i);
  }

  const label = "Card #" + seed;
  const winResult = checkWin(marked, hostState.patternId);

  // Find the winning cell indices to highlight
  const winCells = new Set();
  if (winResult) {
    const pattern = getPattern(hostState.patternId);
    for (let s = 0; s < pattern.sets.length; s++) {
      const set = pattern.sets[s];
      if (set.every(function(i) { return marked.has(i); })) {
        set.forEach(function(i) { winCells.add(i); });
      }
    }
  }

  // Get goal cells for dimming non-essential cells
  const goalCells = new Set();
  const verifyPattern = getPattern(hostState.patternId);
  if (verifyPattern && verifyPattern.sets && verifyPattern.sets.length === 1) {
    for (let g = 0; g < verifyPattern.sets[0].length; g++) {
      goalCells.add(verifyPattern.sets[0][g]);
    }
  }

  const resultEl = document.getElementById("verify-result");
  resultEl.innerHTML =
    '<div class="verify-message ' + (winResult ? "pass" : "fail") + '">' +
      (winResult ? "Valid BINGO! (" + winResult + ")" : "Not a valid BINGO") +
    '</div>' +
    '<div class="verify-player-name">' + label + '</div>' +
    renderVerifyGrid(cells, marked, winCells, goalCells);
}

function renderVerifyGrid(cells, marked, winCells, goalCells) {
  let html = '<div class="verify-grid">';
  for (let i = 0; i < 25; i++) {
    let cls = marked.has(i) ? "drawn" : "not-drawn";
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
  const doc = new DOMParser().parseFromString(html, "text/html");
  const imgs = doc.querySelectorAll("img");
  const seen = {};
  const results = [];
  for (let i = 0; i < imgs.length; i++) {
    const src = imgs[i].getAttribute("src");
    if (!src) continue;
    if (prefix && src.indexOf(prefix) !== 0) continue;
    if (seen[src]) continue;
    seen[src] = true;
    const alt = imgs[i].getAttribute("alt");
    const name = (alt && alt.trim()) ? alt.trim() : nameFromUrl(src);
    results.push({ name: name.substring(0, 40), image: src });
  }
  return results;
}

function ensureUniqueNames(items) {
  const counts = {};
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const base = items[i].name;
    const key = base.toLowerCase();
    if (counts[key] === undefined) {
      counts[key] = 0;
    }
    counts[key]++;
    result.push({ name: base, image: items[i].image, _key: key });
  }
  // Second pass: append suffix to duplicates
  const seen = {};
  for (let j = 0; j < result.length; j++) {
    const k = result[j]._key;
    if (counts[k] > 1) {
      if (seen[k] === undefined) seen[k] = 0;
      seen[k]++;
      result[j].name = result[j].name + " " + seen[k];
    }
    delete result[j]._key;
  }
  return result;
}

function switchScrapeTab(tab) {
  const tabs = document.querySelectorAll(".scrape-tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle("active", tabs[i].dataset.tab === tab);
  }
  const panels = ["list", "html"];
  for (let j = 0; j < panels.length; j++) {
    const panel = document.getElementById("scrape-tab-" + panels[j]);
    if (panel) panel.style.display = panels[j] === tab ? "" : "none";
  }
}

function parseDirectHtml() {
  const html = document.getElementById("scrape-paste-direct").value;
  if (!html.trim()) return;

  const prefix = document.getElementById("scrape-prefix").value.trim();
  const status = document.getElementById("scrape-status");

  let items = parseImagesFromHtml(html, prefix);
  items = ensureUniqueNames(items);
  if (items.length === 0) {
    status.textContent = "No images found in pasted HTML" + (prefix ? " matching that prefix." : ".");
    status.className = "scrape-status error";
    return;
  }
  displayScrapedItems(items);
}

function parseImageList() {
  const raw = document.getElementById("scrape-image-list").value;
  const prefix = document.getElementById("scrape-prefix").value.trim();
  const status = document.getElementById("scrape-status");

  let lines = raw.split("\n")
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.length > 0 && (l.indexOf("http://") === 0 || l.indexOf("https://") === 0); });

  if (prefix) {
    lines = lines.filter(function(l) { return l.indexOf(prefix) === 0; });
  }

  if (lines.length === 0) {
    status.textContent = "No valid image URLs found" + (prefix ? " matching that prefix." : ".");
    status.className = "scrape-status error";
    return;
  }

  const seen = {};
  let items = [];
  for (let i = 0; i < lines.length; i++) {
    if (seen[lines[i]]) continue;
    seen[lines[i]] = true;
    items.push({ name: nameFromUrl(lines[i]).substring(0, 40), image: lines[i] });
  }
  items = ensureUniqueNames(items);
  displayScrapedItems(items);
}

function commonUrlPrefix(urls) {
  if (urls.length === 0) return "";
  let prefix = urls[0];
  for (let i = 1; i < urls.length; i++) {
    while (urls[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (!prefix) return "";
    }
  }
  const lastSlash = prefix.lastIndexOf("/");
  return lastSlash >= 0 ? prefix.substring(0, lastSlash + 1) : "";
}

function displayScrapedItems(items) {
  const status = document.getElementById("scrape-status");
  status.textContent = items.length + " image" + (items.length !== 1 ? "s" : "") + " found" + (items.length < 24 ? " (need at least 24)" : "");
  status.className = "scrape-status" + (items.length >= 24 ? " success" : " error");

  const prefix = commonUrlPrefix(items.map(function(it) { return it.image; }));
  hostState.urlPrefix = prefix;
  hostState.urlItems = encodeUrlItems(items, prefix);

  const preview = document.getElementById("scrape-preview");
  preview.innerHTML = "";
  for (let i = 0; i < items.length; i++) {
    const div = document.createElement("div");
    div.className = "scrape-preview-item";
    div.innerHTML = '<img src="' + items[i].image + '" alt="' + escapeXml(items[i].name) + '">' +
      '<span>' + escapeXml(items[i].name) + '</span>';
    preview.appendChild(div);
  }
}

function populateThemeSelect() {
  const select = document.getElementById("theme-select");
  select.innerHTML = "";
  const lastTheme = localStorage.getItem("bingo_last_theme");
  getThemeList().forEach(function(t) {
    const opt = document.createElement("option");
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
  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = "Custom (Text)";
  if (lastTheme === "custom") customOpt.selected = true;
  select.appendChild(customOpt);

  // Add Custom (Images) option
  const urlOpt = document.createElement("option");
  urlOpt.value = "urlscrape";
  urlOpt.textContent = "Custom (Images)";
  if (lastTheme === "urlscrape") urlOpt.selected = true;
  select.appendChild(urlOpt);

  // Show/hide custom builders
  const builder = document.getElementById("custom-items-builder");
  const urlBuilder = document.getElementById("url-scrape-builder");
  function updateBuilderVisibility() {
    builder.style.display = select.value === "custom" ? "" : "none";
    urlBuilder.style.display = select.value === "urlscrape" ? "" : "none";
  }
  updateBuilderVisibility();
  select.addEventListener("change", updateBuilderVisibility);

  // Live item counter
  const textarea = document.getElementById("custom-items-textarea");
  const counter = document.getElementById("custom-items-counter");
  textarea.addEventListener("input", function() {
    const names = parseCustomItemNames(textarea.value);
    counter.textContent = names.length + " item" + (names.length !== 1 ? "s" : "");
    counter.className = "custom-items-counter" + (names.length < 24 ? " insufficient" : "");
  });
}

// Init
(function init() {
  const urlGame = getParam("game");
  const urlTheme = getParam("theme");
  const urlPattern = getParam("pattern");
  const urlCitems = getParam("citems");
  const urlUitems = getParam("uitems");
  const urlUprefix = getParam("uprefix");

  if (urlPattern) {
    hostState.patternId = urlPattern;
    if (urlPattern.startsWith("c_")) {
      const decoded = decodeCustomPattern(urlPattern);
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

        for (let i = hostState.pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = hostState.pool[i];
          hostState.pool[i] = hostState.pool[j];
          hostState.pool[j] = tmp;
        }

        saveHostState();
        showGamePanel();
      });
    }
  });
})();
