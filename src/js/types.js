/** @typedef {{ name?: string }} Author */
/** @typedef {{ url?: string, alt?: string }} Media */
/** @typedef {{ id: string|number, body?: string, created?: string, author?: Author, owner?: string }} Comment */
/** @typedef {{ id: string|number, title?: string, body?: string, created?: string, author?: Author, media?: Media }} Post */
/** @typedef {{ name: string, bio?: string, posts?: Post[] }} Profile */

export {};
