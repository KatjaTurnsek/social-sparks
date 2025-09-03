import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { formatDate } from "../shared/dates.js";
import { normalizeBearer } from "../shared/auth.js";

const display = document.getElementById("display-container");

function getId() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("id");
    return v ? v : "";
  } catch {
    return "";
  }
}

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

function renderPost(post) {
  if (!display) return;
  display.innerHTML = "";

  const card = document.createElement("article");
  card.className = "card";

  const h = document.createElement("h2");
  h.textContent = post && post.title ? post.title : "Untitled";

  const meta = document.createElement("p");
  meta.className = "muted";
  const authorName =
    post && post.author && post.author.name ? post.author.name : "Unknown";
  const createdText = post && post.created ? formatDate(post.created) : "";
  meta.textContent =
    "by " + authorName + (createdText ? " · " + createdText : "");

  // NEW: media preview if present
  const media = post && post.media ? post.media : null;
  if (media && typeof media.url === "string" && media.url) {
    const img = document.createElement("img");
    img.src = media.url;
    img.alt = media && typeof media.alt === "string" ? media.alt : "";
    img.loading = "lazy";
    img.className = "post-media";
    card.appendChild(img);
  }

  const body = document.createElement("p");
  body.textContent = post && post.body ? post.body : "";

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const edit = document.createElement("a");
  edit.className = "btn btn-outline";
  const safeId =
    post && post.id !== undefined && post.id !== null ? String(post.id) : "";
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

  const commentsWrap = document.createElement("section");
  const cTitle = document.createElement("h3");
  cTitle.textContent = "Comments";
  commentsWrap.appendChild(cTitle);

  const list = Array.isArray(post && post.comments) ? post.comments : [];

  if (list.length > 0) {
    for (let i = 0; i < list.length; i += 1) {
      const c = list[i] || {};

      const cardC = document.createElement("article");
      cardC.className = "card";
      cardC.style.padding = "1rem";

      const metaC = document.createElement("p");
      metaC.className = "muted";

      let cAuthor = "Anonymous";
      if (c && c.author && typeof c.author.name === "string" && c.author.name) {
        cAuthor = c.author.name;
      } else if (c && typeof c.owner === "string" && c.owner) {
        cAuthor = c.owner;
      }

      const cWhen = c && c.created ? formatDate(c.created) : "";
      metaC.textContent = cAuthor + (cWhen ? " · " + cWhen : "");

      const cBody = document.createElement("p");
      cBody.textContent = c && c.body ? c.body : "";

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

  card.appendChild(h);
  card.appendChild(meta);
  card.appendChild(body);
  card.appendChild(actions);
  card.appendChild(commentsWrap);
  display.appendChild(card);
}

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
    const res = await fetch(url, {
      method: "DELETE",
      headers,
    });

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
