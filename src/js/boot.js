// @ts-check

let loaderEl = /** @type {HTMLElement|null} */ (null);

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

export function showLoader() {
  if (!loaderEl) loaderEl = createLoader();
  if (!document.body.contains(loaderEl)) document.body.appendChild(loaderEl);
}

export function hideLoader() {
  if (loaderEl && document.body.contains(loaderEl)) {
    document.body.removeChild(loaderEl);
  }
}

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
    }[String(type)] || "#111827";
  const baseStyle = {
    pointerEvents: "auto",
    color: "#fff",
    borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem",
    fontSize: "0.95rem",
    boxShadow: "0 10px 34px rgba(0,0,0,0.18)",
    opacity: "0",
    transform: "translateY(6px)",
    transition: "opacity .18s ease, transform .18s ease",
  };
  Object.assign(el.style, { ...baseStyle, background: bg });
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

function hasToken() {
  try {
    const t = localStorage.getItem("accessToken");
    return !!(t && String(t).trim());
  } catch (err) {
    console.warn("Unable to read accessToken from localStorage:", err);
    return false;
  }
}

export function setupNavAuthState() {
  const navList = /** @type {HTMLElement|null} */ (
    document.querySelector(".nav .nav-links")
  );
  if (!navList) return;

  const loggedIn = hasToken();

  removeNavLink(navList, 'a[data-role="logout"]');

  if (loggedIn) {
    removeNavLink(navList, 'a[href$="login.html"]');
    removeNavLink(navList, 'a[href$="register.html"]');

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
        setFlash("You have been logged out.", "info", 2200);
        setupNavAuthState();
        window.location.href = "index.html";
      }
    };
  } else {
    ensureNavLink(navList, "login.html", "Login");
    ensureNavLink(navList, "register.html", "Register");
    removeNavLink(navList, 'a[data-role="logout"]');
  }
}

function boot() {
  setupNavAuthState();
  maybeShowFlashOnLoad();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
