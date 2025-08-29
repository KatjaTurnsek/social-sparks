import { request } from "./client.js";
import { endpoints } from "./endpoints.js";

/** Internal: unwrap v2 shape { data, meta } → data */
function unwrap(res) {
  if (res && typeof res === "object" && res !== null && "data" in res) {
    // @ts-ignore runtime guard is sufficient
    return res.data;
  }
  return res;
}

/**
 * Get a single profile by name/handle.
 * @param {string} name
 * @param {{ _followers?: boolean, _following?: boolean, _posts?: boolean }=} query
 */
export async function getProfile(name, query) {
  const res = await request(endpoints.social.profileByHandle(name), {
    method: "GET",
    query: query || null,
  });
  return unwrap(res);
}

/**
 * List profiles (paginated).
 * @param {{ page?: number, limit?: number }=} query
 * @returns {Promise<any[]>}
 */
export async function listProfiles(query) {
  const res = await request("social/profiles", {
    method: "GET",
    query: query || null,
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Update a profile (bio, avatar, banner).
 * body example:
 * { bio: "string", avatar: { url, alt? }, banner: { url, alt? } }
 */
export async function updateProfile(name, body) {
  const res = await request(endpoints.social.profileByHandle(name), {
    method: "PUT",
    body: body,
  });
  return unwrap(res);
}

/**
 * Get all posts by a profile.
 * Accepts same flags as posts endpoint (_author, _comments, _reactions) + pagination.
 */
export async function listProfilePosts(name, query) {
  const encodedName = encodeURIComponent(String(name));
  const path = `social/profiles/${encodedName}/posts`;
  const res = await request(path, {
    method: "GET",
    query: query || null,
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

/** Follow a profile (requires auth + API key). Returns updated { followers, following }. */
export async function followProfile(name) {
  const encodedName = encodeURIComponent(String(name));
  const path = `social/profiles/${encodedName}/follow`;
  const res = await request(path, { method: "PUT" });
  return unwrap(res);
}

/** Unfollow a profile (requires auth + API key). Returns updated { followers, following }. */
export async function unfollowProfile(name) {
  const encodedName = encodeURIComponent(String(name));
  const path = `social/profiles/${encodedName}/unfollow`;
  const res = await request(path, { method: "PUT" });
  return unwrap(res);
}

/**
 * Search profiles by name or bio.
 * @param {string} q
 * @param {{ page?: number, limit?: number }=} query
 */
export async function searchProfiles(q, query) {
  const qobj = Object.assign({}, query || {}, { q: q });
  const res = await request("social/profiles/search", {
    method: "GET",
    query: qobj,
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}
