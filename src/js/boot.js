import "../css/main.css";

let loaderEl = null;

function createLoader() {
  const wrapper = document.createElement("div");
  wrapper.id = "global-loader";
  wrapper.setAttribute("aria-live", "polite");

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.setAttribute("role", "status");
  spinner.setAttribute("aria-label", "Loading");

  wrapper.appendChild(spinner);
  return wrapper;
}

export function showLoader() {
  if (!loaderEl) loaderEl = createLoader();
  if (!document.body.contains(loaderEl)) document.body.prepend(loaderEl);
}

export function hideLoader() {
  if (loaderEl && document.body.contains(loaderEl)) {
    loaderEl.remove();
  }
}
