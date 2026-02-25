# CLAUDE.md

## Project Overview

Picture Bingo — a serverless browser-based bingo game with pictures. Pure vanilla JS, no build step, no frameworks. Serve as static files.

## Architecture

- **No server**: all state lives in URLs, `sessionStorage` (host), and `localStorage` (player marks)
- **Random cards with seed verification**: each player gets a random 4-char card seed; `gameCode + ":" + cardSeed` seeds the PRNG for card generation. Host verifies bingo by entering the card seed
- **Win patterns**: defined in `js/win.js` as arrays of cell index sets; custom patterns use a `c_<base36>` encoding of a 25-bit grid bitmask
- **Custom text themes**: host enters item names, which are joined with `|`, base64url-encoded, and passed as `citems` URL parameter to players. Items render as auto-colored SVG placeholders
- **Custom image themes**: host enters image URLs directly (one per line) or pastes page HTML to extract `<img>` tags, with an optional prefix filter. Images are encoded as `name\tsuffix` pairs in a `uitems` URL parameter, with the common URL prefix stored separately as `uprefix` to keep URLs short. Players decode items from the share link — no re-fetching needed

## Key Conventions

- All JS is plain ES2015+ (const/let, no modules) — files are loaded via `<script>` tags in dependency order
- CSS uses custom properties defined in `:root` in `css/style.css` (dark theme)
- The 5x5 grid uses indices 0-24, left-to-right top-to-bottom; index 12 is always FREE
- Card seeds are 4 uppercase alphanumeric characters (using `CODE_CHARS` from `game.js`)
- Game codes are 6 uppercase alphanumeric characters (excluding I/1/O/0 for readability)

## Pages

| Page | Purpose | Scripts |
|------|---------|---------|
| `index.html` | Landing page — "Host a Game" button and link to themes preview |  |
| `host.html` | Host page — game creation, drawing items, sharing link, verifying bingo | `prng.js` → `theme.js` → `game.js` → `card.js` → `win.js` → `host.js` |
| `play.html` | Player page — enter name, view card, mark cells, win detection | `prng.js` → `theme.js` → `game.js` → `card.js` → `win.js` → `player.js` |
| `themes.html` | Theme preview — browse all themes, verify images load | `prng.js` → `theme.js` + inline script |
| `test.html` | Test runner — loads all core scripts and runs assertions in the browser | `prng.js` → `theme.js` → `game.js` → `card.js` → `win.js` → `host.js` → `test.js` |

## File Responsibilities

### JavaScript

| File | Purpose |
|------|---------|
| `js/prng.js` | `cyrb53` hash, `mulberry32` PRNG, `seededRng` helper |
| `js/theme.js` | `THEMES` registry, `loadTheme()`, placeholder SVG generation, `encodeCustomItems()`/`decodeCustomItems()`/`buildCustomTheme()` for custom text themes, `encodeUrlItems()`/`decodeUrlItems()`/`buildUrlScrapeTheme()`/`nameFromUrl()` for URL scrape image themes |
| `js/game.js` | `generateGameCode()`, `getParam()`, `buildPlayUrl()`, `buildHostUrl()` (both accept optional `citems`, `uitems`, `uprefix`), `copyToClipboard()` |
| `js/card.js` | `generateCardSeed()`, `generateCard(themeItems, gameCode, cardSeed)` — random seed + deterministic 25-cell array |
| `js/win.js` | `WIN_PATTERNS`, `getPattern()`, `decodeCustomPattern()`, `checkWin()`, `renderPatternPreview()` |
| `js/host.js` | Host page controller — game creation, draw loop, pattern picker, custom grid builder, custom text theme builder, custom image builder (image list + paste HTML), bingo verification by card seed |
| `js/player.js` | Player page controller — name entry, card seed generation/restore, card rendering, cell toggling, win detection |
| `js/test.js` | Browser test suite — assertions for PRNG, card generation, win detection, custom patterns, custom text themes |

### CSS

| File | Purpose |
|------|---------|
| `css/style.css` | Shared base styles, CSS custom properties (`:root` dark theme), grid, buttons, pattern mini-preview |
| `css/host.css` | Host-specific — draw area, pattern picker, custom grid/items builders, URL scrape builder, verify section |
| `css/player.css` | Player-specific — card cells, marked/free states, win banner, goal indicator, focus mode |

### Data

| File | Purpose |
|------|---------|
| `themes/*.json` | Theme data — array of `{name, image}` items (image can be URL or `"auto"` for placeholder SVG) |

## Testing

### Automated tests

Open `test.html` in a browser (via local server) or run `node test-node.js` from the project root. The suite covers:
- PRNG determinism and value range
- Card generation (determinism, structure, uniqueness across seeds/game codes)
- Win detection (rows, columns, diagonals, corners, blackout, custom patterns, incomplete patterns)
- Built-in win pattern validity (all indices 0-24, grid lengths)
- Custom pattern encode/decode roundtrip
- Custom text theme encode/decode roundtrip (including Unicode)
- `parseCustomItemNames` (trim, dedup, pipe stripping, truncation)
- `buildCustomTheme`, `placeholderSvg`, `getPattern`
- Full host verification simulation (card generation → draw items → check win)

### Manual browser testing

Serve locally (`python3 -m http.server 8000`) and test:
- Host flow: create game, draw items, copy link
- Player flow: enter name, mark cells, verify win detection
- Custom patterns: draw pattern on host, verify it encodes in URL and decodes correctly on player side
- Card seeds: enter game as player, note the card code, refresh and re-enter — same card. Enter as different name — new random card. Host verify with card code — should match
- Custom text theme: select "Custom (Text)", enter 24+ items, create game, copy link, open as player — items display as colored SVG squares, bingo verification works
- Custom image theme: select "Custom (Images)", enter image URLs (one per line) or paste page HTML, optionally set prefix filter, verify preview grid, create game, copy link, open as player — images render on card, bingo verification works
- Theme preview: open `themes.html`, verify all images load for each theme
