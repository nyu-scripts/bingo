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
  { id: "paintbrushes", title: "Paint Brushes", items: [] },
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

function encodeCustomItems(names) {
  var joined = names.join("|");
  var encoded = btoa(unescape(encodeURIComponent(joined)));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeCustomItems(encoded) {
  var base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return decodeURIComponent(escape(atob(base64))).split("|");
}

function buildCustomTheme(names) {
  var items = names.map(function(name, i) {
    return { name: name, image: placeholderSvg(name, i) };
  });
  return { id: "custom", title: "Custom (Text)", items: items };
}

function nameFromUrl(url) {
  try {
    var path = url.split("?")[0].split("#")[0];
    var filename = path.split("/").pop();
    var name = filename.replace(/\.[^.]+$/, "");
    name = name.replace(/[-_]+/g, " ").trim();
    return name || "item";
  } catch (e) {
    return "item";
  }
}

function encodeUrlItems(items, prefix) {
  var joined = items.map(function(it) {
    var suffix = prefix ? it.image.substring(prefix.length) : it.image;
    return it.name + "\t" + suffix;
  }).join("|");
  var encoded = btoa(unescape(encodeURIComponent(joined)));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeUrlItems(encoded, prefix) {
  var base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  var joined = decodeURIComponent(escape(atob(base64)));
  return joined.split("|").map(function(pair) {
    var parts = pair.split("\t");
    return { name: parts[0], image: (prefix || "") + (parts[1] || "") };
  });
}

function buildUrlScrapeTheme(items) {
  return { id: "urlscrape", title: "Custom (Images)", items: items };
}

function loadTheme(themeId, encodedItems, urlData) {
  if (themeId === "custom") {
    var encoded = encodedItems || getParam("citems") || sessionStorage.getItem("bingo_custom_items");
    if (!encoded) return Promise.reject(new Error("No custom items found"));
    var names = decodeCustomItems(encoded);
    return Promise.resolve(buildCustomTheme(names));
  }

  if (themeId === "urlscrape") {
    var uenc = (urlData && urlData.items) || getParam("uitems") || sessionStorage.getItem("bingo_url_items");
    var upre = (urlData && urlData.prefix) || getParam("uprefix") || sessionStorage.getItem("bingo_url_prefix") || "";
    if (!uenc) return Promise.reject(new Error("No URL scrape items found"));
    var items = decodeUrlItems(uenc, upre);
    return Promise.resolve(buildUrlScrapeTheme(items));
  }

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
