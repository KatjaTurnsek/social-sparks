import { showLoader, hideLoader } from "../boot.js";
import { Button } from "../components.js";
import { getPost, reactToPost } from "../api/posts.js";

const postEl = document.getElementById("post");
const commentsEl = document.getElementById("comments");

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function getPostIdFromURL() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("id");
    return id ? id : "";
  } catch {
    return "";
  }
}

function countFor(reactions, symbol) {
  if (!reactions || !Array.isArray(reactions)) return 0;
  for (let i = 0; i < reactions.length; i += 1) {
    const r = reactions[i];
    if (r && r.symbol === symbol && typeof r.count === "number") return r.count;
  }
  return 0;
}

function uniqueSymbolsFromReactions(reactions) {
  const out = [];
  if (Array.isArray(reactions)) {
    for (let i = 0; i < reactions.length; i += 1) {
      const s = reactions[i] && reactions[i].symbol;
      if (typeof s === "string" && s && out.indexOf(s) === -1) out.push(s);
    }
  }
  return out;
}

function buildReactionBar(post) {
  const wrap = el("div", "form-actions mt-1");
  const reactions = post && Array.isArray(post.reactions) ? post.reactions : [];

  // Merge API symbols with defaults
  let symbols = uniqueSymbolsFromReactions(reactions);
  if (symbols.length === 0) symbols = ["👍", "❤️", "🎉"];

  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];
    const initial = countFor(reactions, symbol);
    const btn = Button({
      label: initial > 0 ? `${symbol} ${initial}` : symbol,
      variant: "outline",
      ariaLabel: `React ${symbol}`,
    });
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const result = await reactToPost(post.id, symbol);
        let newCount = 0;
        if (result && Array.isArray(result.reactions)) {
          for (let j = 0; j < result.reactions.length; j += 1) {
            const r = result.reactions[j];
            if (r && r.symbol === symbol && typeof r.count === "number") {
              newCount = r.count;
              break;
            }
          }
        }
        btn.textContent = newCount > 0 ? `${symbol} ${newCount}` : symbol;
      } catch {
        // swallow
      } finally {
        btn.disabled = false;
      }
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function buildPostElements(post) {
  const nodes = [];

  const titleText = post && post.title ? post.title : "Untitled";
  let authorText = "Unknown";
  if (
    post &&
    post.author &&
    typeof post.author === "object" &&
    typeof post.author.name === "string"
  ) {
    authorText = post.author.name;
  }

  const createdISO =
    post && post.created ? post.created : new Date().toISOString();
  const bodyText = post && post.body ? post.body : "";

  const h = el("h2", "mt-0 mb-1", titleText);
  nodes.push(h);

  const meta = el("p", "muted mb-1");
  meta.appendChild(document.createTextNode("by "));
  const strong = el("strong", "", authorText);
  meta.appendChild(strong);
  meta.appendChild(document.createTextNode(" · "));
  const t = document.createElement("time");
  t.setAttribute("datetime", createdISO);
  t.textContent = new Date(createdISO).toLocaleString();
  meta.appendChild(t);
  nodes.push(meta);

  if (post && post.media && post.media.url) {
    const img = el("img", "mb-1");
    img.src = post.media.url;
    img.alt = post.media.alt ? post.media.alt : "";
    nodes.push(img);
  }

  const body = el("p", "", bodyText);
  nodes.push(body);

  nodes.push(buildReactionBar(post));
  return nodes;
}

function buildCommentsElements(comments) {
  const nodes = [];
  const heading = el("h3", "mb-1", "Comments");
  nodes.push(heading);

  if (!comments || comments.length === 0) {
    nodes.push(el("p", "muted", "No comments yet."));
    return nodes;
  }

  for (let i = 0; i < comments.length; i += 1) {
    const c = comments[i];

    const card = el("article", "card");
    card.style.padding = "1rem";
    card.style.margin = ".75rem 0";

    const meta = el("p", "muted mb-1");
    const name = el("strong", "", c && c.author ? c.author : "Anonymous");
    const timeEl = document.createElement("time");
    const cISO = c && c.created ? c.created : new Date().toISOString();
    timeEl.setAttribute("datetime", cISO);
    timeEl.textContent = new Date(cISO).toLocaleString();

    meta.appendChild(name);
    meta.appendChild(document.createTextNode(" · "));
    meta.appendChild(timeEl);

    const body = el("p", "", c && c.body ? c.body : "");

    card.appendChild(meta);
    card.appendChild(body);
    nodes.push(card);
  }

  return nodes;
}

async function init() {
  if (!postEl || !commentsEl) return;

  const id = getPostIdFromURL();
  if (!id) {
    const alert = el("p", "alert error", "Missing post id.");
    postEl.replaceChildren(alert);
    return;
  }

  try {
    showLoader();

    const post = await getPost(id, {
      _author: true,
      _comments: true,
      _reactions: true,
    });

    const postNodes = buildPostElements(post);
    postEl.replaceChildren();
    for (let i = 0; i < postNodes.length; i += 1) {
      postEl.appendChild(postNodes[i]);
    }

    let comments = [];
    if (post && Array.isArray(post.comments)) comments = post.comments;

    const commentNodes = buildCommentsElements(comments);
    commentsEl.replaceChildren();
    for (let j = 0; j < commentNodes.length; j += 1) {
      commentsEl.appendChild(commentNodes[j]);
    }
  } catch (err) {
    let message = "Failed to load post.";
    if (
      err &&
      typeof err === "object" &&
      Object.prototype.hasOwnProperty.call(err, "message")
    ) {
      const maybe = err.message;
      if (typeof maybe === "string") message = maybe;
    }
    const alert = el("p", "alert error", message);
    postEl.replaceChildren(alert);
  } finally {
    hideLoader();
  }
}

init();
