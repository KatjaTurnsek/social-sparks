// @ts-check
/** @typedef {import("../types.js").Post} Post */
/** @typedef {import("../types.js").Profile} Profile */
/** @typedef {import("../types.js").Comment} Comment */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { formatDate } from "../shared/dates.js";
import { clear, createEl } from "../shared/dom.js";
import { normalizeBearer } from "../shared/auth.js";

var display = document.getElementById("display-container");

/**
 * Build a link to a user's profile page.
 * @param {string} name
 * @returns {string}
 */
function profileUrl(name) {
  return "profile.html?name=" + encodeURIComponent(name);
}

/**
 * Read an integer query param or return a default.
 * @param {string} name
 * @param {number} def
 * @returns {number}
 */
function getIntParam(name, def) {
  try {
    var sp = new URLSearchParams(window.location.search);
    var v = parseInt(String(sp.get(name) || ""), 10);
    if (isNaN(v) || v <= 0) return def;
    return v;
  } catch {
    return def;
  }
}

/**
 * Reflect the current page/pageSize in the URL (without navigation).
 * @param {number} page
 * @param {number} pageSize
 * @returns {void}
 */
function setPageInUrl(page, pageSize) {
  try {
    var sp = new URLSearchParams(window.location.search);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    var qs = sp.toString();
    var base = window.location.pathname;
    window.history.replaceState(null, "", base + (qs ? "?" + qs : ""));
  } catch {
    // ignore
  }
}

/**
 * Fetch all posts (newest first).
 * Attaches API key and Authorization (when available).
 * @returns {Promise<Post[]>}
 * @throws {Error} When the API request fails or returns non-OK.
 */
async function fetchAllPosts() {
  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);

  var url = BASE_API_URL + "/social/posts?_author=true&_comments=false";

  /** @type {Record<string,string>} */
  var headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  var res = await fetch(url, { headers: headers });

  var json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, "Failed to load feed"));
  }

  /** @type {any} */
  var data = [];
  if (json && json.data) {
    data = json.data;
  } else if (Array.isArray(json)) {
    data = json;
  }
  if (!Array.isArray(data)) {
    return [];
  }

  data.sort(function (a, b) {
    var ta = a && a.created ? new Date(a.created).getTime() : 0;
    var tb = b && b.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });

  return /** @type {Post[]} */ (data);
}

/**
 * Render the empty-state card with a message.
 * @param {string} message
 * @returns {void}
 */
function renderEmpty(message) {
  if (!display) return;
  clear(display);
  var card = createEl("article", "card", "");
  var p = createEl("p", "muted", message || "No posts yet.");
  card.appendChild(p);
  display.appendChild(card);
}

/**
 * Render a paginated slice of posts into the page.
 * @param {Post[]} allPosts
 * @param {number} page 1-based page number
 * @param {number} pageSize items per page
 * @returns {void}
 */
function renderListPage(allPosts, page, pageSize) {
  if (!display) return;
  clear(display);

  if (!allPosts.length) {
    renderEmpty("No posts yet.");
    return;
  }

  var total = allPosts.length;
  var totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;
  var startIndex = (page - 1) * pageSize;
  var endIndex = Math.min(startIndex + pageSize, total);
  var slice = allPosts.slice(startIndex, endIndex);

  var header = createEl("div", "", "");
  var h = createEl("h2", "", "Feed");

  var rangeText = "Showing " + String(startIndex + 1) + "-" + String(endIndex);
  rangeText += " of " + String(total);

  var sub = createEl("p", "muted", rangeText);
  header.appendChild(h);
  header.appendChild(sub);
  display.appendChild(header);

  for (var i = 0; i < slice.length; i += 1) {
    var post = slice[i] || {};

    var item = createEl("article", "card", "");

    var title = createEl("h3", "", "");
    title.textContent = post && post.title ? post.title : "Untitled";

    var meta = createEl("p", "muted", "");
    var authorName =
      post && post.author && post.author.name ? post.author.name : "Unknown";
    var createdText = post && post.created ? formatDate(post.created) : "";

    meta.textContent = "by ";
    if (authorName !== "Unknown") {
      var a = document.createElement("a");
      a.href = profileUrl(authorName);
      a.textContent = authorName;
      meta.appendChild(a);
    } else {
      meta.append(authorName);
    }
    if (createdText) meta.append(" · " + createdText);

    var media = post && post.media ? post.media : null;
    if (media && typeof media.url === "string" && media.url) {
      var img = document.createElement("img");
      img.src = media.url;
      img.alt = media && typeof media.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-media";
      item.appendChild(img);
    }

    var body = createEl("p", "", post && post.body ? post.body : "");
    if (body.textContent.length > 260) {
      body.textContent = body.textContent.slice(0, 257) + "...";
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

  var pager = createEl("div", "form-actions", "");
  pager.style.justifyContent = "space-between";

  var left = createEl("div", "", "");
  var right = createEl("div", "", "");

  var prevBtn = createEl("a", "btn btn-outline", "← Previous");
  var nextBtn = createEl("a", "btn btn-outline", "Next →");

  var info = createEl("span", "muted", "");
  info.textContent = "Page " + String(page) + " of " + String(totalPages);

  if (page <= 1) {
    prevBtn.className = "btn btn-outline";
    prevBtn.style.pointerEvents = "none";
    prevBtn.style.opacity = "0.6";
  } else {
    prevBtn.href = buildPageLink(page - 1, pageSize);
  }

  if (page >= totalPages) {
    nextBtn.className = "btn btn-outline";
    nextBtn.style.pointerEvents = "none";
    nextBtn.style.opacity = "0.6";
  } else {
    nextBtn.href = buildPageLink(page + 1, pageSize);
  }

  left.appendChild(prevBtn);
  right.appendChild(info);
  right.appendChild(nextBtn);

  pager.appendChild(left);
  pager.appendChild(right);
  display.appendChild(pager);
}

/**
 * Build a URL pointing to the given page with pageSize preserved.
 * @param {number} page
 * @param {number} pageSize
 * @returns {string}
 */
function buildPageLink(page, pageSize) {
  try {
    var sp = new URLSearchParams(window.location.search);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return window.location.pathname + "?" + sp.toString();
  } catch {
    return "feed.html?page=" + String(page) + "&pageSize=" + String(pageSize);
  }
}

/**
 * Boot the feed page: fetch, render, and wire pagination.
 * @returns {Promise<void>}
 */
async function main() {
  var page = getIntParam("page", 1);
  var pageSize = getIntParam("pageSize", 10);

  if (display) {
    clear(display);
    var skeletonWrap = createEl("div", "grid", "");
    for (var i = 0; i < Math.min(pageSize, 5); i += 1) {
      var sk = createEl("div", "card skeleton", "");
      sk.style.height = "140px";
      skeletonWrap.appendChild(sk);
    }
    display.appendChild(skeletonWrap);
  }

  showLoader();
  try {
    var all = await fetchAllPosts();
    setPageInUrl(page, pageSize);
    renderListPage(all, page, pageSize);
  } catch (e) {
    var msg =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    renderEmpty(typeof msg === "string" && msg ? msg : "Could not load feed.");
  } finally {
    hideLoader();
  }
}

main();
