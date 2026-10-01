# Node.js Library Conventions

## Public API Surface Design

- Export everything intentionally via `src/index.ts` (or `src/index.js`). Do not rely on consumers importing internal paths. <!-- @rule RL-91d1 -->
- Use explicit named exports. Avoid default exports for libraries — they are harder to tree-shake and rename consistently. <!-- @rule RL-89bf -->
- Group exports logically using barrel files (`src/utils/index.ts`, `src/types/index.ts`), but do not create barrel files that re-export everything indiscriminately — this prevents tree-shaking. <!-- @rule RL-59fa -->
- Mark the `exports` field in `package.json` with conditional exports for CJS/ESM dual-build when needed. <!-- @rule RL-72cb -->

## Type Export Patterns

- Ship declaration files (`.d.ts`) alongside compiled output — never rely on consumers having `ts-node` at runtime. <!-- @rule RL-f7db -->
- Use `types` (or `typings`) field in `package.json` to point to the primary `.d.ts` entry. <!-- @rule RL-58f9 -->
- Avoid exporting internal implementation types through the public API. Use `@internal` JSDoc tags on types that must be exported for structural reasons but are not intended for consumers. <!-- @rule RL-f684 -->
- When using `tsup`, `rollup`, or `unbuild`, verify the output includes correct source maps and declaration maps. <!-- @rule RL-ae8e -->

## Semver Discipline

Breaking changes require a **major version bump**. The following are always breaking:

- Removing or renaming exported functions, classes, or types <!-- @rule RL-3029 -->
- Adding required parameters to public functions <!-- @rule RL-08e6 -->
- Changing the return type of a public function <!-- @rule RL-0056 -->
- Removing fields from public interfaces or types <!-- @rule RL-886e -->
- Changing a synchronous API to async (or vice versa) <!-- @rule RL-d9c5 -->

Non-breaking additions require a **minor version bump**. Bug fixes require a **patch version bump**.

Use `@changesets/cli` or `semantic-release` to automate changelog generation and version management.

## Peer Dependency Management

- Declare framework/runtime packages as `peerDependencies`, not `dependencies`, to avoid duplication in consumer projects. <!-- @rule RL-2fd8 -->
- Always declare a `peerDependenciesMeta` entry marking peer deps as optional when the library works without them. <!-- @rule RL-e536 -->
- Test against the full range of declared peer dependency versions in CI. <!-- @rule RL-dc05 -->

## Tree-Shaking Readiness

- Set `"sideEffects": false` in `package.json` if the library has no side effects at module evaluation time. <!-- @rule RL-98fd -->
- Avoid top-level `console.log`, `require()` calls, or global mutations in the module scope. <!-- @rule RL-8ad0 -->
- Publish ESM output (`"type": "module"` or `.mjs` files) to enable static analysis by bundlers. <!-- @rule RL-aa9a -->
- Do not use `require()` or `import()` with dynamic, user-controlled paths in library code. <!-- @rule RL-f370 -->

## Bundle Size Awareness

- Track bundle size in CI using `bundlesize`, `size-limit`, or equivalent. <!-- @rule RL-4056 -->
- Avoid bundling large dependencies — prefer marking them as `peerDependencies` or `optionalDependencies`. <!-- @rule RL-42a6 -->
- Audit the published package contents using `npm pack --dry-run` and configure the `files` field in `package.json` to exclude tests, fixtures, and source maps from the published artefact. <!-- @rule RL-36974 -->

## Changelog and Release Workflow

- Maintain a `CHANGELOG.md` in the standard Keep a Changelog format. <!-- @rule RL-304d -->
- Every PR that changes public behaviour must include a changeset entry. <!-- @rule RL-99f5 -->
- Automate releases from the main branch using CI to prevent manual version-bumping errors. <!-- @rule RL-13dc -->
- Tag releases in git before publishing to npm. <!-- @rule RL-d41a -->

## Testing Patterns

### Unit Tests

- Write unit tests for every public function and class, testing the public contract, not the implementation. <!-- @rule RL-e8a6 -->
- Test edge cases at API boundaries: `null`, `undefined`, empty arrays, empty strings, very large inputs. <!-- @rule RL-bc6c -->
- Never test private methods directly — refactor if the private implementation needs its own test coverage. <!-- @rule RL-853f -->

### Integration Tests

- Test complex interactions between public APIs (e.g., composing multiple exported utilities). <!-- @rule RL-e767 -->
- If the library wraps I/O (file system, network, database), write integration tests against the real system, not mocks. <!-- @rule RL-b517 -->

## Security

### Input Validation on Public API Surface

- Validate all arguments on every exported function and method. Do not trust the caller. <!-- @rule RL-10bb -->
- Throw descriptive `TypeError` or `RangeError` for invalid input rather than returning `undefined` silently. <!-- @rule RL-a47d -->
- Sanitize string inputs that will be used in file paths, URLs, or shell commands. <!-- @rule RL-6822 -->

### Prototype Pollution Defense

- Never write to `obj[key]` where `key` comes from untrusted input without checking `key !== '__proto__'`, `key !== 'constructor'`, and `key !== 'prototype'`. <!-- @rule RL-a8ca -->
- Use `Object.create(null)` for internal maps that store user-supplied keys. <!-- @rule RL-7b3d -->
- Prefer `Map` and `Set` over plain objects for dynamic key storage. <!-- @rule RL-25ac -->

### Unsafe Patterns to Avoid

- Never use `eval()` or the `Function()` constructor with dynamic strings. <!-- @rule RL-2940 -->
- Never use `child_process.exec()` with user-supplied input — use `execFile()` with argument arrays. <!-- @rule RL-8b6c -->
- Never deserialize untrusted data with `JSON.parse()` without schema validation. <!-- @rule RL-d8b7 -->

### Supply Chain Hygiene

- Commit your lockfile (`pnpm-lock.yaml` or `package-lock.json`). <!-- @rule RL-50f6 -->
- Run `pnpm audit` in CI and fail on high/critical advisories. <!-- @rule RL-a921 -->
- Minimize the dependency tree — prefer zero-dependency implementations for simple utilities. <!-- @rule RL-61d4 -->
- Review all transitive dependencies before publishing a new major version. <!-- @rule RL-397b -->
