# Benchmarks

## Bundle size baseline (v0.0.0)

| Artifact               | Size   |
| ---------------------- | ------ |
| `dist/index.js` (ESM)  | 129 B  |
| `dist/index.cjs` (CJS) | 153 B  |
| `dist/index.d.ts`      | 103 B  |
| Packed tarball         | 1.3 kB |
| Unpacked               | 2.9 kB |

Measure with `npm run build` and `npm pack --dry-run`.

## Runtime benchmarks

None yet. Add Vitest `bench` suites (`vitest bench`) for performance-sensitive media operations as they are introduced, and record baselines here.

## Planned

- Add `size-limit` (or equivalent) to fail CI when the bundle grows past a budget. See [tech debt](../tech-debt/index.md).
