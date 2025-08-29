import "../boot.js";
// import { setStatus } from "../components.js"; // optional for live-region updates

const app = document.getElementById("app");
if (app) {
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = "Welcome! This is the Index page.";
  app.replaceChildren(p);
  // Or: setStatus(app, "Welcome! This is the Index page.");
}
