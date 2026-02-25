# Picture Bingo

A serverless, browser-based bingo game that uses pictures instead of numbers. Designed for online events. The host draws pictures and players mark their cards in real time. No backend required; all game state is encoded in URLs and handled client-side.

## How It Works

1. **Host** creates a game at `host.html`, picks a theme and win pattern, then shares the generated link
2. **Players** open the link, enter their name, and get a random bingo card with a unique card code (e.g. `#AB3X`)
3. Host draws items one at a time; players mark matching cells on their cards
4. When a player's marked cells match the win pattern, they get a BINGO
5. **Verification**: the player shares their card code with the host, who enters it to regenerate and verify the card

Cards are randomly generated each time a player joins. A 4-character card seed is stored in localStorage so refreshing the page keeps the same card.

## Themes

Five built-in themes are available:

- **Default** — generic icons (auto-generated SVG placeholders)
- **Biscuit Neopets** (50 pets)
- **Candy Neopets** (49 pets)
- **Green Neopets** (55 pets)
- **Woodland Neopets** (55 pets)

Two custom theme modes:

- **Custom (Text)** — host types item names, they get base64url-encoded into a `citems` URL parameter and render as auto-colored SVG placeholder squares
- **Custom (Images)** — host provides a URL + optional prefix filter, the system extracts `<img>` tags from the page (with a paste-HTML fallback for CORS failures). Image URLs are split into a shared `uprefix` and per-item suffixes encoded in `uitems`, keeping share links short. Players decode everything from the link — no re-fetching needed

Theme data is stored as JSON files in `themes/`. The theme preview page (`themes.html`) lets you browse all themes and pre-cache images before starting a game.

## Running Locally

Serve the project with any static file server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` to get started. Theme JSON files are fetched over HTTP, so opening the HTML files directly via `file://` will not work.

## Project Structure

```
bingo/
  index.html          Landing page
  host.html           Host game creation & draw interface
  play.html           Player bingo card
  themes.html         Theme browser & image pre-caching
  css/
    style.css          Shared base styles & variables
    host.css           Host page styles
    player.css         Player card & win banner styles
  js/
    prng.js            Seeded PRNG (cyrb53 hash + mulberry32)
    theme.js           Theme registry & placeholder SVG generation
    game.js            Game code generation & URL helpers
    card.js            Random card seed generation & card building
    win.js             Win pattern registry & detection
    host.js            Host page controller
    player.js          Player page controller
    test.js            Automated test suite
  test.html              Browser test runner
  test-node.js           Node.js test runner
  test-node-cases.js     Test cases (shared with Node runner)
  themes/
    default.json       Default theme (SVG placeholders)
    biscuitneopets.json
    candyneopets.json
    greenneopets.json
    woodlandneopets.json
```

## Win Patterns

12 preset patterns are available (Any Line, Four Corners, X, Plus, Diamond, Heart, Frame, Arrow, Postage Stamp, Letter T, Letter L, Blackout).

Hosts can also draw a **Custom** pattern on an interactive 5x5 grid. Custom patterns are encoded as a 25-bit bitmask in base36 and embedded in the URL (e.g. `&pattern=c_abc12`), so players decode them client-side with no server needed.

## Testing

Open `test.html` in the browser (via local server) or run from the command line:

```sh
node test-node.js
```

The test suite covers PRNG determinism, card generation, win detection, custom pattern encode/decode, custom text theme encode/decode, and end-to-end host verification simulation.

## Architecture Walkthrough

### Data Flow

```
Host creates game → encodes theme data into URL params → shares link
Player opens link → decodes theme from URL → generates card from seed → plays
Host verifies    → re-generates card from seed → checks drawn items match
```

Everything is serverless — the URL is the state transfer mechanism.

### Core Scripts (loaded in order)

**`js/prng.js`** — Deterministic randomness. `cyrb53` hashes a string into a number, `mulberry32` turns that into a repeatable PRNG. This is why the same game code + card seed always produces the same card — no server needed.

**`js/theme.js`** — Theme registry and encoding. Three theme types:
1. **Built-in** (e.g. "Biscuit Neopets") — fetches `themes/<id>.json`, each item has `{name, image}`
2. **Custom (Text)** — host types names → `encodeCustomItems()` joins with `|`, base64url-encodes → `citems` URL param → player decodes → SVG placeholder squares
3. **Custom (Images)** — host scrapes a page → `encodeUrlItems(items, prefix)` strips the common URL prefix and encodes `name\tsuffix` pairs → `uitems` + `uprefix` URL params → player decodes, reconstructs full URLs

`loadTheme()` is the single entry point — it branches on `themeId` to decide which decoding path to use.

**`js/game.js`** — URL builders. `buildPlayUrl()` / `buildHostUrl()` assemble the share links with all the right params (`game`, `theme`, `pattern`, `citems`, `uitems`, `uprefix`). `getParam()` reads them back.

**`js/card.js`** — Card generation. `generateCard(items, gameCode, cardSeed)` seeds the PRNG with `gameCode + ":" + cardSeed`, then shuffles items deterministically to pick 24 for the grid. Index 12 is always FREE. This determinism is what makes verification work — the host can recreate any player's card from just their 4-char seed.

**`js/win.js`** — Win patterns. `WIN_PATTERNS` defines built-in patterns (lines, diagonals, corners, etc.) as arrays of cell index sets. Custom patterns use `c_<base36>` encoding of a 25-bit bitmask. `checkWin(marked, patternId)` tests if the marked cells satisfy any set in the pattern.

### Page Controllers

**`js/host.js`** — Host flow:
```
populateThemeSelect() → user picks theme/pattern → createGame()
  ↓
loadTheme() → shuffle pool → saveHostState() → showGamePanel()
  ↓
drawNext() pops from pool → showDrawnItem() → renderHistory()
  ↓
verifyBingo() → regenerates card from seed → checks drawn names → pass/fail
```

Key state: `hostState` tracks `gameCode`, `theme`, `drawn[]`, `pool[]`, and custom data (`customItems`, `urlItems`, `urlPrefix`). Persisted to `sessionStorage` so refreshing doesn't lose the game.

For URL scrape specifically: `fetchUrlScrape()` tries `fetch(url)`, falls back to paste-HTML on CORS failure. `parseImagesFromHtml()` uses `DOMParser` to extract `<img>` tags filtered by prefix. `ensureUniqueNames()` appends suffixes to duplicates (critical — `verifyBingo` matches by name). `commonUrlPrefix()` computes the shared URL prefix so only suffixes get base64-encoded.

**`js/player.js`** — Player flow:
```
enterGame() → loadTheme() → generateCard() → renderCard()
  ↓
toggleCell() → update marked set → savePlayerData() → checkForWin()
```

Card seed is generated once per player name and persisted to `localStorage`, so refreshing keeps the same card. The player never re-fetches the source page — all image URLs are decoded from the share link.

### Why Verification Works Without a Server

1. Host creates game with code `ABC123`, draws items in order
2. Player gets card seed `XY7Z`, card is deterministically generated from `ABC123:XY7Z`
3. Player claims bingo, tells host their seed `XY7Z`
4. Host enters `XY7Z` → `generateCard()` recreates the exact same card → checks which cells match drawn items → confirms or denies

## Tech Stack

- Vanilla HTML/CSS/JavaScript, no frameworks or build step
- CSS custom properties for theming (dark theme by default)
- `sessionStorage` for host state, `localStorage` for player card seeds & marks
- Seeded PRNG for deterministic card generation from card seeds
- Neopets theme images hosted on Imgur (HTTPS)
