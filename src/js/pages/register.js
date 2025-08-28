import { showLoader, hideLoader } from "../boot.js";
import { setStatus } from "../components.js";

const form = document.getElementById("register-form");
const msg = document.getElementById("register-msg");
const submitBtn = document.getElementById("submitBtn");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setInvalid(input, invalid) {
  if (!input) return;
  input.classList.toggle("is-invalid", Boolean(invalid));
}

function getEl(id) {
  return document.getElementById(id);
}

if (form && msg && submitBtn) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = getEl("name");
    const email = getEl("email");
    const password = getEl("password");
    const confirm = getEl("confirm");

    // reset states
    setInvalid(name, false);
    setInvalid(email, false);
    setInvalid(password, false);
    setInvalid(confirm, false);
    setStatus(msg, "", null);
    msg.style.display = "none";

    // basic validation
    if (!name || !name.value || name.value.trim() === "") {
      setInvalid(name, true);
      if (name && typeof name.focus === "function") name.focus();
      setStatus(msg, "Please enter your name.", "error");
      return;
    }

    if (!email || !email.value || email.value.trim() === "") {
      setInvalid(email, true);
      if (email && typeof email.focus === "function") email.focus();
      setStatus(msg, "Please enter your email.", "error");
      return;
    }

    // simple email check (kept minimal)
    if (!/^\S+@\S+\.\S+$/.test(email.value)) {
      setInvalid(email, true);
      if (email && typeof email.focus === "function") email.focus();
      setStatus(msg, "Please enter a valid email address.", "error");
      return;
    }

    if (!password || !password.value || password.value.length < 8) {
      setInvalid(password, true);
      if (password && typeof password.focus === "function") password.focus();
      setStatus(msg, "Password must be at least 8 characters.", "error");
      return;
    }

    if (!confirm || !confirm.value || confirm.value !== password.value) {
      setInvalid(confirm, true);
      if (confirm && typeof confirm.focus === "function") confirm.focus();
      setStatus(msg, "Passwords do not match.", "error");
      return;
    }

    try {
      showLoader();
      submitBtn.disabled = true;
      setStatus(msg, "Registering…", null);

      // TODO: replace with real API call to POST /auth/register
      await wait(1000);

      // success
      setStatus(msg, "Account created! You can now log in.", "success");
      // Optional redirect after a short delay:
      // setTimeout(() => (location.href = `${import.meta.env.BASE_URL}login.html`), 800);
    } catch (err) {
      let message = "Registration failed.";
      if (err && typeof err === "object" && err !== null && "message" in err) {
        const maybe = /** @type {{ message?: unknown }} */ (err).message;
        if (typeof maybe === "string") message = maybe;
      }
      setStatus(msg, message, "error");
    } finally {
      submitBtn.disabled = false;
      hideLoader();
    }
  });
}
