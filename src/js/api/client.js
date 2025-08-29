/* global __API_BASE__ */
import { getToken, getApiKey } from "../utils/storage.js";

/**
 * @typedef {Object} RequestOptions
 * @property {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} [method]
 * @property {Record<string,string>} [headers]
 * @property {any} [body]  // Plain objects JSON-encoded; FormData sent as-is.
 * @property {Record<string,string|number|boolean>} [query]
 * @property {string} [token] // Optional override; otherwise taken from storage.
 */

/**
 * Fetch wrapper for the Noroff API.
 * Uses __API_BASE__ (injected by Vite) with a safe fallback,
 * adds Authorization + X-Noroff-API-Key when present, parses JSON/text,
 * and normalizes HTTP errors.
 *
 * @param {string} path
 * @param {RequestOptions} [options]
 * @returns {Promise<any>}
 */
export async function request(path, options) {
  const opts = options || {};

  // --- Base URL (no import.meta) ---
  const rawBase =
    typeof __API_BASE__ === "string" && __API_BASE__
      ? __API_BASE__
      : "https://v2.api.noroff.dev";
  const base = String(rawBase).replace(/\/+$/, ""); // trim trailing slashes

  // --- Join base + path ---
  let cleanPath = path || "";
  if (cleanPath.charAt(0) === "/") cleanPath = cleanPath.slice(1);
  let url = base + "/" + cleanPath;

  // --- Query string ---
  if (opts.query) {
    const usp = new URLSearchParams();
    for (const key in opts.query) {
      if (Object.prototype.hasOwnProperty.call(opts.query, key)) {
        const val = opts.query[key];
        if (val !== undefined && val !== null) usp.append(key, String(val));
      }
    }
    const qs = usp.toString();
    if (qs) url += (url.indexOf("?") === -1 ? "?" : "&") + qs;
  }

  // --- Headers / method / body ---
  const headers = {};
  if (opts.headers) {
    for (const hk in opts.headers) {
      if (Object.prototype.hasOwnProperty.call(opts.headers, hk)) {
        headers[hk] = opts.headers[hk];
      }
    }
  }

  // Use `"body" in opts` instead of hasOwnProperty to keep linters happy
  const hasBody = Object(opts) === opts && "body" in opts;
  let body = hasBody ? opts.body : undefined;

  let method = "GET";
  if (opts.method) method = opts.method;
  else if (body !== undefined) method = "POST";

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && typeof body === "object") {
    headers["Content-Type"] = "application/json";
    try {
      body = JSON.stringify(body);
    } catch {
      // let fetch throw if serialization truly fails
    }
  }
  headers["Accept"] = "application/json";

  // --- Authorization ---
  let token = "";
  if (typeof opts.token === "string" && opts.token) {
    token = opts.token;
  } else {
    const t = getToken();
    if (t) token = t;
  }
  if (token) headers["Authorization"] = "Bearer " + token;

  // --- Noroff v2 API key ---
  const apiKey = getApiKey();
  if (apiKey) headers["X-Noroff-API-Key"] = apiKey;

  // --- Fetch ---
  const res = await fetch(url, { method, headers, body });

  // --- Parse response ---
  let data = null;
  const ct = res.headers ? res.headers.get("content-type") || "" : "";
  if (ct.indexOf("application/json") !== -1) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  // --- Normalize HTTP errors ---
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    if (data && typeof data === "object") {
      if (
        "errors" in data &&
        Array.isArray(data.errors) &&
        data.errors.length > 0
      ) {
        const first = data.errors[0];
        if (first && typeof first.message === "string") message = first.message;
      } else if ("message" in data && typeof data.message === "string") {
        message = data.message;
      }
    }
    const error = new Error(message);
    // attach extra info without ts-ignore
    Object.assign(error, { status: res.status, data });
    throw error;
  }

  return data;
}
