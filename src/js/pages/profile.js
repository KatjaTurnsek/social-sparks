import { showLoader, hideLoader } from "../boot.js";
import { setStatus } from "../components.js";

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
const postTpl = document.getElementById("profile-post-template");

const followBtn = document.getElementById("followBtn");
const profileMsg = document.getElementById("profile-msg");

// Tabs
const tabPosts = document.getElementById("tabPosts");
const tabAbout = document.getElementById("tabAbout");
const panelPosts = document.getElementById("tab-posts");
const panelAbout = document.getElementById("tab-about");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Demo "API" calls. Replace with real fetches later ---
async function fetchProfile() {
  await wait(300);
  return {
    name: "Demo User",
    handle: "demouser",
    bio: "This is a demo profile bio. Replace with API data.",
    avatar: "https://via.placeholder.com/160",
    counts: { posts: 2, followers: 10, following: 3 },
  };
}

async function fetchProfilePosts() {
  await wait(300);
  return [
    {
      id: 1,
      title: "Post 1",
      body: "Body 1",
      created: new Date().toISOString(),
      media: { url: "https://via.placeholder.com/600x300", alt: "Image" },
    },
    {
      id: 2,
      title: "Post 2",
      body: "Body 2",
      created: new Date().toISOString(),
      media: null,
    },
  ];
}
// ---------------------------------------------------------

function renderHeader(p) {
  const name = p && p.name ? p.name : "User";
  const handle = p && p.handle ? p.handle : "user";
  const bio = p && p.bio ? p.bio : "";

  if (avatarEl && p && p.avatar) {
    avatarEl.src = p.avatar;
    avatarEl.alt = name + " avatar";
  }

  if (nameEl) nameEl.textContent = name;
  if (handleEl) handleEl.textContent = handle;
  if (bioEl) bioEl.textContent = bio;

  let postsCount = 0;
  let followersCount = 0;
  let followingCount = 0;

  const counts = p && p.counts ? p.counts : null;
  if (counts) {
    if (typeof counts.posts === "number") postsCount = counts.posts;
    if (typeof counts.followers === "number") followersCount = counts.followers; // fixed: guarded counts
    if (typeof counts.following === "number") followingCount = counts.following; // fixed: guarded counts
  }

  if (countPostsEl) countPostsEl.textContent = String(postsCount);
  if (countFollowersEl) countFollowersEl.textContent = String(followersCount);
  if (countFollowingEl) countFollowingEl.textContent = String(followingCount);
}

function renderPostCard(post) {
  if (!postTpl || !postsGrid) return;
  const node = postTpl.content.cloneNode(true);

  const titleEl = node.querySelector(".post-title");
  const bodyEl = node.querySelector(".post-body");
  const timeEl = node.querySelector(".post-time");
  const mediaEl = node.querySelector(".post-media");
  const viewLink = node.querySelector("a.btn.btn-outline");

  const title = post && post.title ? post.title : "Untitled";
  const body = post && post.body ? post.body : "";

  // fixed: no ternary for createdISO
  let createdISO = new Date().toISOString();
  if (post && post.created) {
    createdISO = post.created;
  }

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = body;

  if (timeEl) {
    timeEl.textContent = new Date(createdISO).toLocaleString();
    timeEl.setAttribute("datetime", createdISO);
  }

  if (mediaEl && post && post.media && post.media.url) {
    mediaEl.src = post.media.url;
    mediaEl.alt = post.media.alt ? post.media.alt : "";
    mediaEl.style.display = "block";
  }

  if (viewLink) {
    const idStr = post && post.id != null ? String(post.id) : "";
    viewLink.href = "post.html?id=" + encodeURIComponent(idStr);
  }

  postsGrid.appendChild(node);
}

function activateTab(tab) {
  if (!tabPosts || !tabAbout || !panelPosts || !panelAbout) return;

  const isPosts = tab === tabPosts;
  tabPosts.setAttribute("aria-selected", String(isPosts));
  tabAbout.setAttribute("aria-selected", String(!isPosts));

  panelPosts.hidden = !isPosts;
  panelAbout.hidden = isPosts;

  // Move focus to the active panel title for context (optional)
  const container = isPosts ? panelPosts : panelAbout;
  const heading = container.querySelector("h2");
  if (heading && typeof heading.focus === "function") heading.focus();
}

function wireFollowButton() {
  if (!followBtn) return;
  followBtn.addEventListener("click", () => {
    const pressed = followBtn.getAttribute("aria-pressed") === "true";
    const next = !pressed;
    followBtn.setAttribute("aria-pressed", String(next));

    // fixed: no ternary for label/message
    if (next) {
      followBtn.textContent = "Unfollow";
      setStatus(profileMsg, "Followed user.", "success");
    } else {
      followBtn.textContent = "Follow";
      setStatus(profileMsg, "Unfollowed user.", "success");
    }
  });
}

function wireTabs() {
  if (tabPosts) {
    tabPosts.addEventListener("click", (e) => {
      e.preventDefault();
      activateTab(tabPosts);
    });
  }
  if (tabAbout) {
    tabAbout.addEventListener("click", (e) => {
      e.preventDefault();
      activateTab(tabAbout);
    });
  }
}

async function init() {
  if (!nameEl || !handleEl || !bioEl || !postsGrid) return;

  try {
    showLoader();
    if (skeletons) skeletons.style.display = "grid";
    if (empty) {
      empty.style.display = "none";
      empty.textContent = "No posts yet.";
    }
    postsGrid.replaceChildren();

    const profile = await fetchProfile();
    const posts = await fetchProfilePosts();
    renderHeader(profile);

    if (skeletons) skeletons.style.display = "none";

    if (!posts || posts.length === 0) {
      if (empty) {
        empty.style.display = "block";
        empty.textContent = "No posts yet.";
      }
    } else {
      for (let i = 0; i < posts.length; i += 1) {
        renderPostCard(posts[i]);
      }
    }

    wireFollowButton();
    wireTabs();
  } catch (err) {
    let message = "Failed to load profile.";
    if (err && typeof err === "object" && err !== null && "message" in err) {
      const maybe = /** @type {{message?: unknown}} */ (err).message;
      if (typeof maybe === "string") message = maybe;
    }

    const alert = document.createElement("p");
    alert.className = "alert error";
    alert.textContent = message;
    postsGrid.replaceChildren(alert);

    setStatus(profileMsg, message, "error");
  } finally {
    hideLoader();
  }
}

init();
