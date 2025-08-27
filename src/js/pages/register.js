import "../../css/main.css";

const form = document.getElementById("register-form");
const msg = document.getElementById("register-msg");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.style.display = "block";
    msg.textContent = "Registering…";

    setTimeout(() => (msg.textContent = "Demo: account created!"), 800);
  });
}
