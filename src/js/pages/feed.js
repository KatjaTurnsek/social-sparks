import { showLoader, hideLoader } from "../boot.js";
import { PostCard, setStatus } from "../components.js";

const feedList = document.getElementById("feed-list");
const empty = document.getElementById("feed-empty");
const skeletons = document.getElementById("feed-skeletons");

async function loadFeed() {
  if (!feedList || !empty || !skeletons) return;

  skeletons.style.display = "grid";
  empty.style.display = "none";
  feedList.replaceChildren();

  try {
    showLoader();

    // TODO: replace with real API request and set `posts` to the response array
    await new Promise((r) => setTimeout(r, 600));
    const posts = []; // keep empty to avoid lint issues with demo literals

    skeletons.style.display = "none";

    if (posts.length === 0) {
      empty.style.display = "block";
      empty.textContent = "No posts yet. Be the first to share something!";
      return;
    }

    // Will render when you provide real posts with { id, title, author, created, body, media? }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < posts.length; i += 1) {
      const p = posts[i];
      frag.appendChild(
        PostCard({
          id: p.id,
          title: p.title,
          author: p.author,
          created: p.created,
          body: p.body,
          media: p.media, // optional
        })
      );
    }
    feedList.appendChild(frag);
  } catch (err) {
    skeletons.style.display = "none";
    empty.style.display = "block";
    let msg = "Failed to load feed.";
    if (err && typeof err === "object" && err !== null && "message" in err) {
      const maybe = /** @type {{message?: unknown}} */ (err).message;
      if (typeof maybe === "string") msg = maybe;
    }
    setStatus(empty, msg, "error");
  } finally {
    hideLoader();
  }
}

loadFeed();
