# Version Info Technical

## Module Boundaries

| File                            | Owns                                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| `src/version.ts`                | `import { version } from '../package.json'`; `export const VERSION: string` |
| `src/index.ts`                  | Re-exports `VERSION` (root entry `.` only)                                  |
| `tests/index.test.ts`           | Guards `VERSION === package.json#version` from source                       |
| `tests/package-exports.test.ts` | Guards the built value and that no other `package.json` field is bundled    |

## Public API

| Export    | Kind     | Declared type                               | Since |
| --------- | -------- | ------------------------------------------- | ----- |
| `VERSION` | constant | `string` (`declare const VERSION: string;`) | 0.0.0 |

The explicit `: string` annotation keeps the declaration free of the literal and of any
reference to `package.json`, so the `.d.ts` does not change between releases.

## Data Flow

```text
package.json#version ──(named JSON import)──▶ src/version.ts ──tsup/esbuild──▶ dist/index.{js,cjs}
```

`package.json#version` is the single source of truth (INV-13). esbuild's JSON loader exposes each
top-level field as its own export and tree-shakes the rest, so the root entry's ESM and CJS
outputs inline only `var version = "x.y.z"`. Nothing reads `package.json` at runtime.
`@eliyce/laravel-medialibrary-freemium-app/core` and `@eliyce/laravel-medialibrary-freemium-app/react` do not export `VERSION`.

The source maps (`dist/index.*.map`) carry `package.json` in `sourcesContent`, like every other
bundled source file. That is the same file the tarball already ships.

## Release Steps

1. On `main`, `npm run version-packages` (`changeset version`) bumps `package.json#version` and
   writes `CHANGELOG.md`. Commit it.
2. Merging `main` into `production` runs `.github/workflows/release.yml`. It publishes the
   committed version with `npm publish`, whose `prepublishOnly` runs `npm run check` (which
   rebuilds with the new version and runs the tests), then tags `vX.Y.Z` and creates the GitHub
   release (AD-15). It refuses to release `0.0.0` or while changesets are pending.
3. Manual fallback: `npm run release` runs `npm run check` and then `changeset publish`.

No manual edit of `src/version.ts` is needed.

## Error Handling

None. The constant cannot throw.

## Dependencies

None at runtime. The build relies on `resolveJsonModule` (TypeScript) and esbuild's JSON loader.

## Testing Entry Points

- `tests/index.test.ts` › `exports a VERSION matching package.json`, and that `./core` does not
  export `VERSION`.
- `tests/package-exports.test.ts` › the ESM and CJS probes read `VERSION` from the built root
  entry and compare it with `package.json#version`.
- `tests/package-exports.test.ts` › `inlines only the package.json version into the built entries`
  checks every `dist` JS and `.d.ts` output for leaked fields (`devDependencies`,
  `@changesets/cli`, `peerDependenciesMeta`, the description) and the `VERSION: string`
  declaration.
