import { showLoader, hideLoader } from "../boot.js";
import { setStatus } from "../components.js";
import { registerUser } from "../api/auth.js";

const form = document.getElementById("register-form");
const msg = document.getElementById("register-msg");

// find the submit button safely from the form (no need for an id)
const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setInvalid(input, invalid) {
  if (!input) return;
  input.classList.toggle("is-invalid", Boolean(invalid));
}

function focusIfPossible(el) {
  if (el && typeof el.focus === "function") el.focus();
}

if (form && msg) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmInput = document.getElementById("confirm");

    // reset states
    setInvalid(nameInput, false);
    setInvalid(emailInput, false);
    setInvalid(passwordInput, false);
    setInvalid(confirmInput, false);
    setStatus(msg, "", null);
    msg.style.display = "none";

    // safely read values
    const nameVal =
      nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
    const emailVal =
      emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
    const passwordVal =
      passwordInput instanceof HTMLInputElement ? passwordInput.value : "";
    const confirmVal =
      confirmInput instanceof HTMLInputElement ? confirmInput.value : "";

    // basic validation
    if (nameVal === "") {
      setInvalid(nameInput, true);
      focusIfPossible(nameInput);
      setStatus(msg, "Please enter your name.", "error");
      return;
    }

    if (emailVal === "") {
      setInvalid(emailInput, true);
      focusIfPossible(emailInput);
      setStatus(msg, "Please enter your email.", "error");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(emailVal)) {
      setInvalid(emailInput, true);
      focusIfPossible(emailInput);
      setStatus(msg, "Please enter a valid email address.", "error");
      return;
    }

    if (passwordVal.length < 8) {
      setInvalid(passwordInput, true);
      focusIfPossible(passwordInput);
      setStatus(msg, "Password must be at least 8 characters.", "error");
      return;
    }

    if (confirmVal !== passwordVal) {
      setInvalid(confirmInput, true);
      focusIfPossible(confirmInput);
      setStatus(msg, "Passwords do not match.", "error");
      return;
    }

    try {
      showLoader();
      if (submitBtn) submitBtn.disabled = true;
      setStatus(msg, "Registering…", null);

      // Real API call
      await registerUser({
        name: nameVal,
        email: emailVal,
        password: passwordVal,
      });

      // Optional pause for UX
      await wait(300);

      setStatus(msg, "Account created! You can now log in.", "success");
      // Optional redirect:
      // setTimeout(() => (location.href = `${import.meta.env.BASE_URL}login.html`), 700);
    } catch (err) {
      let message = "Registration failed.";
      if (err && typeof err === "object" && err !== null && "message" in err) {
        const maybe = /** @type {{ message?: unknown }} */ (err).message;
        if (typeof maybe === "string") message = maybe;
      }
      setStatus(msg, message, "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      hideLoader();
    }
  });
}
