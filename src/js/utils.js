export { errorFrom } from "./shared/errors.js";
export { formatDate } from "./shared/dates.js";
export { clear, createEl } from "./shared/dom.js";
export { normalizeBearer } from "./shared/auth.js";

export const BASE_API_URL = "https://v2.api.noroff.dev";
export const NOROFF_API_KEY = "3e0a65ee-1d88-4fb0-9962-797226b01b32";

export function addToLocalStorage(key, value) {
  localStorage.setItem(key, value);
}

export function getFromLocalStorage(key) {
  return localStorage.getItem(key);
}

export function removeFromLocalStorage(key) {
  localStorage.removeItem(key);
}
