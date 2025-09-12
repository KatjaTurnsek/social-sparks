// @ts-check
import { BASE_API_URL, addToLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

const AUTH_LOGIN_URL = `${BASE_API_URL}/auth/login`;
/** @type {HTMLFormElement|null} */
const loginForm = /** @type {any} */ (document.getElementById("login-form"));

/** A minimal payload for the login endpoint. */
/** @typedef {{ email: string, password: string }} LoginDetails */

/**
 * Show (or fallback-alert) a status message in the login page.
 * @param {string} text
 * @param {"success"|"error"} [type="error"]
 * @returns {void}
 */
function setMsg(text, type = "error") {
  const el = document.getElementById("login-msg");
  if (el) {
    el.style.display = "block";
    el.className = `form-message alert ${type === "success" ? "success" : "error"}`;
    el.textContent = text;
    return;
  }
  if (type === "error") alert(text);
}

/**
 * Toggle form submitting state: disables controls and swaps the submit label.
 * @param {HTMLFormElement} form
 * @param {boolean} submitting
 * @returns {void}
 */
function setFormSubmitting(form, submitting) {
  form.setAttribute("aria-busy", String(submitting));

  const controls = [
    ...form.querySelectorAll("input, select, textarea, button"),
  ];
  controls.forEach((el) => {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLButtonElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      el.disabled = submitting;
    }
  });

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn instanceof HTMLButtonElement) {
    if (submitting) {
      submitBtn.setAttribute("data-prev-text", submitBtn.textContent || "");
      submitBtn.textContent = "Signing in…";
    } else {
      const prev = submitBtn.getAttribute("data-prev-text") || "Sign in";
      submitBtn.textContent = prev;
      submitBtn.removeAttribute("data-prev-text");
    }
  }
}

/**
 * POST credentials to the API, store the access token (and name), and return the JSON.
 * @param {LoginDetails} userDetails
 * @returns {Promise<any>}
 * @throws {Error} When the response is non-OK or missing a token
 */
async function loginUser(userDetails) {
  showLoader();
  try {
    const response = await fetch(AUTH_LOGIN_URL, {
      method: "POST",
      body: JSON.stringify(userDetails),
      headers: { "Content-Type": "application/json" },
    });

    /** @type {any} */
    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(errorFrom(json, "Login failed"));
    }

    const merged = {
      ...(json || {}),
      ...(json && typeof json.data === "object" ? json.data : {}),
    };

    const accessToken =
      typeof merged.accessToken === "string" ? merged.accessToken : "";
    if (!accessToken) throw new Error("No access token returned.");
    addToLocalStorage("accessToken", accessToken);

    const name = typeof merged.name === "string" ? merged.name : "";
    if (name) addToLocalStorage("profileName", name);

    return json;
  } finally {
    hideLoader();
  }
}

/**
 * Handle the login form submit: validate, call API, route on success.
 * @param {SubmitEvent} event
 * @returns {void}
 */
function onLoginFormSubmit(event) {
  event.preventDefault();
  const form = /** @type {HTMLFormElement} */ (event.target);
  const fd = new FormData(form);
  const email = String(fd.get("email") || "");
  const password = String(fd.get("password") || "");

  if (!email || !email.includes("@")) {
    setMsg("Please enter a valid email address.", "error");
    return;
  }
  if (!password) {
    setMsg("Please enter your password.", "error");
    return;
  }

  setFormSubmitting(form, true);
  loginUser({ email, password })
    .then(() => {
      window.location.href = "feed.html";
    })
    .catch((err) => {
      setMsg((err && err.message) || "Login failed", "error");
    })
    .finally(() => {
      setFormSubmitting(form, false);
    });
}

/* Guard: if already authenticated, skip login page. */
(function guardAlreadyAuthenticated() {
  const token = localStorage.getItem("accessToken") || "";
  if (token) {
    window.location.replace("feed.html");
  }
})();

/* Optional success notice when redirected from register page. */
(function showRegisterNotice() {
  const params = new URLSearchParams(location.search);
  const notice = params.get("notice");
  if (notice) setMsg(notice, "success");
})();

if (loginForm) {
  loginForm.addEventListener("submit", onLoginFormSubmit);
}
