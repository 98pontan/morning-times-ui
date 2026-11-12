import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In development, /api and /healthz are proxied to the backend (run it with `python main.py` in morning-times).
// In production, nginx does the same (see nginx/default.conf.template).
const backend = process.env.BACKEND_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
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
