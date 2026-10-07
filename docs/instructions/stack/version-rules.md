# Version Rules

## npm package versioning

- Follow semver as defined in [`../rules/coding/stacks/node-library/conventions.md`](../rules/coding/stacks/node-library/conventions.md#semver-discipline).
- Every user-facing change adds a changeset (`npm run changeset`). `npm run version-packages` (`changeset version`, then `npm install --package-lock-only --ignore-scripts`) bumps `package.json`, moves the root version in `package-lock.json` along and writes `CHANGELOG.md`. It is the only way the version changes. changesets/action runs it on `production` and commits the result in the `chore(release): version packages` PR into `production`; merging that PR publishes the version, and `production` is then merged back into `main` by hand (D-01M49RKXNJRS5ND0CVEG3Q0R39).
- The release workflow publishes only when no changeset is pending; with pending changesets it opens or updates the version PR instead. `changeset publish` skips every version already on npm. changesets/action v2 takes the GitHub release notes from the version's `## X.Y.Z` section of `CHANGELOG.md`; if that section is missing it does not fail but uses the whole `CHANGELOG.md` as the notes. `changeset version` always writes the section, so this only happens after a hand edit.
- `src/version.ts` imports `version` from `package.json` and exports it as `VERSION`, so `package.json#version` is the only copy (INV-13) and `changeset version` (`npm run version-packages`) needs no manual follow-up. esbuild inlines only that field into the JS and `.d.ts` outputs; `tests/index.test.ts` and `tests/package-exports.test.ts` check the value and that no other `package.json` field reaches those files. The source maps (`dist/*.map`) still embed all of `package.json` in `sourcesContent`, which is harmless because `package.json` ships in the tarball anyway.
- The package is pre-1.0 (`0.1.0`, the first release, published by hand). Breaking changes may land in minors until `1.0.0`, but must still be called out in the changeset.
- Every subpath (`.`, `./core`, `./react`, `./styles.css`) and every `media-library-*` class name is public API.

## Composer package versioning

- Semver through git tags read by Private Packagist (D-01M48MD0P9JJDVV7Q7NRM6Q6WJ). There is no version field in `composer.json`.
- changesets/action creates one `vX.Y.Z` tag per version it publishes, after the npm publish, and Private Packagist reads the same tag, so both packages share one version number (TD-17, confirmed). A PHP-only fix still needs a changeset and a version bump. The manual fallback, `changeset publish`, creates the same tag locally, and it must be pushed by hand.
- A pushed tag is never moved or deleted. Re-releasing a version is not possible; bump the version instead.
- Public PHP API: the classes and methods in the [API registry](../registries/api-registry.md#composer-eliycelaravel-media-pro), the config keys, the route macro, the rate limiter name, the command name and the publish tags.

## Consumer version bands

| Dependency                    | Band                         | Notes                                                                                                                                                                                                                                                  |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js                       | `>=18`                       | `engines.node`. Raising it is a breaking change.                                                                                                                                                                                                       |
| React, React DOM              | `>=18`                       | Optional peers. Developed on 19.3; CI also runs the JS tests on React 18.                                                                                                                                                                              |
| PHP                           | `^8.2`                       | Laravel 13 itself needs PHP 8.3+.                                                                                                                                                                                                                      |
| Laravel                       | `^10.2 \| ^11 \| ^12 \| ^13` | CI runs the suite on the latest 10, 11, 12 and 13 releases. 10.2 to 10.42 use the `ValidatesMedia` container fallback; 10.2 to 10.19 detect the uuid race by SQLSTATE (no CI run, TD-19). All 10.x and 11.x releases have security advisories (TD-13). |
| `spatie/laravel-medialibrary` | `^11.0`                      |                                                                                                                                                                                                                                                        |

## Development toolchain bands

| Tool       | Band           | Notes                                                                                                                          |
| ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript | `6.x`          | tsup's dts step needs `ignoreDeprecations: '6.0'` (see `tsup.config.ts`). Revisit for TS 7.                                    |
| tsup       | `8.x`          | `treeshake` must stay off while it strips `"use client"` (TD-11).                                                              |
| Vitest     | `5.x`          | Declares Node `^22.12`; `npm run check` still passed on Node 20.20 locally (engine warning only), as the Node 20 CI leg needs. |
| jsdom      | `29.x`         | jsdom 30 needs Node `^22.22.2 \|\| ^24.15.0 \|\| >=26`; development runs Node 24.11.                                           |
| ESLint     | `10.x`         | Flat config only.                                                                                                              |
| esbuild    | `^0.28.2`      | Pinned via `overrides` (security advisory).                                                                                    |
| PHPUnit    | `10.5` or `11` | Matches testbench 8 to 11.                                                                                                     |
| Testbench  | `8.22` to `11` | One major per Laravel 10 to 13.                                                                                                |
| Composer   | `2.x`          | 2.9+ blocks packages with advisories during resolution; Laravel 10 and 11 installs need `audit.block-insecure=false`.          |
