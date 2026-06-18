// Google Apps Script Backend fuer Abi Vegas
// Einfuegen in: Google Sheet -> Erweiterungen -> Apps Script
// Danach: Bereitstellen -> Neue Bereitstellung -> Web-App
// Ausfuehren als: Ich
// Zugriff: Jeder
//
// Wichtig: Das Google Sheet braucht zwei Tabellenblaetter:
// scores mit Spalten: klasse | chips
// log mit Spalten: timestamp | klasse | punkte | spiel | code

const SHEET_SCORES = "scores";
const SHEET_LOG = "log";
const MAX_POINTS_PER_ADD = 200;

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || "scores";
  const callback = params.callback || "callback";

  let result;

  try {
    if (action === "add") {
      result = addPoints_(params);
    } else if (action === "reset") {
      result = resetScores_(params);
    } else {
      result = getScores_();
    }
  } catch (error) {
    result = {
      ok: false,
      error: String(error)
    };
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(result) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getScores_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_SCORES);
  if (!sheet) throw new Error("Tabellenblatt scores fehlt.");

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).filter(row => row[0]);

  return {
    ok: true,
    scores: rows.map(row => ({
      klasse: String(row[0]),
      chips: Number(row[1] || 0)
    }))
  };
}

function addPoints_(params) {
  const klasse = String(params.klasse || "").trim();
  const points = Math.max(0, Math.min(MAX_POINTS_PER_ADD, Number(params.points || 0)));
  const game = String(params.game || "slot");
  const code = String(params.code || "unknown");

  if (!klasse) throw new Error("Klasse fehlt.");
  if (!points) throw new Error("Punkte fehlen.");

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const spreadsheet = SpreadsheetApp.getActive();
    const scoresSheet = spreadsheet.getSheetByName(SHEET_SCORES);
    const logSheet = spreadsheet.getSheetByName(SHEET_LOG);

    if (!scoresSheet) throw new Error("Tabellenblatt scores fehlt.");
    if (!logSheet) throw new Error("Tabellenblatt log fehlt.");

    const values = scoresSheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === klasse) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow === -1) {
      foundRow = scoresSheet.getLastRow() + 1;
      scoresSheet.getRange(foundRow, 1).setValue(klasse);
      scoresSheet.getRange(foundRow, 2).setValue(0);
    }

    const current = Number(scoresSheet.getRange(foundRow, 2).getValue() || 0);
    scoresSheet.getRange(foundRow, 2).setValue(current + points);

    logSheet.appendRow([
      new Date(),
      klasse,
      points,
      game,
      code
    ]);

    return {
      ok: true,
      klasse,
      added: points,
      total: current + points
    };
  } finally {
    lock.releaseLock();
  }
}

// Optionaler Reset. Aendere ADMIN_SECRET vor dem echten Einsatz.
function resetScores_(params) {
  const ADMIN_SECRET = "VEGAS2026";
  if (params.secret !== ADMIN_SECRET) {
    throw new Error("Admin-Code falsch.");
  }

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_SCORES);
  if (!sheet) throw new Error("Tabellenblatt scores fehlt.");

  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 2, lastRow - 1, 1).setValue(0);
  }

  return {
    ok: true,
    reset: true
  };
}
