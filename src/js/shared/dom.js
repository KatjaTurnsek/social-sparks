export function clear(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}
export function createEl(tag, className, text) {
  var n = document.createElement(tag);
  if (className) n.className = className;
  if (typeof text === "string") n.textContent = text;
  return n;
}

export function setMsg(el, text, ok) {
  if (!el) return;
  el.style.display = "block";
  el.className = "form-message alert" + (ok ? " success" : " error");
  el.textContent = text;
}
