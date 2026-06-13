// Abi Vegas Web-App
// Google Apps Script Web-App-URL für zentrale Punkte im Google Sheet.
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwX03awlXSE0UpGNAPfqugNwVJLqO_kv6ETfIaHREPLwBcwylxGbcjv3xWIjL1RWWGmHw/exec";

// Gespeichert wird im Google Sheet als: 5, 6, 7, ..., 12, Lehrer
// Angezeigt wird schöner als: 5. Klasse, 6. Klasse, ..., Lehrer
const CLASSES = ["5", "6", "7", "8", "9", "10", "11", "12", "Lehrer"];

const SYMBOLS = ["🎰", "🎲", "🃏", "💎", "🍒", "7️⃣"];
const COOLDOWN_MS = 30_000;
const ROULETTE_COOLDOWN_MS = 12_000;

const classSelect = document.querySelector("#classSelect");
const spinButton = document.querySelector("#spinButton");
const refreshButton = document.querySelector("#refreshButton");
const leaderboard = document.querySelector("#leaderboard");
const resultText = document.querySelector("#resultText");
const cooldownText = document.querySelector("#cooldownText");
const chipBurst = document.querySelector("#chipBurst");
const reels = [
  document.querySelector("#reel1"),
  document.querySelector("#reel2"),
  document.querySelector("#reel3")
];

const ROULETTE_SEGMENTS = [
  { subject: "Mathe", color: "rot", multiplier: 2 },
  { subject: "Deutsch", color: "weiss", multiplier: 2 },
  { subject: "Englisch", color: "rot", multiplier: 2 },
  { subject: "Bio", color: "weiss", multiplier: 2 },
  { subject: "Mathe", color: "rot", multiplier: 2 },
  { subject: "Erdkunde", color: "weiss", multiplier: 2 },
  { subject: "Jackpot", color: "gold", multiplier: 4 },
  { subject: "Sport", color: "rot", multiplier: 2 },
  { subject: "Geschichte", color: "weiss", multiplier: 2 },
  { subject: "Deutsch", color: "rot", multiplier: 2 },
  { subject: "Englisch", color: "weiss", multiplier: 2 },
  { subject: "Mathe", color: "rot", multiplier: 2 },
  { subject: "Kunst/Musik", color: "weiss", multiplier: 2 },
  { subject: "Bio", color: "rot", multiplier: 2 },
  { subject: "Schule", color: "weiss", multiplier: 2 },
  { subject: "Abi Vegas", color: "gold", multiplier: 4 },
  { subject: "Geschichte", color: "rot", multiplier: 2 },
  { subject: "Sport", color: "weiss", multiplier: 2 },
  { subject: "Englisch", color: "rot", multiplier: 2 },
  { subject: "Deutsch", color: "weiss", multiplier: 2 },
  { subject: "Erdkunde", color: "rot", multiplier: 2 },
  { subject: "Mathe", color: "weiss", multiplier: 2 },
  { subject: "Schule", color: "rot", multiplier: 2 },
  { subject: "Abi Vegas", color: "weiss", multiplier: 2 }
];

const ROULETTE_QUESTIONS = {
  "Mathe": {
    easy: [
      q("Was ist 7 × 8?", ["54", "56", "64", "49"], 1),
      q("Wie viele Seiten hat ein Würfel?", ["4", "6", "8", "12"], 1),
      q("Was ist die Hälfte von 50?", ["20", "25", "30", "15"], 1)
    ],
    medium: [
      q("Was ist 15 % von 200?", ["20", "25", "30", "35"], 2),
      q("Welche Zahl ist eine Primzahl?", ["21", "27", "29", "33"], 2),
      q("Was ist 3² + 4²?", ["7", "12", "25", "49"], 2)
    ],
    hard: [
      q("Was ist die Ableitung von x²?", ["x", "2x", "x³", "2"], 1),
      q("Wie heißt die Nullstelle von f(x)=x-5?", ["-5", "0", "5", "10"], 2),
      q("Was ist sin(90°)?", ["0", "0,5", "1", "2"], 2)
    ],
    teacher: [
      q("Was ist 13 × 13?", ["156", "169", "179", "196"], 1)
    ]
  },
  "Deutsch": {
    easy: [
      q("Wie nennt man ein Namenwort?", ["Verb", "Nomen", "Adjektiv", "Artikel"], 1),
      q("Welches Satzzeichen steht am Ende einer Frage?", ["Punkt", "Komma", "Fragezeichen", "Doppelpunkt"], 2)
    ],
    medium: [
      q("Was ist ein Synonym?", ["Gegenteil", "gleiches oder ähnliches Wort", "Reim", "Satzglied"], 1),
      q("Welche Wortart beschreibt Eigenschaften?", ["Nomen", "Verb", "Adjektiv", "Pronomen"], 2)
    ],
    hard: [
      q("Was ist eine Metapher?", ["bildhafte Übertragung", "eine Zeitform", "ein Reim", "eine Satzart"], 0),
      q("Was ist ein rhetorisches Mittel?", ["ein Werkzeug zum Rechnen", "sprachliches Gestaltungsmittel", "eine Textsorte", "ein Satzzeichen"], 1)
    ],
    teacher: [
      q("Was ist im Satz meist das Prädikat?", ["das Subjekt", "das Verb", "das Objekt", "der Artikel"], 1)
    ]
  },
  "Englisch": {
    easy: [
      q("Was heißt 'Schule' auf Englisch?", ["school", "chair", "street", "shop"], 0),
      q("Was heißt 'gewinnen' auf Englisch?", ["lose", "win", "wait", "write"], 1)
    ],
    medium: [
      q("Welche Form ist richtig?", ["I am", "I is", "I are", "I be"], 0),
      q("Was heißt 'Glück' auf Englisch?", ["luck", "look", "lock", "lake"], 0)
    ],
    hard: [
      q("Welche Zeitform ist 'I have learned'?", ["Simple Past", "Present Perfect", "Future", "Past Perfect"], 1),
      q("Was bedeutet 'however'?", ["deshalb", "jedoch", "außerdem", "niemals"], 1)
    ],
    teacher: [
      q("Was ist das Gegenteil von 'strict'?", ["loud", "lenient", "late", "little"], 1)
    ]
  },
  "Bio": {
    easy: [
      q("Welches Organ pumpt Blut?", ["Lunge", "Herz", "Magen", "Leber"], 1),
      q("Was brauchen Pflanzen zum Wachsen?", ["Licht und Wasser", "Beton", "Sand allein", "Dunkelheit"], 0)
    ],
    medium: [
      q("Wie nennt man die grüne Farbe in Pflanzen?", ["Chlorophyll", "Hämoglobin", "Melanin", "Keratin"], 0),
      q("Wofür steht DNA?", ["Erbinformation", "Blutzucker", "Nervensignal", "Muskelkraft"], 0)
    ],
    hard: [
      q("Wo findet Fotosynthese hauptsächlich statt?", ["Mitochondrien", "Chloroplasten", "Zellkern", "Ribosomen"], 1),
      q("Wie nennt man Zellteilung bei Körperzellen?", ["Meiose", "Mitose", "Osmose", "Diffusion"], 1)
    ],
    teacher: [
      q("Welches Molekül transportiert Sauerstoff im Blut?", ["Insulin", "Hämoglobin", "DNA", "Chlorophyll"], 1)
    ]
  },
  "Geschichte": {
    easy: [
      q("Wie heißt die Hauptstadt von Deutschland?", ["Hamburg", "Berlin", "München", "Köln"], 1),
      q("Auf welchem Kontinent liegt Deutschland?", ["Europa", "Asien", "Afrika", "Australien"], 0)
    ],
    medium: [
      q("In welchem Jahr fiel die Berliner Mauer?", ["1945", "1961", "1989", "1999"], 2),
      q("Wie viele Bundesländer hat Deutschland?", ["12", "14", "16", "18"], 2)
    ],
    hard: [
      q("Wann endete der Zweite Weltkrieg in Europa?", ["1918", "1933", "1945", "1961"], 2),
      q("Was war die Weimarer Republik?", ["eine deutsche Demokratie", "ein Königreich", "ein Bundesland", "eine Stadt"], 0)
    ],
    teacher: [
      q("Welches Ereignis gilt oft als Beginn der Französischen Revolution?", ["Mauerfall", "Sturm auf die Bastille", "Mondlandung", "Reichsgründung"], 1)
    ]
  },
  "Erdkunde": {
    easy: [
      q("Wie heißt der Planet, auf dem wir leben?", ["Mars", "Erde", "Venus", "Jupiter"], 1),
      q("Welche Stadt ist Hauptstadt von Frankreich?", ["Paris", "Rom", "Madrid", "Wien"], 0)
    ],
    medium: [
      q("Welcher Fluss fließt durch Köln?", ["Elbe", "Rhein", "Donau", "Spree"], 1),
      q("Welches ist ein Ozean?", ["Sahara", "Atlantik", "Alpen", "Nil"], 1)
    ],
    hard: [
      q("Wie heißt der größte Kontinent?", ["Afrika", "Asien", "Europa", "Australien"], 1),
      q("Was misst man mit einer Klimadiagramm-Kurve oft?", ["Temperatur", "Einwohnerzahl", "Höhe", "Uhrzeit"], 0)
    ],
    teacher: [
      q("Welche Himmelsrichtung liegt auf Karten meistens oben?", ["Süden", "Westen", "Norden", "Osten"], 2)
    ]
  },
  "Sport": {
    easy: [
      q("Wie viele Spieler hat ein Fußballteam auf dem Feld?", ["7", "9", "11", "13"], 2),
      q("Wie viele Ringe hat das Olympia-Symbol?", ["3", "4", "5", "6"], 2)
    ],
    medium: [
      q("Wie viele Minuten dauert eine Fußball-Halbzeit?", ["30", "40", "45", "60"], 2),
      q("Welche Sportart spielt man mit Federball?", ["Basketball", "Badminton", "Rugby", "Handball"], 1)
    ],
    hard: [
      q("Wie viele Punkte gibt ein Freiwurf im Basketball?", ["1", "2", "3", "4"], 0),
      q("Welche Disziplin gehört zur Leichtathletik?", ["Weitsprung", "Eishockey", "Schach", "Rudern"], 0)
    ],
    teacher: [
      q("Was bedeutet Fair Play?", ["um jeden Preis gewinnen", "respektvoll und regelgerecht spielen", "nie passen", "nur zuschauen"], 1)
    ]
  },
  "Kunst/Musik": {
    easy: [
      q("Welche Farbe entsteht aus Blau und Gelb?", ["Rot", "Grün", "Lila", "Orange"], 1),
      q("Wie viele Linien hat ein Notensystem?", ["4", "5", "6", "7"], 1)
    ],
    medium: [
      q("Was ist ein Porträt?", ["Landschaftsbild", "Bild einer Person", "Musikstück", "Buch"], 1),
      q("Welches Instrument hat Tasten?", ["Klavier", "Trompete", "Geige", "Flöte"], 0)
    ],
    hard: [
      q("Was bedeutet 'Forte' in der Musik?", ["leise", "laut", "schnell", "langsam"], 1),
      q("Welche Farbe ist keine Primärfarbe im klassischen Farbkreis?", ["Rot", "Gelb", "Blau", "Grün"], 3)
    ],
    teacher: [
      q("Was ist ein Takt in der Musik?", ["eine Lautstärke", "eine rhythmische Einheit", "ein Bildrand", "eine Farbe"], 1)
    ]
  },
  "Schule": {
    easy: [
      q("Was sammelt deine Klasse hier?", ["Chips", "Hausaufgaben", "Noten", "Stifte"], 0),
      q("Welche Gruppen können mitspielen?", ["nur Klasse 5", "5 bis 12 und Lehrer", "nur Lehrer", "nur Oberstufe"], 1)
    ],
    medium: [
      q("Was ist bei diesem Spiel nicht nötig?", ["Klasse auswählen", "echten Namen angeben", "fair spielen", "Frage beantworten"], 1),
      q("Wofür zählt der Punktestand?", ["für einzelne Namen", "für die Klasse", "für Hausaufgaben", "für Zeugnisse"], 1)
    ],
    hard: [
      q("Was ist der beste Abi-Gag-Grundsatz?", ["Chaos ohne Grenzen", "fair, sicher und lustig", "niemand darf lachen", "nur Oberstufe darf mitmachen"], 1),
      q("Was sollte man bei Schulspielen vermeiden?", ["Teamwork", "Bloßstellen einzelner Personen", "klare Regeln", "Spaß"], 1)
    ],
    teacher: [
      q("Was macht ein gutes Schulspiel aus?", ["kurz, fair und verständlich", "kompliziert und lang", "unfair", "nur für Profis"], 0)
    ]
  },
  "Abi Vegas": {
    easy: [
      q("Welche Zahl gilt oft als Glückszahl?", ["4", "7", "12", "19"], 1),
      q("Was dreht sich beim Roulette?", ["ein Rad", "ein Buch", "ein Ballon", "ein Stift"], 0)
    ],
    medium: [
      q("Bei welchem Spiel will man nahe an 21 kommen?", ["Roulette", "Blackjack", "Memory", "Schach"], 1),
      q("Was passt am besten zum Motto?", ["Punkte sammeln", "still sitzen", "nur zuschauen", "gar nichts tun"], 0)
    ],
    hard: [
      q("Was bedeutet 'Jackpot' hier am ehesten?", ["besonders viele Chips", "Strafarbeit", "Pause", "Abbruch"], 0),
      q("Warum nutzen wir Chips statt Geld?", ["schulisch und harmlos", "weil es echter wirkt", "weil es Pflicht ist", "für Noten"], 0)
    ],
    teacher: [
      q("Was ist die schulische Version von Casino-Glück?", ["Teamwork und Wissen", "echtes Geld", "Zufallsnoten", "Nachsitzen"], 0)
    ]
  },
  "Jackpot": {
    easy: [
      q("Wie lautet das Motto?", ["Abi Vegas", "Abi Baustelle", "Abi Kino", "Abi Zoo"], 0),
      q("Was gibt es beim Jackpot?", ["mehr Chips", "weniger Pause", "Hausaufgaben", "Tests"], 0)
    ],
    medium: [
      q("Was braucht man für den Jackpot?", ["Glück und richtige Antwort", "echtes Geld", "einen Namen", "eine Note"], 0),
      q("Was ist fairer: Namen oder Klassenpunkte?", ["Namen", "Klassenpunkte", "gar keine Regeln", "Zufallsnoten"], 1)
    ],
    hard: [
      q("Was ist beim Abi-Gag wichtiger als Gewinnen?", ["Fairness", "Lautstärke", "Stress", "Chaos"], 0),
      q("Was macht ein gutes Motto-Spiel aus?", ["es passt zum Thema", "es ist geheim", "es ist unverständlich", "es dauert ewig"], 0)
    ],
    teacher: [
      q("Was sollte ein Jackpot-Feld auslösen?", ["eine faire Bonuschance", "echtes Glücksspiel", "Strafe", "Notendruck"], 0)
    ]
  }
};

const rouletteState = {
  stake: 20,
  color: "rot",
  spinning: false,
  pending: null,
  rotation: 0,
  lastSpin: Number(localStorage.getItem("abiVegasRouletteLastSpin") || 0)
};

const state = {
  scores: Object.fromEntries(CLASSES.map((klasse) => [klasse, 0])),
  lastSpin: Number(localStorage.getItem("abiVegasLastSpin") || 0),
  isSpinning: false
};

function q(text, choices, correctIndex) {
  return { text, choices, correctIndex };
}

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

  initRoulette();
  updateCooldown();
  renderLeaderboard();
  loadScores();
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

  if (a === b && b === c) return 50;
  if (a === b || b === c || a === c) return 20;
  if (result.includes("💎")) return 10;
  if (result.includes("7️⃣")) return 15;
  return 5;
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
    resultText.textContent += " Die Punkte sind aktuell nur lokal gespeichert, weil das Backend nicht erreichbar ist.";
  } finally {
    state.isSpinning = false;
    updateCooldown();
  }
}

async function animateReels(finalResult) {
  reels.forEach((reel) => reel.classList.add("is-spinning"));

  const rounds = 14;
  for (let round = 0; round < rounds; round++) {
    reels.forEach((reel) => {
      reel.textContent = randomItem(SYMBOLS);
    });
    await sleep(65 + round * 8);
  }

  for (let index = 0; index < reels.length; index++) {
    reels[index].textContent = finalResult[index];
    reels[index].classList.remove("is-spinning");
    await sleep(120);
  }
}

function initRoulette() {
  injectRouletteStyles();

  const leaderboardCard = document.querySelector(".leaderboard-card");
  if (!leaderboardCard || document.querySelector("#rouletteCard")) return;

  const rouletteCard = document.createElement("section");
  rouletteCard.className = "card roulette-card casino-panel";
  rouletteCard.id = "rouletteCard";
  rouletteCard.innerHTML = `
    <div class="section-head roulette-head">
      <div>
        <p class="eyebrow small-eyebrow">Abi Roulette</p>
        <h2>Fachrad der Punkte</h2>
      </div>
      <span class="roulette-badge">Neu</span>
    </div>

    <div class="roulette-grid">
      <div class="roulette-visual">
        <div class="roulette-pointer-main">▼</div>
        <div id="abiRouletteWheel" class="abi-roulette-wheel">
          <span>ABW</span>
        </div>
        <p id="rouletteResult" class="roulette-result">Setze Chips, wähle Rot/Weiß/Gold und dreh das Rad.</p>
      </div>

      <div class="roulette-controls">
        <label>Einsatz</label>
        <div class="roulette-button-row" id="stakeButtons">
          <button type="button" class="roulette-mini active" data-stake="10">10</button>
          <button type="button" class="roulette-mini" data-stake="20">20</button>
          <button type="button" class="roulette-mini" data-stake="30">30</button>
          <button type="button" class="roulette-mini" data-stake="50">50</button>
        </div>

        <label>Setzen auf</label>
        <div class="roulette-button-row" id="colorButtons">
          <button type="button" class="roulette-choice active red-choice" data-color="rot">Rot x2</button>
          <button type="button" class="roulette-choice white-choice" data-color="weiss">Weiß x2</button>
          <button type="button" class="roulette-choice gold-choice" data-color="gold">Gold x4</button>
        </div>

        <button type="button" id="rouletteSpinButton" class="primary-button roulette-spin-button">Roulette drehen</button>
        <p id="rouletteHint" class="hint">Landest du auf der richtigen Farbe, kommt eine Frage passend zur Klasse.</p>
      </div>
    </div>

    <div id="rouletteQuestion" class="roulette-question"></div>
  `;

  leaderboardCard.parentNode.insertBefore(rouletteCard, leaderboardCard);

  rouletteCard.querySelectorAll("[data-stake]").forEach((button) => {
    button.addEventListener("click", () => {
      rouletteState.stake = Number(button.dataset.stake);
      rouletteCard.querySelectorAll("[data-stake]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
    });
  });

  rouletteCard.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      rouletteState.color = button.dataset.color;
      rouletteCard.querySelectorAll("[data-color]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
    });
  });

  rouletteCard.querySelector("#rouletteSpinButton").addEventListener("click", spinRoulette);
}

async function spinRoulette() {
  if (rouletteState.spinning) return;

  const resultBox = document.querySelector("#rouletteResult");
  const questionBox = document.querySelector("#rouletteQuestion");
  const spinButton = document.querySelector("#rouletteSpinButton");
  const wheel = document.querySelector("#abiRouletteWheel");

  if (!resultBox || !questionBox || !spinButton || !wheel) return;

  if (rouletteState.pending) {
    resultBox.textContent = "Beantworte erst die aktuelle Roulette-Frage.";
    return;
  }

  const now = Date.now();
  const remaining = ROULETTE_COOLDOWN_MS - (now - rouletteState.lastSpin);
  if (remaining > 0) {
    resultBox.textContent = `Roulette ist gleich wieder bereit: noch ${Math.ceil(remaining / 1000)} Sekunden.`;
    return;
  }

  rouletteState.spinning = true;
  rouletteState.lastSpin = now;
  localStorage.setItem("abiVegasRouletteLastSpin", String(now));
  spinButton.disabled = true;
  questionBox.innerHTML = "";
  resultBox.textContent = "Das Abi-Roulette dreht ...";

  const index = Math.floor(Math.random() * ROULETTE_SEGMENTS.length);
  const segment = ROULETTE_SEGMENTS[index];
  const segmentAngle = 360 / ROULETTE_SEGMENTS.length;
  rouletteState.rotation += 1440 + (360 - index * segmentAngle - segmentAngle / 2);
  wheel.style.transform = `rotate(${rouletteState.rotation}deg)`;

  await sleep(1900);

  const colorText = segment.color === "weiss" ? "Weiß" : segment.color === "gold" ? "Gold" : "Rot";
  if (rouletteState.color !== segment.color) {
    resultBox.textContent = `Gelande auf ${colorText}: ${segment.subject}. Deine Farbe war leider falsch – 0 Chips.`;
    rouletteState.spinning = false;
    spinButton.disabled = false;
    return;
  }

  const question = getRouletteQuestion(segment.subject, classSelect.value);
  rouletteState.pending = { segment, question };
  resultBox.textContent = `Treffer: ${colorText} / ${segment.subject}. Richtige Antwort = ${rouletteState.stake * segment.multiplier} Chips.`;
  renderRouletteQuestion(question, rouletteState.stake * segment.multiplier);
  rouletteState.spinning = false;
  spinButton.disabled = false;
}

function getDifficultyForClass(klasse) {
  if (klasse === "Lehrer") return "teacher";
  const grade = Number(klasse);
  if (grade <= 6) return "easy";
  if (grade <= 9) return "medium";
  return "hard";
}

function getRouletteQuestion(subject, klasse) {
  const difficulty = getDifficultyForClass(klasse);
  const subjectPool = ROULETTE_QUESTIONS[subject] || ROULETTE_QUESTIONS["Abi Vegas"];
  const pool = subjectPool[difficulty] || subjectPool.medium || subjectPool.easy;
  return randomItem(pool);
}

function renderRouletteQuestion(question, points) {
  const questionBox = document.querySelector("#rouletteQuestion");
  if (!questionBox) return;

  questionBox.innerHTML = `
    <div class="roulette-question-card">
      <p class="question-prize">Gewinnchance: ${points} Chips</p>
      <h3>${question.text}</h3>
      <div class="answer-grid">
        ${question.choices.map((choice, index) => `<button type="button" data-answer="${index}">${choice}</button>`).join("")}
      </div>
    </div>
  `;

  questionBox.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => answerRouletteQuestion(Number(button.dataset.answer), points));
  });
}

async function answerRouletteQuestion(answerIndex, points) {
  if (!rouletteState.pending) return;

  const { question } = rouletteState.pending;
  const questionBox = document.querySelector("#rouletteQuestion");
  const resultBox = document.querySelector("#rouletteResult");
  const klasse = classSelect.value;
  const correct = answerIndex === question.correctIndex;

  rouletteState.pending = null;

  if (questionBox) {
    questionBox.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
      const index = Number(button.dataset.answer);
      if (index === question.correctIndex) button.classList.add("correct-answer");
      if (index === answerIndex && !correct) button.classList.add("wrong-answer");
    });
  }

  if (!correct) {
    if (resultBox) resultBox.textContent = `Leider falsch. Richtig wäre: ${question.choices[question.correctIndex]}.`;
    return;
  }

  if (resultBox) resultBox.textContent = `${formatClassName(klasse)} gewinnt beim Abi-Roulette ${points} Chips!`;
  createChipBurst(points);
  updateLocalScore(klasse, points);

  try {
    await addPoints(klasse, points, "roulette");
    await loadScores();
  } catch (error) {
    console.warn(error);
    if (resultBox) resultBox.textContent += " Die Punkte sind aktuell nur lokal gespeichert, weil das Backend nicht erreichbar ist.";
  }
}

function injectRouletteStyles() {
  if (document.querySelector("#rouletteStyles")) return;
  const style = document.createElement("style");
  style.id = "rouletteStyles";
  style.textContent = `
    .roulette-card { overflow: hidden; }
    .small-eyebrow { margin-bottom: 4px; font-size: 0.74rem; }
    .roulette-badge {
      padding: 8px 12px;
      border-radius: 999px;
      color: #18070b;
      background: linear-gradient(135deg, var(--gold), #ff9f43);
      font-weight: 950;
      box-shadow: 0 0 18px rgba(255, 211, 106, 0.35);
    }
    .roulette-grid {
      display: grid;
      grid-template-columns: minmax(210px, 0.85fr) 1.15fr;
      gap: 20px;
      align-items: center;
      margin-top: 18px;
    }
    .roulette-visual { display: grid; place-items: center; gap: 10px; text-align: center; }
    .roulette-pointer-main {
      margin-bottom: -12px;
      color: var(--gold);
      font-size: 2rem;
      filter: drop-shadow(0 0 12px rgba(255, 211, 106, 0.9));
      z-index: 2;
      animation: pointerPulse 900ms ease-in-out infinite;
    }
    .abi-roulette-wheel {
      display: grid;
      place-items: center;
      width: min(240px, 62vw);
      height: min(240px, 62vw);
      border: 10px solid rgba(255, 211, 106, 0.92);
      border-radius: 50%;
      background:
        radial-gradient(circle at center, #fff7dc 0 16%, transparent 17%),
        conic-gradient(
          #ba1238 0deg 15deg, #f8f0d8 15deg 30deg, #ba1238 30deg 45deg, #f8f0d8 45deg 60deg,
          #ba1238 60deg 75deg, #f8f0d8 75deg 90deg, #ffcf5f 90deg 105deg, #ba1238 105deg 120deg,
          #f8f0d8 120deg 135deg, #ba1238 135deg 150deg, #f8f0d8 150deg 165deg, #ba1238 165deg 180deg,
          #f8f0d8 180deg 195deg, #ba1238 195deg 210deg, #f8f0d8 210deg 225deg, #ffcf5f 225deg 240deg,
          #ba1238 240deg 255deg, #f8f0d8 255deg 270deg, #ba1238 270deg 285deg, #f8f0d8 285deg 300deg,
          #ba1238 300deg 315deg, #f8f0d8 315deg 330deg, #ba1238 330deg 345deg, #f8f0d8 345deg 360deg
        );
      box-shadow: 0 0 34px rgba(255, 211, 106, 0.4), inset 0 0 25px rgba(0, 0, 0, 0.55);
      transition: transform 1.9s cubic-bezier(.15, .82, .22, 1);
    }
    .abi-roulette-wheel span {
      display: grid;
      place-items: center;
      width: 62px;
      height: 62px;
      border-radius: 50%;
      color: #18070b;
      background: linear-gradient(135deg, #fff7dc, var(--gold));
      font-weight: 1000;
      box-shadow: 0 0 18px rgba(255, 211, 106, 0.85);
    }
    .roulette-result { min-height: 46px; font-weight: 850; color: var(--text); }
    .roulette-controls label { margin-top: 8px; }
    .roulette-button-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }
    .roulette-mini, .roulette-choice {
      width: auto;
      min-height: 42px;
      padding: 0 14px;
      border: 1px solid rgba(255, 211, 106, 0.22);
      color: var(--text);
      background: rgba(0, 0, 0, 0.24);
      cursor: pointer;
    }
    .roulette-mini.active, .roulette-choice.active {
      color: #18070b;
      background: linear-gradient(135deg, var(--gold), #ff9f43);
      box-shadow: 0 0 18px rgba(255, 211, 106, 0.35);
    }
    .red-choice { border-color: rgba(255, 79, 109, 0.55); }
    .white-choice { border-color: rgba(255, 247, 220, 0.55); }
    .gold-choice { border-color: rgba(255, 211, 106, 0.75); }
    .roulette-spin-button { margin-top: 6px; }
    .roulette-question { margin-top: 18px; }
    .roulette-question-card {
      padding: 16px;
      border-radius: 18px;
      background: rgba(0, 0, 0, 0.24);
      border: 1px solid rgba(255, 211, 106, 0.2);
    }
    .roulette-question-card h3 { margin: 4px 0 14px; }
    .question-prize { margin: 0; color: var(--gold); font-weight: 950; }
    .answer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .answer-grid button {
      min-height: 46px;
      padding: 10px;
      color: var(--text);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.12);
      cursor: pointer;
    }
    .answer-grid button:hover { border-color: rgba(255, 211, 106, 0.4); }
    .answer-grid .correct-answer { color: #071b12; background: #42e39f; }
    .answer-grid .wrong-answer { color: #fff7dc; background: #ba1238; }
    @media (max-width: 760px) {
      .roulette-grid { grid-template-columns: 1fr; }
      .answer-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
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

  setTimeout(() => {
    chipBurst.innerHTML = "";
  }, 1200);
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

function renderLeaderboard() {
  const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
  leaderboard.innerHTML = sorted
    .map(([klasse, chips], index) => `
      <li style="animation-delay: ${index * 35}ms">
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
