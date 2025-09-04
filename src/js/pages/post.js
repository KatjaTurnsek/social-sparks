// @ts-check
/** @typedef {import("../types.js").Post} Post */
/** @typedef {import("../types.js").Comment} Comment */
/** @typedef {import("../types.js").Profile} Profile */
/** @typedef {import("../types.js").Media} Media */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { formatDate } from "../shared/dates.js";
import { normalizeBearer } from "../shared/auth.js";

const display = document.getElementById("display-container");

/**
 * Build a link to a user's profile page (root-level profile.html).
 * @param {string} name - Profile name (username).
 * @returns {string} URL pointing to profile.html with the username.
 */
function profileUrl(name) {
  return `profile.html?name=${encodeURIComponent(name)}`;
}

/**
 * Get the `id` query parameter from the current page URL.
 * @returns {string} The post ID, or an empty string if missing.
 */
function getId() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("id");
    return v ? v : "";
  } catch {
    return "";
  }
}

/**
 * Fetch a single post from the API, including author and comments.
 * @param {string} id - The post ID to fetch.
 * @returns {Promise<Post|null>} Resolves with the post object or null if not found.
 * @throws {Error} If the API request fails.
 */
async function fetchPost(id) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  const url =
    BASE_API_URL +
    "/social/posts/" +
    encodeURIComponent(id) +
    "?_author=true&_comments=true";

  const headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(url, { headers });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, res.statusText || "Failed to load post"));
  }

  return json && json.data ? json.data : null;
}

/**
 * Render a single post into the display container.
 * Includes title, author link, media, body, actions, and comments.
 * @param {Post|null} post - The post object to render, or null.
 * @returns {void}
 */
function renderPost(post) {
  if (!display) return;
  display.innerHTML = "";

  const card = document.createElement("article");
  card.className = "card";

  // Title
  const h = document.createElement("h2");
  h.textContent = post?.title || "Untitled";

  // Meta: by <a>Author</a> · date
  const meta = document.createElement("p");
  meta.className = "muted";
  const authorName = post?.author?.name || "Unknown";
  const createdText = post?.created ? formatDate(post.created) : "";

  meta.textContent = "by ";
  if (authorName !== "Unknown") {
    const a = document.createElement("a");
    a.href = profileUrl(authorName);
    a.textContent = authorName;
    meta.appendChild(a);
  } else {
    meta.append(authorName);
  }
  if (createdText) meta.append(" · " + createdText);

  // Media (if present)
  const media = post?.media || null;
  if (media && typeof media.url === "string" && media.url) {
    const img = document.createElement("img");
    img.src = media.url;
    img.alt = typeof media.alt === "string" ? media.alt : "";
    img.loading = "lazy";
    img.className = "post-media";
    card.appendChild(img);
  }

  // Body
  const body = document.createElement("p");
  body.textContent = post?.body || "";

  // Actions
  const actions = document.createElement("div");
  actions.className = "form-actions";
  const safeId =
    post?.id !== undefined && post?.id !== null ? String(post.id) : "";

  const edit = document.createElement("a");
  edit.className = "btn btn-outline";
  edit.href = "edit-post.html?id=" + encodeURIComponent(safeId);
  edit.textContent = "Edit";

  const delBtn = document.createElement("button");
  delBtn.className = "btn btn-outline";
  delBtn.type = "button";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", function () {
    onDelete(safeId);
  });

  actions.appendChild(edit);
  actions.appendChild(delBtn);

  // Comments
  const commentsWrap = document.createElement("section");
  const cTitle = document.createElement("h3");
  cTitle.textContent = "Comments";
  commentsWrap.appendChild(cTitle);

  const list = Array.isArray(post?.comments) ? post.comments : [];
  if (list.length > 0) {
    for (let i = 0; i < list.length; i += 1) {
      const c = list[i] || {};

      const cardC = document.createElement("article");
      cardC.className = "card";
      cardC.style.padding = "1rem";

      const metaC = document.createElement("p");
      metaC.className = "muted";

      // Prefer v2 author.name, fall back to owner string
      let cAuthor = null;
      if (c?.author?.name) {
        cAuthor = c.author.name;
      } else if (typeof c?.owner === "string" && c.owner) {
        cAuthor = c.owner;
      }

      const cWhen = c?.created ? formatDate(c.created) : "";

      if (cAuthor) {
        metaC.append("by ");
        const ca = document.createElement("a");
        ca.href = profileUrl(cAuthor);
        ca.textContent = cAuthor;
        metaC.appendChild(ca);
      } else {
        metaC.textContent = "Anonymous";
      }
      if (cWhen) metaC.append(" · " + cWhen);

      const cBody = document.createElement("p");
      cBody.textContent = c?.body || "";

      cardC.appendChild(metaC);
      cardC.appendChild(cBody);
      commentsWrap.appendChild(cardC);
    }
  } else {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent = "No comments yet.";
    commentsWrap.appendChild(none);
  }

  // Assemble
  card.appendChild(h);
  card.appendChild(meta);
  card.appendChild(body);
  card.appendChild(actions);
  card.appendChild(commentsWrap);
  display.appendChild(card);
}

/**
 * Delete a post by ID (after user confirmation).
 * Redirects back to the feed on success.
 * @param {string} id - The ID of the post to delete.
 * @returns {Promise<void>}
 */
async function onDelete(id) {
  if (!id) return;
  const ok = window.confirm("Delete this post?");
  if (!ok) return;

  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  const url = BASE_API_URL + "/social/posts/" + encodeURIComponent(id);

  const headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) headers.Authorization = "Bearer " + token;

  showLoader();
  try {
    const res = await fetch(url, { method: "DELETE", headers });

    if (res.status === 204) {
      window.alert("Deleted.");
      window.location.href = "feed.html";
      return;
    }

    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    window.alert(errorFrom(json, "Failed to delete"));
  } finally {
    hideLoader();
  }
}

/**
 * Bootstrap the single post page:
 * - Reads post ID from URL
 * - Fetches the post
 * - Renders it into the page
 * - Shows loader overlay during network call
 * @returns {Promise<void>}
 */
async function main() {
  const id = getId();
  if (!id) {
    if (display) display.textContent = "Missing post id.";
    return;
  }
  showLoader();
  try {
    const post = await fetchPost(id);
    renderPost(post);
  } catch (err) {
    const msg =
      err && typeof err === "object" && err !== null && "message" in err
        ? /** @type {{message?: unknown}} */ (err).message
        : null;
    if (display) {
      display.textContent =
        typeof msg === "string" && msg ? msg : "Could not load post.";
    }
  } finally {
    hideLoader();
  }
}

main();
