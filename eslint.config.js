// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  // Ignore build artifacts
  {
    ignores: ["dist/**", "node_modules/**"],
  },

  // Base recommended JS rules
  js.configs.recommended,

  // Project settings + Prettier integration
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Show Prettier formatting issues as ESLint errors
      "prettier/prettier": "error",

      // Your prefs
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },

  // Turn off ESLint rules that conflict with Prettier
  eslintConfigPrettier,
];
