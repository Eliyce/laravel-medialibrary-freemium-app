# API Registry

The public API of both packages in this repo. Removing or changing any row is a breaking change
(major bump; before 1.0, a minor flagged as breaking in the changeset).

## npm `@eliyce/laravel-medialibrary-freemium-app`

### Entry points

| Specifier                                                | ESM                    | CJS              | Types                                  | Contents                   |
| -------------------------------------------------------- | ---------------------- | ---------------- | -------------------------------------- | -------------------------- |
| `@eliyce/laravel-medialibrary-freemium-app`              | `dist/index.js`        | `dist/index.cjs` | `dist/index.d.ts` / `dist/index.d.cts` | `VERSION` + core API       |
| `@eliyce/laravel-medialibrary-freemium-app/core`         | `dist/core.js`         | `dist/core.cjs`  | `dist/core.d.ts` / `dist/core.d.cts`   | Core API                   |
| `@eliyce/laravel-medialibrary-freemium-app/react`        | `dist/react.js`        | `dist/react.cjs` | `dist/react.d.ts` / `dist/react.d.cts` | React API (`"use client"`) |
| `@eliyce/laravel-medialibrary-freemium-app/styles.css`   | `styles/media-pro.css` | same             | n/a                                    | Tailwind source styles     |
| `@eliyce/laravel-medialibrary-freemium-app/package.json` | `package.json`         | same             | n/a                                    | Manifest                   |

### Core exports (`.` and `./core`)

| Export                | Kind     | Signature / type                                                                     | Since | Docs                                                                   |
| --------------------- | -------- | ------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------- |
| `VERSION`             | constant | `string` from `package.json#version`; `.` only                                       | 0.0.0 | [docs](../../modules/core/features/version-info/technical.md)          |
| `MediaLibrary`        | class    | `new MediaLibrary(config: MediaLibraryConfig)`                                       | 0.1.0 | [docs](../../modules/core/features/media-library-store/technical.md)   |
| `normalizeValue`      | function | `(value: MediaValue \| ValueItemInput[] \| null \| undefined) => MediaValue`         | 0.1.0 | [docs](../../modules/core/features/media-library-store/technical.md)   |
| `validateFile`        | function | `(file: FileLike, rules?: ValidationRules, translations?: Translations) => string[]` | 0.1.0 | [docs](../../modules/core/features/validation-and-errors/technical.md) |
| `describeAccept`      | function | `(accept: readonly string[], translations: Translations) => string`                  | 0.1.0 | [docs](../../modules/core/features/validation-and-errors/technical.md) |
| `mapValidationErrors` | function | `(errors, name: string, uuids: readonly string[]) => MappedErrors`                   | 0.1.0 | [docs](../../modules/core/features/validation-and-errors/technical.md) |
| `defaultTranslations` | constant | `Readonly<Translations>`                                                             | 0.1.0 | [docs](../../modules/core/features/translations/technical.md)          |
| `resolveTranslations` | function | `(overrides?: PartialTranslations \| null) => Translations`                          | 0.1.0 | [docs](../../modules/core/features/translations/technical.md)          |
| `translate`           | function | `(translations, key: TranslationKey, replacements?) => string`                       | 0.1.0 | [docs](../../modules/core/features/translations/technical.md)          |
| `getCsrfHeaders`      | function | `(doc?: CsrfDocument \| null) => Record<string, string>`                             | 0.1.0 | [docs](../../modules/core/features/upload-transport/technical.md)      |
| `generateUuid`        | function | `() => string` (v4)                                                                  | 0.1.0 | [docs](../../modules/core/features/upload-transport/technical.md)      |

Core types (`export type`): `AfterUploadResult`, `CsrfDocument`, `FileLike`, `InvalidMedia`,
`MappedErrors`, `MappedValidationErrors`, `MediaLibraryConfig`, `MediaLibraryState`, `MediaObject`,
`MediaObjectErrors`, `MediaValue`, `PartialTranslations`, `ResolvedMediaLibraryConfig`,
`TranslationKey`, `Translations`, `UploadInfo`, `UploadRequest`, `UploadResponse`,
`UploadTransport`, `UploadTransportResponse`, `ValidationErrorBag`, `ValidationRules`,
`ValueItem`, `ValueItemInput`. They are described in the
[model registry](model-registry.md).

### React exports (`./react`)

| Export                                                                                                     | Kind       | Since | Docs                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ---------- | ----- | -------------------------------------------------------------------------- |
| `MediaLibraryAttachment`                                                                                   | component  | 0.1.0 | [docs](../../modules/react/features/media-library-attachment/technical.md) |
| `MediaLibraryCollection`                                                                                   | component  | 0.1.0 | [docs](../../modules/react/features/media-library-collection/technical.md) |
| `useMediaLibrary`                                                                                          | hook       | 0.1.0 | [docs](../../modules/react/features/use-media-library/technical.md)        |
| `DropZone`, `HiddenFields`, `ItemErrors`, `ListErrors`, `Thumb`, `Uploader`, `Icons`, `Icon`, `IconButton` | components | 0.1.0 | [docs](../../modules/react/features/helper-components/technical.md)        |

React types: `MediaLibraryAttachmentProps`, `MediaLibraryCollectionProps`,
`MediaLibraryViewProps`, `MediaLibraryComponentProps`, `UseMediaLibraryParams`,
`UseMediaLibraryResult`, `MediaImgProps`, `MediaTextInputProps`, `MediaFileInputProps`,
`MediaDropZoneProps`, `DropZoneProps`, `DropZoneRenderProps`, `HiddenFieldsProps`,
`ItemErrorsProps`, `ListErrorsProps`, `ThumbProps`, `UploaderProps`, `IconProps`,
`IconButtonProps`. Props are listed in the [component registry](component-registry.md).

"Since 0.1.0" assumes the pending minor changeset (`.changeset/react-media-library-pro.md`) is
the first release.

### Browser global

| Name                                  | Type                  | Use                                               |
| ------------------------------------- | --------------------- | ------------------------------------------------- |
| `globalThis.mediaLibraryTranslations` | `PartialTranslations` | Page-wide message overrides (read, never written) |

## HTTP endpoints

Registered by `Route::mediaLibrary(string $prefix = 'media-library-pro')`, behind
`throttle:media-pro-uploads`. Wrap the macro in your own middleware group (for example `auth`).

### `POST /{prefix}/uploads`

| Part    | Shape                                                                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Headers | `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, `X-XSRF-TOKEN` or `X-CSRF-TOKEN`                                                                                              |
| Body    | multipart: `file` (required; content in the allow-list; client extension in the allow-list; ≤ `max_file_size_in_kb`), `uuid` (required uuid, unique in media), `name` (nullable string ≤ 255) |
| 200     | `UploadResponse` JSON: `{ uuid, name, file_name, preview_url, original_url, size, mime_type, extension }`                                                                                     |
| 422     | `{ message, errors: { file \| uuid \| name: string[] } }` (also the uuid race, on every supported Laravel version)                                                                            |
| 429     | Rate limited                                                                                                                                                                                  |
| 419     | CSRF token mismatch (from the app's `web` middleware)                                                                                                                                         |

### `POST /{prefix}/s3`

| Part | Shape                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Body | JSON: `key` (required, `tmp/...`, no `.`/`..` segments, ≤ 1024), `uuid` (as above), `name`, `content_type`, `bucket` (nullable strings ≤ 255) |
| 200  | `UploadResponse`                                                                                                                              |
| 422  | `{ message, errors: { key \| uuid \| ...: string[] } }`: missing object, too large, disallowed content, storage failure, uuid race            |
| 429  | Rate limited                                                                                                                                  |

The client's Vapor step 1 calls the app's `vapor/signed-storage-url` route (from
`laravel/vapor-core`, not this package).

## Composer `eliyce/laravel-medialibrary-freemium-app`

| Symbol                                                                                                                                                                                                                                                                                                                                          | Kind                               | Docs                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `Route::mediaLibrary(string $prefix = 'media-library-pro')`                                                                                                                                                                                                                                                                                     | route macro                        | [docs](../../modules/laravel/features/package-setup/technical.md)            |
| `MediaProServiceProvider` (`RATE_LIMITER = 'media-pro-uploads'`)                                                                                                                                                                                                                                                                                | service provider (auto-discovered) | [docs](../../modules/laravel/features/package-setup/technical.md)            |
| `Concerns\InteractsWithMediaPro`                                                                                                                                                                                                                                                                                                                | model trait                        | [docs](../../modules/laravel/features/request-handling/technical.md)         |
| `Concerns\HandlesMediaLibraryRequests`                                                                                                                                                                                                                                                                                                          | trait (used by the above)          | [docs](../../modules/laravel/features/request-handling/technical.md)         |
| `addFromMediaLibraryRequest(?array)`, `syncFromMediaLibraryRequest(?array)`                                                                                                                                                                                                                                                                     | model methods                      | [docs](../../modules/laravel/features/request-handling/technical.md)         |
| `PendingMediaLibraryRequestHandler`: `withCustomProperties`, `usingName`, `usingFileName`, `toMediaCollection`                                                                                                                                                                                                                                  | builder                            | [docs](../../modules/laravel/features/request-handling/technical.md)         |
| `MediaLibraryRequestItem`: `fromArray`, `collect`                                                                                                                                                                                                                                                                                               | value object                       | [docs](../../modules/laravel/features/request-handling/technical.md)         |
| `Rules\Concerns\ValidatesMedia`: `validateSingleMedia`, `validateMultipleMedia`                                                                                                                                                                                                                                                                 | FormRequest trait                  | [docs](../../modules/laravel/features/media-validation/technical.md)         |
| `Rules\MediaRules`: `single`, `multiple`, `expand`, `toRules`, `minItems`, `maxItems`, `minSizeInKb`, `maxSizeInKb`, `minItemSizeInKb`, `maxItemSizeInKb`, `minTotalSizeInKb`, `maxTotalSizeInKb`, `extension`, `mime`, `itemName`, `customProperty`, `attribute`, `forModel`, `dimensions`, `width`, `height`, `widthBetween`, `heightBetween` | rule builder                       | [docs](../../modules/laravel/features/media-validation/technical.md)         |
| `Rules\UploadedMedia`, `Rules\TotalMediaSize`                                                                                                                                                                                                                                                                                                   | validation rules                   | [docs](../../modules/laravel/features/media-validation/technical.md)         |
| `Models\TemporaryUpload`: `previewManipulation`, `createForFile`, `createForRemoteFile`, `currentSessionId`, `findByMediaUuid(string): ?static`, `findByMediaUuidInCurrentSession(string): ?static`, `scopeOld`, `PREVIEW_CONVERSION`                                                                                                           | model                              | [docs](../../modules/laravel/features/temporary-uploads/technical.md)        |
| `Support\MediaProValue`: `fromMedia`, `collection`, `previewUrl`                                                                                                                                                                                                                                                                                | helper                             | [docs](../../modules/laravel/features/temporary-uploads/technical.md)        |
| `Support\DefaultAllowedExtensions::all()`                                                                                                                                                                                                                                                                                                       | helper                             | [docs](../../modules/laravel/features/package-setup/technical.md)            |
| `Support\MediaProConfig`                                                                                                                                                                                                                                                                                                                        | config accessor                    | [docs](../../modules/laravel/features/package-setup/technical.md)            |
| `Exceptions\InvalidMediaUuid`, `Exceptions\TemporaryUploadDoesNotBelongToSession`                                                                                                                                                                                                                                                               | exceptions                         | [error codes](error-code-registry.md)                                        |
| `media-pro:delete-old-temporary-uploads`                                                                                                                                                                                                                                                                                                        | artisan command                    | [docs](../../modules/laravel/features/temporary-upload-cleanup/technical.md) |
| Config `media-pro.*`, publish tags `media-pro-config`, `media-pro-migrations`                                                                                                                                                                                                                                                                   | config                             | [docs](../../modules/laravel/features/package-setup/technical.md)            |

`Http\*` controllers and requests, `Support\MediaLookup`, `Support\StoredMediaFiles` and
`Support\UniqueConstraintViolation` are internal. Each feature's `api.md` under
`docs/modules/{core,react,laravel}/features/` documents its part of this surface in detail.
