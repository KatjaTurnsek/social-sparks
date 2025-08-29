export const TOKEN_KEY = "ss_token";
export const API_KEY_KEY = "ss_api_key";

/** Save access token (string). */
export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, String(token || ""));
  } catch {
    // ignore storage errors (Safari private, etc.)
  }
}

/** Get access token or empty string. */
export function getToken() {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? t : "";
  } catch {
    return "";
  }
}

/** Remove access token. */
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Save Noroff v2 API key (string). */
export function setApiKey(key) {
  try {
    localStorage.setItem(API_KEY_KEY, String(key || ""));
  } catch {
    // ignore
  }
}

/** Get API key or empty string. */
export function getApiKey() {
  try {
    const k = localStorage.getItem(API_KEY_KEY);
    return k ? k : "";
  } catch {
    return "";
  }
}

/** Remove API key. */
export function clearApiKey() {
  try {
    localStorage.removeItem(API_KEY_KEY);
  } catch {
    // ignore
  }
}

/** Optional convenience: clear both token and API key. */
export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(API_KEY_KEY);
  } catch {
    // ignore
  }
}
