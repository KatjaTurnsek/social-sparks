export function clear(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function esc(v) {
  const s = String(v ?? "");
  return s.replace(/[&<>"']/g, (ch) =>
    ch === "&"
      ? "&amp;"
      : ch === "<"
        ? "&lt;"
        : ch === ">"
          ? "&gt;"
          : ch === '"'
            ? "&quot;"
            : "&#39;"
  );
}

export function createEl(tag, className, text) {
  const n = document.createElement(tag);
  if (className) {
    const classes = Array.isArray(className)
      ? className
      : String(className).split(/\s+/).filter(Boolean);
    if (classes.length) n.classList.add(...classes);
  }
  if (typeof text === "string") {
    n.textContent = text;
  } else if (text instanceof Node) {
    n.append(text);
  }
  return n;
}

export function setMsg(el, text, ok) {
  if (!el) return;
  el.style.display = "block";
  el.className = "form-message alert" + (ok ? " success" : " error");
  el.textContent = text;
}
