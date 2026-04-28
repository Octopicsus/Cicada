import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@cicada/domain",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    globals: true,
  },
});
