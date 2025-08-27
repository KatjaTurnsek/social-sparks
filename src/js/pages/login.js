import "../../css/main.css";

const app = document.getElementById("app");
if (app) {
  app.innerHTML = `<p class="muted">Please log in to continue.</p>`;
}

const form = document.getElementById("login-form");
const msg = document.getElementById("login-msg");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.style.display = "block";
    msg.textContent = "Logging in…";

    // TODO: replace with API call
    setTimeout(() => (msg.textContent = "Demo login successful"), 800);
  });
}
