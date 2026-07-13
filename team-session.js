(() => {
  const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwX03awlXSE0UpGNAPfqugNwVJLqO_kv6ETfIaHREPLwBcwylxGbcjv3xWIjL1RWWGmHw/exec";
  const TEAMS = ["5", "6", "7", "8", "9", "10", "11", "12", "Lehrer"];
  const TEAM_KEY = "abiVegasClass";
  const TOKEN_KEY = "abiVegasTeamToken";
  const LOCK_KEY = "abiVegasTeamLocked";

  let statusElement = null;
  let currentBalance = null;

  function formatTeam(team) {
    return team === "Lehrer" ? "Lehrer" : `${team}. Klasse`;
  }

  function createToken() {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint32Array(4);
      window.crypto.getRandomValues(bytes);
      return `team-${Array.from(bytes, value => value.toString(36)).join("")}`;
    }
    return `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function getToken() {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = createToken();
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  }

  function getTeam() {
    if (localStorage.getItem(LOCK_KEY) !== "1") return "";
    const team = localStorage.getItem(TEAM_KEY) || "";
    return TEAMS.includes(team) ? team : "";
  }

  function createEventId(game) {
    return `${game || "game"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = `abiVegasTeamCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const url = new URL(BACKEND_URL);
      url.searchParams.set("action", action);
      url.searchParams.set("callback", callbackName);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Die Live-Verbindung antwortet nicht."));
      }, 10000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = data => {
        cleanup();
        if (!data || data.ok !== true) {
          reject(new Error(data?.error || "Die Anmeldung konnte nicht abgeschlossen werden."));
          return;
        }
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Die Live-Verbindung konnte nicht geladen werden."));
      };

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  function ensureStatus(select) {
    if (statusElement && document.body.contains(statusElement)) return statusElement;

    statusElement = document.createElement("div");
    statusElement.className = select ? "team-session-status" : "team-session-status team-session-floating";
    statusElement.setAttribute("aria-live", "polite");

    if (select?.parentElement) select.insertAdjacentElement("afterend", statusElement);
    else document.body.appendChild(statusElement);

    return statusElement;
  }

  function renderStatus(message, isError = false) {
    if (!statusElement) return;
    const team = getTeam();
    const balance = Number.isFinite(currentBalance) ? `${currentBalance} Chips` : "Chips werden geladen";
    statusElement.classList.toggle("is-error", isError);
    statusElement.innerHTML = team
      ? `<span><strong>${formatTeam(team)}</strong><small>Dieses Gerät gehört fest zu diesem Team.</small></span><b>${balance}</b>`
      : `<span><strong>Team-Anmeldung</strong><small>${message || "Klasse einmal auswählen."}</small></span>`;
  }

  async function register(team) {
    return jsonp("session", {
      code: getToken(),
      klasse: team
    });
  }

  function lockTeam(team, select) {
    localStorage.setItem(TEAM_KEY, team);
    localStorage.setItem(LOCK_KEY, "1");
    if (select) {
      select.value = team;
      select.disabled = true;
      select.setAttribute("aria-label", `Fest angemeldet: ${formatTeam(team)}`);
    }
  }

  function buildGate(select) {
    document.querySelector(".team-session-gate")?.remove();

    const gate = document.createElement("div");
    gate.className = "team-session-gate";
    gate.innerHTML = `
      <section class="team-session-dialog" role="dialog" aria-modal="true" aria-labelledby="teamDialogTitle">
        <p class="team-session-kicker">ABV Team-Anmeldung</p>
        <h2 id="teamDialogTitle">Wähle deine Klasse</h2>
        <p>Dieses Gerät wird danach fest dieser Klasse zugeordnet. Alle aus derselben Klasse sehen denselben Chipstand.</p>
        <label for="teamGateSelect">Dein Team</label>
        <select id="teamGateSelect">
          <option value="">Klasse auswählen</option>
          ${TEAMS.map(team => `<option value="${team}">${formatTeam(team)}</option>`).join("")}
        </select>
        <button type="button" class="team-session-confirm" disabled>Für dieses Team spielen</button>
        <p class="team-session-feedback" aria-live="polite"></p>
      </section>
    `;

    const gateSelect = gate.querySelector("#teamGateSelect");
    const confirmButton = gate.querySelector(".team-session-confirm");
    const feedback = gate.querySelector(".team-session-feedback");

    gateSelect.addEventListener("change", () => {
      confirmButton.disabled = !TEAMS.includes(gateSelect.value);
      feedback.textContent = "";
    });

    confirmButton.addEventListener("click", async () => {
      const team = gateSelect.value;
      if (!TEAMS.includes(team)) return;

      gateSelect.disabled = true;
      confirmButton.disabled = true;
      feedback.textContent = "Team wird verbunden ...";

      try {
        const data = await register(team);
        lockTeam(data.session.klasse, select);
        currentBalance = Number(data.session.chips || 0);
        renderStatus();
        gate.remove();
        document.body.classList.remove("team-session-open");
        window.dispatchEvent(new CustomEvent("abiVegasTeamReady", {
          detail: { klasse: data.session.klasse, chips: currentBalance }
        }));
      } catch (error) {
        gateSelect.disabled = false;
        confirmButton.disabled = false;
        feedback.textContent = error.message;
      }
    });

    document.body.classList.add("team-session-open");
    document.body.appendChild(gate);
    gateSelect.focus();
  }

  async function bindPage() {
    const select = document.querySelector("#classSelect");
    ensureStatus(select);

    const savedTeam = getTeam();
    if (!savedTeam) {
      if (select) {
        select.value = "";
        select.disabled = true;
      }
      renderStatus("Klasse einmal auswählen.");
      buildGate(select);
      return;
    }

    if (select) lockTeam(savedTeam, select);
    renderStatus();

    try {
      const data = await register(savedTeam);
      const registeredTeam = String(data.session.klasse);
      lockTeam(registeredTeam, select);
      currentBalance = Number(data.session.chips || 0);
      renderStatus();
    } catch (error) {
      renderStatus(error.message, true);
    }
  }

  async function addPoints(points, game) {
    const team = getTeam();
    if (!team) throw new Error("Bitte zuerst eine Klasse auswählen.");

    const data = await jsonp("add", {
      code: getToken(),
      klasse: team,
      points,
      game,
      eventId: createEventId(game)
    });

    currentBalance = Number(data.total || 0);
    renderStatus();
    return data;
  }

  async function refresh() {
    const team = getTeam();
    if (!team) return null;
    const data = await register(team);
    currentBalance = Number(data.session.chips || 0);
    renderStatus();
    return data.session;
  }

  window.AbiVegasTeam = {
    addPoints,
    createEventId,
    formatTeam,
    getTeam,
    getToken,
    refresh
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindPage, { once: true });
  } else {
    bindPage();
  }
})();
