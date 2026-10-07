# Laravel Summary

Laravel is the server half: the composer package `eliyce/laravel-medialibrary-freemium-app` (namespace
`Eliyce\MediaPro`). It stores files the components upload as temporary uploads, serves the upload
endpoints, moves submitted media into model collections, and validates media fields. It builds on
`spatie/laravel-medialibrary` v11 and replaces the server side of the commercial Spatie Media
Library Pro.

## Features

| Feature                  | What it does                                                                                              | Docs                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package Setup            | Service provider, `Route::mediaLibrary()` macro, rate limiter, config, migration, `MediaProConfig`        | [business](../features/package-setup/business.md) · [technical](../features/package-setup/technical.md) · [api](../features/package-setup/api.md)                                  |
| Temporary Uploads        | `POST /{prefix}/uploads` and `/{prefix}/s3`, `TemporaryUpload` model, `MediaProValue`                     | [business](../features/temporary-uploads/business.md) · [technical](../features/temporary-uploads/technical.md) · [api](../features/temporary-uploads/api.md)                      |
| Request Handling         | `InteractsWithMediaPro`, `addFromMediaLibraryRequest` / `syncFromMediaLibraryRequest`, `InvalidMediaUuid` | [business](../features/request-handling/business.md) · [technical](../features/request-handling/technical.md) · [api](../features/request-handling/api.md)                         |
| Media Validation         | `ValidatesMedia`, the `MediaRules` builder, `UploadedMedia` and `TotalMediaSize` rules                    | [business](../features/media-validation/business.md) · [technical](../features/media-validation/technical.md) · [api](../features/media-validation/api.md)                         |
| Temporary Upload Cleanup | `media-pro:delete-old-temporary-uploads`                                                                  | [business](../features/temporary-upload-cleanup/business.md) · [technical](../features/temporary-upload-cleanup/technical.md) · [api](../features/temporary-upload-cleanup/api.md) |

## Source

- `composer.json` (root), `phpunit.xml.dist`, `.gitattributes` (composer archive contents)
- `laravel/src/`: `MediaProServiceProvider`, `PendingMediaLibraryRequestHandler`,
  `MediaLibraryRequestItem`, `Concerns/`, `Commands/`, `Exceptions/`, `Http/`, `Models/`,
  `Rules/`, `Support/`
- `laravel/config/media-pro.php`, `laravel/database/migrations/create_temporary_uploads_table.php.stub`
- `laravel/tests/` (PHPUnit with orchestra/testbench)

## Public Surface

| Kind             | Name                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route macro      | `Route::mediaLibrary(string $prefix = 'media-library-pro')`                                                                                                                                            |
| HTTP             | `POST /{prefix}/uploads`, `POST /{prefix}/s3`                                                                                                                                                          |
| Model trait      | `Concerns\InteractsWithMediaPro`                                                                                                                                                                       |
| Request trait    | `Rules\Concerns\ValidatesMedia`                                                                                                                                                                        |
| Classes          | `MediaRules`, `UploadedMedia`, `TotalMediaSize`, `PendingMediaLibraryRequestHandler`, `MediaLibraryRequestItem`, `Models\TemporaryUpload`, `Support\MediaProValue`, `Support\DefaultAllowedExtensions` |
| Exceptions       | `InvalidMediaUuid`, `TemporaryUploadDoesNotBelongToSession`                                                                                                                                            |
| Artisan          | `media-pro:delete-old-temporary-uploads`                                                                                                                                                               |
| Config / publish | `config/media-pro.php` (tag `media-pro-config`), migration (tag `media-pro-migrations`)                                                                                                                |
| Rate limiter     | `media-pro-uploads`                                                                                                                                                                                    |

Details are in the [API registry](../../../instructions/registries/api-registry.md#composer-eliycelaravel-media-pro).

## Dependencies

- **Uses:** `spatie/laravel-medialibrary` ^11 (media rows, files, conversions), `laravel/framework`
  and `illuminate/*` ^10.2 to ^13, PHP ^8.2.
- **Used by:** host Laravel apps; the [Core](../../core/index/summary.md) uploader calls its
  endpoints. Shared contract: [architecture overview](../../../instructions/architecture/overview.md#js-to-laravel-contract).

## Tests

`composer test` runs PHPUnit (`laravel/tests/Unit`, `laravel/tests/Feature`) on sqlite
`:memory:` with faked disks and no network. The suite passes on Laravel 13 locally. CI
(`.github/workflows/ci.yml`) runs it on the latest Laravel 10, 11, 12 and 13 releases on PHP 8.2
to 8.4, after `composer validate --strict`. paqad's checks run only the npm commands, so run
`composer test` alongside them (TD-9).

## Known Gaps

- TD-13: every Laravel 10.x and 11.x release has security advisories, so installs on 10 or 11
  may need `audit.block-insecure=false`. The Laravel 10 and 11 CI legs turn it off.
- TD-19: CI runs only the latest 10.x release, so no job exercises the Laravel 10.x paths (the
  `ValidatesMedia` fallback below 10.43 and the pre-10.20 uuid-race detection); they are
  covered by local runs and simulation only.
- Releases: Private Packagist reads the shared `vX.Y.Z` tag that changesets/action creates in
  the release workflow, so both packages share one version number (TD-17, confirmed; AD-16).

## Related Docs

- [Architecture overview](../../../instructions/architecture/overview.md)
- [Error code registry](../../../instructions/registries/error-code-registry.md)
