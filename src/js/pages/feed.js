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

const display = document.getElementById("display-container");

function profileUrl(name) {
  return "profile.html?name=" + encodeURIComponent(name);
}

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

function setPageInUrl(page, pageSize) {
  try {
    const sp = new URLSearchParams(window.location.search);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    const qs = sp.toString();
    const base = window.location.pathname;
    window.history.replaceState(null, "", base + (qs ? "?" + qs : ""));
  } catch {
    // ignore
  }
}

async function fetchAllPosts() {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);

  const url = BASE_API_URL + "/social/posts?_author=true&_comments=false";

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: "Bearer " + token }),
  };

  const res = await fetch(url, { headers });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, "Failed to load feed"));
  }

  let data = [];
  if (json && json.data) {
    data = json.data;
  } else if (Array.isArray(json)) {
    data = json;
  }
  if (!Array.isArray(data)) {
    return [];
  }

  return [...data].sort(function (a, b) {
    const ta = a && a.created ? new Date(a.created).getTime() : 0;
    const tb = b && b.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });
}

function renderEmpty(message) {
  if (!display) return;
  clear(display);
  const card = createEl("article", "card", "");
  const p = createEl("p", "muted", message || "No posts yet.");
  card.appendChild(p);
  display.appendChild(card);
}

function renderListPage(allPosts, page, pageSize) {
  if (!display) return;
  clear(display);

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

  const header = createEl("div", "", "");
  const h = createEl("h2", "", "Feed");

  let rangeText = "Showing " + String(startIndex + 1) + "-" + String(endIndex);
  rangeText += " of " + String(total);

  const sub = createEl("p", "muted", rangeText);
  header.append(h, sub);
  display.appendChild(header);

  for (const post of slice) {
    const item = createEl("article", "card", "");

    const title = createEl("h3", "", "");
    title.textContent = post && post.title ? post.title : "Untitled";

    const meta = createEl("p", "muted", "");
    const authorName =
      post && post.author && post.author.name ? post.author.name : "Unknown";
    const createdText = post && post.created ? formatDate(post.created) : "";

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

    const media = post && post.media ? post.media : null;
    if (media && typeof media.url === "string" && media.url) {
      const img = document.createElement("img");
      img.src = media.url;
      img.alt = media && typeof media.alt === "string" ? media.alt : "";
      img.loading = "lazy";
      img.className = "post-media";
      item.appendChild(img);
    }

    const body = createEl("p", "", post && post.body ? post.body : "");
    if ((body.textContent || "").length > 260) {
      body.textContent = (body.textContent || "").slice(0, 257) + "...";
    }

    const actions = createEl("div", "form-actions", "");
    const view = createEl("a", "btn btn-outline", "View");
    const pid =
      post && post.id !== undefined && post.id !== null ? String(post.id) : "";
    view.href = "post.html?id=" + encodeURIComponent(pid);
    actions.appendChild(view);

    item.append(title, meta, body, actions);
    display.appendChild(item);
  }

  const pager = createEl("div", "form-actions", "");
  pager.style.justifyContent = "space-between";

  const left = createEl("div", "", "");
  const right = createEl("div", "", "");

  const prevBtn = createEl("a", "btn btn-outline", "← Previous");
  const nextBtn = createEl("a", "btn btn-outline", "Next →");

  const info = createEl("span", "muted", "");
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
  right.append(info, nextBtn);

  pager.append(left, right);
  display.appendChild(pager);
}

function buildPageLink(page, pageSize) {
  try {
    const sp = new URLSearchParams(window.location.search);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return window.location.pathname + "?" + sp.toString();
  } catch {
    return "feed.html?page=" + String(page) + "&pageSize=" + String(pageSize);
  }
}

async function main() {
  const page = getIntParam("page", 1);
  const pageSize = getIntParam("pageSize", 10);

  if (display) {
    clear(display);
    const skeletonWrap = createEl("div", "grid", "");
    const skeletons = [...Array(Math.min(pageSize, 5))].map(() => {
      const sk = createEl("div", "card skeleton", "");
      sk.style.height = "140px";
      return sk;
    });
    skeletonWrap.append(...skeletons);
    display.appendChild(skeletonWrap);
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
