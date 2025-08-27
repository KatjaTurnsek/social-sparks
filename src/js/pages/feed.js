import "../../css/main.css";

const feedList = document.getElementById("feed-list");
const empty = document.getElementById("feed-empty");
const skeletons = document.getElementById("feed-skeletons");

if (feedList && empty && skeletons) {
  setTimeout(() => {
    skeletons.style.display = "none";

    const demoPosts = [];

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
        </article>
      `
      )
      .join("");

    console.log("Feed page script is running.");
  }, 800);
}
