// @ts-check

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

var CREATE_URL = BASE_API_URL + "/social/posts";

var formEl = document.getElementById("create-form");
/** @type {HTMLFormElement|null} */
var form = formEl instanceof HTMLFormElement ? formEl : null;

var msgEl = document.getElementById("create-msg");
/** @type {HTMLElement|null} */
var msg = msgEl instanceof HTMLElement ? msgEl : null;

/**
 * Show a message in the #create-msg region. Falls back to alert for errors.
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
 * Validate that a string is an http(s) URL.
 * @param {string} value
 * @returns {boolean}
 */
function isValidHttpUrl(value) {
  try {
    var u = new URL(String(value));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Emoji picker (visuals in CSS)                                              */
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
 * Attach a small “Emoji” button below a field.
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
/* Submit handler                                                             */
/* -------------------------------------------------------------------------- */

if (form) {
  var tNode = form.querySelector('[name="title"]');
  /** @type {HTMLInputElement|null} */
  var titleField = tNode instanceof HTMLInputElement ? tNode : null;

  var bNode = form.querySelector('[name="body"]');
  /** @type {HTMLTextAreaElement|null} */
  var bodyField = bNode instanceof HTMLTextAreaElement ? bNode : null;

  attachEmojiButton(titleField);
  attachEmojiButton(bodyField);

  /**
   * Handle “Create Post” form submit: validates fields, POSTs to API,
   * shows status, and redirects to the new post (or feed) on success.
   * @param {SubmitEvent} e
   * @returns {Promise<void>}
   */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

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
      setMsg("You must be logged in to create a post.");
      return;
    }

    if (mediaUrl && !isValidHttpUrl(mediaUrl)) {
      setMsg("Image URL must start with http(s) and be publicly accessible.");
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

      var id = "";
      if (json && json.data && json.data.id) id = json.data.id;
      else if (json && json.id) id = json.id;

      setTimeout(function () {
        if (id) location.href = "post.html?id=" + encodeURIComponent(id);
        else location.href = "feed.html";
      }, 600);
    } catch (err) {
      var em = "Failed to create post.";
      if (err instanceof Error && err.message) em = err.message;
      setMsg(em);
    } finally {
      hideLoader();
      hideEmojiPalette();
    }
  });
}
