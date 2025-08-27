import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  // https://katjaturnsek.github.io/social-sparks/
  base: "/social-sparks/",

  build: {
    rollupOptions: {
      // All my HTML entry points
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        register: resolve(__dirname, "register.html"),
        feed: resolve(__dirname, "feed.html"),
        post: resolve(__dirname, "post.html"),
        profile: resolve(__dirname, "profile.html"),
      },
    },
  },
});
