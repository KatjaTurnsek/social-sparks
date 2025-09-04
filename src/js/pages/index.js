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

// Profiles UI elements
const profilesEl = document.getElementById("profiles-container");
const pagerEl = document.getElementById("profiles-pager");
const searchForm = /** @type {HTMLFormElement|null} */ (
  document.getElementById("profile-search-form")
);
const searchInput = /** @type {HTMLInputElement|null} */ (
  document.getElementById("profile-q")
);

// Include authors so we can link usernames (sorted newest→oldest)
const POSTS_URL =
  BASE_API_URL +
  "/social/posts?_author=true&_comments=false&sort=created&sortOrder=desc";

/** Build a link to a user's profile page (root-level profile.html) */
function profileUrl(name) {
  return "profile.html?name=" + encodeURIComponent(name);
}

/** Build common headers with API key and optional token */
function buildHeaders() {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  /** @type {Record<string,string>} */
  const headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) headers.Authorization = "Bearer " + token;
  return headers;
}

/* ------------------ Posts: last 4 in a 4-column grid --------------------- */

/** @returns {Promise<Post[]>} */
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

  // newest → oldest (API already sorts; keep as guard)
  data.sort((a, b) => {
    const ta = a && a.created ? new Date(a.created).getTime() : 0;
    const tb = b && b.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });

  return data;
}

/** @param {string} message */
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

/** @param {Post[]} posts */
function renderPosts(posts) {
  if (!postsEl) return;
  clear(postsEl);

  // Force a responsive 4-col grid (degrades to fewer cols on narrow screens)
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

    // Meta: by <a>Author</a> · date
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.style.wordBreak = "break-word"; // prevent overflow on long usernames
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

    // Media preview if available
    const media = post && post.media ? post.media : null;
    if (media && typeof media.url === "string" && media.url) {
      const img = document.createElement("img");
      img.src = media.url;
      img.alt = media && typeof media.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-media index-post-image"; // class for uniform height
      card.appendChild(img);
    }

    const body = document.createElement("p");
    body.textContent = post && post.body ? post.body : "";

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

  // “View more posts” link under the list (always show)
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

/* ---------------------- Profiles: list + search + pager ------------------- */

/**
 * @typedef {{ isFirstPage?: boolean, isLastPage?: boolean, currentPage?: number, previousPage?: number|null, nextPage?: number|null, pageCount?: number, totalCount?: number }} Meta
 * @typedef {{ list: Profile[], meta: Meta }} ProfilesResult
 */

/**
 * Fetch profiles (optionally search) with pagination.
 * Uses:
 * - GET /social/profiles?limit=&page=
 * - GET /social/profiles/search?q=&limit=&page=
 * @param {{ q?: string, page?: number, limit?: number, sort?: string, sortOrder?: "asc"|"desc" }} opts
 * @returns {Promise<ProfilesResult>}
 */
async function fetchProfiles(opts = {}) {
  const q = opts.q || "";
  const page = Math.max(1, opts.page || 1);
  const limit = Math.max(1, Math.min(100, opts.limit || 12)); // ← 12 per page
  const sort = opts.sort || "created"; // ← newest first
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

/** @param {string} message */
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

/** @param {Profile[]} profiles */
function renderProfilesList(profiles) {
  if (!profilesEl) return;
  clear(profilesEl);

  // Responsive grid for compact profile cards (auto-wraps)
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
    nm.style.wordBreak = "break-word"; // avoid overflow for very long names
    nm.textContent = person && person.name ? person.name : "Unknown";

    const bi = document.createElement("p");
    bi.className = "muted";
    bi.style.margin = "0";
    bi.textContent = (person && person.bio) || "";

    const actions = document.createElement("div");
    actions.className = "form-actions";
    const btn = document.createElement("a");
    btn.className = "btn btn-outline";
    btn.href = profileUrl(person?.name || "");
    btn.textContent = "View";
    actions.appendChild(btn);

    info.appendChild(nm);
    info.appendChild(bi);

    row.appendChild(avatar);
    row.appendChild(info);

    card.appendChild(row);
    card.appendChild(actions);

    profilesEl.appendChild(card);
  });
}

/**
 * @param {Meta} meta
 * @param {(page:number)=>void} go
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

/* ------------------------------ bootstrap -------------------------------- */

const state = {
  q: "",
  page: 1,
  limit: 12, // ← show 12 profiles per page
};

async function loadProfiles() {
  try {
    const { list, meta } = await fetchProfiles({
      q: state.q,
      page: state.page,
      limit: state.limit,
      sort: "created", // ← newest profiles
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

/** Boot the page */
async function main() {
  // Quick skeletons
  if (postsEl) {
    clear(postsEl);
    // show 4 skeleton cards to reflect the 4-column layout
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

  // Wire search
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
