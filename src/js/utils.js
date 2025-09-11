// @ts-check
import { errorFrom } from "./shared/errors.js";
import { normalizeBearer } from "./shared/auth.js";

export { errorFrom } from "./shared/errors.js";
export { formatDate } from "./shared/dates.js";
export { clear, createEl } from "./shared/dom.js";
export { normalizeBearer } from "./shared/auth.js";

export const BASE_API_URL = "https://v2.api.noroff.dev";
export const NOROFF_API_KEY = "3e0a65ee-1d88-4fb0-9962-797226b01b32";

/**
 * Thin fetch wrapper with app defaults (API base, API key, optional auth, JSON).
 * Returns `json.data` when present, otherwise the raw parsed JSON.
 *
 * @template T=any
 * @param {string} path - API path ("/social/...") or absolute URL ("https://...").
 * @param {RequestInit & { json?: unknown, auth?: boolean }} [options]
 *   - `json`: if provided, sent as a JSON body.
 *   - `auth`: when true, attaches `Authorization: Bearer <token>` if available.
 * @returns {Promise<T>} Resolves with parsed payload (prefers `data`).
 * @throws {Error} When the response is non-OK (message normalized via `errorFrom`).
 */
export async function request(path, options = {}) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute
    ? path
    : BASE_API_URL + (path.startsWith("/") ? path : "/" + path);

  const headers = new Headers(options.headers || {});
  headers.set("X-Noroff-API-Key", NOROFF_API_KEY);

  if (options.auth) {
    const raw = localStorage.getItem("accessToken") || "";
    const token = normalizeBearer(raw);
    if (token) headers.set("Authorization", "Bearer " + token);
  }

  /** @type {BodyInit | undefined} */
  let body = options.body ?? undefined;

  if (options.json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(options.json);
  }

  const res = await fetch(url, { ...options, headers, body });

  /** @type {any} */
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(errorFrom(json, res.statusText || "Request failed"));
  }

  return json && typeof json === "object" && "data" in json ? json.data : json;
}

export function addToLocalStorage(key, value) {
  localStorage.setItem(key, value);
}

export function getFromLocalStorage(key) {
  return localStorage.getItem(key);
}

export function removeFromLocalStorage(key) {
  localStorage.removeItem(key);
}
