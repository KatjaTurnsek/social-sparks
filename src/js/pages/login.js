import { showLoader, hideLoader } from "../boot.js";
import { setStatus } from "../components.js";
import { loginUser } from "../api/auth.js";

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

    setStatus(msg, "Logging in…", null);

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email =
      emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
    const password =
      passwordInput instanceof HTMLInputElement ? passwordInput.value : "";

    try {
      showLoader();

      // Optional minimal validation before calling API
      if (email === "" || password === "") {
        setStatus(msg, "Please enter both email and password.", "error");
        return;
      }

      await loginUser({ email, password });
      setStatus(msg, "Login successful.", "success");

      // Optional redirect:
      // location.href = `${import.meta.env.BASE_URL}feed.html`;
    } catch (err) {
      let text = "Login failed.";
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
