// @ts-check
/** @typedef {import("../types.js").Post} Post */
/** @typedef {import("../types.js").Profile} Profile */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";
import { formatDate } from "../shared/dates.js";
import { clear } from "../shared/dom.js";

const postsEl = document.getElementById("display-container");
const profilesEl = document.getElementById("profiles-container");
const pagerEl = document.getElementById("profiles-pager");
const searchForm = /** @type {HTMLFormElement|null} */ (
  document.getElementById("profile-search-form")
);
const searchInput = /** @type {HTMLInputElement|null} */ (
  document.getElementById("profile-q")
);

const POSTS_URL =
  BASE_API_URL +
  "/social/posts?_author=true&_comments=false&sort=created&sortOrder=desc";

/**
 * Build a link to a user's profile page.
 * @param {string} name
 * @returns {string}
 */
function profileUrl(name) {
  return "profile.html?name=" + encodeURIComponent(name);
}

/**
 * Build common headers with API key and optional bearer token.
 * @returns {Record<string,string>}
 */
function buildHeaders() {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  /** @type {Record<string,string>} */
  const headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) headers.Authorization = "Bearer " + token;
  return headers;
}

/**
 * Fetch latest posts (author included).
 * @returns {Promise<Post[]>}
 * @throws {Error}
 */
async function fetchPosts() {
  const res = await fetch(POSTS_URL, { headers: buildHeaders() });

  /** @type {any} */
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, res.statusText || "Failed to load posts"));
  }

  /** @type {Post[]} */
  let data = [];
  if (json && Array.isArray(json.data)) data = json.data;
  else if (Array.isArray(json)) data = json;

  data.sort((a, b) => {
    const ta = a && a.created ? new Date(a.created).getTime() : 0;
    const tb = b && b.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });

  return data;
}

/**
 * Render an error card for posts.
 * @param {string} message
 * @returns {void}
 */
function renderPostsError(message) {
  if (!postsEl) return;
  clear(postsEl);
  const card = document.createElement("article");
  card.className = "card";
  const p = document.createElement("p");
  p.className = "alert error";
  p.textContent = message || "Something went wrong.";
  card.appendChild(p);
  postsEl.appendChild(card);

  const moreWrap = document.createElement("div");
  moreWrap.className = "form-actions";
  moreWrap.style.justifyContent = "center";
  const more = document.createElement("a");
  more.className = "btn btn-outline";
  more.href = "feed.html";
  more.textContent = "View more posts";
  moreWrap.appendChild(more);
  postsEl.appendChild(moreWrap);
}

/**
 * Return only the first sentence of a block of text.
 * Falls back to the first 140 characters if no sentence terminator is found.
 * @param {string} text
 * @returns {string}
 */
function firstSentence(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === "." || ch === "!" || ch === "?") {
      return s.slice(0, i + 1).trim();
    }
    if (ch === "\n") {
      return s.slice(0, i).trim();
    }
  }
  return s.length > 140 ? s.slice(0, 140).trim() + "…" : s;
}

/**
 * Render up to four latest posts in a 4-column grid.
 * Only the first sentence of the body is shown.
 * @param {Post[]} posts
 * @returns {void}
 */
function renderPosts(posts) {
  if (!postsEl) return;
  clear(postsEl);

  postsEl.classList.add("grid");
  postsEl.style.display = "grid";
  postsEl.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  postsEl.style.gap = "1rem";

  const latest = Array.isArray(posts) ? posts.slice(0, 4) : [];

  if (!latest.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No posts yet.";
    postsEl.appendChild(p);
    return;
  }

  for (let i = 0; i < latest.length; i += 1) {
    const post = latest[i] || {};

    const card = document.createElement("article");
    card.className = "card";

    const h2 = document.createElement("h2");
    h2.textContent = post && post.title ? post.title : "Untitled";

    const meta = document.createElement("p");
    meta.className = "muted";
    meta.style.wordBreak = "break-word";
    const authorName =
      post && post.author && post.author.name
        ? String(post.author.name)
        : "Unknown";
    const created = post && post.created ? formatDate(post.created) : "";
    meta.textContent = "by ";
    if (authorName !== "Unknown") {
      const a = document.createElement("a");
      a.href = profileUrl(authorName);
      a.textContent = authorName;
      meta.appendChild(a);
    } else {
      meta.append(authorName);
    }
    if (created) meta.append(" · " + created);

    const media = post && post.media ? post.media : null;
    if (media && typeof media.url === "string" && media.url) {
      const img = document.createElement("img");
      img.src = media.url;
      img.alt = media && typeof media.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-media index-post-image";
      card.appendChild(img);
    }

    const body = document.createElement("p");
    body.textContent = firstSentence(post && post.body ? post.body : "");

    const actions = document.createElement("div");
    actions.className = "form-actions";

    const view = document.createElement("a");
    view.className = "btn btn-outline";
    const id = post && post.id != null ? post.id : "";
    view.href = "post.html?id=" + encodeURIComponent(String(id));
    view.textContent = "View";
    actions.appendChild(view);

    card.appendChild(h2);
    card.appendChild(meta);
    card.appendChild(body);
    card.appendChild(actions);

    postsEl.appendChild(card);
  }

  const moreWrap = document.createElement("div");
  moreWrap.className = "form-actions";
  moreWrap.style.gridColumn = "1/-1";
  moreWrap.style.justifyContent = "center";
  const more = document.createElement("a");
  more.className = "btn btn-outline";
  more.href = "feed.html";
  more.textContent = "View more posts";
  moreWrap.appendChild(more);
  postsEl.appendChild(moreWrap);
}

/**
 * @typedef {{ isFirstPage?: boolean, isLastPage?: boolean, currentPage?: number, previousPage?: number|null, nextPage?: number|null, pageCount?: number, totalCount?: number }} Meta
 * @typedef {{ list: Profile[], meta: Meta }} ProfilesResult
 */

/**
 * Fetch profiles (optionally search) with pagination.
 * @param {{ q?: string, page?: number, limit?: number, sort?: string, sortOrder?: "asc"|"desc" }} [opts]
 * @returns {Promise<ProfilesResult>}
 * @throws {Error}
 */
async function fetchProfiles(opts = {}) {
  const q = opts.q || "";
  const page = Math.max(1, opts.page || 1);
  const limit = Math.max(1, Math.min(100, opts.limit || 12));
  const sort = opts.sort || "created";
  const sortOrder = opts.sortOrder || "desc";

  const path = q ? "/social/profiles/search" : "/social/profiles";
  const sp = new URLSearchParams();
  sp.set("limit", String(limit));
  sp.set("page", String(page));
  sp.set("sort", sort);
  sp.set("sortOrder", sortOrder);
  if (q) sp.set("q", q);

  const url = BASE_API_URL + path + "?" + sp.toString();
  const res = await fetch(url, { headers: buildHeaders() });

  /** @type {any} */
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) throw new Error(errorFrom(json, "Failed to load profiles"));

  /** @type {Profile[]} */
  const list = (json && Array.isArray(json.data) ? json.data : []) || [];
  /** @type {Meta} */
  const meta = (json && json.meta) || {};
  return { list, meta };
}

/**
 * Render an error card for profiles.
 * @param {string} message
 * @returns {void}
 */
function renderProfilesError(message) {
  if (!profilesEl) return;
  clear(profilesEl);
  const card = document.createElement("article");
  card.className = "card";
  const p = document.createElement("p");
  p.className = "alert error";
  p.textContent = message || "Could not load profiles.";
  card.appendChild(p);
  profilesEl.appendChild(card);

  if (pagerEl) {
    clear(pagerEl);
  }
}

/**
 * Render a responsive grid of compact profile cards (no bio).
 * @param {Profile[]} profiles
 * @returns {void}
 */
function renderProfilesList(profiles) {
  if (!profilesEl) return;
  clear(profilesEl);

  profilesEl.classList.add("grid");
  profilesEl.style.display = "grid";
  profilesEl.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  profilesEl.style.gap = "1rem";

  if (!profiles.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No profiles found.";
    profilesEl.appendChild(p);
    return;
  }

  profiles.forEach((person) => {
    const card = document.createElement("article");
    card.className = "card";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "0.75rem";
    row.style.alignItems = "center";

    const avatar = document.createElement("img");
    avatar.style.width = "48px";
    avatar.style.height = "48px";
    avatar.style.borderRadius = "999px";
    avatar.style.objectFit = "cover";
    if (person && person.avatar && person.avatar.url) {
      avatar.src = person.avatar.url;
      avatar.alt = person.avatar.alt || "";
    } else {
      avatar.style.display = "none";
    }

    const info = document.createElement("div");
    const nm = document.createElement("p");
    nm.style.margin = "0";
    nm.style.fontWeight = "600";
    nm.style.wordBreak = "break-word";
    nm.textContent = person && person.name ? person.name : "Unknown";

    const actions = document.createElement("div");
    actions.className = "form-actions";
    const btn = document.createElement("a");
    btn.className = "btn btn-outline";
    btn.href = profileUrl(person?.name || "");
    btn.textContent = "View";
    actions.appendChild(btn);

    info.appendChild(nm);

    row.appendChild(avatar);
    row.appendChild(info);

    card.appendChild(row);
    card.appendChild(actions);

    profilesEl.appendChild(card);
  });
}

/**
 * Render pager controls.
 * @param {Meta} meta
 * @param {(page:number)=>void} go
 * @returns {void}
 */
function renderPager(meta, go) {
  if (!pagerEl) return;
  clear(pagerEl);

  const left = document.createElement("div");
  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "0.5rem";

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "btn btn-outline";
  prev.textContent = "← Previous";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "btn btn-outline";
  next.textContent = "Next →";

  const info = document.createElement("span");
  info.className = "muted";
  const page = meta.currentPage || 1;
  const pages = meta.pageCount || 1;
  info.textContent = `Page ${page} of ${pages}`;

  const prevPage = meta.previousPage || (meta.isFirstPage ? null : null);
  const nextPage = meta.nextPage || (meta.isLastPage ? null : null);

  if (!prevPage) {
    prev.disabled = true;
    prev.style.opacity = "0.6";
  } else {
    prev.addEventListener("click", () => go(prevPage));
  }

  if (!nextPage) {
    next.disabled = true;
    next.style.opacity = "0.6";
  } else {
    next.addEventListener("click", () => go(nextPage));
  }

  left.appendChild(prev);
  right.appendChild(info);
  right.appendChild(next);

  pagerEl.appendChild(left);
  pagerEl.appendChild(right);
}

/* --------------------------------- bootstrap -------------------------------- */

const state = {
  q: "",
  page: 1,
  limit: 12,
};

/**
 * Load and render the profiles list and pager for current state.
 * @returns {Promise<void>}
 */
async function loadProfiles() {
  try {
    const { list, meta } = await fetchProfiles({
      q: state.q,
      page: state.page,
      limit: state.limit,
      sort: "created",
      sortOrder: "desc",
    });
    renderProfilesList(list);
    renderPager(meta, (newPage) => {
      state.page = newPage;
      showLoader();
      loadProfiles().finally(hideLoader);
    });
  } catch (e) {
    const msg =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    renderProfilesError(
      typeof msg === "string" && msg ? msg : "Could not load profiles."
    );
  }
}

/**
 * Initialize the index page (latest posts + profiles list).
 * @returns {Promise<void>}
 */
async function main() {
  if (postsEl) {
    clear(postsEl);
    const skWrap = document.createElement("div");
    skWrap.style.display = "grid";
    skWrap.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    skWrap.style.gap = "1rem";
    for (let i = 0; i < 4; i++) {
      const sk = document.createElement("div");
      sk.className = "card skeleton";
      sk.style.height = "160px";
      skWrap.appendChild(sk);
    }
    postsEl.appendChild(skWrap);
  }
  if (profilesEl) {
    clear(profilesEl);
    const sk = document.createElement("div");
    sk.className = "card skeleton";
    sk.style.height = "120px";
    profilesEl.appendChild(sk);
  }

  showLoader();
  try {
    const posts = await fetchPosts();
    renderPosts(posts);
    await loadProfiles();
  } catch (e) {
    const em =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    renderPostsError(
      typeof em === "string" && em ? em : "Could not load posts."
    );
  } finally {
    hideLoader();
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      state.q = searchInput.value.trim();
      state.page = 1;
      showLoader();
      loadProfiles().finally(hideLoader);
    });
  }
}

main();
