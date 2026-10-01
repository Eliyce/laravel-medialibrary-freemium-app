# Architecture Patterns

## Public API pattern

- One explicit named export per public symbol in `src/index.ts`: `export { X } from './x.js';`
- Relative imports use the `.js` extension (ESM resolution of compiled output).
- Type-only exports use `export type { … }` (required by `verbatimModuleSyntax`).
- No default exports.

## Feature folder pattern (for upcoming features)

```text
src/<feature>/
  index.ts        feature barrel; exports only that feature's public symbols
  <feature>.ts    implementation
  types.ts        public types for the feature (optional)
tests/<feature>.test.ts
```

Re-export from `src/index.ts` by name. Don't use `export *` across features, because it hurts tree-shaking and hides API changes.

## Input validation pattern

Every exported function validates its arguments and throws `TypeError` (wrong type) or `RangeError` (out of range) with a descriptive message. Internal helpers may trust validated input.

## Testing pattern

- Test the public contract through `src/index.ts`.
- Cover API-boundary edge cases: `null`, `undefined`, empty values, very large inputs.
- A version-sync test keeps `VERSION` equal to `package.json#version`.

## Module-scope purity

No module-scope side effects (logging, globals, I/O). This keeps `"sideEffects": false` truthful.
