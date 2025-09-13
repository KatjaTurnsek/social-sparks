# Social Sparks

![Social Sparks Screenshot](assets/images/social-sparks-thumb.webp)

A mini social network / micro-blogging app where users can register, log in, browse the feed, create/edit/delete their own posts, follow/unfollow other users, react with emojis, and add comments. Built as a vanilla JavaScript multi-page app with Vite and ES modules, focusing on accessibility, clarity, and maintainable structure.

## 📍 Live Site

Deployed on GitHub Pages:
[Social Sparks Website](https://katjaturnsek.github.io/social-sparks/)

## 💻 GitHub Repository

[https://github.com/KatjaTurnsek/social-sparks](https://github.com/KatjaTurnsek/social-sparks)

## 📌 Project Kanban
[Open the Kanban Board »](https://github.com/users/KatjaTurnsek/projects/2/views/1)

## 📝 Description

**Social Sparks** is a front-end Course Assignment with the Noroff Social API (v2). 

### Users can:

- Register and log in 
- View the global feed and individual posts
- Create, edit, and delete their own posts
- React to posts with emojis and comment on posts
- View user profiles, including followers/following
- Follow/unfollow other users
- Search posts and profiles

The app uses small, focused ES modules, JSDoc for better tooling/validation (via // @ts-check), and modern JavaScript patterns (template literals, array methods, destructuring). UI is intentionally clean and lightweight to highlight the JavaScript functionality.

## Key Features

- Authentication (Register, Login) with localStorage token handling
- Feed with newest-first sorting and pagination
- Single Post view with comments and emoji reactions
- Create / Edit / Delete your own posts
- Profiles with posts + followers/following lists
- Follow/Unfollow users
- Search posts
- Accessibility: skip link, semantic structure, visible focus, ARIA live regions
- Performance: lazy-loaded images, minimal JS, skeleton loaders
- Global nav state that updates on login/logout (with toast/flash)

## 🔧 Built With

- Vite (multi-page build, fast dev server)
- JavaScript (ES Modules) with // @ts-check + JSDoc
- HTML5, CSS3 (custom styles, simple grid/cards)
- Noroff API v2 (Auth + Social endpoints)

Multi-page via Vite: Although this is a lightweight SPA-style experience, the project ships multiple HTML entry points (feed, post, profile, etc.) using a custom vite.config.js. This keeps each page lean while still benefiting from Vite’s dev/build pipeline.

## Pages

- index.html – Landing + latest posts & profiles
- login.html – Log in
- register.html – Create account
- feed.html – All posts (paginated)
- post.html – Single post (comments + reactions)
- profile.html – User profile (posts, followers, following)
- search.html – Post search results
- edit-post.html – Edit your post
- edit-profile.html – Edit your profile

## User Stories (Feature Matrix)

- Register new user
- Login user
- Get all posts (Feed)
- Get single post
- Create post
- Edit own post
- Delete own post
- Get posts of a user (on profile page)
- Follow / Unfollow user
- Search posts
- View my own profile
- Comment on post (implemented)
- React to a post (implemented)

## 🧩 How This Meets the Brief

- ES6 modules used throughout
- At least 3 functions with JSDoc: dozens of functions across pages include JSDoc + // @ts-check
- Deployed app: GitHub Pages (link will be added once published)
- Basic UI: Cards, grid layout, responsive inputs, accessible nav & forms
- README includes how to run the project and documentation pointers

## 🔧 Getting Started (Local)

### Prerequisites
Node.js 18+ recommended

### Install and Run

#### 1) Clone
git clone https://github.com/KatjaTurnsek/social-sparks.git
cd social-sparks

#### 2) Install deps
npm install

#### 3) Start dev server
npm run dev

#### 4) Build for production
npm run build

#### 5) Preview the production build locally
npm run preview

### Environment / Config

Defaults to Noroff API v2: https://v2.api.noroff.dev
The Vite config supports an override via VITE_API_BASE:

VITE_API_BASE="https://v2.api.noroff.dev"

(If not set, the default is used.)

## 🔗 API

Docs: https://docs.noroff.dev/docs/v2
Auth: https://docs.noroff.dev/docs/v2/auth/register
 / login
Posts: https://docs.noroff.dev/docs/v2/social/posts
Profiles: https://docs.noroff.dev/docs/v2/social/profiles

Authentication uses Bearer tokens stored in localStorage (access token + profile name). Requests include the X-Noroff-API-Key header.

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

git checkout -b feat/your-short-title
#### or: fix/..., docs/..., style/...

2. **Run locally** with npm run dev
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

## 🧪 Testing & Debugging

- Manual testing flows for auth, CRUD, follows, comments, and reactions
- Error states surfaced via alerts/toasts and inline messages
- DevTools + network inspection against Noroff API

## 📦 Deployment (GitHub Pages)

- The project is configured with base: "/social-sparks/" in vite.config.js
- Build: `npm run build`
- Deploy the dist/ folder to GitHub Pages (e.g. via gh-pages branch or GitHub Actions)
- Final URL will be: https://katjaturnsek.github.io/social-sparks/

## 🔒 Notes & Limitations

- Token is stored in localStorage for simplicity (typical for assignments)
- Basic UI focus to showcase JavaScript functionality
- No front-end frameworks per assignment restriction

## 🙋‍♀️ Author

** Katja Turnšek **
Frontend Development Student
[Portfolio Website](https://katjaturnsek.github.io/portfolio/) (coming soon)



