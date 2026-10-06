# Core Summary

Core is the framework-agnostic half of `@eliyce/laravel-medialibrary-freemium-app`. It owns the observable
`MediaLibrary` store behind every media component, the upload transport (direct and Vapor), client
validation, Laravel error mapping, translations, and the package entry points. Core imports no
React and touches no DOM API at module scope, so the React binding (and later Vue or Livewire
bindings) reuse it unchanged.

## Features

| Feature               | What it does                                                                                  | Docs                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Entry          | The `.` and `./core` entry points; `.` adds `VERSION` to the core API                         | [business](../features/public-entry/business.md) · [technical](../features/public-entry/technical.md) · [api](../features/public-entry/api.md)                            |
| Version Info          | `VERSION`, a string constant equal to `package.json#version`                                  | [business](../features/version-info/business.md) · [technical](../features/version-info/technical.md) · [api](../features/version-info/api.md)                            |
| Media Library Store   | `MediaLibrary`: state, add/replace/remove/reorder, form value, callbacks; `normalizeValue`    | [business](../features/media-library-store/business.md) · [technical](../features/media-library-store/technical.md) · [api](../features/media-library-store/api.md)       |
| Upload Transport      | XHR upload with progress and abort, the Vapor three-step flow, CSRF headers, client uuids     | [business](../features/upload-transport/business.md) · [technical](../features/upload-transport/technical.md) · [api](../features/upload-transport/api.md)                |
| Validation and Errors | `validateFile` (accept, min/max size) and `mapValidationErrors` (Laravel error bag to items)  | [business](../features/validation-and-errors/business.md) · [technical](../features/validation-and-errors/technical.md) · [api](../features/validation-and-errors/api.md) |
| Translations          | `defaultTranslations` (Spatie keys), `resolveTranslations`, `translate` with `{placeholders}` | [business](../features/translations/business.md) · [technical](../features/translations/technical.md) · [api](../features/translations/api.md)                            |

## Source

- `src/index.ts`, `src/version.ts`
- `src/core/index.ts` (barrel), `types.ts`, `media-library.ts`, `value.ts`, `upload.ts`, `csrf.ts`,
  `uuid.ts`, `validation.ts`, `errors.ts`, `translations.ts`

## Public Surface

| Specifier                                                | Exposes                          |
| -------------------------------------------------------- | -------------------------------- |
| `@eliyce/laravel-medialibrary-freemium-app`              | `VERSION` plus every core export |
| `@eliyce/laravel-medialibrary-freemium-app/core`         | The core API (no `VERSION`)      |
| `@eliyce/laravel-medialibrary-freemium-app/package.json` | The manifest                     |

Core exports `MediaLibrary`, `defaultTranslations`, `resolveTranslations`, `translate`,
`normalizeValue`, `mapValidationErrors`, `validateFile`, `describeAccept`, `getCsrfHeaders`,
`generateUuid`, and the types listed in the
[API registry](../../../instructions/registries/api-registry.md). Deep imports
(`@eliyce/laravel-medialibrary-freemium-app/dist/...`) are blocked by the `exports` map.

## Dependencies

- **Uses:** nothing at runtime. Browser APIs (`XMLHttpRequest`, `FormData`, `URL.createObjectURL`,
  `crypto`, `document.cookie`) are reached only inside methods and are guarded for server
  rendering.
- **Used by:** the [React module](../../react/index/summary.md), which imports `../core/index.js`.
  The build rewrites that import so `dist/react.*` and `dist/index.*` share one `dist/core.*`.
- **Talks to:** the [Laravel module](../../laravel/index/summary.md), over HTTP only (upload
  endpoints, the media value and the error bag). The contract is in the
  [architecture overview](../../../instructions/architecture/overview.md#js-to-laravel-contract).

## Tests

- `tests/core/*.test.ts` (node environment, fake transport, no network): one file per unit.
- `tests/index.test.ts`: `VERSION` sync; `.` and `./core` expose the same core objects; no
  default export.
- `tests/package-exports.test.ts`: builds the package, then checks the `exports` map, the
  `"use client"` placement, that `dist/core.*` has no React import, that only the
  `package.json` version is inlined into the `dist` JS and `.d.ts` files, the packed file list
  and the MIT licence.

## Known Gaps

- TD-6: no bundle-size budget.
- TD-12: Vue, Livewire and Blade bindings are not built yet.
- TD-16: no automated end-to-end test runs the core uploader against the Laravel endpoints.

## Related Docs

- [Architecture overview](../../../instructions/architecture/overview.md)
- [API registry](../../../instructions/registries/api-registry.md)
- [Node library conventions](../../../instructions/rules/coding/stacks/node-library/conventions.md)
