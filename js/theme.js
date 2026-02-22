// Theme registry and placeholder SVG generation

var PALETTE = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
  "#3498db", "#9b59b6", "#e84393", "#00cec9", "#6c5ce7",
  "#fd79a8", "#00b894", "#fdcb6e", "#74b9ff", "#a29bfe",
  "#fab1a0", "#55efc4", "#81ecec", "#dfe6e9", "#ffeaa7",
];

// Manifest + inline fallback items for built-in themes.
// When served via HTTP, loadTheme() fetches themes/<id>.json instead.
var THEMES = [
  { id: "default", title: "Default", items: [] },
  { id: "biscuitneopets", title: "Biscuit Neopets", items: [] },
  { id: "candyneopets", title: "Candy Neopets", items: [] },
  { id: "greenneopets", title: "Green Neopets", items: [] },
  { id: "woodlandneopets", title: "Woodland Neopets", items: [] },
];

function getThemeList() {
  return THEMES.map(function(t) { return { id: t.id, title: t.title }; });
}

function placeholderSvg(name, index) {
  var bg = PALETTE[index % PALETTE.length];
  var text = luma(bg) > 0.5 ? "#222" : "#fff";
  var label = escapeXml(name);
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
        '<rect width="120" height="120" rx="12" fill="' + bg + '"/>' +
        '<text x="60" y="66" text-anchor="middle" font-family="system-ui,sans-serif" ' +
        'font-size="16" font-weight="600" fill="' + text + '">' + label + '</text>' +
        '</svg>'
    )
  );
}

function luma(hex) {
  var c = hex.replace("#", "");
  var r = parseInt(c.substring(0, 2), 16) / 255;
  var g = parseInt(c.substring(2, 4), 16) / 255;
  var b = parseInt(c.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function processThemeData(raw) {
  var items = raw.items.map(function(item, i) {
    return {
      name: item.name,
      image: item.image === "auto" ? placeholderSvg(item.name, i) : item.image,
    };
  });
  return { id: raw.id, title: raw.title, items: items };
}

function loadTheme(themeId) {
  // Find inline fallback
  var fallback = null;
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === themeId) { fallback = THEMES[i]; break; }
  }

  return fetch("themes/" + themeId + ".json")
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(processThemeData)
    .catch(function() {
      // fetch fails on file:// protocol — use inline fallback
      if (fallback && fallback.items && fallback.items.length > 0) return processThemeData(fallback);
      throw new Error("Theme not found: " + themeId + ". Are you using a local server?");
    });
}
