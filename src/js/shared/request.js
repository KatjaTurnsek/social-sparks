/**
 * @typedef {Object} RequestOptions
 * @property {string} [method="GET"] HTTP method
 * @property {Record<string,string>} [headers] Extra headers to attach
 * @property {Record<string,any>} [query] Query params (null/undefined skipped)
 * @property {any} [body] Body; objects JSON.stringified, FormData sent as-is
 * @property {string} [bearer] Explicit bearer token (overrides storage)
 * @property {boolean} [attachAuth=true] Attach Authorization: Bearer if token exists
 * @property {boolean} [attachApiKey=true] Attach X-Noroff-API-Key from utils
 */

/**
 * @description API fetch wrapper using BASE_API_URL/NOROFF_API_KEY. Attaches auth safely,
 * parses JSON, unwraps `{ data }`, and normalizes errors.
 * @template T
 * @param {string} path Relative path (e.g. "/social/posts") or absolute URL
 * @param {RequestOptions} [options]
 * @returns {Promise<T>} Resolves to `json.data` when present, else raw JSON/text.
 * @throws {Error} Non-OK responses include API error details when available.
 */
