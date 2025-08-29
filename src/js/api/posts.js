import { request } from "./client.js";
import { endpoints } from "./endpoints.js";

/** Internal: unwrap v2 shape { data, meta } */
function unwrap(res) {
  if (res && typeof res === "object" && res !== null && "data" in res) {
    // @ts-ignore runtime guard is sufficient
    return res.data;
  }
  return res;
}

/**
 * List posts.
 * @param {{ page?: number, limit?: number, _author?: boolean, _comments?: boolean, _reactions?: boolean, _tag?: string }=} query
 * @returns {Promise<any[]>}
 */
export async function listPosts(query) {
  const res = await request(endpoints.social.posts, {
    method: "GET",
    query: query || null,
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Get single post by id.
 * @param {string|number} id
 * @param {{ _author?: boolean, _comments?: boolean, _reactions?: boolean }=} query
 * @returns {Promise<any>}
 */
export async function getPost(id, query) {
  const res = await request(endpoints.social.postById(id), {
    method: "GET",
    query: query || null,
  });
  return unwrap(res);
}

/**
 * Create a post (requires auth).
 * body: { title, body?, tags?, media? { url, alt? } }
 */
export async function createPost(body) {
  const res = await request(endpoints.social.posts, {
    method: "POST",
    body: body,
  });
  return unwrap(res);
}

/** Update a post by id (requires auth). */
export async function updatePost(id, body) {
  const res = await request(endpoints.social.postById(id), {
    method: "PUT",
    body: body,
  });
  return unwrap(res);
}

/** Delete a post by id (requires auth). Returns true on success. */
export async function deletePost(id) {
  await request(endpoints.social.postById(id), { method: "DELETE" });
  return true; // request() throws on non-2xx, so reaching here means success
}

/**
 * Posts from profiles the current user follows (requires auth + API key).
 * Accepts same optional flags/pagination as listPosts.
 */
export async function listFollowingPosts(query) {
  const res = await request("social/posts/following", {
    method: "GET",
    query: query || null,
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Toggle a reaction on a post (PUT). `symbol` must be an emoji.
 * Returns { postId, symbol, reactions: [{symbol,count,reactors}] }
 */
export async function reactToPost(id, symbol) {
  const path =
    "social/posts/" +
    encodeURIComponent(String(id)) +
    "/react/" +
    encodeURIComponent(String(symbol));
  const res = await request(path, { method: "PUT" });
  return unwrap(res);
}

/**
 * Create a comment on a post.
 * @param {string|number} id
 * @param {string} body - comment text (required)
 * @param {number=} replyToId - optional comment id to reply to
 */
export async function commentOnPost(id, body, replyToId) {
  const payload = { body: body };
  if (typeof replyToId === "number") {
    // @ts-ignore - runtime guard
    payload.replyToId = replyToId;
  }
  const res = await request(
    "social/posts/" + encodeURIComponent(String(id)) + "/comment",
    { method: "POST", body: payload }
  );
  return unwrap(res);
}

/** Delete a comment (requires auth). Returns true on success. */
export async function deleteComment(postId, commentId) {
  const path =
    "social/posts/" +
    encodeURIComponent(String(postId)) +
    "/comment/" +
    encodeURIComponent(String(commentId));
  await request(path, { method: "DELETE" });
  return true; // success if no error thrown
}

/**
 * Search posts by title/body.
 * @param {string} q
 * @param {{ page?: number, limit?: number }=} query
 */
export async function searchPosts(q, query) {
  const qobj = Object.assign({}, query || {}, { q: q });
  const res = await request("social/posts/search", {
    method: "GET",
    query: qobj,
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}
