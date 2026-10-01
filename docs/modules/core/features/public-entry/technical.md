# Public Entry Technical

## Module Boundaries

| File             | Owns                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| `src/index.ts`   | The public barrel. Today: `export { VERSION } from './version.js';`     |
| `tsup.config.ts` | Builds `src/index.ts` as the only entry                                 |
| `package.json`   | `exports`, `main`, `module`, `types`, `files`, `sideEffects`, `engines` |

Source imports use the `.js` extension (`./version.js`), as ESM resolution requires.

## Public API

| Specifier                | Condition | Resolves to      | Types              |
| ------------------------ | --------- | ---------------- | ------------------ |
| `media-pro`              | `import`  | `dist/index.js`  | `dist/index.d.ts`  |
| `media-pro`              | `require` | `dist/index.cjs` | `dist/index.d.cts` |
| `media-pro/package.json` | any       | `package.json`   | n/a                |

`main` (`./dist/index.cjs`), `module` (`./dist/index.js`) and `types` (`./dist/index.d.ts`) are
fallbacks for tools that ignore `exports`. The current export list is in the
[API registry](../../../../instructions/registries/api-registry.md).

## Build

`npm run build` runs tsup with:

| Option      | Value          | Effect                                 |
| ----------- | -------------- | -------------------------------------- |
| `entry`     | `src/index.ts` | One bundle; internal files are inlined |
| `format`    | `esm`, `cjs`   | `dist/index.js`, `dist/index.cjs`      |
| `dts`       | on             | `dist/index.d.ts`, `dist/index.d.cts`  |
| `sourcemap` | on             | `.map` file per output                 |
| `treeshake` | on             |                                        |
| `target`    | `es2022`       | Matches the Node `>=18` floor          |
| `clean`     | on             | Empties `dist/` first                  |

`dts.compilerOptions.ignoreDeprecations: '6.0'` works around tsup injecting `baseUrl` under
TypeScript 6 (TD-3). Only `dist/` is published (`files: ["dist"]`); `dist/` is git-ignored.

## Adding an export

1. Put the feature in `src/<feature>/` and export it by name from that folder.
2. Re-export it explicitly from `src/index.ts`. Do not use `export *` from broad barrels.
3. Validate every argument of exported functions; throw `TypeError` / `RangeError` on bad input.
4. Keep module scope free of side effects (`sideEffects: false` depends on it).
5. Add a row to the API registry and a changeset (`npm run changeset`).

## Error Handling

The entry point throws nothing. Error conventions for future exports are in the
[error code registry](../../../../instructions/registries/error-code-registry.md).

## Dependencies

None at runtime. Build-time: tsup, TypeScript.

## Testing Entry Points

- `tests/index.test.ts` imports from `../src/index.js`, so it exercises the barrel, not the
  internal file.
- `npm run check` runs typecheck, lint, format check, tests and build together.
- There is no test against the built `dist/` output or the `exports` map yet.
