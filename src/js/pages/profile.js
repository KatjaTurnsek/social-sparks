import "../../css/main.css";
import { showLoader, hideLoader } from "../boot.js";

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

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Demo "API" calls. Replace with real fetches later ---
async function fetchProfile() {
  await wait(600);
  return {
    name: "Demo User",
    handle: "demouser",
    bio: "This is a demo profile bio. Replace with API data.",
    avatar: "https://via.placeholder.com/160",
    counts: { posts: 2, followers: 10, following: 3 },
  };
}

async function fetchProfilePosts() {
  await wait(700);
  return [
    {
      id: "p1",
      title: "Sunset",
      body: "Beautiful evening!",
      created: new Date().toISOString(),
      media: { url: "https://via.placeholder.com/600x300", alt: "Sunset" },
    },
    {
      id: "p2",
      title: "Coffee",
      body: "Morning vibes ☕",
      created: new Date().toISOString(),
      media: null,
    },
  ];
}
// ---------------------------------------------------------

function renderHeader(p) {
  if (avatarEl) {
    avatarEl.src = p.avatar;
    avatarEl.alt = `${p.name} avatar`;
  }
  if (nameEl) nameEl.textContent = p.name;
  if (handleEl) handleEl.textContent = p.handle;
  if (bioEl) bioEl.textContent = p.bio || "";

  if (countPostsEl) countPostsEl.textContent = String(p.counts.posts ?? 0);
  if (countFollowersEl)
    countFollowersEl.textContent = String(p.counts.followers ?? 0);
  if (countFollowingEl)
    countFollowingEl.textContent = String(p.counts.following ?? 0);
}

function renderPostCard(post) {
  if (!postTpl || !postsGrid) return;
  const node = postTpl.content.cloneNode(true);

  const titleEl = node.querySelector(".post-title");
  const bodyEl = node.querySelector(".post-body");
  const timeEl = node.querySelector(".post-time");
  const mediaEl = node.querySelector(".post-media");
  const viewLink = node.querySelector("a.btn.btn-outline");

  if (titleEl) titleEl.textContent = post.title ?? "Untitled";
  if (bodyEl) bodyEl.textContent = post.body ?? "";

  if (timeEl) {
    timeEl.textContent = new Date(post.created).toLocaleString();
    timeEl.setAttribute("datetime", post.created);
  }

  if (mediaEl && post.media?.url) {
    mediaEl.src = post.media.url;
    mediaEl.alt = post.media.alt || "";
    mediaEl.style.display = "block";
  }

  if (viewLink) {
    viewLink.href = `post.html?id=${encodeURIComponent(post.id)}`;
  }

  postsGrid.appendChild(node);
}

async function init() {
  if (!nameEl || !handleEl || !bioEl || !postsGrid) return;

  try {
    showLoader();
    if (skeletons) skeletons.style.display = "grid";
    if (empty) empty.style.display = "none";
    postsGrid.innerHTML = "";

    const [profile, posts] = await Promise.all([
      fetchProfile(),
      fetchProfilePosts(),
    ]);
    renderHeader(profile);

    if (skeletons) skeletons.style.display = "none";

    if (!posts.length) {
      if (empty) empty.style.display = "block";
      return;
    }

    posts.forEach(renderPostCard);
    console.log("Profile page script is running.");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load profile.";
    if (postsGrid)
      postsGrid.innerHTML = `<p class="alert error">${message}</p>`;
  } finally {
    hideLoader();
  }
}

init();
