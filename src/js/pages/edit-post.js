// @ts-check

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

/** Get form & message elements safely */
var formEl = document.getElementById("edit-form");
/** @type {HTMLFormElement|null} */
var form = formEl instanceof HTMLFormElement ? formEl : null;

var msgEl = document.getElementById("edit-msg");
/** @type {HTMLElement|null} */
var msg = msgEl instanceof HTMLElement ? msgEl : null;

/**
 * Show a message in the page message area. Falls back to alert for errors.
 * @param {string} text
 * @param {boolean} [ok=false]
 * @returns {void}
 */
function setMsg(text, ok) {
  if (!msg) {
    if (!ok) window.alert(text);
    return;
  }
  msg.style.display = "block";
  msg.className = "form-message alert" + (ok ? " success" : " error");
  msg.textContent = text;
}

/**
 * Read the `id` query param or empty string.
 * @returns {string}
 */
function getId() {
  try {
    var sp = new URLSearchParams(window.location.search);
    var v = sp.get("id");
    return v ? v : "";
  } catch {
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/* Emoji picker (same pattern as create-post.js; visuals handled by CSS)      */
/* -------------------------------------------------------------------------- */

/** @type {string[]} */
var EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😎",
  "🤩",
  "🥳",
  "🙌",
  "👍",
  "👏",
  "🔥",
  "💯",
  "✨",
  "⚡️",
  "💡",
  "🎉",
  "🫶",
  "🙏",
  "😅",
  "😉",
  "🤔",
  "🤗",
  "😴",
  "😭",
  "😤",
  "🙈",
  "🤝",
  "💬",
];

/** @type {HTMLElement|null} */
var emojiPalette = null;
/** @type {(HTMLInputElement|HTMLTextAreaElement|null)} */
var emojiActiveField = null;

/**
 * Create (once) and return the emoji palette element.
 * @returns {HTMLElement}
 */
function createEmojiPalette() {
  if (emojiPalette) return emojiPalette;

  var pal = document.createElement("div");
  pal.className = "emoji-palette";
  pal.style.display = "none";

  var grid = document.createElement("div");
  grid.className = "emoji-grid";

  for (var i = 0; i < EMOJIS.length; i += 1) {
    (function (emo) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "emoji-btn";
      b.textContent = emo;
      b.setAttribute("aria-label", "Insert emoji " + emo);
      b.addEventListener("click", function () {
        if (emojiActiveField) insertAtEnd(emojiActiveField, emo);
        hideEmojiPalette();
      });
      grid.appendChild(b);
    })(EMOJIS[i]);
  }

  pal.appendChild(grid);
  document.body.appendChild(pal);

  // Close when clicking outside
  document.addEventListener("click", function (e) {
    if (!pal || pal.style.display === "none") return;
    var target = e.target instanceof Node ? e.target : null;
    if (!target || !pal.contains(target)) hideEmojiPalette();
  });

  // ESC to close
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideEmojiPalette();
  });

  emojiPalette = pal;
  return pal;
}

/**
 * Show palette near the trigger button and remember active field.
 * @param {HTMLButtonElement} btn
 * @param {HTMLInputElement|HTMLTextAreaElement} field
 * @returns {void}
 */
function showEmojiPalette(btn, field) {
  emojiActiveField = field;
  var pal = createEmojiPalette();
  var rect = btn.getBoundingClientRect();
  pal.style.left = Math.round(rect.left) + "px";
  pal.style.top = Math.round(rect.bottom + 6) + "px";
  pal.style.display = "block";
}

/** Hide the palette. */
function hideEmojiPalette() {
  if (emojiPalette) emojiPalette.style.display = "none";
}

/**
 * Insert text at the end of the field and refocus.
 * @param {HTMLInputElement|HTMLTextAreaElement} el
 * @param {string} text
 * @returns {void}
 */
function insertAtEnd(el, text) {
  try {
    el.value = String(el.value || "") + String(text || "");
    el.focus();
  } catch {
    // ignore
  }
}

/**
 * Attach a small “Emoji” button under a field.
 * @param {HTMLInputElement|HTMLTextAreaElement|null} field
 * @returns {void}
 */
function attachEmojiButton(field) {
  if (!field || !field.parentElement) return;

  var wrap = document.createElement("div");
  wrap.className = "form-actions";
  wrap.style.marginTop = "0.5rem";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-outline";
  btn.textContent = "🙂 Emoji";
  btn.setAttribute("aria-haspopup", "true");
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    showEmojiPalette(btn, field);
  });

  wrap.appendChild(btn);
  field.parentElement.appendChild(wrap);
}

/* -------------------------------------------------------------------------- */
/* Load existing post data into the form                                      */
/* -------------------------------------------------------------------------- */

/**
 * Fetch post data and populate the form fields.
 * Also wires emoji buttons for title & body.
 * @returns {Promise<void>}
 */
async function load() {
  var id = getId();
  if (!id) {
    setMsg("Missing post id.");
    return;
  }

  var rawToken = getFromLocalStorage("accessToken") || "";
  var token = normalizeBearer(rawToken);

  /** @type {Record<string,string>} */
  var headers = { "X-Noroff-API-Key": NOROFF_API_KEY };
  if (token) headers.Authorization = "Bearer " + token;

  var url = BASE_API_URL + "/social/posts/" + encodeURIComponent(id);

  showLoader();
  try {
    var res = await fetch(url, { headers: headers });

    if (res.status === 401 && !token) {
      setMsg("You must be logged in to edit this post.");
      return;
    }

    /** @type {any} */
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

    /** @type {any} */
    var p = {};
    if (json && json.data) p = json.data;
    else if (json && typeof json === "object") p = json;

    if (!form) return;

    // Title field
    var tNode = form.querySelector('[name="title"]');
    /** @type {HTMLInputElement|HTMLTextAreaElement|null} */
    var titleField =
      tNode instanceof HTMLInputElement || tNode instanceof HTMLTextAreaElement
        ? tNode
        : null;
    if (titleField) titleField.value = p && p.title ? p.title : "";

    // Body field
    var bNode = form.querySelector('[name="body"]');
    /** @type {HTMLTextAreaElement|HTMLInputElement|null} */
    var bodyField =
      bNode instanceof HTMLTextAreaElement || bNode instanceof HTMLInputElement
        ? bNode
        : null;
    if (bodyField) bodyField.value = p && p.body ? p.body : "";

    // Media fields
    var muNode = form.querySelector('[name="media-url"]');
    var maNode = form.querySelector('[name="media-alt"]');
    /** @type {HTMLInputElement|null} */
    var mediaUrlField = muNode instanceof HTMLInputElement ? muNode : null;
    /** @type {HTMLInputElement|null} */
    var mediaAltField = maNode instanceof HTMLInputElement ? maNode : null;

    var media = p && p.media ? p.media : null;
    if (mediaUrlField) {
      mediaUrlField.value =
        media && typeof media.url === "string" ? media.url : "";
    }
    if (mediaAltField) {
      mediaAltField.value =
        media && typeof media.alt === "string" ? media.alt : "";
    }

    // Emoji buttons (only once)
    attachEmojiButton(titleField);
    attachEmojiButton(bodyField);
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

/* -------------------------------------------------------------------------- */
/* Submit handler                                                             */
/* -------------------------------------------------------------------------- */

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var id = getId();
    if (!id) {
      setMsg("Missing post id.");
      return;
    }

    if (!(e.currentTarget instanceof HTMLFormElement)) return;
    var f = e.currentTarget;

    var fd = new FormData(f);
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

    /** @type {{title:string, body:string, media?: {url: string, alt?: string}}} */
    var payload = { title: title, body: body };
    if (mediaUrl) {
      payload.media = { url: mediaUrl };
      if (mediaAlt) payload.media.alt = mediaAlt;
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
      window.location.href = "post.html?id=" + encodeURIComponent(id);
    } catch (err) {
      var em2 =
        err && typeof err === "object" && err !== null && "message" in err
          ? /** @type {{message?: unknown}} */ (err).message
          : null;
      setMsg(typeof em2 === "string" && em2 ? em2 : "Failed to save post.");
    } finally {
      hideLoader();
      hideEmojiPalette();
    }
  });

  load();
}
