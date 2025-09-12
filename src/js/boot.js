// @ts-check

/** @typedef {'success'|'error'|'info'|'default'} ToastType */
/** @typedef {{ type?: ToastType, duration?: number }} ToastOptions */

let loaderEl = /** @type {HTMLElement|null} */ (null);

/**
 * Create the full-page loading overlay element.
 * @returns {HTMLElement}
 */
function createLoader() {
  const wrap = document.createElement("div");
  wrap.id = "global-loader";
  Object.assign(wrap.style, {
    position: "fixed",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-bg)",
    zIndex: "9999",
  });

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.setAttribute("role", "status");
  spinner.setAttribute("aria-label", "Loading");
  wrap.appendChild(spinner);

  return wrap;
}

/** Show the full-page loader overlay. */
export function showLoader() {
  if (!loaderEl) loaderEl = createLoader();
  if (!document.body.contains(loaderEl)) document.body.appendChild(loaderEl);
}

/** Hide the full-page loader overlay. */
export function hideLoader() {
  if (loaderEl && document.body.contains(loaderEl)) {
    document.body.removeChild(loaderEl);
  }
}

/**
 * Ensure there is a toast viewport attached to the document.
 * @returns {HTMLElement} The viewport element.
 */
function ensureToastViewport() {
  let host = /** @type {HTMLElement|null} */ (
    document.getElementById("toast-viewport")
  );
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-viewport";
    host.setAttribute("aria-live", "polite");
    Object.assign(host.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "1rem",
      display: "grid",
      placeItems: "center",
      gap: "0.5rem",
      zIndex: "10000",
      pointerEvents: "none",
    });
    document.body.appendChild(host);
  }
  return host;
}

/**
 * Show a toast message.
 * Click to dismiss early; otherwise auto-hides after `duration` ms.
 * @param {string} message
 * @param {ToastOptions} [opts]
 * @returns {void}
 */
export function showToast(message, opts = {}) {
  const { type, duration } = { type: "default", duration: 2500, ...opts };
  const dur = Math.max(1200, Number(duration) || 2500);

  const host = ensureToastViewport();
  const el = document.createElement("div");
  el.className = "toast";

  const bg =
    {
      success: "#166534",
      error: "#991b1b",
      info: "#1e3a8a",
      default: "#111827",
    }[
      /** @type {Record<ToastType, string>} */
      /** @type {ToastType} */ (String(type))
    ] || "#111827";

  Object.assign(el.style, {
    pointerEvents: "auto",
    color: "#fff",
    borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem",
    fontSize: "0.95rem",
    boxShadow: "0 10px 34px rgba(0,0,0,0.18)",
    opacity: "0",
    transform: "translateY(6px)",
    transition: "opacity .18s ease, transform .18s ease",
    background: bg,
  });
  el.textContent = message;

  host.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });

  const close = () => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    window.setTimeout(() => el.remove(), 180);
  };

  const t = window.setTimeout(close, dur);
  el.addEventListener("click", () => {
    clearTimeout(t);
    close();
  });
}

const FLASH_KEY = "flash:message";

/**
 * Store a transient “flash” message in sessionStorage for display
 * on the next page load.
 * @param {string} message
 * @param {ToastType} [type="success"]
 * @param {number} [duration=2500]
 * @returns {void}
 */
export function setFlash(message, type = "success", duration = 2500) {
  try {
    sessionStorage.setItem(
      FLASH_KEY,
      JSON.stringify({ message, type, duration })
    );
  } catch (e) {
    console.warn("Could not set flash:", e);
  }
}

/**
 * If a flash message is present in sessionStorage, display it and clear it.
 * @returns {void}
 */
function maybeShowFlashOnLoad() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    const data = JSON.parse(raw);
    if (data && data.message) {
      showToast(String(data.message), {
        ...(data.type && { type: data.type }),
        ...(data.duration && { duration: data.duration }),
      });
    }
  } catch {
    // ignore parse/storage issues
  }
}

/**
 * Whether an auth token is present in localStorage.
 * @returns {boolean}
 */
function hasToken() {
  try {
    const t = localStorage.getItem("accessToken");
    return !!(t && String(t).trim());
  } catch {
    return false;
  }
}

/**
 * Get the current user's profile name from localStorage.
 * @returns {string}
 */
function getProfileName() {
  try {
    return localStorage.getItem("profileName")?.trim() || "";
  } catch {
    return "";
  }
}

/**
 * Create a list item with an anchor for the top nav.
 * @param {string} href
 * @param {string} text
 * @param {Record<string, string>} [attrs]
 * @returns {HTMLLIElement}
 */
function makeNavItem(href, text, attrs = {}) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, String(v));
  li.appendChild(a);
  return li;
}

/**
 * Build the auth-aware nav (Login/Register ↔ My Profile/Logout).
 * Re-runs on storage changes.
 * @returns {void}
 */
export function setupNavAuthState() {
  const navList = /** @type {HTMLElement|null} */ (
    document.querySelector(".nav .nav-links")
  );
  if (!navList) return;

  navList.innerHTML = "";

  const loggedIn = hasToken();
  const name = getProfileName();

  // Always-visible links
  navList.appendChild(makeNavItem("feed.html", "Feed"));

  if (loggedIn && name) {
    navList.appendChild(
      makeNavItem(`profile.html?name=${encodeURIComponent(name)}`, "My Profile")
    );

    const logout = makeNavItem("#", "Logout", { "data-role": "logout" });
    const logoutLink = logout.querySelector("a");
    if (logoutLink) {
      logoutLink.addEventListener("click", (ev) => {
        ev.preventDefault();
        try {
          ["accessToken", "profileName", "profileEmail"].forEach((k) =>
            localStorage.removeItem(k)
          );
        } catch (err) {
          console.warn("Failed to clear auth storage:", err);
        } finally {
          setFlash("You have been logged out.", "info", 2200);
          setupNavAuthState();
          window.location.href = "index.html";
        }
      });
    }

    navList.appendChild(logout);
  } else {
    navList.appendChild(makeNavItem("login.html", "Login"));
    navList.appendChild(makeNavItem("register.html", "Register"));
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === "accessToken" || e.key === "profileName") {
    setupNavAuthState();
  }
});

/**
 * App bootstrap: build auth nav and show any queued flash message.
 * @returns {void}
 */
function boot() {
  setupNavAuthState();
  maybeShowFlashOnLoad();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
