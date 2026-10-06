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

- **Decision:** Every user-facing change to the npm package carries a changeset. `npm run version-packages` (`changeset version`) on `main` is the only way the version changes. Publishing runs in the release workflow (AD-15); `npm run release` (full check, then `changeset publish`) stays as the manual fallback.
- **Why:** Enforces semver discipline and a Keep a Changelog-style history. The composer package is released by the same git tag (TD-17).

## AD-5: Quality gates

- **Decision:** `npm run check` (typecheck, lint, format check, test, build; also `prepublishOnly`) and `composer test` (PHPUnit) both gate delivery. `.github/workflows/ci.yml` runs the same gates on every pull request and push to `main`, plus `npm audit --audit-level=high`, a React 18 test run and the Laravel 10 to 13 composer matrix.
- **Why:** Prevents publishing an unverified build. paqad's checks run only the npm commands, so `composer test` is run alongside them (TD-9).

## AD-6: TypeScript 6 workaround in tsup dts build

- **Decision:** `dts.compilerOptions.ignoreDeprecations: '6.0'` in `tsup.config.ts`.
- **Why:** tsup's declaration step injects `baseUrl`, which TS 6 deprecates (TS5101). Remove when tsup stops injecting it. Tracked in [tech debt](../tech-debt/index.md) (TD-3).

## AD-7: One npm package with subpath exports

- **Decision:** Core and React ship in one package, `@eliyce/laravel-medialibrary-freemium-app`, with subpath exports `.`, `./core`, `./react`, `./styles.css` and `./package.json` (D-01M3VMEWWM5ZQ19ZTN6PZ4NHYG).
- **Why:** One version and one install for users, while server code and non-React apps can import the core without React.
- **Exception:** The node-library convention says to export everything through `src/index.ts`. The owner approved subpath exports as an exception. `.` still re-exports the whole core API plus `VERSION`; `./react` is the only API not reachable from `.`, because it needs React and `"use client"`.

## AD-8: Two registries, one repo

- **Decision:** `package.json` and `composer.json` both live at the repo root (D-01M3VMEVYRJDSVQWM1APMNBX13). PHP code lives in `laravel/` (PSR-4 `Eliyce\MediaPro\` → `laravel/src/`).
- **Why:** Packagist requires `composer.json` at the root, and keeping both halves together lets one change update both sides of the HTTP contract. `files` (npm) and `.gitattributes` `export-ignore` (composer) keep each archive free of the other half.

## AD-9: Scoped package names

- **Decision:** npm `@eliyce/laravel-medialibrary-freemium-app`, composer `eliyce/laravel-medialibrary-freemium-app`, PHP namespace `Eliyce\MediaPro` (D-01M3VMEYT0YET62N8Z9YQ278D8). The unpublished `media-pro` name was dropped. Renamed from `@eliyce/media-pro` and `eliyce/laravel-media-pro` before the first release so both names match the `Eliyce/laravel-medialibrary-freemium-app` repository.

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

## AD-15: Release from a `production` branch through GitHub Actions

- **Decision:** `.github/workflows/release.yml` runs on every push to a dedicated `production` branch; pull requests and pushes to `main` run CI only (D-01M48MD0B506BWE69MK2BHMWPS). The version and `CHANGELOG.md` are produced on `main` with `npm run version-packages` and merged into `production`. The workflow reruns CI, then publishes the committed `package.json` version to npm, pushes the annotated `vX.Y.Z` tag and creates the GitHub release from that version's `CHANGELOG.md` section. It never commits, never pushes a branch and never moves a tag, and it refuses to release while changesets are pending or the version is `0.0.0` (D-01M48MD0GJH2MF4C8W5MAKCY7F). The GitHub repository stays private, so the composer package is served by Private Packagist through its GitHub integration (webhook on tag push), and npm provenance is not used because it needs a public repository; the npm package itself stays public (D-01M48MD0P9JJDVV7Q7NRM6Q6WJ).
- **Why:** A release becomes a reviewed merge into `production` instead of a manual `npm login` and tag push. Each step checks the remote state first (`npm view`, `git ls-remote`, `gh release view`) and skips what exists, so a re-run completes a partial release without duplicating anything. One shared tag keeps npm and composer on the same version number (TD-17).
- **Consequence:** Publishing needs the `NPM_TOKEN` repository secret (a granular access token with publish rights to the `@eliyce` scope), the Private Packagist GitHub integration, and the `production` branch created and protected once (README "Releasing"). The first real release is the only end-to-end proof of the publish, tag and Private Packagist pickup.
