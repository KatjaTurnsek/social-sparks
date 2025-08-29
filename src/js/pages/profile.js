// src/js/pages/profile.js
import { showLoader, hideLoader } from "../boot.js";
import { PostCard, setStatus } from "../components.js";
import {
  getProfile,
  listProfilePosts,
  followProfile,
  unfollowProfile,
} from "../api/profiles.js";

// DOM refs
const avatarEl = document.getElementById("profile-avatar");
const nameEl = document.getElementById("profile-name");
const handleEl = document.getElementById("profile-handle");
const bioEl = document.getElementById("profile-bio");

const countPostsEl = document.getElementById("count-posts");
const countFollowersEl = document.getElementById("count-followers");
const countFollowingEl = document.getElementById("count-following");

const postsGrid = document.getElementById("profile-posts");
const skeletons = document.getElementById("profile-skeletons");
const empty = document.getElementById("profile-empty");

const followBtn = document.getElementById("followBtn");
// Optional polite live region in HTML:
// <p id="profile-msg" class="form-message" aria-live="polite"></p>
const profileMsg = document.getElementById("profile-msg");

// Helpers
function getProfileNameFromURL() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("name");
    return n ? n : "";
  } catch {
    return "";
  }
}

function renderHeader(p) {
  if (avatarEl && p && p.avatar && typeof p.avatar === "object") {
    if (p.avatar.url) avatarEl.src = p.avatar.url;
    avatarEl.alt = p.name ? p.name + " avatar" : "Profile avatar";
  }
  if (nameEl && p && p.name) nameEl.textContent = p.name;
  if (handleEl && p && p.name) handleEl.textContent = p.name;
  if (bioEl) bioEl.textContent = p && p.bio ? p.bio : "";

  const c = p && p._count ? p._count : {};
  const postsCount = typeof c.posts === "number" ? c.posts : 0;
  const followersCount = typeof c.followers === "number" ? c.followers : 0;
  const followingCount = typeof c.following === "number" ? c.following : 0;

  if (countPostsEl) countPostsEl.textContent = String(postsCount);
  if (countFollowersEl) countFollowersEl.textContent = String(followersCount);
  if (countFollowingEl) countFollowingEl.textContent = String(followingCount);
}

function renderPosts(posts) {
  if (!postsGrid) return;

  postsGrid.replaceChildren(); // clear

  if (!posts || posts.length === 0) {
    if (empty) {
      empty.style.display = "block";
      empty.textContent = "No posts yet.";
    }
    return;
  }

  if (empty) empty.style.display = "none";

  const frag = document.createDocumentFragment();
  for (let i = 0; i < posts.length; i += 1) {
    const p = posts[i];
    const id = p && p.id != null ? p.id : "";
    const title = p && p.title ? p.title : "Untitled";
    const body = p && p.body ? p.body : "";
    const created = p && p.created ? p.created : new Date().toISOString();
    const media = p && p.media ? p.media : null;

    // Clean author name check (no long chained condition)
    let authorName = "Unknown";
    if (p && typeof p === "object" && p !== null) {
      const a = p.author;
      if (a && typeof a === "object" && a !== null) {
        const maybeName = a.name;
        if (typeof maybeName === "string") authorName = maybeName;
      }
    } else if (handleEl && handleEl.textContent) {
      authorName = handleEl.textContent;
    }

    frag.appendChild(
      PostCard({
        id: id,
        title: title,
        author: authorName,
        created: created,
        body: body,
        media: media,
      })
    );
  }
  postsGrid.appendChild(frag);
}

function wireFollow(name) {
  if (!followBtn) return;

  followBtn.addEventListener("click", async () => {
    const pressedStr = followBtn.getAttribute("aria-pressed");
    const pressed = pressedStr === "true";
    followBtn.disabled = true;

    try {
      let result = null;
      if (pressed) {
        result = await unfollowProfile(name);
        followBtn.setAttribute("aria-pressed", "false");
        followBtn.textContent = "Follow";
        setStatus(profileMsg, "Unfollowed profile.", "success");
      } else {
        result = await followProfile(name);
        followBtn.setAttribute("aria-pressed", "true");
        followBtn.textContent = "Unfollow";
        setStatus(profileMsg, "Followed profile.", "success");
      }

      // Adjust counts if API responded with updated arrays
      if (result && typeof result === "object" && result !== null) {
        if (Array.isArray(result.followers) && countFollowersEl) {
          countFollowersEl.textContent = String(result.followers.length);
        }
        if (Array.isArray(result.following) && countFollowingEl) {
          countFollowingEl.textContent = String(result.following.length);
        }
      }
    } catch (err) {
      let msg = "Action failed.";
      if (err && typeof err === "object" && err !== null && "message" in err) {
        const maybe = /** @type {{message?: unknown}} */ (err).message;
        if (typeof maybe === "string") msg = maybe;
      }
      setStatus(profileMsg, msg, "error");
    } finally {
      followBtn.disabled = false;
    }
  });
}

async function init() {
  const name = getProfileNameFromURL();
  if (!name) {
    if (postsGrid) {
      const p = document.createElement("p");
      p.className = "alert error";
      p.textContent = "Missing profile name (?name=...)";
      postsGrid.replaceChildren(p);
    }
    return;
  }

  try {
    showLoader();
    if (skeletons) skeletons.style.display = "grid";
    if (empty) {
      empty.style.display = "none";
      empty.textContent = "No posts yet.";
    }
    if (postsGrid) postsGrid.replaceChildren();

    const [profile, posts] = await Promise.all([
      getProfile(name, { _followers: true, _following: true, _posts: false }),
      listProfilePosts(name, { _author: true, page: 1, limit: 12 }),
    ]);

    if (skeletons) skeletons.style.display = "none";
    renderHeader(profile);
    renderPosts(posts);

    // Default follow button state; for real state, check if current user is in profile.followers
    if (followBtn) {
      followBtn.setAttribute("aria-pressed", "false");
      followBtn.textContent = "Follow";
    }
    wireFollow(name);
  } catch (err) {
    let message = "Failed to load profile.";
    if (err && typeof err === "object" && err !== null && "message" in err) {
      const maybe = /** @type {{message?: unknown}} */ (err).message;
      if (typeof maybe === "string") message = maybe;
    }
    if (postsGrid) {
      const p = document.createElement("p");
      p.className = "alert error";
      p.textContent = message;
      postsGrid.replaceChildren(p);
    }
    setStatus(profileMsg, message, "error");
  } finally {
    hideLoader();
  }
}

init();
