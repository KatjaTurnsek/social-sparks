import "../../css/main.css";
import { showLoader, hideLoader } from "../boot.js";

const feedList = document.getElementById("feed-list");
const empty = document.getElementById("feed-empty");
const skeletons = document.getElementById("feed-skeletons");

async function loadFeed() {
  if (!feedList || !empty || !skeletons) return;

  // show page skeletons immediately
  skeletons.style.display = "grid";
  empty.style.display = "none";
  feedList.innerHTML = "";

  try {
    showLoader(); // global loader during API call

    // TODO: replace with real API request
    await new Promise((r) => setTimeout(r, 1000));
    const demoPosts = [
      { title: "Hello World", body: "This is my first post!" },
      { title: "Another Post", body: "Loving Social Sparks." },
    ];
    // const demoPosts = []; // uncomment to test empty state

    skeletons.style.display = "none";

    if (demoPosts.length === 0) {
      empty.style.display = "block";
      return;
    }

    feedList.innerHTML = demoPosts
      .map(
        (p) => `
          <article class="card">
            <h2>${p.title}</h2>
            <p>${p.body}</p>
            <div class="form-actions mt-1">
              <a href="post.html" class="btn btn-outline">View</a>
            </div>
          </article>
        `
      )
      .join("");

    console.log("Feed page script is running.");
  } catch (err) {
    skeletons.style.display = "none";
    empty.style.display = "block";
    empty.textContent =
      err instanceof Error ? err.message : "Failed to load feed.";
  } finally {
    hideLoader();
  }
}

loadFeed();
