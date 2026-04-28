import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy strings with single spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("returns an empty string when all parts are falsy", () => {
    expect(cn(false, undefined, null)).toBe("");
  });

  it("returns the single string unchanged", () => {
    expect(cn("only")).toBe("only");
  });
});
