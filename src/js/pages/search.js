// @ts-check
/** @typedef {import("../types.js").Post} Post */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { formatDate } from "../shared/dates.js";
import { clear, createEl } from "../shared/dom.js";
import { normalizeBearer } from "../shared/auth.js";

var display = document.getElementById("display-container");

/**
 * Read the current "q" query parameter.
 * @returns {string}
 */
function getQuery() {
  try {
    var sp = new URLSearchParams(window.location.search);
    var v = sp.get("q");
    return v ? String(v) : "";
  } catch {
    return "";
  }
}

/**
 * Search posts via API using the "q" parameter.
 * Attaches API key and Authorization (if available).
 * @param {string} q
 * @returns {Promise<Post[]>}
 * @throws {Error} When the API request fails or returns non-OK.
 */
async function searchPosts(q) {
  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);
  var url = BASE_API_URL + "/social/posts/search?q=" + encodeURIComponent(q);

  var headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) headers.Authorization = "Bearer " + token;

  var res = await fetch(url, { headers });

  var json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, "Failed to search posts"));
  }

  var data = json && json.data ? json.data : json;
  return Array.isArray(data) ? /** @type {Post[]} */ (data) : [];
}

/**
 * Render a minimal empty state message.
 * @param {string} message
 * @returns {void}
 */
function renderEmpty(message) {
  if (!display) return;
  clear(display);

  var card = createEl("article", "card", "");
  var p = createEl("p", "muted", message || "No results.");
  card.appendChild(p);
  display.appendChild(card);
}

/**
 * Render search results list with header/count.
 * @param {string} q
 * @param {Post[]} results
 * @returns {void}
 */
function renderResults(q, results) {
  if (!display) return;
  clear(display);

  var header = createEl("div", "", "");
  var h = createEl("h2", "", "Search");

  var countLabel = results.length === 1 ? " result" : " results";
  var subText = 'Query: "' + q + '" · ' + String(results.length) + countLabel;

  var sub = createEl("p", "muted", subText);
  header.appendChild(h);
  header.appendChild(sub);
  display.appendChild(header);

  if (!results.length) {
    var none = createEl("p", "muted", "No posts matched your search.");
    display.appendChild(none);
    return;
  }

  for (var i = 0; i < results.length; i += 1) {
    var post = results[i] || {};

    var item = createEl("article", "card", "");

    var title = createEl("h3", "", "");
    title.textContent = post && post.title ? post.title : "Untitled";

    var meta = createEl("p", "muted", "");
    var authorName =
      post && post.author && post.author.name ? post.author.name : "Unknown";
    var createdText = post && post.created ? formatDate(post.created) : "";
    meta.textContent =
      "by " + authorName + (createdText ? " · " + createdText : "");

    var media = post && post.media ? post.media : null;
    if (media && typeof media.url === "string" && media.url) {
      var img = document.createElement("img");
      img.src = media.url;
      img.alt = media && typeof media.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-thumb";
      item.appendChild(img);
    }

    var body = createEl("p", "", post && post.body ? post.body : "");
    if (body.textContent.length > 240) {
      body.textContent = body.textContent.slice(0, 237) + "...";
    }

    var actions = createEl("div", "form-actions", "");
    var view = createEl("a", "btn btn-outline", "View");
    var pid = "";
    if (post && post.id !== undefined && post.id !== null) {
      pid = String(post.id);
    }
    view.href = "post.html?id=" + encodeURIComponent(pid);
    actions.appendChild(view);

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(body);
    item.appendChild(actions);
    display.appendChild(item);
  }
}

/**
 * Bootstrap the search page: parse query, fetch, render.
 * @returns {Promise<void>}
 */
async function main() {
  var q = getQuery();

  if (!q) {
    renderEmpty("Enter a search term, e.g. search.html?q=dogs");
    return;
  }

  if (display) {
    clear(display);
    var skeletonWrap = createEl("div", "grid", "");
    for (var i = 0; i < 3; i += 1) {
      var sk = createEl("div", "card skeleton", "");
      sk.style.height = "140px";
      skeletonWrap.appendChild(sk);
    }
    display.appendChild(skeletonWrap);
  }

  showLoader();
  try {
    var results = await searchPosts(q);
    renderResults(q, results);
  } catch (e) {
    var msg =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    renderEmpty(typeof msg === "string" && msg ? msg : "Search failed.");
  } finally {
    hideLoader();
  }
}

main();
