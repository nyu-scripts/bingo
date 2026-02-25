// Minimal test runner for Picture Bingo
(function() {
  let passed = 0;
  let failed = 0;
  const logEl = document.getElementById("log");

  function log(type, msg) {
    const div = document.createElement("div");
    div.className = type.toLowerCase();
    div.textContent = type + ": " + msg;
    logEl.appendChild(div);
  }

  function group(name) {
    const div = document.createElement("div");
    div.className = "group";
    div.textContent = "— " + name + " —";
    logEl.appendChild(div);
  }

  function assert(condition, msg) {
    if (condition) { passed++; log("PASS", msg); }
    else { failed++; log("FAIL", msg); }
  }

  function assertEq(actual, expected, msg) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { passed++; log("PASS", msg); }
    else { failed++; log("FAIL", msg + " — expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual)); }
  }

  // --- Test theme items for card tests ---
  const testItems = [];
  for (let i = 0; i < 30; i++) {
    testItems.push({ name: "Item" + i, image: "img" + i + ".png" });
  }

  // =========================================================
  group("PRNG consistency");
  // =========================================================

  (function() {
    const rng1 = seededRng("testkey");
    const rng2 = seededRng("testkey");
    const seq1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2(), rng2(), rng2()];
    assertEq(seq1, seq2, "seededRng with same key produces same sequence");
  })();

  (function() {
    const rng1 = seededRng("keyA");
    const rng2 = seededRng("keyB");
    let same = true;
    for (let i = 0; i < 10; i++) {
      if (rng1() !== rng2()) { same = false; break; }
    }
    assert(!same, "seededRng with different keys produces different sequences");
  })();

  (function() {
    const rng = seededRng("range-test");
    let allInRange = true;
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      if (v < 0 || v >= 1) { allInRange = false; break; }
    }
    assert(allInRange, "PRNG values are in [0, 1)");
  })();

  // =========================================================
  group("Card generation & verification");
  // =========================================================

  (function() {
    const card1 = generateCard(testItems, "ABCDEF", "XY12");
    const card2 = generateCard(testItems, "ABCDEF", "XY12");
    assertEq(card1, card2, "generateCard is deterministic (same inputs → same card)");
  })();

  (function() {
    const card = generateCard(testItems, "ABCDEF", "XY12");
    assertEq(card.length, 25, "Card has 25 cells");
  })();

  (function() {
    const card = generateCard(testItems, "ABCDEF", "XY12");
    assert(card[12].free === true, "Index 12 is FREE");
    assertEq(card[12].name, "FREE", "Index 12 name is 'FREE'");
  })();

  (function() {
    const card = generateCard(testItems, "ABCDEF", "XY12");
    const nonFree = card.filter(function(c) { return !c.free; });
    assert(nonFree.length === 24, "24 non-FREE cells");
    const allHaveNames = nonFree.every(function(c) { return c.name && c.name !== "FREE"; });
    assert(allHaveNames, "All non-FREE cells have item names");
  })();

  (function() {
    const card = generateCard(testItems, "ABCDEF", "XY12");
    const names = card.filter(function(c) { return !c.free; }).map(function(c) { return c.name; });
    const unique = new Set(names);
    assertEq(unique.size, 24, "All 24 non-FREE cell names are unique");
  })();

  (function() {
    const card1 = generateCard(testItems, "ABCDEF", "AAAA");
    const card2 = generateCard(testItems, "ABCDEF", "BBBB");
    const names1 = card1.map(function(c) { return c.name; }).join(",");
    const names2 = card2.map(function(c) { return c.name; }).join(",");
    assert(names1 !== names2, "Different card seeds produce different cards");
  })();

  (function() {
    const card1 = generateCard(testItems, "GAME01", "SEED");
    const card2 = generateCard(testItems, "GAME02", "SEED");
    const names1 = card1.map(function(c) { return c.name; }).join(",");
    const names2 = card2.map(function(c) { return c.name; }).join(",");
    assert(names1 !== names2, "Different game codes produce different cards");
  })();

  // Simulated host verification: generate card, mark drawn items, check win
  (function() {
    const gameCode = "TESTGM";
    const cardSeed = "AB12";
    const card = generateCard(testItems, gameCode, cardSeed);

    // "Draw" specific items — get the names that appear in the top row (indices 0-4, skipping 12)
    const topRow = [0, 1, 2, 3, 4];
    const drawnNames = new Set();
    topRow.forEach(function(i) {
      if (!card[i].free) drawnNames.add(card[i].name);
    });

    // Build marked set the same way host's verifyBingo does
    const marked = new Set();
    for (let i = 0; i < 25; i++) {
      if (card[i].free || drawnNames.has(card[i].name)) marked.add(i);
    }

    const result = checkWin(marked, "line");
    assert(result !== null, "Simulated verification: top row drawn → line win detected");
    assertEq(result, "Any Line", "Win result name is 'Any Line'");
  })();

  (function() {
    const card = generateCard(testItems, "TESTGM", "AB12");
    // Draw only 3 of 5 items from top row — should NOT win
    const drawnNames = new Set();
    for (let i = 0; i < 3; i++) {
      if (!card[i].free) drawnNames.add(card[i].name);
    }

    const marked = new Set();
    for (let i = 0; i < 25; i++) {
      if (card[i].free || drawnNames.has(card[i].name)) marked.add(i);
    }

    const result = checkWin(marked, "line");
    assert(result === null, "Partial row does not trigger a win");
  })();

  // =========================================================
  group("Win detection");
  // =========================================================

  (function() {
    // Row 0: indices 0,1,2,3,4
    const marked = new Set([0, 1, 2, 3, 4, 12]);
    const result = checkWin(marked, "line");
    assertEq(result, "Any Line", "Completed top row → 'Any Line' win");
  })();

  (function() {
    // Column 0: indices 0,5,10,15,20
    const marked = new Set([0, 5, 10, 12, 15, 20]);
    const result = checkWin(marked, "line");
    assertEq(result, "Any Line", "Completed left column → 'Any Line' win");
  })();

  (function() {
    // Diagonal: 0,6,12,18,24
    const marked = new Set([0, 6, 12, 18, 24]);
    const result = checkWin(marked, "line");
    assertEq(result, "Any Line", "Completed diagonal → 'Any Line' win");
  })();

  (function() {
    const marked = new Set([0, 1, 2, 12]);
    const result = checkWin(marked, "line");
    assert(result === null, "Incomplete line → no win");
  })();

  (function() {
    // Four corners
    const marked = new Set([0, 4, 12, 20, 24]);
    const result = checkWin(marked, "corners");
    assertEq(result, "Four Corners", "Four corners marked → 'Four Corners' win");
  })();

  (function() {
    // Missing one corner
    const marked = new Set([0, 4, 12, 20]);
    const result = checkWin(marked, "corners");
    assert(result === null, "Three corners → no win");
  })();

  (function() {
    // Blackout
    const all = new Set();
    for (let i = 0; i < 25; i++) all.add(i);
    const result = checkWin(all, "blackout");
    assertEq(result, "Blackout", "All 25 marked → 'Blackout' win");
  })();

  // =========================================================
  group("Win patterns validity");
  // =========================================================

  (function() {
    WIN_PATTERNS.forEach(function(p) {
      let valid = true;
      p.sets.forEach(function(set) {
        set.forEach(function(idx) {
          if (typeof idx !== "number" || idx < 0 || idx > 24) valid = false;
        });
      });
      assert(valid, "Pattern '" + p.name + "' — all indices in 0-24");
    });
  })();

  (function() {
    WIN_PATTERNS.forEach(function(p) {
      assertEq(p.grid.length, 25, "Pattern '" + p.name + "' — grid has 25 cells");
    });
  })();

  // =========================================================
  group("Custom pattern encode/decode");
  // =========================================================

  (function() {
    // Encode a grid → decode it → should match
    const grid = [1,0,1,0,0, 0,1,0,1,0, 1,0,1,0,1, 0,1,0,1,0, 0,0,1,0,1];
    const encoded = encodeCustomPattern(grid);
    assert(encoded.startsWith("c_"), "Encoded custom pattern starts with 'c_'");

    const decoded = decodeCustomPattern(encoded);
    assertEq(decoded.grid, grid, "Custom pattern encode → decode roundtrip preserves grid");
  })();

  (function() {
    // Corners only
    const grid = Array(25).fill(0);
    grid[0] = 1; grid[4] = 1; grid[20] = 1; grid[24] = 1;
    const encoded = encodeCustomPattern(grid);
    const decoded = decodeCustomPattern(encoded);
    const expectedIndices = [0, 4, 20, 24];
    assertEq(decoded.sets[0].sort(function(a, b) { return a - b; }), expectedIndices, "Decoded custom pattern has correct cell indices");
  })();

  (function() {
    // checkWin with custom pattern
    const grid = Array(25).fill(0);
    grid[0] = 1; grid[1] = 1; grid[2] = 1;
    const patternId = encodeCustomPattern(grid);
    const marked = new Set([0, 1, 2, 12]);
    const result = checkWin(marked, patternId);
    assertEq(result, "Custom", "checkWin with custom pattern detects win");
  })();

  (function() {
    const grid = Array(25).fill(0);
    grid[0] = 1; grid[1] = 1; grid[2] = 1;
    const patternId = encodeCustomPattern(grid);
    const marked = new Set([0, 1, 12]); // missing index 2
    const result = checkWin(marked, patternId);
    assert(result === null, "checkWin with custom pattern — incomplete → no win");
  })();

  // =========================================================
  group("Custom text theme encode/decode");
  // =========================================================

  (function() {
    const names = ["Apple", "Banana", "Cherry", "Dragonfruit"];
    const encoded = encodeCustomItems(names);
    const decoded = decodeCustomItems(encoded);
    assertEq(decoded, names, "encodeCustomItems → decodeCustomItems roundtrip");
  })();

  (function() {
    const names = ["Café", "Naïve", "日本語", "Ñoño", "🎉 Party"];
    const encoded = encodeCustomItems(names);
    const decoded = decodeCustomItems(encoded);
    assertEq(decoded, names, "Unicode characters survive encode/decode roundtrip");
  })();

  (function() {
    const encoded = encodeCustomItems(["test"]);
    // base64url: no +, /, or trailing =
    assert(encoded.indexOf("+") === -1, "Encoded string has no + characters");
    assert(encoded.indexOf("/") === -1, "Encoded string has no / characters");
    assert(encoded.indexOf("=") === -1, "Encoded string has no trailing = padding");
  })();

  // =========================================================
  group("parseCustomItemNames");
  // =========================================================

  (function() {
    const result = parseCustomItemNames("Apple\nBanana\nCherry");
    assertEq(result, ["Apple", "Banana", "Cherry"], "Basic parsing: one item per line");
  })();

  (function() {
    const result = parseCustomItemNames("  Apple  \n  Banana  ");
    assertEq(result, ["Apple", "Banana"], "Trims whitespace");
  })();

  (function() {
    const result = parseCustomItemNames("Apple\n\n\nBanana\n\n");
    assertEq(result, ["Apple", "Banana"], "Empty lines are ignored");
  })();

  (function() {
    const result = parseCustomItemNames("Apple\napple\nAPPLE\nBanana");
    assertEq(result, ["Apple", "Banana"], "Deduplicates case-insensitively (keeps first)");
  })();

  (function() {
    const result = parseCustomItemNames("Pipe|Test\nNo|Pipes|Here");
    assertEq(result, ["PipeTest", "NoPipesHere"], "Pipe characters are stripped");
  })();

  (function() {
    const long = "A".repeat(50);
    const result = parseCustomItemNames(long);
    assertEq(result[0].length, 40, "Names are truncated to 40 characters");
  })();

  // =========================================================
  group("buildCustomTheme");
  // =========================================================

  (function() {
    const names = ["Cat", "Dog", "Bird"];
    const theme = buildCustomTheme(names);
    assertEq(theme.id, "custom", "Custom theme id is 'custom'");
    assertEq(theme.items.length, 3, "Custom theme has correct item count");
    assertEq(theme.items[0].name, "Cat", "First item name matches");
    assert(theme.items[0].image.indexOf("data:image/svg+xml") === 0, "Items have SVG placeholder images");
  })();

  // =========================================================
  group("placeholderSvg");
  // =========================================================

  (function() {
    const svg = placeholderSvg("Test", 0);
    assert(svg.indexOf("data:image/svg+xml,") === 0, "Returns a data URI");
    assert(svg.indexOf("Test") > 0, "Contains the item name");
  })();

  (function() {
    const svg = placeholderSvg("<script>", 0);
    assert(svg.indexOf("<script>") === -1, "XML-escapes dangerous characters");
    assert(svg.indexOf("&lt;script&gt;") > 0, "Contains escaped version");
  })();

  // =========================================================
  group("getPattern");
  // =========================================================

  (function() {
    const p = getPattern("line");
    assertEq(p.id, "line", "getPattern('line') returns the line pattern");
  })();

  (function() {
    const p = getPattern("corners");
    assertEq(p.id, "corners", "getPattern('corners') returns corners pattern");
  })();

  (function() {
    const p = getPattern("nonexistent");
    assertEq(p.id, "line", "getPattern with unknown id falls back to first pattern (line)");
  })();

  (function() {
    const p = getPattern("c_abc");
    assertEq(p.name, "Custom", "getPattern with c_ prefix returns custom pattern");
  })();

  // =========================================================
  group("Full verification simulation");
  // =========================================================

  // Simulate the exact flow: host creates game, draws items, player has a card,
  // host verifies by card seed — same logic as verifyBingo() in host.js
  (function() {
    const gameCode = "VERIFY";
    const cardSeed = "TEST";

    // Build a custom text theme with 30 items
    const names = [];
    for (let i = 0; i < 30; i++) names.push("Thing" + i);
    const theme = buildCustomTheme(names);

    // Generate the player's card
    const card = generateCard(theme.items, gameCode, cardSeed);

    // Simulate host drawing: draw ALL items (blackout scenario)
    const drawnNames = new Set(theme.items.map(function(item) { return item.name; }));

    // Host verification: build marked set from card + drawn names
    const marked = new Set();
    for (let i = 0; i < 25; i++) {
      if (card[i].free || drawnNames.has(card[i].name)) marked.add(i);
    }

    assertEq(marked.size, 25, "All 25 cells marked when all items drawn");
    const result = checkWin(marked, "blackout");
    assertEq(result, "Blackout", "Full blackout verification passes");
  })();

  // Verify that a custom text theme roundtrips correctly through encode/decode
  // and produces the same card
  (function() {
    const gameCode = "ROUNDT";
    const cardSeed = "TRIP";
    const names = [];
    for (let i = 0; i < 30; i++) names.push("Item " + i);

    // Encode then decode, build theme from decoded names
    const encoded = encodeCustomItems(names);
    const decoded = decodeCustomItems(encoded);
    const theme1 = buildCustomTheme(names);
    const theme2 = buildCustomTheme(decoded);

    const card1 = generateCard(theme1.items, gameCode, cardSeed);
    const card2 = generateCard(theme2.items, gameCode, cardSeed);

    const names1 = card1.map(function(c) { return c.name; });
    const names2 = card2.map(function(c) { return c.name; });
    assertEq(names1, names2, "Card from original names matches card from encoded→decoded names");
  })();

  // Verify line win with custom text theme via host verification flow
  (function() {
    const gameCode = "LNTEST";
    const cardSeed = "LINE";
    const names = [];
    for (let i = 0; i < 30; i++) names.push("Entry" + i);
    const theme = buildCustomTheme(names);
    const card = generateCard(theme.items, gameCode, cardSeed);

    // Draw exactly the items in the first column (indices 0,5,10,15,20)
    const colIndices = [0, 5, 10, 15, 20];
    const drawnNames = new Set();
    colIndices.forEach(function(idx) {
      if (!card[idx].free) drawnNames.add(card[idx].name);
    });

    const marked = new Set();
    for (let i = 0; i < 25; i++) {
      if (card[i].free || drawnNames.has(card[i].name)) marked.add(i);
    }

    // All 5 column cells should be marked (index 10 might already be free-adjacent to 12, but column 0 doesn't include 12)
    const colMarked = colIndices.every(function(i) { return marked.has(i); });
    assert(colMarked, "All first-column cells are marked");

    const result = checkWin(marked, "line");
    assertEq(result, "Any Line", "First column win verified through host flow");
  })();

  // =========================================================
  // Summary
  // =========================================================

  const summary = document.createElement("div");
  summary.className = "summary " + (failed === 0 ? "pass" : "fail");
  summary.textContent = passed + " passed, " + failed + " failed";
  logEl.appendChild(summary);

  document.title = (failed === 0 ? "PASS" : "FAIL") + " (" + passed + "/" + (passed + failed) + ") — Tests";
})();
