# Social Sparks

![Social Sparks Screenshot](assets/images/social-sparks-thumb.webp)

A mini social network / micro-blogging app where users can register, log in, browse the feed, create/edit/delete their own posts, follow/unfollow, react with emojis, and comment. Built with Vite and vanilla JavaScript (ES modules).

## 🔗 Links 

- **Deployed on GitHub Pages:** [Social Sparks Website](https://katjaturnsek.github.io/social-sparks/)
- **GitHub Repository:** [https://github.com/KatjaTurnsek/social-sparks](https://github.com/KatjaTurnsek/social-sparks)
- **Project Kanban:** [Open the Kanban Board »](https://github.com/users/KatjaTurnsek/projects/2/views/1)
- **Api Docs:** [Open Api Docs »](https://docs.noroff.dev/docs/v2)

## ✅ Features (per brief)

- Register & Login (Noroff Auth)
- View feed & single post
- Create / Edit / Delete own posts
- Comments & emoji reactions
- Profiles: posts, followers, following
- Follow / Unfollow users
- Search posts

## 🔧 Built With

- Vite (multi-page build, fast dev server)
- JavaScript (ES Modules) with // @ts-check + JSDoc
- HTML5, CSS3 (custom styles, simple grid/cards)
- Noroff API v2 (Auth + Social endpoints)

Multi-page via Vite: Although this is a lightweight SPA-style experience, the project ships multiple HTML entry points (feed, post, profile, etc.) using a custom vite.config.js. This keeps each page lean while still benefiting from Vite’s dev/build pipeline.

## 📄 Pages

- `index.html` – Landing (latest posts & profiles)
- `login.html`, `register.html`
- `feed.html` – All posts
- `post.html` – Single post (comments/reactions)
- `profile.html` – User profile
- `search.html` – Search results
- `create-post.html`, `edit-post.html`, `edit-profile.html`

## 🧩 How This Meets the Brief

- ES6 modules used throughout
- At least 3 functions with JSDoc: dozens of functions across pages include JSDoc + // @ts-check
- Deployed app: GitHub Pages
- Basic UI: Cards, grid layout, responsive inputs, accessible nav & forms
- README includes how to run the project and documentation pointers

## 🔧 Getting Started (Local)

### 1) Clone
`git clone https://github.com/KatjaTurnsek/social-sparks.git`
`cd social-sparks`

### 2) Install deps
`npm install`

### 3) Start dev server
`npm run dev`

## 🏗️ Build & Deploy
Build (outputs to /docs for GitHub Pages):

### Build for production
`npm run build`

- Commit and push changes (including the /docs build) to main.
- GitHub Pages is configured to serve from /docs on the main branch.
- Live URL: https://katjaturnsek.github.io/social-sparks/

## ⚙️ Configuration

- Defaults to https://v2.api.noroff.dev.
- Optional override in a .env file:

`VITE_API_BASE="https://v2.api.noroff.dev"`
(Already handled in vite.config.js with a sensible default.)

## 📁 Project Structure (excerpt)

```text
assets/
  images/
    social-sparks-thumb.webp
src/
  css/
    main.css
  js/
    boot.js
    types.js
    utils.js
    pages/
      index.js
      login.js
      register.js
      feed.js
      post.js
      profile.js
      search.js
      create-post.js
      edit-post.js
      edit-profile.js
index.html
login.html
register.html
feed.html
post.html
profile.html
search.html
create-post.html
edit-post.html
edit-profile.html
vite.config.js
```

## 📚 Documentation & Code Quality

// @ts-check + JSDoc across modules for better IntelliSense and type-safety in vanilla JS.

### Modern JS features:

- Template literals for safe, readable string building
- Array methods (`map`, `filter`, `reduce`, `find`) for declarative data handling
- Destructuring and optional chaining for clarity and safety
- Small, focused modules to avoid “god files”
- **Error handling** centralized via `shared/errors.js` (`errorFrom`)
_Read the docs directly in the JS files on GitHub or in your IDE._

## ♿ Accessibility & Performance

- Semantic HTML, descriptive labels, and skip link
- ARIA live regions for status messages
- Keyboard focus states and logical navigation
- Respects reduced motion where applicable
- Lazy-loaded images, basic skeleton loaders, minimal JS payload

## 🤝 Contributing

Contributions are welcome! Bug fixes, docs improvements, and small features are appreciated.

1. **Fork** the repo and create a branch:

`git checkout -b feat/your-short-title`

2. **Run locally** with `npm run dev`
3. **Commit** with clear messages (Conventional Commits encouraged)
4. **Open a PR** to main with:
- Summary of changes and motivation
- Screenshots/GIFs for UI tweaks
- Any accessibility/performance notes

### Code Style

- ES Modules, modern JS, keep dependencies minimal
- Keep modules focused; avoid large files with many responsibilities
- Maintain visible focus states and good color contrast
- Optimize images (WebP/JPG), use lazy loading where sensible

## 🙋‍♀️ Author

** Katja Turnšek **
Frontend Development Student
[Portfolio Website](https://katjaturnsek.github.io/portfolio/) (coming soon)



