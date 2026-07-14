const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwX03awlXSE0UpGNAPfqugNwVJLqO_kv6ETfIaHREPLwBcwylxGbcjv3xWIjL1RWWGmHw/exec";
const CLASSES = ["5", "6", "7", "8", "9", "10", "11", "12", "Lehrer"];
const SYMBOLS = ["🎰", "🎲", "🃏", "💎", "🍒", "7️⃣"];
const COOLDOWN_MS = 30_000;

const classSelect = document.querySelector("#classSelect");
const spinButton = document.querySelector("#spinButton");
const refreshButton = document.querySelector("#refreshButton");
const leaderboard = document.querySelector("#leaderboard");
const resultText = document.querySelector("#resultText");
const cooldownText = document.querySelector("#cooldownText");
const chipBurst = document.querySelector("#chipBurst");
const reels = [document.querySelector("#reel1"), document.querySelector("#reel2"), document.querySelector("#reel3")];

const state = {
  scores: Object.fromEntries(CLASSES.map((klasse) => [klasse, 0])),
  lastSpin: Number(localStorage.getItem("abiVegasLastSpin") || 0),
  isSpinning: false
};

function formatClassName(klasse) {
  return klasse === "Lehrer" ? "Lehrer" : `${klasse}. Klasse`;
}

function init() {
  classSelect.innerHTML = CLASSES.map((klasse) => `<option value="${klasse}">${formatClassName(klasse)}</option>`).join("");
  const savedClass = localStorage.getItem("abiVegasClass");
  classSelect.value = CLASSES.includes(savedClass) ? savedClass : CLASSES[0];
  localStorage.setItem("abiVegasClass", classSelect.value);
  classSelect.addEventListener("change", () => {
    localStorage.setItem("abiVegasClass", classSelect.value);
    renderLeaderboard();
  });
  spinButton.addEventListener("click", spin);
  refreshButton.addEventListener("click", () => loadScores().catch(showOfflineStatus));
  updateCooldown();
  renderLeaderboard();
  loadScores().catch(showOfflineStatus);
  setInterval(updateCooldown, 1000);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculatePoints(result) {
  const [a, b, c] = result;
  if (a === b && b === c) return 30;
  if (a === b || b === c || a === c) return 12;
  if (result.includes("7️⃣")) return 10;
  if (result.includes("💎")) return 8;
  return 3;
}

async function spin() {
  if (state.isSpinning) return;
  const now = Date.now();
  const remaining = COOLDOWN_MS - (now - state.lastSpin);
  if (remaining > 0) {
    resultText.textContent = `Noch ${Math.ceil(remaining / 1000)} Sekunden bis zum nächsten Dreh.`;
    showResultPop();
    return;
  }

  const klasse = classSelect.value;
  const result = [randomItem(SYMBOLS), randomItem(SYMBOLS), randomItem(SYMBOLS)];
  const points = calculatePoints(result);

  state.isSpinning = true;
  state.lastSpin = now;
  localStorage.setItem("abiVegasLastSpin", String(now));
  localStorage.setItem("abiVegasClass", klasse);
  updateCooldown();

  resultText.textContent = "Die Walzen drehen ...";
  showResultPop();
  await animateReels(result);

  resultText.textContent = `${formatClassName(klasse)} gewinnt ${points} Chips!`;
  showResultPop();
  createChipBurst(points);
  updateLocalScore(klasse, points);

  try {
    await addPoints(klasse, points, "slot");
    await loadScores();
  } catch (error) {
    console.warn(error);
    resultText.textContent += " Die Punkte sind vorerst nur auf diesem Gerät gespeichert.";
  } finally {
    state.isSpinning = false;
    updateCooldown();
  }
}

async function animateReels(finalResult) {
  reels.forEach((reel) => reel.classList.add("is-spinning"));
  for (let round = 0; round < 14; round++) {
    reels.forEach((reel) => (reel.textContent = randomItem(SYMBOLS)));
    await sleep(65 + round * 8);
  }
  for (let index = 0; index < reels.length; index++) {
    reels[index].textContent = finalResult[index];
    reels[index].classList.remove("is-spinning");
    await sleep(120);
  }
}

function showResultPop() {
  resultText.classList.remove("result-pop");
  void resultText.offsetWidth;
  resultText.classList.add("result-pop");
}

function createChipBurst(points) {
  if (!chipBurst) return;
  const count = Math.min(14, Math.max(5, Math.round(points / 5)));
  chipBurst.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const chip = document.createElement("span");
    chip.className = "chip-particle";
    chip.textContent = "$";
    const angle = (Math.PI * 2 * i) / count;
    const distance = 70 + Math.random() * 90;
    chip.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    chip.style.setProperty("--y", `${Math.sin(angle) * distance - 25}px`);
    chip.style.animationDelay = `${Math.random() * 90}ms`;
    chipBurst.appendChild(chip);
  }
  setTimeout(() => (chipBurst.innerHTML = ""), 1200);
}

function updateLocalScore(klasse, points) {
  state.scores[klasse] = (state.scores[klasse] || 0) + points;
  renderLeaderboard();
}

function updateCooldown() {
  const remaining = COOLDOWN_MS - (Date.now() - state.lastSpin);
  if (state.isSpinning) {
    spinButton.disabled = true;
    cooldownText.textContent = "Slot läuft ...";
  } else if (remaining > 0) {
    spinButton.disabled = true;
    cooldownText.textContent = `Nächster Dreh in ${Math.ceil(remaining / 1000)} Sekunden.`;
  } else {
    spinButton.disabled = false;
    cooldownText.textContent = "";
  }
}

function visibleRanking() {
  const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
  const visible = sorted.slice(0, 5);
  const selected = classSelect.value;
  if (selected && !visible.some(([klasse]) => klasse === selected)) {
    const selectedEntry = sorted.find(([klasse]) => klasse === selected);
    if (selectedEntry) visible[visible.length - 1] = selectedEntry;
  }
  return visible;
}

function renderLeaderboard() {
  leaderboard.innerHTML = visibleRanking().map(([klasse, chips], index) =>
    `<li><span class="rank-name">#${index + 1} ${formatClassName(klasse)}</span><span class="chips">${chips} Chips</span></li>`
  ).join("");
}

function showOfflineStatus() {
  console.warn("Live-Rangliste ist derzeit nicht erreichbar.");
}

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `abiVegasCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const url = new URL(BACKEND_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
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

function addPoints(klasse, points, game) {
  return AbiVegasTeam.addPoints(points, game);
}

async function loadScores() {
  const data = await jsonp("scores");
  if (data.ok && data.scores) {
    state.scores = Object.fromEntries(CLASSES.map((klasse) => [klasse, 0]));
    for (const item of data.scores) {
      const klasse = String(item.klasse);
      if (CLASSES.includes(klasse)) state.scores[klasse] = Number(item.chips || 0);
    }
    renderLeaderboard();
  }
}


init();
