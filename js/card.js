// Deterministic card generation
// Requires: prng.js (cyrb53, seededRng), game.js (CODE_CHARS)

function generateCardSeed() {
  var seed = "";
  for (var i = 0; i < 4; i++) {
    seed += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return seed;
}

function generateCard(themeItems, gameCode, cardSeed) {
  const key = gameCode + ":" + cardSeed;
  const rng = seededRng(key);

  // Fisher-Yates shuffle of theme items using seeded PRNG
  const pool = themeItems.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Take first 24 items for the card (center is FREE)
  const picked = pool.slice(0, 24);

  // Build 25-cell array with FREE at index 12
  const cells = [];
  let pi = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      cells.push({ name: "FREE", image: null, free: true });
    } else {
      cells.push({ name: picked[pi].name, image: picked[pi].image, free: false });
      pi++;
    }
  }

  return cells;
}
