import "../../css/main.css";

const postEl = document.getElementById("post");
const commentsEl = document.getElementById("comments");

if (postEl && commentsEl) {
  // Demo placeholder content
  postEl.innerHTML = `
    <h2>Demo Post Title</h2>
    <p>This is a demo post body. Replace with API data later.</p>
  `;

  commentsEl.innerHTML = `
    <h3>Comments</h3>
    <p>No comments yet (demo).</p>
  `;

  console.log("Post page script is running.");
}
