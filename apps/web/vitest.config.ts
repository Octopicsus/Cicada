import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@cicada/web",
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
  },
});
