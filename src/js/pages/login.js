import "../../css/main.css";
import { showLoader, hideLoader } from "../boot.js";

const app = document.getElementById("app");
if (app) {
  app.innerHTML = `<p class="muted">Please log in to continue.</p>`;
}

const form = document.getElementById("login-form");
const msg = document.getElementById("login-msg");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.style.display = "block";
    msg.textContent = "Logging in…";

    try {
      showLoader();

      // TODO: replace this with a real API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      msg.textContent = "Demo login successful";
    } catch (err) {
      msg.textContent = err instanceof Error ? err.message : "Login failed";
    } finally {
      hideLoader();
    }
  });
}
