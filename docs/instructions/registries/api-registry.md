# API Registry

The public API of `media-pro`: every symbol exported from `src/index.ts`. Removing or changing any row is a breaking change (major bump; pre-1.0, a flagged minor).

| Export    | Kind     | Type                          | Module | Since | Description                                    | Docs                                                          |
| --------- | -------- | ----------------------------- | ------ | ----- | ---------------------------------------------- | ------------------------------------------------------------- |
| `VERSION` | constant | `string` (literal in `.d.ts`) | Core   | 0.0.0 | Package version; equals `package.json#version` | [docs](../../modules/core/features/version-info/technical.md) |

## Entry points

| Specifier                | ESM             | CJS              | Types                                  |
| ------------------------ | --------------- | ---------------- | -------------------------------------- |
| `media-pro`              | `dist/index.js` | `dist/index.cjs` | `dist/index.d.ts` / `dist/index.d.cts` |
| `media-pro/package.json` | `package.json`  | `package.json`   | n/a                                    |

There are no HTTP endpoints. This is a library.
