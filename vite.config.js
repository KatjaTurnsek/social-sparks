import { defineConfig, loadEnv } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/social-sparks/",
    define: {
      __API_BASE__: JSON.stringify(
        env.VITE_API_BASE || "https://v2.api.noroff.dev"
      ),
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          login: resolve(__dirname, "login.html"),
          register: resolve(__dirname, "register.html"),
          feed: resolve(__dirname, "feed.html"),
          post: resolve(__dirname, "post.html"),
          profile: resolve(__dirname, "profile.html"),
          search: resolve(__dirname, "search.html"),
          editPost: resolve(__dirname, "edit-post.html"),
          editProfile: resolve(__dirname, "edit-profile.html"),
        },
      },
    },
  };
});
