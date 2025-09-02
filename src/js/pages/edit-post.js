import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

var form = document.getElementById("edit-form");
var msg = document.getElementById("edit-msg");

function setMsg(text, ok) {
  if (!msg) return;
  msg.style.display = "block";
  msg.className = "form-message alert" + (ok ? " success" : " error");
  msg.textContent = text;
}

function getId() {
  try {
    var sp = new URLSearchParams(window.location.search);
    var v = sp.get("id");
    return v ? v : "";
  } catch {
    return "";
  }
}

async function load() {
  var id = getId();
  if (!id) {
    setMsg("Missing post id.");
    return;
  }

  // Build headers: API key always, Authorization only if token exists
  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);

  var headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  var url = BASE_API_URL + "/social/posts/" + encodeURIComponent(id);

  showLoader();
  try {
    var res = await fetch(url, { headers: headers });

    // If unauthorized and no token, inform the user clearly
    if (res.status === 401 && !token) {
      setMsg("You must be logged in to edit this post.");
      return;
    }

    var json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      setMsg(errorFrom(json, "Failed to load post"));
      return;
    }

    var p = {};
    if (json && json.data) {
      p = json.data;
    } else if (json && typeof json === "object") {
      p = json;
    }

    if (!form) return;

    form.title.value = p && p.title ? p.title : "";
    form.body.value = p && p.body ? p.body : "";

    var media = p && p.media ? p.media : null;
    form["media-url"].value = media && media.url ? media.url : "";
    form["media-alt"].value = media && media.alt ? media.alt : "";
  } catch (e) {
    var em =
      e && typeof e === "object" && e !== null && "message" in e
        ? /** @type {{message?: unknown}} */ (e).message
        : null;
    setMsg(typeof em === "string" && em ? em : "Failed to load post.");
  } finally {
    hideLoader();
  }
}

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var id = getId();
    if (!id) {
      setMsg("Missing post id.");
      return;
    }

    var fd = new FormData(form);
    var title = String(fd.get("title") || "").trim();
    var body = String(fd.get("body") || "").trim();
    var mediaUrl = String(fd.get("media-url") || "").trim();
    var mediaAlt = String(fd.get("media-alt") || "").trim();

    if (!title) {
      setMsg("Title is required.");
      return;
    }

    var rawToken = getFromLocalStorage("accessToken") || "";
    var token = normalizeBearer(rawToken);
    if (!token) {
      setMsg("You must be logged in to save changes.");
      return;
    }

    var payload = { title: title, body: body };
    if (mediaUrl) {
      payload.media = { url: mediaUrl };
      if (mediaAlt) {
        payload.media.alt = mediaAlt;
      }
    }

    var headers = {
      "Content-Type": "application/json",
      "X-Noroff-API-Key": NOROFF_API_KEY,
      Authorization: "Bearer " + token,
    };

    showLoader();
    try {
      var res = await fetch(
        BASE_API_URL + "/social/posts/" + encodeURIComponent(id),
        {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(payload),
        }
      );

      var json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(errorFrom(json, "Failed to save post"));
      }

      setMsg("Saved!", true);

      // Redirect back to the post
      window.location.href = "post.html?id=" + encodeURIComponent(id);
    } catch (err) {
      var em2 =
        err && typeof err === "object" && err !== null && "message" in err
          ? /** @type {{message?: unknown}} */ (err).message
          : null;
      setMsg(typeof em2 === "string" && em2 ? em2 : "Failed to save post.");
    } finally {
      hideLoader();
    }
  });

  load();
}
