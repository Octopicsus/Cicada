# @cicada/shared

Tiny utility belt — types, helpers, and primitives that don't fit anywhere else
and are too generic for `@cicada/domain`.

Examples: `cn` (className concatenator), branded type helpers, generic Result type,
narrow runtime guards. **No business logic.** If it knows about transactions,
wallets, or categories — it belongs in `@cicada/domain`.
