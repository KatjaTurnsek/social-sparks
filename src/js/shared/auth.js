export function normalizeBearer(token) {
  var t = String(token || "").trim();
  if (!t) return "";
  if (t.toLowerCase().indexOf("bearer ") === 0) t = t.slice(7).trim();
  return t;
}
