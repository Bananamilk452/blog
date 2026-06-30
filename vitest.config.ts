import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
