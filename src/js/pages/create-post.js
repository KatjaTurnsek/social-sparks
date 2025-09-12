// @ts-check

/** @typedef {import("../types.js").Media} Media */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

/**
 * API endpoint for creating posts.
 * @type {string}
 */
const CREATE_URL = `${BASE_API_URL}/social/posts`;

const formEl = document.getElementById("create-form");
/** @type {HTMLFormElement|null} */
const form = formEl instanceof HTMLFormElement ? formEl : null;

const msgEl = document.getElementById("create-msg");
/** @type {HTMLElement|null} */
const msg = msgEl instanceof HTMLElement ? msgEl : null;

/**
 * Show a success/error message in the inline area (or alert on error if missing).
 * @param {string} text
 * @param {boolean} [ok=false]
 * @returns {void}
 */
function setMsg(text, ok = false) {
  if (!msg) {
    if (!ok) window.alert(text);
    return;
  }
  msg.style.display = "block";
  msg.className = `form-message alert${ok ? " success" : " error"}`;
  msg.textContent = text;
}

/**
 * Validate that a string is an http(s) URL.
 * @param {string} value
 * @returns {boolean}
 */
function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Emoji palette content. */
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

/**
 * Lazily create (and cache) the emoji palette element and its listeners.
 * @returns {HTMLElement} The palette root element.
 */
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
    b.setAttribute("aria-label", `Insert emoji ${emo}`);
    b.addEventListener("click", () => {
      if (emojiActiveField) insertAtEnd(emojiActiveField, emo);
      hideEmojiPalette();
    });
    return b;
  });
  grid.append(...buttons);

  pal.appendChild(grid);
  document.body.appendChild(pal);

  // Dismiss on outside click
  document.addEventListener("click", (e) => {
    if (!pal || pal.style.display === "none") return;
    const target = e.target instanceof Node ? e.target : null;
    if (!target || !pal.contains(target)) hideEmojiPalette();
  });

  // Dismiss on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideEmojiPalette();
  });

  emojiPalette = pal;
  return pal;
}

/**
 * Position and show the emoji palette near a button.
 * @param {HTMLElement} btn
 * @param {HTMLInputElement|HTMLTextAreaElement} field
 * @returns {void}
 */
function showEmojiPalette(btn, field) {
  emojiActiveField = field;
  const pal = createEmojiPalette();
  const rect = btn.getBoundingClientRect();
  pal.style.left = `${Math.round(rect.left)}px`;
  pal.style.top = `${Math.round(rect.bottom + 6)}px`;
  pal.style.display = "block";
}

/**
 * Hide the emoji palette if present.
 * @returns {void}
 */
function hideEmojiPalette() {
  if (emojiPalette) emojiPalette.style.display = "none";
}

/**
 * Append text at the end of an input or textarea, preserving focus.
 * @param {HTMLInputElement|HTMLTextAreaElement} el
 * @param {string} text
 * @returns {void}
 */
function insertAtEnd(el, text) {
  try {
    el.value = `${String(el.value || "")}${String(text || "")}`;
    el.focus();
  } catch {
    // ignore
  }
}

/**
 * Attach a small "Emoji" button under a given input/textarea that opens the palette.
 * @param {HTMLInputElement|HTMLTextAreaElement|null} field
 * @returns {void}
 */
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
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    showEmojiPalette(btn, field);
  });

  wrap.appendChild(btn);
  field.parentElement.appendChild(wrap);
}

/**
 * Toggle form submitting state (disables controls + swaps submit label).
 * @param {HTMLFormElement} form
 * @param {boolean} on
 * @returns {void}
 */
function setFormSubmitting(form, on) {
  form.setAttribute("aria-busy", String(on));
  const controls = [
    ...form.querySelectorAll("input, textarea, select, button"),
  ];
  controls.forEach((el) => {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLButtonElement
    ) {
      el.disabled = on;
    }
  });
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn instanceof HTMLButtonElement) {
    if (on) {
      submitBtn.dataset.prevText = submitBtn.textContent || "";
      submitBtn.textContent = "Publishing…";
    } else {
      submitBtn.textContent = submitBtn.dataset.prevText || "Publish";
      delete submitBtn.dataset.prevText;
    }
  }
}

/**
 * Payload sent to the create post endpoint.
 * @typedef {{
 *   title: string,
 *   body?: string,
 *   media?: Media
 * }} CreatePostPayload
 */

if (form) {
  const tNode = form.querySelector('[name="title"]');
  /** @type {HTMLInputElement|null} */
  const titleField = tNode instanceof HTMLInputElement ? tNode : null;

  const bNode = form.querySelector('[name="body"]');
  /** @type {HTMLTextAreaElement|null} */
  const bodyField = bNode instanceof HTMLTextAreaElement ? bNode : null;

  attachEmojiButton(titleField);
  attachEmojiButton(bodyField);

  // Quick submit: Cmd/Ctrl + Enter
  form.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!(e.currentTarget instanceof HTMLFormElement)) return;
    const f = /** @type {HTMLFormElement} */ (e.currentTarget);

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

    /** @type {CreatePostPayload} */
    const payload = {
      title,
      ...(body && { body }),
      ...(mediaUrl && {
        media: { url: mediaUrl, ...(mediaAlt && { alt: mediaAlt }) },
      }),
    };

    const headers = {
      "Content-Type": "application/json",
      "X-Noroff-API-Key": NOROFF_API_KEY,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    setFormSubmitting(f, true);
    showLoader();
    try {
      const res = await fetch(CREATE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      /** @type {any} */
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

      setTimeout(() => {
        if (id) location.href = `post.html?id=${encodeURIComponent(id)}`;
        else location.href = "feed.html";
      }, 600);
    } catch (err) {
      setMsg(
        err instanceof Error && err.message
          ? err.message
          : "Failed to create post."
      );
    } finally {
      hideLoader();
      hideEmojiPalette();
      setFormSubmitting(f, false);
    }
  });
}
