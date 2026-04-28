# @cicada/ui

Cicada's design system. Owned components, owned tokens, owned styling.

- **Behavior:** Radix Primitives under the hood (focus management, keyboard nav, ARIA).
- **Styling:** CSS Modules + CSS Custom Properties. 3 layers of tokens
  (`primitive` → `semantic` → `component`). No CSS-in-JS.
- **Charts:** built on `d3-scale` / `d3-shape` / `d3-array` / `d3-format`. No Recharts / Tremor / Visx.
- **Docs / sandbox:** Ladle.

Why owned: long-term flexibility, no vendor lock-in, single source of styling truth across Web /
emails / future native shells.
