import "../../css/main.css";
import { showLoader, hideLoader } from "../boot.js";

const form = document.getElementById("register-form");
const msg = document.getElementById("register-msg");

if (form && msg) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";
    const confirm = document.getElementById("confirm")?.value || "";

    msg.style.display = "block";
    msg.classList.remove("error", "success");

    // Basic client-side validation
    if (!name || !email || !password) {
      msg.classList.add("error");
      msg.textContent = "Please fill out all required fields.";
      return;
    }
    if (password !== confirm) {
      msg.classList.add("error");
      msg.textContent = "Passwords do not match.";
      return;
    }

    try {
      showLoader();
      msg.textContent = "Registering…";

      // TODO: replace with real API call to POST /auth/register
      await new Promise((r) => setTimeout(r, 1000));

      msg.classList.add("success");
      msg.textContent = "Demo: account created! You can now log in.";
      // Optionally redirect after a short delay:
      // setTimeout(() => (location.href = `${import.meta.env.BASE_URL}login.html`), 800);
    } catch (err) {
      msg.classList.add("error");
      msg.textContent =
        err instanceof Error ? err.message : "Registration failed.";
    } finally {
      hideLoader();
    }
  });
}
