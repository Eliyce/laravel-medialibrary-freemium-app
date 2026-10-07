# Architecture Overview

This repo publishes two packages from one root (decision D-01M3VMEVYRJDSVQWM1APMNBX13):

- **`@eliyce/laravel-medialibrary-freemium-app`** (npm): a framework-agnostic upload core, React components and Tailwind
  source styles. No runtime dependencies; `react` and `react-dom` are optional peers.
- **`eliyce/laravel-medialibrary-freemium-app`** (Private Packagist): temporary uploads, upload routes, request handling
  and validation rules on top of `spatie/laravel-medialibrary` v11.

Together they reproduce the Spatie Media Library Pro v6 API for React and Laravel. They share no
code; they meet over HTTP and a shared value and error contract.

## Layout

```text
package.json            npm @eliyce/laravel-medialibrary-freemium-app (files: dist, styles)
composer.json           composer eliyce/laravel-medialibrary-freemium-app (PSR-4 Eliyce\MediaPro\ → laravel/src/)
src/
  index.ts              root entry: VERSION + the core API, re-exported by name
  version.ts
  core/                 framework-agnostic: no React, no DOM access at module scope
  react/                React binding: hook, Attachment, Collection, components/
styles/media-pro.css    Tailwind @apply source (exported as ./styles.css)
tests/                  Vitest: core/ (node), react/ (jsdom), entry and package-export tests
laravel/
  src/                  provider, handler, Concerns, Commands, Exceptions, Http, Models, Rules, Support
  config/media-pro.php
  database/migrations/  create_temporary_uploads_table.php.stub
  tests/                PHPUnit + orchestra/testbench
phpunit.xml.dist
.gitattributes          keeps JS and dev files out of the composer archive
dist/                   build output (git-ignored)
```

Each registry publishes from the root: npm ships only `dist/` and `styles/` (plus README, LICENSE,
`package.json`); the composer archive ships only `composer.json`, `laravel/src`, `laravel/config`,
`laravel/database`, README and LICENSE.

## Build and distribution flow (npm)

```text
src/index.ts       ──tsup──▶ dist/index.{js,cjs,d.ts,d.cts}   ◀── exports["."]
src/core/index.ts  ──tsup──▶ dist/core.{js,cjs,d.ts,d.cts}    ◀── exports["./core"]
src/react/index.ts ──tsup──▶ dist/react.{js,cjs,d.ts,d.cts}   ◀── exports["./react"]  ("use client")
styles/media-pro.css ───────────────────────────────────────── ◀── exports["./styles.css"]
```

- The `media-pro-shared-core` esbuild plugin rewrites `./core/index.js` imports in the index and
  react entries to `./core.js` / `./core.cjs`, so one `MediaLibrary` class exists at runtime.
- The `media-pro-use-client` plugin prepends `"use client";` to the react outputs only. The core
  and root outputs stay usable from React Server Components and plain Node.
- `react`, `react-dom` and `react/jsx-runtime` are external.

Consumers may import only the declared subpaths (`.`, `./core`, `./react`, `./styles.css`,
`./package.json`). The `exports` map blocks deep imports.

## Release flow (both registries)

```text
feature branch ── PR (with a changeset), CI ──▶ main
                                                 │
                                                 └── merge ──▶ production ──▶ release.yml
                                                                               ├─ ci (calls ci.yml)
                                                                               └─ changesets/action@v2
    pending changesets: npm run version-packages ──▶ PR "chore(release): version packages" into production (CI runs on it)
    PR merged, none pending: npm run release ──▶ npm (Trusted Publishing, OIDC)
                                             ├─ tag vX.Y.Z ──webhook──▶ Private Packagist
                                             └─ GitHub release from CHANGELOG.md
    after the release: production ── merge by hand ──▶ main
```

- The version is bumped only by `npm run version-packages`, which changesets/action runs on
  `production` in the version PR (AD-16). The version commit lands on `production` only, so
  `production` is merged back into `main` by hand after each release. npm and composer share the
  one `vX.Y.Z` tag and version number.
- `changeset publish` skips versions already on npm, so a re-run publishes nothing twice. The
  workflow only updates the `changeset-release/production` branch and creates new tags; it never
  pushes to `main` or `production` and never moves a tag.

## Modules

| Module  | Slug      | Source                                          | Role                                                       |
| ------- | --------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Core    | `core`    | `src/index.ts`, `src/version.ts`, `src/core/**` | Store, upload transport, validation, errors, translations  |
| React   | `react`   | `src/react/**`, `styles/**`                     | React components, hook, helper components, styles          |
| Laravel | `laravel` | `laravel/**`, `composer.json`                   | Endpoints, temporary uploads, request handling, validation |

The authoritative module list is [`../rules/module-map.yml`](../rules/module-map.yml).

## Boundaries

- `src/core/` never imports React or `src/react/`, and touches `window`, `document`,
  `XMLHttpRequest`, `URL` and `crypto` only inside functions, guarded for server rendering.
- `src/react/` imports core only through `../core/index.js` (never deep core files), so the build
  can share the core output.
- `laravel/` has no dependency on the npm package and the npm package none on PHP. Changes to
  either side of the contract below must change both sides and their docs together.
- Vue, Livewire or Blade bindings, when added, sit next to `src/react/` and reuse core unchanged
  (TD-12).

## JS to Laravel contract

| Concern       | JS side                                                                                     | Laravel side                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Routes        | `routePrefix` (default `media-library-pro`), `uploadDomain`                                 | `Route::mediaLibrary($prefix = 'media-library-pro')`                                                                   |
| Direct upload | multipart `file`, `uuid`, `name` to `/{prefix}/uploads`                                     | `UploadRequest` + `UploadController`                                                                                   |
| Vapor upload  | signed URL → PUT to S3 → JSON `{ key, bucket, uuid, name, content_type }` to `/{prefix}/s3` | `S3UploadRequest` + `S3UploadController`                                                                               |
| Response      | `parseUploadResponse` reads `UploadResponse`                                                | `MediaProValue::fromMedia`                                                                                             |
| Auth / CSRF   | `Accept: application/json`, `X-Requested-With`, `X-XSRF-TOKEN` or `X-CSRF-TOKEN`            | `web` middleware; optional `auth` group; `media-pro-uploads` limiter                                                   |
| Identity      | `generateUuid()` before upload; client uuid stays authoritative                             | `uuid` unique in `media`; kept when claimed                                                                            |
| Form value    | `getValue()` / `HiddenFields`: `{ [uuid]: { uuid, name, order, custom_properties } }`       | `MediaLibraryRequestItem::collect` (uuid-keyed or list)                                                                |
| Initial value | `normalizeValue(initialValue)`                                                              | `MediaProValue::collection($media)`                                                                                    |
| Errors        | `mapValidationErrors(bag, name, uuids)`                                                     | `MediaRules` keys: `field`, `field.<uuid>.uuid`, `.name`, `.custom_properties.<key>`; `InvalidMediaUuid` under `media` |
| Status codes  | 422 → server messages; 429 → `tryAgain`; else `somethingWentWrong`                          | Standard validation 422; throttle 429                                                                                  |

The details live in the [API registry](../registries/api-registry.md#http-endpoints).

## Security model

- Temporary uploads are scoped to the session id that created them; the handler and
  `UploadedMedia` compare it with `hash_equals` before claiming anything.
- Every item of a request is resolved before any write; foreign media aborts the whole request.
- Uploads must pass an extension allow-list on content (and on the client extension for direct
  uploads), a size limit and a per-IP rate limit. SVG, HTML, XML and PHP are not allowed by
  default.
- Media uuids are unique; a race resolves to a 422 with stored files removed, on every supported
  Laravel version.
- Custom properties are whitelisted on the server and prototype-pollution keys are dropped on the
  client.
- Logs never carry file contents, file names, tokens or session ids.
- Authentication is the app's choice: wrap `Route::mediaLibrary()` in `auth` middleware.
