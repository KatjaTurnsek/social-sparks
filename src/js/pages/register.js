// @ts-check
import { BASE_API_URL } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

/**
 * Payload accepted by the register endpoint.
 * @typedef {Object} RegisterPayload
 * @property {string} email
 * @property {string} password
 * @property {string} [name]
 */

/** @type {HTMLFormElement|null} */
const registerForm = document.querySelector("#register-form");

/** Register API endpoint. */
const AUTH_REGISTER_URL = `${BASE_API_URL}/auth/register`;

/**
 * Show an inline message (falls back to alert for errors if container missing).
 * @param {string} text
 * @param {"success"|"error"} [type="error"]
 * @returns {void}
 */
function setMsg(text, type = "error") {
  const kind = type === "success" ? "success" : "error";
  const el = document.getElementById("register-msg");
  if (el) {
    el.style.display = "block";
    el.className = `form-message alert ${kind}`;
    el.textContent = text;
    return;
  }
  if (kind === "error") alert(text);
}

/**
 * Toggle form disabled state and update submit button label.
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

  const submitBtn = /** @type {HTMLButtonElement|null} */ (
    form.querySelector('button[type="submit"]')
  );
  if (submitBtn) {
    if (submitting) {
      submitBtn.dataset.prevText = submitBtn.textContent || "";
      submitBtn.textContent = "Creating…";
    } else {
      submitBtn.textContent = submitBtn.dataset.prevText || "Create account";
      delete submitBtn.dataset.prevText;
    }
  }
}

/**
 * Basic client-side validation. Returns an error message or empty string if valid.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {string}
 */
function validateRegisterForm(email, password, name) {
  if (!email || !email.includes("@"))
    return "Please enter a valid email address.";
  if (!password || password.length < 8)
    return "Password must be at least 8 characters.";
  if (!name || name.trim().length < 2) return "Please enter your name.";
  return "";
}

/**
 * Call the register endpoint and return the parsed JSON on success.
 * @param {RegisterPayload} userDetails
 * @returns {Promise<any>}
 * @throws {Error} When the server responds with a non-OK status.
 */
async function registerUser(userDetails) {
  showLoader();
  try {
    const response = await fetch(AUTH_REGISTER_URL, {
      method: "POST",
      body: JSON.stringify(userDetails),
      headers: { "Content-Type": "application/json" },
    });

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) throw new Error(errorFrom(json, "Registration failed"));
    return json;
  } finally {
    hideLoader();
  }
}

/**
 * Submit handler: validate inputs, call API, redirect to login with a notice.
 * @param {SubmitEvent} event
 * @returns {void}
 */
function onRegisterFormSubmit(event) {
  event.preventDefault();
  const form = /** @type {HTMLFormElement} */ (event.target);
  const fd = new FormData(form);

  const email = String(fd.get("email") || "");
  const password = String(fd.get("password") || "");
  const name = String(fd.get("name") || "");

  const validationError = validateRegisterForm(email, password, name);
  if (validationError) {
    setMsg(validationError, "error");
    return;
  }

  const payload = { email, password, ...(name && { name }) };

  setFormSubmitting(form, true);
  registerUser(payload)
    .then(() => {
      const notice = encodeURIComponent("Account created! You can now log in.");
      window.location.href = `login.html?registered=1&notice=${notice}`;
    })
    .catch((err) => {
      setMsg((err && err.message) || "Could not register.", "error");
    })
    .finally(() => {
      setFormSubmitting(form, false);
    });
}

if (registerForm) {
  registerForm.addEventListener("submit", onRegisterFormSubmit);
}
