(function () {
  "use strict";

  const START_TOKENS = 100;
  const CLASS_KEY = "abiVegasLockedClass";
  const TOKEN_KEY = "abiVegasDeviceTokens";
  const CODE_KEY = "abiVegasPlayerCode";
  const READY_EVENT = "abivegas:registered";
  const WALLET_EVENT = "abivegas:wallet-change";
  const classSelects = new Set();

  function playerCode() {
    let code = localStorage.getItem(CODE_KEY);
    if (!code) {
      const random = window.crypto && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint32Array(2)), value => value.toString(36)).join("")
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      code = `device-${random}`;
      localStorage.setItem(CODE_KEY, code);
    }
    return code;
  }

  function lockedClass() {
    return localStorage.getItem(CLASS_KEY) || "";
  }

  function tokens() {
    if (!lockedClass()) return 0;
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored === null) {
      localStorage.setItem(TOKEN_KEY, String(START_TOKENS));
      return START_TOKENS;
    }
    return Math.max(0, Number(stored) || 0);
  }

  function syncClassSelects() {
    const current = lockedClass();
    classSelects.forEach((select) => {
      if (current) select.value = current;
      select.disabled = Boolean(current);
      select.setAttribute("aria-label", current ? "Festgelegte Klasse" : "Klasse auswählen");
    });
  }

  function renderStatus() {
    let bar = document.querySelector("#deviceWalletBar");
    if (!bar) {
      bar = document.createElement("section");
      bar.id = "deviceWalletBar";
      bar.className = "device-wallet-bar";
      const main = document.querySelector("main");
      const anchor = main && (main.querySelector(".hero, .hero-panel") || main.firstElementChild);
      if (anchor) anchor.insertAdjacentElement("afterend", bar);
      else document.body.prepend(bar);
    }

    const currentClass = lockedClass();
    bar.innerHTML = currentClass
      ? `<span><small>Fest angemeldet</small><strong>${currentClass === "Lehrer" ? "Lehrer" : `${currentClass}. Klasse`}</strong></span><span><small>Spiel-Tokens</small><strong>${tokens()} / ${START_TOKENS}</strong></span>`
      : `<span><small>Anmeldung</small><strong>Klasse noch nicht festgelegt</strong></span><span><small>Startguthaben</small><strong>${START_TOKENS} Tokens</strong></span>`;
  }

  function showRegistration(classes, formatClassName) {
    if (lockedClass() || document.querySelector("#deviceRegistration")) return;

    const overlay = document.createElement("div");
    overlay.id = "deviceRegistration";
    overlay.className = "device-registration";
    overlay.innerHTML = `
      <section class="device-registration-dialog" role="dialog" aria-modal="true" aria-labelledby="deviceRegistrationTitle">
        <p class="device-registration-kicker">Ein Gerät, eine Klasse</p>
        <h2 id="deviceRegistrationTitle">Für welche Klasse spielst du?</h2>
        <p>Die Auswahl wird auf diesem Gerät fest gespeichert und kann danach nicht mehr geändert werden.</p>
        <label for="deviceClassChoice">Klasse auswählen</label>
        <select id="deviceClassChoice">
          <option value="">Bitte auswählen</option>
          ${classes.map(value => `<option value="${value}">${formatClassName(value)}</option>`).join("")}
        </select>
        <button id="confirmDeviceClass" type="button" disabled>Klasse festlegen</button>
        <small>Du erhältst einmalig ${START_TOKENS} Spiel-Tokens.</small>
      </section>`;
    document.body.appendChild(overlay);

    const choice = overlay.querySelector("#deviceClassChoice");
    const confirm = overlay.querySelector("#confirmDeviceClass");
    choice.addEventListener("change", () => { confirm.disabled = !classes.includes(choice.value); });
    confirm.addEventListener("click", () => {
      if (!classes.includes(choice.value)) return;
      localStorage.setItem(CLASS_KEY, choice.value);
      localStorage.setItem("abiVegasClass", choice.value);
      if (localStorage.getItem(TOKEN_KEY) === null) localStorage.setItem(TOKEN_KEY, String(START_TOKENS));
      playerCode();
      syncClassSelects();
      renderStatus();
      overlay.remove();
      window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: { klasse: choice.value, tokens: tokens() } }));
      window.dispatchEvent(new CustomEvent(WALLET_EVENT, { detail: { tokens: tokens() } }));
    });
  }

  function initClassSelect(select, classes, formatClassName) {
    select.innerHTML = classes.map(value => `<option value="${value}">${formatClassName(value)}</option>`).join("");
    classSelects.add(select);
    syncClassSelects();
    renderStatus();
    if (!lockedClass()) showRegistration(classes, formatClassName);
    return Boolean(lockedClass());
  }

  function spend(amount) {
    const cost = Math.max(0, Math.floor(Number(amount) || 0));
    if (!lockedClass()) return { ok: false, reason: "register", tokens: 0 };
    const current = tokens();
    if (current < cost) return { ok: false, reason: "tokens", tokens: current };
    const remaining = current - cost;
    localStorage.setItem(TOKEN_KEY, String(remaining));
    renderStatus();
    window.dispatchEvent(new CustomEvent(WALLET_EVENT, { detail: { tokens: remaining } }));
    return { ok: true, tokens: remaining };
  }

  window.AbiVegasDevice = {
    START_TOKENS,
    initClassSelect,
    isRegistered: () => Boolean(lockedClass()),
    lockedClass,
    tokens,
    canAfford: amount => Boolean(lockedClass()) && tokens() >= Number(amount),
    spend,
    playerCode,
    onReady(callback) {
      if (lockedClass()) callback({ klasse: lockedClass(), tokens: tokens() });
      else window.addEventListener(READY_EVENT, event => callback(event.detail), { once: true });
    },
    onWalletChange(callback) {
      window.addEventListener(WALLET_EVENT, event => callback(event.detail));
    }
  };
})();

