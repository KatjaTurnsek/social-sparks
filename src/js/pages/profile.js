import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

var display = document.getElementById("display-container");

function getProfileName() {
  var nameFromUrl = "";
  try {
    var sp = new URLSearchParams(window.location.search);
    nameFromUrl = sp.get("name") || "";
  } catch {
    // no-op; fall back to local storage
  }
  if (nameFromUrl) return nameFromUrl;

  var saved = getFromLocalStorage("profileName");
  return saved || "";
}

async function fetchProfile(name) {
  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);

  var url =
    BASE_API_URL +
    "/social/profiles/" +
    encodeURIComponent(name) +
    "?_posts=true";

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
    throw new Error(errorFrom(json, "Failed to load profile"));
  }

  return json && json.data ? json.data : null;
}

async function follow(name, action) {
  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);

  var url =
    BASE_API_URL +
    "/social/profiles/" +
    encodeURIComponent(name) +
    "/" +
    action;

  var headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) headers.Authorization = "Bearer " + token;

  var res = await fetch(url, {
    method: "PUT",
    headers: headers,
  });

  var json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, "Failed"));
  }

  var result = null;
  if (json && json.data) {
    result = json.data;
  } else {
    result = json;
  }
  return result;
}

function renderProfile(p) {
  if (!display) return;
  display.innerHTML = "";

  var card = document.createElement("article");
  card.className = "card";

  var h = document.createElement("h2");
  h.textContent = p && p.name ? p.name : "Profile";

  var bio = document.createElement("p");
  bio.textContent = p && p.bio ? p.bio : "";

  var actions = document.createElement("div");
  actions.className = "form-actions";

  var f = document.createElement("button");
  f.className = "btn";
  f.textContent = "Follow";
  f.addEventListener("click", async function () {
    showLoader();
    try {
      await follow(p && p.name ? p.name : "", "follow");
      window.alert("Followed.");
    } catch (e) {
      var em =
        e && typeof e === "object" && e !== null && "message" in e
          ? /** @type {{message?: unknown}} */ (e).message
          : null;
      window.alert(typeof em === "string" && em ? em : "Failed to follow");
    } finally {
      hideLoader();
    }
  });

  var u = document.createElement("button");
  u.className = "btn btn-outline";
  u.textContent = "Unfollow";
  u.addEventListener("click", async function () {
    showLoader();
    try {
      await follow(p && p.name ? p.name : "", "unfollow");
      window.alert("Unfollowed.");
    } catch (e) {
      var em2 =
        e && typeof e === "object" && e !== null && "message" in e
          ? /** @type {{message?: unknown}} */ (e).message
          : null;
      window.alert(typeof em2 === "string" && em2 ? em2 : "Failed to unfollow");
    } finally {
      hideLoader();
    }
  });

  actions.appendChild(f);
  actions.appendChild(u);

  var postsTitle = document.createElement("h3");
  postsTitle.textContent = "Posts";

  var list = document.createElement("div");
  var posts = p && Array.isArray(p.posts) ? p.posts : [];

  if (posts.length > 0) {
    for (var i = 0; i < posts.length; i += 1) {
      var post = posts[i] || {};

      var item = document.createElement("article");
      item.className = "card";

      var t = document.createElement("h4");
      t.textContent = post && post.title ? post.title : "Untitled";

      var b = document.createElement("p");
      b.textContent = post && post.body ? post.body : "";

      var view = document.createElement("a");
      view.className = "btn btn-outline";

      var pid = "";
      if (post && post.id !== undefined && post.id !== null) {
        pid = String(post.id);
      }
      view.href = "post.html?id=" + encodeURIComponent(pid);
      view.textContent = "View";

      item.appendChild(t);
      item.appendChild(b);
      item.appendChild(view);
      list.appendChild(item);
    }
  } else {
    var none = document.createElement("p");
    none.className = "muted";
    none.textContent = "No posts yet.";
    list.appendChild(none);
  }

  card.appendChild(h);
  card.appendChild(bio);
  card.appendChild(actions);
  card.appendChild(postsTitle);
  card.appendChild(list);
  display.appendChild(card);
}

async function main() {
  var name = getProfileName();
  if (!name) {
    if (display) display.textContent = "No profile name provided.";
    return;
  }
  showLoader();
  try {
    var profile = await fetchProfile(name);
    renderProfile(profile);
  } catch (e) {
    var em =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    if (display) {
      display.textContent =
        typeof em === "string" && em ? em : "Could not load profile.";
    }
  } finally {
    hideLoader();
  }
}

main();
