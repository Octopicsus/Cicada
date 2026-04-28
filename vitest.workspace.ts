import { defineWorkspace } from "vitest/config";

/**
 * Workspace-level Vitest config. Each project listed here gets its own
 * config (`vitest.config.ts`) inside the package — that lets us pick
 * the right environment per package (jsdom for UI / web, node for domain).
 */
export default defineWorkspace(["apps/*/vitest.config.ts", "packages/*/vitest.config.ts"]);
