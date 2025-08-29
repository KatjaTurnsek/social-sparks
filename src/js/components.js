// Tiny DOM helpers to build UI components without innerHTML.

/**
 * Button
 * @param {{label?:string, variant?:"solid"|"outline", href?:string, onClick?:(e:Event)=>void, type?:"button"|"submit"|"reset", ariaLabel?:string}} opts
 */
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
    const a = document.createElement("a");
    a.className = classes.join(" ");
    if (ariaLabel) a.setAttribute("aria-label", ariaLabel);
    a.href = String(href);
    a.appendChild(document.createTextNode(label || ""));
    return a;
  }

  const btn = document.createElement("button");
  btn.className = classes.join(" ");
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  btn.type = type;
  if (typeof onClick === "function") btn.addEventListener("click", onClick);
  btn.appendChild(document.createTextNode(label || ""));
  return btn;
}

/**
 * InputField
 * @param {{id?:string, label?:string, type?:string, required?:boolean, autocomplete?:string, helpText?:string, value?:string, inputmode?:string, minLength?:number}} opts
 * @returns {{wrapper:HTMLDivElement, input:HTMLInputElement|HTMLTextAreaElement}}
 */
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
  if (typeof id === "string" && id) lab.htmlFor = id;
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

  if (typeof id === "string" && id) {
    input.id = id;
    input.name = id;
  }
  if (required) input.required = true;
  if (autocomplete) input.autocomplete = autocomplete;
  if (inputmode) input.inputMode = inputmode;
  if (typeof minLength === "number") input.minLength = minLength;
  if (value) input.value = value;
  wrap.appendChild(input);

  if (helpText) {
    const help = document.createElement("small");
    help.className = "help";
    const helpId = typeof id === "string" && id ? id + "-help" : "";
    if (helpId) help.id = helpId;
    help.textContent = helpText;
    if (help.id) input.setAttribute("aria-describedby", help.id);
    wrap.appendChild(help);
  }

  return { wrapper: wrap, input };
}

/**
 * Alert
 * @param {{text?:string, type?:"error"|"success"}} opts
 */
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

function countFor(reactions, symbol) {
  if (!reactions || !Array.isArray(reactions)) return 0;
  for (let i = 0; i < reactions.length; i += 1) {
    const r = reactions[i];
    if (r && r.symbol === symbol && typeof r.count === "number") return r.count;
  }
  return 0;
}

function uniqueSymbolsFromReactions(reactions) {
  const out = [];
  if (Array.isArray(reactions)) {
    for (let i = 0; i < reactions.length; i += 1) {
      const s = reactions[i] && reactions[i].symbol;
      if (typeof s === "string" && s && out.indexOf(s) === -1) out.push(s);
    }
  }
  return out;
}

/**
 * PostCard with multi-emoji reaction bar.
 * @param {{
 *   id?:string|number,
 *   title?:string,
 *   author?:string|{name?:string},
 *   created?:string,
 *   body?:string,
 *   media?:{url?:string, alt?:string},
 *   reactions?: Array<{symbol:string,count:number,reactors?:string[]}>,
 *   reactSymbols?: string[],
 *   onReact?: (args: { postId: string|number, symbol: string, button: HTMLButtonElement, setCount: (n:number)=>void }) => void
 * }} opts
 */
export function PostCard(opts) {
  const { id, title, author, created, body, media, reactions, onReact } =
    opts || {};

  // Guarded read for opts.reactSymbols (lint-safe)
  let explicit = [];
  if (opts && typeof opts === "object" && opts !== null) {
    const maybe = /** @type {any} */ (opts).reactSymbols;
    if (Array.isArray(maybe)) explicit = maybe;
  }

  // Build the symbol list: API-provided + explicit + defaults
  let symbols = uniqueSymbolsFromReactions(reactions);
  for (let i = 0; i < explicit.length; i += 1) {
    const s = explicit[i];
    if (symbols.indexOf(s) === -1) symbols.push(s);
  }
  if (symbols.length === 0) symbols = ["👍", "❤️", "🎉"];

  const article = document.createElement("article");
  article.className = "card";

  const h2 = document.createElement("h2");
  h2.className = "post-title";
  h2.textContent = title || "Untitled";
  article.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "muted mb-1";
  meta.appendChild(document.createTextNode("by "));

  let authorName = "Unknown";
  if (typeof author === "string" && author) {
    authorName = author;
  } else if (
    author &&
    typeof author === "object" &&
    author !== null &&
    typeof author.name === "string"
  ) {
    authorName = author.name;
  }

  const authorLink = document.createElement("a");
  authorLink.className = "post-author";
  authorLink.href = "profile.html?name=" + encodeURIComponent(authorName);
  authorLink.textContent = authorName;
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

  // View button
  const view = Button({
    label: "View",
    variant: "outline",
    href: "post.html?id=" + encodeURIComponent(String(id == null ? "" : id)),
  });
  actions.appendChild(view);

  // Reaction bar
  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];
    const initial = countFor(reactions, symbol);
    const btn = Button({
      label: initial > 0 ? symbol + " " + initial : symbol,
      variant: "outline",
      ariaLabel: "React " + symbol,
    });
    btn.addEventListener("click", function handleClick() {
      if (typeof onReact !== "function" || id == null) return;
      btn.disabled = true;
      onReact({
        postId: id,
        symbol: symbol,
        button: btn,
        setCount: function setCount(n) {
          btn.textContent = n > 0 ? symbol + " " + n : symbol;
        },
      });
    });
    actions.appendChild(btn);
  }

  article.appendChild(actions);
  return article;
}

/**
 * setStatus — convenience for status updates in live regions
 * @param {HTMLElement|null} el
 * @param {string} message
 * @param {"error"|"success"|null} [type]
 */
export function setStatus(el, message, type) {
  if (!el) return;
  el.style.display = "block";
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
  el.textContent = message || "";
}
