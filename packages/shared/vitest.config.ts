import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@cicada/shared",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    globals: true,
  },
});
