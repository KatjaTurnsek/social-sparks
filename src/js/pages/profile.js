// @ts-check
/** @typedef {import("../types.js").Profile} Profile */
/** @typedef {import("../types.js").Post} Post */
/** @typedef {import("../types.js").Media} Media */
/** @typedef {import("../types.js").ProfileSummary} ProfileSummary */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";
import { formatDate } from "../shared/dates.js";

/**
 * Get element by id.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function byId(id) {
  return document.getElementById(id);
}

/**
 * Safely set textContent on an element.
 * @param {HTMLElement|null} el
 * @param {string} text
 * @returns {void}
 */
function setText(el, text) {
  if (el) el.textContent = text;
}

/**
 * Show a page message without using inline styles.
 * @param {HTMLElement|null} el
 * @param {string} message
 * @param {"error"|"success"|"info"} [type]
 * @returns {void}
 */
function showPageMessage(el, message, type = "error") {
  if (!el) return;

  el.classList.remove("is-hidden");
  el.className = `form-message alert ${type}`;
  el.textContent = message;
}

/**
 * Set or clear an image source, alt text, and visibility.
 * Uses a placeholder from data-placeholder or initial src to avoid empty src.
 * @param {HTMLImageElement|null} imgEl
 * @param {string} url
 * @param {string} [alt]
 * @returns {void}
 */
function setImg(imgEl, url, alt) {
  if (!imgEl) return;

  const initial = imgEl.dataset.placeholder || imgEl.getAttribute("src") || "";

  if (!imgEl.dataset.placeholder && initial) {
    imgEl.dataset.placeholder = initial;
  }

  if (url) {
    imgEl.src = url;
    imgEl.alt = alt || "";
    imgEl.classList.remove("is-hidden");
  } else {
    if (imgEl.dataset.placeholder) {
      imgEl.src = imgEl.dataset.placeholder;
    }

    imgEl.alt = "";
    imgEl.classList.add("is-hidden");
  }
}

/**
 * Resolve profile name from querystring or current logged-in user.
 * @returns {string}
 */
function getProfileName() {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    const fromUrl = sp.get("name") || "";
    return fromUrl || getFromLocalStorage("profileName") || "";
  } catch {
    return getFromLocalStorage("profileName") || "";
  }
}

/**
 * Case-insensitive name equality.
 * @param {string|undefined|null} a
 * @param {string|undefined|null} b
 * @returns {boolean}
 */
function sameUser(a, b) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Fetch full profile with posts/followers/following included.
 * @param {string} name
 * @returns {Promise<Profile|null>}
 * @throws {Error} When request fails or response is not OK.
 */
async function fetchProfile(name) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);

  const url = `${BASE_API_URL}/social/profiles/${encodeURIComponent(
    name
  )}?_posts=true&_followers=true&_following=true`;

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
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

/**
 * Follow or unfollow a profile.
 * @param {string} name
 * @param {"follow"|"unfollow"} action
 * @returns {Promise<Profile|any>}
 * @throws {Error} With attached status on failure.
 */
async function follow(name, action) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const url = `${BASE_API_URL}/social/profiles/${encodeURIComponent(
    name
  )}/${action}`;

  const res = await fetch(url, { method: "PUT", headers });

  let json = null;

  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = new Error(errorFrom(json, "Failed"));
    // @ts-ignore - attach status for callers
    err.status = res.status;
    throw err;
  }

  return json?.data || json || null;
}

/**
 * Render a grid of the user's posts into a panel element.
 * @param {HTMLElement|null} panelEl
 * @param {Post[]|null|undefined} posts
 * @returns {void}
 */
function renderPosts(panelEl, posts) {
  if (!panelEl) return;

  panelEl.innerHTML = "";
  panelEl.classList.remove("person-list");
  panelEl.classList.add("post-grid");

  if (!Array.isArray(posts) || posts.length === 0) {
    panelEl.classList.remove("post-grid");

    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No posts yet.";
    panelEl.appendChild(p);
    return;
  }

  const items = [...posts];

  items.forEach((post) => {
    const card = document.createElement("article");
    card.className = "card post-card";

    const h = document.createElement("h4");
    h.textContent = post?.title || "Untitled";

    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = post?.created ? String(formatDate(post.created)) : "";

    if (post?.media?.url) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = post.media.url;
      img.alt = post.media?.alt || "";
      card.appendChild(img);
    }

    const bodyP = document.createElement("p");
    bodyP.textContent = post?.body || "";
    bodyP.className = "clamp-2";

    const actions = document.createElement("div");
    actions.className = "form-actions";

    const view = document.createElement("a");
    view.className = "btn btn-outline";
    const pid = post?.id != null ? String(post.id) : "";
    view.href = `post.html?id=${encodeURIComponent(pid)}`;
    view.textContent = "View";

    actions.appendChild(view);
    card.append(h, meta, bodyP, actions);
    panelEl.appendChild(card);
  });
}

/**
 * Render follower/following lists as cards with avatar and profile link.
 * @param {HTMLElement|null} panelEl
 * @param {ProfileSummary[]|null|undefined} list
 * @returns {void}
 */
function renderPeople(panelEl, list) {
  if (!panelEl) return;

  panelEl.innerHTML = "";
  panelEl.classList.remove("post-grid");
  panelEl.classList.add("person-list");

  const people = Array.isArray(list) ? [...list] : [];

  if (people.length === 0) {
    panelEl.classList.remove("person-list");

    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Nothing to show.";
    panelEl.appendChild(p);
    return;
  }

  people.forEach((person) => {
    const line = document.createElement("article");
    line.className = "card person-card";

    const avatar = document.createElement("img");
    avatar.loading = "lazy";

    if (person?.avatar?.url) {
      avatar.src = person.avatar.url;
      avatar.alt = person.avatar?.alt || "";
    } else {
      avatar.src = "assets/images/placeholder.png";
      avatar.alt = "";
    }

    const info = document.createElement("div");

    const nm = document.createElement("p");
    nm.textContent = person?.name || "Unknown";

    const bi = document.createElement("p");
    bi.className = "muted";
    bi.textContent = person?.bio || "";

    info.append(nm, bi);

    const go = document.createElement("a");
    go.className = "btn btn-outline";
    go.textContent = "View";
    go.href = `profile.html?name=${encodeURIComponent(person?.name || "")}`;

    line.append(avatar, info, go);
    panelEl.appendChild(line);
  });
}

/**
 * Page bootstrap: load profile, wire actions/tabs, render panels.
 * @returns {Promise<void>}
 */
async function main() {
  const name = getProfileName();

  const bannerEl = /** @type {HTMLImageElement|null} */ (
    byId("profile-banner")
  );
  const avatarEl = /** @type {HTMLImageElement|null} */ (
    byId("profile-avatar")
  );
  const nameEl = byId("profile-name");
  const emailEl = byId("profile-email");
  const bioEl = byId("profile-bio");
  const cntPosts = byId("count-posts");
  const cntFollowers = byId("count-followers");
  const cntFollowing = byId("count-following");
  const btnFollow = /** @type {HTMLButtonElement|null} */ (byId("btn-follow"));
  const btnUnfollow = /** @type {HTMLButtonElement|null} */ (
    byId("btn-unfollow")
  );
  const btnEdit = /** @type {HTMLAnchorElement|null} */ (byId("btn-edit"));
  const btnCreatePost = /** @type {HTMLAnchorElement|null} */ (
    byId("btn-create-post")
  );
  const panelPosts = byId("panel-posts");
  const panelFollowers = byId("panel-followers");
  const panelFollowing = byId("panel-following");
  const msgEl = byId("page-msg");

  if (!name) {
    showPageMessage(msgEl, "No profile name provided.");
    return;
  }

  showLoader();

  try {
    const p = await fetchProfile(name);

    setText(nameEl, p?.name || "Profile");
    setText(emailEl, p?.email || "");
    setText(bioEl, p?.bio || "");
    setImg(avatarEl, p?.avatar?.url ? p.avatar.url : "", p?.avatar?.alt || "");
    setImg(bannerEl, p?.banner?.url ? p.banner.url : "", p?.banner?.alt || "");

    const counts = {
      posts: 0,
      followers: 0,
      following: 0,
      ...(p?._count || {}),
    };

    setText(cntPosts, String(counts.posts || 0));
    setText(cntFollowers, String(counts.followers || 0));
    setText(cntFollowing, String(counts.following || 0));

    const rawToken = getFromLocalStorage("accessToken") || "";
    const token = normalizeBearer(rawToken);
    const myName = getFromLocalStorage("profileName") || "";
    const isMe =
      !!token && !!myName && p?.name ? sameUser(myName, p.name) : false;

    if (btnEdit) {
      if (isMe) {
        btnEdit.hidden = false;
        btnEdit.href = "edit-profile.html";
        btnEdit.onclick = null;
      } else {
        btnEdit.remove();
      }
    }

    if (btnCreatePost) {
      if (isMe) {
        btnCreatePost.hidden = false;
        btnCreatePost.href = "create-post.html";
      } else {
        btnCreatePost.remove();
      }
    }

    const followersArr = Array.isArray(p?.followers) ? [...p.followers] : [];
    let followerCount =
      (typeof p?._count?.followers === "number"
        ? p._count.followers
        : followersArr.length) || 0;

    let iFollow =
      !!token &&
      !isMe &&
      !!myName &&
      followersArr.some((u) => u?.name && sameUser(String(u.name), myName));

    /**
     * Update visible follow/unfollow button state.
     * @returns {void}
     */
    function updateFollowUI() {
      if (!btnFollow || !btnUnfollow) return;

      if (!token || isMe) {
        btnFollow.hidden = true;
        btnUnfollow.hidden = true;
        return;
      }

      btnFollow.hidden = iFollow;
      btnUnfollow.hidden = !iFollow;

      if (cntFollowers) {
        setText(cntFollowers, String(Math.max(0, followerCount)));
      }
    }

    /**
     * Handle profile follow/unfollow state changes.
     * @param {"follow"|"unfollow"} action
     * @returns {Promise<void>}
     */
    async function handleFollowClick(action) {
      if (!p?.name) return;

      if (!token) {
        window.location.href = "login.html";
        return;
      }

      if (btnFollow) btnFollow.disabled = true;
      if (btnUnfollow) btnUnfollow.disabled = true;

      showLoader();

      try {
        await follow(p.name, action);

        if (action === "follow" && !iFollow) {
          iFollow = true;
          followerCount += 1;
        } else if (action === "unfollow" && iFollow) {
          iFollow = false;
          followerCount = Math.max(0, followerCount - 1);
        }

        updateFollowUI();
      } catch (err) {
        const status = /** @type {any} */ (err)?.status;

        if (status === 401 || status === 403) {
          window.location.href = "login.html";
          return;
        }

        // @ts-ignore
        showPageMessage(
          msgEl,
          err?.message || "Failed to update follow state."
        );
      } finally {
        hideLoader();

        if (btnFollow) btnFollow.disabled = false;
        if (btnUnfollow) btnUnfollow.disabled = false;
      }
    }

    if (btnFollow) btnFollow.onclick = () => handleFollowClick("follow");
    if (btnUnfollow) btnUnfollow.onclick = () => handleFollowClick("unfollow");

    updateFollowUI();

    renderPosts(panelPosts, Array.isArray(p?.posts) ? [...p.posts] : []);
    renderPeople(
      panelFollowers,
      Array.isArray(p?.followers) ? [...p.followers] : []
    );
    renderPeople(
      panelFollowing,
      Array.isArray(p?.following) ? [...p.following] : []
    );

    const tabs = [...document.querySelectorAll(".tabs .tab")];
    const panels = [...document.querySelectorAll(".tabpanel")];

    tabs.forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        tabs.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });

        tabBtn.classList.add("is-active");
        tabBtn.setAttribute("aria-selected", "true");

        const target = tabBtn.getAttribute("data-tab");

        panels.forEach((pnl) => pnl.classList.add("is-hidden"));

        const active = byId(`panel-${target || ""}`);
        if (active) active.classList.remove("is-hidden");
      });
    });
  } catch (e) {
    // @ts-ignore
    showPageMessage(msgEl, (e && e.message) || "Could not load profile.");
  } finally {
    hideLoader();
  }
}

main();
