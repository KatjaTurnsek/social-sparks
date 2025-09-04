// @ts-check

/**
 * Media object used for avatars, banners, and post media.
 * Both fields are optional — URL may be missing if no media was uploaded.
 * @typedef {{
 *   url?: string,
 *   alt?: string
 * }} Media
 */

/**
 * Lightweight profile object.
 * Used inside posts (author), comments, and follower/following lists.
 * For full profile details, see {@link Profile}.
 * @typedef {{
 *   name?: string,
 *   email?: string,
 *   bio?: string,
 *   avatar?: Media,
 *   banner?: Media
 * }} ProfileSummary
 */

/**
 * A single comment on a post.
 * Includes author info (v2: `author`, v1 fallback: `owner` string).
 * @typedef {{
 *   id: string|number,
 *   body?: string,
 *   created?: string,
 *   author?: ProfileSummary,
 *   owner?: string
 * }} Comment
 */

/**
 * Count summary of related post data.
 * @typedef {{
 *   comments?: number,
 *   reactions?: number
 * }} PostCount
 */

/**
 * A social post object returned by the API.
 * Includes optional media and author details.
 * @typedef {{
 *   id: string|number,
 *   title?: string,
 *   body?: string,
 *   created?: string,
 *   author?: ProfileSummary,
 *   media?: Media,
 *   comments?: Comment[],
 *   _count?: PostCount
 * }} Post
 */

/**
 * Count summary of related profile data.
 * @typedef {{
 *   posts?: number,
 *   followers?: number,
 *   following?: number
 * }} ProfileCount
 */

/**
 * Full profile object returned by `/social/profiles/<name>`.
 * Extends {@link ProfileSummary} with follower/following lists and post data.
 * @typedef {{
 *   name: string,
 *   email?: string,
 *   bio?: string,
 *   avatar?: Media,
 *   banner?: Media,
 *   followers?: ProfileSummary[],
 *   following?: ProfileSummary[],
 *   posts?: Post[],
 *   _count?: ProfileCount
 * }} Profile
 */

export {};
