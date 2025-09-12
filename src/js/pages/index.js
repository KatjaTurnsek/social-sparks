// @ts-check
/** @typedef {import("../types.js").Post} Post */
/** @typedef {import("../types.js").Profile} Profile */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";
import { formatDate } from "../shared/dates.js";
import { clear } from "../shared/dom.js";

/** @type {HTMLElement|null} */ const postsEl =
  document.getElementById("display-container");
/** @type {HTMLElement|null} */ const profilesEl =
  document.getElementById("profiles-container");
/** @type {HTMLElement|null} */ const pagerEl =
  document.getElementById("profiles-pager");
/** @type {HTMLFormElement|null} */ const searchForm = /** @type {any} */ (
  document.getElementById("profile-search-form")
);
/** @type {HTMLInputElement|null} */ const searchInput = /** @type {any} */ (
  document.getElementById("profile-q")
);

const POSTS_URL = `${BASE_API_URL}/social/posts?_author=true&_comments=false&sort=created&sortOrder=desc`;

/**
 * Build a profile link for a given user name.
 * @param {string} name
 * @returns {string}
 */
function profileUrl(name) {
  return `profile.html?name=${encodeURIComponent(name)}`;
}

/**
 * True if we have a non-empty bearer token in storage.
 * @returns {boolean}
 */
function isAuthenticated() {
  const raw = getFromLocalStorage("accessToken") || "";
  return !!normalizeBearer(raw);
}

/**
 * Render a login CTA card into the given container.
 * @param {HTMLElement|null} container
 * @param {string} [msg]
 * @returns {void}
 */
function renderLoginGate(
  container,
  msg = "You need to be logged in to view posts and profiles."
) {
  if (!container) return;
  clear(container);

  if (container.parentElement)
    container.parentElement.style.gridColumn = "1 / -1";
  container.classList.remove("grid");
  container.style.display = "block";
  container.style.gridTemplateColumns = "";
  container.style.gap = "";
  container.style.gridColumn = "1 / -1";
  container.style.width = "100%";
  container.style.maxWidth = "none";

  const card = document.createElement("article");
  card.className = "card";
  card.style.width = "100%";
  card.style.margin = "0";

  const h = document.createElement("h2");
  h.textContent = "Please log in";

  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = msg;

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const login = document.createElement("a");
  login.className = "btn";
  login.href = "login.html";
  login.textContent = "Log in";

  const reg = document.createElement("a");
  reg.className = "btn btn-outline";
  reg.href = "register.html";
  reg.textContent = "Create account";

  actions.append(login, reg);
  card.append(h, p, actions);
  container.appendChild(card);
}

/**
 * Build default API headers including API key and optional bearer token.
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  return {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Fetch latest posts (author included, comments excluded), newest first.
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

  /** @type {any[]} */
  let data = [];
  if (Array.isArray(json?.data)) data = json.data;
  else if (Array.isArray(json)) data = json;

  return [...data].sort((a, b) => {
    const ta = a?.created ? new Date(a.created).getTime() : 0;
    const tb = b?.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Show an error card + “View more posts” link.
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
 * Grab the first sentence (or a short fallback) for card snippets.
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
  return s.length > 140 ? `${s.slice(0, 140).trim()}…` : s;
}

/**
 * Render the “Latest posts” 4-up grid with a “View more posts” CTA.
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

  const latest = Array.isArray(posts) ? [...posts].slice(0, 4) : [];

  if (!latest.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No posts yet.";
    postsEl.appendChild(p);
    return;
  }

  for (const post of latest) {
    const card = document.createElement("article");
    card.className = "card";

    const h2 = document.createElement("h2");
    h2.textContent = post?.title || "Untitled";

    const meta = document.createElement("p");
    meta.className = "muted";
    meta.style.wordBreak = "break-word";

    const authorName = post?.author?.name
      ? String(post.author.name)
      : "Unknown";
    const created = post?.created ? formatDate(post.created) : "";

    meta.textContent = "by ";
    if (authorName !== "Unknown") {
      const a = document.createElement("a");
      a.href = profileUrl(authorName);
      a.textContent = authorName;
      meta.appendChild(a);
    } else {
      meta.append(authorName);
    }
    if (created) meta.append(` · ${created}`);

    const media = post?.media || null;
    if (typeof media?.url === "string" && media.url) {
      const img = document.createElement("img");
      img.src = media.url;
      img.alt = typeof media?.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-media index-post-image";
      card.appendChild(img);
    }

    const body = document.createElement("p");
    body.textContent = firstSentence(post?.body || "");

    const actions = document.createElement("div");
    actions.className = "form-actions";

    const view = document.createElement("a");
    view.className = "btn btn-outline";
    const id = post?.id != null ? post.id : "";
    view.href = `post.html?id=${encodeURIComponent(String(id))}`;
    view.textContent = "View";
    actions.appendChild(view);

    card.append(h2, meta, body, actions);
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
 * Profile list API metadata.
 * @typedef {{ isFirstPage?: boolean, isLastPage?: boolean, currentPage?: number, previousPage?: number|null, nextPage?: number|null, pageCount?: number, totalCount?: number }} Meta
 */

/**
 * Profiles response shape.
 * @typedef {{ list: Profile[], meta: Meta }} ProfilesResult
 */

/**
 * Options for fetching profiles.
 * @typedef {Object} FetchProfilesOptions
 * @property {string} [q]
 * @property {number} [page]
 * @property {number} [limit]
 * @property {"created"|"name"|"updated"} [sort]
 * @property {"asc"|"desc"} [sortOrder]
 */

/**
 * Fetch paginated profiles (optionally searching).
 * @param {FetchProfilesOptions} [opts]
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

  const url = `${BASE_API_URL}${path}?${sp.toString()}`;
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
  const list = (Array.isArray(json?.data) ? json.data : []) || [];
  /** @type {Meta} */
  const meta = json?.meta || {};
  return { list: [...list], meta: { ...meta } };
}

/**
 * Show an error card in the profiles panel and clear pager.
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
 * Render a responsive grid of profile cards.
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

  const items = [...profiles];
  for (const person of items) {
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
    if (person?.avatar?.url) {
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
    nm.textContent = person?.name || "Unknown";

    const actions = document.createElement("div");
    actions.className = "form-actions";
    const btn = document.createElement("a");
    btn.className = "btn btn-outline";
    btn.href = profileUrl(person?.name || "");
    btn.textContent = "View";
    actions.appendChild(btn);

    info.appendChild(nm);
    row.append(avatar, info);
    card.append(row, actions);
    profilesEl.appendChild(card);
  }
}

/**
 * Render a Previous/Next pager for profiles.
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
  right.append(info, next);

  pagerEl.append(left, right);
}

/** @type {{ q: string, page: number, limit: number }} */
let state = { q: "", page: 1, limit: 12 };

/**
 * Fetch + render profiles for current state (and wire the pager).
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
      state = { ...state, page: newPage };
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
 * Bootstrap the home page: gate by auth, show skeletons, fetch posts & profiles, wire search.
 * @returns {Promise<void>}
 */
async function main() {
  if (!isAuthenticated()) {
    if (profilesEl) profilesEl.style.display = "none";
    if (pagerEl) pagerEl.style.display = "none";
    renderLoginGate(postsEl);
    return;
  }

  // Skeletons
  if (postsEl) {
    clear(postsEl);
    const skWrap = document.createElement("div");
    skWrap.style.display = "grid";
    skWrap.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    skWrap.style.gap = "1rem";
    const skeletons = [...Array(4)].map(() => {
      const sk = document.createElement("div");
      sk.className = "card skeleton";
      sk.style.height = "160px";
      return sk;
    });
    skWrap.append(...skeletons);
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

  // Profile search
  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      state = { ...state, q: searchInput.value.trim(), page: 1 };
      showLoader();
      loadProfiles().finally(hideLoader);
    });
  }
}

main();
