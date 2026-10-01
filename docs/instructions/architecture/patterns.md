# Architecture Patterns

## JS: public API pattern

- One explicit named export per public symbol: `export { X } from './x.js';`. Core symbols are
  exported from `src/core/index.ts` and re-exported by name from `src/index.ts`; React symbols
  from `src/react/index.ts`.
- Relative imports use the `.js` extension (ESM resolution of compiled output).
- Type-only exports use `export type { … }` (required by `verbatimModuleSyntax`).
- No default exports and no `export *`.
- `src/react/**` imports core only through `../core/index.js` (or `../../core/index.js`), never a
  deep core file, so the build can point it at the shared `dist/core.*`.

## JS: core store pattern (for every framework binding)

`MediaLibrary` is an observable store. A binding never re-implements its logic:

```text
create:   new MediaLibrary(config)            // once per mounted component
read:     getState()                          // immutable; replaced on every change
listen:   subscribe(listener) → unsubscribe
act:      addFiles, removeMedia, replaceMedia, setOrder, setName, setCustomProperty, ...
props:    setValidationErrors(bag)            // when the server error bag changes
teardown: destroy()                           // aborts uploads, revokes object URLs
```

The React binding follows it with `useSyncExternalStore(subscribe, getState, getState)`, creates
the store lazily in `useState`, keeps callbacks in a ref so they are never stale, and destroys
the store in an effect cleanup (recreating it after a StrictMode remount). A Vue or Livewire
binding should map the same five steps onto its own lifecycle.

## JS: input validation pattern

Every exported function and the `MediaLibrary` constructor validate their arguments and throw
`TypeError` (wrong type) or `RangeError` (out of range) with a message that names the option.
Internal helpers trust validated input. Runtime failures (HTTP, network, `beforeUpload`) never
throw; they become item errors.

## JS: user-keyed data

Maps keyed by uuids, error keys or custom-property names are `Object.create(null)` objects
(`createMap`). Keys `__proto__`, `constructor` and `prototype` are dropped or rejected
(`isSafeKey`). Only known translation keys with string values are copied.

## JS: module-scope purity

No module-scope side effects and no module-scope access to `window`, `document`, `navigator`,
`XMLHttpRequest`, `URL` or `crypto`. That keeps `sideEffects` truthful for JS (only `**/*.css`
is listed) and lets every entry load on the server.

## JS: feature folder pattern

```text
src/core/<unit>.ts          one unit per file; exported by name from src/core/index.ts
src/react/<Component>.tsx   top-level components; helpers in src/react/components/
tests/core/<unit>.test.ts   node environment
tests/react/<name>.test.tsx // @vitest-environment jsdom
```

## JS: testing pattern

- Test the public contract; inject `config.fetch` (an `UploadTransport`) instead of hitting the
  network. Fakes live in `tests/helpers.ts`.
- Cover API-boundary edge cases: `null`, `undefined`, empty values, very large inputs, unsafe keys.
- Tests that depend on shipped resources (the stylesheet, the build output) load the real files.
- A version-sync test keeps `VERSION` equal to `package.json#version`.

## PHP: conventions

- Namespace `Eliyce\MediaPro`, PSR-4 from `laravel/src/`. Public extension points are traits
  (`InteractsWithMediaPro`, `ValidatesMedia`), builders (`PendingMediaLibraryRequestHandler`,
  `MediaRules`) and static helpers (`MediaProValue`, `DefaultAllowedExtensions`).
- Read configuration only through `Support\MediaProConfig`; it holds the fallbacks to
  `media-library.*` and validates types.
- Batch lookups by uuid through `Support\MediaLookup`, so a request with many items costs a fixed
  number of queries.
- Check everything, then write: resolve and authorize every request item before any change, and
  run the writes in `DB::transaction`. Files cannot roll back, so file cleanup after a failure is
  best-effort (`StoredMediaFiles::remove`) and deletions of claimed temporary files run after
  commit.
- Validation failures and rejected requests answer with Laravel's standard validation error
  (422 JSON or redirect back), never a 500. Client-error exceptions log a warning through
  `report()` instead of being reported as server errors.
- Log with a `media-pro:` message prefix and structured context; include a uuid only when
  `Str::isUuid()` holds; never log contents, file names, tokens or the session id.
- Support Laravel 10.2 to 13 by feature-detecting framework hooks and classes (`method_exists`,
  `class_exists`) rather than checking version numbers. Where a newer exception class is missing
  (`UniqueConstraintViolationException` before 10.20), match the older exception by SQLSTATE and
  driver code in one helper (`Support\UniqueConstraintViolation`).

## PHP: testing pattern

PHPUnit with orchestra/testbench, sqlite `:memory:`, `Storage::fake` disks and
`UploadedFile::fake()`. Use data providers for rule bounds and invalid inputs, and assert query
counts where batching matters.
