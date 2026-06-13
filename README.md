# Abi Vegas – um jeden Punkt gepokert

Kostenlose Starter-Version für eine Abi-Gag-Web-App.

## Was ist drin?

- Handyfreundliche Website
- Klassen-Auswahl
- Slot-Machine-Spiel
- Rangliste
- Kostenloses Backend über Google Sheets + Google Apps Script
- Keine echten Schülernamen nötig

## Schnellstart

### 1. Google Sheet vorbereiten

Erstelle ein Google Sheet mit zwei Tabellenblättern:

- `scores`
- `log`

In `scores` ab Zelle A1 einfügen:

```text
klasse	chips
5a	0
5b	0
5c	0
6a	0
6b	0
6c	0
7a	0
7b	0
7c	0
8a	0
8b	0
8c	0
9a	0
9b	0
9c	0
10a	0
10b	0
10c	0
Q1	0
Q2	0
Lehrer	0
```

In `log` ab Zelle A1 einfügen:

```text
timestamp	klasse	punkte	spiel	code
```

### 2. Apps Script Backend einrichten

Im Google Sheet:

1. `Erweiterungen` -> `Apps Script`
2. Inhalt aus `backend/Code.gs` einfügen
3. Speichern
4. `Bereitstellen` -> `Neue Bereitstellung`
5. Typ: `Web-App`
6. Ausführen als: `Ich`
7. Zugriff: `Jeder`
8. Bereitstellen
9. Web-App-URL kopieren

### 3. Backend-URL eintragen

In `app.js` diese Zeile ändern:

```js
const BACKEND_URL = "";
```

zu:

```js
const BACKEND_URL = "DEINE_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
```

### 4. Vercel deployen

1. Vercel öffnen
2. `Add New Project`
3. GitHub-Repository `Abi-vegas-` importieren
4. Deploy klicken

Danach bekommst du eine öffentliche URL. Aus dieser URL erstellst du den QR-Code.

## Wichtig

Solange `BACKEND_URL` leer ist, läuft die Seite nur im lokalen Testmodus. Punkte werden dann nicht zentral gespeichert.
