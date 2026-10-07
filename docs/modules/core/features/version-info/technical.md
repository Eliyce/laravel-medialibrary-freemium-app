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

1. Merging `main` into `production` runs `.github/workflows/release.yml`. With pending
   changesets, changesets/action runs `npm run version-packages` (`changeset version`, then a
   lockfile-only `npm install`), which bumps `package.json#version`, the `package-lock.json` root
   version and `CHANGELOG.md`, and opens the `chore(release): version packages` PR into
   `production` (AD-16).
2. Merging that PR runs the workflow again. With no changesets pending it runs `npm run release`:
   `npm run check` (which rebuilds with the new version and runs the tests), then
   `changeset publish`, whose `npm publish` runs `prepublishOnly` (`npm run check` again) and
   publishes through npm Trusted Publishing. The action then tags `vX.Y.Z` and creates the GitHub
   release.
3. Manual fallback: `npm run release` from `production` after `npm login`, then push the tag.

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
