// @ts-check
import { BASE_API_URL } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

/** @type {HTMLFormElement|null} */
const registerForm = document.querySelector("#register-form");
const AUTH_REGISTER_URL = BASE_API_URL + "/auth/register";

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
      if ("prevText" in submitBtn.dataset) {
        submitBtn.textContent = submitBtn.dataset.prevText || "Create account";
        delete submitBtn.dataset.prevText;
      }
    }
  }
}

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

    if (!response.ok) {
      throw new Error(errorFrom(json, "Registration failed"));
    }

    return json;
  } finally {
    hideLoader();
  }
}

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

  const payload = { email, password, ...(name && { name }) };

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
