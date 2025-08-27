import "../../css/main.css";

const nameEl = document.getElementById("profile-name");
const handleEl = document.getElementById("profile-handle");
const bioEl = document.getElementById("profile-bio");

if (nameEl && handleEl && bioEl) {
  nameEl.textContent = "Demo User";
  handleEl.textContent = "demouser";
  bioEl.textContent = "This is a demo profile bio. Replace with API data.";

  console.log("Profile page script is running.");
}
