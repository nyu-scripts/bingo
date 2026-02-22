# CLAUDE.md

## Project Overview

Picture Bingo — a serverless browser-based bingo game with pictures. Pure vanilla JS, no build step, no frameworks. Serve as static files.

## Architecture

- **No server**: all state lives in URLs, `sessionStorage` (host), and `localStorage` (player marks)
- **Deterministic cards**: game code + player name seed a PRNG (`prng.js`) that shuffles theme items identically for any client
- **Win patterns**: defined in `js/win.js` as arrays of cell index sets; custom patterns use a `c_<base36>` encoding of a 25-bit grid bitmask

## Key Conventions

- All JS is plain ES5+ with no modules — files are loaded via `<script>` tags in dependency order
- CSS uses custom properties defined in `:root` in `css/style.css` (dark theme)
- The 5x5 grid uses indices 0-24, left-to-right top-to-bottom; index 12 is always FREE
- Player names are lowercased before use as PRNG seeds (`playerName.toLowerCase()`)
- Game codes are 6 uppercase alphanumeric characters (excluding I/1/O/0 for readability)

## Script Load Order

### host.html
`prng.js` -> `theme.js` -> `game.js` -> `win.js` -> `host.js`

### play.html
`prng.js` -> `theme.js` -> `game.js` -> `card.js` -> `win.js` -> `player.js`

## File Responsibilities

| File | Purpose |
|------|---------|
| `js/prng.js` | `cyrb53` hash, `mulberry32` PRNG, `seededRng` helper |
| `js/theme.js` | `THEMES` registry, `loadTheme()`, placeholder SVG generation |
| `js/game.js` | `generateGameCode()`, `getParam()`, `buildPlayUrl()`, `buildHostUrl()`, `copyToClipboard()` |
| `js/card.js` | `generateCard(themeItems, gameCode, playerName)` — deterministic 25-cell array |
| `js/win.js` | `WIN_PATTERNS`, `getPattern()`, `decodeCustomPattern()`, `checkWin()`, `renderPatternPreview()` |
| `js/host.js` | Host page controller — game creation, draw loop, pattern picker, custom grid builder |
| `js/player.js` | Player page controller — name entry, card rendering, cell toggling, win detection |

## Testing

No test framework. To verify changes, serve locally (`python3 -m http.server 8000`) and test in browser:
- Host flow: create game, draw items, copy link
- Player flow: enter name, mark cells, verify win detection
- Custom patterns: draw pattern on host, verify it encodes in URL and decodes correctly on player side
