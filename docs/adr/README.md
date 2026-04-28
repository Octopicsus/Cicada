# Architecture Decision Records

Each ADR captures the **context, decision, and consequences** of a non-trivial
architectural choice. Format follows Michael Nygard's original template.

## Index

- [0001 — Stack & architecture decisions (Session 1)](./0001-stack-decisions.md)

## Conventions

- File name: `NNNN-short-kebab-title.md` (4-digit zero-padded, sequential)
- Status lifecycle: `proposed` → `accepted` → (`superseded by NNNN` | `deprecated`)
- Once an ADR is `accepted`, never edit its body in-place — write a new ADR
  that supersedes it. Add a `> **Superseded by [NNNN](./NNNN-...)**` line at
  the top of the old one.
- Keep them short. If an ADR runs past two screens, you're documenting code,
  not a decision.
