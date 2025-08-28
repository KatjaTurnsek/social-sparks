import { showLoader, hideLoader } from "../boot.js";
import { setStatus } from "../components.js";

const app = document.getElementById("app");
if (app) {
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = "Please log in to continue.";
  app.replaceChildren(p);
}

const form = document.getElementById("login-form");
const msg = document.getElementById("login-msg");

if (form && msg) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    msg.style.display = "block";
    setStatus(msg, "Logging in…");

    try {
      showLoader();

      // TODO: replace this with a real API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStatus(msg, "Demo login successful", "success");
    } catch (err) {
      let text = "Login failed";
      if (err && typeof err === "object" && err !== null && "message" in err) {
        const m = /** @type {{message?: unknown}} */ (err).message;
        if (typeof m === "string") text = m;
      }
      setStatus(msg, text, "error");
    } finally {
      hideLoader();
    }
  });
}
