/**
 * JS-side mirrors of token values that we *need* to read at runtime
 * (e.g. media-query helpers, animation durations passed to Framer Motion).
 *
 * Keep this file small. The source of truth is CSS — the constants here
 * exist only because some APIs (matchMedia, framer-motion duration props)
 * cannot read CSS custom properties.
 */

export const breakpoints = {
  sm: "40rem", // 640px
  md: "48rem", // 768px
  lg: "64rem", // 1024px
  xl: "80rem", // 1280px
} as const;

export const motionDuration = {
  instant: 0.1,
  fast: 0.16,
  normal: 0.24,
  slow: 0.36,
} as const;

export type Breakpoint = keyof typeof breakpoints;
