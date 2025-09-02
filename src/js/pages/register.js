import { BASE_API_URL } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

const registerForm = document.querySelector("#register-form");
const AUTH_REGISTER_URL = BASE_API_URL + "/auth/register";

async function registerUser(userDetails) {
  showLoader();
  try {
    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(userDetails),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(AUTH_REGISTER_URL, fetchOptions);

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(errorFrom(json, "Registration failed"));
    }

    return json;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    hideLoader();
  }
}

function onRegisterFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const formFields = Object.fromEntries(formData);

  registerUser(formFields)
    .then(function () {
      alert("Account created! You can now log in.");
      window.location.href = "login.html";
    })
    .catch(function (err) {
      alert((err && err.message) || "Could not register.");
    });
}

if (registerForm) {
  registerForm.addEventListener("submit", onRegisterFormSubmit);
}
