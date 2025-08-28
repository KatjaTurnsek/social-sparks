import "../boot.js";
// import { setStatus } from "../components.js";

const app = document.getElementById("app");
if (app) {
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = "Welcome! This is the Index page.";
  app.appendChild(p);
}
