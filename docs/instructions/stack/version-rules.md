# Version Rules

## npm package versioning

- Follow semver as defined in [`../rules/coding/stacks/node-library/conventions.md`](../rules/coding/stacks/node-library/conventions.md#semver-discipline).
- Every user-facing change adds a changeset (`npm run changeset`); `changeset version` bumps `package.json` and writes `CHANGELOG.md`.
- `src/version.ts` imports `version` from `package.json` and exports it as `VERSION`, so `package.json#version` is the only copy (INV-13) and `changeset version` (`npm run version-packages`) needs no manual follow-up. esbuild inlines only that field into the JS and `.d.ts` outputs; `tests/index.test.ts` and `tests/package-exports.test.ts` check the value and that no other `package.json` field reaches those files. The source maps (`dist/*.map`) still embed all of `package.json` in `sourcesContent`, which is harmless because `package.json` ships in the tarball anyway.
- The package is pre-1.0 (`0.0.0`, first release pending as a minor). Breaking changes may land in minors until `1.0.0`, but must still be called out in the changeset.
- Every subpath (`.`, `./core`, `./react`, `./styles.css`) and every `media-library-*` class name is public API.

## Composer package versioning

- Semver through git tags read by Packagist. There is no version field in `composer.json`.
- `changeset publish` tags `vX.Y.Z` in this single-package repo and Packagist reads the same tags, so both packages share version numbers. Confirming that scheme before the first release is TD-17.
- Public PHP API: the classes and methods in the [API registry](../registries/api-registry.md#composer-eliycelaravel-media-pro), the config keys, the route macro, the rate limiter name, the command name and the publish tags.

## Consumer version bands

| Dependency                    | Band                         | Notes                                                                                                                                                                                                                            |
| ----------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                       | `>=18`                       | `engines.node`. Raising it is a breaking change.                                                                                                                                                                                 |
| React, React DOM              | `>=18`                       | Optional peers. Tested with 19.3 only; no 18.x run yet (TD-5).                                                                                                                                                                   |
| PHP                           | `^8.2`                       | Laravel 13 itself needs PHP 8.3+.                                                                                                                                                                                                |
| Laravel                       | `^10.2 \| ^11 \| ^12 \| ^13` | Suite passes on 13; verified on 10, 11 and 12. 10.2 to 10.42 use the `ValidatesMedia` container fallback; 10.2 to 10.19 detect the uuid race by SQLSTATE (no CI run, TD-19). All 11.x releases have security advisories (TD-13). |
| `spatie/laravel-medialibrary` | `^11.0`                      |                                                                                                                                                                                                                                  |

## Development toolchain bands

| Tool       | Band           | Notes                                                                                                          |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| TypeScript | `6.x`          | tsup's dts step needs `ignoreDeprecations: '6.0'` (see `tsup.config.ts`). Revisit for TS 7.                    |
| tsup       | `8.x`          | `treeshake` must stay off while it strips `"use client"` (TD-11).                                              |
| Vitest     | `5.x`          |                                                                                                                |
| jsdom      | `29.x`         | jsdom 30 needs Node `^22.22.2 \|\| ^24.15.0 \|\| >=26`; development runs Node 24.11.                           |
| ESLint     | `10.x`         | Flat config only.                                                                                              |
| esbuild    | `^0.28.2`      | Pinned via `overrides` (security advisory).                                                                    |
| PHPUnit    | `10.5` or `11` | Matches testbench 8 to 11.                                                                                     |
| Testbench  | `8.22` to `11` | One major per Laravel 10 to 13.                                                                                |
| Composer   | `2.x`          | 2.9+ blocks packages with advisories during resolution; Laravel 11 installs need `audit.block-insecure=false`. |
