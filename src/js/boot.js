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
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      try {
        ["accessToken", "profileName", "profileEmail"].forEach((k) =>
          localStorage.removeItem(k)
        );
      } catch (err) {
        console.warn("Failed to clear auth storage:", err);
      } finally {
        // Rebuild the nav to show Login/Register again, then send home
        setupNavAuthState();
        window.location.href = "index.html";
      }
    });
  } else {
    // Ensure login/register exist, and make sure any logout link is gone
    ensureNavLink(navList, "login.html", "Login");
    ensureNavLink(navList, "register.html", "Register");
    removeNavLink(navList, 'a[data-role="logout"]');
  }
}

/* Auto-run on load (works even if module loads after DOM is ready) */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupNavAuthState, {
    once: true,
  });
} else {
  setupNavAuthState();
}
