# Public Entry Technical

## Module Boundaries

| File                | Owns                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `src/index.ts`      | Root barrel: `VERSION`, plus each core export re-exported by name from `./core/index.js` |
| `src/core/index.ts` | Core barrel: named exports from the core files (no `export *`)                           |
| `tsup.config.ts`    | Builds the `index`, `core` and `react` entries and shares one core output                |
| `package.json`      | `exports`, `main`, `module`, `types`, `files`, `sideEffects`, `engines`                  |

Source imports use the `.js` extension (`./version.js`), as ESM resolution requires.

## Public API

| Specifier                        | Condition | Resolves to            | Types                   |
| -------------------------------- | --------- | ---------------------- | ----------------------- |
| `@eliyce/media-pro`              | `import`  | `dist/index.js`        | `dist/index.d.ts`       |
| `@eliyce/media-pro`              | `require` | `dist/index.cjs`       | `dist/index.d.cts`      |
| `@eliyce/media-pro/core`         | `import`  | `dist/core.js`         | `dist/core.d.ts`        |
| `@eliyce/media-pro/core`         | `require` | `dist/core.cjs`        | `dist/core.d.cts`       |
| `@eliyce/media-pro/react`        | both      | `dist/react.{js,cjs}`  | `dist/react.d.{ts,cts}` |
| `@eliyce/media-pro/styles.css`   | any       | `styles/media-pro.css` | n/a                     |
| `@eliyce/media-pro/package.json` | any       | `package.json`         | n/a                     |

`main` (`./dist/index.cjs`), `module` (`./dist/index.js`) and `types` (`./dist/index.d.ts`) are
fallbacks for tools that ignore `exports`. Subpath exports are an owner-approved exception to the
single-entry convention (AD-7, decision D-01M3VMEWWM5ZQ19ZTN6PZ4NHYG).

## Build

`npm run build` runs tsup with:

| Option           | Value                                     | Effect                                                         |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `entry`          | `index`, `core`, `react`                  | One output set per entry                                       |
| `format`         | `esm`, `cjs`                              | `.js` and `.cjs` per entry                                     |
| `dts`            | on, with `ignoreDeprecations: '6.0'`      | `.d.ts` and `.d.cts`; shared types go to a hashed chunk        |
| `external`       | `react`, `react-dom`, `react/jsx-runtime` | React is never bundled                                         |
| `esbuildPlugins` | `media-pro-shared-core`                   | Rewrites `./core/index.js` imports to `./core.js`/`./core.cjs` |
| `plugins`        | `media-pro-use-client`                    | Prepends `"use client";` to `react.js` and `react.cjs` only    |
| `sourcemap`      | on                                        | `.map` per output                                              |
| `target`         | `es2022`                                  | Matches the Node `>=18` floor                                  |
| `clean`          | on                                        | Empties `dist/` first                                          |

tsup's extra rollup `treeshake` pass is off because it strips the `"use client"` directive
(TD-11). esbuild still tree-shakes. `files` is `["dist", "styles"]` and `sideEffects` is
`["**/*.css"]`.

## Adding an export

1. Put the code in `src/core/` (framework-agnostic) or `src/react/` (React only).
2. Export it by name from that folder's `index.ts`. For core, also re-export it by name from
   `src/index.ts`. Do not use `export *`.
3. Validate every argument of exported functions; throw `TypeError` / `RangeError` on bad input.
4. Keep module scope free of side effects and DOM access.
5. Add the name to the export lists in `tests/index.test.ts` / `tests/package-exports.test.ts`,
   add a row to the API registry, and add a changeset.

## Error Handling

The entry points throw nothing. Error conventions are in the
[error code registry](../../../../instructions/registries/error-code-registry.md).

## Dependencies

None at runtime. Build-time: tsup, TypeScript.

## Testing Entry Points

- `tests/index.test.ts`: every core export is on `.` and `./core` and is the same object;
  `VERSION` is only on `.`; neither has a default export.
- `tests/package-exports.test.ts`: runs the build, then checks that `dist/react.*` start with
  `"use client"` and import the shared core, that `dist/core.*` and `dist/index.*` do not, and
  that each subpath resolves through a self-import.
