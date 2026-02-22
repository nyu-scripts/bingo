# Picture Bingo

A serverless, browser-based bingo game that uses pictures instead of numbers. Designed for online events. The host draws pictures and players mark their cards in real time. No backend required; all game state is encoded in URLs and handled client-side.

## How It Works

1. **Host** creates a game at `host.html`, picks a theme and win pattern, then shares the generated link
2. **Players** open the link, enter their name, and get a unique bingo card (deterministically generated via seeded PRNG)
3. Host draws items one at a time; players mark matching cells on their cards
4. When a player's marked cells match the win pattern, they get a BINGO

All card generation is deterministic — the same game code + player name always produces the same card, so no server synchronization is needed.

## Running Locally

Serve the project with any static file server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/host.html` to host or `http://localhost:8000/play.html?game=CODE&theme=placeholder` to play.

## Project Structure

```
bingo/
  index.html          Landing page (host or join)
  host.html           Host game creation & draw interface
  play.html           Player bingo card
  css/
    style.css          Shared base styles & variables
    host.css           Host page styles
    player.css         Player card & win banner styles
  js/
    prng.js            Seeded PRNG (cyrb53 hash + mulberry32)
    theme.js           Theme registry & placeholder SVG generation
    game.js            Game code generation & URL helpers
    card.js            Deterministic card generation
    win.js             Win pattern registry & detection
    host.js            Host page controller
    player.js          Player page controller
  themes/
    placeholder.json   Default "Party Mix" theme data
```

## Win Patterns

12 preset patterns are available (Any Line, Four Corners, X, Plus, Diamond, Heart, Frame, Arrow, Postage Stamp, Letter T, Letter L, Blackout).

Hosts can also draw a **Custom** pattern on an interactive 5x5 grid. Custom patterns are encoded as a 25-bit bitmask in base36 and embedded in the URL (e.g. `&pattern=c_abc12`), so players decode them client-side with no server needed.

## Tech Stack

- Vanilla HTML/CSS/JavaScript, no frameworks or build step
- CSS custom properties for theming (dark theme by default)
- `sessionStorage` for host state, `localStorage` for player marks
- Seeded PRNG for deterministic card shuffling
