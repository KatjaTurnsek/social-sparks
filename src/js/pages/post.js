import { showLoader, hideLoader } from "../boot.js";
// If you want live announcements for errors, add this and set a message:
// import { setStatus } from "../components.js";

const postEl = document.getElementById("post");
const commentsEl = document.getElementById("comments");
// const postMsg = document.getElementById("post-msg"); // exists in post.html if you added it

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Demo "API" calls — replace with real fetches later
async function fetchPost() {
  await wait(600);
  // return a minimal object to avoid lint on demo literals
  return {
    // You can fill these from the real API later
    // title: "",
    // body: "",
    // media: { url: "", alt: "" },
    // created: "2025-01-01T00:00:00.000Z",
    // author: ""
  };
}

async function fetchComments() {
  await wait(500);
  // Keep empty to avoid lint on demo literals
  return [];
}

// Small helper to create elements
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function buildPostElements(post) {
  const nodes = [];

  const titleText = post && post.title ? post.title : "Untitled";
  const authorText = post && post.author ? post.author : "Unknown";

  // Avoid ternary: compute createdISO with an if
  let createdISO = new Date().toISOString();
  if (post && post.created) {
    createdISO = post.created;
  }

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

  try {
    showLoader();

    const [post, comments] = await Promise.all([fetchPost(), fetchComments()]);

    // Render post
    const postNodes = buildPostElements(post);
    postEl.replaceChildren();
    for (let i = 0; i < postNodes.length; i += 1) {
      postEl.appendChild(postNodes[i]);
    }

    // Render comments (no .apply)
    const commentNodes = buildCommentsElements(comments);
    commentsEl.replaceChildren();
    for (let j = 0; j < commentNodes.length; j += 1) {
      commentsEl.appendChild(commentNodes[j]);
    }
  } catch (err) {
    let message = "Failed to load post.";
    if (err && typeof err === "object" && err !== null && "message" in err) {
      const maybe = /** @type {{message?: unknown}} */ (err).message;
      if (typeof maybe === "string") message = maybe;
    }
    const alert = el("p", "alert error", message);
    postEl.replaceChildren(alert);
    // If using a live region in post.html, you can announce it:
    // setStatus(postMsg, message, "error");
  } finally {
    hideLoader();
  }
}

init();
