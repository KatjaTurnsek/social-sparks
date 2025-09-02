import { BASE_API_URL, addToLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

const loginForm = document.querySelector("#login-form");
const AUTH_LOGIN_URL = BASE_API_URL + "/auth/login";

async function loginUser(userDetails) {
  showLoader();
  try {
    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(userDetails),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(AUTH_LOGIN_URL, fetchOptions);

    let json = null;
    try {
      json = await response.json();
    } catch (err) {
      void err;
      json = null;
    }

    if (!response.ok) {
      throw new Error(errorFrom(json, "Login failed"));
    }

    let accessToken = "";
    if (json && typeof json === "object") {
      if (json.data && typeof json.data.accessToken === "string") {
        accessToken = json.data.accessToken;
      } else if (typeof json.accessToken === "string") {
        accessToken = json.accessToken;
      }
    }
    if (!accessToken) throw new Error("No access token returned.");

    addToLocalStorage("accessToken", accessToken);

    let name = "";
    if (json && typeof json === "object") {
      if (json.data && typeof json.data.name === "string") {
        name = json.data.name;
      } else if (typeof json.name === "string") {
        name = json.name;
      }
    }
    if (name) addToLocalStorage("profileName", name);

    return json;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    hideLoader();
  }
}

function onLoginFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const formFields = Object.fromEntries(formData);
  loginUser(formFields)
    .then(function () {
      alert("Login successful!");
      window.location.href = "feed.html";
    })
    .catch(function (err) {
      alert((err && err.message) || "Login failed");
    });
}

if (loginForm) {
  loginForm.addEventListener("submit", onLoginFormSubmit);
}
