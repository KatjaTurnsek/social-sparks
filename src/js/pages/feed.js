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

/** @type {HTMLElement|null} */
const display = document.getElementById("display-container");

/**
 * Build a profile page URL for a given profile name.
 * @param {string} name
 * @returns {string}
 */
function profileUrl(name) {
  return `profile.html?name=${encodeURIComponent(name)}`;
}

/**
 * Read a positive integer query parameter (fallback to default if missing/invalid).
 * @param {string} name
 * @param {number} def
 * @returns {number}
 */
function getIntParam(name, def) {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = parseInt(String(sp.get(name) || ""), 10);
    if (isNaN(v) || v <= 0) return def;
    return v;
  } catch {
    return def;
  }
}

/**
 * Update the current URL (without navigation) with page and pageSize.
 * @param {number} page
 * @param {number} pageSize
 * @returns {void}
 */
function setPageInUrl(page, pageSize) {
  try {
    const sp = new URLSearchParams(window.location.search);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    const qs = sp.toString();
    const base = window.location.pathname;
    const href = qs ? `${base}?${qs}` : base;
    window.history.replaceState(null, "", href);
  } catch {
    // ignore
  }
}

/**
 * Whether the user appears authenticated (has a non-empty bearer token).
 * @returns {boolean}
 */
function isAuthenticated() {
  const raw = getFromLocalStorage("accessToken") || "";
  return !!normalizeBearer(raw);
}

/**
 * Ensure feed list container uses a single-column row layout with consistent gaps.
 * @returns {void}
 */
function applyListContainer() {
  if (!display) return;
  display.classList.add("grid");
  display.style.display = "grid";
  display.style.gridTemplateColumns = "1fr"; // single-column rows
  display.style.gap = "1rem";
}

/**
 * Render a login call-to-action in place of the feed.
 * @param {HTMLElement|null} container
 * @param {string} [msg]
 * @returns {void}
 */
function renderLoginGate(
  container,
  msg = "You need to be logged in to view the feed."
) {
  if (!container) return;
  clear(container);
  applyListContainer();

  const card = document.createElement("article");
  card.className = "card";
  card.style.gridColumn = "1 / -1";

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
 * Fetch all posts (author included, comments excluded), newest first.
 * @returns {Promise<Post[]>}
 * @throws {Error}
 */
async function fetchAllPosts() {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);

  const url = `${BASE_API_URL}/social/posts?_author=true&_comments=false`;

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const res = await fetch(url, { headers });

  /** @type {any} */
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, "Failed to load feed"));
  }

  /** @type {any[]} */
  const data = json?.data ?? (Array.isArray(json) ? json : []);
  if (!Array.isArray(data)) return [];

  return [...data].sort((a, b) => {
    const ta = a?.created ? new Date(a.created).getTime() : 0;
    const tb = b?.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Render a one-card empty/feed-error message with consistent spacing.
 * @param {string} message
 * @returns {void}
 */
function renderEmpty(message) {
  if (!display) return;
  clear(display);
  applyListContainer();

  const card = createEl("article", "card", "");
  card.style.gridColumn = "1 / -1";

  const p = createEl("p", "muted", message || "No posts yet.");
  card.appendChild(p);
  display.appendChild(card);
}

/**
 * Render the paginated feed page (rows layout) with header and pager.
 * @param {Post[]} allPosts
 * @param {number} page
 * @param {number} pageSize
 * @returns {void}
 */
function renderListPage(allPosts, page, pageSize) {
  if (!display) return;
  clear(display);
  applyListContainer();

  if (!allPosts.length) {
    renderEmpty("No posts yet.");
    return;
  }

  const total = allPosts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const slice = [...allPosts].slice(startIndex, endIndex);

  // Header (full width)
  const header = createEl("div", "", "");
  header.style.gridColumn = "1 / -1";

  const h = createEl("h2", "", "Feed");
  const rangeText = `Showing ${startIndex + 1}-${endIndex} of ${total}`;
  const sub = createEl("p", "muted", rangeText);

  header.append(h, sub);
  display.appendChild(header);

  // Posts (single-column rows)
  for (const post of slice) {
    const item = createEl("article", "card", "");

    const title = createEl("h3", "", "");
    title.textContent = post?.title || "Untitled";

    const meta = createEl("p", "muted", "");
    const authorName = post?.author?.name ?? "Unknown";
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
    if (createdText) meta.append(` · ${createdText}`);

    const media = post?.media || null;
    if (typeof media?.url === "string" && media.url) {
      const img = document.createElement("img");
      img.src = media.url;
      img.alt = typeof media?.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-media";
      item.appendChild(img);
    }

    const body = createEl("p", "", post?.body || "");
    if ((body.textContent || "").length > 260) {
      body.textContent = `${(body.textContent || "").slice(0, 257)}...`;
    }

    const actions = createEl("div", "form-actions", "");
    const view = createEl("a", "btn btn-outline", "View");
    const pid = post?.id != null ? String(post.id) : "";
    view.href = `post.html?id=${encodeURIComponent(pid)}`;
    actions.appendChild(view);

    item.append(title, meta, body, actions);
    display.appendChild(item);
  }

  // Pager (full width)
  const pager = createEl("div", "form-actions", "");
  pager.style.gridColumn = "1 / -1";
  pager.style.justifyContent = "space-between";

  const left = createEl("div", "", "");
  const right = createEl("div", "", "");

  const prevBtn = createEl("a", "btn btn-outline", "← Previous");
  const nextBtn = createEl("a", "btn btn-outline", "Next →");

  const info = createEl("span", "muted", "");
  info.textContent = `Page ${page} of ${totalPages}`;

  if (page <= 1) {
    prevBtn.style.pointerEvents = "none";
    prevBtn.style.opacity = "0.6";
  } else {
    prevBtn.href = buildPageLink(page - 1, pageSize);
  }

  if (page >= totalPages) {
    nextBtn.style.pointerEvents = "none";
    nextBtn.style.opacity = "0.6";
  } else {
    nextBtn.href = buildPageLink(page + 1, pageSize);
  }

  left.appendChild(prevBtn);
  right.append(info, nextBtn);

  pager.append(left, right);
  display.appendChild(pager);
}

/**
 * Build a link for a given page/pageSize, preserving other query params if present.
 * @param {number} page
 * @param {number} pageSize
 * @returns {string}
 */
function buildPageLink(page, pageSize) {
  try {
    const sp = new URLSearchParams(window.location.search);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return `${window.location.pathname}?${sp.toString()}`;
  } catch {
    return `feed.html?page=${String(page)}&pageSize=${String(pageSize)}`;
  }
}

/**
 * Initialize the feed page: guard, skeletons, fetch, render, pager wiring.
 * @returns {Promise<void>}
 */
async function main() {
  if (!isAuthenticated()) {
    renderLoginGate(display);
    return;
  }

  const page = getIntParam("page", 1);
  const pageSize = getIntParam("pageSize", 10);

  if (display) {
    clear(display);
    applyListContainer();

    // Header skeleton
    const header = createEl("div", "", "");
    header.style.gridColumn = "1 / -1";
    header.append(createEl("h2", "", "Feed"));
    header.append(createEl("p", "muted", "Loading…"));
    display.appendChild(header);

    // Row skeletons
    [...Array(Math.min(pageSize, 5))].forEach(() => {
      const sk = createEl("div", "card skeleton", "");
      sk.style.height = "140px";
      display.appendChild(sk);
    });
  }

  showLoader();
  try {
    const all = await fetchAllPosts();
    setPageInUrl(page, pageSize);
    renderListPage(all, page, pageSize);
  } catch (e) {
    const msg =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    renderEmpty(typeof msg === "string" && msg ? msg : "Could not load feed.");
  } finally {
    hideLoader();
  }
}

main();
