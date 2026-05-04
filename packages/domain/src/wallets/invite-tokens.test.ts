import { describe, expect, it } from "vitest";

import { generateInviteToken, hashInviteToken, verifyInviteToken } from "./invite-tokens";

/**
 * Round-trip tests for the argon2id invite-token helpers. Each hash
 * call costs ~30–60ms on a modern laptop (memoryCost=19MiB, timeCost=2),
 * so the suite is intentionally compact — five cases is enough to lock
 * the contract without making CI slow.
 */
describe("invite-tokens", () => {
  it("hash format starts with $argon2id$", async () => {
    const plaintext = generateInviteToken();
    const hash = await hashInviteToken(plaintext);
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("hash length is reasonable (>80 chars, encoded form)", async () => {
    const plaintext = generateInviteToken();
    const hash = await hashInviteToken(plaintext);
    expect(hash.length).toBeGreaterThan(80);
  });

  it("verify returns true for matching plaintext", async () => {
    const plaintext = generateInviteToken();
    const hash = await hashInviteToken(plaintext);
    expect(await verifyInviteToken(plaintext, hash)).toBe(true);
  });

  it("verify returns false for non-matching plaintext", async () => {
    const plaintext = generateInviteToken();
    const hash = await hashInviteToken(plaintext);
    const wrong = generateInviteToken();
    expect(await verifyInviteToken(wrong, hash)).toBe(false);
  });

  it("hashing same plaintext twice yields different hashes (random salt)", async () => {
    const plaintext = generateInviteToken();
    const h1 = await hashInviteToken(plaintext);
    const h2 = await hashInviteToken(plaintext);
    expect(h1).not.toBe(h2);
    // Sanity — both still verify against the original plaintext.
    expect(await verifyInviteToken(plaintext, h1)).toBe(true);
    expect(await verifyInviteToken(plaintext, h2)).toBe(true);
  });
});
