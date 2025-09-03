// @ts-check
import { BASE_API_URL, addToLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

const loginForm = document.getElementById("login-form");
const AUTH_LOGIN_URL = BASE_API_URL + "/auth/login";

/**
 * Show an inline message if #login-msg exists; otherwise fallback to alert for errors.
 * @param {string} text
 * @param {"error"|"success"} [type="error"]
 * @returns {void}
 */
function setMsg(text, type = "error") {
  const el = document.getElementById("login-msg");
  if (el) {
    el.style.display = "block";
    el.className = "form-message alert"; // reset base
    el.classList.toggle("success", type === "success");
    el.classList.toggle("error", type !== "success");
    el.textContent = text;
    return;
  }
  if (type === "error") alert(text);
}

/**
 * Toggle a form's submitting state: disable controls and set aria-busy.
 * Also swaps the submit button label while submitting.
 * @param {HTMLFormElement} form
 * @param {boolean} submitting
 * @returns {void}
 */
function setFormSubmitting(form, submitting) {
  form.setAttribute("aria-busy", String(submitting));

  const controls = form.querySelectorAll("input, select, textarea, button");
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
 * Login with email/password against Noroff Auth.
 * - Sends JSON to POST /auth/login
 * - Normalizes server errors
 * - Returns parsed JSON on success
 * @param {{ email: string, password: string }} userDetails
 * @returns {Promise<any>} Resolves with API response JSON; throws on non-OK.
 * @throws {Error} When the server responds non-OK or token is missing.
 */
async function loginUser(userDetails) {
  showLoader();
  try {
    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(userDetails),
      headers: { "Content-Type": "application/json" },
    };

    const response = await fetch(AUTH_LOGIN_URL, fetchOptions);

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(errorFrom(json, "Login failed"));
    }

    // Extract token (supports {data:{accessToken}} or {accessToken})
    let accessToken = "";
    if (json && typeof json === "object") {
      if (json.data && typeof json.data.accessToken === "string") {
        accessToken = json.data.accessToken;
      } else if (typeof json.accessToken === "string") {
        accessToken = json.accessToken;
      }
    }
    if (!accessToken) throw new Error("No access token returned.");

    addToLocalStorage("accessToken", accessToken);

    // Optional: save profile name for convenience (supports {data:{name}} or {name})
    let name = "";
    if (json && typeof json === "object") {
      if (json.data && typeof json.data.name === "string") {
        name = json.data.name;
      } else if (typeof json.name === "string") {
        name = json.name;
      }
    }
    if (name) addToLocalStorage("profileName", name);

    return json;
  } finally {
    hideLoader();
  }
}

/**
 * Form submit handler: disables UI, calls login, redirects on success.
 * @param {SubmitEvent} event
 */
function onLoginFormSubmit(event) {
  event.preventDefault();
  const form = /** @type {HTMLFormElement} */ (event.target);
  const fd = new FormData(form);
  const email = String(fd.get("email") || "");
  const password = String(fd.get("password") || "");

  // Simple client-side validation for clearer errors before hitting the API
  if (!email || email.indexOf("@") === -1) {
    setMsg("Please enter a valid email address.", "error");
    return;
  }
  if (!password) {
    setMsg("Please enter your password.", "error");
    return;
  }

  setFormSubmitting(form, true);
  loginUser({ email, password })
    .then(function () {
      window.location.href = "feed.html";
    })
    .catch(function (err) {
      setMsg((err && err.message) || "Login failed", "error");
    })
    .finally(function () {
      setFormSubmitting(form, false);
    });
}

// --- Tiny guards / notices for the login page itself ------------------------

// If we arrived here already authenticated, send straight to Feed.
(function guardAlreadyAuthenticated() {
  const token = localStorage.getItem("accessToken") || "";
  if (token) {
    window.location.replace("feed.html");
  }
})();

// If we were redirected from Register, show the success notice (?notice=...)
(function showRegisterNotice() {
  const params = new URLSearchParams(location.search);
  const notice = params.get("notice");
  if (notice) {
    setMsg(notice, "success");
  }
})();

// Wire up the form
if (loginForm) {
  loginForm.addEventListener("submit", onLoginFormSubmit);
}
