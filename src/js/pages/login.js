// @ts-check
import { BASE_API_URL, addToLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";

const loginForm = document.getElementById("login-form");
const AUTH_LOGIN_URL = BASE_API_URL + "/auth/login";

function setMsg(text, type = "error") {
  const el = document.getElementById("login-msg");
  if (el) {
    el.style.display = "block";
    el.className = "form-message alert";
    el.classList.toggle("success", type === "success");
    el.classList.toggle("error", type !== "success");
    el.textContent = text;
    return;
  }
  if (type === "error") alert(text);
}

function setFormSubmitting(form, submitting) {
  form.setAttribute("aria-busy", String(submitting));

  const controls = [
    ...form.querySelectorAll("input, select, textarea, button"),
  ];
  controls.forEach((el) => {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLButtonElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      el.disabled = submitting;
    }
  });

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn instanceof HTMLButtonElement) {
    if (submitting) {
      submitBtn.setAttribute("data-prev-text", submitBtn.textContent || "");
      submitBtn.textContent = "Signing in…";
    } else {
      const prev = submitBtn.getAttribute("data-prev-text") || "Sign in";
      submitBtn.textContent = prev;
      submitBtn.removeAttribute("data-prev-text");
    }
  }
}

async function loginUser(userDetails) {
  showLoader();
  try {
    const response = await fetch(AUTH_LOGIN_URL, {
      method: "POST",
      body: JSON.stringify(userDetails),
      headers: { "Content-Type": "application/json" },
    });

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(errorFrom(json, "Login failed"));
    }

    const merged = {
      ...(json || {}),
      ...(json && typeof json.data === "object" ? json.data : {}),
    };

    const accessToken =
      typeof merged.accessToken === "string" ? merged.accessToken : "";
    if (!accessToken) throw new Error("No access token returned.");
    addToLocalStorage("accessToken", accessToken);

    const name = typeof merged.name === "string" ? merged.name : "";
    if (name) addToLocalStorage("profileName", name);

    return json;
  } finally {
    hideLoader();
  }
}

function onLoginFormSubmit(event) {
  event.preventDefault();
  const form = /** @type {HTMLFormElement} */ (event.target);
  const fd = new FormData(form);
  const email = String(fd.get("email") || "");
  const password = String(fd.get("password") || "");

  if (!email || email.indexOf("@") === -1) {
    setMsg("Please enter a valid email address.", "error");
    return;
  }
  if (!password) {
    setMsg("Please enter your password.", "error");
    return;
  }

  setFormSubmitting(form, true);
  loginUser({ email, password })
    .then(function () {
      window.location.href = "feed.html";
    })
    .catch(function (err) {
      setMsg((err && err.message) || "Login failed", "error");
    })
    .finally(function () {
      setFormSubmitting(form, false);
    });
}

(function guardAlreadyAuthenticated() {
  const token = localStorage.getItem("accessToken") || "";
  if (token) {
    window.location.replace("feed.html");
  }
})();

(function showRegisterNotice() {
  const params = new URLSearchParams(location.search);
  const notice = params.get("notice");
  if (notice) setMsg(notice, "success");
})();

if (loginForm) {
  loginForm.addEventListener("submit", onLoginFormSubmit);
}
