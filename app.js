// Abi Vegas Web-App
// Google Apps Script Web-App-URL für zentrale Punkte im Google Sheet.
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwX03awlXSE0UpGNAPfqugNwVJLqO_kv6ETfIaHREPLwBcwylxGbcjv3xWIjL1RWWGmHw/exec";

// Gespeichert wird im Google Sheet als: 5, 6, 7, ..., 12, Lehrer
// Angezeigt wird schöner als: 5. Klasse, 6. Klasse, ..., Lehrer
const CLASSES = ["5", "6", "7", "8", "9", "10", "11", "12", "Lehrer"];

const SYMBOLS = ["🎰", "🎲", "🃏", "💎", "🍒", "7️⃣"];
const COOLDOWN_MS = 30_000;

const classSelect = document.querySelector("#classSelect");
const spinButton = document.querySelector("#spinButton");
const refreshButton = document.querySelector("#refreshButton");
const leaderboard = document.querySelector("#leaderboard");
const resultText = document.querySelector("#resultText");
const cooldownText = document.querySelector("#cooldownText");
const reels = [
  document.querySelector("#reel1"),
  document.querySelector("#reel2"),
  document.querySelector("#reel3")
];

const state = {
  scores: Object.fromEntries(CLASSES.map((klasse) => [klasse, 0])),
  lastSpin: Number(localStorage.getItem("abiVegasLastSpin") || 0)
};

function formatClassName(klasse) {
  if (klasse === "Lehrer") return "Lehrer";
  return `${klasse}. Klasse`;
}

function init() {
  classSelect.innerHTML = CLASSES
    .map((klasse) => `<option value="${klasse}">${formatClassName(klasse)}</option>`)
    .join("");

  const savedClass = localStorage.getItem("abiVegasClass");
  classSelect.value = CLASSES.includes(savedClass) ? savedClass : CLASSES[0];
  localStorage.setItem("abiVegasClass", classSelect.value);

  classSelect.addEventListener("change", () => {
    localStorage.setItem("abiVegasClass", classSelect.value);
  });

  spinButton.addEventListener("click", spin);
  refreshButton.addEventListener("click", loadScores);

  updateCooldown();
  renderLeaderboard();
  loadScores();
  setInterval(updateCooldown, 1000);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function calculatePoints(result) {
  const [a, b, c] = result;

  if (a === b && b === c) return 50;
  if (a === b || b === c || a === c) return 20;
  if (result.includes("💎")) return 10;
  if (result.includes("7️⃣")) return 15;
  return 5;
}

async function spin() {
  const now = Date.now();
  const remaining = COOLDOWN_MS - (now - state.lastSpin);
  if (remaining > 0) {
    resultText.textContent = `Noch ${Math.ceil(remaining / 1000)} Sekunden bis zum nächsten Dreh.`;
    return;
  }

  const klasse = classSelect.value;
  const result = [randomItem(SYMBOLS), randomItem(SYMBOLS), randomItem(SYMBOLS)];
  const points = calculatePoints(result);

  reels.forEach((reel, index) => {
    reel.textContent = result[index];
  });

  state.lastSpin = now;
  localStorage.setItem("abiVegasLastSpin", String(now));
  localStorage.setItem("abiVegasClass", klasse);

  resultText.textContent = `${formatClassName(klasse)} gewinnt ${points} Chips!`;
  updateLocalScore(klasse, points);
  updateCooldown();

  try {
    await addPoints(klasse, points, "slot");
    await loadScores();
  } catch (error) {
    console.warn(error);
    resultText.textContent += " Die Punkte sind aktuell nur lokal gespeichert, weil das Backend nicht erreichbar ist.";
  }
}

function updateLocalScore(klasse, points) {
  state.scores[klasse] = (state.scores[klasse] || 0) + points;
  renderLeaderboard();
}

function updateCooldown() {
  const remaining = COOLDOWN_MS - (Date.now() - state.lastSpin);
  if (remaining > 0) {
    spinButton.disabled = true;
    cooldownText.textContent = `Nächster Dreh in ${Math.ceil(remaining / 1000)} Sekunden.`;
  } else {
    spinButton.disabled = false;
    cooldownText.textContent = "";
  }
}

function renderLeaderboard() {
  const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
  leaderboard.innerHTML = sorted
    .map(([klasse, chips], index) => `
      <li>
        <span class="rank-name">#${index + 1} ${formatClassName(klasse)}</span>
        <span class="chips">${chips} Chips</span>
      </li>
    `)
    .join("");
}

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!BACKEND_URL) {
      reject(new Error("Backend URL fehlt."));
      return;
    }

    const callbackName = `abiVegasCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const url = new URL(BACKEND_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Backend antwortet nicht."));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Backend konnte nicht geladen werden."));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function addPoints(klasse, points, game) {
  return jsonp("add", {
    klasse,
    points,
    game,
    code: localStorage.getItem("abiVegasPlayerCode") || createPlayerCode()
  });
}

async function loadScores() {
  if (!BACKEND_URL) {
    renderLeaderboard();
    return;
  }

  const data = await jsonp("scores");
  if (data.ok && data.scores) {
    state.scores = Object.fromEntries(CLASSES.map((klasse) => [klasse, 0]));
    for (const item of data.scores) {
      const klasse = String(item.klasse);
      if (CLASSES.includes(klasse)) {
        state.scores[klasse] = Number(item.chips || 0);
      }
    }
    renderLeaderboard();
  }
}

function createPlayerCode() {
  const code = `player-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("abiVegasPlayerCode", code);
  return code;
}

init();
