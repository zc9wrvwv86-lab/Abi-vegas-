// Google Apps Script Backend fuer Abi Vegas
// Zentrale Team-Konten: Jedes Geraet erhaelt einen Token und bleibt einer Klasse zugeordnet.

const SHEET_SCORES = "scores";
const SHEET_LOG = "log";
const SHEET_PLAYERS = "players";
const TEAMS = ["5", "6", "7", "8", "9", "10", "11", "12", "Lehrer"];
const STARTING_CHIPS = 100;
const MAX_POINTS_PER_ADD = 200;
const BALANCE_MIGRATION_KEY = "ABV_TEAM_START_BALANCE_V1";
const STATIC_ROOT = "https://raw.githubusercontent.com/zc9wrvwv86-lab/Abi-vegas-/main/";
const ASSET_ROOT = "https://cdn.jsdelivr.net/gh/zc9wrvwv86-lab/Abi-vegas-@main/";
const APP_PAGES = ["index.html", "event.html", "roulette.html", "blackjack.html", "challenge.html", "jackpot.html"];

function doGet(e) {
  const params = (e && e.parameter) || {};

  // Ohne API-Aktion wird die eigentliche Abi-Vegas-App ausgeliefert.
  if (!params.action && !params.callback) {
    return serveAppPage_(params.page || "index.html");
  }

  const action = String(params.action || "scores");
  const callback = safeCallback_(params.callback);
  let result;

  try {
    prepareGame_();
    if (action === "session") result = getOrCreateSession_(params);
    else if (action === "add") result = addPoints_(params);
    else if (action === "reset") result = resetScores_(params);
    else result = getScores_();
  } catch (error) {
    result = { ok: false, error: String(error.message || error) };
  }

  return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function serveAppPage_(requestedPage) {
  const page = APP_PAGES.indexOf(String(requestedPage)) !== -1 ? String(requestedPage) : "index.html";
  const response = UrlFetchApp.fetch(STATIC_ROOT + page, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error("App-Seite konnte nicht geladen werden.");
  }

  const serviceUrl = ScriptApp.getService().getUrl();
  let html = response.getContentText();
  html = html.replace("</head>", '<base target="_top">\n</head>');
  html = html.replace(/(href|src)="(?!https?:|#)([^"]+\.(?:css|js))"/g, function(match, attr, path) {
    return attr + '="' + ASSET_ROOT + path + '"';
  });
  html = html.replace(/href="(index|event|roulette|blackjack|challenge|jackpot)\.html([^"]*)"/g, function(match, name, suffix) {
    return 'href="' + serviceUrl + '?page=' + name + '.html' + suffix + '"';
  });

  return HtmlService.createHtmlOutput(html)
    .setTitle("Abi Vegas")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function safeCallback_(value) {
  const callback = String(value || "callback");
  return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback) ? callback : "callback";
}

function prepareGame_() {
  const spreadsheet = SpreadsheetApp.getActive();

  let scoresSheet = spreadsheet.getSheetByName(SHEET_SCORES);
  if (!scoresSheet) scoresSheet = spreadsheet.insertSheet(SHEET_SCORES);
  if (scoresSheet.getLastRow() === 0) scoresSheet.appendRow(["klasse", "chips"]);

  let logSheet = spreadsheet.getSheetByName(SHEET_LOG);
  if (!logSheet) logSheet = spreadsheet.insertSheet(SHEET_LOG);
  if (logSheet.getLastRow() === 0) logSheet.appendRow(["timestamp", "klasse", "punkte", "spiel", "code", "event_id"]);
  else if (!logSheet.getRange(1, 6).getValue()) logSheet.getRange(1, 6).setValue("event_id");

  let playersSheet = spreadsheet.getSheetByName(SHEET_PLAYERS);
  if (!playersSheet) playersSheet = spreadsheet.insertSheet(SHEET_PLAYERS);
  if (playersSheet.getLastRow() === 0) {
    playersSheet.appendRow(["code", "klasse", "erstellt", "zuletzt_aktiv"]);
  }

  ensureTeamRows_(scoresSheet);
  migrateStartingBalances_(scoresSheet);
}

function ensureTeamRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const existing = {};
  for (let i = 1; i < values.length; i++) {
    const team = String(values[i][0]).trim();
    if (team) existing[team] = i + 1;
  }

  TEAMS.forEach(function(team) {
    if (!existing[team]) sheet.appendRow([team, STARTING_CHIPS]);
  });
}

function migrateStartingBalances_(sheet) {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(BALANCE_MIGRATION_KEY) === "done") return;

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    if (properties.getProperty(BALANCE_MIGRATION_KEY) === "done") return;

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const team = String(values[i][0]).trim();
      if (TEAMS.indexOf(team) === -1) continue;
      const current = Number(values[i][1] || 0);
      if (current < STARTING_CHIPS) sheet.getRange(i + 1, 2).setValue(STARTING_CHIPS);
    }

    properties.setProperty(BALANCE_MIGRATION_KEY, "done");
  } finally {
    lock.releaseLock();
  }
}

function getScores_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_SCORES);
  const rows = sheet.getDataRange().getValues().slice(1).filter(function(row) {
    return TEAMS.indexOf(String(row[0]).trim()) !== -1;
  });

  return {
    ok: true,
    startingChips: STARTING_CHIPS,
    scores: rows.map(function(row) {
      return { klasse: String(row[0]).trim(), chips: Number(row[1] || 0) };
    })
  };
}

function getOrCreateSession_(params) {
  const code = validateCode_(params.code);
  const requestedTeam = String(params.klasse || "").trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const spreadsheet = SpreadsheetApp.getActive();
    const playersSheet = spreadsheet.getSheetByName(SHEET_PLAYERS);
    let team = findPlayerTeam_(playersSheet, code);

    if (team) {
      if (requestedTeam && requestedTeam !== team) {
        throw new Error("Dieses Geraet ist bereits fuer " + team + " angemeldet.");
      }
      touchPlayer_(playersSheet, code);
    } else {
      validateTeam_(requestedTeam);
      team = requestedTeam;
      const now = new Date();
      playersSheet.appendRow([code, team, now, now]);
    }

    const chips = getTeamChips_(spreadsheet.getSheetByName(SHEET_SCORES), team);
    return { ok: true, session: { klasse: team, chips: chips } };
  } finally {
    lock.releaseLock();
  }
}

function addPoints_(params) {
  const code = validateCode_(params.code);
  const requestedTeam = String(params.klasse || "").trim();
  const points = Math.floor(Math.max(0, Math.min(MAX_POINTS_PER_ADD, Number(params.points || 0))));
  const game = String(params.game || "game").slice(0, 40);
  const eventId = String(params.eventId || "").slice(0, 100);

  if (!points) throw new Error("Punkte fehlen.");

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const spreadsheet = SpreadsheetApp.getActive();
    const playersSheet = spreadsheet.getSheetByName(SHEET_PLAYERS);
    let team = findPlayerTeam_(playersSheet, code);

    if (!team) {
      validateTeam_(requestedTeam);
      team = requestedTeam;
      const now = new Date();
      playersSheet.appendRow([code, team, now, now]);
    }

    if (requestedTeam && requestedTeam !== team) {
      throw new Error("Der Team-Token gehoert zu einer anderen Klasse.");
    }

    const scoresSheet = spreadsheet.getSheetByName(SHEET_SCORES);
    const logSheet = spreadsheet.getSheetByName(SHEET_LOG);

    if (eventId && eventWasSaved_(logSheet, eventId)) {
      return { ok: true, klasse: team, added: 0, total: getTeamChips_(scoresSheet, team), duplicate: true };
    }

    const scoreRow = findScoreRow_(scoresSheet, team);
    const current = Number(scoresSheet.getRange(scoreRow, 2).getValue() || 0);
    const total = current + points;
    scoresSheet.getRange(scoreRow, 2).setValue(total);
    logSheet.appendRow([new Date(), team, points, game, code, eventId]);
    touchPlayer_(playersSheet, code);

    return { ok: true, klasse: team, added: points, total: total };
  } finally {
    lock.releaseLock();
  }
}

function validateCode_(value) {
  const code = String(value || "").trim();
  if (!/^team-[0-9a-z-]{8,80}$/i.test(code)) throw new Error("Team-Token fehlt oder ist ungueltig.");
  return code;
}

function validateTeam_(team) {
  if (TEAMS.indexOf(team) === -1) throw new Error("Bitte eine gueltige Klasse auswaehlen.");
}

function findPlayerTeam_(sheet, code) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === code) return String(values[i][1]).trim();
  }
  return "";
}

function touchPlayer_(sheet, code) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === code) {
      sheet.getRange(i + 1, 4).setValue(new Date());
      return;
    }
  }
}

function findScoreRow_(sheet, team) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === team) return i + 1;
  }

  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 2).setValues([[team, STARTING_CHIPS]]);
  return row;
}

function getTeamChips_(sheet, team) {
  const row = findScoreRow_(sheet, team);
  return Number(sheet.getRange(row, 2).getValue() || 0);
}

function eventWasSaved_(sheet, eventId) {
  if (!eventId || sheet.getLastRow() < 2) return false;
  return Boolean(
    sheet.getRange(2, 6, sheet.getLastRow() - 1, 1)
      .createTextFinder(eventId)
      .matchEntireCell(true)
      .findNext()
  );
}

function resetScores_(params) {
  const ADMIN_SECRET = "VEGAS2026";
  if (params.secret !== ADMIN_SECRET) throw new Error("Admin-Code falsch.");

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_SCORES);
  TEAMS.forEach(function(team) {
    const row = findScoreRow_(sheet, team);
    sheet.getRange(row, 2).setValue(STARTING_CHIPS);
  });

  return { ok: true, reset: true, startingChips: STARTING_CHIPS };
}
