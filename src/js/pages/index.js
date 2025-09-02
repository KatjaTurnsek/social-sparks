import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";
import { formatDate } from "../shared/dates.js";
import { clear } from "../shared/dom.js";

var displayContainer = document.getElementById("display-container");
var POSTS_URL = BASE_API_URL + "/social/posts";

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
}

async function fetchPosts() {
  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);

  var headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  var res = await fetch(POSTS_URL, { headers: headers });

  var json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, res.statusText || "Failed to load posts"));
  }

  var data = [];
  if (json && json.data && Array.isArray(json.data)) {
    data = json.data;
  } else if (Array.isArray(json)) {
    data = json;
  }

  data.sort(function (a, b) {
    var ta = a && a.created ? new Date(a.created).getTime() : 0;
    var tb = b && b.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });

  return data;
}

function renderPosts(posts) {
  if (!displayContainer) return;
  clear(displayContainer);

  if (!posts || posts.length === 0) {
    var p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No posts yet.";
    displayContainer.appendChild(p);
    return;
  }

  for (var i = 0; i < posts.length; i += 1) {
    var post = posts[i] || {};

    var card = document.createElement("article");
    card.className = "card";

    var h2 = document.createElement("h2");
    h2.textContent = post && post.title ? post.title : "Untitled";

    var meta = document.createElement("p");
    meta.className = "muted";

    var authorName = "Unknown";
    if (post && post.author && post.author.name) {
      authorName = String(post.author.name);
    }

    var created = post && post.created ? formatDate(post.created) : "";
    meta.textContent = "by " + authorName + (created ? " · " + created : "");

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
