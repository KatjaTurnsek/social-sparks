import { showLoader, hideLoader } from "../boot.js";
import { PostCard, setStatus } from "../components.js";
import { listPosts, reactToPost } from "../api/posts.js";

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

    const posts = await listPosts({
      limit: 12,
      page: 1,
      _author: true,
      _reactions: true,
    });
    skeletons.style.display = "none";

    if (!posts || posts.length === 0) {
      empty.style.display = "block";
      empty.textContent = "No posts yet. Be the first to share something!";
      return;
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < posts.length; i += 1) {
      const p = posts[i];
      const id = p && p.id != null ? p.id : "";
      const title = p && p.title ? p.title : "Untitled";
      const body = p && p.body ? p.body : "";
      const created = p && p.created ? p.created : new Date().toISOString();
      const media = p && p.media ? p.media : null;

      let authorName = "Unknown";
      if (
        p &&
        p.author &&
        typeof p.author === "object" &&
        p.author !== null &&
        typeof p.author.name === "string"
      ) {
        authorName = p.author.name;
      }

      frag.appendChild(
        PostCard({
          id: id,
          title: title,
          author: authorName,
          created: created,
          body: body,
          media: media,
          reactions: p && Array.isArray(p.reactions) ? p.reactions : [],
          // Optional: provide a preferred list; will merge with API symbols
          reactSymbols: ["👍", "❤️", "🎉"],
          onReact: async (args) => {
            const postId = args.postId;
            const symbol = args.symbol;
            const button = args.button;
            const setCount = args.setCount;

            button.disabled = true;
            try {
              const result = await reactToPost(postId, symbol);
              // Find the new count for this symbol
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
              setCount(newCount);
            } catch (err) {
              let m = "Failed to react.";
              if (
                err &&
                typeof err === "object" &&
                Object.prototype.hasOwnProperty.call(err, "message")
              ) {
                const maybe = err.message;
                if (typeof maybe === "string") m = maybe;
              }
              setStatus(empty, m, "error");
            } finally {
              button.disabled = false;
            }
          },
        })
      );
    }
    feedList.appendChild(frag);
  } catch (err) {
    skeletons.style.display = "none";
    empty.style.display = "block";
    let m = "Failed to load feed.";
    if (
      err &&
      typeof err === "object" &&
      Object.prototype.hasOwnProperty.call(err, "message")
    ) {
      const maybe = err.message;
      if (typeof maybe === "string") m = maybe;
    }
    setStatus(empty, m, "error");
  } finally {
    hideLoader();
  }
}

loadFeed();
