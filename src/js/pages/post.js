import "../../css/main.css";
import { showLoader, hideLoader } from "../boot.js";

const postEl = document.getElementById("post");
const commentsEl = document.getElementById("comments");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Demo "API" calls — replace with real fetches later
async function fetchPost() {
  await wait(600);
  return {
    title: "Demo Post Title",
    body: "This is a demo post body. Replace with API data later.",
    media: { url: "https://via.placeholder.com/600x300", alt: "Placeholder" },
    created: new Date().toISOString(),
    author: "Demo Author",
  };
}

async function fetchComments() {
  await wait(500);
  return [
    { author: "Jane", body: "Nice post!", created: new Date().toISOString() },
    {
      author: "Alex",
      body: "Following along",
      created: new Date().toISOString(),
    },
  ];
}

async function init() {
  if (!postEl || !commentsEl) return;

  try {
    showLoader();

    const [post, comments] = await Promise.all([fetchPost(), fetchComments()]);

    // Render post
    postEl.innerHTML = `
      <h2 class="mt-0 mb-1">${post.title}</h2>
      <p class="muted mb-1">by <strong>${post.author}</strong> ·
        <time datetime="${post.created}">${new Date(post.created).toLocaleString()}</time>
      </p>
      ${post.media?.url ? `<img src="${post.media.url}" alt="${post.media.alt || ""}" class="mb-1" />` : ""}
      <p>${post.body}</p>
    `;

    // Render comments
    if (!comments.length) {
      commentsEl.innerHTML = `
        <h3 class="mb-1">Comments</h3>
        <p class="muted">No comments yet.</p>
      `;
    } else {
      const items = comments
        .map(
          (c) => `
          <article class="card" style="padding:1rem; margin: .75rem 0;">
            <p class="muted mb-1">
              <strong>${c.author}</strong> · 
              <time datetime="${c.created}">${new Date(c.created).toLocaleString()}</time>
            </p>
            <p>${c.body}</p>
          </article>`
        )
        .join("");

      commentsEl.innerHTML = `<h3 class="mb-1">Comments</h3>${items}`;
    }

    console.log("Post page script is running.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load post.";
    postEl.innerHTML = `<p class="alert error">${message}</p>`;
  } finally {
    hideLoader();
  }
}

init();
