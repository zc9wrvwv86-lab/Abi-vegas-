(() => {
  function replaceAbw() {
    document.querySelectorAll("text, .school-badge, strong").forEach((node) => {
      if (node.textContent && node.textContent.includes("ABW")) {
        node.textContent = node.textContent.replaceAll("ABW", "ABV");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", replaceAbw);
  } else {
    replaceAbw();
  }

  setTimeout(replaceAbw, 300);
})();
