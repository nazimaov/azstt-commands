import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // GitHub Pages serves this repo at /<repo-name>/, not at the domain root — VITE_BASE_PATH
  // overrides the default "/" for that build (set by .github/workflows/deploy-pages.yml).
  // Unset for local dev and the single-process deployment (backend/app/main.py serving the
  // build itself from its own root), where "/" is correct.
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8766",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
