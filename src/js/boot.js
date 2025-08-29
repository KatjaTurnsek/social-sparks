// Imports global CSS once for every page that imports boot.js
import "../css/main.css";

let loaderEl = null;

function createLoader() {
  const wrap = document.createElement("div");
  wrap.id = "global-loader";
  wrap.style.position = "fixed";
  wrap.style.inset = "0";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.background = "var(--color-bg)";
  wrap.style.zIndex = "9999";

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.setAttribute("role", "status");
  spinner.setAttribute("aria-label", "Loading");
  wrap.appendChild(spinner);

  return wrap;
}

export function showLoader() {
  if (!loaderEl) loaderEl = createLoader();
  if (!document.body.contains(loaderEl)) document.body.appendChild(loaderEl);
}

export function hideLoader() {
  if (loaderEl && document.body.contains(loaderEl)) {
    document.body.removeChild(loaderEl);
  }
}
