# Version Rules

## Package versioning

- Follow semver as defined in [`../rules/coding/stacks/node-library/conventions.md`](../rules/coding/stacks/node-library/conventions.md#semver-discipline).
- Every user-facing change adds a changeset (`npm run changeset`); `changeset version` bumps `package.json` and writes `CHANGELOG.md`.
- `src/version.ts` exports `VERSION`, which must equal `package.json#version`. `tests/index.test.ts` enforces this, so bump both together after `changeset version`.
- The package is pre-1.0 (`0.0.0`). Breaking changes may land in minors until `1.0.0`, but must still be called out in the changeset.

## Toolchain version bands

| Tool       | Band      | Notes                                                                                       |
| ---------- | --------- | ------------------------------------------------------------------------------------------- |
| Node.js    | `>=18`    | Consumer floor (`engines.node`). Raising it is a breaking change.                           |
| TypeScript | `6.x`     | tsup's dts step needs `ignoreDeprecations: '6.0'` (see `tsup.config.ts`). Revisit for TS 7. |
| tsup       | `8.x`     |                                                                                             |
| Vitest     | `5.x`     |                                                                                             |
| ESLint     | `10.x`    | Flat config only.                                                                           |
| esbuild    | `^0.28.2` | Pinned via `overrides` (security advisory).                                                 |
