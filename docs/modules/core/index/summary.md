# Core Summary

Core is the package's public surface. It owns the single entry point consumers import from and the
`VERSION` constant. No media features exist yet, so Core is currently the whole library.

## Features

| Feature      | What it does                                                                                    | Docs                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Public Entry | `src/index.ts`, the only module consumers can import (`media-pro`); re-exports the public API   | [business](../features/public-entry/business.md) · [technical](../features/public-entry/technical.md) |
| Version Info | `VERSION`, a string constant equal to `package.json#version`, so callers can read it at runtime | [business](../features/version-info/business.md) · [technical](../features/version-info/technical.md) |

## Source

- `src/index.ts`
- `src/version.ts`

## Public Surface

| Name                     | Kind                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `VERSION`                | Named export (constant, `string`)                               |
| `media-pro`              | `exports["."]` → `dist/index.js` (ESM) / `dist/index.cjs` (CJS) |
| `media-pro/package.json` | `exports["./package.json"]`                                     |

Every other path (`media-pro/dist/...`, `media-pro/src/...`) is blocked by the `exports` map.

## Dependencies

- **Uses:** nothing. Core has no runtime dependencies and no I/O.
- **Used by:** every future module. New features live in `src/<feature>/` and are re-exported
  from `src/index.ts`, so they all pass through Public Entry.

## Tests

- `tests/index.test.ts` imports through the public entry and checks that `VERSION` equals
  `package.json#version`.

## Known Gaps

- TD-8: `VERSION` must be bumped by hand after `changeset version`; the test catches a mismatch.
- TD-1, TD-2: package `description`, `author` and the README one-liner are still placeholders.
- TD-6: no bundle-size budget guards the entry point.

## Related Docs

- [Architecture overview](../../../instructions/architecture/overview.md)
- [API registry](../../../instructions/registries/api-registry.md)
- [Node library conventions](../../../instructions/rules/coding/stacks/node-library/conventions.md)
