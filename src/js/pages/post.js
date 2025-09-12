// @ts-check
/** @typedef {import("../types.js").Post} Post */
/** @typedef {import("../types.js").Comment} Comment */
/** @typedef {import("../types.js").Profile} Profile */
/** @typedef {import("../types.js").Media} Media */

import { BASE_API_URL, NOROFF_API_KEY, getFromLocalStorage } from "../utils.js";
import { showLoader, hideLoader, setFlash } from "../boot.js";
import { errorFrom } from "../shared/errors.js";
import { formatDate } from "../shared/dates.js";
import { normalizeBearer } from "../shared/auth.js";

const display = document.getElementById("display-container");

const REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

const COMMENT_EMOJIS = [
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
 * Create (or reuse) the global emoji palette element.
 * @returns {HTMLElement} The palette root element
 */
function createEmojiPalette() {
  if (emojiPalette) return emojiPalette;

  const pal = document.createElement("div");
  pal.className = "emoji-palette";
  pal.style.display = "none";

  const grid = document.createElement("div");
  grid.className = "emoji-grid";

  const buttons = COMMENT_EMOJIS.map((emo) => {
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

  document.addEventListener("click", (e) => {
    if (!pal || pal.style.display === "none") return;
    const t = e.target instanceof Node ? e.target : null;
    if (!t || !pal.contains(t)) hideEmojiPalette();
  });

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

/** Hide the emoji palette, if present. */
function hideEmojiPalette() {
  if (emojiPalette) emojiPalette.style.display = "none";
}

/**
 * Append text at the end of a form control (input/textarea).
 * @param {HTMLInputElement|HTMLTextAreaElement} el
 * @param {string} text
 * @returns {void}
 */
function insertAtEnd(el, text) {
  try {
    el.value = String(el.value || "") + String(text || "");
    el.focus();
  } catch (e) {
    void e;
  }
}

/**
 * Add a small "Emoji" helper button below a form field.
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
 * Build a link to a profile by name.
 * @param {string} name
 * @returns {string}
 */
function profileUrl(name) {
  return `profile.html?name=${encodeURIComponent(name)}`;
}

/**
 * Read the post id from the page query string.
 * @returns {string}
 */
function getId() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("id");
    return v ? v : "";
  } catch {
    return "";
  }
}

/**
 * Load a single post (with author, comments, reactions).
 * @param {string} id
 * @returns {Promise<Post|null>}
 * @throws {Error} if the request fails
 */
async function fetchPost(id) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);

  const url = `${BASE_API_URL}/social/posts/${encodeURIComponent(
    id
  )}?_author=true&_comments=true&_reactions=true`;

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: "Bearer " + token }),
  };

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
  return json?.data || null;
}

/**
 * Create a new comment on a post.
 * @param {string|number} postId
 * @param {string} text
 * @param {number} [replyToId]
 * @returns {Promise<Comment|any>}
 * @throws {Error} if unauthenticated or request fails
 */
async function createComment(postId, text, replyToId) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  if (!token) throw new Error("You must be logged in to comment.");

  const url = `${BASE_API_URL}/social/posts/${encodeURIComponent(
    String(postId)
  )}/comment`;

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const bodyObj = {
    body: text,
    ...(typeof replyToId === "number" && { replyToId }),
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyObj),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) throw new Error(errorFrom(json, "Failed to post comment"));
  return json?.data || json || null;
}

/**
 * Add or remove a reaction for the current user.
 * @param {string|number} postId
 * @param {string} symbol
 * @param {boolean} on - true to add, false to remove
 * @returns {Promise<void>}
 * @throws {Error} if unauthenticated or request fails
 */
async function setReaction(postId, symbol, on) {
  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  if (!token) throw new Error("You must be logged in to react.");

  const url = `${BASE_API_URL}/social/posts/${encodeURIComponent(
    String(postId)
  )}/react/${encodeURIComponent(symbol)}`;

  const req = {
    method: on ? "PUT" : "DELETE",
    headers: {
      "X-Noroff-API-Key": NOROFF_API_KEY,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const res = await fetch(url, req);

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) throw new Error(errorFrom(json, "Failed to update reaction"));
}

/** @typedef {Record<string, { count: number, reacted?: boolean }>} ReactionMap */

/**
 * Convert API reactions array into a quick lookup map.
 * @param {Post} post
 * @returns {ReactionMap}
 */
function reactionMap(post) {
  const arr = Array.isArray(post?.reactions) ? post.reactions : [];
  return arr.reduce((acc, r) => {
    const sym = typeof r?.symbol === "string" ? r.symbol : "";
    if (!sym) return acc;
    const next = {
      ...acc,
      [sym]: {
        count: typeof r?.count === "number" ? r.count : 0,
        reacted: !!r?.reacted,
      },
    };
    return next;
  }, /** @type {ReactionMap} */ ({}));
}

/**
 * Render the full post view, including media, reactions, and comments.
 * @param {Post|null} post
 * @returns {void}
 */
function renderPost(post) {
  if (!display) return;
  display.innerHTML = "";

  const card = document.createElement("article");
  card.className = "card";

  const h = document.createElement("h2");
  h.textContent = post?.title || "Untitled";

  const meta = document.createElement("p");
  meta.className = "muted";
  const authorName = post?.author?.name || "Unknown";
  const createdText = post?.created ? formatDate(post.created) : "";

  meta.textContent = "by ";
  if (authorName !== "Unknown") {
    const a = document.createElement("a");
    a.href = profileUrl(authorName);
    a.textContent = authorName;
    meta.appendChild(a);
  } else {
    meta.append(authorName);
  }
  if (createdText) meta.append(` · ${createdText}`);

  const media = post?.media || null;
  if (typeof media?.url === "string" && media.url) {
    const img = document.createElement("img");
    img.src = media.url;
    img.alt = typeof media?.alt === "string" ? media.alt : "";
    img.loading = "lazy";
    img.className = "post-media";
    img.style.maxHeight = "none";
    img.style.height = "auto";
    img.style.width = "100%";
    img.style.objectFit = "contain";
    img.style.display = "block";
    card.appendChild(img);
  }

  const body = document.createElement("p");
  body.textContent = post?.body || "";

  const rx = document.createElement("div");
  rx.className = "reactions";
  const rmap = reactionMap(/** @type {Post} */ (post));
  const hasToken = !!normalizeBearer(getFromLocalStorage("accessToken") || "");
  const pid = post?.id != null ? String(post.id) : "";

  for (const sym of REACTIONS) {
    const count = rmap[sym]?.count || 0;
    const reacted = !!rmap[sym]?.reacted;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reaction-btn";
    btn.setAttribute("aria-pressed", reacted ? "true" : "false");
    btn.title = reacted ? `Remove ${sym}` : `React with ${sym}`;
    btn.textContent = `${sym} ${count > 0 ? count : ""}`.trim();

    btn.addEventListener("click", async () => {
      if (!hasToken || !pid) {
        if (!hasToken) window.alert("Please log in to react.");
        return;
      }
      btn.disabled = true;
      showLoader();
      try {
        await setReaction(pid, sym, !reacted);
        const updated = await fetchPost(pid);
        renderPost(updated);
      } catch (e) {
        const msg =
          e && typeof e === "object" && e !== null && "message" in e
            ? /** @type {{message?: unknown}} */ (e).message
            : null;
        window.alert(
          typeof msg === "string" && msg ? msg : "Could not update reaction."
        );
      } finally {
        hideLoader();
        btn.disabled = false;
      }
    });

    rx.appendChild(btn);
  }

  const currentUser = getFromLocalStorage("profileName") || "";
  const isOwner =
    !!currentUser && authorName !== "Unknown" && currentUser === authorName;

  /** @type {HTMLDivElement|null} */
  let actions = null;
  if (isOwner) {
    actions = document.createElement("div");
    actions.className = "form-actions";
    const safeIdA =
      post?.id !== undefined && post?.id !== null ? String(post.id) : "";

    const edit = document.createElement("a");
    edit.className = "btn btn-outline";
    edit.href = `edit-post.html?id=${encodeURIComponent(safeIdA)}`;
    edit.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-outline";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function () {
      onDelete(safeIdA, authorName);
    });

    actions.appendChild(edit);
    actions.appendChild(delBtn);
  }

  // Comments
  const commentsWrap = document.createElement("section");
  const cTitle = document.createElement("h3");
  cTitle.textContent = "Comments";
  commentsWrap.appendChild(cTitle);

  const list = Array.isArray(post?.comments) ? [...post.comments] : [];
  if (list.length > 0) {
    for (const c of list) {
      const cardC = document.createElement("article");
      cardC.className = "card";
      cardC.style.padding = "1rem";

      const metaC = document.createElement("p");
      metaC.className = "muted";

      let cAuthor = null;
      if (c?.author?.name) cAuthor = c.author.name;
      else if (typeof c?.owner === "string" && c.owner) cAuthor = c.owner;

      const cWhen = c?.created ? formatDate(c.created) : "";

      if (cAuthor) {
        metaC.append("by ");
        const ca = document.createElement("a");
        ca.href = profileUrl(cAuthor);
        ca.textContent = cAuthor;
        metaC.appendChild(ca);
      } else {
        metaC.textContent = "Anonymous";
      }
      if (cWhen) metaC.append(` · ${cWhen}`);

      const cBody = document.createElement("p");
      cBody.textContent = c?.body || "";

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

  // Comment form
  const commentBlock = document.createElement("section");
  commentBlock.style.marginTop = "1rem";

  const safeId =
    post?.id !== undefined && post?.id !== null ? String(post.id) : "";

  if (hasToken && safeId) {
    const form = document.createElement("form");
    form.className = "form";

    const fg = document.createElement("div");
    fg.className = "form-group";

    const label = document.createElement("label");
    label.setAttribute("for", "comment-body");
    label.textContent = "Add a comment";

    const ta = document.createElement("textarea");
    ta.id = "comment-body";
    ta.name = "comment";
    ta.placeholder = "Write your comment…";
    ta.required = true;
    ta.rows = 3;

    const actionsForm = document.createElement("div");
    actionsForm.className = "form-actions";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn";
    submit.textContent = "Post comment";

    actionsForm.appendChild(submit);
    fg.appendChild(label);
    fg.appendChild(ta);
    form.appendChild(fg);
    form.appendChild(actionsForm);

    attachEmojiButton(ta);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text) {
        window.alert("Please write a comment first.");
        ta.focus();
        return;
      }
      submit.disabled = true;
      showLoader();
      try {
        await createComment(safeId, text);
        ta.value = "";
        const updated = await fetchPost(safeId);
        renderPost(updated);
      } catch (err) {
        const msg =
          err && typeof err === "object" && err !== null && "message" in err
            ? /** @type {{message?: unknown}} */ (err).message
            : null;
        window.alert(
          typeof msg === "string" && msg ? msg : "Could not post comment."
        );
      } finally {
        hideLoader();
        submit.disabled = false;
      }
    });

    form.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    commentBlock.appendChild(form);
  } else {
    const needLogin = document.createElement("p");
    needLogin.className = "muted";
    needLogin.innerHTML = `You need to <a href="login.html">log in</a> to comment.`;
    commentBlock.appendChild(needLogin);
  }

  card.appendChild(h);
  card.appendChild(meta);
  card.appendChild(body);
  card.appendChild(rx);
  if (actions) card.appendChild(actions);
  card.appendChild(commentsWrap);
  card.appendChild(commentBlock);
  display.appendChild(card);
}

/**
 * Delete a post if the current user is the owner; then redirect to feed.
 * @param {string} id
 * @param {string} ownerName
 * @returns {Promise<void>}
 */
async function onDelete(id, ownerName) {
  if (!id) return;

  const me = getFromLocalStorage("profileName") || "";
  if (!me || me !== ownerName) {
    window.alert("You can only delete your own posts.");
    return;
  }

  const ok = window.confirm("Delete this post?");
  if (!ok) return;

  const rawToken = getFromLocalStorage("accessToken") || "";
  const token = normalizeBearer(rawToken);
  const url = `${BASE_API_URL}/social/posts/${encodeURIComponent(id)}`;

  const headers = {
    "X-Noroff-API-Key": NOROFF_API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  showLoader();
  try {
    const res = await fetch(url, { method: "DELETE", headers });

    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (res.status === 204) {
      setFlash("Post deleted.", "success", 2500);
      window.location.href = "feed.html";
      return;
    }

    window.alert(errorFrom(json, "Failed to delete"));
  } finally {
    hideLoader();
  }
}

/**
 * Page bootstrap: load the post by id and render it.
 * @returns {Promise<void>}
 */
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
