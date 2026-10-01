# Frameworks

## Node.js Library (archetype)

No application framework is used. The project follows paqad's built-in `node-library` archetype: a package that exposes a library API (not a CLI, not a framework app).

The archetype's binding conventions live in
[`../rules/coding/stacks/node-library/conventions.md`](../rules/coding/stacks/node-library/conventions.md) and are not duplicated here. In short:

- Public API is exported only from `src/index.ts`, via named exports (no default exports).
- Types ship with the build (`dist/index.d.ts`, `dist/index.d.cts`).
- Semver discipline, enforced through changesets.
- `"sideEffects": false` and no module-scope side effects, for tree-shaking.
- Validate inputs on every exported function; throw `TypeError`/`RangeError` on bad input.

## How the archetype maps onto this repo

| Convention           | Where it is implemented                              |
| -------------------- | ---------------------------------------------------- |
| Single public entry  | `src/index.ts` → `package.json#exports["."]`         |
| Dual ESM/CJS         | `tsup.config.ts` (`format: ['esm', 'cjs']`)          |
| Declaration files    | `tsup.config.ts` (`dts`), `package.json#types`       |
| Published files only | `package.json#files: ["dist"]`                       |
| Tree-shaking         | `package.json#sideEffects: false`, `treeshake: true` |
| Changelog / versions | `.changeset/`, `CHANGELOG.md`                        |
