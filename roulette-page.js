const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwX03awlXSE0UpGNAPfqugNwVJLqO_kv6ETfIaHREPLwBcwylxGbcjv3xWIjL1RWWGmHw/exec";
const CLASSES = ["5", "6", "7", "8", "9", "10", "11", "12", "Lehrer"];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const WHEEL_ORDER = ["0", "32", "15", "19", "4", "21", "2", "25", "17", "34", "6", "27", "13", "36", "11", "30", "8", "23", "10", "5", "24", "16", "33", "1", "20", "14", "31", "9", "22", "18", "29", "7", "28", "12", "35", "3", "26"];
const TABLE_ROWS = [[3,6,9,12,15,18,21,24,27,30,33,36],[2,5,8,11,14,17,20,23,26,29,32,35],[1,4,7,10,13,16,19,22,25,28,31,34]];
const SUBJECTS = ["Mathe","Deutsch","Englisch","Bio","Mathe","Erdkunde","Jackpot","Sport","Geschichte","Deutsch","Englisch","Mathe","Kunst/Musik","Bio","Schule","Abi Vegas","Geschichte","Sport","Englisch","Deutsch","Erdkunde","Mathe","Schule","Abi Vegas"];
const MAX_WIN_PER_SPIN = 200;
const WHEEL_STEP = 360 / WHEEL_ORDER.length;
const BET_RULES = {
  number: { maxStake: 20, label: "Einzelzahl", note: "0-36, maximal 20 Chips" },
  color: { maxStake: 50, label: "Farbe", note: "Rot/Schwarz, maximal 50 Chips" },
  parity: { maxStake: 50, label: "Gerade/Ungerade", note: "EVEN/ODD, maximal 50 Chips" },
  range: { maxStake: 50, label: "Bereich", note: "1-18 oder 19-36, maximal 50 Chips" },
  dozen: { maxStake: 30, label: "Dutzend", note: "1st/2nd/3rd 12, maximal 30 Chips" },
  column: { maxStake: 30, label: "Reihe", note: "2:1 Reihe, maximal 30 Chips" }
};
const QUESTIONS = {
  easy: [
    q("Wie viele Minuten hat eine Stunde?", ["30", "45", "60", "90"], 2),
    q("Was ist 7 x 8?", ["54", "56", "64", "49"], 1),
    q("Was heisst Schule auf Englisch?", ["school", "street", "shop", "sport"], 0),
    q("Welche Farbe entsteht aus Blau und Gelb?", ["Rot", "Gruen", "Lila", "Orange"], 1),
    q("Welches Organ pumpt Blut?", ["Lunge", "Herz", "Magen", "Leber"], 1)
  ],
  medium: [
    q("Wie viele Bundeslaender hat Deutschland?", ["12", "14", "16", "18"], 2),
    q("Was ist 15 Prozent von 200?", ["20", "25", "30", "35"], 2),
    q("Welche Wortart beschreibt Eigenschaften?", ["Nomen", "Verb", "Adjektiv", "Artikel"], 2),
    q("Welcher Fluss fliesst durch Koeln?", ["Elbe", "Rhein", "Donau", "Spree"], 1),
    q("Bei welchem Spiel will man nah an 21 kommen?", ["Roulette", "Blackjack", "Memory", "Schach"], 1)
  ],
  hard: [
    q("Was ist 12 x 12?", ["124", "132", "144", "156"], 2),
    q("In welchem Jahr fiel die Berliner Mauer?", ["1961", "1989", "1999", "1945"], 1),
    q("Was bedeutet 'however'?", ["deshalb", "jedoch", "ausserdem", "niemals"], 1),
    q("Was zeigt eine Temperaturkurve im Klimadiagramm?", ["Temperatur", "Einwohnerzahl", "Hoehe", "Uhrzeit"], 0),
    q("Was ist beim Abi-Streich wichtiger als Gewinnen?", ["Fairness", "Lautstaerke", "Stress", "Chaos"], 0)
  ],
  teacher: [
    q("Was macht ein gutes Schulspiel aus?", ["kurz, fair und verstaendlich", "kompliziert und lang", "unfair", "nur fuer Profis"], 0),
    q("Welche Regel passt zu Abi Vegas?", ["Chips statt Geld", "echtes Geld", "Namen sammeln", "Minuspunkte"], 0),
    q("Was zaehlt in der App?", ["Klassenpunkte", "Einzelnamen", "Noten", "Fehltage"], 0),
    q("Was ist die schulische Version von Casino-Glueck?", ["Teamwork und Wissen", "echtes Geld", "Zufallsnoten", "Nachsitzen"], 0)
  ]
};

const state = {
  stake: 20,
  bet: { type: "color", value: "red", label: "Rot", multiplier: 2 },
  rotation: 0,
  ballRotation: 0,
  pending: null,
  spinning: false,
  scores: Object.fromEntries(CLASSES.map(k => [k, 0]))
};

const classSelect = document.querySelector("#classSelect");
const svg = document.querySelector("#rouletteSvg");
const table = document.querySelector("#rouletteTable");
const resultText = document.querySelector("#rouletteResult");
const questionPanel = document.querySelector("#questionPanel");
const betStatus = document.querySelector("#betStatus");
const leaderboard = document.querySelector("#leaderboard");
const spinButton = document.querySelector("#spinButton");

function q(text, choices, correctIndex) { return { text, choices, correctIndex }; }
function formatClassName(k) { return k === "Lehrer" ? "Lehrer" : `${k}. Klasse`; }
function ns(name) { return document.createElementNS("http://www.w3.org/2000/svg", name); }
function normalizeAngle(angle) { return ((angle % 360) + 360) % 360; }

function init() {
  AbiVegasDevice.initClassSelect(classSelect, CLASSES, formatClassName);
  document.querySelectorAll("[data-stake]").forEach(btn => btn.addEventListener("click", () => selectStake(btn)));
  spinButton.addEventListener("click", spin);
  document.querySelector("#refreshButton").addEventListener("click", loadScores);
  buildWheel();
  buildTable();
  updateStakeButtons();
  renderBetStatus();
  resetQuestionPanel();
  AbiVegasDevice.onReady(() => updateStakeButtons());
  AbiVegasDevice.onWalletChange(() => updateStakeButtons());
  loadScores();
}

function buildWheel() {
  svg.innerHTML = "";
  const group = ns("g");
  group.id = "wheelGroup";
  group.style.transformOrigin = "260px 260px";
  svg.appendChild(group);

  const bg = ns("circle");
  bg.setAttribute("cx", 260); bg.setAttribute("cy", 260); bg.setAttribute("r", 238); bg.setAttribute("fill", "#f8f6f0"); bg.setAttribute("stroke", "#2f9fd8"); bg.setAttribute("stroke-width", "4");
  group.appendChild(bg);

  for (let i = 0; i < WHEEL_ORDER.length; i++) {
    const angle = WHEEL_STEP * i;
    const line = ns("line");
    line.setAttribute("x1", 260); line.setAttribute("y1", 260); line.setAttribute("x2", 260 + 220 * Math.sin(angle * Math.PI / 180)); line.setAttribute("y2", 260 - 220 * Math.cos(angle * Math.PI / 180)); line.setAttribute("stroke", "#2f9fd8"); line.setAttribute("stroke-width", "2");
    group.appendChild(line);
  }

  const inner = ns("circle");
  inner.setAttribute("cx", 260); inner.setAttribute("cy", 260); inner.setAttribute("r", 146); inner.setAttribute("fill", "#f8f6f0"); inner.setAttribute("stroke", "#2f9fd8"); inner.setAttribute("stroke-width", "2");
  group.appendChild(inner);

  for (let i = 0; i < WHEEL_ORDER.length; i++) {
    const n = WHEEL_ORDER[i];
    const angle = WHEEL_STEP * i;
    const x = 260 + 210 * Math.sin(angle * Math.PI / 180);
    const y = 260 - 210 * Math.cos(angle * Math.PI / 180);
    const numberGroup = ns("g");
    numberGroup.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
    const rect = ns("rect");
    rect.setAttribute("x", -15); rect.setAttribute("y", -18); rect.setAttribute("width", 30); rect.setAttribute("height", 36); rect.setAttribute("rx", 3);
    rect.setAttribute("fill", n === "0" ? "#5aa85c" : RED_NUMBERS.has(Number(n)) ? "#c9283d" : "#11151b");
    const text = ns("text");
    text.setAttribute("x", 0); text.setAttribute("y", 5); text.setAttribute("text-anchor", "middle"); text.setAttribute("fill", "#fff7dc"); text.setAttribute("font-size", "15"); text.setAttribute("font-weight", "900");
    text.textContent = n;
    numberGroup.appendChild(rect); numberGroup.appendChild(text); group.appendChild(numberGroup);
  }

  const center = ns("circle");
  center.setAttribute("cx", 260); center.setAttribute("cy", 260); center.setAttribute("r", 34); center.setAttribute("fill", "#2f9fd8");
  group.appendChild(center);
  const label = ns("text");
  label.setAttribute("x", 260); label.setAttribute("y", 266); label.setAttribute("text-anchor", "middle"); label.setAttribute("fill", "#fff7dc"); label.setAttribute("font-size", "18"); label.setAttribute("font-weight", "900"); label.textContent = "ABV";
  group.appendChild(label);

  const ballGroup = ns("g");
  ballGroup.id = "ballGroup";
  ballGroup.style.transformOrigin = "260px 260px";
  ballGroup.style.transition = "transform 2.4s cubic-bezier(.12,.84,.18,1)";
  const ballTrack = ns("circle");
  ballTrack.setAttribute("cx", 260); ballTrack.setAttribute("cy", 260); ballTrack.setAttribute("r", 186); ballTrack.setAttribute("fill", "none"); ballTrack.setAttribute("stroke", "rgba(30,30,30,.18)"); ballTrack.setAttribute("stroke-width", "4");
  const ball = ns("circle");
  ball.setAttribute("cx", 260); ball.setAttribute("cy", 74); ball.setAttribute("r", 9); ball.setAttribute("fill", "#fff"); ball.setAttribute("stroke", "#d9cfa8"); ball.setAttribute("stroke-width", "2");
  ball.setAttribute("filter", "drop-shadow(0 0 6px rgba(255,255,255,.85))");
  ballGroup.appendChild(ballTrack);
  ballGroup.appendChild(ball);
  svg.appendChild(ballGroup);
}

function buildTable() {
  table.innerHTML = `<div class="zero-column zero-single">${cell("0", "number", "0", "0", 10, "zero-cell")}</div><div class="main-table">${TABLE_ROWS.map((row, rowIndex) => `<div class="number-row">${row.map(numberCell).join("")}${cell("2:1", "column", rowIndex, `2:1 Reihe ${rowIndex + 1}`, 3, "")}</div>`).join("")}<div class="dozen-row">${cell("1st 12", "dozen", 1, "1st 12", 3, "")}${cell("2nd 12", "dozen", 2, "2nd 12", 3, "")}${cell("3rd 12", "dozen", 3, "3rd 12", 3, "")}</div><div class="outside-row">${cell("1-18", "range", "low", "1 bis 18", 2, "")}${cell("EVEN", "parity", "even", "EVEN", 2, "")}${cell("◆", "color", "red", "Rot", 2, "red-diamond selected")}${cell("◆", "color", "black", "Schwarz", 2, "black-diamond")}${cell("ODD", "parity", "odd", "ODD", 2, "")}${cell("19-36", "range", "high", "19 bis 36", 2, "")}</div></div>`;
  table.querySelectorAll(".bet-cell").forEach(btn => btn.addEventListener("click", () => selectBet(btn)));
}

function cell(text, type, value, label, multiplier, extra) {
  const rule = BET_RULES[type];
  const maxStake = rule ? rule.maxStake : 50;
  return `<button class="bet-cell ${extra}" data-type="${type}" data-value="${value}" data-label="${label}" data-multiplier="${multiplier}" data-max-stake="${maxStake}">${text}</button>`;
}
function numberCell(n) { return cell(n, "number", n, n, 8, RED_NUMBERS.has(n) ? "num-red" : "num-black"); }

function selectStake(btn) {
  const requestedStake = Number(btn.dataset.stake);
  const maxStake = getMaxStakeForCurrentBet();
  if (requestedStake > maxStake) {
    resultText.textContent = `Fuer ${state.bet.label} sind maximal ${maxStake} Chips Einsatz erlaubt.`;
    setStake(maxStake);
    return;
  }
  setStake(requestedStake);
}

function setStake(value) {
  state.stake = value;
  document.querySelectorAll("[data-stake]").forEach(b => b.classList.toggle("active", Number(b.dataset.stake) === value));
  updateStakeButtons();
  renderBetStatus();
}

function selectBet(btn) {
  table.querySelectorAll(".bet-cell").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  state.bet = { type: btn.dataset.type, value: btn.dataset.value, label: btn.dataset.label, multiplier: Number(btn.dataset.multiplier) };
  enforceStakeLimit();
  renderBetStatus();
}

function getMaxStakeForCurrentBet() {
  return BET_RULES[state.bet.type]?.maxStake || 50;
}

function enforceStakeLimit() {
  const maxStake = getMaxStakeForCurrentBet();
  if (state.stake > maxStake) state.stake = maxStake;
  updateStakeButtons();
}

function updateStakeButtons() {
  const maxStake = getMaxStakeForCurrentBet();
  const available = AbiVegasDevice.tokens();
  document.querySelectorAll("[data-stake]").forEach(btn => {
    const value = Number(btn.dataset.stake);
    btn.disabled = value > maxStake || value > available || state.spinning || !AbiVegasDevice.isRegistered();
    btn.title = value > maxStake ? `Maximal ${maxStake} Chips fuer diese Wettart` : value > available ? "Nicht genug Spiel-Tokens" : "";
    btn.classList.toggle("active", value === state.stake);
  });
  spinButton.disabled = state.spinning || !AbiVegasDevice.canAfford(state.stake);
}

function renderBetStatus() {
  const rule = BET_RULES[state.bet.type];
  const theoretical = state.stake * state.bet.multiplier;
  const capped = Math.min(theoretical, MAX_WIN_PER_SPIN);
  const capText = theoretical > MAX_WIN_PER_SPIN ? `, gedeckelt auf ${MAX_WIN_PER_SPIN}` : "";
  betStatus.textContent = `Aktueller Einsatz: ${state.stake} Chips auf ${state.bet.label}. ${rule?.note || ""}. Gewinnchance: x${state.bet.multiplier} = ${capped} Chips${capText}.`;
}

function resetQuestionPanel() {
  state.pending = null;
  questionPanel.classList.add("empty");
  questionPanel.innerHTML = "<p>Nach einem Treffer erscheint hier die Frage.</p>";
}

function targetRotationForValue(value) {
  const index = WHEEL_ORDER.indexOf(String(value));
  if (index === -1) return normalizeAngle(state.rotation);
  return normalizeAngle(-index * WHEEL_STEP);
}

function spinToTarget(currentRotation, targetAngle, fullTurns) {
  const currentAngle = normalizeAngle(currentRotation);
  const delta = normalizeAngle(targetAngle - currentAngle);
  return currentRotation + fullTurns * 360 + delta;
}

async function spin() {
  if (state.pending) { resultText.textContent = "Beantworte erst die aktuelle Frage."; return; }
  if (state.spinning) return;

  resetQuestionPanel();
  enforceStakeLimit();
  const payment = AbiVegasDevice.spend(state.stake);
  if (!payment.ok) {
    resultText.textContent = payment.reason === "register" ? "Lege zuerst deine Klasse fest." : "Nicht genug Spiel-Tokens fuer diesen Einsatz.";
    updateStakeButtons();
    return;
  }
  const outcome = randomOutcome();
  const wheelTarget = targetRotationForValue(outcome.value);
  state.rotation = spinToTarget(state.rotation, wheelTarget, 4);
  state.ballRotation = spinToTarget(state.ballRotation, 0, 5);

  const group = document.querySelector("#wheelGroup");
  const ballGroup = document.querySelector("#ballGroup");
  state.spinning = true;
  updateStakeButtons();
  group.style.transform = `rotate(${state.rotation}deg)`;
  if (ballGroup) ballGroup.style.transform = `rotate(${state.ballRotation}deg)`;
  resultText.textContent = `Das Rad dreht ... Noch ${payment.tokens} Spiel-Tokens.`;
  await sleep(2400);
  state.spinning = false;
  updateStakeButtons();

  const hit = matches(state.bet, outcome);
  const outcomeText = outcome.isZero ? String(outcome.value) : `${outcome.value} / ${outcome.color === "red" ? "Rot" : "Schwarz"}`;
  if (!hit) { resultText.textContent = `Gelandet auf ${outcomeText}. Kein Treffer. Bei 0 gewinnen nur direkte 0-Wetten.`; return; }
  const theoreticalPoints = state.stake * state.bet.multiplier;
  const points = Math.min(theoreticalPoints, MAX_WIN_PER_SPIN);
  const question = randomQuestion();
  state.pending = { question, points };
  const capText = theoreticalPoints > MAX_WIN_PER_SPIN ? ` Der Gewinn ist auf ${MAX_WIN_PER_SPIN} Chips gedeckelt.` : "";
  resultText.textContent = `Treffer auf ${outcomeText}. Frage richtig = ${points} Chips.${capText}`;
  showQuestion(question, points);
}

function randomOutcome() {
  const value = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
  const number = Number(value);
  const isZero = value === "0";
  return { value, number, isZero, color: isZero ? "green" : RED_NUMBERS.has(number) ? "red" : "black", subject: isZero ? "Jackpot" : SUBJECTS[(number - 1) % SUBJECTS.length] };
}

function matches(bet, outcome) {
  if (bet.type === "number") return String(outcome.value) === String(bet.value);
  if (outcome.isZero) return false;
  if (bet.type === "color") return outcome.color === bet.value;
  if (bet.type === "parity") return bet.value === "even" ? outcome.number % 2 === 0 : outcome.number % 2 === 1;
  if (bet.type === "range") return bet.value === "low" ? outcome.number <= 18 : outcome.number >= 19;
  if (bet.type === "dozen") return Math.ceil(outcome.number / 12) === Number(bet.value);
  if (bet.type === "column") return TABLE_ROWS[Number(bet.value)].includes(outcome.number);
  return false;
}

function randomQuestion() {
  const k = classSelect.value;
  const level = k === "Lehrer" ? "teacher" : Number(k) <= 6 ? "easy" : Number(k) <= 9 ? "medium" : "hard";
  return QUESTIONS[level][Math.floor(Math.random() * QUESTIONS[level].length)];
}

function showQuestion(question, points) {
  questionPanel.classList.remove("empty");
  questionPanel.innerHTML = `<div class="question-card"><p class="bet-status">Gewinnchance: ${points} Chips</p><h2>${question.text}</h2><div class="answer-grid">${question.choices.map((c, i) => `<button data-answer="${i}">${c}</button>`).join("")}</div></div>`;
  questionPanel.querySelectorAll("[data-answer]").forEach(btn => btn.addEventListener("click", () => answer(Number(btn.dataset.answer))));
}

async function answer(i) {
  if (!state.pending) return;
  const { question, points } = state.pending;
  const correct = i === question.correctIndex;
  questionPanel.querySelectorAll("button").forEach(btn => { const idx = Number(btn.dataset.answer); btn.disabled = true; if (idx === question.correctIndex) btn.classList.add("correct"); if (idx === i && !correct) btn.classList.add("wrong"); });
  state.pending = null;
  if (!correct) { resultText.textContent = `Leider falsch. Richtig waere: ${question.choices[question.correctIndex]}.`; return; }
  const klasse = classSelect.value;
  resultText.textContent = `${formatClassName(klasse)} gewinnt ${points} Chips!`;
  state.scores[klasse] = (state.scores[klasse] || 0) + points;
  renderLeaderboard();
  try { await addPoints(klasse, points, "roulette"); await loadScores(); } catch (error) { console.warn(error); }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `abiVegasCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const url = new URL(BACKEND_URL);
    url.searchParams.set("action", action); url.searchParams.set("callback", callbackName);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const script = document.createElement("script");
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Backend antwortet nicht.")); }, 10000);
    function cleanup() { clearTimeout(timeout); delete window[callbackName]; script.remove(); }
    window[callbackName] = data => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error("Backend konnte nicht geladen werden.")); };
    script.src = url.toString(); document.body.appendChild(script);
  });
}
function addPoints(klasse, points, game) { return jsonp("add", { klasse, points, game, code: AbiVegasDevice.playerCode() }); }
async function loadScores() {
  try {
    const data = await jsonp("scores");
    if (data.ok && data.scores) {
      state.scores = Object.fromEntries(CLASSES.map(k => [k, 0]));
      data.scores.forEach(item => { if (CLASSES.includes(String(item.klasse))) state.scores[String(item.klasse)] = Number(item.chips || 0); });
      renderLeaderboard();
    }
  } catch (error) {
    console.warn(error);
    renderLeaderboard();
  }
}
function renderLeaderboard() { leaderboard.innerHTML = Object.entries(state.scores).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>`<li><span>#${i+1} ${formatClassName(k)}</span><span class="chips">${v} Chips</span></li>`).join(""); }
function createPlayerCode() { const code = `player-${Math.random().toString(36).slice(2,10)}`; localStorage.setItem("abiVegasPlayerCode", code); return code; }

init();

