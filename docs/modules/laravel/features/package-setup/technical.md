# Package Setup Technical

## Module Boundaries

| File                                                                  | Owns                                                                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `composer.json`                                                       | Package name, requirements, PSR-4 `Eliyce\MediaPro\` → `laravel/src/`, provider discovery |
| `laravel/src/MediaProServiceProvider.php`                             | Config merge, publishing, command, route macro, default limiter                           |
| `laravel/config/media-pro.php`                                        | Config defaults                                                                           |
| `laravel/database/migrations/create_temporary_uploads_table.php.stub` | `temporary_uploads` table                                                                 |
| `laravel/src/Support/MediaProConfig.php`                              | The one typed accessor for config values and their fallbacks                              |
| `laravel/src/Support/DefaultAllowedExtensions.php`                    | `all(): list<string>`                                                                     |

## Service provider

- `register()`: `mergeConfigFrom(.../config/media-pro.php, 'media-pro')`.
- `boot()`, console only: publishes the config (tag `media-pro-config`) and the migration stub as
  `database/migrations/{Y_m_d_His}_create_temporary_uploads_table.php` (tag
  `media-pro-migrations`); registers `DeleteOldTemporaryUploadsCommand`.
- `boot()`: registers the `Route::mediaLibrary(string $prefix = 'media-library-pro')` macro, which
  adds a group with `prefix` and `throttle:media-pro-uploads` containing
  `POST uploads → UploadController` and `POST s3 → S3UploadController`.
- `app->booted(...)`: defines `RateLimiter::for('media-pro-uploads', Limit::perMinute(n)->by(ip))`
  only when no limiter with that name exists, so an app limiter registered anywhere wins.
  `MediaProServiceProvider::RATE_LIMITER` holds the name.

## `MediaProConfig`

Every config read goes through this class (RULE-11 canonical helper):

| Method                   | Returns / fallback                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `temporaryUploadModel()` | class-string of a `TemporaryUpload` subclass, else `InvalidArgumentException`           |
| `mediaModel()`           | `media-library.media_model` (a `Media` subclass), else `InvalidArgumentException`       |
| `temporaryUploadDisk()`  | `media-pro.temporary_upload_disk` ?? `media-library.disk_name` ?? `'public'`; non-empty |
| `allowedExtensions()`    | Lowercased, dot-stripped, unique list; empty or non-array throws                        |
| `allowsExtension($ext)`  | Case-insensitive membership; `''` is never allowed                                      |
| `maxFileSizeInKb()`      | `media-pro.max_file_size_in_kb` ?? `media-library.max_file_size / 1024` (default 10 MB) |
| `deleteOlderThanHours()` | int, default 24                                                                         |
| `rateLimitPerMinute()`   | int, at least 1                                                                         |
| `signedUrlExpirationMinutes()` | `media-pro.signed_url_expiration_minutes` (default 60) or `null`; below 1 throws |
| `diskNeedsSignedUrls($disk)`   | Signing on, disk `visibility` is not `public`, and the disk `providesTemporaryUrls()` |

## Migration

`temporary_uploads`: `id`, `session_id` (string, indexed), `created_at`, `updated_at`. Each row
owns one Spatie media row in collection `default`.

## Composer

- `require`: `php ^8.2`, `laravel/framework` and `illuminate/{cache,config,console,database,filesystem,http,log,routing,session,support,validation}`
  `^10.2|^11.0|^12.0|^13.0`, `spatie/laravel-medialibrary ^11.0`.
- `require-dev`: `orchestra/testbench ^8.22|^9.0|^10.0|^11.0`, `phpunit/phpunit ^10.5|^11.0`.
- `.gitattributes` export-ignores tests, docs and dev tooling from GitHub's archive. It ships
  `composer.json`, `laravel/src`, `laravel/config`, `laravel/database`, `README.md`, `LICENSE`,
  and the npm build inputs (`package.json`, `package-lock.json`, `src/`, `styles/`,
  `tsconfig.json`, `tsup.config.ts`), because npm installs a git dependency from that same
  archive and builds `dist/` in `prepare`.

## Testing Entry Points

- `laravel/tests/Feature/ServiceProviderTest.php`: config defaults, publish tags point at real
  files, command registered, macro routes behind the limiter, trait overrides.
- `laravel/tests/Feature/AppDefinedRateLimiterTest.php`: an app limiter is kept.
- `laravel/tests/Unit/PackagingTest.php`: `composer.json` contract, autoload path, `.gitattributes`.
