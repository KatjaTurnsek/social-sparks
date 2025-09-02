import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

const form = document.getElementById("create-form");
const msg = document.getElementById("create-msg");
const CREATE_URL = BASE_API_URL + "/social/posts";

function setMsg(text, ok) {
  if (!msg) return;
  msg.style.display = "block";
  msg.className = "form-message alert" + (ok ? " success" : " error");
  msg.textContent = text;
}

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

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
      setMsg("You must be logged in to create a post.");
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
    };
    headers.Authorization = "Bearer " + token;

    showLoader();
    try {
      var res = await fetch(CREATE_URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      var json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(errorFrom(json, "Failed to create post"));
      }

      setMsg("Post created!", true);

      // Support both shapes { data: { id } } and { id }
      var id = "";
      if (json && json.data && json.data.id) {
        id = json.data.id;
      } else if (json && json.id) {
        id = json.id;
      }

      setTimeout(function () {
        if (id) {
          location.href = "post.html?id=" + encodeURIComponent(id);
        } else {
          location.href = "feed.html";
        }
      }, 600);
    } catch (err) {
      var em =
        err && typeof err === "object" && err !== null && "message" in err
          ? /** @type {{message?: unknown}} */ (err).message
          : null;
      setMsg(typeof em === "string" && em ? em : "Failed to create post.");
    } finally {
      hideLoader();
    }
  });
}
