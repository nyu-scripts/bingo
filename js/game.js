// Game code generation and URL helpers

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/1/O/0

function generateGameCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function buildPlayUrl(gameCode, theme, pattern) {
  const base = window.location.href.replace(/[^/]*$/, "play.html");
  const params = new URLSearchParams({ game: gameCode, theme });
  if (pattern) params.set("pattern", pattern);
  return `${base}?${params}`;
}

function buildHostUrl(gameCode, theme, pattern) {
  const base = window.location.href.replace(/[^/]*$/, "host.html");
  const params = new URLSearchParams({ game: gameCode, theme });
  if (pattern) params.set("pattern", pattern);
  return `${base}?${params}`;
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = orig), 1500);
    }
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = orig), 1500);
    }
  }
}
