# Architecture Decisions

Short records of the decisions behind the current setup. Add a new entry when one changes.
Decision packets (`D-…`) are in `.paqad/decisions/resolved/`.

## AD-1: Dual ESM + CJS output via tsup

- **Decision:** Author in ESM TypeScript; ship both ESM (`.js`) and CJS (`.cjs`) with separate `.d.ts`/`.d.cts` types through a conditional `exports` map, for every entry point.
- **Why:** Supports both `import` and `require` consumers on Node `>=18` without dual-package hazards in types.
- **Verified:** `tests/package-exports.test.ts` resolves each subpath through a self-import.

## AD-2: Zero runtime dependencies

- **Decision:** No `dependencies`. `react` and `react-dom` are `peerDependencies` (`>=18`), both marked optional in `peerDependenciesMeta`.
- **Why:** Smaller install, no duplicate React in consumer apps, a smaller supply-chain surface. Optional peers mean core-only consumers (a server, a future Vue binding) get no peer warnings.

## AD-3: Strict TypeScript

- **Decision:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`; `lib` includes `DOM` and `DOM.Iterable`, `jsx: react-jsx`.
- **Why:** Catches API-boundary bugs early. `isolatedModules`/`verbatimModuleSyntax` keep per-file transpilation (esbuild) safe.

## AD-4: Changesets for releases

- **Decision:** Every user-facing change to the npm package carries a changeset. `npm run release` runs the full check, then `changeset publish`.
- **Why:** Enforces semver discipline and a Keep a Changelog-style history. The composer package is released by git tag (TD-17).

## AD-5: Quality gates

- **Decision:** `npm run check` (typecheck, lint, format check, test, build; also `prepublishOnly`) and `composer test` (PHPUnit) both gate delivery.
- **Why:** Prevents publishing an unverified build. paqad's checks run only the npm commands, so `composer test` is run alongside them (TD-9).

## AD-6: TypeScript 6 workaround in tsup dts build

- **Decision:** `dts.compilerOptions.ignoreDeprecations: '6.0'` in `tsup.config.ts`.
- **Why:** tsup's declaration step injects `baseUrl`, which TS 6 deprecates (TS5101). Remove when tsup stops injecting it. Tracked in [tech debt](../tech-debt/index.md) (TD-3).

## AD-7: One npm package with subpath exports

- **Decision:** Core and React ship in one package, `@eliyce/media-pro`, with subpath exports `.`, `./core`, `./react`, `./styles.css` and `./package.json` (D-01M3VMEWWM5ZQ19ZTN6PZ4NHYG).
- **Why:** One version and one install for users, while server code and non-React apps can import the core without React.
- **Exception:** The node-library convention says to export everything through `src/index.ts`. The owner approved subpath exports as an exception. `.` still re-exports the whole core API plus `VERSION`; `./react` is the only API not reachable from `.`, because it needs React and `"use client"`.

## AD-8: Two registries, one repo

- **Decision:** `package.json` and `composer.json` both live at the repo root (D-01M3VMEVYRJDSVQWM1APMNBX13). PHP code lives in `laravel/` (PSR-4 `Eliyce\MediaPro\` → `laravel/src/`).
- **Why:** Packagist requires `composer.json` at the root, and keeping both halves together lets one change update both sides of the HTTP contract. `files` (npm) and `.gitattributes` `export-ignore` (composer) keep each archive free of the other half.

## AD-9: Scoped package names

- **Decision:** npm `@eliyce/media-pro`, composer `eliyce/laravel-media-pro`, PHP namespace `Eliyce\MediaPro` (D-01M3VMEYT0YET62N8Z9YQ278D8). The unpublished `media-pro` name was dropped.

## AD-10: Tailwind source styles only

- **Decision:** Ship `styles/media-pro.css` as Tailwind `@apply` source with `media-library-*` classes and no prebuilt CSS (D-01M3VMEXVVHS9M8B2R8QXX84ZM).
- **Why:** The components follow the app's Tailwind theme, and unused rules are dropped by the app's build. Apps without Tailwind cannot use the styles as-is.

## AD-11: `"use client"` on the React entry only, via a build plugin

- **Decision:** A tsup `renderChunk` plugin prepends `"use client";` to `dist/react.js` and `dist/react.cjs`. An esbuild plugin makes the index and react outputs import the shared `dist/core.*` instead of inlining it. tsup's rollup `treeshake` pass is off because it strips the directive (TD-11).
- **Why:** Next.js App Router consumers can import the components directly while core stays server-safe, and there is exactly one `MediaLibrary` class at runtime.

## AD-12: Trait swap instead of overriding Spatie

- **Decision:** `InteractsWithMediaPro` uses Spatie's `InteractsWithMedia` and replaces `addFromMediaLibraryRequest` / `syncFromMediaLibraryRequest` with `insteadof`. Apps change one `use` line per model.
- **Why:** Spatie's free package already declares these methods (they need the commercial Pro package). A trait swap keeps every other Spatie method and needs no container binding or monkey-patching.

## AD-13: Supported Laravel range 10.2 to 13

- **Decision:** `laravel/framework` and `illuminate/*` `^10.2|^11.0|^12.0|^13.0`, PHP `^8.2`, `spatie/laravel-medialibrary ^11.0` (Laravel 13 added by D-01M3VQEGYYBZFRSYGTCFP6NBJS). `laravel/framework` is required because the code uses `FormRequest` and other Foundation classes.
- **Consequence:** `ValidatesMedia` uses `FormRequest::validationRules()` (Laravel 10.43+) and falls back to a container method binding on 10.2 to 10.42. The upload controllers detect the uuid race through `Support\UniqueConstraintViolation`: `UniqueConstraintViolationException` on 10.20+, SQLSTATE and driver code on a plain `QueryException` on 10.2 to 10.19. No CI job runs these 10.x paths yet (TD-19). All Laravel 11.x releases carry security advisories (TD-13).

## AD-14: Client-generated uuids

- **Decision:** The browser generates each media uuid (`generateUuid`) and the server stores it and keeps it when the upload is claimed.
- **Why:** The component can address an item before the server answers, and server errors map back by uuid. Uniqueness is enforced by validation and the `media.uuid` unique index.
