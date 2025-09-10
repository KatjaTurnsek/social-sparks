// @ts-check

/* ==========================================================================
   Global loader
   ========================================================================== */

let loaderEl = /** @type {HTMLElement|null} */ (null);

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

/* ==========================================================================
   Toasts + Flash (cross-page)
   ========================================================================== */

/**
 * Ensure a toast viewport exists and return it.
 * @returns {HTMLElement}
 */
function ensureToastViewport() {
  let host = /** @type {HTMLElement|null} */ (
    document.getElementById("toast-viewport")
  );
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-viewport";
    host.setAttribute("aria-live", "polite");
    // minimal inline to avoid requiring CSS for layout
    host.style.position = "fixed";
    host.style.left = "0";
    host.style.right = "0";
    host.style.bottom = "1rem";
    host.style.display = "grid";
    host.style.placeItems = "center";
    host.style.gap = "0.5rem";
    host.style.zIndex = "10000";
    host.style.pointerEvents = "none";
    document.body.appendChild(host);
  }
  return host;
}

/**
 * Show a toast now.
 * @param {string} message
 * @param {{type?: 'success'|'error'|'info'|'default', duration?: number}} [opts]
 */
export function showToast(message, opts = {}) {
  const type = opts.type || "default";
  const duration = Math.max(1200, opts.duration || 2500);

  const host = ensureToastViewport();
  const el = document.createElement("div");
  el.className = "toast";
  // minimal inline styles so it works even without extra CSS
  el.style.pointerEvents = "auto";
  el.style.background =
    type === "success"
      ? "#166534"
      : type === "error"
        ? "#991b1b"
        : type === "info"
          ? "#1e3a8a"
          : "#111827";
  el.style.color = "#fff";
  el.style.borderRadius = "0.5rem";
  el.style.padding = "0.6rem 0.9rem";
  el.style.fontSize = "0.95rem";
  el.style.boxShadow = "0 10px 34px rgba(0,0,0,0.18)";
  el.style.opacity = "0";
  el.style.transform = "translateY(6px)";
  el.style.transition = "opacity .18s ease, transform .18s ease";
  el.textContent = message;

  host.appendChild(el);
  // animate in
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });

  const close = () => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    window.setTimeout(() => el.remove(), 180);
  };

  const t = window.setTimeout(close, duration);
  el.addEventListener("click", () => {
    clearTimeout(t);
    close();
  });
}

const FLASH_KEY = "flash:message";

/**
 * Set a flash message to show on next page load.
 * @param {string} message
 * @param {'success'|'error'|'info'|'default'} [type]
 * @param {number} [duration]
 */
export function setFlash(message, type = "success", duration = 2500) {
  try {
    sessionStorage.setItem(
      FLASH_KEY,
      JSON.stringify({ message, type, duration })
    );
  } catch (e) {
    // ignore storage errors
    console.warn("Could not set flash:", e);
  }
}

function maybeShowFlashOnLoad() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    const data = JSON.parse(raw);
    if (data && data.message) {
      showToast(String(data.message), {
        type: /** @type any */ (data.type) || "success",
        duration: Number(data.duration) || 2500,
      });
    }
  } catch {
    // ignore parse/storage issues
  }
}

/* ==========================================================================
   Nav auth state (Login/Register ⇄ Logout)
   ========================================================================== */

/**
 * Ensure a basic <li><a></a></li> link exists in the nav list.
 * Returns the anchor element (existing or newly created).
 * @param {HTMLElement} listEl
 * @param {string} href
 * @param {string} text
 * @param {Record<string,string>} [attrs]
 * @returns {HTMLAnchorElement}
 */
function ensureNavLink(listEl, href, text, attrs) {
  let a = /** @type {HTMLAnchorElement|null} */ (
    listEl.querySelector(`a[href$="${href}"]`)
  );
  if (!a) {
    const li = document.createElement("li");
    a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        a.setAttribute(k, v);
      }
    }
    li.appendChild(a);
    listEl.appendChild(li);
  } else {
    a.textContent = text;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        a.setAttribute(k, v);
      }
    }
  }
  return a;
}

/**
 * Remove a link (and its wrapping <li>) from the nav list if present.
 * @param {HTMLElement} listEl
 * @param {string} selector - CSS selector relative to the list (e.g. 'a[href$="login.html"]' or 'a[data-role="logout"]')
 */
function removeNavLink(listEl, selector) {
  const a = /** @type {HTMLAnchorElement|null} */ (
    listEl.querySelector(selector)
  );
  if (a && a.parentElement && a.parentElement.tagName === "LI") {
    a.parentElement.remove();
  } else if (a) {
    a.remove();
  }
}

/**
 * Detect whether we currently have a non-empty access token.
 * @returns {boolean}
 */
function hasToken() {
  try {
    const t = localStorage.getItem("accessToken");
    return !!(t && String(t).trim());
  } catch (err) {
    // If storage is blocked, assume logged-out
    console.warn("Unable to read accessToken from localStorage:", err);
    return false;
  }
}

/**
 * Replace "Login" + "Register" with a "Logout" link when logged in.
 * Restore "Login" + "Register" (and remove "Logout") when logged out.
 */
export function setupNavAuthState() {
  const navList = /** @type {HTMLElement|null} */ (
    document.querySelector(".nav .nav-links")
  );
  if (!navList) return;

  const loggedIn = hasToken();

  // Always remove any stale "logout" link before re-adding (prevents dupes)
  removeNavLink(navList, 'a[data-role="logout"]');

  if (loggedIn) {
    // Remove login/register if present
    removeNavLink(navList, 'a[href$="login.html"]');
    removeNavLink(navList, 'a[href$="register.html"]');

    // Add logout link at the end
    const a = ensureNavLink(navList, "#", "Logout", { "data-role": "logout" });
    a.onclick = (ev) => {
      ev.preventDefault();
      try {
        ["accessToken", "profileName", "profileEmail"].forEach((k) =>
          localStorage.removeItem(k)
        );
      } catch (err) {
        console.warn("Failed to clear auth storage:", err);
      } finally {
        // Set a flash so user sees a toast after navigation
        setFlash("You have been logged out.", "info", 2200);
        // Rebuild the nav to show Login/Register again, then send home
        setupNavAuthState();
        window.location.href = "index.html";
      }
    };
  } else {
    // Ensure login/register exist, and make sure any logout link is gone
    ensureNavLink(navList, "login.html", "Login");
    ensureNavLink(navList, "register.html", "Register");
    removeNavLink(navList, 'a[data-role="logout"]');
  }
}

/* Auto-run on load (works even if module loads after DOM is ready) */
function boot() {
  setupNavAuthState();
  maybeShowFlashOnLoad();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
