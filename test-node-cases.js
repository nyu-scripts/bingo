var assert = _assert, assertEq = _assertEq;

var testItems = [];
for (var i = 0; i < 30; i++) testItems.push({ name: "Item" + i, image: "img" + i + ".png" });

// PRNG
(function() {
  var r1 = seededRng("testkey"), r2 = seededRng("testkey");
  var s1 = [r1(),r1(),r1(),r1(),r1()], s2 = [r2(),r2(),r2(),r2(),r2()];
  assertEq(s1, s2, "PRNG same key same seq");
  var a = seededRng("keyA"), b = seededRng("keyB");
  var same = true;
  for (var i = 0; i < 10; i++) if (a() !== b()) { same = false; break; }
  assert(!same, "PRNG diff keys diff seq");
  var rng = seededRng("range");
  var ok = true;
  for (var i = 0; i < 1000; i++) { var v = rng(); if (v < 0 || v >= 1) ok = false; }
  assert(ok, "PRNG values in [0,1)");
})();

// Card generation
(function() {
  var c1 = generateCard(testItems, "ABCDEF", "XY12");
  var c2 = generateCard(testItems, "ABCDEF", "XY12");
  assertEq(c1, c2, "Card deterministic");
  assertEq(c1.length, 25, "Card 25 cells");
  assert(c1[12].free === true, "Index 12 free");
  assertEq(c1[12].name, "FREE", "Index 12 name FREE");
  var nf = c1.filter(function(c) { return !c.free; });
  assert(nf.length === 24, "24 non-free cells");
  assertEq(new Set(nf.map(function(c) { return c.name; })).size, 24, "24 unique names");

  var ca = generateCard(testItems, "ABCDEF", "AAAA");
  var cb = generateCard(testItems, "ABCDEF", "BBBB");
  assert(ca.map(function(c) { return c.name; }).join() !== cb.map(function(c) { return c.name; }).join(), "Diff seeds diff cards");

  var ga = generateCard(testItems, "GAME01", "SEED");
  var gb = generateCard(testItems, "GAME02", "SEED");
  assert(ga.map(function(c) { return c.name; }).join() !== gb.map(function(c) { return c.name; }).join(), "Diff game codes diff cards");
})();

// Simulated verification
(function() {
  var card = generateCard(testItems, "TESTGM", "AB12");
  var topRow = [0, 1, 2, 3, 4];
  var dn = new Set();
  topRow.forEach(function(i) { if (!card[i].free) dn.add(card[i].name); });
  var marked = new Set();
  for (var i = 0; i < 25; i++) if (card[i].free || dn.has(card[i].name)) marked.add(i);
  var r = checkWin(marked, "line");
  assert(r !== null, "Top row drawn -> win");
  assertEq(r, "Any Line", "Win = Any Line");
})();

(function() {
  var card = generateCard(testItems, "TESTGM", "AB12");
  var dn = new Set();
  for (var i = 0; i < 3; i++) if (!card[i].free) dn.add(card[i].name);
  var marked = new Set();
  for (var i = 0; i < 25; i++) if (card[i].free || dn.has(card[i].name)) marked.add(i);
  assert(checkWin(marked, "line") === null, "Partial row no win");
})();

// Win detection
(function() {
  assertEq(checkWin(new Set([0, 1, 2, 3, 4, 12]), "line"), "Any Line", "Row win");
  assertEq(checkWin(new Set([0, 5, 10, 12, 15, 20]), "line"), "Any Line", "Col win");
  assertEq(checkWin(new Set([0, 6, 12, 18, 24]), "line"), "Any Line", "Diag win");
  assert(checkWin(new Set([0, 1, 2, 12]), "line") === null, "Incomplete no win");
  assertEq(checkWin(new Set([0, 4, 12, 20, 24]), "corners"), "Four Corners", "Corners win");
  assert(checkWin(new Set([0, 4, 12, 20]), "corners") === null, "3 corners no win");
  var all = new Set();
  for (var i = 0; i < 25; i++) all.add(i);
  assertEq(checkWin(all, "blackout"), "Blackout", "Blackout win");
})();

// Pattern validity
WIN_PATTERNS.forEach(function(p) {
  var valid = true;
  p.sets.forEach(function(set) {
    set.forEach(function(idx) {
      if (typeof idx !== "number" || idx < 0 || idx > 24) valid = false;
    });
  });
  assert(valid, "Pattern " + p.name + " indices valid");
  assertEq(p.grid.length, 25, "Pattern " + p.name + " grid 25");
});

// Custom pattern encode/decode
(function() {
  var grid = [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1];
  var enc = encodeCustomPattern(grid);
  assert(enc.indexOf("c_") === 0, "Encoded starts with c_");
  assertEq(decodeCustomPattern(enc).grid, grid, "Custom pattern roundtrip");
})();

(function() {
  var grid = Array(25).fill(0);
  grid[0] = 1; grid[4] = 1; grid[20] = 1; grid[24] = 1;
  var dec = decodeCustomPattern(encodeCustomPattern(grid));
  assertEq(dec.sets[0].sort(function(a, b) { return a - b; }), [0, 4, 20, 24], "Decoded indices");
})();

(function() {
  var grid = Array(25).fill(0);
  grid[0] = 1; grid[1] = 1; grid[2] = 1;
  var pid = encodeCustomPattern(grid);
  assertEq(checkWin(new Set([0, 1, 2, 12]), pid), "Custom", "Custom win");
  assert(checkWin(new Set([0, 1, 12]), pid) === null, "Custom incomplete");
})();

// Custom items encode/decode
(function() {
  var names = ["Apple", "Banana", "Cherry", "Dragonfruit"];
  assertEq(decodeCustomItems(encodeCustomItems(names)), names, "Items roundtrip");
  var uni = ["Caf\u00e9", "Na\u00efve", "\u65e5\u672c\u8a9e", "\u00d1o\u00f1o", "\ud83c\udf89 Party"];
  assertEq(decodeCustomItems(encodeCustomItems(uni)), uni, "Unicode roundtrip");
  var enc = encodeCustomItems(["test"]);
  assert(enc.indexOf("+") === -1 && enc.indexOf("/") === -1 && enc.indexOf("=") === -1, "Base64url safe");
})();

// parseCustomItemNames
(function() {
  assertEq(parseCustomItemNames("Apple\nBanana\nCherry"), ["Apple", "Banana", "Cherry"], "Basic parse");
  assertEq(parseCustomItemNames("  Apple  \n  Banana  "), ["Apple", "Banana"], "Trim");
  assertEq(parseCustomItemNames("Apple\n\n\nBanana\n\n"), ["Apple", "Banana"], "Empty lines");
  assertEq(parseCustomItemNames("Apple\napple\nAPPLE\nBanana"), ["Apple", "Banana"], "Dedup");
  assertEq(parseCustomItemNames("Pipe|Test\nNo|Pipes|Here"), ["PipeTest", "NoPipesHere"], "Pipes stripped");
  var long = "";
  for (var i = 0; i < 50; i++) long += "A";
  assertEq(parseCustomItemNames(long)[0].length, 40, "Truncate 40");
})();

// buildCustomTheme
(function() {
  var t = buildCustomTheme(["Cat", "Dog", "Bird"]);
  assertEq(t.id, "custom", "Theme id");
  assertEq(t.items.length, 3, "Item count");
  assertEq(t.items[0].name, "Cat", "First name");
  assert(t.items[0].image.indexOf("data:image/svg+xml") === 0, "SVG placeholder");
})();

// placeholderSvg
(function() {
  var svg = placeholderSvg("Test", 0);
  assert(svg.indexOf("data:image/svg+xml,") === 0, "SVG data URI");
  assert(svg.indexOf("Test") > 0, "Contains name");
  var esc = placeholderSvg("<script>", 0);
  assert(esc.indexOf("<script>") === -1, "Escapes dangerous");
})();

// getPattern
(function() {
  assertEq(getPattern("line").id, "line", "getPattern line");
  assertEq(getPattern("corners").id, "corners", "getPattern corners");
  assertEq(getPattern("nonexistent").id, "line", "getPattern fallback");
  assertEq(getPattern("c_abc").name, "Custom", "getPattern custom");
})();

// Full verification simulation
(function() {
  var names = [];
  for (var i = 0; i < 30; i++) names.push("Thing" + i);
  var theme = buildCustomTheme(names);
  var card = generateCard(theme.items, "VERIFY", "TEST");
  var dn = new Set(theme.items.map(function(it) { return it.name; }));
  var marked = new Set();
  for (var i = 0; i < 25; i++) if (card[i].free || dn.has(card[i].name)) marked.add(i);
  assertEq(marked.size, 25, "All 25 marked blackout");
  assertEq(checkWin(marked, "blackout"), "Blackout", "Blackout verify");
})();

(function() {
  var names = [];
  for (var i = 0; i < 30; i++) names.push("Item " + i);
  var enc = encodeCustomItems(names);
  var dec = decodeCustomItems(enc);
  var t1 = buildCustomTheme(names), t2 = buildCustomTheme(dec);
  var c1 = generateCard(t1.items, "ROUNDT", "TRIP");
  var c2 = generateCard(t2.items, "ROUNDT", "TRIP");
  assertEq(
    c1.map(function(c) { return c.name; }),
    c2.map(function(c) { return c.name; }),
    "Encoded->decoded card match"
  );
})();

(function() {
  var names = [];
  for (var i = 0; i < 30; i++) names.push("Entry" + i);
  var theme = buildCustomTheme(names);
  var card = generateCard(theme.items, "LNTEST", "LINE");
  var col = [0, 5, 10, 15, 20];
  var dn = new Set();
  col.forEach(function(idx) { if (!card[idx].free) dn.add(card[idx].name); });
  var marked = new Set();
  for (var i = 0; i < 25; i++) if (card[i].free || dn.has(card[i].name)) marked.add(i);
  assert(col.every(function(i) { return marked.has(i); }), "Col cells marked");
  assertEq(checkWin(marked, "line"), "Any Line", "Col win via host flow");
})();
