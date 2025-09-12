/**
 * @typedef {Object} RequestOptions
 * @property {string} [method="GET"] HTTP method
 * @property {Record<string,string>|Headers} [headers] Extra headers to attach
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
import { BASE_API_URL, NOROFF_API_KEY } from "../utils.js";
import { errorFrom } from "./errors.js";
import { normalizeBearer } from "./auth.js";

export async function request(path, options = {}) {
  const {
    method = "GET",
    headers: hdrs = {},
    query,
    body,
    bearer,
    attachAuth = true,
    attachApiKey = true,
    ...rest
  } = options;

  const isAbs = /^https?:\/\//i.test(path);
  const base = isAbs
    ? path
    : BASE_API_URL + (path.startsWith("/") ? path : "/" + path);

  const sp = new URLSearchParams();
  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) {
      if (v == null) continue;
      if (Array.isArray(v)) {
        for (const val of v) sp.append(k, String(val));
      } else {
        sp.set(k, String(v));
      }
    }
  }
  const url = sp.toString()
    ? base + (base.includes("?") ? "&" : "?") + sp.toString()
    : base;

  const incoming =
    hdrs instanceof Headers ? Object.fromEntries(hdrs.entries()) : { ...hdrs };

  const token =
    typeof bearer === "string" && bearer
      ? normalizeBearer(bearer)
      : attachAuth
        ? normalizeBearer(localStorage.getItem("accessToken") || "")
        : "";

  const headers = {
    ...incoming,
    ...(attachApiKey && { "X-Noroff-API-Key": NOROFF_API_KEY }),
    ...(token && { Authorization: "Bearer " + token }),
  };

  let finalBody = body;
  const hasCT = Object.keys(headers).some(
    (k) => k.toLowerCase() === "content-type"
  );

  const isFormData =
    typeof FormData !== "undefined" && finalBody instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && finalBody instanceof Blob;
  const isArrayBuffer = finalBody instanceof ArrayBuffer;

  const shouldJsonify =
    finalBody !== undefined &&
    typeof finalBody === "object" &&
    !isFormData &&
    !isBlob &&
    !isArrayBuffer;

  if (shouldJsonify) {
    if (!hasCT) headers["Content-Type"] = "application/json";
    finalBody = JSON.stringify(finalBody);
  }

  const res = await fetch(url, { method, headers, body: finalBody, ...rest });

  let parsed = null;
  let txt = "";
  try {
    txt = await res.text();
  } catch {
    txt = "";
  }
  try {
    parsed = txt ? JSON.parse(txt) : null;
  } catch {
    parsed = txt;
  }

  if (!res.ok) {
    throw new Error(errorFrom(parsed, res.statusText || "Request failed"));
  }

  if (parsed && typeof parsed === "object" && "data" in parsed) {
    return /** @type {any} */ (parsed).data;
  }
  return /** @type {any} */ (parsed);
}
