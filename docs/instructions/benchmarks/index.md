# Benchmarks

## Bundle size baseline (unreleased, after the core + React change)

Unminified tsup output, measured on 2026-10-01 with `npm run build` and `npm pack --dry-run`.

| Artifact                        | Size     |
| ------------------------------- | -------- |
| `dist/index.js` (ESM)           | 509 B    |
| `dist/index.cjs` (CJS)          | 1.9 kB   |
| `dist/core.js` (ESM)            | 43.1 kB  |
| `dist/core.cjs` (CJS)           | 44.5 kB  |
| `dist/react.js` (ESM)           | 30.3 kB  |
| `dist/react.cjs` (CJS)          | 33.8 kB  |
| `dist/core.d.ts`                | 4.6 kB   |
| `dist/react.d.ts`               | 11.6 kB  |
| Packed tarball (24 files)       | 125.6 kB |
| Unpacked (includes source maps) | 515.7 kB |

The `0.0.0` scaffold baseline was 129 B ESM / 153 B CJS (tarball 1.3 kB). `dist/index.*` stays
small because it imports the shared `dist/core.*` instead of inlining it.

## Runtime benchmarks

None yet. Candidates for Vitest `bench` suites: `normalizeValue` and `mapValidationErrors` on
large values, and `MediaLibrary` state updates with many items. Record baselines here.

## Planned

- Add `size-limit` (or equivalent) to fail CI when the bundles grow past a budget. See
  [tech debt](../tech-debt/index.md) (TD-6).
