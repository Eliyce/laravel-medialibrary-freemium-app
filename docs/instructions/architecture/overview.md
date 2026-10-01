# Architecture Overview

`media-pro` is a single-package TypeScript library. It has no runtime dependencies, no I/O, and no UI. The public API is a single entry point.

## Layout

```text
src/
  index.ts      public entry — re-exports the public API (named exports only)
  version.ts    VERSION constant
tests/
  index.test.ts contract tests against the public entry
dist/           build output (git-ignored, the only published folder)
```

## Build and distribution flow

```text
src/index.ts ──tsup──▶ dist/index.js     (ESM)  ◀── exports["."].import
                     ├▶ dist/index.cjs    (CJS)  ◀── exports["."].require / main
                     ├▶ dist/index.d.ts   (types for ESM)
                     └▶ dist/index.d.cts  (types for CJS)
```

Consumers may only import `media-pro` (and `media-pro/package.json`). Deep imports are not part of the contract, and the `exports` map blocks them.

## Modules

| Module | Slug   | Source                           | Status                                               |
| ------ | ------ | -------------------------------- | ---------------------------------------------------- |
| Core   | `core` | `src/index.ts`, `src/version.ts` | Scaffold only; awaiting the first real media feature |

The authoritative module list is [`../rules/module-map.yml`](../rules/module-map.yml).

## Boundaries

- `src/index.ts` is the only public surface. New features live in their own `src/<feature>/` folder and are re-exported from `src/index.ts` explicitly.
- Tests import through the public entry (`../src/index.js`) unless they deliberately test an internal unit.
