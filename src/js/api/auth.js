import { request } from "./client.js";
import { endpoints } from "./endpoints.js";
import { setToken, clearToken, setApiKey } from "../utils/storage.js";

/** Register a new user. */
export async function registerUser(payload) {
  // payload: { name, email, password }
  const res = await request(endpoints.auth.register, {
    method: "POST",
    body: payload,
  });
  return res && res.data ? res.data : res;
}

/**
 * Login and persist token + API key.
 * 1) POST /auth/login  -> store accessToken
 * 2) POST /auth/create-api-key -> store API key
 * Returns unwrapped user data.
 */
export async function loginUser(payload) {
  const res = await request(endpoints.auth.login, {
    method: "POST",
    body: payload,
  });

  const data = res && res.data ? res.data : res;

  // Extract token without a ternary (lint-friendly)
  let token = "";
  if (
    data &&
    typeof data === "object" &&
    data !== null &&
    Object.prototype.hasOwnProperty.call(data, "accessToken") &&
    typeof data.accessToken === "string"
  ) {
    token = data.accessToken;
  }

  if (token) {
    setToken(token);

    // Try to create an API key (don’t block login if it fails)
    try {
      const keyRes = await request("auth/create-api-key", { method: "POST" });
      const keyData = keyRes && keyRes.data ? keyRes.data : keyRes;
      if (
        keyData &&
        typeof keyData === "object" &&
        keyData !== null &&
        Object.prototype.hasOwnProperty.call(keyData, "key") &&
        typeof keyData.key === "string"
      ) {
        setApiKey(keyData.key);
      }
    } catch {
      // ignore API key creation errors
    }
  }

  return data;
}

/** Fetch current user (requires Authorization + X-Noroff-API-Key). */
export async function getMe() {
  const res = await request(endpoints.auth.me, { method: "GET" });
  return res && res.data ? res.data : res;
}

/** Clear local auth token (and optionally API key if you want). */
export function logout() {
  clearToken();
  // Optionally: clearApiKey();
}
