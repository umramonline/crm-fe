(function () {
  var STORAGE_KEY = "lte-theme";
  var stored;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    stored = null;
  }

  var mode =
    stored === "light" || stored === "dark" || stored === "auto"
      ? stored
      : "auto";

  var resolved =
    mode === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;

  document.documentElement.setAttribute("data-bs-theme", resolved);
  document.documentElement.style.colorScheme = resolved;

  if (mode === "auto") {
    document.documentElement.setAttribute("data-lte-theme-resolved", "");
  }
})();
