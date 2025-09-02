export function errorFrom(json, fallback) {
  var msg = fallback || "Request failed";
  if (json && typeof json === "object") {
    if (
      json.errors &&
      Array.isArray(json.errors) &&
      json.errors[0] &&
      typeof json.errors[0].message === "string"
    ) {
      msg = json.errors[0].message;
    } else if (typeof json.message === "string") {
      msg = json.message;
    }
  }
  return msg;
}
