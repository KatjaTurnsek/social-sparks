// @ts-check
/** @typedef {import("../types.js").Post} Post */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { formatDate } from "../shared/dates.js";
import { clear, createEl } from "../shared/dom.js";
import { normalizeBearer } from "../shared/auth.js";

const display = document.getElementById("display-container");

/**
 * Read the `q` querystring parameter from the current URL.
 * @returns {string} The search query or empty string if not present/invalid.
 */
function getQuery() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("q");
    return v ? String(v) : "";
  } catch {
    return "";
  }
}

/**
 * Search posts via the API.
 * Accepts a query and returns an array of posts (prefers `json.data` when present).
 * @param {string} q
 * @returns {Promise<Post[]>}
 * @throws {Error} When the request fails (message normalized by `errorFrom`).
 */
async function searchPosts(q) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  const url = `${BASE_API_URL}/social/posts/search?q=${encodeURIComponent(q)}`;

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const res = await fetch(url, { headers });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, "Failed to search posts"));
  }

  const data = json?.data ?? json;
  const arr = Array.isArray(data) ? /** @type {Post[]} */ (data) : [];
  return [...arr];
}

/**
 * Ensure the results container uses the same responsive grid spacing
 * as the rest of the app’s cards.
 * @returns {void}
 */
function applyGridContainer() {
  if (!display) return;
  display.classList.add("grid");
  display.style.display = "grid";
  display.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
  display.style.gap = "1rem";
}

/**
 * Render a single card with a muted message (full-width in the grid).
 * @param {string} message
 * @returns {void}
 */
function renderEmpty(message) {
  if (!display) return;
  clear(display);
  applyGridContainer();

  const card = createEl("article", "card", "");
  card.style.gridColumn = "1 / -1";
  const p = createEl("p", "muted", message || "No results.");
  card.appendChild(p);
  display.appendChild(card);
}

/**
 * Render the search header and result cards.
 * @param {string} q Search query (shown in the header).
 * @param {Post[]} results
 * @returns {void}
 */
function renderResults(q, results) {
  if (!display) return;
  clear(display);
  applyGridContainer();

  const header = createEl("div", "", "");
  header.style.gridColumn = "1 / -1";

  const h = createEl("h2", "", "Search");
  const countLabel = results.length === 1 ? "result" : "results";
  const subText = `Query: "${q}" · ${results.length} ${countLabel}`;
  const sub = createEl("p", "muted", subText);

  header.append(h, sub);
  display.appendChild(header);

  if (!results.length) {
    const none = createEl("p", "muted", "No posts matched your search.");
    none.style.gridColumn = "1 / -1";
    display.appendChild(none);
    return;
  }

  for (const post of results) {
    const item = createEl("article", "card", "");

    const title = createEl("h3", "", "");
    title.textContent = post?.title || "Untitled";

    const meta = createEl("p", "muted", "");
    const authorName = post?.author?.name ?? "Unknown";
    const createdText = post?.created ? formatDate(post.created) : "";
    meta.textContent = createdText
      ? `by ${authorName} · ${createdText}`
      : `by ${authorName}`;

    const media = post?.media || null;
    if (typeof media?.url === "string" && media.url) {
      const img = document.createElement("img");
      img.src = media.url;
      img.alt = typeof media?.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-thumb";
      item.appendChild(img);
    }

    const body = createEl("p", "", post?.body || "");
    if ((body.textContent || "").length > 240) {
      body.textContent = `${(body.textContent || "").slice(0, 237)}...`;
    }

    const actions = createEl("div", "form-actions", "");
    const view = createEl("a", "btn btn-outline", "View");
    const pid = post?.id != null ? String(post.id) : "";
    view.href = `post.html?id=${encodeURIComponent(pid)}`;
    actions.appendChild(view);

    item.append(title, meta, body, actions);
    display.appendChild(item);
  }
}

/**
 * Entry point: parse query, show skeletons, perform search, render results.
 * @returns {Promise<void>}
 */
async function main() {
  const q = getQuery();

  if (!q) {
    renderEmpty("Enter a search term, e.g. search.html?q=dogs");
    return;
  }

  if (display) {
    clear(display);
    applyGridContainer();

    const header = createEl("div", "", "");
    header.style.gridColumn = "1 / -1";
    header.append(createEl("h2", "", "Search"));
    header.append(createEl("p", "muted", `Searching for "${q}"…`));
    display.appendChild(header);

    [...Array(3)].forEach(() => {
      const sk = createEl("div", "card skeleton", "");
      sk.style.height = "140px";
      display.appendChild(sk);
    });
  }

  showLoader();
  try {
    const results = await searchPosts(q);
    renderResults(q, results);
  } catch (e) {
    const msg =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    renderEmpty(typeof msg === "string" && msg ? msg : "Search failed.");
  } finally {
    hideLoader();
  }
}

main();
