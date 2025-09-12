// @ts-check

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

const CREATE_URL = BASE_API_URL + "/social/posts";

const formEl = document.getElementById("create-form");
/** @type {HTMLFormElement|null} */
const form = formEl instanceof HTMLFormElement ? formEl : null;

const msgEl = document.getElementById("create-msg");
/** @type {HTMLElement|null} */
const msg = msgEl instanceof HTMLElement ? msgEl : null;

function setMsg(text, ok) {
  if (!msg) {
    if (!ok) window.alert(text);
    return;
  }
  msg.style.display = "block";
  msg.className = "form-message alert" + (ok ? " success" : " error");
  msg.textContent = text;
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const EMOJIS = [
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
let emojiPalette = null;
/** @type {(HTMLInputElement|HTMLTextAreaElement|null)} */
let emojiActiveField = null;

function createEmojiPalette() {
  if (emojiPalette) return emojiPalette;

  const pal = document.createElement("div");
  pal.className = "emoji-palette";
  pal.style.display = "none";

  const grid = document.createElement("div");
  grid.className = "emoji-grid";

  const buttons = EMOJIS.map((emo) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "emoji-btn";
    b.textContent = emo;
    b.setAttribute("aria-label", "Insert emoji " + emo);
    b.addEventListener("click", function () {
      if (emojiActiveField) insertAtEnd(emojiActiveField, emo);
      hideEmojiPalette();
    });
    return b;
  });
  grid.append(...buttons);

  pal.appendChild(grid);
  document.body.appendChild(pal);

  document.addEventListener("click", function (e) {
    if (!pal || pal.style.display === "none") return;
    const target = e.target instanceof Node ? e.target : null;
    if (!target || !pal.contains(target)) hideEmojiPalette();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideEmojiPalette();
  });

  emojiPalette = pal;
  return pal;
}

function showEmojiPalette(btn, field) {
  emojiActiveField = field;
  const pal = createEmojiPalette();
  const rect = btn.getBoundingClientRect();
  pal.style.left = Math.round(rect.left) + "px";
  pal.style.top = Math.round(rect.bottom + 6) + "px";
  pal.style.display = "block";
}

function hideEmojiPalette() {
  if (emojiPalette) emojiPalette.style.display = "none";
}

function insertAtEnd(el, text) {
  try {
    el.value = String(el.value || "") + String(text || "");
    el.focus();
  } catch {
    // ignore
  }
}

function attachEmojiButton(field) {
  if (!field?.parentElement) return;

  const wrap = document.createElement("div");
  wrap.className = "form-actions";
  wrap.style.marginTop = "0.5rem";

  const btn = document.createElement("button");
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

if (form) {
  const tNode = form.querySelector('[name="title"]');
  /** @type {HTMLInputElement|null} */
  const titleField = tNode instanceof HTMLInputElement ? tNode : null;

  const bNode = form.querySelector('[name="body"]');
  /** @type {HTMLTextAreaElement|null} */
  const bodyField = bNode instanceof HTMLTextAreaElement ? bNode : null;

  attachEmojiButton(titleField);
  attachEmojiButton(bodyField);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!(e.currentTarget instanceof HTMLFormElement)) return;
    const f = e.currentTarget;

    const fd = new FormData(f);
    const title = String(fd.get("title") || "").trim();
    const body = String(fd.get("body") || "").trim();
    const mediaUrl = String(fd.get("media-url") || "").trim();
    const mediaAlt = String(fd.get("media-alt") || "").trim();

    if (!title) {
      setMsg("Title is required.");
      return;
    }

    const rawToken = getFromLocalStorage("accessToken") || "";
    const token = normalizeBearer(rawToken);
    if (!token) {
      setMsg("You must be logged in to create a post.");
      return;
    }

    if (mediaUrl && !isValidHttpUrl(mediaUrl)) {
      setMsg("Image URL must start with http(s) and be publicly accessible.");
      return;
    }

    const payload = {
      title,
      body,
      ...(mediaUrl && {
        media: { url: mediaUrl, ...(mediaAlt && { alt: mediaAlt }) },
      }),
    };

    const headers = {
      "Content-Type": "application/json",
      "X-Noroff-API-Key": NOROFF_API_KEY,
      ...(token && { Authorization: "Bearer " + token }),
    };

    showLoader();
    try {
      const res = await fetch(CREATE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(errorFrom(json, "Failed to create post"));
      }

      setMsg("Post created!", true);

      const idVal = json?.data?.id ?? json?.id;
      const id = idVal != null ? String(idVal) : "";

      setTimeout(function () {
        if (id) location.href = "post.html?id=" + encodeURIComponent(id);
        else location.href = "feed.html";
      }, 600);
    } catch (err) {
      let em = "Failed to create post.";
      if (err instanceof Error && err.message) em = err.message;
      setMsg(em);
    } finally {
      hideLoader();
      hideEmojiPalette();
    }
  });
}
