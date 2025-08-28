// Tiny DOM helpers to build UI components without innerHTML.

// Button({ label, variant: "solid"|"outline", href?, onClick?, type?, ariaLabel? })
export function Button(opts) {
  const {
    label,
    variant = "solid",
    href,
    onClick,
    type = "button",
    ariaLabel,
  } = opts || {};

  const classes = ["btn"];
  if (variant === "outline") classes.push("btn-outline");

  if (href) {
    // Anchor button (navigation)
    const a = document.createElement("a");
    a.className = classes.join(" ");
    if (ariaLabel) a.setAttribute("aria-label", ariaLabel);
    a.href = String(href);
    a.appendChild(document.createTextNode(label || ""));
    return a;
  } else {
    // Real button (actions)
    const btn = document.createElement("button");
    btn.className = classes.join(" ");
    if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
    btn.type = type;
    if (typeof onClick === "function") btn.addEventListener("click", onClick);
    btn.appendChild(document.createTextNode(label || ""));
    return btn;
  }
}

// InputField({ id, label, type="text"|"textarea", required, autocomplete, helpText, value, inputmode, minLength })
export function InputField(opts) {
  const {
    id,
    label,
    type = "text",
    required = false,
    autocomplete,
    helpText,
    value = "",
    inputmode,
    minLength,
  } = opts || {};

  const wrap = document.createElement("div");
  wrap.className = "field";

  const lab = document.createElement("label");
  lab.className = "label";
  lab.htmlFor = id;
  lab.appendChild(document.createTextNode(label || ""));
  wrap.appendChild(lab);

  let input;
  if (type === "textarea") {
    input = document.createElement("textarea");
    input.className = "textarea";
  } else {
    input = document.createElement("input");
    input.className = "input";
    input.type = type;
  }

  input.id = id;
  input.name = id;
  if (required) input.required = true;
  if (autocomplete) input.autocomplete = autocomplete;
  if (inputmode) input.inputMode = inputmode;
  if (minLength) input.minLength = minLength;
  if (value) input.value = value;
  wrap.appendChild(input);

  if (helpText) {
    const help = document.createElement("small");
    help.className = "help";
    help.id = id ? id + "-help" : "";
    help.textContent = helpText;
    if (help.id) input.setAttribute("aria-describedby", help.id);
    wrap.appendChild(help);
  }

  return { wrapper: wrap, input };
}

// Alert({ text, type: "error"|"success"|undefined })
export function Alert(opts) {
  const { text, type } = opts || {};
  const alertEl = document.createElement("p");
  alertEl.className = "form-message alert";
  if (type) alertEl.classList.add(type);
  alertEl.setAttribute("role", "status");
  alertEl.setAttribute("aria-live", "polite");
  alertEl.style.display = "block";
  alertEl.textContent = text || "";
  return alertEl;
}

// PostCard({ id, title, author, created, body, media: {url,alt}? })
export function PostCard(opts) {
  const { id, title, author, created, body, media } = opts || {};
  const article = document.createElement("article");
  article.className = "card";

  const h2 = document.createElement("h2");
  h2.className = "post-title";
  h2.textContent = title || "Untitled";
  article.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "muted mb-1";
  meta.appendChild(document.createTextNode("by "));

  const authorLink = document.createElement("a");
  authorLink.href = "profile.html";
  authorLink.className = "post-author";
  authorLink.textContent = author || "Unknown";
  meta.appendChild(authorLink);
  meta.appendChild(document.createTextNode(" · "));

  const timeEl = document.createElement("time");
  const dt = created || new Date().toISOString();
  timeEl.className = "post-time";
  timeEl.setAttribute("datetime", dt);
  timeEl.textContent = new Date(dt).toLocaleString();
  meta.appendChild(timeEl);
  article.appendChild(meta);

  if (media && media.url) {
    const img = document.createElement("img");
    img.className = "mb-1 post-media";
    img.src = media.url;
    img.alt = media.alt || "";
    article.appendChild(img);
  }

  const para = document.createElement("p");
  para.className = "post-body";
  para.textContent = body || "";
  article.appendChild(para);

  const actions = document.createElement("div");
  actions.className = "form-actions mt-1";
  const view = Button({
    label: "View",
    variant: "outline",
    href: "post.html?id=" + encodeURIComponent(id || ""),
  });
  actions.appendChild(view);
  article.appendChild(actions);

  return article;
}

// Convenience for status updates in live regions
export function setStatus(el, message, type) {
  if (!el) return;
  el.style.display = "block";
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
  el.textContent = message || "";
}
