/**
 * Concatenate truthy class-name fragments. Smaller and dependency-free
 * vs `clsx` / `classnames` — we only need the boolean-and-string variant.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}
