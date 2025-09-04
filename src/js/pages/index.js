// @ts-check
/** @typedef {import("../types.js").Post} Post */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";
import { formatDate } from "../shared/dates.js";
import { clear } from "../shared/dom.js";

var displayContainer = document.getElementById("display-container");

// Include authors so we can link usernames
var POSTS_URL =
  BASE_API_URL +
  "/social/posts?_author=true&_comments=false&sort=created&sortOrder=desc";

/** Build a link to a user's profile page (root-level profile.html) */
function profileUrl(name) {
  return "profile.html?name=" + encodeURIComponent(name);
}

/**
 * Render a visible error card to the page.
 * Falls back to a generic message when none provided.
 * Always includes a “View more posts” link after the error.
 * @param {string} message
 * @returns {void}
 */
function renderError(message) {
  if (!displayContainer) return;
  clear(displayContainer);
  var card = document.createElement("article");
  card.className = "card";
  var p = document.createElement("p");
  p.className = "alert error";
  p.textContent = message || "Something went wrong.";
  card.appendChild(p);
  displayContainer.appendChild(card);

  var moreWrap = document.createElement("div");
  moreWrap.className = "form-actions";
  moreWrap.style.justifyContent = "center";
  var more = document.createElement("a");
  more.className = "btn btn-outline";
  more.href = "feed.html";
  more.textContent = "View more posts";
  moreWrap.appendChild(more);
  displayContainer.appendChild(moreWrap);
}

/**
 * Fetch posts from the API and sort newest → oldest.
 * - Attaches API key and Authorization (when present)
 * - Normalizes error messages via `errorFrom`
 * @returns {Promise<Post[]>} Resolves with an array of posts (may be empty).
 * @throws {Error} When the HTTP response is not OK or JSON parsing fails.
 */
async function fetchPosts() {
  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);

  /** @type {Record<string,string>} */
  var headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  var res = await fetch(POSTS_URL, { headers: headers });

  /** @type {any} */
  var json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, res.statusText || "Failed to load posts"));
  }

  /** @type {Post[]} */
  var data = [];
  if (json && json.data && Array.isArray(json.data)) {
    data = json.data;
  } else if (Array.isArray(json)) {
    data = json;
  }

  // newest → oldest (API already sorts, but keep as a guard)
  data.sort(function (a, b) {
    var ta = a && a.created ? new Date(a.created).getTime() : 0;
    var tb = b && b.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });

  return data;
}

/**
 * Render the latest 4 posts as cards with a “View” button,
 * followed by a centered “View more posts” link.
 * @param {Post[]} posts
 * @returns {void}
 */
function renderPosts(posts) {
  if (!displayContainer) return;
  clear(displayContainer);

  // Only show the latest 4
  var latest = Array.isArray(posts) ? posts.slice(0, 4) : [];

  if (!latest.length) {
    var p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No posts yet.";
    displayContainer.appendChild(p);
  } else {
    for (var i = 0; i < latest.length; i += 1) {
      var post = latest[i] || {};

      var card = document.createElement("article");
      card.className = "card";

      var h2 = document.createElement("h2");
      h2.textContent = post && post.title ? post.title : "Untitled";

      // Meta: by <a>Author</a> · date
      var meta = document.createElement("p");
      meta.className = "muted";

      var authorName =
        post && post.author && post.author.name
          ? String(post.author.name)
          : "Unknown";
      var created = post && post.created ? formatDate(post.created) : "";

      meta.textContent = "by ";
      if (authorName !== "Unknown") {
        var a = document.createElement("a");
        a.href = profileUrl(authorName);
        a.textContent = authorName;
        meta.appendChild(a);
      } else {
        meta.append(authorName);
      }
      if (created) meta.append(" · " + created);

      // Media preview if available
      var media = post && post.media ? post.media : null;
      if (media && typeof media.url === "string" && media.url) {
        var img = document.createElement("img");
        img.src = media.url;
        img.alt = media && typeof media.alt === "string" ? media.alt : "";
        img.loading = "lazy";
        img.className = "post-media";
        card.appendChild(img);
      }

      var body = document.createElement("p");
      body.textContent = post && post.body ? post.body : "";

      var actions = document.createElement("div");
      actions.className = "form-actions";

      var view = document.createElement("a");
      view.className = "btn btn-outline";
      var id = post && post.id != null ? post.id : "";
      view.href = "post.html?id=" + encodeURIComponent(String(id));
      view.textContent = "View";

      actions.appendChild(view);

      card.appendChild(h2);
      card.appendChild(meta);
      card.appendChild(body);
      card.appendChild(actions);

      displayContainer.appendChild(card);
    }
  }

  // “View more posts” link under the list (always show)
  var moreWrap = document.createElement("div");
  moreWrap.className = "form-actions";
  moreWrap.style.justifyContent = "center";
  var more = document.createElement("a");
  more.className = "btn btn-outline";
  more.href = "feed.html";
  more.textContent = "View more posts";
  moreWrap.appendChild(more);
  displayContainer.appendChild(moreWrap);
}

/**
 * Page bootstrap:
 * - Shows a small skeleton
 * - Wraps network call in loader overlay
 * - Renders latest posts or an error message
 * @returns {Promise<void>}
 */
async function main() {
  // Optional: small skeleton under the overlay
  if (displayContainer) {
    clear(displayContainer);
    var skeleton = document.createElement("div");
    skeleton.className = "card skeleton";
    skeleton.style.height = "140px";
    displayContainer.appendChild(skeleton);
  }

  showLoader();
  try {
    var posts = await fetchPosts();
    renderPosts(posts);
  } catch (e) {
    var em =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    renderError(typeof em === "string" && em ? em : "Could not load posts.");
  } finally {
    hideLoader();
  }
}

main();
