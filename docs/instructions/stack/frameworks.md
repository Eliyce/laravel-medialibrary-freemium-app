# Frameworks

## Node.js Library (archetype)

The npm package follows paqad's built-in `node-library` archetype: a package that exposes a
library API (not a CLI, not a framework app).

The archetype's binding conventions live in
[`../rules/coding/stacks/node-library/conventions.md`](../rules/coding/stacks/node-library/conventions.md)
and are not duplicated here. In short:

- Public API through declared entry points, via named exports (no default exports).
- Types ship with the build.
- Semver discipline, enforced through changesets.
- No module-scope side effects, for tree-shaking.
- Validate inputs on every exported function; throw `TypeError`/`RangeError` on bad input.

### How the archetype maps onto this repo

| Convention           | Where it is implemented                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public entry         | `src/index.ts` → `exports["."]`; plus `./core` and `./react` subpaths (owner-approved exception, AD-7)           |
| Dual ESM/CJS         | `tsup.config.ts` (`format: ['esm', 'cjs']`)                                                                      |
| Declaration files    | `tsup.config.ts` (`dts`), `package.json#types` and per-entry `types` conditions                                  |
| Published files only | `package.json#files: ["dist", "styles"]`                                                                         |
| Tree-shaking         | `package.json#sideEffects: ["**/*.css"]` (JS is side-effect free); esbuild tree-shaking (rollup pass off, TD-11) |
| Peer dependencies    | `react`, `react-dom` `>=18`, optional in `peerDependenciesMeta`                                                  |
| Changelog / versions | `.changeset/`, `CHANGELOG.md`                                                                                    |

## React (optional peer)

`@eliyce/laravel-medialibrary-freemium-app/react` targets React 18 and 19. It uses `useSyncExternalStore`, `useId` and
the automatic JSX runtime (`react/jsx-runtime`, external). The entry carries `"use client"` for
React Server Components frameworks such as the Next.js App Router, and renders on the server
without touching browser globals.

## Tailwind CSS (consumer build)

`styles/media-pro.css` is Tailwind source (`@apply` with core utilities). The consumer's Tailwind
build compiles it; the header documents the Tailwind 4 `@import` setup.

## Laravel (composer package)

`eliyce/laravel-medialibrary-freemium-app` is a Laravel package: an auto-discovered service provider
(`extra.laravel.providers`), a route macro, publishable config and migration, an Artisan command,
FormRequest traits and validation rules. It supports Laravel 10.2 through 13 and extends
`spatie/laravel-medialibrary` v11 (models, media rows, conversions, `InteractsWithMedia`).
