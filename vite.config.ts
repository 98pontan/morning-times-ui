import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

// In development, /api and /healthz are proxied to the backend (run it with `python main.py` in morning-times).
// In production, nginx does the same (see nginx/default.conf.template).
const backend = process.env.BACKEND_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  define: { __UI_VERSION__: JSON.stringify(version) },
  server: {
    port: 5173,
    proxy: { "/api": backend, "/healthz": backend },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
});
