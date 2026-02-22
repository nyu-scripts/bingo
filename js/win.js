// Win pattern registry and detection for a 5x5 bingo card
// `marked` is a Set of indices 0-24 (center = 12 is always free)

const WIN_PATTERNS = (() => {
  // Helper: build rows, cols, diagonals
  const rows = [];
  const cols = [[], [], [], [], []];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      row.push(idx);
      cols[c].push(idx);
    }
    rows.push(row);
  }
  const diag1 = [0, 6, 12, 18, 24];
  const diag2 = [4, 8, 12, 16, 20];

  // Helper: create grid from a flat array of cell indices
  function gridFrom(indices) {
    const g = Array(25).fill(0);
    indices.forEach(i => g[i] = 1);
    return g;
  }

  return [
    {
      id: "line",
      name: "Any Line",
      sets: [...rows, ...cols, diag1, diag2],
      // Preview: show an X pattern to hint "lines"
      grid: gridFrom([...diag1, ...diag2]),
    },
    {
      id: "corners",
      name: "Four Corners",
      sets: [[0, 4, 20, 24]],
      grid: gridFrom([0, 4, 20, 24]),
    },
    {
      id: "x",
      name: "X Pattern",
      sets: [[...new Set([...diag1, ...diag2])]],
      grid: gridFrom([...new Set([...diag1, ...diag2])]),
    },
    {
      id: "plus",
      name: "Plus",
      sets: [[...new Set([...rows[2], ...cols[2]])]],
      grid: gridFrom([...new Set([...rows[2], ...cols[2]])]),
    },
    {
      id: "diamond",
      name: "Diamond",
      sets: [[2, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 22]],
      grid: gridFrom([2, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 22]),
    },
    {
      id: "heart",
      name: "Heart",
      sets: [[1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 22]],
      grid: gridFrom([1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 22]),
    },
    {
      id: "frame",
      name: "Frame",
      sets: [[0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24]],
      grid: gridFrom([0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24]),
    },
    {
      id: "arrow",
      name: "Arrow",
      sets: [[2, 8, 10, 11, 12, 13, 14, 18, 22]],
      grid: gridFrom([2, 8, 10, 11, 12, 13, 14, 18, 22]),
    },
    {
      id: "stamp",
      name: "Postage Stamp",
      sets: [[0, 1, 5, 6]],
      grid: gridFrom([0, 1, 5, 6]),
    },
    {
      id: "letter-t",
      name: "Letter T",
      sets: [[...new Set([...rows[0], ...cols[2]])]],
      grid: gridFrom([...new Set([...rows[0], ...cols[2]])]),
    },
    {
      id: "letter-l",
      name: "Letter L",
      sets: [[...new Set([...cols[0], ...rows[4]])]],
      grid: gridFrom([...new Set([...cols[0], ...rows[4]])]),
    },
    {
      id: "blackout",
      name: "Blackout",
      sets: [Array.from({ length: 25 }, (_, i) => i)],
      grid: Array(25).fill(1),
    },
  ];
})();

function decodeCustomPattern(id) {
  const bits = parseInt(id.slice(2), 36);
  const grid = [];
  const onIndices = [];
  for (let i = 0; i < 25; i++) {
    const on = (bits >> i) & 1;
    grid.push(on);
    if (on) onIndices.push(i);
  }
  return { id, name: "Custom", sets: [onIndices], grid };
}

function getPattern(id) {
  if (typeof id === "string" && id.startsWith("c_")) return decodeCustomPattern(id);
  return WIN_PATTERNS.find(p => p.id === id) || WIN_PATTERNS[0];
}

function checkWin(marked, patternId) {
  const pattern = getPattern(patternId);
  const has = (indices) => indices.every(i => marked.has(i));

  for (const set of pattern.sets) {
    if (has(set)) return pattern.name;
  }
  return null;
}

function renderPatternPreview(pattern) {
  let html = '<div class="pattern-mini">';
  for (let i = 0; i < 25; i++) {
    html += `<div class="${pattern.grid[i] ? "on" : "off"}"></div>`;
  }
  html += '</div>';
  return html;
}
