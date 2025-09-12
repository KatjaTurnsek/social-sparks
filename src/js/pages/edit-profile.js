// @ts-check
/** @typedef {import("../types.js").Profile} Profile */
/** @typedef {import("../types.js").Media} Media */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

/**
 * Return element by id.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function byId(id) {
  return document.getElementById(id);
}

/**
 * Set textContent safely.
 * @param {HTMLElement|null} el
 * @param {string} text
 * @returns {void}
 */
function setText(el, text) {
  if (el) el.textContent = text;
}

/**
 * Current logged-in profile name (owner).
 * @returns {string}
 */
function getMyName() {
  return getFromLocalStorage("profileName") || "";
}

/**
 * Redirect to login when unauthenticated.
 * @returns {boolean} true if allowed to proceed
 */
function authGuard() {
  const token = getFromLocalStorage("accessToken");
  const name = getMyName();
  if (!token || !name) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/**
 * Fetch the current profile (no posts needed here).
 * @param {string} name
 * @returns {Promise<Profile|null>}
 * @throws {Error}
 */
async function fetchProfile(name) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  const url = BASE_API_URL + "/social/profiles/" + encodeURIComponent(name);

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: "Bearer " + token }),
  };

  const res = await fetch(url, { headers });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) throw new Error(errorFrom(json, "Failed to load profile"));
  return json?.data || null;
}

/** @typedef {{ bio?: string, avatar?: Media, banner?: Media }} ProfileUpdate */

/**
 * Update profile fields (bio / avatar / banner).
 * @param {string} name
 * @param {ProfileUpdate} payload
 * @returns {Promise<Profile|any>}
 * @throws {Error}
 */
async function updateProfile(name, payload) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);

  const headers = {
    "Content-Type": "application/json",
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: "Bearer " + token }),
  };

  const url = BASE_API_URL + "/social/profiles/" + encodeURIComponent(name);

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) throw new Error(errorFrom(json, "Failed to save profile"));
  return json?.data || json || null;
}

/**
 * Wire avatar/banner live preview updates as the user types.
 * @returns {void}
 */
function wirePreviews() {
  const avatarUrl = /** @type {HTMLInputElement|null} */ (byId("avatar-url"));
  const bannerUrl = /** @type {HTMLInputElement|null} */ (byId("banner-url"));
  const avatarPrev = /** @type {HTMLImageElement|null} */ (
    byId("avatar-preview")
  );
  const bannerPrev = /** @type {HTMLImageElement|null} */ (
    byId("banner-preview")
  );

  /**
   * @param {HTMLImageElement|null} img
   * @param {string} url
   * @returns {void}
   */
  function setPreview(img, url) {
    if (!img) return;
    if (url && /^https?:\/\//i.test(url)) {
      img.src = url;
      img.style.display = "";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
    }
  }

  if (avatarUrl && avatarPrev) {
    avatarUrl.addEventListener("input", () =>
      setPreview(avatarPrev, avatarUrl.value.trim())
    );
  }
  if (bannerUrl && bannerPrev) {
    bannerUrl.addEventListener("input", () =>
      setPreview(bannerPrev, bannerUrl.value.trim())
    );
  }
}

/**
 * Populate the form from a loaded profile.
 * @param {Profile|null} p
 * @returns {void}
 */
function fillForm(p) {
  const bio = /** @type {HTMLTextAreaElement|null} */ (byId("bio"));
  const aUrl = /** @type {HTMLInputElement|null} */ (byId("avatar-url"));
  const aAlt = /** @type {HTMLInputElement|null} */ (byId("avatar-alt"));
  const bUrl = /** @type {HTMLInputElement|null} */ (byId("banner-url"));
  const bAlt = /** @type {HTMLInputElement|null} */ (byId("banner-alt"));

  const avatarPrev = /** @type {HTMLImageElement|null} */ (
    byId("avatar-preview")
  );
  const bannerPrev = /** @type {HTMLImageElement|null} */ (
    byId("banner-preview")
  );

  if (bio) bio.value = p?.bio || "";
  if (aUrl) aUrl.value = p?.avatar?.url || "";
  if (aAlt) aAlt.value = p?.avatar?.alt || "";
  if (bUrl) bUrl.value = p?.banner?.url || "";
  if (bAlt) bAlt.value = p?.banner?.alt || "";

  if (avatarPrev) {
    const url = p?.avatar?.url || "";
    if (url) {
      avatarPrev.src = url;
      avatarPrev.style.display = "";
    } else {
      avatarPrev.style.display = "none";
    }
  }
  if (bannerPrev) {
    const url = p?.banner?.url || "";
    if (url) {
      bannerPrev.src = url;
      bannerPrev.style.display = "";
    } else {
      bannerPrev.style.display = "none";
    }
  }
}

/**
 * Toggle a form's submitting/disabled state and button label.
 * @param {HTMLFormElement|null} form
 * @param {boolean} submitting
 * @returns {void}
 */
function setSubmitting(form, submitting) {
  if (!form) return;
  const fields = [...form.querySelectorAll("input, textarea, button, select")];
  fields.forEach((el) => {
    /** @type {HTMLInputElement|HTMLTextAreaElement|HTMLButtonElement|HTMLSelectElement} */ (
      el
    ).disabled = submitting;
  });
  const btn = /** @type {HTMLButtonElement|null} */ (byId("btn-save"));
  if (btn) {
    if (submitting) {
      btn.dataset.prevText = btn.textContent || "";
      btn.textContent = "Saving…";
    } else {
      btn.textContent = btn.dataset.prevText || "Save changes";
      delete btn.dataset.prevText;
    }
  }
}

/**
 * Inline message area updater (falls back to alert for errors).
 * @param {string} text
 * @param {boolean} ok
 * @returns {void}
 */
function setMsg(text, ok) {
  const el = byId("edit-profile-msg");
  if (el) {
    el.style.display = "block";
    el.className = "form-message alert" + (ok ? " success" : " error");
    el.textContent = text;
  } else if (!ok) {
    alert(text);
  }
}

/**
 * Page bootstrap: load current values, wire previews, handle submit.
 * @returns {Promise<void>}
 */
async function main() {
  if (!authGuard()) return;

  const myName = getMyName();
  const form = /** @type {HTMLFormElement|null} */ (byId("edit-profile-form"));
  const headingName = byId("heading-name");
  const cancelLink = /** @type {HTMLAnchorElement|null} */ (byId("btn-cancel"));
  if (cancelLink)
    cancelLink.href = "profile.html?name=" + encodeURIComponent(myName);

  showLoader();
  try {
    const profile = await fetchProfile(myName);
    setText(headingName, profile?.name || myName);
    fillForm(profile);
    wirePreviews();
  } catch (e) {
    // @ts-ignore runtime-only
    setMsg(e?.message || "Could not load your profile.", false);
  } finally {
    hideLoader();
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const bio = String(fd.get("bio") || "").trim();
    const avatarUrl = String(fd.get("avatar-url") || "").trim();
    const avatarAlt = String(fd.get("avatar-alt") || "").trim();
    const bannerUrl = String(fd.get("banner-url") || "").trim();
    const bannerAlt = String(fd.get("banner-alt") || "").trim();

    /** @type {ProfileUpdate} */
    const payload = {
      ...(bio && { bio }),
      ...(avatarUrl && {
        avatar: { url: avatarUrl, ...(avatarAlt && { alt: avatarAlt }) },
      }),
      ...(bannerUrl && {
        banner: { url: bannerUrl, ...(bannerAlt && { alt: bannerAlt }) },
      }),
    };

    if (Object.keys(payload).length === 0) {
      setMsg("Please change at least one field before saving.", false);
      return;
    }

    setMsg("", true);
    setSubmitting(form, true);
    showLoader();
    try {
      await updateProfile(myName, payload);
      setMsg("Profile updated!", true);
      setTimeout(() => {
        window.location.href =
          "profile.html?name=" + encodeURIComponent(myName);
      }, 600);
    } catch (e) {
      // @ts-ignore runtime-only
      setMsg(e?.message || "Failed to save profile.", false);
    } finally {
      hideLoader();
      setSubmitting(form, false);
    }
  });
}

main();
