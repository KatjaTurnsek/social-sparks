// @ts-check

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { normalizeBearer } from "../shared/auth.js";

const formEl = document.getElementById("edit-form");
/** @type {HTMLFormElement|null} */
const form = formEl instanceof HTMLFormElement ? formEl : null;

const msgEl = document.getElementById("edit-msg");
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

function getId() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("id");
    return v ? v : "";
  } catch {
    return "";
  }
}

/** @type {string[]} */
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
    b.addEventListener("click", () => {
      if (emojiActiveField) insertAtEnd(emojiActiveField, emo);
      hideEmojiPalette();
    });
    return b;
  });
  grid.append(...buttons);

  pal.appendChild(grid);
  document.body.appendChild(pal);

  document.addEventListener("click", (e) => {
    if (!pal || pal.style.display === "none") return;
    const target = e.target instanceof Node ? e.target : null;
    if (!target || !pal.contains(target)) hideEmojiPalette();
  });

  document.addEventListener("keydown", (e) => {
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
  if (!field || !field.parentElement) return;

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

async function load() {
  const id = getId();
  if (!id) {
    setMsg("Missing post id.");
    return;
  }

  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: "Bearer " + token }),
  };

  const url =
    BASE_API_URL + "/social/posts/" + encodeURIComponent(id) + "?_author=true";

  showLoader();
  try {
    const res = await fetch(url, { headers });

    if (res.status === 401 && !token) {
      setMsg("You must be logged in to edit this post.");
      return;
    }

    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      setMsg(errorFrom(json, "Failed to load post"));
      return;
    }

    const p = (json && json.data) || json || {};
    if (!form) return;

    const me = getFromLocalStorage("profileName") || "";
    const owner =
      p && p.author && typeof p.author.name === "string" ? p.author.name : "";
    if (owner && me && owner !== me) {
      setMsg("You can only edit your own post.");
      window.location.href = "post.html?id=" + encodeURIComponent(id);
      return;
    }

    const tNode = form.querySelector('[name="title"]');
    /** @type {HTMLInputElement|HTMLTextAreaElement|null} */
    const titleField =
      tNode instanceof HTMLInputElement || tNode instanceof HTMLTextAreaElement
        ? tNode
        : null;
    if (titleField) titleField.value = p && p.title ? p.title : "";

    const bNode = form.querySelector('[name="body"]');
    /** @type {HTMLTextAreaElement|HTMLInputElement|null} */
    const bodyField =
      bNode instanceof HTMLTextAreaElement || bNode instanceof HTMLInputElement
        ? bNode
        : null;
    if (bodyField) bodyField.value = p && p.body ? p.body : "";

    const muNode = form.querySelector('[name="media-url"]');
    const maNode = form.querySelector('[name="media-alt"]');
    /** @type {HTMLInputElement|null} */
    const mediaUrlField = muNode instanceof HTMLInputElement ? muNode : null;
    /** @type {HTMLInputElement|null} */
    const mediaAltField = maNode instanceof HTMLInputElement ? maNode : null;

    const media = p && p.media ? p.media : null;
    if (mediaUrlField) {
      mediaUrlField.value =
        media && typeof media.url === "string" ? media.url : "";
    }
    if (mediaAltField) {
      mediaAltField.value =
        media && typeof media.alt === "string" ? media.alt : "";
    }

    attachEmojiButton(titleField);
    attachEmojiButton(bodyField);
  } catch (e) {
    const em =
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

    const id = getId();
    if (!id) {
      setMsg("Missing post id.");
      return;
    }

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
      setMsg("You must be logged in to save changes.");
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
      const res = await fetch(
        BASE_API_URL + "/social/posts/" + encodeURIComponent(id),
        {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        }
      );

      let json = null;
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
      const em2 =
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
