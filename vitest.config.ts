import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    maxWorkers: 1,
    restoreMocks: true,
    clearMocks: true,
  },
  esbuild: { jsx: "automatic" },
});
