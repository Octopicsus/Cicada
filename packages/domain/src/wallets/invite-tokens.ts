import { randomBytes } from "node:crypto";

import argon2 from "argon2";

/**
 * Argon2id parameters per OWASP Password Storage Cheat Sheet (2024
 * recommendations: m=19 MiB, t=2, p=1). These are the conservative
 * "minimum memory" preset — adequate for invite tokens (one-time,
 * short-lived secrets). If/when we apply argon2 to user passwords,
 * revisit toward the higher-memory preset (46 MiB) and re-benchmark.
 *
 * Centralized so a future tuning is a single-line change; existing
 * hashes remain verifiable because their parameters are baked into
 * the encoded output (`$argon2id$v=19$m=19456,t=2,p=1$...`).
 */
const ARGON2ID_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Generates a cryptographically random invite token plaintext.
 *
 * 32 bytes of entropy → 43-char base64url string (no padding, URL-safe).
 * Shown to the inviter exactly once (delivered via email link); the
 * plaintext is NEVER stored — only its argon2id hash lands in the DB.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a plaintext invite token with argon2id. The encoded output
 * embeds the algorithm, parameters, salt, and hash, so verification
 * doesn't need access to the original parameters.
 *
 * Output format: `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>` (~95 chars).
 * Each call generates a fresh salt — two hashes of the same plaintext
 * are guaranteed to differ.
 */
export async function hashInviteToken(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2ID_PARAMS);
}

/**
 * Verifies a plaintext invite token against a stored argon2id hash.
 * Constant-time comparison is handled by argon2.verify internally.
 *
 * Returns false (not throws) on malformed hash input — callers
 * shouldn't have to distinguish "wrong token" from "DB-side garbage";
 * both routes are auth failures from the user's perspective.
 */
export async function verifyInviteToken(plaintext: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}
