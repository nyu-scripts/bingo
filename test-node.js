// Node.js test runner — mirrors js/test.js logic without needing a browser
var vm = require("vm");
var fs = require("fs");

var ctx = vm.createContext({
  console: console,
  Math: Math,
  Set: Set,
  Promise: Promise,
  Array: Array,
  JSON: JSON,
  parseInt: parseInt,
  parseFloat: parseFloat,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  escape: escape,
  unescape: unescape,
  btoa: btoa,
  atob: atob,
  setTimeout: setTimeout,
  URLSearchParams: URLSearchParams,
  window: { location: { search: "", href: "http://localhost/test.html" } },
  localStorage: { getItem: function() { return null; }, setItem: function() {} },
  sessionStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
  history: { replaceState: function() {} },
  navigator: { clipboard: { writeText: function() { return Promise.resolve(); } } },
  fetch: function() { return Promise.reject(new Error("no fetch")); },
  alert: function() {},
  document: {
    _els: {},
    getElementById: function(id) {
      if (!this._els[id]) {
        this._els[id] = {
          value: "default", style: { display: "" }, innerHTML: "", textContent: "",
          children: [], appendChild: function(c) { this.children.push(c); return c; },
          addEventListener: function() {}, querySelector: function() { return null; },
          querySelectorAll: function() { return []; }, classList: { toggle: function() {} },
          dataset: {}, selected: false, disabled: false, focus: function() {},
        };
      }
      return this._els[id];
    },
    createElement: function() {
      return {
        className: "", textContent: "", innerHTML: "", value: "",
        style: { display: "" }, children: [],
        appendChild: function(c) { this.children.push(c); return c; },
        addEventListener: function() {}, dataset: {}, selected: false,
      };
    },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; },
  },
});

// Suppress unhandled rejections from host.js IIFE trying to fetch theme files
process.on("unhandledRejection", function() {});

// Load scripts in order
["js/prng.js", "js/theme.js", "js/game.js", "js/card.js", "js/win.js", "js/host.js"].forEach(function(f) {
  try { vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f }); }
  catch (e) { console.error("Error loading " + f + ":", e.message); }
});

// Inject test helpers
var passed = 0, failed = 0;
ctx._assert = function(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.log("FAIL:", msg); }
};
ctx._assertEq = function(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; }
  else { failed++; console.log("FAIL:", msg, "— expected", JSON.stringify(expected), "got", JSON.stringify(actual)); }
};

// Run the test logic
vm.runInContext(fs.readFileSync("test-node-cases.js", "utf8"), ctx, { filename: "test-node-cases.js" });

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
