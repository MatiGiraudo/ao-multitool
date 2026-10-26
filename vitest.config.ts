import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
