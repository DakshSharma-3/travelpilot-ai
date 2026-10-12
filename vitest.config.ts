import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone test config: intentionally does NOT reuse the app's Vite config
// (Lovable/TanStack plugins are build-time concerns and slow tests down).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
