// @ts-check
import { BASE_API_URL } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

/** @type {HTMLFormElement|null} */
const registerForm = document.querySelector("#register-form");
const AUTH_REGISTER_URL = BASE_API_URL + "/auth/register";

/**
 * Show an inline message if #register-msg exists; fallback to alert for errors.
 * @param {string} text
 * @param {"error"|"success"} [type]
 * @returns {void}
 */
function setMsg(text, type) {
  const kind = type === "success" ? "success" : "error";
  const el = document.getElementById("register-msg");
  if (el) {
    el.style.display = "block";
    el.className = "form-message alert";
    el.classList.add(kind);
    el.textContent = text;
    return;
  }
  if (kind === "error") alert(text);
}

/**
 * Toggle submitting state: disables controls, sets aria-busy,
 * and swaps the submit button label while submitting.
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

  const submitBtn = /** @type {HTMLButtonElement|null} */ (
    form.querySelector('button[type="submit"]')
  );
  if (submitBtn) {
    if (submitting) {
      submitBtn.dataset.prevText = submitBtn.textContent || "";
      submitBtn.textContent = "Creating…";
    } else {
      if ("prevText" in submitBtn.dataset) {
        submitBtn.textContent = submitBtn.dataset.prevText || "Create account";
        delete submitBtn.dataset.prevText;
      }
    }
  }
}

/**
 * Basic client-side validation for the register form.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {string} Empty string if valid; otherwise a user-friendly error.
 */
function validateRegisterForm(email, password, name) {
  if (!email || email.indexOf("@") === -1) {
    return "Please enter a valid email address.";
  }
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!name || name.trim().length < 2) {
    return "Please enter your name.";
  }
  return "";
}

/**
 * POST /auth/register with user details; returns JSON or throws on non-OK.
 * @param {{ email: string, password: string, name?: string }} userDetails
 * @returns {Promise<any>}
 * @throws {Error} When the server responds non-OK (message normalized).
 */
async function registerUser(userDetails) {
  showLoader();
  try {
    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(userDetails),
      headers: { "Content-Type": "application/json" },
    };

    const response = await fetch(AUTH_REGISTER_URL, fetchOptions);

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(errorFrom(json, "Registration failed"));
    }

    return json;
  } finally {
    hideLoader();
  }
}

/**
 * Handle register form submit: validate, disable UI, call API, redirect on success.
 * @param {SubmitEvent} event
 * @returns {void}
 */
function onRegisterFormSubmit(event) {
  event.preventDefault();
  const form = /** @type {HTMLFormElement} */ (event.target);
  const fd = new FormData(form);

  const email = String(fd.get("email") || "");
  const password = String(fd.get("password") || "");
  const nameRaw = fd.get("name");
  const name = nameRaw ? String(nameRaw) : "";

  const validationError = validateRegisterForm(email, password, name);
  if (validationError) {
    setMsg(validationError, "error");
    return;
  }

  /** @type {{ email: string, password: string, name?: string }} */
  const payload = name ? { email, password, name } : { email, password };

  setFormSubmitting(form, true);
  registerUser(payload)
    .then(function () {
      const notice = encodeURIComponent("Account created! You can now log in.");
      window.location.href = "login.html?registered=1&notice=" + notice;
    })
    .catch(function (err) {
      setMsg((err && err.message) || "Could not register.", "error");
    })
    .finally(function () {
      setFormSubmitting(form, false);
    });
}

if (registerForm) {
  registerForm.addEventListener("submit", onRegisterFormSubmit);
}
