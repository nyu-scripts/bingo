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

## Tech Stack

- Vanilla HTML/CSS/JavaScript, no frameworks or build step
- CSS custom properties for theming (dark theme by default)
- `sessionStorage` for host state, `localStorage` for player card seeds & marks
- Seeded PRNG for deterministic card generation from card seeds
- Neopets theme images hosted on Imgur (HTTPS)
