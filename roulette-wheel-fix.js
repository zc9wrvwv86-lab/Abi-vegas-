(() => {
  const ROULETTE_ORDER = [
    "0", "32", "15", "19", "4", "21", "2", "25", "17", "34", "6", "27", "13", "36", "11", "30", "8", "23", "10",
    "5", "24", "16", "33", "1", "20", "14", "31", "9", "22", "18", "29", "7", "28", "12", "35", "3", "26"
  ];
  const RED_NUMBERS = new Set(["1", "3", "5", "7", "9", "12", "14", "16", "18", "19", "21", "23", "25", "27", "30", "32", "34", "36"]);

  function buildNumberedWheel() {
    const wheel = document.querySelector("#abiRouletteWheel");
    if (!wheel || wheel.dataset.numberedWheel === "true") return;

    wheel.dataset.numberedWheel = "true";
    wheel.innerHTML = `
      <div class="numbered-wheel-inner"></div>
      <div class="numbered-wheel-spokes"></div>
      <div class="numbered-wheel-ring">
        ${ROULETTE_ORDER.map((number, index) => {
          const color = number === "0" ? "green" : RED_NUMBERS.has(number) ? "red" : "black";
          return `<span class="wheel-number ${color}" style="--i:${index}; --total:${ROULETTE_ORDER.length}">${number}</span>`;
        }).join("")}
      </div>
      <span class="numbered-wheel-center">ABW</span>
    `;
  }

  function injectWheelStyles() {
    if (document.querySelector("#numberedWheelStyles")) return;
    const style = document.createElement("style");
    style.id = "numberedWheelStyles";
    style.textContent = `
      .abi-roulette-wheel {
        position: relative !important;
        overflow: hidden !important;
        width: min(250px, 62vw) !important;
        height: min(250px, 62vw) !important;
        border: 3px solid #2f9fd8 !important;
        background: #f8f6f0 !important;
        box-shadow: 0 0 34px rgba(47, 159, 216, 0.32), 0 0 42px rgba(255, 211, 106, 0.28) !important;
        transition: transform 2.25s cubic-bezier(.12, .82, .16, 1) !important;
        transform-origin: center center !important;
      }

      .numbered-wheel-inner {
        position: absolute;
        inset: 19%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(47, 159, 216, 0.72) 0 7%, #f8f6f0 8% 100%);
        z-index: 1;
      }

      .numbered-wheel-spokes {
        position: absolute;
        inset: 4%;
        border-radius: 50%;
        background: repeating-conic-gradient(from -4.86deg, rgba(47, 159, 216, 0.78) 0deg 1.15deg, transparent 1.15deg 9.73deg);
        -webkit-mask: radial-gradient(circle, transparent 0 18%, #000 18.5% 76%, transparent 76.5% 100%);
        mask: radial-gradient(circle, transparent 0 18%, #000 18.5% 76%, transparent 76.5% 100%);
        z-index: 2;
      }

      .numbered-wheel-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        z-index: 4;
      }

      .wheel-number {
        position: absolute;
        left: 50%;
        top: 50%;
        display: grid;
        place-items: center;
        width: 24px;
        height: 31px;
        margin-left: -12px;
        margin-top: -15.5px;
        border: 1px solid rgba(255, 255, 255, 0.38);
        color: #fff7dc;
        font-size: 0.72rem;
        font-weight: 950;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
        transform: rotate(calc(360deg / var(--total) * var(--i))) translateY(calc(min(250px, 62vw) * -0.43)) rotate(90deg);
      }

      .wheel-number.red { background: #c9283d; }
      .wheel-number.black { background: #11151b; }
      .wheel-number.green { background: #5aa85c; }

      .numbered-wheel-center {
        position: absolute !important;
        inset: 50% auto auto 50% !important;
        display: grid !important;
        place-items: center !important;
        width: 58px !important;
        height: 58px !important;
        margin: -29px !important;
        border-radius: 50% !important;
        color: #fff7dc !important;
        background: radial-gradient(circle, #2f9fd8, #0c5e9c) !important;
        font-size: 0.86rem !important;
        font-weight: 1000 !important;
        box-shadow: 0 0 18px rgba(47, 159, 216, 0.8) !important;
        z-index: 6 !important;
      }

      .roulette-pointer-main {
        z-index: 8 !important;
        color: #ffcf5f !important;
        text-shadow: 0 0 12px rgba(255, 211, 106, 0.9) !important;
      }

      .abi-roulette-wheel.is-wheel-spinning {
        animation: wheelBlurPulse 360ms ease-in-out infinite alternate;
      }

      @keyframes wheelBlurPulse {
        from { filter: drop-shadow(0 0 10px rgba(47, 159, 216, 0.5)) brightness(1); }
        to { filter: drop-shadow(0 0 24px rgba(255, 211, 106, 0.75)) brightness(1.1); }
      }

      @media (max-width: 620px) {
        .abi-roulette-wheel {
          width: min(218px, 70vw) !important;
          height: min(218px, 70vw) !important;
        }
        .wheel-number {
          width: 20px;
          height: 27px;
          margin-left: -10px;
          margin-top: -13.5px;
          font-size: 0.58rem;
          transform: rotate(calc(360deg / var(--total) * var(--i))) translateY(calc(min(218px, 70vw) * -0.43)) rotate(90deg);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function addSpinClassOnClick() {
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#rouletteSpinButton")) return;
      const wheel = document.querySelector("#abiRouletteWheel");
      if (!wheel) return;
      wheel.classList.add("is-wheel-spinning");
      setTimeout(() => wheel.classList.remove("is-wheel-spinning"), 2350);
    });
  }

  function start() {
    injectWheelStyles();
    buildNumberedWheel();
    addSpinClassOnClick();
    const observer = new MutationObserver(buildNumberedWheel);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
