export function qs(sel, root) {
  return (root || document).querySelector(sel);
}

export function qsa(sel, root) {
  return (root || document).querySelectorAll(sel);
}

export function clearChildren(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}
