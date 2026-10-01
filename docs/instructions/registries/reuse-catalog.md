# Reuse Catalog

Existing helpers to reuse before writing new code. Check here and run
`npx paqad-ai index query <name>` before adding a helper. A future Vue, Livewire or Blade binding
must reuse the core helpers instead of re-implementing them.

## JS (core)

| Symbol                                                       | Location                        | Use for                                                              |
| ------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------- |
| `MediaLibrary`                                               | `src/core/media-library.ts`     | All media state, uploads and the form value; bindings only render it |
| `normalizeValue`                                             | `src/core/value.ts`             | Turning any `initialValue` shape into an ordered `MediaValue`        |
| `isSafeKey`, `createMap`, `copyCustomProperties`, `isRecord` | `src/core/value.ts` (internal)  | Prototype-pollution-safe handling of user-keyed objects              |
| `validateFile`, `describeAccept`                             | `src/core/validation.ts`        | Client file checks and accepted-type text (also used by `DropZone`)  |
| `mapValidationErrors`                                        | `src/core/errors.ts`            | Placing a Laravel error bag onto items                               |
| `resolveTranslations`, `translate`, `defaultTranslations`    | `src/core/translations.ts`      | Every user-visible message                                           |
| `getCsrfHeaders`                                             | `src/core/csrf.ts`              | The Laravel CSRF header for any request                              |
| `generateUuid`                                               | `src/core/uuid.ts`              | Client media uuids                                                   |
| `joinUrl`, `createXhrTransport`                              | `src/core/upload.ts` (internal) | URL building and the progress-reporting transport                    |
| `VERSION`                                                    | `src/version.ts`                | Reporting the library version at runtime                             |

## JS (React)

| Symbol             | Location                         | Use for                                   |
| ------------------ | -------------------------------- | ----------------------------------------- |
| `useMediaLibrary`  | `src/react/use-media-library.ts` | Any React media UI                        |
| `HiddenFields`     | `src/react/components/`          | Non-AJAX form submission of a media value |
| `cx`, `formatSize` | `src/react/utils.ts` (internal)  | Class names and size labels               |

## PHP (Laravel)

| Symbol                                                                | Location                                            | Use for                                                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `MediaProConfig`                                                      | `laravel/src/Support/MediaProConfig.php`            | Every config read and its Spatie fallbacks; never read `config('media-pro.*')` directly   |
| `MediaLookup::findByUuids`, `uuidsFromValue`                          | `laravel/src/Support/MediaLookup.php`               | Batched media lookup by uuid                                                              |
| `MediaLookup::claimable`                                              | `laravel/src/Support/MediaLookup.php`               | The ownership filter: current-session temporary uploads plus media the owner scope allows |
| `UniqueConstraintViolation::matches`                                  | `laravel/src/Support/UniqueConstraintViolation.php` | Tell a unique index violation from other `QueryException`s on Laravel 10.2 to 13          |
| `MediaProValue`                                                       | `laravel/src/Support/MediaProValue.php`             | `UploadResponse` and `initialValue` shapes                                                |
| `StoredMediaFiles::remove`                                            | `laravel/src/Support/StoredMediaFiles.php`          | Best-effort file cleanup after a rolled-back write                                        |
| `LogsRejectedUploads::rejectUpload`                                   | `laravel/src/Http/Requests/Concerns/`               | Logging plus a 422 for upload rejections                                                  |
| `TemporaryUpload::currentSessionId`                                   | `laravel/src/Models/TemporaryUpload.php`            | The session id temporary uploads are scoped to                                            |
| `TemporaryUpload::findByMediaUuid`, `findByMediaUuidInCurrentSession` | `laravel/src/Models/TemporaryUpload.php`            | Find the temporary upload holding a media uuid (any session / this session only)          |
| `DefaultAllowedExtensions::all`                                       | `laravel/src/Support/DefaultAllowedExtensions.php`  | The default allow-list                                                                    |
