// @ts-check

/** @typedef {{ url?: string, alt?: string }} Media */

/** Lightweight profile used inside posts and follow lists. */
/** @typedef {{ name?: string, email?: string, bio?: string, avatar?: Media, banner?: Media }} ProfileSummary */

/** @typedef {{ id: string|number, body?: string, created?: string, author?: ProfileSummary, owner?: string }} Comment */

/** @typedef {{ comments?: number, reactions?: number }} PostCount */

/** @typedef {{ id: string|number, title?: string, body?: string, created?: string, author?: ProfileSummary, media?: Media, _count?: PostCount }} Post */

/** @typedef {{ posts?: number, followers?: number, following?: number }} ProfileCount */

/** Full profile model returned by /social/profiles/<name>. */
/** @typedef {{
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
